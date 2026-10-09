/**
 * Dialog events, navigation, Accept/Reject buttons, dirty hook.
 */

import { readPanelId, resolveTrackElementForSync } from './panelId.js';

export class PanelEvents {
    /**
     * @param {object} module ShowTrackingModule instance
     */
    constructor(module) {
        this.module = module;
        this._bound = false;
        this._onAccept = this.onAccept.bind(this);
        this._onReject = this.onReject.bind(this);
        this._onPrev = this.onPrev.bind(this);
        this._onNext = this.onNext.bind(this);
        this._onClose = this.onClose.bind(this);
        this._onSort = this.onSort.bind(this);
        this._onUserFilter = this.onUserFilter.bind(this);
    }

    wire() {
        const panel = this.module.Panel;
        if (!panel || this._bound) return;

        const accept = panel.querySelector('#btnAcceptTrack');
        const reject = panel.querySelector('#btnRejectTrack');
        const prev = panel.querySelector('#btnPrevTrack');
        const next = panel.querySelector('#btnNextTrack');
        const close = panel.querySelector('.closeIcons');
        const sort = panel.querySelector('#sort_list');
        const select = panel.querySelector('#TrackSelectOpt');

        if (accept) accept.addEventListener('click', this._onAccept);
        if (reject) reject.addEventListener('click', this._onReject);
        if (prev) prev.addEventListener('click', this._onPrev);
        if (next) next.addEventListener('click', this._onNext);
        if (close) close.addEventListener('click', this._onClose);
        if (sort) sort.addEventListener('click', this._onSort);
        if (select) select.addEventListener('change', this._onUserFilter);

        this._bound = true;
        this.module.sync.wire();
        this._wireDirtyHook();
    }

    unwire() {
        this.module.sync.unwire();
        this._bound = false;
    }

    _wireDirtyHook() {
        const self = this;
        try {
            if (typeof GlobalEditor !== 'undefined' && GlobalEditor.on) {
                GlobalEditor.on('change', function () {
                    self.module.sync.scheduleIncrementalSync();
                });
            }
        } catch (err) {
            /* optional */
        }
    }

    onAccept() {
        this._resolveActive('Accepted');
    }

    onReject() {
        this._resolveActive('Rejected');
    }

    _resolveActive(action) {
        const entry = this.module.getActiveEntry();
        if (!entry) return;
        const id = readPanelId(entry);
        const editorRoot = this.module.sync.getEditorRoot();
        if (!editorRoot || !id) return;
        const all = editorRoot.querySelectorAll('[data-sr-panel-id], [data-sr-panel-unique-id]');
        let editorEl = null;
        for (let i = 0; i < all.length; i++) {
            if (readPanelId(all[i]) === id) {
                editorEl = all[i];
                break;
            }
        }
        if (!editorEl) return;
        this.module.actions.resolve(action, editorEl);
        this.module.clearActiveEntry();
        this.updateButtonState();
    }

    onPrev() {
        this._stepActive(-1);
    }

    onNext() {
        this._stepActive(1);
    }

    _stepActive(delta) {
        const panelRoot = this.module.sync.getPanelRoot();
        if (!panelRoot) return;
        const entries = Array.prototype.slice.call(panelRoot.querySelectorAll('.entry'));
        if (!entries.length) return;
        const active = this.module.getActiveEntry();
        let idx = active ? entries.indexOf(active) : -1;
        idx = Math.max(0, Math.min(entries.length - 1, idx + delta));
        const next = entries[idx];
        this.module.sync.highlightPanelEntry(next);
        this.module.setActiveEntry(next);
        if (typeof next.scrollIntoView === 'function') {
            next.scrollIntoView({ block: 'nearest' });
        }
        this.updateButtonState();
    }

    onClose() {
        this.module.closePanel();
    }

    onSort() {
        const panelRoot = this.module.sync.getPanelRoot();
        if (!panelRoot) return;
        const btn = this.module.Panel && this.module.Panel.querySelector('#sort_list');
        const order = (btn && btn.getAttribute('data-order')) || 'index';
        const entries = Array.prototype.slice.call(panelRoot.querySelectorAll('.entry'));
        entries.sort(function (a, b) {
            const ta = parseInt(a.getAttribute('data-id') || '0', 10) || 0;
            const tb = parseInt(b.getAttribute('data-id') || '0', 10) || 0;
            return order === 'time' ? ta - tb : tb - ta;
        });
        if (btn) {
            btn.setAttribute('data-order', order === 'time' ? 'index' : 'time');
        }
        for (let i = 0; i < entries.length; i++) {
            panelRoot.appendChild(entries[i]);
        }
    }

    onUserFilter() {
        const select = this.module.Panel && this.module.Panel.querySelector('#TrackSelectOpt');
        const value = select ? select.value : '';
        const panelRoot = this.module.sync.getPanelRoot();
        if (!panelRoot) return;
        const entries = panelRoot.querySelectorAll('.entry');
        for (let i = 0; i < entries.length; i++) {
            const u = entries[i].getAttribute('data-username') || '';
            const show = !value || value === 'all' || u === value || (u + (entries[i].getAttribute('data-rolename') || '')) === value;
            entries[i].style.display = show ? '' : 'none';
        }
    }

    updateButtonState() {
        const panel = this.module.Panel;
        if (!panel) return;
        const has = !!this.module.getActiveEntry();
        const accept = panel.querySelector('#btnAcceptTrack');
        const reject = panel.querySelector('#btnRejectTrack');
        if (accept) accept.disabled = !has;
        if (reject) reject.disabled = !has;
        this.module.refreshCountsFromPanel();
    }
}

export { resolveTrackElementForSync };
