# 迁移蓝图 spec schema（v1）

迁移蓝图 spec 是一个 JSON 文件，描述"某个 app 的工作流在行内 AI 智能工场重建所需的全部信息"。数据流固定为三段：

```
agent 读代码与契约文档 → 填写 spec JSON → scripts/render_blueprint.py 渲染出自包含 HTML
```

agent 负责"代码 → spec"的语义翻译；渲染器负责"spec → HTML"的确定性生成。工作流改动时只更新 spec 并重渲染。spec 入库（`AI编排/metrics/<metric>/blueprint.spec.json`），渲染产物（`AI编排/metrics/<metric>/blueprint.html`）同样入库。

渲染命令：

```bash
PYTHONPATH=AI编排/scripts python AI编排/scripts/render_blueprint.py AI编排/metrics/<metric>/blueprint.spec.json AI编排/metrics/<metric>/blueprint.html
```

## 顶层结构

```json
{
  "meta": { "...": "见下" },
  "nodes": [ "...": "节点数组，含结束节点（id 固定 __end__，有详情卡；省略时渲染器自动追加纯终点）" ],
  "edges": [ "...": "边数组，含到结束点的全部边" ],
  "inlineNotes": [ "...": "工作流级迁移说明（回边展开、本地差异等）" ]
}
```

## meta 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| schemaVersion | 是 | 固定 `1` |
| workflow | 是 | 工作流标识（如 `repricing_gap`） |
| title | 是 | 中文标题（页面大标题） |
| description | 是 | 一段话说明工作流做什么 |
| app | 是 | 应用目录（如 `AI编排/repricing_gap_workflow`） |
| contractDoc | 是 | 契约文档路径（如 `AI编排/行内平台契约.md`） |
| generatedAt | 是 | 生成日期（ISO 格式，`YYYY-MM-DD`） |
| inlinePlatform | 否 | 一句话描述目标平台（默认"行内 AI 智能工场"） |
| layout | 否 | `{"maxPerRow": 5, "rows": [["nodeA", "nodeB"], ["nodeC"]]}`；`rows` 显式指定分行与顺序（每行从左到右），省略时渲染器按拓扑分层自动蛇形分行 |

## node 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| id | 是 | 节点唯一标识，等于本地节点名（即行内"输出变量名"，后置节点经它引用） |
| name | 是 | 中文显示名（行内建站时填的节点名称） |
| inlineType | 是 | 行内节点类型：开始／Prompt／条件选择器／RAG／API／AI 能力／MCP／脚本／业务编排／Agent／循环组件／中间信息输出／结束 之一 |
| summary | 是 | 两三句职责描述：做什么、为什么存在 |
| inputs | 是 | 入参数组（可为空）。条目：`{"name","type","source","desc"}`；`source` 写取值来源，引用上游用 `${节点id.输出名}` 形态，静态值直接写值 |
| outputs | 是 | 输出参数声明数组（可为空）。条目：`{"name","type","desc"}`；类型用行内类型词（String/Number/Integer/Boolean/Object/Array\<T\>） |
| config | 是 | 按节点类型的配置块（`kind` 必填，其余见下表）；键值对在详情卡里按键序渲染 |
| failureRouting | 是 | 失败时的走向：终止（错误码与可重试性）、降级（degradeFlags 追加什么、默认输出是什么）、还是路由到哪个节点 |
| inlineMigration | 否 | 迁移到行内时该节点的注意事项（如"行内画布无本节点：入参声明由开始节点承担"） |
| localOnly | 否 | `true` 表示纯本地实现细节、行内无对应配置（详情卡会打"本地实现"标） |
| impl | 否 | 本地实现位置（如 `repricing_gap_workflow/workflow.py · resolve_context`），详情卡小字展示 |

## config.kind 与各类配置字段

`config.kind` 决定详情卡的配置分组标题，取值与行内节点类型对应：

| kind | 对应行内类型 | 常用 config 键 |
| --- | --- | --- |
| `start` | 开始 | `inputParams`（开始节点入参声明，同 outputs 条目形态） |
| `prompt` | Prompt | `systemPrompt`（多行长文本）、`userContent`（用户提示词模板）、`outputFormat`（文本/Markdown/JSON）、`outputParams`、`llmProfile`（low/mid/high）、`onError`（abort/ignore）、`defaultOutput` |
| `api` | API／AI 能力 | `plugin`（注册接口名）、`path`、`method`、`paramsDesc`、`onError`、`defaultOutput`、`retries` |
| `script` | 脚本 | `codeSummary`（处理逻辑要点，多行长文本）、`timeoutSeconds`、`onError`、`defaultOutput` |
| `condition` | 条件选择器 | `branches`（`[{"when": "条件描述", "then": "目标节点"}]`） |
| `message` | 中间信息输出 | `contentType`（String/Object）、`streaming`（布尔） |
| `loop` | 循环组件 | `iterateOver`、`itemKey`、`outputName`、`maxIterations` |
| `subflow` | 业务编排 | `refWorkflow`、`depth` |
| `mcp` | MCP | `server`、`tool`、`paramsDesc` |
| `agent` | Agent | `tools`（工具清单）、`maxRounds`、`onError` |
| `rag` | RAG | `strategy`（hybrid/keyword/semantic）、`topK`、`threshold`、`includeSource` |
| `end` | 结束 | `outputTemplate`（结束输出 JSON 模板，对象原样渲染） |

约定：

- `onError` 值写 `abort`（异常中断编排）或 `ignore`（异常忽略：跳过该节点、用默认输出继续）。
- 值为含换行或超过 80 字符的字符串时渲染为代码块（提示词、逻辑要点都放这种长文本）。
- `config` 键名用上表的 camelCase 名；渲染器内置中文标签映射，未登记的键直接显示键名。

## edge 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| from | 是 | 源节点 id |
| to | 是 | 目标节点 id；到工作流终点写 `"__end__"` |
| kind | 是 | `normal` 主链边／`conditional` 条件分支边／`back-edge` 本地声明的回边（行内画布非法，必须配 `inlineExpansion`）／`end` 汇入终点的边 |
| label | 否 | 边上的短标签（条件语义，如"校验不通过"） |
| inlineExpansion | `back-edge` 必填 | 该回边在行内的等效落地说明（一句话；详细展开写进 inlineNotes） |

## inlineNotes 条目

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| id | 是 | 短标识（如 `regen-loop`） |
| title | 是 | 说明标题 |
| body | 是 | 说明正文（可多段，用 `\n\n` 分段） |
| relates | 否 | 相关节点 id 数组（渲染时互相链接定位） |
| severity | 否 | `info`／`warning`（默认 info；warning 用于迁移时必须处理的差异） |

## 填写规则（agent 必须遵守）

1. 行内事实与本地细节分开：只把行内建站要填的字段写进 `config`／`inputs`／`outputs`；本地实现细节（STAGE 帧、emit 回调、mock token 等）不进 config，需要交代时放 `inlineMigration` 或工作流级 inlineNotes。
2. 提示词全文进 `config.systemPrompt`（多行长文本）。系统提示词按模式区分时用两个 Prompt 节点条目或在同一 config 里分键（`systemPromptMetric`／`systemPromptOverview`）。
3. 待行内确认项（错误码全表、触发 API 请求体形态、心跳机制）必须以 `severity: "warning"` 的 inlineNotes 显式标注，不得写成确定事实。
4. spec 中不得出现密钥、token、真实业务数据；提交前按此自查。
5. 边必须覆盖图上全部连线（含到 `__end__` 的边与条件分支的所有可能目标）；`back-edge` 只用于装配期 `DECLARED_BACK_EDGES` 里显式声明的边。
