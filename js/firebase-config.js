// /js/firebase-config.js - Fixed for traditional scripts
class FirebaseConfig {
    static config = null;

    static getConfig() {
        if (this.config) return this.config;

        try {
            const env = Env.getAll();
            
            this.config = {
                apiKey: env.FIREBASE_API_KEY,
                authDomain: env.FIREBASE_AUTH_DOMAIN,
                projectId: env.FIREBASE_PROJECT_ID,
                storageBucket: env.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
                appId: env.FIREBASE_APP_ID,
                measurementId: env.FIREBASE_MEASUREMENT_ID
            };

            console.log('🔥 Firebase config loaded');
            return this.config;

        } catch (error) {
            console.error('❌ Firebase config failed:', error);
            // Fallback to development config
            return this.getDevelopmentConfig();
        }
    }

    static getDevelopmentConfig() {
        return {
            apiKey: "AIzaSyB12GMrNdELvkdSKxF8Ij2IGKRqUh63WTc",
            authDomain: "wordvo-bb47d.firebaseapp.com",
            projectId: "wordvo-bb47d",
            storageBucket: "wordvo-bb47d.firebasestorage.app",
            messagingSenderId: "1050344621419",
            appId: "1:1050344621419:web:29909f4d722e58b1e9b82e",
            measurementId: "G-LCXCH1X6C2"
        };
    }

    static getEnvironment() {
        return Env.get('APP_ENVIRONMENT') || 'production';
    }

    static getVersion() {
        return Env.get('APP_VERSION') || '1.4.0';
    }
}