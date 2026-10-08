import asyncio

from simple_workflow_demo.graph import graph


def run(question: str) -> dict:
    return asyncio.run(graph.ainvoke({"question": question}))


def test_overview_path():
    result = run("现在重定价缺口率是多少？")
    assert result["route"] == "overview"
    assert result["path"] == ["receive_question", "classify_intent", "fetch_overview", "write_answer"]
    assert result["data"]["value"] == 12.35
    assert "12.35%" in result["answer"]
    assert "限额" not in result["answer"]


def test_limit_path():
    result = run("限额还有多少空间？")
    assert result["route"] == "limit"
    assert result["path"] == ["receive_question", "classify_intent", "fetch_limit", "write_answer"]
    assert result["data"]["distancePctPoint"] == 3.65
    assert "3.65个百分点" in result["answer"]


def test_empty_question_defaults_to_overview():
    result = run("")
    assert result["route"] == "overview"
    assert result["question"] == "现在重定价缺口率是多少？"
