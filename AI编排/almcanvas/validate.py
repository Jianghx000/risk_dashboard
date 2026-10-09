"""Validate a replica delivery without importing its business runtime."""

import argparse
import json
from pathlib import Path

from .constraints import ENFORCED_BLUEPRINT
from .registry import _validate


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("spec", type=Path)
    args = parser.parse_args()
    spec = json.loads(args.spec.read_text(encoding="utf-8"))
    _validate(spec, args.spec.parent.name)
    problems = [f"{rule}: {problem}" for rule, check in ENFORCED_BLUEPRINT.items() for problem in check(spec)]
    if problems:
        raise SystemExit("\n".join(problems))
    if spec.get("meta", {}).get("executionVersion") == 1:
        from .langgraph_runtime import validate_definition
        validate_definition(spec)
    print(f"PASS: {spec['meta']['workflow']} ({len(spec['nodes'])} nodes)")


if __name__ == "__main__":
    main()
