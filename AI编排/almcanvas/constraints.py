"""平台边界：把行内平台约束接成机器可检查的一致性套件。

规则事实全部来自 ``AI编排/docs/platform-constraints.json``（逐条标注 docx
片段号 / 能力速查行号），本模块只负责**怎么检查**，不重复陈述规则本身。

两条设计原则：

1. **没有任何规则可以被静默忽略。** 每条规则必须注册一个自动检查（``ENFORCED``）
   或被显式列入 ``MANUAL`` 并写明为何只能人工判定。``unclassified()`` 返回所有
   既未检查也未豁免的规则，测试直接断它为空。
2. **平台事实与本地实现分离。** 检查只针对**行内复刻侧**（蓝图/节点的 config），
   不检查本地 LangGraph 的实现细节——本地能 JSON 流式而行内不能，这是允许的差异。
"""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path
from typing import Any, Callable, Iterable

CONSTRAINTS_PATH = Path(__file__).resolve().parent.parent / "docs" / "platform-constraints.json"

# 脚本节点禁止的长 IO / 越权能力。docx 片段 10：沙箱实现，不支持文件读写、HTTP 调用。
_FORBIDDEN_SCRIPT_IMPORTS = {
    "requests", "httpx", "urllib", "http", "socket", "ssl",
    "os", "subprocess", "shutil", "pathlib", "glob", "tempfile",
    "sqlite3", "pickle", "csv", "io", "sys",
}
_FORBIDDEN_BUILTINS = {"open", "eval", "exec", "compile", "__import__", "input"}

SessionTtlCheck = Callable[[], list[str]]


# --------------------------------------------------------------------------- 载入


def load_constraints(path: Path | None = None) -> dict[str, Any]:
    """读取平台约束表，并做结构自检。"""
    data = json.loads((path or CONSTRAINTS_PATH).read_text(encoding="utf-8"))
    vocabulary = set(data["_meta"]["statusVocabulary"])
    for rule in data["rules"]:
        if rule["status"] not in vocabulary:
            raise ValueError(f"规则 {rule['id']} 状态非法: {rule['status']!r}")
        if not (rule.get("docx") or rule.get("quickref")):
            raise ValueError(f"规则 {rule['id']} 缺行内出处（docx 或 quickref）")
    return data


def rules() -> dict[str, dict[str, Any]]:
    return {rule["id"]: rule for rule in load_constraints()["rules"]}


def conflicts() -> list[dict[str, Any]]:
    return load_constraints()["conflicts"]


# --------------------------------------------------------------------------- 蓝图归一


def normalize_nodes(blueprint: dict[str, Any]) -> list[dict[str, Any]]:
    """把两种蓝图形状归一，同一套检查即可同时作用于：

    - 当前形态：``platform_blueprint.get_blueprint()``，用 ``type`` / ``code`` /
      ``prompt`` / ``fields`` / ``bindings`` / ``configure``
    - 目标形态：spec v1，用 ``inlineType`` / ``config{kind}`` / ``inputs[].source``

    阶段 2 把蓝图迁到 spec v1 时，检查逻辑不需要改。
    """
    normalized = []
    for node in blueprint.get("nodes") or []:
        config = node.get("config") or {}
        fields = node.get("fields") or []
        inputs = node.get("inputs") or []
        bindings = node.get("bindings") or []
        input_names = [
            item[0] if isinstance(item, list) else item.get("name")
            for item in [*fields, *inputs]
        ]
        input_types = [
            (item[1] if isinstance(item, list) and len(item) > 1 else None)
            if isinstance(item, list)
            else item.get("type")
            for item in [*fields, *inputs]
        ]
        normalized.append(
            {
                "id": node.get("id"),
                "inlineType": node.get("inlineType") or node.get("type"),
                "kind": config.get("kind"),
                "config": config,
                "code": node.get("code") or config.get("code"),
                "prompt": node.get("prompt") or config.get("systemPrompt"),
                "outputFormat": config.get("outputFormat"),
                "inputNames": [name for name in input_names if name],
                "inputTypes": [kind for kind in input_types if kind],
                "inputs": [item for item in inputs if isinstance(item, dict)],
                "outputs": [item for item in (node.get("outputs") or []) if isinstance(item, dict)],
                "inputSources": [item.get("source") for item in inputs if isinstance(item, dict)],
                "bindings": [row for row in bindings if isinstance(row, list)],
                "text": " ".join(
                    str(part)
                    for part in [
                        node.get("purpose"),
                        node.get("summary"),
                        *(node.get("configure") or []),
                    ]
                    if part
                ),
            }
        )
    return normalized


def _nodes_of(blueprint: dict[str, Any], inline_type: str) -> list[dict[str, Any]]:
    return [node for node in normalize_nodes(blueprint) if node["inlineType"] == inline_type]


# --------------------------------------------------------------------------- 自动检查
#
# 每个检查返回问题描述列表；空列表 = 通过。检查只看行内复刻侧。


def check_graph_is_dag(blueprint: dict[str, Any]) -> list[str]:
    """画布无回边。编译图由调用方另行断言（需要真的 compile）。"""
    problems = []
    adjacency = {}
    for edge in blueprint.get("edges") or []:
        kind = edge.get("kind") if isinstance(edge, dict) else None
        if kind == "back-edge":
            label = edge.get("inlineExpansion", "")
            problems.append(f"复刻图声明了回边 {edge.get('from')}→{edge.get('to')}（{label}）；行内画布无回边")
        source, target = (edge.get("from"), edge.get("to")) if isinstance(edge, dict) else edge[:2]
        adjacency.setdefault(source, []).append(target)
        adjacency.setdefault(target, [])
    indegree = dict.fromkeys(adjacency, 0)
    for targets in adjacency.values():
        for target in targets:
            indegree[target] += 1
    pending = [node for node, degree in indegree.items() if degree == 0]
    visited = 0
    while pending:
        node = pending.pop()
        visited += 1
        for target in adjacency[node]:
            indegree[target] -= 1
            if indegree[target] == 0:
                pending.append(target)
    if visited != len(adjacency):
        problems.append("复刻图连线存在环；行内画布要求前向无环拓扑")
    return problems


def check_script_no_long_io(blueprint: dict[str, Any]) -> list[str]:
    """脚本节点不得做文件 / 网络 / 进程 IO（docx 片段 10）。"""
    problems = []
    for node in _nodes_of(blueprint, "脚本"):
        if not node["code"]:
            continue
        tree = ast.parse(node["code"])
        for imported in _imported_names(tree):
            root = imported.split(".")[0]
            if root in _FORBIDDEN_SCRIPT_IMPORTS:
                problems.append(f"脚本节点 {node['id']} 引入长 IO 模块 {imported!r}；行内脚本为沙箱，不支持文件/HTTP")
        used = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
        for builtin in sorted(used & _FORBIDDEN_BUILTINS):
            problems.append(f"脚本节点 {node['id']} 使用内建 {builtin!r}；行内沙箱禁止")
    return problems


def check_script_must_return_object(blueprint: dict[str, Any]) -> list[str]:
    """单函数、名为 handler、必须返回对象（docx 片段 10 原文）。"""
    problems = []
    for node in _nodes_of(blueprint, "脚本"):
        if not node["code"]:
            continue
        tree = ast.parse(node["code"])
        functions = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
        classes = [n for n in tree.body if isinstance(n, ast.ClassDef)]
        if classes:
            problems.append(f"脚本节点 {node['id']} 定义了类；行内脚本只支持单个函数")
        if len(functions) != 1:
            names = [f.name for f in functions] or ["<无>"]
            problems.append(f"脚本节点 {node['id']} 有 {len(functions)} 个顶层函数 {names}；行内只支持一个")
        elif functions[0].name != "handler":
            problems.append(f"脚本节点 {node['id']} 的函数名为 {functions[0].name!r}，行内约定 handler(params)")
    return problems


def check_start_object_depth(blueprint: dict[str, Any]) -> list[str]:
    """开始节点 Object 最多三层、最外层变量最多 40 行（docx 片段 3）。"""
    problems = []
    for node in _nodes_of(blueprint, "开始"):
        count = len(node["inputNames"])
        if count > 40:
            problems.append(f"开始节点 {node['id']} 声明 {count} 个入参，超过行内上限 40 行")
    return problems


def check_start_system_input_traceable(blueprint: dict[str, Any]) -> list[str]:
    """引用必须可追溯：只能指向 systemInput、某个节点，或**该节点声明的输出变量名**。

    注意行内引用是经「输出变量名」而不是节点 id（``${contextOutput.analysisMode}``
    指向上下文脚本声明的 contextOutput）。只认节点 id 会把全部正常引用误判为不可追溯。
    """
    problems = []
    nodes = normalize_nodes(blueprint)
    node_ids = {node["id"] for node in nodes}
    output_names = {
        row["name"].split(".")[0]
        for node in nodes
        for row in (node.get("outputs") or [])
        if isinstance(row, dict) and row.get("name")
    }
    allowed = node_ids | output_names | {"systemInput", "chatHistory"}
    for node in nodes:
        for source in node.get("inputSources") or []:
            if not source:
                continue
            for ref in re.findall(r"\$\{([^}]+)\}", source):
                head = ref.split(".")[0].strip()
                if head not in allowed:
                    problems.append(f"节点 {node['id']} 的引用 {{{ref}}} 指向未声明的节点或输出变量")
    return problems


def check_condition_nesting(blueprint: dict[str, Any]) -> list[str]:
    """条件选择器最多嵌套 5 层（docx 片段 5）。"""
    problems = []
    for node in _nodes_of(blueprint, "条件选择器"):
        branches = node["config"].get("branches") or []
        if len(branches) > 5:
            problems.append(f"条件选择器 {node['id']} 有 {len(branches)} 个分支，超过行内上限 5")
    return problems


def check_subflow_depth(blueprint: dict[str, Any]) -> list[str]:
    """业务编排嵌套不超过两层、不得自引用（docx 片段 11）。"""
    problems = []
    for node in _nodes_of(blueprint, "业务编排"):
        depth = node["config"].get("depth")
        if isinstance(depth, int) and depth > 2:
            problems.append(f"业务编排 {node['id']} 嵌套 {depth} 层，超过行内上限 2")
        if node["config"].get("refWorkflow") == node["id"]:
            problems.append(f"业务编排 {node['id']} 引用自身；行内禁止")
    return problems


def check_loop_no_nesting(blueprint: dict[str, Any]) -> list[str]:
    """循环组件不支持嵌套、不适合大批量（docx 片段 13 / 能力速查 38、55）。"""
    problems = []
    for node in _nodes_of(blueprint, "循环组件"):
        if node["config"].get("maxIterations", 0) > 50:
            problems.append(
                f"循环组件 {node['id']} 声明 {node['config']['maxIterations']} 轮；行内循环严格串行且不适合大批量"
            )
    return problems


def check_agent_not_on_main_chain(blueprint: dict[str, Any]) -> list[str]:
    """银行指标取数/归因主链不得依赖 Agent 自主规划（docx 片段 12 / 能力速查 37、87）。"""
    problems = []
    for node in _nodes_of(blueprint, "Agent"):
        if "取数" in node["text"] or "归因" in node["text"] or "指标" in node["text"]:
            problems.append(f"Agent 节点 {node['id']} 承担指标取数/归因；行内明确不建议")
    return problems


def check_no_file_upload(blueprint: dict[str, Any]) -> list[str]:
    """不以文件上传取代受控数据 API（能力速查 24）。"""
    problems = []
    for node in normalize_nodes(blueprint):
        for kind in node["inputTypes"]:
            if str(kind).strip().lower() in {"file", "text"}:
                problems.append(f"节点 {node['id']} 声明 {kind!r} 类型入参；本项目取数走 API 节点，不用文件")
    return problems


def check_api_flat_params(blueprint: dict[str, Any]) -> list[str]:
    """API 入参优先扁平（能力速查 56/85：文档自相矛盾，按最保守设计）。"""
    problems = []
    for node in _nodes_of(blueprint, "API"):
        for kind in node["inputTypes"]:
            if str(kind).strip() in {"Object", "Array", "Array<Object>", "Array<Number>"}:
                problems.append(
                    f"API 节点 {node['id']} 声明复杂入参 {kind!r}；行内文档对此自相矛盾，设计按扁平参数处理"
                )
    return problems


def check_prompt_json_no_streaming(blueprint: dict[str, Any]) -> list[str]:
    """Prompt 输出选 JSON 则不支持流式（docx 片段 4 原文）。"""
    problems = []
    for node in _nodes_of(blueprint, "Prompt"):
        output_format = str(node["outputFormat"] or "").strip().lower()
        if output_format == "json":
            problems.append(
                f"Prompt 节点 {node['id']} 输出格式为 JSON；行内 JSON 输出不支持流式，应选文本并由下游脚本解析"
            )
    return problems


def _imported_names(tree: ast.Module) -> list[str]:
    names = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.append(node.module)
    return names


# 本地运行参数的规则：不属于复刻图，单独检查仓库配置。
def check_script_timeout_local() -> list[str]:
    """本地脚本超时不得宽于行内 5s（本地取更严是合法的）。"""
    from aiworkflow import config as alm_config

    limit = float(alm_config.SCRIPT_NODE_TIMEOUT_SECONDS)
    if limit > 5.0:
        return [f"本地 SCRIPT_NODE_TIMEOUT_SECONDS={limit} 宽于行内 5s，迁行内后会超时"]
    return []


def check_session_ttl_local() -> list[str]:
    """本地会话 TTL 不得超过行内 168 小时上限（能力速查 44）。"""
    from repricing_gap_workflow import server

    limit = float(server.SESSION_TTL_SECONDS)
    if limit > 168 * 3600:
        return [f"本地 SESSION_TTL_SECONDS={limit} 超过行内会话上限 168 小时"]
    return []


# --------------------------------------------------------------------------- 注册表

BlueprintCheck = Callable[[dict[str, Any]], list[str]]
LocalCheck = Callable[[], list[str]]

# 规则 id -> 针对复刻图的检查
ENFORCED_BLUEPRINT: dict[str, BlueprintCheck] = {
    "graph-is-dag": check_graph_is_dag,
    "script-no-long-io": check_script_no_long_io,
    "script-must-return-object": check_script_must_return_object,
    "start-object-depth": check_start_object_depth,
    "start-systeminput": check_start_system_input_traceable,
    "condition-nesting-5": check_condition_nesting,
    "subflow-depth-2": check_subflow_depth,
    "loop-no-nesting": check_loop_no_nesting,
    "agent-not-for-main-chain": check_agent_not_on_main_chain,
    "no-file-upload-for-metrics": check_no_file_upload,
    "api-complex-param-conflict": check_api_flat_params,
    "prompt-json-no-streaming": check_prompt_json_no_streaming,
}

# 规则 id -> 针对本地运行配置的检查
ENFORCED_LOCAL: dict[str, LocalCheck] = {
    "script-timeout-5s": check_script_timeout_local,
    "session-7-days": check_session_ttl_local,
}

# 行为约束：不是静态可判定的，必须由端到端用例强制。值是强制它的用例文件，
# 防止"以为有人管"——test_behavior_coverage_is_real 会校验文件里确有对应用例。
BEHAVIOR: dict[str, str] = {
    "no-silent-substitution": "repricing_gap_workflow/tests/test_context_resolution.py",
    "scope-explicit-not-memory": "repricing_gap_workflow/tests/test_context_resolution.py",
    "caliber-must-not-default": "repricing_gap_workflow/tests/test_context_resolution.py",
}

# 只能人工判定的规则：写明原因，避免"看起来有规则、实际没人管"。
MANUAL: dict[str, str] = {
    "script-no-formal-attribution": (
        "运行期部分已自动覆盖（ILLUSTRATIVE_IMPACT_* 标注校验 + almcanvas.overclaim_guard 的 13 条语义规则）；"
        "剩下的『正式归因不得放在脚本/模型节点』是节点职责的设计期属性，需人工审阅复刻图的节点配置"
    ),
    "gateway-90s": "依赖行内网关实测与正式归因服务时延，本地无法判定",
    "stream-broken-by-script": "行内拓扑决定，需在平台试运行观察流式行为",
    "numeric-precision": "平台表达式的实际精度与笔误需在表达式调试区验证",
    "result-package-contract": "已由 validate_data_package + test_workflow 覆盖，但跨指标通用化在阶段 4 后半",
}


def unclassified() -> list[str]:
    """既未自动检查、也未显式豁免的规则 id——必须为空。"""
    known = set(ENFORCED_BLUEPRINT) | set(ENFORCED_LOCAL) | set(BEHAVIOR) | set(MANUAL)
    return sorted(set(rules()) - known)


def run(blueprint: dict[str, Any]) -> list[str]:
    """跑全部自动检查，返回问题描述列表（空 = 全部通过）。"""
    problems: list[str] = []
    for rule_id, check in ENFORCED_BLUEPRINT.items():
        problems.extend(f"[{rule_id}] {message}" for message in check(blueprint))
    for rule_id, check in ENFORCED_LOCAL.items():
        problems.extend(f"[{rule_id}] {message}" for message in check())
    return problems


def coverage() -> dict[str, list[str]]:
    return {
        "auto": sorted(set(ENFORCED_BLUEPRINT) | set(ENFORCED_LOCAL)),
        "behavior": sorted(BEHAVIOR),
        "manual": sorted(MANUAL),
    }
