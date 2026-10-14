    function getQueryDialogModuleConfig() {

        /**
         * QueryDialogModule - Handles dialog UI for queries/comments
         */

        class QueryDialogModule extends BaseModule {

            constructor(name, errorTracker = {}, config) {
                super(name, errorTracker = {}, config);
                this.name = name;
                this.parent = window.queryModule;
                this.dialog = null;
                this.currentQuery = null;
                this._state = {};
                this._verifyQueue = [];
                this._verifyIndex = 0;
                this._verifyMode = false;
                // this._templates_ = this.parent.templates;
                // this.initialize();
            }

            _ensureParent() {
                if (!this.parent && window.queryModule) {
                    this.parent = window.queryModule;
                }
                return this.parent;
            }

            _getReadyParent() {
                const candidate = (this.parent && this.parent._state) ? this.parent : window.queryModule;
                if (!candidate || !candidate._state) return null;
                if (typeof candidate.getQuery !== "function") return null;
                return candidate;
            }

            initialize() {

                debug.log("--------initialize---------");

                this.createDialog();
                this.setupDialogEventListeners();

                this.Panel = this.dialog;
                if (typeof MODULE_LIST !== "undefined") {
                    MODULE_LIST[this._id] = this;
                }
                window.queryDialog = this;

                Object.assign(this._state, {
                    INSERTION_TYPES: {
                        COMMENT: 'comment',
                        OPEN: 'open'
                    },
                    SELECTORS: {
                        KWD: 'KWD',
                        ABR: 'ABR',
                        CONTRIB: '.contrib',
                        MIXED_CITATION: '.mixed-citation'
                    },
                    HIGHLIGHT_ATTRS: {
                        DATA_HIGH: 'note'
                    }
                });
                var interval = setInterval(() => {
                    this._ensureParent();
                    if (this.parent && this.parent.templates) {
                        this._templates_ = this.parent.templates;
                        clearInterval(interval);
                    }
                }, 999);
                this.headerInfo = {
                    'comment': {
                        'titleNew': 'New Comment',
                        'titleReply': 'Response Comment',
                        'titleEdit': 'Edit Comment'
                    },
                    'query': {
                        'titleNew': 'New Query',
                        'titleReply': 'Response Query',
                        'titleEdit': 'Edit Query'
                    }
                };
                const checkModule = setInterval(async () => {
                    if (this.parent && this.parent.attachmentModule) {
                        this.attachmentModule = this.parent.attachmentModule;
                        clearInterval(checkModule);

                        // Setup attachment callbacks for dialog
                        // this.setupAttachmentCallbacks();
                        if (GlobalEditor && GlobalEditor.getCommand) {
                            const cmd = GlobalEditor.getCommand('add_comment');
                            if (cmd) cmd.enable();
                        }
                    }
                }, 999);

            }
            isExists() {
                return !!document.getElementById('queryDialog');
            }

            createDialog() {
                const isExists = this.isExists();
                if (!isExists) {
                    const dialogHTML =
                        `<div class="mDialog ds-none wo-editor-access" id="queryDialog">
                        <div class="dialog-container">
                            <div class="dialog-content">
                                <div class="dia_header_div">
                                    <div class="dia_header_text" id="header_text"></div>
                                    <div class="ml-auto closeIcons"><img class="n_Img" src="assets/images/svg/dialogClose.svg" alt="Close Icon"></div>
                                </div>
                                <div class="d-flex flex-column dialog-body no-footer" data-id="dialog-body">
                                    <div class="dialog-input-group"></div>
                                </div>
                                <div class="verify-stepper dialog-verify-footer d-none px-3 py-2">
                                    <div class="verify-quick-actions"></div>
                                    <div class="verify-nav-actions">
                                        <span class="verify-stepper-count"></span>
                                        <button type="button" class="verify-prev-btn btn btn-sm secondary-btn" title="Previous">Prev</button>
                                        <button type="button" class="verify-next-btn btn btn-sm secondary-btn" title="Next">Next</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                </div>`.trim();
                    document.body.insertAdjacentHTML('beforeend', dialogHTML);
                }
                this.dialog = document.getElementById('queryDialog');
                this.ensureVerifyStepperChrome();

            }

            setupDialogEventListeners() {
                var self = this;

                //  Dialog-level buttons
                var buttons = [{
                        selector: ".close-btn",
                        action: function() {
                            self.close();
                        }
                    },
                    {
                        selector: ".cancel-btn",
                        action: function() {
                            self.close();
                        }
                    },
                    {
                        selector: ".clear-btn",
                        action: function() {
                            self.clear();
                        }
                    },
                    {
                        selector: ".save-btn",
                        action: function(e) {
                            var btn = e.currentTarget;
                            if (btn.disabled || btn.classList.contains('is-processing')) return;
                            btn.disabled = true;
                            btn.classList.add('is-processing');
                            Promise.resolve(self.save()).finally(function() {
                                btn.disabled = false;
                                btn.classList.remove('is-processing');
                            });
                        }
                    }
                ];

                for (var i = 0; i < buttons.length; i++) {
                    var btn = buttons[i];
                    var el = self.dialog ? self.dialog.querySelector(btn.selector) : null;

                    if (el && typeof btn.action === "function") {
                        el.addEventListener("click", btn.action, false);
                    }
                }

                // 🔹 Form input (contenteditable)
                var inputField = self.dialog ? self.dialog.querySelector(".dialog-reply-input") : null;
                if (inputField && self.parent && typeof self.parent.handlingEvtPaste === "function") {
                    self.parent.handlingEvtPaste(inputField);
                }


                // 🔹 Optional: initialize rich text editor if defined
                if (typeof self.setupDialogSummerNote === "function") {
                    self.setupDialogSummerNote();
                }

                if (!self._dialogQuickReplyBound && self.dialog) {
                    self._dialogQuickReplyBound = true;
                    self.dialog.addEventListener("click", function(e) {
                        var btn = e.target.closest(".quick-reply-btn");
                        if (!btn || !self.dialog.contains(btn) || btn.disabled) return;
                        e.preventDefault();
                        Promise.resolve(self.handleDialogQuickReply(btn));
                    });
                }

                if (!self._dialogVerifyNavBound && self.dialog) {
                    self._dialogVerifyNavBound = true;
                    self.dialog.addEventListener("click", function(e) {
                        var prevBtn = e.target.closest(".verify-prev-btn");
                        var nextBtn = e.target.closest(".verify-next-btn");
                        if (!prevBtn && !nextBtn) return;
                        if (!self.dialog.contains(prevBtn || nextBtn)) return;
                        e.preventDefault();
                        if (prevBtn && !prevBtn.disabled) self.navigateVerify(-1);
                        if (nextBtn && !nextBtn.disabled) self.navigateVerify(1);
                    });
                }
            }

            ensureVerifyStepperChrome() {
                if (!this.dialog) return null;

                var content = this.dialog.querySelector(".dialog-content");
                var body = this.dialog.querySelector('[data-id="dialog-body"]');
                var stepper = this.dialog.querySelector(".verify-stepper");
                var header = this.dialog.querySelector(".dia_header_div");

                // Relocate header-mounted stepper (older DOM) to footer after body
                if (stepper && header && header.contains(stepper) && body && content) {
                    content.insertBefore(stepper, body.nextSibling);
                }

                if (!stepper && content && body) {
                    stepper = document.createElement("div");
                    content.insertBefore(stepper, body.nextSibling);
                }

                if (!stepper) return null;

                stepper.className = "verify-stepper dialog-verify-footer d-none px-3 py-2";

                var quickZone = stepper.querySelector(".verify-quick-actions");
                var navZone = stepper.querySelector(".verify-nav-actions");
                var prevBtn = stepper.querySelector(".verify-prev-btn");
                var nextBtn = stepper.querySelector(".verify-next-btn");
                var countEl = stepper.querySelector(".verify-stepper-count");
                // Rebuild older two-row / Prev-first layouts into single-row count|Prev|Next
                var navOrderOk = !!(navZone && countEl && prevBtn && nextBtn &&
                    navZone.firstElementChild === countEl &&
                    countEl.nextElementSibling === prevBtn &&
                    prevBtn.nextElementSibling === nextBtn);
                var needsLayout = !quickZone || !navZone || !prevBtn || !nextBtn || !countEl || !navOrderOk;

                if (needsLayout) {
                    stepper.innerHTML =
                        '<div class="verify-quick-actions"></div>' +
                        '<div class="verify-nav-actions">' +
                        '<span class="verify-stepper-count"></span>' +
                        '<button type="button" class="verify-prev-btn btn btn-sm secondary-btn" title="Previous">Prev</button>' +
                        '<button type="button" class="verify-next-btn btn btn-sm secondary-btn" title="Next">Next</button>' +
                        '</div>';
                }

                return stepper;
            }

            canShowVerifyQuickReplies(item, mode) {
                if (!this._verifyMode) return false;
                if (mode === "edit") return false;
                if (!item) return false;
                if (this.hasCollatorQuickDecision(item)) return false;
                if (this.isCollatorAuthoredComment(item)) return false;
                return true;
            }

            isCollatorRoleName(role) {
                const name = String(role || "").toLowerCase();
                const coName = (typeof ROLE_IDS !== "undefined" && ROLE_IDS[ROLE_IDS.CO] && ROLE_IDS[ROLE_IDS.CO].name) ?
                    String(ROLE_IDS[ROLE_IDS.CO].name).toLowerCase() : "collator";
                return name === coName || /^co-?/.test(name) || name.indexOf("collator") !== -1;
            }

            /**
             * True when collator already decided: DOM approved or collator last reply.
             * Default DOM pending stamp on load does not block verify.
             */
            hasCollatorQuickDecision(item) {
                if (!item) return false;
                const fromDom = item.editorEl && typeof item.editorEl.getAttribute === "function" ?
                    item.editorEl.getAttribute("data-collation-status") : null;
                const collationStatus = fromDom != null && String(fromDom).trim() !== "" ?
                    fromDom : (item.collationStatus || item["data-collation-status"]);
                if (collationStatus != null && String(collationStatus).trim() !== "") {
                    if (/^(approved|verified|resolved)$/i.test(String(collationStatus).trim())) return true;
                }
                if (item.lastResponse && item.lastResponse.sameUserRole) return true;
                return false;
            }

            isCollatorAuthoredComment(item) {
                if (!item) return false;
                const isComment = item.status === "comment" || /^C/i.test(item.label || "");
                if (!isComment) return false;
                if (this.isCollatorRoleName(item.role)) return true;
                return !!(item.sameUserRole && this.parent && this.parent._state && this.parent._state.isCollator);
            }

            shouldSkipVerifyItem(item) {
                return this.hasCollatorQuickDecision(item) || this.isCollatorAuthoredComment(item);
            }

            /**
             * Pending queries first, then comments (excluding current user's own comments
             * and items that already have a collator quick decision / collator-authored comment).
             * @returns {{id:string, process:string}[]}
             */
            buildVerifyQueue() {
                this._ensureParent();
                if (!this.parent) return [];

                const self = this;
                const pendingQueries = typeof this.parent.getCollationPendingQueries === "function" ?
                    this.parent.getCollationPendingQueries() : [];
                const sortedQueries = typeof this.parent.sortItems === "function" ?
                    this.parent.sortItems(pendingQueries, "query", false) :
                    (Array.isArray(pendingQueries) ? pendingQueries : []);

                const queryEntries = sortedQueries.filter(function(q) {
                    return q && q.id && !self.shouldSkipVerifyItem(q);
                }).map(function(q) {
                    return {
                        id: q.id,
                        process: "query"
                    };
                });

                const commentsMap = this.parent._state && this.parent._state.comments;
                let comments = commentsMap ?
                    Array.from(commentsMap.values()) : [];

                if (typeof this.parent._isDeletedItem === "function") {
                    comments = comments.filter(function(c) {
                        return !self.parent._isDeletedItem(c);
                    });
                }

                const mailId = (this.parent._state && this.parent._state.currentUserMailId) ||
                    (typeof USER_INFO !== "undefined" && USER_INFO && USER_INFO.MAIL_ID) ||
                    "";
                const mailLower = String(mailId).toLowerCase();
                if (mailLower) {
                    comments = comments.filter(function(c) {
                        const user = String((c && c.user) || "").toLowerCase();
                        return user !== mailLower;
                    });
                }

                comments = comments.filter(function(c) {
                    return !self.isCollatorAuthoredComment(c) && !self.shouldSkipVerifyItem(c);
                });

                const sortedComments = typeof this.parent.sortItems === "function" ?
                    this.parent.sortItems(comments, "comment", true) :
                    comments;

                const commentEntries = sortedComments.map(function(c) {
                    return c && c.id ? {
                        id: c.id,
                        process: "comment"
                    } : null;
                }).filter(Boolean);

                return queryEntries.concat(commentEntries);
            }

            findVerifyQueueIndex(queue, itemId) {
                if (!itemId || !Array.isArray(queue)) return -1;
                for (var i = 0; i < queue.length; i++) {
                    if (queue[i] && queue[i].id === itemId) return i;
                }
                return -1;
            }

            clearVerifyMode() {
                this._verifyMode = false;
                this._verifyQueue = [];
                this._verifyIndex = 0;
                this.updateVerifyStepperChrome();
            }

            setupVerifyMode(queryId, process, mode) {
                this._ensureParent();
                const isCollator = !!(this.parent && this.parent._state && this.parent._state.isCollator);
                if (!isCollator || !queryId || mode === "new") {
                    this.clearVerifyMode();
                    return false;
                }

                const currentItem = typeof this.parent.getQuery === "function" ?
                    this.parent.getQuery(queryId, process) : null;
                if (this.shouldSkipVerifyItem(currentItem || this.currentQuery)) {
                    this.clearVerifyMode();
                    return false;
                }

                const queue = this.buildVerifyQueue();
                const idx = this.findVerifyQueueIndex(queue, queryId);
                if (!queue.length || idx === -1) {
                    this.clearVerifyMode();
                    return false;
                }

                this._verifyMode = true;
                this._verifyQueue = queue;
                this._verifyIndex = idx;
                this.updateVerifyStepperChrome(mode);
                if (typeof this.parent.setCursorOnEditor === "function") {
                    this.parent.setCursorOnEditor(queryId);
                }
                return true;
            }

            updateVerifyStepperChrome(mode) {
                const stepper = this.ensureVerifyStepperChrome();
                if (!stepper) return;

                const countEl = stepper.querySelector(".verify-stepper-count");
                const prevBtn = stepper.querySelector(".verify-prev-btn");
                const nextBtn = stepper.querySelector(".verify-next-btn");
                const quickZone = stepper.querySelector(".verify-quick-actions");
                const navZone = stepper.querySelector(".verify-nav-actions");
                const total = this._verifyQueue.length;
                const active = this._verifyMode && total > 0;

                if (!active) {
                    stepper.classList.add("d-none");
                    stepper.classList.remove("d-flex");
                    if (quickZone) quickZone.innerHTML = "";
                    if (navZone) navZone.style.display = "";
                    return;
                }

                stepper.classList.remove("d-none");
                stepper.classList.add("d-flex");
                if (navZone) navZone.style.display = "flex";

                const displayIndex = this._verifyIndex + 1;
                if (countEl) {
                    countEl.textContent = displayIndex + " of " + total;
                }
                if (prevBtn) prevBtn.disabled = this._verifyIndex <= 0;
                if (nextBtn) nextBtn.disabled = this._verifyIndex >= total - 1;

                const item = this.currentQuery;
                const replyMode = mode || this._mode || "reply";
                const showQuick = this.canShowVerifyQuickReplies(item, replyMode);
                if (quickZone) {
                    if (showQuick && this.parent && this.parent.templates) {
                        const templates = this.parent.templates;
                        if (!templates.setupInitiated) templates.setUpParentKeys();
                        quickZone.innerHTML = templates.renderQuickReplyButtonRow ?
                            templates.renderQuickReplyButtonRow() : "";
                        quickZone.style.display = quickZone.innerHTML ? "flex" : "none";
                    } else {
                        quickZone.innerHTML = "";
                        quickZone.style.display = "none";
                    }
                }
            }

            navigateVerify(delta) {
                if (!this._verifyMode || !this._verifyQueue.length) return;
                const nextIndex = this._verifyIndex + delta;
                if (nextIndex < 0 || nextIndex >= this._verifyQueue.length) return;

                this._verifyIndex = nextIndex;
                const entry = this._verifyQueue[this._verifyIndex];
                if (!entry || !entry.id) return;

                this.showLoop(entry.id, entry.process || "query", {
                    reply: true,
                    skipVerifyRebuild: true
                });
                if (this.parent && typeof this.parent.setCursorOnEditor === "function") {
                    this.parent.setCursorOnEditor(entry.id);
                }
                this.updateVerifyStepperChrome();
            }

            refreshVerifyQueueAfterAction(completedId) {
                this._ensureParent();
                const oldIndex = this._verifyIndex;
                let queue = this.buildVerifyQueue();

                if (completedId) {
                    queue = queue.filter(function(entry) {
                        return entry && entry.id !== completedId;
                    });
                }

                this._verifyQueue = queue;
                if (!queue.length) {
                    this._verifyIndex = 0;
                    return null;
                }

                // Finished the last item in the prior queue → no next to advance to
                if (oldIndex >= queue.length) {
                    this._verifyIndex = 0;
                    return null;
                }

                this._verifyIndex = oldIndex;
                return queue[this._verifyIndex];
            }

            advanceVerifyAfterAction() {
                if (!this._verifyMode) {
                    this.closeConfirm(true);
                    return;
                }

                const completedId = this.currentQuery && this.currentQuery.id;
                const nextEntry = this.refreshVerifyQueueAfterAction(completedId);

                if (!nextEntry || !nextEntry.id) {
                    this.clearVerifyMode();
                    this.closeConfirm(true);
                    return;
                }

                this.showLoop(nextEntry.id, nextEntry.process || "query", {
                    reply: true,
                    skipVerifyRebuild: true
                });
                if (this.parent && typeof this.parent.setCursorOnEditor === "function") {
                    this.parent.setCursorOnEditor(nextEntry.id);
                }
                this.updateVerifyStepperChrome();
            }

            async handleDialogQuickReply(btn) {
                const buttonText = btn.dataset.text;
                if (!buttonText || !this.parent) return;

                const queryId = this.currentQuery && this.currentQuery.id;
                if (!queryId) return;

                if (this.parent.isFreeTextQuickReplyButton(buttonText)) {
                    const container = this.dialog && this.dialog.querySelector(".dialog-input-container");
                    const bodyQuick = this.dialog && this.dialog.querySelector(".dialog-reply-form > .quick-reply-buttons");
                    const footerQuick = this.dialog && this.dialog.querySelector(".verify-quick-actions");
                    const input = this.dialog && this.dialog.querySelector(".dialog-reply-input");
                    if (container) container.style.display = "block";
                    if (bodyQuick) bodyQuick.style.display = "none";
                    if (footerQuick) footerQuick.style.display = "none";
                    if (input) {
                        input.focus();
                        if (typeof this.parent.handlingEvtPaste === "function") {
                            this.parent.handlingEvtPaste(input);
                        }
                    }
                    return;
                }

                const quickScope = btn.closest(".verify-quick-actions, .quick-reply-buttons");
                if (quickScope) {
                    quickScope.querySelectorAll(".quick-reply-btn").forEach(function(b) {
                        b.disabled = true;
                    });
                }

                try {
                    const panel = this.parent.panelModule;
                    if (panel && typeof panel.submitQuickReply === "function") {
                        await panel.submitQuickReply(queryId, buttonText);
                    } else {
                        await this.parent.addResponse(queryId, {
                            content: buttonText,
                            closeQuery: true
                        });
                    }
                    this.markQcCommentsQueriesRefreshOnClose(queryId);
                    this.advanceVerifyAfterAction();
                } catch (err) {
                    console.error("Dialog quick reply failed:", err);
                    if (quickScope) {
                        quickScope.querySelectorAll(".quick-reply-btn").forEach(function(b) {
                            b.disabled = false;
                        });
                    }
                }
            }

            markQcCommentsQueriesRefreshOnClose(queryId) {
                try {
                    if (!queryId) return;
                    const isCollator = !!(this.parent && this.parent._state && this.parent._state.isCollator);
                    if (!isCollator) return;
                    this._refreshQcCommentsQueriesOnClose = true;
                } catch (err) {
                    console.warn("markQcCommentsQueriesRefreshOnClose failed:", err);
                }
            }


            verifyIsFirstComment() {
                const result = this.getCurrentUserCorrectionCount() || {
                    array: [],
                    count: 0
                };
                const count = result.count || 0;

                const comments = this.parent && this.parent._state && this.parent._state.comments;
                const noComments = !comments || (comments.size !== undefined && comments.size === 0);

                if (noComments && count === 0) {
                    AlertNewDialog.fire(IS_JOURNAL ? 'Impact_Edit_Info' : 'Impact_Edit_Info_Book');
                }
            }

            updateDepencyItems() {
                if (this.trackManager == null && typeof trackManager === "function") {
                    this.trackManager = new trackManager();
                }
                this._ensureParent();
                if (!this.templates && this.parent && this.parent.templates) {
                    this.templates = this.parent.templates;
                }
            }

            _hasUsableParent() {
                this._ensureParent();
                return !!(this.parent && this.parent._state && this.parent.config);
            }

            _hasUsableTemplates() {
                if (!this.templates && this.parent && this.parent.templates) {
                    this.templates = this.parent.templates;
                }
                return !!this.templates;
            }

            _canOpenDialog(options) {
                if (!this._hasUsableParent()) {
                    console.warn("queryDialog.open: queryModule parent is not ready");
                    return false;
                }
                if (!this._hasUsableTemplates()) {
                    console.warn("queryDialog.open: templates are not ready");
                    return false;
                }
                if (!this._state) this._state = {};
                return true;
            }

            async open(queryId = null, process = "comment", options = {}) {
                this.updateDepencyItems();
                options = options || {};
                if (!this._canOpenDialog(options)) {
                    return false;
                }
                // Track View is always readonly show mode — require an existing id
                if (typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW) {
                    options = Object.assign({}, options, {
                        readonly: true
                    });
                    if (!queryId) {
                        console.warn("queryDialog.open: Track View requires an existing query id");
                        return false;
                    }
                }
                if (options.readonly && !queryId) {
                    console.warn("queryDialog.open: readonly mode requires an existing query id");
                    return false;
                }

                // Readonly / Track View: show thread without editor lock / create gates
                if (options.readonly || (typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW)) {
                    return this._openReadonly(queryId, process, options);
                }

                const wasOpen = this.state === 1;
                const findId = typeof queryId === "string" ? queryId : (queryId && queryId.id) || "";

                const queryData = findId ? this.parent.getQuery(findId) : null;

                if (queryData && queryData.label && /AQ/gi.test(queryData.label) && process == "comment") {
                    process = "query";
                }

                const result = this.show(queryId, process, options);
                if (result === false && wasOpen && typeof this.showLoop === 'function') {
                    this.showLoop(queryId, process, options);
                }
            }

            /**
             * Open dialog in readonly view mode (thread only).
             */
            async openView(queryId, process = "query", options = {}) {
                return this.open(queryId, process, Object.assign({}, options || {}, {
                    readonly: true
                }));
            }

            isReadonlyMode(options) {
                const opts = options || this._options || {};
                if (opts.readonly || opts.mode === "view") return true;
                return typeof IS_TRACK_VIEW !== "undefined" && !!IS_TRACK_VIEW;
            }

            /**
             * Display-only open: thread DOM, close (X) only — no BaseModule create/lock gates.
             */
            _openReadonly(queryId, process, options) {
                try {
                    if (!this._canOpenDialog(options)) {
                        return false;
                    }
                    if (!this.FullyLoaded && typeof this.init === "function") {
                        this.init();
                    }
                    if (!this.isExists()) {
                        this.createDialog();

                    }
                    this.dialog = this.dialog || document.getElementById("queryDialog");
                    this.Panel = this.dialog;
                    if (!this.dialog) {
                        console.warn("queryDialog._openReadonly: dialog DOM missing");
                        return false;
                    }

                    this.dialog.classList.remove("ds-none");
                    if (this.dialog.hasAttribute("style")) this.dialog.removeAttribute("style");
                    this.dialog.classList.add("query-dialog-readonly");
                    const inputGroup = this.dialog.querySelector(".dialog-input-group");
                    if (inputGroup) inputGroup.remove();

                    if (typeof this.handledraggble === "function") this.handledraggble();
                    if (typeof this.updateDialogPosition === "function") {
                        this.updateDialogPosition(this._id || "queryDialog");
                    }
                    if (typeof this.bringDialogToFront === "function") {
                        this.bringDialogToFront(this.Panel);
                    }

                    this.state = 1;
                    this.showLoop(queryId, process, Object.assign({}, options || {}, {
                        readonly: true
                    }));
                    return true;
                } catch (err) {
                    console.warn("queryDialog._openReadonly failed:", err && err.message);
                    return false;
                }
            }

            /**
             * Open collator verify mode for a pending query/comment (or first queue item if no id).
             * Intended for other modules: window.queryDialog.openVerify()
             */
            async openVerify(queryId = null, options = {}) {
                this.updateDepencyItems();
                this._ensureParent();

                if (!this.parent || !this.parent._state || !this.parent._state.isCollator) {
                    console.warn("openVerify: collator role required");
                    return false;
                }

                const forceOpen = !!(options && options.forceOpen);

                if (queryId && !forceOpen) {
                    const requested = typeof this.parent.getQuery === "function" ?
                        this.parent.getQuery(queryId) : null;
                    if (this.shouldSkipVerifyItem(requested)) {
                        console.warn("openVerify: item already has collator decision or is collator comment", queryId);
                        return false;
                    }
                }

                const queue = this.buildVerifyQueue();
                const openOptions = Object.assign({}, options || {}, {
                    reply: true,
                    forceOpen: true
                });

                let target = null;
                if (!queryId) {
                    if (!queue.length) {
                        console.warn("openVerify: no pending queries/comments to verify");
                        return false;
                    }
                    target = queue[0];
                } else {
                    const idx = this.findVerifyQueueIndex(queue, queryId);
                    if (idx !== -1) {
                        target = queue[idx];
                    } else if (forceOpen) {
                        let process = "query";
                        const asQuery = typeof this.parent.getQuery === "function" ?
                            this.parent.getQuery(queryId) : null;
                        if (asQuery) {
                            process = asQuery.status === "comment" || /^C/i.test(asQuery.label || "") ?
                                "comment" : "query";
                        } else if (this.parent._state && this.parent._state.comments &&
                            this.parent._state.comments.has && this.parent._state.comments.has(queryId)) {
                            process = "comment";
                        }
                        target = {
                            id: queryId,
                            process
                        };
                    } else {
                        console.warn("openVerify: item not in verify queue", queryId);
                        return false;
                    }
                }

                if (!target || !target.id) return false;

                await this.open(target.id, target.process || "query", openOptions);
                return true;
            }

            updateUserDetailInfo() {
                var {
                    currentUserRole,
                    currentUserMailId
                } = this.parent._state || {};

                var el = this.dialog ? this.dialog.querySelector(".user-detail-info") : null;

                if (el) {
                    // ? update attribute
                    el.setAttribute("data-role", currentUserRole || "");

                    // update visible content
                    el.textContent = currentUserRole;
                }
            }

            updateHeader(process, mode = "new", label = "") {

                var headerText = "";
                var finalProcess = process != "comment" ? "query" : process;

                if (mode === "view") {
                    headerText = (finalProcess === "comment" ? "Comment" : "Query");
                    if (label) headerText += " " + label;
                } else if (this._verifyMode && label) {
                    headerText = "Verify " + label;
                } else if (this.headerInfo[finalProcess]) {
                    var key = "title" + (mode.charAt(0).toUpperCase() + mode.slice(1));
                    headerText = this.headerInfo[finalProcess][key] || "";
                    if (label) headerText += " " + label;
                } else if (label) {
                    headerText = label;
                }

                var headerEl = this.dialog ? this.dialog.querySelector("#header_text") : null;
                if (headerEl) {
                    headerEl.textContent = headerText || "";
                }
                this.updateVerifyStepperChrome();
                // this.updateUserDetailInfo();
            }




            /**
             * Check before showing, auto-triggers openSupportModule if defined
             */
            showBefore(queryId = null, process = "comment", options = {}) {
                const parent = this._getReadyParent();
                if (!parent || typeof parent.showBeforeloop !== "function") {
                    console.warn("queryDialog.showBefore: queryModule not ready");
                    return false;
                }
                return parent.showBeforeloop(queryId, process, options);
            }


            showLoop(queryId = null, process = "comment", options = {}) {

                const parent = this._getReadyParent();
                if (!parent) {
                    console.warn("queryDialog.showLoop: queryModule state not ready");
                    return;
                }
                this.parent = parent;

                options = options || {};
                const isReadonly = this.isReadonlyMode(options);
                if (isReadonly) {
                    options = Object.assign({}, options, {
                        readonly: true
                    });
                }

                this.currentQuery = queryId ? parent.getQuery(queryId, process) : null;
                parent._state._current_process = this._current_process = process;
                parent._state._options = this._options = options;

                // pick mode
                var mode = "new";
                var finalLabel = "";

                if (this.dialog) {
                    $(this.dialog).find('.reply-group-items').remove();
                    $(this.dialog).find('.dialog-reply-input').empty();
                    this.dialog.classList.toggle("query-dialog-readonly", isReadonly);
                }

                if (isReadonly) {
                    // Readonly / Track View: thread only — no edit/reply shell
                    mode = "view";
                    finalLabel = (this.currentQuery && this.currentQuery.label) || "";
                    this.clearVerifyMode();
                    this.updateHeader(process, "view", finalLabel);
                    this.renderDialogItems(process, mode);
                    this.updateVerifyStepperChrome(mode);
                    parent._state._mode = this._mode = mode;
                    return;
                }

                if (this.currentQuery) {
                    const {
                        responses = [], lastResponse = {}, sameUserRole = false, label
                    } = this.currentQuery;
                    const safeResponses = Array.isArray(responses) ? responses : [];
                    const safeLastResponse = lastResponse && typeof lastResponse === "object" ? lastResponse : {};
                    const hasResponses = safeResponses.length > 0;
                    const lastSameUserRole = safeLastResponse.sameUserRole || false;

                    if (!hasResponses) {
                        // No replies yet
                        mode = sameUserRole ? "edit" : "reply";
                    } else {
                        // There are replies
                        if (lastSameUserRole) {
                            // last reply by same role
                            mode = "edit";
                        } else {
                            // last reply by other role
                            mode = "reply";
                        }
                    }

                    // explicit options still override
                    if (options.edit) mode = "edit";
                    if (options.reply) mode = "reply";

                    finalLabel = label;
                }

                // verify mode before render so templates/footer know whether to hide body quick buttons
                if (!(options && options.skipVerifyRebuild)) {
                    this.setupVerifyMode(queryId, process, mode);
                }

                this.updateHeader(process, mode, finalLabel);
                this.renderDialogItems(process, mode);
                this.updateVerifyStepperChrome(mode);

                // Setup attachments after rendering
                setTimeout(() => {
                    const attachMod = this.attachmentModule || (this.parent && this.parent.attachmentModule);
                    if (attachMod && typeof attachMod.setupUniqueAttachments === 'function') {
                        attachMod.setupUniqueAttachments(queryId, this.dialog, 'dialog');
                    }
                    if (this.parent && this.parent.downloadFileNameVisibility) {
                        this.parent.downloadFileNameVisibility();
                    }
                }, 100);

                // update user data — skip first-comment alert while browsing verify queue
                if (process == "comment" && !this._verifyMode) {
                    setTimeout(() => this.verifyIsFirstComment(), 100);
                }
                parent._state._mode = this._mode = mode;
            }

            /* setupAttachmentCallbacks() {
                // Register callbacks specific to dialog
                this.attachmentModule.registerCallback('files-added', (data) => {
                    console.log('Dialog: Files added', data);
                });
        
                this.attachmentModule.registerCallback('upload-success', (data) => {
                    console.log('Dialog: Upload successful', data);
                    this.close(true);
                });
        
                this.attachmentModule.registerCallback('upload-error', (data) => {
                    console.error('Dialog: Upload failed', data);
                    this.showNotification('Upload failed. Please try again.', 'error');
                });
            } */


            // Simplified validateAndClose
            async validateAndClose(force) {
                force = force !== undefined ? force : false;

                // Readonly / Track View: nothing to dirty-check — just close
                if (this.isReadonlyMode(this._options)) {
                    this.closeConfirm(true);
                    return true;
                }

                var inputContainer = this.dialog.querySelector('.dialog-input-group');
                var queryId = this.currentQuery && this.currentQuery.id;
                var self = this;

                return await this.parent.canProceed({
                    getCurrentFormContent: this.parent.getCurrentFormContent.bind(this.parent),
                    container: inputContainer,
                    queryId: queryId,
                    force: force,
                    action: 'close',
                    onSuccess: function(confirmed) {
                        if (confirmed) self.closeConfirm(true);
                    }
                });
            }

            async preCloseModule(force) {
                force = force !== undefined ? force : false;
                return await this.validateAndClose(force);
            }

            async close(force = false) {
                return await this.validateAndClose(force);
            }

            closeConfirm(force = false) {
                this._wasVerifyClose = !!this._verifyMode;
                this.clearVerifyMode();
                this.parent.currentQuery = this.currentQuery = null;
                $('.reply-group-items').remove();
                $('.dialog-reply-input').empty();
                const container = this.dialog && this.dialog.querySelector('.dialog-input-group');
                if (container) container.removeAttribute("data-query-id");
                if (this.dialog) this.dialog.classList.remove("query-dialog-readonly");
                // Hide dialog safely
                // this.dialog.style.display = 'none'; 
                this.closeDialog({}, force);
                return true;
            }

            clear() {
                const inputContainer = this.dialog.querySelector('.dialog-input-group');
                var queryId = this.currentQuery ? this.currentQuery.id : null;
                this.parent.getCurrentFormContent(inputContainer, queryId, {
                    reset: true
                });
            }

            renderDialogItems(process = "comment", mode = "new") {
                const parent = this._getReadyParent();
                const templates = parent && parent.templates;
                const hasTemplateMethods = templates &&
                    typeof templates.buildDialogInputForm === "function" &&
                    typeof templates.buildDialogItems === "function";

                if (!parent || !parent._state || !hasTemplateMethods || !parent.initialized) {
                    this._renderDialogRetries = (this._renderDialogRetries || 0) + 1;
                    if (this._renderDialogRetries < 40) {
                        setTimeout(() => this.renderDialogItems(process, mode), 500);
                    } else {
                        console.warn("renderDialogItems: parent state or templates not ready after retries");
                    }
                    return;
                }
                this.parent = parent;
                templates.parent = parent;
                this._renderDialogRetries = 0;
                const inputContainer = this.dialog.querySelector('.dialog-input-group');
                const {
                    buildDialogInputForm,
                    buildDialogItems
                } = this.parent.templates;
                const isReadonly = mode === "view" || this.isReadonlyMode(this._options);


                if (inputContainer) {
                    if (isReadonly) {
                        // Thread only — no quick reply, input shell, or action toolbar
                        inputContainer.innerHTML = "";
                        $(this.dialog).find('.reply-group-items').remove();
                        if (this.currentQuery) {
                            $(inputContainer).attr("data-query-id", this.currentQuery.id);
                            const replyGroup = buildDialogItems(this.currentQuery, {
                                readonly: true
                            }, this.parent.templates);
                            if (replyGroup) {
                                $(replyGroup).insertBefore(inputContainer);
                            }
                        }
                    } else {
                        // Always render the input form first
                        inputContainer.innerHTML = buildDialogInputForm(process, mode, this.currentQuery);

                        // If reply mode, insert reply group *before* inputContainer
                        if (mode !== "new" && this.currentQuery) {
                            $(inputContainer).attr("data-query-id", this.currentQuery.id);

                            const replyGroup = buildDialogItems(this.currentQuery, {}, this.parent.templates);

                            if (replyGroup) {
                                $(this.dialog).find('.reply-group-items').remove();
                                $(replyGroup).insertBefore(inputContainer);
                            }
                        }
                    }
                }

                this.setupDialogEventListeners();
            }


            setupDialogSummerNote() {
                // Setup summernote or other rich text editor
                const textarea = this.dialog.querySelector('.query-textarea');
                if (textarea && typeof $ !== 'undefined' && $.fn.summernote) {
                    const config = this._summernote ? this._summernote.buildConfig({
                        height: 200,
                        toolbar: [
                            ['style', ['bold', 'italic', 'subscript', 'superscript']]
                        ]
                    }) : {
                        height: 200,
                        toolbar: [
                            ['style', ['bold', 'italic', 'subscript', 'superscript']]
                        ]
                    };
                    if (this._summernote) this._summernote.bindTarget(textarea, {
                        resetCache: true
                    });
                    $(textarea).summernote(config);
                }

            }

            async save() {
                const inputField = this.dialog ? this.dialog.querySelector("#dialog-reply-input") : null;
                if (!inputField || !inputField.parentElement) {
                    console.warn("save: dialog form not rendered yet");
                    return;
                }
                const queryId = this.currentQuery ? this.currentQuery.id : null;
                const preSaveResults = this.parent.getCurrentFormContent(inputField.parentElement, queryId);
                const saveBtn = this.dialog.querySelector(".save-btn");
                const submitOptions = {
                    hasValidation: !!(this._options && this._options.hasValidation),
                    isAttachmentRequired: !!(this._options && this._options.isAttachmentRequired),
                    hasAllowedMultipleAttach: !!(this._options && this._options.hasAllowedMultipleAttach),
                    isInputContentRequired: !!(this._options && this._options.isInputContentRequired),
                    hasContentLimit: !!(this._options && this._options.hasContentLimit)
                };

                const isComment = this.currentQuery && this.currentQuery.status == "comment";

                let updateResults = {};
                this.updateDepencyItems();

                try {
                    updateResults = await this.parent.operationInsertOrUpdate(this, queryId, preSaveResults, {
                        btn: saveBtn,
                        container: inputField.parentElement,
                        options: submitOptions
                    });
                    if (updateResults) {
                        var params = updateResults.alert_params || {
                            type: 'error'
                        };
                        if (!updateResults.success) {
                            var alerKey = 'Insert_Empty_Comment';

                            if (queryId) alerKey = isComment ? 'Insert_Empty_Comment' : 'Insert_Empty_Query';

                            alerKey = updateResults.alert_key || alerKey;

                            TOASTER_ALERT(alerKey, params);
                        }
                        if (updateResults.success) {
                            this.markQcCommentsQueriesRefreshOnClose(queryId);
                        }
                        if (updateResults.success && updateResults.canClose !== false) {
                            if (this._verifyMode) {
                                this.advanceVerifyAfterAction();
                            } else {
                                this.closeConfirm(true);
                            }
                        }
                        // Panel row already updated via renderItem (operationInsertOrUpdate /
                        // handleResponseUpdates) — skip full soft refresh here.
                    }
                } catch (error) {
                    console.error("Failed to save query:", error);
                    if (this.parent && this.parent.showNotification) {
                        this.parent.showNotification("Failed to save query. Please try again.", "error");
                    }
                }
            }


            async createNewQueryorComment(formData, options = {}) {

                if (IS_LOCAL_HOST) debugger;

                this.updateDepencyItems();

                const {
                    content,
                    attachments = [],
                    label
                } = formData;
                const {
                    appendEl,
                    process,
                    addAttr = ""
                } = options;
                const paramsProcess = this._current_process || process || "comment";

                // Prepare query data
                const queryData = this.prepareQueryData(label, content, attachments);

                if (queryData.status != paramsProcess) queryData.status = paramsProcess;
                else if (paramsProcess == "query") queryData.status = "open";

                if (addAttr) queryData.addAttr = addAttr;

                if (this.parent && this.parent._state && this.parent._state._options) {
                    if (this.parent._state._options.addFlag && this.parent._state._options.addAttr) {
                        queryData.addAttr =
                            (queryData.addAttr ? queryData.addAttr + ' ' : '') +
                            this.parent._state._options.addAttr;
                    }
                }

                const template = this.templates.createNewItem(paramsProcess, queryData);
                const templateMeta = (() => {
                    const $outer = $(template).first();
                    const meta = {
                        "data-label": $outer.attr("data-label"),
                        "data-status": $outer.attr("data-status"),
                        id: $outer.attr("id")
                    };
                    const commentAttr = $outer.attr("data-comment");
                    const queryAttr = $outer.attr("data-query");
                    if (typeof commentAttr !== "undefined") meta["data-comment"] = commentAttr;
                    if (typeof queryAttr !== "undefined") meta["data-query"] = queryAttr;
                    return meta;
                })();
                const templateAttrString = Object.entries(templateMeta)
                    .filter(([, value]) => typeof value !== "undefined")
                    .map(([key, value]) => `${key}="${value}"`)
                    .join(" ");
                const resultPayload = {
                    success: true,
                    id: templateMeta.id,
                    "data-label": templateMeta["data-label"],
                    "data-status": templateMeta["data-status"]
                };

                if (appendEl) {
                    var el = appendEl[0] ? appendEl[0] : appendEl;
                    this.trackManager.getInsNode(el, {
                        appendOnly: true,
                        appendInsfragString: template.trim(),
                        setAttrParams: {
                            'data-track-code': paramsProcess == "query" ? 'query-01' : 'comment-01'
                        }
                    });
                    return {
                        ...resultPayload,
                        templateMeta,
                        templateAttrString
                    };
                }

                await this.insertQuery(template);

                // Insert query based on content type
                return {
                    ...resultPayload,
                    templateMeta,
                    templateAttrString
                };

            }


            prepareQueryData(label, content, attachments = []) {

                const {
                    currentUserMailId,
                    currentUserRole
                } = this.parent._state;

                const status = this._current_process === this._state.INSERTION_TYPES.COMMENT ?
                    this._current_process :
                    this._state.INSERTION_TYPES.OPEN;

                this.parent._current_process_uniqueId = this.parent.generateUniqueId();

                return {
                    label,
                    status,
                    content,
                    role: currentUserRole,
                    user: currentUserMailId,
                    attachments
                };
            }

            async insertQuery(template, options) {
                const IMS = IMPACT_SELECTION;
                const EC = EDITOR_CURSOR;
                let shouldFinalize = false;

                try {
                    this.validateInsertionParams(template, IMS, EC);

                    if (this.isSpecialContent(IMS, EC)) {
                        await this.handleSpecialContent(template, IMS, EC);
                    } else {
                        await this.handleRegularContent(template, IMS);
                    }
                    shouldFinalize = true;
                    return true;
                } catch (error) {
                    console.warn("insertQuery insertion failed:", error.message);
                    this.handleFallbackInsertion(template, IMS);
                    shouldFinalize = false;
                    return false;
                } finally {
                    if (shouldFinalize) {
                        const created = await this.parent.createQuery(this.parent._current_process_uniqueId);
                        if (created) {
                            this.close(true);
                        }
                    }
                }
            }

            validateInsertionParams(template, IMS, EC) {
                if (!template || !IMS || !EC) {
                    throw new Error('Missing required parameters');
                }
            }

            isSpecialContent(IMS, EC) {
                return IMS.IsContrib || IMS.IsRef || EC.IS_KWD || EC.IS_ABR;
            }

            async handleSpecialContent(htmlString, IMS, EC) {
                try {
                    const {
                        selector,
                        ascendant
                    } = this.getSelectionContext(EC, IMS);

                    if (this.isReferenceOrKeyword(IMS, EC)) {
                        await this.insertReferenceOrKeyword(htmlString, selector, ascendant, EC);
                    } else {
                        await this.insertContribution(htmlString, selector, ascendant);
                    }
                } catch (error) {
                    this.fallbackInsert(htmlString, IMS);
                }
            }

            isReferenceOrKeyword(IMS, EC) {
                return IMS.IsRef || EC.IS_KWD || EC.IS_ABR;
            }

            getSelectionContext(EC, IMS) {
                const selectorClass = this.determineSelector(EC, IMS);
                const selector = IMS.NODE.$.closest(selectorClass);
                const ascendant = this.findAscendant(IMS.NODE, selectorClass);

                return {
                    selector,
                    ascendant,
                    selectorClass
                };
            }

            determineSelector(EC, IMS) {
                if (EC.IS_KWD) return EC.selector[this._state.SELECTORS.KWD];
                if (EC.IS_ABR) return EC.selector[this._state.SELECTORS.ABR];
                return IMS.IsContrib ? this._state.SELECTORS.CONTRIB : this._state.SELECTORS.MIXED_CITATION;
            }

            findAscendant(node, selectorClass) {
                return node.getAscendant((el) => {
                    if (!el || !el.hasAttribute || !el.hasAttribute('class')) {
                        return null;
                    }
                    const className = selectorClass.startsWith('.') ? selectorClass.substring(1) : selectorClass;
                    return el.getAttribute('class').includes(className);
                });
            }

            async insertReferenceOrKeyword(htmlString, selector, ascendant, EC) {
                const appendNode = this.determineAppendNode(ascendant, selector, EC);

                if (appendNode) {
                    var paramsEl = appendNode.$ ? appendNode.$ : appendNode;
                    this.trackManager.getInsNode(paramsEl, {
                        appendOnly: true,
                        appendInsfragString: htmlString.trim()
                    });
                }

            }

            determineAppendNode(ascendant, selector, EC) {
                const shouldUseAscendant = ascendant && (!EC.IS_KWD || !ascendant.$.className.includes('group'));
                return shouldUseAscendant ? ascendant : selector;
            }

            async insertContribution(htmlString, selector, ascendant) {
                // const fragment = document.createRange().createContextualFragment(htmlString);
                // const insEl = this.trackManager.getInsNode();
                // insEl.append(fragment);

                // const targetElement = ascendant || selector;
                // $(targetElement).append(insEl);

                const targetElement = (ascendant && ascendant.$) || selector;
                const safeHtml = htmlString && htmlString.trim();
                let inserted = false;

                if (!safeHtml) {
                    console.warn("insertContribution: Empty or invalid htmlString.");
                    return false;
                }

                try {
                    // ✅ Primary insertion using trackManager
                    this.trackManager.getInsNode(targetElement, {
                        appendOnly: true,
                        appendInsfragString: safeHtml,
                    });
                    inserted = true;
                } catch (error) {
                    console.warn("tryRootInsertion fallback:", error);
                }

                if (!inserted) {
                    try {
                        // ✅ Secondary fallback — manual insertion
                        const insDom =
                            this.trackManager &&
                            this.trackManager.getInsNode &&
                            this.trackManager.getInsNode();

                        const element = CKEDITOR.dom.element.createFromHtml(safeHtml);

                        if (insDom && insDom.append) {
                            $(ascendant.$).append(insDom.append(element.$));
                            inserted = true;
                        } else if (ascendant && ascendant.append) {
                            ascendant.append(element);
                            inserted = true;
                        } else if (selector && selector.append) {
                            // Final DOM-level fallback
                            const fragment = document.createRange().createContextualFragment(safeHtml);
                            selector.append(fragment);
                            inserted = true;
                            console.warn("No valid ascendant found for insertion.");
                        } else {
                            console.warn("insertContribution: No valid insertion target.");
                        }
                    } catch (error) {
                        console.error("All insertContribution fallbacks failed:", error);
                        if (typeof this.fallbackInsert === "function") {
                            this.fallbackInsert(htmlString, IMPACT_SELECTION);
                            inserted = true;
                        }
                    }
                }

                return inserted;
            }

            async handleRegularContent(htmlString, IMS) {
                try {
                    if (applyGlobalHighlightStyle && this.shouldApplyHighlight(IMS)) {
                        // await this.applyHighlightAndInsert(htmlString, IMS);
                    } else {

                        IMS._SNAPSHOT({
                            unlock: true,
                            save: true
                        });
                        const ROOT = I_CONFIG.querySelector('root');

                        if (this.shouldInsertAtRoot(IMS, ROOT)) {
                            const inserted = await this.tryRootInsertion(htmlString, ROOT);
                            if (inserted) return;
                        }

                        // Fallback: normalize and insert at current position
                        // commonMethods.normalizeSelectionToNearestWordBoundary(GlobalEditor);
                        commonMethods.setCollapsedSelection(GlobalEditor);
                        this.handleInsertElement(htmlString);
                    }
                } catch (error) {
                    this.fallbackInsert(htmlString, IMS);
                } finally {
                    IMS._SNAPSHOT({
                        unlock: true,
                        save: true
                    });
                }
            }

            shouldApplyHighlight(IMS) {
                return IMS && IMS.NODE_CLAS !== undefined && ((IMS.SEL_TEXT || "") + "").length > 0;
            }



            getEditor() {
                return this.parent.editor || GlobalEditor;
            }

            createHighlightStyle(attr) {
                return new CKEDITOR.style({
                    element: 'span',
                    attributes: attr
                });
            }

            applyHighlightStyle(editor, attr) {
                try {
                    // Check global flag first
                    if (!applyGlobalHighlightStyle) {
                        return false;
                    }

                    editor = editor || this.getEditor();
                    if (!editor || typeof editor.applyStyle !== "function" || !attr) {
                        return false;
                    }

                    editor.applyStyle(this.createHighlightStyle(attr));
                    return true;
                } catch (error) {
                    console.warn("applyHighlightStyle failed:", error);
                    return false;
                }
            }

            createHighlightAttributes() {
                return {
                    'data-hid': this.parent._current_process_uniqueId,
                    'data-high': this._state.HIGHLIGHT_ATTRS.DATA_HIGH
                };
            }

            handleInsertElement(htmlString) {
                try {
                    if (typeof htmlString !== "string" || !htmlString.trim()) return false;

                    const editor = this.getEditor();
                    if (!editor || typeof editor.insertHtml !== "function") return false;

                    const safeHtml = htmlString.trim();

                    try {
                        const element = CKEDITOR.dom.element.createFromHtml(safeHtml);
                        if (element && typeof editor.insertElement === "function") {
                            editor.insertElement(element);
                            return true;
                        }
                    } catch (innerError) {
                        // Fall through to HTML insertion when CKEditor cannot build a wrapper element.
                    }

                    editor.insertHtml(safeHtml);
                    return true;
                } catch (error) {
                    console.warn("handleInsertElement failed:", error);
                    try {
                        const editor = this.getEditor();
                        if (editor && typeof editor.insertHtml === "function" && typeof htmlString === "string" && htmlString.trim()) {
                            editor.insertHtml(htmlString.trim());
                            return true;
                        }
                    } catch (fallbackError) {
                        console.warn("handleInsertElement fallback failed:", fallbackError);
                    }
                    return false;
                }
            }



            shouldInsertAtRoot(IMS, ROOT) {
                return IMS.NODE_CLAS === ROOT.getAttribute('root-class');
            }

            async tryRootInsertion(htmlString, ROOT) {
                if (!ROOT || !htmlString) return false;

                const subTitle = ROOT.getAttribute("subject-title");
                const title = ROOT.getAttribute("title");

                // Prefer attribute-based lookup instead of comma selector
                let rootEl = null;
                if (subTitle) rootEl = GlobalEditor.document.findOne(`${subTitle}`);
                if (!rootEl && title) rootEl = GlobalEditor.document.findOne(`${title}`);

                if (!rootEl) return false;

                try {
                    this.trackManager.getInsNode(rootEl.$, {
                        prependOnly: true,
                        appendInsfragString: htmlString.trim()
                    });
                } catch (error) {
                    console.warn("tryRootInsertion fallback:", error);

                    const insDom =
                        this.trackManager &&
                        this.trackManager.getInsNode &&
                        this.trackManager.getInsNode();

                    const element = CKEDITOR.dom.element.createFromHtml(htmlString.trim());

                    if (insDom && insDom.append) {
                        $(rootEl.$).append(insDom.append(element.$));
                    } else {
                        rootEl.append(element);
                    }
                }

                TOASTER_ALERT("Insert_comment", {
                    type: "info"
                });
                return true;
            }


            fallbackInsert(htmlString, IMS) {
                IMS.NODE.appendHtml(htmlString);
                ErrorLogTrace('Insert_Comment', 'fallbackInsert');
            }

            handleFallbackInsertion(htmlDOM, IMS) {
                IMS.NODE.appendHtml(htmlDOM);
                ErrorLogTrace('Insert_Query', 'POSITION');
            }
            postCloseModule() {
                try {
                    const wasVerifyClose = !!this._wasVerifyClose;
                    const shouldRefreshQc = wasVerifyClose || !!this._refreshQcCommentsQueriesOnClose;
                    this._wasVerifyClose = false;
                    this._refreshQcCommentsQueriesOnClose = false;
                    if (!shouldRefreshQc) return;

                    if (typeof moduleSystem === "undefined" || typeof moduleSystem.getOpenModules !== "function") {
                        return;
                    }

                    const openModulesList = moduleSystem
                        .getOpenModules()
                        .filter((mod) => mod.moduleId && mod.moduleId !== "queryDialog")
                        .map((mod) => mod.moduleId);

                    if (!openModulesList.includes("qualityCheckerDialog")) return;

                    let qc = (typeof window !== "undefined" && window.qualityCheckerDialog) || null;

                    if (!qc && typeof moduleSystem.getModule === "function") {
                        try {
                            const resolved = moduleSystem.getModule("qualityCheckerDialog");
                            qc = resolved && typeof resolved.then === "function" ? null : resolved;
                        } catch (_) {
                            qc = null;
                        }
                    }
                    if (!qc || typeof qc.refreshCommentsQueriesTab !== "function") return;

                    if (qc.Showed === false) return;

                    qc.refreshCommentsQueriesTab();
                } catch (err) {
                    console.warn("postCloseModule: QC comments_queries refresh failed", err);
                }
            }
        }

        return {
            name: "queryDialog",
            // _id:"query-dialog",
            moduleClass: QueryDialogModule,
            type: "onthefly",
            templatePath: "",
            group_name: 'commentQueryGroup',
            sub_group_name: "AddQRY",
            workflow: "editor-comes-first",
            groupOrder: 300,
            commands: [{
                    name: 'ADD_NEW_CMD',
                    label: 'Add Comment',
                    shortcut: "Ctrl + N",
                    icon: '../assets/images/svg/ContextMenu/AddNote.svg',
                    group: 'commentQueryGroup',
                    order: 301,
                    action: "add_comment"
                },
                {
                    name: 'ADD_NEW_QRY',
                    action: 'add_query',
                    label: "Add Query",
                    icon: '../assets/images/svg/ContextMenu/AddNote.svg',
                    order: 302,
                    action: "add_query"
                },
                {
                    name: 'DELETE_QRY',
                    action: 'delete_query',
                    label: "Delete Query",
                    icon: '../assets/images/svg/ContextMenu/DeleteNote.svg',
                    order: 303,
                    action: "delete_query"
                },
                {
                    name: 'EDIT_QRY',
                    action: 'edit_query',
                    label: "Edit Query",
                    icon: '../assets/images/svg/ContextMenu/EditNote.svg',
                    order: 304,
                    action: "edit_query"
                }
            ],
            canShowQuery: null,
            getParams(action, defaultParams = {}) {
                const process = action === "add_comment" ? "comment" : "query";
                return [null, process];
            },
            contextMenuHandler: function(element, selection, elementPath, editor, subItems) {
                debug.log("query-cmd-group");

                var IMS = typeof IMPACT_SELECTION !== "undefined" ? IMPACT_SELECTION : {};
                var selfParent = window.queryModule || {};
                var self = selfParent.dialogModule || {};

                if (typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW) {
                    return {};
                }

                if (typeof IsContextMenu !== "function") {
                    return {};
                }

                var configRoot = (typeof I_CONFIG !== "undefined" && I_CONFIG && typeof I_CONFIG.querySelector === "function") ? I_CONFIG : null;
                var commentQueryGroup = configRoot ? configRoot.querySelector("[name='commentQueryGroup']") : null;
                var referenceGroup = configRoot ? configRoot.querySelector("[name='ReferenceGroup']") : null;
                if (!commentQueryGroup || !referenceGroup) {
                    return {};
                }

                var IMS = typeof IMPACT_SELECTION !== "undefined" ? IMPACT_SELECTION : null;
                if (!IMS || typeof IMS.Ignore_Comment !== "function") {
                    return {};
                }

                var selfParent = window.queryModule || null;
                var self = selfParent && selfParent.dialogModule;
                var isElement = typeof HTMLElement !== "undefined" && self instanceof HTMLElement;
                var hasDialogModule = !!(self && typeof self === "object" && !isElement);

                if (!selfParent || !selfParent._state || !selfParent.config || !selfParent.config.SHOW_CONTEXT_GROUP || !hasDialogModule) {
                    return {};
                }

                if (this.canShowQuery === null) {
                    this.canShowQuery = this._initializeCanShowQuery();
                }

                if (!self.FullyLoaded && typeof self.init === "function") {
                    self.init();
                }

                const ignoreComment = IMS.Ignore_Comment();
                if (ignoreComment) {
                    return {};
                }

                var parentsClassList = typeof IMS.PARENTS_CLAS_LIST === "string" ? IMS.PARENTS_CLAS_LIST : "";
                if (IMS.NODE_TAG !== "IMG" && parentsClassList.indexOf("graphic") === -1) {
                    return this._getContextCommands(this.canShowQuery);
                }

                return {};
            },
            _initializeCanShowQuery: function() {
                if (typeof IsContextMenu !== "function") {
                    return false;
                }

                if (!window.J_CONFIG && typeof I_CONFIG !== "undefined" && I_CONFIG && typeof I_CONFIG.querySelector === "function" && typeof SHORT_II_TITLE !== "undefined") {
                    window.J_CONFIG = I_CONFIG.querySelector('[short="' + SHORT_II_TITLE + '"]') || null;
                }

                if (window.J_CONFIG) {
                    var editorComesFirst = window.J_CONFIG.getAttribute(this.workflow);
                    if (editorComesFirst === "true" && IsContextMenu(this.sub_group_name)) {
                        return true;
                    }
                }

                return false;
            },
            _getContextCommands: function(canShowQuery) {
                if (canShowQuery && USER_INFO.SELECTOR_SHOW_HIDE == "showForED") {
                    return {
                        ADD_NEW_CMD: CKEDITOR.TRISTATE_OFF,
                        ADD_NEW_QRY: CKEDITOR.TRISTATE_OFF
                    };
                } else {
                    return {
                        ADD_NEW_CMD: CKEDITOR.TRISTATE_OFF
                    };
                }
            }
        };
    }