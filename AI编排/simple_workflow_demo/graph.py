"""A small LangGraph demo: classify a question, fetch one data pack, write an answer."""

from __future__ import annotations

from typing import Literal, TypedDict

from langgraph.graph import END, START, StateGraph


class DemoState(TypedDict, total=False):
    question: str
    route: Literal["overview", "limit"]
    data: dict
    answer: str
    path: list[str]


SAMPLE = {
    "metric": "重定价缺口率",
    "asOfDate": "2026-07-31",
    "value": 12.35,
    "unit": "%",
    "limit": 16.00,
    "distancePctPoint": 3.65,
}


def receive_question(state: DemoState) -> dict:
    question = (state.get("question") or "").strip() or "现在重定价缺口率是多少？"
    return {"question": question, "path": ["receive_question"]}


def classify_intent(state: DemoState) -> dict:
    question = state["question"]
    route: Literal["overview", "limit"] = "limit" if any(
        word in question for word in ("限额", "超限", "空间", "预警")
    ) else "overview"
    return {"route": route, "path": [*state.get("path", []), "classify_intent"]}


def route_after_classify(state: DemoState) -> str:
    return "fetch_limit" if state.get("route") == "limit" else "fetch_overview"


def fetch_overview(state: DemoState) -> dict:
    data = {
        "kind": "overview",
        "metric": SAMPLE["metric"],
        "asOfDate": SAMPLE["asOfDate"],
        "value": SAMPLE["value"],
        "unit": SAMPLE["unit"],
    }
    return {"data": data, "path": [*state.get("path", []), "fetch_overview"]}


def fetch_limit(state: DemoState) -> dict:
    data = {
        "kind": "limit",
        "metric": SAMPLE["metric"],
        "asOfDate": SAMPLE["asOfDate"],
        "value": SAMPLE["value"],
        "limit": SAMPLE["limit"],
        "distancePctPoint": SAMPLE["distancePctPoint"],
        "unit": SAMPLE["unit"],
    }
    return {"data": data, "path": [*state.get("path", []), "fetch_limit"]}


def write_answer(state: DemoState) -> dict:
    data = state["data"]
    if data["kind"] == "limit":
        answer = (
            f"{data['asOfDate']} {data['metric']}为{data['value']:.2f}{data['unit']}，"
            f"限额{data['limit']:.2f}{data['unit']}，距离限额还有{data['distancePctPoint']:.2f}个百分点。"
        )
    else:
        answer = f"{data['asOfDate']} {data['metric']}为{data['value']:.2f}{data['unit']}。"
    return {"answer": answer, "path": [*state.get("path", []), "write_answer"]}


def build_graph():
    graph = StateGraph(DemoState)
    graph.add_node("receive_question", receive_question)
    graph.add_node("classify_intent", classify_intent)
    graph.add_node("fetch_overview", fetch_overview)
    graph.add_node("fetch_limit", fetch_limit)
    graph.add_node("write_answer", write_answer)
    graph.add_edge(START, "receive_question")
    graph.add_edge("receive_question", "classify_intent")
    graph.add_conditional_edges(
        "classify_intent",
        route_after_classify,
        {"fetch_overview": "fetch_overview", "fetch_limit": "fetch_limit"},
    )
    graph.add_edge("fetch_overview", "write_answer")
    graph.add_edge("fetch_limit", "write_answer")
    graph.add_edge("write_answer", END)
    return graph.compile()


graph = build_graph()

NODE_VIEW = [
    {"id": "receive_question", "index": "01", "label": "接收问题", "kind": "开始", "detail": "整理输入，空问题走默认概览"},
    {"id": "classify_intent", "index": "02", "label": "识别意图", "kind": "路由", "detail": "按关键词分成概览或限额"},
    {"id": "fetch_overview", "index": "03A", "label": "取概览数据", "kind": "数据", "detail": "当前指标值", "branch": "overview"},
    {"id": "fetch_limit", "index": "03B", "label": "取限额数据", "kind": "数据", "detail": "指标值、限额和剩余空间", "branch": "limit"},
    {"id": "write_answer", "index": "04", "label": "生成回答", "kind": "结束", "detail": "只用本轮取到的数字写一句话"},
]
