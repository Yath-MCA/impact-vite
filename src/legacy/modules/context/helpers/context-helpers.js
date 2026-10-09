/**
 * Shared utilities for all context.js files
 * This file is prepended to global_context.js during gulp build
 */

/**
 * Pure registration gate for registerOnReady journal/books/CMS18 flags.
 * @param {Object} flags
 * @param {boolean} [flags.isBooksOnly]
 * @param {boolean} [flags.isJournalOnly]
 * @param {boolean} [flags.isCms18Only]
 * @param {boolean} [flags.excludeCms18]
 * @param {{ isJournal: boolean, isCms18: boolean }} env
 * @returns {boolean}
 */
function shouldAllowModuleRegistration(flags, env) {
    flags = flags || {};
    env = env || {};
    const isBooksOnly = !!flags.isBooksOnly;
    const isJournalOnly = !!flags.isJournalOnly;
    const isCms18Only = !!flags.isCms18Only;
    const excludeCms18 = !!flags.excludeCms18;
    const isJournal = !!env.isJournal;
    const isCms18 = !!env.isCms18;

    if (isBooksOnly && isJournal) return false;
    if (isJournalOnly && !isJournal) return false;
    if (isCms18Only && !isCms18) return false;
    if (excludeCms18 && isCms18) return false;
    return true;
}

const ContextHelpers = {
    // Module ID constants map (moduleId -> config)
    MODULE_REGISTRY: new Map(),

    shouldAllowModuleRegistration,

    /**
     * Poll for moduleSystem availability
     * @param {number} timeout - Max wait time in ms (default: 5000)
     * @returns {Promise<Object>} moduleSystem instance
     */
    waitForModuleSystem(timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (typeof moduleSystem !== 'undefined') {
                resolve(moduleSystem);
                return;
            }
            const startTime = Date.now();
            const interval = setInterval(() => {
                if (typeof moduleSystem !== 'undefined') {
                    clearInterval(interval);
                    resolve(moduleSystem);
                    return;
                }
                if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    reject(new Error('moduleSystem not available within timeout'));
                }
            }, 100);
        });
    },

    /**
     * Register a module with automatic polling for moduleSystem
     * @param {string} moduleId - Unique module identifier
     * @param {Object} config - Module registration config
     * @param {Object} options - Additional options
     * @param {boolean} options.checkRole - Whether to check USER_INFO.ROLE_ID === ROLE_IDS.CO
     * @param {boolean} options.skipIfExists - Skip if module already registered
     */
    async registerOnReady(moduleId, config, options = {}) {
        const {
            checkRole = false,
                skipIfExists = true,
                isBooksOnly = false,
                isJournalOnly = false,
                isCms18Only = false,
                excludeCms18 = false
        } = options;

        try {
            // Wait until InitialLoadDialog reaches the required stage before registering.
            // NOTE: this must be `< 5` (wait while not yet ready), not `> 4` (retry forever
            // once past it) — progress only increases, so `> 4` would retry endlessly and
            // never actually register once that stage passed. Also awaits the recursive
            // retry directly (`return this.registerOnReady(...)`) rather than firing a bare
            // setTimeout and returning immediately — a fire-and-forget retry there would
            // resolve this promise with `undefined` before registration actually happens,
            // which breaks any caller doing `await ContextHelpers.registerOnReady(...)`.

            if (typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW && (config.trackView === false || !config.trackView)) {
                return debug.warn(`not required to register module ${moduleId}:`);
            }

            if (typeof InitialLoadDialog !== 'undefined' && InitialLoadDialog.progressValue < 5) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                return this.registerOnReady(moduleId, config, options);
            }

            const refStyle = (typeof SHARED_KEY !== 'undefined' && SHARED_KEY && SHARED_KEY.refstyle) || '';
            const IsCMS18 = ['CMS18', 'CMS 18'].includes(refStyle);
            const ms = await this.waitForModuleSystem();

            // Optional role check
            if (checkRole && USER_INFO.ROLE_ID !== ROLE_IDS.CO) {
                return;
            }

            const results = shouldAllowModuleRegistration({
                isBooksOnly,
                isJournalOnly,
                isCms18Only,
                excludeCms18
            }, {
                isJournal: !!IS_JOURNAL,
                isCms18: IsCMS18
            });
            
            if (!results) return;


            // Skip if already registered - still bind UI triggers if new ones added
            // TODO: hasModule is unconfirmed on ModuleRegistry (bootstrapImpactModules.js never
            // called it — it just re-called registerModuleDefinition unconditionally, guarded
            // once at the batch level via registry._baseModulesRegistered). Falling back to
            // "not registered" here is the safe default until ModuleRegistry.js confirms this.
            if (skipIfExists && typeof ms.hasModule === 'function' && ms.hasModule(moduleId)) {
                this.bindUITriggers(moduleId, config);
                return;
            }

            await ms.registerModule(moduleId, config);

            // Bind UI triggers after successful registration
            this.bindUITriggers(moduleId, config);
        } catch (err) {
            console.warn(`Failed to register module ${moduleId}:`, err.message);
        }
    },

    /**
     * Open a dialog with automatic registration fallback
     * @param {string} moduleId - Module identifier
     * @param {Object} config - Module config for auto-registration
     * @param {string} globalVar - Global variable name to cache instance
     * @returns {Promise<void>}
     */
    async openDialog(moduleId, config, globalVar) {
        // Fast path: already loaded
        if (window[globalVar] && typeof window[globalVar].show === 'function') {
            await window[globalVar].show();
            return;
        }

        try {
            const ms = await this.waitForModuleSystem();
            // TODO: getModule + autoRegister is unconfirmed on ModuleRegistry — verify against
            // ModuleRegistry.js. If it's not there, this needs registerModuleDefinition + a
            // separate lookup method instead.
            const mod = await ms.getModule(moduleId, {
                autoRegister: config
            });

            if (!mod || typeof mod.show !== 'function') {
                throw new Error(`${moduleId} failed to load`);
            }

            window[globalVar] = mod;
            await mod.show();
        } catch (err) {
            console.warn(`Failed to open ${moduleId}:`, err.message);
            ErrorLogTrace(`openDialog-${moduleId}`, err.message);
        }
    },

    /**
     * Create a debounced open function to prevent duplicate clicks
     * @param {Function} openFn - The open function to wrap
     * @returns {Function} Debounced open function
     */
    createDebouncedOpen(openFn) {
        let inFlightPromise = null;

        return async function(...args) {
            if (inFlightPromise) return inFlightPromise;

            inFlightPromise = openFn.apply(this, args).finally(() => {
                inFlightPromise = null;
            });

            return inFlightPromise;
        };
    },

    /**
     * Create a debounced handler for UI triggers
     * @param {Function} fn - The function to debounce
     * @param {number} delay - Delay in milliseconds (default: 300)
     * @returns {Function} Debounced handler
     */
    createDebouncedHandler(fn, delay = 300) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    },

    /**
     * Helper to load module and show it (for UI triggers without custom executeCommand)
     * @param {string} moduleId - Module identifier
     * @param {Object} config - Module config for auto-registration
     * @param {string} globalVar - Global variable name to cache instance
     * @returns {Promise<void>}
     */
    async openModuleUI(moduleId, config, globalVar) {
        // Determine global variable name
        const globalVarName = globalVar || moduleId;

        // Fast path: already loaded
        if (window[globalVarName] && typeof window[globalVarName].show === 'function') {
            await window[globalVarName].show();
            return;
        }

        // Load via moduleSystem
        try {
            const ms = await this.waitForModuleSystem();
            // TODO: getModule + autoRegister is unconfirmed on ModuleRegistry — same caveat as
            // openDialog() above.
            const mod = await ms.getModule(moduleId, {
                autoRegister: config
            });

            if (mod && typeof mod.show === 'function') {
                window[globalVarName] = mod;
                await mod.show();
            }
        } catch (err) {
            console.error(`Failed to open ${moduleId} from UI trigger:`, err);
        }
    },

    /**
     * Bind UI triggers from module config
     * Called automatically by registerOnReady when module has uiTriggers
     * @param {string} moduleId - Unique module identifier
     * @param {Object} config - Module registration config
     */
    bindUITriggers(moduleId, config) {
        if (!config.uiTriggers || !Array.isArray(config.uiTriggers)) return;

        config.uiTriggers.forEach(trigger => {
            const {
                selector,
                action,
                event = 'click',
                preventDefault = true,
                stopPropagation = false,
                debounce = false
            } = trigger;

            if (!selector || !action) {
                console.warn(`Invalid uiTrigger for ${moduleId}: missing selector or action`);
                return;
            }

            // Use jQuery if available, otherwise vanilla JS
            const bindFn = typeof $ !== 'undefined' ?
                (el, handler) => $(document).on(event, selector, handler) :
                (el, handler) => {
                    document.querySelectorAll(selector).forEach(el => {
                        el.addEventListener(event, handler);
                    });
                };

            const handler = async (evt) => {
                if (preventDefault && evt.preventDefault) evt.preventDefault();
                if (stopPropagation && evt.stopPropagation) evt.stopPropagation();

                // Build item object like context menu would
                const item = {
                    name: `${moduleId}_${action}_UI`,
                    action: action,
                    fromUI: true,
                    originalEvent: evt
                };

                // Call executeCommand if defined
                if (config.executeCommand && typeof config.executeCommand === 'function') {
                    try {
                        await config.executeCommand(null, item, config, {
                            element: evt.target,
                            fromUI: true
                        });
                    } catch (err) {
                        console.error(`UI trigger error for ${moduleId}.${action}:`, err);
                    }
                } else {
                    // No executeCommand - default behavior: load and show module
                    await this.openModuleUI(moduleId, config);
                }
            };

            // Apply debounce if requested
            const finalHandler = debounce ?
                this.createDebouncedHandler(handler, typeof debounce === 'number' ? debounce : 300) : handler;

            bindFn(selector, finalHandler);

            if (typeof debug !== 'undefined' && debug.log) {
                debug.log(`UI trigger bound: ${selector} -> ${moduleId}.${action}`);
            }
        });
    },

    /**
     * Load a support file from a module folder under assets/{iVersion}/modules/.
     * Dispatch by file extension (.json today; easy to extend).
     * @param {string} moduleFolder - e.g. 'edit_citation_text'
     * @param {string} fileName - e.g. 'xref_role_config.json'
     * @returns {Promise<*>}
     */
    loadModuleFile(moduleFolder, fileName) {
        const folder = String(moduleFolder || '').replace(/^\/+|\/+$/g, '');
        const name = String(fileName || '').replace(/^\/+/, '');
        if (!folder || !name) {
            return Promise.reject(new Error('loadModuleFile: moduleFolder and fileName required'));
        }

        const ext = (name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
        const version = (typeof iVersion !== 'undefined' && iVersion) ? iVersion : 'v1';
        const root = (typeof _ROOT !== 'undefined' && _ROOT) ? _ROOT : '';
        const url = `${root}assets/${version}/modules/${folder}/${name}`;

        if (ext === '.json') {
            if (typeof $ !== 'undefined' && typeof $.getJSON === 'function') {
                return Promise.resolve($.getJSON(url));
            }
            return fetch(url).then((res) => {
                if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
                return res.json();
            });
        }

        return Promise.reject(new Error(`Unsupported module file type: ${ext || '(none)'}`));
    },

    /**
     * Load a supportingFiles entry and publish it to window[variable].
     * Reuses a non-empty existing value to prevent duplicate requests.
     * @param {{path:string, variable?:string}} fileConfig
     * @returns {Promise<*>}
     */
    loadModuleResource(fileConfig = {}, owner = null) {
        const {
            path,
            variable,
            name
        } = fileConfig;
        if (!path) {
            return Promise.reject(new Error('loadModuleResource: path required'));
        }

        if (variable && typeof window !== 'undefined') {
            const existing = window[variable];
            const alreadyLoaded = existing != null &&
                (typeof existing !== 'object' || Object.keys(existing).length > 0);
            if (alreadyLoaded) {
                if (owner && typeof owner.modulePostFetch === 'function') {
                    owner.modulePostFetch(fileConfig, existing);
                }
                return Promise.resolve(existing);
            }
        }

        const normalizedPath = String(path)
            .replace(/\\/g, '/')
            .replace(/^\.?\//, '')
            .replace(/^modules\//, '');
        const separatorIndex = normalizedPath.lastIndexOf('/');
        if (separatorIndex <= 0 || separatorIndex === normalizedPath.length - 1) {
            return Promise.reject(new Error(`loadModuleResource: invalid path "${path}"`));
        }

        const moduleFolder = normalizedPath.slice(0, separatorIndex);
        const fileName = normalizedPath.slice(separatorIndex + 1);

        return this.loadModuleFile(moduleFolder, fileName).then((data) => {
            if (variable && typeof window !== 'undefined') {
                if (name && window[name] && typeof window[name] === 'object' && window[name]._id && window[name]._id == name) {
                    window[name][variable] = data;
                }
                window[variable] = data;
            }
            if (owner && typeof owner.modulePostFetch === 'function') {
                owner.modulePostFetch(fileConfig, data);
            }
            return data;
        });
    }
};

// Backward compatibility: expose to window
window.ContextHelpers = ContextHelpers;