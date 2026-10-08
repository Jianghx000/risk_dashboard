"""aiworkflow.llm.parse_json 单元测试（内容块形态兼容）。

运行：``PYTHONPATH=<仓库根> python3 -m unittest tests.test_llm -v``
"""

from __future__ import annotations

import json
import unittest

from aiworkflow import llm


class TestParseJson(unittest.TestCase):
    def test_plain_object(self) -> None:
        self.assertEqual(llm.parse_json('{"a": 1}'), {"a": 1})

    def test_code_fence(self) -> None:
        self.assertEqual(llm.parse_json('```json\n{"a": 1}\n```'), {"a": 1})

    def test_text_content_block(self) -> None:
        """推理网关把输出包成内容块列表时，取唯一 text 块二次解析。"""
        wrapped = json.dumps([{"type": "text", "text": json.dumps({"headline": "h", "sections": [1]})}])
        parsed = llm.parse_json(wrapped)
        self.assertEqual(parsed, {"headline": "h", "sections": [1]})

    def test_unextractable_list_passthrough(self) -> None:
        """无法提取唯一 text 块时原样返回 list，交由 schema 门禁报差异。"""
        raw = json.dumps([{"type": "image", "url": "x"}])
        self.assertEqual(llm.parse_json(raw), [{"type": "image", "url": "x"}])


if __name__ == "__main__":
    unittest.main()
