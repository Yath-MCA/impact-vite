// Unified Module System - Combines both initialization approaches
class UnifiedModuleSystem {
    constructor() {
        // Core properties
        this.modules = new Map();
        this.moduleDefinitions = new Map();
        this.loadedInstances = new Map();
        this.moduleStatuses = new Map();
        this.contextMenuRegistry = new Map();
        this.editorInstances = new Set();

        this.recordAction = (typeof getRecordUserAction === "function") ?
            getRecordUserAction() :
            ((typeof window !== "undefined" && window.recordUserActionSingleton) ?
                window.recordUserActionSingleton :
                new RecordUserAction());

        this.apiService = new FetchService();

        // Error tracking
        this.errorTracker = new EnhancedErrorTracker();

        // Configuration
        this.configRoot = null;
        this.jConfigRoot = null;

        // Context data for CKEditor
        this.contextData = {
            element: null,
            selection: null,
            elementPath: null,
            timestamp: null
        };

        // Module loading states
        this.lazyLoadQueue = new Map();
        this.lazyDelay = 2000;

        // Module tracking stats
        this.moduleStats = new Map();

        // Initialize
        this.Initialize();
    }

    Initialize() {
        this.updateConfig();
        this.setupCKEditorIntegration();
        // this.setupErrorReporting();
        this.setupGlobalErrorTracking();
        // Add this
        this.setupGlobalEventHandlers();
        this.setupSyncOnUserActivityData();

    }

    // ========== Module Registration ==========
    async registerModule(moduleId, config) {
        try {
            const moduleConfig = this.normalizeModuleConfig(moduleId, config);

            // Store module definition
            this.moduleDefinitions.set(moduleId, moduleConfig);

            // Register with error tracker
            this.errorTracker.registerModule(moduleId);

            // Handle different loading types
            await this.handleModuleLoading(moduleId, moduleConfig);

            // Register context menu if applicable
            if (moduleConfig.contextMenu) {
                this.registerContextMenu(moduleId, moduleConfig);
            } else {
                // debug.warn(`Module ${moduleId} does not have contextMenu config, skipping context menu registration.`);
            }

            // Late-registered modules: bind CKEditor commands on already-ready editors
            if (moduleConfig.commands && moduleConfig.commands.length > 0 && this.editorInstances.size > 0) {
                for (const editor of this.editorInstances) {
                    await this.setupModuleCommands(editor, moduleId, moduleConfig);
                }
            }

            debug.log(`--- REG MOD: ${moduleId}---`);
            return this;
        } catch (error) {
            this.errorTracker.logError('system', 'registerModule', error, {
                moduleId
            });
            throw error;
        }
    }

    normalizeModuleConfig(moduleId, config) {
        return {
            // Basic info
            id: moduleId,
            name: config.name || moduleId,
            // onthefly, lazy, ondemand
            type: config.type || 'onthefly',

            // Module loading
            moduleClass: config.moduleClass,
            moduleSetup: config.moduleSetup || {},
            path: config.path,
            templatePath: config.templatePath,

            // Dependencies
            dependencies: Array.isArray(config.dependencies) ? config.dependencies : [],
            supportingFiles: Array.isArray(config.supportingFiles) ? config.supportingFiles : [],

            // Context menu configuration
            contextMenu: config.contextMenu || null,
            commands: Array.isArray(config.commands) ? config.commands : [],
            group_name: config.group_name || moduleId,
            groupOrder: config.groupOrder || 100,

            // Execution
            executeCommand: config.executeCommand || this.defaultExecuteCommand.bind(this),
            contextMenuHandler: config.contextMenuHandler || (() => ({})),

            // UI Events
            uiEvents: this.normalizeUIEvents(config.uiEvents || []),
            onContentDomUpdate: config.onContentDomUpdate,
            // Add this
            onDoubleClick: config.onDoubleClick,

            // Validation
            loadAdditionalValidation: config.loadAdditionalValidation,
            canShowValidation: config.canShowValidation,

            // State
            loaded: false,
            SHOW_CONTEXT_GROUP: null,
            SHOW_MENU_ITEMS: {},

            // Options
            wrapping: config.wrapping !== false,
            trackView: config.trackView || false,
            standalone: config.standalone || false,
            ...config
        };
    }

    // ========== Module Loading ==========
    async handleModuleLoading(moduleId, moduleConfig) {
        const loadingType = moduleConfig.type;

        // Initialize module stats
        this.initializeModuleStats(moduleId);

        switch (loadingType) {
            case 'onthefly':
                await this.loadModuleImmediately(moduleId, moduleConfig);
                break;
            case 'lazy':
                this.queueLazyLoad(moduleId, moduleConfig);
                break;
            case 'ondemand':
                // Module will be loaded when needed
                break;
            default:
                this.queueLazyLoad(moduleId, moduleConfig, 5 * 60 * 1000);
        }
    }

    initializeModuleStats(moduleId) {
        if (!this.moduleStats.has(moduleId)) {
            this.moduleStats.set(moduleId, {
                openCount: 0,
                closeCount: 0,
                totalOpenTime: 0,
                lastOpened: null,
                lastClosed: null,
                buttonClicks: {},
                inputInteractions: 0,
                errors: 0,
                avgOpenTime: 0,
                history: []
            });
        }
    }

    async loadModuleImmediately(moduleId, moduleConfig) {
        try {
            await this.loadModuleInstance(moduleId, moduleConfig);
            console.log(`✅ Module ${moduleId} loaded immediately`);
        } catch (err) {
            this.errorTracker.logError(moduleId, 'loadModuleImmediately', err);
            throw err;
        }
    }

    async ensureSupportingFiles(supportingFiles = [], when = 'initLoop', owner = null) {
        const files = supportingFiles.filter((file) => {
            return file && typeof file === 'object' && (file.when || 'initLoop') === when;
        });
        if (!files.length) return;

        if (!window.ContextHelpers || typeof window.ContextHelpers.loadModuleResource !== 'function') {
            throw new Error('ContextHelpers.loadModuleResource is not available');
        }

        await Promise.all(
            files.map((file) => window.ContextHelpers.loadModuleResource(file, owner))
        );
    }

    queueLazyLoad(moduleId, moduleConfig, customDelay = null) {
        const delay = customDelay || moduleConfig.lazyDelay || this.lazyDelay;

        if (this.lazyLoadQueue.has(moduleId)) {
            clearTimeout(this.lazyLoadQueue.get(moduleId));
        }

        const timeoutId = setTimeout(async () => {
            try {
                const instance = await this.loadModuleInstance(moduleId, moduleConfig);
                if (instance) {
                    window[moduleId] = instance;
                }
                this.lazyLoadQueue.delete(moduleId);
            } catch (err) {
                this.errorTracker.logError(moduleId, 'lazyLoad', err);
                this.lazyLoadQueue.delete(moduleId);
                console.error(moduleId, 'lazyLoad', err);
            }
        }, delay);

        this.lazyLoadQueue.set(moduleId, timeoutId);
    }

    async loadModuleInstance(moduleId, moduleConfig) {
        if (this.loadedInstances.has(moduleId)) {
            return this.loadedInstances.get(moduleId);
        }

        try {
            let instance;
            // --- 1. Legacy module handling ---
            if (moduleConfig.moduleSetup && moduleConfig.moduleSetup.name) {

                const setup = moduleConfig.moduleSetup;

                // Case: Script needs to be injected into DOM
                if (setup.Script2DOM === true) {
                    // Define dynamic subclass of BaseModule
                    if (!window[setup.name]) {
                        const DynamicModule = class extends BaseModule {
                            constructor(name, errorTracker = {}, config = {}) {
                                super(name, errorTracker, config);
                            }
                        };

                        // Register in global scope
                        window[setup.name] = new DynamicModule(setup.name);
                    }
                    await this.loadScript(setup.path);
                }
                // Case: Load via legacy function
                else {
                    await this.loadModuleLegacy(moduleConfig);
                }

                const moduleKey = setup.moduleKey || setup.name;
                instance = window[moduleKey];
            }
            // --- 2. Modern module class loading ---
            else if (moduleConfig.moduleClass) {
                const ModuleClass = moduleConfig.moduleClass;
                instance = new ModuleClass(moduleConfig.name, moduleConfig.subFolder);
            } else if (moduleConfig.path) {
                const ModuleClass = await this.loadModuleClass(moduleConfig.path);
                instance = new ModuleClass(moduleConfig.name, moduleConfig.subFolder);
            }

            // --- 3. Initialize and setup ---
            if (instance) {
                // Load template if defined
                if (moduleConfig.templatePath) {
                    if (typeof instance.loadTemplate === "function") {
                        await instance.loadTemplate(moduleConfig.templatePath);
                    } else {
                        await this.loadTemplateForInstance(instance, moduleConfig.templatePath);
                    }
                }

                window[moduleId] = instance;
                // Legacy callers use Abbreviation_Module (underscore); keep both names on window.
                if (moduleId === 'AbbreviationModule') {
                    window.Abbreviation_Module = instance;
                }
                await this.ensureSupportingFiles(moduleConfig.supportingFiles, 'initLoop', instance);

                // Initialize module if it has an initializer
                const initFn = instance.Initialize || instance.initialize;
                if (typeof initFn === "function") {
                    await initFn.call(instance);
                }

                if (typeof instance.postInitializeModule === "function") {
                    await instance.postInitializeModule();
                }

                // Register instance globally and locally (always assign — DOM id may pollute window first)
                this.loadedInstances.set(moduleId, instance);


                // Setup tracking hooks
                this.setupInstanceErrorTracking(instance, moduleId);
                this.setupMethodsForModule(instance, moduleId);
            }

            return instance;

        } catch (err) {
            this.errorTracker.logError(moduleId, "loadModuleInstance", err);
            throw err;
        }
    }
    /**
     * Resolve relative JS module path based on the current script's location
     * Example:
     *  current script → /assets/v5.01.45/config/lang/support_config.js
     *  path → './ref_form/index.js'
     *  result → /assets/v5.01.45/ref_form/index.js
     */
    resolveRelativeModulePath(path) {
        // If it's already absolute (like https://... or /assets/...), return as-is
        if (/^(https?:)?\/\//.test(path) || path.startsWith("/")) {
            return path;
        }

        // Helper function to validate if script path contains both required directories
        const isValidScript = (script) => {
            return script && script.src && script.src.includes("assets") && script.src.includes("modules");
        };

        // Find current executing or last loaded script matching both criteria
        const currentScript = isValidScript(document.currentScript) ?
            document.currentScript : [...document.scripts].reverse().find(isValidScript);

        if (!currentScript || !currentScript.src) {
            throw new Error("Cannot resolve base path: current script not found.");
        }

        const {
            origin,
            pathname
        } = new URL(currentScript.src);
        const parts = pathname.split("/");

        // Example parts: ["", "assets", "v5.01.45", "config", "lang", "support_config.js"]
        // We want: /assets/v5.01.45/ || /dist/assetes/ 
        let basePath = "";
        if (parts[2] === "dist") {
            // If folder structure includes "dist"
            basePath = `/${parts[1]}/${parts[2]}/${parts[3]}/${parts[4]}/${parts[5]}/`;
        } else {
            // Normal structure
            basePath = `/${parts[1]}/${parts[2]}/${parts[3]}/`;
        }

        // Clean the input path (remove leading './')
        const cleanPath = path.replace(/^.\//, "");

        return origin + basePath + cleanPath;
    }


    /**
     * Dynamically load a JS file into DOM (supports relative paths)
     * Example usage: await this.loadScript('./ref_form/index.js');
     */
    async loadScript(path) {
        try {
            const scriptUrl = this.resolveRelativeModulePath(path);

            // Avoid duplicate loads (ignore cache-busting query)
            const baseScriptUrl = scriptUrl.split("?")[0];
            if (document.querySelector(`[src^="${baseScriptUrl}"]`)) {
                return;
            }

            // Create and append script element
            return new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = `${scriptUrl}?_=${Date.now()}`;
                script.type = "text/javascript";
                script.async = true;

                script.onload = () => {
                    // console.log(`✅ Loaded: ${scriptUrl}`);
                    resolve();
                };

                script.onerror = (err) => {
                    console.error(`❌ Error loading script: ${scriptUrl}`, err);
                    reject(err);
                };

                document.head.appendChild(script);
            });
        } catch (error) {
            this.errorTracker.logError("system", "loadScript", error, {
                path
            });
            throw error;
        }
    }


    async loadModuleClass(path) {
        try {
            const moduleFile = await import(path);
            return moduleFile.default || moduleFile;
        } catch (error) {
            this.errorTracker.logError('system', 'loadModuleClass', error, {
                path
            });
            throw error;
        }
    }

    async loadModuleLegacy(moduleConfig) {
        const {
            moduleSetup
        } = moduleConfig;

        if (!window.moduleRegistry) {
            throw new Error('Module registry not available');
        }

        await registerAndMonitorModules(window.moduleRegistry, [moduleSetup]);
        moduleConfig.loaded = true;
    }

    // ========== Context Menu Integration ==========
    registerContextMenu(moduleId, moduleConfig) {
        this.contextMenuRegistry.set(moduleId, moduleConfig);
    }

    async setupAllEditorCommands(editor) {
        try {
            debug.log(`--- setupAllEditorCommands --- `);
            for (const [moduleId, moduleConfig] of this.moduleDefinitions) {
                if (moduleConfig.commands && moduleConfig.commands.length > 0) {
                    await this.setupModuleCommands(editor, moduleId, moduleConfig);
                }
            }
        } catch (err) {
            this.errorTracker.logError('system', 'setupAllEditorCommands', err);
        }
    }

    async setupModuleCommands(editor, moduleId, moduleConfig) {
        try {
            const groupName = moduleConfig && moduleConfig.group_name;
            if (!groupName) {
                console.warn(`setupModuleCommands: ${moduleId} has no context menu group`);
                return;
            }

            // Check if module should be shown
            if (moduleConfig.SHOW_CONTEXT_GROUP === null) {
                const shouldShow = this.evaluateVisibilityFromConfig(groupName);
                moduleConfig.SHOW_CONTEXT_GROUP = shouldShow;

                if (!shouldShow) {
                    console.log(`SHOW_CONTEXT_GROUP ${groupName} disabled`);
                    return;
                }
            } else if (!moduleConfig.SHOW_CONTEXT_GROUP) {
                console.log(`SHOW_CONTEXT_GROUP ${groupName} disabled`);
                return;
            }

            // Add menu group if needed (editor._ / menuGroups may be missing during early init)
            if (!editor || !editor._ || !editor._.menuGroups) {
                console.warn(`setupModuleCommands: ${moduleId} editor menuGroups unavailable for ${groupName}`);
                return;
            }
            if (!editor._.menuGroups[groupName]) {
                editor.addMenuGroup(groupName, moduleConfig.groupOrder);
            }

            // Process commands
            const menuItems = {};

            for (const item of moduleConfig.commands) {
                // Skip if command already exists
                if (editor.getCommand(item.name)) {
                    console.warn(`Command ${item.name} already exists, skipping...`);
                    continue;
                }

                // Validate command visibility
                if (item.canShowValidation) {
                    const isValid = await this.validateCommandVisibility(item, moduleConfig);
                    if (!isValid) continue;
                }

                // Add command
                editor.addCommand(item.name, {
                    exec: async (editor) => {
                        await this.executeCommand(editor, item, moduleConfig);
                    }
                });

                // Add menu item
                if (!item.ignore_menu) {
                    menuItems[item.name] = this.createMenuItem(item, groupName);
                }
            }

            // Add menu items to editor
            if (Object.keys(menuItems).length > 0) {
                editor.addMenuItems(menuItems);
                moduleConfig.menuItems = menuItems;
            }
        } catch (err) {
            this.errorTracker.logError(moduleId, 'setupModuleCommands', err);
        }
    }

    async executeCommand(editor, item, moduleConfig) {
        try {
            const params = {
                element: /* this.contextData.element ||  */ editor.getSelection().getStartElement(),
                selection: /* this.contextData.selection || */ editor.getSelection(),
                elementPath: /* this.contextData.elementPath || */ editor.elementPath()
            };

            // Ensure module is loaded
            const moduleId = this.getModuleIdByConfig(moduleConfig);
            let instance = this.loadedInstances.get(moduleId) || window[moduleId];

            if (!instance) {
                // Cancel lazy loading if in progress
                if (this.lazyLoadQueue.has(moduleId)) {
                    clearTimeout(this.lazyLoadQueue.get(moduleId));
                    this.lazyLoadQueue.delete(moduleId);
                }

                // Load module now
                instance = await this.loadModuleInstance(moduleId, moduleConfig);
                window[moduleId] = instance;
            }

            // Execute command
            await moduleConfig.executeCommand(editor, item, moduleConfig, params);

        } catch (err) {
            debug.error(`system-executeCommand-${moduleConfig.name}-${item.name}`);
            this.errorTracker.logError('system', 'executeCommand', err, {
                command: item.name,
                module: moduleConfig.name
            });
        }
    }

    async defaultExecuteCommand(editor, item, moduleConfig, defaultParams = {}) {
        try {
            const moduleId = this.getModuleIdByConfig(moduleConfig);
            const instance = this.loadedInstances.get(moduleId) || window[moduleId];
            if (!instance) throw new Error(`Module ${moduleId} not loaded`);

            if (item.action && typeof instance.show === "function") {
                // Get params safely
                const params = moduleConfig.getParams ?
                    moduleConfig.getParams(item.action, defaultParams) : [];

                // Push the final defaultParams object (your existing behavior)
                params.push(defaultParams);

                // Call `show()` dynamically
                await instance.show(...params);
            }
        } catch (err) {
            this.errorTracker.logError("system", "defaultExecuteCommand", err);
        }
    }
    // ========== UI Events Integration ==========
    // Normalize UI events structure
    normalizeUIEvents(uiEvents) {
        if (!Array.isArray(uiEvents)) return [];

        return uiEvents.map(event => {
            if (typeof event === 'string') {
                // Simple format: "selector"
                return {
                    selector: event,
                    event: 'click',
                    handler: 'handleClick',
                    delegate: true
                };
            } else if (event.selector) {
                // Object format
                return {
                    selector: event.selector,
                    event: event.event || 'click',
                    handler: event.handler || 'handleEvent',
                    delegate: event.delegate !== false,
                    capture: event.capture || false,
                    once: event.once || false,
                    passive: event.passive !== false,
                    ...event
                };
            }
            return null;
        }).filter(Boolean);
    }
    // Add this method to UnifiedModuleSystem class
    setupGlobalEventHandlers() {
        // Process all registered modules' UI events
        for (const [moduleId, config] of this.moduleDefinitions) {
            if (config.uiEvents && config.uiEvents.length > 0) {
                this.bindUIEvents(moduleId, config.uiEvents);
            }
        }

        // Setup mutation observer for dynamic content
        this.setupDynamicContentObserver();
    }

    // Bind UI events for a module
    bindUIEvents(moduleId, uiEvents) {
        uiEvents.forEach(eventConfig => {
            const {
                selector,
                event = 'click',
                handler,
                delegate = true,
                capture = false,
                once = false,
                passive = true
            } = eventConfig;

            if (!selector || !handler) {
                console.warn(`Invalid UI event config for module ${moduleId}:`, eventConfig);
                return;
            }

            // Create wrapped handler with error tracking
            const wrappedHandler = async (e) => {
                try {
                    const targetElement = delegate ? e.target.closest(selector) : e.target;
                    if (!targetElement && delegate) return;

                    // Get module instance if needed
                    const instance = this.loadedInstances.get(moduleId);

                    // Call handler with proper context
                    if (typeof handler === 'string' && instance && instance[handler]) {
                        await instance[handler].call(instance, e, targetElement);
                    } else if (typeof handler === 'function') {
                        await handler.call(instance || this, e, targetElement);
                    }

                    // Track event interaction
                    const stats = this.moduleStats.get(moduleId);
                    if (stats) {
                        stats.uiEventInteractions = (stats.uiEventInteractions || 0) + 1;
                    }

                } catch (error) {
                    this.errorTracker.logError(moduleId, `uiEvent.${event}`, error, {
                        selector,
                        event: e.type
                    });
                }
            };

            // Use event delegation on document level
            if (delegate) {
                document.addEventListener(event, wrappedHandler, {
                    capture,
                    passive
                });

                // Store for cleanup
                this.registeredEventHandlers = this.registeredEventHandlers || [];
                this.registeredEventHandlers.push({
                    moduleId,
                    event,
                    handler: wrappedHandler,
                    capture
                });
            } else {
                // Direct binding for existing elements
                document.querySelectorAll(selector).forEach(element => {
                    element.addEventListener(event, wrappedHandler, {
                        once,
                        passive,
                        capture
                    });
                });
            }
        });
    }

    // Setup observer for dynamic content
    setupDynamicContentObserver() {
        const observer = new MutationObserver((mutations) => {
            // Debounce to avoid multiple calls
            clearTimeout(this.mutationTimeout);
            this.mutationTimeout = setTimeout(() => {
                this.handleDynamicContent(mutations);
            }, 100);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.mutationObserver = observer;
    }

    // Handle dynamic content
    handleDynamicContent(mutations) {
        const addedSelectors = new Set();

        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                // Element node
                if (node.nodeType === 1) {
                    // Check all modules' UI events
                    for (const [moduleId, config] of this.moduleDefinitions) {
                        if (config.uiEvents) {
                            config.uiEvents.forEach(eventConfig => {
                                if (!eventConfig.delegate && node.matches(eventConfig.selector)) {
                                    addedSelectors.add(eventConfig.selector);
                                }
                            });
                        }
                    }
                }
            });
        });

        // Re-bind events for non-delegated selectors
        if (addedSelectors.size > 0) {
            for (const [moduleId, config] of this.moduleDefinitions) {
                if (config.uiEvents) {
                    const nonDelegatedEvents = config.uiEvents.filter(e =>
                        !e.delegate && addedSelectors.has(e.selector)
                    );
                    if (nonDelegatedEvents.length > 0) {
                        this.bindUIEvents(moduleId, nonDelegatedEvents);
                    }
                }
            }
        }
    }

    // Add method to dynamically add UI events
    addUIEvents(moduleId, uiEvents) {
        const config = this.moduleDefinitions.get(moduleId);
        if (!config) {
            console.warn(`Module ${moduleId} not found`);
            return;
        }

        // Add to existing events
        config.uiEvents = config.uiEvents || [];
        config.uiEvents.push(...uiEvents);

        // Bind the new events
        this.bindUIEvents(moduleId, uiEvents);
    }

    // Cleanup method
    cleanup() {
        // Remove event listeners
        if (this.registeredEventHandlers) {
            this.registeredEventHandlers.forEach(({
                event,
                handler,
                capture
            }) => {
                document.removeEventListener(event, handler, capture);
            });
            this.registeredEventHandlers = [];
        }

        // Stop mutation observer
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }

        // Clear timeout
        clearTimeout(this.mutationTimeout);
    }

    // ========== CKEditor Integration ==========
    setupCKEditorIntegration() {
        if (typeof CKEDITOR === 'undefined') return;

        // Check if CKEditor is already initialized
        if (CKEDITOR.status === 'loaded' && Object.keys(CKEDITOR.instances).length > 0) {
            // Setup for existing instances
            Object.values(CKEDITOR.instances).forEach(async (editor) => {
                await this.setupEditorInstance(editor);
            });
        }

        // Setup for future instances
        CKEDITOR.on('instanceReady', async (ev) => {
            await this.setupEditorInstance(ev.editor);
        });
    }

    async setupEditorInstance(editor) {
        try {
            // Skip if already setup
            if (this.editorInstances.has(editor)) return;

            this.editorInstances.add(editor);
            debug.log(`🔄--- setupEditorInstance: ${editor.name} ---🔄`);

            // Setup commands
            await this.setupAllEditorCommands(editor);

            // Setup context menu
            if (editor.contextMenu) {
                editor.contextMenu.addListener((element, selection, elementPath) => {
                    return this.getAllContextMenuItems(element, selection, elementPath, editor);
                });
            }

            // Setup content DOM handler
            editor.on('contentDom', () => {
                const editable = editor.editable();
                if (editable) {
                    this.handleContentDomUpdate(editor, editable);
                }
            });

            // Setup double-click handler
            editor.on('doubleclick', (evt) => {
                this.handleContentDoubleClick(evt, editor);
            });

            // 🔹 Setup selectionChange event (for proactive validation)
            this.setupSelectionChangeHandler(editor);

            // 🔹 Setup afterSetData event (core addition)
            editor.on('afterSetData', () => {
                debug.log(`📄 afterSetData triggered for: ${editor.name}`);
                this.onEditorDataReady(editor);
            });

            // 🔹 Also handle case where data already exists
            if (editor.status === 'ready' && editor.getData()) {
                debug.log(`⚡ editor already has data: triggering onEditorDataReady()`);
                this.onEditorDataReady(editor);
            }

            // 🔹 Ensure DOM setup immediately if already ready
            if (editor.editable()) {
                this.handleContentDomUpdate(editor, editor.editable());
            }

            this.instanceReadyPostCallback(editor);

        } catch (err) {
            this.errorTracker.logError('system', 'setupEditorInstance', err);
        }
    }

    /**
     * Setup selection change listener for module callbacks
     * Routes selectionChange events to the currently active/open dialog for proactive validation
     * Optimized to only notify the most recently opened module instead of all registered modules
     * @param {Object} editor - CKEditor instance
     */
    setupSelectionChangeHandler(editor) {
        try {
            // Use a debounced handler to avoid excessive validation calls during rapid cursor movement
            let debounceTimer = null;
            // 250ms debounce
            const DEBOUNCE_DELAY = 150;

            editor.on('selectionChange', (evt) => {
                try {
                    // Clear pending debounce
                    if (debounceTimer) {
                        clearTimeout(debounceTimer);
                    }

                    // Debounce the selection change handling
                    debounceTimer = setTimeout(() => {
                        const selection = editor.getSelection();
                        const element = selection ? selection.getStartElement() : null;
                        const elementPath = editor.elementPath();

                        // Get all currently open modules (state === 1)
                        const openModules = this.getCurrentlyOpenedModules();

                        if (!openModules || openModules.length === 0) {
                            // No dialogs open - nothing to notify (most common case)
                            // This is an optimization to skip unnecessary work
                            return;
                        }

                        // Notify all open modules that have onSelectionChange
                        // This ensures all visible dialogs update their state on selection change
                        for (const openModule of openModules) {
                            const moduleConfig = this.moduleDefinitions.get(openModule.moduleId);

                            // Check if the module's config has onSelectionChange method
                            if (moduleConfig && typeof moduleConfig.onSelectionChange === 'function') {
                                try {
                                    moduleConfig.onSelectionChange(editor, selection, elementPath);
                                } catch (err) {
                                    this.errorTracker.logError(openModule.moduleId, 'onSelectionChange', err);
                                }
                            }
                        }

                        // Note: We intentionally do NOT also call instance.handleSelectionChange here
                        // because onSelectionChange in module configs (e.g., hyperlink_module/context.js)
                        // already delegates to the loaded instance. Calling both would cause
                        // double-validation and potential state corruption.
                        // See: hyperlink_module/context.js onSelectionChange -> hyperLinkDialog.validateSelection()
                    }, DEBOUNCE_DELAY);
                } catch (err) {
                    this.errorTracker.logError('system', 'selectionChange', err);
                }
            });

            debug.log(`Selection change handler setup for editor: ${editor.name}`);
        } catch (err) {
            this.errorTracker.logError('system', 'setupSelectionChangeHandler', err);
        }
    }

    instanceReadyPostCallback(editor) {
        for (var [moduleId, moduleConfig] of this.moduleDefinitions) {
            try {
                if (moduleConfig.postInstanceReady) {
                    moduleConfig.postInstanceReady(editor);
                }
            } catch (err) {
                if (this.errorTracker && typeof this.errorTracker.logError === "function") {
                    this.errorTracker.logError(moduleId, "instanceReadyPostCallback", err);
                } else {
                    console.error("contextMenuHandler error:", moduleId, err);
                }
            }
        }
    }



    getAllContextMenuItems(element, selection, elementPath, editor) {
        var combinedMenuItems = {};

        // Track how many times IsContextMenu() was called for a value
        var isContextMenuCountMap = {};

        // Update context data
        this.contextData = {
            element: element,
            selection: selection,
            elementPath: elementPath,
            timestamp: Date.now()
        };
        var isLocked = (window.paraLock && window.paraLock._isEnabled) ?
            window.paraLock._isElementLocked(element, {
                check_closest: true,
                alertKey: 'ErrorLockedParaEdit'
            }) :
            false;
        if (isLocked) return isContextMenuCountMap;

        for (var [moduleId, moduleConfig] of this.moduleDefinitions) {
            try {
                var groupName = moduleConfig.group_name || "";
                var subGroupName = moduleConfig.sub_group_name || "";

                // ✅ Use cached result if already checked 3 times
                var mainGroup = false;
                var subGroup = false;

                // --- Group check ---

                if (groupName) {
                    if (!isContextMenuCountMap[groupName]) {
                        isContextMenuCountMap[groupName] = {
                            count: 0,
                            result: false
                        };
                    }
                    if (isContextMenuCountMap[groupName].count < 300) {
                        isContextMenuCountMap[groupName].result = IsContextMenu(groupName);
                        isContextMenuCountMap[groupName].count++;
                    }
                    mainGroup = isContextMenuCountMap[groupName].result;
                }

                // --- Sub-group check ---
                if (subGroupName) {
                    if (!isContextMenuCountMap[subGroupName]) {
                        isContextMenuCountMap[subGroupName] = {
                            count: 0,
                            result: false
                        };
                    }
                    if (isContextMenuCountMap[subGroupName].count < 300) {
                        isContextMenuCountMap[subGroupName].result = IsContextMenu(subGroupName);
                        isContextMenuCountMap[subGroupName].count++;
                    }
                    subGroup = isContextMenuCountMap[subGroupName].result;
                }

                var canProceed = (moduleConfig.SHOW_CONTEXT_GROUP || moduleConfig.SHOW_CONTEXT_SUB_GROUP || mainGroup || subGroup);

                if (canProceed === false) continue;

                if (mainGroup) moduleConfig.SHOW_CONTEXT_GROUP = true;
                if (subGroup) moduleConfig.SHOW_CONTEXT_SUB_GROUP = true;


                var moduleMenuItems = {};
                if (!isLocked && typeof moduleConfig.contextMenuHandler === "function") {
                    moduleMenuItems = moduleConfig.contextMenuHandler(
                        element,
                        selection,
                        elementPath,
                        editor,
                        moduleConfig.SHOW_MENU_ITEMS || {}
                    ) || {};
                }

                Object.assign(combinedMenuItems, moduleMenuItems);
            } catch (err) {
                if (this.errorTracker && typeof this.errorTracker.logError === "function") {
                    this.errorTracker.logError(moduleId, "contextMenuHandler", err);
                } else {
                    console.error("contextMenuHandler error:", moduleId, err);
                }
            }
        }

        return combinedMenuItems;
    }

    onEditorDataReady(editor) {
        try {
            const editable = editor.editable();
            if (!editable) return;

            // 1️ Notify all module definitions
            for (const [moduleId, moduleConfig] of this.moduleDefinitions) {
                if (moduleConfig.onAfterSetData && typeof moduleConfig.onAfterSetData === 'function') {
                    try {
                        moduleConfig.onAfterSetData();
                    } catch (err) {
                        this.errorTracker.logError(moduleId, 'onAfterSetData', err);
                    }
                }
            }

            // 2️ Notify all loaded module instances
            for (const [moduleId, instance] of this.loadedInstances) {
                if (instance && typeof instance.handleAfterSetData === 'function') {
                    try {
                        instance.handleAfterSetData();
                    } catch (err) {
                        this.errorTracker.logError(moduleId, 'handleAfterSetData', err);
                    }
                }
            }

            // 3️ Update context data
            this.contextData = {
                element: null,
                selection: editor.getSelection(),
                elementPath: editor.elementPath(),
                timestamp: Date.now()
            };

            // 4️ Custom DOM event for external listeners
            if (typeof window.CustomEvent !== 'undefined') {
                const event = new CustomEvent('ckeditorAfterSetData', {
                    detail: {
                        editor,
                        editable,
                        handler: this
                    }
                });
                document.dispatchEvent(event);
            }

            debug.log(`📄 afterSetData handled for: ${editor.name}`);

        } catch (err) {
            this.errorTracker.logError('system', 'handleAfterSetData', err);
        }
    }



    // Add the double-click handler method
    handleContentDoubleClick(evt, editor) {
        try {
            const editable = editor.editable();
            if (!editable) return;

            // Update context data
            this.contextData = {
                element: evt.data.element,
                selection: editor.getSelection(),
                elementPath: editor.elementPath(),
                timestamp: Date.now()
            };

            // Notify all modules that have double-click handlers
            for (const [moduleId, moduleConfig] of this.moduleDefinitions) {
                if (moduleConfig.onDoubleClick && typeof moduleConfig.onDoubleClick === 'function') {
                    try {
                        moduleConfig.onDoubleClick(evt, editor, editable);
                    } catch (err) {
                        this.errorTracker.logError(moduleId, 'onDoubleClick', err);
                    }
                }
            }

            // Check if any module instance has handleContentdblClick method
            for (const [moduleId, instance] of this.loadedInstances) {
                if (instance && typeof instance.handleContentdblClick === 'function') {
                    try {
                        instance.handleContentdblClick(evt, editor, editable);
                    } catch (err) {
                        this.errorTracker.logError(moduleId, 'handleContentdblClick', err);
                    }
                }
            }

            // Dispatch custom event
            if (typeof window.CustomEvent !== 'undefined') {
                const event = new CustomEvent('ckeditorDoubleClick', {
                    detail: {
                        evt: evt.data,
                        editor,
                        editable,
                        handler: this
                    }
                });
                document.dispatchEvent(event);
            }
        } catch (err) {
            this.errorTracker.logError('system', 'handleContentDoubleClick', err);
        }
    }

    handleContentDomUpdate(editor, editable) {
        try {
            // Notify all modules
            for (const [moduleId, moduleConfig] of this.moduleDefinitions) {
                if (moduleConfig.onContentDomUpdate && typeof moduleConfig.onContentDomUpdate === 'function') {
                    try {
                        moduleConfig.onContentDomUpdate(editor, editable);
                    } catch (err) {
                        this.errorTracker.logError(moduleId, 'onContentDomUpdate', err);
                    }
                }
            }

            // Reset context data
            this.contextData = {
                element: null,
                selection: null,
                elementPath: null,
                timestamp: Date.now()
            };

            // Dispatch event
            if (typeof window.CustomEvent !== 'undefined') {
                const event = new CustomEvent('ckeditorContentDomUpdated', {
                    detail: {
                        editor,
                        editable,
                        handler: this
                    }
                });
                document.dispatchEvent(event);
            }
        } catch (err) {
            this.errorTracker.logError('system', 'handleContentDomUpdate', err);
        }
    }
    // ========== Template Loading ==========
    async loadTemplateForInstance(instance, templatePath) {
        try {
            let templateHTML = null;

            // 1. Try ModuleTemplateStore first (primary source)
            if (typeof ModuleTemplateStore !== 'undefined') {
                const bundledTemplate = await ModuleTemplateStore.getTemplate(templatePath);
                if (bundledTemplate) {
                    templateHTML = bundledTemplate;
                    console.log(`Template loaded from bundle: ${templatePath}`);
                }
            }

            // 2. Fallback to individual fetch if not in bundle
            if (!templateHTML) {
                const timestamp = new Date().getTime();
                const ROOT = DOMAIN_ROOT + (IS_LOCAL_HOST ? "dist/" : "");
                const normalizedPath = templatePath.replace(/^\.\//, '');
                const templateUrl = `${ROOT}assets/${iVersion}/modules/${normalizedPath}?_=${timestamp}`;

                console.log(`⚠️ Template not in bundle, fetching: ${templateUrl}`);

                const response = await fetch(templateUrl);
                if (!response.ok) {
                    throw new Error(`Failed to load template: ${response.status}, url: ${templateUrl}`);
                }

                templateHTML = await response.text();
            }

            instance._template = templateHTML;

            if (!instance.Model_DOM) {
                instance.Model_DOM = document.getElementById('ModelDialogAppend');
            }

            // If instance has a Model_DOM, append the template
            if (instance.Model_DOM) {
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = templateHTML;
                const dialogElement = tempDiv.querySelector(".mDialog");

                if (dialogElement) {
                    instance.Model_DOM.insertAdjacentHTML("beforeend", dialogElement.outerHTML);
                }
            }

            return true;

        } catch (error) {
            console.error(`Template load failed for ${templatePath}:`, error);
            this.errorTracker.logError('system', 'loadTemplateForInstance', error, {
                templatePath,
                bundleUrl: typeof iVersion !== 'undefined' ?
                    `${DOMAIN_ROOT}assets/${iVersion}/modules/templates.html` : 'N/A',
                fallbackUrl: `${DOMAIN_ROOT}assets/${iVersion}/modules/${templatePath}`
            });
            throw error;
        }
    }
    // ========== Module Tracking ==========

    setupMethodsForModule(moduleInstance, moduleName) {
        const stats = this.moduleStats.get(moduleName);
        const prototype = Object.getPrototypeOf(moduleInstance);
        const config = this.moduleDefinitions.get(moduleName);
        const shouldWrap = config && config.wrapping !== false;

        // Define methods to skip
        const skipMethods = [
            'constructor', 'init', 'trackError', 'logError',
            'handleButtonClick', 'handleInputInteraction', 'show', 'closeDialog', 'hide', 'close'
        ];

        const debouncePattern = /debounce/i;
        const debounceList = moduleInstance.debounceList || [];

        // Get all method names
        const methodNames = Object.getOwnPropertyNames(prototype).filter(name => {
            const method = prototype[name];
            return name !== 'constructor' &&
                typeof method === 'function' &&
                !debouncePattern.test(name) &&
                !debounceList.includes(name);
        });

        // Wrap each method
        methodNames.forEach(methodName => {
            const originalMethod = prototype[methodName];

            if (shouldWrap && !skipMethods.includes(methodName)) {
                // Wrap with error tracking
                moduleInstance[methodName] = this.wrapModuleMethodsWithErrorTracking(
                    moduleInstance, methodName, originalMethod, moduleName
                );
            } else {
                // Just bind the method
                moduleInstance[methodName] = originalMethod.bind(moduleInstance);
            }

            Object.defineProperty(moduleInstance, methodName, {
                enumerable: true,
                configurable: true,
                writable: true
            });
        });

        // Setup tracking for show/close methods
        const originalShow = moduleInstance.show;
        const originalClose = moduleInstance.closeDialog || moduleInstance.hide || moduleInstance.close;

        if (originalShow) {
            moduleInstance.show = (...args) => {
                this.recordModuleOpen(moduleName);
                return originalShow.apply(moduleInstance, args);
            };
        }

        if (originalClose) {
            const closeMethodName = moduleInstance.closeDialog ? 'closeDialog' :
                moduleInstance.hide ? 'hide' : 'close';

            moduleInstance[closeMethodName] = (...args) => {
                this.recordModuleClose(moduleName);
                return originalClose.apply(moduleInstance, args);
            };
        }

        // Setup UI tracking
        this.setupButtonTracking(moduleInstance, moduleName);
        this.setupInputTracking(moduleInstance, moduleName);
    }

    setupModuleTracking(instance, moduleId) {
        const stats = this.moduleStats.get(moduleId);
        const originalShow = instance.show;
        const originalClose = instance.closeDialog || instance.hide || instance.close;

        // Wrap show method
        if (originalShow) {
            instance.show = (...args) => {
                this.recordModuleOpen(moduleId);
                return originalShow.apply(instance, args);
            };
        }

        // Wrap close methods
        if (originalClose) {
            const closeMethodName = instance.closeDialog ? 'closeDialog' :
                instance.hide ? 'hide' : 'close';

            instance[closeMethodName] = (...args) => {
                this.recordModuleClose(moduleId);
                return originalClose.apply(instance, args);
            };
        }

        // Track button clicks if instance has button handlers
        this.setupButtonTracking(instance, moduleId);

        // Track input interactions
        this.setupInputTracking(instance, moduleId);
    }

    recordModuleOpen(moduleId) {
        const stats = this.moduleStats.get(moduleId);
        if (!stats) return;

        stats.openCount++;
        stats.lastOpened = new Date();

        // Add to history
        stats.history.push({
            action: 'open',
            timestamp: stats.lastOpened,
            count: stats.openCount
        });

        // Keep history size manageable
        if (stats.history.length > 100) {
            stats.history = stats.history.slice(-50);
        }
        if (!["TOOLTIP_MODULE"].includes(moduleId)) {
            debug.log(`Module ${moduleId} opened - Count: ${stats.openCount}`);
        }
    }

    recordModuleClose(moduleId) {
        const stats = this.moduleStats.get(moduleId);
        if (!stats || !stats.lastOpened) return;

        stats.closeCount++;
        stats.lastClosed = new Date();

        // Calculate open duration
        const openDuration = stats.lastClosed - stats.lastOpened;
        stats.totalOpenTime += openDuration;
        stats.avgOpenTime = stats.totalOpenTime / stats.closeCount;

        // Add to history
        stats.history.push({
            action: 'close',
            timestamp: stats.lastClosed,
            duration: openDuration,
            count: stats.closeCount
        });

        if (moduleId == "TOOLTIP_MODULE") {

        } else debug.log(`Module ${moduleId} closed - Duration: ${openDuration}ms`);
    }

    setupButtonTracking(instance, moduleId) {
        if (!instance.Panel) return;

        // Use event delegation for better performance
        instance.Panel.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (button) {
                const stats = this.moduleStats.get(moduleId);
                const buttonId = button.id || button.className || 'unnamed';
                stats.buttonClicks[buttonId] = (stats.buttonClicks[buttonId] || 0) + 1;
            }
        });
    }

    setupInputTracking(instance, moduleId) {
        if (!instance.Panel) return;

        // Track input interactions
        instance.Panel.addEventListener('input', (event) => {
            if (event.target.matches('input, textarea, select')) {
                const stats = this.moduleStats.get(moduleId);
                stats.inputInteractions++;
            }
        });
    }
    // ========== Module Stats API ==========
    getModuleStats(moduleId) {
        if (moduleId) {
            return this.moduleStats.get(moduleId) || null;
        }

        // Return all stats
        const allStats = {};
        for (const [id, stats] of this.moduleStats) {
            allStats[id] = {
                ...stats
            };
        }
        return allStats;
    }

    getModuleUsageReport(moduleId) {
        const stats = this.moduleStats.get(moduleId);
        if (!stats) return null;

        return {
            moduleId,
            usage: {
                totalOpens: stats.openCount,
                totalCloses: stats.closeCount,
                currentlyOpen: stats.lastOpened > stats.lastClosed,
                avgOpenTime: Math.round(stats.avgOpenTime / 1000) + 's',
                totalTime: Math.round(stats.totalOpenTime / 1000 / 60) + 'min'
            },
            interactions: {
                buttonClicks: stats.buttonClicks,
                totalButtonClicks: Object.values(stats.buttonClicks).reduce((a, b) => a + b, 0),
                inputInteractions: stats.inputInteractions
            },
            timeline: {
                lastOpened: stats.lastOpened,
                lastClosed: stats.lastClosed,
                recentHistory: stats.history.slice(-10)
            }
        };
    }

    exportModuleStats(format = 'json') {
        const allStats = this.getModuleStats();

        if (format === 'csv') {
            // Convert to CSV format
            const headers = ['Module', 'Opens', 'Closes', 'Avg Time (s)', 'Total Time (min)', 'Button Clicks', 'Input Interactions'];
            const rows = Object.entries(allStats).map(([moduleId, stats]) => [
                moduleId,
                stats.openCount,
                stats.closeCount,
                Math.round(stats.avgOpenTime / 1000),
                Math.round(stats.totalOpenTime / 1000 / 60),
                Object.values(stats.buttonClicks).reduce((a, b) => a + b, 0),
                stats.inputInteractions
            ]);

            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }

        return JSON.stringify(allStats, null, 2);
    }


    // ========== Error Handling & Reporting ==========
    setupInstanceErrorTracking(instance, moduleId) {
        instance.trackError = (functionName, error, context = {}) => {
            return this.errorTracker.logError(moduleId, functionName, error, {
                ...context,
                timestamp: new Date().toISOString()
            });
        };
    }
    wrapModuleMethodsWithErrorTracking(moduleInstance, methodName, originalMethod, moduleName) {
        const stats = this.moduleStats.get(moduleName);

        return function wrappedMethod(...args) {
            const startTime = performance.now();

            try {
                const result = originalMethod.apply(moduleInstance, args);

                // Handle promises
                if (result && typeof result.then === 'function') {
                    return result
                        .then(value => {
                            if (IS_LOCAL_HOST) {
                                const duration = performance.now() - startTime;
                                if (duration > 1000) {
                                    console.warn(`Slow async method: ${moduleName}.${methodName} took ${duration}ms`);
                                }
                            }
                            return value;
                        })
                        .catch(error => {
                            if (stats) stats.errors++;

                            this.errorTracker.logError(moduleName, methodName, error, {
                                arguments: this.sanitizeArgs(args),
                                executionTime: performance.now() - startTime,
                                moduleState: this.getModuleState(moduleInstance),
                                timestamp: new Date().toISOString(),
                                methodType: 'async'
                            });

                            throw error;
                        });
                }

                if (IS_LOCAL_HOST) {
                    const duration = performance.now() - startTime;
                    if (duration > 500) {
                        console.warn(`Slow sync method: ${moduleName}.${methodName} took ${duration}ms`);
                    }
                }

                return result;

            } catch (error) {
                if (stats) stats.errors++;

                this.errorTracker.logError(moduleName, methodName, error, {
                    arguments: this.sanitizeArgs(args),
                    executionTime: performance.now() - startTime,
                    moduleState: this.getModuleState(moduleInstance),
                    timestamp: new Date().toISOString(),
                    methodType: 'sync'
                });

                throw error;
            }
        }.bind(this);
    }
    setupErrorReporting() {
        // Auto-sync errors every 5 minutes
        setInterval(() => {
            this.errorTracker.syncWithServer()
                .catch(error => console.error('Error sync failed:', error));
        }, 5 * 60 * 1000);

        // Setup send error mail function
        window.sendErrorMail = async (from = "Unknown") => {
            await this.sendErrorMail(from);
        };
    }
    transferUserActivityData(evt) {
        try {
            const recorder = this.recordAction;
            if (recorder && typeof recorder.syncUserActionHistory === "function") {
                recorder.syncUserActionHistory({
                    keepalive: true
                });
            }

        } catch (err) {

        }
    }
    setupSyncOnUserActivityData() {
        const syncUserActivityData = () => this.transferUserActivityData();
        // pagehide covers tab close, navigation, mobile backgrounding
        window.addEventListener('pagehide', syncUserActivityData);
        // beforeunload covers logout button / explicit page leave
        window.addEventListener('beforeunload', syncUserActivityData);
    }



    setupGlobalErrorTracking() {
        this.errorTracker.MAX_STORED_ERRORS = 1000;
        const docId = new URLSearchParams(window.location.search).get('docid');

        this.errorTracker._globalPersistKey = docId ? `global_error_tracking_${docId}` : 'module_registry_errors';

        // Sync errors every 5 minutes
        setInterval(() => {
            this.errorTracker.syncWithServer()
                .catch(error => console.error('Error sync failed:', error));
        }, 5 * 60 * 1000);
    }

    async sendErrorMail(from = "Unknown") {
        try {
            const errorReport = this.errorTracker.renderErrorReportTable({});

            if (!errorReport) {
                console.log('No errors to report');
                return;
            }

            window.OBJ_SEN_REC_ID = GET_SENDER_RECEIVER_ID('Error_Mail');
            const subject = (DOC_INFO.get("IDENTIFIER") || SHARED_KEY.identifier || DOC_ID)
                .concat(" - ", from);

            const mailObj = {
                tbl: "emaildraft",
                emailfrom: OBJ_SEN_REC_ID.from,
                emailto: OBJ_SEN_REC_ID.to,
                emailBCC: OBJ_SEN_REC_ID.bcc,
                emailSubject: subject,
                find: {
                    id: "610a4cd05e311ebaf978ef78"
                },
                docid: DOC_ID,
                emailMessage: errorReport
            };

            const apiService = new FetchService();
            const result = await apiService.makeRequest("genericsendemail", mailObj, {
                isPayloadLogic: true
            });

            if (result && result.r == 1) {
                console.log('Error mail sent successfully');
                this.errorTracker.clearErrors();
            } else {
                console.error('Failed to send error mail:', result);
            }
        } catch (err) {
            this.errorTracker.logError('system', 'sendErrorMail', err);
        }
    }
    sanitizeArgs(args) {
        try {
            return args.map(arg => {
                if (arg === null || arg === undefined) return arg;
                if (typeof arg === 'function') return '[Function]';
                if (arg instanceof HTMLElement) return `[HTMLElement: ${arg.tagName}]`;
                if (arg instanceof Event) return `[Event: ${arg.type}]`;
                if (typeof arg === 'object') {
                    const str = JSON.stringify(arg, null, 2);
                    return str.length > 500 ? '[Large Object]' : arg;
                }
                return arg;
            });
        } catch (e) {
            return '[Unable to sanitize arguments]';
        }
    }

    getModuleState(instance) {
        try {
            if (typeof instance.getState === 'function') {
                return instance.getState();
            }

            return {
                state: instance.state || 0,
                initiated: instance.initiated || false,
                fullyLoaded: instance.FullyLoaded || false,
                hasPanel: !!instance.Panel
            };
        } catch (e) {
            return {
                error: 'Unable to get module state'
            };
        }
    }

    // ========== Utility Methods ==========
    evaluateVisibilityFromConfig(id, options = {}) {
        const RETURN = {
            "true": true,
            "false": false
        };
        const {
            entry,
            check_co_role,
            journal_key,
            submenu
        } = options;

        try {
            let tempConfig = this.configRoot && this.configRoot.querySelector(`[name="${id}"]`);
            let usedKey = null;

            if (!tempConfig && !journal_key) return false;

            // Check journal config
            if (!window.SHORT_II_TITLE && window.SHARED_KEY && window.SHARED_KEY.titleinfo && window.SHARED_KEY.titleinfo.cover) {
                window.SHORT_II_TITLE = window.SHARED_KEY.titleinfo.cover;
            }

            const journalConfig = this.jConfigRoot || this.configRoot && this.configRoot.querySelector(`[short="${window.SHORT_II_TITLE}"]`);

            if (journalConfig && journal_key) {
                tempConfig = this.jConfigRoot && this.jConfigRoot.querySelector(`[name="${id}"],[${id}]`);
                usedKey = tempConfig && tempConfig.hasAttribute("name") ? "show" : id;
            } else if (tempConfig) {
                const sub_Menu = tempConfig.querySelector("sub-journal");
                if (sub_Menu && journalConfig && journalConfig.getAttribute("sub-journal") === sub_Menu && sub_Menu.getAttribute("type")) {
                    tempConfig = sub_Menu;
                }
            }

            if (entry) return tempConfig || {};

            // Check domain restrictions
            if (tempConfig && tempConfig.hasAttribute('disable_domain')) {
                const domainList = tempConfig.getAttribute('disable_domain').split(',');
                if (domainList.some(domain => window.DOMAIN_ROOT && window.DOMAIN_ROOT.match(domain))) {
                    return false;
                }
            }

            // Check role visibility
            const roleKey = tempConfig && tempConfig.hasAttribute(window.USER_INFO && window.USER_INFO.SELECTOR_SHOW_HIDE) ?
                window.USER_INFO.SELECTOR_SHOW_HIDE : 'show';

            usedKey = usedKey || (check_co_role && tempConfig && tempConfig.hasAttribute('showForCoRole') ?
                'showForCoRole' : roleKey);

            if (tempConfig && tempConfig.hasAttribute('show')) {
                const attrVal = tempConfig.getAttribute(usedKey);
                return window.IS_TEST_ENV ? true : RETURN[attrVal];
            }

            return window.IS_TEST_ENV ? true : false;

        } catch (err) {
            this.errorTracker.logError('system', 'evaluateVisibilityFromConfig', err);
            return false;
        }
    }

    async validateCommandVisibility(item, moduleConfig) {
        const {
            client_key,
            journal_key,
            callback
        } = item.canShowValidation;

        if (!client_key) {
            console.warn(`canShowValidation missing key for command: ${item.name}`);
            return true;
        }

        if (!(client_key in moduleConfig.SHOW_MENU_ITEMS)) {
            if (callback && typeof callback === 'function') {
                try {
                    moduleConfig.SHOW_MENU_ITEMS[client_key] = await callback();
                } catch (err) {
                    this.errorTracker.logError('system', 'canShowValidation.callback', err);
                    moduleConfig.SHOW_MENU_ITEMS[client_key] = false;
                }
            } else {
                const isClientValid = this.evaluateVisibilityFromConfig(client_key) || false;
                const isJournalValid = this.evaluateVisibilityFromConfig(journal_key, {
                    journal_key
                }) || false;
                moduleConfig.SHOW_MENU_ITEMS[client_key] = isClientValid || (!isClientValid && isJournalValid);
            }
        }

        return moduleConfig.SHOW_MENU_ITEMS[client_key];
    }

    createMenuItem(item, groupName) {
        return {
            label: typeof item.label === 'function' ? item.label() : item.label,
            icon: item.icon,
            command: item.name,
            group: groupName,
            order: item.order || 100,
            ...(item.getItems === true && item.getItemsCallback ? {
                getItems: item.getItemsCallback
            } : {})
        };
    }

    updateConfig() {
        if (this.configRoot && this.jConfigRoot) return;

        let attempts = 0;
        const maxAttempts = 50;

        const intervalId = setInterval(() => {
            const isIConfigReady = typeof I_CONFIG !== 'undefined' && I_CONFIG !== null;
            const isJConfigReady = typeof J_CONFIG !== 'undefined' && J_CONFIG !== null;

            if (isIConfigReady && isJConfigReady) {
                this.configRoot = I_CONFIG;
                this.jConfigRoot = J_CONFIG;
                clearInterval(intervalId);
                console.log('Config loaded successfully');
            } else if (++attempts >= maxAttempts) {
                clearInterval(intervalId);
                console.warn('Config loading timeout');
            }
        }, 500);
    }

    getModuleIdByConfig(targetConfig) {
        for (const [moduleId, moduleConfig] of this.moduleDefinitions) {
            if (moduleConfig === targetConfig) {
                return moduleId;
            }
        }
        return null;
    }

    // ========== Public API ==========
    async getModule(moduleId, options = {}) {
        const {
            throwOnError = false,
                fallback = null,
                autoRegister = null
        } = options;

        try {
            // Check if already loaded
            const instance = this.loadedInstances.get(moduleId);
            if (instance) return instance;

            // Check if registered
            const config = this.moduleDefinitions.get(moduleId);
            if (!config) {
                // If autoRegister config is provided, register the module first
                if (autoRegister) {
                    await this.registerModule(moduleId, autoRegister);
                    return await this.loadModuleInstance(moduleId, this.moduleDefinitions.get(moduleId));
                }

                // Log warning instead of throwing error
                console.warn(`Module ${moduleId} not registered`);

                if (throwOnError) {
                    throw new Error(`Module ${moduleId} not registered`);
                }

                return fallback;
            }

            return await this.loadModuleInstance(moduleId, config);
        } catch (error) {
            this.errorTracker.logError('system', 'getModule', error, {
                moduleId
            });

            if (throwOnError) {
                throw error;
            }

            console.warn(`Failed to get module ${moduleId}:`, error.message);
            return fallback;
        }
    }

    // Add a safe getter method
    async getModuleSafe(moduleId, fallback = null) {
        return await this.getModule(moduleId, {
            throwOnError: false,
            fallback
        });
    }

    // Add a method to check if module exists before getting
    hasModule(moduleId) {
        return this.moduleDefinitions.has(moduleId) || this.loadedInstances.has(moduleId);
    }

    // Add a method to wait for module registration
    async waitForModule(moduleId, timeout = 10000) {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkModule = async () => {
                // Check if module is available
                if (this.hasModule(moduleId)) {
                    try {
                        const module = await this.getModule(moduleId);
                        resolve(module);
                        return;
                    } catch (error) {
                        // Continue waiting if loading fails
                    }
                }

                // Check timeout
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for module ${moduleId}`));
                    return;
                }

                // Check again after 100ms
                setTimeout(checkModule, 100);
            };

            checkModule();
        });
    }

    // Add batch module getter
    async getModules(moduleIds, options = {}) {
        const results = {};
        const errors = {};

        for (const moduleId of moduleIds) {
            try {
                results[moduleId] = await this.getModule(moduleId, options);
            } catch (error) {
                errors[moduleId] = error;
                results[moduleId] = options.fallback || null;
            }
        }

        return {
            results,
            errors
        };
    }

    isModuleLoaded(moduleId) {
        return this.loadedInstances.has(moduleId);
    }

    getLoadedModules() {
        const modules = {};
        for (const [id, instance] of this.loadedInstances) {
            modules[id] = {
                loaded: true,
                instance: instance
            };
        }
        return modules;
    }

    getModuleStatus(moduleId) {
        const config = this.moduleDefinitions.get(moduleId);
        const instance = this.loadedInstances.get(moduleId) || window[moduleId];
        const stats = this.moduleStats.get(moduleId);

        return {
            registered: !!config,
            loaded: !!instance,
            type: config && config.type,
            inLazyQueue: this.lazyLoadQueue.has(moduleId),
            hasCommands: config && config.commands && config.commands.length > 0,
            hasUIEvents: config && config.uiEvents && config.uiEvents.length > 0,
            wrapping: config && config.wrapping !== false,
            stats: stats ? {
                opens: stats.openCount,
                errors: stats.errors,
                avgOpenTime: Math.round(stats.avgOpenTime / 1000) + 's'
            } : null
        };
    }

    async forceLoadModule(moduleId) {
        const config = this.moduleDefinitions.get(moduleId);
        if (!config) {
            throw new Error(`Module ${moduleId} not found`);
        }

        // Cancel lazy loading if in progress
        if (this.lazyLoadQueue.has(moduleId)) {
            clearTimeout(this.lazyLoadQueue.get(moduleId));
            this.lazyLoadQueue.delete(moduleId);
        }

        return await this.loadModuleInstance(moduleId, config);
    }

    destroy() {
        // Clear lazy load queue
        for (const [moduleId, timeoutId] of this.lazyLoadQueue) {
            clearTimeout(timeoutId);
        }
        this.lazyLoadQueue.clear();

        // Clear all maps
        this.modules.clear();
        this.moduleDefinitions.clear();
        this.loadedInstances.clear();
        this.contextMenuRegistry.clear();
        this.editorInstances.clear();

        // Reset context data
        this.contextData = {
            element: null,
            selection: null,
            elementPath: null,
            timestamp: null
        };
    }

    // Get module info without loading
    getModuleInfo(moduleId) {
        const config = this.moduleDefinitions.get(moduleId);
        const instance = this.loadedInstances.get(moduleId);
        const stats = this.moduleStats.get(moduleId);

        if (!config && !instance) {
            return null;
        }

        return {
            id: moduleId,
            registered: !!config,
            loaded: !!instance,
            type: config && config.type,
            inLazyQueue: this.lazyLoadQueue.has(moduleId),
            stats: stats ? {
                opens: stats.openCount,
                errors: stats.errors,
                avgOpenTime: Math.round(stats.avgOpenTime / 1000) + 's'
            } : null
        };
    }

    // List all available modules
    listModules() {
        const modules = [];

        // Add registered modules
        for (const [moduleId, config] of this.moduleDefinitions) {
            modules.push({
                id: moduleId,
                status: 'registered',
                type: config.type,
                loaded: this.loadedInstances.has(moduleId)
            });
        }

        // Add loaded but not registered modules (edge case)
        for (const [moduleId, instance] of this.loadedInstances) {
            if (!this.moduleDefinitions.has(moduleId)) {
                modules.push({
                    id: moduleId,
                    status: 'loaded-only',
                    type: 'unknown',
                    loaded: true
                });
            }
        }

        return modules;
    }
    // Get all currently opened modules
    getCurrentlyOpenedModules() {
        const openModules = [];

        for (const [moduleId, instance] of this.loadedInstances) {
            if (instance && this.isModuleOpen(instance)) {
                const stats = this.moduleStats.get(moduleId);
                const config = this.moduleDefinitions.get(moduleId);

                openModules.push({
                    moduleId,
                    moduleName: config && config.name || moduleId,
                    instance,
                    openedAt: stats && stats.lastOpened,
                    openDuration: stats && stats.lastOpened ? Date.now() - stats.lastOpened : 0,
                    panel: instance.Panel,
                    state: instance.state,
                    stats: {
                        totalOpens: stats && stats.openCount || 0,
                        avgOpenTime: stats && stats.avgOpenTime || 0
                    }
                });
            }
        }

        return openModules;
    }
    // Check if a module is currently open
    isModuleOpen(instance) {
        // Check various indicators of an open module
        if (instance.state === 1) return true;
        if (instance.Panel && !instance.Panel.classList.contains('ds-none') && !instance.Panel.classList.contains('hide')) return true;
        if (instance.isOpen && typeof instance.isOpen === 'function') return instance.isOpen();

        return false;
    }

    // Get the most recently opened module
    getMostRecentlyOpenedModule() {
        const openModules = this.getCurrentlyOpenedModules();

        if (openModules.length === 0) return null;

        // Sort by opened time and return the most recent
        return openModules.sort((a, b) => {
            const timeA = a.openedAt ? new Date(a.openedAt).getTime() : 0;
            const timeB = b.openedAt ? new Date(b.openedAt).getTime() : 0;
            return timeB - timeA;
        })[0];
    }
    // Check if any module is open
    hasOpenModules() {
        return this.getCurrentlyOpenedModules().length > 0;
    }

    // Add to UnifiedModuleSystem class
    getOpenModules() {
        const openModules = [];

        for (const [moduleId, instance] of this.loadedInstances) {
            if (instance && (instance.state === 1 ||
                    (
                        instance.Panel && (!['ds-none', 'hide'].some(c => instance.Panel.classList.contains(c)))
                    ))) {
                openModules.push({
                    moduleId,
                    instance
                });
            }
        }

        return openModules;
    }

    // Get single open module instance
    getOpenModule() {
        const openModules = this.getOpenModules();
        return openModules.length > 0 ? openModules[0].instance : null;
    }

    // Close any open module
    closeOpenModule(e) {
        const openModule = this.getOpenModule();
        if (openModule) {
            if (typeof openModule.closeDialog === 'function') {
                openModule.closeDialog(e);
            } else if (typeof openModule.hide === 'function') {
                openModule.hide(e);
            } else if (openModule.Panel) {
                openModule.Panel.classList.add('ds-none');
                openModule.state = 0;
            }
        }
    }
}

/**
 ** window.getOpenModule = () => unifiedModuleSystem.getOpenModule();
 ** window.closeOpenModule = () => unifiedModuleSystem.closeOpenModule();
 */

/* 
// Helper function to migrate existing modules
async function migrateExistingModules() {
    // Example migration for your existing modules
    const modules = [
        {
            id: 'MultiRefModule',
            config: {
                name: 'MultiRefModule',
                type: 'lazy',
                path: './ref_form/index.js',
                templatePath: './ref_form/template.html',
                contextMenu: true,
                commands: [],
                group_name: 'ref_actions',
                groupOrder: 100
            }
        },
        // Add more modules as needed
    ];

    for (const { id, config } of modules) {
        await unifiedModuleSystem.registerModule(id, config);
    }
}

// If MultiRefModule is already instantiated
const multiRefInstance = new MultiRefModule("MultiRefModule", "ref_form");

await unifiedModuleSystem.registerModule('MultiRefModule', {
    name: 'MultiRefModule',
    type: 'lazy',
    path: '',
    // Pass the instance directly
    moduleClass: multiRefInstance,
    templatePath: './ref_form/template.html',
    contextMenu: true,
    commands: [{
        name: 'MULTI_REF_FORM_QRY',
        ignore_menu: true,
        action: 'query',
        label: 'Reference',
        icon: '../assets/images/svg/ContextMenu/Search.svg',
        order: 200
    }],
    group_name: 'ReferenceGroup',
    groupOrder: 200
});

// Or if MultiRefModule is a class
await unifiedModuleSystem.registerModule('MultiRefModule', {
    name: 'MultiRefModule',
    type: 'lazy',
    path: '',
    // Pass the class constructor
    moduleClass: MultiRefModule,
    templatePath: './ref_form/template.html',
    contextMenu: true,
    commands: [{
        name: 'MULTI_REF_FORM_QRY',
        ignore_menu: true,
        action: 'query',
        label: 'Reference',
        icon: '../assets/images/svg/ContextMenu/Search.svg',
        order: 200
    }],
    group_name: 'ReferenceGroup',
    groupOrder: 200

     // Define UI events
    uiEvents: [
        // Simple format
        // Defaults to click event
        '[data-id="replydiv"]',
        
        // Detailed format
        {
            selector: '[data-id="replydiv"], [data-id="reply"]',
            event: 'click',
            // Method name in module
            handler: 'handleReplyClick',
            // Use event delegation (default)
            delegate: true
        },
        {
            selector: '#TOC_PANEL [data-action]',
            event: 'click',
            handler: async (e, element) => {
                const action = element.dataset.action;
                console.log('TOC action:', action);
            }
        },
        {
            selector: '.query-item',
            event: 'dblclick',
            handler: 'handleQueryDoubleClick'
        },
        {
            selector: 'input[data-module="QueryModule"]',
            event: 'change',
            handler: 'handleInputChange',
            // Direct binding
            delegate: false
        },
        {
            selector: '.drag-handle',
            event: 'mousedown',
            handler: 'startDrag',
            // For preventDefault
            passive: false
        }
    ]
});

// Module class implementation
class QueryModule extends BaseModule {
    async handleReplyClick(event, element) {
        event.preventDefault();
        
        const queryId = element.closest('[data-query-id]')?.dataset.queryId;
        console.log('Reply clicked for query:', queryId);
        
        // Your reply logic here
    }
    
    handleQueryDoubleClick(event, element) {
        console.log('Query double-clicked:', element);
    }
    
    handleInputChange(event, element) {
        console.log('Input changed:', element.value);
    }
    
    startDrag(event, element) {
        event.preventDefault();
        // Drag logic
    }
}

// Add events dynamically
unifiedModuleSystem.addUIEvents('QueryModule', [
    {
        selector: '[data-new-action]',
        event: 'click',
        handler: 'handleNewAction'
    }
]);

// For inline handlers in config
await unifiedModuleSystem.registerModule('UtilityModule', {
    name: 'UtilityModule',
    type: 'lazy',
    
    uiEvents: [
        {
            selector: '[data-tooltip]',
            event: 'mouseenter',
            handler: (e, el) => {
                const tooltip = el.dataset.tooltip;
                // Show tooltip
            }
        },
        {
            selector: '[data-tooltip]',
            event: 'mouseleave',
            handler: (e, el) => {
                // Hide tooltip
            }
        }
    ]
});

 */


// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    // await migrateExistingModules();
    // Initialize the unified system
    const unifiedModuleSystem = new UnifiedModuleSystem();

    // Export for global use
    window.UnifiedModuleSystem = unifiedModuleSystem;
    window.moduleSystem = unifiedModuleSystem;
    // List of modules to ensure globally
    const requiredModules = ['GuidedTour', 'CITATION_POPUP', 'TOOLTIP_MODULE'];
    if (IS_EDITOR_PAGE) {
        await moduleSystem.registerModule('GuidedTour', {
            name: 'GuidedTour',
            type: 'onthefly',
            path: './guide_tour/index.js',
            templatePath: '',
            contextMenu: false,
            commands: []
        });
    }
    if (IS_TRACK_VIEW) {
        const idx = requiredModules.indexOf('GuidedTour');
        if (idx !== -1) {
            requiredModules.splice(idx, 1);
        }
    }
    for (const mod of requiredModules) {
        if (!window[mod]) {
            window[mod] = await moduleSystem.getModule(mod);
        }
    }
});

/* 

// Get currently open module instance
const openModule = getOpenModule();
if (openModule) {
    console.log('Open module:', openModule._name);
}

// Close it
closeOpenModule();


// Add these methods to UnifiedModuleSystem class

// Get all currently opened modules
getCurrentlyOpenedModules() {
    const openModules = [];
    
    for (const [moduleId, instance] of this.loadedInstances) {
        if (instance && this.isModuleOpen(instance)) {
            const stats = this.moduleStats.get(moduleId);
            const config = this.moduleDefinitions.get(moduleId);
            
            openModules.push({
                moduleId,
                moduleName: config?.name || moduleId,
                instance,
                openedAt: stats?.lastOpened,
                openDuration: stats?.lastOpened ? Date.now() - stats.lastOpened : 0,
                panel: instance.Panel,
                state: instance.state,
                stats: {
                    totalOpens: stats?.openCount || 0,
                    avgOpenTime: stats?.avgOpenTime || 0
                }
            });
        }
    }
    
    return openModules;
}

// Check if a module is currently open
isModuleOpen(instance) {
    // Check various indicators of an open module
    if (instance.state === 1) return true;
    if (instance.Panel && !instance.Panel.classList.contains('ds-none')) return true;
    if (instance.isOpen && typeof instance.isOpen === 'function') return instance.isOpen();
    
    return false;
}

// Get the most recently opened module
getMostRecentlyOpenedModule() {
    const openModules = this.getCurrentlyOpenedModules();
    
    if (openModules.length === 0) return null;
    
    // Sort by opened time and return the most recent
    return openModules.sort((a, b) => {
        const timeA = a.openedAt ? new Date(a.openedAt).getTime() : 0;
        const timeB = b.openedAt ? new Date(b.openedAt).getTime() : 0;
        return timeB - timeA;
    })[0];
}

// Close a specific module
async closeModule(moduleId) {
    try {
        const instance = this.loadedInstances.get(moduleId);
        
        if (!instance) {
            console.warn(`Module ${moduleId} not found`);
            return false;
        }
        
        if (!this.isModuleOpen(instance)) {
            console.log(`Module ${moduleId} is already closed`);
            return false;
        }
        
        // Try different close methods
        if (typeof instance.closeDialog === 'function') {
            await instance.closeDialog();
        } else if (typeof instance.close === 'function') {
            await instance.close();
        } else if (typeof instance.hide === 'function') {
            await instance.hide();
        } else {
            // Manual close
            instance.state = 0;
            if (instance.Panel) {
                instance.Panel.classList.add('ds-none');
            }
        }
        
        // Record close event
        this.recordModuleClose(moduleId);
        
        console.log(`Module ${moduleId} closed successfully`);
        return true;
        
    } catch (error) {
        this.errorTracker.logError(moduleId, 'closeModule', error);
        return false;
    }
}

// Close all currently opened modules
async closeAllOpenedModules(options = {}) {
    const { 
        // Module IDs to exclude from closing
        except = [],
        // Force close even if module has unsaved changes
        force = false,
        // Close one by one or all at once
        sequential = true
    } = options;
    
    const openModules = this.getCurrentlyOpenedModules();
    const closedModules = [];
    const failedModules = [];
    
    console.log(`Closing ${openModules.length} open modules...`);
    
    for (const moduleInfo of openModules) {
        if (except.includes(moduleInfo.moduleId)) {
            console.log(`Skipping ${moduleInfo.moduleId} (in exception list)`);
            continue;
        }
        
        try {
            // Check if module can be closed
            if (!force && moduleInfo.instance.hasUnsavedChanges && 
                typeof moduleInfo.instance.hasUnsavedChanges === 'function') {
                const hasChanges = await moduleInfo.instance.hasUnsavedChanges();
                if (hasChanges) {
                    console.warn(`Module ${moduleInfo.moduleId} has unsaved changes, skipping`);
                    failedModules.push({
                        moduleId: moduleInfo.moduleId,
                        reason: 'unsaved_changes'
                    });
                    continue;
                }
            }
            
            if (sequential) {
                // Close one by one
                const closed = await this.closeModule(moduleInfo.moduleId);
                if (closed) {
                    closedModules.push(moduleInfo.moduleId);
                } else {
                    failedModules.push({
                        moduleId: moduleInfo.moduleId,
                        reason: 'close_failed'
                    });
                }
            } else {
                // Close all at once (non-blocking)
                this.closeModule(moduleInfo.moduleId).then(closed => {
                    if (closed) {
                        closedModules.push(moduleInfo.moduleId);
                    }
                });
            }
            
        } catch (error) {
            failedModules.push({
                moduleId: moduleInfo.moduleId,
                reason: error.message
            });
        }
    }
    
    return {
        total: openModules.length,
        closed: closedModules,
        failed: failedModules,
        skipped: except
    };
}

// Close the most recently opened module
async closeMostRecentModule() {
    const recentModule = this.getMostRecentlyOpenedModule();
    
    if (!recentModule) {
        console.log('No open modules found');
        return false;
    }
    
    return await this.closeModule(recentModule.moduleId);
}

// Get open module by various criteria
getOpenModuleBy(criteria) {
    const openModules = this.getCurrentlyOpenedModules();
    
    if (typeof criteria === 'function') {
        return openModules.find(criteria);
    }
    
    if (typeof criteria === 'object') {
        return openModules.find(module => {
            return Object.entries(criteria).every(([key, value]) => {
                return module[key] === value || module.instance[key] === value;
            });
        });
    }
    
    return null;
}

// Check if any module is open
hasOpenModules() {
    return this.getCurrentlyOpenedModules().length > 0;
}

// Get open modules summary
getOpenModulesSummary() {
    const openModules = this.getCurrentlyOpenedModules();
    
    return {
        count: openModules.length,
        modules: openModules.map(m => ({
            id: m.moduleId,
            name: m.moduleName,
            openDuration: Math.round(m.openDuration / 1000) + 's',
            openedAt: m.openedAt
        })),
        totalOpenTime: openModules.reduce((sum, m) => sum + m.openDuration, 0),
        hasUnsavedChanges: openModules.some(m => 
            m.instance.hasUnsavedChanges && 
            typeof m.instance.hasUnsavedChanges === 'function' &&
            m.instance.hasUnsavedChanges()
        )
    };
}

// Monitor open modules (useful for debugging)
startOpenModulesMonitor(interval = 5000) {
    if (this.openModulesMonitor) {
        clearInterval(this.openModulesMonitor);
    }
    
    this.openModulesMonitor = setInterval(() => {
        const summary = this.getOpenModulesSummary();
        if (summary.count > 0) {
            console.log('Open Modules:', summary);
        }
    }, interval);
    
    return () => clearInterval(this.openModulesMonitor);
}

// Global helpers
window.getOpenModules = () => unifiedModuleSystem.getCurrentlyOpenedModules();
window.closeModule = (moduleId) => unifiedModuleSystem.closeModule(moduleId);
window.closeAllModules = (options) => unifiedModuleSystem.closeAllOpenedModules(options);
window.closeMostRecentModule = () => unifiedModuleSystem.closeMostRecentModule();
window.hasOpenModules = () => unifiedModuleSystem.hasOpenModules();
window.getOpenModulesSummary = () => unifiedModuleSystem.getOpenModulesSummary();

// Utility functions
window.closeAllModulesExcept = (exceptModuleIds) => {
    return unifiedModuleSystem.closeAllOpenedModules({ 
        except: Array.isArray(exceptModuleIds) ? exceptModuleIds : [exceptModuleIds] 
    });
};

window.forceCloseAllModules = () => {
    return unifiedModuleSystem.closeAllOpenedModules({ force: true });
};

// Monitor open modules in development
if (IS_LOCAL_HOST) {
    window.monitorOpenModules = () => unifiedModuleSystem.startOpenModulesMonitor();
}   
    // Get currently opened modules
const openModules = getOpenModules();
console.log('Open modules:', openModules);

// Get summary
const summary = getOpenModulesSummary();
console.log(`${summary.count} modules open for total ${summary.totalOpenTime}ms`);

// Close specific module
await closeModule('QueryModule');

// Close most recent module
await closeMostRecentModule();

// Close all modules
const result = await closeAllModules();
console.log(`Closed ${result.closed.length} modules, failed ${result.failed.length}`);

// Close all except some modules
await closeAllModulesExcept(['EditorModule', 'ToolbarModule']);

// Force close all (ignore unsaved changes)
await forceCloseAllModules();

// Check if any module is open
if (hasOpenModules()) {
    console.log('There are open modules');
}

// Get specific open module
const queryModule = unifiedModuleSystem.getOpenModuleBy({ 
    moduleName: 'QueryModule' 
});

// Get open module by custom criteria
const longOpenModule = unifiedModuleSystem.getOpenModuleBy(
    // Open for more than 1 minute
    module => module.openDuration > 60000
);

// Monitor open modules (in development)
if (IS_LOCAL_HOST) {
    const stopMonitoring = monitorOpenModules();
    // Later: stopMonitoring();
}

// Before page unload, close all modules
window.addEventListener('beforeunload', async (e) => {
    const summary = getOpenModulesSummary();
    if (summary.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes';
    } else {
        await closeAllModules({ sequential: false });
    }
});

// Add keyboard shortcut to close most recent module
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.ctrlKey) {
        closeMostRecentModule();
    }
});


// Usage examples:
/*
// Basic usage
const element = editor.getSelection().getStartElement();
const lockInfo = isElementOrParentLocked(element);

if (lockInfo.isLocked) {
    console.log('Element is locked by:', lockInfo.lockedBy);
    if (lockInfo.isLockedByOther) {
        console.log('Cannot edit - locked by another user');
        // Prevent editing
        return false;
    }
}

// Quick checks
if (isLockedByOther(element)) {
    console.log('Blocked by another user');
    // Cancel the event
    event.cancel();
}

// Block-level check (more comprehensive)
const blockStatus = checkBlockLockStatus(element);
if (blockStatus.isLockedByOther) {
    console.log('Block is locked by:', blockStatus.lockedBy);
    console.log('Locked element:', blockStatus.lockedElement);
    console.log('Block element:', blockStatus.blockElement);
}


*/