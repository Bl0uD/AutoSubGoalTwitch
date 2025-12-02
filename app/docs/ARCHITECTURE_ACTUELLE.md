# 📐 Architecture Actuelle - SubCount Auto v2.3.0

> Document généré le : 2025-01-XX
> Objectif : Documenter l'architecture existante avant refactoring v3.0.0

---

## 📊 Vue d'ensemble

### Fichiers principaux
| Fichier | Lignes | Rôle |
|---------|--------|------|
| `app/server/server.js` | ~4860 | Serveur Express monolithique (tout le backend) |
| `obs/overlays/followgoal_left.html` | ~600 | Overlay OBS follows (gauche) |
| `obs/overlays/followgoal_right.html` | ~600 | Overlay OBS follows (droite) |
| `obs/overlays/subgoal_left.html` | ~600 | Overlay OBS subs (gauche) |
| `obs/overlays/subgoal_right.html` | ~600 | Overlay OBS subs (droite) |

### Ports utilisés
| Port | Protocol | Usage |
|------|----------|-------|
| 8082 | HTTP | API REST Express |
| 8083 | WebSocket | Data updates (overlays) |
| 8084 | WebSocket | Config updates (overlays) |

---

## 🗂️ Variables Globales (server.js)

### Configuration Twitch
```javascript
let twitchConfig = {
    client_id: '',
    access_token: '',
    refresh_token: '',
    user_id: '',
    username: '',
    login: '',
    display_name: '',
    scope: '',
    configured: false
};
```

### Compteurs et objectifs
```javascript
let currentFollows = 0;              // Compteur de follows
let currentSubs = 0;                 // Compteur de subs
const followGoals = new Map();       // Map<number, string> - objectifs follows
const subGoals = new Map();          // Map<number, string> - objectifs subs
```

### État EventSub
```javascript
let twitchEventSubWs = null;         // WebSocket Twitch EventSub
let sessionId = null;                // Session ID EventSub
let reconnectAttempts = 0;           // Compteur reconnexions
const maxReconnectAttempts = 5;      // Max tentatives
```

### Device Code Flow
```javascript
let deviceCodeData = null;           // Données device code auth
let deviceCodePolling = null;        // Interval polling
```

### Système de batching
```javascript
const BATCH_DELAY = 500;             // Délai aggregation (ms)
const ANIMATION_DURATION = 1000;     // Durée animation (ms)

const followBatch = { count: 0, timer: null, isAnimating: false };
const subBatch = { count: 0, timer: null, isAnimating: false, tiers: {} };
const subEndBatch = { count: 0, timer: null, isAnimating: false };
const followRemoveBatch = { count: 0, timer: null, isAnimating: false };
```

### Polling
```javascript
let lastKnownFollowCount = 0;
let isPollingActive = false;
let pollingIntervalRef = null;
let pollingErrorCount = 0;
const POLL_INTERVAL = 30000;         // 30 secondes
const MAX_POLLING_ERRORS = 5;
```

### Event Buffer
```javascript
let eventBuffer = [];
let isProcessingEvents = false;
let lastEventProcessTime = 0;
const MAX_EVENTS_PER_BATCH = 10;
const EVENT_PROCESSING_DELAY = 100;
```

### Surveillance fichiers
```javascript
let configWatcher = null;            // Watcher followgoal_config.txt
let subConfigWatcher = null;         // Watcher subgoals_config.txt
```

### Autres
```javascript
let isInitializing = true;           // Flag initialisation
```

---

## 🏛️ Classes définies

### 1. EventQueue
```javascript
class EventQueue {
    constructor(maxSize = 1000)
    add(event)                       // Ajoute un événement
    getAll()                         // Retourne tous les événements
    clear()                          // Vide la queue
    size()                           // Taille actuelle
}
```
- **Rôle** : File d'attente pour événements avec limite de taille
- **Validation** : Vérifie VALID_EVENT_TYPES avant ajout
- **Instance** : `eventQueue` (global)

### 2. TimerRegistry  
```javascript
class TimerRegistry {
    setTimeout(name, callback, delay)
    clearTimeout(name)
    setInterval(name, callback, delay)
    clearInterval(name)
    clearAll()
}
```
- **Rôle** : Gestionnaire centralisé de tous les timers
- **Instance** : `timerRegistry` (global)

### 3. SimpleRateLimiter
```javascript
class SimpleRateLimiter {
    constructor(windowMs, maxRequests)
    allow()                          // Vérifie si requête autorisée
    remaining()                      // Requêtes restantes
    nextResetIn()                    // Temps avant reset
}
```
- **Rôle** : Rate limiting simple pour API sync
- **Instance** : `syncLimiter` (global, 10 req/minute)

---

## 🛣️ Routes API

### Pages Web
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Redirige vers dashboard.html |
| GET | `/dashboard` | Page dashboard |
| GET | `/config` | Page configuration |
| GET | `/admin` | Panel admin (caché) |
| GET | `/test` | Page de test diagnostique |

### API Stats et Status
| Méthode | Route | Description | Validation |
|---------|-------|-------------|------------|
| GET | `/api/stats` | Stats admin (follows, subs, goals) | ❌ |
| GET | `/api/status` | Status complet serveur | ❌ |
| GET | `/api/current` | Compteurs actuels + goals | ❌ |
| GET | `/api/current-follows` | Compteur follows + goal | ❌ |
| GET | `/api/current-subs` | Compteur subs + goal | ❌ |
| GET | `/api/follow_goal` | Objectif follow actuel | ❌ |
| GET | `/api/sub_goal` | Objectif sub actuel | ❌ |

### API Twitch Auth
| Méthode | Route | Description | Validation |
|---------|-------|-------------|------------|
| POST | `/api/config` | Sauvegarder client_id | ❌ |
| POST | `/api/start-device-auth` | Démarrer Device Code Flow | ❌ |
| GET | `/api/auth-status` | Statut authentification | ❌ |
| GET | `/api/moderator-status` | Statut modérateur | ❌ |
| GET | `/api/sync-twitch` | Synchronisation manuelle | ✅ Rate limit |
| POST | `/api/refresh-token` | Renouveler token | ❌ |
| POST | `/api/disconnect-twitch` | Déconnexion Twitch | ❌ |

### API Mises à jour
| Méthode | Route | Description | Validation |
|---------|-------|-------------|------------|
| POST | `/api/update-follows` | Mettre à jour follows | ✅ typeof + >= 0 |
| POST | `/api/update-subs` | Mettre à jour subs | ✅ typeof + >= 0 |
| POST | `/api/reload-goals` | Recharger objectifs | ❌ |
| POST | `/api/reconnect-eventsub` | Forcer reconnexion EventSub | ❌ |

### API Overlay Config
| Méthode | Route | Description | Validation |
|---------|-------|-------------|------------|
| GET | `/api/overlay-config` | Récupérer config overlay | ❌ |
| POST | `/api/overlay-config` | Mettre à jour config overlay | ❌ |
| GET | `/api/version` | Infos version | ❌ |
| GET | `/api/app-state` | État application | ❌ |

### API Logs
| Méthode | Route | Description | Validation |
|---------|-------|-------------|------------|
| GET | `/api/logs-info` | Infos fichiers logs | ❌ |
| POST | `/api/clean-logs` | Nettoyer les logs | ❌ |

### API Event Buffer
| Méthode | Route | Description | Validation |
|---------|-------|-------------|------------|
| GET | `/api/event-buffer/status` | Statut buffer événements | ❌ |
| POST | `/api/event-buffer/clear` | Vider buffer événements | ❌ |
| POST | `/api/test/simulate-follow` | Simuler un follow | ❌ |

### Admin Routes
| Méthode | Route | Description | Validation |
|---------|-------|-------------|------------|
| POST | `/admin/add-follows` | +N follows | ✅ validatePositiveInt |
| POST | `/admin/remove-follows` | -N follows | ❌ |
| POST | `/admin/set-follows` | Définir follows | ❌ |
| POST | `/admin/add-subs` | +N subs | ❌ |
| POST | `/admin/remove-subs` | -N subs | ❌ |
| POST | `/admin/set-subs` | Définir subs | ❌ |
| POST | `/admin/set-follow-goal` | Définir objectif follows | ❌ |
| POST | `/admin/set-sub-goal` | Définir objectif subs | ❌ |
| GET | `/admin/sync-twitch` | Sync admin (rate limited) | ✅ Rate limit |
| GET | `/admin/test-twitch-api` | Test API Twitch | ❌ |
| GET | `/admin/test-eventsub` | Test EventSub | ❌ |
| GET | `/admin/test-polling` | Test polling | ❌ |
| GET | `/admin/read-files` | Lire fichiers config | ❌ |
| GET | `/admin/test-file-write` | Test écriture fichier | ❌ |
| GET | `/admin/backup-data` | Créer backup | ❌ |
| GET | `/admin/restore-backup` | Restaurer backup | ❌ |
| GET | `/admin/corrupt-data` | Corrompre données (test) | ❌ |

### Routes Statiques
| Route | Chemin |
|-------|--------|
| `/obs/overlays/*` | `ROOT_DIR/obs/overlays/` |

---

## ⚙️ Fonctions principales

### État et Persistance
| Fonction | Rôle | Appels |
|----------|------|--------|
| `loadAppState()` | Charge app_state.json | Au démarrage, API |
| `saveAppState(state)` | Sauvegarde app_state.json | Après modifications |
| `loadFollowCountFromFile()` | Charge compteur follows | Au démarrage |
| `saveFollowCountToFile(count)` | Sauvegarde compteur follows | Après modifications |
| `loadSubCountFromFile()` | Charge compteur subs | Au démarrage |
| `saveSubCountToFile(count)` | Sauvegarde compteur subs | Après modifications |

### Logging
| Fonction | Rôle | Appels |
|----------|------|--------|
| `logEvent(type, message, data?)` | Log formaté avec timestamp | Partout |
| `cleanupLogFile(logPath, maxSize)` | Nettoie logs > maxSize | Automatique |

### Validation
| Fonction | Rôle | Appels |
|----------|------|--------|
| `validatePositiveInt(val, name, min, max)` | Valide entier positif | admin/add-follows |

### Twitch API
| Fonction | Rôle | Appels |
|----------|------|--------|
| `getTwitchFollowCount()` | Récupère follows via API | syncTwitchFollows |
| `getTwitchSubCount()` | Récupère subs via API | syncTwitchSubs |
| `syncTwitchFollows(reason)` | Sync follows (Result Pattern) | API, polling |
| `syncTwitchSubs(reason)` | Sync subs (Result Pattern) | API |
| `loadTwitchConfig()` | Charge twitch_config.txt | Démarrage |
| `saveTwitchConfig()` | Sauvegarde twitch_config.txt | Après auth |
| `refreshTwitchToken()` | Renouvelle access token | Auto/manuel |
| `checkIfModerator()` | Vérifie statut modérateur | API |
| `canGrantSelfModerator()` | Vérifie si peut s'auto-modérer | API |

### Device Code Flow
| Fonction | Rôle | Appels |
|----------|------|--------|
| `initiateDeviceCodeFlow()` | Démarre auth Device Code | API |
| `pollForDeviceToken()` | Poll Twitch pour token | Interval |
| `completeDeviceCodeAuth(tokenData)` | Finalise auth | Après poll réussi |

### EventSub WebSocket
| Fonction | Rôle | Appels |
|----------|------|--------|
| `connectTwitchEventSub()` | Ouvre connexion WS Twitch | Démarrage, reconnexion |
| `handleEventSubMessage(message)` | Route messages EventSub | WebSocket onmessage |
| `handleEventSubNotification(message)` | Traite notifications | handleEventSubMessage |
| `subscribeToChannelFollow()` | S'abonne aux follows | Après session_welcome |
| `subscribeToChannelSubscription()` | S'abonne aux subs | Après session_welcome |
| `subscribeToChannelSubscriptionGift()` | S'abonne aux gifts | Après session_welcome |
| `subscribeToChannelSubscriptionEnd()` | S'abonne aux fin subs | Après session_welcome |

### Polling
| Fonction | Rôle | Appels |
|----------|------|--------|
| `startFollowPolling()` | Démarre polling follows | Auto si non EventSub |
| `stopFollowPolling()` | Arrête polling | Déconnexion |
| `pollFollowCount()` | Exécute un poll | Interval |

### Objectifs
| Fonction | Rôle | Appels |
|----------|------|--------|
| `loadFollowGoals()` | Charge followgoal_config.txt | Démarrage, watcher |
| `loadSubGoals()` | Charge subgoals_config.txt | Démarrage, watcher |
| `loadGoals()` | Charge les deux | Compatibilité |
| `getCurrentFollowGoal(follows)` | Calcule objectif actuel | Partout |
| `getCurrentSubGoal(subs)` | Calcule objectif actuel | Partout |
| `setupConfigWatcher()` | Surveille fichiers config | Démarrage |

### Batching (animation)
| Fonction | Rôle | Appels |
|----------|------|--------|
| `addFollowToBatch(count)` | Ajoute follows au batch | EventSub, admin |
| `flushFollowBatch()` | Traite batch follows | Timer |
| `addSubToBatch(count, tier)` | Ajoute subs au batch | EventSub, admin |
| `flushSubBatch()` | Traite batch subs | Timer |
| `addSubEndToBatch(count)` | Ajoute fin subs au batch | EventSub |
| `flushSubEndBatch()` | Traite batch fin subs | Timer |
| `addFollowRemoveToBatch(count)` | Ajoute unfollows au batch | Admin |
| `flushFollowRemoveBatch()` | Traite batch unfollows | Timer |

### Fichiers et Broadcast
| Fonction | Rôle | Appels |
|----------|------|--------|
| `updateFollowFiles(follows)` | Met à jour (legacy, logs) | Après modification |
| `updateSubFiles(subs)` | Met à jour (legacy, logs) | Après modification |
| `broadcastFollowUpdate(batchCount)` | Diffuse via WS 8083 | Après modification |
| `broadcastSubUpdate(batchCount, tiers)` | Diffuse via WS 8083 | Après modification |
| `broadcastConfigUpdate()` | Diffuse config via WS 8084 | Après modif config |

### Overlay Config
| Fonction | Rôle | Appels |
|----------|------|--------|
| `loadOverlayConfig()` | Charge depuis app_state | Démarrage |
| `saveOverlayConfig()` | Sauvegarde dans app_state | API |
| `getOverlayConfig()` | Helper app_state | Interne |
| `updateOverlayConfig(config)` | Helper app_state | Interne |
| `getVersionInfo()` | Info version | API |

### Utilitaires
| Fonction | Rôle | Appels |
|----------|------|--------|
| `asyncHandler(fn)` | Wrapper try/catch pour routes | Express middleware |
| `handleError(error, context)` | Log erreur formaté | asyncHandler |
| `generateTestPage()` | Génère HTML page test | Route /test |

---

## 🔄 Flux de données

### Flux Follow EventSub
```
Twitch EventSub (WS) 
    → handleEventSubNotification()
    → addFollowToBatch()
    → [BATCH_DELAY ms]
    → flushFollowBatch()
    → currentFollows++
    → updateFollowFiles()
    → broadcastFollowUpdate()
    → Overlays (WS 8083)
```

### Flux Sub EventSub
```
Twitch EventSub (WS)
    → handleEventSubNotification()
    → addSubToBatch()
    → [BATCH_DELAY ms]
    → flushSubBatch()
    → currentSubs++
    → updateSubFiles()
    → broadcastSubUpdate()
    → Overlays (WS 8083)
```

### Flux Config Overlay
```
Python (overlay_config_manager.py)
    → POST /api/overlay-config
    → overlayConfig = { ... }
    → saveOverlayConfig() → app_state.json
    → broadcastConfigUpdate()
    → Overlays (WS 8084)
    → Mise à jour CSS temps réel
```

---

## ⚠️ Problèmes identifiés

### Critiques
1. **Fichier monolithique** : 4860 lignes dans un seul fichier
2. **~50 variables globales** : État partagé, difficile à tester
3. **4 overlays dupliqués** : ~90% de code identique
4. **Validation incohérente** : Seul `/admin/add-follows` utilise `validatePositiveInt`

### Modérés
1. **Pas de tests** : Aucun test unitaire
2. **Logs verbeux** : Difficile à filtrer
3. **Dépendances non verrouillées** : Pas de package-lock.json

### Bons patterns à conserver
1. **Result Pattern** : `syncTwitchFollows()` retourne `{ success, data, error }`
2. **TimerRegistry** : Gestion centralisée des timers
3. **EventQueue** : File d'attente avec validation
4. **Batching intelligent** : Agrégation des événements pour animations

---

## 📋 Métriques

| Métrique | Valeur |
|----------|--------|
| Lignes de code server.js | ~4860 |
| Routes API | ~50 |
| Variables globales | ~50 |
| Classes | 3 (EventQueue, TimerRegistry, SimpleRateLimiter) |
| Fonctions | ~60 |
| WebSocket servers | 2 (8083, 8084) |
| Fichiers overlay HTML | 4 |
| Lignes dupliquées overlays | ~2400 |

---

*Document à utiliser comme référence pour le refactoring v3.0.0*
