"use strict";
const getSessionIdKey = (docid = DOC_ID) => `xmleditor:sessionid:${String(docid || '').trim()}`;
const getCurrentSessionId = () => sessionStorage.getItem(getSessionIdKey(DOC_ID));
const getDocId = () => {
    const url = window.location.href;
    const docIdMatch = new URL(url).searchParams.get('docid');
    return docIdMatch || window.DOC_ID || globalThis.DOC_ID;
};
const getAppContextPath = () => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts.length ? "/" + parts[0] : "";
};


/**
 * Main module class for paragraph locking and synchronization.
 * https://claude.ai/public/artifacts/8c881936-6963-4bf3-b167-d6c61bbb1796
 */
class CollaborativeModule {
    constructor(name, subfolder) {
        // this.editor = editor;
        this.config = this._initializeConfig();
        this.state = this._initializeState();
        this.apiService = new FetchService();
        this._history = {};
        this._isEnabled = true;
        this._isDisabled = false;
        this._lastLockIdResponse = {};
        this._broadcastChannel = null;
        this._socketTransport = null;
        this._transportEnabled = false;
        this._statusOnly = false;
        this._runtimeInitialized = false;
        this._runtimeActive = false;
        this._runtimePaused = false;
        this._eventListenersAttached = false;
        this._beforeUnloadAttached = false;
        this._cleanupInterval = null;
        this._broadcastChannelName = "";
        this._socketUrl = "";
        this._pendingReplacementKeys = {};
        this._statusDialogBoundPanel = null;
        this._statusDialogClickHandler = null;
        this._bindMethods();
    }

    /**
     * Initialize plugin configuration
     */
    _initializeConfig() {
        const cfg = this.config || {};
        this.currentUser = cfg.username || USER_INFO.MAIL_ID;
        return {
            ENDPOINT: `${API_PATH}findupdatewithpush`,
            USERNAME: cfg.username || USER_INFO.MAIL_ID,
            ROLE: cfg.role || USER_INFO.ROLE_NAME,
            DEBOUNCE_MS: cfg.debounceMs || 250,
            CURSOR_LOCK_DELAY_MS: cfg.cursorLockDelayMs || 0,
            INTERVAL_MS: 900,
            PRESENCE_INTERVAL_MS: cfg.presenceIntervalMs || 25000,
            TABLE_NAME: 'ParaLockSync',
            STORAGE_KEY: `paraLockSync_history_${getDocId()}_${USER_INFO.MAIL_ID}`,
            MAX_HISTORY_SIZE: 1000

        };
    }

    /**
     * Initialize plugin state
     */
    _initializeState() {
        return {
            lastParaIds: [],
            lastParaSnapshotHtml: [],
            dirtyMap: Object.create(null),
            lockParaId: [],
            lastSync: null,
            lastSyncSentAt: null,
            // Track active users in document.
            activeUsers: [],
            // Session cleanup timeout handle.
            cleanupTimeout: null,
            unsavedChanges: false,
            presenceHeartbeatTimer: null,
            connection: {
                broadcast: "disabled",
                socket: "disabled",
                polling: "active",
                api: "pending",
                workflow: getCollaborationWorkflow().getMode(getDocId()),
                docid: getDocId(),
                broadcastChannel: "",
                socketUrl: ""
            },
            status: {
                users: [],
                locks: [],
                socketLocks: {},
                replacements: [],
                flags: [],
                activity: []
            }
        };
    }

    _getReadEndpoint() {
        return typeof API_GET_FILTER_DOCS !== "undefined" && API_GET_FILTER_DOCS ?
            API_GET_FILTER_DOCS :
            API_GET_DOCS;
    }

    _getReadFilter(processType) {
        switch (processType) {
            case "initialRecord":
                return ["_id", "docid", "rolename", "locks"];
            case "fetchByUniqueId":
                return ["_id", "docid", "rolename", "replacements"];
            case "presenceStatus":
                return ["_id", "docid", "rolename", "locks", "replacements", "presence", "users", "activity"];
            case "get_lock_id":
            case "fetchUpdatedDatabase":
            default:
                return ["_id", "docid", "rolename", "locks", "replacements"];
        }
    }

    _responseHasSyncPayload(response) {
        let data = response && response.data ? response.data : response;
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (error) {
                return false;
            }
        }
        if (Array.isArray(data)) {
            data = data[0];
        }
        return !!(data && typeof data === "object" && (Array.isArray(data.locks) || Array.isArray(data.replacements)));
    }

    /**
     * Initialize the plugin
     */
    async initialize(editor) {
        if (editor) {
            this.editor = editor;
        }

        if (this._runtimeInitialized) {
            return this.startRuntime(this.editor);
        }

        if (!this.editor) {
            setTimeout(() => {
                this.initialize();
            }, 750);
            return;
        }

        try {
            this._statusOnly = false;
            this._isEnabled = true;
            this._isDisabled = false;
            this._checkInitialRecords();
            this.selectionUtils = window._UnifiedSelectionUtils;
            this._attachEventListeners();
            this._setupTransports();
            this._setupBeforeUnload();
            this._initStatusDialog();
            this._setupPresence();
            this._registerCommands();
            // this._resumeEvents(true);
            this._runtimeInitialized = true;
            this._runtimeActive = true;
            // Fire initialization complete event
            if (this.editor) {
                this.editor.fire('paraLockSync:initialized', {
                    historyCount: Object.keys(this._history).length
                });
            }
            this._removeUserLocksFromDOM(true);
            // this._isElementLocked = this.selectionUtils._isElementLocked;

        } catch (error) {
            console.error('Failed to initialize ParaLockSync plugin:', error);
            throw error;
        }
    }

    async initializeStatusOnly(editor) {
        if (editor) {
            this.editor = editor;
        }
        this._statusOnly = true;
        this._isEnabled = false;
        this._isDisabled = false;
        this.state.connection.workflow = getCollaborationWorkflow().getMode(getDocId());
        this.state.connection.docid = getDocId();
        this.state.connection.polling = "inactive";
        this.state.connection.api = "status-only";
        this._initStatusDialog();
        this._registerCommands();
    }

    async startRuntime(editor, options = {}) {
        if (editor) this.editor = editor;
        if (!this.editor && window.GlobalEditor) this.editor = window.GlobalEditor;
        if (!this._runtimeInitialized) {
            return this.initialize(this.editor);
        }

        this._statusOnly = false;
        this._isEnabled = true;
        this._isDisabled = false;
        this._runtimeActive = true;
        this._runtimePaused = false;
        this.state.connection.workflow = getCollaborationWorkflow().getMode(getDocId());
        this.state.connection.docid = getDocId();
        this.state.connection.polling = "active";
        this.state.connection.api = "pending";
        this.selectionUtils = this.selectionUtils || window._UnifiedSelectionUtils;
        this._setupTransports();
        this._setupPresence();
        this._resumeEvents(true);
        this._renderStatusDialog();
        window.paraLock = this;
        window.CollaborativeModule = this;
        return this;
    }

    async stopRuntime(reason = "runtime-switch", options = {}) {
        this._runtimeActive = false;
        this._isEnabled = false;
        this._isDisabled = false;
        this._runtimePaused = true;
        this._eventsPaused = true;
        this._handleLoopTasks("pause");

        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
        }

        if (this.state.presenceHeartbeatTimer) {
            clearInterval(this.state.presenceHeartbeatTimer);
            this.state.presenceHeartbeatTimer = null;
        }

        if (options.release !== false && !this._statusOnly) {
            try {
                this._sendToServer({
                    lock_paraId: ""
                }, "close_session");
                this._sendPresenceToServer("presenceLeave");
                this._notifyChange("release", {
                    paraId: ""
                });
                this._notifyChange("presence_leave", {
                    user: this.currentUser,
                    rolename: this.config.ROLE,
                    sessionId: getCurrentSessionId()
                });
            } catch (error) {
                console.warn("CollaborativeModule stopRuntime cleanup failed:", error);
            }
        }

        this._closeTransports();
        this.state.connection.workflow = getCollaborationWorkflow().getMode(getDocId());
        this.state.connection.polling = "inactive";
        this.state.connection.api = "disabled";
        this._renderStatusDialog();
        return this;
    }

    destroyRuntime(reason = "runtime-destroy") {
        return this.stopRuntime(reason);
    }

    isRuntimeActive() {
        return !!(this._runtimeActive && !this._runtimePaused && this._isEnabled && !this._isDisabled);
    }

    _isCollaborativeModeActive() {
        const workflow = getCollaborationWorkflow();
        return !!(
            workflow &&
            workflow.getMode &&
            workflow.getMode(getDocId()) === workflow.MODES.COLLABORATIVE &&
            this.isRuntimeActive()
        );
    }

    // Inside paraLock module
    _isElementLocked(element, options = {}) {
        try {

            // Step 0: Fallback handling
            if (!element) element = IMPACT_SELECTION.NODE;
            if (!element) return false;

            const alertKey = options.alertKey;
            const evt = options.evt || null;
            const sel = options.sel || null;

            // Step 1: Call selectionUtils’ version
            const isLocked = this.selectionUtils._isElementLocked(element, options);

            // Step 2: If locked and alertType provided, trigger alert
            if (isLocked && alertKey) {
                this.forceAlert(alertKey);
            }
            // Step 3: Return boolean only
            return isLocked;
        } catch (err) {
            console.warn('paraLock._isElementLocked error:', err);
            return false;
        }
    }


    /**
     * Bind methods to maintain correct context
     */
    _bindMethods() {
        this.onSelectionChange = this._debounce(this._handleSelectionChange.bind(this), this.config.DEBOUNCE_MS);
        this._handleKeyEvent = this._handleKeyEvent.bind(this);
        this._handleContentChange = this._handleContentChange.bind(this);
        this._cleanupUserExistingLocks = this._cleanupUserExistingLocks.bind(this);
        this._handleKeyEventfromNative = this._handleKeyEventfromNative.bind(this);
        this._handleRemoteNotice = this._handleRemoteNotice.bind(this);

        // Add pause/resume bindings if needed
        this._pauseEvents = this._pauseEvents.bind(this);
        this._resumeEvents = this._resumeEvents.bind(this);

    }

    _setupTransports() {
        if (!this._isCollaborativeModeActive()) return;
        if (this._transportEnabled) return;
        this._transportEnabled = true;
        this._setupBroadcastChannel();
        this._setupSocketTransport();
    }

    _setupBroadcastChannel() {
        if (typeof BroadcastChannel !== "function") return;

        try {
            this._broadcastChannelName = "collaborativeModule:" + getDocId();
            this.state.connection.broadcastChannel = this._broadcastChannelName;
            this._broadcastChannel = new BroadcastChannel(this._broadcastChannelName);
            this._broadcastChannel.onmessage = this._handleBroadcastMessage.bind(this);
            this.state.connection.broadcast = "connected";
        } catch (error) {
            console.warn("CollaborativeModule BroadcastChannel unavailable:", error);
            this._broadcastChannel = null;
            this.state.connection.broadcast = "error";
        }
    }

    _setupSocketTransport() {

        if (!this._isEnabled || typeof WebSocket !== "function") return;


        let socket = null;
        let reconnectTimer = null;
        let intentionalClose = false;
        const self = this;
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

        function socketUrl() {
            const docId = getDocId();
            const defaultRoot = window.DOMAIN_ROOT;
            // Replace only the protocol part with the computed one
            const socketRoot = defaultRoot.replace(/^https?:/, protocol);
            return `${socketRoot}collaboration?docid=${encodeURIComponent(docId)}`;
        }


        function connect() {
            try {
                intentionalClose = false;
                self._socketUrl = socketUrl();
                self.state.connection.socketUrl = self._socketUrl;
                socket = new WebSocket(self._socketUrl);
                socket.onopen = function() {
                    self.state.connection.socket = "connected";
                    self._renderStatusDialog();
                };
                socket.onmessage = function(event) {
                    try {
                        const message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
                        self._handleRemoteNotice(message);
                    } catch (error) {
                        console.warn("CollaborativeModule socket message ignored:", error);
                    }
                };
                socket.onclose = function() {
                    self.state.connection.socket = "disconnected";
                    self._renderStatusDialog();
                    if (!intentionalClose && self._isEnabled && !self._isDisabled) {
                        reconnectTimer = setTimeout(connect, 2000);
                    }
                };
            } catch (error) {
                console.warn("CollaborativeModule socket unavailable:", error);
                self.state.connection.socket = "error";
            }
        }

        connect();
        this._socketTransport = {
            sendMessage(message) {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify(message));
                }
            },
            close() {
                intentionalClose = true;
                if (reconnectTimer) clearTimeout(reconnectTimer);
                if (socket && socket.readyState === WebSocket.OPEN) socket.close();
            }
        };
    }

    _closeTransports() {
        if (this._broadcastChannel) {
            this._broadcastChannel.close();
            this._broadcastChannel = null;
        }
        if (this._socketTransport && typeof this._socketTransport.close === "function") {
            this._socketTransport.close();
            this._socketTransport = null;
        }
        this._transportEnabled = false;
        this.state.connection.broadcast = "disabled";
        this.state.connection.socket = "disabled";
    }

    _notifyChange(type, refs = {}) {
        if (!this._isCollaborativeModeActive()) return;

        const message = {
            type,
            docid: getDocId(),
            uniqueId: refs.uniqueId || "",
            paraId: refs.paraId || refs.updated_paraId || "",
            user: refs.user || this.currentUser,
            role: refs.role || refs.rolename || this.config.ROLE,
            sessionId: refs.sessionId || getCurrentSessionId(),
            timestamp: refs.timestamp || Date.now()
        };

        if (this._broadcastChannel) {
            this._broadcastChannel.postMessage(message);
        }

        if (this._socketTransport && typeof this._socketTransport.sendMessage === "function") {
            this._socketTransport.sendMessage(message);
        }
    }

    _notifySuccessfulServerWrite(process, data) {
        if (process === "flagUpdate" || process === "get_lock_id" || process === "lastSyncOnly") return;

        const replacements = data && data.replacePush ?
            (Array.isArray(data.replacePush) ? data.replacePush : [data.replacePush]) : [];

        replacements.forEach((replacement) => {
            if (!replacement || !replacement.uniqueId) return;
            this._addActivity({
                type: "replacement",
                user: replacement.user || this.currentUser,
                paraId: replacement.updated_paraId,
                sessionId: replacement.sessionId || getCurrentSessionId(),
                timestamp: replacement.timestamp || Date.now()
            });
            this._notifyChange("replacement", replacement);
        });

        if (data && Object.prototype.hasOwnProperty.call(data, "lock_paraId") && !data.replacePush) {
            const paraIds = this._normalizeParaIds(data.lock_paraId);
            const type = paraIds.length ? "lock" : "release";
            const message = {
                paraId: paraIds.join(",")
            };
            this._addActivity(Object.assign({
                type,
                user: this.currentUser,
                sessionId: getCurrentSessionId(),
                timestamp: Date.now()
            }, message));
            this._notifyChange(type, message);
        }
    }

    _handleRemoteNotice(message) {
        if (!this._isCollaborativeModeActive()) return;
        if (!message || message.docid !== getDocId()) return;
        if (message.sessionId && message.sessionId === getCurrentSessionId()) return;

        if (message.type === "replacement" && message.uniqueId) {
            this._addActivity(message);
            this._fetchByUniqueId(message.uniqueId);
            this._refreshPresenceStatus();
            return;
        }

        if (message.type === "lock" || message.type === "release") {
            this._handleRemoteLockNotice(message);
            this._addActivity(message);
            this._refreshPresenceStatus();
            return;
        }

        if (message.type === "presence_join" || message.type === "presence_leave") {
            this._addActivity(message);
            this._refreshPresenceStatus();
            if (message.type === "presence_join") {
                this._notifyUserJoined(message);
            }
        }
    }

    _handleBroadcastMessage(evt) {
        this._handleRemoteNotice(evt && evt.data);
    }

    _broadcastChange(type, refs) {
        this._notifyChange(type, refs);
    }

    _sendLockNotice(payload = {}, explicitType) {
        if (!this._isCollaborativeModeActive() || !this._canRunCursorLockUpdate()) return;

        const paraIds = this._normalizeParaIds(payload.lock_paraId);
        const type = explicitType || (paraIds.length ? "lock" : "release");
        const message = {
            paraId: paraIds.join(","),
            user: this.currentUser,
            role: this.config.ROLE,
            sessionId: getCurrentSessionId(),
            timestamp: Date.now()
        };

        if (type === "lock") {
            this._upsertSocketLock(message);
        } else {
            this._removeSocketLock(message);
        }

        this._addActivity(Object.assign({
            type
        }, message));
        this._notifyChange(type, message);
    }

    _handleRemoteLockNotice(message = {}) {
        if (message.type === "release") {
            this._removeSocketLock(message);
            this._releaseRemoteLock(message);
            return;
        }

        const lock = {
            user: message.user || "",
            role: message.role || message.rolename || "",
            paraId: message.paraId || "",
            sessionId: message.sessionId || "",
            timestamp: message.timestamp || Date.now()
        };

        this._upsertSocketLock(lock);
        this._applyLocks([lock]);
    }

    _socketLockKey(lock = {}) {
        return lock.sessionId || lock.user || "unknown";
    }

    _upsertSocketLock(lock = {}) {
        const key = this._socketLockKey(lock);
        this.state.status.socketLocks = this.state.status.socketLocks || {};
        this.state.status.socketLocks[key] = Object.assign({}, lock, {
            paraId: this._normalizeParaIds(lock.paraId).join(","),
            source: "socket",
            timestamp: lock.timestamp || Date.now()
        });
        this._syncSocketLocksToStatus();
    }

    _removeSocketLock(lock = {}) {
        const key = this._socketLockKey(lock);
        if (this.state.status.socketLocks && key) {
            delete this.state.status.socketLocks[key];
        }
        this.state.status.locks = (this.state.status.locks || []).filter((item) => {
            return !(item && item.source === "socket" && this._socketLockKey(item) === key);
        });
        this._syncSocketLocksToStatus();
    }

    _syncSocketLocksToStatus(render = true) {
        const socketLocks = Object.values(this.state.status.socketLocks || {});
        const dbLocks = (this.state.status.locks || []).filter((lock) => {
            if (lock && lock.source === "socket") return false;
            const key = this._socketLockKey(lock);
            return !key || !(this.state.status.socketLocks || {})[key];
        });
        this.state.status.locks = dbLocks.concat(socketLocks);
        if (render) this._renderStatusDialog();
    }

    _releaseRemoteLock(message = {}) {
        const user = message.user || "";
        const sessionId = message.sessionId || "";
        const lockedElements = this.getLockedElementsBySelector();

        (lockedElements || []).forEach((element) => {
            const lockedBy = element.getAttribute("data-locked-by");
            const lockSession = element.getAttribute("data-lock-session");
            const sameSession = sessionId && lockSession && lockSession === sessionId;
            const sameUser = user && lockedBy === user;

            if (sameSession || sameUser) {
                this._removeLockFromElement(element);
            }
        });
    }

    _fetchByUniqueId(uniqueId) {
        if (!uniqueId) return;

        const self = this;
        const callbackName = "_collaborativeModuleFetchByUniqueId";
        commonfn[callbackName] = function(response) {
            self._handleServerResponse(response, {
                remoteUniqueId: uniqueId
            });
        };

        commonfn.callajax({
            tbl: this.config.TABLE_NAME,
            process: "fetchByUniqueId",
            username: this.currentUser,
            find: {
                docid: getDocId(),
                "replacements.uniqueId": uniqueId
            },
            filter: this._getReadFilter("fetchByUniqueId")
        }, callbackName, this._getReadEndpoint());
    }

    _initStatusDialog() {
        this.Panel = this._resolveStatusDialogPanel();
        this._bindStatusDialogEvents();
        this._renderStatusDialog();
    }

    _resolveStatusDialogPanel() {
        const panel = document.getElementById("CollaborativeModuleDialog");
        if (panel && panel !== this.Panel) {
            this.Panel = panel;
        }
        return this.Panel;
    }

    _bindStatusDialogEvents() {
        this.Panel = this._resolveStatusDialogPanel();
        if (!this.Panel) return;
        if (this._statusDialogBoundPanel === this.Panel) return;

        if (this._statusDialogBoundPanel && this._statusDialogClickHandler) {
            this._statusDialogBoundPanel.removeEventListener("click", this._statusDialogClickHandler);
        }

        this._statusDialogClickHandler = (evt) => this._handleStatusDialogClick(evt);
        this.Panel.addEventListener("click", this._statusDialogClickHandler);
        this._statusDialogBoundPanel = this.Panel;
    }

    _handleStatusDialogClick(evt) {
        const closeBtn = evt.target && evt.target.closest && evt.target.closest("[data-collab-close]");
        if (closeBtn) {
            if (evt.preventDefault) evt.preventDefault();
            this.closeStatusDialog();
            return;
        }
        const refreshBtn = evt.target && evt.target.closest && evt.target.closest("[data-collab-refresh]");
        if (refreshBtn) {
            if (evt.preventDefault) evt.preventDefault();
            this._refreshPresenceStatus();
            this._renderStatusDialog();
            return;
        }

        const modeBtn = evt.target && evt.target.closest && evt.target.closest("[data-collab-mode-value]");
        if (modeBtn) {
            if (evt.preventDefault) evt.preventDefault();
            const mode = modeBtn.getAttribute("data-collab-mode-value");
            this._setWorkflowMode(mode);
        }
    }

    _setWorkflowMode(mode) {
        const workflow = getCollaborationWorkflow();
        const nextMode = workflow.setMode(mode, getDocId());
        this.state.connection.workflow = nextMode;
        this._renderStatusDialog();

        const messages = {
            off: "Collaboration stopped.",
            legacy: "Legacy paraLockSync started.",
            collaborative: "Collaborative Module connected."
        };

        Promise.resolve(workflow.activateMode ?
            workflow.activateMode(nextMode, {
                editor: this.editor || window.GlobalEditor
            }) : {
                r: 0,
                message: "Runtime switch API unavailable."
            }
        ).then((result) => {
            if (!result || result.r === 0) {
                throw new Error(result && result.message ? result.message : "Runtime switch failed.");
            }
            this.state.connection.workflow = nextMode;
            this._renderStatusDialog();
            const message = messages[nextMode] || ("Collaboration workflow set to " + nextMode + ".");
            if (typeof TOASTER_ALERT === "function") {
                TOASTER_ALERT(message, {
                    type: "info",
                    position: "top-end"
                });
            } else {
                console.log(message);
            }
        }).catch((error) => {
            const message = "Runtime switch failed. Please reload editor.";
            console.error(message, error);
            if (typeof TOASTER_ALERT === "function") {
                TOASTER_ALERT(message, {
                    type: "error",
                    position: "top-end"
                });
            } else {
                console.warn(message);
            }
        });
    }

    showStatusDialog() {
        this.Panel = this._resolveStatusDialogPanel();
        if (!this.Panel) {
            console.warn("CollaborativeModuleDialog not found");
            return false;
        }
        this._bindStatusDialogEvents();
        this.Panel.classList.remove("ds-none");
        if (this.Panel.hasAttribute("style")) this.Panel.removeAttribute("style");
        this._refreshPresenceStatus();
        this._renderStatusDialog();
        return true;
    }

    show() {
        return this.showStatusDialog();
    }

    closeStatusDialog() {
        this.Panel = this._resolveStatusDialogPanel();
        if (this.Panel) {
            this.Panel.classList.add("ds-none");
        }
    }

    _setupPresence() {
        this._sendPresenceToServer("presenceJoin", {}, (response) => {
            this._ingestStatusResponse(response);
            this._notifyChange("presence_join", {
                user: this.currentUser,
                rolename: this.config.ROLE,
                sessionId: getCurrentSessionId()
            });
        });

        if (this.state.presenceHeartbeatTimer) {
            clearInterval(this.state.presenceHeartbeatTimer);
        }

        this.state.presenceHeartbeatTimer = setInterval(() => {
            // this._sendPresenceToServer("presenceHeartbeat");
        }, this.config.PRESENCE_INTERVAL_MS);
    }

    _sendPresenceToServer(process, extra = {}, onSuccess) {
        const callbackName = "_collaborativePresence_" + process + "_" + Date.now();
        const params = {
            tbl: this.config.TABLE_NAME,
            process,
            username: this.currentUser,
            find: {
                docid: getDocId(),
                rolename: this.config.ROLE
            },
            presence: Object.assign({
                docid: getDocId(),
                rolename: this.config.ROLE,
                user: this.currentUser,
                sessionId: getCurrentSessionId(),
                transport: this._getTransportStatusText(),
                timestamp: Date.now()
            }, extra)
        };

        if (process === "getPresenceStatus") {
            params.filter = this._getReadFilter("presenceStatus");
        }

        const endpoint = process === "getPresenceStatus" ? this._getReadEndpoint() : this.config.ENDPOINT;
        const self = this;

        commonfn[callbackName] = function(response) {
            self.state.connection.api = response && response.r === 0 ? "error" : "connected";
            self._ingestStatusResponse(response);
            if (typeof onSuccess === "function" && (!response || response.r !== 0)) {
                onSuccess(response);
            }
            self._renderStatusDialog();
        };

        try {
            commonfn.callajax(params, callbackName, endpoint);
        } catch (error) {
            this.state.connection.api = "error";
            this._renderStatusDialog();
            console.warn("Collaborative presence API failed:", error);
        }
    }

    _refreshPresenceStatus() {
        this._sendPresenceToServer("getPresenceStatus");
    }

    _ingestStatusResponse(response) {
        let data = response && response.data ? response.data : response;
        if (Array.isArray(data)) data = data[0];
        if (!data || typeof data !== "object") return;

        this.state.status.users = Array.isArray(data.users) ? data.users : this.state.status.users;
        this.state.status.locks = Array.isArray(data.locks) ? data.locks : this.state.status.locks;
        this.state.status.replacements = Array.isArray(data.replacements) ? data.replacements : this.state.status.replacements;
        this.state.status.flags = Array.isArray(data.flags) ? data.flags : this.state.status.flags;
        this.state.status.activity = Array.isArray(data.activity) ? data.activity : this.state.status.activity;

        if (data.connection && typeof data.connection === "object") {
            this.state.connection = Object.assign({}, this.state.connection, data.connection);
        }
        this._syncSocketLocksToStatus(false);
    }

    _addActivity(message) {
        const activity = this.state.status.activity || [];
        activity.unshift({
            type: message.type,
            user: message.user || "",
            paraId: message.paraId || "",
            sessionId: message.sessionId || "",
            timestamp: message.timestamp || Date.now()
        });
        this.state.status.activity = activity.slice(0, 25);
        this._renderStatusDialog();
    }

    _notifyUserJoined(message) {
        const user = message.user || "Another user";
        if (typeof TOASTER_ALERT === "function") {
            TOASTER_ALERT("Collaborator joined: " + user, {
                type: "info",
                position: "top-end"
            });
        } else {
            console.log("Collaborator joined:", user);
        }

        if (window.IS_LOCAL_HOST || window.IS_UAT_DOMAIN) {
            this.showStatusDialog();
        }
    }

    _getTransportStatusText() {
        const parts = [];
        if (this.state.connection.broadcast) parts.push("broadcast:" + this.state.connection.broadcast);
        if (this.state.connection.socket) parts.push("socket:" + this.state.connection.socket);
        if (this.state.connection.polling) parts.push("polling:" + this.state.connection.polling);
        return parts.join(",");
    }

    _getOverallConnectionStatus() {
        if (this.state.connection.api === "error") return "Error";
        if (this.state.connection.broadcast === "connected" || this.state.connection.socket === "connected") return "Connected";
        if (this.state.connection.polling === "active") return "Polling";
        if (this.state.connection.socket === "disabled") return "Socket Disabled";
        return "Disconnected";
    }

    _formatTime(value) {
        const ts = value && value.$numberLong ? Number(value.$numberLong) : Number(value);
        if (!Number.isFinite(ts) || ts <= 0) return "-";
        try {
            return new Date(ts).toLocaleTimeString();
        } catch (error) {
            return "-";
        }
    }

    _escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    _renderStatusDialog() {
        this.Panel = this._resolveStatusDialogPanel();
        if (!this.Panel) return;

        const summary = this.Panel.querySelector("[data-collab-status-summary]");
        const modeEl = this.Panel.querySelector("[data-collab-mode]");
        const usersEl = this.Panel.querySelector("[data-collab-users]");
        const activityEl = this.Panel.querySelector("[data-collab-activity]");
        const debugWrap = this.Panel.querySelector("[data-collab-debug]");
        const dbEl = this.Panel.querySelector("[data-collab-db]");

        const status = this._getOverallConnectionStatus();
        this.state.connection.workflow = getCollaborationWorkflow().getMode(getDocId());
        this.state.connection.docid = getDocId();
        this.state.connection.broadcastChannel = this._broadcastChannelName || this.state.connection.broadcastChannel || ("collaborativeModule:" + getDocId());
        this.state.connection.socketUrl = this._socketUrl || this.state.connection.socketUrl || "";
        if (summary) {
            summary.innerHTML = [
                `<span class="badge badge-info">${this._escapeHtml(status)}</span>`,
                `<span class="ml-2">Workflow: ${this._escapeHtml(this.state.connection.workflow)}</span>`,
                `<span class="ml-2">Doc: ${this._escapeHtml(this.state.connection.docid)}</span>`,
                `<span class="ml-2">Broadcast: ${this._escapeHtml(this.state.connection.broadcast)}</span>`,
                `<span class="ml-2">Socket: ${this._escapeHtml(this.state.connection.socket)}</span>`,
                `<span class="ml-2">API: ${this._escapeHtml(this.state.connection.api)}</span>`,
                `<span class="ml-2">Polling: ${this._escapeHtml(this.state.connection.polling)}</span>`,
                `<div class="mt-1 small text-muted">Channel: ${this._escapeHtml(this.state.connection.broadcastChannel || "-")}</div>`,
                `<div class="small text-muted">Socket URL: ${this._escapeHtml(this.state.connection.socketUrl || "-")}</div>`
            ].join("");
        }

        if (modeEl) {
            const workflow = getCollaborationWorkflow();
            const canShowMode = workflow.isLocalOrUat && workflow.isLocalOrUat();
            modeEl.classList.toggle("ds-none", !canShowMode);
            if (canShowMode) {
                const mode = workflow.getMode(getDocId());
                modeEl.querySelectorAll("[data-collab-mode-value]").forEach((btn) => {
                    const value = btn.getAttribute("data-collab-mode-value");
                    btn.classList.toggle("primary-btn", value === mode);
                    btn.classList.toggle("secondary-btn", value !== mode);
                });
            }
        }

        if (usersEl) {
            const locksBySession = {};
            (this.state.status.locks || []).forEach((lock) => {
                const key = lock.sessionId || lock.session_id || lock.user || "";
                locksBySession[key] = this._normalizeParaIds(lock.paraId).join(", ");
            });

            const users = this.state.status.users || [];
            usersEl.innerHTML = users.length ? users.map((user) => {
                const key = user.sessionId || user.session_id || user.user || "";
                return `<div class="border rounded p-2 mb-2">
                    <div><strong>${this._escapeHtml(user.user)}</strong></div>
                    <div>Role: ${this._escapeHtml(user.rolename || user.role || "-")}</div>
                    <div>Session: ${this._escapeHtml(key)}</div>
                    <div>Last seen: ${this._escapeHtml(this._formatTime(user.lastSeen || user.last_seen))}</div>
                    <div>Locks: ${this._escapeHtml(locksBySession[key] || "-")}</div>
                    </div>`;
            }).join("") : `<div class="text-muted">No active collaborators found.</div>`;
        }

        if (activityEl) {
            const activity = this.state.status.activity || [];
            activityEl.innerHTML = activity.length ? activity.map((item) => {
                return `<div class="border-bottom py-1">
                    <strong>${this._escapeHtml(item.type || "event")}</strong>
                    <span>${this._escapeHtml(item.user || "")}</span>
                    <span>${this._escapeHtml(item.paraId || "")}</span>
                    <small class="text-muted">${this._escapeHtml(this._formatTime(item.timestamp || item.created_at))}</small>
                    </div>`;
            }).join("") : `<div class="text-muted">No recent collaboration activity.</div>`;
        }

        if (debugWrap && dbEl) {
            const canShowDebug = !!(window.IS_LOCAL_HOST || window.IS_UAT_DOMAIN);
            debugWrap.classList.toggle("ds-none", !canShowDebug);
            if (canShowDebug) {
                dbEl.textContent = JSON.stringify({
                    connection: this.state.connection,
                    users: this.state.status.users,
                    locks: this.state.status.locks,
                    replacements: (this.state.status.replacements || []).map((item) => ({
                        uniqueId: item.uniqueId,
                        user: item.user,
                        paraId: item.updated_paraId || item.para_id,
                        status: item.status,
                        sessionId: item.sessionId
                    })),
                    flags: this.state.status.flags,
                    activity: this.state.status.activity
                }, null, 2);
            }
        }
    }

    // Common function for interval tasks
    _handleLoopTasks(evt = "resume") {
        if (evt !== "resume" && this.LoopInterval) {
            clearInterval(this.LoopInterval);
            this.LoopInterval = null;
        } else if (evt === "resume" && !this.LoopInterval) {
            this.LoopInterval = setInterval(() => {
                this.onSelectionChange({}, "lockonly");
            }, this.config.INTERVAL_MS);
        }
    }

    _pauseEvents(init = false) {
        if (!this._eventsPaused || init) {
            this._eventsPaused = true;
            console.debug("Editor events paused");
            this._handleLoopTasks("pause");
        }
    }

    _resumeEvents(init = false) {
        if (this._eventsPaused || init) {
            this._eventsPaused = false;
            console.debug("Editor events resumed");
            this._handleLoopTasks("resume");
        }
    }

    _canRunCursorLockUpdate() {
        return !!(this._isEnabled && !this._isDisabled && !this._runtimePaused);
    }

    _queueCursorLockUpdate(evt) {
        if (!this._canRunCursorLockUpdate()) return;
        setTimeout(() => {
            if (this._canRunCursorLockUpdate()) this.onSelectionChange(evt || {}, "lockonly");
        }, this.config.CURSOR_LOCK_DELAY_MS);
    }

    _bindEditableCursorEvents() {
        if (this._cursorEventsAttached || !this.editor || typeof this.editor.editable !== "function") return;

        const editable = this.editor.editable();
        if (!editable || typeof editable.attachListener !== "function") return;

        this._cursorEventsAttached = true;
        const queueCursorLockUpdate = evt => this._queueCursorLockUpdate(evt);
        editable.attachListener(editable, "mouseup", queueCursorLockUpdate);
        editable.attachListener(editable, "keyup", queueCursorLockUpdate);
        editable.attachListener(editable, "click", queueCursorLockUpdate);
    }

    _getCurrentUserLock(record) {
        const locks = record && Array.isArray(record.locks) ? record.locks : [];
        const sessionId = getCurrentSessionId();
        return locks.find(lock => {
            if (!lock || lock.user !== this.currentUser) return false;
            return !sessionId || !lock.sessionId || lock.sessionId === sessionId;
        }) || locks.find(lock => lock && lock.user === this.currentUser) || null;
    }

    _setLastSync(value) {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
            this.state.lastSync = parsed;
        }
        return this.state.lastSync;
    }

    _getLastSync() {
        return this.state && this.state.lastSync ? this.state.lastSync : null;
    }

    _createCurrentUserLock(lastSync) {
        const ct = lastSync || Date.now();
        this._setLastSync(ct);
        return {
            paraId: ["000"],
            role: this.config.ROLE,
            user: this.currentUser,
            timestamp: ct,
            sessionId: getCurrentSessionId(),
            lastSync: ct,
            docid: getDocId()
        };
    }

    /**
     * Check and initialize records in the database
     */
    async _checkInitialRecords() {
        try {

            /**
             * Fetch existing records from database
             */
            var records = [];
            var self = this;

            commonfn._createInitialRecord = function(response) {
                if (response.data) {
                    self.state.dbId = response.data[0];
                    debug.log('ParaLockSync initialized:', response);
                }
            };

            commonfn._fetchExistingRecords = function(response) {
                records = response.data;

                if (records.length === 0) {

                    const sendParams = ADD_DEFAULT_KEYS("default", {
                        tbl: self.config.TABLE_NAME,
                        replacements: [],
                        locks: [self._createCurrentUserLock()]
                    }, []);

                    commonfn.callajax(sendParams, '_createInitialRecord', API_UPDATE_INSERT);

                } else {
                    self._handleExistingRecord(records[0]);
                }
            };


            // TODO - LATER - BACK-END - RETURN ONLY ID AND OTHER DETAILS EXCEPT LOCKS|REPLACEMENTS

            commonfn.callajax({
                tbl: self.config.TABLE_NAME,
                process: "initialRecord",
                username: self.currentUser,
                find: {
                    rolename: self.config.ROLE,
                    docid: getDocId(),
                },
                filter: self._getReadFilter("initialRecord")
            }, '_fetchExistingRecords', self._getReadEndpoint());

        } catch (error) {
            console.error('checkInitialRecords() failed:', error);
            throw error;
        }
    }




    /**
     * Handle existing record - add user lock if not present
     */
    async _handleExistingRecord(record) {
        this.state.dbId = record._id;
        const hasUserLock = this._userHasLock(record);

        if (hasUserLock) {
            const userLock = this._getCurrentUserLock(record);
            if (userLock && userLock.lastSync) this._setLastSync(userLock.lastSync);
            console.log('User already has a lock');
            return;
        }
        var oldConcept = true;
        var partialParams = {};
        var endPoint = this.config.ENDPOINT;
        const updateData = {
            tbl: this.config.TABLE_NAME,
            find: {
                "_id": record._id,
                docid: getDocId()
            }
        };
        const ct = Date.now();
        if (oldConcept) {
            record.locks = Array.isArray(record.locks) ? record.locks : [];
            record.locks.push(this._createCurrentUserLock(ct));

            partialParams.update = {
                locks: record.locks
            };

            endPoint = API_FIND_UPDATE_INSERT;
        } else {
            partialParams = {
                push: {
                    "locks": {
                        paraId: ["000"],
                        role: this.config.ROLE,
                        user: this.currentUser,
                        timestamp: ct,
                        sessionId: getSessionId(),
                        docid: getDocId(),
                        lastSync: ct
                    }
                }
            };
            this._setLastSync(ct);
        }

        Object.assign(updateData, partialParams);

        // const response = await this.apiService.makeRequest(endPoint, updateData, { isPayloadLogic: false });



        commonfn.userFirstRecord = function(response) {
            console.log('ParaLockSync updated:', JSON.stringify(response));
        };
        commonfn.callajax(updateData, 'userFirstRecord', endPoint);

    }

    /**
     * Check if user has an existing lock
     */
    _userHasLock(record) {
        return record.locks && record.locks.some(lock => lock.user === USER_INFO.MAIL_ID);
    }


    /**
     * Clean up any paragraphs locked by the current user from previous sessions
     * This should run when the editor is ready to remove stale locks
     */
    async _cleanupUserExistingLocks() {


        if (!this.currentUser) {
            console.warn('Username not available, retrying cleanup in 3s...');
            setTimeout(() => {
                this._cleanupUserExistingLocks();
            }, 3000);
            console.warn('Cannot cleanup locks: username not available after retries');
            return;
        }

        try {
            // console.log('Cleaning up existing locks for user:', this.currentUser);
            // 1. Remove visual lock indicators from DOM elements locked by this user
            this._removeUserLocksFromDOM();

            // 2. Clear the user's lock from the database
            //await this._clearUserLocksFromDatabase();

            console.log('User lock cleanup completed');

        } catch (error) {
            console.error('Failed to cleanup user existing locks:', error);
        }
    }

    /**
     * Remove visual lock indicators from DOM elements locked by current user
     */
    _removeUserLocksFromDOM(init = false) {

        const userLockedElements = init ?
            this.getLockedElementsBySelector() :
            this.getLockedElementsByUser(this.currentUser);


        userLockedElements.forEach(element => {
            console.log('Removing lock from element:', element.getId());
            this._removeLockFromElement(element);
        });

        console.log(`Removed ${userLockedElements.length} DOM locks for user:`, this.currentUser);
        this._isCleanUpDone = true;
    }
    /**
     * Clear user's locks from the database
     */
    async _clearUserLocksFromDatabase() {
        try {
            const clearData = {
                tbl: this.config.TABLE_NAME,
                find: {
                    rolename: this.config.ROLE,
                    docid: getDocId(),
                    "locks.user": this.currentUser
                },
                update: {
                    "locks.$.paraId": "00000000" 
                    // Clear the paragraph ID, effectively releasing the lock
                }
            };

            commonfn._cleanUpResponse = function(response) {
                console.log('Database lock cleanup response', JSON.stringify(response));
            };
            commonfn.callajax(clearData, '_cleanUpResponse', this.config.ENDPOINT);


            // const response = await this.apiService.makeRequest(this.config.ENDPOINT, clearData, {});                
        } catch (error) {
            console.error('Failed to clear user locks from database:', error);

            // Alternative approach: try to remove the lock entry entirely
            try {
                const removeData = {
                    tbl: this.config.TABLE_NAME,
                    find: {
                        rolename: this.config.ROLE,
                        docid: getDocId()
                    },
                    update: {
                        $pull: {
                            locks: {
                                user: this.currentUser
                            }
                        }
                    }
                };

                // const fallbackResponse = await this.apiService.makeRequest(this.config.ENDPOINT, removeData, {});
                // console.log('Fallback lock removal response:', fallbackResponse);
                // return fallbackResponse;

                commonfn._fallBackCleanUpResponse = function(response) {
                    console.log('Fallback lock removal response:', JSON.stringify(response));
                };
                commonfn.callajax(removeData, '_fallBackCleanUpResponse', this.config.ENDPOINT);

            } catch (fallbackError) {
                console.error('Fallback lock removal also failed:', fallbackError);
                throw fallbackError;
            }
        }
    }
    /**
     * Register editor commands
     */
    _registerCommands() {
        if (!this.editor || typeof this.editor.addCommand !== "function") return;

        if (!this._statusOnly) {
            this.editor.addCommand('pushCurrentParagraph', {
                exec: (editor) => this._pushCurrentParagraph(editor)
            });
        }
        this.editor.addCommand('SHOW_COLLAB_STATUS', {
            exec: () => this.showStatusDialog()
        });
    }

    /**
     * Attach event listeners to the editor
     */
    _attachEventListeners() {
        if (this._eventListenersAttached) return;
        this._eventListenersAttached = true;
        this._isCleanUpDone = false;

        // Wrap event handlers with pause/resume check
        this.editor.on('selectionChange', evt => {
            if (this._canRunCursorLockUpdate() && !this._eventsPaused) this.onSelectionChange(evt, "lockonly");
        });

        this.editor.on('change', evt => {
            if (this._isEnabled && !this._eventsPaused) this._handleContentChange(evt);
        });

        this.editor.on('key', evt => {
            if (this._isEnabled && !this._eventsPaused) this._handleKeyEvent(evt);
        });

        this.editor.on('keydown', evt => {
            if (this._isEnabled && !this._eventsPaused) this._handleKeyEvent(evt);
        });

        this.editor.on("contentDom", () => this._bindEditableCursorEvents());
        this._bindEditableCursorEvents();

        // Cleanup old locks on ready
        this.editor.on('instanceReady', () => this._cleanupUserExistingLocks());

        // Pause/resume around setData
        this.editor.on('beforeSetData', () => this._pauseEvents());
        this.editor.on('afterSetData', () => this._resumeEvents());

        // Retry cleanup until done
        this._cleanupInterval = setInterval(() => {
            if (this._isCleanUpDone) {
                clearInterval(this._cleanupInterval);
                this._cleanupInterval = null;
            } else {
                this._cleanupUserExistingLocks();
            }
        }, 500);
    }




    /**
     * Common selection + lock check wrapper
     */
    _getSafeSelection(evt = {}, {
        requireSelection = true
    } = {}) {
        if (!this.selectionUtils) this.selectionUtils = window._UnifiedSelectionUtils;
        const results = this.selectionUtils.getSelectionInfo();
        const {
            hasAnyLockedElements,
            isLockedByOther,
            isLocked,
            selection,
            hasSelection
        } = results;

        // If nothing selected and selection required
        if (requireSelection && !hasSelection) {
            return null;
        }

        // Prevent editing locked stuff
        if (hasAnyLockedElements || isLockedByOther || isLocked) {
            this._cancelEventAndAlert(evt, selection);
            return null;
        }

        return results;
    }


    /**
     * Handle content changes in the editor
     */
    _handleContentChange(evt) {

        const results = this._getSafeSelection(evt);
        if (!results) return;

        const {
            blockIds
        } = results;

        if (blockIds && blockIds.length > 0) {
            blockIds.forEach(id => {
                this.state.dirtyMap[id] = true;
            });
            this.state.unsavedChanges = true;
        }
    }

    _handleContextEvent(startEl, _selection, elementPath) {
        if (!startEl) return false;

        const results = this._getSafeSelection();
        return !!results; 
        // true if safe, false if blocked
    }


    _handleKeyEventfromNative(evt) {
        const results = this._getSafeSelection(evt, {
            requireSelection: false
        });
        if (!results) return false;

        this.state.lockParaId = results.blockIds;
        return true;
    }

    /**
     * Handle key events to prevent editing locked paragraphs
     */
    _handleKeyEvent(evt) {
        const results = this.selectionUtils.getSelectionInfo();
        const {
            hasAnyLockedElements,
            isLockedByOther,
            isLocked,
            selection,
            blockIds,
            hasSelection,
            elementsList,
            outerHtmls
        } = results;

        // Use the new comprehensive lock check            
        if (hasAnyLockedElements || isLockedByOther || isLocked) {
            this._cancelEventAndAlert(evt, selection);
            return false;
        }

        this.state.lockParaId = blockIds;

        return true;
    }

    _handleQueryCommentRelatedUpdates(queryId, queryEl) {

        // Create a new range
        const range = this.editor.createRange();

        const element = queryEl && queryEl.$ ? queryEl : this.editor.document.getById(queryId);

        // Set the range to start just before the element
        range.setStartBefore(element);
        range.collapse(true); 
        // Collapse to start position

        // Get the selection and select the range
        const selection = this.editor.getSelection();
        selection.selectRanges([range]);

        // Focus the editor to ensure cursor is visible
        this.editor.focus();

        this._handleContentChange({});
        setTimeout(() => {
            this._handleSelectionChange({
                "name": 'change',
                queryId: queryId,
                source: 'query_comment_update'
            }, "forceUpdate");
        }, 250);
    }

    /**
     * Handle selection changes with debouncing
     */
    _handleSelectionChange(evt, process = "lockonly") {
        if (!this._canRunCursorLockUpdate()) return;

        const processType = String(process || "lockonly").toLowerCase();
        const results = this._getSafeSelection(evt, {
            requireSelection: processType !== "lockonly"
        });
        if (!results) return;

        const isForceUpdate = evt.source && evt.source == "query_comment_update" || processType == "forceupdate";

        const cursorData = this._resolveCursorBlockData(results);
        if (!cursorData || !cursorData.blockIds || !cursorData.blockIds.length) return;
        const {
            blockIds,
            elementsList,
            outerHtmls
        } = cursorData;

        // ? Avoid re-locking same para

        if (!isForceUpdate && this.state.lastParaIds && !this._idsChanged(blockIds, this.state.lastParaIds)) {
            return null;
        }

        const payload = this._buildPayload(blockIds, elementsList, isForceUpdate); /*  process === "lockonly" ? { lock_paraId: blockIds } :  */

        this.state.lastParaIds = blockIds;
        this.state.lastParaSnapshotHtml = outerHtmls;

        // ? Initialize dirty state
        blockIds.forEach(function(id) {
            this.state.dirtyMap[id] = this.state.dirtyMap[id] || false;
        }, this);

        if (payload.replacePush) {
            this._sendLockNotice({
                lock_paraId: blockIds
            });
            this._sendToServer(payload, "replacementOnly");
            return;
        }

        this._sendLockNotice(payload);
    }

    _resolveCursorBlockData(results) {
        if (results && Array.isArray(results.blockIds) && results.blockIds.length) {
            return results;
        }

        try {
            const selection = this.editor && this.editor.getSelection ? this.editor.getSelection() : null;
            let element = selection && selection.getStartElement ? selection.getStartElement() : null;
            while (element && element.$) {
                const id = element.getId && element.getId();
                const name = element.getName ? String(element.getName()).toLowerCase() : "";
                if (id && !/^(span|b|i|u|strong|em|a|sup|sub)$/.test(name)) {
                    return {
                        blockIds: [id],
                        elementsList: [element],
                        outerHtmls: [this._getOuterHtml(element)]
                    };
                }
                element = element.getParent ? element.getParent() : null;
            }
        } catch (error) {
            console.warn("Unable to resolve cursor paragraph for lock update:", error);
        }

        return null;
    }

    forceAlert(alertKey) {
        alertKey = alertKey || 'ErrorLockedParaEdit';

        // Initialize alert counter if not present
        if (typeof this._alert_shown_count !== 'number') this._alert_shown_count = 0;

        if (this._alert_shown_count === 0) {
            AlertNewDialog.fire(alertKey);
            this._alert_shown_count++;
        } else {
            if (AlertNewDialog.state == 0) {
                TOASTER_ALERT(alertKey, {
                    type: 'warning',
                    position: 'top-end'
                });
            }
        }
    }

    /**
     * Cancel editor event and notify user
     */
    _cancelEventAndAlert(evt, selection, alertKey) {
        alertKey = alertKey || 'ErrorLockedParaEdit';

        // Cancel the editor event if present
        if (evt) {
            if (typeof evt.cancel === 'function') evt.cancel();
            if (typeof evt.stop === 'function') evt.stop();
        }

        // Use provided selection or fallback to editor's current selection
        selection = selection || (this.editor && this.editor.getSelection());

        if (!selection) return;

        const selectedText = selection.getSelectedText && selection.getSelectedText();
        if (selectedText && selectedText.length > 0) {
            this.forceAlert(alertKey);
            // Clear selection
            if (typeof selection.removeAllRanges === 'function') {
                selection.removeAllRanges();
            }
        }
    }


    _getOuterHtml(element) {
        if (!element) return "";
        try {
            const cloneEl = element.clone(true, true);

            // Remove 'active' class if present
            if (cloneEl.classList && cloneEl.classList.contains('active')) {
                cloneEl.classList.remove('active');
            }

            return cloneEl && cloneEl.getOuterHtml ? cloneEl.getOuterHtml() : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Compare arrays of IDs
     */
    _idsChanged(oldIds, newIds) {
        const arrOld = this._normalizeParaIds(oldIds);
        const arrNew = this._normalizeParaIds(newIds);
        return arrOld.join(",") !== arrNew.join(",");
    }


    /**
     * Build payload for server communication
     */
    _buildPayload(currIds, currBlocks, forceUpdate = false) {
        const payload = {
            lock_paraId: currIds,
            updated_paraId: {},
            updated_html: {}
        };
        const lastSync = this._getLastSync();
        if (lastSync) payload.lastSync = lastSync;

        // Check if previous paragraph(s) need update
        if (this.state.lastParaIds) {
            const updates = this._getUpdatedParagraphData(forceUpdate);
            if (updates.length) {
                payload.replacePush = updates.map(this._createReplacePush.bind(this));
            }
        }
        console.log("sending locking para id to server", JSON.stringify(currIds));
        return payload;
    }
    /**
     * Get the latest change time from an element or HTML string.
     * If missing, assign a fresh timestamp to the root.
     * @param {HTMLElement|string} input - DOM element or HTML string
     * @param {boolean} deep - if true, scan all descendants
     * @returns {number} latest timestamp
     */
    getLatestChangeTime(input, deep = true) {
        let element;

        if (typeof input === "string") {
            const parser = new DOMParser();
            const doc = parser.parseFromString(input, "text/html");
            element = doc.body.firstElementChild;
        } else {
            element = input;
        }
        if (!element) return null;

        let times = [];

        // Collect root + descendants (depending on deep flag)
        const nodes = deep ? element.querySelectorAll("*") : [];
        [element, ...nodes].forEach(el => {
            const {
                time,
                lastChangeTime
            } = el.dataset;
            if (time) times.push(parseInt(time, 10));
            if (lastChangeTime) times.push(parseInt(lastChangeTime, 10));
        });

        if (times.length === 0) {
            const now = Date.now();
            element.dataset.time = now;
            return now;
        }

        return Math.max(...times);
    }



    /**
     * Get update information for previous paragraph
     */
    _getUpdatedParagraphData(forceUpdate = false) {
        const updates = [];
        const {
            lastParaIds,
            dirtyMap,
            lastParaSnapshotHtml
        } = this.state;

        try {
            (lastParaIds || []).forEach((paraId, i) => {
                const isDirty = !!dirtyMap[paraId] || forceUpdate;
                const prevHtml = (lastParaSnapshotHtml && lastParaSnapshotHtml[i]) || "";

                // Skip root blocks
                if (paraId === "xmlcontentroot" || prevHtml.toLowerCase().startsWith("<body")) {
                    return;
                }

                const currentEl = this.editor.document.getById(paraId);
                const currentHtml = currentEl ? this._getOuterHtml(currentEl) : "";
                if (!currentHtml) return;

                const lastChangeTime = this.getLatestChangeTime(currentEl.$) || (new Date()).getTime();

                if (isDirty) {
                    updates.push({
                        paraId,
                        html: encodeURIComponent(currentHtml),
                        lastChangeTime,
                        sessionId: getCurrentSessionId()
                    });
                }
            });
        } catch (error) {
            console.warn("Error getting previous paragraph updates:", error);
            throw error;
        }

        return updates;
    }

    /**
     * Create a replacement push object for updates
     */
    _getReplacementCacheKey(paraId, html, lastChangeTime) {
        return [
            getDocId(),
            paraId || "",
            lastChangeTime || "",
            String(html || "").length,
            String(html || "").slice(0, 80),
            String(html || "").slice(-80)
        ].join("|");
    }

    _createReplacePush({
        paraId,
        html,
        lastChangeTime
    }) {
        const cacheKey = this._getReplacementCacheKey(paraId, html, lastChangeTime);
        const uniqueId = this._pendingReplacementKeys[cacheKey] || CKEDITOR.tools.getUniqueId();
        this._pendingReplacementKeys[cacheKey] = uniqueId;

        return {
            uniqueId,
            pendingKey: cacheKey,
            user: this.currentUser,
            docid: getDocId(),
            updated_paraId: paraId,
            updated_html: html,
            lastChangeTime,
            timestamp: Date.now(),
            syncFlags: [],
            sessionId: getCurrentSessionId()
        };
    }

    _clearPendingReplacementState(data) {
        const replacements = data && data.replacePush ?
            (Array.isArray(data.replacePush) ? data.replacePush : [data.replacePush]) : [];

        replacements.forEach((replacement) => {
            if (replacement && replacement.pendingKey) {
                delete this._pendingReplacementKeys[replacement.pendingKey];
            }

            const paraId = replacement && replacement.updated_paraId;
            if (paraId && this.state.dirtyMap) {
                this.state.dirtyMap[paraId] = false;
            }
        });
    }

    _stripClientReplacementMeta(replacement) {
        if (!replacement || typeof replacement !== "object") return replacement;
        const clean = Object.assign({}, replacement);
        delete clean.pendingKey;
        return clean;
    }

    _sanitizeReplacementPush(replacePush) {
        if (!replacePush) return replacePush;
        if (Array.isArray(replacePush)) return replacePush.map(this._stripClientReplacementMeta.bind(this));
        return this._stripClientReplacementMeta(replacePush);
    }

    // Enhanced _recordUpdate method to trigger save
    _recordUpdate(update) {
        const wasNewUpdate = !this._history[update.uniqueId];

        if (wasNewUpdate) {
            this._history[update.uniqueId] = {
                user: update.user || this.currentUser,
                docid: update.docid || getDocId(),
                flags: update.flagsPushData || [],
                timestamp: update.timestamp || Date.now()
            };

            // Mark as having unsaved changes
            this.state.unsavedChanges = true;

            // Trigger periodic save if we have many unsaved changes
            const unsavedCount = Object.keys(this._history).filter(key => {
                const entry = this._history[key];
                return !entry.saved;
            }).length;

            if (unsavedCount > 10) {
                // this._saveHistoryToStorage();
            }
        }

        return wasNewUpdate;
    }


    /**
     * Build server parameters based on process type
     */
    _buildServerParams(data, processType = "lockid", getDocs = false) {
        const baseParams = {
            tbl: this.config.TABLE_NAME,
            process: processType,
            username: this.currentUser,
            find: getDocs ? {
                "_id": this.state.dbId,
                docid: getDocId(),
            } : {
                rolename: this.config.ROLE,
                docid: getDocId(),
                "locks.user": this.currentUser
            }

        };

        const params = {
            ...baseParams
        };

        if (getDocs) {
            params.filter = this._getReadFilter(processType);
        }

        switch (processType) {
            case "close_session":
            case "lockid": {
                params.update = {
                    "locks.$.paraId": data.lock_paraId,
                    "locks.$.timestamp": new Date().getTime()
                };
                const lastSync = data.lastSync || this._getLastSync();
                if (lastSync) {
                    params.update["locks.$.lastSync"] = lastSync;
                }
                if (processType === "close_session") {
                    params.update.remark = "logout";
                }

                // data.replacePush may be a single object OR an array
                if (data.replacePush) {
                    const updates = Array.isArray(data.replacePush) ?
                        data.replacePush : [data.replacePush];

                    if (updates.length > 1) {
                        // Multiple updates → array + batch flag
                        params.updateMany = "1";
                        params.push = {
                            replacements: updates
                        };
                    } else if (updates.length === 1) {
                        // Single update → plain object
                        params.push = {
                            replacements: updates[0]
                        };
                    }
                    // If updates is empty → skip pushing
                }
                return params;
            }

            case "replacementOnly": {
                const updates = data.replacePush ?
                    (Array.isArray(data.replacePush) ? data.replacePush : [data.replacePush]) : [];
                const sanitizedUpdates = this._sanitizeReplacementPush(updates);

                params.find = {
                    rolename: this.config.ROLE,
                    docid: getDocId()
                };

                if (sanitizedUpdates.length > 1) {
                    params.updateMany = "1";
                    params.push = {
                        replacements: sanitizedUpdates
                    };
                } else if (sanitizedUpdates.length === 1) {
                    params.push = {
                        replacements: sanitizedUpdates[0]
                    };
                } else {
                    return null;
                }

                return params;
            }

            case "flagUpdate": {
                if (!this._recordUpdate(data)) {
                    return null; 
                    // ignore duplicate update
                }

                if (!data.flagsPushData['sessionId']) {
                    data.flagsPushData['sessionId'] = getCurrentSessionId();
                }

                params.find = {
                    "_id": this.state.dbId,
                    "docid": getDocId(),
                    "replacements.uniqueId": data.uniqueId
                };
                params.update = {
                    /*                       
                    "replacements.$.user" : "sivakumars@newgen.co", 
                    "client" : "LWW"
                    */
                    "replacements.$.status": "active"
                };
                params.push = {
                    "replacements.$.syncFlags": data.flagsPushData
                };

                return params;
            }

            case "lastSyncOnly": {
                params.find = {
                    "_id": this.state.dbId,
                    docid: getDocId(),
                    "locks.user": this.currentUser
                };

                const sessionId = getCurrentSessionId();
                if (sessionId) {
                    params.find["locks.sessionId"] = sessionId;
                }

                params.update = {
                    "locks.$.lastSync": data.lastSync || this._getLastSync()
                };

                if (!params.update["locks.$.lastSync"]) return null;

                return params;
            }

            default:
                // throw new Error("Unknown process type: " + processType);
                return params;
        }
    }

    /**
     * Send data to server
     */
    _sendToServer(data = {}, process = "lockid") {
        if (process === "replacementOnly" && !this._isCollaborativeModeActive()) {
            return Promise.resolve(null);
        }

        if ((!this._isEnabled || this._isDisabled) && process !== "close_session" && process !== "get_lock_id") {
            return Promise.resolve(null);
        }

        const isGetId = process == "get_lock_id";
        const isCloseSession = process == "close_session";
        const endPoint = isGetId ? this._getReadEndpoint() : this.config.ENDPOINT;

        if (isCloseSession) {
            const hasUpdates = this._buildPayload(["000"], [], true);
            data['replacePush'] = hasUpdates['replacePush'];
        }

        const params = this._buildServerParams(data, process, isGetId);
        if (!params) {
            return Promise.resolve(null);
        }
        var self = this;
        commonfn.preValidation = function(response) {
            // Handle close_session immediately
            if (isCloseSession) {
                return response;
            }

            // Handle lockid process with r === 0
            if (response.r === 0 && (process === "lockid" || process === "replacementOnly")) {
                return self._checkInitialRecords();
            }

            // Handle get_lock_id process
            if (isGetId) {

                const normalized = JSON.stringify(response && response.data ? response.data : {});
                const now = Date.now();
                let same = false;

                if (self._lastLockIdResponse !== normalized) {
                    // Response changed — update and handle
                    self._lastLockIdResponse = normalized;
                    self._handleServerResponse(response, data);
                } else {
                    same = true;
                }
                if (self.state && !self.state.lastPrintTime) self.state.lastPrintTime = 0;
                // ? Print if changed OR if 30 seconds passed since last print
                if (!same || (now - self.state.lastPrintTime >= 15000)) {
                    self.state.lastPrintTime = now;

                    const locks = response.data && response.data[0] && response.data[0].locks || [];
                    if (locks.length) {
                        console.table(
                            locks.map(lock => ({
                                ParaID: Array.isArray(lock.paraId) ?
                                    lock.paraId.join(',') : (typeof lock.paraId === 'string' ?
                                        lock.paraId.split(',').join(',') :
                                        '-'),
                                Role: lock.role || '-',
                                User: lock.user || '-'
                            }))
                        );
                    } else {
                        console.log("No locks found in response");
                    }
                }
            } else {
                // Handle other processes
                if (self._responseHasSyncPayload(response)) {
                    self._handleServerResponse(response, data);
                }
                // Return original response after handling
                if (!response || response.r !== 0) {
                    if (process === "replacementOnly") {
                        self._clearPendingReplacementState(data);
                    }
                    self._notifySuccessfulServerWrite(process, data);
                }
            }
        };
        commonfn.callajax(params, 'preValidation', endPoint);
    }

    async _handleServerResponse(response, originalData) {
        try {
            const responseReceivedTime = Date.now();
            let resData = response && response.data ? response.data : response;

            // 🔄 Normalize if response is a JSON string
            if (typeof resData === "string") {
                try {
                    const parsed = JSON.parse(resData);
                    resData = parsed && typeof parsed === "object" ? parsed : {};
                } catch (e) {
                    console.error("❌ Failed to parse server response string:", e);
                    resData = {};
                }
            } else if (typeof resData === "object" && Array.isArray(resData)) {
                resData = resData[0];
            }

            if (typeof resData !== "object" || resData === null) {
                // ✅ Ensure it's always an object
                resData = {};
            }

            // 🔄 Always normalize arrays
            resData.locks = Array.isArray(resData.locks) ? resData.locks : [];
            resData.replacements = Array.isArray(resData.replacements) ? resData.replacements : [];
            resData._responseReceivedTime = responseReceivedTime;

            // If no locks data, fetch from DB (fallback)
            if (!resData.locks.length && resData.id) {

                // const updatedData = await this._fetchUpdatedDatabase(resData.id);
                // this._applyServerUpdates(updatedData, originalData);                   

                const self = this;
                commonfn._fetchUpdatedDatabase = function(response) {
                    const fetched = response && response.data && Array.isArray(response.data) ? response.data[0] : response;
                    if (fetched) fetched._responseReceivedTime = responseReceivedTime;
                    self._applyServerUpdates(fetched, originalData);
                };

                commonfn.callajax({
                    tbl: this.config.TABLE_NAME,
                    process: "fetchUpdatedDatabase",
                    username: this.currentUser,
                    find: {
                        "_id": resData.id,
                        docid: getDocId()
                    },
                    filter: this._getReadFilter("fetchUpdatedDatabase")
                }, '_fetchUpdatedDatabase', this._getReadEndpoint());

            } else {
                this._applyServerUpdates(resData, originalData);
            }

        } catch (error) {
            console.error("Error handling server response:", error);
        }
    }



    /**
     * Apply updates from server (replacements and locks)
     */
    _applyServerUpdates(serverResponse, originalData) {
        if (!serverResponse) return;
        const responseReceivedTime = serverResponse._responseReceivedTime || Date.now();

        // Preserve selection before DOM changes
        const selection = this.editor.getSelection();
        const bookmarks = selection && selection.createBookmarks2 ? selection.createBookmarks2() : null;

        // Apply paragraph replacements
        this._applyReplacements(serverResponse.replacements, responseReceivedTime);

        // Apply locks
        this._applyLocks(serverResponse.locks);

        // Restore selection if no replacements were made
        if (bookmarks && (!serverResponse.replacements || !serverResponse.replacements.length)) {
            try {
                this.editor.getSelection().selectBookmarks(bookmarks);
            } catch (error) {
                console.warn('Failed to restore selection:', error);
            }
        }
    }

    /**
     * Apply paragraph replacements from server
     */
    _applyReplacements(replacements, responseReceivedTime) {
        if (!Array.isArray(replacements)) return;
        let callbackReGen = false;
        replacements.forEach(replacement => {
            if (!replacement || !replacement.updated_paraId || !replacement.updated_html) return;

            // Skip only this exact browser/editor session. Same user in another tab must sync.
            if (replacement.sessionId && replacement.sessionId === getCurrentSessionId()) return;
            if (!replacement.sessionId && replacement.user === this.currentUser) return;

            if (replacement.docid !== getDocId()) return;

            let canUpdate = true;

            // Handle sync flags
            if (Array.isArray(replacement.syncFlags)) {
                const alreadyFlagged = replacement.syncFlags.some(f => f.user === this.currentUser);
                if (alreadyFlagged) {
                    canUpdate = false;
                } else {
                    replacement.flagsPushData = {
                        user: this.currentUser,
                        status: "updated",
                        timestamp: Date.now(),
                        sessionId: getCurrentSessionId()
                    };
                }
            }

            if (!canUpdate) return;

            const {
                updated_html,
                updated_paraId,
                lastChangeTime,
                user
            } = replacement;
            const node = this.editor.document.getById(updated_paraId);
            if (!node) return;

            if (this._isElementLocked(node)) {
                if (node.getAttribute("data-locked-by") == user) {
                    debug.log("force updates by same user");
                } else return debug.log("ignore updates by other users");
            }

            let results = {
                status: "pending"
            };

            const serverTime = lastChangeTime && lastChangeTime.$numberLong ?
                parseInt(lastChangeTime.$numberLong, 10) :
                lastChangeTime;

            const currLastChange = this.getLatestChangeTime(node.$);

            if (currLastChange === serverTime) {
                results.status = "success";
                replacement.flagsPushData.status = "already_updated";
                callbackReGen = false;
            } else {
                results = this._replaceNodeContent(node, decodeURIComponent(updated_html));
            }

            if (results.status === "success") {
                callbackReGen = true;
                this._sendToServer(replacement, "flagUpdate");
                this._afterReplacementProcess(node);
            }
        });
        if (callbackReGen) this._afterReplacementProcess(null, responseReceivedTime);
    }

    /**
     * Replace node content safely, handling cursor position
     */
    _replaceNodeContent(node, newHtml, replacementInfo = null) {
        const selection = this.editor.getSelection();
        let selectionInside = false;
        let markerId = null;

        // Check if current selection is inside the node being replaced
        try {
            if (selection && false) {
                const ranges = selection.getRanges();
                if (ranges && ranges.length) {
                    const ancestor = ranges[0].getCommonAncestor(true, true);
                    selectionInside = ancestor && (
                        ancestor.equals(node) ||
                        ancestor.contains(node) ||
                        node.contains(ancestor)
                    );
                }
            }
        } catch (error) {
            console.warn('Error checking selection:', error);
            throw error;
        }
        var status = "";
        try {
            // Store previous content for potential rollback
            const previousHtml = this._getOuterHtml(node);

            // Create marker to preserve cursor position outside replaced content
            if (selectionInside && false) {
                markerId = 'cursor_marker_' + CKEDITOR.tools.getNextNumber();
                const marker = new CKEDITOR.dom.element('span', this.editor.document);
                marker.setAttribute('id', markerId);
                marker.setStyle('display', 'inline-block');
                marker.setStyle('width', '0');
                marker.setStyle('height', '0');
                // zero-width non-joiner
                marker.setHtml('&zwnj;');
                marker.insertBefore(node);
            }

            // Replace the node content
            const container = new CKEDITOR.dom.element('div', this.editor.document);
            container.setHtml(newHtml);
            const newNode = container.getFirst();
            if (newNode) {
                // Add metadata attributes for tracking
                if (replacementInfo) {
                    newNode.setAttributes({
                        'data-last-modified-by': replacementInfo.user || '',
                        'data-last-modified-at': replacementInfo.timestamp || '',
                        'data-version': replacementInfo.version || '1'
                    });
                }

                this._removeLockFromElement(newNode);

                $(node.$).replaceWith(newNode.$);
                status = "success";

                // Fire custom event for replacement tracking
                if (replacementInfo) {
                    this.editor.fire('paraLockSync:contentReplaced', {
                        paraId: replacementInfo.paraId,
                        user: replacementInfo.user,
                        timestamp: replacementInfo.timestamp,
                        version: replacementInfo.version,
                        previousHtml: previousHtml,
                        newHtml: newHtml
                    });
                }
            }

            // Restore cursor position outside replaced content
            if (markerId && false) {
                const markerEl = this.editor.document.getById(markerId);
                if (markerEl) {
                    const range = this.editor.createRange();
                    range.moveToPosition(markerEl, CKEDITOR.POSITION_AFTER_END);
                    this.editor.getSelection().selectRanges([range]);
                    markerEl.remove();
                }
            }

        } catch (error) {
            status = "fail";
            throw error;
        } finally {
            return {
                status
            };
        }
    }

    isLockValid(dbLock, expiryMin = 20) {
        if (!dbLock || !dbLock.timestamp) return false;
        const rawTimestamp = dbLock.timestamp && dbLock.timestamp.$numberLong ?
            dbLock.timestamp.$numberLong :
            dbLock.timestamp;
        const lockTime = Number(rawTimestamp);
        // convert NumberLong/plain timestamp to JS number
        const ageMin = (Date.now() - lockTime) / 1000 / 60;
        // age in minutes
        return ageMin < expiryMin;
    }


    /**
     * Apply locks from server response
     */
    _applyLocks(locks) {
        if (!Array.isArray(locks)) return;

        const _lock_history = {};
        // track users we've already processed

        locks.forEach(lock => {
            // Skip locks from current user or expired locks
            if (lock.user === this.currentUser || !this.isLockValid(lock)) return;

            // Normalize paraIds (ensure array of strings)
            const paraIds = this._normalizeParaIds(lock.paraId);
            if (paraIds.length === 0) return;

            // Ensure only called once per user per batch
            if (!_lock_history[lock.user]) {
                this._ensureUserHasOnlyOneLock(lock);
                _lock_history[lock.user] = true;
            }

            // Apply lock to each paragraph element
            paraIds.forEach(paraId => {
                const element = this.editor.document.getById(paraId);
                if (!element) return;

                this._applyLockToElement(element, lock);
            });
        });
    }



    /**
     * Apply lock styling and attributes to an element
     */
    _applyLockToElement(element, lock) {
        const {
            user = '', role = '', sessionId = ''
        } = lock;

        if (!element.hasClass('para-locked')) {
            element.addClass('para-locked');
            element.setAttribute('contenteditable', 'false');
        }

        element.setAttributes({
            'data-locked-by': user,
            'data-lock-role': role,
            'data-lock-session': sessionId
        });
    }

    _sendLastSyncOnly(responseReceivedTime) {
        try {
            if (!this._isEnabled || this._isDisabled || this._runtimePaused) return;

            const workflow = getCollaborationWorkflow();
            const activeProvider = workflow && typeof workflow.getActiveProvider === "function" ?
                workflow.getActiveProvider() :
                null;

            if (activeProvider && activeProvider !== this) return;

            const lastSync = this._setLastSync(responseReceivedTime);
            if (!lastSync || this.state.lastSyncSentAt === lastSync) return;
            this.state.lastSyncSentAt = lastSync;
            this._sendToServer({
                lastSync
            }, "lastSyncOnly");
        } catch (error) {
            console.warn("CollaborativeModule lastSyncOnly failed:", error);
        }
    }

    _afterReplacementProcess(el, responseReceivedTime) {
        if (el) {
            if (el && el.find("[data-user-comment-box]").toArray().length > 0) {
                if (window.queryModule && window.queryModule.panelModule) {
                    window.queryModule.panelModule.refresh(true);
                }
            }
            this._sendLastSyncOnly(responseReceivedTime);
            return;
        }

        if (trackDialog && trackDialog.M_FUN && typeof trackDialog.M_FUN.refreshPanel == "function") {
            if (trackDialog.state && trackDialog.state == 1) {
                trackDialog.M_FUN.refreshPanel({
                    ignore_editor_focus: true
                });
            }
        }
        // var baseGlobal = new BaseModule("global");
        // if (baseGlobal) {
        //     baseGlobal.refreshPanelDefault();
        // }
        this._sendLastSyncOnly(responseReceivedTime);
    }

    getLockedElementsByUser(user) {
        return this.editor.document.find(`[data-locked-by="${user}"]`).toArray() || [];
    }

    getLockedElementsBySelector(selector) {
        // ? ,[contenteditable]:not(.cke_editable,.pistart,.delimt,.Citation)
        if (!selector) selector = '.para-locked,[data-locked-by],[data-lock-role]';
        return this.editor.document.find(selector).toArray() || [];
    }

    /**
     * Normalize paraId(s) into an array of strings
     */

    _normalizeParaIds(paraId) {
        if (!paraId) return [];

        if (Array.isArray(paraId)) {
            return paraId.map(id => String(id).trim()).filter(Boolean);
        }

        if (typeof paraId === "string") {
            return paraId.split(",").map(id => id.trim()).filter(Boolean);
        }

        return [String(paraId).trim()];
    }


    /**
     * Ensure a user has only one active lock at a time
     */
    _ensureUserHasOnlyOneLock(currentLock) {
        const lockedElements = this.getLockedElementsByUser(currentLock.user);

        lockedElements.forEach(element => {
            this._removeLockFromElement(element);
        });

    }

    /**
     * Remove lock from an element.
     * @param {CKEDITOR.dom.element} element - The element to unlock.
     * @param {boolean} removeInClone - If true, clone → unlock → replace original.
     * @returns {CKEDITOR.dom.element|null} The unlocked element (clone if replace mode).
     */
    _removeLockFromElement(element, removeInClone = false) {
        if (!element) return null;

        let target = element;

        if (removeInClone) {
            // Deep clone and operate on clone
            target = element.clone(true, true);
        }

        // Apply unlock changes
        target.removeClass('para-locked');
        target.removeAttributes(['data-locked-by', 'data-lock-role', 'data-lock-session', 'contenteditable']);

        return target;
    }



    /**
     * Debounce utility function
     */
    _debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Check if any elements in the document are locked by other users
     * @param {boolean} includeCurrentUser - Include elements locked by current user (default: false)
     * @returns {Object} Information about all locked elements
     */
    getLockedElementsByOthers(includeCurrentUser = false) {
        const currentUser = this.currentUser || this.config.USERNAME;
        const lockedElements = [];

        try {
            // Find all elements with para-locked class
            const allLockedElements = this.getLockedElementsBySelector();

            if (allLockedElements) {
                const elementsArray = allLockedElements ? allLockedElements : [];

                elementsArray.forEach(element => {
                    const lockedBy = element.getAttribute('data-locked-by');
                    const lockRole = element.getAttribute('data-lock-role');
                    const elementId = element.getId ? element.getId() : null;

                    // Filter based on includeCurrentUser parameter
                    if (includeCurrentUser || lockedBy !== currentUser) {
                        lockedElements.push({
                            element: element,
                            lockedBy: lockedBy,
                            lockRole: lockRole,
                            elementId: elementId,
                            isLockedByCurrentUser: lockedBy === currentUser,
                            isLockedByOther: lockedBy !== currentUser
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error finding locked elements:', error);
        }
        let byOthers = lockedElements.filter(el => el.isLockedByOther);
        return {
            total: lockedElements.length,
            elements: lockedElements,
            byOthers: byOthers,
            byCurrentUser: lockedElements.filter(el => el.isLockedByCurrentUser),
            users: [...new Set(lockedElements.map(el => el.lockedBy).filter(Boolean))],
            byOthersEmailList: [...new Set(byOthers.map(el => el.lockedBy).filter(Boolean))]
        };
    }

    _setupBeforeUnload() {
        if (this._beforeUnloadAttached) return;
        this._beforeUnloadAttached = true;
        // Set up beforeunload handler to save history and warn about unsaved changes
        window.addEventListener('beforeunload', (event) => {
            if (!this._isEnabled || this._isDisabled) return;
            console.log('🔄 Saving history before page unload...');

            // Save current history to localStorage
            // this._saveHistoryToStorage();

            // Clean up user locks
            // this._cleanupUserExistingLocks();

            this._sendToServer({
                lock_paraId: ""
            }, "close_session");
            this._sendPresenceToServer("presenceLeave");
            if (this.state.presenceHeartbeatTimer) {
                clearInterval(this.state.presenceHeartbeatTimer);
                this.state.presenceHeartbeatTimer = null;
            }
            this._notifyChange("release", {
                paraId: ""
            });
            this._notifyChange("presence_leave", {
                user: this.currentUser,
                rolename: this.config.ROLE,
                sessionId: getCurrentSessionId()
            });
            this._closeTransports();

            // If there are unsaved changes, show warning
            if (this.state.unsavedChanges || Object.keys(this.state.dirtyMap).some(key => this.state.dirtyMap[key])) {
                const message = 'You have unsaved changes. Are you sure you want to leave?';
                event.preventDefault();
                event.returnValue = message;
                return message;
            }
        });

        /* 
        // Also handle visibility change (tab switching, etc.)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._saveHistoryToStorage();
            }
        });
 
        // Periodic auto-save of history
        setInterval(() => {
            this._saveHistoryToStorage();
        // Save every 30 seconds
        }, 30000);
         
        */
    }
    /*
    _saveHistoryToStorage() {
        try {
            // Clean old entries if history is too large
            const historyKeys = Object.keys(this._history);
            if (historyKeys.length > this.config.MAX_HISTORY_SIZE) {
                // Sort by timestamp and keep only the most recent entries
                const sortedKeys = historyKeys.sort((a, b) => {
                    const timestampA = this._history[a].timestamp || 0;
                    const timestampB = this._history[b].timestamp || 0;
                    return timestampB - timestampA;
                });
 
                const keysToKeep = sortedKeys.slice(0, this.config.MAX_HISTORY_SIZE);
                const cleanedHistory = {};
                keysToKeep.forEach(key => {
                    cleanedHistory[key] = this._history[key];
                });
                this._history = cleanedHistory;
            }
 
            // Save to localStorage
            localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(this._history));
            console.log(`💾 Saved ${Object.keys(this._history).length} history entries to localStorage`);
 
            // Reset unsaved changes flag
            this.state.unsavedChanges = false;
 
        } catch (error) {
            console.error('❌ Failed to save history to localStorage:', error);
 
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                console.warn('⚠️ localStorage quota exceeded, clearing old history...');
                this._clearOldHistory();
                // Try saving again with reduced history
                try {
                    localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(this._history));
                } catch (retryError) {
                    console.error('❌ Failed to save even after clearing old history:', retryError);
                }
            }
            throw error;
        }
    }
 
    _clearOldHistory() {
        const historyKeys = Object.keys(this._history);
        // 24 hours ago
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
 
        // Remove entries older than 24 hours
        historyKeys.forEach(key => {
            const entry = this._history[key];
            if (entry.timestamp && entry.timestamp < cutoffTime) {
                delete this._history[key];
            }
        });
 
        // If still too large, keep only the most recent 500 entries
        const remainingKeys = Object.keys(this._history);
        if (remainingKeys.length > 500) {
            const sortedKeys = remainingKeys.sort((a, b) => {
                return (this._history[b].timestamp || 0) - (this._history[a].timestamp || 0);
            });
 
            const keysToKeep = sortedKeys.slice(0, 500);
            const cleanedHistory = {};
            keysToKeep.forEach(key => {
                cleanedHistory[key] = this._history[key];
            });
            this._history = cleanedHistory;
        }
    }
    _loadHistoryFromStorage() {
        try {
            const storedHistory = localStorage.getItem(this.config.STORAGE_KEY);
            if (storedHistory) {
                const parsedHistory = JSON.parse(storedHistory);
 
                // Validate and merge stored history
                if (parsedHistory && typeof parsedHistory === 'object') {
                    this._history = { ...this._history, ...parsedHistory };
                    console.log(`📚 Loaded ${Object.keys(parsedHistory).length} history entries from localStorage`);
 
                    // Emit event for history loaded
                    if (this.editor) {
                        this.editor.fire('paraLockSync:historyLoaded', {
                            count: Object.keys(parsedHistory).length,
                            history: parsedHistory
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to load history from localStorage:', error);
            // Clear corrupted data
            localStorage.removeItem(this.config.STORAGE_KEY);
            throw error;
        }
    }
    // Method to get pending updates statistics
    getPendingUpdatesStats() {
        const pendingKeys = Object.keys(this._history).filter(key => this._history[key].pending);
        return {
            total: pendingKeys.length,
            withRetries: pendingKeys.filter(key => this._history[key].attempts > 0).length,
            failed: pendingKeys.filter(key => this._history[key].attempts >= 3).length
        };
    }
    // Method to manually clear history (useful for cleanup)
    clearHistory() {
        this._history = {};
        localStorage.removeItem(this.config.STORAGE_KEY);
        console.log('🗑️ History cleared');
 
        if (this.editor) {
            this.editor.fire('paraLockSync:historyCleared');
        }
    }
 
    // Method to manually clear only completed entries
    clearCompletedHistory() {
        const pendingHistory = {};
        Object.keys(this._history).forEach(key => {
            if (this._history[key].pending) {
                pendingHistory[key] = this._history[key];
            }
        });
 
        this._history = pendingHistory;
        this._saveHistoryToStorage();
        console.log('🗑️ Completed history entries cleared, pending entries retained');
    }
    */
}


export default CollaborativeModule;
