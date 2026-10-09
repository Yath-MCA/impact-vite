/*jslint white:true, for:true */
/*global window, BroadcastChannel, WebSocket, DOMAIN_ROOT, IS_LOCAL_HOST, IS_UAT_DOMAIN, io */

(function(global) {
    "use strict";

    const INSTANCES = {};

    function now() {
        return Date.now();
    }

    function safeParse(value, fallback) {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function isDebugEnv() {
        return !!(global.IS_LOCAL_HOST || global.IS_UAT_DOMAIN);
    }

    function normalizeDocId(docid) {
        if (docid) return String(docid);
        if (global.DOC_ID) return String(global.DOC_ID);
        try {
            return new URL(global.location.href).searchParams.get("docid") || "";
        } catch (error) {
            return "";
        }
    }

    function getSessionId(docid) {
        try {
            if (typeof global.getSessionIdKey === "function") {
                return global.sessionStorage.getItem(global.getSessionIdKey(docid)) || "";
            }
            return global.sessionStorage.getItem("xmleditor:sessionid:" + docid) || "";
        } catch (error) {
            return "";
        }
    }

    class SmartSyncSocket {
        constructor(docid, options = {}) {
            this.docid = normalizeDocId(docid || options.docid);
            this.options = options || {};
            this.user = options.user || (global.USER_INFO && global.USER_INFO.MAIL_ID) || "";
            this.role = options.role || (global.USER_INFO && global.USER_INFO.ROLE_NAME) || "";
            this.sessionId = String(options.sessionId || getSessionId(this.docid) || "");
            this.storageKey = "xmleditor:smartSyncSocket:" + this.docid;
            this.legacyPresenceKey = "xmleditor:smartSyncPresence:" + this.docid;
            this.channelName = options.channelName || ("smartSync:" + this.docid);
            this.socketPath = options.socketPath || "collaboration";
            this.handlers = {};
            this.queueMap = {};
            this.receivedIds = {};
            this.channel = null;
            this.socket = null;
            this.closed = false;
            this.started = false;
            this.state = this._loadState();
        }

        static getInstance(docid, options = {}) {
            const key = normalizeDocId(docid || options.docid);
            if (!key) return null;
            if (!INSTANCES[key]) {
                INSTANCES[key] = new SmartSyncSocket(key, options);
            } else if (options && Object.keys(options).length) {
                INSTANCES[key].configure(options);
            }
            return INSTANCES[key];
        }

        configure(options = {}) {
            this.options = Object.assign({}, this.options, options);
            this.user = options.user || this.user;
            this.role = options.role || this.role;
            this.sessionId = String(options.sessionId || this.sessionId || "");
            return this;
        }

        start() {
            if (!this.docid || this.started) return this;
            this.started = true;
            this.closed = false;
            this._setupBroadcastChannel();
            this._setupSocket();
            return this;
        }

        stop() {
            this.closed = true;
            this.started = false;
            try {
                if (this.channel) {
                    this.channel.close();
                    this.channel = null;
                }
                if (this.socket) {
                    this.socket.onclose = null;
                    this.socket.close();
                    this.socket = null;
                }
            } catch (error) {
                this._debug("stop failed", error);
            }
            return this;
        }

        send(message = {}) {
            const envelope = this._normalizeEnvelope(message);
            if (!envelope) return null;
            const serialized = JSON.stringify(envelope);

            try {
                if (this.channel) this.channel.postMessage(envelope);
            } catch (error) {
                this._debug("BroadcastChannel send failed", error);
            }

            try {
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(serialized);
                }
            } catch (error) {
                this._debug("socket send failed", error);
            }

            return envelope;
        }

        subscribe(scopeOrType, handler) {
            if (!scopeOrType || typeof handler !== "function") return () => {};
            this.handlers[scopeOrType] = this.handlers[scopeOrType] || [];
            this.handlers[scopeOrType].push(handler);
            return () => this.unsubscribe(scopeOrType, handler);
        }

        unsubscribe(scopeOrType, handler) {
            if (!this.handlers[scopeOrType]) return;
            this.handlers[scopeOrType] = this.handlers[scopeOrType].filter(item => item !== handler);
        }

        queue(message = {}) {
            const envelope = this._normalizeEnvelope(message);
            if (!envelope) return null;
            const key = this._queueKey(envelope);
            this.queueMap[key] = this.queueMap[key] || [];
            this.queueMap[key].push(envelope);
            this._persistState();
            return envelope;
        }

        getQueued(scopeOrType) {
            this._loadLegacyPresence();
            if (!scopeOrType) {
                return Object.keys(this.queueMap).reduce((all, key) => all.concat(this.queueMap[key] || []), []);
            }
            return (this.queueMap[scopeOrType] || []).slice();
        }

        clearQueue(scopeOrType) {
            if (scopeOrType) {
                this.queueMap[scopeOrType] = [];
            } else {
                this.queueMap = {};
            }
            this._persistState();
        }

        getState() {
            this._loadLegacyPresence();
            return {
                docid: this.docid,
                user: this.user,
                role: this.role,
                sessionId: this.sessionId,
                started: this.started,
                connected: this.isConnected(),
                users: (this.state.users || []).slice(),
                queue: this.getQueued(),
                storageKey: this.storageKey
            };
        }

        isConnected() {
            return !!(
                (this.socket && this.socket.readyState === WebSocket.OPEN)
            );
        }

        _setupBroadcastChannel() {
            try {
                if (!this.channel && typeof BroadcastChannel !== "undefined") {
                    this.channel = new BroadcastChannel(this.channelName);
                    this.channel.onmessage = event => this._handleIncoming(event && event.data);
                }
            } catch (error) {
                this.channel = null;
                this._debug("BroadcastChannel unavailable", error);
            }
        }

        _setupSocket() {
            const url = this._getSocketUrl();
            if (!url || this.socket) return;
            try {
                if (typeof WebSocket !== "function") {
                    return;
                }
                this.socket = new WebSocket(url);
                this.socket.onmessage = event => this._handleIncoming(event && event.data);
                this.socket.onclose = () => {
                    this.socket = null;
                    if (!this.closed) setTimeout(() => this._setupSocket(), 3000);
                };
                this.socket.onerror = error => this._debug("WebSocket error", error);
            } catch (error) {
                this._debug("socket setup failed", error);
            }
        }

        _getSocketUrl() {
            if (!global.DOMAIN_ROOT) return "";
            const root = String(global.DOMAIN_ROOT).replace(/^https?:/, global.location.protocol === "https:" ? "wss:" : "ws:");
            return root + this.socketPath + "?docid=" + encodeURIComponent(this.docid);
        }

        _handleIncoming(raw) {
            const envelope = this._normalizeEnvelope(raw);
            if (!envelope || envelope.docid !== this.docid) return;
            if (envelope.sessionId && this.sessionId && envelope.sessionId === this.sessionId) return;

            const dedupeKey = [
                envelope.docid,
                envelope.scope,
                envelope.type,
                envelope.uniqueId || "",
                envelope.requestId || "",
                envelope.sessionId || "",
                envelope.timestamp || ""
            ].join(":");
            if (this.receivedIds[dedupeKey]) return;
            this.receivedIds[dedupeKey] = now();

            this._debug("received", envelope);
            if (envelope.type === "replacement" || (envelope.scope === "paraLock" && envelope.uniqueId)) {
                this.queue(envelope);
            }
            this._rememberPresence(envelope);
            this._emit(envelope);
        }

        _emit(envelope) {
            const keys = [envelope.scope, envelope.type, `${envelope.scope}:${envelope.type}`, "*"];
            keys.forEach(key => {
                (this.handlers[key] || []).slice().forEach(handler => {
                    try {
                        handler(envelope);
                    } catch (error) {
                        this._debug("handler failed", error);
                    }
                });
            });
        }

        _rememberPresence(envelope) {
            if (!envelope || !envelope.user || !/presence/.test(envelope.type || "")) return;
            const key = envelope.sessionId || envelope.user;
            const users = (this.state.users || []).filter(user => (user.sessionId || user.user) !== key);
            if (envelope.action !== "leave") {
                users.push({
                    user: envelope.user,
                    role: envelope.role || "",
                    sessionId: envelope.sessionId || "",
                    lastSeen: envelope.timestamp || now()
                });
            }
            this.state.users = users;
            this._persistState();
        }

        _normalizeEnvelope(raw) {
            let message = raw;
            if (typeof message === "string") message = safeParse(message, null);
            if (!message || typeof message !== "object") return null;

            const payload = message.payload && typeof message.payload === "object" ? message.payload : {};
            const type = message.type || payload.type || "";
            const scope = message.scope || this._inferScope(type);
            if (!type && !scope) return null;

            return Object.assign({}, message, {
                scope: scope,
                type: type,
                docid: normalizeDocId(message.docid || payload.docid || this.docid),
                user: message.user || payload.user || this.user,
                role: message.role || payload.role || this.role,
                sessionId: String(message.sessionId || payload.sessionId || this.sessionId || ""),
                timestamp: message.timestamp || payload.timestamp || now(),
                payload: payload
            });
        }

        _inferScope(type) {
            if (/^link_/.test(type || "")) return "linkShare";
            if (/^(presence|replacement|lock|release)$/.test(type || "")) return "paraLock";
            if (/^support_/.test(type || "")) return "smartTechSupport";
            if (/^ai_/.test(type || "")) return "aiAssistance";
            return "shared";
        }

        _queueKey(envelope) {
            if (envelope.scope === "paraLock" && envelope.type === "replacement") return "replacement";
            return envelope.scope || envelope.type || "shared";
        }

        _loadState() {
            const state = safeParse(global.localStorage && global.localStorage.getItem(this.storageKey), {
                users: [],
                queueMap: {},
                lastUpdated: now()
            });
            this.queueMap = state.queueMap || {};
            return state;
        }

        _persistState() {
            const state = Object.assign({}, this.state, {
                queueMap: this.queueMap,
                lastUpdated: now()
            });
            this.state = state;
            try {
                global.localStorage.setItem(this.storageKey, JSON.stringify(state));
                global.sessionStorage.setItem(this.storageKey, JSON.stringify(state));
            } catch (error) {
                try {
                    global.sessionStorage.setItem(this.storageKey, JSON.stringify(state));
                } catch (ignoreError) {}
            }
        }

        _loadLegacyPresence() {
            const legacy = safeParse((global.localStorage && global.localStorage.getItem(this.legacyPresenceKey)) ||
                (global.sessionStorage && global.sessionStorage.getItem(this.legacyPresenceKey)), null);
            if (!legacy || legacy._migratedToSmartSyncSocket) return;
            if (Array.isArray(legacy.users) && legacy.users.length) {
                this.state.users = legacy.users;
            }
            if (Array.isArray(legacy.queue) && legacy.queue.length) {
                legacy.queue.forEach(item => this.queue(Object.assign({
                    scope: "paraLock",
                    type: "replacement"
                }, item)));
            }
            legacy._migratedToSmartSyncSocket = true;
            try {
                global.localStorage.setItem(this.legacyPresenceKey, JSON.stringify(legacy));
            } catch (error) {}
            this._persistState();
        }

        _debug(label, value) {
            if (!isDebugEnv()) return;
            if (value && typeof value === "object" && label === "received") {
                console.log("SmartSyncSocket received", value);
            } else {
                console.log("SmartSyncSocket " + label, value || "");
            }
        }
    }

    global.SmartSyncSocket = SmartSyncSocket;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = SmartSyncSocket;
    }
}(window));

export default window.SmartSyncSocket;
