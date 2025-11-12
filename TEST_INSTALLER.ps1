# ===================================================================
#  TEST INSTALLEUR - Vérifie les prérequis sans installer
# ===================================================================

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "     TEST DE L'INSTALLEUR" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Test 1: Vérifier Git
Write-Host "1. Verification Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] $gitVersion" -ForegroundColor Green
    } else {
        Write-Host "   [SKIP] Git non installe" -ForegroundColor Gray
    }
} catch {
    Write-Host "   [SKIP] Git non installe" -ForegroundColor Gray
}

# Test 2: Vérifier Node.js
Write-Host "2. Verification Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Node.js $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "   [SKIP] Node.js non installe" -ForegroundColor Gray
    }
} catch {
    Write-Host "   [SKIP] Node.js non installe" -ForegroundColor Gray
}

# Test 3: Vérifier npm
Write-Host "3. Verification npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] npm $npmVersion" -ForegroundColor Green
    } else {
        Write-Host "   [SKIP] npm non installe" -ForegroundColor Gray
    }
} catch {
    Write-Host "   [SKIP] npm non installe" -ForegroundColor Gray
}

# Test 4: Vérifier Python
Write-Host "4. Verification Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "   [SKIP] Python non installe" -ForegroundColor Gray
    }
} catch {
    Write-Host "   [SKIP] Python non installe" -ForegroundColor Gray
}

# Test 5: Vérifier pip
Write-Host "5. Verification pip..." -ForegroundColor Yellow
try {
    $pipVersion = python -m pip --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] pip detecte" -ForegroundColor Green
    } else {
        Write-Host "   [SKIP] pip non disponible" -ForegroundColor Gray
    }
} catch {
    Write-Host "   [SKIP] pip non disponible" -ForegroundColor Gray
}

# Test 6: Vérifier les modules Python
Write-Host "6. Verification modules Python..." -ForegroundColor Yellow
$modules = @("psutil", "requests", "websocket")
foreach ($module in $modules) {
    try {
        $check = python -c "import $module" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] $module installe" -ForegroundColor Green
        } else {
            Write-Host "   [SKIP] $module non installe" -ForegroundColor Gray
        }
    } catch {
        Write-Host "   [SKIP] $module non installe" -ForegroundColor Gray
    }
}

# Test 7: Vérifier la structure du projet
Write-Host "7. Verification structure projet..." -ForegroundColor Yellow
$folders = @("data", "logs", "backups", "server", "scripts", "obs")
foreach ($folder in $folders) {
    $path = Join-Path $scriptDir $folder
    if (Test-Path $path) {
        Write-Host "   [OK] Dossier $folder existe" -ForegroundColor Green
    } else {
        Write-Host "   [MANQUANT] Dossier $folder" -ForegroundColor Red
    }
}

# Test 8: Vérifier les fichiers critiques
Write-Host "8. Verification fichiers critiques..." -ForegroundColor Yellow
$files = @(
    "server\server.js",
    "server\package.json",
    "scripts\START_SERVER.bat",
    "subcount_auto.py",
    "INSTALLER.bat",
    "README.md"
)
foreach ($file in $files) {
    $path = Join-Path $scriptDir $file
    if (Test-Path $path) {
        Write-Host "   [OK] $file existe" -ForegroundColor Green
    } else {
        Write-Host "   [MANQUANT] $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "     TEST TERMINE" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

pause
