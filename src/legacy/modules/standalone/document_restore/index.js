/**
 **  div class="mDialog ds-none w-editor-access" id="DocumentRestoreDialog" 
 **  Module Description Restore Author saved Document Version Files *
 **  #1: Restore version Handled in Original version, Query / comments and Replace Image also.
 **  #2: Before Restore shown Alert for Unable to undo(Please note that you will not be able to undo after the content gets restored.
 **   Do you wish to continue?)
            
*/
/**
 * DocumentRestoreModule - Handles document version restoration functionality
 * Allows users to restore previous versions of documents with proper confirmation
 */
class DocumentRestoreModule extends BaseModule {
    constructor(name, errorTracker, options = {}) {
        super(name, errorTracker, options);
        this.initializeProperties();
        this.bindMethods();
        this.initiated = true;
    }

    initializeProperties() {
        this.canUnmountComponentWhileClose = true;
        this.toasterMessage = {};

        this._state = {
            textLimit: {
                min: 25,
                max: 75
            },
            restoreId: null,
            lastOptions: null,
            lastList: [],
            templates: {
                spinner: `<span id="spinner_dv" class="spinner-border iSpin_border" role="status">
                    <span class="sr-only">Loading...</span>
                </span>`
            }
        };

        this.elements = {};
        this.selectors = {
            PANEL_BODY: ".dialog-body",
            PANEL_FOOTER: ".dialog-footer",
            PANEL_HEADER: ".dialog-header",
            PANEL_CONTENT: ".dialog-content",
            VERSION_LIST: ".version_list",
            SELECT_ITEM: ".opt_select",
            FIRE_RESTORE: "#restore_version"
        };
    }

    bindMethods() {
        const methodsToBind = [
            'assignVariablesAndEvents',
            'initLoop',
            'showLoop',
            'fireRestore',
            'attachClickEvents',
            'resetAllDependencies',
            'handleVersionSelect'
        ];

        methodsToBind.forEach(method => {
            if (this[method]) {
                this[method] = this[method].bind(this);
            }
        });
    }

    initLoop() {
        this.autoInitiated = true;
        this.fullyLoaded = true;
    }

    /**
     * Show dialog before hook
     * @returns {boolean} - Whether to continue showing
     * @public
     */
    showBefore() {
        try {
            if (window._UnifiedSelectionUtils) {
                const lockedInfo = window.paraLock.getLockedElementsByOthers();
                if (lockedInfo.byOthers.length > 0) {
                    TOASTER_ALERT('ErrorReStoreForCollab', {
                        type: 'warning'
                    });
                    return false;
                }
            }
            return true;
        } catch (error) {
            return true;
        }
    }
    /**
     * Main entry point to show the restore dialog
     * @param {Object} options - Configuration options
     */
    showLoop(options = {}) {

        try {


            this.impactSelection = IMPACT_SELECTION || {};
            this.editorCursor = EDITOR_CURSOR || {};

            this.assignVariablesAndEvents();

            this._state.lastOptions = {
                lastDoc: false,
                returnData: false
            };

            this.handlePDFGenerationReset();

            if (!this.isOnline()) {
                this.showOfflineWarning();
                return false;
            }

            this.loadVersionHistory();

        } catch (error) {
            this.trackError('showLoop', error);
        }
    }

    /**
     * Initialize DOM elements and event handlers
     */
    assignVariablesAndEvents() {
        Object.entries(this.selectors).forEach(([key, selector]) => {
            this.elements[key] = this.Panel.querySelector(selector);
        });

        if (this.elements.FIRE_RESTORE) {
            this.elements.FIRE_RESTORE.onclick = this.fireRestore;
        }
    }

    /**
     * Handle PDF generation status reset for books
     */
    handlePDFGenerationReset() {
        if (!IS_JOURNAL) {
            const pdfElement = this.getElementById('GenaratePDF');
            if (pdfElement) {
                pdfElement.setAttribute('data-last-Genarate-Status', "1");
            }
        }
    }

    /**
     * Check if user is online
     */
    isOnline() {
        return navigator.onLine;
    }

    /**
     * Show offline warning to user
     */
    showOfflineWarning() {
        TOASTER_ALERT('OffLine_Error_show', {
            type: 'warning'
        });
    }

    /**
     * Load version history based on environment
     */
    loadVersionHistory() {
        const requestData = GET_JSON('restore_document', {
            process: "getfiles"
        });

        debug.log(JSON.stringify(requestData));

        if (SHARED_KEY["_id"]) {
            // For shared files
            commonfn['callajax'](requestData, 'GET_HTML_FILES', API_CK_RESTORE, this);
        } else if (IS_LOCAL_HOST) {
            // For local development
            this.loadLocalFile();
        }
    }

    /**
     * Load local file for development environment
     */
    loadLocalFile() {
        const filename = `${DOC_ID}.html`;
        const fileUrl = `${BUCKET_URL}${DOC_ID}/${filename}`;

        $.get(fileUrl)
            .done((data) => {
                SET_DATA.setNewData(data, {
                    DOM_Empty: false,
                    reGenerateAll: true,
                    cleanHTML: false
                });
            })
            .fail((error) => {
                this.trackError('loadLocalFile', error);
            });

        this.attachClickEvents();
    }

    /**
     * Attach click events to version selection items
     */
    attachClickEvents() {
        // if (IS_LOCAL_HOST) debugger;
        const versionElements = this.Panel.querySelectorAll('div.opt_select');

        versionElements.forEach(element => {
            element.onclick = this.handleVersionSelect;
        });
    }

    /**
     * Handle version selection
     * @param {Event} event - Click event
     */
    handleVersionSelect(event) {
        const selectedElement = event.currentTarget;

        // Enable restore button
        this.elements.FIRE_RESTORE.classList.remove('disabled');
        this._state.restoreId = selectedElement.id;

        // Remove previous selection
        const currentlySelected = this.Panel.querySelector('div.opt_select.selected');
        if (currentlySelected) {
            currentlySelected.classList.remove('selected');
        }
        // Mark current selection
        selectedElement.classList.add('selected');
    }

    /**
     * Reset all dependencies before restoration
     */
    async resetAllDependencies() {
        try {
            // Reset impact selection
            IMPACT_SELECTION._SNAPSHOT({
                reset: true
            });

            // Reset spell check
            const spellCheckImg = $('#showSpellDiv').find('img#spellCheckImg');
            if (spellCheckImg.length) {
                spellCheckImg.attr('src', 'assets/images/svg/mainPage/MenuTrackOFF.svg');
            }

            // Handle original version restoration
            if (this._state.restoreId === "Originalversion") {
                await this.restoreOriginalVersion();
            }
        } catch (error) {
            this.trackError('resetAllDependencies', error);
        }
    }

    /**
     * Restore original version specific logic
     */
    async restoreOriginalVersion() {
        // const fileUrl = `${BUCKET_URL}${DOC_ID}/${DOC_ID}_AQ.html`;
        //  ? N9ed8fa23-9232-4d30-a375-20f8c4581238_5b53536b4c4a803e9a5abf70_AU_AQ_original.html
        const fileUrl = this.buildFileUrl(`${USER_INFO.SELECTOR_BKUP_FOLDER}_AQ_original.html`);

    }

    /**
     * Main restore function with confirmation dialog
     */
    async fireRestore() {

        try {
            if (!this._state.restoreId) {
                TOASTER_ALERT('restoreNoHTMLFile', {
                    type: 'warning'
                });
                return false;
            }
            var isConfirmed = await IMPACT_ALERT("reStoreHTML");
            if (isConfirmed) {
                await this.performRestore();
                this.closeModule();
            }
        } catch (error) {
            this.trackError('fireRestore', error);
        } finally {
            this.createSnapshot(true, false);
        }
    }

    /**
     * Perform the actual restore operation
     */
    async performRestore() {
        // if (IS_LOCAL_HOST) debugger;
        console.log("--performRestore--");
        try {
            this.createSnapshot(true, true);
            await this.resetAllDependencies();

            const filenamePrefix = this.getFilenamePrefix();
            const filename = `${filenamePrefix}.html`;
            const fileUrl = this.buildFileUrl(filename);

            debug.log(`Restoring from: ${fileUrl}`);

            // Update file on server
            await this.updateRestoreFile(filenamePrefix);

            // Load and set restored content
            await this.loadRestoredContent(fileUrl, filenamePrefix);

            // Unlock snapshot and close
            IMPACT_SELECTION._SNAPSHOT({
                unlock: true
            });


        } catch (error) {
            this.trackError('performRestore', error);
        }
    }

    /**
     * Get filename prefix based on restore type
     */
    getFilenamePrefix() {
        return this._state.restoreId === "Originalversion" ?
            `${USER_INFO.SELECTOR_BKUP_FOLDER}_original` :
            this._state.restoreId.toString();
    }

    /**
     * Build file URL for restoration
     */
    buildFileUrl(filename) {
        return `${BUCKET_URL}${DOC_ID}/backup/${USER_INFO.SELECTOR_BKUP_FOLDER}/${DOC_ID}_${filename}`;
    }

    /**
     * Update restore file on server
     */
    async updateRestoreFile(filenamePrefix) {
        const requestData = GET_JSON('restore_document', {
            process: "updatefile",
            filename: filenamePrefix
        });

        commonfn['callajax'](requestData, 'REPLACE_HTML_FILE', API_CK_RESTORE, this);
    }

    /**
     * Load and set restored content
     */
    async loadRestoredContent(fileUrl, filenamePrefix) {
        try {
            const data = await $.get(fileUrl);

            this.setEditorData(data);
            this.updateDocumentTitles(data);
            await this.updateDatabase(filenamePrefix);
            this.updateLastRestoredTime();

            if (window.queryModule && typeof window.queryModule.refreshDomCache == "function") {
                window.queryModule.refreshDomCache();
            }

            if (window.queryPanel && typeof window.queryPanel.render == "function") {
                setTimeout(() => {
                    window.queryPanel.render(true);
                }, 400);
            }

        } catch (error) {
            this.handleLoadError(error, filenamePrefix);
        }
    }

    /**
     * Set data in editor
     */
    setEditorData(data) {
        if (!SET_DATA || typeof SET_DATA.setNewData !== 'function') {
            SET_DATA = new ImpactSetDatafn();
        }

        if (GlobalEditor) {
            SET_DATA.setNewData(data, {
                DOM_Empty: false,
                reGenerateAll: true,
                cleanHTML: false,
                UndoDisable: true
            });
        } else {
            CKEDITOR.instances.maineditor.setData(data);
        }
    }

    /**
     * Update document titles
     */
    updateDocumentTitles(data) {
        SET_TITLES(SHARED_KEY, {
            restore: true,
            Data: data
        });
    }

    /**
     * Update database with restore information
     */
    async updateDatabase(filenamePrefix) {
        const requestData = GET_JSON('restore_document', {
            process: "update_db",
            recordtype: "documentversion",
            keyname: "a",
            restoreversionfilename: filenamePrefix
        });

        // Add restoration time for non-original versions
        if (!filenamePrefix.match(/Originalversion|Original/gi)) {
            requestData.restoreversiontime = moment(filenamePrefix, "x")
                .format('DD-MMM-YYYY h:mm:ss a Z');
        }

        debug.log("Database update request:", JSON.stringify(requestData));

        commonfn['callajax'](requestData, 'UPDATE_DB', API_UPDATE_INSERT, this);
    }

    /**
     * Update last restored time
     */
    updateLastRestoredTime() {
        if (IMPACT_SAVE) {

            const restoreId = this._state.restoreId;

            if (!IMPACT_SAVE.state) {
                IMPACT_SAVE.state = {};
            }

            IMPACT_SAVE.state.lastRestoredTime = restoreId;
            
        }
    }

    /**
     * Handle file load errors
     */
    handleLoadError(error, filename) {
        const errorMessage = `${error.statusText || 'Unknown error'}=${error.status || 'Unknown status'}`;
        ErrorLogTrace(`FILE_MISSING_${filename}`, errorMessage);
    }

    /**
     * Create snapshot for undo functionality
     */
    createSnapshot(save, lock) {
        this._SNAPSHOT({
            save,
            lock
        });
    }

    /**
     * Handle server response for file replacement
     */
    REPLACE_HTML_FILE(response) {
        if (response.r === 1) {
            debug.log("HTML file replaced successfully");
        } else {
            ErrorLogTrace('REPLACE_HTML_FILE', response.m);
        }
    }

    /**
     * Handle server response for HTML files list
     */
    GET_HTML_FILES(response) {
        try {
            if (response.htmlfiles === 0) {
                TOASTER_ALERT('restoreNoHTMLFile', {
                    type: 'info'
                });
                return;
            }

            let fileList = response.htmlfiles;
            if (typeof fileList === "string") {
                fileList = fileList.split(",").map(s => s.trim()).filter(Boolean);
            }

            const versions = this.parseVersionList(fileList);
            this.renderVersionList(versions);
            this.attachClickEvents();

        } catch (error) {
            console.warn(error.message);
            this.showLoop();
        }
    }

    /**
     * Parse version list from server response
     */
    parseVersionList(htmlFiles) {
        const fileList = Array.isArray(htmlFiles) ?
            htmlFiles :
            String(htmlFiles).split(',').map(s => s.trim()).filter(Boolean);

        const versions = [];

        // Add original version        
        versions.push({
            id: 'Originalversion',
            name: this.getOriginalVersionLabel()
        });

        // Add timestamped versions (latest first)
        for (let i = fileList.length - 1; i >= 0; i--) {
            const timestamp = fileList[i];

            // Skip entries with underscores (processed versions?)
            if (timestamp.includes('_')) continue;

            versions.push({
                id: timestamp,
                name: this.formatVersionName(timestamp)
            });
        }

        return versions;
    }


    /**
     * Get label for original version based on user role
     */
    getOriginalVersionLabel() {
        const isEditor = (USER_INFO.IS_EDITOR_COMES_FIRST || USER_INFO.IS_EDITOR_ONLY) &&
            USER_INFO.ROLE_ID === ROLE_IDS.ED;
        const isAuthor = USER_INFO.IS_AUTHOR && !USER_INFO.IS_EDITOR_COMES_FIRST;

        return (isEditor || isAuthor) ? "Original version" : "Previous stage version";
    }

    /**
     * Format version name with timestamp and relative time
     */
    formatVersionName(timestamp) {
        const formattedTime = moment(timestamp, "x").format('DD-MMM-YYYY h:mm:ss a Z');
        const relativeTime = diff_human_time(parseInt(timestamp));
        return `${formattedTime} - ${relativeTime}`;
    }

    /**
     * Render version list in UI
     */
    renderVersionList(versions) {
        const versionElements = versions.map(version =>
            `<div id="${version.id}" class="opt_select">${version.name}</div>`
        );

        this.elements.VERSION_LIST.classList.remove('d-flex', 'justify-content-center', 'align-items-center');

        $(this.elements.VERSION_LIST)
            .empty('')
            .append(this.GetFragment(versionElements.join('')));

        this._state.lastList = versionElements;
    }

    /**
     * Get element by ID safely
     */
    getElementById(id) {
        return document.getElementById(id);
    }

    /**
     * Close the module dialog
     */
    closeModule() {
        if (typeof this.closeDialog === "function") {
            this.closeDialog();
        } else {
            this.Panel.classList.add("ds-none");
        }
    }
}

export default DocumentRestoreModule;