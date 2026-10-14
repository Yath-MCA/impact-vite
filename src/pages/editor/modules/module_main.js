/* 

https://claude.ai/public/artifacts/00bfff39-1681-471e-8de6-7c7680592999
https://claude.ai/public/artifacts/1ef3f559-caa6-4dc4-aeff-4013986282ee
https://claude.ai/public/artifacts/7ddd9d65-2fa3-47bb-ad2f-0468a9e6ec74

*/




const registerAndMonitorModules = async (registry, additionalModules = []) => {


    registry = registry ? registry : window.moduleRegistry;

    // Define modules to register
    const baseModules = [{
            name: 'LinkSessionService',
            path: './link_session/index.js',
            type: 'onthefly',
            templatePath: '',
            dependencies: [],
            trackView: false
        },
        {
            name: 'LinkSessionRequestModule',
            path: './link_session_request/index.js',
            type: 'onthefly',
            templatePath: './link_session_request/template.html',
            dependencies: ['LinkSessionService'],
            trackView: false
        },
        /*
                {
                    name: 'MultiRefModule',
                    path: './ref_form/index.js',
                    type: 'lazy',
                    templatePath: './ref_form/template.html',
                    dependencies: [],
                    trackView: false
                },
        
                {
                    name: 'GuidedTour',
                    path: './guide_tour/index.js',
                    type: 'onthefly',
                    templatePath: '',
                    dependencies: [],
                    trackView: false
                },
                {
                    name: 'CitationPopupDialog',
                    path: './citation_popup/index.js',
                    type: 'onthefly',
                    templatePath: '',
                    dependencies: [],
                    standalone: true,
                    trackView: true
                },
                {
                    name: 'TooltipModule',
                    path: './tooltip/index.js',
                    type: 'onthefly',
                    templatePath: '',
                    dependencies: [],
                    standalone: true
                },
                {
                    name: 'HyperlinkDialogModule',
                    path: './hyperlink_module/index.js',
                    type: 'onthefly',
                    templatePath: './hyperlink_module/template.html',
                    dependencies: [],
                    trackView: true
                },
        
                 , {
                name: 'WebSpellChecker',
                path: './spellcheck/index.js',
                type: 'lazy',
                templatePath: '',
                dependencies: [],
                standalone: true,
                wrapping: true
            },
        
                {
                    name: 'QueryModule',
                    path: './query/index.js',
                    type: 'ondemand',
                    templatePath: 'query/template.html',
                    dependencies: [],
                    standalone: true,
                    wrapping: true
                } ,{
                    name: 'AbstractWordCounter',
                    path: './abstract_words/index.js',
                    type: 'ondemand',
                    templatePath: 'abstract_words/template.html',
                    dependencies: []
                },
                    
                */

    ];

    try {

        // Check if "editor6TrackView" exists in the URL path
        const isEditor6TrackView = IS_TRACK_VIEW || location.pathname.includes("editor6TrackView");
        // Register all modules
        // If this is the first initialization, register base modules
        if (!registry._baseModulesRegistered) {
            const baseRegistrationPromises = baseModules.map(({
                    name,
                    ...definition
                }) =>
                registry.registerModuleDefinition(name, {
                    ...definition,
                    dependencies: Array.isArray(definition.dependencies) ?
                        definition.dependencies : definition.dependencies === '' ? [] : [definition.dependencies]
                })
            );

            await Promise.all(baseRegistrationPromises);
            registry._baseModulesRegistered = true;
            console.log('Base modules registered successfully');
        }

        // Register additional modules if provided
        if (additionalModules.length > 0) {
            debug.log("initialize additional modules begin");
            const additionalRegistrationPromises = additionalModules.map(({
                    name,
                    ...definition
                }) =>
                registry.registerModuleDefinition(name, {
                    ...definition,
                    dependencies: Array.isArray(definition.dependencies) ?
                        definition.dependencies : definition.dependencies === '' ? [] : [definition.dependencies]
                })
            );

            await Promise.all(additionalRegistrationPromises);
            console.log('Additional modules registered successfully');
        }

        /*
        // Since GuidedTour is onthefly, it will initialize automatically
        // Monitor its status
        const status = await registry.getModuleInitializationStatus('GuidedTour');
        console.log('GuidedTour module status:', status);
        // For demonstration, you can also monitor other modules
        for (const {
                name
            } of modulesToRegister) {
            const moduleStatus = await registry.getModuleInitializationStatus(name);
            // debug.log(`${name} status:`, moduleStatus);
        }
            */

    } catch (error) {
        console.error('Error during module registration or monitoring:', error);
        throw error;
    }
};


async function initializeModuleRegistry() {
    try {
        // Ensure this constructor does not need await
        const moduleRegistry = new ModuleRegistry();

        console.log("ModuleRegistry initialized successfully");
        return moduleRegistry;
    } catch (error) {
        console.error("Error initializing ModuleRegistry:", error);
    }
}
// Usage examples and helper functions
function initializeDialogStateManager() {
    // Initialize with the global module registry
    window.dialogStateManager = new DialogStateManager(window.moduleRegistry);

    // Set up monitoring
    const stopMonitoring = window.dialogStateManager.startMonitoring(500);

    // Add state change listener
    window.dialogStateManager.onStateChange((changes, summary) => {
        debug.log('Dialog state changes:', JSON.stringify(changes));
        // debug.log('Current summary:', JSON.stringify(summary));
    });

    return {
        manager: window.dialogStateManager,
        stopMonitoring
    };
}

document.addEventListener('DOMContentLoaded', async function(event) {

    debug.log("===========main===========");


    // Step 1: Initialize the module registry
    window.moduleRegistry = await initializeModuleRegistry();

    // Step 2: Register and monitor modules
    await registerAndMonitorModules(window.moduleRegistry);

    // Step 3: Initialize the dialog state manager
    const {
        manager,
        stopMonitoring
    } = initializeDialogStateManager();
    // const MultiRefModule = new BaseModule("MultiRefModule", "ref_form");

    // Step 4: Use the manager to check dialog states


    // Expose base modules to global scope
    // Object.assign(window, { MultiRefModule });

    // window.TOOLTIP_MODULE = await moduleRegistry.getModule("TooltipModule");
    // window.CITATION_POPUP = await moduleRegistry.getModule("CitationPopupDialog");
    // window.hyperLinkDialog = await moduleRegistry.getModule("HyperlinkDialogModule");
    // window.WebSpellChecker = await moduleRegistry.getModule("WebSpellChecker");
    // window.queryModule = await moduleRegistry.getModule("QueryModule");


    // Expose modules to global scope if needed
    // window.MultiRefModule = MultiRefModule;



    /*
    
    const noteModule = await BaseModule.PreLoad('guide_tour', 'guide_tour', {
        ignore_template: !0
    });
    */
    debug.log("=dynamic-complete=");

    // Utility functions for easy access
    window.getOpenDialogs = () => {
        return window.dialogStateManager ? window.dialogStateManager.getOpenDialogs() : [];
    };

    window.getActiveDialog = () => {
        return window.dialogStateManager ? window.dialogStateManager.getActiveDialog() : null;
    };

    window.isDialogOpen = (moduleNameOrId) => {
        return window.dialogStateManager ? window.dialogStateManager.isDialogOpen(moduleNameOrId) : false;
    };

    window.getDialogStatesSummary = () => {
        return window.dialogStateManager ? window.dialogStateManager.getDialogStatesSummary() : null;
    };

    window.closeSingleDialog = (moduleNameOrId) => {
        return window.dialogStateManager ? window.dialogStateManager.closeSingleDialog(moduleNameOrId) : false;
    };

    window.closeAllDialogs = () => {
        return window.dialogStateManager ? window.dialogStateManager.closeAllDialogs() : [];
    };

    // Initialize when registry is ready
    if (typeof window !== 'undefined') {
        window.initializeDialogStateManager = initializeDialogStateManager;
    }


});