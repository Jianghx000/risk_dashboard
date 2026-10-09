# 重定价缺口率工作流节点手册

面向「亲自读懂每个节点」：行内复刻图 16 个节点的职责、输入输出和失败走向。契约以 `AI编排/行内平台契约.md` 为准；可粘贴配置以 `AI编排/metrics/repricing_gap/blueprint.spec.json` 为准；运行期实现在 `repricing_gap_workflow/workflow.py`。

本仓库没有 `apps/limit`。限额样例在共享包里，不要按那个路径改本试点。

## 先区分几类参数

- `asOfDate` 是分析当期，`baseDate` 是比较基期。更换基期不改变当期；没有指定或继承基期时使用上一可比较期。
- `currencyCode` 是页面币种，`focusCurrencyCode` 是本轮关注币种。页面选人民币、追问美元时，只改变关注币种，不改变页面筛选。
- `resultPackage` 是检查通过的数据包，`narrativeRaw` 是模型尚未检查的答案，`narrative` 才是可展示的文案。文案为 `null` 时不展示 AI 解释，但数据包仍可保留。
- `validationErrors` 是答案检查发现的问题。第一次非空触发一次修正；第二次仍非空就停止生成。
- `analysisMode` 是主要分析类型，不是排他选项。`dataNeeds` 是脚本识别出的本轮分析清单，如限额、趋势、归因三项；API 一次取回，复合结果在 `analyses` 下。不需要用户逐项选择或新增多个 API 节点。
- `intentRaw` 是问题识别模型给出的候选 JSON；八类 0/1 标签只在内部使用。脚本校验后才生成正式请求，不把模型输出直接当 API 参数。结构校验不能证明语义一定正确。
- `chatHistory` 是平台保存的历次输入和最终输出；上下文脚本只从最新最终输出提取 `conversationState`。它保存已确认的关注币种、基期等，不让模型从历史正文重新猜测，不把历史再嵌入回答。

## 三张观察面

1. **行内复刻图**（给人看）：`http://127.0.0.1:9028/workflow`，只展示平台节点。双击项目根目录 `打开行内复刻图.bat`。
2. **规格与拓扑**（给 AI 核对）：复刻图服务的 `GET /v1/canvas-spec` 返回画布规格；业务服务另提供运行拓扑信息，不要将两种服务混为一谈。
3. **一次运行**（给 AI 调试）：`POST /v1/workflows/run`、`POST /v1/workflows/stream`，以及 `pytest AI编排/repricing_gap_workflow/tests`。

页面不跑工作流、不画 LangGraph 执行图。

## 平台节点（照图建站）

主路径：开始 → 校验范围与整理指代 → 是否识别追问 → 识别 Prompt 和类型校验（或直接整理）→ 是否需要查询数据 → API 或本地说明 → 校验结果包 → 生成指标解释 → 核对引用和数字 → 是否修正文案 → 结束。未通过则前向走「修正 → 复核 → 结束」，没有回边。

| id | 行内类型 | 做什么 |
|---|---|---|
| start | 开始 | 六项常规字段和可选 options；不要求页面传 conversationState。 |
| context | 脚本 | 独立引用系统 chatHistory，解析最新最终输出的状态，再校验页面范围与指代；历史无法恢复时澄清。 |
| intent_gate | 条件选择器 | 首次空问题或显式指定类型跳过识别；其他追问交小模型。 |
| direct | 脚本 | 默认或显式请求直接整理为 contextOutput。 |
| intent_prompt | Prompt | qwen3.8-27b 给出八类0/1候选，识别独立子问题和否定表达，不取业务数据。 |
| intent_check | 脚本 | 校验候选结构、主要类型、币种和业务对象，整理 dataNeeds；不确定、异常或超过四类先澄清。 |
| data_gate | 条件选择器 | 需要业务数据才走 API；澄清或试点不支持的口径走本地说明。 |
| local | 脚本 | 生成澄清或不支持结果，没有业务数值，不访问 API。 |
| api | API | 一次 POST 按 dataNeeds 取所需小结果，单一或复合问题都只有一个 API 节点。 |
| package | 脚本 | 核对范围、状态、版本、体积。不合格中断，不调模型。 |
| prompt | Prompt | 只依据结果包写 JSON 文案。 |
| answer | 脚本 | 检查答案格式、引用、数字、复合问题漏答和业务说法越界；各币种独立核验。演示归因不能写成正式归因。 |
| retry_gate | 条件选择器 | 检查问题清单是否为空。为空就结束；不为空就修正一次。 |
| regenerate | Prompt | 使用同一数据包和原问题，告诉模型上次哪里不对，让它重新写一次，不重新取数。 |
| retry_check | 脚本 | 检查第二份答案。仍失败则文案设为 null，返回问题清单和 LIVE_MODEL_OUTPUT_INVALID，不再重试。 |
| __end__ | 结束 | 返回分析模式、数据、文案、检查结果和 conversationState；平台历史保存这份最终输出，下一轮脚本恢复状态。 |

底部绿色虚线是追问再触发（结束 → 再从开始），不是编译边，行内画布不要画成回边。

## 运行期节点（LangGraph）

现在 LangGraph 与复刻图使用同一份节点定义。脚本执行定义中的代码，Prompt 使用定义中的提示词，条件节点按定义选择分支。旧版将“校验并识别问题”拆成两个本地节点的说明已不适用。

无法识别问题时选择 `clarification`，请用户补充，不猜测答案。本地接口、模型连接和会话存储由适配层提供；试运行历史格式已经行内验证，正式 OpenAPI 会话接入、脚本沙箱及重试前后同名变量仍需联调。

## 怎么验收

```powershell
$env:PYTHONPATH = "$PWD\AI编排"
.\.venv-ai\Scripts\python.exe -m pytest .\AI编排\repricing_gap_workflow\tests -q
.\.venv-ai\Scripts\python.exe -m repricing_gap_workflow.quality_eval
```

抓一次运行：`POST /v1/workflows/run`，看 `analysisMode`、`resultPackage`、`narrative`、`degradeFlags`。未识别问法（例如「请解释这条曲线的颜色」）必须是 `clarification`，正文不报具体数字。
