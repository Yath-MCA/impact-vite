/**
 * ModuleTemplateStore - Runtime template bundle loader and cache
 * Provides primary lookup from bundled templates with fallback to individual fetches
 */

const CommonUtils = {
    getNodeId: (node) => {
        if (!node || typeof node.getAttribute !== "function") return null;
        return node.getAttribute(node.hasAttribute("del_id") ? "del_id" : "id") || null;
    },

    handleSelectionAndNode: (editor, node) => {
        const selection = IMPACT_SELECTION;
        if (IMPACT.USER_ENV_INFO.isSafari && selection.NODE) {
            return editor.document.getById(IMP_SAFARI.TARGET.closest("div").id);
        } else if (selection.NODE) {
            return selection.NODE.getAscendant({
                div: 1
            });
        }
        return node;
    },

    createParams: (action, id) => {
        const baseParams = {
            INSERT_MODE: (action === "open" || !id),
            EDIT_MODE: ((action === "edit" || action === "reorder") && !!id),
            FROM_QRY: (action == "query" && !!id)
        };
        return baseParams;
    },
};

const ModuleTemplateStore = {
    // Cache state
    _bundleLoaded: false,
    _bundleLoading: null,
    _templateCache: new Map(),

    /**
     * Normalize template path for consistent lookup
     * Handles: ./figures/template.html, figures/template.html, figures\\template.html
     */
    _normalizePath(templatePath) {
        if (!templatePath) return null;
        return templatePath
            // Windows slashes
            .replace(/\\/g, '/')
            // Remove leading ./
            .replace(/^\.\//, '');
    },

    /**
     * Load the template bundle once
     */
    async _loadBundle() {
        if (this._bundleLoaded) return true;
        if (this._bundleLoading) return this._bundleLoading;

        this._bundleLoading = (async () => {
            try {
                const timestamp = new Date().getTime();
                const ROOT = (typeof DOMAIN_ROOT !== 'undefined' ? DOMAIN_ROOT : '') +
                    (typeof IS_LOCAL_HOST !== 'undefined' && IS_LOCAL_HOST ? "dist/" : "");
                const version = typeof iVersion !== 'undefined' ? iVersion : 'v5.00.25';
                const bundleUrl = `${ROOT}assets/${version}/modules/templates.html?_=${timestamp}`;

                const response = await fetch(bundleUrl);
                if (!response.ok) {
                    console.warn(`Template bundle not available (${response.status}), will use fallback fetches`);
                    return false;
                }

                const bundleHTML = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(bundleHTML, 'text/html');

                // Parse all template elements into cache
                const templates = doc.querySelectorAll('template[data-template-path]');
                templates.forEach(template => {
                    const path = template.getAttribute('data-template-path');
                    const normalizedPath = this._normalizePath(path);
                    this._templateCache.set(normalizedPath, template.innerHTML);
                });

                console.log(`✅ Template bundle loaded: ${templates.length} templates`);
                this._bundleLoaded = true;
                return true;

            } catch (error) {
                console.warn('Failed to load template bundle:', error.message);
                return false;
            } finally {
                this._bundleLoading = null;
            }
        })();

        return this._bundleLoading;
    },

    /**
     * Get template HTML by path
     * @param {string} templatePath - Path like './figures/template.html'
     * @returns {Promise<string|null>} Template HTML or null if not found
     */
    async getTemplate(templatePath) {
        const normalizedPath = this._normalizePath(templatePath);

        // 1. Check cache first
        if (this._templateCache.has(normalizedPath)) {
            return this._templateCache.get(normalizedPath);
        }

        // 2. Try to load bundle and check again
        const bundleAvailable = await this._loadBundle();
        if (bundleAvailable && this._templateCache.has(normalizedPath)) {
            return this._templateCache.get(normalizedPath);
        }

        // 3. Return null to trigger fallback fetch
        return null;
    },

    /**
     * Check if template exists in bundle without fetching
     * @param {string} templatePath - Path like './figures/template.html'
     */
    hasTemplate(templatePath) {
        const normalizedPath = this._normalizePath(templatePath);
        return this._templateCache.has(normalizedPath);
    },

    /**
     * Preload the bundle early (call during app initialization)
     */
    preload() {
        this._loadBundle().then(() => {
            console.log('Template bundle preloaded');
        });
    }
};

// Expose to window
window.ModuleTemplateStore = ModuleTemplateStore;

// Auto-preload when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Delay slightly to not compete with critical page load
    setTimeout(() => {
        ModuleTemplateStore.preload();
    }, 100);
});
