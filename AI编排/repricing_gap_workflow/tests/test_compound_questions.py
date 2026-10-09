"""Compound questions retain small API calls, scope safety and complete answers."""

import asyncio
import copy
import json

import httpx
import pytest

from almcanvas.answer_validation import validate_answer
from repricing_gap_workflow import analysis, bank_scripts
from repricing_gap_workflow.platform_blueprint import ANSWER_SCRIPT, load_spec
from repricing_gap_workflow.server import _initial_state, app
from repricing_gap_workflow.workflow import MockNarrator, build_graph


INPUTS = {"orgCode": "LEGAL", "currencyCode": "CNY", "tenorCode": "1Y",
          "asOfDate": "2026-07-31", "frequency": "MONTH"}
QUESTION = "近几个月走势怎么样，为什么上升，还有多少限额空间？"


def run(question=QUESTION, **extra):
    async def invoke():
        calls = []
        async def track(request):
            if request.url.path.startswith("/mock/analysis/"):
                calls.append(json.loads(request.content))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test",
                event_hooks={"request": [track]}) as client:
            graph = build_graph(client, MockNarrator())
            state = _initial_state({"inputs": {**INPUTS, "question": question, **extra}}, "demo-analyst")
            return await graph.ainvoke(state), calls
    return asyncio.run(invoke())


def test_compound_question_uses_one_api_and_answers_every_need():
    state, calls = run()
    assert len(calls) == 1
    assert calls[0]["analysisMode"] == "limit"
    assert calls[0]["dataNeeds"] == ["limit", "trend", "attribution"]
    data = state["result_package"]
    assert set(data["analyses"]) == {"limit", "trend", "attribution"}
    assert len(json.dumps(data, ensure_ascii=False)) < 16000
    assert state["validation_errors"] == []
    assert state["narrative"] is not None
    for need in data["dataNeeds"]:
        assert any(any(p.startswith("analyses." + need + ".") for p in s["citations"])
                   for s in state["narrative"]["sections"])
    assert "records" not in json.dumps(data)


@pytest.mark.parametrize("question,needs", [
    ("限额还有多少空间？", ["limit"]),
    ("近几个月走势如何？", ["trend"]),
    ("为什么分母不含内部交易？", ["methodology"]),
    ("自营贷款为什么影响大？", ["business"]),
    ("自营贷款有哪些新增业务，重定价缺口怎么算？", ["business", "calculation"]),
    ("重定价缺口怎么算，为什么分母不含内部交易？", ["methodology", "calculation"]),
    ("自营贷款有哪些变化，为什么重定价缺口率上升？", ["business", "attribution"]),
])
def test_independent_needs_do_not_turn_all_why_questions_into_attribution(question, needs):
    context = bank_scripts.context_handler({"input": {**INPUTS, "question": question}})
    assert context["query"]["dataNeeds"] == needs
    state, calls = run(question)
    assert state["validation_errors"] == []
    assert len(calls) == 1
    if len(needs) == 1:
        assert "analyses" not in state["result_package"]


def test_base_change_and_currency_followup_apply_to_all_modules():
    first, _ = run("美元近几个月走势怎么样，和去年末比为什么上升，还有多少限额空间？")
    data = first["result_package"]
    for part in data["analyses"].values():
        assert part["scope"]["currencyCode"] == "USD"
        assert part["scope"]["asOfDate"] == INPUTS["asOfDate"]
    assert data["analyses"]["attribution"]["scope"]["baseDate"] == "2025-12-31"
    assert first["conversation_state"]["baseDate"] == "2025-12-31"
    second, _ = run("它近几个月走势怎么样，较上期为什么上升，还有多少限额空间？",
                    conversationState=first["conversation_state"])
    assert second["result_package"]["analyses"]["attribution"]["scope"]["baseDate"] == "2026-06-30"
    assert second["resolved_context"]["pageCurrencyCode"] == "CNY"
    assert second["resolved_context"]["focusCurrencyCode"] == "USD"


def test_two_currency_trends_use_one_api_and_have_distinct_scopes():
    state, calls = run("美元和港币相比怎么样，各自近几个月走势如何？")
    assert len(calls) == 1
    assert state["validation_errors"] == []
    parts = state["result_package"]["analyses"]["trend"]["byCurrency"]
    assert [p["scope"]["currencyCode"] for p in parts] == ["USD", "HKD"]
    assert state["conversation_state"]["comparedCurrencies"] == ["USD", "HKD"]


def test_missing_base_is_local_to_attribution_not_an_empty_entire_answer():
    state, _ = run(asOfDate="2025-09-30")
    data = state["result_package"]
    assert data["analyses"]["attribution"]["status"] == "unavailable"
    assert data["analyses"]["limit"]["status"] == "available"
    assert data["analyses"]["trend"]["status"] == "available"
    assert state["validation_errors"] == []
    assert state["narrative"] is not None


def test_daily_base_is_resolved_once_for_compound_question():
    state, _ = run(frequency="DAY")
    assert state["result_package"]["analyses"]["attribution"]["scope"]["baseDate"] == "2026-07-30"
    assert len(state["result_package"]["analyses"]["trend"]["trend"]) <= 31
    assert state["validation_errors"] == []


@pytest.mark.parametrize("needs", ["trend", [], ["limit", []], ["unknown"], ["clarification"]])
def test_invalid_optional_needs_are_rejected(needs):
    with pytest.raises(ValueError, match="INVALID_DATA_NEEDS"):
        bank_scripts.context_handler({"input": {**INPUTS, "question": QUESTION, "options": {"dataNeeds": needs}}})


def test_large_combination_is_rejected_not_silently_trimmed():
    with pytest.raises(ValueError, match="TOO_MANY_DATA_NEEDS"):
        bank_scripts.context_handler({"input": {**INPUTS, "question": "",
            "options": {"dataNeeds": ["trend", "limit", "attribution", "calculation"]}}})


@pytest.mark.parametrize("change,error", [
    (lambda d: d["analyses"].pop("trend"), "MISSING_REQUESTED_ANALYSIS"),
    (lambda d: d["analyses"]["trend"]["scope"].update(currencyCode="USD"), "SCOPE_MISMATCH_module_currencyCode"),
    (lambda d: d["analyses"]["attribution"]["scope"].update(baseDate="2025-12-31"), "SCOPE_MISMATCH_module_baseDate"),
    (lambda d: d["analyses"]["trend"].update(actualDataDate="2026-06-30"), "SCOPE_MISMATCH_module_actualDataDate"),
    (lambda d: d["analyses"]["trend"].update(analysisMode="limit"), "INVALID_ANALYSIS_MODULE"),
    (lambda d: d["analyses"]["trend"].update(dataVersion="WRONG"), "INVALID_ANALYSIS_MODULE"),
    (lambda d: d["analyses"]["trend"].update(caliberVersion="WRONG"), "INVALID_ANALYSIS_MODULE"),
])
def test_pasted_package_script_checks_all_modules(change, error):
    context = bank_scripts.context_handler({"input": {**INPUTS, "question": QUESTION}})
    data = analysis.multi_package("limit", context["query"]["dataNeeds"], INPUTS["asOfDate"], None, ["CNY"])
    change(data)
    ns = {}
    exec(next(n for n in load_spec()["nodes"] if n["id"] == "package")["config"]["code"], ns)
    with pytest.raises(ValueError, match=error):
        ns["handler"]({"apiResponse": {"returnCode": "SUC0000", "body": data}, "context": context})


def test_answer_cannot_omit_an_analysis_or_bypass_the_portable_checks():
    state, _ = run()
    data, answer = state["result_package"], copy.deepcopy(state["narrative"])
    answer["sections"] = [s for s in answer["sections"] if not any(p.startswith("analyses.trend.") for p in s["citations"])]
    answer["numericRefs"] = [r for r in answer["numericRefs"] if not r["path"].startswith("analyses.trend.")]
    errors = validate_answer(answer, data, mode="limit")
    assert "UNANSWERED_DATA_NEED:analyses.trend" in errors
    ns = {}
    exec(ANSWER_SCRIPT, ns)
    assert ns["handler"]({"narrativeRaw": json.dumps(answer), "resultPackage": data,
                          "analysisMode": "limit"})["validationErrors"] == errors


def test_status_only_citation_is_not_an_answer_to_a_requested_analysis():
    state, _ = run()
    data, answer = state["result_package"], copy.deepcopy(state["narrative"])
    for s in answer["sections"]:
        if any(p.startswith("analyses.trend.") for p in s["citations"]):
            s.update(text="这是趋势分析。", citations=["analyses.trend.status"])
    answer["numericRefs"] = [r for r in answer["numericRefs"] if not r["path"].startswith("analyses.trend.")]
    assert "INSUFFICIENT_ANALYSIS_EVIDENCE:analyses.trend" in validate_answer(answer, data, mode="limit")


def test_nested_limit_and_attribution_guards_cannot_be_bypassed():
    state, _ = run()
    answer = copy.deepcopy(state["narrative"])
    for s in answer["sections"]:
        s["text"] = s["text"].replace("内部限额", "监管限额").replace("演示归因", "正式归因")
    errors = validate_answer(answer, state["result_package"], mode="limit")
    assert "analyses.limit.MANAGEMENT_LIMIT_MISLABELED" in errors
    assert "analyses.attribution.DEMO_ATTRIBUTION_UNLABELED" in errors


@pytest.mark.parametrize("citations", [None, 123, "analyses.trend.status", [[]]])
def test_malformed_compound_citations_return_errors_not_script_crashes(citations):
    state, _ = run()
    answer = {"headline": "测试", "sections": [{"text": "测试", "citations": citations}], "numericRefs": []}
    assert validate_answer(answer, state["result_package"], mode="limit")


def test_positive_and_negative_cues_do_not_cross_clause_boundaries():
    from almcanvas.narrative_guard import find_unreferenced_numbers
    assert find_unreferenced_numbers(["资产端是主要正向因素；负债端拖累0.97个百分点。"], source_values=[-.97239127]) == []
    assert find_unreferenced_numbers(["正向影响（拖累）0.97个百分点。"], source_values=[-.97239127]) == ["UNREFERENCED_NUMBER:0.97"]
    assert find_unreferenced_numbers(["贡献0.97个百分点；下项存在负向影响。"], source_values=[-.97239127]) == ["UNREFERENCED_NUMBER:0.97"]


def test_specific_exclusion_item_is_valid_methodology_evidence():
    data = analysis.multi_package("methodology", ["methodology", "calculation"], INPUTS["asOfDate"], None, ["CNY"])
    answer = MockNarrator().generate("methodology", data, "", [])
    for section in answer["sections"]:
        if "analyses.methodology.exclusions" in section["citations"]:
            section["citations"] = ["analyses.methodology.exclusions.0"]
    assert validate_answer(answer, data, mode="methodology") == []
