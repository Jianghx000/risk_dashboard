"""行内平台复刻蓝图：从 spec v1 派生，供实时复刻图页面与测试使用。

事实源是 ``AI编排/metrics/repricing_gap/blueprint.spec.json``（spec-schema v1）。
本文件只保留三段**可粘贴脚本/Prompt 文本**（供"复制后粘进行内平台"）与一个适配器；
节点职责、变量绑定、输入输出、差异说明一律以 spec 为准，不再在本文件重复维护。
"""

from __future__ import annotations

import json
from pathlib import Path

from almcanvas import registry


CONTEXT_SCRIPT = '''def handler(params):
    metric = (params.get("metricCode") or "").strip()
    org = (params.get("orgCode") or "").strip()
    currency = (params.get("currencyCode") or "").strip()
    tenor = (params.get("tenorCode") or "").strip()
    date = (params.get("asOfDate") or "").strip()
    question = (params.get("question") or "").strip()
    if not all((metric, org, currency, tenor, date)):
        raise ValueError("MISSING_SCOPE")
    if metric != "REPRICING_GAP_RATIO":
        raise ValueError("UNSUPPORTED_METRIC")
    modes = (
        "overview", "limit", "trend", "calculation", "attribution",
        "business", "methodology", "clarification", "currencyCompare",
    )
    mode = (params.get("analysisMode") or "").strip()
    if mode and mode not in modes:
        raise ValueError("UNSUPPORTED_ANALYSIS_MODE")
    if not mode:
        q = question
        last_business = (params.get("lastBusinessType") or "").strip()
        business_names = ("自营贷款", "投资类资产", "同业资产", "定期存款", "同业负债")
        if not q:
            mode = "overview"
        elif last_business and any(word in q for word in ("它", "这个业务", "这类业务")):
            mode = "business"
        elif any(name in q for name in business_names) and any(
            word in q for word in ("为什么", "原因", "新增", "退出", "大额", "业务")
        ):
            mode = "business"
        elif any(word in q for word in ("限额", "超限", "空间", "预警")):
            mode = "limit"
        elif any(word in q for word in ("口径", "剔除", "不含", "定义")):
            mode = "methodology"
        elif any(word in q for word in ("怎么算", "计算过程", "分子", "分母", "构成", "公式")):
            mode = "calculation"
        elif any(word in q for word in (
            "归因", "导致", "变动原因", "影响因素", "啥原因", "什么原因", "怎么变", "咋变", "咋回事"
        )) or (
            any(word in q for word in ("为什么", "为何", "为啥"))
            and any(word in q for word in ("上升", "下降", "上涨", "下跌", "涨", "跌", "变化", "变动", "不一样"))
        ):
            mode = "attribution"
        elif any(word in q for word in ("走势", "趋势", "波动", "近几个月")):
            mode = "trend"
        elif any(word in q for word in ("是多少", "多高", "现在多少", "当前多少")):
            mode = "overview"
        else:
            leftover = q.replace("重定价缺口率", "")
            filler = set(
                " ，,。？?！!的了吧呢啊呀请帮我看看一下现在目前请问哈怎么样咋样"
                "什么情况啥情况最近怎么样呢"
            )
            if not "".join(ch for ch in leftover if not ch.isspace() and ch not in filler):
                mode = "overview"
            else:
                mode = "clarification"
    business = (params.get("businessType") or "").strip() or (params.get("lastBusinessType") or "").strip()
    if not business:
        for name in ("自营贷款", "投资类资产", "同业资产", "定期存款", "同业负债"):
            if name in question:
                business = name
                break
    return {
        "metricCode": metric, "orgCode": org, "currencyCode": currency,
        "tenorCode": tenor, "asOfDate": date,
        "baseDate": (params.get("baseDate") or "").strip(),
        "question": question, "analysisMode": mode,
        "businessType": business or "自营贷款",
        "nodeCode": (params.get("nodeCode") or "ROOT").strip(),
    }'''


PACKAGE_SCRIPT = '''def handler(params):
    import json
    result = params.get("apiResponse") or {}
    if result.get("returnCode") != "SUC0000":
        raise ValueError(result.get("errorCode") or "ALM_API_FAILED")
    body = result.get("body") or {}
    actual = body.get("scope") or {}
    for key in ("metricCode", "orgCode", "currencyCode", "tenorCode", "asOfDate"):
        if actual.get(key) != params.get(key):
            raise ValueError("SCOPE_MISMATCH_" + key)
    if body.get("status") != "available":
        raise ValueError("DATA_NOT_AVAILABLE")
    if not body.get("dataVersion") or not body.get("caliberVersion"):
        raise ValueError("VERSION_MISSING")
    if len(json.dumps(body, ensure_ascii=False)) > 16000:
        raise ValueError("PACKAGE_TOO_LARGE")
    return {"resultPackage": body}'''


PROMPT_TEXT = '''你是ALM风险指标解读助手。只依据本次取数结果回答，不使用记忆中的数字。
分析模式：${analysisMode}
用户问题：${question}
结果包：${resultPackage}

只输出一个JSON对象，不要Markdown代码块：
{"headline":"简短结论","sections":[{"text":"解释","citations":["字段路径"]}],"numericRefs":[{"path":"字段路径","value":原始数值}]}
字段路径相对于结果包根节点，不要加resultPackage前缀；数组下标用点号，例如trend.0.value。
每段至少一条有效引用。正文中的每个金额、比例、百分点必须引用结果包原值，不自行计算。
最多两段，每段不超过70字。归因只写总变化和影响最大的两个因素。
若method或attributionMethod含SYNTHETIC，必须说明演示性质，不能写成正式ALM归因。
业务明细只是线索，不得声称逐笔正式归因；业务标题不写演示影响百分点。
如果结果包无法回答某个问题，明确说明范围，不补造数据。'''


ANSWER_SCRIPT = '''def handler(params):
    import json
    import re
    raw = params.get("narrativeRaw") or ""
    data = params.get("resultPackage") or {}
    errors = []
    try:
        answer = json.loads(raw.strip().removeprefix("```json").removesuffix("```").strip())
    except (TypeError, ValueError):
        answer = None
        errors.append("INVALID_JSON")
    def resolve(path):
        value = data
        for segment in path.split("."):
            value = value[int(segment)] if isinstance(value, list) else value[segment]
        return value
    if isinstance(answer, dict):
        if not isinstance(answer.get("headline"), str):
            errors.append("INVALID_HEADLINE")
        sections = answer.get("sections")
        refs = answer.get("numericRefs")
        if not isinstance(sections, list) or not sections:
            errors.append("MISSING_SECTIONS")
            sections = []
        if not isinstance(refs, list):
            errors.append("INVALID_NUMERIC_REFS")
            refs = []
        for section in sections:
            if not isinstance(section, dict) or not isinstance(section.get("text"), str) or not section.get("citations"):
                errors.append("INVALID_SECTION")
                continue
            for path in section["citations"]:
                try:
                    resolve(path)
                except (KeyError, IndexError, TypeError, ValueError):
                    errors.append("INVALID_CITATION")
        values = []
        for ref in refs:
            try:
                actual = resolve(ref["path"])
                if actual != ref["value"]:
                    errors.append("NUMERIC_MISMATCH")
                if isinstance(actual, (int, float)):
                    values.append(actual)
            except (KeyError, IndexError, TypeError, ValueError):
                errors.append("INVALID_NUMERIC_REF")
        text = answer.get("headline", "") + " " + " ".join(
            section.get("text", "") for section in sections if isinstance(section, dict)
        )
        text = re.sub(r"\\d{4}[-/]\\d{1,2}(?:[-/]\\d{1,2})?", "", text)
        text = re.sub(r"\\d{4}年\\d{1,2}月(?:\\d{1,2}日)?", "", text)
        text = re.sub(r"(?<!\\d)\\d{1,2}月", "", text)
        text = re.sub(r"\\b[A-Za-z]+-\\d+\\b", "", text)
        for match in re.finditer(r"(?<![A-Za-z0-9])[-+]?\\d+(?:\\.\\d+)?(?![A-Za-z0-9])", text):
            stated = float(match.group())
            decimals = len(match.group().split(".")[1]) if "." in match.group() else 0
            if not any(round(value, decimals) == stated for value in values):
                errors.append("UNREFERENCED_NUMBER")
        if str(data.get("attributionMethod", "")).startswith("SYNTHETIC"):
            if "百分点" in answer.get("headline", ""):
                errors.append("ILLUSTRATIVE_IMPACT_IN_HEADLINE")
            for section in sections:
                if isinstance(section, dict) and "illustrativeImpactPctPoint" in section.get("citations", []):
                    if "演示" not in section.get("text", ""):
                        errors.append("ILLUSTRATIVE_IMPACT_UNLABELED")
    else:
        errors.append("INVALID_SCHEMA")
    return {
        "narrative": answer if not errors else None,
        "validationErrors": errors,
        "degradeFlags": ["NARRATIVE_VALIDATION_FAILED"] if errors else [],
    }'''


SPEC_PATH = Path(__file__).resolve().parent.parent / "metrics" / "repricing_gap" / "blueprint.spec.json"

# 兼容旧调用方：复刻图页面与测试读的是这里的形状，spec 是唯一事实源。
_SPEC_TO_LEGACY_ID = {"__end__": "end"}


def load_spec(metric: str | None = None) -> dict:
    return registry.get(metric).spec


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
