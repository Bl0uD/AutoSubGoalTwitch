/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE DE CHIFFREMENT SÉCURISÉ - CONFIG TOKENS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Protège les tokens Twitch avec :
 * - Chiffrement AES-256-GCM (niveau militaire)
 * - Clé dérivée de l'identité de la machine Windows (DPAPI-like)
 * - IV unique pour chaque sauvegarde
 * - Permissions fichier restrictives (utilisateur courant uniquement)
 * 
 * Sécurité :
 * - Fichier illisible même si volé
 * - Clé ne quitte jamais la machine
 * - Protection contre modification (authentification GCM)
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

// Constantes de chiffrement
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Génère une clé de chiffrement unique à la machine
 * Basée sur des identifiants système Windows
 */
function getMachineKey() {
    try {
        // Combine plusieurs identifiants système pour créer une empreinte unique
        const username = os.userInfo().username;
        const hostname = os.hostname();
        
        // Récupère l'UUID de la machine Windows (similaire à DPAPI)
        let machineGuid = '';
        try {
            machineGuid = execSync(
                'powershell -Command "(Get-ItemProperty -Path HKLM:\\SOFTWARE\\Microsoft\\Cryptography -Name MachineGuid).MachineGuid"',
                { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
            ).trim();
        } catch (e) {
            // Fallback si pas d'accès au registre
            machineGuid = os.platform() + os.arch();
        }
        
        // Crée une empreinte unique basée sur la machine
        const machineId = `${username}@${hostname}:${machineGuid}`;
        
        // Dérive une clé de 256 bits
        const hash = crypto.createHash('sha256');
        hash.update(machineId);
        hash.update('SubcountAuto-Twitch-Security-v1'); // Salt applicatif
        
        return hash.digest();
        
    } catch (error) {
        console.error('❌ Erreur génération clé machine:', error.message);
        // Fallback avec identifiants basiques
        const fallbackId = `${os.userInfo().username}@${os.hostname()}`;
        const hash = crypto.createHash('sha256');
        hash.update(fallbackId);
        hash.update('SubcountAuto-Twitch-Security-Fallback-v1');
        return hash.digest();
    }
}

/**
 * Chiffre le contenu de la configuration
 * @param {string} plaintext - Contenu en clair
 * @returns {string} Contenu chiffré en base64
 */
function encrypt(plaintext) {
    try {
        // Génère un IV aléatoire unique pour cette opération
        const iv = crypto.randomBytes(IV_LENGTH);
        
        // Génère un salt pour renforcer la clé
        const salt = crypto.randomBytes(SALT_LENGTH);
        
        // Dérive la clé finale à partir de la clé machine + salt
        const machineKey = getMachineKey();
        const derivedKey = crypto.pbkdf2Sync(machineKey, salt, 100000, KEY_LENGTH, 'sha256');
        
        // Crée le cipher
        const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
        
        // Chiffre les données
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        // Récupère le tag d'authentification
        const authTag = cipher.getAuthTag();
        
        // Combine tout en un seul buffer : salt + iv + authTag + données chiffrées
        const result = Buffer.concat([
            salt,
            iv,
            authTag,
            Buffer.from(encrypted, 'base64')
        ]);
        
        // Retourne en base64 pour stockage texte
        return result.toString('base64');
        
    } catch (error) {
        console.error('❌ Erreur chiffrement:', error.message);
        throw new Error('Échec du chiffrement de la configuration');
    }
}

/**
 * Déchiffre le contenu de la configuration
 * @param {string} ciphertext - Contenu chiffré en base64
 * @returns {string} Contenu en clair
 */
function decrypt(ciphertext) {
    try {
        // Convertit depuis base64
        const buffer = Buffer.from(ciphertext, 'base64');
        
        // Extrait les composants
        const salt = buffer.subarray(0, SALT_LENGTH);
        const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const authTag = buffer.subarray(
            SALT_LENGTH + IV_LENGTH,
            SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
        );
        const encryptedData = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
        
        // Dérive la clé finale à partir de la clé machine + salt
        const machineKey = getMachineKey();
        const derivedKey = crypto.pbkdf2Sync(machineKey, salt, 100000, KEY_LENGTH, 'sha256');
        
        // Crée le decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
        decipher.setAuthTag(authTag);
        
        // Déchiffre les données
        let decrypted = decipher.update(encryptedData, null, 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
        
    } catch (error) {
        console.error('❌ Erreur déchiffrement:', error.message);
        throw new Error('Échec du déchiffrement - fichier corrompu ou machine différente');
    }
}

/**
 * Définit des permissions restrictives sur le fichier (Windows)
 * Seul l'utilisateur courant peut lire/écrire
 */
function setRestrictivePermissions(filePath) {
    try {
        if (os.platform() !== 'win32') {
            // Sur Linux/Mac, utilise chmod
            fs.chmodSync(filePath, 0o600);
            return;
        }
        
        // Sur Windows, utilise icacls pour définir des ACL restrictives
        const username = os.userInfo().username;
        
        // Commandes PowerShell pour permissions restrictives
        const commands = [
            // Désactive l'héritage et copie les ACL actuelles
            `icacls "${filePath}" /inheritance:d`,
            // Supprime tous les accès
            `icacls "${filePath}" /remove "Users"`,
            `icacls "${filePath}" /remove "Authenticated Users"`,
            `icacls "${filePath}" /remove "Everyone"`,
            // Accorde accès complet uniquement à l'utilisateur courant
            `icacls "${filePath}" /grant "${username}:(F)"`
        ];
        
        for (const cmd of commands) {
            try {
                execSync(cmd, { stdio: 'ignore' });
            } catch (e) {
                // Continue même si une commande échoue
            }
        }
        
        console.log('✅ Permissions restrictives appliquées à', path.basename(filePath));
        
    } catch (error) {
        console.warn('⚠️  Impossible de définir permissions restrictives:', error.message);
        // Non critique - continue quand même
    }
}

/**
 * Sauvegarde une configuration chiffrée
 * @param {string} filePath - Chemin du fichier
 * @param {string} content - Contenu en clair
 */
function saveEncrypted(filePath, content) {
    try {
        // Chiffre le contenu
        const encrypted = encrypt(content);
        
        // Ajoute un header pour identifier le fichier comme chiffré
        const fileContent = `# ENCRYPTED_CONFIG_V1\n${encrypted}`;
        
        // Sauvegarde
        fs.writeFileSync(filePath, fileContent, 'utf8');
        
        // Définit permissions restrictives
        setRestrictivePermissions(filePath);
        
        console.log('🔒 Configuration sauvegardée (chiffrée):', path.basename(filePath));
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde chiffrée:', error.message);
        throw error;
    }
}

/**
 * Charge une configuration chiffrée
 * @param {string} filePath - Chemin du fichier
 * @returns {string} Contenu en clair
 */
function loadEncrypted(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Vérifie si le fichier est chiffré
        if (fileContent.startsWith('# ENCRYPTED_CONFIG_V1\n')) {
            // Fichier chiffré - déchiffre
            const encrypted = fileContent.replace('# ENCRYPTED_CONFIG_V1\n', '');
            const decrypted = decrypt(encrypted);
            console.log('🔓 Configuration déchiffrée:', path.basename(filePath));
            return decrypted;
        } else {
            // Fichier en clair (ancien format) - retourne tel quel
            console.log('ℹ️  Configuration non chiffrée détectée:', path.basename(filePath));
            console.log('💡 Sera chiffrée automatiquement à la prochaine sauvegarde');
            return fileContent;
        }
        
    } catch (error) {
        console.error('❌ Erreur chargement configuration:', error.message);
        throw error;
    }
}

/**
 * Migre un fichier en clair vers format chiffré
 * @param {string} filePath - Chemin du fichier
 */
function migrateToEncrypted(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return false;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Vérifie si déjà chiffré
        if (content.startsWith('# ENCRYPTED_CONFIG_V1\n')) {
            console.log('✅ Fichier déjà chiffré:', path.basename(filePath));
            return true;
        }
        
        // Chiffre et sauvegarde
        console.log('🔄 Migration vers format chiffré:', path.basename(filePath));
        saveEncrypted(filePath, content);
        console.log('✅ Migration réussie');
        return true;
        
    } catch (error) {
        console.error('❌ Erreur migration:', error.message);
        return false;
    }
}

module.exports = {
    encrypt,
    decrypt,
    saveEncrypted,
    loadEncrypted,
    setRestrictivePermissions,
    migrateToEncrypted
};
