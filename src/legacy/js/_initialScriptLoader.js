(function(global) {
    'use strict';

    // ============ LoadingConfig Constructor ============
    var LoadingConfig = function() {
        this.CLIENT = {};
        this.FOLDER_PATH = 'assets/' + (global.isValidVariable(global.VERSION) ? global.VERSION : '') + '/config/';
        this.BATCH_URLS = [];
        this.BATCH_URLS = [];
        this.BATCH_RESPONSES = {};

        this.META_CONFIG = new MetaConfig(this);
        this.CLIENT_CONFIG = new ClientConfig(this);
        this.CEG_CONFIG = new CegConfig(this);
        this.LANG_CONFIG = new LangConfig(this);
        this.ICO_FILE = new IcoFile(this);
    };

    LoadingConfig.prototype.GET_ATTR = function(target) {
        try {
            var attrs = Array.prototype.slice.call(target.attributes);
            var result = {};
            attrs.forEach(function(attr) {
                var obj = {};
                obj[attr.name] = attr.value;
                Object.assign(result, obj);
            });
            return result;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('GET_ATTR', err.message);
        }
    };

    LoadingConfig.prototype.PREPARE_URLS = function() {
        try {
            if (global.isValidVariable(global.InitLog)) {
                global.InitLog('LoadingConfig', 'Preparing URLs');
            }
            this.BATCH_URLS = [];
            var items = [
                this.META_CONFIG,
                this.ICO_FILE,
                this.LANG_CONFIG,
                this.CLIENT_CONFIG,
                this.CEG_CONFIG
            ];

            var self = this;
            if (IS_TRACK_VIEW == undefined || IS_TRACK_VIEW == null) {
                IS_TRACK_VIEW = window.location.href.includes("editor6TrackView");
            }
            items.forEach(function(item) {
                if (IS_TRACK_VIEW && item.IGNORE_TRACK) return;
                if (item.fireOnce) {
                    item.fireOnce();
                    if (item.URL && item.URL.length > 6) {
                        self.BATCH_URLS.push({
                            url: item.URL,
                            method: item,
                            order: item.ORDER || 999
                        });
                    }
                }
            });

            return this.BATCH_URLS;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('PREPARE_URLS', err.message);
        }
    };

    LoadingConfig.prototype.BATCH_FETCH = function(urls, callback) {
        try {
            if (global.isValidVariable(global.InitLog)) {
                global.InitLog('LoadingConfig', 'BATCH_FETCH starting for ' + urls.length + ' URLs');
            }
            var self = this;
            var completed = 0;
            var total = urls.length;

            if (total === 0) {
                if (typeof callback === 'function') callback();
                return;
            }

            urls.forEach(function(item) {
                var req = new XMLHttpRequest();

                req.onreadystatechange = function() {
                    if (this.readyState == 4) {
                        self.BATCH_RESPONSES[item.url] = {
                            status: this.status,
                            responseXML: this.responseXML,
                            responseText: this.responseText,
                            responseURL: this.responseURL
                        };

                        completed++;

                        if (completed === total) {
                            self.PROCESS_RESPONSES(callback);
                            self.isFullyLoaded = true;
                        }
                    }
                };

                req.onerror = function() {
                    completed++;
                    console.error("Failed to load: " + item.url);
                    if (completed === total) {
                        self.PROCESS_RESPONSES(callback);
                        self.isFullyLoaded = true;
                    }
                };

                req.open("GET", item.url, true);
                req.send();
            });
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('BATCH_FETCH', err.message);
        }
    };

    LoadingConfig.prototype.PROCESS_RESPONSES = function(callback) {
        try {
            if (global.isValidVariable(global.InitLog)) {
                global.InitLog('LoadingConfig', 'Processing responses');
            }
            var self = this;

            this.BATCH_URLS.forEach(function(item) {
                var response = self.BATCH_RESPONSES[item.url];
                if (response && response.status === 200) {
                    item.method.handleResponse.call(item.method, response, self);
                }
            });

            if (typeof callback === 'function') callback();
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('PROCESS_RESPONSES', err.message);
        }
    };

    LoadingConfig.prototype.Init = function(SHARED_KEY) {
        try {
            if (global.isValidVariable(global.InitLog)) {
                global.InitLog('LoadingConfig', 'Init called with SHARED_KEY', SHARED_KEY);
            }
            const dtdValue = SHARED_KEY.type ?
                SHARED_KEY.type :
                (SHARED_KEY.dtd === "BITS" ? "books" : "journals");

            this.CLIENT = {
                NAME: {
                    UPPER: SHARED_KEY.client.toLocaleUpperCase(),
                    LOWER: SHARED_KEY.client.toLocaleLowerCase()
                },
                DTD: {
                    UPPER: dtdValue.toLocaleUpperCase(),
                    LOWER: dtdValue.toLocaleLowerCase()
                }
            };


            var self = this;
            var urls = this.PREPARE_URLS();

            console.log("Batch URLs prepared:", urls);

            this.BATCH_FETCH(urls, function() {
                console.log("All resources loaded successfully");
                self.isFullyLoaded = true;
                // Flow B: session gate before openhtml; canLoadEditor set only after gate passes
                if (global.InitialLoadDialog && typeof global.InitialLoadDialog.runConfigCompleteGate === 'function') {
                    global.InitialLoadDialog.runConfigCompleteGate().then(function(ok) {
                        if (ok) {
                            self.canLoadEditor = true;
                            if (global.EDITOR_INITIALIZE && typeof global.EDITOR_INITIALIZE.TRY_START === 'function') {
                                global.EDITOR_INITIALIZE.TRY_START();
                            }
                        } else {
                            console.warn('[LOADING_CONFIG] Session gate failed — openhtml blocked');
                        }
                    }).catch(function(err) {
                        console.warn('[LOADING_CONFIG] Session gate error:', err && err.message);
                    });
                } else {
                    self.canLoadEditor = true;
                }
            });
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('LOADING_CONFIG_INIT', err.message);
        }
    };

    LoadingConfig.prototype.SET_EDITOR_LAYOUT_CONFIG = function() {
        try {
            var defaultConfig = {
                editor6: 'default',
                readOnly: 'default'
            };

            global.EDITOR_LAYOUT_CONFIG = Object.assign({}, defaultConfig);

            if (!global.I_CONFIG || !global.I_CONFIG.querySelector) {
                return global.EDITOR_LAYOUT_CONFIG;
            }

            var layoutNode = global.I_CONFIG.querySelector('[name="editor6Layout"]');

            if (layoutNode && layoutNode.getAttribute('editor6') === 'three-column') {
                global.EDITOR_LAYOUT_CONFIG.editor6 = 'three-column';
            }

            if (layoutNode) {
                global.EDITOR_LAYOUT_CONFIG.readOnly =
                    layoutNode.getAttribute('read-only') ||
                    layoutNode.getAttribute('readOnly') ||
                    global.EDITOR_LAYOUT_CONFIG.readOnly;
            }

            if (global.editorLayout && typeof global.editorLayout.applyMetaConfig === 'function') {
                global.editorLayout.applyMetaConfig(global.EDITOR_LAYOUT_CONFIG);
            }

            return global.EDITOR_LAYOUT_CONFIG;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('SET_EDITOR_LAYOUT_CONFIG', err.message);
        }
    };

    // ============ MetaConfig Constructor ============
    var MetaConfig = function(parent) {
        this.parent = parent;
        this.IGNORE_TRACK = false;
        this.ORDER = 1;
        this.FILE_NAME = "config.xml";
        this.URL = "";
        this.FOLDER_PATH = parent.FOLDER_PATH;
        this.CONFIG_PATH = "";
    };

    MetaConfig.prototype.GET_SET_URL = function() {
        try {
            this.CONFIG_PATH = this.FOLDER_PATH + this.parent.CLIENT.DTD.LOWER + '/' + this.parent.CLIENT.NAME.LOWER + '/';
            this.URL = this.CONFIG_PATH + this.FILE_NAME;
            return this.URL;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('META_CONFIG_FETCH', err.message);
        }
    };

    MetaConfig.prototype.handleResponse = function(response, parent) {
        try {
            if (global.isValidVariable(global.InitLog)) {
                global.InitLog('MetaConfig', 'handleResponse');
            }

            global.I_CONFIG = response.responseXML;
            parent.SET_EDITOR_LAYOUT_CONFIG();

            if (global.isValidVariable(global.SHARED_KEY) && global.SHARED_KEY.dtd && (global.SHARED_KEY.apikey || (global.isValidVariable(global.IS_LOCAL_HOST) && global.IS_LOCAL_HOST))) {
                setTimeout(function() {
                    if (global.isValidVariable(global.UI_CONFIGURATION)) global.UI_CONFIGURATION('menuoption', global.SHARED_KEY);
                    if (global.isValidVariable(global.InitialLoadDialog)) global.InitialLoadDialog.progressValue = 1;
                    global.GENERATE = I_CONFIG.querySelector('[name=Generate_Items]');
                    if (global.isValidVariable(global.GENERATE)) {
                        global.FIG_CAP = global.GENERATE.getAttribute('figCap');
                        global.TAB_CAP = global.GENERATE.getAttribute('tabCap');
                    }
                }, 1500);
            }
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('META_CONFIG_HANDLE', err.message);
        }
    };

    MetaConfig.prototype.fireOnce = function() {
        this.GET_SET_URL();
    };

    // ============ ClientConfig Constructor ============
    var ClientConfig = function(parent) {
        this.parent = parent;
        this.IGNORE_TRACK = false;
        this.ORDER = 5;
        this.FILE_NAME = "";
        this.TYPE = "SPLIT";
        this.URL = "";
        this.IS_LOADED = false;
        this.XML_DOC = null;
        this.SEPARATE_FILE = true;
    };

    ClientConfig.prototype.FIRE = function() {
        try {
            var journal_Config = this.XML_DOC.documentElement;
            if (!journal_Config || !global.isValidVariable(global.SHORT_II_TITLE)) return this.RETRY();
            if (journal_Config) global.J_CONFIG = journal_Config;

            var roots = ['Reference', 'Figure', 'Table'];
            var self = this;
            roots.forEach(function(root, idx) {
                if (!iREF_SCOPE[root]) iREF_SCOPE[root] = {};
                if (journal_Config) {
                    var root_config = journal_Config.querySelector(root);
                    Object.assign(iREF_SCOPE[root], self.parent.GET_ATTR(root_config));

                    var types = ['dircite', 'indircite', 'caption', 'label', 'citation', 'wrapfooter'];
                    types.forEach(function(type) {
                        var temp = journal_Config.querySelector(root + " " + type);
                        if (!temp || (temp.hasAttribute("notallowed") && temp.getAttribute("notallowed") == "yes")) return;
                        if (!iREF_SCOPE[root][type]) iREF_SCOPE[root][type] = {};
                        iREF_SCOPE[root][type] = self.parent.GET_ATTR(temp);
                    });

                    if (root_config && idx == 0) {
                        iREF_SCOPE.IS_NAME_DATE = root_config.getAttribute('data-label-format') == 'unnumbered';
                        var CitationConfig = journal_Config.querySelector("citation");
                        if (CitationConfig && CitationConfig.getAttribute("type") == "FOOTNOTE") {
                            if (global.isValidVariable(global.debug)) global.debug.log("FOOTNOTE FOLLOWED - RETURN");
                        }
                    }
                }
            });
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('CLIENT_CONFIG_FIRE', err.message);
        }
    };

    ClientConfig.prototype.RETRY = function() {
        try {
            if (!global.isValidVariable(global.SHARED_KEY)) return;
            var title = SHARED_KEY.projecttitle;
            var FETCH_TITLE = "";
            var eles = I_CONFIG.querySelectorAll('[journal-title]');
            for (var i = 0; i < eles.length; i++) {
                if (eles[i].getAttribute('journal-title').toLocaleUpperCase() == title.toLocaleUpperCase()) {
                    FETCH_TITLE = eles[i].tagName;
                    break;
                }
            }
            if (FETCH_TITLE != SHORT_TITLE && I_CONFIG.querySelector(FETCH_TITLE)) {
                global.SHORT_TITLE = FETCH_TITLE;
            }
            global.SHORT_II_TITLE = global.SHORT_TITLE = FETCH_TITLE.replace("..", "");
            return SHORT_II_TITLE;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('CLIENT_CONFIG_RETRY', err.message);
        }
    };

    ClientConfig.prototype.GET_SET_URL = function() {
        try {
            if (!global.isValidVariable(global.SHARED_KEY) || !global.SHARED_KEY.dtd) return;

            if (!SHARED_KEY.type) {
                SHARED_KEY.type = SHARED_KEY.dtd == 'JATS' ? 'Journals' : 'Books';
            }

            if (global.IS_JOURNAL) {
                if (SHARED_KEY.titleinfo && SHARED_KEY.titleinfo.cover) {
                    global.SHORT_TITLE = SHARED_KEY.titleinfo.cover;
                } else {
                    if (SHARED_KEY.shorttitle) global.SHORT_TITLE = SHARED_KEY.shorttitle;
                    else this.IS_RETRY = true;
                }
            } else {
                global.SHORT_TITLE = SHARED_KEY.client;
            }

            if (SHARED_KEY.refstyle && global.IS_JOURNAL) {
                this.STYLE = SHARED_KEY.refstyle;
                global.SHORT_TITLE = SHORT_TITLE.concat('_', SHARED_KEY.refstyle);
            }

            global.SHORT_II_TITLE = global.SHORT_TITLE = SHORT_TITLE.replace("..", "");

            // Build split config path
            if (this.SEPARATE_FILE && SHORT_TITLE) {
                this.FILE_NAME = SHORT_TITLE + ".xml";
                this.URL = this.parent.META_CONFIG.CONFIG_PATH + "split/" + this.FILE_NAME;
                return this.URL;
            }
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('CLIENT_CONFIG_FETCH', err.message);
        }
    };

    ClientConfig.prototype.handleResponse = function(response, parent) {
        try {
            if (global.isValidVariable(global.InitLog)) {
                global.InitLog('ClientConfig', 'handleResponse');
            }
            this.IS_LOADED = true;
            this.XML_DOC = response.responseXML;
            this.FIRE();
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('CLIENT_CONFIG_HANDLE', err.message);
        }
    };

    ClientConfig.prototype.fireOnce = function() {
        this.SEPARATE_FILE = true;
        this.GET_SET_URL();
    };

    // ============ CegConfig Constructor ============
    var CegConfig = function(parent) {
        this.parent = parent;
        this.IGNORE_TRACK = true;
        this.ORDER = 6;
        this.STYLE = "";
        this.URL = "";
        this.TYPE = "SEPARATE";
        this.IS_LOADED = false;
        this.IS_RETRY = false;
    };

    CegConfig.prototype.GET_SET_URL = function() {
        try {
            if (!global.isValidVariable(global.SHORT_II_TITLE)) return;

            var reTry = false;
            this.FILE_NAME = SHORT_II_TITLE + ".xml";

            if (global.isValidVariable(global.SHARED_KEY)) {
                if (!global.IS_JOURNAL && global.SHARED_KEY.refstyle) {
                    this.FILE_NAME = SHARED_KEY.refstyle + ".xml";
                }
            }

            var encodedFileName = encodeURIComponent(this.FILE_NAME);

            if (!reTry && (SHORT_II_TITLE || (!global.IS_JOURNAL && encodedFileName))) {
                this.URL = this.parent.META_CONFIG.CONFIG_PATH + "ceg/refStyling_" + encodedFileName;
            } else {
                this.IS_RETRY = true;
            }
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('CEG_CONFIG_FETCH', err.message);
        }
    };

    CegConfig.prototype.handleResponse = function(response, parent) {
        try {
            if (global.isValidVariable(global.InitLog)) {
                global.InitLog('CegConfig', 'handleResponse');
            }
            iREF_SCOPE['DOC'] = response.responseXML;
            var temp = iREF_SCOPE['DOC'].querySelector('trim[name="author"]');
            if (temp) {
                if (!iREF_SCOPE["Reference"]) iREF_SCOPE["Reference"] = {};
                iREF_SCOPE["Reference"]["author"] = this.parent.GET_ATTR(temp);
            }
            this.IS_LOADED = true;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('CEG_CONFIG_HANDLE', err.message);
        }
    };

    CegConfig.prototype.fireOnce = function() {
        this.GET_SET_URL();
    };

    // ============ LangConfig Constructor ============
    var LangConfig = function(parent) {
        this.parent = parent;
        this.IGNORE_TRACK = true;
        this.ORDER = 3;
        this.DEFAULT = "en";
        this.URL = "";
        this.IS_LOADED = false;
        this.FOLDER_PATH = 'assets/' + (global.isValidVariable(global.VERSION) ? global.VERSION : '') + '/config';
    };

    LangConfig.prototype.GET_SET_URL = function() {
        try {
            this.URL = this.FOLDER_PATH + '/lang/' + this.DEFAULT + '.js';
            return this.URL;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('LANG_CONFIG_FETCH', err.message);
        }
    };

    LangConfig.prototype.handleResponse = function(response, parent) {
        try {
            if (global.isValidVariable(global.InitLog)) {
                global.InitLog('LangConfig', 'handleResponse');
            }
            this.IS_LOADED = true;
            var filter = response.responseText.slice((this.DEFAULT.length + 1), -1);
            if (filter.indexOf('"=') === 0) filter = filter.slice(2);
            else if (filter.indexOf('=') === 0) filter = filter.slice(1);
            if (filter.slice(-1) === '"') filter = filter.slice(0, -1);

            var stringfy = JSON.stringify(filter);
            var json = JSON.parse(JSON.parse(stringfy));
            if (!global.IMPACT) global.IMPACT = {};
            if (!global.IMPACT.lang) global.IMPACT.lang = {};
            global.IMPACT.lang[this.DEFAULT] = json;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('LANG_CONFIG_HANDLE', err.message);
        }
    };

    LangConfig.prototype.fireOnce = function() {
        this.GET_SET_URL();
    };

    // ============ IcoFile Constructor ============
    var IcoFile = function(parent) {
        this.parent = parent;
        this.IGNORE_TRACK = false;
        this.ORDER = 2;
        this.URL = "";
        this.IS_LOADED = false;
    };

    IcoFile.prototype.GET_SET_URL = function() {
        try {
            this.FILE_NAME = this.parent.CLIENT.NAME.UPPER + "_FAVICON.svg";
            this.URL = "assets/images/client_logo/" + this.FILE_NAME;
            return this.URL;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('ICO_FILE_FETCH', err.message);
        }
    };

    IcoFile.prototype.handleResponse = function(response, parent) {
        try {
            if (global.isValidVariable(global.InitLog)) {
                global.InitLog('IcoFile', 'handleResponse');
            }
            var link = document.querySelector("link[rel='icon']");
            if (link) link.href = response.responseURL;
            this.IS_LOADED = true;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('ICO_FILE_HANDLE', err.message);
        }
    };

    IcoFile.prototype.fireOnce = function() {
        this.GET_SET_URL();
    };
    // ============ EditorInitialize Module ============
    var EditorInitialize = function() {
        this.isInitiated = false;
        this.pendingSharedKey = null;
        this.watcher = null;
        this.sharedKeyWatcher = null;
        this.initStartedAt = null;
        this.initTimeoutMs = 25000;
        this.reloadTriggered = false;
        this.preInitialize = this.preInitialize.bind(this);
    };

    EditorInitialize.prototype.CLEAR_WATCHER = function() {
        if (this.watcher) {
            clearInterval(this.watcher);
            this.watcher = null;
        }
    };

    EditorInitialize.prototype.CLEAR_SHARED_KEY_WATCHER = function() {
        if (this.sharedKeyWatcher) {
            clearInterval(this.sharedKeyWatcher);
            this.sharedKeyWatcher = null;
        }
    };

    EditorInitialize.prototype.HAS_VALID_SHARED_KEY = function(sharedKey) {
        return !!(sharedKey && sharedKey.dtd && sharedKey.type && (sharedKey.apikey || IS_LOCAL_HOST));
    };

    EditorInitialize.prototype.ENSURE_INIT_TIMER = function() {
        if (!this.initStartedAt) this.initStartedAt = Date.now();
    };

    EditorInitialize.prototype.CLEAR_INIT_TIMER = function() {
        this.initStartedAt = null;
        this.reloadTriggered = false;
    };

    EditorInitialize.prototype.CHECK_TIMEOUT_AND_RELOAD = function() {
        try {
            if (this.isInitiated || this.reloadTriggered) return false;
            this.ENSURE_INIT_TIMER();
            if ((Date.now() - this.initStartedAt) < this.initTimeoutMs) return false;

            this.reloadTriggered = true;
            this.CLEAR_WATCHER();
            this.CLEAR_SHARED_KEY_WATCHER();
            if (global.isValidVariable(global.ErrorLogTrace)) {
                global.ErrorLogTrace('EDITOR_INITIALIZE_TIMEOUT', 'Initialization exceeded 25 seconds. Reloading tab.');
            }
            if (global.location && typeof global.location.reload === 'function') {
                if (IS_LOCAL_HOST) debugger;
                global.location.reload();
            }
            return true;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('EDITOR_INITIALIZE_CHECK_TIMEOUT', err.message);
            return false;
        }
    };

    EditorInitialize.prototype.RESOLVE_SHARED_KEY = function() {
        try {
            var sharedKey = global.SHARED_KEY;
            if (this.HAS_VALID_SHARED_KEY(sharedKey)) return sharedKey;

            if (!global.DOC_ID || !global.localStorage) return sharedKey;
            var storageKey = "xmleditor:shared:" + global.DOC_ID;
            var tempData = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
            if (!tempData) return sharedKey;

            sharedKey = JSON.parse(tempData);
            if (sharedKey) global.SHARED_KEY = sharedKey;
            return sharedKey;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('EDITOR_INITIALIZE_RESOLVE_SHARED_KEY', err.message);
            return global.SHARED_KEY;
        }
    };

    EditorInitialize.prototype.START = function(sharedKey) {
        try {
            if (!sharedKey || this.isInitiated) return false;
            this.ENSURE_INIT_TIMER();
            this.pendingSharedKey = sharedKey;
            this.CLEAR_SHARED_KEY_WATCHER();
            return this.TRY_START();
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('EDITOR_INITIALIZE_START', err.message);
            return false;
        }
    };

    EditorInitialize.prototype.RUN_READY_TO_OPEN = function(sharedKey) {
        try {
            var activeSharedKey = sharedKey || this.pendingSharedKey;
            if (!activeSharedKey) return false;
            this.pendingSharedKey = activeSharedKey;

            if (typeof global.getsetUserUniqueId === 'function') global.getsetUserUniqueId();
            if (typeof global.SET_TITLES === 'function') global.SET_TITLES(activeSharedKey);
            if (typeof global.fetchUserInfo === 'function') global.fetchUserInfo();
            /*
            if (
                global.LOADING_CONFIG &&
                global.LOADING_CONFIG.CLIENT.NAME.UPPER === 'OSO' &&
                global.USER_INFO &&
                (global.USER_INFO.ROLE_NAME === 'Collator' || IS_LOCAL_HOST)
            ) {
                var helpDiv = document.getElementById('HelpDiv');
                var tipsItem = document.getElementById('TipsTricks');
                if (helpDiv && tipsItem) {
                    var cleanupItem = tipsItem.cloneNode(true);
                    cleanupItem.removeAttribute('id');
                    cleanupItem.setAttribute('href', "javascript:iDownloadMethod.click('Help_Guide_Cleanup_pdf');");
                    cleanupItem.setAttribute('title', 'Cleanup Guide');
                    var label = cleanupItem.lastChild;
                    if (label && label.nodeType === 3) label.textContent = '\u00a0\u00a0Cleanup Guide';
                    tipsItem.insertAdjacentElement('afterend', cleanupItem);
                }
            }
            */
            if (global.commonfn && typeof global.commonfn.callajax === 'function' && typeof global.GET_JSON === 'function') {
                global.commonfn.callajax(global.GET_JSON('openhtml'), 'openhtml', global.API_PATH + 'getdocsreports');
            }
            if (global.moment && typeof global.moment.relativeTimeThreshold === 'function') {
                global.moment.relativeTimeThreshold('ss', 2);
            }
            global.DOC_DTD = activeSharedKey.dtd;
            if (global.DOC_DTD) global.IS_JOURNAL = Boolean(global.DOC_DTD.includes('JATS'));

            if (IS_TRACK_VIEW) return false;

            if (global.$ && typeof global.$.getJSON === 'function') {
                global.$.getJSON(global.BUCKET_URL + global.DOC_ID + '/supporting/pagemap.json?callback=?', function(data) {});
            }
            if (typeof global.CHECK_CURRENT_STATUS === 'function') {
                global.CHECK_CURRENT_STATUS('READY_TO_OPEN');
            }
            global.LOCAL_DATA = global.DOC_ID + "_offline_html";
            this.CLEAR_INIT_TIMER();
            global.InitialLoadDialog.updateProgress(3);
            return true;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('EDITOR_INITIALIZE_RUN_READY_TO_OPEN', err.message);
            return false;
        }
    };

    EditorInitialize.prototype.TRY_START = function() {
        try {
            if (this.isInitiated || !this.pendingSharedKey) return false;
            if (this.CHECK_TIMEOUT_AND_RELOAD()) return false;

            var gatePassed = !global.InitialLoadDialog ||
                typeof global.InitialLoadDialog.isSessionGatePassed !== 'function' ||
                global.InitialLoadDialog.isSessionGatePassed();

            if (global.LOADING_CONFIG && global.LOADING_CONFIG.canLoadEditor === true && gatePassed) {
                this.isInitiated = true;
                this.CLEAR_WATCHER();
                this.CLEAR_SHARED_KEY_WATCHER();
                return this.RUN_READY_TO_OPEN();
            }

            if (!this.watcher) {
                var self = this;
                this.watcher = setInterval(function() {
                    if (self.CHECK_TIMEOUT_AND_RELOAD()) return;
                    self.TRY_START();
                }, 100);
            }
            return false;
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('EDITOR_INITIALIZE_TRY_START', err.message);
            return false;
        }
    };

    EditorInitialize.prototype.START_SHARED_KEY_WATCHER = function() {
        try {
            var self = this;
            if (this.sharedKeyWatcher || this.isInitiated) return;
            this.ENSURE_INIT_TIMER();
            this.sharedKeyWatcher = setInterval(function() {
                var sharedKey = self.RESOLVE_SHARED_KEY();
                var isValid = self.HAS_VALID_SHARED_KEY(sharedKey);
                if (self.CHECK_TIMEOUT_AND_RELOAD() && !isValid) return;
                if (!isValid) return;
                self.CLEAR_SHARED_KEY_WATCHER();
                self.START(sharedKey);
            }, 100);
        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('EDITOR_INITIALIZE_START_SHARED_KEY_WATCHER', err.message);
        }
    };

    EditorInitialize.prototype.preInitialize = function() {
        try {
            var sharedKey;

            if (!navigator.onLine && typeof global.IS_CHECK_ONLINE === 'function') global.IS_CHECK_ONLINE(navigator.onLine);
            var BODY_DOM = document.getElementById('Body');
            if (BODY_DOM) BODY_DOM.classList.remove('ignore-events');

            sharedKey = this.RESOLVE_SHARED_KEY();
            if (this.HAS_VALID_SHARED_KEY(sharedKey)) this.START(sharedKey);
            else this.START_SHARED_KEY_WATCHER();

        } catch (err) {
            console.warn(err.message);
            if (global.isValidVariable(global.ErrorLogTrace)) global.ErrorLogTrace('preInitialize', err.message);
        }
    };

    // Backward compatibility for existing calls
    EditorInitialize.prototype.preInitilize = EditorInitialize.prototype.preInitialize;


    // ============ Expose API ============
    global.LoadingConfig = LoadingConfig;
    global.LOADING_CONFIG = new LoadingConfig();
    global.EditorInitialize = EditorInitialize;
    global.EDITOR_INITIALIZE = new EditorInitialize();



    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', global.EDITOR_INITIALIZE.preInitialize, {
            once: true
        });
    } else {
        global.EDITOR_INITIALIZE.preInitialize();
    }

})(window);