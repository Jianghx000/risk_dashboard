"""工作流工具节点的 HTTP 取数构件（原 app/tools.py 的通用部分）。

保持生产形态：经 httpx 真实发起 HTTP 请求调用上游 API（本地为同形态 mock），
切换真实上游时只改 base URL 与 token。每个请求失败（网络错误、非 2xx、
returnCode 非 SUC0000）时重试 ``retries`` 次，仍失败则返回
``ToolResult(ok=False, error=...)``，由工作流节点决定终止或降级。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import httpx

from aiworkflow import config


@dataclass
class ToolResult:
    """工具节点统一返回：ok=False 时 error 为简短错误描述。"""

    ok: bool
    data: Any = None
    error: Optional[str] = None
    degraded: bool = False


async def get_with_retry(
    path: str,
    params: Optional[dict[str, Any]] = None,
    base_url: Optional[str] = None,
    token: str = "",
    retries: Optional[int] = None,
) -> ToolResult:
    """GET + 重试；同时校验 HTTP 2xx 与 ``returnCode=SUC0000``，任一不满足按失败处理。

    ``base_url``/``token`` 缺省取 ``aiworkflow.config`` 的 ``MOCK_API_BASE_URL``；
    demo token 兜底 ``demo-token``（与 mock API 默认一致）。
    """
    base = base_url or config.MOCK_API_BASE_URL
    headers = {"token": token or "demo-token"}
    attempts = (config.TOOL_RETRY_TIMES if retries is None else retries) + 1
    last_error: Optional[str] = None
    for _ in range(attempts):
        try:
            async with httpx.AsyncClient(
                base_url=base,
                headers=headers,
                timeout=config.TOOL_TIMEOUT_SECONDS,
                trust_env=False,  # 本机服务不走系统 HTTP 代理
            ) as client:
                resp = await client.get(path, params=params or {})
            if resp.status_code != 200:
                last_error = f"HTTP {resp.status_code}"
                continue
            payload = resp.json()
            if payload.get("returnCode") != "SUC0000":
                last_error = f"returnCode={payload.get('returnCode')} errorMsg={payload.get('errorMsg')}"
                continue
            return ToolResult(
                ok=True,
                data=payload.get("body"),
                degraded=bool(payload.get("degraded")),
            )
        except (httpx.HTTPError, ValueError) as exc:  # 网络错误 / JSON 解析失败
            last_error = f"{type(exc).__name__}: {exc}"
    return ToolResult(ok=False, error=last_error)
