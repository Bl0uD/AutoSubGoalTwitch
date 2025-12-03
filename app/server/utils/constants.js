/**
 * @file constants.js
 * @description Constantes de configuration centralisées
 * @version 2.3.1
 */

/**
 * Types d'événements valides
 */
const VALID_EVENT_TYPES = Object.freeze({
    FOLLOW: 'follow',
    SUB: 'sub',
    SUB_END: 'sub_end',
    SYNC: 'sync',
});

/**
 * Limites et délais du système
 */
const LIMITS = Object.freeze({
    MAX_RECONNECT_ATTEMPTS: 10,
    RECONNECT_DELAY: 5000,
    ANIMATION_DURATION: 1000,
    BATCH_DELAY: 100,
    MAX_EVENTS_PER_BATCH: 10,
    EVENT_PROCESSING_DELAY: 500,
    MAX_LOG_SIZE_MB: 2,
    LOG_KEEP_LINES: 500,
    KEEPALIVE_TIMEOUT: 10,
    WEBSOCKET_BUFFER_LIMIT: 1024 * 1024, // 1MB
    POLLING_INTERVAL_FOLLOWS: 10000, // 10 secondes pour détecter les unfollows (pas d'événement EventSub)
    POLLING_INTERVAL_SUBS: 60000,    // 60 secondes pour les subs (EventSub gère les événements temps réel)
});

/**
 * Tiers Twitch valides
 */
const VALID_TIERS = Object.freeze(['1000', '2000', '3000']);

/**
 * Sources de compteurs valides
 */
const VALID_SOURCES = Object.freeze(['twitch', 'manual', 'api']);

/**
 * Ports du serveur
 */
const PORTS = Object.freeze({
    HTTP: 8082,
    WS_COUNTER: 8083,   // Alias: WS_DATA
    WS_DATA: 8083,      // Legacy
    WS_CONFIG: 8084,
});

/**
 * ID Client Twitch
 */
const TWITCH_CLIENT_ID = '8o91k8bmpi79inwkjj7sgggvpkavr5';

module.exports = {
    VALID_EVENT_TYPES,
    LIMITS,
    VALID_TIERS,
    VALID_SOURCES,
    PORTS,
    TWITCH_CLIENT_ID,
};
