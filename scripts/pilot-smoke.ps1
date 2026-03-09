#Requires -Version 5.1
# PulsePanel — Smoke check pilot (avant démo / pilot)
# Vérifie : env minimal, structure projet, docs critiques, build/typecheck si raisonnable.
# Usage : depuis la racine du repo, .\scripts\pilot-smoke.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = if ($PSScriptRoot) { Resolve-Path (Join-Path $PSScriptRoot "..") } else { Get-Location }
Set-Location $RepoRoot

$PASS = 0
$WARN = 0
$FAIL = 0

function Write-Pass { param($Msg) $script:PASS++; Write-Host "  [PASS] $Msg" -ForegroundColor Green }
function Write-Warn { param($Msg) $script:WARN++; Write-Host "  [WARN] $Msg" -ForegroundColor Yellow }
function Write-Fail { param($Msg) $script:FAIL++; Write-Host "  [FAIL] $Msg" -ForegroundColor Red }

Write-Host "`n=== PulsePanel — Pilot smoke check ===" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot`n" -ForegroundColor Gray

# --- 1) Structure ---
Write-Host ">> 1) Structure projet" -ForegroundColor Cyan
if (Test-Path (Join-Path $RepoRoot "dashboard\package.json")) { Write-Pass "dashboard/package.json" } else { Write-Fail "dashboard/package.json manquant" }
if (Test-Path (Join-Path $RepoRoot "mobile\package.json"))     { Write-Pass "mobile/package.json" } else { Write-Fail "mobile/package.json manquant" }
if (Test-Path (Join-Path $RepoRoot "supabase\migrations"))     { Write-Pass "supabase/migrations" } else { Write-Warn "supabase/migrations manquant" }
if (Test-Path (Join-Path $RepoRoot "docs"))                     { Write-Pass "docs/" } else { Write-Fail "docs/ manquant" }

# --- 2) Env minimal (présence fichiers, pas de lecture des secrets) ---
Write-Host "`n>> 2) Config env (fichiers présents)" -ForegroundColor Cyan
$dashEnv = Join-Path $RepoRoot "dashboard\.env.local"
if (-not (Test-Path $dashEnv)) { $dashEnv = Join-Path $RepoRoot "dashboard\.env" }
if (Test-Path $dashEnv) { Write-Pass "dashboard env (.env.local ou .env)" } else { Write-Warn "dashboard: pas de .env.local ni .env (copier depuis .env.example)" }

$mobileEnv = Join-Path $RepoRoot "mobile\.env"
if (Test-Path $mobileEnv) { Write-Pass "mobile/.env" } else { Write-Warn "mobile/.env manquant (copier depuis .env.example)" }

$dashExample = Join-Path $RepoRoot "dashboard\.env.example"
if (Test-Path $dashExample) { Write-Pass "dashboard .env.example présent" } else { Write-Warn "dashboard .env.example absent" }

# --- 3) Routes / pages clés (fichiers attendus) ---
Write-Host "`n>> 3) Routes / pages clés" -ForegroundColor Cyan
$keyPaths = @(
  "dashboard\app\billing\page.tsx",
  "dashboard\app\campaigns\new\page.tsx",
  "dashboard\app\admin\page.tsx",
  "dashboard\app\admin\login\page.tsx",
  "dashboard\app\admin\webhooks\page.tsx",
  "dashboard\app\api\stripe\create-checkout\route.ts",
  "dashboard\app\api\stripe\webhook\route.ts",
  "mobile\app\(tabs)\wallet.tsx",
  "mobile\app\answer.tsx"
)
foreach ($p in $keyPaths) {
  $full = Join-Path $RepoRoot $p
  if (Test-Path $full) { Write-Pass $p } else { Write-Fail $p }
}

# --- 4) Docs critiques ---
Write-Host "`n>> 4) Docs pilot critiques" -ForegroundColor Cyan
$docs = @(
  "docs\pilot-critical-scenarios.md",
  "docs\checklist-launch-campaign.md",
  "docs\checklist-review-withdrawal.md",
  "docs\checklist-support-incident.md",
  "docs\demo-script-10min.md",
  "docs\pilot-evidence-matrix.md",
  "docs\pilot-seed-quickstart.md",
  "docs\pilot-seed-dataset.md"
)
foreach ($d in $docs) {
  $full = Join-Path $RepoRoot $d
  if (Test-Path $full) { Write-Pass $d } else { Write-Fail $d }
}

# --- 5) Dashboard typecheck (raisonnable) ---
Write-Host "`n>> 5) Dashboard typecheck" -ForegroundColor Cyan
$dashboardPath = Join-Path $RepoRoot "dashboard"
if (Test-Path (Join-Path $dashboardPath "node_modules")) {
  Push-Location $dashboardPath
  try {
    $out = & npm exec -- tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Pass "tsc --noEmit" } else { Write-Warn "tsc --noEmit a échoué (vérifier manuellement)" }
  } finally { Pop-Location }
} else {
  Write-Warn "dashboard/node_modules absent (npm install puis relancer)"
}

# --- 5b) Dashboard build (prelaunch gate, WARN si échec pour ne pas bloquer le smoke) ---
Write-Host "`n>> 5b) Dashboard build (prelaunch)" -ForegroundColor Cyan
if (Test-Path (Join-Path $dashboardPath "node_modules")) {
  Push-Location $dashboardPath
  try {
    $null = & npm run build 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Pass "next build" } else { Write-Warn "next build a échoué (gate stricte: .\scripts\prelaunch-dashboard-check.ps1)" }
  } finally { Pop-Location }
} else {
  Write-Warn "dashboard/node_modules absent — skip build"
}

# --- 6) Mobile config minimale ---
Write-Host "`n>> 6) Mobile config" -ForegroundColor Cyan
if (Test-Path (Join-Path $RepoRoot "mobile\app.json")) { Write-Pass "mobile/app.json" } else { Write-Warn "mobile/app.json manquant (Expo peut utiliser app.config.*)" }
$appConfig = Get-ChildItem (Join-Path $RepoRoot "mobile") -Filter "app.config.*" -ErrorAction SilentlyContinue
if ($appConfig) { Write-Pass "mobile app.config.* présent" } elseif (-not (Test-Path (Join-Path $RepoRoot "mobile\app.json"))) { Write-Warn "mobile: ni app.json ni app.config.*" }

# --- Résumé ---
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PASS: $PASS | WARN: $WARN | FAIL: $FAIL" -ForegroundColor $(if ($FAIL -gt 0) { "Red" } elseif ($WARN -gt 0) { "Yellow" } else { "Green" })
Write-Host "========================================`n" -ForegroundColor Cyan
if ($FAIL -gt 0) { exit 1 }
exit 0
