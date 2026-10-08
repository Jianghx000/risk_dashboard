"""Platform-shaped LangGraph workflow for the repricing gap AI entry."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, TypedDict

import httpx
from langgraph.graph import END, START, StateGraph

from aiworkflow import conditions, workflow_check
from almcanvas.answer_shape import normalize_model_answer
from almcanvas.overclaim_guard import GuardContext, check_overclaims
from almcanvas.narrative_guard import collect_identifier_keys, find_unreferenced_numbers

from . import analysis
from .analysis import CURRENCY_CODE, CURRENT_DATE, DEFAULT_BASE_DATE, METRIC_CODE, ORG_CODE, TENOR_CODE


MODES = {"overview", "limit", "trend", "calculation", "attribution", "business", "methodology", "currencyCompare", "clarification"}
# 这些状态不是错误，是"这一轮答不了"的合法应答；要让模型用自然语言解释，
# 而不是让 validate_package 把整条编排打断。
PASS_THROUGH_STATUSES = frozenset({"needs_input", "unsupported", "unavailable"})

# 降级标记：把"这一轮的文案是怎么来的"写进结果里，调用方不能靠猜。
DEGRADE_NARRATIVE_UNAVAILABLE = "NARRATIVE_UNAVAILABLE"
DEGRADE_NARRATIVE_VALIDATION_FAILED = "NARRATIVE_VALIDATION_FAILED"
# live 模式：模型不可用或连续输出不合规 —— 绝不拿模板顶替。
DEGRADE_LIVE_MODEL_UNAVAILABLE = "LIVE_MODEL_UNAVAILABLE"
DEGRADE_LIVE_MODEL_OUTPUT_INVALID = "LIVE_MODEL_OUTPUT_INVALID"
# mock 模式：模型输出不合规时用确定性模板兜底（兜底结果**重新过校验**）。
DEGRADE_TEMPLATE_FALLBACK = "MODEL_OUTPUT_INVALID_USED_TEMPLATE"
ANALYSIS_API_PATH = "/mock/analysis/query"
LOGGER = logging.getLogger(__name__)

# 追问里出现"它/这个业务"等指代时，需要会话里有可恢复的对象才解析得动，
# 否则必须要求澄清——不得静默套用上一轮的默认对象。
AMBIGUOUS_BUSINESS_WORDS = ("它", "这个业务", "这类业务")
AMBIGUOUS_CURRENCY_WORDS = ("它", "这个币种", "那个币种")

# 分类不命中时给用户的可选项。兜底必须是"我没听懂 + 你可以问什么"，
# 绝不能是拿概览冒充针对他问题的答案——那是最难被发现的一类错。
MODE_OPTIONS = (
    ("overview", "当前值与限额情况"),
    ("limit", "还剩多少限额空间"),
    ("trend", "近几个月的走势"),
    ("calculation", "这个比率怎么算出来的"),
    ("attribution", "为什么上升或下降"),
    ("business", "哪类业务带来的变化"),
    ("methodology", "口径与剔除项说明"),
)
_YEAR_END = re.compile(r"去年末")
# ① 本身即因果
_SELF_SUFFICIENT_CAUSAL = ("归因", "导致", "变动原因", "影响因素", "啥原因", "什么原因", "怎么变", "咋变", "咋回事")
# ② 需要搭配变化词
_CAUSAL_PREFIX = ("为什么", "为何", "为啥")
_CHANGE_WORDS = ("上升", "下降", "上涨", "下跌", "涨", "跌", "变化", "变动", "不一样")
_EXPLICIT_BASE = re.compile(r"(?:与|和|较|比)\s*(20\d{2})[-/](\d{1,2})[-/](\d{1,2})")
_CURRENCY_ALIASES = {"人民币": "CNY", "美元": "USD", "港币": "HKD", "港元": "HKD"}


def currencies_in_question(question: str) -> list[str]:
    """按出现顺序去重抽取币种（中文名与代码都认）。"""
    found: list[str] = []
    for token, code in list(_CURRENCY_ALIASES.items()) + [(c, c) for c in analysis.CURRENCIES]:
        if token in question and code not in found:
            found.append(code)
    return found


def base_date_in_question(question: str, current_date: str, frequency: str) -> str | None:
    """从中文问题里解析基期：去年末 / 上一期 / 显式日期。解析不出返回 None。"""
    if _YEAR_END.search(question):
        year = int(current_date[:4]) - 1
        return f"{year}-12-31"
    if "上一期" in question or "上期" in question:
        return analysis.previous_date(current_date, frequency)
    match = _EXPLICIT_BASE.search(question)
    if match:
        year, month, day = (int(part) for part in match.groups())
        return f"{year:04d}-{month:02d}-{day:02d}"
    return None


def resolve_base_date(
    question: str,
    current_date: str,
    frequency: str,
    *,
    explicit: str | None = None,
    session_base: str | None = None,
) -> str | None:
    """基期解析阶梯，按优先级取第一个有值的来源。

    显式入参 → 问题里说的（去年末/上一期/具体日期）→ 会话恢复 → 上一可比期。
    解析出来但**不在可用数据日、或不早于当期**时直接报错，不静默替换成最近日期
    （行内AI工作流平台能力速查.md:47）。
    """
    base = explicit or base_date_in_question(question, current_date, frequency) or session_base
    if base is None:
        base = analysis.previous_date(current_date, frequency)
    if base and (base not in analysis.available_dates(frequency) or base >= current_date):
        raise ValueError("INVALID_BASE_DATE")
    return base


def resolve_context(inputs: dict[str, Any]) -> dict[str, Any]:
    """校验范围并解析本轮的显式上下文。

    返回值会作为 ``resolvedContext`` 下发，让"解析器决定了什么"可被观察和测试，
    而不是只藏在文案里。页面币种与对话关注币种**分开**保存：用户从人民币追问美元
    再问"它"，关注币种是美元，但页面筛选币种不变（能力速查.md:46）。
    """
    scope = inputs.get("scope") or {}
    expected = {"metricCode": METRIC_CODE, "orgCode": ORG_CODE, "tenorCode": TENOR_CODE}
    for key, value in expected.items():
        if scope.get(key) != value:
            raise ValueError(f"UNSUPPORTED_SCOPE:{key}")

    page_currency = scope.get("currencyCode", CURRENCY_CODE)
    if page_currency not in analysis.CURRENCIES:
        raise ValueError(f"UNSUPPORTED_SCOPE:currencyCode")

    frequency = scope.get("frequency") or "MONTH"
    if frequency not in analysis.FREQUENCIES:
        raise ValueError("UNSUPPORTED_SCOPE:frequency")

    caliber = scope.get("caliber") or analysis.DEFAULT_CALIBER

    current_date = scope.get("asOfDate", CURRENT_DATE)
    if current_date not in analysis.available_dates(frequency):
        raise ValueError("UNKNOWN_DATA_DATE")

    question = inputs.get("question") or ""
    base_date = resolve_base_date(
        question,
        current_date,
        frequency,
        explicit=inputs.get("baseDate"),
        session_base=inputs.get("lastBaseDate"),
    )

    mentioned = currencies_in_question(question)
    compared = inputs.get("comparedCurrencies") or (mentioned if len(mentioned) == 2 else None)
    if compared is not None and len(compared) != 2:
        raise ValueError("TWO_CURRENCIES_REQUIRED")

    if compared:
        # 比较两个币种时"对话关注对象"不是其中之一，焦点仍是页面币种。
        focus_currency = page_currency
    else:
        # 优先级：请求显式入参 > 问题里点名的 > 会话恢复的 > 页面默认。
        # 会话恢复值不能压过用户本轮明确点名的币种——那等于悄悄改了用户问的对象。
        focus_currency = (
            inputs.get("focusCurrencyCode")
            or (mentioned[0] if mentioned else None)
            or inputs.get("sessionFocusCurrencyCode")
            or page_currency
        )
    if focus_currency not in analysis.CURRENCIES:
        raise ValueError("UNSUPPORTED_CURRENCY")

    # 指代不清必须要求澄清，不得静默沿用上一轮的比较对象。
    ambiguous_currency = bool(
        inputs.get("lastComparedCurrencies")
        and not mentioned
        and any(word in question for word in AMBIGUOUS_CURRENCY_WORDS)
    )

    return {
        "pageCurrencyCode": page_currency,
        "focusCurrencyCode": focus_currency,
        "currentDate": current_date,
        "baseDate": base_date,
        "frequency": frequency,
        "caliber": caliber,
        "comparedCurrencies": compared,
        "ambiguousCurrency": ambiguous_currency,
    }


class WorkflowState(TypedDict, total=False):
    """公共键与 ``aiworkflow.graph_kit`` 第 19-21 行枚举的范式契约一致。

    业务键：``inputs``（开始节点入参）、``user``、``followup``、``mode``、
    ``result_package``、``narrative``、``data_validated``。
    公共键：``emit``/``session_id``/``fault``/``degrade_flags``/``regen_count``/
    ``regenerated``/``llm_failed``/``fault_injected``/``validation_errors``/
    ``failed``。

    ``degrade_flags`` 保持读-改-写（与共享包 ``aiworkflow`` 逐字一致），未加
    ``operator.add`` reducer：本图是严格线性链（``workflow_check`` 装配期强制
    无回边、无并行分支），LastValue 语义下不会丢标记。一旦将来引入并行分支，
    必须同时把 ``graph_kit``/本文件的三处读-改-写改成只返回增量。
    """

    # 业务键
    inputs: dict[str, Any]
    user: str
    followup: bool
    mode: str
    resolved_context: dict[str, Any]
    result_package: dict[str, Any]
    narrative: dict[str, Any] | None
    clarify_reason: str
    data_validated: bool
    # 公共键
    emit: Callable[[str], None]
    session_id: str
    fault: str
    degrade_flags: list[str]
    regen_count: int
    regenerated: bool
    llm_failed: bool
    fault_injected: bool
    validation_errors: list[str]
    failed: dict[str, Any] | None


_METRIC_NAME = "重定价缺口率"
# 只是客套/泛问、不表达具体意图的词。剥掉后若问题里什么都不剩，说明用户只是
# 点了指标名进来（首次解读），不该回"没听懂"。
_FILLER = re.compile(
    r"[\s，,。？?！!的了吧呢啊呀请帮我看看一下现在目前请问哈怎么样咋样"
    r"什么情况啥情况最近怎么样呢]"
)


def _is_bare_metric_question(question: str) -> bool:
    """只提到指标名本身、没有可识别的意图——按首次解读处理。"""
    without_metric = question.replace(_METRIC_NAME, "")
    return not _FILLER.sub("", without_metric)


def classify(
    question: str,
    requested_mode: str | None,
    last_business_type: str | None = None,
    resolved_context: dict[str, Any] | None = None,
) -> str | None:
    """把问题分到七种模式之一。

    返回 ``None`` 表示**没有识别出问题类型**——调用方应转为澄清，而不是
    默默兜底成 overview：兜底后的文案语气是笃定的，用户会以为那就是答案，
    而实际答非所问。这是比"分错模式"更隐蔽的一类错。
    """
    if requested_mode:
        if requested_mode not in MODES:
            raise ValueError("UNSUPPORTED_ANALYSIS_MODE")
        return requested_mode
    q = question.strip()
    if not q:
        return "overview"
    resolved = resolved_context or {}
    # 明确点名两个币种 → 比较模式；页面币种不因追问而改变。
    if resolved.get("comparedCurrencies"):
        return "currencyCompare"
    if last_business_type and any(word in q for word in AMBIGUOUS_BUSINESS_WORDS):
        return "business"
    if any(word in q for word in ("自营贷款", "投资类资产", "同业资产", "定期存款", "同业负债")) and any(
        word in q for word in ("为什么", "原因", "新增", "退出", "大额", "业务")
    ):
        return "business"
    if any(word in q for word in ("限额", "超限", "空间", "预警")):
        return "limit"
    if any(word in q for word in ("口径", "剔除", "不含", "定义")):
        return "methodology"
    if any(word in q for word in ("怎么算", "计算过程", "分子", "分母", "构成", "公式")):
        return "calculation"
    # 因果类说法归因。分两类：
    # ① 本身即因果的说法（"啥原因""怎么变"），单条就够；
    # ② "为什么/为何/为啥"必须搭配涨跌变化词——"为什么限额是16"问的是口径不是归因。
    if any(word in q for word in _SELF_SUFFICIENT_CAUSAL) or (
        any(word in q for word in _CAUSAL_PREFIX) and any(word in q for word in _CHANGE_WORDS)
    ):
        return "attribution"
    if any(word in q for word in ("走势", "趋势", "波动", "近几个月")):
        return "trend"
    if any(word in q for word in ("是多少", "多高", "现在多少", "当前多少")):
        return "overview"
    # 只提到指标名、或明显是在闲聊/确认 → 按概览答，不算"没听懂"。
    if _is_bare_metric_question(q):
        return "overview"
    return None


def _business_type(question: str, explicit: str | None) -> str:
    if explicit:
        return explicit
    for name in ("自营贷款", "投资类资产", "同业资产", "定期存款", "同业负债"):
        if name in question:
            return name
    return "自营贷款"


def _node_code(question: str, explicit: str | None) -> str:
    if explicit:
        return explicit
    if "分母" in question or "总生息资产" in question:
        return "DENOMINATOR"
    if "资产端" in question:
        return "ASSETS"
    if "负债端" in question:
        return "LIABILITIES"
    if "缺口" in question or "分子" in question:
        return "GAP"
    return "ROOT"


def _resolve_path(document: dict, path: str) -> Any:
    value: Any = document
    for segment in path.split("."):
        if isinstance(value, dict):
            value = value[segment]
        elif isinstance(value, list) and segment.isdigit():
            value = value[int(segment)]
        else:
            raise KeyError(path)
    return value


def validate_answer(answer: dict, result: dict, *, mode: str | None = None) -> list[str]:
    errors: list[str] = []
    if not isinstance(answer, dict) or not isinstance(answer.get("headline"), str):
        return ["INVALID_ANSWER_SCHEMA"]
    sections = answer.get("sections")
    if not isinstance(sections, list) or not sections:
        errors.append("MISSING_SECTIONS")
    else:
        for section in sections:
            if not isinstance(section, dict) or not isinstance(section.get("text"), str):
                errors.append("INVALID_SECTION")
                continue
            if not isinstance(section.get("citations"), list) or not section["citations"]:
                errors.append("MISSING_CITATIONS")
                continue
            for path in section["citations"]:
                try:
                    _resolve_path(result, path)
                except (KeyError, IndexError, TypeError):
                    errors.append(f"INVALID_CITATION:{path}")
    refs = answer.get("numericRefs")
    if not isinstance(refs, list):
        errors.append("INVALID_NUMERIC_REFS")
    else:
        for ref in refs:
            if not isinstance(ref, dict) or "path" not in ref or "value" not in ref:
                errors.append("INVALID_NUMERIC_REF")
                continue
            try:
                actual = _resolve_path(result, ref["path"])
            except (KeyError, IndexError, TypeError):
                errors.append(f"INVALID_NUMERIC_PATH:{ref['path']}")
                continue
            if isinstance(actual, (int, float)) and isinstance(ref["value"], (int, float)):
                if abs(actual - ref["value"]) > 1e-6:
                    errors.append(f"NUMERIC_MISMATCH:{ref['path']}")
            elif actual != ref["value"]:
                errors.append(f"VALUE_MISMATCH:{ref['path']}")
    if isinstance(refs, list) and all(isinstance(item, dict) for item in refs):
        source_values = [item.get("value") for item in refs if isinstance(item.get("value"), (int, float))]
        cited_identifiers = []
        if isinstance(sections, list):
            for section in sections:
                if not isinstance(section, dict) or not isinstance(section.get("citations"), list):
                    continue
                for path in section["citations"]:
                    try:
                        value = _resolve_path(result, path)
                    except (KeyError, IndexError, TypeError):
                        continue
                    if isinstance(value, str) and any(char.isdigit() for char in value):
                        cited_identifiers.append(value)
        cited_identifiers.extend(collect_identifier_keys(result))
        texts = [answer.get("headline", "")]
        if isinstance(sections, list):
            texts.extend(item.get("text", "") for item in sections if isinstance(item, dict))
        errors.extend(
            find_unreferenced_numbers(
                texts,
                source_values=source_values,
                cited_identifiers=cited_identifiers,
                compared_currencies=result.get("comparedCurrencies"),
                cited_paths={item.get("path") for item in refs},
            )
        )
    if result.get("attributionMethod", "").startswith("SYNTHETIC"):
        if "百分点" in answer.get("headline", ""):
            errors.append("ILLUSTRATIVE_IMPACT_IN_HEADLINE")
        if isinstance(sections, list):
            for section in sections:
                if isinstance(section, dict) and "illustrativeImpactPctPoint" in section.get("citations", []):
                    if "演示" not in section.get("text", ""):
                        errors.append("ILLUSTRATIVE_IMPACT_UNLABELED")
    # 语义越界门禁：数字有据不代表说法成立（"监管限额""美元风险更高"）。
    # 给了 mode 才检查——脱离模式的规则会把合法的免责说明也误杀。
    if mode is not None:
        narrative = "\n".join(
            [answer.get("headline", "")]
            + [item.get("text", "") for item in (sections or []) if isinstance(item, dict)]
        )
        errors.extend(check_overclaims(GuardContext(mode=mode, result=result, narrative=narrative)))
    return errors


class MockNarrator:
    """Deterministic stand-in for a platform Prompt node; never calls a model."""

    def generate(self, mode: str, data: dict, question: str, errors: list[str]) -> dict:
        def section(text: str, *paths: str) -> dict:
            return {"text": text, "citations": list(paths)}

        def ref(path: str) -> dict:
            return {"path": path, "value": _resolve_path(data, path)}

        # 非 available 的结果包是**合法应答**，要能自然语言说明"这一轮答不了"，
        # 而不是让它掉进下面的模式分支去取不存在的字段。
        if data.get("status") == "unsupported":
            return {
                "headline": "当前口径暂不支持该分析",
                "sections": [section("本次请求的指标口径不在正式支持范围内，无法给出计算过程或归因。", "reason", "status")],
                "numericRefs": [],
            }
        if data.get("status") == "needs_input":
            if data.get("modeOptions"):
                options = "、".join(
                    str(item.get("label", ""))
                    for item in data["modeOptions"]
                    if isinstance(item, dict)
                )
                return {
                    "headline": "没听懂你想问哪一类",
                    "sections": [section(
                        f"我没能从这句话判断你要问的是哪一类分析，所以不猜着回答。"
                        f"可以问：{options}。也可以直接说明你想要什么。",
                        "status",
                    )],
                    "numericRefs": [],
                    "modeOptions": data["modeOptions"],
                }
            return {
                "headline": "需要先确认讨论的币种",
                "sections": [section("上轮比较过两个币种，本轮的『它』指代不清，请先选择要讨论的币种。", "status")],
                "numericRefs": [],
            }

        if mode in {"overview", "limit"}:
            current = data["current"]["value"]
            distance = data["limit"]["distancePctPoint"]
            answer = {
                "headline": "重定价缺口率处于限额内",
                "sections": [section(f"当前值为{current:.2f}%，距离16.00%限额还有{distance:.2f}个百分点。", "current.value", "limit.value", "limit.distancePctPoint")],
                "numericRefs": [ref("current.value"), ref("limit.value"), ref("limit.distancePctPoint")],
            }
        elif mode == "trend":
            points = data["trend"]
            answer = {
                "headline": "所选期间重定价缺口率上升",
                "sections": [section(f"从{points[0]['date']}的{points[0]['value']:.2f}%升至{points[-1]['date']}的{points[-1]['value']:.2f}%。", "trend.0.value", f"trend.{len(points)-1}.value")],
                "numericRefs": [ref("trend.0.value"), ref(f"trend.{len(points)-1}.value")],
            }
        elif mode == "calculation":
            node = data["node"]
            labels = "、".join(child["label"] for child in data["children"])
            answer = {
                "headline": f"{node['label']}的计算过程",
                "sections": [section(f"该节点取值为{node['value']:.2f}{node['unit']}。下一层为：{labels or '末级节点'}。", "node.value", "children")],
                "numericRefs": [ref("node.value")],
            }
        elif mode == "attribution":
            factor = data["factors"][0]
            answer = {
                "headline": "指标变动已完成归因勾稽",
                "sections": [section(f"较基期变化{data['changePctPoint']:+.2f}个百分点；影响最大的因素是{factor['label']}。", "changePctPoint", "factors.0.impactPctPoint", "reconciliationResidualPctPoint")],
                "numericRefs": [ref("changePctPoint"), ref("factors.0.impactPctPoint")],
            }
        elif mode == "business":
            answer = {
                "headline": f"{data['businessType']}的业务变化",
                "sections": [section(f"该类业务规模较基期变化{data['changeAmount']:+.2f}亿元。虚拟归因分配结果为{data['illustrativeImpactPctPoint']:+.2f}个百分点，仅用于工作流联调。明细只用于说明业务线索，不代表逐笔正式归因。", "changeAmount", "illustrativeImpactPctPoint", "records", "recordRole")],
                "numericRefs": [ref("changeAmount"), ref("illustrativeImpactPctPoint")],
            }
        elif mode == "clarification":
            answer = {
                "headline": "需要先确认讨论的币种",
                "sections": [section("上轮比较过两个币种，本轮的『它』指代不清，请先选择要讨论的币种。", "status")],
                "numericRefs": [],
            }
            if data.get("currencyOptions"):
                answer["currencyOptions"] = data["currencyOptions"]
        elif mode == "currencyCompare":
            summary = data.get("currencySummary", [])
            wanted = data.get("comparedCurrencies", [])
            # 注意下标：引用路径指向**未过滤的** currencySummary，索引不能按过滤后的序号算。
            picked = [(index, row) for index, row in enumerate(summary) if row["currencyCode"] in wanted]
            described = "、".join(f"{row['currencyName']}为{row['ratio']:.2f}%" for _index, row in picked) or "无可比较的币种"
            answer = {
                "headline": "两个币种的重定价缺口率对比",
                "sections": [section(f"按当前范围，{described}。这只是口径内的对比，不表示哪个币种风险更高。", "comparedCurrencies")],
                "numericRefs": [ref(f"currencySummary.{index}.ratio") for index, _row in picked],
            }
        else:
            answer = {
                "headline": "指标口径说明",
                "sections": [section("指标的分子为重定价缺口，分母为总生息资产规模。" + "；".join(data["exclusions"]), "formula", "exclusions")],
                "numericRefs": [],
            }
        return answer


class ChatNarrator:
    """Live model adapter with bounded reasoning for the bank-platform target."""

    def __init__(self, settings: dict[str, str]) -> None:
        from langchain_openai import ChatOpenAI

        self.model = ChatOpenAI(
            model=settings["model"],
            api_key=settings["api_key"],
            base_url=settings["base_url"],
            temperature=0,
            max_tokens=900,
            reasoning_effort="none",
            model_kwargs={"response_format": {"type": "json_object"}},
        )

    async def generate(self, mode: str, data: dict, question: str, errors: list[str]) -> dict:
        system = (
            "你是ALM风险指标解读助手。只依据resultPackage回答。"
            "只输出JSON对象，格式为"
            '{"headline":"简短结论","sections":[{"text":"解释","citations":["resultPackage内的字段路径"]}],'
            '"numericRefs":[{"path":"字段路径","value":原始数值}]}。'
            "字段路径不要带resultPackage前缀，数组下标用点号，例如trend.0.value。"
            "每个sections至少有一条有效引用。数值必须逐字采用resultPackage原值，"
            "出现的每个数字都放入numericRefs，不自行计算，不写没有依据的数字。"
            "不要把业务明细说成正式归因；演示归因不得说成正式ALM归因。"
            "如果问题超出本次数据范围，简短说明现有数据能回答的部分。"
            "最多写2个sections，每节不超过70字；不要罗列scope编码或所有字段。"
            "归因只写总变化和影响最大的2个因素；业务只写汇总变化与一条线索，"
            "不要编造业务笔数。业务headline只写规模变化，不写影响百分点；"
            "业务演示影响如在sections中使用，必须同句注明'演示估算，非正式逐笔归因'。"
            "numericRefs只列正文实际使用的数值。"
        )
        payload = {"mode": mode, "question": question, "resultPackage": data, "previousErrors": errors}
        response = await self.model.ainvoke([("system", system), ("human", json.dumps(payload, ensure_ascii=False))])
        raw = response.content if isinstance(response.content, str) else str(response.content)
        return json.loads(raw.strip().removeprefix("```json").removesuffix("```").strip())


def build_graph(
    client: httpx.AsyncClient,
    narrator: MockNarrator | ChatNarrator | None = None,
    *,
    fail_fetch: bool = False,
    allow_template_fallback: bool = True,
):
    """装配工作流。

    ``allow_template_fallback`` 是 **mock/live 信任边界**：
    mock 模式下模板兜底是纯离线回归的便利；live 模式必须传 ``False``——
    用户看到的"模型解读"如果悄悄换成了固定文案，就是在拿假答案冒充模型输出。
    """
    narrator = narrator or MockNarrator()

    def resolve(state: WorkflowState) -> dict:
        resolved = resolve_context(state["inputs"])
        return {
            "regen_count": 0,
            "regenerated": False,
            "degrade_flags": [],
            "resolved_context": resolved,
        }

    def route(state: WorkflowState) -> dict:
        request = state["inputs"]
        resolved = state.get("resolved_context") or {}
        question = request.get("question") or ""
        if resolved.get("ambiguousCurrency"):
            return {"mode": "clarification", "clarify_reason": "currency"}
        if resolved.get("comparedCurrencies") and "currencyCompare" not in MODES:
            return {"mode": "overview"}
        mode = classify(
            question,
            request.get("analysisMode"),
            request.get("lastBusinessType"),
            resolved_context=resolved,
        )
        if mode is None:
            # 没识别出问题类型 → 要求澄清，绝不默默兜底成 overview。
            return {"mode": "clarification", "clarify_reason": "intent"}
        return {"mode": mode}

    async def fetch(state: WorkflowState) -> dict:
        if fail_fetch:
            request = httpx.Request("POST", f"http://mock-alm.local{ANALYSIS_API_PATH}")
            response = httpx.Response(502, request=request, json={"returnCode": "ERR", "errorCode": "UPSTREAM_UNAVAILABLE"})
            raise httpx.HTTPStatusError("Bad gateway", request=request, response=response)
        request = state["inputs"]
        scope = request["scope"]
        resolved = state.get("resolved_context") or {}
        body = {
            "metricCode": scope.get("metricCode"),
            "orgCode": scope.get("orgCode"),
            "tenorCode": scope.get("tenorCode"),
            "asOfDate": resolved.get("currentDate", CURRENT_DATE),
            "currencyCode": resolved.get("pageCurrencyCode", CURRENCY_CODE),
            "focusCurrencyCode": resolved.get("focusCurrencyCode", CURRENCY_CODE),
            "frequency": resolved.get("frequency", "MONTH"),
            "caliber": resolved.get("caliber", analysis.DEFAULT_CALIBER),
            "analysisMode": state["mode"],
            "baseDate": resolved.get("baseDate") or DEFAULT_BASE_DATE,
            "businessType": _business_type(request.get("question") or "", request.get("businessType") or request.get("lastBusinessType")),
            "nodeCode": _node_code(request.get("question") or "", request.get("nodeCode")),
        }
        if resolved.get("comparedCurrencies"):
            body["comparedCurrencies"] = resolved["comparedCurrencies"]
        if state["mode"] == "clarification":
            body["clarifyReason"] = state.get("clarify_reason") or "currency"
        response = await client.post(
            ANALYSIS_API_PATH,
            json=body,
            headers={"X-Demo-User": state["user"], "X-Service-Token": "demo-token"},
        )
        response.raise_for_status()
        envelope = response.json()
        if envelope.get("returnCode") != "SUC0000":
            raise ValueError(envelope.get("errorCode") or "ALM_TOOL_FAILED")
        return {"result_package": envelope["body"]}

    def validate_package(state: WorkflowState) -> dict:
        result = state["result_package"]
        expected = state["inputs"]["scope"]
        resolved = state.get("resolved_context") or {}
        actual = result.get("scope") or {}
        # 结果包描述的是**实际取数用的口径**：币种取对话关注币种，日期取解析后的当期。
        # 页面筛选币种与关注币种不同是正常的（用户从人民币追问美元），拿页面币种去比
        # 会把正确的追问误判成范围不符。
        for key in ("metricCode", "orgCode", "currencyCode", "tenorCode", "asOfDate"):
            want = expected.get(key)
            if key == "currencyCode":
                want = resolved.get("focusCurrencyCode", want)
            elif key == "asOfDate":
                want = resolved.get("currentDate", want)
            if actual.get(key) != want:
                raise ValueError(f"SCOPE_MISMATCH_{key}")
        # needs_input / unsupported / unavailable 是**合法应答**：模型要能用自然语言
        # 说明"这个口径/这个指代现在答不了"，而不是整条编排直接崩掉。
        if result.get("status") != "available":
            if result.get("status") not in PASS_THROUGH_STATUSES:
                raise ValueError("DATA_NOT_AVAILABLE")
            return {"data_validated": True}
        if not result.get("dataVersion") or not result.get("caliberVersion"):
            raise ValueError("VERSION_MISSING")
        if len(json.dumps(result, ensure_ascii=False)) > 16000:
            raise ValueError("PACKAGE_TOO_LARGE")
        return {"data_validated": True}

    async def generate(state: WorkflowState) -> dict:
        return await _narrate(state, retry=False)

    async def regenerate(state: WorkflowState) -> dict:
        return await _narrate(state, retry=True)

    async def _narrate(state: WorkflowState, retry: bool) -> dict:
        errors = state.get("validation_errors") or [] if retry else []
        try:
            result = narrator.generate(state["mode"], state["result_package"], state["inputs"].get("question") or "", errors)
            answer = await result if hasattr(result, "__await__") else result
            # 模型不遵守形状是常态而非异常：先整形再校验，别让校验去背形状噪声。
            answer = normalize_model_answer(answer)
        except Exception as exc:
            LOGGER.warning("Narrative generation failed: %s status=%s", type(exc).__name__, getattr(exc, "status_code", None))
            flags = list(state.get("degrade_flags") or [])
            if allow_template_fallback:
                flags.append(DEGRADE_NARRATIVE_UNAVAILABLE)
            else:
                # live 模式模型不可用：明确标记，绝不用模板冒充。
                flags.append(DEGRADE_LIVE_MODEL_UNAVAILABLE)
            return {"narrative": None, "llm_failed": True, "regen_count": state.get("regen_count", 0) + 1, "degrade_flags": flags}
        return {"narrative": answer, "regen_count": state.get("regen_count", 0) + 1}

    def validate_first(state: WorkflowState) -> dict:
        answer = state.get("narrative")
        if answer is None:
            return {"validation_errors": []}
        return {"validation_errors": validate_answer(answer, state["result_package"], mode=state.get("mode"))}

    def validate_retry(state: WorkflowState) -> dict:
        answer = state.get("narrative")
        if answer is None:
            return {"validation_errors": []}
        errors = validate_answer(answer, state["result_package"], mode=state.get("mode"))
        if not errors:
            return {"validation_errors": []}
        flags = list(state.get("degrade_flags") or [])
        if allow_template_fallback:
            # 兜底答案必须**自己再过一次校验**：用 MockNarrator 生成的模板也不
            # 该免检，否则等于开了一条绕过门禁的后门。
            fallback = MockNarrator().generate(
                state["mode"], state["result_package"], state["inputs"].get("question") or "", []
            )
            fallback_errors = validate_answer(fallback, state["result_package"], mode=state.get("mode"))
            if not fallback_errors:
                flags.append(DEGRADE_TEMPLATE_FALLBACK)
                return {"narrative": fallback, "validation_errors": [], "degrade_flags": flags}
            errors = errors + fallback_errors
            flags.append(DEGRADE_NARRATIVE_VALIDATION_FAILED)
            return {"narrative": None, "validation_errors": errors, "degrade_flags": flags}
        # live 模式：模板不是模型输出，顶替等于造假。只留空 + 明确标记。
        flags.append(DEGRADE_LIVE_MODEL_OUTPUT_INVALID)
        return {"narrative": None, "validation_errors": errors, "degrade_flags": flags}

    node_ids = [
        "resolve_context",
        "classify_question",
        "fetch_alm_data",
        "validate_data_package",
        "generate_narrative",
        "validate_output",
        "regenerate_narrative",
        "validate_retry",
    ]
    edges = [
        ("resolve_context", "classify_question"),
        ("classify_question", "fetch_alm_data"),
        ("fetch_alm_data", "validate_data_package"),
        ("validate_data_package", "generate_narrative"),
        ("generate_narrative", "validate_output"),
        ("validate_output", "regenerate_narrative"),
        ("validate_output", "__end__"),
        ("regenerate_narrative", "validate_retry"),
        ("validate_retry", "__end__"),
    ]
    problems = workflow_check.check_workflow(
        "repricing_gap",
        node_ids,
        edges,
        entry="resolve_context",
    )
    if problems:
        raise ValueError("; ".join(problems))

    graph = StateGraph(WorkflowState)
    graph.add_node("resolve_context", resolve)
    graph.add_node("classify_question", route)
    graph.add_node("fetch_alm_data", fetch)
    graph.add_node("validate_data_package", validate_package)
    graph.add_node("generate_narrative", generate)
    graph.add_node("validate_output", validate_first)
    graph.add_node("regenerate_narrative", regenerate)
    graph.add_node("validate_retry", validate_retry)
    graph.add_edge(START, "resolve_context")
    graph.add_edge("resolve_context", "classify_question")
    graph.add_edge("classify_question", "fetch_alm_data")
    graph.add_edge("fetch_alm_data", "validate_data_package")
    graph.add_edge("validate_data_package", "generate_narrative")
    graph.add_edge("generate_narrative", "validate_output")
    graph.add_conditional_edges(
        "validate_output",
        conditions.route_when(
            lambda state: bool(state.get("validation_errors")),
            "regenerate_narrative",
            "__end__",
        ),
        {"regenerate_narrative": "regenerate_narrative", "__end__": END},
    )
    graph.add_edge("regenerate_narrative", "validate_retry")
    graph.add_edge("validate_retry", END)
    return graph.compile()
