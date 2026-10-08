"""复刻图工具的**通用性**验证：加一个指标不应需要改任何渲染代码。

这里用一个临时构造的第二个指标来证明三件事：
1. 注册表能发现新指标（只需建目录放 spec）；
2. 画布、页面文案、节点名都跟着指标走，不泄漏上一个指标的内容；
3. 未知指标返回 404 而不是 500。

临时指标不进仓库——它只有平台侧是自洽的，运行期节点是占位的，
留在 metrics/ 下会让人误以为它是真指标。
"""

import asyncio
import copy
import json

import pytest

from almcanvas import registry


@pytest.fixture
def second_metric(tmp_path, monkeypatch):
    """造一个含**两个**指标的临时 metrics 目录，并把注册表指过去。"""
    source_path = registry.METRICS_ROOT / registry.DEFAULT_METRIC / "blueprint.spec.json"
    source = json.loads(source_path.read_text(encoding="utf-8"))

    # 真实指标也复制一份，才能验证"两个指标互不串味"
    kept = tmp_path / registry.DEFAULT_METRIC
    kept.mkdir()
    (kept / "blueprint.spec.json").write_text(source_path.read_text(encoding="utf-8"), encoding="utf-8")

    spec = copy.deepcopy(source)
    spec["meta"].update({
        "workflow": "second_metric",
        "displayName": "第二个指标",
        "title": "第二个指标 · 行内迁移蓝图",
        "app": "（测试临时构造）",
        "sessionNote": "（第二个指标自己的会话说明）",
        "reentryNote": "（第二个指标自己的追问说明）",
        "canvasNote": "（第二个指标自己的图注）",
    })
    for node in spec["nodes"]:
        if node["id"] == "context":
            node["name"] = "第二个指标的问法识别"
            node["summary"] = "第二个指标的职责描述。"

    target = tmp_path / "second_metric"
    target.mkdir()
    (target / "blueprint.spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")

    monkeypatch.setattr(registry, "METRICS_ROOT", tmp_path)
    registry.load.cache_clear()
    yield "second_metric"
    registry.load.cache_clear()


# ---------------------------------------------------------------- 注册表


def test_registry_discovers_a_new_metric_directory(second_metric):
    assert registry.available() == sorted([second_metric, registry.DEFAULT_METRIC])


def test_registry_serves_the_new_metric_content(second_metric):
    metric = registry.get(second_metric)
    assert metric.display_name == "第二个指标"
    assert "第二个指标的问法识别" in [node["name"] for node in metric.nodes]
    assert registry.page_info(second_metric)["sessionNote"] == "（第二个指标自己的会话说明）"


def test_two_metrics_do_not_leak_into_each_other(second_metric):
    first = registry.get(registry.DEFAULT_METRIC)
    second = registry.get(second_metric)
    assert first.display_name != second.display_name
    assert registry.page_info()["displayName"] == "重定价缺口率"
    assert registry.page_info(second_metric)["displayName"] == "第二个指标"
    assert registry.page_info(second_metric)["sessionNote"] != registry.page_info()["sessionNote"]


def test_unknown_metric_raises_registry_error():
    with pytest.raises(registry.MetricNotFound):
        registry.get("definitely_not_a_metric")


def test_registry_rejects_a_spec_without_terminal(tmp_path, monkeypatch):
    bad = tmp_path / "bad_metric"
    bad.mkdir()
    (bad / "blueprint.spec.json").write_text(json.dumps({
        "meta": {"schemaVersion": 1, "workflow": "bad"},
        "nodes": [{"id": "a", "name": "A", "inlineType": "脚本"}],
        "edges": [],
    }, ensure_ascii=False), encoding="utf-8")
    monkeypatch.setattr(registry, "METRICS_ROOT", tmp_path)
    registry.load.cache_clear()
    with pytest.raises(ValueError, match="__end__"):
        registry.get("bad_metric")


# ---------------------------------------------------------------- 画布与路由


def test_canvas_spec_renders_each_metric_separately(second_metric):
    import httpx

    from repricing_gap_workflow.server import app

    async def get(path):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get(path)

    async def run():
        listing = (await get("/m/metrics")).json()
        specs = {}
        for key in (second_metric, registry.DEFAULT_METRIC):
            response = await get(f"/m/{key}/v1/canvas-spec")
            specs[key] = (response.status_code, response.json())
        return listing, specs

    listing, specs = asyncio.run(run())
    assert {item["key"] for item in listing["metrics"]} == {second_metric, registry.DEFAULT_METRIC}
    assert listing["default"] == registry.DEFAULT_METRIC

    for key, expected_name in ((second_metric, "第二个指标"), (registry.DEFAULT_METRIC, "重定价缺口率")):
        status, body = specs[key]
        assert status == 200
        assert body["metric"] == key
        assert body["platform"]["pageInfo"]["displayName"] == expected_name
        # 其他工作流只展示其平台 spec，不伪装成已编译的试点执行图。
        assert len(body["platform"]["nodes"]) == len(body["platform"]["blueprint"]["nodes"])
        if key == registry.DEFAULT_METRIC:
            mapped = {rid for row in body["mapping"] for rid in row["runtimeIds"]}
            assert mapped == {node["id"] for node in body["runtime"]["nodes"]}
        else:
            assert "compiled" not in body
            assert "runtime" not in body


def test_unknown_metric_route_returns_404_not_500(second_metric):
    import httpx

    from repricing_gap_workflow.server import app

    async def run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return [(path, await client.get(path)) for path in ("/m/nope/v1/canvas-spec", "/m/nope/workflow")]

    for path, response in asyncio.run(run()):
        assert response.status_code == 404, path
        assert response.json()["errorCode"] == "UNKNOWN_METRIC"


def test_legacy_routes_still_serve_the_default_metric():
    """双击启动器走的是 /workflow 与 /v1/canvas-spec，不能因为参数化就断掉。"""
    import httpx

    from repricing_gap_workflow.server import app

    async def run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get("/v1/canvas-spec"), await client.get("/workflow")

    spec_response, page = asyncio.run(run())
    assert spec_response.json()["metric"] == registry.DEFAULT_METRIC
    assert page.status_code == 200
