"""Execute the pasted scripts and compare with actual runtime policy."""

import ast
import asyncio
import copy
import json

import pytest
import httpx

from almcanvas.answer_shape import normalize_model_answer
from almcanvas.overclaim_guard import RULES
from repricing_gap_workflow.platform_blueprint import ANSWER_SCRIPT, CONTEXT_SCRIPT, load_spec
from repricing_gap_workflow.prompts import NARRATIVE_POLICY, platform_prompt
from repricing_gap_workflow.server import app
from repricing_gap_workflow.workflow import _business_type, _node_code, classify, resolve_context, validate_answer


@pytest.fixture(scope="module")
def replica():
    namespace = {}
    exec(ANSWER_SCRIPT, namespace)
    return namespace["handler"]


def answer(text, refs=None):
    return {"headline": "本轮分析", "sections": [{"text": text, "citations": ["status"]}],
            "numericRefs": refs or []}


CASES = [
    ("overview", "当前值为12.5%。", {"value": 12.5}, [{"path": "value", "value": 12.5}], None),
    ("overview", "当前值为999%。", {}, [], "UNREFERENCED_NUMBER:999"),
    ("limit", "已触及监管限额。", {"limit": {"value": 16}}, [], "MANAGEMENT_LIMIT_MISLABELED"),
    ("attribution", "正向贡献-0.12个百分点。", {"impact": -.12}, [{"path": "impact", "value": -.12}], "CONTRADICTORY_IMPACT_SIGN"),
    ("limit", "超出距离。", {}, [], "AWKWARD_LIMIT_EXCEEDANCE"),
    ("overview", "数据版本所示。", {}, [], "TECHNICAL_METADATA_LEAK"),
    ("attribution", "检查数据源配置。", {"status": "unsupported"}, [], "UNAVAILABLE_RESULT_TECHNICAL_ADVICE"),
    ("attribution", "无法展示跨期变动。", {"status": "unavailable"}, [], "ATTRIBUTION_UNAVAILABLE_OVERCLAIM"),
    ("trend", "下月继续上涨。", {}, [], "UNSUPPORTED_FORECAST_OR_RISK_LINK"),
    ("overview", "主要受资产端影响。", {}, [], "OVERVIEW_CAUSALITY_WITHOUT_ATTRIBUTION"),
    ("currencyCompare", "美元管理优先级更高。", {}, [], "CURRENCY_COMPARISON_OVERCLAIM"),
    ("business", "规模明显集中。", {"summary": {"largestBucketSharePct": 30}}, [], "DISTRIBUTION_CONCENTRATION_OVERCLAIM"),
    ("business", "存在重定价敏感性。", {}, [], "DISTRIBUTION_CAUSALITY_UNSUPPORTED"),
    ("attribution", "总生息资产规模下降。", {"factors": [{"factorCode": "denominator", "baseValue": 10, "currentValue": 11}]}, [], "DENOMINATOR_DIRECTION_WRONG"),
    ("business", "贷款余额增加。", {}, [], "BUSINESS_REPRICING_SCALE_MISLABELED"),
    ("business", "没有明显集中，不能据此推断重定价敏感性。", {"summary": {"largestBucketSharePct": 30}}, [], None),
    ("business", "拖累0.12个百分点。", {"impact": -.12}, [{"path": "impact", "value": -.12}], None),
    ("business", "头寸8801234位于3至6个月。", {"positionId": "8801234", "bucketLabel": "3至6个月"}, [], None),
    ("attribution", "贡献0.12个百分点。", {"attributionMethod": "SYNTHETIC", "illustrativeImpactPctPoint": .12}, [{"path": "illustrativeImpactPctPoint", "value": .12}], "ILLUSTRATIVE_IMPACT_UNLABELED"),
]


@pytest.mark.parametrize("mode,text,data,refs,expected", CASES)
def test_guard_results_are_identical(replica, mode, text, data, refs, expected):
    package = {"status": "available", **data}
    value = answer(text, refs)
    if expected == "ILLUSTRATIVE_IMPACT_UNLABELED":
        value["sections"][0]["citations"] = ["illustrativeImpactPctPoint"]
    runtime = validate_answer(normalize_model_answer(copy.deepcopy(value)), package, mode=mode)
    pasted = replica({"narrativeRaw": json.dumps(value), "resultPackage": package, "analysisMode": mode})
    assert pasted["validationErrors"] == runtime
    assert (pasted["narrative"] is None) == bool(runtime)
    if expected:
        assert expected in runtime
    else:
        assert runtime == []


def test_cases_cover_every_semantic_rule():
    tested = {row[-1] for row in CASES}
    assert {rule.code for rule in RULES} <= tested


@pytest.mark.parametrize("malformed", [[], {}, {"headline": None},
    {"headline": "测试", "sections": None},
    {"headline": "测试", "sections": [{"text": 123, "citations": ["status"]}]},
    {"headline": "测试", "sections": [{"text": "测试", "citations": [[]]}], "numericRefs": [{"path": [], "value": 1}]}])
def test_malformed_answers_return_errors_not_script_exceptions(replica, malformed):
    package = {"status": "available"}
    runtime = validate_answer(normalize_model_answer(copy.deepcopy(malformed)), package, mode="overview")
    pasted = replica({"narrativeRaw": json.dumps(malformed), "resultPackage": package, "analysisMode": "overview"})
    assert pasted["validationErrors"] == runtime
    assert pasted["narrative"] is None


def test_normalization_and_retry_flags(replica):
    package = {"status": "available", "trend": [{"value": 12.5}]}
    valid = answer("当前为12.5%。")
    valid["sections"][0].update(citations=["trend[0].value"], numericRefs=[{"path": "trend[0].value", "value": 12.5}])
    params = {"narrativeRaw": json.dumps(valid), "resultPackage": package, "analysisMode": "trend"}
    assert replica(params)["validationErrors"] == []
    first = replica({**params, "narrativeRaw": json.dumps(answer("值为999%。"))})
    assert first["degradeFlags"] == []
    failed = replica({**params, "isRetry": True, "narrativeRaw": json.dumps(answer("值为999%。"))})
    assert failed["degradeFlags"] == ["LIVE_MODEL_OUTPUT_INVALID"]
    corrected = replica({**params, "isRetry": True})
    assert corrected["degradeFlags"] == []
    assert corrected["narrative"] is not None


def test_portable_script_uses_only_standard_library_and_python39():
    tree = ast.parse(ANSWER_SCRIPT, feature_version=(3, 9))
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            assert not node.level
            assert node.module in {"__future__", "typing", "dataclasses"}
        if isinstance(node, ast.Import):
            assert all(alias.name in {"re", "json"} for alias in node.names)


def test_spec_guard_and_prompt_cannot_drift():
    nodes = {node["id"]: node for node in load_spec()["nodes"]}
    for key in ("answer", "retry_check"):
        assert nodes[key]["config"]["code"] == ANSWER_SCRIPT
        params = {row["name"]: row["source"] for row in nodes[key]["inputs"]}
        assert params["analysisMode"] == "${contextOutput.analysisMode}"
        assert params["isRetry"] == ("true" if key == "retry_check" else "false")
    for key in ("prompt", "regenerate"):
        assert nodes[key]["config"]["systemPrompt"] == platform_prompt(retry=key == "regenerate")
        assert NARRATIVE_POLICY in nodes[key]["config"]["systemPrompt"]


@pytest.mark.parametrize("question,session", [
    ("美元和去年末相比为什么上升？", {}),
    ("它为什么变化？", {"sessionFocusCurrencyCode": "USD", "lastBaseDate": "2025-12-31"}),
    ("定期存款为什么变化？", {"lastBusinessType": "自营贷款"}),
    ("分母构成是什么？", {}),
    ("资产端构成是什么？", {}),
    ("它为什么变化？", {"lastComparedCurrencies": ["USD", "HKD"], "analysisMode": "attribution"}),
])
def test_context_business_and_node_parity(question, session):
    scope = {"metricCode": "REPRICING_GAP_RATIO", "orgCode": "LEGAL", "currencyCode": "CNY",
             "tenorCode": "1Y", "asOfDate": "2026-07-31"}
    namespace = {}
    exec(CONTEXT_SCRIPT, namespace)
    replica = namespace["handler"]({**scope, "question": question, **session})
    resolved = resolve_context({"scope": scope, "question": question, **session})
    mode = "clarification" if resolved["ambiguousCurrency"] else classify(question, session.get("analysisMode"), session.get("lastBusinessType"), resolved)
    assert replica["analysisMode"] == (mode or "clarification")
    query = replica["query"]
    if replica["analysisMode"] != "clarification":
        assert replica["conversationState"]["focusCurrencyCode"] == resolved["focusCurrencyCode"]
    assert query["frequency"] == resolved["frequency"]
    assert replica["caliber"] == resolved["caliber"]
    if mode in {"overview", "attribution", "business"}:
        from repricing_gap_workflow.analysis import validate_query_dates
        assert validate_query_dates(scope["asOfDate"], query["baseDate"], query["frequency"]) == resolved["baseDate"]
    if mode == "business":
        assert query["businessType"] == _business_type(question, session.get("businessType"), session.get("lastBusinessType"))
    if mode == "calculation":
        assert query["nodeCode"] == _node_code(question, session.get("nodeCode"))


@pytest.mark.parametrize("question", ["", "限额还有多少空间？", "近几个月走势如何？",
    "分母构成是什么？", "较去年末为什么上升？", "自营贷款为什么影响大？",
    "为什么分母不含内部交易？", "美元和港币相比", "随便看看"])
def test_runtime_answer_also_passes_pasted_guard(replica, question):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post("/v1/workflows/run", headers={"X-Demo-User": "demo-analyst"}, json={
                "inputs": {"scope": {"metricCode": "REPRICING_GAP_RATIO", "orgCode": "LEGAL",
                    "currencyCode": "CNY", "tenorCode": "1Y", "asOfDate": "2026-07-31"}, "question": question}})
    response = asyncio.run(run())
    assert response.status_code == 200
    value = response.json()
    assert value["narrative"] is not None
    pasted = replica({"narrativeRaw": json.dumps(value["narrative"]),
        "resultPackage": value["resultPackage"], "analysisMode": value["analysisMode"]})
    assert pasted["validationErrors"] == []


def test_explicit_business_switch_survives_real_session():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test",
            headers={"X-Demo-User": "demo-analyst"}) as client:
            scope = {"metricCode": "REPRICING_GAP_RATIO", "orgCode": "LEGAL", "currencyCode": "CNY",
                     "tenorCode": "1Y", "asOfDate": "2026-07-31"}
            first = await client.post("/v1/workflows/run", json={"inputs": {"scope": scope, "question": "自营贷款为什么影响大？"}})
            assert first.status_code == 200
            second = await client.post("/v1/workflows/run", json={"sessionId": first.json()["sessionId"],
                "inputs": {"scope": scope, "question": "定期存款为什么变化？"}})
            assert second.status_code == 200
            assert second.json()["resultPackage"]["businessType"] == "定期存款"
            third = await client.post("/v1/workflows/run", json={"sessionId": second.json()["sessionId"],
                "inputs": {"scope": scope, "question": "它有哪些新增业务？"}})
            assert third.status_code == 200
            assert third.json()["resultPackage"]["businessType"] == "定期存款"
    asyncio.run(run())
