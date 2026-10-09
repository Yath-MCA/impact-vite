class GuidedTour {
    constructor(options = {}) {
        this.MyType = IS_JOURNAL ? 'article' : 'book/chapters';
        this.invalidStep = -1;
        this.LAST_OPEN_MENU = {};
        this.dynamic_content = {
            "OUP": "ORDER_1",
            "NIHR": "ORDER_2",
            "LWW": "ORDER_2",
            "LWW_AHA": "ORDER_1",
            "BRILL": "ORDER_2",
            "TNF": "ORDER_2",
            "PLOS": "ORDER_2",
            "INTELLECT": "ORDER_2",
            "#downloadPdfList": {
                "ORDER_1": `<p class="tour-header">Download PDFs</p><p class="tour-body">
                <p><b>CE Track PDF</b> – Here, you can download a Copy-edited PDF with track changes for your reference.</p>
                <p><b>Proof PDF</b> – Here, you can download a PDF of the typeset proof for review purposes only. Any changes or edits should be made directly within the Text editor.</p>
                <p><b>Generate Track PDF</b> – Here, you can download a track change PDF that highlights the differences between the initial proof and your applied corrections.</p></p>`,
                "ORDER_2": `<p class="tour-header">Download PDF</p><p class="tour-body">
                <p><b>Proof PDF</b> – Here, you can download a PDF of the typeset proof for review purposes only. Any changes or edits should be made directly within the Text editor.</p>
                <p><b>Generate Track PDF</b> – Here, you can download a track change PDF that highlights the differences between the initial proof and your applied corrections.</p>
                </p>`
            },
            "QUICK_OPTIONS": {
                "default": '"Yes", "No" or "Add Comment"',
                "OUP": "default",
                "NIHR": "default",
                "LWW": '"OK" or "Add Comment"',
                "BRILL": "default",
                "TNF": "default",
                "PLOS": "default",
                "INTELLECT": "default"
            }
        };
        this.config = {
            template: ``,
            steps: [{
                    element: '#iEditorSection',
                    name: "Editor Section",
                    duration: 8000,
                    // ? Mantis 1996803: More specific and detailed guidance. RK_13_DEC_2023 --> 
                    content: '<p class="tour-header">Editor Section</p><p class="tour-body">Implement your corrections via the Editor View (insertions, deletions and formatting) to the content.</p>'
                },
                {
                    element: '.pdf-section',
                    name: "Proof Section",
                    placement: "left",
                    duration: 28000,
                    content_old: '<p class="tour-header">Proof Section</p><p class="tour-body">This section displays your [[MyType]] typeset proof and enables you to review the page layout. It is a read only view to review the Proof PDF page. Any page layout corrections need to be inserted as comments in the editor pane (left side).</p>',
                    // ? 2154553: Guided tour slide non-proof page and the pdf page Sean release message update
                    content: '<p class="tour-header">Proof Section</p><p class="tour-body">This section presents the typeset proof of your [[MyType]], allowing you to examine the page layout. It provides a read-only view for reviewing the Proof PDF page. Please note that any modifications made in the editor panel will not be reflected in the PDF view. However, The typesetting team will automatically transfer and verify the corrections before online publication. If there are any page layout corrections, please insert them as comments via the editor panel.</p>'
                },
                {
                    // ? 1996632: Guided Tour Editor and Proof page
                    element: '.pdf-menu-header',
                    name: "Proof PDF Navigation",
                    placement: "left",
                    duration: 6000,
                    content: '<p class="tour-header">Proof PDF Navigation</p><p class="tour-body">Use the navigation buttons to move to the previous or next pages in the proof PDF.</p>'
                },
                {
                    element: '#filesaving',
                    name: "File Saving",
                    placement: "bottom",
                    duration: 7000,
                    content: '<p class="tour-header">File Saving</p><p class="tour-body">You can use this menu to save your [[MyType]]. Please note your [[MyType]] will be autosaved once in every 30 seconds.</p>'
                },
                {
                    element: '.cke_reset_all',
                    name: "Toolbar Menu",
                    duration: 19000,
                    content: '<p class="tour-header">Toolbar Menu</p><p class="tour-body">The text editor toolbar menu provides various essential functions. You can easily apply formatting, undo/redo content changes, insert symbols, manage lists, and more, to enhance your content editing. Please note: Hovering your mouse on these options will display shortcut keys for quick access.</p>'
                },
                {
                    element: '#btn_toc',
                    name: "TOC Panel",
                    content: '<p class="tour-header">TOC</p><p class="tour-body">You can navigate to any specific headings by clicking the links.</p>'
                },
                {
                    element: '#btn_qry',
                    name: "Queries Panel",
                    duration: 21000,
                    // ? 2912368: Finalize Check Query content update
                    content: '<p class="tour-header">Queries</p><p class="tour-body">Please ensure that you respond to all author queries raised by the copy editors by either selecting "Queries" in the left-hand pane, selecting "Reply" on the query you wish to respond to, and choose the appropriate option: [[QUICK_OPTIONS]], or by clicking on the query directly in the text editor and responding via the "Response Query" dialogue box.</p>',
                    custom_selector: '#btn_qry'
                },
                {
                    element: '#btn_cts',
                    duration: 9000,
                    name: "Comments / Instructions",
                    content: '<p class="tour-header">Comments / Instructions</p><p class="tour-body">The comments option allows you to provide instructions to production editor or typesetting team. You could also include attachments to the comment as required.</p>',
                    custom_selector: '#btn_cts'
                },
                {
                    // ? 1868633: Guided Tour Show Markup
                    element: '#showTrackDiv',
                    name: "Show Markup",
                    content: '<p class="tour-header">Show Markup</p><p class="tour-body">It allows you to switch between show / hide track changes during the proof review process.</p>'
                },
                {
                    element: '#shareFileBtn',
                    name: "Share Link",
                    placement: "bottom",
                    content: '<p class="tour-header">Share Link</p><p class="tour-body">Click this button to share the [[MyType]] content with your co-authors.</p>'
                },
                {
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
                },
                {
                    element: '#onlineStatus',
                    name: "Online Status",
                    placement: "bottom",
                    content: '<p class="tour-header">Online Status</p><p class="tour-body">Showing network connection status.</p>'
                },
                {
                    // ? 1996643: Inserting references pop-up
                    element: '#insertRefmenu',
                    name: "Insert Reference",
                    content: '<p class="tour-header">Insert Reference</p><p class="tour-body">This feature facilitates the insertion of a new reference into the text. You can add a reference either as plain text or by using the DOI option. Simply position the reference citation where it should appear in the document and click on the "Insert" button to seamlessly integrate the reference into the text.</p>',
                    custom_selector: '#link_menu .dropdown',
                    duration: 17000,
                },
                {
                    /* 1798531: Guided tour slide */
                    element: '#downloadPdfList',
                    name: "Download PDFs",
                    placement: "bottom",
                    content: '',
                    duration: 24000
                    // ! DON'T REMOVE | DYNAMIC FIX
                },
                {
                    element: '#HelpDiv',
                    name: "Help",
                    placement: "left",
                    content: '<p class="tour-header">Help</p><p class="tour-body">Menu that can be used if you are having problems and questions or want to find out how to do something. You can use this menu to know information and instructions to use this proofing system.</p>',
                    custom_selector: '#HelpDiv',
                    orphan: true,
                    duration: 12000
                },
                {
                    element: '#finalize',
                    name: "Finalize",
                    placement: "bottom",
                    content: '<p class="tour-header">Finalize</p><p class="tour-body">After you made all the required changes and answered all the author queries, please indicate your approval by clicking the Finalize button. <br/>Please note you will not be able to make any further changes after you finalize the [[MyType]].</p>',
                    duration: 15000
                }, {
                    element: '#log_out_btn',
                    name: "Log out",
                    placement: "left",
                    content: '<p class="tour-header">Log out</p><p class="tour-body">When you log out, your session will end without finalizing the proof. You can then log back in later from the landing page and continue editing the document.</p>',
                    custom_selector: '#profileDiv',
                    orphan: true,
                    duration: 9000
                }
            ],
            backdrop: true,
            backdropContainer: 'body',
            backdropPadding: 0,
            smartPlacement: true,
            duration: 5000
        };

        this.tour = null;
        this.currentSpeed = 'normal';
        this.isPaused = false;
        this.currentStep = 0;
        this.totalSteps = this.config.steps.length;
        this.Initialize = false;
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
        this.init(options);
    }

    init(options) {
        this.config = {
            ...this.config,
            ...options
        };

        this.tour = new Tour(this.getExtendedConfig());
        this.tour.init();
        this.updateCurrentStepConfig(0);
        document.getElementById('guide_tour').onclick = this.fire.bind(this);
        this.attachEventListeners();
        this.debugTourState("GuidedTour");
    }

    /* 
    <div class="tour-controls d-flex flex-column flex-sm-row align-items-stretch">
                             <select id="tour-speed-select" class="custom-select custom-select-sm mt-2 mt-sm-0 ml-sm-2">
                                <option value="slow">Slow</option>
                                <option value="normal" selected>Normal</option>
                                <option value="fast">Fast</option>
                            </select>
                        </div>
    */
    getExtendedConfig() {
        this.config.template = `<div id='GuidedTourPop' class='popover tour GuidedTourPop'>
                    <div class='arrow'></div>
                    <h3 class='popover-title'></h3>
                    <div class='popover-content'></div>
                    <div class='popover-navigation'>
                        <ul class='pull-right'>
                            <li id='PauseResume' title='Pause' type='pause' class='btn' data-role='PauseResume' data-file='gtPauseWithPAUSE'><img src='assets/images/svg/g_tour/gtPauseWithPAUSE.svg' /></li>
                            <li id='prev' title='Previous' class='btn' data-role='prev' data-file='gtPrevious'><img src='assets/images/svg/g_tour/gtPrevious.svg' /></li>
                            <li id='next' title='Next' class='btn' data-role='next' data-file='gtNext'><img src='assets/images/svg/g_tour/gtNext.svg' /></li>
                            <li id='end' title='Close' class='btn' data-role='end' data-file='gtClose'><img src='assets/images/svg/g_tour/gtClose.svg' /></li>
                        </ul>
                    </div>
                    <div class='progress'>
                        <div class='progress-bar bg-danger' id='tourprogress' role='progressbar' style='width: 10%' aria-valuenow='10' aria-valuemin='0' aria-valuemax='100'></div>
                    </div>
                </div>`;
        return {
            ...this.config,
            onStart: this.onStart.bind(this),
            onEnd: this.onEnd.bind(this),
            onShow: this.onShow.bind(this),
            onShown: this.onShown.bind(this),
            onHide: this.onHide.bind(this),
            onPause: this.pauseTour.bind(this),
            onResume: this.resumeTour.bind(this)
        };
    }

    onStart(tour) {
        document.getElementById('Body').classList.add('tour');
        this.currentStep = 0;
        this.populateStepSelect();
        console.log("START/OPEN GUIDED TOURS ==>" + new Date());
    }

    onEnd(tour) {
        document.getElementById('Body').classList.remove('tour');
        if ($('.tour-backdrop.center').length) {
            $('.tour-backdrop.center').remove();
        }
        this.checkOpenDialog();
        document.getElementById('btn_toc').click();
    }

    onShow(tour, step) {
        this.currentStep = step;
        this.currentStep_config;

        if (this.isPaused) return;

        this.updateProgressBar();
        this.ensureContentVisibility();
        this.checkCustomSelector(step);
        // Update the PauseResume button state
        this.updatePauseResumeButton();
    }

    onShown(tour, step) {
        this.setBackdrop();
    }

    onHide(tour, step) {
        if (Object.keys(this.LAST_OPEN_MENU).length > 0) {
            let lastOpen = this.LAST_OPEN_MENU;
            let elm = lastOpen['element'];
            if (elm && step == lastOpen.step) {
                let remove_class = lastOpen['class'];
                elm.classList.remove(remove_class);
            }
            this.LAST_OPEN_MENU = {};
        }
    }

    fire(evt, options = {}) {
        this.tour.init();
        if (options.Init || (evt && evt.Init)) {
            commonfn.callajax(GET_JSON('guideTourStatus', {
                update: true
            }), 'guideduserupdate', API_UPDATE_USERS);
            sessionStorage.removeItem("xmleditor:showtour");
        }
        // Add this line to force the tour to start at the first step
        this.tour.start(true);

        // Add a small delay before showing the first step
        setTimeout(() => {
            this.showStep(0);
        }, 100);

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
        $(document).on('click', '#PauseResume', this.togglePauseResume.bind(this));
        $(document).on('click', '#prev', this.goToPrevStep.bind(this));
        $(document).on('click', '#next', this.goToNextStep.bind(this));
        $(document).on('mouseenter mouseleave', "#PauseResume, #prev, #next, #end", this.handleMouseEnterLeave.bind(this));
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

    togglePauseResume() {
        if (this.isPaused) {
            this.resumeTour();
        } else {
            this.pauseTour();
        }
        // this.updatePauseResumeButton();
    }
    resumeTour() {
        this.isPaused = false;
        console.log("Tour resumed");
        // this.setupStepTransition(this.currentStep);
        this.tour.onResume(this.tour);
    }
    pauseTour() {
        this.isPaused = true;
        clearTimeout(this.stepTimeout);
        console.log("Tour paused");
        this.tour.onPause(this.tour);
    }
    goToPrevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    goToNextStep() {
        if (this.currentStep < this.totalSteps - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        }
    }

    showStep(step) {
        this.currentStep = step;
        this.updateCurrentStepConfig(step);

        if (!this.isPaused) {
            this.tour.goTo(step);

            // Add logging to check if this method is being called
            debug.log(`Showing step ${step}`);

            // Force a redraw of the tour popover
            this.tour.redraw();

            // Set up the next step transition
            // this.setupStepTransition(step);
        }

    }
    // Update setupStepTransition method
    setupStepTransition(currentStep) {
        const step = this.config.steps[currentStep];
        if (step && step.duration && !this.isPaused) {
            clearTimeout(this.stepTimeout);
            this.stepTimeout = setTimeout(() => {
                if (currentStep < this.totalSteps - 1) {
                    this.showStep(currentStep + 1);
                } else {
                    this.tour.end();
                }
            }, step.duration);
        }
    }

    // Add this method to handle manual navigation
    manualNavigation(direction) {
        clearTimeout(this.stepTimeout);
        if (direction === 'next' && this.currentStep < this.totalSteps - 1) {
            this.showStep(this.currentStep + 1);
        } else if (direction === 'prev' && this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }
    // Modify these methods to use manualNavigation
    goToPrevStep() {
        this.manualNavigation('prev');
    }

    goToNextStep() {
        this.manualNavigation('next');
    }

    // Add debugging method
    debugTourState() {
        console.log({
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            isPaused: this.isPaused,
            tourInitialized: this.tour._initialized,
            currentStepConfig: this.config.steps[this.currentStep]
        });
        if (IS_LOCAL_HOST) {
            setTimeout(() => {
                this.fire();
            }, 10000);
        }
    }
    handleStepSelection(event) {
        const stepIndex = parseInt(event.target.value);
        this.showStep(stepIndex);
    }

    handleSpeedChange(event) {
        const speed = event.target.dataset.speed;
        this.setSpeed(speed);
    }

    setSpeed(speed) {
        const speedMultiplier = {
            slow: 2,
            normal: 1,
            fast: 0.5
        };
        this.currentSpeed = speed;
        this.config.steps.forEach(step => {
            if (!step.originalDuration) {
                step.originalDuration = step.duration;
            }
            step.duration = step.originalDuration * speedMultiplier[speed];
        });
        if (this.currentStep !== null) {
            this.showStep(this.currentStep);
        }
    }



    populateStepSelect() {
        const $stepSelect = $('#tour-step-select');
        $stepSelect.empty();
        this.config.steps.forEach((step, index) => {
            $stepSelect.append(`<option value="${index}">${step.name}</option>`);
        });
    }

    updateProgressBar() {
        const percent = ((this.currentStep + 1) / this.totalSteps * 100).toFixed(0);
        $('#tourprogress').attr({
            'aria-valuenow': percent,
            'width': `${percent}%`,
            'style': `width: ${percent}%`
        });
    }

    ensureContentVisibility() {
        const $content = $('.popover-content');
        const $popover = $('#GuidedTourPop');
        if ($content.height() > $popover.height()) {
            $popover.css('height', 'auto');
            $content.css('max-height', '300px').css('overflow-y', 'auto');
        }
    }



    setBackdrop() {
        const backdrop_center = `<div class='tour-backdrop center' style='height:${$(document).height()}px; width:${$(document).width()}px;'></div>`;
        if (!$('.tour-backdrop.center').length) {
            $('.tour-backdrop.right').after(backdrop_center);
        }
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
            if (!elm || !this.isElementVisible(elm)) return;

            if (/profileDiv|HelpDiv|link_menu/gi.test(custom_selector)) {
                const targetElm = document.querySelector(custom_selector);
                if (!targetElm) return;

                const addClass = /link_menu/gi.test(custom_selector) ? 'open' : 'show';
                targetElm.classList.add(addClass);

                console.log(`Class '${addClass}' added to ${custom_selector} for step ${step}`);

                this.LAST_OPEN_MENU = {
                    element: targetElm,
                    class: addClass,
                    step: step
                };
            } else {
                elm.click();
            }
        } catch (err) {
            console.warn('Error in checkCustomSelector:', err.message);
            this.logError('checkCustomSelector', err.message);
        }
    }

    checkOpenDialog() {
        try {
            const dialogElements = [{
                    id: 'profileDiv',
                    class: 'show'
                },
                {
                    id: 'HelpDiv',
                    class: 'show'
                },
                {
                    selector: '#link_menu > :first-child',
                    class: 'open'
                }
            ];

            dialogElements.forEach(({
                id,
                selector,
                class: className
            }) => {
                const element = id ? document.getElementById(id) : document.querySelector(selector);
                if (this.isElementVisible(element) && element.classList.contains(className)) {
                    element.classList.remove(className);
                }
            });
        } catch (err) {
            console.warn('Error in checkOpenDialog:', err.message);
            this.logError('checkOpenDialog', err.message);
        }
    }

    // Utility methods
    isElementVisible(element) {
        return element && element.offsetParent !== null;
    }
    logError(functionName, errorMessage) {
        // Assuming ErrorLogTrace is a global function
        if (typeof ErrorLogTrace === 'function') {
            ErrorLogTrace(functionName, errorMessage);
        }
    }

    updateCurrentStepConfig(step) {
        this.currentStep_config = this.config.steps[step] || null;
    }
}

// // Usage
// (function() {
//     window.guidedTourNew = new GuidedTour();
// })();