#!/usr/bin/env python3
"""迁移蓝图渲染器：spec JSON → 自包含 HTML（.agents/skills/blueprint/spec-schema.md v1）。

用法：

    PYTHONPATH=<仓库根> python3 scripts/render_blueprint.py <spec.json> <output.html>

产物为单文件 HTML（零外部依赖、离线可开）：SVG 架构流程图 + 每节点行内建站信息卡 +
迁移必读说明。JS 仅做主题切换/复制/点击联动增强，禁用 JS 时信息完整可读。

仅用标准库；不依赖仓库内其他模块（运行时模板除外，同目录 `_blueprint_runtime`）。
"""

from __future__ import annotations

import html
import json
import sys
from pathlib import Path

from _blueprint_runtime import CSS, HTML_TEMPLATE, JS

# ---- 契约常量（与 spec-schema.md v1 一致） ----

INLINE_TYPES = {
    "开始", "Prompt", "条件选择器", "RAG", "API", "AI能力", "AI 能力", "MCP",
    "脚本", "业务编排", "Agent", "循环组件", "中间信息输出", "结束",
}
CONFIG_KINDS = {
    "start", "prompt", "api", "script", "condition", "message",
    "loop", "subflow", "mcp", "agent", "rag", "end",
}
NODE_REQUIRED = ("id", "name", "inlineType", "summary", "inputs", "outputs", "config", "failureRouting")
META_REQUIRED = ("schemaVersion", "workflow", "title", "description", "app", "contractDoc", "generatedAt")

TYPE_GROUP = {
    "开始": "start", "结束": "end", "Prompt": "prompt", "API": "api", "AI能力": "api", "AI 能力": "api",
    "脚本": "script", "条件选择器": "condition",
}
TYPE_NAME = {"start": "开始", "end": "结束", "prompt": "Prompt", "api": "API",
             "script": "脚本", "condition": "条件选择器", "other": "节点"}

LABELS = {
    "plugin": "接口注册名", "path": "接口路径", "method": "请求方法", "paramsDesc": "入参说明",
    "onError": "异常策略", "retries": "失败重试次数", "systemPrompt": "系统提示词",
    "userContent": "用户提示词模板", "outputFormat": "输出格式", "outputParams": "输出参数声明",
    "llmProfile": "模型档位", "defaultOutput": "默认输出", "codeSummary": "处理逻辑要点",
    # 本仓库扩展：v1 的 script 只有 codeSummary（逻辑要点），补一个承载完整
    # 可粘贴脚本的字段，保住复刻图/蓝图的"一键复制建站"能力。
    "code": "脚本全文（可直接粘贴）", "inputFormat": "入参格式",
    "timeoutSeconds": "超时（秒）", "branches": "分支条件", "contentType": "输出类型",
    "streaming": "流式输出", "inputParams": "入参声明", "iterateOver": "遍历数组",
    "itemKey": "当前元素变量", "outputName": "输出变量名", "maxIterations": "最大轮次",
    "refWorkflow": "引用编排", "depth": "嵌套深度", "server": "MCP Server", "tool": "工具",
    "tools": "工具清单", "maxRounds": "最大轮数", "strategy": "检索策略", "topK": "最大召回段落数",
    "threshold": "召回阈值", "includeSource": "返回知识来源", "outputTemplate": "结束输出模板",
}
ON_ERROR_LABEL = {
    "abort": "abort：异常中断整个编排",
    "ignore": "ignore：异常忽略，失败时跳过本节点、以默认输出继续",
}

# 布局常量（px）
NW, NH, GX, GY, M = 198, 62, 74, 122, 34


def esc(text: str) -> str:
    return html.escape(str(text), quote=True)


# ---------------------------------------------------------------------------
# 加载与校验
# ---------------------------------------------------------------------------

def validate_spec(spec: dict) -> list[str]:
    problems: list[str] = []
    meta = spec.get("meta") or {}
    for key in META_REQUIRED:
        if key not in meta:
            problems.append(f"meta 缺字段 {key}")
    if meta.get("schemaVersion") != 1:
        problems.append("meta.schemaVersion 必须为 1")
    ids: list[str] = []
    for i, node in enumerate(spec.get("nodes") or []):
        where = f"nodes[{i}]"
        for key in NODE_REQUIRED:
            if key not in node:
                problems.append(f"{where} 缺字段 {key}")
        nid = node.get("id")
        if nid:
            if nid in ids:
                problems.append(f"{where}.id 重复: {nid}")
            ids.append(nid)
        if str(node.get("inlineType", "")).strip() not in INLINE_TYPES:
            problems.append(f"{where}.inlineType 非行内节点类型: {node.get('inlineType')!r}")
        cfg = node.get("config") or {}
        if cfg.get("kind") not in CONFIG_KINDS:
            problems.append(f"{where}.config.kind 非法: {cfg.get('kind')!r}")
        for key in ("inputs", "outputs"):
            for j, item in enumerate(node.get(key) or []):
                if "name" not in item or "type" not in item:
                    problems.append(f"{where}.{key}[{j}] 缺 name/type")
    node_ids = set(ids)
    for i, edge in enumerate(spec.get("edges") or []):
        if edge.get("from") not in node_ids:
            problems.append(f"edges[{i}].from 未知节点: {edge.get('from')!r}")
        if edge.get("to") not in node_ids and edge.get("to") != "__end__":
            problems.append(f"edges[{i}].to 未知节点: {edge.get('to')!r}")
        if edge.get("kind") not in ("normal", "conditional", "back-edge", "end"):
            problems.append(f"edges[{i}].kind 非法: {edge.get('kind')!r}")
        if edge.get("kind") == "back-edge" and not edge.get("inlineExpansion"):
            problems.append(f"edges[{i}] back-edge 缺 inlineExpansion")
    for i, note in enumerate(spec.get("inlineNotes") or []):
        for key in ("id", "title", "body"):
            if key not in note:
                problems.append(f"inlineNotes[{i}] 缺字段 {key}")
    return problems


def load_spec(path: Path) -> dict:
    spec = json.loads(path.read_text(encoding="utf-8"))
    problems = validate_spec(spec)
    if problems:
        print("spec 校验未通过：", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        raise SystemExit(2)
    return spec


# ---------------------------------------------------------------------------
# 布局
# ---------------------------------------------------------------------------

def build_rows(spec: dict) -> list[list[str]]:
    """行分组：meta.layout.rows 显式指定，否则拓扑分层蛇形。"""
    rows = ((spec.get("meta") or {}).get("layout") or {}).get("rows")
    if rows:
        flat = [nid for row in rows for nid in row]
        missing = [n["id"] for n in spec["nodes"] if n["id"] not in flat and n["id"] != "__end__"]
        if missing:
            raise SystemExit(f"meta.layout.rows 未覆盖节点: {missing}")
        if "__end__" not in flat:
            rows = [list(r) for r in rows]
            rows[-1].append("__end__")
        return rows
    back = {e["from"] for e in spec["edges"] if e["kind"] == "back-edge"}
    incoming: dict[str, list[str]] = {n["id"]: [] for n in spec["nodes"]}
    for e in spec["edges"]:
        if e["to"] != "__end__" and e["from"] not in back:
            incoming.setdefault(e["to"], []).append(e["from"])
    layer: dict[str, int] = {}

    def depth(nid: str, seen: frozenset) -> int:
        if nid in layer:
            return layer[nid]
        preds = [p for p in incoming.get(nid, []) if p not in seen]
        value = 1 + max((depth(p, seen | {nid}) for p in preds), default=-1)
        layer[nid] = max(0, value)
        return layer[nid]

    for n in spec["nodes"]:
        depth(n["id"], frozenset())
    max_per = int((((spec.get("meta") or {}).get("layout") or {}).get("maxPerRow")) or 5)
    ordered = sorted(spec["nodes"], key=lambda n: (layer[n["id"]], n["id"]))
    rows: list[list[str]] = []
    for chunk in [ordered[i:i + max_per] for i in range(0, len(ordered), max_per)]:
        ids = [n["id"] for n in chunk]
        rows.append(ids if len(rows) % 2 == 0 else ids[::-1])
    rows[-1].append("__end__")
    return rows


def positions(rows: list[list[str]]) -> dict[str, tuple[int, int]]:
    pos: dict[str, tuple[int, int]] = {}
    for r, row in enumerate(rows):
        for c, nid in enumerate(row):
            pos[nid] = (M + c * (NW + GX), M + r * (NH + GY))
    return pos


# ---------------------------------------------------------------------------
# SVG
# ---------------------------------------------------------------------------

def _type_badge(node: dict) -> str:
    group = TYPE_GROUP.get(str(node.get("inlineType")).strip(), "other")
    return group


def _svg_node(node: dict, idx: int, x: int, y: int) -> str:
    group = _type_badge(node)
    color = f"var(--n-{group})"
    label = str(node["name"])
    if len(label) > 13:
        label = label[:12] + "…"
    nid = node["id"]
    return (
        f'<g class="bp-node" data-node-id="{esc(nid)}" style="cursor:pointer">'
        f'<rect x="{x}" y="{y}" width="{NW}" height="{NH}" rx="10" fill="var(--panel)" '
        f'stroke="{color}" stroke-width="2"/>'
        f'<rect x="{x}" y="{y}" width="6" height="{NH}" rx="3" fill="{color}"/>'
        f'<circle cx="{x + 26}" cy="{y + 20}" r="11" fill="{color}"/>'
        f'<text x="{x + 26}" y="{y + 24.5}" text-anchor="middle" font-size="12" fill="#fff">{idx}</text>'
        f'<text x="{x + 44}" y="{y + 24.5}" font-size="13.5" font-weight="600" fill="var(--ink)">{esc(label)}</text>'
        f'<text x="{x + 16}" y="{y + 47}" font-size="11" fill="var(--muted)" '
        f'font-family="ui-monospace,Menlo,monospace">{esc(nid if len(nid) <= 24 else nid[:23] + "…")}</text>'
        f'<text x="{x + NW - 12}" y="{y + 47}" text-anchor="end" font-size="11" fill="{color}">'
        f'{esc(str(node["inlineType"]).strip())}</text></g>'
    )


def _svg_end(idx: int, x: int, y: int) -> str:
    return (
        f'<g class="bp-node" data-node-id="__end__" style="cursor:pointer">'
        f'<rect x="{x}" y="{y}" width="{NW}" height="{NH}" rx="{NH // 2}" fill="var(--panel)" '
        f'stroke="var(--n-end)" stroke-width="2" stroke-dasharray="5 4"/>'
        f'<circle cx="{x + 22}" cy="{y + NH / 2}" r="11" fill="var(--n-end)"/>'
        f'<text x="{x + 22}" y="{y + NH / 2 + 4.5}" text-anchor="middle" font-size="12" fill="#fff">{idx}</text>'
        f'<text x="{x + NW / 2 + 10}" y="{y + 28}" text-anchor="middle" font-size="13.5" '
        f'font-weight="600" fill="var(--ink)">结束（最终输出）</text>'
        f'<text x="{x + NW / 2 + 10}" y="{y + 47}" text-anchor="middle" font-size="11" fill="var(--muted)">DONE 帧 data</text></g>'
    )


def _port(nid: str, pos: dict, side: str) -> tuple[int, int]:
    x, y = pos[nid]
    return {
        "right": (x + NW, y + NH // 2),
        "left": (x, y + NH // 2),
        "top": (x + NW // 2, y),
        "bottom": (x + NW // 2, y + NH),
    }[side]


def _polyline(points: list[tuple[int, int]]) -> str:
    return " ".join(f"{p[0]},{p[1]}" for p in points)


def _route(a: str, b: str, pos: dict, rows: list[list[str]], kind: str) -> list[tuple[int, int]]:
    (ax, ay), (bx, by) = pos[a], pos[b]
    a_mid, b_mid = ay + NH // 2, by + NH // 2
    if by == ay and bx > ax:  # 同行向右
        if bx - ax <= NW + GX + 1 and kind != "conditional":
            return [_port(a, pos, "right"), _port(b, pos, "left")]
        if bx - ax <= NW + GX + 1:
            yb = ay + NH + 26
            return [(ax + NW, a_mid), (ax + NW + 20, a_mid), (ax + NW + 20, yb),
                    (bx - 20, yb), (bx - 20, b_mid), (bx, b_mid)]
        yb = ay + NH + 26
        return [(ax + NW, a_mid), (ax + NW + 20, a_mid), (ax + NW + 20, yb),
                (bx - 20, yb), (bx - 20, b_mid), (bx, b_mid)]
    if by > ay:  # 下一行
        yc = by - GY // 2
        return [_port(a, pos, "bottom"), (ax + NW // 2, yc), (bx + NW // 2, yc), _port(b, pos, "top")]
    if bx < ax:  # 向左（back-edge 或蛇形边）：走上走廊，右侧入
        yc = ay - 26
        return [_port(a, pos, "top"), (ax + NW // 2, yc), (bx + NW + 22, yc),
                (bx + NW + 22, b_mid), _port(b, pos, "right")]
    yc = by + NH + 26
    return [_port(a, pos, "top"), (ax + NW // 2, yc), (bx + NW // 2, yc), _port(b, pos, "bottom")]


def _edge_label_pos(points: list[tuple[int, int]]) -> tuple[int, int] | None:
    best: tuple[int, int] | None = None
    best_len = 0
    for p, q in zip(points, points[1:]):
        length = abs(q[0] - p[0]) + abs(q[1] - p[1])
        if length > best_len:
            best_len = length
            best = ((p[0] + q[0]) // 2, (p[1] + q[1]) // 2)
    return best


def render_svg(spec: dict) -> str:
    rows = build_rows(spec)
    pos = positions(rows)
    nodes_by_id = {n["id"]: n for n in spec["nodes"]}
    order = [nid for row in rows for nid in row]
    seq = {nid: i + 1 for i, nid in enumerate(order)}

    width = M * 2 + max(len(r) for r in rows) * (NW + GX) - GX
    height = M * 2 + len(rows) * (NH + GY) - GY
    max_col = max(len(r) for r in rows)
    parts = [
        f'<svg viewBox="0 0 {width} {height}" width="{width}" height="{height}" '
        f'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="工作流架构流程图">',
        '<defs>'
        '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
        'markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)"/></marker>'
        '<marker id="arrow-back" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
        'markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--back)"/></marker>'
        '</defs>',
    ]
    label_parts: list[str] = []
    for i, edge in enumerate(spec["edges"]):
        kind = edge["kind"]
        a, b = edge["from"], edge["to"]
        if a not in pos or b not in pos:
            continue
        pts = _route(a, b, pos, rows, kind)
        dashed = 'stroke-dasharray="7 5"' if kind in ("back-edge", "conditional") else ""
        color = "var(--back)" if kind == "back-edge" else "var(--muted)"
        marker = "arrow-back" if kind == "back-edge" else "arrow"
        parts.append(
            f'<path d="M{_polyline(pts)}" fill="none" stroke="{color}" stroke-width="1.6" '
            f'{dashed} marker-end="url(#{marker})"/>'
        )
        label = edge.get("label")
        if label:
            anchor = _edge_label_pos(pts)
            if anchor:
                fill = "var(--back)" if kind == "back-edge" else "var(--accent)"
                # 标签在节点之后统一绘制并带面板色描边，长标签压到节点框上也完整可读
                label_parts.append(
                    f'<text x="{anchor[0]}" y="{anchor[1] - 6}" text-anchor="middle" '
                    f'font-size="11.5" font-weight="600" fill="{fill}" stroke="var(--panel)" '
                    f'stroke-width="4" paint-order="stroke" stroke-linejoin="round">{esc(label)}</text>'
                )
    for r, row in enumerate(rows):
        for c, nid in enumerate(row):
            x, y = pos[nid]
            if nid == "__end__":
                parts.append(_svg_end(seq[nid], x, y))
            else:
                parts.append(_svg_node(nodes_by_id[nid], seq[nid], x, y))
    parts.extend(label_parts)
    parts.append("</svg>")
    return "".join(parts)


# ---------------------------------------------------------------------------
# 详情卡与说明卡
# ---------------------------------------------------------------------------

def _value_html(value: object) -> str:
    if isinstance(value, bool):
        return "是" if value else "否"
    if isinstance(value, (int, float)):
        return esc(value)
    if isinstance(value, str):
        if "\n" in value or len(value) > 80:
            copy_text = esc(json.dumps(value, ensure_ascii=False))
            return f'<pre class="code">{esc(value)}'\
                   f'<button type="button" class="copy" data-text="{copy_text}">复制</button></pre>'
        return f"<code>{esc(value)}</code>"
    if isinstance(value, list) and value and isinstance(value[0], dict):
        keys: list[str] = []
        for item in value:
            for k in item:
                if k not in keys:
                    keys.append(k)
        head = "".join(f"<th>{esc(LABELS.get(k, k))}</th>" for k in keys)
        body = "".join(
            "<tr>" + "".join(f"<td>{_value_html(item.get(k, ''))}</td>" for k in keys) + "</tr>"
            for item in value
        )
        return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"
    if isinstance(value, list):
        items = "".join(f"<li>{_value_html(v)}</li>" for v in value)
        return f"<ul>{items}</ul>"
    if isinstance(value, dict):
        text = json.dumps(value, ensure_ascii=False, indent=2)
        copy_text = esc(json.dumps(text, ensure_ascii=False))
        return f'<pre class="code">{esc(text)}'\
               f'<button type="button" class="copy" data-text="{copy_text}">复制</button></pre>'
    return esc(value)


def _config_html(config: dict) -> str:
    rows: list[str] = []
    for key, value in config.items():
        if key == "kind":
            continue
        label = LABELS.get(key, key)
        if key == "onError" and isinstance(value, str):
            value = ON_ERROR_LABEL.get(value, value)
        rows.append(f"<dt>{esc(label)}</dt><dd>{_value_html(value)}</dd>")
    if not rows:
        return "<p>（无额外配置）</p>"
    return f'<dl class="kv">{"".join(rows)}</dl>'


def _table(headers: list[str], items: list[dict]) -> str:
    if not items:
        return "<p>（无）</p>"
    head = "".join(f"<th>{esc(h)}</th>" for h in headers)
    body = "".join(
        "<tr>" + "".join(f"<td>{_value_html(item.get(k, ''))}</td>" for k in headers) + "</tr>"
        for item in items
    )
    return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def render_node_card(node: dict, idx: int) -> str:
    cfg = node.get("config") or {}
    extra = ""
    if node.get("inlineMigration"):
        extra += f'<div class="migrate"><strong>迁移注意</strong>：{_value_html(node["inlineMigration"])}</div>'
    impl = f'<p class="impl">本地实现：{esc(node["impl"])}</p>' if node.get("impl") else ""
    local_badge = '<span class="badge local">本地实现</span>' if node.get("localOnly") else ""
    title = esc(node["name"])
    return (
        f'<article class="node-card" id="card-{esc(node["id"])}">'
        f'<header><span class="idx">{idx}</span><h3>{title}'
        f'<span class="nid mono">{esc(node["id"])}</span></h3>'
        f'<span class="badge">{esc(str(node["inlineType"]).strip())}</span>{local_badge}'
        f'<button type="button" class="jump" data-goto-node="{esc(node["id"])}">回图</button></header>'
        f'<div class="node-body">'
        f'<p>{esc(node["summary"])}</p>'
        f'<h4>输入参数</h4>{_table(["name", "type", "source", "desc"], node.get("inputs") or [])}'
        f'<h4>输出参数<span class="hint">（输出变量名 = 节点 id，后置节点经它引用）</span></h4>'
        f'{_table(["name", "type", "desc"], node.get("outputs") or [])}'
        f'<h4>节点配置</h4>{_config_html(cfg)}'
        f'<h4>失败路由</h4><div class="fail">{esc(node["failureRouting"])}</div>'
        f'{extra}{impl}</div></article>'
    )


def render_notes(notes: list[dict]) -> str:
    if not notes:
        return "<p>（无）</p>"
    parts = []
    for note in notes:
        cls = "note-card warning" if note.get("severity") == "warning" else "note-card"
        rel = ""
        if note.get("relates"):
            links = "、".join(
                f'<a href="#card-{esc(nid)}" data-goto-node="{esc(nid)}" style="color:var(--accent)">{esc(nid)}</a>'
                for nid in note["relates"]
            )
            rel = f'<p class="rel">相关节点：{links}</p>'
        parts.append(
            f'<div class="{cls}"><h3>{esc(note["title"])}</h3>'
            f'<p>{esc(note["body"])}</p>{rel}</div>'
        )
    return "".join(parts)


# ---------------------------------------------------------------------------
# 组装
# ---------------------------------------------------------------------------

def render_html(spec: dict) -> str:
    meta = spec["meta"]
    rows = build_rows(spec)
    order = [nid for row in rows for nid in row]
    nodes_by_id = {n["id"]: n for n in spec["nodes"]}
    cards = "".join(
        render_node_card(nodes_by_id[nid], i + 1)
        for i, nid in enumerate(order) if nid in nodes_by_id
    )
    has_back_edge = any(e["kind"] == "back-edge" for e in spec["edges"])
    hint = (
        "点击节点查看该节点的行内建站信息；红色虚线为本地回边，行内画布不可直接建"
        if has_back_edge
        else "点击节点查看该节点的行内建站信息；图为行内画布可表达的前向 DAG"
    )
    legend_back = (
        '<span><i class="dash"></i>本地回边（行内须线性展开）</span>' if has_back_edge else ""
    )
    body = (
        '<section id="canvas"><h2>架构流程图'
        f'<span class="hint">{hint}</span></h2>'
        f'<div class="canvas-wrap">{render_svg(spec)}</div>'
        '<div class="legend"><span><i></i>主链边</span>'
        '<span><i style="border-top-style:dashed;border-top-color:var(--accent)"></i>条件分支</span>'
        f'{legend_back}</div></section>'
        f'<section id="notes"><h2>迁移必读<span class="hint">行内落地差异与待确认项</span></h2>'
        f'{render_notes(spec.get("inlineNotes") or [])}</section>'
        f'<section id="nodes"><h2>节点建站信息<span class="hint">按流程顺序；字段可逐项复制到行内表单</span></h2>{cards}</section>'
    )
    subtitle = (
        f'{esc(meta.get("inlinePlatform") or "行内 AI 智能工场")}迁移蓝图 · 工作流 '
        f'{esc(meta["workflow"])} · 生成于 {esc(meta["generatedAt"])} · {esc(meta["description"])}'
    )
    spec_json = json.dumps(spec, ensure_ascii=False).replace("</", "<\\/")
    return (
        HTML_TEMPLATE
        .replace("__TITLE__", esc(meta["title"]))
        .replace("__SUBTITLE__", subtitle)
        .replace("__CONTRACT__", esc(meta["contractDoc"]))
        .replace("__BODY__", body)
        .replace("__CSS__", CSS)
        .replace("__JS__", JS.replace("__SPEC_JSON__", spec_json))
    )


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("用法: python3 scripts/render_blueprint.py <spec.json> <output.html>", file=sys.stderr)
        return 2
    spec = load_spec(Path(argv[1]))
    out = Path(argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render_html(spec), encoding="utf-8")
    count_nodes = len(spec["nodes"])
    count_notes = len(spec.get("inlineNotes") or [])
    print(f"已生成 {out}（{count_nodes} 个节点、{len(spec['edges'])} 条边、{count_notes} 条迁移说明）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
