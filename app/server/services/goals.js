/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎯 SERVICE GOALS - Gestion des objectifs follows/subs
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Gère le chargement, la surveillance et le calcul des objectifs:
 * - Chargement des fichiers de configuration
 * - Surveillance des modifications (file watcher)
 * - Calcul de l'objectif actuel et de la progression
 */

const fs = require('fs');
const path = require('path');
const { logEvent } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXTE (injecté depuis server.js)
// ═══════════════════════════════════════════════════════════════════════════════
let ctx = null;

/**
 * Initialise le contexte du service Goals
 * @param {Object} context - Contexte de l'application
 */
function initContext(context) {
    ctx = context;
    logEvent('INFO', '✅ Service Goals initialisé');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHARGEMENT DES OBJECTIFS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Charge la configuration des objectifs pour les follows
 */
function loadFollowGoals() {
    try {
        const configPath = path.join(ctx.ROOT_DIR, 'obs', 'data', 'followgoal_config.txt');
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const lines = content.split(/\r?\n/).filter(line => line.trim());
            
            ctx.followGoals.clear();
            lines.forEach(line => {
                const match = line.match(/^(\d+):\s*(.*?)\s*$/);
                if (match) {
                    const count = parseInt(match[1]);
                    const message = match[2]; // Peut être vide, c'est OK
                    ctx.followGoals.set(count, message);
                }
            });
            
            console.log('✅ Objectifs follows chargés:', ctx.followGoals.size, 'objectifs');
            
            // Mettre à jour immédiatement les fichiers avec les nouveaux objectifs
            ctx.updateFollowFiles(ctx.currentFollows);
            
            // Diffuser la mise à jour
            ctx.broadcastFollowUpdate();
            console.log('📄 Objectifs follows mis à jour et diffusés immédiatement');
        }
    } catch (error) {
        console.error('❌ Erreur chargement objectifs follows:', error.message);
    }
}

/**
 * Charge la configuration des objectifs pour les subs
 */
function loadSubGoals() {
    try {
        const configPath = path.join(ctx.ROOT_DIR, 'obs', 'data', 'subgoals_config.txt');
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const lines = content.split(/\r?\n/).filter(line => line.trim());
            
            ctx.subGoals.clear();
            lines.forEach(line => {
                const match = line.match(/^(\d+):\s*(.*?)\s*$/);
                if (match) {
                    const count = parseInt(match[1]);
                    const message = match[2]; // Peut être vide, c'est OK
                    ctx.subGoals.set(count, message);
                }
            });
            
            console.log('✅ Objectifs subs chargés:', ctx.subGoals.size, 'objectifs');
            
            // Mettre à jour immédiatement les fichiers avec les nouveaux objectifs
            ctx.updateSubFiles(ctx.currentSubs);
            
            // Diffuser la mise à jour
            ctx.broadcastSubUpdate();
            console.log('📄 Objectifs subs mis à jour et diffusés immédiatement');
        }
    } catch (error) {
        console.error('❌ Erreur chargement objectifs subs:', error.message);
    }
}

/**
 * Fonction de compatibilité - charge tous les goals
 */
function loadGoals() {
    loadFollowGoals();
    loadSubGoals();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SURVEILLANCE DES FICHIERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialise la surveillance des fichiers de configuration
 */
function setupConfigWatcher() {
    const followConfigPath = path.join(ctx.ROOT_DIR, 'obs', 'data', 'followgoal_config.txt');
    const subConfigPath = path.join(ctx.ROOT_DIR, 'obs', 'data', 'subgoals_config.txt');
    
    // Arrêter la surveillance précédente si elle existe
    if (ctx.configWatcher) {
        ctx.configWatcher.close();
    }
    if (ctx.subConfigWatcher) {
        ctx.subConfigWatcher.close();
    }
    
    try {
        // Surveiller les changements du fichier de configuration des follows
        ctx.configWatcher = fs.watch(followConfigPath, (eventType, filename) => {
            if (eventType === 'change') {
                console.log('📄 Fichier followgoal_config.txt modifié - rechargement...');
                // Petit délai pour s'assurer que l'écriture est terminée
                ctx.timerRegistry.setTimeout('reloadFollowGoals', () => {
                    loadFollowGoals();
                }, 100);
            }
        });
        
        // Surveiller les changements du fichier de configuration des subs
        ctx.subConfigWatcher = fs.watch(subConfigPath, (eventType, filename) => {
            if (eventType === 'change') {
                console.log('📄 Fichier subgoals_config.txt modifié - rechargement...');
                // Petit délai pour s'assurer que l'écriture est terminée
                ctx.timerRegistry.setTimeout('reloadSubGoals', () => {
                    loadSubGoals();
                }, 100);
            }
        });
        
        console.log('👁️ Surveillance des fichiers de configuration activée');
    } catch (error) {
        console.error('❌ Erreur surveillance fichiers:', error.message);
    }
}

/**
 * Arrête la surveillance des fichiers
 */
function stopConfigWatcher() {
    if (ctx.configWatcher) {
        ctx.configWatcher.close();
        ctx.configWatcher = null;
        console.log('👁️ Surveillance fichier follows arrêtée');
    }
    if (ctx.subConfigWatcher) {
        ctx.subConfigWatcher.close();
        ctx.subConfigWatcher = null;
        console.log('👁️ Surveillance fichier subs arrêtée');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCUL DES OBJECTIFS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Trouve l'objectif actuel pour les follows
 * @param {number} follows - Nombre de follows actuel
 * @returns {Object} Informations sur l'objectif
 */
function getCurrentFollowGoal(follows) {
    let nextGoal = null;
    let lastReachedGoal = null;
    let progress = 0;
    
    const sortedGoals = Array.from(ctx.followGoals.keys()).sort((a, b) => a - b);
    
    // Vérifier qu'il y a au moins un objectif
    if (sortedGoals.length === 0) {
        console.log('⚠️ Aucun objectif follow trouvé dans la configuration');
        return {
            current: follows,
            target: follows,
            message: follows.toString(),
            remaining: 0,
            progress: 100,
            isMaxReached: true
        };
    }
    
    // Trouver le dernier objectif atteint et le prochain objectif
    for (const goalCount of sortedGoals) {
        if (follows >= goalCount) {
            lastReachedGoal = goalCount;
        }
        if (follows < goalCount && !nextGoal) {
            nextGoal = goalCount;
        }
    }
    
    if (nextGoal) {
        // Il y a un objectif suivant à atteindre
        const message = ctx.followGoals.get(nextGoal);
        const remaining = nextGoal - follows;
        progress = ((follows / nextGoal) * 100).toFixed(1);
        
        return {
            current: follows,
            target: nextGoal,
            message: message,
            remaining: remaining,
            progress: progress
        };
    } else if (lastReachedGoal) {
        // Pas d'objectif suivant, on a dépassé tous les objectifs
        return {
            current: follows,
            target: follows,
            message: follows.toString(),
            remaining: 0,
            progress: 100,
            isMaxReached: true
        };
    } else {
        // Aucun objectif atteint (moins que le premier objectif)
        const firstGoal = sortedGoals[0];
        const message = ctx.followGoals.get(firstGoal);
        const remaining = firstGoal - follows;
        progress = ((follows / firstGoal) * 100).toFixed(1);
        
        return {
            current: follows,
            target: firstGoal,
            message: message,
            remaining: remaining,
            progress: progress
        };
    }
}

/**
 * Trouve l'objectif actuel pour les subs
 * @param {number} subs - Nombre de subs actuel
 * @returns {Object} Informations sur l'objectif
 */
function getCurrentSubGoal(subs) {
    let nextGoal = null;
    let lastReachedGoal = null;
    let progress = 0;
    
    const sortedGoals = Array.from(ctx.subGoals.keys()).sort((a, b) => a - b);
    
    // Vérifier qu'il y a au moins un objectif
    if (sortedGoals.length === 0) {
        console.log('⚠️ Aucun objectif sub trouvé dans la configuration');
        return {
            current: subs,
            target: subs,
            message: subs.toString(),
            remaining: 0,
            progress: 100,
            isMaxReached: true
        };
    }
    
    // Trouver le dernier objectif atteint et le prochain objectif
    for (const goalCount of sortedGoals) {
        if (subs >= goalCount) {
            lastReachedGoal = goalCount;
        }
        if (subs < goalCount && !nextGoal) {
            nextGoal = goalCount;
        }
    }
    
    if (nextGoal) {
        // Il y a un objectif suivant à atteindre
        const message = ctx.subGoals.get(nextGoal);
        const remaining = nextGoal - subs;
        progress = ((subs / nextGoal) * 100).toFixed(1);
        
        return {
            current: subs,
            target: nextGoal,
            message: message,
            remaining: remaining,
            progress: progress
        };
    } else if (lastReachedGoal) {
        // Pas d'objectif suivant, on a dépassé tous les objectifs
        return {
            current: subs,
            target: subs,
            message: subs.toString(),
            remaining: 0,
            progress: 100,
            isMaxReached: true
        };
    } else {
        // Aucun objectif atteint (moins que le premier objectif)
        const firstGoal = sortedGoals[0];
        const message = ctx.subGoals.get(firstGoal);
        const remaining = firstGoal - subs;
        progress = ((subs / firstGoal) * 100).toFixed(1);
        
        return {
            current: subs,
            target: firstGoal,
            message: message,
            remaining: remaining,
            progress: progress
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
    initContext,
    loadFollowGoals,
    loadSubGoals,
    loadGoals,
    setupConfigWatcher,
    stopConfigWatcher,
    getCurrentFollowGoal,
    getCurrentSubGoal
};
