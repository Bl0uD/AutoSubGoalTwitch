/**
 * @file twitch-api-factory.js
 * @description Factory pour le service API Twitch
 * @version 3.1.0
 * 
 * Pattern: Factory avec injection de dépendances
 * Gère les appels API Twitch, l'authentification et les tokens
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

/**
 * Crée le service API Twitch
 * @param {Object} deps - Dépendances injectées
 * @param {StateManager} deps.stateManager
 * @param {Object} deps.configCrypto
 * @param {Object} deps.logger
 * @param {Object} deps.constants
 * @param {string} deps.ROOT_DIR
 * @returns {Object} API du service
 */
function createTwitchApiService({ stateManager, configCrypto, logger, constants, ROOT_DIR }) {
    const { logEvent } = logger;
    const { TWITCH_CLIENT_ID, LIMITS } = constants;
    
    const CONFIG_PATH = path.join(ROOT_DIR, 'obs', 'data', 'twitch_config.txt');
    const API_TIMEOUT = LIMITS.API_TIMEOUT || 10000;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GESTION DES TOKENS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Charge les tokens sauvegardés
     * @returns {Promise<boolean>} Succès
     */
    async function loadSavedTokens() {
        try {
            if (!fs.existsSync(CONFIG_PATH)) {
                logEvent('INFO', '📄 Fichier twitch_config.txt non trouvé');
                return false;
            }
            
            const content = fs.readFileSync(CONFIG_PATH, 'utf8').trim();
            
            // Format: encrypted_data ou client_id:client_secret:channel
            if (content.includes(':') && !content.startsWith('{')) {
                // Ancien format non chiffré
                const parts = content.split(':');
                if (parts.length >= 3) {
                    logEvent('WARN', '⚠️ Config Twitch en format ancien (non chiffré)');
                    return false;
                }
            }
            
            // Tenter de déchiffrer
            const decrypted = configCrypto.decryptConfig(content);
            if (!decrypted) {
                logEvent('WARN', '⚠️ Impossible de déchiffrer la config Twitch');
                return false;
            }
            
            // Valider les tokens
            if (decrypted.access_token && decrypted.user_id) {
                stateManager.setTwitchAuth(
                    decrypted.user_id,
                    decrypted.user_name || null,
                    decrypted.access_token,
                    decrypted.refresh_token
                );
                
                logEvent('INFO', `✅ Tokens Twitch chargés pour ${decrypted.user_name || decrypted.user_id}`);
                
                // Valider le token
                const isValid = await validateToken();
                if (!isValid) {
                    logEvent('WARN', '⚠️ Token expiré, tentative de rafraîchissement...');
                    return await refreshToken();
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            logEvent('ERROR', '❌ Erreur chargement tokens Twitch', { error: error.message });
            return false;
        }
    }
    
    /**
     * Sauvegarde les tokens de façon chiffrée
     * @returns {boolean} Succès
     */
    function saveTokens() {
        try {
            const config = {
                user_id: stateManager.getTwitchUserId(),
                user_name: stateManager.getTwitchUserName(),
                access_token: stateManager.getTwitchAccessToken(),
                refresh_token: stateManager.getTwitchRefreshToken()
            };
            
            const encrypted = configCrypto.encryptConfig(config);
            fs.writeFileSync(CONFIG_PATH, encrypted, 'utf8');
            
            logEvent('INFO', '✅ Tokens Twitch sauvegardés');
            return true;
            
        } catch (error) {
            logEvent('ERROR', '❌ Erreur sauvegarde tokens', { error: error.message });
            return false;
        }
    }
    
    /**
     * Valide le token actuel auprès de Twitch
     * @returns {Promise<boolean>}
     */
    async function validateToken() {
        const token = stateManager.getTwitchAccessToken();
        if (!token) return false;
        
        try {
            const response = await fetch('https://id.twitch.tv/oauth2/validate', {
                headers: { 'Authorization': `OAuth ${token}` },
                timeout: API_TIMEOUT
            });
            
            if (response.ok) {
                const data = await response.json();
                logEvent('INFO', `✅ Token valide (expire dans ${data.expires_in}s)`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            logEvent('ERROR', '❌ Erreur validation token', { error: error.message });
            return false;
        }
    }
    
    /**
     * Rafraîchit le token d'accès
     * @returns {Promise<boolean>}
     */
    async function refreshToken() {
        const refreshTokenValue = stateManager.getTwitchRefreshToken();
        if (!refreshTokenValue) {
            logEvent('WARN', '⚠️ Pas de refresh token disponible');
            return false;
        }
        
        try {
            const response = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshTokenValue,
                    client_id: TWITCH_CLIENT_ID
                }),
                timeout: API_TIMEOUT
            });
            
            if (response.ok) {
                const data = await response.json();
                
                stateManager.setTwitchTokens(data.access_token, data.refresh_token);
                saveTokens();
                
                logEvent('INFO', '✅ Token rafraîchi avec succès');
                return true;
            }
            
            const error = await response.text();
            logEvent('ERROR', '❌ Erreur rafraîchissement token', { error });
            return false;
            
        } catch (error) {
            logEvent('ERROR', '❌ Erreur réseau rafraîchissement', { error: error.message });
            return false;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DEVICE CODE FLOW
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Initie le Device Code Flow
     * @returns {Promise<Object|null>} Données du device code
     */
    async function initiateDeviceCodeFlow() {
        try {
            const response = await fetch('https://id.twitch.tv/oauth2/device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: TWITCH_CLIENT_ID,
                    scopes: 'moderator:read:followers channel:read:subscriptions'
                }),
                timeout: API_TIMEOUT
            });
            
            if (response.ok) {
                const data = await response.json();
                stateManager.setDeviceCodeData(data);
                
                logEvent('INFO', `🔗 Device Code: ${data.user_code}`);
                logEvent('INFO', `🌐 URL: ${data.verification_uri}`);
                
                return data;
            }
            
            const error = await response.text();
            logEvent('ERROR', '❌ Erreur Device Code Flow', { error });
            return null;
            
        } catch (error) {
            logEvent('ERROR', '❌ Erreur réseau Device Code', { error: error.message });
            return null;
        }
    }
    
    /**
     * Poll pour vérifier si l'utilisateur a autorisé
     * @returns {Promise<boolean>}
     */
    async function pollDeviceCode() {
        const deviceData = stateManager.getDeviceCodeData();
        if (!deviceData) return false;
        
        try {
            const response = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: TWITCH_CLIENT_ID,
                    device_code: deviceData.device_code,
                    grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                }),
                timeout: API_TIMEOUT
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Récupérer les infos utilisateur
                const userInfo = await getUserInfo(data.access_token);
                
                if (userInfo) {
                    stateManager.setTwitchAuth(
                        userInfo.id,
                        userInfo.login,
                        data.access_token,
                        data.refresh_token
                    );
                    
                    stateManager.clearDeviceCodeData();
                    saveTokens();
                    
                    logEvent('INFO', `✅ Authentifié en tant que ${userInfo.login}`);
                    return true;
                }
            } else {
                const error = await response.json();
                if (error.message === 'authorization_pending') {
                    // Normal, l'utilisateur n'a pas encore autorisé
                    return false;
                }
                logEvent('WARN', '⚠️ Device code poll', { error: error.message });
            }
            
            return false;
            
        } catch (error) {
            logEvent('ERROR', '❌ Erreur poll device code', { error: error.message });
            return false;
        }
    }
    
    /**
     * Annule le Device Code Flow en cours
     */
    function cancelDeviceCodeFlow() {
        stateManager.clearDeviceCodeData();
        logEvent('INFO', '🚫 Device Code Flow annulé');
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // API CALLS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Headers d'authentification pour les appels API
     * @returns {Object}
     */
    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${stateManager.getTwitchAccessToken()}`,
            'Client-Id': TWITCH_CLIENT_ID
        };
    }
    
    /**
     * Récupère les infos utilisateur
     * @param {string} [token] - Token optionnel (sinon utilise celui du state)
     * @returns {Promise<Object|null>}
     */
    async function getUserInfo(token = null) {
        const accessToken = token || stateManager.getTwitchAccessToken();
        if (!accessToken) return null;
        
        try {
            const response = await fetch('https://api.twitch.tv/helix/users', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-Id': TWITCH_CLIENT_ID
                },
                timeout: API_TIMEOUT
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.data[0] || null;
            }
            
            return null;
            
        } catch (error) {
            logEvent('ERROR', '❌ Erreur getUserInfo', { error: error.message });
            return null;
        }
    }
    
    /**
     * Récupère le nombre de followers
     * @returns {Promise<number|null>}
     */
    async function getFollowCount() {
        const userId = stateManager.getTwitchUserId();
        if (!userId) return null;
        
        try {
            const response = await fetch(
                `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}&first=1`,
                {
                    headers: getAuthHeaders(),
                    timeout: API_TIMEOUT
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                return data.total;
            }
            
            if (response.status === 401) {
                logEvent('WARN', '⚠️ Token expiré, rafraîchissement...');
                if (await refreshToken()) {
                    return await getFollowCount();
                }
            }
            
            return null;
            
        } catch (error) {
            logEvent('ERROR', '❌ Erreur getFollowCount', { error: error.message });
            return null;
        }
    }
    
    /**
     * Récupère le nombre de subscribers
     * @returns {Promise<number|null>}
     */
    async function getSubCount() {
        const userId = stateManager.getTwitchUserId();
        if (!userId) return null;
        
        try {
            const response = await fetch(
                `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${userId}&first=1`,
                {
                    headers: getAuthHeaders(),
                    timeout: API_TIMEOUT
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                // total inclut le broadcaster, on soustrait 1
                return Math.max(0, (data.total || 0) - 1);
            }
            
            if (response.status === 401) {
                logEvent('WARN', '⚠️ Token expiré, rafraîchissement...');
                if (await refreshToken()) {
                    return await getSubCount();
                }
            }
            
            return null;
            
        } catch (error) {
            logEvent('ERROR', '❌ Erreur getSubCount', { error: error.message });
            return null;
        }
    }
    
    /**
     * Synchronise les follows depuis Twitch
     * @param {string} source - Source de la sync
     * @returns {Promise<{success: boolean, data: number|null, diff: number}>}
     */
    async function syncFollows(source = 'manual') {
        const count = await getFollowCount();
        
        if (count !== null) {
            const oldValue = stateManager.getFollows();
            const diff = count - oldValue;
            
            if (diff !== 0) {
                stateManager.setFollows(count, source);
            }
            
            return { success: true, data: count, diff };
        }
        
        return { success: false, data: null, diff: 0 };
    }
    
    /**
     * Synchronise les subs depuis Twitch
     * @param {string} source - Source de la sync
     * @returns {Promise<{success: boolean, data: number|null, diff: number}>}
     */
    async function syncSubs(source = 'manual') {
        const count = await getSubCount();
        
        if (count !== null) {
            const oldValue = stateManager.getSubs();
            const diff = count - oldValue;
            
            if (diff !== 0) {
                stateManager.setSubs(count, source);
            }
            
            return { success: true, data: count, diff };
        }
        
        return { success: false, data: null, diff: 0 };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITAIRES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @returns {boolean}
     */
    function isAuthenticated() {
        return stateManager.isTwitchAuthenticated();
    }
    
    /**
     * Déconnecte l'utilisateur
     */
    function disconnect() {
        stateManager.clearTwitchAuth();
        
        // Supprimer le fichier de config
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                fs.unlinkSync(CONFIG_PATH);
            }
        } catch (error) {
            logEvent('ERROR', '❌ Erreur suppression config', { error: error.message });
        }
        
        logEvent('INFO', '🚪 Déconnecté de Twitch');
    }
    
    /**
     * Retourne les infos de connexion (sans tokens)
     * @returns {Object}
     */
    function getConnectionInfo() {
        return {
            authenticated: isAuthenticated(),
            userId: stateManager.getTwitchUserId(),
            userName: stateManager.getTwitchUserName(),
            hasDeviceCode: !!stateManager.getDeviceCodeData()
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // API PUBLIQUE
    // ═══════════════════════════════════════════════════════════════════════════
    
    return Object.freeze({
        // Tokens
        loadSavedTokens,
        saveTokens,
        validateToken,
        refreshToken,
        
        // Device Code Flow
        initiateDeviceCodeFlow,
        pollDeviceCode,
        cancelDeviceCodeFlow,
        
        // API Calls
        getUserInfo,
        getFollowCount,
        getSubCount,
        syncFollows,
        syncSubs,
        
        // Utilitaires
        isAuthenticated,
        disconnect,
        getConnectionInfo,
        getAuthHeaders
    });
}

module.exports = { createTwitchApiService };
