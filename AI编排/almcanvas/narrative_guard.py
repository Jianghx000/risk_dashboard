"""叙事门禁：正文中每个数字都必须能回填到结果包（与指标无关的通用件）。

这是"LLM 只做文案、确定性代码算数"四原则里最容易被绕过的一环：模型可以在
句子里塞一个结果包里没有的数字，而格式校验（schema）完全看不出来。本模块把
散文里的数字逐个回填比对，命中不了的报 ``UNREFERENCED_NUMBER``。

之所以放在 ``almcanvas`` 而不是 ``aiworkflow``：``aiworkflow`` 与共享包
``01-ai-workflow-service`` 逐字一致，不承载本项目规则；本模块从
``repricing_gap_workflow/workflow.py`` 抽出、去掉指标专属判断后，供所有指标共用。

三个逃生口（都必须是"有据可依的例外"，不能是漏网）：

- ``${日期}``/``N月`` 等时间标签不是度量值，先剥掉再比对；
- 结果包里被显式引用的标识符（如 ``LOAN-1001``、``3个月`` 桶标签）不是度量值；
- 负向措辞下的正数幅度（"拖累 0.12 个百分点"）对应结果包里的负值，可接受。
"""

from __future__ import annotations

import re
from typing import Any, Iterable, Sequence

# 结果包里这些键下的字符串是标识符而非度量值，正文出现不应判为未引用数字。
IDENTIFIER_KEYS: tuple[str, ...] = ("bucketLabel", "largestBucketLabel", "positionId")

# 与结果包无关的固定搭配，出现在数字前就不是在陈述度量值。
_DATE_PATTERNS = (
    r"\d{4}[-/]\d{1,2}(?:[-/]\d{1,2})?",
    r"\d{4}年\d{1,2}月(?:\d{1,2}日)?",
    r"\d{4}年[末初]",
    r"(?<!\d)\d{1,2}月",
)
_ALPHANUMERIC_ID = re.compile(r"\b[A-Za-z]+-\d+\b")
_NUMBER = re.compile(r"(?<![A-Za-z0-9])[-+]?\d+(?:\.\d+)?(?![A-Za-z0-9])")
# 「均超过/高于/处于 N%」里的 N 是阈值，需双边 ratio 都超过并都被引用。
_THRESHOLD_PREFIX = re.compile(r"均(?:超|超过|高于|处于)$")
_THRESHOLD_SUFFIX = re.compile(r"%(?:以上)?")

_NEGATIVE_CUES_BEFORE = ("抵消", "拖累", "负向", "稀释", "下拉", "减弱")
_NEGATIVE_CUES_AFTER = ("负向影响", "负向贡献", "抵消作用", "抵消效应", "稀释效应")
_POSITIVE_CUE = "正向"

# 比较型结果包的引用路径约定：两条对比序列都要显式引用才算有据。
COMPARED_PATHS = ("comparedCurrencies.0.ratio", "comparedCurrencies.1.ratio")


def collect_identifier_keys(value: Any, keys: Sequence[str] = IDENTIFIER_KEYS) -> list[str]:
    """递归收集结果包里作为标识符的字符串（桶标签、头寸号等）。"""
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if key in keys and isinstance(child, str):
                found.append(child)
            elif isinstance(child, (dict, list)):
                found.extend(collect_identifier_keys(child, keys))
    elif isinstance(value, list):
        for child in value:
            found.extend(collect_identifier_keys(child, keys))
    return found


def strip_non_measurements(text: str, cited_identifiers: Iterable[str] = ()) -> str:
    """剥掉日期标签与已引用标识符，只留下可能是度量值的数字。"""
    cleaned = text
    for pattern in _DATE_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned)
    for identifier in sorted({item for item in cited_identifiers if item}, key=len, reverse=True):
        cleaned = cleaned.replace(identifier, "")
    cleaned = _ALPHANUMERIC_ID.sub("", cleaned)
    return cleaned.replace("−", "-").replace("－", "-")


def _is_threshold_claim_supported(
    stated: float,
    following: str,
    compared: Any,
    cited_paths: frozenset[str],
) -> bool:
    """「两币种均超过 N%」只有在两条 ratio 都 > N 且都被引用时才算有据。"""
    if not isinstance(compared, list) or len(compared) != 2:
        return False
    if not all(isinstance(item, dict) and isinstance(item.get("ratio"), (int, float)) for item in compared):
        return False
    if not all(item["ratio"] > stated for item in compared):
        return False
    return set(COMPARED_PATHS).issubset(cited_paths)


def find_unreferenced_numbers(
    texts: Iterable[str],
    *,
    source_values: Iterable[float],
    cited_identifiers: Iterable[str] = (),
    compared_currencies: Any = None,
    cited_paths: Iterable[str] = (),
) -> list[str]:
    """返回未引用数字的诊断码列表，空列表表示正文每个数字都有据。

    ``source_values`` 是 numericRefs 声明的数值集合；``cited_identifiers`` 是
    结果包里被引用、但本身不是度量值的字符串；``compared_currencies`` 与
    ``cited_paths`` 供比较型阈值语句做双边校验。
    """
    values = [value for value in source_values if isinstance(value, (int, float))]
    identifiers = list(cited_identifiers)
    paths = frozenset(cited_paths)
    problems: list[str] = []

    for raw_text in texts:
        cleaned = strip_non_measurements(raw_text, identifiers)
        for match in _NUMBER.finditer(cleaned):
            token = match.group()
            stated = float(token)
            decimals = len(token.split(".")[1]) if "." in token else 0
            preceding = cleaned[max(0, match.start() - 25):match.start()]
            following = cleaned[match.end():match.end() + 18]

            if _THRESHOLD_PREFIX.search(preceding) and _THRESHOLD_SUFFIX.match(following):
                if _is_threshold_claim_supported(stated, following, compared_currencies, paths):
                    continue
                problems.append(f"FALSE_CURRENCY_THRESHOLD:{token}")
                continue

            if any(round(value, decimals) == stated for value in values):
                continue

            # 负向措辞下的正数幅度：结果包里是负值，文案说"拖累 0.12 个百分点"合法。
            negative_magnitude = (
                not token.startswith(("-", "+"))
                and _POSITIVE_CUE not in preceding
                and (
                    any(cue in preceding for cue in _NEGATIVE_CUES_BEFORE)
                    or any(cue in following for cue in _NEGATIVE_CUES_AFTER)
                )
                and any(round(abs(value), decimals) == stated for value in values if value < 0)
            )
            if negative_magnitude:
                continue
            problems.append(f"UNREFERENCED_NUMBER:{token}")

    return problems
