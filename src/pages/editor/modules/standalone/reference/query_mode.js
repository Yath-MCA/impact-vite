class MissingQueryReferenceMode {
    constructor() {
        debug.log('query_mode:constructor');
        this._importPromise = this._importDependencies();
    }

    async _importDependencies() {
        debug.log('query_mode:_importDependencies');
        const common = await import('./common.js');
        this.normalizeAuthors = common.normalizeAuthors;
        this.authorsFromTemplateFields = common.authorsFromTemplateFields;
        this.buildPayloadFromState = common.buildPayloadFromState;
        this.handleContributorAction = common.handleContributorAction;
        this.reconcileMappedFieldsFromValues = common.reconcileMappedFieldsFromValues;
        this.editorsForQueryPanel = common.editorsForQueryPanel;
        this.resolvePromotedRefType = common.resolvePromotedRefType;
        this.splitLinkValuesFromLeaves = common.splitLinkValuesFromLeaves;
        this.mergeLinkValuesForState = common.mergeLinkValuesForState;
    }

    async _ensureReady() {
        debug.log('query_mode:_ensureReady');
        await this._importPromise;
    }

    createModeState(payload = {}, baseState = {}) {
        debug.log('query_mode:createModeState');
        const contextRef = payload.contextRef || payload.refNode || null;
        return {
            ...baseState,
            mode: 'query',
            refType: payload.refType || baseState.refType || 'journal',
            contextRef,
            refNode: contextRef,
            queryNode: payload.queryNode || payload.query || null,
            template: null,
            values: {},
            fields: [],
            authors: this.normalizeAuthors(payload.authors || baseState.authors),
            editors: this.normalizeAuthors(payload.editors || baseState.editors || []),
            translators: this.normalizeAuthors(payload.translators || baseState.translators || []),
            insertMethod: 'open_form',
            canSubmit: false,
            preview: '',
            sourcePolicy: ''
        };
    }

    prepareTemplate(state, bridge) {
        debug.log('query_mode:prepareTemplate');
        const template = bridge.prepareTemplate({
            mode: 'query',
            refNode: state.contextRef || state.refNode,
            refType: state.refType,
            queryNode: state.queryNode,
            documentRoot: state.documentRoot
        });
        return this.withTemplate(state, template, bridge);
    }

    handleFieldInput(state, event) {
        debug.log('query_mode:handleFieldInput');
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

    // Also mirrors the first author's name into values.surname/given-names, which drive the mixed-citation preview
    handleAuthorInput(state, target) {
        debug.log('query_mode:handleAuthorInput');
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
        debug.log('query_mode:handleAuthorAction');
        return this.handleContributorAction(state, 'author', action, index);
    }

    handleEditorAction(state, action, index) {
        debug.log('query_mode:handleEditorAction');
        return this.handleContributorAction(state, 'editor', action, index);
    }

    handleTranslatorAction(state, action, index) {
        debug.log('query_mode:handleTranslatorAction');
        return this.handleContributorAction(state, 'translator', action, index);
    }

    handleAuthorReorder(state, fromIndex, toIndex) {
        debug.log('query_mode:handleAuthorReorder');
        return this.handleContributorAction(state, 'author', 'reorder', fromIndex, toIndex);
    }

    handleEditorReorder(state, fromIndex, toIndex) {
        debug.log('query_mode:handleEditorReorder');
        return this.handleContributorAction(state, 'editor', 'reorder', fromIndex, toIndex);
    }

    handleTranslatorReorder(state, fromIndex, toIndex) {
        debug.log('query_mode:handleTranslatorReorder');
        return this.handleContributorAction(state, 'translator', 'reorder', fromIndex, toIndex);
    }

    handleTypeChange(state, event) {
        debug.log('query_mode:handleTypeChange');
        return {
            ...state,
            refType: event.target.value || 'journal'
        };
    }

    toPayload(state) {
        debug.log('query_mode:toPayload');
        return this.buildPayloadFromState(state);
    }

    submit(state, bridge, options = {}) {
        debug.log('query_mode:submit');
        const reconciledState = typeof this.reconcileMappedFieldsFromValues === 'function' ?
            this.reconcileMappedFieldsFromValues(state) :
            state;
        const payload = this.toPayload(reconciledState);
        const queryState = {
            ...reconciledState,
            authors: this.normalizeAuthors(reconciledState.authors),
            values: reconciledState.values,
            fields: reconciledState.fields,
            contextRef: reconciledState.contextRef || reconciledState.refNode,
            refNode: reconciledState.contextRef || reconciledState.refNode,
            refType: reconciledState.refType,
            delimiters: (reconciledState.template && reconciledState.template.delimiters) || reconciledState.delimiters || {}
        };
        const built = bridge.buildQueryReferenceDom(queryState, options);
        return {
            ...built,
            payload,
            applied: false
        };
    }

    moveQueryCommentsOutsideMixedCitation(mixed) {
        debug.log('query_mode:moveQueryCommentsOutsideMixedCitation');
        if (!mixed || !mixed.querySelectorAll) return [];
        const root = mixed.parentElement || mixed;
        const movedIds = {};
        let insertAfter = mixed;
        Array.from(mixed.querySelectorAll('[data-class="ckcommentsfull"]')).forEach((comment) => {
            const commentId = comment.id || '';
            const trackedWrapper = comment.closest && comment.closest('insert');
            const commentNode = trackedWrapper && mixed.contains(trackedWrapper) ? trackedWrapper : comment;
            const duplicateOutside = commentId ? Array.from(root.querySelectorAll('[data-class="ckcommentsfull"]')).find((item) => (
                item.id === commentId && item !== comment && !mixed.contains(item)
            )) : null;
            if ((commentId && movedIds[commentId]) || duplicateOutside) {
                commentNode.remove();
                return;
            }
            insertAfter.insertAdjacentElement('afterend', commentNode);
            insertAfter = commentNode;
            if (commentId) movedIds[commentId] = true;
        });
        return Array.from(root.querySelectorAll('[data-class="ckcommentsfull"]')).filter((comment) => !mixed.contains(comment));
    }

    // Splices the freshly built mixed-citation nodes into the original source refNode in place, rather than replacing the whole node
    applyBuilt(built, options = {}) {
        debug.log('query_mode:applyBuilt');
        if (!built || !built.refNode || !built.changed) {
            return {
                changed: false,
                reason: built && built.reason ? built.reason : 'no-change',
                refNode: built && built.refNode ? built.refNode : null,
                html: built && built.html ? built.html : ''
            };
        }
        const sourceRef = options.sourceRef || null;
        if (!sourceRef) {
            return {
                changed: false,
                reason: 'source-missing',
                refNode: built.refNode,
                html: built.html
            };
        }
        const mixed = sourceRef.querySelector('.mixed-citation');
        const builtMixed = built.refNode.querySelector('.mixed-citation');
        if (!mixed || !builtMixed) {
            return {
                changed: false,
                reason: 'mixed-citation-missing',
                refNode: built.refNode,
                html: built.html
            };
        }
        this.moveQueryCommentsOutsideMixedCitation(mixed);
        while (mixed.firstChild) mixed.removeChild(mixed.firstChild);
        while (builtMixed.firstChild) mixed.appendChild(builtMixed.firstChild);
        return {
            changed: true,
            refNode: sourceRef,
            html: sourceRef.outerHTML,
            applied: true
        };
    }

    // Derives canSubmit from whether any field is flagged missing or any value is non-empty, not from an explicit validity flag
    withTemplate(state, template, bridge) {
        debug.log('query_mode:withTemplate');
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
        const resolvePromoted = this.resolvePromotedRefType || ((args) => {
            const type = String(args.refType || '').toLowerCase() || 'journal';
            return type === 'ed-book' ? 'ed-book' : type;
        });
        const refType = resolvePromoted({
            refType: template.refType || state.refType,
            mixed,
            fields
        });
        const hasEditorGroup = !!template.hasEditorGroup || refType === 'ed-book';
        const editors = typeof this.editorsForQueryPanel === 'function' ?
            this.editorsForQueryPanel({
                ...state,
                mode: 'query',
                refType,
                hasEditorGroup,
                fields,
                missingFields: template.missingFields || [],
                editors: this.normalizeAuthors(template.editors || state.editors || [])
            }) :
            this.normalizeAuthors(template.editors || state.editors || []);
        const translators = this.normalizeAuthors(template.translators || state.translators || []);

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
            hasEditorGroup,
            hasTranslatorGroup: !!template.hasTranslatorGroup,
            preview: bridge.buildReferencePreview({
                ...template,
                values: mergedValues,
                authors,
                editors
            }),
            sourcePolicy: template.sourcePolicy || '',
            insertMethod: 'open_form',
            canSubmit: (fields || []).some((field) => field.missing) ||
                Object.keys(mergedValues).some((key) => String(mergedValues[key] || '').trim())
        };
    }

    static create() {
        debug.log('query_mode:create');
        return new MissingQueryReferenceMode();
    }
}

export default MissingQueryReferenceMode;
