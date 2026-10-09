"""Compile supported bank-node definitions, without inventing business nodes."""

from __future__ import annotations

import inspect
import json
import re

from langgraph.graph import END, START, StateGraph

from . import registry
from .constraints import run as check_platform

KINDS = {"start": "开始", "script": "脚本", "api": "API", "prompt": "Prompt",
         "condition": "条件选择器", "end": "结束"}
REFERENCE = re.compile(r"\$\{([^}]+)\}")


def resolve_reference(value, variables):
    if isinstance(value, dict):
        return {key: resolve_reference(child, variables) for key, child in value.items()}
    if isinstance(value, list):
        return [resolve_reference(child, variables) for child in value]
    if not isinstance(value, str):
        return value
    match = REFERENCE.fullmatch(value)
    if match:
        current = variables
        for segment in match[1].split("."):
            if isinstance(current, dict) and segment in current:
                current = current[segment]
            elif isinstance(current, list) and segment.isdigit():
                current = current[int(segment)]
            else:
                raise ValueError("MISSING_VARIABLE:" + match[1])
        return current
    if REFERENCE.search(value):
        raise ValueError("MIXED_INPUT_REFERENCE:" + value)
    if value in ("true", "false", "null"):
        return json.loads(value)
    return value


def validate_definition(spec):
    registry._validate(spec, spec["meta"]["workflow"])
    problems = check_platform(spec)
    if problems:
        raise ValueError("; ".join(problems))
    nodes = {node["id"]: node for node in spec["nodes"]}
    if sum(n["config"]["kind"] == "start" for n in nodes.values()) != 1:
        raise ValueError("ONE_START_REQUIRED")
    ids = [n.get("execution", {}).get("runtimeId") for n in nodes.values()]
    if any(not name for name in ids) or len(ids) != len(set(ids)):
        raise ValueError("UNIQUE_RUNTIME_IDS_REQUIRED")
    reachable = {next(n["id"] for n in nodes.values() if n["config"]["kind"] == "start")}
    while True:
        expanded = reachable | {e["to"] for e in spec["edges"] if e["from"] in reachable}
        if expanded == reachable:
            break
        reachable = expanded
    if reachable != set(nodes):
        raise ValueError("UNREACHABLE_NODE")
    for node in nodes.values():
        config = node["config"]
        kind = config["kind"]
        if kind not in KINDS or node["inlineType"] != KINDS[kind] or node.get("localOnly"):
            raise ValueError("UNSUPPORTED_NODE:" + node["id"])
        if kind == "api" and not all(config.get(k) for k in ("plugin", "path", "method")):
            raise ValueError("API_CONFIGURATION_REQUIRED:" + node["id"])
        if kind == "prompt" and not all(config.get(k) for k in ("systemPrompt", "model", "outputName")):
            raise ValueError("PROMPT_CONFIGURATION_REQUIRED:" + node["id"])
        if kind == "prompt":
            if config.get("outputFormat") != "text" or "temperature" not in config or "maxTokens" not in config:
                raise ValueError("PROMPT_PARAMETERS_REQUIRED:" + node["id"])
            if set(REFERENCE.findall(config["systemPrompt"])) - {i["name"] for i in node["inputs"]}:
                raise ValueError("UNDECLARED_PROMPT_INPUT:" + node["id"])
        if kind == "script" and not all(config.get(k) for k in ("code", "outputName")):
            raise ValueError("SCRIPT_CONFIGURATION_REQUIRED:" + node["id"])
        if kind in {"script", "prompt", "api"}:
            roots = {o["name"].split(".")[0] for o in node["outputs"]}
            if roots != {config.get("outputName")}:
                raise ValueError("OUTPUT_BINDING_MISMATCH:" + node["id"])
        if kind in {"api", "prompt", "script"} and config.get("onError") not in {"abort", "ignore"}:
            raise ValueError("ERROR_POLICY_REQUIRED:" + node["id"])
        if config.get("onError") == "ignore" and "defaultOutput" not in config:
            raise ValueError("DEFAULT_OUTPUT_REQUIRED:" + node["id"])
        targets = {e["to"] for e in spec["edges"] if e["from"] == node["id"]}
        if kind == "condition":
            branches = config.get("branches", [])
            if not branches or branches[-1].get("operator") != "else":
                raise ValueError("CONDITION_ELSE_REQUIRED")
            if {b.get("target") for b in branches} != targets:
                raise ValueError("BRANCH_EDGE_MISMATCH")
            for branch in branches[:-1]:
                if branch.get("operator") not in {"not_empty", "empty", "equals"} or branch.get("input") not in {i["name"] for i in node["inputs"]}:
                    raise ValueError("UNSUPPORTED_CONDITION")
        elif kind != "end" and len(targets) != 1:
            raise ValueError("SINGLE_SUCCESSOR_REQUIRED:" + node["id"])
        elif kind == "end" and targets:
            raise ValueError("END_HAS_SUCCESSOR")
        for row in node["inputs"]:
            source = str(row.get("source", ""))
            if kind != "start" and not REFERENCE.fullmatch(source) and source not in {"true", "false", "null", ""}:
                raise ValueError("NON_EXECUTABLE_INPUT:" + node["id"] + ":" + row["name"])
    return nodes


def compile_definition(spec, state_type, *, initial_variables, api, prompt, project):
    """Adapters provide transport/state projection only; scripts and routes come from spec."""
    nodes = validate_definition(spec)
    names = {key: n["execution"]["runtimeId"] for key, n in nodes.items()}
    start = next(key for key, n in nodes.items() if n["config"]["kind"] == "start")
    terminal = next(key for key, n in nodes.items() if n["config"]["kind"] == "end")
    graph = StateGraph(state_type)
    outgoing = {key: [e["to"] for e in spec["edges"] if e["from"] == key] for key in nodes}

    def choose(node, variables):
        params = {i["name"]: resolve_reference(i["source"], variables) for i in node["inputs"]}
        for branch in node["config"]["branches"]:
            op = branch["operator"]
            value = params.get(branch.get("input"))
            if op == "else" or (op == "not_empty" and bool(value)) or (op == "empty" and not value) or (op == "equals" and value == branch.get("value")):
                return branch["target"]
        raise ValueError("NO_MATCHING_BRANCH")

    def operation(node):
        config = node["config"]
        kind = config["kind"]
        namespace = {}
        if kind == "script":
            exec(compile(config["code"], "<bank-script:" + node["id"] + ">", "exec"), namespace)

        async def invoke(state):
            variables = dict(initial_variables(state) if node["id"] == outgoing[start][0]
                             else state.get("platform_variables") or initial_variables(state))
            params = {i["name"]: resolve_reference(i["source"], variables) for i in node["inputs"]}
            updates = {}
            if kind != "condition":
                try:
                    if kind == "script":
                        output = namespace["handler"](params)
                        if not isinstance(output, dict):
                            raise ValueError("SCRIPT_OUTPUT_NOT_OBJECT")
                    else:
                        output = (api if kind == "api" else prompt)(node, params, state)
                        if inspect.isawaitable(output):
                            output = await output
                except Exception:
                    if config["onError"] != "ignore":
                        raise
                    output = config["defaultOutput"]
                    updates["llm_failed"] = kind == "prompt"
                variables[config["outputName"]] = output
            target = choose(node, variables) if kind == "condition" else outgoing[node["id"]][0]
            updates.update(project(node, variables, {**state, **updates}))
            if target == terminal:
                updates["platform_output"] = resolve_reference(nodes[terminal]["config"]["outputTemplate"], variables)
            updates["platform_variables"] = variables
            return updates
        return invoke

    for key, node in nodes.items():
        if key not in {start, terminal}:
            def guarded(node):
                action = operation(node)
                async def run(state):
                    try:
                        return await action(state)
                    except Exception as exc:
                        exc.bank_runtime_node = names[node["id"]]
                        raise
                return run
            graph.add_node(names[key], guarded(node))
    for key, targets in outgoing.items():
        if key == terminal:
            continue
        source = START if key == start else names[key]
        if nodes[key]["config"]["kind"] == "condition":
            def route(state, node=nodes[key]):
                return choose(node, state["platform_variables"])
            graph.add_conditional_edges(source, route, {t: END if t == terminal else names[t] for t in targets})
        else:
            graph.add_edge(source, END if targets[0] == terminal else names[targets[0]])
    return graph.compile()
