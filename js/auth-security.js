// /js/auth-security.js - Enhanced authentication security
import { SecurityUtils } from './security.js';

class AuthSecurity {
    static MAX_LOGIN_ATTEMPTS = 5;
    static LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

    /**
     * Track login attempts and apply rate limiting
     */
    static initLoginProtection() {
        if (!localStorage.getItem('loginAttempts')) {
            localStorage.setItem('loginAttempts', '0');
            localStorage.setItem('lastAttemptTime', Date.now().toString());
        }
    }

    /**
     * Check if user is temporarily locked out
     * @returns {boolean} Is locked out
     */
    static isLockedOut() {
        const attempts = parseInt(localStorage.getItem('loginAttempts') || '0');
        const lastAttempt = parseInt(localStorage.getItem('lastAttemptTime') || '0');
        
        if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
            const timeSinceLastAttempt = Date.now() - lastAttempt;
            if (timeSinceLastAttempt < this.LOCKOUT_DURATION) {
                return true;
            } else {
                // Reset attempts after lockout period
                this.resetLoginAttempts();
            }
        }
        return false;
    }

    /**
     * Record a failed login attempt
     */
    static recordFailedAttempt() {
        const attempts = parseInt(localStorage.getItem('loginAttempts') || '0') + 1;
        localStorage.setItem('loginAttempts', attempts.toString());
        localStorage.setItem('lastAttemptTime', Date.now().toString());
    }

    /**
     * Reset login attempts on successful login
     */
    static resetLoginAttempts() {
        localStorage.setItem('loginAttempts', '0');
        localStorage.setItem('lastAttemptTime', Date.now().toString());
    }

    /**
     * Enhanced login validation
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Object} Validation result
     */
    static validateLoginInput(email, password) {
        // Check rate limiting
        if (this.isLockedOut()) {
            const lastAttempt = parseInt(localStorage.getItem('lastAttemptTime') || '0');
            const remainingTime = Math.ceil((this.LOCKOUT_DURATION - (Date.now() - lastAttempt)) / 60000);
            return {
                valid: false,
                message: `Too many failed attempts. Try again in ${remainingTime} minutes.`
            };
        }

        // Validate email
        if (!SecurityUtils.validateEmail(email)) {
            this.recordFailedAttempt();
            return {
                valid: false,
                message: 'Please enter a valid email address'
            };
        }

        // Validate password
        const passwordValidation = SecurityUtils.validatePassword(password);
        if (!passwordValidation.valid) {
            this.recordFailedAttempt();
            return passwordValidation;
        }

        return { valid: true, message: 'Inputs are valid' };
    }

    /**
     * Enhanced signup validation
     * @param {Object} userData - User registration data
     * @returns {Object} Validation result
     */
    static validateSignupInput(userData) {
        const { email, password, name, gender, userClass } = userData;

        // Validate email
        if (!SecurityUtils.validateEmail(email)) {
            return {
                valid: false,
                message: 'Please enter a valid email address'
            };
        }

        // Validate password
        const passwordValidation = SecurityUtils.validatePassword(password);
        if (!passwordValidation.valid) {
            return passwordValidation;
        }

        // Validate name
        if (!SecurityUtils.validateName(name)) {
            return {
                valid: false,
                message: 'Please enter a valid name (2-50 characters, letters and spaces only)'
            };
        }

        // Validate gender
        const validGenders = ['Male', 'Female'];
        if (!validGenders.includes(gender)) {
            return {
                valid: false,
                message: 'Please select a valid gender'
            };
        }

        // Validate class/grade
        const validClasses = ['Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'University'];
        if (!validClasses.includes(userClass)) {
            return {
                valid: false,
                message: 'Please select a valid class/grade'
            };
        }

        return { valid: true, message: 'All inputs are valid' };
    }
}

// Initialize login protection when module loads
AuthSecurity.initLoginProtection();