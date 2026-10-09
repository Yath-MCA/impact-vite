/**
 * IndexModule — mark index entries in CKEditor (separate layer, stored in document HTML).
 */
class IndexModule extends BaseModule {
    constructor(name = 'IndexModule', errorTracker = null, options = {}) {
        super(name, errorTracker, options);
        this._id = 'IndexDialog';
        this.canUnmountComponentWhileClose = true;
        this.IsDisable_OffLine = true;
        this._state = {
            selectionSnapshot: null
        };
        this._bindMethods();
    }

    _bindMethods() {
        [
            'initLoop', 'showLoop', 'resetForm', 'onCrossRefToggle', 'onMainEntryChange',
            'onDisplayTextInput', 'onIncludeAllChange', 'onInsert', 'showPreview', 'closePreview',
            'onPreviewItemClick', 'syncEntriesFromEditor', 'refreshMainSubDropdowns', 'updateFormState'
        ].forEach((m) => {
            if (this[m]) this[m] = this[m].bind(this);
        });
    }

    _getEditor() {
        return typeof GlobalEditor !== 'undefined' ? GlobalEditor : null;
    }

    _withEditorSnapshot(fn) {
        const editor = this._getEditor();
        if (!editor) return null;
        editor.fire('lockSnapshot');
        try {
            return fn(editor);
        } finally {
            editor.fire('unlockSnapshot');
            editor.fire('saveSnapshot');
        }
    }

    _escapeAttr(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    _escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    _generateEntryId() {
        return `idx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    _resolveParagraphIdFromNode(node) {
        if (!node) return '';
        let el = node;
        if (el.type === CKEDITOR.NODE_TEXT) el = el.getParent();
        while (el && el.type !== CKEDITOR.NODE_ELEMENT) el = el.getParent();
        while (el) {
            const id = el.getId() || el.getAttribute('data-para-id') || el.getAttribute('data-id') || el.getAttribute('data-target-id');
            if (id) return id;
            const name = el.getName && el.getName();
            if (name === 'body') break;
            el = el.getParent();
        }
        return '';
    }

    _captureSelectionContext() {
        const editor = this._getEditor();
        if (!editor) return null;
        try {
            const sel = editor.getSelection();
            if (!sel) return null;
            const ranges = sel.getRanges();
            if (!ranges || !ranges.length) return null;
            const range = ranges[0];
            if (range.collapsed) {
                return {
                    selectedText: '',
                    paraId: this._resolveParagraphIdFromNode(range.startContainer),
                    bookmark: null,
                    collapsed: true
                };
            }
            return {
                selectedText: sel.getSelectedText().trim(),
                paraId: this._resolveParagraphIdFromNode(range.startContainer),
                bookmark: range.createBookmark2(true),
                collapsed: false
            };
        } catch (err) {
            return null;
        }
    }

    _restoreSelectionFromBookmark() {
        const snap = this._state.selectionSnapshot;
        const editor = this._getEditor();
        if (!editor || !snap || !snap.bookmark) return false;
        try {
            const range = editor.createRange();
            range.moveToBookmark(snap.bookmark);
            editor.getSelection().selectRanges([range]);
            return true;
        } catch (err) {
            return false;
        }
    }

    _entryFromMarkerElement(ckElement) {
        if (!ckElement) return null;
        const displayText = ckElement.getAttribute('data-index-display') || ckElement.getText().trim();
        return {
            id: ckElement.getAttribute('data-index-entry-id') || '',
            displayText,
            mainEntry: ckElement.getAttribute('data-index-main') || displayText,
            subEntry: ckElement.getAttribute('data-index-sub') || '',
            crossRef: ckElement.getAttribute('data-index-cross-ref') === '1',
            crossRefText: ckElement.getAttribute('data-index-cross-ref-text') || '',
            includeAll: ckElement.getAttribute('data-index-include-all') === '1',
            paraId: ckElement.getAttribute('data-index-para-id') || '',
            selectedText: ckElement.getText().trim()
        };
    }

    syncEntriesFromEditor() {
        const editor = this._getEditor();
        if (!editor) return [];
        try {
            const list = editor.document.find('.impact-index-layer');
            const entries = [];
            const seen = new Set();
            for (let i = 0; i < list.count(); i++) {
                const entry = this._entryFromMarkerElement(list.getItem(i));
                if (!entry || !entry.id || seen.has(entry.id)) continue;
                seen.add(entry.id);
                entries.push(entry);
            }
            window.INDEX_LAYER = { entries };
            return entries;
        } catch (err) {
            return [];
        }
    }

    _buildMarkerHtml(entry, innerText) {
        const label = entry.crossRef
            ? `${entry.crossRefText} ${entry.displayText}`
            : entry.displayText;
        const text = this._escapeHtml(innerText || entry.selectedText || entry.displayText);
        return (
            `<span class="impact-index-layer" contenteditable="false"` +
            ` data-index-entry-id="${this._escapeAttr(entry.id)}"` +
            ` data-index-display="${this._escapeAttr(entry.displayText)}"` +
            ` data-index-main="${this._escapeAttr(entry.mainEntry)}"` +
            ` data-index-sub="${this._escapeAttr(entry.subEntry)}"` +
            ` data-index-cross-ref="${entry.crossRef ? '1' : '0'}"` +
            ` data-index-cross-ref-text="${this._escapeAttr(entry.crossRefText)}"` +
            ` data-index-include-all="${entry.includeAll ? '1' : '0'}"` +
            ` data-index-para-id="${this._escapeAttr(entry.paraId)}"` +
            ` title="Index: ${this._escapeAttr(label)}">${text}</span>`
        );
    }

    _buildEntryFromForm() {
        const displayText = (this.elements.displayText.value || '').trim();
        if (!displayText) return null;

        const selectedMain = (this.elements.mainEntry.value || '').trim();
        const selectedSub = (this.elements.subEntry.value || '').trim();
        let mainEntry = selectedMain || displayText;
        let subEntry = '';
        if (selectedMain && !selectedSub) {
            subEntry = displayText;
        } else if (selectedMain && selectedSub) {
            mainEntry = selectedMain;
            subEntry = selectedSub;
        }

        const snap = this._state.selectionSnapshot || {};
        const isCrossRef = this.elements.crossRefChk.checked;

        const includeAll = this.elements.includeAll.checked;
        return {
            id: this._generateEntryId(),
            displayText,
            mainEntry,
            subEntry,
            crossRef: isCrossRef,
            crossRefText: isCrossRef ? (this.elements.crossRefText.value || 'See').trim() : '',
            includeAll,
            paraId: snap.paraId || '',
            selectedText: includeAll ? displayText : (snap.selectedText || displayText)
        };
    }

    _insertMarkerAtSelection(editor, entry) {
        if (!this._restoreSelectionFromBookmark()) {
            throw new Error('Lost editor selection');
        }
        const inner = entry.selectedText || entry.displayText;
        editor.insertHtml(this._buildMarkerHtml(entry, inner));
    }

    _markAllInstancesInEditor(editor, entry) {
        const term = (entry.selectedText || entry.displayText || '').trim();
        if (!term || term.length < 2) return 0;

        const body = editor.document.getBody();
        const walker = new CKEDITOR.dom.walker(body);
        walker.evaluator = function (node) {
            return node.type === CKEDITOR.NODE_TEXT;
        };

        const matches = [];
        let textNode;
        while ((textNode = walker.next())) {
            const parent = textNode.getParent();
            if (parent && parent.hasClass && parent.hasClass('impact-index-layer')) continue;
            const text = textNode.getText();
            let from = 0;
            let idx;
            while ((idx = text.indexOf(term, from)) !== -1) {
                matches.push({ textNode, start: idx, end: idx + term.length });
                from = idx + term.length;
            }
        }

        matches.reverse().forEach((m) => {
            const range = editor.createRange();
            range.setStart(m.textNode, m.start);
            range.setEnd(m.textNode, m.end);
            editor.getSelection().selectRanges([range]);
            editor.insertHtml(this._buildMarkerHtml(entry, term));
        });

        return matches.length;
    }

    initLoop() {
        try {
            this.elements = {
                displayText: this.Panel.querySelector('#index_display_text'),
                crossRefChk: this.Panel.querySelector('#index_cross_ref_chk'),
                crossRefText: this.Panel.querySelector('#index_cross_ref_text'),
                includeAll: this.Panel.querySelector('#index_include_all'),
                mainEntry: this.Panel.querySelector('#index_main_entry'),
                subEntry: this.Panel.querySelector('#index_sub_entry'),
                paraIdLabel: this.Panel.querySelector('#index_para_id_label'),
                selectionMeta: this.Panel.querySelector('#index_selection_meta'),
                selectionHint: this.Panel.querySelector('#index_selection_hint'),
                insertBtn: this.Panel.querySelector('#index_insert_btn'),
                cancelBtn: this.Panel.querySelector('#index_cancel_btn'),
                previewBtn: this.Panel.querySelector('#index_preview_btn')
            };

            this.previewPanel = document.getElementById('IndexPreviewDialog');
            this.previewList = this.previewPanel && this.previewPanel.querySelector('#index_preview_list');
            this.previewCloseBtn = this.previewPanel && this.previewPanel.querySelector('#index_preview_close_btn');

            this.elements.crossRefChk.onchange = this.onCrossRefToggle;
            this.elements.mainEntry.onchange = this.onMainEntryChange;
            this.elements.displayText.oninput = this.onDisplayTextInput;
            this.elements.includeAll.onchange = this.onIncludeAllChange;
            this.elements.insertBtn.onclick = this.onInsert;
            this.elements.cancelBtn.onclick = this.closeDialog;
            this.elements.previewBtn.onclick = this.showPreview;

            this.Panel.querySelector('#indexMarkForm').addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    if (!this.elements.insertBtn.disabled) this.onInsert();
                }
            });

            if (this.previewCloseBtn) this.previewCloseBtn.onclick = this.closePreview;
            if (this.previewPanel) {
                const icon = this.previewPanel.querySelector('.closeIcons');
                if (icon) icon.onclick = this.closePreview;
            }

            this.AutoInitiated = true;
            this.FullyLoaded = true;
        } catch (err) {
            ErrorLogTrace('IndexModule-initLoop', err.message);
        }
    }

    showLoop() {
        try {
            this.resetForm();
            this._state.selectionSnapshot = this._captureSelectionContext();
            const snap = this._state.selectionSnapshot;

            if (snap && snap.selectedText) {
                this.elements.displayText.value = snap.selectedText;
            }

            if (snap && snap.paraId) {
                this.elements.selectionMeta.classList.remove('ds-none');
                this.elements.paraIdLabel.textContent = snap.paraId;
            } else {
                this.elements.selectionMeta.classList.add('ds-none');
            }

            this.syncEntriesFromEditor();
            this.refreshMainSubDropdowns();
            this.updateFormState();

            setTimeout(() => {
                if (this.elements.displayText) this.elements.displayText.focus();
            }, 80);
        } catch (err) {
            ErrorLogTrace('IndexModule-showLoop', err.message);
        }
    }

    resetForm() {
        if (!this.elements) return;
        this.elements.displayText.value = '';
        this.elements.crossRefChk.checked = false;
        this.elements.crossRefText.classList.add('ds-none');
        this.elements.crossRefText.value = 'See';
        this.elements.includeAll.checked = false;
        this.elements.mainEntry.value = '';
        this.elements.subEntry.value = '';
        this.elements.subEntry.disabled = true;
        this.onMainEntryChange();
        this.updateFormState();
    }

    onCrossRefToggle() {
        const show = this.elements.crossRefChk.checked;
        this.elements.crossRefText.classList[show ? 'remove' : 'add']('ds-none');
        if (show) this.elements.crossRefText.focus();
    }

    onDisplayTextInput() {
        this.updateFormState();
    }

    onIncludeAllChange() {
        this.updateFormState();
    }

    updateFormState() {
        const displayText = (this.elements.displayText.value || '').trim();
        const snap = this._state.selectionSnapshot;
        const includeAll = this.elements.includeAll.checked;
        const hasSelection = snap && !snap.collapsed && snap.selectedText;
        let hint = 'Select text in the editor, then insert. Leave Main unselected to create a new main entry.';

        if (!displayText) {
            this.elements.insertBtn.classList.add('disabled');
            this.elements.insertBtn.disabled = true;
        } else if (includeAll) {
            this.elements.insertBtn.classList.remove('disabled');
            this.elements.insertBtn.disabled = false;
            hint = 'All matching instances of the display text will be marked in the document.';
        } else if (hasSelection || snap.bookmark) {
            this.elements.insertBtn.classList.remove('disabled');
            this.elements.insertBtn.disabled = false;
            hint = 'Entry will be inserted at the captured selection.';
        } else {
            this.elements.insertBtn.classList.add('disabled');
            this.elements.insertBtn.disabled = true;
            hint = 'Select text in the editor before inserting (unless using Include all instances).';
        }

        if (this.elements.selectionHint) {
            this.elements.selectionHint.textContent = hint;
        }
    }

    refreshMainSubDropdowns() {
        const entries = this.syncEntriesFromEditor();
        const mainSelect = this.elements.mainEntry;
        const subSelect = this.elements.subEntry;
        const mains = new Set();

        entries.forEach((e) => {
            if (e.mainEntry) mains.add(e.mainEntry);
        });

        const currentMain = mainSelect.value;
        mainSelect.innerHTML = '<option value="">Please select a main entry</option>';
        Array.from(mains).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).forEach((m) => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            mainSelect.appendChild(opt);
        });
        if (currentMain) mainSelect.value = currentMain;
        this.onMainEntryChange();
    }

    onMainEntryChange() {
        const main = this.elements.mainEntry.value;
        const subSelect = this.elements.subEntry;
        const entries = this.syncEntriesFromEditor();

        subSelect.innerHTML = '';
        if (!main) {
            subSelect.disabled = true;
            subSelect.innerHTML = '<option value="">No sub-entries available for selected main-entry</option>';
            return;
        }

        const subs = entries
            .filter((e) => e.mainEntry === main && e.subEntry)
            .map((e) => e.subEntry);
        const uniqueSubs = Array.from(new Set(subs)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        if (!uniqueSubs.length) {
            subSelect.disabled = true;
            subSelect.innerHTML = '<option value="">No sub-entries available for selected main-entry</option>';
            return;
        }

        subSelect.disabled = false;
        subSelect.innerHTML = '<option value="">— sub-entry —</option>';
        uniqueSubs.forEach((s) => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            subSelect.appendChild(opt);
        });
    }

    onInsert() {
        const entry = this._buildEntryFromForm();
        if (!entry) return;

        const editor = this._getEditor();
        if (!editor) return;

        try {
            this._withEditorSnapshot((ed) => {
                if (entry.includeAll) {
                    const count = this._markAllInstancesInEditor(ed, entry);
                    if (count === 0) {
                        throw new Error('No matching text found in document');
                    }
                } else {
                    this._insertMarkerAtSelection(ed, entry);
                }
            });
            this.refreshMainSubDropdowns();
            this.closeDialog();
        } catch (err) {
            TOASTER_ALERT('OffLine_Error_show', { type: 'warning' });
            ErrorLogTrace('IndexModule-onInsert', err.message);
        }
    }

    _sortEntriesForPreview(entries) {
        return [...entries].sort((a, b) => {
            const keyA = `${a.mainEntry || ''}\0${a.subEntry || ''}\0${a.displayText}`;
            const keyB = `${b.mainEntry || ''}\0${b.subEntry || ''}\0${b.displayText}`;
            return keyA.localeCompare(keyB, undefined, { sensitivity: 'base' });
        });
    }

    _formatPreviewLine(entry) {
        if (entry.crossRef) {
            return `${entry.crossRefText} ${entry.subEntry ? `${entry.mainEntry}: ${entry.subEntry}` : entry.displayText}`;
        }
        if (entry.subEntry) {
            return `${entry.mainEntry}: ${entry.subEntry}`;
        }
        return entry.displayText;
    }

    showPreview() {
        try {
            const entries = this.syncEntriesFromEditor();
            if (!this.previewPanel || !this.previewList) return;

            const sorted = this._sortEntriesForPreview(entries);
            let html = '';
            let lastLetter = '';

            sorted.forEach((entry) => {
                const letter = (entry.displayText[0] || '#').toUpperCase();
                if (letter !== lastLetter) {
                    html += `<div class="index-preview-letter">${letter}</div>`;
                    lastLetter = letter;
                }
                const para = entry.paraId ? `<span class="index-preview-para">[${this._escapeHtml(entry.paraId)}]</span>` : '';
                html += `<div class="index-preview-item" data-index-id="${this._escapeAttr(entry.id)}" data-para-id="${this._escapeAttr(entry.paraId)}">${this._escapeHtml(this._formatPreviewLine(entry))}${para}</div>`;
            });

            if (!html) {
                html = '<p class="text-muted mb-0">No index entries in this document yet.</p>';
            }

            this.previewList.innerHTML = html;
            this.previewList.querySelectorAll('.index-preview-item').forEach((el) => {
                el.onclick = () => this.onPreviewItemClick(el);
            });
            this.previewPanel.classList.remove('ds-none');
        } catch (err) {
            ErrorLogTrace('IndexModule-showPreview', err.message);
        }
    }

    onPreviewItemClick(el) {
        const entryId = el.getAttribute('data-index-id');
        const editor = this._getEditor();
        if (!editor || !entryId) return;

        try {
            const marker = editor.document.findOne(`span.impact-index-layer[data-index-entry-id="${entryId}"]`);
            if (marker) {
                if (marker.$ && marker.$.scrollIntoView) {
                    marker.$.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
                const range = editor.createRange();
                range.selectNodeContents(marker);
                editor.getSelection().selectRanges([range]);
            }
        } catch (err) {
            debug.log('Index preview navigate failed');
        }
        this.closePreview();
    }

    closePreview() {
        if (this.previewPanel) this.previewPanel.classList.add('ds-none');
    }
}

export default IndexModule;
