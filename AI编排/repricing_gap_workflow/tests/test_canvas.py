import asyncio

import httpx

from repricing_gap_workflow.graph_spec import compiled_snapshot, get_canvas_spec
from repricing_gap_workflow.server import _initial_state, app
from repricing_gap_workflow.workflow import build_graph


def get(path):
    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.get(path)

    return asyncio.run(invoke())


def post(path, body):
    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post(path, json=body, headers={"X-Demo-User": "demo-analyst"})

    return asyncio.run(invoke())


SCOPE = {
    "metricCode": "REPRICING_GAP_RATIO",
    "orgCode": "LEGAL",
    "currencyCode": "CNY",
    "tenorCode": "1Y",
    "asOfDate": "2026-07-31",
}


def test_canvas_layout_is_left_to_right_with_retry_row():
    spec = get_canvas_spec()
    runtime = {node["id"]: node for node in spec["runtime"]["nodes"]}
    platform = {node["id"]: node for node in spec["platform"]["nodes"]}
    assert runtime["__end__"]["x"] > runtime["validate_output"]["x"] > runtime["__start__"]["x"]
    assert runtime["__start__"]["y"] == runtime["validate_output"]["y"] == runtime["__end__"]["y"]
    assert runtime["regenerate_narrative"]["y"] > runtime["validate_output"]["y"]
    assert runtime["validate_retry"]["y"] == runtime["regenerate_narrative"]["y"]
    assert len({node["x"] for node in spec["runtime"]["nodes"]}) > 4
    assert platform["end"]["x"] > platform["retry_gate"]["x"] > platform["start"]["x"]
    assert platform["regenerate"]["y"] > platform["retry_gate"]["y"]
    assert platform["retry_check"]["y"] == platform["regenerate"]["y"]
    reentry = spec["platform"]["sessionReentry"]
    assert reentry["compiled"] is False
    assert reentry["source"] == "end" and reentry["target"] == "start"
    compiled_pairs = {(edge["source"], edge["target"]) for edge in spec["runtime"]["compiledEdges"]}
    assert (spec["runtime"]["sessionReentry"]["source"], spec["runtime"]["sessionReentry"]["target"]) not in compiled_pairs


def test_compiled_graph_is_forward_dag():
    compiled = compiled_snapshot()
    edges = {(edge["source"], edge["target"]) for edge in compiled["edges"]}
    assert ("validate_output", "generate_narrative") not in edges
    assert "regenerate_narrative" in compiled["nodes"]
    assert "validate_retry" in compiled["nodes"]


def test_canvas_spec_matches_compiled_langgraph():
    spec = get("/v1/canvas-spec").json()
    compiled = compiled_snapshot()
    runtime_ids = {node["id"] for node in spec["runtime"]["nodes"]}
    assert runtime_ids == set(compiled["nodes"])
    spec_edges = {(edge["source"], edge["target"], edge["conditional"], edge["route"]) for edge in spec["runtime"]["compiledEdges"]}
    compiled_edges = {(edge["source"], edge["target"], edge["conditional"], edge["route"]) for edge in compiled["edges"]}
    assert spec_edges == compiled_edges
    assert ("validate_output", "regenerate_narrative") in {(edge["source"], edge["target"]) for edge in spec["runtime"]["compiledEdges"]}
    assert ("validate_output", "__end__") in {(edge["source"], edge["target"]) for edge in spec["runtime"]["compiledEdges"]}
    assert ("regenerate_narrative", "validate_retry") in {(edge["source"], edge["target"]) for edge in spec["runtime"]["compiledEdges"]}
    assert ("validate_output", "generate_narrative") not in {(edge["source"], edge["target"]) for edge in spec["runtime"]["compiledEdges"]}
    assert all(node["inCompiledGraph"] for node in spec["runtime"]["nodes"])


def test_canvas_spec_does_not_invent_mode_api_branches():
    spec = get_canvas_spec()
    runtime_targets = [edge["target"] for edge in spec["runtime"]["compiledEdges"]]
    assert runtime_targets.count("fetch_alm_data") == 1
    assert not any(edge["target"].startswith("fetch_") and edge["target"] != "fetch_alm_data" for edge in spec["runtime"]["compiledEdges"])
    assert {node["id"] for node in spec["platform"]["nodes"]} == {
        "start", "context", "api", "package", "prompt", "answer", "retry_gate", "regenerate", "retry_check", "end"
    }
    assert [edge["source"] + "->" + edge["target"] for edge in spec["platform"]["edges"]] == [
        "start->context",
        "context->api",
        "api->package",
        "package->prompt",
        "prompt->answer",
        "answer->retry_gate",
        "retry_gate->end",
        "retry_gate->regenerate",
        "regenerate->retry_check",
        "retry_check->end",
    ]


def test_mapping_covers_every_runtime_and_platform_node():
    spec = get_canvas_spec()
    mapped_runtime = {item for row in spec["mapping"] for item in row["runtimeIds"]}
    mapped_platform = {row["platformId"] for row in spec["mapping"]}
    assert mapped_runtime == {node["id"] for node in spec["runtime"]["nodes"]}
    assert mapped_platform == {node["id"] for node in spec["platform"]["nodes"]}
    context = next(row for row in spec["mapping"] if row["platformId"] == "context")
    assert context["runtimeIds"] == ["resolve_context", "classify_question"]
    assert any("无回边" in item for item in spec["differences"])
    assert any("无缝导入" in item for item in spec["differences"])
    assert all(note["compiled"] is False for note in spec["runtime"]["annotations"])


def test_visualization_page_is_replica_only():
    page = get("/workflow")
    assert page.status_code == 200
    html = page.text
    assert "行内复刻图" in html
    assert "实际执行图" not in html
    assert "/v1/canvas-spec" in html
    assert "runtimeBoard" not in html
    assert "拖拽" in html
    spec = get("/v1/canvas-spec").json()
    assert "compiledEdges" in spec["runtime"]


def test_normal_stream_path_reaches_end():
    response = post("/v1/workflows/stream", {"inputs": {"scope": SCOPE, "question": "限额空间还有多少？"}})
    text = response.text.replace(" ", "")
    assert '"type":"DONE"' in text
    assert '"node":"validate_output"' in text
    assert '"label":"生成解释"' in text
    assert '"label":"修正解释"' not in text
    assert '"path"' in text


def test_invalid_answer_retries_then_uses_marked_template():
    """mock 模式：坏答案 → 重试一次 → 仍不合规则用**已标记的**模板兜底。

    注意这里断言的不再是 NARRATIVE_VALIDATION_FAILED——那是 live 模式的标记。
    mock 模式允许模板兜底，但必须带 MODEL_OUTPUT_INVALID_USED_TEMPLATE 说明来源。
    """
    response = post(
        "/v1/workflows/stream",
        {"inputs": {"scope": SCOPE, "question": "现在重定价缺口率是多少？", "demoFault": "invalid_answer"}},
    )
    assert response.status_code == 200
    text = response.text.replace(" ", "")
    assert '"label":"生成解释"' in text
    assert '"label":"修正解释"' in text
    assert '"retrying":true' in text
    assert "MODEL_OUTPUT_INVALID_USED_TEMPLATE" in text
    assert '"type":"DONE"' in text


def test_followup_stream_reuses_same_graph_and_session_business():
    first = post("/v1/workflows/run", {"inputs": {"scope": SCOPE, "question": "自营贷款为什么影响大？"}}).json()
    response = post(
        "/v1/workflows/stream",
        {"inputs": {"scope": SCOPE, "question": "它有哪些新增业务？"}, "sessionId": first["sessionId"]},
    )
    text = response.text.replace(" ", "")
    assert '"followup":true' in text
    assert '"lastBusinessType":"自营贷款"' in text
    assert '"label":"识别问题"' in text
    assert '"type":"DONE"' in text
    assert "business" in response.text


def test_model_failure_keeps_package_and_marks_degrade():
    body = post(
        "/v1/workflows/run",
        {"inputs": {"scope": SCOPE, "question": "现在重定价缺口率是多少？", "demoFault": "model_failure"}},
    ).json()
    assert body["resultPackage"]["current"]["value"] > 0
    assert body["narrative"] is None
    assert "NARRATIVE_UNAVAILABLE" in body["degradeFlags"]


def test_api_failure_stream_marks_fetch_node():
    response = post(
        "/v1/workflows/stream",
        {"inputs": {"scope": SCOPE, "question": "现在重定价缺口率是多少？", "demoFault": "api_failure"}},
    )
    text = response.text.replace(" ", "")
    assert '"type":"ERROR"' in text
    assert "UPSTREAM_UNAVAILABLE" in text
    assert '"failedNode":"fetch_alm_data"' in text


def test_build_graph_fail_fetch_raises():
    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            graph = build_graph(client, fail_fetch=True)
            await graph.ainvoke(_initial_state({"inputs": {"scope": SCOPE, "question": ""}}, "demo-analyst"))

    try:
        asyncio.run(invoke())
        raise AssertionError("expected fetch failure")
    except httpx.HTTPStatusError as exc:
        assert exc.response.status_code == 502
