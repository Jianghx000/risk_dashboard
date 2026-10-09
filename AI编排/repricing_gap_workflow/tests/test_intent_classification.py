import asyncio
import inspect
import json

import httpx
import pytest

from repricing_gap_workflow.bank_scripts import context_handler, intent_check_handler
from repricing_gap_workflow.intent_eval import CASES, SCOPE
from repricing_gap_workflow.platform_blueprint import load_spec
from repricing_gap_workflow.server import _initial_state, app
from repricing_gap_workflow.workflow import MODES, MockNarrator, build_graph


PRIORITY = ["currencyCompare", "business", "limit", "methodology", "calculation", "attribution", "trend", "overview"]


def candidate(needs):
    return {"labels": {mode: int(mode in needs) for mode in sorted(MODES - {"clarification"})},
        "primary": next((mode for mode in PRIORITY if mode in needs), "clarification"),
        "needsClarification": not bool(needs)}


def classify(question, output):
    prep = context_handler({"prepareOnly": True, "input": {**SCOPE, "question": question}})
    return intent_check_handler({"preparation": prep, "candidateRaw": json.dumps(output), "conversationState": {}})


@pytest.mark.parametrize("question,needs", CASES)
def test_annotated_labels_produce_exact_data_needs(question, needs):
    # Tests the script contract, not the semantic quality of an offline fake model.
    context = classify(question, candidate(needs))
    assert set(context["query"]["dataNeeds"]) == set(needs)
    assert context["needsData"] == bool(needs)


@pytest.mark.parametrize("mutate", [
    lambda c: c["labels"].update(limit=True),
    lambda c: c["labels"].update(unknown=1),
    lambda c: c["labels"].pop("trend"),
    lambda c: c.update(primary="business"),
    lambda c: c.update(needsClarification="false"),
    lambda c: c.update(query={"orgCode": "OTHER"}),
    lambda c: c["labels"].update(trend=None),
])
def test_invalid_candidates_never_enable_api(mutate):
    output = candidate(["limit"])
    mutate(output)
    context = classify("限额空间是多少？", output)
    assert context["analysisMode"] == "clarification"
    assert context["query"]["dataNeeds"] == []
    assert context["needsData"] is False


def test_uncertain_overfull_and_unresolved_business_need_clarification():
    output = candidate(["trend"])
    output["needsClarification"] = True
    assert not classify("近期走势？", output)["needsData"]
    assert not classify("帮我分析", candidate(PRIORITY[-5:]))["needsData"]
    assert not classify("这个业务有哪些明细？", candidate(["business"]))["needsData"]
    assert not classify("近期走势？", candidate(["currencyCompare"]))["needsData"]


def test_model_cannot_change_precise_context_or_date():
    prep = context_handler({"prepareOnly": True, "input": {**SCOPE, "question": "美元不要看限额，只做归因。",
        "options": {"baseDate": "2026-05-31"}}})
    context = intent_check_handler({"preparation": prep, "candidateRaw": json.dumps(candidate(["attribution"]))})
    query = context["query"]
    assert query["currencies"] == ["USD"]
    assert query["asOfDate"] == "2026-07-31"
    assert query["baseDate"] == "2026-05-31"
    assert query["orgCode"] == "LEGAL"


def test_methodology_subquestion_does_not_change_calculation_node():
    result = classify("先展示分子构成，再解释分母为何排除内部交易。", candidate(["calculation", "methodology"]))
    assert result["query"]["nodeCode"] == "GAP"
    assert classify("先给出分母分项，再解释分子为何剔除内部交易。", candidate(
        ["calculation", "methodology"]))["query"]["nodeCode"] == "DENOMINATOR"


def test_uncertain_new_scope_cannot_restore_old_memory():
    prep = context_handler({"prepareOnly": True, "input": {**SCOPE, "question": "看看吧",
        "conversationState": {"scopeKey": "ANOTHER_SCOPE", "baseDate": "2026-05-31", "businessType": "自营贷款"}}})
    result = intent_check_handler({"preparation": prep, "candidateRaw": ""})
    assert result["conversationState"] == {"scopeKey": "LEGAL|CNY|1Y|2026-07-31|MONTH"}


def test_negated_business_topic_does_not_replace_confirmed_business():
    prep = context_handler({"prepareOnly": True, "input": {**SCOPE,
        "question": "不要自营贷款明细，只解释缺口率为何变化。",
        "conversationState": {"businessType": "同业负债"}}})
    result = intent_check_handler({"preparation": prep, "candidateRaw": json.dumps(candidate(["attribution"]))})
    assert result["conversationState"]["businessType"] == "同业负债"


def test_default_and_explicit_types_bypass_classifier():
    class ForbiddenClassifier(MockNarrator):
        def classify(self, question, context):
            raise AssertionError("should bypass classification")

    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            graph = build_graph(client, ForbiddenClassifier())
            for question, options in (("", {}), ("看趋势和限额", {"analysisMode": "trend", "dataNeeds": ["trend", "limit"]})):
                state = await graph.ainvoke(_initial_state({"inputs": {**SCOPE, "question": question,
                    "options": options}}, "demo-analyst"))
                assert "intentRaw" not in state["platform_variables"]
                assert state["narrative"] is not None
    asyncio.run(run())


def test_validated_model_labels_not_keywords_control_single_api_call():
    class FixedClassifier(MockNarrator):
        def classify(self, question, context):
            return candidate(["trend"])

    calls_holder = []
    async def record(request):
        calls_holder.append(json.loads(request.content)["dataNeeds"])
    # Keep the assertion local to the exact request hook, not to the mock API response.
    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test",
                event_hooks={"request": [record]}) as client:
            result = await build_graph(client, FixedClassifier()).ainvoke(_initial_state({"inputs": {
                **SCOPE, "question": "限额空间是多少？"}}, "demo-analyst"))
            assert result["mode"] == "trend"
            assert calls_holder == [["trend"]]
            assert "limit" not in result["result_package"]
    asyncio.run(invoke())


@pytest.mark.parametrize("raw", [None, "", "not json", "{" + " " * 4000, json.dumps(candidate([]))])
def test_failed_classifier_is_local_and_preserves_memory(raw):
    class FailedClassifier(MockNarrator):
        def classify(self, question, context):
            if raw is None:
                raise RuntimeError("classifier unavailable")
            return json.loads(raw) if raw.startswith('{"labels"') else raw

    async def forbidden(request):
        raise AssertionError("invalid classification attempted API")

    async def run():
        memory = {"baseDate": "2026-05-31", "focusCurrencyCode": "USD",
                  "scopeKey": "LEGAL|CNY|1Y|2026-07-31|MONTH"}
        async with httpx.AsyncClient(transport=httpx.MockTransport(forbidden)) as client:
            result = await build_graph(client, FailedClassifier()).ainvoke(_initial_state({"inputs": {
                **SCOPE, "question": "人民币最近走势如何？", "conversationState": memory}}, "demo-analyst"))
            assert result["mode"] == "clarification"
            assert result["conversation_state"] == memory
            assert result["narrative"] is not None
            assert result["degrade_flags"] == []
    asyncio.run(run())


def test_classifier_prompt_and_script_are_the_executable_spec():
    from repricing_gap_workflow.prompts import intent_prompt
    nodes = {n["id"]: n for n in load_spec()["nodes"]}
    assert nodes["intent_prompt"]["config"]["systemPrompt"] == intent_prompt()
    assert nodes["intent_check"]["config"]["code"] == inspect.getsource(intent_check_handler).replace(
        "def intent_check_handler(params):", "def handler(params):")
