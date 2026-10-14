class InsertReferenceMode {
    constructor() {
        debug.log('insert_mode:constructor');
        this._importPromise = this._importDependencies();
    }

    async _importDependencies() {
        debug.log('insert_mode:_importDependencies');
        const common = await import('./common.js');
        this.normalizeAuthors = common.normalizeAuthors;
        this.authorsFromTemplateFields = common.authorsFromTemplateFields;
        this.buildPayloadFromState = common.buildPayloadFromState;
        this.handleContributorAction = common.handleContributorAction;
        this.applyInsertToDocument = common.applyInsertToDocument;
        this.buildInsertCitationHtml = common.buildInsertCitationHtml;
        this.validateDoiInsertContent = common.validateDoiInsertContent;
        this.validateAuthorGroup = common.validateAuthorGroup;
        this.validateEditorGroup = common.validateEditorGroup;
        this.validateMandatoryFields = common.validateMandatoryFields;
        this.styleOrderHasDoi = common.styleOrderHasDoi;
        this.stripSummernoteBreaks = common.stripSummernoteBreaks;
        this.isNameDateRef = common.isNameDateRef;
        this.createReferenceElement = common.createReferenceElement;
    }

    async _ensureReady() {
        debug.log('insert_mode:_ensureReady');
        await this._importPromise;
    }

    createModeState(payload = {}, baseState = {}) {
        debug.log('insert_mode:createModeState');
        return {
            ...baseState,
            mode: 'insert',
            insertMethod: payload.insertMethod || baseState.insertMethod || 'doi_form',
            refType: payload.refType || baseState.refType || 'journal',
            contextRef: null,
            refNode: null,
            queryNode: payload.queryNode || null,
            template: null,
            values: {},
            fields: [],
            authors: this.normalizeAuthors(payload.authors || baseState.authors),
            editors: this.normalizeAuthors(payload.editors || baseState.editors || []),
            translators: this.normalizeAuthors(payload.translators || baseState.translators || []),
            doi: payload.doi || '',
            plainText: payload.plainText || '',
            plainCite: payload.plainCite || '',
            canSubmit: false,
            preview: '',
            sourcePolicy: ''
        };
    }

    prepareTemplate(state, bridge) {
        debug.log('insert_mode:prepareTemplate');
        const template = bridge.prepareTemplate({
            mode: 'insert',
            refNode: state.contextRef || state.refNode,
            refType: state.refType,
            queryNode: state.queryNode,
            documentRoot: state.documentRoot
        });
        return this.withTemplate(state, template, bridge);
    }

    handleFieldInput(state, event) {
        debug.log('insert_mode:handleFieldInput');
        const target = event.target;
        if (!target) return state;

        if (target.getAttribute('data-author-field')) {
            return this.handleAuthorInput(state, target);
        }

        const token = target.getAttribute('data-token');
        if (!token) return state;
        return {
            ...state,
            values: {
                ...state.values,
                [token]: target.value
            }
        };
    }

    handleAuthorInput(state, target) {
        debug.log('insert_mode:handleAuthorInput');
        const index = Number(target.getAttribute('data-author-index') || 0);
        const field = target.getAttribute('data-author-field');
        const authors = this.normalizeAuthors(state.authors).map((author, i) => {
            if (i !== index) return author;
            return {
                ...author,
                [field]: target.value
            };
        });
        const values = {
            ...state.values
        };
        if (authors[0]) {
            values.surname = authors[0].surname;
            values['given-names'] = authors[0].givenname;
        }
        return {
            ...state,
            authors,
            values
        };
    }

    handleAuthorAction(state, action, index) {
        debug.log('insert_mode:handleAuthorAction');
        return this.handleContributorAction(state, 'author', action, index);
    }

    handleEditorAction(state, action, index) {
        debug.log('insert_mode:handleEditorAction');
        return this.handleContributorAction(state, 'editor', action, index);
    }

    handleTranslatorAction(state, action, index) {
        debug.log('insert_mode:handleTranslatorAction');
        return this.handleContributorAction(state, 'translator', action, index);
    }

    handleAuthorReorder(state, fromIndex, toIndex) {
        debug.log('insert_mode:handleAuthorReorder');
        return this.handleContributorAction(state, 'author', 'reorder', fromIndex, toIndex);
    }

    handleEditorReorder(state, fromIndex, toIndex) {
        debug.log('insert_mode:handleEditorReorder');
        return this.handleContributorAction(state, 'editor', 'reorder', fromIndex, toIndex);
    }

    handleTranslatorReorder(state, fromIndex, toIndex) {
        debug.log('insert_mode:handleTranslatorReorder');
        return this.handleContributorAction(state, 'translator', 'reorder', fromIndex, toIndex);
    }

    handleTypeChange(state, event) {
        debug.log('insert_mode:handleTypeChange');
        const value = (event && event.target && event.target.value) ||
            (event && event.currentTarget && event.currentTarget.getAttribute('data-ref-type')) ||
            'journal';
        const leavingEdBook = String(state.refType || '') === 'ed-book' && value !== 'ed-book';
        const blank = this.normalizeAuthors ? this.normalizeAuthors([]) : [];
        return {
            ...state,
            refType: value,
            ...(leavingEdBook ? {
                editors: blank,
                hasEditorGroup: false
            } : {})
        };
    }

    handleInsertMethodChange(state, method) {
        debug.log('insert_mode:handleInsertMethodChange');
        const blankPeople = this.normalizeAuthors ? this.normalizeAuthors([]) : [{
            index: 0,
            surname: '',
            givenname: ''
        }];
        return {
            ...state,
            insertMethod: method || 'doi_form',
            values: {},
            authors: blankPeople,
            editors: this.normalizeAuthors ? this.normalizeAuthors([]) : blankPeople.slice(),
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
            preview: '',
            lastBuiltHtml: '',
            previewNode: null,
            canSubmit: false
        };
    }

    plainTextHasContent(html) {
        const strip = typeof this.stripSummernoteBreaks === 'function' ?
            this.stripSummernoteBreaks :
            (value) => String(value || '').replace(/<\s*br\s*\/?>/gi, '');
        const stripped = strip(html);
        const text = String(stripped || '')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .trim();
        return text.length > 0;
    }

    /**
     * Split Summernote / pasted HTML into one plain-text entry per paragraph.
     * Prefers <p> blocks; falls back to blank-line / double-<br> splits.
     */
    splitPlainTextBulkEntries(html = '') {
        debug.log('insert_mode:splitPlainTextBulkEntries');
        const raw = String(html || '');
        if (!raw.trim()) return [];

        const pMatches = [];
        const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
        let match;
        while ((match = pRe.exec(raw))) {
            const inner = match[1];
            if (this.plainTextHasContent(inner)) pMatches.push(inner.trim());
        }
        if (pMatches.length > 1) return pMatches;
        if (pMatches.length === 1 && !/\n\s*\n|<br\s*\/?>\s*<br\s*\/?>/i.test(raw)) {
            return pMatches;
        }

        const normalized = raw
            .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
            .replace(/<\/p>\s*<p\b[^>]*>/gi, '\n\n')
            .replace(/<\/?p\b[^>]*>/gi, '\n');
        return String(normalized)
            .replace(/\r\n/g, '\n')
            .split(/\n\s*\n+/)
            .map((block) => block.trim())
            .filter((block) => this.plainTextHasContent(block));
    }

    isLocalPlainTextBulkEnabled(options = {}) {
        if (options.localTesting === true) return true;
        const root = (this.globalObject) ||
            (typeof window !== 'undefined' ? window : globalThis);
        return !!(root && root.IS_LOCAL_HOST === true) ||
            (typeof IS_LOCAL_HOST !== 'undefined' && IS_LOCAL_HOST === true);
    }

    computeCanSubmit(state = {}, options = {}) {
        debug.log('insert_mode:computeCanSubmit');
        const method = state.insertMethod || 'doi_form';
        if (method === 'plain_text') {
            return this.plainTextHasContent(state.plainText);
        }
        if (method === 'doi_form') {
            return this.canSubmitDoiInsert(state, options.panel || null);
        }
        const values = state.values || {};
        const hasAuthor = (state.authors || []).some((a) => String(a.surname || '').trim() || String(a.givenname || '').trim());
        const hasCore = String(values.year || '').trim() ||
            String(values.source || '').trim() ||
            String(values['article-title'] || '').trim() ||
            String(values['chapter-title'] || '').trim();
        return hasAuthor || hasCore;
    }

    showValidationAlert(keyVal) {
        debug.log('insert_mode:showValidationAlert');
        if (!keyVal || typeof TOASTER_ALERT !== 'function') return;
        TOASTER_ALERT(keyVal, {
            type: 'warning'
        });
    }

    canSubmitDoiInsert(state = {}, panel = null) {
        debug.log('insert_mode:canSubmitDoiInsert');
        if (!this.validateDoiInsertContent(state).canUpdate) return false;
        if (!this.validateAuthorGroup(state, panel, {
                highlight: false
            }).canUpdate) return false;
        if (!this.validateMandatoryFields(state, panel, {
                highlight: false
            }).canUpdate) return false;
        return true;
    }

    resolveInsertPreviewContent(state = {}, panel = null) {
        debug.log('insert_mode:resolveInsertPreviewContent');

        if (state.preview && String(state.preview).trim()) {
            return String(state.preview);
        }
        if (state.lastBuiltHtml && String(state.lastBuiltHtml).trim()) {
            return String(state.lastBuiltHtml);
        }
        if (!panel) return '';

        const host = panel.querySelector('#reference_preview');
        return host && host.innerHTML ? host.innerHTML : '';
    }

    isPreviewEmpty(state = {}, panel = null) {
        debug.log('insert_mode:isPreviewEmpty');

        const html = this.resolveInsertPreviewContent(state, panel);
        if (!html) return true;

        // Strip tags and &nbsp; from raw HTML string
        const textFromHtml = html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .trim();

        // Parse into DOM and check textContent
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const textFromNode = tempDiv.textContent.trim();

        // Debug both values for inspection
        console.log('Preview check:', {
            textFromHtml,
            textFromNode
        });

        // Empty only if both are blank
        return textFromHtml.length === 0 && textFromNode.length === 0;
    }

    _ensureCitationModuleLoaded() {
        if (window.CitationNewModule && !CitationNewModule.FullyLoaded) {
            window.CitationNewModule.init();
        }
    }
    getRestrictClasses() {

        if (typeof CitationNewModule !== 'undefined') {
            this._ensureCitationModuleLoaded();
            return CitationNewModule.M_SCOPE && CitationNewModule.M_SCOPE.RESTRICT_CLASS || [];
        }
        return [];
    }

    resolveInsertCursorPosition(options = {}) {
        const {
            refOnly = false,
                insertMethod = 'doi_form',
                state = {},
                panel = null
        } = options;

        debug.log('insert_mode:resolveInsertCursorPosition');
        let valid = true;
        let citeEmpty = false;
        const newRefEmpty = this.isPreviewEmpty(state, panel);

        try {
            if (typeof IMPACT_SELECTION !== 'undefined' && typeof IMPACT_SELECTION.getInfo === 'function') {
                IMPACT_SELECTION.getInfo();
            }

            const restrictClasses = this.getRestrictClasses() || [];
            const eCursor = typeof EDITOR_CURSOR !== 'undefined' ? EDITOR_CURSOR : null;
            valid = !!(eCursor && eCursor.IS_CITATION_ALLOWED);
            const IMS = typeof IMPACT_SELECTION !== 'undefined' ? IMPACT_SELECTION : null;

            if (IMS) {
                const nodeClass = IMS.NODE_CLAS || '';
                const parentClass = IMS.PARENT_CLAS || '';
                const restricted = [nodeClass, parentClass].some((cls) => restrictClasses.includes(cls));
                const parents = IMS.PARENTS_CLAS_LIST || [];
                const overlap = parents.some((cls) => ['uri', 'disp-formula', 'inline-formula', 'email', 'ext-link'].includes(cls));

                if (restricted || overlap || IMS.IsMath) valid = false;

                if (typeof window !== 'undefined' && window.paraLock &&
                    typeof window.paraLock._isElementLocked === 'function' && IMS.NODE) {
                    if (window.paraLock._isElementLocked(IMS.NODE, {
                            check_closest: true
                        })) {
                        valid = false;
                    }
                }
            }

            if (this.isNameDateRef()) {
                if (eCursor && eCursor.IS_BACK_PARA) valid = true;
                if (insertMethod === 'plain_text' && panel) {
                    const citeEl = panel.querySelector('#reference_plain_text_cite');
                    citeEmpty = !(citeEl && String(citeEl.value || '').trim());
                }
            }
        } catch (err) {
            if (typeof referenceLogError === 'function') referenceLogError('insert_mode:resolveInsertCursorPosition', err);
            valid = false;
        }

        return {
            valid,
            new_ref_empty: newRefEmpty,
            cite_empty: citeEmpty,
            refOnly: refOnly === true
        };
    }

    validateInsertCursor(options = {}) {
        debug.log('insert_mode:validateInsertCursor');
        const position = this.resolveInsertCursorPosition(options);
        const refOnly = position.refOnly === true;

        if (refOnly) {
            if (position.new_ref_empty) {
                return {
                    canUpdate: false,
                    keyVal: 'empty_doi_content'
                };
            }
            return {
                canUpdate: true,
                keyVal: ''
            };
        }

        if (!position.valid || position.new_ref_empty || position.cite_empty) {
            let keyVal = 'CiteWarningAlert';
            if (position.new_ref_empty) {
                keyVal = options.insertMethod === 'open_form' ? 'empty_field' : 'empty_doi_content';
            } else if (position.cite_empty) {
                keyVal = 'empty_citation';
            }
            return {
                canUpdate: false,
                keyVal
            };
        }

        return {
            canUpdate: true,
            keyVal: ''
        };
    }

    validateBeforeSubmit(state = {}, options = {}) {
        debug.log('insert_mode:validateBeforeSubmit');
        const panel = options.panel || null;
        const refOnly = options.refOnly === true;
        const insertMethod = state.insertMethod || 'doi_form';

        if (insertMethod === 'doi_form') {
            const doiStage = this.validateDoiInsertContent(state);
            if (!doiStage.canUpdate) {
                this.showValidationAlert(doiStage.keyVal);
                return false;
            }

            const authorStage = this.validateAuthorGroup(state, panel, {
                highlight: true
            });
            if (!authorStage.canUpdate) {
                this.showValidationAlert(authorStage.keyVal);
                return false;
            }

            const mandatoryStage = this.validateMandatoryFields(state, panel, {
                highlight: true
            });
            if (!mandatoryStage.canUpdate) {
                this.showValidationAlert(mandatoryStage.keyVal);
                return false;
            }
        } else if (insertMethod === 'open_form') {
            const authorStage = this.validateAuthorGroup(state, panel, {
                highlight: true
            });
            if (!authorStage.canUpdate) {
                this.showValidationAlert(authorStage.keyVal);
                return false;
            }

            if (state.refType === 'ed-book') {
                const editorStage = this.validateEditorGroup(state, panel, {
                    highlight: true
                });
                if (!editorStage.canUpdate) {
                    this.showValidationAlert(editorStage.keyVal);
                    return false;
                }
            }

            const mandatoryStage = this.validateMandatoryFields(state, panel, {
                highlight: true
            });
            if (!mandatoryStage.canUpdate) {
                this.showValidationAlert(mandatoryStage.keyVal);
                return false;
            }
        }

        if (insertMethod === 'plain_text' && !this.plainTextHasContent(state.plainText)) {
            this.showValidationAlert('empty_plain_txt_content');
            return false;
        }

        const cursorStage = this.validateInsertCursor({
            refOnly,
            insertMethod,
            state,
            panel
        });
        if (!cursorStage.canUpdate) {
            this.showValidationAlert(cursorStage.keyVal);
            return false;
        }

        return true;
    }

    toPayload(state) {
        debug.log('insert_mode:toPayload');
        return this.buildPayloadFromState(state);
    }

    // Maps a raw CrossRef/DOI API response snapshot onto internal field/author state shape
    stateFromDoiSnapshot(state = {}) {
        debug.log('insert_mode:stateFromDoiSnapshot');
        const snapshot = state.doiFetchSnapshot;
        if (!snapshot || typeof snapshot !== 'object') return state;

        const pageValue = snapshot.page == null || String(snapshot.page).toLowerCase() === 'null' ?
            '' :
            String(snapshot.page);
        const pageParts = pageValue ? pageValue.split('-') : [];
        const stateOwnsAuthors = Object.prototype.hasOwnProperty.call(state, 'authors');
        const authors = !stateOwnsAuthors && Array.isArray(snapshot.author) && snapshot.author.length ?
            snapshot.author.map((author, index) => ({
                index,
                surname: author.surname || author.family || '',
                givenname: author.givenname || author.given || ''
            })) :
            state.authors;
        const values = {
            ...(state.values || {})
        };
        const rawOrderTokens = state.orderTokens || (state.template && state.template.orderTokens) || [];
        const configuredTokens = new Set((Array.isArray(rawOrderTokens) ? rawOrderTokens : []).map((token) => (
            token === 'pub-id' ? 'doi' : token
        )));
        const hasConfiguredOrder = configuredTokens.size > 0;
        const setSnapshotValue = (token, value) => {
            if (hasConfiguredOrder && !configuredTokens.has(token)) return;
            if (Object.prototype.hasOwnProperty.call(values, token)) return;
            if (value != null && String(value) !== '') values[token] = String(value);
        };

        setSnapshotValue('year', snapshot.year);
        if (state.refType === 'book') {
            setSnapshotValue('source', snapshot.title);
        } else if (state.refType === 'ed-book') {
            setSnapshotValue('chapter-title', snapshot.title);
            setSnapshotValue('source', snapshot.journal);
        } else {
            setSnapshotValue('article-title', snapshot.title);
            setSnapshotValue('source', snapshot.journal);
        }
        setSnapshotValue('volume', snapshot.volume);
        setSnapshotValue('issue', snapshot.issue);
        setSnapshotValue('fpage', pageParts[0]);
        setSnapshotValue('lpage', pageParts[1]);
        const snapshotDoi = snapshot.doi || state.doi || '';
        const orderHasDoi = typeof this.styleOrderHasDoi === 'function' && this.styleOrderHasDoi(state);
        if (!orderHasDoi) {
            if (String(values.doi || '').trim() === String(snapshotDoi).trim()) {
                values.doi = '';
            }
        } else if (!state.doiCleared && snapshotDoi && !String(values.doi || '').trim()) {
            values.doi = snapshotDoi;
        }
        setSnapshotValue('publisher-name', snapshot.publisher);

        return {
            ...state,
            values,
            authors,
            doi: snapshot.doi || state.doi
        };
    }

    submit(state, bridge, options = {}) {
        debug.log('insert_mode:submit');

        const method = state.insertMethod || 'doi_form';
        const mode = state.mode || "insert";


        if (method === 'plain_text') {
            const built = bridge.buildPlainTextReference({
                text: state.plainText || '',
                refType: state.refType || 'journal',
                plainCite: state.plainCite || ''
            }, {
                ...options,
                insertMethod: method,
                mode
            });

            return {
                ...built,
                payload: {
                    type: state.refType || 'journal',
                    plainText: state.plainText || '',
                    plainCite: state.plainCite || ''
                },
                applied: false
            };
        }

        const sourceState = method === 'doi_form' ? this.stateFromDoiSnapshot(state) : state;
        const payload = this.toPayload(sourceState);
        const orderHasDoi = typeof this.styleOrderHasDoi === 'function' && this.styleOrderHasDoi(sourceState);
        if (orderHasDoi && !sourceState.doiCleared && sourceState.doi && !payload.doi) {
            payload.doi = sourceState.doi;
        }

        const template = sourceState.template || {};
        const built = bridge.buildReferenceFromPayload(payload, {
            ...options,
            refNode: sourceState.contextRef || sourceState.refNode,
            documentRoot: sourceState.documentRoot || options.documentRoot,
            insertMethod: method,
            mode,
            configTemplate: options.configTemplate || (template.fields ? {
                fields: template.fields || sourceState.fields || [],
                delimiters: template.delimiters || sourceState.delimiters || {},
                // Without these, mergeTemplateSources sees an empty groupSlots array, so
                // styleHasEditorSlot() reports false and placeEditorGroupAfterAuthor's fallback
                // (meant only for styles that never declare an editor position) incorrectly
                // relocates the editor person-group to right after author -- even for a style
                // like EditedBook-Ref that does declare where it belongs (after volume).
                groupSlots: template.groupSlots || sourceState.groupSlots || [],
                slotOrder: template.slotOrder || sourceState.slotOrder || [],
                source: template.source || 'dialog'
            } : undefined),
            documentTemplate: options.documentTemplate
        });

        if ((sourceState.fields || []).length && built.state) {
            const mergedState = {
                ...built.state,
                fields: built.state.fields,
                values: {
                    ...(built.state.values || {}),
                    ...(sourceState.values || {})
                },
                authors: sourceState.authors || built.state.authors || [],
                editors: sourceState.editors || built.state.editors || [],
                translators: sourceState.translators || built.state.translators || [],
                delimiters: template.delimiters || sourceState.delimiters || built.state.delimiters || {},
                refType: sourceState.refType || built.state.refType
            };
            const rebuilt = bridge.buildReferenceDom(mergedState, {
                rid: options.rid || (built.refNode && built.refNode.id) || 'CIT0001',
                ownerDocument: options.ownerDocument ||
                    (typeof document !== 'undefined' ? document : null),
                insertMethod: method,
                mode: state.mode || null
            });
            if (rebuilt.refNode) {
                return {
                    refNode: rebuilt.refNode,
                    html: rebuilt.refNode.outerHTML,
                    preview: bridge.buildReferencePreview(mergedState),
                    state: mergedState,
                    payload,
                    applied: false
                };
            }
        }

        return {
            ...built,
            payload,
            applied: false
        };
    }


    // Finalizes a built ref node: assigns/reuses its id+label and splices it into the doc's ref list
    applyBuilt(built, bridge, options = {}) {
        debug.log('insert_mode:applyBuilt');
        if (!built || !built.refNode) {
            return {
                changed: false,
                reason: 'build-failed'
            };
        }
        const state = options.state || {};
        const contextRef = options.contextRef || state.contextRef || state.refNode || null;
        const targets = !options.refList && typeof bridge.resolveRefTargets === 'function' ?
            bridge.resolveRefTargets(options.documentRoot, {
                isJournal: options.isJournal,
                globalObject: bridge.globalObject,
                contextRef
            }) : null;
        const refList = options.refList || (targets && targets.refList) || bridge.findRefList(options.documentRoot);
        if (!refList) {
            return {
                changed: false,
                reason: 'ref-list-missing',
                refNode: built.refNode,
                html: built.html
            };
        }

        const refs = refList.querySelectorAll('div.ref[id]');
        const lastRef = refs.length ? refs[refs.length - 1] : null;
        const placeholderId = !built.refNode.id || built.refNode.id === 'CIT0001';
        const shouldAssignIdentity = placeholderId && !options.rid;
        const refOnly = options.refOnly === true;

        if (shouldAssignIdentity) {
            const identity = bridge.getNextReferenceIdentity(refList, {
                documentRoot: options.documentRoot,
                lastRef,
                ...((targets && targets.identityOptions) || {})
            });
            built.refNode.id = identity.rid;
            if (!this.isNameDateRef() && !refOnly) {
                built.refNode.setAttribute('data-label', identity.displayLabel);
                if (typeof bridge.placeNumberedLabel === 'function') {
                    bridge.placeNumberedLabel(built.refNode, identity.displayLabel);
                }
            }
        } else if (options.rid) {
            built.refNode.id = options.rid;
        }
        const isPlainText = state.insertMethod === 'plain_text';
        const citeHtml = refOnly ? '' : this.buildInsertCitationHtml({
            refNode: built.refNode,
            rid: built.refNode.id,
            state,
            isPlainText
        });

        return this.applyInsertToDocument({
            refNode: built.refNode,
            citeHtml,
            refOnly,
            refList,
            documentRoot: options.documentRoot,
            contextRef
        });
    }

    insertPlainTextBatchForLocalTesting(entries = [], bridge, options = {}) {
        debug.log('insert_mode:insertPlainTextBatchForLocalTesting');
        const root = (bridge && bridge.globalObject) ||
            (typeof window !== 'undefined' ? window : globalThis);
        const isLocal = options.localTesting === true ||
            (root && root.IS_LOCAL_HOST === true) ||
            (typeof IS_LOCAL_HOST !== 'undefined' && IS_LOCAL_HOST === true);
        if (!isLocal) {
            return {
                changed: false,
                reason: 'local-testing-disabled',
                inserted: [],
                results: []
            };
        }

        const sourceEntries = Array.isArray(entries) ?
            entries :
            String(entries || '').split(options.delimiter || /\r?\n+/);
        const inserted = [];
        const results = [];

        sourceEntries.forEach((entry) => {
            const plainText = typeof entry === 'string' ?
                entry :
                (entry && (entry.text || entry.plainText)) || '';
            if (!String(plainText || '').trim()) return;

            const state = this.createModeState({
                refType: (entry && entry.refType) || options.refType || 'journal',
                insertMethod: 'plain_text',
                plainText,
                plainCite: (entry && entry.plainCite) || ''
            }, {
                documentRoot: options.documentRoot
            });
            const built = this.submit(state, bridge, {
                documentRoot: options.documentRoot,
                ownerDocument: options.ownerDocument
            });
            const applied = this.applyBuilt(built, bridge, {
                documentRoot: options.documentRoot,
                refOnly: options.refOnly === true || (entry && entry.citeStatus === 'failed'),
                state
            });
            results.push(applied);
            if (applied && applied.changed) inserted.push(applied.refNode || built.refNode);
        });

        return {
            changed: inserted.length > 0,
            inserted,
            results
        };
    }

    // Merges a freshly loaded field template into existing state, recomputing derived preview/canSubmit
    withTemplate(state, template, bridge) {
        debug.log('insert_mode:withTemplate');
        const values = {
            ...(template.values || {})
        };
        const fields = (template.fields || []).map((field) => ({
            ...field,
            value: values[field.token] != null ? values[field.token] : field.value
        }));
        const authors = state.authors && state.authors.some((a) => a.surname || a.givenname) ?
            this.normalizeAuthors(state.authors) :
            this.authorsFromTemplateFields(fields, values);
        const editors = this.normalizeAuthors(state.editors || template.editors || []);
        const translators = this.normalizeAuthors(state.translators || template.translators || []);

        const originalValues = { ...(template.originalValues || {}) };
        const originalInlineFormats = { ...(template.originalInlineFormats || {}) };

        return {
            ...state,
            refType: template.refType || state.refType,
            template,
            values,
            fields,
            originalValues,
            originalInlineFormats,
            authors,
            editors,
            translators,
            contributorTrim: template.contributorTrim || state.contributorTrim || null,
            hasEditorGroup: !!template.hasEditorGroup || state.refType === 'ed-book' ||
                (template.refType || state.refType) === 'ed-book',
            hasTranslatorGroup: !!template.hasTranslatorGroup,
            preview: bridge.buildReferencePreview({
                ...template,
                values,
                authors
            }),
            sourcePolicy: template.sourcePolicy || '',
            canSubmit: this.computeCanSubmit({
                ...state,
                values,
                authors,
                editors
            }, {
                panel: state.panel || null
            })
        };
    }

    static create() {
        debug.log('insert_mode:create');
        return new InsertReferenceMode();
    }
}

export default InsertReferenceMode;
