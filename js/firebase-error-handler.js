// /js/firebase-error-handler.js - Firebase-specific error handling
import { ErrorHandler } from './error-handler.js';

class FirebaseErrorHandler {
    /**
     * Handle Firebase Auth errors
     */
    static handleAuthError(error) {
        let errorType = ErrorHandler.ERROR_TYPES.AUTH;
        
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-email':
                errorType = ErrorHandler.ERROR_TYPES.AUTH;
                break;
                
            case 'auth/network-request-failed':
                errorType = ErrorHandler.ERROR_TYPES.NETWORK;
                break;
                
            case 'auth/too-many-requests':
                ErrorHandler.handleError({
                    type: ErrorHandler.ERROR_TYPES.AUTH,
                    message: 'Too many login attempts. Please try again later.',
                    showToast: true,
                    allowRetry: false
                });
                return;
                
            default:
                errorType = ErrorHandler.ERROR_TYPES.AUTH;
        }

        ErrorHandler.handleError({
            type: errorType,
            message: error.message,
            code: error.code,
            showToast: true,
            allowRetry: true
        });
    }

    /**
     * Handle Firestore errors
     */
    static handleFirestoreError(error, context = {}) {
        let errorType = ErrorHandler.ERROR_TYPES.FIRESTORE;
        
        switch (error.code) {
            case 'failed-precondition':
            case 'unavailable':
                errorType = ErrorHandler.ERROR_TYPES.NETWORK;
                break;
                
            case 'permission-denied':
                errorType = ErrorHandler.ERROR_TYPES.FIRESTORE;
                break;
        }

        ErrorHandler.handleError({
            type: errorType,
            message: error.message,
            code: error.code,
            context: context,
            showToast: true,
            allowRetry: true
        });
    }

    /**
     * Safe Firestore operation with retry
     */
    static async safeFirestoreOperation(operation, context = {}) {
        return await ErrorHandler.withRetry(async () => {
            try {
                return await operation();
            } catch (error) {
                this.handleFirestoreError(error, context);
                throw error; // Re-throw after handling
            }
        });
    }
}