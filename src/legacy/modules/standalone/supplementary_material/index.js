/**
 * @module SupplementaryMaterial
 * @description Handles supplementary material management including file uploads, replacements,
 * and associated queries in the editor interface.
 * 
 * Development Instructions:
 * 1. Module follows SOLID principles with clear separation of concerns
 * 2. Use TypeScript-style JSDoc comments for better IDE support
 * 3. Implement error boundaries and proper error handling
 * 4. Follow event delegation pattern for performance
 * 5. Maintain immutable state updates
 * 6. Use template literals for HTML generation
 * 7. Implement proper cleanup to prevent memory leaks
 */

class SupplementaryMaterial extends BaseModule {
    /**
     * @typedef {Object} State
     * @property {Element[]} editorFilesList - List of supplementary material elements
     * @property {Object} formData - Form data containing files
     * @property {Object} templates - HTML templates for rendering

     * @typedef {Object} Elements
     * @property {HTMLElement} submitButton - Submit button element
     * @property {HTMLElement} queryResponse - Query response input element
     * @property {HTMLElement} fileInput - File input element
     */

    constructor(name, errorTracker, options = {}) {
        super(name, errorTracker, options);
        this.editorFilesList = [];
        this.filesExtractData = [];
        this.formData = new FormData();
        this.formData.files = [];
        this.templates = {
            existsItem: this.createExistingFileItemTemplate(),
            queryContent: this.createQueryContentTemplate(),
            uploadFileItem: this.createUploadFileItemTemplate(),
            fileNewEntry: this.createFileEntryTemplate(),
            tocRootEntry: this.createTOCRootTemplate()
        };
        this.elements = {
            submitButton: null,
            queryResponse: null,
            fileInput: null
        };
        this._state = {
            files: [],
            lastClickData: {}
        };
        this.current_query = null;
        this.query_text = '';
        this.FILE_TYPES = {
            NEW: 'New',
            REPLACED: 'Replaced'
        };
        this.ATTRIBUTES = {
            FILE_SN: 'data-file-sn',
            FILE_ON: 'data-file-on',
            FOLDER_NAME: 'data-folder-name',
            COMMENT_BOX: 'data-user-comment-box',
            TIME: 'data-timec',
            ROLE: 'data-role'
        };
        this.SEPARATORS = {
            FILE_ATTRIBUTES: '||'
        };
        this.EDITOR_REMARK_LABEL = 'When adding or replacing supplemental files, please include a message to the Editor explaining the reason for the file addition/replacement.';
        this._fileUploader = new FileUploadModule(API_UPLOAD_MULTI);
        this.query_selector = `[data-user-comment-box][data-name="AQ"]`;
        this.query_attr_selector = 'data-user-comment-box';
        this.Pattern_1 = "We have received the following files for publication as supplementary material";
        this.Pattern_2 = /We have received(?: the following)? files for publication as supplementary material/i;
        this.regexMake = new RegExp(this.Pattern_1, "i");
        this.mimetypeList = {};

    }


    createTOCRootTemplate() {
        return `<li class="lof-items" id="supp_items" title=""><span class="impact" tabindex="0"><span class="fa fa-angle-right"></span>Supplementary Files (<span id="SuppCount" class="FloatsCount">0</span>)</span><ul class="nested" id="losupp"></ul></li>`;
    }

    _escapeHtml(text = '') {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    createTOCItemTemplate(metaData = {}) {
        const {
            label,
            name,
            id,
            navId,
            displayText,
            captionElement,
            isDeleted
        } = metaData;
        if (isDeleted || !captionElement) return '';

        const listLabel = label || name || '';
        const listText = this._escapeHtml(displayText || listLabel || 'No caption available');
        const navTargetId = navId || id || '';
        const displayAttr = this._escapeHtml(listLabel);

        return `<li class="lof-items"><span class="impact" onclick="postNavigation(this, 'toc')" tabindex="0" data-id="${navTargetId}" data-display="${displayAttr}">${listText}</span></li>`;
    }

    getElement(_id) {
        return document.getElementById(_id);
    }

    initialize() {

        const isReady = this._checkDependencies();

        if (!isReady) {
            setTimeout(() => this.initialize(), 750);
            return;
        }

        this.setUpEditorInstance();

        // Check if client is valid
        this._isPlos = this.isPlosClient();

        // Check panel list
        this._panelList = this.getElement('lof_list');

        // keep waiting
        if (!this._panelList) return;

        // Insert TOC root entry if missing
        const suppItemEl = this.getElement('supp_items');
        if (!suppItemEl) {
            $(this._panelList).append(this.templates.tocRootEntry);
        }

        if (!this._isPlos) {
            if (suppItemEl) suppItemEl.classList.add('ds-none');
            return;
        }

        // Run your setup once DOM is ready
        this.getFilesCount();

        this.generateFilesList({
            mode: 'toc'
        });

        // Mark initialized and stop polling
        this.initialized = true;

        console.log("SupplementaryMaterial initialized successfully");

    }

    renderSuppFloatList(entries = []) {
        if (!this._isPlos) return;

        const root = document.getElementById('supp_items');
        const list = document.getElementById('losupp');
        const count = document.getElementById('SuppCount');
        if (!list || !root) return;

        const visibleEntries = entries.filter(entry => entry.tocHtml);
        list.innerHTML = visibleEntries.map(entry => entry.tocHtml).join('');
        if (count) count.textContent = visibleEntries.length;
        root.classList[visibleEntries.length ? 'remove' : 'add']('ds-none');

        if (typeof SET_DATA !== 'undefined' && typeof SET_DATA.FIRE_TIPPY_TOOLTIP === 'function') {
            const tooltipEntries = visibleEntries
                .map(entry => entry.meta)
                .filter(meta => meta && meta.navId)
                .map(meta => ({
                    title_id: meta.navId,
                    title: meta.displayText || meta.label
                }));
            if (tooltipEntries.length) SET_DATA.FIRE_TIPPY_TOOLTIP(tooltipEntries);
        }
    }

    refreshSuppFloatList() {
        if (this._isPlos) this.generateFilesList({
            mode: 'toc'
        });
    }

    // Template Methods
    /**
     * @private
     * @param {Object} param0 - Template parameters
     * @returns {string} Generated HTML for file item
     */

    getFileContentType(name) {
        const ext = ((name || '').split('.').pop()).toLowerCase();
        if (['jpg', 'jpeg', 'png', 'tif', 'tiff', 'gif', 'bmp', 'svg'].includes(ext)) return 'Fig';
        if (['xlsx', 'xls'].includes(ext)) return 'Table';
        if (['zip'].includes(ext)) return 'Data';
        if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return 'Movie';
        if (['pdf', 'doc', 'docx', 'txt', 'csv', 'rtf'].includes(ext)) return 'File';
        return 'File';
    }

    fileTypeSelectHtml(contentType = '') {
        const opt = (val) => `<option value="${val}"${contentType === val ? ' selected' : ''}>${val}</option>`;
        return `<select id="SuppfigSelectOpt" class="file-type-select form-select form-select-sm" title="File Type">
                        <option value="">-- Select --</option>
                        ${opt('Fig')}
                        ${opt('Table')}
                        ${opt('Movie')}
                        ${opt('Text')}
                        ${opt('Data')}
                        ${opt('File')}
                    </select>`;
    }

    fileLabelPreviewHtml(contentType = '') {
        const text = contentType ? `S${this.getNextLabelNumber(contentType)} ${contentType}.` : '';
        return `<span class="file-label-preview">${text}</span>`;
    }

    createExistingFileItemTemplate() {
        return ({
            fileId,
            fileName,
            downloadUrl,
            orgName,
            deleteId = '',
            type = "",
            label = ""
        }) => {
            const col2Content = label || "";
            const col3Content = `<button class="icon-button replace_file" title="Replace" id="${fileId}" data-org-name="${orgName || fileName || ''}"><i class="fas fa-exchange-alt"></i></button>`;

            return `
            <div class="row file-item ${type} ${deleteId}" id="${fileId}">
                <div class="col-5 file-name" data-exit-name="${fileName}">${fileName}</div>
                <div class="col-2 label">${col2Content}</div>
                <div class="col-2">${col3Content}</div>
                <div class="col-2">
                    <a class="download_file" href="${downloadUrl}" target="_blank">
                        <button class="icon-button" title="Download"><i class="fas fa-download"></i></button>
                    </a>
                </div>
                <div class="col-1 ds-none">
                    <a class="delete_file" href="" title="Delete" id="${fileId}">
                        <button class="icon-button" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </a>
                </div>
            </div>`;
        };
    }

    createQueryContentTemplate() {
        return ({
            label,
            content
        }) => `<span class="query_info" data-label="${label}">${content}</span>`;
    }

    createCaptionArea(contentType) {
        return `<div class="d-flex flex-column mt-1 caption-item">
                    <div class="">
                        <label for="SuppfigSelectOpt">Select Label</label>
                        ${this.fileTypeSelectHtml(contentType)}
                    </div>
                    <div class="">
                        <fieldset class="form-group  sn-h-sm" id="caption_group">
                            <legend class="sr-only">Caption</legend>
                            <label for="supp-caption-input">Caption</label>
                            <div class="supp-caption-input form-control form-control-sm overflow-auto" role="textbox" aria-multiline="true" title="caption input" tabindex="0" onkeypress="return event.keyCode !== 13" contenteditable="true"></div>
                        </fieldset>
                    </div>
                    ${this.createReplaceRemarkArea('', {
                        mode: 'add',
                        label: this.EDITOR_REMARK_LABEL
                    })}
                </div>`;
    }

    createReplaceRemarkArea(existingFileId = '', options = {}) {
        const {
            existingCommentId = '',
                priorRemarksHtml = '',
                mode = 'replace',
                label = this.EDITOR_REMARK_LABEL,
                placeholder = ''
        } = options;
        const historyHtml = priorRemarksHtml ?
            `<div class="replace-remark-history mb-1">${priorRemarksHtml}</div>` :
            '';
        const labelText = this._escapeHtml(label);
        const placeholderAttr = placeholder ?
            ` placeholder="${this._escapeHtml(placeholder)}"` :
            '';
        const wrapClass = mode === 'add' ?
            'replace-remark-item mt-1 w-100' :
            'col-12 replace-remark-item mt-1 ml-2';
        return `<div class="${wrapClass}" data-remark-mode="${mode}" data-existing-file-id="${existingFileId}" data-existing-comment-id="${existingCommentId || ''}">
                    ${historyHtml}
                    <fieldset class="form-group sn-h-sm" id="replace_remark_group">
                        <legend class="sr-only">${labelText}</legend>
                        <label for="supp-replace-remark-input">${labelText}</label>
                        <div class="supp-replace-remark-input form-control form-control-sm overflow-auto" role="textbox" aria-multiline="true" title="remarks input"${placeholderAttr} tabindex="0" onkeypress="return event.keyCode !== 13" contenteditable="true"></div>
                    </fieldset>
                </div>`;
    }

    /**
     * Collect existing replacement-remark comments from a supplementary-material element.
     * @param {Element|null} suppEl
     * @returns {Array<{outerId: string, content: string, username: string, rolename: string, role: string, isCurrentUser: boolean}>}
     */
    collectReplaceRemarkCommands(suppEl) {
        const remarks = [];
        try {
            if (!suppEl) return remarks;
            const inners = suppEl.querySelectorAll('[data-insert-from="supp-replace-dialog"]');

            Array.from(inners).forEach(inner => {
                const outer = inner.closest('[data-class="ckcommentsfull"]') || inner.parentElement;
                if (!outer || outer.hasAttribute('data-deleted')) return;

                const username = inner.getAttribute('data-username') || '';
                const rolename = inner.getAttribute('data-rolename') || '';
                const role = inner.getAttribute('data-role') || '';
                remarks.push({
                    outerId: outer.id || '',
                    content: inner.getAttribute('data-user-comment-box') || '',
                    username,
                    rolename,
                    role,
                    isCurrentUser: commonMethods.IS_SAME_USER_AND_ROLE(inner)
                });
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('collectReplaceRemarkCommands', err.message);
        }
        return remarks;
    }

    formatReplaceRemarkLabel({
        rolename = '',
        role = '',
        username = ''
    } = {}) {
        const rolePart = rolename || role || '';
        // ${username}
        return `${rolePart}`.trim();
    }

    invalidWarning(message) {
        return `<div class="invalid-feedback-show" for="supp_caption">Label and Captions text are mandatory. Please enter a minimum of 5 characters for this field.</div>`;
    }

    invalidReplaceWarning() {
        return `<div class="invalid-feedback-show" for="supp_replace_remark">A message to the Editor is mandatory. Please enter a minimum of 5 characters for this field.</div>`;
    }

    invalidEditorMessageWarning() {
        return `<div class="invalid-feedback-show" for="supp_replace_remark">A message to the Editor is mandatory. Please enter a minimum of 5 characters for this field.</div>`;
    }

    createUploadFileItemTemplate() {

        return ({
            fileName,
            action = "add",
            existingLabel = ""
        }) => {

            const contentType = this.getFileContentType(fileName);
            const captionArea = action === "add" ? this.createCaptionArea(contentType) : '';
            const label = action === "add" ? this.fileLabelPreviewHtml(contentType) : existingLabel;
            const downloadBtn = this.getPreviewDownloadBtnHtml();
            return `
            <div class="file-upload-item ${action}">
                <div class="file-item ${action}">
                        <div class="row">
                            <div class="col-5 file-name">${fileName}</div>
                            <div class="col-2 label">${label}</div>
                            <div class="col-2"></div>
                            <div class="col-2 file-actions-col">
                                ${downloadBtn}
                                <button class="icon-button remove_file" title="Remove">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                            <div class="col-1 ds-none"></div>
                        </div>
                        ${captionArea}
                </div>
            </div>`;
        };
    }

    createFileEntryTemplate() {
        const templates = {
            plosFileEntry: `
                <div class="supplementary-material" data-name="supplementary-material"
                    id="{{supp_id}}" xlink:href="{{xlinkHrefValue}}"
                    mimetype="{{mimetype}}" position="float" xlink:type="simple" data-file-type="new" data-db-id="{{db_id}}" data-file-sn="{{unique_name}}" data-file-on="{{org_name}}" data-time="{{time}}" data-username="{{user}}" data-rolename="{{role}}">
                    <span class="ext-link" data-name="ext-link" contenteditable="false" data-pi="PI" data-piinfo="{{pi_info}}"></span>
                    <div class="caption" data-name="caption" id="{{caption_id}}" data-label="{{label}}">
                        <div class="title" data-name="title" id="{{title_id}}">{{{title}}}</div>
                        {{#description}}<div class="p" data-name="p" id="{{desc_id}}">{{{description}}}</div>{{/description}}
                        <div class="p" data-name="p" id="{{ext_id}}">({{ext}})</div>
                    </div>
                </div>`,
            newClientFileEntry: `
                <span class="supplementary-material" data-name="supplementary-material"
                    content-type="data-supplement"  xlink:href="{{xlinkHrefValue}}" data-file-type="new" data-db-id="{{db_id}}" data-file-sn="{{unique_name}}" data-file-on="{{org_name}}" data-time="{{time}}" data-username="{{user}}" data-rolename="{{role}}"
                    mimetype="{{mimetype}}" id="{{supp_id}}" style="display:none;">
                    <span data-name="label" class="label" contenteditable="false">{{xlinkHrefValue}}</span>
                </span>`
        };

        // Choose template at render time so we can reuse a single renderer.
        return (params = {}) => {
            const template = params.isPlos ? templates.plosFileEntry : templates.newClientFileEntry;
            return Mustache.render(template, params);
        };
    }

    // Initialization methods

    initLoop() {
        this.reTryLoaderIncrement = 0;
        this.setupEventListeners();
        this.JsonLoader();
    }
    retryJsonLoader() {
        if (this.reTryLoaderIncrement >= 10) {
            return;
        }

        setTimeout(() => {
            this.reTryLoaderIncrement++;
            this.JsonLoader();
        }, 2500);
    }

    JsonLoader() {
        $.getJSON(`assets/${iVersion}/modules/supplementary_material/mimetype.json`)
            .done((config) => {
                this.mimeGroups = config;

                this.mimetypeList = Object.values(config).reduce((acc, group) => {
                    return Object.assign(acc, group);
                }, {});

                this.mimeGroupsLoaded = true;
            })
            .fail((jqXHR, textStatus, errorThrown) => {
                console.warn('Config load failed:', textStatus, errorThrown);
                this.retryJsonLoader();
            });
    }

    getFilesCount() {

        this.editorFilesList = this.globalDocBody && this.globalDocBody.querySelectorAll(".supplementary-material") || [];

        return this.editorFilesList.length;
    }

    initializeElements() {
        this.getFilesCount();

        this.elements.submitButton = this.Panel.querySelector(`[id="supply_submit"]`);
        this.elements.cancelButton = this.Panel.querySelector(`[id="cancel_suppl"]`);
        this.elements.queryResponse = this.Panel.querySelector(`[id="confirmationInput"]`);
        this.elements.fileInput = document.getElementById('fileUploadInputSupp');

        this.elements.submitButton.classList.remove('disabled');
        this.elements.submitButton.removeAttribute('disabled');
    }

    isPlosClient() {
        return commonMethods.getClientCode({
            format: "upper"
        }) == "PLOS";
    }

    isCrudFlow(queryElement) {
        return this.isPlosClient() && queryElement && queryElement.closest('[sec-type="supplementary-material"]');
    }

    setupEventListeners() {
        const {
            submitButton,
            cancelButton
        } = this.elements;

        // Click events
        $(document).on('click', '.replace_file, .delete_file, #add_files_suppl', this.handleFileAction.bind(this));
        $(document).on('click', '.download_preview_file', this.handlePreviewFileDownload.bind(this));
        $(document).on('click', '.remove_file', this.handlePreviewFileRemove.bind(this));
        $(document).on('click', '#cancel_suppl', () => this.Before_closeDialog(cancelButton));
        $(document).on('click', '#supply_submit', () => this.FIRE_SUBMIT(submitButton));

        // Change events
        $(document).on('change', '#fileUploadInputSupp', this.handleFileUpload.bind(this));
        $(document).on('change', '.file-type-select', this.handleFileTypeSelectChange.bind(this));

        // Input events
        $(document).on('input', '#confirmationInput', this.handleQueryInput.bind(this));
    }



    // Event Handlers
    /**
     * @private
     * @param {Event} event - File action event
     */

    async handleFileAction(event) {
        event.preventDefault();

        const {
            currentTarget
        } = event;

        var elClassList = currentTarget.classList;

        if (elClassList.contains("replace_file") || currentTarget.id.includes("add_files_suppl")) {
            this.initiateFileUpload(currentTarget);
        } else if (elClassList.contains("delete_file")) {
            await this.handleFileDeletion(currentTarget);
        }
    }

    initiateFileUpload(target) {
        const isReplaceEvt = target && target.classList.contains("replace_file");
        const parentEntry = target ? target.closest(".file-item") : null;

        if (isReplaceEvt && !parentEntry) return;

        function getText(entry, selector) {
            if (!entry) return "";
            const el = entry.querySelector(selector);
            return el ? el.textContent.trim() : "";
        }

        this._state.lastClickData = {
            action: isReplaceEvt ? "replace" : "add",
            ...(isReplaceEvt ? {
                target: target,
                existingFileId: (target && target.getAttribute("id")) || (parentEntry && parentEntry.id) || "",
                existingFileName: getText(parentEntry, ".file-name"),
                existingLabel: getText(parentEntry, ".label")
            } : {})
        };

        this.elements.fileInput.click();
    }

    async handleFileDeletion(target) {
        const result = await AlertNewDialog.fire('supply_Delete');
        if (result.isConfirmed) {
            const fileItem = target.closest(".file-item");
            fileItem.classList.add("item_deleted");
            await this.deleteSupplementaryFile(target.id);
            this.getFilesCount();
            this.refreshStagedAddLabelPreviews();
            this.refreshSuppFloatList();
        }
    }

    handlePreviewFileRemove(event) {
        event.preventDefault();
        const container = event.currentTarget.closest(".file-upload-item");
        const orgName = container.getAttribute('data-org-name');

        this._state.files = this._state.files.filter(f => f.orgname !== orgName);
        this.formData.files = this.formData.files.filter(f => f.name !== orgName);

        const captionEl = container.querySelector('.supp-caption-input');
        const remarkEl = container.querySelector('.supp-replace-remark-input');
        this.destroySummernoteOn(captionEl);
        this.destroySummernoteOn(remarkEl);

        container.remove();
        this.refreshStagedAddLabelPreviews();

        this.updateSubmitButtonState();
    }

    handlePreviewFileDownload(event) {
        event.preventDefault();

        const container = event.currentTarget.closest(".file-upload-item, .file-item.pending-replace");
        if (!container) return;

        const orgName = container.getAttribute('data-org-name');
        if (!orgName || !Array.isArray(this.formData.files)) return;

        const file = this.formData.files.find(f => f && f.name === orgName);
        if (!file) return;

        // Use the displayed file name (may differ from original for PLOS renaming).
        const nameEl = container.querySelector('.file-name');
        const downloadName = (orgName ? orgName : nameEl && nameEl.textContent ? nameEl.textContent : file.name).trim();

        const objectUrl = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = downloadName;
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();

        // Revoke after the click has a chance to start the download.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    }


    deleteSupplementaryFile(ID) {
        try {

            Array.from(this.globalDocBody.querySelectorAll(`[id='${ID}'], a[rid='${ID}']`)).forEach((element) => {
                let DELETE_DOM_ELEMENT = this.GetTemplate('default', {
                    tag: 'del',
                    frag: true
                }).firstChild;
                element.replaceWith(DELETE_DOM_ELEMENT);
                DELETE_DOM_ELEMENT.appendChild(element);
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('deleteSupplementaryFile', err.message);
        }
    }

    handleFileUpload(event) {
        const {
            fileInput
        } = this.elements;
        try {
            const file = event.target.files[0];
            const fileValidation = VALIDATE_UPLOAD_FILE(file, {
                limit: 100,
                show_alert: true
            });

            if (!fileValidation.VALID) {
                this._state.lastClickData = {};
                return;
            }

            this.handleValidFile(file, event);
            this.updateSubmitButtonState();

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('handleFileUpload', err.message);
        } finally {
            if (fileInput) fileInput.value = '';
        }
    }

    /**
     * Gets the file type from state for a given file
     * @param {File} file - The file object
     * @returns {string} The file type ("New" or "Replaced")
     */
    getFileTypeFromState(file) {
        const stateFile = this._state.files && this._state.files.find(f => f.orgname === file.name || f.fileName === file.name);
        return stateFile && stateFile.action === 'replace' ? 'Replaced' : 'New';
    }

    getPreviewDownloadBtnHtml() {
        return `<button class="icon-button download_preview_file" type="button" title="Download"><i class="fas fa-download"></i></button>`;
    }

    destroySummernoteOn(el) {
        if (el && el._summernoteInitTimer) {
            clearTimeout(el._summernoteInitTimer);
            el._summernoteInitTimer = null;
        }
        if (el && $(el).data('summernote')) {
            $(el).summernote('destroy');
        }
    }

    initSummernoteOn(el, {
        onBlur: extraOnBlur,
        onReady,
        placeholder,
        focus
    } = {}) {
        if (!el) return;
        this.setupSummerNote();
        const baseConfig = this.SUMMERNOTE_CONFIG || {};
        // Per-call callbacks so Caption vs Commands each close over their own `el`
        const callbacks = {
            ...(baseConfig.callbacks || {})
        };
        const baseOnInit = callbacks.onInit;
        const baseOnFocus = callbacks.onFocus;
        const baseOnPaste = callbacks.onPaste;
        if (this._summernote) this._summernote.bindTarget(el, {
            resetCache: true
        });

        const bindActiveNote = () => {
            if (this._summernote) this._summernote._activeNote = $(el);
        };

        callbacks.onInit = (...args) => {
            bindActiveNote();
            if (baseOnInit) baseOnInit(...args);
            if (typeof onReady === 'function') onReady(el);
        };

        callbacks.onFocus = (e) => {
            bindActiveNote();
            if (typeof baseOnFocus === 'function') baseOnFocus(e);
        };

        // Point shared manager at this field before pasteHTML so Caption/Commands do not cross-wire
        callbacks.onPaste = (e) => {
            bindActiveNote();
            if (typeof baseOnPaste === 'function') {
                baseOnPaste(e);
            } else if (this._summernote) {
                this._summernote.handlePaste(e);
            }
        };

        if (extraOnBlur) {
            const baseOnBlur = callbacks.onBlur;
            callbacks.onBlur = (e) => {
                if (baseOnBlur) baseOnBlur(e);
                extraOnBlur(e);
            };
        }

        if (el._summernoteInitTimer) {
            clearTimeout(el._summernoteInitTimer);
            el._summernoteInitTimer = null;
        }

        if (!document.body.contains(el)) return;

        if ($(el).data('summernote')) {
            if (typeof onReady === 'function') onReady(el);
            return;
        }

        if (this._summernote) this._summernote.bindTarget(el, {
            resetCache: true
        });
        const config = {
            ...baseConfig,
            callbacks
        };
        if (typeof focus === 'boolean') config.focus = focus;
        const ph = placeholder || el.getAttribute('placeholder');
        if (ph) config.placeholder = ph;
        $(el).summernote(config);
    }

    cleanSummernoteHtml(rawHtml = '') {
        let $temp = $('<div>').html(String(rawHtml).trim());
        $temp.find('p,div,span').each(function() {
            $(this).replaceWith($(this).html());
        });
        $temp.find('br').remove();
        return $temp.html().trim();
    }

    /**
     * Read Summernote HTML from a field; fall back to .note-editable / element HTML if code() is empty or throws.
     * @param {Element|null} el
     * @returns {string}
     */
    readSummernoteHtml(el) {
        if (!el) return '';
        try {
            if (this._summernote) this._summernote.bindTarget(el);
            let raw = '';
            try {
                if ($(el).data('summernote')) {
                    raw = ($(el).summernote('code') || '').trim();
                }
            } catch (_errCode) {
                raw = '';
            }
            if (!raw) {
                const editable = el.parentNode && el.parentNode.querySelector('.note-editable');
                raw = ((editable && editable.innerHTML) || el.innerHTML || '').trim();
            }
            return raw;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('readSummernoteHtml', err.message);
            return (el.innerHTML || '').trim();
        }
    }

    readSummernotePlainText(el) {
        return $('<div>').html(this.readSummernoteHtml(el)).text().trim();
    }

    focusSummernoteEditable(el) {
        if (!el || !el.parentNode) return;
        const editable = el.parentNode.querySelector('.note-editable');
        if (editable && editable.focus) editable.focus();
    }

    /**
     * Match staged ADD panel row to `_state.files` entry.
     * @param {Element} item - `.file-upload-item.add`
     * @returns {Object|null}
     */
    resolveAddStateFile(item) {
        if (!item || !this._state.files) return null;
        const orgName = item.getAttribute('data-org-name') || '';
        let stateFile = this._state.files.find(f => f.action === 'add' && f.orgname === orgName);
        if (stateFile) return stateFile;

        const nameEl = item.querySelector('.file-name');
        const visibleName = nameEl ? nameEl.textContent.trim() : '';
        if (visibleName) {
            stateFile = this._state.files.find(f =>
                f.action === 'add' && (f.fileName === visibleName || f.orgname === visibleName)
            );
            if (stateFile) return stateFile;
        }

        const addFiles = this._state.files.filter(f => f.action === 'add');
        if (addFiles.length === 1) return addFiles[0];
        return null;
    }

    /**
     * Resolve supplementary-material element by id (CKEditor getById, then DOM query).
     * @param {string} elmId
     * @returns {Element|null}
     */
    resolveSuppElementById(elmId) {
        if (!elmId) return null;
        try {
            if (typeof GlobalEditor !== 'undefined' && GlobalEditor.document && GlobalEditor.document.getById) {
                const ckEl = GlobalEditor.document.getById(elmId);
                if (ckEl && ckEl.$) return ckEl.$;
            }
        } catch (_errCk) {
            /* fall through */
        }

        const root = this.globalDocBody || document;
        try {
            const escaped = (typeof CSS !== 'undefined' && CSS.escape) ?
                CSS.escape(elmId) :
                String(elmId).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return root.querySelector(`#${escaped}`) || root.querySelector(`[id="${escaped}"]`);
        } catch (_errQs) {
            return root.querySelector(`[id='${elmId}']`);
        }
    }

    /**
     * Last-chance remark HTML from the dialog panel for a state file.
     * @param {Object} file
     * @returns {string}
     */
    readRemarkFromPanelForFile(file) {
        if (!file || !this.Panel) return '';
        try {
            if (file.action === 'add') {
                const items = this.Panel.querySelectorAll('.file-upload-item.add') || [];
                for (const item of Array.from(items)) {
                    const matched = this.resolveAddStateFile(item);
                    const orgMatch = file.orgname && item.getAttribute('data-org-name') === file.orgname;
                    if (matched !== file && !orgMatch) continue;
                    const remark = item.querySelector('.supp-replace-remark-input');
                    if (!remark) continue;
                    return this.cleanSummernoteHtml(this.readSummernoteHtml(remark));
                }
            } else if (file.action === 'replace' && file.existingFileId) {
                const pending = Array.from(this.Panel.querySelectorAll('.file-item.pending-replace') || []);
                const item = pending.find(el => {
                    if (el.id === file.existingFileId) return true;
                    const box = el.querySelector('.replace-remark-item');
                    return box && box.getAttribute('data-existing-file-id') === file.existingFileId;
                });
                if (item) {
                    const remark = item.querySelector('.supp-replace-remark-input');
                    if (remark) return this.cleanSummernoteHtml(this.readSummernoteHtml(remark));
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('readRemarkFromPanelForFile', err.message);
        }
        return '';
    }

    removeReplaceRemarkArea(parent) {
        if (!parent) return;
        const existing = parent.querySelector('.replace-remark-item');
        if (!existing) return;
        const remarkEl = existing.querySelector('.supp-replace-remark-input');
        this.destroySummernoteOn(remarkEl);
        existing.remove();
    }

    injectReplaceRemarkArea(parent, existingFileId) {
        if (!parent || !existingFileId) return null;

        this.removeReplaceRemarkArea(parent);

        const suppEl = this.globalDocBody && this.globalDocBody.querySelector(`[id='${existingFileId}']`);
        const remarks = this.collectReplaceRemarkCommands(suppEl);
        const sameUserRemark = remarks.find(r => r.isCurrentUser) || null;
        const otherRemarksHtml = remarks
            .filter(r => !r.isCurrentUser)
            .map(r => this.templates.queryContent({
                label: this.formatReplaceRemarkLabel(r),
                content: r.content
            }))
            .join('');

        parent.insertAdjacentHTML('beforeend', this.createReplaceRemarkArea(existingFileId, {
            existingCommentId: sameUserRemark ? sameUserRemark.outerId : '',
            priorRemarksHtml: otherRemarksHtml,
            label: this.EDITOR_REMARK_LABEL
        }));

        const remarkItem = parent.querySelector('.replace-remark-item');
        const remarkEl = parent.querySelector('.supp-replace-remark-input');
        this.initSummernoteOn(remarkEl, {
            onBlur: () => this.syncReplaceRemarks(),
            onReady: () => {
                if (sameUserRemark && sameUserRemark.content && remarkEl) {
                    try {
                        if (this._summernote) this._summernote.bindTarget(remarkEl);
                        $(remarkEl).summernote('code', sameUserRemark.content);
                    } catch (_err) {
                        remarkEl.innerHTML = sameUserRemark.content;
                    }
                }

                const editable = parent.querySelector('.replace-remark-item .note-editable');
                if (editable) editable.focus();
            }
        });

        if (sameUserRemark && sameUserRemark.content && remarkEl) {
            if (remarkItem) {
                remarkItem.setAttribute('data-prior-remark', sameUserRemark.content);
            }
        }

        return {
            existingCommentId: sameUserRemark ? sameUserRemark.outerId : '',
            priorRemark: sameUserRemark ? sameUserRemark.content : ''
        };
    }

    handleValidFile(file, event) {

        const {
            lastClickData
        } = this._state;
        const {
            action,
            existingFileName,
            existingFileId,
            existingLabel,
            target
        } = lastClickData;
        const parent = target ? target.closest(".file-item") : null;

        const orgFileName = file.name;
        const filename = existingFileName || this.handleFileNamingConversion(orgFileName);
        const isReplaceEvt = action === "replace";

        this._state.files = this._state.files || [];
        if (!this.formData.files) this.formData.files = [];

        if (isReplaceEvt) {
            // If same existingFileId was replaced before, evict the stale entry
            const prevIdx = this._state.files.findIndex(f => f.action === 'replace' && f.existingFileId === existingFileId);
            if (prevIdx !== -1) {
                const prevOrgname = this._state.files[prevIdx].orgname;
                this.formData.files = this.formData.files.filter(f => f.name !== prevOrgname);
                this._state.files.splice(prevIdx, 1);
            }
            this.formData.files.push(file);

            // Retain existing panel entry — mark it in-place, no new row added
            if (parent) {
                const downloadEl = parent.querySelector('.download_file, .download_preview_file');
                const nameEl = parent.querySelector('.file-name');

                parent.setAttribute('data-org-name', orgFileName);
                parent.classList.add('pending-replace');

                if (nameEl && orgFileName) {
                    const currentName = nameEl.textContent.trim();
                    const orgExt = orgFileName.split('.').pop().toLowerCase();
                    const currentExt = currentName.split('.').pop().toLowerCase();
                    if (currentExt !== orgExt) {
                        const baseName = currentName.split('.').slice(0, -1).join('.') || currentName;
                        nameEl.textContent = baseName + '.' + orgExt;
                    }
                }

                if (downloadEl) {
                    downloadEl.insertAdjacentHTML('beforebegin', this.getPreviewDownloadBtnHtml());
                    downloadEl.remove();
                }

                const remarkMeta = this.injectReplaceRemarkArea(parent, existingFileId) || {};
                this._state.lastFileData = {
                    orgname: orgFileName,
                    fileName: filename,
                    action: 'replace',
                    existingFileId,
                    existingFileName,
                    existingLabel,
                    existingCommentId: remarkMeta.existingCommentId || '',
                    priorRemark: remarkMeta.priorRemark || ''
                };
                this._state.files.push(this._state.lastFileData);

                this.recordAttachmentsFlow({
                    filename: orgFileName,
                    oldfilename: existingFileName || '',
                    action: 'replace_selected',
                    dialog_name: 'supplementary_material'
                });
                return;
            }

            this._state.lastFileData = {
                orgname: orgFileName,
                fileName: filename,
                action: 'replace',
                existingFileId,
                existingFileName,
                existingLabel
            };
            this._state.files.push(this._state.lastFileData);

            this.recordAttachmentsFlow({
                filename: orgFileName,
                oldfilename: existingFileName || '',
                action: 'replace_selected',
                dialog_name: 'supplementary_material'
            });
            return;
        }

        this.formData.files.push(file);

        // "add" path — create new panel row
        const newElement = this.templates.uploadFileItem({
            fileName: filename,
            action: 'add'
        });
        const newElementFragment = this.GetFragment(newElement);
        newElementFragment.firstElementChild.setAttribute('data-org-name', orgFileName);

        this._state.lastFileData = {
            orgname: orgFileName,
            fileName: filename,
            action: 'add',
            fragment: newElementFragment
        };
        this._state.files.push(this._state.lastFileData);

        this.recordAttachmentsFlow({
            filename: orgFileName,
            action: 'insert_selected',
            dialog_name: 'supplementary_material'
        });

        this.PanelListUpdates(this._state.lastFileData);
    }

    parsedFileNamesData(existingNames) {
        return existingNames
            .map(f => {
                const match = f.match(/^(.*)\.s(\d+)\.(\w+)$/);
                // ignore non-matching
                if (!match) return null;
                return {
                    // "pgen.1011685"
                    prefix: match[1],
                    // numeric sequence
                    seq: match[2],
                    // "tif", "xlsx", "mp4"
                    ext: match[3]
                };
            })
            // remove null entries
            .filter(Boolean);
    }


    handleFileNamingConversion(fileName) {
        var isPlos = this.isPlosClient();
        if (isPlos) {
            var existingNames = this.getActiveSupplementaryFileNames();
            var parsedData = this.parsedFileNamesData(existingNames);
            if (!parsedData.length) return fileName;
            var commonPrefix = parsedData[0].prefix;
            const nextSeq = this.getMaxNumber(existingNames) + 1;
            const padded = nextSeq.toString().padStart(3, '0');
            const ext = fileName.split('.').pop();
            return `${commonPrefix}.s${padded}.${ext}`;
        }
        // Add logic for file naming conversion based on PLOS client
        return fileName;
    }

    /**
     * Active supplementary file names: non-deleted editor files plus staged add rows.
     * @returns {string[]} Array of file names
     */
    getActiveSupplementaryFileNames() {
        const editorNames = Array.from(this.editorFilesList || [])
            .filter(f => f && !f.closest('del'))
            .map(f => f.getAttribute('xlink:href'))
            .filter(Boolean);

        const stagedNames = (this._state.files || [])
            .filter(f => f && f.action === 'add' && f.fileName)
            .map(f => f.fileName);

        return [...editorNames, ...stagedNames];
    }

    /**
     * Gets the list of existing supplementary file names
     * @returns {string[]} Array of file names
     */
    getExistingFileNames() {
        return this.getActiveSupplementaryFileNames();
    }

    /**
     * Gets the maximum number from existing file names in the pattern .sXXX.
     * @param {string[]} names - Array of file names
     * @returns {number} Maximum number found, or 0 if none
     */
    getMaxNumber(names) {
        const nums = names.map(name => {
            const match = name.match(/\.s(\d+)\./);
            return match ? parseInt(match[1], 10) : 0;
        });
        return nums.length > 0 ? Math.max(...nums) : 0;
    }



    /**
     * Updates UI based on file type
     * @param {File} file - Uploaded file
     * @param {Event} event - Upload event
     */

    PanelListUpdates(fileObject = {}) {
        const parentElement = this.Panel.querySelector(".file-list");
        if (!fileObject.fragment) return;

        const newFileElement = fileObject.fragment.cloneNode(true);
        const itemElement = newFileElement.firstElementChild;

        parentElement.append(newFileElement);

        if (itemElement) {
            itemElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });

            const focusCaptionEditable = () => {
                const captionEditable = itemElement.querySelector('#caption_group .note-editable');
                if (captionEditable) {
                    captionEditable.focus();
                    return true;
                }
                const select = itemElement.querySelector('.file-type-select');
                if (select) {
                    select.focus();
                    return true;
                }
                return false;
            };

            // Init remarks first without stealing focus; caption init last + re-assert focus
            const remarkEl = itemElement.querySelector('.supp-replace-remark-input');
            if (remarkEl) {
                this.initSummernoteOn(remarkEl, {
                    focus: false,
                    onBlur: () => this.syncReplaceRemarks()
                });
            }

            const captionEl = itemElement.querySelector('.supp-caption-input');
            if (captionEl) {
                this.initSummernoteOn(captionEl, {
                    focus: false,
                    onReady: () => {
                        focusCaptionEditable();
                        setTimeout(() => focusCaptionEditable(), 50);
                    }
                });
            } else {
                const select = itemElement.querySelector('.file-type-select');
                if (select) select.focus();
            }

            this.refreshStagedAddLabelPreviews();
        }
    }

    handleFileTypeSelectChange(event) {
        const select = event.target;
        select.classList.remove('highlight');
        this.refreshStagedAddLabelPreviews();
    }

    /**
     * Next S{n} for a category. Counts editor files plus staged add rows of the same type.
     * @param {string} category
     * @param {{ forItem?: Element|null, ignoreStaged?: boolean }} [options]
     */
    getNextLabelNumber(category, {
        forItem = null,
        ignoreStaged = false
    } = {}) {
        if (!category) return 1;

        const numbers = Array.from(this.editorFilesList || [])
            .filter(f => f && !f.closest('del'))
            .map(f => this.extractFileData(f).labelPattern)
            .filter(p => p && p.category.toLowerCase() === category.toLowerCase())
            .map(p => p.number);
        const editorMax = numbers.length > 0 ? Math.max(...numbers) : 0;

        if (ignoreStaged) {
            return editorMax + 1;
        }

        const fileList = this.Panel && this.Panel.querySelector('.file-list');
        const stagedSame = [];
        if (fileList) {
            Array.from(fileList.querySelectorAll('.file-upload-item.add')).forEach(item => {
                const select = item.querySelector('.file-type-select');
                const val = select && select.value;
                if (val && val.toLowerCase() === category.toLowerCase()) {
                    stagedSame.push(item);
                }
            });
        }

        if (forItem) {
            const uploadItem = forItem.closest ? (forItem.closest('.file-upload-item.add') || forItem) : forItem;
            const idx = stagedSame.indexOf(uploadItem);
            if (idx === -1) return editorMax + stagedSame.length + 1;
            return editorMax + idx + 1;
        }

        return editorMax + stagedSame.length + 1;
    }

    refreshStagedAddLabelPreviews() {
        const fileList = this.Panel && this.Panel.querySelector('.file-list');
        if (!fileList) return;

        Array.from(fileList.querySelectorAll('.file-upload-item.add')).forEach(item => {
            const select = item.querySelector('.file-type-select');
            const preview = item.querySelector('.file-label-preview');
            if (!select || !preview) return;
            const category = select.value;
            preview.textContent = category ?
                `S${this.getNextLabelNumber(category, { forItem: item })} ${category}.` :
                '';
        });
    }


    /**
     * Updates the file list in the UI
     * @param {string} html - HTML string to update
     */
    updateFileList({
        force = false,
        reset = false
    } = {}) {
        try {
            const fileList = this.Panel.querySelector(".file-list");

            if (reset) {
                fileList.innerHTML = "";
                return;
            }

            const htmlContent = (this.filesExtractData || [])
                .map(item => item.dialogHtml)
                .join("");

            if (force || fileList.innerHTML !== htmlContent) {
                fileList.innerHTML = htmlContent;
            }
        } catch (error) {
            this.handleError("updateFileList", error);
        }
    }



    /**
     * Toggles visibility of the supplementary query div
     * @param {boolean} show - Whether to show or hide the div
     */
    toggleQueryDiv(show = false, showInput = false, hideAddNewItem = false) {

        try {
            var querySection = this.Panel.querySelector('.supp_query_section');

            if (querySection) {
                querySection.classList[show ? 'remove' : 'add']('ds-none');
                if (showInput) {
                    this.elements.queryResponse.focus();
                }
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('toggleQueryDiv', err.message);
        }
    }

    /**
     * Updates the query content in the UI
     * @param {string} html - HTML string to update
     */
    updateQueryContent(html) {
        const queryContent = this.Panel.querySelector(".Query_Contents");
        queryContent.innerHTML = html;
    }

    // Error handling
    handleError(context, error) {
        console.error(`Error in ${context}:`, error);
        ErrorLogTrace(context, error.message);
    }

    // Cleanup methods
    resetState() {
        this.elements.queryResponse.value = "";
        this.formData.files = [];
        this._state.files = [];
        this._state.lastClickData = {};
        this._state.lastFileData = null;
        this.updateFileList({
            reset: true
        });
        this.toggleQueryDiv();
        this.updateQueryContent('');
    }

    Before_closeDialog() {
        try {
            console.log("CLOSED DIALOG");
            let checkInput = this.elements.queryResponse;
            if (this.formData.files.length > 0) {
                this.closeWithConfirmation();
            } else {
                checkInput.classList.contains("highlight") ? checkInput.classList.remove('highlight') : null;
                return true;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Before_closeDialog', err.message);
        }
    }

    /**
     * @public
     * @returns {Promise<boolean>} Whether close was successful
     */
    async closeWithConfirmation() {
        if (this.formData.files.length > 0) {
            const result = await AlertNewDialog.fire('suppl_close_dialog');
            if (result.isConfirmed) {
                this.resetState();
                this.closeDialog();
                return true;
            }
            return false;
        }

        return true;
    }

    /**
     * Generates the list of supplementary files HTML
     * @returns {Array<string>} Array of HTML strings for each supplementary file
     */
    generateFilesList({
        mode = 'dialog'
    } = {}) {
        try {
            this.getFilesCount();

            const entries = [];
            for (const file of this.editorFilesList) {
                const fileData = this.extractFileData(file);
                if (!fileData && fileData.link || fileData.isSubArticleItem || fileData.isDeleted) continue;

                entries.push({
                    meta: fileData,
                    dialogHtml: this.generateFileItemHtml(fileData),
                    tocHtml: this.createTOCItemTemplate(fileData)
                });
            }

            this.filesExtractData = entries;

            if (mode === 'toc') {
                this.renderSuppFloatList(entries);
                return entries.map(entry => entry.tocHtml);
            }

            if (mode === 'both') {
                this.renderSuppFloatList(entries);
                return {
                    dialog: entries.map(entry => entry.dialogHtml),
                    toc: entries.map(entry => entry.tocHtml)
                };
            }

            return entries.map(entry => entry.dialogHtml);
        } catch (error) {
            this.handleError('generateFilesList', error);
            this.filesExtractData = [];
            return mode === 'both' ? {
                dialog: [],
                toc: []
            } : [];
        }
    }


    /**
     * Extracts relevant data from a file element
     * @param {Element} file - The file DOM element
     * @returns {Object} Extracted file data
     */
    extractFileData(file) {


        // Store selectors in variables to avoid redundant DOM queries
        const dataLabelElement = file.querySelector("[data-label]");
        const labelElement = file.querySelector(".label");
        const captionElement = file.querySelector(".caption[data-label]") || file.querySelector(".caption");

        // Determine file name with proper fallback handling
        const fileName = dataLabelElement ?
            dataLabelElement.getAttribute("data-label") :
            labelElement ?
            labelElement.textContent.trim() :
            "";

        const titleEl = captionElement && captionElement.querySelector('.title');
        const label = fileName;
        const captionText = titleEl ?
            (typeof getWords === 'function' && typeof getTxt === 'function' ?
                getWords(getTxt(titleEl)) :
                titleEl.textContent.trim()) :
            '';
        // Get attributes with fallback values
        const fileLink = file.getAttribute("xlink:href") || "";
        const displayText = (this.isPlosClient() ?
            `${label} ${captionText} ${fileLink}` :
            `${label} ${captionText}`
        ).trim().replace(/\s+/g, ' ') || 'No caption available';
        const navId = (titleEl && titleEl.id) ||
            (captionElement && captionElement.id) ||
            file.id;

        const fileType = file.hasAttribute("data-file-type") ? file.getAttribute("data-file-type") : "";
        const fileSN = file.hasAttribute("data-file-sn") ? file.getAttribute("data-file-sn") : fileLink;

        // Map file type to corresponding paths
        const fileTypeMapping = {
            new: "/New",
            replaced: "/Replaced"
        };

        const labelMatch = (fileName || '').match(/^S(\d+)\s+(\w+)\.?$/i);
        const labelPattern = labelMatch ? {
                number: parseInt(labelMatch[1], 10),
                category: labelMatch[2]
            } :
            null;
        const isSubArticleItem = Boolean(file.closest(".sub-article"));
        return {
            id: file.id,
            name: fileName,
            label,
            caption: captionText,
            displayText,
            navId,
            link: fileLink,
            type: fileTypeMapping[fileType] || "",
            sn: fileSN,
            isDeleted: file.closest("del") ? true : false,
            labelPattern,
            isSubArticleItem,
            captionElement
        };
    }

    handleQueryInput(event) {
        this.elements.queryResponse.classList.remove('highlight');
        this.updateSubmitButtonState();
    }

    syncReplaceRemarks() {
        const panel = this.Panel;
        if (!panel) return;

        const replaceItems = panel.querySelectorAll('.file-item.pending-replace') || [];
        Array.from(replaceItems).forEach(item => {
            const remarkContainer = item.querySelector('.replace-remark-item');
            const existingFileId = (remarkContainer && remarkContainer.getAttribute('data-existing-file-id')) || item.id;
            const remark = item.querySelector('.supp-replace-remark-input');
            const stateFile = this._state.files && this._state.files.find(f => f.action === 'replace' && f.existingFileId === existingFileId);
            if (!stateFile || !remark) return;

            stateFile.remark = this.cleanSummernoteHtml(this.readSummernoteHtml(remark));
            if (remarkContainer) {
                stateFile.existingCommentId = remarkContainer.getAttribute('data-existing-comment-id') || stateFile.existingCommentId || '';
                stateFile.priorRemark = remarkContainer.getAttribute('data-prior-remark') || stateFile.priorRemark || '';
            }
        });

        const addItems = panel.querySelectorAll('.file-upload-item.add') || [];
        Array.from(addItems).forEach(item => {
            const stateFile = this.resolveAddStateFile(item);
            const remark = item.querySelector('.supp-replace-remark-input');
            if (!stateFile || !remark) return;

            stateFile.remark = this.cleanSummernoteHtml(this.readSummernoteHtml(remark));
        });
    }

    syncFileTypeSelections() {
        const fileList = this.Panel && this.Panel.querySelector('.file-list');
        if (!fileList) return;
        var listOfItems = fileList.querySelectorAll('.file-upload-item.add') || [];

        Array.from(listOfItems).forEach(item => {
            const stateFile = this.resolveAddStateFile(item) || this._state.files.find(f => f.orgname === item.getAttribute('data-org-name'));
            if (stateFile) {
                const isReplaced = stateFile.action === 'replace';
                if (!isReplaced) {
                    const select = item.querySelector('.file-type-select');
                    const caption = item.querySelector('.supp-caption-input');
                    const preview = item.querySelector('.file-label-preview');
                    if (select) {
                        stateFile.labelType = select.value;
                        stateFile.labelPreview = preview ? preview.textContent.trim() : '';
                        if (caption) {
                            stateFile.caption = this.cleanSummernoteHtml(this.readSummernoteHtml(caption));
                        } else {
                            stateFile.caption = '';
                        }
                    }
                }
            }
        });

        this.syncReplaceRemarks();
    }



    /**
     * Trims content before a specific keyword
     * @param {string} content - Original content string
     * @param {string} keyword - Keyword to trim before
     * @returns {string} Trimmed content string
     */
    trimBefore(content, keyword) {
        try {
            const index = content.indexOf(keyword);
            return index === -1 ? content : content.substring(index);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('trimBefore', err.message);
        }
    }

    /**
     * Generates HTML for a single file item
     * @param {Object} fileData - File data object
     * @returns {string} Generated HTML string
     */
    generateFileItemHtml(fileData) {
        const downloadUrl = this.constructDownloadUrl(fileData.sn, fileData.link, fileData.type);
        const transformString = (input) => input.startsWith('/') ? input.slice(1).toLowerCase() : input.toLowerCase();

        return this.templates.existsItem({
            fileId: fileData.id,
            fileName: this.trimBefore(fileData.link, "Supplementary"),
            downloadUrl: downloadUrl,
            orgName: fileData.link,
            deleteId: fileData.isDeleted ? "item_deleted" : "",
            type: transformString(fileData.type),
            label: fileData.name
        });
    }

    /**
     * Constructs download URL for a file
     * @param {string} fileSN - File serial number
     * @param {string} fileLink - File link
     * @returns {string} Constructed download URL
     */
    constructDownloadUrl(fileSN, fileLink, filetype) {
        var folder = `${DOC_ID}/suppl_data/`;
        const params = new URLSearchParams({
            appkey: 'xmleditor',
            file_sn: fileSN,
            docid: folder,
            file_on: fileLink
        });


        const params1 = `appkey=xmleditor&file_sn=${encodeURIComponent(fileSN)}&docid=${folder}&file_on=${encodeURIComponent(fileLink)}`.replace(/%2F/g, '/');
        debug.log(params.toString(), params1);

        return `${API_PATH}filedownload?${params1}`;

    }

    /**
     * Generates query tags HTML
     * @param {Element} queryElement - The query container element
     * @returns {Array<string>} Array of HTML strings for each query tag
     */
    generateQueryTags(queryElement) {
        try {
            const queryTags = [];
            const queryComments = queryElement.querySelectorAll('[data-user-comment-box]');

            queryComments.forEach(comment => {
                const commentData = this.processQueryComment(comment);

                if (commentData.isCurrentUser) {
                    this.updateUserCommentInput(commentData);
                } else {
                    const queryHtml = this.generateQueryTagHtml(commentData);
                    queryTags.push(queryHtml);
                }
            });

            return queryTags;
        } catch (error) {
            this.handleError('generateQueryTags', error);
            return [];
        }
    }

    /**
     * Processes a single query comment element
     * @param {Element} comment - Query comment element
     * @returns {Object} Processed comment data
     */
    processQueryComment(comment) {
        let {
            role,
            name,
            userCommentBox
        } = comment.dataset;
        return {
            isCurrentUser: commonMethods.IS_SAME_USER_AND_ROLE(comment),
            content: userCommentBox || "",
            label: name === "AQ" ? comment.parentElement.dataset.label : (role + name),
            role: role,
            name: name
        };
    }

    /**
     * Generates HTML for a single query tag
     * @param {Object} commentData - Comment data object
     * @returns {string} Generated HTML string
     */
    generateQueryTagHtml(commentData) {
        return this.templates.queryContent({
            label: commentData.label,
            content: commentData.content
        });
    }

    /**
     * Updates input field for user's own comment
     * @param {Object} commentData - Comment data object
     */
    updateUserCommentInput(commentData) {
        const queryInput = this.elements.queryResponse;
        queryInput.setAttribute("edit", commentData.role);
        queryInput.value = commentData.content;
    }

    handleFileReplacement(file, inputElement) {
        const elementId = this.Panel.querySelector(
            `[supporgname="${inputElement.getAttribute("supporgname")}"]`
        ).getAttribute("id");

        // Use uploadFileItem template for replacement
        const replacementHtml = this.templates.uploadFileItem({
            fileName: file.name
        });

        const fileList = this.Panel.querySelector(".file-list");
        const existingElement = fileList.querySelector(`[id='${elementId}']`);

        if (existingElement) {
            existingElement.insertAdjacentHTML('afterend', replacementHtml);
            existingElement.remove();
        }

        file.elmId = elementId;
    }

    // Helper methods
    updateFormData(file, inputElement) {
        if (!this.formData.files) {
            this.formData.files = [];
        }

        const isReplacement = inputElement.getAttribute("supporgname") !== "null";
        // file.action_type = isReplacement ? "Replaced" : "New";

        if (isReplacement) {
            const tempId = inputElement.getAttribute("supporgname");
            this.Panel.querySelector(`[supporgname="${tempId}"]`)
                .setAttribute("ifile_name", file.name);
        }

        this.formData.files.push(file);
    }

    setupUserComment(element) {
        const queryInput = this.elements.queryResponse;
        queryInput.setAttribute("edit", element.dataset.role);
        queryInput.value = element.getAttribute("data-user-comment-box");
    }

    updateSubmitButtonState() {
        this.elements.submitButton.classList.remove('disabled');
        this.elements.submitButton.removeAttribute('disabled');
    }

    flashHighlight(el, after) {
        el.classList.add('highlight');
        if (el.focus) el.focus();
        setTimeout(() => {
            el.classList.remove('highlight');
            if (after) after();
        }, 3000);
    }

    feedbackHighlight(field, warningHtml) {
        if (!field || !field.parentNode) return;

        let feedback = field.parentNode.querySelector('.invalid-feedback-show');

        if (!feedback) {
            field.parentNode.insertAdjacentHTML('beforeend', warningHtml || this.invalidWarning());
            feedback = field.parentNode.querySelector('.invalid-feedback-show');
            if (feedback) {
                feedback.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }
    }


    validateSubmit() {
        try {
            const hasValue = this.elements.queryResponse.value.trim().length > 0;
            const hasFiles = this.formData.files.length > 0;

            if (!this.query_workflow && !hasFiles) {
                const fileList = this.Panel.querySelector('.file-list');
                if (fileList) this.flashHighlight(fileList);
                return false;
            }

            if (this.query_workflow && !hasValue) {
                this.flashHighlight(this.elements.queryResponse);
                return false;
            }

            for (const item of this.Panel.querySelectorAll('.file-upload-item.add')) {

                const select = item.querySelector('.file-type-select');
                const caption = item.querySelector('.supp-caption-input');

                if (select && !select.value) {
                    this.flashHighlight(select);
                    this.feedbackHighlight(caption);
                    return false;
                }

                const captionText = this.readSummernotePlainText(caption);
                const feedback = () => caption && caption.parentNode && caption.parentNode.querySelector('.invalid-feedback-show');

                if (caption && captionText.length < 5) {
                    if (!feedback()) {
                        this.feedbackHighlight(caption);
                    }

                    this.flashHighlight(caption, () => {
                        if (feedback()) feedback().remove();
                    });
                    this.focusSummernoteEditable(caption);
                    return false;
                }

                if (caption) {
                    caption.classList.remove('highlight');
                    if (feedback()) feedback().remove();
                }

                const remark = item.querySelector('.supp-replace-remark-input');
                const remarkText = this.readSummernotePlainText(remark);
                const remarkFeedback = () => remark && remark.parentNode && remark.parentNode.querySelector('.invalid-feedback-show');

                if (!remark || remarkText.length < 5) {
                    if (!remarkFeedback()) {
                        this.feedbackHighlight(remark, this.invalidEditorMessageWarning());
                    }
                    this.flashHighlight(remark, () => {
                        if (remarkFeedback()) remarkFeedback().remove();
                    });
                    this.focusSummernoteEditable(remark);
                    return false;
                }

                if (remark) {
                    remark.classList.remove('highlight');
                    if (remarkFeedback()) remarkFeedback().remove();
                }
            }

            for (const item of this.Panel.querySelectorAll('.file-item.pending-replace')) {
                const remark = item.querySelector('.supp-replace-remark-input');
                const remarkText = this.readSummernotePlainText(remark);
                const remarkFeedback = () => remark && remark.parentNode && remark.parentNode.querySelector('.invalid-feedback-show');

                if (!remark || remarkText.length < 5) {
                    if (!remarkFeedback()) {
                        this.feedbackHighlight(remark, this.invalidReplaceWarning());
                    }
                    this.flashHighlight(remark, () => {
                        if (remarkFeedback()) remarkFeedback().remove();
                    });
                    this.focusSummernoteEditable(remark);
                    return false;
                }

                if (remark) {
                    remark.classList.remove('highlight');
                    if (remarkFeedback()) remarkFeedback().remove();
                }
            }

            return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('validateSubmit', err.message);
            return false;
        }
    }

    updateExistsData() {
        const splitAttribute = (element, attrName) => {
            if (!element.hasAttribute(attrName)) return [];
            return element.getAttribute(attrName)
                .split("||")
                .map(value => value.trim())
                .filter(Boolean);
        };

        let data = {
            _id: "",
            file_sn: [],
            file_on: [],
            // action_type: [],
            ext: []
        };

        if (!this.current_query || !this.current_query.lastElementChild) return data;

        const last = this.current_query.lastElementChild;
        const isSameUser = commonMethods.IS_SAME_USER_AND_ROLE(last);
        const IsExistsAttach = last.getAttribute('data-db-id') || "";

        if (!isSameUser) return data;
        if (last.nodeType && last.nodeType == 1 && IsExistsAttach) {
            data._id = IsExistsAttach;
            data.file_sn = splitAttribute(last, 'data-file-sn');
            data.file_on = splitAttribute(last, 'data-file-on');
            // data.action_type = splitAttribute(last, 'data-folder-name');
            data.ext = data.file_on.map((_name) => commonMethods.Get_File_Extension(_name)).filter(Boolean);
        }

        return data;
    }

    getCurrentReplaceFileOnSet() {
        const replaceFileOnSet = new Set();
        try {
            const files = (this._state && this._state.files) || [];
            if (!Array.isArray(files) || !this.globalDocBody) return replaceFileOnSet;

            files.forEach(file => {
                if (!file || file.action !== 'replace' || !file.existingFileId) return;
                const suppEl = this.globalDocBody.querySelector(`[id='${file.existingFileId}']`);
                if (!suppEl) return;
                const existingFileOn = suppEl.getAttribute('data-file-on') || suppEl.getAttribute('xlink:href');
                const existingFileSn = suppEl.getAttribute('data-file-sn') || '';
                if (existingFileOn) replaceFileOnSet.add(existingFileOn);
                if (existingFileSn) replaceFileOnSet.add(existingFileSn);
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getCurrentReplaceFileOnSet', err.message);
        }
        return replaceFileOnSet;
    }

    filterExistingFilesForCurrentReplace(existingFiles = {}) {
        const data = {
            _id: existingFiles._id || '',
            file_sn: Array.isArray(existingFiles.file_sn) ? [...existingFiles.file_sn] : [],
            file_on: Array.isArray(existingFiles.file_on) ? [...existingFiles.file_on] : [],
            ext: Array.isArray(existingFiles.ext) ? [...existingFiles.ext] : []
        };

        const replaceKeys = this.getCurrentReplaceFileOnSet();
        if (!replaceKeys.size) return data;

        const keepIndices = data.file_on
            .map((fileOn, index) => {
                const fileSn = data.file_sn[index] || '';
                return (replaceKeys.has(fileOn) || (fileSn && replaceKeys.has(fileSn))) ? -1 : index;
            })
            .filter(index => index !== -1);

        data.file_on = keepIndices.map(index => data.file_on[index]).filter(Boolean);
        data.file_sn = keepIndices.map(index => data.file_sn[index]).filter(Boolean);
        data.ext = keepIndices.map(index => data.ext[index]).filter(Boolean);

        return data;
    }

    /**
     * Collect existing editor supplementary files with data-db-id for upload params.
     * Used for both new insert and replace so the API can update the existing DB record.
     * @returns {{_id: string, file_sn: string[], file_on: string[], ext: string[]}}
     */
    collectExistingSuppDbPayload() {
        const data = {
            _id: '',
            file_sn: [],
            file_on: [],
            ext: []
        };
        try {
            if (!this.editorFilesList || !this.editorFilesList.length) this.getFilesCount();
            const filesArr = Array.from(this.editorFilesList || []);
            let replaceTargetDbId = '';

            const stateFiles = (this._state && this._state.files) || [];
            for (const file of stateFiles) {
                if (!file || file.action !== 'replace' || !file.existingFileId) continue;
                const replaceEl = this.globalDocBody && this.globalDocBody.querySelector(`[id='${file.existingFileId}']`);
                const replaceDbId = replaceEl && replaceEl.getAttribute('data-db-id');
                if (replaceDbId) {
                    replaceTargetDbId = replaceDbId;
                    break;
                }
            }

            filesArr.forEach(elm => {
                if (!elm || elm.closest('del')) return;
                const dbId = elm.getAttribute('data-db-id');
                if (!dbId) return;

                const fileSn = elm.getAttribute('data-file-sn') || '';
                const fileOn = elm.getAttribute('data-file-on') || elm.getAttribute('xlink:href') || '';
                if (!fileOn && !fileSn) return;

                if (!data._id) data._id = dbId;
                data.file_sn.push(fileSn);
                data.file_on.push(fileOn);
                data.ext.push(commonMethods.Get_File_Extension(fileSn || fileOn) || '');
            });

            if (replaceTargetDbId) data._id = replaceTargetDbId;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('collectExistingSuppDbPayload', err.message);
        }
        return data;
    }

    /**
     * Replace target's (or first existing) data-db-id from editor DOM.
     * @returns {string}
     */
    getReplaceDbIdFromState() {
        return this.collectExistingSuppDbPayload()._id || '';
    }
    /**
     * Handles query submission and file upload
     * @param {File} file - File to submit
     */
    async FIRE_SUBMIT() {
        try {
            this.syncFileTypeSelections();
            this.syncReplaceRemarks();
            if (!this.validateSubmit()) return;
            var self = this;
            const userInput = this.elements.queryResponse;
            const queryResponse = userInput.value;
            const {
                files
            } = this._state;

            if (!this.current_query && this.query_workflow) return;

            if (this.formData.files.length > 0) {
                this.tempFiles = [...this.formData.files];
                this.uploadFiles = [];

                const uploadFileNames = new Set(this.tempFiles.map(file => file.name).filter(Boolean));
                const actionTypeInfo = (files || []).reduce((acc, file) => {
                    const fileName = (file.orgname || "").trim();
                    if (!fileName || !uploadFileNames.has(fileName)) return acc;
                    acc[fileName] = file.action === "add" ? "New" : "Replaced";
                    return acc;
                }, {});
                const uploadData = (files || []).reduce((acc, file) => {
                    const fileName = (file.orgname || "").trim();
                    const suppSn = (file.fileName || "").trim();
                    const action = actionTypeInfo[fileName];
                    if (!fileName || !action || !suppSn) return acc;
                    acc.push({
                        [fileName]: {
                            action,
                            supp_sn: suppSn
                        }
                    });
                    return acc;
                }, []);
                const fileTypes = [...new Set(Object.values(actionTypeInfo).filter(Boolean))];

                // Update tempFiles using the lookup
                this.tempFiles.forEach(tempFile => {
                    if (actionTypeInfo[tempFile.name]) {
                        tempFile.file_type = actionTypeInfo[tempFile.name];
                    }
                });


                const paramsJson = {
                    subfolder: 'suppl_data',
                    recordtype: 'SupplementFile',

                    file_type: fileTypes,
                    // ? restore upload payload fields - 04_SEP_26_DR
                    action_type: JSON.stringify(actionTypeInfo),
                    upload_data: JSON.stringify(uploadData),
                };

                // ? replace with data-db-id → that _id; same-id siblings kept on update - 06_SEP_26_DR
                let replaceDbId = '';
                const replaceTargetIds = {};
                (files || []).forEach((row) => {
                    if (row.action === 'add' || !row.existingFileId || !this.globalDocBody) return;
                    if (!uploadFileNames.has((row.orgname || '').trim())) return;
                    const el = this.globalDocBody.getElementById
                        ? this.globalDocBody.getElementById(row.existingFileId)
                        : this.globalDocBody.querySelector(`[id="${row.existingFileId}"]`);
                    if (!el || el.getAttribute('data-name') !== 'supplementary-material' || el.closest('del')) return;
                    const id = (el.getAttribute('data-db-id') || '').trim();
                    if (id) {
                        replaceDbId = id;
                        replaceTargetIds[row.existingFileId] = true;
                    }
                });
                if (replaceDbId) {
                    paramsJson._id = replaceDbId;
                    const file_sn = [];
                    const file_on = [];
                    const ext = [];
                    Array.from(this.globalDocBody.querySelectorAll('.supplementary-material') || []).forEach((elm) => {
                        if (!elm || elm.closest('del')) return;
                        if ((elm.getAttribute('data-db-id') || '').trim() !== replaceDbId) return;
                        if (replaceTargetIds[elm.id]) return;
                        const fileSn = (elm.getAttribute('data-file-sn') || '').trim();
                        const fileOn = (elm.getAttribute('data-file-on') || elm.getAttribute('xlink:href') || '').trim();
                        if (!fileSn && !fileOn) return;
                        file_sn.push(fileSn);
                        file_on.push(fileOn);
                        ext.push((typeof commonMethods !== 'undefined' && commonMethods.Get_File_Extension)
                            ? (commonMethods.Get_File_Extension(fileSn || fileOn) || '')
                            : ((fileSn || fileOn).split('.').pop() || ''));
                    });
                    if (file_sn.length) {
                        paramsJson.file_sn = file_sn;
                        paramsJson.file_on = file_on;
                        paramsJson.ext = ext;
                    }
                }
                console.log('supp upload json', paramsJson);

                this.recordAttachmentsFlow({
                    filename: this.tempFiles.map(file => file && file.name).filter(Boolean).join(', '),
                    action: 'payload_built',
                    dialog_name: 'supplementary_material',
                    existing_payload: {
                        _id: replaceDbId || '',
                        file_on: paramsJson.file_on || [],
                        file_sn: paramsJson.file_sn || [],
                        ext: paramsJson.ext || []
                    }
                });

                this.recordAttachmentsFlow({
                    filename: this.tempFiles.map(file => file && file.name).filter(Boolean).join(', '),
                    action: 'upload_sent',
                    dialog_name: 'supplementary_material',
                });

                const results = await this._fileUploader.makeRequest(this.tempFiles, paramsJson);

                if (results.r == 1) {
                    this.recordAttachmentsFlow({
                        filename: this.tempFiles.map(file => file && file.name).filter(Boolean).join(', '),
                        action: 'upload_success',
                        status: 'success',
                        dialog_name: 'supplementary_material'
                    });

                    await this.appendResponseintoEditor(results);
                    if (this.query_workflow) {
                        this.appendResponse(this.current_query.id, queryResponse, results, this.tempFiles);
                    }
                } else {
                    this.recordAttachmentsFlow({
                        filename: this.tempFiles.map(file => file && file.name).filter(Boolean).join(', '),
                        action: 'upload_failed',
                        status: 'failed',
                        dialog_name: 'supplementary_material'
                    });
                    console.warn('File not Uploaded');
                }
                this.formData.files = [];
            } else {
                this.appendResponse(this.current_query.id, queryResponse, {});
            }

            this.cleanupAndClose();
        } catch (err) {
            this.recordAttachmentsFlow({
                filename: (this.tempFiles || this.formData.files || []).map(file => file && file.name).filter(Boolean).join(', '),
                action: 'upload_failed',
                status: 'failed',
                dialog_name: 'supplementary_material'
            });
            console.warn(err.message);
            ErrorLogTrace('FIRE_SUBMIT', err.message);
        }
    }

    async appendResponseintoEditor(response) {

        this.syncFileTypeSelections();
        this.syncReplaceRemarks();

        for (const file of this._state.files) {
            const {
                orgname,
                fileName,
                action
            } = file;
            const fileOrgName = response.file_on && response.file_on.find(f => f === orgname);

            if (fileOrgName) {
                const loopFileIndex = response.file_on.indexOf(fileOrgName);
                const fileSN = response.file_sn[loopFileIndex];
                const fileExt = response.ext[loopFileIndex];
                const fileON = response.file_on[loopFileIndex];

                const isNewFile = action.toLowerCase() === "add";
                let remarkHtml = (file.remark || '').trim();
                if (!remarkHtml) {
                    remarkHtml = this.readRemarkFromPanelForFile(file);
                    if (remarkHtml) file.remark = remarkHtml;
                }

                if (isNewFile) {
                    const insertedId = this.insertFileEntry(
                        fileName,
                        fileSN,
                        fileON,
                        file.labelType,
                        file.caption,
                        response, {
                            labelPreview: file.labelPreview || ''
                        }
                    );

                    if (remarkHtml && insertedId) {
                        await this.createReplaceRemarkCommand(insertedId, remarkHtml);
                    }
                } else {
                    this.UpdateReplaceFile(file.existingFileId, fileExt, fileON, fileSN, response);

                    if (remarkHtml) {
                        await this.createReplaceRemarkCommand(
                            file.existingFileId,
                            remarkHtml,
                            file.existingCommentId || null,
                            file.priorRemark || ''
                        );
                    }
                }

                try {
                    const basicAttr = {
                        filename: orgname,
                        status: 'success',
                        dialog_name: 'supplementary_material'
                    };

                    const finalData = Object.assign({},
                        basicAttr,
                        isNewFile ? {
                            action: 'dom_inserted'
                        } : {
                            oldfilename: file && file.existingFileName || '',
                            action: 'dom_replaced'
                        }
                    );

                    console.log(finalData);

                    this.recordAttachmentsFlow(finalData);
                } catch (err) {

                }
            }
        }

        this.refreshSuppFloatList();
    }

    async createReplaceRemarkCommand(elmId, remarkHtml, existingCommentId = null, priorRemark = '') {
        try {
            const suppEl = this.resolveSuppElementById(elmId);
            if (!suppEl || !remarkHtml) return;

            const appendEl = suppEl;
            const textData = $('<div>').html(remarkHtml).text().trim();
            const priorText = $('<div>').html(priorRemark || '').text().trim();
            const canUpdate = Boolean(existingCommentId);
            const unchanged = canUpdate && textData === priorText;
            const preSaveResults = {
                hasContent: textData.length > 0,
                htmlData: remarkHtml,
                textData,
                htmlLength: remarkHtml.length,
                textLength: textData.length,
                unchanged,
                canSave: true,
                canClose: false,
                domEl: null
            };
            const addAttr = "data-insert-from='supp-replace-dialog'";

            return await window.queryModule.operationInsertOrUpdate({
                    name: this._name
                },
                canUpdate ? existingCommentId : null,
                preSaveResults, {
                    from: 'supp_module',
                    'process': 'comment',
                    appendEl,
                    addAttr
                }, {
                    domEl: null,
                    addAttr
                }
            );
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('createReplaceRemarkCommand', err.message);
        }
    }

    async appendResponse(queryId = null, response, fileResponse, tempFiles = []) {
        try {
            var self = this;
            const preSaveResults = {
                hasContent: response.length > 0,
                htmlData: response,
                textData: response,
                htmlLength: response.length,
                textLength: response.length,
                unchanged: false,
                canSave: true,
                canClose: false,
                domEl: null
            };
            const additionalAttr = {
                "data-model": "Supplement"
            };
            const attachments = fileResponse ? fileResponse : [];

            return await window.queryModule.operationInsertOrUpdate({
                name: self._name
            }, queryId, preSaveResults, {
                from: "supp_module",
                addAttr: additionalAttr
            }, {
                domEl: null,
                addAttr: additionalAttr,
                attachments
            });

        } catch (error) {
            this.handleError('createAnnotationCommand', error);
            throw error;
        }
    }


    // Common function to update basic attributes
    updateBasicAttributes(element, response) {
        element.setAttribute('data-user-comment-box', response);
        element.setAttribute('data-timec', new Date().getTime());
    }

    // Common function to handle file attributes
    updateFileAttributes(orgElement, fileAttributes) {
        const {
            fileSn,
            fileOn,
            folderType
        } = fileAttributes;
        orgElement.setAttribute('data-file-sn', fileSn);
        orgElement.setAttribute('data-file-on', fileOn);
        orgElement.setAttribute('data-folder-name', folderType);
    }

    // Helper to get DOM attributes from InsertDOM result
    getDOMAttributes(element) {
        return {
            fileSn: element.getAttribute('data-file-sn'),
            fileOn: element.getAttribute('data-file-on'),
            folderType: element.getAttribute('data-folder-name')
        };
    }

    // Helper to combine attributes with separator
    combineAttributes(first = {}, second = {}) {
        const mergeUnique = (firstValue = '', secondValue = '') => [...new Set([...firstValue.split('||').filter(Boolean), ...secondValue.split('||').filter(Boolean)])].join('||');

        return {
            fileSn: mergeUnique(first.fileSn, second.fileSn),
            fileOn: mergeUnique(first.fileOn, second.fileOn),
            folderType: mergeUnique(first.folderType, second.folderType)
        };
    }


    insertFileEntry(xlinkHrefValue, fileUnique, fileName, labelType = '', caption = '', response = {}, options = {}) {
        try {
            const isPlos = this.isPlosClient();
            const db_id = response.id || '';
            const labelPreview = (options && options.labelPreview) || '';

            // Ensure we have the latest list (querySelectorAll returns a static NodeList).
            if (!this.editorFilesList || !this.editorFilesList.length) this.getFilesCount();

            const filesArr = Array.from(this.editorFilesList || []);
            let lastSuppElm = filesArr.reverse().find(elm => !elm.closest('del')) || this.editorFilesList[this.editorFilesList.length - 1];

            // Fallback if we can't find an existing insertion point.
            if (!lastSuppElm) return null;
            else if (isPlos) {
                const parent = lastSuppElm.closest('[sec-type="supplementary-material"]');
                if (!parent) {
                    // If no valid parent, loop again to find one
                    for (const elm of filesArr) {
                        const suppParent = elm.closest('[sec-type="supplementary-material"]');
                        if (suppParent) {
                            lastSuppElm = elm;
                            break;
                        }
                    }
                }

                // still nothing found
                if (!lastSuppElm) return null;

            }

            const extLower = (xlinkHrefValue || '').split('.').pop().toLowerCase();
            const mimetype = this.mimetypeList[extLower] || 'application/octet-stream';
            const suppId = (xlinkHrefValue || '').replace(/\.[^/.]+$/i, '') || s4();

            // Prefer reusing an existing PLOS PI link pattern if present in the document.
            let pi_info = `xlink:href=&quot;${xlinkHrefValue}&quot;`;
            if (isPlos) {
                const extLink = lastSuppElm.querySelector('.ext-link');
                const existingPiInfo = extLink && extLink.getAttribute('data-piinfo');

                if (existingPiInfo) {
                    // piInfo = "";
                }
            }

            const labelText = labelPreview ||
                (labelType ? `S${this.getNextLabelNumber(labelType, { ignoreStaged: true })} ${labelType}.` : suppId);

            // Omit empty description .p for now (caption lives in .title). Wire real description later via truthy `description`.
            const html = this.templates.fileNewEntry({
                isPlos,
                supp_id: suppId,
                xlinkHrefValue,
                mimetype,
                unique_name: fileUnique,
                org_name: fileName,
                db_id,
                pi_info,
                caption_id: s4(),
                title_id: s4(),
                desc_id: '',
                ext_id: s4(),
                label: labelText,
                title: caption,
                description: false,
                ext: (extLower || '').toUpperCase(),
                user: USER_INFO.MAIL_ID,
                role: USER_INFO.TRACK_ROLE_NAME,
                time: new Date().getTime()
            });

            // Find the supplementary-material parent
            const suppParent = lastSuppElm.closest('[sec-type="supplementary-material"]');

            if (suppParent) {
                // Append inside the section
                suppParent.insertAdjacentHTML('beforeend', html);
            } else {
                // Fallback: insert after the last element
                lastSuppElm.insertAdjacentHTML('afterend', html);
            }

            var suppEl = this.resolveSuppElementById(suppId);
            var wrapped = null;
            if (suppEl && window._trackManager && typeof window._trackManager.getInsNode === 'function') {
                wrapped = window._trackManager.getInsNode(suppEl, {
                    childOnly: true,
                    setAttrParams: {
                        "data-track-code": "suppmat-01"
                    }
                });
            }
            // ? dotted PLOS ids miss getById — stamp like replace if wrap fails - 07_SEP_26_DR
            if (suppEl && !wrapped) {
                commonMethods.setAttr(suppEl, {
                    "data-track-code": "suppmat-01",
                    "data-time": new Date().getTime(),
                    "data-username": USER_INFO.MAIL_ID,
                    "data-rolename": USER_INFO.TRACK_ROLE_NAME
                });
            }

            // Refresh the internal list so subsequent inserts keep correct ordering.
            this.getFilesCount();
            return suppId;

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('insertFileEntry', err.message);
            return null;
        }
    }



    UpdateReplaceFile(elmId, extn, fileName, fileUniqueName, response = {}) {

        try {
            var isPlos = this.isPlosClient();
            const replacedSuppElm = this.globalDocBody.querySelector(`[id='${elmId}']`);
            let orgFileName = replacedSuppElm.getAttribute('xlink:href');
            let newExtn = "." + extn;
            let db_id = response.id;
            const extLower = (extn || '').toLowerCase();


            commonMethods.setAttr(replacedSuppElm, {
                'xlink:href': orgFileName.replace(/\.[^/.]+$/i, newExtn),
                'mimetype': this.mimetypeList[extLower] || "application/octet-stream",
                'data-file-sn': fileUniqueName,
                'data-file-on': fileName,
                'data-db-id': db_id,
                'data-file-type': 'replaced',
                "data-track-code": "suppmat-02",
                'data-time': new Date().getTime(),
                'data-username': USER_INFO.MAIL_ID,
                'data-rolename': USER_INFO.TRACK_ROLE_NAME,
            });

            const innerSpan = replacedSuppElm.querySelector('.label');
            if (innerSpan) {
                innerSpan.textContent = orgFileName.replace(/\.[^/.]+$/i, "");
            }

            if (isPlos) {
                var caption = replacedSuppElm.querySelector('.caption');
                if (caption) {
                    var paras = caption.querySelectorAll('.p');
                    if (paras.length > 0) {
                        var lastPara = paras[paras.length - 1];
                        var isAlreadyReplaced = !!lastPara.querySelector('del');

                        // If already replaced, get the old extension from <del>, otherwise from textContent
                        var sourceText = isAlreadyReplaced ?
                            lastPara.querySelector('del').textContent.trim() :
                            lastPara.textContent.trim();

                        var currentExt = sourceText.split('.').pop().replace(/[()]/g, '').toLowerCase();
                        var desiredExt = extn.toLowerCase();

                        if (currentExt !== desiredExt) {
                            // Create tracked nodes with the correct text
                            var insNode = window._trackManager.getInsNode();
                            insNode.append(desiredExt.toUpperCase());

                            var delNode = window._trackManager.getDelNode();
                            delNode.append(currentExt.toUpperCase());
                            // Set attributes for tracking disable
                            $([insNode, delNode]).attr('data-ignore-code', 'panel');

                            // ? no text-node space between del/insert (visual gap via CSS) - 04_SEP_26_DR
                            lastPara.innerHTML = `(${delNode.outerHTML}${insNode.outerHTML})`;
                        }
                    }
                }


            }


        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Replace_Supply_File_Update', err.message);
        }
    }


    /**
     * Main method to show supplementary files and queries
     * @param {Element} queryElement - The query container element
     */
    showLoop(queryElement, options = {}) {
        try {
            // Reset dialog
            this.resetState();
            this.initializeElements();

            const {
                submitButton,
                cancelButton
            } = this.elements;

            if (queryElement) {
                if (this.isCrudFlow(queryElement)) {
                    this.query_workflow = false;
                    this.current_query = queryElement;
                    this.toggleQueryDiv(false, false, false);
                } else {

                    this.query_workflow = true;
                    if (queryElement.hasAttribute("data-user-comment-box")) queryElement = queryElement.parentElement;

                    this.current_query = queryElement;
                    this.query_text = queryElement.querySelector('[data-user-comment-box][data-name="AQ"]').getAttribute('data-user-comment-box') || queryElement.getAttribute("data-user-comment-box") || "";

                    // ? Generate and update query tags
                    const queryTags = this.generateQueryTags(queryElement);
                    this.updateQueryContent(queryTags.join(''));
                    this.toggleQueryDiv(true, true, false);
                }
            } else {
                this.query_workflow = false;
                this.toggleQueryDiv(false, false, true);
            }
            if (!this.query_workflow) submitButton.textContent = "Submit";
            else submitButton.textContent = "Submit your Response";

            // ? Generate and update files list
            this.generateFilesList({
                mode: 'dialog'
            });
            this.updateFileList({
                force: true
            });

            // Update submit button state
            this.updateSubmitButtonState();

        } catch (error) {
            this.handleError('showLoop', error);
        }
    }
    /**
     * Cleanup and close dialog
     */
    cleanupAndClose() {
        this.refreshSuppFloatList();
        this.closeDialog();
        if (this.current_query) {
            setTimeout(() => {
                if (typeof window.queryPanel !== "undefined" && typeof window.queryPanel.render == "function") {
                    window.queryPanel.render(true);
                }
            }, 2500);
        }
    }

    test() {
        // Collect all rows
        const rows = document.querySelectorAll('tr');
        // Build key-value pairs from attr-name → attr-val
        const attributes = {};
        rows.forEach(tr => {
            const nameEl = tr.querySelector('.attr-name');
            const valEl = tr.querySelector('.attr-val');

            const name = nameEl ? nameEl.textContent.trim() : null;
            const val = valEl ? valEl.textContent.trim() : null;

            if (name === 'mimetype' && val) {
                if (!attributes[val]) {
                    attributes[val] = [];
                }

                const existingFiles = attributes[val];
                const existingExts = existingFiles.map(f => f.split('.').pop());

                const prevTr = tr.previousElementSibling;
                const hrefEl = prevTr ? prevTr.querySelector('.attr-val') : null;
                const hrefVal = hrefEl ? hrefEl.textContent.trim() : null;

                if (hrefVal) {
                    const extension = hrefVal.split('.').pop();

                    if (!existingExts.includes(extension)) {
                        attributes[val].push({
                            hrefVal
                        });
                    }
                }
            }
        });

        console.table(attributes);
    }
    collectUniqueData() {
        const rows = document.querySelectorAll('tr');
        const attributes = {};

        rows.forEach(tr => {
            const nameEl = tr.querySelector('.attr-name');
            const valEl = tr.querySelector('.attr-val');

            const name = nameEl ? nameEl.textContent.trim() : null;
            const val = valEl ? valEl.textContent.trim() : null;

            // Only process mimetype rows
            if (name === 'mimetype' && val) {
                if (!attributes[val]) {
                    attributes[val] = [];
                }

                const prevTr = tr.previousElementSibling;
                const hrefEl = prevTr ? prevTr.querySelector('.attr-val') : null;
                const hrefVal = hrefEl ? hrefEl.textContent.trim() : null;

                if (hrefVal) {
                    const extension = hrefVal.split('.').pop();
                    const existingExts = attributes[val].map(f => f.extension);

                    // Only push if extension not already present
                    if (!existingExts.includes(extension)) {
                        attributes[val].push({
                            href: hrefVal,
                            extension,
                            valid: val.includes(extension)
                        });
                    }
                }
            }
        });


        // Flatten into JSON array
        const results = Object.entries(attributes).map(([mimetype, files]) => {
            return files.map(f => ({
                mimetype,
                href: f.href,
                extension: f.extension,
                valid: f.valid
            }));
        }).flat();

        return results;
    }




}

export default SupplementaryMaterial;