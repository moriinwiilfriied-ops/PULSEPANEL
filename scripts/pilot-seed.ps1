#Requires -Version 5.1
# PulsePanel — Seed pilot (démo / staging). NE PAS exécuter en production.
# Garde-fou : PILOT_SEED_ENABLED=1 + APP_ENV != production + confirmation explicite.

$ErrorActionPreference = "Stop"
$RepoRoot = if ($PSScriptRoot) { Resolve-Path (Join-Path $PSScriptRoot "..") } else { Get-Location }
Set-Location $RepoRoot

# ---------- Garde-fou anti-prod ----------
$envEnabled = $env:PILOT_SEED_ENABLED -eq "1"
$envProd = $env:APP_ENV -eq "production"
$envSafe = $env:APP_ENV -eq "staging" -or $env:APP_ENV -eq "development" -or $env:APP_ENV -eq "pilot" -or -not $env:APP_ENV

if (-not $envEnabled) {
  Write-Host "REFUS: PILOT_SEED_ENABLED n'est pas à 1. Définir PILOT_SEED_ENABLED=1 pour autoriser le seed." -ForegroundColor Red
  Write-Host "Exemple: `$env:PILOT_SEED_ENABLED='1'; .\scripts\pilot-seed.ps1" -ForegroundColor Gray
  exit 2
}

if ($envProd) {
  Write-Host "REFUS: APP_ENV=production. Le seed pilot ne doit pas tourner en production." -ForegroundColor Red
  exit 2
}

Write-Host "`n=== PulsePanel — Seed pilot ===" -ForegroundColor Cyan
Write-Host "Environnement: APP_ENV=$($env:APP_ENV ?? 'non défini'), PILOT_SEED_ENABLED=1" -ForegroundColor Gray
Write-Host "Ce script va insérer l'org 'PulsePanel Pilot' et 5 campagnes [Pilot] (paused)." -ForegroundColor Gray
$confirm = Read-Host "Tapez YES pour confirmer"
if ($confirm -ne "YES") {
  Write-Host "Annulé (confirmation non reçue)." -ForegroundColor Yellow
  exit 1
}

$sqlPath = Join-Path $RepoRoot "supabase\seed\pilot_seed.sql"
if (-not (Test-Path $sqlPath)) {
  Write-Host "Fichier introuvable: $sqlPath" -ForegroundColor Red
  exit 2
}

# ---------- Exécution ----------
$supabase = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabase) {
  Write-Host "Exécution via Supabase CLI..." -ForegroundColor Cyan
  $sql = Get-Content $sqlPath -Raw -Encoding UTF8
  $sql | supabase db execute --stdin 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Échec. Si le projet est Supabase Cloud sans lien local, exécutez le SQL à la main (voir ci-dessous)." -ForegroundColor Yellow
    Write-Host "Fichier: $sqlPath" -ForegroundColor Gray
    exit 1
  }
  Write-Host "Seed pilot terminé. Vérifiez l'org 'PulsePanel Pilot' et les campagnes [Pilot] dans le dashboard." -ForegroundColor Green
} else {
  Write-Host "Supabase CLI non trouvé. Exécutez le SQL manuellement dans Supabase Dashboard > SQL Editor:" -ForegroundColor Yellow
  Write-Host "  $sqlPath" -ForegroundColor Gray
  Write-Host "Uniquement en environnement staging / dev / pilot." -ForegroundColor Gray
  exit 0
}
