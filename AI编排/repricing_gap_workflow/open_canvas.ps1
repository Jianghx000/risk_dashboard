$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repo
$python = Join-Path $repo ".venv-ai\Scripts\python.exe"
if (-not (Test-Path $python)) {
    throw "找不到 $python。请先在项目根目录创建 .venv-ai 并安装 repricing_gap_workflow 的依赖。"
}
$env:PYTHONUTF8 = "1"
$env:PYTHONPATH = Join-Path $repo "AI编排"
if ($env:ALM_AI_MODE -ne "mock") {
    & $python -c "from repricing_gap_workflow.settings import load_model_settings; load_model_settings()"
    if ($LASTEXITCODE -ne 0) {
        throw "未找到百炼密钥。请在 AI编排/aliyun_api_key.env 写入 API_KEY=...，或设 ALM_AI_MODE=mock 做离线调试。"
    }
}
$url = "http://127.0.0.1:9028/workflow"

function Test-CanvasReady {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:9028/healthz" -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

if (Test-CanvasReady) {
    Start-Process $url
    Write-Host "服务已在运行，已打开 $url"
    exit 0
}

$opener = Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList @(
    "-NoProfile",
    "-Command",
    "Start-Sleep -Seconds 2; for (`$i = 0; `$i -lt 25; `$i++) { try { Invoke-WebRequest -Uri http://127.0.0.1:9028/healthz -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process '$url'; break } catch { Start-Sleep -Seconds 1 } }"
) -PassThru

Write-Host "正在启动行内复刻图： $url"
Write-Host "关闭本窗口或按 Ctrl+C 会停止服务。"
& $python -m uvicorn repricing_gap_workflow.server:app --host 127.0.0.1 --port 9028
