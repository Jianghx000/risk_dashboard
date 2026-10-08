"""Local viewer for the simple LangGraph demo."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from .graph import NODE_VIEW, graph


VIEW = Path(__file__).resolve().parent / "view.html"
app = FastAPI(title="Simple LangGraph demo")


class RunInput(BaseModel):
    question: str = Field(default="", max_length=200)


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(VIEW)


@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}


@app.get("/meta")
async def meta() -> dict:
    return {
        "title": "重定价缺口率 · 简单分流演示",
        "nodes": NODE_VIEW,
        "mermaid": graph.get_graph().draw_mermaid(),
    }


@app.post("/run")
async def run(body: RunInput) -> JSONResponse:
    result = await graph.ainvoke({"question": body.question})
    return JSONResponse(result)


@app.post("/stream")
async def stream(body: RunInput) -> StreamingResponse:
    async def events():
        yield _sse("started", {"question": body.question})
        state: dict = {"question": body.question}
        async for update in graph.astream({"question": body.question}, stream_mode="updates"):
            node, payload = next(iter(update.items()))
            state.update(payload)
            yield _sse("node", {"id": node, "state": {key: state.get(key) for key in ("question", "route", "data", "answer", "path")}})
        yield _sse("finished", state)

    return StreamingResponse(events(), media_type="text/event-stream")


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
