/**
 * @file rate-limiter.js
 * @description Rate limiters pour protéger les APIs
 * @version 2.3.1
 */

/**
 * SimpleRateLimiter - Rate limiter basique avec fenêtre glissante
 */
class SimpleRateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    /**
     * Vérifie si une requête est autorisée
     */
    allow() {
        const now = Date.now();
        
        // Supprimer les requêtes expirées
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        
        if (this.requests.length < this.maxRequests) {
            this.requests.push(now);
            return true;
        }
        
        return false;
    }

    /**
     * Temps avant la prochaine autorisation (en ms)
     */
    nextResetIn() {
        if (this.requests.length === 0) return 0;
        
        const oldest = Math.min(...this.requests);
        const reset = oldest + this.windowMs - Date.now();
        return Math.max(0, reset);
    }

    /**
     * Réinitialise le rate limiter
     */
    reset() {
        this.requests = [];
    }

    /**
     * Retourne le nombre de requêtes restantes
     */
    remaining() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        return Math.max(0, this.maxRequests - this.requests.length);
    }
}

/**
 * TokenBucketLimiter - Rate limiter avec bucket de tokens
 */
class TokenBucketLimiter {
    constructor(bucketSize, refillRate) {
        this.bucketSize = bucketSize;
        this.tokens = bucketSize;
        this.refillRate = refillRate; // tokens par seconde
        this.lastRefill = Date.now();
    }

    /**
     * Vérifie si une requête est autorisée
     */
    allow(cost = 1) {
        this.refill();
        
        if (this.tokens >= cost) {
            this.tokens -= cost;
            return true;
        }
        
        return false;
    }

    /**
     * Recharge les tokens
     */
    refill() {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        const tokensToAdd = elapsed * this.refillRate;
        
        this.tokens = Math.min(this.bucketSize, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    /**
     * Retourne le nombre de tokens disponibles
     */
    available() {
        this.refill();
        return Math.floor(this.tokens);
    }
}

module.exports = {
    SimpleRateLimiter,
    TokenBucketLimiter,
};
