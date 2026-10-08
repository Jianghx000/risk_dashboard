"""输出校验构件（原 app/validate.py 的通用部分）。

两道门禁（受控解读范式的稳定约定）：

1. 轻量 schema 校验（不引入第三方依赖）：headline/sections/numericRefs 结构、
   sections key 枚举（由调用方按业务传入）、citations/refs 形态；
2. 数值回填一致性校验：``numericRefs`` 每条 ``{path, value}`` 的 path 必须能在
   结果包中解析，且值一致——数值容差 1e-6，其余类型精确相等。

不通过时返回差异清单，供 LLM 带着差异重生成 ≤1 次；重生成仍失败则降级为仅
确定性结果。追问（followup）的校验复用同一套数值回填规则（规则与首轮共用）。
"""

from __future__ import annotations

import math
from typing import Any, Iterable, Optional

NUMERIC_TOLERANCE = 1e-6


def resolve_path(package: dict[str, Any], path: str) -> tuple[bool, Any]:
    """按点分路径（数组用数字下标）从结果包解析值；不可解析返回 (False, None)。"""
    current: Any = package
    if not path or not isinstance(path, str):
        return False, None
    for part in path.split("."):
        if isinstance(current, dict):
            if part not in current:
                return False, None
            current = current[part]
        elif isinstance(current, list):
            try:
                index = int(part)
            except ValueError:
                return False, None
            if index < 0 or index >= len(current):
                return False, None
            current = current[index]
        else:
            return False, None
    return True, current


def _values_match(expected: Any, actual: Any) -> bool:
    if isinstance(expected, bool) or isinstance(actual, bool):
        return expected == actual
    if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
        return math.isclose(float(expected), float(actual), rel_tol=0.0, abs_tol=NUMERIC_TOLERANCE)
    return expected == actual


def check_numeric_refs(
    package: dict[str, Any],
    numeric_refs: Any,
    require_non_empty: bool = False,
) -> list[str]:
    """数值回填校验；返回差异清单（空 = 通过）。"""
    diffs: list[str] = []
    if not isinstance(numeric_refs, list):
        return ["numericRefs 必须为数组"]
    if require_non_empty and not numeric_refs:
        diffs.append("numericRefs 不能为空（正文中出现数值时必须逐条给出 path+value）")
    for index, ref in enumerate(numeric_refs):
        if not isinstance(ref, dict) or "path" not in ref or "value" not in ref:
            diffs.append(f"numericRefs[{index}] 缺少 path 或 value")
            continue
        path = ref["path"]
        found, actual = resolve_path(package, path)
        if not found:
            diffs.append(f"numericRefs[{index}].path 在结果包中不可解析: {path}")
            continue
        if not _values_match(ref["value"], actual):
            diffs.append(
                f"numericRefs[{index}] 数值不一致: path={path} 声明值={ref['value']!r} 结果包值={actual!r}"
            )
    return diffs


def validate_sections(
    sections: Any,
    allowed_keys: Iterable[str],
    diffs: list[str],
    prefix: str = "sections",
    *,
    require_non_empty: bool = True,
) -> None:
    """sections 数组结构校验（key 枚举 + text/citations 形态），差异追加进 diffs。"""
    allowed = set(allowed_keys)
    if not isinstance(sections, list) or (require_non_empty and not sections):
        diffs.append(f"{prefix} 必须为非空数组")
        return
    for index, section in enumerate(sections):
        if not isinstance(section, dict):
            diffs.append(f"{prefix}[{index}] 必须为对象")
            continue
        key = section.get("key")
        if key not in allowed:
            diffs.append(f"{prefix}[{index}].key={key!r} 不在允许枚举 {sorted(allowed)} 内")
            continue
        text = section.get("text")
        if not isinstance(text, str) or not text.strip():
            diffs.append(f"{prefix}[{index}].text 必须为非空字符串")
        citations = section.get("citations", [])
        if not isinstance(citations, list) or not all(isinstance(c, str) for c in citations):
            diffs.append(f"{prefix}[{index}].citations 必须为字符串数组")


def validate_narrative(
    narrative: Any,
    package: dict[str, Any],
    allowed_keys: Iterable[str],
) -> list[str]:
    """narrative schema 校验 + 数值回填校验；返回差异清单（空 = 通过）。

    ``allowed_keys`` 为业务侧的 sections key 枚举（如 judgment/velocity/…）。
    """
    diffs: list[str] = []
    if not isinstance(narrative, dict):
        return ["narrative 必须为 JSON 对象"]
    headline = narrative.get("headline")
    if not isinstance(headline, str) or not headline.strip():
        diffs.append("headline 必须为非空字符串")
    validate_sections(narrative.get("sections"), allowed_keys, diffs)
    refs = narrative.get("numericRefs", [])
    if not isinstance(refs, list):
        diffs.append("numericRefs 必须为数组")
    else:
        diffs.extend(check_numeric_refs(package, refs))
    return diffs


def validate_followup_answer(answer: Any, package: dict[str, Any]) -> list[str]:
    """追问输出校验（无业务枚举，纯范式）：out_of_scope 必须给 outOfScopeHint；
    in_scope 数值须可回填。"""
    diffs: list[str] = []
    if not isinstance(answer, dict):
        return ["answer 必须为 JSON 对象"]
    scope = answer.get("answerScope")
    if scope not in ("in_scope", "out_of_scope"):
        diffs.append("answerScope 必须为 in_scope 或 out_of_scope")
        return diffs
    if scope == "out_of_scope":
        hint = answer.get("outOfScopeHint")
        if not isinstance(hint, list) or not hint or not all(isinstance(h, str) for h in hint):
            diffs.append("out_of_scope 时必须给出 outOfScopeHint（可答主题清单）")
        sections = answer.get("sections")
        if sections not in (None, []):
            # out_of_scope 允许空 sections；给非空也宽容处理，只要求结构合法。
            if isinstance(sections, list):
                for index, section in enumerate(sections):
                    if not isinstance(section, dict) or not isinstance(section.get("text", ""), str):
                        diffs.append(f"sections[{index}] 结构非法")
        refs = answer.get("numericRefs")
        if refs not in (None, []):
            diffs.extend(check_numeric_refs(package, refs))
        return diffs
    sections = answer.get("sections")
    if not isinstance(sections, list) or not sections:
        diffs.append("in_scope 时 sections 必须为非空数组")
    else:
        for index, section in enumerate(sections):
            if not isinstance(section, dict):
                diffs.append(f"sections[{index}] 必须为对象")
                continue
            if not isinstance(section.get("key"), str) or not str(section.get("key")).strip():
                diffs.append(f"sections[{index}].key 必须为非空字符串")
            if not isinstance(section.get("text"), str) or not str(section.get("text")).strip():
                diffs.append(f"sections[{index}].text 必须为非空字符串")
            citations = section.get("citations", [])
            if not isinstance(citations, list) or not all(isinstance(c, str) for c in citations):
                diffs.append(f"sections[{index}].citations 必须为字符串数组")
    refs = answer.get("numericRefs", [])
    if not isinstance(refs, list):
        diffs.append("numericRefs 必须为数组")
    else:
        # in_scope 的硬性门禁是"每条引用都可回填"；回答文本不含数值时允许空数组。
        diffs.extend(check_numeric_refs(package, refs))
    return diffs
