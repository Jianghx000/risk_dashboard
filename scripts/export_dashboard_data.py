from __future__ import annotations

import json
import os
from collections import OrderedDict
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "prototype" / "dashboard-data.js"


def detect_workbook() -> Path:
    for name in os.listdir(ROOT):
        if name.endswith(".xlsx") and not name.startswith("~$") and any(ord(ch) > 127 for ch in name):
            return ROOT / name
    raise FileNotFoundError("Workbook not found")


def split_filters(text: str) -> list[str]:
    if not text:
        return []
    normalized = text.replace("；", ";").replace("，", ",")
    return [part.strip() for part in normalized.split(";") if part.strip()]


def build_payload() -> dict:
    workbook_path = detect_workbook()
    wb = load_workbook(workbook_path, data_only=True)
    ws = wb[wb.sheetnames[-1]]
    rows = list(ws.iter_rows(min_row=2, values_only=True))

    pages: OrderedDict[str, dict] = OrderedDict()

    for row in rows:
        if not row[0]:
            continue
        (
            seq,
            page_name,
            block_name,
            area_name,
            view_scope,
            widget_title,
            shared_filters,
            display_desc,
            component_type,
            grain,
            default_filters,
            frontend_params,
            axis_desc,
            metric_desc,
            legend_desc,
            response_fields,
            linkage_rule,
            dev_note,
            origin_pos,
        ) = row[:19]

        page = pages.setdefault(
            page_name,
            {"id": f"page-{len(pages) + 1}", "name": page_name, "blocks": OrderedDict()},
        )
        block = page["blocks"].setdefault(
            block_name,
            {"id": f"block-{len(page['blocks']) + 1}", "name": block_name, "areas": OrderedDict()},
        )
        area_key = f"{area_name}__{view_scope}"
        area = block["areas"].setdefault(
            area_key,
            {
                "id": f"area-{seq}",
                "name": area_name,
                "viewScope": view_scope,
                "sharedFilters": split_filters(shared_filters or ""),
                "widgets": [],
            },
        )
        area["widgets"].append(
            {
                "seq": int(seq),
                "title": widget_title,
                "componentType": component_type,
                "displayDescription": display_desc,
                "grain": grain,
                "defaultFilters": default_filters,
                "frontendParams": frontend_params,
                "axisDescription": axis_desc,
                "metricDescription": metric_desc,
                "legendDescription": legend_desc,
                "responseFields": response_fields,
                "linkageRule": linkage_rule,
                "devNote": dev_note,
                "originPosition": origin_pos,
            }
        )

    page_list = []
    total_widgets = 0
    for page in pages.values():
        block_list = []
        for block in page["blocks"].values():
            area_list = list(block["areas"].values())
            block_list.append(
                {
                    "id": block["id"],
                    "name": block["name"],
                    "areas": area_list,
                    "widgetCount": sum(len(area["widgets"]) for area in area_list),
                }
            )
        widget_count = sum(block["widgetCount"] for block in block_list)
        total_widgets += widget_count
        page_list.append(
            {
                "id": page["id"],
                "name": page["name"],
                "blocks": block_list,
                "blockCount": len(block_list),
                "areaCount": sum(len(block["areas"]) for block in block_list),
                "widgetCount": widget_count,
            }
        )

    return {
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "workbook": workbook_path.name,
        "pageCount": len(page_list),
        "widgetCount": total_widgets,
        "pages": page_list,
    }


def main() -> None:
    payload = build_payload()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    js = "window.dashboardData = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
    OUTPUT.write_text(js, encoding="utf-8")
    print(f"Exported to {OUTPUT}")


if __name__ == "__main__":
    main()
