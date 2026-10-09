"""Bundle shared answer guards into a standard-library-only platform script."""

from __future__ import annotations

import ast
from pathlib import Path


_MODULES = ("answer_shape", "narrative_guard", "overclaim_guard", "answer_validation")

_HANDLER = '''def handler(params):
    import json
    raw = params.get("narrativeRaw")
    data = params.get("resultPackage") or {}
    mode = params.get("analysisMode")
    errors = []
    try:
        if not isinstance(raw, str):
            raise ValueError("INVALID_JSON")
        cleaned = raw.strip().removeprefix("```json").removesuffix("```").strip()
        answer = normalize_model_answer(json.loads(cleaned))
    except (TypeError, ValueError):
        answer = None
        errors.append("INVALID_JSON")
    if not isinstance(mode, str) or not mode:
        errors.append("MISSING_ANALYSIS_MODE")
    errors.extend(validate_answer(answer, data, mode=mode))
    retry = bool(params.get("isRetry"))
    return {
        "narrative": answer if not errors else None,
        "validationErrors": errors,
        "degradeFlags": ["LIVE_MODEL_OUTPUT_INVALID"] if errors and retry else [],
    }
'''


def build_answer_script() -> str:
    """Inline dependencies, stripping only project imports and module docstrings."""
    parts = []
    root = Path(__file__).resolve().parent
    for name in _MODULES:
        source = (root / (name + ".py")).read_text(encoding="utf-8")
        lines = source.splitlines()
        tree = ast.parse(source)
        for node in tree.body:
            if isinstance(node, ast.ImportFrom) and (node.level or node.module == "__future__"):
                continue
            if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                continue
            decorators = getattr(node, "decorator_list", [])
            first_line = min([node.lineno] + [item.lineno for item in decorators])
            parts.append("\n".join(lines[first_line - 1:node.end_lineno]))
    handler_body = "\n".join(_HANDLER.splitlines()[1:])
    shared_body = "\n".join("    " + line if line else "" for line in "\n\n".join(parts).splitlines())
    script = "from __future__ import annotations\n\ndef handler(params):\n" + shared_body + "\n\n" + handler_body + "\n"
    ast.parse(script, feature_version=(3, 9))
    return script
