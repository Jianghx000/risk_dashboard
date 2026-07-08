# 低性能 AI 交接说明

## 1. 项目定位

- 项目：ALM 风险管理驾驶舱前端原型
- 当前目录：`E:\招行\资产负债管理部\ALM系统\risk_dashboard`
- 入口页面：`prototype/index.html`
- 当前页面结构：利率风险、流动性风险、业务变动分析

## 2. 当前运行文件

- `prototype/index.html`
- `prototype/dashboard-data.js`
- `prototype/dashboard-config.js`
- `prototype/dashboard-domain.js`
- `prototype/mock-data-adapter.js`
- `prototype/dashboard-utils.js`
- `prototype/app.js`
- `prototype/dashboard-simulation.js`
- `prototype/dashboard-processes.js`
- `prototype/dashboard-interest-renderers.js`
- `prototype/dashboard-business-renderers.js`
- `prototype/dashboard-liquidity-renderers.js`
- `prototype/dashboard-renderers.js`
- `prototype/dashboard-events.js`
- `prototype/styles.css`

## 3. 文件边界

业务结构和业务口径优先改：

- `prototype/dashboard-data.js`
- `prototype/dashboard-config.js`
- `prototype/dashboard-domain.js`

展示、交互和样式再改：

- `prototype/dashboard-utils.js`
- `prototype/app.js`
- `prototype/dashboard-simulation.js`
- `prototype/dashboard-processes.js`
- `prototype/dashboard-interest-renderers.js`
- `prototype/dashboard-business-renderers.js`
- `prototype/dashboard-liquidity-renderers.js`
- `prototype/dashboard-renderers.js`
- `prototype/dashboard-events.js`
- `prototype/styles.css`

mock 造数逻辑放在：

- `prototype/mock-data-adapter.js`

## 4. 当前关键事实

- 一级页面只有三类：利率风险、流动性风险、业务变动分析。
- 数据结构已经压平，不再保留 `核心风险指标`、`缺口风险`、`现金流错配`。
- 已删除组件序号：`5 / 8 / 10 / 11 / 16 / 17`。
- EVE 分子和分母组件 `3 / 4` 只作为计算过程来源节点，不作为普通图表单独展示。
- 业务类型统一为 15 类，维护在 `dashboard-domain.js`。
- 模拟测算逻辑已从 `app.js` 拆到 `dashboard-simulation.js`。
- EVE、LCR/NSFR、重定价缺口率的计算过程拆解已从 `app.js` 拆到 `dashboard-processes.js`。
- 利率风险图表渲染已从 `app.js` 拆到 `dashboard-interest-renderers.js`。
- 业务变动分析图表和表格渲染已从 `app.js` 拆到 `dashboard-business-renderers.js`。
- 流动性、资金融入和债券投资图表渲染已从 `app.js` 拆到 `dashboard-liquidity-renderers.js`。
- 图表/数据/表格渲染注册在 `dashboard-renderers.js`。
- `dashboard-renderers.js` 只做注册表，不能保留未被 `dashboard-config.js` 使用的旧 renderer kind。
- DOM 事件绑定在 `dashboard-events.js`。
- 共享工具函数已从 `app.js` 拆到 `dashboard-utils.js`。
- `dashboard-config.js` 不再使用 `blockDisplay` 和 `areaDisplay` 承载结构补丁。
- 同一 block 下需要合并展示的同名区域必须在 `dashboard-data.js` 配置相同 `groupKey`。
- 管理限额只通过 `managementLimits[].widgetSeqs` 绑定图表，不再使用 `matchTitles`。
- 除 `sourceOnly` 节点外，所有 widget 都必须在 `widgetBehavior` 中声明 `chartKind` 或 `tableKind`。
- 旧的独立 EVE demo 已删除，正式 EVE 拆解能力在主页面内。
- 业务变动分析当前采用利率风险资产负债结构口径，配置为 `pageBehavior.业务变动分析.analysisPerspective = "interestBalanceStructure"`；流动性口径的业务流、现金流和资金融入分析在流动性风险页面内表达，不复用业务变动分析表格。

## 5. 当前页面能力

利率风险：

- 最大经济价值变动比例
- 净利息收入波动
- 重定价缺口率（月频、日频）
- 分业务重定价期限分布及右侧明细
- 重定价久期
- 债券修正久期
- 债券投资规模
- EVE 和重定价缺口率可做计算过程拆解
- 模拟测算包含新业务模拟、套期交易模拟，以及预留的净利息收入入口

流动性风险：

- 流动性覆盖率 LCR
- 净稳定资金比率 NSFR
- 流动性缺口
- 未来逐日资金流及右侧明细
- 同业融入最长期限
- 同业融入期限结构
- LCR 和 NSFR 可做计算过程拆解
- 模拟测算包含新业务模拟，以及预留的流动性压力测试入口

业务变动分析：

- 存量业务
- 新发生业务
- 到期业务
- 资产负债结构表支持明细穿透

## 6. 验证命令

常规检查：

```powershell
npm run check
```

单独结构校验：

```powershell
npm run validate:dashboard
```

单独页面冒烟检查：

```powershell
npm run smoke
```

## 7. 后续修改标准流程

1. 判断是结构变化还是展示变化。
2. 结构变化先改 `dashboard-data.js`、`dashboard-config.js`、`dashboard-domain.js`。
3. 展示变化再改 `dashboard-utils.js`、`app.js`、`dashboard-simulation.js`、`dashboard-processes.js`、`dashboard-renderers.js`、`dashboard-events.js`、`styles.css`。
4. 跑 `npm run check`。
5. 打开 `prototype/index.html` 做页面检查。
6. 看 `git status`，确认没有无关文件混入。
7. 按用户要求提交和推送。

## 8. 最容易犯错的地方

- 把已经删除的旧层级重新加回来。
- 把已删除组件序号重新放回数据里。
- 在 `app.js` 里临时隐藏图表，而不是从数据层删除。
- 在 `app.js` 里新增领域图表渲染，而不是放到对应的 `dashboard-*-renderers.js`。
- 在 `dashboard-renderers.js` 注册没有被 `dashboard-config.js` 使用的旧 renderer kind。
- 修改业务类型时只改一个文件，忘记同步 `dashboard-domain.js` 和图例配置。
- 修改样式时依赖历史覆盖层，导致系统风格回退。
- 改完没有跑 `npm run check`。
