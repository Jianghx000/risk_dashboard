import asyncio
import json

import httpx

from repricing_gap_workflow import analysis
from repricing_gap_workflow.platform_blueprint import ANSWER_SCRIPT, CONTEXT_SCRIPT, PACKAGE_SCRIPT, get_blueprint
from repricing_gap_workflow.server import _initial_state, app
from repricing_gap_workflow.workflow import MockNarrator, build_graph, classify, validate_answer


SCOPE = {
    "metricCode": analysis.METRIC_CODE,
    "orgCode": analysis.ORG_CODE,
    "currencyCode": analysis.CURRENCY_CODE,
    "tenorCode": analysis.TENOR_CODE,
    "asOfDate": analysis.CURRENT_DATE,
}


def request(question="", **kwargs):
    return {"inputs": {"scope": SCOPE, "question": question, **kwargs}}


def call(path, body, user="demo-analyst"):
    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post(path, json=body, headers={"X-Demo-User": user})

    return asyncio.run(invoke())


def test_default_overview_and_limit():
    response = call("/v1/workflows/run", request())
    assert response.status_code == 200
    body = response.json()
    assert body["analysisMode"] == "overview"
    assert body["resultPackage"]["current"]["value"] > 0
    assert body["resultPackage"]["limit"]["distancePctPoint"] > 0
    assert body["narrative"] is not None
    assert body["validationErrors"] == []
    assert body["modelMode"] == "mock"


def test_attribution_reconciles_to_indicator_change():
    body = call("/v1/workflows/run", request("本月变动由什么导致？", analysisMode="attribution")).json()
    package = body["resultPackage"]
    assert abs(sum(item["impactPctPoint"] for item in package["factors"]) - package["changePctPoint"]) < 1e-7
    assert abs(package["currentRatio"] - package["baseRatio"] - package["changePctPoint"]) < 1e-7
    assert package["reconciliationResidualPctPoint"] == 0
    assert body["narrative"] is not None


def test_calculation_is_one_level_at_a_time():
    root = call("/v1/workflows/run", request("指标怎么算？", analysisMode="calculation", nodeCode="ROOT")).json()
    gap = call("/v1/workflows/run", request("分子构成是什么？", analysisMode="calculation", nodeCode="GAP")).json()
    assert [node["nodeCode"] for node in root["resultPackage"]["children"]] == ["GAP", "DENOMINATOR"]
    assert [node["nodeCode"] for node in gap["resultPackage"]["children"]] == [
        "ASSETS", "LIABILITIES", "BANK_DERIVATIVES", "TRADING_DERIVATIVES"
    ]
    assert root["resultPackage"]["node"]["value"] > 0


def test_business_detail_is_not_presented_as_formal_line_item_attribution():
    body = call("/v1/workflows/run", request("自营贷款为什么影响大？")).json()
    assert body["analysisMode"] == "business"
    assert body["resultPackage"]["changeAmount"] == 30
    assert body["resultPackage"]["illustrativeImpactPctPoint"] > 0
    assert body["resultPackage"]["recordRole"] == "qualitative_evidence_not_formal_attribution"
    assert len(body["resultPackage"]["records"]) == 1


def test_permission_and_scope_rejected():
    assert call("/v1/workflows/run", request(), user="branch-user").status_code == 403
    bad_scope = dict(SCOPE, orgCode="OTHER")
    assert call("/v1/workflows/run", {"inputs": {"scope": bad_scope}}).status_code == 400


def test_stream_sends_deterministic_package_before_final():
    response = call("/v1/workflows/stream", request("限额空间还有多少？"))
    assert response.status_code == 200
    text = response.text.replace(" ", "")
    assert '"type":"STAGE"' in text
    assert '"type":"DONE"' in text
    assert text.index('"type":"STAGE"') < text.index('"type":"DONE"')
    assert '"resultPackage"' in response.text
    for node in ("resolve_context", "fetch_alm_data", "validate_data_package", "generate_narrative", "validate_output", "select_retry"):
        assert f'"node":"{node}"' in text
    assert '"node":"regenerate_narrative"' not in text


def test_workflow_visualization_is_served():
    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.get("/workflow")

    response = asyncio.run(invoke())
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "行内复刻图" in response.text
    assert "实际执行图" not in response.text
    assert "/v1/canvas-spec" in response.text


def test_platform_blueprint_has_copyable_nodes_and_real_api_dependency():
    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.get("/v1/platform-blueprint")

    response = asyncio.run(invoke())
    assert response.status_code == 200
    nodes = response.json()["nodes"]
    assert [node["type"] for node in nodes] == ["开始", "脚本", "条件选择器", "脚本", "Prompt", "脚本", "条件选择器", "脚本", "API", "脚本", "Prompt", "脚本", "条件选择器", "Prompt", "脚本", "结束"]
    assert any(node["id"] == "api" and node["readiness"] == "依赖正式 API" for node in nodes)
    assert all(node.get("configure") and node.get("sourceSection") for node in nodes)


def test_platform_script_examples_are_executable_against_mock_contract():
    def handler(source):
        namespace = {}
        exec(compile(source, "<platform-script>", "exec"), namespace)
        return namespace["handler"]

    context = handler(CONTEXT_SCRIPT)({**SCOPE, "question": "重定价缺口率较上期为何上升？"})
    assert context["analysisMode"] == "attribution"
    async def fetch_mock():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post(
                "/mock/analysis/query",
                json={**SCOPE, "analysisMode": "attribution", "baseDate": analysis.DEFAULT_BASE_DATE},
                headers={"X-Demo-User": "demo-analyst", "X-Service-Token": "demo-token"},
            )

    body = asyncio.run(fetch_mock()).json()
    package = handler(PACKAGE_SCRIPT)({"apiResponse": body, **SCOPE})["resultPackage"]
    assert package["status"] == "available"
    assert package["caliberVersion"]
    bad_answer = '{"headline":"指标为999%","sections":[{"text":"错误","citations":["currentRatio"]}],"numericRefs":[]}'
    result = handler(ANSWER_SCRIPT)({"narrativeRaw": bad_answer, "resultPackage": package, "analysisMode": "attribution"})
    assert result["narrative"] is None
    assert "UNREFERENCED_NUMBER:999" in result["validationErrors"]


def _run_with(narrator, *, allow_template_fallback=True):
    async def invoke():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            graph = build_graph(client, narrator, allow_template_fallback=allow_template_fallback)
            return await graph.ainvoke(_initial_state({"inputs": request()["inputs"]}, "demo-analyst"))

    return asyncio.run(invoke())


class _BadNarrator(MockNarrator):
    def generate(self, mode, data, question, errors):
        return {
            "headline": "错误数字",
            "sections": [{"text": "错误", "citations": ["current.value"]}],
            "numericRefs": [{"path": "current.value", "value": 999}],
        }


class _FailingNarrator(MockNarrator):
    def generate(self, mode, data, question, errors):
        raise RuntimeError("synthetic model outage")


class _InventingNarrator(MockNarrator):
    def generate(self, mode, data, question, errors):
        return {
            "headline": "指标当前为999%",
            "sections": [{"text": "请关注限额", "citations": ["current.value"]}],
            "numericRefs": [],
        }


def test_mock_mode_uses_bank_failure_path_without_template():
    """Mock transport does not introduce a different workflow branch."""
    result = _run_with(_BadNarrator())
    assert result["regen_count"] == 2, "重试预算仍为 1 次"
    assert result["narrative"] is None
    assert result["validation_errors"]
    assert "LIVE_MODEL_OUTPUT_INVALID" in result["degrade_flags"]


def test_live_mode_never_substitutes_a_template():
    """live 模式信任边界：模型输出不合规就留空 + 明确标记，绝不拿模板冒充。"""
    result = _run_with(_BadNarrator(), allow_template_fallback=False)
    assert result["narrative"] is None
    assert "LIVE_MODEL_OUTPUT_INVALID" in result["degrade_flags"]
    assert "MODEL_OUTPUT_INVALID_USED_TEMPLATE" not in result["degrade_flags"]


def test_rejected_answer_never_leaks_to_narrative():
    """Rejected text is not returned as the narrative."""
    result = _run_with(_InventingNarrator())
    assert result["narrative"] is None
    assert "999" not in json.dumps(result["narrative"], ensure_ascii=False)
    assert "LIVE_MODEL_OUTPUT_INVALID" in result["degrade_flags"]


def test_unreferenced_number_gate_fires_before_fallback():
    """门禁确实开火了：live 分支下差异清单里能看到 999。"""
    result = _run_with(_InventingNarrator(), allow_template_fallback=False)
    assert result["narrative"] is None
    assert "UNREFERENCED_NUMBER:999" in result["validation_errors"]


def test_live_mode_marks_model_unavailable_without_template():
    """live 模式下模型不可用：明确标记，不顶替。"""
    result = _run_with(_FailingNarrator(), allow_template_fallback=False)
    assert result["narrative"] is None
    assert "LIVE_MODEL_UNAVAILABLE" in result["degrade_flags"]


def test_mock_mode_marks_narrative_unavailable():
    result = _run_with(_FailingNarrator())
    assert result["result_package"]["current"]["value"] > 0, "确定性数据必须保住"
    assert "NARRATIVE_UNAVAILABLE" in result["degrade_flags"]


def test_server_disables_template_fallback_in_live_mode(monkeypatch):
    """**接线**层面的信任边界：ALM_AI_MODE=live 时 HTTP 端点必须关闭模板兜底。

    只测 build_graph 不够——如果 server 忘了传这个参数，单元测试照样全绿，
    而线上会把固定文案当成模型输出发给用户。demoFault 优先于 live 选角，
    所以这里不需要真实密钥就能验证接线。
    """
    monkeypatch.setenv("ALM_AI_MODE", "live")
    body = call("/v1/workflows/run", request("现在重定价缺口率是多少？", demoFault="invalid_answer")).json()

    assert body["modelMode"] == "live"
    assert body["narrative"] is None, "live 模式不得用模板冒充模型输出"
    assert "LIVE_MODEL_OUTPUT_INVALID" in body["degradeFlags"]
    assert "MODEL_OUTPUT_INVALID_USED_TEMPLATE" not in body["degradeFlags"]


def test_unset_alm_ai_mode_is_live(monkeypatch):
    monkeypatch.delenv("ALM_AI_MODE", raising=False)
    from repricing_gap_workflow.server import _is_live

    assert _is_live() is True


def test_server_uses_bank_failure_path_in_mock_mode(monkeypatch):
    monkeypatch.setenv("ALM_AI_MODE", "mock")
    body = call("/v1/workflows/run", request("现在重定价缺口率是多少？", demoFault="invalid_answer")).json()

    assert body["modelMode"] == "mock"
    assert body["narrative"] is None
    assert "LIVE_MODEL_OUTPUT_INVALID" in body["degradeFlags"]


def test_date_and_tenor_labels_are_not_measurements():
    result = {"current": {"value": 12.5}}
    answer = {
        "headline": "2026-07 法人人民币1Y指标",
        "sections": [{"text": "当前为12.5%。", "citations": ["current.value"]}],
        "numericRefs": [{"path": "current.value", "value": 12.5}],
    }
    assert validate_answer(answer, result) == []


def test_chinese_month_labels_are_not_measurements():
    result = {"current": {"value": 12.5}}
    answer = {
        "headline": "2026年5月至7月指标上升",
        "sections": [{"text": "7月为12.5%。", "citations": ["current.value"]}],
        "numericRefs": [{"path": "current.value", "value": 12.5}],
    }
    assert validate_answer(answer, result) == []


def test_why_rising_routes_to_attribution():
    assert classify("重定价缺口率较上期为何上升？", None) == "attribution"


def test_position_id_is_not_treated_as_a_measurement():
    result = {"records": [{"positionId": "LOAN-1001"}], "changeAmount": 30.0}
    answer = {
        "headline": "业务变化",
        "sections": [{"text": "LOAN-1001 对应业务变化30亿元。", "citations": ["records.0.positionId", "changeAmount"]}],
        "numericRefs": [{"path": "changeAmount", "value": 30.0}],
    }
    assert validate_answer(answer, result) == []


def test_illustrative_business_impact_requires_explicit_label():
    result = {"attributionMethod": "SYNTHETIC_GROUP_IMPACT_ALLOCATION_NOT_FORMAL_ALM_OWEN", "illustrativeImpactPctPoint": 2.9}
    answer = {
        "headline": "自营贷款影响2.9个百分点",
        "sections": [{"text": "该业务影响2.9个百分点。", "citations": ["illustrativeImpactPctPoint"]}],
        "numericRefs": [{"path": "illustrativeImpactPctPoint", "value": 2.9}],
    }
    assert "ILLUSTRATIVE_IMPACT_IN_HEADLINE" in validate_answer(answer, result)
    assert "ILLUSTRATIVE_IMPACT_UNLABELED" in validate_answer(answer, result)


def test_methodology_response_is_valid():
    body = call("/v1/workflows/run", request("为什么分母不含内部交易？")).json()
    assert body["analysisMode"] == "methodology"
    assert body["narrative"] is not None
    assert body["validationErrors"] == []


def test_followup_uses_small_server_side_session_context():
    first = call("/v1/workflows/run", request("自营贷款为什么影响大？")).json()
    second = call("/v1/workflows/run", {**request("它有哪些新增业务？"), "sessionId": first["sessionId"]}).json()
    assert second["analysisMode"] == "business"
    assert second["resultPackage"]["businessType"] == "自营贷款"
    assert second["sessionId"] == first["sessionId"]
    assert "tool_result" not in second
    assert call("/v1/workflows/run", {**request("它有哪些新增业务？"), "sessionId": first["sessionId"]}, user="branch-user").status_code == 400
