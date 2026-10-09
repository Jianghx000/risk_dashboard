"""Runnable workflow API and synthetic ALM tool APIs."""

from __future__ import annotations

import json
import os
import time
import uuid
from pathlib import Path
from typing import Any, Callable

import httpx
from fastapi import FastAPI, Header, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from aiworkflow import sse as bank_sse
from aiworkflow.nodes import make_end_output
from almcanvas import registry

from . import analysis
from .graph_spec import RUNTIME_META, get_canvas_spec
from .platform_blueprint import get_blueprint
from .settings import load_model_settings
from .workflow import MODE_OPTIONS, ChatNarrator, MockNarrator, build_graph

# 行内节点类型 → STAGE 帧的 nodeType 取值（与 aiworkflow.nodes 的 NODE_TYPE_* 一一对应）。
_ROLE_TO_NODE_TYPE = {
    "脚本": "script",
    "API": "api",
    "Prompt": "prompt",
    "条件选择器": "condition",
    "中间信息输出": "message",
    "循环组件": "loop",
    "业务编排": "subflow",
    "MCP": "mcp",
}

# 节点标签与类型从 graph_spec.RUNTIME_META 派生，不再维护第二份映射
# （此前 server.NODE_LABELS 与 RUNTIME_META 内容重复、会漂移）。
NODE_LABELS = {
    node_id: meta["label"]
    for node_id, meta in RUNTIME_META.items()
    if node_id not in {"__start__", "__end__"}
}
NODE_TYPES = {
    node_id: _ROLE_TO_NODE_TYPE[meta["role"]]
    for node_id, meta in RUNTIME_META.items()
    if meta["role"] in _ROLE_TO_NODE_TYPE
}


app = FastAPI(title="Repricing gap AI workflow pilot")
WORKFLOW_VIEW = Path(__file__).resolve().parent / "workflow_view.html"
PLATFORM_MANUAL = Path(__file__).resolve().parent.parent / "行内AI工作流平台.docx"
SESSIONS: dict[str, dict] = {}
SESSION_TTL_SECONDS = 3600


def _authorized(user_id: str | None, token: str | None, scope: dict) -> bool:
    return (
        token == "demo-token"
        and user_id == "demo-analyst"
        and scope.get("orgCode") == analysis.ORG_CODE
        and scope.get("currencyCode") in analysis.CURRENCIES
    )


def _tool_response(body: dict, user_id: str | None, token: str | None, scope: dict) -> JSONResponse:
    if not _authorized(user_id, token, scope):
        return JSONResponse({"returnCode": "ERR_AUTH", "errorCode": "FORBIDDEN", "body": None}, status_code=403)
    package = dict(body)
    package.setdefault("status", "available")
    package.setdefault("actualDataDate", scope.get("asOfDate", analysis.CURRENT_DATE))
    package.setdefault("caliberVersion", "SYNTHETIC-ALM-CALIBER-v1")
    return JSONResponse({"returnCode": "SUC0000", "errorMsg": None, "body": package})


async def _tool_request(request: Request) -> tuple[dict, dict]:
    payload = await request.json()
    if payload.get("scope"):
        return payload, payload["scope"]
    # 只收真实存在的键：若把缺失的键填成 None，下游 scope.get(k, 默认值)
    # 会拿到 None 而不是默认值——静默用错口径比缺字段更难查。
    scope = {
        key: payload.get(key)
        for key in (
            "metricCode", "orgCode", "currencyCode", "tenorCode", "asOfDate",
            "frequency", "caliber", "focusCurrencyCode",
        )
        if payload.get(key) is not None
    }
    if "currencies" in payload:
        currencies = payload["currencies"]
        values = currencies.get("values") if isinstance(currencies, dict) else currencies
        if (not isinstance(values, list) or not 1 <= len(values) <= 2 or
                any(not isinstance(c, str) or c not in analysis.CURRENCIES for c in values) or
                len(set(values)) != len(values)):
            raise ValueError("INVALID_QUERY_CURRENCIES")
        scope["currencyCode"] = values[0]
    scope.setdefault("metricCode", analysis.METRIC_CODE)
    return payload, scope


@app.post("/mock/analysis/{mode}")
async def mock_analysis(
    mode: str,
    request: Request,
    x_demo_user: str | None = Header(default=None),
    x_service_token: str | None = Header(default=None),
) -> JSONResponse:
    try:
        payload, scope = await _tool_request(request)
        if not _authorized(x_demo_user, x_service_token, scope):
            return JSONResponse({"returnCode": "ERR_AUTH", "errorCode": "FORBIDDEN", "body": None}, status_code=403)
        date = scope.get("asOfDate", analysis.CURRENT_DATE)
        base_date = payload.get("baseDate")
        currency = scope.get("currencyCode", analysis.CURRENCY_CODE)
        focus = payload.get("focusCurrencyCode", currency)
        frequency = scope.get("frequency", "MONTH")
        caliber = scope.get("caliber", analysis.DEFAULT_CALIBER)
        if mode == "query":
            mode = payload.get("analysisMode", "")
        needs = payload.get("dataNeeds", [mode])
        allowed = {"overview", "limit", "trend", "calculation", "attribution", "business", "methodology", "currencyCompare", "clarification"}
        if (not isinstance(needs, list) or not 1 <= len(needs) <= 4 or
                any(not isinstance(n, str) or n not in allowed for n in needs) or
                len(set(needs)) != len(needs) or mode not in needs or
                ("clarification" in needs and len(needs) > 1)):
            raise ValueError("INVALID_DATA_NEEDS")
        if scope.get("metricCode") != analysis.METRIC_CODE or scope.get("tenorCode") != analysis.TENOR_CODE:
            raise ValueError("UNSUPPORTED_SCOPE")
        base_date = analysis.validate_query_dates(date, base_date, frequency)
        result_scope = {
            # 报**关注币种**：结果包/澄清包描述的都是"本轮解析出的上下文"，
            # validate_package 也按 focusCurrencyCode 核对。（比较模式下
            # focus 已被 resolve_context 置为页面币种，两者一致。）
            "metricCode": analysis.METRIC_CODE, "orgCode": analysis.ORG_CODE,
            "currencyCode": focus, "tenorCode": analysis.TENOR_CODE, "asOfDate": date,
            "frequency": frequency, "caliber": caliber,
        }
        if caliber not in analysis.SUPPORTED_CALIBERS:
            # 只有正式支持的口径可给出计算过程与归因；非默认口径明确返回不可用，
            # **不套用默认口径的结果**（能力速查.md:95）。这里返回显式状态而不是
            # 抛错——抛错会被调用方当成 502 上游故障，那是误导。
            data = {
                "scope": result_scope,
                "status": "unsupported",
                "reason": "UNSUPPORTED_CALIBER",
                "supportedCalibers": list(analysis.SUPPORTED_CALIBERS),
                "dataVersion": analysis.DATA_VERSION,
            }
        elif mode == "clarification":
            if payload.get("clarifyReason") == "intent":
                # 没识别出问题类型：返回"你没听懂 + 你可以问什么"，而不是猜一个模式答。
                data = {
                    "status": "needs_input",
                    "scope": result_scope,
                    "clarifyReason": "intent",
                    "modeOptions": [{"code": code, "label": label} for code, label in MODE_OPTIONS],
                    "dataVersion": analysis.DATA_VERSION,
                }
            else:
                data = {
                    "status": "needs_input",
                    "scope": result_scope,
                    "clarifyReason": "currency",
                    "currencyOptions": list(analysis.CURRENCIES),
                    "dataVersion": analysis.DATA_VERSION,
                }
        elif len(needs) > 1:
            currencies = payload.get("currencies") or [focus]
            if isinstance(currencies, dict):
                currencies = currencies.get("values") or []
            data = analysis.multi_package(mode, needs, date, base_date, currencies, frequency,
                business_type=payload.get("businessType") or "自营贷款", node_code=payload.get("nodeCode") or "ROOT")
        elif mode == "currencyCompare":
            # 一次返回有界的币种摘要，不逐币种循环调 API（能力速查.md:55）。
            selected = payload.get("currencies") or payload.get("comparedCurrencies") or []
            if isinstance(selected, dict):
                selected = selected.get("values") or []
            if len(selected) != 2 or any(c not in analysis.CURRENCIES for c in selected) or len(set(selected)) != 2:
                raise ValueError("TWO_CURRENCIES_REQUIRED")
            data = {
                "scope": result_scope,
                "comparedCurrencies": selected,
                "currencySummary": [row for row in analysis.currency_summary(date) if row["currencyCode"] in selected],
                "dataVersion": analysis.DATA_VERSION,
            }
        elif mode in {"overview", "limit", "trend", "calculation", "attribution", "business", "methodology"}:
            data = analysis.query_package(mode, date, base_date, focus, frequency,
                business_type=payload.get("businessType") or "自营贷款", node_code=payload.get("nodeCode") or "ROOT")
        else:
            return JSONResponse({"returnCode": "ERR_MODE", "errorCode": "UNKNOWN_MODE", "body": None}, status_code=400)
    except (KeyError, ValueError) as exc:
        return JSONResponse({"returnCode": "ERR_INPUT", "errorCode": str(exc), "body": None}, status_code=400)
    data["analysisMode"] = mode
    data["dataNeeds"] = needs
    return _tool_response(data, x_demo_user, x_service_token, scope)


class InvalidAnswerNarrator(MockNarrator):
    def generate(self, mode, data, question, errors):
        return {
            "headline": "错误数字999",
            "sections": [{"text": "请关注限额", "citations": ["status"]}],
            "numericRefs": [],
        }


class FailingNarrator(MockNarrator):
    def generate(self, mode, data, question, errors):
        raise RuntimeError("synthetic model outage")


def _is_live() -> bool:
    """未设置时走真实模型。只有显式 ALM_AI_MODE=mock 才用本地模板。"""
    return os.environ.get("ALM_AI_MODE", "live").strip().lower() != "mock"


def _narrator(demo_fault: str | None = None):
    if demo_fault == "invalid_answer":
        return InvalidAnswerNarrator()
    if demo_fault == "model_failure":
        return FailingNarrator()
    if _is_live():
        return ChatNarrator(load_model_settings())
    return MockNarrator()


def _build(demo_fault: str | None, client: httpx.AsyncClient):
    """live 模式关闭模板兜底——用户看到的必须是真实模型输出或明确的空。"""
    return build_graph(
        client,
        _narrator(demo_fault),
        fail_fetch=demo_fault == "api_failure",
        allow_template_fallback=not _is_live(),
    )


def _demo_fault(payload: dict) -> str | None:
    inputs = payload.get("inputs") or payload
    fault = inputs.get("demoFault")
    return fault if fault in {"invalid_answer", "model_failure", "api_failure"} else None


def _initial_state(
    payload: dict,
    user: str,
    session_id: str | None = None,
    emit: Callable[[str], None] | None = None,
) -> dict:
    """构造 LangGraph 初始 state。

    键名对齐 ``aiworkflow.graph_kit`` 第 19-21 行的公共 state 契约
    （``inputs``/``user``/``emit``/``degrade_flags``/``regen_count``/
    ``regenerated``/``llm_failed``/``validation_errors``/``narrative``）。
    ``emit`` 是 SSE 帧回调：``run`` 端点传空实现，流式端点传入帧收集器。
    """
    inputs = dict(payload.get("inputs") or payload)
    followup = False
    if session_id:
        session = SESSIONS.get(session_id)
        if not session or session["userId"] != user or session["expiresAt"] <= time.time():
            raise ValueError("INVALID_SESSION")
        # Match the bank system variable; parsing lives in the visible context script.
        inputs["chatHistory"] = list(session.get("chatHistory") or [])
        followup = True
    elif "chatHistory" in payload:
        inputs["chatHistory"] = payload["chatHistory"]
    return {
        "inputs": inputs,
        "user": user,
        "followup": followup,
        "emit": emit if emit is not None else (lambda _frame: None),
        "degrade_flags": [],
        "regen_count": 0,
        "regenerated": False,
        "llm_failed": False,
    }


# 行内结束节点"自定义"输出形态：JSON 模板 + ${state 键} 引用。
# 输出键用行内口径（camelCase），state 键用共享包方言（snake_case），
# 两者由 make_end_output 装配，避免手写映射漂移。
END_OUTPUT_TEMPLATE: dict[str, str] = {
    "analysisMode": "${mode}",
    "resolvedContext": "${resolved_context}",
    "resultPackage": "${result_package}",
    "narrative": "${narrative}",
    "validationErrors": "${validation_errors}",
    "degradeFlags": "${degrade_flags}",
    "regenerated": "${regenerated}",
}
_end_output = make_end_output(END_OUTPUT_TEMPLATE)


def _final(state: dict, session_id: str | None = None) -> dict:
    request = state.get("inputs") or {}
    result_package = state.get("result_package") or {}
    assembled = _end_output(
        {
            **state,
            "mode": state.get("mode"),
            "resolved_context": state.get("resolved_context") or {},
            "result_package": result_package,
            "narrative": state.get("narrative"),
            "validation_errors": state.get("validation_errors") or [],
            "degrade_flags": state.get("degrade_flags") or [],
            "regenerated": bool(state.get("regenerated")),
        }
    )
    assembled.update(state.get("platform_output") or {})
    assembled["degradeFlags"] = list(dict.fromkeys([*assembled.get("degradeFlags", []), *state.get("degrade_flags", [])]))
    return {
        **assembled,
        "sessionId": session_id,
        "modelMode": "live" if _is_live() else "mock",
        "followup": bool(state.get("followup")),
        "lastBusinessType": (state.get("conversation_state") or {}).get("businessType") or result_package.get("businessType"),
        "question": request.get("question") or "",
    }


def _save_session(state: dict, user_id: str, session_id: str | None) -> str:
    """Emulate bank chatHistory with start input and final output, not node traces."""
    previous = SESSIONS.get(session_id, {}) if session_id else {}
    history = list(previous.get("chatHistory") or [])
    history.append({
        "inputMessage": json.dumps((state.get("platform_variables") or {}).get("systemInput") or {}, ensure_ascii=False),
        "outputMessage": json.dumps(state.get("platform_output") or {}, ensure_ascii=False),
    })
    session_id = session_id or uuid.uuid4().hex
    SESSIONS[session_id] = {
        "userId": user_id,
        "chatHistory": history[-20:],
        "expiresAt": time.time() + SESSION_TTL_SECONDS,
    }
    return session_id


def _error(exc: Exception) -> JSONResponse:
    if isinstance(exc, httpx.HTTPStatusError):
        if exc.response.status_code == 400:
            try:
                code = exc.response.json().get("errorCode") or "INVALID_QUERY"
            except ValueError:
                code = "INVALID_QUERY"
            status = 400
        else:
            code = "UPSTREAM_FORBIDDEN" if exc.response.status_code == 403 else "UPSTREAM_UNAVAILABLE"
            status = 403 if exc.response.status_code == 403 else 502
    elif isinstance(exc, ValueError):
        code, status = str(exc), 400
    else:
        code, status = "WORKFLOW_ERROR", 500
    return JSONResponse({"errorCode": code, "retryable": status >= 500}, status_code=status)


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok", "mode": "synthetic", "modelMode": "live" if _is_live() else "mock"}


@app.get("/workflow", include_in_schema=False)
async def workflow_view() -> FileResponse:
    return FileResponse(WORKFLOW_VIEW, media_type="text/html; charset=utf-8")


@app.get("/v1/platform-blueprint")
async def platform_blueprint() -> dict:
    return get_blueprint()


@app.get("/v1/canvas-spec")
async def canvas_spec() -> dict:
    return get_canvas_spec()


# ---------------------------------------------------------------- 指标注册表
#
# 复刻图工具的多指标入口。渲染逻辑按指标 key 从 spec 读取，新增指标只需在
# AI编排/metrics/ 下建目录放 blueprint.spec.json，不必改这里。


@app.get("/m/metrics", include_in_schema=False)
async def list_metrics() -> JSONResponse:
    items = [{"key": key, "displayName": registry.get(key).display_name} for key in registry.available()]
    return JSONResponse({"default": registry.DEFAULT_METRIC, "metrics": items})


@app.get("/m/{metric}/workflow", include_in_schema=False)
async def metric_workflow_view(metric: str) -> FileResponse:
    """按指标渲染复刻图页面。未知指标返回 404 而不是 500。"""
    if metric not in registry.available():
        return JSONResponse({"errorCode": "UNKNOWN_METRIC", "available": registry.available()}, status_code=404)
    return FileResponse(WORKFLOW_VIEW, media_type="text/html; charset=utf-8")


@app.get("/m/{metric}/v1/canvas-spec")
async def metric_canvas_spec(metric: str) -> JSONResponse:
    if metric not in registry.available():
        return JSONResponse({"errorCode": "UNKNOWN_METRIC", "available": registry.available()}, status_code=404)
    return JSONResponse(get_canvas_spec(metric))


@app.get("/platform-manual", include_in_schema=False)
async def platform_manual() -> FileResponse:
    return FileResponse(PLATFORM_MANUAL, filename="行内AI工作流平台.docx")


@app.post("/v1/workflows/run")
async def run_workflow(request: Request, x_demo_user: str = Header(default="demo-analyst")):
    try:
        payload = await request.json()
        demo_fault = _demo_fault(payload)
        initial = _initial_state(payload, x_demo_user, payload.get("sessionId"))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://mock-alm.local") as client:
            graph = _build(demo_fault, client)
            state = await graph.ainvoke(initial)
        session_id = _save_session(state, x_demo_user, payload.get("sessionId"))
        return JSONResponse(_final(state, session_id))
    except Exception as exc:
        return _error(exc)


@app.post("/v1/workflows/stream")
async def stream_workflow(request: Request, x_demo_user: str = Header(default="demo-analyst")):
    try:
        payload = await request.json()
    except Exception as exc:
        return _error(exc)

    async def events():
        demo_fault = _demo_fault(payload)
        run_id = uuid.uuid4().hex
        # 节点内部经 emit 推送的帧在这里收集；每个节点更新后按序下发。
        emitted: list[str] = []
        try:
            initial = _initial_state(payload, x_demo_user, payload.get("sessionId"), emit=emitted.append)
        except Exception as exc:
            response = _error(exc)
            failed = json.loads(response.body)
            yield bank_sse.format_frame(
                bank_sse.TYPE_ERROR,
                failed,
                session_id=run_id,
                return_code=bank_sse.RETURN_ERROR,
                error_msg=failed.get("errorCode"),
            )
            return

        yield bank_sse.format_frame(
            bank_sse.TYPE_START,
            {
                "runId": run_id,
                "mode": "repricing_gap",
                "version": "absorbed-aiworkflow",
                "dataDate": analysis.CURRENT_DATE,
                "followup": bool(initial.get("followup")),
                "lastBusinessType": (initial.get("inputs") or {}).get("lastBusinessType"),
                "question": (initial.get("inputs") or {}).get("question") or "",
                "path": ["__start__"],
            },
            session_id=run_id,
        )
        state = dict(initial)
        path = ["__start__"]
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://mock-alm.local") as client:
                graph = _build(demo_fault, client)
                async for update in graph.astream(initial, stream_mode="updates"):
                    for node, values in update.items():
                        state.update(values)
                        path.append(node)
                        # 先下发节点内部 emit 的帧，再下发本节点的 STAGE 帧。
                        while emitted:
                            yield emitted.pop(0)
                        stage = {
                            "node": node,
                            "path": list(path),
                            "analysisMode": state.get("mode"),
                            "regenCount": state.get("regen_count", 0),
                            "regenerated": bool(state.get("regenerated")),
                            "validationErrors": state.get("validation_errors", []),
                            "degradeFlags": state.get("degrade_flags", []),
                            "retrying": node == "regenerate_narrative",
                            "followup": bool(state.get("followup")),
                            "lastBusinessType": (state.get("inputs") or {}).get("lastBusinessType"),
                            "question": (state.get("inputs") or {}).get("question") or "",
                        }
                        if node == "fetch_alm_data":
                            stage["resultPackage"] = state["result_package"]
                        if node in {"generate_narrative", "regenerate_narrative"}:
                            stage["narrative"] = state.get("narrative")
                        yield bank_sse.stage(
                            node,
                            NODE_LABELS.get(node, node),
                            payload=stage,
                            node_type=NODE_TYPES.get(node),
                            session_id=run_id,
                        )
            path.append("__end__")
            session_id = _save_session(state, x_demo_user, payload.get("sessionId"))
            finished = _final(state, session_id)
            finished["path"] = path
            yield bank_sse.done(finished, session_id=session_id)
        except Exception as exc:
            response = _error(exc)
            failed = json.loads(response.body)
            last = path[-1] if path else "__start__"
            failed["failedNode"] = getattr(exc, "bank_runtime_node", last)
            failed["path"] = path
            yield bank_sse.format_frame(
                bank_sse.TYPE_ERROR,
                failed,
                session_id=run_id,
                return_code=bank_sse.RETURN_ERROR,
                error_msg=failed.get("errorCode"),
            )

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})
