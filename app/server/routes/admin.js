/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📄 ROUTES - Administration
 * ═══════════════════════════════════════════════════════════════════════════════
 * Routes d'administration pour gérer les compteurs et la configuration.
 * 
 * Routes:
 * - POST /admin/add-follows     → Ajouter des follows
 * - POST /admin/remove-follows  → Retirer des follows
 * - POST /admin/set-follows     → Définir le nombre de follows
 * - POST /admin/add-subs        → Ajouter des subs
 * - POST /admin/remove-subs     → Retirer des subs
 * - POST /admin/set-subs        → Définir le nombre de subs
 * - POST /admin/set-follow-goal → Définir objectif follows
 * - POST /admin/set-sub-goal    → Définir objectif subs
 * - GET  /admin/sync-twitch     → Synchroniser avec Twitch
 * - GET  /admin/test-twitch-api → Tester l'API Twitch
 * - GET  /admin/test-eventsub   → Tester EventSub
 * - GET  /admin/test-polling    → Tester le polling
 * - GET  /admin/read-files      → Lire les fichiers de données
 * - GET  /admin/test-file-write → Tester l'écriture fichiers
 * - GET  /admin/backup-data     → Créer un backup
 * - GET  /admin/restore-backup  → Restaurer un backup
 * - GET  /admin/corrupt-data    → Corrompre données (test)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const WebSocket = require('ws');

const router = express.Router();

// Imports des utilitaires
const { 
    logger, logEvent, 
    validatePositiveInt, validateTier 
} = require('../utils');

const { loadAppState, saveAppState } = require('../services');

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

// Dossier racine
const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const SERVER_DIR = path.join(__dirname, '..');

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 ROUTES GESTION FOLLOWS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /admin/add-follows - Ajouter des follows
 */
router.post('/add-follows', (req, res) => {
    try {
        const ctx = appContext;
        const amount = validatePositiveInt(req.body.amount, 'amount', 1, 100000);
        
        ctx.addFollowToBatch(amount);
        
        logEvent('INFO', `➕ Admin: Ajout de ${amount} follows au batch`);
        res.json({ success: true, total: ctx.currentFollows + ctx.followBatch.count });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur add follows', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /admin/remove-follows - Retirer des follows
 */
router.post('/remove-follows', (req, res) => {
    try {
        const ctx = appContext;
        const amount = validatePositiveInt(req.body.amount, 'amount', 1, 100000);
        
        ctx.addFollowRemoveToBatch(amount);
        
        logEvent('INFO', `➖ Admin: Ajout de -${amount} follows au batch`);
        res.json({ success: true, total: Math.max(0, ctx.currentFollows - ctx.followRemoveBatch.count) });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur remove follows', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /admin/set-follows - Définir le nombre de follows
 */
router.post('/set-follows', (req, res) => {
    try {
        const ctx = appContext;
        const count = validatePositiveInt(req.body.count, 'count', 0, 10000000);
        
        ctx.currentFollows = count;
        ctx.updateFollowFiles(ctx.currentFollows);
        ctx.broadcastFollowUpdate();
        
        logEvent('INFO', `🔐 Admin: Follows définis à ${count}`);
        res.json({ success: true, total: count });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur set follows', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ⭐ ROUTES GESTION SUBS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /admin/add-subs - Ajouter des subs
 */
router.post('/add-subs', (req, res) => {
    try {
        const ctx = appContext;
        const amount = validatePositiveInt(req.body.amount, 'amount', 1, 100000);
        const tier = validateTier(req.body.tier);
        
        ctx.addSubToBatch(amount, tier);
        
        logEvent('INFO', `➕ Admin: Ajout de ${amount} subs tier ${tier} au batch`);
        res.json({ success: true, total: ctx.currentSubs + ctx.subBatch.count });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur add subs', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /admin/remove-subs - Retirer des subs
 */
router.post('/remove-subs', (req, res) => {
    try {
        const ctx = appContext;
        const amount = validatePositiveInt(req.body.amount, 'amount', 1, 100000);
        
        ctx.addSubEndToBatch(amount);
        
        logEvent('INFO', `➖ Admin: Ajout de -${amount} subs au batch`);
        res.json({ success: true, total: Math.max(0, ctx.currentSubs - ctx.subEndBatch.count) });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur remove subs', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /admin/set-subs - Définir le nombre de subs
 */
router.post('/set-subs', (req, res) => {
    try {
        const ctx = appContext;
        const count = validatePositiveInt(req.body.count, 'count', 0, 10000000);
        
        ctx.currentSubs = count;
        ctx.updateSubFiles(ctx.currentSubs);
        ctx.broadcastSubUpdate();
        
        logEvent('INFO', `🔐 Admin: Subs définis à ${count}`);
        res.json({ success: true, total: count });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur set subs', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 ROUTES GESTION OBJECTIFS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /admin/set-follow-goal - Définir l'objectif de follows
 */
router.post('/set-follow-goal', (req, res) => {
    try {
        const ctx = appContext;
        const goal = validatePositiveInt(req.body.goal, 'goal', 0, 10000000);
        
        const appStateData = loadAppState();
        appStateData.goals.follows = goal;
        saveAppState(appStateData);
        
        // Broadcast via WebSocket
        ctx.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'goal_update',
                    followGoal: goal
                }));
            }
        });
        
        logEvent('INFO', `🎯 Admin: Objectif follows défini à ${goal}`);
        res.json({ success: true, goal: goal });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur set follow goal', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /admin/set-sub-goal - Définir l'objectif de subs
 */
router.post('/set-sub-goal', (req, res) => {
    try {
        const ctx = appContext;
        const goal = validatePositiveInt(req.body.goal, 'goal', 0, 10000000);
        
        const appStateData = loadAppState();
        appStateData.goals.subs = goal;
        saveAppState(appStateData);
        
        // Broadcast via WebSocket
        ctx.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'goal_update',
                    subGoal: goal
                }));
            }
        });
        
        logEvent('INFO', `🎯 Admin: Objectif subs défini à ${goal}`);
        res.json({ success: true, goal: goal });
    } catch (error) {
        logEvent('ERROR', '❌ Erreur set sub goal', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 ROUTES SYNCHRONISATION TWITCH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/sync-twitch - Synchroniser avec l'API Twitch
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
                nextResetIn: Math.ceil(ctx.syncLimiter.nextResetIn() / 1000)
            });
        }
        
        logEvent('INFO', '📄 Admin: Synchronisation avec Twitch API');
        
        if (!ctx.twitchConfig.access_token || !ctx.twitchConfig.user_id) {
            return res.json({ 
                success: false,
                error: 'Non authentifié avec Twitch'
            });
        }
        
        const localFollows = ctx.currentFollows;
        const localSubs = ctx.currentSubs;
        
        const followsResult = await ctx.syncTwitchFollows('Sync admin panel');
        const subsResult = await ctx.syncTwitchSubs('Sync admin panel');
        
        const followsDiff = followsResult.success ? followsResult.diff : 0;
        const subsDiff = subsResult.success ? subsResult.diff : 0;
        const updated = (followsDiff !== 0) || (subsDiff !== 0);
        
        logEvent('INFO', `📊 Sync terminée - Follows: ${localFollows}→${followsResult.data} | Subs: ${localSubs}→${subsResult.data}`);
        
        res.json({
            success: followsResult.success && subsResult.success,
            twitchFollows: followsResult.data,
            twitchSubs: subsResult.data,
            localFollows: localFollows,
            localSubs: localSubs,
            followsDiff: followsDiff,
            subsDiff: subsDiff,
            updated: updated
        });
        
    } catch (error) {
        logEvent('ERROR', '❌ Admin: Erreur sync Twitch', { error: error.message });
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

/**
 * GET /admin/test-twitch-api - Tester l'API Twitch
 */
router.get('/test-twitch-api', async (req, res) => {
    try {
        const ctx = appContext;
        logEvent('INFO', '🔐 Admin: Test API Twitch');
        
        if (!ctx.twitchConfig.access_token || !ctx.twitchConfig.user_id) {
            return res.json({ 
                status: 'NOT_AUTHENTICATED',
                message: 'Non authentifié'
            });
        }
        
        const followsResponse = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${ctx.twitchConfig.user_id}`, {
            headers: {
                'Authorization': `Bearer ${ctx.twitchConfig.access_token}`,
                'Client-Id': ctx.twitchConfig.client_id
            }
        });
        const followsData = await followsResponse.json();
        
        const subsResponse = await fetch(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${ctx.twitchConfig.user_id}`, {
            headers: {
                'Authorization': `Bearer ${ctx.twitchConfig.access_token}`,
                'Client-Id': ctx.twitchConfig.client_id
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
        logEvent('ERROR', '❌ Admin: Erreur test API', { error: error.message });
        res.status(500).json({ 
            status: 'ERROR',
            error: error.message 
        });
    }
});

/**
 * GET /admin/test-eventsub - Tester la connexion EventSub
 */
router.get('/test-eventsub', (req, res) => {
    try {
        const ctx = appContext;
        const status = ctx.sessionId ? 'CONNECTED' : 'DISCONNECTED';
        
        res.json({
            status: status,
            sessionId: ctx.sessionId,
            message: status === 'CONNECTED' ? 'EventSub connecté' : 'EventSub déconnecté'
        });
        
        logEvent('INFO', `📡 Admin: Test EventSub - ${status}`);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /admin/test-polling - Tester le polling manuellement
 */
router.get('/test-polling', async (req, res) => {
    try {
        const ctx = appContext;
        logEvent('INFO', '⏱️ Admin: Test polling manuel');
        
        await ctx.pollFollowCount();
        
        res.json({ 
            success: true,
            message: 'Polling exécuté'
        });
    } catch (error) {
        logEvent('ERROR', '❌ Admin: Erreur test polling', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📁 ROUTES FICHIERS ET BACKUP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/read-files - Lire les fichiers de données
 */
router.get('/read-files', (req, res) => {
    try {
        const ctx = appContext;
        const appStateData = loadAppState();
        const files = {
            follows: appStateData.counters.follows.toString(),
            subs: appStateData.counters.subs.toString(),
            followGoal: (appStateData.goals.follows || 0).toString(),
            subGoal: (appStateData.goals.subs || 0).toString(),
            twitchConfig: ctx.twitchConfig
        };
        
        logEvent('INFO', '📖 Admin: Lecture fichiers');
        res.json(files);
    } catch (error) {
        logEvent('ERROR', '❌ Admin: Erreur lecture fichiers', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /admin/test-file-write - Tester l'écriture de fichiers
 */
router.get('/test-file-write', (req, res) => {
    try {
        const testPath = path.join(SERVER_DIR, 'admin_test_write.txt');
        const testContent = `Test écriture admin - ${new Date().toISOString()}`;
        
        fs.writeFileSync(testPath, testContent, 'utf8');
        const readBack = fs.readFileSync(testPath, 'utf8');
        
        fs.unlinkSync(testPath); // Clean up
        
        logEvent('INFO', '💾 Admin: Test écriture OK');
        res.json({ 
            success: true,
            written: testContent,
            readBack: readBack
        });
    } catch (error) {
        logEvent('ERROR', '❌ Admin: Erreur test écriture', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /admin/backup-data - Créer un backup des données
 */
router.get('/backup-data', (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(SERVER_DIR, 'backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        const appStateData = loadAppState();
        const backupData = {
            timestamp: timestamp,
            follows: appStateData.counters.follows.toString(),
            subs: appStateData.counters.subs.toString(),
            followGoal: (appStateData.goals.follows || 0).toString(),
            subGoal: (appStateData.goals.subs || 0).toString()
        };
        
        const backupPath = path.join(backupDir, `backup_${timestamp}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
        
        logEvent('INFO', `📦 Admin: Backup créé - ${backupPath}`);
        res.json({ 
            success: true,
            filename: `backup_${timestamp}.json`,
            path: backupPath
        });
    } catch (error) {
        logEvent('ERROR', '❌ Admin: Erreur backup', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /admin/restore-backup - Restaurer le dernier backup
 */
router.get('/restore-backup', (req, res) => {
    try {
        const ctx = appContext;
        const backupDir = path.join(SERVER_DIR, 'backups');
        
        if (!fs.existsSync(backupDir)) {
            return res.status(404).json({ error: 'Aucun backup trouvé' });
        }
        
        const backups = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
            .sort()
            .reverse();
        
        if (backups.length === 0) {
            return res.status(404).json({ error: 'Aucun backup trouvé' });
        }
        
        const latestBackup = path.join(backupDir, backups[0]);
        const backupData = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));
        
        const appStateData = loadAppState();
        appStateData.counters.follows = parseInt(backupData.follows) || 0;
        appStateData.counters.subs = parseInt(backupData.subs) || 0;
        appStateData.goals.follows = parseInt(backupData.followGoal) || 0;
        appStateData.goals.subs = parseInt(backupData.subGoal) || 0;
        saveAppState(appStateData);
        
        ctx.currentFollows = appStateData.counters.follows;
        ctx.currentSubs = appStateData.counters.subs;
        
        logEvent('INFO', `↩️ Admin: Backup restauré - ${backups[0]}`);
        res.json({ 
            success: true,
            restored: backups[0],
            data: backupData
        });
    } catch (error) {
        logEvent('ERROR', '❌ Admin: Erreur restore', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /admin/corrupt-data - Corrompre les données (pour test de récupération)
 */
router.get('/corrupt-data', (req, res) => {
    try {
        const appStatePath = path.join(ROOT_DIR, 'app', 'config', 'app_state.json');
        fs.writeFileSync(appStatePath, 'CORRUPTED_DATA_FOR_TEST', 'utf8');
        
        logEvent('WARN', '🔥 Admin: Données corrompues pour test');
        res.json({ 
            success: true,
            message: 'Données corrompues - testez la récupération'
        });
    } catch (error) {
        logEvent('ERROR', '❌ Admin: Erreur corruption', { error: error.message });
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
