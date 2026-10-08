"""质量回归入口接在 v1 图上，不依赖已退役的 v2 模块。"""

import asyncio

from repricing_gap_workflow.quality_eval import CASES, evaluate


def test_all_mock_cases_complete():
    reports = asyncio.run(evaluate(live=False))
    assert [item["case"] for item in reports] == list(CASES)
    for report in reports:
        assert report["turns"], report["case"]
        for turn in report["turns"]:
            assert turn["mode"], report["case"]


def test_unrecognized_intent_case_is_honest():
    report = asyncio.run(evaluate(["unrecognized_intent"], live=False))[0]
    turn = report["turns"][0]
    assert turn["mode"] == "clarification"
    assert "CLARIFICATION_LEAKS_NUMBER" not in turn["qualityFlags"]
    assert "没听懂" in (turn["answer"] or {}).get("headline", "")


def test_currency_ambiguous_case_asks_instead_of_guessing():
    report = asyncio.run(evaluate(["currency_ambiguous"], live=False))[0]
    assert report["turns"][0]["mode"] == "currencyCompare"
    assert report["turns"][1]["mode"] == "clarification"
