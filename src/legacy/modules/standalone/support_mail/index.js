
/**
 * SupportMailDialog - Refactored to extend BaseModule
 * Handles sending support emails with attachments, browser information, and automatic error reporting
 * 
 * @class SupportMailDialog
 * @extends BaseModule
 * @version 2.1.0
 * @author Development Team
 */



class SupportMailDialog extends BaseModule {
    constructor(name = 'SupportMailDialog', errorTracker = null, options = {}) {
        super(name, errorTracker, options);

        // Module-specific properties
        this._elements = {};

        // State management
        this.InitFlag = false;
        this.DefaultBodyText = '';
        this.IsDisable_OffLine = true;
        this.IsShared = false;
        this.LAST_MAIL_OBJ = null;
        this.MODE = {};
        this._autoMailSentCodes = {};
        this._autoMailStoragePrefix = 'xmleditor:supportMail:autoSent:';
        [DOC_ID, USER_INFO.MAIL_ID, this.MODE.error_code].join(":");

        // Initialize API service
        this.apiService = new FetchService();

        // Configuration with error codes
        this._state = {
            ...this._state,
            emailValidation: {
                mailIdRegex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                limit: 20
            },
            invalidTextOptions: ['', '\n', ' '],
            // MB
            fileUploadLimit: 10,
            // ms
            shareTimeout: 5000,
            error_codes: {
                am_001: 'attribute_miss',
                cjk_001: 'cjk_mismatch',
                qry_001: 'query_miss',
                fu_001: 'file_upload_fail',
                api_001: 'api_timeout',
                val_001: 'validation_fail'
            },
            error_templates: {
                am_001: {
                    subject: 'Missing Attributes in Document',
                    body: 'Document validation failed due to missing required attributes. Document ID: {{docId}}, User: {{userEmail}}, Time: {{timestamp}}'
                },
                qry_001: {
                    subject: 'Query Count Mismatch',
                    body: 'Query count mismatch detected. Expected: {{expected}}, Found: {{found}}, Document ID: {{docId}}, User: {{userEmail}}'
                },
                cjk_001: {
                    subject: 'East Asian character Count Mismatch',
                    body: `A technical issue with the East Asian character count is preventing proofing. This may be due to a translator plugin.<br><br>
                    We’ve notified our technical team and copied you on the email. Our support team will update you once it’s fixed &mdash; usually within 24 hours.`
                },
                fu_001: {
                    subject: 'File Upload Failed',
                    body: 'File upload failed for file: {{filename}}, Size: {{filesize}}, Error: {{error}}'
                },
                api_001: {
                    subject: 'API Request Timeout',
                    body: 'API request timed out. Endpoint: {{endpoint}}, Duration: {{duration}}ms, User: {{userEmail}}'
                },
                val_001: {
                    subject: 'Validation Error',
                    body: 'Validation failed: {{validationType}}, Details: {{details}}'
                }
            }
        };

        this.ccEmailHelper = null;

        // Bind methods to preserve context
        this._bindMethods();

        // this.logInfo('SupportMailDialog initialized with error reporting');
    }

    /**
     * Bind methods to preserve context
     * @private
     */
    _bindMethods() {

        const methodsToBind = [
            'initLoop', 'showLoop', 'fireOnce', 'assignVariablesEventLoop',
            'handleCcMailChange', 'handleCcMailKeyEvent', 'handleCcMailPaste', 'handleCcMailBlur', 'OnChangeBody',
            'InputAttachEvent',
            'AddBrowserInfo',
            'removeCC',
            'fileUpload',
            'handleFileChange',
            'handleTrashClick',
            'errorMailWithFallback',
            'reset', 'closeModule', 'handleError'
        ];

        methodsToBind.forEach(method => {
            if (this[method]) {
                this[method] = this[method].bind(this);
            }
        });
    }

    /**
     * Initialize the module loop
     * @param {*} _ - Unused parameter for compatibility
     * @param {Object} params - Initialization parameters
     * @public
     */
    initLoop(_, params = {}) {
        try {
            // this.logInfo('Initializing SupportMailDialog...');

            // Wait for panel to be available
            if (!this.Panel) {
                // this.logWarn('Panel not available, retrying initialization...');
                setTimeout(() => this.initLoop(_, params), 100);
                return;
            }

            // Initialize DOM elements
            this._initializeDOMElements();

            // Setup event listeners
            this._setupEventListeners();

            // Add user email to CC section
            this._addUserEmailToCC();

            // Initialize state
            this.InitFlag = false;
            this.DefaultBodyText = '';
            this.IsDisable_OffLine = true;
            this.MODE = {};

            // Mark as initiated
            this.initiated = true;
            this.AutoInitiated = true;
            this.FullyLoaded = true;

            // this.logInfo('SupportMailDialog initialization completed');

            if (!this._fileUploader) this._fileUploader = new FileUploadModule(API_UPLOAD_MULTI);
        } catch (error) {
            // this.logError('initLoop', error);
            // this._handleError('INIT_LOOP', error);
        }
    }

    /**
     * Show the send mail dialog
     * @param {Object} param1 - Show parameters
     * @param {Object} param2 - Additional parameters
     * @param {Object} param3 - Extra parameters
     * @public
     */
    showLoop(param1 = {}, param2 = {}, param3 = {}) {
        try {
            // Handle event object passed as param1
            // param1 = (param1 && param1.type !== "click") ? param1 : { show_warn: true };
            const { show_warn } = param1;

            // this.logInfo('Showing SupportMailDialog...', param1);

            // Reset dialog state
            this.reset();

            // Initialize Summernote editor
            this._initializeSummernote();

            // Setup from email
            this._setupFromEmail();

            // Setup body event listener
            if (this._elements.BodyValue) {
                this._elements.BodyValue.addEventListener("input", this.OnChangeBody);
            }

            // Store mode
            this.MODE = param1;

            // Check if this is an error mail
            if (param1.error_code) {
                this._prepareErrorMail(param1.error_code, param1.error_data);
            }

            // Show warning if needed
            if (show_warn) {
                this._showInstructionAlert();
            }

            // this.logInfo('SupportMailDialog shown successfully');

        } catch (error) {
            // this.logError('showLoop', error);
            // this._handleError('SHOW_LOOP', error);
        }
    }

    /**
     * Send error mail automatically
     * @param {string} errorCode - Error code from _state.error_codes
     * @param {Object} errorData - Additional error data
     * @public
     */
    async errorMailWithFallback(errorCode, errorData = {}) {
        try {
            // this.logInfo(`Sending automatic error mail for code: ${errorCode}`);

            if (!this.initiated) {
                this.init();
            }

            // Reset dialog first
            this.reset();

            // Prepare error mail content
            // this._prepareErrorMail(errorCode, errorData);
            this.MODE.mailBody = `Dear ${USER_INFO.ROLE_NAME}<br><br>${errorData.message || ""}`;
            this.MODE.subject = errorData.title || errorData.subject || "";
            this.MODE.auto_send = true;
            this.MODE.error_code = errorCode;
            // Send mail automatically
            await this.fireOnce();

        } catch (error) {
            // this.logError('errorMailWithFallback', error);
            // this._handleError('SEND_ERROR_MAIL', error);
        }
    }

    /**
     * Reset dialog to initial state
     * @public
     */
    reset() {
        try {
            // this.logInfo('Resetting SupportMailDialog...');

            // Reset button states
            if (this._elements.ShareSubmit) {
                this._elements.ShareSubmit.classList.add('disabled');
            }

            // Reset input validation states
            if (this._elements.CCValue) {
                this._elements.CCValue.classList.remove('is-invalid', 'is-valid');
                this._elements.SubjectValue.value = '';
                this._elements.CCValue.value = '';
                this._elements.BODY_INPUT.innerHTML = '';
                this._elements.CCValue.placeholder = 'someone@domain.com';
            }

            // Clear body value
            if (this._elements.BodyValue) {
                this._elements.BodyValue.innerHTML = '';
            }

            // Reset mail object
            this.LAST_MAIL_OBJ = null;

            // Clear file attachment
            this._clearFileAttachment();

            // Remove all CC emails except user's
            this._removeAllCCEmails();

            // Destroy Summernote
            this._destroySummernote();

            // Reset mode
            this.MODE = {};

            // Reset browser info
            this._resetBrowserInfo();

            // this.logInfo('SupportMailDialog reset completed');

        } catch (error) {
            // this.logError('reset', error);
            // this._handleError('RESET', error);
        }
    }


    /**
     * Handle body content change
     * @param {Event} e - Input event
     * @public
     */
    OnChangeBody(e) {
        try {
            const isValid = !this._state.invalidTextOptions.includes(this.innerText) &&
                !this._elements.CCValue.classList.contains('is-invalid');

            this._elements.ShareSubmit.classList[isValid ? 'remove' : 'add']('disabled');

        } catch (error) {
            // this.logError('OnChangeBody', error);
            // this._handleError('ON_CHANGE_BODY', error);
        }
    }

    async getDocsRecords() {
        const defultsData = GET_JSON("defaults");
        const requiredKeys = ['docid', 'identifier', 'rolename', 'role', 'username', 'client'];

        // Build paramsJson from defaultsData
        const paramsJson = requiredKeys.reduce((acc, key) => {
            if (defultsData.hasOwnProperty(key)) {
                acc[key] = defultsData[key];
            }
            return acc;
        }, {});

        // Add static error_code
        paramsJson.error_code = "CJK_MISMATCH";

        try {
            const response = await this.apiService.makeRequest("getdocs",
                {
                    tbl: 'writeMailTeam',
                    find: paramsJson,
                    length: 50
                },
                { isPayloadLogic: true }
            );

            return response;
        } catch (apiError) {

            console.error("API Error:", apiError);
            throw apiError;
        }
    }

    _getAutoMailStorageKey(autoMailKey) {
        return `${this._autoMailStoragePrefix}${autoMailKey}`;
    }

    _isAutoMailSent(autoMailKey) {
        if (!autoMailKey) return false;
        if (this._autoMailSentCodes[autoMailKey]) return true;

        try {
            if (typeof localStorage === "undefined") return false;
            const sentValue = localStorage.getItem(this._getAutoMailStorageKey(autoMailKey));
            if (sentValue === "1") {
                this._autoMailSentCodes[autoMailKey] = true;
                return true;
            }
        } catch (storageError) {
            console.warn("Failed to read auto mail localStorage:", storageError.message);
        }

        return false;
    }

    _markAutoMailSent(autoMailKey) {
        if (!autoMailKey) return;
        this._autoMailSentCodes[autoMailKey] = true;

        try {
            if (typeof localStorage === "undefined") return;
            localStorage.setItem(this._getAutoMailStorageKey(autoMailKey), "1");
        } catch (storageError) {
            console.warn("Failed to write auto mail localStorage:", storageError.message);
        }
    }




    /**
     * Share/Send mail
     * @param {Event} e - Click event
     * @public
     */
    async fireOnce(e) {
        // Prevent multiple sends
        if (this._isSending) {
            // this.logInfo("fireOnce: Mail already sending, skipping duplicate trigger.");
            return;
        }
        this._isSending = true;

        try {
            // Collect CC emails
            // ? USER_INFO.MAIL_ID => remove for sending to author
            // ? 3439895	Mail Not Triggered for East Asian Character Count Mismatch

            const autoMailKey = this.MODE.error_code === "CJK_MISMATCH"
                ? [DOC_ID, USER_INFO.MAIL_ID, this.MODE.error_code].join(":")
                : "";

            if (this._isAutoMailSent(autoMailKey)) {
                this.IsShared = true;
                this._isSending = false;
                this.reset();
                this.closeDialog();
                return;
            }

            const docsResponse = autoMailKey
                ? await this.getDocsRecords()
                : null;

            let ccEmails = this.MODE.auto_send
                ? [USER_INFO.MAIL_ID]
                : this._collectCCEmails();

            if ("CJK_MISMATCH" == this.MODE.error_code) {
                if (docsResponse && docsResponse.data) {
                    if (docsResponse.data.length > 0) {
                        this.IsShared = true;
                        this._markAutoMailSent(autoMailKey);
                        this._isSending = false;
                        this.reset();
                        return;
                    }
                }
            }

            // Reset shared state
            this.IsShared = false;

            // Prepare mail object
            const mailObj = this._prepareMailObject(ccEmails);
            this.LAST_MAIL_OBJ = mailObj;

            // Handle localhost override
            if (typeof IS_LOCAL_HOST !== "undefined" && IS_LOCAL_HOST &&
                typeof USER_INFO !== "undefined" && typeof SHARE_USER_IDs !== "undefined" &&
                /yasar/.test(USER_INFO.MAIL_ID_PREFIX)) {
                mailObj.emailto = "yasar.mohideen@nkw.pub";
            }


            if (autoMailKey) {
                this._markAutoMailSent(autoMailKey);
            }

            void this.apiService
                .makeRequest("genericsendemail", mailObj, { isPayloadLogic: true })
                .then((response) => {
                    this.handleMailResponse(response);
                    this._isSending = false;
                })
                .catch((apiError) => {

                    this.handleMailResponse({
                        r: 0,
                        error: apiError?.message || "Unknown error"
                    });
                    this._isSending = false;
                });

            // Setup timeout fallback
            this._setupShareTimeout(mailObj);

            // Close dialog if not automatic error mail
            if (!this.MODE.auto_send) {
                this.closeDialog();
            }

        } catch (error) {
            this.logError("fireOnce", error);
            // ensure guard is released
            this._isSending = false;
            this.closeDialog();
        }
    }


    /**
     * Handle send mail response
     * @param {Object} response - Server response
     * @public
     */
    async handleMailResponse(response) {
        try {
            // this.logInfo('Processing mail response:', response);

            if (response.r === 2) {
                // Timeout error
                this._showToasterAlert('ErrorAutofireOnce', { type: 'warning' });
                const message = `Sharing mail timeout ${response.mail || ''}`;
                this.logError('PostfireOnce', new Error(message));
            } else if (response.r !== 0) {
                // Success
                this._showToasterAlert('WriteMailToTeam');

                // Record to database
                if (this.LAST_MAIL_OBJ) {
                    await this._recordMailToDB(this.LAST_MAIL_OBJ);
                }
            } else {
                // Error
                this.logError('Mail send failed', response);
            }

            // Handle redirect mode
            if (this.MODE.redirect) {
                this._redirectCurrentSession();
            } else {
                this.IsShared = true;
                this.reset();
                this.closeDialog();
            }

        } catch (error) {
            // this.logError('handleMailResponse', error);
            // this._handleError('handleMailResponse', error);
        }
    }

    /**
     * Remove CC email
     * @param {HTMLElement} element - Element to remove
     * @public
     */
    removeCC(element) {
        try {
            if (element && element.parentElement) {
                element.parentElement.remove();
            }
        } catch (error) {
            // this.logError('removeCC', error);
            // this._handleError('REMOVE_CC', error);
        }
    }

    /**
     * Handle send image click
     * @param {Event} e - Click event
     * @public
     */
    fileUpload(e) {
        try {
            if (this._elements.InputAttach) {
                this._elements.InputAttach.click();
            }
        } catch (error) {
            // this.logError('fileUpload', error);
            // this._handleError('SEND_IMG_EVENT', error);
        }
    }

    /**
     * Handle input attach event
     * @param {Event} e - Click event
     * @public
     */
    InputAttachEvent(e) {
        try {
            // Placeholder for attach event handling
            // this.logInfo('Input attach clicked');
        } catch (error) {
            // this.logError('InputAttachEvent', error);
            // this._handleError('INPUT_ATTACH_EVENT', error);
        }
    }

    /**
     * Add browser information to email
     * @param {Event} e - Click event
     * @public
     */
    AddBrowserInfo(e) {
        try {
            if (!window.browserInfo) {
                // this.logWarn('Browser info not available');
                return;
            }

            const { screenSize, version, os, browser, osVersion } = window.browserInfo;
            const textarea = this.Panel.querySelector('.note-editable.panel-body');

            if (!textarea) return;

            const template = this._getBrowserInfoTemplate(os, osVersion, browser, version, screenSize);
            const existingInfo = textarea.querySelector(".browser_info");

            if (existingInfo) {
                if (!this._elements.SendBrowserInfo.checked) {
                    existingInfo.remove();
                }
            } else {
                if (this._elements.SendBrowserInfo.checked) {
                    $(textarea).append(template);
                }
            }

        } catch (error) {
            // this.logError('AddBrowserInfo', error);
            // this._handleError('ADD_BROWSER_INFO', error);
        }
    }

    /**
     * Handle file attachment response
     * @param {Object} response - Upload response
     * @public
     */
    fileUploadResult(response) {
        try {
            // this.logInfo('File attachment response:', response);

            const filename = (typeof response.file_on === 'string') ?
                response.file_on : response.file_on[0];
            const fileSn = (typeof response.file_sn === 'string') ?
                response.file_sn : response.file_sn[0];


            $(this._elements.FileNameField).attr({
                'title': filename,
                'data-file-on': response.file_on.join(','),
                'data-file-sn': response.file_sn.join(',')
            }).val(this._getAttachFileName(filename));



            this._updateAttachmentState(true);

        } catch (error) {
            // this.logError('fileUploadResult', error);
            // this._handleError('fileUploadResult', error);
        }
    }

    _buildUploadParams() {
        const params = {
            subfolder: 'ContactSupport',
            recordtype: 'ContactSupport'
        };

        return params;
    }

    /**
     * Handle file input change
     * @param {Event} e - Change event
     * @public
     */
    async handleFileChange(e) {
        try {
            const file = e.target.files[0];
            if (!file) return;

            const validation = this._validateUploadFile(file);

            if (validation.VALID) {
                // Call file upload function
                const uploadParams = this._buildUploadParams();
                const results = await this._fileUploader.makeRequest([file], uploadParams);

                this._state.lastUploadResults = results;

                this.fileUploadResult(results);
                this._updateAttachmentState(true);
            } else {
                // Send error mail for file upload failure
                /* this.errorMailWithFallback(this._state.error_codes.file_upload_fail, {
                    filename: file.name,
                    filesize: file.size,
                    error: validation.message
                }); */
            }

        } catch (error) {
            // this.logError('handleFileChange', error);
            // this._handleError('HANDLE_FILE_CHANGE', error);
        }
    }

    /**
     * Handle trash icon click
     * @param {Event} e - Click event
     * @public
     */
    handleTrashClick(e) {
        try {
            this._clearFileAttachment();

            const trashIcon = this.Panel.querySelector('#fa-trash-send');
            if (trashIcon) {
                trashIcon.classList.add('ds-none');
            }

        } catch (error) {
            // this.logError('handleTrashClick', error);
            // this._handleError('HANDLE_TRASH_CLICK', error);
        }
    }

    /**
     * Override closeDialog to handle redirect mode
     * @public
     */
    closeDialog() {
        try {
            // this.logInfo('Closing SupportMailDialog...');

            // Handle redirect mode
            if (this.MODE.redirect) {
                this._redirectCurrentSession();
                return;
            }

            // Call parent close method
            super.closeDialog();

        } catch (error) {
            // this.logError('closeDialog', error);
            // this._handleError('CLOSE_DIALOG', error);
        }
    }

    // =================== PRIVATE METHODS ===================

    /**
     * Initialize DOM elements
     * @private
     */
    _initializeDOMElements() {
        if (!this.Panel) {
            throw new Error('Panel not available for SupportMailDialog');
        }

        this._elements = {
            ToMail: this.Panel.querySelector('#To_Mail'),
            FromMail: this.Panel.querySelector('#FromMail'),
            SubjectValue: this.Panel.querySelector('#sub_value'),
            CCValue: this.Panel.querySelector('#CCMail'),
            BODY_INPUT: this.Panel.querySelector('#body_text'),
            SendImg: this.Panel.querySelector('#SendImg'),
            InputAttach: this.Panel.querySelector('#inputAttachMail'),
            ShareSubmit: this.Panel.querySelector('#Submit_send'),
            CancelBtnOpt: this.Panel.querySelector('#Cancel_send'),
            FileNameField: this.Panel.querySelector('#insert_file_mail'),
            BrowserInfoDiv: this.Panel.querySelector('#fetch_browser_div'),
            SendBrowserInfo: this.Panel.querySelector('#send_browser_check'),
            BrowserInfoCollapse: null
        };

        if (this._elements.BrowserInfoDiv) {
            this._elements.BrowserInfoCollapse = this._elements.BrowserInfoDiv.querySelector(".collapse");
        }

        // Validate critical elements
        if (!this._elements.CCValue || !this._elements.ShareSubmit || !this._elements.BODY_INPUT) {
            throw new Error('Critical DOM elements not found');
        }

        this.ccEmailHelper = new emailInputHelper(this._elements.CCValue, {
            emailRegex: this._state.emailValidation.mailIdRegex,
            limit: this._state.emailValidation.limit,
        });

        // Button events
        if (this._elements.CancelBtnOpt) {
            this._elements.CancelBtnOpt.onclick = () => this.closeDialog();
        }

        if (this._elements.ShareSubmit) {
            this._elements.ShareSubmit.onclick = this.fireOnce;
        }

        if (this._elements.SendImg) {
            this._elements.SendImg.onclick = this.fileUpload;
        }

        if (this._elements.SendBrowserInfo) {
            this._elements.SendBrowserInfo.onclick = this.AddBrowserInfo;
        }

        if (this._elements.InputAttach) {
            this._elements.InputAttach.addEventListener("click", this.InputAttachEvent);
            this._elements.InputAttach.onchange = this.handleFileChange;
        }

        // This will handle clicks even if #contact_support is added later


        // Trash icon
        const trashIcon = this.Panel.querySelector('#fa-trash-send');
        if (trashIcon) {
            trashIcon.onclick = this.handleTrashClick;
        }
    }

    /**
     * Prepare error mail content
     * @param {string} errorCode - Error code
     * @param {Object} errorData - Error data
     * @private
     */
    _prepareErrorMail(errorCode, errorData = {}) {
        try {
            var docId = window.GET_DOC_ID ? window.GET_DOC_ID() : (typeof DOC_ID !== 'undefined' ? DOC_ID : '');
            const template = this._state.error_templates[errorCode];
            if (!template) {
                // this.logWarn(`No template found for error code: ${errorCode}`);
                return;
            }

            // Prepare template data
            const templateData = {
                docId: docId,
                userEmail: typeof USER_INFO !== 'undefined' ? USER_INFO.MAIL_ID : 'N/A',
                timestamp: new Date().toISOString(),
                ...errorData
            };

            // Set subject
            var subject = this._replaceTemplateVars(template.subject, templateData);
            if (this._elements.SubjectValue) {
                this._elements.SubjectValue.value = subject;
            }

            // Set body
            // if (this._elements.BodyValue) {}
            const body = this._replaceTemplateVars(template.body, templateData);
            const fullBody = `
                    <div class="error-report">
                        <h3>Automatic Error Report</h3>
                        <p><strong>Error Code:</strong> ${errorCode}</p>
                        <p>${body}</p>
                        <hr>
                        <p><strong>Additional Information:</strong></p>
                        <ul>
                            <li>Document: ${templateData.docId}</li>
                            <li>User: ${templateData.userEmail}</li>
                            <li>Time: ${templateData.timestamp}</li>
                            <li>Browser: ${navigator.userAgent}</li>
                        </ul>
                    </div>
                `;

            this.MODE.mailBody = fullBody;
            // Set mode for automatic sending
            this.MODE.auto_send = true;
            this.MODE.error_code = errorCode;
        } catch (error) {
            this.logError('_prepareErrorMail', error);
        }
    }

    /**
     * Replace template variables
     * @param {string} template - Template string
     * @param {Object} data - Data object
     * @returns {string} Processed string
     * @private
     */
    _replaceTemplateVars(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || match;
        });
    }

    /**
     * Add user email to CC section
     * @private
     */
    _addUserEmailToCC() {
        if (!this._elements.CCValue || typeof USER_INFO === 'undefined') return;

        if (this.ccEmailHelper) {
            this.ccEmailHelper.addEmailChip(USER_INFO.MAIL_ID);
            return;
        }        
    }

    /**
     * Initialize Summernote editor
     * @private
     */
    _initializeSummernote() {
        this.setupSummerNote();
        if (this._elements.BODY_INPUT && typeof $ !== 'undefined' && $.fn.summernote) {
            const config = this.SUMMERNOTE_CONFIG || {};
            if (this._summernote) this._summernote.bindTarget(this._elements.BODY_INPUT, { resetCache: true });
            $(this._elements.BODY_INPUT).summernote(config);
            this._elements.BodyValue = this.Panel.querySelector('.note-editable');
        }
    }

    /**
     * Destroy Summernote editor
     * @private
     */
    _destroySummernote() {
        if (this._elements.BODY_INPUT && typeof $ !== 'undefined' && $.fn.summernote) {
            $(this._elements.BODY_INPUT).summernote('destroy');
        }
    }

    /**
     * Setup from email display
     * @private
     */
    _setupFromEmail() {
        if (this._elements.FromMail && typeof USER_INFO !== 'undefined') {
            this._elements.FromMail.innerHTML = USER_INFO.MAIL_ID_PREFIX || '';
            this._elements.FromMail.setAttribute('title', USER_INFO.MAIL_ID || '');
        }

        // Update prefix text
        const prefixSpan = $('span[for="Prefix_text"]');
        if (prefixSpan.length && typeof SHARED_KEY !== 'undefined') {
            prefixSpan.text(SHARED_KEY.identifier || '');
        }
    }

    /**
     * Show instruction alert
     * @private
     */
    _showInstructionAlert() {
        if (typeof AlertNewDialog !== 'undefined') {
            AlertNewDialog.fire('info', '', 'InstructUserMail', 'Ok', '');
        }
    }

    /**
     * Update submit button state
     * @private
     */
    _updateSubmitButtonState() {
        const isValid = this._elements.BodyValue &&
            this._elements.BodyValue.innerHTML !== '' &&
            !this._elements.CCValue.classList.contains('is-invalid');

        this._elements.ShareSubmit.classList[isValid ? 'remove' : 'add']('disabled');
    }
   

    /**
     * Read existing CC chip addresses.
     * @returns {Array<string>} Existing CC emails
     * @private
     */
    _getExistingCcEmails() {
        const emails = [];
        const nodes = this.Panel ? this.Panel.querySelectorAll('.cc_mail') : document.querySelectorAll('.cc_mail');

        nodes.forEach(element => {
            const email = element.getAttribute('data-email');
            if (email) {
                emails.push(email);
            }
        });

        return emails;
    }   
    

    /**
     * Collect all CC emails
     * @returns {Array} Array of email addresses
     * @private
     */
    _collectCCEmails() {
        if (this.ccEmailHelper) {
            return this.ccEmailHelper.collectEmails();
        }

        return [];
    }

    /**
     * Prepare mail object
     * @param {Array} ccEmails - CC email addresses
     * @returns {Object} Mail object
     * @private
     */
    _prepareMailObject(ccEmails) {

        var bcc = "";
        try {
            var emailInfo = GET_SENDER_RECEIVER_ID('Error_Mail');
            bcc = emailInfo && emailInfo.bcc ? emailInfo.bcc : "";
        } catch (e) {
            console.warn("Failed to get BCC:", e.message);
            bcc = "";
        }

        let message = this.MODE.error_code ? this.MODE.mailBody : this._elements.BodyValue ? this._elements.BodyValue.innerHTML : '';
        let subject = this._buildEmailSubject() + (this.MODE.error_code ? this.MODE.subject : '');
        const mailObj = {
            tbl: 'writeMailTeam',
            find: {
                id: '610a4cd05e311ebaf978ef78'
            },
            emailto: this._getHelpDeskEmail(),
            emailfrom: typeof USER_INFO !== 'undefined' ? USER_INFO.MAIL_ID : '',
            emailSubject: subject,
            emailMessage: message,
            emailCC: ccEmails.join(','),
            emailBCC: bcc
        };

        // Add common properties
        const commonObj = typeof GET_JSON !== 'undefined' ? GET_JSON("contact_support") : {};
        Object.assign(mailObj, commonObj);

        // Add file attachment if present
        const fileObj = this._getFileAttachmentObject();
        if (fileObj) {
            Object.assign(mailObj, fileObj);
        }

        // Add error tracking if this is an error mail
        if (this.MODE.error_code) {
            mailObj.error_code = this.MODE.error_code;
            mailObj.auto_generated = true;
        }

        return mailObj;
    }

    /**
     * Get help desk email
     * @returns {string} Help desk email
     * @private
     */
    _getHelpDeskEmail() {
        if (typeof GET_SENDER_RECEIVER_ID !== 'undefined') {
            const helpDesk = GET_SENDER_RECEIVER_ID('HELP_DESK');
            return helpDesk.TEXT || '';
        }
        return '';
    }

    /**
     * Build email subject
     * @returns {string} Email subject
     * @private
     */
    _buildEmailSubject() {
        let subject = '';

        if (typeof SHARED_KEY !== 'undefined' && SHARED_KEY.identifier) {
            subject = SHARED_KEY.identifier + ': ';
        }

        if (this._elements.SubjectValue) {
            subject += this._elements.SubjectValue.value;
        }

        return subject;
    }

    /**
     * Get file attachment object
     * @returns {Object|null} File attachment object
     * @private
     */
    _getFileAttachmentObject() {
        const { lastUploadResults } = this._state || {};

        const normalize = val => Array.isArray(val) ? val[0] : val;

        return {
            orgnamelist: lastUploadResults?.file_on ? [normalize(lastUploadResults.file_on)] : [],
            fileslist: lastUploadResults?.file_sn ? [normalize(lastUploadResults.file_sn)] : [],
            sopt: "openstorage",
            subfolder: "ContactSupport",
            recordtype: "ContactSupport"
        };
    }


    /**
     * Setup share timeout
     * @param {Object} mailObj - Mail object
     * @private
     */
    _setupShareTimeout(mailObj) {
        setTimeout(() => {
            if (!this.IsShared) {
                this.handleMailResponse({
                    r: 2,
                    mail: mailObj.emailto
                });
            }
        }, this._state.shareTimeout);
    }

    /**
  * Record mail to database (fire and forget)
  * @param {Object} mailObj - Mail object
  * @private
  */
    _recordMailToDB(mailObj) {
        void this.apiService
            .makeRequest("updateorinsert", mailObj, { isPayloadLogic: true })
            .then((response) => {
                if (response?.r === 1) {
                    // this.logInfo("Mail record updated successfully");
                } else {
                    // this.logWarn("Mail record update failed", response);
                }
            })
            .catch((error) => {
                this.logError("_recordMailToDB", error);
            });
    }


    /**
     * Clear file attachment
     * @private
     */
    _clearFileAttachment() {
        if (this._elements.FileNameField) {
            this._elements.FileNameField.value = '';
        }

        if (this._elements.InputAttach) {
            this._elements.InputAttach.value = '';
        }

        const trashIcon = this.Panel?.querySelector('#fa-trash-send');
        if (trashIcon) {
            trashIcon.classList.add('ds-none');
        }
    }

    /**
     * Remove all CC emails
     * @private
     */
    _removeAllCCEmails() {
        document.querySelectorAll('.cc_mail').forEach(element => {
            // Don't remove user's own email
            if (typeof USER_INFO !== 'undefined' &&
                element.getAttribute('data-email') !== USER_INFO.MAIL_ID) {
                element.remove();
            }
        });
    }

    /**
     * Reset browser info
     * @private
     */
    _resetBrowserInfo() {
        if (this._elements.BrowserInfoCollapse) {
            this._elements.BrowserInfoCollapse.classList.remove("show");
        }

        if (this._elements.SendBrowserInfo) {
            this._elements.SendBrowserInfo.checked = false;
        }
    }

    /**
     * Update attachment state
     * @param {boolean} showTrash - Whether to show trash icon
     * @private
     */
    _updateAttachmentState(showTrash) {
        const trashIcon = this.Panel.querySelector('#fa-trash-send');
        const spinner = this.Panel.querySelector('#spinner-contact-supp');

        if (trashIcon) {
            trashIcon.classList[showTrash ? 'remove' : 'add']('ds-none');
        }

        if (spinner) {
            spinner.classList[showTrash ? 'add' : 'remove']('ds-none');
        }
    }

    /**
     * Get browser info template
     * @param {string} os - Operating system
     * @param {string} osVersion - OS version
     * @param {string} browser - Browser name
     * @param {string} version - Browser version
     * @param {string} screenSize - Screen size
     * @returns {string} HTML template
     * @private
     */
    _getBrowserInfoTemplate(os, osVersion, browser, version, screenSize) {
        return `<div class="browser_info">
            <table>
                <tr>
                    <td>Operating System</td>
                    <td>${os} ${osVersion}</td>
                </tr>
                <tr>
                    <td>Browser Details</td>
                    <td>${browser} ${version}</td>
                </tr>
                <tr>
                    <td>Screen-Size</td>
                    <td>${screenSize}</td>
                </tr>
            </table>
        </div>`;
    }

    /**
     * Get attachment file name for display
     * @param {string} filename - Full filename
     * @returns {string} Display filename
     * @private
     */
    _getAttachFileName(filename) {
        // Check if getAttachFileName method exists on string prototype
        if (typeof filename.getAttachFileName === 'function') {
            return filename.getAttachFileName('floatPanel');
        }

        // Fallback: truncate long filenames
        const maxLength = 30;
        if (filename.length > maxLength) {
            const extension = filename.substring(filename.lastIndexOf('.'));
            const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
            const truncated = nameWithoutExt.substring(0, maxLength - extension.length - 3) + '...';
            return truncated + extension;
        }

        return filename;
    }

    /**
     * Validate upload file
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateUploadFile(file) {
        // Check if global validation function exists
        if (typeof VALIDATE_UPLOAD_FILE !== 'undefined') {
            return VALIDATE_UPLOAD_FILE(file, {
                limit: this._state.fileUploadLimit,
                show_alert: true,
                from: 'contact-support'
            });
        }

        // Fallback validation
        // Convert MB to bytes
        const maxSize = this._state.fileUploadLimit * 1024 * 1024;

        if (file.size > maxSize) {
            this._showToasterAlert('FileSizeExceeded', { type: 'warning' });
            return { VALID: false, message: 'File size exceeds limit' };
        }

        return { VALID: true };
    }

    /**
     * Show toaster alert
     * @param {string} alertType - Alert type
     * @param {Object} options - Alert options
     * @private
     */
    _showToasterAlert(alertType, options = {}) {
        if (typeof TOASTER_ALERT !== 'undefined') {
            TOASTER_ALERT(alertType, options);
        } else {
            // Fallback to console
            const message = this._getAlertMessage(alertType);
            if (options.type === 'warning') {
                console.warn(message);
            } else {
                console.log(message);
            }
        }
    }

    /**
     * Get alert message
     * @param {string} alertType - Alert type
     * @returns {string} Alert message
     * @private
     */
    _getAlertMessage(alertType) {
        const messages = {
            'ErrorAutofireOnce': 'Error sending mail - timeout occurred',
            'WriteMailToTeam': 'Mail sent successfully',
            'FileSizeExceeded': 'File size exceeds the allowed limit',
            'InvalidEmail': 'Please enter a valid email address'
        };

        return messages[alertType] || alertType;
    }

    /**
     * Redirect current session
     * @private
     */
    _redirectCurrentSession() {
        if (typeof RE_DIRECT_CUR_SESSION !== 'undefined') {
            RE_DIRECT_CUR_SESSION();
        } else {
            // Fallback redirect
            window.location.reload();
        }
    }

    /**
     * Handle error with logging and optional alert
     * @param {string} context - Error context
     * @param {Error} error - Error object
     * @private
     */
    _handleError(context, error) {
        const errorMessage = `${context}: ${error.message}`;

        // Log to error tracking if available
        if (typeof ErrorLogTrace !== 'undefined') {
            ErrorLogTrace(context, error.message);
        }

        // Log to console
        console.error(`[SupportMailDialog] ${errorMessage}`, error);

        // Store error for debugging
        this._lastError = {
            context,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
    }

    // =================== STATIC METHODS ===================

    /**
     * Factory method to create dialog instance
     * @param {string} name - Module name
     * @param {Object} errorTracker - Error tracker
     * @param {Object} options - Configuration options
     * @returns {SupportMailDialog} Dialog instance
     * @static
     */
    static create(name = 'SupportMailDialog', errorTracker = null, options = {}) {
        return new SupportMailDialog(name, errorTracker, options);
    }

    /**
     * Get version information
     * @returns {Object} Version info
     * @static
     */
    static getVersion() {
        return {
            version: '2.1.0',
            baseModule: true,
            features: ['email-validation', 'file-attachment', 'browser-info', 'summernote', 'error-reporting']
        };
    }
}

export default SupportMailDialog;



/**
 * 
 // =================== INITIALIZATION ===================
 *

// Create global instance for backward compatibility
if (typeof window !== 'undefined') {
    window.SupportMailDialog = SupportMailDialog.create();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.SupportMailDialog.initLoop();
        });
    } else {
        // DOM already loaded
        window.SupportMailDialog.initLoop();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupportMailDialog;
}
 * 
 * USAGE EXAMPLES:
 * 
 // Basic usage (global instance)
 *
 * SupportMailDialog.showLoop();
 * 
 // With options
 *
 * SupportMailDialog.showLoop({ 
 *     show_warn: false,
 *     redirect: true 
 * });
 * 
 // Send automatic error mail
 *
 * SupportMailDialog.errorMailWithFallback('am_001', {
 *     expected: 10,
 *     found: 5
 * });
 * 
 // Send CJK mismatch error
 *
 * SupportMailDialog.errorMailWithFallback('cjk_001', {
 *     original: 100,
 *     current: 95
 * });
 * 
 // Send query mismatch error
 *
 * SupportMailDialog.errorMailWithFallback('qry_001', {
 *     expected: 20,
 *     found: 18
 * });
 * 
 // Create new instance
 *
 * const mailDialog = new SupportMailDialog('CustomMail', errorTracker, {
 // 20MB limit
 *     fileUploadLimit: 20
 * });
 * 
 // Programmatic mail sending
 *
 * await mailDialog.fireOnce();
 * 
 // Reset dialog
 *
 * mailDialog.reset();
 * 
 // Add CC email programmatically
 *
 * mailDialog._addCCEmail('user@example.com');
 * 
 // Handle file attachment
 *
 * mailDialog.fileUploadResult({
 *     file_on: ['document.pdf'],
 *     file_sn: ['doc_123.pdf']
 * });
 */

