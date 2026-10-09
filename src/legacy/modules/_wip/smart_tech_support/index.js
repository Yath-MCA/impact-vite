/*jslint white:true, for:true */
/*global window, BaseModule, DOC_ID, USER_INFO, GET_JSON */

class SmartTechSupportModule extends BaseModule {
    constructor(name = "SmartTechSupport", subFolder = "smart_tech_support", options = {}) {
        super(name, subFolder, options);
        this._id = "SmartTechSupportDialog";
        this.socket = null;
        this.handlers = [];
        this.messages = [];
        this.activeUsers = {};
        this.selectedConversationId = "";
        this.viewConversationId = "";
        this.selectedUser = "";
        this.selectedSessionId = "";
        this.storageTbl = "SmartSyncMessages";
        this.isHistoryOpen = true;
        this._bindModuleMethods();
    }

    _bindModuleMethods() {
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== "constructor" && typeof this[key] === "function") this[key] = this[key].bind(this);
        });
    }

    initLoop() {
        this.FullyLoaded = true;
        this.initializeSmartSyncSocket();
    }

    initialize(options = {}) {
        this.initializeSmartSyncSocket(options);
        return this;
    }

    postInitializeModule() {
        window.SmartTechSupport = this;
    }

    showLoop() {
        this._cacheElements();
        this._bindEvents();
        this.toggleHistoryPanel(true);
        this.initializeSmartSyncSocket();
        this._announceDialogOpen();
        this.fetchHistory();
        this._render();
    }

    closeDialog() {
        this._announceDialogClose();
        super.closeDialog();
    }

    open(options = {}) {
        this.initializeSmartSyncSocket(options);
        this.show();
        return true;
    }

    openConversation(options = {}) {
        const conversationOptions = this._normalizeConversationOptions(options);
        this.selectedConversationId = conversationOptions.conversationId;
        this.viewConversationId = conversationOptions.conversationId;
        this.selectedUser = conversationOptions.user;
        this.selectedSessionId = conversationOptions.sessionId;
        this.messages = [];
        return this.open(conversationOptions);
    }

    initializeSmartSyncSocket(options = {}) {
        const docid = options.docid || window.DOC_ID || "";
        if (!docid || !window.SmartSyncSocket) return this;
        const conversationOptions = this._normalizeConversationOptions(options);
        this.selectedUser = conversationOptions.user;
        this.selectedSessionId = conversationOptions.sessionId;
        this.selectedConversationId = conversationOptions.conversationId;
        this.viewConversationId = this.viewConversationId || conversationOptions.conversationId;
        if (!this.socket) {
            this.socket = window.SmartSyncSocket.getInstance(docid, {
                user: this._currentUser(),
                role: options.role || this._currentRole(),
                sessionId: options.sessionId || this.selectedSessionId
            }).start();
            this.socket.subscribe("smartTechSupport", this._handleMessage);
        }
        return this;
    }

    sendMessage(text, attachments = [], extra = {}) {
        if (!this.socket) this.initializeSmartSyncSocket(extra);
        const cleanText = String(text || "").trim();
        if (!cleanText && (!attachments || attachments.length === 0)) return null;
        const record = this._buildMessageRecord(extra.type || "support_message", {
            text: cleanText,
            attachments: this._metadataOnlyAttachments(attachments),
            source: extra.source || "user",
            status: extra.status || "open",
            conversationId: extra.conversationId || this.selectedConversationId || this._defaultConversationId(),
            targetUser: extra.targetUser || "",
            sessionId: extra.sessionId || this.selectedSessionId || this._sessionId(),
            client: extra.client || this._client()
        });
        this.messages.push(record);
        this.viewConversationId = record.conversationId;
        this._render();
        this._persistMessage(record);
        return this._send(record.type, {
            messageId: record.messageId,
            conversationId: record.conversationId,
            payload: {
                record: record
            }
        });
    }

    sendResponse(text, targetUser = "", extra = {}) {
        return this.sendMessage(text, extra.attachments || [], Object.assign({}, extra, {
            type: "support_response",
            source: "developer",
            targetUser: targetUser,
            status: "replied"
        }));
    }

    fetchHistory(options = {}) {
        if (!this._canCallDb(window.API_GET_DOCS)) {
            this._setHistoryStatus("History API unavailable.");
            return false;
        }
        const payload = this._buildDbPayload({
            find: {
                docid: this._docid(),
                scope: "smartTechSupport"
            },
            length: options.length || 500
        });
        window.commonfn.callajax(payload, "smartTechSupportHistoryLoaded", window.API_GET_DOCS, this);
        return true;
    }

    smartTechSupportHistoryLoaded(response) {
        const records = this._normalizeRecords(response);
        records.forEach(record => this._upsertMessage(record));
        this._setHistoryStatus(`${this.messages.length} message(s) loaded.`);
        this._render();
    }

    onMessage(handler) {
        if (typeof handler === "function") this.handlers.push(handler);
        return () => {
            this.handlers = this.handlers.filter(item => item !== handler);
        };
    }

    _handleMessage(message) {
        if (!message || message.scope !== "smartTechSupport") return;
        if (message.type === "support_dialog_open") this._setActiveUser(message, true);
        if (message.type === "support_dialog_close") this._setActiveUser(message, false);
        if (message.type === "support_message" || message.type === "support_response" || message.type === "ai_escalate_to_support") {
            const record = (message.payload && message.payload.record) || message.payload || {};
            if (!record.conversationId || record.conversationId === this.selectedConversationId) {
                this._upsertMessage(record);
                this._notify(message.type, message.user);
            }
        }
        this.handlers.slice().forEach(handler => handler(message));
        this._render();
    }

    _announceDialogOpen() {
        this._send("support_dialog_open", {
            payload: {
                dialogOpen: true,
                user: this._currentUser(),
                conversationId: this.selectedConversationId,
                sessionId: this.selectedSessionId || this._sessionId()
            }
        });
    }

    _announceDialogClose() {
        this._send("support_dialog_close", {
            payload: {
                dialogOpen: false,
                user: this._currentUser(),
                conversationId: this.selectedConversationId,
                sessionId: this.selectedSessionId || this._sessionId()
            }
        });
    }

    _send(type, extra = {}) {
        if (!this.socket) return null;
        return this.socket.send(Object.assign({
            scope: "smartTechSupport",
            type: type
        }, extra));
    }

    _persistMessage(record) {
        if (!this._canCallDb(window.API_UPDATE_INSERT)) return false;
        const payload = this._buildDbPayload({
            find: {
                docid: record.docid,
                scope: record.scope,
                messageId: record.messageId
            },
            update: Object.assign({}, record, {
                updatedAt: Date.now()
            }),
            upsert: true
        });
        window.commonfn.callajax(payload, "smartTechSupportMessageSaved", window.API_UPDATE_INSERT, this);
        return true;
    }

    smartTechSupportMessageSaved() {
        this._setHistoryStatus("Message saved.");
    }

    _buildMessageRecord(type, data = {}) {
        const now = Date.now();
        return {
            tbl: this.storageTbl,
            recordtype: "smart_support_message",
            docid: this._docid(),
            client: data.client || this._client(),
            sessionId: data.sessionId || this.selectedSessionId || this._sessionId(),
            scope: "smartTechSupport",
            type: type,
            conversationId: data.conversationId || this._defaultConversationId(),
            messageId: data.messageId || this._messageId(type),
            fromUser: this._currentUser(),
            fromRole: this._currentRole(),
            targetUser: data.targetUser || "",
            text: data.text || "",
            attachments: data.attachments || [],
            status: data.status || "open",
            source: data.source || "user",
            createdAt: now,
            updatedAt: now
        };
    }

    _buildDbPayload(extra = {}) {
        const base = typeof GET_JSON === "function" ? GET_JSON("default") : {};
        return Object.assign({}, base, {
            tbl: this.storageTbl,
            recordtype: "smart_support_message"
        }, extra);
    }

    _normalizeRecords(response) {
        if (!response) return [];
        if (Array.isArray(response)) return response;
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response.result)) return response.result;
        if (Array.isArray(response.docs)) return response.docs;
        if (response.data && Array.isArray(response.data.docs)) return response.data.docs;
        return response.messageId ? [response] : [];
    }

    _upsertMessage(record) {
        if (!record || !record.messageId) return;
        const index = this.messages.findIndex(item => item.messageId === record.messageId);
        if (index >= 0) this.messages[index] = Object.assign({}, this.messages[index], record);
        else this.messages.push(record);
        this.messages.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    _setActiveUser(message, isOpen) {
        const user = message.user || (message.payload && message.payload.user) || "";
        if (!user) return;
        if (isOpen) this.activeUsers[user] = {
            user: user,
            role: message.role || "",
            lastSeen: Date.now()
        };
        else delete this.activeUsers[user];
    }

    _cacheElements() {
        this.Panel = this.Panel || document.getElementById(this._id);
        if (!this.Panel) return;
        this.elements.Thread = this.Panel.querySelector("#smart_support_thread");
        this.elements.CurrentThread = this.Panel.querySelector("#smart_support_thread");
        this.elements.HistoryChats = this.Panel.querySelector("#smart_support_history_chats");
        this.elements.Message = this.Panel.querySelector("#smart_support_message");
        this.elements.AttachButton = this.Panel.querySelector("#smart_support_attach_btn");
        this.elements.Attach = this.Panel.querySelector("#smart_support_attachment");
        this.elements.AttachList = this.Panel.querySelector("#smart_support_attachment_list");
        this.elements.Send = this.Panel.querySelector("#smart_support_send");
        this.elements.Close = this.Panel.querySelector("#smart_support_close");
        this.elements.HistoryStatus = this.Panel.querySelector("#smart_support_history_status");
        this.elements.HistoryToggle = this.Panel.querySelector("#smart_support_history_toggle");
        this.elements.HistoryCol = this.Panel.querySelector(".support-history-col");
        this.elements.NewCol = this.Panel.querySelector(".support-new-col");
    }

    _bindEvents() {
        if (this.elements.Send) this.elements.Send.onclick = () => this._sendFromComposer();
        if (this.elements.Close) this.elements.Close.onclick = this.closeDialog;
        if (this.elements.HistoryToggle) this.elements.HistoryToggle.onclick = () => this.toggleHistoryPanel();
        if (this.elements.AttachButton) this.elements.AttachButton.onclick = () => {
            if (this.elements.Attach) this.elements.Attach.click();
        };
        if (this.elements.Attach) this.elements.Attach.onchange = this._renderAttachmentList;
    }

    toggleHistoryPanel(force) {
        this._cacheElements();
        if (!this.elements.HistoryCol || !this.elements.NewCol) return this.isHistoryOpen;
        this.isHistoryOpen = typeof force === "boolean" ? force : !this.isHistoryOpen;
        this.elements.HistoryCol.classList.toggle("ds-none", !this.isHistoryOpen);
        this.elements.HistoryCol.classList.toggle("d-none", !this.isHistoryOpen);
        this.elements.NewCol.classList.toggle("col-md-8", this.isHistoryOpen);
        this.elements.NewCol.classList.toggle("col-md-12", !this.isHistoryOpen);
        if (this.elements.HistoryToggle) {
            this.elements.HistoryToggle.setAttribute("aria-expanded", this.isHistoryOpen ? "true" : "false");
            this.elements.HistoryToggle.setAttribute("title", this.isHistoryOpen ? "Hide history" : "Show history");
        }
        return this.isHistoryOpen;
    }

    _sendFromComposer() {
        const text = this.elements.Message ? this.elements.Message.value : "";
        const attachments = this.elements.Attach && this.elements.Attach.files ? Array.from(this.elements.Attach.files) : [];
        const targetUser = this.selectedUser && this.selectedUser !== this._currentUser() ? this.selectedUser : "";
        const method = this._isDeveloper() ? this.sendResponse : this.sendMessage;
        this.viewConversationId = this.selectedConversationId || this._defaultConversationId();
        method(text, targetUser, {
            attachments: attachments
        });
        if (this.elements.Message) this.elements.Message.value = "";
        if (this.elements.Attach) this.elements.Attach.value = "";
        this._renderAttachmentList();
    }

    _render() {
        this._cacheElements();
        this._renderHistoryChats();
        this._renderCurrentConversation();
    }

    _renderHistoryChats() {
        if (!this.elements.HistoryChats) return;
        const conversations = this._previousConversations();
        this.elements.HistoryChats.innerHTML = conversations.length ? conversations.map(item => {
            const activeClass = item.conversationId === this.viewConversationId ? " active" : "";
            return `<button type="button" class="btn btn-sm btn-block text-left secondary-btn mb-1 smart-support-history-chat${activeClass}" data-conversation-id="${this._escape(item.conversationId)}"><strong>${this._escape(item.user || "Support chat")}</strong><br><span class="text-muted">${this._escape(item.time)} ${this._escape(item.preview)}</span></button>`;
        }).join("") : "<span class=\"text-muted\">No previous session chats.</span>";
        Array.from(this.elements.HistoryChats.querySelectorAll(".smart-support-history-chat")).forEach(button => {
            button.onclick = () => {
                this.viewConversationId = button.getAttribute("data-conversation-id") || this.selectedConversationId;
                this._render();
            };
        });
    }

    _renderCurrentConversation() {
        const thread = this.elements.CurrentThread || this.elements.Thread;
        if (!thread) return;
        const conversationId = this.viewConversationId || this.selectedConversationId || this._defaultConversationId();
        const currentMessages = this.messages.filter(item => !item.conversationId || item.conversationId === conversationId)
            .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        thread.innerHTML = currentMessages.length ? currentMessages.map(item => this._messageHtml(item)).join("") : "<span class=\"text-muted\">No support messages yet.</span>";
        thread.scrollTop = thread.scrollHeight;
    }

    _messageHtml(item) {
        const time = item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        }) : "";
        const files = (item.attachments || []).map(file => this._escape(file.name || file.fileSn || "")).filter(Boolean).join(", ");
        const isSelf = (item.fromUser || item.user || "") === this._currentUser();
        return `<div class="smart-support-message-row${isSelf ? " is-self" : ""}"><div class="smart-support-message-bubble"><div>${this._escape(item.text || "")}</div>${files ? `<div class="smart-support-message-attachments">Attachments: ${files}</div>` : ""}<div class="smart-support-message-time">${this._escape(time)}</div></div></div>`;
    }

    _previousConversations() {
        const currentConversationId = this.selectedConversationId || this._defaultConversationId();
        const grouped = {};
        this.messages.forEach(item => {
            if (!item || !item.conversationId || item.conversationId === currentConversationId) return;
            if (!this._isDeveloper() && item.fromUser !== this._currentUser() && item.targetUser !== this._currentUser()) return;
            if (!grouped[item.conversationId] || (item.createdAt || 0) > (grouped[item.conversationId].createdAt || 0)) grouped[item.conversationId] = item;
        });
        return Object.keys(grouped).map(conversationId => {
            const item = grouped[conversationId];
            return {
                conversationId: conversationId,
                user: item.fromUser || item.targetUser || "",
                time: item.createdAt ? new Date(item.createdAt).toLocaleString() : "",
                preview: item.text || item.type || "",
                latestAt: item.createdAt || 0
            };
        }).sort((a, b) => b.latestAt - a.latestAt);
    }

    _renderAttachmentList() {
        if (!this.elements.AttachList) return;
        const files = this.elements.Attach && this.elements.Attach.files ? Array.from(this.elements.Attach.files) : [];
        this.elements.AttachList.innerHTML = files.length ? files.map(file => this._escape(file.name)).join(", ") : "";
    }

    _setHistoryStatus(text) {
        this._cacheElements();
        if (this.elements.HistoryStatus) this.elements.HistoryStatus.textContent = text;
    }

    _metadataOnlyAttachments(attachments) {
        return (Array.isArray(attachments) ? attachments : []).map(item => ({
            name: item.name || item.file_on || "",
            fileSn: item.file_sn || item.fileSn || "",
            size: item.size || 0,
            type: item.type || ""
        }));
    }

    _notify(type, user) {
        if (typeof window.TOASTER_ALERT === "function" && user && user !== this._currentUser()) {
            window.TOASTER_ALERT(`${type === "support_response" ? "Support replied" : "Support message"}: ${user}`);
        }
    }

    _canCallDb(endpoint) {
        return !!(window.commonfn && typeof window.commonfn.callajax === "function" && typeof endpoint !== "undefined" && endpoint);
    }

    _docid() {
        return window.DOC_ID || "";
    }

    _normalizeConversationOptions(options = {}) {
        const canUseExternalConversation = this._isDeveloper();
        const user = canUseExternalConversation ?
            (options.user || options.fromUser || this.selectedUser || this._currentUser()) :
            this._currentUser();
        const sessionId = canUseExternalConversation ?
            (options.sessionId || this.selectedSessionId || this._sessionId()) :
            this._sessionId();
        return {
            user: user,
            sessionId: sessionId,
            conversationId: canUseExternalConversation && options.conversationId ?
                options.conversationId :
                this._buildConversationId({ user: user, sessionId: sessionId })
        };
    }

    _defaultConversationId() {
        return this._buildConversationId({
            user: this.selectedUser || this._currentUser(),
            sessionId: this.selectedSessionId || this._sessionId()
        });
    }

    _buildConversationId(options = {}) {
        return `${this._docid()}:support:${options.sessionId || this._sessionId()}:${options.user || this._currentUser()}`;
    }

    _sessionId() {
        try {
            if (typeof window.getCurrentSessionId === "function") return window.getCurrentSessionId();
            if (typeof window.getSessionIdKey === "function") return window.sessionStorage.getItem(window.getSessionIdKey(this._docid())) || "";
            return window.sessionStorage.getItem("xmleditor:sessionid:" + this._docid()) || "";
        } catch (error) {
            return "";
        }
    }

    _client() {
        return (window.SHARED_KEY && (window.SHARED_KEY.client || window.SHARED_KEY.clientcode)) || "";
    }

    _currentUser() {
        return (window.USER_INFO && window.USER_INFO.MAIL_ID) || "";
    }

    _currentRole() {
        return (window.USER_INFO && (window.USER_INFO.ROLE_NAME || window.USER_INFO.TRACK_ROLE_NAME)) || "";
    }

    _isDeveloper() {
        return /developer|support|admin/i.test(this._currentRole());
    }

    _messageId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    _escape(value) {
        return String(value || "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        } [char]));
    }
}

export default SmartTechSupportModule;
