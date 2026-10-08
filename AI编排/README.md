# AI 编排

重定价缺口率试点在 `repricing_gap_workflow/`。行内节点骨架已吸收进本目录，不再把共享包当外部工具调用。

复刻图入口现在由独立的 `almcanvas.server` 提供，顶部可以选择工作流，查看时不调用模型。新工作流的交付与验收要求见 [复刻工具说明](almcanvas/README.md)。业务调试继续使用各工作流自己的运行服务。

| 路径 | 来源 | 用途 |
|---|---|---|
| `aiworkflow/` | 共享包 `01-ai-workflow-service` | 脚本/API/Prompt/条件选择器工厂、SSE、校验门禁、装配期无回边检查 |
| `行内平台契约.md` | 共享包 `docs/platform-contract.md` | 14 类节点与流式帧契约 |
| `scripts/render_blueprint.py` | 共享包蓝图渲染器 | spec JSON → 离线 HTML |
| `ui-alm-theme.css` | 共享包 `02-alm-ui-paradigm` token | ALM 色板，画布可逐步引用 |
| `almcanvas/` | 本项目 | 平台约束检查、数字回填、越界表述门禁、指标注册表 |
| `metrics/` | 本项目 | 各指标 `blueprint.spec.json`；新增指标建目录即可 |
| `repricing_gap_workflow/` | 本项目业务 | 虚构 ALM 数据、行内复刻图、七种分析模式 |
| `simple_workflow_demo/` | 本项目最小图 | Studio 演示，不含模型 |

没有吸收：限额管理业务件、龙虾仿真器（Windows 需 WSL）。
