"""aiworkflow.rag 单元测试（知识库检索 mock 构件）。

运行：``PYTHONPATH=<仓库根> python3 -m unittest tests.test_rag -v``
"""

from __future__ import annotations

import asyncio
import json
import unittest

from aiworkflow import rag

KB = [
    {"id": 1, "content": "限额管理是指对银行风险敞口设定上限的管理流程", "source": "限额管理办法.pdf", "fileId": "f1"},
    {"id": 2, "content": "AI 智能工场支持业务编排、知识库和模型能力", "source": "平台介绍.docx", "fileId": "f2"},
    {"id": 3, "content": "预警线是限额管理中的预警阈值", "source": "限额管理办法.pdf", "folderId": "d1"},
]


def make_state():
    frames: list[str] = []

    def emit(text: str) -> None:
        frames.append(text)

    return {"session_id": "s1", "emit": emit}, frames


class RetrieveTests(unittest.TestCase):
    def test_keyword_strategy(self):
        results = rag.retrieve(KB, "限额管理", strategy="keyword", top_k=3, threshold=0.3)
        self.assertTrue(results)
        self.assertIn("content", results[0])
        self.assertNotIn("source", results[0])
        # 与 query 最相关的片段排第一
        self.assertIn("限额管理", results[0]["content"])

    def test_include_source(self):
        results = rag.retrieve(KB, "限额管理", strategy="keyword", top_k=3, threshold=0.3, include_source=True)
        self.assertIn("source", results[0])

    def test_hybrid_semantic(self):
        for strategy in ("hybrid", "semantic"):
            results = rag.retrieve(KB, "限额 管理 流程", strategy=strategy, top_k=5, threshold=0.0)
            self.assertTrue(results, strategy)

    def test_threshold_filters_all(self):
        results = rag.retrieve(KB, "完全无关的查询词组", strategy="keyword", top_k=5, threshold=0.99)
        self.assertEqual(results, [])

    def test_top_k_limits_results(self):
        results = rag.retrieve(KB, "限额", strategy="keyword", top_k=1, threshold=0.0)
        self.assertEqual(len(results), 1)

    def test_file_filter(self):
        results = rag.retrieve(KB, "智能工场", strategy="keyword", top_k=5, threshold=0.0, file_ids=["f2"])
        self.assertTrue(all("智能工场" in r["content"] or r["content"] for r in results))
        self.assertEqual(len(results), 1)

    def test_invalid_strategy(self):
        with self.assertRaises(ValueError):
            rag.retrieve(KB, "q", strategy="nope")


class RagNodeTests(unittest.TestCase):
    def test_node_outputs_array_and_stage(self):
        node = rag.make_rag_node("kb_search", KB, lambda s: s["query"], output_name="kb_result", include_source=True)
        state, frames = make_state()
        state["query"] = "限额管理"
        result = asyncio.run(node(state))
        self.assertIsInstance(result["kb_result"], list)
        self.assertIn("content", result["kb_result"][0])
        stage = json.loads(frames[0][5:])["data"]
        self.assertEqual(stage["nodeType"], "rag")
        self.assertEqual(stage["payload"]["count"], len(result["kb_result"]))


if __name__ == "__main__":
    unittest.main()
