"""spec 的完整性：变量必须有释义，适配器不得丢字段。

spec 是**手工维护**的事实源（一次性迁移脚本已删除），所以要守两件事：
变量释义不能被截断；平台侧与运行期两侧都必须从 spec 派生而不是各存一份。

回归的真实缺陷：``platform_blueprint`` 适配器重建 ``fields`` 时把示例值写成空串，
经「spec → 适配器 → 生成器 → spec」闭环逐步丢失，开始节点的释义退化成
「必填；示例」。有损适配器只能靠逐字段比对抓得住。
"""

import json
from pathlib import Path

import pytest

from repricing_gap_workflow.platform_blueprint import get_blueprint, load_spec

REPO = Path(__file__).resolve().parents[3]
SPEC_PATH = REPO / "AI编排" / "metrics" / "repricing_gap" / "blueprint.spec.json"


@pytest.fixture(scope="module")
def spec():
    return load_spec()


# ---------------------------------------------------------------- 释义完整性


def test_every_variable_has_a_description(spec):
    missing = [
        (node["id"], row["name"])
        for node in spec["nodes"]
        for row in node["inputs"] + node["outputs"]
        if not str(row.get("desc", "")).strip()
    ]
    assert missing == [], f"这些变量没有释义: {missing}"


def test_no_truncated_descriptions(spec):
    """『必填；示例』这种半截句子是往返丢字段留下的痕迹。"""
    suspicious = [
        (node["id"], row["name"], row["desc"])
        for node in spec["nodes"]
        for row in node["inputs"] + node["outputs"]
        if str(row.get("desc", "")).rstrip().endswith(("；示例", "示例", "：", "；"))
    ]
    assert suspicious == [], f"释义疑似被截断: {suspicious}"


def test_start_inputs_have_no_stale_example_phrasing(spec):
    """开始节点的释义应是手写的完整说明，不是旧的『必填；示例 X』拼接残留。"""
    start = next(node for node in spec["nodes"] if node["id"] == "start")
    for row in start["inputs"]:
        assert row["desc"].strip(), f"{row['name']} 释义为空"
        assert "示例" not in row["desc"], f"{row['name']} 的释义退化成旧的示例拼接写法"


# ---------------------------------------------------------------- 适配器保真
#
# spec 是手工维护的事实源（不再有生成器），所以要守的是「适配器不得丢字段」——
# 之前 build_spec.py 往返时把示例值丢成空串，就是适配器有损。


def test_adapter_preserves_every_node_field(spec):
    blueprint = get_blueprint()
    # 适配器只做 id 改名（__end__ → end），其余字段必须原样带出
    legacy_to_spec = {node["id"]: (node["id"] if node["id"] != "end" else "__end__") for node in blueprint["nodes"]}
    by_id = {node["id"]: node for node in spec["nodes"]}
    assert len(blueprint["nodes"]) == len(spec["nodes"])
    for legacy in blueprint["nodes"]:
        source = by_id[legacy_to_spec[legacy["id"]]]
        assert legacy["inputs"] == source["inputs"], f"{legacy['id']} 的 inputs 被改写"
        assert legacy["outputs"] == source["outputs"], f"{legacy['id']} 的 outputs 被改写"
        assert legacy["configure"] == source.get("configure", []), f"{legacy['id']} 的 configure 不一致"
        assert legacy["sourceSection"] == source.get("sourceSection", "")
        assert legacy["readiness"] == source.get("readiness", "")


def test_graph_spec_reads_runtime_from_spec(spec):
    """运行期元数据也归 spec 所有，graph_spec 不得自带一份。"""
    from repricing_gap_workflow import graph_spec

    runtime = spec["meta"]["runtime"]
    assert [node["id"] for node in runtime["nodes"]] == graph_spec.RUNTIME_ORDER
    assert graph_spec.MAPPING == runtime["mapping"]
    assert graph_spec.DIFFERENCES == runtime["differences"]
    assert set(graph_spec.RUNTIME_META) == {node["id"] for node in runtime["nodes"]}


def test_runtime_order_covers_every_mapped_node(spec):
    """映射里出现的运行期节点都必须在 order 里，否则画布布局会漏节点。"""
    runtime = spec["meta"]["runtime"]
    mapped = {rid for row in runtime["mapping"] for rid in row["runtimeIds"]}
    missing = mapped - set(runtime["order"])
    assert not missing, f"映射引用了不在 order 里的运行期节点: {sorted(missing)}"


def test_adapter_does_not_drop_output_variables(spec):
    """适配器要原样带出 outputs——页面靠它渲染输出表。"""
    blueprint = get_blueprint()
    assert len(blueprint["nodes"]) == len(spec["nodes"])
    for node, original in zip(blueprint["nodes"], spec["nodes"]):
        assert node["inputs"] == original["inputs"], node["id"]
        assert node["outputs"] == original["outputs"], node["id"]


# ---------------------------------------------------------------- 结构约定


def test_terminal_node_uses_the_spec_reserved_id(spec):
    """spec-schema v1：工作流终点固定为 __end__，边也指向它。"""
    node_ids = {node["id"] for node in spec["nodes"]}
    assert "__end__" in node_ids
    assert "end" not in node_ids, "终点节点的 id 必须是 __end__，否则渲染器会另补一个虚线终点"
    for edge in spec["edges"]:
        assert edge["to"] in node_ids, f"边指向不存在的节点: {edge}"
    assert [edge for edge in spec["edges"] if edge["kind"] == "end"], "应有汇入终点的边"


def test_spec_has_no_back_edges(spec):
    """行内画布无回边；重试必须是前向链。"""
    assert [edge for edge in spec["edges"] if edge["kind"] == "back-edge"] == []


def test_spec_declares_our_two_schema_extensions(spec):
    """config.code 承载完整可粘贴脚本，是保住『一键复制建站』的关键。"""
    scripted = [node["id"] for node in spec["nodes"] if node["config"].get("code")]
    assert set(scripted) == {"context", "package", "answer", "retry_check"}
    for node in spec["nodes"]:
        if node["config"].get("code"):
            assert "def handler(params):" in node["config"]["code"], node["id"]


def test_warning_notes_are_the_open_items(spec):
    warnings = [note for note in spec["inlineNotes"] if note.get("severity") == "warning"]
    assert len(warnings) >= 5, "行内待实测项应作为 warning 保留，不得写成确定事实"
    assert get_blueprint()["openItems"], "openItems 应由 spec 的 warning 说明派生"


def test_start_output_is_marked_platform_builtin(spec):
    """开始节点没有"输出参数"配置项，systemInput 是平台内置变量（docx 片段 3）。

    原文：「平台内置了 systemInput 变量，用于唯一标识开始节点（**其他节点也有唯一
    标识变量-输出变量名，由用户自定义**）」。所以它不能被写成普通输出变量——
    否则建站的人会去开始节点上找一个并不存在的"输出参数"配置字段。
    """
    start = next(node for node in spec["nodes"] if node["id"] == "start")
    outputs = start["outputs"]
    assert len(outputs) == 1
    assert outputs[0]["name"] == "systemInput"
    assert "内置" in outputs[0]["type"], "类型应标明是平台内置、不可配置"
    assert "不产出输出变量" in outputs[0]["desc"], "应说明开始节点本身不产出输出"
    # 不应出现任何会被误解为"可配置输出参数"的措辞
    assert start["config"].get("outputParams") is None
    assert start["config"].get("outputName") is None


# ---------------------------------------------------------------- 页面文案归属


VIEW = REPO / "AI编排" / "repricing_gap_workflow" / "workflow_view.html"

# 通用页面模板里不该出现的两类内容：指标名、以及指标特有的业务概念。
METRIC_NAME = "重定价缺口率"
METRIC_CONCEPTS = ("lastBusinessType", "自营贷款", "REPRICING_GAP_RATIO", "LEGAL")


def test_page_template_hardcodes_no_metric_content():
    """复刻图页面是通用模板：指标名与指标业务概念必须来自 spec。

    回归：模板曾写死「重定价缺口率」与「用 lastBusinessType 解析『它』」——
    下一个指标维持上下文的方式可能完全不同（例如靠币种或基期），照抄即错。
    """
    source = VIEW.read_text(encoding="utf-8")
    assert METRIC_NAME not in source, "页面模板写死了指标名，应从 spec 的 meta.displayName 读"
    for concept in METRIC_CONCEPTS:
        assert concept not in source, f"页面模板写死了指标业务概念 {concept}"


def test_spec_carries_the_page_copy(spec):
    """指标特有文案放在 spec.meta，由渲染层透出给页面。"""
    meta = spec["meta"]
    for key in ("displayName", "sessionNote", "reentryNote", "canvasNote"):
        assert str(meta.get(key, "")).strip(), f"spec.meta 缺少 {key}"


def test_page_info_flows_from_spec_to_canvas_spec(spec):
    """适配器与 canvas-spec 都要把这段文案透出去，否则页面拿到的是空串。"""
    from repricing_gap_workflow.graph_spec import get_canvas_spec

    page = get_canvas_spec()["platform"]["pageInfo"]
    assert page["displayName"] == spec["meta"]["displayName"]
    assert page["sessionNote"] == spec["meta"]["sessionNote"]
    assert page["reentryNote"] == spec["meta"]["reentryNote"]
    assert page["canvasNote"] == spec["meta"]["canvasNote"]


def test_spec_file_is_synced_with_disk(spec):
    """入库的 spec 文件必须就是 load_spec() 读到的内容（防止手改文件绕过生成）。"""
    on_disk = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    assert on_disk == spec


# ---------------------------------------------------------------- 复刻脚本不得比运行期更宽松


def test_context_script_in_spec_matches_pasteable_constant(spec):
    from repricing_gap_workflow.platform_blueprint import CONTEXT_SCRIPT

    context = next(node for node in spec["nodes"] if node["id"] == "context")
    assert context["config"]["code"] == CONTEXT_SCRIPT


def _replica_handler():
    from repricing_gap_workflow.platform_blueprint import CONTEXT_SCRIPT

    namespace = {}
    exec(compile(CONTEXT_SCRIPT, "<context-script>", "exec"), namespace)
    return namespace["handler"]


REPLICA_SCOPE = {
    "metricCode": "REPRICING_GAP_RATIO",
    "orgCode": "LEGAL",
    "currencyCode": "CNY",
    "tenorCode": "1Y",
    "asOfDate": "2026-07-31",
}

# 复刻脚本没有 resolve_context，不会自动走到 currencyCompare；其余问法必须与 classify() 同判。
REPLICA_VS_RUNTIME = (
    ("", None, "overview"),
    ("重定价缺口率", None, "overview"),
    ("重定价缺口率怎么样", None, "overview"),
    ("现在重定价缺口率是多少？", None, "overview"),
    ("限额还有多少空间？", None, "limit"),
    ("为什么限额是16", None, "limit"),
    ("为什么分母不含内部交易？", None, "methodology"),
    ("指标怎么算？", None, "calculation"),
    ("重定价缺口率较上期为何上升？", None, "attribution"),
    ("为啥涨", None, "attribution"),
    ("怎么变的", None, "attribution"),
    ("近几个月走势如何？", None, "trend"),
    ("自营贷款为什么影响大？", None, "business"),
    ("帮我看看这个指标最近什么情况", None, "clarification"),
    ("随便看看", None, "clarification"),
    ("这指标最近啥情况", None, "clarification"),
    ("它有哪些新增业务？", "自营贷款", "business"),
)


def test_replica_script_is_not_more_lenient_than_runtime_classify():
    from repricing_gap_workflow.workflow import classify

    handler = _replica_handler()
    mismatches = []
    for question, last_business, expected in REPLICA_VS_RUNTIME:
        replica = handler({**REPLICA_SCOPE, "question": question, "lastBusinessType": last_business or ""})
        runtime = classify(question, None, last_business)
        runtime_mode = runtime if runtime is not None else "clarification"
        if replica["analysisMode"] != expected or runtime_mode != expected:
            mismatches.append((question, replica["analysisMode"], runtime_mode, expected))
    assert mismatches == [], f"复刻脚本与运行期分类不一致: {mismatches}"


def test_replica_script_does_not_fallback_unrecognized_intent_to_overview():
    replica = _replica_handler()({**REPLICA_SCOPE, "question": "帮我看看这个指标最近什么情况"})
    assert replica["analysisMode"] == "clarification"
