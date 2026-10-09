


document.addEventListener('DOMContentLoaded', function (event) {
    try {
        var EDITOR_READY_ONLY_MODE = function (data) {
            try {
                setTimeout(function () {
                    $('.cke_contents').addClass('trackView');
                    $("#cke_1_top").css('display', 'none');
                    setTimeout(() => {
                        var TRACK_INTERVAL_COUNT = 0;
                        var TRACK_INTERVAL = setInterval(function () {
                            if (typeof trackDialog != "undefined" && !!trackDialog && !!I_CONFIG) {
                                //trackDialog.initLoop(data);
                                var CSS_STYLE = [
                                    '[data-action="Rejected"][data-action-old-tag="INSERT"][data-action-hidden="Yes"]{color: red !important;text-decoration: line-through!important;}',
                                    '[data-class=ckcommentsfull]:hover, [data-class=pi_info]:hover,a.xref:hover,.email,.email:hover,.uri,.uri:hover,.ext-link,.ext-link:hover,.tc:hover{cursor: text!important;}',
                                    'a.xref:not([data-remove]),.uri{color: #3333FF;}',
                                    '.TrackChangesList, .TrackChangesListKW, .TrackChangesListABR{cursor: text!important;}'
                                ];
                                changeTrackTime();
                                var [d, STYLE] = [GlobalEditor.document.getHead().$, document.createElement('style')];
                                d.appendChild(STYLE);
                                STYLE.type = "text/css";
                                STYLE.rel = "stylesheet";
                                STYLE.setAttribute('data-cke-temp', '1');
                                STYLE.textContent = CSS_STYLE.join("");
                                clearInterval(TRACK_INTERVAL);
                                InitialLoadDialog.updateProgress(10);
                            } else {
                                TRACK_INTERVAL_COUNT++;
                                console.log(TRACK_INTERVAL_COUNT);
                                if (TRACK_INTERVAL_COUNT > 10 && (!trackDialog || !trackDialog.FullyLoaded)) {
                                    if (typeof window.ensureTrackDialogReady === 'function') {
                                        window.ensureTrackDialogReady();
                                    } else if (trackDialog && typeof trackDialog.init == "function") {
                                        trackDialog.init();
                                    }
                                }
                            }
                        }, 2500);
                    }, 2000);
                }, 2000);
                
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('EDITOR_READY_ONLY_MODE', err.message);
            }
        };
        var clean_up_readonly_mode = function (editor, editorDoc, Options = {}) {
            editorDoc = editor.document;
            try {
                editorDoc.find('a[href]').toArray().forEach((el, index, array) => {
                    el.removeAttributes(['href', 'data-cke-saved-href']);
                });
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('clean_up_readonly_mode', err.message);
            }
        };

        var queryCommentInitilize = async function () {
            try {
                if (typeof ensureQueryModule === "function") {
                    await ensureQueryModule();
                } else if (window.queryModule && typeof window.queryModule.initialize === "function") {
                    await window.queryModule.initialize();
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('queryCommentInitilize', err.message);
                return;
            }

            setTimeout(async () => {
                try {
                    if (typeof window.ensureTrackDialogReady === 'function') {
                        await window.ensureTrackDialogReady();
                    } else if (typeof window.getTrackDialog === 'function') {
                        await window.getTrackDialog();
                    }
                    if (window.trackDialog && typeof window.trackDialog.init === 'function') {
                        trackDialog.init();
                    }
                    const entryGroup = trackDialog && trackDialog.IBOX && trackDialog.IBOX.EntryGroup;
                    if (entryGroup) {
                        let firstItem = entryGroup.children[0];
                        if (firstItem && trackDialog.M_FUN) trackDialog.M_FUN.selectEntry(firstItem);
                    }

                    clean_up_readonly_mode(CKEDITOR.instances.maineditor);
                    CKEDITOR.instances.maineditor.setReadOnly(true);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('queryCommentInitilize_track', err.message);
                }
            }, 2000);
        };

        CKEDITOR.on('instanceReady', function (ev) {
            // FullyLoaded is owned by InitialLoadDialog.finishReady (Flow B) — do not force here
            if (IS_TRACK_VIEW) {
                ['unlink', 'link', ACCEPT, REJECT].forEach((menu) => {
                    GlobalEditor.removeMenuItem(menu);
                });
                EDITOR_READY_ONLY_MODE(ev.editor.getData());
                queryCommentInitilize();

                GlobalEditor.on("selectionChange", function (e) {
                    try {
                        var selection = GlobalEditor.getSelection();
                        var cur_node = selection.getStartElement();
                        debug.log("selectionChange --> " + cur_node.$.id);

                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('selectionChange', err.message);
                    }
                });
                GlobalEditor.on('beforeCommandExec', function (event) {
                    console.log(event.data.name);
                    if (['copy'].includes(event.data.name)) {
                        console.log('ALLOWED');
                    } else {
                        event.cancel();
                        return false;
                    }
                });
            }
        });

        if (!IS_JOURNAL) document.getElementById('rTitleGroup').remove();

        const intervalId = setInterval(() => {
            // Ensure SHARED_KEY exists and has the required properties
            if (
                typeof SHARED_KEY !== 'undefined' &&
                SHARED_KEY.client &&
                SHARED_KEY.dtd &&
                SHARED_KEY.identifier
            ) {
                // Now you can safely use them
                const titleGroup = document.getElementById('trackTitleGroup');
                const titleLabel = document.getElementById('track-label');
                const titleValue = document.getElementById('track-title');

                if (titleLabel && titleValue) {
                    titleLabel.textContent = SHARED_KEY.dtd == "JATS" ? 'DOI: ' : 'ISBN: ';
                    titleValue.textContent = SHARED_KEY.identifier;
                }

                // stop polling once ready
                clearInterval(intervalId);
            }
        // check every 500ms
        }, 500);


    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('DOMContentLoaded', err.message);
    }
});
