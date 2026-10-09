"""把模型产出的 JSON 整形成 ``validate_answer`` 能吃的形状。

模型不遵守形状是常态而不是异常：它会把 ``trend[0].value`` 写成 JS 风格下标、
把 ``scope.actualDataDate`` 当成顶层路径、把 ``numericRefs`` 塞在每个 section 里。
这些都不是"编造数字"，是形状不一致——所以要在**校验之前**整形，而不是让校验
去背这些噪声。

抽到 ``almcanvas`` 供所有指标共用；路径别名可配置，各指标的嵌套深度不同。
"""

from __future__ import annotations

import re
from typing import Any, Mapping

_BRACKET_INDEX = re.compile(r"\[(\d+)\]")

# 结果包把范围信息嵌在 scope 下，模型却常按顶层路径引用。默认别名按重定价缺口率
# 试点校准；其他指标在自己的装配处覆盖。
DEFAULT_PATH_ALIASES: dict[str, str] = {
    "scope.actualDataDate": "actualDataDate",
}


def to_dot_path(path: str) -> str:
    """``trend[0].value`` → ``trend.0.value``。"""
    return _BRACKET_INDEX.sub(r".\1", path)


def _apply_aliases(path: str, aliases: Mapping[str, str]) -> str:
    aliased = aliases.get(path)
    return aliased if aliased else to_dot_path(path)


def normalize_model_answer(answer: Any, *, path_aliases: Mapping[str, str] | None = None) -> Any:
    """整形模型答案：路径归一 + 把 section 内嵌的 numericRefs 上提。

    与 v2 的 ``normalize_model_answer`` 行为一致，**就地修改**并返回原对象。
    非 dict 原样返回（后续 schema 校验会报 INVALID_ANSWER_SCHEMA）。
    """
    if not isinstance(answer, dict):
        return answer
    aliases = DEFAULT_PATH_ALIASES if path_aliases is None else path_aliases

    refs = answer.get("numericRefs")
    if not isinstance(refs, list):
        refs = []

    sections = answer.get("sections")
    for section in sections if isinstance(sections, list) else []:
        if not isinstance(section, dict):
            continue
        if isinstance(section.get("citations"), list):
            section["citations"] = [
                _apply_aliases(path, aliases) if isinstance(path, str) else path
                for path in section["citations"]
            ]
        nested = section.pop("numericRefs", None)
        if isinstance(nested, list):
            refs.extend(nested)

    for ref in refs:
        if isinstance(ref, dict) and isinstance(ref.get("path"), str):
            ref["path"] = _apply_aliases(ref["path"], aliases)

    answer["numericRefs"] = refs
    return answer
