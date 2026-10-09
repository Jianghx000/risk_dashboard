"""平台边界一致性：复刻图必须以行内平台限制为边界。

规则事实来自 ``AI编排/docs/platform-constraints.json``，检查逻辑在
``almcanvas/constraints.py``。这里保证三件事：

1. 每条行内规则都被自动检查或显式豁免（不允许静默漏掉）；
2. 复刻图当前形态下全部通过；
3. 检查不是空转——对构造的违规蓝图必须真的报错。
"""

import pytest

from almcanvas import constraints
from repricing_gap_workflow.platform_blueprint import get_blueprint


BLUEPRINT = get_blueprint()


# --------------------------------------------------------------------------- 规则表自身


def test_constraints_file_is_structurally_valid():
    data = constraints.load_constraints()
    sources = data["_meta"]["sources"]
    assert ".docx" in sources["docx"], "docx 必须是权威原文出处"
    assert ".md" in sources["quickref"]
    assert len(data["rules"]) >= 20


def test_every_rule_is_either_checked_or_explicitly_exempted():
    """核心不变量：没有规则可以被静默忽略。"""
    assert constraints.unclassified() == []


def test_known_conflicts_record_a_resolution():
    """docx 与契约.md 的矛盾必须显式记录裁定依据，不得默默选一个。"""
    recorded = constraints.conflicts()
    assert recorded, "应记录已知的行内文档矛盾"
    for item in recorded:
        assert item.get("resolution"), f"{item['id']} 缺裁定结论"
        assert item.get("docx") or item.get("quickref"), f"{item['id']} 缺出处"


def test_manual_exemptions_all_have_a_reason():
    for rule_id, reason in constraints.MANUAL.items():
        assert reason.strip(), f"{rule_id} 被豁免但未写明原因"


def test_behavior_rules_point_at_real_enforcing_tests():
    """行为约束必须有对应用例，否则等于"以为有人管"。"""
    from pathlib import Path

    base = Path(__file__).resolve().parents[2]
    for rule_id, relative in constraints.BEHAVIOR.items():
        path = base / relative
        assert path.is_file(), f"{rule_id} 指向的用例文件不存在: {relative}"
        source = path.read_text(encoding="utf-8")
        assert f"def test_" in source, f"{relative} 里没有测试函数"


# --------------------------------------------------------------------------- 复刻图合规


def test_replica_blueprint_satisfies_all_auto_checks():
    problems = constraints.run(BLUEPRINT)
    assert problems == [], "复刻图违反行内平台约束：\n" + "\n".join(problems)


def test_checks_cover_most_rules():
    coverage = constraints.coverage()
    total = len(constraints.rules())
    assert len(coverage["auto"]) >= total * 0.6, f"自动检查只覆盖 {len(coverage['auto'])}/{total} 条"


# --------------------------------------------------------------------------- 检查不是空转
#
# 每条自动检查都用一个构造的违规蓝图验证它确实会报错。


def _blueprint_with(nodes, edges=None):
    return {"nodes": nodes, "edges": edges or [], "inlineNotes": []}


def test_check_graph_is_dag_catches_back_edge():
    edges = [{"from": "a", "to": "b", "kind": "normal"}, {"from": "b", "to": "a", "kind": "back-edge", "inlineExpansion": "展开"}]
    problems = constraints.check_graph_is_dag(_blueprint_with([], edges))
    assert problems and "回边" in problems[0]


def test_check_script_no_long_io_catches_http_import():
    nodes = [{"id": "s", "type": "脚本", "code": "import requests\ndef handler(params):\n    return {}\n"}]
    problems = constraints.check_script_no_long_io(_blueprint_with(nodes))
    assert any("requests" in p for p in problems)


def test_check_script_no_long_io_catches_open_builtin():
    nodes = [{"id": "s", "type": "脚本", "code": "def handler(params):\n    open('/etc/passwd')\n    return {}\n"}]
    problems = constraints.check_script_no_long_io(_blueprint_with(nodes))
    assert any("'open'" in p or '"open"' in p for p in problems)


def test_check_script_must_return_object_catches_multiple_functions():
    nodes = [{"id": "s", "type": "脚本", "code": "def handler(params):\n    return {}\ndef helper():\n    return 1\n"}]
    problems = constraints.check_script_must_return_object(_blueprint_with(nodes))
    assert problems and "2 个顶层函数" in problems[0]


def test_check_script_must_return_object_catches_wrong_function_name():
    nodes = [{"id": "s", "type": "脚本", "code": "def run(params):\n    return {}\n"}]
    problems = constraints.check_script_must_return_object(_blueprint_with(nodes))
    assert problems and "handler" in problems[0]


def test_check_start_object_depth_catches_too_many_inputs():
    fields = [[f"f{i}", "String", "必填", "x"] for i in range(41)]
    nodes = [{"id": "start", "type": "开始", "fields": fields}]
    problems = constraints.check_start_object_depth(_blueprint_with(nodes))
    assert problems and "40" in problems[0]


def test_check_start_system_input_catches_untraceable_reference():
    nodes = [
        {"id": "start", "type": "开始"},
        {"id": "s", "type": "脚本", "inputs": [{"name": "x", "type": "String", "source": "${ghost.value}"}]},
    ]
    problems = constraints.check_start_system_input_traceable(_blueprint_with(nodes))
    assert problems and "ghost" in problems[0]


def test_check_condition_nesting_catches_too_many_branches():
    branches = [{"when": f"c{i}", "then": "n"} for i in range(6)]
    nodes = [{"id": "gate", "type": "条件选择器", "config": {"kind": "condition", "branches": branches}}]
    problems = constraints.check_condition_nesting(_blueprint_with(nodes))
    assert problems and "5" in problems[0]


def test_check_subflow_depth_catches_deeper_than_two():
    nodes = [{"id": "sub", "type": "业务编排", "config": {"kind": "subflow", "depth": 3, "refWorkflow": "other"}}]
    problems = constraints.check_subflow_depth(_blueprint_with(nodes))
    assert problems and "上限 2" in problems[0]


def test_check_agent_catches_agent_on_metric_chain():
    nodes = [{"id": "ag", "type": "Agent", "purpose": "自主完成指标归因取数", "config": {"kind": "agent"}}]
    problems = constraints.check_agent_not_on_main_chain(_blueprint_with(nodes))
    assert problems and "不建议" in problems[0]


def test_check_no_file_upload_catches_file_input():
    nodes = [{"id": "start", "type": "开始", "fields": [["report", "File", "可空", ""]]}]
    problems = constraints.check_no_file_upload(_blueprint_with(nodes))
    assert problems and "File" in problems[0]


def test_check_api_flat_params_catches_complex_body():
    nodes = [{"id": "api", "type": "API", "inputs": [{"name": "body", "type": "Object"}]}]
    problems = constraints.check_api_flat_params(_blueprint_with(nodes))
    assert problems and "复杂入参" in problems[0]


def test_check_prompt_json_no_streaming_catches_json_output():
    nodes = [{"id": "p", "type": "Prompt", "config": {"kind": "prompt", "outputFormat": "json"}}]
    problems = constraints.check_prompt_json_no_streaming(_blueprint_with(nodes))
    assert problems and "不支持流式" in problems[0]


def test_check_prompt_accepts_text_output():
    nodes = [{"id": "p", "type": "Prompt", "config": {"kind": "prompt", "outputFormat": "text"}}]
    assert constraints.check_prompt_json_no_streaming(_blueprint_with(nodes)) == []


def test_local_script_timeout_is_not_wider_than_platform():
    """本地可以比行内更严（更早降级），但不得更宽。"""
    assert constraints.check_script_timeout_local() == []


def test_local_session_ttl_within_platform_cap():
    assert constraints.check_session_ttl_local() == []


# --------------------------------------------------------------------------- STAGE 帧 nodeType
#
# 回归：server.NODE_TYPES 曾因推导条件写错（拿 node_id 去查角色字典）而变成空字典，
# 结果每个 STAGE 帧的 nodeType 都是 null。行内平台用 nodeType 区分节点类别
# （aiworkflow.nodes:18-19 要求与行内节点类型一一对应），丢成 null 等于丢掉这层信息。


def test_node_types_derived_from_runtime_meta_covers_every_emittable_node():
    from repricing_gap_workflow.graph_spec import RUNTIME_META
    from repricing_gap_workflow.server import NODE_LABELS, NODE_TYPES

    emittable = {
        node_id for node_id in RUNTIME_META if node_id not in {"__start__", "__end__"}
    }
    assert set(NODE_TYPES) == emittable, "NODE_TYPES 未覆盖全部可发帧节点"
    assert set(NODE_LABELS) == emittable
    assert None not in NODE_TYPES.values(), f"有节点推导出 None: {NODE_TYPES}"


def test_stream_stage_frames_carry_a_platform_node_type():
    """端到端：真实 SSE 流里每个 STAGE 帧都必须带行内节点类型。"""
    import asyncio

    import httpx
    from aiworkflow.acceptance import collect_by_type, parse_sse, stage_nodes
    from aiworkflow.nodes import (
        NODE_TYPE_API,
        NODE_TYPE_PROMPT,
        NODE_TYPE_SCRIPT,
    )

    from repricing_gap_workflow import analysis
    from repricing_gap_workflow.server import app

    scope = {
        "metricCode": analysis.METRIC_CODE,
        "orgCode": analysis.ORG_CODE,
        "currencyCode": analysis.CURRENCY_CODE,
        "tenorCode": analysis.TENOR_CODE,
        "asOfDate": analysis.CURRENT_DATE,
    }

    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post(
                "/v1/workflows/stream",
                json={"inputs": {"scope": scope, "question": "重定价缺口率较上期为何上升？"}},
                headers={"X-Demo-User": "demo-analyst"},
            )

    events = parse_sse(asyncio.run(invoke()).text)
    by_type = collect_by_type(events)

    assert stage_nodes(by_type), "应有 STAGE 帧"
    missing = [
        frame["data"]["node"]
        for frame in by_type["STAGE"]
        if not frame["data"].get("nodeType")
    ]
    assert missing == [], f"这些 STAGE 帧丢了 nodeType: {missing}"

    allowed = {NODE_TYPE_SCRIPT, NODE_TYPE_API, NODE_TYPE_PROMPT, "condition"}
    bad = [
        (frame["data"]["node"], frame["data"]["nodeType"])
        for frame in by_type["STAGE"]
        if frame["data"]["nodeType"] not in allowed
    ]
    assert bad == [], f"nodeType 不是行内节点类型: {bad}"
