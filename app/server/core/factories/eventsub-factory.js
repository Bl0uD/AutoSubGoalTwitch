/**
 * @file eventsub-factory.js
 * @description Factory pour le service EventSub Twitch
 * @version 3.1.0
 * 
 * Pattern: Factory avec injection de dépendances
 * Gère la connexion WebSocket EventSub et les événements temps réel
 */

const WebSocket = require('ws');

/**
 * Crée le service EventSub
 * @param {Object} deps - Dépendances injectées
 * @param {StateManager} deps.stateManager
 * @param {Object} deps.twitchApiService
 * @param {Object} deps.batchingService
 * @param {TimerRegistry} deps.timerRegistry
 * @param {Object} deps.logger
 * @param {Object} deps.constants
 * @returns {Object} API du service
 */
function createEventSubService({ stateManager, twitchApiService, batchingService, timerRegistry, logger, constants }) {
    const { logEvent } = logger;
    const { LIMITS, TWITCH_CLIENT_ID } = constants;
    
    const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';
    const MAX_RECONNECT_ATTEMPTS = LIMITS.MAX_RECONNECT_ATTEMPTS || 5;
    const RECONNECT_DELAY = LIMITS.RECONNECT_DELAY || 5000;
    
    let ws = null;
    let keepaliveTimeout = null;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONNEXION WEBSOCKET
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Connecte au WebSocket EventSub
     * @returns {Promise<boolean>}
     */
    async function connect() {
        if (!twitchApiService.isAuthenticated()) {
            logEvent('WARN', '⚠️ Non authentifié, impossible de se connecter à EventSub');
            return false;
        }
        
        // Fermer connexion existante
        if (ws) {
            disconnect();
        }
        
        return new Promise((resolve) => {
            try {
                ws = new WebSocket(EVENTSUB_URL);
                
                ws.on('open', () => {
                    logEvent('INFO', '🔌 Connexion EventSub établie');
                    stateManager.resetReconnectAttempts();
                });
                
                ws.on('message', async (data) => {
                    await handleMessage(JSON.parse(data.toString()));
                });
                
                ws.on('close', (code, reason) => {
                    logEvent('WARN', `⚠️ EventSub fermé (${code}): ${reason}`);
                    stateManager.setEventSubConnected(false, null, null);
                    clearKeepaliveTimeout();
                    
                    // Tentative de reconnexion
                    scheduleReconnect();
                });
                
                ws.on('error', (error) => {
                    logEvent('ERROR', '❌ Erreur EventSub', { error: error.message });
                });
                
                // Timeout de connexion
                setTimeout(() => {
                    if (ws && ws.readyState === WebSocket.CONNECTING) {
                        ws.close();
                        resolve(false);
                    }
                }, 10000);
                
                resolve(true);
                
            } catch (error) {
                logEvent('ERROR', '❌ Erreur création WebSocket', { error: error.message });
                resolve(false);
            }
        });
    }
    
    /**
     * Déconnecte du WebSocket EventSub
     */
    function disconnect() {
        clearKeepaliveTimeout();
        
        if (ws) {
            ws.close();
            ws = null;
        }
        
        stateManager.setEventSubConnected(false, null, null);
        logEvent('INFO', '🔌 EventSub déconnecté');
    }
    
    /**
     * Programme une tentative de reconnexion
     */
    function scheduleReconnect() {
        const attempts = stateManager.incrementReconnectAttempts();
        
        if (attempts > MAX_RECONNECT_ATTEMPTS) {
            logEvent('ERROR', `❌ Abandon reconnexion après ${MAX_RECONNECT_ATTEMPTS} tentatives`);
            return;
        }
        
        const delay = RECONNECT_DELAY * attempts;
        logEvent('INFO', `🔄 Reconnexion dans ${delay/1000}s (tentative ${attempts}/${MAX_RECONNECT_ATTEMPTS})`);
        
        timerRegistry.setTimeout('eventsubReconnect', () => {
            connect();
        }, delay);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GESTION DES MESSAGES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Traite un message EventSub
     * @param {Object} message
     */
    async function handleMessage(message) {
        const messageType = message.metadata?.message_type;
        
        switch (messageType) {
            case 'session_welcome':
                await handleSessionWelcome(message);
                break;
                
            case 'session_keepalive':
                resetKeepaliveTimeout();
                break;
                
            case 'notification':
                await handleNotification(message);
                break;
                
            case 'session_reconnect':
                await handleReconnect(message);
                break;
                
            case 'revocation':
                handleRevocation(message);
                break;
                
            default:
                logEvent('DEBUG', `Message EventSub non géré: ${messageType}`);
        }
    }
    
    /**
     * Gère le message de bienvenue (session établie)
     * @param {Object} message
     */
    async function handleSessionWelcome(message) {
        const sessionId = message.payload.session.id;
        const keepaliveSeconds = message.payload.session.keepalive_timeout_seconds;
        
        stateManager.setEventSubConnected(true, ws, sessionId);
        logEvent('INFO', `✅ Session EventSub: ${sessionId} (keepalive: ${keepaliveSeconds}s)`);
        
        // Configurer le timeout keepalive
        resetKeepaliveTimeout(keepaliveSeconds * 1000 + 5000);
        
        // S'abonner aux événements
        await subscribeToEvents(sessionId);
    }
    
    /**
     * S'abonne aux événements Twitch
     * @param {string} sessionId
     */
    async function subscribeToEvents(sessionId) {
        const userId = stateManager.getTwitchUserId();
        
        const subscriptions = [
            {
                type: 'channel.follow',
                version: '2',
                condition: {
                    broadcaster_user_id: userId,
                    moderator_user_id: userId
                }
            },
            {
                type: 'channel.subscribe',
                version: '1',
                condition: { broadcaster_user_id: userId }
            },
            {
                type: 'channel.subscription.end',
                version: '1',
                condition: { broadcaster_user_id: userId }
            },
            {
                type: 'channel.subscription.gift',
                version: '1',
                condition: { broadcaster_user_id: userId }
            },
            {
                type: 'channel.subscription.message',
                version: '1',
                condition: { broadcaster_user_id: userId }
            }
        ];
        
        for (const sub of subscriptions) {
            await createSubscription(sessionId, sub);
        }
    }
    
    /**
     * Crée une subscription EventSub
     * @param {string} sessionId
     * @param {Object} subscription
     */
    async function createSubscription(sessionId, subscription) {
        try {
            const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...twitchApiService.getAuthHeaders()
                },
                body: JSON.stringify({
                    type: subscription.type,
                    version: subscription.version,
                    condition: subscription.condition,
                    transport: {
                        method: 'websocket',
                        session_id: sessionId
                    }
                })
            });
            
            if (response.ok) {
                logEvent('INFO', `✅ Abonné à ${subscription.type}`);
            } else {
                const error = await response.json();
                // 409 = déjà abonné, pas une erreur
                if (response.status !== 409) {
                    logEvent('WARN', `⚠️ Erreur abonnement ${subscription.type}`, { error: error.message });
                }
            }
            
        } catch (error) {
            logEvent('ERROR', `❌ Erreur création subscription ${subscription.type}`, { error: error.message });
        }
    }
    
    /**
     * Gère une notification d'événement
     * @param {Object} message
     */
    async function handleNotification(message) {
        const eventType = message.metadata.subscription_type;
        const event = message.payload.event;
        
        logEvent('INFO', `🎉 Événement ${eventType}`, { user: event.user_name || event.user_login });
        
        switch (eventType) {
            case 'channel.follow':
                handleFollowEvent(event);
                break;
                
            case 'channel.subscribe':
                handleSubscribeEvent(event);
                break;
                
            case 'channel.subscription.message':
                // Resub = renouvellement, la personne est déjà comptée
                // Ne PAS incrémenter le compteur
                logEvent('INFO', `🔄 Resub: ${event.user_name} (${event.cumulative_months} mois)`);
                break;
                
            case 'channel.subscription.gift':
                handleGiftEvent(event);
                break;
                
            case 'channel.subscription.end':
                handleSubEndEvent(event);
                break;
                
            default:
                logEvent('DEBUG', `Événement non géré: ${eventType}`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // HANDLERS D'ÉVÉNEMENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Gère un événement follow
     * @param {Object} event
     */
    function handleFollowEvent(event) {
        logEvent('INFO', `👤 Nouveau follow: ${event.user_name}`);
        batchingService.addFollowToBatch(1);
    }
    
    /**
     * Gère un événement subscribe
     * @param {Object} event
     */
    function handleSubscribeEvent(event) {
        // IMPORTANT: Ignorer les subs offerts (is_gift = true)
        // car ils sont déjà comptés via channel.subscription.gift
        if (event.is_gift) {
            logEvent('DEBUG', `🎁 Sub gift ignoré (déjà compté via gift event): ${event.user_name}`);
            return;
        }
        
        logEvent('INFO', `⭐ Nouveau sub: ${event.user_name} (${event.tier})`);
        batchingService.addSubToBatch(1);
    }
    
    /**
     * Gère un événement gift
     * @param {Object} event
     */
    function handleGiftEvent(event) {
        const count = event.total || 1;
        logEvent('INFO', `🎁 Gift subs: ${event.user_name} offre ${count} subs`);
        batchingService.addSubToBatch(count);
    }
    
    /**
     * Gère une fin de sub
     * En mode 'session', cet événement est ignoré (pas de décrémentation pendant le stream)
     * En mode 'realtime', le compteur est décrémenté normalement
     * @param {Object} event
     */
    function handleSubEndEvent(event) {
        // Vérifier le mode de compteur
        if (stateManager.isSessionMode()) {
            logEvent('INFO', `📉 Fin sub ignorée (mode session): ${event.user_name}`);
            return;
        }
        
        logEvent('INFO', `📉 Fin sub: ${event.user_name}`);
        batchingService.addSubEndToBatch(1);
    }
    
    /**
     * Gère une demande de reconnexion
     * @param {Object} message
     */
    async function handleReconnect(message) {
        const newUrl = message.payload.session.reconnect_url;
        logEvent('INFO', `🔄 Reconnexion demandée: ${newUrl}`);
        
        // Fermer l'ancienne connexion et se reconnecter
        if (ws) {
            ws.close();
        }
        
        ws = new WebSocket(newUrl);
        // Les handlers seront reconfigurés via connect()
    }
    
    /**
     * Gère une révocation d'abonnement
     * @param {Object} message
     */
    function handleRevocation(message) {
        const reason = message.payload.subscription.status;
        logEvent('WARN', `⚠️ Subscription révoquée: ${reason}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // KEEPALIVE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Réinitialise le timeout keepalive
     * @param {number} timeout - Timeout en ms
     */
    function resetKeepaliveTimeout(timeout = 30000) {
        clearKeepaliveTimeout();
        
        keepaliveTimeout = setTimeout(() => {
            logEvent('WARN', '⚠️ Keepalive timeout, reconnexion...');
            disconnect();
            scheduleReconnect();
        }, timeout);
    }
    
    /**
     * Annule le timeout keepalive
     */
    function clearKeepaliveTimeout() {
        if (keepaliveTimeout) {
            clearTimeout(keepaliveTimeout);
            keepaliveTimeout = null;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITAIRES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @returns {boolean}
     */
    function isConnected() {
        return ws && ws.readyState === WebSocket.OPEN && stateManager.isEventSubConnected();
    }
    
    /**
     * Retourne le statut de connexion
     * @returns {Object}
     */
    function getStatus() {
        return {
            connected: isConnected(),
            sessionId: stateManager.getSessionId(),
            reconnectAttempts: stateManager.getReconnectAttempts(),
            wsState: ws ? ws.readyState : null
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // API PUBLIQUE
    // ═══════════════════════════════════════════════════════════════════════════
    
    return Object.freeze({
        // Connexion
        connect,
        disconnect,
        isConnected,
        
        // Status
        getStatus,
        
        // Abonnements (pour tests)
        subscribeToEvents
    });
}

module.exports = { createEventSubService };
