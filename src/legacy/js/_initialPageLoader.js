/**
 * InitConfig - Configuration initialization
 * Handles URL parameters, localStorage, user info, and document setup.
 * Integrates with InitialLoadDialog and LOADING_CONFIG.
 */
(function(global) {
    'use strict';

    var STORAGE_KEYS = {
        username: function(docid) {
            return 'xmleditor:username:' + docid;
        },
        userid: function(docid) {
            return 'xmleditor:userid:' + docid;
        },
        userRole: function(docid) {
            return 'xmleditor:userRole:' + docid;
        },
        shared: function(docid) {
            return 'xmleditor:shared:' + docid;
        },
        collabEnabled: function(docid) {
            return 'xmleditor:collabEnabled:' + docid;
        },
        collabMode: function(docid) {
            return 'xmleditor:collabMode:' + docid;
        },
        loginUsername: 'xmleditor:login_username',
        loginUserid: 'xmleditor:login_userid',
        admin: 'xmleditor:admin'
    };

    /**
     * Run `fn`, swallowing/logging any error the same way everywhere.
     * @param {string} label - Name used for InitLog/ErrorLogTrace context.
     * @param {Function} fn - Work to perform.
     * @param {*} [fallback] - Value returned if `fn` throws.
     */
    function safely(label, fn, fallback) {
        try {
            return fn();
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace !== 'undefined') {
                ErrorLogTrace(label, err.message);
            }
            return fallback;
        }
    }

    function log() {
        if (global.isValidVariable(global.InitLog)) {
            global.InitLog.apply(null, ['InitConfig'].concat(Array.prototype.slice.call(arguments)));
        }
    }

    function isEmptyish(value) {
        return !value || /null|undefined/gi.test(value);
    }

    var InitConfig = function() {
        this.urlParams = {};
        this.isInitialized = false;
    };

    /**
     * Parse URL parameters from window.location.search
     * @returns {object} Parsed URL parameters
     */
    InitConfig.prototype.parseURLParams = function() {
        var self = this;
        return safely('parseURLParams', function() {
            var pageQuery = decodeURIComponent(window.location.search.substring(1));
            var pairs = pageQuery.includes('&') ? pageQuery.split('&') : [pageQuery];
            var params = {};

            pairs.forEach(function(pair) {
                var parts = pair.split('=');
                if (parts.length === 2) {
                    params[parts[0]] = parts[1];
                }
            });

            self.urlParams = params;
            log('URL params parsed', params);
            return params;
        }, {});
    };

    /**
     * Get a single URL parameter by key, parsing the query string lazily.
     * @param {string} key
     * @returns {string|null}
     */
    InitConfig.prototype.getURLParam = function(key) {
        var self = this;
        return safely('getURLParam', function() {
            if (!self.urlParams || Object.keys(self.urlParams).length === 0) {
                self.parseURLParams();
            }
            return self.urlParams[key] || null;
        }, null);
    };

    /**
     * Initialize document ID from the URL, wiring it up to DOC_INFO / getDataRecord.
     * @returns {boolean} Success status
     */
    InitConfig.prototype.initDocumentID = function() {
        var self = this;
        return safely('initDocumentID', function() {
            var docid = self.getURLParam('docid');
            log('initDocumentID found docid', docid);

            if (!global.isValidVariable(docid)) {
                return false;
            }

            if (!global.isValidVariable(global.DOC_ID)) {
                global.DOC_ID = docid;
            }

            if (global.isValidVariable(global.DOC_INFO) && global.DOC_INFO.set) {
                global.DOC_INFO.set('DOC_ID', docid);
            }

            if (global.isValidVariable(global.getDataRecord) && global.getDataRecord.find) {
                global.getDataRecord.find.docid = docid;
            }

            global.DOC_ID_READY = true;

            if (typeof global.dispatchEvent === 'function') {
                safely('initDocumentID:dispatchEvent', function() {
                    global.dispatchEvent(new CustomEvent('xmleditor:docid-initialized', {
                        detail: {
                            docid: docid
                        }
                    }));
                });
            }

            return true;
        }, false);
    };

    /**
     * Initialize user information from localStorage / SHARED_KEY.
     * @returns {boolean} Success status
     */
    InitConfig.prototype.initUserInfo = function() {
        return safely('initUserInfo', function() {
            if (!global.isValidVariable(global.DOC_ID)) {
                console.warn('DOC_ID not set');
                return false;
            }

            if (!global.isValidVariable(global.USER_INFO)) {
                global.USER_INFO = {};
            }

            var docid = global.DOC_ID;
            var userInfo = global.USER_INFO;
            var sharedKey = global.SHARED_KEY || {};
            var sharedEmail = sharedKey.username ||
                (Array.isArray(sharedKey.emailto) ? sharedKey.emailto[0] : sharedKey.emailto);

            // Document-specific info first, falling back to the loaded shared key.
            userInfo.MAIL_ID = localStorage.getItem(STORAGE_KEYS.username(docid));
            userInfo.USER_ID = localStorage.getItem(STORAGE_KEYS.userid(docid));

            if (isEmptyish(userInfo.MAIL_ID) && sharedEmail) {
                userInfo.MAIL_ID = sharedEmail;
            }

            if (isEmptyish(userInfo.USER_ID)) {
                userInfo.USER_ID = sharedKey._id || sharedKey.userid || sharedKey.user_id || '';
            }

            userInfo.HAS_COLLAB_WORKFLOW = typeof global.isCollabSessionEnabled === 'function' ?
                global.isCollabSessionEnabled(docid, sharedKey.client, sharedKey.collaborative) :
                (typeof global.isCollabEnabled === 'function' && global.isCollabEnabled(docid));

            log('User info loaded from shared key/localStorage', userInfo);

            // Fallback to generic localhost-only keys.
            if (global.isValidVariable(global.IS_LOCAL_HOST) && global.IS_LOCAL_HOST) {
                if (isEmptyish(userInfo.MAIL_ID)) {
                    userInfo.MAIL_ID = localStorage.getItem(STORAGE_KEYS.loginUsername);
                }
                if (isEmptyish(userInfo.USER_ID)) {
                    userInfo.USER_ID = localStorage.getItem(STORAGE_KEYS.loginUserid);
                }

                if (userInfo.MAIL_ID) {
                    localStorage.setItem(STORAGE_KEYS.username(docid), userInfo.MAIL_ID);
                }

                var role = localStorage.getItem('xmleditor:userRole');
                if (role && !isEmptyish(role)) {
                    localStorage.setItem(STORAGE_KEYS.userRole(docid), role);
                }
            }

            if (userInfo.MAIL_ID) {
                userInfo.MAIL_ID_PREFIX = userInfo.MAIL_ID.split('@')[0].trim();
            }

            return !!userInfo.MAIL_ID;
        }, false);
    };

    /**
     * Load shared key configuration from local/session storage.
     * @returns {object|null} SHARED_KEY object or null
     */
    InitConfig.prototype.loadSharedKey = function() {
        return safely('loadSharedKey', function() {
            if (!global.isValidVariable(global.DOC_ID)) {
                return null;
            }

            var storageKey = STORAGE_KEYS.shared(global.DOC_ID);
            var raw = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);

            if (!global.isValidVariable(raw)) {
                return null;
            }

            var sharedKey = JSON.parse(raw);
            var meta = sharedKey.shared_key || sharedKey.sharedKey || {};

            sharedKey.docid = sharedKey.docid || global.DOC_ID;
            sharedKey.username = sharedKey.username || meta.username || meta.user || '';
            sharedKey.emailto = sharedKey.emailto || meta.emailto || meta.email || '';
            sharedKey._id = sharedKey._id || sharedKey.userid || sharedKey.user_id ||
                meta._id || meta.userid || meta.user_id || '';
            sharedKey.client = sharedKey.client || meta.client || '';
            sharedKey.collaborative = sharedKey.collaborative || meta.collaborative || '';

            global.SHARED_KEY = sharedKey;
            log('Shared key loaded', sharedKey);
            return sharedKey;
        }, null);
    };

    /**
     * Explicitly enable collaborative metadata for the current shared key.
     * Request-based; loadSharedKey never enables collaboration by itself.
     * @param {object|function} options - Options or callback
     * @param {function} [callback] - Completion callback
     * @returns {object} Result object
     */
    InitConfig.prototype.enableCollaborativeSharedKey = function(options, callback) {
        var self = this;

        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        options = options || {};
        callback = typeof callback === 'function' ? callback : function() {};

        var result = safely('enableCollaborativeSharedKey', function() {
            var docid = options.docid || global.DOC_ID;
            if (!global.isValidVariable(docid)) {
                return {
                    r: 0,
                    docid: docid || '',
                    message: 'DOC_ID not set.'
                };
            }

            var allowed = options.force === true || global.IS_LOCAL_HOST || global.IS_UAT_DOMAIN;
            if (!allowed) {
                return {
                    r: 0,
                    docid: docid,
                    message: 'Collaborative shared key enablement is allowed only in local/UAT.'
                };
            }

            var sharedKey = global.SHARED_KEY;
            if (!global.isValidVariable(sharedKey) || typeof sharedKey !== 'object') {
                sharedKey = self.loadSharedKey();
            }
            if (!global.isValidVariable(sharedKey) || typeof sharedKey !== 'object') {
                return {
                    r: 0,
                    docid: docid,
                    message: 'SHARED_KEY not available.'
                };
            }

            sharedKey.docid = sharedKey.docid || docid;
            sharedKey.collaborative = 'yes';
            global.SHARED_KEY = sharedKey;

            localStorage.setItem(STORAGE_KEYS.shared(docid), JSON.stringify(sharedKey));
            localStorage.setItem(STORAGE_KEYS.collabEnabled(docid), 'true');
            localStorage.setItem(STORAGE_KEYS.collabMode(docid), 'collaborative');

            return {
                r: 1,
                docid: docid,
                sharedKey: sharedKey,
                reloadRequired: options.reload !== false
            };
        }, {
            r: 0,
            docid: (options && options.docid) || global.DOC_ID || '',
            message: 'Unknown error'
        });

        callback(result);
        return result;
    };

    /**
     * Initialize document configuration and kick off loading.
     * @returns {boolean} Success status
     */
    InitConfig.prototype.initLoadingConfig = function() {
        return safely('initLoadingConfig', function() {
            log('initLoadingConfig starting');

            var sharedKey = global.SHARED_KEY;
            if (!global.isValidVariable(sharedKey) || !sharedKey.docid || !sharedKey.dtd) {
                console.warn('SHARED_KEY not properly configured');
                return false;
            }

            if (typeof global.setDOC_INFO === 'function') {
                global.setDOC_INFO(sharedKey);
            }

            if (global.isValidVariable(global.InitialLoadDialog)) {
                global.InitialLoadDialog.updateProgress(2);
            }

            if (!sharedKey.projectname) {
                if (sharedKey.titleinfo && sharedKey.titleinfo.projectname) {
                    sharedKey.projectname = sharedKey.titleinfo.projectname;
                }

                var canFetchProjectData = global.IS_LOCAL_HOST && !sharedKey.projectname &&
                    global.isValidVariable(global.commonfn) && global.commonfn.callajax;

                if (canFetchProjectData) {
                    var endpoint = global.isValidVariable(global.API_GET_DOCS) ? global.API_GET_DOCS : null;
                    if (endpoint) {
                        setTimeout(function() {
                            global.commonfn.callajax(global.getDataRecord, 'getProjectData', endpoint, {
                                Init: true
                            });
                        }, 5000);
                    }
                }
            }

            if (global.isValidVariable(global.LOADING_CONFIG) && global.LOADING_CONFIG.Init) {
                global.LOADING_CONFIG.Init(sharedKey);
            }

            return true;
        }, false);
    };

    /**
     * Mark the current user as admin (or not) based on ADMIN_USER_IDs.
     */
    InitConfig.prototype.IsAdmin = function() {
        safely('IsAdmin', function() {
            var isAdmin = global.ADMIN_USER_IDs.includes(global.USER_INFO.MAIL_ID_PREFIX) &&
                !(global.SHARED_KEY && global.SHARED_KEY.apikey);
            global.USER_INFO.IS_ADMIN = isAdmin;

            if (isAdmin) {
                localStorage.setItem(STORAGE_KEYS.admin, 'superadmin');
            } else {
                localStorage.removeItem(STORAGE_KEYS.admin);
            }
        });
    };

    /**
     * Check user access and refresh admin status.
     * @returns {boolean} Has valid access
     */
    InitConfig.prototype.checkAccess = function() {
        var self = this;
        return safely('checkAccess', function() {
            log('Checking access for', global.USER_INFO.MAIL_ID);

            if (!global.isValidVariable(global.USER_INFO.MAIL_ID)) {
                if (typeof global.Invalid_Access === 'function') {
                    global.Invalid_Access();
                }
                return false;
            }

            if (typeof self.IsAdmin === 'function') {
                self.IsAdmin();
            }

            return true;
        }, false);
    };

    /**
     * Kick off admin-only initialization (project data fetch).
     */
    InitConfig.prototype.handleAdminInit = function() {
        safely('handleAdminInit', function() {
            if (!global.isValidVariable(global.USER_INFO)) {
                return;
            }

            if (global.commonfn && global.commonfn.callajax) {
                setTimeout(function() {
                    global.commonfn.callajax(
                        global.getDataRecord,
                        'getProjectData',
                        global.isValidVariable(global.API_GET_DOCS) ? global.API_GET_DOCS : null
                    );
                }, 1000);
            }
        });
    };

    InitConfig.prototype.run = function() {
        var self = this;
        return safely('InitConfig.run', function() {
            self.logInitStart();

            if (!self.initDocumentID()) {
                return self.fail('Failed to initialize document ID', global.Invalid_Access);
            }

            var sharedKey = self.loadSharedKey();
            if (!global.isValidVariable(sharedKey)) {
                return self.handleMissingSharedKey();
            }

            if (!self.validateUserAccess()) {
                return false;
            }

            self.initLoadingConfig();
            self.isInitialized = true;
            return true;
        }, false);
    };

    /* ---------- Helpers ---------- */

    InitConfig.prototype.logInitStart = function() {
        log('Run sequence started');
        if (global.isValidVariable(global.debug) && global.debug.log) {
            global.debug.log('==InitConfig==');
        }
    };

    InitConfig.prototype.fail = function(message, callback) {
        console.warn(message);
        if (typeof callback === 'function') {
            callback();
        }
        return false;
    };

    InitConfig.prototype.validateUserAccess = function() {
        if (!this.initUserInfo()) {
            return this.fail('Failed to initialize user info', global.Invalid_Access);
        }
        if (!this.checkAccess()) {
            return this.fail('User access denied', global.Invalid_Access);
        }

        return true;
    };

    InitConfig.prototype.handleMissingSharedKey = function() {
        console.warn('No shared key found in localStorage');
        if (!this.validateUserAccess()) {
            return false;
        }

        var userInfo = global.USER_INFO;
        if (userInfo && userInfo.MAIL_ID && (userInfo.IS_ADMIN || global.IS_LOCAL_HOST)) {
            this.handleAdminInit();
        }

        return true;
    };

    // ============ Expose API ============
    global.InitConfig = InitConfig;
    global.INIT_CONFIG = new InitConfig();
    global.enableCollaborativeSharedKey = function(options, callback) {
        return global.INIT_CONFIG.enableCollaborativeSharedKey(options, callback);
    };

    function startInitConfig() {
        setTimeout(function() {
            global.INIT_CONFIG.run();
        }, 100);
    }

    // Auto-run on document ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startInitConfig);
    } else {
        startInitConfig();
    }

})(window);