/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚡ SERVICE BATCHING - Système de batching intelligent
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Gère l'accumulation et le traitement en batch des événements:
 * - Follows: addFollowToBatch, flushFollowBatch, addFollowRemoveToBatch
 * - Subs: addSubToBatch, flushSubBatch, addSubEndToBatch
 * 
 * Synchronise les animations pour éviter le spam visuel
 */

const { logEvent } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXTE (injecté depuis server.js)
// ═══════════════════════════════════════════════════════════════════════════════
let ctx = null;

/**
 * Initialise le contexte du service Batching
 * @param {Object} context - Contexte de l'application
 */
function initContext(context) {
    ctx = context;
    logEvent('INFO', '✅ Service Batching initialisé');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCHING FOLLOWS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ajoute un follow au batch avec file d'attente synchronisée aux animations
 * @param {number} count - Nombre de follows à ajouter
 */
function addFollowToBatch(count = 1) {
    ctx.followBatch.count += count;
    
    // Annuler le timer précédent si existe
    if (ctx.followBatch.timer) {
        clearTimeout(ctx.followBatch.timer);
    }
    
    // Si une animation est en cours, juste accumuler
    if (ctx.followBatch.isAnimating) {
        logEvent('INFO', `⏳ Animation en cours - Accumulation follows: ${ctx.followBatch.count}`);
        return;
    }
    
    // Aucune animation en cours : attendre un peu pour capturer les events groupés
    ctx.timerRegistry.clearTimeout('followBatch');
    ctx.followBatch.timer = ctx.timerRegistry.setTimeout('followBatch', () => {
        flushFollowBatch();
    }, ctx.BATCH_DELAY);
    
    logEvent('INFO', `🔥 Follow ajouté au batch: ${ctx.followBatch.count} (flush dans ${ctx.BATCH_DELAY}ms)`);
}

/**
 * Traite et envoie le batch de follows accumulés
 */
function flushFollowBatch() {
    if (ctx.followBatch.count === 0) return;
    
    const batchCount = ctx.followBatch.count;
    ctx.followBatch.count = 0;
    ctx.followBatch.timer = null;
    
    // Marquer qu'une animation est en cours
    ctx.followBatch.isAnimating = true;
    
    // Mettre à jour le compteur
    ctx.currentFollows += batchCount;
    
    // Synchroniser lastKnownFollowCount pour que le polling ne se perde pas
    ctx.lastKnownFollowCount = ctx.currentFollows;
    
    // Mettre à jour les fichiers
    ctx.updateFollowFiles(ctx.currentFollows);
    
    // Broadcast avec indication du nombre groupé
    ctx.broadcastFollowUpdate(batchCount);
    
    logEvent('INFO', `🎬 Animation démarrée: +${batchCount} follows (Total: ${ctx.currentFollows}) - Durée: ${ctx.ANIMATION_DURATION}ms`);
    
    // Après la durée de l'animation, marquer comme terminée et flush si nouveaux events
    ctx.timerRegistry.setTimeout('followAnimation', () => {
        ctx.followBatch.isAnimating = false;
        logEvent('INFO', `✅ Animation terminée - Batch actuel: ${ctx.followBatch.count} follows`);
        
        // Si des events se sont accumulés pendant l'animation, les traiter
        if (ctx.followBatch.count > 0) {
            logEvent('INFO', `📄 Flush automatique du batch accumulé: ${ctx.followBatch.count} follows`);
            flushFollowBatch();
        }
    }, ctx.ANIMATION_DURATION);
}

/**
 * Ajoute un unfollow au batch
 * @param {number} count - Nombre de unfollows à ajouter
 */
function addFollowRemoveToBatch(count = 1) {
    ctx.followRemoveBatch.count += count;
    
    // Annuler le timer précédent si existe
    if (ctx.followRemoveBatch.timer) {
        clearTimeout(ctx.followRemoveBatch.timer);
    }
    
    // Si une animation de suppression est en cours, juste accumuler
    if (ctx.followRemoveBatch.isAnimating) {
        logEvent('INFO', `⏳ Animation unfollows en cours - Accumulation unfollows: ${ctx.followRemoveBatch.count}`);
        return;
    }
    
    // Attendre un court délai pour agréger plusieurs unfollows
    ctx.timerRegistry.clearTimeout('followRemoveBatch');
    ctx.followRemoveBatch.timer = ctx.timerRegistry.setTimeout('followRemoveBatch', () => {
        flushFollowRemoveBatch();
    }, ctx.BATCH_DELAY);
    
    logEvent('INFO', `🔥 Unfollow ajouté au batch: ${ctx.followRemoveBatch.count} (flush dans ${ctx.BATCH_DELAY}ms)`);
}

/**
 * Traite et envoie le batch de unfollows accumulés
 */
function flushFollowRemoveBatch() {
    if (ctx.followRemoveBatch.count === 0) return;
    
    const batchCount = ctx.followRemoveBatch.count;
    ctx.followRemoveBatch.count = 0;
    ctx.followRemoveBatch.timer = null;
    
    // Marquer qu'une animation de suppression est en cours
    ctx.followRemoveBatch.isAnimating = true;
    
    // Décrémenter le compteur
    ctx.currentFollows = Math.max(0, ctx.currentFollows - batchCount);
    
    // Synchroniser lastKnownFollowCount
    ctx.lastKnownFollowCount = ctx.currentFollows;
    
    // Mettre à jour les fichiers
    ctx.updateFollowFiles(ctx.currentFollows);
    
    // Diffuser en indiquant une suppression (batchCount négatif)
    ctx.broadcastFollowUpdate(-batchCount);
    
    logEvent('INFO', `🎬 Animation UNFOLLOW démarrée: -${batchCount} follows (Total: ${ctx.currentFollows}) - Durée: ${ctx.ANIMATION_DURATION}ms`);
    
    // Après la durée de l'animation, marquer comme terminée et flush si nouveaux events
    ctx.timerRegistry.setTimeout('followRemoveAnimation', () => {
        ctx.followRemoveBatch.isAnimating = false;
        logEvent('INFO', `✅ Animation UNFOLLOW terminée - Batch actuel: ${ctx.followRemoveBatch.count} unfollows`);
        
        // Si des events se sont accumulés pendant l'animation, les traiter
        if (ctx.followRemoveBatch.count > 0) {
            logEvent('INFO', `📄 Flush automatique du batch unfollows accumulé: ${ctx.followRemoveBatch.count}`);
            flushFollowRemoveBatch();
        }
    }, ctx.ANIMATION_DURATION);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCHING SUBS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ajoute un sub au batch avec file d'attente synchronisée aux animations
 * @param {number} count - Nombre de subs à ajouter
 * @param {string} tier - Tier de l'abonnement (1000, 2000, 3000)
 */
function addSubToBatch(count = 1, tier = '1000') {
    ctx.subBatch.count += count;
    
    // Accumuler par tier
    if (!ctx.subBatch.tiers[tier]) {
        ctx.subBatch.tiers[tier] = 0;
    }
    ctx.subBatch.tiers[tier] += count;
    
    // Annuler le timer précédent
    if (ctx.subBatch.timer) {
        clearTimeout(ctx.subBatch.timer);
    }
    
    // Si une animation est en cours, juste accumuler
    if (ctx.subBatch.isAnimating) {
        logEvent('INFO', `⏳ Animation en cours - Accumulation subs: ${ctx.subBatch.count}`);
        return;
    }
    
    // Aucune animation en cours : attendre un peu pour capturer les events groupés
    ctx.timerRegistry.clearTimeout('subBatch');
    ctx.subBatch.timer = ctx.timerRegistry.setTimeout('subBatch', () => {
        flushSubBatch();
    }, ctx.BATCH_DELAY);
    
    logEvent('INFO', `🔥 Sub ajouté au batch: ${ctx.subBatch.count} (flush dans ${ctx.BATCH_DELAY}ms)`);
}

/**
 * Traite et envoie le batch de subs accumulés
 */
function flushSubBatch() {
    if (ctx.subBatch.count === 0) return;
    
    const batchCount = ctx.subBatch.count;
    const tiers = { ...ctx.subBatch.tiers };
    
    ctx.subBatch.count = 0;
    ctx.subBatch.tiers = {};
    ctx.subBatch.timer = null;
    
    // Marquer qu'une animation est en cours
    ctx.subBatch.isAnimating = true;
    
    // Mettre à jour le compteur
    ctx.currentSubs += batchCount;
    
    // Mettre à jour les fichiers
    ctx.updateSubFiles(ctx.currentSubs);
    
    // Broadcast avec détails des tiers
    ctx.broadcastSubUpdate(batchCount, tiers);
    
    const tierDetails = Object.entries(tiers)
        .map(([tier, count]) => `${count}×T${tier.charAt(0)}`)
        .join(', ');
    
    logEvent('INFO', `🎬 Animation démarrée: +${batchCount} subs (${tierDetails}) (Total: ${ctx.currentSubs}) - Durée: ${ctx.ANIMATION_DURATION}ms`);
    
    // Après la durée de l'animation, marquer comme terminée et flush si nouveaux events
    ctx.timerRegistry.setTimeout('subAnimation', () => {
        ctx.subBatch.isAnimating = false;
        logEvent('INFO', `✅ Animation terminée - Batch actuel: ${ctx.subBatch.count} subs`);
        
        // Si des events se sont accumulés pendant l'animation, les traiter
        if (ctx.subBatch.count > 0) {
            logEvent('INFO', `📄 Flush automatique du batch accumulé: ${ctx.subBatch.count} subs`);
            flushSubBatch();
        }
    }, ctx.ANIMATION_DURATION);
}

/**
 * Ajoute un unsub au batch
 * @param {number} count - Nombre de unsubs à ajouter
 */
function addSubEndToBatch(count = 1) {
    ctx.subEndBatch.count += count;
    
    // Annuler le timer précédent si existe
    if (ctx.subEndBatch.timer) {
        clearTimeout(ctx.subEndBatch.timer);
    }
    
    // Si une animation de suppression est en cours, juste accumuler
    if (ctx.subEndBatch.isAnimating) {
        logEvent('INFO', `⏳ Animation unsubs en cours - Accumulation unsubs: ${ctx.subEndBatch.count}`);
        return;
    }
    
    // Attendre un court délai pour agréger plusieurs unsubs
    ctx.timerRegistry.clearTimeout('subEndBatch');
    ctx.subEndBatch.timer = ctx.timerRegistry.setTimeout('subEndBatch', () => {
        flushSubEndBatch();
    }, ctx.BATCH_DELAY);
    
    logEvent('INFO', `🔥 Unsub ajouté au batch: ${ctx.subEndBatch.count} (flush dans ${ctx.BATCH_DELAY}ms)`);
}

/**
 * Traite et envoie le batch de unsubs accumulés
 */
function flushSubEndBatch() {
    if (ctx.subEndBatch.count === 0) return;
    
    const batchCount = ctx.subEndBatch.count;
    ctx.subEndBatch.count = 0;
    ctx.subEndBatch.timer = null;
    
    // Marquer qu'une animation de suppression est en cours
    ctx.subEndBatch.isAnimating = true;
    
    // Décrémenter le compteur
    ctx.currentSubs = Math.max(0, ctx.currentSubs - batchCount);
    
    // Mettre à jour les fichiers
    ctx.updateSubFiles(ctx.currentSubs);
    
    // Diffuser en indiquant une suppression (batchCount négatif)
    ctx.broadcastSubUpdate(-batchCount);
    
    logEvent('INFO', `🎬 Animation UNSUB démarrée: -${batchCount} subs (Total: ${ctx.currentSubs}) - Durée: ${ctx.ANIMATION_DURATION}ms`);
    
    // Après la durée de l'animation, marquer comme terminée et flush si nouveaux events
    ctx.timerRegistry.setTimeout('subEndAnimation', () => {
        ctx.subEndBatch.isAnimating = false;
        logEvent('INFO', `✅ Animation UNSUB terminée - Batch actuel: ${ctx.subEndBatch.count} unsubs`);
        
        if (ctx.subEndBatch.count > 0) {
            logEvent('INFO', `📄 Flush automatique du batch accumulé (unsubs): ${ctx.subEndBatch.count}`);
            flushSubEndBatch();
        }
    }, ctx.ANIMATION_DURATION);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
    initContext,
    
    // Follows
    addFollowToBatch,
    flushFollowBatch,
    addFollowRemoveToBatch,
    flushFollowRemoveBatch,
    
    // Subs
    addSubToBatch,
    flushSubBatch,
    addSubEndToBatch,
    flushSubEndBatch
};
