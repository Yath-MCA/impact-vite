/*jslint white:true, for:true */
/*global $, API_LINK_SHARE, API_GET_DOCS, ADD_DEFAULT_KEYS, GET_JSON, DOC_ID, NEW_SESSION_ID, SHARED_KEY, USER_INFO,
    IS_LOCAL_HOST, IS_TRACK_VIEW, ErrorLogTrace, EnhancedErrorTracker, moment, Request_ID, APP_KEY, API_KEY, AlertNewDialog, Swal,
    commonfn, commonMethods, GlobalEditor, IMPACT_SAVE, _CanClose,
    _IsDirty, FinalizeDialog, NG_WEB_URL, CKEDITOR, debug, getRequestDialog, openRequestDialog,
    LinkSessionLocalHost,
    setSessionState, message_broadcast, STOP_ALL_EVENT_TIMERS, LOG_OUT, RE_DIRECT_CUR_SESSION,
    CAN_INITIATE_MODULE, API_FIND_UPDATE_INSERT, OPEN_TIME, CHECK_REQUEST */

/**
 * LinkSessionCore — shared linksharing session logic (landing + editor).
 * UI: link_session_send (landing), link_session_request (editor).
 */

class LinkSessionCore {
    static get PROCESS() {
        return {
            CHECK: 'check',
            REFRESH: 'refresh',
            SCHEDULER: 'scheduler',
            UPDATE_REQSTATUS_TIME: 'update_reqstatus_time',
            UPDATE_DOCSTATUS_REQSTATUS_INSERT_TIME: 'update_docstatus_reqstatus_insert_time',
            UPDATEREQUESTSTATUS: 'updaterequeststatus',
            UPDATESTATUS_REQSTATUS: 'updatestatus_reqstatus',
            UPDATEREQSTATUS: 'updatereqstatus',
            GETREQUESTSTATUS_PROCESS: 'getrequeststatus_process',
            CLOSE: 'close',
            SAVE: 'save',
            UPDATE_SESSION_END_TIME: 'update_session_end_time',
            UPDATE_REQ_STATUS: 'update_req_status',
            SIGNOFF: 'signoff'
        };
    }

    static get DOC_STATUS() {
        return {
            ACTIVE: '1',
            INACTIVE: '0'
        };
    }

    static get REQUEST_STATUS() {
        return {
            PENDING: '1',
            ACCEPTED: '2',
            REJECTED: '4'
        };
    }

    /** Idle grace after Ready before idle alert may fire (ms). */
    static get IDLE_GRACE_MS() {
        return 5 * 60 * 1000;
    }

    /** Reasons that mean "cannot reach getdocs" — save should postpone, not stale-redirect. */
    static get SAVE_POSTPONE_REASONS() {
        return ['request_error', 'getdocs_unavailable'];
    }

    /** Reasons that mean session is stale / not owned — save should block + redirect. */
    static get SAVE_STALE_REASONS() {
        return ['no_active_row', 'record_mismatch', 'multiple_active', 'missing_expected_fields', 'missing_session_id'];
    }

    /** Silent landing dual-guard recovery: process check + remarks landing_retry. */
    static get LANDING_RETRY_MAX() {
        return 3;
    }

    static get LANDING_RETRY_REMARKS() {
        return 'landing_retry';
    }

    static get VERIFY_DEPENDENCY_WAIT_MS() {
        return 3000;
    }

    static get VERIFY_DEPENDENCY_POLL_MS() {
        return 100;
    }

    static get VERIFY_TRANSIENT_REASONS() {
        return ['no_active_row', 'record_mismatch', 'getdocs_unavailable', 'request_error'];
    }

    static get VERIFY_TRANSIENT_RETRY_MAX() {
        return 3;
    }

    static get VERIFY_TRANSIENT_RETRY_DELAY_MS() {
        return 850;
    }

    /**
     * Java linksharing $set field per process (see linksharing_mongo_db_operation.java).
     * Processes that only use insert `remarks` (e.g. check) are omitted.
     */
    static get PROCESS_REMARK_KEY() {
        return {
            update_docstatus_reqstatus_insert_time: 'update_docstatus_reqstatus_insert_time_remarks',
            update_reqstatus_time: 'update_reqstatus_time_remarks',
            updaterequeststatus: 'updaterequeststatus_remarks',
            updatestatus_reqstatus: 'updatestatus_reqstatus_remarks',
            update_req_status: 'update_req_status_remarks',
            getrequeststatus_process: 'getrequeststatus_process_remarks',
            updatereqstatus: 'updatereqstatus_remarks',
            close: 'close_remarks',
            save: 'save_remarks',
            update_session_end_time: 'update_session_end_time_remarks'
        };
    }

    /** Default remark text when caller omits remarks (aligned with Java audit fields). */
    static get PROCESS_REMARK_DEFAULT() {
        return {
            check: 'landing',
            refresh: 'editor-refresh',
            update_docstatus_reqstatus_insert_time: 'takeover',
            update_reqstatus_time: 'send_request',
            updaterequeststatus: 'accept_open',
            updatestatus_reqstatus: 'status_change',
            update_req_status: 'clear_rejected',
            getrequeststatus_process: 'poll',
            updatereqstatus: 'rejected_by_collator',
            close: 'close',
            save: 'save',
            update_session_end_time: 'clear_end_time'
        };
    }

    /**
     * Set generic `remarks` only for check; other processes use process-specific `*_remarks`.
     * @param {Object} payload
     * @param {string} [process]
     * @param {string} [remarkValue]
     * @returns {Object} payload
     */
    static attachProcessRemarks(payload, process, remarkValue) {
        if (!payload || typeof payload !== 'object') {
            return payload;
        }
        const p = String(process || payload.process || '').toLowerCase();
        let value = remarkValue;
        if (value == null || value === '') {
            value = payload.remarks;
        }
        if ((value == null || value === '') && LinkSessionCore.PROCESS_REMARK_DEFAULT[p]) {
            value = LinkSessionCore.PROCESS_REMARK_DEFAULT[p];
        }
        if (value != null && value !== '') {
            const text = String(value);
            if (p === LinkSessionCore.PROCESS.CHECK) {
                payload.remarks = text;
            } else {
                delete payload.remarks;
            }
            const field = LinkSessionCore.PROCESS_REMARK_KEY[p] || (p && `${p}_remarks`);
            if (field && p !== LinkSessionCore.PROCESS.CHECK) {
                payload[field] = text;
            }
        } else if (p !== LinkSessionCore.PROCESS.CHECK) {
            delete payload.remarks;
        }
        return payload;
    }

    /**
     * Map confirmSessionOnServer reason → save action.
     * @returns {'allow'|'postpone'|'stale'}
     */
    static mapSaveValidationReason(verify) {
        if (!verify) {
            return 'stale';
        }
        if (verify.ok) {
            return 'allow';
        }
        const reason = String(verify.reason || '');
        if (LinkSessionCore.SAVE_POSTPONE_REASONS.indexOf(reason) !== -1) {
            return 'postpone';
        }
        if (LinkSessionCore.SAVE_STALE_REASONS.indexOf(reason) !== -1) {
            return 'stale';
        }
        return 'stale';
    }

    static getInstance() {
        if (!LinkSessionCore._instance) {
            LinkSessionCore._instance = new LinkSessionModule();
        }
        return LinkSessionCore._instance;
    }

    constructor() {
        this._name = 'link_session';
        this._id = 'link_session';
        this._schedulerInterval = null;
        this._schedulerOwner = null;
        this._editorOwner = null;
        this._landingCtxState = null;
        this._editorTabId = null;
        this._errorTracker = (typeof EnhancedErrorTracker === 'function') ?
            new EnhancedErrorTracker() :
            null;
        if (typeof globalThis.commonfn === "undefined") {
            globalThis.commonfn = {};
        }
    }

    /**
     * BaseModule-shaped error logger: prefer EnhancedErrorTracker, fall back to ErrorLogTrace.
     * @param {string} functionName
     * @param {Error|string} err
     */
    logError(functionName, err) {
        const message = err && err.message != null ? err.message : String(err || '');
        try {
            if (this._errorTracker && typeof this._errorTracker.logError === 'function') {
                this._errorTracker.logError(
                    this._name || 'link_session',
                    functionName,
                    err instanceof Error ? err : message
                );
                return;
            }
        } catch (trackerErr) {
            console.warn(trackerErr && trackerErr.message);
        }
        console.warn(`[LinkSessionCore.${functionName}]`, message);

        if (typeof ErrorLogTrace === 'function') {
            // ErrorLogTrace(`LinkSessionCore.${functionName}`, message);
        }
    }

    /**
     * Static helper for bootstrap/ports (no `this`).
     */
    static logErrorStatic(functionName, err) {
        try {
            const instance = typeof LinkSessionCore.getInstance === 'function' ?
                LinkSessionCore.getInstance() :
                null;
            if (instance && typeof instance.logError === 'function') {
                instance.logError(functionName, err);
                return;
            }
        } catch (e) {}
        const message = err && err.message != null ? err.message : String(err || '');
        console.warn(`[LinkSessionCore.${functionName}]`, message);
    }

    static installSessionGlobals(instance) {
        if (!instance) {
            return;
        }
        window.getSessionIdKey = function(docid) {
            return instance.getSessionIdKey(docid);
        };
        window.getSessionId = function(docid) {
            return instance.readSessionId(docid);
        };
        window.getCurrentSessionId = function() {
            return instance.getCurrentSessionId();
        };
        window.getCurrentTabId = function() {
            return instance.getCurrentTabId();
        };
        window.updateEditorSessionStorage = function(sessionId, docid, lastSavedTime, sessionStartTime) {
            return instance.updateEditorSessionStorage(sessionId, docid, lastSavedTime, sessionStartTime);
        };

        window.syncEditorStorageAfterDocIdInit = function(docid) {
            return instance.syncEditorStorageAfterDocIdInit(docid);
        };
        window.clearEditorTabId = function(docid) {
            return instance.clearEditorTabId(docid);
        };
        window.confirmLinkSessionOnServer = function(expected) {
            return instance.confirmSessionOnServer(expected || {});
        };
        if (typeof commonfn !== 'undefined' && commonfn) {
            commonfn.new_session_post = function(response, opt) {
                return instance.handleNewSessionPost(response, opt);
            };
        }
    }

    logSessionGate(stage, details) {
        try {
            const payload = Object.assign({
                stage: stage,
                ok: details && details.ok,
                reason: details && details.reason,
                docid: details && details.docid,
                session_id: details && details.session_id
            }, details || {});
            console.info('[LinkSessionGate]', payload);
            // this.logError('LinkSessionGate', JSON.stringify(payload));
        } catch (err) {
            console.warn(err.message);
        }
    }

    logClosePayload(payload) {
        try {
            const remarkField = LinkSessionCore.PROCESS_REMARK_KEY[payload && payload.process];
            const line = {
                process: payload && payload.process,
                source: payload && payload.source,
                remarks: payload && (payload.remarks || (remarkField && payload[remarkField])),
                session_id: payload && payload.session_id,
                docid: payload && payload.docid
            };
            console.info('[LinkSessionClose]', line);
            this.logError('LinkSessionClose', JSON.stringify(line));
        } catch (err) {
            console.warn(err.message);
        }
    }

    captureLandingCtxState(ctx) {
        if (!ctx) {
            return;
        }
        this._landingCtxState = {
            sessionStartTime: ctx.sessionStartTime,
            grantSessionStartTime: ctx.grantSessionStartTime,
            docId: ctx.docId,
            sessionId: ctx.sessionId,
            requestId: ctx.requestId
        };
    }

    mergeLandingCtxState(ctx) {
        if (!ctx || !this._landingCtxState) {
            return ctx;
        }
        if (this._landingCtxState.sessionStartTime) {
            ctx.sessionStartTime = this._landingCtxState.sessionStartTime;
        }
        if (this._landingCtxState.grantSessionStartTime) {
            ctx.grantSessionStartTime = this._landingCtxState.grantSessionStartTime;
        }
        if (!ctx.docId && this._landingCtxState.docId) {
            ctx.docId = this._landingCtxState.docId;
        }
        if (!ctx.sessionId && this._landingCtxState.sessionId) {
            ctx.sessionId = this._landingCtxState.sessionId;
        }
        if (!ctx.requestId && this._landingCtxState.requestId) {
            ctx.requestId = this._landingCtxState.requestId;
        }
        return ctx;
    }

    // -------------------------------------------------------------------------
    // Session storage / tab helpers
    // -------------------------------------------------------------------------
    getDocId() {
        return window.GET_DOC_ID ? window.GET_DOC_ID() : (typeof DOC_ID !== 'undefined' ? DOC_ID : String(new URLSearchParams(window.location.search || '').get('docid') || '').trim() || '');
    }
    getSessionIdKey(docId) {
        const id = String(docId || (this.getDocId()) || '').trim();
        return `xmleditor:sessionid:${id}`;
    }

    getTabIdKey() {
        return 'xmleditor:tabid';
    }

    /**
     * Read persisted session id from sessionStorage (with localStorage backup).
     * Not the random id generator — use generateSessionId() for that.
     */
    readSessionId(docId) {
        try {

            const id = String(docId || (this.getDocId() || '')).trim();
            const scopeKey = this.getSessionIdKey(id);
            let scopeResults = null;

            try {
                scopeResults = sessionStorage.getItem(scopeKey);
            } catch (err) {
                scopeResults = null;
            }
            let backupSession = null;
            try {
                if (typeof localStorage !== 'undefined' && localStorage) {
                    const backupKey = 'xmleditor:sessionbackup:' + id;
                    const backupResults = localStorage.getItem(backupKey) || '{}';
                    const backupJson = JSON.parse(backupResults);
                    backupSession = backupJson[scopeKey];
                }
            } catch (e) {
                console.warn('Invalid backup JSON', e);
            }
            return scopeResults || backupSession || null;
        } catch (err) {
            console.warn(err.message);
            return null;
        }
    }

    getCurrentSessionId() {
        return String(this.readSessionId() || '').trim();
    }

    getCurrentTabId() {
        try {
            if (this._editorTabId) {
                return String(this._editorTabId).trim();
            }
            return String(sessionStorage.getItem(this.getTabIdKey()) || '').trim();
        } catch (err) {
            return '';
        }
    }

    ensureEditorTabId(docId) {
        const key = this.getTabIdKey();
        let tabId = this.getCurrentTabId();
        if (!tabId) {
            tabId = String((new Date().getTime()) + '_' + Math.random());
        }
        this._editorTabId = tabId;
        const normalizedDocId = String(docId || (this.getDocId() || '')).trim();
        try {
            // Tab id is per browser tab only — never mirror into sessionbackup.
            if (typeof setSessionState === 'function') {
                setSessionState(key, tabId, {
                    mirror: false,
                    docid: normalizedDocId
                });
            } else {
                sessionStorage.setItem(key, tabId);
            }
        } catch (err) {
            console.warn(err.message);
        }
        return tabId;
    }

    /**
     * Clear editor tab id so next open uses process:check with a fresh session_id,
     * not endless refresh of a closed id.
     */
    clearEditorTabId(docId) {
        const key = this.getTabIdKey();
        const normalizedDocId = String(docId || (this.getDocId() || '')).trim();
        this._editorTabId = null;
        try {
            sessionStorage.removeItem(key);
            if (typeof setSessionState === 'function' && normalizedDocId) {
                setSessionState(key, '', {
                    mirror: true,
                    docid: normalizedDocId
                });
            }
            if (typeof localStorage !== 'undefined' && localStorage && normalizedDocId) {
                const backupKey = 'xmleditor:sessionbackup:' + normalizedDocId;
                const raw = localStorage.getItem(backupKey);
                if (raw) {
                    try {
                        const backup = JSON.parse(raw) || {};
                        if (Object.prototype.hasOwnProperty.call(backup, key)) {
                            delete backup[key];
                            localStorage.setItem(backupKey, JSON.stringify(backup));
                        }
                    } catch (parseErr) {
                        // ignore corrupt backup
                    }
                }
            }
        } catch (err) {
            console.warn(err.message);
        }
    }

    syncEditorStorageAfterDocIdInit(docid) {
        try {
            const normalizedDocId = String(docid || (this.getDocId() || '')).trim() ||
                String(new URLSearchParams(window.location.search || '').get('docid') || '').trim();
            const tabId = this.ensureEditorTabId(normalizedDocId);
            const sessionKey = this.getSessionIdKey(normalizedDocId);
            const storageSessionId = String(
                this.readSessionId(normalizedDocId) ||
                sessionStorage.getItem(sessionKey) ||
                ''
            ).trim();

            if (storageSessionId) {
                if (typeof setSessionState === 'function') {
                    setSessionState(sessionKey, storageSessionId, {
                        mirror: true,
                        docid: normalizedDocId
                    });
                } else {
                    sessionStorage.setItem(sessionKey, storageSessionId);
                }
            }
            if (normalizedDocId) {
                if (typeof setSessionState === 'function') {
                    setSessionState('docid', normalizedDocId, {
                        mirror: true,
                        docid: normalizedDocId
                    });
                } else {
                    sessionStorage.setItem('docid', normalizedDocId);
                }
            }
            localStorage.openpages = JSON.stringify({
                docid: normalizedDocId,
                tabId: tabId,
                ts: typeof OPEN_TIME !== 'undefined' ? OPEN_TIME : Date.now()
            });
        } catch (err) {
            console.warn(err.message);
        }
    }

    updateEditorSessionStorage(sessionId, docid, lastSavedTime, sessionStartTime) {
        try {
            if (!sessionId) {
                return;
            }
            const normalizedDocId = String(docid || (this.getDocId() || '')).trim();
            const sessionKey = this.getSessionIdKey(normalizedDocId);
            if (typeof setSessionState === 'function') {
                setSessionState(sessionKey, sessionId, {
                    mirror: true,
                    docid: normalizedDocId
                });
            } else {
                sessionStorage.setItem(sessionKey, sessionId);
            }
            if (normalizedDocId) {
                if (typeof setSessionState === 'function') {
                    setSessionState('docid', normalizedDocId, {
                        mirror: true,
                        docid: normalizedDocId
                    });
                } else {
                    sessionStorage.setItem('docid', normalizedDocId);
                }
            }
            if (lastSavedTime) {
                if (typeof setSessionState === 'function') {
                    setSessionState('session_last_saved_time', String(lastSavedTime), {
                        mirror: true,
                        docid: normalizedDocId
                    });
                } else {
                    sessionStorage.setItem('session_last_saved_time', String(lastSavedTime));
                }
            }
            if (sessionStartTime) {
                this.persistSessionStartTime(sessionStartTime, normalizedDocId);
            }
        } catch (err) {
            console.warn(err.message);
        }
    }

    response_handler(response) {
        // Defensive checks
        if (!response) {
            return {};
        }

        // If success or data exists
        if (response.r === 1 || (response.data && response.data.length > 0)) {
            const responseData = (response.data && response.data[0]) ? response.data[0] : response;
            return responseData || {};
        }

        // If "no records found"
        if (response.r === 0 && response.message === "no records found") {
            console.warn("temporary return");
            return {};
        }

        // Default fallback
        return {};
    }
    handleNewSessionPost(response, opt) {
        /*  const resolveSessionCheck = (result) => {
             try {
                 if (opt && typeof opt.__sessionCheckResolve === 'function') {
                     opt.__sessionCheckResolve(result);
                 }
             } catch (resolveErr) {
                 console.warn(resolveErr.message);
             }
         };
 
         try {
             console.log('--new_session_post--return--');
             // Resolve docId safely
             const docId = this.getDocId();
             const responseData = this.response_handler(response);
             const existingSessionId = String(typeof getSessionId === 'function' ? getSessionId(docId) : this.readSessionId(docId) || '').trim();
             const sessionId = this.readSessionId(docId);
             const collabEnabled = typeof window.isCollabEnabled === 'function' && window.isCollabEnabled(docId);
 
             if (Object.keys(responseData).length > 0 || (response && (response.r == 1 || response.r == 0))) {
 
                 const sessionExpired = response.session_end_time && String(response.session_end_time).trim() !== '0';
 
                 if (sessionExpired) {
                     if (typeof STOP_ALL_EVENT_TIMERS === 'function') {
                         STOP_ALL_EVENT_TIMERS();
                     }
                     if (typeof cleanupSessionStorageBackups === 'function') {
                         cleanupSessionStorageBackups(docId, 'single');
                     }
                     this.clearEditorTabId(docId);
                     const isTrackView = typeof IS_TRACK_VIEW !== 'undefined' && IS_TRACK_VIEW;
                     if (!isTrackView && typeof AlertNewDialog !== 'undefined' && AlertNewDialog && typeof AlertNewDialog.fire === 'function') {
                         AlertNewDialog.fire('expired_session_alert');
                     }
                     resolveSessionCheck({
                         ok: false,
                         expired: true,
                         response: response,
                         alertShown: true,
                         reason: 'session_expired',
                         sessionId: existingSessionId
                     });
                     return { ok: false, expired: true, response: response, alertShown: true };
                 }
 
 
                 const freshSessionId = String(response.session_id || existingSessionId || (typeof NEW_SESSION_ID !== 'undefined' ? NEW_SESSION_ID : '')).trim();
                 const lastSavedTime = String(response.last_saved_time || response.session_start_time || new Date().getTime()).trim();
                 const sessionStartTime = String(response.session_start_time || lastSavedTime).trim();
 
 
                 const isDifferentSession = response.session_id && response.session_id !== existingSessionId;
                 const isDifferentUser = response.username && response.username !== USER_INFO.MAIL_ID;
                 const isSameBrowser = !!response.same_browser;
 
                 const IsNullSession = ['null', 'undefined', null, undefined, ''].includes(sessionId);
 
 
 
                 let throw_alert = false;
                 let close_session = false;
 
 
                 if (typeof AlertNewDialog === 'undefined' || typeof IMPACT_SAVE === 'undefined' || typeof CHECK_REQUEST === 'undefined') {
                     if (IS_LOCAL_HOST && !CAN_INITIATE_MODULE) {
                         resolveSessionCheck({ ok: true, expired: false, response: response, reason: 'local_modules_pending' });
                         return debug.warn('---some-module-not-load---with--check_request');
                     }
                     setTimeout((res, o) => {
                         this.handleNewSessionPost(res, o);
                     }, 1500, response, opt);
                     return;
                 }
 
                 if (response.r == 1) {
                     this.updateEditorSessionStorage(
                         freshSessionId,
                         docId,
                         lastSavedTime,
                         sessionStartTime
                     );
                     sessionStorage.removeItem('xmleditor:isRefresh');
                     if (typeof message_broadcast === 'function') {
                         message_broadcast({
                             docid: docId,
                             comment: 'CLOSE_REDIRECT_OLD_TAB',
                             uid: (new Date().getTime()) + Math.random(),
                             session_id: freshSessionId
                         });
                     }
                     resolveSessionCheck({
                         ok: true,
                         expired: false,
                         response: response,
                         sessionId: freshSessionId,
                         reason: 'check_ok'
                     });
                     return { ok: true, expired: false, response: response, sessionId: freshSessionId };
                 }
 
                 if (!collabEnabled) {
                     if ((isDifferentSession || IsNullSession) && !isSameBrowser && !IsNullSession) {
                         CAN_INITIATE_MODULE = false;
                         throw_alert = close_session = true;
                     } else if (!isDifferentSession && isSameBrowser) {
                         throw_alert = true;
                     }
                 } else if (isDifferentSession && isDifferentUser) {
                     CAN_INITIATE_MODULE = true;
                 } else if (!isDifferentUser && isDifferentSession && !isSameBrowser) {
                     CAN_INITIATE_MODULE = false;
                     throw_alert = close_session = true;
                 } else if (!isDifferentSession && isSameBrowser) {
                     throw_alert = true;
                 }
 
                 if (throw_alert) {
                     if (typeof STOP_ALL_EVENT_TIMERS === 'function') {
                         STOP_ALL_EVENT_TIMERS();
                     }
                     if (typeof cleanupSessionStorageBackups === 'function') {
                         cleanupSessionStorageBackups(docId, 'single');
                     }
                     this.clearEditorTabId(docId);
                     AlertNewDialog.fire('error', 'Request Denied!', 'Link_Opened', 'OK', '', true, {
                         hide: false
                     }).then(() => {
                         if (close_session) {
                             LOG_OUT.fire({
                                 noWarnAlert: true
                             });
                         } else if (typeof RE_DIRECT_CUR_SESSION === 'function') {
                             RE_DIRECT_CUR_SESSION(null, {
                                 remove: false
                             });
                         }
                     });
                     resolveSessionCheck({
                         ok: false,
                         expired: false,
                         blocked: true,
                         response: response,
                         alertShown: true,
                         reason: 'blocked_conflict',
                         sessionId: existingSessionId
                     });
                     return { ok: false, expired: false, blocked: true, response: response, alertShown: true };
                 } else {
                     if (CAN_INITIATE_MODULE) {
                         this.updateEditorSessionStorage(
                             freshSessionId,
                             docId,
                             lastSavedTime,
                             sessionStartTime
                         );
                         sessionStorage.removeItem('xmleditor:isRefresh');
                         if (typeof message_broadcast === 'function') {
                             message_broadcast({
                                 docid: docId,
                                 comment: 'CLOSE_REDIRECT_OLD_TAB',
                                 uid: (new Date().getTime()) + Math.random(),
                                 session_id: freshSessionId
                             });
                         }
                         resolveSessionCheck({
                             ok: true,
                             expired: false,
                             response: response,
                             sessionId: freshSessionId,
                             reason: 'check_ok'
                         });
                         return { ok: true, expired: false, response: response, sessionId: freshSessionId };
                     }
                 }
 
             }
 
             resolveSessionCheck({
                 ok: false,
                 expired: false,
                 response: response,
                 reason: 'unhandled_response'
             });
             return { ok: false, expired: false, response: response, reason: 'unhandled_response' };
 
 
         } catch (err) {
             console.warn(err.message);
             this.logError('new_session_post', err.message);
             resolveSessionCheck({
                 ok: false,
                 expired: false,
                 response: response,
                 reason: 'handler_error',
                 error: err.message
             });
             return { ok: false, expired: false, response: response, reason: 'handler_error', error: err.message };
         } */
    }

    // -------------------------------------------------------------------------
    // Session context resolution
    // -------------------------------------------------------------------------

    getSessionStartTimeKey(docId) {
        const id = String(docId || (this.getDocId() || '')).trim();
        return id ? `xmleditor:sessionstart:${id}` : 'xmleditor:sessionstart';
    }

    _usesFreshSessionStartTime(process) {
        const p = String(process || '').toLowerCase();
        return p === LinkSessionCore.PROCESS.CHECK ||
            p === LinkSessionCore.PROCESS.REFRESH ||
            p === '';
    }

    /**
     * Fill missing docId / sessionId / sessionStartTime / tabId from globals,
     * sessionStorage, and landing ctx. Explicit options always win.
     * check/refresh use a fresh start time unless options.sessionStartTime is set.
     */
    resolveSessionContext(options) {
        const opts = options || {};
        const process = String(opts.process || '').toLowerCase();
        const fromLanding = this._landingCtxState || {};

        let storedDocId = '';
        try {
            storedDocId = sessionStorage.getItem('docid') || '';
        } catch (err) {
            storedDocId = '';
        }

        const docId = String(
            opts.docId ||
            this.getDocId() ||
            fromLanding.docId ||
            storedDocId ||
            ''
        ).trim();

        const sessionId = String(
            opts.sessionId ||
            this.readSessionId(docId) ||
            fromLanding.sessionId ||
            (typeof NEW_SESSION_ID !== 'undefined' ? NEW_SESSION_ID : '') ||
            ''
        ).trim();

        const tabId = String(
            opts.tabId ||
            this.getCurrentTabId() ||
            this.getLandingTabId() ||
            ''
        ).trim();

        let sessionStartTime = opts.sessionStartTime != null && opts.sessionStartTime !== '' ?
            String(opts.sessionStartTime) :
            '';

        if (!sessionStartTime) {
            if (this._usesFreshSessionStartTime(process)) {
                sessionStartTime = this.getSessionStartTime();
            } else {
                let storedStart = '';
                try {
                    storedStart = sessionStorage.getItem(this.getSessionStartTimeKey(docId)) || '';
                } catch (err) {
                    storedStart = '';
                }
                sessionStartTime = String(
                    fromLanding.sessionStartTime ||
                    fromLanding.grantSessionStartTime ||
                    storedStart ||
                    this.getSessionStartTime()
                );
            }
        }

        return Object.assign({}, opts, {
            docId: docId,
            sessionId: sessionId,
            sessionStartTime: String(sessionStartTime),
            tabId: tabId,
            process: process || opts.process || ''
        });
    }

    persistSessionStartTime(sessionStartTime, docId) {
        const start = String(sessionStartTime || '').trim();
        if (!start) {
            return;
        }
        const normalizedDocId = String(docId || (this.getDocId() || '')).trim();
        const key = this.getSessionStartTimeKey(normalizedDocId);
        try {
            if (typeof setSessionState === 'function') {
                setSessionState(key, start, {
                    mirror: true,
                    docid: normalizedDocId
                });
            } else {
                sessionStorage.setItem(key, start);
            }
        } catch (err) {
            console.warn(err.message);
        }
    }

    // -------------------------------------------------------------------------
    // Payload builders
    // -------------------------------------------------------------------------

    buildPayload(process, ctx) {
        const resolved = this.resolveSessionContext(Object.assign({}, ctx || {}, {
            process: process
        }));
        const p = String(process || '').toLowerCase();
        let payload;
        switch (p) {
            case LinkSessionCore.PROCESS.CHECK:
            case LinkSessionCore.PROCESS.REFRESH:
                payload = this.buildCheckPayload(Object.assign({}, resolved, {
                    process: p,
                    source: resolved.source || 'editor'
                }));
                break;
            case LinkSessionCore.PROCESS.SCHEDULER:
                payload = this.buildSchedulerPayload(resolved);
                break;
            case LinkSessionCore.PROCESS.UPDATEREQUESTSTATUS:
                payload = this.buildUpdateRequestStatusPayload(resolved);
                break;
            case LinkSessionCore.PROCESS.UPDATESTATUS_REQSTATUS:
                payload = this.buildUpdateStatusReqStatusPayload(resolved);
                break;
            case LinkSessionCore.PROCESS.UPDATEREQSTATUS:
                payload = this.buildUpdateReqStatusPayload(resolved);
                break;
            case LinkSessionCore.PROCESS.CLOSE:
                payload = this.buildClosePayload(resolved);
                break;
            case LinkSessionCore.PROCESS.SAVE:
                payload = this.buildSavePayload(resolved);
                break;
            case LinkSessionCore.PROCESS.GETREQUESTSTATUS_PROCESS:
                payload = this.buildGetRequestStatusPayload(resolved);
                break;
            case LinkSessionCore.PROCESS.UPDATE_REQSTATUS_TIME:
                payload = this.buildUpdateReqStatusTimePayload(resolved);
                break;
            case LinkSessionCore.PROCESS.UPDATE_DOCSTATUS_REQSTATUS_INSERT_TIME:
                payload = this.buildSendRequestPayload(resolved);
                break;
            case LinkSessionCore.PROCESS.UPDATE_SESSION_END_TIME:
                payload = this.buildUpdateSessionEndTimePayload(resolved);
                break;
            case LinkSessionCore.PROCESS.UPDATE_REQ_STATUS:
                payload = this.buildUpdateReqStatusClearPayload(resolved);
                break;
            case LinkSessionCore.PROCESS.SIGNOFF:
                payload = this.buildSignoffPayload(resolved);
                break;
            default:
                payload = this._basePayload(p, resolved);
                break;
        }
        return LinkSessionCore.attachProcessRemarks(payload, p, resolved.remarks);
    }

    getJsonOrBuild(process, extra, ctx) {
        if (typeof GET_JSON === 'function') {
            const options = Object.assign({
                process: process
            }, extra || {});
            const payload = GET_JSON('linksharing', options);
            const source = options.source || (ctx && ctx.source);
            if (payload && source && !payload.source) {
                payload.source = source;
            }
            return payload;
        }
        return this.buildPayload(process, Object.assign({}, ctx || {}, extra || {}));
    }

    generateSessionId() {
        const sessionId = Math.floor(10000000 + Math.random() * 90000000);
        try {
            if (typeof Request_ID !== 'undefined') {
                Request_ID = Math.floor(100000000 + Math.random() * 900000000);
            } else if (typeof window !== 'undefined') {
                window.Request_ID = Math.floor(100000000 + Math.random() * 900000000);
            }
        } catch (err) {
            // ignore
        }
        return sessionId;
    }

    /** @deprecated Use generateSessionId() — this name clashes with storage reader. */
    getSessionId() {
        return this.generateSessionId();
    }

    getSessionStartTime() {
        return new Date().getTime().toString();
    }

    buildCheckPayload(options) {
        const ctx = this.resolveSessionContext(Object.assign({}, options || {}, {
            process: (options && options.process) || LinkSessionCore.PROCESS.CHECK
        }));
        const {
            docId,
            sessionId,
            sessionStartTime,
            remarks = 'login',
            tabId = '',
            source = 'landing',
            process = LinkSessionCore.PROCESS.CHECK
        } = ctx;

        const base = {
            tbl: 'linksharing',
            docid: docId || this.getDocId(),
            session_id: String(sessionId || ''),
            session_start_time: String(sessionStartTime || this.getSessionStartTime()),
            process: process,
            remarks: remarks
        };

        if (tabId) {
            base.tabid = tabId;
        }
        const exculdeArray = ['session_id', 'dtd', 'linkinfo', 'roleid', 'shorttitle', 'type', 'vendor', 'projecttitle'];
        if (typeof ADD_DEFAULT_KEYS === 'function' && (source === 'landing' || source === 'editor_local')) {
            const merged = Object.assign({}, base, ADD_DEFAULT_KEYS('defaults', {}, [], exculdeArray));
            merged.session_id = String(sessionId || '');
            return LinkSessionCore.attachProcessRemarks(merged, process, remarks);
        }

        return LinkSessionCore.attachProcessRemarks(base, process, remarks);
    }

    buildSchedulerPayload(ctx) {
        return Object.assign(this._basePayload(LinkSessionCore.PROCESS.SCHEDULER, ctx), {
            docstatus: LinkSessionCore.DOC_STATUS.ACTIVE,
            requeststatus: LinkSessionCore.REQUEST_STATUS.PENDING
        });
    }

    buildUpdateRequestStatusPayload(ctx) {
        const process = LinkSessionCore.PROCESS.UPDATEREQUESTSTATUS;
        return LinkSessionCore.attachProcessRemarks(
            Object.assign(this._basePayload(process, ctx), {
                requeststatus: LinkSessionCore.REQUEST_STATUS.ACCEPTED
            }),
            process,
            ctx && ctx.remarks
        );
    }

    buildUpdateStatusReqStatusPayload(ctx) {
        const process = LinkSessionCore.PROCESS.UPDATESTATUS_REQSTATUS;
        return LinkSessionCore.attachProcessRemarks(
            Object.assign(this._basePayload(process, ctx), {
                docstatus: ctx.docstatus != null ? String(ctx.docstatus) : LinkSessionCore.DOC_STATUS.ACTIVE,
                requeststatus: ctx.requeststatus != null ? String(ctx.requeststatus) : LinkSessionCore.REQUEST_STATUS.ACCEPTED
            }),
            process,
            ctx && ctx.remarks
        );
    }

    buildUpdateReqStatusPayload(ctx) {
        const process = LinkSessionCore.PROCESS.UPDATEREQSTATUS;
        const remarks = (ctx && ctx.remarks) || 'rejected_by_collator';
        return LinkSessionCore.attachProcessRemarks(
            Object.assign(this._basePayload(process, ctx), {
                requeststatus: (ctx && ctx.requeststatus) || LinkSessionCore.REQUEST_STATUS.REJECTED,
                remarks: remarks
            }),
            process,
            remarks
        );
    }

    buildClosePayload(ctx) {
        const now = String(Date.now());
        const resolved = ctx || {};
        const process = LinkSessionCore.PROCESS.CLOSE;
        const remarks = resolved.remarks || 'close';
        const payload = Object.assign(this._basePayload(process, resolved), {
            session_end_time: resolved.sessionEndTime || now,
            session_id: String(resolved.sessionId || this.readSessionId(resolved.docId) || ''),
            remarks: remarks,
            source: resolved.source || 'unknown'
        });
        LinkSessionCore.attachProcessRemarks(payload, process, remarks);
        this.logClosePayload(payload);
        return payload;
    }

    buildSavePayload(ctx) {
        const process = LinkSessionCore.PROCESS.SAVE;
        const lastSaved = (ctx && ctx.lastSavedTime) || (typeof IMPACT_SAVE !== 'undefined' && IMPACT_SAVE.state && IMPACT_SAVE.state.lastSaveTimestamp) ||
            String(Date.now());
        return LinkSessionCore.attachProcessRemarks(
            Object.assign(this._basePayload(process, ctx), {
                last_saved_time: String(lastSaved)
            }),
            process,
            ctx && ctx.remarks
        );
    }

    buildGetRequestStatusPayload(ctx) {
        const process = LinkSessionCore.PROCESS.GETREQUESTSTATUS_PROCESS;
        return LinkSessionCore.attachProcessRemarks(
            Object.assign(this._basePayload(process, ctx), {
                session_id: String((ctx && ctx.sessionId) || ''),
                requestid: String((ctx && ctx.requestId) || (typeof Request_ID !== 'undefined' ? Request_ID : '')),
                session_start_time: String((ctx && ctx.sessionStartTime) || this.getSessionStartTime())
            }),
            process,
            ctx && ctx.remarks
        );
    }

    buildUpdateReqStatusTimePayload(ctx) {
        const now = String(Date.now());
        const process = LinkSessionCore.PROCESS.UPDATE_REQSTATUS_TIME;
        const payload = Object.assign(this._basePayload(process, ctx), {
            requeststatus: LinkSessionCore.REQUEST_STATUS.PENDING,
            request_send_time: (ctx && ctx.requestSendTime) || now,
            requestid: String((ctx && ctx.requestId) || (typeof Request_ID !== 'undefined' ? Request_ID : ''))
        });
        if (ctx && ctx.source) {
            payload.source = ctx.source;
        }
        if (ctx && ctx.oldrequestid) {
            payload.oldrequestid = String(ctx.oldrequestid);
        }
        if (ctx && ctx.oldrequest_send_time) {
            payload.oldrequest_send_time = String(ctx.oldrequest_send_time);
        }
        return LinkSessionCore.attachProcessRemarks(payload, process, ctx && ctx.remarks);
    }

    buildSendRequestPayload(ctx) {
        const process = LinkSessionCore.PROCESS.UPDATE_DOCSTATUS_REQSTATUS_INSERT_TIME;
        return LinkSessionCore.attachProcessRemarks(
            Object.assign(this._basePayload(process, ctx), {
                session_id: String((ctx && ctx.sessionId) || ''),
                session_start_time: (ctx && ctx.sessionStartTime) || this.getSessionStartTime(),
                docstatus: (ctx && ctx.docstatus) || '8',
                requeststatus: (ctx && ctx.requeststatus) || '7',
                source: (ctx && ctx.source) || 'link_send_dialog'
            }),
            process,
            ctx && ctx.remarks
        );
    }

    buildUpdateSessionEndTimePayload(ctx) {
        const process = LinkSessionCore.PROCESS.UPDATE_SESSION_END_TIME;
        return LinkSessionCore.attachProcessRemarks(
            Object.assign(this._basePayload(process, ctx), {
                session_end_time: (ctx && ctx.sessionEndTime) || '0'
            }),
            process,
            ctx && ctx.remarks
        );
    }

    buildUpdateReqStatusClearPayload(ctx) {
        const process = LinkSessionCore.PROCESS.UPDATE_REQ_STATUS;
        return LinkSessionCore.attachProcessRemarks(
            this._basePayload(process, ctx),
            process,
            ctx && ctx.remarks
        );
    }

    buildSignoffPayload(ctx) {
        return this._basePayload(LinkSessionCore.PROCESS.SIGNOFF, ctx);
    }

    buildAcceptPayload(ctx) {
        return this.buildUpdateStatusReqStatusPayload(
            Object.assign({}, ctx, {
                docstatus: ctx.docstatus || '4',
                requeststatus: ctx.requeststatus || '3'
            })
        );
    }

    buildRejectPayload(ctx) {
        return this.buildUpdateReqStatusPayload(
            Object.assign({}, ctx, {
                requeststatus: LinkSessionCore.REQUEST_STATUS.REJECTED
            })
        );
    }

    _basePayload(process, ctx) {
        const docId = (ctx && ctx.docId) || this.getDocId();
        return {
            tbl: 'linksharing',
            docid: docId,
            process: process
        };
    }

    // -------------------------------------------------------------------------
    // HTTP
    // -------------------------------------------------------------------------

    enrichLinkSharePayload(jsondata) {
        const payload = Object.assign({}, jsondata);
        try {
            const remarks = payload[payload.process + '_remarks'] || payload.remarks || '';
            LinkSessionCore.attachProcessRemarks(payload, payload.process, remarks);
            const docId = payload.docid || this.getDocId();
            const collabEnabled = typeof window.isCollabEnabled === 'function' && window.isCollabEnabled(docId);
            if (typeof SHARED_KEY !== 'undefined' && SHARED_KEY && SHARED_KEY.role && USER_INFO && USER_INFO.MAIL_ID) {
                if (!payload.username) payload.username = USER_INFO.MAIL_ID;
                if (!payload.role) payload.role = SHARED_KEY.role;
                if (!payload.rolename) payload.rolename = SHARED_KEY.rolename;
                if (payload.tbl === 'linksharing') {
                    delete payload._w;
                    delete payload._r;
                    if (collabEnabled) payload.collaborative = '1';
                    if (SHARED_KEY.corole && payload.rolename && payload.rolename.indexOf('Co-') !== 0) {
                        payload.rolename = 'Co-' + payload.rolename;
                    }
                }
            }
        } catch (err) {
            console.warn(err.message);
        }
        return payload;
    }
    parseJsonIfNeeded(value) {
        if (typeof value !== "string") {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch (err) {
            return value;
        }
    }

    //Common AJAX helper
    postRequest(url, payload, errorLabel) {
        var docId = this.getDocId();
        const collabEnabled = this.isCollaborativeSessionEnabled(docId);
        if (collabEnabled) payload.collaborative = "1";

        const body = JSON.stringify(payload);
        const self = this;
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                data: {
                    jsondata: body
                },
                type: "post",
                dataType: "JSON",
                contentType: "application/json",
                beforeSend: function(request) {
                    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
                    request.setRequestHeader("appkey", typeof APP_KEY !== "undefined" ? APP_KEY : "");
                    request.setRequestHeader("apikey", typeof API_KEY !== "undefined" ? API_KEY : "");
                },
                success: function(response) {
                    try {
                        response = self.parseJsonIfNeeded(response);

                        if (response && typeof response.data === "string") {
                            response.data = self.parseJsonIfNeeded(response.data);
                        }

                        resolve(response);
                    } catch (e) {
                        reject(new Error(`Invalid JSON response: ${errorLabel}`));
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    reject(new Error(textStatus || errorThrown || `${errorLabel} request failed`));
                }
            });
        });
    }

    // Usage in your class/module
    postLinkShare(jsondata) {
        const payload = this.enrichLinkSharePayload(jsondata);
        return this.postRequest(API_LINK_SHARE, payload, "linksharing");
    }

    postGetDocs(query) {
        return this.postRequest(API_GET_DOCS, query, "getdocs");
    }


    getLandingTabId() {
        try {
            return sessionStorage.getItem('xmleditor:landing:tabid') || '';
        } catch (err) {
            return '';
        }
    }

    buildSessionFindQuery(expected) {
        const query = typeof GET_JSON === 'function' ? (GET_JSON('default') || {}) : {};
        query.tbl = 'linksharing';
        query.docid = expected.docId;
        query.find = {
            docid: expected.docId,
            docstatus: LinkSessionCore.DOC_STATUS.ACTIVE,
            session_end_time: '0'
        };
        const roleName = expected && expected.rolename != null ? String(expected.rolename).trim() : '';
        const userName = expected && expected.username != null ? String(expected.username).trim() : '';
        if (roleName) {
            query.find.rolename = roleName;
        }
        if (userName) {
            query.find.username = userName;
        }
        query.length = 10;
        // query.filter = [
        //     'docid', 'docstatus', 'session_id', 'session_start_time',
        //     'session_end_time', 'requeststatus', 'request_send_time', 'requestid',
        //     'username'
        // ];

        if (typeof SHARED_KEY !== 'undefined' && SHARED_KEY && SHARED_KEY.corole && String(SHARED_KEY.corole).trim() !== '') {
            if (typeof USER_INFO !== 'undefined' && SHARED_KEY.rolename != USER_INFO.TRACK_ROLE_NAME) {
                query.find.rolename = USER_INFO.TRACK_ROLE_NAME || ('Co-' + SHARED_KEY.rolename);
            }
        }

        return query;
    }

    isActiveSessionRecord(record, expected) {
        if (!record) {
            return false;
        }
        const serverSessionId = String(record.session_id || '').trim();
        const sessionEndTime = String(record.session_end_time || '').trim();
        const serverDocId = String(record.docid || '').trim();
        const expectedSessionId = String(expected.sessionId || '').trim();
        const expectedDocId = String(expected.docId || '').trim();

        if (!expectedSessionId) {
            return false;
        }
        if (serverDocId && expectedDocId && serverDocId !== expectedDocId) {
            return false;
        }
        if (sessionEndTime && sessionEndTime !== '0') {
            return false;
        }
        if (String(record.docstatus || '') !== LinkSessionCore.DOC_STATUS.ACTIVE) {
            return false;
        }
        if (serverSessionId && serverSessionId !== expectedSessionId) {
            return false;
        }
        return true;
    }

    isCollaborativeSessionEnabled(docId) {
        try {
            if (typeof window !== 'undefined' && typeof window.isCollabEnabled === 'function' && window.isCollabEnabled(docId)) {
                return true;
            }
        } catch (err) {}
        try {
            return !!(
                typeof SHARED_KEY !== 'undefined' &&
                SHARED_KEY &&
                String(SHARED_KEY.collaborative || '').toLowerCase() === 'yes'
            );
        } catch (err) {
            return false;
        }
    }

    normalizeSessionUsername(value) {
        return String(value || '').trim().toLowerCase();
    }

    getExpectedSessionUsername(expected) {
        const expectedUser = expected && expected.username != null ? expected.username : '';
        if (String(expectedUser || '').trim()) {
            return String(expectedUser).trim();
        }
        try {
            if (typeof USER_INFO !== 'undefined' && USER_INFO && USER_INFO.MAIL_ID) {
                return String(USER_INFO.MAIL_ID).trim();
            }
        } catch (err) {
            // ignore
        }
        return '';
    }

    getExpectedSessionRoleName(expected) {
        const expectedRoleName = expected && expected.rolename != null ? expected.rolename : '';
        if (String(expectedRoleName || '').trim()) {
            return String(expectedRoleName).trim();
        }
        try {
            if (typeof SHARED_KEY !== 'undefined' && SHARED_KEY && SHARED_KEY.rolename) {
                return String(SHARED_KEY.rolename).trim();
            }
        } catch (err) {
            // ignore
        }
        try {
            if (typeof USER_INFO !== 'undefined' && USER_INFO && USER_INFO.TRACK_ROLE_NAME) {
                return String(USER_INFO.TRACK_ROLE_NAME).trim();
            }
        } catch (err) {
            // ignore
        }
        return '';
    }

    resolveCollaborativeSessionExpected(expected) {
        const resolved = Object.assign({}, expected || {});
        const roleName = this.getExpectedSessionRoleName(resolved);
        const userName = this.getExpectedSessionUsername(resolved);
        if (roleName) {
            resolved.rolename = roleName;
        }
        if (userName) {
            resolved.username = userName;
        }
        return resolved;
    }

    hasSessionVerifyDependencies() {
        return typeof API_GET_DOCS !== 'undefined' && typeof GET_JSON === 'function';
    }

    hasCollaborativeSessionIdentity(expected) {
        const resolved = this.resolveCollaborativeSessionExpected(expected);
        return !!(resolved.rolename && resolved.username);
    }

    waitForSessionVerifyCondition(predicate, timeoutMs, intervalMs) {
        const waitMs = Number(timeoutMs != null ? timeoutMs : LinkSessionCore.VERIFY_DEPENDENCY_WAIT_MS);
        const pollMs = Number(intervalMs != null ? intervalMs : LinkSessionCore.VERIFY_DEPENDENCY_POLL_MS);
        if (typeof predicate !== 'function' || predicate()) {
            return Promise.resolve(true);
        }
        return new Promise((resolve) => {
            const startedAt = Date.now();
            const check = () => {
                if (predicate()) {
                    resolve(true);
                    return;
                }
                if ((Date.now() - startedAt) >= waitMs) {
                    resolve(false);
                    return;
                }
                setTimeout(check, pollMs);
            };
            setTimeout(check, pollMs);
        });
    }

    waitForSessionVerifyDependencies() {
        return this.waitForSessionVerifyCondition(() => this.hasSessionVerifyDependencies());
    }

    waitForCollaborativeSessionIdentity(expected) {
        return this.waitForSessionVerifyCondition(() => this.hasCollaborativeSessionIdentity(expected));
    }

    waitForLandingVerifyRetry(delayMs) {
        const waitMs = Math.max(0, Number(delayMs != null ? delayMs : LinkSessionCore.VERIFY_TRANSIENT_RETRY_DELAY_MS) || 0);
        if (waitMs === 0) {
            return Promise.resolve();
        }
        return new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    shouldRetrySessionVerify(result, expected) {
        if (!expected || expected.retryTransient !== true) {
            return false;
        }
        const reason = result && result.reason ? String(result.reason) : '';
        return LinkSessionCore.VERIFY_TRANSIENT_REASONS.indexOf(reason) !== -1;
    }

    confirmCollaborativeSessionRows(rows, expected) {
        const expectedSessionId = String(expected && expected.sessionId || '').trim();
        const currentRow = rows.find((row) => String(row && row.session_id || '').trim() === expectedSessionId);

        if (!currentRow) {
            return {
                ok: false,
                reason: 'record_mismatch',
                rows: rows
            };
        }

        if (!this.isActiveSessionRecord(currentRow, expected)) {
            return {
                ok: false,
                reason: 'record_mismatch',
                row: currentRow,
                rows: rows
            };
        }

        const currentUser = this.normalizeSessionUsername(currentRow.username);
        const expectedUser = this.normalizeSessionUsername(this.getExpectedSessionUsername(expected));
        if (!currentUser || (expectedUser && currentUser !== expectedUser)) {
            return {
                ok: false,
                reason: 'record_mismatch',
                row: currentRow,
                rows: rows
            };
        }

        const seenUsers = {};
        for (let i = 0; i < rows.length; i++) {
            const user = this.normalizeSessionUsername(rows[i] && rows[i].username);
            if (!user || seenUsers[user]) {
                return {
                    ok: false,
                    reason: 'multiple_active',
                    row: currentRow,
                    rows: rows
                };
            }
            seenUsers[user] = true;
        }

        const hasDifferentUser = rows.some((row) => this.normalizeSessionUsername(row && row.username) !== currentUser);
        if (!hasDifferentUser) {
            return {
                ok: false,
                reason: 'multiple_active',
                row: currentRow,
                rows: rows
            };
        }

        return {
            ok: true,
            reason: 'active_session',
            row: currentRow,
            rows: rows
        };
    }

    async guardEditorSession(expected = {}) {

        const docIdResolved = String(expected.docId || (this.getDocId() || '')).trim();

        const sessionKey = getSessionIdKey(docIdResolved);
        const currentSessionId = String((typeof getSessionId === "function" ? getSessionId(docIdResolved) : null) || sessionStorage.getItem(sessionKey) || "").trim();

        if (!currentSessionId) {
            return {
                isValid: false,
                remark: 'missing_session_id',
                message: 'Session id is missing from sessionStorage and localStorage backup.'
            };
        }

        const verify = await this.confirmSessionOnServer({
            docId: docIdResolved,
            sessionId: currentSessionId,
            rolename: SHARED_KEY.rolename,
            username: USER_INFO.MAIL_ID
        });

        return verify;
    }

    isLocalHost() {
        if (typeof LinkSessionLocalHost !== 'undefined' && LinkSessionLocalHost && typeof LinkSessionLocalHost.isLocalHost === 'function') {
            return LinkSessionLocalHost.isLocalHost.call(this);
        }
        const isFlagLocal = typeof IS_LOCAL_HOST !== 'undefined' && !!IS_LOCAL_HOST;
        return {
            ok: isFlagLocal,
            reason: isFlagLocal ? 'local' : 'not_local'
        };
    }

    /**
     * Optional localhost seed (E2E / tooling). Not used by Ready gate.
     * Implementation: link_session/localHostSession.js
     */
    async ensureLocalSessionEntry(expected = {}) {
        if (typeof LinkSessionLocalHost !== 'undefined' && LinkSessionLocalHost && typeof LinkSessionLocalHost.ensureLocalSessionEntry === 'function') {
            return LinkSessionLocalHost.ensureLocalSessionEntry.call(this, expected);
        }
        return {
            ok: false,
            reason: 'local_helpers_unavailable'
        };
    }

    /**
     * Landing dual-guard safety net: after no_active_row, silently POST process:check
     * with remarks landing_retry up to LANDING_RETRY_MAX times, re-verify each attempt.
     * Does not auto-refresh. Caller already saw no_active_row (no first verify here).
     * @param {{ docId?: string, sessionId?: string, maxAttempts?: number }} expected
     */
    async retryLandingSessionCheck(expected = {}) {
        try {
            const maxAttempts = Math.max(
                1,
                Number(expected.maxAttempts != null ? expected.maxAttempts : LinkSessionCore.LANDING_RETRY_MAX) || LinkSessionCore.LANDING_RETRY_MAX
            );
            let docId = String(expected.docId || (this.getDocId() || '')).trim();
            let sessionId = String(expected.sessionId || '').trim();

            if (!docId || !sessionId) {
                this.logSessionGate('landing_retry', {
                    ok: false,
                    reason: 'missing_session_id',
                    docid: docId,
                    session_id: sessionId
                });
                return {
                    ok: false,
                    reason: 'missing_session_id',
                    docId: docId,
                    sessionId: sessionId,
                    attempts: 0,
                    retried: false
                };
            }

            let lastVerify = {
                ok: false,
                reason: 'no_active_row'
            };
            let attempt = 0;

            for (attempt = 1; attempt <= maxAttempts; attempt++) {
                const sessionStartTime = String(expected.sessionStartTime || this.getSessionStartTime());
                this.persistSessionStartTime(sessionStartTime, docId);

                const payload = this.buildCheckPayload({
                    process: LinkSessionCore.PROCESS.CHECK,
                    remarks: LinkSessionCore.LANDING_RETRY_REMARKS,
                    source: 'landing',
                    tabId: typeof this.getLandingTabId === 'function' ? this.getLandingTabId() : '',
                    docId: docId,
                    sessionId: sessionId,
                    sessionStartTime: sessionStartTime
                });

                let retryResponse;
                try {
                    retryResponse = await this.postLinkShare(payload);
                } catch (postErr) {
                    const message = postErr && postErr.message ? postErr.message : String(postErr);
                    this.logError('retryLandingSessionCheck', 'landing_retry_unavailable: ' + message);
                    this.logSessionGate('landing_retry', {
                        ok: false,
                        reason: 'landing_retry_unavailable',
                        attempt: attempt,
                        docid: docId,
                        session_id: sessionId,
                        error: message
                    });
                    lastVerify = {
                        ok: false,
                        reason: 'landing_retry_unavailable',
                        error: message
                    };
                    continue;
                }

                if (this.isCheckErrorResponse(retryResponse)) {
                    this.logSessionGate('landing_retry', {
                        ok: false,
                        reason: 'check_error_response',
                        attempt: attempt,
                        docid: docId,
                        session_id: sessionId,
                        message: retryResponse && (retryResponse.message || retryResponse.error)
                    });
                    lastVerify = {
                        ok: false,
                        reason: 'check_error_response',
                        response: retryResponse
                    };
                    continue;
                }

                if (retryResponse && (retryResponse.r == 1 || retryResponse.session_id)) {
                    const freshSessionId = String(retryResponse.session_id || sessionId).trim();
                    const lastSavedTime = String(
                        retryResponse.last_saved_time || retryResponse.session_start_time || sessionStartTime
                    ).trim();
                    const startTime = String(retryResponse.session_start_time || sessionStartTime).trim();
                    if (typeof this.updateEditorSessionStorage === 'function') {
                        this.updateEditorSessionStorage(freshSessionId, docId, lastSavedTime, startTime);
                    }
                    sessionId = freshSessionId;
                }

                lastVerify = await this.confirmSessionOnServer({
                    docId: docId,
                    sessionId: sessionId,
                    retryTransient: false
                });
                this.logSessionGate('landing_retry_verify', {
                    ok: !!(lastVerify && lastVerify.ok),
                    reason: lastVerify && lastVerify.reason,
                    attempt: attempt,
                    docid: docId,
                    session_id: sessionId
                });

                if (lastVerify && lastVerify.ok && lastVerify.reason === 'active_session') {
                    return Object.assign({}, lastVerify, {
                        sessionId: sessionId,
                        attempts: attempt,
                        retried: true
                    });
                }

                const reason = lastVerify && lastVerify.reason ? String(lastVerify.reason) : '';
                // Only keep looping on missing/mismatch row; stop early on transport / multi-row
                if (reason !== 'no_active_row' && reason !== 'record_mismatch') {
                    return Object.assign({}, lastVerify || {
                        ok: false,
                        reason: 'landing_retry_verify_failed'
                    }, {
                        sessionId: sessionId,
                        attempts: attempt,
                        retried: true
                    });
                }
            }

            return Object.assign({}, lastVerify || {
                ok: false,
                reason: 'landing_retry_exhausted'
            }, {
                ok: false,
                reason: (lastVerify && lastVerify.reason) || 'landing_retry_exhausted',
                sessionId: sessionId,
                attempts: maxAttempts,
                retried: true
            });
        } catch (err) {
            const message = err && err.message ? err.message : String(err);
            console.warn(message);
            this.logError('retryLandingSessionCheck', message);
            return {
                ok: false,
                reason: 'landing_retry_error',
                error: message,
                retried: true
            };
        }
    }

    async confirmSessionOnServerOnce(expected) {
        try {
            if (!expected || !expected.docId || !expected.sessionId) {
                return {
                    ok: false,
                    reason: 'missing_expected_fields'
                };
            }
            const collabEnabled = this.isCollaborativeSessionEnabled(expected.docId);
            if (collabEnabled) {
                expected = this.resolveCollaborativeSessionExpected(expected);
                if (!expected.rolename || !expected.username) {
                    await this.waitForCollaborativeSessionIdentity(expected);
                    expected = this.resolveCollaborativeSessionExpected(expected);
                }
                if (!expected.rolename || !expected.username) {
                    return {
                        ok: false,
                        reason: 'missing_expected_fields'
                    };
                }
            }
            if (!this.hasSessionVerifyDependencies()) {
                await this.waitForSessionVerifyDependencies();
            }
            if (!this.hasSessionVerifyDependencies()) {
                return {
                    ok: false,
                    reason: 'getdocs_unavailable'
                };
            }

            const payload = this.buildSessionFindQuery(expected);
            const response = await this.postGetDocs(payload);
            const rows = response && Array.isArray(response.data) ? response.data : [];

            if (rows.length === 0) {
                return {
                    ok: false,
                    reason: 'no_active_row',
                    rows: rows
                };
            }

            if (rows.length > 1) {
                if (collabEnabled) {
                    return this.confirmCollaborativeSessionRows(rows, expected);
                }
                return {
                    ok: false,
                    reason: 'multiple_active',
                    rows: rows
                };
            }

            const row = rows[0];

            if (!this.isActiveSessionRecord(row, expected)) {
                return {
                    ok: false,
                    reason: 'record_mismatch',
                    row: row,
                    rows: rows
                };
            }

            return {
                ok: true,
                reason: 'active_session',
                row: row,
                rows: rows
            };
        } catch (err) {
            const message = err && err.message ? err.message : String(err);
            console.warn(message);
            this.logError('confirmSessionOnServer', message);
            return {
                ok: false,
                reason: 'request_error',
                error: message
            };
        }
    }

    async confirmSessionOnServer(expected) {
        const options = Object.assign({}, expected || {});
        const maxAttempts = options.retryTransient === true ?
            Math.max(1, Number(options.retryMax || LinkSessionCore.VERIFY_TRANSIENT_RETRY_MAX) || LinkSessionCore.VERIFY_TRANSIENT_RETRY_MAX) :
            1;
        let lastResult = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            lastResult = await this.confirmSessionOnServerOnce(options);
            if (lastResult && lastResult.ok) {
                return Object.assign({}, lastResult, {
                    attempts: attempt,
                    retried: attempt > 1
                });
            }
            if (attempt >= maxAttempts || !this.shouldRetrySessionVerify(lastResult, options)) {
                if (options.retryTransient === true && attempt >= maxAttempts && this.shouldRetrySessionVerify(lastResult, options)) {
                    this.logSessionGate('landing_verify_retry_exhausted', {
                        ok: false,
                        reason: lastResult && lastResult.reason,
                        attempts: maxAttempts,
                        docid: options.docId,
                        session_id: options.sessionId
                    });
                }
                return Object.assign({}, lastResult || {
                    ok: false,
                    reason: 'verify_failed'
                }, {
                    attempts: attempt,
                    retried: attempt > 1
                });
            }

            this.logSessionGate('landing_verify_retry_wait', {
                ok: false,
                reason: lastResult && lastResult.reason,
                attempt: attempt,
                maxAttempts: maxAttempts,
                docid: options.docId,
                session_id: options.sessionId
            });
            await this.waitForLandingVerifyRetry(options.retryDelayMs);
        }

        return Object.assign({}, lastResult || {
            ok: false,
            reason: 'verify_failed'
        }, {
            attempts: maxAttempts,
            retried: maxAttempts > 1
        });
    }

    /**
     * True when check/linkshare payload is a DB/server error, not a conflict grant shape.
     * Example: ClassCastException "Error while accessing DB for \"check\" request".
     */
    isCheckErrorResponse(response) {
        if (!response || typeof response !== 'object') {
            return false;
        }
        const message = String(response.message || response.error || '').trim();
        if (!message) {
            return false;
        }
        const lower = message.toLowerCase();
        if (
            lower.indexOf('error while accessing db') !== -1 ||
            lower.indexOf('classcastexception') !== -1 ||
            lower.indexOf('exception') !== -1 ||
            lower.indexOf('error while accessing') !== -1
        ) {
            return true;
        }
        // Bare error object: has error message, r==0, no conflict/session grant fields
        if (response.r == 0) {
            const hasConflictShape = response.requeststatus != null ||
                response.session_id ||
                response.session_start_time ||
                response.role != null;
            if (!hasConflictShape) {
                return true;
            }
        }
        return false;
    }

    /**
     * Legitimate collab/conflict r==0 shape (not a bare exception payload).
     */
    isConflictShapedCheckResponse(response) {
        if (!response || response.r != 0 || this.isCheckErrorResponse(response)) {
            return false;
        }
        return response.requeststatus != null ||
            !!response.session_id ||
            response.role != null ||
            !!response.session_start_time;
    }

    async maybeCollatorForceClose(response) {
        try {
            if (!response || typeof SHARED_KEY === 'undefined' || !SHARED_KEY) {
                return false;
            }
            // Never force-close / grant on DB error payloads (no role / exception message)
            if (this.isCheckErrorResponse(response)) {
                return false;
            }
            if (!this.isConflictShapedCheckResponse(response) && response.r != 1) {
                return false;
            }
            if (response.role != SHARED_KEY.role && SHARED_KEY.rolename === 'Collator') {
                if (typeof commonfn !== 'undefined' && typeof commonfn.autoCloseCheckPoint === 'function') {
                    commonfn.autoCloseCheckPoint({
                        data: [response]
                    }, {}, true);
                }
                await new Promise((resolve) => setTimeout(resolve, 2000));
                return true;
            }
        } catch (err) {
            console.warn(err.message);
            this.logError('maybeCollatorForceClose', err.message);
        }
        return false;
    }

    isCollabBypass(response) {
        return false;
    }

    async commitStorageAndRedirect(ctx) {
        if (typeof ctx.onBeforeCommit === 'function') {
            await ctx.onBeforeCommit(ctx);
        }
        if (typeof ctx.onCommitStorage === 'function') {
            ctx.onCommitStorage(ctx.resData);
        }
        if (typeof ctx.onRedirect === 'function') {
            await ctx.onRedirect(ctx);
        }
    }

    async completeAccessGrant(ctx, checkResponse, options) {
        // Dual-guard verify lives in setItemsandReDirect (write-then-verify).
        // skipVerify is reserved for explicit callers; normal check grants must verify.
        const skipVerify = options && options.skipVerify === true;
        const canforceClose = options && options.canforceClose === true;
        ctx.skipVerify = skipVerify || canforceClose;
        ctx.grantOptions = options || {};

        const persistStart = ctx.grantSessionStartTime ||
            (checkResponse && checkResponse.session_start_time) ||
            ctx.sessionStartTime;
        this.persistSessionStartTime(persistStart, ctx.docId);

        return this.commitStorageAndRedirect(ctx);
    }

    async accessFromLanding(ctx) {
        try {
            if (typeof ctx.onResetHidden === 'function') {
                ctx.onResetHidden();
            }

            const sessionStartTime = String(Date.now());
            const payload = this.buildCheckPayload({
                docId: ctx.docId,
                sessionId: ctx.sessionId,
                sessionStartTime: sessionStartTime,
                remarks: 'landing-page',
                tabId: this.getLandingTabId(),
                source: 'landing'
            });

            ctx.sessionStartTime = sessionStartTime;
            this.captureLandingCtxState(ctx);
            this.persistSessionStartTime(sessionStartTime, ctx.docId);
            const checkResponse = await this.postLinkShare(payload);
            return this.handleCheckResponse(checkResponse, ctx);
        } catch (err) {
            console.warn(err.message);
            this.logError('accessFromLanding', err.message);
            if (typeof ctx.onRequestError === 'function') {
                ctx.onRequestError(err, ctx);
            }
        }
    }

    async openFromEditor(ctx) {
        try {
            const sessionStartTime = String(Date.now());
            const payload = this.buildCheckPayload({
                docId: ctx.docId,
                sessionId: ctx.sessionId,
                sessionStartTime: sessionStartTime,
                remarks: ctx.remarks || 'new_tab',
                tabId: ctx.tabId || '',
                source: 'editor'
            });
            ctx.sessionStartTime = sessionStartTime;
            const checkResponse = await this.postLinkShare(payload);
            return this.handleEditorCheckResponse(checkResponse, ctx);
        } catch (err) {
            console.warn(err.message);
            this.logError('openFromEditor', err.message);
            throw err;
        }
    }

    async handleCheckResponse(response, ctx) {
        if (!response) {
            console.warn('[LinkSessionModule] empty check response');
            if (typeof ctx.onRequestError === 'function') {
                return ctx.onRequestError({
                    reason: 'empty_check_response'
                }, ctx);
            }
            return;
        }

        // DB / server exception payloads must never grant or redirect
        if (this.isCheckErrorResponse(response)) {
            this.logError('handleCheckResponse', response.message || response.error || 'check_error_response');
            this.logSessionGate('landing_check_error', {
                ok: false,
                reason: 'check_error_response',
                message: response.message || response.error || '',
                process: response.process,
                r: response.r
            });
            if (typeof ctx.onRequestError === 'function') {
                return ctx.onRequestError(response, ctx);
            }
            if (typeof ctx.onTryAgain === 'function') {
                return ctx.onTryAgain('Land_Page_TRY_AGAIN');
            }
            return;
        }

        if (response.r == 1) {
            return this.completeAccessGrant(ctx, response, {
                skipVerify: false
            });
        }

        if (response.r == 0) {
            return this.delegateSendPrompt(response, ctx);
        }

        if (response.r == 2 && typeof ctx.onAccessDeniedWithRemarks === 'function') {
            return ctx.onAccessDeniedWithRemarks(response.remarks || 'NIL', ctx);
        }

        console.warn('[LinkSessionModule] unhandled check response', response);
    }

    async handleEditorCheckResponse(response, ctx) {
        if (typeof ctx.onEditorResponse === 'function') {
            return ctx.onEditorResponse(response, ctx);
        }
        return response;
    }

    delegateSendPrompt(response, ctx) {
        if (ctx && ctx.ui && typeof ctx.ui.sendPrompt === 'function') {
            return ctx.ui.sendPrompt(response, ctx);
        }
        if (typeof window !== 'undefined' && window.LinkSessionSendModule) {
            return window.LinkSessionSendModule.prompt(response, ctx);
        }
        if (ctx && typeof ctx.onRequestError === 'function') {
            return ctx.onRequestError(response, ctx);
        }
        console.warn('[LinkSessionCore] send prompt unavailable — no UI module');
        return Promise.resolve();
    }

    promptSendRequest(response, ctx) {
        return this.delegateSendPrompt(response, ctx);
    }

    async sendAccessRequest(response, ctx) {
        try {
            const now = Date.now();
            const requestId = String(ctx.requestId || Request_ID);

            if (response.requeststatus == 1) {
                if (moment(now).diff(parseInt(response.request_send_time, 10), 'minutes') > 30) {
                    const grantTime = String(now);
                    ctx.grantSessionStartTime = grantTime;
                    this.captureLandingCtxState(ctx);
                    const res = await this.postLinkShare(this.buildSendRequestPayload({
                        docId: ctx.docId,
                        sessionId: ctx.sessionId,
                        sessionStartTime: grantTime,
                        docstatus: '8',
                        requeststatus: '7',
                        source: 'link_send_dialog'
                    }));
                    await this.handleUpdateOpen1(res, ctx);
                } else if (typeof ctx.onTryAgain === 'function') {
                    ctx.onTryAgain();
                }
                return;
            }

            if (response.requeststatus == 4 && response.requestid != 0 && response.request_send_time != 0) {
                if (moment(now).diff(parseInt(response.request_send_time, 10), 'minutes') > 30) {
                    const res = await this.postLinkShare(this.buildUpdateReqStatusTimePayload({
                        docId: ctx.docId,
                        requestId: requestId,
                        requestSendTime: String(now),
                        oldrequestid: String(response.requestid),
                        oldrequest_send_time: String(response.request_send_time),
                        source: 'link_send_dialog'
                    }));
                    await this.handleUpdateReqId(res, ctx);
                } else if (typeof ctx.onTryAgain === 'function') {
                    ctx.onTryAgain();
                }
                return;
            }

            const res = await this.postLinkShare(this.buildUpdateReqStatusTimePayload({
                docId: ctx.docId,
                requestId: requestId,
                requestSendTime: String(now),
                source: 'link_send_dialog'
            }));
            await this.handleUpdateReqId(res, ctx);
        } catch (err) {
            console.warn(err.message);
            this.logError('sendAccessRequest', err.message);
            if (typeof ctx.onRequestError === 'function') {
                ctx.onRequestError(err, ctx);
            }
        }
    }

    async handleUpdateOpen1(response, ctx) {
        if (response.r == 1) {
            return this.completeAccessGrant(ctx, response, {
                skipVerify: false
            });
        }
        console.log('no records found');
        if (typeof ctx.onTryAgain === 'function') {
            ctx.onTryAgain('Land_Page_TRY_AGAIN_1');
        }
    }

    async handleUpdateReqId(response, ctx) {
        if (response.r != 1) {
            if (ctx && typeof ctx.onRequestError === 'function') {
                return ctx.onRequestError(response, ctx);
            }
            return;
        }
        if (ctx && ctx.ui && typeof ctx.ui.showPollWaiting === 'function') {
            return ctx.ui.showPollWaiting(ctx);
        }
        if (typeof window !== 'undefined' && window.LinkSessionSendModule) {
            return window.LinkSessionSendModule.showPollWaiting(ctx);
        }
        return this.pollRequestStatus(ctx);
    }

    async pollRequestStatus(ctx) {
        try {
            const grantSessionStartTime = String(ctx.sessionStartTime || Date.now());
            const payload = this.buildGetRequestStatusPayload({
                docId: ctx.docId,
                sessionId: ctx.sessionId,
                requestId: ctx.requestId || Request_ID,
                sessionStartTime: grantSessionStartTime
            });
            ctx.grantSessionStartTime = payload.session_start_time;
            this.captureLandingCtxState(ctx);
            const response = await this.postLinkShare(payload);
            return this.handleGetReqStatus(response, ctx);
        } catch (err) {
            console.warn(err.message);
            this.logError('pollRequestStatus', err.message);
            if (ctx && typeof ctx.onRequestError === 'function') {
                ctx.onRequestError(err, ctx);
            }
        }
    }

    async handleGetReqStatus(response, ctx) {
        if (response.r == 1) {
            // Poll grant still dual-guards in setItemsandReDirect (do not skipVerify).
            return this.completeAccessGrant(ctx, response, {
                skipVerify: false
            });
        }
        if (response.r == 2) {
            const message = response.updatereqstatus_remarks || response.remarks || 'NIL';
            if (typeof ctx.onAccessDeniedWithRemarks === 'function') {
                return ctx.onAccessDeniedWithRemarks(message, ctx);
            }
            return;
        }
        if (response.r == 0 && typeof ctx.onTryAgain === 'function') {
            ctx.onTryAgain('Land_Page_TRY_AGAIN_1');
        }
    }

    // -------------------------------------------------------------------------
    // Editor CHECK_REQUEST scheduler
    // -------------------------------------------------------------------------

    getSchedulerIntervalMs() {

        return 15000;
    }

    stopScheduler() {
        if (this._schedulerInterval) {
            clearInterval(this._schedulerInterval);
            this._schedulerInterval = null;
        }
        this._schedulerOwner = null;
    }

    startScheduler(owner, ctx) {
        ctx = ctx || {};
        this.stopScheduler();
        this._schedulerOwner = owner;

        if (owner && owner.forceStop) {
            return;
        }
        if (!navigator.onLine) {
            return;
        }
        if (typeof SHARED_KEY !== 'undefined' && !SHARED_KEY.apikey) {
            return;
        }

        const timerMs = ctx.intervalMs || this.getSchedulerIntervalMs();
        const json = this.getJsonOrBuild(LinkSessionCore.PROCESS.SCHEDULER, {}, ctx);
        const postFn = 'new_request_post';
        const self = this;

        this._schedulerInterval = setInterval(function() {
            if (owner && owner.forceStop) {
                self.stopScheduler();
                return;
            }
            if (!navigator.onLine) {
                if (owner && typeof owner.cancel === 'function') {
                    owner.cancel(owner.SCHEDULER, owner);
                }
                self.stopScheduler();
                return;
            }
            if (typeof commonfn !== 'undefined' && commonfn.callajax) {
                commonfn.callajax(json, postFn, API_LINK_SHARE, owner);
            }
            if (typeof commonMethods !== 'undefined' && commonMethods.cleanTranslatorExtensions) {
                commonMethods.cleanTranslatorExtensions();
            }
        }, timerMs);

        if (owner) {
            owner.SCHEDULER = this._schedulerInterval;
        }
    }

    handleNewRequestPost(response, ctx, owner) {
        try {
            if (owner && owner.forceStop) {
                return;
            }
            if (this.isIdleAlertActive(owner)) {
                return;
            }
            if (response.r == 1) {
                const updateJson = this.getJsonOrBuild(LinkSessionCore.PROCESS.UPDATEREQUESTSTATUS, {}, ctx);
                if (typeof commonfn !== 'undefined' && commonfn.callajax) {
                    commonfn.callajax(updateJson, 'open_new_request', API_LINK_SHARE, owner);
                }
            } else {
                this.handleIdleCheck(response, owner);
            }
        } catch (err) {
            console.warn(err.message);
            this.logError('handleNewRequestPost', err.message);
        }
    }

    handleOpenNewRequestDefault(response, owner) {
        try {
            if (owner && owner.forceStop) {
                return;
            }
            if (this.isIdleAlertActive(owner)) {
                return;
            }
            console.log(JSON.stringify(response));
            if (response.r == 1) {
                const lastSaved = response.data && response.data.last_saved_time;
                if (lastSaved != 0 &&
                    (moment(new Date().getTime()).diff(parseInt(lastSaved, 10), 'minutes') > 15)) {
                    globalThis._CanClose = true;
                    commonfn.callajax(
                        this.getJsonOrBuild('updatestatus_reqstatus', {
                            docstatus: '2',
                            requeststatus: '3'
                        }),
                        'idle_session_close',
                        API_LINK_SHARE
                    );
                } else {
                    IMPACT_SAVE.iSave({
                        forcesave: true
                    });
                    if (typeof openRequestDialog === 'function') {
                        openRequestDialog(null);
                    } else {
                        const dialog = typeof getRequestDialog === 'function' ?
                            getRequestDialog(null) :
                            (window.LinkSessionRequestDialog || window.LinkShareDialog);
                        if (dialog && typeof dialog.request_dialog === "function") {
                            dialog.request_dialog();
                        }
                    }
                }
            } else {
                console.log('no records found');
            }
        } catch (err) {
            console.warn(err.message);
            this.logError('handleOpenNewRequestDefault', err.message);
        }
    }

    isIdleAlertActive(owner) {
        owner = owner || this._editorOwner;
        return !!(owner && (owner.Idle_Alert_State || owner.Idle_Alert_Showing));
    }

    isRequestDialogActive() {
        try {
            const dialog = (typeof window !== 'undefined') && (window.LinkSessionRequestDialog || window.LinkShareDialog);
            if (dialog && (dialog.LinkSessionRequestActive || dialog.state === 1)) {
                return true;
            }
            const panel = (typeof document !== 'undefined') && document.getElementById('LinkSessionRequestDialog');
            return !!(panel && !panel.classList.contains('ds-none'));
        } catch (err) {
            console.warn(err.message);
            this.logError('isRequestDialogActive', err.message);
            return false;
        }
    }

    runIdlePreAlertSave() {
        try {
            if (typeof IMPACT_SAVE === 'undefined' || !IMPACT_SAVE || typeof IMPACT_SAVE.iSave !== 'function') {
                return Promise.resolve();
            }
            return Promise.resolve(IMPACT_SAVE.iSave({
                forcesave: true,
                noalert: true
            }));
        } catch (err) {
            console.warn(err.message);
            this.logError('runIdlePreAlertSave', err.message);
            return Promise.resolve();
        }
    }

    handleIdleCheck(response, owner) {
        try {
            owner = owner || this._editorOwner;
            if (!owner || owner.forceStop) {
                return;
            }

            // Grace after Ready: avoid false idle right after gate / before first save.
            const readyAt = typeof window !== 'undefined' ? Number(window.__linkSessionReadyAt || 0) : 0;
            if (readyAt && (Date.now() - readyAt) < LinkSessionCore.IDLE_GRACE_MS) {
                return;
            }

            const lastSaveTimestamp = (IMPACT_SAVE && IMPACT_SAVE.state && IMPACT_SAVE.state.lastSaveTimestamp);
            // Skip idle until first successful save (lastSaveTimestamp == 0 / falsy), unless forced.
            if (!lastSaveTimestamp && !owner.check_boolean) {
                return;
            }

            if (!!lastSaveTimestamp || owner.check_boolean) {
                const newTime = new Date().getTime();
                const parseTime = parseInt(lastSaveTimestamp, 10);
                if ((moment(newTime).diff(parseTime, 'minutes') > owner.IDLE_CHECK_DURATION || owner.check_boolean) &&
                    !owner.Idle_Alert_State && !this.isRequestDialogActive()) {
                    owner.Idle_Alert_State = true;
                    owner.Idle_Alert_Showing = true;
                    this.cancelTimer(owner.SCHEDULER, owner);
                    owner.check_boolean = false;
                    if (GlobalEditor) {
                        GlobalEditor.setReadOnly(true);
                    }
                    this.runIdlePreAlertSave().then(() => AlertNewDialog.fire('idle_session_alert')).then((result) => {
                        if (result.isConfirmed) {
                            if (GlobalEditor) {
                                GlobalEditor.setReadOnly(false);
                            }
                            owner.Idle_Alert_Showing = false;
                            owner.Idle_Alert_State = false;
                            this.initEditorSession(owner);
                        } else {
                            if (IS_LOCAL_HOST) {
                                owner.Idle_Alert_Showing = false;
                                owner.Idle_Alert_State = false;
                                if (GlobalEditor) {
                                    GlobalEditor.setReadOnly(false);
                                }
                                return debug.warn("session_out");
                            }
                            globalThis._CanClose = true;
                            const closePayload = this.getJsonOrBuild('close', {
                                remarks: 'idle_leave',
                                source: 'idle'
                            });
                            if (closePayload && !closePayload.docid) {
                                closePayload.docid = this.getDocId();
                            }
                            if (closePayload && !closePayload.session_id) {
                                closePayload.session_id = this.getCurrentSessionId();
                            }
                            if (closePayload && !closePayload.source) {
                                closePayload.source = 'idle';
                            }
                            if (closePayload && !closePayload.remarks) {
                                closePayload.remarks = 'idle_leave';
                            }
                            this.logClosePayload(closePayload);
                            commonfn.callajax(
                                closePayload,
                                'logout_with_alert',
                                API_LINK_SHARE,
                                owner
                            );
                        }
                    }).catch((err) => {
                        console.warn(err.message);
                        this.logError('handleIdleCheckAlert', err.message);
                        owner.Idle_Alert_Showing = false;
                        owner.Idle_Alert_State = false;
                        if (GlobalEditor) {
                            GlobalEditor.setReadOnly(false);
                        }
                    });
                }
            }
        } catch (err) {
            console.warn(err.message);
            this.logError('handleIdleCheck', err.message);
        }
    }

    initEditorSession(owner) {
        try {
            owner = owner || this._editorOwner;
            if (!owner) {
                return false;
            }
            this._editorOwner = owner;
            if (owner.forceStop) {
                return false;
            }
            if (typeof SHARED_KEY === 'undefined' || !SHARED_KEY.apikey) {
                return false;
            }

            if (typeof DOC_ID === 'undefined' || DOC_ID == null) {
                this.timerMethod('update_session_end_time', {}, owner);
            }

            this.timerMethod('scheduler', {}, owner);
            owner.Idle_Alert_State = false;
            return true;
        } catch (err) {
            console.warn(err.message);
            this.logError('initEditorSession', err.message);
            return false;
        }
    }

    timerMethod(process, options, owner) {
        try {
            owner = owner || this._editorOwner;
            if (!owner || owner.forceStop) {
                return;
            }
            let method = owner.INTERVAL_TYPE[process];
            let timer = owner.TIMER_INTERVAL[method ? process : 'default'];
            const postFunction = owner.POST_FN[process] ? owner.POST_FN[process] : owner.POST_FN.default;
            if (!method) {
                method = owner.INTERVAL_TYPE.default;
            }
            const json = this.getJsonOrBuild(process, {}, options);
            if (method === 'setInterval') {
                this.startScheduler(owner, {
                    intervalMs: timer
                });
            } else {
                setTimeout(function(_json, postFun) {
                    commonfn.callajax(_json, postFun, API_LINK_SHARE, owner);
                }, timer, json, postFunction);
            }
        } catch (err) {
            console.warn(err.message);
            this.logError('timerMethod', err.message);
        }
    }

    checkOnline(owner) {
        try {
            owner = owner || this._editorOwner;
            if (!owner || owner.forceStop) {
                return;
            }
            if (typeof owner.SCHEDULER === 'number' && !window.navigator.onLine) {
                this.cancelTimer(owner.SCHEDULER, owner);
            } else if (typeof owner.SCHEDULER !== 'number') {
                this.timerMethod('scheduler', {}, owner);
            }
        } catch (err) {
            console.warn(err.message);
            this.logError('checkOnline', err.message);
        }
    }

    cancelTimer(timer, owner) {
        try {
            console.log("cancel Timer");
            timer = timer ? timer : (owner && owner.scheduler);
            clearTimeout(timer);
            clearInterval(timer);
            if (owner) {
                owner.SCHEDULER = null;
            }
            this.stopScheduler();
        } catch (err) {
            console.warn(err.message);
            this.logError('cancelTimer', err.message);
        }
    }

    stopEditorSession(owner) {
        try {
            owner = owner || this._editorOwner;
            if (!owner) {
                return;
            }
            owner.forceStop = true;
            this.cancelTimer(owner.SCHEDULER, owner);
            owner.Init = function() {};
            owner.check_request = function() {};
        } catch (err) {
            console.warn(err.message);
            this.logError('stopEditorSession', err.message);
        }
    }

    logoutWithAlert(response, opt, owner) {
        try {
            _CanClose = true;
            sessionStorage.setItem("status", "idle_session_sign_off");
            this.redirectCurrentSession(null, {
                remove: false,
                alert: "idle_session_sign_off"
            });
        } catch (err) {
            console.warn(err.message);
            this.logError('logoutWithAlert', err.message);
        }
    }

    funReturn(response, opt, owner) {
        try {
            console.log(JSON.stringify(response));
            if (response.r == 1) {
                console.log("updated close");
            }
        } catch (err) {
            console.warn(err.message);
            this.logError('funReturn', err.message);
        }
    }

    redirectCurrentSession(response, options) {
        options = Object.assign({
            remove: true,
            readOnlyView: false
        }, options || {});
        var tempDirect = sessionStorage.getItem("redirect");
        var defaultRedirect = typeof FinalizeDialog !== 'undefined' && FinalizeDialog._state && FinalizeDialog._state.finalize && FinalizeDialog._state.finalize.default;
        var final = tempDirect ? tempDirect : (defaultRedirect ? defaultRedirect : NG_WEB_URL);
        try {
            var DEFAULT = ["xmleditor:shared:", "xmleditor:apikey", "xmleditor:appkey"];
            var WSC_ATTR = ["wsc_autocorrect", "wsc_ignoreAllCapsWords", "wsc_ignoreDomainNames",
                "wsc_ignoreWordsWithMixedCases", "wsc_ignoreWordsWithNumbers", "wsc_lang"
            ];
            var LIST_OF_REMOVE = [localStorage, DEFAULT, WSC_ATTR];
            if (options.remove) {
                LIST_OF_REMOVE.forEach((item) => {
                    for (let key in item) {
                        if (key.includes(DOC_ID)) {
                            localStorage.removeItem(key);
                        }
                    }
                });
            }
            if (final.match(/validateurl/) && options.alert) {
                final = final + '&alert=' + options.alert;
            }
            _CanClose = true;
            _IsDirty = false;
            if (CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.maineditor &&
                typeof CKEDITOR.instances.maineditor.setReadOnly === "function") {
                CKEDITOR.instances.maineditor.resetDirty();
                CKEDITOR.instances.maineditor.setReadOnly();
            }
            window.location.href = final;
        } catch (err) {
            console.warn(err.message);
            this.logError('redirectCurrentSession', err.message);
            window.location.href = final;
        }
    }

    createEditorFacade() {
        const mod = this;
        const facade = {
            SCHEDULER: null,
            forceStop: false,
            TIMER_INTERVAL: {
                scheduler: 15000,
                refresh_undo: 1500,
                default: 100
            },
            INTERVAL_TYPE: {
                refresh: 'setTimeout',
                default: 'setTimeout',
                scheduler: 'setInterval'
            },
            POST_FN: {
                default: "fun_return",
                refresh: "fun_return",
                scheduler: "new_request_post",
                update_request_status: "open_new_request"
            },
            check_boolean: false,
            Idle_Alert_Showing: false,
            Idle_Alert_State: false,
            IDLE_CHECK_DURATION: 40,
            open_new_request: function(response, _ = facade) {
                return mod.handleOpenNewRequestDefault(response, _);
            },
            fun_return: function(response, opt, _ = facade) {
                return mod.funReturn(response, opt, _);
            },
            logout_with_alert: function(response, opt, _ = facade) {
                return mod.logoutWithAlert(response, opt, _);
            },
            runIdleCheck: function(response, _ = facade) {
                return mod.handleIdleCheck(response, _);
            },
            new_request_post: function(response, opt, _ = facade) {
                return mod.handleNewRequestPost(response, {}, _);
            },
            check_request: function(json, postFun, timer, _ = facade) {
                mod.startScheduler(_, {
                    intervalMs: timer
                });
            },
            TIMER_METHOD: function(process, options, _ = facade) {
                return mod.timerMethod(process, options, _);
            },
            CHECK_ONLINE: function(_ = facade) {
                return mod.checkOnline(_);
            },
            Init: function(_ = facade) {
                return mod.initEditorSession(_);
            },
            StopAll: function(self = facade) {
                return mod.stopEditorSession(self);
            },
            cancel: function(timer, _ = facade) {
                return mod.cancelTimer(timer, _);
            }
        };
        this._editorOwner = facade;
        return facade;
    }

    handleOpenNewRequest(response, ctx, owner) {
        try {
            if (owner && owner.forceStop) {
                return;
            }
            if (ctx && typeof ctx.onOpenRequestDialog === 'function') {
                ctx.onOpenRequestDialog(response, owner);
            }
        } catch (err) {
            console.warn(err.message);
            this.logError('handleOpenNewRequest', err.message);
        }
    }

    handleResponse(process, response, ctx) {
        const p = String(process || '').toLowerCase();
        switch (p) {
            case LinkSessionCore.PROCESS.CHECK:
            case LinkSessionCore.PROCESS.REFRESH:
                return this.handleCheckResponse(response, ctx);
            case LinkSessionCore.PROCESS.SCHEDULER:
                return this.handleNewRequestPost(response, ctx);
            case LinkSessionCore.PROCESS.UPDATEREQUESTSTATUS:
                return this.handleOpenNewRequest(response, ctx);
            default:
                return {
                    action: 'passthrough', process: p, response: response
                };
        }
    }



}

if (typeof window !== 'undefined') {
    window.LinkSessionCore = LinkSessionCore;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkSessionCore;
}