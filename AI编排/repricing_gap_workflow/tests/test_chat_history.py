"""Bank-tested chatHistory shape must drive both the replica script and LangGraph."""

import asyncio
import json

import httpx
import pytest

from repricing_gap_workflow.bank_scripts import context_handler
from repricing_gap_workflow.server import SESSIONS, _initial_state, app
from repricing_gap_workflow.workflow import MockNarrator, build_graph


SCOPE = {"orgCode": "LEGAL", "currencyCode": "CNY", "tenorCode": "1Y",
         "asOfDate": "2026-07-31", "frequency": "MONTH"}
MEMORY = {"scopeKey": "LEGAL|CNY|1Y|2026-07-31|MONTH", "focusCurrencyCode": "USD",
          "businessType": "自营贷款", "baseDate": "2026-05-31", "comparedCurrencies": []}


def entry(memory=None, wrapped=False):
    output = {"conversationState": MEMORY if memory is None else memory,
              "narrative": {"headline": "OLD_TEXT_DO_NOT_SEND_TO_MODEL"}}
    return {"inputMessage": json.dumps({"question": "美元为什么变化？"}),
            "outputMessage": json.dumps({"res": output} if wrapped else output)}


def prepare(history, question="它为什么变化？", **scope):
    return context_handler({"input": {**SCOPE, **scope, "question": question},
                            "history": history, "prepareOnly": True})


@pytest.mark.parametrize("wrapped", [False, True])
def test_restores_only_final_structured_state(wrapped):
    output = prepare([entry(wrapped=wrapped)])
    assert output["historyStatus"] == "restored"
    assert output["query"]["currencies"] == ["USD"]
    assert output["resolvedOptions"]["baseDate"] == "2026-05-31"
    assert output["classificationContext"]["lastBusinessType"] == "自营贷款"
    assert output["classificationContext"]["focusCurrencyCode"] == "USD"
    assert "OLD_TEXT_DO_NOT_SEND_TO_MODEL" not in json.dumps(output)


@pytest.mark.parametrize("broken", [None, {}, "not-json", "{}", "[]",
    json.dumps({"conversationState": {**MEMORY, "baseDate": "bad"}}),
    json.dumps({"conversationState": {**MEMORY, "focusCurrencyCode": "UNKNOWN"}}),
    json.dumps({"conversationState": {**MEMORY, "comparedCurrencies": ["USD", "USD"]}}),
    json.dumps({"conversationState": {**MEMORY, "businessType": "UNKNOWN"}})])
def test_corrupt_latest_output_never_falls_back_to_older_state(broken):
    output = prepare([entry(), {"outputMessage": broken}])
    assert output["historyStatus"] == "invalid"
    assert output["needsData"] is False
    assert output["needsClassification"] is False
    assert output["clarifyReason"] == "history"
    assert "focusCurrencyCode" not in output["conversationState"]


def test_empty_history_initial_and_unresolved_pronoun():
    initial = prepare([], question="")
    assert initial["historyStatus"] == "empty"
    assert initial["query"]["currencies"] == ["CNY"]
    assert initial["analysisMode"] == "overview"
    assert prepare([])["needsData"] is False


def test_scope_change_clears_old_currency_and_base():
    result = prepare([entry()], question="现在是多少？", asOfDate="2026-06-30")
    assert result["historyStatus"] == "scope_changed"
    assert result["query"]["currencies"] == ["CNY"]
    assert result["resolvedOptions"]["baseDate"] == ""
    assert prepare([entry()], asOfDate="2026-06-30")["needsData"] is False


def test_explicit_conditions_override_history_but_keep_current():
    result = prepare([entry()], question="港币较上期为什么变化？")
    assert result["query"]["currencies"] == ["HKD"]
    assert result["resolvedOptions"]["baseDate"] == "PREVIOUS"
    assert result["query"]["asOfDate"] == SCOPE["asOfDate"]


def test_bank_history_roundtrip_session_and_no_recursive_history():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            session_id = None
            for question in ("美元与2026-05-31相比为什么变化？", "它为什么变化？", "港币较上期为什么变化？"):
                response = await client.post("/v1/workflows/run", json={"inputs": {**SCOPE, "question": question},
                    **({"sessionId": session_id} if session_id else {})}, headers={"X-Demo-User": "demo-analyst"})
                assert response.status_code == 200, response.text
                body = response.json()
                session_id = body["sessionId"]
                if question == "它为什么变化？":
                    assert body["conversationState"]["focusCurrencyCode"] == "USD"
                    assert body["conversationState"]["baseDate"] == "2026-05-31"
            assert body["conversationState"]["focusCurrencyCode"] == "HKD"
            assert body["conversationState"]["baseDate"] == "2026-06-30"
            history = SESSIONS[session_id]["chatHistory"]
            assert len(history) == 3
            for turn in history:
                assert set(turn) == {"inputMessage", "outputMessage"}
                assert "chatHistory" not in turn["inputMessage"] + turn["outputMessage"]
                assert "preparationOutput" not in turn["outputMessage"]
                assert "conversationState" in json.loads(turn["outputMessage"])
                assert "conversationState" not in json.loads(turn["inputMessage"])
    asyncio.run(run())


def test_history_is_not_sent_to_api_or_prompt_and_corruption_skips_api():
    calls = []

    class RecordingMock(MockNarrator):
        def classify(self, question, context):
            calls.append(context)
            return super().classify(question, context)

    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            graph = build_graph(client, RecordingMock())
            result = await graph.ainvoke(_initial_state({"inputs": {**SCOPE, "question": "它为什么变化？"},
                "chatHistory": [entry()]}, "demo-analyst"))
            assert result["platform_output"]["conversationState"]["focusCurrencyCode"] == "USD"
            variables = result["platform_variables"]
            assert variables["chatHistory"] == [entry()]
            assert "OLD_TEXT_DO_NOT_SEND_TO_MODEL" not in json.dumps(variables["contextOutput"])
            bad_graph = build_graph(client, MockNarrator(), fail_fetch=True)
            bad = await bad_graph.ainvoke(_initial_state({"inputs": {**SCOPE, "question": "它为什么变化？"},
                "chatHistory": [{"outputMessage": "broken"}]}, "demo-analyst"))
            assert bad["result_package"]["clarifyReason"] == "history"
            assert bad["narrative"] is not None
    asyncio.run(run())
    assert calls
    assert "OLD_TEXT_DO_NOT_SEND_TO_MODEL" not in json.dumps(calls)


def test_clarification_first_turn_does_not_break_next_explicit_question():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            first = await client.post("/v1/workflows/run", json={"inputs": {**SCOPE, "question": "随便看看"}},
                headers={"X-Demo-User": "demo-analyst"})
            assert first.json()["analysisMode"] == "clarification"
            second = await client.post("/v1/workflows/run", json={"sessionId": first.json()["sessionId"],
                "inputs": {**SCOPE, "question": "美元为什么变化？"}}, headers={"X-Demo-User": "demo-analyst"})
            assert second.json()["analysisMode"] == "attribution"
            assert second.json()["conversationState"]["focusCurrencyCode"] == "USD"
    asyncio.run(run())
