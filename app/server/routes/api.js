/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📄 ROUTES - API Publiques
 * ═══════════════════════════════════════════════════════════════════════════════
 * Routes API publiques pour l'application SubCount Auto.
 * Ces routes sont accessibles sans authentification admin.
 * 
 * Routes:
 * - GET  /api/status          → Statut du serveur
 * - GET  /api/stats           → Statistiques (follows, subs, goals)
 * - GET  /api/current         → Compteurs actuels
 * - GET  /api/current-follows → Follows actuels
 * - GET  /api/current-subs    → Subs actuels
 * - GET  /api/sub_goal        → Objectif subs actuel
 * - GET  /api/follow_goal     → Objectif follows actuel
 * - GET  /api/overlay-config  → Configuration overlay
 * - POST /api/overlay-config  → Mise à jour config overlay
 * - GET  /api/version         → Informations version
 * - GET  /api/app-state       → État application
 * - POST /api/update-follows  → Mettre à jour follows
 * - POST /api/update-subs     → Mettre à jour subs
 * - GET  /api/logs-info       → Infos logs
 * - POST /api/clean-logs      → Nettoyer logs
 * - GET  /api/event-buffer/status → Statut buffer événements
 * - POST /api/event-buffer/clear  → Vider buffer événements
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const router = express.Router();

// Imports des utilitaires
const { 
    logger, logEvent, 
    validatePositiveInt,
    LIMITS 
} = require('../utils');

const { 
    loadAppState, saveAppState, 
    getOverlayConfig, updateOverlayConfig, 
    getVersionInfo 
} = require('../services');

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 DÉPENDANCES INJECTÉES
// ═══════════════════════════════════════════════════════════════════════════════
// Ces dépendances sont injectées par server.js lors du montage du routeur

let appContext = null;

/**
 * Initialise le contexte de l'application
 * @param {Object} context - Contexte contenant wss, eventQueue, etc.
 */
function initContext(context) {
    appContext = context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ROUTES STATUS ET STATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/status - Statut complet du serveur
 */
router.get('/status', (req, res) => {
    const ctx = appContext;
    const eventSubConnected = ctx.twitchEventSubWs && ctx.twitchEventSubWs.readyState === WebSocket.OPEN;
    
    // Récupérer les infos depuis app_state.json
    let stateInfo = null;
    try {
        const state = loadAppState();
        stateInfo = {
            follows: state.counters.follows,
            subs: state.counters.subs,
            lastUpdated: state.counters.lastUpdated,
            version: state.version.current
        };
    } catch (error) {
        stateInfo = { error: 'Erreur lecture app_state.json' };
    }
    
    res.json({
        status: 'active',
        version: '2.3.0',
        currentFollows: ctx.currentFollows,
        currentSubs: ctx.currentSubs,
        goals: ctx.followGoals.size + ctx.subGoals.size,
        uptime: Math.floor(process.uptime()),
        twitchConfigured: ctx.twitchConfig.configured,
        username: ctx.twitchConfig.username,
        eventSubConnected: eventSubConnected,
        sessionId: ctx.sessionId,
        deviceCodePolling: ctx.deviceCodePolling !== null,
        reconnectAttempts: ctx.reconnectAttempts,
        maxReconnectAttempts: LIMITS.MAX_RECONNECT_ATTEMPTS,
        lastUpdate: new Date().toISOString(),
        state: stateInfo,
        websocketClients: ctx.wss.clients.size,
        eventQueue: {
            size: ctx.eventQueue.size(),
            isProcessing: ctx.eventQueue.processing,
            maxEventsPerBatch: LIMITS.MAX_EVENTS_PER_BATCH
        }
    });
});

/**
 * GET /api/stats - Statistiques simples
 */
router.get('/stats', (req, res) => {
    try {
        const appStateData = loadAppState();
        
        res.json({
            follows: appStateData.counters.follows,
            subs: appStateData.counters.subs,
            followGoal: appStateData.goals.follows || 0,
            subGoal: appStateData.goals.subs || 0
        });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur lecture stats', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/current - Compteurs actuels avec objectifs
 */
router.get('/current', (req, res) => {
    const ctx = appContext;
    res.json({
        currentFollows: ctx.currentFollows,
        currentSubs: ctx.currentSubs,
        followGoal: ctx.getCurrentFollowGoal(ctx.currentFollows),
        subGoal: ctx.getCurrentSubGoal(ctx.currentSubs)
    });
});

/**
 * GET /api/current-follows - Follows actuels
 */
router.get('/current-follows', (req, res) => {
    const ctx = appContext;
    res.json({
        currentFollows: ctx.currentFollows,
        goal: ctx.getCurrentFollowGoal(ctx.currentFollows)
    });
});

/**
 * GET /api/current-subs - Subs actuels
 */
router.get('/current-subs', (req, res) => {
    const ctx = appContext;
    res.json({
        currentSubs: ctx.currentSubs,
        goal: ctx.getCurrentSubGoal(ctx.currentSubs)
    });
});

/**
 * GET /api/sub_goal - Objectif subs (pour overlays OBS)
 */
router.get('/sub_goal', (req, res) => {
    const ctx = appContext;
    const goal = ctx.getCurrentSubGoal(ctx.currentSubs);
    res.json({ goal });
});

/**
 * GET /api/follow_goal - Objectif follows (pour overlays OBS)
 */
router.get('/follow_goal', (req, res) => {
    const ctx = appContext;
    const goal = ctx.getCurrentFollowGoal(ctx.currentFollows);
    res.json({ goal });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 ROUTES MISE À JOUR COMPTEURS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/update-follows - Mettre à jour le nombre de follows
 */
router.post('/update-follows', (req, res) => {
    try {
        const ctx = appContext;
        const count = validatePositiveInt(req.body.count, 'count', 0, 10000000);
        
        ctx.currentFollows = count;
        ctx.updateFollowFiles(ctx.currentFollows);
        ctx.broadcastFollowUpdate();
        ctx.saveFollowCountToFile(ctx.currentFollows);
        
        res.json({
            success: true,
            currentFollows: ctx.currentFollows,
            goal: ctx.getCurrentFollowGoal(ctx.currentFollows)
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/update-subs - Mettre à jour le nombre de subs
 */
router.post('/update-subs', (req, res) => {
    try {
        const ctx = appContext;
        const count = validatePositiveInt(req.body.count, 'count', 0, 10000000);
        
        ctx.currentSubs = count;
        ctx.updateSubFiles(ctx.currentSubs);
        ctx.broadcastSubUpdate();
        ctx.saveSubCountToFile(ctx.currentSubs);
        
        res.json({
            success: true,
            currentSubs: ctx.currentSubs,
            goal: ctx.getCurrentSubGoal(ctx.currentSubs)
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ROUTES OVERLAY CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/overlay-config - Récupérer la configuration overlay
 */
router.get('/overlay-config', (req, res) => {
    res.json(appContext.overlayConfig);
});

/**
 * POST /api/overlay-config - Mettre à jour la configuration overlay
 */
router.post('/overlay-config', (req, res) => {
    try {
        const ctx = appContext;
        const updates = req.body;
        
        // Fusionner les mises à jour avec la config existante
        if (updates.font) ctx.overlayConfig.font = { ...ctx.overlayConfig.font, ...updates.font };
        if (updates.colors) ctx.overlayConfig.colors = { ...ctx.overlayConfig.colors, ...updates.colors };
        if (updates.animation) ctx.overlayConfig.animation = { ...ctx.overlayConfig.animation, ...updates.animation };
        if (updates.layout) ctx.overlayConfig.layout = { ...ctx.overlayConfig.layout, ...updates.layout };
        
        updateOverlayConfig(ctx.overlayConfig);
        ctx.broadcastConfigUpdate();
        
        logEvent('INFO', '✅ Configuration overlay mise à jour', updates);
        res.json({ success: true, config: ctx.overlayConfig });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur mise à jour config', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/version - Informations version
 */
router.get('/version', (req, res) => {
    res.json(getVersionInfo());
});

/**
 * GET /api/app-state - État complet de l'application (sans données sensibles)
 */
router.get('/app-state', (req, res) => {
    const state = loadAppState();
    res.json({
        counters: state.counters,
        goals: state.goals,
        version: state.version
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 ROUTES LOGS
// ═══════════════════════════════════════════════════════════════════════════════

const ROOT_DIR = path.join(__dirname, '..', '..', '..');

/**
 * GET /api/logs-info - Informations sur les fichiers de logs
 */
router.get('/logs-info', (req, res) => {
    try {
        const logsInfo = {};
        
        // Informations sur subcount_logs.txt
        const subcountLogPath = path.join(ROOT_DIR, 'app', 'logs', 'subcount_logs.txt');
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
        const obsLogPath = path.join(__dirname, '..', 'obs_subcount_auto.log');
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

/**
 * POST /api/clean-logs - Nettoyer les fichiers de logs
 */
router.post('/clean-logs', (req, res) => {
    try {
        const results = {};
        const { which = 'both' } = req.body;
        
        if (which === 'subcount' || which === 'both') {
            const subcountLogPath = path.join(ROOT_DIR, 'app', 'logs', 'subcount_logs.txt');
            if (fs.existsSync(subcountLogPath)) {
                const originalSize = fs.statSync(subcountLogPath).size;
                const header = `# Log nettoyé manuellement via interface web - ${new Date().toISOString()}\n\n`;
                fs.writeFileSync(subcountLogPath, header, 'utf8');
                results.subcountLogs = {
                    cleaned: true,
                    originalSizeKB: (originalSize / 1024).toFixed(2),
                    newSizeKB: (header.length / 1024).toFixed(2)
                };
                logEvent('INFO', '🧹 Log subcount_logs.txt nettoyé via interface web');
            } else {
                results.subcountLogs = { cleaned: false, reason: 'Fichier non trouvé' };
            }
        }
        
        if (which === 'obs' || which === 'both') {
            const obsLogPath = path.join(__dirname, '..', 'obs_subcount_auto.log');
            if (fs.existsSync(obsLogPath)) {
                const originalSize = fs.statSync(obsLogPath).size;
                const header = `# Log nettoyé manuellement via interface web - ${new Date().toISOString()}\n\n`;
                fs.writeFileSync(obsLogPath, header, 'utf8');
                results.obsLogs = {
                    cleaned: true,
                    originalSizeKB: (originalSize / 1024).toFixed(2),
                    newSizeKB: (header.length / 1024).toFixed(2)
                };
                logEvent('INFO', '🧹 Log obs_subcount_auto.log nettoyé via interface web');
            } else {
                results.obsLogs = { cleaned: false, reason: 'Fichier non trouvé' };
            }
        }
        
        res.json({ success: true, results });
    } catch (error) {
        logEvent('ERROR', 'Erreur nettoyage logs via API', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 ROUTES EVENT BUFFER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/event-buffer/status - Statut du buffer d'événements
 */
router.get('/event-buffer/status', (req, res) => {
    const ctx = appContext;
    const events = ctx.eventQueue.getAll();
    res.json({
        size: events.length,
        isProcessing: ctx.eventQueue.processing,
        events: events.map(e => ({
            id: e.id,
            type: e.type,
            timestamp: new Date(e.timestamp).toISOString(),
            data: e.data
        })),
        config: {
            maxEventsPerBatch: LIMITS.MAX_EVENTS_PER_BATCH,
            processingDelay: LIMITS.EVENT_PROCESSING_DELAY
        }
    });
});

/**
 * POST /api/event-buffer/clear - Vider le buffer d'événements
 */
router.post('/event-buffer/clear', (req, res) => {
    try {
        const ctx = appContext;
        const clearedEvents = ctx.eventQueue.size();
        ctx.eventQueue.clear();
        
        logEvent('INFO', `🧹 File d'événements vidée: ${clearedEvents} événements supprimés`);
        
        res.json({
            success: true,
            message: `File vidée: ${clearedEvents} événements supprimés`,
            clearedEvents: clearedEvents
        });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur vidage file:', error.message);
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
