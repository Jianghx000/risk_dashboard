"""受控叙事工作流构件（行内 Prompt 节点 + 输出门禁的 langgraph 封装）。

范式契约（"LLM 不算数"四原则中的输出门禁部分）：

- Prompt 节点（``make_prompt_node``，对应行内 Prompt 节点）：只做文案组装：
  输入是确定性结果包，输出流式 DATA 帧 + 结构化 JSON；输出格式支持
  json/text/markdown（行内输出格式三选），JSON 模式输出参数声明须英文命名
  （行内硬约束）；节点异常忽略开关（``on_error``）：``"ignore"`` 失败不中断、
  降级为 narrative=null（degrade_flags += NARRATIVE_UNAVAILABLE），``"abort"``
  失败中断编排；
- 校验门禁（``make_validate_output`` 两阶段）：schema + 数值回填校验，行内画布
  无回边，"校验失败回生成"线性展开为前向链——首次校验（``phase="first"``）
  不通过发差异清单、清 narrative，条件选择器路由到修正 Prompt 节点，复核
  （``phase="retry"``）不通过降级（degrade_flags += NARRATIVE_VALIDATION_FAILED，
  narrative=null）；
- 所有正常收尾路径（校验通过 / LLM 降级 / 校验降级）汇聚到收尾节点（通常为
  视图组装 ``build_view``），保证 DONE 帧结构稳定。

各 app 的 WorkflowState 须包含公共键：``emit``（SSE 回调）、``session_id``、
``fault``、``mode``、``degrade_flags``、``regen_count``、``regenerated``、
``llm_failed``、``fault_injected``、``validation_errors``、``narrative``、``failed``。
"""

from __future__ import annotations

import copy
import re
from typing import Any, Awaitable, Callable, Optional

from aiworkflow import llm, sse

DEGRADE_NARRATIVE_VALIDATION_FAILED = "NARRATIVE_VALIDATION_FAILED"
DEGRADE_NARRATIVE_UNAVAILABLE = "NARRATIVE_UNAVAILABLE"

# 公共 state 键（供类型提示与文档；运行时 state 为普通 dict）
EmitFn = Callable[[str], None]
SystemPromptFn = Callable[[str], str]
UserContentFn = Callable[[dict[str, Any], Optional[list[str]]], str]
ValidateFn = Callable[[dict[str, Any], dict[str, Any]], list[str]]

# 行内 Prompt 节点 JSON 输出参数命名约束：变量名必须英文
_OUTPUT_PARAM_NAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")
_OUTPUT_FORMATS = ("json", "text", "markdown")


def fail(state: dict[str, Any], error_code: str, retryable: bool, message: str) -> dict[str, Any]:
    """推送 ERROR 帧并标记 state.failed（节点内短路收尾）。"""
    state["emit"](sse.workflow_error(error_code, retryable, message, session_id=state.get("session_id")))
    return {"failed": {"errorCode": error_code, "retryable": retryable, "message": message}}


def _degrade(
    state: dict[str, Any],
    stage_node: str,
    stage_label: str,
    detail: Any,
) -> dict[str, Any]:
    flags = list(state.get("degrade_flags", []))
    flags.append(DEGRADE_NARRATIVE_UNAVAILABLE)
    state["emit"](
        sse.stage(stage_node, stage_label, detail, node_type="prompt", session_id=state.get("session_id"))
    )
    return {"narrative": None, "llm_failed": True, "degrade_flags": flags}


def make_prompt_node(
    name: str,
    system_prompt_fn: SystemPromptFn,
    user_content_fn: UserContentFn,
    *,
    llm_profile: str = "low",
    llm_params: Optional[llm.LLMParams] = None,
    output_format: str = "json",
    output_params: Optional[list[dict[str, str]]] = None,
    on_error: str = "ignore",
    default_output: Any = None,
    started_label: str = "生成受控解读",
) -> Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]:
    """构造行内 Prompt 节点（流式 DATA 帧 + JSON 解析 + 行内异常忽略开关语义）。

    ``system_prompt_fn(mode)`` 与 ``user_content_fn(state, extra_errors)`` 由业务
    提供；``llm_profile`` 默认 low 档（模拟行内"优先小模型"），``llm_params``
    为节点级高级参数（temperature/topP/maxToken/seed 等，对齐行内 Prompt 节点
    参数面）；``output_format`` 为行内输出格式三选 json/text/markdown（json 时
    ``output_params`` 声明输出参数，变量名必须英文——行内硬约束）；``on_error``
    为行内异常忽略开关："ignore" 失败不中断、降级为 narrative=null 并记
    NARRATIVE_UNAVAILABLE（``default_output`` 可替换降级输出），"abort" 失败
    中断编排（ERROR 帧）。``fault="llm_down"`` 注入走与真实 LLM 失败同一条
    降级路径。
    """
    if output_format not in _OUTPUT_FORMATS:
        raise ValueError(f"output_format 须为 {'/'.join(_OUTPUT_FORMATS)} 之一，收到 {output_format!r}")
    if output_format == "json" and output_params:
        for param in output_params:
            param_name = str(param.get("name", ""))
            if not _OUTPUT_PARAM_NAME_RE.match(param_name):
                raise ValueError(
                    f"Prompt 节点 {name} 输出参数名 {param_name!r} 非法：行内约束 JSON 输出变量名必须英文"
                )

    async def prompt_node(state: dict[str, Any]) -> dict[str, Any]:
        session_id = state.get("session_id")
        state["emit"](sse.stage(name, started_label, node_type="prompt", session_id=session_id))
        if state.get("llm_failed"):
            return {}
        system_prompt = system_prompt_fn(state["mode"])
        extra_errors = state.get("validation_errors") or None

        async def on_delta(delta: str) -> None:
            state["emit"](sse.text_chunk(delta, session_id=session_id))

        if state.get("fault") == "llm_down" and state.get("regen_count", 0) == 0:
            return _degrade(
                state,
                f"{name}_failed",
                "AI 文案生成失败，已降级为确定性结果",
                None,
            )
        try:
            client = llm.get_client(llm_profile)
            raw = await client.stream_json_with_retry(
                system_prompt, user_content_fn(state, extra_errors), on_delta, params=llm_params
            )
        except Exception as exc:  # noqa: BLE001 - LLM 环节失败按行内异常开关处理
            message = "AI 文案生成失败，已降级为确定性结果"
            if on_error == "abort":
                return fail(state, f"{name.upper()}_FAILED", True, f"{type(exc).__name__}: {exc}")
            return _degrade(state, f"{name}_failed", message, {"error": f"{type(exc).__name__}: {exc}"[:200]})
        if output_format != "json":
            return {"narrative": raw.strip() if output_format == "markdown" else raw}
        try:
            narrative = llm.parse_json(raw)
        except ValueError:
            message = "AI 文案解析失败，已降级为确定性结果"
            if on_error == "abort":
                return fail(state, f"{name.upper()}_FAILED", True, message)
            return _degrade(state, f"{name}_failed", message, None)
        return {"narrative": narrative}

    return prompt_node


def make_validate_output(
    validate_fn: ValidateFn,
    phase: str = "first",
    name: str = "validate_output",
) -> Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]:
    """构造输出校验门禁节点（schema + 数值回填；行内线性展开的两阶段形态）。

    行内画布无回边，"校验失败回生成"按 docs/platform-contract.md 第 12 节展开为
    前向链：``make_validate_output(fn, phase="first", name="validate_output")``
    （首次校验：不通过发差异清单 STAGE 帧、清 narrative，由条件选择器路由到
    修正 Prompt 节点）→ 修正 Prompt 节点 → ``make_validate_output(fn,
    phase="retry", name="validate_retry")``（复核：不通过降级 narrative=null、
    degrade_flags += NARRATIVE_VALIDATION_FAILED）。两阶段路由都由业务条件边
    表达（行内条件选择器语义），本模块不再提供回环路由。

    ``validate_fn(state, narrative)`` 返回差异清单（空 = 通过），由业务把
    sections key 枚举等规则合入（见 aiworkflow.validate.validate_narrative）。
    ``fault="force_bad_numeric_ref"`` 注入：仅首次校验（``phase="first"``）前
    篡改一条 numericRefs，触发校验失败路径（只注入一次）。
    """
    if phase not in ("first", "retry"):
        raise ValueError(f"phase 须为 'first' 或 'retry'，收到 {phase!r}")

    async def validate_gate(state: dict[str, Any]) -> dict[str, Any]:
        narrative = state.get("narrative")
        if narrative is None:  # LLM 已降级，无文案可校验（路由不应到达，兜底直通）
            return {}
        inject_fault = (
            phase == "first"
            and state.get("fault") == "force_bad_numeric_ref"
            and not state.get("fault_injected")
        )
        if inject_fault:
            narrative = copy.deepcopy(narrative)
            refs = narrative.get("numericRefs") or []
            if refs and isinstance(refs[0], dict) and isinstance(refs[0].get("value"), (int, float)):
                narrative["numericRefs"][0]["value"] = refs[0]["value"] + 1.234
            else:
                narrative.setdefault("numericRefs", []).append({"path": "fabricated.path", "value": 1})
        errors = validate_fn(state, narrative)
        fault_injected = state.get("fault_injected", False) or inject_fault
        if not errors:
            return {"validation_errors": [], "fault_injected": fault_injected}
        state["emit"](
            sse.stage(
                name,
                "校验未通过，带差异重新生成（≤1 次）" if phase == "first"
                else "复核仍未通过，降级为确定性结果",
                {"errors": errors},
                node_type="script",
                session_id=state.get("session_id"),
            )
        )
        if phase == "first":
            return {
                "validation_errors": errors,
                "regen_count": state.get("regen_count", 0) + 1,
                "regenerated": True,
                "narrative": None,
                "fault_injected": fault_injected,
            }
        # 复核仍失败 → 降级：narrative=null，确定性区块已在 STAGE 帧下发。
        flags = list(state.get("degrade_flags", []))
        flags.append(DEGRADE_NARRATIVE_VALIDATION_FAILED)
        return {
            "narrative": None,
            "degrade_flags": flags,
            "validation_errors": errors,
            "fault_injected": fault_injected,
        }

    return validate_gate


def route_after_generate(state: dict[str, Any], next_node: str = "validate_output", degraded_node: str = "build_view") -> str:
    """Prompt 生成节点之后：失败→END；LLM 降级→收尾节点；否则进指定校验节点。"""
    if state.get("failed"):
        return "__end__"
    if state.get("narrative") is None:
        return degraded_node  # LLM 降级：仍组装确定性视图后正常收尾
    return next_node
