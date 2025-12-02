/**
 * @file event-queue.js
 * @description File d'attente thread-safe pour les événements
 * @version 2.3.1
 */

const { logEvent } = require('./logger');
const { LIMITS, VALID_EVENT_TYPES } = require('./constants');

/**
 * EventQueue - File d'attente pour les événements Twitch
 * Résout les race conditions du buffer d'événements
 */
class EventQueue {
    constructor(eventHandlers = {}) {
        this.queue = [];
        this.processing = false;
        this.eventHandlers = eventHandlers;
    }

    /**
     * Définit les gestionnaires d'événements
     */
    setHandlers(handlers) {
        this.eventHandlers = handlers;
    }

    /**
     * Ajoute un événement à la queue
     */
    async add(event) {
        // Valider l'événement
        if (!event || !event.type) {
            logEvent('ERROR', '❌ Événement invalide ignoré', { event });
            return false;
        }

        this.queue.push(event);
        logEvent('INFO', `📦 Événement ajouté à la queue: ${event.type} (${this.queue.length} en attente)`);
        
        await this.process();
        return true;
    }

    /**
     * Traite les événements en attente
     */
    async process() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        try {
            while (this.queue.length > 0) {
                const batch = this.queue.splice(0, LIMITS.MAX_EVENTS_PER_BATCH);
                await this.processBatch(batch);
            }
        } catch (error) {
            logEvent('ERROR', '❌ Erreur traitement queue:', { error: error.message });
        } finally {
            this.processing = false;
        }
    }

    /**
     * Traite un batch d'événements
     */
    async processBatch(batch) {
        logEvent('INFO', `⚡ Traitement batch: ${batch.length} événements`);
        
        for (const event of batch) {
            try {
                await this.processEvent(event);
            } catch (error) {
                logEvent('ERROR', `❌ Erreur événement ${event.type}:`, { error: error.message });
            }
        }
    }

    /**
     * Traite un événement individuel
     */
    async processEvent(event) {
        const handler = this.eventHandlers[event.type];
        
        if (handler) {
            await handler(event.data);
        } else {
            logEvent('WARN', `⚠️ Type événement inconnu: ${event.type}`);
        }
    }

    /**
     * Vide la queue
     */
    clear() {
        const count = this.queue.length;
        this.queue = [];
        logEvent('INFO', `🧹 Queue vidée: ${count} événements supprimés`);
        return count;
    }

    /**
     * Retourne la taille de la queue
     */
    size() {
        return this.queue.length;
    }

    /**
     * Retourne une copie de tous les événements
     */
    getAll() {
        return [...this.queue];
    }

    /**
     * Vérifie si la queue est en cours de traitement
     */
    isProcessing() {
        return this.processing;
    }
}

module.exports = { EventQueue };
