# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [3.1.0] - 2025-12-03

### ✨ Nouvelles fonctionnalités
- **Architecture DI complète** : StateManager + DependencyContainer + 6 factories
- **Authentification Twitch persistante** : Tokens chiffrés AES-256-GCM
- **Overlay robuste** : `waitForServer()` pour démarrage OBS avant serveur

### ⚡ Optimisations
- **Polling différencié** : Follows toutes les 10s, Subs toutes les 60s
- **Animations plafonnées** : Max 1.5s pour grands deltas (+1000)
  - Follows: max 50 étapes visuelles
  - Subs: max 200 étapes visuelles
- **WebSocket optimisé** : Suppression du refresh périodique inutile

### 🐛 Corrections
- **Fix doublon gift sub** : `is_gift` ignoré dans `channel.subscribe`
- **Fix device code polling** : Check `error` au lieu de `message`
- **Fix sauvegarde tokens** : Persistance dans `obs/data/twitch_config.txt`
- **Fix dossier obs/data/** : Création automatique

### 🧹 Nettoyage
- **Dossier routes/** supprimé (~1800 lignes de code legacy)
- **server-legacy.js** supprimé
- **app/server/services/** supprimé (remplacé par core/factories/)
- **Total : ~7500 lignes** de code legacy supprimées

### 🏗️ Architecture DI (Dependency Injection)

#### StateManager - État Centralisé
- **EventEmitter** : Notifications automatiques sur changements d'état
- **Getters/Setters typés** : Validation des mutations
- **Persistance automatique** : Debounce pour performance

#### DependencyContainer - IoC Container
- **Injection de dépendances** : Services découplés
- **Détection des cycles** : Évite les dépendances circulaires
- **Singletons** : Cache automatique des instances

#### Factories Modulaires
- `goals-factory.js` - Gestion des objectifs
- `broadcast-factory.js` - Diffusion WebSocket
- `batching-factory.js` - Regroupement événements
- `twitch-api-factory.js` - Appels API Twitch
- `eventsub-factory.js` - Connexion EventSub
- `polling-factory.js` - Polling périodique

### 📁 Structure Serveur
```
app/server/
├── server.js              # Routes inline + bootstrap
├── config-crypto.js       # Chiffrement AES-256-GCM
├── core/
│   ├── bootstrap.js
│   ├── dependency-container.js
│   ├── state-manager.js
│   └── factories/         # 6 factories
└── utils/                 # Utilitaires
```

### 📊 Métriques
- **server.js** : 2670 → 700 lignes (**-74%**)
- **Variables globales** : 20+ → 0 (**-100%**)
- **Code legacy supprimé** : ~7500 lignes

---

## [3.0.0] - 2025-12-02

### 🏗️ Refonte Architecture Majeure

#### Architecture Modulaire (10 Services)
- **Extraction complète** : server.js passe de 5200 à 2555 lignes (-51%)
- **10 services indépendants** :
  - `files.js` - Gestion fichiers et app_state.json
  - `counters.js` - Compteurs follows/subs
  - `goals.js` - Objectifs et file watchers
  - `batching.js` - Système de batching intelligent
  - `polling.js` - Polling API Twitch
  - `event-handlers.js` - Handlers EventSub
  - `eventsub.js` - Connexion WebSocket Twitch
  - `twitch-config.js` - Configuration Twitch chiffrée
  - `broadcast.js` - Diffusion WebSocket clients
  - `twitch.js` - Appels API Twitch

#### Routes Modulaires
- `pages.js` - Pages HTML (/, /admin, /config)
- `api.js` - API REST (/api/*)
- `admin.js` - Actions admin (/admin/*)
- `twitch.js` - Auth Twitch (/twitch/*)

#### Utilitaires Centralisés
- `constants.js` - Toutes les constantes du projet
- `logger.js` - Logging structuré avec filtrage sécurité
- `validation.js` - Validation robuste des entrées
- `rate-limiter.js` - Rate limiting (Sliding, TokenBucket)
- `timer-registry.js` - Gestion timers (évite memory leaks)
- `event-queue.js` - File d'attente événements thread-safe

### ✨ Améliorations

- **Animations Slot-machine** : Animation progressive pour changements multiples
- **Détection polices utilisateur** : Lecture HKEY_CURRENT_USER pour polices installées par l'utilisateur
- **Admin Panel** : Boutons retirer follows/subs corrigés
- **Cohérence overlays** : Même animation sur tous les fichiers HTML

### 🐛 Corrections

- **Fix** : `followRemoveBatch is not defined` - Variables batch ajoutées dans appState
- **Fix** : `animateDirectTransition` remplacée par `animateSlotMachine` cohérente
- **Fix** : Polices utilisateur (comme "SEA") non détectées
- **Fix** : Fonction `loadAdminPassword()` manquante dans admin.html

### 🧹 Nettoyage

- Suppression fichiers `__pycache__`
- Suppression overlay obsolète `followgoal_left_v3.html`
- Mise à jour package.json version 2.3.0 → 3.0.0

---

## [2.2.3] - 2025-11-22

### 🐛 Corrections Critiques
- **FIX MAJEUR : Animations uniformes** : Les désabonnements (unsub/unfollow) ont maintenant la **même animation fluide** que les abonnements/follows (1 seconde)
  - Direction d'animation transmise correctement via paramètre `direction` dans `animateCounterProgressive()`
  - Propagation de `direction` à tous les appels `displayGoalText()` pendant l'animation
  - Stockage de `direction` dans `animationQueue` pour chaque animation
  - Correction de `processAnimationQueue()` pour transmettre la direction

- **FIX CRITIQUE : Affichage overlay** : Correction de la référence à variable inexistante
  - Bug : `${direction}` utilisé dans `updateCounter()` au lieu de `${animationDirection}`
  - Cause : Script de correction automatique avait remplacé trop largement
  - Impact : Écran noir total sur les overlays
  - Solution : Restauration de `${animationDirection}` dans les 4 fichiers overlay

### 📊 Impact Visuel
| Événement | Avant v2.2.3 | Après v2.2.3 |
|-----------|--------------|--------------|
| Sub/Follow | ✅ Animation 1s | ✅ Animation 1s |
| Unsub/Unfollow | ❌ Instantané | ✅ **Animation 1s** |
| Direction | ✅/❌ Incohérent | ✅ **Down/Up correct** |

### 🔧 Fichiers Modifiés
- `obs/overlays/subgoal_left.html`
- `obs/overlays/subgoal_right.html`
- `obs/overlays/followgoal_left.html`
- `obs/overlays/followgoal_right.html`
- `app/config/version.json`

### 🧹 Nettoyage
- Suppression de `app/scripts/FIX_ANIMATION_DIRECTION.ps1`
- Suppression de `app/scripts/fix_animation.py`
- Suppression de `app/server/server.js.backup`
- Suppression de tous les dossiers `__pycache__/`

---

## [2.2.2] - 2025-11-21

### 🐛 Corrections Critiques
- **FIX MAJEUR : Détection des unfollows** : Les unfollows sont maintenant détectés en **10 secondes maximum** (au lieu de 2+ minutes)
  - Polling constant : Vérification à 100% du temps (au lieu de 33% probabiliste)
  - Synchronisation `lastKnownFollowCount` fixée dans `flushFollowBatch()` et `updateFollowCount()`
  - Root cause : Désynchronisation entre polling tracker et batch système

### ⚡ Optimisations Système
- **EventQueue thread-safe** : Remplacement du système `eventBuffer` obsolète (~150 lignes supprimées)
- **Result Pattern** : Gestion d'erreurs cohérente pour `getTwitchFollowCount()`
  - Codes standardisés : `NOT_CONFIGURED`, `TOKEN_EXPIRED`, `API_ERROR`, `TIMEOUT`, `NETWORK_ERROR`
  - Propagation propre dans 4+ emplacements
- **Variables synchronisées** : 20+ variables globales maintenant auto-synchro avec `appState` via getters/setters
  - Élimine les risques de désynchronisation
  - Rétrocompatible à 100%

### 🛡️ Sécurité et Robustesse
- **`validatePositiveInt()`** : Validation robuste des entrées (crash prevention)
- **`resetDeviceCodeFlow()`** : Utilise `appState.config` au lieu de variables globales
- **Rate limiting** : Respecte les limites Twitch (7 req/min sur 800 max = 0.9%)

### 📊 Impact
| Événement | Avant v2.2.2 | Après v2.2.2 |
|-----------|--------------|--------------|
| Follow | ✅ < 1s | ✅ < 1s |
| Unfollow | ❌ 2+ min | ✅ **10s max** |
| Requêtes API | 2-6/min | **6/min** (constant) |

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
- **Note de release GitHub** : `app/app/docs/RELEASE_v2.2.2.md` (copier-coller direct)
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
