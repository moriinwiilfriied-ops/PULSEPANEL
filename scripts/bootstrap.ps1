#Requires -Version 7.0
# VoxSnap — Bootstrap monorepo (mobile + dashboard + supabase)
$ErrorActionPreference = "Stop"

# --- FORCE REPO ROOT (patch auto) ---
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot
# ------------------------------------
Set-StrictMode -Version Latest

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path $Root)) { $Root = Get-Location }
Set-Location $Root

function Write-Step { param($Msg) Write-Host "`n>> $Msg" -ForegroundColor Cyan }
function Write-Ok   { param($Msg) Write-Host "   OK: $Msg" -ForegroundColor Green }
function Write-Warn { param($Msg) Write-Host "   ATTENTION: $Msg" -ForegroundColor Yellow }

# --- 1) Vérifications ---
Write-Step "Vérification des prérequis..."

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js introuvable. Installez Node LTS: https://nodejs.org" }
$v = (node -v) -replace 'v',''
Write-Ok "Node $v"

$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) { throw "npm introuvable (installé avec Node)." }
Write-Ok "npm $(npm -v)"

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) { throw "Git introuvable. Installez: https://git-scm.com" }
Write-Ok "git $(git --version)"

# --- 2) Git init ---
Write-Step "Dépôt Git..."
if (-not (Test-Path (Join-Path $Root ".git"))) {
    git init
    Write-Ok "git init"
} else {
    Write-Ok "dépôt Git déjà initialisé"
}

# --- 3) Mobile (Expo + TypeScript + Expo Router) ---
Write-Step "Scaffold mobile (Expo + TypeScript + Expo Router)..."
$mobilePath = Join-Path $Root "mobile"
if (Test-Path $mobilePath) {
    if (Test-Path (Join-Path $mobilePath "package.json")) {
        Write-Ok "mobile/ existe déjà (package.json présent), skip scaffold"
    } else {
        Remove-Item $mobilePath -Recurse -Force
        & npx --yes create-expo-app@latest mobile --template tabs
        if ($LASTEXITCODE -ne 0) {
            & npx create-expo-app@latest mobile --template blank-typescript
            if ($LASTEXITCODE -eq 0) {
                Set-Location $mobilePath
                & npm install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens
                Set-Location $Root
            }
        }
        if ($LASTEXITCODE -ne 0) { throw "create-expo-app a échoué." }
    }
} else {
    & npx --yes create-expo-app@latest mobile --template tabs
    if ($LASTEXITCODE -ne 0) {
        & npx create-expo-app@latest mobile --template blank-typescript
        if ($LASTEXITCODE -eq 0) {
            Set-Location $mobilePath
            & npm install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens
            Set-Location $Root
        }
    }
    if ($LASTEXITCODE -ne 0) { throw "create-expo-app a échoué." }
}
Write-Ok "mobile/ prêt (Expo + Expo Router)"

# Copie .env.example mobile
$tplMobile = Join-Path $Root "scripts" "templates" "mobile.env.example"
if (Test-Path $tplMobile) {
    Copy-Item $tplMobile (Join-Path $mobilePath ".env.example") -Force
    Write-Ok "mobile/.env.example créé"
}

# --- 4) Dashboard (Next.js + TypeScript + Tailwind) ---
Write-Step "Scaffold dashboard (Next.js + TypeScript + Tailwind)..."
$dashboardPath = Join-Path $Root "dashboard"
if (Test-Path $dashboardPath) {
    if (Test-Path (Join-Path $dashboardPath "package.json")) {
        Write-Ok "dashboard/ existe déjà (package.json présent), skip scaffold"
    } else {
        Remove-Item $dashboardPath -Recurse -Force
        & npx create-next-app@latest dashboard --yes --typescript --tailwind --eslint --app --no-src-dir
        if ($LASTEXITCODE -ne 0) { throw "create-next-app a échoué." }
    }
} else {
    & npx create-next-app@latest dashboard --yes --typescript --tailwind --eslint --app --no-src-dir
    if ($LASTEXITCODE -ne 0) { throw "create-next-app a échoué." }
}
Write-Ok "dashboard/ prêt"

$tplDash = Join-Path $Root "scripts" "templates" "dashboard.env.example"
if (Test-Path $tplDash) {
    Copy-Item $tplDash (Join-Path $dashboardPath ".env.example") -Force
    Write-Ok "dashboard/.env.example créé"
}

# --- 5) Supabase ---
Write-Step "Supabase..."
$supabasePath = Join-Path $Root "supabase"
if (-not (Test-Path $supabasePath)) { New-Item -ItemType Directory -Path $supabasePath | Out-Null }

$supabaseConfig = Join-Path $supabasePath "config.toml"
if (-not (Test-Path $supabaseConfig)) {
    $supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue
    if ($supabaseCli) {
        & supabase init
        if ($LASTEXITCODE -ne 0) { Write-Warn "supabase init a échoué; création des dossiers à la main." }
    }
    if (-not (Test-Path $supabaseConfig)) {
        Write-Warn "Supabase CLI non trouvé ou init échoué. Créez les dossiers manuellement."
        $migrationsPath = Join-Path $supabasePath "migrations"
        $functionsPath = Join-Path $supabasePath "functions"
        if (-not (Test-Path $migrationsPath)) { New-Item -ItemType Directory -Path $migrationsPath | Out-Null }
        if (-not (Test-Path $functionsPath)) { New-Item -ItemType Directory -Path $functionsPath | Out-Null }
        # Placeholder migration
        $placeholderMigration = Join-Path $migrationsPath "00000000000000_placeholder.sql"
        if (-not (Test-Path $placeholderMigration)) {
            Set-Content -Path $placeholderMigration -Value "-- Placeholder: ajoutez vos migrations ici."
        }
        Write-Ok "supabase/migrations et supabase/functions créés (placeholder)"
    }
} else {
    Write-Ok "Supabase déjà initialisé"
}

$migrationsPath = Join-Path $supabasePath "migrations"
$functionsPath = Join-Path $supabasePath "functions"
if (-not (Test-Path $migrationsPath)) { New-Item -ItemType Directory -Path $migrationsPath | Out-Null }
if (-not (Test-Path $functionsPath)) { New-Item -ItemType Directory -Path $functionsPath | Out-Null }
$placeholderMigration = Join-Path $migrationsPath "00000000000000_placeholder.sql"
if (-not (Test-Path $placeholderMigration)) {
    Set-Content -Path $placeholderMigration -Value "-- Placeholder: ajoutez vos migrations ici."
}
$edgePlaceholder = Join-Path $functionsPath "_placeholder.txt"
if (-not (Test-Path $edgePlaceholder)) {
    Set-Content -Path $edgePlaceholder -Value "Edge Functions: ajoutez vos fonctions ici."
}

# --- 6) Package.json racine ---
Write-Step "Package.json racine..."
$rootPkg = Join-Path $Root "package.json"
$rootPkgContent = @"
{
  "name": "voxsnap-monorepo",
  "private": true,
  "scripts": {
    "dev:mobile": "npm run start --prefix mobile",
    "dev:dashboard": "npm run dev --prefix dashboard",
    "lint": "echo 'Lint placeholder'",
    "typecheck": "echo 'Typecheck placeholder'"
  }
}
"@
if (-not (Test-Path $rootPkg)) {
    Set-Content -Path $rootPkg -Value $rootPkgContent -Encoding UTF8
    Write-Ok "package.json racine créé"
} else {
    Write-Ok "package.json racine existe déjà"
}

# --- 7) Résumé ---
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Bootstrap VoxSnap terminé." -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
Write-Host "Commandes à exécuter (à la racine du repo):" -ForegroundColor White
Write-Host "  npm run dev:mobile     # Démarre Expo (dans mobile/)" -ForegroundColor Gray
Write-Host "  npm run dev:dashboard  # Démarre Next.js (dans dashboard/)" -ForegroundColor Gray
Write-Host "`nOù:" -ForegroundColor White
Write-Host "  Racine du repo: $Root" -ForegroundColor Gray
Write-Host "`nOptionnel:" -ForegroundColor White
Write-Host "  - Supabase local: installez Supabase CLI puis 'npx supabase start' (Docker requis)." -ForegroundColor Gray
Write-Host "  - Copiez .env.example en .env (racine, mobile/, dashboard/) et remplissez les clés." -ForegroundColor Gray
Write-Host ""

