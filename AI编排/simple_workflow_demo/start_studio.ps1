$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$env:PYTHONUTF8 = "1"
$env:LANGSMITH_TRACING = "false"
$langgraph = Join-Path $PSScriptRoot "..\..\.venv-ai\Scripts\langgraph.exe"
if (-not (Test-Path $langgraph)) {
    throw "找不到 $langgraph。请先在项目根目录创建 .venv-ai 并安装 langgraph-cli[inmem]。"
}
& $langgraph dev --no-browser --port 2024
