/**
 * DEV REMARK
 * Date: 2026-03-17
 * Client: OXMEDO
 * Update: Float renumbering logic for figures/tables (see docs/float-renumbering.md).
 * - Handles single, double, and three-digit float labels.
 * - Uses prefixMap to track and generate next label (e.g., "Figure 1.1.3").
 * - Ensures consistent, sequential labeling for all float types.
 * - Refer to float-renumbering.md for detailed input/output and logic explanation.
 */


/**
 ** Enhanced CKEditor Floats Group Module
 ** Handles figure and table insertion/editing with improved architecture
 **
 **
 ** function list 
 **  FIRE_INSERT_REPLACE
 **     _handleElementInsert
 **          handleInsertEditor

*/




class FloatsGroupModule extends BaseModule {
    constructor(name, errorTracker, options = {}) {
        super(name, errorTracker, options);
        this.initializeProperties();
        this.initializeState();
        this.initializeLoop();
        this.bindMethods();
        this.initiated = true;

    }

    /**
     * Initialize module state
     */
    initializeState() {
        this._state = {
            currentItem: null,
            existingItem: null,
            isEditMode: false,
            isInsertMode: true,
            isFigure: false,
            isTable: false,
            isNewInsert: false,
            type: null,
            currentConfig: null,
            currentTemplate: null,
            beforeAlertShown: {}
        };

        this.clientFlags = {
            isOHO: false,
            isOSO: false,
            isTNF: false,
            isOXMEDO: false
        };
    }

    /**
     * Initialize module properties and configuration
     */
    initializeProperties() {
        // this.templateList = {};
        this.elements = {};
        this.canUnmountComponentWhileClose = true;
        this.autoInitiated = false;
        this.fullyLoaded = false;

        this._formatter = new RangeFormatter({});

        this.Get_Set_Part_Label = Get_Set_Part_Label;
        // this._reNumber = new CheckOrder("fig");
        //  default pliging
        if (!this._fileUploader) this._fileUploader = new FileUploadModule(API_UPLOAD_MULTI);

        // Element selectors mapping
        this.ELEMENT_SELECTORS = {
            Body: ".dialog-body",
            LAB_INPUT: "#label",
            CAPTION_INPUT: "#caption-input",
            IMG_UPLOAD_INPUT: "#imageUploadInput",
            IMG_NAME_DISPLAY_INPUT: "#imageFileNameDisplay",
            IMG_UPLOAD_BTN: "#btnUploadImage",
            // ? select.selectdropdown#figSelectOpt || select.selectdropdown#tabSelectOpt
            CHANGE_SELECT_ITEM: "",
            INSERT_BTN: "#insert_btn",
            REPLACE_BTN: "#replace_btn",
            CANCEL_BTN: "#cancel_btn",
            AddNoteOpt: "#addnoteOption",
            AddNoteGrup: "#addnoteGroup",
            BodyField: "#Insert-field",
            HeaderLabelProcess: "#label_process",
            HeaderLabelType: "#label_type",
            FLOAT_MENU_TYPE: "#FloatTypeMenu",
            FormArea: "#formFloats",
            FigureOpt: "#figureOptions",
            FigureNotesOpt: "#fig_notes",
            TableOpt: "#tableOptions",
            TableRow: "#tabRow",
            TableCol: "#tabCols",
            TableHeader: "#tabheader",
            FLOAT_SPINNER: "#FloatSpinner",
            FLOAT_TRASH_ICON: "#FloatTrashIcon",
            FLOAT_IMAGE_SECTION: "#FloatUploadButton",
            ATTACH_SECTION: "#attachSection"
        };

        // Supported float types
        this.FLOAT_TYPES = Object.freeze(['figure', 'table', 'box', 'eqtn']);

        // Toast messages
        this.TOASTER_MESSAGE = Object.assign(this.TOASTER_MESSAGE || {}, {
            AltText30MB: {
                text: "Note: Images greater than 30MB will not be displayed in the editor, instead they will be processed separately for inclusion in the final proof."
            },
            replaceImageWarn: {
                text: "Replacement Image will be replaced in the final proof"
            },
            tableSizeWarning: {
                text: "Table size exceeds recommended limits"
            },
            unSupportFormat: {
                text: 'Unsupported file format. Only JPG, JPEG, and PNG formats are supported for web display.<br><br><strong>For other file types, please upload them as an attachment using the Add Comments option.</strong>'
            },
            exceedImageSize100: {
                // ? Mantis_ID 1798594: size 30 to 100MB
                'text': 'Make sure the file size doesn’t exceed 100 MB.'
            },
            exceedMultiImageSize500: {
                // ? Mantis_ID 1798594: size 100 to 500MB
                'text': 'Please ensure the file size remains below 500 MB. To continue, you may need to remove some files.'
            },
            exceedImageSize100WithMailAlert: {
                'text': 'File size exceeds 100MB limit. Please contact "<strong>{{journalEmail}}</strong>" to upload your replacement file(s) using another method.'
            },
            noFileSelected: {
                'text': 'No file selected. (Allowed formats are jpg, jpeg and png). Please choose a file to upload.'
            }

        });

        this.FILE_CONFIG = Object.assign(this.FILE_CONFIG || {}, {
            // MB
            MAX_SINGLE_FILE_SIZE: 30,
            // MB
            MAX_FILE_SIZE_LIMIT: 100,
            // MB
            MAX_MULTI_FILE_SIZE: 500,
            ALLOWED_EXTENSIONS: /(\.jpg|\.jpeg|\.png)$/i,
            SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png']
        });

        // Configuration constants
        this.CONFIG = Object.assign(this.CONFIG || {}, {
            MAX_ROW_SIZE: 25,
            DEFAULT_ROW_SIZE: 1,
            MAX_TEXT_LENGTH: 45,
            // MB
            IMAGE_SIZE_LIMIT: 30,
        });
        this.EXISTING_DATA = {
            ORG_NAME: "",
            FORMAT: "",
            DB_ID: "",
            FILE_ID: ""
        };
        this.UPLOAD_DATA = {
            WARN: "",
            SIZE: "",
            NAME: "",
            FILE: "",
            FORMAT: ""
        };

        this.Utils = {};

        this.Utils.shouldAppendNumber = function(label, id, number = '1') {
            const hasDigit = /\d/.test(label);
            const endsWithNum = new RegExp(`${number}$`).test(id);
            return !hasDigit && endsWithNum;
        };
        this.Utils.stripTrailingPunct = (str) => str.replace(/[.:|)]$/, '').trim();

        this.Utils.appendNumberIfNeeded = function(label, id, number = null) {
            if (!label || !id) return label;

            // Extract number from id if not explicitly provided
            if (!number) {
                const match = id.match(/\d+/);
                // Default to '1' if no digit found
                number = match ? match[0] : '1';
            }

            if (this.shouldAppendNumber(label, id, number)) {
                label = label.trim();
                const lastChar = label.slice(-1);
                const isValidSeparator = ['.', ':'].includes(lastChar);
                const separator = isValidSeparator ? lastChar : '.';

                const baseLabel = isValidSeparator ? label.slice(0, -1) : label;
                return `${baseLabel} ${number}${separator}`;
            }

            return label;
        };
    }


    /**
     * Bind methods to maintain context
     */
    bindMethods() {
        const methodsToBind = [
            'assignVariablesAndEvents',
            'initializeLoop',
            'showLoop',
            'handleChange',
            'handleDelete',
            'handleInsert',
            'FIRE_INSERT_REPLACE',
            'handleReNumber',
            'setupEventListeners',
            'validateTableInput',
            'handleImageUpload',
            "_closeDialog",
            'handleFileSelection'
        ];

        methodsToBind.forEach(method => {
            if (typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            }
        });
    }

    /**
     * Initialize module elements and event listeners
     */
    assignVariablesAndEvents() {
        try {
            this.cacheElements();
            this.setupEventListeners();
            // this.hideInitialElements();
        } catch (error) {
            this.trackError('assignVariablesAndEvents', error);
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {};

        Object.entries(this.ELEMENT_SELECTORS).forEach(([key, selector]) => {
            if (selector) {
                const element = this.Panel.querySelector(selector);
                if (element) {
                    this.elements[key] = element;
                }
            }
        });
    }

    /**
     * Setup event listeners for interactive elements
     */
    setupEventListeners() {
        const {
            CHANGE_SELECT_ITEM,
            CANCEL_BTN,
            INSERT_BTN,
            IMG_UPLOAD_BTN,
            IMG_UPLOAD_INPUT,
            IMG_NAME_DISPLAY_INPUT,
            REPLACE_BTN
        } = this.elements;

        // Main control buttons
        this.addEventListener(CHANGE_SELECT_ITEM, 'change', this.handleChange);
        this.addEventListener(CANCEL_BTN, 'click', this._closeDialog);
        this.addEventListener(INSERT_BTN, 'click', this.FIRE_INSERT_REPLACE);
        this.addEventListener(REPLACE_BTN, 'click', this.FIRE_INSERT_REPLACE);

        const isFloat = this.isFloatType(this._state.currentItem);
        // File upload controls
        if (!isFloat) {
            this.setupNoteSection();
        } else {
            this.setupFloatSection();
        }
    }
    setupFigureInputHandlers() {
        const {
            IMG_UPLOAD_BTN,
            IMG_UPLOAD_INPUT,
            IMG_NAME_DISPLAY_INPUT
        } = this.elements;
        if (IMG_UPLOAD_BTN && IMG_UPLOAD_INPUT && IMG_NAME_DISPLAY_INPUT) {
            this.addEventListener(IMG_UPLOAD_BTN, 'click', () => {
                debug.log('---click----');
                this.resetFileInput(IMG_NAME_DISPLAY_INPUT);
                IMG_UPLOAD_INPUT.click();
            });
            this.addEventListener(IMG_UPLOAD_INPUT, 'change', this.handleFileSelection);
        }
    }

    /**
     * Safe event listener attachment
     */
    addEventListener(element, event, handler) {
        if (element && typeof handler === 'function') {
            element.addEventListener(event, handler);
        }
    }

    /**
     * Hide elements that should be initially hidden
     */
    hideInitialElements() {
        // this.hideElement(this.elements.FigureNotesOpt);
    }

    /**
     * Initialize module loop
     */
    initializeLoop() {
        try {
            this.autoInitiated = true;
            this.loadConfiguration();
            this.initializeClientFlags();
            // this.initializeUtilities();
            this.fullyLoaded = true;
        } catch (error) {
            this.trackError('initializeLoop', error);
        }
    }

    /**
     * Load module configuration
     */
    loadConfiguration() {
        try {
            const floatsConfig = this.getConfigurationItem("floats", {
                CONVERT_JSON: true,
                children: true,
                attr: true,
                hex2string: true,
                keyUpperCase: false,
                fromTemplate: true
            });
            const groupConfig = this.getConfigurationItem(`[name="floatGroup"]`, {
                CONVERT_JSON: true,
                attr: true,
                children: true,
                keyUpperCase: false
            });

            if (groupConfig.renumber !== undefined) {
                if (groupConfig.renumberItemId === undefined) {
                    groupConfig.renumberItemId = groupConfig.renumber;
                }
                if (groupConfig.renumberCitationRid === undefined) {
                    groupConfig.renumberCitationRid = groupConfig.renumber;
                }
            }

            this._state.templateList = Object.assign({}, this._state.templateList, floatsConfig);

            this.M_CONFIG = Object.assign({}, this.M_CONFIG, groupConfig, {
                SHOW_CONTEXT_GROUP: this.isContextMenuEnabled('floatGroup')
            });

        } catch (error) {
            this.trackError('loadConfiguration', error);
        }
    }

    /**
     * Initialize client-specific flags
     */
    initializeClientFlags() {
        try {
            const clientName = this.getClientName().toUpperCase() || '';
            this._state.clientFlags = {
                isOHO: clientName === "OHO",
                isOSO: clientName === "OSO",
                isTNF: clientName === "TNF",
                isOXMEDO: clientName === "OXMEDO"
            };
        } catch (error) {
            this.trackError('initializeClientFlags', error);
        }
    }

    /**
     * Initialize utility classes
     */
    initializeUtilities() {
        // this._state.formatter = new RangeFormatter({});
        // this._state.reNumber = new CheckOrder("float");
    }

    setCursor(id) {
        try {
            var doc = this.editor.document;
            var selection = this.editor.getSelection();
            var range = this.editor.createRange();

            var elm = doc.getById(id);

            selection.removeAllRanges();

            range.moveToElementEditablePosition(elm, true);

            selection.selectRanges([range]);
            // this.editor.focus();
            IMPACT_SELECTION.getInfo(this.editor, {});
        } catch (error) {

        }
    }

    openCommentDialog(command = "ADD_FIG") {

        try {
            const trackCodeByCommand = {
                ADD_FIG: "fig-01",
                REPLACE_FIG: "fig-02"
            };
            const trackCode = trackCodeByCommand[command] || command;
            const el = IMPACT_SELECTION.NODE;
            const figureEl = el && el.$.closest(".fig");
            const caption = figureEl && figureEl.querySelector(".caption");
            const id = caption && caption.getAttribute("id");
            if (caption) {
                this.setCursor(id);
            }
            setTimeout(() => {
                var attVal = `data-track-code="${trackCode}"`;
                var contentRequired = command == "ADD_FIG";
                window.queryDialog.open(null, 'comment', {
                    forceOpen: true,
                    addFlag: command,
                    addAttr: attVal,

                    isAttachmentRequired: true,
                    hasAllowedMultipleAttach: true,
                    isInputContentRequired: contentRequired,
                    hasContentLimit: false
                });
            }, 500);

        } catch (err) {
            console.warn("openCommentDialog error:", err.message);
        }
    }

    // 3489439: Disable Figure Replacement Option For Author Role (LWW only)
    showBefore(typeId, existingItem = null, action) {

        if (action.toLowerCase().includes("table")) {
            return true;
        }

        const command = action === "addFigure" ? "ADD_FIG" : "REPLACE_FIG";
        const ctmenu = action === "addFigure" ? "AddFigure" : "ReplaceFigure";
        const configKey = action === "addFigure" ? "figure" : "replaceFigure";

        const showDialog = (() => {

            const selector = USER_INFO && USER_INFO.SELECTOR_SHOW_HIDE;
            const config = floatsModule && floatsModule.M_CONFIG;
            var defaultState = config[configKey]["show"] == "true";
            if (config && Object.keys(config).length > 0 && config[configKey]) {
                if (selector in config[configKey]) {
                    var roleState = config[configKey][selector] == "true";
                    return roleState;
                }
                return defaultState;
            }

            return IsContextMenu(ctmenu);

        })();

        if (showDialog == true) {
            return true;
        }

        var self = this;


        setTimeout(() => {

            if (this._state.beforeAlertShown[action] == true) {
                self.openCommentDialog(command);
                return;
            }

            AlertNewDialog.fire("replaceImage2Command")
                .then(() => {
                    self._state.beforeAlertShown[action] = true;
                    setTimeout(() => {
                        self.openCommentDialog(command);
                    }, 250);
                })
                .catch(console.warn);

        }, 450);
    }

    /**
     * Main show loop for displaying the module
     */
    showLoop(typeId, existingItem = null, action) {
        try {

            this.prepareDialogState(typeId, existingItem);
            this.assignVariablesAndEvents();
            this.setupDialogForType();
            this.updateCurrentPatternState(null);
            // this.handleChange(null);
            this.handleRenumberCommon = new CheckOrder(this._state.renumberKey);
            this.handleRenumberCommon.setRenumberPolicy(this.M_CONFIG);

        } catch (error) {
            this.trackError('showLoop', error);
        }
    }
    bindDynamicChangeOptEvent() {
        // Dynamically determine the selector based on state
        const changeOptSelector = this._state.isFigure ?
            '#figSelectOpt' :
            this._state.isTable ?
            '#tabSelectOpt' :
            null;

        if (!changeOptSelector) return;

        this.ELEMENT_SELECTORS.CHANGE_SELECT_ITEM = changeOptSelector;

        // Show only the relevant one, hide the other
        const figEl = this.Panel.querySelector('#figSelectOpt');
        const tabEl = this.Panel.querySelector('#tabSelectOpt');

        this.toggleElementClass(figEl, 'd-none', !this._state.isFigure);
        this.toggleElementClass(tabEl, 'd-none', !this._state.isTable);
    }



    /**
     * Prepare dialog state based on type and existing item
     */
    prepareDialogState(typeId, existingItem = null) {
        this._state.currentItem = typeId;
        this._state.existingItem = existingItem;
        this._state.isEditMode = Boolean(existingItem);
        this._state.isInsertMode = !existingItem;
        this._state.isFigure = typeId === 'figure';
        this._state.isTable = typeId === 'table';
        this._state.renumberKey = this._state.isFigure ? "fig" : 'table';

        // default
        this._state.type = "fig";

        const menuElement = this.elements.FLOAT_MENU_TYPE || this.Panel.querySelector("#FloatTypeMenu");
        if (!menuElement) return;
        var activeElement = this.Panel.querySelector(".float-option-item#fig");
        Array.from(menuElement.children).forEach(element => {
            const isActive = element.id === this._state.currentItem;
            element.className = isActive ? 'float-option-item active' : 'ds-none';
            if (isActive) activeElement = element;
        });
        if (!activeElement) return;

        this._state.type = activeElement.getAttribute('data-div');
        const configKey = this._state.type.match('fig') ? 'Figure' : 'Table';
        this._state.currentConfig = this.G_CONFIG[configKey];
        this._state.currentTemplate = this._state.templateList[this._state.type];

        this.bindDynamicChangeOptEvent();
    }

    /**
     * Setup dialog based on current type
     */
    setupDialogForType() {
        const isFloat = this.isFloatType(this._state.currentItem);

        this.initializeFormatterForType();
        this.updateDialogTitle();
        // this.configureMenuVisibility();
        this.configureFloatsDisplay(isFloat);

        // if (!isFloat) {
        //     this.setupNoteSection();
        // } else {
        //     this.setupFloatSection();
        // }

        // this.setActiveType();
    }

    /**
     * Check if type is a float type
     */
    isFloatType(typeId) {
        return this.FLOAT_TYPES.includes(typeId);
    }

    /**
     * Initialize formatter for current type
     */
    initializeFormatterForType() {
        const configKey = this.capitalizeFirstLetter(this._state.currentItem);
        const config = this.G_CONFIG[configKey] || {};
        this._state.formatter = new RangeFormatter(config);
    }

    /**
     * Update dialog title
     */
    updateDialogTitle() {
        const titleElement = this.elements.HeaderLabelType;
        if (titleElement) {
            titleElement.textContent = this.capitalizeFirstLetter(this._state.currentItem);
        }
    }

    /**
     * Configure menu item visibility
     */
    configureMenuVisibility() {
        const menuElement = this.elements.FLOAT_MENU_TYPE;
        if (!menuElement) return;

        Array.from(menuElement.children).forEach(element => {
            const isActive = element.id === this._state.currentItem;
            element.className = isActive ? 'float-option-item active' : 'ds-none';
        });
    }

    /**
     * Configure floats display visibility
     */
    configureFloatsDisplay(isFloat) {
        isFloat = isFloat ? isFloat : this.isFloatType(this._state.currentItem);
        const formElement = this.elements.FormArea;

        if (formElement) {
            this.toggleElementClass(formElement, 'd-none', !isFloat);
        }
    }

    /**
     * Setup note section configuration
     */
    setupNoteSection() {
        const {
            Body,
            AddNoteOpt,
            BodyField
        } = this.elements;

        if (Body) {
            Body.setAttribute('contenteditable', 'true');
        }

        this.hideElement(AddNoteOpt);

        if (BodyField) {
            BodyField.classList.add('NoteView');
        }
    }

    /**
     * Setup float section (figure/table)
     */
    setupFloatSection() {
        this.configureFloatOptions();

        if (this._state.isFigure) {
            if (this._state.existingItem) {
                this.handleExistingFigure();
            }
            this.setupFigureInputHandlers();
        } else if (this._state.isTable) {
            this.setupTableInputHandlers();
        }

        this.initializeSummernote();
    }

    /**
     * Configure float options visibility
     */
    configureFloatOptions() {
        const optionMap = {
            FigureOpt: this._state.isFigure,
            TableOpt: !this._state.isFigure
        };

        for (const [key, shouldShow] of Object.entries(optionMap)) {
            const element = this.elements[key];
            if (element) {
                this.toggleElementClass(element, 'd-none', !shouldShow);
                this.hideConfiguredItems(element);
            }
        }
    }



    /**
     * Hide configured items based on configuration
     */
    hideConfiguredItems(container) {
        try {
            const config = this.M_CONFIG[this._state.currentItem] || null;
            if (!config || !config['newItemhide']) return;

            const hideItems = config['newItemhide'].split(',') || [];
            Array.from(hideItems).forEach(value => {
                const option = container.querySelector(`option[value="${value}"]`) ||
                    this.Panel.querySelector(`option[value="${value}"]`);
                if (option) {
                    option.remove();
                }
            });
        } catch (error) {
            this.trackError('hideConfiguredItems', error);
        }
    }




    /**
     * Handle existing figure editing
     */
    handleExistingFigure() {
        try {
            const {
                existingItem
            } = this._state;
            if (!existingItem || typeof existingItem.querySelector !== 'function') {
                return false;
            }

            const captionElement = existingItem.querySelector('.caption');
            const isLabelled = Boolean(captionElement);

            if (isLabelled) {
                this.processCaptionedFigure(captionElement);
            } else {
                this.processUncaptionedFigure();
            }

            let fileId = existingItem.id;
            let fileName = this.extractFileName(existingItem);
            let graphicEl = existingItem.querySelector('span.graphic');
            if (!graphicEl) {
                this.EXISTING_DATA.FILE_ID = fileId;
                this.EXISTING_DATA.DB_ID = "";
                this.EXISTING_DATA.ORG_NAME = fileName;
                this.configureExistingFigureUI(fileName);
                return true;
            }

            let dbId = graphicEl.getAttribute('data-db-id') || "";
            let hasOrgName = graphicEl.getAttribute('data-fig-org-name') || "";


            this.EXISTING_DATA.FILE_ID = fileId;
            // this.EXISTING_DATA.EX_NAME = fileName;
            this.EXISTING_DATA.DB_ID = dbId;
            this.EXISTING_DATA.ORG_NAME = hasOrgName || fileName;

            this.configureExistingFigureUI(fileName);
        } catch (error) {
            this.trackError('handleExistingFigure', error);
        }
    }

    /**
     * Process captioned figure
     */
    processCaptionedFigure(captionElement) {
        const captionText = this.truncateText(captionElement.innerText, this.CONFIG.MAX_TEXT_LENGTH);
        const label = captionElement.getAttribute('data-label') || '';

        this._state.isNewInsert = captionElement.hasAttribute('data-figure');

        const {
            CAPTION_INPUT,
            LAB_INPUT
        } = this.elements;
        if (CAPTION_INPUT) {
            CAPTION_INPUT.classList.add("disabled");
            CAPTION_INPUT.setAttribute("disabled", "");
            CAPTION_INPUT.setAttribute("readonly", "readonly");
            this.GetSetCaptionText(CAPTION_INPUT, {
                setInner: true,
                text: captionText
            });
        }
        if (LAB_INPUT) {
            LAB_INPUT.value = label;
        }
    }

    /**
     * Process uncaptioned figure
     */
    processUncaptionedFigure() {
        const {
            Body
        } = this.elements;
        if (Body) {
            Body.classList.add('inline');
        }
    }

    /**
     * Configure UI for existing figure
     */
    configureExistingFigureUI(fileName) {
        this.updateProcessHeader('Replace');
        this.updateFileName(fileName);
        this.updatePanelVisibility();
    }



    /**
     * Setup table-specific section
     */
    setupTableInputHandlers() {

        const {
            AddNoteOpt,
            TableCol,
            TableRow,
            TableHeader
        } = this.elements;


        if (AddNoteOpt) {
            AddNoteOpt.classList.add('tableView');
        }

        this.setupTableValidation([TableCol, TableRow, TableHeader]);
    }

    /**
     * Setup table input validation
     */
    setupTableValidation(inputs) {
        inputs.forEach((input, index) => {
            if (!input) return;

            input.addEventListener('input', () => {
                try {
                    this.validateTableInput(input, index, inputs);
                } catch (error) {
                    this.trackError('validateTableInput', error);
                }
            });
        });
    }

    /**
     * Validate table input values
     */
    validateTableInput(input, index, [colInput, rowInput, headerInput]) {
        const colCount = parseInt(colInput.value) || 0;
        const rowCount = parseInt(rowInput.value) || 0;
        const headerCount = parseInt(headerInput.value) || 0;

        // Validate columns and rows
        if (index <= 1) {
            this.validateTableSize(input);
            this.adjustHeaderCount(headerCount, rowCount, rowInput);
        } else {
            // Validate header count
            this.adjustRowCount(headerCount, rowCount, rowInput);
        }
    }

    /**
     * Validate table size limits
     */
    validateTableSize(input) {
        const value = parseInt(input.value) || 0;

        if (value >= 26) {
            this.showToast('tableSizeWarning', 'warning');
        }

        if (value === 0 || value > this.CONFIG.MAX_ROW_SIZE) {
            input.value = this.CONFIG.DEFAULT_ROW_SIZE;
        }
    }

    /**
     * Adjust header count based on row count
     */
    adjustHeaderCount(headerCount, rowCount, rowElement) {
        if (headerCount >= rowCount && rowElement) {
            rowElement.value = rowCount + 1;
        }
    }

    /**
     * Adjust row count based on header value
     */
    adjustRowCount(headerValue, rowCount, rowElement) {
        if (headerValue >= rowCount && rowElement) {
            rowElement.value = rowCount + 1;
        }
    }

    /**
     * Initialize Summernote editor for caption
     */
    initializeSummernote() {
        this.setupSummerNote();
        const {
            CAPTION_INPUT
        } = this.elements;
        const {
            isFigure,
            isTable,
            existingItem
        } = this._state;

        if (!CAPTION_INPUT) return;

        const shouldInitialize = isTable || (isFigure && !existingItem);

        if (shouldInitialize) {
            if (this._summernote) this._summernote.bindTarget(CAPTION_INPUT, {
                resetCache: true
            });
            $(CAPTION_INPUT).summernote(this.SUMMERNOTE_CONFIG || {});

        } else {
            this.destroySummernote(CAPTION_INPUT);
            this.Panel.querySelector('.dia_header_text').click();
        }
    }

    /**
     * Safely destroy Summernote instance
     */
    destroySummernote(element) {
        if (element && $(element).hasClass('note-editor')) {
            $(element).summernote('destroy');
        }
    }

    /**
     * Set active type configuration
     */
    // setActiveType() {
    //     const activeElement = this.Panel.querySelector('.float-option-item.active');
    //     if (!activeElement) return;

    //     this._state.type = activeElement.getAttribute('data-div');
    //     const configKey = this._state.type.match('fig') ? 'Figure' : 'Table';
    //     this._state.currentConfig = this.G_CONFIG[configKey];
    // }

    /**
     * Handle change in float selection
     */
    handleChange(event) {

        debug.log('Change event handled:', event);
        const {
            CHANGE_SELECT_ITEM,
            LAB_INPUT
        } = this.elements;
        const selectElement = CHANGE_SELECT_ITEM;
        const selectedLabel = selectElement.options[selectElement.selectedIndex].text;
        if (LAB_INPUT) {
            let label = this.generateFloatLabelPrefix(this._state.EDITOR_FIND_ITEMS, selectedLabel);
            LAB_INPUT.value = label;
        }
    }

    /**
     * Generate label prefix for floats
     */
    generateFloatLabelPrefix(floatElements, selectedLabel) {

        const prefixMap = {};
        const labelCounts = this._state.LIST_LABELS = {
            [selectedLabel]: 0
        };

        let prefix = '';
        let labelPrefix = '';

        floatElements.forEach(el => {

            const caption = el.querySelector(".caption[data-label]");
            if (!caption) return;

            const attr = caption.getAttribute('data-label').trim();

            // Extract number part (supports 1 / 1.1 / 1.1.1)
            const match = attr.match(/\d+(?:\.\d+)*/);
            const suffix = match ? match[0] : '';

            // Extract label text (Figure/Table/etc)
            const prefixText = attr.replace(/\d+(?:\.\d+)*/, '').trim();

            labelPrefix = prefixText.slice(0, 3);

            if (!prefixMap[labelPrefix]) prefixMap[labelPrefix] = [];

            // Chapter prefix (1. from 1.1)
            const partPrefix = suffix.includes('.') ? suffix.split('.')[0] + '.' : '';

            prefixMap[labelPrefix].push({
                label: attr,
                prefix: partPrefix
            });

            labelCounts[labelPrefix] = (labelCounts[labelPrefix] || 0) + 1;

            if (partPrefix) prefix = partPrefix;

        });

        let pattern = selectedLabel.slice(0, 3);
        const configEntry = this.G_CONFIG[selectedLabel];

        // Config override logic
        if (configEntry && configEntry.sentence && configEntry.sentence.trim()) {

            const trimmedSentence = configEntry.sentence.trim();
            const configPrefix = trimmedSentence.slice(0, 3);
            const upperPrefix = configPrefix.toUpperCase();

            if (pattern !== configPrefix && (prefixMap[configPrefix] || prefixMap[upperPrefix])) {
                pattern = configPrefix;
                selectedLabel = trimmedSentence;
            }

            if (!prefixMap[pattern] || pattern !== selectedLabel)
                selectedLabel = trimmedSentence;
        }

        // If no floats exist use chapter number
        if (floatElements.length === 0 && !IS_JOURNAL && IMPACT_SELECTION.CUR_CHAP_NO) {

            prefix = this.G_FUN.HANDLE_SEPARATOR(
                IMPACT_SELECTION.CUR_CHAP_NO, {
                    separator: "."
                }
            );
        }

        // Get most used pattern safely
        const maxPattern = Object.keys(labelCounts).length ?
            Object.entries(labelCounts).reduce((a, b) => b[1] > a[1] ? b : a)[0] :
            null;

        const lowerKey = pattern.toLowerCase();
        const upperKey = pattern.toUpperCase();

        const existing =
            prefixMap[pattern] ||
            prefixMap[lowerKey] ||
            prefixMap[upperKey];

        const count = existing ? existing.length + 1 : 1;

        // ? 13_JULY_2024 trim/replace multiple spaces config value

        this._state.currentLabel = selectedLabel;
        this._state.maxUsedPattern = maxPattern;

        return `${selectedLabel} ${prefix}${count}`.replace(/\s+/g, ' ');
    }


    handleInsertEditor(el, cite) {

        if (IS_LOCAL_HOST) debugger;
        var IMS = IMPACT_SELECTION || {};
        var rgInfo = IMS.RG_INFO || {};

        var insert_prefix = rgInfo.insert_prefix || '';
        var insert_suffix = rgInfo.insert_suffix || '';
        var selText = IMS.SEL_TEXT || '';

        var hasSelection = selText.length > 0;

        var finalCite = hasSelection ?
            cite.outerHTML :
            insert_prefix + cite.outerHTML + insert_suffix;

        this.editor.insertHtml(finalCite);

        var rid = cite.querySelector("[rid]").getAttribute("rid");

        if (rid) {
            var insCite = this.editor.document.findOne(`[rid="${rid}"]`);
            if (insCite) {
                var ascentPara = insCite.getAscendant(function(el) {
                    return el.$.className == 'p';
                });
                var ascentDiv = insCite.getAscendant('div');

                if (ascentPara) {
                    ascentPara.$.after(el);
                } else {
                    let IsAppend = false;
                    var ascentDivParent = ascentDiv.getParent();

                    [ascentDiv, ascentDivParent].forEach(elm => {
                        if (elm && elm.$ && elm.$.querySelector("div.p")) {
                            IsAppend = true;
                            elm.$.querySelector("div.p").prepend(el);
                        }
                    });
                }
            }
        }
    }



    _handleImageReplace(uploadResult) {

        /* this.EXISTING_DATA = {
                ORG_NAME: "",
                FORMAT: "",
                DB_ID: "",
                FILE_ID: ""
            } */


        const {
            ext,
            file_on,
            file_sn,
            id
        } = this.manipulateResData(uploadResult);
        const src = this.getSourceLine(file_sn);

        const {
            FILE_ID,
            DB_ID,
            ORG_NAME
        } = this.EXISTING_DATA;
        const {
            NAME,
            FILE,
            WARN,
            SIZE
        } = this.UPLOAD_DATA;
        const {
            AltText30MB,
            replaceImageWarn
        } = this.TOASTER_MESSAGE;
        const isExceed30MB = SIZE > 30;
        // try {
        const {
            existingItem
        } = this._state;
        if (!existingItem || typeof existingItem.querySelector !== 'function') {
            this.trackError('_handleImageReplace', new Error('Missing existing figure item'));
            return false;
        }

        let graphicEl = existingItem.querySelector('span.graphic');
        if (!graphicEl || typeof graphicEl.querySelector !== 'function') {
            this.trackError('_handleImageReplace', new Error('Missing figure graphic element'));
            return false;
        }

        let imgEl = graphicEl.querySelector('img');
        if (!imgEl) {
            this.trackError('_handleImageReplace', new Error('Missing figure image element'));
            return false;
        }

        const TrackArr = {
            'data-fig-org-name': ORG_NAME
        };

        const newSrcValue = {
            'src': src,
            'data-cke-saved-src': src
        };

        // Set data-db-id if not already set
        if (!graphicEl.hasAttribute('data-db-id')) {
            TrackArr['data-db-id'] = DB_ID || uploadResult.id;
        }

        //? For Replace Image store original Name DR_29_12_22
        if (graphicEl.hasAttribute('data-fig-org-name')) {
            delete TrackArr['data-fig-org-name'];
        }

        const insertEl = existingItem.querySelector('insert');
        const isSameUser = (
            existingItem.hasAttribute('data-figure') &&
            insertEl &&
            insertEl.getAttribute("data-username") === USER_INFO.MAIL_ID
        );

        if (!isSameUser) {
            TrackArr.default = ["dc", "d-cid", "d-uid", "dt", "du", "drn"];

            const mimeType = graphicEl.getAttribute('mime-subtype');
            if (graphicEl.hasAttribute('mime-subtype') && mimeType != null) {
                TrackArr["old-mime-subtype"] = mimeType;
            }

            TrackArr["old-href"] = graphicEl.getAttribute('xlink:href');
            graphicEl.classList.add('replaceImage');

            newSrcValue['old-src'] = imgEl.src;
            newSrcValue['alt'] = isExceed30MB ? AltText30MB.text : "";
            newSrcValue['title'] = isExceed30MB ? AltText30MB.text : replaceImageWarn.text;
        }

        // Remove tracked attributes except saved-src
        commonMethods.SET_REMOVE_ATTR(graphicEl, TrackArr, ["data-cke-saved-src"]);

        const filename = file_sn;
        const xlinkName = filename.split('.').slice(0, -1).join('.');


        // Reset attributes for DTD-based journals
        Array.from(graphicEl.attributes).forEach(attr => {
            if (attr.nodeName.includes('xlink:href')) {
                attr.nodeValue = IS_JOURNAL ? filename : xlinkName;
            } else if (attr.nodeName.includes('mime-subtype') && !IS_JOURNAL) {
                attr.nodeValue = ext;
            } else if (attr.nodeName.includes('greyscale')) {
                // ? if replace image - grayscale
                attr.nodeValue = "replaced";
            }
        });

        // Set updated src and metadata
        commonMethods.setAttr(imgEl, newSrcValue);

        // ? Handle image annoation here -if image replaced with new one            
        // ? OUP_J_IA_009 delete all annotate Comments Fixed_DR                        
        existingItem.querySelectorAll('[data-annotate]').forEach(el => {
            el.parentElement.setAttribute('data-ignore-comment', 'ignored');
        });

        _IsDirty = true;
        return false;
        // } catch (err) {
        //     console.warn(err.message);
        //     ErrorLogTrace('Replace_Image', err.message);
        // }
    }


    handleDelete(event) {
        // Implementation for delete handling
        console.log('Delete event handled:', event);
    }

    getSourceLine(file_sn) {
        return `${BUCKET_URL}${DOC_ID}/images/${Array.isArray(file_sn) ? file_sn[0] : file_sn}`;
    }
    _buildFigureParams(uploadResult) {
        const {
            ext,
            file_on,
            file_sn
        } = this.manipulateResData(uploadResult);
        const srcLine = this.getSourceLine(file_sn);
        const {
            AltText30MB
        } = this.TOASTER_MESSAGE;
        const {
            SIZE
        } = this.UPLOAD_DATA;
        const showExceedAlt = SIZE > this.FILE_CONFIG.MAX_SINGLE_FILE_SIZE;
        const xlinkName = file_sn.split('.').slice(0, -1).join('.');
        return {
            src: srcLine,
            ext: ext,
            xlink: IS_JOURNAL ? file_sn : xlinkName,
            og_name: file_on,
            alt: showExceedAlt ? AltText30MB.text : file_on,
            title: file_sn
        };
    }
    _buildUploadParams() {
        const {
            isInsertMode,
            isEditMode
        } = this._state;
        const {
            FILE_ID,
            DB_ID,
            ORG_NAME
        } = this.EXISTING_DATA;
        const params = {
            subfolder: 'images',
            recordtype: isInsertMode ? 'NewFigure' : 'ReplaceFigure'
        };

        if (isEditMode) {
            if (DB_ID) {
                params._id = DB_ID;
            }
            params.orgname = ORG_NAME;
        }
        return params;
    }

    _parseTableConfig(colInput, rowInput, headerInput) {
        return {
            rowCount: parseInt(rowInput.value) || 1,
            colCount: parseInt(colInput.value) || 1,
            headerRows: parseInt(headerInput.value) || 0
        };
    }

    _buildTableStructure(config, _templates) {
        const {
            rowCount,
            colCount,
            headerRows
        } = config;
        const tbody = [];
        const thead = [];

        for (let i = 0; i < rowCount; i++) {
            const isHeader = headerRows > 0 && i < headerRows;
            const row = this._createTableRow(i, colCount, isHeader, _templates);
            (isHeader ? thead : tbody).push(row);
        }

        return {
            tbody,
            thead
        };
    }

    _createTableRow(rowIndex, colCount, isHeader, _templates) {
        const cells = [];
        const cellTemplate = this._getCellTemplate(isHeader);
        const _id1 = GENERATE_ID();
        const _id2 = GENERATE_ID();

        for (let j = 0; j < colCount; j++) {
            const cell = this.GetTemplate(cellTemplate, {
                id: _id1,
                col: j,
                dtd: false,
                _template: _templates,
                order: ACTION_RECORD.INS_ORDER
            });
            cells.push(cell);
        }

        return this.GetTemplate('row', {
            id: _id2,
            dtd: false,
            _template: _templates,
            td: cells.join(''),
            order: ACTION_RECORD.INS_ORDER
        });
    }

    _getCellTemplate(isHeader) {
        const {
            type
        } = this._state;
        return this._state.templateList[type][isHeader ? 'header' : 'body'];
    }

    _generateColsGroup(colCount, template) {
        try {
            const colGroup = commonMethods.STRING_HTML(
                this.GetTemplate("colgroup", {
                    cols: colCount,
                    _template: template,
                    order: ACTION_RECORD.INS_ORDER
                })
            );

            for (let i = 0; i < colCount; i++) {
                const col = commonMethods.STRING_HTML(
                    this.GetTemplate("col", {
                        cols: colCount,
                        colswnum: `col${i + 1}`,
                        _template: template,
                        order: ACTION_RECORD.INS_ORDER
                    })
                );
                colGroup[0].append(col[0]);
            }

            return colGroup[0].outerHTML;
        } catch (error) {
            console.warn(error.message);
            return '';
        }
    }
    _buildBaseElementParams() {
        const {
            currentTemplate
        } = this._state;

        return {
            frag: true,
            id: this.generateNewId(),
            id1: GENERATE_ID(),
            caption: this.handleCreateCaption(),
            dtd: false,
            FIRST_INS_DOM: true,
            dom: true,
            _template: currentTemplate
        };
    }

    _mergeElementParams(baseParams, figureParams, tableParams) {
        if (figureParams && Object.keys(figureParams).length > 0) {
            return Object.assign({}, baseParams, figureParams);
        }
        if (tableParams && Object.keys(tableParams).length > 0) {
            return Object.assign({}, baseParams, tableParams);
        }
        return baseParams;
    }

    _buildCitationText(citationData, inputValue, currentLabel) {
        const {
            mostFrequentLabel,
            count
        } = citationData;
        const {
            dircite,
            caption
        } = this._state.currentConfig;
        const {
            ISstartOfBlock
        } = IMPACT_SELECTION;

        const hasBeginPara = dircite.beginpara;
        const conditionStartPara = ISstartOfBlock && hasBeginPara;
        const singlePrefix = dircite[conditionStartPara ? 'beginpara' : 'single_prefix'];
        const isFirstItem = count === 0;
        var showPrefixOnly = false;
        if (caption && caption["single_item_label"]) showPrefixOnly = caption["single_item_label"] === "prefix_only";

        // Safely extract citation number
        const parts = String(inputValue).trim().split(" ");
        const citationNumber = parts.length > 1 ? parts[1] : "";

        // Decide prefix
        let prefixText = singlePrefix;
        if (mostFrequentLabel && singlePrefix.trim() !== currentLabel) {
            prefixText = mostFrequentLabel;
        }

        // Ensure trailing space
        if (!prefixText.endsWith(" ")) {
            prefixText += " ";
        }

        // Build citation text
        let citationText = prefixText;
        if (!(showPrefixOnly && isFirstItem)) {
            citationText += citationNumber;
        }
        if (conditionStartPara) {
            citationText += " ";
        }

        // Capitalization consistency
        if (citationText.charAt(0) !== singlePrefix.charAt(0)) {
            citationText = singlePrefix.charAt(0) + citationText.slice(1);
        }

        return citationText;
    }


    _createCitationElement(elementId, citationText, citationData, config) {
        const {
            ISstartOfBlock
        } = IMPACT_SELECTION;
        const {
            indircite,
            ["ref-type"]: refType
        } = config;

        return this.GetTemplate("a", {
            text: citationText,
            id: elementId,
            "ref-type": refType.toLowerCase(),
            OP: (ISstartOfBlock || !citationData.isSurroundingWithParentheses) ? '' : indircite.openwrap,
            CP: (ISstartOfBlock || !citationData.isSurroundingWithParentheses) ? '' : indircite.closewrap,
            WITH_IN_INS_DOM: true,
            frag: true,
            order: ACTION_RECORD.INS_ORDER
        });
    }

    _extractCitations(type) {
        const selector = `a[ref-type='${type}']:not([data-remove]):not([data-delete])`;
        const elements = [...this.editor.document.$.querySelectorAll(selector)];
        const seenRids = new Set();
        const citations = [];

        for (const element of elements) {
            const rid = element.getAttribute("rid");
            if (!rid || seenRids.has(rid)) continue;

            seenRids.add(rid);
            const citation = this._processCitationElement(element);
            if (citation) citations.push(citation);
        }

        return citations;
    }

    _processCitationElement(element) {
        const textContent = element.textContent.trim();
        const firstWord = textContent.split(/\s+/)[0];

        if (!firstWord || !textContent.includes("Fig")) return null;

        const parent = element.parentElement;
        const checkElement = parent.tagName.toLowerCase() === "insert" ? parent : element;
        const isParentheses = this._checkParentheses(checkElement);

        return {
            label: firstWord,
            isParentheses,
            element
        };
    }

    _checkParentheses(element) {
        const {
            previousSibling,
            nextSibling
        } = element;
        const textPrev = this._getNodeText(previousSibling).trim();
        const textNext = this._getNodeText(nextSibling).trim();

        return textPrev.endsWith("(") && textNext.startsWith(")");
    }

    _getNodeText(node, ignoreClass = "Citation") {
        while (node) {
            if (node.nodeType === 3) return node.nodeValue || "";
            if (node.nodeType === 1) {
                if (ignoreClass && node.classList.contains(ignoreClass)) {
                    node = node.previousSibling;
                    continue;
                }
                if (node.previousSibling && node.previousSibling.nodeType === 3) {
                    return node.previousSibling.nodeValue || "";
                }
            }
            break;
        }
        return "";
    }
    // Analyze citation patterns in document
    analyzeCitationFrequency(type = "fig") {
        const analysisResult = {
            mostFrequentLabel: null,
            count: 0,
            allLabels: {},
            isTie: false,
            tiedLabels: [],
            isSurroundingWithParentheses: false
        };

        try {
            const citations = this._extractCitations(type);
            if (citations.length === 0) return analysisResult;

            const frequency = this._calculateFrequency(citations);
            const parenthesesData = this._analyzeParentheses(citations);

            return this._buildAnalysisResult(frequency, parenthesesData);
        } catch (error) {
            console.error("Error analyzing citation frequency:", error);
            return analysisResult;
        }
    }
    _calculateFrequency(citations) {
        return citations.reduce((acc, citation) => {
            acc[citation.label] = (acc[citation.label] || 0) + 1;
            return acc;
        }, {});
    }
    _analyzeParentheses(citations) {
        const parenthesesData = {};

        for (const citation of citations) {
            if (!parenthesesData[citation.label]) {
                parenthesesData[citation.label] = {
                    total: 0,
                    parens: 0
                };
            }

            parenthesesData[citation.label].total += 1;
            if (citation.isParentheses) {
                parenthesesData[citation.label].parens += 1;
            }
        }

        return parenthesesData;
    }
    _buildAnalysisResult(frequency, parenthesesData) {
        const entries = Object.entries(frequency);
        const maxCount = Math.max(...entries.map(([, count]) => count));
        const tiedLabels = entries
            .filter(([, count]) => count === maxCount)
            .map(([label]) => label);

        const mostFrequentLabel = tiedLabels[0];
        const parenInfo = parenthesesData[mostFrequentLabel] || {
            total: 0,
            parens: 0
        };
        const isSurroundingWithParentheses = parenInfo.parens > parenInfo.total / 2;

        return {
            mostFrequentLabel,
            count: maxCount,
            allLabels: frequency,
            isTie: tiedLabels.length > 1,
            tiedLabels: tiedLabels.length > 1 ? tiedLabels : [],
            isSurroundingWithParentheses
        };
    }
    _analyzeCitationPatterns(currentItem) {
        return this.analyzeCitationFrequency(currentItem.substring(0, 3));
    }
    manipulateResData(response) {

        const getString = (value) => {
            if (typeof value === 'string') return value;
            if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
            return '';
        };

        return {
            id: getString(response.id),
            ext: getString(response.ext),
            file_on: getString(response.file_on),
            file_sn: getString(response.file_sn)
        };

    }
    PatternMatch(lab, Pattern) {
        try {
            if (typeof lab != "string") {
                if (lab.hasAttribute("data-label")) {
                    lab = lab.getAttribute("data-label");
                } else return false;
            }
            lab = lab.toLocaleUpperCase();
            Pattern = Pattern.toLocaleUpperCase();
            if (lab.includes(Pattern) || lab.includes(Pattern.slice(0, 3))) {
                return true;
            } else return false;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('PatternMatchLabel', err.message);
        }
    }
    generateNewId() {
        if (IS_LOCAL_HOST) debugger;
        try {
            if (typeof IdGenerator === 'undefined' || !IdGenerator.forDocument) {
                throw new Error('IdGenerator_missing');
            }
            const type = this._state.isFigure ? 'fig' : 'table-wrap';
            const scope = (typeof EDITOR_CURSOR !== 'undefined' && EDITOR_CURSOR.CUR_CHAPTER) ||
                (this.editor && this.editor.$) ||
                (typeof GlobalEditor !== 'undefined' && GlobalEditor.document && GlobalEditor.document.$) ||
                document.body;
            const dom = (this.editor && this.editor.document && this.editor.document.$) ||
                (typeof GlobalEditor !== 'undefined' && GlobalEditor.document && GlobalEditor.document.$) ||
                document;
            const result = IdGenerator.forDocument().nextId(type, {
                scope: scope,
                dom: dom
            });
            return result.id;
        } catch (err) {
            console.warn(err && err.message);
            if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace('generateNewId', (err && (err.message || err.code)) || 'generateNewId');
            }
            throw err;
        }
    }


    handleCreateCaption() {

        // ? 31_DEC_2022 - YA - SET_LABEL_LAST_CHARACTER_SEPRATOR_FROM_CONFIG
        const {
            CAPTION_INPUT,
            LAB_INPUT
        } = this.elements;
        const {
            currentConfig,
            currentTemplate
        } = this._state;

        const {
            caption,
            sentence
        } = currentConfig;

        const id1 = GENERATE_ID();
        const id = GENERATE_ID();
        let cap_text = this.GetSetCaptionText(CAPTION_INPUT, {
            getInner: true,
            'end_sep': caption['end_sep']
        });

        let dataLab = LAB_INPUT.value + caption['label_end_sep'];

        if (this._state.EDITOR_FIND_ITEMS.length == 0 && caption.single_item_label == "prefix_only") {
            dataLab = (sentence.trim() + caption['label_end_sep']).replace('..', '.');
        }

        let altText = (placeHolderModule && placeHolderModule.templates && placeHolderModule.templates['alt-text']) || "Insert Alt Text";

        let captionString = this.GetTemplate('caption', {
            frag: false,
            id,
            id1,
            lab: dataLab,
            data: cap_text,
            alt: altText,
            dtd: false,
            _template: currentTemplate
        });
        return captionString;
    }

    // Generate citation logic
    generateCitation(elementId) {
        const {
            currentConfig,
            currentLabel,
            currentItem
        } = this._state;
        const {
            LAB_INPUT
        } = this.elements;



        const citationData = this._analyzeCitationPatterns(currentItem);
        const citationText = this._buildCitationText(citationData, LAB_INPUT.value, currentLabel);

        return this._createCitationElement(elementId, citationText, citationData, currentConfig);
    }
    async figureOperations() {


        const {
            NAME,
            FILE,
            WARN
        } = this.UPLOAD_DATA;
        const {
            IMG_UPLOAD_INPUT
        } = this.elements;

        //  ? default added items will be added in fileUpload item
        //  ? 1798594_DR: file size increased 100 to 500 MB

        if (!(IMG_UPLOAD_INPUT && IMG_UPLOAD_INPUT.files && IMG_UPLOAD_INPUT.files.length)) {
            this.showToast('noFileSelected', 'warning');
            return false;
        }

        this.updateUploadUIState(true);
        const uploadParams = this._buildUploadParams();
        const results = await this._fileUploader.makeRequest([FILE], uploadParams);
        debug.log(results);
        return results;
    }
    async generateTable() {

        const {
            TableCol,
            TableRow,
            TableHeader
        } = this.elements;
        const {
            currentTemplate
        } = this._state;

        const config = this._parseTableConfig(TableCol, TableRow, TableHeader);
        const tableStructure = this._buildTableStructure(config, currentTemplate);

        return {
            colsGroup: this._generateColsGroup(config.colCount, currentTemplate),
            tbody: tableStructure.tbody.join(''),
            thead: tableStructure.thead.join(''),
            wrapfoot: ""
        };
    }

    createElementWithParams(figureParams = {}, tableParams = {}) {

        const baseParams = this._buildBaseElementParams();
        const elementParams = this._mergeElementParams(baseParams, figureParams, tableParams);

        const element = this.GetTemplate("root", elementParams);
        debug.log(element);
        if (element && !element.hasAttribute("data-role")) {
            element.setAttribute("data-role", element.getAttribute("data-name"));
        }
        return element;
    }

    async FIRE_INSERT_REPLACE() {
        IMPACT_SELECTION._SNAPSHOT({
            save: true,
            lock: true
        });
        try {
            // Implementation for insert handling
            if (window.paraLock && typeof window.paraLock._isElementLocked === "function") {
                const isLocked = window.paraLock._isElementLocked(null, {
                    check_closest: true,
                    alertKey: 'ErrorLockedParaEdit'
                });
                if (isLocked) return false;
            }

            // ACTION_RECORD.GET_COUNT();

            console.log('Insert event handled');
            const {
                isFigure,
                isInsertMode,
                currentConfig
            } = this._state;

            let elementParams = {};
            let createdElement;

            if (isFigure) {
                var uploadResult = await this.figureOperations();
                if (uploadResult == false) return;
                /* 
                {
                    "r": 1,
                    "id": "Nfaf896e7-70f6-452c-8990-3152086bd2ea",
                    "file_sn": ["N1f0253d2-f98c-4774-8204-dafb69b0df8b.png"],
                    "file_on": ["Figure_2_v3_600dpi.png"],
                    "ext": ["png"],
                    "DISK_PATH": "C:/_IMPACT/_LOCAL_FILES/",
                    "message": "Uploaded.",
                    "time_s": {"$numberLong": "1748540584114"}
                }
                */
                if (isInsertMode) elementParams = this._buildFigureParams(uploadResult);
            } else {
                elementParams = await this.generateTable();
            }

            if (isFigure && !isInsertMode) {
                if (IS_LOCAL_HOST) debugger;
                this._handleImageReplace(uploadResult);
            } else {
                createdElement = this.createElementWithParams(
                    isFigure ? elementParams : {},
                    isFigure ? {} : elementParams
                );

                // Add tracking attributes to the inserted figure/table element
                const trackCode = isFigure ? (isInsertMode ? "fig-01" : "fig-02") : 'tab-01';
                if (createdElement) {
                    createdElement.setAttribute('data-track-code', trackCode);
                }

                // this._handleElementInsert(createdElement);
                const citation = this.generateCitation(createdElement.id);
                this.handleInsertEditor(createdElement, citation);

                if (this._state.EDITOR_FIND_ITEMS.length == 0 && currentConfig.caption.single_item_label == "prefix_only") {

                    return debug.log("single_float_no_renumbering_required");
                }

                this.handleReNumber();
            }

        } catch (err) {
            debug.log(err.message);
        } finally {
            this.closeDialog();
            this.refreshPanelDefault();
            IMPACT_SELECTION._SNAPSHOT({
                save: true,
                unlock: true
            });
        }
    }
    // _handleElementInsert(element) {}

    updateCurrentPatternState() {
        try {
            const {
                currentConfig,
                currentLabel,
                type
            } = this._state;

            const root = EDITOR_CURSOR.CUR_CHAPTER || this.editor.$ || GlobalEditor.document.$;

            // ES5-compatible: Select divs of the given type that contain a .caption[data-label] element
            var nodeList = root.querySelectorAll('div.body div.' + type);
            var floatElements = Array.prototype.filter.call(nodeList, function(el) {
                return el.querySelector('.caption[data-label]');
            });

            this._state.EDITOR_FIND_ITEMS = floatElements;
            this._state.EDITOR_FIND_KEY = type;

            this.handleChange(null);

            const current_lab_Pattern = this._state.currentLabel.toLocaleUpperCase();

            this._state.LAB_PATTERN_COLLECTION = Array.from(floatElements)
                .map(el => el.querySelector(`div.${type} ${currentConfig.findCaption}`))
                // remove null/undefined
                .filter(Boolean)
                .filter(el => this.PatternMatch(el, current_lab_Pattern));

            debug.log(this._state.LAB_PATTERN_COLLECTION);

            if (IS_JOURNAL) {
                // future journal-specific logic here
            }
        } catch (error) {
            console.error("updateCurrentPatternState error:", error);
        }
    }


    handleReNumber() {
        if (IS_LOCAL_HOST) debugger;
        // Implementation for renumbering
        if (window.paraLock && window.paraLock.getLockedElementsByOthers) {
            const lockedInfo = window.paraLock.getLockedElementsByOthers();
            if (lockedInfo.byOthers.length > 0) {
                TOASTER_ALERT('ErrorReStoreForCollab', {
                    type: 'warning'
                });
                return;
            }
        }
        debug.log('Renumber event handled:');
        this.updateCurrentPatternState();

        const {
            CAPTION_INPUT,
            LAB_INPUT
        } = this.elements;
        const {
            EDITOR_FIND_KEY,
            LAB_PATTERN_COLLECTION,
            EDITOR_FIND_ITEMS,
            currentConfig,
            currentLabel,
            currentItem
        } = this._state;

        const {
            renumber
        } = this.M_CONFIG;

        if (!this.handleRenumberCommon) {
            this.handleRenumberCommon = new CheckOrder(this._state.renumberKey);
            this.handleRenumberCommon.setRenumberPolicy(this.M_CONFIG);
        }
        const policy = this.handleRenumberCommon.resolveRenumberPolicy();

        // Correct destructuring with aliasing
        const {
            findCaption,
            findCaptionInner,
            caption,
            // using bracket notation to alias a key with hyphens
            ["new-item-key"]: newItemKey
        } = currentConfig;


        if (renumber && renumber === 'false') {
            
            return;
        }

        var root_selector = this.editor.document.$;
        if (EDITOR_CURSOR.CUR_CHAPTER) {
            root_selector = EDITOR_CURSOR.CUR_CHAPTER;
        }

        // ? Build ArrLab from LAB_PATTERN_COLLECTION (already filtered)
        // TODO fetch citation instance of figure caption and do further process - YA-06_JAN_22
        var ArrLab = Array.from(LAB_PATTERN_COLLECTION)

            .map(el => {
                let lab = el.getAttribute('data-label').trim();
                let id = el.closest(`div.${EDITOR_FIND_KEY}`).id;
                let appended = this.Utils.appendNumberIfNeeded(lab, id);

                return {
                    element: el,
                    Original_lab: lab,
                    append_lab: appended,
                    clean_append_lab: this.Utils.stripTrailingPunct(appended),
                    Original_Id: id,
                    Seq_No: lab.PARSE_ID_2_INT()
                };
            });


        ArrLab.sort(function(a, b) {
            // TODO TO HANDLE WITH PART LABELS - FUTURE
            if (a.Seq_No > b.Seq_No) return 1;
            if (a.Seq_No < b.Seq_No) return -1;
            return 0;
        });

        // ? ReNaming The caption using the sorted ArrLab
        Array.from(LAB_PATTERN_COLLECTION).forEach((el, ind) => {
            const labItem = ArrLab[ind];
            let {
                Original_Id,
                Original_lab,
                clean_append_lab,
                append_lab
            } = labItem;
            const rootDiv = el.closest("[id][data-role]") || el.closest(`div.${EDITOR_FIND_KEY}`);
            const currentId = rootDiv.id;
            const rawLabel = el.getAttribute('data-label').trim();
            const label = this.Utils.appendNumberIfNeeded(rawLabel, currentId);
            const labelNormalized = this.Utils.stripTrailingPunct(label);

            if (labelNormalized !== clean_append_lab || rawLabel.split(" ").length == 1) {
                // ? Single Figure Label need to update
                const index = ArrLab.findIndex(({
                    Original_lab,
                    clean_append_lab
                }, idx) => {
                    const originalNormalized = this.Utils.stripTrailingPunct(Original_lab);

                    const isMatch = originalNormalized === labelNormalized || clean_append_lab === labelNormalized;

                    debug.log(`[Compare]  Original_lab="${Original_lab}" clean_append_lab="${clean_append_lab}" label="${label}" labelNormalized="${labelNormalized}" => isMatch = ${isMatch}`);

                    return isMatch;
                });

                var newLab = commonMethods.HANDLE_SEPARATOR(clean_append_lab, {
                    separator: caption['label_end_sep']
                });

                // Books (policy.renumberItemId=false): keep existing float id; journals may reassign.
                if (policy.renumberItemId) {
                    if (index !== -1) {
                        ArrLab[index].NewLabel = newLab;
                        ArrLab[index].NewId = Original_Id;
                    }
                } else {
                    const selfIndex = ArrLab.findIndex(item => item.Original_Id === currentId);
                    if (selfIndex !== -1) {
                        ArrLab[selfIndex].NewLabel = newLab;
                        ArrLab[selfIndex].NewId = currentId;
                    }
                }

                if (policy.renumberLabel) {
                    el.setAttribute('data-label', newLab);
                    let captionRoot = el.closest(`div.${EDITOR_FIND_KEY}`);
                    if (!captionRoot.hasAttribute(newItemKey)) {
                        const split = this.Utils.stripTrailingPunct(label.split(' ')[1], {
                            remove: true
                        });
                        el.setAttribute(newItemKey, 'edit');
                        // ? Set delete float caption number
                        (captionRoot.querySelector(findCaptionInner) || el).setAttribute('delete-lab', split);
                    }
                }

                if (policy.renumberItemId) {
                    rootDiv.id = Original_Id;
                }

            } else {
                ArrLab[ind].NewLabel = ArrLab[ind].NewId = '';
            }
        });

        // ? Renaming xref labels
        ArrLab.forEach((item, ind) => {
            if (item.NewLabel && item.NewLabel.length != 0) {
                //? Bug Fixed to avoid match case only find exact case BATCH regression Bug AJCPAT by DR
                root_selector.querySelectorAll(`a[rid~="${item.Original_Id}"]:not([data-cite])`).forEach((elm) => {
                    // ? Handle new and existing citation here
                    let [rid, new_rid] = [elm.getAttribute('rid'), ""];
                    if (!elm.hasAttribute('zrid')) elm.setAttribute('zrid', rid);

                    if (rid == item.Original_Id) {
                        new_rid = item.NewId;
                    } else {
                        // ? multiple rid
                        var new_rid_arr = [];
                        rid.split(' ').forEach(RID => {
                            let matchedItem = ArrLab.find(labItem => labItem.Original_Id === RID);
                            if (matchedItem) {
                                let IsSame = matchedItem.NewId == '';
                                new_rid_arr.push(matchedItem[IsSame ? 'Original_Id' : 'NewId']);
                            }
                        });
                        new_rid = new_rid_arr.join(' ');
                    }

                    if (policy.renumberCitationRid) {
                        commonMethods.setAttr(elm, {
                            'rid': new_rid,
                            'href': '#' + new_rid
                        });
                    }

                    elm.setAttribute('data-cite', "edit");
                    // ? 07_MAR_2020_YA_HANDLE - IF ONLY CONTAIN PART IMAGE
                    if (elm.textContent.length < 2 && !elm.textContent.match(/\d+/g)) return;
                    if (policy.renumberCiteText) {
                        this.UpdateTrack(elm, item.clean_append_lab, item.NewLabel, {
                            idx: ind,
                            returnData: ArrLab[ind]
                        });
                    }
                });
            }
        });
        // ? revert for citation - don't renumber again
        $(root_selector).find('a[data-cite]').removeAttr('data-cite');
    }

    handleImageUpload(event) {
        try {
            const {
                IMG_NAME_DISPLAY_INPUT,
                IMG_UPLOAD_INPUT
            } = this.elements;
            this.resetFileInput(IMG_NAME_DISPLAY_INPUT);
            IMG_UPLOAD_INPUT.click();
        } catch (error) {
            this.trackError('handleImageUpload', error);
        }
    }

    /**
     * Handle file selection from input
     * @param {Event} event - File input change event
     */
    handleFileSelection() {

        debug.log("--handleFileSelection--");
        const {
            IMG_UPLOAD_INPUT
        } = this.elements;

        try {
            // Validate file input exists and has files
            if (!(IMG_UPLOAD_INPUT && IMG_UPLOAD_INPUT.files && IMG_UPLOAD_INPUT.files.length)) {
                this.showToast('noFileSelected', 'warning');
                return;
            }

            const selectedFile = IMG_UPLOAD_INPUT.files[0];
            const validationResult = this.validateUploadedFile(selectedFile);

            if (!validationResult.isValid) {
                this.handleFileValidationError(validationResult);
                this.resetFileInput(IMG_UPLOAD_INPUT);
                return;
            }

            // Process valid file
            this.processValidFile(selectedFile);

        } catch (error) {
            this.trackError('handleFileSelection', error);
            this.resetFileInput(IMG_UPLOAD_INPUT);
            this.showToast('fileSelectionError', 'error');
        }
    }

    /**
     * Validate uploaded file
     * @param {File} file - The uploaded file
     * @returns {Object} Validation result
     */
    validateUploadedFile(file) {
        // Convert to MB
        const fileSize = Math.round(file.size / (1024 * 1024));
        const fileName = file.name;
        const isValidFormat = this.FILE_CONFIG.ALLOWED_EXTENSIONS.test(fileName);

        // Check file format
        if (!isValidFormat) {
            return {
                isValid: false,
                error: 'INVALID_FORMAT',
                message: this.TOASTER_MESSAGE.unSupportFormat
            };
        }

        // Check file size limits
        if (fileSize >= this.FILE_CONFIG.MAX_FILE_SIZE_LIMIT) {
            const suffix = "@newgen.co";
            const tempMaild = this.getJournalEmail();
            const journalEmail = tempMaild ?
                (tempMaild.includes(suffix) ? tempMaild : tempMaild + suffix) :
                "";
            return {
                isValid: false,
                error: 'SIZE_EXCEEDED',
                message: journalEmail ?
                    this.TOASTER_MESSAGE.exceedImageSize100WithMailAlert : this.TOASTER_MESSAGE.exceedImageSize100,
                journalEmail
            };
        }

        return {
            isValid: true,
            fileSize,
            isLargeFile: fileSize > this.FILE_CONFIG.MAX_SINGLE_FILE_SIZE
        };
    }

    /**
     * Handle file validation errors
     * @param {Object} validationResult - Validation result object
     */
    handleFileValidationError(validationResult) {
        const {
            error,
            message,
            journalEmail
        } = validationResult;

        if (error === 'SIZE_EXCEEDED' && journalEmail) {
            this.showAlert('warning', 'Warning', message, {
                journalEmail,
                errorKey: error
            }, error);
        } else {
            this.showAlert('warning', 'Warning', message, {
                errorKey: error
            });
        }
    }

    /**
     * Process valid file for upload
     * @param {File} file - Valid file to process
     */
    processValidFile(file) {
        const {
            IMG_NAME_DISPLAY_INPUT
        } = this.elements;
        const fileSize = Math.round(file.size / (1024 * 1024));

        // Get file extension
        const fileName = file.name;
        const fileExt = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();

        try {
            // Set size attribute for large files
            if (fileSize > this.FILE_CONFIG.MAX_SINGLE_FILE_SIZE) {
                // this.UPLOAD_DATA.WARN = 'AltText30MB';
            }

            Object.assign(this.UPLOAD_DATA, {
                NAME: file.name,
                SIZE: fileSize,
                FORMAT: fileExt,
                FILE: file
            });

            const displayName = this.getAttachFileName(file.name, 'floatPanel');

            // Update file display input
            commonMethods.SET_REMOVE_ATTR(IMG_NAME_DISPLAY_INPUT, {
                "title": file.name,
                value: displayName
            });

            // Setup delete functionality
            this.setupDeleteHandler(true);

        } catch (error) {
            this.trackError('processValidFile', error);
            this.showToast('uploadError', 'error');
            throw error;
        }
    }

    /**
     * Upload float image and update UI
     * @param {string|Object} fileName - File name string or response object from backend
     */
    // uploadFloatImage(fileName) {
    //     const {
    //         IMG_NAME_DISPLAY_INPUT,
    //         ATTACH_SECTION,
    //         INSERT_BTN, FLOAT_SPINNER, FLOAT_TRASH_ICON
    //     } = this.elements;

    //     try {
    //         const displayName = this.getAttachFileName(fileName, 'floatPanel');

    //         // Update file display input
    //         commonMethods.SET_REMOVE_ATTR(IMG_NAME_DISPLAY_INPUT, {
    //             "title": fileName,
    //             value: displayName
    //         });
    //         const uploadData = this.parseUploadResponse(fileName);

    //         // Update file display input
    //         this.updateFileDisplayInput(IMG_NAME_DISPLAY_INPUT, uploadData);

    //         // Update attachment section styling
    //         this.updateAttachmentSection(ATTACH_SECTION, uploadData.fileName);

    //         // Update UI state
    //         this.updateUploadUIState();

    //         // Setup delete functionality
    //         this.setupDeleteHandler();

    //     } catch (error) {
    //         this.trackError('uploadFloatImage', error);
    //         this.showToast('uploadError', 'error');
    //     }
    // }

    /**
     * Parse upload response (string or object)
     * @param {string|Object} response - Response from upload
     * @returns {Object} Parsed upload data
     */
    parseUploadResponse(response) {
        const isStringResponse = typeof response === 'string';

        if (isStringResponse) {
            return {
                fileName: response,
                isString: true
            };
        }

        // Handle object response from backend
        const fileName = Array.isArray(response.file_on) ?
            response.file_on[0] :
            response.file_on;

        const fileSn = Array.isArray(response.file_sn) ?
            response.file_sn[0] :
            response.file_sn;

        return {
            fileName,
            src: `${BUCKET_URL}${DOC_ID}/images/${fileSn}`,
            dbId: response.id || null,
            isString: false
        };
    }

    /**
     * Update file display input with upload data
     * @param {HTMLElement} input - File display input element
     * @param {Object} uploadData - Parsed upload data
     */
    /* updateFileDisplayInput(input, uploadData) {
        if (!input) return;

        const { fileName, src, dbId, isString } = uploadData;
        const displayName = this.getAttachFileName(fileName, 'floatPanel');

        // Base attributes
        const attributes = {
            title: fileName,
            value: displayName
        };

        // Add additional attributes for non-string responses
        if (!isString && src) {
            Object.assign(attributes, {
                'data-src': src,
                'data-db-id': dbId
            });
        }

        // Handle large file notifications
        const isLargeFile = input.hasAttribute('size');
        if (isLargeFile) {
            attributes.alt = this.TOASTER_MESSAGE.AltText30MB.text;
            attributes.title = this.TOASTER_MESSAGE.AltText30MB.text;
        } else {
            attributes.title = this.TOASTER_MESSAGE.replaceImageWarn.text;
        }

        // Apply attributes
        this.setElementAttributes(input, attributes);
    } */

    /**
     * Update attachment section styling based on filename length
     * @param {HTMLElement} section - Attachment section element
     * @param {string} fileName - File name
     */
    updateAttachmentSection(section, fileName) {
        if (!section || !fileName) return;

        // Determine column class based on filename length
        const columnClass = this.getColumnClassForFileName(fileName);

        // Update section attributes
        section.removeAttribute('class');
        section.className = columnClass;
        section.setAttribute('title', fileName);
    }

    /**
     * Get appropriate column class based on filename length
     * @param {string} fileName - File name
     * @returns {string} Bootstrap column class
     */
    getColumnClassForFileName(fileName) {
        const length = fileName.length;

        if (length < 10) return 'col-3';
        if (length < 15) return 'col-4';
        if (length < 20) return 'col-5';
        if (length < 30) return 'col-6';
        return 'col-7';
    }

    /**
     * Update UI state after successful upload
     */
    updateUploadUIState(uploading) {
        const {
            INSERT_BTN,
            FLOAT_SPINNER,
            FLOAT_TRASH_ICON
        } = this.elements;

        // Enable insert button
        // INSERT_BTN.removeAttribute('disabled');

        // Hide spinner
        FLOAT_SPINNER.classList[uploading ? 'remove' : 'add']('ds-none');

        // Show delete icon
        FLOAT_TRASH_ICON.classList[uploading ? 'add' : 'remove']('ds-none');
    }

    /**
     * Setup delete handler for uploaded file
     * @param {Object} uploadData - Upload data object
     */
    setupDeleteHandler(show) {
        const {
            FLOAT_TRASH_ICON,
            IMG_NAME_DISPLAY_INPUT,
            INSERT_BTN,
            IMG_UPLOAD_INPUT
        } = this.elements;

        if (!FLOAT_TRASH_ICON) return;
        else if (show) FLOAT_TRASH_ICON.classList.remove('ds-none');

        FLOAT_TRASH_ICON.onclick = () => {
            try {
                // Clear file input attributes
                this.clearFileInputAttributes(IMG_NAME_DISPLAY_INPUT);

                // Disable insert button
                // INSERT_BTN.setAttribute('disabled', '');

                // Clear file input value
                if (IMG_UPLOAD_INPUT) {
                    IMG_UPLOAD_INPUT.value = null;
                }

                // Hide delete icon
                FLOAT_TRASH_ICON.classList.add('ds-none');

                // Clear upload list                
                this.UPLOAD_DATA = {
                    WARN: "",
                    SIZE: "",
                    NAME: "",
                    FILE: "",
                    FORMAT: ""
                };

            } catch (error) {
                this.trackError('deleteUploadedFile', error);
            }
        };
    }

    /**
     * Clear file input attributes
     * @param {HTMLElement} input - File input element
     */
    clearFileInputAttributes(input) {
        if (!input) return;

        input.value = '';
        if (input.FigInputOpt) {
            input.FigInputOpt.value = null;
        }
    }

    /**
     * Set multiple attributes on an element
     * @param {HTMLElement} element - Target element
     * @param {Object} attributes - Key-value pairs of attributes
     */
    setElementAttributes(element, attributes) {
        if (!element || !attributes) return;

        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                element.setAttribute(key, value);
            }
        });
    }

    /**
     * Get journal email for file size warnings
     * @returns {string|null} Journal email or null
     */
    getJournalEmail() {
        try {
            //return this.getTypeConfigQuery('Figure', 'email') || null;
            if (window.LOADING_CONFIG && window.LOADING_CONFIG.CLIENT_CONFIG && window.LOADING_CONFIG.CLIENT_CONFIG.XML_DOC) {
                return window.LOADING_CONFIG.CLIENT_CONFIG.XML_DOC.querySelector('Figure').getAttribute('email') || "";
            }
            return "";
        } catch (error) {
            this.trackError('getJournalEmail', error);
            return null;
        }
    }

    /**
     * Show alert dialog
     * @param {string} type - Alert type
     * @param {string} title - Alert title
     * @param {Object} message - Message object
     * @param {Object} options - Additional options
     */
    async showAlert(type, title, message, options = {}) {

        var errorKey = options.errorKey || null;
        var isInValidFormat = errorKey == "INVALID_FORMAT";
        var self = this;

        if (typeof AlertNewDialog.fire === 'function') {
            var confirmationBtnText = isInValidFormat ? "Add Comment" : "OK";
            var result = await AlertNewDialog.fire(type, title, message, confirmationBtnText, '', true, {
                override: true,
                ...options
            });
            if (result && isInValidFormat) {
                self.closeDialog();
                var command = "ADD_FIG";
                if (self._state && self._state.existingItem) {
                    command = "REPLACE_FIG";
                    var caption = self._state.existingItem.querySelector('.caption');
                    var captionId = caption ? caption.id : null;

                    IMPACT_SELECTION.applyCursor(captionId, window.GlobalEditor || self.editor);

                }
                setTimeout(() => {
                    self.openCommentDialog(command);
                }, 300);
            }
        }
    }

    /**
     * Reset file input element
     * @param {HTMLElement} input - File input element
     */
    resetFileInput(input) {
        if (!input) return;

        input.value = '';
        if (input.FigInputOpt) {
            input.FigInputOpt.value = null;
        }
    }

    /**
     * Get type configuration query result
     * @param {string} type - Configuration type
     * @param {string} key - Configuration key
     * @returns {string|null} Configuration value
     */
    getTypeConfigQuery(type, key) {
        if (typeof GET_TYPE_CONFIG_QUERY === 'function') {
            return GET_TYPE_CONFIG_QUERY(type, key);
        }
        return null;
    }

    // Utility Methods
    capitalizeFirstLetter(string) {
        return string ? string.charAt(0).toUpperCase() + string.slice(1) : '';
    }

    toggleElementClass(element, className, condition) {
        if (!element) return;
        element.classList.toggle(className, condition);
    }

    hideElement(element) {
        if (element) {
            element.classList.add('ds-none');
        }
    }

    showElement(element) {
        if (element) {
            element.classList.remove('ds-none');
        }
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.slice(0, maxLength - 5) + ' . . .';
    }

    extractFileName(element) {
        try {
            const img = element.querySelector('.graphic img');
            return img.src.split('/').pop() || 'FIGURE';
        } catch (error) {
            return 'FIGURE';
        }
    }

    resetFileInput(fileInput) {
        if (fileInput) {
            fileInput.removeAttribute('data-src');
            fileInput.value = '';
        }
    }

    updateProcessHeader(text) {
        const headerElement = this.elements.HeaderLabelProcess;
        if (headerElement) {
            headerElement.textContent = text;
        }
    }

    updateFileName(fileName) {
        const fileNameElement = this.elements.IMG_NAME_DISPLAY_INPUT;
        if (fileNameElement && fileName) {
            fileNameElement.value = this.getAttachFileName(fileName, 'floatPanel');
        }
    }

    updatePanelVisibility() {
        const {
            existingItem
        } = this._state;
        const {
            CHANGE_SELECT_ITEM,
            INSERT_BTN,
            REPLACE_BTN,
            FLOAT_SPINNER,
            AddNoteOpt
        } = this.elements;

        // Get label element for CHANGE_SELECT_ITEM
        const labelInput = this.Panel.querySelector(`[for="${CHANGE_SELECT_ITEM.id}"]`);

        // Define base elements to hide and show
        const elementsToHide = [
            CHANGE_SELECT_ITEM.parentElement,
            labelInput && labelInput.parentElement,
            FLOAT_SPINNER,
            AddNoteOpt
        ];

        const elementsToShow = [];

        // Conditionally modify arrays based on existingItem state
        if (existingItem) {
            elementsToHide.push(INSERT_BTN);
            elementsToShow.push(REPLACE_BTN);
        }

        // Helper function to toggle visibility
        const toggleVisibility = (elements, shouldHide) => {
            elements.forEach(element => {
                if (element) {
                    element.classList.toggle('d-none', shouldHide);
                }
            });
        };

        // Apply visibility changes
        toggleVisibility(elementsToHide, true);
        toggleVisibility(elementsToShow, false);
    }
    Caption_Text(captionElement, Options = {}) {

    }
    GetSetCaptionText(captionEl, Options = {}) {
        if (captionEl && typeof this.Caption_Text === 'function') {
            /* 
            ! FUNCTION - GET/SET INNER HTML CONTENT FROM CAPTIOn FILED ON DIALOG
                ? 1) CAPTION FILED INVOKED WITHY SUMMER-NOTE PLUGINS, IF NOT INVOKED ALSO HANDLED
                ? 2) GET/SET INNER HTML HANDLE BASED ON PARA-METER COMES CALLED FUN
                ? 3) ALSO HANDLE,  PARA NODE PRESENT OR NOT HANDLE INSIDE SUMMER-NOTE ROOT NOTE
        */
            try {
                let [next, Inner, get_value] = [captionEl.nextElementSibling, " ", ""];
                if (next && next.classList.contains('note-editor')) {
                    let note = next.querySelector('.note-editable');
                    // ? handle if p tag presented
                    if (note.querySelector('p')) note = note.querySelector('p');
                    if (Options.getInner) get_value = note.innerHTML;
                    else if (Options.setInner) note.innerHTML = Options.text ? Options.text : Inner;
                } else {
                    // ? If not Initialize the summer note
                    if (Options.getInner) {
                        get_value = captionEl.innerHTML;
                    } else if (Options.setInner) {
                        captionEl.innerHTML = Options.text ? Options.text : Inner;
                    }
                }
                // ? 31_DEC_2022 - YA - SET_CAPTION_LAST_SEPRATOR_FROM_CONFIG
                if (Options.getInner) {
                    if (typeof Options.end_sep == "undefined") Options.end_sep = "";
                    if (!get_value.endsWith(Options.end_sep)) get_value = get_value + Options.end_sep;
                    let cleanedText = get_value.replace(/<br>$/g, "").trim();
                    return cleanedText;
                }
            } catch (err) {
                console.warn(err.message);
                // ErrorLogTrace('setCaptionText', err.message);
            }
        }
    }
    UpdateTrack(node, oldValue, newValue, Options = {}) {
        try {

            var {
                returnData = {}
            } = Options;

            var elmParent = node.parentElement;
            // ? https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
            // oldValue = commonMethods.endsWithAny(oldValue, {
            //     remove: true
            // });
            newValue = this.Utils.stripTrailingPunct(newValue);

            if (!['INSERT', 'DEL'].includes(elmParent.tagName)) {
                var Insert = node.querySelector('insert');
                if (Insert) {
                    // ? Edited Citation here
                    if (Insert.hasAttribute('data-del-val')) {
                        let oldVal = Insert.getAttribute('data-del-val');
                        let IsPartLabel = oldVal.match(/[A-z]/) ? oldVal.match(/[A-z]/).join("") : "";
                        if (oldVal == newValue.split(' ')[1] + IsPartLabel) {
                            node.innerHTML = newValue + IsPartLabel;
                        } else {
                            // ? Handle Here Again
                            Insert.textContent = newValue + IsPartLabel;
                        }
                    } else {
                        // ? Newly Inserted Citation
                        newValue = this.Text_Compare_Update(Insert.textContent, newValue, {
                            addPartLab: true,
                            node: node
                        }).newVal;
                        Insert.textContent = newValue;
                    }
                    Insert.setAttribute('data-last-change-time', new Date().getTime());
                } else {
                    // ? Un edited Citation
                    debug.log(`Text_Compare_Update ` + node.textContent);

                    var getAttr = node.hasAttribute("zrid") ? "zrid" : "rid";
                    var rid = node.getAttribute(getAttr);
                    var txtVal = this.Utils.stripTrailingPunct(
                        this.Utils.appendNumberIfNeeded(node.textContent, rid, null)
                    );

                    let GetObj = this.Text_Compare_Update(txtVal, newValue, {
                        delVal: true,
                        addPartLab: true,
                        node: node,
                        idx: Options.idx + 1,
                        arr: Options.arr
                    });
                    debug.log(GetObj);
                    let insNode = window._trackManager.getInsNode();
                    insNode.setAttribute('data-del-val', GetObj.delVal);
                    insNode.setAttribute("data-auto-insert", "reorder");
                    insNode.textContent = GetObj.newVal;


                    node.innerHTML = insNode.outerHTML;

                    // ? 14_APR_2023 - SIVA - REQUIREMENT FOR SEPARATE TRACKING FOR AUTO RENUMBER
                }
            } else if (['INSERT'].includes(elmParent.tagName)) {
                // ? Edited Citation here
                if (elmParent.hasAttribute('data-del-val')) {
                    let oldVal = elmParent.getAttribute('data-del-val');
                    node.textContent = oldVal == newValue.split(' ')[1] ? oldVal : newValue;
                } else {
                    // ? Newly Inserted Citation - 29_FEB_2024
                    let tempVal = this.Text_Compare_Update(node.textContent, newValue, {
                        addPartLab: true,
                        node: node
                    }).newVal;
                    node.textContent = tempVal ? tempVal : newValue;
                }
            }
        } catch (err) {
            console.warn(err.message);
            // ErrorLogTrace('UpdateTrack', err.message);
        }
    }

    Text_Compare_Update(oldValue, newValue, Option, module) {
        try {
            Option = Option ? Option : {
                delVal: false
            };
            oldValue = oldValue.replace(/\s\s+/, " "), newValue = newValue.replace(/\s\s+/, " ");
            let new_rid = Option.node.getAttribute('rid');
            // let new_num = IS_JOURNAL ? new_rid.split(/\s/).map(string => string.PARSE_ID_2_INT()) : newValue.split(/\s/)[1];
            let new_num;
            if (IS_JOURNAL) {
                if (/\s/.test(new_rid)) {
                    // contains space — split by space, then parse
                    new_num = new_rid.split(/\s+/).map(str => str.PARSE_ID_2_INT());
                } else {
                    // no space — split by dot and take last part
                    const lastPart = new_rid.split('.').pop();
                    new_num = lastPart.PARSE_ID_2_INT ? lastPart.PARSE_ID_2_INT() : lastPart;
                }
            } else {
                new_num = newValue.split(/\s+/)[1];
            }

            let new_full_digit = new_num;
            if (IS_JOURNAL) {
                if (this._state && this._state.formatter && this._state.formatter.formatRanges) {
                    new_full_digit = this._state.formatter.formatRanges(new_num);
                } else {
                    new_full_digit = module.formatter.formatRanges(new_num);
                }
            }
            console.log(new_full_digit);
            // ? DR_UPDATE oldValue.split(oldValue.match("ï¿½") ? "ï¿½" : " ")
            let split = {
                new: [oldValue.split(/\s/)[0], new_full_digit],
                old: oldValue.split(/\s/)
            };
            let IsJoin_old_Cite = split.old[1] ? false : true;
            if (split.old[0] == split.new[0] || split.old[0].match(split.new[0]) || split.new[0].match(split.old[0] || IsJoin_old_Cite)) {
                let ReTurn_Obj = {};
                if (Option.addPartLab) {
                    ReTurn_Obj.newVal = this.Get_Set_Part_Label(split.old, {
                        set: true,
                        newValue: split.new
                    }).newValue;
                }
                if (Option.delVal) {
                    ReTurn_Obj.delVal = split.old[IsJoin_old_Cite ? 0 : 1];
                }
                ReTurn_Obj.newVal = commonMethods.endsWithAny(ReTurn_Obj.newVal, {
                    remove: true
                });
                return ReTurn_Obj;
            }
        } catch (err) {
            console.warn(err.message);
            // ErrorLogTrace('TextCompare_Update', err.message);
        }
    }
    showToast(messageKey, type = 'info') {
        const message = this.TOASTER_MESSAGE[messageKey];
        if (message && typeof TOASTER_ALERT === 'function') {
            TOASTER_ALERT(messageKey, {
                type
            });
        }
    }

    // Abstract methods that should be implemented by specific environments
    getConfigurationItem(key, options) {
        return this.G_FUN.GET_CONFIG_ITEM(key, options) || {};
    }

    isContextMenuEnabled(groupName) {
        return typeof IsContextMenu === 'function' ? IsContextMenu(groupName) : true;
    }

    getClientName() {
        return commonMethods.getClientCode();
    }

    getAttachFileName(fileName, context) {
        return typeof fileName === 'string' && fileName.getAttachFileName ?
            fileName.getAttachFileName(context) :
            fileName;
    }

    _closeDialog() {
        // Implementation for closing dialog
        if (typeof this.closeDialog === 'function') {
            this.closeDialog();
        }
    }
}

export default FloatsGroupModule;