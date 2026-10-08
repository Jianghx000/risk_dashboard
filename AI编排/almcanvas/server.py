"""Read-only platform replica viewer; no model or business workflow dependency."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from . import registry
from .presentation import canvas_spec

ROOT = Path(__file__).resolve().parent.parent
app = FastAPI(title="行内工作流复刻图")


@app.get("/healthz")
def health():
    return {"status": "ok", "service": "almcanvas"}


@app.get("/m/metrics")
def metrics():
    return {"default": registry.DEFAULT_METRIC, "metrics": [
        {"key": key, "displayName": registry.get(key).display_name} for key in registry.available()
    ]}


@app.get("/workflow")
@app.get("/m/{metric}/workflow")
def view(metric: str | None = None):
    if metric and metric not in registry.available():
        raise HTTPException(404, "UNKNOWN_WORKFLOW")
    return FileResponse(ROOT / "repricing_gap_workflow" / "workflow_view.html")


@app.get("/v1/canvas-spec")
@app.get("/m/{metric}/v1/canvas-spec")
def spec(metric: str | None = None):
    if metric and metric not in registry.available():
        raise HTTPException(404, "UNKNOWN_WORKFLOW")
    return canvas_spec(metric)


@app.get("/platform-manual")
def manual():
    return FileResponse(ROOT / "行内AI工作流平台.docx")
