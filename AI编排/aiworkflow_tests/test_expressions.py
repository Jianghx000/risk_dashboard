"""aiworkflow.expressions 单元测试（行内函数表达式构件）。

运行：``PYTHONPATH=<仓库根> python3 -m unittest tests.test_expressions -v``
"""

from __future__ import annotations

import unittest
from datetime import datetime

from aiworkflow import expressions as expr


class ArithTests(unittest.TestCase):
    def test_basic_functions(self):
        self.assertEqual(expr.evaluate_function("SUM", 1, 2, 3, 4), 10)
        self.assertEqual(expr.evaluate_function("SUBTRACT", 9, 8, 2), -1)
        self.assertEqual(expr.evaluate_function("MULTIPLY", 1, 2, 3), 6)
        self.assertEqual(expr.evaluate_function("AVERAGE", 1, 3, 5), 3)
        self.assertEqual(expr.evaluate_function("MAX", 1, 3, 5), 5)
        self.assertEqual(expr.evaluate_function("MIN", 1, 3, 5), 1)
        self.assertEqual(expr.evaluate_function("ABS", -12), 12)

    def test_divide_truncates_9_decimals(self):
        # 行内约定：小数结果超过 9 位截断（非四舍五入）
        self.assertEqual(expr.evaluate_function("DIVIDE", 10, 3), 3.333333333)
        self.assertEqual(expr.evaluate_function("DIVIDE", 10, 2), 5)

    def test_safe_integer_limit(self):
        with self.assertRaises(ValueError):
            expr.evaluate_function("MULTIPLY", 10**30, 10)

    def test_mod_int_truncates_decimals(self):
        self.assertEqual(expr.evaluate_function("MOD", 5, 2), 1)
        self.assertEqual(expr.evaluate_function("MOD", 5, 3), 2)

    def test_int_round_tfixed(self):
        self.assertEqual(expr.evaluate_function("INT", 4.2), 4)
        self.assertEqual(expr.evaluate_function("INT", -8.3), -8)
        self.assertEqual(expr.evaluate_function("ROUND", 4.6), 5)
        self.assertEqual(expr.evaluate_function("TFIXED", 3.14159, 2), 3.14)

    def test_rand_within_bounds(self):
        for _ in range(20):
            self.assertTrue(0 <= expr.evaluate_function("RAND", 10) < 10)
            self.assertTrue(-10 < expr.evaluate_function("RAND", -10) <= 0)


class DateTests(unittest.TestCase):
    def test_timestamp_roundtrip(self):
        ts = expr.evaluate_function("TIMESTAMP", "2023-05-04 10:34:33")
        self.assertIsInstance(ts, int)
        self.assertEqual(expr.evaluate_function("YEAR", ts), 2023)
        self.assertEqual(expr.evaluate_function("MONTH", ts), 5)
        self.assertEqual(expr.evaluate_function("DAY", ts), 4)
        self.assertEqual(expr.evaluate_function("HOUR", ts), 10)
        self.assertEqual(expr.evaluate_function("DATE", ts), "2023-05-04")

    def test_slash_format(self):
        self.assertEqual(expr.evaluate_function("DATE", "2023/05/04"), "2023-05-04")

    def test_dateformat(self):
        result = expr.evaluate_function("DATEFORMAT", "2023/05/04 10:58:12", "yyyy/MM/dd HH:mm:ss", "yyyy-MM-dd HH:mm:ss")
        self.assertEqual(result, "2023-05-04 10:58:12")

    def test_datemodify_days(self):
        self.assertEqual(expr.evaluate_function("DATEMODIFY", "2024-02-22", -2, "days"), "2024-02-20")
        self.assertEqual(expr.evaluate_function("DATEMODIFY", "2024-02-22", -2, "日"), "2024-02-20")

    def test_datemodify_month_end_clamp(self):
        self.assertEqual(expr.evaluate_function("DATEMODIFY", "2024-01-31", 1, "months"), "2024-02-29")

    def test_today_and_now(self):
        self.assertRegex(expr.evaluate_function("TODAY"), r"^\d{4}-\d{2}-\d{2}$")
        self.assertIsInstance(expr.evaluate_function("NOW"), int)


class TextTests(unittest.TestCase):
    def test_len_ignores_edge_spaces(self):
        self.assertEqual(expr.evaluate_function("LEN", "  hello  "), 5)
        self.assertEqual(expr.evaluate_function("LEN", [1, 2, 3]), 3)

    def test_text_transforms(self):
        self.assertEqual(expr.evaluate_function("CONCATENATE", "Hello", ",", "World!"), "Hello,World!")
        self.assertEqual(expr.evaluate_function("LOWER", "Hello World!"), "hello world!")
        self.assertEqual(expr.evaluate_function("UPPER", "Hello World!"), "HELLO WORLD!")
        self.assertEqual(expr.evaluate_function("TRIM", "  Hello World!  "), "Hello World!")
        self.assertTrue(expr.evaluate_function("STARTSWITH", "hello", "he"))
        self.assertTrue(expr.evaluate_function("ENDSWITH", "hello", "lo"))
        self.assertTrue(expr.evaluate_function("ISEMPTY", "  "))
        self.assertFalse(expr.evaluate_function("ISEMPTY", "x"))


class ArrayObjectTests(unittest.TestCase):
    def test_join_split_contains(self):
        self.assertEqual(expr.evaluate_function("JOIN", ["a", "b", "c"], "-"), "a-b-c")
        self.assertEqual(expr.evaluate_function("JOIN", ["a", "b", "c"]), "a,b,c")
        self.assertEqual(expr.evaluate_function("SPLIT", "a-b-c", "-"), ["a", "b", "c"])
        self.assertTrue(expr.evaluate_function("CONTAINS", [1, 2, 3], 2))

    def test_pick_omit(self):
        obj = {"id": 1, "name": "Pair", "password": "x", "website": "y"}
        self.assertEqual(expr.evaluate_function("PICK", obj, "name", "role"), {"name": "Pair"})
        self.assertEqual(
            expr.evaluate_function("OMIT", obj, "password", "website"),
            {"id": 1, "name": "Pair"},
        )


class LogicTests(unittest.TestCase):
    def test_and_or_not_xor_if(self):
        self.assertTrue(expr.evaluate_function("AND", True, 1 < 2))
        self.assertFalse(expr.evaluate_function("OR", False, 1 > 2))
        self.assertFalse(expr.evaluate_function("NOT", 1))
        self.assertFalse(expr.evaluate_function("XOR", True, True))
        self.assertTrue(expr.evaluate_function("XOR", True, True, True))
        self.assertEqual(expr.evaluate_function("IF", 1 < 2, "ok", "no"), "ok")

    def test_compare_with_numeric_strings(self):
        self.assertTrue(expr.evaluate_function("GE", "2", "1"))
        self.assertFalse(expr.evaluate_function("LT", "2", "1"))


class CryptoConvertTests(unittest.TestCase):
    def test_base64_roundtrip(self):
        encoded = expr.evaluate_function("BASE64ENCODE", "hello")
        self.assertEqual(encoded, "aGVsbG8=")
        self.assertEqual(expr.evaluate_function("BASE64DECODE", encoded), "hello")

    def test_type_conversion(self):
        self.assertTrue(expr.evaluate_function("TOBOOLEAN", "true"))
        self.assertEqual(expr.evaluate_function("TOJSONSTRING", {"a": 1}), '{"a":1}')
        self.assertEqual(expr.evaluate_function("TOOBJECT", '{"field1":11,"field2":22}'), {"field1": 11, "field2": 22})


class DesensitizeTests(unittest.TestCase):
    def test_name(self):
        self.assertEqual(expr.evaluate_function("DESENSITIZE", "NAME", "王雅婷"), "王**")

    def test_mobile(self):
        self.assertEqual(expr.evaluate_function("DESENSITIZE", "MOBILE_PHONE", "13812341234"), "138****1234")

    def test_email(self):
        self.assertEqual(expr.evaluate_function("DESENSITIZE", "EMAIL", "zhangsan@gmail.com"), "z*******@gmail.com")

    def test_bank_card(self):
        self.assertEqual(expr.evaluate_function("DESENSITIZE", "BANK_CARD", "6225880137852506"), "6225********2506")

    def test_unknown_rule(self):
        with self.assertRaises(ValueError):
            expr.evaluate_function("DESENSITIZE", "NO_SUCH_RULE", "x")


class ExpressionEvalTests(unittest.TestCase):
    def test_refs_and_operators(self):
        variables = {"开始": {"numbers": {"number1": 1, "number2": 2}}}
        self.assertEqual(
            expr.evaluate_expression("SUM(${开始/numbers/number1}, ${开始/numbers/number2})", variables), 3
        )
        self.assertEqual(expr.evaluate_expression("${开始/numbers/number1} + ${开始/numbers/number2}", variables), 3)
        self.assertEqual(expr.evaluate_expression("10 / 3", {}), 3.333333333)
        self.assertTrue(expr.evaluate_expression("1 < 5 && 2 < 6", {}))
        self.assertFalse(expr.evaluate_expression("!(1 < 2)", {}))
        self.assertTrue(expr.evaluate_expression("1 < 5 || 2 > 6", {}))

    def test_dot_path_and_nested(self):
        variables = {"page": {"items": [{"name": "a"}, {"name": "b"}]}}
        self.assertEqual(expr.evaluate_expression("${page.items.1.name}", variables), "b")

    def test_function_in_expression(self):
        self.assertEqual(expr.evaluate_expression("CONCATENATE('a', '-', 'b')", {}), "a-b")
        self.assertEqual(
            expr.evaluate_expression("IF(SUM(1, 2) > 2, 'big', 'small')", {}),
            "big",
        )

    def test_rejects_arbitrary_code(self):
        with self.assertRaises(ValueError):
            expr.evaluate_expression("__import__('os').system('ls')", {})
        with self.assertRaises(ValueError):
            expr.evaluate_expression("().__class__", {})
        with self.assertRaises(ValueError):
            expr.evaluate_expression("unknown_fn(1)", {})

    def test_unresolvable_ref(self):
        with self.assertRaises(KeyError):
            expr.evaluate_expression("${no/such/path}", {})


class ResolveRefsTests(unittest.TestCase):
    def test_whole_ref_keeps_type(self):
        variables = {"view": {"a": 1}, "flags": ["X"]}
        self.assertEqual(expr.resolve_refs("${view}", variables), {"a": 1})
        self.assertEqual(expr.resolve_refs({"out": "${flags}"}, variables), {"out": ["X"]})

    def test_embedded_ref_stringifies(self):
        variables = {"name": "限额", "n": 5}
        self.assertEqual(expr.resolve_refs("指标 ${name} 共 ${n} 项", variables), "指标 限额 共 5 项")


if __name__ == "__main__":
    unittest.main()
