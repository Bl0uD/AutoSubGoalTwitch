/**
 * @file dependency-container.js
 * @description Conteneur IoC simple pour injection de dépendances
 * @version 3.1.2
 * 
 * Pattern: Inversion of Control (IoC) Container
 * 
 * Usage:
 *   container.register('stateManager', () => new StateManager());
 *   container.register('goalsService', (c) => createGoalsService({
 *       stateManager: c.resolve('stateManager'),
 *       fileService: c.resolve('fileService')
 *   }));
 *   
 *   const service = container.resolve('goalsService');
 */

/**
 * Conteneur d'injection de dépendances
 */
class DependencyContainer {
    #factories;
    #instances;
    #resolving;
    
    constructor() {
        this.#factories = new Map();
        this.#instances = new Map();
        this.#resolving = new Set();
    }
    
    /**
     * Enregistre une factory pour un service
     * @param {string} name - Nom unique du service
     * @param {Function} factory - Factory: (container) => instance
     * @param {Object} options - Options { singleton: true }
     * @returns {DependencyContainer} this (chainable)
     */
    register(name, factory, options = { singleton: true }) {
        if (typeof name !== 'string' || !name) {
            throw new Error('Service name must be a non-empty string');
        }
        if (typeof factory !== 'function') {
            throw new Error(`Factory for '${name}' must be a function`);
        }
        
        this.#factories.set(name, { factory, options });
        
        // Si on ré-enregistre, supprimer l'ancienne instance
        if (this.#instances.has(name)) {
            this.#instances.delete(name);
        }
        
        return this;
    }
    
    /**
     * Enregistre une instance directement (pas de factory)
     * @param {string} name - Nom du service
     * @param {any} instance - Instance à enregistrer
     * @returns {DependencyContainer} this
     */
    registerInstance(name, instance) {
        if (typeof name !== 'string' || !name) {
            throw new Error('Service name must be a non-empty string');
        }
        
        this.#instances.set(name, instance);
        return this;
    }
    
    /**
     * Résout une dépendance
     * @param {string} name - Nom du service
     * @returns {any} Instance du service
     * @throws {Error} Si dépendance non enregistrée ou circulaire
     */
    resolve(name) {
        // 1. Vérifier instance existante (singleton ou instance directe)
        if (this.#instances.has(name)) {
            return this.#instances.get(name);
        }
        
        // 2. Vérifier que la factory existe
        const registration = this.#factories.get(name);
        if (!registration) {
            throw new Error(`Dependency '${name}' is not registered. Available: [${[...this.#factories.keys()].join(', ')}]`);
        }
        
        // 3. Détecter les dépendances circulaires
        if (this.#resolving.has(name)) {
            const chain = [...this.#resolving, name].join(' -> ');
            throw new Error(`Circular dependency detected: ${chain}`);
        }
        
        // 4. Marquer comme "en cours de résolution"
        this.#resolving.add(name);
        
        try {
            // 5. Créer l'instance via la factory
            const instance = registration.factory(this);
            
            // 6. Stocker si singleton
            if (registration.options.singleton) {
                this.#instances.set(name, instance);
            }
            
            return instance;
        } finally {
            // 7. Retirer du set de résolution
            this.#resolving.delete(name);
        }
    }
    
    /**
     * Résout plusieurs dépendances d'un coup
     * @param {...string} names - Noms des services
     * @returns {Object} { serviceName: instance, ... }
     */
    resolveAll(...names) {
        const result = {};
        for (const name of names) {
            result[name] = this.resolve(name);
        }
        return result;
    }
    
    /**
     * Vérifie si un service est enregistré
     * @param {string} name
     * @returns {boolean}
     */
    has(name) {
        return this.#factories.has(name) || this.#instances.has(name);
    }
    
    /**
     * Liste tous les services enregistrés
     * @returns {string[]}
     */
    listServices() {
        const factoryNames = [...this.#factories.keys()];
        const instanceNames = [...this.#instances.keys()];
        return [...new Set([...factoryNames, ...instanceNames])];
    }
    
    /**
     * Supprime un service (factory et instance)
     * @param {string} name
     * @returns {boolean} true si supprimé
     */
    unregister(name) {
        const hadFactory = this.#factories.delete(name);
        const hadInstance = this.#instances.delete(name);
        return hadFactory || hadInstance;
    }
    
    /**
     * Réinitialise le container
     */
    clear() {
        this.#factories.clear();
        this.#instances.clear();
        this.#resolving.clear();
    }
    
    /**
     * Crée un scope enfant (pour les requêtes HTTP par exemple)
     * @returns {DependencyContainer}
     */
    createScope() {
        const scope = new DependencyContainer();
        
        // Copier les factories du parent
        for (const [name, registration] of this.#factories) {
            scope.#factories.set(name, registration);
        }
        
        // Partager les instances singleton du parent
        for (const [name, instance] of this.#instances) {
            scope.#instances.set(name, instance);
        }
        
        return scope;
    }
}

module.exports = { DependencyContainer };
