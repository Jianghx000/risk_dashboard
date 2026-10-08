"""aiworkflow.workflow_check 单元测试（工作流定义校验器）。

运行：``PYTHONPATH=<仓库根> python3 -m unittest tests.test_workflow_check -v``
"""

from __future__ import annotations

import unittest

from aiworkflow import workflow_check as wc

# 校验器自测用的图（含显式声明回边的形态；limit 工作流本体已是前向 DAG）
LIMIT_NODES = [
    "resolve_context", "fetch_definition", "fetch_values", "fetch_limit_config",
    "deterministic_analysis", "generate_narrative", "validate_output", "build_view",
]
LIMIT_EDGES = [
    ("resolve_context", "fetch_definition"),
    ("resolve_context", "__end__"),
    ("fetch_definition", "fetch_values"),
    ("fetch_definition", "__end__"),
    ("fetch_values", "fetch_limit_config"),
    ("fetch_values", "__end__"),
    ("fetch_limit_config", "deterministic_analysis"),
    ("deterministic_analysis", "generate_narrative"),
    ("generate_narrative", "validate_output"),
    ("generate_narrative", "build_view"),
    ("generate_narrative", "__end__"),
    ("validate_output", "generate_narrative"),
    ("validate_output", "build_view"),
    ("build_view", "__end__"),
]
BACK_EDGES = {("validate_output", "generate_narrative")}


def _check(**kwargs):
    options = {"declared_back_edges": BACK_EDGES}
    options.update(kwargs)
    return wc.check_workflow(
        "limit", LIMIT_NODES, LIMIT_EDGES,
        entry="resolve_context", **options,
    )


class WorkflowCheckTests(unittest.TestCase):
    def test_limit_shape_passes(self):
        self.assertEqual(_check(), [])

    def test_undeclared_back_edge_detected(self):
        problems = _check(declared_back_edges=set())
        self.assertEqual(len(problems), 1)
        self.assertIn("未声明的回边", problems[0])

    def test_cyclic_graph_detected(self):
        edges = [
            ("resolve_context", "fetch_definition"),
            ("fetch_definition", "resolve_context"),  # 未声明的环
        ]
        problems = wc.check_workflow(
            "bad", ["resolve_context", "fetch_definition"], edges,
            entry="resolve_context", declared_back_edges=set(),
        )
        self.assertTrue(any("未声明的回边" in p for p in problems))

    def test_declared_back_edge_must_exist(self):
        problems = _check(declared_back_edges={("a", "b")})
        self.assertTrue(any("声明的回边不是图中的边" in p for p in problems))

    def test_entry_incoming_edge_detected(self):
        edges = [("resolve_context", "fetch_definition"), ("fetch_definition", "resolve_context")]
        problems = wc.check_workflow(
            "bad", ["resolve_context", "fetch_definition"], edges,
            entry="resolve_context", declared_back_edges={("fetch_definition", "resolve_context")},
        )
        self.assertTrue(any("入口节点存在入边" in p for p in problems))

    def test_dead_end_detected(self):
        edges = [("resolve_context", "fetch_definition")]
        problems = wc.check_workflow(
            "bad", ["resolve_context", "fetch_definition", "stranded"], edges,
            entry="resolve_context",
        )
        self.assertTrue(any("无法到达结束节点" in p for p in problems))

    def test_bad_endpoint_detected(self):
        edges = [("resolve_context", "fetch_definition"), ("resolve_context", "nope")]
        problems = wc.check_workflow(
            "bad", ["resolve_context", "fetch_definition"], edges,
            entry="resolve_context",
        )
        self.assertTrue(any("边终点不存在" in p for p in problems))

    def test_nested_loop_detected(self):
        problems = wc.check_workflow(
            "bad", ["loop_outer", "loop_inner"], [], entry="loop_outer",
            loop_bodies={"loop_outer": ["script_a", "loop_inner"], "loop_inner": ["script_b"]},
        )
        self.assertTrue(any("循环组件嵌套" in p for p in problems))

    def test_subflow_depth_and_self_reference(self):
        problems = wc.check_workflow(
            "bad", ["sub_a", "sub_b"], [], entry="sub_a",
            subflow_refs={"sub_a": ("sub_a", 1), "sub_b": ("child_flow", 3)},
        )
        self.assertTrue(any("自引用" in p for p in problems))
        self.assertTrue(any("嵌套 3 层" in p for p in problems))

    def test_input_declaration_checked(self):
        problems = _check(input_decls=[
            {"name": "mode", "type": "String", "required": True},
            {"name": "mode", "type": "String"},
            {"name": "x", "type": "NotAType"},
        ])
        self.assertTrue(any("入参名重复" in p for p in problems))
        self.assertTrue(any("入参声明非法" in p for p in problems))


if __name__ == "__main__":
    unittest.main()
