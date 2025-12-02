/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SERVICE TWITCH - Authentification et API
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Gère toutes les interactions avec l'API Twitch:
 * - Device Code Grant Flow (authentification)
 * - Renouvellement des tokens
 * - Récupération des follows et subs
 * - Gestion des privilèges modérateur
 */

const fetch = require('node-fetch');
const { logEvent } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXTE (injecté depuis server.js)
// ═══════════════════════════════════════════════════════════════════════════════
let ctx = null;

/**
 * Initialise le contexte du service Twitch
 * @param {Object} context - Contexte de l'application
 */
function initContext(context) {
    ctx = context;
    logEvent('INFO', '✅ Service Twitch initialisé');
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE CODE GRANT FLOW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Réinitialise le Device Code Grant Flow
 */
function resetDeviceCodeFlow() {
    try {
        ctx.timerRegistry.clearInterval('deviceCodePolling');
        
        ctx.deviceCodeData = {
            device_code: '',
            user_code: '',
            verification_uri: '',
            expires_in: 0,
            interval: 5,
            expires_at: 0
        };
        ctx.twitchConfig.access_token = '';
        ctx.twitchConfig.refresh_token = '';
        ctx.twitchConfig.user_id = '';
        ctx.twitchConfig.username = '';
        ctx.twitchConfig.configured = false;
        
        logEvent('INFO', '📄 Device Code Grant Flow réinitialisé');
    } catch (error) {
        logEvent('ERROR', '❌ Erreur reset Device Code Flow:', error.message);
    }
}

/**
 * Initie le Device Code Grant Flow (Étape 1)
 * @returns {Promise<Object>} Données du Device Code
 */
async function initiateDeviceCodeFlow() {
    try {
        console.log('🚀 Démarrage Device Code Grant Flow...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch('https://id.twitch.tv/oauth2/device', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: ctx.twitchConfig.client_id,
                scopes: 'moderator:read:followers channel:read:subscriptions channel:manage:moderators moderation:read'
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
        
        if (!data.device_code || !data.user_code || !data.verification_uri) {
            logEvent('ERROR', '❌ Réponse incomplète du serveur Twitch', data);
            throw new Error('Réponse incomplète du serveur Twitch');
        }
        
        // Stocker les données du Device Code
        ctx.deviceCodeData = {
            device_code: data.device_code,
            user_code: data.user_code,
            verification_uri: data.verification_uri,
            expires_in: data.expires_in || 1800,
            interval: data.interval || 5,
            expires_at: Date.now() + ((data.expires_in || 1800) * 1000)
        };
        
        logEvent('INFO', `✅ Device Code généré: ${ctx.deviceCodeData.user_code}`);
        logEvent('INFO', `📗 URL de vérification: ${ctx.deviceCodeData.verification_uri}`);
        logEvent('INFO', `⏰ Expire dans: ${ctx.deviceCodeData.expires_in} secondes`);
        
        // Démarrer le polling
        startDeviceCodePolling();
        
        return ctx.deviceCodeData;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            logEvent('ERROR', '❌ Timeout Device Code Flow (15s)');
            throw new Error('Timeout de connexion au serveur Twitch - Vérifiez votre connexion internet');
        }
        
        logEvent('ERROR', '❌ Erreur Device Code Flow:', error.message);
        throw error;
    }
}

/**
 * Démarre le polling pour obtenir les tokens (Étape 2)
 */
async function startDeviceCodePolling() {
    if (ctx.deviceCodePolling) {
        clearInterval(ctx.deviceCodePolling);
    }
    
    logEvent('INFO', `📄 Démarrage polling toutes les ${ctx.deviceCodeData.interval} secondes...`);
    
    ctx.deviceCodePolling = ctx.timerRegistry.setInterval('deviceCodePolling', async () => {
        try {
            // Vérifier expiration
            if (Date.now() > ctx.deviceCodeData.expires_at) {
                logEvent('WARN', '⏰ Device Code expiré');
                ctx.timerRegistry.clearInterval('deviceCodePolling');
                ctx.deviceCodePolling = null;
                return;
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            
            const response = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: ctx.twitchConfig.client_id,
                    device_code: ctx.deviceCodeData.device_code,
                    grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const tokenData = await response.json();
            
            if (response.ok) {
                logEvent('INFO', '🎉 Authentification Device Code Grant réussie !');
                
                if (!tokenData.access_token) {
                    throw new Error('Access token manquant dans la réponse');
                }
                
                ctx.twitchConfig.access_token = tokenData.access_token;
                ctx.twitchConfig.refresh_token = tokenData.refresh_token;
                
                if (tokenData.scope && Array.isArray(tokenData.scope)) {
                    logEvent('INFO', `🔐 Scopes accordés: ${tokenData.scope.join(', ')}`);
                }
                
                ctx.timerRegistry.clearInterval('deviceCodePolling');
                ctx.deviceCodePolling = null;
                
                // Obtenir les infos utilisateur
                await getUserInfo();
                
                // Sauvegarder la configuration
                ctx.saveTwitchConfig();
                
                // Démarrer EventSub avec délai
                ctx.timerRegistry.setTimeout('startEventSubAfterAuth', () => {
                    ctx.connectTwitchEventSub();
                }, 2000);
                
            } else {
                // Gérer les différents types d'erreurs
                switch (tokenData.error) {
                    case 'authorization_pending':
                        logEvent('INFO', '⏳ En attente de l\'autorisation utilisateur...');
                        break;
                    case 'slow_down':
                        logEvent('WARN', '🌙 Ralentissement du polling demandé par Twitch');
                        ctx.deviceCodeData.interval += 5;
                        ctx.timerRegistry.clearInterval('deviceCodePolling');
                        ctx.timerRegistry.setTimeout('restartDeviceCodePolling', startDeviceCodePolling, ctx.deviceCodeData.interval * 1000);
                        break;
                    case 'access_denied':
                        logEvent('WARN', '❌ Accès refusé par l\'utilisateur');
                        ctx.timerRegistry.clearInterval('deviceCodePolling');
                        ctx.deviceCodePolling = null;
                        break;
                    case 'expired_token':
                        logEvent('WARN', '⏰ Device Code expiré');
                        ctx.timerRegistry.clearInterval('deviceCodePolling');
                        ctx.deviceCodePolling = null;
                        break;
                    default:
                        logEvent('WARN', `⚠️ Erreur polling inconnue: ${tokenData.error} - ${tokenData.error_description || ''}`);
                }
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                logEvent('WARN', '⏰ Timeout polling tokens (20s) - polling continue...');
                return;
            }
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                logEvent('WARN', '🌙 Erreur réseau temporaire - polling continue...');
                return;
            }
            
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                logEvent('WARN', `🌙 Erreur connexion (${error.code}) - polling continue...`);
                return;
            }
            
            logEvent('ERROR', '❌ Erreur polling tokens:', error.message);
            
            if (ctx.deviceCodeData.interval < 10) {
                ctx.deviceCodeData.interval = Math.min(ctx.deviceCodeData.interval + 2, 10);
                logEvent('INFO', `📄 Augmentation intervalle polling à ${ctx.deviceCodeData.interval}s`);
            }
        }
    }, ctx.deviceCodeData.interval * 1000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GESTION DES TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renouvelle le token d'accès Twitch
 * @returns {Promise<boolean>} true si succès
 */
async function refreshTwitchToken() {
    try {
        console.log('📄 Renouvellement du token Twitch...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: ctx.twitchConfig.client_id,
                grant_type: 'refresh_token',
                refresh_token: ctx.twitchConfig.refresh_token
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Erreur renouvellement token: ${response.status} - ${errorData}`);
        }
        
        const tokenData = await response.json();
        
        ctx.twitchConfig.access_token = tokenData.access_token;
        if (tokenData.refresh_token) {
            ctx.twitchConfig.refresh_token = tokenData.refresh_token;
        }
        
        ctx.saveTwitchConfig();
        
        console.log('✅ Token Twitch renouvelé avec succès');
        return true;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            logEvent('ERROR', '❌ Timeout renouvellement token (10s)');
            return false;
        }
        
        console.error('❌ Erreur renouvellement token:', error.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFORMATIONS UTILISATEUR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Récupère les informations de l'utilisateur connecté
 */
async function getUserInfo() {
    try {
        console.log('📄 Récupération des informations utilisateur...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${ctx.twitchConfig.access_token}`,
                'Client-Id': ctx.twitchConfig.client_id
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error('Erreur récupération utilisateur');
        }
        
        const userData = await response.json();
        const user = userData.data[0];
        
        ctx.twitchConfig.user_id = user.id;
        ctx.twitchConfig.username = user.login;
        ctx.twitchConfig.configured = true;
        
        console.log(`👤 Connecté en tant que: @${ctx.twitchConfig.username}`);
        
        ctx.saveTwitchConfig();
        
        // Vérifier les privilèges modérateur
        const hasModeratorPrivileges = await ensureModeratorPrivileges();
        
        if (!hasModeratorPrivileges) {
            logEvent('INFO', '📄 Privilèges de modérateur non disponibles - démarrage du polling en mode fallback');
            ctx.startFollowPolling(10);
        }
        
        // Récupérer le nombre de follows actuel
        try {
            console.log('📊 Récupération du nombre de follows initial...');
            const result = await getTwitchFollowCount();
            
            if (result.success) {
                const oldCount = ctx.currentFollows;
                ctx.currentFollows = result.data;
                ctx.updateFollowFiles(ctx.currentFollows);
                ctx.broadcastFollowUpdate();
                
                console.log(`📊 Follows récupérés au démarrage: ${oldCount} → ${result.data}`);
                ctx.saveFollowCountToFile(ctx.currentFollows);
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.warn('⚠️ Impossible de récupérer les follows au démarrage:', error.message);
            const savedCount = ctx.loadFollowCountFromFile();
            if (savedCount > 0) {
                ctx.currentFollows = savedCount;
                ctx.updateFollowFiles(ctx.currentFollows);
                ctx.broadcastFollowUpdate();
                console.log(`📂 Nombre de follows restauré depuis le fichier: ${savedCount}`);
            }
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            logEvent('ERROR', '❌ Timeout récupération infos utilisateur (10s)');
            throw new Error('Timeout de connexion à l\'API Twitch');
        }
        
        console.error('❌ Erreur infos utilisateur:', error.message);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVILÈGES MODÉRATEUR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie et accorde les privilèges de modérateur si nécessaire
 * @returns {Promise<boolean>}
 */
async function ensureModeratorPrivileges() {
    try {
        logEvent('INFO', '🔐 Vérification des privilèges de modérateur...');
        
        const isModerator = await checkIfModerator();
        
        if (isModerator) {
            logEvent('INFO', '✅ Utilisateur déjà modérateur de son propre canal');
            return true;
        }
        
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

/**
 * Vérifie si l'utilisateur est modérateur de son propre canal
 * @returns {Promise<boolean>}
 */
async function checkIfModerator() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${ctx.twitchConfig.user_id}&user_id=${ctx.twitchConfig.user_id}`, {
            headers: {
                'Authorization': `Bearer ${ctx.twitchConfig.access_token}`,
                'Client-Id': ctx.twitchConfig.client_id
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

/**
 * Tente d'accorder les privilèges de modérateur à soi-même
 * @returns {Promise<boolean>}
 */
async function grantSelfModerator() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch('https://api.twitch.tv/helix/moderation/moderators', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ctx.twitchConfig.access_token}`,
                'Client-Id': ctx.twitchConfig.client_id,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                broadcaster_id: ctx.twitchConfig.user_id,
                user_id: ctx.twitchConfig.user_id
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

/**
 * Vérifie si l'utilisateur peut s'auto-attribuer les privilèges modérateur
 * @returns {Promise<boolean>}
 */
async function canGrantSelfModerator() {
    try {
        if (!ctx.twitchConfig.scope || !ctx.twitchConfig.scope.includes('channel:manage:moderators')) {
            return false;
        }
        return true;
    } catch (error) {
        logEvent('WARN', '⚠️ Erreur vérification capacité auto-attribution modérateur:', error.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API TWITCH - FOLLOWS ET SUBS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Récupère le nombre de follows depuis l'API Twitch (Result Pattern)
 * @returns {Promise<{success: boolean, data?: number, error?: string, code?: string}>}
 */
async function getTwitchFollowCount() {
    if (!ctx.twitchConfig.access_token || !ctx.twitchConfig.user_id) {
        const message = `Configuration Twitch incomplète - Token: ${!!ctx.twitchConfig.access_token}, UserID: ${!!ctx.twitchConfig.user_id}`;
        logEvent('ERROR', message);
        return {
            success: false,
            error: message,
            code: 'NOT_CONFIGURED'
        };
    }
    
    try {
        const apiUrl = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${ctx.twitchConfig.user_id}`;
        logEvent('INFO', `🔐 Appel API Twitch Follows: ${apiUrl}`);
        logEvent('INFO', `🔑 User ID: ${ctx.twitchConfig.user_id}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${ctx.twitchConfig.access_token}`,
                'Client-Id': ctx.twitchConfig.client_id
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        logEvent('INFO', `📡 Réponse API Twitch: Status ${response.status}`);
        
        if (!response.ok) {
            if (response.status === 401) {
                logEvent('WARN', '🔐 Token expiré, tentative de renouvellement...');
                const refreshResult = await refreshTwitchToken();
                
                if (refreshResult) {
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
        
        if (data.data && data.data.length > 0) {
            logEvent('INFO', `👥 Détails: ${data.data.length} follows dans la réponse`);
        }
        
        return {
            success: true,
            data: followCount
        };
        
    } catch (error) {
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

/**
 * Récupère le nombre de subs depuis l'API Twitch
 * @returns {Promise<number>}
 */
async function getTwitchSubCount() {
    if (!ctx.twitchConfig.access_token || !ctx.twitchConfig.user_id) {
        const error = `Configuration Twitch incomplète - Token: ${!!ctx.twitchConfig.access_token}, UserID: ${!!ctx.twitchConfig.user_id}`;
        logEvent('ERROR', error);
        throw new Error(error);
    }
    
    try {
        const apiUrl = `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${ctx.twitchConfig.user_id}`;
        logEvent('INFO', `🔐 Appel API Twitch Subs: ${apiUrl}`);
        logEvent('INFO', `🔑 User ID: ${ctx.twitchConfig.user_id}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${ctx.twitchConfig.access_token}`,
                'Client-Id': ctx.twitchConfig.client_id
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        logEvent('INFO', `📡 Réponse API Twitch Subs: Status ${response.status}`);
        
        if (!response.ok) {
            if (response.status === 401) {
                logEvent('WARN', '🔐 Token expiré, tentative de renouvellement...');
                const refreshed = await refreshTwitchToken();
                if (refreshed) {
                    logEvent('INFO', '✅ Token renouvelé, nouvelle tentative...');
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
        
        if (data.data && data.data.length > 0) {
            logEvent('INFO', `👥 Détails: ${data.data.length} subs dans la réponse`);
        }
        
        return subCount;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            logEvent('ERROR', '❌ Timeout API Twitch Subs (15s) - connexion lente');
            throw new Error('Timeout de connexion à l\'API Twitch pour les subs');
        }
        
        logEvent('ERROR', '❌ Erreur récupération subs Twitch:', { error: error.message });
        throw error;
    }
}

/**
 * Synchronise le nombre de follows depuis Twitch (Result Pattern)
 * @param {string} reason - Raison de la synchronisation
 * @returns {Promise<{success: boolean, data?: number, diff?: number, error?: string}>}
 */
async function syncTwitchFollows(reason = 'Synchronisation') {
    try {
        logEvent('INFO', `📄 ${reason} - Récupération du nombre de follows...`);
        
        const result = await getTwitchFollowCount();
        
        if (!result.success) {
            return {
                success: false,
                error: result.error,
                data: ctx.currentFollows
            };
        }
        
        const newCount = result.data;
        const oldCount = ctx.currentFollows;
        const diff = newCount - oldCount;
        
        if (diff !== 0) {
            ctx.currentFollows = newCount;
            ctx.updateFollowFiles(newCount);
            ctx.broadcastFollowUpdate();
            ctx.saveFollowCountToFile(newCount);
            
            logEvent('SYNC', `📊 ${reason}: ${oldCount} → ${newCount} (${diff >= 0 ? '+' : ''}${diff})`);
        } else {
            logEvent('SYNC', `📊 ${reason}: ${oldCount} → ${newCount} (=)`);
        }
        
        return {
            success: true,
            data: newCount,
            diff: diff
        };
        
    } catch (error) {
        logEvent('ERROR', `❌ Erreur sync follows: ${error.message}`);
        return {
            success: false,
            error: error.message,
            data: ctx.currentFollows
        };
    }
}

/**
 * Synchronise le nombre de subs depuis Twitch (Result Pattern)
 * @param {string} reason - Raison de la synchronisation
 * @returns {Promise<{success: boolean, data?: number, diff?: number, error?: string}>}
 */
async function syncTwitchSubs(reason = 'Synchronisation') {
    try {
        logEvent('INFO', `📄 ${reason} - Récupération du nombre de subs...`);
        
        const newCount = await getTwitchSubCount();
        const oldCount = ctx.currentSubs;
        const diff = newCount - oldCount;
        
        if (diff !== 0) {
            ctx.currentSubs = newCount;
            ctx.updateSubFiles(newCount);
            ctx.broadcastSubUpdate();
            ctx.saveSubCountToFile(newCount);
            
            logEvent('SYNC', `📊 ${reason} subs: ${oldCount} → ${newCount} (${diff >= 0 ? '+' : ''}${diff})`);
        } else {
            logEvent('SYNC', `📊 ${reason} subs: ${oldCount} → ${newCount} (=)`);
        }
        
        return {
            success: true,
            data: newCount,
            diff: diff
        };
        
    } catch (error) {
        logEvent('ERROR', `❌ Erreur sync subs: ${error.message}`);
        return {
            success: false,
            error: error.message,
            data: ctx.currentSubs
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
    // Initialisation
    initContext,
    
    // Device Code Flow
    resetDeviceCodeFlow,
    initiateDeviceCodeFlow,
    startDeviceCodePolling,
    
    // Token management
    refreshTwitchToken,
    
    // User info
    getUserInfo,
    
    // Moderator privileges
    ensureModeratorPrivileges,
    checkIfModerator,
    grantSelfModerator,
    canGrantSelfModerator,
    
    // API calls
    getTwitchFollowCount,
    getTwitchSubCount,
    syncTwitchFollows,
    syncTwitchSubs
};
