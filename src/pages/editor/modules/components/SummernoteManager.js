/**
 * SummernoteManager
 * ------------------
 * Single owner of everything Summernote-related for a module:
 *   - SUMMERNOTE_CONFIG (toolbar + callbacks) construction
 *   - IMPACT <-> editor tag map, format cache, transform/restore pipeline
 *   - Live-DOM reconciliation after commands (stale format-id cleanup)
 *   - Paste filtering (PasteFilter integration)
 *   - Event dispatch (onInit/onBlur/onFocus/onKeyup/onPaste/onAfterCommand/...)
 *   - Toolbar button click wiring
 *   - Centralized debug logging + an inspectable debug snapshot
 *
 * One instance per Summernote-enabled module. Create lazily and keep on the
 * module, e.g.:
 *   this._summernote = this._summernote || new SummernoteManager(this);
 *   this.SUMMERNOTE_CONFIG = this._summernote.buildConfig();
 *
 * The owner (module instance) is used for:
 *   - owner.logError(context, err)     — error logging
 *   - owner.summernote_selector        — default jQuery selector
 *   - owner._name                      — debug log labeling
 *   - owner.handleToolbarButtonClick   — optional override hook
 * None of these are required; sensible fallbacks are used if absent, so this
 * class can be instantiated and unit tested standalone.
 */
class SummernoteManager {
    constructor(owner, options = {}) {
        this.owner = owner || null;
        this.selector = options.selector || (owner && owner.summernote_selector) || null;

        this._caches = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
        this._cacheFallback = {
            map: new Map(),
            seq: 0
        };
        this._activeNote = null;
        this._activeEditor = null;
        this._bypass = false;
        this._lastToolbarButtonName = '';

        this.debugEnabled = typeof IS_LOCAL_HOST !== 'undefined' && !!IS_LOCAL_HOST;
    }

    // =========================================================================
    // Static config: IMPACT <-> Summernote tag mapping
    // =========================================================================

    static get TAG_MAP() {
        return {
            em: {
                editorTag: 'i'
            },
            strong: {
                editorTag: 'b'
            },
            cite: {
                editorTag: 'i'
            },
            i: {
                editorTag: 'i',
                passthrough: true
            },
            b: {
                editorTag: 'b',
                passthrough: true
            },
            sup: {
                editorTag: 'sup',
                onlyWhenAttrs: true
            },
            sub: {
                editorTag: 'sub',
                onlyWhenAttrs: true
            },
            u: {
                editorTag: 'u',
                onlyWhenAttrs: true
            },
            sc: {
                editorTag: 'sc',
                onlyWhenAttrs: true
            },
            span: {
                editorTag: 'span',
                onlyWhenAttrs: true
            }
        };
    }

    static get DEFAULT_RESTORE() {
        return {
            i: {
                tag: 'em',
                attrs: {
                    class: 'italic',
                    'data-name': 'italic'
                }
            },
            b: {
                tag: 'strong',
                attrs: {
                    class: 'bold',
                    'data-name': 'bold'
                }
            },
            u: {
                tag: 'u',
                attrs: {
                    'data-name': 'underline',
                    'class': 'underline'
                }
            },
            sup: {
                tag: 'sup',
                attrs: {
                    'data-name': 'superscript',
                    'class': 'superscript'
                }
            },
            sub: {
                tag: 'sub',
                attrs: {
                    'data-name': 'subscript',
                    'class': 'subscript'
                }
            },
            sc: {
                tag: 'sub',
                attrs: {
                    'data-name': 'subscript',
                    'class': 'subscript'
                }
            }
        };
    }

    static get EDITOR_TAG_ALLOWED() {
        const map = this.TAG_MAP;
        const allowed = {};
        Object.keys(map).forEach((impactTag) => {
            const rule = map[impactTag];
            if (!rule || !rule.editorTag) return;
            if (!allowed[rule.editorTag]) allowed[rule.editorTag] = new Set();
            allowed[rule.editorTag].add(impactTag);
        });
        return allowed;
    }

    static get LIVE_CHECK() {
        return {
            i: (computed) => computed.fontStyle === 'italic' || computed.fontStyle === 'oblique',
            b: (computed) => computed.fontWeight === 'bold' || parseInt(computed.fontWeight, 10) >= 600,
            u: (computed) => {
                const deco = computed.textDecorationLine || computed.textDecoration || '';
                return deco.indexOf('underline') !== -1;
            },
            sup: (computed) => computed.verticalAlign === 'super',
            sub: (computed) => computed.verticalAlign === 'sub',
            sc: null,
            span: null
        };
    }

    // =========================================================================
    // Debug
    // =========================================================================

    _ownerName() {
        return (this.owner && this.owner._name) || 'unknown';
    }

    _isQuietEvent(eventName) {
        return /onBlur|onFocus|onClick|onAfterCommand/.test(eventName);
    }

    /** Centralized debug log — every Summernote event/action funnels through here. */
    debugLog(eventName, payload) {
        if (typeof debug === 'undefined' || !debug.log) return;
        if (this._isQuietEvent(eventName)) {
            debug.log(`Summernote ${eventName} event triggered for ${this._ownerName()}`);
        } else if (this.debugEnabled) {
            debug.log(`Summernote ${eventName} event triggered for ${this._ownerName()}`, payload);
        }
    }

    logError(context, err) {
        if (this.owner && typeof this.owner.logError === 'function') {
            this.owner.logError(context, err);
        } else if (typeof console !== 'undefined' && console.error) {
            console.error(`[SummernoteManager:${this._ownerName()}] ${context}`, err);
        }
    }

    /**
     * Inspectable snapshot for debugging — call from devtools console or a
     * debug panel to see current wiring/cache state without digging through
     * internals manually.
     * e.g. someModule._summernote.getDebugSnapshot()
     */
    getDebugSnapshot() {
        const $note = this._activeNote;
        const noteEl = $note && $note[0];
        const bag = noteEl ? this.ensureCache(noteEl) : this._cacheFallback;
        const sn = $note && $note.data && $note.data('summernote');

        return {
            owner: this._ownerName(),
            selector: this.selector,
            hasActiveNote: !!$note,
            wrapped: !!(sn && sn.__ecoTransformWrapped),
            bypassActive: this._bypass,
            formatCacheSize: bag.map.size,
            formatCacheSeq: bag.seq,
            formatCacheEntries: Array.from(bag.map.entries()),
            liveFormatIdCount: noteEl ? noteEl.querySelectorAll('[data-format-id]').length : 0
        };
    }

    // =========================================================================
    // Cache management
    // =========================================================================

    ensureCache(noteEl) {
        if (!noteEl) return this._cacheFallback;
        if (this._caches) {
            let bag = this._caches.get(noteEl);
            if (!bag) {
                bag = {
                    map: new Map(),
                    seq: 0
                };
                this._caches.set(noteEl, bag);
            }
            return bag;
        }
        return this._cacheFallback;
    }

    resetCache(noteEl) {
        const bag = this.ensureCache(noteEl);
        bag.map.clear();
        bag.seq = 0;
        return bag;
    }

    // =========================================================================
    // DOM helpers
    // =========================================================================

    _collectElementAttrs(el) {
        const attrs = {};
        if (!el || !el.attributes) return attrs;
        Array.from(el.attributes).forEach((attr) => {
            if (!attr || !attr.name) return;
            if (attr.name === 'data-format-id') return;
            attrs[attr.name] = attr.value;
        });
        return attrs;
    }

    _isPreservableImpactSpan(el) {
        if (!el || !el.tagName || el.tagName.toLowerCase() !== 'span') return false;
        const dataName = String(el.getAttribute('data-name') || '').toLowerCase();
        if (dataName === 'font' || dataName === 'italic' || dataName === 'bold') return true;
        if (el.classList) {
            if (el.classList.contains('font') || el.classList.contains('italic') || el.classList.contains('bold')) {
                return true;
            }
        }
        return false;
    }

    _getRestorableAttrs(tag, sourceAttrs) {
        if (tag === 'span' && sourceAttrs && typeof sourceAttrs === 'object') {
            return { ...sourceAttrs };
        }
        const defaults = this.constructor.DEFAULT_RESTORE;
        const key = tag === 'em' ? 'i' : (tag === 'strong' ? 'b' : tag);
        const def = defaults[key];
        if (!def || !def.attrs) return {};
        return { ...def.attrs };
    }

    _applyAttrs(el, attrs) {
        if (!el || !attrs) return;
        Object.keys(attrs).forEach((name) => {
            if (attrs[name] == null) return;
            el.setAttribute(name, attrs[name]);
        });
    }

    _replaceElementKeepChildren(oldEl, newTag) {
        const neu = document.createElement(newTag);
        while (oldEl.firstChild) {
            neu.appendChild(oldEl.firstChild);
        }
        if (oldEl.parentNode) {
            oldEl.parentNode.replaceChild(neu, oldEl);
        }
        return neu;
    }

    _unwrapElementKeepChildren(el) {
        if (!el || !el.parentNode) return;
        while (el.firstChild) {
            el.parentNode.insertBefore(el.firstChild, el);
        }
        el.parentNode.removeChild(el);
    }

    // =========================================================================
    // Transform / restore
    // =========================================================================

    transformForSummernote(html, cacheBag) {
        try {
            if (html == null || html === '') return '';
            const bag = cacheBag || this.ensureCache(null);
            const root = document.createElement('div');
            root.innerHTML = String(html);
            const map = this.constructor.TAG_MAP;
            const els = Array.from(root.querySelectorAll('*'));
            for (let i = els.length - 1; i >= 0; i--) {
                const el = els[i];
                if (!el || !el.tagName) continue;
                if (el.hasAttribute('data-format-id')) continue;

                const tag = el.tagName.toLowerCase();
                const rule = map[tag];
                if (!rule || rule.passthrough) continue;

                const sourceAttrs = this._collectElementAttrs(el);
                const attrKeys = Object.keys(sourceAttrs);
                if (rule.onlyWhenAttrs && attrKeys.length === 0) continue;
                if (tag === 'span' && !this._isPreservableImpactSpan(el)) {
                    this._unwrapElementKeepChildren(el);
                    continue;
                }

                bag.seq += 1;
                const id = String(bag.seq);
                const attrs = this._getRestorableAttrs(tag, sourceAttrs);
                bag.map.set(id, {
                    tag,
                    attrs
                });

                const editorTag = rule.editorTag || tag;
                let target = el;
                if (editorTag !== tag) {
                    target = this._replaceElementKeepChildren(el, editorTag);
                } else {
                    const names = Array.from(target.attributes).map((attr) => attr.name);
                    names.forEach((name) => target.removeAttribute(name));
                }
                target.setAttribute('data-format-id', id);
            }
            return root.innerHTML;
        } catch (err) {
            this.logError('transformForSummernote', err);
            return html == null ? '' : String(html);
        }
    }

    restoreFromSummernote(html, cacheBag) {
        try {
            if (html == null || html === '') return '';
            const bag = cacheBag || this.ensureCache(null);
            const defaults = this.constructor.DEFAULT_RESTORE;
            const allowedByEditorTag = this.constructor.EDITOR_TAG_ALLOWED;
            const root = document.createElement('div');
            root.innerHTML = String(html);

            const withIds = Array.from(root.querySelectorAll('[data-format-id]'));
            for (let i = withIds.length - 1; i >= 0; i--) {
                const el = withIds[i];
                const id = el.getAttribute('data-format-id');
                const cached = id && bag.map.get(String(id));
                const currentTag = el.tagName ? el.tagName.toLowerCase() : '';
                const allowedTags = allowedByEditorTag[currentTag];
                const cacheStillValid = !!(cached && allowedTags && allowedTags.has(cached.tag));

                if (!cacheStillValid) {
                    el.removeAttribute('data-format-id');
                    continue;
                }

                const neu = this._replaceElementKeepChildren(el, cached.tag);
                this._applyAttrs(neu, cached.attrs || {});
            }

            this.sanitizeRawFormatting(root);

            const bare = Array.from(root.querySelectorAll('i, em, b, strong, u, sup, sub'));
            for (let i = bare.length - 1; i >= 0; i--) {
                const el = bare[i];
                if (!el || !el.parentNode) continue;
                if (el.hasAttribute('data-format-id')) continue;
                if (el.getAttribute('data-name')) continue;
                const tag = el.tagName.toLowerCase();
                const def = defaults[tag] || defaults[tag === 'em' ? 'i' : tag === 'strong' ? 'b' : ''];
                if (!def) continue;
                const neu = tag === 'em' || tag === 'strong' ? el : this._replaceElementKeepChildren(el, def.tag);
                this._applyAttrs(neu, def.attrs || {});
            }

            return this.unwrapParagraphs(root.innerHTML);
        } catch (err) {
            this.logError('restoreFromSummernote', err);
            return html == null ? '' : String(html);
        }
    }

    unwrapParagraphs(html) {
        const doc = document.createElement('span');
        doc.innerHTML = html == null ? '' : String(html);
        doc.querySelectorAll('p').forEach((el) => {
            el.after(...el.childNodes);
            if (typeof commonMethods !== 'undefined' && commonMethods.removeEl) {
                commonMethods.removeEl(el);
            } else if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        return this.stripBreaks(doc.innerHTML);
    }

    /** Drop Summernote-injected <br> when reading editor content. */
    stripBreaks(html) {
        const doc = document.createElement('span');
        doc.innerHTML = html == null ? '' : String(html);
        doc.querySelectorAll('br').forEach((el) => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
        return doc.innerHTML;
    }

    // =========================================================================
    // Summernote code() wrapping
    // =========================================================================

    isWrapped($note) {
        try {
            const sn = $note && $note.data && $note.data('summernote');
            return !!(sn && sn.__ecoTransformWrapped);
        } catch (err) {
            return false;
        }
    }

    _resolveTarget(target) {
        try {
            if (target && target.jquery) return target;
            if (target && target.nodeType) return $(target);

            const selector = target || this.selector || (this.owner && this.owner.summernote_selector);
            if (!selector) return $();
            return $(selector);
        } catch (err) {
            this.logError('_resolveTarget', err);
            return $();
        }
    }

    bindTarget(target, options = {}) {
        try {
            const $note = this._resolveTarget(target);
            const noteEl = $note && $note[0];

            if (typeof target === 'string') {
                this.selector = target;
            } else if (noteEl && noteEl.id) {
                this.selector = `#${noteEl.id}`;
            } else if (target || !this.selector) {
                this.selector = target || (this.owner && this.owner.summernote_selector) || this.selector;
            }

            const activeEl = this._activeNote && this._activeNote[0];
            if (activeEl && noteEl && activeEl !== noteEl) {
                this._activeNote = null;
            }

            if (options.resetCache && noteEl) {
                this.resetCache(noteEl);
            }

            return $note;
        } catch (err) {
            this.logError('bindTarget', err);
            return $();
        }
    }

    wrapCodeApi($note, layoutInfo) {
        try {
            if (!$note || !$note.length) return;
            const sn = $note.data('summernote');
            if (!sn || sn.__ecoTransformWrapped) return;

            const self = this;
            const noteEl = ($note[0]) || (layoutInfo && layoutInfo.note && layoutInfo.note[0]) || null;
            const originalCode = sn.code.bind(sn);

            sn.code = function(value) {
                const bag = self.ensureCache(noteEl);
                if (self._bypass) {
                    return originalCode(value);
                }
                if (typeof value === 'undefined') {
                    return self.restoreFromSummernote(originalCode(), bag);
                }
                bag.map.clear();
                bag.seq = 0;
                return originalCode(self.transformForSummernote(value, bag));
            };
            sn.__ecoTransformWrapped = true;
            sn.__ecoModuleInstance = this.owner;
            sn.__ecoNoteEl = noteEl;
        } catch (err) {
            this.logError('wrapCodeApi', err);
        }
    }

    withBypass(fn) {
        this._bypass = true;
        try {
            return fn();
        } finally {
            this._bypass = false;
        }
    }

    // =========================================================================
    // Live reconciliation after commands
    // =========================================================================

    reconcileAfterCommand(editableEl) {
        try {
            if (!editableEl) return;
            const noteEl = this._activeNote && this._activeNote[0];
            if (this._isUnformatCommand(this._lastToolbarButtonName)) {
                this.cleanupUnformattedSpans(editableEl, this.ensureCache(noteEl));
                this._lastToolbarButtonName = '';
            }

            const checks = this.constructor.LIVE_CHECK;
            const candidates = Array.from(editableEl.querySelectorAll('[data-format-id]'));
            if (!candidates.length) return;

            candidates.forEach((el) => {
                const tag = el.tagName ? el.tagName.toLowerCase() : '';
                const check = checks[tag];
                if (typeof check !== 'function') return;

                const computed = window.getComputedStyle(el);
                const stillActive = check(computed);

                if (!stillActive) {
                    el.removeAttribute('data-format-id');
                }
            });
        } catch (err) {
            this.logError('reconcileAfterCommand', err);
        }
    }

    _isUnformatCommand(buttonName) {
        return /^(removeFormat|removeformat|clearFormat|clearformat|unformat|eraser|remove)$/i.test(String(buttonName || ''));
    }

    cleanupUnformattedSpans(editableEl, cacheBag) {
        try {
            if (!editableEl) return;
            const bag = cacheBag || this.ensureCache(this._activeNote && this._activeNote[0]);
            const selector = [
                '[data-format-id]',
                'span[data-name="italic"]',
                'span[data-name="bold"]',
                'span.italic',
                'span.bold',
                'span.font'
            ].join(',');
            const spans = Array.from(editableEl.querySelectorAll(selector));
            spans.forEach((el) => {
                const id = el.getAttribute('data-format-id');
                if (id && bag && bag.map) bag.map.delete(String(id));
                this._unwrapElementKeepChildren(el);
            });
        } catch (err) {
            this.logError('cleanupUnformattedSpans', err);
        }
    }

    sanitizeRawFormatting(root) {
        try {
            if (!root) return;
            const spanSelector = [
                'span[data-name="italic"]',
                'span[data-name="bold"]',
                'span.italic',
                'span.bold',
                'span.font',
                'span[style]'
            ].join(',');
            Array.from(root.querySelectorAll(spanSelector)).forEach((el) => {
                if (el.hasAttribute('data-format-id')) return;
                if (this._isPreservableImpactSpan(el)) return;
                this._unwrapElementKeepChildren(el);
            });
            Array.from(root.querySelectorAll('em,strong,cite,sup,sub,u,sc')).forEach((el) => {
                Array.from(el.attributes || []).forEach((attr) => el.removeAttribute(attr.name));
            });
        } catch (err) {
            this.logError('sanitizeRawFormatting', err);
        }
    }

    _getActiveEditableElement() {
        try {
            let $editable = null;
            if (this._activeEditor && this._activeEditor.find) {
                $editable = this._activeEditor.find('.note-editable').first();
                if ($editable && $editable.length) return $editable[0];
            }
            if (this._activeNote && this._activeNote.next) {
                $editable = this._activeNote.next('.note-editor').find('.note-editable').first();
                if ($editable && $editable.length) return $editable[0];
            }
            if (this._activeNote && this._activeNote.closest) {
                $editable = this._activeNote.closest('.note-editor').find('.note-editable').first();
                if ($editable && $editable.length) return $editable[0];
            }
            return null;
        } catch (err) {
            this.logError('_getActiveEditableElement', err);
            return null;
        }
    }

    // =========================================================================
    // Public content API (what BaseModule delegates to)
    // =========================================================================

    getContent(target, options = {}) {
        const $note = this.bindTarget(target);
        if (!$note || !$note.length) return '';
        if (options.bypassTransform) {
            return this.withBypass(() => this.unwrapParagraphs($note.summernote('code')));
        }
        let content = $note.summernote('code');
        if (!this.isWrapped($note)) {
            content = this.restoreFromSummernote(content, this.ensureCache($note[0]));
        }
        return this.unwrapParagraphs(content);
    }

    setContent(content, target, options = {}) {
        const $note = this.bindTarget(target);
        if (!$note || !$note.length) return;
        const html = content == null ? '' : content;
        if (options.bypassTransform) {
            this.withBypass(() => {
                $note.summernote('code', html);
            });
            return;
        }
        if (!this.isWrapped($note)) {
            const bag = this.resetCache($note[0]);
            content = this.transformForSummernote(html, bag);
            $note.summernote('code', content);
            return;
        }
        $note.summernote('code', html);
    }

    clearContent(target) {
        const $note = this.bindTarget(target, {
            resetCache: true
        });
        if (!$note || !$note.length) return;
        this.withBypass(() => {
            $note.summernote('code', '');
        });
    }

    // =========================================================================
    // Config builder
    // =========================================================================

    buildConfig(overrides = {}) {
        const self = this;
        return Object.assign({
            toolbar: [
                ['style', ['bold', 'italic', 'subscript', 'superscript']]
            ],
            focus: true,
            callbacks: {
                onInit: this._dispatch('onInit'),
                onBlur: this._dispatch('onBlur'),
                onFocus: this._dispatch('onFocus'),
                onEnter: this._dispatch('onEnter'),
                onPaste: this._dispatch('onPaste'),
                onKeyup: this._dispatch('onKeyup'),
                onChange: this._dispatch('onChange'),
                onBeforeCommand: this._dispatch('onBeforeCommand'),
                onAfterCommand: this._dispatch('onAfterCommand')
            }
        }, overrides);
    }

    buildPlainRichConfig(overrides = {}) {
        const callerCallbacks = (overrides && overrides.callbacks) || {};
        const {
            callbacks,
            ...plainOverrides
        } = overrides || {};
        const config = this.buildConfig({
            ...plainOverrides,
            toolbar: [],
            shortcuts: false,
            disableDragAndDrop: true,
            popover: {
                image: [],
                link: [],
                air: []
            }
        });
        const defaultKeydown = config.callbacks && config.callbacks.onKeydown;
        config.callbacks = {
            ...(config.callbacks || {}),
            ...callerCallbacks,
            onKeydown: function summernotePlainRichKeydown(e) {
                if (typeof callerCallbacks.onKeydown === 'function') {
                    callerCallbacks.onKeydown.apply(this, arguments);
                } else if (typeof defaultKeydown === 'function') {
                    defaultKeydown.apply(this, arguments);
                }
                const evt = e || {};
                if (!(evt.ctrlKey || evt.metaKey)) return;
                const key = String(evt.key || evt.keyCode || '').toLowerCase();
                if (key === 'b' || key === 'i' || key === 'u' || key === '66' || key === '73' || key === '85') {
                    if (typeof evt.preventDefault === 'function') evt.preventDefault();
                    if (typeof evt.stopPropagation === 'function') evt.stopPropagation();
                }
            }
        };
        return config;
    }

    // =========================================================================
    // Event dispatch
    // =========================================================================

    _dispatch(eventName) {
        const self = this;
        return (...args) => {
            try {
                const e = args[0];
                self.debugLog(eventName, args.length > 1 ? args : e);

                if (eventName === 'onBlur') {
                    self.handleBlur(e, self.owner);
                } else if (eventName === 'onKeyup') {
                    self.handleKeyup(e, self.owner);
                } else if (eventName === 'onPaste') {
                    self.handlePaste(e, self.owner);
                } else if (eventName === 'onChange') {
                    let contents = typeof e === 'string' ? e : '';
                    if (!contents) {
                        contents = self.getContent();
                    }
                    if (self.owner && typeof self.owner.handleContentChange === 'function') {
                        self.owner.handleContentChange(contents);
                    }
                } else if (eventName === 'onAfterCommand') {
                    const editableEl = self._getActiveEditableElement();
                    self.reconcileAfterCommand(editableEl);
                } else if (eventName === 'onInit') {
                    self._handleInit(e);
                }
            } catch (err) {
                self.logError(`Error in ${eventName} for ${self._ownerName()}`, err);
            }
        };
    }

    _handleInit(layoutInfo) {
        const $note = layoutInfo && layoutInfo.note;
        const $editor = layoutInfo && layoutInfo.editor;

        if ($note && $note.length) {
            this._activeNote = $note;
            this.wrapCodeApi($note, layoutInfo);
        }

        if ($editor && $editor.length) {
            this._activeEditor = $editor;
        }

        if ($editor && $editor.find) {
            this._wireToolbarClicks($editor);
        }
    }

    _wireToolbarClicks($editor) {
        const self = this;
        const toolbar = $editor.find('.note-toolbar');
        toolbar.on('click', '.note-btn', function(event) {
            const $button = $(event.currentTarget);
            const classes = ($button.attr('class') || '').split(/\s+/);
            const actionClass = classes.find((cls) => cls.indexOf('note-btn-') === 0);
            const buttonName =
                $button.attr('data-event') ||
                $button.attr('data-value') ||
                (actionClass ? actionClass.replace('note-btn-', '') : 'unknown');

            try {
                self._lastToolbarButtonName = buttonName;
                self.debugLog('toolbarButtonClick', {
                    buttonName
                });
                if (self.owner && typeof self.owner.handleToolbarButtonClick === 'function') {
                    self.owner.handleToolbarButtonClick(buttonName, event);
                } else {
                    self.handleKeyup(event);
                }
            } catch (err) {
                self.logError(`Error handling toolbar button click for ${self._ownerName()}`, err);
            }
        });
    }

    handlePaste(e, owner) {
        try {
            const evt = (e && e.originalEvent) || e;
            if (!evt) return;
            const cd = evt.clipboardData || (typeof window !== 'undefined' && window.clipboardData);
            if (!cd) return;

            let html = '';
            let text = '';
            try {
                html = cd.getData('text/html') || '';
            } catch (errHtml) {
                /* IE / restricted */
            }
            try {
                text = cd.getData('text/plain') || cd.getData('Text') || '';
            } catch (errText) {
                /* ignore */
            }

            if (!html && !text) return;

            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();

            let data = html || text;
            if (typeof PasteFilter !== 'undefined' && PasteFilter && typeof PasteFilter.fire === 'function') {
                data = PasteFilter.fire(data, {
                    event_from: 'summernote',
                    e
                });
            }

            // Resolve the field actually pasted into from the event itself, rather than the
            // shared _activeNote/selector state — with multiple fields configured, that state
            // is last-write-wins and can point at a different field than the one being pasted into.
            const targetEl = evt.currentTarget || evt.target;
            const $editable = targetEl ? $(targetEl).closest('.note-editable') : $();
            const $eventNote = $editable.length ? $editable.closest('.note-editor').prev() : $();
            const $note = ($eventNote && $eventNote.length ? $eventNote : null) ||
                this._activeNote || (this.selector ? $(this.selector) : null);
            if (!$note || !$note.length) return;

            const bag = this.ensureCache($note[0]);
            data = this.transformForSummernote(data, bag);

            this.withBypass(() => {
                $note.summernote('pasteHTML', data);
            });
        } catch (err) {
            this.logError('handlePaste', err);
        }
    }

    /** Legacy shortcut-editor paste/keyup handler (non-Summernote-callback DOM events). */
    handleShortcutEvent(e) {
        try {
            if (['keyup', 'paste'].includes(e.type)) {
                if (e.type === 'paste') {
                    setTimeout(() => {
                        const reTurnData = PasteFilter.fire(e.currentTarget.innerHTML, {
                            event_from: 'shortcut',
                            e
                        });
                        e.currentTarget.innerHTML = reTurnData;
                    }, 750);
                }
            }
        } catch (err) {
            this.logError('handleShortcutEvent', err);
        }
    }

    handleBlur(e) {
        const p = e.target.parentNode.parentNode;
        if (!(e.relatedTarget && $.contains(p, e.relatedTarget))) {
            // Commented out: hide toolbar on blur outside dialog.
        }
    }

    handleKeyup(e) {
        if (e.keyCode === 13 || e.keyCode === 27) {
            e.preventDefault();
            e.stopPropagation();
            console.warn('Canceled because Enter/Escape pressed');
            return;
        }

        if (typeof this.owner != "undefined" && typeof this.owner.handleKeyupEvent == "function") {
            this.owner.handleKeyupEvent(e);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SummernoteManager;
} else if (typeof window !== 'undefined') {
    window.SummernoteManager = SummernoteManager;
}
