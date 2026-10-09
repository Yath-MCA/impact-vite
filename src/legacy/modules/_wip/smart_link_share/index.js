/*jslint white:true, for:true */
/*global window, BaseModule, SmartSyncSocket, DOC_ID, USER_INFO, TOASTER_ALERT */

class SmartLinkShareModule extends BaseModule {
    constructor(name = "SmartLinkShare", subFolder = "smart_link_share", options = {}) {
        super(name, subFolder, options);
        this._id = "SmartLinkShareDialog";
        this.socket = null;
        this.handlers = [];
        this.activeUsers = {};
        this.requestLog = [];
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
        window.SmartLinkShare = this;
    }

    showLoop() {
        this._cacheElements();
        this._bindEvents();
        this.checkActive();
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
                user: options.user || (window.USER_INFO && window.USER_INFO.MAIL_ID) || "",
                role: options.role || (window.USER_INFO && window.USER_INFO.ROLE_NAME) || "",
                sessionId: options.sessionId || ""
            }).start();
            this.socket.subscribe("linkShare", this._handleMessage);
        }
        return this;
    }

    checkActive(options = {}) {
        if (!this.socket) this.initializeSmartSyncSocket(options);
        return this._send("link_presence", {
            requestId: options.requestId || this._messageId("link-presence"),
            payload: { purpose: "active_user_check" }
        });
    }

    sendAccessRequest(payload = {}) {
        if (!this.socket) this.initializeSmartSyncSocket(payload);
        return this._send("link_access_request", {
            requestId: payload.requestId || this._messageId("link-request"),
            payload: payload
        });
    }

    sendAccessResponse(payload = {}) {
        if (!this.socket) this.initializeSmartSyncSocket(payload);
        return this._send("link_access_response", {
            requestId: payload.requestId || this._messageId("link-response"),
            payload: payload
        });
    }

    onMessage(handler) {
        if (typeof handler === "function") this.handlers.push(handler);
        return () => {
            this.handlers = this.handlers.filter(item => item !== handler);
        };
    }

    _send(type, extra = {}) {
        if (!this.socket) return null;
        const sent = this.socket.send(Object.assign({
            scope: "linkShare",
            type: type
        }, extra));
        this._appendLog({ type: type, user: this._currentUser(), payload: extra.payload || {}, timestamp: Date.now(), local: true });
        return sent;
    }

    _handleMessage(message) {
        if (!message || message.scope !== "linkShare") return;
        const user = message.user || (message.payload && message.payload.user) || "";
        if (user) {
            this.activeUsers[user] = {
                user: user,
                role: message.role || "",
                lastSeen: message.timestamp || Date.now()
            };
        }
        if (message.type === "link_presence") {
            this._send("link_presence_ack", { payload: { toSessionId: message.sessionId || "" } });
        }
        this._appendLog(message);
        this.handlers.slice().forEach(handler => handler(message));
    }

    _appendLog(message) {
        this.requestLog.unshift(message);
        this.requestLog = this.requestLog.slice(0, 50);
        this._render();
    }

    _cacheElements() {
        this.Panel = this.Panel || document.getElementById(this._id);
        if (!this.Panel) return;
        this.elements.ActiveUsers = this.Panel.querySelector("#smart_link_active_users");
        this.elements.RequestLog = this.Panel.querySelector("#smart_link_request_log");
        this.elements.CheckActive = this.Panel.querySelector("#smart_link_check_active");
        this.elements.Close = this.Panel.querySelector("#smart_link_close");
    }

    _bindEvents() {
        if (this.elements.CheckActive) this.elements.CheckActive.onclick = this.checkActive;
        if (this.elements.Close) this.elements.Close.onclick = () => this.closeDialog();
    }

    _render() {
        this._cacheElements();
        if (this.elements.ActiveUsers) {
            const users = Object.values(this.activeUsers);
            this.elements.ActiveUsers.innerHTML = users.length ? users.map(item => {
                return `<div><strong>${this._escape(item.user)}</strong><br><span class="text-muted">${this._escape(item.role || "active")}</span></div>`;
            }).join("<hr class=\"my-1\">") : "<span class=\"text-muted\">No active link users yet.</span>";
        }
        if (this.elements.RequestLog) {
            this.elements.RequestLog.innerHTML = this.requestLog.length ? this.requestLog.map(item => {
                const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "";
                return `<div><strong>${this._escape(item.type || "message")}</strong> <span class="text-muted">${this._escape(time)}</span><br>${this._escape(item.user || "")}</div>`;
            }).join("<hr class=\"my-1\">") : "<span class=\"text-muted\">No link messages yet.</span>";
        }
    }

    _currentUser() {
        return (window.USER_INFO && window.USER_INFO.MAIL_ID) || "";
    }

    _messageId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    _escape(value) {
        return String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }
}

export default SmartLinkShareModule;
