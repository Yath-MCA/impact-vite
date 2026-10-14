/**
 * HyperlinkDialogModule handles the creation and management of link dialogs in the editor
 * Provides functionality for URL validation, email handling, and link management
 * https://claude.ai/chat/0c77019f-29d1-40f6-9ca1-f39301c337e5
 */
import {
    EMERGENCY_DEFAULT,
    resolveClientInstance,
    normalizeAreaToken,
    isSpecialCaseAllowed
} from './rules/resolveLinkRules.js';

class HyperlinkDialogModule extends BaseModule {
    // Static Configuration
    static CLASS_LIST = ['email', 'link', 'uri', 'ext-link', 'pub-id'];
    static URL_PREFIXES = ['http://', 'https://', 'ftp://'];
    static LINK_DOMAINS = ['.com', '.net', '.org', '.info', '.edu', '.gov', '.co'];
    static LINK_TYPES = ['uri', 'doi', 'ftp', 'gen', 'orcid', 'pmcid', 'pmid', 'supplement_link'];
    static LINK_SELECTOR = 'span.uri,span.ext-link,span.email,span.pub-id';
    static LINK_TYPE_ATTRS = ['ext-link-type', 'pub-id-type'];
    static RESTRICT_AREAS = [
        '.contrib-group', '.title-group', '.kwd-group', '.person-group',
        '.article-categories', '.subj-group', '.title', '.author-notes',
        'strong', 'em', 'sub', 'sup', 'sc'
    ];

    static REFERENCE_ELEMENT_BUILDERS = {
        extUri: v => `<ext-link ext-link-type='uri' xlink:href='${v}'>${v}</ext-link>`,
        extDoi: v => `<ext-link ext-link-type='doi' xlink:href='${v}'>${v}</ext-link>`,
        pubId: v => `<pub-id pub-id-type='doi'>${v}</pub-id>`,
        uri: v => `<uri xlink:href='${v}'>${v}</uri>`,
        specialCase: v => `<?pub-id-doi xlink:href='${v}'?>`,
        // Same doi.org expansion, two target elements -- INTELLECT wraps in ext-link, TNF in uri.
        doiPartialExtDoi: v => {
            const full = v.startsWith('https://') ? v : `https://doi.org/${v}`;
            return `<ext-link ext-link-type='doi' xlink:href='${full}'>${full}</ext-link>`;
        },
        doiPartialUri: v => {
            const full = v.startsWith('https://') ? v : `https://doi.org/${v}`;
            return `<uri xlink:href='${full}'>${full}</uri>`;
        },
        objectId: v => `<object-id pub-id-type='pmid'>${v}</object-id>`
    };

    static REFERENCE_ELEMENT_ATTRS = {
        extUri: {
            'data-name': 'ext-link',
            class: 'ext-link',
            'ext-link-type': 'uri'
        },
        extDoi: {
            'data-name': 'ext-link',
            class: 'ext-link',
            'ext-link-type': 'doi'
        },
        pubId: {
            'data-name': 'pub-id',
            class: 'pub-id',
            'pub-id-type': 'doi'
        },
        uri: {
            'data-name': 'uri',
            class: 'uri'
        },
        email: {
            'data-name': 'email',
            class: 'email'
        },
        // PMID identifier leaf -- JATS <object-id pub-id-type="pmid">, distinct from the DOI
        // <pub-id> element. A PMID's own text is the identifier: no href needed, same as pub-id.
        objectId: {
            'data-name': 'object-id',
            class: 'object-id',
            'pub-id-type': 'pmid'
        }
    };

    // The three link "templates" split out for PLOS: doi (pub-id shape), ext-link (uri shape),
    // pmid (object-id shape). Named/grouped so link-rules.json / callers can reference them.
    static LINK_ID_TEMPLATES = {
        doi: {
            attrs: HyperlinkDialogModule.REFERENCE_ELEMENT_ATTRS.pubId,
            builder: HyperlinkDialogModule.REFERENCE_ELEMENT_BUILDERS.pubId
        },
        'ext-link': {
            attrs: HyperlinkDialogModule.REFERENCE_ELEMENT_ATTRS.extUri,
            builder: HyperlinkDialogModule.REFERENCE_ELEMENT_BUILDERS.extUri
        },
        pmid: {
            attrs: HyperlinkDialogModule.REFERENCE_ELEMENT_ATTRS.objectId,
            builder: HyperlinkDialogModule.REFERENCE_ELEMENT_BUILDERS.objectId
        }
    };

    /**
     * Raw link-rules from supportingFiles (window.HYPERLINK_LINK_RULES) or emergency DEFAULT.
     * @returns {object}
     */
    static getLinkRulesRaw() {
        try {
            if (typeof window !== 'undefined' && window.HYPERLINK_LINK_RULES
                && window.HYPERLINK_LINK_RULES.DEFAULT) {
                return window.HYPERLINK_LINK_RULES;
            }
        } catch (e) {
            /* ignore */
        }
        return {
            version: 1,
            DEFAULT: EMERGENCY_DEFAULT,
            clients: {}
        };
    }

    /**
     * Merge DEFAULT (+ DEFAULT_JOURNAL) with sparse client for this resolve only.
     * @param {string} client
     * @param {{ isJournal?: boolean, dtd?: string }} [options]
     * @returns {object}
     */
    static resolveCurrentLinkRules(client, options = {}) {
        const dtd = options.dtd
            || (typeof SHARED_KEY !== 'undefined' && SHARED_KEY && SHARED_KEY.dtd)
            || (typeof DOC_DTD !== 'undefined' && DOC_DTD)
            || 'JATS';
        return resolveClientInstance(HyperlinkDialogModule.getLinkRulesRaw(), {
            clientCode: client,
            dtd,
            isJournal: options.isJournal === true
        });
    }

    static BUTTON_ACTIONS = {
        both: ['is-invalid', 'is-valid'],
        valid: 'is-valid',
        invalid: 'is-invalid',
        addDisable: 'disabled',
        addNone: 'ds-none'
    };

    static ELEMENT_SELECTORS = {
        textInput: '#select_text',
        urlInput: '#url_value',
        linkType: '#LinkType',
        urlIcon: '#hyper_append',
        urlValidateBtn: '#apply_link_valid',
        applyBtn: '#apply_link',
        cancelBtn: '#cancel_link'
    };

    /**
     * Initialize the HyperlinkDialogModule
     * @param {string} name - Module name
     * @param {Object} errorTracker - Error tracking instance
     * @param {Object} options - Configuration options
     */
    constructor(name, errorTracker, options = {}) {
        super(name, errorTracker, options);
        this.initialize(options);
        this.CLASS_SELECTOR = HyperlinkDialogModule.CLASS_LIST;
        this.restrictAreas = HyperlinkDialogModule.RESTRICT_AREAS;
        this.CLICK_EVT_SET_DELAY = true;
        this.isHTTPorEmail = false;
        this.apiService = new FetchService();
        this.trackManager = null;

        // this.debouceList = ['handleUrlInput']
    }

    /**
     * BaseModule.init → initLoop: confirm link-rules supportingFiles landed on window.
     */
    initLoop() {
        try {
            if (typeof window !== 'undefined' && !window.HYPERLINK_LINK_RULES) {
                console.warn('hyperlink link-rules not loaded; using emergency DEFAULT');
                if (typeof ErrorLogTrace === 'function') {
                    ErrorLogTrace('initLoop', 'HYPERLINK_LINK_RULES missing');
                }
            }
        } catch (err) {
            console.warn('hyperlink initLoop:', err && err.message);
        }
    }

    /**
     * Initialize module properties and setup
     * @param {Object} options - Configuration options
     */
    async initialize(options) {
        try {
            this.initializeProperties();
            this.initializeState();

            const intervalId = setInterval(() => {
                if (window.InitialLoadDialog.FullyLoaded) {
                    console.log("InitialLoadDialog is fully loaded!");
                    clearInterval(intervalId);
                    // Stop checking after the condition is met
                    this.loadConfiguration();
                }
                // Check every 100 milliseconds
            }, 250);

        } catch (error) {
            this.trackError('initialize', error);
        }
    }

    /**
     * Initialize basic properties
     */
    initializeProperties() {
        this.elements = {};
        this.templateList = {};
        this.canUnmountComponentWhileClose = true;
        this.selector = HyperlinkDialogModule.LINK_SELECTOR;
        this.clickEventSetDelay = true;
        this.recheckCursorPos = true;
        this.isUrlBool = false;
        this.isRestrictArea = false;
        this.currentInstance = {};
        this.editState = null;
        this.formModified = false;
        this.originalEditHref = null;
    }

    /**
     * Initialize module state
     */
    initializeState() {
        this.configs = {};
        this.initiated = true;
        this.editMode = false;
        this.insertMode = false;
    }


    /**
     * Initialize DOM elements
     */
    async initializeElements() {
        try {
            Object.entries(HyperlinkDialogModule.ELEMENT_SELECTORS).forEach(([key, selector]) => {
                this.elements[key] = this.Panel.querySelector(selector);
                if (!this.elements[key]) {
                    throw new Error(`Element not found: ${selector}`);
                }
            });
        } catch (error) {
            this.trackError('initializeElements', error);
        }
    }
    /**
     * Bind event handlers and setup event listeners
     */
    bindEventHandlers() {

        const debounce = fn => Debounce_Event(fn.bind(this), 300);
        // Map of handlers (some debounced, some direct)
        this.boundHandlers = {
            handleUrlInput: debounce(this.handleUrlInput),
            handleTextInput: this.handleTextInput.bind(this),
            handleLinkTypeChange: this.handleLinkTypeChange.bind(this),
            handleCancelorClose: this.handleCancelorClose.bind(this),
            handleApply: this.handleApply.bind(this),
            handleUrlValidation: this.handleUrlValidation.bind(this),
            handleOpenUrl: this.handleOpenUrl.bind(this),
        };
    }

    /**
     * Handle text input changes - tracks form modification
     */
    handleTextInput() {
        this.formModified = true;
    }

    /**
     * Setup event listeners for all interactive elements
     */
    async setupEventListeners() {
        try {
            const {
                urlInput,
                linkType,
                cancelBtn,
                applyBtn,
                urlIcon,
                urlValidateBtn,
                textInput
            } = this.elements;

            const listeners = [{
                    element: urlInput,
                    event: 'input',
                    handler: 'handleUrlInput'
                },
                {
                    element: textInput,
                    event: 'input',
                    handler: 'handleTextInput'
                },
                {
                    element: linkType,
                    event: 'change',
                    handler: 'handleLinkTypeChange'
                },
                {
                    element: cancelBtn,
                    event: 'click',
                    handler: 'handleCancelorClose'
                },
                {
                    element: applyBtn,
                    event: 'click',
                    handler: 'handleApply'
                },
                {
                    element: urlIcon,
                    event: 'click',
                    handler: 'handleOpenUrl'
                },
                {
                    element: urlValidateBtn,
                    event: 'click',
                    handler: 'handleUrlValidation'
                }
            ];

            for (const {
                    element,
                    event,
                    handler
                } of listeners) {
                const fn = this.boundHandlers[handler];
                if (!element || !fn) continue;

                // Remove if already attached
                element.removeEventListener(event, fn);

                // Re-attach cleanly
                element.addEventListener(event, fn);
            }

        } catch (error) {
            this.trackError('setupEventListeners', error);
        }
    }


    /**
     * Load configuration settings
     */
    async loadConfiguration() {
        try {
            const configKeys = ['link', 'email'];
            const configs = {};

            for (const key of configKeys) {
                configs[key] = await this.G_FUN.GET_CONFIG_ITEM(key, {
                    CONVERT_JSON: true,
                    attr: true,
                    children: false
                });
            }

            this.configs = {
                ...this.configs,
                ...configs
            };
        } catch (error) {
            this.trackError('loadConfiguration', error);
        }
    }

    /**
     * Validate if current selection is valid for link operations
     * Can be called proactively from selectionChange events
     * @param {Object} IMS - IMPACT_SELECTION object (optional, uses current if not provided)
     * @param {boolean} IsEdit - Whether this is edit mode
     * @returns {Object} Validation result { isValid, canIgnore, reason, isLink, eLinkCount, aLinkCount, CanIgnoreConditions }
     */
    validateSelection() {
        debug.log("validateSelection-start");
        try {
            // Get current selection info if not provided
            var IMS = IMPACT_SELECTION;
            var {
                editMode
            } = this;


            // Always refresh selection data to ensure we have current state
            // This is critical for selectionChange events where cursor moves
            if (typeof IMS.getInfo === 'function') {
                IMS.getInfo(GlobalEditor);
            }

            const {
                NODE_CLAS,
                NODE_TAG,
                PARENT_CLAS,
                RG_INFO,
                RESTRICT_CLIENT_IS,
                IsMath,
                CUR_SEL,
                NODE,
                IsLink,
                PARENTS_CLAS_LIST

            } = IMS;

            // Basic validation - must have selection info
            if (!IMS || !RG_INFO || !NODE || !NODE.$) {
                return {
                    isValid: false,
                    canIgnore: true,
                    reason: 'no_selection',
                    isLink: false,
                    eLinkCount: 0,
                    aLinkCount: 0
                };
            }

            const {
                IS_FRONT,
                IS_HEAD_TITLE
            } = window.EDITOR_CURSOR;

            const {
                divCount,
                spanCount,
                eLinkCount,
                aLinkCount
            } = RG_INFO;

            const restrictItems = ['IMG', 'subject', 'a', 'graphic'];
            let CanIgnore = false;
            const CanIgnoreConditions = [];

            // Get current selection for math detection
            const selection = CUR_SEL && CUR_SEL.getRanges && CUR_SEL.getRanges()[0];

            // Check if selection exists and contains an inline formula
            let IsMathFound = false;
            try {
                IsMathFound = !!selection && $(selection.cloneContents().$).find('.inline-formula').length > 0;
            } catch (err) {
                // Ignore errors
            }

            // Check for conditions that would prevent link creation/editing
            if (!RG_INFO) {
                CanIgnore = true;
                CanIgnoreConditions.push('no_rg_info');
            } else if ((IS_FRONT || IS_HEAD_TITLE) && spanCount > 0) {
                CanIgnore = true;
                CanIgnoreConditions.push('front_heading_with_span');
            } else if (divCount > 0) {
                CanIgnore = true;
                CanIgnoreConditions.push('div_in_selection');
            } else if (PARENT_CLAS == 'xref') {
                CanIgnore = true;
                CanIgnoreConditions.push('inside_xref');
            } else if (USER_INFO.IS_AUTHOR && RESTRICT_CLIENT_IS) {
                CanIgnore = true;
                CanIgnoreConditions.push('author_restricted');
            } else if (
                (typeof window.isHyperlinkInRestrictedElement === "function" && window.isHyperlinkInRestrictedElement(NODE)) ||
                RESTRICT_CLIENT_IS
            ) {
                CanIgnore = true;
                CanIgnoreConditions.push('restricted_by_elements');
            } else if (restrictItems.includes(NODE_CLAS)) {
                CanIgnore = true;
                CanIgnoreConditions.push('restricted_node_class');
            } else if (IsMath || IsMathFound) {
                CanIgnore = true;
                CanIgnoreConditions.push('math_element');
            } else if (PARENTS_CLAS_LIST && PARENTS_CLAS_LIST.some(cls => cls && (cls === 'ref' || cls.startsWith('ref')))) {
                if (NODE_TAG == "INSERT" && /mixed-citation|ref/gi.test(PARENT_CLAS)) {
                    CanIgnore = false;
                } else {
                    CanIgnore = true;
                    CanIgnoreConditions.push('ref_inside');
                }
            }

            let isLink = IsLink;
            if (this.CLASS_SELECTOR.includes(NODE_CLAS) && !isLink) isLink = true;

            // Check for restricted areas
            // Use local adjustedSpanCount instead of mutating RG_INFO.spanCount (Bugbot fix)
            let adjustedSpanCount = spanCount;
            if (!CanIgnore) {
                // Adjust span count for email links
                adjustedSpanCount = spanCount == eLinkCount ? 0 : spanCount;

                // Check each restricted area
                this.restrictAreas.forEach((cls, ind) => {
                    const closestEl = NODE && NODE.$ && typeof NODE.$.closest === "function" ? NODE.$.closest(cls) : null;
                    if (closestEl) {
                        // Use adjustedSpanCount instead of spanCount for checks
                        if (ind < 4 || (ind > 3 && (adjustedSpanCount > 0 || !NODE.$.classList.contains(cls.slice(1))))) {
                            CanIgnore = true;
                            CanIgnoreConditions.push(`restricted_area_${cls}`);
                        }

                        // Special handling for certain classes and author notes
                        if (CanIgnore && (this.CLASS_SELECTOR.includes(NODE_CLAS) || ($(closestEl).hasClass('author-notes') && !USER_INFO.IS_AUTHOR))) {
                            CanIgnore = false;
                            // Remove the last condition since we're allowing this
                            CanIgnoreConditions.pop();
                        }
                    }
                });
            }

            // Handle non-editable areas and invalid selections for non-edit mode
            let showWarning = false;
            if (editMode && (aLinkCount > 0 || eLinkCount > 0)) {
                CanIgnore = false;
            } else if (CanIgnore) {
                showWarning = true;
            }

            return {
                isValid: !CanIgnore && !showWarning,
                canIgnore: CanIgnore,
                showWarning: showWarning,
                reason: CanIgnore ? CanIgnoreConditions.join(',') : null,
                CanIgnoreConditions: CanIgnoreConditions,
                isLink: isLink,
                eLinkCount: eLinkCount || 0,
                aLinkCount: aLinkCount || 0,
                hasSelectionText: !!(IMS.SEL_TEXT && IMS.SEL_TEXT.length > 0),
                NODE: NODE,
                RG_INFO: RG_INFO,
                IMS: IMS
            };
        } catch (err) {
            this.trackError('validateSelection', err);
            return {
                isValid: false,
                canIgnore: true,
                reason: 'validation_error',
                isLink: false,
                eLinkCount: 0,
                aLinkCount: 0
            };
        }
    }

    /**
     * Handle selection change from UnifiedModuleSystem
     * Called on every selection change event
     * @param {Object} editor - CKEditor instance
     * @param {Object} selection - CKEditor selection
     * @param {Object} elementPath - CKEditor elementPath
     */
    handleSelectionChange(editor, selection, elementPath) {
        try {
            // Store last validation result for use by context menu
            this.lastValidation = this.validateSelection(null, false);
            debug.log('HyperlinkDialogModule handleSelectionChange - valid:', this.lastValidation.isValid);
        } catch (err) {
            this.trackError('handleSelectionChange', err);
        }
    }
    postShowLoop(options = {}) {
        try {
            debug.log('----postShowLoop---');
            // Use editMode set by showLoop. Don't let stale curhref override it -
            // editMode should be the authoritative source when dialog is opened
            const isEdit = this.editMode;
            const fromSelectionChange = options.fromSelectionChange || false;
            const skipWarnings = fromSelectionChange;

            const validation = this.validateSelection(null, isEdit);
            // Store validation for use by selection change handler
            this.lastValidation = validation;

            const {
                isValid,
                canIgnore,
                showWarning,
                isLink,
                eLinkCount,
                aLinkCount,
                hasSelectionText,
                NODE,
                RG_INFO,
                IMS
            } = validation;

            // Handle non-editable areas and invalid selections
            // When in insert mode (creating new link) and selection moves to an existing link,
            // we need to close the dialog as the context has changed
            const isInvalidInsertSelection = !isEdit && (canIgnore || (aLinkCount > 0 || eLinkCount > 0));

            if (isInvalidInsertSelection) {
                if (!skipWarnings) {
                    // On initial open: show warning toast, don't closeDialog() as it conflicts
                    // with BaseModule.show() which sets state=1 after this method returns
                    debug.warn("removeAllRanges_hyperlink");
                    GlobalEditor.getSelection().removeAllRanges();
                    TOASTER_ALERT('ErrorHyperlink', {
                        type: 'warning'
                    });

                    // this.resetDialog();
                    return;
                }
                // When called from selection change: close dialog to prevent it staying
                // open in an invalid state (insert mode on existing link)               
                return;
            }

            // When called from selection change, don't reset the entire dialog
            // as that clears form inputs while the dialog remains open
            if (!fromSelectionChange) {
                this.currentInstance = {};
            }

            // Handle new link creation (plain text selection)
            if (!isLink && eLinkCount === 0) {
                // Clear editState and switch to insert mode when moving away from a link
                this.editState = null;
                // Switch to insert mode for plain text
                this.editMode = false;
                this.insertMode = true;

                // Also clear currentInstance.node to prevent stale node updates
                if (this.currentInstance) {
                    this.currentInstance.node = null;
                    this.currentInstance.curhref = null;
                }

                // Skip form reset on selection change - only reset on initial dialog open
                if (!skipWarnings && !hasSelectionText) {
                    this.resetDialog();
                } else if (hasSelectionText && !skipWarnings) {
                    // Only update fields on initial open, not selection change
                    // to avoid clobbering user input while typing in dialog
                    this.updateRestore(null, IMS);
                }
            }
            // Handle link editing
            else if (isLink || eLinkCount > 0) {
                const idx = this.getSelect_ELm_Index(NODE, RG_INFO);
                const className = NODE.getAttribute('class');
                const isValid = this.CLASS_SELECTOR.includes(className);

                const node = isValid ? NODE : (NODE && NODE.getChildren && typeof NODE.getChildren === "function" ? NODE.getChildren().getItem(idx) : null);

                if (node) {
                    const nodeHref = node.getAttribute ? node.getAttribute('xlink:href') : null;

                    // Check if this is the same link we were originally editing
                    if (this.originalEditHref && this.originalEditHref === nodeHref) {
                        // Restore edit mode for the same link
                        this.editMode = true;
                        this.insertMode = false;
                    }

                    // Store original edit href when first entering edit mode
                    if (this.editMode && !this.originalEditHref) {
                        this.originalEditHref = nodeHref;
                    }

                    // Store original edit state for verification during update
                    this.editState = {
                        element: node,
                        originalHref: nodeHref,
                        timestamp: Date.now()
                    };

                    GlobalEditor.getSelection().selectElement(node);
                }

                // Only update form if not modified by user
                if (!this.formModified) {
                    IMS.getInfo(GlobalEditor);
                    this.updateRestore(node || null, IMS);
                }
            }

        } catch (error) {
            console.warn('postShowLoop error:', error.message);
            this.trackError('postShowLoop', error);
        }
    }

    showLoop(IsEdit, param2, param3) {
        try {

            this.editMode = !!IsEdit;
            this.insertMode = !IsEdit;

            if (this.trackManager == null) this.trackManager = new trackManager();

            // Reset flags when dialog opens
            this.formModified = false;
            if (IsEdit) {
                this.originalEditHref = null;
            }

            debug.log("showloop ==> HyperlinkDialogModule");

            this.bindEventHandlers();

            // Initialize elements FIRST
            this.initializeElements();

            // Then setup event listeners (this handles both binding and attaching)
            this.setupEventListeners();

            this.postShowLoop();


        } catch (err) {
            console.warn(err.message);
            this.trackError('showLoop', err.message);
        }
    }

    // Helper method for getting selected element index
    getSelect_ELm_Index(node, range) {
        try {
            if (!node || !range || !range.EL || !range.EL.$ || typeof range.EL.$.querySelector !== "function") {
                return null;
            }

            const sel = range.EL && range.EL.$.querySelector(this.selector);
            const sel_href = sel ? sel.getAttribute('xlink:href') : null;

            // Find matching element index
            const children = node.getChildren && typeof node.getChildren === "function" ? node.getChildren().$ : null;
            if (!children) return null;

            const index = Array.from(children)
                .map((el, idx) => {
                    if (el.nodeType == Node.ELEMENT_NODE &&
                        el.hasAttribute('xlink:href') &&
                        el.getAttribute('xlink:href') == sel_href) {
                        return idx;
                    }
                })
                .filter(Boolean)
                .join('') || null;

            return index;
        } catch (err) {
            this.trackError('getSelect_ELm_Index', err);
            return null;
        }
    }

    // Helper method for updating and restoring dialog state
    updateRestore(existingElm, IMS) {
        try {
            IMS = IMS || {};

            // Handle selection text and encoding
            const selectedText = IMS.SEL_TEXT || "";
            const IsMail = this.isEmailAddress(selectedText);
            const encodedURL = this.hasHttpOrHttpsProtocol(selectedText);
            const IsDOI = this.validateDoi(selectedText);
            const {
                urlInput,
                linkType,
                textInput,
                applyBtn,
                urlValidateBtn
            } = this.elements;

            if (selectedText.length > 0) {
                // Update text input and selection info
                textInput.value = this.currentInstance.selText = selectedText;

                // Adjust text area size if needed
                textInput.classList[(textInput.clientHeight < textInput.scrollHeight) ? "add" : "remove"]("boxHeight");

                // this.currentInstance.selString = IMS.RG_INFO.EL.$.innerHTML;

                // Set link type based on selection
                linkType.value = IsMail ? 1 : 2;

                // Handle URL validation and input
                if (encodedURL || IsDOI || IsMail) {
                    urlInput.value = selectedText;

                } else {
                    // Reset input fields
                    urlInput.value = '';
                    urlInput.classList.remove('is-invalid', 'is-valid');
                    applyBtn.classList.add('disabled');
                    urlValidateBtn.classList.add('ds-none');
                }
            }

            // Handle existing element editing
            var orgEl = existingElm;
            if (existingElm) {
                existingElm = existingElm.$ ?
                    existingElm.$ :
                    (existingElm[0] ? existingElm[0] : existingElm);

                const eLink = existingElm.getAttribute('xlink:href');
                const temp_type_link = existingElm.dataset.link || 'edit';

                // Update URL input and instance data
                urlInput.value = eLink;

                // Store current instance data
                Object.assign(this.currentInstance, {
                    node: orgEl,
                    type: temp_type_link,
                    curhref: eLink,
                    cls: existingElm.dataset.name,
                    curtype: linkType.value,
                    link: existingElm.getAttribute('data-link'),
                    user: existingElm.getAttribute('data-username'),
                    isSameUser: commonMethods.IS_SAME_USER_AND_ROLE(existingElm),
                    clone: existingElm.cloneNode(true)
                });

                // applyBtn.classList.add('disabled');

            }
            this.handleUrlInput();
        } catch (err) {
            this.trackError('updateRestore', err);
        }
    }



    /**
     * Handle URL input changes
     * @param {Event} event - Input event
     */
    handleUrlInput(event) {
        try {
            this.formModified = true;
            var target = event && event.target || this.elements.urlInput || this.Panel.querySelector(`[id=url_value]`);
            if (target) {
                const value = target.value || '';
                target.value = this.formatUrlWithPrefix(value);
                this.validateInputs();
            }
        } catch (error) {
            this.trackError('handleUrlInput', error);
        }
    }

    /**
     * Handle link type changes
     */
    handleLinkTypeChange() {
        try {
            const {
                urlInput,
                textInput,
                linkType
            } = this.elements;
            const inputValue = urlInput.value || textInput.value;
            linkType.value = inputValue ? (this.isEmailAddress(inputValue) ? 1 : 2) : 0;
        } catch (error) {
            this.trackError('handleLinkTypeChange', error);
        }
    }

    /**
     * Handle URL validation (non-blocking)
     */
    handleUrlValidation() {
        try {
            const urlInput = this.elements.urlInput || this.Panel.querySelector("[id=url_value]");

            void this.validateUrlWithServer(urlInput.value)
                .then((response) => {
                    this.handleValidationResponse(response, urlInput);
                })
                .catch((error) => {
                    this.trackError("handleUrlValidation", error);
                });

        } catch (error) {
            this.trackError("handleUrlValidation setup", error);
        }
    }

    handleValidationResponse(response, urlInput) {
        try {

            var applyBtn = this.elements && this.elements.applyBtn || this.Panel.querySelector(`[id=apply_link]`);

            // Status code 200 indicates successful validation
            const isValid = response.statusCode === 200;

            // Update UI based on validation result
            this.toggleElementClasses(urlInput, true, isValid);



        } catch (error) {
            this.trackError('handleValidationResponse', error);
            // this.showToast('URL validation failed', 'error');

            // Reset UI to invalid state
            this.toggleElementClasses(urlInput, true, false);

        } finally {
            this.toggleElementClasses(applyBtn, true, true);
        }
    }
    /**
     * Handle opening URL in new tab
     */
    handleOpenUrl() {
        try {
            const {
                urlInput
            } = this.elements;
            window.open(urlInput.value, '_blank');
        } catch (error) {
            this.trackError('handleOpenUrl', error);
        }
    }

    hasHttpOrHttpsProtocol(url) {
        if (!url || typeof url !== 'string') return false;
        const trimmedUrl = url.trim().toLowerCase();
        const urlPattern = /^(https?:\/\/)?(www\.)?[a-z0-9.-]+\.[a-z]{2,}(:[0-9]{1,5})?(\/.*)?$/;
        return urlPattern.test(trimmedUrl);
    }

    isValidEmail(email) {
        // Regular expression to validate email format
        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        return emailPattern.test(email);
    }

    /**
     * Handle apply button click to create/update link
     * @param {Event} event - Click event
     */
    async handleApply(event) {

        event.preventDefault();

        if (this.state == 0) return;

        IMPACT_SELECTION._SNAPSHOT({
            save: true,
            lock: true
        });

        if (window.paraLock && typeof window.paraLock._isElementLocked === "function") {
            const isLocked = window.paraLock._isElementLocked(IMPACT_SELECTION.NODE, {
                check_closest: true,
                alertKey: 'ErrorLockedParaEdit'
            });
            if (isLocked) return false;
        }

        try {


            const {
                target
            } = event;

            if (target.disabled || target.hasAttribute("disabled") || target.classList.contains("disabled")) {

            }

            const {
                textInput,
                urlInput,
                linkType
            } = this.elements;

            const {
                currentInstance,
                editMode
            } = this;

            // Validate inputs
            const linkData = {
                text: textInput.value,
                url: urlInput.value.trim(),
                type: parseInt(linkType.value),
                textType: "URL/email",
                isUpdate: this.editMode
            };

            if (!this.validateLinkData(linkData)) {
                // this.showToast('Please check the link details and try again', 'warning');
                // ! WHAT-EVER - INGORE APPLY GIVEN LINK
                // return;
            }

            const isUrlOrEmail = this.isValidEmail(linkData.text) || this.hasHttpOrHttpsProtocol(linkData.text);

            let shouldContinue = true;

            if (linkData.text.toLowerCase() !== linkData.url.toLowerCase()) {

                linkData.textType = this.hasHttpOrHttpsProtocol(linkData.url) ? "URL" : "email";

                this.isHTTPorEmail = true;

                const result = await AlertNewDialog.fire('warning', "Warning", "Link_Text_URL_Match", 'Yes', 'No', true, {
                    linktype: linkData.textType
                });

                if (result.isConfirmed) {
                    shouldContinue = true;
                } else {
                    shouldContinue = false;
                    // Clear the flag so selection changes work again
                    this.isHTTPorEmail = false;
                    this.handleCancelorClose();
                    return;
                }
            }

            if (shouldContinue) {
                // Verify edit state if in edit mode
                if (this.editMode) {
                    // If editMode is true but editState is null, selection moved away from link
                    // We should NOT proceed with updateExistingLink as it would update wrong element
                    if (!this.editState) {
                        debug.warn('Edit mode active but no editState - selection moved away from link');
                        // Switch to insert mode to create new link at current selection
                        this.editMode = false;
                        this.insertMode = true;
                        // Update linkData.isUpdate to reflect mode change
                        linkData.isUpdate = false;
                    } else {
                        const {
                            element,
                            originalHref
                        } = this.editState;

                        // Verify element still exists in DOM
                        if (!element || !element.$ || !element.$.parentNode) {
                            debug.warn('Edit element no longer exists in DOM');
                            TOASTER_ALERT('ErrorHyperlink', {
                                type: 'error'
                            });
                            return;
                        }
                    }
                }

                const linkAttributes = this.buildLinkAttributes(linkData);

                // Handle link update vs new link creation
                // Use this.editMode (not destructured editMode) as it may have been
                // updated by the verification logic above when editState is missing
                if (this.editMode) {
                    this.updateExistingLink(linkData, linkAttributes);
                } else {
                    this.createNewLink(linkAttributes, linkData);
                }

                // Reset and close dialog
                this.isHTTPorEmail = false;
                this.handleCancelorClose();
                // GlobalEditor.focus();
                // this.showToast('Link successfully applied', 'success');
            }
        } catch (error) {

        } finally {
            IMPACT_SELECTION._SNAPSHOT({
                save: true,
                unlock: true
            });
        }

    }


    /**
     * Update existing link with new attributes
     * @param {Object} linkData - Link data object
     * @param {Object} attributes - Link attributes
     * @private
     */
    updateExistingLink(linkData, attributes) {
        try {
            debug.log("------updateExistingLink---------");

            // Use editState if available for verification
            const editElement = this.editState && this.editState.element || this.currentInstance.node;
            const originalHref = this.editState && this.editState.originalHref || this.currentInstance.curhref;

            if (!editElement) {
                throw new Error('No edit element found');
            }

            // Verify element still has expected href
            const currentHref = editElement.getAttribute('xlink:href');
            if (currentHref !== originalHref) {
                debug.warn('Href mismatch during update, proceeding with update anyway');
            }

            const {
                currentInstance
            } = this;

            // Preserve original href if same user is editing
            if (currentInstance.isSameUser && currentInstance.type === 'new') {
                attributes['old_href'] = currentInstance.curhref;
            }

            const node = editElement.$ || editElement;

            this.trackManager.updateAttributesOnly(node, attributes, HyperlinkDialogModule.LINK_TYPE_ATTRS);

            const oldText = node.textContent;
            var isParentInsert = node.parentNode.tagName.toLowerCase() == "insert" || node.closest("insert") != null;
            // Update text content if changed
            if (linkData.text.trim().length > 0 && oldText !== linkData.text) {
                if (isParentInsert) {
                    node.textContent = linkData.text;
                } else {
                    this.applyTrackedChange(node, linkData.text, oldText);
                }
            }

            this.closeDialog();
        } catch (error) {
            this.trackError('updateExistingLink', error);
            // this.showToast('Failed to apply link', 'error');
        }
    }

    /**
     * Create new link element
     * @param {Object} attributes - Base attributes (xlink:href, data-link, tracking attrs)
     * @param {Object} linkData   - { url, type, text, isUpdate }
     * @private
     */
    createNewLink(attributes, linkData) {
        try {

            var newLink = new CKEDITOR.style({
                element: 'span',
                attributes: {
                    ...attributes
                }
            });

            GlobalEditor.applyStyle(newLink);
        } catch (error) {
            this.trackError('createNewLink', error);
        }
    }

    getTrackingCode(linkData) {

        if (linkData.isUpdate)
            return "link-02";
        else if (!linkData.isUpdate) {
            return "link-01";
        }

    }
    buildLinkAttributes(linkData = {}, options = {}) {

        const client = commonMethods.getClientCode({
            format: 'upper'
        });
        const isUpdate = options.isUpdate !== undefined ? options.isUpdate : linkData.isUpdate;
        const linkType = options.type ? options.type : this._getLinkConfigType(linkData);
        const elemAttrs = HyperlinkDialogModule.getRefElemConfig(linkType, client, {
            isJournal: options.isJournal
        });
        const keys = isUpdate ? ["wsc_i_e"] : ["dt", "drn", "du", "wsc_i_e"];
        const trackCode = this.getTrackingCode({
            ...linkData,
            ...elemAttrs
        }) || "";
        // A pub-id leaf's own text IS the DOI -- it never needs an href. Every other resolved
        // shape (ext-link/uri, for any client whose link-rules.json maps doi-partial to
        // one of those instead of pub-id) does need a real, dereferenceable href -- keyed off the
        // *resolved* attrs shape, not the literal 'doi-partial' string, so this generalizes to
        // every client's config instead of special-casing one type value.
        const isPubId = elemAttrs['data-name'] === 'pub-id';
        let hrefData = options.url || linkData.url || "";
        if (!isPubId && linkType === 'doi-partial' && hrefData && !/^https?:\/\//i.test(hrefData)) {
            hrefData = `https://doi.org/${hrefData.replace(/^(?:https?:\/\/)?(?:dx\.)?doi\.org\//i, '')}`;
        }

        return {
            ...elemAttrs,
            ...(isPubId ? {} : {
                "xlink:href": hrefData
            }),
            "data-link": isUpdate ? "edit" : "new",
            "data-track-code": trackCode,
            ...commonMethods.Default.getAttributes(keys)
        };
    }

    removeLinkTypeAttributes(node, nextAttributes = {}) {
        if (!node) return;

        HyperlinkDialogModule.LINK_TYPE_ATTRS.forEach(attr => {
            if ((attr in nextAttributes) || !node.hasAttribute || !node.hasAttribute(attr)) return;

            if (typeof node.removeAttribute === "function") {
                node.removeAttribute(attr);
            } else if (node.$ && typeof node.$.removeAttribute === "function") {
                node.$.removeAttribute(attr);
            }
        });
    }

    /**
     * Returns { class, ...elementAttributes } for a given semantic type and client.
     * Resolves tokens from link-rules.json (DEFAULT / DEFAULT_JOURNAL / sparse clients).
     * @param {'body-url'|'reference-url'|'doi-full'|'doi-partial'|'email'} type
     * @param {string} client
     * @param {{isJournal?: boolean, dtd?: string}} [options]
     * @returns {Object}
     */
    static getRefElemConfig(type, client, options = {}) {
        const instance = HyperlinkDialogModule.resolveCurrentLinkRules(client, options);
        const token = instance[type];
        if (!token || typeof token !== 'string') {
            return HyperlinkDialogModule.REFERENCE_ELEMENT_ATTRS.extUri;
        }
        const attrsKey = normalizeAreaToken(token);
        const attrs = HyperlinkDialogModule.REFERENCE_ELEMENT_ATTRS[attrsKey];
        if (!attrs) {
            console.warn('Unknown link-rules token:', token);
            if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace('getRefElemConfig', 'Unknown token ' + token);
            }
            return HyperlinkDialogModule.REFERENCE_ELEMENT_ATTRS.extUri;
        }
        return attrs;
    }

    /**
     * Return the semantic link type for a text value in body/reference context.
     * @param {string} text - URL, DOI, or email text
     * @param {'body'|'reference'|boolean} context - Pass 'reference' or true for ref context
     * @returns {{type: 'body-url'|'reference-url'|'doi-full'|'doi-partial'|'email', attributes: Object}}
     */

    getLinkTypeFromText(text, context = 'body', options = {}) {

        const linkText = (text || '').trim();
        const isInRef = context === true || String(context).toLowerCase().startsWith('ref');
        const isDOI = this.validateDoi(linkText);
        const hasProtocol = this.hasHttpOrHttpsProtocol(linkText);


        const type = this.isEmailAddress(linkText) ?
            'email' :
            (isDOI && hasProtocol && isInRef) ?
            'doi-full' :
            (isDOI && !hasProtocol) ?
            'doi-partial' :
            (isInRef && hasProtocol) ?
            'reference-url' :
            'body-url';

        const attributes = this.buildLinkAttributes({}, {
            type: type,
            url: text,
            ...options
        });
        ['data-rolename', 'data-time', 'data-username'].forEach(attr => {
            // Remove tracking attributes for this context
            delete attributes[attr];
        });

        return {
            type: type,
            attributes: attributes
        };

    }

    /**
     * Resolve reference link text or an existing reference link element into one
     * client-aware descriptor. Reference workflows consume this result without
     * reclassifying DOI, URL, pub-id, or PMID values.
     */
    resolveReferenceLink(input = {}) {
        const element = input.element && input.element.$ ? input.element.$ : input.element;
        const expectedType = String(input.expectedType || '').toLowerCase();
        const elementName = element && element.getAttribute ?
            String(element.getAttribute('data-name') || element.className || '').split(/\s+/)[0].toLowerCase() : '';
        const pubIdType = element && element.getAttribute ?
            String(element.getAttribute('pub-id-type') || '').toLowerCase() : '';
        const extLinkType = element && element.getAttribute ?
            String(element.getAttribute('ext-link-type') || '').toLowerCase() : '';
        const href = element && element.getAttribute ?
            String(element.getAttribute('xlink:href') || element.getAttribute('href') || '').trim() : '';
        let activeText = '';

        if (element) {
            const clone = typeof element.cloneNode === 'function' ? element.cloneNode(true) : null;
            if (clone && clone.querySelectorAll) {
                clone.querySelectorAll('del').forEach((node) => node.remove());
                activeText = String(clone.textContent || '').replace(/\s+/g, ' ').trim();
            } else {
                activeText = String(element.textContent || '').replace(/\s+/g, ' ').trim();
            }
        }

        const rawValue = String(input.value != null ? input.value : (activeText || href)).trim();
        const isPmid = expectedType === 'pmid' || expectedType === 'object-id' ||
            elementName === 'object-id' || pubIdType === 'pmid';

        if (isPmid) {
            const attributes = element ? this.getReferenceElementAttributes(element) : {
                ...HyperlinkDialogModule.REFERENCE_ELEMENT_ATTRS.objectId
            };
            return {
                valid: !!rawValue,
                semanticType: 'pmid',
                type: 'pmid',
                token: 'object-id',
                value: rawValue,
                displayValue: rawValue,
                href: '',
                attributes
            };
        }

        const linkData = this.getLinkTypeFromText(rawValue, 'reference', {
            isUpdate: !!input.isUpdate,
            isJournal: input.isJournal,
            dtd: input.dtd
        });
        const semanticType = pubIdType === 'doi' || extLinkType === 'doi' ||
            String(linkData.type || '').indexOf('doi-') === 0 ? 'doi' : 'url';
        const attributes = element ? this.getReferenceElementAttributes(element) : {
            ...((linkData && linkData.attributes) || {})
        };
        const resolvedName = String(attributes['data-name'] || attributes.class || elementName || '').toLowerCase();
        const resolvedExtType = String(attributes['ext-link-type'] || extLinkType || '').toLowerCase();
        const type = resolvedName === 'pub-id' ? 'pub-id' :
            (resolvedName === 'object-id' ? 'pmid' :
                (resolvedName === 'uri' || resolvedExtType === 'uri' ? 'uri' :
                    (semanticType === 'doi' ? 'doi' : 'uri')));
        const resolvedHref = String(attributes['xlink:href'] || attributes.href || href || '').trim();
        const displayValue = semanticType === 'doi' && type !== 'pub-id' && resolvedHref ?
            resolvedHref : rawValue;
        const valid = semanticType === 'doi' ? this.validateDoi(rawValue || resolvedHref) :
            (!!rawValue && (this.validateUrl(rawValue) || !!resolvedHref));

        return {
            valid,
            semanticType,
            type,
            token: semanticType === 'doi' ? 'doi' : 'ext-link',
            value: rawValue,
            displayValue,
            href: resolvedHref,
            attributes
        };
    }

    getReferenceElementAttributes(element) {
        if (!element || !element.attributes) return {};
        return Array.from(element.attributes).reduce((attrs, attribute) => {
            attrs[attribute.name] = attribute.value;
            return attrs;
        }, {});
    }

    _isReferenceContext() {
        try {
            const ims = IMPACT_SELECTION || {};
            if (ims && ims.IsRef) return true;
            const node = ims.NODE && ims.NODE.$;
            return !!(node && typeof node.closest === 'function' && node.closest('ref, ref-list, .ref, .ref-list'));
        } catch {
            return false;
        }
    }

    _getLinkConfigType(linkData) {
        const linkText = this._getLinkConfigText(linkData);
        const context = this._isReferenceContext() ? 'reference' : 'body';

        return linkData.type === 1 ?
            'email' :
            this.getLinkTypeFromText(linkText, context).type;
    }

    _getLinkConfigText(linkData) {
        const selectedText = typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION.SEL_TEXT;
        return (selectedText || linkData.text || '').trim();
    }


    applyTrackedChange(existEl, newText, prevText) {
        try {
            if (!this.trackManager) {
                this.trackManager = new trackManager();
            }

            existEl = existEl.$ ? existEl.$ : (existEl[0] ? existEl[0] : existEl);
            // Create <del> and <ins> fragments
            const del_dom = this.trackManager.getDelNode();
            const ins_dom = this.trackManager.getInsNode();

            // Old text goes into <del>
            if (prevText) {
                del_dom.textContent = prevText;
                existEl.parentNode.insertBefore(del_dom, existEl);
            }

            // New text goes into <ins>
            if (newText) {
                existEl.textContent = newText;
                existEl.parentNode.insertBefore(ins_dom, existEl);
                ins_dom.appendChild(existEl);
            }

            console.log("Tracked change applied:", {
                prevText,
                newText
            });
        } catch (err) {
            ref_logError("applyTrackedChange", err);
        }
    }


    /**
     * Show toast message
     * @param {string} message - Message to display
     * @param {string} type - Toast type (success/error/warning)
     * @private
     */
    showToast(message, type = 'info') {
        // Implementation depends on the toast system being used
        // This is a placeholder that integrates with the existing TOASTER_ALERT
        if (typeof TOASTER_ALERT === 'function') {
            TOASTER_ALERT(message, {
                type
            });
        }
    }


    /**
     * Handle cancel button click
     */
    handleCancelorClose() {
        try {
            this.closeDialog();
            this.resetDialog();
        } catch (error) {
            this.trackError('handleCancelorClose', error);
        }
    }

    /**
     * Validate all inputs
     */
    validateInputs() {
        try {

            if (Object.keys(this.elements).length == 0) {
                this.initializeElements();
            }

            const {
                urlInput,
                textInput,
                linkType
            } = this.elements;
            const url = urlInput.value;
            const text = textInput.value;

            if (!url && !text) {
                this.resetValidationState();
                return;
            }

            const isEmail = this.isEmailAddress(url);
            const isValidUrl = this.hasHttpOrHttpsProtocol(url);
            linkType.value = isEmail ? 1 : 2;
            this.updateUIState({
                isEmail,
                isValidUrl,
                showUrlControls: !isEmail && url.length > 0,
                enableApply: isEmail || isValidUrl
            });
        } catch (error) {
            this.trackError('validateInputs', error);
        }
    }

    /**
     * Update UI state based on validation results
     * @param {Object} state - UI state object
     */
    updateUIState({
        isEmail,
        isValidUrl,
        showUrlControls,
        enableApply
    }) {
        try {
            const {
                urlValidateBtn,
                urlIcon,
                urlInput,
                applyBtn
            } = this.elements;

            this.toggleElementClasses(urlValidateBtn, showUrlControls);
            this.toggleElementClasses(urlIcon, showUrlControls);
            this.toggleElementClasses(urlInput, isValidUrl, isEmail);
            this.toggleElementClasses(applyBtn, enableApply, isEmail ? isEmail : null);
        } catch (error) {
            this.trackError('updateUIState', error);
        }
    }

    /**
     * Toggle element classes based on state
     * @param {HTMLElement} element - DOM element
     * @param {boolean} show - Show/hide flag
     * @param {boolean} isValid - Validation state
     */
    toggleElementClasses(element, show, isValid = null) {
        try {
            if (!element) return;

            const {
                valid,
                invalid,
                addDisable,
                both,
                addNone
            } = HyperlinkDialogModule.BUTTON_ACTIONS;

            if (isValid !== null) {
                const removeClasses = [
                    ...(isValid ? [addDisable, addNone] : []),
                    ...both
                ];

                element.classList.remove(...removeClasses);
                element.classList.add(isValid ? valid : invalid);
            } else {
                if (show) element.classList.remove(...(show ? [addNone] : []));
                else element.classList.toggle(addNone, !show);
            }
        } catch (error) {
            this.trackError('toggleElementClasses', error);
            // this.showToast('Failed to apply link', 'error');
        }
    }


    /**
     * Reset dialog to initial state
     */
    resetDialog() {
        const {
            textInput,
            urlInput,
            linkType
        } = this.elements;

        textInput.value = '';
        urlInput.value = '';
        linkType.value = '0';

        this.currentInstance = {};
        this.resetValidationState();
    }

    /**
     * Override closeDialog to handle dialog cleanup
     */
    closeDialog() {
        // Clear edit state when dialog closes
        this.editState = null;
        this.formModified = false;
        this.originalEditHref = null;

        // Call parent closeDialog first
        if (typeof super.closeDialog === 'function') {
            super.closeDialog();
        }
    }

    /**
     * Reset validation state
     */
    resetValidationState() {
        try {
            const {
                urlInput,
                applyBtn,
                urlIcon,
                urlValidateBtn
            } = this.elements;

            urlInput.classList.remove('is-invalid', 'is-valid');
            applyBtn.classList.add('disabled');
            urlIcon.classList.add('ds-none');
            urlValidateBtn.classList.add('ds-none');
        } catch (error) {
            this.trackError('resetValidationState', error);
        }
    }

    // Utility methods
    isEmailAddress(email) {
        if (!email || !email.includes('@')) return false;

        // Extract the domain from the email
        const emailDomain = email.split('@').pop();

        // Allowable domains from LINK_DOMAINS
        const domainPattern = HyperlinkDialogModule.LINK_DOMAINS.join('|').replace(/\./g, '\\.');

        // Regex to match common TLDs if not explicitly listed
        const commonTldPattern = '\\.(com|net|org|info|edu|gov|co|io|ai|me|us|uk|ca|au)$';

        const commonDomainPattern = '^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.[A-Za-z]{2,6}$';

        // Check if the domain matches LINK_DOMAINS or common TLDs
        return new RegExp(`(${domainPattern}|${commonTldPattern}|${commonDomainPattern})$`, 'i').test(emailDomain);
    }

    validateDoi(doi) {
        if (!doi) return false;
        let {
            DOI_Pattern_1,
            DOI_Pattern_2
        } = this['G_SCOPE'];
        let isValid = false;

        // If doi is a full URL, strip the prefix
        let doiStr = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');

        if (DOI_Pattern_1 && DOI_Pattern_2) {
            isValid = new RegExp(DOI_Pattern_1).test(doiStr);
            if (!isValid) isValid = new RegExp(DOI_Pattern_2).test(doiStr);
        }
        return isValid;
    }
    validateUrl(url) {
        if (!url) return false;
        try {
            const parsed = new URL(url);
            const hostname = parsed.hostname.toLowerCase();
            const domainPattern = HyperlinkDialogModule.LINK_DOMAINS
                .map(domain => domain.toLowerCase().replace(/\./g, '\\.'))
                .join('|');
            const regex = new RegExp(`(${domainPattern})$`, 'i');
            return regex.test(hostname);
        } catch {
            return false;
        }
    }

    validateLinkData(linkData) {
        return !!linkData.text && (this.isEmailAddress(linkData.url) || this.validateUrl(linkData.url));
    }

    formatUrlWithPrefix(url) {
        if (!url || url.includes('@')) return url;

        if (url.startsWith('www.')) {
            return `${HyperlinkDialogModule.URL_PREFIXES[0]}${url}`;
        }

        return url;
    }

    /**
     * Validate URL with server
     * @param {string} url - URL to validate
     * @returns {Promise} Validation response
     */
    validateUrlWithServer(url) {
        const json_data = {
            content: `[URL] ${url} [URL]`,
            docID: SHARED_KEY.docid
        };

        return this.apiService.makeRequest("urlvalidation", json_data, {
            isPayloadLogic: true
        });
    }

    /**
     * Handle or reject link modifications
     * @param {Object} ckElm - CKEditor element
     * @param {Object} Options - Options for removal or action
     * @returns {Element|undefined} Modified element if action is specified
     */
    RemoveReject(ckElm, Options) {
        Options = !Options ? ({
            remove: false,
            action: false
        }) : Options;

        const isSameUser = commonMethods.IS_SAME_USER_AND_ROLE(ckElm);
        const elementData = {
            linkType: ckElm.getAttribute('data-link'),
            href: ckElm.getAttribute(ckElm.hasAttribute('old_href') ? 'old_href' : 'xlink:href'),
            currentTime: new Date().getTime(),
            isEmail: ckElm.$.className === 'email',
            isSameUser
        };
        if (Options.action) {
            return this.handleAction(ckElm, elementData, Options);
        }
        GlobalEditor.focus();
    }


    handleAction(ckElm, {
        href,
        linkType,
        isSameUser,
        isEmail
    }, Options) {

        const IsReject = ["Rejected", REJECT].includes(Options.action);
        var addCommonAttr = true;

        if (IsReject) {
            if (linkType === "new") {
                //  3344699	LWW - Client Requirement- Rejecting the same user's corrections
                addCommonAttr = true;
                commonMethods.SET_REMOVE_ATTR(ckElm, {
                    "old_href": href
                }, ['href', 'xlink:href']);
            } else {
                // ? edit-type-logic
                commonMethods.setAttr(ckElm, {
                    "xlink:href": href
                });

                if (!isEmail) {
                    commonMethods.setAttr(ckElm, {
                        "href": href
                    });
                }
            }
        }
        if (addCommonAttr) {
            commonMethods.setAttr(ckElm, {
                "data-action": Options.action,
                "default": ["dat", "dau", "dar", "drn"]
            });
        }
        return null;
    }

    /**
     * Build a client-specific XML reference element string.
     * @param {'body-url'|'reference-url'|'doi-full'|'doi-partial'|'special-case'} type
     * @param {string} value - The URL or DOI value
     * @param {string} [client] - Client code (LWW / INTELLECT / MEDKNOW / TNF); defaults to commonMethods.getClientCode result
     * @param {{ isJournal?: boolean, dtd?: string, journalCode?: string }} [options]
     * @returns {string} XML element string; falls back to DEFAULT structure if client is unrecognised
     */

    createReferenceElement(type, value, client, options = {}) {
        try {
            const resolvedClient = client || commonMethods.getClientCode({
                format: 'upper'
            });
            const instance = HyperlinkDialogModule.resolveCurrentLinkRules(resolvedClient, options);
            if (type === 'special-case') {
                const sc = instance['special-case'];
                if (!isSpecialCaseAllowed(sc, options.journalCode)) return value;
                const builderName = (sc && sc.builder) || 'specialCase';
                const builder = HyperlinkDialogModule.REFERENCE_ELEMENT_BUILDERS[builderName];
                return builder ? builder(value) : value;
            }
            const token = instance[type];
            if (!token || typeof token !== 'string') return value;
            const builder = HyperlinkDialogModule.REFERENCE_ELEMENT_BUILDERS[token]
                || HyperlinkDialogModule.REFERENCE_ELEMENT_BUILDERS[normalizeAreaToken(token)];
            if (!builder) return value;
            return builder(value);
        } catch (error) {
            this.trackError('createReferenceElement', error);
            return value;
        }
    }

    /**
     * Get the last validation result from selection change
     * Useful for context menu to check if link operations are valid
     * @returns {Object|null} Last validation result or null if none
     */
    getLastValidation() {
        return this.lastValidation || null;
    }

    /**
     * Check if current selection is valid for creating a new link
     * @returns {boolean} True if selection is valid for new link
     */
    isValidForNewLink() {
        if (!this.lastValidation) {
            // No validation cached, run it now
            this.lastValidation = this.validateSelection(null, false);
        }
        const v = this.lastValidation;
        // Valid for new link if: not canIgnore, not a link, no existing links, has text
        return v && v.isValid && !v.isLink && v.eLinkCount === 0 && v.hasSelectionText;
    }

    /**
     * Check if current selection is valid for editing a link
     * @returns {boolean} True if selection contains an editable link
     */
    isValidForEditLink() {
        if (!this.lastValidation) {
            this.lastValidation = this.validateSelection(null, true);
        }
        const v = this.lastValidation;
        // Valid for edit if: not canIgnore and (isLink or has eLinkCount)
        return v && !v.canIgnore && (v.isLink || v.eLinkCount > 0);
    }

    /**
     * Create new instance of HyperlinkDialogModule
     * @param {Object} errorTracker - Error tracking instance
     * @param {Object} options - Configuration options
     * @returns {HyperlinkDialogModule} New instance
     */
    static create(errorTracker, options = {}) {
        return new HyperlinkDialogModule('HyperlinkDialogModule', errorTracker, options);
    }




}

export default HyperlinkDialogModule;
