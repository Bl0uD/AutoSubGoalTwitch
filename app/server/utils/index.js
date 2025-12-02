/**
 * @file index.js
 * @description Point d'entrée pour les utilitaires
 * @version 2.3.1
 */

// Logger
const { Logger, logger, logEvent, LOG_LEVELS } = require('./logger');

// Validation
const { 
    validatePositiveInt, 
    validateString, 
    validateEnum, 
    validateTier,
    validateBoolean,
} = require('./validation');

// Constantes
const { 
    VALID_EVENT_TYPES, 
    LIMITS, 
    VALID_TIERS, 
    VALID_SOURCES,
    PORTS,
    TWITCH_CLIENT_ID,
} = require('./constants');

// Classes utilitaires
const { EventQueue } = require('./event-queue');
const { TimerRegistry } = require('./timer-registry');
const { SimpleRateLimiter, TokenBucketLimiter } = require('./rate-limiter');

module.exports = {
    // Logger
    Logger,
    logger,
    logEvent,
    LOG_LEVELS,
    
    // Validation
    validatePositiveInt,
    validateString,
    validateEnum,
    validateTier,
    validateBoolean,
    
    // Constantes
    VALID_EVENT_TYPES,
    LIMITS,
    VALID_TIERS,
    VALID_SOURCES,
    PORTS,
    TWITCH_CLIENT_ID,
    
    // Classes
    EventQueue,
    TimerRegistry,
    SimpleRateLimiter,
    TokenBucketLimiter,
};
