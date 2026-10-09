/**
 * ============================================================
 * CK_EDITOR_EVENTS_MODULE
 * ============================================================
 * Redux-style event store for CKEditor cursor & selection
 * tracking.  Every CKEditor event that fires through this
 * module dispatches an ACTION and commits an enriched cursor
 * snapshot to the store.
 *
 * Architecture
 * ────────────
 *  ┌──────────────────────────────────────┐
 *  │  CK_EDITOR_EVENTS_MODULE  (store)    │
 *  │  ─────────────────────────────────── │
 *  │  state      – current snapshot       │
 *  │  history[]  – ring-buffer of snaps   │
 *  │  dispatch() – action entry-point     │
 *  │  subscribe()– listener registration │
 *  │  getState() – read-only accessor     │
 *  └──────────────────────────────────────┘
 *
 * Supported Actions
 * ─────────────────
 *  KEY_DOWN          – keydown fired
 *  KEY_UP            – keyup fired
 *  SELECTION_CHANGE  – selectionChange fired
 *  CLICK             – click / mousedown fired
 *  DOUBLE_CLICK      – doubleclick fired
 *  FOCUS             – editor focused
 *  BLUR              – editor blurred
 *  PASTE             – paste fired
 *  CUT               – cut fired
 *  DRAG_START        – drag started
 *  DROP              – drop fired
 *  AFTER_SET_DATA    – afterSetData fired
 *  CURSOR_RESTORED   – programmatic cursor restore
 *  RESET             – full state reset
 *
 * Extra Information Returned With Every Snapshot
 * ───────────────────────────────────────────────
 *  cursorZone      – FRONT | BODY | BACK | FLOAT | KWD | ABS | FN …
 *  chapterSummary  – { id, no, totalChapters, title }
 *  selectionSummary– { text, charCount, wordCount, isCollapsed, isFullNode }
 *  nodeChain       – [nodeClas … G_PARENT_CLAS]
 *  timings         – { eventTs, processMs }
 *  charContext     – { prev, next }   (character before/after cursor)
 *  lockInfo        – { isLocked, lockedBy, lockRole }
 *
 * Usage (external)
 * ────────────────
 *  // Subscribe to state changes
 *  CK_EDITOR_EVENTS_MODULE.subscribe(function(state){ console.log(state); });
 *
 *  // Read current state
 *  var snap = CK_EDITOR_EVENTS_MODULE.getState();
 *
 *  // Force a re-dispatch using latest IMS
 *  CK_EDITOR_EVENTS_MODULE.dispatch('SELECTION_CHANGE', { editor: GlobalEditor });
 *
 * @version 1.0.0
 * @depends EDITOR_CONFIG, EDITOR_UTILS, IMPACT_SELECTION, EDITOR_CURSOR
 */

'use strict';

(function(global) {

    // ─── Guard: wait for dependencies ────────────────────────────────────────────
    var _deps = ['EDITOR_CONFIG', 'EDITOR_UTILS'];
    for (var _d = 0; _d < _deps.length; _d++) {
        if (!global[_deps[_d]]) {
            console.warn('[CK_EDITOR_EVENTS_MODULE] Dependency missing: ' + _deps[_d] + '. Module deferred.');
            return;
        }
    }

    // ─── Constants ────────────────────────────────────────────────────────────────
    // ring-buffer cap
    var MAX_HISTORY = 50;

    /** All action types the store understands */
    var ACTIONS = Object.freeze({
        KEY_DOWN: 'KEY_DOWN',
        KEY_UP: 'KEY_UP',
        SELECTION_CHANGE: 'SELECTION_CHANGE',
        CLICK: 'CLICK',
        DOUBLE_CLICK: 'DOUBLE_CLICK',
        FOCUS: 'FOCUS',
        BLUR: 'BLUR',
        PASTE: 'PASTE',
        CUT: 'CUT',
        DRAG_START: 'DRAG_START',
        DROP: 'DROP',
        AFTER_SET_DATA: 'AFTER_SET_DATA',
        CURSOR_RESTORED: 'CURSOR_RESTORED',
        RESET: 'RESET'
    });

    // ─── Initial (empty) state ────────────────────────────────────────────────────
    function _emptyState() {
        return {
            // ── Action meta ──────────────────────────────────────────
            action: null,
            actionPayload: {},
            timestamp: null,

            // ── Cursor node chain ────────────────────────────────────
            NODE_ID: null,
            NODE_TAG: '',
            NODE_CLAS: '',
            NODE_TEXT: '',

            PARENT_ID: null,
            PARENT_TAG: '',
            PARENT_CLAS: '',

            G_PARENT_TAG: '',
            G_PARENT_CLAS: '',

            PARENTS_CLAS_LIST: [],
            PARENTS_TAG_LIST: [],

            // ── Cursor position flags (from EDITOR_CURSOR) ───────────
            IS_FRONT: null,
            IS_BODY: null,
            IS_BACK: null,
            IS_APPENDIX: null,
            IS_ABS: null,
            IS_ABS_PARA: null,
            IS_KWD: null,
            IS_KWD_GROUP: null,
            IS_ABR: null,
            IS_ABR_GROUP: null,
            IS_FN_EN_NOTE: null,
            IS_FLOAT: null,
            IS_HEAD_TITLE: null,
            IS_FRONT_PARA: null,
            IS_EXT_PARA: null,
            IS_CAPTION_PARA: null,
            IS_TBL_CELL: null,
            IS_FLOAT_PARA: null,
            IS_FLOAT_FN_PARA: null,
            IS_BODY_PARA: null,
            IS_PURE_PARA: null,
            IS_BACK_PARA: null,
            IS_CITATION_ALLOWED: null,

            // ── Chapter ─────────────────────────────────────────────
            CUR_CHAPTER_ID: null,
            CUR_CHAPTER_NO: null,
            CUR_CHAPTER_DATA: null,
            OVER_ALL_CHAPTERS: 0,

            // ── Selection summary ────────────────────────────────────
            SEL_TEXT: '',
            SEL_TEXT_TRIMMED: '',
            NODE_FULL_SELECT: false,

            // ── Range info ───────────────────────────────────────────
            IS_START_OF_BLOCK: false,
            IS_END_OF_BLOCK: false,
            RG_INFO: {
                divCount: 0
            },

            // ── Key event info ───────────────────────────────────────
            KEY_CODE: null,
            KEY_NAME: null,
            KEY_STROKE: null,
            IsCtrl: false,
            IsShift: false,
            IsAlt: false,
            IsMeta: false,
            IsCut: false,
            IsCopy: false,
            IsPaste: false,
            IS_MOVEMENT_STROKE: false,

            // ── Context-node booleans ────────────────────────────────
            IsMath: false,
            IsRef: false,
            IsRefGroup: false,
            IsXref: false,
            IsComment: false,
            IsMultiPara: false,
            IsMultiElm: false,
            IsFullNode: false,
            IsFullFormat: false,
            IsList: false,
            IsLink: false,
            IsContrib: false,
            DEL_NODE: false,

            // ── Para-lock ────────────────────────────────────────────
            isParaLocked: false,
            paraLockedBy: null,
            paraLockRole: null,
            canShowContextMenu: true,

            // ── EXTRA: enriched info ─────────────────────────────────
            /** 'FRONT' | 'BODY' | 'BACK' | 'FLOAT' | 'KWD' | 'ABS' | 'FN' | null */
            cursorZone: null,

            /** { id, no, totalChapters, title } */
            chapterSummary: null,

            /** { text, charCount, wordCount, isCollapsed, isFullNode } */
            selectionSummary: null,

            /** [ nodeClas, parentClas, gParentClas ] */
            nodeChain: [],

            /** { prev, next } – characters immediately surrounding the caret */
            charContext: {
                prev: null,
                next: null
            },

            /** { eventTs (ms epoch), processMs (processing duration) } */
            timings: {
                eventTs: null,
                processMs: 0
            },

            /** { isLocked, isLockedByOther, lockedBy, lockRole, lockedAncestor } */
            lockInfo: {
                isLocked: false,
                isLockedByOther: false,
                lockedBy: null,
                lockRole: null
            }
        };
    }

    // ─── Private Store State ──────────────────────────────────────────────────────
    var _state = _emptyState();
    // ring-buffer of snapshots
    var _history = [];
    // subscriber callbacks
    var _listeners = [];
    var _isDispatching = false;

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    /**
     * Shallow-merge src into dest, returning dest.
     */
    function _assign(dest, src) {
        for (var k in src) {
            if (Object.prototype.hasOwnProperty.call(src, k)) {
                dest[k] = src[k];
            }
        }
        return dest;
    }

    /**
     * Deep-freeze an object (dev-safety; no-op in prod if needed).
     */
    function _deepFreeze(obj) {
        try {
            Object.freeze(obj);
        } catch (e) {
            /* IE11 shim */
        }
        return obj;
    }

    /**
     * Determine the semantic "zone" the cursor is currently in,
     * based on `EDITOR_CURSOR` flags already set in the IMS snapshot.
     * @param {Object} IMS  IMPACT_SELECTION instance
     * @param {Object} EC   EDITOR_CURSOR instance
     * @returns {string|null}
     */
    function _resolveCursorZone(IMS, EC) {
        if (!EC) return null;
        if (EC.IS_ABS) return 'ABS';
        if (EC.IS_KWD) return 'KWD';
        if (EC.IS_FLOAT) return 'FLOAT';
        if (EC.IS_FN_EN_NOTE) return 'FN';
        if (EC.IS_FRONT) return 'FRONT';
        if (EC.IS_BACK) return 'BACK';
        if (EC.IS_BODY) return 'BODY';
        return null;
    }

    /**
     * Build a human-friendly chapter summary from IMS / EDITOR_CURSOR.
     */
    function _buildChapterSummary(IMS, EC) {
        if (!EC || !EC.CUR_CHAPTER) return null;
        var chap = EC.CUR_CHAPTER;
        return {
            id: EC.CUR_CHAPTER_ID || null,
            no: EC.CUR_CHAPTER_NO || null,
            totalChapters: IMS.OVER_ALL_CHAPTERS || 1,
            title: (function() {
                try {
                    var t = chap.querySelector && chap.querySelector('.title-group .title');
                    return t ? (t.textContent || t.innerText || '').trim() : null;
                } catch (e) {
                    return null;
                }
            }())
        };
    }

    /**
     * Build a selection summary.
     */
    function _buildSelectionSummary(IMS) {
        var text = (IMS && IMS.SEL_TEXT_CLONE) ? IMS.SEL_TEXT_CLONE : '';
        var words = text.trim() ? text.trim().split(/\s+/).length : 0;
        return {
            text: text,
            charCount: text.length,
            wordCount: words,
            isCollapsed: text.length === 0,
            isFullNode: !!(IMS && IMS.NODE_FULL_SELECT)
        };
    }

    /**
     * Determine para-lock info from IMPACT_SELECTION.paraLock.
     */
    function _buildLockInfo(IMS) {
        var base = {
            isLocked: false,
            isLockedByOther: false,
            lockedBy: null,
            lockRole: null
        };
        try {
            var pl = IMS && IMS.paraLock;
            if (!pl || !pl._isEnabled) return base;

            var EC = global.EDITOR_CURSOR;
            if (!EC) return base;

            // Walk up from IMS.NODE to find a locked ancestor
            var node = IMS.NODE || null;
            if (!node) return base;

            var cur = node;
            var depth = 0;
            while (cur && cur.type === (global.CKEDITOR && global.CKEDITOR.NODE_ELEMENT)) {
                if (cur.hasClass && cur.hasClass('para-locked')) {
                    var lockedBy = cur.getAttribute && cur.getAttribute('data-locked-by');
                    var lockRole = cur.getAttribute && cur.getAttribute('data-lock-role');
                    var byOther = !!(lockedBy && global.USER_INFO && lockedBy !== global.USER_INFO.MAIL_ID);
                    return {
                        isLocked: true,
                        isLockedByOther: byOther,
                        lockedBy: lockedBy || null,
                        lockRole: lockRole || null
                    };
                }
                cur = cur.getParent && cur.getParent();
                if (++depth > 20) break;
            }
        } catch (e) {
            /* silent */
        }
        return base;
    }

    /**
     * Snapshot the full current IMPACT_SELECTION + EDITOR_CURSOR state,
     * augment with extra info, and return the enriched plain object.
     *
     * @param {string}  action   – ACTIONS constant
     * @param {Object}  payload  – raw CKEditor event payload
     * @returns {Object}         – new state snapshot
     */
    function _buildSnapshot(action, payload) {
        var t0 = performance.now();
        payload = payload || {};

        var IMS = global.IMPACT_SELECTION || {};
        var EC = global.EDITOR_CURSOR || {};
        // reuse in new arch
        var KEH = global.iKEY_EVENT_HANDLING || {};

        var snap = _emptyState();

        // ── action meta ───────────────────────────────────────────────────────────
        snap.action = action;
        snap.actionPayload = payload;
        snap.timestamp = Date.now();

        // ── Node chain ────────────────────────────────────────────────────────────
        snap.NODE_ID = IMS.NODE && IMS.NODE.getId ? IMS.NODE.getId() : null;
        snap.NODE_TAG = IMS.NODE_TAG || '';
        snap.NODE_CLAS = IMS.NODE_CLAS || '';
        snap.NODE_TEXT = IMS.NODE_CLONE_TEXT || IMS.NODE_TEXT || '';

        snap.PARENT_ID = IMS.PARENT && IMS.PARENT.getId ? IMS.PARENT.getId() : null;
        snap.PARENT_TAG = IMS.PARENT_TAG || '';
        snap.PARENT_CLAS = IMS.PARENT_CLAS || '';

        snap.G_PARENT_TAG = IMS.G_PARENT_TAG || '';
        snap.G_PARENT_CLAS = IMS.G_PARENT_CLAS || '';

        snap.PARENTS_CLAS_LIST = (IMS.PARENTS_CLAS_LIST || []).slice();
        snap.PARENTS_TAG_LIST = (IMS.PARENTS_TAG_LIST || []).slice();

        // ── Cursor flags (from EDITOR_CURSOR) ─────────────────────────────────────
        var _flagMap = [
            'IS_FRONT', 'IS_BODY', 'IS_BACK', 'IS_APPENDIX',
            'IS_ABS', 'IS_ABS_PARA', 'IS_KWD', 'IS_KWD_GROUP',
            'IS_ABR', 'IS_ABR_GROUP', 'IS_FN_EN_NOTE', 'IS_FLOAT',
            'IS_HEAD_TITLE', 'IS_FRONT_PARA', 'IS_EXT_PARA',
            'IS_CAPTION_PARA', 'IS_TBL_CELL', 'IS_FLOAT_PARA',
            'IS_FLOAT_FN_PARA', 'IS_BODY_PARA', 'IS_PURE_PARA',
            'IS_BACK_PARA', 'IS_CITATION_ALLOWED'
        ];
        for (var fi = 0; fi < _flagMap.length; fi++) {
            snap[_flagMap[fi]] = EC[_flagMap[fi]] || null;
        }

        // ── Chapter ───────────────────────────────────────────────────────────────
        snap.CUR_CHAPTER_ID = EC.CUR_CHAPTER_ID || IMS.CUR_CHAP_ID || null;
        snap.CUR_CHAPTER_NO = EC.CUR_CHAPTER_NO || IMS.CUR_CHAP_NO || null;
        snap.CUR_CHAPTER_DATA = EC.CUR_CHAPTER_DATA || null;
        snap.OVER_ALL_CHAPTERS = IMS.OVER_ALL_CHAPTERS || 0;

        // ── Selection ─────────────────────────────────────────────────────────────
        snap.SEL_TEXT = IMS.SEL_TEXT || '';
        snap.SEL_TEXT_TRIMMED = (IMS.SEL_TEXT_CLONE || '').trim();
        snap.NODE_FULL_SELECT = !!(IMS.NODE_FULL_SELECT);

        // ── Range info ────────────────────────────────────────────────────────────
        snap.IS_START_OF_BLOCK = !!(IMS.ISstartOfBlock);
        snap.IS_END_OF_BLOCK = !!(IMS.ISEndOfBlock);
        snap.RG_INFO = IMS.RG_INFO ? _assign({}, IMS.RG_INFO) : {
            divCount: 0
        };

        // ── Key info (relevant for KEY_DOWN / KEY_UP) ─────────────────────────────
        var keyEvt = payload.keyEvent || payload.event || {};
        snap.KEY_CODE = payload.keyCode || KEH.KEY_CODE || null;
        snap.KEY_NAME = payload.keyName || KEH.KEY_NAME || null;
        snap.KEY_STROKE = payload.keyStroke || KEH.KEY_STROKE || null;
        snap.IsCtrl = !!(keyEvt.ctrlKey || KEH.IsCtrl);
        snap.IsShift = !!(keyEvt.shiftKey || KEH.IsShift);
        snap.IsAlt = !!(keyEvt.altKey || KEH.IsAlt);
        snap.IsMeta = !!(keyEvt.metaKey || KEH.IsMeta);
        snap.IsCut = !!(KEH.IsCut);
        snap.IsCopy = !!(KEH.IsCopy);
        snap.IsPaste = !!(KEH.IsPaste);
        snap.IS_MOVEMENT_STROKE = !!(KEH.IS_MOVEMENT_STROKE);

        // ── Context booleans ─────────────────────────────────────────────────────
        snap.IsMath = !!(IMS.IsMath);
        snap.IsRef = !!(IMS.IsRef);
        snap.IsRefGroup = !!(IMS.IsRefGroup);
        snap.IsXref = !!(IMS.IsXref);
        snap.IsComment = !!(IMS.IsComment);
        snap.IsMultiPara = !!(IMS.IsMultiPara);
        snap.IsMultiElm = !!(IMS.IsMultiElm);
        snap.IsFullNode = !!(IMS.IsFullNode || KEH.IsFullNode);
        snap.IsFullFormat = !!(KEH.IsFullFormat);
        snap.IsList = !!(IMS.IsList);
        snap.IsLink = !!(IMS.IsLink);
        snap.IsContrib = !!(IMS.IsContrib);
        snap.DEL_NODE = !!(IMS.DEL_NODE);

        // ── Para-lock ─────────────────────────────────────────────────────────────
        var pLock = (IMS.paraLock && IMS.paraLock._isEnabled) ? IMS.paraLock : null;
        snap.isParaLocked = !!(pLock && pLock._isEnabled);
        snap.canShowContextMenu = !!(IMS.paraLock && IMS.paraLock.canShowContexMenu !== false);

        // ─────────────────────────────────────────────────────────────────────────
        // EXTRA ENRICHED INFO
        // ─────────────────────────────────────────────────────────────────────────

        // cursorZone
        snap.cursorZone = _resolveCursorZone(IMS, EC);

        // chapterSummary
        snap.chapterSummary = _buildChapterSummary(IMS, EC);

        // selectionSummary
        snap.selectionSummary = _buildSelectionSummary(IMS);

        // nodeChain  [node → parent → gParent]
        snap.nodeChain = [
            snap.NODE_CLAS,
            snap.PARENT_CLAS,
            snap.G_PARENT_CLAS
        ].filter(Boolean);

        // charContext
        snap.charContext = {
            prev: (IMS.RG_INFO && IMS.RG_INFO.prev_character) || null,
            next: (IMS.RG_INFO && IMS.RG_INFO.next_character) || null
        };

        // lockInfo
        snap.lockInfo = _buildLockInfo(IMS);

        // timings
        snap.timings = {
            eventTs: snap.timestamp,
            processMs: +(performance.now() - t0).toFixed(2)
        };

        return snap;
    }

    // ─── Reducer (pure mapping: action → next state) ─────────────────────────────

    /**
     * @param {Object} currentState
     * @param {string} action
     * @param {Object} payload
     * @returns {Object} next state
     */
    function _reducer(currentState, action, payload) {
        switch (action) {

            case ACTIONS.RESET:
                return _emptyState();

            case ACTIONS.KEY_DOWN:
            case ACTIONS.KEY_UP:
            case ACTIONS.SELECTION_CHANGE:
            case ACTIONS.CLICK:
            case ACTIONS.DOUBLE_CLICK:
            case ACTIONS.FOCUS:
            case ACTIONS.BLUR:
            case ACTIONS.PASTE:
            case ACTIONS.CUT:
            case ACTIONS.DRAG_START:
            case ACTIONS.DROP:
            case ACTIONS.AFTER_SET_DATA:
            case ACTIONS.CURSOR_RESTORED:
                return _buildSnapshot(action, payload);

            default:
                console.warn('[CK_EDITOR_EVENTS_MODULE] Unknown action: ' + action);
                return currentState;
        }
    }

    // ─── Store Core ───────────────────────────────────────────────────────────────

    /**
     * Notify all registered listeners with the current state.
     */
    function _notify() {
        var s = _state;
        for (var i = 0; i < _listeners.length; i++) {
            try {
                _listeners[i](s);
            } catch (e) {
                console.warn('[CK_EDITOR_EVENTS_MODULE] Listener error:', e.message);
            }
        }
    }

    /**
     * Push a snapshot into the history ring-buffer.
     */
    function _pushHistory(snap) {
        _history.push(snap);
        if (_history.length > MAX_HISTORY) {
            _history.shift();
        }
    }

    // ─── Public API ───────────────────────────────────────────────────────────────

    function CkEditorEventsModule() {
        this.ACTIONS = ACTIONS;
        this._version = '1.0.0';
    }

    /**
     * Dispatch an action into the store.
     *
     * @param {string} action   – one of ACTIONS.*
     * @param {Object} [payload]
     * @returns {Object}        – the new state snapshot (read-only reference)
     */
    CkEditorEventsModule.prototype.dispatch = function(action, payload) {
        if (_isDispatching) {
            console.warn('[CK_EDITOR_EVENTS_MODULE] dispatch() called while dispatching – action ignored:', action);
            return _state;
        }
        _isDispatching = true;
        try {
            var nextState = _reducer(_state, action, payload || {});
            if (nextState !== _state) {
                // archive previous
                _pushHistory(_state);
                _state = nextState;
            }
            _notify();
        } catch (err) {
            console.warn('[CK_EDITOR_EVENTS_MODULE] dispatch error:', err.message);
            if (typeof ErrorLogTrace === 'function') ErrorLogTrace('CK_EDITOR_EVENTS_MODULE.dispatch', err.message);
        } finally {
            _isDispatching = false;
        }
        return _state;
    };

    /**
     * Register a subscriber callback.  Returns an unsubscribe function.
     *
     * @param {Function} listener  – called with (state) after each dispatch
     * @returns {Function}         – call to unsubscribe
     */
    CkEditorEventsModule.prototype.subscribe = function(listener) {
        if (typeof listener !== 'function') {
            console.warn('[CK_EDITOR_EVENTS_MODULE] subscribe() requires a function');
            return function() {};
        }
        _listeners.push(listener);
        return function() {
            _listeners = _listeners.filter(function(l) {
                return l !== listener;
            });
        };
    };

    /**
     * Read the current state.  Returns a shallow copy.
     */
    CkEditorEventsModule.prototype.getState = function() {
        return _assign({}, _state);
    };

    /**
     * Return the full history ring-buffer (array of snapshots).
     */
    CkEditorEventsModule.prototype.getHistory = function() {
        return _history.slice();
    };

    /**
     * Return only the cursor-position portion of the state.
     * Useful for quick reads without pulling the full snapshot.
     *
     * @returns {Object} enriched cursor object
     */
    CkEditorEventsModule.prototype.getCursorInfo = function() {
        var s = _state;
        return {
            // Core IDs
            NODE_ID: s.NODE_ID,
            NODE_TAG: s.NODE_TAG,
            NODE_CLAS: s.NODE_CLAS,
            PARENT_ID: s.PARENT_ID,
            PARENT_TAG: s.PARENT_TAG,
            PARENT_CLAS: s.PARENT_CLAS,
            G_PARENT_TAG: s.G_PARENT_TAG,
            G_PARENT_CLAS: s.G_PARENT_CLAS,

            // Enriched zone / chain
            cursorZone: s.cursorZone,
            nodeChain: s.nodeChain.slice(),
            charContext: _assign({}, s.charContext),
            chapterSummary: s.chapterSummary ? _assign({}, s.chapterSummary) : null,
            selectionSummary: s.selectionSummary ? _assign({}, s.selectionSummary) : null,
            lockInfo: _assign({}, s.lockInfo),

            // Block flags
            IS_BODY_PARA: s.IS_BODY_PARA,
            IS_FRONT_PARA: s.IS_FRONT_PARA,
            IS_FLOAT_PARA: s.IS_FLOAT_PARA,
            IS_TBL_CELL: s.IS_TBL_CELL,
            IS_FN_EN_NOTE_PARA: s.IS_FN_EN_NOTE,
            IS_CITATION_ALLOWED: s.IS_CITATION_ALLOWED,
            IS_PURE_PARA: s.IS_PURE_PARA,

            // Misc
            IS_START_OF_BLOCK: s.IS_START_OF_BLOCK,
            IS_END_OF_BLOCK: s.IS_END_OF_BLOCK,
            timestamp: s.timestamp,
            timings: _assign({}, s.timings)
        };
    };

    /**
     * Reset the full store (history + listeners are preserved).
     */
    CkEditorEventsModule.prototype.reset = function() {
        this.dispatch(ACTIONS.RESET);
    };

    // ─── CKEditor Auto-wiring ─────────────────────────────────────────────────────
    /**
     * Wire all CKEditor instance events to this module.
     * Call once CKEDITOR.instanceReady has fired.
     *
     * @param {CKEDITOR.editor} editor
     */
    CkEditorEventsModule.prototype.wireEditor = function(editor) {
        if (!editor) {
            console.warn('[CK_EDITOR_EVENTS_MODULE] wireEditor() – no editor supplied');
            return;
        }

        var self = this;

        // -- keydown / keyup -------------------------------------------------------
        editor.on('key', function(e) {
            // `key` fires for keydown in CKEditor.
            // We dispatch KEY_DOWN.  iKEY_EVENT_HANDLING.getSetKeyInfo already ran
            // before this via the main keydown handler, so IMPACT_SELECTION is fresh.
            var keyData = e.data || {};
            self.dispatch(ACTIONS.KEY_DOWN, {
                keyCode: keyData.keyCode,
                keyStroke: keyData.keystroke,
                keyEvent: e.data && e.data.domEvent ? e.data.domEvent.$ : {},
                ckEvent: e
            });
        });

        // -- selectionChange -------------------------------------------------------
        editor.on('selectionChange', function(e) {
            self.dispatch(ACTIONS.SELECTION_CHANGE, {
                ckEvent: e
            });
        });

        // -- click / mousedown -----------------------------------------------------
        editor.on('click', function(e) {
            self.dispatch(ACTIONS.CLICK, {
                element: e.data && e.data.element,
                ckEvent: e
            });
        });

        // -- doubleClick -----------------------------------------------------------
        editor.on('doubleclick', function(e) {
            self.dispatch(ACTIONS.DOUBLE_CLICK, {
                element: e.data && e.data.element,
                ckEvent: e
            });
        });

        // -- focus ----------------------------------------------------------------
        editor.on('focus', function(e) {
            self.dispatch(ACTIONS.FOCUS, {
                ckEvent: e
            });
        });

        // -- blur -----------------------------------------------------------------
        editor.on('blur', function(e) {
            self.dispatch(ACTIONS.BLUR, {
                ckEvent: e
            });
        });

        // -- paste ----------------------------------------------------------------
        editor.on('paste', function(e) {
            self.dispatch(ACTIONS.PASTE, {
                dataValue: e.data && e.data.dataValue,
                ckEvent: e
            });
        });

        // -- cut ------------------------------------------------------------------
        editor.on('cut', function(e) {
            self.dispatch(ACTIONS.CUT, {
                ckEvent: e
            });
        });

        // -- dragstart / drop -----------------------------------------------------
        editor.on('dragstart', function(e) {
            self.dispatch(ACTIONS.DRAG_START, {
                ckEvent: e
            });
        });

        editor.on('drop', function(e) {
            self.dispatch(ACTIONS.DROP, {
                ckEvent: e
            });
        });

        // -- afterSetData ---------------------------------------------------------
        editor.on('afterSetData', function(e) {
            self.dispatch(ACTIONS.AFTER_SET_DATA, {
                ckEvent: e
            });
        });

        console.log('%c✓ CK_EDITOR_EVENTS_MODULE wired to editor', 'color:#4CAF50;font-weight:bold');
    };

    // ─── Singleton + autoBindError wrapping ───────────────────────────────────────

    global.CK_EDITOR_EVENTS_MODULE = new CkEditorEventsModule();

    if (typeof autoBindError === 'function' && global.CK_EDITOR_EVENTS_MODULE) {
        var _logger = (typeof ErrorLogTrace === 'function') ?
            ErrorLogTrace :
            function(n, m) {
                console.warn('[' + n + ']', m);
            };

        for (var _k in global.CK_EDITOR_EVENTS_MODULE) {
            if (typeof global.CK_EDITOR_EVENTS_MODULE[_k] === 'function') {
                global.CK_EDITOR_EVENTS_MODULE[_k] = autoBindError(
                    global.CK_EDITOR_EVENTS_MODULE[_k],
                    global.CK_EDITOR_EVENTS_MODULE,
                    _logger
                );
            }
        }
    }

    console.log('%c✓ CK_EDITOR_EVENTS_MODULE Loaded v1.0.0', 'color:#2196F3;font-weight:bold;font-size:12px');

})(window);