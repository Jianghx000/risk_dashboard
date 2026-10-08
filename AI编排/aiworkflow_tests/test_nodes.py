"""aiworkflow.nodes 单元测试（中间信息输出 / 循环 / 子编排 / MCP / 结束装配）。

运行：``PYTHONPATH=<仓库根> python3 -m unittest tests.test_nodes -v``
"""

from __future__ import annotations

import asyncio
import json
import unittest

from aiworkflow import nodes


def make_state(**extra):
    frames: list[str] = []

    def emit(text: str) -> None:
        frames.append(text)

    state = {"session_id": "s1", "emit": emit}
    state.update(extra)
    return state, frames


def frame_types(frames):
    return [json.loads(f[5:])["type"] for f in frames]


class MessageNodeTests(unittest.TestCase):
    def test_string_message_goes_to_data_output(self):
        node = nodes.make_message_node("notice", lambda s: "任务正在执行中", output_name="notice")
        state, frames = make_state()
        result = asyncio.run(node(state))
        self.assertEqual(result, {"notice": "任务正在执行中"})
        self.assertEqual(frame_types(frames), ["DATA"])
        self.assertEqual(json.loads(frames[0][5:])["data"], {"output": "任务正在执行中"})

    def test_object_message_uses_data_directly(self):
        node = nodes.make_message_node(
            "progress", lambda s: {"done": 3, "total": 5}, content_type="Object"
        )
        state, frames = make_state()
        asyncio.run(node(state))
        self.assertEqual(json.loads(frames[0][5:])["data"], {"done": 3, "total": 5})

    def test_invalid_content_type_rejected(self):
        with self.assertRaises(ValueError):
            nodes.make_message_node("bad", lambda s: 1, content_type="Integer")


class LoopNodeTests(unittest.TestCase):
    def test_serial_loop_with_middle_vars(self):
        async def step(params):
            return {"acc": params.get("acc", "") + str(params["loop_item"])}

        # 中间变量 acc 初值 ""，跨轮共享：每轮拼接上一轮结果
        node = nodes.make_loop_node(
            "loop",
            [_as_node(step)],
            lambda s: ["a", "b", "c"],
            output_name="loop_output",
            middle_vars={"acc": ""},
            output_fn=lambda ls: {"text": ls.get("acc", "")},
        )
        state, frames = make_state()
        result = asyncio.run(node(state))
        texts = [r["text"] for r in result["loop_output"]]
        self.assertEqual(texts, ["a", "ab", "abc"])
        self.assertEqual(frame_types(frames), ["STAGE", "STAGE", "STAGE"])
        stage = json.loads(frames[0][5:])["data"]
        self.assertEqual(stage["node"], "loop")
        self.assertEqual(stage["nodeType"], "loop")
        self.assertEqual(stage["payload"]["index"], 0)

    def test_nested_loop_rejected_at_build(self):
        inner = nodes.make_loop_node("inner", [], lambda s: [], output_name="o")
        with self.assertRaises(ValueError):
            nodes.make_loop_node("outer", [inner], lambda s: [], output_name="o")

    def test_non_list_input_ignore(self):
        node = nodes.make_loop_node(
            "loop", [], lambda s: "not-a-list",
            output_name="o", on_error="ignore", default_output={"o": []},
        )
        state, _ = make_state()
        result = asyncio.run(node(state))
        self.assertEqual(result, {"o": []})

    def test_max_iterations_cap(self):
        async def body(params):
            return {}

        node = nodes.make_loop_node(
            "loop", [], lambda s: list(range(1000)),
            output_name="o", max_iterations=5,
        )
        state, frames = make_state()
        result = asyncio.run(node(state))
        self.assertEqual(len(result["o"]), 5)


def _as_node(step):
    async def node(state):
        return await step(state)

    return node


class SubflowNodeTests(unittest.TestCase):
    def test_result_nested_under_output_name(self):
        async def flow(inputs):
            return {"echo": inputs["x"]}

        node = nodes.make_subflow_node("child", flow, lambda s: {"x": s["x"]}, output_name="child_out")
        state, _ = make_state(x=7)
        result = asyncio.run(node(state))
        self.assertEqual(result, {"child_out": {"echo": 7}})

    def test_depth_over_limit_rejected(self):
        async def flow(inputs):
            return {}

        with self.assertRaises(ValueError):
            nodes.make_subflow_node("child", flow, lambda s: {}, output_name="o", depth=3)

    def test_flow_failure_ignore(self):
        async def flow(inputs):
            raise RuntimeError("down")

        node = nodes.make_subflow_node(
            "child", flow, lambda s: {},
            output_name="o", on_error="ignore", default_output={"o": None},
        )
        state, frames = make_state()
        result = asyncio.run(node(state))
        self.assertEqual(result, {"o": None})
        self.assertEqual(frame_types(frames), [])


class McpNodeTests(unittest.TestCase):
    def test_invoke_result(self):
        async def invoke(params):
            return {"text": f"parsed:{params['q']}"}

        node = nodes.make_mcp_node(
            "parse", nodes.McpSpec(server="文件解析器", tool="parse_file"), invoke,
            lambda s: {"q": s["q"]}, output_name="parsed",
        )
        state, _ = make_state(q="doc.pdf")
        result = asyncio.run(node(state))
        self.assertEqual(result, {"parsed": {"text": "parsed:doc.pdf"}})

    def test_failure_abort_emits_error_frame(self):
        async def invoke(params):
            raise RuntimeError("boom")

        node = nodes.make_mcp_node(
            "parse", nodes.McpSpec(server="s", tool="t"), invoke,
            lambda s: {}, output_name="o",
        )
        state, frames = make_state()
        result = asyncio.run(node(state))
        self.assertIn("failed", result)
        self.assertEqual(frame_types(frames), ["ERROR"])


class EndOutputTests(unittest.TestCase):
    def test_template_resolution(self):
        assemble = nodes.make_end_output({
            "out": "${result_package}",
            "cost": "${durationMs}",
        })
        data = assemble({"result_package": {"a": 1}, "durationMs": 12})
        self.assertEqual(data, {"out": {"a": 1}, "cost": 12})


if __name__ == "__main__":
    unittest.main()
