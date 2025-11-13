# 📂 Structure du projet v2.1.0

Documentation de l'organisation finale du projet SubcountAutomatic après nettoyage et optimisation.

---

## 🗂️ Arborescence

```
SubcountAutomatic/
│
├── 📁 backups/                    # Backups automatiques (vide par défaut)
│   └── .gitkeep
│
├── 📁 config/                     # Configuration persistante
│   ├── overlay_config.json        # Configuration des overlays (créé auto)
│   ├── update_config.json         # Configuration du système de mise à jour
│   └── version.json               # Version actuelle du système
│
├── 📁 data/                       # Données utilisateur
│   ├── .gitkeep
│   ├── followcount_backup.txt     # Backup automatique des follows
│   ├── follower_count.txt         # Compteur de follows actuel
│   ├── follower_goal.txt          # Objectif de follows
│   ├── followgoal_config.txt      # Config overlay followgoal
│   ├── subcount_backup.txt        # Backup automatique des subs
│   ├── subgoals_config.txt        # Config overlay subgoal
│   ├── total_followers_count.txt  # Total de followers
│   ├── total_followers_count_goal.txt  # Objectif total followers
│   ├── total_subscriber_count.txt # Total de subscribers
│   ├── total_subscriber_count_goal.txt # Objectif total subs
│   └── twitch_config.txt          # Identifiants Twitch (créé par installeur)
│
├── 📁 docs/                       # Documentation
│   ├── CONFIGURATION_DYNAMIQUE.md # Guide config dynamique (référence)
│   ├── DEVELOPER.md               # Guide développeur
│   ├── MIGRATION_v2.1.0.md        # Guide de migration v2.1
│   ├── USER_GUIDE.md              # Guide utilisateur complet
│   │
│   └── 📁 release/                # Notes de releases
│       ├── CHANGEMENTS_DYNAMIC_CONFIG.md        # Changements v2.1 (dev)
│       ├── NOUVEAU_SYSTEME_CONFIG_DYNAMIQUE.md  # Déploiement système (dev)
│       ├── RELEASE_NOTES_v2.1.0.md              # Notes officielles v2.1
│       └── STRUCTURE_v2.1.0.md                  # Ce fichier
│
├── 📁 logs/                       # Logs du système (vide par défaut)
│   └── .gitkeep
│
├── 📁 obs/                        # Scripts OBS
│   ├── obs_subcount_auto.py       # ⭐ Script principal OBS (Python)
│   ├── overlay_config_manager.py  # Gestionnaire de config dynamique
│   │
│   ├── 📁 overlays/               # Overlays HTML
│   │   ├── followgoal_left.html   # ✅ DYNAMIQUE - Follow objectif gauche
│   │   ├── followgoal_right.html  # ✅ DYNAMIQUE - Follow objectif droite
│   │   ├── subgoal_left.html      # ✅ DYNAMIQUE - Sub objectif gauche
│   │   └── subgoal_right.html     # ✅ DYNAMIQUE - Sub objectif droite
│   │
│   └── 📁 updater/                # Système de mise à jour auto
│       ├── __init__.py
│       ├── file_updater.py        # Mise à jour des fichiers
│       ├── github_api.py          # API GitHub
│       └── version_checker.py     # Vérification de version
│
├── 📁 scripts/                    # Scripts utilitaires
│   ├── INSTALLER.ps1              # ⭐ Installeur principal (PowerShell)
│   └── START_SERVER.bat           # Démarrage serveur manuel
│
├── 📁 server/                     # Serveur Node.js
│   ├── server.js                  # ⭐ Serveur principal (Node.js)
│   ├── package.json               # Dépendances npm
│   ├── package-lock.json
│   └── 📁 node_modules/           # Dépendances installées
│
├── 📁 web/                        # Interfaces web
│   ├── admin.html                 # Interface admin
│   ├── config.html                # Interface configuration
│   └── dashboard.html             # Dashboard principal
│
├── .gitignore                     # Exclusions Git
├── CHANGELOG.md                   # ⭐ Historique des versions
├── GUIDE_UTILISATION_OBS.md       # Guide rapide OBS
├── INSTALLER.bat                  # ⭐ Point d'entrée installation (Windows)
├── LICENSE                        # Licence du projet
└── README.md                      # Documentation principale

```

---

## 🎯 Fichiers principaux

### Pour l'utilisateur final

| Fichier | Description | Utilisation |
|---------|-------------|-------------|
| `INSTALLER.bat` | Installeur automatique | Double-clic pour tout installer |
| `README.md` | Documentation principale | Lire en premier |
| `GUIDE_UTILISATION_OBS.md` | Guide rapide OBS | Configuration OBS |
| `CHANGELOG.md` | Historique des versions | Voir les nouveautés |

### Pour OBS

| Fichier | Description | Chargement |
|---------|-------------|------------|
| `obs/obs_subcount_auto.py` | Script Python OBS | Outils → Scripts → + |
| `obs/overlays/*.html` | Overlays dynamiques (4) | Source navigateur |

### Pour le serveur

| Fichier | Description | Port |
|---------|-------------|------|
| `server/server.js` | Serveur Node.js | 8082 (API) |
| | | 8083 (WebSocket data) |
| | | 8084 (WebSocket config) |

---

## 📊 Statistiques

### Taille du projet
- **Fichiers sources** : ~50 fichiers
- **Lignes de code** :
  - Python : ~2500 lignes
  - JavaScript : ~4500 lignes
  - HTML : ~3500 lignes
- **Documentation** : ~30 pages MD

### Overlays
- **4 fichiers HTML** (tous dynamiques)
- **Configuration temps réel** activée par défaut
- **Support** : 50+ polices Windows

### Documentation
- **4 fichiers principaux** (racine)
- **4 guides** (docs/)
- **4 notes de release** (docs/release/)

---

## 🔒 Fichiers ignorés (.gitignore)

### Générés automatiquement
- `node_modules/` - Dépendances npm
- `__pycache__/` - Cache Python
- `*.pyc`, `*.pyo`, `*.pyd` - Bytecode Python
- `logs/*.log` - Logs système
- `backups/` - Backups utilisateur

### Données utilisateur
- `data/` - Compteurs et configuration Twitch
- `config/overlay_config.json` - Préférences overlay

### Fichiers système
- `.DS_Store`, `Thumbs.db`, `desktop.ini`
- `.vscode/`, `.idea/` - IDE

---

## 🚀 Évolution de la structure

### v2.0.x → v2.1.0

**Ajouts :**
- ✅ `config/` - Nouveau dossier configuration
- ✅ `config/overlay_config.json` - Config dynamique
- ✅ `obs/overlay_config_manager.py` - Gestionnaire config
- ✅ `docs/release/` - Notes de releases archivées
- ✅ `CHANGELOG.md` - Historique des versions

**Suppressions :**
- ❌ `obs/overlays/*_dynamic.html` - Unifiés avec versions standard
- ❌ `scripts/test_*.py` - Scripts de test développement
- ❌ `__pycache__/` - Cache Python nettoyé

**Modifications :**
- 🔄 Overlays : 8 fichiers → 4 fichiers (50% réduction)
- 🔄 Documentation : Réorganisée dans docs/release/
- 🔄 Scripts : Nettoyés (seulement production)

---

## 📝 Notes

### Création automatique

Ces fichiers/dossiers sont créés automatiquement au premier lancement :

**Par l'installeur (INSTALLER.ps1) :**
- `data/twitch_config.txt`
- `config/overlay_config.json`
- Dossiers : `data/`, `logs/`, `backups/`, `config/`

**Par le serveur (server.js) :**
- `config/overlay_config.json` (si manquant)
- Compteurs dans `data/` (si manquants)

### Maintenance

**Fichiers à NE PAS modifier manuellement :**
- `config/overlay_config.json` - Géré par le système
- `data/*_count.txt` - Mis à jour automatiquement
- `data/*_backup.txt` - Backups automatiques

**Fichiers modifiables :**
- `data/twitch_config.txt` - Identifiants Twitch
- `data/*_goal.txt` - Objectifs personnalisés
- `data/*goals_config.txt` - Config overlays

---

## ✅ Checklist de vérification

Pour vérifier que votre structure est correcte :

```powershell
# Dossiers principaux
Test-Path "backups", "config", "data", "docs", "logs", "obs", "scripts", "server", "web"

# Fichiers racine essentiels
Test-Path "INSTALLER.bat", "README.md", "CHANGELOG.md", "LICENSE"

# Scripts OBS
Test-Path "obs\obs_subcount_auto.py", "obs\overlay_config_manager.py"

# Overlays (4 fichiers)
Test-Path "obs\overlays\subgoal_left.html", "obs\overlays\subgoal_right.html"
Test-Path "obs\overlays\followgoal_left.html", "obs\overlays\followgoal_right.html"

# Serveur
Test-Path "server\server.js", "server\package.json"
```

Tous doivent retourner `True` ✅

---

<div align="center">

## 🎉 STRUCTURE v2.1.0 OPTIMISÉE

**Propre • Organisée • Maintenable**

</div>
