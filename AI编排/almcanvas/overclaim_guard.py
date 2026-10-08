"""语义门禁：不让模型把演示数据说成正式结论、也不让它做无依据的断言。

数值回填门禁（``narrative_guard``）管的是"这个数字有没有依据"；本模块管的是
**"这句话的口气有没有越界"**。两者性质不同：数字可以对但说法错（"监管限额"说
成"内部限额"、"美元风险更高"），数字错但说法无害。行内平台要求"正式指标计算、
Owen 归因、权限由后端完成，模型与脚本不承担"（能力速查.md:53），所以越界表述
必须在门禁层拦住，而不是靠提示词祈祷。

最有价值的是两条**否定感知**规则：它们回溯到最近的子句/句子边界再找否定词，
因此"没有出现明显集中"不会误判成"断言明显集中"，"不能从桶规模推断集中度"也不会
被当成因果断言。固定窗口的写法会把这两种合规表述全部误杀。
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, Iterable, Sequence

# 否定词：子句级与句子级分开，宽松程度不同（子句更短，否定作用域更小）。
CLAUSE_NEGATIONS = ("未", "不能", "不可", "不代表", "不存在", "并非", "没有", "无", "非")
SENTENCE_NEGATIONS = ("不能", "不可", "无法", "并非", "不代表", "不得")

_CLAUSE_MARKS = "。；，,\n"
_SENTENCE_MARKS = "。；\n"


@dataclass(frozen=True)
class GuardContext:
    """语义门禁的输入：模式、结果包、拼好的正文。"""

    mode: str
    result: dict
    narrative: str


def _context_before(text: str, index: int, marks: str) -> str:
    """回溯到最近一个边界标记之后的子串（即该子句/句子的开头部分）。"""
    starts = [text.rfind(mark, 0, index) for mark in marks]
    return text[max(starts) + 1:index]


def _clause_before(text: str, index: int) -> str:
    return _context_before(text, index, _CLAUSE_MARKS)


def _sentence_before(text: str, index: int) -> str:
    return _context_before(text, index, _SENTENCE_MARKS)


def _asserts(term: str, narrative: str, negations: Sequence[str], *, scoped) -> bool:
    """某个断言词是否被**断言**（而非出现在否定句里）。"""
    for match in re.finditer(re.escape(term), narrative):
        if not any(word in scoped(narrative, match.start()) for word in negations):
            return True
    return False


def _contains_any(narrative: str, words: Iterable[str]) -> bool:
    return any(word in narrative for word in words)


# ---------------------------------------------------------------- 规则实现

TechnicalLeak = ("数据包", "数据版本", "口径版本", "系统返回状态", "SYNTHETIC", "DEMO-ONLY")
FORECAST_OR_RISK_LINK = (
    "下月继续", "下个月继续", "将直接触发", "必然超限",
    "净利息收入", "流动性结构变化", "流动性风险",
)
CURRENCY_COMPARISON_FORBIDDEN = (
    "整体风险影响", "管理优先级", "敞口", "约束更严",
    "错配压力", "对全行", "对整体", "合规空间",
)
CONCENTRATION_CLAIMS = ("为主", "明显集中", "高度集中", "占主导", "主导期限")
CAUSALITY_CLAIMS = ("利率变动对", "利率波动对", "即时影响", "重定价敏感性")
SCALE_MISLABELS = ("贷款余额", "发放额", "资产占比")
SCALE_NEGATIONS = ("非", "不是", "并非", "不等于")

_CONTRADICTORY_SIGN = re.compile(r"正向(?:影响|贡献)[^。；，]*[-−]\d")
_MANAGEMENT_LIMIT = re.compile(r"监管(?:限额|阈值|红线)")


def _contradictory_impact_sign(ctx: GuardContext) -> bool:
    """说"正向影响"却带着负号——自相矛盾。"""
    return _CONTRADICTORY_SIGN.search(ctx.narrative) is not None


def _management_limit_mislabeled(ctx: GuardContext) -> bool:
    """把内部限额说成监管限额/阈值/红线。"""
    return bool(ctx.result.get("limit")) and _MANAGEMENT_LIMIT.search(ctx.narrative) is not None


def _awkward_limit_exceedance(ctx: GuardContext) -> bool:
    return "超出距离" in ctx.narrative


def _technical_metadata_leak(ctx: GuardContext) -> bool:
    """把数据包/版本号/演示标记等内部信息写进给用户看的文案。"""
    return _contains_any(ctx.narrative, TechnicalLeak)


def _unavailable_technical_advice(ctx: GuardContext) -> bool:
    """结果本身不可用时，不该给"去检查数据源配置"这类运维建议。"""
    if ctx.result.get("status") not in {"unsupported", "unavailable"}:
        return False
    return _contains_any(ctx.narrative, ("数据源配置", "接口配置", "系统提示", "检查数据源"))


def _attribution_unavailable_overclaim(ctx: GuardContext) -> bool:
    """结果不可用时，不得声称给出了跨期变动。"""
    if ctx.result.get("status") not in {"unsupported", "unavailable"}:
        return False
    return _contains_any(ctx.narrative, ("无法展示当期相对基期的变动", "无法展示跨期变动"))


def _unsupported_forecast_or_risk_link(ctx: GuardContext) -> bool:
    """预测与风险传导不是本工作流能支撑的结论。"""
    return _contains_any(ctx.narrative, FORECAST_OR_RISK_LINK)


def _overview_causality_without_attribution(ctx: GuardContext) -> bool:
    """概览模式没有归因依据，不该出现因果表述。"""
    if ctx.mode != "overview":
        return False
    return _contains_any(ctx.narrative, ("资产端", "负债端", "主要受"))


def _currency_comparison_overclaim(ctx: GuardContext) -> bool:
    """币种对比不得越界到风险/优先级判断。

    与集中度规则一样做**子句级否定感知**：v2 原实现是纯子串匹配，会把
    "不代表存在合规空间差异" 这种免责说明也判成越界。
    """
    if ctx.mode != "currencyCompare":
        return False
    for term in CURRENCY_COMPARISON_FORBIDDEN:
        if _asserts(term, ctx.narrative, CLAUSE_NEGATIONS, scoped=_clause_before):
            return True
    return False


def _concentration_overclaim(ctx: GuardContext) -> bool:
    """集中度不足 50% 时不得断言"明显集中"——子句级否定感知。"""
    share = (ctx.result.get("summary") or {}).get("largestBucketSharePct")
    if share is None or share >= 50:
        return False
    for claim in CONCENTRATION_CLAIMS:
        if _asserts(claim, ctx.narrative, CLAUSE_NEGATIONS, scoped=_clause_before):
            return True
    return False


def _distribution_causality_unsupported(ctx: GuardContext) -> bool:
    """不得由桶规模推断利率因果——句子级否定感知。"""
    for claim in CAUSALITY_CLAIMS:
        if _asserts(claim, ctx.narrative, SENTENCE_NEGATIONS, scoped=_sentence_before):
            return True
    return False


def _denominator_direction_wrong(ctx: GuardContext) -> bool:
    """分母实际在上升，文案却说"总生息资产规模下降"。"""
    if ctx.mode != "attribution":
        return False
    denominator = next(
        (item for item in ctx.result.get("factors", []) if item.get("factorCode") == "denominator"),
        None,
    )
    if not denominator:
        return False
    rising = denominator.get("currentValue", 0) > denominator.get("baseValue", 0)
    return rising and "总生息资产规模下降" in ctx.narrative


def _business_scale_mislabeled(ctx: GuardContext) -> bool:
    """重定价规模不是贷款余额/发放额——短距离否定感知。"""
    for claim in SCALE_MISLABELS:
        for match in re.finditer(re.escape(claim), ctx.narrative):
            window = ctx.narrative[max(0, match.start() - 4):match.start()]
            if not any(word in window for word in SCALE_NEGATIONS):
                return True
    return False


# ---------------------------------------------------------------- 规则表

@dataclass(frozen=True)
class SemanticRule:
    code: str
    why: str
    detect: Callable[[GuardContext], bool]
    modes: frozenset[str] | None = None


RULES: tuple[SemanticRule, ...] = (
    SemanticRule("CONTRADICTORY_IMPACT_SIGN", "说正向影响却带负号", _contradictory_impact_sign),
    SemanticRule("MANAGEMENT_LIMIT_MISLABELED", "内部限额被说成监管限额", _management_limit_mislabeled),
    SemanticRule("AWKWARD_LIMIT_EXCEEDANCE", "『超出距离』语义不成立", _awkward_limit_exceedance),
    SemanticRule("TECHNICAL_METADATA_LEAK", "把数据包/版本/演示标记写进用户文案", _technical_metadata_leak),
    SemanticRule("UNAVAILABLE_RESULT_TECHNICAL_ADVICE", "结果不可用却给运维建议", _unavailable_technical_advice),
    SemanticRule("ATTRIBUTION_UNAVAILABLE_OVERCLAIM", "结果不可用却声称给了跨期变动", _attribution_unavailable_overclaim),
    SemanticRule("UNSUPPORTED_FORECAST_OR_RISK_LINK", "预测或风险传导超出可支撑范围", _unsupported_forecast_or_risk_link),
    SemanticRule("OVERVIEW_CAUSALITY_WITHOUT_ATTRIBUTION", "概览模式出现无依据的因果表述", _overview_causality_without_attribution),
    SemanticRule("CURRENCY_COMPARISON_OVERCLAIM", "币种对比越界到风险/优先级判断", _currency_comparison_overclaim),
    SemanticRule("DISTRIBUTION_CONCENTRATION_OVERCLAIM", "集中度不足却断言明显集中（子句级否定感知）", _concentration_overclaim),
    SemanticRule("DISTRIBUTION_CAUSALITY_UNSUPPORTED", "由桶规模推断利率因果（句子级否定感知）", _distribution_causality_unsupported),
    SemanticRule("DENOMINATOR_DIRECTION_WRONG", "分母在上升却说下降", _denominator_direction_wrong),
    SemanticRule("BUSINESS_REPRICING_SCALE_MISLABELED", "重定价规模被说成贷款余额/发放额", _business_scale_mislabeled),
)

RULE_WHY: dict[str, str] = {rule.code: rule.why for rule in RULES}


def check_overclaims(ctx: GuardContext) -> list[str]:
    """返回越界表述的诊断码；空列表表示没有越界。"""
    return [rule.code for rule in RULES if rule.detect(ctx)]
