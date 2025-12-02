/**
 * @file timer-registry.js
 * @description Registre centralisé des timers pour éviter les fuites mémoire
 * @version 2.3.1
 */

const { logEvent } = require('./logger');

/**
 * TimerRegistry - Gestion centralisée des setInterval/setTimeout
 */
class TimerRegistry {
    constructor() {
        this.timers = new Map();
    }

    /**
     * Crée un interval avec ID
     */
    setInterval(id, fn, ms) {
        this.clearInterval(id);
        const timer = setInterval(fn, ms);
        this.timers.set(id, { type: 'interval', timer, fn, ms });
        logEvent('INFO', `⏰ Interval créé: ${id} (${ms}ms)`);
        return timer;
    }

    /**
     * Crée un timeout avec ID
     */
    setTimeout(id, fn, ms) {
        this.clearTimeout(id);
        const timer = setTimeout(fn, ms);
        this.timers.set(id, { type: 'timeout', timer, fn, ms });
        logEvent('INFO', `⏰ Timeout créé: ${id} (${ms}ms)`);
        return timer;
    }

    /**
     * Annule un timeout
     */
    clearTimeout(id) {
        const entry = this.timers.get(id);
        if (entry) {
            clearTimeout(entry.timer);
            this.timers.delete(id);
            logEvent('INFO', `⏹️ Timeout arrêté: ${id}`);
        }
    }

    /**
     * Annule un interval
     */
    clearInterval(id) {
        const entry = this.timers.get(id);
        if (entry) {
            clearInterval(entry.timer);
            this.timers.delete(id);
            logEvent('INFO', `⏹️ Interval arrêté: ${id}`);
        }
    }

    /**
     * Annule tous les timers
     */
    clearAll() {
        let count = 0;
        for (const [id, entry] of this.timers) {
            if (entry.type === 'interval') {
                clearInterval(entry.timer);
            } else {
                clearTimeout(entry.timer);
            }
            count++;
        }
        this.timers.clear();
        logEvent('INFO', `🧹 Tous les timers nettoyés: ${count} timers arrêtés`);
        return count;
    }

    /**
     * Vérifie si un timer existe
     */
    has(id) {
        return this.timers.has(id);
    }

    /**
     * Retourne le nombre de timers actifs
     */
    count() {
        return this.timers.size;
    }

    /**
     * Liste tous les timers actifs
     */
    list() {
        return Array.from(this.timers.entries()).map(([id, entry]) => ({
            id,
            type: entry.type,
            ms: entry.ms,
        }));
    }
}

module.exports = { TimerRegistry };
