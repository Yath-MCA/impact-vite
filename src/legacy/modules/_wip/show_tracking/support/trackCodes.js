/**
 * Canonical data-track-code values for ShowTracking dual-write migration.
 * Keep in sync with support_data.json → new_tracking_code.
 */

export const TRACK_CODES = Object.freeze({
    LINK_NEW: 'link-01',
    LINK_EDIT: 'link-02',
    LINK_REMOVE: 'link-03',
    LINK_REMOVE_TXT: 'link-04',
    STYLE: 'style-01',
    HEAD_STYLE: 'head-style-01',
    LIST_STYLE: 'list-style-01',
    PARA_SPLIT: 'para-split-01',
    PARA_INSERT: 'para-insert-01',
    PARA_MERGE: 'para-merge-01',
    CELL_ALIGN: 'cell-align-01',
    REPLACE_TEXT: 'replace-text-01',
    REPLACE_TEXT_WSC: 'replace-text-wsc'
});

/** Legacy attr → track code (for dual-write / audits). */
export const LEGACY_ATTR_TO_CODE = Object.freeze({
    'data-link': null, // value-dependent: new|edit|remove|removetxt → link-01…04
    'data-style': TRACK_CODES.STYLE,
    'data-head-level': TRACK_CODES.HEAD_STYLE,
    'data-list-style': TRACK_CODES.LIST_STYLE,
    'data-split-child': TRACK_CODES.PARA_SPLIT,
    'data-insert-para': TRACK_CODES.PARA_INSERT,
    'data-para-merge': TRACK_CODES.PARA_MERGE,
    'data-cell-action': TRACK_CODES.CELL_ALIGN,
    'data-group-action': TRACK_CODES.REPLACE_TEXT
});

export const PENDING_NEW_CODES = Object.freeze([
    TRACK_CODES.STYLE,
    TRACK_CODES.HEAD_STYLE,
    TRACK_CODES.LIST_STYLE,
    TRACK_CODES.PARA_SPLIT,
    TRACK_CODES.PARA_INSERT,
    TRACK_CODES.PARA_MERGE,
    TRACK_CODES.CELL_ALIGN,
    TRACK_CODES.REPLACE_TEXT,
    TRACK_CODES.REPLACE_TEXT_WSC
]);

/**
 * Map data-link value to track code.
 * @param {string} linkType
 * @returns {string}
 */
export function linkTypeToTrackCode(linkType) {
    switch (String(linkType || '').toLowerCase()) {
        case 'edit':
            return TRACK_CODES.LINK_EDIT;
        case 'remove':
            return TRACK_CODES.LINK_REMOVE;
        case 'removetxt':
            return TRACK_CODES.LINK_REMOVE_TXT;
        case 'new':
        default:
            return TRACK_CODES.LINK_NEW;
    }
}

/**
 * Resolve code for a legacy attribute (+ optional value).
 * @param {string} attr
 * @param {string} [value]
 * @returns {string|null}
 */
export function resolveTrackCodeForLegacyAttr(attr, value) {
    if (attr === 'data-link') return linkTypeToTrackCode(value);
    if (attr === 'data-group-action' && String(value) === 'wsc') {
        return TRACK_CODES.REPLACE_TEXT_WSC;
    }
    return LEGACY_ATTR_TO_CODE[attr] || null;
}

/**
 * True when support map has an entry for code.
 * @param {Object} newTrackingCodeMap
 * @param {string} code
 * @returns {boolean}
 */
export function hasTrackCodeConfig(newTrackingCodeMap, code) {
    return !!(code && newTrackingCodeMap && newTrackingCodeMap[code]);
}

// Also publish on window for non-module producers (commonEvtHandler, ParaMergeSplit, etc.)
if (typeof window !== 'undefined') {
    window.IMPACT_TRACK_CODES = TRACK_CODES;
    window.resolveTrackCodeForLegacyAttr = resolveTrackCodeForLegacyAttr;
}