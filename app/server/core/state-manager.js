/**
 * @file state-manager.js
 * @description Gestionnaire d'état centralisé avec événements
 * @version 3.1.1
 * 
 * Responsabilités:
 * - Stocker l'état complet de l'application
 * - Valider les mutations
 * - Émettre des événements sur changements
 * - Persister automatiquement (debounced)
 * 
 * Pattern: Singleton + Observer
 */

const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES D'ÉVÉNEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

const STATE_EVENTS = Object.freeze({
    // Compteurs
    FOLLOWS_UPDATED: 'follows:updated',
    SUBS_UPDATED: 'subs:updated',
    
    // Objectifs
    GOALS_CHANGED: 'goals:changed',
    FOLLOW_GOALS_LOADED: 'goals:follow:loaded',
    SUB_GOALS_LOADED: 'goals:sub:loaded',
    
    // Configuration
    CONFIG_CHANGED: 'config:changed',
    OVERLAY_CONFIG_CHANGED: 'config:overlay:changed',
    MODE_CHANGED: 'config:mode:changed',  // Nouveau : changement de mode realtime/session
    
    // Connexions
    EVENTSUB_CONNECTED: 'connection:eventsub:connected',
    EVENTSUB_DISCONNECTED: 'connection:eventsub:disconnected',
    CLIENT_CONNECTED: 'connection:client:connected',
    CLIENT_DISCONNECTED: 'connection:client:disconnected',
    
    // Batching
    BATCH_FLUSH_FOLLOWS: 'batch:flush:follows',
    BATCH_FLUSH_SUBS: 'batch:flush:subs',
    
    // Twitch Auth
    TWITCH_AUTHENTICATED: 'twitch:authenticated',
    TWITCH_TOKEN_REFRESHED: 'twitch:token:refreshed',
    TWITCH_DISCONNECTED: 'twitch:disconnected',
    
    // Erreurs
    ERROR: 'state:error'
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSE STATEMANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class StateManager extends EventEmitter {
    #state;
    #persistDebounceTimer;
    #persistFn;
    #persistDelay;
    
    /**
     * @param {Object} initialState - État initial (depuis app_state.json)
     * @param {Object} options - Options de configuration
     * @param {Function} options.persistFn - Fonction de persistance
     * @param {number} options.persistDelay - Délai avant persistance (ms)
     */
    constructor(initialState = {}, options = {}) {
        super();
        this.setMaxListeners(50); // Augmenter la limite pour éviter les warnings
        
        this.#state = this.#createInitialState(initialState);
        this.#persistFn = options.persistFn || (() => {});
        this.#persistDelay = options.persistDelay || 1000;
        this.#persistDebounceTimer = null;
    }
    
    /**
     * Crée la structure d'état initiale avec valeurs par défaut
     * @private
     */
    #createInitialState(initial) {
        return {
            // Compteurs principaux
            counters: {
                follows: initial.counters?.follows ?? 0,
                subs: initial.counters?.subs ?? 0,
                lastUpdated: initial.counters?.lastUpdated || null
            },
            
            // Objectifs (Maps pour accès O(1))
            goals: {
                follow: new Map(Object.entries(initial.goals?.follow || {})),
                sub: new Map(Object.entries(initial.goals?.sub || {}))
            },
            
            // État des connexions
            connections: {
                eventSubConnected: false,
                eventSubWs: null,
                sessionId: null,
                clientCount: 0,
                wsCounterServer: null,
                wsConfigServer: null
            },
            
            // Système de batching pour regrouper les événements
            batching: {
                follow: { count: 0, timer: null, isAnimating: false },
                followRemove: { count: 0, timer: null, isAnimating: false },
                sub: { count: 0, timer: null, isAnimating: false },
                subEnd: { count: 0, timer: null, isAnimating: false }
            },
            
            // Configuration Twitch (tokens chiffrés séparément)
            twitch: {
                userId: initial.twitch?.userId || null,
                userName: initial.twitch?.userName || null,
                accessToken: null,
                refreshToken: null,
                expiresAt: null
            },
            
            // Configuration overlay
            overlay: initial.overlay || {
                font: { family: 'Arial', size: '64px', weight: 'normal' },
                colors: { text: 'white', shadow: 'rgba(0,0,0,0.5)', stroke: 'black' },
                animation: { duration: '1s', easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
                layout: { paddingLeft: '20px', gap: '0' }
            },
            
            // Flags divers
            flags: {
                isInitializing: true,
                isPollingActive: false,
                reconnectAttempts: 0
            },
            
            // Configuration du mode de comptage des subs
            // 'realtime' = comportement actuel (incrémente ET décrémente en temps réel)
            // 'session' = sync au démarrage, puis seulement incrémente (pas de décrémentation pendant le stream)
            settings: {
                subCounterMode: initial.settings?.subCounterMode || 'realtime'
            },
            
            // Tracking
            tracking: {
                lastKnownFollowCount: initial.counters?.follows ?? 0,
                lastKnownSubCount: initial.counters?.subs ?? 0
            },
            
            // Timers (références, pas de valeurs)
            timers: {
                followPolling: null,
                deviceCodePolling: null,
                keepalive: null,
                subscription: null
            },
            
            // Device Code Flow
            deviceCode: {
                data: null,
                polling: null
            }
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GETTERS - Compteurs
    // ═══════════════════════════════════════════════════════════════════════════
    
    getFollows() {
        return this.#state.counters.follows;
    }
    
    getSubs() {
        return this.#state.counters.subs;
    }
    
    getCounters() {
        return { ...this.#state.counters };
    }
    
    getLastUpdated() {
        return this.#state.counters.lastUpdated;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GETTERS - Objectifs
    // ═══════════════════════════════════════════════════════════════════════════
    
    getFollowGoals() {
        return new Map(this.#state.goals.follow);
    }
    
    getSubGoals() {
        return new Map(this.#state.goals.sub);
    }
    
    getGoals(type) {
        if (type !== 'follow' && type !== 'sub') {
            throw new Error(`Invalid goal type: ${type}`);
        }
        return new Map(this.#state.goals[type]);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GETTERS - Connexions
    // ═══════════════════════════════════════════════════════════════════════════
    
    isEventSubConnected() {
        return this.#state.connections.eventSubConnected;
    }
    
    getEventSubWs() {
        return this.#state.connections.eventSubWs;
    }
    
    getSessionId() {
        return this.#state.connections.sessionId;
    }
    
    getClientCount() {
        return this.#state.connections.clientCount;
    }
    
    getWsCounterServer() {
        return this.#state.connections.wsCounterServer;
    }
    
    getWsConfigServer() {
        return this.#state.connections.wsConfigServer;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GETTERS - Batching
    // ═══════════════════════════════════════════════════════════════════════════
    
    getBatch(type) {
        return { ...this.#state.batching[type] };
    }
    
    getFollowBatch() {
        return { ...this.#state.batching.follow };
    }
    
    getSubBatch() {
        return { ...this.#state.batching.sub };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GETTERS - Twitch
    // ═══════════════════════════════════════════════════════════════════════════
    
    getTwitchUserId() {
        return this.#state.twitch.userId;
    }
    
    getTwitchUserName() {
        return this.#state.twitch.userName;
    }
    
    getTwitchAccessToken() {
        return this.#state.twitch.accessToken;
    }
    
    getTwitchRefreshToken() {
        return this.#state.twitch.refreshToken;
    }
    
    isTwitchAuthenticated() {
        return !!(this.#state.twitch.accessToken && this.#state.twitch.userId);
    }
    
    getTwitchConfig() {
        return {
            user_id: this.#state.twitch.userId,
            user_name: this.#state.twitch.userName,
            access_token: this.#state.twitch.accessToken,
            refresh_token: this.#state.twitch.refreshToken
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GETTERS - Overlay Config
    // ═══════════════════════════════════════════════════════════════════════════
    
    getOverlayConfig() {
        return JSON.parse(JSON.stringify(this.#state.overlay));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GETTERS - Flags & Tracking
    // ═══════════════════════════════════════════════════════════════════════════
    
    isInitializing() {
        return this.#state.flags.isInitializing;
    }
    
    isPollingActive() {
        return this.#state.flags.isPollingActive;
    }
    
    getReconnectAttempts() {
        return this.#state.flags.reconnectAttempts;
    }
    
    getLastKnownFollowCount() {
        return this.#state.tracking.lastKnownFollowCount;
    }
    
    getLastKnownSubCount() {
        return this.#state.tracking.lastKnownSubCount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GETTERS/SETTERS - Settings (Mode de compteur)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Récupère le mode de compteur de subs
     * @returns {'realtime'|'session'} Mode actuel
     */
    getSubCounterMode() {
        return this.#state.settings.subCounterMode;
    }
    
    /**
     * Définit le mode de compteur de subs
     * @param {'realtime'|'session'} mode - 'realtime' ou 'session'
     * @returns {boolean} Succès
     */
    setSubCounterMode(mode) {
        if (mode !== 'realtime' && mode !== 'session') {
            this.emit(STATE_EVENTS.ERROR, {
                message: 'Invalid sub counter mode',
                value: mode
            });
            return false;
        }
        
        const oldMode = this.#state.settings.subCounterMode;
        if (oldMode === mode) return false;
        
        this.#state.settings.subCounterMode = mode;
        
        // Émettre un événement spécifique pour le changement de mode
        this.emit(STATE_EVENTS.MODE_CHANGED, {
            oldMode: oldMode,
            newMode: mode,
            isSession: mode === 'session'
        });
        
        this.emit(STATE_EVENTS.CONFIG_CHANGED, {
            setting: 'subCounterMode',
            oldValue: oldMode,
            newValue: mode
        });
        
        this.#schedulePersist();
        return true;
    }
    
    /**
     * Récupère le mode de compteur actuel
     * @returns {'realtime'|'session'}
     */
    getSubCounterMode() {
        return this.#state.settings.subCounterMode;
    }
    
    /**
     * Vérifie si le mode session est actif (pas de décrémentation)
     * @returns {boolean}
     */
    isSessionMode() {
        return this.#state.settings.subCounterMode === 'session';
    }
    
    /**
     * Récupère tous les settings
     * @returns {Object}
     */
    getSettings() {
        return { ...this.#state.settings };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GETTERS - Device Code
    // ═══════════════════════════════════════════════════════════════════════════
    
    getDeviceCodeData() {
        return this.#state.deviceCode.data;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SETTERS - Compteurs (avec événements)
    // ═══════════════════════════════════════════════════════════════════════════
    
    setFollows(value, source = 'unknown') {
        if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
            this.emit(STATE_EVENTS.ERROR, {
                message: 'Invalid follows value',
                value,
                source
            });
            return false;
        }
        
        const oldValue = this.#state.counters.follows;
        if (oldValue === value) return false;
        
        this.#state.counters.follows = value;
        this.#state.counters.lastUpdated = new Date().toISOString();
        
        this.emit(STATE_EVENTS.FOLLOWS_UPDATED, {
            oldValue,
            newValue: value,
            diff: value - oldValue,
            source
        });
        
        this.#schedulePersist();
        return true;
    }
    
    setSubs(value, source = 'unknown') {
        if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
            this.emit(STATE_EVENTS.ERROR, {
                message: 'Invalid subs value',
                value,
                source
            });
            return false;
        }
        
        const oldValue = this.#state.counters.subs;
        if (oldValue === value) return false;
        
        this.#state.counters.subs = value;
        this.#state.counters.lastUpdated = new Date().toISOString();
        
        this.emit(STATE_EVENTS.SUBS_UPDATED, {
            oldValue,
            newValue: value,
            diff: value - oldValue,
            source
        });
        
        this.#schedulePersist();
        return true;
    }
    
    incrementFollows(amount = 1, source = 'event') {
        return this.setFollows(this.getFollows() + amount, source);
    }
    
    decrementFollows(amount = 1, source = 'event') {
        return this.setFollows(Math.max(0, this.getFollows() - amount), source);
    }
    
    incrementSubs(amount = 1, source = 'event') {
        return this.setSubs(this.getSubs() + amount, source);
    }
    
    decrementSubs(amount = 1, source = 'event') {
        return this.setSubs(Math.max(0, this.getSubs() - amount), source);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SETTERS - Objectifs
    // ═══════════════════════════════════════════════════════════════════════════
    
    setFollowGoals(goalsMap) {
        if (!(goalsMap instanceof Map)) {
            goalsMap = new Map(Object.entries(goalsMap));
        }
        this.#state.goals.follow = goalsMap;
        this.emit(STATE_EVENTS.FOLLOW_GOALS_LOADED, { count: goalsMap.size });
        this.emit(STATE_EVENTS.GOALS_CHANGED, { type: 'follow', count: goalsMap.size });
    }
    
    setSubGoals(goalsMap) {
        if (!(goalsMap instanceof Map)) {
            goalsMap = new Map(Object.entries(goalsMap));
        }
        this.#state.goals.sub = goalsMap;
        this.emit(STATE_EVENTS.SUB_GOALS_LOADED, { count: goalsMap.size });
        this.emit(STATE_EVENTS.GOALS_CHANGED, { type: 'sub', count: goalsMap.size });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SETTERS - Connexions
    // ═══════════════════════════════════════════════════════════════════════════
    
    setEventSubConnected(connected, ws = null, sessionId = null) {
        this.#state.connections.eventSubConnected = connected;
        this.#state.connections.eventSubWs = ws;
        this.#state.connections.sessionId = sessionId;
        
        if (connected) {
            this.emit(STATE_EVENTS.EVENTSUB_CONNECTED, { sessionId });
        } else {
            this.emit(STATE_EVENTS.EVENTSUB_DISCONNECTED);
        }
    }
    
    setWsServers(counterServer, configServer) {
        this.#state.connections.wsCounterServer = counterServer;
        this.#state.connections.wsConfigServer = configServer;
    }
    
    incrementClientCount() {
        this.#state.connections.clientCount++;
        this.emit(STATE_EVENTS.CLIENT_CONNECTED, { count: this.#state.connections.clientCount });
    }
    
    decrementClientCount() {
        this.#state.connections.clientCount = Math.max(0, this.#state.connections.clientCount - 1);
        this.emit(STATE_EVENTS.CLIENT_DISCONNECTED, { count: this.#state.connections.clientCount });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SETTERS - Batching
    // ═══════════════════════════════════════════════════════════════════════════
    
    updateBatch(type, updates) {
        Object.assign(this.#state.batching[type], updates);
    }
    
    setBatchCount(type, count) {
        this.#state.batching[type].count = count;
    }
    
    setBatchTimer(type, timer) {
        this.#state.batching[type].timer = timer;
    }
    
    setBatchAnimating(type, isAnimating) {
        this.#state.batching[type].isAnimating = isAnimating;
    }
    
    addToBatch(type, amount = 1) {
        this.#state.batching[type].count += amount;
        return this.#state.batching[type].count;
    }
    
    resetBatch(type) {
        const count = this.#state.batching[type].count;
        this.#state.batching[type].count = 0;
        this.#state.batching[type].timer = null;
        return count;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SETTERS - Twitch
    // ═══════════════════════════════════════════════════════════════════════════
    
    setTwitchAuth(userId, userName, accessToken, refreshToken) {
        this.#state.twitch.userId = userId;
        this.#state.twitch.userName = userName;
        this.#state.twitch.accessToken = accessToken;
        this.#state.twitch.refreshToken = refreshToken;
        
        this.emit(STATE_EVENTS.TWITCH_AUTHENTICATED, { userId, userName });
    }
    
    setTwitchTokens(accessToken, refreshToken) {
        this.#state.twitch.accessToken = accessToken;
        this.#state.twitch.refreshToken = refreshToken;
        
        this.emit(STATE_EVENTS.TWITCH_TOKEN_REFRESHED);
    }
    
    clearTwitchAuth() {
        this.#state.twitch.userId = null;
        this.#state.twitch.userName = null;
        this.#state.twitch.accessToken = null;
        this.#state.twitch.refreshToken = null;
        
        this.emit(STATE_EVENTS.TWITCH_DISCONNECTED);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SETTERS - Overlay Config
    // ═══════════════════════════════════════════════════════════════════════════
    
    setOverlayConfig(config) {
        this.#state.overlay = JSON.parse(JSON.stringify(config));
        this.emit(STATE_EVENTS.OVERLAY_CONFIG_CHANGED, config);
        this.#schedulePersist();
    }
    
    updateOverlayConfig(updates) {
        Object.assign(this.#state.overlay, updates);
        this.emit(STATE_EVENTS.OVERLAY_CONFIG_CHANGED, this.#state.overlay);
        this.#schedulePersist();
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SETTERS - Flags & Tracking
    // ═══════════════════════════════════════════════════════════════════════════
    
    setInitializing(value) {
        this.#state.flags.isInitializing = value;
    }
    
    setPollingActive(value) {
        this.#state.flags.isPollingActive = value;
    }
    
    setReconnectAttempts(value) {
        this.#state.flags.reconnectAttempts = value;
    }
    
    incrementReconnectAttempts() {
        this.#state.flags.reconnectAttempts++;
        return this.#state.flags.reconnectAttempts;
    }
    
    resetReconnectAttempts() {
        this.#state.flags.reconnectAttempts = 0;
    }
    
    setLastKnownFollowCount(value) {
        this.#state.tracking.lastKnownFollowCount = value;
    }
    
    setLastKnownSubCount(value) {
        this.#state.tracking.lastKnownSubCount = value;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SETTERS - Timers
    // ═══════════════════════════════════════════════════════════════════════════
    
    setTimer(name, timer) {
        this.#state.timers[name] = timer;
    }
    
    getTimer(name) {
        return this.#state.timers[name];
    }
    
    clearTimer(name) {
        if (this.#state.timers[name]) {
            clearTimeout(this.#state.timers[name]);
            clearInterval(this.#state.timers[name]);
            this.#state.timers[name] = null;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SETTERS - Device Code
    // ═══════════════════════════════════════════════════════════════════════════
    
    setDeviceCodeData(data) {
        this.#state.deviceCode.data = data;
    }
    
    clearDeviceCodeData() {
        this.#state.deviceCode.data = null;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PERSISTANCE
    // ═══════════════════════════════════════════════════════════════════════════
    
    #schedulePersist() {
        if (this.#persistDebounceTimer) {
            clearTimeout(this.#persistDebounceTimer);
        }
        
        this.#persistDebounceTimer = setTimeout(() => {
            this.#persistFn(this.toJSON());
        }, this.#persistDelay);
    }
    
    forcePersist() {
        if (this.#persistDebounceTimer) {
            clearTimeout(this.#persistDebounceTimer);
        }
        this.#persistFn(this.toJSON());
    }
    
    /**
     * Exporte l'état pour persistance (sans données sensibles)
     */
    toJSON() {
        return {
            counters: { ...this.#state.counters },
            goals: {
                currentFollowGoal: this.getCurrentFollowGoal(),
                currentSubGoal: this.getCurrentSubGoal()
            },
            overlay: { ...this.#state.overlay },
            settings: { ...this.#state.settings },
            version: {
                current: '3.1.1',
                releaseDate: new Date().toISOString().split('T')[0]
            }
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULS D'OBJECTIFS
    // ═══════════════════════════════════════════════════════════════════════════
    
    getCurrentFollowGoal() {
        const goals = this.#state.goals.follow;
        const current = this.#state.counters.follows;
        
        const sortedGoals = [...goals.keys()].map(Number).sort((a, b) => a - b);
        const nextGoal = sortedGoals.find(g => g > current);
        
        return nextGoal || sortedGoals[sortedGoals.length - 1] || 100;
    }
    
    getCurrentSubGoal() {
        const goals = this.#state.goals.sub;
        const current = this.#state.counters.subs;
        
        const sortedGoals = [...goals.keys()].map(Number).sort((a, b) => a - b);
        const nextGoal = sortedGoals.find(g => g > current);
        
        return nextGoal || sortedGoals[sortedGoals.length - 1] || 10;
    }
    
    getFollowGoalMessage(goal) {
        return this.#state.goals.follow.get(String(goal)) || '';
    }
    
    getSubGoalMessage(goal) {
        return this.#state.goals.sub.get(String(goal)) || '';
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SNAPSHOT (debugging)
    // ═══════════════════════════════════════════════════════════════════════════
    
    getSnapshot() {
        return {
            counters: { ...this.#state.counters },
            connections: {
                eventSubConnected: this.#state.connections.eventSubConnected,
                clientCount: this.#state.connections.clientCount
            },
            batching: {
                followPending: this.#state.batching.follow.count,
                subPending: this.#state.batching.sub.count
            },
            twitch: {
                authenticated: this.isTwitchAuthenticated(),
                userName: this.#state.twitch.userName
            },
            flags: { ...this.#state.flags }
        };
    }
}

module.exports = { StateManager, STATE_EVENTS };
