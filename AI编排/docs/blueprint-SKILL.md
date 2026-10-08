---
name: blueprint
description: 生成"行内 AI 智能工场迁移蓝图"——一个自包含、离线可开的 HTML 文件，内含工作流架构流程图与每个节点的行内建站信息卡（节点类型、输入输出参数、提示词全文、异常策略、迁移注意），行内同事照着信息卡逐节点在智能工场建站即可完成迁移。当用户要求画工作流架构图/迁移蓝图/迁移说明书、生成行内迁移 HTML、或工作流改动后同步蓝图时使用。
---

# 迁移蓝图（inline migration blueprint）

把某个 app 的工作流变成一份"行内重建说明书"：单文件 HTML = 架构流程图（SVG，可点击）+ 迁移必读说明 + 每节点建站信息卡。产物发到行内电脑后双击即可打开（零外部依赖），照卡逐字段填进行内 AI 智能工场表单。

数据流与分工固定：

```
agent 读代码与契约 → 填写 spec JSON → scripts/render_blueprint.py 渲染 HTML
```

字段定义见本目录 [spec-schema.md](spec-schema.md)（schema v1），先读它再动手。spec 与 HTML 产物都入库：`AI编排/metrics/<metric>/blueprint.spec.json` 与 `AI编排/metrics/<metric>/blueprint.html`。

## 操作流程

### 1. 读信息源

对目标指标（默认 `repricing_gap`，用户指定其他指标时替换）依次读：

- `AI编排/repricing_gap_workflow/workflow.py`：运行期节点、连线、校验与重试展开；
- `AI编排/repricing_gap_workflow/platform_blueprint.py`：可粘贴脚本与 Prompt 文本；
- `AI编排/metrics/<metric>/blueprint.spec.json`：已有 spec（改工作流时先 diff 再改）；
- `AI编排/行内平台契约.md` 与 `AI编排/行内AI工作流平台能力速查.md`：节点类型语义和待实测项。

### 2. 填写 spec

按 spec-schema.md 逐节点填写到 `AI编排/metrics/<metric>/blueprint.spec.json`。硬规则：

1. 行内事实与本地细节分离：`config`/`inputs`/`outputs` 只写行内建站要填的字段；STAGE 帧、emit 回调、mock token、本地实现文件路径不进 config，需要交代的放 `inlineMigration` 或 `impl`。
2. 边必须完整：所有装配边（含条件分支的每个可能目标、到 `__end__` 的边）一一对应；`DECLARED_BACK_EDGES` 里的边写 `kind: "back-edge"` 并给 `inlineExpansion`，同时在工作流级 inlineNotes 里写展开方案。
3. 待行内确认项（错误码全表、触发 API 请求体形态、心跳机制，见契约文档第 12 节）必须写 `severity: "warning"` 的 inlineNotes，不得写成确定事实。
4. 提示词全文进 `config.systemPrompt`（含硬约束、术语表、schema 说明、few-shot 时全部保留，行内建站时原样粘贴）。
5. 节点顺序与 `meta.layout.rows`：第一行放主链前段、第二行放后段（每行 ≤5 个），保证图上连线自左向右、可读。
6. 提交前自查 spec 无密钥、无真实业务数据（mock 数据与提示词里的演示数值允许）。

### 3. 渲染

```powershell
$env:PYTHONPATH = "$PWD\AI编排\scripts"
python AI编排/scripts/render_blueprint.py `
  AI编排/metrics/<metric>/blueprint.spec.json `
  AI编排/metrics/<metric>/blueprint.html
```

校验失败（exit 2）按报错逐条修 spec 后重跑；渲染器不报错不代表 spec 内容正确，第 4 步负责内容验收。

### 4. 浏览器验收（必做）

渲染器只保证形态，内容正确性必须由 agent 在浏览器里核对：

1. 起临时服务（IAB 不支持 file:）：`python3 -m http.server <port> --directory <产物目录>`；
2. 打开页面逐项检查：
   - 图上节点数、连线数与 spec 的 `nodes`/`edges` 一致；本仓库复刻图无回边，重试是前向链；
   - 逐个点击节点：详情卡滚动定位正常；每张卡的 inputs/outputs/config/failureRouting 与代码事实一致（重点核对开始节点入参、API 路径、Prompt 全文、脚本 `handler`）；
   - 提示词"复制"按钮内容完整（含双引号、换行不截断）；
   - 深色模式切换、打印预览（所有节点卡完整入版）正常。
3. 对照 checklist：14 类节点语义无错标；三处待行内确认项均有 warning 卡；回边有展开说明。

### 5. 收尾

- spec 与 HTML 一并提交（`docs: add <app> migration blueprint` 或 `docs: sync <app> migration blueprint`）；
- 若本次同时改了渲染器或 schema，分开提交。

## 工作流改动后的同步

用户要求同步蓝图、或发现 spec 落后于代码时：重新执行流程 1-2，先 diff `workflow.py` 与 spec 的 `nodes`/`edges`，只更新变化部分，再渲染、验收。不要凭记忆改 spec，一切以当次读到的代码为准。

## 边界

- 本 skill 只产出文档型 HTML，不改工作流代码；发现代码与契约冲突时先报告用户，不擅自"顺手修正"。
- 渲染器与 schema 的改动属于仓库级变更：改 `scripts/render_blueprint*.py` 或 spec-schema.md 后，须对全部已存在的 spec 重渲染并验证。
