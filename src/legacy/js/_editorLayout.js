// ---------------------------------------------------------------------------
// ColSet — encodes a responsive Bootstrap column spec as a single object.
//
//   new ColSet({ xs: 12, md: 10, lg: 10, xl: 10 })
//       .toClasses()   → ["col-12", "col-md-10", "col-lg-10", "col-xl-10"]
//
//   ColSet.allCols()   → every col-{bp}-{n} from col-6 … col-12
//                        used as the "removeClasses" sweep in setClasses()
// ---------------------------------------------------------------------------
class ColSet {
    /**
     * @param {Object} spec  e.g. { xs: 12, sm: 12, md: 8, lg: 8, xl: 8 }
     *   Use "xs" for the un-prefixed "col-N" class.
     */
    constructor(spec) {
        this.spec = spec;
    }

    toClasses() {
        return Object.entries(this.spec).map(([bp, n]) =>
            bp === "xs" ? `col-${n}` : `col-${bp}-${n}`
        );
    }

    /**
     * Returns every col-{bp}-{n} class for the given breakpoints / range.
     * Used as a universal "remove" sweep so nothing stale lingers.
     */
    static allCols(
        breakpoints = ["xs", "sm", "md", "lg", "xl"],
        range = [6, 12]
    ) {
        const cls = [];
        for (let n = range[0]; n <= range[1]; n++) {
            breakpoints.forEach(bp =>
                cls.push(bp === "xs" ? `col-${n}` : `col-${bp}-${n}`)
            );
        }
        return cls;
    }
}

// ---------------------------------------------------------------------------
// Column presets — one declaration per logical slot.
// Change a width here and every method that references it updates instantly.
// ---------------------------------------------------------------------------
const COL = Object.freeze({
    // ── editorLayoutDialogHost ──────────────────────────────────────────────
    host: new ColSet({
        xs: 12,
        md: 3,
        lg: 3,
        xl: 3
    }),

    // ── viewArea states (profile / three-column mode) ───────────────────────
    viewDefault: new ColSet({
        xs: 10,
        sm: 10,
        md: 10,
        lg: 10,
        xl: 10
    }),
    viewDialogWithToc: new ColSet({
        xs: 8,
        sm: 8,
        md: 7,
        lg: 7,
        xl: 7
    }),
    viewDialogNoToc: new ColSet({
        xs: 12,
        sm: 12,
        md: 9,
        lg: 9,
        xl: 9
    }),
    viewNoDialog: new ColSet({
        xs: 12,
        sm: 12,
        md: 12,
        lg: 12,
        xl: 12
    }),

    // ── editorSection (profile mode — always full-width) ────────────────────
    editorFull: new ColSet({
        xs: 12,
        sm: 12,
        md: 12,
        lg: 12,
        xl: 12
    }),

    // ── viewArea states (default / non-profile mode) ────────────────────────
    defaultBothPanels: new ColSet({
        md: 9,
        xl: 9,
        lg: 9
    }),
    defaultEditorOnly: new ColSet({
        md: 10,
        xl: 10,
        lg: 10
    }),
    defaultThumbOnly: new ColSet({
        md: 11,
        xl: 11,
        lg: 11
    }),
    defaultNoPanels: new ColSet({
        md: 12,
        xl: 12,
        lg: 12
    }),

    // ── editorSection / pdfSection (default mode) ───────────────────────────
    splitHalf: new ColSet({
        md: 6,
        xl: 6,
        lg: 6
    }),
    splitFull: new ColSet({
        md: 12,
        xl: 12,
        lg: 12
    }),
});

// Pre-computed sweep arrays (reused across every setClasses call)
// xs…xl, 6–12
const ALL_COLS = ColSet.allCols();
// md/lg/xl only, 6–12
const ALL_COLS_MDXL = ColSet.allCols(["md", "lg", "xl"]);


// ---------------------------------------------------------------------------
class editorLayout {
    constructor(options = {}) {
        this.dialogSelector = options.dialogSelector || ".mDialog.w-editor-access";
        this.profileMap = Object.assign({
            "three-column": {
                name: "two-panel-with-dialog-column",
                hidePdf: true,
                hideThumbnail: true,
                hideViewOption: true,
                useThirdColumnDialogs: true
            }
        }, options.profileMap || {});
        this.layoutConfig = Object.assign({
            editor6: "default",
            readOnly: "default"
        }, options.layoutConfig || {});
        this.initialized = false;
        this.hostInjected = false;
        this.retryCount = 0;
        this.maxRetryCount = 40;
        this.observer = null;
        this.activeDialogId = null;
        this.prefixSVG = "assets/images/svg/mainPage/";
        this.boundElements = new WeakSet();
        this.lastViewAreaClass = COL.defaultEditorOnly.toClasses();

        this.allowedDialogs = ["trackDialogModule"];
        this._savedLayoutBeforeRevision = null;
        this._savedLayoutBeforeDialog = null;

        document.addEventListener("DOMContentLoaded", () => {
            this.waitForReadyState();
        });
    }

    // ── screen-view helpers ─────────────────────────────────────────────────

    getScreenView() {
        return {
            edit: "edit",
            pdf: "pdf",
            both: "both",
            maximize: "maximize",
            navi: "navi"
        };
    }

    getViewMap() {
        const sv = this.getScreenView();
        return {
            0: sv.edit,
            1: sv.pdf,
            2: sv.both,
            3: sv.maximize,
            4: sv.navi
        };
    }

    // ── client / profile helpers ────────────────────────────────────────────

    getClientName() {
        try {
            if (typeof SHARED_KEY !== "undefined" && SHARED_KEY && SHARED_KEY.client) {
                return commonMethods.getClientCode({
                    format: "upper"
                });
            }
            if (typeof DOC_INFO !== "undefined" && DOC_INFO && typeof DOC_INFO.get === "function") {
                return commonMethods.getClientCode({
                    format: "upper"
                });
            }
        } catch (err) {
            console.warn(err.message);
        }
        return "";
    }

    normalizeProfile(profile = {}) {
        return Object.assign({
            name: "",
            hidePdf: true,
            hideThumbnail: true,
            hideViewOption: true,
            useThirdColumnDialogs: true
        }, profile);
    }

    isReadOnlyPage() {
        return !!(typeof IS_TRACK_VIEW !== "undefined" ?
            IS_TRACK_VIEW :
            window.location.href.includes("editor6TrackView"));
    }

    getCurrentLayoutMode() {
        const config = Object.assign({
                editor6: "default",
                readOnly: "default"
            },
            window.EDITOR_LAYOUT_CONFIG || {},
            this.layoutConfig || {}
        );
        return this.isReadOnlyPage() ? (config.readOnly || "default") : (config.editor6 || "default");
    }

    getActiveProfile() {
        const mode = this.getCurrentLayoutMode();
        if (!mode || mode === "default") return null;
        return this.profileMap[mode] ? this.normalizeProfile(this.profileMap[mode]) : null;
    }

    shouldHandleClient() {
        return !!this.getActiveProfile();
    }

    applyMetaConfig(config = {}) {
        this.layoutConfig = Object.assign({}, this.layoutConfig, config);
        if (this.initialized) this.refreshLayout();
    }

    // ── initialisation ──────────────────────────────────────────────────────

    waitForReadyState() {
        const timer = setInterval(() => {
            try {
                this.retryCount++;
                if (document.getElementById("iEditorSection")) {
                    clearInterval(timer);
                    this.init();
                } else if (this.retryCount >= this.maxRetryCount) {
                    clearInterval(timer);
                }
            } catch (err) {
                clearInterval(timer);
                this.logError("editorLayout.waitForReadyState", err);
            }
        }, 300);
    }

    // ── low-level DOM helpers ───────────────────────────────────────────────

    logError(scope, err) {
        console.warn(err.message);
        if (typeof ErrorLogTrace === "function") ErrorLogTrace(scope, err.message);
    }

    setClasses(target, addClasses = [], removeClasses = []) {

        if (!target) return;
        if (IS_LOCAL_HOST && target.id == "iViewArea") {
            // console.log(`setClasses: Adding [${addClasses}] Removing [${removeClasses}] on`, target.id);
        }
        target.classList.remove(...removeClasses);
        target.classList.add(...addClasses);
    }

    hideElement(target) {
        if (!target) return;
        target.classList.add("ds-none");
        target.setAttribute("aria-hidden", "true");
    }

    showElement(target) {
        if (!target) return;
        target.classList.remove("ds-none");
        target.removeAttribute("aria-hidden");
    }

    isVisible(target) {
        return !!(target && !target.classList.contains("ds-none") && target.offsetParent !== null);
    }

    getElements() {
        return {
            wrapper: document.getElementById("iWrapper"),
            tocSection: document.getElementById("iTOC_Section"),
            viewArea: document.getElementById("iViewArea"),
            editorSection: document.getElementById("iEditorSection"),
            pdfSection: document.getElementById("iPdfSection"),
            thumbnailSection: document.getElementById("iPdfThumbnail_Section"),
            thumbnailButton: document.getElementById("NaviButton2"),
            thumbnailButtonImg: document.getElementById("hamburger_Thumbnail"),
            viewOption: document.getElementById("viewoptn"),
            optionDropDown: document.getElementById("view-dialog"),
            modelDialogAppend: document.getElementById("ModelDialogAppend"),
            tocButton: document.getElementById("NaviButton1"),
            tocButtonImg: document.getElementById("hamburger")
        };
    }

    // ── view state ──────────────────────────────────────────────────────────

    getView() {
        const {
            editorSection,
            pdfSection
        } = this.getElements();
        const isEditorVisible = this.isVisible(editorSection);
        const isPdfVisible = this.isVisible(pdfSection);
        const sv = this.getScreenView();

        if (isEditorVisible && isPdfVisible) return sv.both;
        if (!isEditorVisible && isPdfVisible) return sv.pdf;
        if (isEditorVisible && !isPdfVisible) return sv.edit;
        return sv.maximize;
    }

    restoreCursor() {
        try {
            if (typeof IMPACT_SELECTION === "undefined" || !IMPACT_SELECTION || !IMPACT_SELECTION.NODE) return true;

            let elm = IMPACT_SELECTION.NODE;
            let count = 0;
            while (elm && typeof elm.hasAttribute === "function" && !elm.hasAttribute("id")) {
                elm = typeof elm.getParent === "function" ? elm.getParent() : null;
                count++;
                if (!elm || count > 6) break;
            }

            const myID = elm && typeof elm.getAttribute === "function" ? elm.getAttribute("id") : null;
            if (!myID || typeof GlobalEditor === "undefined" || !GlobalEditor || !GlobalEditor.document) return true;

            const curElm = GlobalEditor.document.getById(myID);
            if (!curElm) return true;

            if (typeof curElm.scrollIntoView === "function") curElm.scrollIntoView(true);

            if (typeof GlobalEditor.createRange === "function" && typeof GlobalEditor.getSelection === "function") {
                const range = GlobalEditor.createRange();
                range.setStart(curElm, 0);
                GlobalEditor.getSelection().selectRanges([range]);
            }
            return true;
        } catch (err) {
            this.logError("editorLayout.restoreCursor", err);
            return true;
        }
    }

    setActiveView(viewName, wasMaxiView = false) {
        const {
            optionDropDown
        } = this.getElements();
        try {
            const currentView = viewName || this.getView();
            const screenView = this.getViewMap();
            const getIndex = Object.keys(screenView).find(key => screenView[key] === currentView);

            if (optionDropDown && optionDropDown.hasChildNodes()) {
                Array.from(optionDropDown.children).forEach((child, index) => {
                    if (!child.firstElementChild) return;
                    const itemDiv = child.firstElementChild;
                    const itemImg = itemDiv.firstElementChild;
                    if (!itemImg) return;

                    const srcName = itemImg.src.split("/").pop();
                    const pathFile = this.prefixSVG + (srcName.includes("_") ? srcName.split("_")[0] : srcName.split(".")[0]);

                    if (String(index) === getIndex) {
                        itemDiv.classList.add("active");
                        itemImg.src = pathFile + "_1.svg";
                    } else if (itemDiv.classList.contains("active")) {
                        itemImg.src = pathFile + ".svg";
                        itemDiv.classList.remove("active");
                    }
                });
            }

            if (wasMaxiView) {
                const wrapper = document.getElementById('iWrapper');
                const ckeContents = document.getElementById('cke_1_contents');
                if (wrapper) wrapper.classList.remove('maxiview');
                if (ckeContents) ckeContents.classList.remove('maxiview');
                this.refreshLayout();
            }

            return currentView;
        } catch (err) {
            this.logError("editorLayout.setActiveView", err);
            return this.getView();
        }
    }

    // ── nav button state ────────────────────────────────────────────────────

    updateNavButtonState(buttonId) {
        const {
            tocSection,
            thumbnailSection,
            tocButton,
            thumbnailButton,
            tocButtonImg,
            thumbnailButtonImg
        } = this.getElements();

        const config = {
            NaviButton1: {
                section: tocSection,
                button: tocButton,
                img: tocButtonImg,
                hiddenTitle: "Show Navigation",
                visibleTitle: "Hide Navigation"
            },
            NaviButton2: {
                section: thumbnailSection,
                button: thumbnailButton,
                img: thumbnailButtonImg,
                hiddenTitle: "Show Thumbnail",
                visibleTitle: "Hide Thumbnail"
            }
        } [buttonId];

        if (!config || !config.section || !config.button) return;

        const isHidden = config.section.classList.contains("ds-none");
        const title = isHidden ? config.hiddenTitle : config.visibleTitle;
        const src = isHidden ? "assets/images/svg/mainPage/hamburger_1.svg" : "assets/images/svg/mainPage/hamburger.svg";

        config.button.setAttribute("title", title);
        if (config.img) {
            config.img.setAttribute("title", title);
            config.img.setAttribute("src", src);
        }
    }

    updateAllNavButtonStates() {
        this.updateNavButtonState("NaviButton1");
        this.updateNavButtonState("NaviButton2");
    }

    // ── column layout — default (non-profile) mode ──────────────────────────

    applyDefaultColumnLayout() {
        const {
            tocSection,
            thumbnailSection,
            viewArea,
            editorSection,
            pdfSection
        } = this.getElements();
        if (!viewArea) return;

        const tocHidden = tocSection ? tocSection.classList.contains("ds-none") : true;
        const thumbHidden = thumbnailSection ? thumbnailSection.classList.contains("ds-none") : true;

        // Pick the correct viewArea ColSet based on which panels are open
        const viewColSet =
            (thumbHidden && tocHidden) ? COL.defaultNoPanels :
            (thumbHidden && !tocHidden) ? COL.defaultEditorOnly :
            (!thumbHidden && tocHidden) ? COL.defaultThumbOnly :
            COL.defaultBothPanels;

        this.setClasses(viewArea, viewColSet.toClasses(), ALL_COLS_MDXL);
        this.lastViewAreaClass = viewColSet.toClasses();

        if (editorSection && pdfSection) {
            const bothMode = this.getView() === this.getScreenView().both;
            const panelColSet = bothMode ? COL.splitHalf : COL.splitFull;
            const removePanel = [...COL.splitHalf.toClasses(), ...COL.splitFull.toClasses()];
            this.setClasses(editorSection, panelColSet.toClasses(), removePanel);
            this.setClasses(pdfSection, panelColSet.toClasses(), removePanel);
        }
    }

    // ── column layout — profile (three-column) mode ─────────────────────────

    applyProfileColumnLayout(hasDialog) {
        const {
            tocSection,
            viewArea,
            editorSection
        } = this.getElements();
        const dialogHost = document.getElementById("editorLayoutDialogHost");
        const isTocHidden = tocSection ? tocSection.classList.contains("ds-none") : false;

        // editorSection always fills its container in profile mode
        this.setClasses(editorSection, COL.editorFull.toClasses(), [...ALL_COLS, "ds-none"]);

        if (viewArea) {
            // Pick viewArea width based on dialog presence and TOC state
            const viewColSet =
                (hasDialog && !isTocHidden) ? COL.viewDialogWithToc :
                (hasDialog && isTocHidden) ? COL.viewDialogNoToc :
                isTocHidden ? COL.viewNoDialog :
                COL.viewDefault;

            this.setClasses(viewArea, viewColSet.toClasses(), ALL_COLS);
        }

        if (dialogHost) {
            if (hasDialog) {
                this.setClasses(dialogHost, COL.host.toClasses(), ["ds-none", ...ALL_COLS]);
            } else {
                dialogHost.classList.add("ds-none");
            }
        }
    }

    // ── profile enforcement ─────────────────────────────────────────────────

    enforceProfileLayout() {
        const profile = this.getActiveProfile();
        const {
            pdfSection,
            thumbnailSection,
            thumbnailButton,
            viewOption,
            editorSection
        } = this.getElements();

        if (!profile) return;

        this.showElement(editorSection);
        if (profile.hidePdf) this.hideElement(pdfSection);
        if (profile.hideThumbnail) {
            this.hideElement(thumbnailSection);
            this.hideElement(thumbnailButton);
        }
        if (profile.hideViewOption) this.hideElement(viewOption);
    }

    // ── main layout refresh ─────────────────────────────────────────────────

    refreshLayout() {
        try {
            // dockActiveDialog() must run first — it may transiently inject
            // "three-column" into layoutConfig when an allowed dialog is open
            // and the current mode is null/default.
            const hasDialog = this.dockActiveDialog();

            // Re-read the profile AFTER dockActiveDialog() so the dynamic
            // three-column injection is visible here.
            const profile = this.getActiveProfile();

            if (profile) {
                this.enforceProfileLayout();
                this.applyProfileColumnLayout(hasDialog);
            } else {
                this.applyDefaultColumnLayout();
                const dialogHost = document.getElementById("editorLayoutDialogHost");
                if (dialogHost) dialogHost.classList.add("ds-none");
            }

            this.updateAllNavButtonStates();
            this.setActiveView();
        } catch (err) {
            this.logError("editorLayout.refreshLayout", err);
        }
    }

    // ── view switching ──────────────────────────────────────────────────────

    setView(viewName, target) {
        const {
            editorSection,
            pdfSection
        } = this.getElements();
        const profile = this.getActiveProfile();
        const sv = this.getScreenView();

        try {
            if (!editorSection) return this.getView();

            if (profile && profile.hidePdf) {
                this.showElement(editorSection);
                this.hideElement(pdfSection);
                this.refreshLayout();
                return this.getView();
            }

            if (viewName === sv.edit) {
                this.showElement(editorSection);
                this.hideElement(pdfSection);
            } else if (viewName === sv.pdf) {
                this.hideElement(editorSection);
                this.showElement(pdfSection);
            } else if (viewName === sv.both || viewName === "list-group-item") {
                this.showElement(editorSection);
                this.showElement(pdfSection);
            } else if (viewName === sv.maximize) {
                if (typeof GlobalEditor !== "undefined" && GlobalEditor && typeof GlobalEditor.execCommand === "function") {
                    GlobalEditor.execCommand(viewName);
                }
                if (typeof DIALOG_POSITION !== "undefined" && DIALOG_POSITION && typeof DIALOG_POSITION.check === "function") {
                    DIALOG_POSITION.check();
                }
            }

            this.refreshLayout();
            this.setActiveView(viewName === "list-group-item" ? sv.both : viewName);
            if (viewName !== "list-group-item") this.restoreCursor();

            if (target) {
                const source = target.querySelector(".img-fluid-thumbil.active");
                if (source && typeof postNavigation === "function") postNavigation(source, "thumbil");
            }
            return this.getView();
        } catch (err) {
            this.logError("editorLayout.setView", err);
            return this.getView();
        }
    }

    // ── navigation toggle ───────────────────────────────────────────────────

    toggleNavigation(targetId) {
        const {
            tocSection,
            thumbnailSection,
            thumbnailButton
        } = this.getElements();
        const profile = this.getActiveProfile();

        try {
            if (targetId === "NaviButton1" && tocSection) {
                tocSection.classList.toggle("ds-none");
            } else if (targetId === "NaviButton2" && thumbnailSection && thumbnailButton) {
                if (profile && profile.hideThumbnail) return;
                thumbnailSection.classList.toggle("ds-none");

                // Inform thumbnail lazy-loader about panel visibility change.
                if (typeof PDF_THUMBNAIL !== "undefined" && typeof PDF_THUMBNAIL.onThumbnailToggle === "function") {
                    const isVisible = !thumbnailSection.classList.contains("ds-none");
                    PDF_THUMBNAIL.onThumbnailToggle(isVisible);
                }
            }

            this.updateAllNavButtonStates();
            this.refreshLayout();
            return true;
        } catch (err) {
            this.logError("editorLayout.toggleNavigation", err);
            return false;
        }
    }

    // ── ImpactView shim ─────────────────────────────────────────────────────

    ensureImpactViewShim() {
        const self = this;
        window.ImpactView = {
            defaultView_edit: true,
            getScreenView: self.getViewMap(),
            getView: () => self.getView(),
            setView: (viewName, target) => self.setView(viewName, target),
            setActiveView: (viewName, wasMaxiView) => self.setActiveView(viewName, wasMaxiView),
            NaviToggle: (_, targetElement) => {
                if (!targetElement || !targetElement.id) return false;
                return self.toggleNavigation(targetElement.id);
            },
            RestoreCursor: () => self.restoreCursor(),
            INIT: () => self.init()
        };
    }

    // ── styles & host injection ─────────────────────────────────────────────

    injectStyles() {
        if (document.getElementById("editorLayoutStyles")) return;
        const style = document.createElement("style");
        style.id = "editorLayoutStyles";
        // Runtime-only overrides that must beat dialog_module.css !important rules.
        // Layout styles live in src/static/css/editorLayout.css.
        style.textContent = `[data-el-docked] { display: none !important; }`;
        document.head.appendChild(style);
    }

    ensureDialogHost() {
        if (this.hostInjected) return;
        const {
            wrapper
        } = this.getElements();
        if (!wrapper) return;

        const host = document.createElement("div");
        host.id = "editorLayoutDialogHost";
        // Derives initial classes from COL.host — no hardcoded strings here
        host.className = ["ds-none", ...COL.host.toClasses()].join(" ");
        host.innerHTML = `
            <div class="el-dialog-host">
                <div class="el-dialog-header" id="editorLayoutDialogHeader"></div>
                <div class="el-dialog-body"   id="editorLayoutDialogBody"></div>
                <div class="el-dialog-footer ds-none" id="editorLayoutDialogFooter"></div>
            </div>`;
        wrapper.appendChild(host);
        this.hostInjected = true;
    }

    // ── dialog host accessors ───────────────────────────────────────────────

    getDialogHostBody() {
        return document.getElementById("editorLayoutDialogBody");
    }
    getDialogHostHeader() {
        return document.getElementById("editorLayoutDialogHeader");
    }
    getDialogHostFooter() {
        return document.getElementById("editorLayoutDialogFooter");
    }

    getOpenDialogs() {
        // Exclude dialogs already docked (marked with data-el-docked, not ds-none,
        // to avoid re-triggering the MutationObserver)
        return Array.from(document.querySelectorAll(
            `${this.dialogSelector}:not(.ds-none):not([data-el-docked])`
        ));
    }

    // ── dialog open/close — full DOM snapshot ───────────────────────────────

    /**
     * Captures the full class-list state of every layout-relevant element
     * BEFORE an allowed dialog is docked and three-column is applied.
     * Stored in this._savedLayoutBeforeDialog.
     */
    _captureFullDOMSnapshot() {
        const {
            viewArea,
            editorSection,
            pdfSection,
            thumbnailSection,
            thumbnailButton,
            tocSection,
            viewOption
        } = this.getElements();

        const snap = el => el ? Array.from(el.classList) : null;

        this._savedLayoutBeforeDialog = {
            layoutConfig: Object.assign({}, this.layoutConfig),
            prevView: this.getView(),
            viewArea: snap(viewArea),
            editorSection: snap(editorSection),
            pdfSection: snap(pdfSection),
            thumbnailSection: snap(thumbnailSection),
            thumbnailButton: snap(thumbnailButton),
            tocSection: snap(tocSection),
            viewOption: snap(viewOption),
        };
    }

    /**
     * Restores every element's class list exactly as captured before the dialog
     * was docked, then re-applies the original layoutConfig.
     */
    _restoreFullDOMSnapshot() {
        if (!this._savedLayoutBeforeDialog) return;

        const snapshot = this._savedLayoutBeforeDialog;
        const {
            viewArea,
            editorSection,
            pdfSection,
            thumbnailSection,
            thumbnailButton,
            tocSection,
            viewOption
        } = this.getElements();

        const restore = (el, classes) => {
            if (!el || !classes) return;
            // Wipe all classes, then re-apply the saved set exactly
            el.className = classes.join(" ");
        };

        restore(viewArea, snapshot.viewArea);
        restore(editorSection, snapshot.editorSection);
        restore(pdfSection, snapshot.pdfSection);
        restore(thumbnailSection, snapshot.thumbnailSection);
        restore(thumbnailButton, snapshot.thumbnailButton);
        restore(tocSection, snapshot.tocSection);
        restore(viewOption, snapshot.viewOption);

        // Restore layoutConfig (reverts the dynamic three-column injection)
        this.layoutConfig = Object.assign({}, snapshot.layoutConfig);
        this._savedLayoutBeforeDialog = null;

        // Re-run layout in the restored mode (without triggering another snapshot)
        if (snapshot.prevView) this.setView(snapshot.prevView);
        this.refreshLayout();
    }

    // ── dock / undock ───────────────────────────────────────────────────────

    _undockDialog(dialogId) {
        if (!dialogId) return;
        const dialog = document.getElementById(dialogId);
        if (!dialog) return;

        const dialogContent = dialog.querySelector(".dialog-content");
        if (dialogContent) {
            // Return each slot's content back into dialog-content so the dialog
            // is fully intact the next time it is opened as a floating panel.
            const hostHeader = this.getDialogHostHeader();
            const hostBody = this.getDialogHostBody();
            const hostFooter = this.getDialogHostFooter();
            if (hostHeader && hostHeader.firstElementChild) dialogContent.appendChild(hostHeader.firstElementChild);
            if (hostBody && hostBody.firstElementChild) dialogContent.appendChild(hostBody.firstElementChild);
            if (hostFooter && hostFooter.firstElementChild) dialogContent.appendChild(hostFooter.firstElementChild);
        }

        delete dialog.dataset.elDocked;

        // Restore all element classes and layoutConfig to pre-dialog state
        this._restoreFullDOMSnapshot();
    }

    dockActiveDialog() {
        const host = document.getElementById("editorLayoutDialogHost");
        const hostHeader = this.getDialogHostHeader();
        const hostBody = this.getDialogHostBody();
        const hostFooter = this.getDialogHostFooter();

        if (!host || !hostBody) return false;

        // If we already have a docked dialog, check it directly —
        // do NOT rely on getOpenDialogs() which excludes [data-el-docked] elements.
        if (this.activeDialogId) {
            const current = document.getElementById(this.activeDialogId);
            if (current && !current.classList.contains("ds-none")) {
                host.classList.remove("ds-none");
                return true;
            }
            // The docked dialog was closed — return its content before clearing
            this._undockDialog(this.activeDialogId);
            this.activeDialogId = null;
            host.classList.add("ds-none");
        }

        const openDialogs = this.getOpenDialogs();
        if (openDialogs.length === 0) {
            host.classList.add("ds-none");
            return false;
        }

        const activeDialog = openDialogs[0];

        // Only dock dialogs in the allowed list
        if (!this.allowedDialogs.includes(activeDialog.id)) {
            return false;
        }

        this.activeDialogId = activeDialog.id;

        // ── Dynamic three-column injection ──────────────────────────────────
        // If profile is null (mode=="default") or useThirdColumnDialogs is not
        // set, capture the full DOM snapshot NOW, then switch layoutConfig to
        // "three-column" so the rest of dockActiveDialog / refreshLayout uses
        // the correct profile.  On dialog close, _restoreFullDOMSnapshot()
        // reverts both the classes and the layoutConfig.
        const profileBeforeDock = this.getActiveProfile();
        const needsDynamicProfile = !profileBeforeDock || !profileBeforeDock.useThirdColumnDialogs;

        if (needsDynamicProfile) {
            // store current state
            this._captureFullDOMSnapshot();
            // Inject three-column transiently (no full page re-init)
            this.layoutConfig = Object.assign({}, this.layoutConfig, {
                editor6: "three-column",
                readOnly: "three-column"
            });
        }

        const dialogContent = activeDialog.querySelector(".dialog-content");
        if (!dialogContent) {
            // Fallback: dock the whole dialog element
            activeDialog.dataset.elDocked = "true";
            if (activeDialog.parentElement !== hostBody) hostBody.appendChild(activeDialog);
            host.classList.remove("ds-none");
            return true;
        }

        // Move each dialog section into its dedicated host slot
        const dialogHeader = dialogContent.querySelector(".dia_header_div");
        const dialogBody = dialogContent.querySelector("[data-id='dialog-body']");
        const dialogFooter = dialogContent.querySelector("[data-id='dialog-footer']");

        if (hostHeader && dialogHeader) {
            hostHeader.innerHTML = "";
            hostHeader.appendChild(dialogHeader);
            // Intercept close icon clicks: the header is now outside .mDialog so
            // e.target.closest('.mDialog') in closeDialog() would return null and throw.
            // Restore content back into the dialog shell first, then let the module close itself.
            const closeIcon = hostHeader.querySelector(".closeIcons");
            if (closeIcon) {
                closeIcon.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const dialogId = this.activeDialogId;
                    this._undockDialog(dialogId);
                    this.activeDialogId = null;
                    if (typeof MODULE_LIST !== "undefined" && MODULE_LIST[dialogId]) {
                        const mod = MODULE_LIST[dialogId];
                        if (typeof mod.closeDialog === "function") mod.closeDialog();
                        else if (typeof mod.hide === "function") mod.hide();
                    } else {
                        const dlg = document.getElementById(dialogId);
                        if (dlg) dlg.classList.add("ds-none");
                    }
                }, {
                    once: true
                });
            }
        }
        if (hostBody && dialogBody) {
            hostBody.innerHTML = "";
            hostBody.appendChild(dialogBody);
        }
        if (hostFooter && dialogFooter) {
            hostFooter.innerHTML = "";
            hostFooter.appendChild(dialogFooter);
        }

        // Hide shell with data attribute (not a class) so MutationObserver doesn't re-fire
        activeDialog.dataset.elDocked = "true";
        host.classList.remove("ds-none");
        return true;
    }

    // ── event binding ───────────────────────────────────────────────────────

    bindTriggerElement(element) {
        if (!element || this.boundElements.has(element)) return;
        this.boundElements.add(element);

        if (!element.classList.contains("viewoption")) {
            element.addEventListener("click", (event) => {
                const currentTarget = event.currentTarget;
                const area = currentTarget.getAttribute("data-view") || currentTarget.getAttribute("class");
                if (!area) return;

                if (area === this.getScreenView().navi) {
                    event.preventDefault();
                    this.toggleNavigation(currentTarget.id);
                    return;
                }
                if (this.getView() !== area || area === "list-group-item") {
                    this.setView(area, currentTarget);
                }
            });
        } else {
            const srcName = element.src.split("/").pop();
            const pathFile = this.prefixSVG + (srcName.includes("_") ? srcName.split("_")[0] : srcName.split(".")[0]);

            element.addEventListener("mouseenter", () => {
                if (!element.parentElement.classList.contains("active")) element.src = pathFile + "_2.svg";
            });
            element.addEventListener("mouseleave", () => {
                if (!element.parentElement.classList.contains("active")) element.src = pathFile + ".svg";
            });
        }
    }

    bindTriggerElements() {
        document.querySelectorAll(".d-inline-block[data-view], #NaviButton1, #NaviButton2, .list-group-item, .viewoption").forEach(item => this.bindTriggerElement(item));
    }

    bindEvents() {
        this.bindTriggerElements();

        // Disconnect existing observer before creating a new one
        // so observers never accumulate across calls
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        var targetElement = document.getElementById("trackDialogModule") || document.body;
        const observerConfig = {
            attributes: true,
            attributeFilter: ["class", "style"]
        };

        var self = this;
        var testingDate = new Date().toLocaleDateString() == "6/24/2026";

        this.observer = new MutationObserver(function(mutationsList) {
            // Disconnect before refreshLayout() modifies classes,
            // so our own DOM changes don't re-trigger the observer
            for (var mutation of mutationsList) {
                if (mutation.type === "attributes" && mutation.attributeName === 'class') {
                    if (IS_LOCAL_HOST && testingDate) return;
                    self.observer.disconnect();
                    self.bindTriggerElements();
                    self.refreshLayout();
                    self.observer.observe(targetElement, observerConfig);
                    break;
                } else {
                    debug.log("editorLayout MutationObserver: Ignored mutation", mutation.target.id);
                }
            }
        });

        this.observer.observe(targetElement, observerConfig);
    }

    // ── showRevision save / restore (non-oxmedo only) ───────────────────────

    _isOxmedo() {
        try {
            return this.getClientName().toUpperCase() === "OXMEDO";
        } catch (e) {
            return false;
        }
    }

    _saveLayoutSnapshot() {
        const {
            viewArea,
            tocSection
        } = this.getElements();
        this._savedLayoutBeforeRevision = {
            viewAreaClasses: viewArea ? Array.from(viewArea.classList) : [],
            tocHidden: tocSection ? tocSection.classList.contains("ds-none") : false,
            activeDialogId: this.activeDialogId
        };
    }

    _restoreLayoutSnapshot() {
        const snapshot = this._savedLayoutBeforeRevision;
        if (!snapshot) return;

        const {
            viewArea,
            tocSection
        } = this.getElements();

        if (viewArea) {
            // Strip all col-* classes then re-apply the saved set
            const colPattern = /^col(-\w+)*$/;
            Array.from(viewArea.classList).filter(c => colPattern.test(c)).forEach(c => viewArea.classList.remove(c));
            snapshot.viewAreaClasses.filter(c => colPattern.test(c)).forEach(c => viewArea.classList.add(c));
        }

        if (tocSection) tocSection.classList.toggle("ds-none", snapshot.tocHidden);

        this.activeDialogId = snapshot.activeDialogId;
        this._savedLayoutBeforeRevision = null;
        this.refreshLayout();
    }

    _bindShowRevisionHandlers() {
        if (this._isOxmedo()) return;

        // Event delegation — covers dynamically injected buttons
        document.addEventListener("click", (e) => {
            if (!e.target.closest("[data-action='showRevision'], .showRevision, #showRevisionBtn")) return;
            this._saveLayoutSnapshot();
        });

        document.addEventListener("click", (e) => {
            if (!e.target.closest(
                    "[data-action='closeRevision'], .closeRevision, #closeRevisionBtn, " +
                    ".revision-dialog .closeIcons, #revisionDialog .closeIcons"
                )) return;
            this._restoreLayoutSnapshot();
        });
    }

    // ── entry point ─────────────────────────────────────────────────────────

    init() {
        if (this.initialized) return true;
        try {
            this.ensureImpactViewShim();
            this.injectStyles();
            this.ensureDialogHost();
            this.bindEvents();

            this.refreshLayout();
            this.initialized = true;
            return true;
        } catch (err) {
            this.logError("editorLayout.init", err);
            return false;
        }
    }
}

window.editorLayout = new editorLayout({
    profileMap: {}
});