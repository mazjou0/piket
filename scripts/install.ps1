# SIPAKAR - Script Instalasi Otomatis (Windows PowerShell)
# Jalankan: .\scripts\install.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host "  SIPAKAR - Instalasi Otomatis" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# 1. Cek Node.js
Write-Host "`n[1/7] Memeriksa Node.js..." -ForegroundColor Yellow
try {
    $nodeVer = node --version
    Write-Host "  Node.js $nodeVer ditemukan" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js tidak ditemukan. Install dari https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. Cek Docker
Write-Host "[2/7] Memeriksa Docker..." -ForegroundColor Yellow
try {
    $dockerVer = docker --version
    Write-Host "  $dockerVer ditemukan" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Docker tidak ditemukan. Pastikan PostgreSQL berjalan manual." -ForegroundColor Yellow
}

# 3. Install backend dependencies
Write-Host "[3/7] Install backend dependencies..." -ForegroundColor Yellow
Set-Location "$Root\backend"
npm install
Write-Host "  Backend dependencies terinstall" -ForegroundColor Green

# 4. Install frontend dependencies
Write-Host "[4/7] Install frontend dependencies..." -ForegroundColor Yellow
Set-Location "$Root\frontend"
npm install
Write-Host "  Frontend dependencies terinstall" -ForegroundColor Green

# 5. Copy .env files
Write-Host "[5/7] Setup environment files..." -ForegroundColor Yellow
Set-Location $Root

if (-not (Test-Path "$Root\backend\.env")) {
    Copy-Item "$Root\backend\.env.example" "$Root\backend\.env"
    Write-Host "  backend\.env dibuat dari .env.example" -ForegroundColor Green
} else {
    Write-Host "  backend\.env sudah ada, dilewati" -ForegroundColor Gray
}

if (-not (Test-Path "$Root\frontend\.env")) {
    Copy-Item "$Root\frontend\.env.example" "$Root\frontend\.env"
    Write-Host "  frontend\.env dibuat dari .env.example" -ForegroundColor Green
} else {
    Write-Host "  frontend\.env sudah ada, dilewati" -ForegroundColor Gray
}

# 6. Start PostgreSQL via Docker
Write-Host "[6/7] Menjalankan PostgreSQL via Docker..." -ForegroundColor Yellow
try {
    docker compose -f "$Root\docker-compose.dev.yml" up -d postgres
    Write-Host "  Menunggu PostgreSQL siap..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    Write-Host "  PostgreSQL berjalan" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Tidak bisa start Docker. Pastikan PostgreSQL sudah berjalan." -ForegroundColor Yellow
}

# 7. Run migrations & seed
Write-Host "[7/7] Menjalankan database migration dan seed..." -ForegroundColor Yellow
Set-Location "$Root\backend"
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js

Write-Host "`n=====================================================" -ForegroundColor Green
Write-Host "  INSTALASI SELESAI!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "`nCara menjalankan aplikasi:" -ForegroundColor Cyan
Write-Host "  Backend : cd backend && npm run dev" -ForegroundColor White
Write-Host "  Frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "`nURL Aplikasi:" -ForegroundColor Cyan
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor White
Write-Host "  Backend  : http://localhost:3001" -ForegroundColor White
Write-Host "  API Docs : http://localhost:3001/api-docs" -ForegroundColor White
Write-Host "  PgAdmin  : http://localhost:5050" -ForegroundColor White
Write-Host "`nLogin default:" -ForegroundColor Cyan
Write-Host "  Super Admin : superadmin / Admin@123" -ForegroundColor White
Write-Host "  Admin       : admin / Admin@123" -ForegroundColor White
Write-Host "  BK          : bk.konselor / Admin@123" -ForegroundColor White
Write-Host ""
