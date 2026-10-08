"""吸收自 v2 的能力：基期、币种、频率、口径、跨轮会话。

这些能力同时是三条行内平台约束的落地点：

- ``no-silent-substitution``——指代不清或日期不存在时要求澄清/报错，
  **不得静默替换**成另一币种或最近日期（能力速查.md:47）
- ``scope-explicit-not-memory``——页面币种与对话关注币种分开保存，
  精确口径不靠聊天记忆（能力速查.md:46、:94）
- ``caliber-must-not-default``——非默认口径不得套用默认结果（能力速查.md:95）
"""

import asyncio
import re

import httpx
import pytest

from repricing_gap_workflow import analysis
from repricing_gap_workflow.server import SESSIONS, app
from repricing_gap_workflow.workflow import (
    base_date_in_question,
    classify,
    currencies_in_question,
    resolve_base_date,
    resolve_context,
)


SCOPE = {
    "metricCode": analysis.METRIC_CODE,
    "orgCode": analysis.ORG_CODE,
    "currencyCode": "CNY",
    "tenorCode": "1Y",
    "asOfDate": "2026-07-31",
}


def run(question="", *, session_id=None, **inputs):
    """sessionId 走请求体顶层（与开始节点入参并列），不是 inputs 内部。"""
    payload = {"inputs": {"scope": SCOPE, "question": question, **inputs}}
    if session_id:
        payload["sessionId"] = session_id

    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post("/v1/workflows/run", json=payload, headers={"X-Demo-User": "demo-analyst"})

    return asyncio.run(invoke())


# ---------------------------------------------------------------- 币种抽取


def test_currencies_in_question_accepts_names_and_codes():
    assert currencies_in_question("美元和港币相比如何") == ["USD", "HKD"]
    assert currencies_in_question("USD 与 HKD") == ["USD", "HKD"]
    assert currencies_in_question("人民币口径") == ["CNY"]


def test_currencies_in_question_dedupes_and_keeps_order():
    assert currencies_in_question("美元和美元比") == ["USD"]


def test_no_currency_mentioned_returns_empty():
    assert currencies_in_question("重定价缺口率为何上升") == []


# ---------------------------------------------------------------- 基期解析


def test_base_date_parses_last_year_end():
    assert base_date_in_question("和去年末相比", "2026-07-31", "MONTH") == "2025-12-31"


def test_base_date_parses_previous_period():
    assert base_date_in_question("较上一期变化", "2026-07-31", "MONTH") == "2026-06-30"


def test_base_date_respects_frequency():
    assert base_date_in_question("较上一期", "2026-07-31", "DAY") == "2026-07-30"


def test_base_date_parses_explicit_date():
    assert base_date_in_question("与2026-03-31比较", "2026-07-31", "MONTH") == "2026-03-31"


def test_base_date_returns_none_when_not_stated():
    assert base_date_in_question("为什么会上升", "2026-07-31", "MONTH") is None


def test_explicit_argument_wins_over_question():
    assert resolve_base_date("和去年末相比", "2026-07-31", "MONTH", explicit="2026-05-31") == "2026-05-31"


def test_session_base_used_when_question_does_not_state_one():
    assert resolve_base_date("为什么变化", "2026-07-31", "MONTH", session_base="2026-05-31") == "2026-05-31"


def test_falls_back_to_previous_comparable_period():
    assert resolve_base_date("为什么变化", "2026-07-31", "MONTH") == "2026-06-30"


def test_earliest_period_has_no_invented_previous():
    """最早时点没有上一期——不得凭空造一个基期。"""
    assert resolve_base_date("为什么变化", "2025-09-30", "MONTH") is None


# ------------------------------------------------- 不静默替换（平台硬约束）


def test_nonexistent_base_date_is_rejected_not_substituted():
    with pytest.raises(ValueError, match="INVALID_BASE_DATE"):
        resolve_base_date("为什么变化", "2026-07-31", "MONTH", explicit="2020-01-01")


def test_base_date_not_earlier_than_current_is_rejected():
    with pytest.raises(ValueError, match="INVALID_BASE_DATE"):
        resolve_base_date("为什么变化", "2026-07-31", "MONTH", explicit="2026-07-31")


def test_invalid_base_date_over_http_is_400_not_a_silent_retry():
    response = run("为什么变化", baseDate="2020-01-01")
    assert response.status_code == 400
    assert response.json()["errorCode"] == "INVALID_BASE_DATE"


def test_named_base_period_recomputes_attribution():
    body = run("与去年末相比为什么上升", analysisMode="attribution").json()
    assert body["analysisMode"] == "attribution"
    assert body["resolvedContext"]["baseDate"] == "2025-12-31"
    assert body["resultPackage"]["scope"]["baseDate"] == "2025-12-31"
    factors = body["resultPackage"]["factors"]
    total = sum(item["impactPctPoint"] for item in factors)
    assert abs(total - body["resultPackage"]["changePctPoint"]) < 1e-6


# ------------------------------------------------ 页面币种 vs 对话关注币种


def test_page_currency_is_untouched_by_followup():
    """从人民币追问美元，页面筛选币种不变，只是关注币种变了。"""
    body = run("美元为什么变化").json()
    resolved = body["resolvedContext"]
    assert resolved["pageCurrencyCode"] == "CNY"
    assert resolved["focusCurrencyCode"] == "USD"


def test_focus_currency_changes_the_result_not_the_page_scope():
    """结果包必须如实标注它算的是哪个币种——不能挂着 CNY 的 scope 报 USD 的数。"""
    body = run("美元为什么变化").json()
    assert body["resolvedContext"]["pageCurrencyCode"] == "CNY"
    assert body["resultPackage"]["scope"]["currencyCode"] == "USD"
    # "为什么变化" 走归因模式，比对字段用 currentRatio（概览模式才是 current.value）
    assert body["resultPackage"]["currentRatio"] != analysis.attribution()["currentRatio"]


def test_explicit_focus_currency_wins_over_question():
    body = run("它为什么变化", focusCurrencyCode="HKD").json()
    assert body["resolvedContext"]["focusCurrencyCode"] == "HKD"


def test_two_named_currencies_route_to_comparison():
    body = run("美元和港币相比如何").json()
    assert body["analysisMode"] == "currencyCompare"
    assert body["resolvedContext"]["comparedCurrencies"] == ["USD", "HKD"]


def test_currency_comparison_does_not_claim_one_is_riskier():
    body = run("美元和港币相比如何").json()
    assert body["narrative"] is not None
    text = json_text(body["narrative"])
    for forbidden in ("风险更高", "管理优先级", "合规空间", "敞口"):
        assert not asserted_not_denied(text, forbidden), f"把对比说成了 {forbidden}"


_CLAUSE_SPLIT = re.compile(r"[。；;，,\n]")


def asserted_not_denied(text: str, phrase: str) -> bool:
    """判断某措辞是否被**断言**，而不是出现在否定句里。

    ``不表示哪个币种风险更高`` 是合规的免责说明；``美元风险更高`` 是越界断言。
    判定方式是回溯到最近的子句边界找否定词——只看固定窗口会漏掉长距离否定
    （"不"可能隔了七八个字）。
    """
    for match in re.finditer(re.escape(phrase), text):
        prefix = text[:match.start()]
        clause = _CLAUSE_SPLIT.split(prefix)[-1]
        if not re.search(r"不|未|非|勿|无法|不能", clause):
            return True
    return False


def json_text(value):
    import json

    return json.dumps(value, ensure_ascii=False)


# ------------------------------------------------ 指代不清要求澄清


def test_ambiguous_pronoun_after_comparison_asks_for_clarification():
    first = run("美元和港币相比如何").json()
    second = run("它为什么变化", session_id=first["sessionId"]).json()
    assert second["analysisMode"] == "clarification"
    assert second["resolvedContext"]["ambiguousCurrency"] is True
    assert second["resultPackage"]["status"] == "needs_input"


def test_named_currency_after_comparison_resolves_without_clarification():
    first = run("美元和港币相比如何").json()
    second = run("美元为什么变化", session_id=first["sessionId"]).json()
    assert second["analysisMode"] != "clarification"
    assert second["resolvedContext"]["focusCurrencyCode"] == "USD"


# ------------------------------------------------ 跨轮会话只存受控小上下文


def test_session_carries_four_controlled_fields():
    body = run("美元和港币相比如何").json()
    session = SESSIONS[body["sessionId"]]
    for field in ("lastBusinessType", "focusCurrencyCode", "lastComparedCurrencies", "baseDate"):
        assert field in session, field
    # 不得回灌整轮 scope 或结果包
    assert "scope" not in session
    assert "resultPackage" not in session


def test_session_rejects_other_user():
    body = run("美元和港币相比如何").json()

    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post(
                "/v1/workflows/run",
                json={"inputs": {"scope": SCOPE, "question": "它呢"}, "sessionId": body["sessionId"]},
                headers={"X-Demo-User": "someone-else"},
            )

    assert asyncio.run(invoke()).status_code == 400


# ------------------------------------------------ 频率


def test_frequency_selects_available_dates():
    assert analysis.previous_date("2026-07-31", "MONTH") == "2026-06-30"
    assert analysis.previous_date("2026-07-31", "DAY") == "2026-07-30"


def test_unknown_frequency_is_rejected():
    with pytest.raises(ValueError, match="UNSUPPORTED_SCOPE:frequency"):
        resolve_context({"scope": {**SCOPE, "frequency": "WEEK"}})


def test_unknown_as_of_date_is_rejected():
    with pytest.raises(ValueError, match="UNKNOWN_DATA_DATE"):
        resolve_context({"scope": {**SCOPE, "asOfDate": "2020-01-01"}})


# ------------------------------------------------ 口径


def test_default_caliber_produces_calculation():
    body = run("分母怎么算").json()
    assert body["analysisMode"] == "calculation"
    assert body["resultPackage"]["scope"]["caliber"] == "DEFAULT"


def test_non_default_caliber_does_not_borrow_default_calculation():
    """非默认口径必须明确不可用，不得套用默认口径的计算树。

    注意是**显式的不可用状态**，不是 502——把口径不支持说成上游故障是误导。
    """

    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post(
                "/v1/workflows/run",
                json={"inputs": {"scope": {**SCOPE, "caliber": "EXACT_DAY"}, "question": "分母怎么算"}},
                headers={"X-Demo-User": "demo-analyst"},
            )

    result = asyncio.run(invoke())
    assert result.status_code == 200
    body = result.json()
    assert body["resultPackage"]["status"] == "unsupported"
    assert body["resultPackage"]["reason"] == "UNSUPPORTED_CALIBER"
    # 绝不能出现默认口径的计算树
    assert "node" not in body["resultPackage"]
    assert "children" not in body["resultPackage"]
    assert body["narrative"] is not None
    assert "口径" in body["narrative"]["headline"]


def test_unsupported_caliber_does_not_degrade_to_an_error():
    """不可用状态是正常应答，不该被记成模型降级。"""
    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post(
                "/v1/workflows/run",
                json={"inputs": {"scope": {**SCOPE, "caliber": "EXACT_DAY"}, "question": "重定价缺口率"}},
                headers={"X-Demo-User": "demo-analyst"},
            )

    body = asyncio.run(invoke()).json()
    assert "NARRATIVE_UNAVAILABLE" not in body["degradeFlags"]


def test_supported_calibers_are_declared():
    assert analysis.SUPPORTED_CALIBERS == (analysis.DEFAULT_CALIBER,)


# ------------------------------------------------ 限额不适用不得静默套用


def test_currency_without_limit_reports_not_applicable():
    rows = {row["currencyCode"]: row for row in analysis.currency_summary("2026-07-31")}
    assert rows["CNY"]["limit"]["applicable"] is True
    assert rows["HKD"]["limit"]["applicable"] is False
    assert rows["HKD"]["limit"]["reason"] == "DEMO_NO_SINGLE_CURRENCY_LIMIT"


def test_currency_summary_is_bounded_not_looped():
    """一次返回有界的币种摘要，不逐币种循环调 API。"""
    rows = analysis.currency_summary("2026-07-31")
    assert len(rows) == len(analysis.CURRENCIES)
    assert sum(row["sharePct"] for row in rows) == pytest.approx(100, abs=0.01)


# ------------------------------------------------ 分类器兼容


def test_classify_still_routes_legacy_modes():
    assert classify("重定价缺口率较上期为何上升？", None) == "attribution"
    assert classify("为什么分母不含内部交易？", None) == "methodology"
    assert classify("", None) == "overview"


def test_classify_rejects_unknown_requested_mode():
    with pytest.raises(ValueError, match="UNSUPPORTED_ANALYSIS_MODE"):
        classify("x", "not-a-mode")


# ------------------------------------------------ 分类兜底不许冒充确定答案
#
# 回归：分类不命中时默默兜底成 overview，而兜底后的文案语气是笃定的——
# 用户问"为啥涨"拿到"当前值 15.71%"，会以为那就是答案。答非所问却不自辩，
# 比"分错模式"更难发现。


def test_unrecognized_intent_returns_none_not_overview():
    from repricing_gap_workflow.workflow import classify as c

    assert c("帮我看看这个指标最近什么情况", None) is None
    assert c("这指标最近啥情况", None) is None
    assert c("随便看看", None) is None


def test_bare_metric_question_still_means_overview():
    """只提到指标名不属于"没听懂"——那是首次解读的自然表达。"""
    from repricing_gap_workflow.workflow import classify as c

    assert c("重定价缺口率", None) == "overview"
    assert c("重定价缺口率怎么样", None) == "overview"
    assert c("", None) == "overview"


def test_value_question_is_overview():
    from repricing_gap_workflow.workflow import classify as c

    assert c("现在重定价缺口率是多少？", None) == "overview"


def test_causal_paraphrases_are_attribution():
    """因果说法配变化类词一律归因，不因换了说法就掉进兜底。"""
    from repricing_gap_workflow.workflow import classify as c

    for question in ("美元为什么变化", "这期比上期涨了不少，是啥原因", "它为啥跌了", "怎么变的"):
        assert c(question, None) == "attribution", question


def test_unrecognized_intent_asks_instead_of_guessing():
    body = run("帮我看看这个指标最近什么情况").json()
    assert body["analysisMode"] == "clarification"
    assert body["resultPackage"]["status"] == "needs_input"
    assert body["resultPackage"]["clarifyReason"] == "intent"
    assert len(body["resultPackage"]["modeOptions"]) == 7


def test_clarification_says_it_did_not_understand():
    body = run("帮我看看这个指标最近什么情况").json()
    narrative = body["narrative"]
    assert narrative is not None, "澄清也要有文案，不能空白"
    assert "没听懂" in narrative["headline"]
    # 只看**正文**：结构化字段 modeOptions 里也有这些词，用它断言会掩盖正文坏掉
    prose = narrative["sections"][0]["text"]
    for expected in ("当前值", "限额", "走势", "为什么"):
        assert expected in prose, f"正文缺少可问方向 {expected}：{prose}"
    assert "label" not in prose, "正文把字段名当成了文案"
    # 绝不能同时报一个具体数字——报了就像是在作答
    assert "15.71" not in prose and "15.7" not in prose


def test_clarification_does_not_look_like_an_answer():
    """澄清包的正文里不应出现概览/归因的结论句式。"""
    body = run("帮我看看这个指标最近什么情况").json()
    text = json_text(body["narrative"])
    for claim in ("处于限额内", "已完成归因勾稽", "距离16.00%限额"):
        assert claim not in text, claim


def test_currency_clarification_and_intent_clarification_are_distinct():
    """两种"没听懂"要能分辨：币种指代不清 vs 意图没识别。"""
    first = run("美元和港币相比如何").json()
    by_currency = run("它为什么变化", session_id=first["sessionId"]).json()
    assert by_currency["resultPackage"].get("clarifyReason") == "currency"
    assert by_currency["resultPackage"].get("modeOptions") is None

    by_intent = run("帮我看看这个指标最近什么情况").json()
    assert by_intent["resultPackage"].get("clarifyReason") == "intent"
