/**
 * 📁 SERVICE DE MISE À JOUR DES FICHIERS
 * Gère l'affichage et la mise à jour des fichiers pour les overlays
 * 
 * Pattern: initContext(context)
 */

const { logEvent } = require('../utils');

let ctx = null;

/**
 * Initialise le service avec le contexte de l'application
 * @param {Object} context - Contexte contenant getCurrentFollowGoal, getCurrentSubGoal, etc.
 */
function initContext(context) {
    ctx = context;
    logEvent('INFO', '✅ Service Files initialisé');
}

/**
 * Met à jour les fichiers pour les follows
 * @param {number} follows - Nombre actuel de follows
 */
function updateFollowFiles(follows) {
    const goal = ctx.getCurrentFollowGoal(follows);
    
    // Choix du format d'affichage selon le cas
    let goalText;
    if (goal.isMaxReached) {
        // Cas où on a dépassé tous les objectifs : afficher seulement le nombre
        goalText = follows.toString();
    } else {
        // Vérifier si le message est vide ou undefined
        if (!goal.message || goal.message.trim() === '') {
            // Message vide : afficher seulement {followcount}/{goal}
            goalText = `${goal.current}/${goal.target}`;
        } else {
            // Message présent : afficher le format complet {followcount}/{goal} : {message}
            goalText = `${goal.current}/${goal.target} : ${goal.message}`;
        }
    }
    
    try {
        // Les overlays HTML utilisent WebSocket, pas de fichiers texte
        console.log(`📊 Follows mis à jour: ${follows} follows`);
    } catch (error) {
        console.error('❌ Erreur mise à jour follows:', error.message);
    }
}

/**
 * Met à jour les fichiers pour les subs
 * @param {number} subs - Nombre actuel de subs
 */
function updateSubFiles(subs) {
    const goal = ctx.getCurrentSubGoal(subs);
    
    // Choix du format d'affichage selon le cas
    let goalText;
    if (goal.isMaxReached) {
        // Cas où on a dépassé tous les objectifs : afficher seulement le nombre
        goalText = subs.toString();
    } else {
        // Vérifier si le message est vide ou undefined
        if (!goal.message || goal.message.trim() === '') {
            // Message vide : afficher seulement {subcount}/{goal}
            goalText = `${goal.current}/${goal.target}`;
        } else {
            // Message présent : afficher le format complet {subcount}/{goal} : {message}
            goalText = `${goal.current}/${goal.target} : ${goal.message}`;
        }
    }
    
    try {
        // Les overlays HTML utilisent WebSocket, pas de fichiers texte
        console.log(`📊 Subs mis à jour: ${subs} subs`);
    } catch (error) {
        console.error('❌ Erreur mise à jour subs:', error.message);
    }
}

module.exports = {
    initContext,
    updateFollowFiles,
    updateSubFiles
};
