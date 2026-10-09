/**
 * Loading Integration - Connects LoadingConfig batch loading with InitialLoadDialog progress
 * This file should be included after both loading-config-class-es5.js and initial-load-dialog-es5.js
 */
(function (global) {


    'use strict';


    // Toggle console logs for initialization
    global.ENABLE_INIT_LOGS = false;

    /**
     * Common logging function
     * @param {string} method - Method name
     * @param {string} message - Log message
     * @param {any} [data] - Optional data to log
     */
    global.InitLog = function (method, message, data) {
        if (global.isValidVariable(global.ENABLE_INIT_LOGS) && global.ENABLE_INIT_LOGS == true) {
            var prefix = '[Initializer][' + method + '] ';
            if (data !== undefined) {
                console.log(prefix + message, data);
            } else {
                console.log(prefix + message);
            }
        }
    };

    /**
     * Common variable validation
     * @param {any} variable - Variable to check
     * @returns {boolean} - True if valid
     */
    global.isValidVariable = function (variable) {
        return variable !== null &&
            variable !== undefined &&
            variable !== "" &&
            variable !== "null" &&
            variable !== "undefined" &&
            variable !== false;
    };

    /**
     * Hook into LoadingConfig to update progress dialog
     */
    if (global.isValidVariable(global.LOADING_CONFIG) && global.isValidVariable(global.InitialLoadDialog)) {

        var originalPrepareUrls = global.LOADING_CONFIG.PREPARE_URLS;
        global.LOADING_CONFIG.PREPARE_URLS = function () {
            try {
                if (global.isValidVariable(global.InitLog)) {
                    global.InitLog('PREPARE_URLS', 'Called');
                }
                // Start progress dialog
                if (global.isValidVariable(global.InitialLoadDialog)) {
                    // global.InitialLoadDialog.updateProgress(1);
                }

                return originalPrepareUrls.call(this);
            } catch (err) {
                console.warn(err.message);
            }
        };

        var originalBatchFetch = global.LOADING_CONFIG.BATCH_FETCH;
        global.LOADING_CONFIG.BATCH_FETCH = function (urls, callback) {
            try {
                if (global.isValidVariable(global.InitLog)) {
                    global.InitLog('BATCH_FETCH', 'Called with ' + (urls ? urls.length : 0) + ' URLs');
                }
                if (global.isValidVariable(global.InitialLoadDialog)) {
                    // global.InitialLoadDialog.updateProgress(2);
                }

                var self = this;
                var wrappedCallback = function () {
                    if (global.isValidVariable(global.InitLog)) {
                        global.InitLog('BATCH_FETCH', 'Callback received');
                    }
                    if (global.isValidVariable(global.InitialLoadDialog)) {
                        // global.InitialLoadDialog.updateProgress(8);
                    }
                    if (typeof callback === 'function') callback();
                };

                return originalBatchFetch.call(this, urls, wrappedCallback);
            } catch (err) {
                console.warn(err.message);
            }
        };

        var originalProcessResponses = global.LOADING_CONFIG.PROCESS_RESPONSES;
        global.LOADING_CONFIG.PROCESS_RESPONSES = function (callback) {
            try {
                if (global.isValidVariable(global.InitLog)) {
                    global.InitLog('PROCESS_RESPONSES', 'Called');
                }
                var self = this;

                this.BATCH_URLS.forEach(function (item) {
                    var response = self.BATCH_RESPONSES[item.url];
                    if (response && response.status === 200) {
                        item.method.handleResponse.call(item.method, response, self);

                        if (global.isValidVariable(global.InitLog)) {
                            global.InitLog('PROCESS_RESPONSES', 'Processed ' + item.url + ' (Order: ' + item.method.ORDER + ')');
                        }

                        // Update dialog based on config type (Meta=1, Ico=2, Lang=3, Client=5, Ceg=6)
                        if (global.isValidVariable(global.InitialLoadDialog)) {
                            if (item.method.ORDER === 1) {
                                // global.InitialLoadDialog.updateProgress(2);
                            } else if (item.method.ORDER === 2) {
                                // global.InitialLoadDialog.updateProgress(3);
                            } else if (item.method.ORDER === 3) {
                                // global.InitialLoadDialog.updateProgress(4);
                            } else if (item.method.ORDER === 5) {
                                // global.InitialLoadDialog.updateProgress(5);
                            } else if (item.method.ORDER === 6) {
                                global.InitialLoadDialog.updateProgress(2);
                            }
                        }
                    }
                });

                if (typeof callback === 'function') callback();
            } catch (err) {
                console.warn(err.message);
            }
        };

        // Override Init to trigger dialog
        var originalInit = global.LOADING_CONFIG.Init;
        global.LOADING_CONFIG.Init = function (SHARED_KEY) {
            try {
                if (global.isValidVariable(global.InitLog)) {
                    global.InitLog('Init', 'Called', SHARED_KEY);
                }
                // Ensure dialog is initialized first
                if (global.isValidVariable(global.InitialLoadDialog)) {
                    global.InitialLoadDialog.init();
                    global.InitialLoadDialog.updateProgress(1);
                }

                return originalInit.call(this, SHARED_KEY);
            } catch (err) {
                console.warn(err.message);
            }
        };

        // Auto-complete when all resources loaded
        if (global.isValidVariable(global.LOADING_CONFIG) && global.isValidVariable(global.InitialLoadDialog)) {
            var checkCompletion = setInterval(function () {
                try {
                    if (global.isValidVariable(global.LOADING_CONFIG.BATCH_RESPONSES) && Object.keys(global.LOADING_CONFIG.BATCH_RESPONSES).length > 0) {
                        var allLoaded = global.LOADING_CONFIG.BATCH_URLS.every(function (item) {
                            var response = global.LOADING_CONFIG.BATCH_RESPONSES[item.url];
                            return response && response.status === 200;
                        });

                        if (allLoaded && global.LOADING_CONFIG.BATCH_URLS.length > 0) {
                            if (global.isValidVariable(global.InitLog)) {
                                global.InitLog('CompletionCheck', 'All resources loaded, completing dialog');
                            }
                            // global.InitialLoadDialog.complete();
                            clearInterval(checkCompletion);
                        }
                    }
                } catch (err) {
                    console.warn(err.message);
                }
            }, 500);
        }
    }

})(window);