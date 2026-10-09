class EditReferenceMode {
    constructor() {
        debug.log('edit_mode:constructor');
        this._importPromise = this._importDependencies();
    }

    async _importDependencies() {
        debug.log('edit_mode:_importDependencies');
        const common = await import('./common.js');
        this.normalizeAuthors = common.normalizeAuthors;
        this.authorsFromTemplateFields = common.authorsFromTemplateFields;
        this.buildPayloadFromState = common.buildPayloadFromState;
        this.handleContributorAction = common.handleContributorAction;
        this.reconcileMappedFieldsFromValues = common.reconcileMappedFieldsFromValues;
        this.resolvePromotedRefType = common.resolvePromotedRefType;
        this.splitLinkValuesFromLeaves = common.splitLinkValuesFromLeaves;
        this.mergeLinkValuesForState = common.mergeLinkValuesForState;
    }

    async _ensureReady() {
        debug.log('edit_mode:_ensureReady');
        await this._importPromise;
    }

    createModeState(payload = {}, baseState = {}) {
        debug.log('edit_mode:createModeState');
        const contextRef = payload.contextRef || payload.refNode || null;
        return {
            ...baseState,
            mode: 'edit',
            refType: payload.refType || baseState.refType || 'journal',
            contextRef,
            refNode: contextRef,
            queryNode: payload.queryNode || null,
            template: null,
            values: {},
            fields: [],
            authors: this.normalizeAuthors(payload.authors || baseState.authors),
            editors: this.normalizeAuthors(payload.editors || baseState.editors || []),
            translators: this.normalizeAuthors(payload.translators || baseState.translators || []),
            insertMethod: 'open_form',
            doi: '',
            doiFetched: false,
            doiCleared: false,
            doiFetchSnapshot: null,
            doiFetchSnapshotAt: null,
            canSubmit: false,
            preview: '',
            sourcePolicy: ''
        };
    }

    prepareTemplate(state, bridge) {
        debug.log('edit_mode:prepareTemplate');
        const template = bridge.prepareTemplate({
            mode: 'edit',
            refNode: state.contextRef || state.refNode,
            refType: state.refType,
            queryNode: state.queryNode,
            documentRoot: state.documentRoot
        });
        return this.withTemplate(state, template, bridge);
    }

    handleFieldInput(state, event) {
        debug.log('edit_mode:handleFieldInput');
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

    // Also mirrors the first author's name into values.surname/given-names, since
    // those fields are rendered from `values` rather than the authors array.
    handleAuthorInput(state, target) {
        debug.log('edit_mode:handleAuthorInput');
        const index = Number(target.getAttribute('data-author-index') || 0);
        const field = target.getAttribute('data-author-field');
        const nextValue = target.value;
        const authors = this.normalizeAuthors(state.authors).map((author, i) => {
            if (i !== index) return author;
            return {
                ...author,
                [field]: nextValue
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
        debug.log('edit_mode:handleAuthorAction');
        return this.handleContributorAction(state, 'author', action, index);
    }

    handleEditorAction(state, action, index) {
        debug.log('edit_mode:handleEditorAction');
        return this.handleContributorAction(state, 'editor', action, index);
    }

    handleTranslatorAction(state, action, index) {
        debug.log('edit_mode:handleTranslatorAction');
        return this.handleContributorAction(state, 'translator', action, index);
    }

    handleAuthorReorder(state, fromIndex, toIndex) {
        debug.log('edit_mode:handleAuthorReorder');
        return this.handleContributorAction(state, 'author', 'reorder', fromIndex, toIndex);
    }

    handleEditorReorder(state, fromIndex, toIndex) {
        debug.log('edit_mode:handleEditorReorder');
        return this.handleContributorAction(state, 'editor', 'reorder', fromIndex, toIndex);
    }

    handleTranslatorReorder(state, fromIndex, toIndex) {
        debug.log('edit_mode:handleTranslatorReorder');
        return this.handleContributorAction(state, 'translator', 'reorder', fromIndex, toIndex);
    }

    handleTypeChange(state, event) {
        debug.log('edit_mode:handleTypeChange');
        return {
            ...state,
            refType: event.target.value || 'journal'
        };
    }

    toPayload(state) {
        debug.log('edit_mode:toPayload');
        return this.buildPayloadFromState(state);
    }

    buildFields(state) {
        debug.log('edit_mode:buildFields');
        const reconciled = typeof this.reconcileMappedFieldsFromValues === 'function' ?
            this.reconcileMappedFieldsFromValues(state) :
            state;
        return (reconciled.fields || []).map((field) => ({
            ...field,
            value: reconciled.values && reconciled.values[field.token] != null ? reconciled.values[field.token] : field.value
        }));
    }

    submit(state, bridge, options = {}) {
        debug.log('edit_mode:submit');
        const reconciledState = typeof this.reconcileMappedFieldsFromValues === 'function' ?
            this.reconcileMappedFieldsFromValues(state) :
            state;
        const fields = this.buildFields(reconciledState);
        const payload = this.toPayload(reconciledState);
        const editState = {
            ...reconciledState,
            fields,
            authors: this.normalizeAuthors(reconciledState.authors),
            editors: this.normalizeAuthors(reconciledState.editors || []),
            translators: this.normalizeAuthors(reconciledState.translators || []),
            values: reconciledState.values,
            contextRef: reconciledState.contextRef || reconciledState.refNode,
            refNode: reconciledState.contextRef || reconciledState.refNode,
            refType: reconciledState.refType,
            delimiters: (reconciledState.template && reconciledState.template.delimiters) || reconciledState.delimiters || {},
            citationSyncDetails: bridge.buildCitationSyncDetails({
                ref: reconciledState.contextRef || reconciledState.refNode,
                refType: reconciledState.refType,
                fields
            })
        };
        const built = bridge.buildEditReferenceDom(editState, options);
        return {
            ...built,
            payload,
            applied: false
        };
    }

    // Swaps the freshly built ref DOM node in place of the original source node in the document.
    applyBuilt(built, options = {}) {
        debug.log('edit_mode:applyBuilt');
        if (!built || !built.refNode || !built.changed) {
            return {
                changed: false,
                reason: built && built.reason ? built.reason : 'no-change',
                refNode: built && built.refNode ? built.refNode : null,
                html: built && built.html ? built.html : ''
            };
        }
        const sourceRef = options.sourceRef || null;
        if (!sourceRef || !sourceRef.parentNode) {
            return {
                changed: false,
                reason: 'source-missing',
                refNode: built.refNode,
                html: built.html
            };
        }
        sourceRef.parentNode.replaceChild(built.refNode, sourceRef);
        return {
            changed: true,
            refNode: built.refNode,
            html: built.refNode.outerHTML,
            applied: true
        };
    }

    // Merges a freshly resolved template into state and recomputes derived flags
    // (canSubmit, hasEditorGroup, preview) from the merged values/authors.
    withTemplate(state, template, bridge) {
        debug.log('edit_mode:withTemplate');
        const values = {
            ...(template.values || {})
        };
        const mixed = (template.ref || state.contextRef)?.querySelector?.('.mixed-citation') || null;
        const linkRoot = mixed || template.ref || state.contextRef;
        const linkParts = typeof this.splitLinkValuesFromLeaves === 'function' ?
            this.splitLinkValuesFromLeaves(linkRoot) :
            { doi: '', 'ext-link': '' };
        const mergedValues = typeof this.mergeLinkValuesForState === 'function' ?
            this.mergeLinkValuesForState(values, linkParts) :
            values;
        const fields = (template.fields || []).map((field) => ({
            ...field,
            value: mergedValues[field.token] != null ? mergedValues[field.token] : field.value
        }));
        const authors = (template.authors && template.authors.length) ?
            this.normalizeAuthors(template.authors) :
            this.authorsFromTemplateFields(fields, mergedValues);
        const editors = this.normalizeAuthors(template.editors || state.editors || []);
        const translators = this.normalizeAuthors(template.translators || state.translators || []);
        const resolvePromoted = this.resolvePromotedRefType || ((args) => {
            const type = String(args.refType || '').toLowerCase() || 'journal';
            return type === 'ed-book' ? 'ed-book' : type;
        });
        const refType = resolvePromoted({
            refType: template.refType || state.refType,
            mixed,
            fields
        });

        const originalValues = Object.freeze({ ...(template.originalValues || {}) });
        const originalInlineFormats = Object.freeze({ ...(template.originalInlineFormats || {}) });

        return {
            ...state,
            refType,
            template,
            values: mergedValues,
            fields,
            originalValues,
            originalInlineFormats,
            authors,
            editors,
            translators,
            contributorTrim: template.contributorTrim || state.contributorTrim || null,
            hasEditorGroup: !!template.hasEditorGroup || refType === 'ed-book' || editors.some((person) => String(person.surname || '').trim() || String(person.givenname || '').trim()),
            hasTranslatorGroup: !!template.hasTranslatorGroup,
            preview: bridge.buildReferencePreview({
                ...template,
                values: mergedValues,
                authors
            }),
            sourcePolicy: template.sourcePolicy || '',
            insertMethod: 'open_form',
            canSubmit: Object.keys(mergedValues).some((key) => String(mergedValues[key] || '').trim()) ||
                authors.some((a) => a.surname || a.givenname)
        };
    }

    static create() {
        debug.log('edit_mode:create');
        return new EditReferenceMode();
    }
}

export default EditReferenceMode;
