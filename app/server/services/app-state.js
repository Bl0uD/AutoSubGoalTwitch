/**
 * @file app-state.js
 * @description Gestion centralisée de l'état de l'application (app_state.json)
 * @version 2.3.1
 */

const fs = require('fs');
const path = require('path');

// Chemin vers le fichier d'état centralisé
const APP_STATE_PATH = path.join(__dirname, '..', '..', 'config', 'app_state.json');

/**
 * État par défaut de l'application
 */
const DEFAULT_STATE = {
    counters: { 
        follows: 0, 
        subs: 0, 
        lastUpdated: new Date().toISOString() 
    },
    goals: { 
        currentFollowGoal: 100, 
        currentSubGoal: 10 
    },
    overlay: {
        font: { family: 'Arial', size: '64px', weight: 'normal' },
        colors: { text: 'white', shadow: 'rgba(0,0,0,0.5)', stroke: 'black' },
        animation: { duration: '1s', easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
        layout: { paddingLeft: '20px', gap: '0' }
    },
    update: { 
        enabled: true, 
        checkOnStartup: true, 
        checkIntervalHours: 24 
    },
    version: { 
        current: '2.3.1', 
        releaseDate: '2025-12-02' 
    }
};

/**
 * Charge l'état de l'application depuis app_state.json
 * @returns {Object} L'état de l'application ou valeurs par défaut
 */
function loadAppState() {
    try {
        if (fs.existsSync(APP_STATE_PATH)) {
            const data = fs.readFileSync(APP_STATE_PATH, 'utf8');
            const state = JSON.parse(data);
            console.log('📦 État de l\'application chargé depuis app_state.json');
            return state;
        }
    } catch (error) {
        console.error('❌ Erreur chargement app_state.json:', error.message);
    }
    
    return { ...DEFAULT_STATE };
}

/**
 * Sauvegarde l'état de l'application dans app_state.json (atomique)
 * @param {Object} state - L'état complet à sauvegarder
 */
function saveAppState(state) {
    try {
        // Mise à jour du timestamp
        if (state.counters) {
            state.counters.lastUpdated = new Date().toISOString();
        }
        
        // Écriture atomique : écrire dans un fichier temporaire puis renommer
        const tempPath = APP_STATE_PATH + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8');
        fs.renameSync(tempPath, APP_STATE_PATH);
        
        console.log(`💾 État sauvegardé: ${state.counters?.follows || 0} follows, ${state.counters?.subs || 0} subs`);
    } catch (error) {
        console.error('❌ Erreur sauvegarde app_state.json:', error.message);
    }
}

/**
 * Met à jour les compteurs et sauvegarde
 * @param {string} type - 'follows' ou 'subs'
 * @param {number} value - Nouvelle valeur
 */
function updateCounter(type, value) {
    const state = loadAppState();
    state.counters[type] = value;
    saveAppState(state);
}

/**
 * Récupère la configuration overlay depuis l'état
 * @returns {Object} Configuration overlay
 */
function getOverlayConfig() {
    const state = loadAppState();
    return state.overlay;
}

/**
 * Met à jour la configuration overlay
 * @param {Object} updates - Mises à jour partielles
 * @returns {Object} Configuration overlay mise à jour
 */
function updateOverlayConfig(updates) {
    const state = loadAppState();
    if (updates.font) state.overlay.font = { ...state.overlay.font, ...updates.font };
    if (updates.colors) state.overlay.colors = { ...state.overlay.colors, ...updates.colors };
    if (updates.animation) state.overlay.animation = { ...state.overlay.animation, ...updates.animation };
    if (updates.layout) state.overlay.layout = { ...state.overlay.layout, ...updates.layout };
    saveAppState(state);
    return state.overlay;
}

/**
 * Récupère les informations de version
 * @returns {Object} Version info
 */
function getVersionInfo() {
    const state = loadAppState();
    return state.version;
}

/**
 * Récupère les compteurs actuels
 * @returns {Object} { follows, subs, lastUpdated }
 */
function getCounters() {
    const state = loadAppState();
    return state.counters;
}

/**
 * Met à jour les compteurs follows et subs
 * @param {number} follows - Nouveau nombre de follows
 * @param {number} subs - Nouveau nombre de subs
 */
function setCounters(follows, subs) {
    const state = loadAppState();
    state.counters.follows = follows;
    state.counters.subs = subs;
    saveAppState(state);
}

module.exports = {
    APP_STATE_PATH,
    DEFAULT_STATE,
    loadAppState,
    saveAppState,
    updateCounter,
    getOverlayConfig,
    updateOverlayConfig,
    getVersionInfo,
    getCounters,
    setCounters,
};
