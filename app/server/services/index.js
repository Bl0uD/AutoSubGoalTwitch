/**
 * @file index.js
 * @description Point d'entrée pour les services
 * @version 3.0.0
 * 
 * Ce module exporte tous les services de l'application :
 * - app-state : Gestion de l'état persistant de l'application
 * - twitch : Service Twitch (Device Code Flow, tokens, API)
 * - goals : Gestion des objectifs follows/subs
 * - batching : Système de batching intelligent pour les événements
 * - broadcast : Diffusion WebSocket aux clients
 */

const appState = require('./app-state');
const twitchService = require('./twitch');
const goalsService = require('./goals');
const batchingService = require('./batching');
const { createBroadcastService } = require('./broadcast');

module.exports = {
    // App State (exports directs)
    ...appState,
    
    // Services avec pattern initContext
    twitchService,
    goalsService,
    batchingService,
    
    // Service avec pattern factory
    createBroadcastService,
};
