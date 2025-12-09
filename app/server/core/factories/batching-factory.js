/**
 * @file batching-factory.js
 * @description Factory pour le service de batching des événements
 * @version 3.1.2
 * 
 * Pattern: Factory avec injection de dépendances
 * Gère l'accumulation et le traitement groupé des événements pour synchroniser
 * avec les animations overlay
 */

/**
 * Crée le service de batching
 * @param {Object} deps - Dépendances injectées
 * @param {StateManager} deps.stateManager
 * @param {TimerRegistry} deps.timerRegistry
 * @param {Object} deps.broadcastService
 * @param {Object} deps.logger
 * @param {Object} deps.constants
 * @returns {Object} API du service
 */
function createBatchingService({ stateManager, timerRegistry, broadcastService, logger, constants }) {
    const { logEvent } = logger;
    const { LIMITS } = constants;
    
    const BATCH_DELAY = LIMITS.BATCH_DELAY || 300;
    const ANIMATION_DURATION = LIMITS.ANIMATION_DURATION || 1500;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BATCHING FOLLOWS - AJOUT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Ajoute un follow au batch avec synchronisation animations
     * @param {number} count - Nombre de follows à ajouter
     */
    function addFollowToBatch(count = 1) {
        const batch = stateManager.getBatch('follow');
        stateManager.addToBatch('follow', count);
        
        // Si animation en cours, juste accumuler
        if (batch.isAnimating) {
            logEvent('INFO', `⏳ Animation en cours - Accumulation follows: ${stateManager.getBatch('follow').count}`);
            return;
        }
        
        // Programmer le flush
        timerRegistry.clearTimeout('followBatch');
        const timer = timerRegistry.setTimeout('followBatch', () => {
            flushFollowBatch();
        }, BATCH_DELAY);
        
        stateManager.setBatchTimer('follow', timer);
        logEvent('INFO', `🔥 Follow ajouté au batch: ${stateManager.getBatch('follow').count} (flush dans ${BATCH_DELAY}ms)`);
    }
    
    /**
     * Traite et envoie le batch de follows accumulés
     */
    function flushFollowBatch() {
        const batch = stateManager.getBatch('follow');
        if (batch.count === 0) return;
        
        const batchCount = stateManager.resetBatch('follow');
        
        // Marquer animation en cours
        stateManager.setBatchAnimating('follow', true);
        
        // Mettre à jour le compteur
        stateManager.incrementFollows(batchCount, 'batch');
        stateManager.setLastKnownFollowCount(stateManager.getFollows());
        
        // Broadcast avec le nombre groupé
        broadcastService.broadcastFollowUpdate(batchCount);
        
        logEvent('INFO', `🎬 Animation follows: +${batchCount} (Total: ${stateManager.getFollows()}) - Durée: ${ANIMATION_DURATION}ms`);
        
        // Après l'animation, traiter les événements accumulés
        timerRegistry.setTimeout('followAnimation', () => {
            stateManager.setBatchAnimating('follow', false);
            logEvent('INFO', `✅ Animation follows terminée - Batch actuel: ${stateManager.getBatch('follow').count}`);
            
            // Flush automatique si nouveaux événements
            if (stateManager.getBatch('follow').count > 0) {
                logEvent('INFO', `📄 Flush automatique: ${stateManager.getBatch('follow').count} follows`);
                flushFollowBatch();
            }
        }, ANIMATION_DURATION);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BATCHING FOLLOWS - RETRAIT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Ajoute un unfollow au batch
     * @param {number} count - Nombre d'unfollows
     */
    function addFollowRemoveToBatch(count = 1) {
        const batch = stateManager.getBatch('followRemove');
        stateManager.addToBatch('followRemove', count);
        
        if (batch.isAnimating) {
            logEvent('INFO', `⏳ Animation en cours - Accumulation unfollows: ${stateManager.getBatch('followRemove').count}`);
            return;
        }
        
        timerRegistry.clearTimeout('followRemoveBatch');
        const timer = timerRegistry.setTimeout('followRemoveBatch', () => {
            flushFollowRemoveBatch();
        }, BATCH_DELAY);
        
        stateManager.setBatchTimer('followRemove', timer);
        logEvent('INFO', `🔥 Unfollow ajouté au batch: ${stateManager.getBatch('followRemove').count}`);
    }
    
    /**
     * Traite le batch d'unfollows
     */
    function flushFollowRemoveBatch() {
        const batch = stateManager.getBatch('followRemove');
        if (batch.count === 0) return;
        
        const batchCount = stateManager.resetBatch('followRemove');
        
        stateManager.setBatchAnimating('followRemove', true);
        stateManager.decrementFollows(batchCount, 'batch');
        stateManager.setLastKnownFollowCount(stateManager.getFollows());
        
        broadcastService.broadcastFollowUpdate(-batchCount);
        
        logEvent('INFO', `🎬 Animation unfollows: -${batchCount} (Total: ${stateManager.getFollows()})`);
        
        timerRegistry.setTimeout('followRemoveAnimation', () => {
            stateManager.setBatchAnimating('followRemove', false);
            
            if (stateManager.getBatch('followRemove').count > 0) {
                flushFollowRemoveBatch();
            }
        }, ANIMATION_DURATION);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BATCHING SUBS - AJOUT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Ajoute un sub au batch
     * @param {number} count - Nombre de subs à ajouter
     */
    function addSubToBatch(count = 1) {
        const batch = stateManager.getBatch('sub');
        stateManager.addToBatch('sub', count);
        
        if (batch.isAnimating) {
            logEvent('INFO', `⏳ Animation en cours - Accumulation subs: ${stateManager.getBatch('sub').count}`);
            return;
        }
        
        timerRegistry.clearTimeout('subBatch');
        const timer = timerRegistry.setTimeout('subBatch', () => {
            flushSubBatch();
        }, BATCH_DELAY);
        
        stateManager.setBatchTimer('sub', timer);
        logEvent('INFO', `🔥 Sub ajouté au batch: ${stateManager.getBatch('sub').count}`);
    }
    
    /**
     * Traite le batch de subs
     */
    function flushSubBatch() {
        const batch = stateManager.getBatch('sub');
        if (batch.count === 0) return;
        
        const batchCount = stateManager.resetBatch('sub');
        
        stateManager.setBatchAnimating('sub', true);
        stateManager.incrementSubs(batchCount, 'batch');
        stateManager.setLastKnownSubCount(stateManager.getSubs());
        
        broadcastService.broadcastSubUpdate(batchCount);
        
        logEvent('INFO', `🎬 Animation subs: +${batchCount} (Total: ${stateManager.getSubs()})`);
        
        timerRegistry.setTimeout('subAnimation', () => {
            stateManager.setBatchAnimating('sub', false);
            
            if (stateManager.getBatch('sub').count > 0) {
                flushSubBatch();
            }
        }, ANIMATION_DURATION);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BATCHING SUBS - FIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Ajoute une fin de sub au batch
     * @param {number} count - Nombre de fins de sub
     */
    function addSubEndToBatch(count = 1) {
        const batch = stateManager.getBatch('subEnd');
        stateManager.addToBatch('subEnd', count);
        
        if (batch.isAnimating) {
            logEvent('INFO', `⏳ Animation en cours - Accumulation fin subs: ${stateManager.getBatch('subEnd').count}`);
            return;
        }
        
        timerRegistry.clearTimeout('subEndBatch');
        const timer = timerRegistry.setTimeout('subEndBatch', () => {
            flushSubEndBatch();
        }, BATCH_DELAY);
        
        stateManager.setBatchTimer('subEnd', timer);
        logEvent('INFO', `🔥 Fin sub ajoutée au batch: ${stateManager.getBatch('subEnd').count}`);
    }
    
    /**
     * Traite le batch de fins de sub
     */
    function flushSubEndBatch() {
        const batch = stateManager.getBatch('subEnd');
        if (batch.count === 0) return;
        
        const batchCount = stateManager.resetBatch('subEnd');
        
        stateManager.setBatchAnimating('subEnd', true);
        stateManager.decrementSubs(batchCount, 'batch');
        stateManager.setLastKnownSubCount(stateManager.getSubs());
        
        broadcastService.broadcastSubUpdate(-batchCount);
        
        logEvent('INFO', `🎬 Animation fin subs: -${batchCount} (Total: ${stateManager.getSubs()})`);
        
        timerRegistry.setTimeout('subEndAnimation', () => {
            stateManager.setBatchAnimating('subEnd', false);
            
            if (stateManager.getBatch('subEnd').count > 0) {
                flushSubEndBatch();
            }
        }, ANIMATION_DURATION);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITAIRES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Force le flush de tous les batches
     */
    function flushAll() {
        flushFollowBatch();
        flushFollowRemoveBatch();
        flushSubBatch();
        flushSubEndBatch();
    }
    
    /**
     * Réinitialise tous les batches sans les traiter
     */
    function resetAll() {
        stateManager.resetBatch('follow');
        stateManager.resetBatch('followRemove');
        stateManager.resetBatch('sub');
        stateManager.resetBatch('subEnd');
        
        timerRegistry.clearTimeout('followBatch');
        timerRegistry.clearTimeout('followRemoveBatch');
        timerRegistry.clearTimeout('subBatch');
        timerRegistry.clearTimeout('subEndBatch');
        
        logEvent('INFO', '🔄 Tous les batches réinitialisés');
    }
    
    /**
     * Retourne le statut de tous les batches
     * @returns {Object}
     */
    function getStatus() {
        return {
            follow: stateManager.getBatch('follow'),
            followRemove: stateManager.getBatch('followRemove'),
            sub: stateManager.getBatch('sub'),
            subEnd: stateManager.getBatch('subEnd'),
            config: {
                batchDelay: BATCH_DELAY,
                animationDuration: ANIMATION_DURATION
            }
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // API PUBLIQUE
    // ═══════════════════════════════════════════════════════════════════════════
    
    return Object.freeze({
        // Follows
        addFollowToBatch,
        flushFollowBatch,
        addFollowRemoveToBatch,
        flushFollowRemoveBatch,
        
        // Subs
        addSubToBatch,
        flushSubBatch,
        addSubEndToBatch,
        flushSubEndBatch,
        
        // Utilitaires
        flushAll,
        resetAll,
        getStatus
    });
}

module.exports = { createBatchingService };
