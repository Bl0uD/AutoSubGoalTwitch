/**
 * @file polling-factory.js
 * @description Factory pour le service de polling API Twitch
 * @version 3.1.0
 * 
 * Pattern: Factory avec injection de dépendances
 * Gère le polling périodique de l'API Twitch pour les compteurs
 */

/**
 * Crée le service de polling
 * @param {Object} deps - Dépendances injectées
 * @param {StateManager} deps.stateManager
 * @param {Object} deps.twitchApiService
 * @param {TimerRegistry} deps.timerRegistry
 * @param {Object} deps.logger
 * @param {Object} deps.constants
 * @returns {Object} API du service
 */
function createPollingService({ stateManager, twitchApiService, timerRegistry, logger, constants }) {
    const { logEvent } = logger;
    const { LIMITS } = constants;
    
    const POLLING_INTERVAL = LIMITS.POLLING_INTERVAL || 60000; // 1 minute
    const INITIAL_SYNC_DELAY = 5000; // 5 secondes après démarrage
    
    let isPolling = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // POLLING
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Démarre le polling périodique
     */
    function start() {
        if (isPolling) {
            logEvent('WARN', '⚠️ Polling déjà actif');
            return;
        }
        
        if (!twitchApiService.isAuthenticated()) {
            logEvent('WARN', '⚠️ Non authentifié, polling non démarré');
            return;
        }
        
        isPolling = true;
        stateManager.setPollingActive(true);
        
        // Sync initiale après un court délai
        timerRegistry.setTimeout('initialSync', async () => {
            await syncAll('initial');
        }, INITIAL_SYNC_DELAY);
        
        // Polling périodique
        const interval = timerRegistry.setInterval('polling', async () => {
            await syncAll('polling');
        }, POLLING_INTERVAL);
        
        stateManager.setTimer('followPolling', interval);
        
        logEvent('INFO', `✅ Polling démarré (intervalle: ${POLLING_INTERVAL/1000}s)`);
    }
    
    /**
     * Arrête le polling
     */
    function stop() {
        if (!isPolling) return;
        
        isPolling = false;
        stateManager.setPollingActive(false);
        
        timerRegistry.clearTimeout('initialSync');
        timerRegistry.clearInterval('polling');
        stateManager.clearTimer('followPolling');
        
        logEvent('INFO', '🛑 Polling arrêté');
    }
    
    /**
     * Redémarre le polling
     */
    function restart() {
        stop();
        start();
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SYNCHRONISATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Synchronise tous les compteurs
     * @param {string} source - Source de la sync
     * @returns {Promise<Object>}
     */
    async function syncAll(source = 'manual') {
        if (!twitchApiService.isAuthenticated()) {
            logEvent('WARN', '⚠️ Non authentifié, sync ignorée');
            return { success: false, reason: 'not_authenticated' };
        }
        
        logEvent('INFO', `🔄 Synchronisation ${source}...`);
        
        const [followsResult, subsResult] = await Promise.all([
            twitchApiService.syncFollows(source),
            twitchApiService.syncSubs(source)
        ]);
        
        const result = {
            success: followsResult.success && subsResult.success,
            follows: {
                value: followsResult.data,
                diff: followsResult.diff,
                success: followsResult.success
            },
            subs: {
                value: subsResult.data,
                diff: subsResult.diff,
                success: subsResult.success
            },
            timestamp: new Date().toISOString()
        };
        
        if (result.success) {
            logEvent('INFO', `✅ Sync terminée - Follows: ${result.follows.value}, Subs: ${result.subs.value}`);
        } else {
            logEvent('WARN', '⚠️ Sync partielle ou échouée', result);
        }
        
        return result;
    }
    
    /**
     * Synchronise uniquement les follows
     * @param {string} source
     * @returns {Promise<Object>}
     */
    async function syncFollows(source = 'manual') {
        return await twitchApiService.syncFollows(source);
    }
    
    /**
     * Synchronise uniquement les subs
     * @param {string} source
     * @returns {Promise<Object>}
     */
    async function syncSubs(source = 'manual') {
        return await twitchApiService.syncSubs(source);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DÉTECTION DE CHANGEMENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Vérifie les changements depuis la dernière sync
     * @returns {Promise<Object>}
     */
    async function checkChanges() {
        const lastFollows = stateManager.getLastKnownFollowCount();
        const lastSubs = stateManager.getLastKnownSubCount();
        
        const currentFollows = await twitchApiService.getFollowCount();
        const currentSubs = await twitchApiService.getSubCount();
        
        const changes = {
            follows: {
                previous: lastFollows,
                current: currentFollows,
                diff: currentFollows !== null ? currentFollows - lastFollows : 0,
                changed: currentFollows !== null && currentFollows !== lastFollows
            },
            subs: {
                previous: lastSubs,
                current: currentSubs,
                diff: currentSubs !== null ? currentSubs - lastSubs : 0,
                changed: currentSubs !== null && currentSubs !== lastSubs
            }
        };
        
        if (changes.follows.changed || changes.subs.changed) {
            logEvent('INFO', '📊 Changements détectés', {
                follows: changes.follows.changed ? `${lastFollows} → ${currentFollows}` : 'inchangé',
                subs: changes.subs.changed ? `${lastSubs} → ${currentSubs}` : 'inchangé'
            });
        }
        
        return changes;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITAIRES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @returns {boolean}
     */
    function isActive() {
        return isPolling;
    }
    
    /**
     * Retourne le statut du polling
     * @returns {Object}
     */
    function getStatus() {
        return {
            active: isPolling,
            interval: POLLING_INTERVAL,
            authenticated: twitchApiService.isAuthenticated(),
            lastFollows: stateManager.getLastKnownFollowCount(),
            lastSubs: stateManager.getLastKnownSubCount()
        };
    }
    
    /**
     * Change l'intervalle de polling (nécessite restart)
     * @param {number} interval - Nouvel intervalle en ms
     */
    function setInterval(interval) {
        if (interval < 30000) {
            logEvent('WARN', '⚠️ Intervalle minimum: 30s');
            return;
        }
        
        // Note: L'intervalle est une constante, cette fonction est pour info
        logEvent('INFO', `ℹ️ Pour changer l'intervalle, modifiez LIMITS.POLLING_INTERVAL`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // API PUBLIQUE
    // ═══════════════════════════════════════════════════════════════════════════
    
    return Object.freeze({
        // Lifecycle
        start,
        stop,
        restart,
        isActive,
        
        // Synchronisation
        syncAll,
        syncFollows,
        syncSubs,
        checkChanges,
        
        // Status
        getStatus,
        setInterval
    });
}

module.exports = { createPollingService };
