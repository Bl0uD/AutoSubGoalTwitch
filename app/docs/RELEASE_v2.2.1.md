# 🎉 AutoSubGoalTwitch v2.2.1

## 🐛 Corrections majeures

### Structure du projet réorganisée
- **Séparation claire** : Dossiers `obs/` (scripts OBS) et `app/` (serveur Node.js)
- **package-lock.json** déplacé vers `app/server/`
- **Tous les chemins corrigés** dans Python, Node.js et PowerShell

### Corrections techniques
- ✅ **INSTALLER.ps1** compatible PowerShell 5.1 (`Join-Path` enchaîné)
- ✅ **Bouton "Se connecter à Twitch"** ouvre maintenant `/admin` au lieu de `/`
- ✅ **Instructions overlays** corrigées (HTTP URLs uniquement, pas de `file://`)
- ✅ **Warnings npm** supprimés si `node_modules` existe déjà

## 📁 Nouvelle structure

```
Root/
├── obs/                    (Scripts OBS)
│   ├── obs_subcount_auto.py
│   ├── updater/           (Système de mise à jour)
│   ├── overlays/          (Fichiers HTML des overlays)
│   └── data/              (twitch_config.txt, goals)
│
└── app/                    (Application serveur)
    ├── server/            (Node.js + package.json)
    ├── config/            (version.json, overlay_config.json)
    ├── web/               (dashboard.html, admin.html, config.html)
    ├── scripts/           (INSTALLER.ps1, START_SERVER.bat)
    ├── logs/              (Fichiers de log)
    ├── backups/           (Sauvegardes automatiques)
    └── docs/              (Documentation utilisateur)
```

## 🚀 Installation

1. **Téléchargez** le fichier ZIP ci-dessous
2. **Extrayez** dans `Documents/StreamLabels/SubcountAutomatic`
3. **Lancez** `INSTALLER.bat` en tant qu'administrateur
4. **Suivez** les instructions dans OBS

## 📖 Configuration des overlays

⚠️ **IMPORTANT** : Les overlays doivent être ajoutés comme **Sources Navigateur** avec des URLs HTTP :

```
http://localhost:8082/obs/overlays/subgoal_left.html
http://localhost:8082/obs/overlays/subgoal_right.html
http://localhost:8082/obs/overlays/followgoal_left.html
http://localhost:8082/obs/overlays/followgoal_right.html
```

❌ **N'utilisez JAMAIS "Fichier local"** - les overlays ne fonctionneront pas !

## ✨ Fonctionnalités (rappel)

- Configuration dynamique des overlays (police, couleurs, animations)
- 50+ polices Windows disponibles
- WebSocket temps réel (port 8084)
- Interface OBS redessinée
- Système de mise à jour automatique
- Sauvegardes automatiques

## 🔧 Prérequis

- Windows 10/11
- OBS Studio 28.0+
- Python 3.6.8 (inclus dans OBS)
- Node.js v20+ (installé automatiquement)
- Git (installé automatiquement)

---

**Note** : Cette version corrige tous les problèmes de chemins suite à la réorganisation du projet. Si vous rencontrez des problèmes, supprimez `app/server/node_modules/` et relancez `INSTALLER.bat`.
