"""通用答案整形（``almcanvas.answer_shape``）的单元测试。

整形发生在**校验之前**：模型把 ``trend[0].value`` 写成下标、把
``scope.actualDataDate`` 当顶层路径、把 ``numericRefs`` 塞进 section，
这些是形状不一致而非编造数字，应先归一再校验。
"""

from almcanvas.answer_shape import normalize_model_answer, to_dot_path
from repricing_gap_workflow.workflow import validate_answer


# ---------------------------------------------------------------- 路径归一


def test_to_dot_path_converts_bracket_index():
    assert to_dot_path("trend[0].value") == "trend.0.value"
    assert to_dot_path("rows[2].children[1].label") == "rows.2.children.1.label"


def test_to_dot_path_leaves_plain_paths_alone():
    assert to_dot_path("current.value") == "current.value"


def test_scope_alias_is_flattened():
    answer = normalize_model_answer(
        {
            "headline": "h",
            "sections": [{"text": "t", "citations": ["scope.actualDataDate", "current.value"]}],
            "numericRefs": [{"path": "scope.actualDataDate", "value": "2026-07-31"}],
        }
    )
    assert answer["sections"][0]["citations"] == ["actualDataDate", "current.value"]
    assert answer["numericRefs"][0]["path"] == "actualDataDate"


def test_aliases_are_configurable_per_metric():
    """其他指标的结果包嵌套不同，别名必须能在装配处覆盖。"""
    answer = normalize_model_answer(
        {"sections": [{"citations": ["meta.asOf"]}], "numericRefs": []},
        path_aliases={"meta.asOf": "asOf"},
    )
    assert answer["sections"][0]["citations"] == ["asOf"]


# ---------------------------------------------------------------- numericRefs 上提


def test_section_numeric_refs_are_hoisted_without_changing_values():
    answer = normalize_model_answer(
        {
            "headline": "h",
            "sections": [
                {"text": "t", "citations": ["current.value"], "numericRefs": [{"path": "current.value", "value": 1.5}]}
            ],
            "numericRefs": [],
        }
    )
    assert answer["numericRefs"] == [{"path": "current.value", "value": 1.5}]
    assert "numericRefs" not in answer["sections"][0]


def test_top_level_refs_are_preserved_and_ordered():
    answer = normalize_model_answer(
        {
            "sections": [{"citations": [], "numericRefs": [{"path": "b", "value": 2}]}],
            "numericRefs": [{"path": "a", "value": 1}],
        }
    )
    assert [ref["path"] for ref in answer["numericRefs"]] == ["a", "b"]


def test_non_list_numeric_refs_is_coerced_to_empty_list():
    answer = normalize_model_answer({"sections": [], "numericRefs": "oops"})
    assert answer["numericRefs"] == []


def test_missing_numeric_refs_key_is_added():
    assert normalize_model_answer({"sections": []})["numericRefs"] == []


def test_non_dict_input_passes_through():
    assert normalize_model_answer("not a dict") == "not a dict"
    assert normalize_model_answer(None) is None


def test_malformed_sections_are_skipped():
    answer = normalize_model_answer({"sections": ["oops", {"citations": ["a"]}], "numericRefs": []})
    assert answer["sections"][1]["citations"] == ["a"]


# ---------------------------------------------------------------- 与校验的组合
#
# 这是整形存在的理由：归一后的答案应能通过原本会失败的校验。


# 与真实取数结果包同形：actualDataDate 由 server._tool_response 写在**顶层**，
# scope 里另有 asOfDate。模型常把 scope.actualDataDate 当顶层路径引用，故需别名。
RESULT = {
    "current": {"value": 15.71},
    "trend": [{"value": 12.75}, {"value": 15.71}],
    "actualDataDate": "2026-07-31",
    "scope": {"asOfDate": "2026-07-31"},
}


def test_normalized_answer_passes_validation_that_raw_shape_would_fail():
    raw = {
        "headline": "指标上升",
        "sections": [
            {
                "text": "当前为 15.71%",
                "citations": ["current.value", "trend[0].value", "scope.actualDataDate"],
            }
        ],
        "numericRefs": [{"path": "current.value", "value": 15.71}, {"path": "trend[0].value", "value": 12.75}],
    }
    # 整形前：下标路径与 scope 路径都解析不到。
    assert validate_answer(raw, RESULT) != []
    # 整形后：同样的引用能通过。
    assert validate_answer(normalize_model_answer(raw), RESULT) == []


def test_normalization_does_not_launder_invented_numbers():
    """整形只改形状，不改数值——编造的数字仍然被拦。"""
    raw = {
        "headline": "指标上升",
        "sections": [{"text": "当前为 15.71%，另有 999", "citations": ["current.value"]}],
        "numericRefs": [{"path": "current.value", "value": 15.71}],
    }
    errors = validate_answer(normalize_model_answer(raw), RESULT)
    assert "UNREFERENCED_NUMBER:999" in errors
