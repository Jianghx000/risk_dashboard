"""state 契约一致性：WorkflowState 与 aiworkflow 工厂的兼容���回归测试。

背景：LangGraph 按 TypedDict 通道过滤节点写入
（``langgraph/graph/state.py`` 的 ``_get_updates`` 只保留 ``output_keys``）。
工厂写的键若不在 ``WorkflowState`` 里会被**静默丢弃**——不报错、不告警、
测试不红，但 DONE 帧会发空文案。逐节点单测对这类缺陷结构性失明，
所以这里全部用「真实 StateGraph + 断最终输出」来断言。
"""

import asyncio
import json

from aiworkflow import sse
from aiworkflow.graph_kit import DEGRADE_NARRATIVE_VALIDATION_FAILED, make_validate_output
from aiworkflow.workflow_check import check_workflow
from langgraph.graph import END, START, StateGraph

from repricing_gap_workflow.workflow import WorkflowState


# aiworkflow/graph_kit.py 第 19-21 行列出的公共 state 键。
# 工厂读写的就是这些；少声明任何一个都会触发静默丢键。
PUBLIC_STATE_KEYS = (
    "emit",
    "session_id",
    "fault",
    "mode",
    "degrade_flags",
    "regen_count",
    "regenerated",
    "llm_failed",
    "fault_injected",
    "validation_errors",
    "narrative",
    "failed",
)


def base_state(**overrides):
    frames: list[str] = []
    state = {
        "inputs": {"scope": {}, "question": ""},
        "user": "demo-analyst",
        "mode": "overview",
        "emit": frames.append,
        "degrade_flags": [],
        "regen_count": 0,
        "regenerated": False,
        "llm_failed": False,
        "result_package": {},
        "narrative": None,
    }
    state.update(overrides)
    return state, frames


def frames_of(raw_frames):
    return [json.loads(frame.removeprefix("data:")) for frame in raw_frames]


def test_workflow_state_declares_every_public_key():
    """公共 state 键必须在 WorkflowState 里显式声明，否则工厂写入会被丢弃。"""
    missing = [key for key in PUBLIC_STATE_KEYS if key not in WorkflowState.__annotations__]
    assert missing == [], f"WorkflowState 缺少公共键，工厂写入会被 LangGraph 丢弃: {missing}"


def test_narrative_survives_a_real_state_graph():
    """回归 R1：节点写入的 narrative 必须出现在编译图的最终 state 里。"""

    def write_narrative(state):
        return {"narrative": {"headline": "x", "sections": [], "numericRefs": []}}

    graph = StateGraph(WorkflowState)
    graph.add_node("write_narrative", write_narrative)
    graph.add_edge(START, "write_narrative")
    graph.add_edge("write_narrative", END)
    result = asyncio.run(graph.compile().ainvoke(base_state()[0]))

    assert result["narrative"] is not None, "narrative 被静默丢弃（R1 未修复）"


def test_validate_output_factory_composes_into_state_graph():
    """回归 R3：aiworkflow 工厂必须能真的装进 StateGraph 跑（此前从未组合过）。"""
    gate = make_validate_output(
        lambda state, narrative: ["UNREFERENCED_NUMBER:999"],
        phase="first",
        name="validate_output",
    )
    narrative = {"headline": "h", "sections": [], "numericRefs": []}

    graph = StateGraph(WorkflowState)
    graph.add_node("validate_output", gate)
    graph.add_edge(START, "validate_output")
    graph.add_edge("validate_output", END)

    state, frames = base_state(narrative=narrative)
    result = asyncio.run(graph.compile().ainvoke(state))

    # 首次校验不通过 → 线性展开语义：发差异清单、清 narrative、计一次重生成。
    assert result["validation_errors"] == ["UNREFERENCED_NUMBER:999"]
    assert result["narrative"] is None
    assert result["regen_count"] == 1
    assert result["regenerated"] is True

    # emit 契约（R2）：没有 emit 键会直接 KeyError，工厂根本跑不起来。
    stages = [frame for frame in frames_of(frames) if frame["type"] == sse.TYPE_STAGE]
    assert stages, "工厂未通过 state['emit'] 推送 STAGE 帧"
    assert stages[0]["data"]["nodeType"] == "script"


def test_validate_retry_factory_degrades_instead_of_looping():
    """复核仍失败 → 降级（重试预算 1），不得形成回边。"""
    gate = make_validate_output(
        lambda state, narrative: ["STILL_BAD"],
        phase="retry",
        name="validate_retry",
    )
    narrative = {"headline": "h", "sections": [], "numericRefs": []}

    graph = StateGraph(WorkflowState)
    graph.add_node("validate_retry", gate)
    graph.add_edge(START, "validate_retry")
    graph.add_edge("validate_retry", END)

    state, _frames = base_state(narrative=narrative)
    result = asyncio.run(graph.compile().ainvoke(state))

    assert result["narrative"] is None
    assert DEGRADE_NARRATIVE_VALIDATION_FAILED in result["degrade_flags"]
    assert result["regen_count"] == 0, "复核节点不应累加重试计数"


def test_generated_graph_declares_no_back_edges():
    """阶段 0 的目的：让 v1 能安全地与 aiworkflow 工厂共存而不破坏无回边不变量。

    边集取自编译后的图（而非手写清单），因此这条断言直接守住
    「行内画布无回边」的平台约束——v2 那种 validate_output → generate_narrative
    的回边会在这里被装配期检查拦下。
    """
    from repricing_gap_workflow.graph_spec import compiled_snapshot

    snapshot = compiled_snapshot()
    nodes = [node for node in snapshot["nodes"] if node not in {"__start__", "__end__"}]
    # check_workflow 以 end_node（默认 __end__）为合法终点，不接受 __start__ 边。
    edges = [
        (edge["source"], edge["target"])
        for edge in snapshot["edges"]
        if edge["source"] != "__start__"
    ]
    problems = check_workflow("repricing_gap", nodes, edges, entry="resolve_context")
    assert problems == []


def test_end_to_end_done_frame_carries_non_empty_narrative():
    """回归 R1 的端到端形态：断 HTTP 最终输出，不逐节点断返回值。

    这是唯一能捕获「文案被静默丢弃 → 校验空过 → DONE 帧空文案」的断言。
    """
    import httpx

    from repricing_gap_workflow.server import app

    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post(
                "/v1/workflows/run",
                json={"inputs": {"scope": _default_scope(), "question": ""}},
                headers={"X-Demo-User": "demo-analyst"},
            )

    response = asyncio.run(invoke())
    body = response.json()
    assert response.status_code == 200
    assert body["resultPackage"]["current"]["value"] > 0
    assert body["narrative"] is not None, "DONE 帧文案为空——多半是 narrative 被静默丢弃"
    assert body["validationErrors"] == []
    assert body["degradeFlags"] == []


def _default_scope():
    from repricing_gap_workflow import analysis

    return {
        "metricCode": analysis.METRIC_CODE,
        "orgCode": analysis.ORG_CODE,
        "currencyCode": analysis.CURRENCY_CODE,
        "tenorCode": analysis.TENOR_CODE,
        "asOfDate": analysis.CURRENT_DATE,
    }


# --------------------------------------------------------------------------- 结束输出


def test_end_output_template_declares_every_template_key():
    """结束节点输出由 END_OUTPUT_TEMPLATE 声明式装配（行内"自定义"形态）。"""
    from repricing_gap_workflow.server import END_OUTPUT_TEMPLATE, _final

    state, _ = base_state(
        mode="attribution",
        narrative={"headline": "h"},
        regenerated=True,
        validation_errors=["E"],
    )
    state["result_package"] = {"current": {"value": 1.0}}
    out = _final(state, "s1")

    missing = [key for key in END_OUTPUT_TEMPLATE if key not in out]
    assert missing == [], f"模板声明的键未出现在输出里: {missing}"
    assert out["analysisMode"] == "attribution"
    assert out["narrative"] == {"headline": "h"}
    assert out["regenerated"] is True
    assert out["validationErrors"] == ["E"]


def test_adding_a_template_key_needs_no_code_change():
    """模板是真来源：加一个键并重装配，输出自动多出该键。"""
    from repricing_gap_workflow import server

    original = dict(server.END_OUTPUT_TEMPLATE)
    try:
        server.END_OUTPUT_TEMPLATE["durationMs"] = "${durationMs}"
        server._end_output = server.make_end_output(server.END_OUTPUT_TEMPLATE)
        state, _ = base_state()
        state["durationMs"] = 42
        out = server._final(state, "s")
        assert out["durationMs"] == 42
    finally:
        server.END_OUTPUT_TEMPLATE.clear()
        server.END_OUTPUT_TEMPLATE.update(original)
        server._end_output = server.make_end_output(server.END_OUTPUT_TEMPLATE)
