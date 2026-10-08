"""行内 Agent 节点构件（Function call 模式，docs/platform-contract.md 第 9 节）。

行内语义映射：

- 模型自主规划工具调用：以 openai 兼容 function call 循环实现（行内 ReAct
  模式不在此构件范围，接入时按平台模型配置选择）；
- 工具：``AgentTool`` 声明（name/description/JSON Schema 入参/invoke 实现），
  覆盖行内工具类型（API/AI 能力/业务编排/MCP 的可调用形态）；
- 工具调用失败支持重试一次（行内约定）；
- 工具入参"对 Agent 不可见"：``hidden_args`` 不进入 schema，执行时注入默认值；
- 输出固定 Object：``steps``（执行步骤数组，toolType/toolName/arguments/
  result）+ ``output``（最终结果）；
- 异常忽略开关与默认输出语义同其他节点构件。

Agent 节点默认不流式（行内 Agent 可流式输出，本地第一版非流式，接入时按
网关形态补充）。``client_fn`` 供测试注入假客户端。
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Optional

from aiworkflow import llm, sse
from aiworkflow.graph_kit import fail

NODE_TYPE_AGENT = "agent"

NodeFn = Callable[[dict], Awaitable[dict]]


@dataclass
class AgentTool:
    """一个可被 Agent 规划调用的工具（API/AI 能力/业务编排/MCP 的统一形态）。"""

    name: str
    description: str
    parameters: dict[str, Any]  # JSON Schema（body(json) 入参声明）
    invoke: Callable[[dict], Awaitable[Any]]
    hidden_args: dict[str, Any] = field(default_factory=dict)  # 对 Agent 不可见的默认值


def make_agent_node(
    name: str,
    system_prompt_fn: Callable[[dict], str],
    user_content_fn: Callable[[dict], str],
    tools: Optional[list[AgentTool]] = None,
    *,
    llm_profile: str = "low",
    llm_params: Optional[llm.LLMParams] = None,
    output_name: str = "agent_result",
    max_rounds: int = 8,
    on_error: str = "ignore",
    default_output: Any = None,
    client_fn: Callable[[str], llm.LLMClient] = llm.get_client,
) -> NodeFn:
    """构造行内 Agent 节点（Function call 循环 + 工具失败重试一次 + steps/output 输出）。"""
    tool_list = list(tools or [])
    by_name = {tool.name: tool for tool in tool_list}
    tool_schema = [
        {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters,
            },
        }
        for tool in tool_list
    ]

    async def node(state: dict) -> dict:
        session_id = state.get("session_id")
        state["emit"](sse.stage(name, "Agent 执行中", node_type=NODE_TYPE_AGENT, session_id=session_id))
        try:
            result = await _run(state, session_id)
        except Exception as exc:  # noqa: BLE001 - Agent 异常按行内异常开关处理
            if on_error == "abort":
                return fail(state, f"{name.upper()}_FAILED", True, f"{type(exc).__name__}: {exc}")
            fallback = default_output if default_output is not None else {"steps": [], "output": None}
            return {output_name: fallback}
        return {output_name: result}

    async def _run(state: dict, session_id: Optional[str]) -> dict[str, Any]:
        client = client_fn(llm_profile)
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt_fn(state)},
            {"role": "user", "content": user_content_fn(state)},
        ]
        steps: list[dict[str, Any]] = []
        output: Optional[str] = None
        for _ in range(max_rounds):
            message = await client.chat_with_tools(messages, tools=tool_schema or None, params=llm_params)
            calls = getattr(message, "tool_calls", None)
            if not calls:
                output = message.content
                break
            messages.append(
                {
                    "role": "assistant",
                    "content": message.content or "",
                    "tool_calls": [
                        {
                            "id": call.id,
                            "type": "function",
                            "function": {"name": call.function.name, "arguments": call.function.arguments},
                        }
                        for call in calls
                    ],
                }
            )
            for call in calls:
                tool = by_name.get(call.function.name)
                if tool is None:
                    result: Any = {"error": f"未知工具: {call.function.name}"}
                    arguments: dict[str, Any] = {}
                else:
                    try:
                        arguments = json.loads(call.function.arguments or "{}")
                    except json.JSONDecodeError:
                        arguments = {}
                    arguments.update(tool.hidden_args)  # 不可见入参以默认值注入
                    result = await _invoke_with_retry(tool, arguments)
                steps.append(
                    {
                        "toolType": "function",
                        "toolName": call.function.name,
                        "arguments": arguments,
                        "result": result,
                    }
                )
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.id,
                        "content": json.dumps(result, ensure_ascii=False, default=str)[:8000],
                    }
                )
        return {"steps": steps, "output": output}

    return node


async def _invoke_with_retry(tool: AgentTool, arguments: dict[str, Any]) -> Any:
    """工具调用失败支持重试一次（行内 Agent 约定）；再失败以 error 形态进入 steps。"""
    try:
        return await tool.invoke(arguments)
    except Exception:
        try:
            return await tool.invoke(arguments)
        except Exception as exc:  # noqa: BLE001 - 两次失败后把错误交给模型自行决策
            return {"error": f"{type(exc).__name__}: {exc}"[:200]}
