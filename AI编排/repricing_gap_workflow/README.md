# 重定价缺口率 AI 工作流虚拟试点

本目录是可运行的 LangGraph 工作流及虚构 ALM 上游接口。目标是先验证数据按需获取、工作流分流、数值引用校验和多轮追问，再按 `平台迁移规格.md` 在行内 AI 智能工场复刻节点。

## 当前范围

支持默认概览、限额、趋势、逐级计算过程、变动归因、业务原因、口径解释和有限多轮追问。当前只模拟法人、人民币、1Y、2026 年 5 至 7 月。金额单位为亿元。所有数据均为虚构数据。

**归因边界**：`analysis.py` 的五因素 Shapley 计算只验证工作流和接口的勾稽机制，不是当前驾驶舱的正式三层嵌套 Owen 归因。正式接入时，`/mock/analysis/attribution` 和业务影响必须替换为 ALM 服务的正式结果；当前页面的正式算法见 `prototype/dashboard-processes.js` 的 `buildRepricingGapProcessImpactMap`。

## 启动

资源管理器中双击项目根目录的 `打开行内复刻图.bat`（或本目录同名文件）。会起本地服务并打开浏览器；关闭黑色窗口即停止服务。若 9028 已在运行，只会打开页面。

也可以在项目根目录用 PowerShell：

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
    "scope": {
      "metricCode": "REPRICING_GAP_RATIO",
      "orgCode": "LEGAL",
      "currencyCode": "CNY",
      "tenorCode": "1Y",
      "asOfDate": "2026-07-31"
    },
    "question": "重定价缺口率的变动由什么导致？",
    "analysisMode": "attribution",
    "baseDate": "2026-06-30"
  }
}
```

返回包含 `analysisMode`、`resultPackage`、`narrative`、`degradeFlags`、`validationErrors`、`modelMode` 和 `sessionId`。若要追问，后续请求带上返回的 `sessionId`。虚拟服务只保存最近业务类别及到期时间，不保存历次数值包；每轮重新调用 ALM 工具接口。内存会话在服务重启后失效。

`/workflow` 只展示**行内复刻图**：开始、脚本、API、Prompt、条件选择器、结束，点击节点查看职责、变量绑定、脚本或 Prompt。页面不跑工作流、不画 LangGraph 执行图。编译拓扑、SSE 运行和校验由 `GET /v1/canvas-spec`、`POST /v1/workflows/run` 与 pytest 覆盖，交给 AI 自动调试。不能声称无缝导入。

## 工作流节点

`resolve_context → classify_question → fetch_alm_data → validate_data_package → generate_narrative → validate_output`，校验失败则前向走到 `regenerate_narrative → validate_retry`，再汇到结束。装配期用 `aiworkflow.workflow_check` 禁止回边。再次失败或模型失败时只返回确定性结果包。

`classify_question` 当前使用确定性规则模拟问题分类，便于离线复现和验收。生产可在行内平台用 Prompt 节点输出受限枚举，再由条件选择器分支；仍要保留脚本校验及兜底路由。

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
| `POST /mock/analysis/query` | 固定入口，按 `analysisMode` 获取当前模式的小包 | 扁平范围入参；返回范围、版本、状态及模式数据 |

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
