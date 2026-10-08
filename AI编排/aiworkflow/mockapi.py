"""行内形态 mock 上游 API 构件（原 app/mock_api.py 的通用部分）。

对齐真实行内 API 形态的四要素，业务端点按此顺序组装：

1. 认证：header ``token`` 须等于配置值，否则 401（``{returnCode:"ERR4010",...}``）；
2. 故障注入：query ``__fault=down`` → 503（受 ``ALLOW_FAULT_INJECTION`` 开关控制）；
3. 数据读取：每次请求读盘、不缓存，改数据即时生效；
4. 统一包裹：``{returnCode:"SUC0000", errorMsg:null, body:...}``。

切换真实上游时只改 base URL 与 token（``MOCK_API_BASE_URL`` / ``MOCK_API_TOKEN``），
前提是真实 API 与 mock 同形态。
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from fastapi.responses import JSONResponse

from aiworkflow import config

RETURN_OK = {"returnCode": "SUC0000", "errorMsg": None}
RETURN_UNAUTHORIZED = {"returnCode": "ERR4010", "errorMsg": "token 无效"}
RETURN_FAULT = {"returnCode": "ERR9999", "errorMsg": "模拟服务不可用"}


def check_token(token: Optional[str], expected: str) -> Optional[JSONResponse]:
    """token 不匹配时返回 401 响应，匹配返回 None。"""
    if token != expected:
        return JSONResponse(status_code=401, content=dict(RETURN_UNAUTHORIZED))
    return None


def maybe_fault(fault: Optional[str]) -> Optional[JSONResponse]:
    """``__fault=down`` 命中且开关允许时返回 503 模拟服务不可用。"""
    if fault == "down" and config.ALLOW_FAULT_INJECTION:
        return JSONResponse(status_code=503, content=dict(RETURN_FAULT))
    return None


def ok_body(body: Any, degraded: Optional[bool] = None) -> dict[str, Any]:
    """统一成功包裹；degraded 仅在 True 时附带（标记降级来源，便于验收与排查）。"""
    content = dict(RETURN_OK)
    content["body"] = body
    if degraded:
        content["degraded"] = True
    return content


def load_json(data_dir: Path, filename: str) -> Any:
    """读份数据文件（每次请求读盘，改动即时生效）。"""
    path = data_dir / filename
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def unwrap_body(payload: Any) -> list[Any]:
    """数据文件顶层兼容 ``{body: [...]}`` 包裹与裸数组两种形态。"""
    if isinstance(payload, dict):
        return payload.get("body", [])
    return payload if isinstance(payload, list) else []


def parse_ids(raw: Optional[str]) -> Optional[list[int]]:
    """逗号分隔的 id 列表；缺省返回 None 表示不过滤（全部）。"""
    if raw is None or str(raw).strip() == "":
        return None
    ids: list[int] = []
    for part in str(raw).split(","):
        part = part.strip()
        if part:
            ids.append(int(part))
    return ids or None
