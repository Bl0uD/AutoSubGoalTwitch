# ===================================================================
#  SCRIPT DE DEPLOIEMENT GITHUB - AutoSubGoalTwitch v2.1.0
# ===================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "      DEPLOIEMENT GITHUB - AutoSubGoalTwitch v2.1.0" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

# Aller dans le dossier du projet
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Dossier projet: $projectRoot" -ForegroundColor Yellow
Write-Host ""

# Vérifier si Git est installé
Write-Host "Etape 1: Verification de Git..." -ForegroundColor Cyan
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Git installe: $gitVersion" -ForegroundColor Green
    } else {
        throw "Git non installe"
    }
} catch {
    Write-Host "   [ERREUR] Git n'est pas installe" -ForegroundColor Red
    Write-Host ""
    Write-Host "Telechargez et installez Git depuis:" -ForegroundColor Yellow
    Write-Host "https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Apres installation, relancez ce script." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host ""

# Vérifier si .git existe déjà
if (Test-Path ".git") {
    Write-Host "Etape 2: Repository Git deja initialise" -ForegroundColor Cyan
    Write-Host "   [OK] Utilisation du repository existant" -ForegroundColor Green
} else {
    Write-Host "Etape 2: Initialisation du repository Git..." -ForegroundColor Cyan
    git init
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Repository Git initialise" -ForegroundColor Green
    } else {
        Write-Host "   [ERREUR] Echec initialisation Git" -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host ""

# Configurer Git si nécessaire
Write-Host "Etape 3: Configuration Git..." -ForegroundColor Cyan
$gitUserName = git config user.name 2>&1
$gitUserEmail = git config user.email 2>&1

if ([string]::IsNullOrEmpty($gitUserName)) {
    Write-Host "   Configuration du nom d'utilisateur Git..." -ForegroundColor Yellow
    $userName = Read-Host "   Entrez votre nom GitHub"
    git config user.name "$userName"
    Write-Host "   [OK] Nom configure: $userName" -ForegroundColor Green
} else {
    Write-Host "   [OK] Nom Git: $gitUserName" -ForegroundColor Green
}

if ([string]::IsNullOrEmpty($gitUserEmail)) {
    Write-Host "   Configuration de l'email Git..." -ForegroundColor Yellow
    $userEmail = Read-Host "   Entrez votre email GitHub"
    git config user.email "$userEmail"
    Write-Host "   [OK] Email configure: $userEmail" -ForegroundColor Green
} else {
    Write-Host "   [OK] Email Git: $gitUserEmail" -ForegroundColor Green
}

Write-Host ""

# Vérifier si le remote existe
Write-Host "Etape 4: Configuration du remote GitHub..." -ForegroundColor Cyan
$remoteUrl = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Remote origin deja configure: $remoteUrl" -ForegroundColor Green
} else {
    Write-Host "   Ajout du remote GitHub..." -ForegroundColor Yellow
    $repoUrl = "https://github.com/Bl0uD/AutoSubGoalTwitch.git"
    git remote add origin $repoUrl
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Remote ajoute: $repoUrl" -ForegroundColor Green
    } else {
        Write-Host "   [ERREUR] Echec ajout du remote" -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host ""

# Ajouter tous les fichiers
Write-Host "Etape 5: Ajout des fichiers au commit..." -ForegroundColor Cyan
git add .
if ($LASTEXITCODE -eq 0) {
    # Compter les fichiers stagés
    $stagedFiles = git diff --cached --name-only | Measure-Object -Line
    Write-Host "   [OK] $($stagedFiles.Lines) fichiers ajoutes" -ForegroundColor Green
} else {
    Write-Host "   [ERREUR] Echec ajout des fichiers" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""

# Vérifier s'il y a des changements à commiter
$status = git status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    Write-Host "Etape 6: Aucun changement a commiter" -ForegroundColor Yellow
} else {
    Write-Host "Etape 6: Creation du commit initial..." -ForegroundColor Cyan
    git commit -m "Initial commit v2.1.0 - Structure optimisee

- Structure de projet reorganisee et optimisee
- Separation claire: obs/, server/, web/, config/, data/
- Systeme de mise a jour automatique integre
- Device Code Grant Flow pour authentification Twitch
- EventSub WebSocket pour evenements temps reel
- Support follows et subscriptions avec objectifs multiples
- Interface web d'administration complete
- Chiffrement AES-256-GCM des tokens
- Documentation complete"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Commit cree" -ForegroundColor Green
    } else {
        Write-Host "   [ERREUR] Echec creation du commit" -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host ""

# Créer le tag v2.1.0
Write-Host "Etape 7: Creation du tag v2.1.0..." -ForegroundColor Cyan
$tagExists = git tag -l "v2.1.0"
if ($tagExists) {
    Write-Host "   [INFO] Tag v2.1.0 existe deja" -ForegroundColor Yellow
    $response = Read-Host "   Voulez-vous le supprimer et le recreer? (O/N)"
    if ($response -eq "O" -or $response -eq "o") {
        git tag -d v2.1.0
        git tag -a v2.1.0 -m "Version 2.1.0 - Structure optimisee + Auto-update"
        Write-Host "   [OK] Tag v2.1.0 recree" -ForegroundColor Green
    } else {
        Write-Host "   [SKIP] Conservation du tag existant" -ForegroundColor Yellow
    }
} else {
    git tag -a v2.1.0 -m "Version 2.1.0 - Structure optimisee + Auto-update"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Tag v2.1.0 cree" -ForegroundColor Green
    } else {
        Write-Host "   [ERREUR] Echec creation du tag" -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host ""

# Push vers GitHub
Write-Host "Etape 8: Push vers GitHub..." -ForegroundColor Cyan
Write-Host "   Push de la branche main..." -ForegroundColor Yellow
git push -u origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Branche main pushee" -ForegroundColor Green
} else {
    Write-Host "   [INFO] Tentative avec branche master..." -ForegroundColor Yellow
    git branch -M main 2>&1
    git push -u origin main 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Branche main pushee" -ForegroundColor Green
    } else {
        Write-Host "   [AVERTISSEMENT] Push manuel necessaire" -ForegroundColor Yellow
        Write-Host "   Executez: git push -u origin main" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "   Push du tag v2.1.0..." -ForegroundColor Yellow
git push origin v2.1.0 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Tag v2.1.0 pushe" -ForegroundColor Green
} else {
    Write-Host "   [AVERTISSEMENT] Push du tag manuel necessaire" -ForegroundColor Yellow
    Write-Host "   Executez: git push origin v2.1.0" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "              DEPLOIEMENT TERMINE !" -ForegroundColor Green
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Yellow
Write-Host "1. Allez sur: https://github.com/Bl0uD/AutoSubGoalTwitch/releases" -ForegroundColor White
Write-Host "2. Cliquez sur 'Draft a new release'" -ForegroundColor White
Write-Host "3. Selectionnez le tag v2.1.0" -ForegroundColor White
Write-Host "4. Titre: 'AutoSubGoalTwitch v2.1.0 - Structure optimisee'" -ForegroundColor White
Write-Host "5. Generer les notes automatiquement ou copiez depuis CHANGELOG.md" -ForegroundColor White
Write-Host "6. Cliquez sur 'Publish release'" -ForegroundColor White
Write-Host ""
Write-Host "Le systeme de mise a jour automatique notifiera les utilisateurs!" -ForegroundColor Green
Write-Host ""

pause
