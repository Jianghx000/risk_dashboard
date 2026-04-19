# AI操作守则

1. 业务结构变化先改 [prototype/dashboard-data.js](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\dashboard-data.js) 和 [prototype/dashboard-config.js](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\dashboard-config.js)。
2. 展示和交互变化再改 [prototype/app.js](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\app.js) 和 [prototype/styles.css](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\styles.css)。
3. 不要在 `app.js` 里临时拼业务结构、补业务标题、合并区域或偷偷修正数据定义层错误。
4. 每次改完先运行 `npm run validate:dashboard`。
5. 每次改完再运行 `npm run smoke`。
6. 每次改完都要重新打开 [prototype/index.html](E:\招行\资产负债管理部\ALM系统\risk_dashboard\prototype\index.html) 做实际页面检查。
7. 发现结构问题先查 `dashboard-data.js / dashboard-config.js`，不要先怀疑 `app.js`。
8. 提交前先看 `git status`，确认没有无关文件混入。
9. 验收通过后执行 `commit + push`，不要只停在本地修改。
