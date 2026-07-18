# 低性能 AI 交接说明

## 1. 项目定位

- 项目：ALM 风险分析视图前端原型
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
- 分业务重定价期限分布及右侧明细；横轴固定为“隔夜、1~2个月、2~3个月……11~12个月”，不显示实际日期区间
- 资产负债重定价久期缺口
- 债券修正久期
- 债券投资规模
- EVE、重定价缺口率和资产负债重定价久期缺口可做计算过程拆解；“影响”表示该节点或业务变动对最终风险指标较基期变动的贡献。重定价缺口率采用底层业务联合 Shapley 归因，不再把分子和分母作为两个独立归因因素：每类资产业务将重定价规模和总生息资产规模绑定为一个因素，负债业务及银行账簿、交易账簿表外衍生品应收应付作为其他因素，末级影响向上汇总到资产端业务、负债端业务、银行账簿表外衍生品和交易账簿表外衍生品四个纵向分支，四个分支影响之和严格等于缺口率变化。父级和末级业务卡片展示当前规模、较基期变化、影响及迷你趋势图，点击父级后在右侧横向展开具体业务类别；资产卡片同时展示当前重定价规模和当前总生息资产规模。重定价久期的末级业务使用 `dashboard-domain.js` 中完整的 7 类资产、8 类负债分类，将规模和久期作为一个整体因素计算合计影响，不再分别计算规模影响和久期影响；业务卡片展示“规模较基期、久期较基期、影响”三项，并以左轴规模（亿元）、右轴久期（年）的双轴迷你图同时展示两个输入因素的历史趋势。法人汇总保留内部交易类别卡片但按零规模计算，单个境外分行包含内部交易
- 模拟测算包含新业务模拟、套期交易模拟，以及预留的净利息收入入口
- 重定价缺口率模拟测算与计算过程共用同一机构口径和同一矩阵指标函数：法人汇总剔除内部交易，单个境外分行包含内部交易，负债端始终不含活期存款；应用测算后，总值、四个父分支和末级业务卡片必须逐层闭合。基准表和结果表中不计入指标的行会显示“（不计入指标）”，分组总计也只汇总当前指标口径内的业务

流动性风险：

- 流动性覆盖率 LCR
- 净稳定资金比率 NSFR
- 流动性缺口，期限支持 `1D / 7D / 30D / 3M / 1Y`，仅 `30D` 支持时点/月日均切换，其余期限仅为时点口径
- 流动性缺口使用“含内部交易”口径：到期表内外资产（含内部交易）= 到期表内外资产 + 表外收入 + 内部交易资产；到期表内外负债（含内部交易）= 到期表内外负债 + 表外支出 + 内部交易负债。不得将上述两个汇总节点标记为“剔除内部交易”
- 未来逐日资金流及右侧明细，与业务变动分析的流动性风险视角共用 23 个明细业务类别；图例按“资产及表外收入”“负债及表外支出”分段
- LCR、NSFR、流动性比例、流动性缺口及缺口率可做计算过程拆解；流动性缺口柱状图进入缺口规模加减分解，缺口率折线进入比例分解
- 所有计算过程统一采用分层对称替换（Shapley）归因：同层节点影响之和等于父节点影响，顶层分子与分母影响之和等于最终风险指标变动；线性加减直接归因，除法、`max`、乘法及境外资本分摊按实际公式对所有替换顺序取平均
- 模拟测算包含新业务模拟，以及预留的流动性压力测试入口
- 应用流动性缺口模拟测算后，图中基准缺口/缺口率、弹出摘要和计算过程必须来自同一个诊断模型；模拟现金流表只能提供净流入、净流出层级时，计算过程将基准累计流入映射为到期资产、将“累计流入－累计缺口”映射为调整活期后的到期负债，确保公式和逐层加总闭合

通用交互要求：所有可点击 SVG 数据点或柱形分段必须同时具备 `role="button"`、`tabindex="0"` 和可读的 `aria-label`，不得位于 `aria-hidden="true"` 的 SVG 内，并支持 Enter/空格触发与鼠标单击相同的行为。

业务变动分析：

- 存量业务
- 新发生业务
- 到期业务
- 利率风险视角展示生息资产、付息负债及利率/久期字段
- 流动性风险视角展示 23 个明细业务类别，并按资产、表外收入、负债、表外支出组织；一览表展示规模、平均利率、平均原始期限或平均剩余期限，明细表展示业务编号、客户、日期、币种、金额、利率和期限等基础业务属性，不重复未来逐日资金流或监管指标计算字段
- 两个视角的结构表均支持明细穿透
- 所有一级页面的页面级时间筛选只允许用户修改结束时间；开始时间继续按原默认规则自动确定且不显示。业务变动分析使用独立于利率风险和流动性风险的月末结束时间，统一控制业务变动分析的月度横轴及结构/明细统计范围
- 新发生和历史到期均按月比较本月末与上月末的业务编号明细截面，逐月形成独立的月度轧差明细表；月度图按统计月份汇总，一览表和明细清单按用户所选月末区间汇总对应月份的月度明细表，不得根据所选区间首尾时点重新轧差，也不再使用逐日轧差口径；区间控件只能选择月末日期
- 未来合同到期的区间控件同样只能选择月末日期，并基于业务变动分析所选结束月末的存量业务及合同到期日进行推演
- 新发生、到期的月度图、一览表和明细清单均提供“口径说明”，同一业务分区内各组件展示统一的月末轧差逻辑

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
