class DialogStateManager {
    constructor(moduleRegistry) {
        this.moduleRegistry = moduleRegistry;
        this.stateChangeListeners = [];
    }

    /**
     * Get all currently open dialogs based on state
     * @returns {Array} Array of open dialog objects with module info
     */
    getOpenDialogs() {
        const openDialogs = [];

        // Check loadedModules in registry
        if (this.moduleRegistry && this.moduleRegistry.loadedModules) {
            for (const [moduleName, moduleInstance] of this.moduleRegistry.loadedModules) {
                if (moduleInstance && moduleInstance.state === 1) {
                    openDialogs.push({
                        name: moduleInstance.name || moduleInstance._name || moduleName,
                        id: moduleInstance._id,
                        instance: moduleInstance,
                        panel: moduleInstance.Panel,
                        dialogType: moduleInstance._dialogType,
                        stats: moduleInstance._stats
                    });
                }
            }
        }

        // Also check global MODULE_LIST if it exists
        if (typeof MODULE_LIST !== 'undefined') {
            for (const [moduleId, moduleInstance] of Object.entries(MODULE_LIST)) {
                if (moduleInstance && moduleInstance.state === 1) {
                    // Avoid duplicates from registry
                    const exists = openDialogs.some(dialog => dialog.id === moduleId);
                    if (!exists) {
                        openDialogs.push({
                            name: moduleInstance.name || moduleInstance._name || moduleId,
                            id: moduleId,
                            instance: moduleInstance,
                            panel: moduleInstance.Panel,
                            dialogType: moduleInstance._dialogType,
                            stats: moduleInstance._stats
                        });
                    }
                }
            }
        }

        return openDialogs;
    }

    /**
     * Get the currently active/focused dialog
     * @returns {Object|null} Active dialog object or null
     */
    getActiveDialog() {
        const openDialogs = this.getOpenDialogs();

        if (openDialogs.length === 0) return null;
        if (openDialogs.length === 1) return openDialogs[0];

        // Find the most recently opened dialog
        let activeDialog = null;
        let latestOpenTime = 0;

        openDialogs.forEach(dialog => {
            if (dialog.stats && dialog.stats.lastOpened) {
                const openTime = new Date(dialog.stats.lastOpened).getTime();
                if (openTime > latestOpenTime) {
                    latestOpenTime = openTime;
                    activeDialog = dialog;
                }
            }
        });

        // If no lastOpened time available, return the first one
        return activeDialog || openDialogs[0];
    }

    /**
     * Check if a specific dialog is open
     * @param {string} moduleNameOrId - Module name or dialog ID
     * @returns {boolean} True if dialog is open
     */
    isDialogOpen(moduleNameOrId) {
        const openDialogs = this.getOpenDialogs();
        return openDialogs.some(dialog =>
            dialog.name === moduleNameOrId ||
            dialog.id === moduleNameOrId
        );
    }

    /**
     * Get dialog by name or ID
     * @param {string} moduleNameOrId - Module name or dialog ID
     * @returns {Object|null} Dialog object or null
     */
    getDialog(moduleNameOrId) {
        const openDialogs = this.getOpenDialogs();
        return openDialogs.find(dialog =>
            dialog.name === moduleNameOrId ||
            dialog.id === moduleNameOrId
        ) || null;
    }

    /**
     * Get dialog states summary
     * @returns {Object} Summary of all dialog states
     */
    getDialogStatesSummary() {
        const summary = {
            total: 0,
            open: 0,
            closed: 0,
            dialogs: []
        };

        // Check registry modules
        if (this.moduleRegistry && this.moduleRegistry.loadedModules) {
            for (const [moduleName, moduleInstance] of this.moduleRegistry.loadedModules) {
                if (moduleInstance && typeof moduleInstance.state !== 'undefined') {
                    summary.total++;
                    const isOpen = moduleInstance.state === 1;

                    if (isOpen) summary.open++;
                    else summary.closed++;

                    summary.dialogs.push({
                        name: moduleInstance.name || moduleInstance._name || moduleName,
                        id: moduleInstance._id,
                        state: moduleInstance.state,
                        isOpen: isOpen,
                        initiated: moduleInstance.initiated,
                        fullyLoaded: moduleInstance.FullyLoaded,
                        stats: moduleInstance._stats
                    });
                }
            }
        }

        // Also check MODULE_LIST
        if (typeof MODULE_LIST !== 'undefined') {
            for (const [moduleId, moduleInstance] of Object.entries(MODULE_LIST)) {
                if (moduleInstance && typeof moduleInstance.state !== 'undefined') {
                    // Avoid duplicates
                    const exists = summary.dialogs.some(dialog => dialog.id === moduleId);
                    if (!exists) {
                        summary.total++;
                        const isOpen = moduleInstance.state === 1;

                        if (isOpen) summary.open++;
                        else summary.closed++;

                        summary.dialogs.push({
                            name: moduleInstance.name || moduleInstance._name || moduleId,
                            id: moduleId,
                            state: moduleInstance.state,
                            isOpen: isOpen,
                            initiated: moduleInstance.initiated,
                            fullyLoaded: moduleInstance.FullyLoaded,
                            stats: moduleInstance._stats
                        });
                    }
                }
            }
        }

        return summary;
    }

    /**
     * Monitor dialog state changes
     * @param {Function} callback - Callback function to execute on state change
     */
    onStateChange(callback) {
        this.stateChangeListeners.push(callback);
    }

    /**
     * Start monitoring dialog states (polling approach)
     * @param {number} interval - Polling interval in milliseconds (default: 1000)
     */
    startMonitoring(interval = 1000) {
        let previousStates = new Map();

        const monitor = () => {
            const currentStates = new Map();
            const openDialogs = this.getOpenDialogs();

            // Track current states
            openDialogs.forEach(dialog => {
                currentStates.set(dialog.id, {
                    state: dialog.instance.state,
                    isOpen: dialog.instance.state === 1
                });
            });

            // Check for changes
            const changes = [];

            // Check for newly opened dialogs
            currentStates.forEach((current, dialogId) => {
                const previous = previousStates.get(dialogId);
                if (!previous || previous.state !== current.state) {
                    changes.push({
                        dialogId,
                        previousState: previous ? previous.state : 0,
                        currentState: current.state,
                        action: current.isOpen ? 'opened' : 'closed'
                    });
                }
            });

            // Check for closed dialogs
            previousStates.forEach((previous, dialogId) => {
                if (!currentStates.has(dialogId) && previous.isOpen) {
                    changes.push({
                        dialogId,
                        previousState: previous.state,
                        currentState: 0,
                        action: 'closed'
                    });
                }
            });

            // Notify listeners of changes
            if (changes.length > 0) {
                this.stateChangeListeners.forEach(callback => {
                    try {
                        callback(changes, this.getDialogStatesSummary());
                    } catch (error) {
                        console.error('Dialog state change callback error:', error);
                    }
                });
            }

            previousStates = new Map(currentStates);
        };

        // Start monitoring
        const monitorInterval = setInterval(monitor, interval);

        // Return function to stop monitoring
        return () => clearInterval(monitorInterval);
    }

    /**
     * Close a single dialog by name or ID
     * @param {string} moduleNameOrId - Module name or dialog ID
     * @returns {boolean} True if dialog was closed successfully
     */
    closeSingleDialog(moduleNameOrId) {
        const dialog = this.getDialog(moduleNameOrId);
        if (!dialog) {
            console.warn(`Dialog ${moduleNameOrId} not found or not open`);
            return false;
        }

        try {
            // Check if panel is actually visible using commonMethods
            const isVisible = typeof commonMethods !== 'undefined' &&
                typeof commonMethods.IsVisibleElm === 'function' ?
                commonMethods.IsVisibleElm(dialog.panel) :
                (dialog.panel && !dialog.panel.classList.contains('ds-none'));

            if (!isVisible) {
                console.warn(`Dialog ${moduleNameOrId} panel is not visible`);
                return false;
            }

            // Try different close methods in order of preference
            if (dialog.instance && typeof dialog.instance.closeDialog === 'function') {
                dialog.instance.closeDialog();
                debug.log(`Dialog ${moduleNameOrId} closed using closeDialog()`);
                return true;
            } else if (dialog.instance && typeof dialog.instance.hide === 'function') {
                dialog.instance.hide();
                debug.log(`Dialog ${moduleNameOrId} closed using hide()`);
                return true;
            } else if (dialog.instance) {
                // Manually set state to closed
                dialog.instance.state = 0;
                if (dialog.panel) {
                    dialog.panel.classList.add('ds-none');
                }
                debug.log(`Dialog ${moduleNameOrId} closed manually`);
                return true;
            }

            return false;
        } catch (error) {
            console.error(`Error closing dialog ${moduleNameOrId}:`, error);
            return false;
        }
    }

    /**
     * Close all open dialogs
     * @returns {Array} Array of closed dialog IDs
     */
    closeAllDialogs() {
        const openDialogs = this.getOpenDialogs();
        const closedDialogs = [];

        openDialogs.forEach(dialog => {
            try {
                // Check if panel is actually visible using commonMethods
                const isVisible = typeof commonMethods !== 'undefined' &&
                    typeof commonMethods.IsVisibleElm === 'function' ?
                    commonMethods.IsVisibleElm(dialog.panel) :
                    (dialog.panel && !dialog.panel.classList.contains('ds-none'));

                if (!isVisible) {
                    console.warn(`Dialog ${dialog.id} panel is not visible, skipping`);
                    return;
                }

                // Try different close methods in order of preference
                if (dialog.instance && typeof dialog.instance.closeDialog === 'function') {
                    dialog.instance.closeDialog();
                    closedDialogs.push(dialog.id);
                } else if (dialog.instance && typeof dialog.instance.hide === 'function') {
                    dialog.instance.hide();
                    closedDialogs.push(dialog.id);
                } else if (dialog.instance) {
                    // Manually set state to closed
                    dialog.instance.state = 0;
                    if (dialog.panel) {
                        dialog.panel.classList.add('ds-none');
                    }
                    closedDialogs.push(dialog.id);
                }
            } catch (error) {
                console.error(`Error closing dialog ${dialog.id}:`, error);
            }
        });

        return closedDialogs;
    }

    /**
     * Get detailed dialog information
     * @param {string} moduleNameOrId - Module name or dialog ID
     * @returns {Object|null} Detailed dialog information
     */
    getDialogDetails(moduleNameOrId) {
        const dialog = this.getDialog(moduleNameOrId);
        if (!dialog) return null;

        return {
            ...dialog,
            name: dialog.instance ? (dialog.instance.name || dialog.instance._name || dialog.name) : dialog.name,
            isVisible: dialog.panel ? !dialog.panel.classList.contains('ds-none') : false,
            hasStyle: dialog.panel ? dialog.panel.hasAttribute('style') : false,
            focusElement: dialog.panel ? dialog.panel.querySelector('[data-auto-focus]') : null,
            formInputs: dialog.panel ? dialog.panel.querySelectorAll('input').length : 0,
            initiated: dialog.instance.initiated,
            fullyLoaded: dialog.instance.FullyLoaded,
            options: dialog.instance.options
        };
    }
}

class ModuleInitializationQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        // Maximum concurrent initializations
        this.maxConcurrent = 3;
        this.activeCount = 0;
    }

    async add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                task,
                resolve,
                reject,
                attempts: 0
            });
            this.process();
        });
    }

    async process() {
        if (this.processing || this.activeCount >= this.maxConcurrent) return;
        this.processing = true;

        while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
            const item = this.queue.shift();
            this.activeCount++;

            try {
                const result = await item.task();
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            } finally {
                this.activeCount--;
            }
        }

        this.processing = false;

        // If there are remaining items and capacity, continue processing
        if (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
            this.process();
        }
    }
}

class ModuleStatus {
    constructor() {
        // pending, initializing, ready, failed, retrying
        this.status = 'pending';
        this.error = null;
        this.attempts = 0;
        this.lastAttempt = null;
        this.initializeTime = null;
        this.dependencies = new Set();
    }

    update(newStatus, error = null) {
        this.status = newStatus;
        this.error = error;
        this.lastAttempt = new Date();
        if (newStatus === 'ready') {
            this.initializeTime = this.lastAttempt;
        }
        this.attempts++;
    }
}

class ModuleRegistry {
    constructor() {
        this.modules = new Map();
        this.moduleTypes = new Map();
        this.loadedModules = new Map();
        this.moduleDefinitions = new Map();
        this.moduleStatuses = new Map();
        this.errorTracker = new EnhancedErrorTracker();
        this.initQueue = new ModuleInitializationQueue();
        this._progressPromises = new Map();
        this.apiService = new FetchService();

        this.maxRetries = 3;
        this.retryDelays = [1000, 3000, 5000];
        this.setupGlobalErrorTracking();
    }

    setupMethodsForModule(moduleInstance, moduleName, shouldWrap = true) {
        const prototype = Object.getPrototypeOf(moduleInstance);
        const debouncePattern = /debounce/i;
        const debounceList = moduleInstance.debouceList || [];

        const methodNames = Object.getOwnPropertyNames(prototype).filter(name => {
            const method = prototype[name];
            return name !== 'constructor' &&
                typeof method === 'function' &&
                !debouncePattern.test(name) &&
                !debounceList.includes(name);
        });

        methodNames.forEach(methodName => {
            const originalMethod = prototype[methodName];

            if (shouldWrap) {
                moduleInstance[methodName] = this.wrapModuleMethodsWithErrorTracking(
                    moduleInstance, methodName, originalMethod, moduleName
                );
            } else {
                moduleInstance[methodName] = originalMethod.bind(moduleInstance);
            }

            // Make method enumerable
            Object.defineProperty(moduleInstance, methodName, {
                enumerable: true,
                configurable: true,
                writable: true
            });
        });
    }

    detectPerformanceMode() {
        try {
            const hardwareConcurrency = navigator.hardwareConcurrency || 4;
            const memory = navigator.deviceMemory || 4;

            if (hardwareConcurrency >= 8 && memory >= 8) return 'high';
            if (hardwareConcurrency >= 4 && memory >= 4) return 'standard';
            return 'low';
        } catch (error) {
            return 'standard';
        }
    }

    setupGlobalErrorTracking() {
        this.errorTracker.MAX_STORED_ERRORS = 1000;
        const docId = new URLSearchParams(window.location.search).get('docid');
        this.errorTracker._globalPersistKey = docId ?
            `global_error_tracking_${docId}` :
            'module_registry_errors';

        // Sync errors every 5 minutes
        setInterval(() => {
            this.errorTracker.syncWithServer()
                .catch(error => console.error('Error sync failed:', error));
        }, 5 * 60 * 1000);
    }

    getModuleStatus(moduleName) {
        if (!this.moduleStatuses.has(moduleName)) {
            this.moduleStatuses.set(moduleName, new ModuleStatus());
        }
        return this.moduleStatuses.get(moduleName);
    }

    async loadModuleClass(path) {
        try {
            const moduleFile = await import(path);
            const ModuleClass = moduleFile.default || moduleFile;
            if (typeof ModuleClass !== 'function') {
                throw new Error(`Module at ${path} does not export a class constructor`);
            }
            return ModuleClass;
        } catch (error) {
            this.errorTracker.logError('system', 'loadModuleClass', error, {
                path
            });
            throw error;
        }
    }

    async registerModuleDefinition(moduleName, config) {
        try {
            const {
                path,
                type = 'onthefly',
                templatePath,
                containerSelector,
                dependencies = [],
                supportingFiles = [],
                lazyDelay = 2000,
                wrapping = true,
                wrapperConfig = {},
                // NEW: Direct class support
                moduleClass = null,
                // NEW: Track view support
                trackView = false
            } = config;

            if (!['onthefly', 'lazy', 'ondemand'].includes(type)) {
                throw new Error(`Invalid module type: ${type}`);
            }

            // Validate that we have either a path or a moduleClass
            if (!path && !moduleClass) {
                throw new Error(`Module ${moduleName} must have either a path or moduleClass`);
            }

            // If moduleClass is provided, validate it's a constructor function
            if (moduleClass && typeof moduleClass !== 'function') {
                throw new Error(`moduleClass for ${moduleName} must be a constructor function`);
            }

            const moduleStatus = this.getModuleStatus(moduleName);
            moduleStatus.dependencies = new Set(dependencies);

            this.moduleDefinitions.set(moduleName, {
                path,
                type,
                templatePath,
                containerSelector,
                dependencies,
                supportingFiles,
                wrapping,
                wrapperConfig,
                // Store the direct class reference
                moduleClass,
                // Store track view preference
                trackView
            });

            // If moduleClass is provided, register it directly
            if (moduleClass) {
                this.modules.set(moduleName, moduleClass);
                this.moduleTypes.set(moduleName, type);
            }

            this.errorTracker.registerModule(moduleName);

            if (type === 'onthefly') {
                await this.progressModule(moduleName, {
                    containerSelector
                });
            } else if (type === 'lazy') {
                setTimeout(() => {
                    this.progressModule(moduleName, {
                            containerSelector
                        })
                        .catch(error => {
                            this.errorTracker.logError(moduleName, 'lazyInitialization', error);
                            moduleStatus.update('failed', error);
                        });
                }, lazyDelay);
            }
        } catch (error) {
            this.errorTracker.logError('system', 'registerModuleDefinition', error, {
                moduleName,
                config
            });
            throw error;
        }
    }

    async initializeDependencies(dependencies = []) {
        for (const dependencyName of dependencies) {
            const depStatus = this.getModuleStatus(dependencyName);
            if (depStatus.status === 'ready' && this.loadedModules.has(dependencyName)) {
                continue;
            }

            if (this._progressPromises.has(dependencyName)) {
                await this._progressPromises.get(dependencyName);
                continue;
            }

            // Run inline — not via initQueue — to avoid pool deadlock when
            // a queued task awaits its dependency while holding an active slot.
            await this.initializeModuleWithRetry(dependencyName, 0, null);
        }
    }

    async ensureSupportingFiles(supportingFiles = [], when = 'initLoop', owner = null) {
        const files = supportingFiles.filter((file) => {
            return file && typeof file === 'object' && (file.when || 'initLoop') === when;
        });
        if (!files.length) return;

        const helpers = typeof window !== 'undefined' ? window.ContextHelpers : null;
        if (!helpers || typeof helpers.loadModuleResource !== 'function') {
            throw new Error('ContextHelpers.loadModuleResource is not available');
        }

        await Promise.all(files.map((file) => helpers.loadModuleResource(file, owner)));
    }

    async progressModule(moduleName, options = {}) {
        const {
            containerSelector = null, force = false
        } = options;
        const definition = this.moduleDefinitions.get(moduleName);

        if (!definition) {
            throw new Error(`Module ${moduleName} not registered`);
        }

        const status = this.getModuleStatus(moduleName);
        const resolvedSelector = containerSelector || definition.containerSelector || null;

        if (!force && status.status === 'ready' && this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }

        if (force) {
            const inFlight = this._progressPromises.get(moduleName);
            if (inFlight) {
                this._progressPromises.delete(moduleName);
                try {
                    await inFlight;
                } catch (_) {
                    // prior attempt failed — continue with forced reload
                }
            }
            this.loadedModules.delete(moduleName);
            this.modules.delete(moduleName);
            status.update('pending');
        } else if (this._progressPromises.has(moduleName)) {
            return this._progressPromises.get(moduleName);
        }

        const progressPromise = this.queueModuleInitialization(moduleName, resolvedSelector);
        this._progressPromises.set(moduleName, progressPromise);

        try {
            return await progressPromise;
        } finally {
            if (this._progressPromises.get(moduleName) === progressPromise) {
                this._progressPromises.delete(moduleName);
            }
        }
    }

    async queueModuleInitialization(moduleName, containerSelector = null) {
        const status = this.getModuleStatus(moduleName);

        if (status.status !== 'ready') {
            status.update('pending');
        }

        return this.initQueue.add(async () => {
            try {
                return await this.initializeModuleWithRetry(moduleName, 0, containerSelector);
            } catch (error) {
                status.update('failed', error);
                throw error;
            }
        });
    }

    async initializeModuleWithRetry(moduleName, attempt = 0, containerSelector = null) {
        const status = this.getModuleStatus(moduleName);
        const definition = this.moduleDefinitions.get(moduleName);

        if (!definition) {
            throw new Error(`Module ${moduleName} not found`);
        }

        const resolvedSelector = containerSelector || definition.containerSelector || null;

        try {
            status.update('initializing');

            if (definition.dependencies.length > 0) {
                await this.initializeDependencies(definition.dependencies);
            }

            const module = await this.initializeModule(moduleName, resolvedSelector);
            status.update('ready');
            return module;
        } catch (error) {
            const ignoreTry = ["MultiRefModule"];
            if (attempt < this.maxRetries - 1 && !ignoreTry.includes(moduleName)) {
                status.update('retrying', error);
                const delay = this.retryDelays[attempt] || this.retryDelays[this.retryDelays.length - 1];
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.initializeModuleWithRetry(moduleName, attempt + 1, resolvedSelector);
            }

            status.update('failed', error);
            this.errorTracker.logError(moduleName, 'initialization_failed', error);
            throw error;
        }
    }

    async initializeModule(moduleName, containerSelector) {
        try {
            if (this.loadedModules.has(moduleName)) {
                const existingModule = this.loadedModules.get(moduleName);
                const status = this.getModuleStatus(moduleName);

                if (status.status === 'ready' && existingModule) {
                    return existingModule;
                }

                if (['initializing', 'pending', 'retrying'].includes(status.status)) {
                    return this.waitForModuleInitialization(moduleName);
                }
            }

            const ModuleClass = await this.loadModule(moduleName);
            const moduleInstance = new ModuleClass(moduleName);
            const moduleDefinition = this.moduleDefinitions.get(moduleName);

            // Setup error tracking
            this.registerModuleErrorTracking(moduleInstance, moduleName);

            // Expose supportingFiles for BaseModule.getModuleMessages (name: 'messages')
            moduleInstance._supportingFiles = moduleDefinition.supportingFiles || [];

            // Setup module methods with optional wrapping
            this.setupMethodsForModule(moduleInstance, moduleName, moduleDefinition.wrapping);

            // Load template if specified
            if (moduleDefinition.templatePath) {
                await moduleInstance.loadTemplate(moduleDefinition.templatePath);
            }

            // Unbind events if needed
            if (containerSelector && typeof moduleInstance.unbindActionEvents === 'function') {
                await moduleInstance.unbindActionEvents(containerSelector);
            }

            await this.ensureSupportingFiles(moduleDefinition.supportingFiles, 'initLoop', moduleInstance);

            if (typeof moduleInstance.initialize === "function") {
                await moduleInstance.initialize(containerSelector || undefined);
            }

            if (typeof moduleInstance.postInitializeModule === "function") {
                await moduleInstance.postInitializeModule();
            }

            this.loadedModules.set(moduleName, moduleInstance);
            return moduleInstance;
        } catch (error) {
            this.errorTracker.logError(moduleName, 'initializeModule', error, {
                containerSelector,
                timestamp: new Date().toISOString(),
                critical: true
            });
            throw error;
        }
    }

    async waitForModuleInitialization(moduleName, maxWaitTime = 30000) {
        const startTime = Date.now();
        const checkInterval = 1000;

        return new Promise((resolve, reject) => {
            const checkStatus = () => {
                const status = this.getModuleStatus(moduleName);
                const module = this.loadedModules.get(moduleName);

                if (status.status === 'ready' && module) {
                    resolve(module);
                    return;
                }

                if (status.status === 'failed') {
                    reject(new Error(`Module ${moduleName} failed to initialize: ${status.error?.message || 'Unknown error'}`));
                    return;
                }

                if (Date.now() - startTime > maxWaitTime) {
                    reject(new Error(`Timeout waiting for module ${moduleName} to initialize`));
                    return;
                }

                setTimeout(checkStatus, checkInterval);
            };

            checkStatus();
        });
    }

    async loadModule(moduleName) {
        if (this.modules.has(moduleName)) {
            return this.modules.get(moduleName);
        }

        const moduleDefinition = this.moduleDefinitions.get(moduleName);
        if (!moduleDefinition) {
            throw new Error(`Module ${moduleName} not found`);
        }

        let ModuleClass;

        // Check if moduleClass is directly provided
        if (moduleDefinition.moduleClass) {
            ModuleClass = moduleDefinition.moduleClass;
        } else if (moduleDefinition.path) {
            // Fall back to importing from path
            ModuleClass = await this.loadModuleClass(moduleDefinition.path);
        } else {
            throw new Error(`Module ${moduleName} has no class or path defined`);
        }

        this.modules.set(moduleName, ModuleClass);
        this.moduleTypes.set(moduleName, moduleDefinition.type);
        return ModuleClass;
    }

    async getModule(moduleName, containerSelector = null) {
        try {
            return await this.progressModule(moduleName, {
                containerSelector
            });
        } catch (error) {
            this.errorTracker.logError(moduleName, 'getModule', error);
            throw error;
        }
    }

    // Module class registration methods
    registerModuleClass(moduleName, ModuleClass) {
        if (!moduleName || typeof moduleName !== 'string') {
            throw new Error('Module name must be a non-empty string');
        }
        if (!ModuleClass || typeof ModuleClass !== 'function') {
            throw new Error('ModuleClass must be a constructor function');
        }

        this.modules.set(moduleName, ModuleClass);

        if (typeof window !== 'undefined') {
            window.modules = window.modules || {};
            window.modules[moduleName] = ModuleClass;
        }

        return true;
    }

    registerModuleClasses(moduleClasses) {
        const registeredModules = [];
        const errors = [];

        for (const [moduleName, ModuleClass] of Object.entries(moduleClasses)) {
            try {
                this.registerModuleClass(moduleName, ModuleClass);
                registeredModules.push(moduleName);
            } catch (error) {
                errors.push({
                    moduleName,
                    error
                });
            }
        }

        return {
            success: registeredModules,
            errors
        };
    }

    // Enhanced method to register modules with direct class support
    async registerModuleWithClass(moduleName, moduleClass, options = {}) {
        const config = {
            moduleClass,
            type: 'onthefly',
            wrapping: true,
            dependencies: [],
            trackView: false,
            ...options
        };

        return await this.registerModuleDefinition(moduleName, config);
    }

    // Convenience method for your specific use case
    async registerDirectModule(moduleDefinition) {
        const {
            name,
            moduleClass,
            type = 'onthefly',
            templatePath,
            dependencies = [],
            supportingFiles = [],
            trackView = false,
            wrapping = true,
            containerSelector = null,
            wrapperConfig = {}
        } = moduleDefinition;

        if (!name || !moduleClass) {
            throw new Error('Module name and moduleClass are required');
        }

        const config = {
            moduleClass,
            type,
            templatePath,
            dependencies,
            supportingFiles,
            trackView,
            wrapping,
            containerSelector,
            wrapperConfig
        };

        return await this.registerModuleDefinition(name, config);
    }

    isModuleClassRegistered(moduleName) {
        return this.modules.has(moduleName);
    }

    getModuleClass(moduleName) {
        return this.modules.get(moduleName) || null;
    }

    // Error tracking and wrapper methods
    registerModuleErrorTracking(moduleInstance, moduleName) {
        moduleInstance.trackError = (functionName, error, context = {}) => {
            return this.errorTracker.logError(moduleName, functionName, error, {
                ...context,
                timestamp: new Date().toISOString(),
                moduleState: typeof moduleInstance.getState === 'function' ? moduleInstance.getState() : {}
            });
        };
    }

    wrapModuleMethodsWithErrorTracking(moduleInstance, methodName, originalMethod, moduleName) {
        return function wrappedMethod(...args) {
            const startTime = performance.now();

            try {
                const result = originalMethod.apply(moduleInstance, args);

                if (result && typeof result.then === 'function') {
                    return result.catch(error => {
                        this.errorTracker.logError(moduleName, methodName, error, {
                            arguments: args,
                            executionTime: performance.now() - startTime,
                            moduleState: typeof moduleInstance.getState === 'function' ?
                                moduleInstance.getState() : {},
                            timestamp: new Date().toISOString(),
                            methodType: 'async'
                        });
                        throw error;
                    });
                }

                return result;
            } catch (error) {
                this.errorTracker.logError(moduleName, methodName, error, {
                    arguments: args,
                    executionTime: performance.now() - startTime,
                    moduleState: typeof moduleInstance.getState === 'function' ?
                        moduleInstance.getState() : {},
                    timestamp: new Date().toISOString(),
                    methodType: 'sync'
                });
                throw error;
            }
        }.bind(this);
    }

    // Utility methods
    async getModuleSafe(moduleName, containerSelector = null, fallbackValue = null) {
        try {
            return await this.getModule(moduleName, containerSelector);
        } catch (error) {
            this.errorTracker.logError(moduleName, 'getModuleSafe', error);
            return fallbackValue;
        }
    }

    async reloadModule(moduleName, containerSelector = null) {
        try {
            return await this.progressModule(moduleName, {
                containerSelector,
                force: true
            });
        } catch (error) {
            this.errorTracker.logError(moduleName, 'reloadModule', error);
            throw error;
        }
    }

    isModuleReady(moduleName) {
        const module = this.loadedModules.get(moduleName);
        const status = this.getModuleStatus(moduleName);
        return module && status.status === 'ready';
    }



    // Admin and reporting methods
    sendReportsAdmin(from = "Unknown", options = {}) {
        window.OBJ_SEN_REC_ID = GET_SENDER_RECEIVER_ID("Error_Mail");
        const MAIL_BODY = this.errorTracker.renderErrorReportTable({});

        if (!MAIL_BODY) {
            this.errorTracker.clearErrors();
            console.log("Error Count == 0, so mail was not triggered");
            return;
        }

        const subject =
            (DOC_INFO.get("IDENTIFIER") || SHARED_KEY.identifier || DOC_ID) +
            " - " + from;

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
            emailMessage: MAIL_BODY
        };

        // Fire and forget API call
        void this.apiService
            .makeRequest("genericsendemail", mailObj, {
                isPayloadLogic: true
            })
            .then((serverResult) => {
                if (serverResult && serverResult.r === 1) {
                    console.log("Email sent successfully:", serverResult);
                    this.errorTracker.clearErrors();
                } else {
                    console.error("Failed to send email:", serverResult);
                    this.handleMailResponse && this.handleMailResponse({
                        r: 0,
                        error: serverResult && serverResult.error || "Unknown error from server"
                    });
                }
            })
            .catch((err) => {
                this.logError("sendReportsAdmin API call failed", err);
                this.handleMailResponse && this.handleMailResponse({
                    r: 0,
                    error: err && err.message || "Request failed"
                });
            });
    }



    // Enhanced getModuleInfo to show if module uses direct class
    getModuleInfo(moduleName) {
        const module = this.loadedModules.get(moduleName);
        const definition = this.moduleDefinitions.get(moduleName);
        const status = this.getModuleStatus(moduleName);

        return {
            name: moduleName,
            definition,
            status: {
                status: status.status,
                attempts: status.attempts,
                lastAttempt: status.lastAttempt,
                initializeTime: status.initializeTime,
                error: status.error
            },
            health: module && typeof module.$health === 'function' ? module.$health() : null,
            metrics: module && typeof module.$metrics === 'function' ? module.$metrics() : null,
            isWrapped: definition && definition.wrapping !== false,
            // NEW: Indicates if using direct class
            isDirect: !!definition && definition.moduleClass,
            // NEW: Track view status
            trackView: definition && definition.trackView || false,
            methods: module ? Object.getOwnPropertyNames(module).filter(name =>
                typeof module[name] === 'function' && name !== 'constructor'
            ) : []
        };
    }

    // Enhanced stats to show direct vs imported modules
    getRegistryStats() {
        const stats = {
            totalModules: this.moduleDefinitions.size,
            loadedModules: this.loadedModules.size,
            modulesByType: {},
            modulesByStatus: {},
            wrappedModules: 0,
            unwrappedModules: 0,
            // NEW: Count of modules with direct class
            directModules: 0,
            // NEW: Count of modules imported from path
            importedModules: 0,
            // NEW: Count of modules with view tracking
            trackedModules: 0
        };

        for (const [name, definition] of this.moduleDefinitions) {
            stats.modulesByType[definition.type] = (stats.modulesByType[definition.type] || 0) + 1;

            if (definition.wrapping !== false) {
                stats.wrappedModules++;
            } else {
                stats.unwrappedModules++;
            }

            if (definition.moduleClass) {
                stats.directModules++;
            } else {
                stats.importedModules++;
            }

            if (definition.trackView) {
                stats.trackedModules++;
            }
        }

        for (const [name, status] of this.moduleStatuses) {
            stats.modulesByStatus[status.status] = (stats.modulesByStatus[status.status] || 0) + 1;
        }

        return stats;
    }
}
