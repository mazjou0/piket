# SIPAKAR - Jalankan Development Mode (Windows)
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Menjalankan SIPAKAR Development..." -ForegroundColor Cyan

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\backend'; npm run dev" -WindowStyle Normal

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\frontend'; npm run dev" -WindowStyle Normal

Write-Host "Backend  : http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend : http://localhost:5173" -ForegroundColor Green
Write-Host "API Docs : http://localhost:3001/api-docs" -ForegroundColor Green
