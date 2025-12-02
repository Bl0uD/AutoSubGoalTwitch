/**
 * 🔌 SERVICE EVENTSUB TWITCH
 * Gère la connexion WebSocket EventSub et les handlers de messages
 * 
 * Pattern: initContext(context)
 */

const WebSocket = require('ws');
const { logEvent, VALID_EVENT_TYPES } = require('../utils');

let ctx = null;

// Variables d'état EventSub
let twitchEventSubWs = null;
let sessionId = null;
let keepaliveTimeout = null;
let subscriptionTimeout = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const reconnectDelay = 1000;

/**
 * Initialise le service avec le contexte de l'application
 * @param {Object} context - Contexte contenant les dépendances
 */
function initContext(context) {
    ctx = context;
    logEvent('INFO', '✅ Service EventSub initialisé');
}

/**
 * Reset du timer keepalive selon la documentation Twitch
 * @param {number} timeoutSeconds - Timeout en secondes (défaut: 10)
 */
function resetKeepaliveTimer(timeoutSeconds = 10) {
    ctx.timerRegistry.clearTimeout('keepalive');
    
    keepaliveTimeout = ctx.timerRegistry.setTimeout('keepalive', () => {
        logEvent('WARN', `⏰ Keepalive timeout (${timeoutSeconds}s) - reconnexion nécessaire`);
        
        if (twitchEventSubWs) {
            twitchEventSubWs.close();
        }
        
        ctx.timerRegistry.setTimeout('reconnectAfterKeepalive', connectTwitchEventSub, 2000);
    }, timeoutSeconds * 1000);
}

/**
 * Gestion de la reconnexion avec URL fournie
 * @param {string} reconnectUrl - URL de reconnexion fournie par Twitch
 */
async function handleReconnect(reconnectUrl) {
    try {
        logEvent('INFO', '📄 Début processus de reconnexion avec URL fournie');
        
        const newWs = new WebSocket(reconnectUrl);
        
        newWs.on('open', () => {
            logEvent('INFO', '✅ Nouvelle connexion EventSub établie');
        });
        
        newWs.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                if (message.metadata?.message_type === 'session_welcome') {
                    logEvent('INFO', '🎉 Welcome reçu sur nouvelle connexion - fermeture ancienne connexion');
                    
                    if (twitchEventSubWs) {
                        twitchEventSubWs.removeAllListeners();
                        twitchEventSubWs.close();
                    }
                    
                    twitchEventSubWs = newWs;
                    await handleEventSubMessage(message);
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
            ctx.timerRegistry.setTimeout('reconnectOnError', connectTwitchEventSub, 5000);
        });
        
    } catch (error) {
        logEvent('ERROR', 'Erreur gestion reconnexion:', error.message);
        ctx.timerRegistry.setTimeout('reconnectOnError', connectTwitchEventSub, 5000);
    }
}

/**
 * Configure les handlers WebSocket
 * @param {WebSocket} ws - Instance WebSocket
 */
function setupWebSocketHandlers(ws) {
    ws.on('close', (code, reason) => {
        logEvent('INFO', `📌 WebSocket EventSub fermé: ${code} - ${reason || 'Raison inconnue'}`);
        
        if (keepaliveTimeout) clearTimeout(keepaliveTimeout);
        if (subscriptionTimeout) clearTimeout(subscriptionTimeout);
        
        if (code >= 4000 && code <= 4007) {
            logEvent('ERROR', `❌ Erreur WebSocket critique (${code}) - pas de reconnexion automatique`);
            return;
        }
        
        if (ctx.getTwitchConfig().configured && reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 60000);
            reconnectAttempts++;
            
            logEvent('INFO', `📄 Reconnexion programmée dans ${delay/1000}s (tentative ${reconnectAttempts}/${maxReconnectAttempts})`);
            
            ctx.timerRegistry.setTimeout('reconnectScheduled', () => {
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

/**
 * Connexion WebSocket EventSub Twitch
 */
async function connectTwitchEventSub() {
    if (!ctx.getTwitchConfig().configured) {
        console.log('⚠️ Configuration Twitch requise pour EventSub');
        return;
    }

    console.log(`📌 Connexion WebSocket EventSub Twitch... (Tentative ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
    
    try {
        if (twitchEventSubWs) {
            twitchEventSubWs.removeAllListeners();
            twitchEventSubWs.close();
            twitchEventSubWs = null;
            sessionId = null;
        }
        
        if (keepaliveTimeout) clearTimeout(keepaliveTimeout);
        if (subscriptionTimeout) clearTimeout(subscriptionTimeout);
        
        twitchEventSubWs = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
        
        twitchEventSubWs.on('open', () => {
            logEvent('INFO', '✅ WebSocket EventSub connecté !');
            reconnectAttempts = 0;
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
                
                try {
                    ctx.eventQueue.add({
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
        
        setupWebSocketHandlers(twitchEventSubWs);
        
    } catch (error) {
        console.error('❌ Erreur connexion EventSub:', error.message);
        
        if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 60000);
            reconnectAttempts++;
            
            ctx.timerRegistry.setTimeout('reconnectOnClose', () => {
                connectTwitchEventSub();
            }, delay);
        }
    }
}

/**
 * Gérer les messages EventSub
 * @param {Object} message - Message EventSub parsé
 */
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
                const keepaliveTimeoutSeconds = message.payload?.session?.keepalive_timeout_seconds || 10;
                
                if (sessionId) {
                    logEvent('INFO', `🎉 Session EventSub établie: ${sessionId}`);
                    logEvent('INFO', `⏰ Keepalive timeout: ${keepaliveTimeoutSeconds}s`);
                    
                    // Mettre à jour la variable externe si nécessaire
                    if (ctx.setSessionId) {
                        ctx.setSessionId(sessionId);
                    }
                    
                    resetKeepaliveTimer(keepaliveTimeoutSeconds);
                    
                    ctx.timerRegistry.clearTimeout('subscriptionSetup');
                    
                    subscriptionTimeout = ctx.timerRegistry.setTimeout('subscriptionSetup', async () => {
                        try {
                            await ctx.subscribeToChannelFollow();
                            await ctx.subscribeToChannelSubscription();
                            await ctx.subscribeToChannelSubscriptionGift();
                            await ctx.subscribeToChannelSubscriptionEnd();
                            logEvent('INFO', '✅ Abonnements EventSub (Follow, Sub, Gift, End) créés dans les temps');
                            
                            ctx.startFollowPolling(10);
                            
                        } catch (error) {
                            logEvent('ERROR', '❌ Échec création abonnements EventSub:', error.message);
                            logEvent('INFO', '📄 Basculement sur le système de polling...');
                            ctx.startFollowPolling(10);
                        }
                    }, 1000);
                    
                } else {
                    console.error('❌ Session ID manquant dans le message welcome');
                }
                break;
                
            case 'session_keepalive':
                logEvent('INFO', '📗 Keepalive reçu');
                resetKeepaliveTimer();
                break;
                
            case 'notification':
                resetKeepaliveTimer();
                await ctx.handleEventSubNotification(message);
                break;
                
            case 'session_reconnect':
                logEvent('INFO', '📄 Reconnexion EventSub requise');
                const reconnectUrl = message.payload?.session?.reconnect_url;
                
                if (reconnectUrl) {
                    logEvent('INFO', `📗 URL de reconnexion fournie: ${reconnectUrl}`);
                    await handleReconnect(reconnectUrl);
                } else {
                    logEvent('WARN', '⚠️ Reconnexion demandée sans URL, utilisation URL standard');
                    ctx.timerRegistry.setTimeout('reconnectNoUrl', connectTwitchEventSub, 1000);
                }
                break;
                
            case 'revocation':
                const subscriptionType = message.metadata?.subscription_type;
                const revocationReason = message.payload?.subscription?.status;
                
                logEvent('WARN', `❌ Abonnement révoqué: ${subscriptionType}, raison: ${revocationReason}`);
                
                switch (revocationReason) {
                    case 'authorization_revoked':
                        logEvent('ERROR', '🔐 Autorisation révoquée - réauthentification nécessaire');
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

/**
 * Récupère le session ID actuel
 * @returns {string|null}
 */
function getSessionId() {
    return sessionId;
}

/**
 * Récupère l'instance WebSocket
 * @returns {WebSocket|null}
 */
function getWebSocket() {
    return twitchEventSubWs;
}

/**
 * Ferme la connexion EventSub
 */
function disconnect() {
    if (twitchEventSubWs) {
        twitchEventSubWs.removeAllListeners();
        twitchEventSubWs.close();
        twitchEventSubWs = null;
        sessionId = null;
    }
    
    if (keepaliveTimeout) clearTimeout(keepaliveTimeout);
    if (subscriptionTimeout) clearTimeout(subscriptionTimeout);
    
    logEvent('INFO', '📌 Déconnexion EventSub');
}

module.exports = {
    initContext,
    connectTwitchEventSub,
    handleEventSubMessage,
    handleReconnect,
    setupWebSocketHandlers,
    resetKeepaliveTimer,
    getSessionId,
    getWebSocket,
    disconnect
};
