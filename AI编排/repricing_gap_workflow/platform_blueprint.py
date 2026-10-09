"""行内平台复刻蓝图：从 spec v1 派生，供实时复刻图页面与测试使用。

事实源是 ``AI编排/metrics/repricing_gap/blueprint.spec.json``（spec-schema v1）。
本文件只保留三段**可粘贴脚本/Prompt 文本**（供"复制后粘进行内平台"）与一个适配器；
节点职责、变量绑定、输入输出、差异说明一律以 spec 为准，不再在本文件重复维护。
"""

from __future__ import annotations

import json
from pathlib import Path

from almcanvas import registry
from almcanvas.portable_answer import build_answer_script
from .prompts import platform_prompt


PROMPT_TEXT = platform_prompt()
ANSWER_SCRIPT = build_answer_script()


SPEC_PATH = Path(__file__).resolve().parent.parent / "metrics" / "repricing_gap" / "blueprint.spec.json"

# 兼容旧调用方：复刻图页面与测试读的是这里的形状，spec 是唯一事实源。
_SPEC_TO_LEGACY_ID = {"__end__": "end"}


def load_spec(metric: str | None = None) -> dict:
    return registry.get(metric).spec


# Compatibility exports read the exact executable definition, not stale duplicate scripts.
CONTEXT_SCRIPT = next(n for n in load_spec()["nodes"] if n["id"] == "context")["config"]["code"]
PACKAGE_SCRIPT = next(n for n in load_spec()["nodes"] if n["id"] == "package")["config"]["code"]


def get_blueprint(metric: str | None = None) -> dict:
    """从 spec v1 派生出实时复刻图要用的形状。

    事实源是 ``AI编排/metrics/<metric>/blueprint.spec.json``（手工维护，
    由 ``almcanvas.registry`` 发现）；本函数只做字段改名
    （``name``→``title``、``inlineType``→``type``、``__end__``→``end``），
    不持有任何内容。
    """
    spec = load_spec(metric)
    nodes = []
    for item in spec["nodes"]:
        node = {
            "id": _SPEC_TO_LEGACY_ID.get(item["id"], item["id"]),
            "title": item["name"],
            "type": item["inlineType"],
            "runtime": item.get("impl", ""),
            "purpose": item["summary"],
            "configure": item.get("configure") or [],
            "inputs": item.get("inputs") or [],
            "outputs": item.get("outputs") or [],
            "sourceSection": item.get("sourceSection", ""),
            "readiness": item.get("readiness", ""),
            "config": item["config"],
            "failureRouting": item.get("failureRouting", ""),
            "inlineMigration": item.get("inlineMigration", ""),
        }
        if item["id"] == "start":
            node["fields"] = [
                [row["name"], row["type"], row.get("desc", "").split("；")[0], ""]
                for row in item.get("inputs") or []
            ]
            node["output"] = "；".join(f"{row['name']}（{row['type']}）" for row in item.get("outputs") or [])
        if item["config"].get("code"):
            node["code"] = item["config"]["code"]
        if item["config"].get("systemPrompt"):
            node["prompt"] = item["config"]["systemPrompt"]
        nodes.append(node)

    edges = []
    for item in spec.get("edges") or []:
        target = _SPEC_TO_LEGACY_ID.get(item["to"], item["to"])
        row = [item["from"], target]
        if item.get("label"):
            row.append(item["label"])
        edges.append(row)

    open_items = [
        note["body"]
        for note in spec.get("inlineNotes") or []
        if note.get("severity") == "warning"
    ]
    return {
        "title": "重定价缺口率 AI 分析 - 行内平台逐节点复刻",
        "source": "AI编排/行内AI工作流平台.docx",
        "scope": "单指标试点：法人、人民币、1Y。正式上线需按 ALM 后端授权范围扩展。",
        "readiness": "可复刻编排；正式 ALM API 注册、权限和平台实测仍待完成",
        "nodes": nodes,
        "openItems": open_items,
        "edges": edges,
        # 页面文案由 spec 提供，通用页面不得写死指标名或指标业务概念。
        "pageInfo": {
            key: spec["meta"].get(key, "")
            for key in ("displayName", "sessionNote", "reentryNote", "canvasNote")
        },
    }
