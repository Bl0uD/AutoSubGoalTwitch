# ===================================================================
#  INSTALLEUR AUTOMATIQUE - AutoSubGoalTwitch v2.2.0
# ===================================================================

$ErrorActionPreference = "Continue"

# Définir l'encodage UTF-8 pour éviter les problèmes d'affichage
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "     INSTALLEUR AUTOSUBGOALTWITCH v2.2.0" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

# Aller dans le dossier du projet (remonter d'un niveau depuis scripts/)
$scriptDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $scriptDir

Write-Host "Dossier d'installation: $scriptDir" -ForegroundColor Yellow
Write-Host ""

# ==================================================================
# FONCTION: Télécharger un fichier avec barre de progression
# ==================================================================
function Download-File {
    param(
        [string]$Url,
        [string]$Output
    )
    
    try {
        Write-Host "   Telechargement depuis: $Url" -ForegroundColor Gray
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($Url, $Output)
        Write-Host "   [OK] Fichier telecharge: $Output" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "   [ERREUR] Echec du telechargement: $_" -ForegroundColor Red
        return $false
    }
}

# ==================================================================
# FONCTION: Vérifier et installer Git
# ==================================================================
function Install-Git {
    Write-Host "=== VERIFICATION DE GIT ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Vérifier si Git est déjà installé
    try {
        $gitVersion = git --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] Git est deja installe: $gitVersion" -ForegroundColor Green
            return $true
        }
    } catch {
        # Git n'est pas installé
    }
    
    Write-Host "   [INFO] Git n'est pas installe" -ForegroundColor Yellow
    Write-Host ""
    
    # Demander confirmation
    $response = Read-Host "   Voulez-vous installer Git automatiquement? (O/N)"
    if ($response -ne "O" -and $response -ne "o") {
        Write-Host "   [SKIP] Installation de Git annulee" -ForegroundColor Yellow
        Write-Host "   Telechargez manuellement: https://git-scm.com/download/win" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host ""
    Write-Host "   Installation de Git en cours..." -ForegroundColor Yellow
    
    # URL de téléchargement Git (version 64-bit)
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
    $gitInstaller = Join-Path $env:TEMP "Git-Installer.exe"
    
    # Télécharger Git
    Write-Host "   Telechargement de Git..." -ForegroundColor Yellow
    if (-not (Download-File -Url $gitUrl -Output $gitInstaller)) {
        Write-Host "   [ERREUR] Impossible de telecharger Git" -ForegroundColor Red
        Write-Host "   Telechargez manuellement: https://git-scm.com/download/win" -ForegroundColor Yellow
        return $false
    }
    
    # Installer Git en mode silencieux
    Write-Host "   Installation de Git (cela peut prendre quelques minutes)..." -ForegroundColor Yellow
    try {
        $installArgs = @(
            "/VERYSILENT",
            "/NORESTART",
            "/NOCANCEL",
            "/SP-",
            "/CLOSEAPPLICATIONS",
            "/RESTARTAPPLICATIONS",
            "/COMPONENTS=`"icons,ext\shellhere,assoc,assoc_sh`"",
            "/DIR=`"C:\Program Files\Git`""
        )
        
        Start-Process -FilePath $gitInstaller -ArgumentList $installArgs -Wait -NoNewWindow
        
        # Nettoyer
        Remove-Item $gitInstaller -Force -ErrorAction SilentlyContinue
        
        # Ajouter Git au PATH pour cette session
        $env:Path += ";C:\Program Files\Git\cmd"
        
        Write-Host "   [OK] Git installe avec succes" -ForegroundColor Green
        Write-Host "   [INFO] Redemarrez PowerShell pour utiliser Git globalement" -ForegroundColor Yellow
        
        return $true
    } catch {
        Write-Host "   [ERREUR] Echec de l'installation: $_" -ForegroundColor Red
        Remove-Item $gitInstaller -Force -ErrorAction SilentlyContinue
        return $false
    }
}

# ==================================================================
# FONCTION: Vérifier et installer Node.js
# ==================================================================
function Install-NodeJS {
    Write-Host ""
    Write-Host "=== VERIFICATION DE NODE.JS ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Vérifier si Node.js est déjà installé
    try {
        $nodeVersion = node --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] Node.js est deja installe: $nodeVersion" -ForegroundColor Green
            return $true
        }
    } catch {
        # Node.js n'est pas installé
    }
    
    Write-Host "   [INFO] Node.js n'est pas installe" -ForegroundColor Yellow
    Write-Host ""
    
    # Demander confirmation
    $response = Read-Host "   Voulez-vous installer Node.js automatiquement? (O/N)"
    if ($response -ne "O" -and $response -ne "o") {
        Write-Host "   [SKIP] Installation de Node.js annulee" -ForegroundColor Yellow
        Write-Host "   Telechargez manuellement: https://nodejs.org" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host ""
    Write-Host "   Installation de Node.js en cours..." -ForegroundColor Yellow
    
    # URL de téléchargement Node.js LTS (version 20.x)
    $nodeUrl = "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"
    $nodeInstaller = Join-Path $env:TEMP "NodeJS-Installer.msi"
    
    # Télécharger Node.js
    Write-Host "   Telechargement de Node.js..." -ForegroundColor Yellow
    if (-not (Download-File -Url $nodeUrl -Output $nodeInstaller)) {
        Write-Host "   [ERREUR] Impossible de telecharger Node.js" -ForegroundColor Red
        Write-Host "   Telechargez manuellement: https://nodejs.org" -ForegroundColor Yellow
        return $false
    }
    
    # Installer Node.js en mode silencieux
    Write-Host "   Installation de Node.js (cela peut prendre quelques minutes)..." -ForegroundColor Yellow
    try {
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait -NoNewWindow
        
        # Nettoyer
        Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
        
        # Recharger les variables d'environnement
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "   [OK] Node.js installe avec succes" -ForegroundColor Green
        Write-Host "   [INFO] Redemarrez PowerShell pour utiliser Node.js globalement" -ForegroundColor Yellow
        
        return $true
    } catch {
        Write-Host "   [ERREUR] Echec de l'installation: $_" -ForegroundColor Red
        Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
        return $false
    }
}

# ==================================================================
# FONCTION: Vérifier et installer Python 3.6.8
# ==================================================================
function Install-Python {
    Write-Host ""
    Write-Host "=== VERIFICATION DE PYTHON ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Vérifier si Python 3.6.8 est déjà installé
    $python368Installed = $false
    try {
        $pythonVersion = python --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [INFO] Python detecte: $pythonVersion" -ForegroundColor Cyan
            
            # Vérifier si c'est exactement la version 3.6.8
            if ($pythonVersion -match "Python 3\.6\.8") {
                Write-Host "   [OK] Python 3.6.8 est deja installe" -ForegroundColor Green
                return $true
            } else {
                Write-Host "   [ATTENTION] Version differente de 3.6.8 detectee" -ForegroundColor Yellow
                Write-Host "   Ce projet necessite specifiquement Python 3.6.8" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "   [INFO] Python n'est pas installe" -ForegroundColor Yellow
    }
    
    if (-not $python368Installed) {
        Write-Host "   [INFO] Python 3.6.8 n'est pas installe" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # Demander confirmation
    $response = Read-Host "   Voulez-vous installer Python 3.6.8 automatiquement? (O/N)"
    if ($response -ne "O" -and $response -ne "o") {
        Write-Host "   [SKIP] Installation de Python annulee" -ForegroundColor Yellow
        Write-Host "   Telechargez manuellement: https://www.python.org/downloads/release/python-368/" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host ""
    Write-Host "   Installation de Python 3.6.8 en cours..." -ForegroundColor Yellow
    
    # URL de téléchargement Python 3.6.8 (64-bit)
    $pythonUrl = "https://www.python.org/ftp/python/3.6.8/python-3.6.8-amd64.exe"
    $pythonInstaller = Join-Path $env:TEMP "Python-3.6.8-Installer.exe"
    
    # Télécharger Python
    Write-Host "   Telechargement de Python 3.6.8..." -ForegroundColor Yellow
    if (-not (Download-File -Url $pythonUrl -Output $pythonInstaller)) {
        Write-Host "   [ERREUR] Impossible de telecharger Python" -ForegroundColor Red
        Write-Host "   Telechargez manuellement: https://www.python.org/downloads/release/python-368/" -ForegroundColor Yellow
        return $false
    }
    
    # Installer Python en mode silencieux
    Write-Host "   Installation de Python (cela peut prendre quelques minutes)..." -ForegroundColor Yellow
    try {
        $installArgs = @(
            "/quiet",
            "InstallAllUsers=1",
            "PrependPath=1",
            "Include_test=0",
            "Include_pip=1",
            "Include_doc=0"
        )
        
        Start-Process -FilePath $pythonInstaller -ArgumentList $installArgs -Wait -NoNewWindow
        
        # Nettoyer
        Remove-Item $pythonInstaller -Force -ErrorAction SilentlyContinue
        
        # Recharger les variables d'environnement
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "   [OK] Python 3.6.8 installe avec succes" -ForegroundColor Green
        Write-Host "   [INFO] Redemarrez PowerShell pour utiliser Python globalement" -ForegroundColor Yellow
        
        return $true
    } catch {
        Write-Host "   [ERREUR] Echec de l'installation: $_" -ForegroundColor Red
        Remove-Item $pythonInstaller -Force -ErrorAction SilentlyContinue
        return $false
    }
}

# ==================================================================
# FONCTION: Installer les dépendances npm
# ==================================================================
function Install-NpmDependencies {
    Write-Host ""
    Write-Host "=== INSTALLATION DES DEPENDANCES NPM ===" -ForegroundColor Cyan
    Write-Host ""
    
    $serverPath = Join-Path $scriptDir "server"
    
    if (-not (Test-Path $serverPath)) {
        Write-Host "   [ERREUR] Dossier server/ introuvable" -ForegroundColor Red
        return $false
    }
    
    Set-Location $serverPath
    
    Write-Host "   Installation des dependances npm..." -ForegroundColor Yellow
    try {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] Dependances npm installees" -ForegroundColor Green
            Set-Location $scriptDir
            return $true
        } else {
            Write-Host "   [ERREUR] Echec de l'installation npm" -ForegroundColor Red
            Set-Location $scriptDir
            return $false
        }
    } catch {
        Write-Host "   [ERREUR] Erreur lors de l'installation: $_" -ForegroundColor Red
        Set-Location $scriptDir
        return $false
    }
}

# ==================================================================
# FONCTION: Installer les dépendances Python
# ==================================================================
function Install-PythonDependencies {
    Write-Host ""
    Write-Host "=== INSTALLATION DES DEPENDANCES PYTHON ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Vérifier si Python est installé
    try {
        $pythonVersion = python --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   [ERREUR] Python n'est pas installe" -ForegroundColor Red
            Write-Host "   Telechargez Python 3.6+: https://www.python.org/downloads/" -ForegroundColor Yellow
            return $false
        }
        Write-Host "   [OK] Python detecte: $pythonVersion" -ForegroundColor Green
    } catch {
        Write-Host "   [ERREUR] Python introuvable" -ForegroundColor Red
        Write-Host "   Telechargez Python 3.6+: https://www.python.org/downloads/" -ForegroundColor Yellow
        return $false
    }
    
    # Liste des modules Python requis
    $pythonModules = @("psutil", "requests", "websocket-client")

    Write-Host "   Installation des modules Python..." -ForegroundColor Yellow
    $allInstalled = $true

    # Détecter quel exécutable Python utiliser (python ou py)
    $pythonExe = $null
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $pythonExe = "python"
    } elseif (Get-Command py -ErrorAction SilentlyContinue) {
        # Utiliser le launcher py pour forcer la version 3
        $pythonExe = "py -3"
    } else {
        Write-Host "   [ERREUR] Python introuvable dans PATH. Installez Python 3.6+ puis relancez." -ForegroundColor Red
        return $false
    }

    # S'assurer que pip est disponible
    Write-Host "   Verification de pip..." -ForegroundColor Gray
    $pipOk = $true
    try {
        & $pythonExe -m pip --version > $null 2>&1
        if ($LASTEXITCODE -ne 0) { throw 'pip non trouve' }
    } catch {
        Write-Host "   pip introuvable - tentative d'installation via ensurepip..." -ForegroundColor Yellow
        try {
            & $pythonExe -m ensurepip --upgrade > $null 2>&1
            & $pythonExe -m pip install --upgrade pip setuptools wheel > $null 2>&1
        } catch {
            Write-Host "   [ERREUR] Impossible d'installer pip automatiquement. Veuillez installer pip manuellement." -ForegroundColor Red
            $pipOk = $false
        }
    }

    if (-not $pipOk) {
        return $false
    }

    # Mettre a jour pip/setuptools/wheel pour maximiser les chances d'obtenir des wheels binaires
    Write-Host "   Mise a jour de pip, setuptools et wheel..." -ForegroundColor Gray
    try {
        & $pythonExe -m pip install --upgrade pip setuptools wheel > $null 2>&1
    } catch {
        Write-Host "   [WARN] Echec mise a jour pip (on continue)" -ForegroundColor Yellow
    }

    foreach ($module in $pythonModules) {
        Write-Host "   - Installation de $module (preference binaire, mode user)..." -ForegroundColor Gray
        $installed = $false

        # 1) Essayer d'installer en mode --user et privilegier les wheels precompiles
        try {
            & $pythonExe -m pip install --user --prefer-binary $module
            if ($LASTEXITCODE -eq 0) { $installed = $true; Write-Host "     [OK] $module installe (user)" -ForegroundColor Green }
        } catch {
            Write-Host "     [WARN] Installation --user a echoue pour $module" -ForegroundColor Yellow
        }

        # 2) Si echec, essayer sans --user (peut necessiter droits admin)
        if (-not $installed) {
            try {
                & $pythonExe -m pip install --prefer-binary $module
                if ($LASTEXITCODE -eq 0) { $installed = $true; Write-Host "     [OK] $module installe (global)" -ForegroundColor Green }
            } catch {
                Write-Host "     [WARN] Installation globale a echoue pour $module" -ForegroundColor Yellow
            }
        }

        # 3) Si toujours echec et module est psutil, afficher aide specifique
        if (-not $installed) {
            if ($module -ieq 'psutil') {
                Write-Host "     [ERREUR] Impossible d'installer 'psutil'. Sur Windows, installez les 'Build Tools for Visual Studio' si necessaire :" -ForegroundColor Red
                Write-Host "       https://learn.microsoft.com/fr-fr/cpp/build/building-on-windows" -ForegroundColor Yellow
                Write-Host "       Ou installez une roue binaire manuellement: https://pypi.org/project/psutil/#files" -ForegroundColor Yellow
            } else {
                Write-Host "     [ERREUR] Impossible d'installer '$module' via pip." -ForegroundColor Red
            }
            $allInstalled = $false
        }
    }

    if ($allInstalled) {
        Write-Host "   [OK] Tous les modules Python sont installes" -ForegroundColor Green
        return $true
    } else {
        Write-Host "   [ATTENTION] Certaines installations ont echoue. Voir les messages ci-dessus." -ForegroundColor Yellow
        return $false
    }
}

# ==================================================================
# FONCTION: Créer les dossiers nécessaires
# ==================================================================
function Create-Directories {
    Write-Host ""
    Write-Host "=== CREATION DES DOSSIERS ===" -ForegroundColor Cyan
    Write-Host ""
    
    $dirs = @("data", "logs", "backups", "config")
    
    foreach ($dir in $dirs) {
        $dirPath = Join-Path $scriptDir $dir
        if (-not (Test-Path $dirPath)) {
            New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
            Write-Host "   [OK] Dossier cree: $dir" -ForegroundColor Green
        } else {
            Write-Host "   [SKIP] Dossier existe: $dir" -ForegroundColor Gray
        }
    }
    
    return $true
}

# ==================================================================
# FONCTION: Créer les fichiers de configuration
# ==================================================================
function Create-ConfigFiles {
    Write-Host ""
    Write-Host "=== CONFIGURATION INITIALE ===" -ForegroundColor Cyan
    Write-Host ""
    
    $configPath = Join-Path $scriptDir "config"
    $dataPath = Join-Path $scriptDir "data"
    
    # Copier les fichiers .example vers data/ s'ils n'existent pas
    $exampleFiles = Get-ChildItem -Path $configPath -Filter "*.example" -ErrorAction SilentlyContinue
    
    foreach ($exampleFile in $exampleFiles) {
        $targetName = $exampleFile.Name -replace "\.example$", ""
        $targetPath = Join-Path $dataPath $targetName
        
        if (-not (Test-Path $targetPath)) {
            Copy-Item -Path $exampleFile.FullName -Destination $targetPath -Force
            Write-Host "   [OK] Fichier cree: data\$targetName" -ForegroundColor Green
        } else {
            Write-Host "   [SKIP] Fichier existe: data\$targetName" -ForegroundColor Gray
        }
    }
    
    # Créer twitch_config.txt s'il n'existe pas
    $twitchConfigPath = Join-Path $dataPath "twitch_config.txt"
    if (-not (Test-Path $twitchConfigPath)) {
        $twitchConfigContent = "your_client_id:your_client_secret:your_channel_name"
        Set-Content -Path $twitchConfigPath -Value $twitchConfigContent -Encoding UTF8
        Write-Host "   [OK] Fichier cree: data\twitch_config.txt" -ForegroundColor Green
        Write-Host "   [INFO] Editez ce fichier avec vos identifiants Twitch" -ForegroundColor Yellow
    } else {
        Write-Host "   [SKIP] Fichier existe: data\twitch_config.txt" -ForegroundColor Gray
    }
    
    # Créer overlay_config.json s'il n'existe pas
    $overlayConfigPath = Join-Path $configPath "overlay_config.json"
    if (-not (Test-Path $overlayConfigPath)) {
        $overlayConfigContent = @"
{
  "font": {
    "family": "SEA",
    "size": "64px",
    "weight": "normal"
  },
  "colors": {
    "text": "white",
    "shadow": "rgba(0,0,0,0.5)",
    "stroke": "black"
  },
  "animation": {
    "duration": "1s",
    "easing": "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
  },
  "layout": {
    "paddingLeft": "20px",
    "gap": "0"
  }
}
"@
        Set-Content -Path $overlayConfigPath -Value $overlayConfigContent -Encoding UTF8
        Write-Host "   [OK] Fichier cree: config\overlay_config.json" -ForegroundColor Green
    } else {
        Write-Host "   [SKIP] Fichier existe: config\overlay_config.json" -ForegroundColor Gray
    }
    
    return $true
}

# ==================================================================
# EXECUTION PRINCIPALE
# ==================================================================

Write-Host "Demarrage de l'installation..." -ForegroundColor Yellow
Write-Host ""

# Étape 1: Installer Git
$gitInstalled = Install-Git

# Étape 2: Installer Node.js
$nodeInstalled = Install-NodeJS

# Étape 3: Installer Python 3.6.8
$pythonInstalled = Install-Python

# Étape 4: Créer les dossiers
$dirsCreated = Create-Directories

# Étape 5: Installer les dépendances Python (modules)
$pythonModulesInstalled = $false
if ($pythonInstalled -or (Get-Command python -ErrorAction SilentlyContinue)) {
    $pythonModulesInstalled = Install-PythonDependencies
} else {
    Write-Host ""
    Write-Host "   [SKIP] Installation modules Python ignoree (Python non disponible)" -ForegroundColor Yellow
    Write-Host "   Telechargez Python 3.6.8: https://www.python.org/downloads/release/python-368/" -ForegroundColor Yellow
}

# Étape 6: Installer les dépendances npm (seulement si Node.js est disponible)
$npmInstalled = $false
if ($nodeInstalled -or (Get-Command node -ErrorAction SilentlyContinue)) {
    $npmInstalled = Install-NpmDependencies
} else {
    Write-Host ""
    Write-Host "   [SKIP] Installation npm ignoree (Node.js non disponible)" -ForegroundColor Yellow
}

# Étape 7: Créer les fichiers de configuration
$configCreated = Create-ConfigFiles

# ==================================================================
# RÉSUMÉ
# ==================================================================

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "              RESUME DE L'INSTALLATION" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Git:                " -NoNewline
if ($gitInstalled) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "A INSTALLER" -ForegroundColor Red }

Write-Host "Node.js:            " -NoNewline
if ($nodeInstalled) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "A INSTALLER" -ForegroundColor Red }

Write-Host "Python 3.6.8:       " -NoNewline
if ($pythonInstalled) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "A INSTALLER" -ForegroundColor Red }

Write-Host "Python modules:     " -NoNewline
if ($pythonModulesInstalled) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "A INSTALLER" -ForegroundColor Yellow }

Write-Host "Dependances npm:    " -NoNewline
if ($npmInstalled) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "A INSTALLER" -ForegroundColor Yellow }

Write-Host "Dossiers:           " -NoNewline
if ($dirsCreated) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "ERREUR" -ForegroundColor Red }

Write-Host "Configuration:      " -NoNewline
if ($configCreated) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "ERREUR" -ForegroundColor Red }

Write-Host ""

# ==================================================================
# INSTRUCTIONS FINALES
# ==================================================================

if ($gitInstalled -and $nodeInstalled -and $pythonInstalled -and $npmInstalled) {
    Write-Host "===================================================================" -ForegroundColor Green
    Write-Host "         INSTALLATION TERMINEE AVEC SUCCES !" -ForegroundColor Green
    Write-Host "===================================================================" -ForegroundColor Green
    Write-Host ""
    
    # Afficher le chemin d'installation de Python pour OBS
    Write-Host "===================================================================" -ForegroundColor Cyan
    Write-Host "     CHEMIN PYTHON POUR OBS (ETAPE IMPORTANTE)" -ForegroundColor Cyan
    Write-Host "===================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        # Récupérer le chemin d'installation Python
        $pythonPath = $null
        
        # Méthode 1: Utiliser where.exe (Windows)
        $wherePython = where.exe python 2>$null
        if ($wherePython) {
            if ($wherePython -is [array]) {
                $pythonPath = $wherePython[0]
            } else {
                $pythonPath = $wherePython
            }
        }
        
        # Méthode 2: Utiliser Get-Command si where.exe échoue
        if (-not $pythonPath) {
            $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
            if ($pythonCmd) {
                $pythonPath = $pythonCmd.Source
            }
        }
        
        if ($pythonPath) {
            # Obtenir le dossier d'installation (sans python.exe)
            $pythonDir = Split-Path -Parent $pythonPath
            
            Write-Host "Chemin complet Python:" -ForegroundColor White
            Write-Host "  $pythonPath" -ForegroundColor Green
            Write-Host ""
            Write-Host "Dossier a copier pour OBS:" -ForegroundColor Yellow
            Write-Host "  $pythonDir" -ForegroundColor Cyan
            Write-Host ""
        } else {
            Write-Host "[ATTENTION] Impossible de detecter Python automatiquement" -ForegroundColor Yellow
            Write-Host "Tapez 'where python' dans PowerShell pour le trouver" -ForegroundColor White
            Write-Host ""
        }
    } catch {
        Write-Host "[ATTENTION] Erreur detection Python" -ForegroundColor Yellow
        Write-Host "Tapez 'where python' dans PowerShell" -ForegroundColor White
        Write-Host ""
    }
    
    Write-Host "===================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "PROCHAINES ETAPES:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. OUVRIR OBS STUDIO" -ForegroundColor White
    Write-Host ""
    Write-Host "2. CONFIGURER PYTHON DANS OBS:" -ForegroundColor White
    Write-Host "   a) Allez dans: Outils > Scripts" -ForegroundColor Cyan
    Write-Host "   b) Onglet 'Parametres Python'" -ForegroundColor Cyan
    Write-Host "   c) Collez le dossier Python affiche ci-dessus" -ForegroundColor Green
    Write-Host "      (le chemin qui contient python.exe)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. AJOUTER LE SCRIPT OBS:" -ForegroundColor White
    Write-Host "   a) Toujours dans Outils > Scripts" -ForegroundColor Cyan
    Write-Host "   b) Onglet 'Scripts'" -ForegroundColor Cyan
    Write-Host "   c) Cliquez sur le bouton '+'" -ForegroundColor Cyan
    Write-Host "   d) Selectionnez: obs\obs_subcount_auto.py" -ForegroundColor Green
    Write-Host ""
    Write-Host "4. REDEMARRER OBS" -ForegroundColor White
    Write-Host "   (necessaire pour charger le script correctement)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. SE CONNECTER A TWITCH:" -ForegroundColor White
    Write-Host "   a) Ouvrez: Outils > Scripts" -ForegroundColor Cyan
    Write-Host "   b) Selectionnez le script obs_subcount_auto.py" -ForegroundColor Cyan
    Write-Host "   c) Cliquez sur le bouton 'Se connecter a Twitch'" -ForegroundColor Green
    Write-Host ""
    Write-Host "6. AJOUTER LES OVERLAYS:" -ForegroundColor White
    Write-Host "   a) Source > Navigateur" -ForegroundColor Cyan
    Write-Host "   b) Les fichiers HTML sont dans: obs\overlays\" -ForegroundColor Green
    Write-Host "      - subgoal_left.html (objectif abonne gauche)" -ForegroundColor Gray
    Write-Host "      - subgoal_right.html (objectif abonne droite)" -ForegroundColor Gray
    Write-Host "      - followgoal_left.html (objectif follow gauche)" -ForegroundColor Gray
    Write-Host "      - followgoal_right.html (objectif follow droite)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "7. DEMARRER LE SERVEUR:" -ForegroundColor White
    Write-Host "   Executez: .\scripts\START_SERVER.bat" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "===================================================================" -ForegroundColor Yellow
    Write-Host "         INSTALLATION INCOMPLETE" -ForegroundColor Yellow
    Write-Host "===================================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Certains composants n'ont pas pu etre installes." -ForegroundColor Yellow
    Write-Host "Verifiez les erreurs ci-dessus et reessayez." -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $gitInstalled) {
        Write-Host "Git: https://git-scm.com/download/win" -ForegroundColor White
    }
    if (-not $nodeInstalled) {
        Write-Host "Node.js: https://nodejs.org" -ForegroundColor White
    }
    if (-not $pythonInstalled) {
        Write-Host "Python: https://www.python.org/downloads/" -ForegroundColor White
    }
    Write-Host ""
}

Write-Host "Documentation complete: README.md" -ForegroundColor Gray
Write-Host ""

pause
Write-Host ""

pause
