import { resolveReferenceLinkField } from './link_adapter.js';

/**
 * Reference dialog — merged leaf module (import-free).
 * Config from REFERENCE_MESSAGES.config (load messages.json at initLoop first).
 */

// ---------------------------------------------------------------------------
// Config accessors
// ---------------------------------------------------------------------------

let cachedConfig = null;
let referenceErrorReporter = null;

// ---------------------------------------------------------------------------
// Debug entry-log dedupe (once per parent window)
// ---------------------------------------------------------------------------

let _refDebugDepth = 0;
let _refDebugSeen = null;
let _refDebugIdleScheduled = false;

function _refDebugEnsureWindow() {
    if (_refDebugSeen) return;
    _refDebugSeen = new Set();
    if (_refDebugDepth > 0) return;
    if (_refDebugIdleScheduled) return;
    _refDebugIdleScheduled = true;
    const clear = () => {
        _refDebugIdleScheduled = false;
        if (_refDebugDepth > 0) return;
        _refDebugSeen = null;
    };
    if (typeof queueMicrotask === 'function') queueMicrotask(clear);
    else Promise.resolve().then(clear);
}

export function referenceDebugBegin() {
    try {
        _refDebugDepth += 1;
        if (!_refDebugSeen) _refDebugSeen = new Set();
    } catch (_) {
        /* never throw */
    }
}

export function referenceDebugEnd() {
    try {
        if (_refDebugDepth > 0) _refDebugDepth -= 1;
        if (_refDebugDepth === 0) _refDebugSeen = null;
    } catch (_) {
        /* never throw */
    }
}

export function referenceDebugLog(label) {
    try {
        _refDebugEnsureWindow();
        const key = String(label == null ? '' : label);
        if (_refDebugSeen.has(key)) return;
        _refDebugSeen.add(key);
        if (typeof debug !== 'undefined' && debug && typeof debug.log === 'function') {
            debug.log(key);
        }
    } catch (_) {
        /* never throw */
    }
}

export function createReferenceElement(tag, attrs = {}, options = {}) {
    referenceDebugLog('reference_common:createReferenceElement');
    const cm = typeof globalThis !== 'undefined' ? globalThis.commonMethods : null;
    if (cm && typeof cm.setAttr === 'function') {
        return cm.setAttr(tag, attrs, options);
    }

    const doc = options.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.createElement) return null;
    const el = typeof tag === 'string' ? doc.createElement(tag) : tag;
    Object.keys(attrs || {}).forEach((key) => {
        const value = attrs[key];
        if (value == null) return;
        if (key === 'value' && el.tagName === 'INPUT') {
            el.value = value;
            return;
        }
        el.setAttribute(key, String(value));
    });
    const appendContent = (content, position) => {
        if (content == null || !el[position]) return;
        if (typeof content === 'string') {
            const temp = doc.createElement('span');
            temp.innerHTML = content;
            el[position](...Array.from(temp.childNodes));
            return;
        }
        el[position](content);
    };
    appendContent(options.prepend, 'prepend');
    appendContent(options.append, 'append');
    if (typeof options.text !== 'undefined') el.textContent = options.text;
    return el;
}

export function setReferenceErrorReporter(reporter) {
    referenceDebugLog('reference_common:setReferenceErrorReporter');
    referenceErrorReporter = typeof reporter === 'function' ? reporter : null;
    if (typeof globalThis !== 'undefined') {
        globalThis.referenceLogError = referenceLogError;
    }
}

export function referenceLogError(functionName, err) {
    referenceDebugLog('reference_common:referenceLogError');
    if (referenceErrorReporter) {
        referenceErrorReporter(functionName, err);
        return;
    }
    const message = err && err.message ? err.message : String(err);
    if (typeof ErrorLogTrace === 'function') {
        ErrorLogTrace(functionName, message);
    }
}

export function resetReferenceConfigCache() {
    referenceDebugLog('reference_common:resetReferenceConfigCache');
    cachedConfig = null;
}

export function getReferenceConfig() {
    // referenceDebugLog('reference_common:getReferenceConfig');
    if (cachedConfig) return cachedConfig;
    const root = typeof REFERENCE_MESSAGES !== 'undefined' ? REFERENCE_MESSAGES : null;
    if (!root || !root.config) {
        throw new Error('reference_common: REFERENCE_MESSAGES.config required (load messages.json at initLoop first)');
    }
    cachedConfig = root.config;
    return cachedConfig;
}

export function getDialogId() {
    referenceDebugLog('reference_common:getDialogId');
    return getReferenceConfig().dialogId;
}
export function getDomIds() {
    referenceDebugLog('reference_common:getDomIds');
    return getReferenceConfig().domIds;
}
export function getRadioNames() {
    referenceDebugLog('reference_common:getRadioNames');
    return getReferenceConfig().radioNames;
}
export function getTokenToInputId() {
    referenceDebugLog('reference_common:getTokenToInputId');
    return getReferenceConfig().tokenToInputId;
}
export function getAuthorIds() {
    referenceDebugLog('reference_common:getAuthorIds');
    return getReferenceConfig().authorIds;
}

export function authorSurnameId(index) {
    referenceDebugLog('reference_common:authorSurnameId');
    return `${getAuthorIds().surnamePrefix}_${index}`;
}

export function authorGivennameId(index) {
    referenceDebugLog('reference_common:authorGivennameId');
    return `${getAuthorIds().givennamePrefix}_${index}`;
}

export function editorSurnameId(index) {
    referenceDebugLog('reference_common:editorSurnameId');
    return `reference_editor_surname_${index}`;
}

export function editorGivennameId(index) {
    referenceDebugLog('reference_common:editorGivennameId');
    return `reference_editor_givenname_${index}`;
}

export function namedPeople(list = []) {
    return normalizeAuthors(list).filter((person) =>
        String(person.surname || '').trim() || String(person.givenname || '').trim()
    );
}

export function queryRequestsEditorGroup(state = {}) {
    referenceDebugLog('reference_common:queryRequestsEditorGroup');
    if (state.mode && state.mode !== 'query') return false;
    const fields = [].concat(state.fields || [], state.missingFields || []);
    return fields.some((field) => field && field.token === 'editor' && field.missing);
}

export function shouldShowEditorGroup(state = {}) {
    referenceDebugLog('reference_common:shouldShowEditorGroup');
    // A CEG <group name="editor"> is not enough. The panel section opens only for
    // ed-book, a document editor person-group that already has a name, or a query
    // that asks for a missing editor.
    if (namedPeople(state.editors).length) return true;
    if (String(state.refType || '').toLowerCase() === 'ed-book') return true;
    return queryRequestsEditorGroup(state);
}

export function applyTypeButtonGroupLock(group, locked) {
    referenceDebugLog('reference_common:applyTypeButtonGroupLock');
    if (!group || !group.querySelectorAll) return;
    const isLocked = !!locked;
    group.classList.toggle('disabled', isLocked);
    group.setAttribute('aria-disabled', isLocked ? 'true' : 'false');
    group.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.disabled = isLocked;
        if (input.parentElement) input.parentElement.classList.toggle('disabled', isLocked);
    });
}

const DOI_STYLE_ID = '‡ref_idDOI';

export function isDoiShapedLinkLeaf(node) {
    referenceDebugLog('reference_common:isDoiShapedLinkLeaf');
    return !!node && resolveReferenceLinkField({ element: node }).semanticType === 'doi';
}

export function classifyLinkLeafValue(node) {
    referenceDebugLog('reference_common:classifyLinkLeafValue');
    if (!node) return { role: 'url', value: '' };
    const descriptor = resolveReferenceLinkField({ element: node });
    return {
        role: descriptor.semanticType,
        value: descriptor.value
    };
}

export function splitLinkValuesFromLeaves(rootEl) {
    referenceDebugLog('reference_common:splitLinkValuesFromLeaves');
    const out = { doi: '', 'ext-link': '' };
    if (!rootEl || !rootEl.querySelectorAll) return out;
    const nodes = rootEl.querySelectorAll(
        '.pub-id, .ext-link, .uri, [data-name="pub-id"], [data-name="ext-link"], [data-name="uri"]'
    );
    nodes.forEach((node) => {
        const { role, value } = classifyLinkLeafValue(node);
        if (!value) return;
        if (role === 'doi') {
            if (!out.doi) out.doi = value;
        } else if (!out['ext-link']) {
            out['ext-link'] = value;
        }
    });
    return out;
}

export function mergeLinkValuesForState(values, linkParts) {
    referenceDebugLog('reference_common:mergeLinkValuesForState');
    const next = { ...(values || {}) };
    const parts = linkParts || {};
    if (Object.prototype.hasOwnProperty.call(parts, 'doi')) {
        next.doi = parts.doi == null ? '' : String(parts.doi);
    }
    if (Object.prototype.hasOwnProperty.call(parts, 'ext-link')) {
        next['ext-link'] = parts['ext-link'] == null ? '' : String(parts['ext-link']);
    }
    return next;
}

// True only when the active style/config order already lists the DOI slot.
// A URL slot that shares the ext-link input does not count. Do not invent the slot.
export function styleOrderHasDoi(state = {}) {
    referenceDebugLog('reference_common:styleOrderHasDoi');
    const lists = [
        state.fields,
        state.template && state.template.fields,
        state.slotOrder,
        state.template && state.template.slotOrder
    ];
    if (lists.some((list) => Array.isArray(list) && list.some((item) => item && item.styleId === DOI_STYLE_ID))) {
        return true;
    }
    const sawStyleFields = lists.some((list) => Array.isArray(list) && list.length);
    if (sawStyleFields) return false;
    const order = state.orderTokens || (state.template && state.template.orderTokens) || [];
    return order.includes(DOI_STYLE_ID);
}

export function shouldPromoteToEdBook({
    refType,
    mixed,
    fields
} = {}) {
    referenceDebugLog('reference_common:shouldPromoteToEdBook');
    const type = String(refType || '').toLowerCase();
    if (type !== 'book' && type !== 'ed-book') return false;
    if (type === 'ed-book') return true;
    const hasDom = !!(mixed && mixed.querySelector && mixed.querySelector('.chapter-title'));
    const hasField = [].concat(fields || []).some((f) => f && f.token === 'chapter-title');
    return hasDom || hasField;
}

export function resolvePromotedRefType(args = {}) {
    referenceDebugLog('reference_common:resolvePromotedRefType');
    const type = String(args.refType || '').toLowerCase() || 'journal';
    if (type === 'ed-book') return 'ed-book';
    return shouldPromoteToEdBook(args) ? 'ed-book' : type;
}


export function editorsForQueryPanel(state = {}) {
    referenceDebugLog('reference_common:editorsForQueryPanel');
    const current = normalizeAuthors(state.editors || []);
    if (!shouldShowEditorGroup(state)) return current;
    const named = namedPeople(current);
    if (named.length) return named;
    return [{
        index: 0,
        surname: '',
        givenname: ''
    }];
}

export function idSelector(id) {
    return `#${CSS.escape(id)}`;
}

export function inputIdForToken(token) {
    referenceDebugLog('reference_common:inputIdForToken');
    const map = getTokenToInputId();
    return map[token] || token;
}

export function tokenForInputId(inputId) {
    referenceDebugLog('reference_common:tokenForInputId');
    const map = getTokenToInputId();
    return Object.keys(map).find((k) => map[k] === inputId) || null;
}

export function resolveLabel(key, fallback = '') {
    referenceDebugLog('reference_common:resolveLabel');
    try {
        const root = typeof REFERENCE_MESSAGES !== 'undefined' ? REFERENCE_MESSAGES : null;
        const lang = (typeof IMPACT !== 'undefined' && IMPACT.lang && IMPACT.lang.code) || 'en';
        const bag = root && (root[lang] || root.en);
        const labels = bag && bag.labels;
        if (labels && typeof labels[key] === 'string') return labels[key];
    } catch (_) {
        /* ignore */
    }
    return fallback;
}

export function getSectionLabels() {
    referenceDebugLog('reference_common:getSectionLabels');
    const cfg = getReferenceConfig();
    const keys = cfg.sectionLabelKeys || {};
    return Object.keys(keys).reduce((acc, section) => {
        acc[section] = resolveLabel(keys[section], section);
        return acc;
    }, {});
}

export function bindConfigFromMessages(target = {}) {
    referenceDebugLog('reference_common:bindConfigFromMessages');
    target.DOM_IDS = getDomIds();
    target.RADIO_NAMES = getRadioNames();
    target.idSelector = idSelector;
    target.getDialogId = getDialogId;
    return target;
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

export const referenceTokenPayloadMap = {
    'year': 'year',
    'article-title': 'articleTitle',
    'chapter-title': 'chapterTitle',
    'source': 'source',
    'fpage': 'fpage',
    'lpage': 'lpage',
    'ext-link': 'doi',
    'volume': 'volume',
    'issue': 'issue',
    'publisher-name': 'publisherName',
    'publisher-loc': 'publisherLoc',
    'edition': 'edition',
    'etal': 'etal',
    'collab': 'collab',
    'supplement': 'supplement',
    'comment': 'comment',
    'uri': 'uri'
};

const AUTHOR_FONT_META_KEYS = [
    'formatModeSurname',
    'inlineFormatSurname',
    'formatModeGiven',
    'inlineFormatGiven',
    'formatModeGivenname',
    'inlineFormatGivenname'
];

function authorFontMetaFrom(author) {
    if (!author || typeof author !== 'object') return {};
    const meta = {};
    AUTHOR_FONT_META_KEYS.forEach((key) => {
        if (author[key] != null) meta[key] = author[key];
    });
    return meta;
}

function mergeAuthorFontMeta(list, previous) {
    const prev = Array.isArray(previous) ? previous : [];
    return (Array.isArray(list) ? list : []).map((person, index) => ({
        ...person,
        ...authorFontMetaFrom(prev[index])
    }));
}

export function normalizeAuthors(authors = []) {
    referenceDebugLog('reference_common:normalizeAuthors');
    const list = Array.isArray(authors) ? authors : [];
    if (!list.length) {
        return [{
            index: 0,
            surname: '',
            givenname: ''
        }];
    }
    return list.map((author, index) => ({
        index: author && author.index != null ? Number(author.index) : index,
        originIndex: author && author.originIndex != null ? Number(author.originIndex) : null,
        surname: author && author.surname != null ? String(author.surname) : '',
        givenname: author && (author.givenname != null ? String(author.givenname) :
            (author['given-names'] != null ? String(author['given-names']) : '')),
        ...authorFontMetaFrom(author)
    }));
}

export function buildPayloadFromState(state = {}) {
    referenceDebugLog('reference_common:buildPayloadFromState');
    const values = state.values || {};
    const authors = normalizeAuthors(state.authors);
    const editors = normalizeAuthors(state.editors).filter((person) =>
        String(person.surname || '').trim() || String(person.givenname || '').trim()
    );
    const translators = normalizeAuthors(state.translators).filter((person) =>
        String(person.surname || '').trim() || String(person.givenname || '').trim()
    );
    const payload = {
        type: state.refType || 'journal',
        author: authors
    };

    if (editors.length) payload.editor = editors;
    if (translators.length) payload.translator = translators;

    Object.keys(referenceTokenPayloadMap).forEach((token) => {
        const key = referenceTokenPayloadMap[token];
        const value = values[token];
        if (value == null || String(value).trim() === '') return;
        if (key === 'etal') {
            payload.etal = true;
            return;
        }
        payload[key] = String(value);
    });

    return payload;
}

export function authorsFromTemplateFields(_fields = [], values = {}) {
    referenceDebugLog('reference_common:authorsFromTemplateFields');
    const surname = values.surname != null ? values.surname : '';
    const given = values['given-names'] != null ? values['given-names'] : '';
    if (!String(surname).trim() && !String(given).trim()) {
        return [{
            index: 0,
            surname: '',
            givenname: ''
        }];
    }
    return [{
        index: 0,
        surname: String(surname),
        givenname: String(given)
    }];
}

// ---------------------------------------------------------------------------
// Contributor actions
// ---------------------------------------------------------------------------

export function handleContributorAction(state = {}, role = 'author', action = 'add', index = 0, toIndex) {
    referenceDebugLog('reference_common:handleContributorAction');
    const key = role === 'editor' ? 'editors' :
        role === 'translator' ? 'translators' : 'authors';
    const list = normalizeAuthors(state[key] || []);
    let next = list.slice();

    if (action === 'add') {
        next.splice(index + 1, 0, {
            index: index + 1,
            originIndex: null,
            surname: '',
            givenname: ''
        });
    } else if (action === 'add-end') {
        next.push({
            index: next.length,
            originIndex: null,
            surname: '',
            givenname: ''
        });
    } else if (action === 'remove' && next.length > 1) {
        next.splice(index, 1);
    } else if (action === 'reorder' && toIndex != null && toIndex !== index && toIndex >= 0 &&
        toIndex < next.length && next[index]) {
        const [moved] = next.splice(index, 1);
        next.splice(toIndex, 0, moved);
    }

    next = next.map((person, i) => ({
        ...person,
        index: i
    }));

    const patch = {
        [key]: next
    };

    if (role === 'author') {
        const values = {
            ...(state.values || {})
        };
        if (next[0]) {
            values.surname = next[0].surname;
            values['given-names'] = next[0].givenname;
        }
        patch.values = values;
    }

    return {
        ...state,
        ...patch
    };
}

// ---------------------------------------------------------------------------
// Citation helpers
// ---------------------------------------------------------------------------

export function isNameDateRef() {
    referenceDebugLog('reference_common:isNameDateRef');
    try {
        return typeof iREF_SCOPE !== 'undefined' && !!iREF_SCOPE.IS_NAME_DATE;
    } catch (_) {
        return false;
    }
}

export function isBooksClient() {
    referenceDebugLog('reference_common:isBooksClient');
    try {
        return typeof IS_JOURNAL !== 'undefined' && !IS_JOURNAL;
    } catch (_) {
        return false;
    }
}

export function shouldShowPlainCite() {
    referenceDebugLog('reference_common:shouldShowPlainCite');
    return isNameDateRef();
}

export function shouldShowInsertRefOnly(mode) {
    referenceDebugLog('reference_common:shouldShowInsertRefOnly');
    return mode === 'insert' && isBooksClient();
}

function resolveRefList(documentRoot) {
    referenceDebugLog('reference_common:resolveRefList');
    const root = documentRoot || (typeof GlobalEditor !== 'undefined' && GlobalEditor.document && GlobalEditor.document.$ ?
        GlobalEditor.document.$ : document);
    if (!root || !root.querySelector) return null;
    return root.querySelector('.ref-list') || root.querySelector('[class*="ref-list"]');
}

function resolveOpenWrapCloseWrap() {
    referenceDebugLog('reference_common:resolveOpenWrapCloseWrap');
    const openwrap = (typeof iREF_SCOPE !== 'undefined' && iREF_SCOPE.Reference && iREF_SCOPE.Reference.openwrap) || '';
    const closewrap = (typeof iREF_SCOPE !== 'undefined' && iREF_SCOPE.Reference && iREF_SCOPE.Reference.closewrap) || '';
    return {
        openwrap,
        closewrap
    };
}

function buildCitationAnchorElement(rid, label, citeId) {
    referenceDebugLog('reference_common:buildCitationAnchorElement');
    return createReferenceElement('a', {
        class: "xref",
        "data-name": "xref",
        "data-role": "bibr",
        "ref-type": "bibr",
        "href": `#${rid}`,
        "rid": rid,
        "fid": citeId || (typeof s4 === 'function' ? s4() : 'cite1')
    }, {
        append: label
    });
}

function buildCitationAnchorHtml(rid, label, citeId) {
    referenceDebugLog('reference_common:buildCitationAnchorHtml');
    const xrefEl = buildCitationAnchorElement(rid, label, citeId);
    return xrefEl ? xrefEl.outerHTML : '';
}

function ensureCitationAnchorHtml(rid, citeHtml, citeId) {
    referenceDebugLog('reference_common:ensureCitationAnchorHtml');
    const value = String(citeHtml || '').trim();
    if (!value) return '';
    const doc = typeof document !== 'undefined' ? document : null;
    if (doc && doc.createElement) {
        const wrap = doc.createElement('span');
        wrap.innerHTML = value;
        if (wrap.querySelector('a.xref, a[data-name="xref"], a[ref-type="bibr"]')) {
            return value;
        }
    }
    return buildCitationAnchorHtml(rid, value, citeId);
}

function buildNumberedCitationHtml(rid, label, citeId) {
    referenceDebugLog('reference_common:buildNumberedCitationHtml');

    const IsSupFormat = (typeof iREF_SCOPE !== 'undefined' && iREF_SCOPE.Reference && iREF_SCOPE.Reference['text-format'] === 'sup');

    const {
        openwrap,
        closewrap
    } = resolveOpenWrapCloseWrap();

    const xrefEl = buildCitationAnchorElement(rid, label, citeId);
    const xrefHtml = xrefEl ? xrefEl.outerHTML : '';

    if (IsSupFormat) {
        const supEl = createReferenceElement('sup', {
            class: "sup",
            "data-name": "sup"
        });
        if (openwrap) supEl.append(openwrap);
        if (xrefEl) supEl.append(xrefEl);
        if (closewrap) supEl.append(closewrap);
        return supEl.outerHTML;
    }

    const before = openwrap ? openwrap : "";
    const after = closewrap ? closewrap : "";
    return before + xrefHtml + after;
}


export function buildInsertCitationHtml({
    refNode,
    rid,
    state = {},
    isPlainText = false
}) {
    referenceDebugLog('reference_common:buildInsertCitationHtml');
    if (!isNameDateRef()) {
        const label = refNode && refNode.getAttribute('data-label') ?
            refNode.getAttribute('data-label') :
            (rid || '').replace(/\D/g, '');
        return buildNumberedCitationHtml(rid, label);
    }

    if (isPlainText) {
        const label = String(state.plainCite || '').trim();
        return label ? buildCitationAnchorHtml(rid, label) : '';
    }

    if (typeof namedCitation === 'function' && refNode) {
        try {
            const IMS = typeof IMPACT_SELECTION !== 'undefined' ? IMPACT_SELECTION : null;
            const output = new namedCitation([rid], {
                new: true,
                rid,
                ref: refNode
            });
            if (output && output.FINAL_OUT && output.FINAL_OUT[0]) {
                const key = IMS && IMS.ISstartOfBlock ? 'direct' : 'indirect';
                const citeEntry = output.FINAL_OUT[0][key] || {};
                let citeHtml = citeEntry.string || citeEntry.text || '';
                citeHtml = ensureCitationAnchorHtml(rid, citeHtml);
                if (IMS && IMS.RG_INFO) {
                    citeHtml = (IMS.RG_INFO.insert_prefix || '') + citeHtml + (IMS.RG_INFO.insert_suffix || '');
                }
                return citeHtml;
            }
        } catch (err) {
            referenceLogError('reference.buildInsertCitationHtml', err);
        }
    }

    const fallback = String(state.plainCite || '').trim();
    return fallback ? buildCitationAnchorHtml(rid, fallback) : '';
}

export function applyInsertToDocument({
    refNode,
    citeHtml = '',
    refOnly = false,
    documentRoot,
    refList: explicitRefList = null,
    contextRef = null
}) {
    referenceDebugLog('reference_common:applyInsertToDocument');
    if (!refNode) {
        return {
            changed: false,
            reason: 'build-failed'
        };
    }
    const isNamedRef = isNameDateRef();
    const refList = explicitRefList || resolveRefList(documentRoot);
    if (!refList) {
        return {
            changed: false,
            reason: 'ref-list-missing',
            refNode,
            html: refNode.outerHTML
        };
    }

    if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION._SNAPSHOT) {
        IMPACT_SELECTION._SNAPSHOT({
            lock: true,
            save: true
        });
    }

    if (!refOnly && citeHtml && typeof GlobalEditor !== 'undefined' && GlobalEditor.insertHtml) {
        GlobalEditor.insertHtml(citeHtml);
    }

    if (isNamedRef && citeHtml && refNode) {
        try {
            const wrap = document.createElement('span');
            wrap.innerHTML = citeHtml;
            const anchor = wrap.querySelector('a');
            if (anchor && anchor.innerHTML) {
                refNode.setAttribute('data-cite-label', anchor.innerHTML);
            }
            if (typeof TOASTER_ALERT != "undefined" && typeof TOASTER_ALERT == "function") {
                TOASTER_ALERT(refOnly ? 'REF_INSERT_ONLY' : 'REF_INSERT');
            }
        } catch (_) {
            /* ignore cite label extraction */
        }
    }

    placeInsertedReferenceNode(refList, refNode, contextRef, isNamedRef);

    if (!isNamedRef && typeof CHECK_ORDER !== 'undefined' && CHECK_ORDER.FIRE_ONCE && typeof GlobalEditor !== 'undefined') {
        CHECK_ORDER.FIRE_ONCE(GlobalEditor, {
            reNumber: true,
            alert: true,
            ins_ref: true
        });
    }

    if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION._SNAPSHOT) {
        IMPACT_SELECTION._SNAPSHOT({
            unlock: true,
            save: true
        });
    }

    if (typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL && typeof CitationNewModule !== 'undefined') {
        if (CitationNewModule.FullyLoaded == false) CitationNewModule.init();

        if (CitationNewModule.M_FUN && typeof CitationNewModule.M_FUN.CreateCiteList === 'function' && typeof GlobalEditor !== 'undefined') {
            CitationNewModule.M_FUN.CreateCiteList(GlobalEditor.getData(), true);
        }
    }

    return {
        changed: true,
        refNode,
        html: refNode.outerHTML,
        applied: true
    };
}

/**
 * Legacy name-date / books: insert after context-menu .ref when still in the list.
 * Numbered journal / no anchor: append to end of .ref-list.
 */
function placeInsertedReferenceNode(refList, refNode, contextRef, isNamedRef) {
    referenceDebugLog('reference_common:placeInsertedReferenceNode');
    const anchor = resolveInsertAnchorRef(refList, contextRef);
    const useAfterAnchor = !!(anchor && (isNamedRef || isBooksClient()));
    if (useAfterAnchor && typeof anchor.insertAdjacentElement === 'function') {
        anchor.insertAdjacentElement('afterend', refNode);
        return;
    }
    refList.appendChild(refNode);
}

function resolveInsertAnchorRef(refList, contextRef) {
    referenceDebugLog('reference_common:resolveInsertAnchorRef');
    if (!refList || !contextRef || !contextRef.nodeType) return null;
    if (!contextRef.classList || !contextRef.classList.contains('ref')) return null;
    if (contextRef === refList || !refList.contains(contextRef)) return null;
    return contextRef;
}

export function syncCitationsAfterEdit({
    refId,
    refNode,
    previewNode
}) {
    referenceDebugLog('reference_common:syncCitationsAfterEdit');
    if (!isNameDateRef() || !refId) return;

    try {
        if (typeof MultiRefModule !== 'undefined' &&
            MultiRefModule.M_FUN &&
            typeof MultiRefModule.M_FUN.UPDATE_CITATIONS === 'function') {
            MultiRefModule.M_SCOPE = MultiRefModule.M_SCOPE || {};
            MultiRefModule.M_SCOPE.REF_ID = refId;
            MultiRefModule.M_SCOPE.CLONE_REF = refNode ? refNode.cloneNode(true) : null;
            MultiRefModule.M_SCOPE.UPDATE_CROSS_CITE = true;

            if (MultiRefModule.ELEMENTS && MultiRefModule.ELEMENTS.previewDiv && previewNode) {
                MultiRefModule.ELEMENTS.previewDiv.innerHTML = '';
                const wrap = document.createElement('div');
                wrap.appendChild(previewNode.cloneNode(true));
                MultiRefModule.ELEMENTS.previewDiv.appendChild(wrap.firstChild);
            }

            MultiRefModule.M_FUN.UPDATE_CITATIONS();
        }
    } catch (err) {
        referenceLogError('reference.syncCitationsAfterEdit', err);
    }
}

// ---------------------------------------------------------------------------
// Insert DOI validation (doi_form)
// ---------------------------------------------------------------------------

const AUTHOR_FIELD_TOKENS = new Set(['surname', 'given-names', 'string-name']);

function getDoiPatterns() {
    referenceDebugLog('reference_common:getDoiPatterns');
    const root = typeof window !== 'undefined' ? window : globalThis;
    const dialog = root.referenceDialog || {};
    const scope = dialog.G_SCOPE || {};
    return {
        pattern1: scope.DOI_Pattern_1 || /^10.\d{4,9}\/[-._;()/:A-Z0-9]+$/igm,
        pattern2: scope.DOI_Pattern_2 || /^10[.][0-9]{4,}[^\s"/<>]*\/[^\s"<>]+$/igm
    };
}

export function getEditorDocumentRoot() {
    referenceDebugLog('reference_common:getEditorDocumentRoot');
    if (typeof GlobalEditor !== 'undefined' && GlobalEditor.document && GlobalEditor.document.$) {
        return GlobalEditor.document.$;
    }
    if (typeof document !== 'undefined') return document;
    return null;
}

export function validateDoiFormat(doi = '') {
    referenceDebugLog('reference_common:validateDoiFormat');
    const value = String(doi || '').trim();
    if (!value) {
        return {
            valid: false,
            empty: true
        };
    }
    const { pattern1, pattern2 } = getDoiPatterns();
    const descriptor = resolveReferenceLinkField({
        value,
        expectedType: 'doi',
        doiPatterns: [pattern1, pattern2]
    });
    return {
        valid: descriptor.semanticType === 'doi' && descriptor.valid,
        empty: false
    };
}

export function validateDoiInsertContent(state = {}) {
    referenceDebugLog('reference_common:validateDoiInsertContent');
    const doi = String(state.doi || '').trim();
    const format = validateDoiFormat(doi);
    if (format.empty || !format.valid) {
        return {
            canUpdate: false,
            keyVal: 'empty_doi_content'
        };
    }
    if (!state.doiFetched) {
        return {
            canUpdate: false,
            keyVal: 'empty_doi_content'
        };
    }
    return {
        canUpdate: true,
        keyVal: ''
    };
}

function resolveFieldValue(state = {}, panel, token) {
    referenceDebugLog('reference_common:resolveFieldValue');
    const values = state.values || {};
    if (values[token] != null && String(values[token]).trim()) {
        return String(values[token]).trim();
    }
    if (!panel) return '';
    const el = panel.querySelector(idSelector(inputIdForToken(token)));
    if (!el) return '';
    if (token === 'etal') return el.checked ? 'et al.' : '';
    return String(el.value || '').trim();
}

function toggleInputHighlight(el, on) {
    referenceDebugLog('reference_common:toggleInputHighlight');
    if (!el) return;
    el.classList.toggle('highlight', !!on);
    const noteEditor = el.closest && el.closest('.note-editor');
    if (noteEditor) noteEditor.classList.toggle('highlight', !!on);
}

function clearValidationHighlights(panel) {
    referenceDebugLog('reference_common:clearValidationHighlights');
    if (!panel) return;
    panel.querySelectorAll('.highlight').forEach((el) => el.classList.remove('highlight'));
}

function richFieldText(html) {
    const stripped = stripSummernoteBreaks(html);
    return String(stripped || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();
}

function resolveMandatoryFieldValue(state = {}, panel, token, options = {}) {
    const el = panel ? panel.querySelector(idSelector(inputIdForToken(token))) : null;
    if (shouldUseRichTitleToken(token, state)) {
        if (!el) return '';
        return richFieldText(getRichTextValue(el, options.owner || null));
    }
    const values = state.values || {};
    if (values[token] != null && String(values[token]).trim()) {
        return String(values[token]).trim();
    }
    if (!el) return '';
    if (token === 'etal') return el.checked ? 'et al.' : '';
    return String(el.value || '').trim();
}

export function fieldsForOpenCheck(state = {}) {
    referenceDebugLog('reference_common:fieldsForOpenCheck');
    const seen = new Set();
    const walked = [];
    const push = (field) => {
        if (!field || !field.token || seen.has(field.token)) return;
        if (AUTHOR_FIELD_TOKENS.has(field.token) && !field.missing) return;
        seen.add(field.token);
        walked.push(field);
    };
    (state.fields || []).forEach((field) => {
        if (!field || field.virtual) return;
        if (field.required || field.missing) push(field);
    });
    (state.missingFields || []).forEach((field) => {
        if (field && field.missing) push(field);
    });
    return walked;
}

export function firstEmptyOpenField(state = {}, panel = null) {
    referenceDebugLog('reference_common:firstEmptyOpenField');
    const walked = fieldsForOpenCheck(state);
    for (let index = 0; index < walked.length; index += 1) {
        const field = walked[index];
        const value = resolveMandatoryFieldValue(state, panel, field.token);
        if (!String(value || '').trim()) return field;
    }
    return null;
}

export function resolveOpenPrompt(state = {}, panel = null) {
    referenceDebugLog('reference_common:resolveOpenPrompt');
    const mode = state.mode;
    if (mode !== 'query' && mode !== 'edit') return {
        action: 'none'
    };
    const empty = firstEmptyOpenField(state, panel);
    if (empty) return {
        action: 'focus',
        token: empty.token
    };
    if (mode !== 'query') return {
        action: 'none'
    };
    const matched = fieldsForOpenCheck(state).find((field) => field.missing);
    if (matched) return {
        action: 'focus',
        token: matched.token
    };
    return {
        action: 'none'
    };
}

export function normalizeCitationDelim(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function hasUnmanagedCitationText(mixed, delimiterTexts = []) {
    referenceDebugLog('reference_common:hasUnmanagedCitationText');
    if (!mixed || !mixed.querySelector) return false;
    if (mixed.querySelector('comment')) return true;
    const known = new Set([
        'edited by',
        ', and',
        '. https://doi.org/',
        ', edited by'
    ].map(normalizeCitationDelim));
    (Array.isArray(delimiterTexts) ? delimiterTexts : []).forEach((value) => {
        const text = normalizeCitationDelim(value);
        if (text) known.add(text);
    });
    const children = mixed.childNodes ? Array.from(mixed.childNodes) : [];
    for (let index = 0; index < children.length; index += 1) {
        const node = children[index];
        if (!node || node.nodeType !== 3) continue;
        const raw = String(node.nodeValue || '').trim();
        if (raw && /[A-Za-z]/.test(raw) && !known.has(normalizeCitationDelim(raw))) {
            return true;
        }
    }
    return false;
}

export function validateMandatoryFields(state = {}, panel = null, options = {}) {
    referenceDebugLog('reference_common:validateMandatoryFields');
    const highlight = options.highlight !== false;
    const fields = state.fields || [];
    let canUpdate = true;
    let keyVal = '';

    if (highlight && panel) clearValidationHighlights(panel);

    fields.forEach((field) => {
        if (!field || !field.required || field.virtual) return;
        if (AUTHOR_FIELD_TOKENS.has(field.token)) return;

        const value = resolveMandatoryFieldValue(state, panel, field.token, options);
        const empty = !value;
        if (empty) {
            canUpdate = false;
            if (!keyVal) keyVal = 'empty_field';
            if (highlight && panel) {
                const el = panel.querySelector(idSelector(inputIdForToken(field.token)));
                toggleInputHighlight(el, true);
            }
        }
    });

    return {
        canUpdate,
        keyVal
    };
}

export function validateAuthorGroup(state = {}, panel = null, options = {}) {
    referenceDebugLog('reference_common:validateAuthorGroup');
    const highlight = options.highlight !== false;
    const DOM_IDS = getDomIds();
    const authors = normalizeAuthors(state.authors || []);
    const collabValue = resolveFieldValue(state, panel, 'collab');
    let canUpdate = true;
    let keyVal = 'empty_au_field';

    if (collabValue) {
        return {
            canUpdate: true,
            keyVal: ''
        };
    }

    const host = panel ? panel.querySelector(idSelector(DOM_IDS.authorRepeat)) : null;
    const rows = host ?
        Array.from(host.querySelectorAll('.form-group[data-author-index], .form-group')) : [];

    if (rows.length) {
        rows.forEach((row) => {
            const inputs = row.querySelectorAll('input:not([type="hidden"])');
            inputs.forEach((input) => {
                const empty = !String(input.value || '').trim();
                if (empty) canUpdate = false;
                if (highlight) toggleInputHighlight(input, empty);
            });
        });
    } else {
        const hasAuthor = authors.some((author) =>
            String(author.surname || '').trim() || String(author.givenname || '').trim());
        if (!hasAuthor) canUpdate = false;
    }

    return {
        canUpdate,
        keyVal: canUpdate ? '' : keyVal
    };
}

// Submit-time counterpart to validateAuthorGroup, for the editor/contributor repeater
// (ed-book). Render-time highlighting for insert/edit mode was removed in renderEditorsOnPanel;
// this is now the only place a missing editor gets flagged there.
export function validateEditorGroup(state = {}, panel = null, options = {}) {
    referenceDebugLog('reference_common:validateEditorGroup');
    const highlight = options.highlight !== false;
    const DOM_IDS = getDomIds();
    let canUpdate = true;
    const keyVal = 'empty_editor_field';

    const host = panel ? panel.querySelector(idSelector(DOM_IDS.editorRepeat)) : null;
    const rows = host ?
        Array.from(host.querySelectorAll('.form-group[data-editor-index]')) : [];

    if (rows.length) {
        rows.forEach((row) => {
            const inputs = row.querySelectorAll('input:not([type="hidden"])');
            inputs.forEach((input) => {
                const empty = !String(input.value || '').trim();
                if (empty) canUpdate = false;
                if (highlight) toggleInputHighlight(input, empty);
            });
        });
    } else {
        const editors = normalizeAuthors(state.editors || []);
        const hasEditor = editors.some((editor) =>
            String(editor.surname || '').trim() || String(editor.givenname || '').trim());
        if (!hasEditor) canUpdate = false;
    }

    return {
        canUpdate,
        keyVal: canUpdate ? '' : keyVal
    };
}

function refsContainText(documentRoot, searchText) {
    referenceDebugLog('reference_common:refsContainText');
    const needle = String(searchText || '').trim();
    if (!needle) return false;

    const root = documentRoot || getEditorDocumentRoot();
    if (!root) return false;

    if (typeof GlobalEditor !== 'undefined' && GlobalEditor.document &&
        typeof GlobalEditor.document.find === 'function') {
        const refs = GlobalEditor.document.find('.ref').toArray();
        return refs.some((ref) => String(ref.getText ? ref.getText() : ref.$.textContent || '')
            .indexOf(needle) > -1);
    }

    const refs = root.querySelectorAll ? root.querySelectorAll('.ref') : [];
    return Array.from(refs).some((ref) => (ref.textContent || '').indexOf(needle) > -1);
}

export async function checkDuplicateReference({
    doi,
    plainText,
    documentRoot
} = {}) {
    referenceDebugLog('reference_common:checkDuplicateReference');
    const searchText = String(doi || plainText || '').trim();
    if (!searchText || !refsContainText(documentRoot, searchText)) {
        return false;
    }

    if (typeof AlertNewDialog !== 'undefined' && typeof AlertNewDialog.fire === 'function') {
        const result = await AlertNewDialog.fire('warning', 'Warning', 'REF_IS_EXITS', 'OK', 'Cancel', true, {
            override: true
        });
        if (result && result.isConfirmed) return false;
        if (result && result.isDenied) return true;
        return true;
    }

    return false;
}

export function applyDoiInputValidation(inputEl, doi = '') {
    referenceDebugLog('reference_common:applyDoiInputValidation');
    if (!inputEl) return validateDoiFormat(doi);
    const format = validateDoiFormat(doi);
    inputEl.classList.remove('is-valid', 'is-invalid');
    if (format.empty) return format;
    inputEl.classList.add(format.valid ? 'is-valid' : 'is-invalid');
    return format;
}

// ---------------------------------------------------------------------------
// Query workflow
// ---------------------------------------------------------------------------

export function queryTextFromNode(queryNode) {
    referenceDebugLog('reference_common:queryTextFromNode');

    if (!queryNode || typeof queryNode.querySelectorAll !== 'function') return '';
    if (typeof queryNode === 'string') return queryNode.trim();

    const label = queryNode.getAttribute && queryNode.getAttribute('data-label');
    const childSpans = queryNode.querySelectorAll('span[data-user-comment-box]');
    if (!childSpans || childSpans.length === 0) return '';

    const firstSpan = childSpans[0];
    const queryComment = firstSpan.getAttribute('data-user-comment-box');
    if (!queryComment) return '';

    return label ? `${label}: ${queryComment.trim()}` : queryComment.trim();
}


// Extract all responses (remaining child spans)
export function getQueryPreviewSpans(queryNode, doc = document) {
    if (!queryNode || typeof queryNode.querySelectorAll !== 'function') return [];

    const label = queryNode.getAttribute && queryNode.getAttribute('data-label');
    const childSpans = queryNode.querySelectorAll('span[data-user-comment-box]');
    if (!childSpans || childSpans.length === 0) return [];

    const spans = [];

    // First child = query
    const queryComment = childSpans[0].getAttribute('data-user-comment-box');
    if (queryComment) {
        const querySpan = doc.createElement('span');
        querySpan.textContent = label ? `${label}: ${queryComment.trim()}` : queryComment.trim();
        spans.push(querySpan);
    }

    // Remaining children = responses
    let responseCount = 1;
    for (let i = 1; i < childSpans.length; i++) {
        const respComment = childSpans[i].getAttribute('data-user-comment-box');
        if (respComment) {
            const respSpan = doc.createElement('span');
            respSpan.textContent = `Response ${responseCount}: ${respComment.trim()}`;
            spans.push(respSpan);
            responseCount++;
        }
    }

    return spans;
}



export const CONFIGURED_REPEAT_SELECTORS = [
    '.source',
    '.volume',
    '.publisher-loc',
    '.publisher-name',
    '.year',
    '.collab',
    '.article-title',
    '.fpage',
    '.lpage',
    '.issue',
    '.chapter-title',
    '.ext-link',
    '.edition',
    '.etal'
];

export function citationHasRepeatedConfiguredElements(refNode) {
    referenceDebugLog('reference_common:citationHasRepeatedConfiguredElements');
    if (!refNode || !refNode.querySelectorAll) return false;
    const root = refNode.querySelector('.mixed-citation') || refNode;
    return CONFIGURED_REPEAT_SELECTORS.some((sel) => root.querySelectorAll(sel).length > 1);
}

export function enterQueryRespondMode(state = {}) {
    referenceDebugLog('reference_common:enterQueryRespondMode');
    return {
        ...state,
        queryRespondMode: true,
        showHints: true
    };
}

export function enterEditAllFieldsMode(state = {}) {
    referenceDebugLog('reference_common:enterEditAllFieldsMode');
    return {
        ...state,
        editAllFields: true,
        queryRespondMode: false
    };
}

export function shouldLockField(state = {}, field = {}) {
    referenceDebugLog('reference_common:shouldLockField');
    if (state.mode !== 'query') return false;
    if (state.editAllFields) return false;
    if (state.queryRespondMode) return true;
    // Missing or query-matched fields stay editable, including when they already have a value.
    if (!field.missing) return true;
    return false;
}

export function shouldLockContributorInputs(state = {}) {
    referenceDebugLog('reference_common:shouldLockContributorInputs');
    if (state.mode !== 'query') return false;
    if (queryRequestsEditorGroup(state)) return true;
    if (state.editAllFields) return false;
    return true;
}

export function shouldLockEditorInputs(state = {}) {
    referenceDebugLog('reference_common:shouldLockEditorInputs');
    if (!queryRequestsEditorGroup(state)) return state.mode === 'query' && !state.editAllFields;
    if (state.queryRespondMode) return true;
    return false;
}

export function shouldAllowQueryFieldEditor(token, state = {}) {
    referenceDebugLog('reference_common:shouldAllowQueryFieldEditor');
    if (state.mode !== 'query') return true;
    if (state.editAllFields) return true;
    if (state.queryRespondMode) return false;
    const fields = Array.isArray(state.fields) ? state.fields : [];
    const field = fields.find((item) => item && item.token === token) ||
        (Array.isArray(state.missingFields) ? state.missingFields.find((item) => item && item.token === token) : null);
    if (!field || !field.missing) return false;
    return !shouldLockField(state, field);
}

function valueToResponseText(value) {
    if (value == null) return '';
    const raw = String(value).trim();
    if (!raw) return '';
    const holder = (typeof document !== 'undefined') ? document.createElement('div') : null;
    if (!holder) return raw;
    holder.innerHTML = raw;
    return (holder.textContent || holder.innerText || raw).trim();
}

function queryFieldLabel(field = {}) {
    return String(field.label || field.title || field.placeholder || field.styleId || field.token || '').trim();
}

function contributorResponseRows(rows = []) {
    return normalizeAuthors(rows)
        .map((row) => [row.surname, row.givenname].filter((value) => String(value || '').trim()).join(' ').trim())
        .filter(Boolean);
}

export function buildQueryMissingResponseText(state = {}) {
    referenceDebugLog('reference_common:buildQueryMissingResponseText');
    const values = state.values || {};
    const seen = {};
    const lines = [];
    (state.fields || []).forEach((field) => {
        if (!field || !field.missing || !field.token || seen[field.token]) return;
        if (field.token === 'editor') return;
        const value = valueToResponseText(values[field.token] != null ? values[field.token] : field.value);
        if (!value) return;
        const label = queryFieldLabel(field);
        lines.push((label ? label + ': ' : '') + value);
        seen[field.token] = true;
    });

    const hasMissingEditor = (state.fields || []).some((field) => field && field.missing && field.token === 'editor');
    if (hasMissingEditor) {
        const editorText = contributorResponseRows(state.editors).join('\n');
        if (editorText) lines.push('Contributors: ' + editorText);
    }

    return lines.join('\n');
}

export function resolveLastSameUserQueryResponse(state = {}) {
    referenceDebugLog('reference_common:resolveLastSameUserQueryResponse');
    const queryNode = state.queryNode && state.queryNode.nodeType === 1 ? state.queryNode : null;
    if (!queryNode) return '';
    const lastResponse = queryNode.lastElementChild;
    if (!lastResponse) return '';
    const root = typeof window !== 'undefined' ? window : globalThis;
    const common = root.commonMethods || globalThis.commonMethods;
    if (!common || typeof common.IS_SAME_USER_AND_ROLE !== 'function') return '';
    if (!common.IS_SAME_USER_AND_ROLE(lastResponse)) return '';
    return String(lastResponse.getAttribute('data-user-comment-box') || '').trim();
}

function resolveQueryComment(refNode, queryNode) {
    if (queryNode && queryNode.nodeType === 1) {
        if (queryNode.matches && queryNode.matches('[data-class="ckcommentsfull"], .query-comment, insert[data-update]')) return queryNode;
        const nested = queryNode.querySelector && queryNode.querySelector('[data-class="ckcommentsfull"], .query-comment, insert[data-update]');
        if (nested) return nested;
    }
    if (refNode && refNode.querySelector) {
        return refNode.querySelector('[data-class="ckcommentsfull"], .query-comment, insert[data-update]');
    }
    return null;
}

export async function applyQueryResponseUpdate({
    refNode,
    queryRespond = '',
    built = null,
    queryNode = null,
    closeQuery = false
}) {
    referenceDebugLog('reference_common:applyQueryResponseUpdate');
    const responseText = String(queryRespond || '').trim();
    if (!responseText) {
        return {
            changed: false,
            reason: 'empty-response'
        };
    }

    try {
        const queryComment = resolveQueryComment(refNode, queryNode);
        const queryId = queryComment && queryComment.id ? queryComment.id : null;
        if (typeof window !== 'undefined' &&
            window.queryModule &&
            typeof window.queryModule.updateRefDOM2State === 'function' &&
            queryComment &&
            queryId) {
            window.queryModule.updateRefDOM2State(queryId, queryComment);
        }

        if (typeof window !== 'undefined' &&
            window.queryModule &&
            typeof window.queryModule.operationInsertOrUpdate === 'function') {
            const preSaveResults = {
                hasContent: true,
                htmlData: responseText,
                textData: responseText,
                htmlLength: responseText.length,
                textLength: responseText.length,
                unchanged: false,
                canSave: true,
                canClose: false,
                domEl: queryComment || refNode
            };
            await window.queryModule.operationInsertOrUpdate(null, queryId, preSaveResults, {
                from: 'MultiRefModule',
                process: 'comment'
            }, {
                domEl: queryComment || refNode,
                content: responseText,
                closeQuery: closeQuery === true
            });
        }

        if (typeof MultiRefModule !== 'undefined' &&
            MultiRefModule.M_FUN &&
            typeof MultiRefModule.M_FUN.SHOW_QUERY_RESPONSE === 'function') {
            /* SHOW_QUERY_RESPONSE toggles UI only — response text applied via update path below */
        }
    } catch (err) {
        referenceLogError('reference.applyQueryResponseUpdate', err);
    }

    return built || {
        changed: true
    };
}

// ---------------------------------------------------------------------------
// Field UI schema (from REFERENCE_MESSAGES.config)
// ---------------------------------------------------------------------------

const DEFAULT_HINT = {
    control: 'text',
    layout: 'full',
    group: 'default',
    label: ''
};

export function getAuthorTokens() {
    referenceDebugLog('reference_common:getAuthorTokens');
    return new Set(getReferenceConfig().authorTokens || []);
}

export function getLayoutColClass() {
    referenceDebugLog('reference_common:getLayoutColClass');
    return getReferenceConfig().layoutColClass || {
        full: 'col-12',
        half: 'col-6',
        third: 'col-4'
    };
}

export function getFieldUiSchema() {
    referenceDebugLog('reference_common:getFieldUiSchema');
    return getReferenceConfig().fieldUiSchema || {};
}

export function getSectionOrder() {
    referenceDebugLog('reference_common:getSectionOrder');
    return getReferenceConfig().sectionOrder || ['title', 'publication', 'link', 'misc'];
}

function getGroupToSection() {
    referenceDebugLog('reference_common:getGroupToSection');
    return getReferenceConfig().groupToSection || {
        title: 'title',
        meta: 'publication',
        pages: 'publication',
        extra: 'link',
        misc: 'misc'
    };
}

function getSectionOverrideByToken() {
    referenceDebugLog('reference_common:getSectionOverrideByToken');
    return getReferenceConfig().sectionOverrideByToken || {
        'ext-link': 'link',
        uri: 'link',
        supplement: 'misc',
        comment: 'misc'
    };
}

export function sectionForField(field) {
    referenceDebugLog('reference_common:sectionForField');
    const token = field && field.token;
    const overrides = getSectionOverrideByToken();
    if (token && overrides[token]) return overrides[token];
    const group = field && field.group;
    const groupMap = getGroupToSection();
    return groupMap[group] || 'misc';
}

export function getFieldHint(token) {
    referenceDebugLog('reference_common:getFieldHint');
    const schema = getFieldUiSchema();
    const hint = schema[token];
    if (!hint) {
        return {
            ...DEFAULT_HINT,
            label: String(token || '')
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (ch) => ch.toUpperCase())
        };
    }
    const label = hint.labelKey ?
        resolveLabel(hint.labelKey, hint.label || '') :
        (hint.label || '');
    return {
        ...DEFAULT_HINT,
        ...hint,
        label
    };
}

export function isTokenAllowedForRefType(hint, refType) {
    referenceDebugLog('reference_common:isTokenAllowedForRefType');
    if (!hint || !hint.refTypes || !hint.refTypes.length) return true;
    return hint.refTypes.indexOf(String(refType || '').toLowerCase()) !== -1;
}

export function mergeFieldsForUi(bridgeFields = [], refType = 'journal', schema) {
    referenceDebugLog('reference_common:mergeFieldsForUi');
    const fieldSchema = schema || getFieldUiSchema();
    const layoutColClass = getLayoutColClass();
    const authorTokens = getAuthorTokens();
    const type = String(refType || 'journal').toLowerCase();
    const out = [];

    (bridgeFields || []).forEach((field, index) => {
        const token = field && field.token ? field.token : '';
        if (!token || authorTokens.has(token)) return;

        const rawHint = fieldSchema[token] ? {
                ...DEFAULT_HINT,
                ...fieldSchema[token]
            } :
            getFieldHint(token);

        const hint = {
            ...rawHint,
            label: rawHint.labelKey ?
                resolveLabel(rawHint.labelKey, rawHint.label || field.label || token) : (rawHint.label || field.label || token)
        };

        if (hint.skipInHost) return;
        if (!isTokenAllowedForRefType(hint, type)) return;

        out.push({
            token,
            styleId: field.styleId || token,
            label: hint.label || field.label || token,
            required: !!field.required || !!field.missing,
            missing: !!field.missing,
            source: field.source || 'default',
            order: field.order != null ? field.order : index,
            value: field.value,
            original: field.original,
            control: hint.control || 'text',
            layout: hint.layout || 'full',
            group: hint.group || 'default',
            colClass: layoutColClass[hint.layout] || layoutColClass.full
        });
    });

    return out.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function layoutClassFor(layout) {
    referenceDebugLog('reference_common:layoutClassFor');
    const layoutColClass = getLayoutColClass();
    return layoutColClass[layout] || layoutColClass.full;
}

// ---------------------------------------------------------------------------
// Form collect / prefill
// ---------------------------------------------------------------------------

// Escapes a value for safe use inside an HTML attribute string in the template-literal-built author rows.
function escapeAttr(value) {
    referenceDebugLog('reference_common:escapeAttr');
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function canUseSummernote() {
    referenceDebugLog('reference_common:canUseSummernote');
    const root = typeof window !== 'undefined' ? window : globalThis;
    const jq = (root && root.$) || (typeof globalThis !== 'undefined' ? globalThis.$ : null);
    if (typeof jq !== 'function') return false;
    try {
        const probe = jq(document.createElement('div'));
        return !!(probe && typeof probe.summernote === 'function');
    } catch (_) {
        return false;
    }
}

function currentDtdIsJats() {
    referenceDebugLog('reference_common:currentDtdIsJats');
    const root = typeof window !== 'undefined' ? window : globalThis;
    const dtd = (root && root.DOC_DTD) ||
        (root && root.SHARED_KEY && root.SHARED_KEY.dtd) ||
        (typeof DOC_DTD !== 'undefined' && DOC_DTD) ||
        (typeof SHARED_KEY !== 'undefined' && SHARED_KEY && SHARED_KEY.dtd) ||
        '';
    if (String(dtd).trim()) return /jats/i.test(String(dtd));
    return (root && root.IS_JOURNAL === true) || (typeof IS_JOURNAL !== 'undefined' && !!IS_JOURNAL);
}

function currentDtdIsBook() {
    referenceDebugLog('reference_common:currentDtdIsBook');
    const root = typeof window !== 'undefined' ? window : globalThis;
    const dtd = (root && root.DOC_DTD) ||
        (root && root.SHARED_KEY && root.SHARED_KEY.dtd) ||
        (typeof DOC_DTD !== 'undefined' && DOC_DTD) ||
        (typeof SHARED_KEY !== 'undefined' && SHARED_KEY && SHARED_KEY.dtd) ||
        '';
    if (String(dtd).trim()) return !/jats/i.test(String(dtd));
    return (root && root.IS_JOURNAL === false) || (typeof IS_JOURNAL !== 'undefined' && !IS_JOURNAL);
}

// Client detection for the PMID field -- PLOS-only, resolved from the live client code, not from
// CEG style config (the CEG <remove style="..." AvilableStyle="..."/> directive some client
// styles carry is legacy: the current ref_bridge/RefBridge engine never reads or implements it).
function currentReferenceClientCode() {
    referenceDebugLog('reference_common:currentReferenceClientCode');
    const root = typeof window !== 'undefined' ? window : globalThis;
    const cm = (root && root.commonMethods) || (typeof commonMethods !== 'undefined' && commonMethods);
    if (cm && typeof cm.getClientCode === 'function') {
        return String(cm.getClientCode({ format: 'lower' }) || '').toLowerCase();
    }
    const key = (root && root.SHARED_KEY) || (typeof SHARED_KEY !== 'undefined' && SHARED_KEY) || {};
    return String(key.client || key.CLIENT || '').toLowerCase();
}

function isPlosReferenceClient() {
    referenceDebugLog('reference_common:isPlosReferenceClient');
    return currentReferenceClientCode() === 'plos';
}

function tokenVisibleForRefType(token, refType = 'journal') {
    referenceDebugLog('reference_common:tokenVisibleForRefType');
    const hint = getFieldHint(token);
    return isTokenAllowedForRefType(hint, refType);
}

// Temporary: keep books name/publisher demand fields as normal inputs until the rich path is re-enabled.
const ENABLE_BOOK_NAME_PUBLISHER_SUMMERNOTE = false;

/** Books demand leaf tokens that carry leaf innerHTML via plain Summernote. */
const BOOK_DEMAND_RICH_TOKENS = new Set([
    'article-title',
    'chapter-title',
    'source'
]);

function isBookDemandRichToken(token) {
    referenceDebugLog('reference_common:isBookDemandRichToken');
    return !!(token && BOOK_DEMAND_RICH_TOKENS && BOOK_DEMAND_RICH_TOKENS.has(token));
}

// Decides whether a field renders as Summernote (innerHTML carrier):
// - JATS journal: article-title only
// - Books: titles + collab demand groups; names/publisher stay as normal inputs for now
// Query lock/unlock uses setRichTextDisabled — never refuse mount solely because a field is locked.
export function shouldUseRichTitleToken(token, state = {}) {
    referenceDebugLog('reference_common:shouldUseRichTitleToken');
    if (!canUseSummernote()) return false;
    const refType = state.refType || 'journal';
    if (!tokenVisibleForRefType(token, refType)) return false;
    if (currentDtdIsJats()) return token === 'article-title' || (token === 'source' && isBooksClient());
    if (currentDtdIsBook()) return isBookDemandRichToken(token);
    return false;
}

export function shouldUseRichContributorInputs(_state = {}) {
    referenceDebugLog('reference_common:shouldUseRichContributorInputs');
    return !!(ENABLE_BOOK_NAME_PUBLISHER_SUMMERNOTE && canUseSummernote() && currentDtdIsBook());
}

export function shouldUsePlainTextRichEditor(state = {}) {
    referenceDebugLog('reference_common:shouldUsePlainTextRichEditor');
    return !!(canUseSummernote() && state.mode === 'insert' && state.insertMethod === 'plain_text');
}

// Checks the jQuery data cache for an already-initialized Summernote instance on this input,
// rather than assuming rich mode from config alone.
function isRichTextActive(input) {
    referenceDebugLog('reference_common:isRichTextActive');
    if (!input) return false;
    const root = typeof window !== 'undefined' ? window : globalThis;
    const jq = root.$ || globalThis.$;
    if (typeof jq !== 'function') return false;
    const $input = jq(input);
    return !!($input.data && $input.data('summernote'));
}

function setRichTextValue(input, value, owner = null) {
    referenceDebugLog('reference_common:setRichTextValue');
    if (!input || !canUseSummernote()) return false;
    const root = typeof window !== 'undefined' ? window : globalThis;
    const jq = root.$ || globalThis.$;
    const $input = jq(input);
    if (typeof $input.summernote === 'function' && !($input.data && $input.data('summernote'))) {
        const config = owner && typeof owner.getSummernoteConfig === 'function' ?
            owner.getSummernoteConfig(input) :
            ((owner && owner.SUMMERNOTE_CONFIG) || {});
        $input.summernote(config);
    }
    if (owner && typeof owner.setSummerNoteContent === 'function') {
        owner.setSummerNoteContent(value == null ? '' : String(value), input);
    } else if (typeof $input.summernote === 'function') {
        $input.summernote('code', value == null ? '' : String(value));
    }
    return true;
}

function getRichTextValue(input, owner = null) {
    referenceDebugLog('reference_common:getRichTextValue');
    if (!input || !canUseSummernote() || !isRichTextActive(input)) {
        return input && input.value != null ? input.value : '';
    }
    const root = typeof window !== 'undefined' ? window : globalThis;
    const jq = root.$ || globalThis.$;
    if (owner && typeof owner.getSummerNoteContent === 'function') {
        return stripSummernoteBreaks(owner.getSummerNoteContent(input));
    }
    return stripSummernoteBreaks(jq(input).summernote('code'));
}

function stripSummernoteBreaks(html) {
    const raw = html == null ? '' : String(html);
    if (!raw || !/<\s*br\b/i.test(raw)) return raw;
    const holder = (typeof document !== 'undefined') ? document.createElement('span') : null;
    if (!holder) return raw.replace(/<\s*br\s*\/?>/gi, '');
    holder.innerHTML = raw;
    holder.querySelectorAll('br').forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    return holder.innerHTML;
}

function clearRichTextEditor(input) {
    referenceDebugLog('reference_common:clearRichTextEditor');
    if (!input || !isRichTextActive(input)) return;
    const root = typeof window !== 'undefined' ? window : globalThis;
    const jq = root.$ || globalThis.$;
    jq(input).summernote('destroy');
}

// Locks/unlocks an already-initialized Summernote instance in place — never destroys it, so the
// rich HTML content and the code get/set API keep working identically while locked.
function setRichTextDisabled(input, disabled) {
    referenceDebugLog('reference_common:setRichTextDisabled');
    if (!input || !isRichTextActive(input)) return;
    const root = typeof window !== 'undefined' ? window : globalThis;
    const jq = root.$ || globalThis.$;
    jq(input).summernote(disabled ? 'disable' : 'enable');
}

function normalizeTrimNumber(value, fallback = 0) {
    referenceDebugLog('reference_common:normalizeTrimNumber');
    const number = parseInt(value, 10);
    return Number.isFinite(number) ? number : fallback;
}

// True when the contributor-trim config says to collapse authors past `after` into "et al."
// once the list reaches `count` — both thresholds come from state.contributorTrim.author.
function shouldApplyTrimEtal(state = {}, authors = []) {
    referenceDebugLog('reference_common:shouldApplyTrimEtal');
    const trim = state.contributorTrim && state.contributorTrim.author;
    const count = normalizeTrimNumber(trim && trim.count, 0);
    const after = normalizeTrimNumber(trim && trim.after, 99);
    return !!(count > 0 && after > 0 && after < 99 && authors.length >= count);
}

// Etal is "active" either because the user checked the explicit etal checkbox,
// or because the contributor-trim rule kicks in automatically for this author count.
function isEtalActiveForAuthors(state = {}, authors = []) {
    referenceDebugLog('reference_common:isEtalActiveForAuthors');
    return !!(state.values && String(state.values.etal || '').trim()) || shouldApplyTrimEtal(state, authors);
}

function authorRowHtml(index, author = {}, meta = {}) {
    referenceDebugLog('reference_common:authorRowHtml');
    const total = meta.total || 1;
    const trimDisabled = !!meta.trimDisabled;
    const locked = !!meta.locked;
    const showReorder = meta.showReorder !== false;
    const rowDisabledClass = (trimDisabled || locked) ? ' disabled' : '';
    const rowDisabledAttr = (trimDisabled || locked) ? ' disabled="disabled"' : '';
    const removeDisabled = total <= 1;
    const upDisabled = index <= 0;
    const downDisabled = index >= total - 1;
    const buttonDisabledClass = (disabled) => disabled ? ' disabled' : '';
    const buttonDisabledAttr = (disabled) => disabled ? ' disabled="disabled"' : '';

    const reorderHtml = showReorder ? `
            <div class="col-1">
                <button type="button" class="btn btn-sm btnAuGroup${buttonDisabledClass(upDisabled)}" id="reference_up_${index}" title="${escapeAttr(resolveLabel('ref_move_up_title', 'Move up'))}" data-author-action="up" data-author-index="${index}"${buttonDisabledAttr(upDisabled)}><i class="fa fa-arrow-up"></i></button>
            </div>
            <div class="col-1">
                <button type="button" class="btn btn-sm btnAuGroup${buttonDisabledClass(downDisabled)}" id="reference_down_${index}" title="${escapeAttr(resolveLabel('ref_move_down_title', 'Move down'))}" data-author-action="down" data-author-index="${index}"${buttonDisabledAttr(downDisabled)}><i class="fa fa-arrow-down"></i></button>
            </div>` : '';

    const actionsHtml = locked ? '' : `
            <div class="col-1">
                <button type="button" class="btn btn-sm btnAuGroup" id="reference_add_${index}" title="${escapeAttr(resolveLabel('ref_add_contributor_title', 'Add contributor'))}" data-author-action="add" data-author-index="${index}"><i class="fa fa-plus"></i></button>
            </div>
            <div class="col-1">
                <button type="button" class="btn btn-sm btnAuGroup${buttonDisabledClass(removeDisabled)}" id="reference_minus_${index}" title="${escapeAttr(resolveLabel('ref_remove_title', 'Remove'))}" data-author-action="remove" data-author-index="${index}"${buttonDisabledAttr(removeDisabled)}><i class="fa fa-minus"></i></button>
            </div>${reorderHtml}`;

    const originIndexAttr = author.originIndex != null ? String(author.originIndex) : 'new';
    return `
            <div class="row form-group${rowDisabledClass}" data-author-index="${index}" data-origin-index="${originIndexAttr}">
            <div class="col-4">
                <input type="text" autocomplete="off" class="inputDiv form-control form-control-sm${rowDisabledClass}"${rowDisabledAttr}
                id="${authorSurnameId(index)}" value="${escapeAttr(author.surname || '')}">
            </div>
            <div class="col-4">
                <input type="text" autocomplete="off" class="inputDiv form-control form-control-sm${rowDisabledClass}"${rowDisabledAttr}
                id="${authorGivennameId(index)}" value="${escapeAttr(author.givenname || '')}">
            </div>${actionsHtml}
            </div>`;
}

function readContributorInputValue(input, owner = null, useRich = false) {
    referenceDebugLog('reference_common:readContributorInputValue');
    if (!input) return '';
    if (useRich) return getRichTextValue(input, owner);
    return input.value != null ? input.value : '';
}

export function collectAuthorsFromPanel(panel, options = {}) {
    referenceDebugLog('reference_common:collectAuthorsFromPanel');
    const DOM_IDS = getDomIds();
    const host = panel.querySelector(idSelector(DOM_IDS.authorRepeat));
    if (!host) return normalizeAuthors([]);
    const owner = options.owner || null;
    const useRich = !!options.useRich;

    const authors = [];
    host.querySelectorAll('.form-group[data-author-index]').forEach((row, index) => {
        const surname = row.querySelector(`#${CSS.escape(authorSurnameId(index))}, [id^="reference_surname_"]`);
        const given = row.querySelector(`#${CSS.escape(authorGivennameId(index))}, [id^="reference_givenname_"]`);
        const originAttr = row.getAttribute('data-origin-index');
        authors.push({
            index,
            originIndex: originAttr && originAttr !== 'new' ? Number(originAttr) : null,
            surname: readContributorInputValue(surname, owner, useRich),
            givenname: readContributorInputValue(given, owner, useRich)
        });
    });

    if (!authors.length) {
        host.querySelectorAll('.form-group').forEach((row, index) => {
            const surname = row.querySelector('input[id^="reference_surname_"]');
            const given = row.querySelector('input[id^="reference_givenname_"]');
            if (surname || given) {
                authors.push({
                    index,
                    surname: readContributorInputValue(surname, owner, useRich),
                    givenname: readContributorInputValue(given, owner, useRich)
                });
            }
        });
    }

    return normalizeAuthors(authors.length ? authors : [{
        index: 0,
        surname: '',
        givenname: ''
    }]);
}

// host.innerHTML = ... below fully destroys and recreates every row's DOM node on every call,
// including whichever one currently has focus (there is no per-row diffing). The scalar
// TOKEN_TO_INPUT_ID render loop skips the currently-focused field for exactly this reason; author/
// editor rows never got that protection. Without this guard, a render triggered while the user is
// mid-keystroke (e.g. the debounced preview refresh firing after a typing pause) tears out the
// input they're typing into and drops focus, so further keystrokes go nowhere -- it looks like
// "my typed name isn't being captured". Buttons (add/remove/up/down) aren't INPUT elements, so
// clicking one -- which blurs the previously-focused input first, per normal browser behavior --
// is unaffected: activeElement is the button by the time render() runs, not a text input.
function isEditingContributorInput(host) {
    if (typeof document === 'undefined') return false;
    const active = document.activeElement;
    return !!(active && host.contains(active) && active.tagName === 'INPUT');
}

export function renderAuthorsOnPanel(panel, authors = [], state = {}, options = {}) {
    referenceDebugLog('reference_common:renderAuthorsOnPanel');
    const DOM_IDS = getDomIds();
    const host = panel.querySelector(idSelector(DOM_IDS.authorRepeat));
    if (!host) return;
    if (isEditingContributorInput(host)) return;
    const owner = options.owner || null;
    const list = normalizeAuthors(authors);
    const trim = state.contributorTrim && state.contributorTrim.author;
    const after = normalizeTrimNumber(trim && trim.after, 99);
    const etalActive = isEtalActiveForAuthors(state, list);
    const lockContributors = (state.mode === 'insert' && state.insertMethod === 'doi_form') ||
        shouldLockContributorInputs(state);
    const useRich = shouldUseRichContributorInputs(state);
    const showReorder = state.mode !== 'edit' && state.mode !== 'query';
    host.innerHTML = list.map((author, index) => authorRowHtml(index, author, {
        total: list.length,
        trimDisabled: etalActive && index >= after,
        locked: lockContributors,
        showReorder
    })).join('');
    if (!useRich) return;
    list.forEach((author, index) => {
        const surname = host.querySelector(`#${CSS.escape(authorSurnameId(index))}`);
        const given = host.querySelector(`#${CSS.escape(authorGivennameId(index))}`);
        if (surname) setRichTextValue(surname, author.surname || '', owner);
        if (given) setRichTextValue(given, author.givenname || '', owner);
    });
}

function editorRowHtml(index, editor = {}, meta = {}) {
    referenceDebugLog('reference_common:editorRowHtml');
    const total = meta.total || 1;
    const locked = !!meta.locked;
    const rowDisabledClass = locked ? ' disabled' : '';
    const rowDisabledAttr = locked ? ' disabled="disabled"' : '';
    const highlightClass = meta.highlight ? ' highlight' : '';
    const removeDisabled = total <= 1;
    const upDisabled = index <= 0;
    const downDisabled = index >= total - 1;
    const buttonDisabledClass = (disabled) => disabled ? ' disabled' : '';
    const buttonDisabledAttr = (disabled) => disabled ? ' disabled="disabled"' : '';
    // Add/move/remove are separate from the input-lock state: a book with an incidentally-named
    // editor (shown per shouldShowEditorGroup so the existing name stays visible/editable) is not
    // a structurally-required editor group, so it should not offer to add/reorder/remove rows --
    // only a ref type where editor is actually required (ed-book, or query explicitly requesting
    // it as missing) shows these controls, independent of whether the fields themselves are locked.
    const showActions = meta.actionsAllowed !== false;
    const showReorder = meta.showReorder !== false;
    const reorderHtml = showReorder ? `
            <div class="col-1">
                <button type="button" class="btn btn-sm btnAuGroup${buttonDisabledClass(upDisabled)}" id="reference_editor_up_${index}" title="${escapeAttr(resolveLabel('ref_move_up_title', 'Move up'))}" data-editor-action="up" data-editor-index="${index}"${buttonDisabledAttr(upDisabled)}><i class="fa fa-arrow-up"></i></button>
            </div>
            <div class="col-1">
                <button type="button" class="btn btn-sm btnAuGroup${buttonDisabledClass(downDisabled)}" id="reference_editor_down_${index}" title="${escapeAttr(resolveLabel('ref_move_down_title', 'Move down'))}" data-editor-action="down" data-editor-index="${index}"${buttonDisabledAttr(downDisabled)}><i class="fa fa-arrow-down"></i></button>
            </div>` : '';
    const actionsHtml = (locked || !showActions) ? '' : `
            <div class="col-1">
                <button type="button" class="btn btn-sm btnAuGroup" id="reference_editor_add_${index}" title="${escapeAttr(resolveLabel('ref_add_editor_title', 'Add editor'))}" data-editor-action="add" data-editor-index="${index}"><i class="fa fa-plus"></i></button>
            </div>
            <div class="col-1">
                <button type="button" class="btn btn-sm btnAuGroup${buttonDisabledClass(removeDisabled)}" id="reference_editor_minus_${index}" title="${escapeAttr(resolveLabel('ref_remove_title', 'Remove'))}" data-editor-action="remove" data-editor-index="${index}"${buttonDisabledAttr(removeDisabled)}><i class="fa fa-minus"></i></button>
            </div>${reorderHtml}`;

    const originIndexAttr = editor.originIndex != null ? String(editor.originIndex) : 'new';
    return `
            <div class="row form-group${rowDisabledClass}" person-group-type="editor" data-editor-index="${index}" data-origin-index="${originIndexAttr}" data-query-matched="true">
            <div class="col-4">
                <input type="text" autocomplete="off" class="inputDiv form-control form-control-sm${rowDisabledClass}${highlightClass}"${rowDisabledAttr}
                id="${editorSurnameId(index)}" data-editor-field="surname" data-editor-index="${index}" value="${escapeAttr(editor.surname || '')}">
            </div>
            <div class="col-4">
                <input type="text" autocomplete="off" class="inputDiv form-control form-control-sm${rowDisabledClass}${highlightClass}"${rowDisabledAttr}
                id="${editorGivennameId(index)}" data-editor-field="givenname" data-editor-index="${index}" value="${escapeAttr(editor.givenname || '')}">
            </div>${actionsHtml}
            </div>`;
}

export function collectEditorsFromPanel(panel, options = {}) {
    referenceDebugLog('reference_common:collectEditorsFromPanel');
    const DOM_IDS = getDomIds();
    const section = panel && panel.querySelector(idSelector(DOM_IDS.editorSection));
    const host = panel && panel.querySelector(idSelector(DOM_IDS.editorRepeat));
    if (!section || !host || section.classList.contains('ds-none')) return null;
    if (!host.querySelector('.form-group[data-editor-index]')) return null;
    const owner = options.owner || null;
    const useRich = !!options.useRich;
    const editors = [];
    host.querySelectorAll('.form-group[data-editor-index]').forEach((row, index) => {
        const surname = row.querySelector(`#${CSS.escape(editorSurnameId(index))}`);
        const given = row.querySelector(`#${CSS.escape(editorGivennameId(index))}`);
        const originAttr = row.getAttribute('data-origin-index');
        editors.push({
            index,
            originIndex: originAttr && originAttr !== 'new' ? Number(originAttr) : null,
            surname: readContributorInputValue(surname, owner, useRich),
            givenname: readContributorInputValue(given, owner, useRich)
        });
    });
    return normalizeAuthors(editors);
}

export function renderEditorsOnPanel(panel, editors = [], state = {}) {
    referenceDebugLog('reference_common:renderEditorsOnPanel');
    if (!panel) return;
    const DOM_IDS = getDomIds();
    const section = panel.querySelector(idSelector(DOM_IDS.editorSection));
    const host = panel.querySelector(idSelector(DOM_IDS.editorRepeat));
    if (!section || !host) return;
    if (isEditingContributorInput(host)) return;
    const show = shouldShowEditorGroup(state);
    section.classList.toggle('ds-none', !show);
    if (!show) {
        host.innerHTML = '';
        return;
    }
    const heading = section.querySelector('.editor-label');
    if (heading) heading.textContent = resolveLabel('ref_editors_heading', 'Contributors/Editors');
    // Render the live editors list as-is (normalizeAuthors already turns an empty array into one
    // blank placeholder row, same as renderAuthorsOnPanel). editorsForQueryPanel's named-only
    // collapsing is for deriving the *initial* prefill list from document/query data (its one
    // caller in query_mode.js) -- applying it here too would silently drop a freshly-added blank
    // row on every render once at least one editor already has a name, since a blank "add" row
    // never has a name at the moment it's created.
    const list = normalizeAuthors(editors);
    const locked = (state.mode === 'insert' && state.insertMethod === 'doi_form') || shouldLockEditorInputs(state);
    // Editor is structurally required only for ed-book, or when query mode explicitly asked for it
    // as a missing field. A book that merely happens to already have a named editor (shown per
    // shouldShowEditorGroup) still gets to display/edit that name, but add/move/remove stay hidden
    // -- it is not a group the user is meant to be building out for that type.
    const actionsAllowed = String(state.refType || '').toLowerCase() === 'ed-book' ||
        queryRequestsEditorGroup(state);
    // Query mode highlights editor rows when the query text matched 'editor' as missing
    // (that's what makes them unlocked here). Insert/edit mode must not highlight on render at
    // all — missing editors there are only flagged at submit time, via validateEditorGroup.
    const highlightOnRender = state.mode === 'query' && !locked;
    const showReorder = state.mode !== 'edit' && state.mode !== 'query';
    host.innerHTML = list.map((editor, index) => editorRowHtml(index, editor, {
        total: list.length,
        locked,
        actionsAllowed,
        highlight: highlightOnRender,
        showReorder
    })).join('');
}

export function collectFromPanel(panel, state = {}, options = {}) {
    referenceDebugLog('reference_common:collectFromPanel');
    const TOKEN_TO_INPUT_ID = getTokenToInputId();
    const DOM_IDS = getDomIds();
    const owner = options.owner || null;
    const openForm = panel.querySelector(idSelector(DOM_IDS.divOpenForm));
    const effectiveState = {
        ...state,
        refType: state.refType || (openForm && openForm.getAttribute('data-current-form')) || 'journal'
    };
    const values = {
        ...(state.values || {})
    };

    Object.keys(TOKEN_TO_INPUT_ID).forEach((token) => {
        const id = inputIdForToken(token);
        const el = panel.querySelector(idSelector(id));
        if (!el) return;
        if (token === 'etal') {
            values.etal = el.checked ? 'et al.' : '';
            return;
        }
        values[token] = shouldUseRichTitleToken(token, effectiveState) ? getRichTextValue(el, owner) :
            (el.value != null ? el.value : '');
    });

    const authors = mergeAuthorFontMeta(collectAuthorsFromPanel(panel, {
        owner,
        useRich: shouldUseRichContributorInputs(effectiveState)
    }), state.authors);
    if (authors[0]) {
        values.surname = authors[0].surname;
        values['given-names'] = authors[0].givenname;
    }
    const collectedEditors = collectEditorsFromPanel(panel, {
        owner,
        useRich: shouldUseRichContributorInputs(effectiveState)
    });
    const editorsWithMeta = collectedEditors == null ?
        (state.editors || []) :
        mergeAuthorFontMeta(collectedEditors, state.editors);

    const plainValue = panel.querySelector(idSelector(DOM_IDS.plainValue));
    const plainCite = panel.querySelector(idSelector(DOM_IDS.plainTextCite));
    const doiValue = panel.querySelector(idSelector(DOM_IDS.doiValue));
    const queryRespond = panel.querySelector(idSelector(DOM_IDS.queryRespond));
    const usesDoiLookup = state.mode === 'insert' && (state.insertMethod || 'doi_form') === 'doi_form';

    return {
        values,
        authors,
        editors: editorsWithMeta,
        translators: state.translators || [],
        plainText: shouldUsePlainTextRichEditor(effectiveState) ? getRichTextValue(plainValue, owner) : (plainValue && plainValue.value != null ? plainValue.value : ''),
        plainCite: plainCite ? plainCite.value : '',
        doi: usesDoiLookup && doiValue ? doiValue.value : (state.doi || ''),
        queryRespond: queryRespond ? queryRespond.value : ''
    };
}

export function dataInputAllows(attr, refType) {
    const type = String(refType || 'journal').toLowerCase();
    const allowed = String(attr || '').split(/\s+/).filter(Boolean);
    return allowed.includes(type);
}

export function applyRefTypeVisibility(panel, refType = 'journal') {
    referenceDebugLog('reference_common:applyRefTypeVisibility');
    const DOM_IDS = getDomIds();
    const openForm = panel.querySelector(idSelector(DOM_IDS.divOpenForm));
    if (openForm) openForm.setAttribute('data-current-form', refType);

    const type = String(refType || 'journal').toLowerCase();

    panel.querySelectorAll('[data-input]').forEach((el) => {
        const raw = el.getAttribute('data-input') || '';
        const show = dataInputAllows(raw, type);
        el.classList.toggle('ds-none', !show && String(raw).trim() !== '');
    });
}

function hostForFieldInput(input) {
    referenceDebugLog('reference_common:hostForFieldInput');
    if (!input) return null;
    const dataInputHost = input.closest && input.closest('[data-input]');
    const formGroup = input.closest && input.closest('.form-group');
    if (!dataInputHost) return formGroup || input;
    if (dataInputHost === input) return input;
    const TOKEN_TO_INPUT_ID = getTokenToInputId();
    const mappedInputCount = Object.keys(TOKEN_TO_INPUT_ID).reduce((count, token) => {
        const mappedInput = dataInputHost.querySelector(idSelector(inputIdForToken(token)));
        return mappedInput ? count + 1 : count;
    }, 0);
    if (mappedInputCount > 1 && formGroup) return formGroup;
    if (dataInputHost) return dataInputHost;
    return formGroup || input;
}

function reconcileSharedFieldGroups(panel) {
    referenceDebugLog('reference_common:reconcileSharedFieldGroups');
    if (!panel) return;
    const TOKEN_TO_INPUT_ID = getTokenToInputId();
    const mappedInputs = Object.keys(TOKEN_TO_INPUT_ID)
        .map((token) => panel.querySelector(idSelector(inputIdForToken(token))))
        .filter(Boolean);

    panel.querySelectorAll('[data-input]').forEach((group) => {
        const childInputs = mappedInputs.filter((input) => input !== group && group.contains(input));
        if (childInputs.length <= 1) return;
        const anyVisibleChild = childInputs.some((input) => {
            const host = hostForFieldInput(input);
            return host && !host.classList.contains('ds-none');
        });
        group.classList.toggle('ds-none', !anyVisibleChild);
    });
}

// Concatenates field-source arrays in the exact order given. Callers choose their own
// precedence (e.g. live state.fields before stale state.template.fields, or vice versa) —
// this helper only removes the repeated Array.isArray-guard boilerplate, never the ordering.
function mergeFieldSources(...sources) {
    referenceDebugLog('reference_common:mergeFieldSources');
    return sources.reduce((acc, list) => acc.concat(Array.isArray(list) ? list : []), []);
}

function visibleFieldTokens(state = {}) {
    referenceDebugLog('reference_common:visibleFieldTokens');
    const type = String(state.refType || 'journal').toLowerCase();
    const orderTokens = activeOrderTokenSet(state);
    const tokens = new Set();
    const fields = mergeFieldSources(state.template && state.template.fields, state.fields);
    fields.forEach((field) => {
        const token = field && field.token === 'pub-id' ? 'doi' : field && field.token;
        if (!token) return;
        if (orderTokens && !orderTokens.has(token)) return;
        const hint = getFieldHint(token);
        if (hint.skipInHost || !isTokenAllowedForRefType(hint, type)) return;
        tokens.add(token);
    });
    return tokens;
}

// doi (DOI) and object-id (PMID) each have their own dedicated input (reference_doi /
// reference_pmid in tokenToInputId) -- only ext-link/uri still share one input (reference_ext_link),
// so they're the only pair left in this alias group. Falling out of this map means
// aliasesForSharedInputToken() defaults to [token] (self-alias), which is correct for a
// single-token input.
const SHARED_INPUT_TOKEN_ALIASES = {
    'ext-link': ['ext-link', 'uri'],
    uri: ['ext-link', 'uri']
};

function aliasesForSharedInputToken(token) {
    referenceDebugLog('reference_common:aliasesForSharedInputToken');
    return SHARED_INPUT_TOKEN_ALIASES[token] || [token];
}

// #reference_comments is legacy static markup (not part of the dynamic CEG field host); only
// un-hide it when the 'comment' token actually carries content, not merely when the ref type allows it.
function commentTokenHasContent(state = {}) {
    referenceDebugLog('reference_common:commentTokenHasContent');
    const values = state.values || {};
    if (hasRenderableValue(values.comment)) return true;
    const fields = mergeFieldSources(state.fields, state.template && state.template.fields);
    const field = fields.find((item) => item && item.token === 'comment');
    return !!(field && (field.missing || hasRenderableValue(field.value)));
}

function applyPreparedFieldVisibility(panel, state = {}) {
    referenceDebugLog('reference_common:applyPreparedFieldVisibility');
    const orderTokens = activeOrderTokenSet(state);
    if (!panel || (!(state.fields || []).length && !orderTokens)) return;
    const TOKEN_TO_INPUT_ID = getTokenToInputId();
    const visibleTokens = visibleFieldTokens(state);
    const handledInputIds = new Set();
    Object.keys(TOKEN_TO_INPUT_ID).forEach((token) => {
        if (token == "etal") return;
        const inputId = inputIdForToken(token);
        if (handledInputIds.has(inputId)) return;
        handledInputIds.add(inputId);
        const input = panel.querySelector(idSelector(inputId));
        const host = hostForFieldInput(input);
        if (!host) return;
        const inputTokens = Object.keys(TOKEN_TO_INPUT_ID)
            .filter((candidate) => inputIdForToken(candidate) === inputId)
            .flatMap(aliasesForSharedInputToken);
        let hiddenByCegOrder = !inputTokens.some((candidate) => visibleTokens.has(candidate));
        if (!hiddenByCegOrder && inputTokens.includes('comment') && !commentTokenHasContent(state)) {
            hiddenByCegOrder = true;
        }
        if (!hiddenByCegOrder && inputTokens.includes('object-id') && !isPlosReferenceClient()) {
            hiddenByCegOrder = true;
        }
        host.classList.toggle('ds-none', hiddenByCegOrder);
        if (!input) return;
        input.dataset.cegOrderHidden = hiddenByCegOrder ? 'true' : 'false';
        if (hiddenByCegOrder) input.setAttribute('disabled', 'disabled');
    });
    reconcileSharedFieldGroups(panel);
}

function hasRenderableValue(value) {
    referenceDebugLog('reference_common:hasRenderableValue');
    return String(value == null ? '' : value).trim() !== '';
}

function fieldAllowsCurrentType(field = {}, refType = 'journal') {
    referenceDebugLog('reference_common:fieldAllowsCurrentType');
    const hint = getFieldHint(field.token);
    return !hint.skipInHost && isTokenAllowedForRefType(hint, String(refType || 'journal').toLowerCase());
}

function activeOrderTokenSet(state = {}) {
    referenceDebugLog('reference_common:activeOrderTokenSet');
    const orderTokens = state.orderTokens || (state.template && state.template.orderTokens);
    if (!Array.isArray(orderTokens) || !orderTokens.length) return null;
    return new Set(orderTokens.filter(Boolean).map((token) => token === 'pub-id' ? 'doi' : token));
}

export function reconcileMappedFieldsFromValues(state = {}) {
    referenceDebugLog('reference_common:reconcileMappedFieldsFromValues');
    const mode = state.mode || 'insert';
    if (mode !== 'edit' && mode !== 'query') return state;

    const TOKEN_TO_INPUT_ID = getTokenToInputId();
    const values = { ...(state.values || {}) };
    if (!hasRenderableValue(values.doi) && hasRenderableValue(values['pub-id'])) {
        values.doi = values['pub-id'];
    }
    const refType = state.refType || (state.template && state.template.refType) || 'journal';
    const fields = Array.isArray(state.fields) ? state.fields : [];
    const templateFields = state.template && Array.isArray(state.template.fields) ? state.template.fields : [];
    const orderTokens = activeOrderTokenSet(state);
    const byToken = new Map();
    const catalog = new Map();

    mergeFieldSources(templateFields, fields).forEach((field, index) => {
        if (!field || !field.token) return;
        const token = field.token === 'pub-id' ? 'doi' : field.token;
        if (!catalog.has(token)) {
            catalog.set(token, {
                ...field,
                token,
                order: field.order != null ? field.order : index
            });
        }
    });

    fields.forEach((field) => {
        if (!field || !field.token) return;
        const token = field.token === 'pub-id' ? 'doi' : field.token;
        // orderTokens reflects the active style's per-field CEG order and never lists
        // group-level pseudo-tokens like 'editor'/'translator' (no TOKEN_TO_INPUT_ID entry).
        // Filtering those out here would silently drop their `missing` marker on every
        // collectIntoState() reconcile, flipping queryRequestsEditorGroup() back to false.
        //
        // A field can also be absent from orderTokens simply because the active CEG style never
        // declares it (e.g. `publisher-loc` for Book-Ref) while still genuinely existing in the
        // source document with real content. Dropping those here discards live document data --
        // not just its position in the rebuilt citation, but the leaf and its adjacent delimiter
        // text entirely -- so only drop an unordered field when it carries no renderable value.
        const isOrderedField = Object.prototype.hasOwnProperty.call(TOKEN_TO_INPUT_ID, token);
        const fieldValue = values[token] != null ? values[token] : field.value;
        if (isOrderedField && orderTokens && !orderTokens.has(token) && !hasRenderableValue(fieldValue)) return;
        byToken.set(token, {
            ...field,
            token,
            value: fieldValue
        });
    });

    Object.keys(TOKEN_TO_INPUT_ID).forEach((token) => {
        if (orderTokens && !orderTokens.has(token)) return;
        const templateField = catalog.get(token);
        if (!templateField || !fieldAllowsCurrentType(templateField, refType)) return;

        const value = values[token];
        const required = !!(templateField.required || templateField.missing);
        const shouldKeep = hasRenderableValue(value) || required;
        if (!shouldKeep) return;

        // ? one link field among ext-link/uri/pub-id - 18_SEP_26_DR
        if (!byToken.has(token)) {
            const siblingLink = aliasesForSharedInputToken(token).find((alias) => (
                alias !== token &&
                byToken.has(alias) &&
                hasRenderableValue(byToken.get(alias).value)
            ));
            if (siblingLink) return;
        }

        const current = byToken.get(token) || {};
        byToken.set(token, {
            ...templateField,
            ...current,
            token,
            label: current.label || templateField.label || getFieldHint(token).label || token,
            styleId: current.styleId || templateField.styleId,
            order: current.order != null ? current.order : templateField.order,
            original: current.original != null ? current.original : (templateField.original || ''),
            value: value != null ? value : (current.value != null ? current.value : templateField.value),
            virtual: current.virtual || !fields.some((field) => field && field.token === token)
        });
    });

    const nextFields = Array.from(byToken.values()).sort((a, b) => {
        const ao = a.order != null ? a.order : Number.MAX_SAFE_INTEGER;
        const bo = b.order != null ? b.order : Number.MAX_SAFE_INTEGER;
        return ao - bo;
    });

    return {
        ...state,
        fields: nextFields
    };
}

function dynamicLabelForToken(token, refType = 'journal') {
    referenceDebugLog('reference_common:dynamicLabelForToken');
    const type = String(refType || 'journal').toLowerCase();
    if (token === 'source') {
        if (type === 'book' || type === 'ed-book') {
            return resolveLabel('ref_field_book_title', 'Book Title');
        }
        return resolveLabel('ref_field_journal_title', 'Journal Title');
    }
    return getFieldHint(token).label || String(token || '');
}

function applyDynamicFieldLabels(panel, state = {}) {
    referenceDebugLog('reference_common:applyDynamicFieldLabels');
    if (!panel) return;
    const refType = state.refType || 'journal';
    const titleToken = String(refType).toLowerCase() === 'ed-book' ? 'chapter-title' : 'article-title';
    const titleLabel = panel.querySelector('label[for="reference_title"]');
    if (titleLabel) titleLabel.textContent = dynamicLabelForToken(titleToken, refType);
    const chapterTitleLabel = panel.querySelector('label[for="reference_chapter_title"]');
    if (chapterTitleLabel) chapterTitleLabel.textContent = dynamicLabelForToken('chapter-title', refType);
    const sourceLabel = panel.querySelector('label[for="reference_source"]');
    if (sourceLabel) sourceLabel.textContent = dynamicLabelForToken('source', refType);
}

export function applyFieldHighlights(panel, state = {}, options = {}) {
    referenceDebugLog('reference_common:applyFieldHighlights');
    const TOKEN_TO_INPUT_ID = getTokenToInputId();
    const {
        shouldLockField: lockFn
    } = options;
    const fields = state.fields || [];
    const values = state.values || {};

    const activeId = typeof document !== 'undefined' && document.activeElement ? document.activeElement.id : '';

    Object.keys(TOKEN_TO_INPUT_ID).forEach((token) => {
        const id = inputIdForToken(token);
        const el = panel.querySelector(idSelector(id));
        if (!el) return;
        const field = fields.find((f) => f.token === token);
        const currentValue = field && field.token && values[field.token] != null ? values[field.token] : (field && field.value);
        const hasCurrentValue = String(currentValue == null ? '' : currentValue).trim() !== '';
        // Query-missing fields stay highlighted even when they already carry a value (see
        // shouldUnlockQueryField's "including when they already have a value" contract) --
        // gating on hasCurrentValue here silently dropped the highlight while every other
        // consumer of field.missing (locking, canSubmit, focus-jump) kept treating it as missing.
        const missing = !!(field && field.missing) && !hasCurrentValue;
        const hiddenByCegOrder = el.dataset && el.dataset.cegOrderHidden === 'true';
        const locked = typeof lockFn === 'function' ?
            lockFn(state, field || {
                token,
                missing: false
            }) :
            false;

        el.classList.toggle('highlight', missing);

        // Never disable the field the user is actively editing — toggling `disabled` on a
        // focused element blurs it and blocks further input. For rich-text fields the element
        // actually receiving focus is Summernote's own `.note-editor`/`.note-editable` wrapper,
        // not the original input, so check both.
        const noteEditor = el.closest && el.closest('.note-editor');
        const isRichTextFocused = !!(isRichTextActive(el) && noteEditor && typeof document !== 'undefined' &&
            document.activeElement && noteEditor.contains(document.activeElement));
        const isFocused = id === activeId || isRichTextFocused;

        if (isFocused) return;

        el.classList.toggle('disabled', hiddenByCegOrder || locked);
        if (hiddenByCegOrder || locked) el.setAttribute('disabled', 'disabled');
        else el.removeAttribute('disabled');
        setRichTextDisabled(el, hiddenByCegOrder || locked);
    });
}

export function prefillPanel(panel, state = {}, options = {}) {
    referenceDebugLog('reference_common:prefillPanel');
    if (!panel) return;

    const TOKEN_TO_INPUT_ID = getTokenToInputId();
    const DOM_IDS = getDomIds();
    const owner = options.owner || null;
    const values = { ...(state.values || {}) };
    if (!hasRenderableValue(values.doi) && hasRenderableValue(values['pub-id'])) {
        values.doi = values['pub-id'];
    }
    const activeId = typeof document !== 'undefined' && document.activeElement ? document.activeElement.id : '';

    applyRefTypeVisibility(panel, state.refType || 'journal');
    applyPreparedFieldVisibility(panel, state);
    applyDynamicFieldLabels(panel, state);

    const handledSharedInputIds = new Set();
    Object.keys(TOKEN_TO_INPUT_ID).forEach((token) => {
        const id = inputIdForToken(token);
        if (activeId === id) return;
        if (token !== 'etal' && handledSharedInputIds.has(id)) return;
        const el = panel.querySelector(idSelector(id));
        if (!el) return;
        if (token === 'etal') {
            el.checked = isEtalActiveForAuthors(state, normalizeAuthors(state.authors || []));
            return;
        }
        handledSharedInputIds.add(id);
        // Multiple tokens can share one input (e.g. ext-link/uri -> #reference_ext_link,
        // see tokenToInputId in messages.json). Picking whichever alias actually has content
        // avoids a later empty alias clobbering an earlier populated one purely because of
        // Object.keys() iteration order.
        // doi uses dedicated #reference_doi (CMS18/BITS).
        const aliasTokens = [...new Set(
            Object.keys(TOKEN_TO_INPUT_ID)
                .filter((candidate) => inputIdForToken(candidate) === id)
                .flatMap(aliasesForSharedInputToken)
        )];
        const valueToken = aliasTokens.find((candidate) => hasRenderableValue(values[candidate])) || token;
        const next = values[valueToken] != null ? String(values[valueToken]) : '';
        if (shouldUseRichTitleToken(valueToken, state)) {
            setRichTextValue(el, next, owner);
        } else {
            clearRichTextEditor(el);
            if (el.value !== next) el.value = next;
        }
    });

    renderAuthorsOnPanel(panel, state.authors || [], state, {
        owner
    });
    renderEditorsOnPanel(panel, state.editors || [], state);

    const plainValue = panel.querySelector(idSelector(DOM_IDS.plainValue));
    if (plainValue && activeId !== DOM_IDS.plainValue) {
        if (shouldUsePlainTextRichEditor(state)) {
            setRichTextValue(plainValue, state.plainText || '', owner);
        } else {
            clearRichTextEditor(plainValue);
            plainValue.value = state.plainText || '';
        }
    }
    const plainCite = panel.querySelector(idSelector(DOM_IDS.plainTextCite));
    if (plainCite && activeId !== DOM_IDS.plainTextCite) {
        plainCite.value = state.plainCite || '';
    }
    const doiValue = panel.querySelector(idSelector(DOM_IDS.doiValue));
    if (doiValue && activeId !== DOM_IDS.doiValue) {
        const usesDoiLookup = state.mode === 'insert' && (state.insertMethod || 'doi_form') === 'doi_form';
        doiValue.value = usesDoiLookup ? (state.doi || '') : '';
    }
    const queryRespond = panel.querySelector(idSelector(DOM_IDS.queryRespond));
    if (queryRespond && activeId !== DOM_IDS.queryRespond) {
        queryRespond.value = state.queryRespond || '';
    }

    applyFieldHighlights(panel, state, options);
}

function prefillPlainTextInsert(panel, state = {}, options = {}) {
    referenceDebugLog('reference_common:prefillPlainTextInsert');
    if (!panel) return;
    const DOM_IDS = getDomIds();
    const owner = options.owner || null;
    const activeId = typeof document !== 'undefined' && document.activeElement ? document.activeElement.id : '';
    const plainValue = panel.querySelector(idSelector(DOM_IDS.plainValue));
    if (plainValue && activeId !== DOM_IDS.plainValue) {
        if (!setRichTextValue(plainValue, state.plainText || '', owner)) {
            plainValue.value = state.plainText || '';
        }
    }
    const plainCite = panel.querySelector(idSelector(DOM_IDS.plainTextCite));
    if (plainCite && activeId !== DOM_IDS.plainTextCite) {
        plainCite.value = state.plainCite || '';
    }
}

// ---------------------------------------------------------------------------
// FormChrome
// ---------------------------------------------------------------------------

class FormChrome {
    constructor(elements = {}, panel = null, owner = null) {
        referenceDebugLog('reference_common:constructor');
        this.elements = elements;
        this.panel = panel;
        this.owner = owner;
    }

    _ensureReady() {
        referenceDebugLog('reference_common:_ensureReady');
        return Promise.resolve();
    }

    render(state = {}, options = {}) {
        referenceDebugLog('reference_common:render');
        const panel = this.panel || (this.elements.formGroup && this.elements.formGroup.closest(idSelector(getDialogId())));
        if (state.mode === 'insert' && state.insertMethod === 'plain_text') {
            this.renderPlainTextInsert(state, options, panel);
            return;
        }
        this.renderHeader(state);

        this.renderInsertMethodChrome(state);
        this.renderPlainCiteChrome(state);
        this.renderBulkPlainChrome(state);
        this.renderQueryChrome(state);
        const prefillOptions = {
            owner: this.owner,
            // applyFieldHighlights calls lockFn(state, field) — pass matching arity
            shouldLockField: (stateArg, field) => shouldLockField(stateArg || state, field)
        };
        if (panel && !options.skipPrefill) {
            prefillPanel(panel, state, prefillOptions);
        } else if (panel) {
            applyFieldHighlights(panel, state, prefillOptions);
        }
        this.renderPreview(state);
        this.renderActions(state);
    }

    renderPlainTextInsert(state = {}, options = {}, panel = null) {
        referenceDebugLog('reference_common:renderPlainTextInsert');
        this.renderHeader(state);

        this.renderInsertMethodChrome(state);
        this.renderPlainCiteChrome(state);
        this.renderBulkPlainChrome(state);
        if (panel && !options.skipPrefill) {
            prefillPlainTextInsert(panel, state, {
                owner: this.owner
            });
        }
        this.renderPreview(state);
        this.renderActions(state);
    }

    renderHeader(state = {}) {
        referenceDebugLog('reference_common:renderHeader');
        const title = this.elements.headerTitle;
        if (!title) return;
        if (state.mode === 'edit') title.textContent = 'Edit Reference';
        else if (state.mode === 'query') title.textContent = 'Update Missing Elements';
        else title.textContent = 'Insert New Reference';
    }



    renderPlainCiteChrome(state = {}) {
        referenceDebugLog('reference_common:renderPlainCiteChrome');
        const showCite = shouldShowPlainCite();
        const method = state.insertMethod || 'doi_form';
        const isPlain = state.mode === 'insert' && method === 'plain_text';
        const isBulk = isPlain && state.bulkPlainEnabled === true;
        if (this.elements.plainCiteGroup) {
            this.elements.plainCiteGroup.classList.toggle('ds-none', !showCite || !isPlain || isBulk);
        }
    }

    isLocalPlainTextBulkEnabled() {
        const root = (typeof window !== 'undefined' ? window : globalThis);
        return !!(root && root.IS_LOCAL_HOST === true) ||
            (typeof IS_LOCAL_HOST !== 'undefined' && IS_LOCAL_HOST === true);
    }

    renderBulkPlainChrome(state = {}) {
        referenceDebugLog('reference_common:renderBulkPlainChrome');
        const method = state.insertMethod || 'doi_form';
        const isPlain = state.mode === 'insert' && method === 'plain_text';
        const show = isPlain && this.isLocalPlainTextBulkEnabled();
        if (this.elements.bulkPlainWrap) {
            this.elements.bulkPlainWrap.classList.toggle('ds-none', !show);
        }
        if (this.elements.bulkPlainInsert) {
            this.elements.bulkPlainInsert.checked = show && state.bulkPlainEnabled === true;
        }
    }

    renderQueryChrome(state = {}) {
        referenceDebugLog('reference_common:renderQueryChrome');
        const mode = state.mode || 'insert';
        const hasQuery = !!(state.queryNode || state.queryText);
        const showQueryPanel = (mode === 'query' || mode === 'edit') && hasQuery;
        const showRespond = !!state.queryRespondMode;
        const showHints = /* !!state.showHints && */ state.mode === 'insert' && state.insertMethod === 'plain_text';

        if (this.elements.queryDiv) {
            this.elements.queryDiv.classList.toggle('ds-none', !showQueryPanel);
        }
        if (this.elements.queryPreview && showQueryPanel) {
            const preview = this.elements.queryPreview;
            preview.innerHTML = '';
            const spans = state.queryNode ? getQueryPreviewSpans(state.queryNode) : [];
            if (spans.length) {
                spans.forEach((span) => {
                    preview.appendChild(span);
                });
            } else if (state.queryText) {
                const span = (preview.ownerDocument || document).createElement('span');
                span.textContent = state.queryText;
                preview.appendChild(span);
            }
        }
        if (this.elements.queryRespondDiv) {
            this.elements.queryRespondDiv.classList.toggle('ds-none', !showRespond);
        }
        if (this.elements.hintsDiv) {
            this.elements.hintsDiv.classList.toggle('ds-none', !showHints);
        }
    }

    renderInsertMethodChrome(state = {}) {
        referenceDebugLog('reference_common:renderInsertMethodChrome');
        const method = state.insertMethod || 'doi_form';
        const mode = state.mode || 'insert';
        if (this.elements.methodGroup) {
            this.elements.methodGroup.classList.toggle('ds-none', mode !== 'insert');
        }
        if (this.elements.typeRow) {
            // Type row stays visible for plain_text (user + AnyStyle can set refType).
            this.elements.typeRow.classList.toggle('ds-none', false);
        }
        if (this.elements.formGroup) {
            const show = mode === 'insert' ? method : 'open_form';
            this.elements.formGroup.setAttribute('data-group-show', show);
        }
        if (this.elements.openFormGroup) {
            const dimOpenForm = mode === 'insert' && method === 'doi_form' && !state.doiFetched;
            this.elements.openFormGroup.classList.toggle('opacity', dimOpenForm);
        }
        const radios = this.elements.methodRadios || [];
        radios.forEach((input) => {
            const active = input.value === method;
            input.checked = active;
            if (input.parentElement) input.parentElement.classList.toggle('active', active);
        });
        if (this.elements.doiFetchBtn) {
            const hasDoi = String(state.doi || '').trim().length > 0;
            this.elements.doiFetchBtn.classList.toggle('disabled', !hasDoi);
        }
        const showOtherType = mode === 'insert' && method === 'plain_text';
        const typeRoot = this.elements.typeBtnGroup || this.elements.typeRow;
        const otherInput = typeRoot && typeRoot.querySelector ?
            typeRoot.querySelector('input[name="REFERENCE_REF_TYPE"][value="other"]') : null;
        const otherLabel = otherInput && otherInput.parentElement;
        if (otherLabel) otherLabel.classList.toggle('ds-none', !showOtherType);
        applyTypeButtonGroupLock(this.elements.typeBtnGroup, mode === 'edit' || mode === 'query');
    }

    renderPreview(state = {}) {
        referenceDebugLog('reference_common:renderPreview');
        const host = this.elements.previewHost;
        if (!host) return;
        while (host.firstChild) host.removeChild(host.firstChild);

        if (state.previewNode && state.previewNode.cloneNode) {
            const wrap = createReferenceElement('div', {
                class: 'reference-preview-html'
            });
            wrap.appendChild(state.previewNode.cloneNode(true));
            host.appendChild(wrap);
            return;
        }

        host.textContent = state.preview || '';
    }

    renderActions(state = {}) {
        referenceDebugLog('reference_common:renderActions');
        const mode = state.mode || 'insert';
        const canSubmit = !!state.canSubmit;
        const showInsertRefOnly = shouldShowInsertRefOnly(mode);
        const insertLabel = showInsertRefOnly ?
            resolveLabel('ref_insert_with_citation', 'Insert with Citation') :
            resolveLabel('ref_insert', 'Insert');

        if (this.elements.insertBtn) {
            this.elements.insertBtn.classList.toggle('ds-none', mode !== 'insert');
            this.elements.insertBtn.classList.toggle('disabled', !!state.bulkPlainPreparing);
            this.elements.insertBtn.disabled = !!state.bulkPlainPreparing;
            this.elements.insertBtn.textContent = insertLabel;
        }
        if (this.elements.insertRefOnlyBtn) {
            this.elements.insertRefOnlyBtn.classList.toggle('ds-none', !showInsertRefOnly);
            this.elements.insertRefOnlyBtn.classList.toggle('disabled', !!state.bulkPlainPreparing);
            this.elements.insertRefOnlyBtn.disabled = !!state.bulkPlainPreparing;
        }
        if (this.elements.updateBtn) {
            const showUpdate = mode === 'edit' || (mode === 'query' && !state.queryRespondMode);
            this.elements.updateBtn.classList.toggle('ds-none', !showUpdate);
            this.elements.updateBtn.classList.toggle('disabled', !canSubmit);
        }
        if (this.elements.editAllBtn) {
            this.elements.editAllBtn.classList.toggle('ds-none', mode !== 'query' || !!state.editAllFields);
        }
        if (this.elements.replyQryBtn) {
            this.elements.replyQryBtn.classList.toggle('ds-none', mode !== 'query' || !!state.queryRespondMode);
        }
        if (this.elements.updateCmdBtn) {
            this.elements.updateCmdBtn.classList.toggle('ds-none', mode !== 'query' || !state.queryRespondMode);
            this.elements.updateCmdBtn.classList.toggle('disabled', !canSubmit && !String(state.queryRespond || '').trim());
        }
    }

    collectFormValues(state = {}) {
        referenceDebugLog('reference_common:collectFormValues');
        const panel = this.panel || (this.elements.formGroup && this.elements.formGroup.closest(idSelector(getDialogId())));
        if (!panel) {
            return {
                values: state.values || {},
                authors: state.authors || [],
                editors: state.editors || [],
                translators: state.translators || [],
                doi: state.doi || '',
                plainText: state.plainText || '',
                plainCite: state.plainCite || '',
                queryRespond: state.queryRespond || ''
            };
        }
        return collectFromPanel(panel, state, {
            owner: this.owner
        });
    }

    static create(elements, panel = null, owner = null) {
        referenceDebugLog('reference_common:create');
        return new FormChrome(elements, panel, owner);
    }
}

export {
    FormChrome
};

// ---------------------------------------------------------------------------
// Default export bag
// ---------------------------------------------------------------------------

export default {
    FormChrome,
    bindConfigFromMessages,
    getReferenceConfig,
    referenceTokenPayloadMap,
    createReferenceElement,
    getDialogId,
    getDomIds,
    getRadioNames,
    getTokenToInputId,
    getAuthorIds,
    authorSurnameId,
    authorGivennameId,
    idSelector,
    inputIdForToken,
    tokenForInputId,
    resolveLabel,
    getSectionLabels,
    normalizeAuthors,
    buildPayloadFromState,
    authorsFromTemplateFields,
    handleContributorAction,
    isNameDateRef,
    isBooksClient,
    shouldShowPlainCite,
    shouldShowInsertRefOnly,
    shouldUseRichTitleToken,
    shouldAllowQueryFieldEditor,
    shouldUseRichContributorInputs,
    shouldUsePlainTextRichEditor,
    validateDoiFormat,
    validateDoiInsertContent,
    validateMandatoryFields,
    fieldsForOpenCheck,
    firstEmptyOpenField,
    resolveOpenPrompt,
    hasUnmanagedCitationText,
    stripSummernoteBreaks,
    validateAuthorGroup,
    validateEditorGroup,
    checkDuplicateReference,
    applyDoiInputValidation,
    getEditorDocumentRoot,
    buildInsertCitationHtml,
    applyInsertToDocument,
    syncCitationsAfterEdit,
    queryTextFromNode,
    getQueryPreviewSpans,
    citationHasRepeatedConfiguredElements,
    enterQueryRespondMode,
    enterEditAllFieldsMode,
    shouldLockField,
    shouldLockContributorInputs,
    shouldLockEditorInputs,
    queryRequestsEditorGroup,
    shouldShowEditorGroup,
    applyTypeButtonGroupLock,
    styleOrderHasDoi,
    isDoiShapedLinkLeaf,
    classifyLinkLeafValue,
    splitLinkValuesFromLeaves,
    mergeLinkValuesForState,
    shouldPromoteToEdBook,
    resolvePromotedRefType,
    editorsForQueryPanel,
    renderEditorsOnPanel,
    collectEditorsFromPanel,
    applyQueryResponseUpdate,
    resolveLastSameUserQueryResponse,
    getAuthorTokens,
    getLayoutColClass,
    getFieldUiSchema,
    getSectionOrder,
    sectionForField,
    getFieldHint,
    isTokenAllowedForRefType,
    reconcileMappedFieldsFromValues,
    mergeFieldsForUi,
    layoutClassFor,
    collectAuthorsFromPanel,
    renderAuthorsOnPanel,
    collectFromPanel,
    applyRefTypeVisibility,
    applyFieldHighlights,
    prefillPanel
};
