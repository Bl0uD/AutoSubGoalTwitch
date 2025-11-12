const WebSocket = require('ws');
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');
const configCrypto = require('./config-crypto'); // Module de chiffrement sÃ©curisÃ©
const crypto = require('crypto'); // Module natif pour gÃ©nÃ©ration sÃ©curisÃ©e

// Dossier racine du projet (parent du dossier server)
const ROOT_DIR = path.join(__dirname, '..');

// Fonction de logging centralisÃ©e
function logEvent(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    // Console
    console.log(logMessage);
    if (data) {
        console.log('ðŸ“„ DonnÃ©es:', data);
    }
    
    // Fichier de log
    try {
        const logPath = path.join(ROOT_DIR, 'logs', 'subcount_logs.txt');
        
        // Nettoyer le log si nÃ©cessaire avant d'Ã©crire
        cleanupLogFile(logPath);
        
        const logEntry = data ? 
            `${logMessage}\nDonnÃ©es: ${JSON.stringify(data, null, 2)}\n---\n` : 
            `${logMessage}\n`;
        
        fs.appendFileSync(logPath, logEntry, 'utf8');
    } catch (error) {
        console.error('âŒ Erreur Ã©criture log:', error.message);
    }
}

// Fonction de nettoyage automatique des logs
function cleanupLogFile(logFilePath, maxSizeMB = 2, keepLines = 500) {
    try {
        if (fs.existsSync(logFilePath)) {
            const stats = fs.statSync(logFilePath);
            const fileSizeMB = stats.size / (1024 * 1024);
            
            // VÃ©rifier seulement toutes les 50 Ã©critures pour Ã©viter trop de vÃ©rifications
            if (!cleanupLogFile.counter) cleanupLogFile.counter = 0;
            cleanupLogFile.counter++;
            
            if (cleanupLogFile.counter % 50 === 0 && fileSizeMB > maxSizeMB) {
                console.log(`ðŸ§¹ Nettoyage du log (${fileSizeMB.toFixed(2)}MB > ${maxSizeMB}MB)`);
                
                // Lire toutes les lignes
                const content = fs.readFileSync(logFilePath, 'utf8');
                const lines = content.split('\n');
                
                if (lines.length > keepLines) {
                    // Garder seulement les derniÃ¨res lignes
                    const linesToKeep = lines.slice(-keepLines);
                    
                    // Header informatif
                    const header = [
                        `# Log nettoyÃ© automatiquement - ${new Date().toISOString()}`,
                        `# ConservÃ© les ${keepLines} derniÃ¨res lignes sur ${lines.length} total`,
                        '',
                        ''
                    ];
                    
                    // RÃ©Ã©crire le fichier
                    fs.writeFileSync(logFilePath, header.concat(linesToKeep).join('\n'), 'utf8');
                    console.log(`âœ… Log nettoyÃ©: ${lines.length} â†’ ${linesToKeep.length} lignes`);
                }
            }
        }
    } catch (error) {
        console.error('âŒ Erreur nettoyage log:', error.message);
    }
}

const app = express();
const PORT = 8082;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ” SÃ‰CURITÃ‰ : LOCALHOST-ONLY (Simple et efficace)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Protection par CORS : seul localhost peut accÃ©der au serveur
// Communication Twitch sÃ©curisÃ©e : tokens chiffrÃ©s AES-256-GCM machine-bound
console.log('\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
console.log('â•‘                    ï¿½ï¸  SERVEUR LOCALHOST SÃ‰CURISÃ‰                             â•‘');
console.log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log('\nâœ… PROTECTION ACTIVE :');
console.log('   â€¢ CORS restreint Ã  localhost uniquement');
console.log('   â€¢ Tokens Twitch chiffrÃ©s AES-256-GCM (machine-bound)');
console.log('   â€¢ Aucun accÃ¨s possible depuis l\'extÃ©rieur');
console.log('\nðŸ’¡ ACCÃˆS :');
console.log('   â€¢ Panel admin : http://localhost:8082/admin');
console.log('   â€¢ API publique : http://localhost:8082/api/stats');
console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ›¡ï¸ VALIDATION DES ENTRÃ‰ES UTILISATEUR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Valide un entier positif avec limites
 * @param {*} value - Valeur Ã  valider
 * @param {string} fieldName - Nom du champ (pour erreurs)
 * @param {number} min - Valeur minimum (dÃ©faut: 0)
 * @param {number} max - Valeur maximum (dÃ©faut: 1000000)
 * @returns {number} Nombre validÃ©
 * @throws {Error} Si validation Ã©choue
 */
function validatePositiveInt(value, fieldName = 'valeur', min = 0, max = 1000000) {
    // VÃ©rifier que la valeur existe
    if (value === null || value === undefined) {
        throw new Error(`${fieldName} est requis`);
    }
    
    // Convertir en nombre
    const num = Number(value);
    
    // VÃ©rifier que c'est un nombre valide
    if (isNaN(num)) {
        throw new Error(`${fieldName} doit Ãªtre un nombre (reÃ§u: ${typeof value})`);
    }
    
    // VÃ©rifier que c'est un entier
    if (!Number.isInteger(num)) {
        throw new Error(`${fieldName} doit Ãªtre un entier (reÃ§u: ${num})`);
    }
    
    // VÃ©rifier les limites
    if (num < min) {
        throw new Error(`${fieldName} doit Ãªtre >= ${min} (reÃ§u: ${num})`);
    }
    
    if (num > max) {
        throw new Error(`${fieldName} doit Ãªtre <= ${max} (reÃ§u: ${num})`);
    }
    
    return num;
}

/**
 * Valide une chaÃ®ne de caractÃ¨res
 * @param {*} value - Valeur Ã  valider
 * @param {string} fieldName - Nom du champ
 * @param {number} maxLength - Longueur maximum (dÃ©faut: 1000)
 * @returns {string} ChaÃ®ne validÃ©e
 * @throws {Error} Si validation Ã©choue
 */
function validateString(value, fieldName = 'valeur', maxLength = 1000) {
    if (value === null || value === undefined) {
        throw new Error(`${fieldName} est requis`);
    }
    
    const str = String(value);
    
    if (str.length === 0) {
        throw new Error(`${fieldName} ne peut pas Ãªtre vide`);
    }
    
    if (str.length > maxLength) {
        throw new Error(`${fieldName} trop long (max: ${maxLength} caractÃ¨res)`);
    }
    
    // Bloquer caractÃ¨res dangereux
    if (/[<>"]/.test(str)) {
        throw new Error(`${fieldName} contient des caractÃ¨res non autorisÃ©s`);
    }
    
    return str;
}

// Configuration CORS - RESTREINT Ã€ LOCALHOST UNIQUEMENT
app.use(cors({
    origin: ['http://localhost:8082', 'http://127.0.0.1:8082'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-password'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(__dirname));

// Variables globales
let currentFollows = 0; // Compteur follows
let currentSubs = 0;    // Compteur subs
let followGoals = new Map(); // Goals pour les follows
let subGoals = new Map();    // Goals pour les subs
let twitchEventSubWs = null;
let sessionId = null;
let configWatcher = null;
let subConfigWatcher = null;
let followPollingInterval = null;
let lastKnownFollowCount = 0;
let isPollingActive = false;
let deviceCodePolling = null; // Pour le polling du Device Code Grant Flow
let isInitializing = true;
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;
let reconnectDelay = 5000;
let subscriptionTimeout = null; // Timer pour les 10 secondes de l'EventSub
let keepaliveTimeout = null; // Timer pour le keepalive

// ðŸ”„ SYSTÃˆME DE TAMPON POUR LES Ã‰VÃ‰NEMENTS
let eventBuffer = []; // Tampon pour stocker les Ã©vÃ©nements
let isProcessingEvents = false; // Flag pour Ã©viter le traitement concurrent
let lastEventProcessTime = 0; // Timestamp du dernier Ã©vÃ©nement traitÃ©
let eventProcessingInterval = null; // Interval pour traiter les Ã©vÃ©nements
const EVENT_PROCESSING_DELAY = 500; // DÃ©lai minimum entre traitements (ms)

// âš¡ SYSTÃˆME DE BATCHING INTELLIGENT (Anti-spam)
// File d'attente synchronisÃ©e avec les animations (1 seconde)
let followBatch = { count: 0, timer: null, isAnimating: false };
let subBatch = { count: 0, timer: null, isAnimating: false, tiers: {} };
const ANIMATION_DURATION = 1000; // DurÃ©e d'une animation overlay : 1 seconde
const BATCH_DELAY = 100; // Petit dÃ©lai pour capturer les events groupÃ©s
const MAX_EVENTS_PER_BATCH = 10; // Nombre max d'Ã©vÃ©nements traitÃ©s par lot

// Configuration Twitch pour Device Code Grant Flow (application publique)
let twitchConfig = {
    client_id: '8o91k8bmpi79inwkjj7sgggvpkavr5', // Application publique - pas besoin de client_secret
    access_token: '',
    refresh_token: '',
    user_id: '',
    username: '',
    configured: false
};

// Variables pour Device Code Grant Flow
let deviceCodeData = {
    device_code: '',
    user_code: '',
    verification_uri: '',
    expires_in: 0,
    interval: 5,
    expires_at: 0
};

// Fonction pour rÃ©initialiser le Device Code Grant Flow
function resetDeviceCodeFlow() {
    try {
        if (deviceCodePolling) {
            clearInterval(deviceCodePolling);
            deviceCodePolling = null;
        }
        deviceCodeData = {
            device_code: '',
            user_code: '',
            verification_uri: '',
            expires_in: 0,
            interval: 5,
            expires_at: 0
        };
        twitchConfig.access_token = '';
        twitchConfig.refresh_token = '';
        twitchConfig.user_id = '';
        twitchConfig.username = '';
        twitchConfig.configured = false;
        logEvent('INFO', 'ðŸ”„ Device Code Grant Flow rÃ©initialisÃ©');
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur reset Device Code Flow:', error.message);
    }
}

// ðŸ”¥ DEVICE CODE GRANT FLOW - Ã‰tape 1: Initier l'authentification
async function initiateDeviceCodeFlow() {
    try {
        console.log('ðŸš€ DÃ©marrage Device Code Grant Flow...');
        
        // CrÃ©er un contrÃ´leur d'annulation pour timeout plus long
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
                scopes: 'moderator:read:followers channel:read:subscriptions channel:manage:moderators moderation:read' // Scopes complets pour follows, subs et modÃ©ration
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            logEvent('ERROR', `âŒ Erreur HTTP Device Code: ${response.status}`, { errorText });
            throw new Error(`Erreur Device Code: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        // Validation des donnÃ©es reÃ§ues selon la documentation
        if (!data.device_code || !data.user_code || !data.verification_uri) {
            logEvent('ERROR', 'âŒ RÃ©ponse incomplÃ¨te du serveur Twitch', data);
            throw new Error('RÃ©ponse incomplÃ¨te du serveur Twitch');
        }
        
        // Stocker les donnÃ©es du Device Code
        deviceCodeData = {
            device_code: data.device_code,
            user_code: data.user_code,
            verification_uri: data.verification_uri,
            expires_in: data.expires_in || 1800, // 30 minutes par dÃ©faut
            interval: data.interval || 5, // 5 secondes par dÃ©faut
            expires_at: Date.now() + ((data.expires_in || 1800) * 1000)
        };
        
        logEvent('INFO', `âœ… Device Code gÃ©nÃ©rÃ©: ${deviceCodeData.user_code}`);
        logEvent('INFO', `ðŸ”— URL de vÃ©rification: ${deviceCodeData.verification_uri}`);
        logEvent('INFO', `â° Expire dans: ${deviceCodeData.expires_in} secondes`);
        
        // DÃ©marrer le polling
        startDeviceCodePolling();
        
        return deviceCodeData;
        
    } catch (error) {
        // Gestion spÃ©cifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('ERROR', 'âŒ Timeout Device Code Flow (15s)');
            throw new Error('Timeout de connexion au serveur Twitch - VÃ©rifiez votre connexion internet');
        }
        
        logEvent('ERROR', 'âŒ Erreur Device Code Flow:', error.message);
        throw error;
    }
}

// ðŸ”¥ DEVICE CODE GRANT FLOW - Ã‰tape 2: Polling pour les tokens
async function startDeviceCodePolling() {
    if (deviceCodePolling) {
        clearInterval(deviceCodePolling);
    }
    
    logEvent('INFO', `ðŸ”„ DÃ©marrage polling toutes les ${deviceCodeData.interval} secondes...`);
    
    deviceCodePolling = setInterval(async () => {
        try {
            // VÃ©rifier si le code n'a pas expirÃ©
            if (Date.now() > deviceCodeData.expires_at) {
                logEvent('WARN', 'â° Device Code expirÃ©');
                clearInterval(deviceCodePolling);
                deviceCodePolling = null;
                return;
            }
            
            // CrÃ©er un contrÃ´leur d'annulation pour timeout plus long
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 secondes timeout
            
            // RequÃªte conforme Ã  la documentation
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
                // SuccÃ¨s ! Tokens obtenus
                logEvent('INFO', 'ðŸŽ‰ Authentification Device Code Grant rÃ©ussie !');
                
                // Validation des tokens reÃ§us
                if (!tokenData.access_token) {
                    throw new Error('Access token manquant dans la rÃ©ponse');
                }
                
                twitchConfig.access_token = tokenData.access_token;
                twitchConfig.refresh_token = tokenData.refresh_token;
                
                // Log des scopes reÃ§us
                if (tokenData.scope && Array.isArray(tokenData.scope)) {
                    logEvent('INFO', `ðŸ” Scopes accordÃ©s: ${tokenData.scope.join(', ')}`);
                }
                
                // ArrÃªter le polling
                clearInterval(deviceCodePolling);
                deviceCodePolling = null;
                
                // Obtenir les infos utilisateur
                await getUserInfo();
                
                // Sauvegarder la configuration
                saveTwitchConfig();
                
                // DÃ©marrer EventSub avec dÃ©lai
                setTimeout(() => {
                    connectTwitchEventSub();
                }, 2000);
                
            } else {
                // GÃ©rer les diffÃ©rents types d'erreurs selon la documentation
                switch (tokenData.error) {
                    case 'authorization_pending':
                        logEvent('INFO', 'â³ En attente de l\'autorisation utilisateur...');
                        break;
                    case 'slow_down':
                        logEvent('WARN', 'ðŸŒ Ralentissement du polling demandÃ© par Twitch');
                        deviceCodeData.interval += 5; // Augmenter l'intervalle
                        clearInterval(deviceCodePolling);
                        setTimeout(startDeviceCodePolling, deviceCodeData.interval * 1000);
                        break;
                    case 'access_denied':
                        logEvent('WARN', 'âŒ AccÃ¨s refusÃ© par l\'utilisateur');
                        clearInterval(deviceCodePolling);
                        deviceCodePolling = null;
                        break;
                    case 'expired_token':
                        logEvent('WARN', 'â° Device Code expirÃ©');
                        clearInterval(deviceCodePolling);
                        deviceCodePolling = null;
                        break;
                    default:
                        logEvent('WARN', `âš ï¸ Erreur polling inconnue: ${tokenData.error} - ${tokenData.error_description || ''}`);
                }
            }
            
        } catch (error) {
        // Gestion spÃ©cifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('WARN', 'â° Timeout polling tokens (20s) - polling continue...');
            return; // Continuer le polling sans interrompre
        }            // Gestion d'erreurs rÃ©seau - ne pas arrÃªter le polling
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                logEvent('WARN', 'ðŸŒ Erreur rÃ©seau temporaire - polling continue...');
                return; // Continuer le polling
            }
            
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                logEvent('WARN', `ðŸŒ Erreur connexion (${error.code}) - polling continue...`);
                return; // Continuer le polling
            }
            
            logEvent('ERROR', 'âŒ Erreur polling tokens:', error.message);
            
            // Pour toute autre erreur, continuer quand mÃªme le polling
            // mais avec un intervalle plus long pour Ã©viter le spam
            if (deviceCodeData.interval < 10) {
                deviceCodeData.interval = Math.min(deviceCodeData.interval + 2, 10);
                logEvent('INFO', `ðŸ”„ Augmentation intervalle polling Ã  ${deviceCodeData.interval}s`);
            }
        }
    }, deviceCodeData.interval * 1000);
}

// Obtenir les informations utilisateur
async function getUserInfo() {
    try {
        console.log('ðŸ”„ RÃ©cupÃ©ration des informations utilisateur...');
        
        // CrÃ©er un contrÃ´leur d'annulation pour timeout
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
            throw new Error('Erreur rÃ©cupÃ©ration utilisateur');
        }
        
        const userData = await response.json();
        const user = userData.data[0];
        
        twitchConfig.user_id = user.id;
        twitchConfig.username = user.login;
        twitchConfig.configured = true;
        
        console.log(`ðŸ‘¤ ConnectÃ© en tant que: @${twitchConfig.username}`);
        
        // Sauvegarder immÃ©diatement aprÃ¨s rÃ©cupÃ©ration des infos utilisateur
        saveTwitchConfig();
        
        // VÃ©rifier et accorder les privilÃ¨ges de modÃ©rateur si nÃ©cessaire
        const hasModeratorPrivileges = await ensureModeratorPrivileges();
        
        if (!hasModeratorPrivileges) {
            logEvent('INFO', 'ðŸ”„ PrivilÃ¨ges de modÃ©rateur non disponibles - dÃ©marrage du polling en mode fallback');
            // DÃ©marrer le polling immÃ©diatement si pas de privilÃ¨ges EventSub
            startFollowPolling(10); // VÃ©rifier toutes les 10 secondes
        }
        
        // RÃ©cupÃ©rer le nombre de follows actuel au dÃ©marrage
        try {
            console.log('ðŸ“Š RÃ©cupÃ©ration du nombre de follows initial...');
            const followCount = await getTwitchFollowCount();
            const oldCount = currentFollows;
            currentFollows = followCount;
            updateFiles(currentFollows);
            broadcastUpdate();
            
            console.log(`ðŸ“Š Follows rÃ©cupÃ©rÃ©s au dÃ©marrage: ${oldCount} â†’ ${followCount}`);
            
            // Sauvegarder l'Ã©tat initial sur disque pour la persistence
            saveFollowCountToFile(currentFollows);
            
        } catch (error) {
            console.warn('âš ï¸ Impossible de rÃ©cupÃ©rer les follows au dÃ©marrage:', error.message);
            // Charger depuis le fichier sauvegardÃ© si l'API Ã©choue
            const savedCount = loadFollowCountFromFile();
            if (savedCount > 0) {
                currentFollows = savedCount;
                updateFiles(currentFollows);
                broadcastUpdate();
                console.log(`ðŸ“‚ Nombre de follows restaurÃ© depuis le fichier: ${savedCount}`);
            }
        }
        
    } catch (error) {
        // Gestion spÃ©cifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('ERROR', 'âŒ Timeout rÃ©cupÃ©ration infos utilisateur (10s)');
            throw new Error('Timeout de connexion Ã  l\'API Twitch');
        }
        
        console.error('âŒ Erreur infos utilisateur:', error.message);
        throw error;
    }
}

// VÃ©rifier et accorder les privilÃ¨ges de modÃ©rateur si nÃ©cessaire
async function ensureModeratorPrivileges() {
    try {
        logEvent('INFO', 'ðŸ” VÃ©rification des privilÃ¨ges de modÃ©rateur...');
        
        // D'abord, vÃ©rifier si l'utilisateur est dÃ©jÃ  modÃ©rateur de son propre canal
        const isModerator = await checkIfModerator();
        
        if (isModerator) {
            logEvent('INFO', 'âœ… Utilisateur dÃ©jÃ  modÃ©rateur de son propre canal');
            return true;
        }
        
        // Si pas modÃ©rateur, essayer de s'auto-accorder les privilÃ¨ges
        logEvent('INFO', 'ðŸ”§ Tentative d\'auto-attribution des privilÃ¨ges de modÃ©rateur...');
        const granted = await grantSelfModerator();
        
        if (granted) {
            logEvent('INFO', 'âœ… PrivilÃ¨ges de modÃ©rateur accordÃ©s avec succÃ¨s');
            return true;
        } else {
            logEvent('WARN', 'âš ï¸ Impossible d\'accorder les privilÃ¨ges de modÃ©rateur automatiquement');
            logEvent('INFO', 'ðŸ“Œ Vous devrez peut-Ãªtre accorder manuellement les privilÃ¨ges de modÃ©rateur dans votre tableau de bord Twitch');
            return false;
        }
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur vÃ©rification privilÃ¨ges modÃ©rateur:', error.message);
        return false;
    }
}

// VÃ©rifier si l'utilisateur est modÃ©rateur de son propre canal
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
        logEvent('WARN', 'âš ï¸ Erreur vÃ©rification statut modÃ©rateur:', error.message);
        return false;
    }
}

// Tenter d'accorder les privilÃ¨ges de modÃ©rateur Ã  soi-mÃªme
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
            logEvent('WARN', `âš ï¸ Ã‰chec auto-attribution modÃ©rateur: ${response.status} - ${errorText}`);
            return false;
        }
        
    } catch (error) {
        logEvent('WARN', 'âš ï¸ Erreur auto-attribution modÃ©rateur:', error.message);
        return false;
    }
}

// VÃ©rifier si l'utilisateur peut s'auto-attribuer les privilÃ¨ges modÃ©rateur
async function canGrantSelfModerator() {
    try {
        // VÃ©rifier si nous avons le scope nÃ©cessaire
        if (!twitchConfig.scope || !twitchConfig.scope.includes('channel:manage:moderators')) {
            return false;
        }
        
        // Pour un broadcaster sur son propre canal, cette fonctionnalitÃ© devrait Ãªtre disponible
        return true;
        
    } catch (error) {
        logEvent('WARN', 'âš ï¸ Erreur vÃ©rification capacitÃ© auto-attribution modÃ©rateur:', error.message);
        return false;
    }
}

// Sauvegarder le nombre de follows sur disque pour la persistence
function saveFollowCountToFile(count) {
    try {
        const backupPath = path.join(ROOT_DIR, 'data', 'followcount_backup.txt');
        const timestamp = new Date().toISOString();
        const data = `${count}|${timestamp}`;
        fs.writeFileSync(backupPath, data, 'utf8');
        console.log(`ðŸ’¾ Sauvegarde compteur: ${count} follows Ã  ${timestamp.split('T')[1].split('.')[0]}`);
    } catch (error) {
        console.error('âŒ Erreur sauvegarde compteur follows:', error.message);
    }
}

// Charger le nombre de follows depuis le disque
function loadFollowCountFromFile() {
    try {
        const backupPath = path.join(ROOT_DIR, 'data', 'followcount_backup.txt');
        if (fs.existsSync(backupPath)) {
            const content = fs.readFileSync(backupPath, 'utf8').trim();
            const [count, timestamp] = content.split('|');
            const followCount = parseInt(count) || 0;
            console.log(`ðŸ“‚ Compteur restaurÃ©: ${followCount} follows (sauvegardÃ© le ${timestamp?.split('T')[0] || 'inconnu'})`);
            return followCount;
        }
    } catch (error) {
        console.error('âŒ Erreur chargement compteur follows sauvegardÃ©:', error.message);
    }
    return 0;
}

// Sauvegarder le nombre de subs sur disque pour la persistence
function saveSubCountToFile(count) {
    try {
        const backupPath = path.join(ROOT_DIR, 'data', 'subcount_backup.txt');
        const timestamp = new Date().toISOString();
        const data = `${count}|${timestamp}`;
        fs.writeFileSync(backupPath, data, 'utf8');
        console.log(`ðŸ’¾ Sauvegarde compteur: ${count} subs Ã  ${timestamp.split('T')[1].split('.')[0]}`);
    } catch (error) {
        console.error('âŒ Erreur sauvegarde compteur subs:', error.message);
    }
}

// Charger le nombre de subs depuis le disque
function loadSubCountFromFile() {
    try {
        const backupPath = path.join(ROOT_DIR, 'data', 'subcount_backup.txt');
        if (fs.existsSync(backupPath)) {
            const content = fs.readFileSync(backupPath, 'utf8').trim();
            const [count, timestamp] = content.split('|');
            const subCount = parseInt(count) || 0;
            console.log(`ðŸ“‚ Compteur restaurÃ©: ${subCount} subs (sauvegardÃ© le ${timestamp?.split('T')[0] || 'inconnu'})`);
            return subCount;
        }
    } catch (error) {
        console.error('âŒ Erreur chargement compteur subs sauvegardÃ©:', error.message);
    }
    return 0;
}

// Fonction pour renouveler automatiquement le token d'accÃ¨s
async function refreshTwitchToken() {
    try {
        console.log('ðŸ”„ Renouvellement du token Twitch...');
        
        // CrÃ©er un contrÃ´leur d'annulation pour timeout
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
        
        // Mettre Ã  jour la configuration
        twitchConfig.access_token = tokenData.access_token;
        if (tokenData.refresh_token) {
            twitchConfig.refresh_token = tokenData.refresh_token;
        }
        
        // Sauvegarder la nouvelle configuration
        saveTwitchConfig();
        
        console.log('âœ… Token Twitch renouvelÃ© avec succÃ¨s');
        return true;
        
    } catch (error) {
        // Gestion spÃ©cifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('ERROR', 'âŒ Timeout renouvellement token (10s)');
            return false;
        }
        
        console.error('âŒ Erreur renouvellement token:', error.message);
        return false;
    }
}

// Obtenir le nombre de follows depuis Twitch
async function getTwitchFollowCount() {
    if (!twitchConfig.access_token || !twitchConfig.user_id) {
        const error = `Configuration Twitch incomplÃ¨te - Token: ${!!twitchConfig.access_token}, UserID: ${!!twitchConfig.user_id}`;
        logEvent('ERROR', error);
        throw new Error(error);
    }
    
    try {
        const apiUrl = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${twitchConfig.user_id}`;
        logEvent('INFO', `ðŸ” Appel API Twitch Follows: ${apiUrl}`);
        logEvent('INFO', `ðŸ”‘ User ID: ${twitchConfig.user_id}`);
        
        // CrÃ©er un contrÃ´leur d'annulation pour timeout
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
        
        logEvent('INFO', `ðŸ“¡ RÃ©ponse API Twitch: Status ${response.status}`);
        
        if (!response.ok) {
            if (response.status === 401) {
                logEvent('WARN', 'ðŸ” Token expirÃ©, tentative de renouvellement...');
                // Token expirÃ©, essayer de le renouveler
                const refreshed = await refreshTwitchToken();
                if (refreshed) {
                    logEvent('INFO', 'âœ… Token renouvelÃ©, nouvelle tentative...');
                    // Retry with new token
                    return await getTwitchFollowCount();
                } else {
                    throw new Error('Ã‰chec du renouvellement du token');
                }
            }
            
            const errorText = await response.text();
            logEvent('ERROR', `âŒ Erreur API Twitch: ${response.status} - ${errorText}`);
            throw new Error(`Erreur API Twitch: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const followCount = data.total || 0;
        
        logEvent('SUCCESS', `ðŸ“Š âœ… API Twitch Follows: ${followCount} follows rÃ©cupÃ©rÃ©s`);
        
        // Log supplÃ©mentaire pour validation
        if (data.data && data.data.length > 0) {
            logEvent('INFO', `ðŸ‘¥ DÃ©tails: ${data.data.length} follows dans la rÃ©ponse`);
        }
        
        return followCount;
        
    } catch (error) {
        // Gestion spÃ©cifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('ERROR', 'âŒ Timeout API Twitch Follows (15s) - connexion lente');
            throw new Error('Timeout de connexion Ã  l\'API Twitch');
        }
        
        logEvent('ERROR', 'âŒ Erreur rÃ©cupÃ©ration follows Twitch:', error.message);
        throw error;
    }
}

// Obtenir le nombre de subs depuis Twitch
async function getTwitchSubCount() {
    if (!twitchConfig.access_token || !twitchConfig.user_id) {
        const error = `Configuration Twitch incomplÃ¨te - Token: ${!!twitchConfig.access_token}, UserID: ${!!twitchConfig.user_id}`;
        logEvent('ERROR', error);
        throw new Error(error);
    }
    
    try {
        const apiUrl = `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${twitchConfig.user_id}`;
        logEvent('INFO', `ðŸ” Appel API Twitch Subs: ${apiUrl}`);
        logEvent('INFO', `ðŸ”‘ User ID: ${twitchConfig.user_id}`);
        
        // CrÃ©er un contrÃ´leur d'annulation pour timeout
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
        
        logEvent('INFO', `ðŸ“¡ RÃ©ponse API Twitch Subs: Status ${response.status}`);
        
        if (!response.ok) {
            if (response.status === 401) {
                logEvent('WARN', 'ðŸ” Token expirÃ©, tentative de renouvellement...');
                // Token expirÃ©, essayer de le renouveler
                const refreshed = await refreshTwitchToken();
                if (refreshed) {
                    logEvent('INFO', 'âœ… Token renouvelÃ©, nouvelle tentative...');
                    // Retry with new token
                    return await getTwitchSubCount();
                } else {
                    throw new Error('Ã‰chec du renouvellement du token');
                }
            }
            
            const errorText = await response.text();
            logEvent('ERROR', `âŒ Erreur API Twitch Subs: ${response.status} - ${errorText}`);
            throw new Error(`Erreur API Twitch subs: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const subCount = data.total || 0;
        
        logEvent('SUCCESS', `ðŸ“Š âœ… API Twitch Subs: ${subCount} subs rÃ©cupÃ©rÃ©s`);
        
        // Log supplÃ©mentaire pour validation
        if (data.data && data.data.length > 0) {
            logEvent('INFO', `ðŸ‘¥ DÃ©tails: ${data.data.length} subs dans la rÃ©ponse`);
        }
        
        return subCount;
        
    } catch (error) {
        // Gestion spÃ©cifique des erreurs timeout
        if (error.name === 'AbortError') {
            logEvent('ERROR', 'âŒ Timeout API Twitch Subs (15s) - connexion lente');
            throw new Error('Timeout de connexion Ã  l\'API Twitch pour les subs');
        }
        
        logEvent('ERROR', 'âŒ Erreur rÃ©cupÃ©ration subs Twitch:', error.message);
        throw error;
    }
}

// ðŸ”„ SYSTÃˆME DE POLLING POUR LES FOLLOWS (Alternative Ã  EventSub)
function startFollowPolling(intervalSeconds = 10) {
    if (followPollingInterval) {
        clearInterval(followPollingInterval);
    }
    
    if (!twitchConfig.configured) {
        logEvent('WARN', 'âš ï¸ Configuration Twitch manquante - polling non dÃ©marrÃ©');
        return;
    }
    
    logEvent('INFO', `ðŸ”„ DÃ©marrage du polling intelligent des follows (toutes les ${intervalSeconds}s)`);
    logEvent('INFO', `ðŸ“¡ Mode: ${sessionId ? 'BACKUP EventSub' : 'PRINCIPAL (EventSub inactif)'}`);
    isPollingActive = true;
    
    // PremiÃ¨re vÃ©rification immÃ©diate
    pollFollowCount();
    
    // Puis vÃ©rifications pÃ©riodiques
    followPollingInterval = setInterval(async () => {
        await pollFollowCount();
    }, intervalSeconds * 1000);
}

async function pollFollowCount() {
    try {
        if (!isPollingActive) return;
        
        // Si EventSub est actif, faire un polling moins frÃ©quent (juste pour synchronisation)
        if (sessionId) {
            // Ne vÃ©rifier qu'une fois sur 3 (soit toutes les 30s si interval=10s)
            if (Math.random() > 0.33) {
                return;
            }
            logEvent('INFO', 'ðŸ”„ VÃ©rification de synchronisation (EventSub actif)');
        }
        
        const newFollowCount = await getTwitchFollowCount();
        
        // Si c'est la premiÃ¨re fois ou s'il y a un changement
        if (lastKnownFollowCount === 0) {
            lastKnownFollowCount = newFollowCount;
            updateFollowCount(newFollowCount);
            logEvent('INFO', `ðŸ“Š Count initial: ${newFollowCount} follows`);
        } else if (newFollowCount !== lastKnownFollowCount) {
            const difference = newFollowCount - lastKnownFollowCount;
            const source = sessionId ? '(synchronisation API)' : '(polling)';
            logEvent('INFO', `ðŸŽ‰ Follow count mis Ã  jour ${source}: ${lastKnownFollowCount} â†’ ${newFollowCount} (${difference > 0 ? '+' : ''}${difference})`);
            
            lastKnownFollowCount = newFollowCount;
            updateFollowCount(newFollowCount);
            
            // Sauvegarder le nouveau count
            saveFollowBackup();
        }
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur lors du polling des follows:', error.message);
    }
}

function stopFollowPolling() {
    if (followPollingInterval) {
        clearInterval(followPollingInterval);
        followPollingInterval = null;
        isPollingActive = false;
        logEvent('INFO', 'â¹ï¸ Polling des follows arrÃªtÃ©');
    }
}

// ðŸ”„ SYSTÃˆME DE TAMPON POUR LES Ã‰VÃ‰NEMENTS

// Ajouter un Ã©vÃ©nement au tampon
function addEventToBuffer(eventType, data) {
    const event = {
        id: Date.now() + Math.random(), // ID unique
        type: eventType,
        data: data,
        timestamp: Date.now()
    };
    
    eventBuffer.push(event);
    logEvent('INFO', `ðŸ“¥ Ã‰vÃ©nement ajoutÃ© au tampon: ${eventType} (${eventBuffer.length} en attente)`);
    
    // DÃ©marrer le traitement si pas dÃ©jÃ  en cours
    if (!isProcessingEvents) {
        startEventProcessing();
    }
}

// DÃ©marrer le traitement des Ã©vÃ©nements
function startEventProcessing() {
    if (isProcessingEvents) {
        return; // DÃ©jÃ  en cours
    }
    
    isProcessingEvents = true;
    logEvent('INFO', 'ðŸ”„ DÃ©marrage traitement des Ã©vÃ©nements');
    
    // Traiter immÃ©diatement puis dÃ©marrer l'interval
    processEventBatch();
    
    eventProcessingInterval = setInterval(() => {
        if (eventBuffer.length > 0) {
            processEventBatch();
        } else {
            // ArrÃªter le traitement si plus d'Ã©vÃ©nements
            stopEventProcessing();
        }
    }, EVENT_PROCESSING_DELAY);
}

// ArrÃªter le traitement des Ã©vÃ©nements
function stopEventProcessing() {
    if (eventProcessingInterval) {
        clearInterval(eventProcessingInterval);
        eventProcessingInterval = null;
    }
    isProcessingEvents = false;
    logEvent('INFO', 'â¹ï¸ ArrÃªt traitement des Ã©vÃ©nements');
}

// Traiter un lot d'Ã©vÃ©nements
function processEventBatch() {
    if (eventBuffer.length === 0) {
        return;
    }
    
    // Prendre les Ã©vÃ©nements les plus anciens
    const eventsToProcess = eventBuffer.splice(0, MAX_EVENTS_PER_BATCH);
    
    logEvent('INFO', `âš¡ Traitement de ${eventsToProcess.length} Ã©vÃ©nement(s)`);
    
    try {
        // Traiter chaque Ã©vÃ©nement sÃ©quentiellement pour Ã©viter les conflits
        eventsToProcess.forEach((event, index) => {
            try {
                logEvent('INFO', `ðŸ“‹ Traitement Ã©vÃ©nement ${index + 1}/${eventsToProcess.length}: ${event.type}`);
                processEvent(event);
            } catch (eventError) {
                logEvent('ERROR', `âŒ Erreur traitement Ã©vÃ©nement individuel ${event.type}:`, eventError.message);
                // Continuer avec les autres Ã©vÃ©nements mÃªme si l'un Ã©choue
            }
        });
        
        lastEventProcessTime = Date.now();
        logEvent('INFO', `âœ… Lot d'Ã©vÃ©nements traitÃ© avec succÃ¨s`);
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur traitement lot d\'Ã©vÃ©nements:', error.message);
        
        // En cas d'erreur critique, remettre les Ã©vÃ©nements dans le tampon pour retry
        logEvent('WARN', 'ðŸ”„ Remise des Ã©vÃ©nements dans le tampon pour retry...');
        eventBuffer.unshift(...eventsToProcess);
    }
}

// Traiter un Ã©vÃ©nement individuel
function processEvent(event) {
    try {
        switch (event.type) {
            case 'follow':
                handleFollowEvent(event.data);
                break;
            case 'sub':
                handleSubEvent(event.data);
                break;
            case 'sync':
                handleSyncEvent(event.data);
                break;
            default:
                logEvent('WARN', `âš ï¸ Type d'Ã©vÃ©nement inconnu: ${event.type}`);
        }
    } catch (error) {
        logEvent('ERROR', `âŒ Erreur traitement Ã©vÃ©nement ${event.type}:`, error.message);
    }
}

// GÃ©rer un Ã©vÃ©nement de follow
function handleFollowEvent(data) {
    try {
        const followerName = data.user_name || 'Utilisateur inconnu';
        const followerId = data.user_id || 'ID inconnu';
        
        logEvent('FOLLOW', `ðŸ‘¥ Ã‰vÃ©nement follow reÃ§u: ${followerName} (${followerId})`);
        
        // Utiliser le systÃ¨me de batching au lieu d'incrementer directement
        addFollowToBatch(1);
        
        // Affichage console pour debug
        console.log(`ðŸŽ‰ FOLLOW AJOUTÃ‰ AU BATCH: ${followerName}`);
        console.log(`ðŸ“Š Batch actuel: ${followBatch.count} follow(s) en attente`);
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur gestion Ã©vÃ©nement follow:', error.message);
        logEvent('ERROR', 'ðŸ“„ Stack trace:', error.stack);
        
        // En cas d'erreur, forcer une synchronisation
        try {
            logEvent('INFO', 'ðŸ”„ Ajout synchronisation de rÃ©cupÃ©ration...');
            addEventToBuffer('sync', {
                reason: 'Synchronisation aprÃ¨s erreur follow',
                error: error.message,
                timestamp: Date.now()
            });
        } catch (bufferError) {
            logEvent('CRITICAL', 'âŒ Erreur critique ajout synchronisation:', bufferError.message);
        }
    }
}

// GÃ©rer un Ã©vÃ©nement de sub
function handleSubEvent(data) {
    try {
        const userName = data.user_name || 'Utilisateur inconnu';
        const userId = data.user_id || 'ID inconnu';
        const subType = data.type || 'unknown';
        const tier = data.tier || '1000';
        
        logEvent('SUB', `â­ Ã‰vÃ©nement sub reÃ§u: ${userName} (Type: ${subType})`);
        
        // Traitement selon le type d'Ã©vÃ©nement sub
        switch (subType) {
            case 'new_sub':
                addSubToBatch(1, tier);
                console.log(`ðŸŽ‰ NOUVEL ABONNEMENT AJOUTÃ‰ AU BATCH: ${userName} (Tier ${tier})`);
                break;
                
            case 'gift_sub':
                const giftCount = data.gifted_count || 1;
                addSubToBatch(giftCount, tier);
                console.log(`ðŸŽ SUBS OFFERTS AJOUTÃ‰S AU BATCH: ${userName} a offert ${giftCount} subs (Tier ${tier})`);
                break;
                
            case 'end_sub':
                // Pour les fins d'abonnement, retirer immÃ©diatement (pas de batching nÃ©gatif)
                currentSubs = Math.max(0, currentSubs - 1);
                updateSubFiles(currentSubs);
                broadcastSubUpdate(1);
                console.log(`â¹ï¸ FIN D'ABONNEMENT: ${userName}`);
                break;
                
            default:
                logEvent('WARN', `âš ï¸ Type de sub inconnu: ${subType}`);
                return;
        }
        
        console.log(`ðŸ“Š Batch actuel: ${subBatch.count} sub(s) en attente`);
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur gestion Ã©vÃ©nement sub:', error.message);
        logEvent('ERROR', 'ðŸ“„ Stack trace:', error.stack);
        
        // En cas d'erreur, pas de synchronisation pour les subs (pas d'API disponible)
        logEvent('WARN', 'âš ï¸ Pas de synchronisation auto pour les subs');
    }
}

// GÃ©rer un Ã©vÃ©nement de synchronisation
async function handleSyncEvent(data) {
    try {
        logEvent('INFO', `ðŸ”„ Ã‰vÃ©nement synchronisation: ${data.reason || 'Non spÃ©cifiÃ©'}`);
        
        // ExÃ©cuter une synchronisation complÃ¨te avec l'API Twitch
        await syncTwitchFollows(data.reason || 'Synchronisation depuis tampon');
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur gestion Ã©vÃ©nement sync:', error.message);
    }
}

// Version sÃ©curisÃ©e de updateFollowCount avec protection contre les erreurs
function updateFollowCountSafe(newCount) {
    try {
        if (typeof newCount !== 'number' || newCount < 0) {
            logEvent('WARN', `âš ï¸ Nombre de follows invalide: ${newCount}`);
            return;
        }
        
        updateFollowCount(newCount);
        saveFollowBackup();
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur mise Ã  jour compteur:', error.message);
    }
}

// Mettre Ã  jour le count de follows et les fichiers
function updateFollowCount(newCount) {
    const oldCount = currentFollows;
    currentFollows = newCount;
    
    // Mettre Ã  jour les fichiers
    updateFollowFiles(currentFollows);
    
    // Diffuser aux clients WebSocket
    broadcastFollowUpdate();
    
    logEvent('INFO', `ðŸ“Š Follow count mis Ã  jour: ${oldCount} â†’ ${newCount}`);
}

// Version sÃ©curisÃ©e de updateSubCount avec protection contre les erreurs
function updateSubCountSafe(newCount) {
    try {
        if (typeof newCount !== 'number' || newCount < 0) {
            logEvent('WARN', `âš ï¸ Nombre de subs invalide: ${newCount}`);
            return;
        }
        
        updateSubCount(newCount);
        saveSubCountToFile(newCount);
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur mise Ã  jour compteur subs:', error.message);
    }
}

// Mettre Ã  jour le count de subs et les fichiers
function updateSubCount(newCount) {
    const oldCount = currentSubs;
    currentSubs = newCount;
    
    // Mettre Ã  jour les fichiers
    updateSubFiles(currentSubs);
    
    // Diffuser aux clients WebSocket
    broadcastSubUpdate();
    
    logEvent('INFO', `ðŸ“Š Sub count mis Ã  jour: ${oldCount} â†’ ${newCount}`);
}

// Sauvegarder les follows en backup
function saveFollowBackup() {
    try {
        saveFollowCountToFile(currentFollows);
        logEvent('INFO', `ðŸ’¾ Backup sauvegardÃ©: ${currentFollows} follows`);
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur sauvegarde backup:', error.message);
    }
}

// Reset du timer keepalive selon la documentation Twitch
function resetKeepaliveTimer(timeoutSeconds = 10) {
    if (keepaliveTimeout) {
        clearTimeout(keepaliveTimeout);
    }
    
    // Selon la documentation: Si pas de message dans keepalive_timeout_seconds, reconnecter
    keepaliveTimeout = setTimeout(() => {
        logEvent('WARN', `â° Keepalive timeout (${timeoutSeconds}s) - reconnexion nÃ©cessaire`);
        
        if (twitchEventSubWs) {
            twitchEventSubWs.close();
        }
        
        // Reconnexion aprÃ¨s timeout
        setTimeout(connectTwitchEventSub, 2000);
    }, timeoutSeconds * 1000);
}

// Gestion de la reconnexion avec URL fournie (conforme documentation)
async function handleReconnect(reconnectUrl) {
    try {
        logEvent('INFO', 'ðŸ”„ DÃ©but processus de reconnexion avec URL fournie');
        
        // CrÃ©er nouvelle connexion AVANT de fermer l'ancienne (selon doc)
        const newWs = new WebSocket(reconnectUrl);
        
        newWs.on('open', () => {
            logEvent('INFO', 'âœ… Nouvelle connexion EventSub Ã©tablie');
        });
        
        newWs.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                // Attendre le welcome de la nouvelle connexion
                if (message.metadata?.message_type === 'session_welcome') {
                    logEvent('INFO', 'ðŸŽ‰ Welcome reÃ§u sur nouvelle connexion - fermeture ancienne connexion');
                    
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
            setTimeout(connectTwitchEventSub, 5000);
        });
        
    } catch (error) {
        logEvent('ERROR', 'Erreur gestion reconnexion:', error.message);
        // Fallback vers reconnexion normale
        setTimeout(connectTwitchEventSub, 5000);
    }
}

// Configurer les handlers WebSocket (pour Ã©viter duplication)
function setupWebSocketHandlers(ws) {
    ws.on('close', (code, reason) => {
        logEvent('INFO', `ðŸ”Œ WebSocket EventSub fermÃ©: ${code} - ${reason || 'Raison inconnue'}`);
        
        // Clear des timers
        if (keepaliveTimeout) clearTimeout(keepaliveTimeout);
        if (subscriptionTimeout) clearTimeout(subscriptionTimeout);
        
        // Reconnexion automatique avec backoff exponentiel (sauf si code 4000-4007)
        if (code >= 4000 && code <= 4007) {
            logEvent('ERROR', `âŒ Erreur WebSocket critique (${code}) - pas de reconnexion automatique`);
            return;
        }
        
        if (twitchConfig.configured && reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 60000);
            reconnectAttempts++;
            
            logEvent('INFO', `ðŸ”„ Reconnexion programmÃ©e dans ${delay/1000}s (tentative ${reconnectAttempts}/${maxReconnectAttempts})`);
            
            setTimeout(() => {
                connectTwitchEventSub();
            }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
            logEvent('ERROR', `âŒ Ã‰chec de reconnexion aprÃ¨s ${maxReconnectAttempts} tentatives`);
        }
    });
    
    ws.on('error', (error) => {
        logEvent('ERROR', 'Erreur WebSocket EventSub:', error.message);
    });
}

// ðŸ”¥ Connexion WebSocket EventSub Twitch
async function connectTwitchEventSub() {
    if (!twitchConfig.configured) {
        console.log('âš ï¸ Configuration Twitch requise pour EventSub');
        return;
    }

    console.log(`ðŸ”Œ Connexion WebSocket EventSub Twitch... (Tentative ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
    
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
            logEvent('INFO', 'âœ… WebSocket EventSub connectÃ© !');
            reconnectAttempts = 0; // Reset du compteur lors d'une connexion rÃ©ussie
        });
        
        twitchEventSubWs.on('message', async (data) => {
            try {
                const rawMessage = data.toString();
                console.log('ðŸ” Message WebSocket RAW reÃ§u:', rawMessage.substring(0, 500) + (rawMessage.length > 500 ? '...' : ''));
                
                const message = JSON.parse(rawMessage);
                console.log('ðŸ“¦ Message WebSocket parsÃ©:', JSON.stringify(message, null, 2));
                
                await handleEventSubMessage(message);
            } catch (parseError) {
                logEvent('ERROR', 'Erreur parsing message EventSub:', parseError.message);
                console.error('ðŸ“„ Message problÃ©matique:', data.toString().substring(0, 500));
                
                // Ne pas faire crasher le serveur, juste loguer l'erreur
                try {
                    // Ajouter une synchronisation de sÃ©curitÃ© en cas d'erreur de parsing
                    addEventToBuffer('sync', {
                        reason: 'Synchronisation aprÃ¨s erreur parsing EventSub',
                        error: parseError.message,
                        timestamp: Date.now()
                    });
                } catch (bufferError) {
                    console.error('âŒ Erreur ajout Ã©vÃ©nement de sÃ©curitÃ©:', bufferError.message);
                }
            }
        });
        
        // Utiliser les handlers centralisÃ©s
        setupWebSocketHandlers(twitchEventSubWs);
        
    } catch (error) {
        console.error('âŒ Erreur connexion EventSub:', error.message);
        
        // Retry aprÃ¨s un dÃ©lai
        if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 60000);
            reconnectAttempts++;
            
            setTimeout(() => {
                connectTwitchEventSub();
            }, delay);
        }
    }
}

// GÃ©rer les messages EventSub
async function handleEventSubMessage(message) {
    try {
        const messageType = message.metadata?.message_type;
        
        if (!messageType) {
            console.warn('âš ï¸ Message EventSub sans type:', message);
            return;
        }
        
        console.log(`ðŸ“¨ Message EventSub reÃ§u: ${messageType}`);
        
        switch (messageType) {
            case 'session_welcome':
                sessionId = message.payload?.session?.id;
                const keepaliveTimeout = message.payload?.session?.keepalive_timeout_seconds || 10;
                
                if (sessionId) {
                    logEvent('INFO', `ðŸŽ‰ Session EventSub Ã©tablie: ${sessionId}`);
                    logEvent('INFO', `â° Keepalive timeout: ${keepaliveTimeout}s`);
                    
                    // Reset du timer keepalive
                    resetKeepaliveTimer(keepaliveTimeout);
                    
                    // IMPORTANT: S'abonner aux Ã©vÃ©nements dans les 10 secondes
                    if (subscriptionTimeout) {
                        clearTimeout(subscriptionTimeout);
                    }
                    
                    subscriptionTimeout = setTimeout(async () => {
                        try {
                            await subscribeToChannelFollow();
                            await subscribeToChannelSubscription();
                            await subscribeToChannelSubscriptionGift();
                            await subscribeToChannelSubscriptionEnd();
                            logEvent('INFO', 'âœ… Abonnements EventSub (Follow, Sub, Gift, End) crÃ©Ã©s dans les temps');
                            
                            // DÃ©marrer le polling en mode backup (synchronisation)
                            // Il vÃ©rifiera l'API de temps en temps pour s'assurer qu'EventSub n'a pas manquÃ© d'Ã©vÃ©nements
                            startFollowPolling(10); // Toutes les 10s, mais vÃ©rifiera seulement ~33% du temps si EventSub actif
                            
                        } catch (error) {
                            logEvent('ERROR', 'âŒ Ã‰chec crÃ©ation abonnements EventSub:', error.message);
                            logEvent('INFO', 'ðŸ”„ Basculement sur le systÃ¨me de polling...');
                            
                            // Si EventSub Ã©choue, dÃ©marrer le polling en fallback (mode principal)
                            startFollowPolling(10); // VÃ©rifier toutes les 10 secondes
                        }
                    }, 1000); // S'abonner aprÃ¨s 1 seconde
                    
                } else {
                    console.error('âŒ Session ID manquant dans le message welcome');
                }
                break;
                
            case 'session_keepalive':
                logEvent('INFO', 'ðŸ’“ Keepalive reÃ§u');
                // Reset du timer keepalive selon la documentation
                resetKeepaliveTimer();
                break;
                
            case 'notification':
                // Reset du timer keepalive selon la documentation
                resetKeepaliveTimer();
                await handleEventSubNotification(message);
                break;
                
            case 'session_reconnect':
                logEvent('INFO', 'ðŸ”„ Reconnexion EventSub requise');
                const reconnectUrl = message.payload?.session?.reconnect_url;
                
                if (reconnectUrl) {
                    logEvent('INFO', `ðŸ”— URL de reconnexion fournie: ${reconnectUrl}`);
                    // Selon la documentation, utiliser l'URL fournie
                    await handleReconnect(reconnectUrl);
                } else {
                    logEvent('WARN', 'âš ï¸ Reconnexion demandÃ©e sans URL, utilisation URL standard');
                    setTimeout(connectTwitchEventSub, 1000);
                }
                break;
                
            case 'revocation':
                // Nouveau: Gestion des rÃ©vocations selon la documentation
                const subscriptionType = message.metadata?.subscription_type;
                const revocationReason = message.payload?.subscription?.status;
                
                logEvent('WARN', `âŒ Abonnement rÃ©voquÃ©: ${subscriptionType}, raison: ${revocationReason}`);
                
                // Actions selon le type de rÃ©vocation
                switch (revocationReason) {
                    case 'authorization_revoked':
                        logEvent('ERROR', 'ðŸ” Autorisation rÃ©voquÃ©e - rÃ©authentification nÃ©cessaire');
                        // Fermer la connexion et demander une nouvelle auth
                        if (twitchEventSubWs) {
                            twitchEventSubWs.close();
                        }
                        break;
                    case 'user_removed':
                        logEvent('ERROR', 'ðŸ‘¤ Utilisateur supprimÃ© - impossible de continuer');
                        break;
                    case 'version_removed':
                        logEvent('ERROR', 'ðŸ“¡ Version d\'Ã©vÃ©nement obsolÃ¨te - mise Ã  jour nÃ©cessaire');
                        break;
                    default:
                        logEvent('WARN', `â“ RÃ©vocation inconnue: ${revocationReason}`);
                }
                break;
                
            default:
                console.log('ðŸ“¨ Message EventSub non gÃ©rÃ©:', messageType);
                console.log('ðŸ” Contenu du message:', JSON.stringify(message, null, 2));
        }
        
    } catch (error) {
        console.error('âŒ Erreur handleEventSubMessage:', error.message);
        console.error('ðŸ“„ Message problÃ©matique:', JSON.stringify(message, null, 2));
    }
}

// GÃ©rer les notifications d'Ã©vÃ©nements
async function handleEventSubNotification(message) {
    try {
        const eventType = message.metadata?.subscription_type;
        const eventData = message.payload?.event;
        
        logEvent('NOTIFICATION', `ðŸ”” Notification reÃ§ue - Type: ${eventType}`, {
            metadata: message.metadata,
            payload: message.payload
        });
        
        if (!eventType || !eventData) {
            logEvent('WARN', 'âš ï¸ Notification EventSub incomplÃ¨te:', message);
            return;
        }
        
        logEvent('INFO', `ðŸ”” Ã‰vÃ©nement reÃ§u: ${eventType}`);
        
        switch (eventType) {
            case 'channel.follow':
                const followerName = eventData.user_name || 'Utilisateur inconnu';
                const followerId = eventData.user_id || 'ID inconnu';
                const followedAt = eventData.followed_at || new Date().toISOString();
                
                logEvent('Ã‰VÃ‰NEMENT', `ðŸ‘¤ Nouveau follow: ${followerName} (${followerId})`, {
                    user_name: followerName,
                    user_id: followerId,
                    followed_at: followedAt,
                    raw_data: eventData
                });
                
                console.log('ðŸŽ‰ NOUVEAU FOLLOW DÃ‰TECTÃ‰ !');
                console.log(`ðŸ‘¤ Utilisateur: ${followerName}`);
                console.log(`ðŸ†” ID: ${followerId}`);
                console.log(`â° Moment: ${followedAt}`);
                
                // Ajouter au tampon avec plus de dÃ©tails
                addEventToBuffer('follow', {
                    user_name: followerName,
                    user_id: followerId,
                    followed_at: followedAt,
                    timestamp: Date.now(),
                    raw_event: eventData
                });
                
                // DÃ©clencher aussi une synchronisation pour vÃ©rifier le dÃ©compte
                addEventToBuffer('sync', {
                    reason: 'Synchronisation aprÃ¨s Ã©vÃ©nement follow',
                    trigger: 'follow_event',
                    timestamp: Date.now()
                });
                break;
                
            case 'channel.subscribe':
                const subUserName = eventData.user_name || 'Utilisateur inconnu';
                const subUserId = eventData.user_id || 'ID inconnu';
                const subTier = eventData.tier || '1000';
                
                logEvent('Ã‰VÃ‰NEMENT', `â­ Nouvel abonnement: ${subUserName} (Tier ${subTier})`, {
                    user_name: subUserName,
                    user_id: subUserId,
                    tier: subTier,
                    raw_data: eventData
                });
                
                console.log('ðŸŽ‰ NOUVEL ABONNEMENT DÃ‰TECTÃ‰ !');
                console.log(`ðŸ‘¤ Utilisateur: ${subUserName}`);
                console.log(`â­ Tier: ${subTier}`);
                
                addEventToBuffer('sub', {
                    user_name: subUserName,
                    user_id: subUserId,
                    tier: subTier,
                    type: 'new_sub',
                    timestamp: Date.now(),
                    raw_event: eventData
                });
                break;
                
            case 'channel.subscription.gift':
                const gifterName = eventData.user_name || 'Utilisateur inconnu';
                const giftedCount = eventData.total || 1;
                const giftTier = eventData.tier || '1000';
                
                logEvent('Ã‰VÃ‰NEMENT', `ðŸŽ Abonnements offerts: ${gifterName} a offert ${giftedCount} subs (Tier ${giftTier})`, {
                    user_name: gifterName,
                    total_gifted: giftedCount,
                    tier: giftTier,
                    raw_data: eventData
                });
                
                console.log('ðŸŽ ABONNEMENTS OFFERTS DÃ‰TECTÃ‰S !');
                console.log(`ðŸ‘¤ Gifter: ${gifterName}`);
                console.log(`ðŸ“Š Nombre: ${giftedCount}`);
                console.log(`â­ Tier: ${giftTier}`);
                
                addEventToBuffer('sub', {
                    user_name: gifterName,
                    gifted_count: giftedCount,
                    tier: giftTier,
                    type: 'gift_sub',
                    timestamp: Date.now(),
                    raw_event: eventData
                });
                break;
                
            case 'channel.subscription.end':
                const endUserName = eventData.user_name || 'Utilisateur inconnu';
                const endUserId = eventData.user_id || 'ID inconnu';
                const endTier = eventData.tier || '1000';
                
                logEvent('Ã‰VÃ‰NEMENT', `â¹ï¸ Fin d'abonnement: ${endUserName} (Tier ${endTier})`, {
                    user_name: endUserName,
                    user_id: endUserId,
                    tier: endTier,
                    raw_data: eventData
                });
                
                console.log('â¹ï¸ FIN D\'ABONNEMENT DÃ‰TECTÃ‰E !');
                console.log(`ðŸ‘¤ Utilisateur: ${endUserName}`);
                console.log(`â­ Tier: ${endTier}`);
                
                addEventToBuffer('sub', {
                    user_name: endUserName,
                    user_id: endUserId,
                    tier: endTier,
                    type: 'end_sub',
                    timestamp: Date.now(),
                    raw_event: eventData
                });
                break;
                
            default:
                logEvent('INFO', `ðŸ”” Ã‰vÃ©nement non gÃ©rÃ©: ${eventType}`);
                logEvent('INFO', 'ðŸ“„ DonnÃ©es de l\'Ã©vÃ©nement:', eventData);
        }
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur handleEventSubNotification:', error.message);
        logEvent('ERROR', 'ðŸ“„ Notification problÃ©matique:', JSON.stringify(message, null, 2));
        
        // En cas d'erreur, ajouter une synchronisation de sÃ©curitÃ© au tampon
        try {
            logEvent('INFO', 'ðŸ”„ Ajout synchronisation de sÃ©curitÃ© au tampon...');
            addEventToBuffer('sync', { 
                reason: 'Synchronisation aprÃ¨s erreur EventSub',
                error: error.message,
                timestamp: Date.now()
            });
        } catch (bufferError) {
            logEvent('ERROR', 'âŒ Ã‰chec ajout Ã©vÃ©nement de sÃ©curitÃ© au tampon:', bufferError.message);
        }
    }
}

// S'abonner aux Ã©vÃ©nements de follow
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
            console.log('âœ… Abonnement aux Ã©vÃ©nements de follow activÃ©');
            return true;
        } else {
            const error = await response.text();
            console.error('âŒ Erreur abonnement EventSub follow:', error);
            throw new Error(`Ã‰chec abonnement EventSub: ${response.status} - ${error}`);
        }
    } catch (error) {
        console.error('âŒ Erreur souscription follow:', error);
        throw error; // Re-lancer l'erreur pour que le code appelant la gÃ¨re
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
            console.log('âœ… Abonnement aux nouveaux abonnements activÃ©');
        } else {
            const error = await response.text();
            console.error('âŒ Erreur abonnement EventSub subscription:', error);
        }
    } catch (error) {
        console.error('âŒ Erreur souscription subscription:', error);
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
            console.log('âœ… Abonnement aux dons d\'abonnements activÃ©');
        } else {
            const error = await response.text();
            console.error('âŒ Erreur abonnement EventSub gift:', error);
        }
    } catch (error) {
        console.error('âŒ Erreur souscription gift:', error);
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
            console.log('âœ… Abonnement aux fins d\'abonnements activÃ©');
        } else {
            const error = await response.text();
            console.error('âŒ Erreur abonnement EventSub end:', error);
        }
    } catch (error) {
        console.error('âŒ Erreur souscription end:', error);
    }
}

// Synchroniser le nombre de follows depuis Twitch
async function syncTwitchFollows(reason = 'Synchronisation') {
    try {
        console.log(`ðŸ”„ ${reason} - RÃ©cupÃ©ration du nombre de follows...`);
        // VÃ©rifier et relancer l'authentification si nÃ©cessaire
        if (!twitchConfig.access_token) {
            console.log('âš ï¸ Token manquant, lancement de l\'authentification...');
            await initiateDeviceCodeFlow();
        }
        const followCount = await getTwitchFollowCount();
        const oldCount = currentFollows;
        currentFollows = followCount;
        // Mettre Ã  jour les fichiers et diffuser
        updateFiles(currentFollows);
        broadcastUpdate();
        // Sauvegarder automatiquement sur disque
        saveFollowCountToFile(currentFollows);
        const diff = followCount - oldCount;
        const diffText = diff > 0 ? `(+${diff})` : diff < 0 ? `(${diff})` : '(=)';
        logEvent('SYNC', `ðŸ“Š ${reason}: ${oldCount} â†’ ${followCount} ${diffText}`);
        // Log additionnel pour les changements significatifs
        if (Math.abs(diff) > 0) {
            logEvent('INFO', `ðŸŽ¯ Changement dÃ©tectÃ© ! Mise Ã  jour complÃ¨te effectuÃ©e.`);
        }
        return followCount;
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur sync follows:', error.message);
        // En cas d'erreur, ne pas perdre les donnÃ©es actuelles
        logEvent('INFO', `ðŸ’¾ Conservation des donnÃ©es actuelles: ${currentFollows} follows`);
        
        // Ne pas relancer l'erreur pour Ã©viter le crash du serveur
        // Retourner le compteur actuel Ã  la place
        return currentFollows;
    }
}

// Synchroniser le nombre de subs depuis Twitch
async function syncTwitchSubs(reason = 'Synchronisation') {
    try {
        console.log(`ðŸ”„ ${reason} - RÃ©cupÃ©ration du nombre de subs...`);
        // VÃ©rifier et relancer l'authentification si nÃ©cessaire
        if (!twitchConfig.access_token) {
            console.log('âš ï¸ Token manquant, lancement de l\'authentification...');
            await initiateDeviceCodeFlow();
        }
        const subCount = await getTwitchSubCount();
        const oldCount = currentSubs;
        currentSubs = subCount;
        // Mettre Ã  jour les fichiers et diffuser
        updateSubFiles(currentSubs);
        broadcastSubUpdate();
        // Sauvegarder automatiquement sur disque
        saveSubCountToFile(currentSubs);
        const diff = subCount - oldCount;
        const diffText = diff > 0 ? `(+${diff})` : diff < 0 ? `(${diff})` : '(=)';
        logEvent('SYNC', `ðŸ“Š ${reason} subs: ${oldCount} â†’ ${subCount} ${diffText}`);
        // Log additionnel pour les changements significatifs
        if (Math.abs(diff) > 0) {
            logEvent('INFO', `ðŸŽ¯ Changement subs dÃ©tectÃ© ! Mise Ã  jour complÃ¨te effectuÃ©e.`);
        }
        return subCount;
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur sync subs:', error.message);
        // En cas d'erreur, ne pas perdre les donnÃ©es actuelles
        logEvent('INFO', `ðŸ’¾ Conservation des donnÃ©es actuelles: ${currentSubs} subs`);
        
        // Ne pas relancer l'erreur pour Ã©viter le crash du serveur
        // Retourner le compteur actuel Ã  la place
        return currentSubs;
    }
}

// Charger la configuration des objectifs pour les follows
function loadFollowGoals() {
    try {
        const configPath = path.join(ROOT_DIR, 'data', 'followgoal_config.txt');
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const lines = content.split(/\r?\n/).filter(line => line.trim());
            
            const oldGoalsSize = followGoals.size;
            followGoals.clear();
            lines.forEach(line => {
                const match = line.match(/^(\d+):\s*(.*?)\s*$/);
                if (match) {
                    const count = parseInt(match[1]);
                    const message = match[2]; // Peut Ãªtre vide, c'est OK
                    followGoals.set(count, message);
                }
            });
            
            console.log('âœ… Objectifs follows chargÃ©s:', followGoals.size, 'objectifs');
            
            // Mettre Ã  jour immÃ©diatement les fichiers avec les nouveaux objectifs
            updateFollowFiles(currentFollows);
            
            // Diffuser la mise Ã  jour
            broadcastFollowUpdate();
            console.log('ðŸ”„ Objectifs follows mis Ã  jour et diffusÃ©s immÃ©diatement');
        }
    } catch (error) {
        console.error('âŒ Erreur chargement objectifs follows:', error.message);
    }
}

// Charger la configuration des objectifs pour les subs
function loadSubGoals() {
    try {
        const configPath = path.join(ROOT_DIR, 'data', 'subgoals_config.txt');
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const lines = content.split(/\r?\n/).filter(line => line.trim());
            
            const oldGoalsSize = subGoals.size;
            subGoals.clear();
            lines.forEach(line => {
                const match = line.match(/^(\d+):\s*(.*?)\s*$/);
                if (match) {
                    const count = parseInt(match[1]);
                    const message = match[2]; // Peut Ãªtre vide, c'est OK
                    subGoals.set(count, message);
                }
            });
            
            console.log('âœ… Objectifs subs chargÃ©s:', subGoals.size, 'objectifs');
            
            // Mettre Ã  jour immÃ©diatement les fichiers avec les nouveaux objectifs
            updateSubFiles(currentSubs);
            
            // Diffuser la mise Ã  jour
            broadcastSubUpdate();
            console.log('ðŸ”„ Objectifs subs mis Ã  jour et diffusÃ©s immÃ©diatement');
        }
    } catch (error) {
        console.error('âŒ Erreur chargement objectifs subs:', error.message);
    }
}

// Fonction de compatibilitÃ© (charge les goals follows par dÃ©faut)
function loadGoals() {
    loadFollowGoals();
    loadSubGoals();
}

// Initialiser la surveillance des fichiers de configuration
function setupConfigWatcher() {
    const followConfigPath = path.join(ROOT_DIR, 'data', 'followgoal_config.txt');
    const subConfigPath = path.join(ROOT_DIR, 'data', 'subgoals_config.txt');
    
    // ArrÃªter la surveillance prÃ©cÃ©dente si elle existe
    if (configWatcher) {
        configWatcher.close();
    }
    if (subConfigWatcher) {
        subConfigWatcher.close();
    }
    
    try {
        // Surveiller les changements du fichier de configuration des follows
        configWatcher = fs.watch(followConfigPath, (eventType, filename) => {
            if (eventType === 'change') {
                console.log('ðŸ”„ Fichier followgoal_config.txt modifiÃ© - rechargement...');
                // Petit dÃ©lai pour s'assurer que l'Ã©criture est terminÃ©e
                setTimeout(() => {
                    loadFollowGoals();
                }, 100);
            }
        });
        
        // Surveiller les changements du fichier de configuration des subs
        subConfigWatcher = fs.watch(subConfigPath, (eventType, filename) => {
            if (eventType === 'change') {
                console.log('ðŸ”„ Fichier subgoals_config.txt modifiÃ© - rechargement...');
                // Petit dÃ©lai pour s'assurer que l'Ã©criture est terminÃ©e
                setTimeout(() => {
                    loadSubGoals();
                }, 100);
            }
        });
        
        console.log('ðŸ‘ï¸ Surveillance des fichiers de configuration activÃ©e');
    } catch (error) {
        console.error('âŒ Erreur surveillance fichiers:', error.message);
    }
}

// Trouver l'objectif actuel pour les follows
function getCurrentFollowGoal(follows) {
    let nextGoal = null;
    let lastReachedGoal = null;
    let progress = 0;
    
    const sortedGoals = Array.from(followGoals.keys()).sort((a, b) => a - b);
    
    // VÃ©rifier qu'il y a au moins un objectif
    if (sortedGoals.length === 0) {
        console.log('âš ï¸ Aucun objectif follow trouvÃ© dans la configuration');
        return {
            current: follows,
            target: follows,
            message: follows.toString(),
            remaining: 0,
            progress: 100,
            isMaxReached: true
        };
    }
    
    // Trouver le dernier objectif atteint et le prochain objectif
    for (const goalCount of sortedGoals) {
        if (follows >= goalCount) {
            lastReachedGoal = goalCount;
        }
        if (follows < goalCount && !nextGoal) {
            nextGoal = goalCount;
        }
    }
    
    if (nextGoal) {
        // Il y a un objectif suivant Ã  atteindre
        const message = followGoals.get(nextGoal);
        const remaining = nextGoal - follows;
        progress = ((follows / nextGoal) * 100).toFixed(1);
        
        return {
            current: follows,
            target: nextGoal,
            message: message,
            remaining: remaining,
            progress: progress
        };
    } else if (lastReachedGoal) {
        // Pas d'objectif suivant, on a dÃ©passÃ© tous les objectifs
        return {
            current: follows,
            target: follows,
            message: follows.toString(),
            remaining: 0,
            progress: 100,
            isMaxReached: true
        };
    } else {
        // Aucun objectif atteint (moins que le premier objectif)
        const firstGoal = sortedGoals[0];
        const message = followGoals.get(firstGoal);
        const remaining = firstGoal - follows;
        progress = ((follows / firstGoal) * 100).toFixed(1);
        
        return {
            current: follows,
            target: firstGoal,
            message: message,
            remaining: remaining,
            progress: progress
        };
    }
}

// Trouver l'objectif actuel pour les subs
function getCurrentSubGoal(subs) {
    let nextGoal = null;
    let lastReachedGoal = null;
    let progress = 0;
    
    const sortedGoals = Array.from(subGoals.keys()).sort((a, b) => a - b);
    
    // VÃ©rifier qu'il y a au moins un objectif
    if (sortedGoals.length === 0) {
        console.log('âš ï¸ Aucun objectif sub trouvÃ© dans la configuration');
        return {
            current: subs,
            target: subs,
            message: subs.toString(),
            remaining: 0,
            progress: 100,
            isMaxReached: true
        };
    }
    
    // Trouver le dernier objectif atteint et le prochain objectif
    for (const goalCount of sortedGoals) {
        if (subs >= goalCount) {
            lastReachedGoal = goalCount;
        }
        if (subs < goalCount && !nextGoal) {
            nextGoal = goalCount;
        }
    }
    
    if (nextGoal) {
        // Il y a un objectif suivant Ã  atteindre
        const message = subGoals.get(nextGoal);
        const remaining = nextGoal - subs;
        progress = ((subs / nextGoal) * 100).toFixed(1);
        
        return {
            current: subs,
            target: nextGoal,
            message: message,
            remaining: remaining,
            progress: progress
        };
    } else if (lastReachedGoal) {
        // Pas d'objectif suivant, on a dÃ©passÃ© tous les objectifs
        return {
            current: subs,
            target: subs,
            message: subs.toString(),
            remaining: 0,
            progress: 100,
            isMaxReached: true
        };
    } else {
        // Aucun objectif atteint (moins que le premier objectif)
        const firstGoal = sortedGoals[0];
        const message = subGoals.get(firstGoal);
        const remaining = firstGoal - subs;
        progress = ((subs / firstGoal) * 100).toFixed(1);
        
        return {
            current: subs,
            target: firstGoal,
            message: message,
            remaining: remaining,
            progress: progress
        };
    }
}

// Fonction de compatibilitÃ© (utilise les goals follows par dÃ©faut)
function getCurrentGoal(count) {
    return getCurrentFollowGoal(count);
}

// ========================================
// âš¡ SYSTÃˆME DE BATCHING INTELLIGENT
// ========================================

/**
 * Ajoute un follow au batch avec file d'attente synchronisÃ©e aux animations
 * Pendant qu'une animation est en cours (1s), accumule tous les events
 * Puis flush le batch dans la prochaine animation
 */
function addFollowToBatch(count = 1) {
    followBatch.count += count;
    
    // Annuler le timer prÃ©cÃ©dent si existe
    if (followBatch.timer) {
        clearTimeout(followBatch.timer);
    }
    
    // Si une animation est en cours, juste accumuler (le timer existant gÃ©rera le flush)
    if (followBatch.isAnimating) {
        logEvent('INFO', `â³ Animation en cours - Accumulation follows: ${followBatch.count}`);
        // Ne pas crÃ©er de nouveau timer, attendre que l'animation se termine
        return;
    }
    
    // Aucune animation en cours : attendre un peu pour capturer les events groupÃ©s
    followBatch.timer = setTimeout(() => {
        flushFollowBatch();
    }, BATCH_DELAY);
    
    logEvent('INFO', `ðŸ“¥ Follow ajoutÃ© au batch: ${followBatch.count} (flush dans ${BATCH_DELAY}ms)`);
}

/**
 * Traite et envoie le batch de follows accumulÃ©s
 * Lance une animation de 1 seconde pendant laquelle les nouveaux events s'accumulent
 */
function flushFollowBatch() {
    if (followBatch.count === 0) return;
    
    const batchCount = followBatch.count;
    followBatch.count = 0;
    followBatch.timer = null;
    
    // Marquer qu'une animation est en cours
    followBatch.isAnimating = true;
    
    // Mettre Ã  jour le compteur
    currentFollows += batchCount;
    
    // Mettre Ã  jour les fichiers
    updateFollowFiles(currentFollows);
    
    // Broadcast avec indication du nombre groupÃ©
    broadcastFollowUpdate(batchCount);
    
    logEvent('INFO', `ðŸŽ¬ Animation dÃ©marrÃ©e: +${batchCount} follows (Total: ${currentFollows}) - DurÃ©e: ${ANIMATION_DURATION}ms`);
    
    // AprÃ¨s la durÃ©e de l'animation, marquer comme terminÃ©e et flush si nouveaux events
    setTimeout(() => {
        followBatch.isAnimating = false;
        logEvent('INFO', `âœ… Animation terminÃ©e - Batch actuel: ${followBatch.count} follows`);
        
        // Si des events se sont accumulÃ©s pendant l'animation, les traiter
        if (followBatch.count > 0) {
            logEvent('INFO', `ðŸ”„ Flush automatique du batch accumulÃ©: ${followBatch.count} follows`);
            flushFollowBatch(); // RÃ©cursif : lance la prochaine animation
        }
    }, ANIMATION_DURATION);
}

/**
 * Ajoute un sub au batch avec file d'attente synchronisÃ©e aux animations
 */
function addSubToBatch(count = 1, tier = '1000') {
    subBatch.count += count;
    
    // Accumuler par tier
    if (!subBatch.tiers[tier]) {
        subBatch.tiers[tier] = 0;
    }
    subBatch.tiers[tier] += count;
    
    // Annuler le timer prÃ©cÃ©dent
    if (subBatch.timer) {
        clearTimeout(subBatch.timer);
    }
    
    // Si une animation est en cours, juste accumuler
    if (subBatch.isAnimating) {
        logEvent('INFO', `â³ Animation en cours - Accumulation subs: ${subBatch.count}`);
        return;
    }
    
    // Aucune animation en cours : attendre un peu pour capturer les events groupÃ©s
    subBatch.timer = setTimeout(() => {
        flushSubBatch();
    }, BATCH_DELAY);
    
    logEvent('INFO', `ðŸ“¥ Sub ajoutÃ© au batch: ${subBatch.count} (flush dans ${BATCH_DELAY}ms)`);
}

/**
 * Traite et envoie le batch de subs accumulÃ©s
 * Lance une animation de 1 seconde pendant laquelle les nouveaux events s'accumulent
 */
function flushSubBatch() {
    if (subBatch.count === 0) return;
    
    const batchCount = subBatch.count;
    const tiers = { ...subBatch.tiers };
    
    subBatch.count = 0;
    subBatch.tiers = {};
    subBatch.timer = null;
    
    // Marquer qu'une animation est en cours
    subBatch.isAnimating = true;
    
    // Mettre Ã  jour le compteur
    currentSubs += batchCount;
    
    // Mettre Ã  jour les fichiers
    updateSubFiles(currentSubs);
    
    // Broadcast avec dÃ©tails des tiers
    broadcastSubUpdate(batchCount, tiers);
    
    const tierDetails = Object.entries(tiers)
        .map(([tier, count]) => `${count}Ã—T${tier.charAt(0)}`)
        .join(', ');
    
    logEvent('INFO', `ðŸŽ¬ Animation dÃ©marrÃ©e: +${batchCount} subs (${tierDetails}) (Total: ${currentSubs}) - DurÃ©e: ${ANIMATION_DURATION}ms`);
    
    // AprÃ¨s la durÃ©e de l'animation, marquer comme terminÃ©e et flush si nouveaux events
    setTimeout(() => {
        subBatch.isAnimating = false;
        logEvent('INFO', `âœ… Animation terminÃ©e - Batch actuel: ${subBatch.count} subs`);
        
        // Si des events se sont accumulÃ©s pendant l'animation, les traiter
        if (subBatch.count > 0) {
            logEvent('INFO', `ðŸ”„ Flush automatique du batch accumulÃ©: ${subBatch.count} subs`);
            flushSubBatch(); // RÃ©cursif : lance la prochaine animation
        }
    }, ANIMATION_DURATION);
}

// ========================================
// Fin du systÃ¨me de batching
// ========================================

// Mettre Ã  jour les fichiers pour les follows
function updateFollowFiles(follows) {
    const goal = getCurrentFollowGoal(follows);
    
    // Choix du format d'affichage selon le cas
    let goalText;
    if (goal.isMaxReached) {
        // Cas oÃ¹ on a dÃ©passÃ© tous les objectifs : afficher seulement le nombre
        goalText = follows.toString();
    } else {
        // VÃ©rifier si le message est vide ou undefined
        if (!goal.message || goal.message.trim() === '') {
            // Message vide : afficher seulement {followcount}/{goal}
            goalText = `${goal.current}/${goal.target}`;
        } else {
            // Message prÃ©sent : afficher le format complet {followcount}/{goal} : {message}
            goalText = `${goal.current}/${goal.target} : ${goal.message}`;
        }
    }
    
    try {
        // Fichier pour les goals de follows
        fs.writeFileSync(path.join(ROOT_DIR, 'data', 'total_followers_count_goal.txt'), goalText);
        
        // Fichier de base pour follows
        fs.writeFileSync(path.join(ROOT_DIR, 'data', 'total_followers_count.txt'), follows.toString());
        
        console.log(`ðŸ“Š Fichiers follows mis Ã  jour: ${follows} follows`);
    } catch (error) {
        console.error('âŒ Erreur Ã©criture fichiers follows:', error.message);
    }
}

// Mettre Ã  jour les fichiers pour les subs
function updateSubFiles(subs) {
    const goal = getCurrentSubGoal(subs);
    
    // Choix du format d'affichage selon le cas
    let goalText;
    if (goal.isMaxReached) {
        // Cas oÃ¹ on a dÃ©passÃ© tous les objectifs : afficher seulement le nombre
        goalText = subs.toString();
    } else {
        // VÃ©rifier si le message est vide ou undefined
        if (!goal.message || goal.message.trim() === '') {
            // Message vide : afficher seulement {subcount}/{goal}
            goalText = `${goal.current}/${goal.target}`;
        } else {
            // Message prÃ©sent : afficher le format complet {subcount}/{goal} : {message}
            goalText = `${goal.current}/${goal.target} : ${goal.message}`;
        }
    }
    
    try {
        // Fichier pour les goals de subs
        fs.writeFileSync(path.join(ROOT_DIR, 'data', 'total_subscriber_count_goal.txt'), goalText);
        
        // Fichier de base pour subs
        fs.writeFileSync(path.join(ROOT_DIR, 'data', 'total_subscriber_count.txt'), subs.toString());
        
        console.log(`ðŸ“Š Fichiers subs mis Ã  jour: ${subs} subs`);
    } catch (error) {
        console.error('âŒ Erreur Ã©criture fichiers subs:', error.message);
    }
}

// Fonction de compatibilitÃ© (mise Ã  jour des follows par dÃ©faut)
function updateFiles(follows) {
    updateFollowFiles(follows);
}

// CrÃ©er le serveur WebSocket
const wss = new WebSocket.Server({ port: 8083 });

wss.on('connection', (ws) => {
    console.log('ðŸ”Œ Client WebSocket connectÃ©');
    
    // Envoyer les donnÃ©es actuelles (follows et subs)
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
        console.log('ðŸ”Œ Client WebSocket dÃ©connectÃ©');
    });
});

// Diffuser les mises Ã  jour de follows aux clients WebSocket
function broadcastFollowUpdate(batchCount = 1) {
    const data = {
        type: 'follow_update',
        count: currentFollows,
        goal: getCurrentFollowGoal(currentFollows),
        batchCount: batchCount, // Nombre de follows groupÃ©s
        isBatch: batchCount > 1 // Indique si c'est un event groupÃ©
    };
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Diffuser les mises Ã  jour de subs aux clients WebSocket  
function broadcastSubUpdate(batchCount = 1, tiers = {}) {
    const data = {
        type: 'sub_update',
        count: currentSubs,
        goal: getCurrentSubGoal(currentSubs),
        batchCount: batchCount, // Nombre de subs groupÃ©s
        isBatch: batchCount > 1, // Indique si c'est un event groupÃ©
        tiers: tiers // DÃ©tails des tiers groupÃ©s
    };
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Fonction de compatibilitÃ© (diffusion des follows par dÃ©faut)
function broadcastUpdate() {
    broadcastFollowUpdate();
}

// Charger la configuration Twitch
function loadTwitchConfig() {
    try {
        const configPath = path.join(ROOT_DIR, 'data', 'twitch_config.txt');
        if (fs.existsSync(configPath)) {
            // Chargement sÃ©curisÃ© avec dÃ©chiffrement automatique
            const content = configCrypto.loadEncrypted(configPath);
            
            if (!content) {
                console.log('ðŸ“ CrÃ©ation du fichier de configuration Twitch...');
                saveTwitchConfig();
                return;
            }
            
            const lines = content.split(/\r?\n/);
            
            lines.forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    switch (key.trim()) {
                        case 'CLIENT_ID':
                            twitchConfig.client_id = value.trim();
                            break;
                        case 'ACCESS_TOKEN':
                            twitchConfig.access_token = value.trim();
                            break;
                        case 'REFRESH_TOKEN':
                            twitchConfig.refresh_token = value.trim();
                            break;
                        case 'BROADCASTER_ID':
                            twitchConfig.user_id = value.trim();
                            break;
                        case 'USERNAME':
                            twitchConfig.username = value.trim();
                            break;
                    }
                }
            });
            
            // Marquer comme configurÃ© si on a les infos essentielles
            if (twitchConfig.client_id && twitchConfig.access_token && twitchConfig.user_id) {
                twitchConfig.configured = true;
                console.log('âœ… Configuration Twitch chargÃ©e (sÃ©curisÃ©e)');
            } else {
                console.log('âš ï¸ Configuration Twitch incomplÃ¨te');
            }
        } else {
            console.log('ðŸ“ CrÃ©ation du fichier de configuration Twitch...');
            saveTwitchConfig();
        }
    } catch (error) {
        console.error('âŒ Erreur chargement config Twitch:', error.message);
        console.error('ðŸ’¡ Si le fichier est corrompu, utilisez le bouton "DÃ©connecter Twitch" pour rÃ©initialiser');
    }
}

// Sauvegarder la configuration Twitch
function saveTwitchConfig() {
    try {
        const configPath = path.join(ROOT_DIR, 'data', 'twitch_config.txt');
        const configContent = [
            `CLIENT_ID=${twitchConfig.client_id || ''}`,
            `ACCESS_TOKEN=${twitchConfig.access_token || ''}`,
            `REFRESH_TOKEN=${twitchConfig.refresh_token || ''}`,
            `BROADCASTER_ID=${twitchConfig.user_id || ''}`,
            `USERNAME=${twitchConfig.username || ''}`
        ].join('\n');
        
        // Sauvegarde sÃ©curisÃ©e avec chiffrement automatique
        configCrypto.saveEncrypted(configPath, configContent);
        console.log('ðŸ’¾ Configuration Twitch sauvegardÃ©e (chiffrÃ©e)');
    } catch (error) {
        console.error('âŒ Erreur sauvegarde config Twitch:', error.message);
    }
}

// Routes API
app.get('/', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'web', 'dashboard.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'web', 'dashboard.html'));
});

app.get('/config', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'web', 'config.html'));
});

app.get('/test', (req, res) => {
    res.send(generateTestPage());
});

// ========================================
// ðŸ”§ ADMIN PANEL ROUTES (Hidden)
// ========================================

app.get('/admin', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'web', 'admin.html'));
});

// Route pour servir les overlays OBS
app.use('/obs/overlays', express.static(path.join(ROOT_DIR, 'obs', 'overlays')));

app.get('/api/stats', (req, res) => {
    try {
        // Utiliser les variables globales pour les compteurs
        const followGoal = parseInt(fs.readFileSync(path.join(ROOT_DIR, 'data', 'follower_goal.txt'), 'utf8')) || 0;
        const subGoal = parseInt(fs.readFileSync(path.join(ROOT_DIR, 'data', 'total_subscriber_count_goal.txt'), 'utf8')) || 0;
        
        res.json({
            follows: currentFollows,
            subs: currentSubs,
            followGoal: followGoal,
            subGoal: subGoal
        });
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur lecture stats admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Add Follows
app.post('/admin/add-follows', (req, res) => {
    try {
        const amount = validatePositiveInt(req.body.amount, 'amount', 1, 100000);
        
        // Utiliser le systÃ¨me de batching pour gÃ©rer le spam
        addFollowToBatch(amount);
        
        logEvent('INFO', `âž• Admin: Ajout de ${amount} follows au batch`);
        res.json({ success: true, total: currentFollows + followBatch.count });
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur add follows', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

// Remove Follows
app.post('/admin/remove-follows', (req, res) => {
    try {
        const { amount } = req.body;
        
        // Utiliser la variable globale
        currentFollows = Math.max(0, currentFollows - amount);
        
        // Mettre Ã  jour les fichiers avec la fonction existante
        updateFollowFiles(currentFollows);
        
        // Broadcast avec la fonction existante
        broadcastFollowUpdate();
        
        logEvent('INFO', `âž– Admin: -${amount} follows (Total: ${currentFollows})`);
        res.json({ success: true, total: currentFollows });
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur remove follows', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Set Follows
app.post('/admin/set-follows', (req, res) => {
    try {
        const { count } = req.body;
        
        // Utiliser la variable globale
        currentFollows = count;
        
        // Mettre Ã  jour les fichiers avec la fonction existante
        updateFollowFiles(currentFollows);
        
        // Broadcast avec la fonction existante
        broadcastFollowUpdate();
        
        logEvent('INFO', `ðŸ“ Admin: Follows dÃ©finis Ã  ${count}`);
        res.json({ success: true, total: count });
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur set follows', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Add Subs
app.post('/admin/add-subs', (req, res) => {
    try {
        const { amount, tier } = req.body;
        
        // Utiliser le systÃ¨me de batching pour gÃ©rer le spam
        addSubToBatch(amount, tier);
        
        logEvent('INFO', `âž• Admin: Ajout de ${amount} subs tier ${tier} au batch`);
        res.json({ success: true, total: currentSubs + subBatch.count });
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur add subs', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Remove Subs
app.post('/admin/remove-subs', (req, res) => {
    try {
        const { amount } = req.body;
        
        // Utiliser la variable globale
        currentSubs = Math.max(0, currentSubs - amount);
        
        // Mettre Ã  jour les fichiers avec la fonction existante
        updateSubFiles(currentSubs);
        
        // Broadcast avec la fonction existante
        broadcastSubUpdate();
        
        logEvent('INFO', `âž– Admin: -${amount} subs (Total: ${currentSubs})`);
        res.json({ success: true, total: currentSubs });
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur remove subs', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Set Subs
app.post('/admin/set-subs', (req, res) => {
    try {
        const { count } = req.body;
        
        // Utiliser la variable globale
        currentSubs = count;
        
        // Mettre Ã  jour les fichiers avec la fonction existante
        updateSubFiles(currentSubs);
        
        // Broadcast avec la fonction existante
        broadcastSubUpdate();
        
        logEvent('INFO', `ðŸ“ Admin: Subs dÃ©finis Ã  ${count}`);
        res.json({ success: true, total: count });
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur set subs', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Set Follow Goal
app.post('/admin/set-follow-goal', (req, res) => {
    try {
        const { goal } = req.body;
        const goalPath = path.join(ROOT_DIR, 'follower_goal.txt');
        
        fs.writeFileSync(goalPath, goal.toString(), 'utf8');
        
        // Broadcast via WebSocket
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'goal_update',
                    followGoal: goal
                }));
            }
        });
        
        logEvent('INFO', `ðŸŽ¯ Admin: Objectif follows dÃ©fini Ã  ${goal}`);
        res.json({ success: true, goal: goal });
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur set follow goal', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Set Sub Goal
app.post('/admin/set-sub-goal', (req, res) => {
    try {
        const { goal } = req.body;
        const goalPath = path.join(ROOT_DIR, 'data', 'total_subscriber_count_goal.txt');
        
        fs.writeFileSync(goalPath, goal.toString(), 'utf8');
        
        // Broadcast via WebSocket
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'goal_update',
                    subGoal: goal
                }));
            }
        });
        
        logEvent('INFO', `ðŸŽ¯ Admin: Objectif subs dÃ©fini Ã  ${goal}`);
        res.json({ success: true, goal: goal });
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur set sub goal', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Sync with Twitch API (compare and update)
app.get('/admin/sync-twitch', async (req, res) => {
    try {
        logEvent('INFO', 'ðŸ”„ Admin: Synchronisation avec Twitch API');
        
        if (!twitchConfig.access_token || !twitchConfig.user_id) {
            return res.json({ 
                success: false,
                error: 'Non authentifiÃ© avec Twitch'
            });
        }
        
        // Sauvegarder les valeurs locales actuelles
        const localFollows = currentFollows;
        const localSubs = currentSubs;
        
        // RÃ©cupÃ©rer les valeurs depuis Twitch
        const twitchFollows = await syncTwitchFollows('Sync admin panel');
        const twitchSubs = await syncTwitchSubs('Sync admin panel');
        
        // Calculer les diffÃ©rences
        const followsDiff = twitchFollows - localFollows;
        const subsDiff = twitchSubs - localSubs;
        const updated = (followsDiff !== 0) || (subsDiff !== 0);
        
        logEvent('INFO', `ðŸ“Š Sync terminÃ©e - Follows: ${localFollows}â†’${twitchFollows} (${followsDiff >= 0 ? '+' : ''}${followsDiff}) | Subs: ${localSubs}â†’${twitchSubs} (${subsDiff >= 0 ? '+' : ''}${subsDiff})`);
        
        res.json({
            success: true,
            twitchFollows: twitchFollows,
            twitchSubs: twitchSubs,
            localFollows: localFollows,
            localSubs: localSubs,
            followsDiff: followsDiff,
            subsDiff: subsDiff,
            updated: updated
        });
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Admin: Erreur sync Twitch', { error: error.message });
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Test Twitch API
app.get('/admin/test-twitch-api', async (req, res) => {
    try {
        logEvent('INFO', 'ðŸ” Admin: Test API Twitch');
        
        if (!twitchConfig.access_token || !twitchConfig.user_id) {
            return res.json({ 
                status: 'NOT_AUTHENTICATED',
                message: 'Non authentifiÃ©'
            });
        }
        
        // Test follows
        const followsResponse = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${twitchConfig.user_id}`, {
            headers: {
                'Authorization': `Bearer ${twitchConfig.access_token}`,
                'Client-Id': twitchConfig.client_id
            }
        });
        
        const followsData = await followsResponse.json();
        
        // Test subs
        const subsResponse = await fetch(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${twitchConfig.user_id}`, {
            headers: {
                'Authorization': `Bearer ${twitchConfig.access_token}`,
                'Client-Id': twitchConfig.client_id
            }
        });
        
        const subsData = await subsResponse.json();
        
        res.json({
            status: 'OK',
            follows: followsData.total || 0,
            subs: subsData.data ? subsData.data.length : 0,
            followsResponse: followsData,
            subsResponse: subsData
        });
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Admin: Erreur test API', { error: error.message });
        res.status(500).json({ 
            status: 'ERROR',
            error: error.message 
        });
    }
});

// Test EventSub
app.get('/admin/test-eventsub', (req, res) => {
    try {
        const status = eventSubSessionId ? 'CONNECTED' : 'DISCONNECTED';
        
        res.json({
            status: status,
            sessionId: eventSubSessionId,
            message: status === 'CONNECTED' ? 'EventSub connectÃ©' : 'EventSub dÃ©connectÃ©'
        });
        
        logEvent('INFO', `ðŸ“¡ Admin: Test EventSub - ${status}`);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test Polling
app.get('/admin/test-polling', async (req, res) => {
    try {
        logEvent('INFO', 'â±ï¸ Admin: Test polling manuel');
        
        // ExÃ©cute le polling manuellement
        await pollFollowCount();
        
        res.json({ 
            success: true,
            message: 'Polling exÃ©cutÃ©'
        });
    } catch (error) {
        logEvent('ERROR', 'âŒ Admin: Erreur test polling', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Read Files
app.get('/admin/read-files', (req, res) => {
    try {
        const files = {
            follows: fs.readFileSync(path.join(ROOT_DIR, 'follower_count.txt'), 'utf8'),
            subs: fs.readFileSync(path.join(ROOT_DIR, 'data', 'total_subscriber_count.txt'), 'utf8'),
            followGoal: fs.readFileSync(path.join(ROOT_DIR, 'follower_goal.txt'), 'utf8'),
            subGoal: fs.readFileSync(path.join(ROOT_DIR, 'data', 'total_subscriber_count_goal.txt'), 'utf8'),
            twitchConfig: twitchConfig
        };
        
        logEvent('INFO', 'ðŸ“– Admin: Lecture fichiers');
        res.json(files);
    } catch (error) {
        logEvent('ERROR', 'âŒ Admin: Erreur lecture fichiers', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Test File Write
app.get('/admin/test-file-write', (req, res) => {
    try {
        const testPath = path.join(__dirname, 'admin_test_write.txt');
        const testContent = `Test Ã©criture admin - ${new Date().toISOString()}`;
        
        fs.writeFileSync(testPath, testContent, 'utf8');
        const readBack = fs.readFileSync(testPath, 'utf8');
        
        fs.unlinkSync(testPath); // Clean up
        
        logEvent('INFO', 'ðŸ’¾ Admin: Test Ã©criture OK');
        res.json({ 
            success: true,
            written: testContent,
            readBack: readBack
        });
    } catch (error) {
        logEvent('ERROR', 'âŒ Admin: Erreur test Ã©criture', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Backup Data
app.get('/admin/backup-data', (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, 'backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        const backupData = {
            timestamp: timestamp,
            follows: fs.readFileSync(path.join(ROOT_DIR, 'follower_count.txt'), 'utf8'),
            subs: fs.readFileSync(path.join(ROOT_DIR, 'data', 'total_subscriber_count.txt'), 'utf8'),
            followGoal: fs.readFileSync(path.join(ROOT_DIR, 'follower_goal.txt'), 'utf8'),
            subGoal: fs.readFileSync(path.join(ROOT_DIR, 'data', 'total_subscriber_count_goal.txt'), 'utf8')
        };
        
        const backupPath = path.join(backupDir, `backup_${timestamp}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
        
        logEvent('INFO', `ðŸ“¦ Admin: Backup crÃ©Ã© - ${backupPath}`);
        res.json({ 
            success: true,
            filename: `backup_${timestamp}.json`,
            path: backupPath
        });
    } catch (error) {
        logEvent('ERROR', 'âŒ Admin: Erreur backup', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Restore Backup
app.get('/admin/restore-backup', (req, res) => {
    try {
        const backupDir = path.join(__dirname, 'backups');
        
        if (!fs.existsSync(backupDir)) {
            return res.status(404).json({ error: 'Aucun backup trouvÃ©' });
        }
        
        const backups = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
            .sort()
            .reverse();
        
        if (backups.length === 0) {
            return res.status(404).json({ error: 'Aucun backup trouvÃ©' });
        }
        
        const latestBackup = path.join(backupDir, backups[0]);
        const backupData = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));
        
        fs.writeFileSync(path.join(ROOT_DIR, 'follower_count.txt'), backupData.follows, 'utf8');
        fs.writeFileSync(path.join(ROOT_DIR, 'data', 'total_subscriber_count.txt'), backupData.subs, 'utf8');
        fs.writeFileSync(path.join(ROOT_DIR, 'follower_goal.txt'), backupData.followGoal, 'utf8');
        fs.writeFileSync(path.join(ROOT_DIR, 'data', 'total_subscriber_count_goal.txt'), backupData.subGoal, 'utf8');
        
        logEvent('INFO', `â†©ï¸ Admin: Backup restaurÃ© - ${backups[0]}`);
        res.json({ 
            success: true,
            restored: backups[0],
            data: backupData
        });
    } catch (error) {
        logEvent('ERROR', 'âŒ Admin: Erreur restore', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Corrupt Data Test
app.get('/admin/corrupt-data', (req, res) => {
    try {
        fs.writeFileSync(path.join(ROOT_DIR, 'follower_count.txt'), 'CORRUPTED_DATA', 'utf8');
        fs.writeFileSync(path.join(ROOT_DIR, 'data', 'total_subscriber_count.txt'), 'INVALID', 'utf8');
        
        logEvent('WARN', 'ðŸ”¥ Admin: DonnÃ©es corrompues pour test');
        res.json({ 
            success: true,
            message: 'DonnÃ©es corrompues - testez la rÃ©cupÃ©ration'
        });
    } catch (error) {
        logEvent('ERROR', 'âŒ Admin: Erreur corruption', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// End of Admin Routes
// ========================================

app.post('/api/config', (req, res) => {
    try {
        const { client_id } = req.body;
        
        twitchConfig.client_id = client_id;
        saveTwitchConfig();
        
        res.json({ success: true, message: 'Configuration sauvegardÃ©e' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ðŸ”¥ DEVICE CODE GRANT FLOW - Routes API
app.post('/api/start-device-auth', async (req, res) => {
    try {
        if (!twitchConfig.client_id) {
            return res.status(400).json({ 
                error: 'Client ID Twitch manquant',
                success: false 
            });
        }
        
        // VÃ©rifier si un processus d'authentification est dÃ©jÃ  en cours
        if (deviceCodePolling !== null) {
            return res.json({
                success: true,
                message: 'Authentification dÃ©jÃ  en cours',
                user_code: deviceCodeData.user_code || '',
                verification_uri: deviceCodeData.verification_uri || '',
                expires_in: deviceCodeData.expires_in || 0,
                already_running: true
            });
        }
        
        console.log('ðŸš€ DÃ©marrage Device Code Grant Flow via API...');
        const deviceData = await initiateDeviceCodeFlow();
        
        res.json({
            success: true,
            user_code: deviceData.user_code,
            verification_uri: deviceData.verification_uri,
            expires_in: deviceData.expires_in,
            interval: deviceData.interval,
            message: 'Device Code Grant Flow dÃ©marrÃ© avec succÃ¨s'
        });
    } catch (error) {
        console.error('âŒ Erreur start-device-auth:', error.message);
        res.status(500).json({ 
            error: error.message,
            success: false,
            details: 'Impossible de dÃ©marrer l\'authentification Device Code Grant'
        });
    }
});

app.get('/api/auth-status', (req, res) => {
    try {
        // Gestion sÃ©curisÃ©e du statut d'authentification
        const now = Date.now();
        const isPolling = deviceCodePolling !== null;
        const hasDeviceCode = deviceCodeData && deviceCodeData.device_code;
        const timeRemaining = hasDeviceCode ? Math.max(0, Math.floor((deviceCodeData.expires_at - now) / 1000)) : 0;
        
        // VÃ©rifier si l'authentification est complÃ¨te
        const isAuthenticated = twitchConfig.configured && 
                               twitchConfig.access_token && 
                               twitchConfig.user_id;
        
        res.json({
            configured: twitchConfig.configured,
            authenticated: isAuthenticated,
            username: twitchConfig.username || '',
            login: twitchConfig.login || '',
            display_name: twitchConfig.display_name || twitchConfig.username || '',
            user_id: twitchConfig.user_id || '',
            polling: isPolling,
            has_device_code: hasDeviceCode,
            has_access_token: !!twitchConfig.access_token,
            expires_at: hasDeviceCode ? deviceCodeData.expires_at : 0,
            time_remaining: timeRemaining,
            user_code: hasDeviceCode ? deviceCodeData.user_code : '',
            verification_uri: hasDeviceCode ? deviceCodeData.verification_uri : '',
            server_status: 'running',
            timestamp: now
        });
    } catch (error) {
        console.error('âŒ Erreur endpoint auth-status:', error.message);
        // Ne jamais faire planter cet endpoint - retourner un Ã©tat par dÃ©faut
        res.json({
            configured: false,
            authenticated: false,
            username: '',
            login: '',
            display_name: '',
            user_id: '',
            polling: false,
            has_device_code: false,
            has_access_token: false,
            expires_at: 0,
            time_remaining: 0,
            user_code: '',
            verification_uri: '',
            server_status: 'error',
            timestamp: Date.now(),
            error: error.message
        });
    }
});

// Endpoint pour vÃ©rifier le statut des privilÃ¨ges modÃ©rateur
app.get('/api/moderator-status', async (req, res) => {
    try {
        if (!twitchConfig.access_token || !twitchConfig.user_id) {
            return res.json({
                configured: false,
                error: 'Non configurÃ©'
            });
        }

        const isModerator = await checkIfModerator();
        const canGrantSelf = await canGrantSelfModerator();
        
        res.json({
            configured: true,
            user_id: twitchConfig.user_id,
            username: twitchConfig.username,
            is_moderator: isModerator,
            can_grant_self: canGrantSelf,
            scopes: twitchConfig.scope ? twitchConfig.scope.split(' ') : []
        });
    } catch (error) {
        console.error('âŒ Erreur lors de la vÃ©rification du statut modÃ©rateur:', error.message);
        res.status(500).json({
            configured: true,
            error: error.message
        });
    }
});

app.get('/api/sync-twitch', async (req, res) => {
    try {
        if (!twitchConfig.configured) {
            return res.status(400).json({ 
                success: false,
                error: 'Twitch non configurÃ© - Veuillez vous connecter d\'abord' 
            });
        }
        
        if (!twitchConfig.access_token) {
            return res.status(400).json({ 
                success: false,
                error: 'Token d\'accÃ¨s manquant - Reconnectez-vous Ã  Twitch' 
            });
        }
        
        logEvent('INFO', 'ðŸ”„ DÃ©marrage synchronisation manuelle depuis l\'API Twitch...');
        
        // Synchroniser follows ET subs depuis l'API Twitch
        let followCount, subCount;
        let followError = null, subError = null;
        
        try {
            followCount = await syncTwitchFollows('Synchronisation manuelle');
            logEvent('SUCCESS', `âœ… Follows synchronisÃ©s: ${followCount}`);
        } catch (error) {
            followError = error.message;
            logEvent('ERROR', `âŒ Erreur sync follows: ${error.message}`);
            followCount = currentFollows; // Garder l'ancienne valeur
        }
        
        try {
            subCount = await syncTwitchSubs('Synchronisation manuelle');
            logEvent('SUCCESS', `âœ… Subs synchronisÃ©s: ${subCount}`);
        } catch (error) {
            subError = error.message;
            logEvent('ERROR', `âŒ Erreur sync subs: ${error.message}`);
            subCount = currentSubs; // Garder l'ancienne valeur
        }
        
        // Construire la rÃ©ponse
        const hasErrors = followError || subError;
        
        res.json({
            success: !hasErrors,
            currentFollows: currentFollows,
            currentSubs: currentSubs,
            message: hasErrors ? 
                'Synchronisation partielle avec erreurs' : 
                'Synchronisation complÃ¨te rÃ©ussie ! Follows et Subs rÃ©cupÃ©rÃ©s depuis l\'API Twitch',
            details: {
                follows: followError ? 
                    `Erreur: ${followError}` : 
                    `${followCount} follows synchronisÃ©s depuis Twitch`,
                subs: subError ? 
                    `Erreur: ${subError}` : 
                    `${subCount} subs synchronisÃ©s depuis Twitch`
            },
            errors: hasErrors ? {
                follows: followError,
                subs: subError
            } : null
        });
    } catch (error) {
        logEvent('ERROR', `âŒ Erreur gÃ©nÃ©rale sync: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: error.message,
            details: {
                message: 'Erreur lors de la synchronisation',
                stack: error.stack
            }
        });
    }
});

app.get('/api/status', (req, res) => {
    const eventSubConnected = twitchEventSubWs && twitchEventSubWs.readyState === WebSocket.OPEN;
    
    // Backup info pour les follows
    const followBackupExists = fs.existsSync(path.join(ROOT_DIR, 'data', 'followcount_backup.txt'));
    let followBackupInfo = null;
    if (followBackupExists) {
        try {
            const content = fs.readFileSync(path.join(ROOT_DIR, 'data', 'followcount_backup.txt'), 'utf8');
            const [count, timestamp] = content.split('|');
            followBackupInfo = {
                count: parseInt(count) || 0,
                timestamp: timestamp || 'Inconnu'
            };
        } catch (error) {
            followBackupInfo = { error: 'Erreur lecture backup follows' };
        }
    }
    
    // Backup info pour les subs
    const subBackupExists = fs.existsSync(path.join(ROOT_DIR, 'data', 'subcount_backup.txt'));
    let subBackupInfo = null;
    if (subBackupExists) {
        try {
            const content = fs.readFileSync(path.join(ROOT_DIR, 'data', 'subcount_backup.txt'), 'utf8');
            const [count, timestamp] = content.split('|');
            subBackupInfo = {
                count: parseInt(count) || 0,
                timestamp: timestamp || 'Inconnu'
            };
        } catch (error) {
            subBackupInfo = { error: 'Erreur lecture backup subs' };
        }
    }
    
    res.json({
        status: 'active',
        version: '2.0',
        currentFollows: currentFollows,
        currentSubs: currentSubs,
        goals: followGoals.size + subGoals.size,
        uptime: Math.floor(process.uptime()),
        twitchConfigured: twitchConfig.configured,
        username: twitchConfig.username,
        eventSubConnected: eventSubConnected,
        sessionId: sessionId,
        deviceCodePolling: deviceCodePolling !== null,
        reconnectAttempts: reconnectAttempts,
        maxReconnectAttempts: maxReconnectAttempts,
        lastUpdate: new Date().toISOString(),
        backup: followBackupInfo, // Ancien format pour compatibilitÃ©
        followBackup: followBackupInfo,
        subBackup: subBackupInfo,
        websocketClients: wss.clients.size,
        // ðŸ”„ Informations sur le tampon d'Ã©vÃ©nements
        eventBuffer: {
            size: eventBuffer.length,
            isProcessing: isProcessingEvents,
            lastProcessTime: lastEventProcessTime > 0 ? new Date(lastEventProcessTime).toISOString() : null,
            maxEventsPerBatch: MAX_EVENTS_PER_BATCH,
            processingDelay: EVENT_PROCESSING_DELAY
        }
    });
});

// Route pour obtenir les informations des logs
app.get('/api/logs-info', (req, res) => {
    try {
        const logsInfo = {};
        
        // Informations sur subcount_logs.txt
        const subcountLogPath = path.join(ROOT_DIR, 'logs', 'subcount_logs.txt');
        if (fs.existsSync(subcountLogPath)) {
            const stats = fs.statSync(subcountLogPath);
            logsInfo.subcountLogs = {
                exists: true,
                size: stats.size,
                sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
                sizeKB: (stats.size / 1024).toFixed(2),
                lastModified: stats.mtime.toISOString()
            };
        } else {
            logsInfo.subcountLogs = { exists: false };
        }
        
        // Informations sur obs_subcount_auto.log
        const obsLogPath = path.join(__dirname, 'obs_subcount_auto.log');
        if (fs.existsSync(obsLogPath)) {
            const stats = fs.statSync(obsLogPath);
            logsInfo.obsLogs = {
                exists: true,
                size: stats.size,
                sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
                sizeKB: (stats.size / 1024).toFixed(2),
                lastModified: stats.mtime.toISOString()
            };
        } else {
            logsInfo.obsLogs = { exists: false };
        }
        
        res.json(logsInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route pour nettoyer les logs
app.post('/api/clean-logs', (req, res) => {
    try {
        const results = {};
        const { which = 'both' } = req.body; // 'subcount', 'obs', ou 'both'
        
        if (which === 'subcount' || which === 'both') {
            const subcountLogPath = path.join(ROOT_DIR, 'logs', 'subcount_logs.txt');
            if (fs.existsSync(subcountLogPath)) {
                const originalSize = fs.statSync(subcountLogPath).size;
                const header = `# Log nettoyÃ© manuellement via interface web - ${new Date().toISOString()}\n\n`;
                fs.writeFileSync(subcountLogPath, header, 'utf8');
                results.subcountLogs = {
                    cleaned: true,
                    originalSizeKB: (originalSize / 1024).toFixed(2),
                    newSizeKB: (header.length / 1024).toFixed(2)
                };
                logEvent('INFO', 'ðŸ§¹ Log subcount_logs.txt nettoyÃ© via interface web');
            } else {
                results.subcountLogs = { cleaned: false, reason: 'Fichier non trouvÃ©' };
            }
        }
        
        if (which === 'obs' || which === 'both') {
            const obsLogPath = path.join(__dirname, 'obs_subcount_auto.log');
            if (fs.existsSync(obsLogPath)) {
                const originalSize = fs.statSync(obsLogPath).size;
                const header = `# Log nettoyÃ© manuellement via interface web - ${new Date().toISOString()}\n\n`;
                fs.writeFileSync(obsLogPath, header, 'utf8');
                results.obsLogs = {
                    cleaned: true,
                    originalSizeKB: (originalSize / 1024).toFixed(2),
                    newSizeKB: (header.length / 1024).toFixed(2)
                };
                logEvent('INFO', 'ðŸ§¹ Log obs_subcount_auto.log nettoyÃ© via interface web');
            } else {
                results.obsLogs = { cleaned: false, reason: 'Fichier non trouvÃ©' };
            }
        }
        
        res.json({ success: true, results });
    } catch (error) {
        logEvent('ERROR', 'Erreur nettoyage logs via API', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/update-follows', (req, res) => {
    const { count } = req.body;
    
    if (typeof count !== 'number' || count < 0) {
        return res.status(400).json({ error: 'Nombre de follows invalide' });
    }
    
    currentFollows = count;
    updateFollowFiles(currentFollows);
    broadcastFollowUpdate();
    
    // Sauvegarder automatiquement sur disque
    saveFollowCountToFile(currentFollows);
    
    res.json({
        success: true,
        currentFollows: currentFollows,
        goal: getCurrentFollowGoal(currentFollows)
    });
});

app.post('/api/update-subs', (req, res) => {
    const { count } = req.body;
    
    if (typeof count !== 'number' || count < 0) {
        return res.status(400).json({ error: 'Nombre de subs invalide' });
    }
    
    currentSubs = count;
    updateSubFiles(currentSubs);
    broadcastSubUpdate();
    
    // Sauvegarder automatiquement sur disque
    saveSubCountToFile(currentSubs);
    
    res.json({
        success: true,
        currentSubs: currentSubs,
        goal: getCurrentSubGoal(currentSubs)
    });
});

app.get('/api/current', (req, res) => {
    res.json({
        currentFollows: currentFollows,
        currentSubs: currentSubs,
        followGoal: getCurrentFollowGoal(currentFollows),
        subGoal: getCurrentSubGoal(currentSubs)
    });
});

app.get('/api/current-follows', (req, res) => {
    res.json({
        currentFollows: currentFollows,
        goal: getCurrentFollowGoal(currentFollows)
    });
});

app.get('/api/current-subs', (req, res) => {
    res.json({
        currentSubs: currentSubs,
        goal: getCurrentSubGoal(currentSubs)
    });
});

// Routes pour les overlays OBS (compatibilitÃ©)
app.get('/api/sub_goal', (req, res) => {
    const goal = getCurrentSubGoal(currentSubs);
    res.json({ goal });
});

app.get('/api/follow_goal', (req, res) => {
    const goal = getCurrentFollowGoal(currentFollows);
    res.json({ goal });
});

// ðŸ”„ Endpoint pour gÃ©rer le tampon d'Ã©vÃ©nements
app.post('/api/event-buffer/clear', (req, res) => {
    try {
        const clearedEvents = eventBuffer.length;
        eventBuffer = [];
        stopEventProcessing();
        
        logEvent('INFO', `ðŸ§¹ Tampon d'Ã©vÃ©nements vidÃ©: ${clearedEvents} Ã©vÃ©nements supprimÃ©s`);
        
        res.json({
            success: true,
            message: `Tampon vidÃ©: ${clearedEvents} Ã©vÃ©nements supprimÃ©s`,
            clearedEvents: clearedEvents
        });
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur vidage tampon:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/event-buffer/status', (req, res) => {
    res.json({
        size: eventBuffer.length,
        isProcessing: isProcessingEvents,
        lastProcessTime: lastEventProcessTime > 0 ? new Date(lastEventProcessTime).toISOString() : null,
        events: eventBuffer.map(e => ({
            id: e.id,
            type: e.type,
            timestamp: new Date(e.timestamp).toISOString(),
            data: e.data
        })),
        config: {
            maxEventsPerBatch: MAX_EVENTS_PER_BATCH,
            processingDelay: EVENT_PROCESSING_DELAY
        }
    });
});

// ðŸ§ª Endpoint de test pour simuler un Ã©vÃ©nement EventSub
app.post('/api/test/simulate-follow', (req, res) => {
    try {
        const { user_name = 'TestUser', user_id = '999999999' } = req.body;
        
        logEvent('TEST', `ðŸ§ª Simulation Ã©vÃ©nement follow: ${user_name}`);
        
        // CrÃ©er un Ã©vÃ©nement de test
        const testEvent = {
            user_name: user_name,
            user_id: user_id,
            followed_at: new Date().toISOString(),
            timestamp: Date.now(),
            simulated: true
        };
        
        // Ajouter au tampon
        addEventToBuffer('follow', testEvent);
        
        res.json({
            success: true,
            message: `Ã‰vÃ©nement follow simulÃ© pour ${user_name}`,
            event: testEvent,
            bufferSize: eventBuffer.length
        });
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur simulation follow:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint pour tester le renouvellement de token
app.post('/api/refresh-token', async (req, res) => {
    try {
        const success = await refreshTwitchToken();
        if (success) {
            res.json({ success: true, message: 'Token renouvelÃ© avec succÃ¨s' });
        } else {
            res.status(500).json({ success: false, error: 'Ã‰chec du renouvellement' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint pour dÃ©connecter Twitch (multi-streaming)
app.post('/api/disconnect-twitch', (req, res) => {
    try {
        console.log('ðŸ”Œ DÃ©connexion Twitch demandÃ©e...');
        
        // Sauvegarder l'ancien username pour le log
        const oldUsername = twitchConfig.username || 'Utilisateur inconnu';
        
        // Fermer la connexion EventSub
        if (twitchEventSubWs) {
            twitchEventSubWs.removeAllListeners();
            twitchEventSubWs.close();
            twitchEventSubWs = null;
            sessionId = null;
            console.log('ðŸ”Œ EventSub WebSocket fermÃ©');
        }
        
        // ArrÃªter le polling
        stopFollowPolling();
        
        // ArrÃªter le device code polling si actif
        if (deviceCodePolling) {
            clearInterval(deviceCodePolling);
            deviceCodePolling = null;
            console.log('ðŸ”„ Device Code polling arrÃªtÃ©');
        }
        
        // RÃ©initialiser la configuration Twitch
        twitchConfig.access_token = '';
        twitchConfig.refresh_token = '';
        twitchConfig.user_id = '';
        twitchConfig.username = '';
        twitchConfig.configured = false;
        
        // Sauvegarder la config vide
        saveTwitchConfig();
        
        // Reset du compteur de reconnexion
        reconnectAttempts = 0;
        
        logEvent('INFO', `ðŸ”Œ DÃ©connexion Twitch rÃ©ussie (@${oldUsername})`);
        
        res.json({
            success: true,
            message: `DÃ©connectÃ© de @${oldUsername}`,
            previousUser: oldUsername
        });
        
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur dÃ©connexion Twitch:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint pour recharger la configuration des objectifs
app.post('/api/reload-goals', (req, res) => {
    try {
        console.log('ðŸ”„ Rechargement manuel des objectifs...');
        loadGoals();
        res.json({ 
            success: true, 
            message: 'Configuration rechargÃ©e',
            goalsCount: followGoals.size + subGoals.size 
        });
    } catch (error) {
        console.error('âŒ Erreur rechargement:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint pour forcer la reconnexion EventSub
app.post('/api/reconnect-eventsub', (req, res) => {
    try {
        console.log('ðŸ”„ Reconnexion forcÃ©e EventSub...');
        
        // Reset du compteur de tentatives
        reconnectAttempts = 0;
        
        // Fermer la connexion existante
        if (twitchEventSubWs) {
            twitchEventSubWs.removeAllListeners();
            twitchEventSubWs.close();
            twitchEventSubWs = null;
            sessionId = null;
        }
        
        // Relancer la connexion
        setTimeout(() => {
            connectTwitchEventSub();
        }, 1000);
        
        res.json({ 
            success: true, 
            message: 'Reconnexion EventSub initiÃ©e' 
        });
    } catch (error) {
        console.error('âŒ Erreur reconnexion forcÃ©e:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// GÃ©nÃ©rer la page de test pour diagnostiquer les boutons
function generateTestPage() {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>ðŸ§ª Test des boutons - SubCount Auto</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #0e0e23; color: white; }
        .header { text-align: center; background: linear-gradient(45deg, #9146ff, #00ffc7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 30px; }
        .card { background: #1a1a2e; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #16213e; }
        button { background: #6441a4; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; margin: 5px; font-size: 14px; }
        button:hover { background: #7c2d92; }
        button.success { background: #28a745; }
        button.warning { background: #ffc107; color: #000; }
        .flex { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .log { background: #2a2a2a; padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ðŸ§ª Test des boutons</h1>
        <p>Diagnostic des fonctions JavaScript</p>
    </div>
    
    <div class="card">
        <h2>ðŸ”§ Tests de base</h2>
        <div class="flex">
            <button onclick="testAlert()">ðŸš¨ Test Alert</button>
            <button onclick="testConsole()">ðŸ“ Test Console</button>
            <button onclick="testFetch()">ðŸŒ Test Fetch</button>
        </div>
    </div>
    
    <div class="card">
        <h2>ðŸ‘¥ Tests Follows</h2>
        <div class="flex">
            <button onclick="addFollow()" class="success">+1 Follow</button>
            <button onclick="addFollow(5)" class="success">+5 Follows</button>
            <button onclick="setFollows()" class="warning">DÃ©finir nombre</button>
        </div>
    </div>
    
    <div class="card">
        <h2>â­ Tests Subs</h2>
        <div class="flex">
            <button onclick="addSub()" class="success">+1 Sub</button>
            <button onclick="addSub(5)" class="success">+5 Subs</button>
            <button onclick="setSubs()" class="warning">DÃ©finir nombre</button>
        </div>
    </div>
    
    <div class="card">
        <h2>ðŸ”„ Tests SystÃ¨me</h2>
        <div class="flex">
            <button onclick="syncTwitch()" class="success">ðŸ”„ Synchroniser</button>
            <button onclick="updateDiagnostic()" class="success">ðŸ” Diagnostic</button>
        </div>
    </div>
    
    <div class="card">
        <h2>ðŸ“‹ Journal des Ã©vÃ©nements</h2>
        <div id="log" class="log">Aucun Ã©vÃ©nement...</div>
        <button onclick="clearLog()">ðŸ§¹ Vider le journal</button>
    </div>
    
    <script>
        function log(message) {
            const logDiv = document.getElementById('log');
            const timestamp = new Date().toLocaleTimeString();
            logDiv.innerHTML += \`[\${timestamp}] \${message}<br>\`;
            logDiv.scrollTop = logDiv.scrollHeight;
            console.log(message);
        }
        
        function clearLog() {
            document.getElementById('log').innerHTML = 'Journal vidÃ©...';
        }
        
        function testAlert() {
            log('ðŸš¨ Test Alert appelÃ©');
            alert('Test Alert fonctionne !');
        }
        
        function testConsole() {
            log('ðŸ“ Test Console appelÃ©');
            console.log('Test Console fonctionne !');
        }
        
        async function testFetch() {
            log('ðŸŒ Test Fetch appelÃ©...');
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                log('âœ… Fetch rÃ©ussi: ' + JSON.stringify(data).substring(0, 100) + '...');
            } catch (error) {
                log('âŒ Erreur Fetch: ' + error.message);
            }
        }
        
        function addFollow(amount = 1) {
            log(\`ðŸ‘¥ addFollow(\${amount}) appelÃ©\`);
            fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    log('ðŸ“Š Status rÃ©cupÃ©rÃ©: ' + data.currentFollows + ' follows');
                    const newCount = data.currentFollows + amount;
                    return fetch('/api/update-follows', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ count: newCount })
                    });
                })
                .then(r => r.json())
                .then(data => {
                    log('âœ… Follows mis Ã  jour: ' + data.currentFollows);
                    alert('Follows mis Ã  jour: ' + data.currentFollows);
                })
                .catch(error => {
                    log('âŒ Erreur addFollow: ' + error.message);
                    alert('Erreur: ' + error.message);
                });
        }
        
        function setFollows() {
            log('ðŸ“ setFollows appelÃ©');
            const count = prompt('Nombre de follows :');
            if (count !== null && !isNaN(count)) {
                fetch('/api/update-follows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count: parseInt(count) })
                })
                .then(r => r.json())
                .then(data => {
                    log('âœ… Follows dÃ©finis: ' + data.currentFollows);
                    alert('Follows dÃ©finis: ' + data.currentFollows);
                })
                .catch(error => {
                    log('âŒ Erreur setFollows: ' + error.message);
                });
            } else {
                log('âš ï¸ setFollows annulÃ©');
            }
        }
        
        function addSub(amount = 1) {
            log(\`â­ addSub(\${amount}) appelÃ©\`);
            fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    const newCount = data.currentSubs + amount;
                    return fetch('/api/update-subs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ count: newCount })
                    });
                })
                .then(r => r.json())
                .then(data => {
                    log('âœ… Subs mis Ã  jour: ' + data.currentSubs);
                    alert('Subs mis Ã  jour: ' + data.currentSubs);
                })
                .catch(error => {
                    log('âŒ Erreur addSub: ' + error.message);
                });
        }
        
        function setSubs() {
            log('ðŸ“ setSubs appelÃ©');
            const count = prompt('Nombre de subs :');
            if (count !== null && !isNaN(count)) {
                fetch('/api/update-subs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count: parseInt(count) })
                })
                .then(r => r.json())
                .then(data => {
                    log('âœ… Subs dÃ©finis: ' + data.currentSubs);
                    alert('Subs dÃ©finis: ' + data.currentSubs);
                })
                .catch(error => {
                    log('âŒ Erreur setSubs: ' + error.message);
                });
            } else {
                log('âš ï¸ setSubs annulÃ©');
            }
        }
        
        function syncTwitch() {
            log('ðŸ”„ syncTwitch appelÃ©');
            fetch('/api/sync-twitch')
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        const message = 'Synchronisation rÃ©ussie! Follows: ' + data.currentFollows + ', Subs: ' + data.currentSubs;
                        log('âœ… ' + message);
                        alert('âœ… ' + message);
                    } else {
                        log('âŒ Erreur sync: ' + data.error);
                        alert('âŒ Erreur: ' + data.error);
                    }
                })
                .catch(error => {
                    log('âŒ Erreur syncTwitch: ' + error.message);
                });
        }
        
        function updateDiagnostic() {
            log('ðŸ” updateDiagnostic appelÃ©');
            fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    log('ðŸ“Š Diagnostic: ' + data.currentFollows + ' follows, ' + data.currentSubs + ' subs');
                    alert('Diagnostic: ' + data.currentFollows + ' follows, ' + data.currentSubs + ' subs');
                })
                .catch(error => {
                    log('âŒ Erreur diagnostic: ' + error.message);
                });
        }
        
        // Log de dÃ©marrage
        log('ðŸš€ Page de test chargÃ©e');
    </script>
</body>
</html>`;
}

// ==================================================================
// ðŸŽ¨ SYSTEME DE CONFIGURATION DYNAMIQUE DES OVERLAYS
// ==================================================================

// Charger la configuration des overlays
let overlayConfig = {};
const overlayConfigPath = path.join(ROOT_DIR, 'config', 'overlay_config.json');

function loadOverlayConfig() {
    try {
        if (fs.existsSync(overlayConfigPath)) {
            const data = fs.readFileSync(overlayConfigPath, 'utf8');
            overlayConfig = JSON.parse(data);
            logEvent('INFO', 'âœ… Configuration overlay chargÃ©e', overlayConfig);
        } else {
            // Configuration par dÃ©faut
            overlayConfig = {
                font: { family: 'SEA', size: '64px', weight: 'normal' },
                colors: { text: 'white', shadow: 'rgba(0,0,0,0.5)', stroke: 'black' },
                animation: { duration: '1s', easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
                layout: { paddingLeft: '20px', gap: '0' }
            };
            saveOverlayConfig();
        }
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur chargement config overlay', { error: error.message });
        overlayConfig = {
            font: { family: 'SEA', size: '64px', weight: 'normal' },
            colors: { text: 'white', shadow: 'rgba(0,0,0,0.5)', stroke: 'black' },
            animation: { duration: '1s', easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
            layout: { paddingLeft: '20px', gap: '0' }
        };
    }
}

function saveOverlayConfig() {
    try {
        fs.writeFileSync(overlayConfigPath, JSON.stringify(overlayConfig, null, 2), 'utf8');
        logEvent('INFO', 'âœ… Configuration overlay sauvegardÃ©e');
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur sauvegarde config overlay', { error: error.message });
    }
}

// API REST pour rÃ©cupÃ©rer la configuration
app.get('/api/overlay-config', (req, res) => {
    res.json(overlayConfig);
});

// API REST pour mettre Ã  jour la configuration depuis Python
app.post('/api/overlay-config', express.json(), (req, res) => {
    try {
        const updates = req.body;
        
        // Fusionner les mises Ã  jour avec la config existante
        if (updates.font) overlayConfig.font = { ...overlayConfig.font, ...updates.font };
        if (updates.colors) overlayConfig.colors = { ...overlayConfig.colors, ...updates.colors };
        if (updates.animation) overlayConfig.animation = { ...overlayConfig.animation, ...updates.animation };
        if (updates.layout) overlayConfig.layout = { ...overlayConfig.layout, ...updates.layout };
        
        saveOverlayConfig();
        
        // Notifier tous les overlays connectÃ©s via WebSocket
        broadcastConfigUpdate();
        
        logEvent('INFO', 'âœ… Configuration overlay mise Ã  jour depuis Python', updates);
        res.json({ success: true, config: overlayConfig });
    } catch (error) {
        logEvent('ERROR', 'âŒ Erreur mise Ã  jour config', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

// WebSocket Server pour communication temps rÃ©el avec les overlays
const overlayWss = new WebSocket.Server({ port: 8084 });
const overlayClients = new Set();

overlayWss.on('connection', (ws) => {
    overlayClients.add(ws);
    logEvent('INFO', 'ðŸ"Œ Overlay HTML connectÃ© au WebSocket config');
    
    // Envoyer la configuration actuelle au nouveau client
    ws.send(JSON.stringify({
        type: 'config_update',
        config: overlayConfig
    }));
    
    ws.on('close', () => {
        overlayClients.delete(ws);
        logEvent('INFO', 'ðŸ"Œ Overlay HTML dÃ©connectÃ© du WebSocket config');
    });
    
    ws.on('error', (error) => {
        logEvent('ERROR', 'âŒ Erreur WebSocket overlay', { error: error.message });
        overlayClients.delete(ws);
    });
});

function broadcastConfigUpdate() {
    const message = JSON.stringify({
        type: 'config_update',
        config: overlayConfig
    });
    
    overlayClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    
    logEvent('INFO', `ðŸ"¡ Config diffusÃ©e Ã  ${overlayClients.size} overlays`);
}

// Charger la config au dÃ©marrage
loadOverlayConfig();

// ==================================================================
// DÃ©marrage du serveur
app.listen(PORT, () => {
    console.log('ðŸš€ SubCount Auto Server - Device Code Grant Flow v2.0');
    console.log(`ðŸ“¡ API: http://localhost:${PORT}`);
    console.log(`ðŸ”Œ WebSocket: ws://localhost:8083`);
    console.log(`â° DÃ©marrÃ© le: ${new Date().toLocaleString('fr-FR')}`);
    
    // Charger les configurations
    loadTwitchConfig();
    loadGoals();
    
    // Charger le compteur sauvegardÃ© au dÃ©marrage (avant l'API Twitch)
    const savedFollowCount = loadFollowCountFromFile();
    if (savedFollowCount > 0) {
        currentFollows = savedFollowCount;
        console.log(`ðŸ“‚ Compteur follows initial restaurÃ©: ${savedFollowCount} follows`);
    }
    
    const savedSubCount = loadSubCountFromFile();
    if (savedSubCount > 0) {
        currentSubs = savedSubCount;
        console.log(`ðŸ“‚ Compteur subs initial restaurÃ©: ${savedSubCount} subs`);
    }
    
    // Initialiser la surveillance du fichier de configuration
    setupConfigWatcher();
    
    // Initialiser les fichiers avec le compteur actuel
    updateFiles(currentFollows);
    
    // ðŸ”„ Initialiser le systÃ¨me de tampon d'Ã©vÃ©nements
    eventBuffer = [];
    isProcessingEvents = false;
    logEvent('INFO', 'ðŸ”„ SystÃ¨me de tampon d\'Ã©vÃ©nements initialisÃ©');
    
    console.log('âœ… Serveur prÃªt !');
    
    if (twitchConfig.configured) {
        console.log(`ðŸŽ® ConnectÃ© Ã  Twitch: @${twitchConfig.username}`);
        
        // DÃ©marrer EventSub automatiquement avec un dÃ©lai
        console.log('ðŸš€ DÃ©marrage EventSub WebSocket dans 3 secondes...');
        setTimeout(async () => {
            try {
                // VÃ©rifier que nous avons bien tous les tokens avant de synchroniser
                if (twitchConfig.access_token && twitchConfig.user_id) {
                    console.log('ðŸ”„ Synchronisation avec tokens existants...');
                    await syncTwitchFollows('Synchronisation au dÃ©marrage');
                    await syncTwitchSubs('Synchronisation au dÃ©marrage');
                    console.log('âœ… Synchronisation initiale complÃ¨te (follows + subs) rÃ©ussie');
                } else {
                    console.log('âš ï¸ Tokens manquants, synchronisation ignorÃ©e au dÃ©marrage');
                }
            } catch (error) {
                console.warn('âš ï¸ Synchronisation initiale Ã©chouÃ©e, utilisation des donnÃ©es sauvegardÃ©es');
            }
            
            // DÃ©marrer EventSub seulement si on a les tokens
            if (twitchConfig.access_token && twitchConfig.user_id) {
                connectTwitchEventSub();
            } else {
                console.log('âš ï¸ Configuration Twitch requise pour EventSub');
            }
        }, 3000);
    } else {
        console.log('âš™ï¸ Configuration Twitch: http://localhost:8082/config');
        console.log('ðŸ” Device Code Grant Flow : Plus sÃ©curisÃ©, application publique');
    }
    
    // Log de diagnostic
    console.log(`ðŸ”§ Ã‰tat initial: ${currentFollows} follows (${followGoals.size} objectifs), ${currentSubs} subs (${subGoals.size} objectifs)`);
    isInitializing = false;
});

// Gestion de l'arrÃªt propre
process.on('SIGINT', () => {
    console.log('\nðŸ›‘ ArrÃªt du serveur...');
    if (twitchEventSubWs) {
        twitchEventSubWs.close();
    }
    if (configWatcher) {
        configWatcher.close();
        console.log('ðŸ‘ï¸ Surveillance fichier follows arrÃªtÃ©e');
    }
    if (subConfigWatcher) {
        subConfigWatcher.close();
        console.log('ðŸ‘ï¸ Surveillance fichier subs arrÃªtÃ©e');
    }
    if (deviceCodePolling) {
        clearInterval(deviceCodePolling);
        console.log('ðŸ”„ Polling Device Code arrÃªtÃ©');
    }
    // ðŸ”„ ArrÃªter le traitement des Ã©vÃ©nements
    stopEventProcessing();
    if (eventBuffer.length > 0) {
        console.log(`âš ï¸ ${eventBuffer.length} Ã©vÃ©nements en attente perdus lors de l'arrÃªt`);
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nðŸ›‘ ArrÃªt du serveur...');
    if (twitchEventSubWs) {
        twitchEventSubWs.close();
    }
    if (configWatcher) {
        configWatcher.close();
        console.log('ðŸ‘ï¸ Surveillance fichier follows arrÃªtÃ©e');
    }
    if (subConfigWatcher) {
        subConfigWatcher.close();
        console.log('ðŸ‘ï¸ Surveillance fichier subs arrÃªtÃ©e');
    }
    if (deviceCodePolling) {
        clearInterval(deviceCodePolling);
        console.log('ðŸ”„ Polling Device Code arrÃªtÃ©');
    }
    // ðŸ”„ ArrÃªter le traitement des Ã©vÃ©nements
    stopEventProcessing();
    if (eventBuffer.length > 0) {
        console.log(`âš ï¸ ${eventBuffer.length} Ã©vÃ©nements en attente perdus lors de l'arrÃªt`);
    }
    process.exit(0);
});

// ðŸ›¡ï¸ Gestion des erreurs non gÃ©rÃ©es (protection contre les crashes)
process.on('uncaughtException', (error) => {
    console.error('âŒ ERREUR NON GÃ‰RÃ‰E - Le serveur continue:', error.message);
    console.error('ðŸ“ Stack trace:', error.stack);
    
    // Logger l'erreur
    logEvent('CRITICAL', 'âŒ Erreur non gÃ©rÃ©e:', {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
    });
    
    // Ne pas arrÃªter le serveur, juste loguer l'erreur
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('âŒ PROMESSE REJETÃ‰E NON GÃ‰RÃ‰E - Le serveur continue:', reason);
    
    // Logger l'erreur
    logEvent('CRITICAL', 'âŒ Promesse rejetÃ©e non gÃ©rÃ©e:', {
        reason: reason?.message || reason,
        promise: promise.toString(),
        timestamp: Date.now()
    });
    
    // Ne pas arrÃªter le serveur, juste loguer l'erreur
});



