/**
 * 🎯 SERVICE DE GESTION DES ÉVÉNEMENTS
 * Gère les handlers pour les événements follows, subs et synchronisation
 * 
 * Pattern: initContext(context)
 */

const { logEvent, VALID_EVENT_TYPES } = require('../utils');

let ctx = null;

/**
 * Initialise le service avec le contexte de l'application
 * @param {Object} context - Contexte contenant addFollowToBatch, addSubToBatch, etc.
 */
function initContext(context) {
    ctx = context;
    logEvent('INFO', '✅ Service Event Handlers initialisé');
}

/**
 * Gérer un événement de follow
 * @param {Object} data - Données de l'événement follow
 */
function handleFollowEvent(data) {
    try {
        const followerName = data.user_name || 'Utilisateur inconnu';
        const followerId = data.user_id || 'ID inconnu';
        
        logEvent('FOLLOW', `👥 Événement follow reçu: ${followerName} (${followerId})`);
        
        // Utiliser le système de batching au lieu d'incrémenter directement
        ctx.addFollowToBatch(1);
        
        // Affichage console pour debug
        console.log(`🎉 FOLLOW AJOUTÉ AU BATCH: ${followerName}`);
        console.log(`📊 Batch actuel: ${ctx.getFollowBatch().count} follow(s) en attente`);
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur gestion événement follow:', error.message);
        logEvent('ERROR', '📄 Stack trace:', error.stack);
        
        // En cas d'erreur, forcer une synchronisation via EventQueue
        try {
            logEvent('INFO', '📄 Ajout synchronisation de récupération...');
            ctx.eventQueue.add({
                id: `sync-error-${Date.now()}`,
                type: VALID_EVENT_TYPES.SYNC,
                data: {
                    reason: 'Synchronisation après erreur follow',
                    error: error.message
                },
                timestamp: Date.now()
            });
        } catch (queueError) {
            logEvent('CRITICAL', '❌ Erreur critique ajout synchronisation:', queueError.message);
        }
    }
}

/**
 * Gérer un événement de sub
 * @param {Object} data - Données de l'événement sub
 */
function handleSubEvent(data) {
    try {
        const userName = data.user_name || 'Utilisateur inconnu';
        const userId = data.user_id || 'ID inconnu';
        const subType = data.type || 'unknown';
        const tier = data.tier || '1000';
        
        logEvent('SUB', `⭐ Événement sub reçu: ${userName} (Type: ${subType})`);
        
        // Traitement selon le type d'événement sub
        switch (subType) {
            case 'new_sub':
                ctx.addSubToBatch(1, tier);
                console.log(`🎉 NOUVEL ABONNEMENT AJOUTÉ AU BATCH: ${userName} (Tier ${tier})`);
                break;
                
            case 'gift_sub':
                const giftCount = data.gifted_count || 1;
                ctx.addSubToBatch(giftCount, tier);
                console.log(`🎁 SUBS OFFERTS AJOUTÉS AU BATCH: ${userName} a offert ${giftCount} subs (Tier ${tier})`);
                break;
                
            case 'end_sub':
                // Pour les fins d'abonnement, utiliser un batching de suppressions
                ctx.addSubEndToBatch(1);
                console.log(`⏹️ FIN D'ABONNEMENT ajouté au batch: ${userName}`);
                break;
                
            default:
                logEvent('WARN', `⚠️ Type de sub inconnu: ${subType}`);
                return;
        }
        
        console.log(`📊 Batch actuel: ${ctx.getSubBatch().count} sub(s) en attente`);
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur gestion événement sub:', error.message);
        logEvent('ERROR', '📄 Stack trace:', error.stack);
        
        // En cas d'erreur, pas de synchronisation pour les subs (pas d'API disponible)
        logEvent('WARN', '⚠️ Pas de synchronisation auto pour les subs');
    }
}

/**
 * Gérer un événement de sub_end (séparé pour clarté)
 * @param {Object} data - Données de l'événement sub end
 */
function handleSubEndEvent(data) {
    try {
        const userName = data.user_name || 'Utilisateur inconnu';
        logEvent('SUB_END', `⏹️ Événement fin d'abonnement: ${userName}`);
        ctx.addSubEndToBatch(1);
    } catch (error) {
        logEvent('ERROR', '❌ Erreur gestion événement sub end:', error.message);
    }
}

/**
 * Gérer un événement de synchronisation
 * @param {Object} data - Données de l'événement sync
 */
async function handleSyncEvent(data) {
    try {
        logEvent('INFO', `📄 Événement synchronisation: ${data.reason || 'Non spécifié'}`);
        
        // Exécuter une synchronisation complète avec l'API Twitch
        await ctx.syncTwitchFollows(data.reason || 'Synchronisation depuis tampon');
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur gestion événement sync:', error.message);
    }
}

module.exports = {
    initContext,
    handleFollowEvent,
    handleSubEvent,
    handleSubEndEvent,
    handleSyncEvent
};
