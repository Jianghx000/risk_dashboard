"""Local model configuration; credentials never enter workflow state."""

from __future__ import annotations

import os
from pathlib import Path


DEFAULT_MODEL = "qwen3.8-27b"
DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
LOCAL_ENV_FILE = Path(__file__).resolve().parent.parent / "aliyun_api_key.env"


def load_model_settings() -> dict[str, str]:
    values: dict[str, str] = {}
    if LOCAL_ENV_FILE.exists():
        for line in LOCAL_ENV_FILE.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip('"').strip("'")
            elif line.startswith("qwen"):
                values["MODEL_ID"] = line

    api_key = os.environ.get("ALM_AI_API_KEY") or values.get("API_KEY")
    if not api_key:
        raise ValueError("ALM_AI_API_KEY_MISSING")
    model = os.environ.get("ALM_AI_MODEL") or values.get("MODEL_ID") or DEFAULT_MODEL
    base_url = os.environ.get("ALM_AI_BASE_URL") or values.get("BASE_URL") or DEFAULT_BASE_URL
    return {"api_key": api_key, "model": model, "base_url": base_url}
