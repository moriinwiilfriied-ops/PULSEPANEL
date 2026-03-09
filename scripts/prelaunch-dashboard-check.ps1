#Requires -Version 5.1
# PulsePanel — Gate pré-lancement dashboard (typecheck + build)
# Usage : depuis la racine du repo, .\scripts\prelaunch-dashboard-check.ps1
# Sortie : 0 = OK, 1 = échec (typecheck ou build).

$ErrorActionPreference = "Stop"
$RepoRoot = if ($PSScriptRoot) { Resolve-Path (Join-Path $PSScriptRoot "..") } else { Get-Location }
$DashboardPath = Join-Path $RepoRoot "dashboard"

Set-Location $RepoRoot

Write-Host "`n=== PulsePanel — Prelaunch dashboard check ===" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot`n" -ForegroundColor Gray

if (-not (Test-Path (Join-Path $DashboardPath "node_modules"))) {
  Write-Host "[FAIL] dashboard/node_modules absent. Exécuter: cd dashboard && npm install" -ForegroundColor Red
  exit 1
}

# 1) Typecheck (tsc --noEmit)
Write-Host ">> 1) Typecheck (tsc --noEmit)" -ForegroundColor Cyan
$tscPath = Join-Path $DashboardPath "node_modules\typescript\bin\tsc"
Push-Location $DashboardPath
try {
  $out = & node $tscPath --noEmit 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host $out -ForegroundColor Red
    Write-Host "[FAIL] typecheck" -ForegroundColor Red
    exit 1
  }
  Write-Host "  [PASS] typecheck" -ForegroundColor Green
} finally {
  Pop-Location
}

# 2) Next build
Write-Host "`n>> 2) Next build" -ForegroundColor Cyan
Push-Location $DashboardPath
try {
  $nodeDir = (Get-Command node -ErrorAction SilentlyContinue).Source | Split-Path
  $npmCmd = Join-Path $nodeDir "npm.cmd"
  if (-not (Test-Path $npmCmd)) { $npmCmd = "npm" }
  $out = & $npmCmd run build 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host $out -ForegroundColor Red
    Write-Host "[FAIL] next build" -ForegroundColor Red
    exit 1
  }
  Write-Host "  [PASS] next build" -ForegroundColor Green
} finally {
  Pop-Location
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Prelaunch dashboard check: PASS" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
exit 0
