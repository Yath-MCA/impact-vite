/*jslint white:true, for:true */
/*global window, BaseModule, DOC_ID, USER_INFO, GET_JSON */

class AIAssistanceModule extends BaseModule {
    constructor(name = "AIAssistance", subFolder = "ai_assistance", options = {}) {
        super(name, subFolder, options);
        this._id = "AIAssistanceDialog";
        this.socket = null;
        this.handlers = [];
        this.messages = [];
        this.lastPrompt = "";
        this.storageTbl = "SmartSyncMessages";
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
        window.AIAssistance = this;
    }

    showLoop() {
        this._cacheElements();
        this._bindEvents();
        this.fetchHistory();
        this._render();
    }

    open(options = {}) {
        this.initializeSmartSyncSocket(options);
        this.show();
        return true;
    }

    initializeSmartSyncSocket(options = {}) {
        const docid = options.docid || window.DOC_ID || "";
        if (!docid || !window.SmartSyncSocket) return this;
        if (!this.socket) {
            this.socket = window.SmartSyncSocket.getInstance(docid, {
                user: options.user || this._currentUser(),
                role: options.role || this._currentRole()
            }).start();
            this.socket.subscribe("aiAssistance", this._handleMessage);
        }
        return this;
    }

    ask(prompt, context = {}) {
        if (!this.socket) this.initializeSmartSyncSocket(context);
        const cleanPrompt = String(prompt || "").trim();
        if (!cleanPrompt) return null;
        this.lastPrompt = cleanPrompt;
        const request = {
            messageId: this._messageId("ai-request"),
            prompt: cleanPrompt,
            context: context.metadata || {},
            endpoint: typeof window.API_CHATBOT_AI !== "undefined" ? window.API_CHATBOT_AI : "",
            status: "placeholder",
            createdAt: Date.now()
        };
        this.messages.push(Object.assign({ type: "ai_request", fromUser: this._currentUser(), text: cleanPrompt }, request));
        this._persistMessage(Object.assign({ scope: "aiAssistance", docid: this._docid(), fromRole: this._currentRole() }, this.messages[this.messages.length - 1]));
        this._send("ai_request", { messageId: request.messageId, payload: request });
        this._appendStubResponse(request);
        this._render();
        return request;
    }

    fetchHistory(options = {}) {
        if (!this._canCallDb(window.API_GET_DOCS)) return false;
        const payload = this._buildDbPayload({
            find: {
                docid: this._docid(),
                scope: "aiAssistance"
            },
            length: options.length || 100
        });
        window.commonfn.callajax(payload, "aiAssistanceHistoryLoaded", window.API_GET_DOCS, this);
        return true;
    }

    aiAssistanceHistoryLoaded(response) {
        this._normalizeRecords(response).forEach(record => this._upsertMessage(record));
        this._render();
    }

    continueToSupport(payload = {}) {
        const text = payload.text || this.lastPrompt || "AI assistance escalation";
        if (window.SmartTechSupport && typeof window.SmartTechSupport.sendMessage === "function") {
            return window.SmartTechSupport.sendMessage(text, payload.attachments || [], {
                source: "aiAssistance",
                type: "ai_escalate_to_support"
            });
        }
        if (!this.socket) this.initializeSmartSyncSocket(payload);
        return this.socket && this.socket.send({
            scope: "smartTechSupport",
            type: "ai_escalate_to_support",
            payload: Object.assign({
                source: "aiAssistance",
                text: text,
                status: "placeholder"
            }, payload)
        });
    }

    onMessage(handler) {
        if (typeof handler === "function") this.handlers.push(handler);
        return () => {
            this.handlers = this.handlers.filter(item => item !== handler);
        };
    }

    _handleMessage(message) {
        if (!message || message.scope !== "aiAssistance") return;
        const payload = message.payload || {};
        this.messages.push({
            type: message.type,
            fromUser: message.user || "",
            text: payload.prompt || payload.text || payload.response || "",
            createdAt: message.timestamp || Date.now(),
            status: payload.status || ""
        });
        this.handlers.slice().forEach(handler => handler(message));
        this._render();
    }

    _send(type, extra = {}) {
        if (!this.socket) return null;
        return this.socket.send(Object.assign({
            scope: "aiAssistance",
            type: type
        }, extra));
    }

    _appendStubResponse(request) {
        const response = {
            type: "ai_response",
            fromUser: "AI Assistance",
            text: "RAG backend hook is ready. API_CHATBOT_AI integration will replace this placeholder response.",
            requestId: request.messageId,
            status: "placeholder",
            createdAt: Date.now()
        };
        this.messages.push(response);
        this._persistMessage(Object.assign({ scope: "aiAssistance", docid: this._docid(), fromRole: "AI" }, response));
        this._send("ai_response", { payload: response });
    }

    _persistMessage(record) {
        if (!this._canCallDb(window.API_UPDATE_INSERT)) return false;
        const payload = this._buildDbPayload({
            find: { docid: record.docid, scope: record.scope, messageId: record.messageId || record.requestId },
            update: Object.assign({}, record, {
                tbl: this.storageTbl,
                recordtype: "ai_assistance_message",
                messageId: record.messageId || record.requestId || this._messageId("ai-message"),
                updatedAt: Date.now()
            }),
            upsert: true
        });
        window.commonfn.callajax(payload, "aiAssistanceMessageSaved", window.API_UPDATE_INSERT, this);
        return true;
    }

    aiAssistanceMessageSaved() {}

    _buildDbPayload(extra = {}) {
        const base = typeof GET_JSON === "function" ? GET_JSON("default") : {};
        return Object.assign({}, base, {
            tbl: this.storageTbl,
            recordtype: "ai_assistance_message"
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
        if (!record || !(record.messageId || record.requestId)) return;
        const key = record.messageId || record.requestId;
        const index = this.messages.findIndex(item => (item.messageId || item.requestId) === key);
        if (index >= 0) this.messages[index] = Object.assign({}, this.messages[index], record);
        else this.messages.push(record);
        this.messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }

    _cacheElements() {
        this.Panel = this.Panel || document.getElementById(this._id);
        if (!this.Panel) return;
        this.elements.Thread = this.Panel.querySelector("#ai_assistance_thread");
        this.elements.Prompt = this.Panel.querySelector("#ai_assistance_prompt");
        this.elements.Ask = this.Panel.querySelector("#ai_assistance_ask");
        this.elements.Escalate = this.Panel.querySelector("#ai_assistance_escalate");
        this.elements.Close = this.Panel.querySelector("#ai_assistance_close");
    }

    _bindEvents() {
        if (this.elements.Ask) this.elements.Ask.onclick = () => {
            const prompt = this.elements.Prompt ? this.elements.Prompt.value : "";
            this.ask(prompt);
            if (this.elements.Prompt) this.elements.Prompt.value = "";
        };
        if (this.elements.Escalate) this.elements.Escalate.onclick = () => this.continueToSupport({ text: this.lastPrompt });
        if (this.elements.Close) this.elements.Close.onclick = () => this.closeDialog();
    }

    _render() {
        this._cacheElements();
        if (!this.elements.Thread) return;
        this.elements.Thread.innerHTML = this.messages.length ? this.messages.map(item => {
            const time = item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : "";
            return `<div><strong>${this._escape(item.fromUser || item.type || "")}</strong> <span class="text-muted">${this._escape(time)}</span><div>${this._escape(item.text || "")}</div></div>`;
        }).join("<hr class=\"my-2\">") : "<span class=\"text-muted\">No AI assistance messages yet.</span>";
        this.elements.Thread.scrollTop = this.elements.Thread.scrollHeight;
    }

    _currentUser() {
        return (window.USER_INFO && window.USER_INFO.MAIL_ID) || "";
    }

    _docid() {
        return window.DOC_ID || "";
    }

    _currentRole() {
        return (window.USER_INFO && (window.USER_INFO.ROLE_NAME || window.USER_INFO.TRACK_ROLE_NAME)) || "";
    }

    _canCallDb(endpoint) {
        return !!(window.commonfn && typeof window.commonfn.callajax === "function" && endpoint);
    }

    _messageId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    _escape(value) {
        return String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }
}

export default AIAssistanceModule;
