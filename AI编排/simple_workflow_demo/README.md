# 简单 LangGraph 演示

给后续 AI 的试点交接见 `AI编排/LangGraph试点交接.md`。

5 个节点：接收问题 → 识别意图 → 取概览或取限额 → 生成回答。不含模型调用，数字写死，用来看图怎么分流。

## 启动

在项目根目录：

```powershell
python -m venv .venv-ai
.\.venv-ai\Scripts\python.exe -m pip install -r .\AI编排\simple_workflow_demo\requirements.txt
$env:PYTHONPATH = "$PWD\AI编排"
.\.venv-ai\Scripts\python.exe -m uvicorn simple_workflow_demo.server:app --host 127.0.0.1 --port 9030
```

打开 `http://127.0.0.1:9030`。

## 验收

```powershell
$env:PYTHONPATH = "$PWD\AI编排"
.\.venv-ai\Scripts\python.exe -m pytest .\AI编排\simple_workflow_demo\tests -q
```

## 接到 LangSmith Studio

在项目根目录的 PowerShell：

```powershell
cd .\AI编排\simple_workflow_demo
$env:PYTHONUTF8 = "1"
$env:LANGSMITH_TRACING = "false"
..\..\.venv-ai\Scripts\langgraph.exe dev --no-browser --port 2024
```

中文 Windows 必须设置 `PYTHONUTF8=1`，否则 `langgraph_api` 会按 GBK 读取 UTF-8 的 `openapi.json` 并报 `UnicodeDecodeError`。也可以直接运行 `.\start_studio.ps1`。

看到 `http://127.0.0.1:2024` 后，回到 Studio 点 **Configure connection**，填：

`http://127.0.0.1:2024`

运行输入用：

```json
{ "question": "限额还有多少空间？" }
```
