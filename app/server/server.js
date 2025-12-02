const WebSocket = require('ws');
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');
const configCrypto = require('./config-crypto'); // Module de chiffrement sécurisé
const crypto = require('crypto'); // Module natif pour génération sécurisée

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 IMPORTS MODULAIRES
// ═══════════════════════════════════════════════════════════════════════════════
const {
    // Logger
    Logger, logger, logEvent, LOG_LEVELS,
    // Validation
    validatePositiveInt, validateString, validateEnum, validateTier, validateBoolean,
    // Constantes
    VALID_EVENT_TYPES, LIMITS, VALID_TIERS, VALID_SOURCES, PORTS, TWITCH_CLIENT_ID,
    // Classes
    EventQueue, TimerRegistry, SimpleRateLimiter, TokenBucketLimiter,
} = require('./utils');

const {
    APP_STATE_PATH, loadAppState, saveAppState, updateCounter,
    getOverlayConfig, updateOverlayConfig, getVersionInfo, getCounters, setCounters,
    // Services modulaires (Phase 3.6 + Phase 5 + Phase 6)
    twitchService,
    goalsService,
    batchingService,
    countersService,
    filesService,
    pollingService,
    eventHandlersService,
    eventsubService,
    twitchConfigService,
    createBroadcastService,
} = require('./services');

// Import des routes modulaires
const {
    pagesRouter,
    apiRouter,
    adminRouter,
    twitchRouter,
    initAllContexts
} = require('./routes');

// Dossier racine du projet (2 niveaux au-dessus : app/server -> app -> racine)
const ROOT_DIR = path.join(__dirname, '..', '..');

// ═══════════════════════════════════════════════════════════════════════════════
// 📐 ARCHITECTURE MODULAIRE v3.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// 
// Services disponibles (Phase 3.3) - Pattern Factory avec injection de contexte:
// 
// 1. createTwitchService(context)
//    - Device Code Flow (initiate, polling, reset)
//    - Token management (refresh, save, load)
//    - API calls (getUserInfo, getFollowCount, getSubCount)
//    - Synchronisation (syncTwitchFollows, syncTwitchSubs)
// 
// 2. createGoalsService(context)
//    - Chargement objectifs (loadFollowGoals, loadSubGoals)
//    - Calcul objectifs (getCurrentFollowGoal, getCurrentSubGoal)
//    - Surveillance fichiers (setupConfigWatcher)
// 
// 3. createBatchingService(context)
//    - Batching follows (addFollowToBatch, flushFollowBatch)
//    - Batching subs (addSubToBatch, flushSubBatch)
//    - Batching removals (addFollowRemoveToBatch, addSubEndToBatch)
// 
// 4. createBroadcastService(context)
//    - Diffusion WebSocket (broadcastFollowUpdate, broadcastSubUpdate)
//    - Config overlay (broadcastConfigUpdate)
//    - Données initiales (sendInitialData, sendInitialConfig)
// 
// Note: Les fonctions inline restent pour compatibilité.
// Migration progressive vers les services modulaires en cours.
// ═══════════════════════════════════════════════════════════════════════════════

// Note: Logger, logEvent, LOG_LEVELS, validation functions, et les classes utilitaires
// sont maintenant importés de ./utils et ./services

// Alias pour cleanupLogFile (pour compatibilité)
function cleanupLogFile(logFilePath, maxSizeMB = 2, keepLines = 500) {
    // Le nettoyage est maintenant géré par Logger._cleanupIfNeeded()
    // Cette fonction reste pour compatibilité mais ne fait rien
}

const app = express();
const PORT = PORTS.HTTP;

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
// 🔒 SÉCURITÉ : LOCALHOST-ONLY (Simple et efficace)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
// Protection par CORS : seul localhost peut accéder au serveur
// Communication Twitch sécurisée : tokens chiffrés AES-256-GCM machine-bound
console.log('\n┌─────────────────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│                    🔒 SERVEUR LOCALHOST SÉCURISÉ                             │');
console.log('└─────────────────────────────────────────────────────────────────────────────────────────────────┘');
console.log('\n✅ PROTECTION ACTIVE :');
console.log('   • CORS restreint à localhost uniquement');
console.log('   • Tokens Twitch chiffrés AES-256-GCM (machine-bound)');
console.log('   • Aucun accès possible depuis l\'extérieur');
console.log('\n💡 ACCÈS :');
console.log('   • Panel admin : http://localhost:8082/admin');
console.log('   • API publique : http://localhost:8082/api/stats');
console.log('\n═══════════════════════════════════════════════════════════════════════════════════════════════════════════\n');

// Configuration CORS - RESTREINT À LOCALHOST UNIQUEMENT
app.use(cors({
    origin: ['http://localhost:8082', 'http://127.0.0.1:8082'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-password'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(__dirname));

// ═══════════════════════════════════════════════════════════════════════════════
// ÉTAT CENTRALISÉ DE L'APPLICATION
// ═══════════════════════════════════════════════════════════════════════════════
const appState = {
    counters: {
        follows: 0,
        subs: 0,
    },
    goals: {
        follow: new Map(),
        sub: new Map(),
    },
    connections: {
        twitchEventSubWs: null,
        sessionId: null,
    },
    config: {
        twitch: {
            client_id: '8o91k8bmpi79inwkjj7sgggvpkavr5',
            access_token: '',
            refresh_token: '',
            user_id: '',
            username: '',
            configured: false,
        },
        deviceCode: {
            device_code: '',
            user_code: '',
            verification_uri: '',
            expires_in: 0,
            interval: 5,
            expires_at: 0,
        },
        overlay: {},
    },
    flags: {
        isInitializing: true,
        isPollingActive: false,
        reconnectAttempts: 0,
    },
    batching: {
        follow: { count: 0, timer: null, isAnimating: false },
        sub: { count: 0, timer: null, isAnimating: false, tiers: {} },
    },
    watchers: {
        followConfig: null,
        subConfig: null,
    },
    timers: {
        followPolling: null,
        deviceCodePolling: null,
        subscription: null,
        keepalive: null,
        eventProcessing: null,
    },
    eventBuffer: {
        queue: [],
        isProcessing: false,
        lastProcessTime: 0,
    },
    tracking: {
        lastKnownFollowCount: 0,
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALIASES pour appState (éviter la duplication, juste des pointeurs)
// ═══════════════════════════════════════════════════════════════════════════════
// Watchers et timers restent comme variables globales simples (non dupliquées)
let configWatcher = null;
let subConfigWatcher = null;

// Constantes dérivées des LIMITS
const maxReconnectAttempts = LIMITS.MAX_RECONNECT_ATTEMPTS;
const reconnectDelay = LIMITS.RECONNECT_DELAY;
const ANIMATION_DURATION = LIMITS.ANIMATION_DURATION;
const BATCH_DELAY = LIMITS.BATCH_DELAY;
const MAX_EVENTS_PER_BATCH = LIMITS.MAX_EVENTS_PER_BATCH;
const EVENT_PROCESSING_DELAY = LIMITS.EVENT_PROCESSING_DELAY;

// ═══════════════════════════════════════════════════════════════════════════════
// GETTERS/SETTERS pour compatibilité avec l'ancien code
// Synchronisent automatiquement avec appState
// ═══════════════════════════════════════════════════════════════════════════════
Object.defineProperties(global, {
    currentFollows: {
        get: () => appState.counters.follows,
        set: (val) => { appState.counters.follows = val; }
    },
    currentSubs: {
        get: () => appState.counters.subs,
        set: (val) => { appState.counters.subs = val; }
    },
    twitchEventSubWs: {
        get: () => appState.connections.twitchEventSubWs,
        set: (val) => { appState.connections.twitchEventSubWs = val; }
    },
    sessionId: {
        get: () => appState.connections.sessionId,
        set: (val) => { appState.connections.sessionId = val; }
    },
    isInitializing: {
        get: () => appState.flags.isInitializing,
        set: (val) => { appState.flags.isInitializing = val; }
    },
    isPollingActive: {
        get: () => appState.flags.isPollingActive,
        set: (val) => { appState.flags.isPollingActive = val; }
    },
    reconnectAttempts: {
        get: () => appState.flags.reconnectAttempts,
        set: (val) => { appState.flags.reconnectAttempts = val; }
    },
    lastKnownFollowCount: {
        get: () => appState.tracking.lastKnownFollowCount,
        set: (val) => { appState.tracking.lastKnownFollowCount = val; }
    },
    followGoals: {
        get: () => appState.goals.follow,
        set: (val) => { appState.goals.follow = val; }
    },
    subGoals: {
        get: () => appState.goals.sub,
        set: (val) => { appState.goals.sub = val; }
    },
    followBatch: {
        get: () => appState.batching.follow,
        set: (val) => { appState.batching.follow = val; }
    },
    subBatch: {
        get: () => appState.batching.sub,
        set: (val) => { appState.batching.sub = val; }
    },
    twitchConfig: {
        get: () => appState.config.twitch,
        set: (val) => { appState.config.twitch = val; }
    },
    deviceCodeData: {
        get: () => appState.config.deviceCode,
        set: (val) => { appState.config.deviceCode = val; }
    },
    followPollingInterval: {
        get: () => appState.timers.followPolling,
        set: (val) => { appState.timers.followPolling = val; }
    },
    deviceCodePolling: {
        get: () => appState.timers.deviceCodePolling,
        set: (val) => { appState.timers.deviceCodePolling = val; }
    },
    subscriptionTimeout: {
        get: () => appState.timers.subscription,
        set: (val) => { appState.timers.subscription = val; }
    },
    keepaliveTimeout: {
        get: () => appState.timers.keepalive,
        set: (val) => { appState.timers.keepalive = val; }
    },
    eventProcessingInterval: {
        get: () => appState.timers.eventProcessing,
        set: (val) => { appState.timers.eventProcessing = val; }
    }
    // Note: eventBuffer, isProcessingEvents, lastEventProcessTime ont été remplacés par EventQueue
});

// ═══════════════════════════════════════════════════════════════════════════════
// Instanciation des singletons (classes importées de ./utils)
// ═══════════════════════════════════════════════════════════════════════════════

// EventQueue avec handlers personnalisés (définis plus tard)
const eventQueue = new EventQueue();

const timerRegistry = new TimerRegistry();
const syncLimiter = new SimpleRateLimiter(1, 60000); // 1 sync par minute
const adminLimiter = new SimpleRateLimiter(10, 60000); // 10 actions admin par minute

logEvent('INFO', '✅ Utility classes initialisées (EventQueue, TimerRegistry, RateLimiters)');

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING - Gestion d'erreurs cohérente
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrapper pour middleware Express avec gestion d'erreurs
 * Permet de simplifier le try/catch dans les routes
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Middleware de gestion d'erreurs centralisé
 * À placer à la fin de tous les app.use() et app.get/post()
 */
function handleError(err, req, res, next) {
    logEvent('ERROR', `API Error: ${err.message}`, {
        path: req.path,
        method: req.method,
        status: err.status || 500,
    });

    if (err.status === 401) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (err.status === 429) {
        return res.status(429).json({ error: 'Rate limited' });
    }

    res.status(err.status || 500).json({ 
        error: err.message || 'Internal server error' 
    });
}

// Fonction pour réinitialiser le Device Code Grant Flow
function resetDeviceCodeFlow() {
    try {
        timerRegistry.clearInterval('deviceCodePolling');
        
        appState.config.deviceCode = {
            device_code: '',
            user_code: '',
            verification_uri: '',
            expires_in: 0,
            interval: 5,
            expires_at: 0
        };
        appState.config.twitch.access_token = '';
        appState.config.twitch.refresh_token = '';
        appState.config.twitch.user_id = '';
        appState.config.twitch.username = '';
        appState.config.twitch.configured = false;
        logEvent('INFO', '📄 Device Code Grant Flow réinitialisé');
    } catch (error) {
        logEvent('ERROR', '❌ Erreur reset Device Code Flow:', error.message);
    }
}

// 🔥 DEVICE CODE GRANT FLOW - Étape 1: Initier l'authentification
async function initiateDeviceCodeFlow() {
    try {
        console.log('🚀 Démarrage Device Code Grant Flow...');
        
        // Créer un contrôleur d'annulation pour timeout plus long
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 secondes timeout
        
        // Selon la documentation: utiliser application/x-www-form-urlencoded
        const response = await fetch('https://id.twitch.tv/oauth2/device', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: twitchConfig.client_id,
                scopes: 'moderator:read:followers channel:read:subscriptions channel:manage:moderators moderation:read' // Scopes complets pour follows, subs et modération
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            logEvent('ERROR', `❌ Erreur HTTP Device Code: ${response.status}`, { errorText });
            throw new Error(`Erreur Device Code: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        // Validation des données reçues selon la documentation
        if (!data.device_code || !data.user_code || !data.verification_uri) {
            logEvent('ERROR', '❌ Réponse incomplète du serveur Twitch', data);
            throw new Error('Réponse incomplète du serveur Twitch');
        }
        
        // Stocker les données du Device Code
        deviceCodeData = {
            device_code: data.device_code,
            user_code: data.user_code,
            verification_uri: data.verification_uri,
            expires_in: data.expires_in || 1800, // 30 minutes par défaut
            interval: data.interval || 5, // 5 secondes par défaut
            expires_at: Date.now() + ((data.expires_in || 1800) * 1000)
        };
        
        logEvent('INFO', `✅ Device Code généré: ${deviceCodeData.user_code}`);
        logEvent('INFO', `📗 URL de vérification: ${deviceCodeData.verification_uri}`);
        logEvent('INFO', `⏰ Expire dans: ${deviceCodeData.expires_in} secondes`);
        
        // Démarrer le polling
        startDeviceCodePolling();
        
        return deviceCodeData;
        
    } catch (error) {
        // Gestion spécifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('ERROR', '❌ Timeout Device Code Flow (15s)');
            throw new Error('Timeout de connexion au serveur Twitch - Vérifiez votre connexion internet');
        }
        
        logEvent('ERROR', '❌ Erreur Device Code Flow:', error.message);
        throw error;
    }
}

// 🔥 DEVICE CODE GRANT FLOW - Étape 2: Polling pour les tokens
async function startDeviceCodePolling() {
    if (deviceCodePolling) {
        clearInterval(deviceCodePolling);
    }
    
    logEvent('INFO', `📄 Démarrage polling toutes les ${deviceCodeData.interval} secondes...`);
    
    deviceCodePolling = timerRegistry.setInterval('deviceCodePolling', async () => {
        try {
            // Vérifier si le code n'a pas expiré
            if (Date.now() > deviceCodeData.expires_at) {
                logEvent('WARN', '⏰ Device Code expiré');
                timerRegistry.clearInterval('deviceCodePolling');
                deviceCodePolling = null;
                return;
            }
            
            // Créer un contrôleur d'annulation pour timeout plus long
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 secondes timeout
            
            // Requête conforme à la documentation
            const response = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: twitchConfig.client_id,
                    device_code: deviceCodeData.device_code,
                    grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const tokenData = await response.json();
            
            if (response.ok) {
                // Succès ! Tokens obtenus
                logEvent('INFO', '🎉 Authentification Device Code Grant réussie !');
                
                // Validation des tokens reçus
                if (!tokenData.access_token) {
                    throw new Error('Access token manquant dans la réponse');
                }
                
                twitchConfig.access_token = tokenData.access_token;
                twitchConfig.refresh_token = tokenData.refresh_token;
                
                // Log des scopes reçus
                if (tokenData.scope && Array.isArray(tokenData.scope)) {
                    logEvent('INFO', `🔐 Scopes accordés: ${tokenData.scope.join(', ')}`);
                }
                
                // Arrêter le polling
                timerRegistry.clearInterval('deviceCodePolling');
                deviceCodePolling = null;
                
                // Obtenir les infos utilisateur
                await getUserInfo();
                
                // Sauvegarder la configuration
                saveTwitchConfig();
                
                // Démarrer EventSub avec délai
                timerRegistry.setTimeout('startEventSubAfterAuth', () => {
                    connectTwitchEventSub();
                }, 2000);
                
            } else {
                // Gérer les différents types d'erreurs selon la documentation
                switch (tokenData.error) {
                    case 'authorization_pending':
                        logEvent('INFO', '⏳ En attente de l\'autorisation utilisateur...');
                        break;
                    case 'slow_down':
                        logEvent('WARN', '🌙 Ralentissement du polling demandé par Twitch');
                        deviceCodeData.interval += 5; // Augmenter l'intervalle
                        timerRegistry.clearInterval('deviceCodePolling');
                        timerRegistry.setTimeout('restartDeviceCodePolling', startDeviceCodePolling, deviceCodeData.interval * 1000);
                        break;
                    case 'access_denied':
                        logEvent('WARN', '❌ Accès refusé par l\'utilisateur');
                        timerRegistry.clearInterval('deviceCodePolling');
                        deviceCodePolling = null;
                        break;
                    case 'expired_token':
                        logEvent('WARN', '⏰ Device Code expiré');
                        timerRegistry.clearInterval('deviceCodePolling');
                        deviceCodePolling = null;
                        break;
                    default:
                        logEvent('WARN', `⚠️ Erreur polling inconnue: ${tokenData.error} - ${tokenData.error_description || ''}`);
                }
            }
            
        } catch (error) {
        // Gestion spécifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('WARN', '⏰ Timeout polling tokens (20s) - polling continue...');
            return; // Continuer le polling sans interrompre
        }            // Gestion d'erreurs réseau - ne pas arrêter le polling
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                logEvent('WARN', '🌙 Erreur réseau temporaire - polling continue...');
                return; // Continuer le polling
            }
            
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                logEvent('WARN', `🌙 Erreur connexion (${error.code}) - polling continue...`);
                return; // Continuer le polling
            }
            
            logEvent('ERROR', '❌ Erreur polling tokens:', error.message);
            
            // Pour toute autre erreur, continuer quand même le polling
            // mais avec un intervalle plus long pour éviter le spam
            if (deviceCodeData.interval < 10) {
                deviceCodeData.interval = Math.min(deviceCodeData.interval + 2, 10);
                logEvent('INFO', `📄 Augmentation intervalle polling à ${deviceCodeData.interval}s`);
            }
        }
    }, deviceCodeData.interval * 1000);
}

// Obtenir les informations utilisateur
async function getUserInfo() {
    try {
        console.log('📄 Récupération des informations utilisateur...');
        
        // Créer un contrôleur d'annulation pour timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 secondes timeout
        
        const response = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${twitchConfig.access_token}`,
                'Client-Id': twitchConfig.client_id
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error('Erreur récupération utilisateur');
        }
        
        const userData = await response.json();
        const user = userData.data[0];
        
        twitchConfig.user_id = user.id;
        twitchConfig.username = user.login;
        twitchConfig.configured = true;
        
        console.log(`👤 Connecté en tant que: @${twitchConfig.username}`);
        
        // Sauvegarder immédiatement après récupération des infos utilisateur
        saveTwitchConfig();
        
        // Vérifier et accorder les privilèges de modérateur si nécessaire
        const hasModeratorPrivileges = await ensureModeratorPrivileges();
        
        if (!hasModeratorPrivileges) {
            logEvent('INFO', '📄 Privilèges de modérateur non disponibles - démarrage du polling en mode fallback');
            // Démarrer le polling immédiatement si pas de privilèges EventSub
            startFollowPolling(10); // Vérifier toutes les 10 secondes
        }
        
        // Récupérer le nombre de follows actuel au démarrage
        try {
            console.log('📊 Récupération du nombre de follows initial...');
            const result = await getTwitchFollowCount();
            
            if (result.success) {
                const oldCount = currentFollows;
                currentFollows = result.data;
                updateFiles(currentFollows);
                broadcastUpdate();
                
                console.log(`📊 Follows récupérés au démarrage: ${oldCount} → ${result.data}`);
                
                // Sauvegarder l'état initial sur disque pour la persistence
                saveFollowCountToFile(currentFollows);
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.warn('⚠️ Impossible de récupérer les follows au démarrage:', error.message);
            // Charger depuis le fichier sauvegardé si l'API échoue
            const savedCount = loadFollowCountFromFile();
            if (savedCount > 0) {
                currentFollows = savedCount;
                updateFiles(currentFollows);
                broadcastUpdate();
                console.log(`📂 Nombre de follows restauré depuis le fichier: ${savedCount}`);
            }
        }
        
    } catch (error) {
        // Gestion spécifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('ERROR', '❌ Timeout récupération infos utilisateur (10s)');
            throw new Error('Timeout de connexion à l\'API Twitch');
        }
        
        console.error('❌ Erreur infos utilisateur:', error.message);
        throw error;
    }
}

// Vérifier et accorder les privilèges de modérateur si nécessaire
async function ensureModeratorPrivileges() {
    try {
        logEvent('INFO', '🔐 Vérification des privilèges de modérateur...');
        
        // D'abord, vérifier si l'utilisateur est déjà modérateur de son propre canal
        const isModerator = await checkIfModerator();
        
        if (isModerator) {
            logEvent('INFO', '✅ Utilisateur déjà modérateur de son propre canal');
            return true;
        }
        
        // Si pas modérateur, essayer de s'auto-accorder les privilèges
        logEvent('INFO', '🔧 Tentative d\'auto-attribution des privilèges de modérateur...');
        const granted = await grantSelfModerator();
        
        if (granted) {
            logEvent('INFO', '✅ Privilèges de modérateur accordés avec succès');
            return true;
        } else {
            logEvent('WARN', '⚠️ Impossible d\'accorder les privilèges de modérateur automatiquement');
            logEvent('INFO', '📌 Vous devrez peut-être accorder manuellement les privilèges de modérateur dans votre tableau de bord Twitch');
            return false;
        }
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur vérification privilèges modérateur:', error.message);
        return false;
    }
}

// Vérifier si l'utilisateur est modérateur de son propre canal
async function checkIfModerator() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${twitchConfig.user_id}&user_id=${twitchConfig.user_id}`, {
            headers: {
                'Authorization': `Bearer ${twitchConfig.access_token}`,
                'Client-Id': twitchConfig.client_id
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            return data.data && data.data.length > 0;
        }
        
        return false;
        
    } catch (error) {
        logEvent('WARN', '⚠️ Erreur vérification statut modérateur:', error.message);
        return false;
    }
}

// Tenter d'accorder les privilèges de modérateur à soi-même
async function grantSelfModerator() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch('https://api.twitch.tv/helix/moderation/moderators', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${twitchConfig.access_token}`,
                'Client-Id': twitchConfig.client_id,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                broadcaster_id: twitchConfig.user_id,
                user_id: twitchConfig.user_id
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            return true;
        } else {
            const errorText = await response.text();
            logEvent('WARN', `⚠️ Échec auto-attribution modérateur: ${response.status} - ${errorText}`);
            return false;
        }
        
    } catch (error) {
        logEvent('WARN', '⚠️ Erreur auto-attribution modérateur:', error.message);
        return false;
    }
}

// Vérifier si l'utilisateur peut s'auto-attribuer les privilèges modérateur
async function canGrantSelfModerator() {
    try {
        // Vérifier si nous avons le scope nécessaire
        if (!twitchConfig.scope || !twitchConfig.scope.includes('channel:manage:moderators')) {
            return false;
        }
        
        // Pour un broadcaster sur son propre canal, cette fonctionnalité devrait être disponible
        return true;
        
    } catch (error) {
        logEvent('WARN', '⚠️ Erreur vérification capacité auto-attribution modérateur:', error.message);
        return false;
    }
}

// ========================================
// 📊 WRAPPERS COMPTEURS (délégation à countersService)
// ========================================
// Note: Ces wrappers seront supprimés une fois la migration complète

const saveFollowCountToFile = (count) => countersService.saveFollowCountToFile(count);
const loadFollowCountFromFile = () => countersService.loadFollowCountFromFile();
const saveSubCountToFile = (count) => countersService.saveSubCountToFile(count);
const loadSubCountFromFile = () => countersService.loadSubCountFromFile();

// Fonction pour renouveler automatiquement le token d'accès
async function refreshTwitchToken() {
    try {
        console.log('📄 Renouvellement du token Twitch...');
        
        // Créer un contrôleur d'annulation pour timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 secondes timeout
        
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: twitchConfig.client_id,
                grant_type: 'refresh_token',
                refresh_token: twitchConfig.refresh_token
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Erreur renouvellement token: ${response.status} - ${errorData}`);
        }
        
        const tokenData = await response.json();
        
        // Mettre à jour la configuration
        twitchConfig.access_token = tokenData.access_token;
        if (tokenData.refresh_token) {
            twitchConfig.refresh_token = tokenData.refresh_token;
        }
        
        // Sauvegarder la nouvelle configuration
        saveTwitchConfig();
        
        console.log('✅ Token Twitch renouvelé avec succès');
        return true;
        
    } catch (error) {
        // Gestion spécifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('ERROR', '❌ Timeout renouvellement token (10s)');
            return false;
        }
        
        console.error('❌ Erreur renouvellement token:', error.message);
        return false;
    }
}

// Obtenir le nombre de follows depuis Twitch (Result Pattern)
async function getTwitchFollowCount() {
    if (!appState.config.twitch.access_token || !appState.config.twitch.user_id) {
        const message = `Configuration Twitch incomplète - Token: ${!!appState.config.twitch.access_token}, UserID: ${!!appState.config.twitch.user_id}`;
        logEvent('ERROR', message);
        return {
            success: false,
            error: message,
            code: 'NOT_CONFIGURED'
        };
    }
    
    try {
        const apiUrl = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${appState.config.twitch.user_id}`;
        logEvent('INFO', `🔐 Appel API Twitch Follows: ${apiUrl}`);
        logEvent('INFO', `🔑 User ID: ${appState.config.twitch.user_id}`);
        
        // Créer un contrôleur d'annulation pour timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${appState.config.twitch.access_token}`,
                'Client-Id': appState.config.twitch.client_id
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        logEvent('INFO', `📡 Réponse API Twitch: Status ${response.status}`);
        
        if (!response.ok) {
            if (response.status === 401) {
                logEvent('WARN', '🔐 Token expiré, tentative de renouvellement...');
                const refreshResult = await refreshTwitchToken();
                
                if (refreshResult && refreshResult.success) {
                    logEvent('INFO', '✅ Token renouvelé, nouvelle tentative...');
                    return await getTwitchFollowCount();
                }
                
                return {
                    success: false,
                    error: 'Token expiré et échec du renouvellement',
                    code: 'TOKEN_EXPIRED'
                };
            }
            
            const errorText = await response.text();
            logEvent('ERROR', `❌ Erreur API Twitch: ${response.status} - ${errorText}`);
            return {
                success: false,
                error: `Erreur API Twitch (${response.status})`,
                code: 'API_ERROR',
                details: errorText
            };
        }
        
        const data = await response.json();
        const followCount = data.total || 0;
        
        logEvent('SUCCESS', `📊 ✅ API Twitch Follows: ${followCount} follows récupérés`);
        
        // Log supplémentaire pour validation
        if (data.data && data.data.length > 0) {
            logEvent('INFO', `👥 Détails: ${data.data.length} follows dans la réponse`);
        }
        
        return {
            success: true,
            data: followCount
        };
        
    } catch (error) {
        // Gestion spécifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('ERROR', '❌ Timeout API Twitch Follows (15s) - connexion lente');
            return {
                success: false,
                error: 'Timeout de connexion à l\'API Twitch',
                code: 'TIMEOUT'
            };
        }
        
        logEvent('ERROR', '❌ Erreur récupération follows Twitch:', error.message);
        return {
            success: false,
            error: error.message,
            code: 'NETWORK_ERROR'
        };
    }
}

// Obtenir le nombre de subs depuis Twitch
async function getTwitchSubCount() {
    if (!twitchConfig.access_token || !twitchConfig.user_id) {
        const error = `Configuration Twitch incomplète - Token: ${!!twitchConfig.access_token}, UserID: ${!!twitchConfig.user_id}`;
        logEvent('ERROR', error);
        throw new Error(error);
    }
    
    try {
        const apiUrl = `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${twitchConfig.user_id}`;
        logEvent('INFO', `🔐 Appel API Twitch Subs: ${apiUrl}`);
        logEvent('INFO', `🔑 User ID: ${twitchConfig.user_id}`);
        
        // Créer un contrôleur d'annulation pour timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 secondes timeout
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${twitchConfig.access_token}`,
                'Client-Id': twitchConfig.client_id
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        logEvent('INFO', `📡 Réponse API Twitch Subs: Status ${response.status}`);
        
        if (!response.ok) {
            if (response.status === 401) {
                logEvent('WARN', '🔐 Token expiré, tentative de renouvellement...');
                // Token expiré, essayer de le renouveler
                const refreshed = await refreshTwitchToken();
                if (refreshed) {
                    logEvent('INFO', '✅ Token renouvelé, nouvelle tentative...');
                    // Retry with new token
                    return await getTwitchSubCount();
                } else {
                    throw new Error('Échec du renouvellement du token');
                }
            }
            
            const errorText = await response.text();
            logEvent('ERROR', `❌ Erreur API Twitch Subs: ${response.status} - ${errorText}`);
            throw new Error(`Erreur API Twitch subs: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const subCount = data.total || 0;
        
        logEvent('SUCCESS', `📊 ✅ API Twitch Subs: ${subCount} subs récupérés`);
        
        // Log supplémentaire pour validation
        if (data.data && data.data.length > 0) {
            logEvent('INFO', `👥 Détails: ${data.data.length} subs dans la réponse`);
        }
        
        return subCount;
        
    } catch (error) {
        // Gestion spécifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('ERROR', '❌ Timeout API Twitch Subs (15s) - connexion lente');
            throw new Error('Timeout de connexion à l\'API Twitch pour les subs');
        }
        
        logEvent('ERROR', '❌ Erreur récupération subs Twitch:', { error: error.message });
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 INITIALISATION DU COMPTEUR DE SUBS (AU DÉMARRAGE UNIQUEMENT)
// ═══════════════════════════════════════════════════════════════════════════════
async function initializeSubCounter() {
    try {
        logEvent('INFO', '📊 Initialisation du compteur de subs...');
        
        if (!twitchConfig.access_token || !twitchConfig.user_id) {
            logEvent('WARN', '⚠️ Tokens manquants, chargement depuis fichier');
            const savedCount = loadSubCountFromFile();
            currentSubs = savedCount;
            appState.counters.subs = savedCount;
            updateSubFiles(savedCount);
            return { success: true, data: savedCount, source: 'file' };
        }
        
        const subCount = await getTwitchSubCount();
        
        currentSubs = subCount;
        appState.counters.subs = subCount;
        updateSubFiles(subCount);
        broadcastSubUpdate();
        saveSubCountToFile(subCount);
        
        logEvent('SUCCESS', `✅ Compteur subs initialisé: ${subCount}`);
        
        return { success: true, data: subCount, source: 'api' };
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur initialisation subs:', { error: error.message });
        
        // Charger depuis le fichier sauvegardé
        const savedCount = loadSubCountFromFile();
        currentSubs = savedCount;
        appState.counters.subs = savedCount;
        updateSubFiles(savedCount);
        
        return { success: false, error: error.message, data: savedCount, source: 'file' };
    }
}

// ========================================
// 📡 WRAPPERS POLLING (délégation à pollingService)
// ========================================
// Note: Ces wrappers seront supprimés une fois la migration complète

const startFollowPolling = (intervalSeconds = 10) => pollingService.startFollowPolling(intervalSeconds);
const stopFollowPolling = () => pollingService.stopFollowPolling();
const pollFollowCount = () => pollingService.pollFollowCount();

// ========================================
// 🎯 WRAPPERS EVENT HANDLERS (délégation à eventHandlersService)
// ========================================
// Note: Ces wrappers seront supprimés une fois la migration complète

const handleFollowEvent = (data) => eventHandlersService.handleFollowEvent(data);
const handleSubEvent = (data) => eventHandlersService.handleSubEvent(data);
const handleSubEndEvent = (data) => eventHandlersService.handleSubEndEvent(data);
const handleSyncEvent = (data) => eventHandlersService.handleSyncEvent(data);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 NOUVEAU SYSTÈME D'ÉVÉNEMENTS - EventQueue (Thread-Safe)
// ═══════════════════════════════════════════════════════════════════════════════
// Note: L'ancien système eventBuffer a été remplacé par EventQueue
// Les handlers sont maintenant dans eventHandlersService

// Version sécurisée de updateFollowCount avec protection contre les erreurs
function updateFollowCountSafe(newCount) {
    try {
        if (typeof newCount !== 'number' || newCount < 0) {
            logEvent('WARN', `⚠️ Nombre de follows invalide: ${newCount}`);
            return;
        }
        
        updateFollowCount(newCount);
        saveFollowBackup();
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur mise à jour compteur:', error.message);
    }
}

// Mettre à jour le count de follows et les fichiers
function updateFollowCount(newCount) {
    const oldCount = currentFollows;
    currentFollows = newCount;
    
    // Synchroniser lastKnownFollowCount pour éviter désynchronisation avec le polling
    lastKnownFollowCount = newCount;
    
    // Mettre à jour les fichiers
    updateFollowFiles(currentFollows);
    
    // Diffuser aux clients WebSocket
    broadcastFollowUpdate();
    
    logEvent('INFO', `📊 Follow count mis à jour: ${oldCount} → ${newCount}`);
}

// Version sécurisée de updateSubCount avec protection contre les erreurs
function updateSubCountSafe(newCount) {
    try {
        if (typeof newCount !== 'number' || newCount < 0) {
            logEvent('WARN', `⚠️ Nombre de subs invalide: ${newCount}`);
            return;
        }
        
        updateSubCount(newCount);
        saveSubCountToFile(newCount);
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur mise à jour compteur subs:', error.message);
    }
}

// Mettre à jour le count de subs et les fichiers
function updateSubCount(newCount) {
    const oldCount = currentSubs;
    currentSubs = newCount;
    
    // Mettre à jour les fichiers
    updateSubFiles(currentSubs);
    // Sauvegarder le compteur subs pour persistance
    try { saveSubCountToFile(currentSubs); } catch (e) { /* ignore */ }
    
    // Diffuser aux clients WebSocket
    broadcastSubUpdate();
    
    logEvent('INFO', `📊 Sub count mis à jour: ${oldCount} → ${newCount}`);
}

// Sauvegarder les follows en backup
function saveFollowBackup() {
    try {
        saveFollowCountToFile(currentFollows);
        logEvent('INFO', `💾 Backup sauvegardé: ${currentFollows} follows`);
    } catch (error) {
        logEvent('ERROR', '❌ Erreur sauvegarde backup:', error.message);
    }
}

// Reset du timer keepalive selon la documentation Twitch
function resetKeepaliveTimer(timeoutSeconds = 10) {
    timerRegistry.clearTimeout('keepalive');
    
    // Selon la documentation: Si pas de message dans keepalive_timeout_seconds, reconnecter
    keepaliveTimeout = timerRegistry.setTimeout('keepalive', () => {
        logEvent('WARN', `⏰ Keepalive timeout (${timeoutSeconds}s) - reconnexion nécessaire`);
        
        if (twitchEventSubWs) {
            twitchEventSubWs.close();
        }
        
        // Reconnexion après timeout
        timerRegistry.setTimeout('reconnectAfterKeepalive', connectTwitchEventSub, 2000);
    }, timeoutSeconds * 1000);
}

// Gestion de la reconnexion avec URL fournie (conforme documentation)
async function handleReconnect(reconnectUrl) {
    try {
        logEvent('INFO', '📄 Début processus de reconnexion avec URL fournie');
        
        // Créer nouvelle connexion AVANT de fermer l'ancienne (selon doc)
        const newWs = new WebSocket(reconnectUrl);
        
        newWs.on('open', () => {
            logEvent('INFO', '✅ Nouvelle connexion EventSub établie');
        });
        
        newWs.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                // Attendre le welcome de la nouvelle connexion
                if (message.metadata?.message_type === 'session_welcome') {
                    logEvent('INFO', '🎉 Welcome reçu sur nouvelle connexion - fermeture ancienne connexion');
                    
                    // Fermer l'ancienne connexion seulement maintenant
                    if (twitchEventSubWs) {
                        twitchEventSubWs.removeAllListeners();
                        twitchEventSubWs.close();
                    }
                    
                    // Basculer vers la nouvelle connexion
                    twitchEventSubWs = newWs;
                    await handleEventSubMessage(message);
                    
                    // Configurer les handlers pour la nouvelle connexion
                    setupWebSocketHandlers(twitchEventSubWs);
                } else {
                    await handleEventSubMessage(message);
                }
            } catch (error) {
                logEvent('ERROR', 'Erreur message sur nouvelle connexion:', error.message);
            }
        });
        
        newWs.on('error', (error) => {
            logEvent('ERROR', 'Erreur nouvelle connexion EventSub:', error.message);
            // En cas d'erreur, retomber sur une reconnexion normale
            timerRegistry.setTimeout('reconnectOnError', connectTwitchEventSub, 5000);
        });
        
    } catch (error) {
        logEvent('ERROR', 'Erreur gestion reconnexion:', error.message);
        // Fallback vers reconnexion normale
        timerRegistry.setTimeout('reconnectOnError', connectTwitchEventSub, 5000);
    }
}

// Configurer les handlers WebSocket (pour éviter duplication)
function setupWebSocketHandlers(ws) {
    ws.on('close', (code, reason) => {
        logEvent('INFO', `📌 WebSocket EventSub fermé: ${code} - ${reason || 'Raison inconnue'}`);
        
        // Clear des timers
        if (keepaliveTimeout) clearTimeout(keepaliveTimeout);
        if (subscriptionTimeout) clearTimeout(subscriptionTimeout);
        
        // Reconnexion automatique avec backoff exponentiel (sauf si code 4000-4007)
        if (code >= 4000 && code <= 4007) {
            logEvent('ERROR', `❌ Erreur WebSocket critique (${code}) - pas de reconnexion automatique`);
            return;
        }
        
        if (twitchConfig.configured && reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 60000);
            reconnectAttempts++;
            
            logEvent('INFO', `📄 Reconnexion programmée dans ${delay/1000}s (tentative ${reconnectAttempts}/${maxReconnectAttempts})`);
            
            timerRegistry.setTimeout('reconnectScheduled', () => {
                connectTwitchEventSub();
            }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
            logEvent('ERROR', `❌ Échec de reconnexion après ${maxReconnectAttempts} tentatives`);
        }
    });
    
    ws.on('error', (error) => {
        logEvent('ERROR', 'Erreur WebSocket EventSub:', error.message);
    });
}

// 🔥 Connexion WebSocket EventSub Twitch
async function connectTwitchEventSub() {
    if (!twitchConfig.configured) {
        console.log('⚠️ Configuration Twitch requise pour EventSub');
        return;
    }

    console.log(`📌 Connexion WebSocket EventSub Twitch... (Tentative ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
    
    try {
        // Fermer la connexion existante si elle existe
        if (twitchEventSubWs) {
            twitchEventSubWs.removeAllListeners();
            twitchEventSubWs.close();
            twitchEventSubWs = null;
            sessionId = null;
        }
        
        // Clear des timers existants
        if (keepaliveTimeout) clearTimeout(keepaliveTimeout);
        if (subscriptionTimeout) clearTimeout(subscriptionTimeout);
        
        // Connexion selon la documentation officielle
        twitchEventSubWs = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
        
        twitchEventSubWs.on('open', () => {
            logEvent('INFO', '✅ WebSocket EventSub connecté !');
            reconnectAttempts = 0; // Reset du compteur lors d'une connexion réussie
        });
        
        twitchEventSubWs.on('message', async (data) => {
            try {
                const rawMessage = data.toString();
                console.log('🔐 Message WebSocket RAW reçu:', rawMessage.substring(0, 500) + (rawMessage.length > 500 ? '...' : ''));
                
                const message = JSON.parse(rawMessage);
                console.log('📦 Message WebSocket parsé:', JSON.stringify(message, null, 2));
                
                await handleEventSubMessage(message);
            } catch (parseError) {
                logEvent('ERROR', 'Erreur parsing message EventSub:', parseError.message);
                console.error('📄 Message problématique:', data.toString().substring(0, 500));
                
                // Ne pas faire crasher le serveur, juste loguer l'erreur
                try {
                    // Ajouter une synchronisation de sécurité en cas d'erreur de parsing via EventQueue
                    eventQueue.add({
                        id: `sync-parse-error-${Date.now()}`,
                        type: VALID_EVENT_TYPES.SYNC,
                        data: {
                            reason: 'Synchronisation après erreur parsing EventSub',
                            error: parseError.message
                        },
                        timestamp: Date.now()
                    });
                } catch (queueError) {
                    console.error('❌ Erreur ajout événement de sécurité:', queueError.message);
                }
            }
        });
        
        // Utiliser les handlers centralisés
        setupWebSocketHandlers(twitchEventSubWs);
        
    } catch (error) {
        console.error('❌ Erreur connexion EventSub:', error.message);
        
        // Retry après un délai
        if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 60000);
            reconnectAttempts++;
            
            timerRegistry.setTimeout('reconnectOnClose', () => {
                connectTwitchEventSub();
            }, delay);
        }
    }
}

// Gérer les messages EventSub
async function handleEventSubMessage(message) {
    try {
        const messageType = message.metadata?.message_type;
        
        if (!messageType) {
            console.warn('⚠️ Message EventSub sans type:', message);
            return;
        }
        
        console.log(`📨 Message EventSub reçu: ${messageType}`);
        
        switch (messageType) {
            case 'session_welcome':
                sessionId = message.payload?.session?.id;
                const keepaliveTimeout = message.payload?.session?.keepalive_timeout_seconds || 10;
                
                if (sessionId) {
                    logEvent('INFO', `🎉 Session EventSub établie: ${sessionId}`);
                    logEvent('INFO', `⏰ Keepalive timeout: ${keepaliveTimeout}s`);
                    
                    // Reset du timer keepalive
                    resetKeepaliveTimer(keepaliveTimeout);
                    
                    // IMPORTANT: S'abonner aux événements dans les 10 secondes
                    timerRegistry.clearTimeout('subscriptionSetup');
                    
                    subscriptionTimeout = timerRegistry.setTimeout('subscriptionSetup', async () => {
                        try {
                            await subscribeToChannelFollow();
                            await subscribeToChannelSubscription();
                            await subscribeToChannelSubscriptionGift();
                            await subscribeToChannelSubscriptionEnd();
                            logEvent('INFO', '✅ Abonnements EventSub (Follow, Sub, Gift, End) créés dans les temps');
                            
                            // Démarrer le polling en mode backup (synchronisation)
                            // Il vérifiera l'API de temps en temps pour s'assurer qu'EventSub n'a pas manqué d'événements
                            startFollowPolling(10); // Toutes les 10s, mais vérifiera seulement ~33% du temps si EventSub actif
                            
                        } catch (error) {
                            logEvent('ERROR', '❌ Échec création abonnements EventSub:', error.message);
                            logEvent('INFO', '📄 Basculement sur le système de polling...');
                            
                            // Si EventSub échoue, démarrer le polling en fallback (mode principal)
                            startFollowPolling(10); // Vérifier toutes les 10 secondes
                        }
                    }, 1000); // S'abonner après 1 seconde
                    
                } else {
                    console.error('❌ Session ID manquant dans le message welcome');
                }
                break;
                
            case 'session_keepalive':
                logEvent('INFO', '📗 Keepalive reçu');
                // Reset du timer keepalive selon la documentation
                resetKeepaliveTimer();
                break;
                
            case 'notification':
                // Reset du timer keepalive selon la documentation
                resetKeepaliveTimer();
                await handleEventSubNotification(message);
                break;
                
            case 'session_reconnect':
                logEvent('INFO', '📄 Reconnexion EventSub requise');
                const reconnectUrl = message.payload?.session?.reconnect_url;
                
                if (reconnectUrl) {
                    logEvent('INFO', `📗 URL de reconnexion fournie: ${reconnectUrl}`);
                    // Selon la documentation, utiliser l'URL fournie
                    await handleReconnect(reconnectUrl);
                } else {
                    logEvent('WARN', '⚠️ Reconnexion demandée sans URL, utilisation URL standard');
                    timerRegistry.setTimeout('reconnectNoUrl', connectTwitchEventSub, 1000);
                }
                break;
                
            case 'revocation':
                // Nouveau: Gestion des révocations selon la documentation
                const subscriptionType = message.metadata?.subscription_type;
                const revocationReason = message.payload?.subscription?.status;
                
                logEvent('WARN', `❌ Abonnement révoqué: ${subscriptionType}, raison: ${revocationReason}`);
                
                // Actions selon le type de révocation
                switch (revocationReason) {
                    case 'authorization_revoked':
                        logEvent('ERROR', '🔐 Autorisation révoquée - réauthentification nécessaire');
                        // Fermer la connexion et demander une nouvelle auth
                        if (twitchEventSubWs) {
                            twitchEventSubWs.close();
                        }
                        break;
                    case 'user_removed':
                        logEvent('ERROR', '👤 Utilisateur supprimé - impossible de continuer');
                        break;
                    case 'version_removed':
                        logEvent('ERROR', '📡 Version d\'événement obsolète - mise à jour nécessaire');
                        break;
                    default:
                        logEvent('WARN', `❓ Révocation inconnue: ${revocationReason}`);
                }
                break;
                
            default:
                console.log('📨 Message EventSub non géré:', messageType);
                console.log('🔐 Contenu du message:', JSON.stringify(message, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Erreur handleEventSubMessage:', error.message);
        console.error('📄 Message problématique:', JSON.stringify(message, null, 2));
    }
}

// Gérer les notifications d'événements
async function handleEventSubNotification(message) {
    try {
        const eventType = message.metadata?.subscription_type;
        const eventData = message.payload?.event;
        
        logEvent('NOTIFICATION', `📣 Notification reçue - Type: ${eventType}`, {
            user_name: eventData?.user_name,
            tier: eventData?.tier,
        });
        
        if (!eventType || !eventData) {
            logEvent('WARN', '⚠️ Notification EventSub incomplète');
            return;
        }
        
        logEvent('INFO', `📣 Événement reçu: ${eventType}`);
        
        switch (eventType) {
            case 'channel.follow':
                const followerName = eventData.user_name || 'Utilisateur inconnu';
                const followerId = eventData.user_id || 'ID inconnu';
                const followedAt = eventData.followed_at || new Date().toISOString();
                
                logEvent('ÉVÉNEMENT', `👤 Nouveau follow: ${followerName}`, {
                    user_name: followerName,
                    user_id: followerId,
                });
                
                console.log('🎉 NOUVEAU FOLLOW DÉTECTÉ !');
                console.log(`👤 Utilisateur: ${followerName}`);
                console.log(`🆔 ID: ${followerId}`);
                
                // Ajouter au buffer d'événements via EventQueue
                eventQueue.add({
                    id: `follow-${Date.now()}`,
                    type: VALID_EVENT_TYPES.FOLLOW,
                    data: {
                        user_name: followerName,
                        user_id: followerId,
                        followed_at: followedAt
                    },
                    timestamp: Date.now()
                });
                
                // Synchronisation pour vérifier le décompte via EventQueue
                eventQueue.add({
                    id: `sync-follow-${Date.now()}`,
                    type: VALID_EVENT_TYPES.SYNC,
                    data: {
                        reason: 'Synchronisation après follow',
                        trigger: 'follow_event'
                    },
                    timestamp: Date.now()
                });
                break;
                
            // ✅ GESTION CORRECTE DES SUBS - Selon documentation Twitch
            case 'channel.subscribe':
                // ✅ Cet event couvre:
                // - Nouveaux subs (normal, Prime, Tier 1/2/3)
                // - Subs offerts reçus (côté receveur)
                // - Upgrades de gift → sub normal
                // ❌ NE couvre PAS les resubs (c'est bon, on ne les compte pas)
                
                const subUserName = eventData.user_name || 'Utilisateur inconnu';
                const subUserId = eventData.user_id || 'ID inconnu';
                const subTier = eventData.tier || '1000';
                const isGiftReceived = eventData.is_gift; // true si reçu en gift
                
                logEvent('ÉVÉNEMENT', `⭐ Nouveau sub: ${subUserName} (Tier ${subTier}${isGiftReceived ? ', gift reçu' : ''})`, {
                    user_name: subUserName,
                    user_id: subUserId,
                    tier: subTier,
                });
                
                console.log('🎉 NOUVEL ABONNEMENT DÉTECTÉ !');
                console.log(`👤 Utilisateur: ${subUserName}`);
                console.log(`⭐ Tier: ${subTier}`);
                console.log(`🎁 Gift reçu: ${isGiftReceived ? 'Oui' : 'Non'}`);
                
                // Incrémenter le compteur via batching
                addSubToBatch(1, subTier);
                break;
                
            // ✅ FIN DE SUB
            case 'channel.subscription.end':
                // ✅ Cet event couvre:
                // - Annulation volontaire
                // - Expiration normale
                // - Fin d'un gift reçu
                // - Fin d'un Prime
                // - Fin d'un upgrade
                
                const endUserName = eventData.user_name || 'Utilisateur inconnu';
                const endUserId = eventData.user_id || 'ID inconnu';
                const endTier = eventData.tier || '1000';
                
                logEvent('ÉVÉNEMENT', `⏹️ Fin d'abonnement: ${endUserName} (Tier ${endTier})`, {
                    user_name: endUserName,
                    user_id: endUserId,
                    tier: endTier,
                });
                
                console.log('⏹️ FIN D\'ABONNEMENT DÉTECTÉE !');
                console.log(`👤 Utilisateur: ${endUserName}`);
                console.log(`⭐ Tier: ${endTier}`);
                
                // Utiliser batching pour les fins d'abonnement afin de fusionner plusieurs unsubs
                // ✅ C'est ici que la fusion s'opère pour le "slot machine" côté client
                addSubEndToBatch(1);
                break;
                
            // ❌ NE PAS GÉRER channel.subscription.renew
            // Les resubs NE changent PAS le compteur total
            // (le viewer était déjà sub, reste sub, nombre total = même)
            
            // ⚠️ channel.subscription.gift est géré différemment
            // C'est l'acte d'offrir des subs, pas de les recevoir
            case 'channel.subscription.gift':
                const gifterName = eventData.user_name || 'Utilisateur inconnu';
                const giftedCount = eventData.total || 1;
                const giftTier = eventData.tier || '1000';
                
                logEvent('ÉVÉNEMENT', `🎁 Subs offerts: ${gifterName} a offert ${giftedCount} subs (Tier ${giftTier})`, {
                    user_name: gifterName,
                    count: giftedCount,
                    tier: giftTier,
                });
                
                console.log('🎁 ABONNEMENTS OFFERTS DÉTECTÉS !');
                console.log(`👤 Gifter: ${gifterName}`);
                console.log(`📊 Nombre: ${giftedCount}`);
                console.log(`⭐ Tier: ${giftTier}`);
                
                // Ajouter au batch
                addSubToBatch(giftedCount, giftTier);
                break;
                
            default:
                logEvent('INFO', `📣 Événement non géré: ${eventType}`);
        }
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur handleEventSubNotification:', { error: error.message });
        
        // Synchronisation de sécurité via EventQueue
        try {
            eventQueue.add({
                id: `sync-eventsub-error-${Date.now()}`,
                type: VALID_EVENT_TYPES.SYNC,
                data: { 
                    reason: 'Synchronisation après erreur EventSub',
                    error: error.message
                },
                timestamp: Date.now()
            });
        } catch (queueError) {
            logEvent('ERROR', '❌ Échec ajout sync de sécurité:', { error: queueError.message });
        }
    }
}

// S'abonner aux événements de follow
async function subscribeToChannelFollow() {
    if (!sessionId || !twitchConfig.user_id) {
        throw new Error('Session ID ou User ID manquant');
    }
    
    try {
        const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${twitchConfig.access_token}`,
                'Client-Id': twitchConfig.client_id,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'channel.follow',
                version: '2',
                condition: {
                    broadcaster_user_id: twitchConfig.user_id,
                    moderator_user_id: twitchConfig.user_id
                },
                transport: {
                    method: 'websocket',
                    session_id: sessionId
                }
            })
        });
        
        if (response.ok) {
            console.log('✅ Abonnement aux événements de follow activé');
            return true;
        } else {
            const error = await response.text();
            console.error('❌ Erreur abonnement EventSub follow:', error);
            throw new Error(`Échec abonnement EventSub: ${response.status} - ${error}`);
        }
    } catch (error) {
        console.error('❌ Erreur souscription follow:', error);
        throw error; // Re-lancer l'erreur pour que le code appelant la gère
    }
}

// S'abonner aux nouveaux abonnements
async function subscribeToChannelSubscription() {
    if (!sessionId || !twitchConfig.user_id) return;
    
    try {
        const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${twitchConfig.access_token}`,
                'Client-Id': twitchConfig.client_id,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'channel.subscribe',
                version: '1',
                condition: {
                    broadcaster_user_id: twitchConfig.user_id
                },
                transport: {
                    method: 'websocket',
                    session_id: sessionId
                }
            })
        });
        
        if (response.ok) {
            console.log('✅ Abonnement aux nouveaux abonnements activé');
        } else {
            const error = await response.text();
            console.error('❌ Erreur abonnement EventSub subscription:', error);
        }
    } catch (error) {
        console.error('❌ Erreur souscription subscription:', error);
    }
}

// S'abonner aux dons d'abonnements
async function subscribeToChannelSubscriptionGift() {
    if (!sessionId || !twitchConfig.user_id) return;
    
    try {
        const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${twitchConfig.access_token}`,
                'Client-Id': twitchConfig.client_id,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'channel.subscription.gift',
                version: '1',
                condition: {
                    broadcaster_user_id: twitchConfig.user_id
                },
                transport: {
                    method: 'websocket',
                    session_id: sessionId
                }
            })
        });
        
        if (response.ok) {
            console.log('✅ Abonnement aux dons d\'abonnements activé');
        } else {
            const error = await response.text();
            console.error('❌ Erreur abonnement EventSub gift:', error);
        }
    } catch (error) {
        console.error('❌ Erreur souscription gift:', error);
    }
}

// S'abonner aux fins d'abonnements
async function subscribeToChannelSubscriptionEnd() {
    if (!sessionId || !twitchConfig.user_id) return;
    
    try {
        const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${twitchConfig.access_token}`,
                'Client-Id': twitchConfig.client_id,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'channel.subscription.end',
                version: '1',
                condition: {
                    broadcaster_user_id: twitchConfig.user_id
                },
                transport: {
                    method: 'websocket',
                    session_id: sessionId
                }
            })
        });
        
        if (response.ok) {
            console.log('✅ Abonnement aux fins d\'abonnements activé');
        } else {
            const error = await response.text();
            console.error('❌ Erreur abonnement EventSub end:', error);
        }
    } catch (error) {
        console.error('❌ Erreur souscription end:', error);
    }
}

// Synchroniser le nombre de follows depuis Twitch (Result Pattern)
async function syncTwitchFollows(reason = 'Synchronisation') {
    try {
        console.log(`📄 ${reason} - Récupération du nombre de follows...`);
        
        // Vérifier l'authentification
        if (!twitchConfig.access_token) {
            return { 
                success: false, 
                error: 'Not authenticated', 
                code: 'NOT_AUTH',
                data: currentFollows 
            };
        }
        
        const result = await getTwitchFollowCount();
        
        if (!result.success) {
            return { 
                success: false, 
                error: result.error, 
                code: result.code,
                data: currentFollows 
            };
        }
        
        const followCount = result.data;
        const oldCount = currentFollows;
        currentFollows = followCount;
        appState.counters.follows = followCount;
        
        // Mettre à jour les fichiers et diffuser
        updateFollowFiles(currentFollows);
        broadcastFollowUpdate();
        
        // Sauvegarder automatiquement sur disque
        saveFollowCountToFile(currentFollows);
        
        const diff = followCount - oldCount;
        const diffText = diff > 0 ? `(+${diff})` : diff < 0 ? `(${diff})` : '(=)';
        logEvent('SYNC', `📊 ${reason}: ${oldCount} → ${followCount} ${diffText}`);
        
        // Log additionnel pour les changements significatifs
        if (Math.abs(diff) > 0) {
            logEvent('INFO', `🎯 Changement détecté ! Mise à jour complète effectuée.`);
        }
        
        return { 
            success: true, 
            data: followCount,
            diff: diff,
            oldValue: oldCount
        };
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur sync follows:', { error: error.message });
        // En cas d'erreur, ne pas perdre les données actuelles
        logEvent('INFO', `💾 Conservation des données actuelles: ${currentFollows} follows`);
        
        return { 
            success: false, 
            error: error.message, 
            code: 'API_ERROR',
            data: currentFollows 
        };
    }
}

// Synchroniser le nombre de subs depuis Twitch (Result Pattern)
async function syncTwitchSubs(reason = 'Synchronisation') {
    try {
        console.log(`📄 ${reason} - Récupération du nombre de subs...`);
        
        // Vérifier l'authentification
        if (!twitchConfig.access_token) {
            return { 
                success: false, 
                error: 'Not authenticated', 
                code: 'NOT_AUTH',
                data: currentSubs 
            };
        }
        
        const subCount = await getTwitchSubCount();
        const oldCount = currentSubs;
        currentSubs = subCount;
        appState.counters.subs = subCount;
        
        // Mettre à jour les fichiers et diffuser
        updateSubFiles(currentSubs);
        broadcastSubUpdate();
        
        // Sauvegarder automatiquement sur disque
        saveSubCountToFile(currentSubs);
        
        const diff = subCount - oldCount;
        const diffText = diff > 0 ? `(+${diff})` : diff < 0 ? `(${diff})` : '(=)';
        logEvent('SYNC', `📊 ${reason} subs: ${oldCount} → ${subCount} ${diffText}`);
        
        // Log additionnel pour les changements significatifs
        if (Math.abs(diff) > 0) {
            logEvent('INFO', `🎯 Changement subs détecté ! Mise à jour complète effectuée.`);
        }
        
        return { 
            success: true, 
            data: subCount,
            diff: diff,
            oldValue: oldCount
        };
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur sync subs:', { error: error.message });
        // En cas d'erreur, ne pas perdre les données actuelles
        logEvent('INFO', `💾 Conservation des données actuelles: ${currentSubs} subs`);
        
        return { 
            success: false, 
            error: error.message, 
            code: 'API_ERROR',
            data: currentSubs 
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 FONCTIONS WRAPPER (délèguent aux services modulaires)
// ═══════════════════════════════════════════════════════════════════════════════
// Ces wrappers maintiennent la compatibilité avec le code existant
// tout en déléguant aux services modulaires.

// Goals wrappers
const loadFollowGoals = () => goalsService.loadFollowGoals();
const loadSubGoals = () => goalsService.loadSubGoals();
const loadGoals = () => goalsService.loadGoals();
const setupConfigWatcher = () => goalsService.setupConfigWatcher();
const getCurrentFollowGoal = (follows) => goalsService.getCurrentFollowGoal(follows);
const getCurrentSubGoal = (subs) => goalsService.getCurrentSubGoal(subs);

// Batching wrappers
const addFollowToBatch = (count = 1) => batchingService.addFollowToBatch(count);
const flushFollowBatch = () => batchingService.flushFollowBatch();
const addSubToBatch = (count = 1, tier = '1000') => batchingService.addSubToBatch(count, tier);
const flushSubBatch = () => batchingService.flushSubBatch();
const addFollowRemoveToBatch = (count = 1) => batchingService.addFollowRemoveToBatch(count);
const flushFollowRemoveBatch = () => batchingService.flushFollowRemoveBatch();
const addSubEndToBatch = (count = 1) => batchingService.addSubEndToBatch(count);
const flushSubEndBatch = () => batchingService.flushSubEndBatch();

// ========================================
// 📁 MISE À JOUR DES FICHIERS
// ========================================

// Mettre à jour les fichiers pour les follows
function updateFollowFiles(follows) {
    const goal = getCurrentFollowGoal(follows);
    
    // Choix du format d'affichage selon le cas
    let goalText;
    if (goal.isMaxReached) {
        // Cas où on a dépassé tous les objectifs : afficher seulement le nombre
        goalText = follows.toString();
    } else {
        // Vérifier si le message est vide ou undefined
        if (!goal.message || goal.message.trim() === '') {
            // Message vide : afficher seulement {followcount}/{goal}
            goalText = `${goal.current}/${goal.target}`;
        } else {
            // Message présent : afficher le format complet {followcount}/{goal} : {message}
            goalText = `${goal.current}/${goal.target} : ${goal.message}`;
        }
    }
    
    try {
        // Les overlays HTML utilisent WebSocket, pas de fichiers texte
        console.log(`📊 Follows mis à jour: ${follows} follows`);
    } catch (error) {
        console.error('❌ Erreur mise à jour follows:', error.message);
    }
}

// Mettre à jour les fichiers pour les subs
function updateSubFiles(subs) {
    const goal = getCurrentSubGoal(subs);
    
    // Choix du format d'affichage selon le cas
    let goalText;
    if (goal.isMaxReached) {
        // Cas où on a dépassé tous les objectifs : afficher seulement le nombre
        goalText = subs.toString();
    } else {
        // Vérifier si le message est vide ou undefined
        if (!goal.message || goal.message.trim() === '') {
            // Message vide : afficher seulement {subcount}/{goal}
            goalText = `${goal.current}/${goal.target}`;
        } else {
            // Message présent : afficher le format complet {subcount}/{goal} : {message}
            goalText = `${goal.current}/${goal.target} : ${goal.message}`;
        }
    }
    
    try {
        // Les overlays HTML utilisent WebSocket, pas de fichiers texte
        console.log(`📊 Subs mis à jour: ${subs} subs`);
    } catch (error) {
        console.error('❌ Erreur mise à jour subs:', error.message);
    }
}

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ port: 8083 });

wss.on('connection', (ws) => {
    console.log('📌 Client WebSocket connecté');
    
    // Envoyer les données actuelles (follows et subs)
    ws.send(JSON.stringify({
        type: 'follow_update',
        count: currentFollows,
        goal: getCurrentFollowGoal(currentFollows)
    }));
    
    ws.send(JSON.stringify({
        type: 'sub_update',
        count: currentSubs,
        goal: getCurrentSubGoal(currentSubs)
    }));
    
    ws.on('close', () => {
        console.log('📌 Client WebSocket déconnecté');
    });
});

// Diffuser les mises à jour de follows aux clients WebSocket
function broadcastFollowUpdate(batchCount = 1) {
    const isRemoval = batchCount < 0;
    const absCount = Math.abs(batchCount);
    const data = {
        type: 'follow_update',
        count: currentFollows,
        goal: getCurrentFollowGoal(currentFollows),
        batchCount: batchCount, // Nombre de follows groupés (peut être négatif pour unfollows)
        isBatch: absCount > 1, // Indique si c'est un event groupé
        isRemoval: isRemoval // Indique si c'est une suppression
    };
    
    const message = JSON.stringify(data);
    const droppedClients = [];
    let successCount = 0;
    
    wss.clients.forEach(client => {
        if (client.readyState !== WebSocket.OPEN) return;
        
        // ✅ Vérifier la backpressure (saturation du buffer)
        if (client.bufferedAmount > LIMITS.WEBSOCKET_BUFFER_LIMIT) {
            logEvent('WARN', '⚠️ WebSocket saturé, skip envoi', {
                bufferedAmount: client.bufferedAmount,
                limit: LIMITS.WEBSOCKET_BUFFER_LIMIT
            });
            droppedClients.push(client);
            return;
        }
        
        // Envoi avec callback d'erreur
        client.send(message, (err) => {
            if (err) {
                logEvent('ERROR', 'Erreur envoi WebSocket:', { error: err.message });
            } else {
                successCount++;
            }
        });
    });
    
    if (droppedClients.length > 0) {
        logEvent('WARN', `⚠️ ${droppedClients.length} clients ignorés (saturés)`);
    }
    
    logEvent('INFO', `📡 Follow update diffusé à ${successCount}/${wss.clients.size} clients`);
}

// Diffuser les mises à jour de subs aux clients WebSocket  
function broadcastSubUpdate(batchCount = 1, tiers = {}) {
    const isRemoval = batchCount < 0;
    const absCount = Math.abs(batchCount);
    const data = {
        type: 'sub_update',
        count: currentSubs,
        goal: getCurrentSubGoal(currentSubs),
        batchCount: batchCount, // Nombre de subs groupés (peut être négatif pour unsubs)
        isBatch: absCount > 1, // Indique si c'est un event groupé
        isRemoval: isRemoval, // Indique si c'est une suppression
        tiers: tiers // Détails des tiers groupés
    };
    
    const message = JSON.stringify(data);
    const droppedClients = [];
    let successCount = 0;
    
    wss.clients.forEach(client => {
        if (client.readyState !== WebSocket.OPEN) return;
        
        // ✅ Vérifier la backpressure (saturation du buffer)
        if (client.bufferedAmount > LIMITS.WEBSOCKET_BUFFER_LIMIT) {
            logEvent('WARN', '⚠️ WebSocket saturé, skip envoi', {
                bufferedAmount: client.bufferedAmount,
                limit: LIMITS.WEBSOCKET_BUFFER_LIMIT
            });
            droppedClients.push(client);
            return;
        }
        
        // Envoi avec callback d'erreur
        client.send(message, (err) => {
            if (err) {
                logEvent('ERROR', 'Erreur envoi WebSocket:', { error: err.message });
            } else {
                successCount++;
            }
        });
    });
    
    if (droppedClients.length > 0) {
        logEvent('WARN', `⚠️ ${droppedClients.length} clients ignorés (saturés)`);
    }
    
    logEvent('INFO', `📡 Sub update diffusé à ${successCount}/${wss.clients.size} clients`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 TWITCH CONFIG WRAPPERS (délègue au service twitchConfigService)
// ═══════════════════════════════════════════════════════════════════════════════
const loadTwitchConfig = () => twitchConfigService.loadTwitchConfig();
const saveTwitchConfig = () => twitchConfigService.saveTwitchConfig();
// Note: refreshTwitchToken reste inline car utilisé par le Device Code Flow
const resetTwitchConfig = () => twitchConfigService.resetTwitchConfig();

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 ROUTES (Anciennes routes supprimées - voir ./routes/)
// ═══════════════════════════════════════════════════════════════════════════════
// Les routes sont maintenant définies dans les modules :
// - routes/pages.js   : Pages HTML (/, /dashboard, /config, /test, /admin)
// - routes/api.js     : API publiques (/api/status, /api/stats, etc.)
// - routes/admin.js   : Administration (/admin/*)
// - routes/twitch.js  : Authentification Twitch (/api/auth-status, etc.)

// Route statique pour servir les overlays OBS (reste ici car c'est du middleware statique)
app.use('/obs/overlays', express.static(path.join(ROOT_DIR, 'obs', 'overlays')));

// ==================================================================
// 🎨 SYSTÈME DE CONFIGURATION DYNAMIQUE DES OVERLAYS
// ==================================================================

// Charger la configuration des overlays (depuis app_state.json centralisé)
let overlayConfig = {};

function loadOverlayConfig() {
    try {
        // Utiliser le système centralisé app_state.json
        overlayConfig = getOverlayConfig();
        logEvent('INFO', '✅ Configuration overlay chargée depuis app_state.json');
    } catch (error) {
        logEvent('ERROR', '❌ Erreur chargement config overlay', { error: error.message });
        overlayConfig = {
            font: { family: 'Arial', size: '64px', weight: 'normal' },
            colors: { text: 'white', shadow: 'rgba(0,0,0,0.5)', stroke: 'black' },
            animation: { duration: '1s', easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
            layout: { paddingLeft: '20px', gap: '0' }
        };
    }
}

function saveOverlayConfig() {
    try {
        // Sauvegarder via le système centralisé
        updateOverlayConfig(overlayConfig);
        logEvent('INFO', '✅ Configuration overlay sauvegardée dans app_state.json');
    } catch (error) {
        logEvent('ERROR', '❌ Erreur sauvegarde config overlay', { error: error.message });
    }
}

// API REST pour récupérer la configuration
app.get('/api/overlay-config', (req, res) => {
    res.json(overlayConfig);
});

// API REST pour récupérer les informations de version
app.get('/api/version', (req, res) => {
    res.json(getVersionInfo());
});

// API REST pour récupérer l'état complet de l'application
app.get('/api/app-state', (req, res) => {
    const state = loadAppState();
    // Ne pas renvoyer les données sensibles
    res.json({
        counters: state.counters,
        goals: state.goals,
        version: state.version
    });
});

// API REST pour mettre à jour la configuration depuis Python
app.post('/api/overlay-config', (req, res) => {
    try {
        const updates = req.body;
        
        // Fusionner les mises à jour avec la config existante
        if (updates.font) overlayConfig.font = { ...overlayConfig.font, ...updates.font };
        if (updates.colors) overlayConfig.colors = { ...overlayConfig.colors, ...updates.colors };
        if (updates.animation) overlayConfig.animation = { ...overlayConfig.animation, ...updates.animation };
        if (updates.layout) overlayConfig.layout = { ...overlayConfig.layout, ...updates.layout };
        
        saveOverlayConfig();
        
        // Notifier tous les overlays connectés via WebSocket
        broadcastConfigUpdate();
        
        logEvent('INFO', '✅ Configuration overlay mise à jour depuis Python', updates);
        res.json({ success: true, config: overlayConfig });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur mise à jour config', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

// WebSocket Server pour communication temps réel avec les overlays
const overlayWss = new WebSocket.Server({ port: 8084 });
const overlayClients = new Set();

overlayWss.on('connection', (ws) => {
    overlayClients.add(ws);
    logEvent('INFO', '📌 Overlay HTML connecté au WebSocket config');
    
    // Envoyer la configuration actuelle au nouveau client
    ws.send(JSON.stringify({
        type: 'config_update',
        config: overlayConfig
    }));
    
    ws.on('close', () => {
        overlayClients.delete(ws);
        logEvent('INFO', '📌 Overlay HTML déconnecté du WebSocket config');
    });
    
    ws.on('error', (error) => {
        logEvent('ERROR', '❌ Erreur WebSocket overlay', { error: error.message });
        overlayClients.delete(ws);
    });
});

function broadcastConfigUpdate() {
    const message = JSON.stringify({
        type: 'config_update',
        config: overlayConfig
    });
    
    let successCount = 0;
    overlayClients.forEach(client => {
        try {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
                successCount++;
            } else {
                // Nettoyer les clients fermés
                overlayClients.delete(client);
            }
        } catch (error) {
            logEvent('ERROR', '❌ Erreur envoi config à un client', { error: error.message });
            overlayClients.delete(client);
        }
    });
    
    logEvent('INFO', `📡 Config diffusée à ${successCount}/${overlayClients.size} overlays`);
}

// Charger la config au démarrage
loadOverlayConfig();

// ==================================================================
// 📦 CONTEXTE DE L'APPLICATION (pour les routes modulaires)
// ==================================================================
// Ce contexte expose toutes les variables et fonctions nécessaires aux routes
const appContext = {
    // Variables d'état
    get currentFollows() { return currentFollows; },
    set currentFollows(val) { currentFollows = val; },
    get currentSubs() { return currentSubs; },
    set currentSubs(val) { currentSubs = val; },
    
    // WebSocket servers
    wss,
    overlayWss,
    overlayClients,
    
    // Event Queue
    eventQueue,
    
    // Goals
    followGoals,
    subGoals,
    
    // Twitch config
    get twitchConfig() { return twitchConfig; },
    get deviceCodeData() { return deviceCodeData; },
    get twitchEventSubWs() { return twitchEventSubWs; },
    set twitchEventSubWs(val) { twitchEventSubWs = val; },
    get sessionId() { return sessionId; },
    set sessionId(val) { sessionId = val; },
    get deviceCodePolling() { return deviceCodePolling; },
    set deviceCodePolling(val) { deviceCodePolling = val; },
    get reconnectAttempts() { return reconnectAttempts; },
    set reconnectAttempts(val) { reconnectAttempts = val; },
    
    // Batching state
    get followBatch() { return followBatch; },
    get followRemoveBatch() { return followRemoveBatch; },
    get subBatch() { return subBatch; },
    get subEndBatch() { return subEndBatch; },
    
    // Overlay config
    get overlayConfig() { return overlayConfig; },
    
    // Rate limiters & utilities
    syncLimiter,
    timerRegistry,
    
    // Paths & modules
    ROOT_DIR,
    fs,
    path,
    configCrypto,
    fetch,
    
    // App state functions
    loadAppState,
    saveAppState,
    getOverlayConfig,
    
    // Functions - Goals
    getCurrentFollowGoal,
    getCurrentSubGoal,
    
    // Functions - File updates
    updateFollowFiles,
    updateSubFiles,
    
    // Functions - Broadcasts
    broadcastFollowUpdate,
    broadcastSubUpdate,
    broadcastConfigUpdate,
    
    // Functions - Save to file
    saveFollowCountToFile,
    saveSubCountToFile,
    
    // Functions - Batching
    addFollowToBatch,
    addFollowRemoveToBatch,
    addSubToBatch,
    addSubEndToBatch,
    
    // Functions - Twitch sync
    syncTwitchFollows,
    syncTwitchSubs,
    
    // Functions - Twitch config
    saveTwitchConfig,
    loadGoals,
    initiateDeviceCodeFlow,
    refreshTwitchToken,
    checkIfModerator,
    canGrantSelfModerator,
    
    // Functions - Polling
    stopFollowPolling,
    pollFollowCount,
    
    // Functions - EventSub
    connectTwitchEventSub,
    
    // Logging
    logEvent,
};

// ==================================================================
// 🔧 INITIALISATION DES SERVICES MODULAIRES (Phase 4.0)
// ==================================================================
// Les services sont initialisés avec le contexte de l'application.
// Ils remplacent les fonctions inline précédemment définies.

// Initialiser le service broadcast (pattern factory)
const broadcastServiceInstance = createBroadcastService({
    wss,
    overlayWss,
    overlayClients,
    getCurrentFollowGoal,
    getCurrentSubGoal,
    getOverlayConfig,
    getCurrentFollows: () => currentFollows,
    getCurrentSubs: () => currentSubs,
});

// Contexte pour filesService (dépend de goalsService)
const filesContext = {
    getCurrentFollowGoal,
    getCurrentSubGoal,
};

// Initialiser filesService en premier
filesService.initContext(filesContext);

// Contexte pour countersService (dépend de filesService et broadcastService)
const countersContext = {
    loadAppState,
    saveAppState,
    getCurrentFollows: () => currentFollows,
    setCurrentFollows: (val) => { currentFollows = val; },
    getCurrentSubs: () => currentSubs,
    setCurrentSubs: (val) => { currentSubs = val; },
    setLastKnownFollowCount: (val) => { lastKnownFollowCount = val; },
    updateFollowFiles: filesService.updateFollowFiles,
    updateSubFiles: filesService.updateSubFiles,
    broadcastFollowUpdate,
    broadcastSubUpdate,
};

// Initialiser countersService
countersService.initContext(countersContext);

// Contexte enrichi pour les services avec pattern initContext
const serviceContext = {
    // Paths
    ROOT_DIR,
    
    // State accessors
    get currentFollows() { return currentFollows; },
    set currentFollows(val) { currentFollows = val; },
    get currentSubs() { return currentSubs; },
    set currentSubs(val) { currentSubs = val; },
    get lastKnownFollowCount() { return lastKnownFollowCount; },
    set lastKnownFollowCount(val) { lastKnownFollowCount = val; },
    
    // Goals Maps
    followGoals,
    subGoals,
    
    // Batching state
    get followBatch() { return followBatch; },
    get followRemoveBatch() { return followRemoveBatch; },
    get subBatch() { return subBatch; },
    get subEndBatch() { return subEndBatch; },
    
    // Utilities
    timerRegistry,
    BATCH_DELAY,
    ANIMATION_DURATION,
    
    // Functions (délégation aux services)
    updateFollowFiles: filesService.updateFollowFiles,
    updateSubFiles: filesService.updateSubFiles,
    broadcastFollowUpdate,
    broadcastSubUpdate,
};

// Contexte pour pollingService
const pollingContext = {
    timerRegistry,
    getTwitchConfig: () => twitchConfig,
    getSessionId: () => sessionId,
    getTwitchFollowCount,
    updateFollowCount,
    saveFollowBackup,
};

// Contexte pour eventHandlersService
const eventHandlersContext = {
    addFollowToBatch,
    addSubToBatch,
    addSubEndToBatch,
    getFollowBatch: () => followBatch,
    getSubBatch: () => subBatch,
    eventQueue,
    syncTwitchFollows,
};

// Contexte pour eventsubService
const eventsubContext = {
    timerRegistry,
    getTwitchConfig: () => twitchConfig,
    setSessionId: (val) => { sessionId = val; },
    eventQueue,
    // Fonctions de souscription EventSub
    subscribeToChannelFollow,
    subscribeToChannelSubscription,
    subscribeToChannelSubscriptionGift,
    subscribeToChannelSubscriptionEnd,
    // Fonctions de callback
    handleEventSubNotification,
    startFollowPolling,
};

// Contexte pour twitchConfigService
const twitchConfigContext = {
    ROOT_DIR,
    configCrypto,
    getTwitchConfig: () => twitchConfig,
};

// Initialiser les services avec le contexte
goalsService.initContext(serviceContext);
batchingService.initContext(serviceContext);
pollingService.initContext(pollingContext);
eventHandlersService.initContext(eventHandlersContext);
eventsubService.initContext(eventsubContext);
twitchConfigService.initContext(twitchConfigContext);

// Ajouter les services au contexte (disponibles pour les routes)
appContext.services = {
    goals: goalsService,
    batching: batchingService,
    broadcast: broadcastServiceInstance,
    twitch: twitchService,
    counters: countersService,
    files: filesService,
    polling: pollingService,
    eventHandlers: eventHandlersService,
    eventsub: eventsubService,
    twitchConfig: twitchConfigService,
};

logEvent('INFO', '✅ Services modulaires initialisés (goals, batching, broadcast, twitch, counters, files, polling, eventHandlers, eventsub, twitchConfig)');

// Initialiser les contextes des routes
initAllContexts(appContext);
logEvent('INFO', '✅ Contexte d\'application initialisé pour les routes modulaires');

// ==================================================================
// 📌 MONTAGE DES ROUTES MODULAIRES
// ==================================================================
// Note: Les routes sont montées mais les définitions existantes restent
// pour assurer la compatibilité. Une fois validé, les anciennes routes
// pourront être supprimées.

// Routes des pages HTML
app.use('/', pagesRouter);

// Routes API publiques
app.use('/api', apiRouter);

// Routes d'administration
app.use('/admin', adminRouter);

// Routes Twitch (montées sur /api car elles utilisent /api/*)
app.use('/api', twitchRouter);

logEvent('INFO', '✅ Routes modulaires montées (pages, api, admin, twitch)');

// ==================================================================
// Middleware de gestion d'erreurs centralisé (doit être après toutes les routes)
// ==================================================================
app.use(handleError);

// ==================================================================
// Démarrage du serveur
app.listen(PORT, () => {
    console.log('🚀 SubCount Auto Server - Device Code Grant Flow v2.0');
    console.log(`📡 API: http://localhost:${PORT}`);
    console.log(`📌 WebSocket: ws://localhost:8083`);
    console.log(`⏰ Démarré le: ${new Date().toLocaleString('fr-FR')}`);
    
    // Charger les configurations
    loadTwitchConfig();
    loadGoals();
    
    // Charger le compteur sauvegardé au démarrage (avant l'API Twitch)
    const savedFollowCount = loadFollowCountFromFile();
    if (savedFollowCount > 0) {
        currentFollows = savedFollowCount;
        console.log(`📂 Compteur follows initial restauré: ${savedFollowCount} follows`);
    }
    
    const savedSubCount = loadSubCountFromFile();
    if (savedSubCount > 0) {
        currentSubs = savedSubCount;
        console.log(`📂 Compteur subs initial restauré: ${savedSubCount} subs`);
    }
    
    // Initialiser la surveillance du fichier de configuration
    setupConfigWatcher();
    
    // Initialiser les fichiers avec le compteur actuel
    updateFollowFiles(currentFollows);
    
    // Note: EventQueue est initialisé lors de sa déclaration (remplace l'ancien eventBuffer)
    logEvent('INFO', '📄 EventQueue initialisée');
    
    console.log('✅ Serveur prêt !');
    
    if (twitchConfig.configured) {
        console.log(`🎮 Connecté à Twitch: @${twitchConfig.username}`);
        
        // Démarrer EventSub automatiquement avec un délai
        console.log('🚀 Démarrage EventSub WebSocket dans 3 secondes...');
        timerRegistry.setTimeout('autoStartEventSub', async () => {
            try {
                // Vérifier que nous avons bien tous les tokens avant de synchroniser
                if (twitchConfig.access_token && twitchConfig.user_id) {
                    console.log('📄 Synchronisation avec tokens existants...');
                    await syncTwitchFollows('Synchronisation au démarrage');
                    await syncTwitchSubs('Synchronisation au démarrage');
                    console.log('✅ Synchronisation initiale complète (follows + subs) réussie');
                } else {
                    console.log('⚠️ Tokens manquants, synchronisation ignorée au démarrage');
                }
            } catch (error) {
                console.warn('⚠️ Synchronisation initiale échouée, utilisation des données sauvegardées');
            }
            
            // Démarrer EventSub seulement si on a les tokens
            if (twitchConfig.access_token && twitchConfig.user_id) {
                connectTwitchEventSub();
            } else {
                console.log('⚠️ Configuration Twitch requise pour EventSub');
            }
        }, 3000);
    } else {
        console.log('⚙️ Configuration Twitch: http://localhost:8082/config');
        console.log('🔐 Device Code Grant Flow : Plus sécurisé, application publique');
    }
    
    // Log de diagnostic
    console.log(`🔧 État initial: ${currentFollows} follows (${followGoals.size} objectifs), ${currentSubs} subs (${subGoals.size} objectifs)`);
    isInitializing = false;
});

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    
    // Nettoyer tous les timers via timerRegistry
    timerRegistry.clearAll();
    console.log('⏱️ Tous les timers ont été nettoyés');
    
    if (twitchEventSubWs) {
        twitchEventSubWs.close();
    }
    if (configWatcher) {
        configWatcher.close();
        console.log('👁️ Surveillance fichier follows arrêtée');
    }
    if (subConfigWatcher) {
        subConfigWatcher.close();
        console.log('👁️ Surveillance fichier subs arrêtée');
    }
    
    // 📄 Vérifier les événements en attente dans la queue
    const pendingEvents = eventQueue.size();
    if (pendingEvents > 0) {
        console.log(`⚠️ ${pendingEvents} événements en attente perdus lors de l'arrêt`);
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Arrêt du serveur...');
    
    // Nettoyer tous les timers via timerRegistry
    timerRegistry.clearAll();
    console.log('⏱️ Tous les timers ont été nettoyés');
    
    if (twitchEventSubWs) {
        twitchEventSubWs.close();
    }
    if (configWatcher) {
        configWatcher.close();
        console.log('👁️ Surveillance fichier follows arrêtée');
    }
    if (subConfigWatcher) {
        subConfigWatcher.close();
        console.log('👁️ Surveillance fichier subs arrêtée');
    }
    
    // 📄 Vérifier les événements en attente dans la queue
    const pendingEvents = eventQueue.size();
    if (pendingEvents > 0) {
        console.log(`⚠️ ${pendingEvents} événements en attente perdus lors de l'arrêt`);
    }
    process.exit(0);
});

// 🛡️ Gestion des erreurs non gérées (protection contre les crashes)
process.on('uncaughtException', (error) => {
    console.error('❌ ERREUR NON GÉRÉE - Le serveur continue:', error.message);
    console.error('📄 Stack trace:', error.stack);
    
    // Logger l'erreur
    logEvent('CRITICAL', '❌ Erreur non gérée:', {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
    });
    
    // Ne pas arrêter le serveur, juste loguer l'erreur
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ PROMESSE REJETÉE NON GÉRÉE - Le serveur continue:', reason);
    
    // Logger l'erreur
    logEvent('CRITICAL', '❌ Promesse rejetée non gérée:', {
        reason: reason?.message || reason,
        promise: promise.toString(),
        timestamp: Date.now()
    });
    
    // Ne pas arrêter le serveur, juste loguer l'erreur
});