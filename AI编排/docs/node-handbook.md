# 重定价缺口率工作流节点手册

面向「亲自读懂每个节点」：行内复刻图 10 个节点的职责、输入输出和失败走向。契约以 `AI编排/行内平台契约.md` 为准；可粘贴配置以 `AI编排/metrics/repricing_gap/blueprint.spec.json` 为准；运行期实现在 `repricing_gap_workflow/workflow.py`。

本仓库没有 `apps/limit`。限额样例在共享包里，不要按那个路径改本试点。

## 三张观察面

1. **行内复刻图**（给人看）：`http://127.0.0.1:9028/workflow`，只展示平台节点。双击项目根目录 `打开行内复刻图.bat`。
2. **编译拓扑**（给 AI 核对）：`GET /v1/canvas-spec` 的 `runtime` 段，来自 `graph.get_graph()`。
3. **一次运行**（给 AI 调试）：`POST /v1/workflows/run`、`POST /v1/workflows/stream`，以及 `pytest AI编排/repricing_gap_workflow/tests`。

页面不跑工作流、不画 LangGraph 执行图。

## 平台节点（照图建站）

主路径：开始 → 校验并识别问题 → 获取本次指标分析数据 → 校验结果包 → 生成指标解释 → 核对引用和数字 → 条件选择器 → 结束。校验未过则前向走到「修正指标解释 → 复核 → 结束」，没有回边。

| id | 行内类型 | 做什么 |
|---|---|---|
| start | 开始 | 扁平入参：指标/机构/币种/期限/日期/问题。追问带 sessionId 与 lastBusinessType，仍从这里进。 |
| context | 脚本 | 校验范围；关键词分类。未识别返回 `clarification`，不得默默改成 overview。 |
| api | API | 一次 POST 只取当前模式的小结果包。 |
| package | 脚本 | 核对范围、状态、版本、体积。不合格中断，不调模型。 |
| prompt | Prompt | 只依据结果包写 JSON 文案。 |
| answer | 脚本 | 引用路径与数字回填；演示归因必须标明演示。 |
| retry_gate | 条件选择器 | 通过或已降级 → 结束；校验未过 → 再生成一次。 |
| regenerate | Prompt | 按差异清单修正文案，只一次。 |
| retry_check | 脚本 | 复核。仍失败则清空文案并打降级标记。 |
| __end__ | 结束 | 输出 analysisMode、resultPackage、narrative、degradeFlags。 |

底部绿色虚线是追问再触发（结束 → 再从开始），不是编译边，行内画布不要画成回边。

## 运行期节点（LangGraph）

`resolve_context → classify_question → fetch_alm_data → validate_data_package → generate_narrative → validate_output`，失败则 `regenerate_narrative → validate_retry`。平台 `context` 对应 `resolve_context + classify_question`；`retry_gate` 在本地是 `validate_output` 上的条件边。

`classify()` 不命中返回 `None`，路由成 `clarification`。复刻图 `handler` 必须同一套规则，测试在 `tests/test_spec_integrity.py`。

## 怎么验收

```powershell
$env:PYTHONPATH = "$PWD\AI编排"
.\.venv-ai\Scripts\python.exe -m pytest .\AI编排\repricing_gap_workflow\tests -q
.\.venv-ai\Scripts\python.exe -m repricing_gap_workflow.quality_eval
```

抓一次运行：`POST /v1/workflows/run`，看 `analysisMode`、`resultPackage`、`narrative`、`degradeFlags`。未识别问法（例如「帮我看看这个指标最近什么情况」）必须是 `clarification`，正文不报具体数字。
