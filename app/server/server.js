/**
 * @file server.js
 * @description Serveur Express avec architecture v3.1 (StateManager + DI)
 * @version 3.1.0
 * 
 * Architecture modulaire:
 * - StateManager: état centralisé avec EventEmitter
 * - DependencyContainer: injection de dépendances (IoC)
 * - Factories: services découplés et testables
 * 
 * @see core/bootstrap.js pour l'initialisation des services
 * @see server-legacy.js pour l'ancienne version monolithique
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS - Nouvelle Architecture
// ═══════════════════════════════════════════════════════════════════════════════

const { bootstrap, setupEventListeners, STATE_EVENTS } = require('./core');
const { PORTS, LIMITS } = require('./utils/constants');
const { logEvent } = require('./utils/logger');

// Import des routes (à migrer progressivement)
const { pagesRouter, apiRouter, adminRouter, twitchRouter } = require('./routes');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = PORTS.HTTP || 8082;
const ROOT_DIR = path.join(__dirname, '..', '..');

// ═══════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP - Initialisation du Container
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n┌─────────────────────────────────────────────────────────────────┐');
console.log('│     🚀 SubCount Auto v3.1.0 - Architecture Modulaire          │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

// Créer le container avec toutes les dépendances
const container = bootstrap();

// Configurer les event listeners entre services
setupEventListeners(container);

// Résoudre les services principaux
const stateManager = container.resolve('stateManager');
const broadcastService = container.resolve('broadcastService');
const goalsService = container.resolve('goalsService');
const batchingService = container.resolve('batchingService');
const twitchApiService = container.resolve('twitchApiService');
const eventSubService = container.resolve('eventSubService');
const pollingService = container.resolve('pollingService');
const rateLimiters = container.resolve('rateLimiters');

logEvent('INFO', '✅ Container initialisé avec tous les services');

// ═══════════════════════════════════════════════════════════════════════════════
// EXPRESS APP
// ═══════════════════════════════════════════════════════════════════════════════

const app = express();

// ─────────────────────────────────────────────────────────────────────────────
// Sécurité et Middlewares
// ─────────────────────────────────────────────────────────────────────────────

console.log('✅ PROTECTION ACTIVE :');
console.log('   • CORS restreint à localhost uniquement');
console.log('   • Tokens Twitch chiffrés AES-256-GCM');

app.use(cors({
    origin: ['http://localhost:8082', 'http://127.0.0.1:8082', 'http://localhost', 'http://127.0.0.1'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-password'],
    credentials: true
}));

app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, '..', 'web')));
app.use('/obs', express.static(path.join(ROOT_DIR, 'obs')));

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: Injection du Container dans les requêtes
// ─────────────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
    // Injecter le container et les services fréquemment utilisés
    req.container = container;
    req.stateManager = stateManager;
    req.services = {
        broadcast: broadcastService,
        goals: goalsService,
        batching: batchingService,
        twitchApi: twitchApiService,
        eventSub: eventSubService,
        polling: pollingService
    };
    req.rateLimiters = rateLimiters;
    next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES - API Simplifiées avec nouvelle architecture
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Pages HTML
// ─────────────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'web', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'web', 'admin.html'));
});

app.get('/config', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'web', 'config.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
// API Status
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        version: '3.1.0',
        architecture: 'modular',
        counters: stateManager.getCounters(),
        connections: {
            eventSubConnected: stateManager.isEventSubConnected(),
            clientCount: broadcastService.getCounterClientCount()
        },
        twitch: twitchApiService.getConnectionInfo()
    });
});

app.get('/api/stats', (req, res) => {
    const followGoalInfo = goalsService.getCurrentFollowGoal();
    const subGoalInfo = goalsService.getCurrentSubGoal();
    
    res.json({
        follows: stateManager.getFollows(),
        subs: stateManager.getSubs(),
        followGoal: followGoalInfo.goal,
        subGoal: subGoalInfo.goal,
        followProgress: followGoalInfo.progress,
        subProgress: subGoalInfo.progress
    });
});

app.get('/api/current', (req, res) => {
    res.json({
        follows: stateManager.getFollows(),
        subs: stateManager.getSubs()
    });
});

app.get('/api/current-follows', (req, res) => {
    res.json({ follows: stateManager.getFollows() });
});

app.get('/api/current-subs', (req, res) => {
    res.json({ subs: stateManager.getSubs() });
});

app.get('/api/follow_goal', (req, res) => {
    res.json(goalsService.getCurrentFollowGoal());
});

app.get('/api/sub_goal', (req, res) => {
    res.json(goalsService.getCurrentSubGoal());
});

// ─────────────────────────────────────────────────────────────────────────────
// API Config Overlay
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/overlay-config', (req, res) => {
    res.json(stateManager.getOverlayConfig());
});

app.post('/api/overlay-config', (req, res) => {
    const config = req.body;
    stateManager.setOverlayConfig(config);
    res.json({ success: true, config: stateManager.getOverlayConfig() });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Admin - Mise à jour compteurs
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/update-follows', (req, res) => {
    const { follows } = req.body;
    
    if (typeof follows !== 'number' || follows < 0) {
        return res.status(400).json({ error: 'Invalid follows value' });
    }
    
    stateManager.setFollows(follows, 'admin');
    res.json({ success: true, follows: stateManager.getFollows() });
});

app.post('/api/update-subs', (req, res) => {
    const { subs } = req.body;
    
    if (typeof subs !== 'number' || subs < 0) {
        return res.status(400).json({ error: 'Invalid subs value' });
    }
    
    stateManager.setSubs(subs, 'admin');
    res.json({ success: true, subs: stateManager.getSubs() });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Admin - Actions
// ─────────────────────────────────────────────────────────────────────────────

app.get('/admin/sync-twitch', async (req, res) => {
    // Rate limiting
    if (!rateLimiters.sync.allow()) {
        return res.status(429).json({
            success: false,
            error: 'Rate limited',
            message: 'Attendez avant la prochaine synchro',
            nextResetIn: Math.ceil(rateLimiters.sync.nextResetIn() / 1000)
        });
    }
    
    try {
        const result = await pollingService.syncAll('admin');
        res.json({
            success: result.success,
            twitchFollows: result.follows.value,
            twitchSubs: result.subs.value,
            followsDiff: result.follows.diff,
            subsDiff: result.subs.diff,
            updated: result.follows.diff !== 0 || result.subs.diff !== 0
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/admin/add-follow', (req, res) => {
    const count = parseInt(req.body.count) || 1;
    batchingService.addFollowToBatch(count);
    res.json({ success: true, message: `+${count} follow(s) ajouté(s) au batch` });
});

app.post('/admin/remove-follow', (req, res) => {
    const count = parseInt(req.body.count) || 1;
    batchingService.addFollowRemoveToBatch(count);
    res.json({ success: true, message: `-${count} follow(s) ajouté(s) au batch` });
});

app.post('/admin/add-sub', (req, res) => {
    const count = parseInt(req.body.count) || 1;
    batchingService.addSubToBatch(count);
    res.json({ success: true, message: `+${count} sub(s) ajouté(s) au batch` });
});

app.post('/admin/remove-sub', (req, res) => {
    const count = parseInt(req.body.count) || 1;
    batchingService.addSubEndToBatch(count);
    res.json({ success: true, message: `-${count} sub(s) ajouté(s) au batch` });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Twitch Auth
// ─────────────────────────────────────────────────────────────────────────────

app.get('/twitch/status', (req, res) => {
    res.json(twitchApiService.getConnectionInfo());
});

app.post('/twitch/device-code', async (req, res) => {
    try {
        const data = await twitchApiService.initiateDeviceCodeFlow();
        if (data) {
            res.json({
                success: true,
                userCode: data.user_code,
                verificationUri: data.verification_uri,
                expiresIn: data.expires_in
            });
        } else {
            res.status(500).json({ success: false, error: 'Failed to initiate device code flow' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/twitch/poll-device-code', async (req, res) => {
    try {
        const success = await twitchApiService.pollDeviceCode();
        if (success) {
            // Démarrer EventSub et Polling
            await eventSubService.connect();
            pollingService.start();
            
            res.json({
                success: true,
                authenticated: true,
                ...twitchApiService.getConnectionInfo()
            });
        } else {
            res.json({ success: false, pending: true });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/twitch/disconnect', (req, res) => {
    twitchApiService.disconnect();
    eventSubService.disconnect();
    pollingService.stop();
    res.json({ success: true, message: 'Déconnecté de Twitch' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error Handler
// ─────────────────────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
    logEvent('ERROR', `API Error: ${err.message}`, { path: req.path });
    res.status(err.status || 500).json({ 
        error: err.message || 'Internal server error' 
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DÉMARRAGE DU SERVEUR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
    // 1. Démarrer les serveurs WebSocket
    broadcastService.start(PORTS.WS_COUNTER, PORTS.WS_CONFIG);
    
    // 2. Charger les objectifs
    goalsService.loadAllGoals();
    goalsService.setupWatchers();
    
    // 3. Charger les tokens Twitch
    const hasTokens = await twitchApiService.loadSavedTokens();
    
    if (hasTokens) {
        logEvent('INFO', '🔐 Tokens Twitch chargés, connexion...');
        
        // 4. Connecter EventSub
        await eventSubService.connect();
        
        // 5. Démarrer le polling
        pollingService.start();
    } else {
        logEvent('INFO', '⚙️ Configuration Twitch requise');
        console.log('   → Ouvrez http://localhost:8082/config pour vous connecter');
    }
    
    // 6. Démarrer le serveur HTTP
    const server = app.listen(PORT, () => {
        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log(`   ✅ Serveur HTTP: http://localhost:${PORT}`);
        console.log(`   ✅ WebSocket Compteurs: ws://localhost:${PORTS.WS_COUNTER}`);
        console.log(`   ✅ WebSocket Config: ws://localhost:${PORTS.WS_CONFIG}`);
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('\n💡 ACCÈS :');
        console.log(`   • Dashboard: http://localhost:${PORT}/`);
        console.log(`   • Admin: http://localhost:${PORT}/admin`);
        console.log(`   • Config: http://localhost:${PORT}/config`);
        console.log('\n');
    });
    
    // Marquer l'initialisation terminée
    stateManager.setInitializing(false);
    
    return server;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GESTION ARRÊT PROPRE
// ═══════════════════════════════════════════════════════════════════════════════

function shutdown(signal) {
    console.log(`\n🛑 ${signal} reçu, arrêt propre...`);
    
    // Arrêter les services
    pollingService.stop();
    eventSubService.disconnect();
    broadcastService.stop();
    goalsService.closeWatchers();
    
    // Forcer la persistance
    stateManager.forcePersist();
    
    logEvent('INFO', '✅ Arrêt propre terminé');
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Gestion des erreurs non gérées
process.on('uncaughtException', (error) => {
    logEvent('CRITICAL', '❌ Erreur non gérée', { error: error.message, stack: error.stack });
    console.error('❌ ERREUR NON GÉRÉE:', error.message);
});

process.on('unhandledRejection', (reason) => {
    logEvent('CRITICAL', '❌ Promesse rejetée', { reason: reason?.message || reason });
    console.error('❌ PROMESSE REJETÉE:', reason);
});

// ═══════════════════════════════════════════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════════════════════════════════════════

start().catch((error) => {
    console.error('❌ Erreur au démarrage:', error);
    process.exit(1);
});

// Export pour tests
module.exports = { app, container, stateManager };
