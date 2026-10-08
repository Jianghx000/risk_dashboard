"""通用配置：env 加载与三档多模型 LLM profile（模拟行内"优先小模型"治理形态）。

优先级：os.environ 中已有的值优先；可选通过环境变量 ``ENV_FILE`` 指向一个
``.env`` 文件（KEY=VALUE 逐行的手写解析），仅对 os.environ 中尚不存在的键生效。
密钥只经环境变量或 .env 注入，绝不写入任何被 git 跟踪的文件。

三档 profile 约定（low/mid/high，工作流节点默认 low，特殊节点显式用 mid/high）：

    LLM_<TIER>_API               # 网关地址（openai 兼容 base url）
    LLM_<TIER>_API_KEY           # 密钥
    LLM_<TIER>_MODEL             # 模型名（低档必配；无内置默认，不隐式假定任何厂商）
    LLM_<TIER>_TEMPERATURE       # 选填，默认 0.1
    LLM_<TIER>_TIMEOUT_SECONDS   # 选填，默认 120

继承链（逐字段独立回退，取第一个非空值）：

    LLM_HIGH_*  →  LLM_MID_*  →  LLM_LOW_*  →  legacy DEEPSEEK_*
    LLM_MID_*   →  LLM_LOW_*  →  legacy DEEPSEEK_*
    LLM_LOW_*   →  legacy DEEPSEEK_*
    语义名（如 narrative）→ LLM_LOW_* → legacy DEEPSEEK_*   # 可选高级用法

中/高档未配置的字段落低档：人工配置只需确保低档可用；声明用 mid/high 的节点
不因未配置而失败，实际解析结果经 ``/healthz`` 的 ``llmProfiles`` 摘要可见
（避免"以为用了高档实际落低档"的误判）。legacy ``DEEPSEEK_API_KEY`` /
``DEEPSEEK_BASE_URL`` / ``DEEPSEEK_MODEL`` / ``LLM_TEMPERATURE`` /
``LLM_TIMEOUT_SECONDS`` 仅作为链尾过渡兼容，不是推荐写法。

运行期重定向（调试换模型，不改配置）：

    LLM_PROFILE_OVERRIDE=<name>   # 全局：所有节点统一切到 name（优先级最高）
    LLM_PROFILE_<NAME>=<other>    # 逐节点：名为 NAME 的节点实际读 other 的配置

profile 名不区分大小写（内部统一小写）；模型名保持 env 原样（大小写敏感，
如 qwen3.7-flash 必须小写）。``"default"`` 是 ``"low"`` 的兼容别名。
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

# ---- .env 文件加载（ENV_FILE 可选） ----


def load_env_file(path: Path) -> dict[str, str]:
    """解析 KEY=VALUE 逐行格式的 env 文件；忽略空行、注释行与无等号行。"""
    result: dict[str, str] = {}
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return result
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            result[key] = value
    return result


def apply_env_file() -> None:
    env_file = os.environ.get("ENV_FILE")
    if not env_file:
        return
    for key, value in load_env_file(Path(env_file)).items():
        # os.environ 已有的值优先，env 文件只补缺。
        os.environ.setdefault(key, value)


apply_env_file()


def _env(key: str, default: Optional[str] = None) -> Optional[str]:
    value = os.environ.get(key)
    if value is None or value == "":
        return default
    return value


def env(key: str, default: Optional[str] = None) -> Optional[str]:
    """读 env（供业务 app 配置复用同一加载约定）。"""
    return _env(key, default)


# ---- 三档档位 ----

TIERS: tuple[str, ...] = ("low", "mid", "high")
DEFAULT_TIER = "low"
# 兼容别名："default" 在解析时映射为低档（框架内部不再使用 default 概念）。
_LEGACY_NAME_ALIASES = {"default": DEFAULT_TIER}


# ---- 通用开关与运行参数 ----

# 允许通过 __fault=down 与 inputs.fault 注入故障（演示与验收用）；行内部署置 false。
ALLOW_FAULT_INJECTION: bool = (_env("ALLOW_FAULT_INJECTION", "true") or "true").lower() != "false"

# 工具节点对本服务（或真实上游）的 base URL：默认指向本机 9019；一键脚本按
# 实际端口注入，消除"端口非 9019 时须手动带 MOCK_API_BASE_URL"的坑。
MOCK_API_BASE_URL: str = _env("MOCK_API_BASE_URL", "http://127.0.0.1:9019") or "http://127.0.0.1:9019"

# 工具节点：失败重试次数与单次超时。
TOOL_RETRY_TIMES: int = int(_env("TOOL_RETRY_TIMES", "1") or "1")
TOOL_TIMEOUT_SECONDS: float = float(_env("TOOL_TIMEOUT_SECONDS", "10") or "10")

# 脚本节点超时（对齐行内沙箱约束 3 秒；本地计算复杂时可经 env 放宽）。
SCRIPT_NODE_TIMEOUT_SECONDS: float = float(_env("SCRIPT_NODE_TIMEOUT_SECONDS", "3.0") or "3.0")

# SSE：15 秒无事件发一次 heartbeat。
HEARTBEAT_INTERVAL_SECONDS: float = float(_env("HEARTBEAT_INTERVAL_SECONDS", "15") or "15")

# langgraph 递归上限（图执行层数保险丝）。
RECURSION_LIMIT: int = int(_env("RECURSION_LIMIT", "50") or "50")


# ---- LLM profile ----


@dataclass(frozen=True)
class LLMProfile:
    """一个可被节点按名引用的模型配置（解析链收敛后的最终值）。"""

    name: str
    api_key: str
    base_url: str
    model: str
    temperature: float
    timeout_seconds: float


def _resolve_llm_profile_name(name: str) -> str:
    """应用两级重定向与别名：LLM_PROFILE_OVERRIDE > LLM_PROFILE_<NAME> > 别名。"""
    override = _env("LLM_PROFILE_OVERRIDE")
    if override:
        resolved = override.strip().lower()
    else:
        redirect = _env(f"LLM_PROFILE_{name.upper()}")
        resolved = (redirect or name).strip().lower()
    return _LEGACY_NAME_ALIASES.get(resolved, resolved)


def _tier_chain(name: str) -> list[str]:
    """解析链（不含 legacy 层）：从当前档逐级向下回退；语义名落到低档。"""
    if name in TIERS:
        index = TIERS.index(name)
        return list(reversed(TIERS[: index + 1]))
    return [name, DEFAULT_TIER]


def resolve_profile(name: str = DEFAULT_TIER) -> LLMProfile:
    """按名解析 LLM profile；逐字段沿继承链取第一个非空值。

    model 无内置兜底（不隐式假定任何厂商），整条链未配置时为空串，
    由 ``aiworkflow.llm.LLMClient`` 在构造时报清晰错误。
    """
    resolved = _resolve_llm_profile_name(name)
    chain = [key.upper() for key in _tier_chain(resolved)]

    def _lookup(suffix: str, legacy_key: Optional[str] = None) -> Optional[str]:
        for tier in chain:
            value = _env(f"LLM_{tier}_{suffix}")
            if value:
                return value
        return _env(legacy_key) if legacy_key else None

    api_key = _lookup("API_KEY", "DEEPSEEK_API_KEY")
    base_url = _lookup("API", "DEEPSEEK_BASE_URL")
    model = _lookup("MODEL", "DEEPSEEK_MODEL")
    temperature = _lookup("TEMPERATURE", "LLM_TEMPERATURE")
    timeout = _lookup("TIMEOUT_SECONDS", "LLM_TIMEOUT_SECONDS")

    return LLMProfile(
        name=resolved,
        api_key=api_key or "",
        base_url=base_url or "https://api.deepseek.com",  # legacy 行为兜底，仅影响连接目标
        model=model or "",
        temperature=float(temperature or "0.1"),
        timeout_seconds=float(timeout or "120"),
    )


def profile_missing_env(name: str, field: str = "api_key") -> str:
    """给出配置某个 profile 所需的最小 env 变量名（用于清晰报错）。"""
    resolved = _resolve_llm_profile_name(name)
    chain = [key.upper() for key in _tier_chain(resolved)]
    if field == "model":
        primary = f"LLM_{chain[0]}_MODEL"
        return f"{primary}（或 legacy DEEPSEEK_MODEL）"
    primary = f"LLM_{chain[0]}_API_KEY"
    return f"{primary}（或 legacy DEEPSEEK_API_KEY）"


def available_profiles() -> list[str]:
    """扫描 env 中已配置密钥的 profile 名（不含重定向；legacy 归入低档）。"""
    names: set[str] = set()
    if _env("DEEPSEEK_API_KEY"):
        names.add(DEFAULT_TIER)
    for key in os.environ:
        if key.startswith("LLM_") and key.endswith("_API_KEY"):
            middle = key[len("LLM_") : -len("_API_KEY")]
            if middle and not middle.startswith("PROFILE"):
                resolved = _LEGACY_NAME_ALIASES.get(middle.lower(), middle.lower())
                names.add(resolved)
    return sorted(names)


def profiles_summary() -> dict[str, dict[str, object]]:
    """三档解析摘要（healthz 用）：各档实际解析到的模型与配置就绪状态。

    dedicated = 是否存在该档的专属 env（LLM_<TIER>_*，不含重定向变量）；
    keyReady / modelSet = 解析链收敛后密钥与模型名是否就绪。
    不含任何密钥值。
    """
    summary: dict[str, dict[str, object]] = {}
    for tier in TIERS:
        profile = resolve_profile(tier)
        prefix = f"LLM_{tier.upper()}_"
        dedicated = any(
            key.startswith(prefix) for key in os.environ if not key.startswith("LLM_PROFILE")
        )
        summary[tier] = {
            "model": profile.model or None,
            "dedicated": dedicated,
            "keyReady": bool(profile.api_key),
            "modelSet": bool(profile.model),
        }
    return summary
