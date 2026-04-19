# 低性能AI交接说明

## 1. 项目定位

- 项目：ALM 系统前端原型
- 目录：[E:\招行\资产负债管理部\ALM系统\risk_dashboard](E:\招行\资产负债管理部\ALM系统\risk_dashboard)
- 入口页：[E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\index.html](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\index.html)
- 当前已切换为：单套源码直接运行，不再维护 `*.v20260410.js / *.v20260416.css` 这类运行版副本
- 当前已接入 git，且默认要求：改完并验收通过后，直接 `commit + push`

## 2. 最高优先级原则

- 所有改动都以“逻辑简洁、内容简洁、交接简洁、真实数据替换简洁”为第一原则
- 不要为了视觉效果引入复杂状态、复杂抽象、复杂构建
- 后续 IT 要替换真实数据，所以业务结构要清楚、稳定、可追踪
- 结构性变化要改源数据定义，不要在渲染层偷偷补丁

## 3. 当前运行文件

- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\index.html](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\index.html)
- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\app.js](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\app.js)
- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\styles.css](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\styles.css)
- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\dashboard-data.js](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\dashboard-data.js)
- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\dashboard-config.js](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\dashboard-config.js)
- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\mock-data-adapter.js](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\mock-data-adapter.js)

## 4. 文件边界

### 4.1 业务结构和业务配置

以下内容必须优先改：

- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\dashboard-data.js](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\dashboard-data.js)
- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\dashboard-config.js](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\dashboard-config.js)

这里负责：

- 一级页面 / 板块 / 区域 / 图表表格 的层级结构
- 图表是否存在、顺序如何、归属哪个区域
- 图表标题、表格标题、区域标题
- 哪些区域应合并，哪些旧区域应直接删除
- 共享筛选和局部筛选的归属位置
- 筛选项 `options`、`defaultValues`、`multi`
- 哪些图和哪些筛选联动，哪些不联动

### 4.2 渲染和交互

以下内容再改：

- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\app.js](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\app.js)
- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\styles.css](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\styles.css)

这里负责：

- 页面渲染
- 图表绘制
- 图例点击联动
- 图表 / 数据切换
- 模拟测算弹窗
- AI 分析弹窗
- 月频 / 日频小 tab
- 样式和布局

### 4.3 明确禁止

不要在 `app.js` 里做这些事：

- 临时拼业务结构
- 临时新增或删除业务图表
- 临时重命名业务标题
- 临时把两个区域“视觉合并”但源数据不改
- 临时补 widget 的业务配置

一句话：  
`dashboard-data.js / dashboard-config.js` 决定“有什么”；`app.js / styles.css` 决定“怎么显示”。

## 5. 当前页面结构

一级页面共 4 个：

- 利率风险
- 流动性风险
- 汇率风险
- 业务变动分析

项目遵循四层结构：

- 第一层：一级页面
- 第二层：板块
- 第三层：区域
- 第四层：图表 / 表格

## 6. 当前已经稳定的关键规则

- 顶部全局时间选择是“开始时间 + 结束时间”
- 图例统一为可点击胶囊式图例
- 很多局部筛选放在图卡左上角或图卡内部，不做复杂弹层
- 多数图卡保留“图表 / 数据”切换
- AI 分析弹窗当前只保留“智能结论”
- 模拟测算已经按风险类型区分字段

## 7. 业务变动分析页当前正确状态

这一页已经是源数据正确，不要再误改回旧版。

### 7.1 结构规则

- `时间序列 / 时点 / 时间区间` 不是隐藏，而是已经应在源数据中直接删除
- 同属第三层级的内容应在源数据中直接合并为一个区域，不要靠渲染层拼

### 7.2 当前三块内容

存量业务：

- 资产负债规模及增速
- 分业务规模及增速
- 资产负债结构一览表

新发生业务：

- 新发生资产负债规模及增速
- 分业务新发生规模及增速
- 新发生业务资产负债结构一览表

到期业务（含静态未来到期）：

- 到期资产负债规模及增速
- 分业务到期规模及增速
- 到期业务资产负债结构一览表

### 7.3 特别规则

- 新发生业务和到期业务里的“时间区间（起止）”只针对各自的一览表，不是顶层共享筛选

## 8. 风险页当前正确状态

### 8.1 模拟测算

- 风险页顶部有“模拟测算”入口
- 利率风险有：
  - 业务发生日期
  - 机构
  - 币种
  - 业务类型
  - 规模
  - 期限
  - 重定价频率
  - 定价方式
- 流动性风险、汇率风险没有“重定价频率 / 定价方式”
- 弹窗里已经删除“模拟预判”
- 模拟结果会叠加到图表最新值位置

### 8.2 AI 分析

- 每张图卡右上有 `AI` 按钮
- 点击后弹出 AI 智能分析弹窗
- 当前只保留“智能结论”

### 8.3 月频 / 日频

之前的混合时间轴已经废弃，不要再往回做。

当前方式是：

- 某些图卡内部有两个小 tab：`月频`、`日频`
- `月频` 走普通月频图逻辑
- `日频` 显示近 33 天逐日数据

## 9. 流动性风险里的一个重要纠正

`资金流入流出规模` 和 `未来逐日资金流` 现在必须理解为：

- 两个独立 widget
- 同一行并排展示
- 不是一个特殊“复合区域”

不要再把它们做回一个特殊拼装图卡。

## 10. 当前新增的护栏

### 10.1 数据 / 配置校验

脚本：

- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\scripts\validate_dashboard.py](E:\招行\资产负债管理部\ALM系统\risk_dashboard\scripts\validate_dashboard.py)

命令：

```powershell
npm run validate:dashboard
```

作用：

- 检查 `dashboard-data.js` 结构是否合法
- 检查 `page/block/area/widget` 必需字段
- 检查 `widget seq` 是否重复
- 检查 `dashboard-config.js` 里引用的 widget 是否真实存在
- 检查 `widgetCount` 等统计值是否一致

### 10.2 最小 smoke check

脚本：

- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\scripts\smoke_check.spec.js](E:\招行\资产负债管理部\ALM系统\risk_dashboard\scripts\smoke_check.spec.js)
- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\scripts\run_smoke_check.ps1](E:\招行\资产负债管理部\ALM系统\risk_dashboard\scripts\run_smoke_check.ps1)

命令：

```powershell
npm run smoke
```

作用：

- 打开入口页
- 检查四个一级页面存在
- 检查业务变动分析 9 个关键标题存在
- 检查模拟测算能打开
- 检查 AI 弹窗能打开

### 10.3 一键检查

```powershell
npm run check
```

## 11. 后续每次修改的标准流程

1. 先判断这是“结构变化”还是“展示变化”
2. 结构变化先改 `dashboard-data.js / dashboard-config.js`
3. 展示变化再改 `app.js / styles.css`
4. 跑：

```powershell
npm run validate:dashboard
npm run smoke
```

5. 重新打开 [E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\index.html](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\index.html) 做实际页面检查
6. 看 `git status`
7. 验收通过后 `commit + push`

## 12. 目前最容易犯错的地方

- 把结构问题放到 `app.js` 里临时补
- 误把“视觉上看起来对”当成“源数据已经正确”
- 改了标题或筛选归属，但只改了页面渲染，没改数据定义
- 把 `资金流入流出规模` 和 `未来逐日资金流` 又拼回一个特殊卡片
- 把月频 / 日频又改回复杂混合时间轴
- 改完不跑校验和 smoke

## 13. 如果只做细节优化，优先改什么

可以做：

- 文案微调
- 样式细调
- 按钮位置微调
- 图卡间距微调
- 标题和说明文字对齐
- 不改变业务结构前提下的交互优化

不要轻易做：

- 大规模重构 `app.js`
- 重新设计数据结构
- 上框架
- 引入复杂构建流程
- 把当前稳定结构再“抽象”一层

## 14. 相关文档

- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\AI操作守则.md](E:\招行\资产负债管理部\ALM系统\risk_dashboard\AI操作守则.md)
- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\前后端边界说明.md](E:\招行\资产负债管理部\ALM系统\risk_dashboard\前后端边界说明.md)
- [E:\招行\资产负债管理部\ALM系统\risk_dashboard\最高优先级原则.md](E:\招行\资产负债管理部\ALM系统\risk_dashboard\最高优先级原则.md)

---

一句话交接：

先分清“结构”还是“展示”；结构改 `dashboard-data/config`，展示改 `app/styles`；改完必须跑 `npm run check`，再打开入口页看实物，最后 `commit + push`。
