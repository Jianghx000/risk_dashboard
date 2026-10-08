"""aiworkflow.agent 单元测试（Agent 节点构件，假客户端驱动）。

运行：``PYTHONPATH=<仓库根> python3 -m unittest tests.test_agent -v``
"""

from __future__ import annotations

import asyncio
import json
import unittest
from types import SimpleNamespace

from aiworkflow import agent


def make_state():
    frames: list[str] = []

    def emit(text: str) -> None:
        frames.append(text)

    return {"session_id": "s1", "emit": emit}, frames


def frame_types(frames):
    return [json.loads(f[5:])["type"] for f in frames]


class FakeClient:
    """按脚本回放 assistant 消息的假 LLM 客户端。"""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls: list[list[dict]] = []

    async def chat_with_tools(self, messages, tools=None, params=None):
        self.calls.append([dict(m) for m in messages])
        return self.responses.pop(0)


def text_message(content):
    return SimpleNamespace(content=content, tool_calls=None)


def tool_message(call_id, name, arguments):
    call = SimpleNamespace(id=call_id, function=SimpleNamespace(name=name, arguments=arguments))
    return SimpleNamespace(content="", tool_calls=[call])


class AgentNodeTests(unittest.TestCase):
    def _node(self, fake, tools=None, **kwargs):
        return agent.make_agent_node(
            "agent",
            lambda s: "sys",
            lambda s: "user",
            tools,
            client_fn=lambda profile: fake,
            **kwargs,
        )

    def test_direct_answer_without_tools(self):
        fake = FakeClient([text_message("答案是 42")])
        node = self._node(fake)
        state, frames = make_state()
        result = asyncio.run(node(state))
        self.assertEqual(result, {"agent_result": {"steps": [], "output": "答案是 42"}})
        self.assertEqual(frame_types(frames), ["STAGE"])
        stage = json.loads(frames[0][5:])["data"]
        self.assertEqual(stage["nodeType"], "agent")

    def test_tool_call_round_with_hidden_args(self):
        invocations: list[dict] = []

        async def invoke(args):
            invocations.append(args)
            return {"weather": "晴", "city": args.get("city")}

        tool = agent.AgentTool(
            name="get_weather",
            description="查天气",
            parameters={"type": "object", "properties": {"city": {"type": "string"}}},
            invoke=invoke,
            hidden_args={"unit": "celsius"},  # 对 Agent 不可见，执行时注入
        )
        fake = FakeClient([
            tool_message("call1", "get_weather", json.dumps({"city": "北京"})),
            text_message("北京今天晴"),
        ])
        node = self._node(fake, tools=[tool])
        state, _ = make_state()
        result = asyncio.run(node(state))
        self.assertEqual(result["agent_result"]["output"], "北京今天晴")
        self.assertEqual(len(result["agent_result"]["steps"]), 1)
        step = result["agent_result"]["steps"][0]
        self.assertEqual(step["toolName"], "get_weather")
        self.assertEqual(step["arguments"], {"city": "北京", "unit": "celsius"})
        self.assertEqual(step["result"], {"weather": "晴", "city": "北京"})
        # 工具结果回传为 role=tool 消息
        tool_msgs = [m for m in fake.calls[1] if m["role"] == "tool"]
        self.assertEqual(len(tool_msgs), 1)

    def test_tool_failure_retries_once(self):
        attempts = 0

        async def flaky(args):
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                raise RuntimeError("transient")
            return {"ok": True}

        tool = agent.AgentTool(
            name="flaky", description="", parameters={"type": "object", "properties": {}}, invoke=flaky,
        )
        fake = FakeClient([
            tool_message("c1", "flaky", "{}"),
            text_message("done"),
        ])
        node = self._node(fake, tools=[tool])
        state, _ = make_state()
        result = asyncio.run(node(state))
        self.assertEqual(attempts, 2)
        self.assertEqual(result["agent_result"]["steps"][0]["result"], {"ok": True})

    def test_max_rounds_exhausted(self):
        fake = FakeClient([tool_message(f"c{i}", "noop", "{}") for i in range(3)])
        async def invoke(args):
            return {}

        tool = agent.AgentTool(name="noop", description="", parameters={"type": "object"}, invoke=invoke)
        node = self._node(fake, tools=[tool], max_rounds=3)
        state, _ = make_state()
        result = asyncio.run(node(state))
        self.assertEqual(result["agent_result"]["output"], None)
        self.assertEqual(len(result["agent_result"]["steps"]), 3)

    def test_unknown_tool_reported_to_model(self):
        fake = FakeClient([
            tool_message("c1", "missing_tool", "{}"),
            text_message("recover"),
        ])
        node = self._node(fake, tools=[])
        state, _ = make_state()
        result = asyncio.run(node(state))
        step = result["agent_result"]["steps"][0]
        self.assertIn("未知工具", step["result"]["error"])
        self.assertEqual(result["agent_result"]["output"], "recover")

    def test_llm_failure_ignore_uses_default(self):
        async def broken(messages, tools=None, params=None):
            raise RuntimeError("llm down")

        fake = SimpleNamespace(chat_with_tools=broken)
        node = self._node(fake)
        state, frames = make_state()
        result = asyncio.run(node(state))
        self.assertEqual(result, {"agent_result": {"steps": [], "output": None}})

    def test_llm_failure_abort_emits_error(self):
        async def broken(messages, tools=None, params=None):
            raise RuntimeError("llm down")

        fake = SimpleNamespace(chat_with_tools=broken)
        node = self._node(fake, on_error="abort")
        state, frames = make_state()
        result = asyncio.run(node(state))
        self.assertIn("failed", result)
        self.assertEqual(frame_types(frames), ["STAGE", "ERROR"])


if __name__ == "__main__":
    unittest.main()
