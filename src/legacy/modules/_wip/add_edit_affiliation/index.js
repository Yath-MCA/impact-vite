/* jshint esversion: 11 */
/* global BaseModule, ErrorLogTrace, IMPACT_SELECTION, USER_INFO */

class AddEditAffiliationModule extends BaseModule {
    constructor(name = 'AddEditAffiliationModule', errorTracker = null, options = {}) {
        super(name, errorTracker, options);
        this._id = 'AddEditAffiliationDialog';
        this.canUnmountComponentWhileClose = true;
        this.editState = null;
        this.mode = 'edit';
        this.elements = {};
        this._pendingAffiliation = null;
        this._activeFieldIndex = null;
        this._eventsBound = false;
        this._boundPanel = null;
        this.affiliationDom = null;
        this._affiliationDomPromise = null;
        this._bindModuleMethods();
    }

    async loadAffiliationDom() {
        if (this.affiliationDom) return this.affiliationDom;
        if (!this._affiliationDomPromise) {
            this._affiliationDomPromise = import('./affiliation-dom.js');
        }
        this.affiliationDom = await this._affiliationDomPromise;
        return this.affiliationDom;
    }

    _bindModuleMethods() {
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== 'constructor' && typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        });
    }

    logError(functionName, error) {
        const message = error && error.message ? error.message : String(error || 'Unknown error');
        if (typeof ErrorLogTrace === 'function') {
            ErrorLogTrace(`AddEditAffiliationModule.${functionName}`, message);
        }
    }

    resolveAffiliationNode(node) {
        const domNode = node && node.$ ? node.$ : node;
        if (!domNode || domNode.nodeType !== 1) return null;
        if (domNode.matches && domNode.matches('div.aff, [data-name="aff"]')) return domNode;
        return domNode.closest ? domNode.closest('div.aff, [data-name="aff"]') : null;
    }

    initializeElements() {
        const selectors = AddEditAffiliationModule.SELECTORS;
        this.elements = Object.keys(selectors).reduce((elements, key) => {
            elements[key] = this.Panel.querySelector(selectors[key]);
            return elements;
        }, {});
        this.elements.closeIcon = this.Panel.querySelector('.closeIcons');
    }

    setupEventListeners() {
        if (this._eventsBound && this._boundPanel === this.Panel) return;
        const {
            activeEditor,
            applyButton,
            revertButton,
            previewHost,
            pasteInput,
            stagePasteButton,
            clearPasteButton,
            updateButton,
            cancelButton,
            closeIcon
        } = this.elements;

        if (previewHost) previewHost.addEventListener('click', this.onPreviewClick);
        if (previewHost) previewHost.addEventListener('keydown', this.onPreviewKeydown);
        if (activeEditor) activeEditor.addEventListener('input', this.onFieldInput);
        if (applyButton) applyButton.addEventListener('click', this.handleFieldApply);
        if (revertButton) revertButton.addEventListener('click', this.handleFieldRevert);
        if (pasteInput) pasteInput.addEventListener('input', this.clearPasteError);
        if (stagePasteButton) stagePasteButton.addEventListener('click', this.handleStagePaste);
        if (clearPasteButton) clearPasteButton.addEventListener('click', this.handleClearPaste);
        if (updateButton) updateButton.addEventListener('click', this.handleFire);
        if (cancelButton) cancelButton.addEventListener('click', this.handleCancel);
        if (closeIcon) closeIcon.addEventListener('click', this.handleCancel);

        this._eventsBound = true;
        this._boundPanel = this.Panel;
    }

    showBefore(mode, affiliationNode) {
        try {
            const affiliation = this.resolveAffiliationNode(affiliationNode);
            if (!affiliation || affiliation.hasAttribute('data-remove') ||
                affiliation.hasAttribute('data-delete')) {
                return false;
            }
            this.mode = mode === 'insert' ? 'insert' : 'edit';
            this._pendingAffiliation = affiliation;
            return true;
        } catch (error) {
            this.logError('showBefore', error);
            return false;
        }
    }

    async showLoop(mode, affiliationNode) {
        try {
            const affiliationDom = await this.loadAffiliationDom();
            this.initializeElements();
            this.setupEventListeners();

            const affiliation = this._pendingAffiliation || this.resolveAffiliationNode(affiliationNode);
            this._pendingAffiliation = null;
            this.mode = mode === 'insert' ? 'insert' : 'edit';
            if (!affiliation || (this.mode === 'edit' &&
                !affiliationDom.isEditableAffiliation(affiliation))) {
                this.handleCancel();
                return;
            }

            const stagedRoot = this.mode === 'edit' ? affiliation.cloneNode(true) : null;
            const fields = stagedRoot ? this.createFields(stagedRoot, 'existing') : [];

            this.editState = { affiliation, stagedRoot, fields, newAffiliation: null };
            this._activeFieldIndex = null;
            this.resetPasteState();
            this.applyModeUi();
            this.renderPreview();
            this.closeActiveField();
            this.updateFooterState();
        } catch (error) {
            this.logError('showLoop', error);
            this.handleCancel();
        }
    }

    applyModeUi() {
        const isInsert = this.mode === 'insert';
        if (this.elements.addSection) {
            this.elements.addSection.classList.toggle('d-none', !isInsert);
        }
        if (this.elements.editSection) {
            this.elements.editSection.classList.toggle('d-none', isInsert && !this.editState.newAffiliation);
        }
        if (this.elements.title) {
            this.elements.title.textContent = isInsert ? 'Add Affiliation' : 'Edit Affiliation';
        }
        if (this.elements.updateButton) {
            this.elements.updateButton.textContent = isInsert ? 'Add' : 'Update';
        }
    }

    resetPasteState() {
        if (this.elements.pasteInput) this.elements.pasteInput.value = '';
        this.clearPasteError();
    }

    createFields(root, rootType) {
        return this.affiliationDom.discoverAffiliationFields(root).map((field) => {
            return Object.assign({}, field, {
                index: 0,
                rootType,
                originalValue: field.value
            });
        });
    }

    reindexFields() {
        if (!this.editState) return;
        this.editState.fields.forEach((field, index) => {
            field.index = index;
        });
    }

    getFieldRoot(field) {
        if (!this.editState || !field) return null;
        return field.rootType === 'new' ?
            this.editState.newAffiliation : this.editState.stagedRoot;
    }

    renderPreview() {
        const { previewHost } = this.elements;
        if (!previewHost || !this.editState || !this.affiliationDom) return;
        previewHost.replaceChildren();

        this.reindexFields();
        const roots = [];
        if (this.mode === 'edit' && this.editState.stagedRoot) {
            roots.push({ type: 'existing', root: this.editState.stagedRoot });
        }
        if (this.editState.newAffiliation) {
            roots.push({ type: 'new', root: this.editState.newAffiliation });
        }

        roots.forEach((entry) => {
            const previewRoot = entry.root.cloneNode(true);
            previewRoot.removeAttribute('id');
            previewRoot.classList.add('aff-preview-entry');
            previewRoot.setAttribute('data-preview-kind', entry.type);
            this.editState.fields.filter((field) => field.rootType === entry.type)
                .slice().reverse().forEach((field) => {
                const segment = document.createElement('span');
                segment.className = 'aff-preview-seg';
                segment.setAttribute('data-field-index', String(field.index));
                segment.setAttribute('title', field.label);
                segment.setAttribute('tabindex', '0');
                segment.textContent = field.value || `[${field.label}]`;
                const target = this.affiliationDom.resolveAffiliationNode(previewRoot, field.path);
                if (!target) return;
                if (target.nodeType === 3 && target.parentNode) {
                    const value = target.nodeValue || '';
                    const leading = (value.match(/^\s*/) || [''])[0];
                    const trailing = (value.match(/\s*$/) || [''])[0];
                    const fragment = document.createDocumentFragment();
                    if (leading) fragment.appendChild(document.createTextNode(leading));
                    fragment.appendChild(segment);
                    if (trailing) fragment.appendChild(document.createTextNode(trailing));
                    target.parentNode.replaceChild(fragment, target);
                } else if (target.nodeType === 1) {
                    target.replaceChildren(segment);
                }
                });
            previewHost.appendChild(previewRoot);
        });
    }

    onPreviewKeydown(event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const segment = event.target.closest && event.target.closest('[data-field-index]');
        if (!segment) return;
        event.preventDefault();
        this.openField(Number(segment.getAttribute('data-field-index')));
    }

    onPreviewClick(event) {
        const segment = event.target.closest && event.target.closest('[data-field-index]');
        if (!segment || !this.elements.previewHost.contains(segment)) return;
        this.openField(Number(segment.getAttribute('data-field-index')));
    }

    openField(fieldIndex) {
        if (!this.editState || !this.editState.fields[fieldIndex]) return false;
        const field = this.editState.fields[fieldIndex];
        this._activeFieldIndex = fieldIndex;
        this.elements.activeLabel.textContent = field.label;
        this.elements.activeEditor.value = field.value;
        this.elements.editCollapse.classList.add('show');
        this.elements.idleHint.classList.add('d-none');
        this.elements.applyButton.disabled = true;
        this.elements.revertButton.disabled = false;
        this.highlightActivePreviewSegment();
        return true;
    }

    highlightActivePreviewSegment() {
        if (!this.elements.previewHost) return;
        this.elements.previewHost.querySelectorAll('.aff-preview-seg.active').forEach((segment) => {
            segment.classList.remove('active');
        });
        if (this._activeFieldIndex === null) return;
        const active = this.elements.previewHost.querySelector(
            `[data-field-index="${this._activeFieldIndex}"]`
        );
        if (active) active.classList.add('active');
    }

    onFieldInput() {
        if (this._activeFieldIndex === null) return;
        const field = this.editState.fields[this._activeFieldIndex];
        this.elements.applyButton.disabled = this.elements.activeEditor.value === field.value;
    }

    handleFieldApply(event) {
        if (event && event.preventDefault) event.preventDefault();
        if (this._activeFieldIndex === null || !this.editState) return false;

        const field = this.editState.fields[this._activeFieldIndex];
        const value = this.elements.activeEditor.value;
        if (!this.affiliationDom.applyAffiliationFieldValue(
            this.getFieldRoot(field),
            field.path,
            value
        )) return false;
        field.value = value;
        this.renderPreview();
        this.closeActiveField();
        this.updateFooterState();
        return true;
    }

    handleFieldRevert(event) {
        if (event && event.preventDefault) event.preventDefault();
        if (this._activeFieldIndex === null || !this.editState) return false;
        const field = this.editState.fields[this._activeFieldIndex];
        if (!this.affiliationDom.applyAffiliationFieldValue(
            this.getFieldRoot(field),
            field.path,
            field.originalValue
        )) return false;
        field.value = field.originalValue;
        this.renderPreview();
        this.closeActiveField();
        this.updateFooterState();
        return true;
    }

    closeActiveField() {
        this._activeFieldIndex = null;
        if (this.elements.editCollapse) this.elements.editCollapse.classList.remove('show');
        if (this.elements.idleHint) this.elements.idleHint.classList.remove('d-none');
        if (this.elements.activeLabel) this.elements.activeLabel.textContent = '';
        if (this.elements.activeEditor) this.elements.activeEditor.value = '';
        if (this.elements.applyButton) this.elements.applyButton.disabled = true;
        if (this.elements.revertButton) this.elements.revertButton.disabled = true;
        this.highlightActivePreviewSegment();
    }

    clearPasteError() {
        if (!this.elements.pasteError) return;
        this.elements.pasteError.textContent = '';
        this.elements.pasteError.classList.add('d-none');
    }

    showPasteError(message) {
        if (!this.elements.pasteError) return;
        this.elements.pasteError.textContent = message;
        this.elements.pasteError.classList.remove('d-none');
    }

    handleStagePaste(event) {
        if (event && event.preventDefault) event.preventDefault();
        if (this.mode !== 'insert' || !this.editState || !this.elements.pasteInput) return false;
        const parsed = this.affiliationDom.parsePastedAffiliation(
            this.elements.pasteInput.value,
            document
        );
        if (!parsed.ok || !this.affiliationDom.isEditableAffiliation(parsed.affiliation)) {
            this.showPasteError(parsed.error || 'The pasted affiliation has no editable content.');
            return false;
        }

        parsed.affiliation.id = this.affiliationDom.getNextAffiliationId(document);
        this.editState.newAffiliation = parsed.affiliation;
        this.editState.fields = this.editState.fields.filter((field) => field.rootType !== 'new')
            .concat(this.createFields(parsed.affiliation, 'new'));
        this.clearPasteError();
        this.applyModeUi();
        this.closeActiveField();
        this.renderPreview();
        this.updateFooterState();
        return true;
    }

    handleClearPaste(event) {
        if (event && event.preventDefault) event.preventDefault();
        if (this.mode !== 'insert' || !this.editState) return false;
        this.editState.newAffiliation = null;
        this.editState.fields = this.editState.fields.filter((field) => field.rootType !== 'new');
        if (this.elements.pasteInput) this.elements.pasteInput.value = '';
        this.clearPasteError();
        this.applyModeUi();
        this.closeActiveField();
        this.renderPreview();
        this.updateFooterState();
        return true;
    }

    isDirty() {
        if (!this.editState) return false;
        if (this.mode === 'insert') return Boolean(this.editState.newAffiliation);
        return this.editState.fields.some((field) => {
            return field.rootType === 'existing' && field.value !== field.originalValue;
        });
    }

    updateFooterState() {
        if (!this.elements.updateButton) return;
        const dirty = this.isDirty();
        this.elements.updateButton.disabled = !dirty;
        this.elements.updateButton.classList.toggle('disabled', !dirty);
    }

    async handleFire(event) {
        if (event && event.preventDefault) event.preventDefault();
        try {
            if (!this.editState || !this.editState.affiliation ||
                !this.editState.affiliation.parentNode || this._activeFieldIndex !== null) {
                return false;
            }

            let changed = false;
            if (this.mode === 'edit') {
                this.editState.fields.forEach((field) => {
                    if (field.rootType !== 'existing') return;
                    if (field.value === field.originalValue) return;
                    if (this.affiliationDom.applyAffiliationFieldValue(
                        this.editState.affiliation,
                        field.path,
                        field.value
                    )) {
                        changed = true;
                    }
                });
            }

            if (this.mode === 'insert' && this.editState.newAffiliation) {
                const insertedAffiliation = this.editState.newAffiliation.cloneNode(true);
                insertedAffiliation.setAttribute('data-track-code', 'affiliation_dialog_01');
                insertedAffiliation.setAttribute('data-time', String(Date.now()));
                insertedAffiliation.setAttribute('data-username', USER_INFO.MAIL_ID);
                insertedAffiliation.setAttribute('data-rolename', USER_INFO.TRACK_ROLE_NAME);
                this.editState.affiliation.insertAdjacentElement(
                    'afterend',
                    insertedAffiliation
                );
                changed = true;
            }

            if (!changed) return false;
            if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION._SNAPSHOT) {
                IMPACT_SELECTION._SNAPSHOT({ save: true, unlock: true });
            }
            this.handleCancel();
            return true;
        } catch (error) {
            this.logError('handleFire', error);
            return false;
        }
    }

    handleCancel(event) {
        if (event && event.preventDefault) event.preventDefault();
        try {
            this.editState = null;
            this._pendingAffiliation = null;
            this._activeFieldIndex = null;
            this._eventsBound = false;
            this._boundPanel = null;
            this.closeDialog();
        } catch (error) {
            this.logError('handleCancel', error);
        }
    }

    resetDialog() {
        this.editState = null;
        this._pendingAffiliation = null;
        this.mode = 'edit';
        this._activeFieldIndex = null;
        this._eventsBound = false;
        this._boundPanel = null;
        if (this.elements.previewHost) this.elements.previewHost.replaceChildren();
        this.resetPasteState();
        this.applyModeUi();
        this.closeActiveField();
        this.updateFooterState();
    }
}

AddEditAffiliationModule.SELECTORS = {
    title: '.dia_header_text',
    editSection: '#aff_edit_field_section',
    addSection: '#aff_add_section',
    idleHint: '#aff_edit_idle_hint',
    editCollapse: '#aff_edit_collapse',
    activeLabel: '#aff_active_label',
    activeEditor: '#aff_active_editor',
    applyButton: '#aff_field_apply',
    revertButton: '#aff_field_revert',
    previewHost: '#aff_preview_host',
    pasteInput: '#aff_paste_input',
    stagePasteButton: '#aff_stage_paste',
    clearPasteButton: '#aff_clear_paste',
    pasteError: '#aff_paste_error',
    updateButton: '#fire_affiliation',
    cancelButton: '#cancel_affiliation'
};

export default AddEditAffiliationModule;
