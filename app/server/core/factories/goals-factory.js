/**
 * @file goals-factory.js
 * @description Factory pour le service de gestion des objectifs
 * @version 3.1.2
 * 
 * Pattern: Factory avec injection de dépendances
 * Aucune variable globale, état géré par StateManager
 */

const fs = require('fs');
const path = require('path');

/**
 * Crée le service de gestion des objectifs
 * @param {Object} deps - Dépendances injectées
 * @param {StateManager} deps.stateManager
 * @param {Object} deps.logger
 * @param {string} deps.ROOT_DIR
 * @returns {Object} API du service
 */
function createGoalsService({ stateManager, logger, ROOT_DIR }) {
    const { logEvent } = logger;
    
    const GOALS_PATH = {
        follow: path.join(ROOT_DIR, 'obs', 'data', 'followgoal_config.txt'),
        sub: path.join(ROOT_DIR, 'obs', 'data', 'subgoals_config.txt')
    };
    
    let watchers = {};
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PARSING
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Parse un fichier de configuration d'objectifs
     * Format: "100: Message pour 100 follows"
     * @param {string} content
     * @returns {Map<number, string>}
     */
    function parseGoalsFile(content) {
        const goals = new Map();
        const lines = content.split(/\r?\n/).filter(l => l.trim());
        
        for (const line of lines) {
            const match = line.match(/^(\d+):\s*(.*?)\s*$/);
            if (match) {
                const count = parseInt(match[1]);
                const message = match[2] || '';
                goals.set(count, message);
            }
        }
        
        return goals;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CHARGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Charge les objectifs depuis un fichier
     * @param {'follow' | 'sub'} type
     * @returns {boolean} Succès
     */
    function loadGoals(type) {
        const filePath = GOALS_PATH[type];
        
        try {
            if (!fs.existsSync(filePath)) {
                logEvent('WARN', `⚠️ Fichier objectifs ${type} non trouvé: ${filePath}`);
                return false;
            }
            
            const content = fs.readFileSync(filePath, 'utf8');
            const goals = parseGoalsFile(content);
            
            if (type === 'follow') {
                stateManager.setFollowGoals(goals);
            } else {
                stateManager.setSubGoals(goals);
            }
            
            logEvent('INFO', `✅ Objectifs ${type} chargés: ${goals.size} objectifs`);
            return true;
            
        } catch (error) {
            logEvent('ERROR', `❌ Erreur chargement objectifs ${type}`, { error: error.message });
            return false;
        }
    }
    
    /**
     * Charge tous les objectifs (follow + sub)
     */
    function loadAllGoals() {
        loadGoals('follow');
        loadGoals('sub');
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Calcule l'objectif actuel pour une valeur donnée
     * @param {'follow' | 'sub'} type
     * @returns {{ goal: { current: number, target: number, message: string, isMaxReached: boolean }, progress: number }}
     */
    function getCurrentGoalInfo(type) {
        const goals = type === 'follow' ? stateManager.getFollowGoals() : stateManager.getSubGoals();
        const currentValue = type === 'follow' ? stateManager.getFollows() : stateManager.getSubs();
        
        // Trier les objectifs (les clés peuvent être des strings, on les convertit en number)
        const sortedGoals = [...goals.keys()].map(Number).sort((a, b) => a - b);
        
        // Trouver le prochain objectif non atteint
        const nextGoal = sortedGoals.find(g => g > currentValue);
        const maxGoal = sortedGoals[sortedGoals.length - 1];
        const isMaxReached = !nextGoal && currentValue >= maxGoal;
        const targetValue = nextGoal || maxGoal || (type === 'follow' ? 100 : 10);
        
        // Récupérer le message (les clés dans la Map peuvent être string ou number)
        const message = goals.get(targetValue) || goals.get(String(targetValue)) || '';
        
        return {
            goal: {
                current: currentValue,
                target: targetValue,
                message: message,
                isMaxReached: isMaxReached
            },
            progress: targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 100
        };
    }
    
    /**
     * @returns {{ goal: { current: number, target: number, message: string, isMaxReached: boolean }, progress: number }}
     */
    function getCurrentFollowGoal() {
        return getCurrentGoalInfo('follow');
    }
    
    /**
     * @returns {{ goal: { current: number, target: number, message: string, isMaxReached: boolean }, progress: number }}
     */
    function getCurrentSubGoal() {
        return getCurrentGoalInfo('sub');
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FILE WATCHERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Configure les watchers sur les fichiers de configuration
     */
    function setupWatchers() {
        // Fermer les anciens watchers s'ils existent
        closeWatchers();
        
        for (const [type, filePath] of Object.entries(GOALS_PATH)) {
            if (fs.existsSync(filePath)) {
                try {
                    // Debounce pour éviter les rechargements multiples
                    let debounceTimer = null;
                    
                    watchers[type] = fs.watch(filePath, { persistent: false }, (eventType) => {
                        if (eventType === 'change') {
                            // Debounce 500ms
                            if (debounceTimer) clearTimeout(debounceTimer);
                            debounceTimer = setTimeout(() => {
                                logEvent('INFO', `📄 Fichier ${type} modifié, rechargement...`);
                                loadGoals(type);
                            }, 500);
                        }
                    });
                    
                    logEvent('INFO', `👀 Watcher configuré pour ${type}`);
                } catch (error) {
                    logEvent('ERROR', `❌ Erreur création watcher ${type}`, { error: error.message });
                }
            }
        }
    }
    
    /**
     * Ferme tous les watchers
     */
    function closeWatchers() {
        for (const [type, watcher] of Object.entries(watchers)) {
            if (watcher) {
                watcher.close();
                logEvent('INFO', `🔒 Watcher ${type} fermé`);
            }
        }
        watchers = {};
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // API PUBLIQUE
    // ═══════════════════════════════════════════════════════════════════════════
    
    return Object.freeze({
        // Chargement
        loadFollowGoals: () => loadGoals('follow'),
        loadSubGoals: () => loadGoals('sub'),
        loadAllGoals,
        
        // Calculs
        getCurrentFollowGoal,
        getCurrentSubGoal,
        getCurrentGoalInfo,
        
        // Watchers
        setupWatchers,
        closeWatchers,
        
        // Utilitaires
        getGoalsPath: (type) => GOALS_PATH[type]
    });
}

module.exports = { createGoalsService };
