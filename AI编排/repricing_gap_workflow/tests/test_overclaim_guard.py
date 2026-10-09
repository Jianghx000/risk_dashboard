"""语义越界门禁（``almcanvas.overclaim_guard``）的单元测试。

每条规则都测**两个方向**：该拦的拦住、该放过的放过。只测拒绝方向的门禁会误杀
合法的免责说明——尤其两条否定感知规则，固定窗口写法就会把"没有出现明显集中"
和"不能从桶规模推断集中度"全判成越界。
"""

import pytest

from almcanvas.overclaim_guard import (
    GuardContext,
    RULE_WHY,
    RULES,
    check_overclaims,
)


def guard(narrative, *, mode="overview", **result):
    return GuardContext(mode=mode, result=result, narrative=narrative)


def codes(narrative, *, mode="overview", **result):
    return check_overclaims(guard(narrative, mode=mode, **result))


# ---------------------------------------------------------------- 自检


def test_every_rule_explains_why_it_exists():
    assert RULE_WHY, "规则表不能为空"
    for rule in RULES:
        assert RULE_WHY[rule.code].strip(), f"{rule.code} 缺少说明"


def test_rule_codes_are_unique():
    codes_seen = [rule.code for rule in RULES]
    assert len(codes_seen) == len(set(codes_seen))


def test_clean_narrative_passes():
    assert codes("当前重定价缺口率为 15.71%，距离限额还有 0.29 个百分点。") == []


# ---------------------------------------------------------------- 矛盾符号


def test_positive_wording_with_minus_sign_is_rejected():
    assert "CONTRADICTORY_IMPACT_SIGN" in codes("资产端是正向影响-0.12个百分点。")


def test_positive_wording_with_plus_sign_is_accepted():
    assert codes("是正向影响+0.12个百分点。", mode="attribution") == []


def test_negative_wording_is_accepted():
    assert codes("是负向影响-0.12个百分点。", mode="attribution") == []


# ---------------------------------------------------------------- 限额措辞


def test_internal_limit_called_regulatory_is_rejected():
    assert "MANAGEMENT_LIMIT_MISLABELED" in codes("已触及监管限额。", limit={"value": 16.0})


def test_regulatory_wording_without_a_limit_is_not_flagged():
    """结果包没有限额时，提到"监管限额"不是误标——由别处兜。"""
    assert "MANAGEMENT_LIMIT_MISLABELED" not in codes("已触及监管限额。")


def test_plain_limit_wording_is_accepted():
    assert codes("距离限额还有 0.29 个百分点。", limit={"value": 16.0}) == []


def test_awkward_exceedance_wording_is_rejected():
    assert "AWKWARD_LIMIT_EXCEEDANCE" in codes("超出距离为 0.29 个百分点。", limit={"value": 16.0})


# ---------------------------------------------------------------- 技术元信息泄漏


@pytest.mark.parametrize("leak", ["数据包", "数据版本", "SYNTHETIC", "DEMO-ONLY", "口径版本"])
def test_technical_metadata_is_rejected(leak):
    assert "TECHNICAL_METADATA_LEAK" in codes(f"当前值如{leak}所示。")


def test_ordinary_wording_is_accepted():
    assert codes("当前值取自本次取数结果。") == []


# ---------------------------------------------------------------- 不可用结果


def test_technical_advice_on_unavailable_result_is_rejected():
    found = codes("请检查数据源配置。", status="unsupported")
    assert "UNAVAILABLE_RESULT_TECHNICAL_ADVICE" in found


def test_technical_advice_on_available_result_is_not_flagged():
    """结果正常时说同一句话不归这条管。"""
    assert "UNAVAILABLE_RESULT_TECHNICAL_ADVICE" not in codes("请检查数据源配置。", status="available")


def test_cross_period_claim_on_unavailable_result_is_rejected():
    assert "ATTRIBUTION_UNAVAILABLE_OVERCLAIM" in codes(
        "无法展示当期相对基期的变动。", status="unsupported"
    )


def test_graceful_unavailable_wording_is_accepted():
    assert codes("当前口径暂不支持该分析。", status="unsupported") == []


# ---------------------------------------------------------------- 预测与风险传导


@pytest.mark.parametrize("claim", ["下月继续上升", "必然超限", "净利息收入承压", "流动性风险加大"])
def test_forecast_and_risk_link_are_rejected(claim):
    assert "UNSUPPORTED_FORECAST_OR_RISK_LINK" in codes(claim)


def test_plain_risk_description_is_accepted():
    assert codes("该指标用于监控重定价缺口。") == []


# ---------------------------------------------------------------- 概览模式因果


def test_overview_causality_is_rejected():
    assert "OVERVIEW_CAUSALITY_WITHOUT_ATTRIBUTION" in codes("主要受资产端影响。")


def test_same_wording_in_attribution_mode_is_accepted():
    assert "OVERVIEW_CAUSALITY_WITHOUT_ATTRIBUTION" not in codes("主要受资产端影响。", mode="attribution")


# ---------------------------------------------------------------- 币种对比越界


def test_currency_comparison_overclaim_is_rejected():
    assert "CURRENCY_COMPARISON_OVERCLAIM" in codes("美元敞口更大。", mode="currencyCompare")


def test_currency_comparison_with_disclaimer_is_accepted():
    found = codes("这只是口径内的对比，不表示哪个币种风险更高，也不代表合规空间差异。", mode="currencyCompare")
    assert "CURRENCY_COMPARISON_OVERCLAIM" not in found


def test_currency_terms_allowed_in_other_modes():
    assert codes("美元敞口。", mode="overview") == []


# ---------------------------------------------------------------- 集中度（子句级否定感知）


LOW_SHARE = {"summary": {"largestBucketSharePct": 30.0}}
HIGH_SHARE = {"summary": {"largestBucketSharePct": 70.0}}


def test_concentration_claim_is_rejected_when_share_is_low():
    assert "DISTRIBUTION_CONCENTRATION_OVERCLAIM" in codes("3至6个月桶明显集中。", **LOW_SHARE)


def test_concentration_claim_is_allowed_when_share_is_high():
    assert "DISTRIBUTION_CONCENTRATION_OVERCLAIM" not in codes("3至6个月桶明显集中。", **HIGH_SHARE)


def test_negated_concentration_claim_is_accepted():
    """『没有出现明显集中』是合规表述，不能被固定窗口误杀。"""
    found = codes("各期限桶分布较为均衡，没有出现明显集中。", **LOW_SHARE)
    assert "DISTRIBUTION_CONCENTRATION_OVERCLAIM" not in found


def test_negation_in_earlier_clause_does_not_leak_forward():
    """否定词在**上一个**子句里，不该为下一个子句的断言背书。"""
    found = codes("没有出现明显集中。但 3至6个月桶明显集中。", **LOW_SHARE)
    assert "DISTRIBUTION_CONCENTRATION_OVERCLAIM" in found


@pytest.mark.parametrize("negation", ["未", "不能", "不可", "不代表", "不存在", "并非", "没有", "无", "非"])
def test_all_clause_negations_are_honored(negation):
    found = codes(f"{negation}明显集中。", **LOW_SHARE)
    assert "DISTRIBUTION_CONCENTRATION_OVERCLAIM" not in found, negation


# ---------------------------------------------------------------- 因果（句子级否定感知）


def test_causality_claim_is_rejected():
    assert "DISTRIBUTION_CAUSALITY_UNSUPPORTED" in codes("利率变动对该桶有即时影响。")


def test_negated_causality_claim_is_accepted():
    found = codes("不能从桶规模推断利率变动对该桶的即时影响。")
    assert "DISTRIBUTION_CAUSALITY_UNSUPPORTED" not in found


def test_negation_covers_later_clauses_of_the_same_sentence():
    """因果否定是**句子级**的：同一句里的后续分句仍受前半句否定保护。

    这与集中度的**子句级**否定是有意区分——因果是整句的推论，逗号后的断言
    仍属于同一个推理；集中度是局部的数值描述，所以分句即独立。
    """
    found = codes("不能从规模推断，但利率变动对整体有即时影响。")
    assert "DISTRIBUTION_CAUSALITY_UNSUPPORTED" not in found


def test_new_sentence_is_not_protected_by_previous_sentence_negation():
    found = codes("不能从规模推断。利率变动对整体有即时影响。")
    assert "DISTRIBUTION_CAUSALITY_UNSUPPORTED" in found


# ---------------------------------------------------------------- 分母方向


def test_denominator_direction_error_is_rejected():
    factors = [{"factorCode": "denominator", "baseValue": 1000.0, "currentValue": 1050.0}]
    assert "DENOMINATOR_DIRECTION_WRONG" in codes("总生息资产规模下降。", mode="attribution", factors=factors)


def test_denominator_actually_falling_is_accepted():
    factors = [{"factorCode": "denominator", "baseValue": 1050.0, "currentValue": 1000.0}]
    assert "DENOMINATOR_DIRECTION_WRONG" not in codes("总生息资产规模下降。", mode="attribution", factors=factors)


def test_direction_rule_ignored_without_factors():
    assert "DENOMINATOR_DIRECTION_WRONG" not in codes("总生息资产规模下降。", mode="attribution")


# ---------------------------------------------------------------- 业务规模措辞


def test_repricing_scale_called_loan_balance_is_rejected():
    assert "BUSINESS_REPRICING_SCALE_MISLABELED" in codes("自营贷款余额 330 亿元。")


def test_explicitly_negated_scale_wording_is_accepted():
    assert "BUSINESS_REPRICING_SCALE_MISLABELED" not in codes("该值不是贷款余额。")


@pytest.mark.parametrize("text", ["这是重定价规模，不是贷款余额或发放额变化。",
    "该取值并非贷款余额、发放额或资产占比。"])
def test_negated_enumeration_of_scale_terms_is_accepted(text):
    assert "BUSINESS_REPRICING_SCALE_MISLABELED" not in codes(text)


def test_scale_negation_does_not_cross_to_a_positive_claim():
    assert "BUSINESS_REPRICING_SCALE_MISLABELED" in codes("不是贷款余额，发放额为330亿元。")


# ---------------------------------------------------------------- 与 v1 校验的集成


def test_overclaim_rules_run_inside_validate_answer():
    from repricing_gap_workflow import analysis
    from repricing_gap_workflow.workflow import validate_answer

    result = analysis.overview()
    answer = {
        "headline": "重定价缺口率处于限额内",
        "sections": [
            {
                "text": f"当前值为{result['current']['value']:.2f}%，已触及监管限额。",
                "citations": ["current.value"],
            }
        ],
        "numericRefs": [{"path": "current.value", "value": result["current"]["value"]}],
    }
    # 数字有据，但说法越界——两��门禁各管各的。
    assert "MANAGEMENT_LIMIT_MISLABELED" in validate_answer(answer, result, mode="overview")


def test_overclaim_rules_skipped_when_mode_is_absent():
    """脱离模式不检查：别处调用 validate_answer 时不该被语义规则误伤。"""
    from repricing_gap_workflow import analysis
    from repricing_gap_workflow.workflow import validate_answer

    result = analysis.overview()
    answer = {
        "headline": "重定价缺口率处于限额内",
        "sections": [{"text": "已触及监管限额。", "citations": ["current.value"]}],
        "numericRefs": [{"path": "current.value", "value": result["current"]["value"]}],
    }
    assert "MANAGEMENT_LIMIT_MISLABELED" not in validate_answer(answer, result)
