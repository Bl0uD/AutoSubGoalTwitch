/**
 * 📊 SERVICE DE GESTION DES COMPTEURS
 * Gère la persistance et la mise à jour des compteurs follows/subs
 * 
 * Pattern: initContext(context)
 */

const { logEvent } = require('../utils');

let ctx = null;

/**
 * Initialise le service avec le contexte de l'application
 * @param {Object} context - Contexte contenant loadAppState, saveAppState, etc.
 */
function initContext(context) {
    ctx = context;
    logEvent('INFO', '✅ Service Counters initialisé');
}

// ========================================
// 💾 PERSISTANCE DES COMPTEURS
// ========================================

/**
 * Sauvegarde le nombre de follows sur disque pour la persistence
 * @param {number} count - Nombre de follows
 */
function saveFollowCountToFile(count) {
    try {
        const state = ctx.loadAppState();
        state.counters.follows = count;
        ctx.saveAppState(state);
    } catch (error) {
        console.error('❌ Erreur sauvegarde compteur follows:', error.message);
    }
}

/**
 * Charge le nombre de follows depuis le disque
 * @returns {number} Nombre de follows (0 si erreur)
 */
function loadFollowCountFromFile() {
    try {
        const state = ctx.loadAppState();
        if (state.counters.follows > 0) {
            console.log(`📂 Compteur restauré: ${state.counters.follows} follows (depuis app_state.json)`);
            return state.counters.follows;
        }
    } catch (error) {
        console.error('❌ Erreur chargement compteur follows:', error.message);
    }
    return 0;
}

/**
 * Sauvegarde le nombre de subs sur disque pour la persistence
 * @param {number} count - Nombre de subs
 */
function saveSubCountToFile(count) {
    try {
        const state = ctx.loadAppState();
        state.counters.subs = count;
        ctx.saveAppState(state);
    } catch (error) {
        console.error('❌ Erreur sauvegarde compteur subs:', error.message);
    }
}

/**
 * Charge le nombre de subs depuis le disque
 * @returns {number} Nombre de subs (0 si erreur)
 */
function loadSubCountFromFile() {
    try {
        const state = ctx.loadAppState();
        if (state.counters.subs > 0) {
            console.log(`📂 Compteur restauré: ${state.counters.subs} subs (depuis app_state.json)`);
            return state.counters.subs;
        }
    } catch (error) {
        console.error('❌ Erreur chargement compteur subs sauvegardé:', error.message);
    }
    return 0;
}

// ========================================
// 📊 MISE À JOUR DES COMPTEURS
// ========================================

/**
 * Version sécurisée de updateFollowCount avec protection contre les erreurs
 * @param {number} newCount - Nouveau nombre de follows
 */
function updateFollowCountSafe(newCount) {
    try {
        if (typeof newCount !== 'number' || newCount < 0) {
            logEvent('WARN', `⚠️ Nombre de follows invalide: ${newCount}`);
            return;
        }
        
        updateFollowCount(newCount);
        saveFollowBackup();
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur mise à jour compteur:', error.message);
    }
}

/**
 * Met à jour le count de follows et les fichiers
 * @param {number} newCount - Nouveau nombre de follows
 */
function updateFollowCount(newCount) {
    const oldCount = ctx.getCurrentFollows();
    ctx.setCurrentFollows(newCount);
    
    // Synchroniser lastKnownFollowCount pour éviter désynchronisation avec le polling
    if (ctx.setLastKnownFollowCount) {
        ctx.setLastKnownFollowCount(newCount);
    }
    
    // Mettre à jour les fichiers
    ctx.updateFollowFiles(ctx.getCurrentFollows());
    
    // Diffuser aux clients WebSocket
    ctx.broadcastFollowUpdate();
    
    logEvent('INFO', `📊 Follow count mis à jour: ${oldCount} → ${newCount}`);
}

/**
 * Version sécurisée de updateSubCount avec protection contre les erreurs
 * @param {number} newCount - Nouveau nombre de subs
 */
function updateSubCountSafe(newCount) {
    try {
        if (typeof newCount !== 'number' || newCount < 0) {
            logEvent('WARN', `⚠️ Nombre de subs invalide: ${newCount}`);
            return;
        }
        
        updateSubCount(newCount);
        saveSubCountToFile(newCount);
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur mise à jour compteur subs:', error.message);
    }
}

/**
 * Met à jour le count de subs et les fichiers
 * @param {number} newCount - Nouveau nombre de subs
 */
function updateSubCount(newCount) {
    const oldCount = ctx.getCurrentSubs();
    ctx.setCurrentSubs(newCount);
    
    // Mettre à jour les fichiers
    ctx.updateSubFiles(ctx.getCurrentSubs());
    
    // Sauvegarder le compteur subs pour persistance
    try { saveSubCountToFile(ctx.getCurrentSubs()); } catch (e) { /* ignore */ }
    
    // Diffuser aux clients WebSocket
    ctx.broadcastSubUpdate();
    
    logEvent('INFO', `📊 Sub count mis à jour: ${oldCount} → ${newCount}`);
}

/**
 * Sauvegarde les follows en backup
 */
function saveFollowBackup() {
    try {
        saveFollowCountToFile(ctx.getCurrentFollows());
        logEvent('INFO', `💾 Backup sauvegardé: ${ctx.getCurrentFollows()} follows`);
    } catch (error) {
        logEvent('ERROR', '❌ Erreur sauvegarde backup:', error.message);
    }
}

module.exports = {
    initContext,
    // Persistance
    saveFollowCountToFile,
    loadFollowCountFromFile,
    saveSubCountToFile,
    loadSubCountFromFile,
    // Mise à jour
    updateFollowCountSafe,
    updateFollowCount,
    updateSubCountSafe,
    updateSubCount,
    saveFollowBackup
};
