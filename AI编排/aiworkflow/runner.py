"""FastAPI 服务装配（原 app/main.py 的通用化）。

提供受控解读工作流的标准端点形态：

- ``GET /healthz``：存活探针；
- ``POST /v1/workflows/run``：langgraph 工作流，SSE 流式响应（后台任务执行，
  事件经 asyncio.Queue 转交流生成器；15 秒无事件发 ``heartbeat``）；
- ``POST /v1/followup``：追问轻调用（无状态，不走工作流；handler 由业务提供）。

SSE 流式帧契约见 ``aiworkflow.sse`` 与 docs/platform-contract.md（行内形态：
纯 ``data:`` 帧、returnCode 包裹、type=DATA/DONE，辅以本地扩展帧）；DONE 帧
``sessionId`` 以 runId 填充贯穿一次运行。``input_params`` 为开始节点入参声明
（aiworkflow.params），声明校验失败返回 HTTP 400（returnCode=ERR1001）。
业务 app 的 ``main.py`` 只需调用 ``create_app`` 完成装配。
"""

from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any, Awaitable, Callable, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.responses import StreamingResponse

from aiworkflow import config, params, sse

FollowupHandler = Callable[[dict[str, Any], str, Any], Awaitable[dict[str, Any]]]


def create_app(
    service_name: str,
    version: str,
    graph_factory: Callable[[], Any],
    mock_router: Any = None,
    followup_handler: Optional[FollowupHandler] = None,
    title: Optional[str] = None,
    input_params: Optional[list[dict[str, Any]]] = None,
    end_assembler: Optional[Callable[[dict], dict]] = None,
) -> FastAPI:
    """装配一个工作流服务。

    ``graph_factory`` 返回编译后的 langgraph 图（模块导入时调用一次）；
    ``mock_router`` 为业务侧 mock 上游 API 路由（与工作流端点同端口共存，
    工作流本身不知道自己在被 mock）；``followup_handler(resultPackage,
    question, recentTurns)`` 为追问轻调用实现；``input_params`` 为开始节点
    入参声明清单（对齐行内开始节点契约），非 None 时逐请求校验；
    ``end_assembler`` 为结束节点输出装配（行内结束节点"自定义/可视化"形态，
    通常取 ``nodes.make_end_output(模板)``），缺省用固定的六键输出包。
    """
    app = FastAPI(title=title or service_name, version=version)
    if mock_router is not None:
        app.include_router(mock_router)

    compiled_graph = graph_factory()

    @app.get("/healthz")
    async def healthz() -> JSONResponse:
        return JSONResponse(
            {
                "status": "ok",
                "service": service_name,
                "version": version,
                "faultInjection": config.ALLOW_FAULT_INJECTION,
                # 三档 LLM 解析摘要（不含密钥值）：mid/high 未配置字段落 low，
                # 此处可见各档实际解析到的模型，避免"以为用高档实际落低档"的误判。
                "llmProfiles": config.profiles_summary(),
            }
        )

    @app.post("/v1/workflows/run")
    async def workflows_run(request: Request) -> StreamingResponse:
        """工作流触发：SSE 流式返回，response_mode 固定 streaming。"""
        try:
            body = await request.json()
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={"returnCode": "ERR1001", "errorMsg": "请求体必须为 JSON"},
            )
        inputs: dict[str, Any] = body.get("inputs") or {}
        if input_params is not None:
            error = params.validate_inputs(input_params, inputs)
            if error:
                return JSONResponse(status_code=400, content={"returnCode": "ERR1001", "errorMsg": error})
        page_context = inputs.get("pageContext") or {}
        fault: Optional[str] = inputs.get("fault") if config.ALLOW_FAULT_INJECTION else None
        run_id = uuid.uuid4().hex

        queue: asyncio.Queue[Optional[str]] = asyncio.Queue()

        def emit(text: str) -> None:
            queue.put_nowait(text)

        started_at = time.monotonic()
        state: dict[str, Any] = {
            "inputs": inputs,
            "user": body.get("user"),
            "fault": fault,
            "session_id": run_id,
            "emit": emit,
            "degrade_flags": [],
            "regen_count": 0,
            "regenerated": False,
        }

        async def run_graph() -> None:
            try:
                final = await compiled_graph.ainvoke(state, config={"recursion_limit": config.RECURSION_LIMIT})
            except Exception as exc:  # noqa: BLE001 - 兜底：任何未捕获异常转为可重试失败
                emit(sse.workflow_error("WORKFLOW_ERROR", True, f"{type(exc).__name__}: {exc}", session_id=run_id))
                emit(None)  # 结束哨兵必须是最后一个入队项
                return
            if final.get("failed"):
                emit(None)  # workflow_error 已在节点内推送
                return
            duration_ms = int((time.monotonic() - started_at) * 1000)
            if end_assembler is not None:
                data = end_assembler({**final, "durationMs": duration_ms})
            else:
                data = {
                    "resultPackage": final.get("result_package", {}),
                    "narrative": final.get("narrative"),
                    "view": final.get("view"),
                    "degradeFlags": final.get("degrade_flags", []),
                    "regenerated": bool(final.get("regenerated")),
                    "durationMs": duration_ms,
                }
            emit(sse.done(data, session_id=run_id))
            emit(None)

        task = asyncio.create_task(run_graph())

        async def event_stream():
            emit(sse.start(run_id=run_id, mode=str(inputs.get("mode")) if inputs.get("mode") else "",
                           data_date=page_context.get("dataDate"), version=version))
            try:
                while True:
                    try:
                        item = await asyncio.wait_for(
                            queue.get(), timeout=config.HEARTBEAT_INTERVAL_SECONDS
                        )
                    except asyncio.TimeoutError:
                        yield sse.heartbeat(session_id=run_id)
                        continue
                    if item is None:
                        break  # 哨兵必是最后入队项
                    yield item
            finally:
                if not task.done():
                    task.cancel()

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    @app.post("/v1/followup")
    async def followup_endpoint(request: Request) -> JSONResponse:
        """追问轻调用：无状态，不走工作流。"""
        if followup_handler is None:
            return JSONResponse(
                status_code=404, content={"returnCode": "ERR1004", "errorMsg": "本服务未启用追问轻调用"}
            )
        try:
            body = await request.json()
        except ValueError:
            return JSONResponse(
                status_code=400, content={"returnCode": "ERR1001", "errorMsg": "请求体必须为 JSON"}
            )
        result_package = body.get("resultPackage")
        question = body.get("question")
        if not isinstance(result_package, dict) or not result_package:
            return JSONResponse(
                status_code=400,
                content={"returnCode": "ERR1001", "errorMsg": "resultPackage 必须为非空对象"},
            )
        if not isinstance(question, str) or not question.strip():
            return JSONResponse(
                status_code=400,
                content={"returnCode": "ERR1001", "errorMsg": "question 必须为非空字符串"},
            )
        answer = await followup_handler(result_package, question, body.get("recentTurns"))
        # 会话标识回显（行内 sessionId 语义；本服务无状态、不存储会话）
        session_id = body.get("sessionId")
        if session_id:
            answer = {**answer, "sessionId": session_id}
        return JSONResponse(content=answer)

    return app
