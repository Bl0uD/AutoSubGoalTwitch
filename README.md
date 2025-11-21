# AutoSubGoalTwitch

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/Bl0uD/AutoSubGoalTwitch/releases/tag/v2.2.2)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.6.8-yellow.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/node.js-14+-green.svg)](https://nodejs.org/)
[![OBS](https://img.shields.io/badge/OBS-27+-purple.svg)](https://obsproject.com/)

Système de compteurs Twitch pour OBS Studio avec **configuration dynamique en temps réel**.

---

## ✨ Fonctionnalités v2.2.2

### 🎨 Configuration Dynamique
- **Modification en temps réel** depuis OBS (police, couleurs, animations)
- **50+ polices Windows** détectées automatiquement
- **Couleurs personnalisées** CSS (texte, ombre, contour)
- **Animations configurables** (vitesse et style)
- **Pas de rechargement** de source nécessaire

### 📊 Overlays
- **4 overlays dynamiques** prêts à l'emploi
- Compteurs subs (gauche/droite)
- Compteurs follows (gauche/droite)
- Support complet configuration temps réel

### � Système
- **Installation automatique** (Python, Node.js, dépendances)
- **Mise à jour automatique** depuis GitHub
- **Backups automatiques** des données
- **3 WebSockets** (data, config, logs)
- **3 interfaces web** (dashboard, config, admin)

---

## 🚀 Installation

### 1. Télécharger
Téléchargez la dernière version : [Releases](https://github.com/Bl0uD/AutoSubGoalTwitch/releases)

### 2. Installer
Double-cliquez sur **`INSTALLER.bat`** - Installation automatique (~5-10 min) :
- ✅ Python 3.6.8
- ✅ Node.js 14+
- ✅ Toutes les dépendances
- ✅ Structure des dossiers

### 3. Configuration Twitch
Éditez `obs/data/twitch_config.txt` :
```
votre_client_id:votre_client_secret:votre_nom_de_chaine
```

**Obtenir les identifiants** : [Twitch Developer Console](https://dev.twitch.tv/console)

### 4. Charger dans OBS
1. **Outils → Scripts**
2. **Cliquer sur "+"**
3. **Sélectionner** `obs/obs_subcount_auto.py`

Le serveur démarre automatiquement ! ✅

### 5. Ajouter un overlay
1. **Source → Navigateur**
2. **URL** : `http://localhost:8082/obs/overlays/subgoal_left.html`
3. **Dimensions** : 800x200 (ajuster selon besoin)
4. **Cocher** : "Actualiser le navigateur lorsque la scène devient active"

> ⚠️ **Important** : Utilisez l'URL HTTP (pas "Fichier local") pour que les WebSockets fonctionnent !

---

## 🎨 Configuration dynamique

### Dans OBS (script Python)

#### Section "Configuration Overlays"
- **Police** : Liste de toutes les polices Windows
- **Taille** : 32px à 128px
- **Couleurs** : Saisie CSS directe
  - Texte : `white`, `#FF0000`, `rgb(255,0,0)`
  - Ombre : `rgba(0,0,0,0.5)`
  - Contour : `black`
- **Animations** : Vitesse (Lent/Normal/Rapide) et style

**Les changements sont instantanés** - Aucun rechargement nécessaire ! 🎉

---

## 📺 Overlays disponibles

| URL | Description |
|-----|-------------|
| `http://localhost:8082/obs/overlays/subgoal_left.html` | Compteur subs aligné à gauche |
| `http://localhost:8082/obs/overlays/subgoal_right.html` | Compteur subs aligné à droite |
| `http://localhost:8082/obs/overlays/followgoal_left.html` | Compteur follows aligné à gauche |
| `http://localhost:8082/obs/overlays/followgoal_right.html` | Compteur follows aligné à droite |

**Tous supportent la configuration dynamique** ✨

---

## 🌐 Interfaces web

| URL | Description |
|-----|-------------|
| `http://localhost:8082/dashboard.html` | Vue d'ensemble en temps réel |
| `http://localhost:8082/config.html` | Modifier les objectifs |
| `http://localhost:8082/admin.html` | Gestion avancée |

---

## 🔌 Architecture

### Ports
- **8082** : API REST
- **8083** : WebSocket données (subs/follows)
- **8084** : WebSocket configuration (styles)

### Structure
```
SubcountAutomatic/
├── INSTALLER.bat          # Installation automatique
├── data/                  # Données utilisateur (compteurs, config Twitch)
├── config/                # Configuration système
├── obs/                   # Scripts OBS et overlays HTML
├── server/                # Serveur Node.js
├── web/                   # Interfaces web
├── logs/                  # Logs système
└── docs/                  # Documentation utilisateur
```

---

## 📖 Documentation

- **Guide complet** : [`app/app/docs/GUIDE_UTILISATEUR.md`](app/app/docs/GUIDE_UTILISATEUR.md)
- **Release notes** : [`app/app/docs/RELEASE_v2.2.2.md`](app/app/docs/RELEASE_v2.2.2.md)
- **Changelog** : [`CHANGELOG.md`](CHANGELOG.md)

---

## ⚙️ Prérequis

- **OS** : Windows 10/11
- **OBS Studio** : v27+ (avec support Python 3.6)
- **Connexion internet** : Pour API Twitch

Python et Node.js sont installés automatiquement par `INSTALLER.bat`

---

## 🐛 Dépannage

### Le serveur ne démarre pas
```powershell
# Vérifier les ports
netstat -ano | findstr "8082 8083 8084"
```

### L'overlay ne s'affiche pas
1. Vérifier que le serveur est lancé (voyant vert dans OBS)
2. Actualiser le cache : Clic droit sur source → Actualiser le cache
3. Consulter les logs : `app/logs/obs_subcount_auto.log`

### Les compteurs ne se mettent pas à jour
1. Vérifier `obs/data/twitch_config.txt`
2. Consulter `app/logs/obs_subcount_auto.log`
3. Redémarrer le serveur (bouton dans le script OBS)

**Plus de solutions** : [`app/app/docs/GUIDE_UTILISATEUR.md`](app/app/docs/GUIDE_UTILISATEUR.md#dépannage)

---

## 🔗 Liens

- 📦 [Releases](https://github.com/Bl0uD/AutoSubGoalTwitch/releases)
- 📖 [Documentation complète](app/app/docs/GUIDE_UTILISATEUR.md)
- 🐛 [Signaler un bug](https://github.com/Bl0uD/AutoSubGoalTwitch/issues)

---

## 📊 Statistiques v2.2.2

- **Réduction code** : ~3100 lignes dupliquées éliminées
- **Overlays** : 8 fichiers → 4 fichiers (-50%)
- **Documentation** : Simplifiée (-71% de fichiers)
- **Polices** : 500+ détectées → ~50-100 (filtrage intelligent)

---

## 📄 Licence

MIT License - Copyright (c) 2025 Bl0uD

Voir [`LICENSE`](LICENSE) pour plus de détails.

---

<div align="center">

### 🎉 Configuration dynamique • Overlays unifiés • Interface redessinée

**v2.2.2** - Prêt pour le stream ! ✨

⭐ **Star ce projet si il vous aide !** ⭐

</div>