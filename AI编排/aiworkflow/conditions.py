"""条件选择器构件（对齐行内条件选择器节点语义，docs/platform-contract.md 第 8 节）。

行内条件选择器：IF / ELSEIF（可多个）/ ELSE 分支，每个分支由"引用变量、
操作符、比较值"三元组构成，分支内多条件可 AND/OR 切换。本模块提供操作符
实现与 langgraph 条件边的路由构造器；IF/ELSEIF/ELSE 的多路形态在 langgraph
中由路由函数返回目标节点名表达。
"""

from __future__ import annotations

from typing import Any, Callable, Optional

# 支持的比较操作符（对齐行内条件选择器的判断能力）
OPERATORS = (
    "eq", "ne", "gt", "ge", "lt", "le",
    "contains", "startswith", "endswith",
    "is_empty", "not_empty",
)


def is_empty(value: Any) -> bool:
    """空判定：None、空串、空数组、空对象视为空。"""
    return value is None or value == "" or value == [] or value == {}


def evaluate_condition(left: Any, op: str, right: Any = None) -> bool:
    """按操作符求值单个条件；未知操作符报错（装配期约束）。"""
    if op == "is_empty":
        return is_empty(left)
    if op == "not_empty":
        return not is_empty(left)
    if op == "eq":
        return left == right
    if op == "ne":
        return left != right
    if op in ("gt", "ge", "lt", "le"):
        if left is None or right is None:
            return False
        if op == "gt":
            return left > right
        if op == "ge":
            return left >= right
        if op == "lt":
            return left < right
        return left <= right
    if op == "contains":
        if isinstance(left, (str, list, tuple)):
            return right in left
        return False
    if op == "startswith":
        return isinstance(left, str) and isinstance(right, str) and left.startswith(right)
    if op == "endswith":
        return isinstance(left, str) and isinstance(right, str) and left.endswith(right)
    raise ValueError(f"未知条件操作符: {op!r}（支持 {'/'.join(OPERATORS)}）")


def all_of(*conditions: tuple) -> Callable[[Any], bool]:
    """AND 组合（行内分支内多条件 AND：全部满足才为真）。元素为 (left, op, right)。"""

    def check(value: Any) -> bool:
        return all(evaluate_condition(*c) for c in conditions)

    return check


def any_of(*conditions: tuple) -> Callable[[Any], bool]:
    """OR 组合（行内分支内多条件 OR：任一满足即为真）。元素为 (left, op, right)。"""

    def check(value: Any) -> bool:
        return any(evaluate_condition(*c) for c in conditions)

    return check


def route_when(
    predicate: Callable[[Any], bool],
    if_true: str,
    if_false: str,
) -> Callable[[Any], str]:
    """二路条件路由（langgraph 条件边）：谓词为真走 ``if_true``，否则 ``if_false``。

    对应行内条件选择器的 IF/ELSE 两分支形态；三路以上分支由返回目标名的
    自定义路由函数表达（如 aiworkflow.graph_kit.route_after_generate 的
    END/收尾/校验三分支）。
    """

    def route(state: Any) -> str:
        return if_true if predicate(state) else if_false

    return route
