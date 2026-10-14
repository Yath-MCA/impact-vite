    // ============================================================================
    // UTILITY HELPER - Removed from being duplicated across modules
    // ============================================================================

    class QueryUtils {
        static generateId(prefix = 'query') {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        static validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        static sanitizeHtml(html) {
            const div = document.createElement('div');
            div.textContent = html;
            return div.innerHTML;
        }

        static debounce(func, wait) {
            let timeout;
            return function(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        static async fetchWithTimeout(url, options = {}, timeout = 5000) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                clearTimeout(id);
                return response;
            } catch (error) {
                clearTimeout(id);
                throw error;
            }
        }
    }