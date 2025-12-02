/**
 * @file index.js
 * @description Export centralisé des factories
 * @version 3.1.0
 */

const { createGoalsService } = require('./goals-factory');
const { createBroadcastService } = require('./broadcast-factory');
const { createBatchingService } = require('./batching-factory');
const { createTwitchApiService } = require('./twitch-api-factory');
const { createEventSubService } = require('./eventsub-factory');
const { createPollingService } = require('./polling-factory');

module.exports = {
    createGoalsService,
    createBroadcastService,
    createBatchingService,
    createTwitchApiService,
    createEventSubService,
    createPollingService
};
