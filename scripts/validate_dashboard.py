from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "prototype" / "dashboard-data.js"
CONFIG_FILE = ROOT / "prototype" / "dashboard-config.js"


def load_window_json(path: Path, variable_name: str) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8").strip()
    prefix = f"window.{variable_name} = "
    if not text.startswith(prefix) or not text.endswith(";"):
        raise ValueError(f"{path.name} is not in expected window.{variable_name} format")
    payload = text[len(prefix) : -1].strip()
    return json.loads(payload)


def normalize_filter_name(name: str) -> str:
    return re.sub(r"[（(].*?[）)]", "", str(name)).strip()


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
    area_ids: set[str] = set()
    area_names: set[str] = set()
    total_blocks = 0
    total_areas = 0
    total_widgets = 0

    for page in pages:
        ensure_fields(page, ["id", "name", "blocks"], f"page {page!r}", errors)
        if page.get("id") in page_ids:
            errors.append(f"duplicate page id: {page.get('id')}")
        page_ids.add(page.get("id"))
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

            for area in areas:
                ensure_fields(area, ["id", "name", "widgets"], f"area {area!r}", errors)
                if area.get("id") in area_ids:
                    errors.append(f"duplicate area id: {area.get('id')}")
                area_ids.add(area.get("id"))
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
                    widget_index[seq] = widget

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
        "area_names": area_names,
    }
    return errors, warnings, stats


def validate_dashboard_config(config: dict[str, Any], stats: dict[str, Any]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    filter_options = config.get("filters", {}).get("options", {})
    defaults = config.get("filters", {}).get("defaults", {})
    area_overrides = config.get("filters", {}).get("areaOverrides", {})
    tabs = config.get("tabs", {})
    widget_filters = config.get("widgetFilters", {})
    series_rules = config.get("seriesRules", [])
    widget_index = stats["widget_index"]
    area_names = stats["area_names"]

    if not isinstance(filter_options, dict):
        errors.append("filters.options should be an object")
        filter_options = {}

    filter_option_names = set(filter_options.keys())
    config["filter_option_names"] = filter_option_names

    for filter_name, values in filter_options.items():
        if not isinstance(values, list) or not values:
            errors.append(f"filters.options.{filter_name} should be a non-empty list")

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
                if normalize_filter_name(filter_name) not in filter_option_names:
                    warnings.append(f"filters.areaOverrides.{area_name}.{filter_name} has no matching filters.options entry")
                if not isinstance(values, list):
                    errors.append(f"filters.areaOverrides.{area_name}.{filter_name} should be a list")

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
                ensure_fields(filter_item, ["name"], f"widgetFilters.{seq_text} item", errors)
                normalized = normalize_filter_name(filter_item.get("name", ""))
                options = filter_item.get("options")
                if options is not None and not isinstance(options, list):
                    errors.append(f"widgetFilters.{seq_text}.{filter_item.get('name')} options should be a list")
                if normalized not in filter_option_names and not options:
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

    if not isinstance(series_rules, list):
        errors.append("seriesRules should be a list")
    else:
        for index, rule in enumerate(series_rules, start=1):
            if not isinstance(rule, dict):
                errors.append(f"seriesRules[{index}] should be an object")
                continue
            match = rule.get("match")
            if not isinstance(match, dict):
                errors.append(f"seriesRules[{index}].match should be an object")
                continue
            widget_seq = match.get("widgetSeq")
            if widget_seq is not None and widget_seq not in widget_index:
                errors.append(f"seriesRules[{index}] references unknown widget seq: {widget_seq}")
            for key in ("allow", "suppress"):
                if key in rule:
                    values = rule.get(key)
                    if not isinstance(values, list) or not values:
                        errors.append(f"seriesRules[{index}].{key} should be a non-empty list")
                        continue
                    invalid = [value for value in values if normalize_filter_name(value) not in filter_option_names]
                    if invalid:
                        warnings.append(
                            f"seriesRules[{index}].{key} contains names without matching filters.options entry: "
                            + ", ".join(map(str, invalid))
                        )

    return errors, warnings


def main() -> int:
    try:
        data = load_window_json(DATA_FILE, "dashboardData")
        config = load_window_json(CONFIG_FILE, "dashboardConfig")
    except Exception as exc:
        print(f"[FAIL] Unable to load dashboard files: {exc}")
        return 1

    config["filter_option_names"] = set(config.get("filters", {}).get("options", {}).keys())
    data_errors, data_warnings, stats = validate_dashboard_data(data, config)
    config_errors, config_warnings = validate_dashboard_config(config, stats)
    errors = data_errors + config_errors
    warnings = data_warnings + config_warnings

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
