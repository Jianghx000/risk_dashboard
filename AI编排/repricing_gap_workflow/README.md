# 重定价缺口率 AI 工作流虚拟试点

本目录是可运行的 LangGraph 工作流及虚构 ALM 上游接口。目标是先验证数据按需获取、工作流分流、数值引用校验和多轮追问，再按 `平台迁移规格.md` 在行内 AI 智能工场复刻节点。

运行和复刻均以 `metrics/repricing_gap/blueprint.spec.json` 为定义：本地直接执行其中的脚本、Prompt、输入绑定和分支配置，不再单独维护 LangGraph 连线。精确上下文由脚本校验，追问由识别 Prompt 提出候选，再由脚本整理。模型或 mock 文案在修正一次后仍不合格时返回空文案，没有图外模板兜底；mock 仅替换数据/模型传输，不改变业务拓扑。

## 当前范围

支持默认概览、限额、趋势、逐级计算过程、变动归因、业务原因、口径解释和有限多轮追问。当前模拟法人、人民币/美元/港币、1Y，月频从 2025 年 9 月至 2026 年 7 月，另有部分日频时点。金额单位为亿元。所有数据均为虚构数据。

入口为六项常规字段（机构、页面币种、期限、当期、频率、问题）及可选 `options`。上下文脚本直接引用系统 `chatHistory`，不在开始表单配置 `conversationState`。API 十项参数和各场景返回的数据见 `平台迁移规格.md`；`dataNeeds` 是脚本生成的分析清单，不增加开始字段。

`analysisMode` 表示主要分析类型，`dataNeeds` 表示本轮需要的全部分析。复合问题如“近几个月走势怎么样，为什么上升，还有多少限额空间？”会一次取回趋势、归因、限额三个小结果，放在 `resultPackage.analyses` 下。每部分独立引用、分别检查；某部分没有基期时只说明该部分不可用，其他部分仍可回答。当前最多四类分析、两种币种，总包仍受 16000 字符限制，超范围不会静默删项。

**归因边界**：`analysis.py` 的五因素 Shapley 计算只验证工作流和接口的勾稽机制，不是当前驾驶舱的正式三层嵌套 Owen 归因。正式接入时，`/mock/analysis/attribution` 和业务影响必须替换为 ALM 服务的正式结果；当前页面的正式算法见 `prototype/dashboard-processes.js` 的 `buildRepricingGapProcessImpactMap`。

## 启动

资源管理器中双击项目根目录的 `打开行内复刻图.bat`（或本目录同名文件），会启动独立复刻图服务并打开浏览器，不调用模型、不执行工作流。启动器会复用已运行的复刻图服务；端口被其他服务占用时会另选端口。通用工具说明见 `../almcanvas/README.md`。

要运行并调试业务工作流，可在项目根目录用 PowerShell（若 9028 已被复刻图占用，请另选端口）：

```powershell
python -m venv .venv-ai
.\.venv-ai\Scripts\python.exe -m pip install -r .\AI编排\repricing_gap_workflow\requirements.txt
$env:PYTHONPATH = "$PWD\AI编排"
.\.venv-ai\Scripts\python.exe -m uvicorn repricing_gap_workflow.server:app --host 127.0.0.1 --port 9028
```

本机工作环境使用临时虚拟环境，项目目录没有自动生成 `.venv-ai`。上面的命令是给其他开发者的可复现方式，正式使用时应将虚拟环境放在项目目录外或加入本地 Git 忽略。

服务启动后：

- 健康检查：`http://127.0.0.1:9028/healthz`
- 可视化工作流：`http://127.0.0.1:9028/workflow`
- 接口文档：`http://127.0.0.1:9028/docs`
- JSON 工作流：`POST /v1/workflows/run`
- SSE 工作流：`POST /v1/workflows/stream`

示例请求：

```json
{
  "inputs": {
    "orgCode": "LEGAL",
    "currencyCode": "CNY",
    "tenorCode": "1Y",
    "asOfDate": "2026-07-31",
    "frequency": "MONTH",
    "question": ""
  }
}
```

返回包含 `analysisMode`、`resultPackage`、`narrative`、`degradeFlags`、`validationErrors`、`conversationState`、`modelMode` 和 `sessionId`。本地追问带 `sessionId`，服务按行内实测格式提供 `chatHistory`：数组中的 inputMessage/outputMessage 均为 JSON 字符串，分别记录开始输入及最终输出，不记录中间节点。上下文脚本只恢复最新输出中的精简 conversationState，兼容 `res` 外层；历史和旧业务数字不送模型/API。最近 20 轮保存在内存，重启失效。也可在本地请求顶层传 chatHistory 模拟平台注入；旧 conversationState 入参仅作兼容。行内试运行已验证历史格式，正式 OpenAPI sessionId 衔接仍需联调。

页面指定基期使用 `"options":{"baseDate":"2026-05-31"}`，优先于问题中的日期。旧的 `scope` 和扁平覆盖字段在本地适配层兼容，但不作为新建节点的契约。

`/workflow` 只展示**行内复刻图**：开始、脚本、API、Prompt、条件选择器、结束，点击节点查看职责、变量绑定、脚本或 Prompt。页面不跑工作流、不画 LangGraph 执行图。编译拓扑、SSE 运行和校验由 `GET /v1/canvas-spec`、`POST /v1/workflows/run` 与 pytest 覆盖，交给 AI 自动调试。不能声称无缝导入。

## 工作流节点

`resolve_context → select_intent`：首次默认或显式指定类型走 `build_direct_context`；追问走 `classify_intent → validate_intent`。两分支汇合到 `select_data`：需要数据走 `fetch_alm_data`，澄清或不支持口径走 `build_local_response`；再汇合到 `validate_data_package → generate_narrative → validate_output → select_retry`。修正则前向走 `regenerate_narrative → validate_retry`，再结束。无回边、无图外模板兜底。

追问识别使用同一小模型，最多500个输出 tokens，只接收问题和极小的指代信息，不接收 ALM 数值。八类0/1候选通过结构和范围校验后转为 `dataNeeds`，API仍为十项参数；异常或不确定先澄清，不回退关键词取数。首次空问题不额外调用识别模型。数据日期是否存在、默认上一可比期由后端判断。首次概览包含短趋势、限额、币种摘要和主要演示归因因素；限额和趋势追问不返回无关数据。

语义质量须单独测量，0/1标签本身不提高识别能力。`python -m repricing_gap_workflow.intent_eval --output tmp/intent-live.json` 默认真实调用模型，对同一份人工标注问题比较旧关键词规则与新识别。离线 mock 只验证流程，不能证明分类准确率。识别增加一次模型调用，须评估行内延迟和稳定性；脚本可拒绝非法候选，但无法拦住所有语义误判。

### 2026-10-08 实测记录

历史接入：开始表单移除 conversationState；脚本直接引用 chatHistory，兼容直接最终输出与 res 外层。新增回归覆盖首次空历史、损坏最新输出不回退旧状态、切换页面范围、币种/基期覆盖、澄清后继续追问以及不递归保存历史。431 项离线测试通过，npm run check 的 11 项 smoke 通过。真实 qwen3.8-27b 验证首轮、币种连续追问和切换基期共 6 轮，最终校验和质量标记均为空。首次真实测试发现分类模型缺少关注币种信息，已补入精简 classificationContext 并重测；失败记录保留在本地 tmp/history-live-quality.json，修复后结果为 tmp/history-live-quality-v2.json。没有将完整历史送入 Prompt。

真实调用 `qwen3.8-27b`，32种人工标注问法连续两轮均识别正确；同样本旧关键词规则14/32。首次24题中曾错2题，补充业务规模与指标趋势、复合计算与口径的边界后，再加入8种新改述验证。这里只是小样本结果，不代表生产准确率。第二轮识别耗时中位数1.13秒，最大8.16秒，不代表行内耗时。

完整链路覆盖首次解读、复合趋势/归因/限额、改基期追问、业务/计算、否定表达和口径。调试发现并修复：口径子问题误选计算节点；具体排除项引用被误判无证据；否定并列的“贷款余额或发放额”被误拦截。错数、真正误称余额和跨模块漏答仍然拒绝。真实文案仍有概率性失败，保留一次修正及空文案降级，不以分类成功冒充解释必然合格。

本地报告：`tmp/intent-live-v2.json`、`tmp/intent-live-v3-repeat.json`、`tmp/intent-workflow-live-final.json`、`tmp/intent-workflow-edge-final-v2.json`。最后两份分别保留完整链路调试和修复后边界场景复测，旧报告不抹去失败记录。

文案生成默认调用百炼 `qwen3.8-27b`。密钥从 `AI编排/aliyun_api_key.env` 读取 `API_KEY=...`；也可通过 `ALM_AI_API_KEY`、`ALM_AI_MODEL`、`ALM_AI_BASE_URL` 覆盖。默认百炼地址是北京地域兼容接口，其他地域须设置 `ALM_AI_BASE_URL`。该文件已被 Git 忽略，不能提交到仓库。真实模式使用 JSON 输出、关闭思考以控制延迟；回答仍经结构、引用路径、数值和演示归因口径校验，失败时只保留确定性结果包，**不会用本地模板顶替**。生产应使用行内密钥服务，不应读取本地 env 文件。

只有离线回归才关掉模型：

```powershell
$env:ALM_AI_MODE = "mock"
$env:PYTHONPATH = "$PWD\AI编排"
.\.venv-ai\Scripts\python.exe -m uvicorn repricing_gap_workflow.server:app --host 127.0.0.1 --port 9028
```

2026-09-23 的本地真实模型单轮调试覆盖概览、限额、趋势、计算过程、归因、业务、口径七种模式，均获得通过校验的回答。观察到单次调用约 4 至 10 秒，尚不能代表行内平台性能或稳定性；多轮、并发、故障注入和行内平台节点仍需实测。

## 虚拟 ALM 工具接口

| 接口 | 工作流用途 | 关键输出 |
| --- | --- | --- |
| `POST /mock/analysis/query` | 固定入口，按 `dataNeeds` 一次获取所需小结果 | 单一问题沿用旧包；复合结果在 analyses，各自带范围、版本、状态 |

旧的 `/mock/analysis/{mode}` 路径仅为测试兼容保留。行内平台需注册正式 ALM API，不能使用本地 Mock 地址。

Mock 工具使用 `X-Service-Token: demo-token` 和 `X-Demo-User: demo-analyst`，仅用于本地联调。正式系统须由 ALM 网关验证登录态、机构/币种/明细权限；平台密钥由平台管理，不能交给浏览器。不能以请求体自行声明的权限范围代替服务端授权。

真实接口至少要返回查询范围、实际数据日期、数据版本、业务口径版本和状态。归因接口必须由 ALM 返回正式算法结果及勾稽状态；业务明细需限定字段、行数并脱敏。若某指标或筛选口径不支持归因，应返回明确的 `unsupported` 状态，不虚构解释。

## 验收

```powershell
$env:PYTHONPATH = "$PWD\AI编排"
.\.venv-ai\Scripts\python.exe -m pytest .\AI编排\repricing_gap_workflow\tests -q
```

测试覆盖默认分析、Owen 演示归因勾稽、逐级节点、业务明细定位、无权访问、SSE 阶段顺序、错误数字重试和降级、口径问题分类、多轮追问、未识别问法澄清，以及画布拓扑与编译后 LangGraph 一致、复刻脚本与运行期分类对齐、错数回流、模型失败降级、API 失败路径。解读质量回归：

```powershell
$env:PYTHONPATH = "$PWD\AI编排"
.\.venv-ai\Scripts\python.exe -m repricing_gap_workflow.quality_eval
```

默认调真实模型。加 `--mock` 才用本地模板、不读密钥。正式接入还需要补平台实测：真实模型输出质量、用户权限透传、真实接口性能、会话持久化、SSE 网关兼容性、条件选择器回流和正式口径结果对账。不能把本地画布当作已经可以无条件导入行内平台。

## 文件

- `analysis.py`：全部虚构数据和确定性分析。
- `workflow.py`：LangGraph 节点、路由、模型适配和输出校验。
- `graph_spec.py`：编译图快照、行内复刻图、节点映射和差异。
- `server.py`：FastAPI 工作流入口、画布规格及 Mock ALM HTTP 接口。
- `workflow_view.html`：自建可视化画布。
- `tests/`：端到端、画布、分类、平台约束与 spec 完整性。
- `quality_eval.py`：合成数据上的解读质量回归。
- `平台迁移规格.md`：行内平台逐节点复刻说明。
