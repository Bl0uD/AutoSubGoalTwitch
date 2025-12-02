/**
 * 📡 SERVICE DE POLLING
 * Gère le polling des follows Twitch en backup d'EventSub
 * 
 * Pattern: initContext(context)
 */

const { logEvent, VALID_EVENT_TYPES } = require('../utils');

let ctx = null;

// Variables d'état du polling
let followPollingInterval = null;
let isPollingActive = false;
let lastKnownFollowCount = 0;

/**
 * Initialise le service avec le contexte de l'application
 * @param {Object} context - Contexte contenant getTwitchFollowCount, updateFollowCount, etc.
 */
function initContext(context) {
    ctx = context;
    logEvent('INFO', '✅ Service Polling initialisé');
}

/**
 * Démarre le polling des follows
 * @param {number} intervalSeconds - Intervalle en secondes (défaut: 10)
 */
function startFollowPolling(intervalSeconds = 10) {
    if (followPollingInterval) {
        ctx.timerRegistry.clearInterval('followPolling');
    }
    
    if (!ctx.getTwitchConfig().configured) {
        logEvent('WARN', '⚠️ Configuration Twitch manquante - polling non démarré');
        return;
    }
    
    logEvent('INFO', `📄 Démarrage du polling intelligent des follows (toutes les ${intervalSeconds}s)`);
    logEvent('INFO', `📡 Mode: ${ctx.getSessionId() ? 'BACKUP EventSub' : 'PRINCIPAL (EventSub inactif)'}`);
    isPollingActive = true;
    
    // Première vérification immédiate
    pollFollowCount();
    
    // Puis vérifications périodiques
    followPollingInterval = ctx.timerRegistry.setInterval('followPolling', async () => {
        await pollFollowCount();
    }, intervalSeconds * 1000);
}

/**
 * Effectue un poll du nombre de follows
 */
async function pollFollowCount() {
    try {
        if (!isPollingActive) return;
        
        const result = await ctx.getTwitchFollowCount();
        
        if (!result.success) {
            logEvent('ERROR', `❌ Erreur polling follows: ${result.error} (${result.code})`);
            return;
        }
        
        const newFollowCount = result.data;
        
        // Si c'est la première fois ou s'il y a un changement
        if (lastKnownFollowCount === 0) {
            lastKnownFollowCount = newFollowCount;
            ctx.updateFollowCount(newFollowCount);
            logEvent('INFO', `📊 Count initial: ${newFollowCount} follows`);
        } else if (newFollowCount !== lastKnownFollowCount) {
            const difference = newFollowCount - lastKnownFollowCount;
            const source = ctx.getSessionId() ? '(synchronisation API)' : '(polling)';
            logEvent('INFO', `🎉 Follow count mis à jour ${source}: ${lastKnownFollowCount} → ${newFollowCount} (${difference > 0 ? '+' : ''}${difference})`);
            
            lastKnownFollowCount = newFollowCount;
            ctx.updateFollowCount(newFollowCount);
            
            // Sauvegarder le nouveau count
            ctx.saveFollowBackup();
        } else if (ctx.getSessionId()) {
            // Si EventSub actif et pas de changement, log de confirmation occasionnel
            if (Math.random() > 0.9) {
                logEvent('INFO', `✅ Synchronisation OK: ${newFollowCount} follows`);
            }
        }
        
    } catch (error) {
        logEvent('ERROR', '❌ Erreur lors du polling des follows:', error.message);
    }
}

/**
 * Arrête le polling des follows
 */
function stopFollowPolling() {
    if (followPollingInterval) {
        ctx.timerRegistry.clearInterval('followPolling');
        followPollingInterval = null;
        isPollingActive = false;
        logEvent('INFO', '⏹️ Polling des follows arrêté');
    }
}

/**
 * Met à jour le dernier count connu
 * @param {number} count - Nouveau count
 */
function setLastKnownFollowCount(count) {
    lastKnownFollowCount = count;
}

/**
 * Récupère le dernier count connu
 * @returns {number}
 */
function getLastKnownFollowCount() {
    return lastKnownFollowCount;
}

/**
 * Vérifie si le polling est actif
 * @returns {boolean}
 */
function isActive() {
    return isPollingActive;
}

module.exports = {
    initContext,
    startFollowPolling,
    stopFollowPolling,
    pollFollowCount,
    setLastKnownFollowCount,
    getLastKnownFollowCount,
    isActive
};
