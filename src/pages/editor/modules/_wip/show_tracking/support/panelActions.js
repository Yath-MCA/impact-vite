/**
 * Accept / Reject for plain ice + per–data-track-code registry.
 */

import { readPanelId, findPanelEntryByPanelId } from './panelId.js';

export class PanelActions {
    /**
     * @param {object} module ShowTrackingModule instance
     */
    constructor(module) {
        this.module = module;
        /** @type {Object.<string, {accept?: Function, reject?: Function}>} */
        this._registry = Object.create(null);
    }

    /**
     * @param {string} code
     * @param {{accept?: Function, reject?: Function}} handlers
     */
    registerAction(code, handlers) {
        if (!code || !handlers) return;
        this._registry[String(code)] = handlers;
    }

    /**
     * @param {string} code
     * @returns {{accept?: Function, reject?: Function}|null}
     */
    getAction(code) {
        if (!code) return null;
        return this._registry[String(code)] || null;
    }

    /**
     * @param {'Accepted'|'Rejected'} action
     * @param {Element} editorEl
     * @returns {boolean} true if handled
     */
    resolve(action, editorEl) {
        if (!editorEl || editorEl.nodeType !== 1) return false;
        const isAccept = action === 'Accepted';
        const trackCode = editorEl.getAttribute('data-track-code');

        if (trackCode) {
            const handlers = this.getAction(trackCode);
            if (!handlers) {
                console.warn('[ShowTracking] No action registered for track-code:', trackCode);
                return false;
            }
            const fn = isAccept ? handlers.accept : handlers.reject;
            if (typeof fn !== 'function') {
                console.warn('[ShowTracking] Missing', action, 'handler for', trackCode);
                return false;
            }
            fn.call(this.module, editorEl, action);
            this._removePanelRowFor(editorEl);
            return true;
        }

        const tag = (editorEl.tagName || '').toLowerCase();
        if (tag !== 'insert' && tag !== 'del') return false;

        if (tag === 'insert') {
            if (isAccept) {
                unwrapElement(editorEl);
            } else {
                removeElement(editorEl);
            }
        } else if (tag === 'del') {
            if (isAccept) {
                removeElement(editorEl);
            } else {
                unwrapElement(editorEl);
            }
        }
        this._removePanelRowFor(editorEl);
        return true;
    }

    _removePanelRowFor(editorEl) {
        const id = readPanelId(editorEl);
        if (!id || !this.module.sync) return;
        const panelRoot = this.module.sync.getPanelRoot();
        const entry = findPanelEntryByPanelId(panelRoot, id);
        if (entry && entry.parentNode) entry.parentNode.removeChild(entry);
        this.module.refreshCountsFromPanel();
    }
}

function unwrapElement(el) {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
}

function removeElement(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
}
