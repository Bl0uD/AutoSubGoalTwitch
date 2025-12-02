/**
 * @file logger.js
 * @description Système de logging centralisé avec filtrage de sécurité
 * @version 2.3.1
 */

const fs = require('fs');
const path = require('path');

// Dossier racine du projet
const ROOT_DIR = path.join(__dirname, '..', '..', '..');

/**
 * Niveaux de log avec priorité
 */
const LOG_LEVELS = Object.freeze({
    DEBUG: { priority: 0, emoji: '🔍', color: '\x1b[90m' },
    INFO: { priority: 1, emoji: '📄', color: '\x1b[36m' },
    WARN: { priority: 2, emoji: '⚠️', color: '\x1b[33m' },
    ERROR: { priority: 3, emoji: '❌', color: '\x1b[31m' },
    CRITICAL: { priority: 4, emoji: '🚨', color: '\x1b[35m' },
    // Niveaux spéciaux pour événements métier
    SYNC: { priority: 1, emoji: '📊', color: '\x1b[32m' },
    SUCCESS: { priority: 1, emoji: '✅', color: '\x1b[32m' },
    ÉVÉNEMENT: { priority: 1, emoji: '🎉', color: '\x1b[32m' },
    NOTIFICATION: { priority: 1, emoji: '📣', color: '\x1b[36m' },
    TEST: { priority: 1, emoji: '🧪', color: '\x1b[95m' },
});

/**
 * Champs sensibles à ne jamais logger
 */
const SENSITIVE_FIELDS = new Set([
    'access_token', 'refresh_token', 'device_code', 
    'password', 'secret', 'authorization'
]);

/**
 * Champs autorisés pour le logging des données
 */
const ALLOWED_DATA_FIELDS = new Set([
    'user_name', 'user_id', 'count', 'error', 'tier', 
    'reason', 'total', 'diff', 'message', 'status',
    'followCount', 'subCount', 'goal', 'timestamp'
]);

/**
 * Classe Logger - Gestion centralisée des logs
 */
class Logger {
    constructor(options = {}) {
        this.minLevel = options.minLevel || 'DEBUG';
        this.logPath = options.logPath || path.join(ROOT_DIR, 'app', 'logs', 'subcount_logs.txt');
        this.maxFileSizeMB = options.maxFileSizeMB || 2;
        this.keepLines = options.keepLines || 500;
        this.writeCounter = 0;
        this.cleanupInterval = 50; // Vérifier toutes les N écritures
    }

    /**
     * Filtre les données sensibles
     */
    _sanitizeData(data) {
        if (!data || typeof data !== 'object') return data;
        
        const safeData = {};
        for (const [key, value] of Object.entries(data)) {
            // Ignorer les champs sensibles
            if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
                continue;
            }
            // Garder seulement les champs autorisés ou les champs simples
            if (ALLOWED_DATA_FIELDS.has(key) || typeof value !== 'object') {
                safeData[key] = value;
            }
        }
        return Object.keys(safeData).length > 0 ? safeData : null;
    }

    /**
     * Formate un message de log
     */
    _formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const levelInfo = LOG_LEVELS[level] || LOG_LEVELS.INFO;
        return `[${timestamp}] [${level}] ${message}`;
    }

    /**
     * Nettoie le fichier de log si trop gros
     */
    _cleanupIfNeeded() {
        this.writeCounter++;
        if (this.writeCounter % this.cleanupInterval !== 0) return;

        try {
            if (!fs.existsSync(this.logPath)) return;
            
            const stats = fs.statSync(this.logPath);
            const fileSizeMB = stats.size / (1024 * 1024);
            
            if (fileSizeMB > this.maxFileSizeMB) {
                console.log(`🧹 Nettoyage du log (${fileSizeMB.toFixed(2)}MB > ${this.maxFileSizeMB}MB)`);
                
                const content = fs.readFileSync(this.logPath, 'utf8');
                const lines = content.split('\n');
                
                if (lines.length > this.keepLines) {
                    const linesToKeep = lines.slice(-this.keepLines);
                    const header = [
                        `# Log nettoyé automatiquement - ${new Date().toISOString()}`,
                        `# Conservé les ${this.keepLines} dernières lignes sur ${lines.length} total`,
                        '', ''
                    ];
                    fs.writeFileSync(this.logPath, header.concat(linesToKeep).join('\n'), 'utf8');
                    console.log(`✅ Log nettoyé: ${lines.length} → ${linesToKeep.length} lignes`);
                }
            }
        } catch (error) {
            console.error('❌ Erreur nettoyage log:', error.message);
        }
    }

    /**
     * Écrit un log
     */
    log(level, message, data = null) {
        const levelInfo = LOG_LEVELS[level] || LOG_LEVELS.INFO;
        const logMessage = this._formatMessage(level, message, data);
        
        // Console
        console.log(logMessage);
        
        // Afficher données filtrées si nécessaire (sauf INFO pour réduire le bruit)
        const safeData = this._sanitizeData(data);
        if (safeData && level !== 'INFO' && level !== 'DEBUG') {
            console.log('   📄 Données:', safeData);
        }
        
        // Fichier de log
        try {
            this._cleanupIfNeeded();
            
            const logEntry = safeData ? 
                `${logMessage}\n  Données: ${JSON.stringify(safeData)}\n` : 
                `${logMessage}\n`;
            
            fs.appendFileSync(this.logPath, logEntry, 'utf8');
        } catch (error) {
            console.error('❌ Erreur écriture log:', error.message);
        }
    }

    // Méthodes de raccourci
    debug(message, data) { this.log('DEBUG', message, data); }
    info(message, data) { this.log('INFO', message, data); }
    warn(message, data) { this.log('WARN', message, data); }
    error(message, data) { this.log('ERROR', message, data); }
    critical(message, data) { this.log('CRITICAL', message, data); }
    success(message, data) { this.log('SUCCESS', message, data); }
}

// Instance globale du logger
const logger = new Logger();

/**
 * Fonction wrapper pour compatibilité avec l'ancien code
 * @deprecated Utiliser logger.log() directement
 */
function logEvent(level, message, data = null) {
    logger.log(level, message, data);
}

module.exports = {
    Logger,
    logger,
    logEvent,
    LOG_LEVELS,
    SENSITIVE_FIELDS,
    ALLOWED_DATA_FIELDS,
};
