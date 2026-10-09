"""One definition must determine execution, not merely the displayed topology."""

import asyncio
import copy

import httpx
import pytest

from almcanvas import registry
from almcanvas.execution_metadata import runtime_metadata
from almcanvas.langgraph_runtime import validate_definition
from repricing_gap_workflow.platform_blueprint import load_spec
from repricing_gap_workflow.server import app, _initial_state
from repricing_gap_workflow.workflow import MockNarrator, build_graph


def test_compiled_edges_are_exactly_definition_edges():
    spec = load_spec()
    ids = {n["id"]: n["execution"]["runtimeId"] for n in spec["nodes"]}
    async def run():
        async with httpx.AsyncClient() as client:
            return build_graph(client, MockNarrator()).get_graph()
    graph = asyncio.run(run())
    expected = {(ids[e["from"]], ids[e["to"]]) for e in spec["edges"]}
    assert {(e.source, e.target) for e in graph.edges} == expected
    assert set(graph.nodes) == set(ids.values())
    assert spec["meta"]["runtime"] == runtime_metadata(spec)


def config(spec, node_id):
    return next(n for n in spec["nodes"] if n["id"] == node_id)["config"]


@pytest.mark.parametrize("change,code", [
    (lambda s: config(s, "api").pop("path"), "API_CONFIGURATION_REQUIRED"),
    (lambda s: config(s, "prompt").pop("model"), "PROMPT_CONFIGURATION_REQUIRED"),
    (lambda s: config(s, "retry_gate")["branches"][0].update(target="prompt"), "BRANCH_EDGE_MISMATCH"),
    (lambda s: config(s, "context").update(kind="agent"), "UNSUPPORTED_NODE"),
    (lambda s: config(s, "prompt").update(systemPrompt="${missing}"), "UNDECLARED_PROMPT_INPUT"),
    (lambda s: config(s, "context").update(outputName="wrong"), "OUTPUT_BINDING_MISMATCH"),
])
def test_invalid_definitions_are_rejected(change, code):
    spec = copy.deepcopy(load_spec())
    change(spec)
    with pytest.raises(ValueError, match=code):
        validate_definition(spec)


def test_script_changes_change_real_execution(monkeypatch):
    spec = copy.deepcopy(load_spec())
    context = next(n for n in spec["nodes"] if n["id"] == "context")
    context["config"]["code"] = context["config"]["code"].replace('"analysisMode": mode', '"analysisMode": "limit"').replace('"dataNeeds": needs', '"dataNeeds": ["limit"]').replace('bool(question) and not (', 'False and not (')
    monkeypatch.setattr(registry, "get", lambda key=None: registry.Metric("repricing_gap", spec))
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            graph = build_graph(client, MockNarrator())
            initial = _initial_state({"inputs": {"scope": {"metricCode": "REPRICING_GAP_RATIO",
                "orgCode": "LEGAL", "currencyCode": "CNY", "tenorCode": "1Y", "asOfDate": "2026-07-31"},
                "question": "近几个月走势如何？"}}, "demo-analyst")
            return await graph.ainvoke(initial)
    result = asyncio.run(run())
    assert result["mode"] == "limit"
    assert result["platform_output"]["analysisMode"] == "limit"
    assert result["narrative"] is not None


def test_new_turn_does_not_reuse_old_node_variables():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            graph = build_graph(client, MockNarrator())
            initial = _initial_state({"inputs": {"scope": {"metricCode": "REPRICING_GAP_RATIO",
                "orgCode": "LEGAL", "currencyCode": "CNY", "tenorCode": "1Y", "asOfDate": "2026-07-31"},
                "question": ""}}, "demo-analyst")
            first = await graph.ainvoke(initial)
            second = await graph.ainvoke({**first, "inputs": {**initial["inputs"], "question": "美元是多少？"}})
            assert second["resolved_context"]["focusCurrencyCode"] == "USD"
            assert second["result_package"]["scope"]["currencyCode"] == "USD"
            assert second["regen_count"] == 1
    asyncio.run(run())
