"""aiworkflow：本地 AI 工作流基础设施。

把 limit-workflow-service 中验证过的"受控解读"工程范式抽为通用骨架：

- ``config``：env 加载 + 多模型 profile（节点级模型选择）；
- ``llm``：openai 兼容客户端（流式、JSON mode 自动降级、退避重试）；
- ``sse`` / ``runner``：SSE 事件封装与 FastAPI 装配（heartbeat、queue）；
- ``mockapi``：行内形态 mock 上游 API 构件（token 校验、returnCode 包裹、故障注入）；
- ``tools``：HTTP 工具节点构件（重试、ToolResult）；
- ``validate``：通用校验器（点分路径数值回填 + schema 骨架）；
- ``graph_kit``：受控叙事工作流构件（LLM 节点、校验门禁、降级路由）；
- ``acceptance``：验收框架（SSE 解析、断言助手、汇总退出码）。

已吸收进 ``risk_dashboard/AI编排``。业务工作流是 ``repricing_gap_workflow``，不要再去限额样例里找节点实现。
"""

from aiworkflow import config

__version__ = "0.1.0"

__all__ = ["config", "__version__"]
