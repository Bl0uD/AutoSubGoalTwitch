/**
 * @file index.js
 * @description Export centralisé du module core
 * @version 3.1.0
 */

const { StateManager, STATE_EVENTS } = require('./state-manager');
const { DependencyContainer } = require('./dependency-container');
const { bootstrap, setupEventListeners, ROOT_DIR } = require('./bootstrap');

// Re-export des factories
const factories = require('./factories');

module.exports = {
    // Core classes
    StateManager,
    STATE_EVENTS,
    DependencyContainer,
    
    // Bootstrap
    bootstrap,
    setupEventListeners,
    ROOT_DIR,
    
    // Factories
    ...factories
};
