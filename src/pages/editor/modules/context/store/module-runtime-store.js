/**
 * ModuleRuntimeStore - small Redux-style observer store for module lifecycle state.
 * It stores serializable snapshots only; DOM nodes and module instances stay outside.
 */
(function(global) {
    "use strict";

    var MAX_TIMELINE = 100;

    function nowIso() {
        return new Date().toISOString();
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function normalizeStats(stats) {
        stats = stats || {};
        return {
            openCount: stats.openCount || 0,
            closeCount: stats.closeCount || 0,
            buttonClicks: Object.assign({}, stats.buttonClicks || {}),
            inputInteractions: stats.inputInteractions || 0,
            lastOpened: stats.lastOpened ? new Date(stats.lastOpened).toISOString() : null,
            lastClosed: stats.lastClosed ? new Date(stats.lastClosed).toISOString() : null
        };
    }

    function normalizeModule(payload) {
        payload = payload || {};
        return {
            id: payload.id || payload.dialogId || payload.moduleId || null,
            name: payload.name || payload.moduleName || null,
            dialogType: payload.dialogType || null,
            state: typeof payload.state === "number" ? payload.state : 0,
            isOpen: payload.state === 1 || payload.isOpen === true,
            initiated: payload.initiated === true,
            fullyLoaded: payload.fullyLoaded === true,
            errors: payload.errors || 0,
            lastError: payload.lastError || null,
            stats: normalizeStats(payload.stats)
        };
    }

    function getDocumentMeta() {
        var sharedKey = global.SHARED_KEY || {};
        var userInfo = global.USER_INFO || {};
        return {
            docid: global.DOC_ID || sharedKey.docid || null,
            dtd: global.DOC_DTD || sharedKey.dtd || null,
            client: sharedKey.client || sharedKey.clientcode || null,
            role: userInfo.ROLE_ID || sharedKey.role || null
        };
    }

    function initialState() {
        return {
            runtime: {
                activeModuleId: null,
                activeDialogId: null,
                lastAction: null,
                updatedAt: null
            },
            modules: {
                byId: {},
                openIds: []
            },
            document: getDocumentMeta(),
            timeline: []
        };
    }

    function appendTimeline(state, action) {
        var entry = {
            type: action.type,
            moduleId: action.payload && (action.payload.id || action.payload.moduleId || action.payload.dialogId) || null,
            buttonId: action.payload && action.payload.buttonId || null,
            inputId: action.payload && action.payload.inputId || null,
            functionName: action.payload && action.payload.functionName || null,
            timestamp: action.timestamp || nowIso()
        };
        var timeline = state.timeline.concat(entry);
        return timeline.length > MAX_TIMELINE ? timeline.slice(timeline.length - MAX_TIMELINE) : timeline;
    }

    function reducer(state, action) {
        state = state || initialState();
        action = action || {};

        var next = clone(state);
        next.document = Object.assign({}, next.document, getDocumentMeta());
        next.runtime.lastAction = action.type || null;
        next.runtime.updatedAt = action.timestamp || nowIso();
        next.timeline = appendTimeline(next, action);

        if (!action.type) return next;

        if (action.type === "module/initialized" ||
            action.type === "module/opened" ||
            action.type === "module/closed" ||
            action.type === "module/statePatched") {
            var moduleState = normalizeModule(action.payload);
            if (!moduleState.id) return next;

            next.modules.byId[moduleState.id] = Object.assign(
                {},
                next.modules.byId[moduleState.id] || {},
                moduleState
            );

            var openIds = next.modules.openIds.filter(function(id) {
                return id !== moduleState.id;
            });

            if (moduleState.isOpen) {
                openIds.push(moduleState.id);
                next.runtime.activeModuleId = moduleState.name || moduleState.id;
                next.runtime.activeDialogId = moduleState.id;
            } else if (next.runtime.activeDialogId === moduleState.id) {
                next.runtime.activeModuleId = null;
                next.runtime.activeDialogId = openIds.length ? openIds[openIds.length - 1] : null;
            }

            next.modules.openIds = openIds;
            return next;
        }

        if (action.type === "module/buttonClicked" ||
            action.type === "module/inputInteracted" ||
            action.type === "module/errorRecorded") {
            var id = action.payload && action.payload.id;
            if (id) {
                var existing = next.modules.byId[id] || normalizeModule(action.payload);
                var updated = Object.assign({}, existing, normalizeModule(Object.assign({}, existing, action.payload)));
                if (action.type === "module/errorRecorded") {
                    updated.errors = (existing.errors || 0) + 1;
                    updated.lastError = {
                        functionName: action.payload.functionName || null,
                        message: action.payload.message || null,
                        timestamp: action.timestamp || nowIso()
                    };
                }
                next.modules.byId[id] = updated;
            }
            return next;
        }

        return next;
    }

    function createStore() {
        var state = initialState();
        var listeners = [];

        return {
            getState: function() {
                return clone(state);
            },
            dispatch: function(action) {
                if (!action || !action.type) return action;
                state = reducer(state, Object.assign({ timestamp: nowIso() }, action));
                listeners.slice().forEach(function(listener) {
                    try {
                        listener(this.getState(), action);
                    } catch (err) {
                        console.warn("ModuleRuntimeStore listener failed:", err && err.message ? err.message : err);
                    }
                }, this);
                return action;
            },
            subscribe: function(listener) {
                if (typeof listener !== "function") return function() {};
                listeners.push(listener);
                return function() {
                    listeners = listeners.filter(function(item) {
                        return item !== listener;
                    });
                };
            }
        };
    }

    if (!global.ModuleRuntimeStore) {
        global.ModuleRuntimeStore = createStore();
    }
})(typeof window !== "undefined" ? window : this);
