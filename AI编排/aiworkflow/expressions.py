"""行内函数表达式构件（对齐 docs/platform-contract.md 第 10 节的函数清单）。

两部分能力：

1. **函数注册表**（``evaluate_function`` / ``REGISTRY``）：行内函数表达式的
   函数族全量实现——计算、日期、文本、数组、对象、逻辑、加密、类型转换、
   脱敏。计算语义对齐行内约定：小数结果超过 9 位截断（DIVIDE(10,3) =
   3.333333333）、数值不超过 2^53-1、可转为数字的字符串参与运算。

2. **表达式求值**（``evaluate_expression``）：解析行内表达式语法并安全求值，
   支持 ``${路径}`` 变量引用（``/`` 或 ``.`` 分隔）、注册函数调用与运算符
   （``+ - * / > >= < <= == != && || !``）。基于 ast 白名单遍历实现，不使用
   eval，任意代码不可执行。

脱敏规则的行内细则在原文档中部分不可辨读，本实现按常见规则假定（各规则的
保留位数见 ``DESENSITIZE_RULES`` 注释），接入行内时以平台细则为准。
"""

from __future__ import annotations

import ast
import base64
import json
import math
import random
import re
import time
from calendar import monthrange
from datetime import datetime, timedelta
from typing import Any, Callable

# 行内安全数值上限（2^53-1）
MAX_SAFE_NUMBER = 9007199254740991
# 行内约定：小数结果最多保留 9 位（截断）
MAX_DECIMALS = 9

REGISTRY: dict[str, Callable[..., Any]] = {}

_REF_RE = re.compile(r"\$\{([^}]+)\}")
_AND_OR_RE = re.compile(r"&&|\|\|")
_BANG_RE = re.compile(r"!(?!=)")


# ---------------------------------------------------------------------------
# 注册机制
# ---------------------------------------------------------------------------


def register(name: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    def deco(fn: Callable[..., Any]) -> Callable[..., Any]:
        REGISTRY[name.upper()] = fn
        return fn

    return deco


def evaluate_function(name: str, *args: Any) -> Any:
    """按名调用注册的行内函数；未知函数名报错（错误信息带可用清单）。"""
    fn = REGISTRY.get(name.upper())
    if fn is None:
        raise ValueError(f"未知函数表达式: {name}（可用: {', '.join(sorted(REGISTRY))}）")
    return fn(*args)


# ---------------------------------------------------------------------------
# 数值辅助（行内计算约定）
# ---------------------------------------------------------------------------


def _to_num(value: Any) -> float:
    """可转为数字的字符串参与运算；布尔按 0/1；其余报错。"""
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            pass
    raise TypeError(f"无法转为数字: {value!r}")


def _trim9(value: float) -> float:
    """截断到小数点后 9 位（行内约定"截取"，非四舍五入），并做安全整数校验。"""
    if not math.isfinite(value):
        raise ValueError(f"计算结果非有限数: {value}")
    if abs(value) > MAX_SAFE_NUMBER:
        raise ValueError(f"计算结果超过行内安全整数上限 2^53-1: {value}")
    scaled = value * (10**MAX_DECIMALS)
    # 修正浮点表示误差（如 300000000.00000003）
    if abs(scaled - round(scaled)) < 1e-3:
        scaled = round(scaled)
    return int(scaled) / (10**MAX_DECIMALS)


def _arith(left: Any, op: Callable[[float, float], float], right: Any) -> Any:
    a, b = _to_num(left), _to_num(right)
    result = op(a, b)
    if isinstance(left, int) and isinstance(right, int) and not isinstance(op, float):
        return int(result)
    return _trim9(result)


def _round_half_away(value: float, digits: int = 0) -> float:
    """四舍五入（.5 远离零），行内 ROUND/TFIXED 语义。"""
    factor = 10**digits
    scaled = value * factor
    rounded = math.floor(scaled + 0.5) if scaled >= 0 else math.ceil(scaled - 0.5)
    return rounded / factor


# ---------------------------------------------------------------------------
# 计算函数（13 个）
# ---------------------------------------------------------------------------


@register("SUM")
def _sum(*args: Any) -> Any:
    _require(args, 2)
    return _reduce_all(args, lambda a, b: a + b)


@register("SUBTRACT")
def _subtract(*args: Any) -> Any:
    _require(args, 2)
    return _reduce_all(args, lambda a, b: a - b)


@register("MULTIPLY")
def _multiply(*args: Any) -> Any:
    _require(args, 2)
    return _reduce_all(args, lambda a, b: a * b)


@register("DIVIDE")
def _divide(*args: Any) -> Any:
    _require(args, 2)
    result = _to_num(args[0])
    for value in args[1:]:
        divisor = _to_num(value)
        if divisor == 0:
            raise ZeroDivisionError("DIVIDE 除数为 0")
        result /= divisor
    return _trim9(result)


@register("AVERAGE")
def _average(*args: Any) -> Any:
    _require(args, 2)
    return _trim9(sum(_to_num(a) for a in args) / len(args))


@register("MAX")
def _max(*args: Any) -> Any:
    _require(args, 2)
    return max(args, key=_to_num)


@register("MIN")
def _min(*args: Any) -> Any:
    _require(args, 2)
    return min(args, key=_to_num)


@register("ABS")
def _abs(value: Any) -> Any:
    num = _to_num(value)
    return abs(int(num)) if isinstance(value, int) else _trim9(abs(num))


@register("RAND")
def _rand(value: Any) -> int:
    bound = int(_to_num(value))
    if bound == 0:
        return 0
    if bound > 0:
        return random.randint(0, bound - 1)
    return random.randint(bound + 1, 0)


@register("MOD")
def _mod(value: Any, divisor: Any) -> int:
    a, b = int(_to_num(value)), int(_to_num(divisor))
    if b == 0:
        raise ZeroDivisionError("MOD 除数为 0")
    return a % b


@register("INT")
def _int(value: Any) -> int:
    return int(_to_num(value))  # 向零取整：INT(-8.3) = -8


@register("ROUND")
def _round(value: Any) -> Any:
    num = _to_num(value)
    return int(_round_half_away(num)) if isinstance(value, int) else _round_half_away(num)


@register("TFIXED")
def _tfixed(value: Any, digits: Any = 0) -> float:
    return _round_half_away(_to_num(value), int(_to_num(digits)))


def _require(args: tuple, minimum: int) -> None:
    if len(args) < minimum:
        raise TypeError(f"参数个数不足：至少 {minimum} 个，收到 {len(args)}")


def _reduce_all(args: tuple, op: Callable[[float, float], float]) -> Any:
    if any(isinstance(a, float) for a in args):
        result = _to_num(args[0])
        for value in args[1:]:
            result = op(result, _to_num(value))
        return _trim9(result)
    result = int(args[0])
    for value in args[1:]:
        result = int(op(result, _to_num(value)))
        if abs(result) > MAX_SAFE_NUMBER:
            raise ValueError(f"计算结果超过行内安全整数上限 2^53-1: {result}")
    return result


# ---------------------------------------------------------------------------
# 日期函数（12 个）
# ---------------------------------------------------------------------------

_DATE_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d",
    "%Y/%m/%d %H:%M:%S",
    "%Y/%m/%d",
)
_JAVA_TOKENS = (("yyyy", "%Y"), ("MM", "%m"), ("dd", "%d"), ("HH", "%H"), ("mm", "%M"), ("ss", "%S"))


def _to_datetime(value: Any) -> datetime:
    """日期入参兼容：日期对象、毫秒时间戳、行内支持的日期字符串格式。"""
    if isinstance(value, datetime):
        return value
    if isinstance(value, bool):
        raise TypeError(f"无法转为日期: {value!r}")
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000)
    text = str(value).strip()
    if text.isdigit():
        return datetime.fromtimestamp(int(text) / 1000)
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    raise ValueError(f"无法解析日期: {value!r}（支持 {', '.join(_DATE_FORMATS)} 或毫秒时间戳）")


def _java_to_strftime(template: str) -> str:
    result = template
    for token, directive in _JAVA_TOKENS:
        result = result.replace(token, directive)
    return result


@register("NOW")
def _now() -> int:
    return int(time.time() * 1000)  # 毫秒时间戳


@register("DATE")
def _date(value: Any) -> str:
    return _to_datetime(value).strftime("%Y-%m-%d")


@register("TIMESTAMP")
def _timestamp(value: Any) -> int:
    return int(_to_datetime(value).timestamp() * 1000)


@register("YEAR")
def _year(value: Any) -> int:
    return _to_datetime(value).year


@register("MONTH")
def _month(value: Any) -> int:
    return _to_datetime(value).month


@register("DAY")
def _day(value: Any) -> int:
    return _to_datetime(value).day


@register("HOUR")
def _hour(value: Any) -> int:
    return _to_datetime(value).hour


@register("MINUTE")
def _minute(value: Any) -> int:
    return _to_datetime(value).minute


@register("SECOND")
def _second(value: Any) -> int:
    return _to_datetime(value).second


@register("TODAY")
def _today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


@register("DATEFORMAT")
def _dateformat(origin: Any, origin_template: Any, target_template: Any) -> str:
    """三参形态：源日期串、源格式模板、目标格式模板；源模板解析失败时按内置格式自动尝试。"""
    parsed: datetime | None = None
    if origin_template:
        try:
            parsed = datetime.strptime(str(origin).strip(), _java_to_strftime(str(origin_template)))
        except ValueError:
            parsed = None
    if parsed is None:
        parsed = _to_datetime(origin)
    return parsed.strftime(_java_to_strftime(str(target_template)))


@register("DATEMODIFY")
def _datemodify(value: Any, num: Any, unit: str) -> str:
    """日期加减；unit 支持 years/quarters/months/weeks/days/hours/minutes/seconds 及中文 年/季/月/周/日/时/分/秒。"""
    parsed = _to_datetime(value)
    amount = int(_to_num(num))
    unit_map = {
        "年": "years", "季": "quarters", "月": "months", "周": "weeks",
        "日": "days", "天": "days", "时": "hours", "分": "minutes", "秒": "seconds",
        "year": "years", "quarter": "quarters", "month": "months", "week": "weeks",
        "day": "days", "hour": "hours", "minute": "minutes", "second": "seconds",
    }
    key = str(unit).strip().lower()
    key = unit_map.get(key, key)
    if key in ("years", "months"):
        # 逐月推算并钳制到月末（如 1 月 31 日 + 1 月 → 2 月末）
        months = amount * (12 if key == "years" else 1)
        total = parsed.year * 12 + (parsed.month - 1) + months
        year, month = divmod(total, 12)
        month += 1
        day = min(parsed.day, monthrange(year, month)[1])
        parsed = parsed.replace(year=year, month=month, day=day)
    elif key == "quarters":
        return _datemodify(parsed, amount * 3, "months")
    elif key == "weeks":
        parsed = parsed + timedelta(weeks=amount)
    elif key == "days":
        parsed = parsed + timedelta(days=amount)
    elif key == "hours":
        parsed = parsed + timedelta(hours=amount)
    elif key == "minutes":
        parsed = parsed + timedelta(minutes=amount)
    elif key == "seconds":
        parsed = parsed + timedelta(seconds=amount)
    else:
        raise ValueError(f"DATEMODIFY 不支持的单位: {unit!r}")
    if isinstance(value, str) and len(str(value).strip()) == 10:
        return parsed.strftime("%Y-%m-%d")
    return parsed.strftime("%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# 文本函数（8 个）
# ---------------------------------------------------------------------------


@register("LEN")
def _len(value: Any) -> int:
    if isinstance(value, (list, tuple, dict)):
        return len(value)
    if not isinstance(value, str):
        value = "" if value is None else str(value)
    return len(value.strip())  # 行内约定：前后空格不计数


@register("ISEMPTY")
def _isempty(value: Any) -> bool:
    if isinstance(value, str):
        return value.strip() == ""  # 行内约定：字符串前后空格将被过滤
    return value is None or value == "" or value == [] or value == {}


@register("CONCATENATE")
def _concatenate(*args: Any) -> str:
    _require(args, 2)
    return "".join("" if a is None else str(a) for a in args)


@register("LOWER")
def _lower(value: Any) -> str:
    return str(value).lower()


@register("UPPER")
def _upper(value: Any) -> str:
    return str(value).upper()


@register("TRIM")
def _trim(value: Any) -> str:
    return str(value).strip()


@register("STARTSWITH")
def _startswith(text: Any, target: Any) -> bool:
    return str(text).startswith(str(target))


@register("ENDSWITH")
def _endswith(text: Any, target: Any) -> bool:
    return str(text).endswith(str(target))


# ---------------------------------------------------------------------------
# 数组 / 对象函数
# ---------------------------------------------------------------------------


@register("JOIN")
def _join(arr: Any, separator: Any = ",") -> str:
    if not isinstance(arr, (list, tuple)):
        raise TypeError(f"JOIN 入参须为数组: {arr!r}")
    return str(separator).join("" if item is None else str(item) for item in arr)


@register("SPLIT")
def _split(text: Any, separator: Any) -> list[str]:
    return str(text).split(str(separator))


@register("CONTAINS")
def _contains(haystack: Any, needle: Any) -> bool:
    if isinstance(haystack, (list, tuple)):
        return needle in haystack
    if isinstance(haystack, str):
        return str(needle) in haystack
    raise TypeError(f"CONTAINS 入参须为数组或字符串: {haystack!r}")


@register("PICK")
def _pick(obj: Any, *keys: Any) -> dict:
    _require_dict(obj, "PICK")
    return {k: obj[k] for k in keys if k in obj}


@register("OMIT")
def _omit(obj: Any, *keys: Any) -> dict:
    _require_dict(obj, "OMIT")
    return {k: v for k, v in obj.items() if k not in keys}


def _require_dict(obj: Any, fn: str) -> None:
    if not isinstance(obj, dict):
        raise TypeError(f"{fn} 入参须为对象: {obj!r}")


# ---------------------------------------------------------------------------
# 逻辑函数（9 个）
# ---------------------------------------------------------------------------


@register("AND")
def _and(*args: Any) -> bool:
    _require(args, 2)
    return all(bool(a) for a in args)


@register("OR")
def _or(*args: Any) -> bool:
    _require(args, 2)
    return any(bool(a) for a in args)


@register("NOT")
def _not(value: Any) -> bool:
    return not bool(value)


@register("IF")
def _if(condition: Any, consequent: Any, alternate: Any) -> Any:
    return consequent if bool(condition) else alternate


@register("GE")
def _ge(a: Any, b: Any) -> bool:
    return _to_num(a) >= _to_num(b)


@register("LE")
def _le(a: Any, b: Any) -> bool:
    return _to_num(a) <= _to_num(b)


@register("GT")
def _gt(a: Any, b: Any) -> bool:
    return _to_num(a) > _to_num(b)


@register("LT")
def _lt(a: Any, b: Any) -> bool:
    return _to_num(a) < _to_num(b)


@register("XOR")
def _xor(*args: Any) -> bool:
    _require(args, 2)
    return sum(1 for a in args if bool(a)) % 2 == 1


# ---------------------------------------------------------------------------
# 加密 / 类型转换
# ---------------------------------------------------------------------------


@register("BASE64ENCODE")
def _base64encode(value: Any) -> str:
    if isinstance(value, bool):
        raw = "true" if value else "false"
    elif isinstance(value, (int, float)):
        raw = str(value)
    else:
        raw = str(value)
    return base64.b64encode(raw.encode("utf-8")).decode("ascii")


@register("BASE64DECODE")
def _base64decode(value: Any) -> str:
    return base64.b64decode(str(value)).decode("utf-8")


@register("TOBOOLEAN")
def _toboolean(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text == "true":
        return True
    if text == "false":
        return False
    raise ValueError(f"TOBOOLEAN 无法转换: {value!r}（仅支持 true/false）")


@register("TOJSONSTRING")
def _tojsonstring(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


@register("TOOBJECT")
def _toobject(value: Any) -> Any:
    return json.loads(str(value))


# ---------------------------------------------------------------------------
# 脱敏（DESENSITIZE；保留位数按常见规则假定，行内细则以平台为准）
# ---------------------------------------------------------------------------

_MASK_KEEP_EDGES_RULES = {
    # 规则码: (保留前 n 位, 保留后 m 位)
    "NAME": (1, 0),        # 姓名：仅显示姓
    "ID_CARD": (1, 1),     # 身份证号：仅显示第 1 位和最后 1 位
    "BANK_CARD": (4, 4),   # 银行卡号：前 4 后 4
    "MOBILE_PHONE": (3, 4),  # 手机号：前 3 后 4
    "FIXED_PHONE": (4, 4),   # 固话：前 4 后 4（保留区号形态）
    "PASSPORT_NO": (1, 1),
    "MILITARY_ID_NO": (2, 1),
    "FOREIGNER_ID_CARD_NO": (3, 2),
    "UNIFIED_SOCIAL_CREDIT_CODE_NO": (4, 4),
    "MAINLAND_TRAVEL_CARD_ID_NO_FOR_HK_AND_MO": (1, 1),
    "MAINLAND_TRAVEL_CARD_ID_NO_FOR_TW": (1, 1),
    "HK_AND_MO_TRAVEL_PERMIT_CARD_ID_NO": (1, 1),
    "TW_TRAVEL_PERMIT_CARD_ID_NO": (1, 1),
}


def _mask_keep_edges(value: str, head: int, tail: int) -> str:
    if len(value) <= head + tail:
        return "*" * len(value)
    return value[:head] + "*" * (len(value) - head - tail) + (value[len(value) - tail:] if tail else "")


@register("DESENSITIZE")
def _desensitize(rule: str, value: Any) -> str:
    """按行内脱敏规则码处理字符串；规则码清单见 docs/platform-contract.md 第 10 节。"""
    text = "" if value is None else str(value)
    code = str(rule).strip().upper()
    if code == "EMAIL":
        if "@" not in text:
            raise ValueError("EMAIL 脱敏规则要求入参含 @")
        local, _, domain = text.partition("@")
        masked_local = (local[:1] + "*" * max(len(local) - 1, 0)) if local else ""
        return f"{masked_local}@{domain}"
    if code == "ADDRESS":
        return text[:6] + "*" * max(len(text) - 6, 0)  # 保留省市区前 6 字符
    if code == "COMPANY_NAME":
        return text[:4] + "*" * max(len(text) - 4, 0)  # 保留前 4 字符
    if code == "EXPIRATION_TIME":
        return text[:2] + "*" * max(len(text) - 2, 0)  # 保留前 2 位（月）
    edges = _MASK_KEEP_EDGES_RULES.get(code)
    if edges is None:
        raise ValueError(
            f"未知脱敏规则码: {rule!r}（可用: {', '.join(sorted(set(_MASK_KEEP_EDGES_RULES) | {'EMAIL', 'ADDRESS', 'COMPANY_NAME', 'EXPIRATION_TIME'}))}）"
        )
    return _mask_keep_edges(text, *edges)


# ---------------------------------------------------------------------------
# 表达式求值（${引用} + 函数 + 运算符；ast 白名单，不用 eval）
# ---------------------------------------------------------------------------

_ALLOWED_NODES = (
    ast.Expression, ast.BinOp, ast.UnaryOp, ast.Call, ast.Name, ast.Load, ast.Constant,
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.USub, ast.Not,
    ast.Compare, ast.Lt, ast.Gt, ast.LtE, ast.GtE, ast.Eq, ast.NotEq,
    ast.BoolOp, ast.And, ast.Or,
)
_MAX_EXPR_LENGTH = 4096


def lookup_path(variables: Any, path: str) -> Any:
    """按 ``/`` 或 ``.`` 分隔的路径取变量值（数组用数字下标）；不可解析报 KeyError。"""
    current: Any = variables
    for part in re.split(r"[/\.]", path.strip()):
        if isinstance(current, dict) and part in current:
            current = current[part]
        elif isinstance(current, (list, tuple)) and part.isdigit():
            index = int(part)
            if index >= len(current):
                raise KeyError(f"引用越界: {path}[{index}]")
            current = current[index]
        else:
            raise KeyError(f"引用不可解析: {path}")
    return current


def resolve_refs(value: Any, variables: Any) -> Any:
    """递归解析模板中的 ``${路径}`` 引用（结束节点"自定义"输出形态）。

    整串恰为一个引用时返回原类型值；串内嵌引用时做字符串拼接；dict/list 逐层
    解析。
    """
    if isinstance(value, str):
        whole = _REF_RE.fullmatch(value.strip())
        if whole:
            return lookup_path(variables, whole.group(1))
        return _REF_RE.sub(lambda m: _to_text(lookup_path(variables, m.group(1))), value)
    if isinstance(value, dict):
        return {k: resolve_refs(v, variables) for k, v in value.items()}
    if isinstance(value, list):
        return [resolve_refs(item, variables) for item in value]
    return value


def _to_text(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def evaluate_expression(expression: str, variables: Any) -> Any:
    """求值一条行内函数表达式。

    支持 ``${路径}`` 引用、注册函数调用（``SUM(${a}, 2)``）与运算符（数值与
    比较逻辑，``&&``/``||``/``!`` 自动转换）。白名单外语法一律拒绝。
    """
    if not isinstance(expression, str) or not expression.strip():
        raise ValueError("表达式须为非空字符串")
    if len(expression) > _MAX_EXPR_LENGTH:
        raise ValueError(f"表达式超长（>{_MAX_EXPR_LENGTH} 字符）")

    bindings: dict[str, Any] = {}

    def _bind(match: re.Match) -> str:
        name = f"__ref_{len(bindings)}__"
        bindings[name] = lookup_path(variables, match.group(1))
        return name

    source = _REF_RE.sub(_bind, expression)
    source = _AND_OR_RE.sub(lambda m: " and " if m.group(0) == "&&" else " or ", source)
    source = _BANG_RE.sub(" not ", source)

    try:
        tree = ast.parse(source.strip(), mode="eval")
    except SyntaxError as exc:
        raise ValueError(f"表达式语法非法: {expression!r}") from exc
    _check_whitelist(tree)
    return _eval_node(tree.body, bindings)


def _check_whitelist(node: ast.AST) -> None:
    if not isinstance(node, _ALLOWED_NODES):
        raise ValueError(f"表达式包含不允许的语法: {ast.dump(node)[:80]}")
    for child in ast.iter_child_nodes(node):
        _check_whitelist(child)


def _eval_node(node: ast.AST, bindings: dict[str, Any]) -> Any:
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        if node.id not in bindings:
            raise ValueError(f"表达式含未绑定标识符: {node.id}")
        return bindings[node.id]
    if isinstance(node, ast.BinOp):
        left, right = _eval_node(node.left, bindings), _eval_node(node.right, bindings)
        if isinstance(node.op, ast.Add):
            if isinstance(left, str) or isinstance(right, str):
                return _to_text(left) + _to_text(right)
            return _arith(left, lambda a, b: a + b, right)
        if isinstance(node.op, ast.Sub):
            return _arith(left, lambda a, b: a - b, right)
        if isinstance(node.op, ast.Mult):
            return _arith(left, lambda a, b: a * b, right)
        if isinstance(node.op, ast.Div):
            divisor = _to_num(right)
            if divisor == 0:
                raise ZeroDivisionError("表达式除数为 0")
            return _trim9(_to_num(left) / divisor)
        raise ValueError("表达式包含不允许的运算符")
    if isinstance(node, ast.UnaryOp):
        if isinstance(node.op, ast.Not):
            return not bool(_eval_node(node.operand, bindings))
        if isinstance(node.op, ast.USub):
            value = _to_num(_eval_node(node.operand, bindings))
            return -int(value) if float(value).is_integer() else -value
        raise ValueError("表达式包含不允许的一元运算符")
    if isinstance(node, ast.Compare):
        if len(node.ops) != 1:
            raise ValueError("不支持链式比较")
        left, right = _eval_node(node.left, bindings), _eval_node(node.comparators[0], bindings)
        if isinstance(node.ops[0], ast.Lt):
            return _to_num(left) < _to_num(right)
        if isinstance(node.ops[0], ast.Gt):
            return _to_num(left) > _to_num(right)
        if isinstance(node.ops[0], ast.LtE):
            return _to_num(left) <= _to_num(right)
        if isinstance(node.ops[0], ast.GtE):
            return _to_num(left) >= _to_num(right)
        if isinstance(node.ops[0], ast.Eq):
            return left == right
        if isinstance(node.ops[0], ast.NotEq):
            return left != right
        raise ValueError("表达式包含不允许的比较运算符")
    if isinstance(node, ast.BoolOp):
        values = [bool(_eval_node(v, bindings)) for v in node.values]
        return all(values) if isinstance(node.op, ast.And) else any(values)
    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name):
            raise ValueError("函数调用目标须为注册函数名")
        if node.keywords:
            raise ValueError("函数调用不支持关键字参数")
        args = [_eval_node(a, bindings) for a in node.args]
        return evaluate_function(node.func.id, *args)
    raise ValueError(f"表达式包含不允许的语法: {type(node).__name__}")
