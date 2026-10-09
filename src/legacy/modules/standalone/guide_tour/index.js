/* 

https://bootstraptour.com/api/

*/

export default class GuidedTour {
    constructor(name, options = {}) {

        this.config = {
            name: 'tour',
            steps: [],
            container: 'body',
            keyboard: false,
            storage: false,
            debug: false,
            backdrop: true,
            backdropContainer: 'body',
            backdropPadding: 0,
            redirect: true,
            orphan: false,
            duration: 5000,
            delay: false,
            template: "",
            autoscroll: true,
            smartPlacement: true,
            ...options
        };

        this.isPaused = false;
        this.currentStep = 0;
        this.currentStep_config = null;
        this.TourHistory = [];
        this.InitalSteps = [{
            element: '#iEditorSection',
            name: "Editor Section",
            duration: 8000,
            // ? Mantis 1996803: More specific and detailed guidance. RK_13_DEC_2023 --> 
            // ? 3317967: Editor section slide content update in guided tour RJ_03_Jan_2025
            content: '<p class="tour-header">Editor Section</p><p class="tour-body">Implement your corrections via the Editor View. To insert text place the cursor at the required point and start typing. To delete text, use the Delete or Backspace key. Formatting options are available from the toolbar.</p>'
        }, {
            element: '.pdf-section',
            name: "Proof Section",
            placement: "left",
            duration: 28000,
            // ? 2154553: Guided tour slide non-proof page and the pdf page Sean release message update
            content: '<p class="tour-header">Proof Section</p><p class="tour-body">This section presents the typeset proof of your {{DOC_TYPE}}, allowing you to examine the page layout. It provides a read-only view for reviewing the Proof PDF page. Please note that any modifications made in the editor panel will not be reflected in the PDF view. However, The typesetting team will automatically transfer and verify the corrections before online publication. If there are any page layout corrections, please insert them as comments via the editor panel.</p>'
        }, {
            // ? 1996632: Guided Tour Editor and Proof page
            element: '.pdf-menu-header',
            name: "Proof PDF Navigation",
            placement: "left",
            duration: 6000,
            content: '<p class="tour-header">Proof PDF Navigation</p><p class="tour-body">Use the navigation buttons to move to the previous or next pages in the proof PDF.</p>'
        }, {
            element: '#filesaving',
            name: "File Saving",
            placement: "bottom",
            duration: 7000,
            content: '<p class="tour-header">File Saving</p><p class="tour-body">You can use this menu to save your {{DOC_TYPE}}. Please note your {{DOC_TYPE}} will be autosaved once in every 30 seconds.</p>'
        }, {
            element: '.cke_reset_all',
            name: "Toolbar Menu",
            duration: 19000,
            content: '<p class="tour-header">Toolbar Menu</p><p class="tour-body">The text editor toolbar menu provides various essential functions. You can easily apply formatting, undo/redo content changes, insert symbols, manage lists, and more, to enhance your content editing. Please note: Hovering your mouse on these options will display shortcut keys for quick access.</p>'
        }, {
            element: '#btn_toc',
            name: "TOC Panel",
            content: '<p class="tour-header">TOC</p><p class="tour-body">You can navigate to any specific headings by clicking the links.</p>'
        }, {
            element: '#btn_qry',
            name: "Queries Panel",
            duration: 21000,
            // ? 2912368: Finalize Check Query content update
            content: '<p class="tour-header">Queries</p><p class="tour-body">Please ensure that you respond to all author queries raised by the copy editors by either selecting "Queries" in the left-hand pane, selecting "Reply" on the query you wish to respond to, and choose the appropriate option: {{QUICK_OPTIONS}}, or by clicking on the query directly in the text editor and responding via the "Response Query" dialogue box.</p>',
            custom_selector: '#btn_qry'
        }, {
            element: '#btn_cts',
            duration: 9000,
            name: "Comments / Instructions",
            content: '<p class="tour-header">Comments / Instructions</p><p class="tour-body">The comments option allows you to provide instructions to production editor or typesetting team. You could also include attachments to the comment as required.</p>',
            custom_selector: '#btn_cts'
        }, {
            // ? 1868633: Guided Tour Show Markup
            element: '#showTrackDiv',
            name: "Show Markup",
            content: '<p class="tour-header">Show Markup</p><p class="tour-body">It allows you to switch between show / hide track changes during the proof review process.</p>'
        }, {
            element: '#shareFileBtn',
            name: "Share Link",
            placement: "bottom",
            content: '<p class="tour-header">Share Link</p><p class="tour-body">Click this button to share the {{DOC_TYPE}} content with your co-authors.</p>'
        }, {
            element: '#btn-view',
            name: "View Panel",
            placement: "bottom",
            duration: 30000,
            content: `<p class="tour-header">View Panel</p><p class="tour-body">
                    <p><b>Editor View</b> – Only View for a better content editing experience using a full screen.</p>
                    <p><b>PDF View</b> – PDF Only View to review the Proof PDF in full screen. Text edits and Comments / annotations are not available in this view.</p>
                    <p><b>Combined View</b> – Combined View displays both the Editor view and Proof PDF view simultaneously with synchronization scroll for better readability.</p>
                    <p><b>Maximize View</b> – This option helps to maximize the Editor view.</p>
                    </p>`
        }, {
            element: '#onlineStatus',
            name: "Online Status",
            placement: "bottom",
            content: '<p class="tour-header">Online Status</p><p class="tour-body">Showing network connection status.</p>'
        }, {
            // ? 1996643: Inserting references pop-up || 3316657: Guided Tour adding a reference slide
            element: '#insertRefmenu',
            name: "Insert Reference",
            content: `<p class="tour-header">Insert Reference</p><p class="tour-body">DOI - Retrieve a reference using its DOI, with the option to make adjustments before inserting.<br>Form Based - Manually enter reference details using a form, without a DOI. You can type or paste the reference information into designated fields.<br>Plain Text - Type or paste the plain text version of the reference directly into the text.<br>Note: For Book, Web, or other reference types, only the Plain Text option is available.</p>`,
            custom_selector: '#link_menu .dropdown',
            duration: 17000
        }, {
            /* 1798531: Guided tour slide */
            element: '#downloadPdfList',
            name: "Download PDFs",
            placement: "bottom",
            content: '{{{SHOW_PDF_LIST}}}',
            duration: 24000
            // ! DON'T REMOVE | DYNAMIC FIX
        }, {
            element: '#HelpDiv',
            name: "Help",
            placement: "left",
            content: '<p class="tour-header">Help</p><p class="tour-body">Menu that can be used if you are having problems and questions or want to find out how to do something. You can use this menu to know information and instructions to use this proofing system.</p>',
            custom_selector: '#HelpDiv',
            orphan: true,
            duration: 12000
        }, {
            element: '#finalize',
            name: "Finalize",
            placement: "bottom",
            content: '<p class="tour-header">Finalize</p><p class="tour-body">After you made all the required changes and answered all the author queries, please indicate your approval by clicking the Finalize button. <br/>Please note you will not be able to make any further changes after you finalize the {{DOC_TYPE}}.</p>',
            duration: 15000
        }, {
            element: '#log_out_btn',
            name: "Log out",
            placement: "bottom",
            content: '<p class="tour-header">Log out</p><p class="tour-body">When you log out, your session will end without finalizing the proof. You can then log back in later from the landing page and continue editing the document.</p>',
            duration: 9000
        }];
        this.stateProperties = {
            "pause": {
                "title": "Resume",
                "type": "resume",
                "src": "assets/images/svg/g_tour/gtResumeWithPLAY.svg",
                "dataFile": "gtResumeWithPLAY"
            },
            "resume": {
                "title": "Pause",
                "type": "pause",
                "src": "assets/images/svg/g_tour/gtPauseWithPAUSE.svg",
                "dataFile": "gtPauseWithPAUSE"
            }
        };
        this.dynamic_content = {
            "QUICK_OPTIONS": {
                "default": '"Yes", "No" or "Add Comment"',
                "LWW": `"OK" or "Add Comment"`
            }
        };

        this.tour = null;
        this._initReady = false;
        this._hasStartedTour = false;
        this._startPromise = null;
        this._initPromise = this.init().catch((err) => {
            this.logError('init', err || { message: 'GuidedTour init failed' });
        });
        this.totalSteps = 0;
    }
    resetRecord() {
        this.tourStartTime = null;
        this.tourEndTime = null;
        this.currentTourHistory = {};
    }

    getDownloadPdfVisibility() {

        const initialLoadDialog = window.InitialLoadDialog;
        const phases = initialLoadDialog && initialLoadDialog.constructor && initialLoadDialog.constructor.PHASE;

        if (!initialLoadDialog || !phases || initialLoadDialog.phase !== phases.READY) {
            return null;
        }

        if (typeof IsContextMenu !== "function") {
            return null;
        }
        try {

            return {
                proof_pdf: commonMethods.IsVisibleElm("proof_pdf"),
                i_track_pdf: commonMethods.IsVisibleElm("i_track_pdf"),
                ce_track_pdf: commonMethods.IsVisibleElm("ce_track_pdf")
            };
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace === "function") {
                ErrorLogTrace("GuidedTour.getDownloadPdfVisibility", err.message);
            }
            return null;
        }
    }

    getDownloadPdfOrderKey(visibility) {

        const {
            proof_pdf,
            i_track_pdf,
            ce_track_pdf
        } = visibility;

        if (proof_pdf && i_track_pdf && ce_track_pdf) {
            return "ORDER_1";
        }

        if (proof_pdf && i_track_pdf && !ce_track_pdf) {
            return "ORDER_2";
        }

        if (!proof_pdf && i_track_pdf && ce_track_pdf) {
            return "ORDER_3";
        }

        return "";
    }

    buildDownloadPdfFallbackContent(visibility) {
        const pdfItems = [{
            key: "ce_track_pdf",
            html: '<p><b>CE Track PDF</b> – Here, you can download a Copy-edited PDF with track changes for your reference.</p>'
        }, {
            key: "proof_pdf",
            html: '<p><b>Proof PDF</b> – Here, you can download a PDF of the typeset proof for review purposes only. Any changes or edits should be made directly within the Text editor.</p>'
        }, {
            key: "i_track_pdf",
            html: '<p><b>Generate Track PDF</b> – Here, you can download a track change PDF that highlights the differences between the initial proof and your applied corrections.</p>'
        }];
        const enabledItems = pdfItems.filter(item => visibility[item.key]).map(item => item.html);

        if (!enabledItems.length) {
            return "";
        }

        const header = enabledItems.length > 1 ? "Download PDFs" : "Download PDF";
        return `<p class="tour-header">${header}</p><p class="tour-body">${enabledItems.join("")}</p>`;
    }

    buildDownloadPdfTourContent() {

        // if (IS_LOCAL_HOST) debugger;

        const visibility = this.getDownloadPdfVisibility();
        debug.log(visibility);


        const hasAnyPdf = visibility && (visibility.proof_pdf || visibility.i_track_pdf || visibility.ce_track_pdf);
        if (!hasAnyPdf) return "";

        return this.buildDownloadPdfFallbackContent(visibility);
    }

    async initBefore() {
        console.log("----initBefore---");
        await new Promise(resolve => {
            const isConfigLoaded = () => {
                const initialLoadDialog = window.InitialLoadDialog;
                const phases = initialLoadDialog && initialLoadDialog.constructor && initialLoadDialog.constructor.PHASE;
                return !!(initialLoadDialog && phases && initialLoadDialog.phase === phases.READY);
            };

            if (isConfigLoaded()) {
                resolve();
                return;
            }

            const intervalId = setInterval(() => {
                if (isConfigLoaded()) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 999);
        });

        let key_client = window.SHARED_KEY && window.SHARED_KEY.client ? window.SHARED_KEY.client.toUpperCase() : "default";
        let quickOptions = this.dynamic_content.QUICK_OPTIONS[key_client] || this.dynamic_content.QUICK_OPTIONS.default;
        let params = {
            'DOC_TYPE': IS_JOURNAL ? ('article') : ('book/chapters'),
            'QUICK_OPTIONS': quickOptions,
            'SHOW_PDF_LIST': this.buildDownloadPdfTourContent()
        };
        const updatedSteps = this.InitalSteps.map(entry => {
            var content = entry.content;
            // Creating a new object without the old key 
            let newEntry = Object.assign({}, entry);
            newEntry.content = Mustache.render(content, params);
            return newEntry;

        }).filter(Boolean);
        this.config.steps = updatedSteps;
    }

    async init() {
        await this.initBefore();
        this.totalSteps = this.config.steps.length;
        this.tour = new Tour(this.getExtendedConfig());
        this.tour.init();
        this.attachEventListeners();
        this.updateCurrentStepConfig(0);
        this.updateProgressBar(0);
        this._initReady = true;
        this.HandlingSessionStorage();
        this.resetRecord();
    }

    async ensureTourReady() {
        if (this._initReady && this.tour) return true;
        if (this._initPromise) {
            try {
                await this._initPromise;
            } catch (err) {
                this.logError('ensureTourReady', err || { message: 'GuidedTour init failed' });
            }
        }
        return !!(this._initReady && this.tour);
    }

    getExtendedConfig() {
        this.config.template = `<div id='GuidedTourPop' tabindex="0" class='popover tour GuidedTourPop'>
                    <div class='arrow'></div>
                    <h3 class='popover-title'></h3>
                    <div class='popover-content' tabindex="0"></div>
                    <div class='popover-navigation'>
                        <div class='btn-group ml-2'>
                            <button class='btn btn-sm btn-default mr-2' data-role='prev' tabindex="0">« Prev</button>
                            <button class='btn btn-sm btn-default mr-2' data-role='next' tabindex="0">Next »</button>
                            <button class="btn btn-sm btn-default" data-role="pause-resume" data-pause-text="Pause" data-resume-text="Resume" tabindex="0">Pause</button>
                        </div>
                        <button class='btn btn-sm btn-default' data-role='end' tabindex="0">End tour</button>                        
                    </div>
                    <div class='progress'>
                        <div class='progress-bar bg-danger' id='tourprogress' role='progressbar' style='width: 10%' aria-valuenow='10' aria-valuemin='0' aria-valuemax='100'></div>
                    </div>
                </div>`;
        return {
            ...this.config,
            onStart: (tour) => {
                this.onStart(tour);
                if (this.config.onStart) this.config.onStart(tour);
            },
            onEnd: (tour) => {
                this.onEnd(tour);
                if (this.config.onEnd) this.config.onEnd(tour);
            },
            onShow: (tour) => {
                this.onShow(tour);
                if (this.config.onShow) this.config.onShow(tour);
            },
            onShown: (tour) => {
                this.onShown(tour);
                if (this.config.onShown) this.config.onShown(tour);
            },
            onHide: (tour) => {
                this.onHide(tour);
                if (this.config.onHide) this.config.onHide(tour);
            },
            onHidden: (tour) => {
                this.onHidden(tour);
                if (this.config.onHidden) this.config.onHidden(tour);
            },
            onNext: (tour) => {
                this.onNext(tour);
                if (this.config.onNext) this.config.onNext(tour);
            },
            onPrev: (tour) => {
                this.onPrev(tour);
                if (this.config.onPrev) this.config.onPrev(tour);
            },
            onPause: (tour) => {
                this.onPause(tour);
                if (this.config.onPause) this.config.onPause(tour);
            },
            onResume: (tour) => {
                this.onResume(tour);
                if (this.config.onResume) this.config.onResume(tour);
            }
        };
    }

    updateProgressBar(stepIndex) {
        setTimeout((stepIndex) => {
            const totalSteps = this.config.steps.length;
            const percent = ((stepIndex + 1) / totalSteps * 100).toFixed(2);
            const progressBar = document.getElementById('tourprogress');
            if (progressBar) {
                progressBar.style.width = `${percent}%`;
                progressBar.setAttribute('aria-valuenow', percent);
            }
        }, 100, stepIndex);
    }
    // Mouse enter and leave events
    handleMouseEnterLeave(e) {
        const element = e.currentTarget;
        const prefix = "assets/images/svg/g_tour/";
        const suffix = ".svg";
        const isOver = e.type === "mouseenter";
        const fileName = element.getAttribute('data-file');
        const imgSrc = `${prefix}${fileName}${isOver ? "_2" : ""}${suffix}`;
        $(element.querySelector('img')).attr("src", imgSrc);
    }

    attachEventListeners() {
        // $(document).on('click', '#PauseResume', this.togglePauseResume.bind(this));
        // $(document).on('click', '#prev', () => this.tour.prev());
        // $(document).on('click', '#next', () => this.tour.next());
        // $(document).on('mouseenter mouseleave', "#PauseResume, #prevBtn, #nextBtn, #endBtn", this.handleMouseEnterLeave.bind(this));
        // Better approach using addEventListener
        document.getElementById('guide_tour').addEventListener('click', function() {
            void this.start().catch((err) => {
                this.logError('guide_tour click', err || { message: 'GuidedTour start failed' });
            });
        }.bind(this));
    }

    updateCurrentStepConfig(step) {
        this.currentStep_config = this.config.steps[step] || null;
        this.currentStep = step;
    }

    onStart(tour) {
        this.recordTourStart();
        console.log('Tour started');
    }

    onEnd(tour) {
        this.recordTourEnd();
        this.HandlingSessionStorage(!0);
        this.closeDropDowns();
        this.setRemoveCustomBackDrop(!0);
        console.log('Tour ended');
    }

    onShow(tour) {
        const currentStep = tour.getCurrentStep();
        this.checkCustomSelector(currentStep + 1, currentStep);
        console.log(`Step this ${this.currentStep} shown`);
    }

    onShown(tour) {
        const currentStep = tour.getCurrentStep();
        this.updateCurrentStepConfig(currentStep);
        this.updatePauseResumeButton();
        this.updateProgressBar(currentStep);
        this.recordStepStart(currentStep);
        this.setAccessibilityFocus();
        this.setRemoveCustomBackDrop();
        console.log(`Showing step ${currentStep}`);
    }

    onHide(tour) {
        console.log(`Hiding step ${this.currentStep}`);

    }

    onHidden(tour) {
        console.log(`Step ${this.currentStep} hidden`);
        this.recordStepEnd(tour.getCurrentStep());
    }

    onNext(tour) {
        var step = tour.getCurrentStep();
        console.log('Moving to next step ==>' + step);
        this.updateProgressBar();
    }

    onPrev(tour) {
        var step = tour.getCurrentStep();
        console.log('Moving to previous step ==>' + step);
        this.updateProgressBar(step);
    }

    onPause(tour) {
        this.isPaused = true;
        console.log('Tour paused');
    }

    onResume(tour) {
        this.isPaused = false;
        console.log('Tour resumed');
    }

    updatePauseResumeButton() {
        const pauseResumeBtn = document.getElementById('PauseResume');
        if (pauseResumeBtn) {
            const state = this.isPaused ? this.stateProperties.pause : this.stateProperties.resume;
            pauseResumeBtn.title = state.title;
            pauseResumeBtn.setAttribute('type', state.type);
            pauseResumeBtn.setAttribute('data-file', state.dataFile);
            pauseResumeBtn.querySelector('img').src = state.src;
        }
    }

    // Func for enable focus guidedtour dialog - 24_May_2025
    setAccessibilityFocus() {
        const currentDialog = document.querySelector('.GuidedTourPop');
        if (currentDialog) {
            currentDialog.setAttribute('tabindex', "-1");
            currentDialog.focus();
        }
    }

    setRemoveCustomBackDrop(canRemove = false) {

        const $backDrop = $('.tour-backdrop.center');

        if (canRemove) {
            $backDrop.remove();
            return;
        }

        if ($backDrop.length === 0) {
            const backdropCenter = `
                <div class='tour-backdrop center' 
                     style='height:${$(document).height()}px; 
                            width:${$(document).width()}px;'>
                </div>`;

            $('.tour-backdrop.right').after(backdropCenter);
        }
    }

    isElementVisible(element) {
        return element && element.offsetParent !== null;
    }
    checkCustomSelector(step) {
        try {
            const stepConfig = this.config.steps[step] || {};
            const {
                custom_selector,
                duration,
                element
            } = stepConfig;

            if (!custom_selector) return;

            const elm = document.querySelector(element);

            if (!elm || this.isElementVisible(elm)) return;

            if (/profileDiv|HelpDiv|link_menu/gi.test(custom_selector)) {
                const targetElm = document.querySelector(custom_selector);
                if (!targetElm) return;

                const addClass = /link_menu/gi.test(custom_selector) ? 'open' : 'show';

                // Remove previous menu's class if it exists
                if (this.LAST_OPEN_MENU && this.LAST_OPEN_MENU.element) {
                    this.LAST_OPEN_MENU.element.classList.remove(this.LAST_OPEN_MENU.class);
                }

                // Add new class and update LAST_OPEN_MENU
                targetElm.classList.add(addClass);
                console.log(`Class '${addClass}' added to ${custom_selector} for step ${step}`);

                this.LAST_OPEN_MENU = {
                    selector: custom_selector,
                    element: targetElm,
                    class: addClass,
                    step: step
                };
            } else {
                elm.click();
            }
        } catch (err) {
            console.warn('Error in checkCustomSelector:', err.message);
            this.trackError('checkCustomSelector', err.message);
        }
    }
    logError(functionName, error) {
        console.warn(`Error in ${functionName}: ${error.message}`);
        ErrorLogTrace(`GuidedTour ${functionName}`, error.message);
    }
    togglePauseResume() {
        if (this.isPaused) {
            this.tour.resume();
        } else {
            this.tour.pause();
        }
        this.updatePauseResumeButton();
    }

    async start() {
        if (this._startPromise) {
            return this._startPromise;
        }
        this._startPromise = this._startTourInternal('start');
        try {
            return await this._startPromise;
        } finally {
            this._startPromise = null;
        }
    }
    async restart() {
        return this._startTourInternal('restart');
    }

    async _startTourInternal(mode) {
        try {
            const ready = await this.ensureTourReady();
            if (!ready || !this.tour) {
                this.logError(mode, { message: "can't access property \"start\", this.tour is undefined" });
                return false;
            }
            // First start already in progress/completed for this instance — avoid double Bootstrap Tour start
            // from getguideduser + HandlingSessionStorage both succeeding after init-ready.
            if (mode === 'start' && this._hasStartedTour && this.TourHistory.length === 0) {
                return true;
            }
            if (mode === 'restart' || this.TourHistory.length > 0) {
                this.tour.restart();
            } else {
                this.tour.start(!0);
            }
            this._hasStartedTour = true;
            return true;
        } catch (err) {
            this.logError(mode, err || { message: `GuidedTour ${mode} failed` });
            return false;
        }
    }

    HandlingSessionStorage(isEnd) {
        console.log("==tour==");
        if (isEnd) {
            commonfn.callajax(GET_JSON('guideTourStatus', {
                update: true
            }), 'guideduserupdate', API_UPDATE_USERS);
            sessionStorage.removeItem("xmleditor:showtour");
            USER_INFO.TOUR = 1;
            this._hasStartedTour = false;
            return;
        }
        if (sessionStorage.getItem("xmleditor:showtour") == 'true') {
            void this.start().then((started) => {
                if (started) {
                    sessionStorage.removeItem("xmleditor:showtour");
                }
            }).catch((err) => {
                this.logError('HandlingSessionStorage', err || { message: 'GuidedTour deferred start failed' });
            });
        }
    }

    recordTourStart() {
        this.tourStartTime = new Date();
        this.logEvent('Tour started', this.tourStartTime);
    }

    recordTourEnd() {
        this.tourEndTime = new Date();
        this.logEvent('Tour ended', this.tourEndTime);
        this.logDuration('Total tour', this.tourStartTime, this.tourEndTime);

        // Create a complete tour record
        const completedTour = {
            startTime: this.tourStartTime,
            endTime: this.tourEndTime,
            duration: (this.tourEndTime - this.tourStartTime) / 1000,
            steps: this.currentTourHistory
        };

        // Add the completed tour to TourHistory
        this.TourHistory.push(completedTour);

        // Reset the current tour data
        this.resetRecord();

        console.log(`Tour added to history. Total tours recorded: ${this.TourHistory.length}`);
    }

    calculateDuration(startTime, endTime) {
        return (endTime - startTime) / 1000;
    }

    recordStepStart(stepIndex) {
        const step = this.getOrCreateStep(stepIndex);
        step.startTime = new Date();
        this.logEvent(`Step ${stepIndex + 1} started`, step.startTime);
    }

    recordStepEnd(stepIndex) {
        if (stepIndex == null || stepIndex == undefined) return;
        const step = this.getOrCreateStep(stepIndex);
        step.endTime = new Date();
        step.duration = this.calculateDuration(step.startTime, step.endTime);
        step.actual_duration = this.currentStep_config.duration || 5000;
        this.logEvent(`Step ${stepIndex + 1} ended`, step.endTime);
        this.logDuration(`Step ${stepIndex + 1}`, step.startTime, step.endTime);
    }

    getOrCreateStep(stepIndex) {
        if (!this.currentTourHistory[stepIndex]) {
            this.currentTourHistory[stepIndex] = {};
        }
        return this.currentTourHistory[stepIndex];
    }

    logEvent(eventName, time) {
        console.log(`${eventName} at: ${time}`);
    }

    logDuration(name, startTime, endTime) {
        const duration = (endTime - startTime) / 1000;
        console.log(`${name} duration: ${duration} seconds`);
    }

    getTourHistory() {
        return this.TourHistory;
    }

    closeDropDowns(cusSelector = null) {
        const dropdowns = [{
                selector: '#profileDiv',
                activeClass: 'show'
            },
            {
                selector: '#HelpDiv',
                activeClass: 'show'
            },
            {
                selector: "#link_menu .dropdown",
                activeClass: 'open'
            }
        ];
        try {
            dropdowns.forEach(({
                selector,
                activeClass
            }) => {

                // Skip if a custom selector is provided and doesn't match

                if (cusSelector && cusSelector !== selector) return;

                const element = document.querySelector(selector);

                if (element && commonMethods.IsVisibleElm(element) && element.classList.contains(activeClass)) {
                    element.classList.remove(activeClass);
                }
            });

        } catch (err) {
            console.warn(err.message);
            this.trackError('closeDropDowns', err.message);
        }
    }

    debugTourState() {
        console.log({
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            isPaused: this.isPaused,
            tourInitialized: this.tour._initialized,
            currentStepConfig: this.currentStep_config,
            progressPercentage: ((this.currentStep + 1) / this.totalSteps * 100).toFixed(2) + '%'
        });
    }


}