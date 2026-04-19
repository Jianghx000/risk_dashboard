$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    npx playwright install chromium
    npx playwright test scripts/smoke_check.spec.js --reporter=line --workers=1
}
finally {
    Pop-Location
}
