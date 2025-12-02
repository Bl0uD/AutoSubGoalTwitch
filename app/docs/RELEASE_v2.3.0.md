# 🎉 AutoSubGoalTwitch v2.3.0

## 📋 Résumé

Cette version apporte un **filtrage intelligent des polices**, un **nettoyage complet du projet** et une **architecture consolidée** autour du fichier `app_state.json`.

---

## ✨ Nouveautés

### 🎨 Filtrage Intelligent des Polices

Le sélecteur de polices dans OBS affiche maintenant **uniquement les polices de base** :

| Avant v2.3.0 | Après v2.3.0 |
|--------------|--------------|
| Arial | Arial |
| Arial Bold | *(filtré)* |
| Arial Italic | *(filtré)* |
| Arial Bold Italic | *(filtré)* |
| Calibri | Calibri |
| Calibri Light | *(filtré)* |
| Courier 10,12,15 | Courier |

**Avantages :**
- ✅ Liste claire et lisible (~141 polices au lieu de 500+)
- ✅ Polices qui fonctionnent réellement dans les overlays
- ✅ Support des termes français (Gras, Italique, Demi Gras, etc.)

### 🏗️ Architecture Consolidée

Toutes les données sont maintenant centralisées dans **un seul fichier** :

```
app/config/app_state.json
├── counters (follows, subs)
├── goals (objectifs actuels)
├── overlay (police, couleurs, animation)
├── update (configuration mise à jour)
└── version (version actuelle, changelog)
```

**Fichiers supprimés :**
- ❌ `overlay_config.json`
- ❌ `version.json`
- ❌ `update_config.json`
- ❌ `total_followers_count.txt`
- ❌ `total_subscriber_count.txt`
- ❌ Et leurs variantes `_goal.txt`

---

## 🔧 Changements Techniques

### APIs REST
- `GET /api/app-state` - État complet de l'application
- `GET /api/version` - Version et changelog
- `GET /api/overlay-config` - Configuration des overlays
- `POST /api/overlay-config` - Mise à jour des overlays

### Filtrage des Polices
Le nouveau système filtre automatiquement :

**Termes anglais :**
- Bold, Italic, Light, Thin, Medium, Black, Heavy
- SemiBold, DemiBold, ExtraBold, UltraLight
- Condensed, Extended, Narrow, Wide, Regular

**Termes français :**
- Gras, Italique, Maigre, Demi Gras
- Extra Gras, Très Gras, Léger
- Étroit, Étendu, Condensé

---

## 📦 Installation

### Nouvelle Installation
1. Télécharger le ZIP depuis GitHub
2. Extraire dans un dossier
3. Double-cliquer sur `INSTALLER.bat`
4. Suivre les instructions

### Mise à jour depuis v2.2.x
1. Sauvegarder `obs/data/twitch_config.txt`
2. Télécharger la v2.3.0
3. Extraire et écraser les fichiers
4. Restaurer `twitch_config.txt`
5. Recharger le script dans OBS

---

## 📊 Statistiques

| Métrique | Valeur |
|----------|--------|
| Polices filtrées | ~141 (vs 500+) |
| Fichiers config | 1 (vs 5+) |
| Fichiers .txt OBS | 0 (vs 4) |
| Taille réduite | ~15% |

---

## 🐛 Corrections

- Fix : Certaines polices ne s'affichaient pas (fallback Arial)
- Fix : Noms de polices avec caractères spéciaux nettoyés
- Fix : Cache polices rechargé après modification

---

## 📁 Structure du Projet

```
AutoSubGoalTwitch/
├── INSTALLER.bat           # Installation automatique
├── README.md
├── CHANGELOG.md
├── obs/
│   ├── obs_subcount_auto.py  # Script OBS principal
│   ├── data/                 # Configuration Twitch
│   ├── overlays/             # HTML overlays
│   └── updater/              # Module mise à jour
└── app/
    ├── server/               # Serveur Node.js
    ├── config/
    │   └── app_state.json    # ⭐ Configuration centralisée
    ├── scripts/              # INSTALLER.ps1, START_SERVER.bat
    ├── web/                  # Pages admin
    ├── logs/
    ├── backups/
    └── docs/
```

---

## 🔗 Liens

- 📦 [Télécharger v2.3.0](https://github.com/Bl0uD/AutoSubGoalTwitch/releases/tag/v2.3.0)
- 📖 [Guide Utilisateur](GUIDE_UTILISATEUR.md)
- 🐛 [Signaler un bug](https://github.com/Bl0uD/AutoSubGoalTwitch/issues)

---

**Version :** 2.3.0  
**Date :** 2 décembre 2025  
**Auteur :** Bl0uD
