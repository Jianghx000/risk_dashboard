"""验收框架（原 tests/acceptance.py 中与业务无关的部分）。

用法约定：业务 app 的 ``tests/acceptance.py`` 组织场景函数，逐项
``require(name, cond, detail)``；任何 FAIL 使 ``finish()`` 返回非 0 退出码，
全部通过退出码为 0——"验收通过即跑通的判定标准"。

工具层提供：行内形态 SSE 流解析（data 帧、type 字段）、工作流触发与帧收集、
数值引用回填核对。本框架会真实调用 LLM 的场景由业务脚本自行控制（场景间留间隔吸收限流）。
"""

from __future__ import annotations

import json
import math
from typing import Any, Optional

import httpx

DEFAULT_TIMEOUT = 300.0


class Acceptance:
    """PASS/FAIL 记录器：逐项记录并实时打印，``finish`` 汇总并给出退出码。"""

    def __init__(self) -> None:
        self.results: list[tuple[str, bool, str]] = []

    def record(self, name: str, ok: bool, detail: str = "") -> None:
        self.results.append((name, ok, detail))
        print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))

    def require(self, name: str, cond: bool, detail: str = "") -> bool:
        self.record(name, cond, detail)
        return cond

    def finish(self) -> int:
        failed = [(n, d) for n, ok, d in self.results if not ok]
        print("\n== 汇总 ==")
        print(f"共 {len(self.results)} 项：PASS {len(self.results) - len(failed)}，FAIL {len(failed)}")
        for name, detail in failed:
            print(f"  FAIL: {name} {detail}")
        return 1 if failed else 0


def new_client(base_url: str, timeout: float = DEFAULT_TIMEOUT) -> httpx.Client:
    """本机服务直连客户端；trust_env=False（系统代理会重置对 127.0.0.1 的连接）。"""
    return httpx.Client(base_url=base_url, timeout=timeout, trust_env=False)


def parse_sse(text: str) -> list[tuple[str, dict[str, Any]]]:
    """把行内形态 SSE 流解析为 ``(frame_type, frame)`` 列表。

    行内帧为纯 ``data:`` 行（无 ``event:`` 行），帧类型取 JSON 内 ``type``
    字段（DATA/DONE + 本地扩展 START/STAGE/ERROR/HEARTBEAT）；``frame`` 为
    完整帧外壳（returnCode/errorMsg/data/sessionId/type）。
    """
    events: list[tuple[str, dict[str, Any]]] = []
    for block in text.split("\n\n"):
        if not block.strip():
            continue
        data_str = ""
        for line in block.splitlines():
            if line.startswith("data:"):
                data_str += line.split(":", 1)[1].strip()
        if not data_str:
            continue
        try:
            frame = json.loads(data_str)
        except json.JSONDecodeError:
            events.append(("_raw", {"_raw": data_str}))
            continue
        events.append((str(frame.get("type", "_unknown")), frame))
    return events


def run_workflow(
    client: httpx.Client,
    inputs: dict[str, Any],
    token: str = "demo-token",
    timeout: float = DEFAULT_TIMEOUT,
) -> list[tuple[str, dict[str, Any]]]:
    """触发 ``POST /v1/workflows/run`` 并返回解析后的 SSE 事件列表。"""
    resp = client.post(
        "/v1/workflows/run",
        json={"inputs": inputs, "user": "9000001", "response_mode": "streaming"},
        headers={"token": token},
        timeout=timeout,
    )
    assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text[:300]}"
    return parse_sse(resp.text)


def collect_by_type(events: list[tuple[str, dict[str, Any]]]) -> dict[str, list[dict[str, Any]]]:
    """按帧 type 分组（保持出现顺序）；值为完整帧外壳。"""
    by_type: dict[str, list[dict[str, Any]]] = {}
    for t, d in events:
        by_type.setdefault(t, []).append(d)
    return by_type


def last_finished(by_type: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """取最后一个 DONE 帧的 data（结束节点输出包）；无则返回空 dict（便于链式 .get）。"""
    if "DONE" in by_type and by_type["DONE"]:
        data = by_type["DONE"][-1].get("data")
        return data if isinstance(data, dict) else {}
    return {}


def last_error(by_type: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """取最后一个 ERROR 帧的 data（errorCode/retryable/message）；无则空 dict。"""
    if "ERROR" in by_type and by_type["ERROR"]:
        data = by_type["ERROR"][-1].get("data")
        return data if isinstance(data, dict) else {}
    return {}


def find_stage_payload(
    by_type: dict[str, list[dict[str, Any]]], node: str
) -> Optional[dict[str, Any]]:
    """找指定节点的第一个 STAGE 帧 payload（如 deterministic_analysis 的 resultPackage）。"""
    for frame in by_type.get("STAGE", []):
        data = frame.get("data") or {}
        if data.get("node") == node and isinstance(data.get("payload"), dict):
            return data["payload"]
    return None


def stage_nodes(by_type: dict[str, list[dict[str, Any]]]) -> list[str]:
    """按出现顺序返回 STAGE 帧的节点名清单。"""
    return [(f.get("data") or {}).get("node") for f in by_type.get("STAGE", [])]


def numeric_refs_resolvable(package: dict[str, Any], refs: Any) -> tuple[bool, str]:
    """核对 numericRefs 每条 {path, value} 可回填到结果包（容差 1e-6）。"""
    if not isinstance(refs, list) or not refs:
        return False, "numericRefs 为空或非数组"
    for ref in refs:
        path = ref.get("path")
        value = ref.get("value")
        node: Any = package
        found = True
        for part in str(path).split("."):
            if isinstance(node, dict) and part in node:
                node = node[part]
            elif isinstance(node, list) and part.isdigit() and int(part) < len(node):
                node = node[int(part)]
            else:
                found = False
                break
        if not found:
            return False, f"path 不可解析: {path}"
        if isinstance(value, (int, float)) and isinstance(node, (int, float)):
            if not math.isclose(float(value), float(node), rel_tol=0.0, abs_tol=1e-6):
                return False, f"值不一致: {path} 声明 {value} 实际 {node}"
        elif value != node:
            return False, f"值不一致: {path} 声明 {value!r} 实际 {node!r}"
    return True, f"{len(refs)} 条引用全部可回填"
