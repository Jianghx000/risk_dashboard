"""行内 RAG 节点构件（知识库检索的本地 mock 形态，docs/platform-contract.md 第 9 节）。

行内 RAG 节点的编排侧契约：选择知识库（可多个）、配置检索策略（混合=ES 与
向量化并行、关键字=仅 ES、语义=仅向量化）、最大召回段落数、总召回片段阈值、
是否返回知识来源；输入为 query，输出为数组（元素含 content）。

本地没有 ES 与向量库，检索打分为纯词法模拟：

- ``keyword``：query 分词后在片段中的命中率（模拟 ES 关键字检索）；
- ``semantic``：字符二元组 Jaccard 相似度（模拟向量召回）；
- ``hybrid``：两者取最大（模拟并行检索合并重排）。

分数连续性、排序与阈值语义与行内一致，分值本身不与行内对齐（接入时替换
``retrieve`` 的打分实现即可，节点契约不变）。知识库为 JSON 文件：片段数组
``[{id, content, source?, folderId?, fileId?}]``。
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional

from aiworkflow import sse

NODE_TYPE_RAG = "rag"

STRATEGIES = ("hybrid", "keyword", "semantic")

NodeFn = Callable[[dict], Awaitable[dict]]


def load_kb(path: Path) -> list[dict[str, Any]]:
    """读知识库 JSON 文件（片段数组）。"""
    with Path(path).open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if isinstance(data, dict):
        data = data.get("body", [])
    if not isinstance(data, list):
        raise ValueError(f"知识库文件须为片段数组: {path}")
    return data


def _terms(query: str) -> list[str]:
    """极简分词：连续中文按 2 字滑窗、英文数字按词，供关键字命中统计。"""
    text = str(query)
    terms: list[str] = []
    for token in re.findall(r"[A-Za-z0-9]+|[\u4e00-\u9fff]+", text):
        if token.isascii():
            terms.append(token.lower())
        elif len(token) == 1:
            terms.append(token)
        else:
            terms.extend(token[i : i + 2] for i in range(len(token) - 1))
    return terms or [text]


def _bigrams(text: str) -> set[str]:
    return {text[i : i + 2] for i in range(len(text) - 1)}


def _keyword_score(terms: list[str], content: str) -> float:
    if not terms:
        return 0.0
    return sum(1 for term in set(terms) if term in content) / len(set(terms))


def _semantic_score(query: str, content: str) -> float:
    a, b = _bigrams(str(query)), _bigrams(content)
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def retrieve(
    kb: list[dict[str, Any]],
    query: str,
    *,
    strategy: str = "hybrid",
    top_k: int = 5,
    threshold: float = 0.3,
    include_source: bool = False,
    file_ids: Optional[list[Any]] = None,
    folder_ids: Optional[list[Any]] = None,
) -> list[dict[str, Any]]:
    """检索知识库：过滤 → 打分 → 阈值 → 排序取 top_k；输出元素含 content（含来源可选）。"""
    if strategy not in STRATEGIES:
        raise ValueError(f"检索策略须为 {'/'.join(STRATEGIES)}，收到 {strategy!r}")
    candidates = kb
    if file_ids is not None:
        candidates = [c for c in candidates if c.get("fileId") in file_ids]
    if folder_ids is not None:
        candidates = [c for c in candidates if c.get("folderId") in folder_ids]
    terms = _terms(query)
    scored: list[tuple[float, dict[str, Any]]] = []
    for chunk in candidates:
        content = str(chunk.get("content", ""))
        if strategy == "keyword":
            score = _keyword_score(terms, content)
        elif strategy == "semantic":
            score = _semantic_score(query, content)
        else:
            score = max(_keyword_score(terms, content), _semantic_score(query, content))
        if score >= threshold:
            scored.append((score, chunk))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    results: list[dict[str, Any]] = []
    for score, chunk in scored[: max(top_k, 0)]:
        item: dict[str, Any] = {"content": chunk.get("content", "")}
        if include_source and chunk.get("source"):
            item["source"] = chunk["source"]
        results.append(item)
    return results


def make_rag_node(
    name: str,
    kb: list[dict[str, Any]],
    query_fn: Callable[[dict], str],
    *,
    output_name: str,
    strategy: str = "hybrid",
    top_k: int = 5,
    threshold: float = 0.3,
    include_source: bool = False,
) -> NodeFn:
    """行内 RAG 节点：检索知识库，输出为数组（写入 output_name），并发 STAGE 帧记录召回数。"""

    async def node(state: dict) -> dict:
        query = query_fn(state)
        results = retrieve(
            kb, str(query), strategy=strategy, top_k=top_k, threshold=threshold, include_source=include_source,
        )
        state["emit"](
            sse.stage(name, "知识库检索完成", {"query": str(query), "count": len(results), "strategy": strategy},
                      node_type=NODE_TYPE_RAG, session_id=state.get("session_id"))
        )
        return {output_name: results}

    return node
