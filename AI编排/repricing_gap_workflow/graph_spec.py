"""Canvas data: compiled LangGraph topology plus the platform replica.

两侧都从 ``blueprint.spec.json`` 派生：平台侧在 spec 顶层，运行期侧在
``meta.runtime``。本模块只做拼装与布局，不再持有任何指标内容。
"""

from __future__ import annotations

import httpx

from almcanvas import registry

from .platform_blueprint import get_blueprint, load_spec
from .workflow import MockNarrator, build_graph

def _runtime(metric: str | None = None) -> dict:
    """从 spec 的 meta.runtime 还原成便于查表的形状。"""
    section = load_spec(metric).get("meta", {}).get("runtime") or {}
    return {
        "RUNTIME_META": {n["id"]: {k: v for k, v in n.items() if k != "id"} for n in section.get("nodes", [])},
        "RUNTIME_ORDER": list(section.get("order", [])),
        "MAPPING": list(section.get("mapping", [])),
        "DIFFERENCES": list(section.get("differences", [])),
        "EXCEPTION_EXITS": list(section.get("exceptionExits", [])),
        "EDGE_LABELS": {(i["from"], i["to"]): i["label"] for i in section.get("edgeLabels", [])},
        "RUNTIME_ENTRY": section.get("entry", ""),
    }


_DEFAULT = _runtime()
RUNTIME_META = _DEFAULT["RUNTIME_META"]
RUNTIME_ORDER = _DEFAULT["RUNTIME_ORDER"]
MAPPING = _DEFAULT["MAPPING"]
DIFFERENCES = _DEFAULT["DIFFERENCES"]
EXCEPTION_EXITS = _DEFAULT["EXCEPTION_EXITS"]
EDGE_LABELS = _DEFAULT["EDGE_LABELS"]
RUNTIME_ENTRY = _DEFAULT["RUNTIME_ENTRY"]


def _dummy_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(200)))


def compiled_graph(metric: str | None = None):
    """编译后的 LangGraph 拓扑。

    注意：运行期图来自**本指标自己的** ``build_graph``，不是从 spec 生成的——
    声明式生成属于阶段 3。这里只按指标 key 选择，暂不改变来源。
    """
    if metric and metric != registry.DEFAULT_METRIC:
        raise ValueError("RUNTIME_GRAPH_NOT_REGISTERED")
    return build_graph(_dummy_client(), MockNarrator()).get_graph()


def compiled_snapshot(metric: str | None = None) -> dict:
    graph = compiled_graph(metric)
    nodes = [str(node_id) for node_id in graph.nodes]
    edges = [
        {
            "source": edge.source,
            "target": edge.target,
            "conditional": bool(edge.conditional),
            "route": None if edge.data is None else str(edge.data),
        }
        for edge in graph.edges
    ]
    return {"nodes": nodes, "edges": edges, "mermaid": graph.draw_mermaid()}


def _layout_dag(
    main_ids: list[str],
    branch_ids: list[str],
    *,
    fork_after: str,
    origin_x: int = 24,
    origin_y: int = 28,
    node_w: int = 148,
    node_h: int = 70,
    col_gap: int = 28,
    row_gap: int = 118,
) -> dict:
    """Main path left-to-right; retry branch on a second row joining at the end."""
    step = node_w + col_gap
    positions = {}
    for index, node_id in enumerate(main_ids):
        positions[node_id] = {
            "x": origin_x + index * step,
            "y": origin_y,
            "width": node_w,
            "height": node_h,
            "lane": "main",
        }
    fork_index = main_ids.index(fork_after)
    branch_y = origin_y + node_h + row_gap
    branch_x = origin_x + (fork_index + 1) * step
    for index, node_id in enumerate(branch_ids):
        positions[node_id] = {
            "x": branch_x + index * step,
            "y": branch_y,
            "width": node_w,
            "height": node_h,
            "lane": "retry",
        }
    max_x = max(box["x"] + box["width"] for box in positions.values())
    max_y = max(box["y"] + box["height"] for box in positions.values())
    followup_y = max_y + 52
    return {
        "positions": positions,
        "width": max_x + 36,
        "height": followup_y + 28,
        "followupY": followup_y,
    }


def runtime_display(metric: str | None = None) -> dict:
    rt = _runtime(metric)
    snapshot = compiled_snapshot(metric)
    main_ids = [node_id for node_id in rt["RUNTIME_ORDER"] if node_id not in {"regenerate_narrative", "validate_retry"}]
    layout = _layout_dag(main_ids, ["regenerate_narrative", "validate_retry"], fork_after="validate_output")
    nodes = []
    for node_id in snapshot["nodes"]:
        meta = rt["RUNTIME_META"][node_id]
        box = layout["positions"][node_id]
        nodes.append({"id": node_id, "inCompiledGraph": True, **meta, **box})
    edges = []
    for edge in snapshot["edges"]:
        key = (edge["source"], edge["target"])
        edges.append(
            {
                **edge,
                "label": rt["EDGE_LABELS"].get(key, ""),
                "kind": "retry" if key == ("validate_output", "regenerate_narrative") else ("finish" if edge["conditional"] else "flow"),
            }
        )
    annotations = []
    for item in rt["EXCEPTION_EXITS"]:
        box = layout["positions"][item["node"]]
        annotations.append(
            {
                **item,
                "x": box["x"] + box["width"] + 18,
                "y": box["y"] + 8,
                "compiled": False,
            }
        )
    return {
        "title": "实际执行图",
        "subtitle": "主路径从左到右。校验未过走到下一行修正链，再汇入结束。无回边，也没有按模式分出的 API 边。",
        "width": layout["width"],
        "height": layout["height"],
        "nodes": nodes,
        "compiledEdges": edges,
        "sessionReentry": {
            "source": "__end__",
            "target": "__start__",
            "label": "追问再触发（同一张图，不是回边）",
            "y": layout["followupY"],
            "compiled": False,
        },
        "annotations": annotations,
        "mermaid": snapshot["mermaid"],
    }


def _retry_lane(blueprint: dict, metric: str | None = None) -> tuple[list[str], list[str], str]:
    """从 spec 派生「主路径行 / 修正链行 / 分叉点」，不写死节点名。

    分叉点是唯一带"未过"条件出边的节点；修正链是它在 ``meta.layout.rows`` 里
    所在行的**之后**各行。这样换指标时不需要改这里。
    """
    spec = load_spec(metric)
    rows = ((spec.get("meta") or {}).get("layout") or {}).get("rows") or []
    node_ids = [node["id"] for node in blueprint["nodes"]]
    # 布局声明用 spec 的 id（__end__），蓝图适配层已改名为 end
    to_legacy = {"__end__": "end"}
    gate = next(
        (edge[0] for edge in blueprint.get("edges") or []
         if len(edge) > 2 and isinstance(edge[2], str) and "未过" in edge[2]),
        None,
    )
    if not rows or gate is None:
        # 没有布局声明时退化为"无修正链"，全部画成主路径
        return node_ids, [], node_ids[0] if node_ids else ""
    legacy_rows = [[to_legacy.get(nid, nid) for nid in row] for row in rows]
    flat = {nid for row in legacy_rows for nid in row}
    # rows 里没提到的节点（例如渲染器会自动追加的终点）回到主路径末尾，
    # 否则布局会缺位置。
    ordered = [nid for nid in node_ids if nid in flat] + [nid for nid in node_ids if nid not in flat]
    gate_row = next((i for i, row in enumerate(legacy_rows) if gate in row), 0)
    retry = [nid for row in legacy_rows[gate_row + 1:] for nid in row if nid in ordered]
    return [nid for nid in ordered if nid not in retry], retry, gate


def platform_display(metric: str | None = None) -> dict:
    blueprint = get_blueprint(metric)
    main_ids, retry_ids, fork_after = _retry_lane(blueprint, metric)
    layout = _layout_dag(main_ids, retry_ids, fork_after=fork_after)
    mapping = _runtime(metric)["MAPPING"]
    nodes = []
    for node in blueprint["nodes"]:
        box = layout["positions"][node["id"]]
        mapped = next(item for item in mapping if item["platformId"] == node["id"])
        nodes.append(
            {
                "id": node["id"],
                "label": node["title"],
                "role": node["type"],
                "purpose": node["purpose"],
                "runtimeIds": mapped["runtimeIds"],
                "readiness": node["readiness"],
                **box,
            }
        )
    edges = []
    for item in blueprint.get("edges") or []:
        source, target = item[0], item[1]
        label = item[2] if len(item) > 2 else ""
        edges.append(
            {
                "source": source,
                "target": target,
                "conditional": bool(label),
                "route": label or None,
                "label": label,
                "kind": "retry" if "未过" in label else ("finish" if "降级" in label else "flow"),
            }
        )
    return {
        "title": "行内复刻图",
        "subtitle": "行内节点从左到右。橙色虚线是校验修正；绿色虚线是追问：结束后再从开始触发同一编排。",
        "pageInfo": blueprint.get("pageInfo") or {},
        "width": layout["width"],
        "height": layout["height"],
        "nodes": nodes,
        "edges": edges,
        "sessionReentry": {
            "source": "end",
            "target": "start",
            "label": "追问再触发（同一编排，不是回边）",
            "y": layout["followupY"],
            "compiled": False,
        },
        "blueprint": blueprint,
        "openItems": blueprint["openItems"],
    }


def get_canvas_spec(metric: str | None = None) -> dict:
    if metric and metric != registry.DEFAULT_METRIC:
        from almcanvas.presentation import canvas_spec

        return canvas_spec(metric)
    runtime = runtime_display(metric)
    platform = platform_display(metric)
    rt = _runtime(metric)
    return {
        "metric": metric or registry.DEFAULT_METRIC,
        "dataNotice": "全部为虚构 ALM 数据，不能当作正式指标或正式归因。",
        "runtime": runtime,
        "platform": platform,
        "mapping": rt["MAPPING"],
        "differences": rt["DIFFERENCES"],
        "compiled": {"nodes": [node["id"] for node in runtime["nodes"]], "edges": runtime["compiledEdges"]},
    }
