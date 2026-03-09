#Requires -Version 5.1
# PulsePanel — Reset seed pilot (staging / dev). Supprime uniquement l'org pilot et ses données.
# Garde-fou : PILOT_SEED_ENABLED=1 + pas en production + confirmation.

$ErrorActionPreference = "Stop"
$RepoRoot = if ($PSScriptRoot) { Resolve-Path (Join-Path $PSScriptRoot "..") } else { Get-Location }
Set-Location $RepoRoot

if ($env:PILOT_SEED_ENABLED -ne "1") {
  Write-Host "REFUS: PILOT_SEED_ENABLED != 1" -ForegroundColor Red
  exit 2
}
if ($env:APP_ENV -eq "production") {
  Write-Host "REFUS: APP_ENV=production" -ForegroundColor Red
  exit 2
}

Write-Host "Reset pilot: suppression de l'org 'PulsePanel Pilot' et des campagnes [Pilot]." -ForegroundColor Yellow
$confirm = Read-Host "Tapez YES pour confirmer"
if ($confirm -ne "YES") { Write-Host "Annulé." -ForegroundColor Gray; exit 1 }

$sqlPath = Join-Path $RepoRoot "supabase\seed\pilot_reset.sql"
if (-not (Test-Path $sqlPath)) { Write-Host "Fichier introuvable: $sqlPath" -ForegroundColor Red; exit 2 }

$supabase = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabase) {
  Get-Content $sqlPath -Raw -Encoding UTF8 | supabase db execute --stdin 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Host "Reset pilot terminé." -ForegroundColor Green } else { exit 1 }
} else {
  Write-Host "Exécutez manuellement dans Supabase SQL Editor: $sqlPath" -ForegroundColor Yellow
}
