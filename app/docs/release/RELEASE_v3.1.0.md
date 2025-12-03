# 🎉 SubCount Auto v3.1.0 - Architecture Moderne + Corrections

**Date de release:** 3 décembre 2025

## 📋 Résumé

Cette version marque une **refonte architecturale majeure** du serveur avec injection de dépendances, corrige les problèmes de détection des polices dans OBS, restaure toutes les routes API manquantes, et nettoie le code legacy.

---

## 🐛 Corrections v3.1.0

### Détection des Polices (OBS)
| Problème | Solution |
|----------|----------|
| Polices utilisateur non détectées | Scan du dossier `LocalAppData/Microsoft/Windows/Fonts` |
| Variantes (Bold, Italic) dans la liste | Filtrage strict par mots-clés |
| Polices système obsolètes (8514fix, etc.) | Exclusion des fichiers `.fon` et noms numériques |

### Interface OBS
| Problème | Solution |
|----------|----------|
| Saisie libre causait des erreurs | Dropdown en lecture seule (`OBS_COMBO_TYPE_LIST`) |
| Config perdue au redémarrage | Restauration auto via `apply_saved_overlay_config()` |
| Callback silencieux | Logs détaillés + try/except global |

### Routes API (Pages Web)
| Problème | Solution |
|----------|----------|
| `/api/auth-status` manquant | Route ajoutée pour dashboard.html |
| `/admin/add-follows` manquant | Toutes les routes admin restaurées |
| `/api/sync-twitch` manquant | Route ajoutée pour synchronisation |
| `/api/disconnect-twitch` manquant | Route ajoutée pour déconnexion |
| `/api/config` manquant | Route ajoutée pour config.html |
| Format `currentFollows` manquant | Compatibilité rétro ajoutée dans `/api/status` |

### Overlay HTML
| Problème | Solution |
|----------|----------|
| Goal affichait "undefined/undefined" | Format corrigé: `{current, target, message, isMaxReached}` |
| Police Sea non appliquée | Nom corrigé dans `@font-face` |

---

## 🏗️ Refactoring Majeur: Architecture DI (Dependency Injection)

Cette version marque une **refonte architecturale majeure** du serveur, passant d'un modèle monolithique à une architecture moderne avec injection de dépendances.

---

## ✨ Nouveautés

### 1. StateManager - État Centralisé
```javascript
// Avant: variables globales éparpillées
global.currentFollows = 0;
appState.counters.follows = value;

// Après: état centralisé avec événements
stateManager.setFollows(value, 'source');
stateManager.on('follows:updated', (data) => { ... });
```

- **EventEmitter** pour notifier les changements
- **Getters/Setters typés** avec validation
- **Persistance automatique** avec debounce
- **Snapshot** pour debugging

### 2. DependencyContainer - IoC Container
```javascript
// Enregistrement des services
container.register('pollingService', (c) => {
    return createPollingService({
        stateManager: c.resolve('stateManager'),
        twitchApiService: c.resolve('twitchApiService')
    });
});

// Résolution automatique
const polling = container.resolve('pollingService');
```

- **Singletons** avec cache
- **Détection des cycles** de dépendances
- **Scopes** pour tests isolés
- **Factory pattern** pour chaque service

### 3. Factories de Services
6 services migrés vers le pattern Factory:

| Factory | Responsabilité |
|---------|---------------|
| `goals-factory.js` | Gestion des objectifs follow/sub |
| `broadcast-factory.js` | Diffusion WebSocket aux clients |
| `batching-factory.js` | Regroupement intelligent des événements |
| `twitch-api-factory.js` | Appels API Twitch, tokens |
| `eventsub-factory.js` | Connexion WebSocket EventSub |
| `polling-factory.js` | Polling périodique de l'API |

### 4. Bootstrap Automatique
```javascript
const container = bootstrap();
setupEventListeners(container);
```

Initialisation en 2 lignes au lieu de 500+.

---

## 🔧 Routes API Ajoutées

### Dashboard (`/`)
- `GET /api/auth-status` - Statut d'authentification Twitch
- `GET /api/sync-twitch` - Synchronisation manuelle
- `POST /api/start-device-auth` - Démarrer authentification
- `POST /api/disconnect-twitch` - Déconnecter Twitch

### Admin (`/admin`)
- `POST /admin/add-follows` - Ajouter des follows
- `POST /admin/remove-follows` - Retirer des follows
- `POST /admin/set-follows` - Définir le nombre de follows
- `POST /admin/add-subs` - Ajouter des subs
- `POST /admin/remove-subs` - Retirer des subs
- `POST /admin/set-subs` - Définir le nombre de subs
- `POST /admin/set-follow-goal` - Définir objectif follows
- `POST /admin/set-sub-goal` - Définir objectif subs
- `GET /admin/test-twitch-api` - Tester l'API Twitch
- `GET /admin/test-eventsub` - Tester EventSub
- `GET /admin/test-polling` - Tester le polling

### Config (`/config`)
- `POST /api/config` - Sauvegarder la configuration

---

## 📊 Métriques de Réduction

| Métrique | Avant (v3.0) | Après (v3.1) | Réduction |
|----------|-------------|--------------|-----------|
| server.js | 2670 lignes | ~350 lignes | **-87%** |
| Variables globales | 20+ | 0 | **-100%** |
| Couplage | Fort | Faible | ✅ |
| Testabilité | Difficile | Facile | ✅ |

---

## 🔧 Corrections Techniques

### config-crypto.js
- Support du format texte ancien (`CLIENT_ID=xxx`)
- Conversion automatique vers objet JSON

### twitch-api-factory.js
- Support des clés `broadcaster_id` et `username`
- Compatibilité avec l'ancien format de config

### constants.js
- Ajout de `PORTS.WS_COUNTER` (alias de `WS_DATA`)

---

## 📁 Fichiers Modifiés/Nouveaux

```
app/server/server.js           - Routes API complètes + architecture DI
app/server/core/bootstrap.js   - loadAppState/saveAppState intégrés
app/web/dashboard.html         - Lecture des données corrigée
obs/obs_subcount_auto.py       - Détection polices + callbacks améliorés
obs/overlays/overlay.html      - @font-face corrigé

app/server/core/
├── index.js                   # Export centralisé
├── state-manager.js           # 650 lignes - État avec EventEmitter
├── dependency-container.js    # 140 lignes - IoC Container
├── bootstrap.js               # 230 lignes - Initialisation DI
└── factories/
    ├── goals-factory.js
    ├── broadcast-factory.js
    ├── batching-factory.js
    ├── twitch-api-factory.js
    ├── eventsub-factory.js
    └── polling-factory.js
```

## 🗑️ Fichiers Supprimés

```
app/server/server-legacy.js    - 2670 lignes (remplacé par architecture DI)
app/server/services/           - 3054 lignes (remplacé par core/factories/)
```

**Total : 5724 lignes de code legacy supprimées**

---

## 📊 Métriques

- **161 polices** valides détectées (vs 176 brutes)
- **20+ routes API** restaurées/ajoutées
- **5724 lignes** de code legacy supprimées
- **-87%** de réduction de server.js (2670 → ~350 lignes)

---

## 🔄 Événements StateManager

```javascript
const STATE_EVENTS = {
    FOLLOWS_UPDATED: 'follows:updated',
    SUBS_UPDATED: 'subs:updated',
    GOALS_CHANGED: 'goals:changed',
    EVENTSUB_CONNECTED: 'connection:eventsub:connected',
    OVERLAY_CONFIG_CHANGED: 'config:overlay:changed',
    // ...
};
```

---

## 🚀 Comment Mettre à Jour

1. **Arrêter le serveur actuel**
2. **Remplacer les fichiers** avec la nouvelle version
3. **Vérifier les dépendances**: `npm install`
4. **Démarrer**: `node server.js`

Aucune migration de données nécessaire - compatibilité totale avec `app_state.json` existant.

---

## 🧪 Vérification

```bash
# Démarrer le serveur
node server.js

# Vérifier l'API
curl http://localhost:8082/api/status

# Réponse attendue:
{
  "success": true,
  "version": "3.1.0",
  "architecture": "modular"
}
```

---

## 🔮 Prochaines Étapes (v3.2)

- [ ] Migration complète des routes vers DI
- [ ] Tests unitaires pour chaque factory
- [ ] Documentation API Swagger/OpenAPI
- [ ] Mode développement avec hot-reload

---

## 📝 Notes

- L'ancien code legacy a été entièrement supprimé
- Tous les endpoints API restent identiques + nouveaux ajoutés
- Les overlays OBS fonctionnent sans modification
- Le script Python OBS a été amélioré (polices, config)

**Merci d'utiliser SubCount Auto ! 🎮**
