#Requires -Version 5.1
# PulsePanel — Initialiser un dossier local pour le suivi user-supply (acquisition user pilot)
# Copie le template CSV et liste les docs clés. Usage : depuis la racine, .\scripts\user-supply-pack.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = if ($PSScriptRoot) { Resolve-Path (Join-Path $PSScriptRoot "..") } else { Get-Location }

$TargetDir = Join-Path $RepoRoot "user-pilot"
$DocsDir = Join-Path $RepoRoot "docs"
$TemplateCsv = Join-Path $DocsDir "user-sources-template.csv"

if (-not (Test-Path $TemplateCsv)) {
    Write-Host "[FAIL] Template absent: $TemplateCsv" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    Write-Host "[OK] Dossier créé: $TargetDir" -ForegroundColor Green
} else {
    Write-Host "[OK] Dossier existant: $TargetDir" -ForegroundColor Gray
}

$DestCsv = Join-Path $TargetDir "user-sources.csv"
Copy-Item -Path $TemplateCsv -Destination $DestCsv -Force
Write-Host "[OK] Copie: user-sources-template.csv -> user-pilot/user-sources.csv" -ForegroundColor Green

Write-Host "`n--- Docs user-supply / acquisition (dans docs/) ---" -ForegroundColor Cyan
$links = @(
    "user-pilot-supply-plan.md",
    "user-source-segmentation.md",
    "user-recruitment-templates.md",
    "checklist-user-pilot-quality.md",
    "user-supply-pipeline-minimum.md",
    "user-acquisition-fraud-guardrails-runbook.md",
    "checklist-source-to-first-campaign.md"
)
foreach ($f in $links) {
    $p = Join-Path $DocsDir $f
    if (Test-Path $p) { Write-Host "  - docs/$f" -ForegroundColor Gray } else { Write-Host "  - docs/$f (absent)" -ForegroundColor Yellow }
}
Write-Host "`n[OK] Pack user-supply prêt. Éditer user-pilot/user-sources.csv pour suivre les sources." -ForegroundColor Green
