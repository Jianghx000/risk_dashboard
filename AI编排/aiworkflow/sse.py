"""SSE 流式帧封装（对齐行内 AI 智能工场流式输出契约）。

行内帧形态（无 ``event:`` 行，每帧类型由 JSON 内 ``type`` 字段区分，紧凑 JSON）：

    data:{"returnCode":"SUC0000","errorMsg":null,"data":{...},"sessionId":"...","type":"DATA"}

type 全集（行内标准 DATA/DONE + 本地扩展 START/STAGE/ERROR/HEARTBEAT，见
docs/platform-contract.md 第 3 与第 12 节）：

- ``DATA``：流式数据帧，本地承载 Prompt 文本增量（``data.output``）；
- ``DONE``：尾帧，``data`` 为结束节点声明的最终输出对象；
- ``START`` / ``STAGE`` / ``ERROR`` / ``HEARTBEAT``：本地扩展（过程可见性与调试），
  迁移时由中间信息输出节点等行内机制替代。

``session_id`` 缺省 None 时输出 ``"sessionId":null``（与行内示例一致）；服务装配方
经 state 传递 runId 以贯穿一次运行。错误码约定：SUC0000 成功、ERR9999 系统异常
（ERROR 帧）、ERR4010 认证失败、ERR1001 参数非法（HTTP 层，见 aiworkflow.params）。
"""

from __future__ import annotations

import json
from typing import Any, Optional

# 行内标准帧 type
TYPE_DATA = "DATA"
TYPE_DONE = "DONE"
# 本地扩展帧 type（行内不存在）
TYPE_START = "START"
TYPE_STAGE = "STAGE"
TYPE_ERROR = "ERROR"
TYPE_HEARTBEAT = "HEARTBEAT"

RETURN_OK = "SUC0000"
RETURN_ERROR = "ERR9999"


def format_frame(
    frame_type: str,
    data: Any = None,
    session_id: Optional[str] = None,
    return_code: str = RETURN_OK,
    error_msg: Optional[str] = None,
) -> str:
    """一行行内形态 SSE 帧：紧凑 JSON，``data:`` 前缀，空行结尾。"""
    frame = {
        "returnCode": return_code,
        "errorMsg": error_msg,
        "data": data,
        "sessionId": session_id,
        "type": frame_type,
    }
    return f"data:{json.dumps(frame, ensure_ascii=False, separators=(',', ':'))}\n\n"


def start(run_id: str, mode: str, data_date: Optional[str], version: str = "") -> str:
    """START 帧（本地扩展，等价原 workflow_started）：宣告一次运行开始。"""
    return format_frame(
        TYPE_START,
        {"runId": run_id, "mode": mode, "version": version, "dataDate": data_date},
        session_id=run_id,
    )


def stage(
    node: str,
    label: str,
    payload: Any = None,
    node_type: Optional[str] = None,
    session_id: Optional[str] = None,
) -> str:
    """STAGE 帧（本地扩展）：节点过程事件，node 为图内节点名，nodeType 为行内节点类型。"""
    return format_frame(
        TYPE_STAGE,
        {"node": node, "label": label, "nodeType": node_type, "payload": payload},
        session_id=session_id,
    )


def text_chunk(delta: str, session_id: Optional[str] = None) -> str:
    """DATA 帧：Prompt 流式文本增量（行内标准帧；增量字段 data.output 为本地约定）。"""
    return format_frame(TYPE_DATA, {"output": delta}, session_id=session_id)


def heartbeat(session_id: Optional[str] = None) -> str:
    return format_frame(TYPE_HEARTBEAT, None, session_id=session_id)


def done(data: dict[str, Any], session_id: Optional[str] = None) -> str:
    """DONE 帧（行内标准）：data 为结束节点声明的最终输出对象（end_assembler 装配）。"""
    return format_frame(TYPE_DONE, data, session_id=session_id)


def workflow_error(
    error_code: str,
    retryable: bool,
    message: str,
    session_id: Optional[str] = None,
) -> str:
    """ERROR 帧（本地扩展）：帧级 returnCode=ERR9999，业务错误码在 data.errorCode。"""
    return format_frame(
        TYPE_ERROR,
        {"errorCode": error_code, "retryable": retryable, "message": message},
        session_id=session_id,
        return_code=RETURN_ERROR,
        error_msg=message,
    )
