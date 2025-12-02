/**
 * @file bootstrap.js
 * @description Initialisation de l'application avec injection de dépendances
 * @version 3.1.0
 * 
 * Ce fichier est responsable de:
 * - Créer le container IoC
 * - Enregistrer tous les services
 * - Configurer les dépendances entre services
 * - Retourner le container initialisé
 */

const path = require('path');
const { DependencyContainer } = require('./dependency-container');
const { StateManager, STATE_EVENTS } = require('./state-manager');

// Chemin racine du projet
const ROOT_DIR = path.join(__dirname, '..', '..', '..');

/**
 * Initialise toutes les dépendances de l'application
 * @returns {DependencyContainer} Container configuré
 */
function bootstrap() {
    const container = new DependencyContainer();
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTES ET CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    container.registerInstance('ROOT_DIR', ROOT_DIR);
    
    container.register('constants', () => {
        return require('../utils/constants');
    });
    
    container.register('configCrypto', () => {
        return require('../config-crypto');
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CORE - Logger
    // ═══════════════════════════════════════════════════════════════════════════
    
    container.register('logger', () => {
        const { logger, logEvent, LOG_LEVELS } = require('../utils/logger');
        return { logger, logEvent, LOG_LEVELS };
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CORE - State Manager
    // ═══════════════════════════════════════════════════════════════════════════
    
    container.register('stateManager', (c) => {
        const { loadAppState, saveAppState } = require('../services/app-state');
        const { logEvent } = c.resolve('logger');
        
        // Charger l'état initial depuis app_state.json
        let initialState = {};
        try {
            initialState = loadAppState();
            logEvent('INFO', '✅ État initial chargé depuis app_state.json');
        } catch (error) {
            logEvent('WARN', '⚠️ Impossible de charger app_state.json, utilisation des valeurs par défaut');
        }
        
        // Créer le StateManager avec persistance automatique
        const stateManager = new StateManager(initialState, {
            persistFn: (state) => {
                try {
                    saveAppState(state);
                } catch (error) {
                    logEvent('ERROR', '❌ Erreur persistance état', { error: error.message });
                }
            },
            persistDelay: 1000
        });
        
        logEvent('INFO', '✅ StateManager initialisé');
        return stateManager;
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITAIRES
    // ═══════════════════════════════════════════════════════════════════════════
    
    container.register('timerRegistry', () => {
        const { TimerRegistry } = require('../utils/timer-registry');
        return new TimerRegistry();
    });
    
    container.register('eventQueue', () => {
        const { EventQueue } = require('../utils/event-queue');
        return new EventQueue();
    });
    
    container.register('rateLimiters', () => {
        const { SimpleRateLimiter } = require('../utils/rate-limiter');
        return {
            sync: new SimpleRateLimiter(10, 60000),   // 10 syncs par minute
            admin: new SimpleRateLimiter(20, 60000),  // 20 actions admin par minute
            api: new SimpleRateLimiter(60, 60000)     // 60 appels API par minute
        };
    });
    
    container.register('validation', () => {
        return require('../utils/validation');
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SERVICES - Files
    // ═══════════════════════════════════════════════════════════════════════════
    
    container.register('filesService', (c) => {
        const filesModule = require('../services/files');
        const stateManager = c.resolve('stateManager');
        
        // Wrapper pour synchroniser avec StateManager
        return {
            ...filesModule,
            
            // Override pour utiliser StateManager
            getCounters: () => stateManager.getCounters(),
            setCounters: (follows, subs) => {
                stateManager.setFollows(follows, 'filesService');
                stateManager.setSubs(subs, 'filesService');
            },
            getOverlayConfig: () => stateManager.getOverlayConfig(),
            updateOverlayConfig: (config) => stateManager.updateOverlayConfig(config)
        };
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SERVICES - Goals
    // ═══════════════════════════════════════════════════════════════════════════
    
    container.register('goalsService', (c) => {
        const { createGoalsService } = require('./factories/goals-factory');
        return createGoalsService({
            stateManager: c.resolve('stateManager'),
            logger: c.resolve('logger'),
            ROOT_DIR: c.resolve('ROOT_DIR')
        });
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SERVICES - Broadcast
    // ═══════════════════════════════════════════════════════════════════════════
    
    container.register('broadcastService', (c) => {
        const { createBroadcastService } = require('./factories/broadcast-factory');
        return createBroadcastService({
            stateManager: c.resolve('stateManager'),
            logger: c.resolve('logger'),
            constants: c.resolve('constants')
        });
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SERVICES - Batching
    // ═══════════════════════════════════════════════════════════════════════════
    
    container.register('batchingService', (c) => {
        const { createBatchingService } = require('./factories/batching-factory');
        return createBatchingService({
            stateManager: c.resolve('stateManager'),
            timerRegistry: c.resolve('timerRegistry'),
            broadcastService: c.resolve('broadcastService'),
            logger: c.resolve('logger'),
            constants: c.resolve('constants')
        });
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SERVICES - Twitch API
    // ═══════════════════════════════════════════════════════════════════════════
    
    container.register('twitchApiService', (c) => {
        const { createTwitchApiService } = require('./factories/twitch-api-factory');
        return createTwitchApiService({
            stateManager: c.resolve('stateManager'),
            configCrypto: c.resolve('configCrypto'),
            logger: c.resolve('logger'),
            constants: c.resolve('constants'),
            ROOT_DIR: c.resolve('ROOT_DIR')
        });
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SERVICES - EventSub
    // ═══════════════════════════════════════════════════════════════════════════
    
    container.register('eventSubService', (c) => {
        const { createEventSubService } = require('./factories/eventsub-factory');
        return createEventSubService({
            stateManager: c.resolve('stateManager'),
            twitchApiService: c.resolve('twitchApiService'),
            batchingService: c.resolve('batchingService'),
            timerRegistry: c.resolve('timerRegistry'),
            logger: c.resolve('logger'),
            constants: c.resolve('constants')
        });
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SERVICES - Polling
    // ═══════════════════════════════════════════════════════════════════════════
    
    container.register('pollingService', (c) => {
        const { createPollingService } = require('./factories/polling-factory');
        return createPollingService({
            stateManager: c.resolve('stateManager'),
            twitchApiService: c.resolve('twitchApiService'),
            timerRegistry: c.resolve('timerRegistry'),
            logger: c.resolve('logger'),
            constants: c.resolve('constants')
        });
    });
    
    return container;
}

/**
 * Configure les listeners d'événements entre services
 * @param {DependencyContainer} container
 */
function setupEventListeners(container) {
    const stateManager = container.resolve('stateManager');
    const broadcastService = container.resolve('broadcastService');
    const { logEvent } = container.resolve('logger');
    
    // ─────────────────────────────────────────────────────────────────────────
    // Compteurs → Broadcast
    // ─────────────────────────────────────────────────────────────────────────
    
    stateManager.on(STATE_EVENTS.FOLLOWS_UPDATED, (data) => {
        logEvent('INFO', `📊 Follows: ${data.oldValue} → ${data.newValue} (${data.diff > 0 ? '+' : ''}${data.diff})`);
        broadcastService.broadcastFollowUpdate(data.diff);
    });
    
    stateManager.on(STATE_EVENTS.SUBS_UPDATED, (data) => {
        logEvent('INFO', `📊 Subs: ${data.oldValue} → ${data.newValue} (${data.diff > 0 ? '+' : ''}${data.diff})`);
        broadcastService.broadcastSubUpdate(data.diff);
    });
    
    // ─────────────────────────────────────────────────────────────────────────
    // Objectifs → Broadcast
    // ─────────────────────────────────────────────────────────────────────────
    
    stateManager.on(STATE_EVENTS.GOALS_CHANGED, (data) => {
        logEvent('INFO', `🎯 Objectifs ${data.type} mis à jour: ${data.count} objectifs`);
        broadcastService.broadcastFollowUpdate();
        broadcastService.broadcastSubUpdate();
    });
    
    // ─────────────────────────────────────────────────────────────────────────
    // Configuration Overlay → Broadcast
    // ─────────────────────────────────────────────────────────────────────────
    
    stateManager.on(STATE_EVENTS.OVERLAY_CONFIG_CHANGED, (config) => {
        logEvent('INFO', '🎨 Configuration overlay mise à jour');
        broadcastService.broadcastConfigUpdate();
    });
    
    // ─────────────────────────────────────────────────────────────────────────
    // Connexions
    // ─────────────────────────────────────────────────────────────────────────
    
    stateManager.on(STATE_EVENTS.EVENTSUB_CONNECTED, (data) => {
        logEvent('INFO', `✅ EventSub connecté (session: ${data.sessionId})`);
    });
    
    stateManager.on(STATE_EVENTS.EVENTSUB_DISCONNECTED, () => {
        logEvent('WARN', '⚠️ EventSub déconnecté');
    });
    
    stateManager.on(STATE_EVENTS.CLIENT_CONNECTED, (data) => {
        logEvent('INFO', `👤 Client connecté (total: ${data.count})`);
    });
    
    // ─────────────────────────────────────────────────────────────────────────
    // Erreurs
    // ─────────────────────────────────────────────────────────────────────────
    
    stateManager.on(STATE_EVENTS.ERROR, (error) => {
        logEvent('ERROR', `❌ Erreur StateManager: ${error.message}`, error);
    });
    
    logEvent('INFO', '✅ Event listeners configurés');
}

module.exports = { 
    bootstrap, 
    setupEventListeners,
    ROOT_DIR,
    STATE_EVENTS
};
