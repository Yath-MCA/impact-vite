// file: ElementManager.js

/**
 * @fileoverview Comprehensive ElementManager implementation for handling DOM element management
 * @version 1.0.0
 * @license MIT
 * 
 * Browser Support:
 * - Windows: Chrome 72+, Firefox 66+, Edge 80+
 * - MAC OS: Chrome 72+, Firefox 66+, Safari 14.1+
 * - Linux: Chrome 72+, Firefox 66+
 */

(function (global, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('jquery'));
    } else {
        global.ElementManager = factory(global.jQuery);
    }
}(typeof window !== 'undefined' ? window : this, function ($) {
    'use strict';

    // Configuration constants
    var CONFIG = {
        DEFAULT_BASE_ID: 'IMP2-',
        BASE_ID_PATTERN: /^(workid-[A-Z0-9]+-[a-z]+-[a-z]+-\d+)/,
        ID_COUNTER_PATTERN: /-(\d+)$/,
        INITIALIZATION_TIMEOUT: 30000,
        POLL_INTERVAL: 100,
        DEBUG: false
    };

    // Private variables
    var instance = null;
    var initializationPromise = null;
    var readyCallbacks = [];

    /**
     * Logger utility for debugging
     * @private
     */
    var Logger = {
        log: function (message) {
            if (CONFIG.DEBUG) {
                console.log('[ElementManager]', message);
            }
        },
        error: function (message, error) {
            console.error('[ElementManager Error]', message, error);
        },
        warn: function (message) {
            console.warn('[ElementManager Warning]', message);
        }
    };

    /**
     * Event system for ElementManager
     * @private
     */
    var EventEmitter = {
        events: {},
        on: function (event, callback) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(callback);
        },
        emit: function (event, data) {
            if (this.events[event]) {
                this.events[event].forEach(function (callback) {
                    callback(data);
                });
            }
        }
    };

    /**
     * ElementManager Class
     * @class
     */
    function ElementManager() {
        if (instance) {
            return instance;
        }

        this._initialize();
        instance = this;
        return this;
    }

    ElementManager.prototype = {
        constructor: ElementManager,

        _initialize: function () {
            this._processedClasses = new Set();
            this._processedIds = new Set();
            this._elements = new Map();
            this._counters = new Map();
            this._baseId = CONFIG.DEFAULT_BASE_ID;
            this._newlyGeneratedElements = new Set();
            this._globalDocument = null;
            this._isInitialized = false;
            this._eventEmitter = Object.create(EventEmitter);
        },
        _initializeCounters: function () { },
        _findCurrentCountInDocument: function () { },
        scanDocument: function (document) {
            try {
                Logger.log('Scanning document for elements...');
                this._globalDocument = this._globalDocument || document;
                var elements = $(document).find("div").toArray();
                var baseIds = new Map();
                var hasMatchingPattern = false;

                var scannedElements = this._processElements(elements, baseIds, hasMatchingPattern);
                this._initializeCounters();

                Logger.log('Document scan complete. Found ' + scannedElements.length + ' elements');
                return scannedElements;
            } catch (error) {
                Logger.error('Error scanning document:', error);
                throw error;
            }
        },

        _processElements: function (elements, baseIds, hasMatchingPattern) {
            var self = this;
            var processedElements = [];

            elements.forEach(function (element) {
                var $el = $(element);
                var processedElement = self._processElement($el, baseIds, hasMatchingPattern);
                if (processedElement) {
                    processedElements.push(processedElement);
                }
            });

            this._updateBaseId(baseIds, hasMatchingPattern);
            return processedElements;
        },

        _processElement: function ($el, baseIds, hasMatchingPattern) {
            var id = $el.attr("id");
            var className = $el.attr("class");

            if (!id || !className || this._processedIds.has(id)) {
                return null;
            }

            this._processedClasses.add(className);
            this._processedIds.add(id);

            var baseIdMatch = id.match(CONFIG.BASE_ID_PATTERN);
            if (baseIdMatch) {
                hasMatchingPattern = true;
                var baseId = baseIdMatch[1];
                baseIds.set(baseId, (baseIds.get(baseId) || 0) + 1);
            }

            var element = {
                tag: $el.prop("tagName").toLowerCase(),
                id: id,
                className: className,
                element: $el
            };

            if (!this._elements.has(className)) {
                this._elements.set(className, []);
            }
            this._elements.get(className).push(element);

            return element;
        },


        _updateBaseId: function (baseIds, hasMatchingPattern) {
            /**
             * Update base ID based on collected IDs
             * @private
             * @param {Map} baseIds - Map of base IDs and their counts
             * @param {boolean} hasMatchingPattern - Whether matching pattern was found
             */
            try {
                if (hasMatchingPattern && baseIds.size > 0) {
                    var maxCount = 0;
                    var mostFrequentId = null;

                    baseIds.forEach(function (count, id) {
                        if (count > maxCount) {
                            maxCount = count;
                            mostFrequentId = id;
                        }
                    });

                    if (mostFrequentId) {
                        Logger.log('Updating base ID from ' + this._baseId + ' to ' + mostFrequentId);
                        this._baseId = mostFrequentId;
                    }
                } else {
                    Logger.log('No matching pattern found, keeping default base ID: ' + CONFIG.DEFAULT_BASE_ID);
                    this._baseId = CONFIG.DEFAULT_BASE_ID;
                }

                this._eventEmitter.emit('baseIdUpdated', {
                    baseId: this._baseId,
                    matchingPattern: hasMatchingPattern,
                    totalPatterns: baseIds.size
                });
            } catch (error) {
                Logger.error('Error updating base ID:', error);
                // Fallback to default
                this._baseId = CONFIG.DEFAULT_BASE_ID;
                throw error;
            }
        },

        generateId: function (className) {
            try {
                this._assertInitialized();
                this._globalDocument = this._globalDocument || window.GlobalEditor.document;

                var documentCount = this._findCurrentCountInDocument(className);
                var trackedCount = this._counters.get(className) || 0;
                var currentCount = Math.max(documentCount, trackedCount) + 1;

                this._counters.set(className, currentCount);

                var element = {
                    id: this._baseId + '-' + className + '-' + currentCount,
                    className: className,
                    isNew: true,
                    timestamp: Date.now()
                };

                this._newlyGeneratedElements.add(element);
                this._eventEmitter.emit('elementGenerated', element);

                Logger.log('Generated new element ID: ' + element.id);
                return element;
            } catch (error) {
                Logger.error('Error generating ID:', error);
                throw error;
            }
        },

        // Event handling methods
        on: function (event, callback) {
            this._eventEmitter.on(event, callback);
        },

        // Utility methods
        _assertInitialized: function () {
            if (!this._isInitialized) {
                throw new Error('ElementManager not initialized. Wait for initialization to complete.');
            }
        },

        isInitialized: function () {
            return this._isInitialized;
        },

        // Public API methods
        find: function (className) {
            this._assertInitialized();
            return this._elements.get(className) || [];
        },

        get: function (id) {
            this._assertInitialized();
            for (var elements of this._elements.values()) {
                var found = elements.find(function (el) {
                    return el.id === id;
                });
                if (found) return found;
            }
            return null;
        },

        getBaseId: function () {
            return this._baseId;
        },

        getProcessedElements: function () {
            return Array.from(this._elements.values()).flat();
        },

        reset: function () {
            Logger.log('Resetting ElementManager');
            this._initialize();
        }
    };

    /**
     * Static initialization handler
     * @private
     */
    function initializeManager(document) {
        if (initializationPromise) {
            return initializationPromise;
        }

        initializationPromise = new Promise(function (resolve, reject) {
            try {
                var manager = new ElementManager();
                manager.scanDocument(document);
                manager._isInitialized = true;

                // Set global reference
                window.elementManager = manager;

                // Dispatch ready event
                var event = new CustomEvent('elementManagerReady', {
                    detail: { manager: manager }
                });
                document.dispatchEvent(event);

                Logger.log('ElementManager initialized successfully');
                resolve(manager);
            } catch (error) {
                Logger.error('Initialization failed:', error);
                initializationPromise = null;
                reject(error);
            }
        });

        return initializationPromise;
    }

    /**
     * DOM Ready handler
     * @private
     */
    function onDOMReady() {
        return new Promise(function (resolve) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    /**
     * Initial load handler
     * @private
     */
    function waitForInitialLoad() {
        return new Promise(function (resolve, reject) {
            var timeoutId = setTimeout(function () {
                clearInterval(intervalId);
                reject(new Error('InitialLoadDialog timeout'));
            }, CONFIG.INITIALIZATION_TIMEOUT);

            var intervalId = setInterval(function () {
                if (window.InitialLoadDialog?.FullyLoaded) {
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                    resolve();
                }
            }, CONFIG.POLL_INTERVAL);
        });
    }

    // Static methods
    ElementManager.initialize = function (document) {
        return onDOMReady()
            .then(waitForInitialLoad)
            .then(function () {
                return initializeManager(GlobalEditor.document.getBody().$);
            });
    };

    ElementManager.getInstance = function () {
        if (!instance || !instance._isInitialized) {
            throw new Error('ElementManager not initialized');
        }
        return instance;
    };

    ElementManager.debug = function (enable) {
        CONFIG.DEBUG = enable;
        Logger.log('Debug mode ' + (enable ? 'enabled' : 'disabled'));
    };

    // Auto-initialization
    if (typeof window !== 'undefined') {
        ElementManager.initialize(document).catch(function (error) {
            Logger.error('Auto-initialization failed:', error);
        });
    }

    return ElementManager;
}));


// 1. Using the ready event
document.addEventListener('elementManagerReady', function (e) {
    var manager = e.detail.manager;
    // Use manager here
    var newElement = manager.generateId('ref');
    console.log(newElement);
});

// 2. Using the global instance
if (window.elementManager) {
    var element = window.elementManager.generateId('custom-class');
} else {
    // Wait for initialization
    ElementManager.initialize(document).then(function (manager) {
        var element = manager.generateId('custom-class');
    });
}

// 3. Using events
if (window.elementManager) {
    window.elementManager.on('elementGenerated', function (element) {
        console.log('New element generated:', element.id);
    });
}

// 4. Enable debug mode
ElementManager.debug(true);

// // 5. Find elements by class
// var elements = window.elementManager.find('some-class');

// // 6. Get element by ID
// var element = window.elementManager.get('some-id');
