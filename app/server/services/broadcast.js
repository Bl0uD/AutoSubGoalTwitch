/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📡 SERVICE DE DIFFUSION WEBSOCKET
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ce service gère la diffusion des mises à jour aux clients WebSocket.
 * Il centralise toutes les fonctions de broadcast pour les follows, subs
 * et configurations des overlays.
 * 
 * @requires WebSocket - Serveurs WebSocket passés via context
 * @requires utils/logger - Logging centralisé
 * @requires utils/constants - Limites et constantes
 */

const { logEvent, LIMITS } = require('../utils');

/**
 * Factory function pour créer le service de broadcast
 * 
 * @param {Object} context - Contexte d'application
 * @param {WebSocket.Server} context.wss - Serveur WebSocket principal (port 8083)
 * @param {WebSocket.Server} context.overlayWss - Serveur WebSocket overlays (port 8084)
 * @param {Set} context.overlayClients - Set des clients overlay connectés
 * @param {Function} context.getCurrentFollowGoal - Fonction pour obtenir l'objectif follow actuel
 * @param {Function} context.getCurrentSubGoal - Fonction pour obtenir l'objectif sub actuel
 * @param {Function} context.getOverlayConfig - Fonction pour obtenir la config overlay
 * @param {Function} context.getCurrentFollows - Getter pour le compteur follows actuel
 * @param {Function} context.getCurrentSubs - Getter pour le compteur subs actuel
 * @returns {Object} Service de broadcast
 */
function createBroadcastService(context) {
    const {
        wss,
        overlayWss,
        overlayClients,
        getCurrentFollowGoal,
        getCurrentSubGoal,
        getOverlayConfig,
        getCurrentFollows,
        getCurrentSubs
    } = context;

    const WebSocket = require('ws');

    /**
     * Diffuse les mises à jour de follows aux clients WebSocket
     * @param {number} batchCount - Nombre de follows groupés (négatif pour unfollows)
     */
    function broadcastFollowUpdate(batchCount = 1) {
        const currentFollows = getCurrentFollows();
        const isRemoval = batchCount < 0;
        const absCount = Math.abs(batchCount);
        const data = {
            type: 'follow_update',
            count: currentFollows,
            goal: getCurrentFollowGoal(currentFollows),
            batchCount: batchCount,
            isBatch: absCount > 1,
            isRemoval: isRemoval
        };
        
        const message = JSON.stringify(data);
        const droppedClients = [];
        let successCount = 0;
        
        wss.clients.forEach(client => {
            if (client.readyState !== WebSocket.OPEN) return;
            
            // Vérifier la backpressure (saturation du buffer)
            if (client.bufferedAmount > LIMITS.WEBSOCKET_BUFFER_LIMIT) {
                logEvent('WARN', '⚠️ WebSocket saturé, skip envoi', {
                    bufferedAmount: client.bufferedAmount,
                    limit: LIMITS.WEBSOCKET_BUFFER_LIMIT
                });
                droppedClients.push(client);
                return;
            }
            
            client.send(message, (err) => {
                if (err) {
                    logEvent('ERROR', 'Erreur envoi WebSocket:', { error: err.message });
                } else {
                    successCount++;
                }
            });
        });
        
        if (droppedClients.length > 0) {
            logEvent('WARN', `⚠️ ${droppedClients.length} clients ignorés (saturés)`);
        }
        
        logEvent('INFO', `📡 Follow update diffusé à ${successCount}/${wss.clients.size} clients`);
    }

    /**
     * Diffuse les mises à jour de subs aux clients WebSocket
     * @param {number} batchCount - Nombre de subs groupés (négatif pour unsubs)
     * @param {Object} tiers - Détails des tiers groupés
     */
    function broadcastSubUpdate(batchCount = 1, tiers = {}) {
        const currentSubs = getCurrentSubs();
        const isRemoval = batchCount < 0;
        const absCount = Math.abs(batchCount);
        const data = {
            type: 'sub_update',
            count: currentSubs,
            goal: getCurrentSubGoal(currentSubs),
            batchCount: batchCount,
            isBatch: absCount > 1,
            isRemoval: isRemoval,
            tiers: tiers
        };
        
        const message = JSON.stringify(data);
        const droppedClients = [];
        let successCount = 0;
        
        wss.clients.forEach(client => {
            if (client.readyState !== WebSocket.OPEN) return;
            
            // Vérifier la backpressure
            if (client.bufferedAmount > LIMITS.WEBSOCKET_BUFFER_LIMIT) {
                logEvent('WARN', '⚠️ WebSocket saturé, skip envoi', {
                    bufferedAmount: client.bufferedAmount,
                    limit: LIMITS.WEBSOCKET_BUFFER_LIMIT
                });
                droppedClients.push(client);
                return;
            }
            
            client.send(message, (err) => {
                if (err) {
                    logEvent('ERROR', 'Erreur envoi WebSocket:', { error: err.message });
                } else {
                    successCount++;
                }
            });
        });
        
        if (droppedClients.length > 0) {
            logEvent('WARN', `⚠️ ${droppedClients.length} clients ignorés (saturés)`);
        }
        
        logEvent('INFO', `📡 Sub update diffusé à ${successCount}/${wss.clients.size} clients`);
    }

    /**
     * Diffuse les mises à jour de configuration aux overlays
     */
    function broadcastConfigUpdate() {
        const overlayConfig = getOverlayConfig();
        const message = JSON.stringify({
            type: 'config_update',
            config: overlayConfig
        });
        
        let successCount = 0;
        const clientsToRemove = [];
        
        overlayClients.forEach(client => {
            try {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                    successCount++;
                } else {
                    clientsToRemove.push(client);
                }
            } catch (error) {
                logEvent('ERROR', '❌ Erreur envoi config à un client', { error: error.message });
                clientsToRemove.push(client);
            }
        });
        
        // Nettoyer les clients déconnectés
        clientsToRemove.forEach(client => overlayClients.delete(client));
        
        logEvent('INFO', `📡 Config diffusée à ${successCount}/${overlayClients.size} overlays`);
    }

    /**
     * Envoie les données initiales à un nouveau client WebSocket
     * @param {WebSocket} ws - Client WebSocket
     */
    function sendInitialData(ws) {
        const currentFollows = getCurrentFollows();
        const currentSubs = getCurrentSubs();
        
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
    }

    /**
     * Envoie la configuration initiale à un nouveau client overlay
     * @param {WebSocket} ws - Client WebSocket overlay
     */
    function sendInitialConfig(ws) {
        const overlayConfig = getOverlayConfig();
        ws.send(JSON.stringify({
            type: 'config_update',
            config: overlayConfig
        }));
    }

    /**
     * Obtient les statistiques de connexion WebSocket
     * @returns {Object} Statistiques des connexions
     */
    function getConnectionStats() {
        let mainConnected = 0;
        let mainReady = 0;
        
        wss.clients.forEach(client => {
            mainConnected++;
            if (client.readyState === WebSocket.OPEN) {
                mainReady++;
            }
        });

        return {
            main: {
                total: mainConnected,
                ready: mainReady
            },
            overlay: {
                total: overlayClients.size
            }
        };
    }

    return {
        broadcastFollowUpdate,
        broadcastSubUpdate,
        broadcastConfigUpdate,
        sendInitialData,
        sendInitialConfig,
        getConnectionStats
    };
}

module.exports = { createBroadcastService };
