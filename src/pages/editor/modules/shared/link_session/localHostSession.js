/**
 * Optional localhost session helpers (NOT part of Ready gate).
 *
 * Ready path: Track View + IS_LOCAL_HOST allow directly; only live editor validates.
 * These helpers remain for E2E / tooling (seed remarks:local) — do not call from Ready.
 *
 * Loaded after LinkSessionCore in gulp session bundles.
 */
/*global window, IS_LOCAL_HOST, DOC_ID, SHARED_KEY, USER_INFO, LinkSessionCore */

(function(global) {
    'use strict';

    function isLocalHost() {
        try {
            var isFlagLocal = typeof IS_LOCAL_HOST !== 'undefined' && !!IS_LOCAL_HOST;
            var isUrlLocal = false;
            if (typeof global !== 'undefined' && global.location) {
                var host = global.location.hostname || '';
                if (host) {
                    isUrlLocal = host === 'localhost' || host === '127.0.0.1';
                } else if (global.location.href) {
                    isUrlLocal = String(global.location.href).indexOf('localhost') !== -1;
                }
            }
            if (isUrlLocal || isFlagLocal) {
                return {
                    ok: true,
                    reason: 'local'
                };
            }
            return {
                ok: false,
                reason: 'not_local'
            };
        } catch (err) {
            var flagOnly = typeof IS_LOCAL_HOST !== 'undefined' && !!IS_LOCAL_HOST;
            return {
                ok: flagOnly,
                reason: flagOnly ? 'local' : 'not_local'
            };
        }
    }

    /**
     * Localhost-only seed: getdocs match or process:check + remarks:local then re-verify.
     * Call as LinkSessionLocalHost.ensureLocalSessionEntry.call(coreInstance, expected)
     * or via core.ensureLocalSessionEntry (delegate).
     */
    async function ensureLocalSessionEntry(expected) {
        expected = expected || {};
        var core = this;
        try {
            var localCheck = isLocalHost();
            if (!localCheck.ok) {
                return {
                    ok: true,
                    reason: 'not_local'
                };
            }

            var docId = String(
                expected.docId ||
                (global.GET_DOC_ID ? global.GET_DOC_ID() : '') ||
                (typeof DOC_ID !== 'undefined' ? DOC_ID : '') ||
                ''
            ).trim();
            var sessionId = String(
                expected.sessionId ||
                (core && typeof core.getCurrentSessionId === 'function' ? core.getCurrentSessionId() : '') ||
                (core && typeof core.readSessionId === 'function' ? core.readSessionId(docId) : '') ||
                ''
            ).trim();

            if (!docId || !sessionId) {
                if (core && typeof core.logSessionGate === 'function') {
                    core.logSessionGate('local_seed', {
                        ok: false,
                        reason: 'missing_session_id',
                        docid: docId,
                        session_id: sessionId
                    });
                }
                return {
                    ok: false,
                    reason: 'missing_session_id',
                    docId: docId,
                    sessionId: sessionId
                };
            }

            var expectedFields = {
                docId: docId,
                sessionId: sessionId,
                rolename: expected.rolename || (typeof SHARED_KEY !== 'undefined' && SHARED_KEY && SHARED_KEY.rolename) || '',
                username: expected.username || (typeof USER_INFO !== 'undefined' && USER_INFO && USER_INFO.MAIL_ID) || ''
            };

            var firstVerify = await core.confirmSessionOnServer(expectedFields);
            if (core && typeof core.logSessionGate === 'function') {
                core.logSessionGate('local_seed', {
                    ok: !!(firstVerify && firstVerify.ok),
                    reason: firstVerify && firstVerify.reason,
                    docid: docId,
                    session_id: sessionId
                });
            }

            if (firstVerify && firstVerify.ok && firstVerify.reason === 'active_session') {
                return Object.assign({}, firstVerify, {
                    sessionId: sessionId,
                    seeded: false
                });
            }

            var seedableReasons = ['no_active_row', 'record_mismatch'];
            var firstReason = firstVerify && firstVerify.reason ? String(firstVerify.reason) : '';
            if (!firstVerify || firstVerify.ok || seedableReasons.indexOf(firstReason) === -1) {
                return Object.assign({}, firstVerify || {
                    ok: false,
                    reason: 'local_seed_verify_failed'
                }, {
                    sessionId: sessionId,
                    seeded: false
                });
            }

            var sessionStartTime = String(
                expected.sessionStartTime ||
                (core && typeof core.getSessionStartTime === 'function' ? core.getSessionStartTime() : String(Date.now()))
            );
            if (core && typeof core.persistSessionStartTime === 'function') {
                core.persistSessionStartTime(sessionStartTime, docId);
            }

            var ProcessCheck = (typeof LinkSessionCore !== 'undefined' && LinkSessionCore.PROCESS) ?
                LinkSessionCore.PROCESS.CHECK :
                'check';
            var tabId = core && typeof core.ensureEditorTabId === 'function' ? core.ensureEditorTabId(docId) : '';
            var seedPayload = core.buildCheckPayload({
                process: ProcessCheck,
                remarks: 'local',
                source: 'editor_local',
                tabId: tabId,
                docId: docId,
                sessionId: sessionId,
                sessionStartTime: sessionStartTime
            });

            var seedResponse;
            try {
                seedResponse = await core.postLinkShare(seedPayload);
            } catch (seedErr) {
                var message = seedErr && seedErr.message ? seedErr.message : String(seedErr);
                if (core && typeof core.logError === 'function') {
                    core.logError('ensureLocalSessionEntry', 'local_seed_unavailable: ' + message);
                }
                if (core && typeof core.logSessionGate === 'function') {
                    core.logSessionGate('local_seed', {
                        ok: false,
                        reason: 'local_seed_unavailable',
                        docid: docId,
                        session_id: sessionId,
                        error: message
                    });
                }
                return {
                    ok: false,
                    reason: 'local_seed_unavailable',
                    error: message,
                    sessionId: sessionId,
                    seeded: false
                };
            }

            var verifySessionId = sessionId;
            if (seedResponse && (seedResponse.r == 1 || seedResponse.session_id)) {
                var freshSessionId = String(seedResponse.session_id || sessionId).trim();
                var lastSavedTime = String(
                    seedResponse.last_saved_time || seedResponse.session_start_time || sessionStartTime
                ).trim();
                var startTime = String(seedResponse.session_start_time || sessionStartTime).trim();
                if (core && typeof core.updateEditorSessionStorage === 'function') {
                    core.updateEditorSessionStorage(freshSessionId, docId, lastSavedTime, startTime);
                }
                verifySessionId = freshSessionId;
            }

            var secondVerify = await core.confirmSessionOnServer({
                docId: docId,
                sessionId: verifySessionId,
                rolename: expectedFields.rolename,
                username: expectedFields.username
            });
            if (core && typeof core.logSessionGate === 'function') {
                core.logSessionGate('local_seed_verify', {
                    ok: !!(secondVerify && secondVerify.ok),
                    reason: secondVerify && secondVerify.reason,
                    docid: docId,
                    session_id: verifySessionId
                });
            }

            return Object.assign({}, secondVerify, {
                sessionId: verifySessionId,
                seeded: true,
                seedResponse: seedResponse
            });
        } catch (err) {
            var errMsg = err && err.message ? err.message : String(err);
            console.warn(errMsg);
            if (core && typeof core.logError === 'function') {
                core.logError('ensureLocalSessionEntry', errMsg);
            }
            return {
                ok: false,
                reason: 'local_seed_error',
                error: errMsg
            };
        }
    }

    global.LinkSessionLocalHost = {
        isLocalHost: isLocalHost,
        ensureLocalSessionEntry: ensureLocalSessionEntry
    };
})(typeof window !== 'undefined' ? window : this);