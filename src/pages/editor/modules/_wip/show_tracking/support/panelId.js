/**
 * Panel↔editor join key helpers for WIP Show Tracking.
 * Primary attr: data-sr-panel-id. Migrates legacy data-sr-panel-unique-id once.
 */

import { computePanelSyncDiff } from '../../../../js/showTrackingPanelSync.js';

export const SR_PANEL_ID_ATTR = 'data-sr-panel-id';
export const SR_PANEL_ID_LEGACY_ATTR = 'data-sr-panel-unique-id';

export { computePanelSyncDiff };

export function createSrPanelId() {
    return 'srp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Stamp data-sr-panel-id once. Migrates legacy unique-id if present. Never rewrite.
 * @param {Element} el
 * @param {() => string} [idFactory]
 * @returns {string}
 */
export function ensureSrPanelId(el, idFactory) {
    if (!el || el.nodeType !== 1) return '';
    const existing = el.getAttribute(SR_PANEL_ID_ATTR);
    if (existing) return existing;

    const legacy = el.getAttribute(SR_PANEL_ID_LEGACY_ATTR);
    if (legacy) {
        el.setAttribute(SR_PANEL_ID_ATTR, legacy);
        return legacy;
    }

    const factory = typeof idFactory === 'function' ? idFactory : createSrPanelId;
    const id = factory();
    el.setAttribute(SR_PANEL_ID_ATTR, id);
    return id;
}

/**
 * @param {Element} elm
 * @param {string} [trackFindQuery]
 * @returns {Element|null}
 */
export function resolveTrackElementForSync(elm, trackFindQuery) {
    if (!elm || typeof elm.closest !== 'function') return null;
    const byNew = elm.closest('[' + SR_PANEL_ID_ATTR + ']');
    if (byNew) return byNew;
    const byLegacy = elm.closest('[' + SR_PANEL_ID_LEGACY_ATTR + ']');
    if (byLegacy) {
        ensureSrPanelId(byLegacy);
        return byLegacy;
    }
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
 * @param {ParentNode|null} area
 * @param {string} panelId
 * @returns {Element|null}
 */
export function findPanelEntryByPanelId(area, panelId) {
    if (!area || !panelId || !area.querySelectorAll) return null;
    const want = String(panelId);
    const list = area.querySelectorAll(
        '.entry[' + SR_PANEL_ID_ATTR + '], .entry[' + SR_PANEL_ID_LEGACY_ATTR + ']'
    );
    for (let i = 0; i < list.length; i++) {
        const el = list[i];
        const id = el.getAttribute(SR_PANEL_ID_ATTR) || el.getAttribute(SR_PANEL_ID_LEGACY_ATTR);
        if (id === want) return el;
    }
    return null;
}

/**
 * @param {Element} el
 * @returns {string}
 */
export function readPanelId(el) {
    if (!el || el.nodeType !== 1) return '';
    return el.getAttribute(SR_PANEL_ID_ATTR) || el.getAttribute(SR_PANEL_ID_LEGACY_ATTR) || '';
}
