/**
 * InitialLoadDialog - Progress dialog for page initialization
 * Flow B: config → session gate → openhtml/CKEditor → instanceReady →
 * register modules → tier1 → query → finishReady → tier2
 */
(function(global) {
    'use strict';

    var PHASE = {
        DIALOG_SHELL: 'dialogShell',
        CONFIG_LOADED: 'configLoaded',
        SESSION_VALIDATED: 'sessionValidated',
        MODULES_REGISTERED: 'modulesRegistered',
        TIER1_DONE: 'tier1Done',
        QUERY_DONE: 'queryDone',
        READY: 'ready'
    };

    var InitialLoadDialog = function() {
        this.template = '<div class="blur-overlay" id="pageBlurOverlay"></div><div class="page-container" id="loadingDialog"><div class="circular-progress"><div class="value-container">0%</div></div><div class="status">. . .</div></div>';
        this.progressValue = 0;
        this.progressLoop = 0;
        this.FullyLoaded = false;
        this.progressEndValue = 10;
        this.StatusInfo = {
            1: 'Loading Configuration ...',
            2: 'Fetching Metadata ...',
            3: 'Parsing Configuration ...',
            4: 'Loading Page Config ...',
            5: 'Setting Profile ...',
            6: 'Loading Language Pack ...',
            7: 'Loading Style Settings ...',
            8: 'Initializing Page ...',
            9: 'Finalizing ...',
            10: 'Ready'
        };
        this.progressBar = null;
        this.valueContainer = null;
        this.statusDiv = null;
        this.dialogModule = null;
        this.progressInterval = null;
        this.dynamic_load_file = {
            client_config: false,
            meta_config: false,
            ceg_config: false,
            lang_config: false,
            ico_file: false
        };
        this.phase = PHASE.DIALOG_SHELL;
        this._sessionGateStarted = false;
        this._sessionValidated = false;
        this._postEditorBootstrapStarted = false;
        this._configGatePromise = null;
    };

    InitialLoadDialog.prototype.setPhase = function(phase) {
        this.phase = phase;
        if (typeof global.InitLog !== 'undefined') {
            global.InitLog('InitialLoadDialog', 'phase', phase);
        }
    };

    InitialLoadDialog.prototype.init = function() {
        try {
            if (typeof global.InitLog !== 'undefined') {
                global.InitLog('InitialLoadDialog', 'init');
            }
            if (!document.getElementById('loadingDialog') && this.template) {
                var fragment = document.createRange().createContextualFragment(this.template);
                var dialogContainer = document.getElementById('ModelDialogAppend');
                if (dialogContainer) {
                    dialogContainer.appendChild(fragment);
                    this.progressBar = document.querySelector('.circular-progress');
                    this.valueContainer = document.querySelector('.value-container');
                    this.statusDiv = document.querySelector('.status');
                    this.dialogModule = document.getElementById('loadingDialog');

                    if (this.valueContainer) {
                        this.valueContainer.classList.add("ds-none");
                    }

                    this.progressValue = 0;
                    this.setPhase(PHASE.DIALOG_SHELL);
                    this.startProgressMonitoring();
                } else {
                    var self = this;
                    setTimeout(function() {
                        self.init();
                    }, 100);
                }
            }
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('INITIAL_LOAD_DIALOG_INIT', err.message);
        }
    };

    InitialLoadDialog.prototype.updateProgress = function(value) {
        try {
            console.log("updateProgress", value);
            if (typeof global.InitLog !== 'undefined') {
                global.InitLog('InitialLoadDialog', 'updateProgress', value);
            }
            if (value >= 0 && value >= this.progressValue && value <= this.progressEndValue) {
                this.progressValue = value;
            }
        } catch (err) {
            console.warn(err.message);
        }
    };

    InitialLoadDialog.prototype.getAlert = function(key) {
        try {
            if (global.isValidVariable(global.AlertMessages)) {
                return global.AlertMessages.get(key);
            }
            console.warn('AlertMessageLoader not loaded');
            return null;
        } catch (err) {
            console.warn(err.message);
            return null;
        }
    };

    InitialLoadDialog.prototype.getAllAlerts = function() {
        try {
            if (global.isValidVariable(global.AlertMessages)) {
                return global.AlertMessages.getAll();
            }
            console.warn('AlertMessageLoader not loaded');
            return {};
        } catch (err) {
            console.warn(err.message);
            return {};
        }
    };

    InitialLoadDialog.prototype.setStatusText = function(text) {
        try {
            if (this.statusDiv && text) {
                this.statusDiv.textContent = text;
            }
        } catch (err) {}
    };

    InitialLoadDialog.prototype.logGate = function(stage, details) {
        try {
            var Cls = window.LinkSessionModule || window.LinkSessionService || window.LinkSessionCore;
            var mod = Cls && typeof Cls.getInstance === 'function' ? Cls.getInstance() : null;
            if (mod && typeof mod.logSessionGate === 'function') {
                mod.logSessionGate(stage, details);
                return;
            }
            console.info('[LinkSessionGate]', Object.assign({
                stage: stage
            }, details || {}));
        } catch (err) {
            console.warn(err.message);
        }
    };

    InitialLoadDialog.prototype.pageData = function() {
        let pathname = '';
        try {
            pathname = (window.location && window.location.pathname) || '';
        } catch (e) {
            pathname = '';
        }

        return {
            pathname,
            // contains editor + digits
            editor_page: /editor\d+/i.test(pathname),
            // contains trackview
            is_track_view: pathname.toLowerCase().includes("trackview"),
            // contains localhost
            is_local_host: pathname.toLowerCase().includes("localhost")
        };
    };



    InitialLoadDialog.prototype.makeGateResult = function(ok, reason, extra) {
        return Object.assign({
            ok: !!ok,
            expired: !ok,
            reason: reason,
            alertShown: false
        }, extra || {});
    };

    /**
     * Live editor session gate: confirmLinkSessionOnServer only (gulp session_editor).
     * Does NOT load webpack modules.
     */
    InitialLoadDialog.prototype.gateLiveSession = async function(ctx) {
        var docId = String((ctx && ctx.docId) || '').trim();
        var sessionId = String((ctx && ctx.sessionId) || '').trim();
        var isTrackView = !!(ctx && ctx.isTrackView);

        if (!sessionId) {
            return this.makeGateResult(false, 'missing_session_id');
        }

        if (typeof confirmLinkSessionOnServer !== 'function') {
            return this.makeGateResult(false, 'getdocs_unavailable', {
                sessionId: sessionId
            });
        }

        this.setStatusText('Confirming session ...');
        var verify = await confirmLinkSessionOnServer({
            docId: docId,
            sessionId: sessionId,
            source: 'initial_editor_gate',
            retryTransient: true,
            retryMax: 3,
            retryDelayMs: 850
        });
        this.logGate('editor_getdocs', {
            ok: !!(verify && verify.ok),
            reason: verify && verify.reason,
            docid: docId,
            session_id: sessionId
        });

        if (!verify || !verify.ok) {
            return this.makeGateResult(false, (verify && verify.reason) || 'getdocs_verify_failed', {
                sessionId: sessionId,
                verify: verify
            });
        }

        return this.makeGateResult(true, 'editor_gate_ok', {
            sessionId: sessionId,
            isTrackView: isTrackView
        });
    };

    /**
     * Mark session gate passed — allows EDITOR_INITIALIZE / openhtml (does NOT finishReady).
     */
    InitialLoadDialog.prototype.onSessionGatePassed = function(reason, docId) {
        this._sessionValidated = true;
        this.setPhase(PHASE.SESSION_VALIDATED);
        this.logGate('editor_gate', {
            ok: true,
            reason: reason || 'session_ok',
            docid: docId
        });
        if (typeof global.dispatchEvent === 'function') {
            try {
                global.dispatchEvent(new CustomEvent('xmleditor:session-gate-passed', {
                    detail: {
                        reason: reason,
                        docid: docId
                    }
                }));
            } catch (e) {}
        }
    };

    InitialLoadDialog.prototype.LocalSessionGate = function(docid) {
        try {
            this.onSessionGatePassed('localhost_allow', docid);
            return true;
        } catch (err) {
            return false;
        }
    };

    InitialLoadDialog.prototype.isSessionGatePassed = function() {
        return !!this._sessionValidated;
    };

    /**
     * Flow B step 2: run after config batch, BEFORE openhtml.
     * Returns true if openhtml may proceed.
     */
    InitialLoadDialog.prototype.runConfigCompleteGate = async function() {
        if (this._sessionValidated) {
            return true;
        }
        if (this._configGatePromise) {
            return this._configGatePromise;
        }

        var self = this;
        this._configGatePromise = (async function() {
            self.setPhase(PHASE.CONFIG_LOADED);
            self.setStatusText('Validating session ...');
            await self.validateSessionThenReady();
            return !!self._sessionValidated;
        })();

        try {
            return await this._configGatePromise;
        } finally {
            this._configGatePromise = null;
        }
    };

    /**
     * Session gate only — success calls onSessionGatePassed (not finishReady).
     * Webpack LinkSession load removed from gate path.
     */
    InitialLoadDialog.prototype.validateSessionThenReady = async function() {
        try {
            if (this._sessionValidated) {
                return;
            }
            if (this._sessionGateStarted && !this._sessionValidated) {
                // In-flight or failed — do not re-enter finishReady path
            }
            this._sessionGateStarted = true;

            var page = this.pageData();
            var isTrackView = (typeof global.IS_TRACK_VIEW !== 'undefined' && global.IS_TRACK_VIEW) || page.is_track_view;
            var isLocalHost = (typeof global.IS_LOCAL_HOST !== 'undefined' && global.IS_LOCAL_HOST) || page.is_local_host;

            this.setStatusText('Validating session ...');

            var docId = window.GET_DOC_ID ? window.GET_DOC_ID() : (typeof DOC_ID !== 'undefined' ? DOC_ID : '');

            if (typeof restoreSessionStorage === 'function') {
                restoreSessionStorage(docId);
            }
            if (typeof syncEditorStorageAfterDocIdInit === 'function') {
                syncEditorStorageAfterDocIdInit(docId);
            }

            if (isTrackView) {
                this.onSessionGatePassed('track_view_allow', docId);
                return;
            }

            var sessionId = String(
                (typeof getCurrentSessionId === 'function' ? getCurrentSessionId() : '') ||
                (typeof getSessionId === 'function' ? getSessionId(docId) : '') ||
                ''
            ).trim();

            if (!sessionId) {
                if (isLocalHost) {
                    this.LocalSessionGate(docId);
                } else {
                    this.handleSessionGateFailure({
                        ok: false,
                        expired: true,
                        reason: 'missing_session_id',
                        alertShown: false
                    });
                }
                return;
            }

            var gateResult = await this.gateLiveSession({
                docId: docId,
                sessionId: sessionId,
                isTrackView: false
            });

            if (!gateResult || !gateResult.ok) {
                if (isLocalHost) {
                    this.LocalSessionGate(docId);
                } else {
                    this.handleSessionGateFailure(gateResult || this.makeGateResult(false, 'gate_error'));
                }
                return;
            }

            this.completeGateReady(gateResult.isTrackView);
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('VALIDATE_SESSION_THEN_READY', err.message);
            this.handleSessionGateFailure({
                ok: false,
                expired: true,
                reason: 'gate_error',
                error: err && err.message,
                alertShown: false
            });
        }
    };

    InitialLoadDialog.prototype.completeGateReady = function(isTrackView) {
        var docId = window.GET_DOC_ID ? window.GET_DOC_ID() : (typeof DOC_ID !== 'undefined' ? DOC_ID : '');
        if (isTrackView) {
            this.onSessionGatePassed('track_view_skip', docId);
            return;
        }
        this.onSessionGatePassed('editor_gate_ok', docId);
    };

    InitialLoadDialog.prototype.handleSessionGateFailure = function(result) {
        try {
            var docId = window.GET_DOC_ID ? window.GET_DOC_ID() : (typeof DOC_ID !== 'undefined' ? DOC_ID : '');
            if (typeof cleanupSessionStorageBackups === 'function' && docId) {
                cleanupSessionStorageBackups(docId, 'single');
            }
            if (typeof clearEditorTabId === 'function') {
                clearEditorTabId(docId);
            } else {
                try {
                    sessionStorage.removeItem('xmleditor:tabid');
                } catch (e) {}
            }

            this.setStatusText('Session expired');
            this._sessionValidated = false;
            this.logGate('editor_gate_fail', {
                ok: false,
                reason: result && result.reason,
                docid: docId,
                session_id: result && result.sessionId
            });

            if (!result || !result.alertShown) {
                var fireAlert = function() {
                    if (typeof AlertNewDialog !== 'undefined' && AlertNewDialog && typeof AlertNewDialog.fire === 'function') {
                        if (!AlertNewDialog.FullyLoaded && typeof AlertNewDialog.init === 'function') {
                            try {
                                AlertNewDialog.init();
                            } catch (e) {}
                        }
                        AlertNewDialog.fire('expired_session_alert');
                    }
                };
                if (typeof AlertNewDialog === 'undefined' || !AlertNewDialog || !AlertNewDialog.FullyLoaded) {
                    setTimeout(fireAlert, 500);
                } else {
                    fireAlert();
                }
            }
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('HANDLE_SESSION_GATE_FAILURE', err.message);
        }
    };

    /**
     * After instanceReady / progress 10: register → tier1 → query → finishReady → tier2.
     */
    InitialLoadDialog.prototype.complete = function() {
        try {
            if (typeof global.InitLog !== 'undefined') {
                global.InitLog('InitialLoadDialog', 'complete');
            }
            if (this._postEditorBootstrapStarted) {
                return;
            }
            if (!this._sessionValidated) {
                // Config/progress hit Ready before gate — run gate first, then bootstrap if ok
                var self = this;
                this.runConfigCompleteGate().then(function(ok) {
                    if (ok) {
                        self.runPostEditorBootstrap();
                    }
                });
                return;
            }
            this.runPostEditorBootstrap();
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('COMPLETE', err.message);
        }
    };

    InitialLoadDialog.prototype.runPostEditorBootstrap = async function() {
        if (this._postEditorBootstrapStarted) {
            return;
        }
        this._postEditorBootstrapStarted = true;

        try {
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
                this.progressInterval = null;
            }

            this.setStatusText('Loading modules ...');

            var Boot = global.EditorBootInit;
            if (Boot && typeof Boot.waitForEditorInstanceReady === 'function') {
                try {
                    await Boot.waitForEditorInstanceReady(60000);
                } catch (waitErr) {
                    console.warn('[InitialLoadDialog] editor not ready:', waitErr && waitErr.message);
                }
            }

            var page = this.pageData();
            var isTrackView = (typeof global.IS_TRACK_VIEW !== 'undefined' && global.IS_TRACK_VIEW) || page.is_track_view;
            var mode = isTrackView ? 'trackView' : 'editor';

            if (typeof global.bootstrapImpactModules === 'function') {
                await global.bootstrapImpactModules({
                    mode: mode
                });
                this.setPhase(PHASE.MODULES_REGISTERED);
            }

            if (Boot && typeof Boot.runTier1 === 'function') {
                await Boot.runTier1({
                    registry: global.moduleRegistry
                });
                this.setPhase(PHASE.TIER1_DONE);
            }

            if (Boot && typeof Boot.runQuery === 'function') {
                await Boot.runQuery({});
                this.setPhase(PHASE.QUERY_DONE);
            }

            await this.finishReady();

            if (isTrackView && Boot && typeof Boot.runTrackFollowUp === 'function') {
                await Boot.runTrackFollowUp({});
            }
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('RUN_POST_EDITOR_BOOTSTRAP', err.message);
            try {
                await this.finishReady();
            } catch (e2) {}
        }
    };

    /**
     * Hide loader, mark FullyLoaded, then tier-2 (CHECK_REQUEST only after ok).
     */
    InitialLoadDialog.prototype.finishReady = async function() {
        try {
            window.__linkSessionReadyAt = Date.now();
            this.FullyLoaded = true;
            this.progressValue = this.progressEndValue;
            this.setPhase(PHASE.READY);

            if (this.statusDiv && this.StatusInfo[this.progressEndValue]) {
                this.statusDiv.textContent = this.StatusInfo[this.progressEndValue];
            }

            if (this.dialogModule) {
                this.dialogModule.classList.add("ds-none");
            }

            if (global.isValidVariable(global.debug)) {
                global.debug.info("--InitialLoadDialog End---" + new Date().toLocaleTimeString());
            }

            var blur = document.getElementById('pageBlurOverlay');
            if (blur) blur.remove();

            await this.onInitializeComplete();
            this.FullyLoaded = true;
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('FINISH_READY', err.message);
            this.FullyLoaded = true;
        }
    };

    InitialLoadDialog.loadLinkSessionEditorModules = async function(registry, maxAttempts) {
        var attempts = maxAttempts || 2;
        var lastErr;
        for (var i = 0; i < attempts; i++) {
            try {
                await registry.getModule('LinkSessionService');
                await registry.getModule('LinkSessionRequestModule');
                return;
            } catch (err) {
                lastErr = err;
                if (i < attempts - 1) {
                    await new Promise(function(resolve) {
                        setTimeout(resolve, 500);
                    });
                }
            }
        }
        throw lastErr;
    };

    InitialLoadDialog.prototype.runTier2Fallback = async function() {
        try {
            var page = this.pageData();
            var isTrackView = (typeof global.IS_TRACK_VIEW !== 'undefined' && global.IS_TRACK_VIEW) || page.is_track_view;
            if (isTrackView) {
                return {
                    ok: true,
                    skipped: true
                };
            }

            if (typeof global.commonfn !== 'undefined' && typeof global.GET_JSON !== 'undefined') {
                global.commonfn.callajax(
                    global.GET_JSON('guideTourStatus', {
                        find: true
                    }),
                    'getguideduser',
                    typeof global.API_GET_USERS !== 'undefined' ? global.API_GET_USERS : null
                );
            }

            if (global.CHECK_REQUEST && typeof global.CHECK_REQUEST.Init === 'function') {
                global.CHECK_REQUEST.Init();
            }
            if (global.LOG_OUT && typeof global.LOG_OUT.Init === 'function') {
                global.LOG_OUT.Init();
            }

            var body = document.getElementById('Body');
            if (body && body.classList) body.classList.remove('ignore-events');
            return {
                ok: true
            };
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('RUN_TIER2_FALLBACK', err.message);
            return {
                ok: false,
                error: err && err.message
            };
        }
    };

    InitialLoadDialog.prototype.onInitializeComplete = async function() {
        try {
            if (typeof global.InitLog !== 'undefined') {
                global.InitLog('InitialLoadDialog', 'onInitializeComplete');
            }
            var Boot = global.EditorBootInit;
            if (Boot && typeof Boot.runTier2 === 'function') {
                await Boot.runTier2({});
            } else {
                await this.runTier2Fallback();
            }
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('ON_INITIALIZE_COMPLETE', err.message);
        }
    };

    InitialLoadDialog.prototype.startProgressMonitoring = function() {
        try {
            if (typeof global.InitLog !== 'undefined') {
                global.InitLog('InitialLoadDialog', 'startProgressMonitoring');
            }

            var self = this;

            if (this.progressInterval) {
                clearInterval(this.progressInterval);
            }

            this.progressInterval = setInterval(function() {
                try {
                    if (self.valueContainer) {
                        self.valueContainer.textContent = self.progressValue + '%';
                    }

                    if (self.progressBar) {
                        var colorHex = self.progressValue >= self.progressEndValue ?
                            '72C245' :
                            'FF8E33';

                        self.progressBar.style.background =
                            'conic-gradient(#' + colorHex + ' ' +
                            (self.progressValue * 36) + 'deg, #F0F0F0 ' +
                            (self.progressValue * 36) + 'deg)';
                    }

                    // Config batch done → early session gate (before openhtml may already be waiting)
                    if (
                        !self._sessionGateStarted &&
                        global.isValidVariable(global.LOADING_CONFIG) &&
                        global.LOADING_CONFIG.isFullyLoaded === true
                    ) {
                        self.runConfigCompleteGate();
                    }

                    // Editor shell + progress done → post-editor module bootstrap
                    if (
                        self.progressValue >= self.progressEndValue &&
                        global.isValidVariable(global.LOADING_CONFIG) &&
                        global.LOADING_CONFIG.isFullyLoaded === true &&
                        self._sessionValidated
                    ) {
                        self.complete();
                        return;
                    }

                    if (self.StatusInfo[self.progressValue] && self.statusDiv) {
                        self.statusDiv.textContent = self.StatusInfo[self.progressValue];
                    }
                } catch (err) {
                    console.warn(err.message);
                }
            }, 100);
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace !== 'undefined') {
                ErrorLogTrace('START_PROGRESS_MONITORING', err.message);
            }
        }
    };

    InitialLoadDialog.PHASE = PHASE;
    global.InitialLoadDialog = new InitialLoadDialog();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof global.InitialLoadDialog !== 'undefined') {
                global.InitialLoadDialog.init();
            }
        });
    } else {
        if (typeof global.InitialLoadDialog !== 'undefined') {
            global.InitialLoadDialog.init();
        }
    }

})(window);