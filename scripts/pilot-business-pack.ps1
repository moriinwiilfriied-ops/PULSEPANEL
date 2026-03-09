#Requires -Version 5.1
# PulsePanel — Initialiser un dossier local pour l'exécution pilot business
# Copie le template prospects et liste les docs clés. Usage : depuis la racine, .\scripts\pilot-business-pack.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = if ($PSScriptRoot) { Resolve-Path (Join-Path $PSScriptRoot "..") } else { Get-Location }

$TargetDir = Join-Path $RepoRoot "pilot-business"
$DocsDir = Join-Path $RepoRoot "docs"
$TemplateCsv = Join-Path $DocsDir "pilot-prospects-template.csv"

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

$DestCsv = Join-Path $TargetDir "prospects.csv"
Copy-Item -Path $TemplateCsv -Destination $DestCsv -Force
Write-Host "[OK] Copie: pilot-prospects-template.csv -> pilot-business/prospects.csv" -ForegroundColor Green

Write-Host "`n--- Docs pilot business (dans docs/) ---" -ForegroundColor Cyan
$links = @(
    "pilot-offer-one-pager.md",
    "pilot-icp-and-segmentation.md",
    "pilot-pipeline-minimum.md",
    "outreach-templates-pilot.md",
    "checklist-onboard-pilot-company.md",
    "checklist-post-campaign-proof-repeat.md",
    "lead-to-repeat-runbook.md"
)
foreach ($f in $links) {
    $p = Join-Path $DocsDir $f
    if (Test-Path $p) { Write-Host "  - docs/$f" -ForegroundColor Gray } else { Write-Host "  - docs/$f (absent)" -ForegroundColor Yellow }
}
Write-Host "`n[OK] Pack business prêt. Éditer pilot-business/prospects.csv pour suivre les prospects." -ForegroundColor Green
