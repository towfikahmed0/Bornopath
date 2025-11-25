// /js/error-handler.js - Centralized error handling system
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

    static ERROR_MESSAGES = {
        // Network errors
        NETWORK_OFFLINE: 'You appear to be offline. Please check your connection.',
        NETWORK_TIMEOUT: 'Request timed out. Please try again.',
        NETWORK_FAILED: 'Network request failed. Please check your connection.',
        
        // Auth errors
        AUTH_LOGIN_FAILED: 'Login failed. Please check your email and password.',
        AUTH_SIGNUP_FAILED: 'Signup failed. Please try again.',
        AUTH_TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
        
        // Firestore errors
        FIRESTORE_READ_FAILED: 'Failed to load data. Please try again.',
        FIRESTORE_WRITE_FAILED: 'Failed to save data. Please try again.',
        FIRESTORE_PERMISSION_DENIED: 'You don\'t have permission to access this data.',
        
        // Quiz errors
        QUIZ_LOAD_FAILED: 'Failed to load quiz questions. Please try again.',
        QUIZ_SUBMIT_FAILED: 'Failed to submit quiz results. Please try again.',
        
        // Dictionary errors
        DICTIONARY_LOAD_FAILED: 'Failed to load dictionary. Please refresh the page.',
        DICTIONARY_SEARCH_FAILED: 'Search failed. Please try again.',
        
        // General errors
        UNEXPECTED_ERROR: 'Something went wrong. Please try again.',
        RETRY_SUGGESTION: 'Please try again in a moment.'
    };

    /**
     * Global error handler for uncaught exceptions
     */
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

    /**
     * Main error handling function
     * @param {Object} errorInfo - Error information
     */
    static handleError(errorInfo) {
        const {
            type = this.ERROR_TYPES.UNKNOWN,
            message,
            stack,
            context = {},
            showToast = true,
            allowRetry = true,
            retryAction = null
        } = errorInfo;

        // Log error for debugging
        this.logError(errorInfo);

        // Show user-friendly message
        if (showToast) {
            this.showErrorMessage(type, message, allowRetry, retryAction, context);
        }

        // Report to analytics (if configured)
        this.reportError(errorInfo);
    }

    /**
     * Show user-friendly error message
     */
    static showErrorMessage(type, technicalMessage, allowRetry = true, retryAction = null, context = {}) {
        // Get user-friendly message
        const userMessage = this.getUserFriendlyMessage(type, technicalMessage, context);
        
        // Create or update toast notification
        this.showErrorToast(userMessage, allowRetry, retryAction);
    }

    /**
     * Convert technical errors to user-friendly messages
     */
    static getUserFriendlyMessage(type, technicalMessage, context = {}) {
        // Check for specific error patterns first
        if (technicalMessage.includes('Failed to fetch') || 
            technicalMessage.includes('NetworkError') ||
            !navigator.onLine) {
            return this.ERROR_MESSAGES.NETWORK_OFFLINE;
        }

        if (technicalMessage.includes('timeout')) {
            return this.ERROR_MESSAGES.NETWORK_TIMEOUT;
        }

        // Type-specific messages
        switch (type) {
            case this.ERROR_TYPES.NETWORK:
                return this.ERROR_MESSAGES.NETWORK_FAILED;
                
            case this.ERROR_TYPES.AUTH:
                if (technicalMessage.includes('auth/user-not-found') || 
                    technicalMessage.includes('auth/wrong-password')) {
                    return this.ERROR_MESSAGES.AUTH_LOGIN_FAILED;
                }
                return this.ERROR_MESSAGES.AUTH_SIGNUP_FAILED;
                
            case this.ERROR_TYPES.FIRESTORE:
                if (technicalMessage.includes('permission-denied')) {
                    return this.ERROR_MESSAGES.FIRESTORE_PERMISSION_DENIED;
                }
                return this.ERROR_MESSAGES.FIRESTORE_READ_FAILED;
                
            case this.ERROR_TYPES.QUIZ:
                return this.ERROR_MESSAGES.QUIZ_LOAD_FAILED;
                
            case this.ERROR_TYPES.DICTIONARY:
                return this.ERROR_MESSAGES.DICTIONARY_LOAD_FAILED;
                
            default:
                return this.ERROR_MESSAGES.UNEXPECTED_ERROR;
        }
    }

    /**
     * Show error toast notification
     */
    static showErrorToast(message, allowRetry = true, retryAction = null) {
        // Remove existing error toasts
        const existingToasts = document.querySelectorAll('.error-toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.innerHTML = `
            <div class="error-toast-content">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${message}</div>
                ${allowRetry ? '<button class="error-retry-btn">Try Again</button>' : ''}
                <button class="error-close-btn">×</button>
            </div>
        `;

        // Add styles
        if (!document.querySelector('#error-toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'error-toast-styles';
            styles.textContent = `
                .error-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #fff;
                    border: 1px solid #e74c3c;
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    max-width: 400px;
                    animation: slideInRight 0.3s ease;
                }
                .error-toast-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .error-icon {
                    font-size: 1.2em;
                    flex-shrink: 0;
                }
                .error-message {
                    flex: 1;
                    color: #c0392b;
                    font-size: 14px;
                    line-height: 1.4;
                }
                .error-retry-btn {
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    flex-shrink: 0;
                }
                .error-retry-btn:hover {
                    background: #2980b9;
                }
                .error-close-btn {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #7f8c8d;
                    flex-shrink: 0;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .error-toast.fade-out {
                    animation: slideOutRight 0.3s ease forwards;
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(toast);

        // Add event listeners
        const closeBtn = toast.querySelector('.error-close-btn');
        closeBtn.addEventListener('click', () => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        });

        if (allowRetry) {
            const retryBtn = toast.querySelector('.error-retry-btn');
            retryBtn.addEventListener('click', () => {
                if (retryAction) {
                    retryAction();
                } else {
                    window.location.reload();
                }
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            });
        }

        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }
        }, 8000);
    }

    /**
     * Log error for debugging
     */
    static logError(errorInfo) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...errorInfo
        };

        console.error('🚨 Application Error:', logEntry);

        // Store in localStorage for debugging (limit to last 50 errors)
        try {
            const errorLog = JSON.parse(localStorage.getItem('bornopath_error_log') || '[]');
            errorLog.unshift(logEntry);
            
            // Keep only last 50 errors
            if (errorLog.length > 50) {
                errorLog.splice(50);
            }
            
            localStorage.setItem('bornopath_error_log', JSON.stringify(errorLog));
        } catch (e) {
            console.warn('Could not save error to localStorage:', e);
        }
    }

    /**
     * Report error to analytics service (extend this for your analytics)
     */
    static reportError(errorInfo) {
        // Example: Send to analytics service
        // if (window.gtag) {
        //     gtag('event', 'exception', {
        //         description: errorInfo.message,
        //         fatal: false
        //     });
        // }
        
        // You can integrate with Sentry, LogRocket, etc.
        console.log('📊 Error reported to analytics:', errorInfo);
    }

    /**
     * Create retryable operation with exponential backoff
     */
    static async withRetry(operation, maxRetries = 3, initialDelay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) break;
                
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(`Retry attempt ${attempt} after ${delay}ms`);
                
                await this.delay(delay);
            }
        }
        
        throw lastError;
    }

    /**
     * Utility delay function
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get error log for debugging
     */
    static getErrorLog() {
        try {
            return JSON.parse(localStorage.getItem('bornopath_error_log') || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Clear error log
     */
    static clearErrorLog() {
        localStorage.removeItem('bornopath_error_log');
    }
}

// Initialize global error handling
ErrorHandler.initGlobalErrorHandling();