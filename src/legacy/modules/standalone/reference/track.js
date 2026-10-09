import {
    findReferenceLinkLeaf
} from './link_adapter.js';

class ReferenceTrack {
    /*
    Case 1: empty original, plain input filled
    Result: insert
    Original:
    <span class="volume" data-name="volume"></span>
    Revised:
    <span class="volume" data-name="volume"><insert>12</insert></span>

    Case 2: empty original, rich or Summernote filled
    Result: insert
    Original:
    <span class="article-title" data-name="article-title"></span>
    Revised:
    <span class="article-title" data-name="article-title"><insert>New <italic>t</italic></insert></span>

    Case 3: plain input already had text and the value changed
    Result: both
    Original:
    <span class="year" data-name="year">2008</span>
    Revised:
    <span class="year" data-name="year"><insert>2018</insert><del>2008</del></span>

    Case 4: rich or Summernote already had HTML and the value changed
    Result: both
    Original:
    <span class="article-title" data-name="article-title">Old <italic>t</italic></span>
    Revised:
    <span class="article-title" data-name="article-title"><insert>New <italic>t</italic></insert><del>Old <italic>t</italic></del></span>

    Case 5: existing plain, rich, or Summernote field is cleared (had a real original, now empty)
    Result: del
    Original:
    <span class="publisher-name" data-name="publisher-name">Cornell University Press</span>
    Revised:
    <span class="publisher-name" data-name="publisher-name"><del>Cornell University Press</del></span>

    Case 6: plain, rich, or Summernote text is unchanged
    Result: none
    Original:
    <span class="year" data-name="year">2008</span>
    Revised:
    <span class="year" data-name="year">2008</span>

    Case 7: leaf already shows the same insert and del
    Result: none
    Original:
    <span class="article-title" data-name="article-title"><insert>New <italic>t</italic></insert><del>Old <italic>t</italic></del></span>
    Revised:
    <span class="article-title" data-name="article-title"><insert>New <italic>t</italic></insert><del>Old <italic>t</italic></del></span>

    Case 8: et al. checkbox goes from unchecked to checked, source had no author .etal
    Result: insert
    Original:
    <span class="person-group" person-group-type="author"><span class="string-name" data-name="string-name"><span class="surname" data-name="surname">Smith</span></span></span>
    Revised:
    <span class="person-group" person-group-type="author"><span class="string-name" data-name="string-name"><span class="surname" data-name="surname">Smith</span></span><span class="etal" data-name="etal"><insert>et al.</insert></span></span>

    Case 9: et al. checkbox is unchecked, source had author .etal
    Result: del
    Original:
    <span class="person-group" person-group-type="author"><span class="string-name" data-name="string-name"><span class="surname" data-name="surname">Smith</span></span><span class="etal" data-name="etal">et al.</span></span>
    Revised:
    <span class="person-group" person-group-type="author"><span class="string-name" data-name="string-name"><span class="surname" data-name="surname">Smith</span></span><span class="etal" data-name="etal"><del>et al.</del></span></span>

    Case 10: et al. checkbox is left as it was
    Result: none
    Original:
    <span class="etal" data-name="etal">et al.</span>
    Revised:
    <span class="etal" data-name="etal">et al.</span>

    Case 11: author count is at least CEG trim count. Sample only: count="7" after="3". Live values come from getContributorTrim.
    Result: del
    Original:
    <span class="surname" data-name="surname">Author1</span> ... <span class="surname" data-name="surname">Author9</span>
    Revised:
    <span class="surname" data-name="surname">Author1</span>
    <span class="surname" data-name="surname">Author2</span>
    <span class="surname" data-name="surname">Author3</span>
    <span class="surname" data-name="surname"><del>Author4</del></span>
    <span class="surname" data-name="surname"><del>Author5</del></span>
    <span class="surname" data-name="surname"><del>Author6</del></span>
    <span class="surname" data-name="surname"><del>Author7</del></span>
    <span class="surname" data-name="surname"><del>Author8</del></span>
    <span class="surname" data-name="surname"><del>Author9</del></span>

    Case 12: style trim writes its insert text
    Result: none
    Original:
    (no .etal)
    Revised:
    <span class="etal" data-name="etal">et al</span>

    Case 13: new reference insert
    Result: insert-wrapper
    Original:
    (empty)
    Revised:
    <div class="ref"><insert data-track-code="ref-01"><span class="mixed-citation">…</span></insert></div>
    */
    constructor() {
        if (typeof debug !== 'undefined' && debug && typeof debug.log === 'function') {
            debug.log('track:constructor');
        }
    }

    normalizeInput(value) {
        return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    }

    normalizeRich(value) {
        return String(value == null ? '' : value).trim();
    }

    decideFieldTrack({
        kind = 'input',
        original,
        current
    } = {}) {
        const rich = kind === 'rich' || kind === 'summernote';
        const norm = rich ? this.normalizeRich(current) : this.normalizeInput(current);
        const oldText = rich ? this.normalizeRich(original) : this.normalizeInput(original);
        const nextText = norm;
        if (!oldText && nextText) return 'insert';
        if (oldText && !nextText) return 'del';
        if (oldText && oldText !== nextText) return 'both';
        return 'none';
    }

    decideEtalTrack({
        checked = false,
        hadAuthorEtal = false,
        sourceText = ''
    } = {}) {
        const text = String(sourceText || '').trim() || 'et al.';
        if (checked && !hadAuthorEtal) {
            return {
                action: 'insert',
                text: String(sourceText || '').trim() || 'et al.'
            };
        }
        if (!checked && hadAuthorEtal) {
            return {
                action: 'del',
                text
            };
        }
        return {
            action: 'none',
            text: ''
        };
    }

    decideTrimTrack({
        authors = [],
        trim = {}
    } = {}) {
        const list = Array.isArray(authors) ? authors.slice() : [];
        const count = parseInt(trim && trim.count, 10);
        const after = parseInt(trim && trim.after, 10);
        const countValid = Number.isFinite(count) && count > 0 && count < 99;
        if (!countValid || list.length < count) {
            return {
                visible: list,
                omitted: [],
                etalText: '',
                trackEtalInsert: false
            };
        }
        const keep = Number.isFinite(after) && after > 0 ? after : list.length;
        return {
            visible: list.slice(0, keep),
            omitted: list.slice(keep),
            etalText: trim.insert || '',
            trackEtalInsert: false
        };
    }

    leafShowsCurrent(leaf, kind, current) {
        if (!leaf || !leaf.querySelector) return false;
        const insert = leaf.querySelector('insert');
        const deleted = leaf.querySelector('del') || leaf.querySelector('delete');
        if (!insert || !deleted) return false;
        const rich = kind === 'rich' || kind === 'summernote';
        const shown = rich ? this.normalizeRich(insert.innerHTML) : this.normalizeInput(insert.textContent);
        const nextText = rich ? this.normalizeRich(current) : this.normalizeInput(current);
        const oldShown = rich ? this.normalizeRich(deleted.innerHTML) : this.normalizeInput(deleted.textContent);
        return {
            insert: shown,
            deleted: oldShown,
            currentMatches: shown === nextText
        };
    }

    compareField({
        mode = 'edit',
        kind = 'input',
        token = '',
        original,
        current,
        leaf,
        checked = false,
        hadAuthorEtal = false,
        sourceText = ''
    } = {}) {
        if (mode === 'insert') {
            return {
                action: 'none',
                text: '',
                preserve: false
            };
        }
        if (kind === 'etal' || token === 'etal') {
            const etal = this.decideEtalTrack({
                checked,
                hadAuthorEtal,
                sourceText
            });
            return {
                action: etal.action,
                text: etal.text,
                preserve: false
            };
        }
        const shown = this.leafShowsCurrent(leaf, kind, current);
        const rich = kind === 'rich' || kind === 'summernote';
        const oldText = rich ? this.normalizeRich(original) : this.normalizeInput(original);
        if (shown && shown.currentMatches && shown.deleted === oldText) {
            return {
                action: 'none',
                text: current == null ? '' : String(current),
                preserve: true
            };
        }
        const action = this.decideFieldTrack({
            kind,
            original,
            current
        });
        const text = action === 'del' ?
            (original == null ? '' : String(original)) :
            (current == null ? '' : String(current));
        return {
            action,
            text,
            preserve: action === 'none' && !!(shown && shown.currentMatches)
        };
    }

    fieldKind(field = {}, kind) {
        if (kind) return kind;
        if (!field || field.token === 'etal') return 'etal';
        return field.rich ? 'rich' : 'input';
    }

    unpackWriteTrack(input = {}, currentValue, options = {}) {
        if (input && input.field) {
            return {
                field: input.field,
                current: input.current,
                options: input
            };
        }
        return {
            field: input,
            current: currentValue,
            options
        };
    }

    shouldWriteEditTrack(input = {}, currentValue, options = {}) {
        const bag = this.unpackWriteTrack(input, currentValue, options);
        const field = bag.field || {};
        const current = bag.current != null ? bag.current : field.value;
        const leaf = bag.options.leaf || this.sourceLeafForTrackedPreserve(field, bag.options.sourceRoot);
        const originalValues = bag.options.originalValues || {};
        const original = originalValues[field.token] != null ? originalValues[field.token] : field.original;
        const compared = this.compareField({
            mode: bag.options.mode || 'edit',
            kind: this.fieldKind(field, bag.options.kind),
            token: field.token,
            original,
            current,
            leaf,
            checked: bag.options.checked,
            hadAuthorEtal: bag.options.hadAuthorEtal,
            sourceText: bag.options.sourceText
        });
        return compared.action === 'insert' || compared.action === 'both';
    }

    // Leaf under a root for the field token. Never uses field.element — that points at the
    // live source DOM and must not be the write target when applyUpdate stamps insert/del.
    leafUnderRoot(field = {}, root) {
        if (!root || !root.querySelector || !field.token) return null;
        if (['doi', 'pub-id', 'ext-link', 'uri', 'object-id'].includes(field.token)) {
            return findReferenceLinkLeaf(root, field.token);
        }
        return root.querySelector('.' + this.escapeToken(field.token));
    }

    sourceLeafForTrackedPreserve(field = {}, sourceRoot) {
        if (field.element && field.element.querySelector) return field.element;
        return this.leafUnderRoot(field, sourceRoot);
    }

    unpackPreserveTrack(rebuiltLeaf, field = {}, current, sourceRoot, options = {}) {
        if (rebuiltLeaf && rebuiltLeaf.rebuiltLeaf) {
            return {
                rebuiltLeaf: rebuiltLeaf.rebuiltLeaf,
                field: rebuiltLeaf.field || {},
                current: rebuiltLeaf.current,
                sourceRoot: rebuiltLeaf.sourceRoot,
                options: rebuiltLeaf
            };
        }
        return {
            rebuiltLeaf,
            field,
            current,
            sourceRoot,
            options
        };
    }

    preserveAlreadyTrackedLeaf(rebuiltLeaf, field = {}, current, sourceRoot, options = {}) {
        const bag = this.unpackPreserveTrack(rebuiltLeaf, field, current, sourceRoot, options);
        const target = bag.rebuiltLeaf;
        const leafField = bag.field || {};
        if (!target || !leafField.token || leafField.token === 'etal') return false;
        if (leafField.token === 'surname' || leafField.token === 'given-names' || leafField.token === 'string-name') return false;
        const sourceLeaf = this.sourceLeafForTrackedPreserve(leafField, bag.sourceRoot);
        if (!sourceLeaf || !sourceLeaf.querySelector || sourceLeaf === target) return false;
        const currentValue = bag.current != null ? bag.current : leafField.value;
        const originalValues = bag.options.originalValues || {};
        const original = originalValues[leafField.token] != null ? originalValues[leafField.token] : leafField.original;
        const compared = this.compareField({
            mode: bag.options.mode || 'edit',
            kind: this.fieldKind(leafField, bag.options.kind),
            token: leafField.token,
            original,
            current: currentValue,
            leaf: sourceLeaf
        });
        if (!compared.preserve) return false;
        const doc = target.ownerDocument || sourceLeaf.ownerDocument;
        if (!doc) return false;
        while (target.firstChild) target.removeChild(target.firstChild);
        Array.from(sourceLeaf.childNodes).forEach((node) => {
            target.appendChild(doc.importNode(node, true));
        });
        return true;
    }

    escapeToken(token) {
        if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(token);
        return String(token || '').replace(/([^a-zA-Z0-9_-])/g, '\\$1');
    }

    resolveTrackManager() {
        const root = typeof window !== 'undefined' ? window : globalThis;
        return (root && root._trackManager) ||
            (root && root.trackManager) ||
            null;
    }

    createTrackManagerNode(tag, ownerDocument, attrs = {}) {
        const manager = this.resolveTrackManager();
        const method = tag === 'del' ? 'getDelNode' : 'getInsNode';
        if (!manager || typeof manager[method] !== 'function') return null;
        try {
            const node = manager[method](null, {
                setAttrParams: attrs
            });
            if (!node || !node.tagName) return null;
            if (String(node.tagName).toLowerCase() !== tag) return null;
            return ownerDocument && node.ownerDocument !== ownerDocument ?
                ownerDocument.importNode(node, true) :
                node;
        } catch (err) {
            return null;
        }
    }

    createTrackNode(tag, value, ownerDocument, options = {}) {
        const doc = ownerDocument || (typeof document !== 'undefined' ? document : null);
        if (!doc) return null;
        const trackCode = tag === 'del' ? 'ref-text-del-01' : 'ref-text-01';
        const node = this.createTrackManagerNode(tag, doc, {
            'data-track-code': trackCode
        }) || doc.createElement(tag);
        if (!node.getAttribute('data-track-code')) {
            node.setAttribute('data-track-code', trackCode);
        }
        if (options.richHtml) {
            node.innerHTML = value == null ? '' : String(value);
        } else {
            node.textContent = value == null ? '' : String(value);
        }
        return node;
    }

    writeLeafAction(leaf, {
        action = 'none',
        text = '',
        original = '',
        rich = false
    } = {}) {
        if (!leaf || action === 'none') return false;
        const doc = leaf.ownerDocument || (typeof document !== 'undefined' ? document : null);
        if (!doc) return false;
        while (leaf.firstChild) leaf.removeChild(leaf.firstChild);
        if (action === 'insert' || action === 'both') {
            leaf.appendChild(this.createTrackNode('insert', text, doc, {
                richHtml: rich
            }));
        }
        if (action === 'both') {
            leaf.appendChild(this.createTrackNode('del', original, doc, {
                richHtml: rich
            }));
        } else if (action === 'del') {
            leaf.appendChild(this.createTrackNode('del', text, doc, {
                richHtml: rich
            }));
        }
        return true;
    }

    applyUpdate({
        mode = 'edit',
        mixed,
        source,
        fields = [],
        values = {},
        originalValues = {},
        refType = 'journal',
        authors = [],
        trim = {},
        forceEtal = false,
        hadAuthorEtal = false
    } = {}) {
        if (mode === 'insert') return {
            changed: false
        };
        if (!mixed || !source) return {
            changed: false
        };
        let changed = false;
        (fields || []).forEach((field) => {
            if (!field || !field.token) return;
            if (field.token === 'surname' || field.token === 'given-names' || field.token === 'string-name') return;
            if (field.token === 'etal') return;
            const leaf = this.leafUnderRoot(field, mixed);
            if (!leaf) return;
            const current = values[field.token] != null ? values[field.token] : field.value;
            const original = originalValues[field.token] != null ? originalValues[field.token] : field.original;
            const kind = field.rich ? 'rich' : 'input';
            const sourceLeaf = this.sourceLeafForTrackedPreserve(field, source);
            const compared = this.compareField({
                mode,
                kind,
                token: field.token,
                original,
                current,
                leaf: sourceLeaf
            });
            if (compared.preserve) {
                if (this.preserveAlreadyTrackedLeaf({
                        rebuiltLeaf: leaf,
                        field,
                        current,
                        sourceRoot: source,
                        kind,
                        originalValues
                    })) changed = true;
                return;
            }
            if (compared.action === 'none') return;
            if (this.writeLeafAction(leaf, {
                    action: compared.action,
                    text: compared.text,
                    original,
                    rich: kind === 'rich' || kind === 'summernote'
                })) changed = true;
        });

        const authorGroup = mixed.querySelector('.person-group[person-group-type="author"]') ||
            mixed.querySelector('.person-group');
        if (authorGroup) {
            const trimDecision = this.decideTrimTrack({
                authors,
                trim
            });
            if (trimDecision.omitted.length) {
                const nameNodes = Array.from(authorGroup.querySelectorAll('.string-name'));
                const keep = nameNodes.length - trimDecision.omitted.length;
                nameNodes.slice(Math.max(keep, 0)).forEach((nameNode) => {
                    Array.from(nameNode.querySelectorAll('.surname, .given-names')).forEach((part) => {
                        if (part.querySelector('del')) return;
                        const text = part.textContent || '';
                        if (!text) return;
                        if (this.writeLeafAction(part, {
                                action: 'del',
                                text
                            })) changed = true;
                    });
                });
            }

            const etalLeaf = authorGroup.querySelector('.etal');
            if (etalLeaf) {
                const etalField = (fields || []).find((field) => field && field.token === 'etal') || {};
                const etalOriginal = originalValues.etal != null ? originalValues.etal : etalField.original;
                const sourceText = this.normalizeInput(etalOriginal) ||
                    this.normalizeInput(values.etal) ||
                    etalLeaf.textContent ||
                    'et al.';
                const compared = this.compareField({
                    mode,
                    kind: 'etal',
                    token: 'etal',
                    checked: !!forceEtal,
                    hadAuthorEtal: !!hadAuthorEtal,
                    sourceText
                });
                if (compared.action !== 'none') {
                    if (this.writeLeafAction(etalLeaf, {
                            action: compared.action,
                            text: compared.text
                        })) changed = true;
                }
            }
        }

        return {
            changed
        };
    }

    static create() {
        if (typeof debug !== 'undefined' && debug && typeof debug.log === 'function') {
            debug.log('track:create');
        }
        return new ReferenceTrack();
    }
}

export default ReferenceTrack;