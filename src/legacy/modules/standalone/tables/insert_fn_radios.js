function xmlFlag(value) {
    if (value === true || value === 1) return true;
    return String(value == null ? '' : value).toLowerCase() === 'true';
}

const DEFAULT_RADIO_LABELS = {
    tblFnRadioNumeric: 'Numbers (1, 2, 3)',
    tblFnRadioAlpha: 'Letters (a, b, c)',
    tblFnRadioSymbol: 'Symbols (*, \u2020)',
    tblFnRadioProbability: 'P-value (*)',
    tblFnRadioNote: 'General note',
    tblFnRadioAbbrev: 'Abbreviations',
    tblFnRadioSource: 'Source',
    tblFnKindNumbered: 'Number',
    tblFnKindUnnumbered: 'Unnumbered',
    tblFnFmtNumbered: 'Number format',
    tblFnFmtUnnumbered: 'Unnumbered format',
    tblFnType: 'Footnote type'
};

function labelsFromMessagesBag(winBag) {
    if (!winBag || typeof winBag !== 'object') return {};
    if (winBag.en && winBag.en.labels && typeof winBag.en.labels === 'object') return winBag.en.labels;
    if (winBag.labels && typeof winBag.labels === 'object') return winBag.labels;
    return {};
}

function tblFnLabelsFromSources(override, winBag) {
    const fromWin = labelsFromMessagesBag(winBag);
    const extra = override && typeof override === 'object' ? override : {};
    const merged = {};
    Object.keys(DEFAULT_RADIO_LABELS).forEach((key) => {
        if (extra[key] != null && String(extra[key]) !== '') merged[key] = String(extra[key]);
        else if (fromWin[key] != null && String(fromWin[key]) !== '') merged[key] = String(fromWin[key]);
        else merged[key] = DEFAULT_RADIO_LABELS[key];
    });
    return merged;
}

function radioLabel(labels, key) {
    const bag = tblFnLabelsFromSources(labels, typeof window !== 'undefined' ? window.TABLE_NOTES_MESSAGES : null);
    return bag[key] || DEFAULT_RADIO_LABELS[key];
}

function designatedRadio(designators, labels) {
    const key = String(designators || '');
    if (key === 'arabic') return { value: 'numeric', label: radioLabel(labels, 'tblFnRadioNumeric') };
    if (key === 'alphabets' || key === 'Alphabets') return { value: 'alpha', label: radioLabel(labels, 'tblFnRadioAlpha') };
    if (key === 'symbol_1') return { value: 'symbol', label: radioLabel(labels, 'tblFnRadioSymbol') };
    return null;
}

function wrapfooterActive(wf) {
    const cfg = wf || {};
    return xmlFlag(cfg.show) || xmlFlag(cfg.ins_note) || xmlFlag(cfg.ins_footnote) ||
        xmlFlag(cfg.ins_abbrev) || xmlFlag(cfg.ins_source) || xmlFlag(cfg.ins_probability) ||
        !!designatedRadio(cfg.designators);
}

function emptyInsertFnRadios() {
    return { numbered: [], unnumbered: [] };
}

function buildInsertFnRadios(wrapfooter, labels) {
    const wf = wrapfooter || {};
    if (!wrapfooterActive(wf)) return emptyInsertFnRadios();
    const bag = tblFnLabelsFromSources(labels, typeof window !== 'undefined' ? window.TABLE_NOTES_MESSAGES : null);
    const numbered = [];
    const unnumbered = [];
    if (xmlFlag(wf.ins_footnote)) {
        const designated = designatedRadio(wf.designators, bag);
        if (designated) numbered.push(designated);
    }
    if (xmlFlag(wf.ins_probability)) {
        numbered.push({ value: 'probability', label: radioLabel(bag, 'tblFnRadioProbability') });
    }
    if (xmlFlag(wf.ins_note)) {
        unnumbered.push({ value: 'note', label: radioLabel(bag, 'tblFnRadioNote') });
    }
    if (xmlFlag(wf.ins_abbrev)) {
        unnumbered.push({ value: 'abbrev', label: radioLabel(bag, 'tblFnRadioAbbrev') });
    }
    if (xmlFlag(wf.ins_source)) {
        unnumbered.push({ value: 'source', label: radioLabel(bag, 'tblFnRadioSource') });
    }
    return { numbered: numbered, unnumbered: unnumbered };
}

function kindForUiType(uiType, radios) {
    const r = radios || emptyInsertFnRadios();
    if ((r.numbered || []).some((x) => x.value === uiType)) return 'numbered';
    if ((r.unnumbered || []).some((x) => x.value === uiType)) return 'unnumbered';
    return '';
}

function isCuedUiType(uiType) {
    return uiType === 'alpha' || uiType === 'numeric' || uiType === 'symbol' || uiType === 'probability';
}

function htmlToPlain(html) {
    const s = String(html == null ? '' : html)
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return s;
}

function cannedPrefixForType(uiType) {
    if (uiType === 'abbrev') return 'Abbreviations:';
    if (uiType === 'source') return 'Source:';
    return '';
}

function parseCannedPrefix(plain) {
    const match = String(plain || '').match(/^(Abbreviations|Source)\s*:\s*(.*)$/i);
    if (!match) return null;
    const kind = String(match[1]).toLowerCase() === 'source' ? 'source' : 'abbrev';
    return { kind: kind, rest: String(match[2] || '').trim() };
}

function seedTextForType(uiType) {
    const prefix = cannedPrefixForType(uiType);
    return prefix ? prefix + ' ' : '';
}

function assignRenumberedByCiteOrder(cite, curOrder) {
    const order = curOrder || [];
    (cite || []).forEach((item, index) => {
        item.Renumbered = order[index] != null ? String(order[index]) : String(index + 1);
        item.index = index;
    });
    return cite;
}

function isDeletedFnEl(el) {
    if (!el || !el.getAttribute) return false;
    if (el.getAttribute('data-delete') || el.getAttribute('data-del')) return true;
    if (el.classList && el.classList.contains('del')) return true;
    return !!(el.closest && (el.closest('del') || el.closest('[data-delete]')));
}

function summerHtmlToJats(html) {
    let out = String(html == null ? '' : html);
    out = out.replace(/<\s*\/?\s*strong\s*>/gi, (m) => (/\//.test(m) ? '</bold>' : '<bold>'));
    out = out.replace(/<\s*\/?\s*b\s*>/gi, (m) => (/\//.test(m) ? '</bold>' : '<bold>'));
    out = out.replace(/<\s*\/?\s*em\s*>/gi, (m) => (/\//.test(m) ? '</italic>' : '<italic>'));
    out = out.replace(/<\s*\/?\s*i\s*>/gi, (m) => (/\//.test(m) ? '</italic>' : '<italic>'));
    out = out.replace(/<\s*\/?\s*u\s*>/gi, (m) => (/\//.test(m) ? '</underline>' : '<underline>'));
    out = out.replace(/<\s*\/?\s*sup\s*>/gi, (m) => (/\//.test(m) ? '</sup>' : '<sup>'));
    out = out.replace(/<\s*\/?\s*sub\s*>/gi, (m) => (/\//.test(m) ? '</sub>' : '<sub>'));
    return out;
}

function nextFnInsertBody(uiType, currentHtml) {
    const seed = seedTextForType(uiType);
    const plain = htmlToPlain(currentHtml);
    if (!plain) return seed;
    const canned = parseCannedPrefix(plain);
    const rest = canned ? canned.rest : plain;
    const next = rest ? (seed ? seed + rest : rest) : seed;
    if (htmlToPlain(next) === plain) return null;
    return next;
}

function toElementNode(node) {
    if (!node) return null;
    let el = node.nodeType != null ? node : (node.$ || node);
    if (!el) return null;
    if (el.nodeType === 3) el = el.parentElement || el.parentNode;
    if (el && el.nodeType !== 1) el = el.parentElement || el.$ || null;
    return el && el.nodeType === 1 ? el : null;
}

function isLiveTblFnCiteAnchor(aEl) {
    if (!aEl || typeof aEl.getAttribute !== 'function') return false;
    return aEl.getAttribute('ref-type') === 'table-fn' && !aEl.getAttribute('data-remove');
}

function tblFnCiteFromAscendantA(element) {
    if (!element || typeof element.getAscendant !== 'function') return null;
    const aTrue = element.getAscendant('a', true);
    return isLiveTblFnCiteAnchor(aTrue) ? aTrue : null;
}

function findTblFnXrefEl(node) {
    const el = toElementNode(node);
    if (!el) return null;
    if (el.getAttribute && el.getAttribute('ref-type') === 'table-fn' && el.classList && el.classList.contains('xref')) {
        return el;
    }
    if (el.closest) {
        return el.closest('a.xref[ref-type="table-fn"]') || null;
    }
    return null;
}

function countLiveTblFnXrefs(root, rid) {
    if (!root || !rid || !root.querySelectorAll) return 0;
    return Array.from(root.querySelectorAll('a.xref[ref-type="table-fn"][rid="' + rid + '"]')).filter((el) => !isDeletedFnEl(el)).length;
}

function lastCiteRemovesNote(liveCount) {
    return Number(liveCount) <= 1;
}

function canInsertTblFnCite(fnEl, foot) {
    return !!(fnEl && foot && typeof foot.contains === 'function' && foot.contains(fnEl));
}

function pickNextFnLabel(choices, used) {
    const taken = used || [];
    return (choices || []).find((lab) => taken.indexOf(lab) === -1) || '';
}

function isProbabilityCueLabel(label) {
    return /^\*+$/.test(String(label || '').trim());
}

function nextProbabilityLabel(used) {
    const taken = {};
    (used || []).forEach((lab) => {
        taken[String(lab)] = true;
    });
    let n = 1;
    while (taken['*'.repeat(n)]) n += 1;
    return '*'.repeat(n);
}

function probabilityLabelChoices(used) {
    const maxUsed = (used || []).reduce((max, lab) => {
        const s = String(lab || '').trim();
        if (!isProbabilityCueLabel(s)) return max;
        return s.length > max ? s.length : max;
    }, 0);
    const len = Math.max(3, maxUsed + 1);
    const out = [];
    for (let i = 1; i <= len; i += 1) out.push('*'.repeat(i));
    return out;
}

function splitFnBodyParagraphs(html) {
    const s = String(html == null ? '' : html).trim();
    if (!s) return [''];
    const parts = [];
    const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = re.exec(s))) parts.push(match[1]);
    if (parts.length > 1) return parts;
    if (parts.length === 1 && /<p\b/i.test(s) && (s.match(/<p\b/gi) || []).length === 1) return parts;
    const byBr = s.split(/<br\s*\/?\s*>/i).map((x) => x.trim()).filter(Boolean);
    if (byBr.length > 1) return byBr;
    return parts.length ? parts : [s];
}

function applySplitFnParagraphs(fnEl, html) {
    if (!fnEl || !fnEl.querySelector) return 0;
    const paras = splitFnBodyParagraphs(html);
    const firstP = fnEl.querySelector('.p');
    if (!firstP || !paras.length) return 0;
    firstP.innerHTML = paras[0];
    for (let i = 1; i < paras.length; i += 1) {
        const p = firstP.cloneNode(false);
        p.removeAttribute('id');
        if (typeof GENERATE_ID === 'function') p.id = GENERATE_ID();
        p.innerHTML = paras[i];
        firstP.parentNode.appendChild(p);
    }
    return paras.length;
}

function wrapBareTblFnStarXrefs(root) {
    if (!root || !root.querySelectorAll) return 0;
    let count = 0;
    Array.from(root.querySelectorAll('a.xref[ref-type="table-fn"]')).forEach((a) => {
        if (a.querySelector && a.querySelector('sup')) return;
        const t = String(a.textContent || '').replace(/\s+/g, '').trim();
        if (!isProbabilityCueLabel(t)) return;
        while (a.firstChild) a.removeChild(a.firstChild);
        const sup = a.ownerDocument.createElement('sup');
        sup.className = 'sup';
        sup.setAttribute('data-name', 'sup');
        sup.textContent = t;
        a.appendChild(sup);
        count += 1;
    });
    return count;
}

function firstNonEmptyHtml() {
    const list = arguments;
    for (let i = 0; i < list.length; i += 1) {
        const html = list[i];
        if (htmlToPlain(html)) return String(html);
    }
    return '';
}

function cannedPrefixOnly(html) {
    const p = htmlToPlain(html);
    return p === 'Abbreviations:' || p === 'Source:';
}

function nodeHtml(el) {
    if (!el) return '';
    return firstNonEmptyHtml(el.innerHTML, el.textContent, el.value);
}

function lastNoteEditableHtml(panel) {
    if (!panel || !panel.querySelectorAll) return { html: '', count: 0 };
    const editables = panel.querySelectorAll('.note-editable');
    if (!editables.length) return { html: '', count: 0 };
    return { html: nodeHtml(editables[editables.length - 1]), count: editables.length };
}

function readTblFnDialogContent(host) {
    let root = host && host.querySelector ? host : null;
    if ((!root || !root.querySelector) && typeof document !== 'undefined') {
        root = document.querySelector('#tableNotesDialog:not(.ds-none)') || document.getElementById('tableNotesDialog') || document;
    }
    if (!root || !root.querySelector) return '';
    const panel = root.querySelector('.tbl-fn-new-panel') || root;
    const body = panel.querySelector('#tbl_fn_body') || root.querySelector('#tbl_fn_body');
    let snCode = '';
    try {
        if (typeof $ !== 'undefined' && $.fn && $.fn.summernote && body) {
            snCode = $(body).summernote('code') || '';
        }
    } catch (err) {
        snCode = '';
    }
    const { html: editableHtml, count } = lastNoteEditableHtml(panel);
    if (htmlToPlain(editableHtml) && !cannedPrefixOnly(editableHtml)) return editableHtml;
    if (htmlToPlain(snCode) && !cannedPrefixOnly(snCode)) return snCode;
    if (htmlToPlain(editableHtml)) return editableHtml;
    if (htmlToPlain(snCode)) return snCode;
    if (count) return '';
    return body ? nodeHtml(body) : '';
}

export {
    xmlFlag,
    radioLabel,
    DEFAULT_RADIO_LABELS,
    tblFnLabelsFromSources,
    wrapfooterActive,
    buildInsertFnRadios,
    kindForUiType,
    isCuedUiType,
    designatedRadio,
    htmlToPlain,
    nextFnInsertBody,
    assignRenumberedByCiteOrder,
    isDeletedFnEl,
    summerHtmlToJats,
    findTblFnXrefEl,
    isLiveTblFnCiteAnchor,
    tblFnCiteFromAscendantA,
    countLiveTblFnXrefs,
    lastCiteRemovesNote,
    canInsertTblFnCite,
    pickNextFnLabel,
    isProbabilityCueLabel,
    nextProbabilityLabel,
    probabilityLabelChoices,
    splitFnBodyParagraphs,
    applySplitFnParagraphs,
    wrapBareTblFnStarXrefs,
    readTblFnDialogContent,
    cannedPrefixOnly,
    firstNonEmptyHtml,
    toElementNode
};
