// /js/error-handler-combined.js - Combined error handling
class ErrorHandler {
    static ERROR_TYPES = {
        NETWORK: 'NETWORK_ERROR',
        AUTH: 'AUTH_ERROR', 
        FIRESTORE: 'FIRESTORE_ERROR',
        VALIDATION: 'VALIDATION_ERROR',
        UI: 'UI_ERROR',
        QUIZ: 'QUIZ_ERROR',
        DICTIONARY: 'DICTIONARY_ERROR',
        UNKNOWN: 'UNKNOWN_ERROR'
    };

    static initGlobalErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.handleError({
                type: this.ERROR_TYPES.UNKNOWN,
                message: event.error?.message || 'Uncaught error',
                stack: event.error?.stack,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: this.ERROR_TYPES.UNKNOWN,
                message: event.reason?.message || 'Unhandled promise rejection',
                stack: event.reason?.stack,
                isPromiseRejection: true
            });
        });

        console.log('🎯 Global error handling initialized');
    }

    static handleError(errorInfo) {
        const {
            type = this.ERROR_TYPES.UNKNOWN,
            message,
            stack,
            context = {},
            showToast = true
        } = errorInfo;

        this.logError(errorInfo);

        if (showToast) {
            this.showErrorToast(message);
        }
    }

    static showErrorToast(message) {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    static logError(errorInfo) {
        console.error('🚨 Application Error:', errorInfo);
    }

    static async withRetry(operation, maxRetries = 3, initialDelay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) break;
                
                const delay = initialDelay * Math.pow(2, attempt - 1);
                await this.delay(delay);
            }
        }
        
        throw lastError;
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Firebase-specific error handling
class FirebaseErrorHandler {
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
                    showToast: true
                });
                return;
        }

        ErrorHandler.handleError({
            type: errorType,
            message: error.message,
            code: error.code,
            showToast: true
        });
    }

    static handleFirestoreError(error, context = {}) {
        ErrorHandler.handleError({
            type: ErrorHandler.ERROR_TYPES.FIRESTORE,
            message: error.message,
            code: error.code,
            context: context,
            showToast: true
        });
    }

    static async safeFirestoreOperation(operation, context = {}) {
        return await ErrorHandler.withRetry(async () => {
            try {
                return await operation();
            } catch (error) {
                this.handleFirestoreError(error, context);
                throw error;
            }
        });
    }
}

// Initialize global error handling
ErrorHandler.initGlobalErrorHandling();