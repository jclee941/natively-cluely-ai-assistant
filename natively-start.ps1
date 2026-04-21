# Natively Interview Copilot - Quick Start
$ErrorActionPreference = 'Stop'
$root = 'C:\natively-cluely-ai-assistant'

Set-Location $root

Write-Host '=== Natively Interview Copilot ===' -ForegroundColor Cyan
Write-Host ''

# 1. Git pull
Write-Host '[1/4] git pull...' -ForegroundColor Yellow
git pull 2>&1 | Out-Null
Write-Host '  OK' -ForegroundColor Green

# 2. Clean build cache
Write-Host '[2/4] clean build cache...' -ForegroundColor Yellow
if (Test-Path dist-electron) { Remove-Item -Recurse -Force dist-electron }
if (Test-Path node_modules\.vite) { Remove-Item -Recurse -Force node_modules\.vite }
Write-Host '  OK' -ForegroundColor Green

# 3. Rebuild native if needed
$native = Join-Path $root 'native-module\index.win32-x64-msvc.node'
if (-not (Test-Path $native)) {
    Write-Host '[3/4] build native module...' -ForegroundColor Yellow
    npm run build:native 2>&1 | Out-Null
    Write-Host '  OK' -ForegroundColor Green
} else {
    Write-Host '[3/4] native module exists, skip' -ForegroundColor Green
}

# 4. Start
Write-Host '[4/4] starting...' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Proxy: http://192.168.50.114:8317/v1 (CLIProxyAPI)' -ForegroundColor DarkGray
Write-Host 'Model: gemini-3.1-pro-low' -ForegroundColor DarkGray
Write-Host 'ELK:   http://192.168.50.105:9200' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Custom Notes: Settings > Custom Notes' -ForegroundColor Magenta
Write-Host '  gangnamunni -> http://192.168.50.215:9000/interview/custom-notes-gangnamunni.txt' -ForegroundColor DarkGray
Write-Host '  daangn      -> http://192.168.50.215:9000/interview/custom-notes-daangn.txt' -ForegroundColor DarkGray
Write-Host ''
npm start
