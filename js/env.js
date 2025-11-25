// /js/env.js - Access Kinsta Environment Variables
class Env {
    static variables = null;

    static load() {
        if (this.variables) return this.variables;

        try {
            // Kinsta makes environment variables available globally
            this.variables = this.getFromKinsta();
            
            if (!this.variables.FIREBASE_API_KEY) {
                throw new Error('Firebase configuration not found');
            }
            
            console.log('✅ Production environment loaded');
            return this.variables;
            
        } catch (error) {
            console.error('❌ Failed to load environment:', error);
            throw error;
        }
    }

    static getFromKinsta() {
        // Kinsta injects environment variables during deployment
        // They become available in the global scope
        return {
            FIREBASE_API_KEY: window.FIREBASE_API_KEY,
            FIREBASE_AUTH_DOMAIN: window.FIREBASE_AUTH_DOMAIN,
            FIREBASE_PROJECT_ID: window.FIREBASE_PROJECT_ID,
            FIREBASE_STORAGE_BUCKET: window.FIREBASE_STORAGE_BUCKET,
            FIREBASE_MESSAGING_SENDER_ID: window.FIREBASE_MESSAGING_SENDER_ID,
            FIREBASE_APP_ID: window.FIREBASE_APP_ID,
            FIREBASE_MEASUREMENT_ID: window.FIREBASE_MEASUREMENT_ID,
            APP_VERSION: window.APP_VERSION || '1.4.0'
        };
    }

    static get(key) {
        return this.variables ? this.variables[key] : null;
    }

    static getAll() {
        return this.variables ? {...this.variables} : {};
    }
}

// Auto-load when script is included
Env.load();