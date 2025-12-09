/**
 * @file polling-factory.js
 * @description Factory pour le service de polling API Twitch
 * @version 3.1.0
 * 
 * Pattern: Factory avec injection de dépendances
 * Gère le polling périodique de l'API Twitch pour les compteurs
 * 
 * Stratégie:
 * - Follows: Polling toutes les 10s (pas d'événement unfollow dans EventSub)
 * - Subs: Polling toutes les 60s (EventSub gère les événements temps réel)
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
    
    // Intervalles différents pour follows et subs
    const POLLING_INTERVAL_FOLLOWS = LIMITS.POLLING_INTERVAL_FOLLOWS || 10000; // 10s pour unfollows
    const POLLING_INTERVAL_SUBS = LIMITS.POLLING_INTERVAL_SUBS || 60000;       // 60s pour subs (EventSub gère le temps réel)
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
        
        // Polling follows toutes les 10 secondes (pour détecter unfollows)
        timerRegistry.setInterval('pollingFollows', async () => {
            await syncFollowsOnly('polling');
        }, POLLING_INTERVAL_FOLLOWS);
        
        // Polling subs toutes les 60 secondes (backup pour EventSub)
        timerRegistry.setInterval('pollingSubs', async () => {
            await syncSubsOnly('polling');
        }, POLLING_INTERVAL_SUBS);
        
        logEvent('INFO', `✅ Polling démarré (follows: ${POLLING_INTERVAL_FOLLOWS/1000}s, subs: ${POLLING_INTERVAL_SUBS/1000}s)`);
    }
    
    /**
     * Arrête le polling
     */
    function stop() {
        if (!isPolling) return;
        
        isPolling = false;
        stateManager.setPollingActive(false);
        
        timerRegistry.clearTimeout('initialSync');
        timerRegistry.clearInterval('pollingFollows');
        timerRegistry.clearInterval('pollingSubs');
        
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
     * @param {boolean} forceSync - Force la sync même en mode session (pour admin)
     * @returns {Promise<Object>}
     */
    async function syncAll(source = 'manual', forceSync = false) {
        if (!twitchApiService.isAuthenticated()) {
            logEvent('WARN', '⚠️ Non authentifié, sync ignorée');
            return { success: false, reason: 'not_authenticated' };
        }
        
        // En mode session, seule la première sync (initial) est autorisée
        // Les syncs manuelles (admin, dashboard) sont permises si forceSync=true
        if (stateManager.isSessionMode() && source !== 'initial' && !forceSync) {
            logEvent('INFO', `🔒 Sync ignorée (mode session, source: ${source})`);
            return { success: true, skipped: true, reason: 'session_mode' };
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
     * Synchronise uniquement les follows (appelé toutes les 10s)
     * En mode SESSION, on ne synchronise PAS pour éviter que le compteur ne descende
     * @param {string} source
     * @returns {Promise<Object>}
     */
    async function syncFollowsOnly(source = 'polling') {
        if (!twitchApiService.isAuthenticated()) return { success: false };
        
        // En mode session, on ne synchronise pas les follows (on garde les gains)
        if (stateManager.isSessionMode()) {
            return { success: true, skipped: true, reason: 'session_mode' };
        }
        
        const result = await twitchApiService.syncFollows(source);
        if (result.diff !== 0) {
            logEvent('INFO', `📊 Follows sync: ${result.diff > 0 ? '+' : ''}${result.diff} (total: ${result.data})`);
        }
        return result;
    }
    
    /**
     * Synchronise uniquement les subs (appelé toutes les 60s - backup EventSub)
     * En mode SESSION, on ne synchronise PAS pour éviter de perdre les subs "gagnés"
     * @param {string} source
     * @returns {Promise<Object>}
     */
    async function syncSubsOnly(source = 'polling') {
        if (!twitchApiService.isAuthenticated()) return { success: false };
        
        // En mode session, on ne synchronise pas les subs (on garde les gains)
        if (stateManager.isSessionMode()) {
            return { success: true, skipped: true, reason: 'session_mode' };
        }
        
        const result = await twitchApiService.syncSubs(source);
        if (result.diff !== 0) {
            logEvent('INFO', `📊 Subs sync: ${result.diff > 0 ? '+' : ''}${result.diff} (total: ${result.data})`);
        }
        return result;
    }
    
    /**
     * Synchronise uniquement les follows (API publique)
     * Respecte le mode session : en mode session, retourne le compteur actuel sans sync
     * @param {string} source
     * @param {boolean} forceSync - Force la sync même en mode session
     * @returns {Promise<Object>}
     */
    async function syncFollows(source = 'manual', forceSync = false) {
        if (stateManager.isSessionMode() && !forceSync) {
            logEvent('INFO', `🔒 Sync follows ignorée (mode session)`);
            return { success: true, skipped: true, reason: 'session_mode', data: stateManager.getFollows() };
        }
        return await twitchApiService.syncFollows(source);
    }
    
    /**
     * Synchronise uniquement les subs (API publique)
     * Respecte le mode session : en mode session, retourne le compteur actuel sans sync
     * @param {string} source
     * @param {boolean} forceSync - Force la sync même en mode session
     * @returns {Promise<Object>}
     */
    async function syncSubs(source = 'manual', forceSync = false) {
        if (stateManager.isSessionMode() && !forceSync) {
            logEvent('INFO', `🔒 Sync subs ignorée (mode session)`);
            return { success: true, skipped: true, reason: 'session_mode', data: stateManager.getSubs() };
        }
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
            intervals: {
                follows: POLLING_INTERVAL_FOLLOWS,
                subs: POLLING_INTERVAL_SUBS
            },
            authenticated: twitchApiService.isAuthenticated(),
            lastFollows: stateManager.getLastKnownFollowCount(),
            lastSubs: stateManager.getLastKnownSubCount()
        };
    }
    
    /**
     * Change l'intervalle de polling (info seulement)
     * @param {number} interval - Nouvel intervalle en ms
     */
    function setInterval(interval) {
        logEvent('INFO', `ℹ️ Pour changer les intervalles, modifiez LIMITS.POLLING_INTERVAL_FOLLOWS et LIMITS.POLLING_INTERVAL_SUBS`);
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
