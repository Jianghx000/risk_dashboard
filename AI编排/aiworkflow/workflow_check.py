"""工作流定义校验器（把行内平台约束清单变成装配期可执行检查）。

行内约束清单见 docs/platform-contract.md 第 11 节。本模块在图装配期检查：

1. 边端点合法、入口唯一（入口不得有入边）；
2. 画布为 DAG——任何未声明的回边都判违规（行内画布无回边）；本地增强所需的
   回边（如校验门禁的重生成环）必须在 ``declared_back_edges`` 显式声明，被
   记录为"已知的行内不可表达偏差"，未声明即违规；
3. 非结束节点全部可达结束节点（无死路）；
4. 循环组件不嵌套（声明式：loop_bodies 中不得包含其他循环节点）；
5. 子编排（业务编排节点）嵌套不超过 2 层、禁止自引用（声明式）；
6. 开始节点入参声明合法（复用 aiworkflow.params 的声明级校验）。

Prompt 节点输出参数英文命名与脚本节点必须返回对象两项分别在
``graph_kit.make_prompt_node``（装配期）与 ``nodes.make_script_node``（运行期）
强制，不在本模块重复。
"""

from __future__ import annotations

from typing import Any, Optional

from aiworkflow import params

DEFAULT_END = "__end__"


def check_workflow(
    name: str,
    nodes: list[str],
    edges: list[tuple[str, str]],
    *,
    entry: str,
    end_node: str = DEFAULT_END,
    declared_back_edges: set[tuple[str, str]] = frozenset(),
    loop_bodies: Optional[dict[str, list[str]]] = None,
    subflow_refs: Optional[dict[str, tuple[str, int]]] = None,
    input_decls: Optional[list[dict[str, Any]]] = None,
) -> list[str]:
    """校验工作流定义；返回违规清单（空 = 通过）。

    ``edges`` 为全部边的展开（条件边展开为所有可能目标，langgraph 的
    ``add_conditional_edges`` 第三参数即目标清单）；``declared_back_edges``
    为显式声明的回边（行内画布不可表达、本地保留的增强路径）。
    """
    label = f"工作流 {name}"
    problems: list[str] = []
    node_set = set(nodes) | {end_node}
    edge_set = set(edges)

    for src, dst in sorted(edge_set):
        if src not in node_set:
            problems.append(f"{label}: 边起点不存在: {src}")
        if dst not in node_set:
            problems.append(f"{label}: 边终点不存在: {dst}")
    if entry not in nodes:
        problems.append(f"{label}: 入口节点不在节点清单: {entry}")
    for src, dst in sorted(edge_set):
        if dst == entry:
            problems.append(f"{label}: 入口节点存在入边（行内开始节点只有一个）: {src} → {entry}")

    declared = set(declared_back_edges)
    for back in sorted(declared):
        if back not in edge_set:
            problems.append(f"{label}: 声明的回边不是图中的边: {back}")

    effective = edge_set - declared
    for src, dst in _find_back_edges(effective):
        problems.append(
            f"{label}: 未声明的回边（行内画布无回边，须线性展开或显式声明为本地增强）: {src} → {dst}"
        )

    reachable = _reverse_reachable(effective, end_node)
    for node in nodes:
        if node != end_node and node not in reachable:
            problems.append(f"{label}: 节点无法到达结束节点（死路）: {node}")

    for loop_name, body in sorted((loop_bodies or {}).items()):
        if loop_name not in node_set:
            problems.append(f"{label}: 循环节点不在节点清单: {loop_name}")
        for inner in body:
            if inner in loop_bodies and inner != loop_name:
                problems.append(
                    f"{label}: 循环组件嵌套（行内约束循环不支持嵌套）: {loop_name} 包含循环节点 {inner}"
                )

    for node, (target, depth) in sorted((subflow_refs or {}).items()):
        if node == target:
            problems.append(f"{label}: 业务编排节点自引用（行内禁止）: {node}")
        if depth > 2:
            problems.append(f"{label}: 业务编排嵌套 {depth} 层（行内上限 2 层）: {node} → {target}")

    if input_decls is not None:
        problems.extend(params.validate_declaration(input_decls))

    return problems


def _find_back_edges(edges: set[tuple[str, str]]) -> list[tuple[str, str]]:
    """DFS 找回边（指向当前 DFS 栈中节点的边）；图规模为编排级，递归实现够用。"""
    graph: dict[str, list[str]] = {}
    for src, dst in edges:
        graph.setdefault(src, []).append(dst)
    color: dict[str, int] = {}
    back: list[tuple[str, str]] = []

    def dfs(node: str) -> None:
        color[node] = 1  # GRAY：在栈中
        for nxt in graph.get(node, []):
            state = color.get(nxt, 0)
            if state == 1:
                back.append((node, nxt))
            elif state == 0:
                dfs(nxt)
        color[node] = 2

    for start in list(graph):
        if color.get(start, 0) == 0:
            dfs(start)
    return back


def _reverse_reachable(edges: set[tuple[str, str]], target: str) -> set[str]:
    """能到达 target 的节点集合（反向可达）。"""
    reverse: dict[str, list[str]] = {}
    for src, dst in edges:
        reverse.setdefault(dst, []).append(src)
    seen = {target}
    stack = [target]
    while stack:
        node = stack.pop()
        for prev in reverse.get(node, []):
            if prev not in seen:
                seen.add(prev)
                stack.append(prev)
    return seen
