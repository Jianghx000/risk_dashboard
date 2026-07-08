# AI 操作守则

1. 先判断需求属于“业务结构变化”还是“展示交互变化”。
2. 业务结构变化优先修改 `prototype/dashboard-data.js`、`prototype/dashboard-config.js`、`prototype/dashboard-domain.js`。
3. 展示和交互变化再修改 `prototype/dashboard-utils.js`、`prototype/app.js`、`prototype/dashboard-interest-renderers.js`、`prototype/dashboard-business-renderers.js`、`prototype/dashboard-liquidity-renderers.js`、`prototype/dashboard-simulation.js`、`prototype/dashboard-processes.js`、`prototype/dashboard-renderers.js`、`prototype/dashboard-events.js`、`prototype/styles.css`。
4. 不要在 `app.js` 里临时拼业务结构、隐藏废弃组件、补业务标题、承载共享工具函数、承载领域图表渲染或修正数据定义层错误。
5. 不要恢复已删除的旧层级：`核心风险指标`、`缺口风险`、`现金流错配`。
6. 不要恢复已删除的废弃组件序号：`5 / 8 / 10 / 11 / 16 / 17`。
7. 不要在 `dashboard-renderers.js` 注册 `dashboard-config.js` 没有使用的 renderer kind。
8. 每次改完先运行 `npm run validate:dashboard`，再运行 `npm run smoke`，常规收口用 `npm run check`。
9. 修改样式后要打开 `prototype/index.html` 做实际页面检查。
10. 提交前先看 `git status`，确认没有本地截图、压缩包、测试产物等无关文件混入。
11. 验收通过后再按用户要求提交或推送。
