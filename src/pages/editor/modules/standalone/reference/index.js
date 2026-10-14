class ReferenceModule extends BaseModule {
    constructor(name = 'ReferenceModule', subFolder = 'reference', options = {}) {
        super(name, subFolder, options);
        debug.log('index:constructor');
        this._id = 'ReferenceDialog';
        this.canUnmountComponentWhileClose = true;
        this.stateBag = this.createDefaultState();
        this._eventsBound = false;
        this.formChrome = null;
        this.modeHandlers = null;
        this._debouncedFormInput = null;
        this._plainTextSummernoteInputTimer = null;
        this._demandLeafSummernoteInputTimer = null;
        this._lastPreviewStateSignature = null;
        this._importPromise = this._importDependencies();
        this._bindModuleMethods();

    }

    static DOI_FETCH_CACHE_VERSION = 1;
    static DOI_FETCH_CACHE_TTL_MS = 30 * 60 * 1000;

    async _importDependencies() {
        debug.log('index:_importDependencies');
        const [{
                default: RefBridge
            },
            {
                default: InsertReferenceMode
            },
            {
                default: EditReferenceMode
            },
            {
                default: MissingQueryReferenceMode
            },
            common
        ] = await Promise.all([
            import('../ref_bridge/index.js'),
            import('./insert_mode.js'),
            import('./edit_mode.js'),
            import('./query_mode.js'),
            import('./common.js')
        ]);

        this.RefBridge = RefBridge;
        this.FormChrome = common.FormChrome;
        this.normalizeAuthors = common.normalizeAuthors;
        this.queryTextFromNode = common.queryTextFromNode;
        this.queryPreviewSpans = common.getQueryPreviewSpans;
        this.citationHasRepeatedConfiguredElements = common.citationHasRepeatedConfiguredElements;
        this.enterEditAllFieldsMode = common.enterEditAllFieldsMode;
        this.enterQueryRespondMode = common.enterQueryRespondMode;
        this.syncCitationsAfterEdit = common.syncCitationsAfterEdit;
        this.applyQueryResponseUpdate = common.applyQueryResponseUpdate;
        this.buildQueryMissingResponseText = common.buildQueryMissingResponseText;
        this.resolveLastSameUserQueryResponse = common.resolveLastSameUserQueryResponse;
        this.bindConfigFromMessages = common.bindConfigFromMessages;
        this.isBooksClient = common.isBooksClient;
        this.shouldShowInsertRefOnly = common.shouldShowInsertRefOnly;
        this.shouldAllowQueryFieldEditor = common.shouldAllowQueryFieldEditor;
        this.tokenForInputId = common.tokenForInputId;
        this.reconcileMappedFieldsFromValues = common.reconcileMappedFieldsFromValues;
        this.referenceDebugBegin = common.referenceDebugBegin;
        this.referenceDebugEnd = common.referenceDebugEnd;
        this.referenceDebugLog = common.referenceDebugLog;

        this.validateDoiFormat = common.validateDoiFormat;
        this.applyDoiInputValidation = common.applyDoiInputValidation;
        this.checkDuplicateReference = common.checkDuplicateReference;
        this.resolveOpenPrompt = common.resolveOpenPrompt;
        this.inputIdForToken = common.inputIdForToken;
        this.applyTypeButtonGroupLock = common.applyTypeButtonGroupLock;
        this.styleOrderHasDoi = common.styleOrderHasDoi;
        common.setReferenceErrorReporter((functionName, err) => this.logError(functionName, err));

        const insert = InsertReferenceMode.create();
        const edit = EditReferenceMode.create();
        const query = MissingQueryReferenceMode.create();
        await Promise.all([insert, edit, query].map((handler) => handler._ensureReady()));
        this.modeHandlers = {
            insert,
            edit,
            query
        };
        this.init();
    }

    async _ensureReady() {
        debug.log('index:_ensureReady');
        await this._importPromise;
    }

    // binds every prototype method to the instance so handlers keep `this` when passed as bare callbacks (event listeners, etc.)
    _bindModuleMethods() {
        debug.log('index:_bindModuleMethods');
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== 'constructor' && typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        });
    }

    createDefaultState() {
        debug.log('index:createDefaultState');
        return {
            mode: 'insert',
            insertMethod: 'doi_form',
            refType: 'journal',
            template: null,
            values: {},
            fields: [],
            authors: this.normalizeAuthors ? this.normalizeAuthors([]) : [{
                index: 0,
                surname: '',
                givenname: ''
            }],
            editors: this.normalizeAuthors ? this.normalizeAuthors([]) : [{
                index: 0,
                surname: '',
                givenname: ''
            }],
            translators: [],
            contributorTrim: null,
            hasEditorGroup: false,
            hasTranslatorGroup: false,
            doi: '',
            doiFetched: false,
            doiFetchSnapshot: null,
            doiFetchSnapshotAt: null,
            plainText: '',
            plainCite: '',
            bulkPlainEnabled: false,
            bulkPlainPreparing: false,
            bulkPlainEntries: [],
            queryRespond: '',
            queryText: '',
            editAllFields: false,
            queryRespondMode: false,
            showHints: false,
            canSubmit: false,
            preview: '',
            sourcePolicy: '',
            lastBuiltHtml: '',
            previewNode: null,
            contextRef: null
        };
    }

    getRefBridge() {
        debug.log('index:getRefBridge');
        if (typeof window !== 'undefined' && window.refBridge) return window.refBridge;
        return this.RefBridge.create();
    }

    getSummernoteConfig(input) {
        debug.log('index:getSummernoteConfig');
        const baseConfig = this.SUMMERNOTE_CONFIG || {};
        if (this.isPlainTextSummernoteTarget(input)) {
            return this.getPlainTextSummernoteConfig(baseConfig);
        }
        if (this.isDemandLeafSummernoteTarget(input)) {
            return this.getDemandLeafSummernoteConfig(baseConfig);
        }
        return baseConfig;
    }

    getPlainTextSummernoteConfig(baseConfig = {}) {
        debug.log('index:getPlainTextSummernoteConfig');
        const baseCallbacks = baseConfig.callbacks || {};
        const owner = this;
        const wrapCallback = (name, options = {}) => {
            return function referencePlainTextSummernoteCallback(...args) {
                if (typeof baseCallbacks[name] === 'function') {
                    baseCallbacks[name].apply(this, args);
                }
                owner.schedulePlainTextSummernoteInput(options);
            };
        };

        return {
            ...baseConfig,
            callbacks: {
                ...baseCallbacks,
                onKeyup: wrapCallback('onKeyup'),
                onPaste: wrapCallback('onPaste', {
                    defer: true
                }),
                onChange: wrapCallback('onChange')
            }
        };
    }

    getDemandLeafSummernoteConfig(baseConfig = {}) {
        debug.log('index:getDemandLeafSummernoteConfig');
        const baseCallbacks = baseConfig.callbacks || {};
        const owner = this;
        const wrapCallback = (name, options = {}) => {
            return function referenceDemandLeafSummernoteCallback(...args) {
                if (typeof baseCallbacks[name] === 'function') {
                    baseCallbacks[name].apply(this, args);
                }
                owner.scheduleDemandLeafSummernoteInput(options);
            };
        };

        return {
            ...baseConfig,
            callbacks: {
                ...baseCallbacks,
                onKeyup: wrapCallback('onKeyup'),
                onPaste: wrapCallback('onPaste', {
                    defer: true
                }),
                onChange: wrapCallback('onChange')
            }
        };
    }

    isPlainTextSummernoteTarget(input) {
        debug.log('index:isPlainTextSummernoteTarget');
        const plainId = (this.DOM_IDS && this.DOM_IDS.plainValue) || 'reference_plain_value';
        return !!(input && plainId && input.id === plainId);
    }

    isDemandLeafSummernoteTarget(input) {
        debug.log('index:isDemandLeafSummernoteTarget');
        if (!input || !input.id) return false;
        if (this.isPlainTextSummernoteTarget(input)) return false;
        const id = String(input.id);
        if (typeof this.isBooksClient === 'function' ? this.isBooksClient() : false) {
            return /^(reference_title|reference_chapter_title|reference_source|reference_collab|reference_publisher_name|reference_publisher_loc)$/.test(id) ||
                /^reference_surname_\d+$/.test(id) ||
                /^reference_givenname_\d+$/.test(id);
        }
        return id === 'reference_title' || id === 'reference_source';
    }

    getSummerNoteContent(target) {
        debug.log('index:getSummerNoteContent');
        if (!this._summernote) return '';
        return this._summernote.getContent(target);
    }

    setSummerNoteContent(content, target) {
        debug.log('index:setSummerNoteContent');
        if (!this._summernote) return;
        this._summernote.setContent(content, target);
    }

    isPlainTextInsertActive() {
        debug.log('index:isPlainTextInsertActive');
        return !!(this.stateBag && this.stateBag.mode === 'insert' && this.stateBag.insertMethod === 'plain_text');
    }

    cancelPlainTextSummernoteInput() {
        debug.log('index:cancelPlainTextSummernoteInput');
        if (this._plainTextSummernoteInputTimer) {
            clearTimeout(this._plainTextSummernoteInputTimer);
            this._plainTextSummernoteInputTimer = null;
        }
    }

    cancelDemandLeafSummernoteInput() {
        debug.log('index:cancelDemandLeafSummernoteInput');
        if (this._demandLeafSummernoteInputTimer) {
            clearTimeout(this._demandLeafSummernoteInputTimer);
            this._demandLeafSummernoteInputTimer = null;
        }
    }

    schedulePlainTextSummernoteInput(options = {}) {
        debug.log('index:schedulePlainTextSummernoteInput');
        if (!this.isPlainTextInsertActive()) {
            this.cancelPlainTextSummernoteInput();
            return;
        }

        const run = () => {
            this._plainTextSummernoteInputTimer = null;
            if (!this.isPlainTextInsertActive()) return;
            const handler = this._debouncedFormInput || this.handleDebouncedFormInput;
            if (typeof handler === 'function') handler();
        };

        if (options.defer) {
            this.cancelPlainTextSummernoteInput();
            this._plainTextSummernoteInputTimer = setTimeout(run, 0);
            return;
        }

        run();
    }

    scheduleDemandLeafSummernoteInput(options = {}) {
        debug.log('index:scheduleDemandLeafSummernoteInput');
        // Same full-template rebuild as insert / DOI fetch: debounced collect → buildReferenceFromPayload
        const run = () => {
            this._demandLeafSummernoteInputTimer = null;
            const handler = this._debouncedFormInput || this.handleDebouncedFormInput;
            if (typeof handler === 'function') handler();
        };

        if (options.defer) {
            this.cancelDemandLeafSummernoteInput();
            this._demandLeafSummernoteInputTimer = setTimeout(run, 0);
            return;
        }

        run();
    }

    async initializeElements() {
        debug.log('index:initializeElements');
        await this._ensureReady();

        this.bindConfigFromMessages(this);
        const q = (id) => this.Panel.querySelector(this.idSelector(id));
        this.elements = {
            headerTitle: this.Panel.querySelector('.dia_header_text') || this.Panel.querySelector('[data-id="headerTitle"]'),
            typeBtnGroup: q(this.DOM_IDS.typeBtnGroup),
            typeRow: q(this.DOM_IDS.typeOptionsForm),
            methodGroup: q(this.DOM_IDS.insRefMethodGroup),
            methodRadios: Array.from(this.Panel.querySelectorAll(`[name="${this.RADIO_NAMES.insMethod}"]`)),
            formGroup: q(this.DOM_IDS.formGroup),
            openFormGroup: q(this.DOM_IDS.divOpenForm),
            authorsHost: q(this.DOM_IDS.authorRepeat),
            editorsHost: q(this.DOM_IDS.editorRepeat),
            doiValue: q(this.DOM_IDS.doiValue),
            doiFetchBtn: q(this.DOM_IDS.validateDoiBtn),
            plainValue: q(this.DOM_IDS.plainValue),
            bulkPlainWrap: q(this.DOM_IDS.bulkPlainWrap),
            bulkPlainInsert: q(this.DOM_IDS.bulkPlainInsert),
            plainCiteGroup: q(this.DOM_IDS.citeInputGroup),
            plainCite: q(this.DOM_IDS.plainTextCite),
            queryDiv: q(this.DOM_IDS.queryDiv),
            queryPreview: q(this.DOM_IDS.previewQuery),
            queryRespondDiv: q(this.DOM_IDS.queryCloseDiv),
            queryRespond: q(this.DOM_IDS.queryRespond),
            hintsDiv: q(this.DOM_IDS.hintsDiv),
            hintText: q(this.DOM_IDS.hint),
            editAllBtn: q(this.DOM_IDS.editAllField),
            replyQryBtn: q(this.DOM_IDS.replyQryEditRef),
            updateCmdBtn: q(this.DOM_IDS.updateCmdEditRef),
            insertRefOnlyBtn: q(this.DOM_IDS.insertRefWoCite),
            previewHost: q(this.DOM_IDS.preview),
            insertBtn: q(this.DOM_IDS.insertRef),
            updateBtn: q(this.DOM_IDS.insertEditRef),
            cancelBtn: q(this.DOM_IDS.cancelEditRef),
            closeIcon: this.Panel.querySelector('.closeIcons'),
            spinner: q(this.DOM_IDS.spinner)
        };
        this.formChrome = this.FormChrome.create(this.elements, this.Panel, this);
        await this.formChrome._ensureReady();
    }

    setupEventListeners() {
        debug.log('index:setupEventListeners');
        // if (this._eventsBound) return;
        const elements = this.elements;

        if (elements.typeBtnGroup) {
            elements.typeBtnGroup.addEventListener('click', this.handleTypeClick);
        }
        if (elements.methodGroup) {
            elements.methodGroup.addEventListener('click', this.handleMethodClick);
        }

        const debounceFn = (typeof window !== 'undefined' && typeof window.referenceResolveDebounce === 'function' ?
                window.referenceResolveDebounce :
                null) ||
            (typeof Debounce_Event === 'function' ? Debounce_Event : null);
        this._debouncedFormInput = debounceFn ?
            debounceFn(this.handleDebouncedFormInput, 900) :
            this.handleDebouncedFormInput;

        const formInputRoot = elements.openFormGroup || elements.formGroup;
        if (formInputRoot) {
            formInputRoot.addEventListener('input', this._debouncedFormInput);
            formInputRoot.addEventListener('keyup', this._debouncedFormInput);
            formInputRoot.addEventListener('change', this._debouncedFormInput);
        }
        if (elements.authorsHost) {
            elements.authorsHost.addEventListener('input', this._debouncedFormInput);
            elements.authorsHost.addEventListener('click', this.handleAuthorClick);
        }
        if (elements.editorsHost) {
            elements.editorsHost.addEventListener('input', this._debouncedFormInput);
            elements.editorsHost.addEventListener('click', this.handleEditorClick);
        }
        if (elements.doiValue) {
            elements.doiValue.addEventListener('input', this.handleDoiInput);
        }
        if (elements.doiFetchBtn) {
            elements.doiFetchBtn.addEventListener('click', this.handleDoiFetch);
        }
        if (elements.plainValue) {
            elements.plainValue.addEventListener('input', this._debouncedFormInput);
            elements.plainValue.addEventListener('paste', this._debouncedFormInput);
        }
        if (elements.plainCite) {
            elements.plainCite.addEventListener('input', this._debouncedFormInput);
        }
        if (elements.bulkPlainInsert) {
            elements.bulkPlainInsert.addEventListener('change', this.handleBulkPlainChange);
        }
        if (elements.queryRespond) {
            elements.queryRespond.addEventListener('input', this.handleQueryRespondInput);
        }
        if (elements.insertBtn) elements.insertBtn.addEventListener('click', () => this.handleInsert(false));
        if (elements.insertRefOnlyBtn) elements.insertRefOnlyBtn.addEventListener('click', () => this.handleInsert(true));
        if (elements.updateBtn) elements.updateBtn.addEventListener('click', this.handlePrimaryUpdate);
        if (elements.editAllBtn) elements.editAllBtn.addEventListener('click', this.handleEditAllFields);
        if (elements.replyQryBtn) elements.replyQryBtn.addEventListener('click', this.handleReplyQuery);
        if (elements.updateCmdBtn) elements.updateCmdBtn.addEventListener('click', this.handleUpdateWithCommand);
        if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', this.handleCancel);
        if (elements.closeIcon) elements.closeIcon.addEventListener('click', this.handleCancel);

        this._eventsBound = true;
    }

    initLoop() {
        debug.log('-----------index:initLoop---------------');
        try {
            this.FullyLoaded = true;
            this.initiated = true;
        } catch (err) {
            this.trackError('initLoop', err);
        }
    }

    /**
     * Normalize legacy QueryBaseModule / MultiRef call shapes:
     *   show(el, { FROM_QRY: true }) → show('query', { element: ref, queryNode: el })
     *   show(null, { menuClick: true }) → show('open', …)
     */
    normalizeShowArgs(action, payload = {}) {
        debug.log('index:normalizeShowArgs');
        const flags = payload && typeof payload === 'object' && !payload.nodeType ? payload : {};
        const isDomNode = action && typeof action === 'object' && action.nodeType === 1;
        const fromQry = !!(flags.FROM_QRY || flags.fromQry || flags.query === true);

        if (isDomNode && fromQry) {
            const queryNode = flags.queryNode || flags.query || action;
            const queryEl = queryNode && queryNode.nodeType === 1 ? queryNode : action;
            const refEl = (queryEl.closest && queryEl.closest('.ref')) ||
                (action.closest && action.closest('.ref')) ||
                null;
            return {
                action: 'query',
                payload: {
                    ...flags,
                    element: flags.element || refEl || action,
                    queryNode: queryEl
                }
            };
        }

        if ((action == null || action === '' || isDomNode) &&
            (flags.menuClick || flags.INSERT_MODE || flags.insert === true) &&
            !fromQry) {
            return {
                action: 'open',
                payload: {
                    ...flags,
                    element: flags.element || (isDomNode ? action : null)
                }
            };
        }

        return {
            action,
            payload: flags
        };
    }

    showBefore(action, payload = {}) {
        debug.log('index:showBefore');
        const normalized = this.normalizeShowArgs(action, payload);
        action = normalized.action;
        payload = normalized.payload;
        if (action !== 'open' && action !== 'insert') {
            const ref = this.resolveRefNode(payload.element || payload.id);
            if (!ref && action !== 'query') {
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('No reference selected', {
                        type: 'warning'
                    });
                }
                return false;
            }
            if (action === 'query' && ref && typeof this.citationHasRepeatedConfiguredElements === 'function' &&
                this.citationHasRepeatedConfiguredElements(ref)) {
                const dialog = typeof window !== 'undefined' ? window.queryDialog : null;
                if (dialog && typeof dialog.open === 'function') {
                    dialog.open(payload.queryNode || null, 'comment');
                }
                return false;
            }
        }
        return true;
    }

    async showLoop(action, payload = {}) {
        debug.log('index:showLoop');
        try {
            const normalized = this.normalizeShowArgs(action, payload);
            action = normalized.action;
            payload = normalized.payload;
            await this._ensureReady();
            await this.initializeElements();
            this.setupEventListeners();
            this._lastPreviewStateSignature = null;
            const mode = action === 'edit' ? 'edit' : action === 'query' ? 'query' : 'insert';
            const refNode = this.resolveRefNode(payload.element || payload.id);
            const refType = action === 'insert' ? 'journal' : this.resolveRefType(refNode) || 'journal';
            const handler = this.getModeHandler(mode);

            this.stateBag = handler.createModeState({
                refType,
                contextRef: refNode,
                refNode,
                queryNode: payload.queryNode || payload.query || null,
                insertMethod: mode === 'insert' ? 'doi_form' : 'open_form'
            }, {
                ...this.createDefaultState(),
                documentRoot: this.getDocumentRoot()
            });
            if (this.stateBag.queryNode) {
                this.stateBag.queryText = this.queryTextFromNode(this.stateBag.queryNode);
            }
            if (mode === 'insert') {
                this.stateBag.showHints = typeof iREF_SCOPE !== 'undefined' && !!iREF_SCOPE.IS_NAME_DATE;
            }
            this.syncTypeRadioUi(this.stateBag.refType);
            this.prepareTemplate();
            this.refreshPreview();
            if (typeof this.applyMessagesJsonLabels === 'function') {
                this.applyMessagesJsonLabels();
            }
            this.autoFocus();
            if (mode === 'edit') {
                if (this._stats && !this._stats.warning_edit_mode) {
                    this._stats.warning_edit_mode = 1;
                }

                if (this._stats.warning_edit_mode == 1) {
                    if (typeof TOASTER_ALERT === 'function') {
                        TOASTER_ALERT('ref_edit_mode_warn', {
                            type: 'warning'
                        });
                        this._stats.warning_edit_mode++;
                    }
                }


            }
            await this.promptOpenFields();
        } catch (err) {
            this.trackError('showLoop', err);
        }
    }

    getModeHandler(mode = this.stateBag.mode) {
        debug.log('index:getModeHandler');
        return this.modeHandlers[mode] || this.modeHandlers.insert;
    }

    prepareTemplate() {
        debug.log('index:prepareTemplate');
        const bridge = this.getRefBridge();
        this.stateBag = this.getModeHandler().prepareTemplate({
            ...this.stateBag,
            documentRoot: this.getDocumentRoot()
        }, bridge);
        this.updateCanSubmit();
        this.render();
        if (typeof this.applyMessagesJsonLabels === 'function') {
            this.applyMessagesJsonLabels({
                selector: '[data-lang-lab]'
            });
        }
    }

    render(options = {}) {
        debug.log('index:render');
        if (this.formChrome) this.formChrome.render(this.stateBag, options);
        if (typeof this.syncTypeRadioUi === 'function') {
            this.syncTypeRadioUi(this.stateBag && this.stateBag.refType);
        }
    }

    collectIntoState() {
        debug.log('index:collectIntoState');
        if (!this.formChrome) return;
        const collected = this.formChrome.collectFormValues(this.stateBag);
        this.stateBag = {
            ...this.stateBag,
            values: collected.values,
            authors: this.normalizeAuthors(collected.authors),
            editors: this.normalizeAuthors(collected.editors || []),
            translators: this.normalizeAuthors(collected.translators || []),
            doi: collected.doi,
            plainText: collected.plainText,
            plainCite: collected.plainCite,
            queryRespond: collected.queryRespond
        };
        if (typeof this.reconcileMappedFieldsFromValues === 'function') {
            this.stateBag = this.reconcileMappedFieldsFromValues(this.stateBag);
        }
        this.updateCanSubmit();
    }

    readPlainTextEditorValue(input) {
        debug.log('index:readPlainTextEditorValue');
        if (!input) return '';
        const root = typeof window !== 'undefined' ? window : globalThis;
        const jq = (root && root.$) || (typeof globalThis !== 'undefined' ? globalThis.$ : null);
        try {
            if (typeof jq === 'function') {
                const $input = jq(input);
                const isSummernote = !!($input && $input.data && $input.data('summernote'));
                if (isSummernote) {
                    if (this._summernote && typeof this.getSummerNoteContent === 'function') {
                        return this.stripPlainTextBreaks(this.getSummerNoteContent(input));
                    }
                    if ($input && typeof $input.summernote === 'function') {
                        return this.stripPlainTextBreaks($input.summernote('code'));
                    }
                }
            }
        } catch (_) {
            /* fall back to the source element value */
        }
        return input.value != null ? input.value : '';
    }

    stripPlainTextBreaks(html) {
        const raw = html == null ? '' : String(html);
        if (!raw || !/<\s*br\b/i.test(raw)) return raw;
        const holder = (typeof document !== 'undefined') ? document.createElement('span') : null;
        if (!holder) return raw.replace(/<\s*br\s*\/?>/gi, '');
        holder.innerHTML = raw;
        holder.querySelectorAll('br').forEach((el) => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
        return holder.innerHTML;
    }

    collectPlainTextIntoState() {
        debug.log('index:collectPlainTextIntoState');
        const elements = this.elements || {};
        this.stateBag = {
            ...this.stateBag,
            plainText: this.readPlainTextEditorValue(elements.plainValue),
            plainCite: elements.plainCite && elements.plainCite.value != null ? elements.plainCite.value : (this.stateBag.plainCite || '')
        };
        this.updateCanSubmit();
    }

    updateCanSubmit() {
        debug.log('index:updateCanSubmit');
        const handler = this.getModeHandler();
        if (typeof handler.computeCanSubmit === 'function') {
            this.stateBag.canSubmit = handler.computeCanSubmit(this.stateBag, {
                panel: this.Panel
            });
        } else {
            const values = this.stateBag.values || {};
            this.stateBag.canSubmit = Object.keys(values).some((key) => String(values[key] || '').trim()) ||
                (this.stateBag.authors || []).some((a) => a.surname || a.givenname) ||
                String(this.stateBag.plainText || '').trim().length > 0;
        }
    }

    createPreviewStateSignature(state = {}) {
        debug.log('index:createPreviewStateSignature');
        const normalizePeople = (list = []) => (Array.isArray(list) ? list : []).map((person) => ({
            index: person && person.index != null ? Number(person.index) : 0,
            surname: person && person.surname != null ? String(person.surname) : '',
            givenname: person && person.givenname != null ? String(person.givenname) : ''
        }));
        return JSON.stringify({
            mode: state.mode || '',
            insertMethod: state.insertMethod || '',
            refType: state.refType || '',
            values: state.values || {},
            authors: normalizePeople(state.authors),
            editors: normalizePeople(state.editors),
            translators: normalizePeople(state.translators),
            plainText: state.plainText || '',
            plainCite: state.plainCite || '',
            doi: state.doi || '',
            queryRespond: state.queryRespond || ''
        });
    }

    shouldSkipPreviewRefresh(previousSignature, nextSignature) {
        debug.log('index:shouldSkipPreviewRefresh');
        return !!previousSignature && previousSignature === nextSignature;
    }

    refreshPreview(options = {}) {
        debug.log('index:refreshPreview');
        if (typeof this.referenceDebugBegin === 'function') this.referenceDebugBegin();
        try {
            const bridge = this.getRefBridge();
            const handler = this.getModeHandler();
            const method = this.stateBag.insertMethod || 'doi_form';
            const mode = this.stateBag.mode || "insert";

            if (this.stateBag.mode === 'insert' && method === 'plain_text') {
                this.collectPlainTextIntoState();
                const built = bridge.buildPlainTextReference({
                    text: this.stateBag.plainText || '',
                    refType: this.stateBag.refType || 'journal'
                }, {
                    documentRoot: this.getDocumentRoot(),
                    insertMethod: method,
                    mode
                });
                this.stateBag.preview = built.preview || '';
                this.stateBag.previewNode = built.refNode || null;
                this.stateBag.lastBuiltHtml = built.html || '';
            } else if (typeof handler.submit === 'function') {
                // ? first DOI fetch skip empty Summernote collect - 18_SEP_26_DR
                if (!options.skipCollect) {
                    this.noteDoiFieldClear();
                    this.collectIntoState();
                }
                const previewState = method === 'doi_form' && typeof handler.stateFromDoiSnapshot === 'function' ?
                    handler.stateFromDoiSnapshot(this.stateBag) :
                    this.stateBag;
                const nextSignature = this.createPreviewStateSignature(previewState);
                if (this.shouldSkipPreviewRefresh(this._lastPreviewStateSignature, nextSignature)) {
                    return;
                }
                this._lastPreviewStateSignature = nextSignature;
                // Preview goes through the exact same handler.submit() that Insert/Update calls --
                // not a separate buildReferenceFromPayload/buildEditReferenceDom split -- so the
                // preview can never drift from what actually gets written to the document. <del>
                // is already hidden in #reference_preview_div by CSS, so a tracked edit/query
                // build previews cleanly with no extra markup visible.
                const previewBuilt = handler.submit(previewState, bridge, {
                    documentRoot: this.getDocumentRoot(),
                    insertMethod: method,
                    mode,
                    configTemplate: this.stateBag.template && this.stateBag.template.fields ? {
                        fields: this.stateBag.template.fields,
                        delimiters: (this.stateBag.template && this.stateBag.template.delimiters) || {},
                        delimitersLast: (this.stateBag.template && this.stateBag.template.delimitersLast) || {},
                        slotOrder: (this.stateBag.template && this.stateBag.template.slotOrder) || [],
                        groupSlots: (this.stateBag.template && this.stateBag.template.groupSlots) || [],
                        abbreviation: (this.stateBag.template && this.stateBag.template.abbreviation) || null
                    } : undefined
                });
                this.stateBag.preview = previewBuilt.preview || '';
                this.stateBag.previewNode = previewBuilt.refNode || null;
                this.stateBag.lastBuiltHtml = previewBuilt.html || '';
            }

            this.render({
                skipPrefill: true,
                ...options
            });
        } catch (err) {
            this.trackError('refreshPreview', err);
        } finally {
            if (typeof this.referenceDebugEnd === 'function') this.referenceDebugEnd();
        }
    }

    focusFieldToken(token) {
        debug.log('index:focusFieldToken');
        if (!this.Panel || !token || typeof this.inputIdForToken !== 'function') return;
        const id = this.inputIdForToken(token);
        const el = this.Panel.querySelector(`#${id}`);
        if (!el) return;
        const note = el.closest && el.closest('.note-editor');
        const editable = note && note.querySelector ? note.querySelector('.note-editable') : null;
        if (editable && typeof editable.focus === 'function') {
            editable.focus();
            return;
        }
        if (typeof el.focus === 'function') el.focus();
    }

    async promptOpenFields() {
        debug.log('index:promptOpenFields');
        if (!this.stateBag || typeof this.resolveOpenPrompt !== 'function') return;
        const decision = this.resolveOpenPrompt(this.stateBag, this.Panel);
        if (!decision || decision.action === 'none') return;
        if (decision.action === 'focus') {
            this.focusFieldToken(decision.token);
        }
    }

    autoFocus() {
        debug.log('index:autoFocus');
        const method = this.stateBag.insertMethod || 'doi_form';
        const mode = this.stateBag.mode;
        setTimeout(() => {
            try {
                if (mode === 'insert' && method === 'doi_form' && this.elements.doiValue) {
                    this.elements.doiValue.focus();
                    if (this.elements.doiValue.value == "") {
                        this.elements.doiValue.classList.remove('is-invalid', "is-valid")
                    }
                } else if (mode === 'insert' && method === 'plain_text' && this.elements.plainValue) {
                    this.elements.plainValue.focus();
                } else if (this.stateBag.mode === 'query') {
                    const highEl = this.Panel.querySelector(".highlight");
                    if (highEl) highEl.focus();
                }
            } catch (err) {
                /* ignore focus errors */
            }
        }, 50);
    }

    async handleTypeClick(event) {

        debug.log('index:handleTypeClick');
        if (!this.stateBag) return;



        if (this.stateBag.mode === 'edit' || this.stateBag.mode === 'query') {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            if (event && typeof event.stopPropagation === 'function') event.stopPropagation();

            return;
        }
        if (this.stateBag.mode === 'insert' && this.stateBag.insertMethod === 'doi_form') return;

        const input = event.target && event.target.closest ? event.target.closest(`input[name="${this.RADIO_NAMES.refType}"]`) : null;
        const label = event.target && event.target.closest ? event.target.closest('label[value]') : null;
        const value = (input && input.value) || (label && label.getAttribute('value')) || null;
        if (!value) return;

        const currentType = this.stateBag.refType;
        if (value === currentType) {
            this.syncTypeRadioUi(currentType);
            return;
        }

        if (this.stateBag.mode === 'insert' && this.stateBag.insertMethod === 'plain_text') {
            this.stateBag.refType = value;
            this.syncTypeRadioUi(value);
            return;
        }

        if (this.stateBag.mode === 'insert') {
            this.collectIntoState();
            if (this.isInsertMethodDirty(this.stateBag)) {
                const confirmed = await this.confirmDismissInsertMethodChanges();
                if (!confirmed) {
                    if (event && typeof event.preventDefault === 'function') event.preventDefault();
                    this.syncTypeRadioUi(currentType);
                    this.render({
                        skipPrefill: false
                    });
                    return;
                }
            }
        }

        const handler = this.getModeHandler();
        if (this.stateBag.mode === 'insert' && typeof handler.handleInsertMethodChange === 'function') {
            this.stateBag = handler.handleInsertMethodChange(this.stateBag, this.stateBag.insertMethod);
        }
        this.stateBag = handler.handleTypeChange(this.stateBag, {
            target: {
                value
            }
        });
        this.prepareTemplate();
        this.refreshPreview();
    }

    hasNonEmptyPersonList(list = []) {
        return (Array.isArray(list) ? list : []).some((person) =>
            String(person && person.surname || '').trim() ||
            String(person && person.givenname || '').trim()
        );
    }

    isInsertMethodDirty(state = this.stateBag) {
        debug.log('index:isInsertMethodDirty');
        if (!state || state.mode !== 'insert') return false;
        const method = state.insertMethod || 'doi_form';

        if (method === 'plain_text') {
            return !!(String(state.plainText || '').trim() || String(state.plainCite || '').trim());
        }

        if (method === 'doi_form') {
            const doiValue = String(state.doi || '').trim() ||
                String(this.elements && this.elements.doiValue && this.elements.doiValue.value || '').trim();
            if (doiValue) return true;
            if (state.doiFetched) return true;
            const snapshot = state.doiFetchSnapshot;
            if (snapshot && typeof snapshot === 'object' && Object.keys(snapshot).length > 0) return true;
            return false;
        }



        // open_form
        const values = state.values || {};
        const hasValues = Object.keys(values).some((key) => String(values[key] || '').trim());
        if (hasValues) return true;
        return this.hasNonEmptyPersonList(state.authors) || this.hasNonEmptyPersonList(state.editors) || this.hasNonEmptyPersonList(state.translators);
    }

    syncInsertMethodRadioUi(method) {
        debug.log('index:syncInsertMethodRadioUi');
        const selected = method || (this.stateBag && this.stateBag.insertMethod) || 'doi_form';
        const radios = (this.elements && this.elements.methodRadios) || [];
        radios.forEach((input) => {
            const active = input.value === selected;
            input.checked = active;
            if (input.parentElement) input.parentElement.classList.toggle('active', active);
        });
    }

    syncTypeRadioUi(refType) {
        debug.log('index:syncTypeRadioUi');
        const selected = refType || (this.stateBag && this.stateBag.refType) || 'journal';
        const group = this.elements && this.elements.typeBtnGroup;
        if (!group || typeof group.querySelectorAll !== 'function') return;
        const radios = group.querySelectorAll(`input[name="${this.RADIO_NAMES.refType}"]`);
        radios.forEach((input) => {
            const active = input.value === selected;
            input.checked = active;
            if (input.parentElement) input.parentElement.classList.toggle('active', active);
        });
        const mode = this.stateBag && this.stateBag.mode;
        if (typeof this.applyTypeButtonGroupLock === 'function') {
            this.applyTypeButtonGroupLock(group, mode === 'edit' || mode === 'query');
        }
    }

    noteDoiFieldClear() {
        debug.log('index:noteDoiFieldClear');
        if (!this.stateBag || !this.stateBag.doiFetched || !this.Panel) return;
        if ((this.stateBag.insertMethod || 'doi_form') !== 'doi_form') return;
        const id = typeof this.inputIdForToken === 'function' ? this.inputIdForToken('doi') : 'reference_doi';
        const el = this.Panel.querySelector(this.idSelector(id));
        if (!el) return;
        const host = el.closest('[data-input]') || el.closest('.form-group') || el.parentElement;
        if (host && host.classList.contains('ds-none')) return;
        if (el.dataset.cegOrderHidden === 'true') return;
        this.stateBag.doiCleared = !String(el.value || '').trim();
    }

    getConfirmReferenceActionText() {
        debug.log('index:getConfirmReferenceActionText');
        const fallback = 'Are you sure you want to dismiss all changes?';
        if (typeof this.moduleMsg !== 'function') return fallback;
        return this.moduleMsg('runtime.confirm_reference_action.text', {}, fallback);
    }

    async confirmDismissInsertMethodChanges() {
        debug.log('index:confirmDismissInsertMethodChanges');
        const text = this.getConfirmReferenceActionText();
        if (typeof AlertNewDialog !== 'undefined' && AlertNewDialog && typeof AlertNewDialog.fire === 'function') {
            const result = await AlertNewDialog.fire('warning', 'Warning', text, 'OK', 'Cancel', true, {
                override: true
            });
            return !!(result && result.isConfirmed);
        }
        if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
            return window.confirm(text);
        }
        return true;
    }

    applyInsertMethodChange(method) {
        debug.log('index:applyInsertMethodChange');
        const leavingPlainText = this.stateBag && this.stateBag.insertMethod === 'plain_text';
        if (leavingPlainText) {
            this._retainedPlainInsert = {
                plainText: this.stateBag.plainText || '',
                plainCite: this.stateBag.plainCite || '',
                refType: this.stateBag.refType || 'journal'
            };
        }

        const handler = this.getModeHandler('insert');
        if (typeof handler.handleInsertMethodChange === 'function') {
            this.stateBag = handler.handleInsertMethodChange(this.stateBag, method);
        } else {
            this.stateBag.insertMethod = method;
        }

        if (method === 'plain_text' && this._retainedPlainInsert) {
            this.stateBag.plainText = this._retainedPlainInsert.plainText;
            this.stateBag.plainCite = this._retainedPlainInsert.plainCite;
            this.stateBag.refType = this._retainedPlainInsert.refType;
        }

        this._plainTextFetchToken = null;
        this.updateCanSubmit();
        this.render();
        if (this.stateBag.insertMethod !== 'plain_text') {
            this.cancelPlainTextSummernoteInput();
        }
        this.refreshPreview();
        this.autoFocus();
    }

    async handleMethodClick(event) {
        debug.log('index:handleMethodClick');
        const input = event.target && event.target.closest ?
            event.target.closest(`input[name="${this.RADIO_NAMES.insMethod}"]`) : null;
        const label = event.target && event.target.closest ?
            event.target.closest('label') : null;
        let method = input && input.value;
        if (!method && label) {
            const radio = label.querySelector(`input[name="${this.RADIO_NAMES.insMethod}"]`);
            method = radio && radio.value;
        }
        if (!method) return;

        const currentMethod = (this.stateBag && this.stateBag.insertMethod) || 'doi_form';
        if (method === currentMethod) {
            this.syncInsertMethodRadioUi(currentMethod);
            this.autoFocus();
            return;
        }

        if (this.stateBag && this.stateBag.mode === 'insert') {
            const isDirty = this.isInsertMethodDirty(this.stateBag);
            const isPlain = currentMethod === 'plain_text';
            if (isPlain) {
                this.collectPlainTextIntoState();
            } else {
                this.collectIntoState();
            }
            if (isDirty) {
                const confirmed = await this.confirmDismissInsertMethodChanges();
                if (!confirmed) {
                    if (event && typeof event.preventDefault === 'function') event.preventDefault();
                    this.syncInsertMethodRadioUi(currentMethod);
                    this.render({
                        skipPrefill: false
                    });
                    return;
                }
            }

        }

        this.applyInsertMethodChange(method);
    }

    handleDebouncedFormInput() {
        debug.log('index:handleDebouncedFormInput');
        this.refreshPreview();
        this.maybeFetchPlainTextCite();
    }

    handleBulkPlainChange() {
        debug.log('index:handleBulkPlainChange');
        const enabled = !!(this.elements.bulkPlainInsert && this.elements.bulkPlainInsert.checked);
        this.stateBag = {
            ...this.stateBag,
            bulkPlainEnabled: enabled,
            bulkPlainEntries: enabled ? (this.stateBag.bulkPlainEntries || []) : []
        };
        this.render({ skipPrefill: true });
    }

    maybeFetchPlainTextCite() {
        debug.log('index:maybeFetchPlainTextCite');
        try {
            if (this.stateBag.mode !== 'insert' || this.stateBag.insertMethod !== 'plain_text') return;
            if (!this.stateBag.showHints) return;
            if (this.stateBag.bulkPlainEnabled ||
                (this.elements.bulkPlainInsert && this.elements.bulkPlainInsert.checked)) return;

            this.collectPlainTextIntoState();
            const text = String(this.stateBag.plainText || '').trim();
            if (!text) {
                if (this.elements.plainCite) {
                    this.elements.plainCite.value = '';
                    this.stateBag.plainCite = '';
                }
                return;
            }

            if (this._plainTextFetchToken === text) return;
            this._plainTextFetchToken = text;

            const bridge = this.getRefBridge();
            if (!bridge || typeof bridge.fetchPlainTextBibliography !== 'function') return;

            if (this.elements.spinner) this.elements.spinner.classList.remove('hide');
            bridge.fetchPlainTextBibliography(text, {
                onSuccess: (parsed) => this.applyPlainTextCiteResponse(parsed),
                onError: () => {
                    if (this.elements.spinner) this.elements.spinner.classList.add('hide');
                }
            });
        } catch (err) {
            if (this.elements.spinner) this.elements.spinner.classList.add('hide');
            this.trackError('maybeFetchPlainTextCite', err);
        }
    }

    applyPlainTextCiteResponse(parsed) {
        debug.log('index:applyPlainTextCiteResponse');
        try {
            if (this.elements.spinner) this.elements.spinner.classList.add('hide');
            const bridge = this.getRefBridge();
            const resolved = this.resolvePlainTextCitation(parsed, bridge, this.stateBag.refType || 'journal');
            const finalText = resolved.plainCite;

            if (this.elements.plainCite) {
                this.elements.plainCite.value = finalText;
            }

            this.stateBag.plainCite = finalText;

            this.stateBag.refType = resolved.refType;
            this.refreshPreview();
            this.render();
        } catch (err) {
            if (this.elements.spinner) this.elements.spinner.classList.add('hide');
            this.trackError('applyPlainTextCiteResponse', err);
        }
    }

    resolvePlainTextCitation(parsed, bridge, fallbackRefType = 'journal') {
        debug.log('index:resolvePlainTextCitation');
        const fetchData = bridge.filterCrossRefData(parsed) || {};
        let plainCite = '';
        if (typeof namedCitation === 'function' && Object.keys(fetchData).length) {
            try {
                const citeText = new namedCitation([fetchData], { json: true });
                plainCite = citeText && citeText.FINAL_OUT && citeText.FINAL_OUT[0] &&
                    citeText.FINAL_OUT[0].indirect ? citeText.FINAL_OUT[0].indirect.text || '' : '';
            } catch (_) {
                plainCite = '';
            }
        }

        const normalized = bridge.normalizeCrossRefResponse(parsed) || {};
        if (!plainCite) {
            plainCite = [normalized.title, normalized.journal, normalized.year]
                .filter(Boolean)
                .join('. ');
        }
        const rawType = fetchData.type || normalized.type ||
            (parsed && !Array.isArray(parsed) && parsed.type) ||
            (Array.isArray(parsed) && parsed[0] && parsed[0].type) || '';

        return {
            plainCite,
            refType: rawType ? this.resolveExternalRefType(rawType, { fallback: 'other' }) : fallbackRefType
        };
    }

    prepareBulkPlainEntries(entries = [], previousEntries = [], bridge, fallbackRefType = 'journal') {
        debug.log('index:prepareBulkPlainEntries');
        const readyByText = new Map((previousEntries || [])
            .filter((entry) => entry && entry.citeStatus === 'ready')
            .map((entry) => [entry.text, entry]));

        return Promise.all(entries.map((text) => {
            const originalText = String(text || '');
            if (readyByText.has(originalText)) return readyByText.get(originalText);

            return new Promise((resolve) => {
                const failed = () => resolve({
                    text: originalText,
                    apiResponse: null,
                    plainCite: '',
                    refType: fallbackRefType,
                    citeStatus: 'failed'
                });
                try {
                    const started = bridge.fetchPlainTextBibliography(originalText, {
                        onSuccess: (parsed) => {
                            const citation = this.resolvePlainTextCitation(parsed, bridge, fallbackRefType);
                            resolve({
                                text: originalText,
                                apiResponse: parsed,
                                plainCite: citation.plainCite,
                                refType: citation.refType,
                                citeStatus: citation.plainCite ? 'ready' : 'failed'
                            });
                        },
                        onError: failed
                    });
                    if (started === false) failed();
                } catch (_) {
                    failed();
                }
            });
        }));
    }

    handleDoiInput() {
        debug.log('index:handleDoiInput');
        if (!this.elements.doiValue) return;
        this.stateBag.doi = this.elements.doiValue.value || '';
        const format = this.applyDoiInputValidation(this.elements.doiValue, this.stateBag.doi);
        this.updateCanSubmit();
        if (this.elements.doiFetchBtn) {
            const enabled = !format.empty && format.valid;
            this.elements.doiFetchBtn.classList.toggle('disabled', !enabled);
            if (enabled) this.elements.doiFetchBtn.removeAttribute('disabled');
            else this.elements.doiFetchBtn.setAttribute('disabled', 'disabled');
        }
    }

    async handleDoiFetch() {
        debug.log('index:handleDoiFetch');
        try {
            const doi = String(this.stateBag.doi || (this.elements.doiValue && this.elements.doiValue.value) || '').trim();
            if (!doi) return;

            const format = this.validateDoiFormat(doi);
            if (!format.valid) return;

            if (await this.checkDuplicateReference({
                    doi,
                    documentRoot: this.getDocumentRoot()
                })) {
                return;
            }

            if (this.stateBag.doiFetched) {
                const confirmed = await this.confirmDismissInsertMethodChanges();
                if (!confirmed) return;

                const handler = this.getModeHandler('insert');
                if (handler && typeof handler.handleInsertMethodChange === 'function') {
                    this.stateBag = handler.handleInsertMethodChange(this.stateBag, 'doi_form');
                }
                this.stateBag.doi = doi;
                this.stateBag.doiCleared = false;
                this.updateCanSubmit();
                this.render({
                    skipPrefill: false
                });
            }

            const cached = this.readDoiFetchCache(doi);
            if (cached) {
                this.applyDoiResponse(cached, doi, {
                    normalized: true
                });
                return;
            }

            const bridge = this.getRefBridge();
            if (this.elements.spinner) this.elements.spinner.classList.remove('hide');

            const applied = bridge.fetchDoi(doi, {
                onSuccess: (response) => this.applyDoiResponse(response, doi),
                onError: () => {
                    if (this.elements.spinner) this.elements.spinner.classList.add('hide');
                }
            });

            if (!applied && this.elements.spinner) {
                this.elements.spinner.classList.add('hide');
            }
        } catch (err) {
            if (this.elements.spinner) this.elements.spinner.classList.add('hide');
            this.trackError('handleDoiFetch', err);
        }
    }

    getDoiFetchCacheKey(doi) {
        debug.log('index:getDoiFetchCacheKey');
        const normalizedDoi = String(doi || '').trim();
        return normalizedDoi ? `doi_${normalizedDoi}` : '';
    }

    readDoiFetchCache(doi) {
        debug.log('index:readDoiFetchCache');
        try {
            if (typeof sessionStorage === 'undefined') return null;
            const cacheKey = this.getDoiFetchCacheKey(doi);
            if (!cacheKey) return null;
            const cached = sessionStorage.getItem(cacheKey);
            if (!cached || ['undefined', '', 'null'].includes(cached)) return null;
            const parsed = JSON.parse(cached);
            if (!parsed || parsed.version !== ReferenceModule.DOI_FETCH_CACHE_VERSION) return null;
            if (typeof parsed.savedAt !== 'number' || !parsed.data || typeof parsed.data !== 'object') return null;
            if (Date.now() - parsed.savedAt > ReferenceModule.DOI_FETCH_CACHE_TTL_MS) return null;
            return parsed.data;
        } catch (_) {
            return null;
        }
    }

    writeDoiFetchCache(doi, data, savedAt = Date.now()) {
        debug.log('index:writeDoiFetchCache');
        try {
            if (typeof sessionStorage === 'undefined') return;
            const cacheKey = this.getDoiFetchCacheKey(doi);
            if (!cacheKey || !data || typeof data !== 'object') return;
            sessionStorage.setItem(cacheKey, JSON.stringify({
                version: ReferenceModule.DOI_FETCH_CACHE_VERSION,
                savedAt,
                data
            }));
        } catch (_) {}
    }
    // merges a normalized CrossRef DOI response into stateBag, preferring existing values over blank fetched ones, and caches the result
    synchronizeReferenceTemplate(state = {}, refType = 'journal', bridge = this.getRefBridge()) {
        debug.log('index:synchronizeReferenceTemplate');
        if (!bridge || typeof bridge.prepareTemplate !== 'function') {
            return {
                ...state,
                refType
            };
        }

        const template = bridge.prepareTemplate({
            mode: state.mode || 'insert',
            refNode: state.contextRef || state.refNode,
            refType,
            queryNode: state.queryNode,
            documentRoot: state.documentRoot || this.getDocumentRoot()
        });
        const orderTokens = Array.isArray(template.orderTokens) ? template.orderTokens : [];
        const configuredTokens = new Set(orderTokens.map((token) => token === 'pub-id' ? 'doi' : token));
        const hasConfiguredOrder = configuredTokens.size > 0;
        const currentValues = state.values || {};
        const values = hasConfiguredOrder ? Object.keys(currentValues).reduce((result, token) => {
            const canonicalToken = token === 'pub-id' ? 'doi' : token;
            if (configuredTokens.has(canonicalToken)) result[canonicalToken] = currentValues[token];
            return result;
        }, {}) : {
            ...currentValues
        };
        const fields = (template.fields || []).map((field) => ({
            ...field,
            value: values[field.token] != null ? values[field.token] : field.value
        }));

        debug.log('index:synchronizeReferenceTemplate', {
            refType,
            orderTokens,
            ignoredValueTokens: hasConfiguredOrder ? Object.keys(currentValues).filter((token) => (
                !configuredTokens.has(token === 'pub-id' ? 'doi' : token)
            )) : []
        });

        return {
            ...state,
            refType,
            template,
            fields,
            orderTokens,
            slotOrder: template.slotOrder || [],
            groupSlots: template.groupSlots || [],
            delimiters: template.delimiters || {},
            delimitersLast: template.delimitersLast || {},
            abbreviation: template.abbreviation || null,
            contributorTrim: template.contributorTrim || state.contributorTrim || null,
            hasEditorGroup: !!template.hasEditorGroup,
            hasTranslatorGroup: !!template.hasTranslatorGroup,
            values
        };
    }

    applyDoiResponse(response, doiKey = '', options = {}) {
        debug.log('index:applyDoiResponse');
        try {
            if (this.elements.spinner) this.elements.spinner.classList.add('hide');
            const bridge = this.getRefBridge();
            const normalized = options.normalized ? (response || {}) :
                (bridge.normalizeCrossRefResponse(response) || {});
            const snapshotAt = Date.now();
            const authors = Array.isArray(normalized.author) ?
                normalized.author.map((author, index) => ({
                    index,
                    surname: author.family || author.surname || '',
                    givenname: author.given || author.givenname || ''
                })) : this.stateBag.authors;

            const page = String(normalized.page || '');
            const pageParts = page.split('-');
            const refType = this.resolveDoiRefType(normalized.type, normalized);
            this.stateBag = this.synchronizeReferenceTemplate(this.stateBag, refType, bridge);
            const configuredOrder = new Set((this.stateBag.orderTokens || []).map((token) => (
                token === 'pub-id' ? 'doi' : token
            )));
            const hasConfiguredOrder = configuredOrder.size > 0;
            const canHydrate = (token) => !hasConfiguredOrder || configuredOrder.has(token);
            const values = {
                ...this.stateBag.values
            };
            const setFetchedValue = (token, value) => {
                if (!canHydrate(token)) return;
                values[token] = value != null && String(value) !== '' ? String(value) : (values[token] || '');
            };
            setFetchedValue('year', normalized.year);
            setFetchedValue('volume', normalized.volume);
            setFetchedValue('issue', normalized.issue);
            setFetchedValue('fpage', pageParts[0]);
            setFetchedValue('lpage', pageParts[1]);
            setFetchedValue('publisher-name', normalized.publisher);
            if (refType === 'book') {
                setFetchedValue('source', normalized.title);
            } else if (refType === 'ed-book') {
                setFetchedValue('chapter-title', normalized.title);
                setFetchedValue('source', normalized.journal);
            } else {
                setFetchedValue('article-title', normalized.title);
                setFetchedValue('source', normalized.journal);
            }
            this.stateBag = {
                ...this.stateBag,
                refType,
                authors: this.normalizeAuthors(authors),
                values,
                doi: normalized.doi || this.stateBag.doi,
                doiFetched: true,
                doiCleared: false,
                doiFetchSnapshot: normalized,
                doiFetchSnapshotAt: snapshotAt
            };

            const handler = this.modeHandlers ? this.getModeHandler() : null;
            if (this.stateBag.insertMethod === 'doi_form' && handler && typeof handler.stateFromDoiSnapshot === 'function') {
                this.stateBag = handler.stateFromDoiSnapshot(this.stateBag);
            }

            const cacheDoi = doiKey || this.stateBag.doi;
            this.writeDoiFetchCache(cacheDoi, normalized, snapshotAt);

            this.updateCanSubmit();
            this.refreshPreview({
                skipCollect: true,
                skipPrefill: false
            });
        } catch (err) {
            if (this.elements.spinner) this.elements.spinner.classList.add('hide');
            this.trackError('applyDoiResponse', err);
        }
    }

    handleAuthorClick(event) {
        debug.log('index:handleAuthorClick');
        const button = event.target && event.target.closest ?
            event.target.closest('[data-author-action]') : null;
        if (!button) return;
        if (button.disabled || button.classList.contains('disabled')) return;
        const action = button.getAttribute('data-author-action');
        const index = Number(button.getAttribute('data-author-index') || 0);
        this.collectIntoState();
        const handler = this.getModeHandler();
        if (typeof handler.handleAuthorAction !== 'function') return;
        if (action === 'up' || action === 'down') {
            const toIndex = action === 'up' ? index - 1 : index + 1;
            this.stateBag = handler.handleAuthorAction(this.stateBag, 'reorder', index, toIndex);
        } else {
            this.stateBag = handler.handleAuthorAction(this.stateBag, action, index);
        }
        this.updateCanSubmit();
        this.render();
        this.refreshPreview();
    }

    handleEditorClick(event) {
        debug.log('index:handleEditorClick');
        const button = event.target && event.target.closest ?
            event.target.closest('[data-editor-action]') : null;
        if (!button) return;
        if (button.disabled || button.classList.contains('disabled')) return;
        const action = button.getAttribute('data-editor-action');
        const index = Number(button.getAttribute('data-editor-index') || 0);
        this.collectIntoState();
        const handler = this.getModeHandler();
        if (action === 'up' || action === 'down') {
            if (typeof handler.handleEditorReorder !== 'function') return;
            const toIndex = action === 'up' ? index - 1 : index + 1;
            this.stateBag = handler.handleEditorReorder(this.stateBag, index, toIndex);
        } else {
            if (typeof handler.handleEditorAction !== 'function') return;
            this.stateBag = handler.handleEditorAction(this.stateBag, action, index);
        }
        this.updateCanSubmit();
        this.render();
        this.refreshPreview();
    }

    handleQueryRespondInput() {
        debug.log('index:handleQueryRespondInput');
        if (!this.elements.queryRespond) return;
        this.stateBag.queryRespond = this.elements.queryRespond.value || '';
        this.updateCanSubmit();
        this.render({
            skipPrefill: true
        });
    }

    async handleEditAllFields() {
        debug.log('index:handleEditAllFields');
        this.stateBag = this.enterEditAllFieldsMode(this.stateBag);
        this.render();
    }

    async handleReplyQuery() {
        debug.log('index:handleReplyQuery');
        this.stateBag = this.enterQueryRespondMode(this.stateBag);
        if (typeof this.resolveLastSameUserQueryResponse === 'function') {
            this.stateBag.queryRespond = this.resolveLastSameUserQueryResponse(this.stateBag);
        }

        this.render();

        if (this.elements.queryRespond) {
            this.elements.queryRespond.focus();
        }
    }

    async handleInsert(refOnly = false) {
        debug.log('index:handleInsert');
        try {
            if (this.stateBag.bulkPlainPreparing) return;
            const insertMethod = this.stateBag.insertMethod || 'doi_form';
            if (insertMethod === 'doi_form') {
                const snapshot = this.stateBag.doiFetchSnapshot;
                if (snapshot && snapshot.doi) {
                    this.stateBag.doi = snapshot.doi;
                }
            } else if (insertMethod === 'plain_text') {
                this.collectPlainTextIntoState();
            } else {
                this.collectIntoState();
            }

            const bridge = this.getRefBridge();
            const handler = this.getModeHandler('insert');
            const ims = IMPACT_SELECTION;

            const bulkEnabled = insertMethod === 'plain_text' &&
                this.elements.bulkPlainInsert &&
                (this.stateBag.bulkPlainEnabled || this.elements.bulkPlainInsert.checked) &&
                typeof handler.isLocalPlainTextBulkEnabled === 'function' &&
                handler.isLocalPlainTextBulkEnabled({
                    localTesting: false
                });

            if (bulkEnabled && typeof handler.splitPlainTextBulkEntries === 'function' &&
                typeof handler.insertPlainTextBatchForLocalTesting === 'function') {
                const entries = handler.splitPlainTextBulkEntries(this.stateBag.plainText || '');
                if (!entries.length) {
                    if (typeof TOASTER_ALERT === 'function') {
                        TOASTER_ALERT('empty_citation', {
                            type: 'warning'
                        });
                    }
                    return;
                }
                this.stateBag.bulkPlainEnabled = true;
                this.stateBag.bulkPlainPreparing = true;
                this.render({ skipPrefill: true });
                if (this.elements.spinner) this.elements.spinner.classList.remove('hide');

                const preparedEntries = await this.prepareBulkPlainEntries(
                    entries,
                    this.stateBag.bulkPlainEntries || [],
                    bridge,
                    this.stateBag.refType || 'journal'
                );
                this.stateBag.bulkPlainEntries = preparedEntries;
                const batch = handler.insertPlainTextBatchForLocalTesting(preparedEntries, bridge, {
                    documentRoot: this.getDocumentRoot(),
                    localTesting: true,
                    refOnly: refOnly === true,
                    refType: this.stateBag.refType || 'journal'
                });
                if (!batch.changed) {
                    this.stateBag.bulkPlainPreparing = false;
                    if (this.elements.spinner) this.elements.spinner.classList.add('hide');
                    this.render({ skipPrefill: true });
                    if (typeof TOASTER_ALERT === 'function') {
                        TOASTER_ALERT(batch.reason || 'Insert failed', {
                            type: 'warning'
                        });
                    }
                    return;
                }
                const failedParagraphs = preparedEntries
                    .map((entry, index) => entry.citeStatus === 'failed' ? index + 1 : null)
                    .filter(Boolean);
                if (failedParagraphs.length && typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT(`Citation unavailable for paragraph(s): ${failedParagraphs.join(', ')}`, {
                        type: 'warning'
                    });
                }
                if (this.elements.spinner) this.elements.spinner.classList.add('hide');
                this.handleCancel();
                return;
            }

            if (typeof handler.validateBeforeSubmit === 'function') {
                const results = handler.validateBeforeSubmit(this.stateBag, {
                    panel: this.Panel,
                    refOnly: refOnly === true
                });
                if (!results) return;

            } else if (!this.stateBag.canSubmit) {
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT(this.stateBag.insertMethod === 'plain_text' ? 'empty_citation' : 'empty_field', {
                        type: 'warning'
                    });
                }
                return;
            }

            if (insertMethod === 'doi_form') {
                const snapshotDoi = this.stateBag.doiFetchSnapshot && this.stateBag.doiFetchSnapshot.doi;
                const isDupilcate = await this.checkDuplicateReference({
                    doi: snapshotDoi || this.stateBag.doi,
                    documentRoot: this.getDocumentRoot()
                });
                if (isDupilcate) {
                    return;
                }
            }

            const built = handler.submit(this.stateBag, bridge, {
                documentRoot: this.getDocumentRoot()
            });
            const result = handler.applyBuilt(built, bridge, {
                documentRoot: this.getDocumentRoot(),
                refOnly: refOnly === true,
                state: this.stateBag,
                contextRef: this.stateBag.contextRef || this.stateBag.refNode || ims.IsRef || null
            });
            if (!result.changed && typeof TOASTER_ALERT === 'function') {
                TOASTER_ALERT(result.reason || 'Insert failed', {
                    type: 'warning'
                });
                return;
            }
            this.handleCancel();
        } catch (err) {
            if (this.stateBag && this.stateBag.bulkPlainPreparing) {
                this.stateBag.bulkPlainPreparing = false;
                if (this.elements && this.elements.spinner) this.elements.spinner.classList.add('hide');
                this.render({ skipPrefill: true });
            }
            this.trackError('handleInsert', err);
        }
    }

    handlePrimaryUpdate() {
        debug.log('index:handlePrimaryUpdate');
        if (this.stateBag.mode === 'query') {
            this.handleQueryUpdate(false);
            return;
        }
        this.handleUpdate();
    }

    async handleUpdateWithCommand() {
        debug.log('index:handleUpdateWithCommand');
        try {
            this.collectIntoState();
            if (!String(this.stateBag.queryRespond || '').trim()) return;
            await this.handleQueryUpdate(true);
        } catch (err) {
            this.trackError('handleUpdateWithCommand', err);
        }
    }

    async handleUpdate() {
        debug.log('index:handleUpdate');
        try {
            if (!this.stateBag.canSubmit) return;
            this.collectIntoState();
            const bridge = this.getRefBridge();
            if (bridge && typeof bridge._ensureReady === 'function') {
                await bridge._ensureReady();
            }
            const handler = this.getModeHandler('edit');
            const built = handler.submit(this.stateBag, bridge, {});
            const result = handler.applyBuilt(built, {
                sourceRef: this.stateBag.contextRef || this.stateBag.refNode
            });
            if (!result.changed && typeof TOASTER_ALERT === 'function') {
                TOASTER_ALERT(result.reason || 'No changes to update', {
                    type: 'warning'
                });
                return;
            }
            this.stateBag.contextRef = result.refNode;
            this.stateBag.refNode = result.refNode;
            this.syncCitationsAfterEdit({
                refId: this.stateBag.contextRef && this.stateBag.contextRef.id,
                refNode: this.stateBag.contextRef,
                previewNode: this.stateBag.previewNode
            });
            this.handleCancel();
        } catch (err) {
            this.trackError('handleUpdate', err);
        }
    }

    async handleQueryUpdate(fromCommand = false) {
        debug.log('index:handleQueryUpdate');
        try {
            if (!fromCommand && !this.stateBag.canSubmit) return;
            this.collectIntoState();
            const typedResponse = String(this.stateBag.queryRespond || '').trim();
            const generatedResponse = !fromCommand && this.buildQueryMissingResponseText ?
                this.buildQueryMissingResponseText(this.stateBag) : '';
            const bridge = this.getRefBridge();
            if (bridge && typeof bridge._ensureReady === 'function') {
                await bridge._ensureReady();
            }
            const handler = this.getModeHandler('query');
            const built = handler.submit(this.stateBag, bridge, {});
            const result = handler.applyBuilt(built, {
                sourceRef: this.stateBag.contextRef || this.stateBag.refNode
            });
            const responseText = fromCommand ? typedResponse : generatedResponse;
            const shouldSaveResponse = !!responseText;
            if (!result.changed && shouldSaveResponse) {
                await this.applyQueryResponseUpdate({
                    refNode: result.refNode || this.stateBag.contextRef || this.stateBag.refNode,
                    queryNode: this.stateBag.queryNode,
                    queryRespond: responseText,
                    built: result,
                    closeQuery: !fromCommand
                });
                this.handleCancel();
                return;
            }
            if (!result.changed && typeof TOASTER_ALERT === 'function') {
                TOASTER_ALERT(result.reason || 'No query fields to update', {
                    type: 'warning'
                });
                return;
            }
            if (shouldSaveResponse) {
                await this.applyQueryResponseUpdate({
                    refNode: result.refNode || this.stateBag.contextRef || this.stateBag.refNode,
                    queryNode: this.stateBag.queryNode,
                    queryRespond: responseText,
                    built: result,
                    closeQuery: !fromCommand
                });
            }
            this.stateBag.contextRef = result.refNode;
            this.stateBag.refNode = result.refNode;
            this.syncCitationsAfterEdit({
                refId: this.stateBag.contextRef && this.stateBag.contextRef.id,
                refNode: this.stateBag.contextRef,
                previewNode: this.stateBag.previewNode
            });
            this.handleCancel();
        } catch (err) {
            this.trackError('handleQueryUpdate', err);
        }
    }

    handleCancel() {
        debug.log('index:handleCancel');
        this.cancelPlainTextSummernoteInput();
        this.stateBag = this.createDefaultState();
        this._eventsBound = false;
        this.closeDialog();
    }

    resolveRefNode(input) {
        debug.log('index:resolveRefNode');
        const toRef = (node) => {
            if (!node) return null;
            const el = node.$ ? node.$ : node;
            if (!el || !el.nodeType) return null;
            if (el.classList && el.classList.contains('ref')) return el;
            return el.closest ? el.closest('.ref') : null;
        };
        if (!input) return null;
        if (input.$) return toRef(input.$);
        if (input.querySelector || input.nodeType) return toRef(input);
        if (typeof input === 'string' && typeof GlobalEditor !== 'undefined' && GlobalEditor.document) {
            const el = GlobalEditor.document.getById(input);
            return toRef(el);
        }
        return null;
    }

    resolveRefType(refNode) {
        debug.log('index:resolveRefType');
        const ref = this.resolveRefNode(refNode);
        const mixed = ref && ref.querySelector ? ref.querySelector('.mixed-citation') : null;
        return mixed ? mixed.getAttribute('publication-type') : '';
    }

    // maps CrossRef / AnyStyle work "type" taxonomy onto internal refType values
    resolveExternalRefType(type, doiValue = "", options = {}) {
        debug.log('index:resolveExternalRefType');
        const fallback = options.fallback != null ? options.fallback : 'journal';
        const normalized = String(type || '').toLowerCase().replace(/-/g, '_');
        if (!normalized) return fallback;
        const typeMap = {
            journal: 'journal',
            journal_article: 'journal',
            article_journal: 'journal',
            posted_content: 'journal',
            journal_content: 'journal',

            book: 'book',
            book_title: 'book',
            monograph: 'book',
            book_content: 'book',

            book_chapter: 'ed-book',
            'book-chapter': "ed-book",
            ed_book: 'ed-book',
            edited_book: 'ed-book',

            other: 'other',
            webpage: 'other',
            web_page: 'other',
            conference: 'other',
            paper_conference: 'other',
            proceedings: 'other'
        };

        // If not found in typeMap, apply regex rules
        if (!typeMap[normalized]) {
            // Explicit "book" keyword
            if (/book/gi.test(type)) {
                return 'book';
            }

            // Book chapter DOIs (ISBN-like 978, Oxford acprof chapters, etc.)
            if (/10\.(1007|1093|1002).*978/.test(doiValue) || /acprof:oso/.test(doiValue)) {
                return 'ed-book';
            }

            // Book DOIs (Cambridge CBO, Oxford UP, Wiley 978, etc.)
            if (/10\.(1017|1093|1002).*cbo/.test(doiValue) || /10\.1093\/978/.test(doiValue)) {
                return 'book';
            }

            // Journal DOIs (JAMA, NEJM, Nature, PNAS, Elsevier, Taylor & Francis, etc.)
            if (/10\.(1001|1056|1038|1073|1016|1080|1098)/.test(doiValue)) {
                return 'journal';
            }

            return fallback;
        }

        return typeMap[normalized];
    }

    // Backward-compatible DOI alias (defaults unknown types to journal)
    resolveDoiRefType(type, normalized = {}) {
        debug.log('index:resolveDoiRefType');
        const doiValue = normalized.doi || "";
        return this.resolveExternalRefType(type, doiValue, {
            fallback: 'journal',

        });
    }

    getDocumentRoot() {
        debug.log('index:getDocumentRoot');
        if (typeof GlobalEditor !== 'undefined' && GlobalEditor.document && GlobalEditor.document.$) {
            return GlobalEditor.document.$;
        }
        return document;
    }

    static create(options = {}) {
        debug.log('index:create');
        return new ReferenceModule('ReferenceModule', 'reference', options);
    }
}



export default ReferenceModule;


/* END */
