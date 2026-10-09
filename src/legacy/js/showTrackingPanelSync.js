/**
 * Show Tracking panel unique-id stamp + set-diff helpers.
 * Runtime wiring lives in ShowTracking_Module.js — keep behavior aligned.
 */

export const SR_PANEL_UNIQUE_ID_ATTR = 'data-sr-panel-unique-id';

export function createSrPanelUniqueId() {
    return 'srp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Stamp data-sr-panel-unique-id once. Never rewrite an existing value.
 * @param {Element} el
 * @param {() => string} [idFactory]
 * @returns {string}
 */
export function ensureSrPanelUniqueId(el, idFactory) {
    if (!el || el.nodeType !== 1) return '';
    const existing = el.getAttribute(SR_PANEL_UNIQUE_ID_ATTR);
    if (existing) return existing;
    const factory = typeof idFactory === 'function' ? idFactory : createSrPanelUniqueId;
    const id = factory();
    el.setAttribute(SR_PANEL_UNIQUE_ID_ATTR, id);
    return id;
}

/**
 * @param {Iterable<string>} editorIds
 * @param {Iterable<string>} panelIds
 * @returns {{ toAdd: string[], toRemove: string[] }}
 */
export function computePanelSyncDiff(editorIds, panelIds) {
    const editorSet = new Set();
    const panelSet = new Set();
    for (const id of editorIds || []) {
        if (id) editorSet.add(String(id));
    }
    for (const id of panelIds || []) {
        if (id) panelSet.add(String(id));
    }
    const toAdd = [];
    const toRemove = [];
    editorSet.forEach((id) => {
        if (!panelSet.has(id)) toAdd.push(id);
    });
    panelSet.forEach((id) => {
        if (!editorSet.has(id)) toRemove.push(id);
    });
    return { toAdd, toRemove };
}

/**
 * Prefer unique-id ancestor, else TrackFindQuery closest.
 * @param {Element} elm
 * @param {string} [trackFindQuery]
 * @returns {Element|null}
 */
export function resolveTrackElementForSync(elm, trackFindQuery) {
    if (!elm || typeof elm.closest !== 'function') return null;
    const byUid = elm.closest('[' + SR_PANEL_UNIQUE_ID_ATTR + ']');
    if (byUid) return byUid;
    if (trackFindQuery) {
        try {
            return elm.closest(trackFindQuery);
        } catch (err) {
            return null;
        }
    }
    return null;
}

/**
 * Find panel entry by unique id within a panel/area root.
 * Avoids CSS.escape so older engines stay safe.
 * @param {ParentNode|null} area
 * @param {string} uniqueId
 * @returns {Element|null}
 */
export function findPanelEntryByUniqueId(area, uniqueId) {
    if (!area || !uniqueId || !area.querySelectorAll) return null;
    const want = String(uniqueId);
    const list = area.querySelectorAll('.entry[' + SR_PANEL_UNIQUE_ID_ATTR + ']');
    for (let i = 0; i < list.length; i++) {
        if (list[i].getAttribute(SR_PANEL_UNIQUE_ID_ATTR) === want) return list[i];
    }
    return null;
}
