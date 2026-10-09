import { readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { Window } from 'happy-dom';

const CITE_SELECTOR = 'a.xref[data-role="endnote"]';
const NOTE_SELECTOR = '.fn[data-name="fn"], .fn[fn-type="endnote"]';

function parseHtml(source) {
    const window = new Window();
    window.document.write(source);
    return window.document;
}

function addToIndex(index, key, value) {
    if (!key) return;
    const entries = index.get(key) || [];
    entries.push(value);
    index.set(key, entries);
}

function readAttribute(markup, name) {
    const match = markup.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
    return match ? match[2] : '';
}

function citationFragments(source) {
    const fragments = [];
    const anchorPattern = /<a\b[^>]*>[\s\S]*?<\/a\s*>/gi;
    let match;
    while ((match = anchorPattern.exec(source))) {
        const openingTag = match[0].match(/^<a\b[^>]*>/i)?.[0] || '';
        const classes = readAttribute(openingTag, 'class').split(/\s+/);
        if (classes.includes('xref') && readAttribute(openingTag, 'data-role') === 'endnote') {
            fragments.push({ start: match.index, end: anchorPattern.lastIndex, markup: match[0] });
        }
    }
    return fragments;
}

function hrefTarget(href) {
    if (!href) return '';
    const hash = href.match(/#([^#/?]+)$/)?.[1];
    if (hash) return hash;
    return href.match(/\/([^/?#]+)\/?$/)?.[1] || '';
}

function replaceRid(markup, rid) {
    const ridPattern = /(\brid\s*=\s*)(["'])(.*?)\2/i;
    if (ridPattern.test(markup)) {
        return markup.replace(ridPattern, (_match, prefix, quote) => `${prefix}${quote}${rid}${quote}`);
    }
    return markup.replace(/^<a\b/i, `<a rid="${rid}"`);
}

function replaceLeadingSupText(markup, label) {
    const supPattern = /(<sup\b[^>]*>)([^<]*)/i;
    if (!supPattern.test(markup)) return null;
    return markup.replace(supPattern, (_match, openingTag) => `${openingTag}${label}`);
}

function maskMutableCitationValues(source) {
    const fragments = citationFragments(source);
    let cursor = 0;
    let masked = '';
    fragments.forEach(fragment => {
        let markup = replaceRid(fragment.markup, '__RID__');
        markup = replaceLeadingSupText(markup, '__LABEL__') || markup;
        masked += source.slice(cursor, fragment.start) + markup;
        cursor = fragment.end;
    });
    return masked + source.slice(cursor);
}

function noteRecord(element, index) {
    const label = (element.querySelector('.label')?.textContent || '').trim();
    return {
        index,
        id: (element.id || '').trim(),
        oid: (element.getAttribute('oid') || '').trim(),
        delId: (element.getAttribute('del_id') || '').trim(),
        uid: (element.getAttribute('data-note-uid') || '').trim(),
        label,
        deleted: element.hasAttribute('data-delete') || element.hasAttribute('data-remove')
    };
}

function createNoteIndexes(notes) {
    const indexes = {
        id: new Map(),
        uid: new Map(),
        historical: new Map()
    };
    notes.forEach(note => {
        addToIndex(indexes.id, note.id, note);
        addToIndex(indexes.uid, note.uid, note);
        addToIndex(indexes.historical, note.oid, note);
        addToIndex(indexes.historical, note.delId, note);
    });
    return indexes;
}

function resolveCitation(element, indexes) {
    const rid = (element.getAttribute('rid') || '').trim();
    const uid = (element.getAttribute('data-note-uid') || '').trim();
    const target = hrefTarget((element.getAttribute('href') || '').trim());
    const attempts = [
        { method: 'rid', key: rid, entries: indexes.id.get(rid) || [] },
        { method: 'data-note-uid', key: uid, entries: indexes.uid.get(uid) || [] },
        { method: 'href', key: target, entries: indexes.id.get(target) || [] },
        { method: 'historicalAlias', key: rid, entries: indexes.historical.get(rid) || [] },
        { method: 'historicalAlias', key: target, entries: indexes.historical.get(target) || [] }
    ].filter(attempt => attempt.key);

    for (const attempt of attempts) {
        if (attempt.entries.length > 1) return { ambiguous: attempt, rid, uid, target };
        if (attempt.entries.length === 1) return { resolved: attempt, rid, uid, target };
    }
    return { rid, uid, target };
}

function validateCandidate(source, candidate, notes) {
    const document = parseHtml(candidate);
    const citations = [...document.querySelectorAll(CITE_SELECTOR)];
    const indexes = createNoteIndexes(notes);
    const zeroLabels = citations.filter(citation => {
        const text = (citation.querySelector('sup') || citation).textContent.trim();
        return text === '0';
    }).length;
    const blankRids = citations.filter(citation => !(citation.getAttribute('rid') || '').trim()).length;
    const unresolved = citations.filter(citation => !resolveCitation(citation, indexes).resolved).length;
    const unexpectedContentChanges = maskMutableCitationValues(source) === maskMutableCitationValues(candidate) ? 0 : 1;
    return { zeroLabels, blankRids, unresolved, unexpectedContentChanges };
}

export function recoverIssuedNotesHtml(source) {
    const document = parseHtml(source);
    const citationElements = [...document.querySelectorAll(CITE_SELECTOR)];
    const fragments = citationFragments(source);
    const notes = [...document.querySelectorAll(NOTE_SELECTOR)].map(noteRecord);
    const indexes = createNoteIndexes(notes);
    const errors = [];
    const mappings = [];

    if (citationElements.length !== fragments.length) {
        errors.push({
            type: 'citationSourceMismatch',
            parsed: citationElements.length,
            sourceFragments: fragments.length
        });
    }

    indexes.id.forEach((entries, id) => {
        const active = entries.filter(note => !note.deleted);
        if (active.length > 1) errors.push({ type: 'duplicateActiveId', id, count: active.length });
    });
    notes.filter(note => !note.label).forEach(note => {
        errors.push({ type: 'blankNoteLabel', id: note.id || note.delId, noteIndex: note.index });
    });

    const replacements = [];
    citationElements.forEach((citation, index) => {
        const resolution = resolveCitation(citation, indexes);
        if (resolution.ambiguous) {
            errors.push({
                type: 'ambiguousCitation',
                citationIndex: index,
                method: resolution.ambiguous.method,
                target: resolution.ambiguous.key,
                matches: resolution.ambiguous.entries.map(note => note.id || note.delId)
            });
            return;
        }
        if (!resolution.resolved) {
            errors.push({
                type: 'unresolvedCitation',
                citationIndex: index,
                rid: resolution.rid,
                target: resolution.target,
                uid: resolution.uid
            });
            return;
        }

        const note = resolution.resolved.entries[0];
        const currentId = note.id || note.delId;
        if (!currentId || !note.label) return;
        const fragment = fragments[index];
        if (!fragment) return;
        const withRid = replaceRid(fragment.markup, currentId);
        const recoveredMarkup = replaceLeadingSupText(withRid, note.label);
        if (!recoveredMarkup) {
            errors.push({ type: 'invalidCitationMarkup', citationIndex: index, target: currentId });
            return;
        }
        replacements.push({ ...fragment, markup: recoveredMarkup });
        mappings.push({
            citationIndex: index,
            method: resolution.resolved.method,
            sourceTarget: resolution.resolved.key,
            rid: currentId,
            label: note.label
        });
    });

    let candidate = source;
    if (errors.length === 0) {
        replacements.slice().reverse().forEach(replacement => {
            candidate = candidate.slice(0, replacement.start) + replacement.markup + candidate.slice(replacement.end);
        });
    }

    const validation = errors.length === 0 ? validateCandidate(source, candidate, notes) : {
        zeroLabels: null,
        blankRids: null,
        unresolved: null,
        unexpectedContentChanges: null
    };
    Object.entries(validation).forEach(([key, value]) => {
        if (value) errors.push({ type: 'outputValidationFailed', check: key, count: value });
    });

    const valid = errors.length === 0;
    return {
        valid,
        html: valid ? candidate : null,
        report: {
            valid,
            counts: {
                citations: citationElements.length,
                notes: notes.length,
                recovered: mappings.length,
                errors: errors.length
            },
            validation,
            errors,
            mappings
        }
    };
}

function outputPaths(inputPath) {
    const extension = extname(inputPath) || '.html';
    const stem = inputPath.slice(0, inputPath.length - extension.length);
    return {
        outputPath: `${stem}_recovered${extension}`,
        reportPath: `${stem}_recovery-report.json`
    };
}

export async function runIssuedNotesRecovery(inputPath) {
    const absoluteInput = resolve(inputPath);
    const { outputPath, reportPath } = outputPaths(absoluteInput);
    if (absoluteInput === resolve(outputPath)) throw new Error('Recovery output must not overwrite the source HTML');

    const source = await readFile(absoluteInput, 'utf8');
    const result = recoverIssuedNotesHtml(source);
    await writeFile(reportPath, `${JSON.stringify(result.report, null, 2)}\n`, 'utf8');

    if (!result.valid) {
        await unlink(outputPath).catch(error => {
            if (error.code !== 'ENOENT') throw error;
        });
        return { exitCode: 1, inputPath: absoluteInput, outputPath: null, reportPath };
    }

    await writeFile(outputPath, result.html, 'utf8');
    return { exitCode: 0, inputPath: absoluteInput, outputPath, reportPath };
}
