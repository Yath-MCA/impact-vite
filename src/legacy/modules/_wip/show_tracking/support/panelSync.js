/**
 * Incremental panel sync + cursor wiring (Editor + Track View).
 */

import {
    ensureSrPanelId,
    computePanelSyncDiff,
    resolveTrackElementForSync,
    findPanelEntryByPanelId,
    readPanelId,
    SR_PANEL_ID_ATTR
} from './panelId.js';
import { collectTrackNodes, buildEntryDto, renderEntryHtml } from './panelList.js';

const DEFAULT_DEBOUNCE_MS = 400;
const TRACK_FIND_QUERY = 'insert, del, [data-track-code]';

export class PanelSync {
    /**
     * @param {object} module ShowTrackingModule instance
     */
    constructor(module) {
        this.module = module;
        this._debounceTimer = null;
        this._debounceMs = DEFAULT_DEBOUNCE_MS;
        this._boundEditorClick = this.onEditorClick.bind(this);
        this._boundPanelClick = this.onPanelClick.bind(this);
        this._boundDirty = this.scheduleIncrementalSync.bind(this);
        this._wired = false;
    }

    getPanelRoot() {
        const m = this.module;
        if (typeof IS_TRACK_VIEW !== 'undefined' && IS_TRACK_VIEW) {
            return document.querySelector('.trackView') || (m.Panel && m.Panel.querySelector('#trackListGroup'));
        }
        return (m.Panel && m.Panel.querySelector('#trackListGroup')) || null;
    }

    getEditorRoot() {
        try {
            if (typeof GlobalEditor !== 'undefined' && GlobalEditor && GlobalEditor.document) {
                return GlobalEditor.document.$ || GlobalEditor.document;
            }
        } catch (err) {
            /* ignore */
        }
        return document.querySelector('.cke_editable, #editor, body');
    }

    wire() {
        if (this._wired) return;
        const editorRoot = this.getEditorRoot();
        const panelRoot = this.getPanelRoot();
        if (editorRoot && editorRoot.addEventListener) {
            editorRoot.addEventListener('click', this._boundEditorClick, true);
        }
        if (panelRoot && panelRoot.addEventListener) {
            panelRoot.addEventListener('click', this._boundPanelClick, true);
        }
        this._wired = true;
    }

    unwire() {
        const editorRoot = this.getEditorRoot();
        const panelRoot = this.getPanelRoot();
        if (editorRoot && editorRoot.removeEventListener) {
            editorRoot.removeEventListener('click', this._boundEditorClick, true);
        }
        if (panelRoot && panelRoot.removeEventListener) {
            panelRoot.removeEventListener('click', this._boundPanelClick, true);
        }
        this.cancelScheduledSync();
        this._wired = false;
    }

    scheduleIncrementalSync() {
        if (!this.module || !this.module.isPanelActive()) return;
        this.cancelScheduledSync();
        const self = this;
        this._debounceTimer = setTimeout(function () {
            self._debounceTimer = null;
            self.syncPanelIncremental();
        }, this._debounceMs);
    }

    cancelScheduledSync() {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
    }

    syncPanelIncremental() {
        const panelRoot = this.getPanelRoot();
        const editorRoot = this.getEditorRoot();
        if (!panelRoot || !editorRoot) return;

        const filterConfig = this.module.getFilterConfig();
        const nodes = collectTrackNodes(editorRoot);
        const editorIds = [];
        const dtoById = {};
        for (let i = 0; i < nodes.length; i++) {
            const dto = buildEntryDto(nodes[i], filterConfig);
            editorIds.push(dto.panelId);
            dtoById[dto.panelId] = dto;
        }

        const panelEntries = panelRoot.querySelectorAll('.entry[' + SR_PANEL_ID_ATTR + ']');
        const panelIds = [];
        for (let j = 0; j < panelEntries.length; j++) {
            panelIds.push(readPanelId(panelEntries[j]));
        }

        const diff = computePanelSyncDiff(editorIds, panelIds);
        for (let r = 0; r < diff.toRemove.length; r++) {
            const orphan = findPanelEntryByPanelId(panelRoot, diff.toRemove[r]);
            if (orphan && orphan.parentNode) orphan.parentNode.removeChild(orphan);
        }
        for (let a = 0; a < diff.toAdd.length; a++) {
            const dto = dtoById[diff.toAdd[a]];
            if (!dto) continue;
            const wrap = document.createElement('div');
            wrap.innerHTML = renderEntryHtml(dto, panelRoot.querySelectorAll('.entry').length);
            const node = wrap.firstChild;
            if (node) panelRoot.appendChild(node);
        }
        this.module.refreshCountsFromPanel();
    }

    onEditorClick(evt) {
        const target = evt.target;
        const trackEl = resolveTrackElementForSync(target, TRACK_FIND_QUERY);
        if (!trackEl) return;
        ensureSrPanelId(trackEl);
        const id = readPanelId(trackEl);
        const panelRoot = this.getPanelRoot();
        const entry = findPanelEntryByPanelId(panelRoot, id);
        if (!entry) return;
        this.highlightPanelEntry(entry);
        if (typeof entry.scrollIntoView === 'function') {
            entry.scrollIntoView({ block: 'nearest' });
        }
        this.module.setActiveEntry(entry);
    }

    onPanelClick(evt) {
        const target = evt.target;
        if (!target || typeof target.closest !== 'function') return;
        const entry = target.closest('.entry');
        if (!entry) return;
        const id = readPanelId(entry);
        if (!id) return;
        const editorRoot = this.getEditorRoot();
        if (!editorRoot || !editorRoot.querySelector) return;
        let editorEl = editorRoot.querySelector('[' + SR_PANEL_ID_ATTR + '="' + cssAttrEscape(id) + '"]');
        if (!editorEl) {
            const all = editorRoot.querySelectorAll('[' + SR_PANEL_ID_ATTR + '], [data-sr-panel-unique-id]');
            for (let i = 0; i < all.length; i++) {
                if (readPanelId(all[i]) === id) {
                    editorEl = all[i];
                    break;
                }
            }
        }
        if (!editorEl) return;
        this.highlightPanelEntry(entry);
        this.module.setActiveEntry(entry);
        if (typeof editorEl.scrollIntoView === 'function') {
            editorEl.scrollIntoView({ block: 'center' });
        }
        try {
            if (typeof GlobalEditor !== 'undefined' && GlobalEditor.getSelection) {
                const range = GlobalEditor.createRange && GlobalEditor.createRange();
                if (range && range.moveToElementEditStart) {
                    range.moveToElementEditStart(new CKEDITOR.dom.element(editorEl));
                    range.select();
                }
            }
        } catch (err) {
            /* selection best-effort */
        }
    }

    highlightPanelEntry(entry) {
        const panelRoot = this.getPanelRoot();
        if (!panelRoot) return;
        const entries = panelRoot.querySelectorAll('.entry');
        for (let i = 0; i < entries.length; i++) {
            entries[i].classList.remove('active', 'selected');
        }
        entry.classList.add('active', 'selected');
    }
}

function cssAttrEscape(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
