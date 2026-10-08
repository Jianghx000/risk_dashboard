$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repo
$python = Join-Path $repo ".venv-ai\Scripts\python.exe"
if (-not (Test-Path $python)) {
    throw "找不到 $python。请先在项目根目录创建 .venv-ai 并安装 repricing_gap_workflow 的依赖。"
}
$env:PYTHONUTF8 = "1"
$env:PYTHONPATH = Join-Path $repo "AI编排"
$port = 9028

function Test-CanvasReady {
    param([int]$candidatePort)
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$candidatePort/healthz" -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and ($response.Content | ConvertFrom-Json).service -eq "almcanvas"
    } catch {
        return $false
    }
}

while ($port -lt 9050) {
    $url = "http://127.0.0.1:$port/workflow"
    if (Test-CanvasReady $port) {
        Start-Process $url
        Write-Host "服务已在运行，已打开 $url"
        exit 0
    }
    if (-not (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)) {
        break
    }
    $port++
}
if ($port -ge 9050) { throw "9028-9049 没有空闲端口。" }

$opener = Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList @(
    "-NoProfile",
    "-Command",
    "Start-Sleep -Seconds 2; for (`$i = 0; `$i -lt 25; `$i++) { try { Invoke-WebRequest -Uri http://127.0.0.1:$port/healthz -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process '$url'; break } catch { Start-Sleep -Seconds 1 } }"
) -PassThru

Write-Host "正在启动行内复刻图： $url"
Write-Host "关闭本窗口或按 Ctrl+C 会停止服务。"
& $python -m uvicorn almcanvas.server:app --host 127.0.0.1 --port $port
