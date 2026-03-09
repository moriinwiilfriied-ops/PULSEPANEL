#Requires -Version 5.1
# PulsePanel — Gate GO/NO-GO : prelaunch + smoke puis rappel des docs dry run
# Usage : depuis la racine du repo, .\scripts\pilot-go-no-go.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = if ($PSScriptRoot) { Resolve-Path (Join-Path $PSScriptRoot "..") } else { Get-Location }
Set-Location $RepoRoot

Write-Host "`n=== PulsePanel — GO/NO-GO gate ===" -ForegroundColor Cyan
Write-Host "1) Prelaunch dashboard check" -ForegroundColor Gray
& (Join-Path $RepoRoot "scripts\prelaunch-dashboard-check.ps1")
$prelaunchExit = $LASTEXITCODE
if ($prelaunchExit -ne 0) {
  Write-Host "`n[STOP] Prelaunch a échoué. Corriger avant lancement. Docs : docs\prelaunch-technical-checklist.md" -ForegroundColor Red
  exit $prelaunchExit
}

Write-Host "`n2) Pilot smoke" -ForegroundColor Gray
& (Join-Path $RepoRoot "scripts\pilot-smoke.ps1")
$smokeExit = $LASTEXITCODE
if ($smokeExit -ne 0) {
  Write-Host "`n[STOP] Smoke a échoué (FAIL). Corriger avant lancement." -ForegroundColor Red
  exit $smokeExit
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Gates techniques : OK" -ForegroundColor Green
Write-Host "  Rappel docs dry run / lancement :" -ForegroundColor Gray
Write-Host "    - docs\pilot-go-no-go-matrix.md" -ForegroundColor Gray
Write-Host "    - docs\pilot-dry-run-report.md" -ForegroundColor Gray
Write-Host "    - docs\launch-day-checklist.md" -ForegroundColor Gray
Write-Host "    - docs\post-launch-watchpoints.md" -ForegroundColor Gray
Write-Host "    - docs\pilot-critical-scenarios.md" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan
exit 0
