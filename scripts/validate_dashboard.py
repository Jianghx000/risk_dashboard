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
INDEX_FILE = ROOT / "prototype" / "index.html"

FORBIDDEN_RENDERER_SNIPPETS = [
    'pageName.includes("鍒╃巼")',
    'pageName.includes("娴佸姩鎬?)',
    'pageName.includes("姹囩巼")',
    'String(block?.name || "").includes("鏈熸潈鎬ч闄?)',
    'currentPageId || "") === "page-4"',
    'widget.title.includes("鍗犳瘮")',
    'widget.title.includes("鍒嗗竷")',
    'String(widget?.title || "").includes("璧勪骇璐熷€虹粨鏋勪竴瑙堣〃")',
    'String(widget?.title || "").includes("閲嶅畾浠疯妯′笌缂哄彛")',
    'String(widget?.title || "").includes("璧勯噾娴佸叆娴佸嚭瑙勬ā")',
    'String(widget?.title || "").includes("鏈潵閫愭棩璧勯噾娴?)',
    'String(widget?.title || "").includes("璧勪骇/璐熷€洪噸瀹氫环涔呮湡")',
    'String(widget?.title || "").includes("鍒嗗竵绉嶄箙鏈熺己鍙ｄ竴瑙堣〃")',
    'String(widget?.title || "").includes("鍚勫竵绉嶆渶澶х粡娴庝环鍊煎彉鍔?)',
    'String(widget?.title || "").includes("6绉嶆儏鏅笅缁忔祹浠峰€煎彉鍔ㄨ〃")',
    'String(widget?.title || "").includes("鍑€鍒╂伅鏀跺叆娉㈠姩鍙婃尝鍔ㄧ巼")',
    'String(widget?.title || "").includes("娴佸姩鎬х己鍙ｈ妯★紙1/7/90鏃ワ級")',
    'String(widget?.title || "").includes("30鏃ユ祦鍔ㄦ€х己鍙ｈ妯?)',
    'Number(widget?.seq) === 5',
    'Number(widget?.seq) === 6',
    'String(widgetSeq) === "49"',
    'String(widgetSeq) === "50"',
    'String(widgetSeq) === "89"',
    'String(widgetSeq) === "96"',
    'title.includes("\u4e45\u671f")',
    'title.includes("\u7f3a\u53e3")',
    'title.includes("\u6ce2\u52a8")',
    'title.includes("\u53d8\u52a8")',
    'title.includes("\u89c4\u6a21\u53ca\u589e\u901f")',
    'title.includes("\u8986\u76d6\u7387")',
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
]

EXPECTED_PAGE_IDS_BY_NAME = {
    "利率风险": "interest-risk",
    "流动性风险": "liquidity-risk",
    "业务变动分析": "business-change",
}

ALLOWED_SIMULATION_WIDGET_SEQS = {9, 49}
SOURCE_ONLY_WIDGET_SEQS = {3, 4}
REMOVED_WIDGET_SEQS = {5, 8, 10, 11, 16, 17}
REMOVED_STRUCTURE_LAYER_NAMES = {"核心风险指标", "缺口风险", "现金流错配"}


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
    block_names_by_page: dict[str, set[str]] = {}
    area_names_by_scope: dict[tuple[str, str], set[str]] = {}
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
        block_names_by_page[str(page.get("name"))] = set()

        for block in blocks:
            ensure_fields(block, ["id", "name", "areas"], f"block {block!r}", errors)
            if block.get("id") in page_block_ids:
                errors.append(f"duplicate block id within page {page.get('id')}: {block.get('id')}")
            page_block_ids.add(block.get("id"))
            if str(block.get("name")) in REMOVED_STRUCTURE_LAYER_NAMES:
                errors.append(f"removed structure layer still appears in dashboard data: {block.get('name')}")
            block_names_by_page[str(page.get("name"))].add(str(block.get("name")))
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
                area_scope = (str(page.get("name")), str(block.get("name")))
                area_names_by_scope.setdefault(area_scope, set()).add(str(area.get("name")))
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
                scope_meta = area.get("scopeMeta")
                if scope_meta is not None and not isinstance(scope_meta, dict):
                    errors.append(f"area {area.get('id')} scopeMeta should be an object")

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
        "block_names_by_page": block_names_by_page,
        "area_names": area_names,
        "area_names_by_scope": area_names_by_scope,
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
    block_display = config.get("blockDisplay", {})
    area_display = config.get("areaDisplay", {})
    layout_rules = config.get("layoutRules", {})
    tabs = config.get("tabs", {})
    widget_behavior = config.get("widgetBehavior", {})
    widget_filters = config.get("widgetFilters", {})
    widget_filter_presets = config.get("widgetFilterPresets", {})
    series_rules = config.get("seriesRules", {})
    visual_rules = config.get("visualRules", {})
    simulation_rules = config.get("simulationRules", {})
    table_templates = config.get("tableTemplates", {})
    detail_tables = config.get("detailTables", {})
    management_limits = config.get("managementLimits", [])
    widget_index = stats["widget_index"]
    widget_context = stats["widget_context"]
    page_names = stats["page_names"]
    block_names_by_page = stats["block_names_by_page"]
    area_names = stats["area_names"]
    area_names_by_scope = stats["area_names_by_scope"]
    allowed_direction_modes = {"coverage", "gap", "default"}

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
        allowed_modes = {"interest", "liquidity", "generic"}
        allowed_analysis_perspectives = {"interestBalanceStructure"}
        for page_name, behavior in page_behavior.items():
            if page_name not in page_names:
                warnings.append(f"pageBehavior references unknown page name: {page_name}")
            if not isinstance(behavior, dict):
                errors.append(f"pageBehavior.{page_name} should be an object")
                continue
            if "simulationMode" in behavior and behavior.get("simulationMode") not in allowed_modes:
                errors.append(f"pageBehavior.{page_name}.simulationMode should be one of: {', '.join(sorted(allowed_modes))}")
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

    if not isinstance(block_display, dict):
        errors.append("blockDisplay should be an object")
    elif block_display:
        errors.append("blockDisplay is deprecated; move block rules to layoutRules.blocks")

    if not isinstance(area_display, dict):
        errors.append("areaDisplay should be an object")
    elif area_display:
        errors.append("areaDisplay is deprecated; move area rules to layoutRules.areas")

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
            for key in ("detailScope", "detailTablePreset"):
                if key in behavior and not isinstance(behavior.get(key), str):
                    errors.append(f"widgetBehavior.{seq_text}.{key} should be a string")
            detail_preset = behavior.get("detailTablePreset")
            if isinstance(detail_preset, str) and detail_preset and detail_preset not in detail_tables:
                errors.append(f"widgetBehavior.{seq_text}.detailTablePreset references unknown detailTables entry: {detail_preset}")
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
                    if "directionMode" in simulation_behavior and simulation_behavior.get("directionMode") not in allowed_direction_modes:
                        errors.append(
                            f"widgetBehavior.{seq_text}.simulationBehavior.directionMode should be one of: "
                            + ", ".join(sorted(allowed_direction_modes))
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
            if context["page_name"] == "\u6d41\u52a8\u6027\u98ce\u9669" and simulation_behavior.get("directionMode") not in allowed_direction_modes:
                errors.append(
                    f"widgetBehavior.{seq}.simulationBehavior.directionMode is required for liquidity widget: "
                    f"{context['title']}"
                )

    if not isinstance(tabs, dict):
        errors.append("tabs should be an object")
    else:
        for tab_group, items in tabs.items():
            if not isinstance(items, list) or not items:
                errors.append(f"tabs.{tab_group} should be a non-empty list")
                continue
            for item in items:
                if not isinstance(item, dict):
                    errors.append(f"tabs.{tab_group} contains a non-object item")
                    continue
                ensure_fields(item, ["label", "matchViewScope"], f"tabs.{tab_group} item", errors)
                if "matchScopeMeta" in item and not isinstance(item.get("matchScopeMeta"), dict):
                    errors.append(f"tabs.{tab_group}.{item.get('label')} matchScopeMeta should be an object")

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
        if "defaults" in simulation_rules and not isinstance(simulation_rules.get("defaults"), dict):
            errors.append("simulationRules.defaults should be an object")
        if "modes" in simulation_rules and not isinstance(simulation_rules.get("modes"), dict):
            errors.append("simulationRules.modes should be an object")
        if "wholesaleLiabilityTypes" in simulation_rules:
            errors.append("simulationRules.wholesaleLiabilityTypes is deprecated; move it to dashboard-domain.js")

    if not isinstance(detail_tables, dict):
        errors.append("detailTables should be an object")
    else:
        for preset_name, preset in detail_tables.items():
            if not isinstance(preset, dict):
                errors.append(f"detailTables.{preset_name} should be an object")
                continue
            columns = preset.get("columns")
            if not isinstance(columns, list) or not columns:
                errors.append(f"detailTables.{preset_name}.columns should be a non-empty list")
                continue
            for index, column in enumerate(columns):
                if not isinstance(column, dict):
                    errors.append(f"detailTables.{preset_name}.columns[{index}] should be an object")
                    continue
                ensure_fields(column, ["key", "label"], f"detailTables.{preset_name}.columns[{index}]", errors)
                for field_name in ("key", "label"):
                    value = column.get(field_name)
                    if not isinstance(value, str) or not value:
                        errors.append(f"detailTables.{preset_name}.columns[{index}].{field_name} should be a non-empty string")
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
        block_rules = layout_rules.get("blocks", {})
        area_rules = layout_rules.get("areas", {})
        widget_rules = layout_rules.get("widgets", {})
        if block_rules and not isinstance(block_rules, dict):
            errors.append("layoutRules.blocks should be an object")
        else:
            for path, rule in block_rules.items():
                if not isinstance(rule, dict):
                    errors.append(f"layoutRules.blocks.{path} should be an object")
                    continue
                if "pairAreas" in rule and not isinstance(rule.get("pairAreas"), bool):
                    errors.append(f"layoutRules.blocks.{path}.pairAreas should be a boolean")
        if area_rules and not isinstance(area_rules, dict):
            errors.append("layoutRules.areas should be an object")
        else:
            for path, rule in area_rules.items():
                if not isinstance(rule, dict):
                    errors.append(f"layoutRules.areas.{path} should be an object")
                    continue
                if "mergeViewGroups" in rule and not isinstance(rule.get("mergeViewGroups"), bool):
                    errors.append(f"layoutRules.areas.{path}.mergeViewGroups should be a boolean")
                if "sharedFilterPreset" in rule and rule.get("sharedFilterPreset") not in filter_presets:
                    errors.append(f"layoutRules.areas.{path}.sharedFilterPreset references unknown filters.presets entry")
                if "pinnedViewScopeIncludes" in rule:
                    values = rule.get("pinnedViewScopeIncludes")
                    if not isinstance(values, list) or not all(isinstance(value, str) and value for value in values):
                        errors.append(f"layoutRules.areas.{path}.pinnedViewScopeIncludes should be a string list")
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
        for index, item in enumerate(management_limits, start=1):
            if not isinstance(item, dict):
                errors.append(f"managementLimits[{index}] should be an object")
                continue
            if "matchTitles" in item:
                errors.append(f"managementLimits[{index}].matchTitles is deprecated; use widgetSeqs")
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
    index_text = INDEX_FILE.read_text(encoding="utf-8")
    errors: list[str] = []
    for snippet in FORBIDDEN_RENDERER_SNIPPETS:
        if snippet in text:
            errors.append(f"app.js contains forbidden renderer hardcode: {snippet}")
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
    ):
        if business_renderer_function in text:
            errors.append(f"app.js should not define business-change renderers: {business_renderer_function}")
        if business_renderer_function not in business_renderers_text:
            errors.append(f"dashboard-business-renderers.js should define {business_renderer_function}")
    for liquidity_renderer_function in (
        "function renderLiquidityGapTenorChart",
        "function renderFutureFundingFlowChart",
        "function renderInterbankFundingMaxTenorChart",
        "function renderBondInvestmentScaleLimitChart",
    ):
        if liquidity_renderer_function in text:
            errors.append(f"app.js should not define liquidity/funding renderers: {liquidity_renderer_function}")
        if liquidity_renderer_function not in liquidity_renderers_text:
            errors.append(f"dashboard-liquidity-renderers.js should define {liquidity_renderer_function}")
    for interest_renderer_function in (
        "function renderDurationGapComboChart",
        "function renderBusinessDurationRepricingChart",
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
    if not isinstance(business_options, list) or not business_options:
        errors.append("dashboardDomainConfig.businessDurationOptions should be a non-empty list")
        business_options = []
    elif len(set(business_options)) != len(business_options):
        errors.append("dashboardDomainConfig.businessDurationOptions contains duplicate values")

    business_default_values = domain.get("businessTypeDefaultValues")
    if not isinstance(business_default_values, list) or not business_default_values:
        errors.append("dashboardDomainConfig.businessTypeDefaultValues should be a non-empty list")
        business_default_values = []
    else:
        invalid_defaults = [item for item in business_default_values if item not in business_options]
        if invalid_defaults:
            errors.append("dashboardDomainConfig.businessTypeDefaultValues has unknown values: " + ", ".join(invalid_defaults))

    for preset_name in ("businessTypeLegend", "futureFundingBusinessTypeLegend"):
        preset = config.get("widgetFilterPresets", {}).get(preset_name, {})
        preset_options_ref = preset.get("optionsRef")
        preset_options = preset.get("options")
        if preset_options_ref:
            if preset_options_ref != "businessDurationOptions":
                errors.append(f"widgetFilterPresets.{preset_name}.optionsRef should be businessDurationOptions")
            if "options" in preset:
                errors.append(f"widgetFilterPresets.{preset_name} should not duplicate options when optionsRef is used")
        elif isinstance(preset_options, list):
            if preset_options != business_options:
                errors.append(f"widgetFilterPresets.{preset_name}.options should match dashboardDomainConfig.businessDurationOptions")
        else:
            errors.append(f"widgetFilterPresets.{preset_name} should define optionsRef or options")

        default_ref = preset.get("defaultValuesRef")
        if default_ref:
            if default_ref not in {"businessDurationOptions", "businessTypeDefaultValues"}:
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

    simulation_default_business_types = domain.get("simulationDefaultBusinessTypes")
    if not isinstance(simulation_default_business_types, dict):
        errors.append("dashboardDomainConfig.simulationDefaultBusinessTypes should be an object")
    else:
        invalid_defaults = [
            f"{role}:{business_type}"
            for role, business_type in simulation_default_business_types.items()
            if business_type not in business_options
        ]
        if invalid_defaults:
            errors.append("simulationDefaultBusinessTypes has unknown business types: " + ", ".join(invalid_defaults))

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

    for key in ("liquidityGapTenorOptions", "rateTypeOptions", "simulationFundingRoleOptions"):
        values = domain.get(key)
        if not isinstance(values, list) or not values:
            errors.append(f"dashboardDomainConfig.{key} should be a non-empty list")
    if "30D" not in (domain.get("liquidityGapTenorOptions") or []):
        errors.append("liquidityGapTenorOptions should include 30D")
    for role in ("资金来源", "资金运用"):
        if role not in (domain.get("simulationFundingRoleOptions") or []):
            errors.append(f"simulationFundingRoleOptions should include {role}")

    simulation_modes = domain.get("simulationModes")
    if not isinstance(simulation_modes, dict):
        errors.append("dashboardDomainConfig.simulationModes should be an object")
    else:
        for key in ("newBusiness", "hedge", "netInterestIncome", "liquidityStress"):
            if not isinstance(simulation_modes.get(key), str) or not simulation_modes.get(key):
                errors.append(f"simulationModes.{key} should be a non-empty string")

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

    hedge_items = domain.get("hedgeableItemOptions")
    if not isinstance(hedge_items, list):
        errors.append("dashboardDomainConfig.hedgeableItemOptions should be a list")
    else:
        for index, item in enumerate(hedge_items):
            if not isinstance(item, dict):
                errors.append(f"hedgeableItemOptions[{index}] should be an object")
                continue
            if item.get("businessType") not in business_options:
                errors.append(f"hedgeableItemOptions[{index}].businessType is not in businessDurationOptions")
            if item.get("rateType") and item.get("rateType") not in (domain.get("rateTypeOptions") or []):
                errors.append(f"hedgeableItemOptions[{index}].rateType is not in rateTypeOptions")

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


