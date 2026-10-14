(function () {
    "use strict";

    if (window.CollaborationWorkflow) return;

    const MODES = {
        LEGACY: "legacy",
        COLLABORATIVE: "collaborative",
        OFF: "off"
    };

    function getDocId() {
        try {
            const docId = new URL(window.location.href).searchParams.get("docid");
            return docId || window.DOC_ID || globalThis.DOC_ID || "";
        } catch (error) {
            return window.DOC_ID || globalThis.DOC_ID || "";
        }
    }

    function storageKey(docid) {
        return "xmleditor:collabMode:" + String(docid || getDocId() || "").trim();
    }

    function normalizeMode(mode) {
        mode = String(mode || "").toLowerCase();
        return mode === MODES.COLLABORATIVE || mode === MODES.OFF ? mode : MODES.LEGACY;
    }

    function normalizeExplicitMode(mode) {
        mode = String(mode || "").toLowerCase();
        return mode === MODES.COLLABORATIVE || mode === MODES.OFF ? mode : "";
    }

    function getUrlMode() {
        try {
            return normalizeExplicitMode(new URL(window.location.href).searchParams.get("collabMode"));
        } catch (error) {
            return "";
        }
    }

    function getStoredMode(docid) {
        try {
            return normalizeExplicitMode(localStorage.getItem(storageKey(docid)));
        } catch (error) {
            return "";
        }
    }

    function getMode(docid) {
        return getUrlMode() || getStoredMode(docid) || MODES.LEGACY;
    }

    function setMode(mode, docid) {
        const nextMode = normalizeMode(mode);
        localStorage.setItem(storageKey(docid), nextMode);
        return nextMode;
    }

    function isLocalOrUat() {
        return !!(window.IS_LOCAL_HOST || window.IS_UAT_DOMAIN);
    }

    function isEligible() {
        const docid = getDocId();
        const sharedKey = typeof SHARED_KEY !== "undefined" ? SHARED_KEY : (window.SHARED_KEY || {});
        const isJournal = typeof IS_JOURNAL !== "undefined" ? IS_JOURNAL : window.IS_JOURNAL;
        const collabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(docid);
        const allowedClient = typeof window.hasCollabClient === "function" && window.hasCollabClient(sharedKey && sharedKey.client);
        const isCollab = allowedClient &&
            typeof sharedKey.collaborative === "string" &&
            sharedKey.collaborative.toLowerCase() === "yes";

        return !isJournal && collabEnabled && isCollab;
    }

    function createFallback(isDisabled) {
        return {
            _isEnabled: false,
            _isDisabled: !!isDisabled,
            getLockedElementsByOthers: () => ({ byOthers: [], total: 0, elements: [] }),
            _isElementLocked: () => false,
            _pauseEvents: () => false,
            _resumeEvents: () => false,
            showStatusDialog: () => false,
            show: () => false
        };
    }

    function exposeFallback(isDisabled) {
        const fallback = createFallback(isDisabled);
        window.CollaborativeModule = window.CollaborativeModule || fallback;
        window.paraLock = fallback;
        return fallback;
    }

    async function getModuleInstance(id) {
        try {
            const ms = window.moduleSystem || (typeof moduleSystem !== "undefined" ? moduleSystem : null);
            if (!ms || typeof ms.getModule !== "function") return null;
            return await ms.getModule(id);
        } catch (error) {
            console.warn("CollaborationWorkflow getModuleInstance failed:", id, error);
            return null;
        }
    }

    async function stopProvider(provider, reason, options) {
        if (!provider) return;
        if (typeof provider.stopRuntime === "function") {
            await provider.stopRuntime(reason, options || {});
        } else if (typeof provider._handleLoopTasks === "function") {
            provider._isEnabled = false;
            provider._isDisabled = false;
            provider._runtimePaused = true;
            provider._handleLoopTasks("pause");
        }
    }

    async function deactivateAll(options = {}) {
        const legacy = await getModuleInstance("paraLockSync");
        const collaborative = window.CollaborativeModule && window.CollaborativeModule.startRuntime
            ? window.CollaborativeModule
            : await getModuleInstance("collaborativeModule");

        await stopProvider(legacy, options.reason || "runtime-switch", options);
        await stopProvider(collaborative, options.reason || "runtime-switch", options);

        if (!options.keepMode) setMode(MODES.OFF, options.docid || getDocId());
        return exposeFallback(false);
    }

    function getActiveProvider() {
        const provider = window.paraLock;
        return provider && provider._isEnabled && !provider._isDisabled ? provider : null;
    }

    async function activateMode(mode, options = {}) {
        const docid = options.docid || getDocId();
        const nextMode = setMode(mode, docid);
        await deactivateAll({ reason: "switch-to-" + nextMode, keepMode: true, release: options.release });

        if (nextMode === MODES.OFF) {
            setMode(MODES.OFF, docid);
            return { r: 1, mode: nextMode, provider: exposeFallback(false) };
        }

        const editor = options.editor || window.GlobalEditor;
        const moduleId = nextMode === MODES.COLLABORATIVE ? "collaborativeModule" : "paraLockSync";
        let provider = nextMode === MODES.COLLABORATIVE && window.CollaborativeModule && window.CollaborativeModule.startRuntime
            ? window.CollaborativeModule
            : await getModuleInstance(moduleId);

        if (!provider || typeof provider.startRuntime !== "function") {
            return { r: 0, mode: nextMode, message: "Runtime provider not available." };
        }

        await provider.startRuntime(editor, options);
        window.paraLock = provider;
        if (nextMode === MODES.COLLABORATIVE) window.CollaborativeModule = provider;
        return { r: 1, mode: nextMode, provider };
    }

    window.CollaborationWorkflow = {
        MODES,
        getDocId,
        getMode,
        setMode,
        activateMode,
        deactivateAll,
        getActiveProvider,
        storageKey,
        isEligible,
        isLocalOrUat,
        createFallback,
        exposeFallback,
        normalizeMode
    };
}());
