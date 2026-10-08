"""指标注册表：按指标名发现 spec，并提供统一的读取入口。

复刻图工具的"多指标"能力全部落在这里。每个指标一个目录，目录里放一份
``blueprint.spec.json``，注册表负责发现、校验、缓存。新增指标只需建目录
放 spec，**不需要改任何渲染代码**。

注册表不负责运行时（LangGraph 图、Mock 数据、接口）——那些仍是各指标自己的事。
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

METRICS_ROOT = Path(__file__).resolve().parent.parent / "metrics"
SPEC_FILENAME = "blueprint.spec.json"
DEFAULT_METRIC = "repricing_gap"


class MetricNotFound(KeyError):
    pass


@dataclass(frozen=True)
class Metric:
    """一个已注册的指标。``key`` 是 URL 与目录名，``workflow`` 是 spec 里的业务标识。"""

    key: str
    spec: dict[str, Any]

    @property
    def display_name(self) -> str:
        return str(self.spec.get("meta", {}).get("displayName") or self.spec.get("meta", {}).get("title") or self.key)

    @property
    def workflow(self) -> str:
        return str(self.spec.get("meta", {}).get("workflow") or self.key)

    @property
    def nodes(self) -> list[dict[str, Any]]:
        return list(self.spec.get("nodes") or [])

    @property
    def edges(self) -> list[dict[str, Any]]:
        return list(self.spec.get("edges") or [])

    @property
    def runtime(self) -> dict[str, Any]:
        return dict(self.spec.get("meta", {}).get("runtime") or {})

    def node(self, node_id: str) -> dict[str, Any]:
        for item in self.nodes:
            if item.get("id") == node_id:
                return item
        raise MetricNotFound(f"{self.key} 没有节点 {node_id}")

    def mapping(self) -> list[dict[str, Any]]:
        return list(self.runtime.get("mapping") or [])


def _validate(spec: dict[str, Any], key: str) -> None:
    meta = spec.get("meta") or {}
    if not meta.get("nodes") and not spec.get("nodes"):
        raise ValueError(f"{key}: spec 缺少 nodes")
    if meta.get("schemaVersion") != 1:
        raise ValueError(f"{key}: spec.meta.schemaVersion 必须为 1")
    ids = [node.get("id") for node in spec.get("nodes") or []]
    if len(ids) != len(set(ids)):
        raise ValueError(f"{key}: spec 里有重复的节点 id")
    if "__end__" not in ids:
        raise ValueError(f"{key}: spec 缺少工作流终点 __end__")
    for node in spec["nodes"]:
        for field in ("id", "name", "inlineType", "summary", "inputs", "outputs", "config", "failureRouting"):
            if field not in node:
                raise ValueError(f"{key}: 节点 {node.get('id')} 缺少 {field}")
        if not node["config"].get("kind"):
            raise ValueError(f"{key}: 节点 {node['id']} 缺少 config.kind")
    for edge in spec.get("edges", []):
        if edge.get("from") not in ids or edge.get("to") not in ids:
            raise ValueError(f"{key}: 连线引用不存在的节点")
    from .constraints import check_graph_is_dag

    problems = check_graph_is_dag(spec)
    if problems:
        raise ValueError(f"{key}: {'; '.join(problems)}")
    producers = {}
    for node in spec["nodes"]:
        for output in node["outputs"]:
            producers.setdefault(output["name"].split(".")[0], set()).add(node["id"])
    parents = {node_id: set() for node_id in ids}
    for edge in spec.get("edges", []):
        parents[edge["to"]].add(edge["from"])
    for node in spec["nodes"]:
        ancestors = set()
        pending = list(parents[node["id"]])
        while pending:
            ancestor = pending.pop()
            if ancestor not in ancestors:
                ancestors.add(ancestor)
                pending.extend(parents[ancestor])
        for variable in node["inputs"]:
            for reference in re.findall(r"\$\{([^}]+)\}", str(variable.get("source", ""))):
                root = reference.split(".")[0]
                if node["inlineType"] == "开始" and root == "systemInput":
                    continue
                if root not in producers:
                    raise ValueError(f"{key}: 节点 {node['id']} 引用未声明的变量 {reference}")
                if not producers[root] & ancestors:
                    raise ValueError(f"{key}: 节点 {node['id']} 引用不可达上游变量 {reference}")


def _discover() -> list[str]:
    if not METRICS_ROOT.is_dir():
        return []
    return sorted(
        path.parent.name
        for path in METRICS_ROOT.glob(f"*/{SPEC_FILENAME}")
        if path.parent.is_dir() and not path.parent.name.startswith((".", "_"))
    )


def available() -> list[str]:
    """已注册的指标 key（目录名），按字典序。"""
    return _discover()


@lru_cache(maxsize=None)
def load(key: str) -> Metric:
    path = METRICS_ROOT / key / SPEC_FILENAME
    if not path.is_file():
        raise MetricNotFound(f"未注册的指标: {key}（已有 {available()}）")
    spec = json.loads(path.read_text(encoding="utf-8"))
    _validate(spec, key)
    return Metric(key=key, spec=spec)


def get(key: str | None = None) -> Metric:
    """按 key 取指标；不给就取默认指标（保持单指标时的既有行为）。"""
    return load(key or DEFAULT_METRIC)


def page_info(key: str | None = None) -> dict[str, str]:
    meta = get(key).spec.get("meta", {})
    return {
        field: str(meta.get(field, ""))
        for field in ("displayName", "sessionNote", "reentryNote", "canvasNote")
    }
