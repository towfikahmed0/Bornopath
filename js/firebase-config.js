// /js/firebase-config.js - Firebase config using environment variables
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

            console.log('🔥 Firebase config loaded from environment');
            return this.config;

        } catch (error) {
            console.error('❌ Firebase config failed:', error);
            throw new Error('Firebase configuration error');
        }
    }
}