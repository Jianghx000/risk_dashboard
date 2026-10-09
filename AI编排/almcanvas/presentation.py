"""Render platform specs without importing a business graph or model runtime."""

from . import registry


def canvas_spec(key=None):
    metric = registry.get(key)
    spec = metric.spec
    alias = lambda node_id: "end" if node_id == "__end__" else node_id
    nodes_by_id = {node["id"]: node for node in spec["nodes"]}
    edges = spec.get("edges", [])
    rows = spec["meta"].get("layout", {}).get("rows")
    if rows:
        rows = [list(row) for row in rows]
        declared = [node_id for row in rows for node_id in row]
        if len(declared) != len(set(declared)) or set(declared) - set(nodes_by_id):
            raise ValueError("INVALID_LAYOUT_NODES")
        missing = [node_id for node_id in nodes_by_id if node_id not in declared]
        if missing:
            rows.append(missing)
    else:
        remaining = set(nodes_by_id)
        rows = []
        while remaining:
            ready = [node_id for node_id in nodes_by_id if node_id in remaining and not any(
                edge["to"] == node_id and edge["from"] in remaining for edge in edges
            )]
            if not ready:
                raise ValueError("CYCLIC_LAYOUT")
            rows.append(ready)
            remaining.difference_update(ready)
        # A topology layer is a column; concurrent nodes occupy separate rows.
        positions = {node_id: {"x": 24 + col * 176, "y": 28 + row * 188}
                     for col, layer in enumerate(rows) for row, node_id in enumerate(layer)}
    if spec["meta"].get("layout", {}).get("rows"):
        positions = {node_id: {"x": 24 + col * 176, "y": 28 + row * 188}
                     for row, layer in enumerate(rows) for col, node_id in enumerate(layer)}
    mapping_by_id = {item["platformId"]: item for item in metric.mapping()}
    mapping = []
    blueprint_nodes = []
    display_nodes = []
    for node in spec["nodes"]:
        node_id = alias(node["id"])
        mapped = mapping_by_id.get(node_id) or mapping_by_id.get(node["id"]) or {
            "platformId": node_id, "runtimeIds": [], "relation": "未提供本地执行映射",
        }
        mapping.append({**mapped, "platformId": node_id})
        config = node["config"]
        blueprint_nodes.append({
            **node, "id": node_id, "title": node["name"], "type": node["inlineType"],
            "purpose": node["summary"], "configure": node.get("configure", []),
            "code": config.get("code"), "prompt": config.get("systemPrompt"),
            "sourceSection": node.get("sourceSection", ""), "readiness": node.get("readiness", "未验证"),
        })
        display_nodes.append({
            "id": node_id, "label": node["name"], "role": node["inlineType"],
            "purpose": node["summary"], "runtimeIds": mapped["runtimeIds"],
            "readiness": node.get("readiness", "未验证"), "width": 148, "height": 70,
            **positions[node["id"]],
        })
    width = max(pos["x"] for pos in positions.values()) + 184
    height = max(pos["y"] for pos in positions.values()) + 150
    warnings = [note["body"] for note in spec.get("inlineNotes", []) if note.get("severity") == "warning"]
    return {
        "metric": metric.key, "mapping": mapping, "differences": metric.runtime.get("differences", []),
        "platform": {
            "title": "行内复刻图", "subtitle": spec["meta"].get("description", ""),
            "pageInfo": registry.page_info(metric.key), "width": width, "height": height,
            "nodes": display_nodes, "edges": [{
                "source": alias(edge["from"]), "target": alias(edge["to"]),
                "conditional": edge["kind"] == "conditional", "route": edge.get("label"),
                "label": edge.get("label", ""), "kind": "flow",
                "laneOffset": edge.get("laneOffset", 0),
            } for edge in edges],
            "sessionReentry": {"source": "end", "target": "start", "label": "追问再触发",
                               "y": height - 28, "compiled": False}
                if "start" in nodes_by_id and spec["meta"].get("reentryNote") else None,
            "blueprint": {"nodes": blueprint_nodes}, "openItems": warnings,
        },
    }
