/**
 * @file broadcast-factory.js
 * @description Factory pour le service de diffusion WebSocket
 * @version 3.1.0
 * 
 * Pattern: Factory avec injection de dépendances
 * Gère les connexions WebSocket clients et la diffusion des mises à jour
 */

const WebSocket = require('ws');

/**
 * Crée le service de diffusion WebSocket
 * @param {Object} deps - Dépendances injectées
 * @param {StateManager} deps.stateManager
 * @param {Object} deps.logger
 * @param {Object} deps.constants
 * @returns {Object} API du service
 */
function createBroadcastService({ stateManager, logger, constants }) {
    const { logEvent } = logger;
    const { PORTS } = constants;
    
    let wssCounter = null;  // WebSocket Server pour les compteurs
    let wssConfig = null;   // WebSocket Server pour la config
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALISATION SERVEURS WEBSOCKET
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Démarre les serveurs WebSocket
     * @param {number} counterPort - Port pour les compteurs (8083)
     * @param {number} configPort - Port pour la config (8084)
     */
    function start(counterPort = PORTS.WS_COUNTER, configPort = PORTS.WS_CONFIG) {
        // Serveur compteurs
        wssCounter = new WebSocket.Server({ port: counterPort });
        
        wssCounter.on('connection', (ws) => {
            stateManager.incrementClientCount();
            logEvent('INFO', `👤 Client compteur connecté (total: ${stateManager.getClientCount()})`);
            
            // Envoyer les données initiales
            sendInitialData(ws);
            
            ws.on('close', () => {
                stateManager.decrementClientCount();
                logEvent('INFO', `👤 Client compteur déconnecté (total: ${stateManager.getClientCount()})`);
            });
            
            ws.on('error', (error) => {
                logEvent('ERROR', '❌ Erreur WebSocket client', { error: error.message });
            });
        });
        
        logEvent('INFO', `✅ WebSocket Compteurs démarré sur le port ${counterPort}`);
        
        // Serveur config
        wssConfig = new WebSocket.Server({ port: configPort });
        
        wssConfig.on('connection', (ws) => {
            logEvent('INFO', '👤 Client config connecté');
            
            // Envoyer la config initiale
            sendInitialConfig(ws);
            
            ws.on('error', (error) => {
                logEvent('ERROR', '❌ Erreur WebSocket config', { error: error.message });
            });
        });
        
        logEvent('INFO', `✅ WebSocket Config démarré sur le port ${configPort}`);
        
        // Stocker les références dans le StateManager
        stateManager.setWsServers(wssCounter, wssConfig);
    }
    
    /**
     * Arrête les serveurs WebSocket
     */
    function stop() {
        if (wssCounter) {
            wssCounter.close();
            logEvent('INFO', '🔒 WebSocket Compteurs arrêté');
        }
        if (wssConfig) {
            wssConfig.close();
            logEvent('INFO', '🔒 WebSocket Config arrêté');
        }
        stateManager.setWsServers(null, null);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ENVOI DONNÉES INITIALES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Envoie les données initiales à un client compteur
     * @param {WebSocket} ws
     */
    function sendInitialData(ws) {
        if (ws.readyState !== WebSocket.OPEN) return;
        
        const currentFollowGoal = stateManager.getCurrentFollowGoal();
        const currentSubGoal = stateManager.getCurrentSubGoal();
        
        const data = {
            type: 'init',
            follows: stateManager.getFollows(),
            subs: stateManager.getSubs(),
            followGoal: currentFollowGoal,
            subGoal: currentSubGoal,
            timestamp: new Date().toISOString()
        };
        
        try {
            ws.send(JSON.stringify(data));
        } catch (error) {
            logEvent('ERROR', '❌ Erreur envoi données initiales', { error: error.message });
        }
    }
    
    /**
     * Envoie la config initiale à un client config
     * @param {WebSocket} ws
     */
    function sendInitialConfig(ws) {
        if (ws.readyState !== WebSocket.OPEN) return;
        
        const config = stateManager.getOverlayConfig();
        
        try {
            ws.send(JSON.stringify({
                type: 'config',
                config: config
            }));
        } catch (error) {
            logEvent('ERROR', '❌ Erreur envoi config initiale', { error: error.message });
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BROADCAST - Compteurs
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Broadcast mise à jour follows à tous les clients
     * @param {number} [batchCount] - Nombre groupé (pour animation)
     */
    function broadcastFollowUpdate(batchCount = null) {
        if (!wssCounter) return;
        
        const currentFollowGoal = stateManager.getCurrentFollowGoal();
        
        const message = JSON.stringify({
            type: 'follow_update',
            follows: stateManager.getFollows(),
            followGoal: currentFollowGoal,
            batchCount: batchCount,
            timestamp: new Date().toISOString()
        });
        
        let sentCount = 0;
        wssCounter.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                    sentCount++;
                } catch (error) {
                    logEvent('ERROR', '❌ Erreur broadcast follow', { error: error.message });
                }
            }
        });
        
        if (sentCount > 0) {
            logEvent('INFO', `📡 Broadcast follow envoyé à ${sentCount} clients`);
        }
    }
    
    /**
     * Broadcast mise à jour subs à tous les clients
     * @param {number} [batchCount] - Nombre groupé (pour animation)
     */
    function broadcastSubUpdate(batchCount = null) {
        if (!wssCounter) return;
        
        const currentSubGoal = stateManager.getCurrentSubGoal();
        
        const message = JSON.stringify({
            type: 'sub_update',
            subs: stateManager.getSubs(),
            subGoal: currentSubGoal,
            batchCount: batchCount,
            timestamp: new Date().toISOString()
        });
        
        let sentCount = 0;
        wssCounter.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                    sentCount++;
                } catch (error) {
                    logEvent('ERROR', '❌ Erreur broadcast sub', { error: error.message });
                }
            }
        });
        
        if (sentCount > 0) {
            logEvent('INFO', `📡 Broadcast sub envoyé à ${sentCount} clients`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BROADCAST - Configuration
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Broadcast mise à jour config à tous les clients config
     */
    function broadcastConfigUpdate() {
        if (!wssConfig) return;
        
        const config = stateManager.getOverlayConfig();
        
        const message = JSON.stringify({
            type: 'config_update',
            config: config,
            timestamp: new Date().toISOString()
        });
        
        let sentCount = 0;
        wssConfig.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                    sentCount++;
                } catch (error) {
                    logEvent('ERROR', '❌ Erreur broadcast config', { error: error.message });
                }
            }
        });
        
        if (sentCount > 0) {
            logEvent('INFO', `📡 Broadcast config envoyé à ${sentCount} clients`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BROADCAST - Tous les clients
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Broadcast un message personnalisé à tous les clients compteur
     * @param {Object} data
     */
    function broadcastToCounterClients(data) {
        if (!wssCounter) return;
        
        const message = JSON.stringify(data);
        
        wssCounter.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                } catch (error) {
                    logEvent('ERROR', '❌ Erreur broadcast custom', { error: error.message });
                }
            }
        });
    }
    
    /**
     * Broadcast un message personnalisé à tous les clients config
     * @param {Object} data
     */
    function broadcastToConfigClients(data) {
        if (!wssConfig) return;
        
        const message = JSON.stringify(data);
        
        wssConfig.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                } catch (error) {
                    logEvent('ERROR', '❌ Erreur broadcast config custom', { error: error.message });
                }
            }
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITAIRES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @returns {number} Nombre de clients compteur connectés
     */
    function getCounterClientCount() {
        return wssCounter ? wssCounter.clients.size : 0;
    }
    
    /**
     * @returns {number} Nombre de clients config connectés
     */
    function getConfigClientCount() {
        return wssConfig ? wssConfig.clients.size : 0;
    }
    
    /**
     * @returns {boolean} true si les serveurs sont démarrés
     */
    function isRunning() {
        return wssCounter !== null && wssConfig !== null;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // API PUBLIQUE
    // ═══════════════════════════════════════════════════════════════════════════
    
    return Object.freeze({
        // Lifecycle
        start,
        stop,
        isRunning,
        
        // Initial data
        sendInitialData,
        sendInitialConfig,
        
        // Broadcast compteurs
        broadcastFollowUpdate,
        broadcastSubUpdate,
        
        // Broadcast config
        broadcastConfigUpdate,
        
        // Broadcast custom
        broadcastToCounterClients,
        broadcastToConfigClients,
        
        // Stats
        getCounterClientCount,
        getConfigClientCount,
        
        // Accès direct (pour compatibilité)
        getWssCounter: () => wssCounter,
        getWssConfig: () => wssConfig
    });
}

module.exports = { createBroadcastService };
