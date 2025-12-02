/**
 * 🔐 SERVICE DE CONFIGURATION TWITCH
 * Gère le chargement, la sauvegarde et le rafraîchissement des tokens Twitch
 * 
 * Pattern: initContext(context)
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { logEvent } = require('../utils');

let ctx = null;

/**
 * Initialise le service avec le contexte de l'application
 * @param {Object} context - Contexte contenant ROOT_DIR, configCrypto, twitchConfig
 */
function initContext(context) {
    ctx = context;
    logEvent('INFO', '✅ Service Twitch Config initialisé');
}

/**
 * Charge la configuration Twitch depuis le fichier chiffré
 */
function loadTwitchConfig() {
    try {
        const configPath = path.join(ctx.ROOT_DIR, 'obs', 'data', 'twitch_config.txt');
        const twitchConfig = ctx.getTwitchConfig();
        
        if (fs.existsSync(configPath)) {
            // Chargement sécurisé avec déchiffrement automatique
            const content = ctx.configCrypto.loadEncrypted(configPath);
            
            if (!content) {
                console.log('🔐 Création du fichier de configuration Twitch...');
                saveTwitchConfig();
                return;
            }
            
            const lines = content.split(/\r?\n/);
            
            lines.forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    switch (key.trim()) {
                        case 'CLIENT_ID':
                            twitchConfig.client_id = value.trim();
                            break;
                        case 'ACCESS_TOKEN':
                            twitchConfig.access_token = value.trim();
                            break;
                        case 'REFRESH_TOKEN':
                            twitchConfig.refresh_token = value.trim();
                            break;
                        case 'BROADCASTER_ID':
                            twitchConfig.user_id = value.trim();
                            break;
                        case 'USERNAME':
                            twitchConfig.username = value.trim();
                            break;
                    }
                }
            });
            
            // Marquer comme configuré si on a les infos essentielles
            if (twitchConfig.client_id && twitchConfig.access_token && twitchConfig.user_id) {
                twitchConfig.configured = true;
                console.log('✅ Configuration Twitch chargée (sécurisée)');
            } else {
                console.log('⚠️ Configuration Twitch incomplète');
            }
        } else {
            console.log('🔐 Création du fichier de configuration Twitch...');
            saveTwitchConfig();
        }
    } catch (error) {
        console.error('❌ Erreur chargement config Twitch:', error.message);
        console.error('💡 Si le fichier est corrompu, utilisez le bouton "Déconnecter Twitch" pour réinitialiser');
    }
}

/**
 * Sauvegarde la configuration Twitch (chiffrée)
 */
function saveTwitchConfig() {
    try {
        const configPath = path.join(ctx.ROOT_DIR, 'obs', 'data', 'twitch_config.txt');
        const twitchConfig = ctx.getTwitchConfig();
        
        const configContent = [
            `CLIENT_ID=${twitchConfig.client_id || ''}`,
            `ACCESS_TOKEN=${twitchConfig.access_token || ''}`,
            `REFRESH_TOKEN=${twitchConfig.refresh_token || ''}`,
            `BROADCASTER_ID=${twitchConfig.user_id || ''}`,
            `USERNAME=${twitchConfig.username || ''}`
        ].join('\n');
        
        // Sauvegarde sécurisée avec chiffrement automatique
        ctx.configCrypto.saveEncrypted(configPath, configContent);
        console.log('💾 Configuration Twitch sauvegardée (chiffrée)');
    } catch (error) {
        console.error('❌ Erreur sauvegarde config Twitch:', error.message);
    }
}

/**
 * Renouvelle automatiquement le token d'accès Twitch
 * @returns {Promise<boolean>} true si réussi, false sinon
 */
async function refreshTwitchToken() {
    try {
        console.log('📄 Renouvellement du token Twitch...');
        
        const twitchConfig = ctx.getTwitchConfig();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: twitchConfig.client_id,
                grant_type: 'refresh_token',
                refresh_token: twitchConfig.refresh_token
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Erreur renouvellement token: ${response.status} - ${errorData}`);
        }
        
        const tokenData = await response.json();
        
        // Mettre à jour la configuration
        twitchConfig.access_token = tokenData.access_token;
        if (tokenData.refresh_token) {
            twitchConfig.refresh_token = tokenData.refresh_token;
        }
        
        // Sauvegarder la nouvelle configuration
        saveTwitchConfig();
        
        console.log('✅ Token Twitch renouvelé avec succès');
        return true;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            logEvent('ERROR', '❌ Timeout renouvellement token (15s)');
            return false;
        }
        
        console.error('❌ Erreur renouvellement token:', error.message);
        return false;
    }
}

/**
 * Réinitialise la configuration Twitch
 */
function resetTwitchConfig() {
    const twitchConfig = ctx.getTwitchConfig();
    
    twitchConfig.client_id = '';
    twitchConfig.access_token = '';
    twitchConfig.refresh_token = '';
    twitchConfig.user_id = '';
    twitchConfig.username = '';
    twitchConfig.configured = false;
    
    saveTwitchConfig();
    console.log('🔄 Configuration Twitch réinitialisée');
}

module.exports = {
    initContext,
    loadTwitchConfig,
    saveTwitchConfig,
    refreshTwitchToken,
    resetTwitchConfig
};
