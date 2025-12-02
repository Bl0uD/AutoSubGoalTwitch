/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📄 ROUTES - Index (LEGACY)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ ATTENTION: Ces routes sont utilisées uniquement par server-legacy.js
 * Le nouveau server.js (v3.1) définit les routes en inline.
 * 
 * @deprecated Utilisez server.js avec l'architecture core/factories
 * @see core/bootstrap.js pour la nouvelle architecture
 * 
 * Point d'entrée centralisé pour tous les routeurs Express.
 * 
 * Modules:
 * - pages  → Routes pour les pages HTML (/, /dashboard, /config, /admin)
 * - api    → Routes API publiques (/api/status, /api/stats, etc.)
 * - admin  → Routes administration (/admin/*)
 * - twitch → Routes Twitch (/api/auth-status, /api/sync-twitch, etc.)
 */

const pagesRouter = require('./pages');
const { router: apiRouter, initContext: initApiContext } = require('./api');
const { router: adminRouter, initContext: initAdminContext } = require('./admin');
const { router: twitchRouter, initContext: initTwitchContext } = require('./twitch');

/**
 * Initialise tous les contextes des routeurs
 * @param {Object} context - Contexte de l'application contenant les fonctions et variables globales
 */
function initAllContexts(context) {
    initApiContext(context);
    initAdminContext(context);
    initTwitchContext(context);
}

module.exports = {
    pagesRouter,
    apiRouter,
    adminRouter,
    twitchRouter,
    initAllContexts
};
