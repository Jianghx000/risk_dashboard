"""Shared answer checks for runtime and portable platform scripts."""

from __future__ import annotations

from typing import Any

from .narrative_guard import collect_identifier_keys, find_unreferenced_numbers
from .overclaim_guard import GuardContext, check_overclaims


def _resolve_path(document: dict, path: str) -> Any:
    if not isinstance(path, str) or not path:
        raise KeyError("INVALID_PATH")
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
            texts.extend(item["text"] for item in sections
                         if isinstance(item, dict) and isinstance(item.get("text"), str))
        errors.extend(
            find_unreferenced_numbers(
                texts,
                source_values=source_values,
                cited_identifiers=cited_identifiers,
                compared_currencies=result.get("comparedCurrencies"),
                cited_paths={item["path"] for item in refs if isinstance(item.get("path"), str)},
            )
        )
    if str(result.get("attributionMethod") or "").startswith("SYNTHETIC"):
        if "百分点" in answer.get("headline", ""):
            errors.append("ILLUSTRATIVE_IMPACT_IN_HEADLINE")
        if isinstance(sections, list):
            for section in sections:
                if isinstance(section, dict) and "illustrativeImpactPctPoint" in section.get("citations", []):
                    if "演示" not in section.get("text", ""):
                        errors.append("ILLUSTRATIVE_IMPACT_UNLABELED")
    initial_causes = result.get("attribution") or {}
    if mode == "overview" and initial_causes.get("factors"):
        paths = {r.get("path") for r in refs if isinstance(r, dict)} if isinstance(refs, list) else set()
        if "attribution.changePctPoint" not in paths:
            errors.append("INITIAL_CAUSES_MISSING")
        cause_sections = [s for s in sections if isinstance(s, dict) and any(
            str(p).startswith("attribution.") for p in s.get("citations", []) or [])] if isinstance(sections, list) else []
        if not cause_sections:
            errors.append("INITIAL_CAUSES_MISSING")
        if str(initial_causes.get("method", "")).startswith("SYNTHETIC"):
            if any("演示" not in s.get("text", "") for s in cause_sections):
                errors.append("DEMO_ATTRIBUTION_UNLABELED")
    if mode == "attribution" and str(result.get("method", "")).startswith("SYNTHETIC"):
        if isinstance(sections, list) and any(isinstance(s, dict) and "演示" not in s.get("text", "")
                for s in sections if isinstance(s, dict) and isinstance(s.get("citations"), list) and
                    any(p in ("changePctPoint", "factors") or str(p).startswith("factors.") for p in s["citations"])):
            errors.append("DEMO_ATTRIBUTION_UNLABELED")
    modules = result.get("analyses")
    if isinstance(modules, dict):
        for need in result.get("dataNeeds", []):
            module = modules.get(need)
            if not isinstance(module, dict):
                errors.append("MISSING_REQUESTED_ANALYSIS:" + str(need))
                continue
            parts = module.get("byCurrency", [module])
            for index, part in enumerate(parts):
                prefix = "analyses." + need + (".byCurrency." + str(index) if "byCurrency" in module else "") + "."
                selected = [s for s in sections if isinstance(s, dict) and isinstance(s.get("citations"), list) and any(
                    isinstance(p, str) and p.startswith(prefix) for p in s["citations"])] if isinstance(sections, list) else []
                if not selected:
                    errors.append("UNANSWERED_DATA_NEED:" + prefix[:-1])
                    continue
                sub = {"headline": "", "sections": [{**s, "citations": [p[len(prefix):] for p in s["citations"]
                    if isinstance(p, str) and p.startswith(prefix)]} for s in selected],
                    "numericRefs": [{**r, "path": r["path"][len(prefix):]} for r in refs
                        if isinstance(r, dict) and isinstance(r.get("path"), str) and r["path"].startswith(prefix)] if isinstance(refs, list) else []}
                errors.extend(prefix + error for error in validate_answer(sub, part, mode=need))
                errors.extend(prefix + error for error in check_overclaims(
                    GuardContext(mode=need, result=part, narrative=answer.get("headline", ""))))
                paths = {r["path"] for r in sub["numericRefs"]}
                citations = {p for s in sub["sections"] for p in s["citations"]}
                if part.get("status") == "available":
                    required = {
                        "limit": "current.value", "attribution": "changePctPoint",
                        "calculation": "node.value", "business": "changeAmount",
                    }.get(need)
                    missing = required is not None and required not in paths
                    if need == "trend":
                        missing = not any(p.startswith("trend.") and p.endswith(".value") for p in paths)
                    if need == "methodology":
                        missing = not (citations.intersection({"formula", "gapFormula", "exclusions"}) or
                            any(p.startswith("exclusions.") for p in citations))
                    if need == "currencyCompare":
                        missing = any("currencySummary." + str(i) + ".ratio" not in paths
                            for i in range(len(part.get("currencySummary", []))))
                    if need == "attribution":
                        missing = missing or not any(p.startswith("factors.") and p.endswith(".impactPctPoint") for p in paths)
                    if missing:
                        errors.append("INSUFFICIENT_ANALYSIS_EVIDENCE:" + prefix[:-1])
    # 语义越界门禁：数字有据不代表说法成立（"监管限额""美元风险更高"）。
    # 给了 mode 才检查——脱离模式的规则会把合法的免责说明也误杀。
    if mode is not None:
        narrative = "\n".join(
            [answer.get("headline", "")]
            + [item["text"] for item in (sections if isinstance(sections, list) else [])
               if isinstance(item, dict) and isinstance(item.get("text"), str)]
        )
        errors.extend(check_overclaims(GuardContext(mode="compound" if modules else mode, result=result, narrative=narrative)))
    return errors

