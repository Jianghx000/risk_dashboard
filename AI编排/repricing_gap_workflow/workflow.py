"""Platform-shaped LangGraph workflow for the repricing gap AI entry."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, TypedDict

import httpx
from almcanvas.answer_validation import _resolve_path, validate_answer

from . import analysis
from .prompts import NARRATIVE_POLICY
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
    platform_variables: dict[str, Any]
    platform_output: dict[str, Any]
    conversation_state: dict[str, Any]


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


def _business_type(question: str, explicit: str | None, last_business_type: str | None = None) -> str:
    if explicit:
        return explicit
    for name in ("自营贷款", "投资类资产", "同业资产", "定期存款", "同业负债"):
        if name in question:
            return name
    return last_business_type or "自营贷款"


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


class MockNarrator:
    """Deterministic stand-in for a platform Prompt node; never calls a model."""

    def classify(self, question: str, context: dict) -> dict:
        """Offline transport fixture; live semantic quality is tested separately."""
        from .bank_scripts import context_handler
        result = context_handler({"prepareOnly": True, "input": {
            "orgCode": "LEGAL", "currencyCode": "CNY", "tenorCode": "1Y", "asOfDate": CURRENT_DATE,
            "question": question, "conversationState": {"businessType": context.get("lastBusinessType")},
            "options": {"comparedCurrencies": context.get("comparedCurrencies")}}})
        needs = result["query"]["dataNeeds"]
        return {"labels": {mode: int(mode in needs) for mode in sorted(MODES - {"clarification"})},
            "primary": result["analysisMode"], "needsClarification": result["analysisMode"] == "clarification"}

    def generate(self, mode: str, data: dict, question: str, errors: list[str]) -> dict:
        if data.get("analyses"):
            sections, refs = [], []
            for need, module in data["analyses"].items():
                parts = module.get("byCurrency", [module])
                for index, part in enumerate(parts):
                    prefix = "analyses." + need + (".byCurrency." + str(index) if "byCurrency" in module else "") + "."
                    sub = self.generate(need, part, question, errors)
                    analysis_currency = part.get("scope", {}).get("currencyCode")
                    label = {"CNY": "人民币", "USD": "美元", "HKD": "港币"}.get(analysis_currency, "")
                    sections.extend({"text": (label + "：" if len(parts) > 1 else "") + s["text"],
                        "citations": [prefix + p for p in s["citations"]]} for s in sub["sections"])
                    refs.extend({**r, "path": prefix + r["path"]} for r in sub["numericRefs"])
            return {"headline": "本轮问题的综合分析", "sections": sections, "numericRefs": refs}

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
            if data.get("message"):
                return {"headline": "需要补充本轮请求", "sections": [section(data["message"], "message", "status")],
                    "numericRefs": []}
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

        if data.get("status") == "unavailable":
            return {"headline": "暂无可比较的历史数据", "sections": [section(
                "当前范围没有可用的比较基期，无法解释跨期变化；不会替换为其他日期。", "status", "reason")],
                "numericRefs": []}

        if mode in {"overview", "limit"}:
            current = data["current"]["value"]
            limit = data["limit"]
            if not limit.get("applicable"):
                answer = {"headline": "当前币种没有适用限额", "sections": [section(
                    f"当前值为{current:.2f}%，本范围没有适用的单币种限额，不套用其他币种限额。", "current.value", "limit")],
                    "numericRefs": [ref("current.value")]}
            else:
                distance = limit["distancePctPoint"]
                answer = {
                    "headline": "重定价缺口率超出内部限额" if limit["breached"] else "重定价缺口率处于限额内",
                    "sections": [section(f"当前值为{current:.2f}%，内部限额为{limit['value']:.2f}%，距限额{distance:.2f}个百分点。", "current.value", "limit.value", "limit.distancePctPoint")],
                    "numericRefs": [ref("current.value"), ref("limit.value"), ref("limit.distancePctPoint")],
                }
            attribution = data.get("attribution") or {}
            if mode == "overview" and attribution.get("factors"):
                factor = attribution["factors"][0]
                answer["sections"].append(section(
                    f"较基期变动{attribution['changePctPoint']:+.2f}个百分点，主要因素是{factor['label']}；这是演示归因，非正式ALM归因。",
                    "attribution.changePctPoint", "attribution.factors.0.impactPctPoint", "attribution.scope.baseDate", "attribution.method"))
                answer["numericRefs"] += [ref("attribution.changePctPoint"), ref("attribution.factors.0.impactPctPoint")]
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
                "sections": [section(f"演示归因：较基期变化{data['changePctPoint']:+.2f}个百分点；影响最大的因素是{factor['label']}，非正式ALM归因。", "changePctPoint", "factors.0.impactPctPoint", "reconciliationResidualPctPoint")],
                "numericRefs": [ref("changePctPoint"), ref("factors.0.impactPctPoint")],
            }
        elif mode == "business":
            answer = {
                "headline": f"{data['businessType']}的业务变化",
                "sections": [section(f"该类业务规模较基期变化{data['changeAmount']:+.2f}亿元。演示估算影响为{data['illustrativeImpactPctPoint']:+.2f}个百分点，非正式逐笔归因。明细只用于说明业务线索。", "changeAmount", "illustrativeImpactPctPoint", "records", "recordRole")],
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
            max_tokens=1800,
            reasoning_effort="none",
            model_kwargs={"response_format": {"type": "json_object"}},
        )

    async def generate_configured(self, config: dict, params: dict) -> str:
        def replace(match):
            key = match.group(1)
            if key not in params:
                raise ValueError("MISSING_PROMPT_INPUT:" + key)
            value = params[key]
            return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
        text = re.sub(r"\$\{([^}]+)\}", replace, config["systemPrompt"])
        model = self.model.bind(temperature=config["temperature"], max_tokens=config["maxTokens"])
        if getattr(self.model, "model_name", config["model"]) != config["model"]:
            raise ValueError("MODEL_CONFIGURATION_MISMATCH")
        response = await model.ainvoke([("system", text)])
        return response.content if isinstance(response.content, str) else str(response.content)

    async def generate(self, mode: str, data: dict, question: str, errors: list[str]) -> dict:
        system = NARRATIVE_POLICY
        payload = {"mode": mode, "question": question, "resultPackage": data, "previousErrors": errors}
        response = await self.model.ainvoke([("system", system), ("human", json.dumps(payload, ensure_ascii=False))])
        raw = response.content if isinstance(response.content, str) else str(response.content)
        return json.loads(raw.strip().removeprefix("```json").removesuffix("```").strip())


def build_graph(client, narrator=None, *, fail_fetch=False, allow_template_fallback=False):
    """Compile the bank definition; adapters supply transport and legacy state."""
    from almcanvas.langgraph_runtime import compile_definition
    from .platform_blueprint import load_spec

    spec = load_spec()
    narrator = narrator or MockNarrator()

    def initial_variables(state):
        request = state["inputs"]
        flat = {**(request.get("scope") or {}), **{k: v for k, v in request.items() if k != "scope"}}
        options = {k: flat[k] for k in ("analysisMode", "baseDate", "businessType", "nodeCode",
            "focusCurrencyCode", "comparedCurrencies", "caliber", "metricCode", "dataNeeds") if flat.get(k) is not None}
        if flat.get("options") is not None and not isinstance(flat["options"], dict):
            raise ValueError("INVALID_CONTEXT_OBJECT")
        if flat.get("conversationState") is not None and not isinstance(flat["conversationState"], dict):
            raise ValueError("INVALID_CONTEXT_OBJECT")
        flat["options"] = {**options, **(flat.get("options") or {})}
        legacy_state = {"businessType": flat.get("lastBusinessType"),
            "focusCurrencyCode": flat.get("sessionFocusCurrencyCode"), "baseDate": flat.get("lastBaseDate"),
            "comparedCurrencies": flat.get("lastComparedCurrencies")}
        flat["conversationState"] = flat.get("conversationState") or {k: v for k, v in legacy_state.items() if v}
        start = next(n for n in spec["nodes"] if n["config"]["kind"] == "start")
        history = flat.get("chatHistory", [])
        # Compatibility for old local clients only; the bank start form has no state field.
        if "chatHistory" not in flat and flat["conversationState"]:
            memory = dict(flat["conversationState"])
            memory.setdefault("scopeKey", "|".join(flat.get(k) or ("MONTH" if k == "frequency" else "")
                for k in ("orgCode", "currencyCode", "tenorCode", "asOfDate", "frequency")))
            history = [{"inputMessage": "{}", "outputMessage": json.dumps({"conversationState": memory}, ensure_ascii=False)}]
        return {"systemInput": {i["name"]: flat.get(i["name"]) for i in start["inputs"]},
                "chatHistory": history}

    async def api(node, params, state):
        config = node["config"]
        if fail_fetch:
            request = httpx.Request(config["method"], "http://mock-alm.local" + config["path"])
            raise httpx.HTTPStatusError("Bad gateway", request=request, response=httpx.Response(502, request=request))
        response = await client.request(config["method"], config["path"], json=params,
            headers={"X-Demo-User": state["user"], "X-Service-Token": "demo-token"})
        response.raise_for_status()
        return response.json()

    async def prompt(node, params, state):
        if hasattr(narrator, "generate_configured"):
            return await narrator.generate_configured(node["config"], params)
        if node["id"] == "intent_prompt":
            result = narrator.classify(params["question"], params["classificationContext"])
        else:
            result = narrator.generate(params["analysisMode"], params["resultPackage"],
                params.get("question") or "", params.get("previousErrors") or [])
        result = await result if hasattr(result, "__await__") else result
        return json.dumps(result, ensure_ascii=False)

    def project(node, variables, state):
        update = {}
        if node["id"] == "context":
            update.update(regen_count=0, regenerated=False, llm_failed=False,
                          narrative=None, validation_errors=[], degrade_flags=[], platform_output={})
        context = variables.get("contextOutput")
        if context:
            update["mode"] = context["analysisMode"]
            update["clarify_reason"] = context["clarifyReason"]
            query = context["query"]
            memory = context["conversationState"]
            page = variables["systemInput"]["currencyCode"]
            update["resolved_context"] = {
                "pageCurrencyCode": page, "focusCurrencyCode": memory.get("focusCurrencyCode") or page,
                "currentDate": query["asOfDate"], "baseDate": query["baseDate"] or None,
                "frequency": query["frequency"], "caliber": context["caliber"],
                "comparedCurrencies": query["currencies"] if context["analysisMode"] == "currencyCompare" else None,
                "ambiguousCurrency": context["analysisMode"] == "clarification" and context["clarifyReason"] == "currency",
            }
        if "apiResponse" in variables:
            update["result_package"] = variables["apiResponse"].get("body")
        if "packageOutput" in variables:
            update["result_package"] = variables["packageOutput"]["resultPackage"]
            update["data_validated"] = True
            update["conversation_state"] = variables["packageOutput"]["conversationState"]
            update["resolved_context"]["baseDate"] = update["conversation_state"].get("baseDate") or None
        if node["id"] == "intent_check":
            # The visible validator routes a failed classifier to clarification.
            # It must not mark a later successful narrative as a model outage.
            update["llm_failed"] = False
        if node["id"] in ("prompt", "regenerate"):
            update["regen_count"] = state.get("regen_count", 0) + 1
            update["regenerated"] = node["id"] == "regenerate"
        checked = variables.get("answerOutput")
        if checked:
            update["narrative"] = checked["narrative"]
            update["validation_errors"] = checked["validationErrors"]
            update["degrade_flags"] = list(checked["degradeFlags"])
        if node["id"] not in ("context", "intent_prompt", "intent_check") and state.get("llm_failed"):
            flag = DEGRADE_NARRATIVE_UNAVAILABLE if isinstance(narrator, MockNarrator) and allow_template_fallback else DEGRADE_LIVE_MODEL_UNAVAILABLE
            update["degrade_flags"] = list(dict.fromkeys([*(update.get("degrade_flags") or []), flag]))
        return update

    return compile_definition(spec, WorkflowState, initial_variables=initial_variables,
        api=api, prompt=prompt, project=project)
