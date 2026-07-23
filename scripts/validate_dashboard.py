from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "prototype" / "dashboard-data.js"
CONFIG_FILE = ROOT / "prototype" / "dashboard-config.js"
DOMAIN_FILE = ROOT / "prototype" / "dashboard-domain.js"
UTILS_FILE = ROOT / "prototype" / "dashboard-utils.js"
APP_FILE = ROOT / "prototype" / "app.js"
SIMULATION_FILE = ROOT / "prototype" / "dashboard-simulation.js"
PROCESSES_FILE = ROOT / "prototype" / "dashboard-processes.js"
BUSINESS_RENDERERS_FILE = ROOT / "prototype" / "dashboard-business-renderers.js"
INTEREST_RENDERERS_FILE = ROOT / "prototype" / "dashboard-interest-renderers.js"
LIQUIDITY_RENDERERS_FILE = ROOT / "prototype" / "dashboard-liquidity-renderers.js"
RENDERERS_FILE = ROOT / "prototype" / "dashboard-renderers.js"
EVENTS_FILE = ROOT / "prototype" / "dashboard-events.js"
STYLES_FILE = ROOT / "prototype" / "styles.css"
INDEX_FILE = ROOT / "prototype" / "index.html"

FORBIDDEN_RENDERER_SNIPPETS = [
    'pageName.includes("利率")',
    'pageName.includes("流动性")',
    'pageName.includes("汇率")',
    'String(block?.name || "").includes("期权性风险")',
    'currentPageId || "") === "page-4"',
    'Number(widget?.seq) === 5',
    'Number(widget?.seq) === 6',
    'String(widgetSeq) === "49"',
    'String(widgetSeq) === "50"',
    'String(widgetSeq) === "89"',
    'String(widgetSeq) === "96"',
    'title.includes("久期")',
    'title.includes("缺口")',
    'title.includes("波动")',
    'title.includes("变动")',
    'title.includes("规模及增速")',
    'title.includes("覆盖率")',
    'title.includes("LCR")',
    'title.includes("\u878d\u8d44")',
]

FORBIDDEN_LEGACY_TEXT_SNIPPETS = [
    "\u5386\u53f2\u6708\u9891+\u5f53\u6708\u7684\u65e5\u9891",
    "\u5386\u53f2\u6708\u9891+\u5f53\u6708\u65e5\u9891",
    "\u5386\u53f2\u6708\u9891+\u672c\u6708\u9010\u65e5",
    "\u6708\u9891+\u5f53\u6708\u7684\u65e5\u9891",
    "\u6708\u9891+\u5f53\u6708\u65e5\u9891",
    "\u5386\u53f2\u533a\u95f4\u6309\u6708\u5c55\u793a\uff0c\u5f53\u6708\u6309\u65e5\u5c55\u793a",
    "\u5386\u53f2\u533a\u95f4\u6309\u6708\u5c55\u793a\uff0c\u672c\u6708\u6309\u65e5\u5c55\u793a",
]

FORBIDDEN_REMOVED_FEATURE_SNIPPETS = [
    "fxExposureMatrix",
    "renderFxExposureMatrixTable",
    'getSimulationMode(page) === "fx"',
    '"simulationMode": "fx"',
    "hedgeableItemOptions",
    "simulationDefaultBusinessTypes",
    "simulationModes",
    "simulationDraftMode",
    "hedgeSimulationDraft",
    "getSimulationModeTabs",
    "renderHedgeSimulationPanel",
    "renderNewBusinessSimulationPanel",
    "normalizeSimulationScenario",
    "normalizeHedgeSimulationScenario",
    "risk-dashboard:simulation-module-request",
    "data-simulation-mode-tab",
    "repricing-quick-config",
    "repricing-upload-action",
    "baseSource",
]

EXPECTED_PAGE_IDS_BY_NAME = {
    "利率风险": "interest-risk",
    "流动性风险": "liquidity-risk",
    "业务变动分析": "business-change",
}

ALLOWED_SIMULATION_WIDGET_SEQS = {9, 49}
SOURCE_ONLY_WIDGET_SEQS = {3, 4}
REMOVED_WIDGET_SEQS = {5, 8, 10, 11, 16, 17, 57, 58}
REMOVED_STRUCTURE_LAYER_NAMES = {"核心风险指标", "缺口风险", "现金流错配"}
ALLOWED_COMPONENT_TYPES = {
    "折线图",
    "柱线组合图",
    "双轴柱线组合图",
    "穿透折线图",
    "期限分布图",
    "限额折线图",
    "限额双柱时序图",
    "堆叠柱线组合图",
    "表格",
}
ALLOWED_GRAINS = {"月度", "时点快照", "日度", "明细", "时间区间"}


def load_window_json(path: Path, variable_name: str) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8").strip()
    prefix = f"window.{variable_name} = "
    if not text.startswith(prefix) or not text.endswith(";"):
        raise ValueError(f"{path.name} is not in expected window.{variable_name} format")
    payload = text[len(prefix) : -1].strip()
    return json.loads(payload)


def normalize_filter_name(name: str) -> str:
    value = str(name)
    for left, right in (("（", "）"), ("(", ")")):
        while left in value and right in value:
            start = value.find(left)
            end = value.find(right, start + 1)
            if start < 0 or end < 0:
                break
            value = value[:start] + value[end + 1 :]
    return value.strip()

def ensure_fields(obj: dict[str, Any], required: list[str], label: str, errors: list[str]) -> None:
    missing = [field for field in required if field not in obj or obj[field] in (None, "")]
    if missing:
        errors.append(f"{label} missing required fields: {', '.join(missing)}")


def validate_dashboard_data(data: dict[str, Any], config: dict[str, Any]) -> tuple[list[str], list[str], dict[str, Any]]:
    errors: list[str] = []
    warnings: list[str] = []

    pages = data.get("pages")
    if not isinstance(pages, list) or not pages:
        return ["dashboard-data.js has no pages"], warnings, {}

    widget_index: dict[int, dict[str, Any]] = {}
    page_ids: set[str] = set()
    page_names: set[str] = set()
    area_ids: set[str] = set()
    area_names: set[str] = set()
    widget_context: dict[int, dict[str, Any]] = {}
    total_blocks = 0
    total_areas = 0
    total_widgets = 0

    for page in pages:
        ensure_fields(page, ["id", "name", "blocks"], f"page {page!r}", errors)
        expected_page_id = EXPECTED_PAGE_IDS_BY_NAME.get(str(page.get("name")))
        if expected_page_id and page.get("id") != expected_page_id:
            errors.append(
                f"page id for {page.get('name')} should be {expected_page_id}, got {page.get('id')}"
            )
        if page.get("id") in page_ids:
            errors.append(f"duplicate page id: {page.get('id')}")
        page_ids.add(page.get("id"))
        page_names.add(str(page.get("name")))
        blocks = page.get("blocks")
        if not isinstance(blocks, list):
            errors.append(f"page {page.get('id')} blocks should be a list")
            continue
        total_blocks += len(blocks)
        if "blockCount" in page and page["blockCount"] != len(blocks):
            errors.append(f"page {page.get('id')} blockCount mismatch: {page['blockCount']} != {len(blocks)}")
        page_area_count = 0
        page_widget_count = 0
        page_block_ids: set[str] = set()

        for block in blocks:
            ensure_fields(block, ["id", "name", "areas"], f"block {block!r}", errors)
            if block.get("id") in page_block_ids:
                errors.append(f"duplicate block id within page {page.get('id')}: {block.get('id')}")
            page_block_ids.add(block.get("id"))
            if str(block.get("name")) in REMOVED_STRUCTURE_LAYER_NAMES:
                errors.append(f"removed structure layer still appears in dashboard data: {block.get('name')}")
            areas = block.get("areas")
            if not isinstance(areas, list):
                errors.append(f"block {block.get('id')} areas should be a list")
                continue
            total_areas += len(areas)
            page_area_count += len(areas)
            if "widgetCount" in block:
                actual_block_widgets = sum(len(area.get("widgets", [])) for area in areas if isinstance(area.get("widgets"), list))
                if block["widgetCount"] != actual_block_widgets:
                    errors.append(
                        f"block {block.get('id')} widgetCount mismatch: {block['widgetCount']} != {actual_block_widgets}"
                    )
            area_name_counts: dict[str, int] = {}
            for area in areas:
                area_name = str(area.get("name"))
                area_name_counts[area_name] = area_name_counts.get(area_name, 0) + 1

            for area in areas:
                ensure_fields(area, ["id", "name", "widgets"], f"area {area!r}", errors)
                if area.get("id") in area_ids:
                    errors.append(f"duplicate area id: {area.get('id')}")
                area_ids.add(area.get("id"))
                group_key = area.get("groupKey")
                if group_key is not None and (not isinstance(group_key, str) or not group_key.strip()):
                    errors.append(f"area {area.get('id')} groupKey should be a non-empty string")
                if area_name_counts.get(str(area.get("name")), 0) > 1 and not isinstance(group_key, str):
                    errors.append(
                        f"duplicate area name '{area.get('name')}' in block {block.get('id')} should declare groupKey"
                    )
                area_names.add(str(area.get("name")))
                widgets = area.get("widgets")
                if not isinstance(widgets, list) or not widgets:
                    errors.append(f"area {area.get('id')} widgets should be a non-empty list")
                    continue
                page_widget_count += len(widgets)
                total_widgets += len(widgets)

                shared_filters = area.get("sharedFilters", [])
                if shared_filters and not isinstance(shared_filters, list):
                    errors.append(f"area {area.get('id')} sharedFilters should be a list")
                filter_preset = area.get("filterPreset")
                if filter_preset is not None and filter_preset not in config.get("filter_preset_names", set()):
                    errors.append(f"area {area.get('id')} references unknown filterPreset: {filter_preset}")
                for obsolete_field in ("viewScope", "scopeMeta"):
                    if obsolete_field in area:
                        errors.append(f"area {area.get('id')} should not declare obsolete field {obsolete_field}")

                for shared_filter in shared_filters:
                    normalized = normalize_filter_name(shared_filter)
                    if normalized and normalized not in config["filter_option_names"]:
                        warnings.append(
                            f"area {area.get('id')} shared filter '{shared_filter}' has no matching filters.options entry"
                        )

                for widget in widgets:
                    ensure_fields(widget, ["seq", "title", "componentType"], f"widget {widget!r}", errors)
                    seq = widget.get("seq")
                    if not isinstance(seq, int):
                        errors.append(f"widget in area {area.get('id')} has non-integer seq: {seq!r}")
                        continue
                    if widget.get("componentType") not in ALLOWED_COMPONENT_TYPES:
                        errors.append(f"widget {seq} has unsupported componentType: {widget.get('componentType')!r}")
                    if widget.get("grain") not in ALLOWED_GRAINS:
                        errors.append(f"widget {seq} has unsupported grain: {widget.get('grain')!r}")
                    if seq in widget_index:
                        errors.append(f"duplicate widget seq: {seq}")
                    if seq in REMOVED_WIDGET_SEQS:
                        errors.append(f"removed widget seq still appears in dashboard data: {seq}")
                    if seq in SOURCE_ONLY_WIDGET_SEQS and widget.get("renderRole") != "sourceOnly":
                        errors.append(f"widget seq {seq} should be marked renderRole=sourceOnly")
                    widget_index[seq] = widget
                    widget_context[seq] = {
                        "page_id": str(page.get("id")),
                        "page_name": str(page.get("name")),
                        "title": str(widget.get("title")),
                        "component_type": str(widget.get("componentType")),
                    }

        if "areaCount" in page and page["areaCount"] != page_area_count:
            errors.append(f"page {page.get('id')} areaCount mismatch: {page['areaCount']} != {page_area_count}")
        if "widgetCount" in page and page["widgetCount"] != page_widget_count:
            errors.append(f"page {page.get('id')} widgetCount mismatch: {page['widgetCount']} != {page_widget_count}")

    if data.get("pageCount") != len(pages):
        errors.append(f"pageCount mismatch: {data.get('pageCount')} != {len(pages)}")
    if data.get("widgetCount") != total_widgets:
        errors.append(f"widgetCount mismatch: {data.get('widgetCount')} != {total_widgets}")

    stats = {
        "pages": len(pages),
        "blocks": total_blocks,
        "areas": total_areas,
        "widgets": total_widgets,
        "widget_index": widget_index,
        "widget_context": widget_context,
        "page_names": page_names,
        "area_names": area_names,
    }
    return errors, warnings, stats


def validate_dashboard_config(config: dict[str, Any], stats: dict[str, Any]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    filter_options = config.get("filters", {}).get("options", {})
    filter_presets = config.get("filters", {}).get("presets", {})
    defaults = config.get("filters", {}).get("defaults", {})
    area_overrides = config.get("filters", {}).get("areaOverrides", {})
    page_behavior = config.get("pageBehavior", {})
    layout_rules = config.get("layoutRules", {})
    widget_behavior = config.get("widgetBehavior", {})
    widget_filters = config.get("widgetFilters", {})
    widget_filter_presets = config.get("widgetFilterPresets", {})
    series_rules = config.get("seriesRules", {})
    visual_rules = config.get("visualRules", {})
    simulation_rules = config.get("simulationRules", {})
    table_templates = config.get("tableTemplates", {})
    management_limits = config.get("managementLimits", [])
    widget_index = stats["widget_index"]
    widget_context = stats["widget_context"]
    page_names = stats["page_names"]
    area_names = stats["area_names"]
    if not isinstance(filter_options, dict):
        errors.append("filters.options should be an object")
        filter_options = {}

    filter_option_names = set(filter_options.keys())
    normalized_filter_option_names = {normalize_filter_name(name) for name in filter_option_names}
    config["filter_option_names"] = filter_option_names

    for filter_name, values in filter_options.items():
        if not isinstance(values, list) or not values:
            errors.append(f"filters.options.{filter_name} should be a non-empty list")

    if not isinstance(filter_presets, dict):
        errors.append("filters.presets should be an object")
        filter_presets = {}
    else:
        for preset_name, values in filter_presets.items():
            if not isinstance(values, list):
                errors.append(f"filters.presets.{preset_name} should be a list")
                continue
            invalid = [value for value in values if normalize_filter_name(value) not in normalized_filter_option_names]
            if invalid:
                errors.append(
                    f"filters.presets.{preset_name} contains unknown filter names: {', '.join(map(str, invalid))}"
                )

    if not isinstance(defaults, dict):
        errors.append("filters.defaults should be an object")
    else:
        for filter_name, values in defaults.items():
            if filter_name not in filter_option_names:
                errors.append(f"filters.defaults.{filter_name} has no matching filters.options entry")
                continue
            if not isinstance(values, list):
                errors.append(f"filters.defaults.{filter_name} should be a list")
                continue
            invalid = [value for value in values if value not in filter_options[filter_name]]
            if invalid:
                errors.append(
                    f"filters.defaults.{filter_name} contains unknown values: {', '.join(map(str, invalid))}"
                )

    if not isinstance(area_overrides, dict):
        errors.append("filters.areaOverrides should be an object")
    else:
        for area_name, overrides in area_overrides.items():
            if area_name not in area_names:
                warnings.append(f"filters.areaOverrides references unknown area name: {area_name}")
            if not isinstance(overrides, dict):
                errors.append(f"filters.areaOverrides.{area_name} should be an object")
                continue
            for filter_name, values in overrides.items():
                if normalize_filter_name(filter_name) not in normalized_filter_option_names:
                    warnings.append(f"filters.areaOverrides.{area_name}.{filter_name} has no matching filters.options entry")
                if not isinstance(values, list):
                    errors.append(f"filters.areaOverrides.{area_name}.{filter_name} should be a list")

    if not isinstance(page_behavior, dict):
        errors.append("pageBehavior should be an object")
    else:
        allowed_date_range_modes = {"sharedGlobal"}
        allowed_analysis_perspectives = {"interestBalanceStructure", "liquidityBalanceStructure"}
        for page_name, behavior in page_behavior.items():
            if page_name not in page_names:
                warnings.append(f"pageBehavior references unknown page name: {page_name}")
            if not isinstance(behavior, dict):
                errors.append(f"pageBehavior.{page_name} should be an object")
                continue
            if "simulationMode" in behavior:
                errors.append(f"pageBehavior.{page_name}.simulationMode is obsolete; simulation is widget-specific")
            if "dateRangeMode" in behavior and behavior.get("dateRangeMode") not in allowed_date_range_modes:
                errors.append(
                    f"pageBehavior.{page_name}.dateRangeMode should be one of: "
                    + ", ".join(sorted(allowed_date_range_modes))
                )
            if (
                "analysisPerspective" in behavior
                and behavior.get("analysisPerspective") not in allowed_analysis_perspectives
            ):
                errors.append(
                    f"pageBehavior.{page_name}.analysisPerspective should be one of: "
                    + ", ".join(sorted(allowed_analysis_perspectives))
                )
        business_behavior = page_behavior.get("业务变动分析")
        if not isinstance(business_behavior, dict):
            errors.append("pageBehavior.业务变动分析 is required")
        elif business_behavior.get("analysisPerspective") != "interestBalanceStructure":
            errors.append("pageBehavior.业务变动分析.analysisPerspective should be interestBalanceStructure")
        else:
            if business_behavior.get("dateRangeMode") != "sharedGlobal":
                errors.append("pageBehavior.业务变动分析.dateRangeMode should be sharedGlobal")
            perspective_options = business_behavior.get("analysisPerspectiveOptions")
            if not isinstance(perspective_options, list):
                errors.append("pageBehavior.业务变动分析.analysisPerspectiveOptions should be a list")
            elif set(perspective_options) != allowed_analysis_perspectives:
                errors.append(
                    "pageBehavior.业务变动分析.analysisPerspectiveOptions should include interestBalanceStructure and liquidityBalanceStructure"
                )

    for obsolete_key in ("blockDisplay", "areaDisplay", "tabs"):
        if obsolete_key in config:
            errors.append(f"{obsolete_key} is obsolete in the flat dashboard architecture")

    if not isinstance(widget_behavior, dict):
        errors.append("widgetBehavior should be an object")
    else:
        for seq_text, behavior in widget_behavior.items():
            try:
                seq = int(seq_text)
            except ValueError:
                errors.append(f"widgetBehavior key is not an integer: {seq_text}")
                continue
            if seq not in widget_index:
                warnings.append(f"widgetBehavior references unknown widget seq: {seq}")
            if not isinstance(behavior, dict):
                errors.append(f"widgetBehavior.{seq_text} should be an object")
                continue
            if "frequencyToggle" in behavior and not isinstance(behavior.get("frequencyToggle"), bool):
                errors.append(f"widgetBehavior.{seq_text}.frequencyToggle should be a boolean")
            if "fullWidth" in behavior and not isinstance(behavior.get("fullWidth"), bool):
                errors.append(f"widgetBehavior.{seq_text}.fullWidth should be a boolean")
            if "yAxisLabel" in behavior and not isinstance(behavior.get("yAxisLabel"), str):
                errors.append(f"widgetBehavior.{seq_text}.yAxisLabel should be a string")
            for key in ("chartKind", "tableKind", "defaultTableDimension"):
                if key in behavior and not isinstance(behavior.get(key), str):
                    errors.append(f"widgetBehavior.{seq_text}.{key} should be a string")
            if "drilldownTargetSeq" in behavior:
                target_seq = behavior.get("drilldownTargetSeq")
                if not isinstance(target_seq, int):
                    errors.append(f"widgetBehavior.{seq_text}.drilldownTargetSeq should be an integer")
                elif target_seq not in widget_index:
                    errors.append(f"widgetBehavior.{seq_text}.drilldownTargetSeq references unknown widget seq: {target_seq}")
            for key in ("detailScope",):
                if key in behavior and not isinstance(behavior.get(key), str):
                    errors.append(f"widgetBehavior.{seq_text}.{key} should be a string")
            if "methodologyKey" in behavior and behavior.get("methodologyKey") not in {
                "newMonthly", "maturityMonthly"
            }:
                errors.append(f"widgetBehavior.{seq_text}.methodologyKey is invalid")
            if "inlineFilters" in behavior:
                values = behavior.get("inlineFilters")
                if not isinstance(values, list) or not all(isinstance(value, str) and value for value in values):
                    errors.append(f"widgetBehavior.{seq_text}.inlineFilters should be a string list")
            if "localFilters" in behavior and not isinstance(behavior.get("localFilters"), list):
                errors.append(f"widgetBehavior.{seq_text}.localFilters should be a list")
            if "simulationBehavior" in behavior:
                if seq not in ALLOWED_SIMULATION_WIDGET_SEQS:
                    errors.append(
                        f"widgetBehavior.{seq_text}.simulationBehavior is only allowed for configured simulation widgets"
                    )
                simulation_behavior = behavior.get("simulationBehavior")
                if not isinstance(simulation_behavior, dict):
                    errors.append(f"widgetBehavior.{seq_text}.simulationBehavior should be an object")
                else:
                    if "sensitivity" in simulation_behavior:
                        sensitivity = simulation_behavior.get("sensitivity")
                        if not isinstance(sensitivity, (int, float)) or isinstance(sensitivity, bool):
                            errors.append(f"widgetBehavior.{seq_text}.simulationBehavior.sensitivity should be a number")
                    if "directionMode" in simulation_behavior:
                        errors.append(
                            f"widgetBehavior.{seq_text}.simulationBehavior.directionMode is obsolete"
                        )
            if "seriesFilters" in behavior:
                series_behavior = behavior.get("seriesFilters")
                if not isinstance(series_behavior, dict):
                    errors.append(f"widgetBehavior.{seq_text}.seriesFilters should be an object")
                else:
                    for key in ("allow", "suppress"):
                        if key in series_behavior:
                            values = series_behavior.get(key)
                            if not isinstance(values, list) or not all(isinstance(value, str) and value for value in values):
                                errors.append(f"widgetBehavior.{seq_text}.seriesFilters.{key} should be a string list")

        for seq, widget in sorted(widget_index.items()):
            if widget.get("renderRole") == "sourceOnly":
                continue
            behavior = widget_behavior.get(str(seq), widget_behavior.get(seq, {}))
            if not isinstance(behavior, dict) or not (behavior.get("chartKind") or behavior.get("tableKind")):
                errors.append(
                    f"widgetBehavior.{seq} should define chartKind or tableKind for rendered widget: {widget.get('title')}"
                )

        expected_methodology_keys = {
            83: "newMonthly",
            84: "newMonthly",
            85: "newMonthly",
            89: "newMonthly",
            90: "maturityMonthly",
            91: "maturityMonthly",
            96: "maturityMonthly",
            97: "maturityMonthly",
        }
        for seq, expected_key in expected_methodology_keys.items():
            behavior = widget_behavior.get(str(seq), widget_behavior.get(seq, {}))
            if not isinstance(behavior, dict) or behavior.get("methodologyKey") != expected_key:
                errors.append(f"widgetBehavior.{seq}.methodologyKey should be {expected_key}")

        for seq in (72, 73):
            behavior = widget_behavior.get(str(seq), widget_behavior.get(seq, {}))
            if not isinstance(behavior, dict) or behavior.get("frequencyToggle") is not True:
                errors.append(f"widgetBehavior.{seq}.frequencyToggle should be true for stock monthly/daily analysis")

        for seq in (89, 96):
            behavior = widget_behavior.get(str(seq), widget_behavior.get(seq, {}))
            if not isinstance(behavior, dict) or behavior.get("showDateFilter") is not True:
                errors.append(f"widgetBehavior.{seq}.showDateFilter should be true for local month-end range selection")
            elif "时间区间（起止）" not in behavior.get("inlineFilters", []):
                errors.append(f"widgetBehavior.{seq}.inlineFilters should include 时间区间（起止）")

        for seq in sorted(ALLOWED_SIMULATION_WIDGET_SEQS):
            context = widget_context.get(seq)
            if not context:
                errors.append(f"allowed simulation widget seq is missing from dashboard data: {seq}")
                continue
            behavior = widget_behavior.get(str(seq), widget_behavior.get(seq, {}))
            simulation_behavior = behavior.get("simulationBehavior")
            if not isinstance(simulation_behavior, dict):
                errors.append(
                    f"widgetBehavior.{seq}.simulationBehavior is required for configured simulation widget: {context['title']}"
                )
                continue
            sensitivity = simulation_behavior.get("sensitivity")
            if not isinstance(sensitivity, (int, float)) or isinstance(sensitivity, bool):
                errors.append(
                    f"widgetBehavior.{seq}.simulationBehavior.sensitivity is required for configured simulation widget: "
                    f"{context['title']}"
                )
    if not isinstance(widget_filter_presets, dict):
        errors.append("widgetFilterPresets should be an object")
        widget_filter_presets = {}
    else:
        for preset_name, filter_item in widget_filter_presets.items():
            if not isinstance(filter_item, dict):
                errors.append(f"widgetFilterPresets.{preset_name} should be an object")
                continue
            ensure_fields(filter_item, ["name"], f"widgetFilterPresets.{preset_name}", errors)
            normalized = normalize_filter_name(filter_item.get("name", ""))
            filter_type = filter_item.get("type")
            options = filter_item.get("options")
            options_ref = filter_item.get("optionsRef")
            if options is not None and not isinstance(options, list):
                errors.append(f"widgetFilterPresets.{preset_name}.options should be a list")
            if options_ref is not None and not isinstance(options_ref, str):
                errors.append(f"widgetFilterPresets.{preset_name}.optionsRef should be a string")
            if "defaultValuesRef" in filter_item and not isinstance(filter_item.get("defaultValuesRef"), str):
                errors.append(f"widgetFilterPresets.{preset_name}.defaultValuesRef should be a string")
            if filter_type != "dateRange" and normalized not in normalized_filter_option_names and not options and not options_ref:
                warnings.append(
                    f"widgetFilterPresets.{preset_name} has no inline options and no matching filters.options entry"
                )
            if isinstance(filter_item.get("defaultValues"), list) and isinstance(options, list):
                invalid_defaults = [value for value in filter_item["defaultValues"] if value not in options]
                if invalid_defaults:
                    errors.append(
                        f"widgetFilterPresets.{preset_name}.defaultValues contain unknown values: "
                        + ", ".join(map(str, invalid_defaults))
                    )

    if not isinstance(widget_filters, dict):
        errors.append("widgetFilters should be an object")
    else:
        for seq_text, filters in widget_filters.items():
            try:
                seq = int(seq_text)
            except ValueError:
                errors.append(f"widgetFilters key is not an integer: {seq_text}")
                continue
            if seq not in widget_index:
                errors.append(f"widgetFilters references unknown widget seq: {seq}")
            if not isinstance(filters, list) or not filters:
                errors.append(f"widgetFilters.{seq_text} should be a non-empty list")
                continue
            for filter_item in filters:
                if not isinstance(filter_item, dict):
                    errors.append(f"widgetFilters.{seq_text} contains a non-object item")
                    continue
                preset_refs = [
                    filter_item.get("presetRef"),
                    *([value for value in filter_item.get("presetRefs", []) if value] if isinstance(filter_item.get("presetRefs"), list) else []),
                ]
                unknown_presets = [preset for preset in preset_refs if preset not in widget_filter_presets]
                if unknown_presets:
                    errors.append(
                        f"widgetFilters.{seq_text} references unknown widgetFilterPresets: "
                        + ", ".join(map(str, unknown_presets))
                    )
                if "presetRefs" in filter_item and not isinstance(filter_item.get("presetRefs"), list):
                    errors.append(f"widgetFilters.{seq_text}.presetRefs should be a list")
                if "name" not in filter_item and not preset_refs:
                    errors.append(f"widgetFilters.{seq_text} item missing required fields: name")
                    continue
                if "name" not in filter_item:
                    continue
                ensure_fields(filter_item, ["name"], f"widgetFilters.{seq_text} item", errors)
                normalized = normalize_filter_name(filter_item.get("name", ""))
                filter_type = filter_item.get("type")
                options = filter_item.get("options")
                options_ref = filter_item.get("optionsRef")
                if options is not None and not isinstance(options, list):
                    errors.append(f"widgetFilters.{seq_text}.{filter_item.get('name')} options should be a list")
                if options_ref is not None and not isinstance(options_ref, str):
                    errors.append(f"widgetFilters.{seq_text}.{filter_item.get('name')} optionsRef should be a string")
                if "defaultValuesRef" in filter_item and not isinstance(filter_item.get("defaultValuesRef"), str):
                    errors.append(f"widgetFilters.{seq_text}.{filter_item.get('name')} defaultValuesRef should be a string")
                if filter_type != "dateRange" and normalized not in normalized_filter_option_names and not options and not options_ref:
                    warnings.append(
                        f"widgetFilters.{seq_text}.{filter_item.get('name')} has no inline options and no matching filters.options entry"
                    )
                if isinstance(filter_item.get("defaultValues"), list) and isinstance(options, list):
                    invalid_defaults = [value for value in filter_item["defaultValues"] if value not in options]
                    if invalid_defaults:
                        errors.append(
                            f"widgetFilters.{seq_text}.{filter_item.get('name')} defaultValues contain unknown values: "
                            + ", ".join(map(str, invalid_defaults))
                        )

    if not isinstance(series_rules, dict):
        errors.append("seriesRules should be an object")
    else:
        if "dimensionOrder" in series_rules:
            values = series_rules.get("dimensionOrder")
            if not isinstance(values, list) or not all(isinstance(value, str) and value for value in values):
                errors.append("seriesRules.dimensionOrder should be a string list")
        if "labelMap" in series_rules and not isinstance(series_rules.get("labelMap"), dict):
            errors.append("seriesRules.labelMap should be an object")
        if "defaultMaxSeries" in series_rules:
            value = series_rules.get("defaultMaxSeries")
            if not isinstance(value, int) or value <= 0:
                errors.append("seriesRules.defaultMaxSeries should be a positive integer")

    if not isinstance(visual_rules, dict):
        errors.append("visualRules should be an object")
    else:
        palette = visual_rules.get("palette", {})
        if palette and not isinstance(palette, dict):
            errors.append("visualRules.palette should be an object")
        else:
            for key in ("line", "bar"):
                if key in palette:
                    values = palette.get(key)
                    if not isinstance(values, list) or not all(isinstance(value, str) and value for value in values):
                        errors.append(f"visualRules.palette.{key} should be a string list")
            if "semantic" in palette and not isinstance(palette.get("semantic"), dict):
                errors.append("visualRules.palette.semantic should be an object")

    if not isinstance(simulation_rules, dict):
        errors.append("simulationRules should be an object")
    else:
        unknown_rule_keys = sorted(set(simulation_rules) - {"defaults", "liquidityGap"})
        if unknown_rule_keys:
            errors.append("simulationRules contains obsolete or unknown keys: " + ", ".join(unknown_rule_keys))
        defaults_rules = simulation_rules.get("defaults")
        liquidity_gap_rules = simulation_rules.get("liquidityGap")
        if not isinstance(defaults_rules, dict):
            errors.append("simulationRules.defaults should be an object")
        else:
            expected_default_keys = {"baseSensitivity", "minAdjustmentRatio", "maxAdjustmentRatio", "variationStep"}
            unknown_default_keys = sorted(set(defaults_rules) - expected_default_keys)
            if unknown_default_keys:
                errors.append(
                    "simulationRules.defaults contains obsolete or unknown keys: "
                    + ", ".join(unknown_default_keys)
                )
            for key in sorted(expected_default_keys):
                value = defaults_rules.get(key)
                if not isinstance(value, (int, float)) or isinstance(value, bool):
                    errors.append(f"simulationRules.defaults.{key} should be a number")
        if not isinstance(liquidity_gap_rules, dict):
            errors.append("simulationRules.liquidityGap should be an object")
        else:
            expected_liquidity_keys = {"assetDirection", "wholesaleLiabilityDirection", "liabilityDirection"}
            unknown_liquidity_keys = sorted(set(liquidity_gap_rules) - expected_liquidity_keys)
            if unknown_liquidity_keys:
                errors.append(
                    "simulationRules.liquidityGap contains obsolete or unknown keys: "
                    + ", ".join(unknown_liquidity_keys)
                )
            for key in sorted(expected_liquidity_keys):
                value = liquidity_gap_rules.get(key)
                if not isinstance(value, (int, float)) or isinstance(value, bool):
                    errors.append(f"simulationRules.liquidityGap.{key} should be a number")
        if "modes" in simulation_rules:
            errors.append("simulationRules.modes is obsolete")
        if "wholesaleLiabilityTypes" in simulation_rules:
            errors.append("simulationRules.wholesaleLiabilityTypes is deprecated; move it to dashboard-domain.js")

    if not isinstance(table_templates, dict):
        errors.append("tableTemplates should be an object")
    else:
        for template_name, template in table_templates.items():
            if not isinstance(template, dict):
                errors.append(f"tableTemplates.{template_name} should be an object")
                continue
            classes = template.get("classes")
            if not isinstance(classes, list) or not all(isinstance(value, str) and value for value in classes):
                errors.append(f"tableTemplates.{template_name}.classes should be a string list")

    if not isinstance(layout_rules, dict):
        errors.append("layoutRules should be an object")
    else:
        widget_rules = layout_rules.get("widgets", {})
        for obsolete_key in ("blocks", "areas"):
            if obsolete_key in layout_rules:
                errors.append(f"layoutRules.{obsolete_key} is obsolete in the flat dashboard architecture")
        if widget_rules and not isinstance(widget_rules, dict):
            errors.append("layoutRules.widgets should be an object")
        else:
            for seq_text, rule in widget_rules.items():
                try:
                    seq = int(seq_text)
                except ValueError:
                    errors.append(f"layoutRules.widgets key is not an integer: {seq_text}")
                    continue
                if seq not in widget_index:
                    warnings.append(f"layoutRules.widgets references unknown widget seq: {seq}")
                if not isinstance(rule, dict):
                    errors.append(f"layoutRules.widgets.{seq_text} should be an object")
                    continue
                if "fullWidth" in rule and not isinstance(rule.get("fullWidth"), bool):
                    errors.append(f"layoutRules.widgets.{seq_text}.fullWidth should be a boolean")

    if not isinstance(management_limits, list):
        errors.append("managementLimits should be a list")
    else:
        expected_limit_entry_counts = {
            "最大经济价值变动比例": 1,
            "30天累计流动性缺口规模": 12,
            "流动性比例": 2,
            "债券投资组合久期": 12,
            "经期限调整的重定价缺口率": 23,
            "债券投资规模": 6,
            "非金融企业债券投资规模": 6,
        }
        actual_limit_entry_counts: dict[str, int] = {}
        seen_limit_keys: set[tuple[str, str, str, str, str]] = set()
        limit_filter_values: dict[str, set[str]] = {
            name: set(values) for name, values in filter_options.items() if isinstance(values, list)
        }
        for preset in widget_filter_presets.values():
            if not isinstance(preset, dict):
                continue
            preset_name = preset.get("name")
            preset_options = preset.get("options")
            if isinstance(preset_name, str) and isinstance(preset_options, list):
                limit_filter_values.setdefault(preset_name, set()).update(
                    value for value in preset_options if isinstance(value, str)
                )
        for index, item in enumerate(management_limits, start=1):
            if not isinstance(item, dict):
                errors.append(f"managementLimits[{index}] should be an object")
                continue
            if "matchTitles" in item:
                errors.append(f"managementLimits[{index}].matchTitles is deprecated; use widgetSeqs")
            if "values" in item:
                errors.append(f"managementLimits[{index}].values is deprecated; use entries")
            widget_seqs = item.get("widgetSeqs")
            if not isinstance(widget_seqs, list) or not widget_seqs or not all(isinstance(seq, int) for seq in widget_seqs):
                errors.append(f"managementLimits[{index}].widgetSeqs should be a non-empty integer list")
            else:
                invalid = [seq for seq in widget_seqs if seq not in widget_index]
                if invalid:
                    errors.append(
                        f"managementLimits[{index}].widgetSeqs references unknown widget seqs: "
                        + ", ".join(map(str, invalid))
                    )
            indicator = item.get("indicator")
            if not isinstance(indicator, str) or not indicator.strip():
                errors.append(f"managementLimits[{index}].indicator should be a non-empty string")
                indicator = f"__invalid_{index}"
            entries = item.get("entries")
            if not isinstance(entries, list) or not entries:
                errors.append(f"managementLimits[{index}].entries should be a non-empty list")
                continue
            actual_limit_entry_counts[indicator] = len(entries)
            for entry_index, entry in enumerate(entries, start=1):
                prefix = f"managementLimits[{index}].entries[{entry_index}]"
                if not isinstance(entry, dict):
                    errors.append(f"{prefix} should be an object")
                    continue
                organization = entry.get("organization")
                currency = entry.get("currency")
                operator = entry.get("operator")
                value = entry.get("value")
                unit = entry.get("unit")
                if organization not in filter_options.get("机构", []):
                    errors.append(f"{prefix}.organization is not a configured institution: {organization}")
                if currency not in filter_options.get("币种", []):
                    errors.append(f"{prefix}.currency is not a configured currency: {currency}")
                if operator not in {"<=", ">="}:
                    errors.append(f"{prefix}.operator should be <= or >=")
                if isinstance(value, bool) or not isinstance(value, (int, float)):
                    errors.append(f"{prefix}.value should be numeric")
                if not isinstance(unit, str) or not unit:
                    errors.append(f"{prefix}.unit should be a non-empty string")
                entry_filters = entry.get("filters", {})
                if not isinstance(entry_filters, dict):
                    errors.append(f"{prefix}.filters should be an object")
                    entry_filters = {}
                for filter_name, expected_value in entry_filters.items():
                    expected_values = expected_value if isinstance(expected_value, list) else [expected_value]
                    allowed_values = limit_filter_values.get(filter_name, set())
                    invalid_values = [filter_value for filter_value in expected_values if filter_value not in allowed_values]
                    if invalid_values:
                        errors.append(
                            f"{prefix}.filters.{filter_name} contains unknown values: "
                            + ", ".join(map(str, invalid_values))
                        )
                uniqueness_key = (
                    indicator,
                    str(item.get("metricKey", "")),
                    str(organization),
                    str(currency),
                    json.dumps(entry_filters, ensure_ascii=False, sort_keys=True),
                )
                if uniqueness_key in seen_limit_keys:
                    errors.append(f"{prefix} duplicates another management limit entry")
                seen_limit_keys.add(uniqueness_key)

        if actual_limit_entry_counts != expected_limit_entry_counts:
            errors.append(
                "managementLimits indicator/entry counts should match the approved limit table: "
                f"expected {expected_limit_entry_counts}, got {actual_limit_entry_counts}"
            )

    return errors, warnings


def collect_renderer_registry_keys(renderers_text: str, section: str) -> set[str]:
    match = re.search(rf"\n\s*{section}:\s*\{{(?P<body>.*?)\n\s*\}}", renderers_text, flags=re.S)
    if not match:
        return set()
    return set(re.findall(r"^\s*([A-Za-z0-9_]+):", match.group("body"), flags=re.M))


def validate_renderer_registry_alignment(config: dict[str, Any], renderers_text: str) -> list[str]:
    errors: list[str] = []
    widget_behavior = config.get("widgetBehavior", {})
    used_chart_kinds = {
        behavior.get("chartKind")
        for behavior in widget_behavior.values()
        if isinstance(behavior, dict) and behavior.get("chartKind")
    }
    used_table_kinds = {
        behavior.get("tableKind")
        for behavior in widget_behavior.values()
        if isinstance(behavior, dict) and behavior.get("tableKind")
    }
    chart_registry = collect_renderer_registry_keys(renderers_text, "chart")
    data_registry = collect_renderer_registry_keys(renderers_text, "data")
    table_registry = collect_renderer_registry_keys(renderers_text, "table")

    for kind in sorted(used_chart_kinds - chart_registry):
        errors.append(f"widgetBehavior references chartKind without chart renderer: {kind}")
    for kind in sorted(used_chart_kinds - data_registry):
        errors.append(f"widgetBehavior references chartKind without data renderer: {kind}")
    for kind in sorted(used_table_kinds - table_registry):
        errors.append(f"widgetBehavior references tableKind without table renderer: {kind}")

    for kind in sorted(chart_registry - used_chart_kinds):
        errors.append(f"dashboard-renderers.js registers unused chart renderer kind: {kind}")
    for kind in sorted(data_registry - used_chart_kinds):
        errors.append(f"dashboard-renderers.js registers unused data renderer kind: {kind}")
    for kind in sorted(table_registry - used_table_kinds):
        errors.append(f"dashboard-renderers.js registers unused table renderer kind: {kind}")
    return errors


def validate_renderer_architecture(config: dict[str, Any]) -> list[str]:
    utils_text = UTILS_FILE.read_text(encoding="utf-8")
    text = APP_FILE.read_text(encoding="utf-8")
    simulation_text = SIMULATION_FILE.read_text(encoding="utf-8")
    processes_text = PROCESSES_FILE.read_text(encoding="utf-8")
    business_renderers_text = BUSINESS_RENDERERS_FILE.read_text(encoding="utf-8")
    interest_renderers_text = INTEREST_RENDERERS_FILE.read_text(encoding="utf-8")
    liquidity_renderers_text = LIQUIDITY_RENDERERS_FILE.read_text(encoding="utf-8")
    renderers_text = RENDERERS_FILE.read_text(encoding="utf-8")
    events_text = EVENTS_FILE.read_text(encoding="utf-8")
    styles_text = STYLES_FILE.read_text(encoding="utf-8")
    index_text = INDEX_FILE.read_text(encoding="utf-8")
    errors: list[str] = []
    for snippet in FORBIDDEN_RENDERER_SNIPPETS:
        if snippet in text:
            errors.append(f"app.js contains forbidden renderer hardcode: {snippet}")
    obsolete_layout_snippets = {
        "app.js": ("AREA_TAB_CONFIG", "areaSubpages", "renderBlockSection", "renderAreaCard", "data-area-subtab"),
        "dashboard-events.js": ("data-area-subtab", "areaSubpages"),
        "styles.css": (".block-section", ".area-card", ".area-subtab", ".area-view-group"),
    }
    source_texts = {
        "app.js": text,
        "dashboard-events.js": events_text,
        "styles.css": styles_text,
    }
    for file_name, snippets in obsolete_layout_snippets.items():
        for snippet in snippets:
            if snippet in source_texts[file_name]:
                errors.append(f"{file_name} contains obsolete nested-layout residue: {snippet}")
    domain_pos = index_text.find("dashboard-domain.js")
    utils_pos = index_text.find("dashboard-utils.js")
    app_pos = index_text.find("app.js")
    simulation_pos = index_text.find("dashboard-simulation.js")
    processes_pos = index_text.find("dashboard-processes.js")
    business_renderers_pos = index_text.find("dashboard-business-renderers.js")
    interest_renderers_pos = index_text.find("dashboard-interest-renderers.js")
    liquidity_renderers_pos = index_text.find("dashboard-liquidity-renderers.js")
    renderers_pos = index_text.find("dashboard-renderers.js")
    events_pos = index_text.find("dashboard-events.js")
    if domain_pos < 0:
        errors.append("index.html should load dashboard-domain.js before app.js")
    elif app_pos < 0 or domain_pos > app_pos:
        errors.append("dashboard-domain.js should be loaded before app.js")
    if utils_pos < 0:
        errors.append("index.html should load dashboard-utils.js before app.js")
    elif app_pos < 0 or utils_pos > app_pos:
        errors.append("dashboard-utils.js should be loaded before app.js")
    elif domain_pos >= 0 and utils_pos < domain_pos:
        errors.append("dashboard-utils.js should be loaded after dashboard-domain.js")
    if simulation_pos < 0:
        errors.append("index.html should load dashboard-simulation.js after app.js")
    elif app_pos < 0 or simulation_pos < app_pos:
        errors.append("dashboard-simulation.js should be loaded after app.js")
    if processes_pos < 0:
        errors.append("index.html should load dashboard-processes.js after app.js")
    elif app_pos < 0 or processes_pos < app_pos:
        errors.append("dashboard-processes.js should be loaded after app.js")
    elif simulation_pos >= 0 and processes_pos < simulation_pos:
        errors.append("dashboard-processes.js should be loaded after dashboard-simulation.js")
    if renderers_pos < 0:
        errors.append("index.html should load dashboard-renderers.js after app.js")
    elif app_pos < 0 or renderers_pos < app_pos:
        errors.append("dashboard-renderers.js should be loaded after app.js")
    elif processes_pos >= 0 and renderers_pos < processes_pos:
        errors.append("dashboard-renderers.js should be loaded after dashboard-processes.js")
    if business_renderers_pos < 0:
        errors.append("index.html should load dashboard-business-renderers.js before dashboard-renderers.js")
    elif app_pos < 0 or business_renderers_pos < app_pos:
        errors.append("dashboard-business-renderers.js should be loaded after app.js")
    elif processes_pos >= 0 and business_renderers_pos < processes_pos:
        errors.append("dashboard-business-renderers.js should be loaded after dashboard-processes.js")
    elif renderers_pos >= 0 and business_renderers_pos > renderers_pos:
        errors.append("dashboard-business-renderers.js should be loaded before dashboard-renderers.js")
    if liquidity_renderers_pos < 0:
        errors.append("index.html should load dashboard-liquidity-renderers.js before dashboard-renderers.js")
    elif app_pos < 0 or liquidity_renderers_pos < app_pos:
        errors.append("dashboard-liquidity-renderers.js should be loaded after app.js")
    elif interest_renderers_pos >= 0 and liquidity_renderers_pos < interest_renderers_pos:
        errors.append("dashboard-liquidity-renderers.js should be loaded after dashboard-interest-renderers.js")
    elif renderers_pos >= 0 and liquidity_renderers_pos > renderers_pos:
        errors.append("dashboard-liquidity-renderers.js should be loaded before dashboard-renderers.js")
    if interest_renderers_pos < 0:
        errors.append("index.html should load dashboard-interest-renderers.js before dashboard-renderers.js")
    elif app_pos < 0 or interest_renderers_pos < app_pos:
        errors.append("dashboard-interest-renderers.js should be loaded after app.js")
    elif business_renderers_pos >= 0 and interest_renderers_pos < business_renderers_pos:
        errors.append("dashboard-interest-renderers.js should be loaded after dashboard-business-renderers.js")
    elif liquidity_renderers_pos >= 0 and interest_renderers_pos > liquidity_renderers_pos:
        errors.append("dashboard-interest-renderers.js should be loaded before dashboard-liquidity-renderers.js")
    if events_pos < 0:
        errors.append("index.html should load dashboard-events.js after app.js")
    elif app_pos < 0 or events_pos < app_pos:
        errors.append("dashboard-events.js should be loaded after app.js")
    elif renderers_pos >= 0 and events_pos < renderers_pos:
        errors.append("dashboard-events.js should be loaded after dashboard-renderers.js")
    if "addEventListener" in text:
        errors.append("app.js should not bind DOM events directly; use dashboard-events.js")
    if "RendererRegistry = {" in text or "RendererRegistry={" in text:
        errors.append("app.js should not declare renderer registries directly; use dashboard-renderers.js")
    for utility_function in (
        "function addDays",
        "function addMonthsDateValue",
        "function formatDateValue",
        "function parseDateValue",
        "function uniqueList",
        "function cartesianProduct",
        "function normalizeFilterName",
        "function formatFilterDisplayLabel",
        "function buildFilterKey",
        "function parseOpenFilterKey",
        "function getFilterPopoverPosition",
        "function formatDisplayTitle",
        "function hexToRgba",
        "function buildAxisTicks",
        "function formatAxisTickValue",
        "function createFrame",
        "function createWideFrame",
        "function getFrameXPosition",
        "function getFrameMinStep",
        "function callMockAdapter",
        "function buildMetricValues",
        "function buildBarValues",
        "function formatMetricValue",
        "function buildTableRow",
        "function createSignature",
        "function clampNumber",
    ):
        if utility_function in text:
            errors.append(f"app.js should not define shared utility functions: {utility_function}")
        if utility_function not in utils_text:
            errors.append(f"dashboard-utils.js should define {utility_function}")
    for process_function in (
        "function renderEveProcessModal",
        "function renderLiquidityProcessModal",
        "function renderRepricingGapProcessModal",
    ):
        if process_function in text:
            errors.append(f"app.js should not define diagnostic process modal implementations: {process_function}")
        if process_function not in processes_text:
            errors.append(f"dashboard-processes.js should define {process_function}")
    for simulation_function in (
        "function renderSimulationModal",
        "function openSimulationModal",
        "function renderSimulationOverlay",
        "function buildLiquidityGapSimulationResult",
        "function renderLiquidityGapSimulationModal",
    ):
        if simulation_function in text:
            errors.append(f"app.js should not define simulation implementations: {simulation_function}")
        if simulation_function not in simulation_text:
            errors.append(f"dashboard-simulation.js should define {simulation_function}")
    for required in ("chart", "data", "table"):
        if f"{required}:" not in renderers_text:
            errors.append(f"dashboard-renderers.js should define a {required} renderer registry")
    errors.extend(validate_renderer_registry_alignment(config, renderers_text))
    for business_renderer_function in (
        "function renderBalanceScaleGrowthChart",
        "function renderBusinessScaleGrowthChart",
        "function renderBusinessStructureTable",
        "function renderBusinessDetailTable",
        "function renderBusinessChangeMethodologyButton",
        "function renderBusinessChangeMethodologyModal",
        "function buildMonthlyBusinessChangeFacts",
        "function buildBusinessChangeFactsForDateRange",
    ):
        if business_renderer_function in text:
            errors.append(f"app.js should not define business-change renderers: {business_renderer_function}")
        if business_renderer_function not in business_renderers_text:
            errors.append(f"dashboard-business-renderers.js should define {business_renderer_function}")
    for liquidity_renderer_function in (
        "function renderLiquidityGapTenorChart",
        "function renderFutureFundingFlowChart",
        "function renderBondInvestmentScaleLimitChart",
        "function getFutureFundingFlowBusinessSelection",
        "function getFutureFundingFlowDrilldown",
        "function getFutureFundingFlowRowsForDrilldown",
    ):
        if liquidity_renderer_function in text:
            errors.append(f"app.js should not define liquidity/funding renderers: {liquidity_renderer_function}")
        if liquidity_renderer_function not in liquidity_renderers_text:
            errors.append(f"dashboard-liquidity-renderers.js should define {liquidity_renderer_function}")
    for interest_renderer_function in (
        "function renderRepricingDurationGapChart",
        "function renderNiiVolatilityComboChart",
        "function renderMaturityDistributionChart",
    ):
        if interest_renderer_function in text:
            errors.append(f"app.js should not define interest-risk renderers: {interest_renderer_function}")
        if interest_renderer_function not in interest_renderers_text:
            errors.append(f"dashboard-interest-renderers.js should define {interest_renderer_function}")
    if "render();" not in events_text:
        errors.append("dashboard-events.js should call render() after binding event handlers")
    removed_feature_text = "\n".join(
        [
            text,
            simulation_text,
            processes_text,
            business_renderers_text,
            interest_renderers_text,
            liquidity_renderers_text,
            renderers_text,
            events_text,
            styles_text,
            CONFIG_FILE.read_text(encoding="utf-8"),
            DATA_FILE.read_text(encoding="utf-8"),
            DOMAIN_FILE.read_text(encoding="utf-8"),
        ]
    )
    for snippet in FORBIDDEN_REMOVED_FEATURE_SNIPPETS:
        if snippet in removed_feature_text:
            errors.append(f"removed feature residue should not be present: {snippet}")
    return errors


def validate_domain_config(domain: dict[str, Any], config: dict[str, Any]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    business_options = domain.get("businessDurationOptions")
    expected_business_options = [
        "自营贷款",
        "投资类资产",
        "同业资产",
        "自营非标投资",
        "内部交易资产",
        "活期存款",
        "定期存款",
        "同业负债",
        "存放央行",
        "发行债券",
        "向央行借款",
        "租赁负债",
        "内部交易负债",
        "表外衍生品应付",
        "表外衍生品应收",
    ]
    if not isinstance(business_options, list) or not business_options:
        errors.append("dashboardDomainConfig.businessDurationOptions should be a non-empty list")
        business_options = []
    elif len(set(business_options)) != len(business_options):
        errors.append("dashboardDomainConfig.businessDurationOptions contains duplicate values")
    if business_options != expected_business_options:
        errors.append("dashboardDomainConfig.businessDurationOptions should match the approved interest-risk category order")

    business_default_values = domain.get("businessTypeDefaultValues")
    if not isinstance(business_default_values, list) or not business_default_values:
        errors.append("dashboardDomainConfig.businessTypeDefaultValues should be a non-empty list")
        business_default_values = []
    else:
        invalid_defaults = [item for item in business_default_values if item not in business_options]
        if invalid_defaults:
            errors.append("dashboardDomainConfig.businessTypeDefaultValues has unknown values: " + ", ".join(invalid_defaults))

    liquidity_business_options = domain.get("liquidityBusinessTypes")
    expected_liquidity_business_options = [
        "现金",
        "存放央行款项",
        "存放同业",
        "拆放同业",
        "买入返售",
        "各项贷款",
        "债券",
        "股票",
        "其他投资",
        "持有同业存单",
        "其他资产",
        "表外收入",
        "向央行借款",
        "定期存放",
        "活期存放",
        "同业拆入",
        "卖出回购",
        "定期存款",
        "活期存款",
        "发行债券",
        "发行同业存单",
        "其他负债",
        "表外支出",
    ]
    if not isinstance(liquidity_business_options, list) or not liquidity_business_options:
        errors.append("dashboardDomainConfig.liquidityBusinessTypes should be a non-empty list")
        liquidity_business_options = []
    elif len(set(liquidity_business_options)) != len(liquidity_business_options):
        errors.append("dashboardDomainConfig.liquidityBusinessTypes contains duplicate values")
    if liquidity_business_options != expected_liquidity_business_options:
        errors.append("dashboardDomainConfig.liquidityBusinessTypes should match the approved liquidity category order")

    expected_liquidity_cash_flow_buckets = ["次日", "2日至7日", "8日至30日", "31日至90日", "91日至1年"]
    if domain.get("liquidityCashFlowSimulationBuckets") != expected_liquidity_cash_flow_buckets:
        errors.append("dashboardDomainConfig.liquidityCashFlowSimulationBuckets should match the approved five buckets")

    liquidity_default_values = domain.get("liquidityBusinessTypeDefaultValues")
    if not isinstance(liquidity_default_values, list) or not liquidity_default_values:
        errors.append("dashboardDomainConfig.liquidityBusinessTypeDefaultValues should be a non-empty list")
    elif any(item not in liquidity_business_options for item in liquidity_default_values):
        errors.append("liquidityBusinessTypeDefaultValues should belong to liquidityBusinessTypes")

    preset_expectations = {
        "businessTypeLegend": ("businessDurationOptions", {"businessDurationOptions", "businessTypeDefaultValues"}),
        "futureFundingBusinessTypeLegend": ("liquidityBusinessTypes", {"liquidityBusinessTypes"}),
    }
    for preset_name, (expected_options_ref, allowed_default_refs) in preset_expectations.items():
        preset = config.get("widgetFilterPresets", {}).get(preset_name, {})
        preset_options_ref = preset.get("optionsRef")
        preset_options = preset.get("options")
        if preset_options_ref:
            if preset_options_ref != expected_options_ref:
                errors.append(f"widgetFilterPresets.{preset_name}.optionsRef should be {expected_options_ref}")
            if "options" in preset:
                errors.append(f"widgetFilterPresets.{preset_name} should not duplicate options when optionsRef is used")
        elif isinstance(preset_options, list):
            expected_options = business_options if expected_options_ref == "businessDurationOptions" else liquidity_business_options
            if preset_options != expected_options:
                errors.append(f"widgetFilterPresets.{preset_name}.options should match dashboardDomainConfig.{expected_options_ref}")
        else:
            errors.append(f"widgetFilterPresets.{preset_name} should define optionsRef or options")

        default_ref = preset.get("defaultValuesRef")
        if default_ref:
            if default_ref not in allowed_default_refs:
                errors.append(f"widgetFilterPresets.{preset_name}.defaultValuesRef is unknown: {default_ref}")
            if "defaultValues" in preset:
                errors.append(f"widgetFilterPresets.{preset_name} should not duplicate defaultValues when defaultValuesRef is used")

    business_side_map = domain.get("businessSideMap")
    if not isinstance(business_side_map, dict):
        errors.append("dashboardDomainConfig.businessSideMap should be an object")
        business_side_map = {}
    else:
        missing = [item for item in business_options if item not in business_side_map]
        invalid_side = [
            f"{item}:{side}"
            for item, side in business_side_map.items()
            if item in business_options and side not in {"asset", "liability"}
        ]
        if missing:
            errors.append("businessSideMap is missing business types: " + ", ".join(map(str, missing)))
        if invalid_side:
            errors.append("businessSideMap has invalid side values: " + ", ".join(invalid_side))

    repricing_gap_groups = domain.get("repricingGapBusinessGroups")
    expected_repricing_gap_labels = {
        "assets": ["自营贷款", "投资类资产", "同业资产", "自营非标投资", "存放央行", "内部交易资产"],
        "liabilities": ["定期存款", "同业负债", "发行债券", "向央行借款", "租赁负债", "内部交易负债"],
    }
    if not isinstance(repricing_gap_groups, dict):
        errors.append("dashboardDomainConfig.repricingGapBusinessGroups should be an object")
    else:
        repricing_gap_keys: list[str] = []
        for group_name, expected_labels in expected_repricing_gap_labels.items():
            items = repricing_gap_groups.get(group_name)
            if not isinstance(items, list) or not items:
                errors.append(f"repricingGapBusinessGroups.{group_name} should be a non-empty list")
                continue
            labels = [item.get("label") for item in items if isinstance(item, dict)]
            if labels != expected_labels:
                errors.append(
                    f"repricingGapBusinessGroups.{group_name} should match the approved repricing-gap category order"
                )
            expected_side = "asset" if group_name == "assets" else "liability"
            for index, item in enumerate(items):
                if not isinstance(item, dict):
                    errors.append(f"repricingGapBusinessGroups.{group_name}[{index}] should be an object")
                    continue
                ensure_fields(item, ["key", "label"], f"repricingGapBusinessGroups.{group_name}[{index}]", errors)
                key = item.get("key")
                label = item.get("label")
                if isinstance(key, str):
                    repricing_gap_keys.append(key)
                if label not in business_options or business_side_map.get(label) != expected_side:
                    errors.append(
                        f"repricingGapBusinessGroups.{group_name}[{index}] should reference a known {expected_side} type"
                    )
                if bool(item.get("internalTransaction")) != str(label).startswith("内部交易"):
                    errors.append(
                        f"repricingGapBusinessGroups.{group_name}[{index}] internalTransaction flag is inconsistent"
                    )
        if len(set(repricing_gap_keys)) != len(repricing_gap_keys):
            errors.append("repricingGapBusinessGroups contains duplicate keys")

    wholesale_liability_types = domain.get("wholesaleLiabilityTypes")
    if not isinstance(wholesale_liability_types, list) or not wholesale_liability_types:
        errors.append("dashboardDomainConfig.wholesaleLiabilityTypes should be a non-empty list")
    else:
        invalid_wholesale = [
            item
            for item in wholesale_liability_types
            if item not in business_options or business_side_map.get(item) != "liability"
        ]
        if invalid_wholesale:
            errors.append("wholesaleLiabilityTypes must be known liability business types: " + ", ".join(invalid_wholesale))

    groups = domain.get("businessStructureGroups")
    if not isinstance(groups, list) or not groups:
        errors.append("dashboardDomainConfig.businessStructureGroups should be a non-empty list")
    else:
        grouped_items: list[str] = []
        for index, group in enumerate(groups):
            if not isinstance(group, dict):
                errors.append(f"businessStructureGroups[{index}] should be an object")
                continue
            if not isinstance(group.get("category"), str) or not group.get("category"):
                errors.append(f"businessStructureGroups[{index}].category should be a non-empty string")
            items = group.get("items")
            if not isinstance(items, list) or not items:
                errors.append(f"businessStructureGroups[{index}].items should be a non-empty list")
                continue
            grouped_items.extend(items)
        missing = [item for item in business_options if item not in grouped_items]
        extra = [item for item in grouped_items if item not in business_options]
        duplicates = sorted({item for item in grouped_items if grouped_items.count(item) > 1})
        if missing:
            errors.append("businessStructureGroups does not cover business types: " + ", ".join(map(str, missing)))
        if extra:
            errors.append("businessStructureGroups contains unknown business types: " + ", ".join(map(str, extra)))
        if duplicates:
            errors.append("businessStructureGroups contains duplicate business types: " + ", ".join(map(str, duplicates)))

    business_perspectives = domain.get("businessAnalysisPerspectives")
    required_perspectives = {"interestBalanceStructure", "liquidityBalanceStructure"}
    if not isinstance(business_perspectives, dict):
        errors.append("dashboardDomainConfig.businessAnalysisPerspectives should be an object")
    else:
        missing_perspectives = sorted(required_perspectives - set(business_perspectives))
        if missing_perspectives:
            errors.append("businessAnalysisPerspectives is missing: " + ", ".join(missing_perspectives))
        for perspective_key in sorted(required_perspectives & set(business_perspectives)):
            perspective = business_perspectives[perspective_key]
            if not isinstance(perspective, dict):
                errors.append(f"businessAnalysisPerspectives.{perspective_key} should be an object")
                continue

            business_types = perspective.get("businessTypes")
            if business_types is None and perspective.get("businessTypesRef"):
                business_types = domain.get(perspective.get("businessTypesRef"))
            default_types = perspective.get("defaultBusinessTypes")
            if default_types is None and perspective.get("defaultBusinessTypesRef"):
                default_types = domain.get(perspective.get("defaultBusinessTypesRef"))
            perspective_groups = perspective.get("groups")
            if perspective_groups is None and perspective.get("groupsRef"):
                perspective_groups = domain.get(perspective.get("groupsRef"))
            side_map = perspective.get("sideMap")
            if side_map is None and perspective.get("sideMapRef"):
                side_map = domain.get(perspective.get("sideMapRef"))

            if not isinstance(perspective.get("label"), str) or not perspective.get("label"):
                errors.append(f"businessAnalysisPerspectives.{perspective_key}.label should be a non-empty string")
            if not isinstance(business_types, list) or not business_types:
                errors.append(f"businessAnalysisPerspectives.{perspective_key} business types should be a non-empty list")
                continue
            if not isinstance(default_types, list) or not default_types or any(item not in business_types for item in default_types):
                errors.append(f"businessAnalysisPerspectives.{perspective_key} default business types should belong to its business types")
            if not isinstance(perspective_groups, list) or not perspective_groups:
                errors.append(f"businessAnalysisPerspectives.{perspective_key} groups should be a non-empty list")
            else:
                perspective_grouped_items = [
                    item
                    for group in perspective_groups
                    if isinstance(group, dict) and isinstance(group.get("items"), list)
                    for item in group["items"]
                ]
                if sorted(perspective_grouped_items) != sorted(business_types):
                    errors.append(f"businessAnalysisPerspectives.{perspective_key} groups should cover its business types exactly once")
            if not isinstance(side_map, dict) or any(item not in side_map for item in business_types):
                errors.append(f"businessAnalysisPerspectives.{perspective_key} side map should cover every business type")
            if perspective_key == "liquidityBalanceStructure":
                if business_types != liquidity_business_options:
                    errors.append("businessAnalysisPerspectives.liquidityBalanceStructure business types should match liquidityBusinessTypes")
                if perspective.get("totalCategories") != ["资产", "负债"]:
                    errors.append("liquidityBalanceStructure totalCategories should be 资产 and 负债")
                if perspective.get("totalRowLabels") != {"资产": "资产合计", "负债": "负债合计"}:
                    errors.append("liquidityBalanceStructure total rows should be 资产合计 and 负债合计")
                direction_map = perspective.get("cashFlowDirectionMap")
                if not isinstance(direction_map, dict) or any(item not in direction_map for item in business_types):
                    errors.append("businessAnalysisPerspectives.liquidityBalanceStructure cashFlowDirectionMap should cover every business type")
                elif any(direction_map[item] not in {"inflow", "outflow"} for item in business_types):
                    errors.append("liquidity cashFlowDirectionMap values should be inflow or outflow")
            metric_labels = perspective.get("balanceMetricLabels")
            if not isinstance(metric_labels, list) or len(metric_labels) != 4:
                errors.append(f"businessAnalysisPerspectives.{perspective_key}.balanceMetricLabels should contain four labels")
            metric_columns = perspective.get("structureMetricColumns")
            metric_columns_by_scope = perspective.get("structureMetricColumnsByScope")
            if metric_columns_by_scope is not None:
                if not isinstance(metric_columns_by_scope, dict) or any(
                    not isinstance(metric_columns_by_scope.get(scope), list)
                    or not metric_columns_by_scope[scope]
                    or any(
                        not isinstance(column, dict) or not column.get("key") or not column.get("label")
                        for column in metric_columns_by_scope[scope]
                    )
                    for scope in ("stock", "new", "maturity")
                ):
                    errors.append(
                        f"businessAnalysisPerspectives.{perspective_key}.structureMetricColumnsByScope "
                        "should define keyed columns for stock, new and maturity"
                    )
            elif not isinstance(metric_columns, list) or not metric_columns or any(
                not isinstance(column, dict) or not column.get("key") or not (column.get("label") or column.get("stockLabel"))
                for column in metric_columns
            ):
                errors.append(f"businessAnalysisPerspectives.{perspective_key}.structureMetricColumns should define keyed columns")
            detail_columns = perspective.get("detailColumns")
            detail_columns_by_scope = perspective.get("detailColumnsByScope")
            if detail_columns_by_scope is not None:
                if not isinstance(detail_columns_by_scope, dict) or any(
                    not isinstance(detail_columns_by_scope.get(scope), list)
                    or not detail_columns_by_scope[scope]
                    or any(
                        not isinstance(column, dict) or not column.get("key") or not column.get("label")
                        for column in detail_columns_by_scope[scope]
                    )
                    for scope in ("stock", "new", "maturity")
                ):
                    errors.append(
                        f"businessAnalysisPerspectives.{perspective_key}.detailColumnsByScope "
                        "should define keyed columns for stock, new and maturity"
                    )
            elif not isinstance(detail_columns, list) or not detail_columns or any(
                not isinstance(column, dict) or not column.get("key") or not column.get("label")
                for column in detail_columns
            ):
                errors.append(f"businessAnalysisPerspectives.{perspective_key}.detailColumns should define keyed columns")

    business_methodology = domain.get("businessChangeMethodology")
    if not isinstance(business_methodology, dict):
        errors.append("dashboardDomainConfig.businessChangeMethodology should be an object")
    else:
        for methodology_key in ("newMonthly", "maturityMonthly"):
            methodology_item = business_methodology.get(methodology_key)
            if not isinstance(methodology_item, dict):
                errors.append(f"businessChangeMethodology.{methodology_key} should be an object")
                continue
            for key in ("title", "logic"):
                if not isinstance(methodology_item.get(key), str) or not methodology_item.get(key):
                    errors.append(f"businessChangeMethodology.{methodology_key}.{key} should be a non-empty string")

    for key in ("liquidityGapTenorOptions", "simulationFundingRoleOptions"):
        values = domain.get(key)
        if not isinstance(values, list) or not values:
            errors.append(f"dashboardDomainConfig.{key} should be a non-empty list")
    if domain.get("liquidityGapTenorOptions") != ["1D", "7D", "30D", "3M", "1Y"]:
        errors.append("liquidityGapTenorOptions should be 1D, 7D, 30D, 3M, 1Y")
    configured_organizations = config.get("filters", {}).get("options", {}).get("机构", [])
    expected_foreign_branches = [
        organization
        for organization in configured_organizations
        if isinstance(organization, str) and organization.endswith("分行")
    ]
    foreign_branches = domain.get("foreignBranchOrganizations")
    if (
        not isinstance(foreign_branches, list)
        or len(foreign_branches) != len(set(foreign_branches))
        or set(foreign_branches) != set(expected_foreign_branches)
    ):
        errors.append(
            "foreignBranchOrganizations should match the individual foreign branches in filters.options.机构"
        )
    if domain.get("simulationFundingRoleOptions") != ["资金来源", "资金运用"]:
        errors.append("simulationFundingRoleOptions should be 资金来源, 资金运用")

    for obsolete_key in (
        "rateTypeOptions",
        "simulationDefaultBusinessTypes",
        "simulationModes",
        "hedgeableItemOptions",
    ):
        if obsolete_key in domain:
            errors.append(f"dashboardDomainConfig.{obsolete_key} is obsolete")

    scenarios = domain.get("eveScenarioDefinitions")
    if not isinstance(scenarios, list) or len(scenarios) < 2:
        errors.append("dashboardDomainConfig.eveScenarioDefinitions should contain multiple scenarios")
    else:
        for index, scenario in enumerate(scenarios):
            if not isinstance(scenario, dict):
                errors.append(f"eveScenarioDefinitions[{index}] should be an object")
                continue
            for key in ("key", "name"):
                if not isinstance(scenario.get(key), str) or not scenario.get(key):
                    errors.append(f"eveScenarioDefinitions[{index}].{key} should be a non-empty string")

    detail_scope_meta = domain.get("businessDetailScopeMeta")
    if not isinstance(detail_scope_meta, dict):
        errors.append("dashboardDomainConfig.businessDetailScopeMeta should be an object")
    else:
        for key in ("stock", "new", "maturity"):
            if key not in detail_scope_meta:
                errors.append(f"businessDetailScopeMeta.{key} is required")

    return errors, warnings


def collect_legacy_text_paths(value: Any, path: str = "root") -> list[str]:
    hits: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            hits.extend(collect_legacy_text_paths(item, f"{path}.{key}"))
        return hits
    if isinstance(value, list):
        for index, item in enumerate(value):
            hits.extend(collect_legacy_text_paths(item, f"{path}[{index}]"))
        return hits
    if isinstance(value, str):
        for snippet in FORBIDDEN_LEGACY_TEXT_SNIPPETS:
            if snippet in value:
                hits.append(f"{path} contains legacy text: {snippet}")
        return hits
    return hits


def main() -> int:
    try:
        data = load_window_json(DATA_FILE, "dashboardData")
        config = load_window_json(CONFIG_FILE, "dashboardConfig")
        domain = load_window_json(DOMAIN_FILE, "dashboardDomainConfig")
    except Exception as exc:
        print(f"[FAIL] Unable to load dashboard files: {exc}")
        return 1

    config["filter_option_names"] = set(config.get("filters", {}).get("options", {}).keys())
    config["filter_preset_names"] = set(config.get("filters", {}).get("presets", {}).keys())
    data_errors, data_warnings, stats = validate_dashboard_data(data, config)
    config_errors, config_warnings = validate_dashboard_config(config, stats)
    domain_errors, domain_warnings = validate_domain_config(domain, config)
    architecture_errors = validate_renderer_architecture(config)
    legacy_text_errors = (
        collect_legacy_text_paths(data, "dashboardData")
        + collect_legacy_text_paths(config, "dashboardConfig")
        + collect_legacy_text_paths(domain, "dashboardDomainConfig")
    )
    errors = data_errors + config_errors + domain_errors + architecture_errors + legacy_text_errors
    warnings = data_warnings + config_warnings + domain_warnings

    if errors:
        print(f"[FAIL] Dashboard validation found {len(errors)} error(s).")
        for error in errors:
            print(f"  - {error}")
    else:
        print(
            "[PASS] Dashboard structure is valid: "
            f"{stats['pages']} pages, {stats['blocks']} blocks, {stats['areas']} areas, {stats['widgets']} widgets."
        )

    if warnings:
        print(f"[WARN] {len(warnings)} warning(s).")
        for warning in warnings:
            print(f"  - {warning}")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())


