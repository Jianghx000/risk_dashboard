"""指标工作流通用层。

与 ``aiworkflow`` 的分工：``aiworkflow`` 是行内平台构件（脚本/API/Prompt/条件
选择器工厂、SSE 帧、装配期检查），与共享包 ``01-ai-workflow-service`` 逐字一致，
不承载本项目的规则；``almcanvas`` 承载本项目的**平台边界**与一致性套件。
"""

from __future__ import annotations

__all__ = ["constraints"]
