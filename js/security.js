// /js/security.js - Centralized security utilities
class SecurityUtils {
    /**
     * Sanitize user input to prevent XSS attacks
     * @param {string} input - User input to sanitize
     * @param {boolean} allowBasicHTML - Allow basic formatting (for AI content)
     * @returns {string} Sanitized input
     */
    static sanitizeInput(input, allowBasicHTML = false) {
        if (typeof input !== 'string') return '';
        
        let sanitized = input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');

        // Allow basic safe HTML for AI explanations if requested
        if (allowBasicHTML) {
            sanitized = sanitized
                .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/g, '<b>$1</b>')
                .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/g, '<i>$1</i>')
                .replace(/&lt;p&gt;(.*?)&lt;\/p&gt;/g, '<p>$1</p>')
                .replace(/&lt;ul&gt;(.*?)&lt;\/ul&gt;/g, '<ul>$1</ul>')
                .replace(/&lt;li&gt;(.*?)&lt;\/li&gt;/g, '<li>$1</li>')
                .replace(/&lt;br&gt;/g, '<br>')
                .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/g, '<strong>$1</strong>')
                .replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/g, '<em>$1</em>');
        }

        return sanitized.trim();
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    static validateEmail(email) {
        if (typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} {valid: boolean, message: string}
     */
    static validatePassword(password) {
        if (typeof password !== 'string') {
            return { valid: false, message: 'Password must be a string' };
        }

        const trimmed = password.trim();
        
        if (trimmed.length < 6) {
            return { valid: false, message: 'Password must be at least 6 characters' };
        }

        if (trimmed.length > 128) {
            return { valid: false, message: 'Password too long' };
        }

        // Basic strength checks
        if (!/(?=.*[a-z])/.test(trimmed)) {
            return { valid: false, message: 'Password should contain lowercase letters' };
        }

        if (!/(?=.*[A-Z])/.test(trimmed)) {
            return { valid: false, message: 'Password should contain uppercase letters' };
        }

        if (!/(?=.*\d)/.test(trimmed)) {
            return { valid: false, message: 'Password should contain numbers' };
        }

        return { valid: true, message: 'Password is strong' };
    }

    /**
     * Validate name (alphanumeric with spaces and basic punctuation)
     * @param {string} name - Name to validate
     * @returns {boolean} Is valid name
     */
    static validateName(name) {
        if (typeof name !== 'string') return false;
        const nameRegex = /^[a-zA-Z\s\u0980-\u09FF\-\.']{2,50}$/; // Allows Bengali characters
        return nameRegex.test(name.trim());
    }

    /**
     * Safe innerHTML setter with sanitization
     * @param {Element} element - DOM element
     * @param {string} content - HTML content
     * @param {boolean} allowBasicHTML - Allow basic formatting
     */
    static safeInnerHTML(element, content, allowBasicHTML = false) {
        if (!element || typeof content !== 'string') return;
        
        element.textContent = ''; // Clear first for safety
        const sanitized = this.sanitizeInput(content, allowBasicHTML);
        element.innerHTML = sanitized;
    }

    /**
     * Validate Firestore document ID to prevent injection
     * @param {string} id - Document ID
     * @returns {boolean} Is valid ID
     */
    static validateFirestoreId(id) {
        if (typeof id !== 'string') return false;
        // Firestore IDs can contain letters, numbers, hyphens, underscores
        const idRegex = /^[a-zA-Z0-9\-_]{1,500}$/;
        return idRegex.test(id);
    }

    /**
     * Escape regex special characters for safe search
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    static escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Validate URL parameters
     * @param {string} param - URL parameter
     * @returns {string} Sanitized parameter
     */
    static sanitizeURLParam(param) {
        if (typeof param !== 'string') return '';
        return param.replace(/[^a-zA-Z0-9\-_]/g, '');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityUtils;
}