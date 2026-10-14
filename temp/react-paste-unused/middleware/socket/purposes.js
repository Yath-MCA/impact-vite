(function(global) {
    "use strict";

    const BUILTIN_REGISTRY = {
        version: 1,
        purposes: [
            {
                purposeId: "early-detect-landing",
                channel: "presence",
                scope: "document",
                type: "EARLY_DETECT",
                direction: "send+receive",
                description: "Landing early-detect / presence handshake before editor open",
                examplePayload: {
                    action: "join",
                    source: "landing"
                }
            },
            {
                purposeId: "user-dirty",
                channel: "collaboration",
                scope: "paraLock",
                type: "USER_DIRTY",
                direction: "send+receive",
                description: "Notify that a user has dirty paragraph content (metadata only)",
                aliases: ["user-{user}-dirty"],
                examplePayload: {
                    user: "user-a@example.com",
                    paraId: [],
                    dirty: true
                }
            },
            {
                purposeId: "lock-acquire",
                channel: "collaboration",
                scope: "paraLock",
                type: "LOCK_ACQUIRE",
                direction: "send",
                description: "Request paragraph lock for current cursor blocks",
                examplePayload: {
                    paraId: ["p1"]
                }
            },
            {
                purposeId: "lock-release",
                channel: "collaboration",
                scope: "paraLock",
                type: "LOCK_RELEASE",
                direction: "send",
                description: "Release paragraph lock",
                examplePayload: {
                    paraId: ["p1"]
                }
            },
            {
                purposeId: "lock-get-state",
                channel: "collaboration",
                scope: "paraLock",
                type: "LOCK_GET_STATE",
                direction: "send",
                description: "Request current lock state for the document",
                examplePayload: {}
            },
            {
                purposeId: "replacement-notice",
                channel: "collaboration",
                scope: "paraLock",
                type: "replacement",
                direction: "receive",
                description: "Metadata-only replacement notice; receiver fetches HTML by uniqueId",
                examplePayload: {
                    uniqueId: "example-unique-id",
                    paraId: "p1"
                }
            }
        ]
    };

    function normalizeValue(value) {
        return String(value || "").trim();
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value == null ? {} : value));
    }

    function getRegistry(override) {
        if (override && Array.isArray(override.purposes)) return override;
        return BUILTIN_REGISTRY;
    }

    function listPurposes(override) {
        return getRegistry(override).purposes.slice();
    }

    /**
     * Map purposeId (or alias like user-alice-dirty) to envelope fields.
     * @param {string} purposeId
     * @param {object} [options]
     * @param {object} [options.vars] - template vars e.g. { user: "a@x.com" }
     * @param {object} [options.registry]
     * @returns {object|null}
     */
    function resolvePurpose(purposeId, options) {
        const opts = options || {};
        const vars = opts.vars || {};
        const id = normalizeValue(purposeId);
        if (!id) return null;

        const purposes = listPurposes(opts.registry);
        let match = purposes.find(function(entry) {
            return normalizeValue(entry.purposeId) === id;
        });

        let aliasUser = null;
        if (!match) {
            const dirtyMatch = id.match(/^user-(.+)-dirty$/i);
            if (dirtyMatch) {
                aliasUser = dirtyMatch[1];
                match = purposes.find(function(entry) {
                    return normalizeValue(entry.purposeId) === "user-dirty";
                });
            }
        }

        if (!match) return null;

        const payload = clone(match.examplePayload || {});
        if (aliasUser) {
            payload.user = aliasUser;
        }
        Object.keys(vars).forEach(function(key) {
            payload[key] = vars[key];
        });

        return {
            purposeId: match.purposeId,
            requestedId: id,
            channel: match.channel,
            scope: match.scope,
            type: match.type,
            direction: match.direction || "send+receive",
            description: match.description || "",
            purpose: match.purposeId,
            payload: payload,
            canSend: String(match.direction || "").indexOf("send") !== -1,
            canReceive: String(match.direction || "").indexOf("receive") !== -1
        };
    }

    function buildEnvelopeFromPurpose(purposeId, options) {
        const resolved = resolvePurpose(purposeId, options);
        if (!resolved) return null;
        const opts = options || {};
        const extra = opts.payload || {};
        const payload = Object.assign({}, resolved.payload, extra);
        return {
            purpose: resolved.purposeId,
            channel: resolved.channel,
            scope: resolved.scope,
            type: resolved.type,
            payload: payload
        };
    }

    function matchEnvelopePurpose(envelope, override) {
        if (!envelope || typeof envelope !== "object") return null;
        const purposes = listPurposes(override);
        const type = normalizeValue(envelope.type);
        const channel = normalizeValue(envelope.channel);
        const scope = normalizeValue(envelope.scope);
        const byPurpose = normalizeValue(envelope.purpose);

        let match = purposes.find(function(entry) {
            return normalizeValue(entry.purposeId) === byPurpose;
        });
        if (!match) {
            match = purposes.find(function(entry) {
                return normalizeValue(entry.type) === type &&
                    normalizeValue(entry.channel) === channel &&
                    normalizeValue(entry.scope) === scope;
            });
        }
        if (!match) {
            match = purposes.find(function(entry) {
                return normalizeValue(entry.type) === type;
            });
        }
        return match ? match.purposeId : null;
    }

    const api = {
        REGISTRY: BUILTIN_REGISTRY,
        listPurposes: listPurposes,
        resolvePurpose: resolvePurpose,
        buildEnvelopeFromPurpose: buildEnvelopeFromPurpose,
        matchEnvelopePurpose: matchEnvelopePurpose
    };

    global.SocketBridgePurposes = api;

    if (global.SocketBridge) {
        global.SocketBridge.listPurposes = listPurposes;
        global.SocketBridge.resolvePurpose = resolvePurpose;
        global.SocketBridge.buildEnvelopeFromPurpose = buildEnvelopeFromPurpose;
        global.SocketBridge.matchEnvelopePurpose = matchEnvelopePurpose;
        global.SocketBridge.PURPOSES = BUILTIN_REGISTRY;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
