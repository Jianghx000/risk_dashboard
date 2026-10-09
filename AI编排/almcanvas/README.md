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

重定价试点已采用 `meta.executionVersion=1` 的单一定义：先填写行内节点、变量绑定和配置，`langgraph_runtime.py` 直接编译这份定义，复刻图读取同一份定义。脚本全文、Prompt、API 参数、条件分支与结束输出均来自 spec。缺少必要配置、不支持的节点、错误输出绑定或分支不一致时拒绝编译。可执行扩展见 `../docs/spec-schema.md`。

当前编译器只实现开始、脚本、API、Prompt、条件选择器、结束；没有声称支持任意 LangGraph 或行内所有节点。执行对象仅为仓库内受控定义，不接收任意外部 Python。传输适配器负责虚拟 HTTP、模型调用，调用方负责会话和权限；不会自动推断正式 API 注册和平台会话设置。

## 本次调整的边界

保留原 spec v1、离线渲染器、业务服务和画布。独立展示服务不会执行脚本或加载 LangGraph；只有业务运行服务编译受控定义。旧的仅展示型 spec 仍能查看，但不能当作已验证的可执行定义。

重定价试点复制脚本已补充币种、基期、频率和澄清参数，并允许合法不可用状态透传。正式日期清单须由调用方提供。输出校验和 Prompt 与本地共用规则：`portable_answer.py` 将共享规则打包到单个 `handler(params)` 中，仅依赖 Python 标准库，不在行内读取文件或导入项目模块。修改共享规则后须同步 spec 中的脚本全文、重新生成离线图，并运行 `tests/test_replica_parity.py` 防止旧脚本残留。

行内完整等价尚未验证：修正链同名输出覆盖、模型/API异常处理、脚本沙盒标准库支持与超时仍需实测。试运行已验证系统 chatHistory 保存每轮输入和最终输出，可由脚本恢复最终输出中的结构化状态；正式 OpenAPI sessionId 衔接仍需联调。编译器将 chatHistory 识别为系统变量，不作为开始节点自定义入参。
