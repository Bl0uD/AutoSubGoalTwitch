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
 * - counters : Gestion des compteurs follows/subs
 * - files : Mise à jour des fichiers overlays
 * - polling : Polling des follows en backup d'EventSub
 * - event-handlers : Handlers pour les événements follows/subs
 * - eventsub : Connexion WebSocket EventSub Twitch
 * - twitch-config : Gestion de la configuration Twitch
 */

const appState = require('./app-state');
const twitchService = require('./twitch');
const goalsService = require('./goals');
const batchingService = require('./batching');
const countersService = require('./counters');
const filesService = require('./files');
const pollingService = require('./polling');
const eventHandlersService = require('./event-handlers');
const eventsubService = require('./eventsub');
const twitchConfigService = require('./twitch-config');
const { createBroadcastService } = require('./broadcast');

module.exports = {
    // App State (exports directs)
    ...appState,
    
    // Services avec pattern initContext
    twitchService,
    goalsService,
    batchingService,
    countersService,
    filesService,
    pollingService,
    eventHandlersService,
    eventsubService,
    twitchConfigService,
    
    // Service avec pattern factory
    createBroadcastService,
};
