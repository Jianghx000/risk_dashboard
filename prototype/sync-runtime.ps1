param(
  [string]$CacheStamp = (Get-Date -Format "yyyyMMddHHmm")
)

$ErrorActionPreference = "Stop"

$prototypeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = Join-Path $prototypeDir "index.html"

$syncPairs = @(
  @{ Source = "app.js"; Target = "app.v20260410.js" },
  @{ Source = "dashboard-data.js"; Target = "dashboard-data.v20260410.js" },
  @{ Source = "dashboard-config.js"; Target = "dashboard-config.v20260410.js" },
  @{ Source = "mock-data-adapter.js"; Target = "mock-data-adapter.v20260410.js" },
  @{ Source = "styles.css"; Target = "styles.v20260416.css" }
)

foreach ($pair in $syncPairs) {
  $sourcePath = Join-Path $prototypeDir $pair.Source
  $targetPath = Join-Path $prototypeDir $pair.Target

  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Missing source file: $sourcePath"
  }

  Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
}

if (-not (Test-Path -LiteralPath $indexPath)) {
  throw "Missing index file: $indexPath"
}

$content = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8

$patterns = @(
  @{ Pattern = '\./styles\.v20260416\.css(\?v=\d+)?'; Replacement = "./styles.v20260416.css?v=$CacheStamp" },
  @{ Pattern = '\./dashboard-data\.v20260410\.js(\?v=\d+)?'; Replacement = "./dashboard-data.v20260410.js?v=$CacheStamp" },
  @{ Pattern = '\./dashboard-config\.v20260410\.js(\?v=\d+)?'; Replacement = "./dashboard-config.v20260410.js?v=$CacheStamp" },
  @{ Pattern = '\./mock-data-adapter\.v20260410\.js(\?v=\d+)?'; Replacement = "./mock-data-adapter.v20260410.js?v=$CacheStamp" },
  @{ Pattern = '\./app\.v20260410\.js(\?v=\d+)?'; Replacement = "./app.v20260410.js?v=$CacheStamp" }
)

foreach ($entry in $patterns) {
  $updated = [regex]::Replace($content, $entry.Pattern, $entry.Replacement)
  if ($updated -eq $content) {
    throw "Pattern not found in index.html: $($entry.Pattern)"
  }
  $content = $updated
}

Set-Content -LiteralPath $indexPath -Value $content -Encoding UTF8

Write-Host "Runtime files synced." -ForegroundColor Green
Write-Host "Cache stamp: $CacheStamp"
Write-Host "Updated files:"
foreach ($pair in $syncPairs) {
  Write-Host "  $($pair.Source) -> $($pair.Target)"
}
Write-Host "  index.html query string updated"
