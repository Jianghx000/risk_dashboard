# LangGraph 试点交接（给后续 AI）

更新时间：2026-10-08。本文给接手的 AI 阅读。先读本文，再读文内列出的源文件，不要凭旧会话猜测。

## 1. 用户已确认的方向

用户已看过 LangGraph、LangSmith Studio，并对比过行内 AI 智能工场。结论：

**继续用 LangGraph 做本地试点。** 理由是灵活性高，能用代码把行内那类节点（开始、脚本、API、Prompt、条件选择器、结束）模拟出来，再按 `repricing_gap_workflow/平台迁移规格.md` 迁到行内平台。

不要改成 Dify、百炼工作流画布或 n8n 作为本仓库的主实现。那些产品节点类型和行内更像，只适合对照说明，不是当前试点载体。

## 2. 先读这些文件

| 文件 | 用途 |
|---|---|
| `最高优先级原则.md` | 全项目原则：结构清楚、口径集中 |
| `AI操作守则.md` | 驾驶舱前端改动规则；本试点尽量不要去改 `prototype/` |
| `AI编排/repricing_gap_workflow/平台迁移规格.md` | 行内平台复刻规格 |
| `AI编排/repricing_gap_workflow/README.md` | 正式试点：重定价缺口率工作流 |
| `AI编排/metrics/repricing_gap/blueprint.spec.json` | 复刻图事实源（schema v1） |
| `AI编排/almcanvas/` | 本项目平台边界与质量门禁；`aiworkflow` 不承载这些规则 |
| `AI编排/repricing_gap_workflow/工作流待办.md` | 指标工作流未决问题 |
| `AI编排/simple_workflow_demo/README.md` | 已跑通的最小示例 |
| `AI编排/simple_workflow_demo/graph.py` | 最小示例的节点实现 |
| `AI编排/repricing_gap_workflow/workflow.py` | 正式试点的 StateGraph |
| `AI编排/repricing_gap_workflow/platform_blueprint.py` | 从 spec 派生复刻图形状；可粘贴脚本常量须与 spec 一致 |

驾驶舱原型交接在 `新规划交接说明.md`，和本试点分开。没有用户要求时，不要改模拟测算或 `prototype/`。

## 3. 现在怎么工作

### 3.1 两种实现不要混

| 目录 | 作用 | 端口 |
|---|---|---|
| `AI编排/simple_workflow_demo/` | 5 节点最小图，无模型，数字写死。用来看分流和接 Studio | 本地页 `9030`；Studio 用 Agent Server `2024` |
| `AI编排/repricing_gap_workflow/` | 重定价缺口率虚拟试点：按需取数、七种分析模式、校验、默认百炼 | `9028`（`ALM_AI_MODE=mock` 才用本地模板） |

用户已经在 Studio 里跑通的是 **simple_demo**。`repricing_gap_workflow` 更完整，节点按行内类型切分，是迁平台的主样例。

### 3.2 LangGraph 在本项目里的用法

行内平台：先选节点类型，再填配置。

LangGraph：节点都是 Python 函数，用 `StateGraph.add_node` / `add_edge` / `add_conditional_edges` 连起来。Studio 只显示拓扑和一次运行的状态，不显示源码。设计看对应 `.py`。

映射约定（迁平台时按这个切，不要把所有逻辑塞进一个函数）：

| 行内类型 | LangGraph 里怎么写 |
|---|---|
| 脚本 | 纯 Python，校验、分类、拼文案 |
| API | 函数内调 HTTP / 本地 Mock |
| Prompt | 函数内调模型；失败保留确定性数据 |
| 条件选择器 | `add_conditional_edges` + 路由函数 |
| 开始 / 结束 | `START` / `END` 与状态入参出参 |

### 3.3 已跑通的最小图

`simple_workflow_demo/graph.py`：

```
START → receive_question → classify_intent
        → fetch_overview 或 fetch_limit
        → write_answer → END
```

- 状态：`question`、`route`、`data`、`answer`、`path`
- `classify_intent`：问题含「限额 / 超限 / 空间 / 预警」则 `limit`，否则 `overview`
- 取数是写死的演示值：缺口率 `12.35%`，限额 `16.00%`，剩余 `3.65` 个百分点
- 不含模型调用

Studio 里只填 **Question**，不要填 Route / Data / Answer / Path。

验收问题：

- `限额还有多少空间？` → `fetch_limit`
- `现在重定价缺口率是多少？` → `fetch_overview`

测试：`simple_workflow_demo/tests/test_graph.py`（3 个用例，已通过）。

### 3.4 正式试点图

`repricing_gap_workflow/workflow.py`：

```
resolve_context → classify_question → fetch_alm_data
→ validate_data_package → generate_narrative → validate_output
→（校验未过）regenerate_narrative → validate_retry → END
```

装配期用 `aiworkflow.workflow_check` 禁止回边。`classify()` 不命中返回 `None`，路由成 `clarification`，正文不报数字。复刻图 `context` 脚本必须同一套规则，不得默默兜底成 overview。

取数走 `POST /mock/analysis/query`（虚构 ALM 数据）。文案生成默认百炼 `qwen3.8-27b`；只有 `ALM_AI_MODE=mock` 才用本地模板。数字必须能回填到结果包。校验失败重试生成一次，再失败只返回确定性数据，live 不得用模板顶替。独立 v2 模块已删除；质量回归走 `quality_eval.py`。

虚构数据，不能当正式 ALM 结果。归因是演示用五因素 Shapley，正式驾驶舱是三层 Owen，见 `prototype/dashboard-processes.js`。

## 4. 怎么启动

虚拟环境在项目根 `.venv-ai/`（已 gitignore）。中文 Windows 跑 `langgraph dev` 必须 `PYTHONUTF8=1`。

### 4.1 最小示例本地页

```powershell
$env:PYTHONPATH = "$PWD\AI编排"
.\.venv-ai\Scripts\python.exe -m uvicorn simple_workflow_demo.server:app --host 127.0.0.1 --port 9030
```

打开 `http://127.0.0.1:9030`。

### 4.2 接到 LangSmith Studio

```powershell
cd .\AI编排\simple_workflow_demo
$env:PYTHONUTF8 = "1"
$env:LANGSMITH_TRACING = "false"
..\..\.venv-ai\Scripts\langgraph.exe dev --no-browser --port 2024
```

或 `.\start_studio.ps1`。

成功标志：`Application started up`，且 `graph_id=simple_demo`。浏览器打开：

`https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`

连接地址：`http://127.0.0.1:2024`。顶部黄条「缺少 LANGSMITH_API_KEY」只影响云端 traces，跑图不需要。生产不要把行内数据送到 LangSmith。Studio 前端在 `smith.langchain.com`，不是行内平台。

未设 `PYTHONUTF8=1` 时，会在 `langgraph_api/validation.py` 读 `openapi.json` 报 `UnicodeDecodeError: 'gbk'`。

### 4.3 重定价缺口率试点

```powershell
$env:PYTHONPATH = "$PWD\AI编排"
.\.venv-ai\Scripts\python.exe -m uvicorn repricing_gap_workflow.server:app --host 127.0.0.1 --port 9028
```

人用资源管理器双击项目根目录 `打开行内复刻图.bat`（GBK+CRLF）。已在跑则只打开浏览器。cmd 启动器不能存成 UTF-8，否则会把 `cd /d` 拆碎。

- `http://127.0.0.1:9028/workflow`：只展示行内复刻图。LangGraph 调试走 `GET /v1/canvas-spec`、工作流接口和 pytest，不在页面上画执行图。
- `POST /v1/workflows/run`、`POST /v1/workflows/stream`
- 多指标画布：`GET /m/metrics`、`GET /m/{metric}/workflow`；未注册指标 404。目前只有 `repricing_gap`。

文案生成默认走百炼（`qwen3.8-27b`），密钥在已忽略的 `AI编排/aliyun_api_key.env`。不要提交密钥。只有 `ALM_AI_MODE=mock` 才用本地模板；pytest 会自动设 mock，避免测试打到真实模型。ALM 取数仍是虚构的 `/mock/analysis/query`。

## 5. 用户已经亲眼验证过的事实

1. `langgraph dev` 在设置 `PYTHONUTF8=1` 后可以启动。
2. Studio 能连上 `simple_demo`，图为 classify / fetch_overview / fetch_limit / write_answer（`receive_question` 可能在视口上方）。
3. 用户理解：行内是预置节点类型；LangGraph 用函数模拟这些类型。选择继续用 LangGraph。
4. 用户只要行内复刻图给建站对照；LangGraph 调试交给 AI 用接口和测试自动做。页面不再展示实际执行图。

## 6. 不要做的事

- 不要把 Mock / `analysis.py` 数值或演示归因当成正式口径上线。
- 不要把 Studio 或本地 `/workflow` 当成行内智能工场的生产界面。
- 不要在未要求时改驾驶舱 `prototype/`。
- 不要把 `AI编排/**/*.env`、`.venv-ai/`、截图、`output/` 提交进 Git。
- 不要为了「更像平台」把本地图改成不可运行的配置文件；代码图是源，平台复刻看 blueprint 和迁移规格。
- 校验失败已展开为前向修正链，不要再往图里加回边。`aiworkflow.workflow_check` 会在装配期拦住未声明的回边。
- 不要把未识别问法默默兜底成 overview；复刻图脚本和 `classify()` 必须一起改。
- 不要恢复已删除的 v2 模块（`workflow_v2.py` / `server_v2.py`）。
- cmd 启动器必须 GBK+CRLF。

## 7. 接手后怎么做

先跑：

```powershell
$env:PYTHONPATH = "$PWD\AI编排"
.\.venv-ai\Scripts\python.exe -m pytest .\AI编排\repricing_gap_workflow\tests .\AI编排\aiworkflow_tests .\AI编排\simple_workflow_demo\tests -q
```

未决业务问题见 `repricing_gap_workflow/工作流待办.md`：Prompt 混合分类、期限分布/明细、按模式裁 Prompt、mock 模板兜底取舍。没有用户点名时不要做这些，也不要加第二个指标、不要把执行图画回 `/workflow`、不要改 `prototype/`。
