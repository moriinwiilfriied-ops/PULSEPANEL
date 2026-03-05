$ErrorActionPreference = "Stop"

$repo = Join-Path $HOME "Desktop\PulsePanel"
if (!(Test-Path $repo)) { throw "Repo introuvable: $repo" }
Set-Location $repo

Write-Host "== 1) Fix Git (evite .git sur le Bureau) ==" -ForegroundColor Cyan

$desktopGit = Join-Path $HOME "Desktop\.git"
if (Test-Path $desktopGit) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $bak = Join-Path $HOME "Desktop\.git.BAK-$stamp"
  Write-Host ">> .git detecte sur Desktop -> move vers $bak" -ForegroundColor Yellow
  Move-Item -Force $desktopGit $bak
}

# init git au bon endroit si absent
if (!(Test-Path (Join-Path $repo ".git"))) {
  Write-Host ">> git init dans PulsePanel" -ForegroundColor Cyan
  git init | Out-Host
}

Write-Host "== 2) Rebuild mobile (Expo tabs template) via pnpm (Corepack) ==" -ForegroundColor Cyan

# backup mobile existant (au lieu de delete sauvage)
if (Test-Path (Join-Path $repo "mobile")) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $bakMobile = Join-Path $repo "mobile.BAK-$stamp"
  Write-Host ">> mobile/ existe -> backup vers $bakMobile" -ForegroundColor Yellow
  Move-Item -Force (Join-Path $repo "mobile") $bakMobile
}

# active corepack + pnpm
Write-Host ">> corepack enable + pnpm" -ForegroundColor Cyan
corepack enable | Out-Null
corepack prepare pnpm@latest --activate | Out-Null
pnpm -v | Out-Host

# create Expo project (tabs template)
# IMPORTANT: template "tabs" est un template officiel create-expo-app (Router + TS).
Write-Host ">> pnpm dlx create-expo-app@latest mobile --template tabs" -ForegroundColor Cyan
pnpm dlx create-expo-app@latest mobile --template tabs

if (!(Test-Path (Join-Path $repo "mobile\package.json"))) {
  throw "mobile n'a pas ete cree correctement (package.json manquant)."
}

Write-Host "== 3) Create dashboard si pas complet ==" -ForegroundColor Cyan

if (!(Test-Path (Join-Path $repo "dashboard\package.json"))) {
  # backup dashboard existant si c'est un placeholder
  if (Test-Path (Join-Path $repo "dashboard")) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $bakDash = Join-Path $repo "dashboard.BAK-$stamp"
    Write-Host ">> dashboard/ incomplet -> backup vers $bakDash" -ForegroundColor Yellow
    Move-Item -Force (Join-Path $repo "dashboard") $bakDash
  }

  Write-Host ">> npx create-next-app@latest dashboard ..." -ForegroundColor Cyan
  # si npx re-plante, on fera aussi via pnpm create, mais testons d'abord
  npx --yes create-next-app@latest dashboard --yes --typescript --tailwind --eslint --app --no-src-dir
}

Write-Host "== 4) Sanity check ==" -ForegroundColor Green
Get-ChildItem -Force $repo | Out-Host
Write-Host "OK. Next: run dev scripts." -ForegroundColor Green
