/**
 * @file validation.js
 * @description Fonctions de validation des entrées utilisateur
 * @version 2.3.1
 */

/**
 * Valide un entier positif avec limites
 * @param {*} value - Valeur à valider
 * @param {string} fieldName - Nom du champ (pour erreurs)
 * @param {number} min - Valeur minimum (défaut: 0)
 * @param {number} max - Valeur maximum (défaut: 1000000)
 * @returns {number} Nombre validé
 * @throws {Error} Si validation échoue
 */
function validatePositiveInt(value, fieldName = 'valeur', min = 0, max = 1000000) {
    if (value === null || value === undefined) {
        throw new Error(`${fieldName} est requis`);
    }
    
    const num = Number(value);
    
    if (isNaN(num)) {
        throw new Error(`${fieldName} doit être un nombre (reçu: ${typeof value})`);
    }
    
    if (!Number.isInteger(num)) {
        throw new Error(`${fieldName} doit être un entier (reçu: ${num})`);
    }
    
    if (num < min) {
        throw new Error(`${fieldName} doit être >= ${min} (reçu: ${num})`);
    }
    
    if (num > max) {
        throw new Error(`${fieldName} doit être <= ${max} (reçu: ${num})`);
    }
    
    return num;
}

/**
 * Valide une chaîne de caractères
 * @param {*} value - Valeur à valider
 * @param {string} fieldName - Nom du champ
 * @param {number} minLen - Longueur minimum (défaut: 0)
 * @param {number} maxLen - Longueur maximum (défaut: 1000)
 * @param {boolean} required - Si le champ est requis (défaut: true)
 * @returns {string} Chaîne validée et trimée
 * @throws {Error} Si validation échoue
 */
function validateString(value, fieldName = 'valeur', minLen = 0, maxLen = 1000, required = true) {
    if (value === null || value === undefined || value === '') {
        if (required) {
            throw new Error(`${fieldName} est requis`);
        }
        return '';
    }
    
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} doit être une chaîne (reçu: ${typeof value})`);
    }
    
    const trimmed = value.trim();
    
    if (trimmed.length < minLen) {
        throw new Error(`${fieldName} doit avoir au moins ${minLen} caractères`);
    }
    
    if (trimmed.length > maxLen) {
        throw new Error(`${fieldName} ne peut pas dépasser ${maxLen} caractères`);
    }
    
    return trimmed;
}

/**
 * Valide une valeur parmi une liste d'options autorisées
 * @param {*} value - Valeur à valider
 * @param {Array} allowedValues - Liste des valeurs autorisées
 * @param {string} fieldName - Nom du champ
 * @param {*} defaultValue - Valeur par défaut si non fournie (optionnel)
 * @returns {*} Valeur validée
 * @throws {Error} Si validation échoue
 */
function validateEnum(value, allowedValues, fieldName = 'valeur', defaultValue = undefined) {
    if (value === null || value === undefined) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`${fieldName} est requis`);
    }
    
    if (!allowedValues.includes(value)) {
        throw new Error(`${fieldName} doit être l'un de: ${allowedValues.join(', ')} (reçu: ${value})`);
    }
    
    return value;
}

/**
 * Valide un tier Twitch
 * @param {*} value - Valeur à valider
 * @returns {string} Tier validé ('1000', '2000', '3000')
 */
function validateTier(value) {
    const VALID_TIERS = ['1000', '2000', '3000'];
    const tier = String(value || '1000');
    
    if (!VALID_TIERS.includes(tier)) {
        return '1000'; // Défaut à tier 1
    }
    
    return tier;
}

/**
 * Valide un booléen
 * @param {*} value - Valeur à valider
 * @param {string} fieldName - Nom du champ
 * @param {boolean} defaultValue - Valeur par défaut
 * @returns {boolean} Booléen validé
 */
function validateBoolean(value, fieldName = 'valeur', defaultValue = false) {
    if (value === null || value === undefined) {
        return defaultValue;
    }
    
    if (typeof value === 'boolean') {
        return value;
    }
    
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1') return true;
        if (lower === 'false' || lower === '0') return false;
    }
    
    if (typeof value === 'number') {
        return value !== 0;
    }
    
    throw new Error(`${fieldName} doit être un booléen (reçu: ${typeof value})`);
}

module.exports = {
    validatePositiveInt,
    validateString,
    validateEnum,
    validateTier,
    validateBoolean,
};
