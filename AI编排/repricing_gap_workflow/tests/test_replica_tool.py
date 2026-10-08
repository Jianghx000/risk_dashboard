"""Independent viewer and concrete platform replica regressions."""

import asyncio
import json

import httpx
import pytest

from almcanvas import registry
from almcanvas.constraints import check_graph_is_dag
from almcanvas.server import app
from repricing_gap_workflow.platform_blueprint import CONTEXT_SCRIPT, PACKAGE_SCRIPT, load_spec


def request(path):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.get(path)
    return asyncio.run(run())


def test_viewer_accepts_different_topology_without_runtime_mapping(tmp_path, monkeypatch):
    nodes = [{
        "id": node_id, "name": name, "inlineType": kind, "summary": name,
        "inputs": [], "outputs": [], "config": {"kind": config_kind}, "failureRouting": "中断",
    } for node_id, name, kind, config_kind in (
        ("start", "开始", "开始", "start"), ("prepare", "整理输入", "脚本", "script"),
        ("__end__", "结束", "结束", "end"),
    )]
    spec = {"meta": {"schemaVersion": 1, "workflow": "different", "title": "不同拓扑"},
            "nodes": nodes, "edges": [{"from": "start", "to": "prepare", "kind": "normal"},
                                      {"from": "prepare", "to": "__end__", "kind": "end"}]}
    directory = tmp_path / "different"
    directory.mkdir()
    (directory / registry.SPEC_FILENAME).write_text(json.dumps(spec), encoding="utf-8")
    monkeypatch.setattr(registry, "METRICS_ROOT", tmp_path)
    registry.load.cache_clear()
    try:
        result = request("/m/different/v1/canvas-spec")
        assert result.status_code == 200
        data = result.json()
        assert [node["id"] for node in data["platform"]["nodes"]] == ["start", "prepare", "end"]
        assert all(item["runtimeIds"] == [] for item in data["mapping"])
        assert "compiled" not in data
        assert request("/m/different/workflow").status_code == 200
        assert request("/m/unknown/v1/canvas-spec").status_code == 404
        nodes[1]["inputs"] = [{"name": "x", "source": "${missing.value}"}]
        with pytest.raises(ValueError, match="未声明"):
            registry._validate(spec, "different")
        nodes[2]["outputs"] = [{"name": "future", "type": "Object"}]
        nodes[1]["inputs"] = [{"name": "x", "source": "${future.value}"}]
        with pytest.raises(ValueError, match="不可达"):
            registry._validate(spec, "different")
        nodes[1]["inputs"] = []
        spec["edges"].append({"from": "prepare", "to": "start", "kind": "normal"})
        with pytest.raises(ValueError, match="环"):
            registry._validate(spec, "different")
    finally:
        registry.load.cache_clear()


def test_viewer_preserves_complete_configuration_and_failure_routes():
    data = request("/v1/canvas-spec").json()
    source = {node["id"]: node for node in load_spec()["nodes"]}
    for node in data["platform"]["blueprint"]["nodes"]:
        original = source["__end__" if node["id"] == "end" else node["id"]]
        for field in ("config", "failureRouting", "inlineMigration"):
            assert node.get(field) == original.get(field)
    assert "${previousErrors}" in source["regenerate"]["config"]["systemPrompt"]


def test_dag_check_detects_cycles_even_with_normal_edge_kind():
    assert check_graph_is_dag({"edges": [
        {"from": "a", "to": "b", "kind": "normal"},
        {"from": "b", "to": "a", "kind": "normal"},
    ]})


def handler(code):
    namespace = {}
    exec(code, namespace)
    return namespace["handler"]


def test_replica_resolves_currency_base_and_preserves_page_currency():
    scope = {"metricCode": "REPRICING_GAP_RATIO", "orgCode": "LEGAL", "currencyCode": "CNY",
             "tenorCode": "1Y", "asOfDate": "2026-07-31"}
    context = handler(CONTEXT_SCRIPT)({**scope, "question": "美元和去年末相比为什么上升？"})
    assert context["currencyCode"] == "CNY"
    assert context["focusCurrencyCode"] == "USD"
    assert context["baseDate"] == "2025-12-31"
    assert context["analysisMode"] == "attribution"
    wrapped = handler(CONTEXT_SCRIPT)({**scope, "question": "美元和港币相比", "comparedCurrencies": {"values": ["USD", "HKD"]}})
    assert wrapped["analysisMode"] == "currencyCompare"
    ambiguous = handler(CONTEXT_SCRIPT)({**scope, "question": "它为什么变化？", "lastComparedCurrencies": ["USD", "HKD"]})
    assert ambiguous["analysisMode"] == "clarification"
    with pytest.raises(ValueError, match="INVALID_BASE_DATE"):
        handler(CONTEXT_SCRIPT)({**scope, "baseDate": "2027-01-01"})
    package = handler(PACKAGE_SCRIPT)({**scope, "focusCurrencyCode": "USD", "apiResponse": {
        "returnCode": "SUC0000", "body": {"scope": {**scope, "currencyCode": "USD"}, "status": "needs_input"},
    }})
    assert package["resultPackage"]["status"] == "needs_input"
