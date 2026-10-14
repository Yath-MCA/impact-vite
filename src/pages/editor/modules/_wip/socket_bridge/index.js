(function(global) {
    "use strict";

    const INSTANCES = {};
    const RECEIVED_ID_TTL_MS = 5 * 60 * 1000;
    const RECEIVED_ID_MAX = 500;
    let messageCounter = 0;

    function now() {
        return Date.now ? Date.now() : new Date().getTime();
    }

    function safeParse(value, fallback) {
        try {
            return typeof value === "string" ? JSON.parse(value) : value;
        } catch (error) {
            return fallback;
        }
    }

    function normalizeValue(value) {
        return String(value || "").trim();
    }

    function createMessageId(prefix) {
        const cryptoSource = global.crypto || (typeof crypto !== "undefined" ? crypto : null);
        if (cryptoSource && typeof cryptoSource.randomUUID === "function") {
            return normalizeValue(prefix || "socket") + ":" + cryptoSource.randomUUID();
        }
        messageCounter += 1;
        return [
            normalizeValue(prefix || "socket"),
            now(),
            messageCounter,
            Math.random().toString(36).slice(2)
        ].join(":");
    }

    function stripUnsafePayload(value) {
        if (!value || typeof value !== "object") return {};
        const clean = {};
        Object.keys(value).forEach(key => {
            if (/^(updated_html|html|content|fullContent)$/i.test(key)) return;
            clean[key] = value[key];
        });
        return clean;
    }

    function getSessionId(docid) {
        try {
            const key = "xmleditor:sessionid:" + normalizeValue(docid);
            return global.sessionStorage ? global.sessionStorage.getItem(key) : "";
        } catch (error) {
            return "";
        }
    }

    function getHandlerKey(channel, scope, type) {
        return [
            normalizeValue(channel) || "*",
            normalizeValue(scope) || "*",
            normalizeValue(type) || "*"
        ].join("::");
    }

    class SocketBridgeInstance {
        constructor(options = {}) {
            this.configure(options);
            this.handlers = {};
            this.receivedIds = {};
            this.lastReceivedCleanup = 0;
            this.broadcastChannel = null;
            this.socket = null;
            this.smartSocket = null;
            this.smartUnsubscribers = [];
            this.reconnectTimer = null;
            this.intentionalClose = false;
            this.started = false;
            this.state = {
                broadcast: "disabled",
                socket: "disabled",
                socketUrl: "",
                docid: this.docid,
                purpose: this.purpose,
                channel: this.channel,
                source: this.source,
                channelName: this.channelName
            };
        }

        configure(options = {}) {
            this.docid = normalizeValue(options.docid || this.docid || global.DOC_ID);
            this.channel = normalizeValue(options.channel || options.purpose || this.channel || this.purpose || "collaboration");
            this.purpose = normalizeValue(options.purpose || this.purpose || this.channel);
            this.source = normalizeValue(options.source || this.source || "");
            this.scope = normalizeValue(options.scope || this.scope || this.channel || "default");
            this.user = options.user || this.user || (global.USER_INFO && global.USER_INFO.MAIL_ID) || "";
            this.role = options.role || this.role || (global.USER_INFO && global.USER_INFO.ROLE_NAME) || "";
            this.sessionId = normalizeValue(options.sessionId || this.sessionId || getSessionId(this.docid));
            this.socketPath = normalizeValue(options.socketPath || this.socketPath || "collaboration");
            this.channelName = normalizeValue(options.channelName || this.channelName || ("socketBridge:" + this.docid + ":" + this.sessionId));
            this.reconnectMs = options.reconnectMs || this.reconnectMs || 3000;
            if (this.state) {
                this.state.docid = this.docid;
                this.state.purpose = this.purpose;
                this.state.channel = this.channel;
                this.state.source = this.source;
                this.state.channelName = this.channelName;
            }
            return this;
        }

        connect() {
            return this.start();
        }

        start() {
            if (!this.docid || this.started) return this;
            this.started = true;
            this.intentionalClose = false;
            this._setupSmartSocket();
            if (!this.smartSocket) {
                this._setupBroadcastChannel();
                this._setupSocket();
            }
            return this;
        }

        stop(reason) {
            this.intentionalClose = true;
            this.started = false;
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            this.smartUnsubscribers.forEach(unsubscribe => {
                if (typeof unsubscribe === "function") unsubscribe();
            });
            this.smartUnsubscribers = [];
            try {
                if (this.broadcastChannel) this.broadcastChannel.close();
            } catch (error) {}
            try {
                if (this.socket) {
                    this.socket.onclose = null;
                    this.socket.close();
                }
            } catch (error) {}
            this.broadcastChannel = null;
            this.socket = null;
            this.smartSocket = null;
            this.state.broadcast = "disabled";
            this.state.socket = "disabled";
            this.state.reason = reason || "";
            return this;
        }

        disconnect(reason) {
            return this.stop(reason);
        }

        send(type, payload = {}) {
            if (type && typeof type === "object") {
                return this.publish(type);
            }
            const envelope = this._normalizeEnvelope(Object.assign({}, payload, {
                type
            }));
            if (!envelope) return null;

            if (this.smartSocket && typeof this.smartSocket.send === "function") {
                this.smartSocket.send(envelope);
                return envelope;
            }

            try {
                if (this.broadcastChannel) this.broadcastChannel.postMessage(envelope);
            } catch (error) {}

            const serialized = JSON.stringify(envelope);
            try {
                if (this.socket && global.WebSocket && this.socket.readyState === global.WebSocket.OPEN) {
                    this.socket.send(serialized);
                }
            } catch (error) {}

            return envelope;
        }

        publish(message = {}) {
            if (!message || typeof message !== "object") return null;
            return this.send(message.type, message);
        }

        subscribe(typeOrScope, handler) {
            const subscription = (typeOrScope && typeof typeOrScope === "object") ? typeOrScope : null;
            const callback = subscription ? subscription.handler : handler;
            if (!typeOrScope || typeof callback !== "function") return null;
            const key = subscription ?
                getHandlerKey(subscription.channel || this.channel, subscription.scope || this.scope, subscription.type || "*") :
                typeOrScope;
            const token = {
                key,
                handler: callback
            };
            this.handlers[key] = this.handlers[key] || [];
            this.handlers[key].push(callback);
            return function unsubscribe() {
                this.unsubscribe(token);
            }.bind(this);
        }

        unsubscribe(token) {
            if (typeof token === "function") {
                token();
                return;
            }
            if (!token || !token.key || !this.handlers[token.key]) return;
            this.handlers[token.key] = this.handlers[token.key].filter(handler => handler !== token.handler);
        }

        getState() {
            const smartState = this.smartSocket && this.smartSocket.getState ? this.smartSocket.getState() : {};
            return Object.assign({}, this.state, {
                docid: this.docid,
                purpose: this.purpose,
                channel: this.channel,
                source: this.source,
                scope: this.scope,
                started: this.started,
                connected: this.isConnected(),
                users: Array.isArray(smartState.users) ? smartState.users.slice() : []
            });
        }

        getQueued(typeOrScope) {
            if (this.smartSocket && typeof this.smartSocket.getQueued === "function") {
                return this.smartSocket.getQueued(typeOrScope);
            }
            return [];
        }

        clearQueue(typeOrScope) {
            if (this.smartSocket && typeof this.smartSocket.clearQueue === "function") {
                this.smartSocket.clearQueue(typeOrScope);
            }
        }

        isConnected() {
            return !!(
                (this.smartSocket && this.smartSocket.isConnected && this.smartSocket.isConnected()) ||
                (this.socket && global.WebSocket && this.socket.readyState === global.WebSocket.OPEN)
            );
        }

        _setupSmartSocket() {
            if (!global.SmartSyncSocket || typeof global.SmartSyncSocket.getInstance !== "function") return;
            this.smartSocket = global.SmartSyncSocket.getInstance(this.docid, {
                user: this.user,
                role: this.role,
                sessionId: this.sessionId,
                channelName: this.channelName,
                socketPath: this.socketPath,
                channel: this.channel,
                source: this.source
            });
            if (!this.smartSocket) return;
            if (typeof this.smartSocket.start === "function") this.smartSocket.start();
            if (typeof this.smartSocket.subscribe === "function" && !this.smartUnsubscribers.length) {
                const unsubscribe = this.smartSocket.subscribe(this.scope, message => this._handleIncoming(message));
                if (typeof unsubscribe === "function") this.smartUnsubscribers.push(unsubscribe);
                const all = this.smartSocket.subscribe("*", message => this._handleIncoming(message));
                if (typeof all === "function") this.smartUnsubscribers.push(all);
            }
            this.state.broadcast = "smart";
            this.state.socket = this.smartSocket.isConnected && this.smartSocket.isConnected() ? "connected" : "pending";
        }

        _setupBroadcastChannel() {
            try {
                if (!this.broadcastChannel && typeof global.BroadcastChannel === "function") {
                    this.broadcastChannel = new global.BroadcastChannel(this.channelName);
                    this.broadcastChannel.onmessage = event => this._handleIncoming(event && event.data);
                    this.state.broadcast = "connected";
                }
            } catch (error) {
                this.broadcastChannel = null;
                this.state.broadcast = "error";
            }
        }

        _setupSocket() {
            const url = this._getSocketUrl();
            if (!url || this.socket) return;
            this.state.socketUrl = url;
            try {
                if (typeof global.WebSocket !== "function") {
                    this.state.socket = "disabled";
                    return;
                }
                this.socket = new global.WebSocket(url);
                this.socket.onopen = () => {
                    this.state.socket = "connected";
                };
                this.socket.onmessage = event => this._handleIncoming(event && event.data);
                this.socket.onclose = () => {
                    this.socket = null;
                    this.state.socket = "disconnected";
                    if (!this.intentionalClose && this.started) {
                        this.reconnectTimer = setTimeout(() => this._setupSocket(), this.reconnectMs);
                    }
                };
                this.socket.onerror = () => {
                    this.state.socket = "error";
                };
            } catch (error) {
                this.state.socket = "error";
            }
        }

        _getSocketUrl() {
            let buildUrl = global.buildCollaborationSocketUrl;
            if (typeof buildUrl !== "function" && typeof module !== "undefined" && module.exports) {
                try {
                    buildUrl = require("./socketUrl.js").buildCollaborationSocketUrl;
                } catch (error) {
                    buildUrl = null;
                }
            }
            if (typeof buildUrl === "function") {
                return buildUrl({
                    domainRoot: global.DOMAIN_ROOT,
                    endpoint: this.socketPath || "collaboration",
                    docid: this.docid,
                    source: this.source,
                    globalLike: global
                }) || "";
            }
            // Legacy fallback (should not run when socketUrl.js is bundled)
            if (!global.location) return "";
            let root = String(global.DOMAIN_ROOT || "");
            if (!root || /\$\{\{/.test(root)) return "";
            const protocol = global.location.protocol === "https:" ? "wss:" : "ws:";
            root = root.replace(/^https?:/, protocol);
            if (root.slice(-1) !== "/") root += "/";
            const params = ["docid=" + encodeURIComponent(this.docid)];
            if (this.source) params.push("source=" + encodeURIComponent(this.source));
            return root + (this.socketPath || "collaboration") + "?" + params.join("&");
        }

        _normalizeEnvelope(raw) {
            let message = safeParse(raw, null);
            if (!message || typeof message !== "object") return null;
            const payload = stripUnsafePayload(message.payload || {});
            const type = normalizeValue(message.type || payload.type);
            const scope = normalizeValue(message.scope || payload.scope || this.scope);
            if (!type) return null;
            const uniqueId = normalizeValue(message.uniqueId || payload.uniqueId);
            const paraId = normalizeValue(message.paraId || payload.paraId);
            const explicitMessageId = normalizeValue(message.messageId || payload.messageId);
            const envelope = {
                version: Number(message.version || payload.version || 1) || 1,
                messageId: explicitMessageId || createMessageId(type),
                correlationId: normalizeValue(message.correlationId || payload.correlationId),
                scope,
                type,
                docid: normalizeValue(message.docid || payload.docid || this.docid),
                purpose: normalizeValue(message.purpose || payload.purpose || message.channel || payload.channel || this.purpose),
                channel: normalizeValue(message.channel || payload.channel || message.purpose || payload.purpose || this.channel),
                source: normalizeValue(message.source || payload.source || this.source),
                uniqueId,
                paraId,
                user: message.user || payload.user || this.user,
                role: message.role || payload.role || this.role,
                sessionId: normalizeValue(message.sessionId || payload.sessionId || this.sessionId),
                timestamp: message.timestamp || payload.timestamp || now(),
                action: message.action || payload.action || "",
                payload
            };
            Object.defineProperty(envelope, "_messageIdGenerated", {
                value: !explicitMessageId,
                enumerable: false
            });
            return envelope;
        }

        _handleIncoming(raw) {
            const envelope = this._normalizeEnvelope(raw);
            if (!envelope || envelope.docid !== this.docid) return;
            if (envelope.sessionId && this.sessionId && envelope.sessionId === this.sessionId) return;

            this._cleanupReceivedIds();
            const dedupeKey = this._getDedupeKey(envelope);
            if (dedupeKey) {
                if (this.receivedIds[dedupeKey]) return;
                this.receivedIds[dedupeKey] = now();
            }
            this._emit(envelope);
        }

        _getDedupeKey(envelope) {
            if (envelope.messageId && !envelope._messageIdGenerated) {
                return "message:" + envelope.messageId;
            }
            if (!envelope.uniqueId) return "";
            return [
                "legacy",
                envelope.docid,
                envelope.channel || "",
                envelope.type,
                envelope.uniqueId,
                envelope.sessionId || ""
            ].join(":");
        }

        _cleanupReceivedIds() {
            const currentTime = now();
            const keys = Object.keys(this.receivedIds);
            if (!keys.length) return;
            if ((currentTime - this.lastReceivedCleanup) < 30000 && keys.length <= RECEIVED_ID_MAX) return;
            this.lastReceivedCleanup = currentTime;

            keys.forEach(key => {
                if ((currentTime - this.receivedIds[key]) > RECEIVED_ID_TTL_MS) {
                    delete this.receivedIds[key];
                }
            });

            const remainingKeys = Object.keys(this.receivedIds);
            if (remainingKeys.length <= RECEIVED_ID_MAX) return;
            remainingKeys
                .sort((left, right) => this.receivedIds[right] - this.receivedIds[left])
                .slice(RECEIVED_ID_MAX)
                .forEach(key => {
                    delete this.receivedIds[key];
                });
        }

        _emit(envelope) {
            const keys = [
                getHandlerKey(envelope.channel, envelope.scope, envelope.type),
                getHandlerKey(envelope.channel, envelope.scope, "*"),
                getHandlerKey(envelope.channel, "*", envelope.type),
                getHandlerKey("*", envelope.scope, envelope.type),
                envelope.type,
                envelope.scope,
                envelope.scope + ":" + envelope.type,
                "*"
            ];
            keys.forEach(key => {
                (this.handlers[key] || []).slice().forEach(handler => {
                    try {
                        handler(envelope);
                    } catch (error) {
                        setTimeout(() => {
                            throw error;
                        }, 0);
                    }
                });
            });
        }
    }

    class SocketBridge {
        static getInstance(options = {}) {
            const docid = normalizeValue(options.docid || global.DOC_ID);
            const channel = normalizeValue(options.channel || options.purpose || "collaboration");
            const sessionId = normalizeValue(options.sessionId || getSessionId(docid) || "default");
            if (!docid) return null;
            const key = docid + "::" + sessionId;
            if (!INSTANCES[key]) {
                INSTANCES[key] = new SocketBridgeInstance(Object.assign({}, options, {
                    docid,
                    channel,
                    sessionId,
                    purpose: normalizeValue(options.purpose || channel)
                }));
            } else {
                INSTANCES[key].configure(options);
            }
            return INSTANCES[key];
        }

        static _resetForTests() {
            Object.keys(INSTANCES).forEach(key => INSTANCES[key].stop("reset"));
            Object.keys(INSTANCES).forEach(key => delete INSTANCES[key]);
        }
    }

    global.SocketBridge = SocketBridge;

    if (typeof module !== "undefined" && module.exports) {
        try {
            const socketUrlApi = require("./socketUrl.js");
            SocketBridge.resolveDomainRoot = socketUrlApi.resolveDomainRoot;
            SocketBridge.buildCollaborationSocketUrl = socketUrlApi.buildCollaborationSocketUrl;
        } catch (error) {
            // socketUrl.js optional when loaded as a prior browser script
        }
        try {
            const purposesApi = require("./purposes.js");
            SocketBridge.listPurposes = purposesApi.listPurposes;
            SocketBridge.resolvePurpose = purposesApi.resolvePurpose;
            SocketBridge.buildEnvelopeFromPurpose = purposesApi.buildEnvelopeFromPurpose;
            SocketBridge.matchEnvelopePurpose = purposesApi.matchEnvelopePurpose;
            SocketBridge.PURPOSES = purposesApi.REGISTRY;
        } catch (error) {
            // purposes.js optional when consumed as a browser script after index.js
        }
        module.exports = SocketBridge;
    }
})(typeof window !== "undefined" ? window : globalThis);
