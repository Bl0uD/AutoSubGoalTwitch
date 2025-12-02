/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📄 ROUTES - Twitch API
 * ═══════════════════════════════════════════════════════════════════════════════
 * Routes pour l'authentification et la synchronisation Twitch.
 * 
 * Routes:
 * - POST /api/config              → Sauvegarder config
 * - POST /api/start-device-auth   → Démarrer auth Device Code
 * - GET  /api/auth-status         → Statut authentification
 * - GET  /api/moderator-status    → Statut modérateur
 * - GET  /api/sync-twitch         → Synchroniser avec Twitch
 * - POST /api/refresh-token       → Rafraîchir token
 * - POST /api/disconnect-twitch   → Déconnecter Twitch
 * - POST /api/reload-goals        → Recharger les objectifs
 * - POST /api/reconnect-eventsub  → Reconnecter EventSub
 * - POST /api/test/simulate-follow → Simuler un follow (test)
 */

const express = require('express');
const WebSocket = require('ws');

const router = express.Router();

// Imports des utilitaires
const { 
    logger, logEvent,
    VALID_EVENT_TYPES 
} = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 DÉPENDANCES INJECTÉES
// ═══════════════════════════════════════════════════════════════════════════════

let appContext = null;

/**
 * Initialise le contexte de l'application
 * @param {Object} context - Contexte contenant les fonctions et variables globales
 */
function initContext(context) {
    appContext = context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 ROUTES CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/config - Sauvegarder la configuration
 */
router.post('/config', (req, res) => {
    try {
        const ctx = appContext;
        const { client_id } = req.body;
        
        ctx.twitchConfig.client_id = client_id;
        ctx.saveTwitchConfig();
        
        res.json({ success: true, message: 'Configuration sauvegardée' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 ROUTES DEVICE CODE GRANT FLOW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/start-device-auth - Démarrer l'authentification Device Code
 */
router.post('/start-device-auth', async (req, res) => {
    try {
        const ctx = appContext;
        
        if (!ctx.twitchConfig.client_id) {
            return res.status(400).json({ 
                error: 'Client ID Twitch manquant',
                success: false 
            });
        }
        
        // Vérifier si un processus d'authentification est déjà en cours
        if (ctx.deviceCodePolling !== null) {
            return res.json({
                success: true,
                message: 'Authentification déjà en cours',
                user_code: ctx.deviceCodeData.user_code || '',
                verification_uri: ctx.deviceCodeData.verification_uri || '',
                expires_in: ctx.deviceCodeData.expires_in || 0,
                already_running: true
            });
        }
        
        console.log('🚀 Démarrage Device Code Grant Flow via API...');
        const deviceData = await ctx.initiateDeviceCodeFlow();
        
        res.json({
            success: true,
            user_code: deviceData.user_code,
            verification_uri: deviceData.verification_uri,
            expires_in: deviceData.expires_in,
            interval: deviceData.interval,
            message: 'Device Code Grant Flow démarré avec succès'
        });
    } catch (error) {
        console.error('❌ Erreur start-device-auth:', error.message);
        res.status(500).json({ 
            error: error.message,
            success: false,
            details: 'Impossible de démarrer l\'authentification Device Code Grant'
        });
    }
});

/**
 * GET /api/auth-status - Statut de l'authentification
 */
router.get('/auth-status', (req, res) => {
    try {
        const ctx = appContext;
        const now = Date.now();
        const isPolling = ctx.deviceCodePolling !== null;
        const hasDeviceCode = ctx.deviceCodeData && ctx.deviceCodeData.device_code;
        const timeRemaining = hasDeviceCode ? Math.max(0, Math.floor((ctx.deviceCodeData.expires_at - now) / 1000)) : 0;
        
        const isAuthenticated = ctx.twitchConfig.configured && 
                               ctx.twitchConfig.access_token && 
                               ctx.twitchConfig.user_id;
        
        res.json({
            configured: ctx.twitchConfig.configured,
            authenticated: isAuthenticated,
            username: ctx.twitchConfig.username || '',
            login: ctx.twitchConfig.login || '',
            display_name: ctx.twitchConfig.display_name || ctx.twitchConfig.username || '',
            user_id: ctx.twitchConfig.user_id || '',
            polling: isPolling,
            has_device_code: hasDeviceCode,
            has_access_token: !!ctx.twitchConfig.access_token,
            expires_at: hasDeviceCode ? ctx.deviceCodeData.expires_at : 0,
            time_remaining: timeRemaining,
            user_code: hasDeviceCode ? ctx.deviceCodeData.user_code : '',
            verification_uri: hasDeviceCode ? ctx.deviceCodeData.verification_uri : '',
            server_status: 'running',
            timestamp: now
        });
    } catch (error) {
        console.error('❌ Erreur endpoint auth-status:', error.message);
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

/**
 * GET /api/moderator-status - Statut des privilèges modérateur
 */
router.get('/moderator-status', async (req, res) => {
    try {
        const ctx = appContext;
        
        if (!ctx.twitchConfig.access_token || !ctx.twitchConfig.user_id) {
            return res.json({
                configured: false,
                error: 'Non configuré'
            });
        }

        const isModerator = await ctx.checkIfModerator();
        const canGrantSelf = await ctx.canGrantSelfModerator();
        
        res.json({
            configured: true,
            user_id: ctx.twitchConfig.user_id,
            username: ctx.twitchConfig.username,
            is_moderator: isModerator,
            can_grant_self: canGrantSelf,
            scopes: ctx.twitchConfig.scope ? ctx.twitchConfig.scope.split(' ') : []
        });
    } catch (error) {
        console.error('❌ Erreur lors de la vérification du statut modérateur:', error.message);
        res.status(500).json({
            configured: true,
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 ROUTES SYNCHRONISATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/sync-twitch - Synchroniser avec l'API Twitch
 */
router.get('/sync-twitch', async (req, res) => {
    try {
        const ctx = appContext;
        
        // Rate limiting
        if (!ctx.syncLimiter.allow()) {
            return res.status(429).json({ 
                success: false,
                error: 'Too many requests',
                message: 'Attendez 1 minute avant la prochaine synchro',
                remaining: ctx.syncLimiter.remaining(),
                nextResetIn: Math.ceil(ctx.syncLimiter.nextResetIn() / 1000)
            });
        }
        
        if (!ctx.twitchConfig.configured) {
            return res.status(400).json({ 
                success: false,
                error: 'Twitch non configuré - Veuillez vous connecter d\'abord' 
            });
        }
        
        if (!ctx.twitchConfig.access_token) {
            return res.status(400).json({ 
                success: false,
                error: 'Token d\'accès manquant - Reconnectez-vous à Twitch' 
            });
        }
        
        logEvent('INFO', '📄 Démarrage synchronisation manuelle depuis l\'API Twitch...');
        
        const followsResult = await ctx.syncTwitchFollows('Synchronisation manuelle');
        const subsResult = await ctx.syncTwitchSubs('Synchronisation manuelle');
        
        const hasErrors = !followsResult.success || !subsResult.success;
        
        res.json({
            success: !hasErrors,
            currentFollows: followsResult.data,
            currentSubs: subsResult.data,
            message: hasErrors ? 
                'Synchronisation partielle avec erreurs' : 
                'Synchronisation complète réussie ! Follows et Subs récupérés depuis l\'API Twitch',
            details: {
                follows: followsResult.success ? 
                    `${followsResult.data} follows synchronisés depuis Twitch` : 
                    `Erreur: ${followsResult.error}`,
                subs: subsResult.success ? 
                    `${subsResult.data} subs synchronisés depuis Twitch` : 
                    `Erreur: ${subsResult.error}`
            },
            errors: hasErrors ? {
                follows: followsResult.error,
                subs: subsResult.error
            } : null
        });
    } catch (error) {
        logEvent('ERROR', `❌ Erreur générale sync: ${error.message}`);
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

/**
 * POST /api/refresh-token - Rafraîchir le token Twitch
 */
router.post('/refresh-token', async (req, res) => {
    try {
        const ctx = appContext;
        const success = await ctx.refreshTwitchToken();
        if (success) {
            res.json({ success: true, message: 'Token renouvelé avec succès' });
        } else {
            res.status(500).json({ success: false, error: 'Échec du renouvellement' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/disconnect-twitch - Déconnecter Twitch
 */
router.post('/disconnect-twitch', (req, res) => {
    try {
        const ctx = appContext;
        console.log('📌 Déconnexion Twitch demandée...');
        
        const oldUsername = ctx.twitchConfig.username || 'Utilisateur inconnu';
        
        // Fermer la connexion EventSub
        if (ctx.twitchEventSubWs) {
            ctx.twitchEventSubWs.removeAllListeners();
            ctx.twitchEventSubWs.close();
            ctx.twitchEventSubWs = null;
            ctx.sessionId = null;
            console.log('📌 EventSub WebSocket fermé');
        }
        
        // Arrêter le polling
        ctx.stopFollowPolling();
        
        // Arrêter le device code polling si actif
        if (ctx.deviceCodePolling) {
            ctx.timerRegistry.clearInterval('deviceCodePolling');
            ctx.deviceCodePolling = null;
            console.log('📄 Device Code polling arrêté');
        }
        
        // Réinitialiser la configuration Twitch
        ctx.twitchConfig.access_token = '';
        ctx.twitchConfig.refresh_token = '';
        ctx.twitchConfig.user_id = '';
        ctx.twitchConfig.username = '';
        ctx.twitchConfig.configured = false;
        
        ctx.saveTwitchConfig();
        ctx.reconnectAttempts = 0;
        
        logEvent('INFO', `📌 Déconnexion Twitch réussie (@${oldUsername})`);
        
        res.json({
            success: true,
            message: `Déconnecté de @${oldUsername}`,
            previousUser: oldUsername
        });
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur déconnexion Twitch:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 ROUTES RECHARGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/reload-goals - Recharger la configuration des objectifs
 */
router.post('/reload-goals', (req, res) => {
    try {
        const ctx = appContext;
        console.log('📄 Rechargement manuel des objectifs...');
        ctx.loadGoals();
        res.json({ 
            success: true, 
            message: 'Configuration rechargée',
            goalsCount: ctx.followGoals.size + ctx.subGoals.size 
        });
    } catch (error) {
        console.error('❌ Erreur rechargement:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/reconnect-eventsub - Forcer la reconnexion EventSub
 */
router.post('/reconnect-eventsub', (req, res) => {
    try {
        const ctx = appContext;
        console.log('📄 Reconnexion forcée EventSub...');
        
        ctx.reconnectAttempts = 0;
        
        if (ctx.twitchEventSubWs) {
            ctx.twitchEventSubWs.removeAllListeners();
            ctx.twitchEventSubWs.close();
            ctx.twitchEventSubWs = null;
            ctx.sessionId = null;
        }
        
        ctx.timerRegistry.setTimeout('restartEventSub', () => {
            ctx.connectTwitchEventSub();
        }, 1000);
        
        res.json({ 
            success: true, 
            message: 'Reconnexion EventSub initiée' 
        });
    } catch (error) {
        console.error('❌ Erreur reconnexion forcée:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 ROUTES DE TEST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/test/simulate-follow - Simuler un événement follow
 */
router.post('/test/simulate-follow', (req, res) => {
    try {
        const ctx = appContext;
        const { user_name = 'TestUser', user_id = '999999999' } = req.body;
        
        logEvent('TEST', `🧪 Simulation événement follow: ${user_name}`);
        
        const testEvent = {
            user_name: user_name,
            user_id: user_id,
            followed_at: new Date().toISOString(),
            timestamp: Date.now(),
            simulated: true
        };
        
        ctx.eventQueue.add({
            id: `test-follow-${Date.now()}`,
            type: VALID_EVENT_TYPES.FOLLOW,
            data: testEvent,
            timestamp: Date.now()
        });
        
        res.json({
            success: true,
            message: `Événement follow simulé pour ${user_name}`,
            event: testEvent,
            queueSize: ctx.eventQueue.size()
        });
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur simulation follow:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
    router,
    initContext
};
