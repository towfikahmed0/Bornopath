// /js/env.js - Fixed for traditional scripts
class Env {
    static variables = null;

    static load() {
        if (this.variables) return this.variables;

        try {
            // Method 1: Check if Kinsta injected variables
            this.variables = this.getFromKinsta();
            
            // Method 2: Check if variables are in global scope
            if (!this.variables.FIREBASE_API_KEY) {
                this.variables = this.getFromGlobal();
            }
            
            // Method 3: Fallback to development
            if (!this.variables.FIREBASE_API_KEY) {
                this.variables = this.getDevelopmentConfig();
            }

            console.log('✅ Environment loaded:', {
                environment: this.get('APP_ENVIRONMENT'),
                hasFirebase: !!this.get('FIREBASE_API_KEY')
            });
            
            return this.variables;

        } catch (error) {
            console.error('❌ Environment loading failed:', error);
            // Don't throw, just use development config
            this.variables = this.getDevelopmentConfig();
            return this.variables;
        }
    }

    static getFromKinsta() {
        // Kinsta might inject environment variables differently
        // Check various possible locations
        const possibleLocations = [
            window.__KINSTA_ENV__,
            window.__ENV__,
            window.ENV,
            window.process?.env
        ];

        for (const env of possibleLocations) {
            if (env && env.FIREBASE_API_KEY) {
                return {
                    FIREBASE_API_KEY: env.FIREBASE_API_KEY,
                    FIREBASE_AUTH_DOMAIN: env.FIREBASE_AUTH_DOMAIN,
                    FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID,
                    FIREBASE_STORAGE_BUCKET: env.FIREBASE_STORAGE_BUCKET,
                    FIREBASE_MESSAGING_SENDER_ID: env.FIREBASE_MESSAGING_SENDER_ID,
                    FIREBASE_APP_ID: env.FIREBASE_APP_ID,
                    FIREBASE_MEASUREMENT_ID: env.FIREBASE_MEASUREMENT_ID,
                    APP_VERSION: env.APP_VERSION || '1.4.0',
                    APP_ENVIRONMENT: env.APP_ENVIRONMENT || 'production'
                };
            }
        }
        
        return {};
    }

    static getFromGlobal() {
        // Check if variables are set directly in window
        return {
            FIREBASE_API_KEY: window.FIREBASE_API_KEY,
            FIREBASE_AUTH_DOMAIN: window.FIREBASE_AUTH_DOMAIN,
            FIREBASE_PROJECT_ID: window.FIREBASE_PROJECT_ID,
            FIREBASE_STORAGE_BUCKET: window.FIREBASE_STORAGE_BUCKET,
            FIREBASE_MESSAGING_SENDER_ID: window.FIREBASE_MESSAGING_SENDER_ID,
            FIREBASE_APP_ID: window.FIREBASE_APP_ID,
            FIREBASE_MEASUREMENT_ID: window.FIREBASE_MEASUREMENT_ID,
            APP_VERSION: window.APP_VERSION || '1.4.0',
            APP_ENVIRONMENT: window.APP_ENVIRONMENT || 'production'
        };
    }

    static getDevelopmentConfig() {
        console.warn('⚠️ Using development Firebase configuration');
        return {
            FIREBASE_API_KEY: "AIzaSyB12GMrNdELvkdSKxF8Ij2IGKRqUh63WTc",
            FIREBASE_AUTH_DOMAIN: "wordvo-bb47d.firebaseapp.com",
            FIREBASE_PROJECT_ID: "wordvo-bb47d",
            FIREBASE_STORAGE_BUCKET: "wordvo-bb47d.firebasestorage.app",
            FIREBASE_MESSAGING_SENDER_ID: "1050344621419",
            FIREBASE_APP_ID: "1:1050344621419:web:29909f4d722e58b1e9b82e",
            FIREBASE_MEASUREMENT_ID: "G-LCXCH1X6C2",
            APP_VERSION: "1.4.0",
            APP_ENVIRONMENT: "development"
        };
    }

    static get(key) {
        return this.variables ? this.variables[key] : null;
    }

    static getAll() {
        return this.variables ? {...this.variables} : {};
    }
}

// Auto-load environment
Env.load();