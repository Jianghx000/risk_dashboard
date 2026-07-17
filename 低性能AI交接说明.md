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
- 已删除组件序号：`5 / 8 / 10 / 11 / 16 / 17 / 57 / 58`。
- EVE 分子和分母组件 `3 / 4` 只作为计算过程来源节点，不作为普通图表单独展示。
- 利率风险业务类型统一为 15 类；流动性风险业务统一为 23 个明细类别，两套口径均维护在 `dashboard-domain.js`。
- 模拟测算逻辑已从 `app.js` 拆到 `dashboard-simulation.js`。
- EVE、LCR/NSFR、流动性比例、重定价缺口率和资产负债重定价久期缺口的计算过程拆解已从 `app.js` 拆到 `dashboard-processes.js`。拆解弹窗统一支持选择历史比较基期；未手动选择时默认与上一期比较，节点及展开组成项必须使用同一基期。
- 利率风险图表渲染已从 `app.js` 拆到 `dashboard-interest-renderers.js`。
- 业务变动分析图表和表格渲染已从 `app.js` 拆到 `dashboard-business-renderers.js`。
- 流动性、资金融入和债券投资图表渲染已从 `app.js` 拆到 `dashboard-liquidity-renderers.js`。
- 图表/数据/表格渲染注册在 `dashboard-renderers.js`。
- `dashboard-renderers.js` 只做注册表，不能保留未被 `dashboard-config.js` 使用的旧 renderer kind。
- DOM 事件绑定在 `dashboard-events.js`。
- 共享工具函数已从 `app.js` 拆到 `dashboard-utils.js`。
- `dashboard-config.js` 不再使用 `blockDisplay` 和 `areaDisplay` 承载结构补丁。
- 同一 block 下需要合并展示的同名区域必须在 `dashboard-data.js` 配置相同 `groupKey`。
- 管理限额只通过 `managementLimits[].widgetSeqs` 绑定图表，具体条目由 `entries[]` 按机构、币种和附加口径维护，不再使用 `matchTitles` 或旧的 `values`；顶部机构必须单选，币种可多选，图中为所选币种内完全命中的条目分别显示限额线，并通过限额图例注明机构、币种和附加口径。
- 除 `sourceOnly` 节点外，所有 widget 都必须在 `widgetBehavior` 中声明 `chartKind` 或 `tableKind`。
- 旧的独立 EVE demo 已删除，正式 EVE 拆解能力在主页面内。
- 业务变动分析保留一个一级入口，页内先通过按钮切换利率风险、流动性风险两个视角，再在每个视角下划分存量业务、新发生业务、到期业务三个分区；默认值和可选值维护在 `pageBehavior.业务变动分析`，两套分类与字段维护在 `dashboard-domain.js` 的 `businessAnalysisPerspectives`。

## 5. 当前页面能力

利率风险：

- 最大经济价值变动比例
- 净利息收入波动
- 重定价缺口率（月频、日频按钮切换）
- 分业务重定价期限分布及右侧明细
- 资产负债重定价久期缺口
- 债券修正久期
- 债券投资规模
- EVE、重定价缺口率和资产负债重定价久期缺口可做计算过程拆解
- 模拟测算包含新业务模拟、套期交易模拟，以及预留的净利息收入入口

流动性风险：

- 流动性覆盖率 LCR
- 净稳定资金比率 NSFR
- 流动性缺口，期限支持 `1D / 7D / 30D / 3M / 1Y`，仅 `30D` 支持时点/月日均切换，其余期限仅为时点口径
- 未来逐日资金流及右侧明细，与业务变动分析的流动性风险视角共用 23 个明细业务类别；图例按“资产及表外收入”“负债及表外支出”分段
- LCR 和 NSFR 可做计算过程拆解
- 模拟测算包含新业务模拟，以及预留的流动性压力测试入口

业务变动分析：

- 存量业务
- 新发生业务
- 到期业务
- 利率风险视角展示生息资产、付息负债及利率/久期字段
- 流动性风险视角展示 23 个明细业务类别，并按资产、表外收入、负债、表外支出组织；一览表展示规模、平均利率、平均原始期限或平均剩余期限，明细表展示业务编号、客户、日期、币种、金额、利率和期限等基础业务属性，不重复未来逐日资金流或监管指标计算字段
- 两个视角的结构表均支持明细穿透
- 新发生、到期的月度图、一览表和明细清单均提供“口径说明”，每个弹窗只展示当前组件自身的轧差计算逻辑

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
