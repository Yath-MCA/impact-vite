/**
 * TiptapManager
 * -------------
 * Single owner of everything Tiptap-related for a module — the counterpart of
 * SummernoteManager, but one instance can drive MANY dialog fields at once
 * (each <textarea>/<input> gets its own editor, tracked in a Map).
 *
 *   - buildConfig()               toolbar + options (same idea as SUMMERNOTE_CONFIG)
 *   - IMPACT <-> editor tag map, format cache (data-format-id), transform/restore
 *   - Paste filtering (PasteFilter integration)
 *   - Event dispatch (onInit/onFocus/onBlur/onKeyup/onPaste/onChange/onAfterCommand/onTrackStatus)
 *   - Toolbar wiring (+ track-changes buttons)
 *   - Track changes (tiptap-track-changes): suggest/edit mode, accept/reject, diff
 *   - ICE bridge (CKEditor 4 + lite): ingests <del class="ice-del ..."> / <insert class="ice-ins ...">
 *     (and Summernote/IMPACT formatting) into native track-change marks, and re-emits
 *     ICE markup (view 'ice', the default) on getContent(). ICE-only metadata
 *     (data-cid/userid/rolename/username/changedata/time/last-change-time) is kept in a
 *     per-field side cache so untouched changes round-trip byte-for-byte.
 *   - Centralized debug logging + getDebugSnapshot()
 *
 * Drop-in behaviour: the original field stays in the DOM (hidden) and is kept
 * in sync, so existing code that does `field.value`, `$(field).val()`,
 * `field.addEventListener('input', ...)` or `field.focus()` keeps working.
 *
 * Dependencies are injected (this file is a plain script, not an ES module):
 *   window.TiptapDeps = {
 *     Editor, Extension, StarterKit,            // required
 *     Superscript, Subscript,                   // optional (toolbar buttons)
 *     TrackChangesExtension, getTrackedChanges, // optional (change tracking)
 *     getGroupedChanges, getPendingChangeCount
 *   }
 *
 * Owner hooks (all optional): owner.logError, owner._name, owner.tiptap_selector,
 *   owner.handleContentChange(html, el), owner.handleToolbarButtonClick(name, e),
 *   owner.handleKeyupEvent(e), owner.handleTrackStatus(info)
 */
class TiptapManager {
    constructor(owner, options = {}) {
        this.owner = owner || null;
        this.selector = options.selector || (owner && owner.tiptap_selector) || null;
        this.root = options.root || (typeof document !== 'undefined' ? document : null);
        this._deps = options.deps || null;

        this._instances = new Map(); // fieldEl -> inst
        this._active = null;
        this._bypass = false;
        this._lastToolbarButtonName = '';

        this.debugEnabled = typeof IS_LOCAL_HOST !== 'undefined' && !!IS_LOCAL_HOST;
    }

    get deps() {
        return this._deps || (typeof window !== 'undefined' && window.TiptapDeps) || {};
    }

    // =========================================================================
    // Static config: IMPACT <-> editor tag mapping (same shape as SummernoteManager)
    // =========================================================================

    static get TAG_MAP() {
        return {
            em: { editorTag: 'em' },
            strong: { editorTag: 'strong' },
            cite: { editorTag: 'em' },
            i: { editorTag: 'em', passthrough: true },
            b: { editorTag: 'strong', passthrough: true },
            sup: { editorTag: 'sup', onlyWhenAttrs: true },
            sub: { editorTag: 'sub', onlyWhenAttrs: true },
            u: { editorTag: 'u', onlyWhenAttrs: true },
            span: { editorTag: 'span', onlyWhenAttrs: true }
        };
    }

    static get DEFAULT_RESTORE() {
        return {
            i: { tag: 'em', attrs: { class: 'italic', 'data-name': 'italic' } },
            b: { tag: 'strong', attrs: { class: 'bold', 'data-name': 'bold' } },
            u: { tag: 'u', attrs: { 'data-name': 'underline', class: 'underline' } },
            sup: { tag: 'sup', attrs: { 'data-name': 'superscript', class: 'superscript' } },
            sub: { tag: 'sub', attrs: { 'data-name': 'subscript', class: 'subscript' } }
        };
    }

    /** editor tag -> set of IMPACT tags it may be restored to */
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

    /** toolbar button name -> command + active check */
    static get BUTTONS() {
        return {
            bold: { label: '<b>B</b>', title: 'Bold', cmd: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive('bold') },
            italic: { label: '<i>I</i>', title: 'Italic', cmd: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive('italic') },
            underline: { label: '<u>U</u>', title: 'Underline', cmd: (e) => e.chain().focus().toggleUnderline().run(), active: (e) => e.isActive('underline'), needs: 'toggleUnderline' },
            subscript: { label: 'x<sub>2</sub>', title: 'Subscript', cmd: (e) => e.chain().focus().toggleSubscript().run(), active: (e) => e.isActive('subscript'), needs: 'toggleSubscript' },
            superscript: { label: 'x<sup>2</sup>', title: 'Superscript', cmd: (e) => e.chain().focus().toggleSuperscript().run(), active: (e) => e.isActive('superscript'), needs: 'toggleSuperscript' },
            undo: { label: '&#8630;', title: 'Undo', cmd: (e) => e.chain().focus().undo().run(), needs: 'undo' },
            redo: { label: '&#8631;', title: 'Redo', cmd: (e) => e.chain().focus().redo().run(), needs: 'redo' },
            track: { label: 'Track', title: 'Track changes (suggest mode)', special: 'track', needs: 'setTrackChangesMode' },
            acceptAll: { label: '&#10003; All', title: 'Accept all changes', special: 'acceptAll', needs: 'acceptAll' },
            rejectAll: { label: '&#10005; All', title: 'Reject all changes', special: 'rejectAll', needs: 'rejectAll' }
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

    debugLog(eventName, payload) {
        if (typeof debug === 'undefined' || !debug.log) return;
        if (this._isQuietEvent(eventName)) {
            debug.log(`Tiptap ${eventName} event triggered for ${this._ownerName()}`);
        } else if (this.debugEnabled) {
            debug.log(`Tiptap ${eventName} event triggered for ${this._ownerName()}`, payload);
        }
    }

    logError(context, err) {
        if (this.owner && typeof this.owner.logError === 'function') {
            this.owner.logError(context, err);
        } else if (typeof console !== 'undefined' && console.error) {
            console.error(`[TiptapManager:${this._ownerName()}] ${context}`, err);
        }
    }

    /** e.g. someModule._tiptap.getDebugSnapshot() from devtools */
    getDebugSnapshot() {
        return {
            owner: this._ownerName(),
            selector: this.selector,
            instanceCount: this._instances.size,
            bypassActive: this._bypass,
            depsLoaded: Object.keys(this.deps),
            fields: Array.from(this._instances.values()).map((inst) => ({
                id: inst.el.id || inst.el.name || '(no id)',
                active: inst === this._active,
                tracking: this.isTracking(inst.el),
                pending: this.getPendingCount(inst.el),
                dirty: this.isDirty(inst.el),
                formatCacheSize: inst.bag.map.size,
                formatCacheSeq: inst.bag.seq,
                iceMetaCount: inst.ice.meta.size,
                iceCidSeq: inst.ice.seq,
                liveFormatIdCount: inst.editor ? inst.editor.view.dom.querySelectorAll('[data-format-id]').length : 0
            }))
        };
    }

    // =========================================================================
    // Config builder (counterpart of SUMMERNOTE_CONFIG)
    // =========================================================================

    buildConfig(overrides = {}) {
        return Object.assign({
            toolbar: [
                ['style', ['bold', 'italic', 'subscript', 'superscript']],
                ['track', ['track', 'acceptAll', 'rejectAll']]
            ],
            focus: false,
            singleLine: true,          // block Enter (no paragraphs / <br>), like SummernoteManager
            blockEscape: false,        // true = swallow Esc inside the editor
            track: false,              // start in suggest mode?
            valueMode: 'ice',          // hidden field holds: 'ice' (CKEditor lite markup) | 'result' | 'base' | 'marked'
            ice: {},                   // overrides for TiptapManager.ICE_DEFAULTS (user, nextCid, tags...)
            author: (this.owner && this.owner.trackAuthor) || { id: 'user', name: 'User', color: '#2d5fce' },
            extensions: [],            // extra Tiptap extensions
            callbacks: {}              // per-call overrides: onChange(html, el), onTrackStatus(info) ...
        }, overrides);
    }

    // =========================================================================
    // Attach / detach  (invoke on ANY dialog child element)
    // =========================================================================

    _resolveEl(target) {
        try {
            if (target && target.jquery) return target[0] || null;
            if (target && target.nodeType === 1) return target;
            const sel = target || this.selector;
            if (!sel || !this.root) return null;
            return this.root.querySelector(sel);
        } catch (err) {
            this.logError('_resolveEl', err);
            return null;
        }
    }

    _get(target) {
        const el = this._resolveEl(target);
        return (el && this._instances.get(el)) || null;
    }

    /** Attach an editor to one field. Returns the instance (or existing one). */
    attach(target, config = {}) {
        try {
            const el = this._resolveEl(target);
            if (!el) return null;
            if (this._instances.has(el)) return this._instances.get(el);

            const d = this.deps;
            if (!d.Editor || !d.StarterKit) {
                throw new Error('TiptapManager: deps.Editor and deps.StarterKit are required (window.TiptapDeps)');
            }

            const base = this.buildConfig();
            const cfg = { ...base, ...config, callbacks: { ...base.callbacks, ...(config.callbacks || {}) } };
            cfg.ice = { ...this.constructor.ICE_DEFAULTS, ...(base.ice || {}), ...(config.ice || {}) };
            if (cfg.ice.user && !config.author) {
                const u = cfg.ice.user;
                cfg.author = { id: String(u.id), name: u.name || String(u.id), color: this._iceColor(cfg.ice, u.id) };
            }
            const self = this;

            const inst = {
                el,
                cfg,
                bag: { map: new Map(), seq: 0 },
                editor: null,
                syncing: false,
                baseline: '',
                ice: { meta: new Map(), seq: 0 },   // meta key: `${changeId}|ins|del`
                mode: cfg.track ? 'suggest' : 'edit',
                trackAvailable: !!d.TrackChangesExtension,
                buttons: {}
            };

            // ---- DOM: hide field, add toolbar + mount point after it
            inst.wrap = document.createElement('div');
            inst.wrap.className = 'tt-wrap';
            inst.toolbarEl = document.createElement('div');
            inst.toolbarEl.className = 'tt-toolbar';
            inst.mountEl = document.createElement('div');
            inst.mountEl.className = 'tt-editor form-control';
            inst.wrap.append(inst.toolbarEl, inst.mountEl);
            el.insertAdjacentElement('afterend', inst.wrap);
            inst._prevDisplay = el.style.display;
            el.style.display = 'none';

            // ---- extensions
            const exts = [d.StarterKit.configure(this._starterKitOptions(cfg))];
            if (d.Superscript) exts.push(d.Superscript);
            if (d.Subscript) exts.push(d.Subscript);
            const fid = this._formatIdExtension();
            if (fid) exts.push(fid);
            if (d.TrackChangesExtension) {
                exts.push(d.TrackChangesExtension.configure({
                    author: cfg.author,
                    mode: inst.mode,
                    onStatusChange: (changeId, status) => self._emit(inst, 'onTrackStatus', { changeId, status })
                }));
            }
            exts.push(...(cfg.extensions || []));

            // ---- editor
            inst.editor = new d.Editor({
                element: inst.mountEl,
                extensions: exts,
                content: this._toEditorDoc(el.value, inst),
                autofocus: cfg.focus ? 'end' : false,
                editorProps: {
                    attributes: { class: 'tt-content', spellcheck: 'false' },
                    handleKeyDown: (view, e) => self._onKeyDown(inst, e),
                    handlePaste: (view, e) => self._onPaste(inst, e),
                    handleDOMEvents: {
                        keyup: (view, e) => { self._emit(inst, 'onKeyup', e); return false; }
                    }
                },
                onFocus: () => { self._active = inst; self._emit(inst, 'onFocus'); },
                onBlur: () => self._emit(inst, 'onBlur'),
                onUpdate: () => { self._sync(inst); self._emit(inst, 'onChange'); },
                onSelectionUpdate: () => self._refreshToolbar(inst),
                onTransaction: () => { self._refreshToolbar(inst); self._emit(inst, 'onAfterCommand'); }
            });

            this._buildToolbar(inst);
            this._hookField(inst);
            this._instances.set(el, inst);
            this._active = inst;

            inst.baseline = this.getContent(el, { view: 'marked' });
            this._emit(inst, 'onInit');
            this._refreshToolbar(inst);
            return inst;
        } catch (err) {
            this.logError('attach', err);
            return null;
        }
    }

    /** Attach to every matching child of a dialog/container. */
    attachAll(container, selector = '[data-tiptap]', config = {}) {
        const root = (container && container.jquery ? container[0] : container) || this.root;
        if (!root) return [];
        return Array.from(root.querySelectorAll(selector)).map((el) => this.attach(el, config)).filter(Boolean);
    }

    detach(target) {
        try {
            const el = this._resolveEl(target);
            const inst = el && this._instances.get(el);
            if (!inst) return;
            inst.editor.destroy();
            inst.wrap.remove();
            delete el.value;   // remove instance-level override, falls back to prototype
            delete el.focus;
            el.style.display = inst._prevDisplay || '';
            this._instances.delete(el);
            if (this._active === inst) this._active = null;
        } catch (err) {
            this.logError('detach', err);
        }
    }

    detachAll(container) {
        const root = container && container.jquery ? container[0] : container;
        Array.from(this._instances.keys()).forEach((el) => {
            if (!root || root.contains(el)) this.detach(el);
        });
    }

    _starterKitOptions(cfg) {
        // inline-only schema: no headings/lists/quotes/code, no <br> when singleLine
        return {
            heading: false, blockquote: false, bulletList: false, orderedList: false,
            listItem: false, listKeymap: false, codeBlock: false, code: false,
            horizontalRule: false, strike: false, link: false,
            hardBreak: cfg.singleLine ? false : undefined
        };
    }

    /** Keeps data-format-id on marks so the cache round-trips (same idea as Summernote). */
    _formatIdExtension() {
        const Extension = this.deps.Extension;
        if (!Extension) return null;
        return Extension.create({
            name: 'formatId',
            addGlobalAttributes() {
                return [{
                    types: ['bold', 'italic', 'underline', 'superscript', 'subscript'],
                    attributes: {
                        formatId: {
                            default: null,
                            parseHTML: (el) => el.getAttribute('data-format-id'),
                            renderHTML: (attrs) => (attrs.formatId ? { 'data-format-id': attrs.formatId } : {})
                        }
                    }
                }];
            }
        });
    }

    /**
     * Make the hidden field behave like the editor:
     *   field.value = '<i>x</i>'  -> loads into editor (untracked)
     *   field.value               -> current content (per cfg.valueMode)
     *   field.focus()             -> focuses editor
     */
    _hookField(inst) {
        const el = inst.el;
        const self = this;
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        inst.nativeValue = desc;

        Object.defineProperty(el, 'value', {
            configurable: true,
            get() { return desc.get.call(el); },
            set(v) {
                desc.set.call(el, v);
                if (!inst.syncing) self._loadIntoEditor(inst, v);
            }
        });
        el.focus = () => inst.editor && inst.editor.commands.focus('end');
    }

    // =========================================================================
    // DOM helpers
    // =========================================================================

    _collectElementAttrs(el) {
        const attrs = {};
        if (!el || !el.attributes) return attrs;
        Array.from(el.attributes).forEach((a) => {
            if (a && a.name && a.name !== 'data-format-id') attrs[a.name] = a.value;
        });
        return attrs;
    }

    _getRestorableAttrs(tag) {
        const key = tag === 'em' ? 'i' : (tag === 'strong' ? 'b' : tag);
        const def = this.constructor.DEFAULT_RESTORE[key];
        return def && def.attrs ? { ...def.attrs } : {};
    }

    _applyAttrs(el, attrs) {
        if (!el || !attrs) return;
        Object.keys(attrs).forEach((n) => { if (attrs[n] != null) el.setAttribute(n, attrs[n]); });
    }

    _replaceElementKeepChildren(oldEl, newTag) {
        const neu = document.createElement(newTag);
        while (oldEl.firstChild) neu.appendChild(oldEl.firstChild);
        if (oldEl.parentNode) oldEl.parentNode.replaceChild(neu, oldEl);
        return neu;
    }

    _unwrapElementKeepChildren(el) {
        if (!el || !el.parentNode) return;
        while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
        el.parentNode.removeChild(el);
    }

    _escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // =========================================================================
    // Transform / restore  (IMPACT HTML <-> editor HTML)
    // =========================================================================

    transformForEditor(html, bag) {
        try {
            if (html == null || html === '') return '';
            const cache = bag || { map: new Map(), seq: 0 };
            const root = document.createElement('div');
            root.innerHTML = String(html);
            const map = this.constructor.TAG_MAP;
            const els = Array.from(root.querySelectorAll('*'));
            for (let i = els.length - 1; i >= 0; i--) {
                const el = els[i];
                if (!el || !el.tagName || el.hasAttribute('data-format-id')) continue;
                const tag = el.tagName.toLowerCase();
                const rule = map[tag];
                if (!rule || rule.passthrough) continue;

                const attrs = this._collectElementAttrs(el);
                if (rule.onlyWhenAttrs && Object.keys(attrs).length === 0) continue;
                if (tag === 'span') { this._unwrapElementKeepChildren(el); continue; }

                cache.seq += 1;
                const id = String(cache.seq);
                cache.map.set(id, { tag, attrs: this._getRestorableAttrs(tag) });

                const editorTag = rule.editorTag || tag;
                let target = el;
                if (editorTag !== tag) {
                    target = this._replaceElementKeepChildren(el, editorTag);
                } else {
                    Array.from(target.attributes).forEach((a) => target.removeAttribute(a.name));
                }
                target.setAttribute('data-format-id', id);
            }
            return root.innerHTML;
        } catch (err) {
            this.logError('transformForEditor', err);
            return html == null ? '' : String(html);
        }
    }

    restoreFromEditor(html, bag) {
        try {
            if (html == null || html === '') return '';
            const cache = bag || { map: new Map(), seq: 0 };
            const defaults = this.constructor.DEFAULT_RESTORE;
            const allowedByEditorTag = this.constructor.EDITOR_TAG_ALLOWED;
            const root = document.createElement('div');
            root.innerHTML = String(html);

            const withIds = Array.from(root.querySelectorAll('[data-format-id]'));
            for (let i = withIds.length - 1; i >= 0; i--) {
                const el = withIds[i];
                const id = el.getAttribute('data-format-id');
                const cached = id && cache.map.get(String(id));
                const allowed = allowedByEditorTag[el.tagName.toLowerCase()];
                if (!(cached && allowed && allowed.has(cached.tag))) {
                    el.removeAttribute('data-format-id');
                    continue;
                }
                const neu = this._replaceElementKeepChildren(el, cached.tag);
                this._applyAttrs(neu, cached.attrs || {});
            }

            // bare tags created by the toolbar get the IMPACT defaults
            Array.from(root.querySelectorAll('i, em, b, strong, u, sup, sub')).reverse().forEach((el) => {
                if (!el.parentNode || el.hasAttribute('data-format-id') || el.getAttribute('data-name')) return;
                const tag = el.tagName.toLowerCase();
                const def = defaults[tag] || defaults[tag === 'em' ? 'i' : tag === 'strong' ? 'b' : ''];
                if (!def) return;
                const neu = (tag === 'em' || tag === 'strong') ? el : this._replaceElementKeepChildren(el, def.tag);
                this._applyAttrs(neu, def.attrs || {});
            });

            return this.unwrapParagraphs(root.innerHTML);
        } catch (err) {
            this.logError('restoreFromEditor', err);
            return html == null ? '' : String(html);
        }
    }

    unwrapParagraphs(html) {
        const doc = document.createElement('span');
        doc.innerHTML = html == null ? '' : String(html);
        Array.from(doc.querySelectorAll('p')).forEach((p) => this._unwrapElementKeepChildren(p));
        return this.stripBreaks(doc.innerHTML);
    }

    stripBreaks(html) {
        const doc = document.createElement('span');
        doc.innerHTML = html == null ? '' : String(html);
        doc.querySelectorAll('br').forEach((br) => br.parentNode && br.parentNode.removeChild(br));
        return doc.innerHTML;
    }

    /** Tiptap needs a block root: wrap inline HTML in <p>. */
    _toEditorDoc(html, inst) {
        const t = this._ingest(html, inst);
        return t ? `<p>${t}</p>` : '';
    }

    /** Incoming HTML -> editor HTML: drop foreign ids, ICE ins/del -> track marks, IMPACT tags -> editor tags. */
    _ingest(html, inst) {
        let h = html == null ? '' : String(html);
        // data-format-id from Summernote (or anywhere else) belongs to a different cache
        h = h.replace(/\sdata-format-id="[^"]*"/g, '');
        inst.ice.meta.clear();
        h = this.iceToEditor(h, inst);
        return this.transformForEditor(h, this._resetBag(inst));
    }

    _resetBag(inst) {
        inst.bag.map.clear();
        inst.bag.seq = 0;
        return inst.bag;
    }

    // =========================================================================
    // Track-changes views (README: insertions = <ins>, deletions = <del>)
    // =========================================================================

    /** view 'result' = accept all, 'base' = reject all, 'marked' = as-is. Non-mutating. */
    resolveTracked(html, view) {
        const root = document.createElement('div');
        root.innerHTML = html == null ? '' : String(html);
        const drop = view === 'base' ? 'ins' : 'del';
        const keep = view === 'base' ? 'del' : 'ins';
        root.querySelectorAll(drop).forEach((n) => n.remove());
        root.querySelectorAll(keep).forEach((n) => this._unwrapElementKeepChildren(n));
        // the schema has no span marks except formatChange, so any span here is a format-change marker
        root.querySelectorAll('span').forEach((n) => this._unwrapElementKeepChildren(n));
        return root.innerHTML;
    }

    // =========================================================================
    // ICE bridge (CKEditor 4 + lite)  <->  tiptap-track-changes marks
    // =========================================================================
    //
    //   ICE   <del class="ice-del ice-cts-11" data-cid="2" data-userid="11" ...>old</del>
    //         <insert class="ice-ins ice-cts-11" data-cid="3" data-userid="11" ...>new</insert>
    //   Tiptap <del data-change-id="ice-2" data-author-id="11" ...>  /  <ins data-change-id="ice-3" ...>
    //
    // ICE gives every ins and every del its own cid (a replacement = two cids); Tiptap
    // shares one changeId across a replacement. So the side cache is keyed by
    // `${changeId}|ins` / `${changeId}|del` and each side gets its own data-cid.

    static get ICE_DEFAULTS() {
        return {
            enabled: true,
            insTag: 'insert',            // ICE lite writes <insert class="ice-ins ...">
            delTag: 'del',
            insClass: 'ice-ins',
            delClass: 'ice-del',
            ctsPrefix: 'ice-cts-',
            dropFormatChanges: true,     // ICE has no format-change record; formatting stays, marker goes
            user: null,                  // { id, name, role } -> data-userid / data-username / data-rolename for NEW changes
            nextCid: null,               // number | () => number : first free data-cid in the host document
            colors: ['#2d5fce', '#c4362c', '#1f8a4c', '#a15c00', '#7a3db8', '#00838f']
        };
    }

    _iceColor(ice, userId) {
        const s = String(userId == null ? '' : userId);
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return ice.colors[h % ice.colors.length];
    }

    /** Tiptap timestamps may be seconds or ms; ICE wants ms. */
    _iceTime(v) {
        const n = Number(v);
        if (!n) return Date.now();
        return n < 1e12 ? n * 1000 : n;
    }

    _nextCid(inst) {
        const n = inst.cfg.ice.nextCid;
        const host = parseInt(typeof n === 'function' ? n() : n, 10) || 0;
        inst.ice.seq = Math.max(inst.ice.seq + 1, host);
        return inst.ice.seq;
    }

    /** ICE HTML -> editor HTML. Non-ICE input is returned untouched. */
    iceToEditor(html, inst) {
        try {
            const ice = inst.cfg.ice;
            if (!ice.enabled || !html) return html;
            if (html.indexOf(ice.insClass) === -1 && html.indexOf(ice.delClass) === -1) return html;

            const root = document.createElement('div');
            root.innerHTML = String(html);
            const nodes = Array.from(root.querySelectorAll(`.${ice.insClass}, .${ice.delClass}`));

            for (let i = nodes.length - 1; i >= 0; i--) { // inner first
                const el = nodes[i];
                const isIns = el.classList.contains(ice.insClass);
                const kind = isIns ? 'ins' : 'del';

                // empty markers (no text, no children) carry nothing a mark can hold
                if (!el.textContent && !el.firstElementChild) { el.remove(); continue; }

                const cid = el.getAttribute('data-cid') || String(this._nextCid(inst));
                const changeId = `ice-${cid}`;
                const userid = el.getAttribute('data-userid') || '';
                const username = el.getAttribute('data-username') || '';
                const time = this._iceTime(el.getAttribute('data-time'));
                const cts = Array.from(el.classList).find((c) => c.indexOf(ice.ctsPrefix) === 0) || '';

                inst.ice.meta.set(`${changeId}|${kind}`, {
                    cid,
                    kind,
                    userid,
                    rolename: el.getAttribute('data-rolename') || '',
                    username,
                    changedata: el.getAttribute('data-changedata') || '',
                    time,
                    last: el.getAttribute('data-last-change-time') || String(time),
                    cts
                });
                const n = parseInt(cid, 10);
                if (!isNaN(n)) inst.ice.seq = Math.max(inst.ice.seq, n);

                const color = this._iceColor(ice, userid);
                const neu = document.createElement(isIns ? 'ins' : 'del');
                neu.setAttribute('data-change-id', changeId);
                neu.setAttribute('data-author-id', userid || 'unknown');
                neu.setAttribute('data-author-name', username || userid || 'unknown');
                neu.setAttribute('data-author-color', color);
                neu.setAttribute('data-timestamp', String(time));
                neu.style.setProperty('--author-color', color);
                while (el.firstChild) neu.appendChild(el.firstChild);
                el.replaceWith(neu);
            }
            return root.innerHTML;
        } catch (err) {
            this.logError('iceToEditor', err);
            return html;
        }
    }

    /** Editor HTML (with <ins>/<del> track marks) -> ICE HTML. */
    editorToIce(html, inst) {
        try {
            const ice = inst.cfg.ice;
            if (!ice.enabled || !html) return html;

            const root = document.createElement('div');
            root.innerHTML = String(html);
            if (ice.dropFormatChanges) {
                Array.from(root.querySelectorAll('span')).forEach((s) => this._unwrapElementKeepChildren(s));
            }

            const u = ice.user || {};
            Array.from(root.querySelectorAll('ins[data-change-id], del[data-change-id]')).forEach((el) => {
                const isIns = el.tagName.toLowerCase() === 'ins';
                const kind = isIns ? 'ins' : 'del';
                const key = `${el.getAttribute('data-change-id')}|${kind}`;

                let m = inst.ice.meta.get(key);
                if (!m) { // change created inside Tiptap: allocate a cid + ICE metadata once, reuse afterwards
                    const t = this._iceTime(el.getAttribute('data-timestamp'));
                    const userid = el.getAttribute('data-author-id') || String(u.id == null ? '' : u.id);
                    m = {
                        cid: String(this._nextCid(inst)),
                        kind,
                        userid,
                        rolename: u.role || '',
                        username: el.getAttribute('data-author-name') || u.name || '',
                        changedata: '',
                        time: t,
                        last: String(t),
                        cts: `${ice.ctsPrefix}${userid}`
                    };
                    inst.ice.meta.set(key, m);
                }

                const neu = document.createElement(isIns ? ice.insTag : ice.delTag);
                neu.className = `${isIns ? ice.insClass : ice.delClass} ${m.cts}`.trim();
                [
                    ['data-cid', m.cid],
                    ['data-userid', m.userid],
                    ['data-rolename', m.rolename],
                    ['data-username', m.username],
                    ['data-changedata', m.changedata],
                    ['data-time', m.time],
                    ['data-last-change-time', m.last]
                ].forEach(([k, v]) => neu.setAttribute(k, v == null ? '' : String(v)));
                while (el.firstChild) neu.appendChild(el.firstChild);
                el.replaceWith(neu);
            });
            return root.innerHTML;
        } catch (err) {
            this.logError('editorToIce', err);
            return html;
        }
    }

    // =========================================================================
    // Public content API
    // =========================================================================

    getContent(target, opts = {}) {
        const inst = this._get(target);
        if (!inst || !inst.editor) return '';
        const view = opts.view || inst.cfg.valueMode || 'ice';
        let html = inst.editor.getHTML();
        if (view === 'result' || view === 'base') html = this.resolveTracked(html, view);
        html = this.restoreFromEditor(html, inst.bag);
        return view === 'ice' ? this.editorToIce(html, inst) : html;
    }

    /** Load content WITHOUT it being recorded as a tracked change. Resets baseline. */
    setContent(content, target) {
        const inst = this._get(target);
        if (!inst) return;
        this._loadIntoEditor(inst, content);
        inst.baseline = this.getContent(inst.el, { view: 'marked' });
    }

    clearContent(target) {
        this.setContent('', target);
    }

    _loadIntoEditor(inst, html) {
        try {
            if (!inst.editor) return;
            const prev = inst.mode;
            this.withBypass(() => {
                this._setMode(inst, 'edit');
                // v3 signature; on v2 use setContent(content, false)
                inst.editor.commands.setContent(this._toEditorDoc(html, inst), { emitUpdate: false });
                this._setMode(inst, prev);
            });
            this._refreshToolbar(inst);
        } catch (err) {
            this.logError('_loadIntoEditor', err);
        }
    }

    withBypass(fn) {
        const was = this._bypass;
        this._bypass = true;
        try { return fn(); } finally { this._bypass = was; }
    }

    _sync(inst) {
        if (this._bypass) return;
        inst.syncing = true;
        try {
            inst.nativeValue.set.call(inst.el, this.getContent(inst.el));
        } finally {
            inst.syncing = false;
        }
        // lets existing listeners (e.g. Apply/Update enable logic) react
        inst.el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // =========================================================================
    // Track changes API
    // =========================================================================

    _setMode(inst, mode) {
        if (!inst.trackAvailable || !inst.editor) return;
        inst.mode = mode;
        inst.editor.commands.setTrackChangesMode(mode);
    }

    isTracking(target) {
        const inst = this._get(target);
        return !!(inst && inst.trackAvailable && inst.mode === 'suggest');
    }

    setTracking(target, on) {
        const inst = this._get(target);
        if (!inst) return;
        this._setMode(inst, on ? 'suggest' : 'edit');
        this._refreshToolbar(inst);
    }

    getChanges(target) {
        const inst = this._get(target);
        const fn = this.deps.getTrackedChanges;
        return inst && inst.editor && fn ? fn(inst.editor) : [];
    }

    getGroupedChanges(target) {
        const inst = this._get(target);
        const fn = this.deps.getGroupedChanges;
        return inst && inst.editor && fn ? fn(inst.editor) : new Map();
    }

    getPendingCount(target) {
        const inst = this._get(target);
        const fn = this.deps.getPendingChangeCount;
        return inst && inst.editor && fn ? fn(inst.editor) : 0;
    }

    accept(changeId, target) { const i = this._get(target); i && i.editor.commands.acceptChange(changeId); }
    reject(changeId, target) { const i = this._get(target); i && i.editor.commands.rejectChange(changeId); }
    acceptAll(target) { const i = this._get(target); i && i.editor.commands.acceptAll(); }
    rejectAll(target) { const i = this._get(target); i && i.editor.commands.rejectAll(); }

    /** { base, result, marked, changes } — feed this to your Update / audit step. */
    getDiff(target) {
        return {
            base: this.getContent(target, { view: 'base' }),
            result: this.getContent(target, { view: 'result' }),
            marked: this.getContent(target, { view: 'marked' }),
            ice: this.getContent(target, { view: 'ice' }),
            changes: this.getChanges(target)
        };
    }

    /** True when there are pending tracked changes OR content differs from the last baseline. */
    isDirty(target) {
        const inst = this._get(target);
        if (!inst || !inst.editor) return false;
        // compares the full marked document, so ICE changes loaded at open do not count as dirty
        return this.getContent(inst.el, { view: 'marked' }) !== inst.baseline;
    }

    /** Call after saving (e.g. dialog Update) so isDirty() resets. */
    markSaved(target) {
        const inst = this._get(target);
        if (inst) inst.baseline = this.getContent(inst.el, { view: 'marked' });
    }

    // =========================================================================
    // Toolbar
    // =========================================================================

    _buildToolbar(inst) {
        const defs = this.constructor.BUTTONS;
        const groups = inst.cfg.toolbar || [];
        inst.toolbarEl.innerHTML = '';
        groups.forEach(([groupName, names]) => {
            const g = document.createElement('span');
            g.className = `tt-group tt-group-${groupName}`;
            names.forEach((name) => {
                const def = defs[name];
                if (!def) return;
                if (def.needs && typeof inst.editor.commands[def.needs] !== 'function') return; // dep not loaded
                const b = document.createElement('button');
                b.type = 'button';
                b.className = `tt-btn tt-btn-${name}`;
                b.title = def.title;
                b.innerHTML = def.label;
                b.addEventListener('mousedown', (e) => e.preventDefault()); // keep editor selection
                b.addEventListener('click', (e) => { e.preventDefault(); this._onToolbarClick(inst, name, e); });
                inst.buttons[name] = b;
                g.appendChild(b);
            });
            if (g.children.length) inst.toolbarEl.appendChild(g);
        });
        inst.toolbarEl.hidden = !inst.toolbarEl.children.length;
    }

    _onToolbarClick(inst, name, event) {
        try {
            const def = this.constructor.BUTTONS[name];
            this._lastToolbarButtonName = name;
            this.debugLog('toolbarButtonClick', { buttonName: name });

            if (def.special === 'track') this.setTracking(inst.el, !this.isTracking(inst.el));
            else if (def.special === 'acceptAll') this.acceptAll(inst.el);
            else if (def.special === 'rejectAll') this.rejectAll(inst.el);
            else def.cmd(inst.editor);

            if (this.owner && typeof this.owner.handleToolbarButtonClick === 'function') {
                this.owner.handleToolbarButtonClick(name, event);
            }
        } catch (err) {
            this.logError(`Error handling toolbar button click for ${this._ownerName()}`, err);
        }
    }

    _refreshToolbar(inst) {
        if (!inst || !inst.editor) return;
        const defs = this.constructor.BUTTONS;
        const pending = this.getPendingCount(inst.el);
        Object.keys(inst.buttons).forEach((name) => {
            const def = defs[name];
            const b = inst.buttons[name];
            let on = false;
            if (def.special === 'track') on = inst.mode === 'suggest';
            else if (def.active) on = !!def.active(inst.editor);
            b.classList.toggle('is-active', on);
            if (def.special === 'acceptAll' || def.special === 'rejectAll') b.disabled = pending === 0;
        });
        inst.wrap.classList.toggle('is-tracking', inst.mode === 'suggest');
    }

    // =========================================================================
    // Events / keyboard / paste
    // =========================================================================

    _emit(inst, eventName, payload) {
        try {
            this.debugLog(eventName, payload);
            const cb = inst.cfg.callbacks && inst.cfg.callbacks[eventName];

            if (eventName === 'onChange') {
                const html = this.getContent(inst.el);
                if (typeof cb === 'function') cb(html, inst.el);
                if (this.owner && typeof this.owner.handleContentChange === 'function') {
                    this.owner.handleContentChange(html, inst.el);
                }
            } else if (eventName === 'onKeyup') {
                this.handleKeyup(payload, inst);
            } else if (eventName === 'onTrackStatus') {
                if (typeof cb === 'function') cb(payload, inst.el);
                if (this.owner && typeof this.owner.handleTrackStatus === 'function') {
                    this.owner.handleTrackStatus(payload);
                }
            } else if (typeof cb === 'function') {
                cb(payload, inst.el);
            }
        } catch (err) {
            this.logError(`Error in ${eventName} for ${this._ownerName()}`, err);
        }
    }

    _onKeyDown(inst, e) {
        if (inst.cfg.singleLine && e.key === 'Enter') { e.preventDefault(); return true; }
        if (inst.cfg.blockEscape && e.key === 'Escape') { e.stopPropagation(); return true; }
        return false;
    }

    handleKeyup(e, inst) {
        if (this.owner && typeof this.owner.handleKeyupEvent === 'function') {
            this.owner.handleKeyupEvent(e);
        }
    }

    _onPaste(inst, e) {
        try {
            const cd = e.clipboardData || (typeof window !== 'undefined' && window.clipboardData);
            if (!cd) return false;
            let html = '';
            let text = '';
            try { html = cd.getData('text/html') || ''; } catch (x) { /* restricted */ }
            try { text = cd.getData('text/plain') || cd.getData('Text') || ''; } catch (x) { /* ignore */ }
            if (!html && !text) return false;

            e.preventDefault();
            let data = html || this._escapeHtml(text);
            if (typeof PasteFilter !== 'undefined' && PasteFilter && typeof PasteFilter.fire === 'function') {
                data = PasteFilter.fire(data, { event_from: 'tiptap', e });
            }
            data = this.transformForEditor(data, inst.bag);
            inst.editor.commands.insertContent(this.stripBreaks(data));
            this._emit(inst, 'onPaste', e);
            return true;
        } catch (err) {
            this.logError('handlePaste', err);
            return false;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TiptapManager;
} else if (typeof window !== 'undefined') {
    window.TiptapManager = TiptapManager;
}
