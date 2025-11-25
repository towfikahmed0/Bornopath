// /js/error-recovery.js - Error recovery and fallback UI
class ErrorRecovery {
    /**
     * Show connection error page
     */
    static showConnectionError(retryAction = null) {
        const errorHtml = `
            <div class="connection-error-overlay">
                <div class="connection-error-card">
                    <div class="error-icon">📡</div>
                    <h3>Connection Lost</h3>
                    <p>We're having trouble connecting to the server. Please check your internet connection.</p>
                    <div class="error-actions">
                        <button class="btn-primary" onclick="ErrorRecovery.retryConnection()">Retry</button>
                        ${retryAction ? `<button class="btn-secondary" onclick="${retryAction}">Try Alternative</button>` : ''}
                        <button class="btn-text" onclick="ErrorRecovery.goOffline()">Continue Offline</button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        if (!document.querySelector('#connection-error-styles')) {
            const styles = document.createElement('style');
            styles.id = 'connection-error-styles';
            styles.textContent = `
                .connection-error-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                }
                .connection-error-card {
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    text-align: center;
                    max-width: 400px;
                    margin: 1rem;
                }
                .error-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                .error-actions {
                    margin-top: 1.5rem;
                    display: flex;
                    gap: 0.5rem;
                    justify-content: center;
                    flex-wrap: wrap;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.insertAdjacentHTML('beforeend', errorHtml);
    }

    /**
     * Retry connection
     */
    static retryConnection() {
        window.location.reload();
    }

    /**
     * Continue in offline mode
     */
    static goOffline() {
        const overlay = document.querySelector('.connection-error-overlay');
        if (overlay) overlay.remove();
        
        // Enable offline features
        console.log('Continuing in offline mode');
    }
}