import { buildInsertFnRadios, kindForUiType, isCuedUiType, nextFnInsertBody, summerHtmlToJats, countLiveTblFnXrefs, lastCiteRemovesNote, canInsertTblFnCite, tblFnLabelsFromSources, pickNextFnLabel, nextProbabilityLabel, probabilityLabelChoices, applySplitFnParagraphs, wrapBareTblFnStarXrefs, htmlToPlain } from './insert_fn_radios.js';

/* <div class="mDialog ds-none wo-editor-access" id="NotesGroupDialog"> */
class TableNotesModule extends BaseModule {
    constructor(name, errorTracker, options = {}) {
        super(name, errorTracker, options);
        this.initializeProperties();
        this.bindMethods();
        this.initiated = true;
    }
    initializeProperties() {
        this.templateList = {};
        this.canUnmountComponentWhileClose = true;
        this.formatter = new RangeFormatter({});
        this.TOASTER_MESSAGE = {};
        this._dialogMode = 'citeInsert';
        this._supportingFiles = [{
            name: 'messages',
            type: 'onthefly',
            when: 'initLoop',
            path: './tables/messages.json',
            variable: 'TABLE_NOTES_MESSAGES'
        }];
        this._state = {
            text_limit: { min: 25, max: 75 },
            templateList: {
                item: `<div class="row list-item" data-id="{{id}}">
                    <div class="col-2 col-md-1 checkbox-col"><input type="checkbox" class="custom-checkbox tbl-note" id="{{id}}"></div>
                    <div class="col-2 col-md-1"><div class="note-label">{{label}}</div></div>
                    <div class="col-8 col-md-10"><div class="text-content">{{content}}</div></div></div>
                </div>`,
                sup_a: `<a class="xref" data-name="xref" data-role="table-fn" ref-type="table-fn" rid="{{rid}}" href="#{{rid}}"><sup class="sup" data-name="sup">{{lab}}</sup></a>`
            }
        };
    }

    bindMethods() {
        const methodsToBind = [
            'AssignVar_EventLoop', 'initLoop', 'showLoop', 'fireDelete', 'fireInsert', 'fireRenumber', 'closeModule', 'bindCheckboxEvents', 'insertCitation', 'createCitation', 'deleteCiteAtCaret'
        ];
        methodsToBind.forEach(method => {
            if (this[method]) this[method] = this[method].bind(this);
        });
    }

    initLoop() {
        try {
            this.AutoInitiated = true;
            this.FullyLoaded = true;

            this._note_collection = {};
            this._cite_collection = [];
            this.ensureTblFnMessages();
            this.setupSummerNote();
        } catch (err) {
            this.trackError('InitLoop', err);
        }
    }

    showLoop() {
        try {

            if (!this.trackManager) this.trackManager = window._trackManager;

            this._note_collection = {};
            this._cite_collection = [];

            this._IMS = IMPACT_SELECTION || {};
            this._EC = EDITOR_CURSOR || {};
            this._dialogMode = this._dialogMode || 'citeInsert';
            // Edit Citation: seed/wrap frozen in executeCommand — do not replace with post-focus IMS.
            if (this._dialogMode === 'citeEdit') {
                if (!this._editCiteSeedAtOpen) this.captureEditCiteSelection({});
                const frozen = this._editCiteSeedAtOpen
                    || this._editCiteCellAtOpen
                    || this._editCiteTableWrap;
                this._insertAnchor = frozen || null;
                if (this._editCiteTableWrap) this._TABLE_WRAP = this._editCiteTableWrap;
            } else {
                this.clearEditCiteSelectionSnapshot();
                if (this._dialogMode !== 'citeInsert' || !this._insertAnchor) {
                    this._insertAnchor = (this._IMS.NODE && this._IMS.NODE.$) || null;
                    if (this._insertAnchor && this._insertAnchor.nodeType === 3) {
                        this._insertAnchor = this._insertAnchor.parentElement;
                    }
                }
            }

            const paint = () => {
                this.AssignVar_EventLoop();
                this.applyDialogMode();
                this.getNotesCollection();
                // Force full citeEdit refill each open from the frozen cluster (rid → data-id).
                if (this._dialogMode === 'citeEdit' && this.elements.FLOATS_GROUP) {
                    $(this.elements.FLOATS_GROUP).find('.custom-checkbox.tbl-note').prop('checked', false);
                    $(this.elements.FLOATS_GROUP).find('.list-item').removeClass('bg-light');
                    this._cite_collection = [];
                    if (this.elements.INPUT_BOX) this.elements.INPUT_BOX.value = '';
                }
                this.preselectCurrentCite();
                if (this._dialogMode === 'insertNew') {
                    this._lastInsertUiType = '';
                    this.setupTableFnSummerNote();
                    this.populateNewFnForm();
                }
                if (this._dialogMode === 'deleteFn') this.populateDeletePreview();
            };
            const ready = this.ensureTblFnMessages();
            if (ready && typeof ready.then === 'function') {
                ready.then(paint).catch(paint);
            } else {
                paint();
            }

        } catch (err) {
            this.trackError('ShowLoop', err);
        }
    }
    AssignVar_EventLoop() {
        try {
            const KEY_WITH_ID = {
                PANEL_BODY: ".dialog-body",
                PANEL_FOOTER: ".dialog-footer",
                PANEL_HEADER: ".dialog-header",
                PANEL_CONTENT: ".dialog-content",
                FLOATS_GROUP: ".float-list-group",
                INSERT_BTN: "#insert_tblnote",
                INPUT_BOX: "#tbl_note_fn_cite",
                TITLE: "#tblnote_dialog_title",
                CITE_PANEL: ".tbl-fn-cite-panel",
                NEW_PANEL: ".tbl-fn-new-panel",
                DEL_PANEL: ".tbl-fn-delete-panel",
                TYPE_SEL: "#tbl_fn_radios",
                LABEL_SEL: "#tbl_fn_label",
                LABEL_WRAP: "#tbl_fn_label_wrap",
                LABEL_WARN: "#tbl_fn_label_warn",
                BODY: "#tbl_fn_body",
                DEL_PREVIEW: "#tbl_fn_delete_preview"
            };
            Object.entries(KEY_WITH_ID).forEach(([key, value]) => {
                this.elements[key] = this.Panel.querySelector(value);
            });
            if (this.elements.INSERT_BTN) {
                const self = this;
                this.elements.INSERT_BTN.onclick = function (evt) {
                    if (evt && evt.preventDefault) evt.preventDefault();
                    const btn = self.elements.INSERT_BTN;
                    if (btn && (btn.disabled || btn.classList.contains('disabled'))) return;
                    if (self.isInsertNewUi()) self.fireInsertNew();
                    else self.firePrimary();
                };
            }
            if (this.elements.TYPE_SEL) {
                this.elements.TYPE_SEL.onchange = this.populateNewFnForm.bind(this);
            }
            if (this.elements.LABEL_SEL) {
                this.elements.LABEL_SEL.onchange = this.validateNewLabel.bind(this);
            }

            this.summernote_selector = "#tbl_fn_body";
            if (this._summernote) this._summernote.bindTarget(this.elements.BODY || this.summernote_selector);

            this.bindCheckboxEvents();
        } catch (err) {
            this.trackError('AssignVar_EventLoop', err);
        }
    }
    applyDialogMode() {
        const mode = this._dialogMode;
        const isCite = mode === 'citeInsert' || mode === 'citeDelete' || mode === 'citeEdit';
        const titleKeys = {
            citeInsert: 'tblFnCiteTitle',
            citeDelete: 'tblFnCiteDeleteTitle',
            citeEdit: 'tblFnCiteEditTitle',
            insertNew: 'tblFnNewTitle',
            deleteFn: 'tblFnDeleteTitle'
        };
        const btnKeys = {
            citeInsert: 'insert',
            citeDelete: 'delete',
            citeEdit: 'modify',
            insertNew: 'insert',
            deleteFn: 'delete'
        };
        if (this.elements.CITE_PANEL) this.elements.CITE_PANEL.classList.toggle('ds-none', !isCite);
        if (this.elements.NEW_PANEL) this.elements.NEW_PANEL.classList.toggle('ds-none', mode !== 'insertNew');
        if (this.elements.DEL_PANEL) this.elements.DEL_PANEL.classList.toggle('ds-none', mode !== 'deleteFn');
        if (this.elements.INSERT_BTN) {
            const lab = this.moduleMsg('labels.' + btnKeys[mode], {}, btnKeys[mode]);
            this.elements.INSERT_BTN.textContent = lab;
            this.elements.INSERT_BTN.setAttribute('title', lab);
            this.elements.INSERT_BTN.setAttribute('data-lang-lab', btnKeys[mode]);
        }
        this.syncCiteEditModifyBtn({ opened: mode === 'citeEdit' });
        if (typeof this.setAllLabels === 'function') this.setAllLabels();
        if (this.elements.TITLE) {
            this.elements.TITLE.setAttribute('data-lang-lab', titleKeys[mode] || 'tblFnDialogTitle');
            const fallback = mode === 'insertNew' ? 'Insert Table Footnote' : this.elements.TITLE.textContent;
            this.elements.TITLE.textContent = this.moduleMsg('labels.' + titleKeys[mode], {}, fallback);
        }
        if (mode === 'insertNew') this.ensureTypeOptions();
    }
    ensureTblFnMessages() {
        try {
            if (typeof window !== 'undefined' && window.TABLE_NOTES_MESSAGES && typeof window.TABLE_NOTES_MESSAGES === 'object') {
                this._moduleMessages = window.TABLE_NOTES_MESSAGES;
                if (window.TablesMethodsGroup && typeof window.TablesMethodsGroup.applyCommandLabelsFromMessages === 'function') {
                    window.TablesMethodsGroup.applyCommandLabelsFromMessages();
                }
                return Promise.resolve(window.TABLE_NOTES_MESSAGES);
            }
            const file = (this._supportingFiles && this._supportingFiles[0]) || {
                name: 'messages',
                path: './tables/messages.json',
                variable: 'TABLE_NOTES_MESSAGES'
            };
            if (typeof window !== 'undefined' && window.ContextHelpers && typeof window.ContextHelpers.loadModuleResource === 'function') {
                return window.ContextHelpers.loadModuleResource(file, this).then((data) => {
                    if (window.TablesMethodsGroup && typeof window.TablesMethodsGroup.applyCommandLabelsFromMessages === 'function') {
                        window.TablesMethodsGroup.applyCommandLabelsFromMessages();
                    }
                    return data;
                });
            }
        } catch (err) {
            this.trackError('ensureTblFnMessages', err);
        }
        return Promise.resolve(null);
    }
    tblFnLabelBag() {
        try {
            if (typeof window !== 'undefined' && window.TABLE_NOTES_MESSAGES) {
                this._moduleMessages = this._moduleMessages || window.TABLE_NOTES_MESSAGES;
            }
        } catch (err) { /* ignore */ }
        const fromJson = (this.getLangBag && this.getLangBag().labels) || {};
        return tblFnLabelsFromSources(fromJson, typeof window !== 'undefined' ? window.TABLE_NOTES_MESSAGES : null);
    }
    wrapfooterConfig() {
        try {
            const fromScope = (typeof iREF_SCOPE !== 'undefined' && iREF_SCOPE.Table && iREF_SCOPE.Table.wrapfooter) || null;
            if (fromScope && typeof fromScope === 'object' && (fromScope.show != null || fromScope.ins_note != null || fromScope.ins_footnote != null || fromScope.ins_abbrev != null || fromScope.ins_source != null || fromScope.ins_probability != null || fromScope.designators)) {
                return fromScope;
            }
        } catch (err) { /* no wrapfooter */ }
        try {
            const jc = (typeof J_CONFIG !== 'undefined' && J_CONFIG && J_CONFIG.Table && J_CONFIG.Table.wrapfooter) || null;
            if (jc && typeof jc === 'object') return jc;
        } catch (err2) { /* no wrapfooter */ }
        return {};
    }
    setupSummerNote() {
        try {
            this.summernote_selector = "#tbl_fn_body";
            this._summernote = this._summernote || new SummernoteManager(this);
            this._summernote.bindTarget(this.summernote_selector);
            this.SUMMERNOTE_CONFIG = this._summernote.buildConfig();
        } catch (err) {
            this.trackError('setupSummerNote', err);
        }
    }
    setupTableFnSummerNote() {
        try {
            this.setupSummerNote();
            if (this._summernote) {
                this._summernote.bindTarget(this.elements.BODY || this.summernote_selector, { resetCache: true });
            }
            if (typeof $ !== 'undefined' && $.fn && $.fn.summernote && this.SUMMERNOTE_CONFIG) {
                $(this.summernote_selector).summernote(this.SUMMERNOTE_CONFIG);
            }
        } catch (err) {
            this.trackError('setupTableFnSummerNote', err);
        }
    }
    getCheckedUiType() {
        const host = this.elements.TYPE_SEL;
        const checked = host && host.querySelector('input[name="tbl_fn_type"]:checked');
        return (checked && checked.value) || '';
    }
    ensureTypeOptions() {
        let host = this.elements.TYPE_SEL;
        if (!host && this.Panel) {
            const newPanel = this.Panel.querySelector('.tbl-fn-new-panel');
            if (newPanel) {
                host = document.createElement('div');
                host.id = 'tbl_fn_radios';
                newPanel.insertBefore(host, newPanel.firstChild);
                this.elements.TYPE_SEL = host;
            }
        }
        if (!host) return;
        const radioLabels = this.tblFnLabelBag();
        const radios = buildInsertFnRadios(this.wrapfooterConfig(), radioLabels);
        const typeKey = { numeric: 'tblFnRadioNumeric', alpha: 'tblFnRadioAlpha', symbol: 'tblFnRadioSymbol', probability: 'tblFnRadioProbability', note: 'tblFnRadioNote', abbrev: 'tblFnRadioAbbrev', source: 'tblFnRadioSource' };
        const renderGroup = (items, name) => items.map((r) => (
            '<label class="mr-3"><input type="radio" name="' + name + '" value="' + r.value + '"> <span data-lang-lab="' + (typeKey[r.value] || '') + '">' + r.label + '</span></label>'
        )).join('');
        const kindNumbered = radioLabels.tblFnKindNumbered;
        const kindUnnumbered = radioLabels.tblFnKindUnnumbered;
        const fmtNumbered = radioLabels.tblFnFmtNumbered;
        const fmtUnnumbered = radioLabels.tblFnFmtUnnumbered;
        const kindTitle = radioLabels.tblFnType;
        const syncKindCards = function () {
            const cards = host.querySelectorAll('.tbl-fn-kind-card');
            for (let i = 0; i < cards.length; i++) {
                const inp = cards[i].querySelector('input[name="tbl_fn_kind"]');
                cards[i].classList.toggle('is-selected', !!(inp && inp.checked));
            }
        };
        let html = '';
        if (radios.numbered.length || radios.unnumbered.length) {
            html += '<div class="mb-2"><label class="tbl-fn-field-lab" data-lang-lab="tblFnType">' + kindTitle + '</label>';
            html += '<div class="tbl-fn-kind-cards">';
            html += '<label class="tbl-fn-kind-card"><input type="radio" name="tbl_fn_kind" value="numbered"> <span data-lang-lab="tblFnKindNumbered">' + kindNumbered + '</span></label>';
            html += '<label class="tbl-fn-kind-card"><input type="radio" name="tbl_fn_kind" value="unnumbered"> <span data-lang-lab="tblFnKindUnnumbered">' + kindUnnumbered + '</span></label>';
            html += '</div></div>';
            if (radios.numbered.length) {
                html += '<div class="mb-2 tbl-fn-fmt-numbered"><label class="tbl-fn-field-lab" data-lang-lab="tblFnFmtNumbered">' + fmtNumbered + '</label>' + renderGroup(radios.numbered, 'tbl_fn_type') + '</div>';
            }
            if (radios.unnumbered.length) {
                html += '<div class="mb-2 tbl-fn-fmt-unnumbered"><label class="tbl-fn-field-lab" data-lang-lab="tblFnFmtUnnumbered">' + fmtUnnumbered + '</label>' + renderGroup(radios.unnumbered, 'tbl_fn_type') + '</div>';
            }
        }
        host.innerHTML = html;
        const self = this;
        host.onchange = function (evt) {
            const t = evt && evt.target;
            if (t && t.name === 'tbl_fn_kind') {
                const numbered = t.value === 'numbered';
                const numBox = host.querySelector('.tbl-fn-fmt-numbered');
                const unBox = host.querySelector('.tbl-fn-fmt-unnumbered');
                if (numBox) numBox.classList.toggle('ds-none', !numbered);
                if (unBox) unBox.classList.toggle('ds-none', numbered);
                const first = host.querySelector((numbered ? '.tbl-fn-fmt-numbered' : '.tbl-fn-fmt-unnumbered') + ' input[name="tbl_fn_type"]');
                if (first) first.checked = true;
                syncKindCards();
            }
            self.populateNewFnForm();
        };
        const prefer = this._insertUiType || (radios.numbered[0] && radios.numbered[0].value) || (radios.unnumbered[0] && radios.unnumbered[0].value);
        const kind = kindForUiType(prefer, radios) || (radios.numbered.length ? 'numbered' : 'unnumbered');
        const kindInput = host.querySelector('input[name="tbl_fn_kind"][value="' + kind + '"]');
        if (kindInput) kindInput.checked = true;
        syncKindCards();
        const numBox = host.querySelector('.tbl-fn-fmt-numbered');
        const unBox = host.querySelector('.tbl-fn-fmt-unnumbered');
        if (numBox) numBox.classList.toggle('ds-none', kind !== 'numbered');
        if (unBox) unBox.classList.toggle('ds-none', kind !== 'unnumbered');
        const typeInput = host.querySelector('input[name="tbl_fn_type"][value="' + prefer + '"]') || host.querySelector((kind === 'numbered' ? '.tbl-fn-fmt-numbered' : '.tbl-fn-fmt-unnumbered') + ' input[name="tbl_fn_type"]');
        if (typeInput) typeInput.checked = true;
    }
    inferCuedDesignators() {
        const G = window.TablesMethodsGroup;
        const used = (this.usedLabels() || []).filter((lab) => !G.isProbabilityCue(lab));
        const cuedSymbols = ['\u2217', '\u2020', '\u2021', '\u00A7'];
        if (used.some((lab) => /^[a-z]$/.test(lab))) return 'alphabets';
        if (used.some((lab) => /^[A-Z]$/.test(lab))) return 'Alphabets';
        if (used.some((lab) => /^[0-9]+$/.test(lab))) return 'arabic';
        if (used.some((lab) => cuedSymbols.indexOf(String(lab)) !== -1)) return 'symbol_1';
        return 'alphabets';
    }
    bindCheckboxEvents() {
        try {
            const self = this;
            $(this.elements.FLOATS_GROUP).off('change.tblnote');
            $(this.elements.FLOATS_GROUP).on('change.tblnote', '.custom-checkbox.tbl-note', function () {
                const row = $(this).closest('.list-item');
                if (self._dialogMode === 'citeDelete') {
                    $(self.elements.FLOATS_GROUP).find('.custom-checkbox.tbl-note').not(this).prop('checked', false);
                    $(self.elements.FLOATS_GROUP).find('.list-item').removeClass('bg-light');
                }
                if ($(this).is(':checked')) {
                    row.addClass('bg-light');
                } else {
                    row.removeClass('bg-light');
                }
                self.updateCitationField();
                self.syncCiteEditModifyBtn();
            });
        } catch (err) {
            this.trackError('bindCheckboxEvents', err);
        }
    }
    selectedCiteRids() {
        const rids = [];
        try {
            if (!this.elements.FLOATS_GROUP) return rids;
            $(this.elements.FLOATS_GROUP).find('.custom-checkbox.tbl-note:checked').each(function () {
                const row = $(this).closest('.list-item');
                const id = row.attr('data-id');
                if (id) rids.push(id);
            });
        } catch (err) {
            this.trackError('selectedCiteRids', err);
        }
        return rids;
    }
    citeRidBaselineKey(rids) {
        return (rids || []).slice().sort().join(' ');
    }
    syncCiteEditModifyBtn(options = {}) {
        try {
            const btn = this.elements.INSERT_BTN;
            if (!btn) return;
            if (this._dialogMode !== 'citeEdit') {
                btn.disabled = false;
                btn.classList.remove('disabled');
                return;
            }
            if (options.opened) {
                btn.disabled = true;
                btn.classList.add('disabled');
                return;
            }
            const rids = this.selectedCiteRids();
            const dirty = this.citeRidBaselineKey(rids) !== (this._editCiteBaseline || '');
            const enable = rids.length > 0 && dirty;
            btn.disabled = !enable;
            btn.classList.toggle('disabled', !enable);
        } catch (err) {
            this.trackError('syncCiteEditModifyBtn', err);
        }
    }
    updateCitationField() {
        this._cite_collection = [];
        const self = this;
        try {
            const selectedLabels = [];

            $(this.elements.FLOATS_GROUP).find('.custom-checkbox.tbl-note:checked').each(function () {
                const row = $(this).closest('.list-item');
                const label = row.find('.note-label').text().trim();
                if (label) {
                    selectedLabels.push(label);
                    self.createCitation(row.attr("data-id"), label);
                }
            });
            const citationValue = selectedLabels.join(',');
            $(this.elements.INPUT_BOX).val(citationValue);
        } catch (err) {
            this.trackError('updateCitationField', err);
        }
    }
    cuedFnSelector() {
        return 'div.fn[data-label],div.fn[data-tbl-fn-label-type="alpha_lower"],div.fn[data-tbl-fn-label-type="alpha_upper"],div.fn[data-tbl-fn-label-type="number"],div.fn[data-tbl-fn-label-type="arabic_roman"],div.fn[data-tbl-fn-label-type="symbol"],div.fn[data-tbl-fn-label-type="probability"]';
    }
    getNotesCollection(returnCollection = false) {
        try {
            if (this.elements.FLOATS_GROUP) this.elements.FLOATS_GROUP.innerHTML = '';
            this._SELECTOR = this.cuedFnSelector();

            this._TABLE_WRAP = this.resolveTableWrap();
            if (!this._TABLE_WRAP) {
                this._note_dom_Collection = [];
                this._note_collection = {};
                return this._note_collection;
            }
            this._TABLE_ = this._TABLE_WRAP.querySelector("table");
            this._TABLE_BODY = this._TABLE_WRAP.querySelector(".table-body");
            this._TABLE_FOOT = this._TABLE_WRAP.querySelector(".table-wrap-foot");
            if (!this._TABLE_FOOT) {
                this._note_dom_Collection = [];
                return this._note_collection;
            }

            this._note_dom_Collection = window.TablesMethodsGroup.citeListFns(this._TABLE_WRAP);

            this._note_collection = {};
            this._note_dom_Collection.forEach((element, index) => {
                const label = element.getAttribute("data-label") || '';
                const p = element.querySelector(".p");
                const content = p ? p.textContent : '';
                const shortText = this.getShortenText(content);
                const htmlString = this.GetTemplate("item", {
                    id: element.id,
                    label,
                    content: shortText,
                    _template: this._state.templateList
                });
                this._note_collection[index] = htmlString.trim().replace(/\s+/g, ' ');
            });
            const combinedHTML = Object.values(this._note_collection).join("");

            if (returnCollection) {
                return this._note_collection;
            }

            if (this.elements.FLOATS_GROUP && combinedHTML) {
                const fragment = document.createRange().createContextualFragment(combinedHTML);
                this.elements.FLOATS_GROUP.appendChild(fragment);
            }

        } catch (err) {
            this.trackError('createNotesList', err);
        }
    }

    clearEditCiteSelectionSnapshot() {
        this._editCiteSeedAtOpen = null;
        this._editCiteCellAtOpen = null;
        this._editCiteTableWrap = null;
        this._editCiteCluster = [];
        this._editCiteBaseline = '';
    }

    /**
     * Native CKEditor selection on the edit-cite cluster (reference CheckCursorPosition parity).
     * Uses selectElement / selectRanges only — no CSS highlight classes.
     */
    selectEditCiteClusterInEditor(cluster) {
        try {
            const editor = this.editor
                || (typeof GlobalEditor !== 'undefined' ? GlobalEditor : null);
            if (!editor || typeof CKEDITOR === 'undefined' || !CKEDITOR.dom) return false;
            const Selection = editor.getSelection && editor.getSelection();
            if (!Selection) return false;
            const live = (Array.isArray(cluster) ? cluster : []).filter((el) => el && el.parentNode);
            if (!live.length) return false;

            if (live.length === 1) {
                Selection.selectElement(new CKEDITOR.dom.element(live[0]));
            } else {
                const first = new CKEDITOR.dom.element(live[0]);
                const last = new CKEDITOR.dom.element(live[live.length - 1]);
                const range = editor.createRange();
                range.setStartBefore(first);
                range.setEndAfter(last);
                Selection.selectRanges([range]);
            }
            if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION.getInfo) {
                IMPACT_SELECTION.getInfo(editor, { lock: false });
            }
            return true;
        } catch (err) {
            this.trackError('selectEditCiteClusterInEditor', err);
            return false;
        }
    }

    /**
     * Reference-style capture before dialog opens (like CheckCursorPosition in showBefore).
     * Id-only: prefer menu params.element xref/rid; freeze table-wrap from seed.
     * Expands native CK selection onto the frozen cluster.
     */
    captureEditCiteSelection(params = {}) {
        try {
            const G = window.TablesMethodsGroup;
            if (!G || !G.resolveEditCiteSeed) {
                this.clearEditCiteSelectionSnapshot();
                return null;
            }
            const editor = this.editor
                || (typeof GlobalEditor !== 'undefined' ? GlobalEditor : null);
            const ckElement = params.element || null;
            const element = ckElement && (ckElement.$ || ckElement);
            const imsNode = (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION.NODE)
                ? (IMPACT_SELECTION.NODE.$ || IMPACT_SELECTION.NODE)
                : null;
            // Prefer context-menu element cell so a broad IMS th/td does not block the xref.
            const elementCell = G.citeAnchorCell(element);
            const imsCell = G.citeAnchorCell(imsNode);
            const requireCell = elementCell || imsCell;
            const pointerEl = this._lastPointerEl || null;
            let seed = G.resolveEditCiteSeed({
                element,
                ckElement,
                imsNode,
                editor,
                pointerEl,
                requireCell: elementCell || null
            });
            if (!seed) {
                seed = G.resolveEditCiteSeed({
                    element,
                    ckElement,
                    imsNode,
                    editor,
                    pointerEl,
                    requireCell
                });
            }
            this._editCiteSeedAtOpen = seed || null;
            this._editCiteCellAtOpen = seed
                ? G.citeAnchorCell(seed)
                : requireCell;
            this._editCiteTableWrap = (seed && seed.closest)
                ? seed.closest('.table-wrap')
                : (this._editCiteCellAtOpen && this._editCiteCellAtOpen.closest
                    ? this._editCiteCellAtOpen.closest('.table-wrap')
                    : null);
            if (this._editCiteTableWrap) this._TABLE_WRAP = this._editCiteTableWrap;
            this._editCiteCluster = seed && G.collectAdjacentTblFnXrefs
                ? G.collectAdjacentTblFnXrefs(seed)
                : (seed ? [seed] : []);
            if (this._editCiteCluster.length) {
                this.selectEditCiteClusterInEditor(this._editCiteCluster);
            }
            return seed;
        } catch (err) {
            this.trackError('captureEditCiteSelection', err);
            this.clearEditCiteSelectionSnapshot();
            return null;
        }
    }

    preselectCurrentCite() {
        try {
            if (this._dialogMode !== 'citeEdit' || !this.elements.FLOATS_GROUP) {
                this.syncCiteEditModifyBtn({ opened: true });
                return;
            }
            const G = window.TablesMethodsGroup;
            if (!G) return;
            const editor = this.editor || (typeof GlobalEditor !== 'undefined' ? GlobalEditor : null);
            // Id-only: prefer frozen seed/cluster rids from capture (menu element), not post-focus IMS.
            let seed = this._editCiteSeedAtOpen || null;
            if (!seed || !seed.getAttribute) {
                const caret = this.editCiteCaretNode();
                seed = G.resolveEditCiteSeed
                    ? G.resolveEditCiteSeed({
                        element: caret,
                        imsNode: this._IMS && this._IMS.NODE && (this._IMS.NODE.$ || this._IMS.NODE),
                        editor,
                        pointerEl: this._lastPointerEl,
                        requireCell: this._editCiteCellAtOpen || G.citeAnchorCell(caret)
                    })
                    : (G.resolveTblFnXref
                        ? G.resolveTblFnXref(caret, null, editor)
                        : G.isTblFnXref(caret));
            }
            let cluster = Array.isArray(this._editCiteCluster)
                ? this._editCiteCluster.filter((el) => el && el.getAttribute)
                : [];
            if (!cluster.length && seed) {
                cluster = G.collectAdjacentTblFnXrefs && seed.parentNode
                    ? G.collectAdjacentTblFnXrefs(seed)
                    : [seed];
            }
            if (!cluster.length) {
                this._editCiteCluster = [];
                this._editCiteBaseline = '';
                $(this.elements.FLOATS_GROUP).find('.custom-checkbox.tbl-note').prop('checked', false);
                $(this.elements.FLOATS_GROUP).find('.list-item').removeClass('bg-light');
                this._cite_collection = [];
                if (this.elements.INPUT_BOX) this.elements.INPUT_BOX.value = '';
                this.syncCiteEditModifyBtn({ opened: true });
                return;
            }
            this._editCiteCluster = cluster;
            if (seed) this._editCiteSeedAtOpen = seed;
            if (!this._editCiteCellAtOpen && seed && G.citeAnchorCell) {
                this._editCiteCellAtOpen = G.citeAnchorCell(seed);
            }
            $(this.elements.FLOATS_GROUP).find('.custom-checkbox.tbl-note').prop('checked', false);
            $(this.elements.FLOATS_GROUP).find('.list-item').removeClass('bg-light');
            this._cite_collection = [];
            const selectedLabels = [];
            const baselineRids = [];
            const wrap = this._editCiteTableWrap || this._TABLE_WRAP;
            cluster.forEach((xref) => {
                const rid = xref && xref.getAttribute && xref.getAttribute('rid');
                if (!rid) return;
                baselineRids.push(rid);
                const row = this.elements.FLOATS_GROUP.querySelector('.list-item[data-id="' + rid + '"]');
                const cb = row && row.querySelector('.custom-checkbox.tbl-note');
                if (!cb) return;
                cb.checked = true;
                row.classList.add('bg-light');
                // Prefer live note data-label for this rid (id-stable), fallback to list label.
                const fn = wrap && wrap.querySelector
                    ? wrap.querySelector('.fn[id="' + rid + '"]')
                    : null;
                const label = (fn && fn.getAttribute('data-label'))
                    || ((row.querySelector('.note-label') && row.querySelector('.note-label').textContent) || '').trim();
                if (label) {
                    selectedLabels.push(label);
                    this.createCitation(rid, label);
                }
            });
            if (this.elements.INPUT_BOX) this.elements.INPUT_BOX.value = selectedLabels.join(',');
            this._editCiteBaseline = this.citeRidBaselineKey(baselineRids);
            this.syncCiteEditModifyBtn({ opened: true });
        } catch (err) {
            this.trackError('preselectCurrentCite', err);
        }
    }

    usedLabels() {
        const foot = this._TABLE_WRAP && this._TABLE_WRAP.querySelector('.table-wrap-foot');
        const els = foot
            ? Array.from(foot.querySelectorAll('.fn'))
            : (this._note_dom_Collection || []);
        return els.map((el) => {
            if (!el || !el.getAttribute) return '';
            return el.getAttribute('data-label') || el.getAttribute('data-del-label') || '';
        }).filter(Boolean);
    }

    labelChoices(uiType) {
        if (uiType === 'probability') return probabilityLabelChoices(this.usedLabels());
        const { wrapfooter } = (typeof iREF_SCOPE !== 'undefined' && iREF_SCOPE && iREF_SCOPE.Table) || {};
        let designators = wrapfooter && wrapfooter.designators;
        if (!designators) designators = this.inferCuedDesignators();
        const order = window.TablesMethodsGroup._getCurrentOrder({ designators: designators });
        return (order || []).map(String).filter((lab) => !window.TablesMethodsGroup.isProbabilityCue(lab));
    }

    populateNewFnForm() {
        try {
            const uiType = this.getCheckedUiType() || 'note';
            if (this.elements.LABEL_WRAP) this.elements.LABEL_WRAP.classList.add('ds-none');
            const used = this.usedLabels();
            const choices = this.labelChoices(uiType);
            const sel = this.elements.LABEL_SEL;
            if (sel) {
                sel.innerHTML = '';
                choices.forEach((lab) => {
                    const opt = document.createElement('option');
                    opt.value = lab;
                    opt.textContent = lab;
                    if (used.indexOf(lab) !== -1) opt.disabled = true;
                    sel.appendChild(opt);
                });
                const next = pickNextFnLabel(choices, used);
                if (next) sel.value = next;
            }
            const typeChanged = this._lastInsertUiType !== uiType;
            this._lastInsertUiType = uiType;
            if (typeChanged) {
                const current = this.getSummerNoteContent();
                const nextBody = nextFnInsertBody(uiType, current);
                if (nextBody != null) {
                    this.setSummerNoteContent(nextBody);
                }
            }
            this.validateNewLabel();
        } catch (err) {
            this.trackError('populateNewFnForm', err);
        }
    }

    validateNewLabel() {
        const warn = this.elements.LABEL_WARN;
        const sel = this.elements.LABEL_SEL;
        const typeEl = this.elements.TYPE_SEL;
        if (!warn || !sel || !typeEl) return true;
        const uiType = this.getCheckedUiType();
        if (!isCuedUiType(uiType)) {
            warn.classList.add('ds-none');
            return true;
        }
        const used = this.usedLabels();
        const val = sel.value;
        const next = pickNextFnLabel(this.labelChoices(uiType), used);
        if (used.indexOf(val) !== -1) {
            warn.textContent = this.moduleMsg('runtime.labelInUse', { next: next }, 'Label already used.');
            if (next) {
                sel.value = next;
                warn.classList.add('ds-none');
                return true;
            }
            warn.classList.remove('ds-none');
            return false;
        }
        warn.classList.add('ds-none');
        return true;
    }

    caretNode() {
        const live = this._IMS && this._IMS.NODE && this._IMS.NODE.$;
        const pointer = this._lastPointerEl;
        const G = window.TablesMethodsGroup;
        const fromPointer = G && G.isTblFnXref ? G.isTblFnXref(pointer) : null;
        if (fromPointer && this._TABLE_WRAP && this._TABLE_WRAP.contains(fromPointer)) return fromPointer;
        const fromLive = G && G.isTblFnXref ? G.isTblFnXref(live) : null;
        if (fromLive && this._TABLE_WRAP && this._TABLE_WRAP.contains(fromLive)) return fromLive;
        if (live && this._TABLE_WRAP && live.closest && this._TABLE_WRAP.contains(live)) return live;
        if (live) return live;
        if (pointer) return pointer;
        return this._insertAnchor || null;
    }

    /**
     * Edit Citation caret: live selection first (reference CheckCursorPosition),
     * then frozen open seed, then same-cell pointer only.
     */
    editCiteCaretNode() {
        const wrap = this._TABLE_WRAP;
        const live = this._IMS && this._IMS.NODE && this._IMS.NODE.$;
        const G = window.TablesMethodsGroup;
        const cellOf = (n) => (G && G.citeAnchorCell ? G.citeAnchorCell(n) : null);
        const constrainCell = this._editCiteCellAtOpen;

        if (live && wrap && wrap.contains && wrap.contains(live)) {
            const inXref = G && G.isTblFnXref ? (G.isTblFnXref(live) || (G.tblFnXrefFromCommaCaret && G.tblFnXrefFromCommaCaret(live))) : null;
            if (inXref && wrap.contains(inXref)) {
                if (constrainCell) {
                    const c = cellOf(inXref);
                    if (c && c !== constrainCell) {
                        /* live moved to another cell — prefer frozen seed below */
                    } else {
                        return inXref;
                    }
                } else {
                    return inXref;
                }
            }
            if (!constrainCell || cellOf(live) === constrainCell) return live;
        }
        if (this._editCiteSeedAtOpen && this._editCiteSeedAtOpen.parentNode) {
            return this._editCiteSeedAtOpen;
        }
        const pointer = this._lastPointerEl;
        const ptrXref = G && G.isTblFnXref ? G.isTblFnXref(pointer) : null;
        const liveCell = cellOf(live) || constrainCell;
        if (ptrXref && liveCell && cellOf(ptrXref) === liveCell) return ptrXref;
        if (ptrXref && !live && constrainCell && cellOf(ptrXref) === constrainCell) return ptrXref;
        if (live) return live;
        return this._insertAnchor || null;
    }

    /** Live selection for letter-slot insert; avoids sticky xref from last pointer click. */
    slotCaretNode(tableWrap) {
        const wrap = tableWrap || this._TABLE_WRAP;
        const live = this._IMS && this._IMS.NODE && this._IMS.NODE.$;
        const G = window.TablesMethodsGroup;
        if (live && wrap && wrap.contains && wrap.contains(live)) {
            const inXref = G && G.isTblFnXref ? G.isTblFnXref(live) : null;
            if (inXref && wrap.contains(inXref)) return inXref;
            return live;
        }
        return this.caretNode();
    }

    focusCiteCaret() {
        const node = this.caretNode();
        if (!node || !this.editor) return false;
        try {
            let el = node.nodeType === 3 ? node.parentElement : node;
            if (!el) return false;
            const ck = new CKEDITOR.dom.element(el);
            const range = this.editor.createRange();
            range.moveToPosition(ck, CKEDITOR.POSITION_BEFORE_END);
            this.editor.getSelection().selectRanges([range]);
            return true;
        } catch (err) {
            return false;
        }
    }

    updateCaretAlert() {
        return true;
    }

    populateDeletePreview() {
        try {
            const node = this.caretNode();
            const fn = node && node.closest && node.closest('.fn');
            this._deleteFnEl = fn;
            const box = this.elements.DEL_PREVIEW;
            if (!box) return;
            if (!fn) {
                box.textContent = '';
                return;
            }
            const label = fn.getAttribute('data-label') || window.TablesMethodsGroup.classifyFnEl(fn);
            const p = fn.querySelector('.p');
            box.textContent = (label ? label + ' — ' : '') + (p ? p.textContent.trim() : '');
        } catch (err) {
            this.trackError('populateDeletePreview', err);
        }
    }

    createCitation(id, lab) {
        const xref = this.GetTemplate("sup_a", {
            rid: id,
            lab: lab,
            _template: this._state.templateList
        });

        this._cite_collection.push(xref);
    }

    handleEditorEvents(evt) {
        try {
            const data = evt && evt.data;
            let target = null;
            if (data && typeof data.getTarget === 'function') {
                const ck = data.getTarget();
                target = ck && (ck.$ || ck);
            }
            if (!target && data && data.$ && data.$.target) target = data.$.target;
            if (!target && evt && evt.target) target = evt.target;
            if (target && target.nodeType === 3) target = target.parentElement;
            if (target && target.nodeType === 1) this._lastPointerEl = target;
        } catch (ptrErr) { /* keep previous pointer */ }
        if (this.state === 1) {
            const tempTable = this._IMS.NODE && this._IMS.NODE.$ && this._IMS.NODE.$.closest(".table-wrap");
            const isDifferentTable = tempTable && tempTable !== this._TABLE_WRAP;

            if (!tempTable || isDifferentTable) {
                this._cite_collection = [];
                this._note_collection = {};
                if (this.elements.INPUT_BOX) $(this.elements.INPUT_BOX).val("");
                if (this.elements.FLOATS_GROUP) $(this.elements.FLOATS_GROUP).empty();

                if (isDifferentTable) {
                    this.getNotesCollection();
                }
            }
        }
    }

    insertCitation() {
        const editor = this.editor;
        if (editor && editor.insertHtml) {
            const parts = [];
            this._cite_collection.forEach((template, idx, arr) => {
                if (!template) return;
                parts.push(template);
                if (idx < arr.length - 1) parts.push('<sup>,</sup>');
            });
            if (parts.length) editor.insertHtml(parts.join(''));
            return;
        }
        let lastInserted = null;
        this.focusCiteCaret();

        this._cite_collection.forEach((template, idx, arr) => {

            if (!template) return;

            const element = CKEDITOR.dom.element.createFromHtml(template);

            if (lastInserted) {
                element.insertAfter(lastInserted);
            } else {
                const raw = this._insertAnchor && this._insertAnchor.nodeType === 3
                    ? this._insertAnchor.parentElement
                    : this._insertAnchor;
                const cell = raw && raw.closest ? (raw.closest('td,th,.caption') || raw) : raw;
                if (cell && this.editor) {
                    try {
                        const ck = new CKEDITOR.dom.element(cell);
                        ck.append(element);
                        lastInserted = element;
                    } catch (err) {
                        lastInserted = null;
                    }
                }
                if (!lastInserted && this.editor) {
                    this.editor.insertElement(element);
                    lastInserted = element;
                }
            }

            if (idx < arr.length - 1 && lastInserted) {
                const commaSup = CKEDITOR.dom.element.createFromHtml('<sup>,</sup>');
                commaSup.insertAfter(lastInserted);
                lastInserted = commaSup;
            }

        });
    }

    requireCiteCaret() {
        return window.TablesMethodsGroup.isCiteTarget(this.caretNode(), this._TABLE_WRAP);
    }

    isInsertNewUi() {
        if (this._dialogMode === 'insertNew') return true;
        const panel = this.elements.NEW_PANEL;
        return !!(panel && !panel.classList.contains('ds-none'));
    }

    resolveTableWrap() {
        const unwrap = (n) => {
            if (!n) return null;
            if (n.$) n = n.$;
            if (n.nodeType === 3) return n.parentElement;
            return n.nodeType === 1 ? n : null;
        };
        const closestWrap = (n) => {
            const el = unwrap(n);
            if (!el) return null;
            if (el.classList && el.classList.contains('table-wrap')) return el;
            if (el.closest) return el.closest('.table-wrap');
            return null;
        };
        // Frozen wrap first. Do not use a leftover _TABLE_WRAP or the first table in the document.
        const found = closestWrap(this._editCiteTableWrap)
            || closestWrap(this._editCiteSeedAtOpen)
            || closestWrap(this._editCiteCellAtOpen)
            || closestWrap(this._insertAnchor)
            || closestWrap(this.caretNode())
            || closestWrap(this._IMS && this._IMS.NODE && (this._IMS.NODE.$ || this._IMS.NODE));
        if (found) {
            wrapBareTblFnStarXrefs(found);
            return found;
        }
        return null;
    }

    firePrimary() {
        if (this._dialogMode === 'citeDelete') return this.fireCiteDelete();
        if (this._dialogMode === 'citeEdit') return this.fireCiteEdit();
        if (this.isInsertNewUi()) return this.fireInsertNew();
        if (this._dialogMode === 'deleteFn') return this.fireDeleteFn();
        return this.fireInsert();
    }

    _lockCiteSnapshot() {
        const g = this.editor || (typeof GlobalEditor !== 'undefined' ? GlobalEditor : null);
        if (window.TablesMethodsGroup && typeof TablesMethodsGroup.lockTblFnSnapshot === 'function') {
            TablesMethodsGroup.lockTblFnSnapshot(g);
            return;
        }
        if (g && g.fire) {
            g.fire('saveSnapshot');
            g.fire('lockSnapshot', { dontUpdate: true });
        } else if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION._SNAPSHOT) {
            IMPACT_SELECTION._SNAPSHOT({ lock: true, save: true });
        } else if (this._SNAPSHOT) {
            this._SNAPSHOT({ save: true, lock: true });
        }
    }

    _unlockCiteSnapshot() {
        const g = this.editor || (typeof GlobalEditor !== 'undefined' ? GlobalEditor : null);
        if (window.TablesMethodsGroup && typeof TablesMethodsGroup.unlockTblFnSnapshot === 'function') {
            TablesMethodsGroup.unlockTblFnSnapshot(g);
            return;
        }
        if (g && g.undoManager) {
            let n = 0;
            while (g.undoManager.locked && n < 12) {
                g.fire('unlockSnapshot');
                n += 1;
            }
            g.fire('saveSnapshot');
            if (g.undoManager.refreshState) g.undoManager.refreshState();
        } else if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION._SNAPSHOT) {
            IMPACT_SELECTION._SNAPSHOT({ unlock: true, save: true });
        } else if (this._SNAPSHOT) {
            this._SNAPSHOT({ save: true, unlock: true });
        }
    }

    fireInsert() {
        if (this.isInsertNewUi()) return this.fireInsertNew();
        const ge = typeof GlobalEditor !== 'undefined' ? GlobalEditor : this.editor;
        if (ge && typeof ge.focus === 'function') ge.focus();
        this.focusCiteCaret();
        this._lockCiteSnapshot();
        try {
            if (!this.requireCiteCaret()) {
                TOASTER_ALERT('empty_content', { type: 'warning' });
                return;
            }
            if (!this._cite_collection || !Array.isArray(this._cite_collection) || this._cite_collection.length === 0) {
                console.warn('No citation templates to insert.');
                TOASTER_ALERT('empty_content', {
                    type: 'warning'
                });
                return;
            }

            this.insertCitation();
            const { pattern } = TablesMethodsGroup.getNewId(this._TABLE_WRAP, this._note_dom_Collection);
            TablesMethodsGroup.handleRenumbering(this._TABLE_WRAP, pattern);

            this.closeModule();
            if (typeof TOASTER_ALERT === 'function') TOASTER_ALERT('CITE_INSERT_COMMON');

        } catch (err) {
            this.trackError(' fireInsert', err);
        } finally {
            this._unlockCiteSnapshot();
        }
    }

    fireCiteDelete() {
        return this.deleteCiteAtCaret({ closeDialog: true });
    }

    async deleteCiteAtCaret(options = {}) {
        const closeDialog = !!options.closeDialog;
        this._lockCiteSnapshot();
        try {
            const node = this.caretNode();
            const editor = this.editor || (typeof GlobalEditor !== 'undefined' ? GlobalEditor : null);
            const G = window.TablesMethodsGroup;
            let xref = G && G.resolveTblFnXref
                ? G.resolveTblFnXref(node, null, editor)
                : (G && G.isTblFnXref(node));
            if ((!xref || !xref.parentNode) && this._editCiteSeedAtOpen && this._editCiteSeedAtOpen.parentNode) {
                xref = this._editCiteSeedAtOpen;
            }
            if (!xref) {
                TOASTER_ALERT('empty_content', { type: 'warning' });
                return;
            }
            const tableWrap = (xref.closest && xref.closest('.table-wrap'))
                || this._editCiteTableWrap
                || this._TABLE_WRAP;
            const id = xref.getAttribute && xref.getAttribute('rid');
            if (!tableWrap || !id) {
                TOASTER_ALERT('empty_content', { type: 'warning' });
                return;
            }
            const liveCount = countLiveTblFnXrefs(tableWrap, id);
            const fnEntry = tableWrap.querySelector('.fn[id="' + id + '"]');
            const label = (fnEntry && fnEntry.getAttribute('data-label')) || '';
            const wasProbability = fnEntry && TablesMethodsGroup.isProbabilityFn
                ? TablesMethodsGroup.isProbabilityFn(fnEntry)
                : TablesMethodsGroup.isProbabilityCue(label);
            if (lastCiteRemovesNote(liveCount)) {
                const msg = this.moduleMsg('runtime.lastCiteConfirm', { label: label }, 'Delete the footnote as well?');
                let ok = false;
                if (typeof IMPACT_ALERT === 'function') {
                    ok = await IMPACT_ALERT('xrefsdel005', {
                        replace: label,
                        s_text: wasProbability ? 'text' : 're_num'
                    });
                } else {
                    ok = window.confirm(msg);
                }
                if (!ok) return;
            }
            G.RemoveItem(tableWrap, fnEntry, xref, liveCount > 1);
            if (!wasProbability && lastCiteRemovesNote(liveCount) && TablesMethodsGroup.shiftLabelsAfterDelete) {
                TablesMethodsGroup.shiftLabelsAfterDelete(tableWrap, label);
            }
            if (closeDialog) this.closeModule();
        } catch (err) {
            this.trackError('deleteCiteAtCaret', err);
        } finally {
            this._unlockCiteSnapshot();
        }
    }

    /**
     * Selected note ids from the cite-edit list (id-only), labels from live fn data-label.
     */
    selectedCiteEditNoteIds() {
        const ids = [];
        const group = this.elements.FLOATS_GROUP;
        if (!group) return ids;
        $(group).find('.custom-checkbox.tbl-note:checked').each(function () {
            const row = $(this).closest('.list-item');
            const id = row.attr('data-id');
            if (id) ids.push(id);
        });
        return ids;
    }

    rebuildCiteCollectionFromNoteIds(noteIds, tableWrap) {
        this._cite_collection = [];
        const wrap = tableWrap || this._editCiteTableWrap || this._TABLE_WRAP;
        (noteIds || []).forEach((id) => {
            if (!id) return;
            const fn = wrap && wrap.querySelector
                ? wrap.querySelector('.fn[id="' + id + '"]')
                : null;
            const lab = (fn && fn.getAttribute('data-label')) || '';
            if (!lab) return;
            this.createCitation(id, lab);
        });
        return this._cite_collection;
    }

    async fireCiteEdit() {
        const btn = this.elements.INSERT_BTN;
        if (btn && (btn.disabled || btn.classList.contains('disabled'))) return;
        this._lockCiteSnapshot();
        try {
            const G = window.TablesMethodsGroup;
            const tableWrap = this._editCiteTableWrap || this.resolveTableWrap();
            if (tableWrap) this._TABLE_WRAP = tableWrap;
            const noteIds = this.selectedCiteEditNoteIds();
            this.rebuildCiteCollectionFromNoteIds(noteIds, tableWrap);
            if (!this._cite_collection.length) {
                TOASTER_ALERT('empty_content', { type: 'warning' });
                return;
            }
            const node = this.editCiteCaretNode();
            const editor = this.editor || (typeof GlobalEditor !== 'undefined' ? GlobalEditor : null);
            let cluster = Array.isArray(this._editCiteCluster) ? this._editCiteCluster.filter(Boolean) : [];
            if (!cluster.length) {
                const seed = (this._editCiteSeedAtOpen && this._editCiteSeedAtOpen.parentNode)
                    ? this._editCiteSeedAtOpen
                    : (G.resolveEditCiteSeed
                        ? G.resolveEditCiteSeed({
                            element: node,
                            imsNode: this._IMS && this._IMS.NODE && (this._IMS.NODE.$ || this._IMS.NODE),
                            editor,
                            pointerEl: this._lastPointerEl,
                            requireCell: this._editCiteCellAtOpen || (G.citeAnchorCell && G.citeAnchorCell(node))
                        })
                        : (G.resolveTblFnXref
                            ? G.resolveTblFnXref(node, null, editor)
                            : G.isTblFnXref(node)));
                cluster = seed && G.collectAdjacentTblFnXrefs
                    ? G.collectAdjacentTblFnXrefs(seed)
                    : (seed ? [seed] : []);
            }
            cluster = cluster.filter((el) => el && el.parentNode);
            if (!cluster.length) {
                TOASTER_ALERT('empty_content', { type: 'warning' });
                return;
            }
            const keepIds = {};
            noteIds.forEach((id) => { if (id) keepIds[id] = true; });
            const liveBefore = {};
            cluster.forEach((xref) => {
                const rid = xref.getAttribute && xref.getAttribute('rid');
                if (!rid || liveBefore[rid] != null) return;
                liveBefore[rid] = countLiveTblFnXrefs(tableWrap, rid);
            });
            const droppedLast = [];
            const seenDrop = {};
            cluster.forEach((xref) => {
                const rid = xref.getAttribute && xref.getAttribute('rid');
                if (!rid || keepIds[rid] || seenDrop[rid]) return;
                seenDrop[rid] = true;
                if (lastCiteRemovesNote(liveBefore[rid])) droppedLast.push({ rid });
            });
            for (let i = 0; i < droppedLast.length; i++) {
                const rid = droppedLast[i].rid;
                const fnEntry = tableWrap.querySelector('.fn[id="' + rid + '"]');
                const label = (fnEntry && fnEntry.getAttribute('data-label')) || '';
                const wasProbability = fnEntry && TablesMethodsGroup.isProbabilityFn
                    ? TablesMethodsGroup.isProbabilityFn(fnEntry)
                    : TablesMethodsGroup.isProbabilityCue(label);
                let ok = false;
                if (typeof IMPACT_ALERT === 'function') {
                    ok = await IMPACT_ALERT('xrefsdel005', {
                        replace: label,
                        s_text: wasProbability ? 'text' : 're_num'
                    });
                } else {
                    const msg = this.moduleMsg('runtime.lastCiteConfirm', { label: label }, 'Delete the footnote as well?');
                    ok = window.confirm(msg);
                }
                if (!ok) return;
            }
            const fnLabelOf = (id) => {
                const fn = id && tableWrap.querySelector ? tableWrap.querySelector('.fn[id="' + id + '"]') : null;
                return (fn && fn.getAttribute('data-label')) || '';
            };
            const xrefLabelOf = (xref) => {
                const rid = xref && xref.getAttribute && xref.getAttribute('rid');
                const fromFn = fnLabelOf(rid);
                if (fromFn) return fromFn;
                const sup = xref && xref.querySelector && xref.querySelector('sup');
                return (sup && sup.textContent) || (xref && xref.textContent) || '';
            };
            const usedXref = [];
            const pendingIds = [];
            noteIds.forEach((id) => {
                if (!id) return;
                const existing = cluster.find((x) => x.getAttribute && x.getAttribute('rid') === id && usedXref.indexOf(x) < 0);
                if (existing) usedXref.push(existing);
                else pendingIds.push(id);
            });
            const leftover = cluster.filter((x) => usedXref.indexOf(x) < 0);
            const extraIds = [];
            pendingIds.forEach((id, i) => {
                if (leftover[i]) {
                    const xref = leftover[i];
                    const oldRid = xref.getAttribute('rid');
                    const oldLab = xrefLabelOf(xref);
                    const href = '#' + id;
                    xref.setAttribute('rid', id);
                    xref.setAttribute('href', href);
                    xref.setAttribute('data-cke-saved-href', href);
                    usedXref.push(xref);
                    if (oldRid && !keepIds[oldRid] && lastCiteRemovesNote(liveBefore[oldRid])) {
                        const fnEntry = tableWrap.querySelector('.fn[id="' + oldRid + '"]');
                        if (fnEntry) {
                            const deletedLabel = fnEntry.getAttribute('data-label') || oldLab;
                            const wasProbability = TablesMethodsGroup.isProbabilityFn
                                ? TablesMethodsGroup.isProbabilityFn(fnEntry)
                                : TablesMethodsGroup.isProbabilityCue(deletedLabel);
                            G.RemoveItem(tableWrap, fnEntry);
                            if (!wasProbability && TablesMethodsGroup.shiftLabelsAfterDelete) {
                                TablesMethodsGroup.shiftLabelsAfterDelete(tableWrap, deletedLabel, xref);
                            }
                        }
                    }
                    if (G._updateCitationWithTracking) {
                        G._updateCitationWithTracking(xref, id, fnLabelOf(id) || id, oldLab);
                    }
                } else {
                    extraIds.push(id);
                }
            });
            const dropped = leftover.filter((x) => usedXref.indexOf(x) < 0);
            if (extraIds.length) {
                let lastEl = usedXref[usedXref.length - 1] || cluster[cluster.length - 1];
                extraIds.forEach((id) => {
                    const lab = fnLabelOf(id);
                    this._cite_collection = [];
                    this.createCitation(id, lab);
                    const template = this._cite_collection[0];
                    if (!template || !lastEl) return;
                    const commaSup = CKEDITOR.dom.element.createFromHtml('<sup>,</sup>');
                    const element = CKEDITOR.dom.element.createFromHtml(template);
                    commaSup.insertAfter(new CKEDITOR.dom.element(lastEl));
                    element.insertAfter(commaSup);
                    lastEl = element.$ || element;
                });
            }
            dropped.forEach((xref) => {
                if (!xref || !xref.parentNode) return;
                const rid = xref.getAttribute && xref.getAttribute('rid');
                const fnEntry = rid ? tableWrap.querySelector('.fn[id="' + rid + '"]') : null;
                const liveCount = rid != null ? liveBefore[rid] : 0;
                if (rid && lastCiteRemovesNote(liveCount) && fnEntry) {
                    const deletedLabel = fnEntry.getAttribute('data-label') || '';
                    const wasProbability = TablesMethodsGroup.isProbabilityFn
                        ? TablesMethodsGroup.isProbabilityFn(fnEntry)
                        : TablesMethodsGroup.isProbabilityCue(deletedLabel);
                    G.RemoveItem(tableWrap, fnEntry);
                    if (!wasProbability && TablesMethodsGroup.shiftLabelsAfterDelete) {
                        TablesMethodsGroup.shiftLabelsAfterDelete(tableWrap, deletedLabel);
                    }
                    return;
                }
                if (fnEntry) {
                    G.RemoveItem(tableWrap, fnEntry, xref, true);
                } else if (G._cleanCiteComma) {
                    G._cleanCiteComma(xref, false);
                    if (typeof commonMethods !== 'undefined' && commonMethods.removeEl) commonMethods.removeEl(xref);
                    else if (xref.parentNode) xref.parentNode.removeChild(xref);
                }
            });
            // Do not call handleRenumbering here — citation-order remap swaps id-stable a/b on T1.
            this.closeModule();
        } catch (err) {
            this.trackError('fireCiteEdit', err);
        } finally {
            this._unlockCiteSnapshot();
        }
    }

    readInsertPlainText() {
        return htmlToPlain(this.readInsertBodyHtml());
    }

    readInsertBodyHtml() {
        return this.getSummerNoteContent() || '';
    }

    fireInsertNew() {
        const uiType = this.getCheckedUiType();
        const needsCite = isCuedUiType(uiType);
        const text = this.readInsertPlainText();
        const summerRaw = this.readInsertBodyHtml();
        const raw = summerHtmlToJats(summerRaw || text);
        const editor = this.editor || (typeof GlobalEditor !== 'undefined' ? GlobalEditor : null);
        if (editor && typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION.getInfo) {
            IMPACT_SELECTION.getInfo(editor, { lock: false });
            this._IMS = IMPACT_SELECTION;
            let live = IMPACT_SELECTION.NODE && (IMPACT_SELECTION.NODE.$ || IMPACT_SELECTION.NODE);
            if (live && live.nodeType === 3) live = live.parentElement;
            if (live && live.nodeType === 1) {
                this._insertAnchor = live;
                const wrap = live.closest && live.closest('.table-wrap');
                if (wrap) this._TABLE_WRAP = wrap;
            }
        }
        const caret = this.caretNode();
        const caretEl = caret && caret.nodeType === 3 ? caret.parentElement : caret;
        const caretWrap = caretEl && caretEl.closest ? caretEl.closest('.table-wrap') : null;
        const tableWrap = caretWrap || this.resolveTableWrap();
        this._TABLE_WRAP = tableWrap;
        if (!text) {
            TOASTER_ALERT('empty_content', { type: 'warning' });
            return;
        }
        if (needsCite && !this.requireCiteCaret()) {
            if (typeof TOASTER_ALERT === 'function') TOASTER_ALERT('tbl_fn_place_caret', { type: 'warning' });
            return;
        }
        if (!tableWrap) {
            if (typeof TOASTER_ALERT === 'function') TOASTER_ALERT('empty_content', { type: 'warning' });
            return;
        }
        let foot = tableWrap.querySelector('.table-wrap-foot');
        const labelled = Array.from((foot && foot.querySelectorAll('.fn[data-label]')) || []);
        const letterInsert = uiType === 'alpha' || uiType === 'numeric';
        const slotCaret = letterInsert ? this.slotCaretNode(tableWrap) : null;
        const slot = letterInsert && TablesMethodsGroup.letterSlotAtCaret
            ? TablesMethodsGroup.letterSlotAtCaret(tableWrap, slotCaret)
            : null;
        let nextLab = '';
        if (slot) {
            nextLab = slot;
        } else if (uiType === 'probability') {
            nextLab = nextProbabilityLabel(this.usedLabels());
        } else if (needsCite && TablesMethodsGroup._generateNewLabel) {
            nextLab = TablesMethodsGroup._generateNewLabel(labelled) || pickNextFnLabel(this.labelChoices(uiType), this.usedLabels());
        } else {
            nextLab = pickNextFnLabel(this.labelChoices(uiType), this.usedLabels());
        }
        const label = needsCite ? (nextLab || (this.elements.LABEL_SEL && this.elements.LABEL_SEL.value) || 'a') : null;
        let labelType = 'unnumber';
        if (uiType === 'source') labelType = 'source';
        else if (uiType === 'abbrev') labelType = 'abbrev';
        else if (uiType === 'unnumbered' || uiType === 'note') labelType = TablesMethodsGroup.classifyParaText(text);
        else if (label) labelType = TablesMethodsGroup.classifyLabelText(label);
        const exitList = Array.from((foot && foot.querySelectorAll('.fn')) || []);
        const { finalId } = TablesMethodsGroup.getNewId(tableWrap, exitList);
        const { fragCite, fragEntry } = TablesMethodsGroup.getCitation(finalId, label, needsCite, {
            body: raw || text,
            labelType
        });
        let inserted = false;
        this._lockCiteSnapshot();
        try {
            const table = tableWrap.querySelector('table');
            if (!foot && table) {
                table.after(TablesMethodsGroup.getFrag('wrapper'));
                foot = tableWrap.querySelector('.table-wrap-foot');
            }
            if (slot && TablesMethodsGroup.shiftLabelsUpFrom) {
                TablesMethodsGroup.shiftLabelsUpFrom(tableWrap, slot);
            }
            foot = tableWrap.querySelector('.table-wrap-foot') || foot;
            const fnEl = TablesMethodsGroup.placeFnEntry(tableWrap, foot, fragEntry);
            if (!fnEl || (needsCite && !canInsertTblFnCite(fnEl, foot))) {
                if (typeof TOASTER_ALERT === 'function') TOASTER_ALERT('empty_content', { type: 'warning' });
                return;
            }
            if (needsCite && fragCite && typeof GlobalEditor !== 'undefined' && GlobalEditor && GlobalEditor.insertHtml) {
                GlobalEditor.insertHtml(fragCite);
            }
            applySplitFnParagraphs(fnEl, raw || text);
            wrapBareTblFnStarXrefs(tableWrap);
            if (this.trackManager && fnEl && this.trackManager.getInsNode) {
                this.trackManager.getInsNode(fnEl, { childOnly: true });
            }
            inserted = true;
        } catch (err) {
            this.trackError('fireInsertNew', err);
        } finally {
            this._unlockCiteSnapshot();
        }
        if (inserted) {
            this.closeModule();
            if (typeof TOASTER_ALERT === 'function') {
                if (slot && needsCite) TOASTER_ALERT('tbl_fn_ins_renum');
                else if (!needsCite) TOASTER_ALERT('tbl_fn_unnum_added');
                else TOASTER_ALERT('tbl_fn_num_added');
            }
        }
    }

    fireDeleteFn() {
        this._lockCiteSnapshot();
        try {
            const fn = this._deleteFnEl;
            if (!fn) return;
            const tableWrap = (fn.closest && fn.closest('.table-wrap')) || this._TABLE_WRAP;
            this._TABLE_WRAP = tableWrap;
            const deletedLabel = fn.getAttribute('data-label') || '';
            const wasCued = TablesMethodsGroup.isCuedFn(fn);
            const wasProbability = TablesMethodsGroup.isProbabilityFn
                ? TablesMethodsGroup.isProbabilityFn(fn)
                : TablesMethodsGroup.isProbabilityCue(deletedLabel);
            TablesMethodsGroup.RemoveItem(tableWrap, fn);
            if (wasCued && !wasProbability && TablesMethodsGroup.shiftLabelsAfterDelete) {
                TablesMethodsGroup.shiftLabelsAfterDelete(tableWrap, deletedLabel);
            }
            this.closeModule();
            if (typeof TOASTER_ALERT === 'function') {
                if (!wasCued) TOASTER_ALERT('tbl_fn_unnum_deleted');
                else if (wasProbability) TOASTER_ALERT('tbl_fn_num_deleted');
                else TOASTER_ALERT('tbl_fn_del_renum');
            } 
        } catch (err) {
            this.trackError('fireDeleteFn', err);
        } finally {
            this._unlockCiteSnapshot();
        }
    }

    closeModule() {
        try {
            this.clearEditCiteSelectionSnapshot();
            this._dialogMode = 'citeInsert';
            if (typeof this.closeDialog == "function") this.closeDialog();
            else this.Panel.classList.add("ds-none");
        } catch (err) {
            this.trackError('closeModule', err);
        }
    }
}
export default TableNotesModule;
