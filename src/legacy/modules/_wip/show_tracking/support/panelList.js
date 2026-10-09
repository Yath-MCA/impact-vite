/**
 * Collect plain ice insert/del + data-track-code nodes; build panel rows.
 * No get_entry_info / splTrack.
 */

import { ensureSrPanelId, SR_PANEL_ID_ATTR, readPanelId } from './panelId.js';

const ICE_SELECTOR = 'insert, del';
const TRACK_CODE_SELECTOR = '[data-track-code]';

/**
 * @param {ParentNode|null} root
 * @returns {Element[]}
 */
export function collectTrackNodes(root) {
    if (!root || !root.querySelectorAll) return [];
    const seen = new Set();
    const out = [];

    const iceNodes = root.querySelectorAll(ICE_SELECTOR);
    for (let i = 0; i < iceNodes.length; i++) {
        const el = iceNodes[i];
        if (el.getAttribute('data-track-code')) continue;
        if (seen.has(el)) continue;
        seen.add(el);
        out.push(el);
    }

    const coded = root.querySelectorAll(TRACK_CODE_SELECTOR);
    for (let i = 0; i < coded.length; i++) {
        const el = coded[i];
        if (seen.has(el)) continue;
        seen.add(el);
        out.push(el);
    }

    return out;
}

/**
 * @param {Element} el
 * @param {object} [filterConfig]
 * @returns {object}
 */
export function buildEntryDto(el, filterConfig) {
    const tag = (el.tagName || '').toLowerCase();
    const trackCode = el.getAttribute('data-track-code') || '';
    const cfg = (trackCode && filterConfig && filterConfig[trackCode]) || {};
    const username = el.getAttribute('data-username') || el.getAttribute('data-userid') || 'unknown';
    const role = el.getAttribute('data-rolename') || '';
    const time = el.getAttribute('data-time') || el.getAttribute('data-timec') || '';
    const text = trackCode
        ? (cfg.hint || cfg.topRowInfoShow || trackCode)
        : String(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);

    let topRowtag = tag === 'del' ? 'del' : 'insert';
    let topRowCSS = tag === 'del' ? 't-text-del' : 't-text-ins';
    let topRowInfoShow = tag === 'del' ? 'Deleted' : 'Inserted';
    if (trackCode && cfg.topRowtag) topRowtag = cfg.topRowtag;
    if (trackCode && cfg.topRowCSS) topRowCSS = cfg.topRowCSS;
    if (trackCode && cfg.topRowInfoShow) topRowInfoShow = cfg.topRowInfoShow;

    const panelId = ensureSrPanelId(el);

    return {
        el,
        panelId,
        trackCode,
        username,
        role,
        time,
        text: text || (trackCode ? '[' + trackCode + ']' : '[empty]'),
        topRowtag,
        topRowCSS,
        topRowInfoShow,
        disableAction: cfg.disableAction || ''
    };
}

/**
 * @param {object} dto
 * @param {number} idx
 * @returns {string}
 */
export function renderEntryHtml(dto, idx) {
    const strip = dto.text.length > 35 ? dto.text.slice(0, 30) + '...' : dto.text;
    const uid = dto.panelId ? ' ' + SR_PANEL_ID_ATTR + '="' + escapeAttr(dto.panelId) + '"' : '';
    return (
        '<div class="d-flex entry"' +
        ' data-action-disable="' + escapeAttr(dto.disableAction) + '"' +
        ' data-order="index"' +
        ' data-index="' + idx + '"' +
        ' data-tag="' + escapeAttr(dto.topRowtag) + '"' +
        ' data-rolename="' + escapeAttr(dto.role) + '"' +
        ' data-id="' + escapeAttr(dto.time) + '"' +
        ' data-username="' + escapeAttr(dto.username) + '"' +
        uid +
        '>' +
        '<div class="d-flex flex-column track-entry-div">' +
        '<div class="d-flex justify-content-between">' +
        '<div class="pb-1 flex-grow-1">' +
        '<span class="t-user">' + escapeHtml(dto.username) + '</span>' +
        '<span class="t-type text-track ' + escapeAttr(dto.topRowtag) + '">' +
        escapeHtml(dto.topRowInfoShow) +
        '</span>' +
        '</div></div>' +
        '<div class="d-flex">' +
        '<span class="' + escapeAttr(dto.topRowCSS) + ' d-flex" title="' + escapeAttr(dto.text) + '">' +
        escapeHtml(strip) +
        '</span></div>' +
        '</div></div>'
    );
}

/**
 * @param {ParentNode|null} root
 * @param {object} [filterConfig]
 * @returns {{ nodes: Element[], dtos: object[], html: string }}
 */
export function buildPanelList(root, filterConfig) {
    const nodes = collectTrackNodes(root);
    const dtos = nodes.map(function (el) {
        return buildEntryDto(el, filterConfig || {});
    });
    const html = dtos.map(function (dto, idx) {
        return renderEntryHtml(dto, idx);
    }).join('');
    return { nodes: nodes, dtos: dtos, html: html };
}

/**
 * @param {Element} el
 * @returns {boolean}
 */
export function isListableTrackNode(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.hasAttribute('data-track-code')) return true;
    const tag = (el.tagName || '').toLowerCase();
    if (tag !== 'insert' && tag !== 'del') return false;
    return !el.getAttribute('data-track-code');
}

export { readPanelId };

function escapeAttr(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
