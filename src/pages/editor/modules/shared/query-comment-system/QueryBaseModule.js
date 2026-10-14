/**
 * Resolve which reference support dialog owns a missing-item query under .ref.
 * CMS18 books → referenceDialog; journals / other book styles → MultiRefModule.
 * @param {boolean} isJournal
 * @param {string|null|undefined} refStyle
 * @returns {'referenceDialog'|'MultiRefModule'}
 */
function resolveRefSupportModuleId(isJournal, refStyle) {
    var style = refStyle == null ? '' : String(refStyle);
    var isCms18Book = isJournal === false && ['CMS18', 'CMS 18'].indexOf(style) !== -1;
    return isCms18Book ? 'referenceDialog' : 'MultiRefModule';
}

class QueryBaseModule {
    constructor(name, errorTracker = {}, config) {
        this.name = name;
        this.version = "2.0.0";
        this.initialized = false;
        this.panelModule = null;
        this.dialogModule = null;
        this.restoreModule = null;



        this.config = this._getDefaultConfig();
        this._state = this._initializeState();
        this.events = new EventTarget();
        this.initialize_status = "yts";

        if (IS_TRACK_VIEW) {

        } else {
            this._fileUploader = new FileUploadModule(API_UPLOAD_MULTI);
        }
    }


    errorLogVerification() {
        // ❌ Manual Verification Error - To test ErrorMail and updatedb tracking
        try {
            throw new Error("Manual Verification Error: Tracker and DB Logging test");
        } catch (err) {
            this.errorTracker.logError("system", "errorLogVerification", err);
        }
    }
    /**
     * Get default configuration
     */
    _getDefaultConfig() {
        return {
            selectors: {
                AQ_TOTAL: '[data-label*="AQ"]',
                AQ_OPEN: '[data-status="Open"],[data-status="open"]',
                OVER_ALL_AQ_CMD: '[data-class="ckcommentsfull"]:not([data-ignore-comment])',
                OVER_ALL_CMD: '[data-class="ckcommentsfull"][data-status="comment"]:not([data-ignore-comment])'
            },
            deleteKeys: {
                SINGLE: "one",
                ALL: "all",
                OTHER: "other",
                NONE: "none",
                OTHER_ALL: "other_all"
            },
            roleBasedResponses: {
                author: {
                    responses: ["Yes", "No", "Add Comment"],
                    responses_lww: ["OK", "Add Comment"],
                    statusClass: "author-response",
                    workflowRole: "primary",
                    canCloseWorkflow: true
                },
                editor: {
                    responses: ["Yes", "No", "Add Comment"],
                    responses_lww: ["Yes", "Add Comment"],
                    statusClass: "editor-response",
                    workflowRole: "primary",
                    canCloseWorkflow: true
                },
                collator: {
                    responses: ["Resolved", "Pending", "TS Notes"],
                    statusClass: "collator-response",
                    workflowRole: "verification",
                    canCloseWorkflow: false
                },
                default: {
                    responses: ["Add Instructions"],
                    statusClass: "response-default",
                    workflowRole: "primary",
                    canCloseWorkflow: true
                }
            },
            fileRules: {
                MAX_SINGLE_FILE_SIZE_MB: 100,
                MAX_MULTI_FILE_SIZE_MB: 500,
                invalidExtensions: commonMethods.invalidExtensions
            },
            contentRules: {
                MIN_CONTENT_LENGTH: 2
            },
            sorting: {
                default: "",
                "query": {
                    sortByLocation: false,
                    sortByLabel: true
                },
                "comment": {
                    sortByLocation: false,
                    sortByLabel: true
                }
            },
            snapshotPersistence: {
                removeEmptyFields: true,
                retainEmptyKeys: [],
                forceRemoveKeys: ["changeTimestamp", "sameUserRole"]
            }
        };
    }

    /**
     * initialize state
     */
    _initializeState() {
        return {
            queries: new Map(),
            comments: new Map(),
            counts: {
                total: 0,
                open: 0,
                closed: 0,
                notes: 0
            },
            globalReplyMode: "default",
            globalQuickReplyMode: false,
            replyModeOptions: {},
            editModeOptions: {},
            createModeOptions: {},
            currentQuery: {},
            TOAST_MESSAGES: {
                // ✅ Add / Create
                QA001: {
                    text: 'Query was added successfully',
                    type: 'success'
                },
                CA001: {
                    text: 'Comment was added successfully',
                    type: 'success'
                },
                RA001: {
                    text: 'Response was added for query successfully',
                    type: 'success'
                },
                RY001: {
                    text: 'Reply was added for query/comment successfully',
                    type: 'success'
                },

                // ✏️ Edit / Update
                QE001: {
                    text: 'Query was updated successfully',
                    type: 'success'
                },
                CE001: {
                    text: 'Comment was updated successfully',
                    type: 'success'
                },
                RE001: {
                    text: 'Response was updated successfully',
                    type: 'success'
                },
                RYE001: {
                    text: 'Reply was updated successfully',
                    type: 'success'
                },

                // with / without attachment (if you want variants)
                QE002: {
                    text: 'Query was updated successfully with attachment',
                    type: 'success'
                },
                QE003: {
                    text: 'Query was updated successfully without attachment',
                    type: 'success'
                },

                // ❌ Delete
                QD001: {
                    text: 'Query was deleted successfully',
                    type: 'success'
                },
                CD001: {
                    text: 'Comment was deleted successfully',
                    type: 'success'
                },
                RD001: {
                    text: 'Response was deleted successfully',
                    type: 'success'
                },
                RYD001: {
                    text: 'Reply was deleted successfully',
                    type: 'success'
                },

                // 🔄 Refresh
                PR001: {
                    text: 'Panel was refreshed successfully',
                    type: 'success'
                },

                // ⚠️ Error Cases
                QE999: {
                    text: 'Failed to update query',
                    type: 'error'
                },
                QD999: {
                    text: 'Failed to delete query',
                    type: 'error'
                },
                PR999: {
                    text: 'Failed to refresh panel',
                    type: 'error'
                },
                RY999: {
                    text: 'Failed to add reply for query/comment',
                    type: 'error'
                }
            }
        };
    }


    /**
     * initialize the module
     */
    async initialize() {
        try {
            // Check if all required dependencies are loaded
            const isReady = this._checkDependencies();

            if (!isReady) {
                setTimeout(() => this.initialize(), 1500);
                return;
            }

            if (this.initialize_status === "pending" || this.initialized) return;
            this.initialize_status = "pending";

            this.setupEmitEventListeners();
            this.setupGlobalEventListeners();
            await this.waitForEditor();
            await this.loadConfiguration();

            this._state.currentUserRole = USER_INFO.TRACK_ROLE_NAME;
            this._state.currentUserMailId = USER_INFO.MAIL_ID;
            this._state.isCollator = this._state.currentUserRole === ROLE_IDS[ROLE_IDS.CO].name;
            this._state.roleConfigResponses = this._getRoleConfig();
            this.initialize_status = "pending";
            this.initialized = true;
            this.initialize_status = "completed";
            this.emit("initialized");
            console.log("QueryModule initialized successfully");

            // Track View does not go through moduleRegistry postInitialize —
            // create panel/templates/readonly dialog here.
            if (typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW && !this.panelModule) {
                await this.postInitializeModule();
            }
        } catch (error) {
            console.error("QueryModule initialization failed:", error);
            this.handleError("init", error);
        }
    }

    async postInitializeModule() {
        console.log("QueryModule postInitializeModule successfully");
        await this.initializeSubModules();
    }

    /**
     * Check if dependencies are loaded
     */
    _checkDependencies() {
        var hasEditor = typeof GlobalEditor !== 'undefined' && GlobalEditor && GlobalEditor.document && GlobalEditor.document.$;
        var bootOk = typeof window.InitialLoadDialog !== 'undefined' && (
            window.InitialLoadDialog.FullyLoaded ||
            window.InitialLoadDialog._sessionValidated ||
            (window.InitialLoadDialog.phase && window.InitialLoadDialog.phase !== 'dialogShell')
        );
        return !!(bootOk && BUCKET_URL && DOC_ID && hasEditor);
    }

    /**
     * Get role configuration
     */
    _getRoleConfig() {
        const roleKey = this._state.isCollator ? "collator" : "author";
        const client = (SHARED_KEY && SHARED_KEY.client || "").toLowerCase();
        const baseConfig = this.config.roleBasedResponses[roleKey] || this.config.roleBasedResponses.default || {};

        // Prefer client-specific responses like "responses_lww"
        const clientResponsesKey = `responses_${client}`;
        const responses = baseConfig[clientResponsesKey] || baseConfig.responses || [];

        return {
            ...baseConfig,
            responses
        };
    }


    /**
     * initialize sub-modules (sequential: templates → panel → restore)
     */
    async initializeSubModules() {

        this.attachmentModule = new AttachmentModule();

        if (IS_TRACK_VIEW) {

            this.panelModule = new QueryPanelModule("queryPanel");
            this.templates = new QueryTemplates('queryTemplates');
            if (this.templates) this.templates.parent = this;
            if (this.panelModule) {
                this.panelModule.parent = this;
                this.panelModule.templates = this.templates;
                window.queryPanel = this.panelModule;
            }

            // Readonly show dialog on Track View (thread only — no create/reply/verify)
            try {
                // Track View often omits module_main → BaseModule undefined.
                // getQueryDialogModuleConfig() defines `class … extends BaseModule` — must guard first.
                const hasBaseModule = typeof BaseModule !== "undefined";
                if (!hasBaseModule) {
                    console.info("Track View: skipping queryDialog (BaseModule not defined)");
                } else {
                    const dialogConfig = typeof getQueryDialogModuleConfig === "function" ?
                        getQueryDialogModuleConfig() : null;
                    if (dialogConfig && dialogConfig.moduleClass) {
                        this.dialogModule = new dialogConfig.moduleClass("queryDialog");
                        this.dialogModule.parent = this;
                        if (typeof this.dialogModule.initialize === "function") {
                            this.dialogModule.initialize();
                        }
                        if (typeof this.dialogModule._ensureParent === "function") {
                            this.dialogModule._ensureParent();
                        }
                        this.dialogModule.templates = this.templates;
                        window.queryDialog = this.dialogModule;
                    }
                }
            } catch (err) {
                console.warn("Track View queryDialog init failed:", err && err.message);
            }

            return !!(this.panelModule && this.templates);

        } else {
            const modules = [{
                    name: "queryPanel",
                    moduleClass: QueryPanelModule,
                    type: "lazy",
                    templatePath: "",
                    contextMenu: false,
                    commands: []
                },
                {
                    name: "queryRestore",
                    moduleClass: QueryRestoreModule,
                    type: "lazy",
                    templatePath: "",
                    contextMenu: false,
                    commands: []
                },
                {
                    name: "queryTemplates",
                    moduleClass: QueryTemplates,
                    type: "lazy",
                    templatePath: "",
                    contextMenu: false,
                    commands: []
                }
            ];

            await Promise.all(
                modules.map(module => moduleSystem.registerModule(module.name, module))
            );

            await moduleSystem.registerModule("queryDialog", getQueryDialogModuleConfig());

            const [panelModule, restoreModule, templates, dialogModule] = await Promise.all([
                moduleSystem.getModule("queryPanel"),
                moduleSystem.getModule("queryRestore"),
                moduleSystem.getModule("queryTemplates"),
                moduleSystem.getModule("queryDialog")
            ]);

            this.panelModule = panelModule;
            this.restoreModule = restoreModule;
            this.templates = templates;
            this.dialogModule = dialogModule;

            // ? wire templates.parent on editor path (Track View already does this) - 05_SEP_26_DR
            if (this.templates) this.templates.parent = this;

            if (this.dialogModule) {
                this.dialogModule.parent = this;
                if (typeof this.dialogModule._ensureParent === "function") {
                    this.dialogModule._ensureParent();
                }
                this.dialogModule.templates = this.templates;
                window.queryDialog = this.dialogModule;
            }

            return !!(this.panelModule && this.restoreModule && this.templates && this.dialogModule);
        }
    }

    setupEditorEventListeners() {
        // ! look reference
        // ? `onAfterSetData`
    }



    setupGlobalEventListeners() {
        /* Handle global deletion */
        $(document).on('click', '.delete-btn,.delete-reply', (e) => {
            this.evtDelete(e, false);
        });
    }

    /**
     * Wait for the editor to be ready
     */
    async waitForEditor() {
        return new Promise((resolve) => {
            const checkEditor = () => {
                if (typeof GlobalEditor !== 'undefined' && GlobalEditor && GlobalEditor.document && GlobalEditor.document.$) {
                    this.editor = GlobalEditor;
                    this.editorDocBody = this.editor.document.$;
                    resolve(this.editor);
                    this.setupEditorEventListeners();
                } else {
                    setTimeout(checkEditor, 100);
                }
            };
            checkEditor();
        });
    }

    /**
     * Load configuration from external source
     */
    async loadConfiguration() {

        if (IS_TRACK_VIEW) return;
        this.config["CONTEXT_GROUP"] = {};
        this.config.SHOW_CONTEXT_GROUP = false;

        const hasConfig = typeof I_CONFIG !== "undefined" && I_CONFIG && typeof I_CONFIG.querySelector === "function";
        const commentQueryGroup = hasConfig ? I_CONFIG.querySelector("[name='commentQueryGroup']") : null;

        if (!commentQueryGroup) {
            console.warn("QueryModule loadConfiguration: commentQueryGroup unavailable; context menu disabled");
            this.config.SHOW_CONTEXT_GROUP = true;
        } else {
            try {
                this.config.SHOW_CONTEXT_GROUP = typeof IsContextMenu == "function" ? !!IsContextMenu('commentQueryGroup') : false;
            } catch (err) {
                console.warn("QueryModule loadConfiguration: IsContextMenu(commentQueryGroup) failed:", err.message);
                this.config.SHOW_CONTEXT_GROUP = false;
            }

            if (typeof GET_CONFIG_ITEM === 'function') {
                Array.from(commentQueryGroup.children || []).forEach(el => {
                    let name = el.getAttribute("name");
                    this.config["CONTEXT_GROUP"][name] = GET_CONFIG_ITEM(el, {
                        CONVERT_JSON: true,
                        children: true,
                        attr: true,
                        hex2string: false,
                        keyUpperCase: false,
                        hierarchy: true
                    });
                });
            }
        }

        let config = {};
        if (typeof GET_CONFIG_ITEM === 'function') {
            try {
                config = GET_CONFIG_ITEM("[name='NoteDialogModule']", {
                    CONVERT_JSON: true,
                    children: true,
                    keyUpperCase: false
                });
                Object.assign(this.config, config);
            } catch (err) {
                console.warn("QueryModule loadConfiguration: NoteDialogModule unavailable", err && err.message);
            }
        }

        for (let key in config) {
            if (config.hasOwnProperty(key)) {
                let entry = config[key];
                let ObjTwo = {
                    // "DEL_ALL": IsContextMenu(entry['name']),
                    // "SAME_USER": entry['showSameUser'] == "true",
                };

                // Ensure target exists before merging
                this.config[key] = this.config[key] || {};
                Object.assign(this.config[key], ObjTwo);
            }
        }
    }


    /**
     * Setup event listeners
     */
    setupEmitEventListeners() {
        const events = [{
                event: "query-created",
                handler: "handleResponseUpdates"
            },
            {
                event: "query-updated",
                handler: "handleResponseUpdates"
            },
            {
                event: "query-loaded",
                handler: "handleResponseUpdates"
            },
            {
                event: "query-deleted",
                handler: "handleResponseUpdates"
            },


            {
                event: "response-updated",
                handler: "handleResponseUpdates"
            },
            {
                event: "response-added",
                handler: "handleResponseUpdates"
            },
            {
                event: "response-deleted",
                handler: "handleResponseUpdates"
            },
            // { event: "query-change-fire", handler: "handleQueryChanges" },
        ];

        events.forEach(({
            event,
            handler
        }) => {
            this.events.addEventListener(event, (e) => {
                const handlerFn = this[handler];
                if (typeof handlerFn === 'function') {
                    handlerFn.call(this, e);
                }
            });
        });
    }

    handleResponseUpdates(eventData) {

        const {
            query
        } = eventData.detail || eventData;
        const canRefreshAQBackup = /deleted/.test(eventData.type);

        // exit if missing
        if (!query || !query.id) return;

        const {
            editorEl,
            id
        } = query;

        debug.log('handleResponseUpdates called with:', id);

        if (window.paraLock && window.paraLock._isEnabled) {
            if (window.paraLock._handleQueryCommentRelatedUpdates) {
                window.paraLock._handleQueryCommentRelatedUpdates(id, editorEl);
            }
        }

        //  Append backup for current query
        try {
            this.appendBackupFile(id, query);
        } catch (err) {
            console.error("[handleResponseUpdates] Failed to append backup for:", id, err);
        }
        // Refresh panel if available
        if (this.panelModule) {
            const renderType = query.status == "comment" ? "comment" : "query";
            const updatedExistingRow = typeof this.panelModule.updateItemFilterStatus === "function" ?
                this.panelModule.updateItemFilterStatus(id, renderType) :
                false;
            if (updatedExistingRow && typeof this.panelModule.scheduleRenderItemPreserveFilter === "function") {
                this.panelModule.scheduleRenderItemPreserveFilter(id, renderType);
            } else if (typeof this.panelModule.renderItemPreserveFilter === "function") {
                this.panelModule.renderItemPreserveFilter(id, renderType);
            } else if (typeof this.panelModule.renderItem === "function") {
                this.panelModule.renderItem(id, renderType);
            }
        }

    }

    appendBackupFile(itemId, queryOrCommentData) {
        try {
            // ? 18_FEB_2023 - UPDATE SEPARATE_AQ.HTML - UPDATED QUERY
            const self = this;

            commonfn.query_append = function(response) {
                try {
                    debug.info('query append ...' + JSON.stringify(response));
                    if (response.r == 0) {
                        ErrorLogTrace('query_append', "not_append");
                    } else {

                        // Keep reference at module / class scope
                        if (self._refreshDomCacheTimer) {
                            clearTimeout(self._refreshDomCacheTimer);
                        }

                        self._refreshDomCacheTimer = setTimeout(function(_self) {
                            _self.refreshDomCache();
                        }, IS_JOURNAL ? 3000 : 10000, self);


                        // Compare versions (delayed to allow DOM stabilization)
                        // adjustable if async rendering takes longer
                        const delayMs = 1750;
                        setTimeout((_self) => {
                            try {
                                // typeof _self.compareVersions === "function" && _self.compareVersions(itemId);
                            } catch (err) {
                                console.error("[handleResponseUpdates] compareVersions failed for:", err);
                            }

                        }, delayMs, self);
                    }
                } catch (err) {
                    ErrorLogTrace('query_append', err.message);
                    console.warn(err.message);
                }
            };


            const queryOrComment = queryOrCommentData.editorEl;
            var sendElement = queryOrComment;
            if (queryOrComment && queryOrComment.parentNode && queryOrComment.parentNode.tagName === "INSERT") {
                sendElement = queryOrComment.parentNode;
            }

            var content = "";

            if (sendElement) {
                if (sendElement.outerHTML) {
                    content = sendElement.outerHTML;
                } else {
                    content = sendElement;
                }
            }

            var JSON_DATA = GET_JSON("query_append", {
                findid: itemId,
                content: content
            });

            // debug.log(JSON.stringify(JSON_DATA));
            commonfn.callajax(JSON_DATA, 'query_append', API_FILE_APPEND);

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('query_append_sep_file', err.message);
        }
    }
    refreshDomCache() {
        try {
            const self = this;
            var module = self.restoreModule || window.queryRestore;
            if (module && typeof module.refreshAqBackup === "function") {
                var result = module.refreshAqBackup();
                debug.log("refreshAqBackup result:", result);
            } else {
                console.warn("[handleResponseUpdates] refreshAqBackup() not defined.");
            }
        } catch (err) {
            console.error("[handleResponseUpdates] refreshAqBackup failed for:", err);
            throw err;
        }
    }
    /**
     * SIMPLE CHECK: Verify element exists in editor
     * compareVersions(queryId) {
 
        const query = this.getQuery(queryId);
 
        if (!query || !query.editorEl) {
 
            // TODO restore
            return null;
        }
 
        //  1. Get editor HTML
        var editorNode = (this.editor && this.editor.document) ? this.editor.document.getById(queryId) : null;
        var editorOuterHtml = (editorNode && editorNode.$ && editorNode.$.outerHTML) ? editorNode.$.outerHTML : "";
        var stateOuterHtml = query.editorEl.outerHTML || "";
 
        //  2. Get backup HTML (if available)
        var backupEl = null;
        var backupOuterHtml = null;
        if (
            this.restoreModule &&
            this.restoreModule.contexts &&
            this.restoreModule.contexts.aqBackup &&
            this.restoreModule.contexts.aqBackup.domCache
        ) {
            backupEl = this.restoreModule.contexts.aqBackup.domCache.querySelector('[id="' + queryId + '"]');
            if (backupEl) {
                backupOuterHtml = backupEl.outerHTML;
            }
        }
 
        //  3. Compare all three versions (boolean equality)
        var editorVsState = stateOuterHtml ? editorOuterHtml === stateOuterHtml : null;
        var editorVsBackup = backupOuterHtml ? editorOuterHtml === backupOuterHtml : null;
        var stateVsBackup = null;
 
        //  4. Compare structure: backup vs state (detect superset)
        if (backupEl && query.editorEl) {
            try {
                var stateChildren = query.editorEl.children.length;
                var backupChildren = backupEl.children.length;
 
                if (backupOuterHtml === stateOuterHtml) {
                    // identical
                    stateVsBackup = true;
                } else if (backupChildren > stateChildren) {
                    // backup has more content
                    stateVsBackup = "backup-priority";
                } else {
                    // diverged
                    stateVsBackup = false;
                }
            } catch (err) {
                stateVsBackup = null;
            }
        }
 
        //  5. Detailed comparison summary (for diagnostics)
        var comparisonSummary = {
            identicalCount: 0,
            mismatchedCount: 0,
            identicalPairs: [],
            mismatchedPairs: []
        };
 
        var pairs = [
            ["Editor ↔ State", editorVsState],
            ["Editor ↔ Backup", editorVsBackup],
            ["State ↔ Backup", stateVsBackup]
        ];
 
        for (var i = 0; i < pairs.length; i++) {
            var label = pairs[i][0];
            var matchValue = pairs[i][1];
            if (matchValue === true) {
                comparisonSummary.identicalCount++;
                comparisonSummary.identicalPairs.push(label);
            } else if (matchValue === false || matchValue === "backup-priority") {
                comparisonSummary.mismatchedCount++;
                comparisonSummary.mismatchedPairs.push(label);
            }
        }
 
        //  6. Auto-repair logic (restore editor if it’s out of sync)
        if ((stateVsBackup === true || stateVsBackup === "backup-priority") &&
            (!editorVsState || !editorVsBackup)) {
            try {
                var $target = (editorNode && editorNode.$) ? $(editorNode.$) : null;
                if ($target && $target.length) {
                    var replacementHtml = (stateVsBackup === "backup-priority") ? backupOuterHtml : stateOuterHtml;
                    $target.replaceWith(replacementHtml);
 
                    console.info(
                        "[compareVersions] Editor was out of sync — replaced with " +
                        (stateVsBackup === "backup-priority" ? "backup" : "state") +
                        " HTML for:",
                        queryId
                    );
                }
            } catch (err) {
                console.error("[compareVersions] Failed to auto-repair editor for:", queryId, err);
            }
        }
 
        //  7. Log results for debugging
        console.groupCollapsed("compareVersions → " + queryId);
        console.table({
            "Editor ↔ State": editorVsState,
            "Editor ↔ Backup": editorVsBackup,
            "State ↔ Backup": stateVsBackup
        });
        console.log("Summary:", comparisonSummary);
        console.groupEnd();
 
        //  8. Return rich comparison result
        return {
            editorHtml: editorOuterHtml,
            stateHtml: stateOuterHtml,
            backupHtml: backupOuterHtml,
            match: {
                editorVsState: editorVsState,
                editorVsBackup: editorVsBackup,
                stateVsBackup: stateVsBackup
            },
            summary: comparisonSummary
        };
    }
     */



    /**
     * Normalize attachments data
     */
    normalizeAttachments(attachments) {
        if (!attachments || !attachments.length) return [];

        return attachments.map(attachment => ({
            file_sn: attachment.file_sn || "",
            file_on: attachment.file_on || "",
            name: attachment.name || "",
            url: attachment.url || ""
        }));
    }

    /**
     * Format and normalize attachments for a query/response
     */
    formatAttachmentResponse(attachmentData = {}) {
        if (!attachmentData || !attachmentData.file_sn) return attachmentData;

        const {
            id,
            file_sn,
            file_on,
            ext,
            DISK_PATH
        } = attachmentData;

        return file_sn.map((sn, i) => ({
            id: id || "",
            file_sn: sn,
            file_on: (file_on && file_on[i]) || "",
            // use file_on or fallback to sn
            name: (file_on && file_on[i]) || sn,
            ext: (ext && ext[i]) || sn.split('.').pop(),
            url: DISK_PATH ? `${DISK_PATH}${sn}` : `${BUCKET_URL}${DOC_ID}/attachments/${sn}`
        }));
    }



    /**
     * Build response object
     */
    buildResponse(responseData = {}, element, query = {}) {
        // Handle attachment formatting
        if (responseData.attachments && responseData.attachments.r) {
            responseData.attachments = this.formatAttachmentResponse(responseData.attachments);
        }

        const response = {
            id: responseData.id || this.generateResponseId(),
            content: responseData.content || "",
            user: responseData.user || this._state.currentUserMailId,
            role: responseData.role || this._state.currentUserRole,
            timestamp: responseData.timestamp || Date.now(),
            attachments: responseData.attachments || [],
            sameUserRole: responseData.sameUserRole !== undefined ? responseData.sameUserRole : true
        };

        if (element) {
            this._enrichResponseFromElement(response, element);
        }

        return response;
    }

    _deriveCollatorCollationStatus(content) {
        return /approved|verified|resolved/gi.test(content || "") ? "approved" : "pending";
    }

    _syncCollatorCollationStatus(item, content, domEl) {
        if (!this._state || !this._state.isCollator || !item) return null;

        const collationStatus = this._deriveCollatorCollationStatus(content);
        item.collationStatus = collationStatus;

        const nodeEl = domEl || item.editorEl;
        if (nodeEl) {
            $(nodeEl).attr("data-collation-status", collationStatus);
        }

        return collationStatus;
    }

    /**
     * Enrich response with element data
     */
    _enrichResponseFromElement(response, element) {

        const dataJSON = commonMethods.get_user_info(element);

        Object.assign(response, dataJSON);

        const dbId = element.getAttribute("data-db-id");
        const fileSn = element.getAttribute("data-file-sn");
        const fileOn = element.getAttribute("data-file-on");

        if (fileSn || fileOn) {
            const snList = fileSn ? fileSn.split("||") : [];
            const onList = fileOn ? fileOn.split("||") : [];
            response.attachments = snList
                .map((sn, index) => {
                    const normalizedSn = (sn || "").trim();
                    if (!normalizedSn) return null;

                    return {
                        id: dbId || "",
                        file_sn: normalizedSn,
                        file_on: ((onList[index] || "") + "").trim()
                    };
                })
                .filter(Boolean);
        }
    }

    checkSupportModule(queryData, returnId) {
        try {
            var queryOrComment = (typeof queryData === "string") ?
                this.getQuery(queryData) :
                queryData;

            if (!queryOrComment) {
                console.warn("checkSupportModule: invalid query data", queryData);
                return "";
            }

            var queryContent = (queryOrComment.content || "").toLowerCase();
            var target = queryOrComment.editorEl || (this.editor && this.editor.document ? this.editor.document.getById(queryOrComment.id) : null);

            // Configurable keyword lists
            var missingItems = [
                "surname", "given name", "author name or institution name", "collab",
                "editor\\(s\\) name", "editors name", "editor name",
                "article title", "year of publication", "journal title", "volume",
                "supplement", "issue number", "page range", "doi number", "doi", "url",
                "accessed date", "book title", "conference name", "conference date",
                "conference place", "thesis title", "translate", "website title",
                "inventor suffix", "inventor prefix", "assignee collab",
                "patent title", "published date", "published-date", "publisher-location", "publisher location",
                "publisher name", "publisher", "Opening page", "closing page",
                "year", "issue", "page number", "end page number", "closing page number"
            ];

            var ignoreItems = ["alt text", "affiliations"];
            var suppFilesCount = (this.editor && this.editor.document) ?
                this.editor.document.find(".supplementary-material").toArray().length :
                0;

            var suppPattern = /we have received(?: the following)? files for publication as supplementary material/i;
            var moduleId = "";

            //  Identify support module 
            if (suppFilesCount > 0 && suppPattern.test(queryContent)) {
                moduleId = "SuppMaterialModule";
                // TODO 
            } else if (target && target.closest && target.closest(".ref")) {
                var hasMissing = missingItems.some(function(item) {
                    var normalizedItem = item.toLowerCase();
                    var hasTextMatch = queryContent.indexOf(normalizedItem) !== -1;
                    var hasPatternMatch = new RegExp(normalizedItem, "i").test(queryContent);
                    return hasTextMatch || hasPatternMatch;
                });
                var hasIgnore = ignoreItems.some(function(item) {
                    return queryContent.indexOf(item.toLowerCase()) !== -1;
                });
                if (hasMissing && !hasIgnore) {
                    // Same ownership matrix as registerOnReady: CMS18 books →
                    // referenceDialog; journals / other book styles → MultiRefModule.
                    var refStyle = (typeof SHARED_KEY !== 'undefined' && SHARED_KEY && SHARED_KEY.refstyle) || '';
                    var isJournal = typeof IS_JOURNAL !== 'undefined' ? !!IS_JOURNAL : true;
                    moduleId = resolveRefSupportModuleId(isJournal, refStyle);
                }
            } else if (target && (
                    target.hasAttribute("data-annotate") ||
                    (target.querySelector && target.querySelector("[data-annotate]"))
                )) {
                moduleId = "AnntationDialog";
            }

            //  Return moduleId only 
            if (returnId === true) {
                return moduleId;
            }

            // No match found
            return moduleId;

        } catch (error) {
            console.error("checkSupportModule failed:", error);
            return "";
        }
    }



    /**
     * Build query object
     */
    buildQuery(queryData = {}) {
        return this._normalizeQueryData(queryData);
    }

    /**
     * Centralized normalization and defaulting for queryData
     */
    _normalizeQueryData(queryData = {}) {
        const allowedKeys = new Set([
            "id", "label", "status", "collationStatus", "content", "user", "role",
            "timestamp", "responses", "attachments", "editorEl", "lastResponse",
            "openSupportModule", "sameUserRole", "deleted", "deletedBy", "deletedRole",
            "deletedAt", "highSpan", 'changeTimestamp', 'modifiedAt', 'modifiedBy', 'responseCount'
        ]);

        // Detect unexpected keys
        const extraKeys = Object.keys(queryData).filter(k => !allowedKeys.has(k));
        if (extraKeys.length > 0) {
            console.warn(
                `[QueryManager] Unexpected fields in queryData: ${extraKeys.join(", ")}. ` +
                "These will be ignored. Make sure _normalizeQueryData handles them if required."
            );
        }

        const moduleId = this.checkSupportModule(queryData, true);
        const now = Date.now();

        const query = {
            id: queryData.id || this.generateQueryId(),
            label: queryData.label || ("AQ" + (this._state.queries.size + 1)),
            status: (queryData.status || "open").toLowerCase(),
            collationStatus: queryData.collationStatus || "pending",
            content: queryData.content || "",
            user: queryData.user || "",
            role: queryData.role || "",
            timestamp: queryData.timestamp || now,
            responses: queryData.responses || [],
            attachments: queryData.attachments || [],
            editorEl: queryData.editorEl || null,
            lastResponse: queryData.lastResponse || {},
            openSupportModule: moduleId,
            sameUserRole: queryData.sameUserRole === true && (queryData.responses || []).length == 0,
            deleted: queryData.deleted || "false",
            highSpan: queryData.highSpan || []
        };

        if (query.deleted === "true") {
            query.deletedBy = queryData.deletedBy || "";
            query.deletedRole = queryData.deletedRole || "";
            query.deletedAt = queryData.deletedAt || now;
        }

        return query;
    }



    /**
     * Create a new query / comment
     */
    async createQuery(queryData) {
        if (typeof queryData === "string") {
            const newEl = this.editor.document.getById(this._current_process_uniqueId);
            if (newEl) {
                queryData = this._parseQueryNode(newEl.$);
            } else return;
        }

        const query = this._normalizeQueryData(queryData);
        const isComment = this._state._current_process === "comment";
        this._state[isComment ? "comments" : "queries"].set(query.id, query);
        this.updateCounts();
        this.emit("query-created", {
            query
        });

        return query;
    }

    /**
     * Update existing query / comment
     */
    async updateQueryOrCommentItem(queryId, updates) {

        var queryOrComment = this.getQuery(queryId);

        if (!queryOrComment) {
            // Instead of throwing raw, give more context
            console.error("update: Query / Comment not found", queryId, process);
            throw new Error("object " + queryId + " not found in " + process);
        }

        try {
            // Merge updates
            queryOrComment = Object.assign(queryOrComment, updates);

            // Update DOM

            if (queryOrComment.editorEl || updates.domEl) {

                const node = updates.domEl ? updates.domEl : queryOrComment.editorEl;

                const $el = updates.deleted ? $(node) : $(node).children().first();


                this._updateElementDOM($el, queryOrComment, updates);

                const isCollatorOwnedParent = this._state && this._state.isCollator &&
                    queryOrComment.sameUserRole === true &&
                    (!queryOrComment.responses || queryOrComment.responses.length === 0);
                if (isCollatorOwnedParent && Object.prototype.hasOwnProperty.call(updates, "content")) {
                    this._syncCollatorCollationStatus(queryOrComment, updates.content, node);
                }
            }

            // Update local state
            if (typeof this.updateCounts === "function") {
                this.updateCounts();
            }

            // Emit event if emitter available
            if (typeof this.emit === "function") {
                this.emit("query-updated", {
                    query: queryOrComment
                });
            }

            return {
                success: true,
                query: queryOrComment
            };
        } catch (err) {
            console.error("updateQuery failed:", err);
            return {
                success: false,
                error: err
            };
        }

        // return queryOrComment;
    }


    /**
     * Update DOM element attributes
     */
    _updateElementDOM($el, item, updates) {
        if (!$el || !$el.length) return;

        const attrs = this._buildElementAttributes(item, updates);
        $el.attr(attrs);

        // Remove attachment attrs if no attachments
        const attachments = updates.attachments || item.attachments || [];
        if (attachments.length === 0) {
            $el.removeAttr("data-db-id data-file-sn data-file-on");
        }

        // Update track code on parent container for query/comment updates/deletes
        const $parent = $el.closest('[data-class="ckcommentsfull"]');
        if ($parent.length) {
            const currentTrackCode = $parent.attr('data-track-code') || '';
            let newTrackCode = currentTrackCode;

            if (updates.deleted) {
                // Update track code to "delete" version
                if (currentTrackCode.startsWith('query-')) newTrackCode = 'query-04';
                else if (currentTrackCode.startsWith('comment-')) newTrackCode = 'comment-03';
                else if (currentTrackCode.startsWith('annotate-')) newTrackCode = 'annotate-03';
            } else if (updates.content || updates.attachments) {
                // Update track code from "new"/replied to "update" version
                if (currentTrackCode === 'query-01' || currentTrackCode === 'query-02') newTrackCode = 'query-03';
                else if (currentTrackCode === 'comment-01') newTrackCode = 'comment-02';
                else if (currentTrackCode === 'annotate-01') newTrackCode = 'annotate-02';
            }

            if (newTrackCode !== currentTrackCode) {
                $parent.attr('data-track-code', newTrackCode);
                if (!$parent.attr('data-sr-panel-unique-id')) {
                    const uid = 'srp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
                    $parent.attr('data-sr-panel-unique-id', uid);
                }
            }
        }
    }

    /**
     * Build DOM attributes for query/response element
     */
    _buildElementAttributes(item, updates = {}) {
        const {
            attachments = [], content = "", timestamp, user, role, deleted = false, deletedBy = null, deletedRole = null, deletedAt = null
        } = {
            ...item,
            ...updates
        };

        if (deleted && deletedBy) {
            return {
                "data-deleted": "true",
                "data-deleted-by": deletedBy,
                "data-deleted-role": deletedRole || "",
                "data-deleted-time": deletedAt || Date.now()
            };
        }

        const attrs = {
            "data-time": timestamp || Date.now()
        };

        // Add user/role attributes if present (for responses)
        if (user) attrs["data-username"] = user;
        if (role) {
            attrs["data-rolename"] = role;
            Object.keys(updates).length === 0 && (attrs["data-role"] = role);
        }

        // Add attachment attributes if present
        if (attachments.length > 0) {
            attrs["data-db-id"] = attachments[0].id || "";
            attrs["data-file-sn"] = attachments.map(a => a.file_sn || "").join("||");
            attrs["data-file-on"] = attachments.map(a => a.file_on || "").join("||");
        }

        const newValue = this.verifyOnceContent(content);
        attrs["data-user-comment-box"] = newValue;
        if (item.status != "commment") {

        }
        return attrs;
    }

    evtDelete(e) {
        e.preventDefault();
        try {
            const $btn = $(e.currentTarget);
            if (!$btn.length) return;

            // 🔹 Find nearest query container
            const $container = $btn.closest("[data-query-id]");
            const queryId = $container.attr("data-query-id");

            if (!queryId) {
                console.warn("⚠️ evtDelete: Missing data-query-id container");
                return;
            }


            // 🔹 Determine context (dialog vs panel)
            const isDialog = $container.hasClass("dialog-input-group");
            const thirdParams = isDialog ? "dialog" : "panel";

            // 🔹 Determine delete key
            const delKey = $btn.attr("data-delete-key") || "one";

            // 🔹 Confirm and execute delete
            this.confirmDelete(queryId, delKey, thirdParams);
        } catch (err) {
            // this.errorTracker.logError("system", "evtDelete", err);
            throw err;
        }
    }


    async confirmDelete(queryId, delKey, from = null) {
        // 'delete_command'| 'delete_command_other'|'delete_command_all'
        const baseKey = 'delete_command';
        const deleteKey = /* ( delKey === 'one') ? baseKey : */ `${baseKey}_${delKey}`;

        const result = await AlertNewDialog.fire(deleteKey);

        if (result.isConfirmed) {
            if (result.button3 == true) {

            } else if (delKey == "all" && !result.button3) {
                delKey = `one`;
            }

            var results = await this.handleDeleteReplyOrComments(queryId, delKey);
            if (results) this.panelModule.refresh(true);
            if (from == "dialog") {
                const dialog = this.dialogModule || window.queryDialog;
                if (dialog && typeof dialog.close === "function") {
                    dialog.close(true);
                }
            }
        }
    }

    /**
     * Handle response deletion via getCurrentFormContent
     */
    async handleDeleteReplyOrComments(queryId, permissionKey = "one") {
        var queryOrComment = this.getQuery(queryId);
        if (!queryOrComment) return;

        var results = {};

        IMPACT_SELECTION._SNAPSHOT({
            unlock: true,
            save: true
        });
        try {
            var hasResponses = queryOrComment.responses && queryOrComment.responses.length > 0;
            var lastResponseId = hasResponses ? queryOrComment.lastResponse.id : null;
            const isComment = queryOrComment.status == "comment";

            if ((/all|other_all/gi.test(permissionKey) && isComment)) {
                results = await this.deleteQueryOrComment(queryOrComment, {
                    adminUser: true
                });
            }

            // 🔹 Case 1: delete only last response (if exists)
            else if (lastResponseId) {
                results = await this.deleteResponse(queryId, lastResponseId);
                // queryOrComment.responses.pop();

                // If no responses remain after deletion → remove parent
                if (queryOrComment.responses.length === 0) {
                    // await this.parent.deleteQueryOrComment(queryOrComment);
                }
            }
            // 🔹 Case 2: no responses but sameUserRole → delete parent directly
            else if (!hasResponses && queryOrComment.sameUserRole === true) {
                results = await this.deleteQueryOrComment(queryOrComment, {
                    sameUser: true,
                    addTrack: true
                });
            }
        } catch (err) {
            console.error("Failed to delete last response:", err);
        } finally {

            IMPACT_SELECTION._SNAPSHOT({
                unlock: true,
                save: true
            });

            return results;
        }
    }

    removeHighSpan(queryOrComment, queryId) {
        try {
            let highlightPan = [];

            // 🔹 Collect spans from stored reference (if available)
            if (Array.isArray(queryOrComment && queryOrComment.highSpan)) {
                highlightPan = [...queryOrComment.highSpan];
            }

            // 🔹 Add spans found in DOM by data-hid
            if (this.editorDocBody && this.editorDocBody.querySelectorAll) {
                const domSpans = Array.from(this.editorDocBody.querySelectorAll(`[data-hid="${queryId}"]`));
                highlightPan = highlightPan.concat(domSpans);
            }

            // 🔹 Filter: only valid elements, unique by reference
            const uniqueSpans = Array.from(
                new Set(highlightPan.filter(el => el && el.nodeType === 1))
            );

            // 🔹 Unwrap highlight spans safely
            uniqueSpans.forEach(el => $(el).contents().unwrap());

        } catch (err) {
            console.error("Failed to remove highlight spans for:", queryId, err);
        }
    }



    /**
     * Delete a query
     */
    async deleteQueryOrComment(queryId, options) {
        options = options || {};

        // Get query or comment safely
        var queryOrComment = (typeof queryId === "string") ? this.getQuery(queryId) : queryId;
        queryId = (typeof queryId != "string") ? queryId.id : queryId;

        if (!queryOrComment) {
            var alert = "Query or comment not found";
            if (typeof this.showToast === "function") {
                this.showToast(alert, "error");
            }
            throw new Error(alert);
        }

        var status = queryOrComment.status || "query";
        // var id = queryOrComment.id;
        var mapKey = (status === "comment") ? "comments" : "queries";
        var alertKey = (status === "comment") ? "comment" : "query";

        try {

            // Perform deletion
            if (options.adminUser || options.addTrack) {
                // ✅ Update the query/comment item with delete tracking
                const deleteTrackingData = {
                    deleted: true,
                    deletedBy: this._state.currentUserMailId,
                    deletedRole: this._state.currentUserRole,
                    deletedAt: Date.now()
                };
                // Update via updateQueryOrCommentItem to sync DOM
                if (typeof this.updateQueryOrCommentItem === 'function') {
                    await this.updateQueryOrCommentItem(queryId, deleteTrackingData);
                }
                this.removeHighSpan(queryOrComment, queryId);
            } else if (options.sameUser) {
                if (this._state && this._state[mapKey] && typeof this._state[mapKey].delete === "function") {

                    // 🔹 Remove from internal state
                    this._state[mapKey].delete(queryId);

                    // 🔹 Remove editor element from DOM
                    if (queryOrComment.editorEl) {
                        $(queryOrComment.editorEl).remove();
                    }
                    this.removeHighSpan(queryOrComment, queryId);
                }
            }



            // Update counts safely
            if (typeof this.updateCounts === "function") {
                this.updateCounts();
            }

            // Emit event if supported
            if (typeof this.emit === "function") {
                this.emit("query-deleted", {
                    query: queryOrComment,
                    hardDelete: !!options.hardDelete
                });
            }

            return queryOrComment;
        } catch (err) {
            console.error("Failed to delete " + alertKey + ":", err);
            if (typeof this.showToast === "function") {
                this.showToast("Failed to delete " + alertKey + ". Please try again.", "error");
            }
            throw err;
        }
    }

    /**
     * Generic response operation handler
     */
    _performResponseOperation(queryId, operation, ...args) {
        const query = this.getQuery(queryId);
        if (!query) {
            throw new Error(`Query ${queryId} not found`);
        }

        return operation(query, ...args);
    }

    /**
     * Save response to query
     */
    _saveResponse(query, response, options = {}) {
        if (options.replaceIndex != null) {
            query.responses[options.replaceIndex] = response;
        } else {
            query.responses = (query.responses || []).concat([response]);
        }

        query.lastResponse = response;

        if (options.extraUpdates) {
            Object.assign(query, options.extraUpdates);
        }

        this.updateCounts();
        return response;
    }

    /**
     * Update a response
     */
    async updateResponse(queryId, responseId, updates) {
        return this._performResponseOperation(queryId, (query) => {
            const responseIndex = query.responses.findIndex(r => r.id === responseId);
            if (responseIndex === -1) {
                throw new Error(`Response ${responseId} not found`);
            }
            const response = query.responses[responseIndex];

            updates.attachments = this.formatAttachmentResponse(updates.attachments);
            const updatedResponse = Object.assign({}, response, updates);

            this._saveResponse(query, updatedResponse, {
                replaceIndex: responseIndex
            });

            // Update DOM 

            const editorEl = updates.domEl ? updates.domEl : query.editorEl;
            if (editorEl) {
                const oldEl = $(editorEl).find(`[data-name="response"][data-time="${response.timestamp}"]`);
                if (oldEl.length) {
                    const newEl = this.createResponseEl(updatedResponse);
                    oldEl.replaceWith(newEl);
                }
            }

            this._syncCollatorCollationStatus(query, updatedResponse.content, editorEl);

            this.emit("response-updated", {
                query
            });
            // return updatedResponse;
            return {
                success: true,
                query: updatedResponse
            };
        });
    }

    /**
     * Add a response to a query
     */
    async addResponse(queryId, responseData) {
        return this._performResponseOperation(queryId, (query) => {
            const isComment = query && (
                query.status === "comment" ||
                /^C/i.test(query.label || "")
            );
            const response = this.buildResponse({
                content: responseData.content,
                attachments: responseData.attachments || [],
                sameUserRole: true,
            }, null, query);

            const extraUpdates = {};
            if (responseData.closeQuery && !isComment) {
                extraUpdates.status = "closed";
            }
            if (this._state.isCollator) {
                extraUpdates.collationStatus = this._deriveCollatorCollationStatus(responseData.content);
            }

            this._saveResponse(query, response, {
                extraUpdates
            });

            const responseEl = this.createResponseEl(response);

            const nodeEl = responseData.domEl ? responseData.domEl : query.editorEl;

            $(nodeEl).append(responseEl);

            if (extraUpdates.status === "closed" && !isComment) $(nodeEl).attr("data-status", "closed");

            if (extraUpdates.collationStatus) {
                this._syncCollatorCollationStatus(query, responseData.content, nodeEl);
            }


            this.emit("response-added", {
                query
            });
            return {
                success: true,
                query: response
            };
        });
    }

    /**
     * Delete a response from a query
     */
    async deleteResponse(queryId, responseId) {
        return this._performResponseOperation(queryId, (query) => {
            let responseIndex = -1;
            if (query.responses && Array.isArray(query.responses)) {
                responseIndex = query.responses.findIndex(r => r.id === responseId);
            }

            if (responseIndex === -1) {
                throw new Error(`Response ${responseId} not found`);
            }

            const deletedResponse = query.responses[responseIndex];
            query.responses.splice(responseIndex, 1);

            // Update lastResponse from active responses only.
            const getLastActiveResponseFn =
                typeof this.getLastActiveResponse === "function" ?
                this.getLastActiveResponse :
                null;
            if (getLastActiveResponseFn) {
                query.lastResponse = getLastActiveResponseFn(query);
            } else if (Array.isArray(query.responses) && query.responses.length > 0) {
                query.lastResponse = query.responses[query.responses.length - 1];
            } else {
                query.lastResponse = null;
            }

            // Reopen query if no active responses remain.
            if (query.status === "closed" && !query.lastResponse) {
                query.status = "open";
                query.collationStatus = "pending";
            }

            // Remove DOM element using data-time and index
            if (query.editorEl) {
                const $el = $(query.editorEl);

                const $responseEl = $el.find(`[data-time="${deletedResponse.timestamp}"]`);
                if ($responseEl.length) $responseEl.remove();

                if ((query.status === "open") || (/^AQ/i.test(query.label) || $el.find('[data-name="response"],[data-name="Response"]').length === 0)) {
                    $el.attr("data-status", "open").removeAttr("data-collation-status");
                }

                $el.attr("data-collation-status", "pending");
            }

            this.updateCounts();
            this.emit("response-deleted", {
                query
            });

            // Refresh panel if available, preserving the active All/Open filter

            if (this.panelModule) {
                const renderType = query.status == "comment" ? "comment" : "query";
                const updatedExistingRow = typeof this.panelModule.updateItemFilterStatus === "function" ?
                    this.panelModule.updateItemFilterStatus(query.id, renderType) :
                    false;
                if (updatedExistingRow && typeof this.panelModule.scheduleRenderItemPreserveFilter === "function") {
                    this.panelModule.scheduleRenderItemPreserveFilter(query.id, renderType);
                } else if (typeof this.panelModule.renderItemPreserveFilter === "function") {
                    this.panelModule.renderItemPreserveFilter(query.id, renderType);
                } else if (typeof this.panelModule.renderItem === "function") {
                    this.panelModule.renderItem(query.id, renderType);
                }
            }
            return deletedResponse;
        });
    }


    /**
     * Create response element for DOM
     */
    createResponseEl(response) {
        const baseAttrs = this._buildElementAttributes(response);

        const orderedAttrs = {
            ...baseAttrs,
            "data-name": "response",
            "data-reply": "s",
            "data-track-code": "query-02",
            html: "&#x00A0;"
        };

        // Remove if exists from base
        delete orderedAttrs["data-user-comment-box"];

        // Add data-user-comment-box as LAST attribute
        orderedAttrs["data-user-comment-box"] = baseAttrs["data-user-comment-box"];

        return $("<span>", orderedAttrs);
    }

    /**
     * Get attribute value from element
     */
    getAttr(element, attribute, defaultValue) {
        return element && element.getAttribute(attribute) || defaultValue;
    }

    /**
     * Load queries from DOM
     */
    async loadQueriesFromDOM() {
        const {
            selectors
        } = this.config;

        this.normalizeTrackCodesOnDOM();

        const queryNodes = this.editorDocBody.querySelectorAll(selectors.OVER_ALL_AQ_CMD);

        const uniqueQueryNodes = this._dedupeQueryNodesByLabelAndContent(Array.from(queryNodes));

        const allItems = this._parseQueryNodes(uniqueQueryNodes);

        clearTimeout(this._countsTimer);
        this._countsTimer = setTimeout(() => this.updateCounts(), 1500);

        this.emit("query-loaded", {
            queries: allItems
        });
        return allItems;
    }

    _parseQueryNodes(nodes = []) {
        if (!Array.isArray(nodes) || nodes.length === 0) {
            return [];
        }

        const parsed = [];
        for (let i = 0; i < nodes.length; i++) {
            const item = this._parseQueryNode(nodes[i]);
            if (item) parsed.push(item);
        }

        return parsed;
    }

    /**
     * Ensure ckcommentsfull nodes use canonical data-track-code.
     * Always migrates buggy bare trackcode/trackCode → data-track-code.
     * On Track View only (IS_TRACK_VIEW), also infers and stamps codes for
     * legacy markers with no track-code attrs (Show Tracking). On the editor
     * page, unmarked legacy nodes are left alone (IsComment/IsNewQuery path).
     */
    normalizeTrackCodesOnDOM() {
        try {
            if (!this.editorDocBody || typeof this.editorDocBody.querySelectorAll !== "function") {
                return;
            }

            const selector = (this.config && this.config.selectors && this.config.selectors.OVER_ALL_AQ_CMD) || '[data-class="ckcommentsfull"]';
            const nodes = this.editorDocBody.querySelectorAll(selector);

            for (let i = 0; i < nodes.length; i++) {
                this._normalizeTrackCodeOnNode(nodes[i]);
            }
        } catch (err) {
            console.warn("normalizeTrackCodesOnDOM failed:", err && err.message);
            if (typeof ErrorLogTrace === "function") {
                ErrorLogTrace("normalizeTrackCodesOnDOM", err && err.message);
            }
        }
    }

    /**
     * Normalize one node's track-code attributes.
     * Bare attr migration: always. Inference: IS_TRACK_VIEW only.
     * Stamp only the ckcommentsfull node — never mirror onto insert/del wrappers
     * (wrapper stamps cause empty Show Tracking qry rows; child is skipped).
     */
    _normalizeTrackCodeOnNode(node) {
        if (!node || !node.getAttribute) return;

        const wrapper = node.closest ? (node.closest("insert, del") || null) : null;
        let code = node.getAttribute("data-track-code");

        if (!code) {
            const bareOnNode = this._getBareTrackCode(node);
            const bareOnWrapper = wrapper ? this._getBareTrackCode(wrapper) : null;
            // Infer missing codes only on Track View — never invent on editor open/save
            code = bareOnNode || bareOnWrapper || (IS_TRACK_VIEW ? this._inferTrackCodeFromNode(node) : null);
        }

        if (!code) return;

        this._stampTrackCode(node, code);

        this._clearBareTrackCode(node);
        if (wrapper) {
            // Cleanup bare attrs on wrapper only — do not stamp data-track-code there
            this._clearBareTrackCode(wrapper);
            // Remove previously mirrored canonical code from insert/del (legacy Track View stamps)
            if (wrapper.getAttribute("data-track-code")) {
                wrapper.removeAttribute("data-track-code");
            }
        }
    }

    _getBareTrackCode(el) {
        if (!el || !el.getAttribute) return null;
        // Prefer canonical attr if present on wrapper; else bare buggy spellings
        return el.getAttribute("data-track-code") ||
            el.getAttribute("trackcode") ||
            el.getAttribute("trackCode") ||
            null;
    }

    _clearBareTrackCode(el) {
        if (!el || !el.removeAttribute) return;
        el.removeAttribute("trackcode");
        el.removeAttribute("trackCode");
    }

    _stampTrackCode(el, code) {
        if (!el || !code || !el.setAttribute) return;
        if (el.getAttribute("data-track-code") !== code) {
            el.setAttribute("data-track-code", code);
        }
        // Stamp panel unique id once when track-code is written (never rewrite).
        if (!el.getAttribute("data-sr-panel-unique-id")) {
            const uid = 'srp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
            el.setAttribute("data-sr-panel-unique-id", uid);
        }
    }

    /**
     * Infer data-track-code for legacy nodes with no track-code attributes.
     * Called only from _normalizeTrackCodeOnNode when IS_TRACK_VIEW is true.
     * Prefer *-01 (new) when update vs new is ambiguous.
     */
    _inferTrackCodeFromNode(node) {

        if (!node) return null;

        const status = (node.getAttribute("data-status") || "").toLowerCase();
        const label = node.getAttribute("data-label") || "";
        const isDeleted = node.getAttribute("data-deleted") === "true" ||
            !!(node.querySelector && node.querySelector("[data-deleted='true']"));
        const isAnnotate = !!(node.querySelector && node.querySelector("[data-annotate]"));
        const isComment = status === "comment" || /^C/i.test(label);
        const responseCount = node.querySelectorAll ?
            node.querySelectorAll('[data-name="response"],[data-name="Response"]').length : 0;

        if (isAnnotate) {
            if (isDeleted) return "annotate-03";
            const annotateNew = node.querySelector('[data-annotate][data-comment="new"],[data-annotate][data-query="new"]');
            return annotateNew ? "annotate-01" : "annotate-02";
        }

        if (isComment) {
            if (isDeleted) return "comment-03";
            const commentFlag = (node.getAttribute("data-comment") || "").toLowerCase();
            const firstChild = node.querySelector('[data-name="comment"],[data-name="Comment"]');
            const childFlag = firstChild ?
                (firstChild.getAttribute("data-comment") || "").toLowerCase() : "";
            // Explicit non-new markers → updated; otherwise treat as new
            if ((commentFlag && commentFlag !== "new") || (childFlag && childFlag !== "new")) {
                return "comment-02";
            }
            return "comment-01";
        }

        // Query (open / closed / query)
        if (isDeleted) return "query-04";
        if (responseCount > 0) return "query-02";
        const queryFlag = (node.getAttribute("data-query") || "").toLowerCase();
        if (queryFlag && queryFlag !== "new") return "query-03";
        return "query-01";
    }

    _dedupeQueryNodesByLabelAndContent(nodes = []) {
        if (!Array.isArray(nodes) || nodes.length <= 1) return nodes || [];

        const grouped = new Map();

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!node) continue;

            const signature = this._buildDomNodeLooseSignature(node);
            const key = signature || (node.getAttribute && node.getAttribute("id")) || `idx_${i}`;

            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(node);
        }

        const selected = [];
        grouped.forEach((bucket) => {
            if (!Array.isArray(bucket) || bucket.length === 0) return;
            if (bucket.length === 1) {
                selected.push(bucket[0]);
                return;
            }

            const winner = this._selectBestDomQueryNode(bucket);
            if (winner) selected.push(winner);
        });

        return selected;
    }

    _buildDomNodeLooseSignature(node) {
        if (!node) return "";

        const label = this._normalizeSignatureValue(node.getAttribute && node.getAttribute("data-label"));
        const aqNode = node.querySelector('[data-role="Query to Author"],[data-name="comment"],[data-name="AQ"]');
        const content = this._normalizeSignatureValue(aqNode && aqNode.getAttribute && aqNode.getAttribute("data-user-comment-box"));

        return [label, content].join("||");
    }

    _selectBestDomQueryNode(nodes) {
        if (!Array.isArray(nodes) || nodes.length === 0) return null;

        let bestNode = nodes[0];
        let bestScore = -1;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!node) continue;

            const id = (node.getAttribute && node.getAttribute("id") || "").trim();
            const responseCount = node.querySelectorAll('[data-name="Response"],[data-name="response"]').length;
            const status = ((node.getAttribute && node.getAttribute("data-status")) || "").toLowerCase();

            let score = 0;
            if (id) score += 140;
            if (responseCount > 0) score += 180;
            if (status === "closed") score += 20;

            if (score > bestScore) {
                bestScore = score;
                bestNode = node;
            }
        }

        return bestNode;
    }

    _extractAndMoveChanges(node) {
        const extracted = [];
        const allChanges = node.querySelectorAll("insert, del");

        allChanges.forEach((el, idx) => {
            extracted.push({
                index: idx,
                element: el.cloneNode(true),
                type: el.tagName.toLowerCase()
            });
            el.remove();
        });
        extracted.sort((a, b) => a.index - b.index);
        extracted.forEach(item => {
            node.parentNode.insertBefore(item.element, node);
        });
        return extracted;
    }
    /**
     * Parse a query node from DOM
     */
    _parseQueryNode(node) {
        try {
            if (!node) return null;
            this._normalizeTrackCodeOnNode(node);

            // Normalize status + attributes
            $(node).attr("data-status", function(i, val) {
                if (!val) return val;
                const lower = val.toLowerCase();
                const cmd = "comment";
                var newStatus = lower === "note" ? cmd : lower;
                const isQueryStatus = lower == "query" ? true : false;

                // ✅ Count both uppercase and lowercase 'Response' nodes
                const responseCount = $(this).find('[data-name="Response"],[data-name="response"]').length;

                // ✅ If not a comment and multiple responses exist → mark as closed
                if (newStatus !== cmd) {
                    if (responseCount > 0) newStatus = "closed";
                    else if (responseCount == 0 && isQueryStatus) newStatus = "open";
                }

                // ✅ Use `this` instead of outer `node` for correct scoping
                if (newStatus === cmd || lower === cmd) {
                    const $firstChild = $(this).children('[data-name]').first();
                    if ($firstChild.length) {
                        $firstChild.attr("data-name", cmd);
                    }
                }

                // ? your newly added condition
                const label = this.getAttribute('data-label');
                if (/^C/i.test(label) && lower != cmd) {
                    newStatus = cmd;
                }

                return newStatus;
            });

            $(node).find('[data-name="Response"]').attr("data-name", (i, val) => (val ? val.toLowerCase() : val));
            $(node).contents().filter(function() {
                /*  
                
                🔥 REMOVE EMPTY TEXT NODES INSIDE node
                
                */

                return this.nodeType === 3 && !this.nodeValue.trim();
            }).remove();
            this._extractAndMoveChanges(node);

            const queryData = {
                id: this.getAttr(node, "id", this.generateQueryId()),
                label: this.getAttr(node, "data-label"),
                status: this.getAttr(node, "data-status"),
                timestamp: this.getAttr(node, "data-time") || this.getAttr(node, "data-timec"),
                collationStatus: this.getAttr(node, "data-collation-status"),
                editorEl: node,
                deleted: this.getAttr(node, "data-deleted", "false"),
                deletedBy: this.getAttr(node, "data-deleted-by", ""),
                deletedRole: this.getAttr(node, "data-deleted-role", ""),
                deletedAt: this.getAttr(node, "data-deleted-time", Date.now())
            };

            if (/^C/i.test(queryData.label)) {
                queryData.status = "comment";
            }


            // ? highlight references
            queryData.highSpan = this.editorDocBody.querySelectorAll(`[data-hid="${queryData.id}"]`) || [];

            // ? Main content
            const queryElement = node.querySelector('[data-role="Query to Author"],[data-name="comment"]');
            if (queryElement) {
                queryData.content = this.getAttr(queryElement, "data-user-comment-box", "");
                this._enrichResponseFromElement(queryData, queryElement);
            }


            // ? Responses
            const responseNodes = node.querySelectorAll('[data-name="response"]');
            queryData.responses = Array.from(responseNodes).map(respNode =>
                this.buildResponse({
                    content: this.getAttr(respNode, "data-user-comment-box", "")
                }, respNode)
            );

            queryData.lastResponse = queryData.responses.at(-1) || null;


            // single consistent place to finalize
            const query = this._normalizeQueryData(queryData);
            const isComment = query.status === "comment";

            const isCollator = this._state && this._state.isCollator;
            if (!isCollator) $(node).removeAttr("data-collation-status");
            else if (isCollator && queryData.lastResponse) {
                var collationStatus = this._deriveCollatorCollationStatus(queryData.lastResponse.content);
                $(node).attr("data-collation-status", collationStatus);
                query.collationStatus = collationStatus;
            }


            this._state[isComment ? "comments" : "queries"].set(query.id, query);

            // Event binding
            // $(node).off("click.evtFromEditor").on("click.evtFromEditor", e => this.evtFromEditor(e, query));
            const editable = this.editor.document.getBody().$;

            $(editable)
                .off("click.evtFromEditor", '[data-class="ckcommentsfull"]')
                .on("click.evtFromEditor", '[data-class="ckcommentsfull"]', e => {
                    e.preventDefault();
                    e.stopPropagation();

                    const targetEl = e.currentTarget || e.target;
                    const queryId = targetEl.getAttribute("id") || targetEl.dataset.id;

                    if (!queryId) return;

                    // Always fetch fresh query data to avoid stale reference
                    const queryData = this.getQuery(queryId);
                    if (!queryData) return;

                    this.evtFromEditor(e, queryData);
                });

            return query;
        } catch (error) {
            console.error("Error parsing query node:", error, node);
            return null;
        }
    }


    sortItems(items, type, isComment) {
        const parent = this;
        const sortConfig = parent.config && parent.config.sorting && parent.config.sorting[type];
        const IsCollator = this._state.isCollator;
        const collabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);

        // Convert to array if Map
        let itemsArray = Array.isArray(items) ? [...items] : Array.from(items.values());

        // Step 0: Filter deleted items based on role
        if (!IsCollator) {
            itemsArray = itemsArray.filter(it => !(it && it.deleted === "true"));
        }

        // Step 1: Apply Sorting (default = by label)
        if (sortConfig && sortConfig.sortByLocation) {
            // Future: location-based sorting
        } else {
            itemsArray.sort(function(a, b) {
                var labelA = a.label ? a.label : "";
                var labelB = b.label ? b.label : "";

                var numA = parseInt(labelA.replace(/\D/g, ""), 10) || 0;
                var numB = parseInt(labelB.replace(/\D/g, ""), 10) || 0;

                if (numA < numB) return -1;
                if (numA > numB) return 1;
                return 0;
            });
        }


        // Step 2: Check duplicates and re-sort by timestamp if found
        if (isComment) {
            const seen = new Set();
            let hasDuplicates = false;

            for (const it of itemsArray) {
                if (seen.has(it.label)) {
                    hasDuplicates = true;
                    break;
                }
                seen.add(it.label);
            }


            // if duplicates exist → sort by timestamp ascending
            if (hasDuplicates && collabEnabled) {
                itemsArray.sort((a, b) => {
                    const tA = parseInt(a.timestamp, 10) || 0;
                    const tB = parseInt(b.timestamp, 10) || 0;
                    return tA - tB;
                });
            } else {
                return itemsArray;
            }

            // Step 3: Re-label sequentially
            const prefix = "C";
            for (let i = 0; i < itemsArray.length; i++) {
                const item = itemsArray[i];
                const newLabel = prefix + (i + 1);

                item.label = newLabel;
                if (item.editorEl && item.editorEl.setAttribute) {
                    item.editorEl.setAttribute("data-label", newLabel);
                }
            }

            //  Step 4: Update Internal State Map
            let mapRef = null;
            if (isComment && parent._state && parent._state.comments) {
                mapRef = parent._state.comments;
            } else if (!isComment && parent._state && parent._state.queries) {
                mapRef = parent._state.queries;
            }

            if (mapRef) {
                mapRef.clear();
                for (let j = 0; j < itemsArray.length; j++) {
                    const obj = itemsArray[j];
                    mapRef.set(obj.id, obj);
                }
            }
        }

        return itemsArray;
    }


    updateState(type) {
        const isComment = type === "comment";
        const stateMap = this._state[isComment ? "comments" : "queries"];

        // Convert Map → Array for sorting
        const items = Array.from(stateMap.values());

        // Apply sort and relabel logic (render is called inside if changes detected)
        // const sorted = this.relabelItems(items, isComment);

        // Rebuild the map to preserve new order and updated labels
        stateMap.clear();
        for (const item of sorted) {
            stateMap.set(item.id, item);
        }
    }

    relabelItems(items, isComment, force = false) {
        const self = this;
        const itemsArray = Array.isArray(items) ? [...items] : Array.from(items.values());
        let hasChanges = false;

        if (isComment || force) {
            const prefix = isComment ? "C" : "AQ";

            for (let i = 0; i < itemsArray.length; i++) {
                const item = itemsArray[i];
                const newLabel = prefix + (i + 1);

                // Only update if label has changed
                if (item.label !== newLabel) {
                    item.label = newLabel;
                    hasChanges = true;

                    // Update DOM attribute only if it exists and has changed
                    if (item.editorEl && item.editorEl.setAttribute) {
                        const currentLabel = item.editorEl.getAttribute("data-label");
                        if (currentLabel !== newLabel) {
                            item.editorEl.setAttribute("data-label", newLabel);
                        }
                    }
                }
            }

            // Rebuild state map
            const mapRef = isComment ? self._state.comments : self._state.queries;
            mapRef.clear();
            for (const item of itemsArray) {
                mapRef.set(item.id, item);
            }

            // Call render only if changes were detected
            if (hasChanges && typeof self.panelModule.render === 'function') {
                self.panelModule.render(true);
            }
        }

        return itemsArray;
    }



    relabelAll(type) {
        const isComment = type === "comment";
        const stateMap = this._state[isComment ? "comments" : "queries"];
        const items = Array.from(stateMap.values());

        const prefix = isComment ? "C" : "AQ";
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const newLabel = prefix + (i + 1);
            item.label = newLabel;

            if (item.editorEl) {
                item.editorEl.setAttribute("data-label", newLabel);
            }
        }
    }


    evtFromEditor(e, queryData) {
        // if (queryData.status == "comment" && (queryData.lastResponse.sameUserRole || queryData.sameUserRole)) {}
        if (e.target.id != queryData.id) {
            queryData = this.getQuery(e.target.id);
        }
        // this.setCursorOnEditor(queryData, true);
        let dialog = this.dialogModule;
        if (!dialog || typeof dialog.open !== "function") {
            const candidate = window.queryDialog;
            if (candidate && typeof candidate.open === "function") {
                dialog = candidate;
                this.dialogModule = dialog;
            }
        }
        if (dialog && typeof dialog.open === "function") {
            const openOpts = (typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW) ? {
                readonly: true
            } : {};
            dialog.open(queryData.id, queryData.status, openOpts);
        }

    }

    _resolveAttachmentStoreId(container) {
        if (!container) {
            return (this.attachmentModule && this.attachmentModule.currentStoreId) || this.currentStoreId;
        }

        var $container = $(container);
        return $container.attr("data-store-id") ||
            $container.find(".file-input[data-store-id]").attr("data-store-id") ||
            $container.find("[data-store-id]").first().attr("data-store-id") ||
            $container.closest("[data-store-id]").attr("data-store-id") ||
            (this.attachmentModule && this.attachmentModule.currentStoreId) ||
            this.currentStoreId;
    }

    _getSubmitAttachmentSummary(storeId, module) {
        var attachmentModule = (module && module.attachmentModule) || this.attachmentModule;
        if (!attachmentModule || typeof attachmentModule.getAttachments !== "function") {
            return {
                count: 0,
                attachments: []
            };
        }

        var attachmentState = attachmentModule.getAttachments(storeId) || {};
        var existing = Array.isArray(attachmentState.existing) ? attachmentState.existing.slice() : [];
        var pending = Array.isArray(attachmentState.pending) ? attachmentState.pending : [];
        var deleted = Array.isArray(attachmentState.deleted) ? attachmentState.deleted : [];
        var deletedAll = !!attachmentState.deletedAll;

        if (deletedAll) {
            existing = [];
        } else if (deleted.length > 0) {
            var deletedSet = new Set(deleted.map(function(item) {
                return item && item.file_sn ? item.file_sn : item;
            }).filter(Boolean));
            existing = existing.filter(function(item) {
                return !(item && deletedSet.has(item.file_sn));
            });
        }

        return {
            count: existing.length + pending.length,
            attachments: existing.concat(pending)
        };
    }

    validateSubmitOptions(container, queryId, options = {}, module) {
        if (!options || Object.keys(options).length === 0) return {
            valid: true
        };

        var contentInfo = this.getCurrentFormContent(container, queryId);
        var storeId = contentInfo.storeId || this._resolveAttachmentStoreId(container);
        var attachmentSummary = this._getSubmitAttachmentSummary(storeId, module);
        var textLength = contentInfo.textLength || 0;

        if (options.hasValidation) {
            if (options.isInputContentRequired && textLength === 0) {
                // TOASTER_ALERT('cmd_required_content', {type: 'warning',MIN_CONTENT_LENGTH: this.config && this.config.contentRules ? this.config.contentRules.MIN_CONTENT_LENGTH : 1});
                return {
                    valid: false,
                    reason: 'content_required',
                    alert_key: 'cmd_required_content',
                    alert_params: {
                        type: 'warning',
                        MIN_CONTENT_LENGTH: this.config && this.config.contentRules ? this.config.contentRules.MIN_CONTENT_LENGTH : 1
                    }
                };
            }

            if (options.hasContentLimit && textLength > 0) {
                var rulesValid = !this.config || !this.config.contentRules || this.validateContentLength(contentInfo.htmlData || "", this.config.contentRules);
                if (!rulesValid) return {
                    valid: false,
                    reason: 'content_limit_exceeded',
                    alert_key: 'cmd_content_limit_exceeded',
                    alert_params: {
                        type: 'warning'
                    }
                };
            }

            if (options.isAttachmentRequired && attachmentSummary.count === 0) {
                // TOASTER_ALERT('cmd_required_attachment', { type: 'warning' });
                return {
                    valid: false,
                    reason: 'attachment_required',
                    alert_key: 'cmd_required_attachment',
                    alert_params: {
                        type: 'warning'
                    }
                };
            }

            if (options.hasAllowedMultipleAttach === false && attachmentSummary.count > 1) {
                // TOASTER_ALERT('cmd_single_attachment_only', { type: 'warning' });
                return {
                    valid: false,
                    reason: 'single_attachment_only',
                    alert_key: 'cmd_single_attachment_only',
                    alert_params: {
                        type: 'warning'
                    }
                };
            }
        }
        return {
            valid: true
        };
    }

    getCurrentFormContent(container, queryId, options) {
        options = options || {};

        var textarea = container.querySelector('.reply-textarea,.dialog-reply-input');
        var fileInput = container.querySelector('.file-input') ||
            (container.parentElement && container.parentElement.querySelector('.file-input'));
        var queryOrComment = queryId ? this.getQuery(queryId) : {};

        // 🔹 If fileInput is missing, return default state
        if (!fileInput) {
            return {
                hasContent: false,
                unchanged: true,
                canClose: true,
                canSave: false
            };
        }
        // Handle reset if requested
        if (options.reset) {
            if (fileInput) fileInput.value = '';
            if (textarea) {
                textarea.innerHTML = '';
                textarea.focus();
            }
            var resetStoreId = this._resolveAttachmentStoreId(container);
            this.attachmentModule.clearStore(resetStoreId, false);
            return;
        }

        // Normalize the textarea
        commonMethods.normalizeHTML(textarea);

        var isSameUserRole = false;
        var lastContent = "";
        var lastId;

        // Determine if editing same user's content
        if (queryOrComment && queryOrComment.lastResponse && queryOrComment.lastResponse.id) {
            isSameUserRole = queryOrComment.lastResponse.sameUserRole || false;
            lastContent = (queryOrComment.lastResponse.content || "").trim();
            lastId = queryOrComment.lastResponse.id;
        } else if (queryOrComment.sameUserRole === true && queryOrComment.responses.length == 0) {
            isSameUserRole = queryOrComment.sameUserRole;
            lastContent = (queryOrComment.content || "").trim();
            lastId = queryOrComment.id;
        }

        var text = (textarea && textarea.innerText.trim()) || "";
        var html = (textarea && textarea.innerHTML) || "";

        // If it's visually empty (<br>, &nbsp;, <p><br></p>), return ""
        var cleanHTML = html.replace(/<br\s*\/?>/gi, "")
            .replace(/<p><\/p>/gi, "")
            .replace(/<p><br\s*\/?><\/p>/gi, "")
            .replace(/&nbsp;/gi, "")
            .trim();
        var filterContent = cleanHTML == "" ? cleanHTML : PasteFilter.fire(cleanHTML, {
            event_from: 'shortcut',
            record: false,
            e: {
                name: "check"
            }
        });

        var finalHTML = filterContent === "" ? "" : html;
        var hasFileContent = fileInput && fileInput.files && fileInput.files.length > 0;

        // Check attachment changes
        var storeId = this._resolveAttachmentStoreId(container);
        var hasPendingAttachments = false;
        if (this.attachmentModule && typeof this.attachmentModule.hasPendingChanges === 'function') {
            hasPendingAttachments = this.attachmentModule.hasPendingChanges(storeId) || false;
        }

        var result = {
            hasContent: text.length > 0 || hasFileContent || hasPendingAttachments,
            htmlData: finalHTML,
            textData: text,
            htmlLength: finalHTML.length,
            textLength: text.length,
            query: queryOrComment,
            storeId: storeId,
            unchanged: false,
            hasPendingAttachments: hasPendingAttachments,
            canClose: false,
            canSave: false
        };

        // Determine canClose and canSave based on editing context
        if (isSameUserRole) {
            // Editing same user's content
            var contentUnchanged = html === lastContent;
            var noChanges = contentUnchanged && !hasPendingAttachments;

            if (noChanges) {
                // No changes at all
                result.unchanged = true;
                result.canClose = true;
                result.canSave = true;
            } else {
                // Has changes (content OR attachments)
                result.unchanged = false;
                result.canClose = false;
                result.canSave = true;
            }
        } else {
            // New reply/comment (not editing)
            var hasAnyContent = result.textLength > 0 || hasPendingAttachments;

            if (hasAnyContent) {
                // Has content or attachments - user was editing
                result.unchanged = false;
                result.canClose = false;
                result.canSave = true;
            } else {
                // Empty form - safe to close
                result.unchanged = true;
                result.canClose = true;
                result.canSave = false;
            }
        }

        return result;
    }


    /** 
     * Set cursor on editor for a specific query
     */
    setCursorOnEditor(queryId, updateOnly = false) {
        var query = this.getQuery(queryId);

        if (!query || !query.editorEl) return;

        var currentEl;

        try {
            // CKEditor returns a CKEDITOR.dom.element, convert to native node
            var ckEl = this.editor && this.editor.document ? this.editor.document.getById(query.id) : null;
            if (!ckEl) return;
            currentEl = ckEl.$;

            // If the stored editor element reference differs, trigger panel re-render
            if (query.editorEl !== currentEl) {
                query.editorEl = currentEl;
                if (updateOnly) return;
                // this.panelModule.render(true);
            }

            // Scroll element into view (smoothly if supported)
            if (currentEl && typeof currentEl.scrollIntoView === "function") {
                currentEl.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            } else if (currentEl) {
                currentEl.scrollIntoView(true);
            }

            // Optional: track scroll position or log navigation
            const navTarget = currentEl && typeof currentEl.closest === "function" ? currentEl.closest("div[id]") : null;
            if (typeof postNavigation === "function") {
                postNavigation(navTarget, "editor");
            }
        } catch (e) {
            console.warn("setCursorOnEditor: scroll failed", e);
            if (currentEl) {
                try {
                    if (typeof currentEl.scrollIntoView === "function") {
                        currentEl.scrollIntoView(true);
                    }
                } catch (ex) {
                    // Ignore very old browsers
                }
            }
        }



        try {
            // Handle paraLock logic (if defined globally)
            if (currentEl && window.paraLock && window.paraLock._isEnabled) {
                var isLocked = window.paraLock._isElementLocked(currentEl, {
                    check_closest: true
                });

                if (!isLocked) {
                    // Set cursor position - for now set to begin
                    if (typeof GlobalEditor.focus === "function") {
                        // ensure editor is focused before range selection
                        // GlobalEditor.focus();
                    }

                    var range = GlobalEditor.createRange();
                    range.setStartAt(new CKEDITOR.dom.element(currentEl), CKEDITOR.POSITION_BEFORE_START);
                    GlobalEditor.getSelection().selectRanges([range]);
                    return true;
                } else {
                    if (typeof window.paraLock.forceAlert === "function") {
                        window.paraLock.forceAlert();
                    }
                    return false;
                }
            }
            return true;
        } catch (err) {
            console.warn("setCursorOnEditor: range selection failed", err);
            return true;
        }
    }



    /**
     * Panel All/Open filter status for a query or comment.
     * Non-Collator: raw item.status.
     * Collator: closed after any decision (approved or lastResponse.sameUserRole);
     * otherwise open (needs attention). Deleted stays deleted.
     * @param {object} item
     * @returns {string}
     */
    resolvePanelFilterStatus(item) {
        if (!item) return "";
        if (item.deleted === "true" || item.deletedBy) {
            return "deleted";
        }

        const raw = String(item.status || "").toLowerCase();
        if (!this._state || !this._state.isCollator) {
            return raw;
        }

        const isComment = raw === "comment" || /^C/i.test(item.label || "");
        if (isComment) {
            const role = String(item.role || "").toLowerCase();
            const coName = (typeof ROLE_IDS !== "undefined" && ROLE_IDS[ROLE_IDS.CO] && ROLE_IDS[ROLE_IDS.CO].name) ?
                String(ROLE_IDS[ROLE_IDS.CO].name).toLowerCase() : "collator";
            if (role === coName || /^co-?/.test(role) || role.indexOf("collator") !== -1) {
                return "closed";
            }
            if (item.sameUserRole && (!item.responses || item.responses.length === 0)) {
                return "closed";
            }
        }

        const lastActiveResponse = typeof this.getLastActiveResponse === "function" ?
            this.getLastActiveResponse(item) :
            item.lastResponse;

        const hasActiveCollatorResponse = !!(lastActiveResponse && lastActiveResponse.sameUserRole);

        const fromDom = item.editorEl && typeof item.editorEl.getAttribute === "function" ?
            item.editorEl.getAttribute("data-collation-status") : null;
        if (hasActiveCollatorResponse && fromDom != null && /^approved$/i.test(String(fromDom).trim())) {
            return "closed";
        }

        const collation = String(item.collationStatus || item["data-collation-status"] || "").toLowerCase();
        if (hasActiveCollatorResponse && (/^(approved|verified|resolved)$/i.test(collation) || /\b(approved|verified|resolved)\b/i.test(collation))) {
            return "closed";
        }

        // Any active collator reply (Resolved / Pending / TS Notes) leaves Open.
        if (hasActiveCollatorResponse) {
            return "closed";
        }

        return "open";
    }

    /**
     * Update query counts
     */
    updateCounts() {
        const queries = Array.from(this._state.queries.values());
        const comments = Array.from(this._state.comments.values());
        const resolveStatus = (q) => this.resolvePanelFilterStatus(q);

        this._state.counts = {
            total: this._state.queries.size,

            open: queries.filter(q => {
                // exclude deleted
                if (q.deleted === "true") return false;
                return resolveStatus(q) === "open";
            }).length,

            closed: queries.filter(q => {
                // exclude deleted
                if (q.deleted === "true") return false;
                return resolveStatus(q) === "closed";
            }).length,

            // exclude deleted comments
            comments: comments.filter(c => c.deleted !== "true").length,

            commentsOpen: comments.filter(c => {
                if (c.deleted === "true" || c.deletedBy) return false;
                return resolveStatus(c) === "open";
            }).length
        };

        this.emit("counts-updated", this._state.counts);
    }

    generateQueryId() {
        return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique response ID
     */
    generateResponseId() {
        return `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Emit event
     */
    emit(eventName, detail) {
        this.events.dispatchEvent(new CustomEvent(eventName, {
            detail
        }));
    }

    /**
     * Handle errors
     */
    handleError(context, error) {
        console.error(`QueryModule Error [${context}]:`, error);

        if (typeof ErrorLogTrace === 'function') {
            ErrorLogTrace(`QueryModule_${context}`, error.message);
        }
    }

    /**
     * Get a specific query
     */
    getQuery(queryId, process = "query") {
        if (!queryId) return null;
        var finalId = queryId;
        if (typeof queryId != "string" && queryId.id) {
            finalId = queryId.id
        }
        var queryOrComment =
            (this._state.queries && this._state.queries.get(finalId)) ||
            (this._state.comments && this._state.comments.get(finalId));

        if (!this.editor || !this.editor.document) this.waitForEditor();

        if (queryOrComment && queryOrComment.id) {
            var ckEl = this.editor.document.getById(queryOrComment.id);
            if (ckEl) {
                queryOrComment.editorEl = ckEl.$;
            } else {}
        }

        return queryOrComment;
    }

    /**
     * Get all queries
     */
    getAllQueries() {
        return Array.from(this._state.queries.values());
    }

    _collectDomIdSet(selector) {
        if (!this.editor || !this.editor.document || !this.editor.document.$) {
            return null;
        }

        const root = this.editor.document.$;
        const domNodes = Array.from(root.querySelectorAll(selector));
        const domIdSet = new Set();

        for (let i = 0; i < domNodes.length; i++) {
            const id = domNodes[i] && domNodes[i].getAttribute && domNodes[i].getAttribute("id");
            if (id) domIdSet.add(id);
        }

        return domIdSet;
    }

    _sanitizeStateMap(sourceMap, options = {}) {
        const settings = Object.assign({
            prune: true,
            dedupe: true,
            domIdSet: null,
            removeOnlyGeneratedIds: true,
            generatedIdPattern: /^query_/i,
            canonicalIdPattern: /^full_/i
        }, options || {});

        if (!sourceMap || typeof sourceMap.entries !== "function") {
            return {
                removedMissing: 0,
                removedDuplicates: 0,
                totalRemoved: 0
            };
        }

        const shouldPrune = (item) => {
            if (!settings.prune || !settings.domIdSet) return false;
            if (!item || !item.id) return false;
            if (settings.domIdSet.has(item.id)) return false;

            if (!settings.removeOnlyGeneratedIds) return true;
            return settings.generatedIdPattern.test(item.id);
        };

        const scoreItem = (item) => {
            if (!item) return -1;

            let score = 0;
            const id = (item.id || "") + "";

            if (settings.canonicalIdPattern.test(id)) score += 100;
            if (item.editorEl) score += 25;
            if (Array.isArray(item.responses) && item.responses.length > 0) score += 10;
            if ((item.status || "").toLowerCase() === "closed") score += 5;
            if (!settings.generatedIdPattern.test(id)) score += 2;

            return score;
        };

        let removedMissing = 0;
        const candidates = [];

        for (const [id, item] of sourceMap.entries()) {
            if (!id || !item) continue;
            if (shouldPrune(item)) {
                removedMissing++;
                continue;
            }
            candidates.push([id, item]);
        }

        if (!settings.dedupe) {
            sourceMap.clear();
            for (let i = 0; i < candidates.length; i++) {
                sourceMap.set(candidates[i][0], candidates[i][1]);
            }
            return {
                removedMissing,
                removedDuplicates: 0,
                totalRemoved: removedMissing
            };
        }

        const winnersBySignature = new Map();
        for (let i = 0; i < candidates.length; i++) {
            const id = candidates[i][0];
            const item = candidates[i][1];

            const signature = this._buildStateItemLooseSignature(item) || id;
            const current = winnersBySignature.get(signature);

            if (!current) {
                winnersBySignature.set(signature, {
                    id,
                    item,
                    score: scoreItem(item)
                });
                continue;
            }

            const incomingScore = scoreItem(item);
            if (incomingScore > current.score) {
                winnersBySignature.set(signature, {
                    id,
                    item,
                    score: incomingScore
                });
            }
        }

        const winners = Array.from(winnersBySignature.values()).map(v => [v.id, v.item]);
        const removedDuplicates = candidates.length - winners.length;

        sourceMap.clear();
        for (let i = 0; i < winners.length; i++) {
            sourceMap.set(winners[i][0], winners[i][1]);
        }

        return {
            removedMissing,
            removedDuplicates,
            totalRemoved: removedMissing + removedDuplicates
        };
    }

    sanitizeStateItems(options = {}) {
        const settings = Object.assign({
            selector: (this.config && this.config.selectors && this.config.selectors.OVER_ALL_AQ_CMD) || '[data-class="ckcommentsfull"]',
            generatedIdPattern: /^query_/i,
            canonicalIdPattern: /^full_/i,
            removeOnlyGeneratedIds: true,
            prune: true,
            dedupe: true
        }, options || {});

        const domIdSet = settings.prune ? this._collectDomIdSet(settings.selector) : null;

        const queryStats = this._sanitizeStateMap(this._state && this._state.queries, {
            prune: settings.prune,
            dedupe: settings.dedupe,
            domIdSet,
            generatedIdPattern: settings.generatedIdPattern,
            canonicalIdPattern: settings.canonicalIdPattern,
            removeOnlyGeneratedIds: settings.removeOnlyGeneratedIds
        });

        const commentStats = this._sanitizeStateMap(this._state && this._state.comments, {
            prune: settings.prune,
            dedupe: settings.dedupe,
            domIdSet,
            generatedIdPattern: settings.generatedIdPattern,
            canonicalIdPattern: settings.canonicalIdPattern,
            removeOnlyGeneratedIds: settings.removeOnlyGeneratedIds
        });

        return {
            removedQueries: queryStats.totalRemoved || 0,
            removedComments: commentStats.totalRemoved || 0,
            removedQueryMissing: queryStats.removedMissing || 0,
            removedCommentMissing: commentStats.removedMissing || 0,
            removedQueryDuplicates: queryStats.removedDuplicates || 0,
            removedCommentDuplicates: commentStats.removedDuplicates || 0,
            domCount: domIdSet ? domIdSet.size : 0
        };
    }

    pruneStateItemsMissingInDOM(options = {}) {
        return this.sanitizeStateItems(Object.assign({}, options, {
            prune: true,
            dedupe: false
        }));
    }

    _normalizeSignatureValue(value) {
        return ((value || "") + "")
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    _buildStateItemLooseSignature(item) {
        if (!item) return "";

        // Quick-fix key for copy-paste duplicates where only ID differs.
        // Keep intentionally loose: same label + same query content => same logical query.
        const label = this._normalizeSignatureValue(item.label);
        const content = this._normalizeSignatureValue(item.content);

        return [label, content].join("||");
    }

    dedupeStateItems(options = {}) {
        return this.sanitizeStateItems(Object.assign({}, options, {
            prune: false,
            dedupe: true
        }));
    }

    _isDeletedItem(item) {
        if (!item) return false;
        return item.deleted === true || item.deleted === "true" || !!item.deletedBy;
    }

    _findResponseDomElement(item, response) {
        try {
            if (!item || !item.editorEl || !response || !item.editorEl.querySelector) return null;
            if (response.id) {
                const byId = item.editorEl.querySelector(`[data-response-id="${response.id}"],[id="${response.id}"]`);
                if (byId) return byId;
            }
            if (response.timestamp) {
                return item.editorEl.querySelector(`[data-name="response"][data-time="${response.timestamp}"],[data-name="Response"][data-time="${response.timestamp}"]`);
            }
        } catch (err) {
            if (typeof this.handleError === "function") this.handleError("_findResponseDomElement", err);
        }
        return null;
    }

    isActiveResponse(item, response) {
        if (!response) return false;
        if (this._isDeletedItem(response)) return false;

        const responseEl = this._findResponseDomElement(item, response);
        if (responseEl && (responseEl.hasAttribute("data-deleted") || responseEl.hasAttribute("data-deleted-by"))) {
            return false;
        }

        return true;
    }

    getActiveResponses(item) {
        const responses = item && Array.isArray(item.responses) ? item.responses : [];
        return responses.filter((response) => this.isActiveResponse(item, response));
    }

    getLastActiveResponse(item) {
        const activeResponses = this.getActiveResponses(item);
        return activeResponses.length ? activeResponses[activeResponses.length - 1] : null;
    }

    /**
     * Sync in-memory query/comment editor references with live CKEditor DOM once.
     * This keeps state items mapped to current editor elements before read operations.
     */
    syncStateWithEditorElements(options = {}) {
        const settings = Object.assign({
            selector: (this.config && this.config.selectors && this.config.selectors.OVER_ALL_AQ_CMD) || '[data-class="ckcommentsfull"]',
            includeMissingInState: false,
            nullMissingRefs: true
        }, options || {});

        if (!this.editor || !this.editor.document || !this.editor.document.$) return {
            synced: 0,
            editorCount: 0
        };

        this.editorDocBody = this.editor.document.$;
        const nodes = Array.from(this.editorDocBody.querySelectorAll(settings.selector));
        const domById = new Map();

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const id = node && node.getAttribute && node.getAttribute("id");
            if (!id) continue;

            domById.set(id, node);

            let item = null;
            if (this._state && this._state.queries) item = this._state.queries.get(id) || null;
            if (!item && this._state && this._state.comments) item = this._state.comments.get(id) || null;

            if (item) {
                item.editorEl = node;

                const status = (node.getAttribute("data-status") || "").toLowerCase();
                if (status) item.status = status;

                const collation = node.getAttribute("data-collation-status");
                if (collation != null) item.collationStatus = collation || item.collationStatus || "";

                item.deleted = node.hasAttribute("data-deleted") ? "true" : (item.deleted || "false");
                item.deletedBy = node.getAttribute("data-deleted-by") || item.deletedBy || "";
                item.deletedRole = node.getAttribute("data-deleted-role") || item.deletedRole || "";
                item.deletedAt = node.getAttribute("data-deleted-time") || item.deletedAt || "";
            } else if (settings.includeMissingInState && typeof this._parseQueryNode === "function") {
                // Parse only when explicitly requested to avoid heavy operations by default.
                this._parseQueryNode(node);
            }
        }

        if (settings.nullMissingRefs) {
            const allStateItems = []
                .concat(Array.from((this._state && this._state.queries ? this._state.queries.values() : [])))
                .concat(Array.from((this._state && this._state.comments ? this._state.comments.values() : [])));

            for (let j = 0; j < allStateItems.length; j++) {
                const item = allStateItems[j];
                if (!item || !item.id) continue;
                if (!domById.has(item.id)) {
                    item.editorEl = null;
                }
            }
        }

        return {
            synced: domById.size,
            editorCount: nodes.length
        };
    }

    /**
     * Get open queries
     */
    getOpenQueries(roleBased = false) {
        // Ensure state/editor element references are aligned before reading open queries.
        this.syncStateWithEditorElements();

        const allQueries = typeof this.getAllQueries === "function" ? this.getAllQueries() : [];

        // 🔹 Filter only "open" queries (case-insensitive) AND not deleted
        const openQueries = Array.isArray(allQueries) ?
            allQueries.filter(q =>
                q &&
                typeof q.status === "string" &&
                /^(open)$/i.test(q.status.trim()) &&
                // EXCLUDE deleted queries
                !this._isDeletedItem(q)
            ) : [];

        // Role-based handling (collator state)
        if (roleBased) {
            const isCollator = !!(this._state && this._state.isCollator);
            if (isCollator) {
                const collationPendingQueries =
                    typeof this.getCollationPendingQueries === "function" ?
                    this.getCollationPendingQueries() : [];

                if (isCollator) {
                    return openQueries.length > 0 ? openQueries : collationPendingQueries;
                }
            }
        }

        return openQueries;
    }


    /**
     * Queries still needing collator verify.
     * Excludes DOM approved and items where collator already replied.
     * Default DOM pending stamp on load does not mean verify is done.
     */
    getCollationPendingQueries() {
        if (typeof this.syncStateWithEditorElements === "function") {
            this.syncStateWithEditorElements();
        }

        return this.getAllQueries().filter(q => {
            if (!q) return false;
            if (typeof this._isDeletedItem === "function" && this._isDeletedItem(q)) return false;
            const fromDom = q.editorEl && typeof q.editorEl.getAttribute === "function" ?
                q.editorEl.getAttribute("data-collation-status") : null;
            if (fromDom != null && String(fromDom).trim() !== "") {
                if (/^approved$/i.test(String(fromDom).trim())) return false;
            }
            if (String(q.collationStatus || "").toLowerCase() === "approved") return false;
            if (q.lastResponse && q.lastResponse.sameUserRole) return false;
            return /pending|holding/gi.test(q.collationStatus || "");
        });
    }

    /**
     * Open collator verify dialog (wrapper for other modules).
     * @param {string|null} queryId - pending query id, or null for first pending
     * @param {object} options - passed to dialog open
     */
    openVerifyDialog(queryId = null, options = {}) {
        const dialog = this.dialogModule || window.queryDialog;
        if (!dialog || typeof dialog.openVerify !== "function") {
            console.warn("openVerifyDialog: queryDialog.openVerify not available");
            return Promise.resolve(false);
        }
        return dialog.openVerify(queryId, options);
    }

    /**
     * Get current counts
     */
    getCounts() {
        return this._state.counts;
    }

    /**
     * Persist all query/comment data to DB before signoff/finalize.
     */
    persistFinalQuerySnapshot(options = {}) {
        const snapshotConfig = this.config && this.config.snapshotPersistence ?
            this.config.snapshotPersistence : {};
        const settings = Object.assign({
            endpoint: API_FIND_UPDATE_INSERT,
            callbackName: "query_snapshot_saved",
            includeSummary: true,
            removeEmptyFields: snapshotConfig.removeEmptyFields !== false,
            retainEmptyKeys: Array.isArray(snapshotConfig.retainEmptyKeys) ? snapshotConfig.retainEmptyKeys : [],
            forceRemoveKeys: Array.isArray(snapshotConfig.forceRemoveKeys) ? snapshotConfig.forceRemoveKeys : []
        }, options || {});

        return new Promise((resolve, reject) => {
            try {
                this.syncStateWithEditorElements({
                    promptOnMismatch: false,
                    retainStateResponses: true,
                    includeMissingInState: false
                });

                const stripDomRefs = (item) => {
                    if (!item) return item;
                    const copy = Object.assign({}, item);
                    delete copy.editorEl;
                    delete copy.highSpan;
                    delete copy.collationStatus;
                    delete copy.content;
                    delete copy.lastResponse;
                    delete copy.timestamp;
                    delete copy.role;

                    return copy;
                };

                const stateSnapshot = {
                    docid: DOC_ID,
                    generatedAt: Date.now(),
                    generatedBy: USER_INFO && USER_INFO.MAIL_ID || "",
                    generatedRole: USER_INFO && USER_INFO.ROLE_ID || "",
                    counts: this._state && this._state.counts ? Object.assign({}, this._state.counts) : {},
                    queries: Array.from((this._state && this._state.queries ? this._state.queries.values() : [])).map(stripDomRefs),
                    comments: Array.from((this._state && this._state.comments ? this._state.comments.values() : [])).map(stripDomRefs),
                    flags: {
                        globalReplyMode: this._state && this._state.globalReplyMode || "default",
                        globalQuickReplyMode: !!(this._state && this._state.globalQuickReplyMode),
                        currentUserRole: this._state && this._state.currentUserRole || "",
                        currentUserMailId: this._state && this._state.currentUserMailId || "",
                        isCollator: !!(this._state && this._state.isCollator)
                    }
                };

                const isEmptyValue = (val) => {
                    if (val === null || val === undefined) return true;
                    if (typeof val === "string") return val.trim() === "";
                    if (Array.isArray(val)) return val.length === 0;
                    if (typeof val === "object") return Object.keys(val).length === 0;
                    return false;
                };

                const retainSet = new Set(settings.retainEmptyKeys || []);
                const removeSet = new Set(settings.forceRemoveKeys || []);

                const cleanObject = (obj) => {
                    if (Array.isArray(obj)) {
                        const arr = obj
                            .map(cleanObject)
                            .filter((item) => !isEmptyValue(item));
                        return arr;
                    }

                    if (!obj || typeof obj !== "object") {
                        return obj;
                    }

                    const cleaned = {};
                    Object.keys(obj).forEach((key) => {
                        if (removeSet.has(key)) return;

                        const value = cleanObject(obj[key]);
                        const shouldKeepEmpty = retainSet.has(key);
                        if (!settings.removeEmptyFields || shouldKeepEmpty || !isEmptyValue(value)) {
                            cleaned[key] = value;
                        }
                    });
                    return cleaned;
                };

                const finalSnapshot = cleanObject(stateSnapshot);

                const callbackName = `${settings.callbackName}_${Date.now()}`;

                const updatePayload = {
                    query_snapshot: finalSnapshot,
                    // query_snapshot_time: Date.now(),
                    // query_snapshot_by: USER_INFO && USER_INFO.MAIL_ID || "",
                    // query_snapshot_role: USER_INFO && USER_INFO.ROLE_ID || ""
                };

                if (settings.includeSummary) {
                    /* updatePayload.query_snapshot_summary = {
                        queryCount: stateSnapshot.queries.length,
                        commentCount: stateSnapshot.comments.length
                    }; */
                }

                const jsonData = GET_JSON("query_snapshot", {}, updatePayload);

                commonfn[callbackName] = function(response) {
                    try {
                        if (!response || response.r === 0) {
                            reject(response || {
                                r: 0,
                                m: "query snapshot save failed"
                            });
                            return;
                        }
                        resolve({
                            success: true,
                            response,
                            snapshot: finalSnapshot
                        });
                    } finally {

                    }
                };

                commonfn.callajax(jsonData, callbackName, settings.endpoint);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get query main status
     */
    getQueryMainStatus(queryId) {
        const query = this.getQuery(queryId);
        return query && query.status || "open";
    }

    /**
     * Get query collation status
     */
    getQueryCollationStatus(queryId) {
        const query = this.getQuery(queryId);
        return query && query.collationStatus || "pending";
    }

    isCountMismatch() {
        if (this.restoreModule && this.restoreModule.validateAndRestoreQueries) {
            this.restoreModule.validateAndRestoreQueries();
        }
        const allQueryCount = this.getAllQueries().length;
        const {
            total: originalCount
        } = this.restoreModule.getCounts("aqOriginal");

        debug.log(`All Queries: ${allQueryCount}, Original: ${originalCount}`);

        if (allQueryCount < originalCount) {
            // ❌ Missing queries
            return true;
        }

        // equal or higher → fine ✅
        return false;
    }




    generateUniqueId() {
        const prefix = 'full_';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let uniqueId = '';

        // Generate 4 random characters
        for (let i = 0; i < 4; i++) {
            uniqueId += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return prefix + uniqueId;
    }



    handlingEvtPaste(inputField) {
        inputField.addEventListener('paste', (e) => {
            e.preventDefault();

            var htmlData = e.clipboardData.getData('text/html');
            var txtData = e.clipboardData.getData('text/plain');
            console.table([{
                "txtData": txtData,
                "htmlData": htmlData
            }]);
            // 🔑 run through custom paste filter
            const pasteData = PasteFilter.fire(txtData, {
                event_from: 'query',
                e
            });
            if (pasteData) {
                // insert sanitized/filtered content
                document.execCommand('insertHTML', false, pasteData);
            }
        });

        // 🔑 focus inputField after render
        setTimeout(() => {
            commonMethods.setCaret(inputField);
        }, 555);
    }

    validateContentLength(content, rules) {
        if (content.length < rules.MIN_CONTENT_LENGTH) {
            TOASTER_ALERT('cmd_required_content', {
                type: 'warning',
                MIN_CONTENT_LENGTH: rules.MIN_CONTENT_LENGTH
            });
            return false;
        }
        return true;
    }

    isFreeTextQuickReplyButton(buttonText) {
        const lower = String(buttonText || "").toLowerCase();
        return lower.includes("add") || lower.includes("instruction") || lower.includes("notes");
    }

    updateRefDOM2State(queryId, el) {
        var currentItem = typeof queryId === "string" ? this.getQuery(queryId) : queryId;
        if (currentItem.editorEl && el) {
            currentItem.editorEl = el;
        }
    }

    _resolveInsertProcess(extras) {
        extras = extras || {};
        if (extras.process === "comment" || extras.process === "query") {
            this._state._current_process = extras.process;
        }
        return this._state && this._state._current_process === "comment" ? "comment" : "query";
    }

    _buildNextItemLabel(optiosns = {}) {
        var processType = this._resolveInsertProcess(optiosns);
        const isComment = processType === "comment";
        const collection = (this._state && (isComment ? this._state.comments : this._state.queries)) || new Map();
        const prefix = isComment ? "C" : "AQ";

        var maxNum = 0;
        var items = Array.from(collection.values());
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var label = item.label || "";
            var match = label.match(/\d+$/);
            if (match) {
                var num = parseInt(match[0], 10);
                if (num > maxNum) maxNum = num;
            }
        }

        return prefix + (maxNum + 1);
    }

    //  Updated operationInsertOrUpdate with integrated validation
    async operationInsertOrUpdate(module, queryId, preSaveResults, extras, formData) {
        preSaveResults = preSaveResults || {};
        formData = formData || {};
        extras = extras || {};

        var currentItem = typeof queryId === "string" ? this.getQuery(queryId) : queryId;

        // Get validation info from getCurrentFormContent (single source of truth)
        const isRefDialog = extras.source && (
            extras.source === "MultiRefModule" ||
            extras.source === "referenceDialog" ||
            extras.source === "ReferenceDialog"
        );
        var container = extras.container;
        var contentInfo = preSaveResults;

        // If container available, get fresh validation info including attachments
        if (container) {
            contentInfo = this.getCurrentFormContent(container, queryId);
            // Update preSaveResults with latest info
            preSaveResults.canSave = contentInfo.canSave;
            preSaveResults.canClose = contentInfo.canClose;
            preSaveResults.hasPendingAttachments = contentInfo.hasPendingAttachments;
            preSaveResults.unchanged = contentInfo.unchanged;
            preSaveResults.storeId = contentInfo.storeId;
        }

        var canSave = contentInfo.canSave !== undefined ? contentInfo.canSave : false;
        var hasPending = contentInfo.hasPendingAttachments || false;

        // Early validation - check if we can save
        if (!canSave && !isRefDialog) {
            if (extras.btn) {
                this.handleButtonAction(extras.btn, "save", "return", {
                    success: false,
                    message: 'No changes to save'
                });
            }
            return {
                success: false,
                message: 'No changes to save',
                canClose: false
            };
        }

        // Get attachment info from module
        var storeId = contentInfo.storeId ||
            preSaveResults.storeId ||
            this._resolveAttachmentStoreId(extras.container) ||
            (module && module.attachmentModule && module.attachmentModule.currentStoreId) ||
            this.currentStoreId;
        var attachments = module && module.attachmentModule && module.attachmentModule.getAttachments && module.attachmentModule.getAttachments(storeId);

        formData.content = preSaveResults.htmlData || contentInfo.htmlData;
        if (preSaveResults.domEl) formData.domEl = preSaveResults.domEl;

        if (extras.options) {
            var results = this.validateSubmitOptions(container, queryId, extras.options, module);
            if (!results.valid) {
                if (extras.btn) {
                    this.handleButtonAction(extras.btn, "save", "return", {
                        success: false,
                        message: 'Validation failed'
                    });
                }
                return {
                    success: false,
                    message: 'Validation failed',
                    canClose: false,
                    ...results
                };
            }
        }

        //  Handle attachments 
        var self = this;
        var finallabel = this._buildNextItemLabel(extras);



        var callbackAttach = async function() {
            if (!attachments) return;

            var pending = attachments.pending || [];
            var existing = attachments.existing || [];
            var deleted = attachments.deleted || [];
            var deletedAll = attachments.deletedAll || false;

            if (extras.btn) {
                self.handleButtonAction(extras.btn, "save", "send", {});
            }

            if (hasPending || existing.length || pending.length) {
                if (pending.length > 0) {
                    var recordtype = (self._state && self._state._current_process && self._state._current_process == "comment") ? "Comment" : "Query";
                    var isDialog = self.dialogModule && self.dialogModule.state == 1 || false;
                    var label = self.currentQuery && self.currentQuery.label || finallabel;

                    var attachmentResult = await module.attachmentModule.uploadFiles(storeId, {
                        subfolder: "attachments",
                        recordtype: recordtype,
                        from: isDialog ? "dialog" : "panel",
                        label: label
                    });
                    var uploadStore = module.attachmentModule.getStore(storeId);
                    formData.attachments = (uploadStore && uploadStore.existingItems) ?
                        uploadStore.existingItems :
                        self.formatAttachmentResponse(attachmentResult);
                } else if (deleted.length > 0 || deletedAll) {
                    formData.attachments = module.attachmentModule.prepareFileParams(storeId, {});
                    var store = module.attachmentModule.getStore(storeId);
                    formData.attachments = (store && store.existingItems) ? store.existingItems : [];
                } else if (existing.length > 0) {
                    formData.attachments = attachments.existing;
                }
            }
        };

        var updateResults = {};

        //  Existing item flow 
        if (currentItem) {
            var lastResponse = currentItem.lastResponse || {};
            var sameUserRole = currentItem.sameUserRole === true;
            var rSameUserRole = (lastResponse && lastResponse.sameUserRole) || false;
            var isEdit = (sameUserRole && currentItem.responses.length == 0) || rSameUserRole;

            debug.log(JSON.stringify(preSaveResults));

            // ? ensure same elements has been mapped
            // this.setCursorOnEditor(currentItem, true);

            // If no text content and no attachments in edit mode, trigger delete
            if (preSaveResults.textLength == 0 && !hasPending) {
                if (isEdit) {
                    var from = (module.name == "queryPanel") ? "panel" : "dialog";
                    await this.confirmDelete(queryId, "one", from);
                    return;
                } else {
                    var rulesValid = !this.config || !this.config.contentRules ||
                        this.validateContentLength(preSaveResults.htmlData, this.config.contentRules);
                    if (!rulesValid) return {
                        success: false
                    };
                }
            }

            await callbackAttach();

            // Save if there are changes (validated by canSave)

            if (canSave) {
                if (!isEdit) {
                    if (currentItem.status == "open") formData.closeQuery = true;
                    updateResults = await this.addResponse(queryId, formData);
                } else {
                    if (sameUserRole) {
                        updateResults = await this.updateQueryOrCommentItem(queryId, formData);
                    } else {
                        formData.isQuickReply = false;
                        updateResults = await this.updateResponse(queryId, lastResponse.id, formData);
                    }
                }
            }
        }
        //  New item flow 
        else {
            // var rulesValid = !this.config || !this.config.contentRules || this.validateContentLength(preSaveResults.htmlData, this.config.contentRules);
            // if (!rulesValid) return { success: false };

            if (canSave) {
                await callbackAttach();
                formData.label = finallabel;

                if (!module) module = window.queryDialog;
                if (typeof module.createNewQueryorComment == "function") {
                    updateResults = await module.createNewQueryorComment(formData, extras);
                } else {
                    module = window.queryDialog;
                    updateResults = await module.createNewQueryorComment(formData, extras);
                }

            } else return {
                success: false
            };
        }

        const resultItem = updateResults && (updateResults.query || updateResults);
        const returnedStatus = resultItem && (resultItem["data-status"] || resultItem.status || (currentItem && currentItem.status));
        const renderType = returnedStatus === "comment" ? "comment" : "query";
        const uniqueId = (currentItem && currentItem.id) || (resultItem && resultItem.id) || null;
        const inState = !!(uniqueId && this.getQuery(uniqueId));
        const panel = this.panelModule || window.queryPanel;
        setTimeout(() => {
            if (!panel) return;
            // Prefer single-row update when state already has the item.
            // Hard refresh only when id is missing (e.g. appendEl before hydrate).
            const updatedExistingRow = uniqueId && inState && typeof panel.updateItemFilterStatus === "function" ?
                panel.updateItemFilterStatus(uniqueId, renderType) :
                false;
            if (updatedExistingRow && typeof panel.scheduleRenderItemPreserveFilter === "function") {
                panel.scheduleRenderItemPreserveFilter(uniqueId, renderType);
            } else if (uniqueId && inState && typeof panel.renderItemPreserveFilter === "function") {
                panel.renderItemPreserveFilter(uniqueId, renderType);
            } else if (uniqueId && inState && typeof panel.renderItem === "function") {
                panel.renderItem(uniqueId, renderType);
            } else if (typeof panel.refresh === "function") {
                panel.refresh(true);
            }
        }, 250);

        if (extras.btn) {
            self.handleButtonAction(extras.btn, "save", "return", updateResults);
        }

        return updateResults;
    }

    downloadFileNameVisibility() {
        // Select all filename elements (in both normal & preview attachment views)
        const fileEls = document.querySelectorAll(
            ".attachment-item .attachment-name, .attachment-preview-item"
        );

        // early exit if nothing to process
        if (!fileEls.length) return;

        fileEls.forEach(el => {
            // 1️⃣ Determine filename source
            const sFilename =
                el.getAttribute("title") ||
                el.getAttribute("data-filename") ||
                el.textContent && el.textContent.trim() ||
                "";

            // 2️⃣ Decide which element to pass to updateFileName
            let paramEl = el;
            let isDialog = false;

            // For dialog-stored attachments, use inner container
            const storeId = el.getAttribute("data-store-id");
            if (storeId) {
                const inner = el.querySelector(".flex-grow-1");
                if (inner) paramEl = inner;
            }

            // 🧠 Skip if this inner element already processed
            if (paramEl.getAttribute("data-trim") === "yes") return;

            // 3️⃣ Safely update filename using trimFileName utility
            if (trimFileName.updateFileName && typeof trimFileName.updateFileName === "function") {
                trimFileName.updateFileName(paramEl, sFilename, {
                    query_panel: !isDialog
                });
                paramEl.setAttribute("data-trim", "yes");
            } else {
                console.warn("trimFileName.updateFileName not available");
            }
        });
    }


    /**
     * Safely get and trigger module's show() method
     */
    async triggerOpen(moduleId, el, params) {
        try {
            const moduleInstance = await commonMethods.getModule(moduleId);

            if (moduleInstance && typeof moduleInstance.show === "function") {
                await moduleInstance.show(el, params);
            } else {
                console.warn(`Module "${moduleId}" is missing or has no show() method.`);
            }
        } catch (error) {
            console.error(`Error opening module "${moduleId}":`, error);
            this.errorTracker.logError("system", "triggerOpen", error, {
                moduleId
            });
        }
    }

    showBeforeloop(queryId = null, process = "comment", options = {}) {
        try {
            var IMS = typeof IMPACT_SELECTION !== "undefined" ? IMPACT_SELECTION : {};

            if (IMS.Ignore_Comment && IMS.Ignore_Comment() && queryId == null) {
                TOASTER_ALERT('Insert_comment_restrict', {
                    type: "warning"
                });
                return false;
            }

            this.currentQuery = queryId ? this.getQuery(queryId, process) : null;

            // Nothing to handle — allow continue
            if (!this.currentQuery) return true;
            else if (options.forceOpen) return true;

            const moduleId = this.currentQuery.openSupportModule;
            const openRetryCount = this.currentQuery.openSupportModuleCount || 0;
            if (!moduleId || openRetryCount > 5) return true;

            // Delay open slightly to ensure DOM ready
            setTimeout(() => {
                const el = this.currentQuery.editorEl;
                const params = {
                    FROM_QRY: true
                };

                const globalModule = window[moduleId];

                if (typeof this.currentQuery.openSupportModuleCount !== "number") {
                    this.currentQuery.openSupportModuleCount = 0;
                }

                this.currentQuery.openSupportModuleCount++;

                if (globalModule && typeof globalModule.show === "function") {
                    globalModule.show(el, params);
                    setTimeout(() => {
                        if (this.currentQuery && globalModule.state == 1) {
                            this.currentQuery.openSupportModuleCount = 0;
                        }
                    }, 999);

                } else {
                    this.triggerOpen(moduleId, el, params);
                }
            }, 100);

            // Returning false means "don’t continue" — handled by support module
            return false;

        } catch (error) {
            console.error("Error in showBefore:", error);
            this.errorTracker.logError("system", "showBefore", error, {
                queryId
            });
            return true;
        }
    }

    // ✅ Single unified validation function - uses getCurrentFormContent for all checks
    async canProceed(options) {
        var getCurrentFormContent = options.getCurrentFormContent;
        var container = options.container;
        var queryId = options.queryId;
        var force = options.force !== undefined ? options.force : false;
        // 'close' or 'save'
        var action = options.action || 'close';
        var onSuccess = options.onSuccess;
        var dialogConfig = options.dialogConfig || {
            type: 'warning',
            title: 'Are you sure?',
            message: 'close_without_reply',
            okText: 'Yes',
            cancelText: 'Cancel'
        };

        try {
            // 1️⃣ Force action → bypass validation
            if (force) {
                if (typeof onSuccess === "function") onSuccess(true);
                return true;
            }

            // 2️⃣ Get form content info (includes attachment validation)
            var currentContent = getCurrentFormContent ?
                getCurrentFormContent(container, queryId) : {
                    hasContent: false,
                    unchanged: true,
                    canClose: true,
                    canSave: false,
                    hasPendingAttachments: false
                };

            var canClose = currentContent.canClose;
            var canSave = currentContent.canSave;

            // 3️⃣ Handle action based on validation results
            if (action === 'close') {
                if (canClose) {
                    // Safe to close without confirmation
                    if (typeof onSuccess === "function") onSuccess(true);
                    return true;
                }

                // Need user confirmation before closing
                if (AlertNewDialog && typeof AlertNewDialog.fire === "function") {
                    var result = await AlertNewDialog.fire(
                        dialogConfig.type,
                        dialogConfig.title,
                        dialogConfig.message,
                        dialogConfig.okText,
                        dialogConfig.cancelText
                    );

                    if (result && result.isConfirmed) {
                        if (typeof onSuccess === "function") onSuccess(true);
                        return true;
                    }
                }

                // User cancelled or no dialog available
                return false;
            } else if (action === 'save') {
                // Save: check if there's anything to save
                if (canSave) {
                    if (typeof onSuccess === "function") onSuccess(true);
                    return true;
                }
                // No changes - nothing to save
                return false;
            }

            return false;

        } catch (err) {
            console.warn("canProceed error:", err.message);
            return false;
        }
    }

    /**
     * Common button action handler for "save", "delete", etc.
     * Handles both "send" (execute action) and "return" (process result) stages.
     *
     * @param {HTMLElement} btn - The button element clicked.
     * @param {string} [action="save"] - The name of the action (method on this).
     * @param {string} [stage="send"] - Either "send" or "return".
     * @param {Function} [callback=null] - Common callback after success/fail.
     * @param {Object} [results={}] - Pre-fetched results (used in return stage).
     * @returns {Promise<any>} - The action result or processed result.
     */
    async handleButtonAction(btn, action = "save", stage = "send", results = {}) {
        if (!btn || typeof action !== "string") {
            console.warn("handleButtonAction: invalid input parameters");
            return false;
        }

        // Capitalized context label for messages
        const contextAction = action.charAt(0).toUpperCase() + action.slice(1);
        const stages = {
            loadingText: `${contextAction.slice(0, -1)}ing...`,
            successMsg: `${contextAction} successful`,
            errorMsg: `${contextAction} failed, try again`,
            restoreText: contextAction
        };

        let result = null;
        let isSuccess = false;

        // 🧩 "SEND" STAGE: execute the corresponding function
        if (stage === "send") {

            // Prevent rapid consecutive clicks
            if (btn.disabled || btn.classList.contains("is-processing")) return false;

            // Mark button busy
            btn.disabled = true;
            btn.classList.add("is-processing");
            btn.textContent = stages.loadingText;
            return;
        } else if (stage === "return") {

            // 🧩 "RETURN" STAGE: handle an existing result object

            result = results || {};
            isSuccess = !!(result && result.success);

            if (this.panelModule && this.panelModule.showToast) {
                this.panelModule.showToast(
                    isSuccess ? stages.successMsg : stages.errorMsg,
                    isSuccess ? "success" : "error"
                );
            }
            // Re-enable button
            btn.disabled = false;
            btn.classList.remove("is-processing");
            btn.textContent = stages.restoreText;
            return result;
        }

        console.warn(`handleButtonAction: Unknown stage '${stage}'`);
        return false;
    }

    verifyOnceContent(orgConent) {
        let filterValue = PasteFilter.fire(orgConent, {
            event_from: 'shortcut',
            record: false,
            e: {
                name: "check"
            }
        });
        const newValue = filterValue != orgConent ? filterValue : orgConent;
        return newValue;
    }

    handleAfterSetData() {
        try {
            // Prefer scoped (window-safe) references
            const queryPanel = window.queryModule.panelModule || {};
            const globalPanel = window.panelModule || {};

            // Check for render function (typo fixed from "rendor" → "render")
            if (queryPanel && typeof queryPanel.render === "function") {
                queryPanel.render(true);
            } else if (globalPanel && typeof globalPanel.render === "function") {
                globalPanel.render(true);
            } else {
                console.warn("⚠️ No valid panelModule.render() found in onAfterSetData()");
            }
        } catch (err) {
            console.error("❌ Error in onAfterSetData:", err);
        }
    }



    closeAllOpenQueris(option = {}) {
        const openItems = this.getOpenQueries();
        const randomResponses = ["Fine", "Ok", "good", "proceed"];

        if (IS_DEV_DOMAIN || IS_UAT_DOMAIN || IS_LOCAL_HOST || IS_LIVE_DOMAIN) {
            openItems.forEach(item => {
                const query = this.getQuery(item.id);
                const {
                    editorEl
                } = query;
                const response = this.buildResponse({
                    content: randomResponses[Math.floor(Math.random() * randomResponses.length)],
                    attachments: [],
                    sameUserRole: true,
                }, null, query);

                const responseEl = this.createResponseEl(response);

                $(editorEl).attr("data-status", "closed").append(responseEl);

            });
        }

        this.panelModule.render(true);

    }


}