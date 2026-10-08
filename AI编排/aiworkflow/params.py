"""开始节点入参声明与校验（对齐行内开始节点入参契约，见 docs/platform-contract.md 第 4 节）。

行内开始节点的入参即业务编排对外 API 的接口入参，支持声明类型并约束结构
（Object 最多 3 层嵌套、最外层变量最多 40 行）。本地以 ``INPUT_PARAMS`` 声明
清单描述入参（name/type/required/desc），``validate_inputs`` 按声明校验实际
入参；违反声明返回 HTTP 400（returnCode=ERR1001，行内码表待确认的本地补充码）。

未声明的入参键本地不拒绝（行内对多余入参的行为未定义，保持宽容以兼容调用方）。
"""

from __future__ import annotations

from typing import Any, Optional

# 行内开始节点支持的数据类型（File 本地无文件流场景，仅声明合法、跳过值校验）
TYPES = ("String", "Number", "Integer", "Boolean", "Object", "Array", "File")

# 行内约束：Object 最多支持 3 层嵌套
MAX_OBJECT_DEPTH = 3
# 行内约束：最外层变量行数最大支持 40 行
MAX_TOP_LEVEL_PARAMS = 40


def _check_type(value: Any, declared_type: str) -> Optional[str]:
    """按声明类型校验单个值；返回错误消息或 None。"""
    if declared_type == "String":
        if not isinstance(value, str):
            return f"应为 String，实际 {type(value).__name__}"
    elif declared_type == "Integer":
        if not isinstance(value, int) or isinstance(value, bool):
            return f"应为 Integer，实际 {type(value).__name__}"
    elif declared_type == "Number":
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return f"应为 Number，实际 {type(value).__name__}"
    elif declared_type == "Boolean":
        if not isinstance(value, bool):
            return f"应为 Boolean，实际 {type(value).__name__}"
    elif declared_type == "Object":
        if not isinstance(value, dict):
            return f"应为 Object，实际 {type(value).__name__}"
        depth = _object_depth(value)
        if depth > MAX_OBJECT_DEPTH:
            return f"Object 嵌套 {depth} 层，超过行内上限 {MAX_OBJECT_DEPTH} 层"
    elif declared_type == "Array":
        if not isinstance(value, list):
            return f"应为 Array，实际 {type(value).__name__}"
    elif declared_type == "File":
        return None  # 本地无文件流场景，不做值校验
    return None


def _object_depth(value: Any) -> int:
    """dict 嵌套深度（顶层 dict 计 1 层；行内约束为最多 3 层）。"""
    if not isinstance(value, dict):
        return 0
    child_depths = [_object_depth(child) for child in value.values() if isinstance(child, dict)]
    return 1 + (max(child_depths) if child_depths else 0)


def validate_declaration(decl: list[dict[str, Any]]) -> list[str]:
    """仅校验声明清单本身的合法性（类型枚举、数量上限、名字唯一），不看实际入参。

    供工作流定义校验器（aiworkflow.workflow_check）在装配期调用。
    """
    problems: list[str] = []
    if len(decl) > MAX_TOP_LEVEL_PARAMS:
        problems.append(f"入参声明 {len(decl)} 项，超过行内上限 {MAX_TOP_LEVEL_PARAMS} 项")
    names: set[str] = set()
    for item in decl:
        name = item.get("name")
        declared_type = item.get("type")
        if not name or declared_type not in TYPES:
            problems.append(f"入参声明非法: {item!r}（type 须为 {'/'.join(TYPES)} 之一）")
            continue
        if name in names:
            problems.append(f"入参名重复: {name}")
        names.add(name)
    return problems


def validate_inputs(decl: list[dict[str, Any]], inputs: dict[str, Any]) -> Optional[str]:
    """按声明清单校验入参；返回第一条错误消息，全部通过返回 None。

    ``decl`` 形如 ``[{"name": "mode", "type": "String", "required": True}, ...]``；
    ``type`` 必须在 :data:`TYPES` 内，否则视为声明本身非法（装配期错误）。
    """
    if len(decl) > MAX_TOP_LEVEL_PARAMS:
        return f"入参声明 {len(decl)} 项，超过行内上限 {MAX_TOP_LEVEL_PARAMS} 项"
    for item in decl:
        name = item.get("name")
        declared_type = item.get("type")
        if not name or declared_type not in TYPES:
            return f"入参声明非法: {item!r}（type 须为 {'/'.join(TYPES)} 之一）"
        if name not in inputs or inputs[name] is None:
            if item.get("required"):
                return f"缺少必填入参: {name}"
            continue
        error = _check_type(inputs[name], declared_type)
        if error:
            return f"入参 {name} 类型不符: {error}"
    return None
