/**
 * EditorBootInit — central registry of explicit Init/init calls (non-register).
 * Flow B phases: editorShell → tier1 → query → tier2 → trackFollowUp.
 * ModuleRegistry registration stays in the module_main bundle (bootstrapImpactModules.js).
 */
(function(global) {
    'use strict';

    function safeCall(module, method, args) {
        try {
            if (typeof module !== 'undefined' && module && typeof module[method] === 'function') {
                module[method].apply(module, args || []);
                return true;
            }
        } catch (err) {
            console.warn('[EditorBootInit] ' + method + ' failed:', err && err.message);
            if (typeof ErrorLogTrace !== 'undefined') {
                ErrorLogTrace('EDITOR_BOOT_INIT_' + method, err && err.message);
            }
        }
        return false;
    }

    function waitForInit(moduleRef, method, interval, timeoutMs) {
        method = method || 'Init';
        interval = interval || 1000;
        timeoutMs = timeoutMs || 30000;
        return new Promise(function(resolve) {
            var started = Date.now();
            var timer = setInterval(function() {
                var mod = typeof moduleRef === 'function' ? moduleRef() : moduleRef;
                if (safeCall(mod, method)) {
                    clearInterval(timer);
                    resolve(true);
                    return;
                }
                if (Date.now() - started > timeoutMs) {
                    clearInterval(timer);
                    resolve(false);
                }
            }, interval);
        });
    }

    function waitForCall(moduleRef, method, args, interval, timeoutMs) {
        method = method || 'Init';
        interval = interval || 1000;
        timeoutMs = timeoutMs || 30000;
        return new Promise(function(resolve) {
            var started = Date.now();
            var timer = setInterval(function() {
                var mod = typeof moduleRef === 'function' ? moduleRef() : moduleRef;
                if (safeCall(mod, method, args)) {
                    clearInterval(timer);
                    resolve(true);
                    return;
                }
                if (Date.now() - started > timeoutMs) {
                    clearInterval(timer);
                    resolve(false);
                }
            }, interval);
        });
    }

    function pageIsTrackView() {
        if (typeof global.IS_TRACK_VIEW !== 'undefined' && global.IS_TRACK_VIEW) return true;
        var app = (global.location && global.location.pathname || '').split('/').filter(Boolean)[0] || '';
        return /trackview/i.test(app);
    }

    var EditorBootInit = {
        PHASE: {
            EDITOR_SHELL: 'editorShell',
            TIER1: 'tier1',
            QUERY: 'query',
            TIER2: 'tier2',
            LEGACY_EDITOR: 'legacyEditor',
            TRACK: 'track'
        },

        /**
         * Wait until CKEditor instance document is live (same check as QueryBaseModule.waitForEditor).
         */
        waitForEditorInstanceReady: function(timeoutMs) {
            timeoutMs = timeoutMs || 60000;
            return new Promise(function(resolve, reject) {
                var started = Date.now();

                function check() {
                    var ed = global.GlobalEditor || (global.CKEDITOR && global.CKEDITOR.instances && global.CKEDITOR.instances.maineditor);
                    if (ed && ed.document && ed.document.$) {
                        resolve(ed);
                        return;
                    }
                    if (Date.now() - started > timeoutMs) {
                        reject(new Error('waitForEditorInstanceReady timed out'));
                        return;
                    }
                    setTimeout(check, 100);
                }
                check();
            });
        },

        /**
         * Shell inits during CKEditor boot (called from editor_open, after replace).
         * Does not run after session gate — tied to editor_initialize_events.
         */
        runEditorShellInits: function(data) {
            try {
                if (pageIsTrackView()) {
                    if (global.GlobalEditor && typeof global.GlobalEditor.setData === 'function' && data != null) {
                        global.GlobalEditor.setData(data);
                    }
                    return;
                }

                if (typeof global.SET_DATA !== 'undefined' && global.SET_DATA && typeof global.SET_DATA.init === 'function') {
                    global.SET_DATA.init(data);
                }



                safeCall(global.FormattingHandler, 'init');
                safeCall(global.SYNC_CLICK_EVENT, 'Init');
                safeCall(global.IMPACT_SAVE, 'Init');
                safeCall(global.FinalizeDialog, 'init');
                safeCall(global.trackDialog, 'init');

                if (global.MAINTENANCE && typeof global.MAINTENANCE.Init === 'function') {
                    var starttime = null;
                    try {
                        starttime = sessionStorage.getItem('MAINTENANCE_START');
                    } catch (e) {}
                    var Obj = {
                        init: true
                    };
                    var timer = 5000;
                    if (starttime) {
                        timer = 100;
                        Obj.start = starttime;
                        delete Obj.init;
                    }
                    setTimeout(function() {
                        global.MAINTENANCE.Init(Obj);
                    }, timer);
                }
            } catch (err) {
                console.warn(err.message);
                if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('RUN_EDITOR_SHELL_INITS', err.message);
            }
        },

        /**
         * Tier-1 after gate + instanceReady: Alert + LinkSession webpack modules only.
         * Does NOT call CHECK_REQUEST.Init (tier-2).
         */
        runTier1: async function(ctx) {
            ctx = ctx || {};
            try {
                if (typeof global.AlertNewDialog !== 'undefined' && global.AlertNewDialog && typeof global.AlertNewDialog.init === 'function') {
                    if (!global.AlertNewDialog.FullyLoaded) {
                        global.AlertNewDialog.init();
                    }
                }

                var registry = ctx.registry || global.moduleRegistry;
                if (!registry || typeof registry.getModule !== 'function') {
                    return {
                        ok: true,
                        skippedLinkSession: true
                    };
                }

                if (typeof InitialLoadDialog !== 'undefined' && InitialLoadDialog.loadLinkSessionEditorModules) {
                    await InitialLoadDialog.loadLinkSessionEditorModules(registry, 2);
                } else {
                    await registry.getModule('LinkSessionService');
                    await registry.getModule('LinkSessionRequestModule');
                }
                return {
                    ok: true
                };
            } catch (err) {
                console.warn('[EditorBootInit] runTier1:', err && err.message);
                if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('RUN_TIER1', err && err.message);
                return {
                    ok: false,
                    error: err && err.message
                };
            }
        },

        /**
         * Query panel / dialog bootstrap (editor full stack; Track View panel + readonly dialog).
         */
        runQuery: async function(ctx) {
            ctx = ctx || {};
            try {
                var isTrack = pageIsTrackView();

                if (typeof global.ensureQueryModule === 'function') {
                    await global.ensureQueryModule();
                    return {
                        ok: true,
                        via: 'ensureQueryModule'
                    };
                }

                if (global.queryModule && typeof global.queryModule.initialize === 'function') {
                    await global.queryModule.initialize();
                    return {
                        ok: true,
                        via: 'queryModule.initialize'
                    };
                }

                if (global.queryModule && typeof global.queryModule.postInitializeModule === 'function') {
                    await global.queryModule.postInitializeModule();
                    return {
                        ok: true,
                        via: 'queryModule.postInitializeModule'
                    };
                }

                if (isTrack && typeof global.QueryPanelModule === 'function') {
                    // Minimal track fallback when QueryBaseModule instance missing
                    return {
                        ok: true,
                        via: 'track_fallback_skip'
                    };
                }

                return {
                    ok: true,
                    skipped: true
                };
            } catch (err) {
                console.warn('[EditorBootInit] runQuery:', err && err.message);
                if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('RUN_QUERY', err && err.message);
                return {
                    ok: false,
                    error: err && err.message
                };
            }
        },

        /**
         * Legacy editor module inits that used to run from commonEvtHandler.instanceReady.
         */
        runLegacyEditorInits: async function() {
            if (pageIsTrackView()) return {
                ok: true,
                skipped: true
            };
            try {
                if (typeof global.InitialLoadDialog !== 'undefined' &&
                    global.InitialLoadDialog &&
                    typeof global.InitialLoadDialog.updateProgress === 'function') {
                    global.InitialLoadDialog.updateProgress(10);
                }

                await Promise.all([
                    waitForCall(function() {
                        return global.PDF_THUMBNAIL;
                    }, 'LAZY_LOAD', [], 1000, 5000),
                    waitForCall(function() {
                        return global.AuthorGroupNewModule;
                    }, 'init', [], 1000, 5000),
                    waitForCall(function() {
                        return global.ParaGroup;
                    }, 'Init', [], 1000, 5000)
                ]);

                if (global.IMPACT_SAVE && typeof global.IMPACT_SAVE.iSave === 'function') {
                    global.IMPACT_SAVE.iSave({
                        roleOriginal: true
                    });
                }

                return {
                    ok: true
                };
            } catch (err) {
                console.warn('[EditorBootInit] runLegacyEditorInits:', err && err.message);
                if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('RUN_LEGACY_EDITOR_INITS', err && err.message);
                return {
                    ok: false,
                    error: err && err.message
                };
            }
        },

        /**
         * Track View follow-up after query: trackDialog + readonly cleanup hooks.
         */
        runTrackFollowUp: async function(ctx) {
            ctx = ctx || {};
            if (!pageIsTrackView()) return {
                ok: true,
                skipped: true
            };
            try {
                var dialog = null;
                if (typeof global.getTrackDialog === 'function') {
                    dialog = await global.getTrackDialog();
                } else if (typeof global.ensureTrackDialogReady === 'function') {
                    dialog = await global.ensureTrackDialogReady();
                }

                if (dialog) {
                    global.trackDialog = dialog;
                }

                if (global.trackDialog && typeof global.trackDialog.applySupportConfig === 'function') {
                    global.trackDialog.applySupportConfig();
                }

                if (typeof global.trackDialog !== 'undefined' && global.trackDialog && typeof global.trackDialog.init === 'function') {
                    if (!global.trackDialog.FullyLoaded) {
                        console.log('[EditorBootInit] trackDialog.init triggered');
                        global.trackDialog.init();
                    } else {
                        console.log('[EditorBootInit] trackDialog.init skipped: already FullyLoaded');
                    }
                } else if (typeof global.getTrackDialog === 'function') {
                    console.log('[EditorBootInit] trackDialog.init skipped: init unavailable');
                }

                if (typeof global.queryPanel !== 'undefined' && global.queryPanel && typeof global.queryPanel.render === 'function') {
                    global.queryPanel.render(true);
                }
                return {
                    ok: true
                };
            } catch (err) {
                console.warn('[EditorBootInit] runTrackFollowUp:', err && err.message);
                if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('RUN_TRACK_FOLLOW_UP', err && err.message);
                return {
                    ok: false,
                    error: err && err.message
                };
            }
        },

        /**
         * Editor-only tier-2 after finishReady: CHECK_REQUEST scheduler, LOG_OUT, guide tour.
         */
        runTier2: async function(ctx) {
            ctx = ctx || {};
            if (pageIsTrackView()) return {
                ok: true,
                skipped: true
            };
            try {
                if (typeof global.commonfn !== 'undefined' && typeof global.GET_JSON !== 'undefined') {
                    global.commonfn.callajax(
                        global.GET_JSON('guideTourStatus', {
                            find: true
                        }),
                        'getguideduser',
                        typeof global.API_GET_USERS !== 'undefined' ? global.API_GET_USERS : null
                    );
                }

                await waitForInit(function() {
                    return global.CHECK_REQUEST;
                }, 'Init', 1000, 30000);
                await waitForInit(function() {
                    return global.LOG_OUT;
                }, 'Init', 1000, 30000);
                await EditorBootInit.runLegacyEditorInits();

                var body = document.getElementById('Body');
                if (body && body.classList) {
                    body.classList.remove('ignore-events');
                }
                return {
                    ok: true
                };
            } catch (err) {
                console.warn('[EditorBootInit] runTier2:', err && err.message);
                if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('RUN_TIER2', err && err.message);
                return {
                    ok: false,
                    error: err && err.message
                };
            }
        },

        runPhase: async function(phase, ctx) {
            switch (phase) {
                case EditorBootInit.PHASE.EDITOR_SHELL:
                    return EditorBootInit.runEditorShellInits(ctx && ctx.data);
                case EditorBootInit.PHASE.TIER1:
                    return EditorBootInit.runTier1(ctx);
                case EditorBootInit.PHASE.QUERY:
                    return EditorBootInit.runQuery(ctx);
                case EditorBootInit.PHASE.TIER2:
                    return EditorBootInit.runTier2(ctx);
                case EditorBootInit.PHASE.LEGACY_EDITOR:
                    return EditorBootInit.runLegacyEditorInits(ctx);
                case EditorBootInit.PHASE.TRACK:
                    return EditorBootInit.runTrackFollowUp(ctx);
                default:
                    console.warn('[EditorBootInit] unknown phase:', phase);
                    return {
                        ok: false, reason: 'unknown_phase'
                    };
            }
        },

        listPhases: function() {
            return [{
                    phase: 'editorShell',
                    calls: ['SET_DATA.init', 'FormattingHandler.init', 'SYNC_CLICK_EVENT.Init', 'IMPACT_SAVE.Init', 'MAINTENANCE.Init']
                },
                {
                    phase: 'tier1',
                    calls: ['AlertNewDialog.init', 'getModule(LinkSessionService)', 'getModule(LinkSessionRequestModule)']
                },
                {
                    phase: 'query',
                    calls: ['QueryBaseModule.initialize / ensureQueryModule']
                },
                {
                    phase: 'track',
                    calls: ['trackDialog.init', 'queryPanel.render']
                },
                {
                    phase: 'tier2',
                    calls: ['CHECK_REQUEST.Init', 'LOG_OUT.Init', 'PDF_THUMBNAIL.LAZY_LOAD', 'AuthorGroupNewModule.init', 'ParaGroup.Init', 'IMPACT_SAVE.iSave', 'guideTourStatus ajax', 'Body.ignore-events remove']
                }
            ];
        }
    };

    global.EditorBootInit = EditorBootInit;
})(window);