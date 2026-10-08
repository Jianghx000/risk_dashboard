"""合成数据上的解读质量回归入口。

设计沿用已退役的 v2 探针对：数据化场景、RecordingNarrator 留下被丢弃的草稿、
quality_flags 软指标。执行走当前 v1 图（``server.app`` + ``workflow.build_graph``）。

默认调百炼真实模型，并关闭模板兜底——质量信号不能被固定文案顶替。
只有 ``--mock`` 才用本地确定性模板、不读密钥。
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import time
from pathlib import Path
from typing import Any

import httpx

from . import analysis
from .server import _initial_state, _save_session, app
from .workflow import ChatNarrator, MockNarrator, build_graph
from .settings import load_model_settings


def scope(**overrides: str) -> dict:
    return {
        "metricCode": analysis.METRIC_CODE,
        "orgCode": analysis.ORG_CODE,
        "currencyCode": analysis.CURRENCY_CODE,
        "tenorCode": analysis.TENOR_CODE,
        "asOfDate": analysis.CURRENT_DATE,
        **overrides,
    }


CASES: dict[str, list[dict[str, Any]]] = {
    "overview": [{"question": "现在重定价缺口率是多少？"}],
    "initial_bare": [{"question": ""}],
    "limit": [{"question": "限额还有多少空间？"}],
    "trend": [{"question": "近几个月走势如何？"}],
    "attribution": [{"question": "重定价缺口率较上期为何上升？"}],
    "year_end_attribution": [{"question": "和去年末比为什么变化？"}],
    "calculation": [{"question": "这个比率怎么算出来的？", "nodeCode": "GAP"}],
    "business": [{"question": "自营贷款为什么影响大？"}],
    "methodology": [{"question": "为什么分母不含内部交易？"}],
    "currency_compare": [{"question": "美元和港币相比怎么样？"}],
    "currency_followup": [
        {"question": "现在重定价缺口率是多少？"},
        {"question": "美元为什么变化？"},
        {"question": "它为什么变化？"},
    ],
    "currency_ambiguous": [
        {"question": "美元和港币相比怎么样？"},
        {"question": "它为什么变化？"},
    ],
    "unsupported_caliber": [{
        "scope": scope(caliber="INCLUDE_DEMAND_DEPOSITS"),
        "question": "为什么变化？",
    }],
    "unrecognized_intent": [{"question": "帮我看看这个指标最近什么情况"}],
}


class RecordingNarrator:
    def __init__(self, delegate: MockNarrator | ChatNarrator) -> None:
        self.delegate = delegate
        self.drafts: list[dict] = []

    async def generate(self, mode: str, data: dict, question: str, errors: list[str]) -> dict:
        result = self.delegate.generate(mode, data, question, errors)
        answer = await result if hasattr(result, "__await__") else result
        self.drafts.append(answer)
        return answer


def quality_flags(mode: str, result: dict, answer: dict | None) -> list[str]:
    if answer is None:
        return ["NO_ANSWER"]
    text = "\n".join(
        [answer.get("headline") or ""]
        + [section.get("text") or "" for section in answer.get("sections") or [] if isinstance(section, dict)]
    )
    refs = {ref["path"] for ref in answer.get("numericRefs", []) if isinstance(ref, dict) and "path" in ref}
    flags = []
    if re.search(r"\d+\.\d{3,}", text):
        flags.append("EXCESS_DECIMALS")
    if re.search(r"监管(?:限额|阈值|红线)", text) and result.get("limit"):
        flags.append("MANAGEMENT_LIMIT_CALLED_REGULATORY")
    if any(word in text for word in ("下月继续", "下个月继续", "将直接触发", "必然超限")):
        flags.append("UNSUPPORTED_FORECAST")
    if re.search(r"正向(?:影响|贡献)[^。；，]*[-−]\d", text):
        flags.append("CONTRADICTORY_IMPACT_SIGN")
    if mode in {"overview", "limit"} and result.get("status") == "available":
        if "current.value" not in refs and "current.value" in json.dumps(result):
            flags.append("CURRENT_VALUE_NOT_REFERENCED")
        if result.get("limit", {}).get("applicable") and "限额" not in text:
            flags.append("LIMIT_NOT_EXPLAINED")
    if mode == "attribution" and result.get("status") == "available":
        if result.get("attributionMethod", "").startswith("SYNTHETIC") and "演示" not in text:
            flags.append("DEMO_ATTRIBUTION_NOT_LABELED")
        if "changePctPoint" not in refs and result.get("changePctPoint") is not None:
            flags.append("CHANGE_NOT_REFERENCED")
    if mode == "clarification" and result.get("clarifyReason") == "intent":
        if "没听懂" not in (answer.get("headline") or ""):
            flags.append("CLARIFICATION_NOT_HONEST")
        if re.search(r"\d+\.\d+", text):
            flags.append("CLARIFICATION_LEAKS_NUMBER")
    if mode == "business" and "归因" in text and not any(word in text for word in ("不能", "不可", "不代表", "仅", "演示")):
        flags.append("DETAIL_CAUSALITY_RISK")
    return flags


def _turn_payload(turn: dict[str, Any], session_id: str | None) -> dict:
    body = dict(turn)
    turn_scope = body.pop("scope", None) or scope()
    inputs = {"scope": turn_scope, **body}
    payload: dict[str, Any] = {"inputs": inputs}
    if session_id:
        payload["sessionId"] = session_id
    return payload


async def evaluate(case_names: list[str] | None = None, *, live: bool = True) -> list[dict]:
    names = case_names or list(CASES)
    if live:
        narrator = RecordingNarrator(ChatNarrator(load_model_settings()))
        allow_template_fallback = False
    else:
        narrator = RecordingNarrator(MockNarrator())
        allow_template_fallback = True
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        graph = build_graph(client, narrator, allow_template_fallback=allow_template_fallback)
        reports = []
        for name in names:
            session_id = None
            turns = []
            for request in CASES[name]:
                narrator.drafts = []
                started = time.monotonic()
                payload = _turn_payload(request, session_id)
                initial = _initial_state(payload, "demo-analyst", payload.get("sessionId"))
                state = await graph.ainvoke(initial)
                session_id = _save_session(state, "demo-analyst", session_id)
                answer = state.get("narrative")
                turns.append({
                    "question": request.get("question") or "首次解读",
                    "mode": state.get("mode"),
                    "context": {
                        key: (state.get("resolved_context") or {}).get(key)
                        for key in ("pageCurrencyCode", "focusCurrencyCode", "currentDate", "baseDate", "frequency")
                    },
                    "answer": answer,
                    "drafts": list(narrator.drafts),
                    "validationErrors": state.get("validation_errors") or [],
                    "degradeFlags": state.get("degrade_flags") or [],
                    "qualityFlags": quality_flags(state.get("mode") or "", state.get("result_package") or {}, answer),
                    "seconds": round(time.monotonic() - started, 2),
                })
            reports.append({"case": name, "turns": turns})
        return reports


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", action="append", choices=list(CASES))
    parser.add_argument("--mock", action="store_true", help="离线确定性模板，不调模型")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    reports = asyncio.run(evaluate(args.case, live=not args.mock))
    for report in reports:
        for turn in report["turns"]:
            flags = ",".join(turn["qualityFlags"]) or "OK"
            print(f"{report['case']} | {turn['mode']} | {turn['answer'] is not None} | {flags}")
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding="utf-8")
        print(args.output)


if __name__ == "__main__":
    main()
