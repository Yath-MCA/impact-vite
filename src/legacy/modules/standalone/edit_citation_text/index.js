/**
 * EditCitationTextModule — freely edit citation display text,
 * optionally change linked reference, and retain formatting tags inside xref.
 * Pattern: hyperlink_module (BaseModule + minimal dialog).
 */
class EditCitationTextModule extends BaseModule {
    static TRACK_CODE_LEGACY_DEL = 'cite-text-del-01';
    static TRACK_CODE_LEGACY = 'cite-text-01';
    static TRACK_CODE_DIRECT = 'cite-text-direct-01';
    static TRACK_CODE_INDIRECT = 'cite-text-indirect-01';
    static TRACK_CODE_RELINK = 'cite-text-relink-01';
    static TRACK_CODE_SYNC = 'cite-text-sync-01';
    static REF_LABEL_MAX = 40;
    static PRESERVE_ATTRS = ['class', 'data-name', 'data-role', 'ref-type', 'rid', 'href', 'fid'];
    static FORMAT_SELECTOR = [
        'span.font',
        'span[data-name="font"]',
        'em.italic',
        'em[data-name="italic"]',
        'i',
        'b',
        'strong',
        'sup.sup',
        'sup[data-name="sup"]',
        'sub.sub',
        'sub[data-name="sub"]'
    ].join(',');

    /**
     * Loaded from xref_role_config.json (single source of truth).
     * Flip `enable: true` in that JSON to allow fig/table/sec/disp-formula, etc.
     */
    static XREF_ROLE_CONFIG = {};

    // Numeric year or no-date (n.d. / n.d / nd). Use (?!\w) so trailing period on n.d. is kept.
    static DATE_RE = /\b(?:\d{4}[a-z]?(?:\s*[\-–]\s*\d{2,4})?|n\.?\s*d\.?)(?!\w)/i;
    static DATE_RE_GLOBAL = /\b(?:\d{4}[a-z]?(?:\s*[\-–]\s*\d{2,4})?|n\.?\s*d\.?)(?!\w)/gi;
    static APOSTROPHE = '\u2019';
    static MAX_EXTRA_SELECTION_WORDS = 5;
    static BTN_WRAP_SELECTION = 'Wrap selection';
    static BTN_UPDATE_WRAP = 'Update wrap';
    static BTN_USE_SELECTION = 'Wrap selection';
    static BTN_UPDATE_SELECTION = 'Update wrap';
    static SELECTORS = {
        textInput: '#cite_display_text',
        useSelectionBtn: '#cite_use_selection',
        ridInput: '#cite_linked_rid',
        changeRefBtn: '#change_cite_ref',
        linkedRefGroup: '#cite_linked_ref_group',
        linkedRefLabel: '#cite_linked_ref_group label[for="cite_linked_rid"]',
        refPicker: '#cite_ref_picker',
        refFilter: '#cite_ref_filter',
        refList: '#cite_ref_list',
        sameRidSection: '#cite_same_rid_section',
        sameRidHeading: '#cite_same_rid_heading',
        sameRidEmpty: '#cite_same_rid_empty',
        sameRidGrid: '#cite_same_rid_grid',
        sameRidPrev: '#cite_same_rid_prev',
        sameRidNext: '#cite_same_rid_next',
        sameRidPosition: '#cite_same_rid_position',
        applyBtn: '#apply_cite_text',
        cancelBtn: '#cancel_cite_text',
        dialogTitle: '.dia_header_text'
    };

    /**
     * Publish loaded role config for context menu (context.js may load before this class).
     */
    static publishRoleConfigToWindow() {
        if (typeof window === 'undefined') return;
        if (EditCitationTextModule.XREF_ROLE_CONFIG
            && Object.keys(EditCitationTextModule.XREF_ROLE_CONFIG).length) {
            window.EDIT_CITATION_TEXT_XREF_ROLE_CONFIG = EditCitationTextModule.XREF_ROLE_CONFIG;
        }
        window.EditCitationTextModule = EditCitationTextModule;
    }

    static applyRoleConfigMap(map) {
        if (!map || typeof map !== 'object') return;
        EditCitationTextModule.XREF_ROLE_CONFIG = map;
        EditCitationTextModule.publishRoleConfigToWindow();
    }

    static getXrefRoleKey(xref) {
        if (!xref || typeof xref.getAttribute !== 'function') return '';
        return String(xref.getAttribute('data-role') || xref.getAttribute('ref-type') || '').trim();
    }

    static matchesRoleSelector(xref, selector) {
        if (!xref || !selector) return false;
        try {
            if (typeof xref.matches === 'function') {
                return selector.split(',').some((part) => {
                    try {
                        return xref.matches(part.trim());
                    } catch (err) {
                        return false;
                    }
                });
            }
        } catch (err) {
            /* fall through */
        }
        const key = EditCitationTextModule.getXrefRoleKey(xref);
        return !!(key && selector.indexOf(`'${key}'`) >= 0);
    }

    /**
     * @returns {object|null} role config entry when enabled and matched
     */
    static resolveRoleConfig(xref) {
        try {
            const el = xref && (xref.$ || xref);
            if (!el || el.nodeType !== 1) return null;
            if (el.hasAttribute && el.hasAttribute('data-remove')) return null;

            const map = (typeof window !== 'undefined' && window.EDIT_CITATION_TEXT_XREF_ROLE_CONFIG)
                || EditCitationTextModule.XREF_ROLE_CONFIG
                || {};
            const roleKey = EditCitationTextModule.getXrefRoleKey(el);
            const entries = Object.keys(map).map((name) => ({ name, cfg: map[name] }));

            // Prefer exact role-key entry, then any selector match
            let hit = null;
            if (roleKey && map[roleKey]) {
                hit = { name: roleKey, cfg: map[roleKey] };
            }
            if (!hit) {
                hit = entries.find((e) => e.cfg && EditCitationTextModule.matchesRoleSelector(el, e.cfg.selector));
            }
            if (!hit || !hit.cfg || !hit.cfg.enable) return null;

            const rid = String(el.getAttribute('rid') || '').trim();
            if (hit.cfg.requireSingleRid && /\s/.test(rid)) return null;

            return { role: hit.name, ...hit.cfg };
        } catch (err) {
            return null;
        }
    }

    constructor(name = 'EditCitationTextModule', errorTracker, options = {}) {
        super(name, errorTracker, options);
        this._id = 'EditCitationTextDialog';
        this.canUnmountComponentWhileClose = true;
        this.editMode = false;
        this.editState = null;
        this.trackManager = null;
        this.formModified = false;
        this._eventsBound = false;
        this._boundPanel = null;
        this._boundTextInput = null;
        this._refCatalog = [];
        this._selectionListenBound = false;
        this._lastAppliedSelection = '';
        this._sameRidCites = [];
        this._sameRidIndex = 0;
        this._bindModuleMethods();
        window.EditCitationTextModule = EditCitationTextModule;
    }

    /**
     * BaseModule.init → initLoop: consume role config loaded by supportingFiles.
     */
    initLoop() {
        try {
            const map = (typeof window !== 'undefined'
                && window.EDIT_CITATION_TEXT_XREF_ROLE_CONFIG) || {};
            EditCitationTextModule.applyRoleConfigMap(map);
        } catch (err) {
            this.trackError('initLoop', err.message);
        }
    }

    _bindModuleMethods() {
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== 'constructor' && typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        });
    }

    initializeElements() {
        const map = EditCitationTextModule.SELECTORS;
        this.elements = {
            textInput: this.Panel.querySelector(map.textInput),
            useSelectionBtn: this.Panel.querySelector(map.useSelectionBtn),
            ridInput: this.Panel.querySelector(map.ridInput),
            changeRefBtn: this.Panel.querySelector(map.changeRefBtn),
            linkedRefGroup: this.Panel.querySelector(map.linkedRefGroup) || this.Panel.querySelector('#cite_linked_rid')?.closest('.form-group'),
            linkedRefLabel: this.Panel.querySelector(map.linkedRefLabel) || this.Panel.querySelector('#cite_linked_ref_group label'),
            refPicker: this.Panel.querySelector(map.refPicker),
            refFilter: this.Panel.querySelector(map.refFilter),
            refList: this.Panel.querySelector(map.refList),
            sameRidSection: this.Panel.querySelector(map.sameRidSection),
            sameRidHeading: this.Panel.querySelector(map.sameRidHeading),
            sameRidEmpty: this.Panel.querySelector(map.sameRidEmpty),
            sameRidGrid: this.Panel.querySelector(map.sameRidGrid),
            sameRidPrev: this.Panel.querySelector(map.sameRidPrev),
            sameRidNext: this.Panel.querySelector(map.sameRidNext),
            sameRidPosition: this.Panel.querySelector(map.sameRidPosition),
            applyBtn: this.Panel.querySelector(map.applyBtn),
            cancelBtn: this.Panel.querySelector(map.cancelBtn),
            closeIcon: this.Panel.querySelector('.closeIcons'),
            dialogTitle: this.Panel.querySelector(map.dialogTitle)
        };
    }

    setupEventListeners() {
        // Remount replaces child nodes; Panel reference may stay the same.
        if (
            this._eventsBound &&
            this._boundTextInput &&
            this.elements.textInput &&
            this._boundTextInput === this.elements.textInput
        ) {
            return;
        }

        const {
            textInput, applyBtn, cancelBtn, closeIcon,
            changeRefBtn, refFilter, refList,
            useSelectionBtn, sameRidPrev, sameRidNext, sameRidGrid
        } = this.elements;

        if (textInput) {
            textInput.addEventListener('input', this.onTextInput);
            textInput.addEventListener('change', this.onTextInput);
            textInput.addEventListener('paste', this.onTextPaste);
            textInput.addEventListener('compositionend', this.onTextInput);
            textInput.addEventListener('keydown', this.onTextKeydown);
            textInput.addEventListener('keypress', this.onTextKeypress);
            textInput.addEventListener('beforeinput', this.onTextBeforeInput);
        }
        if (useSelectionBtn) {
            useSelectionBtn.addEventListener('click', this.handleUseSelection);
        }
        if (applyBtn) {
            applyBtn.addEventListener('click', this.handleApply);
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.handleCancel);
        }
        if (closeIcon) {
            closeIcon.addEventListener('click', this.handleCancel);
        }
        if (changeRefBtn) {
            changeRefBtn.addEventListener('click', this.toggleRefPicker);
        }
        if (refFilter) {
            refFilter.addEventListener('input', this.onRefFilterInput);
        }
        if (refList) {
            refList.addEventListener('click', this.onRefListClick);
        }
        if (sameRidPrev) {
            sameRidPrev.addEventListener('click', this.handleSameRidPrev);
        }
        if (sameRidNext) {
            sameRidNext.addEventListener('click', this.handleSameRidNext);
        }
        if (sameRidGrid) {
            sameRidGrid.addEventListener('click', this.handleSameRidGridClick);
        }

        this._eventsBound = true;
        this._boundPanel = this.Panel;
        this._boundTextInput = textInput || null;
    }

    onTextInput() {
        try {
            this.formModified = true;
            this.updateApplyState();
        } catch (err) {
            this.trackError('onTextInput', err.message);
        }
    }

    onTextPaste(e) {
        try {
            const { textInput } = this.elements;
            if (!textInput) return;

            const clip = (e && e.clipboardData) || (typeof window !== 'undefined' && window.clipboardData);
            const pasted = clip && clip.getData ? clip.getData('text/plain') : null;
            if (pasted != null && pasted.indexOf("'") >= 0) {
                e.preventDefault();
                const start = textInput.selectionStart || 0;
                const end = textInput.selectionEnd || 0;
                const val = textInput.value || '';
                const inserted = this.normalizeStraightApostrophes(pasted);
                textInput.value = val.slice(0, start) + inserted + val.slice(end);
                const caret = start + inserted.length;
                textInput.setSelectionRange(caret, caret);
                this.onTextInput();
                return;
            }

            setTimeout(() => {
                if (this.elements.textInput) {
                    const el = this.elements.textInput;
                    const before = el.value || '';
                    const after = this.normalizeStraightApostrophes(before);
                    if (after !== before) {
                        const pos = el.selectionStart || after.length;
                        el.value = after;
                        el.setSelectionRange(pos, pos);
                    }
                }
                this.onTextInput();
            }, 0);
        } catch (err) {
            this.trackError('onTextPaste', err.message);
            setTimeout(() => this.onTextInput(), 0);
        }
    }

    onTextKeydown(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.handleApply(e);
        }
    }

    onTextKeypress(e) {
        try {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key !== "'" && e.charCode !== 39) return;
            e.preventDefault();
            this.insertApostropheAtCaret();
        } catch (err) {
            this.trackError('onTextKeypress', err.message);
        }
    }

    onTextBeforeInput(e) {
        try {
            if (!e || e.inputType !== 'insertText' || e.data !== "'") return;
            e.preventDefault();
            this.insertApostropheAtCaret();
        } catch (err) {
            this.trackError('onTextBeforeInput', err.message);
        }
    }

    normalizeStraightApostrophes(text) {
        return String(text || '').replace(/'/g, EditCitationTextModule.APOSTROPHE);
    }

    insertApostropheAtCaret() {
        const { textInput } = this.elements;
        if (!textInput) return;
        const start = textInput.selectionStart || 0;
        const end = textInput.selectionEnd || 0;
        const val = textInput.value || '';
        const apo = EditCitationTextModule.APOSTROPHE;
        textInput.value = val.slice(0, start) + apo + val.slice(end);
        const caret = start + apo.length;
        textInput.setSelectionRange(caret, caret);
        this.onTextInput();
    }

    shouldWriteSurround() {
        return !!(this.editState && this.editState.rangeSelected);
    }

    setUseSelectionButtonLabel(label) {
        const btn = this.elements && this.elements.useSelectionBtn;
        if (!btn) return;
        const text = label || EditCitationTextModule.BTN_WRAP_SELECTION;
        btn.textContent = text;
        btn.title = text === EditCitationTextModule.BTN_UPDATE_WRAP
            ? 'Re-select citation wrap in the editor and refresh Display Text'
            : 'Select citation surround in the editor and fill Display Text';
    }

    bindEditorSelectionListener() {
        if (this._selectionListenBound) return;
        try {
            if (typeof GlobalEditor !== 'undefined' && GlobalEditor.on) {
                GlobalEditor.on('selectionChange', this.onEditorSelectionChange);
                this._selectionListenBound = true;
                return;
            }
        } catch (err) {
            this.trackError('bindEditorSelectionListener', err.message);
        }
        try {
            document.addEventListener('selectionchange', this.onEditorSelectionChange);
            this._selectionListenBound = true;
        } catch (err) {
            this.trackError('bindEditorSelectionListener', err.message);
        }
    }

    unbindEditorSelectionListener() {
        if (!this._selectionListenBound) return;
        try {
            if (typeof GlobalEditor !== 'undefined' && GlobalEditor.removeListener) {
                GlobalEditor.removeListener('selectionChange', this.onEditorSelectionChange);
            }
        } catch (err) {
            /* ignore */
        }
        try {
            document.removeEventListener('selectionchange', this.onEditorSelectionChange);
        } catch (err) {
            /* ignore */
        }
        this._selectionListenBound = false;
    }

    onEditorSelectionChange() {
        try {
            if (!this.editState || this.state === 0) return;
            // Ignore selection changes inside the dialog controls.
            const active = typeof document !== 'undefined' ? document.activeElement : null;
            if (active && this.Panel && this.Panel.contains && this.Panel.contains(active)) {
                return;
            }

            const plain = this.normalizeSpace(this.getEditorSelectionPlainText());
            if (!plain) return;
            if (plain === this._lastAppliedSelection) {
                this.setUseSelectionButtonLabel(EditCitationTextModule.BTN_WRAP_SELECTION);
                return;
            }
            this.setUseSelectionButtonLabel(EditCitationTextModule.BTN_UPDATE_WRAP);
        } catch (err) {
            this.trackError('onEditorSelectionChange', err.message);
        }
    }

    getEditorSelectionPlainText() {
        try {
            if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION.SEL_TEXT) {
                return String(IMPACT_SELECTION.SEL_TEXT);
            }
            if (typeof GlobalEditor !== 'undefined' && GlobalEditor.getSelection) {
                const sel = GlobalEditor.getSelection();
                if (sel && typeof sel.getSelectedText === 'function') {
                    return sel.getSelectedText() || '';
                }
            }
            if (typeof window !== 'undefined' && window.getSelection) {
                return window.getSelection().toString() || '';
            }
        } catch (err) {
            this.trackError('getEditorSelectionPlainText', err.message);
        }
        return '';
    }

    tokenizeSelectionWords(text) {
        let clean = this.normalizeSpace(text);
        if (!clean) return [];

        // Collapse multi-word cite tokens so they count as one for the ≤5 rule.
        clean = clean
            .replace(/\bet\s+al\.?/gi, 'etal')
            .replace(/\bn\.?\s*d\.?(?!\w)/gi, 'nd')
            // reprint original year [1848]
            .replace(/\[\d{4}[a-z]?\]/gi, 'origyr')
            .replace(/\band\b/gi, ' ')
            .replace(/&/g, ' ');

        return clean
            .split(/\s+/)
            .map((t) => t.replace(/^[,;:]+|[,;:]+$/g, ''))
            .filter(Boolean);
    }

    /**
     * Find last date-like token (numeric year or n.d.) in text.
     * @returns {{ index: number, length: number, text: string }|null}
     */
    findLastDateMatch(text) {
        const clean = String(text || '');
        if (!clean) return null;
        const re = new RegExp(EditCitationTextModule.DATE_RE_GLOBAL.source, 'gi');
        let match = null;
        let last = null;
        while ((match = re.exec(clean)) !== null) {
            last = match;
        }
        if (!last) return null;
        return {
            index: last.index,
            length: last[0].length,
            text: last[0]
        };
    }

    /** End index after date token, including closing ')' when present (Author (Year)). */
    dateMatchEndIndex(body, dateMatch) {
        if (!dateMatch) return 0;
        let end = dateMatch.index + dateMatch.length;
        if (String(body || '').charAt(end) === ')') end += 1;
        return end;
    }

    countExtraWordsOutsideXref(selectionText, xrefText) {
        const sel = this.normalizeSpace(selectionText);
        const body = this.normalizeSpace(xrefText);
        if (!sel) return 0;
        let remainder = sel;
        if (body) {
            const idx = sel.toLowerCase().indexOf(body.toLowerCase());
            if (idx >= 0) {
                remainder = `${sel.slice(0, idx)} ${sel.slice(idx + body.length)}`;
            }
        }
        remainder = remainder.replace(/^[\(\[\{]\s*/, '').replace(/\s*[\)\]\}]$/, '');
        return this.tokenizeSelectionWords(remainder).length;
    }

    selectionContainsXref(xrefNode) {
        try {
            if (!xrefNode) return false;
            if (typeof GlobalEditor !== 'undefined' && GlobalEditor.getSelection) {
                const sel = GlobalEditor.getSelection();
                if (sel && sel.getRanges) {
                    const ranges = sel.getRanges();
                    for (let i = 0; i < ranges.length; i++) {
                        const range = ranges[i];
                        if (!range) continue;
                        const container = range.cloneContents ? range.cloneContents() : null;
                        if (container && container.find) {
                            const found = container.find('a.xref');
                            if (found && found.count && found.count() > 0) return true;
                        }
                        const start = range.startContainer && (range.startContainer.$ || range.startContainer);
                        const end = range.endContainer && (range.endContainer.$ || range.endContainer);
                        const startEl = start && start.nodeType === 3 ? start.parentElement : start;
                        const endEl = end && end.nodeType === 3 ? end.parentElement : end;
                        if (startEl && startEl.closest && startEl.closest('a.xref') === xrefNode) return true;
                        if (endEl && endEl.closest && endEl.closest('a.xref') === xrefNode) return true;
                        if (xrefNode.contains && (xrefNode.contains(start) || xrefNode.contains(end))) return true;
                    }
                }
            }
            const plain = this.normalizeSpace(this.getEditorSelectionPlainText());
            const body = this.normalizeSpace((xrefNode.textContent || ''));
            return !!(plain && body && plain.toLowerCase().indexOf(body.toLowerCase()) >= 0);
        } catch (err) {
            this.trackError('selectionContainsXref', err.message);
            return false;
        }
    }

    handleUseSelection() {
        try {
            if (!this.editState || !this.editState.element) return;
            const roleCfg = this.editState.roleConfig;
            if (roleCfg && roleCfg.allowWrap === false) return;

            const xref = this.editState.element;
            if (!this.hasWrapRangeAvailable(xref)) {
                this.updateWrapSelectionState();
                return;
            }
            const btn = this.elements && this.elements.useSelectionBtn;
            if (btn && btn.disabled) return;

            const xrefText = this.normalizeSpace(xref.textContent || this.editState.originalText || '');

            // Resolve surround from DOM, select it in the editor, fill Display Text.
            // User does not need to drag-select first.
            const auto = this.resolveSurroundFromXref(xref);
            if (auto && auto.error === 'too_many_words') {
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('Surrounding text exceeds 5 words around the citation', { type: 'warning' });
                }
                return;
            }
            if (!auto || !auto.plain) {
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('No surrounding citation range found by the citation', { type: 'warning' });
                }
                return;
            }

            this.selectSurroundRangeInEditor(xref, auto);

            let prefix = auto.prefix || '';
            let suffix = auto.suffix || '';
            let display = auto.plain;
            let modeInfo = auto.modeInfo || null;

            // Prefer live editor selection text (IMPACT_SELECTION.SEL_TEXT may lag after selectRanges).
            let plainSel = '';
            try {
                if (typeof GlobalEditor !== 'undefined' && GlobalEditor.getSelection) {
                    const sel = GlobalEditor.getSelection();
                    if (sel && typeof sel.getSelectedText === 'function') {
                        plainSel = this.normalizeSpace(sel.getSelectedText() || '');
                    }
                }
            } catch (err) {
                /* ignore */
            }
            if (!plainSel) {
                plainSel = this.normalizeSpace(this.getEditorSelectionPlainText());
            }
            const idx = plainSel && xrefText
                ? plainSel.toLowerCase().indexOf(xrefText.toLowerCase())
                : -1;
            if (
                plainSel
                && idx >= 0
                && this.countExtraWordsOutsideXref(plainSel, xrefText)
                <= EditCitationTextModule.MAX_EXTRA_SELECTION_WORDS
            ) {
                prefix = this.normalizeSpace(plainSel.slice(0, idx)).replace(/^[\(\[\{]\s*/, '');
                suffix = this.normalizeSurroundSuffix(
                    this.normalizeSpace(plainSel.slice(idx + xrefText.length)).replace(/\s*[\)\]\}]$/, '')
                );
                display = this.joinDisplayParts([prefix, xrefText, suffix]);
                this._lastAppliedSelection = plainSel;
            } else {
                // Harden: never fill xref-only when indexOf misses — keep resolved surround
                this._lastAppliedSelection = display;
            }

            if (this.elements.textInput) {
                this.elements.textInput.value = display;
            }

            if (!modeInfo) {
                modeInfo = this.editState.modeInfo && this.editState.modeInfo.mode === 'indirect'
                    ? { ...this.editState.modeInfo, prefix, suffix }
                    : this.detectCitationMode(xref);
            }

            if (prefix || suffix) {
                modeInfo.mode = modeInfo.mode || 'indirect';
                modeInfo.prefix = prefix || modeInfo.prefix || '';
                modeInfo.suffix = suffix || modeInfo.suffix || '';
            }

            this.editState.modeInfo = modeInfo;
            this.editState.mode = modeInfo.mode || this.editState.mode;
            this.editState.rangeSelected = true;
            this.editState.surroundPrefix = prefix;
            this.editState.surroundSuffix = suffix;
            this.formModified = true;
            this.setUseSelectionButtonLabel(EditCitationTextModule.BTN_WRAP_SELECTION);

            this.updateApplyState();
            // Keep editor focused so the auto-selected wrap stays visibly highlighted.
            try {
                if (typeof GlobalEditor !== 'undefined' && GlobalEditor.focus) {
                    GlobalEditor.focus();
                }
            } catch (err) {
                /* ignore */
            }
        } catch (err) {
            this.trackError('handleUseSelection', err.message);
        }
    }

    /**
     * Programmatically select the citation surround in the editor (paren wrap and/or siblings).
     */
    selectSurroundRangeInEditor(xref, surround = {}) {
        try {
            if (!xref || typeof GlobalEditor === 'undefined' || !GlobalEditor.createRange) {
                return false;
            }
            if (typeof CKEDITOR === 'undefined') return false;

            const modeInfo = (surround && surround.modeInfo) || this.detectCitationMode(xref);
            const range = GlobalEditor.createRange();
            const xrefEl = new CKEDITOR.dom.element(xref);
            let startSet = false;
            let endSet = false;

            if (modeInfo.openInfo && modeInfo.openInfo.node) {
                range.setStart(
                    new CKEDITOR.dom.node(modeInfo.openInfo.node),
                    modeInfo.openInfo.index
                );
                startSet = true;
            }
            if (modeInfo.closeInfo && modeInfo.closeInfo.node) {
                range.setEnd(
                    new CKEDITOR.dom.node(modeInfo.closeInfo.node),
                    modeInfo.closeInfo.index + 1
                );
                endSet = true;
            }

            if (!startSet) {
                const pre = this.findPreXrefSurroundSibling(xref);
                if (pre && pre.node) {
                    if (pre.node.nodeType === 3) {
                        range.setStart(new CKEDITOR.dom.node(pre.node), 0);
                    } else {
                        range.setStartBefore(new CKEDITOR.dom.element(pre.node));
                    }
                } else {
                    range.setStartAt(xrefEl, CKEDITOR.POSITION_BEFORE_START);
                }
                startSet = true;
            }

            if (!endSet) {
                const post = this.findPostXrefSurroundSibling(xref);
                if (post && post.node) {
                    if (post.node.nodeType === 3) {
                        range.setEnd(
                            new CKEDITOR.dom.node(post.node),
                            (post.node.textContent || '').length
                        );
                    } else {
                        range.setEndAfter(new CKEDITOR.dom.element(post.node));
                    }
                } else {
                    range.setEndAt(xrefEl, CKEDITOR.POSITION_AFTER_END);
                }
                endSet = true;
            }

            GlobalEditor.focus();
            GlobalEditor.getSelection().selectRanges([range]);
            try {
                if (typeof xref.scrollIntoView === 'function') {
                    xref.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }
            } catch (err) {
                /* ignore */
            }
            return true;
        } catch (err) {
            this.trackError('selectSurroundRangeInEditor', err.message);
            return false;
        }
    }

    /**
     * Normalize page-like suffix so Display / Apply store ", p. 123" (flush after xref).
     */
    normalizeSurroundSuffix(suffix) {
        let s = this.normalizeSpace(suffix || '');
        if (!s) return '';
        if (/^(pp?\.\s|\d)/i.test(s) && !/^[,;:.]/.test(s)) {
            return `, ${s}`;
        }
        return s;
    }

    /**
     * Build prefix / suffix / display from DOM around a.xref (paren wrappers + siblings).
     * Used by Wrap selection to auto-select and fill Display Text.
     */
    resolveSurroundFromXref(xref) {
        try {
            if (!xref) return null;
            const xrefText = this.normalizeSpace(xref.textContent || '');
            if (!xrefText) return null;

            const modeInfo = this.detectCitationMode(xref);
            let prefix = '';
            let suffix = '';

            if (modeInfo.mode === 'indirect') {
                prefix = this.normalizeSpace(modeInfo.prefix || '');
                suffix = this.normalizeSpace(modeInfo.suffix || '');
            }

            const post = this.findPostXrefSurroundSibling(xref);
            const pre = this.findPreXrefSurroundSibling(xref);

            if (post) {
                const sameClose = modeInfo.closeInfo && modeInfo.closeInfo.node === post.node;
                if (!sameClose) {
                    let postText = this.normalizeSpace(post.text || '');
                    postText = postText.replace(/\s*[\)\]\}]\s*$/, '');
                    if (postText && !suffix) {
                        suffix = postText;
                    } else if (postText && !modeInfo.suffix) {
                        suffix = postText;
                    }
                }
            }

            if (pre) {
                const sameOpen = modeInfo.openInfo && modeInfo.openInfo.node === pre.node;
                if (!sameOpen) {
                    let preText = this.normalizeSpace(pre.text || '');
                    preText = preText.replace(/^[\(\[\{]\s*/, '');
                    if (preText && !prefix) {
                        prefix = preText;
                    }
                }
            }

            suffix = this.normalizeSurroundSuffix(suffix);
            prefix = this.normalizeSpace(prefix);

            // Nothing beyond the cite itself — still a valid "surround" of xref-only
            const plain = this.joinDisplayParts([prefix, xrefText, suffix]);
            const extraWords = this.countExtraWordsOutsideXref(plain, xrefText);
            if (extraWords > EditCitationTextModule.MAX_EXTRA_SELECTION_WORDS) {
                return { error: 'too_many_words', extraWords };
            }

            return { prefix, suffix, xrefText, plain, modeInfo };
        } catch (err) {
            this.trackError('resolveSurroundFromXref', err.message);
            return null;
        }
    }

    joinDisplayParts(parts) {
        const list = (parts || []).filter((p) => this.normalizeSpace(p));
        if (!list.length) return '';
        let out = this.normalizeSpace(list[0]);
        for (let i = 1; i < list.length; i++) {
            let next = this.normalizeSpace(list[i]);
            if (!next) continue;
            // Page-like suffix without leading comma → flush ", p. 123" (no "Year p. 123")
            if (/^(pp?\.\s|\d)/i.test(next) && !/^[,;:.]/.test(next)) {
                next = `, ${next}`;
            }
            if (/^[,;:.)\]\}]/.test(next)) {
                out += next;
            } else {
                out += ` ${next}`;
            }
        }
        return this.normalizeSpace(out);
    }

    isTextDirty() {
        const { textInput } = this.elements;
        if (!textInput || !this.editState) return false;
        const next = this.normalizeSpace(textInput.value || '');
        const original = this.normalizeSpace(this.editState.originalEditableText || '');
        return next.length > 0 && next !== original;
    }

    isRidDirty() {
        if (!this.editState) return false;
        const pending = this.normalizeSpace(this.editState.pendingRid || '');
        const original = this.normalizeSpace(this.editState.rid || '');
        return pending.length > 0 && pending !== original;
    }

    isDirty() {
        return this.isTextDirty() || this.isRidDirty();
    }

    updateApplyState() {
        const { applyBtn } = this.elements;
        if (!applyBtn) return;

        const textOk = this.normalizeSpace((this.elements.textInput && this.elements.textInput.value) || '').length > 0;
        const dirty = textOk && this.isDirty();

        applyBtn.classList.toggle('disabled', !dirty);
        applyBtn.disabled = !dirty;
        this.updateWrapSelectionState();
        this.updateSameRidNavState();
    }

    /**
     * True when DOM has a wrap range (paren surround and/or pre/post siblings).
     */
    hasWrapRangeAvailable(xref) {
        if (!xref) return false;
        const modeInfo = this.detectCitationMode(xref);
        if (modeInfo && modeInfo.mode === 'indirect') return true;
        if (this.findPostXrefSurroundSibling(xref) || this.findPreXrefSurroundSibling(xref)) {
            return true;
        }
        return false;
    }

    updateWrapSelectionState() {
        try {
            const btn = this.elements && this.elements.useSelectionBtn;
            if (!btn) return;
            const roleCfg = (this.editState && this.editState.roleConfig) || null;
            if (roleCfg && roleCfg.allowWrap === false) {
                btn.disabled = true;
                btn.classList.add('disabled');
                btn.classList.add('ds-none');
                btn.title = 'Wrap selection is not available for this citation type';
                return;
            }
            btn.classList.remove('ds-none');
            const xref = this.editState && this.editState.element;
            const textDirty = this.isTextDirty();
            const rangeOk = this.hasWrapRangeAvailable(xref);
            const canWrap = rangeOk && !textDirty;
            btn.disabled = !canWrap;
            btn.classList.toggle('disabled', !canWrap);
            if (textDirty) {
                btn.title = 'Revert Display Text to enable Wrap selection';
            } else if (!rangeOk) {
                btn.title = 'No surrounding text to wrap for this citation';
            } else if (btn.textContent === EditCitationTextModule.BTN_UPDATE_WRAP) {
                btn.title = 'Re-select citation wrap in the editor and refresh Display Text';
            } else {
                btn.title = 'Select citation surround in the editor and fill Display Text';
            }
        } catch (err) {
            this.trackError('updateWrapSelectionState', err.message);
        }
    }

    /**
     * Show/hide dialog sections from the active role config.
     */
    applyRoleConfigToUi(roleConfig) {
        try {
            const cfg = roleConfig || {};
            const {
                useSelectionBtn, changeRefBtn, ridInput, linkedRefGroup,
                linkedRefLabel, refPicker, sameRidSection, dialogTitle
            } = this.elements || {};

            if (dialogTitle && cfg.dialogTitle) {
                dialogTitle.textContent = cfg.dialogTitle;
            }

            const fieldLabel = cfg.linkedFieldLabel || 'Linked reference';
            if (linkedRefLabel) {
                linkedRefLabel.textContent = fieldLabel;
            }
            if (ridInput) {
                ridInput.setAttribute('aria-label', fieldLabel);
            }

            const allowWrap = cfg.allowWrap !== false;
            if (useSelectionBtn) {
                useSelectionBtn.classList.toggle('ds-none', !allowWrap);
                if (!allowWrap) {
                    useSelectionBtn.disabled = true;
                    useSelectionBtn.classList.add('disabled');
                }
            }

            const allowChange = !!cfg.allowChangeRef;
            if (changeRefBtn) {
                changeRefBtn.classList.toggle('ds-none', !allowChange);
                changeRefBtn.disabled = !allowChange;
            }
            if (linkedRefGroup) {
                linkedRefGroup.classList.remove('ds-none');
            }
            if (!allowChange) {
                this.hideRefPicker();
            }

            const allowNav = cfg.allowSameRidNav !== false;
            if (sameRidSection) {
                sameRidSection.classList.toggle('ds-none', !allowNav);
            }
        } catch (err) {
            this.trackError('applyRoleConfigToUi', err.message);
        }
    }

    normalizeSpace(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    escapeHtml(txt) {
        const value = txt == null ? '' : String(txt);
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    sanitizeHtml(html) {
        if (!html) return '';
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        wrapper.querySelectorAll('script,style').forEach((node) => node.remove());
        wrapper.querySelectorAll('*').forEach((node) => {
            Array.from(node.attributes || []).forEach((attr) => {
                if (/^on/i.test(attr.name)) {
                    node.removeAttribute(attr.name);
                }
            });
        });
        return wrapper.innerHTML;
    }

    hasFormatting(nodeOrHtml) {
        try {
            if (!nodeOrHtml) return false;
            if (typeof nodeOrHtml === 'string') {
                const tmp = document.createElement('div');
                tmp.innerHTML = nodeOrHtml;
                return !!tmp.querySelector(EditCitationTextModule.FORMAT_SELECTOR);
            }
            if (nodeOrHtml.nodeType === 1) {
                return !!nodeOrHtml.querySelector(EditCitationTextModule.FORMAT_SELECTOR);
            }
        } catch (err) {
            this.trackError('hasFormatting', err.message);
        }
        return false;
    }

    isFormatElement(el) {
        if (!el || el.nodeType !== 1) return false;
        const tag = (el.tagName || '').toLowerCase();
        const cls = el.classList;
        const dataName = (el.getAttribute('data-name') || '').toLowerCase();
        if (tag === 'span' && (cls.contains('font') || dataName === 'font')) return true;
        if ((tag === 'em' || tag === 'i') && (cls.contains('italic') || dataName === 'italic' || tag === 'i')) return true;
        if (tag === 'b' || tag === 'strong') return true;
        if (tag === 'sup' || tag === 'sub') return true;
        return false;
    }

    /**
     * Remap plain text into existing formatting wrappers; keep empty font markers.
     * Falls back to a single text write when multi-node layout cannot hold dual-word / longer text cleanly.
     */
    buildPreservedHtml(originalHtml, newPlainText) {
        const cleanOriginal = this.sanitizeHtml(originalHtml || '');
        const nextText = newPlainText == null ? '' : String(newPlainText);
        if (!cleanOriginal) return this.escapeHtml(nextText);

        const root = document.createElement('div');
        root.innerHTML = cleanOriginal;

        if (!this.hasFormatting(root)) {
            return this.escapeHtml(nextText);
        }

        // Single format wrapper around all content
        const children = Array.from(root.childNodes).filter((n) => {
            if (n.nodeType === 3) return (n.textContent || '').trim().length > 0;
            return n.nodeType === 1;
        });
        if (children.length === 1 && children[0].nodeType === 1 && this.isFormatElement(children[0])) {
            const wrap = children[0];
            const innerHasFormat = this.hasFormatting(wrap);
            if (!innerHasFormat) {
                wrap.textContent = nextText;
            } else {
                wrap.innerHTML = this.buildPreservedHtml(wrap.innerHTML, nextText);
            }
            return root.innerHTML;
        }

        const textNodes = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let current = walker.nextNode();
        while (current) {
            textNodes.push(current);
            current = walker.nextNode();
        }

        if (!textNodes.length) {
            root.appendChild(document.createTextNode(nextText));
            return root.innerHTML;
        }

        const originalPlain = this.normalizeSpace(root.textContent || '');
        const nextPlain = this.normalizeSpace(nextText);
        const multiNode = textNodes.length > 1;
        const lengthDelta = Math.abs(nextPlain.length - originalPlain.length);
        // Dual-word / large rewrites: avoid emptying later text nodes (year, etc.).
        if (multiNode && (lengthDelta > 8 || nextPlain.split(/\s+/).length !== originalPlain.split(/\s+/).length)) {
            return this.escapeHtml(nextText);
        }

        // Put full new text in first text node; clear the rest (keep empty font markers).
        textNodes[0].textContent = nextText;
        for (let i = 1; i < textNodes.length; i++) {
            textNodes[i].textContent = '';
        }

        return root.innerHTML;
    }

    setXrefContent(node, newPlainText, options = {}) {
        const { previousHtml = '', hasFormatting = false } = options;
        if (!node) return;

        if (!hasFormatting) {
            node.textContent = newPlainText || '';
            return;
        }

        const html = this.buildPreservedHtml(previousHtml || node.innerHTML, newPlainText);
        node.innerHTML = this.sanitizeHtml(html);
    }

    getAnchorNode(node) {
        if (!node) return null;
        const parent = node.parentNode;
        return parent && (parent.tagName || '').toLowerCase() === 'insert' ? parent : node;
    }

    extractYearFromLabel(text) {
        const clean = this.normalizeSpace(text);
        if (!clean) return '';
        const last = this.findLastDateMatch(clean);
        return last ? this.normalizeSpace(last.text) : '';
    }

    extractYearFromRef(ref) {
        try {
            if (!ref) return '';
            const yearEl = ref.querySelector('.year, [data-name="year"]');
            if (yearEl) {
                const fromDom = this.normalizeSpace(yearEl.textContent || '');
                if (fromDom) return fromDom;
            }
            const mixed = ref.querySelector('.mixed-citation');
            const label = this.normalizeSpace((mixed && mixed.textContent) || ref.textContent || '');
            return this.extractYearFromLabel(label);
        } catch (err) {
            this.trackError('extractYearFromRef', err.message);
            return '';
        }
    }

    getRefInfoFromRid(rid) {
        try {
            if (!rid || typeof GlobalEditor === 'undefined' || !GlobalEditor.document || !GlobalEditor.document.$) {
                return { label: '', year: '', surname: '', contentType: 'reference' };
            }

            const firstRid = String(rid).trim().split(/\s+/)[0];
            if (!firstRid) return { label: '', year: '', surname: '', contentType: 'reference' };

            const root = GlobalEditor.document.$;
            const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(firstRid) : firstRid;
            const ref = root.querySelector(`#${escaped}`);
            if (!ref) return { label: '', year: '', surname: '', contentType: 'reference' };

            const mixed = ref.querySelector('.mixed-citation');
            const label = this.normalizeSpace((mixed && mixed.textContent) || ref.textContent || '');
            const year = this.extractYearFromRef(ref) || this.extractYearFromLabel(label);
            const surname = this.extractSurnameFromRef(ref, label);
            return { label, year, surname, contentType: 'reference', id: firstRid };
        } catch (err) {
            this.trackError('getRefInfoFromRid', err.message);
            return { label: '', year: '', surname: '', contentType: 'reference' };
        }
    }

    /**
     * Resolve target element by first rid token.
     */
    getTargetByRid(rid) {
        try {
            if (!rid || typeof GlobalEditor === 'undefined' || !GlobalEditor.document || !GlobalEditor.document.$) {
                return null;
            }
            const firstRid = String(rid).trim().split(/\s+/)[0];
            if (!firstRid) return null;
            const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(firstRid) : firstRid;
            return GlobalEditor.document.$.querySelector(`#${escaped}`);
        } catch (err) {
            this.trackError('getTargetByRid', err.message);
            return null;
        }
    }

    /**
     * Plain linked label text: drop target / PI / empty format noise; keep readable words.
     */
    getPlainLinkedText(node) {
        try {
            if (!node) return '';
            const clone = node.cloneNode(true);

            // Editor maps XML PIs / targets to classed elements; strip those entirely.
            clone.querySelectorAll('target, [data-name="target"], .target, .PageID, .center, .format').forEach((el) => el.remove());

            // Unwrap formatting wrappers so readable text remains.
            const formatEls = Array.from(clone.querySelectorAll(
                'span.font, span[data-name="font"], .font, '
                + 'em.italic, em[data-name="italic"], i, b, strong, '
                + 'sup.sup, sup[data-name="sup"], sub.sub, sub[data-name="sub"]'
            ));
            // Deepest-first so nested wrappers unwrap cleanly.
            formatEls.reverse().forEach((el) => {
                const parent = el.parentNode;
                if (!parent) return;
                while (el.firstChild) {
                    parent.insertBefore(el.firstChild, el);
                }
                el.remove();
            });

            const walker = document.createTreeWalker(
                clone,
                NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_COMMENT
            );
            const noise = [];
            let cur = walker.nextNode();
            while (cur) {
                noise.push(cur);
                cur = walker.nextNode();
            }
            noise.forEach((n) => {
                if (n.parentNode) n.parentNode.removeChild(n);
            });

            const hasLabel = clone.hasAttribute("data-label") || clone.querySelector('[data-label]') || clone.querySelector('.label');
            const labValue = hasLabel ? (clone.getAttribute("data-label") || clone.querySelector('[data-label]')?.getAttribute("data-label") || clone.querySelector('.label')?.textContent || '') : '';

            const beforeNormalize = labValue ? `${labValue}: ${clone.textContent || ''}` : (clone.textContent || '');
            const finalText = this.normalizeSpace(beforeNormalize);

            return finalText;
        } catch (err) {
            this.trackError('getPlainLinkedText', err.message);
            return this.normalizeSpace((node && node.textContent) || '');
        }
    }

    findDirectChildTitle(target) {
        if (!target || !target.children) return null;
        for (let i = 0; i < target.children.length; i++) {
            const child = target.children[i];
            const cls = child.className || '';
            const dataName = child.getAttribute('data-name') || '';
            if (cls === 'title' || dataName === 'title' || (typeof cls === 'string' && cls.split(/\s+/).includes('title'))) {
                return child;
            }
        }
        return null;
    }

    getTitleInfoFromRid(rid) {
        try {
            const firstRid = String(rid || '').trim().split(/\s+/)[0] || '';
            const target = this.getTargetByRid(rid);
            if (!target) {
                return { label: firstRid, year: '', surname: '', contentType: 'title', id: firstRid };
            }

            let titleEl = this.findDirectChildTitle(target);
            if (!titleEl) {
                titleEl = target.querySelector('.book-part-meta .title-group .title')
                    || target.querySelector('.title-group .title')
                    || target.querySelector('[data-name="title"]')
                    || target.querySelector('.title');
            }

            const label = this.getPlainLinkedText(titleEl || target) || firstRid;
            return { label, year: '', surname: '', contentType: 'title', id: firstRid };
        } catch (err) {
            this.trackError('getTitleInfoFromRid', err.message);
            const firstRid = String(rid || '').trim().split(/\s+/)[0] || '';
            return { label: firstRid, year: '', surname: '', contentType: 'title', id: firstRid };
        }
    }

    getCaptionInfoFromRid(rid) {
        try {
            const firstRid = String(rid || '').trim().split(/\s+/)[0] || '';
            const target = this.getTargetByRid(rid);
            if (!target) {
                return { label: firstRid, year: '', surname: '', contentType: 'caption', id: firstRid };
            }

            const caption = target.querySelector('.caption, [data-name="caption"]');
            let source = null;
            if (caption) {
                source = caption.querySelector('.title, [data-name="title"]')
                    || caption.querySelector('.p, [data-name="p"]')
                    || caption;
            }
            if (!source) {
                // boxed-text often has a direct title when caption is absent
                source = this.findDirectChildTitle(target)
                    || target.querySelector('.title, [data-name="title"]');
            }

            const label = this.getPlainLinkedText(source || target) || firstRid;
            return { label, year: '', surname: '', contentType: 'caption', id: firstRid };
        } catch (err) {
            this.trackError('getCaptionInfoFromRid', err.message);
            const firstRid = String(rid || '').trim().split(/\s+/)[0] || '';
            return { label: firstRid, year: '', surname: '', contentType: 'caption', id: firstRid };
        }
    }

    /**
     * Role-aware linked target info for the Linked field.
     * bibr → bibliographic; title roles → title; caption roles → caption.
     */
    getLinkedTargetInfo(rid, roleConfig = null) {
        const cfg = roleConfig || (this.editState && this.editState.roleConfig) || {};
        const contentType = cfg.linkedContentType || (cfg.role === 'bibr' || cfg.canonicalRole === 'bibr' ? 'reference' : '');

        if (contentType === 'title') return this.getTitleInfoFromRid(rid);
        if (contentType === 'caption') return this.getCaptionInfoFromRid(rid);
        return this.getRefInfoFromRid(rid);
    }

    /**
     * Format Linked field display value (year-aware only for bibliographic).
     */
    formatLinkedDisplayLabel(info, rid, roleConfig = null) {
        const cfg = roleConfig || {};
        const contentType = (info && info.contentType)
            || cfg.linkedContentType
            || 'reference';
        const full = this.normalizeSpace((info && info.label) || rid || '');
        if (!full) return '';
        if (contentType === 'reference') {
            return this.formatRefDisplayLabel(full, info && info.year);
        }
        return this.truncateLabel(full);
    }

    setLinkedFieldDisplay(info, rid, roleConfig = null) {
        const { ridInput } = this.elements || {};
        if (!ridInput) return;
        const full = this.normalizeSpace((info && info.label) || rid || '');
        ridInput.value = this.formatLinkedDisplayLabel(info, rid, roleConfig);
        ridInput.title = full;
    }

    extractSurnameFromRef(ref, label = '') {
        try {
            if (ref) {
                const scope = ref.querySelector('.mixed-citation') || ref;
                const nameEl = scope.querySelector(
                    "[person-group-type='author'] .surname, [person-group-type='author'] .anonymous, " +
                    "[person-group-type='author'] .collab, .surname, .anonymous, .collab"
                );
                if (nameEl) {
                    const fromDom = this.normalizeSpace(nameEl.textContent || '');
                    if (fromDom) return fromDom;
                }
            }

            const clean = this.normalizeSpace(label);
            if (!clean) return '';
            // Take text before first year as author fragment; keep multi-word surnames.
            const yearMatch = /\b\d{4}[a-z]?(?:\s*[\-–]\s*\d{2,4})?/i.exec(clean);
            const beforeYear = yearMatch ? clean.slice(0, yearMatch.index) : clean;
            const authorChunk = this.normalizeSpace(beforeYear.replace(/[,;:.]+$/g, ''));
            if (!authorChunk) return '';
            // Prefer last comma-separated author token when list-like ("Smith, J. Title…").
            const parts = authorChunk.split(',').map((p) => this.normalizeSpace(p)).filter(Boolean);
            return parts[0] || authorChunk;
        } catch (err) {
            this.trackError('extractSurnameFromRef', err.message);
            return '';
        }
    }

    /**
     * Build short Name & Date display: "Surname, Year" (supports dual-word surnames).
     */
    buildNameDateDisplay(surname, year, fallbackLabel = '') {
        const name = this.normalizeSpace(surname);
        const yr = this.normalizeSpace(year);
        if (name && yr) return `${name}, ${yr}`;
        if (name) return name;
        if (yr) return yr;
        const label = this.normalizeSpace(fallbackLabel);
        if (!label) return '';
        const extractedYear = this.extractYearFromLabel(label);
        const extractedName = this.extractSurnameFromRef(null, label);
        if (extractedName && extractedYear) return `${extractedName}, ${extractedYear}`;
        return label;
    }

    extractTrailingPageSuffix(displayText) {
        const clean = this.normalizeSpace(displayText);
        if (!clean) return '';
        const match = /\b(pp?\.\s*[\d\-–]+(?:\s*[,;]\s*[\d\-–]+)*)$/i.exec(clean);
        return match ? this.normalizeSpace(match[1]) : '';
    }

    /**
     * After Change reference: refresh Display Text to new Surname, Year (keep trailing p./pp. if present).
     */
    refreshDisplayTextForRelink(info) {
        const { textInput } = this.elements;
        if (!textInput || !this.editState) return;

        const current = this.normalizeSpace(textInput.value || '');
        const pageSuffix = this.extractTrailingPageSuffix(current);
        let next = this.buildNameDateDisplay(info.surname, info.year, info.label || '');
        if (!next) next = this.normalizeSpace(info.label || this.editState.pendingRid || '');

        if (pageSuffix) {
            next = `${next}, ${pageSuffix}`;
        }

        // Indirect: keep see/cf./compare prefix when present.
        if (this.editState.mode === 'indirect') {
            const prefixMatch = /^(see(?:\s+also)?|cf\.?|compare)\s+/i.exec(current);
            if (prefixMatch) {
                next = `${this.normalizeSpace(prefixMatch[1])} ${next}`;
            }
        }

        textInput.value = next;
    }

    getRefLabelFromRid(rid) {
        return this.getRefInfoFromRid(rid).label || '';
    }

    truncateLabel(text, max = EditCitationTextModule.REF_LABEL_MAX) {
        const clean = this.normalizeSpace(text);
        if (!clean) return '';
        if (clean.length <= max) return clean;
        return `${clean.slice(0, max - 3)}...`;
    }

    /**
     * Truncate ref label for UI while always keeping the publication year visible.
     */
    formatRefDisplayLabel(label, year, max = EditCitationTextModule.REF_LABEL_MAX) {
        const clean = this.normalizeSpace(label);
        if (!clean) return '';
        if (clean.length <= max) return clean;

        const yearText = this.normalizeSpace(year || this.extractYearFromLabel(clean));
        if (!yearText) {
            return this.truncateLabel(clean, max);
        }

        // Already ends with year — truncate head, keep year at end.
        const yearSuffix = ` ${yearText}`;
        const endsWithYear = clean.slice(-yearText.length) === yearText ||
            clean.toLowerCase().endsWith(yearText.toLowerCase());

        if (yearSuffix.length >= max) {
            return yearText.length <= max ? yearText : yearText.slice(0, max);
        }

        if (endsWithYear) {
            const bodyBudget = max - yearSuffix.length - 3;
            if (bodyBudget <= 0) return `...${yearText}`;
            const withoutYear = clean.slice(0, Math.max(0, clean.length - yearText.length)).replace(/\s+$/, '');
            if (withoutYear.length <= bodyBudget) {
                return `${withoutYear}${yearSuffix}`;
            }
            return `${withoutYear.slice(0, bodyBudget)}...${yearSuffix}`;
        }

        // Year not at end — append year after truncated head.
        const headBudget = max - yearSuffix.length - 3;
        if (headBudget <= 0) return `...${yearText}`;
        return `${clean.slice(0, headBudget)}...${yearSuffix}`;
    }

    collectReferenceCatalog() {
        const list = [];
        try {
            if (typeof GlobalEditor === 'undefined' || !GlobalEditor.document || !GlobalEditor.document.$) {
                return list;
            }
            const root = GlobalEditor.document.$;
            const refs = root.querySelectorAll('div.ref:not([data-remove]), .ref:not([data-remove])');
            const seen = new Set();
            refs.forEach((ref) => {
                const id = ref.getAttribute('id') || '';
                if (!id || seen.has(id)) return;
                seen.add(id);
                const mixed = ref.querySelector('.mixed-citation');
                const label = this.normalizeSpace((mixed && mixed.textContent) || ref.textContent || '') || id;
                const year = this.extractYearFromRef(ref) || this.extractYearFromLabel(label);
                list.push({ id, label, year });
            });
        } catch (err) {
            this.trackError('collectReferenceCatalog', err.message);
        }
        return list;
    }

    renderRefList(filter = '') {
        const { refList } = this.elements;
        if (!refList) return;

        const q = this.normalizeSpace(filter).toLowerCase();
        const pending = (this.editState && this.editState.pendingRid) || '';
        const firstPending = pending.trim().split(/\s+/)[0] || '';

        const items = (this._refCatalog || []).filter((item) => {
            if (!q) return true;
            const year = (item.year || '').toLowerCase();
            return item.id.toLowerCase().includes(q) ||
                item.label.toLowerCase().includes(q) ||
                year.includes(q);
        });

        if (!items.length) {
            refList.innerHTML = '<div class="text-muted small p-1">No references found</div>';
            return;
        }

        refList.innerHTML = items.map((item) => {
            const selected = item.id === firstPending ? ' selected' : '';
            const trunc = this.escapeHtml(this.formatRefDisplayLabel(item.label, item.year, 60));
            const full = this.escapeHtml(item.label);
            const idEsc = this.escapeHtml(item.id);
            return `<button type="button" role="option" class="btn btn-sm text-left w-100 text-truncate cite-ref-option${selected}" data-rid="${idEsc}" title="${full}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${trunc}</button>`;
        }).join('');
    }

    toggleRefPicker() {
        try {
            const roleCfg = this.editState && this.editState.roleConfig;
            if (roleCfg && !roleCfg.allowChangeRef) return;

            const { refPicker, refFilter, changeRefBtn } = this.elements;
            if (!refPicker) return;

            const rid = (this.editState && this.editState.rid) || '';
            if (/\s/.test(rid.trim())) {
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('Multi-reference citation: use Edit Citation to change links', { type: 'info' });
                }
                return;
            }

            const opening = refPicker.classList.contains('ds-none');
            if (opening) {
                this._refCatalog = this.collectReferenceCatalog();
                this.renderRefList((refFilter && refFilter.value) || '');
                refPicker.classList.remove('ds-none');
                if (refFilter) {
                    refFilter.focus();
                }
            } else {
                refPicker.classList.add('ds-none');
            }

            if (changeRefBtn) {
                changeRefBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
            }
        } catch (err) {
            this.trackError('toggleRefPicker', err.message);
        }
    }

    hideRefPicker() {
        const { refPicker, changeRefBtn, refFilter } = this.elements;
        if (refPicker) refPicker.classList.add('ds-none');
        if (changeRefBtn) changeRefBtn.setAttribute('aria-expanded', 'false');
        if (refFilter) refFilter.value = '';
    }

    onRefFilterInput() {
        try {
            const { refFilter } = this.elements;
            this.renderRefList((refFilter && refFilter.value) || '');
        } catch (err) {
            this.trackError('onRefFilterInput', err.message);
        }
    }

    onRefListClick(e) {
        try {
            const btn = e.target && e.target.closest ? e.target.closest('.cite-ref-option') : null;
            if (!btn || !this.editState) return;

            const rid = btn.getAttribute('data-rid') || '';
            if (!rid) return;

            this.editState.pendingRid = rid;
            this.editState.pendingHref = `#${rid}`;
            this.formModified = true;

            const info = this.getRefInfoFromRid(rid);
            this.setLinkedFieldDisplay(info, rid, this.editState.roleConfig);

            this.refreshDisplayTextForRelink(info);
            this.renderRefList((this.elements.refFilter && this.elements.refFilter.value) || '');
            this.hideRefPicker();
            this.updateApplyState();
            this.renderSameRidSection();
        } catch (err) {
            this.trackError('onRefListClick', err.message);
        }
    }

    /**
     * Prefer bibliographic '(' over '['/'{' so reprint years like [1848] are not
     * mistaken for citation wrappers: (Thackeray [1848] 1950, 25).
     */
    findOpenWrapperIndex(txt) {
        const s = String(txt || '');
        const paren = s.lastIndexOf('(');
        if (paren >= 0) return paren;
        const bracket = s.lastIndexOf('[');
        const brace = s.lastIndexOf('{');
        return Math.max(bracket, brace);
    }

    matchingCloseChar(openChar) {
        if (openChar === '(') return ')';
        if (openChar === '[') return ']';
        if (openChar === '{') return '}';
        return '';
    }

    findWrapperBefore(anchorNode) {
        let prev = anchorNode ? anchorNode.previousSibling : null;
        while (prev) {
            if (prev.nodeType === 3) {
                const txt = prev.textContent || '';
                const idx = this.findOpenWrapperIndex(txt);
                if (idx >= 0) {
                    return {
                        node: prev,
                        index: idx,
                        char: txt[idx]
                    };
                }
            }
            if (prev.nodeType === 1 && prev.querySelector && prev.querySelector('a.xref')) {
                return null;
            }
            prev = prev.previousSibling;
        }
        return null;
    }

    /**
     * Find closing wrapper after xref. When openChar is set, match that pair only
     * (so ']' from a reprint year does not win over outer ')').
     */
    findWrapperAfter(anchorNode, openChar = null) {
        const wantClose = openChar ? this.matchingCloseChar(openChar) : '';
        let next = anchorNode ? anchorNode.nextSibling : null;
        while (next) {
            if (next.nodeType === 3) {
                const txt = next.textContent || '';
                if (wantClose) {
                    const idx = txt.indexOf(wantClose);
                    if (idx >= 0) {
                        return {
                            node: next,
                            index: idx,
                            char: wantClose
                        };
                    }
                } else {
                    const closeMatch = txt.match(/[\)\]\}]/);
                    if (closeMatch) {
                        return {
                            node: next,
                            index: closeMatch.index,
                            char: closeMatch[0]
                        };
                    }
                }
            }
            if (next.nodeType === 1 && next.querySelector && next.querySelector('a.xref')) {
                return null;
            }
            next = next.nextSibling;
        }
        return null;
    }

    isMatchingWrapper(openChar, closeChar) {
        const pair = `${openChar || ''}${closeChar || ''}`;
        return ['()', '[]', '{}'].includes(pair);
    }

    detectCitationMode(node) {
        try {
            const anchor = this.getAnchorNode(node);
            if (!anchor || !anchor.parentNode) return { mode: 'direct' };

            const openInfo = this.findWrapperBefore(anchor);
            if (!openInfo) return { mode: 'direct' };

            const closeInfo = this.findWrapperAfter(anchor, openInfo.char);

            if (!closeInfo || !this.isMatchingWrapper(openInfo.char, closeInfo.char)) {
                return { mode: 'direct' };
            }

            const prevText = openInfo.node.textContent || '';
            const nextText = closeInfo.node.textContent || '';
            const prefix = this.normalizeSpace(prevText.slice(openInfo.index + 1));
            const suffix = this.normalizeSpace(nextText.slice(0, closeInfo.index));

            return {
                mode: 'indirect',
                anchor,
                openInfo,
                closeInfo,
                prefix,
                suffix
            };
        } catch (err) {
            this.trackError('detectCitationMode', err.message);
            return { mode: 'direct' };
        }
    }

    composeEditableText(modeInfo, xrefText) {
        if (!modeInfo || modeInfo.mode !== 'indirect') {
            return this.normalizeSpace(xrefText || '');
        }

        return this.joinDisplayParts([
            modeInfo.prefix,
            this.normalizeSpace(xrefText),
            modeInfo.suffix
        ]);
    }

    splitEditedTextByMode(value, mode, options = {}) {
        const raw = this.normalizeSpace(value);
        if (!raw) return { prefix: '', xrefText: '', suffix: '' };

        const writeSurround = !!options.writeSurround;
        const originalText = this.normalizeSpace(options.originalText || '');
        const surroundPrefix = this.normalizeSpace(options.surroundPrefix || '');
        const surroundSuffix = this.normalizeSpace(options.surroundSuffix || '');

        // Xref-only apply: entire Display Text is the citation body.
        if (!writeSurround) {
            return { prefix: '', xrefText: raw, suffix: '' };
        }

        // Trust originalText as xref body only when it ends at a date / n.d. (no page folded in).
        if (originalText) {
            const idx = raw.toLowerCase().indexOf(originalText.toLowerCase());
            if (idx >= 0) {
                const origDate = this.findLastDateMatch(originalText);
                const origDateEnd = origDate ? this.dateMatchEndIndex(originalText, origDate) : 0;
                const citeDateBounded = origDate
                    && this.normalizeSpace(originalText.slice(origDateEnd)) === '';
                if (citeDateBounded) {
                    return {
                        prefix: this.normalizeSpace(raw.slice(0, idx)),
                        xrefText: raw.slice(idx, idx + originalText.length),
                        suffix: this.normalizeSpace(raw.slice(idx + originalText.length))
                    };
                }
            }
        }

        if (surroundPrefix && raw.toLowerCase().startsWith(surroundPrefix.toLowerCase())) {
            const body = this.normalizeSpace(raw.slice(surroundPrefix.length));
            const dateMatch = this.findLastDateMatch(body);
            if (dateMatch) {
                const end = this.dateMatchEndIndex(body, dateMatch);
                return {
                    prefix: surroundPrefix,
                    xrefText: this.normalizeSpace(body.slice(0, end)),
                    suffix: this.normalizeSpace(body.slice(end))
                };
            }
            if (surroundSuffix && body.toLowerCase().endsWith(surroundSuffix.toLowerCase())) {
                return {
                    prefix: surroundPrefix,
                    xrefText: this.normalizeSpace(body.slice(0, body.length - surroundSuffix.length)),
                    suffix: surroundSuffix
                };
            }
        }

        let prefix = '';
        let body = raw;
        const prefixMatch = /^(see(?:\s+also)?|cf\.?|compare)\s+/i.exec(raw);
        if (prefixMatch) {
            prefix = this.normalizeSpace(prefixMatch[1]);
            body = raw.slice(prefixMatch[0].length);
        }

        const dateMatch = this.findLastDateMatch(body);
        if (!dateMatch) {
            // Fall back to selection-captured xref body when date missing.
            if (originalText) {
                const idx = body.toLowerCase().indexOf(originalText.toLowerCase());
                if (idx >= 0) {
                    return {
                        prefix: this.normalizeSpace(`${prefix} ${body.slice(0, idx)}`),
                        xrefText: body.slice(idx, idx + originalText.length),
                        suffix: this.normalizeSpace(body.slice(idx + originalText.length))
                    };
                }
            }
            return {
                prefix,
                xrefText: this.normalizeSpace(body),
                suffix: ''
            };
        }

        const end = this.dateMatchEndIndex(body, dateMatch);
        const xrefText = this.normalizeSpace(body.slice(0, end));
        const suffix = this.normalizeSpace(body.slice(end));

        return { prefix, xrefText, suffix };
    }

    formatSuffixText(suffix) {
        if (!suffix) return '';
        let clean = this.normalizeSpace(String(suffix).replace(/^\s+/, ''));
        if (!clean) return '';
        // Always flush: never produce " , p." — comma (or punct) then single space + rest.
        if (/^[,;:.]/.test(clean)) {
            return clean.replace(/^([,;:.])\s*/, '$1 ');
        }
        return `, ${clean}`;
    }

    /**
     * Remove pure-whitespace text nodes adjacent to xref so suffix starts flush (", p.").
     */
    removeAdjacentWhitespaceTextNodes(xref, side = 'after') {
        if (!xref || !xref.parentNode) return;
        let sibling = side === 'after' ? xref.nextSibling : xref.previousSibling;
        while (sibling && sibling.nodeType === 3 && !/\S/.test(sibling.textContent || '')) {
            const drop = sibling;
            sibling = side === 'after' ? sibling.nextSibling : sibling.previousSibling;
            if (drop.parentNode) drop.parentNode.removeChild(drop);
        }
    }

    insertAfter(referenceNode, newNode) {
        if (!referenceNode || !referenceNode.parentNode || !newNode) return;
        const parent = referenceNode.parentNode;
        if (referenceNode.nextSibling) {
            parent.insertBefore(newNode, referenceNode.nextSibling);
        } else {
            parent.appendChild(newNode);
        }
    }



    applyTrackedTextReplacement({
        parent,
        referenceNode,
        oldText,
        newText,
        place = 'after',
        trackCode = EditCitationTextModule.TRACK_CODE_INDIRECT,
        trackDelCode = EditCitationTextModule.TRACK_CODE_LEGACY_DEL,
    }) {
        try {
            if (!parent || !referenceNode) return;
            if (!this.trackManager) {
                this.trackManager = window._trackManager || new trackManager(GlobalEditor);
            }

            const prev = oldText || '';
            const next = newText || '';
            if (prev === next) return;

            if (place === 'before') {
                if (prev) {
                    const delDom = this.trackManager.getDelNode();
                    delDom.textContent = prev;
                    delDom.setAttribute('data-track-code', trackDelCode);
                    parent.insertBefore(delDom, referenceNode);
                }
                if (next) {
                    const insDom = this.trackManager.getInsNode();
                    insDom.textContent = next;
                    insDom.setAttribute('data-track-code', trackCode);
                    parent.insertBefore(insDom, referenceNode);
                }
                return;
            }

            let cursor = referenceNode;
            if (prev) {
                const delDom = this.trackManager.getDelNode();
                delDom.textContent = prev;
                delDom.setAttribute('data-track-code', trackDelCode);
                this.insertAfter(cursor, delDom);
                cursor = delDom;
            }
            if (next) {
                const insDom = this.trackManager.getInsNode();
                insDom.textContent = next;
                insDom.setAttribute('data-track-code', trackCode);
                this.insertAfter(cursor, insDom);
            }
        } catch (err) {
            this.trackError('applyTrackedTextReplacement', err.message);
        }
    }

    setPrefixText(modeInfo, prefix) {
        if (!modeInfo || modeInfo.mode !== 'indirect' || !modeInfo.openInfo || !modeInfo.openInfo.node) {
            return;
        }

        const node = modeInfo.openInfo.node;
        const txt = node.textContent || '';
        const left = txt.slice(0, modeInfo.openInfo.index + 1);
        const oldSegment = txt.slice(modeInfo.openInfo.index + 1);
        const newSegment = prefix ? `${prefix} ` : '';

        if (oldSegment === newSegment) return;

        node.textContent = left;
        this.applyTrackedTextReplacement({
            parent: node.parentNode,
            referenceNode: node,
            oldText: oldSegment,
            newText: newSegment,
            place: 'after',
            trackCode: EditCitationTextModule.TRACK_CODE_INDIRECT
        });
    }

    setSuffixText(modeInfo, suffix) {
        if (!modeInfo || modeInfo.mode !== 'indirect' || !modeInfo.closeInfo || !modeInfo.closeInfo.node) {
            return;
        }

        const node = modeInfo.closeInfo.node;
        const txt = node.textContent || '';
        const right = txt.slice(modeInfo.closeInfo.index);
        const oldSegment = txt.slice(0, modeInfo.closeInfo.index);
        const newSegment = this.formatSuffixText(suffix);

        if (oldSegment === newSegment) return;

        node.textContent = right;
        this.applyTrackedTextReplacement({
            parent: node.parentNode,
            referenceNode: node,
            oldText: oldSegment,
            newText: newSegment,
            place: 'before',
            trackCode: EditCitationTextModule.TRACK_CODE_INDIRECT
        });
    }

    /**
     * Find non-xref sibling after a.xref that holds surround (page, etc.).
     * Skips empty text; stops before another bibliographic xref.
     */
    findPostXrefSurroundSibling(xref) {
        if (!xref) return null;
        let next = xref.nextSibling;
        while (next) {
            if (next.nodeType === 3) {
                const text = this.normalizeSpace(next.textContent || '');
                if (text) {
                    return { node: next, text, kind: 'text' };
                }
            } else if (next.nodeType === 1) {
                if (next.classList && next.classList.contains('xref')) break;
                if (next.querySelector && next.querySelector('a.xref')) break;
                const tag = (next.tagName || '').toLowerCase();
                const text = this.normalizeSpace(next.textContent || '');
                if (text && (tag === 'insert' || tag === 'del' || tag === 'span')) {
                    return { node: next, text, kind: tag };
                }
            }
            next = next.nextSibling;
        }
        return null;
    }

    findPreXrefSurroundSibling(xref) {
        if (!xref) return null;
        let prev = xref.previousSibling;
        while (prev) {
            if (prev.nodeType === 3) {
                const text = this.normalizeSpace(prev.textContent || '');
                if (text) {
                    return { node: prev, text, kind: 'text' };
                }
            } else if (prev.nodeType === 1) {
                if (prev.classList && prev.classList.contains('xref')) break;
                if (prev.querySelector && prev.querySelector('a.xref')) break;
                const tag = (prev.tagName || '').toLowerCase();
                const text = this.normalizeSpace(prev.textContent || '');
                if (text && (tag === 'insert' || tag === 'del' || tag === 'span')) {
                    return { node: prev, text, kind: tag };
                }
            }
            prev = prev.previousSibling;
        }
        return null;
    }

    isXrefParentInsert(xref) {
        return !!(xref && xref.parentNode
            && (xref.parentNode.tagName || '').toLowerCase() === 'insert');
    }

    /**
     * Prefer sibling-of-xref surround when page lives (or should live) next to the link,
     * especially under an existing <insert>. Classic `( xref )` paren text still uses setSuffixText.
     */
    shouldUseXrefSiblingSurround(xref, modeInfo) {
        if (!xref) return false;
        if (this.isXrefParentInsert(xref)) return true;
        if (this.findPostXrefSurroundSibling(xref) || this.findPreXrefSurroundSibling(xref)) {
            // Paren close may share the same text node as ", p. 234)" — use setSuffixText then.
            const sib = this.findPostXrefSurroundSibling(xref);
            if (sib && modeInfo && modeInfo.closeInfo && modeInfo.closeInfo.node === sib.node) {
                return false;
            }
            return true;
        }
        if (!modeInfo || !modeInfo.closeInfo) return true;
        return false;
    }

    /**
     * Write/update page (and similar) as sibling text of a.xref — never a second xref.
     * When parent is <insert>, keeps surround inside that same insert.
     */
    writeXrefSiblingSurround(xref, prefix, suffix) {
        try {
            if (!xref || !xref.parentNode) return;
            if (!this.trackManager) {
                this.trackManager = window._trackManager || new trackManager(GlobalEditor);
            }

            const parent = xref.parentNode;
            const nextSuffix = this.formatSuffixText(suffix);
            const nextPrefix = prefix ? `${this.normalizeSpace(prefix)} ` : '';

            const post = this.findPostXrefSurroundSibling(xref);
            if (nextSuffix) {
                this.removeAdjacentWhitespaceTextNodes(xref, 'after');
                if (post && this.normalizeSpace(post.text) === this.normalizeSpace(nextSuffix)) {
                    // Heal leading space in same text node (` , p.` → `, p.`)
                    if ((post.node.textContent || '') !== nextSuffix) {
                        post.node.textContent = nextSuffix;
                    }
                } else if (post) {
                    const oldPlain = post.node.textContent || '';
                    if (post.node.parentNode) {
                        post.node.parentNode.removeChild(post.node);
                    }
                    this.removeAdjacentWhitespaceTextNodes(xref, 'after');
                    this.applyTrackedTextReplacement({
                        parent,
                        referenceNode: xref,
                        oldText: oldPlain,
                        newText: nextSuffix,
                        place: 'after',
                        trackCode: EditCitationTextModule.TRACK_CODE_INDIRECT
                    });
                } else {
                    this.applyTrackedTextReplacement({
                        parent,
                        referenceNode: xref,
                        oldText: '',
                        newText: nextSuffix,
                        place: 'after',
                        trackCode: EditCitationTextModule.TRACK_CODE_INDIRECT
                    });
                }
            }

            const pre = this.findPreXrefSurroundSibling(xref);
            if (nextPrefix) {
                this.removeAdjacentWhitespaceTextNodes(xref, 'before');
                if (pre && this.normalizeSpace(pre.text) === this.normalizeSpace(nextPrefix)) {
                    // unchanged
                } else if (pre) {
                    const oldPlain = pre.node.textContent || '';
                    if (pre.node.parentNode) {
                        pre.node.parentNode.removeChild(pre.node);
                    }
                    this.removeAdjacentWhitespaceTextNodes(xref, 'before');
                    this.applyTrackedTextReplacement({
                        parent,
                        referenceNode: xref,
                        oldText: oldPlain,
                        newText: nextPrefix,
                        place: 'before',
                        trackCode: EditCitationTextModule.TRACK_CODE_INDIRECT
                    });
                } else {
                    this.applyTrackedTextReplacement({
                        parent,
                        referenceNode: xref,
                        oldText: '',
                        newText: nextPrefix,
                        place: 'before',
                        trackCode: EditCitationTextModule.TRACK_CODE_INDIRECT
                    });
                }
            }
        } catch (err) {
            this.trackError('writeXrefSiblingSurround', err.message);
        }
    }

    /**
     * Resolve the xref node under cursor / selection.
     * @param {CKEDITOR.dom.element|Element|null} xrefNode
     * @returns {Element|null}
     */
    resolveXrefNode(xrefNode) {
        try {
            if (xrefNode) {
                const el = xrefNode.$ || xrefNode;
                if (el && el.nodeType === 1) {
                    if (el.classList && el.classList.contains('xref')) return el;
                    const inner = el.closest ? el.closest('a.xref') : null;
                    if (inner) return inner;
                }
            }

            if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION.NODE) {
                const n = IMPACT_SELECTION.NODE.$ || IMPACT_SELECTION.NODE;
                if (n && n.nodeType === 1) {
                    if (n.classList && n.classList.contains('xref')) return n;
                    const ascent = n.closest ? n.closest('a.xref') : null;
                    if (ascent) return ascent;
                }
            }

            if (typeof GlobalEditor !== 'undefined' && GlobalEditor.getSelection) {
                const start = GlobalEditor.getSelection().getStartElement();
                if (start) {
                    const a = start.getAscendant('a', true);
                    if (a && a.hasClass && a.hasClass('xref')) return a.$;
                }
            }
        } catch (err) {
            this.trackError('resolveXrefNode', err.message);
        }
        return null;
    }

    showBefore(IsEdit, xrefNode) {
        try {
            const node = this.resolveXrefNode(xrefNode);
            if (!node) {
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('No citation selected', { type: 'warning' });
                }
                return false;
            }
            const roleConfig = EditCitationTextModule.resolveRoleConfig(node);
            if (!roleConfig) {
                return false;
            }
            this._pendingXref = node;
            this._pendingRoleConfig = roleConfig;
            return true;
        } catch (err) {
            this.trackError('showBefore', err.message);
            return false;
        }
    }

    showLoop(IsEdit, xrefNode, options = {}) {
        try {
            this.editMode = !!IsEdit;
            this.formModified = false;
            EditCitationTextModule.publishRoleConfigToWindow();

            if (!this.trackManager) {
                this.trackManager = window._trackManager || new trackManager(GlobalEditor);
            }

            this.initializeElements();
            this.setupEventListeners();
            this.hideRefPicker();

            const node = this._pendingXref || this.resolveXrefNode(xrefNode);
            this._pendingXref = null;

            if (!node) {
                this.closeDialog();
                return;
            }

            const roleConfig = this._pendingRoleConfig
                || EditCitationTextModule.resolveRoleConfig(node);
            this._pendingRoleConfig = null;
            if (!roleConfig) {
                this.closeDialog();
                return;
            }

            const modeInfo = this.detectCitationMode(node);
            const originalHtml = node.innerHTML || '';
            const originalText = this.normalizeSpace(node.textContent || '');
            // Default Display Text is xref-only (never auto-compose surround).
            const originalEditableText = originalText;
            const hasFormatting = this.hasFormatting(node);
            const rid = node.getAttribute('rid') || '';
            const href = node.getAttribute('href') || '';
            const linkedInfo = this.getLinkedTargetInfo(rid, roleConfig);

            this.editState = {
                element: node,
                mode: modeInfo.mode || 'direct',
                modeInfo,
                roleConfig,
                originalText,
                originalEditableText,
                originalHtml,
                hasFormatting,
                rangeSelected: false,
                surroundPrefix: modeInfo.prefix || '',
                surroundSuffix: modeInfo.suffix || '',
                rid,
                href,
                pendingRid: rid,
                pendingHref: href,
                refType: node.getAttribute('ref-type') || '',
                dataRole: node.getAttribute('data-role') || ''
            };

            this._lastAppliedSelection = '';
            this.setUseSelectionButtonLabel(EditCitationTextModule.BTN_WRAP_SELECTION);
            this.bindEditorSelectionListener();

            if (this.elements.textInput) {
                this.elements.textInput.value = originalEditableText;
            }
            this.setLinkedFieldDisplay(linkedInfo, rid, roleConfig);

            this.applyRoleConfigToUi(roleConfig);
            this.updateApplyState();
            this.updateWrapSelectionState();
            if (roleConfig.allowSameRidNav !== false) {
                this.renderSameRidSection();
            }

            if (!options.fromSameRidNav && this.elements.textInput) {
                this.elements.textInput.focus();
                this.elements.textInput.select();
            }
        } catch (err) {
            console.warn(err.message);
            this.trackError('showLoop', err.message);
        }
    }

    getTrackingCode(mode = 'direct', { ridChanged = false, textChanged = false } = {}) {
        if (ridChanged && !textChanged) return EditCitationTextModule.TRACK_CODE_RELINK;
        if (mode === 'indirect') return EditCitationTextModule.TRACK_CODE_INDIRECT;
        if (mode === 'direct') return EditCitationTextModule.TRACK_CODE_DIRECT;
        return EditCitationTextModule.TRACK_CODE_LEGACY;
    }

    /**
     * Attributes applied on edit — structure preserved except intentional rid/href.
     */
    buildEditAttributes(mode, { ridChanged = false, textChanged = false } = {}) {
        const keys = ['dt', 'drn', 'du', 'wsc_i_e'];
        const trackAttrs = (typeof commonMethods !== 'undefined' && commonMethods.Default)
            ? commonMethods.Default.getAttributes(keys)
            : {};

        return {
            ...trackAttrs,
            'data-track-code': this.getTrackingCode(mode, { ridChanged, textChanged })
        };
    }

    applyLinkedReference(node) {
        if (!node || !this.editState || !this.isRidDirty()) return false;

        const nextRid = this.editState.pendingRid || '';
        const nextHref = this.editState.pendingHref || (nextRid ? `#${nextRid}` : '');
        if (!nextRid) return false;

        node.setAttribute('rid', nextRid);
        node.setAttribute('href', nextHref);
        // CKEditor keeps a parallel saved href; both must match or navigation stays on old target.
        node.setAttribute('data-cke-saved-href', nextHref);
        return true;
    }

    applyTrackedChange(existEl, newPlainText, prevPlainText, options = {}) {
        try {

            const trackDelCode = EditCitationTextModule.TRACK_CODE_LEGACY_DEL;
            const trackInsCode = EditCitationTextModule.TRACK_CODE_LEGACY;

            if (!this.trackManager) {
                this.trackManager = window._trackManager || new trackManager(GlobalEditor);
            }

            existEl = existEl.$ ? existEl.$ : (existEl[0] ? existEl[0] : existEl);

            const {
                previousHtml = '',
                hasFormatting = false
            } = options;

            const del_dom = this.trackManager.getDelNode();
            const ins_dom = this.trackManager.getInsNode();


            del_dom.setAttribute('data-track-code', trackDelCode);
            ins_dom.setAttribute('data-track-code', trackInsCode);

            if (prevPlainText || previousHtml) {
                if (hasFormatting && previousHtml) {
                    del_dom.innerHTML = this.sanitizeHtml(previousHtml);
                } else {
                    del_dom.textContent = prevPlainText || '';
                }


                existEl.parentNode.insertBefore(del_dom, existEl);
            }

            if (newPlainText) {
                this.setXrefContent(existEl, newPlainText, {
                    previousHtml,
                    hasFormatting
                });
                existEl.parentNode.insertBefore(ins_dom, existEl);
                ins_dom.appendChild(existEl);
            }
        } catch (err) {
            this.trackError('applyTrackedChange', err.message);
        }
    }

    /**
     * Set attributes on the xref (and insert wrapper if present) without touching structure attrs.
     */
    applyAttributes(node, attributes, preserveAttrs = EditCitationTextModule.PRESERVE_ATTRS) {
        try {
            if (this.trackManager && typeof this.trackManager.updateAttributesOnly === 'function') {
                this.trackManager.updateAttributesOnly(node, attributes, preserveAttrs);
            } else {
                Object.keys(attributes).forEach((key) => {
                    if (attributes[key] != null && attributes[key] !== '') {
                        node.setAttribute(key, attributes[key]);
                    }
                });
            }

            const insertWrap = node.closest && node.closest('insert');
            if (insertWrap && attributes['data-track-code']) {
                insertWrap.setAttribute('data-track-code', attributes['data-track-code']);
            }
        } catch (err) {
            this.trackError('applyAttributes', err.message);
        }
    }

    handleApply(e) {
        if (e && e.preventDefault) e.preventDefault();
        try {
            if (this.state === 0) return;
            if (!this.editState || !this.editState.element) return;

            const { textInput, applyBtn } = this.elements;
            if (applyBtn && applyBtn.classList.contains('disabled')) return;

            const node = this.editState.element;
            if (!node || !node.parentNode) {
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('Citation no longer available', { type: 'error' });
                }
                this.handleCancel();
                return;
            }

            const newText = this.normalizeSpace((textInput && textInput.value) || '');
            if (!newText) return;

            const oldText = this.editState.originalText || '';
            const mode = this.editState.mode || 'direct';
            const modeInfo = this.editState.modeInfo || { mode: 'direct' };
            const writeSurround = this.shouldWriteSurround();
            const parsed = this.splitEditedTextByMode(newText, writeSurround ? mode : 'direct', {
                writeSurround,
                originalText: oldText,
                surroundPrefix: this.editState.surroundPrefix || modeInfo.prefix || '',
                surroundSuffix: this.editState.surroundSuffix || modeInfo.suffix || ''
            });
            const nextXrefText = this.normalizeSpace(parsed.xrefText);
            if (!nextXrefText) return;

            const textChanged = nextXrefText !== this.normalizeSpace(oldText);
            const editableChanged = newText !== this.normalizeSpace(this.editState.originalEditableText || '');
            const ridChanged = this.isRidDirty();
            const hasFormatting = !!this.editState.hasFormatting;
            const previousHtml = this.editState.originalHtml || '';

            const attributes = this.buildEditAttributes(
                writeSurround && (parsed.prefix || parsed.suffix) ? 'indirect' : mode,
                {
                    ridChanged,
                    textChanged: textChanged || (ridChanged && editableChanged)
                }
            );

            if (textChanged) {
                const isParentInsert = this.isXrefParentInsert(node);

                if (isParentInsert) {
                    this.setXrefContent(node, nextXrefText, {
                        previousHtml,
                        hasFormatting
                    });
                } else {
                    this.applyTrackedChange(node, nextXrefText, oldText, {
                        previousHtml,
                        hasFormatting
                    });
                }
            }

            // Prefix/suffix only after Wrap/Update wrap set rangeSelected.
            if (writeSurround && editableChanged && (parsed.prefix || parsed.suffix)) {
                if (this.shouldUseXrefSiblingSurround(node, modeInfo)) {
                    this.writeXrefSiblingSurround(node, parsed.prefix, parsed.suffix);
                } else {
                    this.setPrefixText(modeInfo, parsed.prefix);
                    this.setSuffixText(modeInfo, parsed.suffix);
                }
            }

            if (ridChanged) {
                this.applyLinkedReference(node);
            }

            // Stamp track-code after text/rid update (covers new <insert> wrap)
            this.applyAttributes(node, attributes);
            if (node.hasAttribute('data-override')) node.removeAttribute('data-override');

            if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION._SNAPSHOT) {
                IMPACT_SELECTION._SNAPSHOT({ save: true, unlock: true });
            }

            this.handleCancel();
        } catch (err) {
            console.warn(err.message);
            this.trackError('handleApply', err.message);
        }
    }

    handleCancel() {
        try {
            this.unbindEditorSelectionListener();
            this._lastAppliedSelection = '';
            this.editState = null;
            this.formModified = false;
            this._refCatalog = [];
            this._sameRidCites = [];
            this._sameRidIndex = 0;
            this._eventsBound = false;
            this._boundPanel = null;
            this._boundTextInput = null;
            this.hideRefPicker();
            this.closeDialog();
        } catch (err) {
            this.trackError('handleCancel', err.message);
        }
    }

    resetDialog() {
        try {
            this.unbindEditorSelectionListener();
            this._lastAppliedSelection = '';
            this.editState = null;
            this.formModified = false;
            this._refCatalog = [];
            this._sameRidCites = [];
            this._sameRidIndex = 0;
            this._eventsBound = false;
            this._boundPanel = null;
            this._boundTextInput = null;
            if (this.elements) {
                if (this.elements.textInput) this.elements.textInput.value = '';
                this.setUseSelectionButtonLabel(EditCitationTextModule.BTN_WRAP_SELECTION);
                if (this.elements.ridInput) this.elements.ridInput.value = '';
                if (this.elements.refFilter) this.elements.refFilter.value = '';
                if (this.elements.refList) this.elements.refList.innerHTML = '';
                if (this.elements.applyBtn) {
                    this.elements.applyBtn.classList.add('disabled');
                    this.elements.applyBtn.disabled = true;
                }
                this.hideRefPicker();
            }
        } catch (err) {
            this.trackError('resetDialog', err.message);
        }
    }

    escapeRegExp(text) {
        return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Whether xref rid/href includes the given bibliography id (multi-space rid safe).
     */
    xrefLinksToRid(xref, rid) {
        if (!xref || !rid) return false;
        const want = String(rid).trim();
        if (!want) return false;
        const rawRid = String(xref.getAttribute('rid') || '').trim();
        if (rawRid) {
            return rawRid.split(/\s+/).includes(want);
        }
        const href = String(xref.getAttribute('href') || xref.getAttribute('data-cke-saved-href') || '').trim();
        return href.replace(/^#/, '') === want;
    }

    truncateSameRidLabel(text, max = 80) {
        const clean = this.normalizeSpace(text);
        if (!clean) return '(empty citation)';
        if (clean.length <= max) return clean;
        return `${clean.slice(0, max - 3)}...`;
    }

    collectSameRidCitations(rid) {
        const out = [];
        try {
            const want = String(rid || '').trim();
            if (!want) return out;
            if (typeof GlobalEditor === 'undefined' || !GlobalEditor.document || !GlobalEditor.document.$) {
                return out;
            }
            const currentRole = (this.editState && this.editState.roleConfig
                && this.editState.roleConfig.role) || '';
            const root = GlobalEditor.document.$;
            Array.from(root.querySelectorAll('a.xref')).forEach((xref) => {
                if (!xref || xref.hasAttribute('data-remove')) return;
                const cfg = EditCitationTextModule.resolveRoleConfig(xref);
                if (!cfg || cfg.allowSameRidNav === false) return;
                if (currentRole && cfg.role !== currentRole) return;
                if (!this.xrefLinksToRid(xref, want)) return;
                out.push({
                    node: xref,
                    text: this.normalizeSpace(xref.textContent || '')
                });
            });
        } catch (err) {
            this.trackError('collectSameRidCitations', err.message);
        }
        return out;
    }

    renderSameRidSection() {
        try {
            const {
                sameRidSection, sameRidHeading, sameRidEmpty, sameRidGrid, sameRidPosition
            } = this.elements || {};
            if (!sameRidSection || !sameRidGrid) return;

            const current = this.editState && this.editState.element;
            const rid = this.normalizeSpace(
                (this.editState && (this.editState.pendingRid || this.editState.rid)) || ''
            );
            const cites = rid ? this.collectSameRidCitations(rid) : [];
            this._sameRidCites = cites;

            let idx = cites.findIndex((c) => c.node === current);
            if (idx < 0 && current) {
                idx = cites.findIndex((c) => c.node && current.contains && current.contains(c.node));
            }
            if (idx < 0) idx = 0;
            this._sameRidIndex = idx;

            if (sameRidHeading) {
                sameRidHeading.textContent = cites.length
                    ? `Other citations with this reference (${cites.length})`
                    : 'Other citations with this reference';
            }
            if (sameRidPosition) {
                sameRidPosition.textContent = cites.length
                    ? `${idx + 1} of ${cites.length}`
                    : '0 of 0';
            }

            sameRidGrid.innerHTML = '';
            if (!cites.length) {
                if (sameRidEmpty) sameRidEmpty.classList.remove('ds-none');
                this.updateSameRidNavState();
                return;
            }
            if (sameRidEmpty) sameRidEmpty.classList.add('ds-none');

            const ul = document.createElement('ul');
            ul.className = 'cite-same-rid-grid-ul';
            cites.forEach((cite, i) => {
                const li = document.createElement('li');
                li.className = 'cite-same-rid-grid-item';
                if (i === idx) li.classList.add('is-current');
                li.setAttribute('data-cite-index', String(i));
                li.setAttribute('role', 'button');
                li.tabIndex = 0;
                li.title = cite.text || '';
                li.textContent = this.truncateSameRidLabel(cite.text);
                ul.appendChild(li);
            });
            sameRidGrid.appendChild(ul);
            this.updateSameRidNavState();
        } catch (err) {
            this.trackError('renderSameRidSection', err.message);
        }
    }

    updateSameRidNavState() {
        try {
            const { sameRidPrev, sameRidNext, sameRidGrid } = this.elements || {};
            const cites = this._sameRidCites || [];
            const idx = this._sameRidIndex || 0;
            const dirty = this.isDirty();
            const canNav = !dirty && cites.length > 1;
            const navTitle = dirty
                ? 'Apply or revert changes before navigating to another citation'
                : '';

            if (sameRidPrev) {
                const disablePrev = !canNav || idx <= 0;
                sameRidPrev.disabled = disablePrev;
                sameRidPrev.classList.toggle('disabled', disablePrev);
                sameRidPrev.title = dirty
                    ? navTitle
                    : 'Previous citation with this reference';
            }
            if (sameRidNext) {
                const disableNext = !canNav || idx >= cites.length - 1;
                sameRidNext.disabled = disableNext;
                sameRidNext.classList.toggle('disabled', disableNext);
                sameRidNext.title = dirty
                    ? navTitle
                    : 'Next citation with this reference';
            }
            if (sameRidGrid) {
                sameRidGrid.querySelectorAll('.cite-same-rid-grid-item').forEach((el) => {
                    el.classList.toggle('is-nav-disabled', dirty);
                });
            }
        } catch (err) {
            this.trackError('updateSameRidNavState', err.message);
        }
    }

    /**
     * Scroll to xref and select it in CKEditor (same-rid navigation step 1).
     */
    focusCitationInEditor(xref) {
        try {
            if (!xref) return false;
            if (typeof xref.scrollIntoView === 'function') {
                xref.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
            if (typeof GlobalEditor === 'undefined' || !GlobalEditor.createRange || typeof CKEDITOR === 'undefined') {
                return false;
            }
            const range = GlobalEditor.createRange();
            const el = new CKEDITOR.dom.element(xref);
            range.setStartAt(el, CKEDITOR.POSITION_BEFORE_START);
            range.setEndAt(el, CKEDITOR.POSITION_AFTER_END);
            GlobalEditor.focus();
            if (typeof el.scrollIntoView === 'function') el.scrollIntoView(true);
            GlobalEditor.getSelection().selectRanges([range]);
            if (typeof IMPACT_SELECTION !== 'undefined' && typeof IMPACT_SELECTION._SNAPSHOT === 'function') {
                IMPACT_SELECTION._SNAPSHOT({ unlock: true });
            }
            return true;
        } catch (err) {
            this.trackError('focusCitationInEditor', err.message);
            return false;
        }
    }

    navigateToSameRidIndex(index) {
        try {
            if (this.isDirty()) return;
            const cites = this._sameRidCites || [];
            const target = cites[index];
            if (!target || !target.node) return;
            if (this.editState && this.editState.element === target.node) return;

            // 1. Editor: scroll + select target xref first
            this.focusCitationInEditor(target.node);

            // 2. Dialog: reload fields for that cite
            this._pendingXref = target.node;
            this.showLoop(true, target.node, { fromSameRidNav: true });

            // 3. Focus Display Text last (editor selection already applied)
            if (this.elements && this.elements.textInput) {
                this.elements.textInput.focus();
                this.elements.textInput.select();
            }
        } catch (err) {
            this.trackError('navigateToSameRidIndex', err.message);
        }
    }

    handleSameRidPrev() {
        try {
            if (this.isDirty()) return;
            this.navigateToSameRidIndex((this._sameRidIndex || 0) - 1);
        } catch (err) {
            this.trackError('handleSameRidPrev', err.message);
        }
    }

    handleSameRidNext() {
        try {
            if (this.isDirty()) return;
            this.navigateToSameRidIndex((this._sameRidIndex || 0) + 1);
        } catch (err) {
            this.trackError('handleSameRidNext', err.message);
        }
    }

    handleSameRidGridClick(e) {
        try {
            if (this.isDirty()) return;
            const item = e && e.target && e.target.closest
                ? e.target.closest('.cite-same-rid-grid-item')
                : null;
            if (!item || item.classList.contains('is-current')) return;
            const idx = parseInt(item.getAttribute('data-cite-index'), 10);
            if (Number.isNaN(idx)) return;
            this.navigateToSameRidIndex(idx);
        } catch (err) {
            this.trackError('handleSameRidGridClick', err.message);
        }
    }

    /**
     * Apply surname/year token replacements to cite plain text.
     * Uses changed.surnames[] only (any author / bare string-name).
     * Returns null when no relevant old token is present (skip cite).
     */
    applyRefChangeTokens(plainText, changed) {
        let text = String(plainText || '');
        const surnameList = (changed && Array.isArray(changed.surnames))
            ? changed.surnames
            : [];
        if (!changed || (!surnameList.length && !changed.year)) return null;

        let touched = false;

        surnameList.forEach((entry) => {
            if (!entry) return;
            const oldName = this.normalizeSpace(entry.old);
            const newName = this.normalizeSpace(entry.new);
            if (!oldName || !newName || oldName === newName) return;
            const escaped = this.escapeRegExp(oldName);
            const re = new RegExp(`(^|[\\s(\\[{])(${escaped})(?=[\\s,.);\\]}]|$)`, 'g');
            if (re.test(text)) {
                re.lastIndex = 0;
                text = text.replace(re, `$1${newName}`);
                touched = true;
            }
        });

        if (changed.year) {
            const oldYear = this.normalizeSpace(changed.year.old);
            const newYear = this.normalizeSpace(changed.year.new);
            if (oldYear && newYear && oldYear !== newYear) {
                let yearRe;
                if (/^n\.?\s*d\.?$/i.test(oldYear)) {
                    yearRe = /\bn\.?\s*d\.?(?!\w)/gi;
                } else {
                    yearRe = new RegExp(`\\b${this.escapeRegExp(oldYear)}(?!\\w)`, 'gi');
                }
                if (yearRe.test(text)) {
                    yearRe.lastIndex = 0;
                    text = text.replace(yearRe, newYear);
                    touched = true;
                }
            }
        }

        if (!touched) return null;
        return text;
    }

    /**
     * Rid-scoped citation text sync after Edit Reference Text name/year change.
     * Token-replace only; retain format via setXrefContent / buildPreservedHtml.
     * @param {{ rid: string, changed: object }} details
     * @returns {{ updated: number }}
     */
    syncFromRefChange(details) {
        const result = { updated: 0 };
        try {
            if (!details || !details.rid || !details.changed) return result;
            if (typeof GlobalEditor === 'undefined' || !GlobalEditor.document || !GlobalEditor.document.$) {
                return result;
            }

            const rid = String(details.rid).trim();
            const root = GlobalEditor.document.$;
            const candidates = Array.from(root.querySelectorAll('a.xref'));
            if (!this.trackManager) {
                this.trackManager = window._trackManager || new trackManager(GlobalEditor);
            }

            candidates.forEach((xref) => {
                try {
                    if (!xref || xref.nodeType !== 1) return;
                    if (xref.hasAttribute('data-remove')) return;
                    const cfg = EditCitationTextModule.resolveRoleConfig(xref);
                    if (!cfg || !cfg.allowSyncFromRef) return;
                    if (!this.xrefLinksToRid(xref, rid)) return;

                    const oldPlain = xref.textContent || '';
                    const nextPlain = this.applyRefChangeTokens(oldPlain, details.changed);
                    if (nextPlain == null || nextPlain === oldPlain) return;

                    const previousHtml = xref.innerHTML;
                    const hasFmt = this.hasFormatting(xref);
                    const isParentInsert = typeof this.isXrefParentInsert === 'function'
                        ? this.isXrefParentInsert(xref)
                        : !!(xref.parentNode && (xref.parentNode.tagName || '').toLowerCase() === 'insert');

                    if (isParentInsert) {
                        this.setXrefContent(xref, nextPlain, {
                            previousHtml,
                            hasFormatting: hasFmt
                        });
                    } else {
                        this.applyTrackedChange(xref, nextPlain, oldPlain, {
                            previousHtml,
                            hasFormatting: hasFmt
                        });
                    }

                    const attrs = this.buildEditAttributes('direct', {
                        ridChanged: false,
                        textChanged: true
                    });

                    attrs['data-track-code'] = EditCitationTextModule.TRACK_CODE_SYNC;

                    this.applyAttributes(xref, attrs);

                    if (xref.hasAttribute('data-override')) xref.removeAttribute('data-override');
                    result.updated += 1;

                } catch (innerErr) {
                    this.trackError('syncFromRefChange.xref', innerErr.message);
                }
            });
        } catch (err) {
            this.trackError('syncFromRefChange', err.message);
        }
        return result;
    }

    static create(errorTracker, options = {}) {
        return new EditCitationTextModule('EditCitationTextModule', errorTracker, options);
    }
}

export default EditCitationTextModule;
