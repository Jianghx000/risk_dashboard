# 行内工作流复刻图工具

复刻工具负责读取、检查和展示行内节点配置。业务 LangGraph、模拟数据与模型调用由各工作流自己的服务负责。

双击项目根目录 `打开行内复刻图.bat`，或者在根目录执行：

```powershell
$env:PYTHONPATH = "$PWD\AI编排"
.venv-ai\Scripts\python.exe -m uvicorn almcanvas.server:app --host 127.0.0.1 --port 9028
```

打开 `http://127.0.0.1:9028/workflow`，顶部选择工作流。查看画布不需要模型密钥。现有业务运行接口仍由 `repricing_gap_workflow.server` 提供，可在另一个端口启动。

## 新工作流的交付契约

1. 放入 `AI编排/metrics/<workflow>/blueprint.spec.json`，格式见 `../docs/spec-schema.md`。每个目录代表一条工作流，不要求一个指标只有一条工作流。
2. spec 必须提供完整节点类型、入参来源、输出声明、配置、脚本/Prompt 全文、条件分支和失败走向。API 未注册、分支合并或会话配置待确认时，在 `inlineNotes` 中明确标注 warning。
3. `meta.runtime` 是可选的本地映射说明。工具能够展示没有 LangGraph 映射的 spec；不能把这种展示称为已验证执行图。
4. 工作流开发者提供正常、澄清、数据不可用和修正失败等验证用例，并分别验证本地实现与可复制脚本。结构检查通过不代表两者业务行为已完全一致。
5. 运行以下验收命令，再生成离线蓝图。新 spec 放入目录后可自动发现；修改已加载 spec 后重启服务更新缓存。

```powershell
$env:PYTHONPATH = "$PWD\AI编排"
.venv-ai\Scripts\python.exe -m almcanvas.validate AI编排/metrics/<workflow>/blueprint.spec.json
.venv-ai\Scripts\python.exe AI编排/scripts/render_blueprint.py AI编排/metrics/<workflow>/blueprint.spec.json AI编排/metrics/<workflow>/blueprint.html
```

检查覆盖必需字段、连线端点、实际环、输入变量声明、上游可达性和已登记的可自动验证平台约束。变量检查目前检查输出变量根及连线可达性，嵌套字段类型和分支结果是否在所有路径可用仍需用例和行内实测确认。

LangGraph 自动提供的是执行拓扑。开发者仍需填写行内配置与节点映射；本工具不执行任意交来的 Python 文件，也不自动推断 API 注册和平台会话设置。

## 本次调整的边界

保留原 spec v1、离线渲染器和业务服务。独立服务只依赖复刻格式，不编译重定价试点来充当其他工作流的执行图。页面模板暂由现有文件共用，避免复制两个维护版本。

重定价试点复制脚本已补充币种、基期、频率和澄清参数，并允许合法不可用状态透传。正式日期清单须由调用方提供。输出校验脚本与本地运行时的全部口气门禁尚未共享，不能据此宣称完全等价；修正链同名输出覆盖也须在行内平台实测。
