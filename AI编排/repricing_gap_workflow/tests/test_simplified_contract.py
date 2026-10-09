"""The smaller start/API contracts must retain scope, evidence and follow-up safety."""

import asyncio
import inspect
import json

import httpx
import pytest

from repricing_gap_workflow import analysis, bank_scripts
from repricing_gap_workflow.platform_blueprint import load_spec
from repricing_gap_workflow.server import _initial_state, app
from repricing_gap_workflow.workflow import MockNarrator, build_graph


INPUTS = {"orgCode": "LEGAL", "currencyCode": "CNY", "tenorCode": "1Y",
          "asOfDate": "2026-07-31", "frequency": "MONTH", "question": ""}


def run(question="", *, session_id=None, **extra):
    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post("/v1/workflows/run", json={"inputs": {**INPUTS, "question": question, **extra},
                **({"sessionId": session_id} if session_id else {})}, headers={"X-Demo-User": "demo-analyst"})
    return asyncio.run(invoke())


def test_start_and_api_have_small_explicit_contracts():
    nodes = {n["id"]: n for n in load_spec()["nodes"]}
    assert {f["name"] for f in nodes["start"]["inputs"]} == set(INPUTS) | {"options"}
    assert {f["name"]: f["source"] for f in nodes["context"]["inputs"]}["history"] == "${chatHistory}"
    assert len(nodes["package"]["inputs"]) == 2
    assert len(nodes["api"]["inputs"]) == 10
    assert {f["name"] for f in nodes["api"]["inputs"]}.isdisjoint(
        {"question", "conversationState", "metricCode", "focusCurrencyCode", "availableDataDates", "clarifyReason"})


@pytest.mark.parametrize("node_id", ["context", "package", "local", "direct", "intent_check"])
def test_copied_scripts_match_their_reviewable_sources(node_id):
    fn = getattr(bank_scripts, node_id + "_handler")
    expected = inspect.getsource(fn).replace("def " + fn.__name__ + "(params):", "def handler(params):")
    actual = next(n for n in load_spec()["nodes"] if n["id"] == node_id)["config"]["code"]
    assert actual == expected


def test_initial_has_major_causes_and_no_details():
    response = run()
    assert response.status_code == 200
    body = response.json()
    data = body["resultPackage"]
    assert data["scope"]["baseDate"] == "2026-06-30"
    assert len(data["trend"]) <= 6
    causes = data["attribution"]
    assert sum(f["impactPctPoint"] for f in causes["factors"]) == pytest.approx(causes["changePctPoint"], abs=1e-7)
    text = json.dumps(body["narrative"], ensure_ascii=False)
    assert "演示归因" in text
    assert "attribution.changePctPoint" in text
    assert "records" not in data
    assert body["conversationState"]["baseDate"] == "2026-06-30"


@pytest.mark.parametrize("question,absent", [
    ("限额空间还有多少？", {"trend", "currencySummary", "attribution", "records"}),
    ("近几个月走势如何？", {"limit", "currencySummary", "attribution", "records"}),
    ("较上期为什么上升？", {"trend", "currencySummary", "records"}),
])
def test_followup_packages_only_include_relevant_data(question, absent):
    body = run(question).json()
    assert body["narrative"] is not None
    assert set(body["resultPackage"]).isdisjoint(absent)


def test_explicit_options_override_question_and_keep_current_fixed():
    body = run("和去年末相比为什么变化？", options={"baseDate": "2026-05-31"}).json()
    assert body["resultPackage"]["scope"]["baseDate"] == "2026-05-31"
    assert body["resultPackage"]["scope"]["asOfDate"] == INPUTS["asOfDate"]


def test_state_roundtrip_without_server_session():
    first = run("美元与去年末相比为什么变化？").json()
    second = run("它为什么变化？", conversationState=first["conversationState"]).json()
    assert second["resultPackage"]["scope"]["currencyCode"] == "USD"
    assert second["resultPackage"]["scope"]["baseDate"] == "2025-12-31"
    assert second["resolvedContext"]["pageCurrencyCode"] == "CNY"


def test_explicit_previous_period_overrides_saved_base():
    first = run("和去年末相比为什么变化？").json()
    second = run("较上期为什么变化？", conversationState=first["conversationState"]).json()
    assert second["resultPackage"]["scope"]["baseDate"] == "2026-06-30"


def test_daily_default_base_is_resolved_by_api():
    body = run("为什么变化？", frequency="DAY").json()
    assert body["resultPackage"]["scope"]["baseDate"] == "2026-07-30"


def test_changed_page_scope_does_not_restore_old_focus():
    first = run("美元为什么变化？").json()
    second = run("现在是多少？", asOfDate="2026-06-30", conversationState=first["conversationState"]).json()
    assert second["resultPackage"]["scope"]["currencyCode"] == "CNY"
    assert second["resultPackage"]["scope"]["asOfDate"] == "2026-06-30"


def test_selected_currency_clears_comparison_ambiguity():
    first = run("美元和港币相比").json()
    second = run("美元为什么变化？", session_id=first["sessionId"]).json()
    third = run("它为什么变化？", session_id=second["sessionId"]).json()
    assert third["analysisMode"] == "attribution"
    assert third["resultPackage"]["scope"]["currencyCode"] == "USD"
    assert third["conversationState"]["comparedCurrencies"] == []


@pytest.mark.parametrize("question,extra", [
    ("随便看看", {}),
    ("它为什么变化？", {"conversationState": {"comparedCurrencies": ["USD", "HKD"]}}),
    ("分母怎么算？", {"options": {"caliber": "EXACT_DAY"}}),
])
def test_local_explanation_never_calls_the_data_api(question, extra):
    async def forbidden(request):
        raise AssertionError("local response attempted HTTP")
    async def invoke():
        async with httpx.AsyncClient(transport=httpx.MockTransport(forbidden)) as client:
            graph = build_graph(client, MockNarrator(), fail_fetch=True)
            return await graph.ainvoke(_initial_state({"inputs": {**INPUTS, "question": question, **extra}}, "demo-analyst"))
    result = asyncio.run(invoke())
    assert result["result_package"]["status"] in {"needs_input", "unsupported"}
    assert result["narrative"] is not None


@pytest.mark.parametrize("extra,code", [
    ({"options": {"baseDate": "2020-01-01"}}, "INVALID_BASE_DATE"),
    ({"asOfDate": "2020-01-01"}, "UNKNOWN_DATA_DATE"),
    ({"options": {"baseDate": "2026-07-31"}}, "INVALID_BASE_DATE"),
    ({"options": []}, "INVALID_CONTEXT_OBJECT"),
    ({"conversationState": ["USD"]}, "INVALID_CONTEXT_OBJECT"),
    ({"question": 100}, "INVALID_INPUT_TYPE:question"),
])
def test_invalid_inputs_are_not_replaced_or_reported_as_upstream_failure(extra, code):
    response = run(**extra)
    assert response.status_code == 400
    assert response.json()["errorCode"] == code


def test_client_date_list_cannot_make_nonexistent_date_valid():
    response = run("为什么变化？", asOfDate="2020-01-01", availableDataDates={"values": ["2020-01-01"]})
    assert response.status_code == 400
    assert response.json()["errorCode"] == "UNKNOWN_DATA_DATE"


@pytest.mark.parametrize("mode,question", [("overview", ""), ("attribution", "为什么变化？")])
def test_earliest_period_never_invents_previous_data(mode, question):
    body = run(question, asOfDate="2025-09-30").json()
    assert body["analysisMode"] == mode
    data = body["resultPackage"] if mode == "attribution" else body["resultPackage"]["attribution"]
    assert data["reason"] == "NO_PREVIOUS_PERIOD"
    assert body["narrative"] is not None


def test_comparison_returns_only_requested_currencies():
    body = run("美元和港币相比").json()
    assert {r["currencyCode"] for r in body["resultPackage"]["currencySummary"]} == {"USD", "HKD"}


@pytest.mark.parametrize("field,value,error", [
    ("baseDate", "2026-05-31", "SCOPE_MISMATCH_baseDate"),
    ("frequency", "DAY", "SCOPE_MISMATCH_frequency"),
    ("caliber", "OTHER", "SCOPE_MISMATCH_caliber"),
])
def test_package_rejects_wrong_basis_frequency_and_caliber(field, value, error):
    ns = {}
    exec(next(n for n in load_spec()["nodes"] if n["id"] == "package")["config"]["code"], ns)
    context = bank_scripts.context_handler({"input": {**INPUTS, "options": {"baseDate": "2026-06-30"}}})
    data = analysis.query_package("overview", INPUTS["asOfDate"], "2026-06-30", "CNY")
    data.update(status="available", caliberVersion=analysis.CALIBER_VERSION, analysisMode="overview")
    data["scope"][field] = value
    with pytest.raises(ValueError, match=error):
        ns["handler"]({"apiResponse": {"returnCode": "SUC0000", "body": data}, "context": context})


def test_decimal_before_pp_is_checked_as_one_number():
    from almcanvas.narrative_guard import find_unreferenced_numbers
    assert find_unreferenced_numbers(["贡献+6.98pp"], source_values=[6.979166667]) == []
    assert find_unreferenced_numbers(["贡献+6.99pp"], source_values=[6.979166667]) == ["UNREFERENCED_NUMBER:+6.99"]


def test_initial_cause_cannot_be_silently_omitted_or_called_formal():
    from almcanvas.answer_validation import validate_answer
    data = analysis.query_package("overview", INPUTS["asOfDate"], None, "CNY")
    answer = MockNarrator().generate("overview", data, "", [])
    assert validate_answer(answer, data, mode="overview") == []
    answer["sections"][1]["text"] = answer["sections"][1]["text"].replace("演示归因", "正式归因")
    assert "DEMO_ATTRIBUTION_UNLABELED" in validate_answer(answer, data, mode="overview")
    answer["sections"] = answer["sections"][:1]
    answer["numericRefs"] = answer["numericRefs"][:3]
    assert "INITIAL_CAUSES_MISSING" in validate_answer(answer, data, mode="overview")
