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
     * @property {Element[]} filesList - List of supplementary material elements
     * @property {Object} formData - Form data containing files
     * @property {Object} templates - HTML templates for rendering
     */

    /**
     * @typedef {Object} Elements
     * @property {HTMLElement} submitButton - Submit button element
     * @property {HTMLElement} queryResponse - Query response input element
     * @property {HTMLElement} fileInput - File input element
     */

    constructor(name, subFolder, options = {}) {
        super(name, subFolder, options);
        this.state = {
            filesList: [],
            formData: {
                files: []
            },
            templates: {
                fileItem: this.createFileItemTemplate(),
                queryContent: this.createQueryContentTemplate(),
                uploadFileItem: this.createUploadFileItemTemplate()
            }
        };

        this.elements = {
            submitButton: null,
            queryResponse: null,
            fileInput: null
        };

        this.current_query = null;
        this.query_txt = '';
    }

    // Template Methods
    /**
     * @private
     * @param {Object} param0 - Template parameters
     * @returns {string} Generated HTML for file item
     */

    createFileItemTemplate() {
        return ({
            fileId,
            fileName,
            downloadUrl,
            orgName,
            deleteId = ''
        }) => `
            <div class="row file-item ${deleteId}" id="${fileId}">
                <div class="col-7 file-name">${fileName}</div>
                <div class="col-2 text-center">
                    <a class="download_file" href="${downloadUrl}" target="_blank">
                        <button class="icon-button" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                    </a>
                </div>
                <div class="col-2 text-center">
                    <button class="icon-button replace_file" title="Replace" 
                            id="${fileId}" supporgname="${orgName}">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                </div>
                <div class="col-1 text-center ds-none">
                    <a class="delete_file" href="" title="Delete" id="${fileId}">
                        <button class="icon-button" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </a>
                </div>
            </div>`;
    }

    createQueryContentTemplate() {
        return ({
            stage,
            content
        }) => `<span class="query_Details" querydetails="${stage}">${content}</span>`;
    }

    createUploadFileItemTemplate() {
        return ({
            fileName
        }) => `
            <div class="row file-item">
                <div class="col-7 file-name">${fileName}</div>
                <div class="col-2 text-center ds-none">
                    <button class="icon-button" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
                <div class="col-2 text-center ds-none">
                    <button class="icon-button" title="Replace">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                </div>
                <div class="col-1 text-center ds-none">
                    <button class="icon-button" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>`;
    }

    // Initialization methods

    initializeElements() {
        this.state.filesList = document.querySelectorAll(".supplementary-material");
        this.elements.submitButton = this.Panel.querySelector("#supply_submit");
        this.elements.queryResponse = this.Panel.querySelector("#confirmationInput");
        this.elements.fileInput = document.getElementById('fileUploadInput');
    }

    setupEventListeners() {
        const handlers = {
            'click': {
                '.replace_file, .delete_file, .addnewsupp': this.handleFileAction.bind(this)
            },
            'change': {
                '#fileUploadInput': this.handleFileUpload.bind(this)
            },
            'input': {
                '#confirmationInput': this.handleQueryInput.bind(this)
            }
        };

        Object.entries(handlers).forEach(([event, selectors]) => {
            Object.entries(selectors).forEach(([selector, handler]) => {
                $(document).on(event, selector, handler);
            });
        });
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

        if (currentTarget.classList.contains("replace_file") || currentTarget.classList.contains("addnewsupp")) {
            this.initiateFileUpload(currentTarget);
        } else {
            await this.handleFileDeletion(currentTarget);
        }
    }

    initiateFileUpload(target) {
        commonMethods.SET_REMOVE_ATTR(this.elements.fileInput, {
            "suppid": target.getAttribute("id"),
            "supporgname": target.getAttribute("supporgname")
        });
        this.elements.fileInput.click();
    }

    async handleFileDeletion(target) {
        const result = await AlertNewDialog.fire('supply_Delete');
        if (result.isConfirmed) {
            const fileItem = target.closest(".file-item");
            fileItem.classList.add("item_deleted");
            await this.deleteSupplementaryFile(target.id);
        }
    }

    async handleFileUpload(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;

            const validationResult = this.validateFile(file);
            if (!validationResult.isValid) {
                this.resetFileInput();
                return;
            }

            await this.processFileUpload(file, event.target);
        } catch (error) {
            this.handleError('file upload', error);
        }
    }

    handleQueryInput(event) {
        const isEmpty = event.currentTarget.value === '';
        this.elements.submitButton.classList[isEmpty ? 'add' : 'remove']('disabled');
    }


    // File Processing Methods
    /**
     * @private
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    validateFile(file) {
        const validation = VALIDATE_UPLOAD_FILE(file, {
            limit: 100,
            show_alert: true
        });

        return {
            isValid: validation.VALID,
            message: validation.message
        };
    }

    /**
     * @private
     * @param {File} file - File to process
     * @param {HTMLElement} inputElement - File input element
     */

    async processFileUpload(file, inputElement) {
        const isReplacement = inputElement.getAttribute("supporgname") !== "null";
        file.fileType = isReplacement ? "Replaced" : "New";

        if (isReplacement) {
            await this.handleFileReplacement(file, inputElement);
        } else {
            await this.handleNewFile(file);
        }

        this.updateSubmitButtonState();
    }

    // UI update methods
    /**
     * Updates the file list in the UI
     * @param {string} html - HTML string to update
     */
    updateFileList(htmlContent) {
        const fileList = this.Panel.querySelector(".file-list");
        fileList.innerHTML = htmlContent;
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
        this.state.formData.files = [];
        this.updateFileList('');
        this.updateQueryContent('');
    }

    /**
     * @public
     * @returns {Promise<boolean>} Whether close was successful
     */
    async closeWithConfirmation() {
        if (this.state.formData.files.length > 0) {
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
    generateSupplementaryFilesList() {
        try {
            const supplementaryFiles = [];
            const supplementaryElements = GlobalEditor.document.$.body
                .querySelectorAll(".supplementary-material");

            supplementaryElements.forEach(file => {
                const fileData = this.extractFileData(file);
                const fileHtml = this.generateFileItemHtml(fileData);
                supplementaryFiles.push(fileHtml);
            });

            return supplementaryFiles;
        } catch (error) {
            this.handleError('generateSupplementaryFilesList', error);
            return [];
        }
    }

    /**
     * Extracts relevant data from a file element
     * @param {Element} file - The file DOM element
     * @returns {Object} Extracted file data
     */
    extractFileData(file) {
        const fileName = file.querySelector(".label").innerHTML;
        const fileLink = file.getAttribute("xlink:href");
        const fileSN = file.hasAttribute('data-db-id') ?
            file.getAttribute('data-db-id') :
            fileLink;

        return {
            id: file.id,
            name: fileName,
            link: fileLink,
            sn: fileSN,
            isDeleted: !!file.closest("del")
        };
    }

    /**
     * Generates HTML for a single file item
     * @param {Object} fileData - File data object
     * @returns {string} Generated HTML string
     */
    generateFileItemHtml(fileData) {
        const downloadUrl = this.constructDownloadUrl(fileData.sn, fileData.link);

        return this.state.templates.fileItem({
            fileId: fileData.id,
            fileName: this.trimBefore(fileData.link, "Supplementary"),
            downloadUrl: downloadUrl,
            orgName: fileData.link,
            deleteId: fileData.isDeleted ? "item_deleted" : ""
        });
    }

    /**
     * Constructs download URL for a file
     * @param {string} fileSN - File serial number
     * @param {string} fileLink - File link
     * @returns {string} Constructed download URL
     */
    constructDownloadUrl(fileSN, fileLink) {
        const params = new URLSearchParams({
            appkey: 'xmleditor',
            file_sn: fileSN,
            docid: `${DOC_ID}/suppl_data`,
            file_on: fileLink
        });

        return `${API_PATH}filedownload?${params.toString()}`;
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
        return {
            isCurrentUser: USER_INFO.MAIL_ID === comment.dataset.username,
            content: comment.getAttribute("data-user-comment-box"),
            stage: this.determineQueryStage(comment),
            role: comment.dataset.role,
            name: comment.dataset.name
        };
    }

    /**
     * Determines the stage of a query comment
     * @param {Element} comment - Query comment element
     * @returns {string} Query stage
     */
    determineQueryStage(comment) {
        return comment.dataset.name === "AQ" ?
            comment.parentElement.dataset.label :
            `${comment.dataset.role} ${comment.dataset.name}`;
    }

    /**
     * Generates HTML for a single query tag
     * @param {Object} commentData - Comment data object
     * @returns {string} Generated HTML string
     */
    generateQueryTagHtml(commentData) {
        return this.state.templates.queryContent({
            stage: commentData.stage,
            content: commentData.content
        });
    }

    /**
     * Updates input field for user's own comment
     * @param {Object} commentData - Comment data object
     */
    updateUserCommentInput(commentData) {
        const queryInput = this.Panel.querySelector("#confirmationInput");
        queryInput.setAttribute("edit", commentData.role);
        queryInput.value = commentData.content;
    }

    handleFileUpload(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;

            const validation = this.validateFile(file);
            if (!validation.isValid) {
                this.resetFileInput();
                return;
            }

            // Handle file upload based on type
            if (event.target.getAttribute("supporgname") === "null") {
                // New file upload - use uploadFileItem template
                const uploadHtml = this.state.templates.uploadFileItem({
                    fileName: file.name
                });
                this.Panel.querySelector(".file-list").insertAdjacentHTML('beforeend', uploadHtml);
            } else {
                // Replace existing file
                this.handleFileReplacement(file, event.target);
            }

            // Update form data
            this.updateFormData(file, event.target);
            this.updateSubmitButtonState();
        } catch (error) {
            this.handleError('handleFileUpload', error);
        }
    }

    handleFileReplacement(file, inputElement) {
        const elementId = this.Panel.querySelector(
            `[supporgname="${inputElement.getAttribute("supporgname")}"]`
        ).getAttribute("id");

        // Use uploadFileItem template for replacement
        const replacementHtml = this.state.templates.uploadFileItem({
            fileName: file.name
        });

        const fileList = this.Panel.querySelector(".file-list");
        const existingElement = fileList.querySelector(`#${elementId}`);

        if (existingElement) {
            existingElement.insertAdjacentHTML('afterend', replacementHtml);
            existingElement.remove();
        }

        file.elmId = elementId;
    }

    // Helper methods
    updateFormData(file, inputElement) {
        if (!this.state.formData.files) {
            this.state.formData.files = [];
        }

        const isReplacement = inputElement.getAttribute("supporgname") !== "null";
        file.fileType = isReplacement ? "Replaced" : "New";

        if (isReplacement) {
            const tempId = inputElement.getAttribute("supporgname");
            this.Panel.querySelector(`[supporgname="${tempId}"]`)
                .setAttribute("ifile_name", file.name);
        }

        this.state.formData.files.push(file);
    }

    setupUserComment(element) {
        const queryInput = this.Panel.querySelector("#confirmationInput");
        queryInput.setAttribute("edit", element.dataset.role);
        queryInput.value = element.getAttribute("data-user-comment-box");
    }

    updateSubmitButtonState() {
        const hasValue = this.elements.queryResponse.value.length > 0;
        const hasFiles = this.state.formData.files.length > 0;

        if (hasValue && hasFiles) {
            this.elements.submitButton.classList.remove('disabled');
        }
    }

    /**
     * Main method to show supplementary files and queries
     * @param {Element} queryElement - The query container element
     */
    showLoop(queryElement) {
        try {
            // Reset dialog
            this.resetState();
            this.initializeElements();
            this.setupEventListeners();

            this.current_query = queryElement;
            this.query_txt = queryElement.querySelector('[data-user-comment-box][data-name="AQ"]').getAttribute('data-user-comment-box');

            // Generate and update files list
            const supplementaryFiles = this.generateSupplementaryFilesList();
            this.updateFileList(supplementaryFiles.join(''));

            // Generate and update query tags
            const queryTags = this.generateQueryTags(queryElement);
            this.updateQueryContent(queryTags.join(''));

            // Update submit button state
            this.updateSubmitButtonState();

        } catch (error) {
            this.handleError('showLoop', error);
        }
    }

}
(function() {
    window.SuppMaterialModule = new SuppMaterial("SuppMaterialModule", "supp");
    console.log("SuppMaterialModule initialized");
})();