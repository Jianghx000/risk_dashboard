"""通用叙事门禁（``almcanvas.narrative_guard``）的单元测试。

这层逻辑原先埋在 ``workflow.py`` 的 ``validate_answer`` 里，抽到 ``almcanvas``
后可被所有指标共用，因此需要独立覆盖——尤其是原先**从未被 v1 测试触及**的分支：
比较型币种阈值、负向措辞的幅度逃生口、结果包里的数字型标识符。
"""

from almcanvas.narrative_guard import (
    collect_identifier_keys,
    find_unreferenced_numbers,
    strip_non_measurements,
)


# ---------------------------------------------------------------- 标识符收集


def test_collect_identifier_keys_walks_nested_structures():
    package = {
        "rows": [
            {"bucketLabel": "3至6个月", "amount": 1},
            {"children": [{"largestBucketLabel": "6至12个月"}]},
        ],
        "records": [{"positionId": "8801234"}],
        "unrelated": {"label": "不该被收集"},
    }
    found = collect_identifier_keys(package)
    assert "3至6个月" in found
    assert "6至12个月" in found
    assert "8801234" in found
    assert "不该被收集" not in found


def test_numeric_identifier_is_stripped_before_comparison():
    """纯数字的 positionId 若不剥离会被误判为未引用数字。"""
    texts = ["该头寸 8801234 的规模为 100"]
    without = find_unreferenced_numbers(texts, source_values=[100.0])
    with_id = find_unreferenced_numbers(
        texts, source_values=[100.0], cited_identifiers=collect_identifier_keys({"records": [{"positionId": "8801234"}]})
    )
    assert without == ["UNREFERENCED_NUMBER:8801234"]
    assert with_id == []


# ---------------------------------------------------------------- 非度量值剥离


def test_date_labels_are_not_measurements():
    """日期里的数字不得被当成度量值——只留真正的度量值参与比对。"""
    assert find_unreferenced_numbers(
        ["2026-07 法人人民币1Y 的重定价缺口率为 12.5%"], source_values=[12.5]
    ) == []


def test_chinese_month_labels_are_not_measurements():
    assert find_unreferenced_numbers(["2026年5月至7月 重定价缺口率为 12.5%"], source_values=[12.5]) == []


def test_strip_removes_all_month_and_year_tokens():
    cleaned = strip_non_measurements("2026年5月至7月 为 12.5%")
    assert "2026" not in cleaned and "月" not in cleaned
    assert "12.5" in cleaned


def test_alphanumeric_position_ids_are_not_measurements():
    assert strip_non_measurements("LOAN-1001 规模 30") == " 规模 30"


def test_cited_identifier_is_removed_longest_first():
    """先剥长标识符，否则短标识符会先把长标识符截断。"""
    cleaned = strip_non_measurements("涉及 ABC-1234 与 ABC-12 两笔", ["ABC-1234", "ABC-12"])
    assert "ABC" not in cleaned


# ---------------------------------------------------------------- 正向命中


def test_cited_number_passes():
    assert find_unreferenced_numbers(["当前为 12.50%"], source_values=[12.5]) == []


def test_tolerance_uses_stated_decimal_places():
    assert find_unreferenced_numbers(["约为 12.5000%"], source_values=[12.5]) == []


# ---------------------------------------------------------------- 未引用数字


def test_invented_number_is_rejected():
    assert find_unreferenced_numbers(["指标当前为 999%"], source_values=[]) == ["UNREFERENCED_NUMBER:999"]


def test_negative_value_itself_may_be_stated():
    assert find_unreferenced_numbers(["变化 -0.12 个百分点"], source_values=[-0.12]) == []


# ---------------------------------------------------------------- 负向措辞逃生口


def test_negative_magnitude_is_accepted_with_negative_wording():
    """结果包里是 -0.12，文案说『拖累 0.12 个百分点』是合法表述。"""
    for cue in ("拖累", "抵消", "负向", "稀释", "下拉", "减弱"):
        assert find_unreferenced_numbers([f"{cue} 0.12 个百分点"], source_values=[-0.12]) == [], cue


def test_negative_magnitude_is_accepted_with_suffix_cue():
    for cue in ("负向影响", "负向贡献", "抵消作用", "抵消效应", "稀释效应"):
        assert find_unreferenced_numbers([f"0.12 个百分点{cue}"], source_values=[-0.12]) == [], cue


def test_positive_wording_with_negative_value_is_rejected():
    assert find_unreferenced_numbers(["贡献 0.12 个百分点"], source_values=[-0.12]) == ["UNREFERENCED_NUMBER:0.12"]


def test_signed_negative_token_is_not_treated_as_magnitude():
    """带负号的写法不该走幅度逃生口，而应直接按结果包比对。"""
    assert find_unreferenced_numbers(["拖累 -0.12 个百分点"], source_values=[-0.12]) == []


# ---------------------------------------------------------------- 比较型阈值


def _compared(ratios):
    return [{"ratio": ratio} for ratio in ratios]


def test_threshold_claim_accepted_when_both_sides_above_and_cited():
    assert (
        find_unreferenced_numbers(
            ["两币种均超过15%"],
            source_values=[16.0, 17.0],
            compared_currencies=_compared([16.0, 17.0]),
            cited_paths={"comparedCurrencies.0.ratio", "comparedCurrencies.1.ratio"},
        )
        == []
    )


def test_threshold_claim_rejected_when_one_side_not_above():
    problems = find_unreferenced_numbers(
        ["两币种均超过15%"],
        source_values=[16.0, 14.0],
        compared_currencies=_compared([16.0, 14.0]),
        cited_paths={"comparedCurrencies.0.ratio", "comparedCurrencies.1.ratio"},
    )
    assert problems == ["FALSE_CURRENCY_THRESHOLD:15"]


def test_threshold_claim_rejected_when_both_not_above():
    problems = find_unreferenced_numbers(
        ["两币种均超过15%"],
        source_values=[14.0, 13.0],
        compared_currencies=_compared([14.0, 13.0]),
        cited_paths={"comparedCurrencies.0.ratio", "comparedCurrencies.1.ratio"},
    )
    assert problems == ["FALSE_CURRENCY_THRESHOLD:15"]


def test_threshold_claim_rejected_when_ratios_not_both_cited():
    """只引用一边不足以支撑『均超过』这种双边断言。"""
    problems = find_unreferenced_numbers(
        ["两币种均超过15%"],
        source_values=[16.0],
        compared_currencies=_compared([16.0, 17.0]),
        cited_paths={"comparedCurrencies.0.ratio"},
    )
    assert problems == ["FALSE_CURRENCY_THRESHOLD:15"]


def test_threshold_claim_rejected_without_comparison_package():
    problems = find_unreferenced_numbers(["两币种均超过15%"], source_values=[])
    assert problems == ["FALSE_CURRENCY_THRESHOLD:15"]


def test_threshold_claim_accepted_for_above_suffix():
    assert (
        find_unreferenced_numbers(
            ["两币种均超过15%以上"],
            source_values=[],
            compared_currencies=_compared([16.0, 17.0]),
            cited_paths={"comparedCurrencies.0.ratio", "comparedCurrencies.1.ratio"},
        )
        == []
    )


# ---------------------------------------------------------------- 输入健壮性


def test_empty_inputs_are_clean():
    assert find_unreferenced_numbers([], source_values=[]) == []


def test_non_numeric_source_values_are_ignored():
    assert find_unreferenced_numbers(["当前为 12.5%"], source_values=["abc", None, 12.5]) == []
