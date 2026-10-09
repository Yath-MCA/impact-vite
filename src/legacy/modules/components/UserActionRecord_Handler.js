
class RecordUserAction {
    constructor() {
        this.RECORD_TYPE = "user_action_history";
        this.history = this.createEmptyHistory();
        this.instance = {};
        this.record_info = {
            open_close_dialog: this.createRecordInfo("open_close_dialog", true),
            // todo
            query_quick_answer: this.createRecordInfo("query_quick_answer"),
            insert_symbol: this.createRecordInfo("insert_symbol"),
            find_words: this.createRecordInfo("find_words"),
            replace_words: this.createRecordInfo("replace_words"),
            attachments_flow: this.createRecordInfo("attachments_flow"),

            video_tour: this.createRecordInfo("video_tour", true, true),
            guided_tour: this.createRecordInfo("guided_tour", true, true, API_UPDATE_INSERT)
        };

        // Load from localStorage first (immediate availability)
        this.loadHistoryFromLocalStorage();

        this.invoke("open_close_dialog");
        this.apiService = new FetchService();
        this._isSyncing = false;
    }

    createEmptyHistory() {
        return {
            open_close_dialog: {},
            query_quick_answer: [],
            insert_symbol: [],
            video_tour: [],
            guided_tour: [],
            find_words: [],
            replace_words: [],
            attachments_flow: [],
        };
    }

    trimHistoryEntries(history, keepRatio = 0.8) {
        const trimmed = this.createEmptyHistory();

        // For open_close_dialog, trim each dialog's entries
        Object.keys(history.open_close_dialog || {}).forEach(dialogKey => {
            const entries = history.open_close_dialog[dialogKey] || [];
            const keepCount = Math.ceil(entries.length * keepRatio);
            // Keep most recent entries (sorted by time)
            trimmed.open_close_dialog[dialogKey] = entries.slice(-keepCount);
        });

        // For arrays, trim each
        ['query_quick_answer', 'insert_symbol', 'video_tour', 'guided_tour', 'find_words', 'replace_words', 'attachments_flow'].forEach(key => {
            const entries = history[key] || [];
            const keepCount = Math.ceil(entries.length * keepRatio);
            trimmed[key] = entries.slice(-keepCount);
        });

        // Legacy support: if old key is present, fold into new channel before trim
        if (Array.isArray(history.supp_file_workflow) && history.supp_file_workflow.length > 0) {
            const legacyEntries = history.supp_file_workflow;
            const keepCount = Math.ceil(legacyEntries.length * keepRatio);
            trimmed.attachments_flow = [...trimmed.attachments_flow, ...legacyEntries.slice(-keepCount)];
        }

        return trimmed;
    }

    normalizeDialogGroupKey(update = {}) {
        return String(update.dialog_id || update.module_name || "unknown").trim() || "unknown";
    }

    ensureOpenCloseBucket(history = {}) {
        if (!history.open_close_dialog || Array.isArray(history.open_close_dialog)) {
            history.open_close_dialog = {};
        }
        return history.open_close_dialog;
    }

    getLatestOpenSession(entries = []) {
        const closedSessions = new Set();
        for (let index = entries.length - 1; index >= 0; index--) {
            const entry = entries[index] || {};
            if (entry.action === "close" && entry._session != null) {
                closedSessions.add(entry._session);
                continue;
            }

            if (entry.action === "open" && entry._session != null && !closedSessions.has(entry._session)) {
                return entry;
            }
        }

        return null;
    }

    normalizeOpenCloseHistory(data) {
        const grouped = {};
        const entries = Array.isArray(data) ? data : [];

        entries.forEach(entry => {
            if (!entry || typeof entry !== "object") return;
            const groupKey = this.normalizeDialogGroupKey(entry);
            if (!grouped[groupKey]) grouped[groupKey] = [];
            grouped[groupKey].push(entry);
        });

        return grouped;
    }
    // localStorage — already correct after fix
    getLocalStorageKey() {
        let docid = null;
        try {
            const url = new URL(window.location.href);
            docid = url.searchParams.get("docid");
        } catch (e) {
            docid = null;
        }
        return `xmleditor:${this.RECORD_TYPE}:${docid || "no-docid"}`;
    }

    loadHistoryFromLocalStorage() {
        try {
            const key = this.getLocalStorageKey();
            if (key.endsWith("no-docid")) {
                // Retry later if docid not available
                setTimeout(() => {
                    this.loadHistoryFromLocalStorage();
                // retry after 2 seconds
                }, 2000);
                return false;
            }

            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === "object") {
                    this.history = this.normalizeHistoryData(parsed);
                    debug.log("Loaded history from localStorage");
                    return true;
                }
            }
        } catch (err) {
            console.warn("Failed to load history from localStorage:", err.message);
        }
        return false;
    }


    mergeHistoryByTimestamp(localHistory, serverHistory) {
        const merged = this.createEmptyHistory();

// Helper to get timestamp value
        const getTime = (entry) => {
          const t = (entry && entry.time_c && entry.time_c.$numberLong) || 
          (entry && entry.time_c) || 
          0;
          return parseInt(t, 10) || 0;
      };

// Helper to create unique key for an entry
      const getEntryKey = (entry) => {
          const sessionId = (entry && entry._session) || 'no_session';
          const action = (entry && entry.action) || 'unknown';
          return `${sessionId}_${action}`;
      };


        // Helper to create stable keys for array entries to avoid time-only collisions.
      const getArrayEntryKey = (entry = {}, index = 0) => {
        const t = getTime(entry);
        const signature = [
            t,
            entry.action || '',
            entry.process || '',
            entry.filename || '',
            entry.oldfilename || '',
            entry.dialog_id || '',
            entry._session || '',
            entry.time_iso || '',
            entry.info || ''
        ].join('|');

            // If signature is effectively empty except timestamp, include index to prevent overwrite.
        if (signature === `${t}||||||||`) {
            return `${t}|idx:${index}`;
        }

        return signature;
    };

        // Merge open_close_dialog (object with dialog keys)
    const localOCD = localHistory.open_close_dialog || {};
    const serverOCD = serverHistory.open_close_dialog || {};
    const allDialogKeys = new Set([...Object.keys(localOCD), ...Object.keys(serverOCD)]);

    for (const dialogKey of allDialogKeys) {
        const localEntries = localOCD[dialogKey] || [];
        const serverEntries = serverOCD[dialogKey] || [];

            // Map entries by session+action for comparison
        const entryMap = new Map();

            // Add local entries first
        localEntries.forEach(e => {
            entryMap.set(getEntryKey(e), {
                entry: e,
                source: 'local'
            });
        });

            // Merge server entries (newer timestamp wins)
        serverEntries.forEach(e => {
            const key = getEntryKey(e);
            const existing = entryMap.get(key);
            const serverTime = getTime(e);

            if (!existing) {
                    // New entry from server
                entryMap.set(key, {
                    entry: e,
                    source: 'server'
                });
            } else {
                const localTime = getTime(existing.entry);
                if (serverTime >= localTime) {
                        // Server entry is newer or equal, replace
                    entryMap.set(key, {
                        entry: e,
                        source: 'server'
                    });
                }
                    // else: keep local (it's newer)
            }
        });

            // Convert back to array, sorted by time
        merged.open_close_dialog[dialogKey] = Array.from(entryMap.values())
        .map(v => v.entry)
        .sort((a, b) => getTime(a) - getTime(b));
    }

        // Merge arrays (query_quick_answer, insert_symbol, etc.)
    const arrayKeys = ['query_quick_answer', 'insert_symbol', 'video_tour', 'guided_tour', 'find_words', 'replace_words', 'attachments_flow'];

    for (const key of arrayKeys) {
        const localArr = localHistory[key] || [];
        const serverArr = serverHistory[key] || [];

        const entryMap = new Map();

            // Add local entries
        localArr.forEach((e, index) => {
            const key = getArrayEntryKey(e, index);
            entryMap.set(key, {
                entry: e,
                source: 'local'
            });
        });

            // Merge server entries (newer wins on conflict)
        serverArr.forEach((e, index) => {
            const key = getArrayEntryKey(e, index);
            const existing = entryMap.get(key);
            const serverTime = getTime(e);

            if (!existing || serverTime >= getTime(existing.entry)) {
                entryMap.set(key, {
                    entry: e,
                    source: 'server'
                });
            }
        });

        merged[key] = Array.from(entryMap.values())
        .map(v => v.entry)
        .sort((a, b) => getTime(a) - getTime(b));
    }

    return merged;
}

normalizeHistoryData(data) {
    const normalized = this.createEmptyHistory();
    let parsed = data;

    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        } catch (err) {
            parsed = null;
        }
    }

    if (!parsed || typeof parsed !== "object") {
        return normalized;
    }

    Object.keys(normalized).forEach(key => {
        if (key === "open_close_dialog") {
            if (Array.isArray(parsed[key])) {
                normalized[key] = this.normalizeOpenCloseHistory(parsed[key]);
            } else if (parsed[key] && typeof parsed[key] === "object") {
                const openClose = {};
                Object.keys(parsed[key]).forEach(dialogId => {
                    if (Array.isArray(parsed[key][dialogId])) {
                        openClose[dialogId] = parsed[key][dialogId];
                    }
                });
                normalized[key] = openClose;
            }
        } else if (Array.isArray(parsed[key])) {
            normalized[key] = parsed[key];
        }
    });

        // Legacy migration: old supplementary channel renamed to attachments_flow
    if (Array.isArray(parsed.supp_file_workflow) && parsed.supp_file_workflow.length > 0) {
        normalized.attachments_flow = [...(normalized.attachments_flow || []), ...parsed.supp_file_workflow];
    }

    return normalized;
}

createRecordInfo(key, addSessionId = false, ignoreLocalStorage = false, setEndpoint = API_FIND_UPDATE_INSERT) {
    return {
        primary_key: key,
        local_keys: [key],
        get_endpoint: API_GET_ADMINDOCS,
        set_endpoint: setEndpoint,
        ignore_local_storage: ignoreLocalStorage,
        fetch_first_time: false,
        add_in_find: addSessionId ? ['session_id'] : [],
        empty_set: {
            [key]: []
        },
        fire_evt: {
            'click': "",
            'onkeydown': ""
        }
    };
}

payLoad(Options = {}) {
    try {
        return {
            "tbl": "UserPreference",
            "find": {
                "recordtype": this.RECORD_TYPE,
                "username": USER_INFO.MAIL_ID,
                "docid": DOC_ID,
                "rolename": USER_INFO.TRACK_ROLE_NAME,
                "session_id": getSessionId()
            }
        };
    } catch (err) {
            // console.warn(err.message);
        this.logError('payLoad', err);
    }
}

DB_SET_CB(response) {
    try {
        debug.log(JSON.stringify(response));
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('DB_SET_CB', err.message);
    }
}

updateSyncLocal(group, options = {}) {
    if (this.instance && this.instance.ignore_local_storage) return;
    try {
        const set_Key = this.getLocalStorageKey();
        const payload = typeof group === "string" ? group : JSON.stringify(group);

            // Check size before storing (rough estimate: 2 bytes per char)
        const sizeInMB = (payload.length * 2) / (1024 * 1024);
            // Leave 0.5MB buffer
            if (sizeInMB > 4.5) {
                console.warn(`History data too large (${sizeInMB.toFixed(2)}MB), trimming oldest entries`);
                // Trim oldest 20% of entries from each array
                const trimmed = this.trimHistoryEntries(group);
                const trimmedPayload = JSON.stringify(trimmed);
                localStorage.setItem(set_Key, trimmedPayload);
            } else {
                localStorage.setItem(set_Key, payload);
            }
        } catch (err) {
            if (err.name === 'QuotaExceededError' || err.code === 22) {
                console.warn('localStorage quota exceeded, trimming history');
                // Emergency trim and retry
                // Keep only 50%
                const trimmed = this.trimHistoryEntries(group, 0.5);
                try {
                    localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(trimmed));
                } catch (retryErr) {
                    console.error('Failed to store even after trimming:', retryErr.message);
                    ErrorLogTrace('UPDATE_LOCAL_STORAGE_TRIM', retryErr.message);
                }
            } else {
                console.warn(err.message);
                ErrorLogTrace('UPDATE_LOCAL_STORAGE', err.message);
            }
        }
    }

    responseHandler(response, options = {}) {
        try {
            if (response && response.data) {
                if (response.data.length === 0) {
                    debug.log('no record founds on server');
                    // Keep localStorage history (already loaded in constructor)
                    this.updateSyncLocal(this.history, {});
                } else if (response.data && response.data.length > 0) {
                    // Handle new format: data is under 'history' property
                    const rawData = response.data[0];
                    const serverHistory = rawData.history || rawData;
                    const normalizedServerHistory = this.normalizeHistoryData(serverHistory);

                    // Smart merge: localStorage data vs server data
                    // Newer timestamps win for each session
                    const localHistory = this.history;
                    this.history = this.mergeHistoryByTimestamp(localHistory, normalizedServerHistory);

                    this.updateSyncLocal(this.history, {});
                    debug.log('History merged from localStorage and server');
                }
            } else {
                debug.log('Invalid response received');
            }
        } catch (err) {
            console.warn(err.message);
        }
    }

    fetchRecords(response, options = {}) {
        try {
            let json = this.payLoad(options);
            if (options.Init === true) {
                commonfn.callajax(json, 'responseHandler', this.instance.get_endpoint, this);
                if (!this.FullyLoaded && typeof this.Init === "function") {
                    this.Init();
                }
            }
        } catch (err) {
            debug.log(err.message);
            ErrorShareMail('FETCH_DB', err.message);
        }
    }

    updateActivity(localKey, update = {}) {

        try {
            // Guard: if instance not yet set, ignore_local_storage defaults to false (safe to proceed)
            if (this.instance && this.instance.ignore_local_storage) {
                debug.log('Local storage is ignored, skipping local update.');
                return;
            }
            // resolve localKey
            if (!localKey || localKey === 0) {
                localKey = (this.instance.local_keys && this.instance.local_keys[0]) ||
                this.instance.primary_key ||
                null;
            }
            if (!localKey) return;

            const historyKey = String(localKey).trim();

            if (historyKey === "open_close_dialog") {
                const dialogKey = this.normalizeDialogGroupKey(update);
                const openCloseHistory = this.ensureOpenCloseBucket(this.history);
                if (!openCloseHistory[dialogKey]) {
                    openCloseHistory[dialogKey] = [];
                }

                const sessions = openCloseHistory[dialogKey];
                if (update.action === "open") {
                    update._session = sessions.filter(e => e && e.action === "open").length + 1;
                } else if (update.action === "close") {
                    const lastOpen = this.getLatestOpenSession(sessions);
                    update._session = lastOpen ? lastOpen._session : null;
                }

                sessions.push(update);
            } else {
                if (!Array.isArray(this.history[historyKey])) {
                    this.history[historyKey] = [];
                }
                this.history[historyKey].push(update);
            }

            this.updateSyncLocal(this.history, {
                localKey: historyKey
            });
        } catch (err) {
            console.warn(err.message);
        }
    }

    invoke(module_key, Options = {}, primaryJson = {}) {
        try {
            // Handle wrong argument order from legacy calls
            // Legacy: invoke(this, 'open_close_dialog', { Init: true })
            // Correct: invoke('open_close_dialog', { Init: true })
            let actualModuleKey = module_key;
            let actualOptions = Options;
            let actualPrimaryJson = primaryJson;

            // Detect wrong argument order: if module_key is an object (dialog instance)
            // and Options is a string (the actual module key)
            if (typeof module_key === 'object' && module_key !== null &&
                typeof Options === 'string' && primaryJson && typeof primaryJson === 'object') {
                // Wrong order detected - fix it
                // The string is the actual module key
                actualModuleKey = Options;
                // The object with Init is the actual options
                actualOptions = primaryJson;
                actualPrimaryJson = {};
                debug.log('Fixed wrong argument order in invoke call');
            }

            if (!this.record_info[actualModuleKey]) {
                if (!actualPrimaryJson) return;
                this.record_info[actualModuleKey] = actualPrimaryJson;
            }

            this.instance = this.record_info[actualModuleKey];

            if (this.instance && !this.instance.fetch_first_time) {
                if (actualOptions.Init === true) {
                    this.fetchRecords(null, actualOptions);
                    // ← only locked after real fetch
                    this.instance.fetch_first_time = true;
                }
                // no Init = just sets this.instance, no side effects
            } else if (this.instance && this.instance.fetch_first_time) {
                debug.log(`Already fetched records for ${actualModuleKey} module, skipping fetch.`);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('invoke', err.message);
        }
    }
    // In RecordUserAction class
    async syncUserActionHistory(options = {}) {
        const useKeepalive = options.keepalive === true;

        // Prevent concurrent syncs
        if (this._isSyncing) {
            debug.log('Sync already in progress, skipping');
            return;
        }

        try {
            this._isSyncing = true;

            const hasData = Object.keys(this.history.open_close_dialog || {}).length > 0 ||
            (this.history.query_quick_answer || []).length > 0 ||
            (this.history.insert_symbol || []).length > 0 ||
            (this.history.attachments_flow || []).length > 0;

            if (!hasData) {
                debug.log('No user action history to sync');
                return;
            }

            var defaultData = GET_JSON("default_main");

            const json = {
                ...this.payLoad(),
                "update": {
                    "recordtype": this.RECORD_TYPE,
                    "history": this.history,
                    ...defaultData
                }
            };

            const endpoint = (this.instance && this.instance.set_endpoint) || API_FIND_UPDATE_INSERT;

            const requestOptions = {
                isPayloadLogic: true
            };
            if (useKeepalive) {
                requestOptions.keepalive = true;
            }

            const result = await this.apiService.makeRequest(endpoint, json, requestOptions);

            if (result && result.r == 1) {
                debug.log('User action history synced successfully');
            } else {
                console.warn('User action history sync failed:', result);
            }
        } catch (err) {
            const message = err && err.message ? err.message : String(err);
            const isUnloadAbort = useKeepalive && (
                err instanceof TypeError ||
                /NetworkError|Failed to fetch|Load failed/i.test(message)
                );

            if (isUnloadAbort) {
                debug.log('syncUserActionHistory unload sync aborted (expected on page exit):', message);
            } else {
                console.warn('syncUserActionHistory error:', message);
                ErrorLogTrace('syncUserActionHistory', message);
            }
        } finally {
            this._isSyncing = false;
        }
    }

    trackDialogOpenClose(action, options = {}) {
        try {
            if (typeof this.updateActivity !== "function") {
                return false;
            }

            const now = options.timestamp instanceof Date ? options.timestamp : new Date();
            const hasDuration = typeof options.durationMs === "number" && Number.isFinite(options.durationMs);
            const durationMs = hasDuration ? Math.max(0, Math.round(options.durationMs)) : null;
            const dialogId = String(options.dialog_id || options.remark || "unknown").trim() || "unknown";
            const info = Object.prototype.hasOwnProperty.call(options, "info") ?
            options.info :
            (options.isDirectClose ? "without any update" : "");

            this.updateActivity("open_close_dialog", {
                action,
                remark: options.remark || dialogId,
                info,
                dialog_id: dialogId,
                durationMs,
                isDirectClose: !!options.isDirectClose,
                time_c: now.getTime(),
                time_iso: now.toISOString()
            });
            return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('trackDialogOpenClose', err.message);
            return false;
        }
    }

    trackAttachmentsFlow(update = {}) {
        try {
            if (typeof this.updateActivity !== "function") {
                return false;
            }

            const now = update.timestamp instanceof Date ? update.timestamp : new Date();
            const payload = {
                filename: update.filename || "",
                oldfilename: update.oldfilename || "",
                username: update.username || USER_INFO.MAIL_ID,
                role: update.role || USER_INFO.TRACK_ROLE_NAME,
                process: update.process || "",
                existing_payload: update.existing_payload || null,
                status: update.status || "",
                time_c: now.getTime(),
                time_iso: now.toISOString()
            };

            this.updateActivity("attachments_flow", payload);
            return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('trackAttachmentsFlow', err.message);
            return false;
        }
    }

    // Backward-compatible wrapper while modules migrate to trackAttachmentsFlow.
    trackSuppFileWorkflow(update = {}) {
        try {
            return this.trackAttachmentsFlow(update);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('trackSuppFileWorkflow', err.message);
            return false;
        }
    }
}

function getRecordUserAction() {
    try {
        if (typeof window !== "undefined") {
            return window.recordUserActionSingleton || window.RECORD_USER_ACTION || null;
        }
    } catch (err) {
        console.warn(err.message);
    }
    return null;
}

if (typeof window !== "undefined") {
    window.RecordUserAction = RecordUserAction;
    window.getRecordUserAction = getRecordUserAction;
    window.recordUserActionSingleton = window.recordUserActionSingleton || new RecordUserAction();
    // window.RECORD_USER_ACTION = window.recordUserActionSingleton;
}


