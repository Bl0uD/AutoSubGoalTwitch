##############################################################################
# Script de Déploiement Initial - AutoSubGoalTwitch v2.1.0
# 
# Ce script automatise:
# 1. Initialisation Git
# 2. Création du tag v2.1.0
# 3. Push vers GitHub
# 4. Création de l'archive ZIP
##############################################################################

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🚀 DÉPLOIEMENT INITIAL - AutoSubGoalTwitch v2.1.0         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Variables
$VERSION = "2.1.0"
$REPO_URL = "git@github.com:Bl0uD/AutoSubGoalTwitch.git"
$PROJECT_DIR = "c:\Users\BlouD\Documents\StreamLabels\SubcountAutomatic\AutoSubUpdate"
$PARENT_DIR = "c:\Users\BlouD\Documents\StreamLabels\SubcountAutomatic"

# Aller dans le dossier du projet
Set-Location $PROJECT_DIR

##############################################################################
# ÉTAPE 1: Créer .gitignore
##############################################################################
Write-Host "📝 ÉTAPE 1: Création du .gitignore" -ForegroundColor Yellow
Write-Host ""

$gitignoreContent = @"
# Node modules
node_modules/
server/node_modules/

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python

# Logs
*.log
logs/
subcount_logs.txt

# Backups
*_backup.txt
backups/

# Updates
updates/

# Sensitive data
twitch_config.txt

# OS
.DS_Store
Thumbs.db
desktop.ini

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Temp
*.tmp
temp/
"@

$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8
Write-Host "   ✅ .gitignore créé" -ForegroundColor Green
Write-Host ""

##############################################################################
# ÉTAPE 2: Initialiser Git
##############################################################################
Write-Host "🔧 ÉTAPE 2: Initialisation Git" -ForegroundColor Yellow
Write-Host ""

if (Test-Path ".git") {
    Write-Host "   ⚠️  Git déjà initialisé" -ForegroundColor Yellow
} else {
    git init
    Write-Host "   ✅ Git initialisé" -ForegroundColor Green
}
Write-Host ""

##############################################################################
# ÉTAPE 3: Configurer le remote
##############################################################################
Write-Host "🔗 ÉTAPE 3: Configuration du remote" -ForegroundColor Yellow
Write-Host ""

$remotes = git remote
if ($remotes -contains "origin") {
    Write-Host "   ⚠️  Remote 'origin' existe déjà" -ForegroundColor Yellow
    git remote set-url origin $REPO_URL
    Write-Host "   ✅ URL mise à jour" -ForegroundColor Green
} else {
    git remote add origin $REPO_URL
    Write-Host "   ✅ Remote 'origin' ajouté" -ForegroundColor Green
}
Write-Host "   📍 URL: $REPO_URL" -ForegroundColor Gray
Write-Host ""

##############################################################################
# ÉTAPE 4: Créer README.md
##############################################################################
Write-Host "📄 ÉTAPE 4: Création du README.md" -ForegroundColor Yellow
Write-Host ""

$readmeContent = @"
# 🎮 AutoSubGoal Twitch - OBS Script

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/Bl0uD/AutoSubGoalTwitch/releases)
[![OBS](https://img.shields.io/badge/OBS-28.0+-purple.svg)](https://obsproject.com/)
[![Python](https://img.shields.io/badge/Python-3.6+-yellow.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-14.0+-green.svg)](https://nodejs.org/)

Script OBS pour afficher en temps réel vos compteurs de followers/subscribers Twitch avec système d'objectifs et d'auto-update.

## ✨ Fonctionnalités

- 📊 **Compteurs en temps réel** via Twitch EventSub WebSocket
- 🎯 **Objectifs personnalisables** avec paliers multiples
- 🔔 **Notifications instantanées** des nouveaux follows/subs
- 💻 **Interface web complète** pour administration
- 💾 **Backup automatique** des compteurs
- 🔄 **Auto-update** depuis GitHub
- 🔒 **Sécurité** : tokens chiffrés AES-256-GCM

## 📦 Installation

### Prérequis

- **OBS Studio** 28.0 ou supérieur
- **Python** 3.6+ (inclus dans OBS)
- **Node.js** 14.0 ou supérieur

### Étapes

1. **Télécharger** la dernière version depuis [Releases](https://github.com/Bl0uD/AutoSubGoalTwitch/releases)
2. **Extraire** l'archive dans un dossier
3. **Installer Node.js** si ce n'est pas déjà fait
4. **Dans OBS:**
   - Outils → Scripts → +
   - Sélectionner ``src/obs_subcount_auto.py``
5. **Configurer Twitch:**
   - Ouvrir http://localhost:8082/config
   - Suivre les instructions d'authentification

## 🚀 Utilisation

### Charger dans OBS

```
OBS Studio → Outils → Scripts → + → src/obs_subcount_auto.py
```

### Accéder à l'interface web

- **Dashboard:** http://localhost:8082
- **Configuration:** http://localhost:8082/config
- **Admin:** http://localhost:8082/admin

### Ajouter les sources dans OBS

1. Ajouter une source "Navigateur"
2. URL: ``http://localhost:8082/1auto_subgoal_left.html``
3. Dimensions: 1920x1080
4. Cocher "Actualiser le navigateur..."

## 🔧 Configuration

### Objectifs Followers

Fichier: ``followgoal_config.txt``

```
50:Premier objectif
100:Deuxième objectif
200:Troisième objectif
```

### Objectifs Subscribers

Fichier: ``subgoals_config.txt``

```
10:Premier palier
25:Deuxième palier
50:Troisième palier
```

## 🔄 Auto-Update

Le système vérifie automatiquement les mises à jour au démarrage d'OBS.

**Journal des Scripts OBS:**
```
🔍 Vérification des mises à jour...
✅ Version à jour (2.1.0)
```

ou

```
🎉 MISE À JOUR DISPONIBLE: v2.2.0
📥 https://github.com/Bl0uD/AutoSubGoalTwitch/releases/tag/v2.2.0
```

## 📝 Structure du Projet

\`\`\`
AutoSubUpdate/
├── src/
│   ├── obs_subcount_auto.py          # Script OBS principal
│   ├── updater/                       # Module auto-update
│   │   ├── __init__.py
│   │   └── version_checker.py
│   └── config/
│       ├── version.json               # Version actuelle
│       └── update_config.json         # Config auto-update
├── server/
│   ├── server.js                      # Serveur Node.js
│   ├── package.json                   # Dépendances
│   └── config-crypto.js               # Chiffrement tokens
├── *.html                             # Fichiers d'affichage OBS
├── *_config.txt                       # Fichiers de configuration
└── START_SERVER.bat                   # Démarrage manuel serveur
\`\`\`

## 🐛 Dépannage

### Le serveur ne démarre pas

```powershell
cd server
npm install
node server.js
```

### Erreur "Module requests non disponible"

```powershell
python -m pip install requests
```

### Les compteurs ne se mettent pas à jour

1. Vérifier la connexion Twitch: http://localhost:8082/config
2. Consulter les logs: ``subcount_logs.txt``
3. Vérifier le Journal OBS: Outils → Scripts → Journal des scripts

## 📖 Documentation

- **AUTO_UPDATE_GUIDE.md** - Guide complet du système d'auto-update
- **GITHUB_SETUP.md** - Configuration GitHub pour développeurs
- **TEST_RESULTS.md** - Résultats des tests de validation
- **NEXT_STEPS.md** - Prochaines étapes de développement

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créer une branche (``git checkout -b feature/AmazingFeature``)
3. Commit (``git commit -m 'Add AmazingFeature'``)
4. Push (``git push origin feature/AmazingFeature``)
5. Ouvrir une Pull Request

## 📜 Licence

Ce projet est sous licence MIT. Voir ``LICENSE`` pour plus d'informations.

## 🙏 Remerciements

- [OBS Studio](https://obsproject.com/)
- [Twitch API](https://dev.twitch.tv/)
- [Node.js](https://nodejs.org/)

## 📞 Support

- **Issues:** https://github.com/Bl0uD/AutoSubGoalTwitch/issues
- **Discussions:** https://github.com/Bl0uD/AutoSubGoalTwitch/discussions

---

**Version:** 2.1.0  
**Dernière mise à jour:** 11 novembre 2025  
**Auteur:** Bl0uD
"@

$readmeContent | Out-File -FilePath "README.md" -Encoding UTF8
Write-Host "   ✅ README.md créé" -ForegroundColor Green
Write-Host ""

##############################################################################
# ÉTAPE 5: Premier commit
##############################################################################
Write-Host "📦 ÉTAPE 5: Premier commit" -ForegroundColor Yellow
Write-Host ""

git add .
git commit -m "🎉 Initial commit - AutoSubGoal Twitch v$VERSION with Auto-Update

Features:
- Real-time follower/subscriber counter
- EventSub WebSocket integration
- Multi-level goal system
- Web admin interface
- Automatic backup system
- Auto-update from GitHub
- AES-256-GCM token encryption

Technical:
- Python 3.6+ compatible (OBS)
- Node.js server with Express
- Secure localhost-only access
- Comprehensive error handling"

Write-Host "   ✅ Commit créé" -ForegroundColor Green
Write-Host ""

##############################################################################
# ÉTAPE 6: Créer le tag
##############################################################################
Write-Host "🏷️  ÉTAPE 6: Création du tag v$VERSION" -ForegroundColor Yellow
Write-Host ""

git tag -a "v$VERSION" -m "Version $VERSION - Auto-Update System

New features:
- ✅ Auto-update system integrated
- ✅ Automatic update check on OBS startup
- ✅ Notifications in OBS Script Log
- ✅ Python 3.6+ compatibility

Improvements:
- Dependency checking at startup
- npm made optional if node_modules exists
- OBS crash protection
- Enhanced error handling

Bug fixes:
- Python 3.6 compatibility (subprocess.run)
- PATH detection improvements
- Configuration file handling"

Write-Host "   ✅ Tag v$VERSION créé" -ForegroundColor Green
Write-Host ""

##############################################################################
# ÉTAPE 7: Push vers GitHub
##############################################################################
Write-Host "🚀 ÉTAPE 7: Push vers GitHub" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "   Voulez-vous pusher vers GitHub maintenant ? (o/n)"
if ($response -eq "o" -or $response -eq "O" -or $response -eq "yes" -or $response -eq "y") {
    Write-Host ""
    Write-Host "   📤 Push de la branche main..." -ForegroundColor Cyan
    git branch -M main
    git push -u origin main
    
    Write-Host "   📤 Push du tag v$VERSION..." -ForegroundColor Cyan
    git push origin "v$VERSION"
    
    Write-Host ""
    Write-Host "   ✅ Push terminé !" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "   ⏭️  Push ignoré (vous pourrez le faire plus tard)" -ForegroundColor Yellow
    Write-Host "   💡 Commandes à exécuter manuellement:" -ForegroundColor Gray
    Write-Host "      git branch -M main" -ForegroundColor Gray
    Write-Host "      git push -u origin main" -ForegroundColor Gray
    Write-Host "      git push origin v$VERSION" -ForegroundColor Gray
}
Write-Host ""

##############################################################################
# ÉTAPE 8: Créer l'archive ZIP
##############################################################################
Write-Host "📦 ÉTAPE 8: Création de l'archive ZIP" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "   Voulez-vous créer l'archive ZIP maintenant ? (o/n)"
if ($response -eq "o" -or $response -eq "O" -or $response -eq "yes" -or $response -eq "y") {
    Write-Host ""
    Write-Host "   📁 Préparation de l'archive..." -ForegroundColor Cyan
    
    $zipPath = Join-Path $PARENT_DIR "AutoSubGoalTwitch-v$VERSION.zip"
    
    # Supprimer l'archive existante si elle existe
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    # Créer l'archive
    Compress-Archive -Path "$PROJECT_DIR\*" -DestinationPath $zipPath -Force
    
    Write-Host ""
    Write-Host "   ✅ Archive créée: AutoSubGoalTwitch-v$VERSION.zip" -ForegroundColor Green
    Write-Host "   📍 Emplacement: $zipPath" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "   ⏭️  Création ZIP ignorée" -ForegroundColor Yellow
    Write-Host "   💡 Commande PowerShell:" -ForegroundColor Gray
    Write-Host "      Compress-Archive -Path 'AutoSubUpdate\*' -DestinationPath 'AutoSubGoalTwitch-v$VERSION.zip' -Force" -ForegroundColor Gray
}
Write-Host ""

##############################################################################
# RÉSUMÉ FINAL
##############################################################################
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              ✅ DÉPLOIEMENT TERMINÉ !                          ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 RÉSUMÉ" -ForegroundColor Yellow
Write-Host ""
Write-Host "   ✅ .gitignore créé" -ForegroundColor Green
Write-Host "   ✅ Git initialisé" -ForegroundColor Green
Write-Host "   ✅ Remote configuré" -ForegroundColor Green
Write-Host "   ✅ README.md créé" -ForegroundColor Green
Write-Host "   ✅ Commit initial créé" -ForegroundColor Green
Write-Host "   ✅ Tag v$VERSION créé" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 PROCHAINES ÉTAPES" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. " -NoNewline
Write-Host "Aller sur GitHub" -ForegroundColor White
Write-Host "      https://github.com/Bl0uD/AutoSubGoalTwitch/releases" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. " -NoNewline
Write-Host "Créer une nouvelle release" -ForegroundColor White
Write-Host "      - Tag: v$VERSION" -ForegroundColor Gray
Write-Host "      - Title: AutoSubGoal Twitch v$VERSION - Auto-Update System" -ForegroundColor Gray
Write-Host "      - Attacher: AutoSubGoalTwitch-v$VERSION.zip" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. " -NoNewline
Write-Host "Publier la release" -ForegroundColor White
Write-Host ""
Write-Host "   4. " -NoNewline
Write-Host "Tester le système" -ForegroundColor White
Write-Host "      python test_update_system.py" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Documentation complète: AUTO_UPDATE_GUIDE.md" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Bravo ! Votre système d'auto-update est prêt !" -ForegroundColor Green
Write-Host ""
