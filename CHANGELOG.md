# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2.2.1] - 2025-11-19

### 🐛 Corrections
- **Réorganisation complète du projet** : Séparation claire entre dossiers `obs/` et `app/`
- **Correction des chemins** : Tous les chemins mis à jour dans Python, Node.js et PowerShell
- **Fix INSTALLER.ps1** : Compatibilité PowerShell 5.1 (`Join-Path` enchaîné)
- **Fix bouton Twitch** : Ouvre maintenant `/admin` au lieu de `/` 
- **Overlays** : Instructions corrigées pour utiliser HTTP URLs uniquement
- **Suppression warnings** : Plus de warning npm si `node_modules` existe
- **package-lock.json** : Déplacé vers `app/server/`

### 📁 Structure Finale
```
Root/
├── obs/                    (Scripts OBS)
│   ├── obs_subcount_auto.py
│   ├── updater/
│   ├── overlays/           (HTML overlays)
│   └── data/               (Twitch config, goals)
└── app/                    (Application serveur)
    ├── server/             (Node.js + package.json)
    ├── config/             (version.json, overlay_config.json)
    ├── web/                (dashboard, admin, config)
    ├── scripts/            (INSTALLER.ps1, START_SERVER.bat)
    ├── logs/
    ├── backups/
    └── docs/
```

---

## [2.2.0] - 2024-01-13

### 📝 Documentation
- **Simplification drastique** : 1 guide utilisateur complet (`app/app/docs/GUIDE_UTILISATEUR.md`)
- **Note de release GitHub** : `app/app/docs/RELEASE_v2.2.1.md` (copier-coller direct)
- **Suppression** : Toute documentation de développement et notes techniques
- **Conservation** : README.md et CHANGELOG.md uniquement

### 🧹 Nettoyage Final
- Suppression de tous les fichiers .md obsolètes (guides dev, migrations, etc.)
- Structure épurée et professionnelle
- Documentation focalisée utilisateur final

### ✅ Projet Finalisé
- Structure optimale pour distribution
- Prêt pour release GitHub officielle
- Documentation claire et concise

---

## [2.1.0] - 2024-01-13

### ✨ Nouveautés

#### 🎨 Configuration Dynamique des Overlays
- **Configuration en temps réel** : Modifiez police, couleurs et animations depuis le script OBS Python sans recharger les sources
- **Toutes les polices Windows disponibles** : Plus de 50 polices système détectées automatiquement (filtrage intelligent des variantes)
- **Couleurs personnalisées** : Saisie CSS directe pour texte, ombre et contour
- **WebSocket dédié** : Port 8084 pour la communication configuration en temps réel
- **Mesure précise** : Calcul exact de la largeur des caractères avec tous les styles CSS appliqués
- **Overlays unifiés** : Les overlays dynamiques sont maintenant les overlays par défaut (plus de duplication _dynamic)

#### 📁 Structure Améliorée
- Nouveau dossier `app/config/` pour stocker la configuration des overlays
- Fichier `app/config/overlay_config.json` créé automatiquement avec valeurs par défaut
- Installeur amélioré : création automatique de tous les dossiers nécessaires

#### 🖥️ Interface OBS Redessinée
- Menu OBS entièrement repensé avec séparateurs élégants
- Espacement optimisé entre les sections
- Émojis alignés pour une meilleure lisibilité
- Interface épurée et professionnelle

### 🔧 Améliorations

#### Affichage
- Recalcul progressif des dimensions (50ms, 200ms, 500ms) lors du changement de police
- Copie complète des styles CSS pour un rendu parfait (`fontSize`, `fontFamily`, `fontWeight`, `fontStyle`, `letterSpacing`, `textShadow`, `webkitTextStroke`)
- Support des polices avec effets complexes (ombre, contour)

#### Configuration
- Détection intelligente des polices Windows via registre et dossier système
- Filtrage automatique des variantes (Bold, Italic, Light, etc.)
- Polices prioritaires en tête de liste (SEA, Arial, Verdana, Times New Roman)

#### Installeur
- Création automatique du dossier `app/config/`
- Génération de `overlay_config.json` avec configuration par défaut
- Nettoyage amélioré des fichiers temporaires

### 🐛 Corrections
- **Affichage des caractères** : Résolution du problème d'alignement avec différentes polices
- **Cache OBS** : Force le rechargement du script via modification du docstring
- **Espacement** : Calcul précis de la largeur pour tous les types de polices

### 📦 Fichiers Ajoutés
- `app/config/overlay_config.json` - Configuration persistante des overlays
- `app/scripts/overlay_config_manager.py` - Gestionnaire de configuration Python
- `obs/overlays/*.html` (4 fichiers) - Overlays dynamiques unifiés
- `app/app/docs/NOUVEAU_SYSTEME_CONFIG_DYNAMIQUE.md` - Documentation du nouveau système
- `CHANGELOG.md` - Ce fichier

### 🔄 Fichiers Remplacés
- Les anciens overlays HTML statiques ont été remplacés par leurs versions dynamiques
- Plus besoin de maintenir deux versions (_dynamic et standard)
- Tous les overlays supportent maintenant la configuration en temps réel

### 🧹 Nettoyage
- Suppression des fichiers `__pycache__/`
- Suppression des scripts de test (`test_*.py`)
- Suppression des overlays statiques obsolètes
- Suppression des backups de développement
- Nettoyage des logs

### 📝 Documentation
- Documentation complète du système de configuration dynamique
- Guide d'utilisation OBS mis à jour

---

## [2.0.x] - Versions précédentes

Voir l'historique Git pour les versions antérieures.

---

## Liens

- [Documentation](app/docs/)
- [Guide d'utilisation OBS](GUIDE_UTILISATION_OBS.md)
- [Système de configuration dynamique](app/app/docs/NOUVEAU_SYSTEME_CONFIG_DYNAMIQUE.md)
