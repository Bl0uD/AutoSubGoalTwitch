# AutoSubGoalTwitch

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/Bl0uD/AutoSubGoalTwitch/releases/tag/v2.1.0)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.6+-yellow.svg)](https://www.python.org/)
[![OBS](https://img.shields.io/badge/OBS-31.1.2+-purple.svg)](https://obsproject.com/)

## 📖 Description
Application Python pour OBS Studio qui gère automatiquement les compteurs d'abonnés et de followers Twitch en temps réel avec mise à jour automatique.

## ✨ Nouveautés v2.1.0
- 🔄 Système de mise à jour automatique GitHub
- 💾 Backups automatiques avant chaque mise à jour
- 📊 Logs détaillés (update.log, error.log)
- 🛡️ Gestion d'erreurs améliorée

## 🚀 Installation rapide

### Prérequis
- Python 3.6+ 
- Node.js 14+
- OBS Studio 31.1.2+
- Compte Twitch avec accès API

### Installation

1. **Téléchargez et extrayez** le projet
2. **Exécutez** `INSTALLER.bat`
3. **Configurez** `twitch_config.txt` (format: `client_id:client_secret:channel_name`)
4. **Dans OBS** : Outils → Scripts → + → Sélectionnez `subcount_auto.py`
5. **Ajoutez les overlays** : Source → Navigateur → `http://localhost:3000/subgoal-left` (ou `/subgoal-right`)

## 📝 Utilisation

### Boutons OBS
- 🔄 **Refresh Server** : Redémarre le serveur
- ⬆️ **Increment Sub** : +1 abonné (test)
- ⬇️ **Decrement Sub** : -1 abonné (test)
- 🔄 **Update Total** : Force sync Twitch
- 🎯 **Update Sub Goal** : Change l'objectif

### Configuration auto-update
Éditez `obs/config/update_settings.json` :
```json
{
  "auto_update_enabled": true,
  "check_interval_hours": 6,
  "backup_before_update": true
}
```

## ⚠️ Dépannage

### OBS crash (libcef.dll)
```powershell
.\scripts\fix_obs_browser_crash.ps1
```

### Port 3000 déjà utilisé
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Erreur API Twitch
Vérifiez `twitch_config.txt` et consultez `logs/error.log`

### Windows Defender bloque
Ajoutez le dossier aux exclusions : Sécurité Windows → Protection → Exclusions

## 📊 Logs
- `logs/update.log` : Opérations de mise à jour
- `logs/error.log` : Erreurs critiques
- Logs OBS : Aide → Fichiers journaux

## 🔗 Liens
- 📦 [Releases](https://github.com/Bl0uD/AutoSubGoalTwitch/releases)
- 🐛 [Signaler un bug](https://github.com/Bl0uD/AutoSubGoalTwitch/issues)

## 📄 License
MIT License - Copyright (c) 2025 Bl0uD

---
<div align="center">⭐ Star ce projet si il vous aide ! ⭐</div>