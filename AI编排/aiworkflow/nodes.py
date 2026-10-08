"""行内节点语义构件：脚本节点与 API 节点的 langgraph 节点工厂。

行内画布的节点类型与配置契约见 docs/platform-contract.md；本模块把"脚本节点 /
API 节点"的行内语义封装为 langgraph 节点工厂，业务图按行内节点类型装配，
验收即迁移预演：

- 脚本节点（``make_script_node``）：handler(params) 同步纯函数，必须以对象
  （dict）形式返回，超时默认 3 秒（行内沙箱约束），无 IO 由约定保证；
- API 节点（``make_api_node``）：按 API 注册声明调用（2xx + returnCode 双校验
  + 重试，经 aiworkflow.tools），``to_output`` 做成功后处理（行内画布上由后置
  脚本节点承担）；

两者都实现行内"异常忽略"开关语义（``on_error``）：``"abort"`` 失败中断整个
编排（ERROR 帧），``"ignore"`` 失败不中断、用 ``default_output`` 替代输出继续
下游。Prompt 节点构件见 aiworkflow.graph_kit.make_prompt_node；条件选择器
构件见 aiworkflow.conditions。

STAGE 帧的 ``nodeType`` 字段取 ``NODE_TYPE_*`` 常量（start/api/script/prompt/
condition），与行内节点类型一一对应。
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Optional, Union

from aiworkflow import config, sse
from aiworkflow.expressions import resolve_refs
from aiworkflow.graph_kit import fail
from aiworkflow.tools import ToolResult

NODE_TYPE_START = "start"
NODE_TYPE_API = "api"
NODE_TYPE_SCRIPT = "script"
NODE_TYPE_PROMPT = "prompt"
NODE_TYPE_CONDITION = "condition"
NODE_TYPE_MESSAGE = "message"
NODE_TYPE_LOOP = "loop"
NODE_TYPE_SUBFLOW = "subflow"
NODE_TYPE_MCP = "mcp"

NodeFn = Callable[[dict], Awaitable[dict]]
# 异常忽略时的默认输出：固定 dict 或 (state, error) -> dict（可追加降级标记/发事件）
DefaultOutput = Union[dict, Callable[[dict, str], dict], None]


@dataclass(frozen=True)
class ApiSpec:
    """行内 API 注册声明（API 节点的接口选择与出入参契约；本地用于映射与文档）。"""

    plugin: str  # 行内插件/API 标识（如 PLrMBXcsoD），迁移时按行内注册对照
    path: str
    method: str = "GET"
    params_desc: str = ""  # 入参概要（query/body/header）


def _handle_error(
    state: dict,
    name: str,
    error: str,
    error_code: Optional[str],
    on_error: str,
    default_output: DefaultOutput,
) -> dict:
    """行内异常忽略开关的统一实现：ignore 走默认输出，abort 走 fail 中断。"""
    if on_error == "ignore":
        if callable(default_output):
            return default_output(state, error)
        return dict(default_output or {})
    if on_error != "abort":
        raise ValueError(f"节点 {name} 的 on_error 须为 'abort' 或 'ignore'，收到 {on_error!r}")
    return fail(state, error_code or f"{name.upper()}_FAILED", True, error)


def make_end_output(template: dict[str, Any]) -> Callable[[dict], dict]:
    """行内结束节点输出装配（"自定义"形态：JSON 模板 + ``${state 键}`` 引用）。

    返回 ``assemble(state)``：把模板中的 ``${路径}`` 引用解析为最终输出对象
    （整串引用保留原类型，串内拼接转字符串，语义同 aiworkflow.expressions
    的 ``resolve_refs``）。"可视化"形态（参数名 + 引用清单）等价于值为单一
    引用的模板。``durationMs`` 由 runner 注入 state 后供模板引用。
    """

    def assemble(state: dict) -> dict:
        return resolve_refs(template, state)

    return assemble


def make_script_node(
    name: str,
    handler: Callable[[dict], dict],
    params_fn: Callable[[dict], dict],
    *,
    timeout_seconds: Optional[float] = None,
    on_error: str = "abort",
    default_output: DefaultOutput = None,
    on_success: Optional[Callable[[dict, dict], None]] = None,
    error_code: Optional[str] = None,
) -> NodeFn:
    """行内脚本节点：``handler(params)`` 在线程中同步执行，超时与返回形态对齐行内沙箱。

    ``params_fn(state)`` 组装入参（对应脚本节点"输入参数引用"）；handler 必须
    返回 dict（行内契约"必须以对象形式返回"）；超时默认
    ``SCRIPT_NODE_TIMEOUT_SECONDS``（3 秒，行内沙箱约束）；``on_success(state,
    output)`` 为成功后钩子（发 STAGE 帧用，行内过程可见性的本地等价物）。
    """
    timeout = config.SCRIPT_NODE_TIMEOUT_SECONDS if timeout_seconds is None else timeout_seconds

    async def node(state: dict) -> dict:
        try:
            output = await asyncio.wait_for(asyncio.to_thread(handler, params_fn(state)), timeout=timeout)
        except asyncio.TimeoutError:
            return _handle_error(
                state, name, f"脚本节点 {name} 执行超时（>{timeout}s）", error_code, on_error, default_output
            )
        except Exception as exc:  # noqa: BLE001 - 脚本异常按行内异常开关处理
            return _handle_error(state, name, f"{type(exc).__name__}: {exc}", error_code, on_error, default_output)
        if not isinstance(output, dict):
            return _handle_error(
                state, name, "脚本节点必须以对象（dict）形式返回（行内脚本节点契约）",
                error_code, on_error, default_output,
            )
        if on_success is not None:
            on_success(state, output)
        return output

    return node


def make_api_node(
    name: str,
    spec: ApiSpec,
    call: Callable[..., Awaitable[ToolResult]],
    params_fn: Callable[[dict], dict],
    *,
    to_output: Callable[[ToolResult], dict],
    on_error: str = "abort",
    default_output: DefaultOutput = None,
    on_success: Optional[Callable[[dict, dict], None]] = None,
    error_code: Optional[str] = None,
    retries: Optional[int] = None,
) -> NodeFn:
    """行内 API 节点：按注册声明调用，成功经 ``to_output(result)`` 转 state 增量。

    ``call(**params_fn(state))`` 由业务提供（内部走 aiworkflow.tools.get_with_retry，
    保持"换真实上游只改 base URL 与 token"的生产形态）；失败（网络/非 2xx/
    returnCode 非 SUC0000）按异常忽略开关处理，错误码缺省 ``{NAME}_FAILED``。
    """
    retry_times = config.TOOL_RETRY_TIMES if retries is None else retries

    async def node(state: dict) -> dict:
        try:
            result = await call(**params_fn(state))
        except Exception as exc:  # noqa: BLE001 - 取数函数自身的编程错误同样按失败处理
            result = ToolResult(ok=False, error=f"{type(exc).__name__}: {exc}")
        if not result.ok:
            error = f"API {spec.plugin}（{spec.path}）调用失败（已重试 {retry_times} 次）: {result.error}"
            return _handle_error(state, name, error, error_code, on_error, default_output)
        output = to_output(result)
        if not isinstance(output, dict):
            return _handle_error(state, name, "API 节点输出必须为对象（dict）", error_code, on_error, default_output)
        if on_success is not None:
            on_success(state, output)
        return output

    return node


# ---------------------------------------------------------------------------
# 中间信息输出 / 循环组件 / 业务编排（子编排）/ MCP 节点构件
# ---------------------------------------------------------------------------


def make_message_node(
    name: str,
    content_fn: Callable[[dict], Any],
    *,
    content_type: str = "String",
    output_name: Optional[str] = None,
) -> NodeFn:
    """行内中间信息输出节点：执行过程中向用户输出一段中间消息。

    ``content_fn(state)`` 计算消息内容；String 消息经 DATA 帧的 ``data.output``
    下发，Object 消息即 ``data`` 本身（行内流式输出语义，与 Prompt 增量同一
    通道）。``output_name`` 声明输出变量名（写入 state，供后置节点引用）。
    """
    if content_type not in ("String", "Object"):
        raise ValueError(f"content_type 须为 String/Object，收到 {content_type!r}")

    async def node(state: dict) -> dict:
        content = content_fn(state)
        data: Any = {"output": content} if content_type == "String" else content
        state["emit"](sse.format_frame(sse.TYPE_DATA, data, session_id=state.get("session_id")))
        return {output_name: content} if output_name else {}

    return node


def make_loop_node(
    name: str,
    body: list[NodeFn],
    input_fn: Callable[[dict], list],
    *,
    output_name: str,
    item_key: str = "loop_item",
    index_key: str = "loop_index",
    middle_vars: Optional[dict[str, Any]] = None,
    output_fn: Optional[Callable[[dict], dict]] = None,
    max_iterations: int = 100,
    on_error: str = "abort",
    default_output: DefaultOutput = None,
) -> NodeFn:
    """行内循环组件：遍历数组，每轮严格串行执行子流程（body 节点序列）。

    行内契约：循环次数由引用数组长度决定；多轮严格串行、不支持嵌套（装配期
    拒绝 body 内含循环节点，运行期以 ``is_loop_node`` 标记兜底）；中间变量
    （``middle_vars`` 初值）跨轮共享；每轮"循环结束"的输出参数由 ``output_fn``
    计算；节点输出固定为数组（``output_name`` → 本轮输出列表）。每轮完成发一
    个 STAGE 帧（轮次过程可见性，行内等价机制为循环配置的轮次调试视图）。
    """
    for step in body:
        if getattr(step, "is_loop_node", False):
            raise ValueError(f"循环组件 {name} 内不允许嵌套另一循环组件（行内约束）")

    async def node(state: dict) -> dict:
        items = input_fn(state)
        if not isinstance(items, list):
            return _handle_error(
                state, name, f"循环节点 {name} 的 loopInput 须为数组，收到 {type(items).__name__}",
                None, on_error, default_output,
            )
        results: list[dict] = []
        middle = dict(middle_vars or {})
        total = min(len(items), max_iterations)
        for index in range(total):
            loop_state = {**state, item_key: items[index], index_key: index, **middle}
            for step in body:
                update = await step(loop_state)
                if isinstance(update, dict):
                    loop_state.update(update)
            this_output = output_fn(loop_state) if output_fn is not None else {}
            results.append(this_output)
            for key in middle:
                middle[key] = loop_state.get(key, middle[key])
            state["emit"](
                sse.stage(name, f"循环第 {index + 1}/{total} 轮完成",
                          {"index": index, "output": this_output},
                          node_type=NODE_TYPE_LOOP, session_id=state.get("session_id"))
            )
        return {output_name: results}

    node.is_loop_node = True  # type: ignore[attr-defined]
    return node


def make_subflow_node(
    name: str,
    flow: Callable[[dict], Awaitable[dict]],
    input_fn: Callable[[dict], dict],
    *,
    output_name: str,
    depth: int = 1,
    on_error: str = "abort",
    default_output: DefaultOutput = None,
) -> NodeFn:
    """行业务编排节点：引用已有编排作为子流程，结果嵌套在输出变量名内。

    ``flow`` 为子编排执行器（如编译后 langgraph 图的 ``ainvoke``）；``depth``
    声明嵌套深度（行内上限 2 层，装配期拒绝超限；自引用与环由
    aiworkflow.workflow_check 的 subflow_refs 声明式检查）。子编排异常按异常
    忽略开关处理。
    """
    if depth > 2:
        raise ValueError(f"业务编排节点 {name} 嵌套 {depth} 层，超过行内上限 2 层")

    async def node(state: dict) -> dict:
        try:
            result = await flow(input_fn(state))
        except Exception as exc:  # noqa: BLE001 - 子编排异常按行内异常开关处理
            return _handle_error(state, name, f"子编排 {name} 执行失败: {exc}", None, on_error, default_output)
        return {output_name: result}

    return node


@dataclass(frozen=True)
class McpSpec:
    """行内 MCP 声明（已订阅/创建的 MCP Server 与其下工具）。"""

    server: str
    tool: str
    params_desc: str = ""


def make_mcp_node(
    name: str,
    spec: McpSpec,
    invoke: Callable[[dict], Awaitable[Any]],
    params_fn: Callable[[dict], dict],
    *,
    output_name: str,
    on_error: str = "abort",
    default_output: DefaultOutput = None,
) -> NodeFn:
    """行内 MCP 节点：调用 MCP Server 工具，入参 body(json)，输出为 Object。

    ``invoke(params)`` 为工具调用的本地实现（模拟或经真实 MCP 客户端转发；
    编排侧契约只有 server+tool 选择、body 入参与 Object 输出，协议对接是
    行内接入时的工作）。异常按异常忽略开关处理。
    """

    async def node(state: dict) -> dict:
        try:
            result = await invoke(params_fn(state))
        except Exception as exc:  # noqa: BLE001 - MCP 工具异常按行内异常开关处理
            return _handle_error(
                state, name, f"MCP {spec.server}.{spec.tool} 调用失败: {exc}", None, on_error, default_output
            )
        return {output_name: result}

    return node
