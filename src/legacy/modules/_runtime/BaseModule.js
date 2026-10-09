class BaseModule {

    constructor(name, subFolder, options = {}) {
        this._name = name;
        this._dialogType = subFolder;
        this._template = "";
        this._id = this._name.replace("Module", "Dialog");
        this.initiated = false;
        this.FullyLoaded = false;
        this.state = 0;
        this.options = options;

        if (!this._id.includes("Dialog")) this._id = this._name.concat("Dialog");


        this.iDOM = document.getElementById(options.DOM_ID || "aaa");
        this.DUMMY = document.getElementById("dummy-impact");

        if (!this.iDOM && options.DOM_ID) {
            this.iDOM = document.createElement("div");
            this.iDOM.setAttribute("id", options.DOM_ID);
        }

        if (this.iDOM && options.DOM_ID && this.DUMMY) {
            this.DUMMY.append(this.iDOM);
        }

        this.G_CONFIG = {};
        this.G_FUN = {};
        this.G_SCOPE = {};
        this.M_SCOPE = {};
        this.M_CONFIG = {};
        this.M_FUN = {};

        this.elements = {};

        this._stats = {
            openCount: 0,
            closeCount: 0,
            buttonClicks: {},
            inputInteractions: 0,
            lastOpened: null,
            lastClosed: null
        };
        this.name = this._name;

        this.G_FUN.GET_CONFIG_ITEM = GET_CONFIG_ITEM;
        this.G_FUN.VALIDATE_UPLOAD_FILE = VALIDATE_UPLOAD_FILE;

        this.recordAction = this.getSharedRecordAction();

        this.setupRegexPatterns();

        this._fileUploader = new FileUploadModule(API_UPLOAD_MULTI);
        this._errorTracker = new EnhancedErrorTracker();
        this._trackManager = new trackManager(GlobalEditor) || window._trackManager;
        this.setupSummerNote();

        this.templateDefault = {
            'default_old': function(tag, Options = {}) {
                var time_stamp = (new Date()).getTime();
                var cid = commonMethods.Get_CID();
                var ACT_ORDER = 0;
                if (Options.order) {
                    ACT_ORDER = Options.order;
                } else ACT_ORDER = ACTION_RECORD.GET_COUNT();
                return `<${tag} class="ice-${tag.slice(0, 3)} ice-cts-${lite_userId}" data-changedata="" data-cid="${cid}" data-last-change-time="${time_stamp}" data-time="${time_stamp}" data-userid="${lite_userId}" data-username="${USER_INFO.MAIL_ID}" data-rolename="${USER_INFO.TRACK_ROLE_NAME}" data-insert-order="${ACT_ORDER}" {{{attr}}}>{{{data}}}</${tag}>`;
            }
        };

    }



    _debounce(fn, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }
    getSharedRecordAction() {
        const result = (typeof getRecordUserAction === "function") ?
            getRecordUserAction() :
            null;
        if (IS_LOCAL_HOST) {
            // console.log(`[getSharedRecordAction] ${this._id} - getRecordUserAction() returned:`, result);
        }
        return result;
    }

    _checkDependencies() {
        return (
            typeof window.InitialLoadDialog !== 'undefined' &&
            window.InitialLoadDialog.FullyLoaded &&
            BUCKET_URL &&
            DOC_ID
        );
    }

    getDialogTrackingSnapshot() {
        const stats = this._stats || {};
        const lastOpened = stats.lastOpened ? new Date(stats.lastOpened) : null;
        const lastClosed = stats.lastClosed ? new Date(stats.lastClosed) : null;

        return {
            id: this._id,
            name: this.name || this._name,
            moduleName: this._name,

            lastOpened: lastOpened && !isNaN(lastOpened.getTime()) ? lastOpened : null,
            lastClosed: lastClosed && !isNaN(lastClosed.getTime()) ? lastClosed : null
        };
    }
    getDialogOpenDuration(referenceTime = new Date()) {
        try {
            const snapshot = this.getDialogTrackingSnapshot();
            if (!snapshot.lastOpened) return null;

            const ref = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);
            if (!ref || isNaN(ref.getTime())) return null;

            return Math.max(0, ref.getTime() - snapshot.lastOpened.getTime());
        } catch (err) {
            this.logError("getDialogOpenDuration", err);
            return null;
        }
    }
    getRuntimeStore() {
        return (typeof window !== "undefined" && window.ModuleRuntimeStore) ? window.ModuleRuntimeStore : null;
    }
    buildRuntimeModuleSnapshot(extra = {}) {
        return {
            id: this._id,
            name: this.name || this._name,
            moduleName: this._name,
            dialogType: this._dialogType,
            state: this.state,
            isOpen: this.state === 1,
            initiated: this.initiated === true,
            fullyLoaded: this.FullyLoaded === true,
            stats: this.getStats ? this.getStats() : Object.assign({}, this._stats || {}),
            ...extra
        };
    }
    dispatchRuntimeAction(action) {
        try {
            const store = this.getRuntimeStore();
            if (!store || typeof store.dispatch !== "function" || !action || !action.type) return false;
            store.dispatch(action);
            return true;
        } catch (err) {
            if (typeof console !== "undefined" && console.warn) {
                console.warn("ModuleRuntimeStore dispatch failed:", err && err.message ? err.message : err);
            }
            return false;
        }
    }
    getRuntimeState() {
        const store = this.getRuntimeStore();
        return store && typeof store.getState === "function" ? store.getState() : null;
    }
    subscribeRuntimeState(listener) {
        const store = this.getRuntimeStore();
        return store && typeof store.subscribe === "function" ? store.subscribe(listener) : function() {};
    }
    setModuleRuntimeState(patch = {}) {
        return this.dispatchRuntimeAction({
            type: "module/statePatched",
            payload: this.buildRuntimeModuleSnapshot(patch)
        });
    }
    buildDialogTrackingPayload(action, options = {}) {
        const snapshot = this.getDialogTrackingSnapshot();
        const now = options.timestamp instanceof Date ? options.timestamp : new Date();
        const hasDuration = typeof options.durationMs === "number" && Number.isFinite(options.durationMs);
        const durationMs = hasDuration ? Math.max(0, Math.round(options.durationMs)) : null;
        const durationLabel = hasDuration && typeof moment !== "undefined" && moment.duration ?
            moment.duration(durationMs).humanize() :
            "";
        const info = Object.prototype.hasOwnProperty.call(options, "info") ?
            options.info :
            (options.isDirectClose ? "without any update" : "");

        return {
            action,
            remark: options.remark || snapshot.id,
            info,
            dialog_id: snapshot.id,
            // dialog_name: snapshot.name,
            // module_name: snapshot.moduleName,
            durationMs,
            durationLabel,
            time_c: now.getTime(),
            time_iso: now.toISOString()
        };
    }
    recordDialogTracking(action, options = {}) {
        try {
            const recorder = this.getSharedRecordAction();

            // Debug logging
            if (IS_LOCAL_HOST) {
                // console.log(`[recordDialogTracking] ${this._id} - recorder:`, recorder);
                // console.log(`[recordDialogTracking] ${this._id} - trackDialogOpenClose:`, typeof recorder?.trackDialogOpenClose);
            }

            if (!recorder || typeof recorder.trackDialogOpenClose !== "function") {
                if (IS_LOCAL_HOST) console.warn(`[recordDialogTracking] ${this._id} - FAILED: recorder not available`);
                return false;
            }

            const payload = this.buildDialogTrackingPayload(action, options);
            if (IS_LOCAL_HOST) console.log(`[recordDialogTracking] ${this._id} - payload:`, payload);

            return recorder.trackDialogOpenClose(action, payload);
        } catch (err) {
            this.logError("recordDialogTracking", err);
            return false;
        }
    }
    buildAttachmentsFlowPayload(update = {}) {
        const now = update.timestamp instanceof Date ? update.timestamp : new Date();
        return {
            filename: update.filename || "",
            oldfilename: update.oldfilename || "",
            username: update.username || USER_INFO.MAIL_ID,
            role: update.role || USER_INFO.TRACK_ROLE_NAME,
            process: update.process || "",
            existing_payload: update.existing_payload || null,
            status: update.status || "",
            time_c: now.getTime(),
            time_iso: now.toISOString()
        };
    }
    recordAttachmentsFlow(update = {}) {
        try {
            const recorder = this.getSharedRecordAction();
            if (!recorder || typeof recorder.trackAttachmentsFlow !== "function") {
                return false;
            }
            const payload = this.buildAttachmentsFlowPayload(update);
            return recorder.trackAttachmentsFlow(payload);
        } catch (err) {
            this.logError("recordAttachmentsFlow", err);
            return false;
        }
    }
    getCurrentUserCorrectionCount() {
        var selector = '[data-username="' + USER_INFO.MAIL_ID + '"]';
        var finding = this.editor.document.find(selector);

        if (!finding) {
            return {
                array: [],
                count: 0
            };
        }

        return {
            array: finding.toArray ? finding.toArray() : [],
            count: finding.count ? finding.count() : 0
        };
    }

    setUpEditorInstance() {
        // Set up editor reference
        this.editor = window.GlobalEditor || window.CKEDITOR.instances.maineditor;
        if (!this.editor) {
            // throw new Error('Editor instance not found');
            return;
        }

        // Set up document references
        this.globalDocument = this.editor.document;
        this.globalDocBody = this.globalDocument.getBody().$;
    }

    async lazyInitialize() {
        await this.MountwithUnmountComponent();

        if (!this.Panel) {
            console.warn("not_load" + this._id);
            return;
        }

        this.init();

    }

    init(options = {}) {
        try {
            debug.log(this.CAN_INIT_DEFAULT ? "default dialog module Initiated" : "Dialog Module Initiated");

            if (typeof iREF_SCOPE !== "undefined") {
                this.G_CONFIG = Object.assign(this.G_CONFIG, iREF_SCOPE);
            }
            if (!this.Panel || (!(this.Panel && document.body.contains(this.Panel)))) {
                this.Panel = document.getElementById(this._id);
            }

            if (!this.Panel) {
                return this.MountwithUnmountComponent(options).then(() => {
                    this.Panel = document.getElementById(this._id);

                    if (!this.Panel) {
                        this.logError("init_" + this._id, new Error("Panel not found for " + this._id));
                        return false;
                    }

                    return this.init(options);
                }).catch((err) => {
                    this.logError("init_" + this._id, err);
                    return false;
                });
            }

            if (typeof MODULE_LIST !== "undefined" && this._id) {
                MODULE_LIST[this._id] = this;
            }

            this.Panel.querySelectorAll("input").forEach(input => {
                let form = input.closest("form"),
                    el = null;
                if (form && form.hasAttribute("spellcheck")) {
                    el = form;
                } else el = input;

                if (el && typeof el.setAttribute == "function")
                    el.setAttribute("spellcheck", "false");
            });

            this.setupRegexPatterns();
            this.setupGlobalFunctions();
            // this.setupSummerNote();

            this.editor = GlobalEditor ? GlobalEditor : CKEDITOR.instances.maineditor;

            if (typeof IMPACT_SELECTION !== "undefined") {
                this.IMS = this.G_SCOPE.IMS = IMPACT_SELECTION;
                if (typeof IMPACT_SELECTION._SNAPSHOT === "function") {
                    this.G_FUN._SNAPSHOT = this._SNAPSHOT = IMPACT_SELECTION._SNAPSHOT;
                }
                if (this.SHORT_CUT && typeof iKEY_EVENT_HANDLING !== "undefined") {
                    iKEY_EVENT_HANDLING.SHORT_CUT_KEYS_COLLECTION[this.SHORT_CUT] = this;
                }
            }

            if (this.TOASTER_MESSAGE && Object.keys(this.TOASTER_MESSAGE).length > 0) {
                Object.assign(ALERT_MESSAGE, this.TOASTER_MESSAGE);
            }

            this.isOHO = commonMethods.getClientCode({
                format: "upper"
            }) == "OHO";
            this.isOSO = commonMethods.getClientCode({
                format: "upper"
            }) == "OSO";
            this.isTNF = commonMethods.getClientCode({
                format: "upper"
            }) == "TNF";
            this.isOXMEDO = commonMethods.getClientCode({
                format: "upper"
            }) == "OXMEDO";

            if (this.initLoop) {
                options.eventFrom = "init";
                this.initLoop(options, this);
            }

            this.addEventListeners();

            try {
                if (typeof this.setAllLabels == "function") {
                    this.setAllLabels();
                }
            } catch (err) {
                this.logError("init_setAllLabels", err);
            }

            this.initiated = true;
            this.dispatchRuntimeAction({
                type: "module/initialized",
                payload: this.buildRuntimeModuleSnapshot()
            });
            return true;
        } catch (error) {
            // ? console.warn(error.message);
            this.dispatchRuntimeAction({
                type: "module/errorRecorded",
                payload: this.buildRuntimeModuleSnapshot({
                    functionName: "init",
                    message: error && error.message ? error.message : String(error)
                })
            });
            this.logError("init" + "_" + this._id, error);
        }
    }
    async show(event, data, options = {}) {
        let self = this;
        try {
            let canProceed = true;

            // Handle unmount/remount if required

            if (self.canUnmountComponentWhileClose) {
                await self.MountwithUnmountComponent();
            }

            // Resolve module context if event is DOM-based
            if (event && typeof event === "object" && event.type && event.target) {
                const moduleId = event.target.getAttribute("data-module");
                const dialogElement = event.target.closest(".mDialog");
                self = MODULE_LIST[moduleId || (dialogElement && dialogElement.id)] || this;
                if (!self) return;
            }

            // Merge common methods
            this.G_FUN = Object.assign(this.G_FUN, commonMethods);

            // Ensure initialization
            if (!self.FullyLoaded) {
                self.init();
            }
            if (!self.FullyLoaded) {
                console.warn("---MODULE_RETURN----");
                if (typeof TOASTER_ALERT === "function") {
                    TOASTER_ALERT("ErrorImpact", {
                        type: "warning"
                    });
                }
                return;
            }

            // Pre-show hook
            if (self.showBefore) {
                canProceed = self.showBefore(event, data, options);
            }

            // Check paragraph lock
            if (window.paraLock && window.paraLock._isEnabled && window.paraLock._isElementLocked) {
                const isLocked = window.paraLock._isElementLocked(IMPACT_SELECTION.NODE, {
                    alertKey: "ErrorLockedParaEdit",
                    check_closest: true
                });
                if (canProceed && isLocked) canProceed = false;
            }

            // Offline guard
            if (!navigator.onLine && self.IsDisable_OffLine) {
                TOASTER_ALERT("OffLine_Error_show", {
                    type: "warning"
                });
                return false;
            }

            // Check existing dialog state
            self.OpenDialog = false;
            if (typeof iKEY_EVENT_HANDLING !== "undefined") {
                self.OpenDialog = iKEY_EVENT_HANDLING.IS_DIALOG_OPEN({
                    get: true,
                    noAlert: true
                }, self._id);
            }

            const isLinkShareDialog = ["LinkShareDialog", "LinkSessionRequestDialog"].includes(self._id);
            const isDockedDialog = self.OpenDialog && self.OpenDialog.hasAttribute && self.OpenDialog.hasAttribute("data-el-docked");
            const isForceOpening = options && options.forceOpen === true && ["qualityCheckerDialog"].includes(self.OpenDialog.id) && ["queryDialog"].includes(self._id);

            if (self.OpenDialog && !isLinkShareDialog && !isDockedDialog && !isForceOpening) {
                if (self.OpenDialog.id !== self._id) {
                    TOASTER_ALERT("Dialog_Opened", {
                        type: "warning"
                    });
                    return false;
                }
                // Same dialog already flagged open — fall through and force panel visible again
            }

            if (!canProceed) return false;

            // Ensure panel reference
            if (!(self.Panel && document.body.contains(self.Panel))) {
                self.Panel = document.getElementById(self._id);
            }

            if (self.Panel) {
                self.Panel.classList.remove("ds-none");
                if (self.Panel.hasAttribute("style")) self.Panel.removeAttribute("style");
            } else {
                console.warn(`Element with ID ${self._id} not found in the DOM.`);
                if (typeof TOASTER_ALERT === "function") {
                    TOASTER_ALERT("ErrorImpact", {
                        type: "warning"
                    });
                }
                return false;
            }

            // Setup dialog
            self.handledraggble();
            self.updateDialogPosition(self._id);

            // Reset input validation states
            self.Panel.querySelectorAll("input").forEach(input => {
                input.classList.remove("is-invalid", "is-valid");
            });

            self.removeSelection();

            // Loop setup
            if (self.showLoop) {
                if (self.canUnmountComponentWhileClose) {
                    self.addEventListeners();
                }
                self.setUpEditorInstance();
                self.showLoop(event, data, options, self);
            }

            // Label setup — remount restores template HTML, so re-apply after showLoop.
            // Prefer selective M_CONFIG.SET_LABEL.showLoop when configured; otherwise
            // full setAllLabels when canUnmount remounted chrome or messages.json exists.
            if (self.M_CONFIG && self.M_CONFIG.SET_LABEL && self.M_CONFIG.SET_LABEL.showLoop) {
                const labelsToSet = self.M_CONFIG.SET_LABEL.showLoop;
                if (labelsToSet.length > 0) {
                    const selector = labelsToSet.map(label => `[data-lang-lab="${label}"]`).join(",");
                    try {
                        if (self.setAllLabels) {
                            self.setAllLabels({
                                selector,
                                Initial: true
                            }, self);
                        }
                    } catch (err) {
                        this.logError("show_setAllLabels", err);
                    }
                }
            }
            if (typeof self.getModuleMessages === 'function') {
                self.getModuleMessages();
            }
            if (typeof self.setAllLabels === 'function' && (self.canUnmountComponentWhileClose)) {
                try {
                    self.setAllLabels();
                } catch (err) {
                    this.logError("show_setAllLabels", err);
                }
            }

            // Finalize state
            self.state = 1;
            self.bringDialogToFront(self.Panel);

            // Normalize stats
            this._stats.openCount = this._stats.openCount === -1 ? 1 : this._stats.openCount + 1;
            this._stats.lastOpened = new Date();

            this.recordDialogTracking("open", {});
            this.dispatchRuntimeAction({
                type: "module/opened",
                payload: this.buildRuntimeModuleSnapshot()
            });
            debug.log(`Module ${this._name} opened`);
        } catch (error) {
            this.dispatchRuntimeAction({
                type: "module/errorRecorded",
                payload: this.buildRuntimeModuleSnapshot({
                    functionName: "show",
                    message: error && error.message ? error.message : String(error)
                })
            });
            this.logError("show", error);
        }
    }

    // Helper function
    bringDialogToFront(panel) {
        if (!panel) return;

        panel.focus();

        const headerDiv = panel.querySelector(".dia_header_div");
        if (headerDiv) headerDiv.click();

        window.focus();

        const autoFocusItem = panel.querySelector("[data-auto-focus]");
        if (autoFocusItem) autoFocusItem.focus();
    }


    refreshPanelDefault() {

        var updatedData = GlobalEditor.getData();


        if (window.queryModule && window.queryModule.panelModule) {
            window.queryModule.panelModule.refresh();
        }

        if (window.TOOLTIP_MODULE && window.TOOLTIP_MODULE.generateToolTip) window.TOOLTIP_MODULE.generateToolTip();

        if (CitationNewModule && CitationNewModule.M_FUN && CitationNewModule.M_FUN.CreateCiteList) {
            CitationNewModule.M_FUN.CreateCiteList(updatedData, true);
        }

        if (SET_DATA && typeof SET_DATA.reGenerateAllInit == "function") {
            var delay = IS_JOURNAL ? 500 : 2500;
            setTimeout(() => {
                SET_DATA.reGenerateAllInit(updatedData);
            }, delay);
        }
        if (typeof this.refreshPanel == "function") {
            this.refreshPanel();
        }

    }

    // Utility functions
    logError(functionName, err = {}) {
        console.log(`${this._id} ${functionName} ${err.message}`);
        ErrorLogTrace(`${this._id} ${functionName}`, `${err.message}`);
        if (this._errorTracker) {
            this._errorTracker.logError(this._name, functionName, err);
        }
    }

    trackError(functionName, err = {}) {
        return this.logError(functionName, err);
    }

    setupRegexPatterns() {
        try {
            this.G_SCOPE.DOI_Pattern_1 = /^10.\d{4,9}\/[-._;()/:A-Z0-9]+$/igm;
            this.G_SCOPE.DOI_Pattern_2 = /^10[.][0-9]{4,}[^\s"/<>]*\/[^\s"<>]+$$/igm;
            this.G_SCOPE.ORCID_REGEX = /[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]{1}/;
            this.G_SCOPE.Mail_ID_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,3}))$/;
            this.G_SCOPE.URL_REGEX = /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
            this.G_SCOPE.Multi_Mail_ID_REGEX = /(([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)(\s*(;|,)\s*|\s*$))*/;
        } catch (err) {
            this.logError("setupRegexPatterns", err);
        }
    }
    scrollFocus(elm) {
        try {
            if (elm) {
                elm.classList.remove("ds-none");
                elm.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                elm.focus({
                    preventScroll: true
                });
            }
        } catch (err) {
            this.logError("scrollFocus", err);
        }
    }

    setupGlobalFunctions() {
        try {
            this.G_FUN.GET_CONFIG_ITEM = GET_CONFIG_ITEM;
            this.G_FUN.VALIDATE_UPLOAD_FILE = VALIDATE_UPLOAD_FILE;
        } catch (err) {
            this.logError("setupGlobalFunctions", err);
        }
    }


    // Get content from the Summernote editor (IMPACT-restored)
    getSummerNoteContent(target) {
        return this._summernote ? this._summernote.getContent(target) : '';
    }

    // Set content in the Summernote editor (IMPACT → editor transform)
    setSummerNoteContent(content, target) {
        if (this._summernote) this._summernote.setContent(content, target);
    }

    // Optional: Clear content in the Summernote editor
    clearSummerNoteContent(target) {
        if (this._summernote) this._summernote.clearContent(target);
    }

    setupSummerNote() {
        try {
            if (!this.SUMMERNOTE_CONFIG) {
                this._summernote = this._summernote || new SummernoteManager(this);
                this.SUMMERNOTE_CONFIG = this._summernote.buildConfig();
            }

        } catch (error) {
            this.logError('setupSummerNote', error);
        }
    }

    /**
     * Handle content changes
     * @param {string} contents - Current editor contents
     */
    handleContentChange(contents) {
        const trimmedContent = contents.trim();
        if (trimmedContent !== this.previousContent) {
            this.previousContent = trimmedContent;
            const changeEvent = {
                type: 'contentChange',
                content: contents,
                trimmedContent: trimmedContent
            };
            console.log('Content changed:', changeEvent);
        }
    }

    // Non-Summernote-callback shortcut editors still route through the same manager
    handleSummerNoteEvents(e) {
        if (this._summernote) this._summernote.handleShortcutEvent(e);
    }

    GetFragment(html) {
        try {
            return document.createRange().createContextualFragment(html);
        } catch (e) {
            this.logError("iFragment_" + this._id, e);
        }
    }


    GetFragment(html) {
        try {
            return document.createRange().createContextualFragment(html);
        } catch (e) {
            // console.warn(e.message);
            this.logError("iFragment_" + this._id, e);
        }
    }
    newElm(tag, options) {
        try {
            let elm = document.createElement(tag);
            if (options) {
                if (options.text) elm.textContent = options.text;
                if (options.innerHTML) elm.innerHTML = options.innerHTML;
                if (options.append) {
                    let content = typeof options.append === 'string' ? this.GetFragment(options.append) : options.append;
                    elm.append(content);
                }
                if (options.addclass) elm.classList.add(options.addclass);
                if (options.setAtt) commonMethods.setAttr(elm, options.setAtt);
            }
            return elm;
        } catch (e) {
            this.logError("newElm_" + this._id, e);
        }
    }
    iGetElmById(id, options) {
        try {
            let elm = document.getElementById(id);
            if (!elm) return null;
            if (options && options.addClass) elm.classList.add(options.addClass);
            return elm;
        } catch (e) {
            this.logError("iGetElmById_" + this._id, e);
        }
    }

    initTippyTooltips(tooltipItems = []) {
        try {
            if (!Array.isArray(tooltipItems) || typeof tippy !== "function") return;

            tooltipItems.forEach((item) => {
                try {
                    if (!item) return;

                    let element = item.element || null;
                    const root = this.Panel || document;

                    if (!element && item.id) {
                        element = root.querySelector(`#${item.id}`) || document.getElementById(item.id);
                    }
                    if (!element && item.selector) {
                        element = root.querySelector(item.selector) || document.querySelector(item.selector);
                    }
                    if (!element) return;

                    const content = item.content || element.getAttribute("title") || "";
                    if (!content) return;

                    const options = Object.assign({
                        content,
                        arrow: false,
                        placement: "right"
                    }, item.options || {});

                    if (item.placement) options.placement = item.placement;
                    if (Object.prototype.hasOwnProperty.call(item, "arrow")) options.arrow = item.arrow;

                    if (element._tippy) {
                        element._tippy.setContent(content);
                        element._tippy.setProps(options);
                    } else {
                        tippy(element, options);
                    }
                } catch (err) {
                    this.logError("initTippyTooltips_item_" + this._id, err);
                }
            });
        } catch (err) {
            this.logError("initTippyTooltips_" + this._id, err);
        }
    }

    IsExistsModel() {
        if (!this.Model_DOM) {
            this.Model_DOM = document.getElementById('ModelDialogAppend');
        }
    }

    getTemplatePath(templatePath) {
        const path = templatePath || `${this._dialogType}/template.html`;
        return String(path).replace(/\\/g, '/').replace(/^\.\//, '');
    }

    getDialogTemplateFromHTML(templateHTML) {
        if (!templateHTML) return null;

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = templateHTML;
        const dialogElement = tempDiv.querySelector(".mDialog");

        return dialogElement ? dialogElement.outerHTML : null;
    }

    async recoverTemplateFromStore(templatePath) {
        try {
            if (this._template) return this._template;

            const resolvedPath = this.getTemplatePath(templatePath);
            const store =
                (typeof window !== 'undefined' && window.ModuleTemplateStore) ||
                (typeof ModuleTemplateStore !== 'undefined' ? ModuleTemplateStore : null);

            if (!store || typeof store.getTemplate !== "function") {
                return null;
            }

            const bundledTemplate = await store.getTemplate(resolvedPath);
            const dialogTemplate = this.getDialogTemplateFromHTML(bundledTemplate);

            if (!dialogTemplate) {
                return null;
            }

            this._template = dialogTemplate;
            return this._template;
        } catch (err) {
            this.logError("recoverTemplateFromStore_" + this._id, err);
            return null;
        }
    }

    async MountwithUnmountComponent(options = {
        unMount: false
    }) {
        try {
            let [existingElement] = [document.getElementById(this._id)];
            if (existingElement && options.unMount && !this.Last_UnMount) {
                if (existingElement.parentElement) {
                    commonMethods.removeEl(existingElement);
                } else {
                    existingElement.remove();
                }
                existingElement = document.getElementById(this._id);
                debug.log(`Component ${existingElement ? "" : "removed"} ` + this._id);
                this.Last_UnMount = true;
            } else if (existingElement) this.Last_UnMount = false;

            this.IsExistsModel();
            if (this.Model_DOM && !existingElement) {
                if (!this._template) {
                    await this.recoverTemplateFromStore(options.templatePath);
                }

                let fragment = this.GetFragment(this._template);
                if (fragment) this.Model_DOM.append(fragment);
            }

            this.Panel = existingElement = document.getElementById(this._id);
            if (IS_TRACK_VIEW && /Note|track/gi.test(this._id)) {
                if (this.Panel) this.Panel.querySelector(".dialog-container").remove();
            }
            debug.log(`Component ${existingElement ? "" : "removed"} ` + this._id);
        } catch (e) {
            this.logError("MountwithUnmountComponent_" + this._id, e);
        }
    }

    addEventListeners() {
        try {
            if (typeof this['AssignVar_EventLoop'] == "function") {
                this['AssignVar_EventLoop']();
            } else if (typeof this.M_FUN['AssignVar_EventLoop'] == "function") {
                this.M_FUN['AssignVar_EventLoop']();
            }

            this.elements.headerGroup = this.Panel.querySelector('.dia_header_div');
            this.elements.headerTitle = this.Panel.querySelector('.dia_header_text');
            this.elements.contentGroup = this.Panel.querySelector('.dialog-content');

            if (this.initializeElements) this.initializeElements();

            this.Panel.addEventListener('click', this.handleDynamicEvent.bind(this));

            Object.entries({
                ".dia_header_div .closeIcons": {
                    "onclick": 'closeDialog'
                },
                ".dialog-footer .cancel_btn": {
                    "onclick": 'closeDialog'
                }
            }).forEach(([selector, events]) => {
                const elements = this.Panel.querySelectorAll(selector);
                elements.forEach(element => {
                    Object.entries(events).forEach(([eventName, handlerName]) => {
                        element.addEventListener(eventName.slice(2), this[handlerName].bind(this));
                    });
                });
            });

            // TODO: FEATURE
            /* 
            const textareas = this.Panel.querySelectorAll("textarea");
            textareas.forEach((textarea) => {
                setTimeout(() => commonMethods.setCaret(textarea), 500);
                textarea.onpaste = (e) => setTimeout(() => this.pasteValidation(e.target), 100);
            });
             */
            this.initiated = this.FullyLoaded = true;
        } catch (e) {
            this.logError("addEventListeners" + this._id, e);
        }
    }
    handledraggble() {
        try {
            $(this.Panel).draggable({
                handle: ".dia_header_div",
                drag: function(event, ui) {
                    var Client_React = $(ui.helper[0]).find('.dialog-content')[0].getBoundingClientRect();
                    var bottomPos = parseInt(Client_React.height) + parseInt(Client_React.top);
                    debug.log([parseInt(Client_React.x) < 0 || parseInt(Client_React.y) < 0 || window.screen.width < parseInt(Client_React.right) || document.documentElement.clientHeight < bottomPos]);
                    if (parseInt(Client_React.x) < 0 || parseInt(Client_React.y) < 0 || window.screen.width < parseInt(Client_React.right) || document.documentElement.clientHeight < bottomPos) {
                        event.stopPropagation();
                        event.preventDefault();
                        $(this).draggable('option', 'revert', true).trigger('mouseup');
                    } else {
                        $(this).draggable('option', 'revert', false);
                    }
                }
            });
        } catch (err) {
            this.warnMessage(err);
        }
    }

    GetTemplate(templateName, options, context = this) {
        try {

            // Normalize boolean flags
            var opts = Object.assign({}, options, {
                ignore: !!options.ignore,
                frag: !!options.frag,
                alert_msg: !!options.alert_msg,
                _template: options._template || {}
            });

            let template;

            // If alert_msg flag is set, use the templateName directly
            if (opts.alert_msg) {
                template = templateName;
            } else if (templateName !== "default") {
                const collections = context && context._state && context._state.templateList || context && context.templateList;
                if (!collections) return;

                const mainTemplate = collections[templateName] || (opts._template && opts._template[templateName]);
                const subTemplateCollection = opts.sub && collections[opts.sub];

                if (opts.dtd && mainTemplate) {
                    template = mainTemplate.default || mainTemplate[DOC_DTD];
                } else if (subTemplateCollection) {
                    template = subTemplateCollection[templateName];
                } else if (mainTemplate) {
                    template = mainTemplate;
                }
            }

            if (!template) return;

            let rendered = Mustache.render(template, opts);

            // If frag option is set, convert rendered string to a fragment
            if (opts.frag) {
                const fragment = context.GetFragment(rendered);
                rendered = opts.dom ? fragment.firstElementChild : fragment;
            }

            // Wrap in <ins> DOM if needed
            if (opts.WITH_IN_INS_DOM || opts.FIRST_INS_DOM) {
                const trackManager = window._trackManager;
                const insertDom = trackManager.getInsNode();
                debug.log(insertDom.outerHTML);

                if (opts.data) insertDom.append(opts.data);

                if (typeof rendered === 'string') {
                    rendered = context.GetFragment(rendered);
                }

                Array.from(rendered.childNodes).forEach(node => {
                    insertDom.append(node);
                });

                rendered = opts.WITH_IN_INS_DOM ? insertDom : (rendered.append(insertDom), rendered);
            }

            return rendered;

        } catch (error) {
            console.warn(`GetTemplate Error: ${error.message} | Template: ${templateName}`);
            ErrorLogTrace("GetTemplate", error.message);
        }
    }


    async closeDialog(event, force = false) {
        try {
            let canClose = true;
            let self = this;
            let dialogElement = null;
            let IsDirectClose = false;
            let isHeaderIcon = false;
            let isCancelBtn = false;
            let isEscapyKeyEvt = false;

            if (event && event.target) {
                var target = event.target;
                dialogElement = target.closest(".mDialog");

                if (!this.closeDialog && MODULE_LIST[dialogElement.id]) {
                    self = MODULE_LIST[dialogElement.id];
                    IsDirectClose = true;
                } else if (this.closeDialog) {
                    isHeaderIcon = !!target.closest(".closeIcons");
                    isCancelBtn = (target.className || "").toLowerCase().includes("cancel") || (target.id || "").toLowerCase().includes("cancel") || (target.textContent || "").toLowerCase().includes("cancel");
                    isEscapyKeyEvt = event && event.key === 'Escape';
                    if (isHeaderIcon || isCancelBtn || isEscapyKeyEvt) {
                        IsDirectClose = true;
                    }
                }

            }

            let classList = self.Panel.classList;
            if (force == false) {
                if (typeof self.Before_closeDialog === "function") {
                    canClose = await self.Before_closeDialog();
                } else if (typeof self.Before_closeModule === "function") {
                    canClose = await self.Before_closeModule();
                } else if (typeof self.preCloseModule === "function") {
                    canClose = await self.preCloseModule();
                }
            }

            if (!canClose || classList.contains("ds-none")) {
                return false;
            }

            self.Panel.classList.add("ds-none");

            if (self.ReCheck_Cursor_Pos) {
                setTimeout(() => {
                    IMPACT_SELECTION.setCursor(GlobalEditor);
                }, 500);
            }

            if (this.iDOM && this.DOM_ID) {
                this.iDOM.innerHTML = "";
            }

            GlobalEditor.focus();
            self.state = 0;
            self.M_SCOPE.LAST_FOCUS = {
                IS_INPUT: false,
                INPUT_ID: null
            };

            if (self.canUnmountComponentWhileClose) {
                await self.MountwithUnmountComponent({
                    unMount: true
                });
            }

            this._stats.closeCount++;
            this._stats.lastClosed = new Date();
            this.recordDialogTracking("close", {
                info: IsDirectClose ? 'without any update' : '',
                remark: this._id,
                isDirectClose: IsDirectClose,
                durationMs: this.getDialogOpenDuration(this._stats.lastClosed)
            });
            this.dispatchRuntimeAction({
                type: "module/closed",
                payload: this.buildRuntimeModuleSnapshot({
                    isDirectClose: IsDirectClose
                })
            });
            if (this.unbindActionEvents) this.unbindActionEvents();
            debug.log(`Module ${this._name} closed`);

            if (typeof self.postCloseModule === "function") {
                canClose = await self.postCloseModule();
            }

        } catch (error) {
            this.dispatchRuntimeAction({
                type: "module/errorRecorded",
                payload: this.buildRuntimeModuleSnapshot({
                    functionName: "closeDialog",
                    message: error && error.message ? error.message : String(error)
                })
            });
            this.logError("closeDialog", error);
            this._errorTracker.logError(error, this._name, 'module_close');
        }
    }
    updateDialogPosition() {
        try {
            const ckeContents = document.getElementById('cke_1_contents');
            const isMaximized = ckeContents ? ckeContents.classList.contains('maxiview') : null;
            if (this.Panel) this.Panel.classList[isMaximized ? 'add' : 'remove']('maxiview');
        } catch (err) {
            // console.warn('updateDialogPosition error:', err.message);
            this.logError('updateDialogPosition', err.message);
        }
    }
    removeSelection() {
        try {
            if (window.getSelection) {
                window.getSelection().empty ? window.getSelection().empty() : window.getSelection().removeAllRanges();
            } else if (document.selection) {
                document.selection.empty();
            }
        } catch (err) {
            // console.warn('removeSelection error:', err.message);
            this.logError('removeSelection', err.message);
        }
    }

    getGlobalData(options = {}) {
        try {
            const data = GlobalEditor.getData();
            if (options.setStringInDOM) {
                this.iDOM.innerHTML = data;
            }
            return data;
        } catch (err) {

            // console.warn('getGlobalData error:', err.message);
            this.logError('getGlobalData', err.message);
            return null;
        }
    }

    setDOMData(data, options = {}) {
        try {
            const {
                DOM,
                node
            } = options;
            if (DOM) {
                data = data || this.getGlobalData();
                // Additional logic for BOOKS_TNF can be added here if needed
                this.iDOM.innerHTML = data;
            }
        } catch (err) {
            /* The above code is a JavaScript console statement using `console.warn()` to log an error
            message with the text 'setDOMData error:' followed by the error message from the `err`
            object. */
            // console.warn('setDOMData error:', err.message);
            this.logError('setDOMData', err.message);
        }
    }

    handleDynamicEvent(e) {
        try {
            const target = e.target;
            if (target.closest('.closeIcons')) return;

            const isInput = (target.tagName === "INPUT" && target.type === "text") || (this.M_SCOPE.TEXT_AREA_IDs && this.M_SCOPE.TEXT_AREA_IDs.includes(target.id));

            this.M_SCOPE.LAST_FOCUS = {
                IS_INPUT: isInput,
                INPUT_ID: target.id,
                ELM: target
            };
        } catch (err) {

            this.logError('handleDynamicEvent', err.message);
        }
    }
    pasteValidation(el) {
        if (el.innerHTML.length == 0) return;
        let paste_data = PasteFilter.fire(el.innerHTML, {
            event_from: 'query',
            e: {},
            record: false
        });
        debug.log("===========post_paste_data===========");
        debug.log(paste_data);
        if (paste_data.trim() != el.innerHTML.trim()) {
            if (el.innerHTML.match(/style|rgb|font-family|background-color|font-size/) != null) {
                el.innerHTML = paste_data;
            } else el.innerHTML = paste_data;
        }
        debug.log("===========post_paste_data===========");


    }
    /** Active UI lang code; default `en`. */
    getModuleLangCode() {
        try {
            const lang =
                typeof IMPACT !== 'undefined' &&
                IMPACT.USER_ENV_INFO &&
                IMPACT.USER_ENV_INFO.lang;
            return lang || 'en';
        } catch (_) {
            return 'en';
        }
    }

    /**
     * Resolve this module's supportingFiles list (attached at init, else moduleSystem lookup).
     * @returns {Array}
     */
    getModuleSupportingFiles() {

        if (Array.isArray(this._supportingFiles)) {
            return this._supportingFiles;
        }

        try {
            const ms = typeof moduleSystem !== 'undefined' ? moduleSystem : (typeof window !== 'undefined' ? window.moduleSystem : null);

            if (!ms || !ms.moduleDefinitions) return [];

            const tryKeys = [this._id, this._Id, this._name];
            for (let i = 0; i < tryKeys.length; i++) {
                const key = tryKeys[i];
                if (key && ms.moduleDefinitions.has(key)) {
                    const def = ms.moduleDefinitions.get(key);
                    return (def && def.supportingFiles) || [];
                }
            }

            if (ms.loadedModules) {
                for (const [name, inst] of ms.loadedModules) {
                    if (inst === this) {
                        const def = ms.moduleDefinitions.get(name);
                        this._supportingFiles = (def && def.supportingFiles) || [];
                        return this._supportingFiles;
                    }
                }
            }
        } catch (_) {
            /* ignore */
        }
        return [];
    }

    /**
     * Module messages.json bag when available.
     * Prefer this._moduleMessages; else supportingFiles name `messages` → window[variable].
     * @returns {object|null}
     */
    getModuleMessages() {
        if (this._moduleMessages) return this._moduleMessages;
        try {
            const files = this.getModuleSupportingFiles();
            const entry = files.find((f) => f && f.name === 'messages');
            if (!entry || !entry.variable) return null;
            const bag = typeof window !== 'undefined' ? window[entry.variable] : null;
            if (bag && typeof bag === 'object') {
                this._moduleMessages = bag;
                return bag;
            }
        } catch (_) {
            /* ignore */
        }
        return null;
    }

    /**
     * Hook called after ContextHelpers.loadModuleResource fetches or reuses a supporting file.
     * @param {object} fileConfig supportingFiles entry
     * @param {*} data fetched resource payload
     */
    modulePostFetch(fileConfig = {}, data = null) {
        try {
            if (!fileConfig || typeof fileConfig !== 'object') return;

            this._storeModuleResourceRecord(fileConfig, data);

            if (fileConfig.name !== 'messages' || !data || typeof data !== 'object') return;

            this._moduleMessages = data;
            const lang = (typeof this.getModuleLangCode === 'function' && this.getModuleLangCode()) || 'en';
            const langRuntime = data[lang] && data[lang].runtime;
            const enRuntime = data.en && data.en.runtime;
            const runtime = langRuntime && Object.keys(langRuntime).length ? langRuntime : enRuntime;
            if (!runtime || typeof runtime !== 'object' || !Object.keys(runtime).length) return;

            this.TOASTER_MESSAGE = runtime;
            if (typeof ALERT_MESSAGE !== 'undefined' && ALERT_MESSAGE && typeof ALERT_MESSAGE === 'object') {
                Object.assign(ALERT_MESSAGE, runtime);
            }
        } catch (err) {
            this.logError('modulePostFetch', err && err.message ? err.message : err);
        }
    }

    _ensureModuleResourceStore() {
        if (!Array.isArray(this._moduleResourceRecords)) {
            this._moduleResourceRecords = [];
        }
        if (!(this._moduleResourcesByName instanceof Map)) {
            this._moduleResourcesByName = new Map();
        }
        if (!(this._moduleResourcesByVariable instanceof Map)) {
            this._moduleResourcesByVariable = new Map();
        }
    }

    _storeModuleResourceRecord(fileConfig = {}, data = null) {
        this._ensureModuleResourceStore();
        const record = {
            fileConfig,
            data,
            loadedAt: Date.now()
        };
        this._moduleResourceRecords.push(record);
        if (fileConfig.name) {
            this._moduleResourcesByName.set(String(fileConfig.name), record);
        }
        if (fileConfig.variable) {
            this._moduleResourcesByVariable.set(String(fileConfig.variable), record);
        }
        return record;
    }

    getModuleResourceRecord(nameOrVariable) {
        if (!nameOrVariable) return null;
        this._ensureModuleResourceStore();
        const key = String(nameOrVariable);
        const stored = this._moduleResourcesByName.get(key) || this._moduleResourcesByVariable.get(key);
        if (stored) return stored;

        const files = this.getModuleSupportingFiles();
        const fileConfig = files.find((file) => file && (file.name === key || file.variable === key));
        if (!fileConfig || !fileConfig.variable || typeof window === 'undefined') return null;

        const data = window[fileConfig.variable];
        if (data == null) return null;
        return this._storeModuleResourceRecord(fileConfig, data);
    }

    getModuleResource(nameOrVariable) {
        const record = this.getModuleResourceRecord(nameOrVariable);
        return record ? record.data : null;
    }

    getModuleResourceConfig(nameOrVariable) {
        const record = this.getModuleResourceRecord(nameOrVariable);
        return record ? record.fileConfig : null;
    }

    loadModuleResource(fileConfig = {}) {
        const helpers = typeof window !== 'undefined' ? window.ContextHelpers : null;
        if (!helpers || typeof helpers.loadModuleResource !== 'function') {
            return Promise.reject(new Error('ContextHelpers.loadModuleResource is not available'));
        }
        return helpers.loadModuleResource(fileConfig, this);
    }

    /**
     * Resolve a dotted path in an object (e.g. runtime.ignore_many).
     * @param {object} obj
     * @param {string} path
     * @returns {*}
     */
    resolveMsgPath(obj, path) {
        if (!obj || !path) return undefined;
        const parts = String(path).split('.');
        let cur = obj;
        for (let i = 0; i < parts.length; i++) {
            if (cur == null || typeof cur !== 'object') return undefined;
            cur = cur[parts[i]];
        }
        return cur;
    }

    /**
     * Language bag from messages.json (`en` / `fr`).
     * Uses getModuleMessages() / _moduleMessages; supports legacy flat root.
     * @param {string} [lang] defaults to active lang
     * @returns {object}
     */
    getLangBag(lang) {
        const root = (typeof this.getModuleMessages === 'function' ? this.getModuleMessages() : null) || this._moduleMessages || {};
        const code = lang || this.getModuleLangCode();
        if (root.en || root.fr) {
            return root[code] || root.en || {};
        }
        return root;
    }

    /**
     * Optional global override: IMPACT.lang[lang][moduleId][path|leaf]
     * Prefers full path key, then leaf key.
     * @param {string} path
     * @returns {string|undefined}
     */
    getModuleLangOverride(path) {
        try {
            const lang = this.getModuleLangCode();
            const moduleId = this._id || this._Id;
            if (!moduleId) return undefined;
            const bag =
                typeof IMPACT !== 'undefined' &&
                IMPACT.lang &&
                IMPACT.lang[lang] &&
                IMPACT.lang[lang][moduleId];
            if (!bag || typeof bag !== 'object') return undefined;
            if (typeof bag[path] === 'string') return bag[path];
            const leaf = String(path).split('.').pop();
            if (leaf && typeof bag[leaf] === 'string') return bag[leaf];
            return undefined;
        } catch (_) {
            return undefined;
        }
    }

    /**
     * Lookup message: global lang override → messages[lang] → messages.en → fallback.
     * Interpolates {{token}} from vars.
     * @param {string} path dotted key (e.g. runtime.ignore_many, labels.Panel_title)
     * @param {object} [vars]
     * @param {string} [fallback]
     * @returns {string}
     */
    moduleMsg(path, vars = {}, fallback) {
        try {
            let text = this.getModuleLangOverride(path);
            if (typeof text !== 'string') {
                const lang = this.getModuleLangCode();
                let resolved = this.resolveMsgPath(this.getLangBag(lang), path);
                if (typeof resolved !== 'string' && lang !== 'en') {
                    resolved = this.resolveMsgPath(this.getLangBag('en'), path);
                }
                text = typeof resolved === 'string' ? resolved : undefined;
            }
            if (typeof text !== 'string') {
                text = typeof fallback === 'string' ? fallback : String(path || '');
            }
            if (vars && typeof vars === 'object') {
                text = text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name) => {
                    const v = vars[name];
                    return v == null ? '' : String(v);
                });
            }
            return text;
        } catch (err) {
            this.logError('moduleMsg', err && err.message ? err.message : err);
            return typeof fallback === 'string' ? fallback : String(path || '');
        }
    }

    /**
     * Section title via messages.sections[title] (+ lang override), else raw title.
     * @param {string} title
     * @returns {string}
     */
    moduleSectionTitle(title) {
        if (!title) return '';
        const fromLang =
            this.getModuleLangOverride(`sections.${title}`) ||
            this.getModuleLangOverride(title);
        if (typeof fromLang === 'string') return fromLang;
        const lang = this.getModuleLangCode();
        const sections = (this.getLangBag(lang).sections) || {};
        if (typeof sections[title] === 'string') return sections[title];
        if (lang !== 'en') {
            const enSections = (this.getLangBag('en').sections) || {};
            if (typeof enSections[title] === 'string') return enSections[title];
        }
        return title;
    }

    /**
     * True when BaseModule.setAllLabels would supply this data-lang-lab key
     * from IMPACT.lang.en common / module block (first pass wins).
     * @param {string} key
     * @returns {boolean}
     */
    isLabelSuppliedByGlobal(key) {
        try {
            if (!key || typeof IMPACT === 'undefined' || !IMPACT.lang) return false;
            const config = IMPACT.lang.en;
            if (!config) return false;
            const moduleId = this._id || this._Id;
            const fromCommon = config.common && config.common[key];
            const fromModule = moduleId && config[moduleId] && config[moduleId][key];
            return typeof fromCommon === 'string' || typeof fromModule === 'string';
        } catch (_) {
            return false;
        }
    }

    /**
     * Apply labels.* onto [data-lang-lab] from messages.json lang bag.
     * @param {object} [options]
     * @param {boolean} [options.skipGlobalSupplied] when true (second pass after IMPACT.lang.en),
     *   skip keys already set by BaseModule when active lang is also `en`
     */
    applyMessagesJsonLabels(options = {}) {
        try {
            const root = (typeof this.getModuleMessages === 'function' ? this.getModuleMessages() : null) || this._moduleMessages;
            if (!root) return;

            const panel = this.Panel || (typeof document !== 'undefined' ? document.getElementById(this._id || this._Id) : null);

            if (!panel) return;
            this.Panel = panel;

            const lang = this.getModuleLangCode();
            const pickBag = (code) => {
                if (root.en || root.fr) {
                    return root[code] || root.en || {};
                }
                return root;
            };
            const bag = pickBag(lang);
            const enBag = lang === 'en' ? bag : pickBag('en');
            const labels = (bag && bag.labels) || {};
            const enLabels = (enBag && enBag.labels) || {};
            const selector = options.selector || '[data-lang-lab]';

            panel.querySelectorAll(selector).forEach((el) => {
                const key = el.getAttribute('data-lang-lab');
                if (!key) return;
                // First pass always reads IMPACT.lang.en — skip those keys only when
                // active lang is also en so fr/other bags can still override.
                if (options.skipGlobalSupplied && lang === 'en' && this.isLabelSuppliedByGlobal(key)) {
                    return;
                }

                let text = typeof labels[key] === 'string' ? labels[key] : undefined;
                if (typeof text !== 'string') {
                    text = typeof enLabels[key] === 'string' ? enLabels[key] : undefined;
                }
                // Optional global override when not skipping (Track / standalone)
                if (!options.skipGlobalSupplied) {
                    const override = this.getModuleLangOverride(`labels.${key}`) || this.getModuleLangOverride(key);
                    if (typeof override === 'string') text = override;
                }
                if (!text) return;

                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.hasAttribute('placeholder')) el.setAttribute('placeholder', text);
                    else el.value = text;
                } else if (el.classList && el.classList.contains('closeIcons')) {
                    el.setAttribute('title', text);
                } else {
                    const badge = el.querySelector && el.querySelector('.qc-tab-badge');
                    if (badge) {
                        const badgeClone = badge.cloneNode(true);
                        el.textContent = '';
                        el.appendChild(document.createTextNode(text + ' '));
                        el.appendChild(badgeClone);
                    } else {
                        el.textContent = text;
                    }
                }
            });
        } catch (err) {
            this.logError('applyMessagesJsonLabels', err.message);
        }
    }

    setAllLabels(options = {}) {
        /*                  
            ! This Function - Set the label text value against the configuration file for all module elements with the "data-lang-lab" attribute.
                ? This will be fired upon initiating the module.
                ? Some fields will be updated while the module is showing.
               * Options.selector: This parameter searches for specific elements to set values for.
               * When module messages.json is available (supportingFiles name `messages` or
               * this._moduleMessages), a second pass applies labels.* from the active lang bag.
        */

        try {
            const defaultLang = 'en';
            const selector = options.selector || '[data-lang-lab]';
            const config = IMPACT.lang ? IMPACT.lang[defaultLang] : null;

            if (!config) {
                return console.error(`Language configuration not found for ${defaultLang}`);
            }

            const collection = this.Panel.querySelectorAll(selector);
            Array.from(collection).forEach(el => {
                const key = el.getAttribute("data-lang-lab");
                if (!key || !config[this._id]) return;

                const value = config.common[key] || config[this._id][key];
                if (typeof value === "string") {
                    el.innerText = value;
                } else {
                    if (typeof this.UpdateLabels == "function") {
                        var updated = this.UpdateLabels(el, key, value);
                        // handles null and undefined
                        if (updated && updated != null) {
                            el.innerText = updated;
                        }
                    }
                }
            });

            // Second pass: messages.json labels when available (skip keys global already set for en)
            if (this.getModuleMessages()) {
                this.applyMessagesJsonLabels({
                    ...options,
                    skipGlobalSupplied: true
                });
            }
        } catch (err) {
            this.logError('-setAllLabels-', err.message);
        }
    }

    async loadTemplate(templatePath) {
        try {
            this.IsExistsModel();
            templatePath = this.getTemplatePath(templatePath);

            // 1. Check if dialog already exists in DOM
            var dialogElement = this.Model_DOM.querySelector(`#${this._id}`);
            if (dialogElement) {
                if (!this._template) {
                    this._template = dialogElement.outerHTML;
                }
                return;
            }

            // 2. Try ModuleTemplateStore first (primary source)
            const bundledDialogTemplate = await this.recoverTemplateFromStore(templatePath);
            if (bundledDialogTemplate) {
                const fragment = this.GetFragment(bundledDialogTemplate);
                dialogElement = fragment && fragment.querySelector ? fragment.querySelector(".mDialog") : null;

                if (dialogElement) {
                    this.Model_DOM.insertAdjacentHTML("beforeend", dialogElement.outerHTML);
                    this._template = dialogElement.outerHTML;
                    console.log(`✅ Dialog template loaded from bundle: ${templatePath}`);
                    return true;
                }
            }

            // 3. Fallback to individual fetch
            const timestamp = new Date().getTime();
            var templateUrl = "";
            var _ROOT = DOMAIN_ROOT + (IS_LOCAL_HOST ? "dist/" : "");

            templateUrl = `${_ROOT}assets/${iVersion}/modules/${templatePath}?_=${timestamp}`;

            console.log(`⚠️ Template not in bundle, fetching: ${templateUrl}`);

            const response = await fetch(templateUrl);

            if (!response.ok) {
                throw new Error(`${this._name} HTTP error! status: ${response.status}, url: ${templateUrl}`);
            }

            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = await response.text();
            dialogElement = tempDiv.querySelector(".mDialog");

            if (!dialogElement) {
                throw new Error(".mDialog element not found in template.html");
            }

            this.Model_DOM.insertAdjacentHTML("beforeend", dialogElement.outerHTML);
            this._template = dialogElement.outerHTML;
            console.log(`✅ Dialog template loaded from fetch: ${templatePath}`);
            return true;

        } catch (error) {
            console.error("Failed to load dialog template:", error);
            this.logError("loadTemplate", error);
            this._errorTracker.logError(error, this._name, 'template_loading');
            throw error;
            // Re-throw so callers know it failed
        }
    }
    renderTemplate(data = {}) {
        if (!this._template) {
            throw new Error('Template not loaded');
        }
        // Simple template variable replacement
        return this._template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '');
    }

    async loadScript() {
        if (IS_LOCAL_HOST && USER_INFO.MAIL_ID_PREFIX === SHARE_USER_IDs[1]) {
            return;
        }

        const currentScript = document.currentScript || document.querySelector('script[src*="e6_common.js"]');
        const timestamp = new Date().getTime();
        var _ROOT = DOMAIN_ROOT + (IS_LOCAL_HOST ? "dist/" : "");
        const scriptUrl = `${_ROOT}assets/${iVersion}/modules/${this._dialogType}/index.js?_=${timestamp}`;
        // Check if the script is already loaded (without timestamp)
        const baseScriptUrl = scriptUrl.split('?')[0];
        if (document.querySelectorAll(`[src^="${baseScriptUrl}"]`).length > 0) {
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = scriptUrl;
            script.type = "text/javascript";
            script.async = true;
            document.head.appendChild(script);
            script.addEventListener("load", () => {
                console.log("Module script loaded successfully.");
                resolve();
            });
            script.addEventListener("error", (error) => {
                console.error("Error loading the module script:", error);
                reject(error);
            });
        });
    }

    static async PreLoad(name, subFolder, options = {}) {
        try {
            const instance = new this(name, subFolder, options);
            const promises = options.ignore_template ? [instance.loadScript()] : [instance.loadTemplate(), instance.loadScript()];
            await Promise.all(promises);
            return instance;
        } catch (error) {
            logError(`PreLoad`, error);
            return !1;
        }
    }
    async checkInitiating() {
        if (!this.initiated) {
            await Promise.all([
                this.loadTemplate(),
                this.loadScript()
            ]);
            await this.lazyInitialize();
            this.initiated = true;
            return true;
        }
    }

    handleButtonClick(event) {
        try {
            const buttonId = event.target.id || 'unnamed-button';
            this._stats.buttonClicks[buttonId] = (this._stats.buttonClicks[buttonId] || 0) + 1;
            this.dispatchRuntimeAction({
                type: "module/buttonClicked",
                payload: this.buildRuntimeModuleSnapshot({
                    buttonId
                })
            });
            debug.log(`Button ${buttonId} clicked in module ${this._name}`);
        } catch (error) {
            this._errorTracker.logError(error, this._name, 'button_click');
        }
    }
    handleInputInteraction(event) {
        try {
            this._stats.inputInteractions++;
            this.dispatchRuntimeAction({
                type: "module/inputInteracted",
                payload: this.buildRuntimeModuleSnapshot({
                    inputId: event && event.target ? event.target.id || null : null
                })
            });
            debug.log(`Input interaction in module ${this._name}`);
        } catch (error) {
            this._errorTracker.logError(error, this._name, 'input_interaction');
        }
    }


    async bindActionEvents(containerSelector) {
        try {
            const container = document.querySelector(containerSelector);
            if (!container) {
                throw new Error(`Container ${containerSelector} not found`);
            }

            this.unbindActionEvents(containerSelector);

            container.querySelectorAll('button').forEach(button => {
                button.addEventListener('click', this._boundButtonHandler);
            });

            container.querySelectorAll('input').forEach(input => {
                input.addEventListener('change', this._boundInputHandler);
                input.addEventListener('keyup', this._boundInputHandler);
            });
        } catch (error) {
            this._errorTracker.logError(error, this._name, 'event_binding');
        }
    }

    unbindActionEvents(containerSelector) {
        try {
            const container = document.querySelector(containerSelector);
            if (!container) return;

            container.querySelectorAll('button').forEach(button => {
                button.removeEventListener('click', this._boundButtonHandler);
            });

            container.querySelectorAll('input').forEach(input => {
                input.removeEventListener('change', this._boundInputHandler);
                input.removeEventListener('keyup', this._boundInputHandler);
            });
        } catch (error) {
            this._errorTracker.logError(error, this._name, 'event_unbinding');
        }
    }

    trackButtonClick(buttonId) {
        this._stats.buttonClicks[buttonId] = (this._stats.buttonClicks[buttonId] || 0) + 1;
        this.dispatchRuntimeAction({
            type: "module/buttonClicked",
            payload: this.buildRuntimeModuleSnapshot({
                buttonId
            })
        });
    }

    trackInputInteraction() {
        this._stats.inputInteractions++;
        this.dispatchRuntimeAction({
            type: "module/inputInteracted",
            payload: this.buildRuntimeModuleSnapshot()
        });
    }

    getStats() {
        return {
            ...this._stats
        };
    }

    getShortenText(str, area = 'dialog') {
        try {
            if (!str) return '';

            const limit = this._state && this._state.text_limit || {
                min: 25,
                max: 75
            };
            if (!limit || str.length <= limit.max) return str;

            const words = str.trim().split(/\s+/);
            let intCount = Math.min(20, words.length);

            let prefix = words.slice(0, intCount).join(" ");
            while (prefix.length > limit.min && intCount > 1) {
                intCount--;
                prefix = words.slice(0, intCount).join(" ");
            }

            if (area === 'dialog' || area === 'panel') {
                const suffix = words.slice(-2).join(" ");
                return `${prefix} ... ${suffix}`;
            }

            return prefix;
        } catch (err) {
            console.warn(err.message);
            return str;
        }
    }
}
