"""虚构 ALM 数据：重定价缺口率的确定性计算。

所有金额、指标、限额与归因都是**虚构联调数据**，绝不是正式 ALM 指标、绝不是
正式三层 Owen 归因。正式接入时由 ALM 服务按已授权的机构/币种/日期/口径返回结果包，
本模块整体替换。

币种折算、期限分布、明细都要复用下面的 ``snapshot_at`` / ``_components`` /
``_ratio`` / ``_attribution`` / ``_calculation``，不要另起一套算法。
"""

from __future__ import annotations

from itertools import permutations


METRIC_CODE = "REPRICING_GAP_RATIO"
ORG_CODE = "LEGAL"
CURRENCY_CODE = "CNY"
TENOR_CODE = "1Y"
CURRENT_DATE = "2026-07-31"
DEFAULT_BASE_DATE = "2026-06-30"
DATA_VERSION = "SYNTHETIC-2026-07-v1"
CALIBER_VERSION = "SYNTHETIC-ALM-CALIBER-v1"

# ---------------------------------------------------------------- 币种（虚构）
CURRENCIES = ("CNY", "USD", "HKD")
CURRENCY_NAMES = {"CNY": "人民币", "USD": "美元", "HKD": "港币"}
IMPORTANT_CURRENCY_FLAGS = {"CNY": True, "USD": True, "HKD": False}
# 各币种规模相对人民币的折算系数，以及分母的币种调整项（虚构）。
SCALE_FACTORS = {"CNY": 1.0, "USD": 0.33, "HKD": 0.18}
CURRENCY_DENOMINATOR_ADJUSTMENT = {"CNY": 0.0, "USD": 4.0, "HKD": -3.0}
# 港币**没有**单币种限额，用于演示"限额不适用"状态，不得静默套用其他币种的限额。
LIMITS_BY_CURRENCY: dict[str, float | None] = {"CNY": 16.0, "USD": 16.0, "HKD": None}

# ---------------------------------------------------------------- 口径
# 只有 DEFAULT 口径有正式计算过程与归因；非默认口径必须明确返回不支持，
# 不得套用默认结果（行内AI工作流平台能力速查.md:95）。
DEFAULT_CALIBER = "DEFAULT"
SUPPORTED_CALIBERS = (DEFAULT_CALIBER,)

# ---------------------------------------------------------------- 历史
BUSINESSES = ("自营贷款", "投资类资产", "同业资产", "定期存款", "同业负债")
MONTH_END_DATES = (
    "2025-09-30", "2025-10-31", "2025-11-30", "2025-12-31",
    "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30",
    "2026-05-31", "2026-06-30", "2026-07-31",
)
DAILY_DATES = ("2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31")
FREQUENCIES = ("MONTH", "DAY")

# 快照顺序：自营贷款、投资类资产、同业资产、定期存款、同业负债、
# 银行账簿表外衍生品、交易账簿表外衍生品、总生息资产（均为人民币亿元）。
# 覆盖上升 / 下降 / 突破限额 / 日频四种情景。
_SNAPSHOT_ROWS: dict[str, tuple[float, ...]] = {
    "2025-09-30": (250, 180, 90, 300, 162, 8, 0, 900),
    "2025-10-31": (263, 185, 92, 304, 165, 8, 0, 920),
    "2025-11-30": (268, 190, 94, 307, 166, 9, 0, 940),
    "2025-12-31": (270, 195, 95, 300, 165, 10, 0, 960),
    "2026-01-31": (280, 188, 98, 302, 165, 11, 0, 965),
    "2026-02-28": (305, 195, 98, 305, 168, 10, 0, 980),
    "2026-03-31": (332, 195, 95, 305, 165, 11, 0, 990),
    "2026-04-30": (315, 200, 100, 307, 170, 11, 0, 1000),
    "2026-05-31": (290, 195, 95, 300, 165, 10, 0, 980),
    "2026-06-30": (300, 200, 100, 300, 170, 10, 0, 1000),
    "2026-07-27": (315, 200, 100, 308, 170, 11, 2, 1035),
    "2026-07-28": (318, 200, 100, 309, 170, 11, 2, 1038),
    "2026-07-29": (320, 200, 100, 310, 170, 12, 2, 1040),
    "2026-07-30": (322, 200, 100, 310, 170, 12, 3, 1042),
    "2026-07-31": (330, 200, 100, 310, 170, 12, 3, 1050),
}

# 明细只作业务线索，不能替代正式指标归因。
DETAILS = [
    {
        "positionId": "LOAN-1001",
        "businessType": "自营贷款",
        "changeType": "NEW",
        "baseAmount": 0.0,
        "currentAmount": 30.0,
        "remark": "当期新增贷款，进入一年内重定价区间",
    },
    {
        "positionId": "DEP-2001",
        "businessType": "定期存款",
        "changeType": "INCREASE",
        "baseAmount": 60.0,
        "currentAmount": 70.0,
        "remark": "存款余额增加",
    },
]

# 重定价期限桶（虚构）：隔夜 + 1~12 个月。
BUCKETS = ("隔夜", "隔夜~1个月", *(f"{month}~{month + 1}个月" for month in range(1, 12)))


# ---------------------------------------------------------------- 基础查询


def available_dates(frequency: str = "MONTH") -> list[str]:
    """按频率返回可用数据日；日频含月频全部日期。"""
    if frequency == "DAY":
        return sorted({*MONTH_END_DATES, *DAILY_DATES})
    return list(MONTH_END_DATES)


def previous_date(current_date: str, frequency: str = "MONTH") -> str | None:
    """当前日之前最近的一个可用日；最早时点返回 None（不得凭空造上一期）。"""
    earlier = [item for item in available_dates(frequency) if item < current_date]
    return earlier[-1] if earlier else None


def _raw_snapshot(date: str) -> dict:
    row = _SNAPSHOT_ROWS[date]
    loan, investment, interbank, term_deposit, interbank_liability, bank, trading, denominator = row
    return {
        "assets": {"自营贷款": loan, "投资类资产": investment, "同业资产": interbank},
        "liabilities": {"定期存款": term_deposit, "同业负债": interbank_liability},
        "bankDerivatives": bank,
        "tradingDerivatives": trading,
        "denominator": denominator,
    }


def snapshot_at(date: str, currency: str = CURRENCY_CODE) -> dict:
    """按币种折算后的快照——**所有计算的唯一入口**。"""
    if date not in _SNAPSHOT_ROWS:
        raise KeyError(date)
    if currency not in SCALE_FACTORS:
        raise KeyError(currency)
    original = _raw_snapshot(date)
    factor = SCALE_FACTORS[currency]
    return {
        "assets": {key: value * factor for key, value in original["assets"].items()},
        "liabilities": {key: value * factor for key, value in original["liabilities"].items()},
        "bankDerivatives": original["bankDerivatives"] * factor,
        "tradingDerivatives": original["tradingDerivatives"] * factor,
        "denominator": (original["denominator"] + CURRENCY_DENOMINATOR_ADJUSTMENT[currency]) * factor,
    }


def _components(snapshot: dict) -> dict[str, float]:
    return {
        "assets": sum(snapshot["assets"].values()),
        "liabilities": sum(snapshot["liabilities"].values()),
        "bankDerivatives": snapshot["bankDerivatives"],
        "tradingDerivatives": snapshot["tradingDerivatives"],
        "denominator": snapshot["denominator"],
    }


def _ratio(components: dict[str, float]) -> float:
    numerator = (
        components["assets"]
        - components["liabilities"]
        + components["bankDerivatives"]
        + components["tradingDerivatives"]
    )
    return 100 * numerator / components["denominator"]


def ratio_at(date: str, currency: str = CURRENCY_CODE) -> float:
    return _ratio(_components(snapshot_at(date, currency)))


def _limit(currency: str, ratio: float) -> dict:
    """单币种限额；无适用限额时返回不适用状态，不得静默套用别币种限额。"""
    value = LIMITS_BY_CURRENCY[currency]
    if value is None:
        return {"applicable": False, "reason": "DEMO_NO_SINGLE_CURRENCY_LIMIT"}
    return {
        "applicable": True,
        "operator": "<=",
        "value": value,
        "unit": "%",
        "breached": ratio > value,
        "distancePctPoint": round(value - ratio, 6),
        "exceedancePctPoint": round(max(ratio - value, 0), 6),
        "headroomPctPoint": round(max(value - ratio, 0), 6),
    }


def currency_summary(date: str = CURRENT_DATE) -> list[dict]:
    """一次返回有界的币种摘要——不做逐币种循环调 API（能力速查.md:55）。"""
    rows = []
    for currency in CURRENCIES:
        snapshot = snapshot_at(date, currency)
        ratio = _ratio(_components(snapshot))
        rows.append(
            {
                "currencyCode": currency,
                "currencyName": CURRENCY_NAMES[currency],
                "scaleCny100m": round(snapshot["denominator"], 6),
                "ratio": round(ratio, 6),
                "isImportantCurrency": IMPORTANT_CURRENCY_FLAGS[currency],
                "limit": _limit(currency, ratio),
            }
        )
    total = sum(row["scaleCny100m"] for row in rows)
    for row in rows:
        row["sharePct"] = round(100 * row["scaleCny100m"] / total, 6)
    return rows


def _scope(date: str, base_date: str | None, currency: str, frequency: str, caliber: str) -> dict:
    result = {
        "metricCode": METRIC_CODE,
        "orgCode": ORG_CODE,
        "currencyCode": currency,
        "tenorCode": TENOR_CODE,
        "asOfDate": date,
        "frequency": frequency,
        "caliber": caliber,
    }
    if base_date:
        result["baseDate"] = base_date
    return result


# ---------------------------------------------------------------- 分析模式


def overview(
    as_of_date: str = CURRENT_DATE,
    *,
    currency: str = CURRENCY_CODE,
    frequency: str = "MONTH",
    caliber: str = DEFAULT_CALIBER,
) -> dict:
    ratio = ratio_at(as_of_date, currency)
    trend = [
        {"date": item, "value": round(ratio_at(item, currency), 6)}
        for item in available_dates(frequency)
        if item <= as_of_date
    ]
    return {
        "scope": _scope(as_of_date, None, currency, frequency, caliber),
        "current": {"value": round(ratio, 6), "unit": "%"},
        "limit": _limit(currency, ratio),
        "trend": trend,
        "currencySummary": currency_summary(as_of_date),
        "dataVersion": DATA_VERSION,
    }


def calculation(
    as_of_date: str = CURRENT_DATE,
    node_code: str = "ROOT",
    *,
    currency: str = CURRENCY_CODE,
    frequency: str = "MONTH",
    caliber: str = DEFAULT_CALIBER,
) -> dict:
    values = _components(snapshot_at(as_of_date, currency))
    if caliber not in SUPPORTED_CALIBERS:
        raise KeyError("UNSUPPORTED_CALIBER")
    nodes = {
        "ROOT": {
            "label": "重定价缺口率",
            "value": round(_ratio(values), 6),
            "unit": "%",
            "formula": "GAP / DENOMINATOR * 100",
            "children": ["GAP", "DENOMINATOR"],
        },
        "GAP": {
            "label": "重定价缺口",
            "value": round(values["assets"] - values["liabilities"] + values["bankDerivatives"] + values["tradingDerivatives"], 6),
            "unit": "亿元",
            "formula": "ASSETS - LIABILITIES + BANK_DERIVATIVES + TRADING_DERIVATIVES",
            "children": ["ASSETS", "LIABILITIES", "BANK_DERIVATIVES", "TRADING_DERIVATIVES"],
        },
        "DENOMINATOR": {
            "label": "总生息资产规模（不含内部交易）",
            "value": values["denominator"],
            "unit": "亿元",
            "children": [],
        },
        "ASSETS": {
            "label": "资产端重定价规模（不含内部交易）",
            "value": values["assets"],
            "unit": "亿元",
            "children": list(snapshot_at(as_of_date, currency)["assets"]),
        },
        "LIABILITIES": {
            "label": "负债端重定价规模（不含内部交易、不含活期）",
            "value": values["liabilities"],
            "unit": "亿元",
            "children": list(snapshot_at(as_of_date, currency)["liabilities"]),
        },
        "BANK_DERIVATIVES": {
            "label": "银行账簿表外衍生品缺口",
            "value": values["bankDerivatives"],
            "unit": "亿元",
            "children": [],
        },
        "TRADING_DERIVATIVES": {
            "label": "交易账簿表外衍生品缺口",
            "value": values["tradingDerivatives"],
            "unit": "亿元",
            "children": [],
        },
    }
    for category, amount in {**snapshot_at(as_of_date, currency)["assets"], **snapshot_at(as_of_date, currency)["liabilities"]}.items():
        nodes[category] = {"label": category, "value": amount, "unit": "亿元", "children": []}
    if node_code not in nodes:
        raise ValueError("UNKNOWN_NODE")
    node = nodes[node_code]
    return {
        "scope": _scope(as_of_date, None, currency, frequency, caliber),
        "nodeCode": node_code,
        "node": node,
        "children": [{"nodeCode": code, **nodes[code]} for code in node["children"]],
        "dataVersion": DATA_VERSION,
    }


def _attribution(base_components: dict, current_components: dict) -> dict:
    """五因素 Shapley（**演示算法，非正式 ALM 三层 Owen 归因**）。"""
    keys = tuple(base_components)
    impacts = {key: 0.0 for key in keys}
    for order in permutations(keys):
        state = dict(base_components)
        before = _ratio(state)
        for key in order:
            state[key] = current_components[key]
            after = _ratio(state)
            impacts[key] += (after - before) / 120
            before = after
    delta = _ratio(current_components) - _ratio(base_components)
    if abs(sum(impacts.values()) - delta) > 1e-9:
        raise ArithmeticError("ATTRIBUTION_NOT_RECONCILED")
    return {"impacts": impacts, "delta": delta}


_FACTOR_LABELS = {
    "assets": "资产端重定价规模",
    "liabilities": "负债端重定价规模",
    "bankDerivatives": "银行账簿表外衍生品缺口",
    "tradingDerivatives": "交易账簿表外衍生品缺口",
    "denominator": "总生息资产规模",
}


def attribution(
    as_of_date: str = CURRENT_DATE,
    base_date: str = DEFAULT_BASE_DATE,
    *,
    currency: str = CURRENCY_CODE,
    frequency: str = "MONTH",
    caliber: str = DEFAULT_CALIBER,
) -> dict:
    base = _components(snapshot_at(base_date, currency))
    current = _components(snapshot_at(as_of_date, currency))
    result = _attribution(base, current)
    impacts, delta = result["impacts"], result["delta"]
    factors = [
        {
            "factorCode": key,
            "label": _FACTOR_LABELS[key],
            "baseValue": base[key],
            "currentValue": current[key],
            "impactPctPoint": round(impacts[key], 9),
        }
        for key in base
    ]
    factors.sort(key=lambda item: abs(item["impactPctPoint"]), reverse=True)
    return {
        "scope": _scope(as_of_date, base_date, currency, frequency, caliber),
        "baseRatio": round(_ratio(base), 9),
        "currentRatio": round(_ratio(current), 9),
        "changePctPoint": round(delta, 9),
        "factors": factors,
        "reconciliationResidualPctPoint": round(delta - sum(impacts.values()), 12),
        "method": "SYNTHETIC_FIVE_FACTOR_SHAPLEY_DEMO_NOT_FORMAL_ALM_OWEN",
        "dataVersion": DATA_VERSION,
    }


def business(
    as_of_date: str = CURRENT_DATE,
    base_date: str = DEFAULT_BASE_DATE,
    business_type: str = "自营贷款",
    *,
    currency: str = CURRENCY_CODE,
    frequency: str = "MONTH",
    caliber: str = DEFAULT_CALIBER,
) -> dict:
    current_snapshot = snapshot_at(as_of_date, currency)
    base_snapshot = snapshot_at(base_date, currency)
    base_value = base_snapshot["assets"].get(business_type, base_snapshot["liabilities"].get(business_type))
    current_value = current_snapshot["assets"].get(business_type, current_snapshot["liabilities"].get(business_type))
    if base_value is None or current_value is None:
        raise ValueError("UNKNOWN_BUSINESS_TYPE")
    records = [item for item in DETAILS if item["businessType"] == business_type]
    direction = "assets" if business_type in current_snapshot["assets"] else "liabilities"
    result = _attribution(_components(base_snapshot), _components(current_snapshot))
    group_change = current_snapshot[direction] and (
        sum(current_snapshot[direction].values()) - sum(base_snapshot[direction].values())
    )
    group_impact = result["impacts"][direction]
    illustrative_impact = group_impact * (current_value - base_value) / group_change if group_change else 0.0
    return {
        "scope": _scope(as_of_date, base_date, currency, frequency, caliber),
        "businessType": business_type,
        "baseAmount": base_value,
        "currentAmount": current_value,
        "changeAmount": current_value - base_value,
        "illustrativeImpactPctPoint": round(illustrative_impact, 9),
        "attributionMethod": "SYNTHETIC_GROUP_IMPACT_ALLOCATION_NOT_FORMAL_ALM_OWEN",
        "records": records[:10],
        "recordRole": "qualitative_evidence_not_formal_attribution",
        "dataVersion": DATA_VERSION,
    }


def methodology(
    as_of_date: str = CURRENT_DATE,
    *,
    currency: str = CURRENCY_CODE,
    frequency: str = "MONTH",
    caliber: str = DEFAULT_CALIBER,
) -> dict:
    return {
        "scope": _scope(as_of_date, None, currency, frequency, caliber),
        "metricCode": METRIC_CODE,
        "formula": "重定价缺口率 = 重定价缺口 / 总生息资产规模 * 100",
        "gapFormula": "资产端重定价规模 - 负债端重定价规模 + 银行账簿表外衍生品缺口 + 交易账簿表外衍生品缺口",
        "exclusions": ["汇总分母剔除内部交易", "负债端重定价规模剔除活期"],
        "currencies": [
            {"currencyCode": code, "currencyName": CURRENCY_NAMES[code], "limitApplicable": _limit(code, 0.0)["applicable"]}
            for code in CURRENCIES
        ],
        "warning": "虚构数据仅用于工作流联调；正式分类、限额和口径须由 ALM 服务提供",
        "dataVersion": DATA_VERSION,
    }
