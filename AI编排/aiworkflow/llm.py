"""openai 兼容 LLM 客户端（按 profile 取模型；原 app/llm.py 的通用化）。

- AsyncOpenAI 直连，base_url 指向任一 openai 兼容网关（DeepSeek 官方、行内网关、
  本地代理均可）；
- 流式输出：token 逐段经 ``on_delta`` 回调推给 SSE ``DATA`` 帧；
- 结构化输出：优先 ``response_format={"type": "json_object"}``；若该模型报不支持
  （400 类错误），自动降级为纯 prompt 约束并重试一次，解析时剥 Markdown 代码栅栏；
- 温度与超时取自 profile；节点级高级参数（对齐行内 Prompt/Agent 节点的
  temperature/topP/maxToken/seed/frequencyPenalty/presencePenalty）经 ``LLMParams``
  透传，None 字段不覆盖 profile 默认；重试策略由调用方控制（客户端层
  max_retries=0，``stream_json_with_retry`` 提供退避重试）。
"""

from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Optional

import httpx
from openai import AsyncOpenAI

from aiworkflow import config

_json_fence_re = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$")


@dataclass(frozen=True)
class LLMParams:
    """节点级模型高级参数（对齐行内 Prompt/Agent 节点高级参数面；None = 不覆盖 profile）。"""

    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    seed: Optional[int] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None


def get_client(profile_name: str = "default") -> "LLMClient":
    """按 profile 名取客户端；env 重定向（LLM_PROFILE_*）在解析时生效。"""
    return LLMClient(config.resolve_profile(profile_name))


def strip_code_fence(text: str) -> str:
    """剥 Markdown 代码栅栏，取出 JSON 主体（降级模式的解析容错）。"""
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = _json_fence_re.sub("", stripped).strip()
    # 容错：截取首个 { 到最后一个 } 之间的内容。
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start >= 0 and end > start:
        return stripped[start : end + 1]
    return stripped


def parse_json(text: str) -> Any:
    """解析模型输出为 JSON；兼容推理网关的内容块形态。

    先按原文直接解析（模型输出本就是纯 JSON 的常规路径，也保住数组形态），
    失败再剥代码栅栏/前后杂文重试。部分网关把推理模型输出包成内容块列表
    （``[{"type":"text","text":"{...}"}]``），解析出 list 时取唯一的 text 块
    二次解析；提取不出则原样返回，由下游 schema 门禁报差异（降级路径的判定依据）。
    """
    try:
        parsed = json.loads(text)
    except ValueError:
        parsed = json.loads(strip_code_fence(text))
    if isinstance(parsed, list):
        texts = [
            block.get("text")
            for block in parsed
            if isinstance(block, dict) and block.get("type") == "text" and isinstance(block.get("text"), str)
        ]
        if len(texts) == 1:
            return json.loads(strip_code_fence(texts[0]))
    return parsed


class LLMClient:
    """绑定单个 profile 的流式 JSON 客户端。"""

    def __init__(self, profile: config.LLMProfile) -> None:
        self.profile = profile
        if not profile.api_key:
            raise RuntimeError(
                f"LLM profile '{profile.name}' 未配置 API key："
                f"请设置 {config.profile_missing_env(profile.name, 'api_key')}"
            )
        if not profile.model:
            # 模型名无内置兜底（不隐式假定任何厂商），须显式配置。
            raise RuntimeError(
                f"LLM profile '{profile.name}' 未配置模型名："
                f"请设置 {config.profile_missing_env(profile.name, 'model')}（每档模型须显式配置）"
            )

    def _client(self) -> AsyncOpenAI:
        # trust_env=False：LLM 网关直连，不经系统 HTTP 代理（代理会导致间歇性连接失败）。
        return AsyncOpenAI(
            api_key=self.profile.api_key,
            base_url=self.profile.base_url,
            timeout=self.profile.timeout_seconds,
            max_retries=0,  # 重试策略由调用层控制（重试 1 次语义）
            http_client=httpx.AsyncClient(trust_env=False, timeout=self.profile.timeout_seconds),
        )

    async def stream_json(
        self,
        system_prompt: str,
        user_content: str,
        on_delta: Optional[Callable[[str], Awaitable[None]]] = None,
        params: Optional[LLMParams] = None,
    ) -> str:
        """流式生成 JSON 文本并返回完整文本；``response_format`` 不支持时自动降级。

        ``params`` 为节点级高级参数（行内 Prompt/Agent 节点参数面），None 字段
        不覆盖 profile 默认值。
        """
        client = self._client()
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]
        try:
            return await self._stream_once(client, messages, use_json_mode=True, on_delta=on_delta, params=params)
        except Exception as exc:  # noqa: BLE001 - 需要按错误形态判断是否为 json_object 不支持
            message = str(exc)
            if "response_format" in message or "json_object" in message:
                # 模型不支持 JSON mode：降级为纯 prompt 约束（提示词已含 Schema 与"不输出多余文字"）。
                return await self._stream_once(client, messages, use_json_mode=False, on_delta=on_delta, params=params)
            raise

    async def stream_json_with_retry(
        self,
        system_prompt: str,
        user_content: str,
        on_delta: Optional[Callable[[str], Awaitable[None]]] = None,
        attempts: int = 3,
        params: Optional[LLMParams] = None,
    ) -> str:
        """流式生成 + 退避重试（吸收瞬时 429 限流与连接抖动；graph 层语义为"重试后仍失败才降级"）。

        注意：重试会导致 DATA 文本增量从头重推（打字机区域可能重复），前端最终渲染以
        DONE 帧携带的结构化 JSON 为准，不影响正确性。
        """
        last_exc: Optional[Exception] = None
        for attempt in range(attempts):
            try:
                return await self.stream_json(system_prompt, user_content, on_delta, params=params)
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                if attempt < attempts - 1:
                    await asyncio.sleep(3.0 * (attempt + 1))  # 3s / 6s 退避
        assert last_exc is not None
        raise last_exc

    async def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        params: Optional[LLMParams] = None,
    ) -> Any:
        """非流式对话（可带 function call 工具）；返回 assistant 消息对象。

        供 Agent 节点使用；``tools`` 为 openai function 形态的 schema 清单。
        """
        client = self._client()
        p = params or LLMParams()
        kwargs: dict[str, Any] = {
            "model": self.profile.model,
            "messages": messages,
            "temperature": p.temperature if p.temperature is not None else self.profile.temperature,
        }
        if tools:
            kwargs["tools"] = tools
        response = await client.chat.completions.create(**kwargs)
        return response.choices[0].message

    async def _stream_once(
        self,
        client: AsyncOpenAI,
        messages: list[dict[str, str]],
        use_json_mode: bool,
        on_delta: Optional[Callable[[str], Awaitable[None]]],
        params: Optional[LLMParams] = None,
    ) -> str:
        p = params or LLMParams()
        kwargs: dict[str, Any] = {
            "model": self.profile.model,
            "messages": messages,
            "temperature": p.temperature if p.temperature is not None else self.profile.temperature,
            "stream": True,
        }
        if p.top_p is not None:
            kwargs["top_p"] = p.top_p
        if p.max_tokens is not None:
            kwargs["max_tokens"] = p.max_tokens
        if p.seed is not None:
            kwargs["seed"] = p.seed
        if p.frequency_penalty is not None:
            kwargs["frequency_penalty"] = p.frequency_penalty
        if p.presence_penalty is not None:
            kwargs["presence_penalty"] = p.presence_penalty
        if use_json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        stream = await client.chat.completions.create(**kwargs)
        chunks: list[str] = []
        async for event in stream:
            if not event.choices:
                continue
            delta = event.choices[0].delta
            content = getattr(delta, "content", None)
            if content:
                chunks.append(content)
                if on_delta is not None:
                    await on_delta(content)
        return "".join(chunks)
