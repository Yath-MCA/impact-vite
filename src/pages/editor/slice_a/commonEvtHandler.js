/**
 * ============================================================
 * UNIFIED EDITOR CONFIGURATION & HANDLER
 * ============================================================
 * Consolidated version eliminating DRY violations
 * Split into logical, reusable objects
 * 
 * @version 3.0.0
 */

'use strict';

const INLINE_FORMAT_TAGS = ['strong', 'sub', 'sup', 'u', 'em', 'sc'];

function autoBindError(fn, ctx, logger) {
    const fnName = fn.name || "<anonymous>";
    console.time(`autoBindError:${fnName}`);
    const start = performance.now();
    try {
        return function() {
            const innerStart = performance.now();
            try {
                return fn.apply(ctx, arguments);
            } catch (err) {
                logger(err);
            } finally {
                const innerEnd = performance.now();
                // console.log(`autoBindError wrapped fn "${fnName}" took ${(innerEnd - innerStart).toFixed(2)} ms`);
            }
        };
    } finally {
        const end = performance.now();
        // console.log(`autoBindError setup for "${fnName}" took ${(end - start).toFixed(2)} ms`);
        // console.timeEnd(`autoBindError:${fnName}`);
    }
}

function bindGlobalErrorLogger(global) {
    if (typeof ErrorLogTrace === 'function') {
        global.ErrorLogTrace = ErrorLogTrace.bind(global);
    }
}

function wrapInstanceMethods(instance, logger, excludeKey) {
    if (typeof autoBindError !== 'function' || !instance) return instance;

    for (var key in instance) {
        if (typeof instance[key] === "function" && key !== (excludeKey || "ErrorLogTrace")) {
            instance[key] = autoBindError(
                instance[key],
                instance,
                logger
            );
        }
    }

    return instance;
}
// ========== CONFIG: EDITOR_CONFIG ==========
window.EDITOR_CONFIG = {
    version: '3.0.0',

    finder_xPath: {
        JATS: {
            FM: ".front",
            BM: ".body",
            EM: ".back",
            APP: ".app-group",
            ABS: ".abstract",
            ABS_PARA: ".abstract .p",
            KWD: ".kwd",
            KWD_GROUP: ".kwd-group",
            ABR: ".def,.term",
            ABR_GROUP: ".def-list",
            TBL_CELL: "td",
            FN_EN: ".fn-group",
            FIG_TAB: ".table-wrap,.fig",
            FIG_TAB_CAP: ".caption",
            TBL_FN: ".fn",
            EXT: ".disp-quote",
            FM_PARA: ".front .p",
            FIND_CHAP: ".FIND_CHAP",
            FIND_PART: ".FIND_PART"
        },
        BITS: {
            FM: ".front-matter",
            BM: ".book-body",
            EM: ".book-back",
            ABS: ".abstract",
            ABS_PARA: ".abstract .p",
            KWD: ".kwd",
            KWD_GROUP: ".kwd-group",
            ABR: ".def,.term",
            ABR_GROUP: ".def-list",
            APP: ".app-group",
            FN_EN: ".fn-group",
            FIG_TAB: ".table-wrap,.fig",
            TBL_CELL: "td",
            TBL_FN: ".fn",
            FIG_TAB_CAP: ".caption",
            EXT: ".disp-quote",
            FM_PARA: ".named-book-part-body",
            FIND_CHAP: ".book-part[book-part-type]",
            FIND_PART: ".book-part[book-part-type]"
        }
    },

    keyConfig: {
        CUT: 1114200,
        COPY: 1114179,
        PASTE: [1114198, 3342422],
        BKSP_SPACE_DEL: [8, 46, 32],
        ENTER: [13],
        MOVEMENT: ["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowRight", "ArrowLeft", "ArrowDown"],
        MOVEMENT_CODES: [33, 34, 36, 35, 38, 39, 37, 40],
        ARROW: ["ArrowUp", "ArrowRight", "ArrowLeft", "ArrowDown"],
        ARROW_CODES: [38, 39, 37, 40],
        COMBINED_ARROW: [1114148, 1114147]
    },

    restrictionClasses: {
        BEG_PARA_BKSPACE: ['title', 'caption', 'p', 'li'],
        DEFAULT_KEY: ['graphic', 'inline-graphic', 'ice-del', 'day', 'month', 'year'],
        FULL_FORMAT: ['article-categories', 'title-group', 'title', 'subtitle', 'alt-title', 'article-title', 'subj-group', 'subject', 'caption', 'p', 'kwd', 'author-notes', 'corresp', 'aff', 'fn', 'source', 'alt-text', 'day', 'month', 'year', 'mixed-citation'],
        FORMAT: ['surname', 'given-names', 'x', 'institution', 'publisher-name', 'publisher-loc', 'year', 'volume', 'issue', 'fpage', 'lpage', 'collab', 'role', 'degrees', 'prefix', 'suffix', 'author-comment', 'person-group', 'ext-link', 'conf-name', 'ice-del', 'source', 'alt-text', 'history', 'day', 'month', 'year', 'mixed-citation'],
        TEMPLATE: ['title', 'kwd', 'surname', 'given-names', 'corresp', 'alt-text', 'def-list', 'term', 'def'],
        LINK_FORMULA_IMG: ["formula", "xref", "uri", "email", "ext-link", "graphic"],
        TITLE_ARR: ['article-categories', 'title-group', 'title', 'subtitle', 'alt-title', 'article-title', 'subj-group', 'subject']
    },

    restrictMap: {
        ".fn": ".p",
        ".ref": ".mixed-citation",
        ".contrib": ".name",
        ".title-group": ".article-title",
        ".contrib-group": ".aff",
        ".ref-list": ".title",
        ".sec": ".title",
        ".author-notes": ".corresp",
        ".ack": ".title",
        ".article-categories": ".subj-group",
        ".subj-group": ".subject",
        ".kwd-group": ".kwd",
        ".abstract": ".sec",
        ".caption": ".p",
        ".fig": ".alt-text",
        ".pub-date": ".day"
    },

    allowedKeys: {
        Tab: 9,
        Shift: 16,
        Control: 17,
        CapsLock: 20,
        Escape: 27,
        PageUp: 33,
        PageDown: 34,
        Home: 36,
        End: 35,
        ArrowLeft: 37,
        ArrowRight: 39,
        ArrowUp: 38,
        ArrowDown: 40,
        Meta: 91,
        ctrl: 1114129,
        save: 1114195,
        Alt: 18,
        copy: 1114179,
        refresh: 3342352,
        Undo: 1114202,
        Redo: 1114201,
        Find: 1114182
    },

    disallowedKeys: {
        0: 48,
        1: 49,
        2: 50,
        3: 51,
        4: 52,
        5: 53,
        6: 54,
        7: 55,
        8: 56,
        9: 57,
        a: 65,
        b: 66,
        c: 67,
        d: 68,
        e: 69,
        f: 70,
        g: 71,
        h: 72,
        i: 73,
        j: 74,
        k: 75,
        l: 76,
        m: 77,
        n: 78,
        o: 79,
        p: 80,
        q: 81,
        r: 82,
        s: 83,
        t: 84,
        u: 85,
        v: 86,
        w: 87,
        x: 88,
        y: 89,
        z: 90,
        "numpad 0": 96,
        "numpad 1": 97,
        "numpad 2": 98,
        "numpad 3": 99,
        "numpad 4": 100,
        "numpad 5": 101,
        "numpad 6": 102,
        "numpad 7": 103,
        "numpad 8": 104,
        "numpad 9": 105,
        multiply: 106,
        add: 107,
        subtract: 109,
        "decimal point": 110,
        divide: 111,
        "semi-colon": 186,
        "equal sign": 187,
        comma: 188,
        dash: 189,
        period: 190,
        "forward slash": 191,
        "grave accent": 192,
        "open bracket": 219,
        "back slash": 220,
        "close braket": 221,
        "single quote": 222
    },

    shortcutKeys: {
        1114182: "find",
        1114184: "replace"
    },

    formatKeys: {
        chrome: {
            BOLD: 1114178,
            ITALICS: 1114185,
            UNDERLINE: 1114197,
            SUP: 1114299,
            SUB: 3342523
        },
        firefox: {
            BOLD: 1114178,
            ITALICS: 1114185,
            UNDERLINE: 1114197,
            SUP: 1114173,
            SUB: 3342397
        }
    },

    alertMessages: [
        'deleteMutliPara', 'curOptRevertError', 'Ignore_KeyEvent_Math',
        'Ignore_KeyEvent_FM', 'Ignore_KeyEvent_NoteQry', 'Ignore_KeyEvent_XREFS',
        'Ignore_Full_Format', 'Last_char', 'Ignore_ref_action', 'Ignore_KeyEvent_Link'
    ],

    tagConfig: {
        span: {
            IGNORE_CLASS: ['inline-formula', 'ckcommentsfull', 'para-merge']
        },
        div: {
            IGNORE_CLASS: ['disp-formula']
        },
        ERROR_CLASS: {
            "inline-formula": 'Ignore_KeyEvent_Math_Retain',
            "disp-formula": 'Ignore_KeyEvent_Math_Retain',
            "ckcommentsfull": "Ignore_KeyEvent_NoteQry",
            "para-merge": "Ignore_KeyEvent_PMerge",
            "default": "Ignore_KeyEvent_FM"
        },
        SELECTOR_QRY: '.inline-formula,.disp-formula,[data-class=ckcommentsfull], [data-class=para-merge]'
    }
};

console.log('%c✓ EDITOR_CONFIG Loaded v3.0.0', 'color: green; font-weight: bold; font-size: 12px;');

/**
 * ============================================================
 * EDITOR COMMON UTILITIES
 * ============================================================
 * Centralized utility functions used across editor modules
 * 
 * @version 4.0.0
 */

'use strict';

window.EDITOR_UTILS = {
    /**
     * Get element class/data-name attribute
     */
    getNodeClass(node) {
        if (!node) return null;
        if (node.hasAttribute && node.hasAttribute('data-name')) {
            return node.getAttribute('data-name');
        }
        if (node.hasAttribute && node.hasAttribute('data-class')) {
            return node.getAttribute('data-class');
        }
        if (node.$) return this.getNodeClass(node.$);
        return node.className || null;
    },

    /**
     * Check if node has specific data-name class
     */
    hasDataName(node, classList) {
        if (!node || !classList) return false;
        const nodeClass = this.getNodeClass(node);
        return Array.isArray(classList) ?
            classList.includes(nodeClass) :
            nodeClass === classList;
    },

    /**
     * Get text content without special characters
     */
    getCleanText(element, options = {}) {
        const {
            removeNbsp = true, removeNewlines = true, removeSpaces = true
        } = options;
        let text = element && element.textContent || element && element.getText() || '';

        if (removeNbsp) text = text.replace(/&nbsp;|&#x00A0;|\u00A0/g, '');
        if (removeNewlines) text = text.replace(/[\r\n]+/g, '');
        if (removeSpaces) text = text.replace(/\s+/g, ' ');

        return text.trim();
    },

    /**
     * Clone and clean node (remove comments, fonts, del tags)
     */
    cloneAndClean(node, options = {}) {
        const {
            removeComments = true, removeFormats = true, removeDel = true
        } = options;
        const clone = node.cloneNode ? node.cloneNode(true) : node.$.cloneNode(true);

        const selectorsToRemove = [];
        if (removeComments) selectorsToRemove.push('[data-class="ckcommentsfull"]');
        if (removeFormats) selectorsToRemove.push('span.font');
        if (removeDel) selectorsToRemove.push('del');

        if (selectorsToRemove.length > 0) {
            clone.querySelectorAll(selectorsToRemove.join(',')).forEach(el => {
                if (el.parentElement) el.parentElement.removeChild(el);
            });
        }

        return clone;
    },

    /**
     * Normalize node text content
     */
    normalizeNode(node) {
        const domNode = node.$ || node;
        if (domNode && typeof domNode.normalize === 'function') {
            domNode.normalize();
        }
        return node;
    },

    /**
     * Get ascendant element matching criteria
     */
    getAscendant(element, options = {}) {
        const {
            attr,
            id,
            className,
            value
        } = options;

        if (!element || typeof element.getAscendant !== 'function') {
            console.warn('Invalid element or missing getAscendant()');
            return null;
        }

        return element.getAscendant(node => {
            if (!node) return false;

            // Check by ID
            if (id && typeof node.getId === 'function' && node.getId() === id) {
                return true;
            }

            // Check by class/attribute + value
            if ((className || attr) && value && typeof node.getAttribute === 'function') {
                const attrValue = node.getAttribute(className ? 'class' : attr);
                return attrValue && attrValue.includes(value);
            }

            return false;
        });
    },

    buildAscendantOptions(options = {}) {
        return {
            attr: options.attr || options._attr,
            id: options.id || options._id,
            className: options.className || options._class,
            value: options.value || options._value
        };
    },

    /**
     * Recursively get parent element ID
     */
    getRecursiveParentId(element, maxDepth = 10) {
        try {
            if (!element || ['html', 'body'].includes(element && element.getName())) return null;

            let current = element;
            let depth = 0;

            while (current.getParent() && !current.getParent().getId() && depth < maxDepth) {
                current = current.getParent();
                depth++;
            }

            return current.getParent() ? current.getParent().getId() : null;
        } catch (err) {
            console.warn('getRecursiveParentId error:', err.message);
            return null;
        }
    },

    /**
     * Check if arrays have common elements
     */
    hasCommonElements(arr1, arr2) {
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
        return arr1.some(item => arr2.includes(item));
    },

    /**
     * Check if element is in specific container
     */
    isInContainer(element, selector) {
        const domEl = element.$ || element;
        return domEl && domEl.closest && domEl.closest(selector) || false;
    },

    /**
     * Get all children classes from element
     */
    getChildrenClasses(node, options = {}) {
        const {
            checkEmpty = false, unique = true
        } = options;
        const classes = [];

        [...(node && node.querySelectorAll ? node.querySelectorAll('*') : [])].forEach(elm => {
            if (checkEmpty && elm.textContent === '') {
                if (!/img/gi.test(elm.tagName)) {
                    if (elm.parentElement) elm.parentElement.removeChild(elm);
                }
            } else if (elm.className) {
                classes.push(elm.className);
            }
        });

        return unique ? [...new Set(classes)].filter(Boolean) :
            classes.filter(Boolean);
    },

    /**
     * Event return helper
     */
    cancelEvent(event) {
        if (!event) return false;

        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault(true);
        if (typeof event.cancel === 'function') event.cancel();

        return false;
    },

    /**
     * Check if sequence exists in order within array
     */
    includesInOrder(array, sequence) {
        if (!Array.isArray(array) || !Array.isArray(sequence)) return false;

        let seqIndex = 0;
        for (let i = 0; i < array.length && seqIndex < sequence.length; i++) {
            if (array[i] === sequence[seqIndex]) {
                seqIndex++;
            }
        }

        return seqIndex === sequence.length;
    },

    /**
     * Create word boundary selector
     */
    createWordBoundarySelector(value, excludeAttrs = []) {
        let selector = `[rid="${value}"]`;

        if (excludeAttrs.length > 0) {
            const notSelectors = excludeAttrs.map(attr => `:not([${attr}])`).join('');
            selector += notSelectors;
        }

        return selector;
    },

    /**
     * Check if node is comment node
     */
    isCommentNode(node) {
        if (!node) return false;

        const getName = node.getName && node.getName();
        const hasClass = node.getAttribute && node.getAttribute('data-class');

        return getName === 'span' && hasClass === 'ckcommentsfull';
    },

    /**
     * Get first text node in element
     */
    getFirstTextNode(element) {
        const skipElements = ['data-cke-bookmark', 'data-class'];
        const skipTags = ['insert', 'del'];

        if (element.hasAttribute) {
            const hasSkipAttr = skipElements.some(attr => element.hasAttribute(attr));
            const hasSkipTag = skipTags.includes(element.tagName && element.tagName.toLowerCase());

            if (hasSkipAttr || hasSkipTag) return null;
        }

        for (let node of element.childNodes) {
            if (node.nodeType === 3 && node.nodeValue.trim().length > 0) {
                return node;
            } else if (node.nodeType === 1) {
                const found = this.getFirstTextNode(node);
                if (found) return found;
            }
        }

        return null;
    },

    /**
     * Log helper with styling
     */
    log(message, type = 'info', data = null) {
        const styles = {
            info: 'color: #2196F3; font-weight: bold',
            success: 'color: #4CAF50; font-weight: bold',
            warn: 'color: #FF9800; font-weight: bold',
            error: 'color: #F44336; font-weight: bold'
        };

        console.log(`%c${message}`, styles[type] || styles.info, data || '');
    }
};


(function(global) {
    'use strict';

    var EDITOR_CONFIG = global.EDITOR_CONFIG;
    var EDITOR_UTILS = global.EDITOR_UTILS;

    function EditorCursor(config, utils) {
        this.config = config;
        this.utils = utils;

        this.Init = null;
        this.selector = {};

        this._flags = [
            'IS_FRONT', 'IS_BODY', 'IS_BACK', 'IS_APPENDIX', 'IS_ABS', 'IS_ABS_PARA',
            'IS_KWD', 'IS_KWD_GROUP', 'IS_ABR', 'IS_ABR_GROUP', 'IS_FN_EN_NOTE',
            'IS_FLOAT', 'IS_HEAD_TITLE', 'IS_FRONT_PARA', 'IS_EXT_PARA',
            'CUR_CHAPTER', 'CUR_CHAPTER_NO', 'CUR_CHAPTER_ID', 'CUR_CHAPTER_DATA',
            'IS_CAPTION_PARA', 'IS_TBL_CELL', 'IS_FLOAT_PARA', 'IS_FLOAT_FN_PARA',
            'IS_FLOAT_FN_LINK_PARA', 'IS_FN_EN_NOTE_PARA', 'IS_BODY_PARA',
            'IS_PURE_PARA', 'IS_BACK_PARA', 'IS_CITATION_ALLOWED'
        ];

        for (var i = 0; i < this._flags.length; i++) {
            this[this._flags[i]] = null;
        }

        this._cache = {
            nodeId: null,
            nodeClas: null,
            parentsKey: '',
            snapshot: null
        };
    }

    /* ---------------- helpers ---------------- */

    function fastClosest(node, selector) {
        try {
            var dom = node && node.$ ? node.$ : node;
            while (dom && dom.nodeType === 1) {
                if (dom.matches && dom.matches(selector)) return dom;
                dom = dom.parentNode;
            }
        } catch (e) {
            ErrorLogTrace('fastClosest', e.message);
        }
        return null;
    }

    function extractChapterNumber(label) {
        var m = label && label.match(/\d+/);
        return m ? m[0] : "";
    }

    function restoreFromCache(ctx, snap) {
        for (var i = 0; i < ctx._flags.length; i++) {
            var k = ctx._flags[i];
            ctx[k] = snap[k];
        }
        ctx.Init = true;
    }

    function makeSnapshot(ctx) {
        var out = {};
        for (var i = 0; i < ctx._flags.length; i++) {
            var k = ctx._flags[i];
            out[k] = ctx[k];
        }
        return out;
    }

    function hasAnyParent(list, required) {
        if (!Array.isArray(list) || !Array.isArray(required)) return false;

        const set = new Set(list);

        for (let i = 0; i < required.length; i++) {
            if (set.has(required[i])) return true;
        }

        return false;
    }

    function hasAllParents(list, required) {
        if (!Array.isArray(list) || !Array.isArray(required)) return false;

        for (let i = 0; i < required.length; i++) {
            if (!list.includes(required[i])) return false;
        }

        return true;
    }

    commonMethods.hasAnyParent = hasAnyParent;
    commonMethods.hasAllParents = hasAllParents;


    function isFloatFnLinkPara(fnPara) {
        if (!fnPara) return false;

        function hasSup(elm) {
            if (!elm || elm.nodeType !== 1) return false;
            return elm.tagName === 'SUP' || (elm.querySelector && elm.querySelector('sup'));
        }

        var first = fnPara.firstChild;
        return (
            fnPara.hasAttribute('data-label') ||
            (first && (hasSup(first) || hasSup(first.firstChild))) ||
            (fnPara.querySelector && fnPara.querySelector('.sup'))
        );
    }

    /* ---------------- main ---------------- */

    EditorCursor.prototype.FIRE = function(IMS, Options) {
        Options = Options || {};

        try {
            if (!IMS || !IMS.NODE || !IMS.NODE.$) return;

            var node = IMS.NODE;
            var nodeId = typeof node.getId === 'function' ? node.getId() : null;
            var nodeClas = IMS.NODE_CLAS || '';
            var parentsKey = (IMS.PARENTS_CLAS_LIST || []).join('|');

            if (!Options.force &&
                this._cache.nodeId === nodeId &&
                this._cache.nodeClas === nodeClas &&
                this._cache.parentsKey === parentsKey &&
                this._cache.snapshot) {

                restoreFromCache(this, this._cache.snapshot);
                return;
            }

            var dtd = global.DOC_DTD;
            var finder = this.config && this.config.finder_xPath && this.config.finder_xPath[dtd];

            if (!finder) return;
            this.selector = finder;

            var domNode = node.$;

            this.IS_FRONT = fastClosest(domNode, finder.FM);
            this.IS_BODY = fastClosest(domNode, finder.BM);
            this.IS_BACK = fastClosest(domNode, finder.EM);
            this.IS_APPENDIX = fastClosest(domNode, finder.APP || '.app-group');
            this.IS_ABS = fastClosest(domNode, finder.ABS);
            this.IS_ABS_PARA = this.IS_ABS && fastClosest(domNode, finder.ABS_PARA);

            this.IS_KWD = fastClosest(domNode, finder.KWD);
            this.IS_KWD_GROUP = this.IS_KWD && fastClosest(domNode, finder.KWD_GROUP);

            this.IS_ABR = fastClosest(domNode, finder.ABR);
            this.IS_ABR_GROUP = this.IS_ABR && fastClosest(domNode, finder.ABR_GROUP);

            this.IS_FN_EN_NOTE = fastClosest(domNode, finder.FN_EN);
            this.IS_FLOAT = fastClosest(domNode, finder.FIG_TAB);


            this.IS_FRONT_PARA = this.IS_FRONT && fastClosest(domNode, finder.FM_PARA);
            this.IS_EXT_PARA = fastClosest(domNode, finder.EXT);

            this.CUR_CHAPTER = this.IS_FRONT_PARA ||
                fastClosest(domNode, finder.FIND_CHAP);

            IMS.CUR_CHAPTER = this.CUR_CHAPTER;

            this.IS_CAPTION_PARA = this.IS_FLOAT && fastClosest(domNode, finder.FIG_TAB_CAP);
            this.IS_TBL_CELL = this.IS_FLOAT && fastClosest(domNode, finder.TBL_CELL);

            this.IS_HEAD_TITLE = commonMethods.hasAllParents(IMS.PARENTS_CLAS_LIST, ['title', 'sec']) && !this.IS_FLOAT;

            var parents = IMS.PARENTS_CLAS_LIST || [];
            var isP = nodeClas === 'p' || parents.indexOf('p') !== -1;

            this.IS_FLOAT_PARA = this.IS_FLOAT && (nodeClas === 'p' || nodeClas === 'attrib');
            this.IS_FLOAT_FN_PARA = this.IS_FLOAT_PARA && fastClosest(domNode, finder.TBL_FN);
            this.IS_FLOAT_FN_LINK_PARA = isFloatFnLinkPara(this.IS_FLOAT_FN_PARA);

            this.IS_FN_EN_NOTE_PARA = this.IS_FN_EN_NOTE && (nodeClas === 'p' || nodeClas === 'attrib');

            this.IS_BODY_PARA =
                isP && this.IS_BODY &&
                !IMS.IsRefGroup && !IMS.IsMath &&
                !this.IS_FLOAT && !this.IS_FRONT_PARA;

            this.IS_PURE_PARA =
                this.IS_BODY_PARA &&
                !IMS.IsList && !this.IS_EXT_PARA &&
                !this.IS_FN_EN_NOTE && !IMS.IsMath;

            this.IS_BACK_PARA =
                nodeClas === 'p' &&
                (this.IS_BACK || this.IS_FN_EN_NOTE) &&
                !IMS.IsRefGroup && !IMS.IsMath;

            this.IS_CITATION_ALLOWED =
                this.IS_BODY_PARA ||
                this.IS_CAPTION_PARA ||
                this.IS_FLOAT_PARA ||
                this.IS_TBL_CELL ||
                this.IS_FN_EN_NOTE_PARA ||
                this.IS_HEAD_TITLE;

            if (this.IS_BACK && !IMS.IsRefGroup) {
                if ((global.iREF_SCOPE && global.iREF_SCOPE.IS_NAME_DATE) || this.IS_APPENDIX) {
                    this.IS_CITATION_ALLOWED = true;
                }
            }

            if (this.CUR_CHAPTER) {
                var t = this.CUR_CHAPTER.querySelector &&
                    this.CUR_CHAPTER.querySelector('.title-group .title');

                this.CUR_CHAPTER_NO = t ? extractChapterNumber(t.getAttribute('data-label')) : "";
                this.CUR_CHAPTER_ID = this.CUR_CHAPTER.id;
                this.CUR_CHAPTER_DATA = this.CUR_CHAPTER.outerHTML;

                IMS.CUR_CHAP_NO = this.CUR_CHAPTER_NO;
                IMS.CUR_CHAP_ID = this.CUR_CHAPTER_ID;
                IMS.CUR_CHAPTER_DATA = this.CUR_CHAPTER_DATA;

                var parent = this.CUR_CHAPTER.parentElement;
                IMS.OVER_ALL_CHAPTERS =
                    parent && parent.querySelectorAll ?
                    parent.querySelectorAll(finder.FIND_CHAP).length || 1 :
                    1;
            }

            this.Init = true;

            this._cache.nodeId = nodeId;
            this._cache.nodeClas = nodeClas;
            this._cache.parentsKey = parentsKey;
            this._cache.snapshot = makeSnapshot(this);

        } catch (e) {
            ErrorLogTrace('EDITOR_CURSOR', e.message);
        }
    };

    global.EDITOR_CURSOR = new EditorCursor(EDITOR_CONFIG, EDITOR_UTILS);
    bindGlobalErrorLogger(global);
    wrapInstanceMethods(global.EDITOR_CURSOR, global.ErrorLogTrace);


})(window);

(function(global) {
    'use strict';

    var CONFIG = global.EDITOR_CONFIG;
    var UTILS = global.EDITOR_UTILS;

    function ImpactSelection(config, utils, cursor) {
        this.config = config;
        this.utils = utils;
        this.cursor = cursor;

        this.LAST_CURSOR = {
            NODE_ID: null,
            PARENT_ID: null,
            NODE_INDEX: null,
            G_PARENT_ID: null
        };

        this.CURRENT_CURSOR = {
            NODE_ID: null,
            PARENT_ID: null,
            NODE_INDEX: null
        };

        this.CLK_WARN_ALERT_COUNT = 0;
        this.FORMAT_REF_WARN_ALERT_COUNT = 0;
        this.CURSOR_AREA = null;
        this.ElementPath = null;
        this.ERROR = 0;
        this.RETRY = 0;
        this.PARENTS_CLAS_LIST = [];
        this.PARENTS_TAG_LIST = [];
        this.SEL_TEXT = "";
        this.SEL_TEXT_CLONE = "";
        this.NODE_TEXT = "";
        this.NODE_CLONE_TEXT = "";
        this.PARENT_TEXT = "";
        this.PARENT_CLONE_TEXT = "";
        this.LoopCountMax = 5;
        this.LoopCount = 0;
        this.RG_INFO = {
            divCount: 0
        };
        this.LAST_TRACE = "";
        this.NATIVE = null;

        this.NODE = null;
        this.PARENT = null;
        this.G_PARENT = null;
        this.NODE_ASCENT = null;

        this.NODE_TAG = "";
        this.NODE_CLAS = "";
        this.PARENT_TAG = "";
        this.PARENT_CLAS = "";
        this.G_PARENT_TAG = "";
        this.G_PARENT_CLAS = "";

        this.NODE_CLONE = null;
        this.PARENT_CLONE = null;
        this.G_PARENT_CLONE = null;

        this.NODE_FULL_SELECT = false;
        this.DEL_NODE = false;

        // internal cache for performance
        this._cache = {
            lastNodeId: null,
            lastParentId: null,
            lastRangeKey: '',
            lastResult: null
        };
    }

    ImpactSelection.prototype._SNAPSHOT = function(options, g) {
        try {
            if (this.ERROR > 3) return;

            options = options || {};
            g = g || global.GlobalEditor;

            if (!g || !g.undoManager) {
                if (this.RETRY > 5) return;
                this.RETRY++;
                var self = this;
                setTimeout(function() {
                    self._SNAPSHOT(options, g);
                }, 3000);
                return null;
            }

            if (options.save && !options.unlock) {
                g.fire('saveSnapshot');
            } else if (options.update && !options.unlock) {
                g.fire('updateSnapshot');
            }

            if (options.lock) {
                if (!g.undoManager.locked) g.fire('lockSnapshot');
            } else if (options.unlock) {
                var unlock = 0;
                while (g.undoManager.locked) {
                    g.fire('unlockSnapshot');
                    if (unlock < 10) unlock++;
                    else if (unlock > 10) break;
                }
                if (options.save) g.fire('saveSnapshot');
                if (options.update) g.fire('updateSnapshot');
            }

            if (options.reset) g.undoManager.reset();
            g.undoManager.refreshState();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_SNAP', err.message);
            if (this.ERROR > 3 && global.IS_LOCAL_HOST) {
                debugger;
            }
        }
    };

    ImpactSelection.prototype.getLastCursor_Id = function() {
        try {
            var last = this.LAST_CURSOR;
            var id = last.NODE_ID ? last.NODE_ID :
                (last.PARENT_ID ? last.PARENT_ID :
                    (last.G_PARENT_ID ? last.G_PARENT_ID : null));
            return id;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getLastCursor_Id', err.message);
        }
    };

    ImpactSelection.prototype.Recursive_get_id = function(par_elm, Option) {
        try {
            if (!par_elm || ['html', 'body'].indexOf(par_elm.getName()) !== -1) return null;

            var loop = 1;
            while (par_elm.getParent() && !par_elm.getParent().getId() && loop < 10) {
                par_elm = par_elm.getParent();
                loop++;
            }
            var id = par_elm.getParent() ? par_elm.getParent().getId() : null;
            return id ? id : null;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Recursive_get_id', err.message);
        }
    };

    ImpactSelection.prototype.assign_dynamic = function(node, key) {
        try {
            if (!node) {
                this[key + '_TAG'] = "";
                this[key + '_CLAS'] = "";
                this[key + '_TEXT'] = "";
                this[key + '_CLONE'] = "";
                return;
            }

            var dom = node.$;
            this[key + '_TAG'] = node.getName ? node.getName().toUpperCase() : "";
            this[key + '_CLAS'] = dom ? (dom.dataset && dom.dataset.name ? dom.dataset.name : dom.className) : "";
            this[key + '_TEXT'] = dom ? dom.textContent : "";

            var clone = dom ? dom.cloneNode(true) : null;
            this[key + '_CLONE'] = clone;

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('assign_dynamic', err.message);
        }
    };

    /**
     * Main selection info method (hot path)
     * This is the big performance hotspot – we cache by node + range signature
     */
    ImpactSelection.prototype.getInfo = function(editor, Options, b, a, d) {
        Options = Options || {};
        try {
            debug.log("===IMPACT_SELECTION getInfo===");

            var self = this;

            if (global.iKEY_EVENT_HANDLING && global.iKEY_EVENT_HANDLING.IS_LAST_EVT) {
                // debug.log("====");
            }

            if (global.IS_LOCAL_HOST) {
                var current = traceOrder();
                // console.log(current);
                if (current === this.LAST_TRACE) {
                    debug.log("event fire last trace same");
                }
                this.LAST_TRACE = current;
            }

            editor = editor || global.GlobalEditor;
            if (!editor) return;

            // Normalize options
            if (!Options) Options = {
                current: false
            };

            // Delegate node detection to key handler util (existing behavior)
            global.iKEY_EVENT_HANDLING.getNode(editor, this, null, {
                TARGET: Options.TARGET
            });

            this.ElementPath = editor.elementPath();
            var gSelection = editor.getSelection();
            if (!gSelection) return false;

            var ranges = gSelection.getRanges();
            if (!ranges || !ranges.length) return false;

            var range = ranges[0];
            if (!range) return false;

            var el = editor.document.createElement('div');
            el.append(range.cloneContents());

            // Build a cheap range key for caching
            var startNode = range.startContainer;
            var endNode = range.endContainer;
            var startId = startNode && startNode.getName && startNode.getId ? startNode.getId() : null;
            var endId = endNode && endNode.getName && endNode.getId ? endNode.getId() : null;
            var rangeKey = String(startId || '') + '|' + String(endId || '') + '|' + String(range.startOffset) + '|' + String(range.endOffset);

            var nodeId = this.NODE && this.NODE.getId ? this.NODE.getId() : null;
            var parentId = this.PARENT && this.PARENT.getId ? this.PARENT.getId() : null;

            if (this._cache.lastNodeId === nodeId &&
                this._cache.lastParentId === parentId &&
                this._cache.lastRangeKey === rangeKey &&
                this._cache.lastResult &&
                !Options.force) {

                return this._cache.lastResult;
            }

            this.ISstartOfBlock = range.checkStartOfBlock() || false;
            this.ISEndOfBlock = range.checkEndOfBlock() || false;

            var tempObj = {
                NODE_INDEX: Array.prototype.indexOf.call(this.PARENT.$.childNodes, this.NODE.$),
                NODE_ID: this.NODE.getId(),
                PARENT_ID: this.PARENT.getId(),
                G_PARENT_ID: this.Recursive_get_id(this.PARENT),
                CK_ELM: this.NODE
            };

            if (Options.current) {
                this.CURRENT_CURSOR = tempObj;
            } else {
                this.LAST_CURSOR = tempObj;
            }

            this.NATIVE = gSelection.getNative();
            this.SEL_TEXT_CLONE = this.SEL_TEXT;
            this.SEL_TEXT_CLONE = this.SEL_TEXT_CLONE ? this.SEL_TEXT_CLONE.trim() : "";

            // NODE_DETAILS
            this.assign_dynamic(this.NODE, 'NODE');

            // ASCENT DETAILS
            this.NODE_ASCENT = this.NODE.getAscendant({
                div: 1,
                p: 1,
                li: 1
            }, true);
            this.assign_dynamic(this.NODE_ASCENT, 'NODE_ASCENT');

            if (this.NODE_CLONE && this.NODE_CLONE.querySelectorAll) {
                this.NODE_CLONE.querySelectorAll('[data-class="ckcommentsfull"],span.font,del').forEach(function(el2) {
                    if (el2.parentElement) el2.parentElement.removeChild(el2);
                });
                this.NODE_CLONE_TEXT = this.NODE_CLONE.textContent.trim();
            } else {
                this.NODE_CLONE_TEXT = "";
            }

            // PARENT_DETAILS
            this.assign_dynamic(this.PARENT, 'PARENT');
            if (this.PARENT_CLONE && this.PARENT_CLONE.querySelectorAll) {
                this.PARENT_CLONE.querySelectorAll('[data-class="ckcommentsfull"],span.font,del').forEach(function(el3) {
                    if (el3.parentElement) el3.parentElement.removeChild(el3);
                });
                this.PARENT_CLONE_TEXT = this.PARENT_CLONE.textContent.trim();
            } else {
                this.PARENT_CLONE_TEXT = "";
            }

            // GRAND_PARENT_DETAILS
            this.assign_dynamic(this.PARENT.getParent(), 'G_PARENT');

            this.RG_INFO.STRING = el.$.innerHTML;
            this.RG_INFO.RANGE = range;

            this.CURSOR_AFTER_BEFORE_CHARACTER(range);

            this.PARENTS_CLAS_LIST = Array.prototype.map.call(
                this.ElementPath.elements,
                function(elm) {
                    return elm.$.dataset.name || elm.$.className;
                }
            ).filter(Boolean);

            this.PARENTS_TAG_LIST = Array.prototype.map.call(
                this.ElementPath.elements,
                function(elm) {
                    return elm.$.tagName;
                }
            ).filter(Boolean);

            this.NODE_FULL_SELECT =
                this.SEL_TEXT_CLONE === this.NODE_CLONE_TEXT &&
                this.NODE_CLONE_TEXT !== '' ? true : false;

            this.DEL_NODE = this.NODE_TAG === 'DEL' || (this.NODE.$ && this.NODE.$.closest && this.NODE.$.closest('del'));

            if (Options.lock) {
                this._SNAPSHOT({
                    lock: true
                });
            }

            this.BEFORE_AFTER_EXE_CMD = {
                classlist: this.NODE ? this.NODE.$.classList : null,
                tag: this.NODE ? this.NODE_TAG : null,
                dom_node: this.NODE ? this.NODE.$ : null,
                dom_parent: this.NODE ? this.PARENT.$ : null,
                dom_parent_tag: this.NODE ? this.PARENT_TAG : null
            };

            this.cursor.FIRE(this);

            this.paraLock = {
                canShowContexMenu: true
            };
            if (global.paraLock && global.paraLock._isEnabled && typeof global.paraLock._handleContextEvent === "function") {

                this.paraLock = global.paraLock;
                this.paraLock.canShowContexMenu = global.paraLock._handleContextEvent(b, a, d);
            }

            var result = this;
            this._cache.lastNodeId = nodeId;
            this._cache.lastParentId = parentId;
            this._cache.lastRangeKey = rangeKey;
            this._cache.lastResult = result;
            console.log("===IMPACT_SELECTION getInfo END===");
            return result;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getInfo', err.message);
        }
    };

    ImpactSelection.prototype.CURSOR_AFTER_BEFORE_CHARACTER = function(range, Options) {
        try {
            range = range || (this.RG_INFO && this.RG_INFO.RANGE);
            if (!range) return {
                prefix: "",
                suffix: ""
            };

            Options = Options || {};
            this.RG_INFO = this.RG_INFO || {};

            // Reset
            this.RG_INFO.insert_prefix = "";
            this.RG_INFO.insert_suffix = "";

            var prev = range.getPreviousNode && range.getPreviousNode();
            var next = range.getNextNode && range.getNextNode();

            var prevTxt = (prev && typeof prev.getText === "function") ? prev.getText() : "";
            var nextTxt = (next && typeof next.getText === "function") ? next.getText() : "";

            this.RG_INFO.prev_character = prevTxt ? prevTxt.slice(-1) : null;
            this.RG_INFO.next_character = nextTxt ? nextTxt.charAt(0) : null;

            var hasPrevChar = this.RG_INFO.prev_character && !/\s/.test(this.RG_INFO.prev_character);
            var hasNextChar = this.RG_INFO.next_character && !/\s/.test(this.RG_INFO.next_character);

            // Priority: block boundaries first
            if (this.ISEndOfBlock || hasPrevChar) {
                this.RG_INFO.insert_prefix = " ";
            } else if (this.ISstartOfBlock || hasNextChar) {
                this.RG_INFO.insert_suffix = " ";
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("CHECK_CURSOR_AFTER_BEFORE", err.message);
        }

        return {
            prefix: this.RG_INFO.insert_prefix || "",
            suffix: this.RG_INFO.insert_suffix || ""
        };
    };


    ImpactSelection.prototype.applyCursor = function(elm, editor, option = {}) {

        editor = editor || global.GlobalEditor;

        elm = (typeof elm === "string" || option.elm_id ? editor.document.getById(elm) : elm) || null;

        if (!elm) return;
        // Clear any existing selection
        var selection = global.GlobalEditor.getSelection();
        selection.removeAllRanges();

        // Create a new range at the desired position
        var range = global.GlobalEditor.createRange();
        range.setEndAt(elm, CKEDITOR.POSITION_BEFORE_END);

        // Apply the new selection
        selection.selectRanges([range]);

        this.getInfo(editor, {});
    };

    ImpactSelection.prototype.setCursor = function(editor, Option) {
        Option = Option || {};
        try {
            this._SNAPSHOT({
                lock: true,
                save: Option.save ? true : false
            });

            editor = editor || global.GlobalEditor;

            this.getInfo(editor, {
                current: true
            });

            var temp_id = Option.set_id ?
                Option.set_id :
                (this.LAST_CURSOR.NODE_ID ?
                    this.LAST_CURSOR.NODE_ID :
                    (this.CURRENT_CURSOR.NODE_ID ? this.CURRENT_CURSOR.NODE_ID : null));

            var start_elm = global.GlobalEditor.getSelection().getStartElement();

            if (start_elm !== null && this.LAST_CURSOR.NODE_ID !== this.CURRENT_CURSOR.NODE_ID) {
                if (temp_id) {
                    var find_elm = Option.set_id ?
                        editor.document.findOne('[' + Option.find_attr + '="' + temp_id + '"]') :
                        editor.document.getById(temp_id);

                    if (!find_elm) {
                        this._SNAPSHOT({
                            unlock: true
                        });
                        return;
                    }

                    find_elm.scrollIntoView(true);
                    this.applyCursor(find_elm, editor, Option);

                } else {
                    console.log('setCursor error ==>' + new Date().getTime().toString());
                    console.warn('setCursor error');

                    if (this.LoopCountMax > this.LoopCount) {
                        var self = this;
                        setTimeout(function() {
                            self.setCursor(editor);
                        }, 1000);
                        this.LoopCount++;
                    }
                }
            } else {
                console.log('setCursor error ==>');
            }

            this._SNAPSHOT({
                unlock: true
            });
            editor.focus();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('setCursor', err.message);
        }
    };

    ImpactSelection.prototype.Ignore_Comment = function() {
        try {
            var RESTRICT_CLASS = ["graphic", 'inline-graphic', "xref", "ext-link", "ice-del", "email"];
            var IM = this;
            if (IM.DEL_NODE) {
                var parent = IM.DEL_NODE.getParent ? IM.DEL_NODE.getParent() : IM.DEL_NODE.parentElement;
                var isRef = false;
                if (parent) {
                    if ((parent.hasClass && parent.hasClass("ref")) ||
                        (parent.classList && parent.classList.contains("ref"))) {
                        isRef = true;
                    }
                }
                if (isRef) {
                    return false;
                }
            }


            var ret_bool = (IM.DEL_NODE || IM.IsMath || (IM.PARENTS_CLAS_LIST && IM.PARENTS_CLAS_LIST.some(function(i) {
                return RESTRICT_CLASS.indexOf(i) !== -1;
            }))) ? true : false;
            return ret_bool;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Ignore_Comment', err.message);
        }
    };


    // expose singleton
    global.IMPACT_SELECTION = new ImpactSelection(CONFIG, UTILS, global.EDITOR_CURSOR);
    bindGlobalErrorLogger(global);
    wrapInstanceMethods(global.IMPACT_SELECTION, global.ErrorLogTrace);



})(window);

(function(global) {
    'use strict';

    var CONFIG = global.EDITOR_CONFIG;
    var UTILS = global.EDITOR_UTILS;

    /**
     * ============================================================
     *  KeyEventHandler (Optimized ES5 Version)
     * ============================================================
     */
    function KeyEventHandler(config, utils, selection, cursor) {
        this.config = config;
        this.utils = utils;
        this.selection = selection;
        this.cursor = cursor;

        // Key codes
        this.CUT_KEY_CODE = config.keyConfig.CUT;
        this.COPY_KEY_CODE = config.keyConfig.COPY;
        this.PASTE_KEY_CODE = config.keyConfig.PASTE;
        this.NSNB = '&nbsp;';

        // Basic state
        this.CUR_ERROR = null;
        this.BKSP_SPACE_DEL_CODE = config.keyConfig.BKSP_SPACE_DEL.slice(0);
        this.ENTER_CODE = config.keyConfig.ENTER.slice(0);

        // Restriction classes
        this.BEG_PARA_BKSPACE_RESTRICT_CLASS = config.restrictionClasses.BEG_PARA_BKSPACE.slice(0);
        this.ALERT_MESSAGE = config.alertMessages.slice(0);

        this.RESTRICT_CLASS = config.restrictMap;
        this.DIS_ALLOWED_KEYS = config.disallowedKeys;
        this.ALLOWED_KEYS = config.allowedKeys;
        this.SHORT_CUT_KEYS_COLLECTION = config.shortcutKeys;
        this.FORMAT_KEYS_COLLECTION = config.formatKeys;

        this.FULL_FORMAT_RESTRICT_CLASS = config.restrictionClasses.FULL_FORMAT.slice(0);
        this.TITLE_ARR = config.restrictionClasses.TITLE_ARR.slice(0);
        this.DEFAULT_KEY_RESTRICT_CLASS = config.restrictionClasses.DEFAULT_KEY.slice(0);
        this.FORMAT_RESTRICT_CLASS = config.restrictionClasses.FORMAT.slice(0);
        this.TEMPLATE_RESTRICT_CLASS = config.restrictionClasses.TEMPLATE.slice(0);
        this.LINK_FORMULA_IMG_CLASS = config.restrictionClasses.LINK_FORMULA_IMG.slice(0);

        this.TAG_BY_CLASS = config.tagConfig;

        // Internal stacks
        this.KEY_STROKE_STOCK = [];
        this.RESTRICT_CLIENT_STACK = [];
        this.DO_NOT_SHOW_AGAIN = false;

        this.LAST_KEY_EVT = false;

        // Precomputed O(1) lookup sets
        this._set_FULL_FORMAT = this._makeSet(this.FULL_FORMAT_RESTRICT_CLASS);
        this._set_DEFAULT_KEY = this._makeSet(this.DEFAULT_KEY_RESTRICT_CLASS);
        this._set_FORMAT_RESTRICT = this._makeSet(this.FORMAT_RESTRICT_CLASS);
        this._set_TEMPLATE_RESTRICT = this._makeSet(this.TEMPLATE_RESTRICT_CLASS);
        this._set_LINK_FORMULA_IMG = this._makeSet(this.LINK_FORMULA_IMG_CLASS);
        this._set_ALLOWED_KEYS = this._makeValueSet(this.ALLOWED_KEYS);
        this._set_DISALLOWED_KEYS = this._makeValueSet(this.DIS_ALLOWED_KEYS);

        // Micro-cache for checkCondition
        // Stores result AND the alert that fired so cache hits can replay it
        this._condCache = {
            key: '',
            result: null,
            // { kind:'toaster'|'dialog', msg, opts } | null
            alert: null
        };

        // Staging area – sub-checks write here instead of firing directly;
        // _cacheReturn() fires + persists it so cache-hits can replay.
        this._pendingAlert = null;
        this.LAST_EPATH = '';
        this.IsAlphaNumeric = false;
        this.IS_SAME_PATH = false;
        this.SKIP_RESTRICTION = false;
        var placeHolderModule = global.placeHolderModule || {};
        var fallbackTemplatePlaceholders = ['GivenName SurName', 'SurName GivenName', 'keyword', 'Degree', 'GivenName', 'SurName', 'Term', 'Definition', "Type_Here"];
        var fallbackKwdRestrictClasses = ['kwd', 'term', 'def', 'definition'];

        this.templatePlaceholders = (placeHolderModule.Template_List && placeHolderModule.Template_List.length ? placeHolderModule.Template_List : fallbackTemplatePlaceholders).slice(0);

        this.kwdRestrictClasses = (placeHolderModule.RESTRICT_CLASS && placeHolderModule.RESTRICT_CLASS.length ? placeHolderModule.RESTRICT_CLASS : fallbackKwdRestrictClasses).slice(0);

        this.resetKeyBind();
    }

    /**
     * ============================================================
     *  Helper: Convert array → O(1) lookup set
     * ============================================================
     */
    KeyEventHandler.prototype._makeSet = function(arr) {
        var o = {},
            i;
        if (!arr) return o;
        for (i = 0; i < arr.length; i++) {
            o[arr[i]] = true;
        }
        return o;
    };

    /**
     * ============================================================
     *  Helper: Convert object values → O(1) lookup set
     * ============================================================
     */
    KeyEventHandler.prototype._makeValueSet = function(obj) {
        var o = {},
            k;
        if (!obj) return o;
        for (k in obj) {
            if (obj.hasOwnProperty(k)) {
                o[obj[k]] = true;
            }
        }
        return o;
    };

    KeyEventHandler.prototype._getTemplatePlaceholders = function() {
        var placeHolderModule = global.placeHolderModule || {};
        if (placeHolderModule.Template_List && placeHolderModule.Template_List.length) {
            return placeHolderModule.Template_List;
        }
        return this.templatePlaceholders || [];
    };

    KeyEventHandler.prototype._getTemplateContext = function(IMS) {
        IMS = IMS || global.IMPACT_SELECTION || {};

        var templatePlaceholders = this._getTemplatePlaceholders();


        var textMatch = this.hasAnyClass(templatePlaceholders, {
            check_arr: [IMS.NODE_CLONE_TEXT, IMS.PARENT_CLONE_TEXT],
            case_insensitive: true,
            return_match: true
        });

        debug.log("textMatch", textMatch);
        var templates = {};
        if (typeof placeHolderModule !== "undefined") {
            if (!placeHolderModule.initiated) {
                placeHolderModule.Init();
            }
            templates = placeHolderModule.templates;
        }

        var classes = [].concat(IMS.PARENTS_CLAS_LIST || []);
        var nodeClass = IMS.NODE_CLAS ? [IMS.NODE_CLAS] : [];
        var parentClass = IMS.PARENT_CLAS ? [IMS.PARENT_CLAS] : [];
        var classList = classes.concat(nodeClass, parentClass);
        var className = '';
        var templateItem = '';

        for (var i = 0; i < classList.length; i++) {
            if (this.TEMPLATE_RESTRICT_CLASS.indexOf(classList[i]) === -1) continue;
            className = classList[i];
            templateItem = templates[className] || '';
            break;
        }

        return {
            textMatch: textMatch || '',
            className: className || '',
            templateItem: templateItem || ''
        };
    };

    /**
     * ============================================================
     *  Reset all key state flags
     * ============================================================
     */
    KeyEventHandler.prototype.resetKeyBind = function() {
        try {
            this.IsCtrl = false;
            this.IsShift = false;
            this.IsAlt = false;
            this.IsMeta = false;

            this.IsTitleGroup = false;
            this.IsAuthorNotes = false;
            this.IsContribGroup = false;
            this.IsContrib = false;
            this.IsMultiPara = false;
            this.IsMultiElm = false;
            this.IsRef = false;
            this.IsMath = false;
            this.IsComment = false;
            this.IsFullNode = false;
            this.IsFullFormat = false;
            this.IsRestrict = false;
            this.IsFormat_Range = false;
            this.IsLastChar = false;
            this.IsTemplateWord = false;
            this.TemplateWordMatch = '';
            this.TemplateTextMatch = '';
            this.TemplateClassMatch = '';
            this.TemplateItemMatch = '';

            this.SELECT = null;
            this.SEL_NODE = null;
            this.SEL_PARENT = null;
            this.KEY_CODE = null;
            this.KEY_NAME = null;
            this.KEY_CHAR_CODE = null;

            this.RANGE_INFO = {};
            this.IsCut = false;
            this.IsCopy = false;
            this.IsPaste = false;
            this.IS_MOVEMENT_STROKE = false;
            this.IS_LAST_MOVEMENT = false;
            this.IS_LAST_EVT = null;

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('resetKeyBind', err.message);
        }
    };

    KeyEventHandler.prototype.IS_DIALOG_OPEN = function(Options, _Id) {
        try {
            // Normalize options
            Options = Options || {
                get: false,
                noAlert: false
            };

            // ------------------------------------------------------------
            // 1. Detect CKEditor dialogs (visible only)
            // ------------------------------------------------------------
            var ckDialog = document.querySelector(
                'div.cke_editor_maineditor_dialog:not([style*="display:none"]):not([style*="display: none"])'
            );

            // ------------------------------------------------------------
            // 2. Detect custom dialogs (excluding tooltips, cite popups, etc.)
            // ------------------------------------------------------------
            var openDialogs = $('#ModelDialogAppend')
                .children()
                .not('.ds-none, .hide, .modal, .citePopup, .iToolTip');

            var hasCustomDialog = openDialogs.length > 0;

            // If no dialogs → allow
            if (!ckDialog && !hasCustomDialog) {
                return false;
            }

            // ------------------------------------------------------------
            // 3. Determine active dialog
            // ------------------------------------------------------------
            var activeDialog = ckDialog || openDialogs[0];
            var activeDialogId = (activeDialog && activeDialog.id) ? activeDialog.id : "";

            // Whitelisted dialogs that can coexist
            var allowedDialogs = ["LinkShareDialog", "LinkSessionRequestDialog", "SupplementaryMaterialDialog", "qualityCheckerDialog"];
            var isAllowed = allowedDialogs.indexOf(activeDialogId) !== -1 || activeDialog.hasAttribute("data-el-docked");

            // ------------------------------------------------------------
            // 4. Show alert if needed
            // ------------------------------------------------------------
            if (!Options.noAlert) {
                if (activeDialogId !== _Id && !isAllowed) {
                    TOASTER_ALERT("Dialog_Opened", {
                        type: "warning"
                    });
                }
            }

            // ------------------------------------------------------------
            // 5. Return dialog element or boolean
            // ------------------------------------------------------------
            return Options.get ? activeDialog : true;

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("IS_DIALOG_OPEN", err.message);
            return false;
        }
    };

    /**
     * ============================================================
     *  Safe Shortcut Dialog Handler
     * ============================================================
     */


    KeyEventHandler.prototype.CHECK_SHORTCUT_DIALOG = function() {
        try {
            if (this.IS_SHORTCUT_FIRE) {
                var eventName = this.SHORT_CUT_KEYS_COLLECTION[this.KEY_STROKE];

                if (eventName) {
                    if (typeof eventName === "object" && typeof eventName.show === "function") {
                        eventName.show(eventName);
                    } else {
                        global.GlobalEditor.execCommand(eventName);
                    }
                }
                return false;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CHECK_SHORTCUT_DIALOG', err.message);
        }
    };
    // ? 23_FEB_2026 - IF USER CLICKED OTHER REF and FLOATS CITATIONS - NED IGNORE 
    KeyEventHandler.prototype.isValidRTFXref = function(node) {
        try {
            if (!node || typeof node.getAttribute !== "function") return false;

            var cls = node.getAttribute("class") || "";
            var refType = node.getAttribute("ref-type") || "";

            return (/(^|\s)xref(\s|$)/i.test(cls) && /bibr|table|fig/i.test(refType) && !node.hasAttribute("data-remove"));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('isValidRTFXref', err.message);
            return false;
        }
    };
    KeyEventHandler.prototype.hasRestrictedClass = function(nodeClass, restrictClasses) {
        var clsList = (nodeClass || "").replace(/\bactive\b/g, "").trim().split(/\s+/);

        for (var i = 0; i < clsList.length; i++) {
            if (restrictClasses.indexOf(clsList[i]) !== -1) {
                return true;
            }
        }
        return false;
    };
    window.hasRestrictedClass = KeyEventHandler.prototype.hasRestrictedClass;
    KeyEventHandler.prototype.getNode = function(editor, IMS, t, Options) {
        Options = Options || {};
        IMS = IMS || global.IMPACT_SELECTION;
        editor = editor || global.GlobalEditor;
        t = this;

        try {
            debug.log("getNode begin");

            var selection = editor.getSelection();
            if (!selection) return;

            var ranges = selection.getRanges();
            if (!ranges || !ranges.length) return;

            var range = ranges[0];
            var el = editor.document.createElement('div');
            el.append(range.cloneContents());

            // Build RANGE_INFO
            this.RANGE_INFO = {
                EL: el,
                RANGE: range,
                Range_clone: range.cloneContents(),
                childCount: el.$.childElementCount,
                childNodeCount: el.getChildCount(),
                divCount: el.find('div').count(),
                spanCount: el.find('span').count(),
                ParaCount: el.find('.p').count(),
                aLinkCount: el.find('a,.href').count(),
                eLinkCount: el.find('.uri,.email,.ext-link').count(),
                iLinkCount: el.find('.xRefGroup').count(),
                ChildrenClass: UTILS.getChildrenClasses(el.$, {
                    checkEmpty: true,
                    unique: true
                }) || []
            };

            var rangeInfo = this.RANGE_INFO;
            // =========================
            // BEFORE STATE
            // =========================
            const beforeKeys = Object.keys(IMS.RG_INFO);

            // Tracking buckets
            const addedKeys = [];
            const updatedKeys = [];
            const unchangedKeys = [];

            // =========================
            // APPLY UPDATE
            // =========================
            Object.keys(rangeInfo).forEach(function(key) {
                if (!Object.prototype.hasOwnProperty.call(IMS.RG_INFO, key)) {
                    IMS.RG_INFO[key] = rangeInfo[key];
                    addedKeys.push(key);
                } else if (IMS.RG_INFO[key] !== rangeInfo[key]) {
                    IMS.RG_INFO[key] = rangeInfo[key];
                    updatedKeys.push(key);
                } else {
                    unchangedKeys.push(key);
                }
            });

            // =========================
            // AFTER STATE
            // =========================
            const afterKeys = Object.keys(IMS.RG_INFO);
            // console.table({before: beforeKeys,after: afterKeys,added: addedKeys,updated: updatedKeys,unchanged: unchangedKeys});           

            // Bookmarks
            t.bk2 = IMS.bk2 = selection.createBookmarks2();
            t.SELECT = IMS.CUR_SEL = selection;

            // Start element
            t.SEL_NODE = IMS.NODE = (IMPACT.USER_ENV_INFO.isSafari && Options.TARGET) ?
                Options.TARGET :
                selection.getStartElement();

            if (IMS.NODE && IMS.NODE.$ && typeof IMS.NODE.$.normalize === "function") {
                IMS.NODE.$.normalize();
            }

            // Helper to update node info
            var updateNode = function(ths) {
                ths.SEL_NODE_IDX = IMS.NODE_IDX =
                    Array.prototype.indexOf.call(ths.SEL_NODE.$.parentElement.childNodes, ths.SEL_NODE.$);

                ths.SEL_TEXT = IMS.SEL_TEXT =
                    (typeof ths.SELECT.getSelectedText === "function") ?
                    ths.SELECT.getSelectedText() :
                    '';

                ths.SEL_PARENT = IMS.PARENT = ths.SEL_NODE ? ths.SEL_NODE.getParent() : null;
                ths.SEL_G_PARENT = IMS.G_PARENT = ths.SEL_PARENT ? ths.SEL_PARENT.getParent() : null;
            };

            updateNode(this);

            // If selection equals parent text → shift node upward
            if (t.SEL_NODE && IMS.PARENT &&
                (t.SEL_TEXT === IMS.PARENT.getText() || t.SEL_NODE.hasAttribute("data-high"))) {

                t.SEL_NODE = IMS.NODE = t.SEL_NODE.getParent();
                updateNode(this);
            }

            // Title detection
            t.IsTitleContains = IMS.IsTitleContains = !!t.RANGE_INFO.ChildrenClass.length &&
                t.RANGE_INFO.ChildrenClass.some(function(cls) {
                    return t.TITLE_ARR.indexOf(cls) !== -1;
                });

            var SEL_CK = t.SEL_NODE;
            var SEL_DOM = SEL_CK ? SEL_CK.$ : null;
            var SEL_CLASS = SEL_DOM ? SEL_DOM.className : "";

            // Link detection
            t.IsLink = IMS.IsLink =
                SEL_CK && typeof hyperLinkDialog !== "undefined" ?
                (SEL_DOM.closest(hyperLinkDialog.selector) ||
                    (hyperLinkDialog.CLASS_SELECTOR.indexOf(SEL_CLASS) !== -1)) :
                false;

            // Contrib detection
            t.IsContrib = IMS.IsContrib = SEL_CK ? SEL_DOM.closest('.contrib') : false;

            // Restrict client
            t.RESTRICT_CLIENT_ELM = IMS.RESTRICT_CLIENT_ELM =
                SEL_CK ? SEL_DOM.closest(USER_INFO.SELECTOR_RESTRICT) : null;

            t.RESTRICT_CLIENT_CLAS = IMS.RESTRICT_CLIENT_CLAS =
                t.RESTRICT_CLIENT_ELM ? t.RESTRICT_CLIENT_ELM.className : null;

            t.RESTRICT_CLIENT_IS = !!t.RESTRICT_CLIENT_ELM;

            // List / Ref / Math detection
            t.IsList = IMS.IsList = SEL_CK ? SEL_DOM.closest('[list-type]') : false;
            t.IsRef = IMS.IsRef = SEL_CK ? SEL_DOM.closest('.ref') : false;
            t.IsRefGroup = IMS.IsRefGroup = SEL_CK ? !!SEL_DOM.closest('.ref-list') : false;

            t.IsMath = IMS.IsMath = SEL_CK ?
                (SEL_DOM.closest('[math-type]') ||
                    ($(t.RANGE_INFO.Range_clone.$).find('[math-type]').length > 0)) :
                false;

            // Format range
            t.IsFormat_Range =
                IMS.NODE_TAG && INLINE_FORMAT_TAGS.indexOf(IMS.NODE_TAG.toLowerCase()) !== -1;

            // Xref detection
            t.IsXref = IMS.IsXref =
                (t.RANGE_INFO.EL.find(".xref").count() > 0 ||
                    (!!SEL_CK && (SEL_CLASS === "xref" || (!!SEL_DOM.closest('a')))));

            // Comment detection
            t.IsComment = IMS.IsComment =
                SEL_CK ? (SEL_DOM.hasAttribute('data-status') ||
                    SEL_DOM.closest('[data-class="ckcommentsfull"]')) : false;

            // Multi paragraph
            t.IsMultiPara = IMS.IsMultiPara =
                t.RANGE_INFO.ParaCount > 1 ||
                t.RANGE_INFO.divCount > 1 ||
                (t.IsTitleContains &&
                    (t.RANGE_INFO.ParaCount > 0 || t.RANGE_INFO.divCount > 0));

            // Multi element
            t.IsMultiElm = IMS.IsMultiElm =
                t.RANGE_INFO.spanCount > 1 ||
                t.RANGE_INFO.divCount > 1 ||
                t.RANGE_INFO.childCount > 1;

            // Full node
            t.IsFullNode = IMS.NODE_FULL_SELECT ? true : false;

            // Subject detection
            t.IsSubject = IMS.IsSubject = SEL_CK ? SEL_DOM.closest('.subject') : false;

            // Keyword restrict
            t.IsKwdRestrict = (t.IsFullNode && t.hasRestrictedClass(IMS.NODE_CLAS, t.kwdRestrictClasses)) ? true : false;

            // Full table
            t.IsFullTable = t.RANGE_INFO && t.RANGE_INFO.EL.$.querySelectorAll('thead,tbody,table').length > 0;

            // Multi cell
            t.IsTableMultiCell = t.RANGE_INFO && t.RANGE_INFO.EL.$.querySelectorAll('td,tr,th').length > 1;

            // Last char
            t.IsLastChar = false;

            // Email in corresp
            t.isCorrespEmail = IMS.NODE_CLAS === "email" && IMS.PARENTS_CLAS_LIST.toLocaleString().match('corresp') !== null;

            // Format keys
            t.FORMAT_KEY = Object.keys(
                t.FORMAT_KEYS_COLLECTION[IMPACT.USER_ENV_INFO.isFirefox ? 'firefox' : 'chrome']
            ).map(function(k) {
                return t.FORMAT_KEYS_COLLECTION[
                    IMPACT.USER_ENV_INFO.isFirefox ? 'firefox' : 'chrome'
                ][k];
            });

            // Link node detection
            t.IsLinkNode = IMS.IsLinkNode =
                IMS.PARENTS_CLAS_LIST.some(function(cls) {
                    return t.LINK_FORMULA_IMG_CLASS.indexOf(cls) !== -1 || !!t.IsXref;
                });



            // Xref nodes
            t.LINK_NODE_ALL = IMS.LINK_NODE_ALL =
                (/xref/gi.test(IMS.NODE.getAttribute('class')) ?
                    IMS.NODE :
                    IMS.NODE.getAscendant(function(el) {
                        return el &&
                            typeof el.getAttribute === "function" &&
                            el.getAttribute("class") === 'xref' &&
                            el.hasAttribute("ref-type") &&
                            !el.hasAttribute("data-remove");
                    }));



            t.LINK_NODE_RTF = IMS.LINK_NODE_RTF =
                t.isValidRTFXref(IMS.NODE) ?
                IMS.NODE :
                IMS.NODE.getAscendant(t.isValidRTFXref);

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getNode', err.message);
        }
    };
    KeyEventHandler.prototype.IgnoreEvent = function(e, codeKey, Option, self) {
        Option = Option || {};
        self = this;

        try {
            var IMS = global.IMPACT_SELECTION;

            // Allowed movement keys
            if ((this._set_ALLOWED_KEYS[this.KEY_CODE] || this._set_ALLOWED_KEYS[codeKey]) && !this.IsAlt) {
                return true;
            }

            // Beginning of paragraph restriction
            if (this.BKSP_SPACE_DEL_CODE[0] === codeKey &&
                IMS.bk2 && IMS.bk2[0] &&
                IMS.bk2[0].startOffset === 0 &&
                this.SEL_NODE_IDX === 0 &&
                UTILS.hasDataName(this.SEL_NODE, this.BEG_PARA_BKSPACE_RESTRICT_CLASS)) {
                console.log('START OF PARAGRAPH');
            }

            // Disallowed keys
            var isDisallowedKey =
                this._set_DISALLOWED_KEYS[this.KEY_CODE] ||
                ((this.KEY_CODE === 16) || (this.KEY_CODE === 61)) && this.IsCtrl && IMPACT.USER_ENV_INFO.isFirefox ||
                ((this.BKSP_SPACE_DEL_CODE.indexOf(codeKey) !== -1 ||
                    this.ENTER_CODE.indexOf(codeKey) !== -1) && !this.IsCtrl);

            if (isDisallowedKey) {
                var error_code;

                if (Option.alert_code) {
                    error_code = Option.alert_code;
                } else if (this.RESTRICT_CLIENT_IS) {
                    error_code = 3;
                } else if (this.IsMath || this.IsComment) {
                    error_code = this.IsComment ? 4 : 2;
                } else if (this.IsMultiPara) {
                    error_code = 0;
                } else if (this.IsFullFormat) {
                    error_code = 6;
                } else if (this.IsLastChar) {
                    error_code = 7;
                } else if (this.IsLink && !this.isCorrespEmail) {
                    error_code = 9;
                } else {
                    error_code = 1;
                }

                if (this.IsRef) error_code = 8;

                // Stage – will be dispatched (and cached) by _cacheReturn()
                this._stageAlert('toaster', this.ALERT_MESSAGE[error_code], {
                    type: 'warning'
                });
            }

            return UTILS.cancelEvent(e);

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('IgnoreEvent', err.message);
        }
    };
    KeyEventHandler.prototype.CHECK_SEL_TEXT = function(KEY, VAL) {
        var SEL_TXT_1 = $($(this.SEL_NODE.$).parents(KEY).find(VAL)[0]).text().replace(this.NSNB, '').replace(/\s+/g, " ").replace(/\s+/g, " ").replace(/&#x00A0;/g, '');
        var SEL_TXT_2 = $($(this.SEL_NODE.$).parents(VAL)[0]).text().replace(this.NSNB, '').replace(/\s+/g, " ").replace(/&#x00A0;/g, '');
        var SEL_TXT_3 = this.SEL_NODE.getAttribute('class') && ('.' + this.SEL_NODE.getAttribute('class')).includes(VAL) ? $($(this.SEL_NODE.$)).text().replace(this.NSNB, '').replace(/\s+/g, " ").replace(/&#x00A0;/g, '') : '';
        return [SEL_TXT_1, SEL_TXT_2, SEL_TXT_3].includes(this.SEL_TEXT.replace('\r', '').replace('\n', '').replace(/\u00A0/g, " "));
    };
    KeyEventHandler.prototype.RESTRICT_CUT = function(e, IMS) {
        IMS = global.IMPACT_SELECTION;
        this.CUR_ERROR = "";
        this.IsRestrict = false;

        try {
            var info = this.RANGE_INFO || {};
            var ChildrenClass = info.ChildrenClass || [];
            var divCount = info.divCount || 0;
            var childCount = info.childCount || 0;
            var eLinkCount = info.eLinkCount || 0;
            var aLinkCount = info.aLinkCount || 0;

            var parentsClassListStr = (IMS.PARENTS_CLAS_LIST || []).toLocaleString();
            var isTableFoot = parentsClassListStr.match('table-wrap-foot');
            var childrenStr = ChildrenClass.join(',');

            var isCaptionGraphicTitle =
                ChildrenClass.length > 0 &&
                ChildrenClass.every(function(i) {
                    return ['caption', 'graphic', 'title'].indexOf(i) !== -1;
                });

            var isParaWithTitle =
                ChildrenClass.length > 0 &&
                ChildrenClass.every(function(i) {
                    return ['p', 'title'].indexOf(i) !== -1;
                });

            var hasMultipleDivs = divCount > 1;

            // ? Restrict class checks
            var k;
            for (k in this.RESTRICT_CLASS) {
                if (!this.RESTRICT_CLASS.hasOwnProperty(k)) continue;
                if (this.IsRestrict) break;

                if ($(this.SEL_NODE.$).parents(k).length > 0) {
                    var selMatch = this.CHECK_SEL_TEXT(k, this.RESTRICT_CLASS[k]);

                    if (selMatch) {
                        this.IsRestrict = true;
                        this.CUR_ERROR = this.ALERT_MESSAGE[1];
                    } else if ((k === '.ref' || k === '.contrib') ||
                        (this.RESTRICT_CLIENT_IS && !isTableFoot) || this.IsLink) {

                        var multiSelect = childCount > 1 || this.RESTRICT_CLIENT_IS || eLinkCount >= 1 || this.IsLink;
                        this.IsRestrict = multiSelect;
                        this.CUR_ERROR = this.ALERT_MESSAGE[multiSelect ? 0 : 1];
                    } else if (this.RESTRICT_CLIENT_IS && !isTableFoot) {
                        this.IsRestrict = true;
                        this.CUR_ERROR = this.ALERT_MESSAGE[1];
                    }
                } else if (childrenStr.match(/xref|surname|given-names/) || aLinkCount > 0) {
                    var isLink = childrenStr.match(/xref/) || aLinkCount > 0;
                    this.CUR_ERROR = this.ALERT_MESSAGE[isLink ? 5 : 1];
                    this.IsRestrict = true;
                }
            }

            // Keyword group full selection
            var isInKwdGroup = IMS.RG_INFO &&
                IMS.RG_INFO.Range_clone &&
                $(IMS.NODE.$).closest('.kwd-group').length > 0;

            var isKwdGroupFull = isInKwdGroup &&
                $(IMS.RG_INFO.Range_clone.$).children().length ===
                $(IMS.NODE.$).closest('.kwd-group').children().length;

            if (!this.IsRestrict &&
                ((hasMultipleDivs && !isCaptionGraphicTitle) ||
                    this.IsTableMultiCell ||
                    isKwdGroupFull ||
                    (IMS.G_PARENT_CLAS === 'caption' && this.IsFullNode))) {

                this.IsRestrict = true;
                this.CUR_ERROR = this.ALERT_MESSAGE[1];
            }

            if (!this.IsRestrict && isParaWithTitle) {
                this.IsRestrict = true;
                this.CUR_ERROR = this.ALERT_MESSAGE[0];
            }

            IMS.NODE_FULL_SELECT =
                IMS.NODE_FULL_SELECT === false ?
                IMS.SEL_TEXT_CLONE === IMS.NODE_CLONE_TEXT :
                IMS.NODE_FULL_SELECT;

            if (this.IsRestrict ||
                (IMS.NODE_FULL_SELECT && this.hasAnyClass(this.FULL_FORMAT_RESTRICT_CLASS))) {

                if (/KeyEvent_XREFS/gi.test(this.CUR_ERROR)) {
                    this._stageAlert('dialog', this.CUR_ERROR, {
                        override: false
                    });
                } else {

                    this._stageAlert('toaster',
                        IMS.NODE_FULL_SELECT ? this.ALERT_MESSAGE[6] : this.CUR_ERROR, {
                            type: 'warning'
                        }
                    );
                }

                global.GlobalEditor.getSelection().removeAllRanges();
                return false;
            }

            // Adjust selection if needed
            if (this.SEL_TEXT === this.SEL_NODE.$.textContent && !IMS.NODE_FULL_SELECT) {
                var loop = 0;
                while (this.SEL_NODE &&
                    this.SEL_NODE.$ &&
                    this.SEL_NODE.$.parentElement &&
                    this.SEL_NODE.$.textContent === this.SEL_NODE.$.parentElement.textContent) {

                    this.SEL_NODE = this.SEL_NODE.getParent();
                    if (++loop > 10 || !this.SEL_NODE) break;
                }
            } else {
                return true;
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('RESTRICT_CUT', err.message);
        }
    };

    KeyEventHandler.prototype.checkCondition = function(event, codeKey, Options) {
        const IMS = global.IMPACT_SELECTION;
        Options = Options || {};
        console.time("checkCondition");

        try {
            // Optimization: If continuous alphanumeric typing in the same element path, allow directly
            if (this.SKIP_RESTRICTION) {
                // return true;
            }

            if (this._useCache(IMS, codeKey, Options)) {
                // alert already replayed inside _useCache
                return this._condCache.result;
            }

            IMS.getInfo(global.GlobalEditor, {
                event: event.$
            });
            this._updateTemplateWord(IMS);

            const checks = [{
                    name: "_checkFormattingRestrictions",
                    fn: () => this._checkFormattingRestrictions(event, codeKey, Options, IMS)
                },
                {
                    name: "_checkDeleteBackspaceRestrictions",
                    fn: () => this._checkDeleteBackspaceRestrictions(event, codeKey, IMS)
                },
                {
                    name: "_checkXrefRestrictions",
                    fn: () => this._checkXrefRestrictions(event, codeKey, IMS)
                },
                {
                    name: "_checkTemplateRestrictions",
                    fn: () => this._checkTemplateRestrictions(event, codeKey, IMS)
                },
                {
                    name: "_checkImageGraphicRestrictions",
                    fn: () => this._checkImageGraphicRestrictions(event, codeKey, IMS)
                },
                {
                    name: "_checkCutPasteRestrictions",
                    fn: () => this._checkCutPasteRestrictions(event, codeKey, IMS)
                },
                {
                    name: "_checkClientRestrictions",
                    fn: () => this._checkClientRestrictions(event, codeKey, IMS)
                }
            ];

            for (let i = 0; i < checks.length; i++) {
                const result = checks[i].fn();
                if (result === false) {
                    debug.log(`Check #${checks[i].name} result:`, result);
                    if (Options.fromToolBarBtn) return true;
                    // Immediate stop
                    else return this._cacheReturn(false);
                } else if (result === true) {
                    if (Options.fromToolBarBtn) {
                        return false;
                    } else return this._cacheReturn(true);
                }
            }
            // If all passed
            if (Options.fromToolBarBtn) return false;
            return this._cacheReturn(true);

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('checkCondition', err.message);
            if (Options.fromToolBarBtn) return false;
            return this._cacheReturn(true);
        } finally {
            console.timeEnd("checkCondition");
        }
    };

    KeyEventHandler.prototype._useCache = function(IMS, codeKey, Options) {
        var nodeInd = '';

        // If NODE_CLAS is "kwd", check for existing data-id
        if (IMS.NODE_CLAS === "kwd" && IMS.NODE) {
            var existingId = IMS.NODE.getAttribute("data-id");
            if (existingId) {
                nodeInd = existingId;
            } else {
                // Generate new kwd_XXXX id
                var newId = "kwd_" + Math.floor(Math.random() * 10000);
                IMS.NODE.setAttribute("data-id", newId);
                nodeInd = newId;
            }
        } else {
            // Fallback to NODE_ID if not kwd
            nodeInd = IMS.NODE_ID || '';
        }

        var keyParts = [
            this.KEY_CODE,
            codeKey,
            nodeInd || '',
            IMS.PARENT_ID || '',
            IMS.SEL_TEXT_CLONE || '',
            IMS.NODE_CLAS || '',
            IMS.PARENT_CLAS || '',
            IMS.G_PARENT_CLAS || ''
        ];

        var cacheKey = keyParts.join('|');

        // Cache hit optimization: only trust restrictive results (false)
        // Permissive results (true) must be re-validated as DOM state may have changed
        if (!Options.force &&
            this._condCache.key === cacheKey &&
            // ← Key change: only cache false results
            this._condCache.result === false) {

            // Safe to reuse: replay stored alert and return cached restriction
            if (this._condCache.alert) {
                this._dispatchAlert(this._condCache.alert);
            }
            // caller must return this._condCache.result (false)
            return true;
        }

        // Cache miss OR permissive result (true) – reset for fresh validation
        this._condCache.key = cacheKey;
        this._condCache.result = null;
        this._condCache.alert = null;
        this._pendingAlert = null;
        return false;
    };

    KeyEventHandler.prototype._cacheReturn = function(value) {
        // Fire any staged alert, persist it so cache-hits can replay it
        this._dispatchAlert();
        this._condCache.alert = this._pendingAlert;
        this._condCache.result = value;
        this._pendingAlert = null;
        return value;
    };

    /**
     * Stage an alert for deferred dispatch.
     * Sub-checks call this instead of calling TOASTER_ALERT / AlertNewDialog directly.
     * kind  : 'toaster' | 'dialog'
     * msg   : alert message key
     * opts  : { type, text, addText } for toaster  |  { title, confirmBtn, override, text } for dialog
     * First writer wins — preserves original serial check priority order.
     */
    KeyEventHandler.prototype._stageAlert = function(kind, msg, opts) {
        if (!this._pendingAlert) {
            this._pendingAlert = {
                kind: kind,
                msg: msg,
                opts: opts || {}
            };
        }
    };

    /**
     * Fire whatever alert is currently staged (or a supplied override).
     * Safe no-op when nothing is staged.
     * alertOverride : optional { kind, msg, opts } — used by cache-hit replay.
     */
    KeyEventHandler.prototype._dispatchAlert = function(alertOverride) {
        var a = alertOverride || this._pendingAlert;
        if (!a) return;

        try {
            if (a.kind === 'dialog') {
                AlertNewDialog.fire(
                    'warning',
                    a.opts.title || 'Warning',
                    a.msg,
                    a.opts.confirmBtn || 'OK',
                    '',
                    true, {
                        override: false,
                        text: a.opts.text || ''
                    }
                );
            } else {
                TOASTER_ALERT(a.msg, a.opts);
            }
        } catch (err) {
            console.warn('_dispatchAlert error:', err.message);
        }
    };

    KeyEventHandler.prototype._updateTemplateWord = function(IMS) {
        var templateContext = this._getTemplateContext(IMS);
        this.TemplateTextMatch = templateContext.textMatch;
        this.TemplateClassMatch = templateContext.className;
        this.TemplateItemMatch = templateContext.templateItem;
        this.TemplateWordMatch = this.TemplateTextMatch || this.TemplateItemMatch || this.TemplateClassMatch;
        this.IsTemplateWord = !!(this.TemplateTextMatch || this.TemplateClassMatch || this.TemplateItemMatch);
        return this.IsTemplateWord;
    };

    KeyEventHandler.prototype._checkFormattingRestrictions = function(event, codeKey, Options, IMS) {
        var self = this;
        var SEL = global.GlobalEditor.getSelection();
        let {
            NODE_CLONE_TEXT,
            PARENT_CLONE_TEXT,
            NODE_TAG,
            NODE_IDX,
            PARENT_TAG,
            SEL_TEXT_CLONE,
            PARENTS_CLAS_LIST,
            RG_INFO,
            PARENT,
            G_PARENT_TEXT,
            NODE
        } = IMS;

        var FULL_FORMAT_RESTRICT = this.hasAnyClass(this.FULL_FORMAT_RESTRICT_CLASS, {
            deep_check: true
        });
        var FORMAT_RESTRICT = this.hasAnyClass(this.FORMAT_RESTRICT_CLASS);
        var DEFAULT_RESTRICT = this.hasAnyClass(this.DEFAULT_KEY_RESTRICT_CLASS);


        // Keep full-format behavior aligned with legacy checkCondition.
        if (this.FORMAT_KEY.indexOf(codeKey) !== -1 || Options.fromToolBarBtn) {
            if (!this.IsFormat_Range) {
                this.IsFormat_Range = NODE_TAG && INLINE_FORMAT_TAGS.indexOf(NODE_TAG.toLowerCase()) !== -1;
            } else if (this.IsFormat_Range && NODE_IDX === 0 && this.IsFullNode) {
                this.IsFormat_Range = false;
            }
        }

        var tableCellLogic = ['TD', 'TR'].indexOf(NODE_TAG) === -1 && ['TD', 'TR'].indexOf(PARENT_TAG) === -1;
        var insertWithFullSelection = ((NODE_TAG !== "INSERT" && NODE_TAG !== "DEL") || PARENT_CLONE_TEXT === SEL_TEXT_CLONE);
        this.IsFullFormat = !!(this.IsFullNode && !this.IsFormat_Range && tableCellLogic && !!FULL_FORMAT_RESTRICT && insertWithFullSelection);

        let isKwd = this.hasAnyClass(PARENTS_CLAS_LIST, ['kwd']);

        const texts = [
            NODE_CLONE_TEXT,
            PARENT_CLONE_TEXT,
            PARENT.$.textContent,
            G_PARENT_TEXT
        ];

        const isMatch = SEL_TEXT_CLONE && texts.includes(SEL_TEXT_CLONE);

        // Keyword restrict
        this.IsKwdRestrict = this.IsKwdRestrict === false ? (isKwd && isMatch && !this.IsFormat_Range) : this.IsKwdRestrict;

        // Full node detection
        if (!this.IsFullNode) {

            this.IsFullNode = RG_INFO.ChildrenClass.some(function(cls) {
                return self.FULL_FORMAT_RESTRICT_CLASS && self.FULL_FORMAT_RESTRICT_CLASS.indexOf(cls) !== -1;
            });

            if (isMatch) {
                this.IsFullNode = true;
            }
        }

        if (this.FORMAT_KEY.indexOf(codeKey) !== -1 || Options.fromToolBarBtn) {
            // Allow if IsRef is inside article-title or FullNode
            var canAllowDirectFormating = false;
            var ignorePlainRef = false;

            if (this.IsRef) {

                var checkValues = ["article-title", "chapter-title"];

                var isMatched = checkValues.some(function(val) {
                    return this.GET_ASCENT_METHOD(NODE, {
                        _class: true,
                        _attr: "data-name",
                        _value: val
                    });
                }, this);

                if (isMatched) canAllowDirectFormating = true;

                let isPlainNewRef = this.IsRef.hasAttribute("data-new") && this.IsRef.hasAttribute("data-ins-type") && this.IsRef.getAttribute("data-ins-type") === "plain_text";

                ignorePlainRef = FORMAT_RESTRICT && isPlainNewRef;
            }

            // if(canAllowDirectFormating) return true;            

            var UNIQUE_FORMATTING_RESTRICT =
                DEFAULT_RESTRICT ||
                this.IsKwdRestrict ||
                this.IsTableMultiCell ||
                this.IsMultiPara ||
                // this.IsXref || // ? handled sep function _checkXrefRestrictions
                this.IsFullFormat ||
                FORMAT_RESTRICT ||
                this.RESTRICT_CLIENT_IS ||
                (FULL_FORMAT_RESTRICT && this.IsFullNode);

            if (Options.fromToolBarBtn) {
                return ignorePlainRef ? false : !UNIQUE_FORMATTING_RESTRICT;
            }

            return this.IgnoreForMatEvent(event, {
                Ignore: ignorePlainRef ? false : UNIQUE_FORMATTING_RESTRICT,
                Key: codeKey
            });
        }

        return null;
    };

    KeyEventHandler.prototype._checkClientRestrictions = function(event, codeKey, IMS) {
        if (!DOC_INFO.get('CLIENT')) {
            return true;
        }

        this.TC_SPAN_RESTRICT = this.hasAnyClass(IMS.PARENTS_CLAS_LIST, ['TrackChangesList', 'tc', 'pop_up']);

        var DEFAULT_RESTRICT = this.hasAnyClass(this.DEFAULT_KEY_RESTRICT_CLASS);
        var HISTORY_RESTRICT = this.hasAnyClass(['year', 'day', 'month', 'date', 'history']);

        if (DEFAULT_RESTRICT && HISTORY_RESTRICT && USER_INFO.IS_HISTORY_EDITABLE) {
            DEFAULT_RESTRICT = false;
        }

        var UNIQUE_KEY_RESTRICT =
            this.RESTRICT_CLIENT_IS ||
            DEFAULT_RESTRICT ||
            this.IsKwdRestrict ||
            this.IsTableMultiCell ||
            this.IsMultiPara ||
            // this.IsXref || // ? handled sep function _checkXrefRestrictions
            this.TC_SPAN_RESTRICT;

        if (UNIQUE_KEY_RESTRICT && !this.IsPaste && !this.IsCut) {
            return this.IgnoreEvent(event, codeKey);
        }

        return null;
    };

    KeyEventHandler.prototype._checkImageGraphicRestrictions = function(event, codeKey, IMS) {
        if (!this._set_ALLOWED_KEYS[codeKey] &&
            (/img|^a/gi.test(IMS.NODE_TAG) || /graphic|xref/gi.test(IMS.NODE_CLAS))) {

            this._stageAlert('toaster', this.ALERT_MESSAGE[1], {
                type: 'warning'
            });
            return false;
        }
        return null;
    };

    KeyEventHandler.prototype._checkCutPasteRestrictions = function(event, codeKey, IMS) {
        var SEL = global.GlobalEditor.getSelection();

        // CUT
        if (this.IsCut || codeKey === this.CUT_KEY_CODE) {
            this.IsCut = true;
            debug.log("stageAlert-Cut");

            if (this.IsFullNode || this.IsKwdRestrict) {
                if (this.TemplateClassMatch == "kwd") {
                    this._stageAlert('toaster', 'Last_char', {
                        type: 'warning',
                        addText: this.TemplateItemMatch
                    });
                    return false;
                }
            }
            return this.RESTRICT_CUT(event, codeKey);
        }

        // PASTE
        if (this.IsPaste && (this.RESTRICT_CLIENT_IS || this.IsFullNode || this.IsKwdRestrict)) {
            debug.log("stageAlert-Paste");
            this._stageAlert('toaster', 'Ignore_paste_full_text', {
                type: 'warning'
            });
            return false;
        }

        return null;
    };
    KeyEventHandler.prototype.IsCommentNode = function(node) {
        try {
            if (typeof node.getName == "function" && /span/gi.test(node.getName()) && /ckcommentsfull/gi.test(node.getAttribute('data-class'))) {
                return node;
            } else return false;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('IsCommentNode', err.message);
        }
    };
    KeyEventHandler.prototype._handleInsDelComplexLogic = function(event, codeKey, IMS) {
        var SEL = global.GlobalEditor.getSelection();
        var range = global.GlobalEditor.createRange();
        var {
            NODE,
            NODE_CLAS,
            PARENT,
            PARENT_CLAS
        } = IMS;
        var self = this;

        // Only applies to Backspace/Delete
        if (/46|8/.test(codeKey)) {
            // If current node is a command node → move cursor after it
            if (self.IsCommentNode(NODE)) {
                range.setStartAt(NODE, CKEDITOR.POSITION_AFTER_END);
                SEL.selectRanges([range]);
                IMS.getInfo();
                return false;
            }

            // INS/DEL handling
            if (/ice-ins/gi.test(NODE_CLAS) || /ice-ins/gi.test(PARENT_CLAS)) {

                // Remove CKEditor bookmarks inside INS/DEL
                $(PARENT.find("[data-cke-bookmark]").$).remove();

                // Create bookmarks
                var bk = SEL.createBookmarks(true);
                var bkNode = NODE.findOne("#" + bk[0].startNode);

                var swapNode = null;

                // Helper: find next/prev command node
                function findSiblingCommandNode(baseNode, direction, deepCheck) {
                    try {
                        var fn = direction === 'next' ? 'getNext' : 'getPrevious';
                        var sibling = baseNode[fn]();

                        if (!deepCheck) return sibling;

                        // Deep check: climb parent if needed
                        var parent = baseNode.getParent();
                        var gparent = parent && parent.getParent();
                        var parentSibling = parent ? parent[fn]() : null;

                        if (!parentSibling && gparent) parentSibling = gparent[fn]();

                        // If INS/DEL wrapper, check deeper siblings
                        if (/insert|del/i.test(parent.getName())) {
                            if (parentSibling && self.IsCommentNode(parentSibling)) return parentSibling;
                            if (sibling && self.IsCommentNode(sibling)) return sibling;

                            var nextSibling = sibling && sibling[fn]();
                            if (nextSibling && self.IsCommentNode(nextSibling)) return nextSibling;
                        }


                    } catch (err) {
                        console.warn(err.message);

                    }
                }

                // If bookmark exists, detect swap target
                if (bkNode) {
                    var nextCmd = findSiblingCommandNode(bkNode, 'next', true);
                    var prevCmd = findSiblingCommandNode(bkNode, 'prev', true);
                    swapNode = nextCmd || prevCmd;
                }

                // If current node is command node → reset cursor
                if (self.IsCommentNode(NODE)) {
                    range.setStartAt(NODE, CKEDITOR.POSITION_AFTER_END);
                    SEL.selectRanges([range]);
                    IMS.getInfo();
                    return false;
                }

                // Move ckcommentsfull spans across text boundaries
                function moveCkCommentsFull(span, direction) {
                    if (!span || !span.dataset.class || !span.dataset.class.includes('ckcommentsfull')) return;

                    var isNext = direction === 'next';
                    var target = isNext ? span.nextElementSibling : span.previousElementSibling;

                    // Skip bookmarks, INS/DEL, data-class nodes
                    while (target && (target.hasAttribute('data-cke-bookmark') || target.hasAttribute('data-class') || /insert|del/i.test(target.tagName))) {
                        target = isNext ? target.nextElementSibling : target.previousElementSibling;
                    }

                    // If no element sibling, try text nodes
                    if (!target) {
                        var adj = isNext ? span.nextSibling : span.previousSibling;

                        while (adj && (adj.nodeType !== 3 || adj.nodeValue.trim().length === 0 || (adj.nodeType === 1 && (adj.hasAttribute('data-cke-bookmark') || adj.hasAttribute('data-class') || /insert|del/i.test(adj.tagName))))) {
                            adj = isNext ? adj.nextSibling : adj.previousSibling;
                        }

                        if (adj && adj.nodeType === 3) {
                            splitAndInsertComment(adj, span);
                            return;
                        }
                    }

                    // If element sibling, find first text node
                    if (target && target.nodeType === 1) {
                        var textNode = findFirstTextNode(target);
                        if (textNode) splitAndInsertComment(textNode, span);
                    }
                }

                function findFirstTextNode(el) {
                    if (!el || el.nodeType !== 1) return null;

                    if (el.hasAttribute('data-cke-bookmark') || el.hasAttribute('data-class') || /insert|del/i.test(el.tagName)) {
                        return null;
                    }

                    for (var i = 0; i < el.childNodes.length; i++) {
                        var n = el.childNodes[i];
                        if (n.nodeType === 3 && n.nodeValue.trim().length > 0) return n;
                        if (n.nodeType === 1) {
                            var found = findFirstTextNode(n);
                            if (found) return found;
                        }
                    }
                    return null;
                }

                function splitAndInsertComment(textNode, span) {
                    var text = textNode.nodeValue;
                    var match = text.match(/^\s*\S+\s*/);

                    if (match) {
                        var splitPos = match[0].length;
                        var after = textNode.splitText(splitPos);
                        var clone = span.cloneNode(true);
                        textNode.parentNode.insertBefore(clone, after);
                        span.remove();
                    }
                }

                // Swap loop: move ckcommentsfull across INS/DEL boundaries
                var loop = 0;
                while (swapNode) {
                    moveCkCommentsFull(swapNode.$, 'next');

                    var nextCmd = findSiblingCommandNode(bkNode, 'next', true);
                    var prevCmd = findSiblingCommandNode(bkNode, 'prev', true);
                    swapNode = nextCmd || prevCmd;

                    loop++;
                    if (loop > 50) break;
                }

                // Remove bookmark node
                if (bkNode && typeof bkNode.remove === "function") {
                    bkNode.remove();
                }

                return null;
            }
        }
        return null;

    };
    KeyEventHandler.prototype._checkDeleteBackspaceRestrictions = function(event, codeKey, IMS) {
        // debug.log("_checkDeleteBackspaceRestrictions");

        var {
            NODE,
            PARENT,
            NODE_CLAS,
            PARENT_CLAS,
            PARENTS_CLAS_LIST,
            ISstartOfBlock,
            ISEndOfBlock
        } = IMS;
        var SEL = global.GlobalEditor.getSelection();
        var range = global.GlobalEditor.createRange();
        var self = this;

        // Only handle delete/backspace/enter
        if (this.BKSP_SPACE_DEL_CODE.indexOf(codeKey) !== -1 || this.ENTER_CODE.indexOf(codeKey) !== -1) {
            // Restrict pistart/delimt
            if (NODE_CLAS === "pistart" || NODE_CLAS === "delimt") {
                return false;
            }
            var del_sequence = ["ice-del", "kwd", "kwd-group"];
            var back_sequence = ['ice-del', 'p', 'body'];



            // Start/end of block logic
            if ((ISEndOfBlock || ISstartOfBlock) && !this.IsFullNode) {

                // Flatten class list
                var flatClasses = [];
                for (var i = 0; i < PARENTS_CLAS_LIST.length; i++) {
                    flatClasses = flatClasses.concat(PARENTS_CLAS_LIST[i].split(/\s+/));
                }


                // ============================
                // END OF BLOCK
                // ============================
                if (ISEndOfBlock) {

                    var canIgnore = commonMethods.includesInOrder(flatClasses, del_sequence);
                    if (canIgnore && codeKey === 46) return false;

                    if (codeKey === 46) {

                        // INS node delete
                        if (/ice-ins/gi.test(NODE_CLAS)) {
                            range.setStartAt(NODE, CKEDITOR.POSITION_AFTER_END);
                            SEL.selectRanges([range]);
                            IMS.getInfo();
                            return false;
                        }

                        // Empty paragraph delete
                        if ((NODE.getNext() == null || NODE.getPrevious() == null) &&
                            !IMS.IsList) {

                            if (NODE_CLAS === 'p' && NODE.$.textContent === '') {
                                NODE.remove();
                            }
                            return false;
                        }
                    }

                    // ENTER at end of block
                    if (this.ENTER_CODE.indexOf(codeKey) !== -1) {

                        // title → sec
                        if (NODE.hasNext() &&
                            NODE_CLAS === "title" &&
                            NODE.getNext() &&
                            NODE.getNext().hasClass("sec")) {

                            ParaGroup.insert_para(NODE, {
                                insert: "after"
                            });
                            return false;
                        }

                        // boxed-text title
                        if (["title", "label"].indexOf(NODE_CLAS) !== -1 &&
                            PARENTS_CLAS_LIST.indexOf("boxed-text") !== -1) {

                            var ascendant = NODE.getAscendant(function(el) {
                                return el.getAttribute("class") === 'boxed-text';
                            });

                            if (ascendant && ascendant.find("ul").count() === 0) {
                                ParaGroup.insert_para(NODE, {
                                    insert: "after"
                                });
                                return false;
                            }
                        }

                    } else {
                        // Backspace inside fn title
                        if (["title", "label"].indexOf(NODE_CLAS) !== -1 &&
                            PARENTS_CLAS_LIST.indexOf("fn") !== -1) {

                            this._stageAlert('toaster', 'Last_char', {
                                type: 'warning',
                                addText: ' notes section.'
                            });
                            return false;
                        }
                    }
                }

                // ============================
                // START OF BLOCK
                // ============================
                else if (ISstartOfBlock) {

                    var canIgnore2 = commonMethods.includesInOrder(flatClasses, back_sequence);
                    if (canIgnore2 && codeKey === 8) return false;

                    if (((NODE.getNext() == null || NODE.getPrevious() == null) ||
                            this.TEMPLATE_RESTRICT_CLASS.indexOf(NODE_CLAS) !== -1) &&
                        !IMS.IsList) {

                        if (codeKey === 8) {
                            if (NODE_CLAS === 'p' && NODE.$.textContent === '') {
                                NODE.remove();
                            }
                            return false;
                        }

                        if (codeKey === 46 && /alt-text/gi.test(NODE_CLAS)) {
                            return false;
                        }

                        if (["title", "label"].indexOf(NODE_CLAS) !== -1 &&
                            PARENTS_CLAS_LIST.indexOf("fn") !== -1) {

                            this._stageAlert('toaster', 'Last_char', {
                                type: 'warning',
                                addText: ' notes section.'
                            });
                            return false;
                        }
                    }

                    // sec title → insert before
                    if (PARENT_CLAS === "sec" &&
                        NODE_CLAS === "title" &&
                        PARENT &&
                        PARENT.hasClass("sec") &&
                        PARENT.getPrevious() &&
                        PARENT.getPrevious().hasClass("title")) {

                        ParaGroup.insert_para(PARENT, {
                            insert: "before"
                        });
                        return false;
                    }
                }
            }

            // INS/DEL complex logic (your original logic preserved)
            var insDelResult = this._handleInsDelComplexLogic(event, codeKey, IMS);
            if (insDelResult == true || insDelResult == false) return insDelResult;

            // tc restriction
            if (IMS.NODE_CLAS === 'tc') {
                global.GlobalEditor.getSelection().removeAllRanges();
                return false;
            }

            // caption + ice-ins
            if (this.hasAnyClass(['caption']) &&
                IMS.PARENTS_CLAS_LIST.filter(function(s) {
                    return s.indexOf('ice-ins') !== -1;
                }).length > 0) {

                if (IMS.NODE_CLONE_TEXT.replace('\n', '') === '') {
                    return false;
                }
            }

            if (this.IsFullNode) {

                const isInsertTag = IMS.NODE_TAG === 'INSERT';

                const restrictedParentClasses = new Set([
                    'p', 'title', 'caption', 'article-title', 'subject',
                    'alt-title', 'name', 'contrib', 'degrees',
                    'surname', 'given-names', 'aff', 'corresp',
                    'abstract', 'title-group', 'sec'
                ]);

                const isRestrictedParent = IMS.G_PARENT_CLAS === 'caption' || restrictedParentClasses.has(IMS.NODE_CLAS);

                const blockStructuralDelete = !isInsertTag && isRestrictedParent;

                const blockInsertDelete = IMS.SEL_TEXT !== '' && isInsertTag && this.CHECK_SEL_TEXT('', `.${IMS.PARENT_CLAS}`);

                if (blockStructuralDelete || blockInsertDelete) {

                    const isOSOClient = commonMethods.getClientCode({
                        format: "upper"
                    }) === "OSO";

                    // Allow OSO special handling only for blockStructuralDelete
                    if (blockStructuralDelete && isOSOClient) {
                        // return null; // explicitly allow
                    } else {
                        return this.IgnoreEvent(event, codeKey, {
                            alert_code: 6
                        });
                    }
                }
            }

            if (this.IsMath || this.IsComment || this.IsMultiPara || (this.IsRef && this.IsMultiElm) || this.IsFullTable || this.RESTRICT_CLIENT_IS && !IMS.PARENTS_CLAS_LIST.toLocaleString().match('table-wrap-foot')) {
                /*  */
                if (this.IsComment && IMS.NODE.$.querySelector("del")) {
                    // ? 1792710 - 11_SEP_2023 _YA
                    IMS.NODE.$.querySelectorAll("del").forEach(elm => {
                        commonMethods.iunWrap(elm);
                    });
                }
                return this.IgnoreEvent(event, codeKey);
            }
        }

    };
    KeyEventHandler.prototype._checkXrefRestrictions = function(event, codeKey, IMS) {

        /**
         * [2398448]: Replace the timer in dialog box with an OK button
         * Ignore Link element keying - RJ_09_Apr_25
         * Ignore Xref element inside insert tag - 22.11.22
         */

        var isDeleteKey = codeKey === 8 || codeKey === 46;
        if (!isDeleteKey) return null;

        var RG_INFO = IMS.RG_INFO;
        var NODE = IMS.NODE;
        var PARENT = IMS.PARENT;

        var isXRefInRange = RG_INFO.ChildrenClass.indexOf('xref') !== -1;
        var isLinkInRange = RG_INFO.eLinkCount > 0;
        var isInsideXrefNode = NODE.hasClass('xref') || PARENT.hasClass('xref');
        var shouldBlock = isInsideXrefNode || isXRefInRange || isLinkInRange;

        if (shouldBlock) {
            if (isXRefInRange && !isLinkInRange) {
                return this.alertForCitation();
            } else {
                var alertKey = isLinkInRange ? 'Ignore_hyperlink_text' : 'Ignore_KeyEvent_XREFS';

                // Stage as dialog – replayed on cache hit via _dispatchAlert
                this._stageAlert('dialog', alertKey, {
                    override: false
                });

                return false;
            }
        }

        return null;
    };
    KeyEventHandler.prototype._checkTemplateRestrictions = function(event, codeKey, IMS) {
        if (!this.IsTemplateWord) return null;
        // 114200 == cut
        if ([8, 46, 1114200].indexOf(codeKey) === -1) {
            if (this.IsFullNode) {
                // for ignore new template word can allowed edit
                return true;
            }
            return null;
        } else if (this.IsFullNode && [8, 46].indexOf(codeKey) !== -1) {
            this._stageAlert('toaster', "Last_char", {
                type: 'warning',
                text: this.TemplateWordMatch,
            });
        }


        // Placeholder detection - prevent delete full node if it contains placeholder text
        // ? Figure Alt Text Delete issue by DR
        if (this.TemplateTextMatch) {
            var alert_key = (this.TemplateClassMatch || this.TemplateWordMatch).includes("alt-text") ? 'alt-text' : 'common-placeholder';
            this._stageAlert('toaster', alert_key, {
                type: 'warning',
                text: this.TemplateWordMatch,
            });

            return false;
        }

        // Last-character protection for template nodes.
        this.IsLastChar = commonMethods.IS_LAST_CHARACTER(IMS);
        if (this.IsLastChar) {
            var fallbackPlaceholder = this._getTemplatePlaceholders()[0] || 'Type_Here';
            var classes = IMS.PARENTS_CLAS_LIST || [];
            var className = '';
            var template = '';
            var targetNode = null;

            var templates = {};
            if (typeof placeHolderModule !== "undefined") {
                if (!placeHolderModule.initiated) {
                    placeHolderModule.Init();
                }
                templates = placeHolderModule.templates;
            }

            if (this.TemplateClassMatch && this.TemplateItemMatch) {
                className = this.TemplateClassMatch;
                template = this.TemplateItemMatch;
            }

            // Resolve first matching restricted class that has a template payload.
            if (!className || !template) {
                for (var i = 0; i < classes.length; i++) {
                    if (this.TEMPLATE_RESTRICT_CLASS.indexOf(classes[i]) === -1) continue;
                    if (!templates[classes[i]]) continue;

                    className = classes[i];
                    template = templates[classes[i]];
                    break;
                }
            }

            // Fallback class resolution if direct match is not found.
            if (!className) {
                if (this.TEMPLATE_RESTRICT_CLASS.indexOf(IMS.NODE_CLAS) !== -1) className = IMS.NODE_CLAS;
                else if (this.TEMPLATE_RESTRICT_CLASS.indexOf(IMS.PARENT_CLAS) !== -1) className = IMS.PARENT_CLAS;
            }

            if (!template) {
                template = templates[className] || fallbackPlaceholder;
            }

            if (/kwd|def|term/gi.test(className || '')) {
                targetNode = (/kwd|def|term/gi.test(IMS.NODE_CLAS || '')) ?
                    IMS.NODE :
                    IMS.NODE.getAscendant({
                        div: 1,
                        p: 1,
                        span: 1
                    });
            } else if (IMS.G_PARENT && className) {
                targetNode = IMS.G_PARENT.findOne('.' + className);
            }

            if (!targetNode) {
                targetNode = IMS.NODE;
            }

            var targetDom = targetNode && targetNode.$ ? targetNode.$ : targetNode;
            var isNewInsert = (classes.join(' ').indexOf('ice-ins') !== -1);
            var hasTemplateAttr = !!(targetDom && (
                targetDom.hasAttribute('data-template') ||
                targetDom.hasAttribute('data-new') ||
                targetDom.closest('[data-template],[data-new]')
            ));

            // Newly inserted template content: restore placeholder/template text.
            if (isNewInsert && hasTemplateAttr && targetDom) {
                var restoreDom = /insert/gi.test(targetDom.tagName) ? targetDom.parentElement : targetDom;
                if (restoreDom) {
                    restoreDom.innerHTML = template || fallbackPlaceholder;
                    if (targetNode && typeof targetNode.getName === 'function') {
                        global.GlobalEditor.getSelection().selectElement(targetNode);
                    }
                }
                return UTILS.cancelEvent(event);
            }

            // Existing content: alert + execute class-specific command.
            var addText = /kwd/gi.test(className || '') ?
                'keywords.' :
                (/def|term/gi.test(className || '') ? 'Abbreviations.' : ((className || IMS.NODE_CLAS || 'template') + '.'));



            if (/kwd/gi.test(className || '')) {
                global.GlobalEditor.execCommand('KEYWORDS_DELETE');
            } else if (/def|term/gi.test(className || '')) {
                global.GlobalEditor.execCommand('ABBREVIATIONS_DELETE');
            } else if (/title/gi.test(className || '') && IMS.PARENTS_CLAS_LIST.indexOf('abstract') !== -1) {
                // 3451666	Editing Structured Abstract - Subheadings
                // return true; // allow delete for abstract title (special case)
                let first = IMS.NODE.getFirst();
                let next = first && first.getNext();

                if (next.getName() == "del") {
                    $(next.$).prepend(first.$);
                }
            }

            this._stageAlert('toaster', 'Last_char', {
                type: 'warning',
                addText: addText
            });

            // Final safety: never leave last-char template node empty.
            if (targetDom && !targetDom.textContent.trim()) {
                var safetyDom = /insert/gi.test(targetDom.tagName) ? targetDom.parentElement : targetDom;
                if (safetyDom) {
                    safetyDom.innerHTML = template || fallbackPlaceholder;
                }
            }

            return UTILS.cancelEvent(event);
        } else {
            // debug.log(commonMethods.getTextWithoutDel(IMS.NODE_CLONE));
        }

        // kwd multi-span restriction
        if (this.IsTemplateWord && IMS.NODE_CLAS !== '') {
            if (IMS.RG_INFO.spanCount > 1) {
                var KeyArray = [];

                $(IMS.RG_INFO.EL.getChildren().$).each(function() {
                    KeyArray.push($(this).attr('class'));
                });
                const isSameEl = KeyArray.every(function(cls) {
                    return /kwd|def|term/.test(cls);
                });

                if (isSameEl) {
                    if (this.IsCut) {

                    } else {
                        this.IsLastChar = true;
                        return this.IgnoreEvent(event, codeKey);
                    }
                }
            }

        }

        return null;
    };
    /**
     * ============================================================
     *  getSetKeyInfo (Optimized ES5 Version)
     *  ------------------------------------------------------------
     *  Normalizes key info and updates internal flags:
     *  - Ctrl / Shift / Alt / Meta
     *  - Copy / Cut / Paste
     *  - Movement keys
     *  - Shortcut detection
     *  - Format key detection
     * ============================================================
     */
    KeyEventHandler.prototype.getSetKeyInfo = function(keyCode, isHandled, eventData, editor) {
        // console.time("getSetKeyInfo");
        try {
            var e = eventData && eventData.$ ? eventData.$ : (eventData || {});

            this.KEY_CODE = keyCode;
            this.KEY_NAME = String.fromCharCode(keyCode) || "";
            this.KEY_CHAR_CODE = keyCode;

            // ------------------------------------------------------------
            // Modifier keys
            // ------------------------------------------------------------
            this.IsCtrl = !!e.ctrlKey;
            this.IsShift = !!e.shiftKey;
            this.IsAlt = !!e.altKey;
            this.IsMeta = !!e.metaKey;

            // ------------------------------------------------------------
            // Movement keys (arrows, home/end, page up/down)
            // ------------------------------------------------------------
            var movementKeys = {
                // left
                37: 1,
                // up
                38: 1,
                // right
                39: 1,
                // down
                40: 1,
                // page up
                33: 1,
                // page down
                34: 1,
                // end
                35: 1,
                // home
                36: 1
            };

            this.IS_MOVEMENT_STROKE = !!movementKeys[keyCode];

            // ------------------------------------------------------------
            // Alphanumeric detection & Cache (Optimized for continuous typing)
            // ------------------------------------------------------------
            this.IsAlphaNumeric = (
                // 0-9
                (keyCode >= 48 && keyCode <= 57) ||
                // A-Z
                (keyCode >= 65 && keyCode <= 90) ||
                // a-z
                (keyCode >= 97 && keyCode <= 122)
                // || (keyCode === 32 || keyCode === 13) // space or enter
            );

            // Fetch current element path for caching
            var ePath = editor ? editor.elementPath() : (global.GlobalEditor ? global.GlobalEditor.elementPath() : null);
            var pathStr = ePath ? ePath.elements.map(function(el) {
                return el.getName();
            }).join('>') : '';

            this.IS_SAME_PATH = (this.LAST_EPATH === pathStr);
            this.LAST_EPATH = pathStr;

            this.SKIP_RESTRICTION = (this.IsAlphaNumeric && this.IS_SAME_PATH && !this.IsCtrl && !this.IsAlt && !this.IsMeta);
            if (this.SKIP_RESTRICTION) {
                // return this.IS_LAST_EVT;
            }
            // ------------------------------------------------------------
            // Copy / Cut / Paste detection
            // ------------------------------------------------------------
            this.IsCopy = (this.IsCtrl && keyCode === this.COPY_KEY_CODE);
            this.IsCut = (this.IsCtrl && keyCode === this.CUT_KEY_CODE);
            this.IsPaste = (this.IsCtrl && keyCode === this.PASTE_KEY_CODE);

            // ------------------------------------------------------------
            // Shortcut detection (Ctrl + something)
            // ------------------------------------------------------------
            this.IS_SHORTCUT_FIRE = false;
            this.KEY_STROKE = "";

            if (this.IsCtrl && !this.IsAlt && !this.IsShift) {
                this.KEY_STROKE = keyCode;
            } else if (this.IsCtrl && this.IsShift) {
                this.KEY_STROKE = "CTRL+SHIFT+" + keyCode;
            }

            if (this.KEY_STROKE && this.SHORT_CUT_KEYS_COLLECTION[this.KEY_STROKE]) {
                this.IS_SHORTCUT_FIRE = true;
            }

            // ------------------------------------------------------------
            // Format key detection (Bold, Italic, etc.)
            // ------------------------------------------------------------
            var formatKeys = this.FORMAT_KEYS_COLLECTION[
                IMPACT.USER_ENV_INFO.isFirefox ? 'firefox' : 'chrome'
            ];

            this.IsFormatKey = false;
            for (var k in formatKeys) {
                if (formatKeys.hasOwnProperty(k) && formatKeys[k] === keyCode) {
                    this.IsFormatKey = true;
                    break;
                }
            }

            // ------------------------------------------------------------
            // Track last movement
            // ------------------------------------------------------------
            this.IS_LAST_MOVEMENT = this.IS_MOVEMENT_STROKE;
            // this.IS_LAST_EVT = keyCode;
            const IMS = window.IMPACT_SELECTION;
            if ([1114129].indexOf(this.KEY_STROKE) !== -1) {
                // ctrl key alone – ignore
                this.IS_LAST_EVT = null;
                return this.IS_LAST_EVT;
            } else if (this.IS_MOVEMENT_STROKE) {
                IMS.getInfo(editor);
                this.IS_LAST_EVT = this.checkKeyMovement(eventData, keyCode);
                if (this.IS_LAST_EVT === false) return false;
                console.log("return true");
                this.IS_LAST_EVT = true;
                return this.IS_LAST_EVT;
            } else {
                this.CHECK_SHORTCUT_DIALOG();
                this.getNode(editor, IMS);

                this.IS_LAST_EVT = this.IS_SHORTCUT_FIRE ? false : this.checkCondition(eventData, keyCode);

                return this.IS_LAST_EVT;
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getSetKeyInfo', err.message);
        } finally {
            // console.timeEnd("getSetKeyInfo");
        }
    };


    KeyEventHandler.prototype.cleanAnchorEl = function(items = []) {
        Array.from(items).forEach(item => {
            if (item.node) {
                const el = item.node.$ || item.node[0] || item.node;
                const rid = el.getAttribute("rid");
                commonMethods.SET_REMOVE_ATTR(el, {
                    oid: rid,
                    "data-remove": "s",
                    "data-delete": "s",
                }, ['data-cke-saved-href', 'href', 'rid']);
            }
        });
    }


    KeyEventHandler.prototype.alertForCitation = function() {
        const IMS = IMPACT_SELECTION;
        const self = this;

        try {

            const xrefs = self.getXrefsInsideSelection();
            const single = xrefs.single || [];
            const all = xrefs.all || [];

            const excludedTargetTypes = ["Chapter", "Section", "Part", "Appendix", "Equation"];
            const noteTargetTypes = ["Footnote", "Endnote"];
            const noteDeleteIds = [];

            // Group buckets
            const grouped = {
                Reference: [],
                Footnote: [],
                Figure: [],
                Table: [],
                Equation: [],
                Box: [],
                Appendix: [],
                Part: [],
                Chapter: [],
                Section: [],
                Endnote: []
            };

            // Helper: push into correct bucket
            function addToGroup(targetType, value) {
                value = value.replace(/[.\s]$/, "");
                if (targetType && value.toLowerCase().indexOf(targetType.toLowerCase() + " ") === 0) {
                    value = value.substring(targetType.length).replace(/^\s+/, "");
                }

                if (targetType && grouped[targetType]) grouped[targetType].push(value);
            }

            // Elements queued for attribute set/remove — applied after the alert warning fires
            const elsToUpdate = [];

            // MAIN LOOP
            single.forEach(info => {
                const rid = info.rid;
                const el = GlobalEditor.document.getById(rid);
                if (!el) return;

                const targetType = self.getCitationDeleteTargetType(el);

                if (excludedTargetTypes.indexOf(targetType) !== -1) return;
                if (noteTargetTypes.indexOf(targetType) !== -1 && noteDeleteIds.indexOf(rid) === -1) {
                    noteDeleteIds.push(rid);
                }

                el.setAttribute("data-cite-delete-warn", "yes");

                const cls = el.getAttribute("class") || "";
                const isLabelEl = /ref|fn/i.test(cls);
                let finalText = "";

                // CASE 1: Reference list
                if (isLabelEl) {
                    const labelNodes = el.find(".label,[data-name='label']");
                    const labelEl = labelNodes.count() ? labelNodes.getItem(0) : null;

                    if (labelEl) {
                        finalText = labelEl.getText() || "";
                    } else if (iREF_SCOPE.IS_NAME_DATE) {
                        const result = new namedCitation([rid]).CITE_COLLECTION[0].citation_txt_org;
                        finalText = $("<div>").append(result.indirect).text();
                    } else {
                        finalText = rid;
                    }

                    addToGroup(targetType, finalText);
                }

                // CASE 2: Inline [data-label]
                else {
                    const labelNodes = el.find("[data-label]");
                    const labelEl = labelNodes.count() ? labelNodes.getItem(0) : null;

                    finalText = labelEl ? labelEl.getAttribute("data-label") : rid;

                    // FIX: whitespace handling
                    if (/\s/.test(finalText)) {
                        finalText = finalText.split(/\s+/)[1];
                    }

                    addToGroup(targetType, finalText);
                }

                if (el) {
                    elsToUpdate.push(el);
                }
            });
            if (!single || single.length === 0) {
                if (self.RANGE_INFO && self.RANGE_INFO.ChildrenClass && self.RANGE_INFO.ChildrenClass.indexOf("xref") !== -1) {
                    // ? 3537699: Deleted reference along with its citation
                    self.cleanAnchorEl(all);
                    return true;
                }
                return null;
            }

            // Build final alert text
            const finalAlert = [];
            const finalAlertTypes = [];
            Object.keys(grouped).forEach(key => {
                const values = grouped[key];
                if (!values.length) return;

                const label = values.length === 1 ? key : key + "s";
                finalAlert.push(`${label} ${values.join(", ")}`);
                finalAlertTypes.push(key);
            });

            // Show alert
            if (!this.IsMultiPara && finalAlert.length) {
                this.isCiationAlertShown = true;
                const alertKey = finalAlertTypes.every(key => noteTargetTypes.indexOf(key) !== -1) ?
                    "allowed_delete_cite_fn_en" :
                    "allowed_delete_cite";
                const alertResult = AlertNewDialog.fire(
                    "warning",
                    "Warning",
                    alertKey,
                    "OK",
                    "",
                    true, {
                        override: false,
                        text: finalAlert.join2(", ", " and ")
                    }
                );

                if (noteDeleteIds.length && alertResult && typeof alertResult.then === "function") {
                    alertResult.then(result => {
                        if (!result || !result.isConfirmed) return;
                        try {
                            const noteModule = typeof window !== "undefined" ? window.noteModule : null;
                            if (noteModule && typeof noteModule.FIRE_DELETE === "function") {
                                noteModule.FIRE_DELETE({
                                    nodeIds: noteDeleteIds,
                                    isCiteDelete: true,
                                    isNoteDelete: false
                                });
                            }
                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace("alertForCitation.noteDelete", err.message);
                        }
                    });
                }

                // Merge delete sequences
                setTimeout(() => {
                    try {
                        if (typeof trackDialog !== "undefined" &&
                            typeof trackDialog.mergeDelSequences === "function") {
                            trackDialog.mergeDelSequences(IMS.NODE);
                        }
                    } catch (err) {}
                }, 555);
            } else {
                this.isCiationAlertShown = false;
            }

            // Apply attribute set/remove after the alert warning has fired
            self.cleanAnchorEl(all);
            debug.log(this.isCiationAlertShown);

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("alertForCitation", err.message);
        }
    };
    KeyEventHandler.prototype.getCitationDeleteTargetType = function(el) {
        if (!el || typeof el.getAttribute !== "function") return null;

        const cls = (el.getAttribute("class") || "").toLowerCase();
        const dataName = (el.getAttribute("data-name") || "").toLowerCase();
        const fnType = (el.getAttribute("fn-type") || "").toLowerCase();
        const bookPartType = (el.getAttribute("book-part-type") || "").toLowerCase();

        if (cls.includes("ref")) return "Reference";
        if (fnType === "endnote" || dataName === "endnote" || cls.includes("endnote") || cls.includes("end-note")) return "Endnote";
        if (cls.includes("fn")) return "Footnote";
        if (cls.includes("fig")) return "Figure";
        if (cls.includes("table-wrap") || cls.includes("table")) return "Table";
        if (cls.includes("disp-formula") || cls.includes("inline-formula") || cls.includes("equation")) return "Equation";
        if (cls.includes("boxed-text")) return "Box";
        if (cls.includes("app-group") || cls.includes("app") || bookPartType === "app") return "Appendix";
        if (bookPartType === "part") return "Part";
        if (bookPartType === "chapter") return "Chapter";
        if (cls.includes("sec")) return "Section";

        return null;
    };
    KeyEventHandler.prototype.hasRemoveOrDeleteAttr = function(node) {
        if (!node) return false;

        return (node.hasAttribute('data-remove') || node.hasAttribute('data-delete'));
    };
    KeyEventHandler.prototype.getClass = function(node) {
        try {
            return UTILS.getNodeClass(node);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getClass', err.message);
        }
    };

    KeyEventHandler.prototype.getXrefsInsideSelection = function() {
        const IMS = IMPACT_SELECTION;
        const self = this;

        try {
            const selection = GlobalEditor.getSelection();
            if (!selection) return {
                all: [],
                single: []
            };

            const ranges = selection.getRanges();
            if (!ranges.length) return {
                all: [],
                single: []
            };

            const walker = new CKEDITOR.dom.walker(ranges[0]);
            const detailsInfo = [];

            walker.evaluator = function(node) {
                const isXref =
                    node.type === CKEDITOR.NODE_ELEMENT &&
                    node.getName() === "a" &&
                    node.hasClass("xref");

                if (!isXref) return false;

                // Skip deleted or removed nodes
                if (self.hasRemoveOrDeleteAttr(node.$) || node.getAscendant("del")) {
                    return false;
                }

                return true;
            };

            let node = walker.next();
            while (node) {
                const rid = node.getAttribute("rid");
                const role = node.getAttribute("data-role");

                if (rid) {
                    const selector = commonMethods.xrefSelectorBuilder(rid, ["data-delete"]);
                    const result = GlobalEditor.document.find(selector);
                    const count = result && result.count ? result.count() : 0;

                    detailsInfo.push({
                        node,
                        rid,
                        count,
                        role
                    });
                }

                node = walker.next();
            }

            const single = detailsInfo.filter(info => info.count === 1);
            return {
                all: detailsInfo,
                single
            };

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("getXrefsInsideSelection", err.message);
            return {
                all: [],
                single: []
            };
        }
    };

    KeyEventHandler.prototype.CHECK_IGNORE_LITE_TRACK = function(D) {
        try {
            // Only element nodes
            if (!D || D.nodeType !== 1) return false;

            const nodeClass = this.getClass(D);
            const nodeTag = D.localName;

            // Find inner <insert> or similar tracked element
            const insertEl = D.querySelector(this.TAG_BY_CLASS.SELECTOR_QRY);
            const insertClass = insertEl ? this.getClass(insertEl) : null;
            const insertTag = insertEl ? insertEl.localName : null;

            // Resolve root config
            const key =
                nodeTag ||
                (D.child_name ? D.child_name : null);

            const rootConfig = this.TAG_BY_CLASS[key];
            if (!rootConfig) return false;

            // If neither node nor insert has a class → nothing to check
            if (!nodeClass && !insertClass) return false;

            // Check ignore rules
            const shouldIgnore =
                rootConfig.IGNORE_CLASS.includes(nodeClass) ||
                rootConfig.IGNORE_CLASS.includes(insertClass);

            if (!shouldIgnore) return false;

            console.log("through lite plugins editor selection");

            // Determine correct error key
            const errorKey =
                this.TAG_BY_CLASS.ERROR_CLASS[nodeClass] ||
                this.TAG_BY_CLASS.ERROR_CLASS[insertClass] ||
                "default";

            TOASTER_ALERT(errorKey, {
                type: "warning"
            });

            return true;

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("CHECK_IGNORE_LITE_TRACK", err.message);
            return false;
        }
    };

    KeyEventHandler.prototype.IsCheckRestrict = function(e) {
        try {
            // Only handle cut/paste/pasteastext
            var evtName = e && e.name ? e.name : "";
            var isCut = evtName === "cut";
            var isPaste = (evtName === "paste" || evtName === "pasteastext");

            if (!isCut && !isPaste) {
                return true;
            }

            // Reset key state
            this.resetKeyBind();

            // Resolve node context
            this.getNode(e.editor);

            this.IsCut = isCut;
            this.IsPaste = isPaste;

            // Trigger delayed title/caption dirty check
            if (isCut || isPaste) {
                var self = this;
                setTimeout(function() {
                    self.Dirty_Check_Title_Caption(e);
                }, 1500);
            }

            // Run restriction engine
            return this.checkCondition(e);

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("IsCheckRestrict", err.message);
            return true;
        }
    };

    KeyEventHandler.prototype.Dirty_Check_Title_Caption = function(e) {
        try {
            var ePath = GlobalEditor.elementPath();
            if (!ePath) return;

            var curElement_Id = null;
            var keys_arr = ['Backspace', 'Space', 'Delete'];

            // ------------------------------------------------------------
            // QUERY / COMMENT COUNT CHECK
            // ------------------------------------------------------------
            var QUERY_COM_COUNT = function() {
                var DOM_COUNT = document.querySelectorAll('div.query-div').length;
                var EDITOR_COUNT = GlobalEditor.document.find('[data-class="ckcommentsfull"]').$.length;

                if (DOM_COUNT !== EDITOR_COUNT) {
                    console.log(DOM_COUNT, EDITOR_COUNT);
                    SET_DATA.reGenerateAllInit(GlobalEditor.getData());
                }
            };

            // Trigger query/comment sync only for specific key events
            if (typeof e !== "undefined") {
                var s1 = e.data && e.data.$ && (keys_arr.indexOf(e.data.$.code) !== -1);
                var s2 = e.$ && (keys_arr.indexOf(e.$.code) !== -1);
                var s3 = e.command && (e.command === 'cut' || e.command === 'paste' || e.command === 'pasteastext');

                if (s1 || s2 || s3) {
                    QUERY_COM_COUNT();
                }
            }

            // ------------------------------------------------------------
            // FIND CURRENT TITLE / CAPTION ELEMENT
            // ------------------------------------------------------------
            var checkClassArr = ['.title', '.caption', '.article-title', '.title-group'];

            for (var i = 0; i < checkClassArr.length; i++) {
                if (!curElement_Id) {
                    curElement_Id = IsNodeContain(ePath, checkClassArr[i], true);
                }
            }

            if (!curElement_Id) return;

            debug.log(curElement_Id);

            var curElement = GlobalEditor.document.getById(curElement_Id).$;
            if (!curElement) return;

            var curElmTxt = getTxt(curElement);
            var curElmClass = curElement.className;
            var curParent = curElement.parentElement;

            var LabFound = false;
            var find_Id_syntax = "#l - title";
            var Is_TitleGroup = !!curElement.closest(".title-group");

            // ------------------------------------------------------------
            // LABEL HANDLING
            // ------------------------------------------------------------
            if (curElement.hasAttribute('data-label')) {
                curElmTxt = curElement.getAttribute('data-label') + ' ' + curElmTxt;
                LabFound = true;
            }

            // ------------------------------------------------------------
            // CAPTION / TITLE (NOT IN TITLE-GROUP)
            // ------------------------------------------------------------
            if ((curElmClass === 'caption' || curElmClass === 'title') && !Is_TitleGroup) {

                if (curElmClass === 'caption') {
                    var pNode = curElement.querySelector('.p');
                    if (pNode) {
                        curElement_Id = pNode.id;
                    }
                }

                if (!LabFound && curParent && curParent.hasAttribute('data-label')) {
                    curElmTxt = curParent.getAttribute('data-label') + ' ' + curElmTxt;
                }

                find_Id_syntax = '[data-id="' + curElement_Id + '"]';
            }

            // ------------------------------------------------------------
            // ALT-TITLE / TITLE-GROUP
            // ------------------------------------------------------------
            else if (curElmClass === 'alt-title' || curElmClass === 'title-group' || Is_TitleGroup) {

                var ROOT = I_CONFIG ? I_CONFIG.querySelector('root') && I_CONFIG.querySelector('root').getAttribute("title") : null;
                if (ROOT) {
                    var rootNodeList = GlobalEditor.document.find(ROOT).$;
                    if (rootNodeList && rootNodeList[0]) {
                        curElmTxt = getTxt(rootNodeList[0]);
                    }
                }
                if (curElement) {
                    var exists = document.querySelector('[data-id="' + curElement_Id + '"]');
                    if (!exists && !IS_JOURNAL) {
                        SET_DATA.reGenerateAllInit(GlobalEditor.getData(), {
                            toclist: true
                        });
                        return;
                    }
                }
            }

            // ------------------------------------------------------------
            // UPDATE DOM ELEMENT (TOC / TITLE / CAPTION)
            // ------------------------------------------------------------
            var domElm = document.querySelector(find_Id_syntax);

            if (domElm && domElm.textContent !== curElmTxt) {
                domElm.textContent = curElmTxt;
                domElm.setAttribute('title', curElmTxt);

                // Update tooltip (tippy)
                if (domElm._tippy) {
                    domElm._tippy.setContent(curElmTxt);
                } else {
                    var newTip = createNewTooltip(curElement_Id, curElmTxt);
                    domElm._tippy = newTip[0];
                }
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Dirty_Check_Title_Caption', err.message);
        }
    };
    KeyEventHandler.prototype.GET_ASCENT_METHOD = function(el, Options) {
        try {
            return UTILS.getAscendant(el, UTILS.buildAscendantOptions(Options));

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("ASCENT_METHOD", err.message);
            return null;
        }
    };
    KeyEventHandler.prototype.hasAnyClass = function(arr, Option) {
        try {
            Option = Option || {};
            if (Array.isArray(Option)) {
                Option = {
                    check_arr: Option
                };
            }
            if (typeof Option.add_arr === "undefined") {
                Option.add_arr = false;
            }
            if (typeof Option.case_insensitive === "undefined") {
                Option.case_insensitive = false;
            }
            if (typeof Option.return_match === "undefined") {
                Option.return_match = false;
            }

            var IMS = global.IMPACT_SELECTION;
            var CHECK_ARR = [].concat(
                IMS.PARENTS_CLAS_LIST || [],
                IMS.PARENT_CLAS || [],
                IMS.NODE_CLAS || []
            );

            if (Option.add_arr) {
                CHECK_ARR.push(Option.add_arr);
            }

            var sourceArr = Option.check_arr ? [].concat(Option.check_arr) : CHECK_ARR;
            var normalizedArr = Array.isArray(arr) ? arr.slice(0) : [];
            var normalizedSourceArr = sourceArr.slice(0);

            if (Option.case_insensitive) {
                normalizedArr = normalizedArr.map(function(val) {
                    return String(val || '').toLowerCase();
                });
                normalizedSourceArr = normalizedSourceArr.map(function(val) {
                    return String(val || '').toLowerCase();
                });
            }

            // Simplified: Use Set for fast lookup
            var arrSet = new Set(normalizedArr);
            var matchedItem = null;
            var found = normalizedSourceArr.filter(function(cls, index) {
                var isMatched = arrSet.has(cls);
                if (isMatched && matchedItem === null) {
                    matchedItem = sourceArr[index];
                }
                return isMatched;
            });

            var isFormat = /strong|sub|sup|u|em|sc|insert/gi.test(IMS.NODE_TAG);

            if (Option.deep_check && (IMS.NODE_CLAS === "" || isFormat)) {
                var cond1 = (normalizedSourceArr[0] === found[0]);
                var cond2 = (found && found.length > 0 && !isFormat);
                var cond3 = [IMS.SEL_TEXT_CLONE, IMS.NODE_CLONE_TEXT].indexOf(IMS.PARENT_CLONE_TEXT) !== -1;

                if ((cond1 || cond2) && cond3) {
                    return Option.return_match ? matchedItem : true;
                }
                return Option.return_match ? null : false;
            } else {
                if (IS_LOCAL_HOST && Option.deep_check && !isFormat) {
                    debug.log("dev-test");
                    // debugger;
                }
                if (Option.return_match) {
                    return matchedItem;
                }
                return found.length > 0;
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("hasAnyClass", err.message);
            return false;
        }
    };
    KeyEventHandler.prototype.IgnoreForMatEvent = function(e, Options, IMS) {
        try {
            Options = Options || {};
            IMS = IMS || global.IMPACT_SELECTION;

            var Ignore = false;

            // Run condition check if no explicit override
            if (!Options.Ignore && !Options.Key) {
                this.getNode(e.editor);
                Ignore = this.checkCondition(e, null, {
                    fromToolBarBtn: true
                });
            }

            if (Options.Ignore || Ignore) {
                // Determine alert index based on active restrictions
                var alertIndex;
                if (this.RESTRICT_CLIENT_IS) {
                    alertIndex = 3;
                } else {
                    var restrictCondition =
                        this.IsFullFormat ||
                        this.IsKwdRestrict ||
                        this.IsTableMultiCell ||
                        this.IsMultiPara ||
                        (IMS && IMS.PARENT_CLONE && IMS.PARENT_CLONE.hasAttribute('data-insert-para')) ||
                        this.IsXref;

                    alertIndex = restrictCondition ? 6 : 3;
                }

                var alert_key = this.ALERT_MESSAGE[alertIndex];

                // Journal reference formatting restriction –
                // first hit → dialog, subsequent hits → toaster.
                // Stage whichever is appropriate so the cache can replay it.
                if (IMS && IMS.IsRefGroup && typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL) {
                    if (IMS.FORMAT_REF_WARN_ALERT_COUNT === 0) {
                        this._stageAlert('dialog', 'FORMAT_REF_WARN', {});
                        IMS.FORMAT_REF_WARN_ALERT_COUNT++;
                    } else {
                        this._stageAlert('toaster', 'FORMAT_REF_WARN', {
                            type: 'warning'
                        });
                    }
                } else {
                    this._stageAlert('toaster', alert_key, {
                        type: 'warning'
                    });
                }

                // _dispatchAlert fires the staged alert immediately here
                // (IgnoreForMatEvent sits outside the checkCondition pipeline
                //  so _cacheReturn is not called – we dispatch inline).
                this._dispatchAlert();
                this._pendingAlert = null;

                return EVT_RETURN(e);

            } else {
                return true;
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('IgnoreForMatEvent', err.message);
            return false;
        }
    };
    KeyEventHandler.prototype.checkKeyMovement = function(event, codeKey, IMS) {
        // always reset IMS to global
        IMS = IMPACT_SELECTION;
        try {
            // Helper: check class restrictions
            var checkClass = function(Options) {
                Options = Options || {
                    checkEq: false
                };
                var checkArr = [IMS.PARENT_CLAS, IMS.G_PARENT_CLAS, IMS.NODE_CLAS];
                // Regex: inline-formula always, plus xref/uri/email/ext-link unless checkEq=true
                var regex = Options.checkEq ?
                    /inline-formula/ :
                    /inline-formula|xref|uri|email|ext-link/;
                for (var i = 0; i < checkArr.length; i++) {
                    var key = checkArr[i];
                    if (regex.test(key)) {
                        return true;
                    }
                }
                return false;
            };

            var IsRestrict = checkClass();
            var IsEq = null;

            if (IsRestrict) {
                IsEq = checkClass({
                    checkEq: true
                });

                var range = GlobalEditor.createRange();
                range.moveToPosition(
                    IsEq ? IMS.PARENT.getParent() : IMS.NODE,
                    codeKey === 39 ?
                    CKEDITOR.POSITION_AFTER_END :
                    CKEDITOR.POSITION_BEFORE_START
                );

                GlobalEditor.getSelection().selectRanges([range]);
                GlobalEditor.focus();
                // stop movement
                return false;
            }

            // Fire placeholder keyup after delay for arrow movement
            setTimeout(function(codeKey, evt) {
                if (typeof placeHolderModule !== "undefined") {
                    placeHolderModule.FIRE_KEYUP(codeKey, evt, {
                        IsArrowMovement: true
                    });
                }
            }, 250, codeKey, event.$ ? event.$ : event);

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("checkKeyMovement", err.message);
        }
    };

    // Expose singleton
    global.iKEY_EVENT_HANDLING = new KeyEventHandler(
        CONFIG,
        UTILS,
        global.IMPACT_SELECTION,
        global.EDITOR_CURSOR
    );
    bindGlobalErrorLogger(global);
    wrapInstanceMethods(global.iKEY_EVENT_HANDLING, global.ErrorLogTrace);

})(window);



var [LAST_KEY_STOKE_SAVE, LAST_KEY_E] = [null, null];
var [_IsEditorInsideClick, isSetDataAfter, IsResetDone, Trackchangeapi] = [false, false, false, null];
var TABLE_CONTEXT_MENU_METHOD = ["cellMerge", "rowInsertAfter", "rowInsertBefore", "rowDelete", "columnInsertBefore", "columnInsertAfter", "columnDelete"];
var IMP_SAFARI = {
    SEL: null,
    BKM: null,
    STARTOFFSET: null,
    ENDOFFSET: null,
    SEL_ID: null,
    PREV_SEL: null
};


class CKEditorSelectionUtils {
    constructor(editor, currentUser = null) {
        this.editor = editor;
        this.currentUser = currentUser ? currentUser : USER_INFO.MAIL_ID;
        this._eventsPaused = false;

        // Cache for performance
        this._lastSelectionInfo = null;
        this._lastSelectionTime = 0;
        // ms
        this._cacheTimeout = 100;
    }

    /**
     * Unified selection method - handles both simple and advanced scenarios
     * @param {Object} options - Configuration options
     * @param {boolean} options.useCache - Use cached result if recent
     * @param {boolean} options.detailed - Include advanced analysis
     * @param {Function} options.rangeCallback - Callback for processing each range
     * @param {number} options.maxElements - Maximum elements to process per range
     * @returns {Object} Complete selection information
     */
    getSelectionInfo(options = {}) {
        const {
            useCache = true,
                detailed = true,
                rangeCallback = null,
                maxElements = 500
        } = options;

        const now = Date.now();

        // Return cached result if recent and cache enabled (only for simple queries)
        if (useCache && !detailed && !rangeCallback && this._lastSelectionInfo &&
            (now - this._lastSelectionTime) < this._cacheTimeout) {
            return this._lastSelectionInfo;
        }

        const info = {
            hasSelection: false,
            selection: null,
            isEmpty: true,
            isCollapsed: true,
            selectionText: null,
            selectionType: null,

            // Element information (arrays for consistency)
            // All elements in selection
            elements: [],
            // First element
            startElement: null,
            // Last element
            endElement: null,
            // Primary element (for backward compatibility)
            currentElement: null,

            // Block information
            // All block elements
            blocks: [],
            // Main block element
            primaryBlock: null,
            spansMultipleBlocks: false,

            // Range information with arrays
            ranges: [],
            // Array of range details
            rangeData: [],
            rangeCount: 0,
            isMultiRange: false,

            // Lock related info
            // Array of locked element info
            lockedElements: [],
            lockedAncestor: null,
            isLocked: false,
            lockedBy: null,
            isLockedByOther: false,
            isLockedByCurrentUser: false,
            lockRole: null,
            hasAnyLockedElements: false,

            // IDs and attributes (arrays)
            elementIds: [],
            blockIds: [],
            tagNames: [],
            classes: [],

            // Processing info
            elementCount: 0,
            warnings: [],
            error: null,
            timestamp: now
        };

        try {
            const selection = this.editor.getSelection();
            if (!selection) return this._cacheAndReturn(info);

            info.hasSelection = true;
            info.selection = selection;
            info.selectionType = selection.getType();
            info.isCollapsed = selection.getType() === CKEDITOR.SELECTION_NONE ||
                (selection.getType() === CKEDITOR.SELECTION_TEXT &&
                    selection.getSelectedText().length === 0);

            // Get selection text
            info.selectionText = this._safeGetSelectedText(selection);
            info.isEmpty = !info.selectionText || info.selectionText.trim().length === 0;

            // Get ranges
            info.ranges = selection.getRanges() || [];
            info.rangeCount = info.ranges.length;
            info.isMultiRange = info.rangeCount > 1;

            // Get start/end elements
            info.startElement = this._safeGetStartElement(selection);
            if (detailed) {
                info.endElement = this._safeGetEndElement(selection);
            }
            // For backward compatibility
            info.currentElement = info.startElement;

            // Process ranges and collect elements
            this._processRanges(info, {
                detailed,
                rangeCallback,
                maxElements
            });

            // Find and analyze block elements
            this._analyzeBlocks(info);

            // Check lock status
            this._analyzeLockStatus(info, detailed);

            // Collect IDs and attributes
            this._collectAttributes(info);

        } catch (error) {
            console.error("Error in getSelectionInfo:", error);
            info.error = error.message;
        }

        return this._cacheAndReturn(info, !detailed && !rangeCallback);
    }

    /**
     * Process all ranges and collect element information
     */
    _processRanges(info, options) {
        const {
            detailed,
            rangeCallback,
            maxElements
        } = options;

        info.ranges.forEach((range, rangeIndex) => {
            const rangeInfo = {
                index: rangeIndex,
                range: range,
                elements: [],
                html: '',
                outerHtml: '',
                elementIds: [],
                tagNames: [],
                lockedElements: [],
                elementCount: 0,
                isEmpty: true
            };

            try {
                // Get HTML content
                const frag = range.cloneContents();
                if (frag) {
                    const container = new CKEDITOR.dom.element("div", this.editor.document);
                    container.append(frag);
                    rangeInfo.html = container.getHtml();
                    rangeInfo.isEmpty = !rangeInfo.html.trim();
                }

                // Get outer HTML if detailed
                if (detailed) {
                    try {
                        const startContainer = range.startContainer;
                        const endContainer = range.endContainer;
                        if (startContainer && startContainer.getOuterHtml) {
                            rangeInfo.outerHtml = startContainer.getOuterHtml();
                        }
                    } catch (e) {
                        info.warnings.push(`Could not get outer HTML for range ${rangeIndex}: ${e.message}`);
                    }
                }

                // Walk through elements in range
                const walker = new CKEDITOR.dom.walker(range);
                let node, elementCount = 0;

                while ((node = walker.next()) && elementCount < maxElements) {
                    if (node && node.type === CKEDITOR.NODE_ELEMENT) {
                        const elementInfo = {
                            element: node,
                            id: this._safeGetId(node),
                            tagName: this._safeGetName(node),
                            classes: this._safeGetAttribute(node, 'class'),
                            outerHtml: detailed ? this._safeGetOuterHtml(node) : null,
                            isLocked: this._isElementLocked(node)
                        };

                        rangeInfo.elements.push(elementInfo);
                        rangeInfo.elementIds.push(elementInfo.id);
                        rangeInfo.tagNames.push(elementInfo.tagName);

                        // Add to main arrays
                        info.elements.push(elementInfo);
                        info.elementCount++;
                        elementCount++;

                        // Check if locked
                        if (elementInfo.isLocked) {
                            const lockInfo = {
                                element: node,
                                elementInfo: elementInfo,
                                lockedBy: this._safeGetAttribute(node, 'data-locked-by'),
                                lockRole: this._safeGetAttribute(node, 'data-lock-role'),
                                rangeIndex: rangeIndex
                            };

                            rangeInfo.lockedElements.push(lockInfo);
                            info.lockedElements.push(lockInfo);
                            info.hasAnyLockedElements = true;
                        }
                    }
                }

                rangeInfo.elementCount = elementCount;

                // Execute callback if provided
                if (rangeCallback && typeof rangeCallback === 'function') {
                    try {
                        rangeCallback(rangeInfo, rangeIndex, info);
                    } catch (e) {
                        info.warnings.push(`Range callback error for range ${rangeIndex}: ${e.message}`);
                    }
                }

            } catch (e) {
                info.warnings.push(`Error processing range ${rangeIndex}: ${e.message}`);
            }

            info.rangeData.push(rangeInfo);
        });
    }

    /**
     * Analyze block elements
     */
    _analyzeBlocks(info) {
        const blockSet = new Set();
        const blockInfos = [];

        const shouldIgnore = (block) => this._safeGetId(block) === "xmlcontentroot";

        // Find primary block from start element
        if (info.startElement) {
            const primaryBlock = this._findBlockElement(info.startElement);
            if (primaryBlock && !shouldIgnore(primaryBlock)) {
                info.primaryBlock = primaryBlock;
                blockSet.add(primaryBlock);

                blockInfos.push({
                    element: primaryBlock,
                    id: this._safeGetId(primaryBlock),
                    tagName: this._safeGetName(primaryBlock),
                    classes: this._safeGetAttribute(primaryBlock, "class"),
                    isPrimary: true,
                    outerHtml: this._safeGetOuterHtml(primaryBlock)
                });
            }
        }

        // Find blocks from all elements
        info.elements.forEach(elementInfo => {
            const block = this._findBlockElement(elementInfo.element);
            if (block && !blockSet.has(block) && !shouldIgnore(block)) {
                blockSet.add(block);

                blockInfos.push({
                    element: block,
                    id: this._safeGetId(block),
                    tagName: this._safeGetName(block),
                    classes: this._safeGetAttribute(block, "class"),
                    isPrimary: false,
                    outerHtml: this._safeGetOuterHtml(block)
                });
            }
        });

        info.blocks = blockInfos;
        info.spansMultipleBlocks = blockInfos.length > 1;

        // Deduplicated collections with filters
        info.blockIds = [...new Set(
            blockInfos.map(b => b.id).filter(id => id && id !== "xmlcontentroot")
        )];

        info.outerHtmls = [...new Set(
            blockInfos
            .map(b => b.outerHtml)
            .filter(outerHtml => outerHtml && !outerHtml.startsWith("<body"))
        )];

        info.elementsList = [...new Set(
            blockInfos.map(b => b.element).filter(Boolean)
        )];
    }



    /**
     * Analyze lock status
     */
    _analyzeLockStatus(info, detailed = false) {
        // Check primary block first
        if (info.primaryBlock) {
            this._checkElementLockStatus(info.primaryBlock, info);
        }

        // If detailed analysis and not locked, check all locked elements
        if (detailed && !info.isLocked && info.hasAnyLockedElements) {
            const otherLocks = info.lockedElements.filter(lock =>
                lock.lockedBy && lock.lockedBy !== this.currentUser
            );

            if (otherLocks.length > 0) {
                const firstOtherLock = otherLocks[0];
                info.isLocked = true;
                info.isLockedByOther = true;
                info.lockedBy = firstOtherLock.lockedBy;
                info.lockRole = firstOtherLock.lockRole;
                info.lockedAncestor = firstOtherLock.element;
            }
        }
    }

    /**
     * Collect attributes from elements
     */
    _collectAttributes(info) {
        info.elements.forEach(elementInfo => {
            if (elementInfo.id) info.elementIds.push(elementInfo.id);
            if (elementInfo.tagName) info.tagNames.push(elementInfo.tagName);
            if (elementInfo.classes) info.classes.push(elementInfo.classes);
        });
    }

    /**
     * Cache management
     */
    _cacheAndReturn(info, shouldCache = true) {
        if (shouldCache) {
            this._lastSelectionInfo = info;
            this._lastSelectionTime = info.timestamp;
        }
        return info;
    }

    /**
     * Quick status methods (using the unified method)
     */
    isSelectionLockedByOther() {
        const info = this.getSelectionInfo();
        return info.isLockedByOther;
    }

    hasSelection() {
        const info = this.getSelectionInfo();
        return info.hasSelection;
    }

    getCurrentBlock() {
        const info = this.getSelectionInfo();
        return info.primaryBlock;
    }

    isSelectionEmpty() {
        const info = this.getSelectionInfo();
        return info.isEmpty;
    }

    getSelectionElements() {
        const info = this.getSelectionInfo({
            detailed: true
        });
        return info.elements;
    }

    getRangeDetails() {
        const info = this.getSelectionInfo({
            detailed: true
        });
        return info.rangeData;
    }

    /**
     * Utility methods
     */
    _findBlockElement(element) {
        if (!element) return null;

        try {

            const classes = this._safeGetAttribute(element, 'class') || '';

            // --- 0️⃣ Direct match: current element itself is a title or caption ---
            if (/\b(title|caption)\b/.test(classes)) {
                return element;
            }

            // --- 1️⃣ Special structural blocks (fig, table, ref, etc.) ---
            const specialBlock = element.getAscendant(el => {
                if (!el || el.type !== CKEDITOR.NODE_ELEMENT) return false;
                const cls = this._safeGetAttribute(el, 'class') || '';
                return /\b(ref|kwd-group|contrib-group|fig|table)\b/.test(cls);
            }, true);
            if (specialBlock) return specialBlock;

            // --- 2️⃣ Standard blocks (p, li, div, or class-based title/caption) ---
            const normalBlock = element.getAscendant(el => {
                if (!el || el.type !== CKEDITOR.NODE_ELEMENT) return false;
                const tag = (this._safeGetName(el) || '').toLowerCase();
                const cls = this._safeGetAttribute(el, 'class') || '';
                return /^(p|li|div)$/i.test(tag) || /\b(title|caption)\b/.test(cls);
            }, true);

            return normalBlock || null;

        } catch (e) {
            console.warn('Error in _findBlockElement:', e);
            return null;
        }
    }

    _checkElementLockStatus(element, info) {
        if (!element) return;

        try {
            let current = element;
            while (current && current.type === CKEDITOR.NODE_ELEMENT) {
                if (current.hasClass && current.hasClass("para-locked")) {
                    const lockedBy = this._safeGetAttribute(current, 'data-locked-by');
                    const lockRole = this._safeGetAttribute(current, 'data-lock-role');

                    info.lockedAncestor = current;
                    info.isLocked = true;
                    info.lockedBy = lockedBy;
                    info.lockRole = lockRole;

                    if (this.currentUser) {
                        info.isLockedByCurrentUser = lockedBy === this.currentUser;
                        info.isLockedByOther = lockedBy !== this.currentUser && !!lockedBy;
                    }

                    break;
                }
                current = current.getParent();
            }
        } catch (e) {
            console.warn("Error checking lock status:", e);
        }
    }

    /**
     * Safe utility methods
     */
    _safeGetId(element) {
        try {
            return element && element.getId ? element.getId() : null;
        } catch (e) {
            return null;
        }
    }

    _safeGetName(element) {
        try {
            return element && element.getName ? element.getName() : null;
        } catch (e) {
            return null;
        }
    }

    _safeGetAttribute(element, attr) {
        try {
            return element && element.getAttribute ? element.getAttribute(attr) : null;
        } catch (e) {
            return null;
        }
    }

    _safeGetSelectedText(selection) {
        try {
            return selection && selection.getSelectedText ? selection.getSelectedText() : null;
        } catch (e) {
            return null;
        }
    }

    _safeGetStartElement(selection) {
        try {
            return selection && selection.getStartElement ? selection.getStartElement() : null;
        } catch (e) {
            return null;
        }
    }

    _safeGetEndElement(selection) {
        try {
            return selection && selection.getEndElement ? selection.getEndElement() : null;
        } catch (e) {
            return null;
        }
    }

    _safeGetOuterHtml(element) {
        try {
            if (!element) return null;

            // Clone element to avoid modifying original
            const cloneEl = element.clone(true, true);

            // Remove 'active' class from the element itself
            if (cloneEl.classList && cloneEl.classList.contains('active')) {
                cloneEl.classList.remove('active');
            }

            return cloneEl.getOuterHtml ? cloneEl.getOuterHtml() : null;
        } catch (e) {
            return element ? element.$.outerHTML : "";
        }
    }


    _isElementLocked(element, options = {}) {
        options = options || {};
        try {
            if (!element) return false;

            if (options.check_closest && element.$) {
                var nativeEl = element.$;
                return !!nativeEl.closest('.para-locked');
            }

            return element.hasClass && element.hasClass("para-locked");
        } catch (e) {
            return false;
        }
    }

    /**
     * Event handling utilities
     */
    cancelEventAndAlert(event, selection = null, alertType = "ErrorLockedParaEdit") {
        if (event) {
            if (event.cancel) event.cancel();
            if (event.stop) event.stop();
        }

        const sel = selection || this.editor.getSelection();
        if (sel && sel.getSelectedText && sel.getSelectedText().length > 0) {
            if (typeof TOASTER_ALERT === 'function') {
                TOASTER_ALERT(alertType, {
                    type: "warning"
                });
            }
            try {
                sel.removeAllRanges();
            } catch (e) {
                console.warn("Failed to remove selection ranges:", e);
            }
        }
    }

    /**
     * Cache management
     */
    clearCache() {
        this._lastSelectionInfo = null;
        this._lastSelectionTime = 0;
    }

    setCacheTimeout(ms) {
        this._cacheTimeout = ms;
    }

    /**
     * Debug information
     */
    getDebugSummary() {
        const info = this.getSelectionInfo({
            useCache: false
        });
        return {
            hasSelection: info.hasSelection,
            isLocked: info.isLocked,
            isLockedByOther: info.isLockedByOther,
            elementCount: info.elementCount,
            rangeCount: info.rangeCount,
            blockCount: info.blocks.length,
            spansMultipleBlocks: info.spansMultipleBlocks,
            isEmpty: info.isEmpty,
            error: info.error,
            warnings: info.warnings,
            cacheAge: Date.now() - this._lastSelectionTime
        };
    }
}

/**
 * Auto-sync TOC/float active item while scrolling inside CKEditor iframe.
 * Reuses existing postNavigation('editor') flow to keep one source of truth.
 */
function setupEditorScrollSpySync(editor) {
    try {
        if (!editor || !editor.document || !editor.document.$) return;

        if (window.__editorScrollSpySync && typeof window.__editorScrollSpySync.destroy === 'function') {
            window.__editorScrollSpySync.destroy();
        }

        var doc = editor.document.$;
        var win = doc.defaultView || doc.parentWindow;
        if (!doc || !win) return;

        var ticking = false;
        var lastRun = 0;
        var throttleMs = 140;

        function getTrackedIds() {
            try {
                var tocNodes = document.querySelectorAll('#toc_list [data-id], #lof_list [data-id]');
                var ids = [];
                var seen = {};

                tocNodes.forEach(function(node) {
                    var id = node.getAttribute('data-id');
                    if (!id || seen[id]) return;
                    seen[id] = true;
                    ids.push(id);
                });

                return ids;
            } catch (err) {
                return [];
            }
        }

        function getBestVisibleNode() {
            var ids = getTrackedIds();
            if (!ids.length) return null;

            var topThreshold = 28;
            var bestAbove = null;
            var bestBelow = null;

            ids.forEach(function(id) {
                var el = doc.getElementById(id);
                if (!el) return;

                var rect = el.getBoundingClientRect();
                if (rect.bottom <= 0 || rect.top >= win.innerHeight) return;

                if (rect.top <= topThreshold) {
                    if (!bestAbove || rect.top > bestAbove.rect.top) {
                        bestAbove = {
                            el: el,
                            rect: rect
                        };
                    }
                } else if (!bestBelow || rect.top < bestBelow.rect.top) {
                    bestBelow = {
                        el: el,
                        rect: rect
                    };
                }
            });

            return (bestAbove ? bestAbove.el : (bestBelow ? bestBelow.el : null));
        }

        function syncActiveFromScroll(force) {
            try {
                if (typeof postNavigation !== 'function') return;

                var now = Date.now();
                if (!force && (now - lastRun) < throttleMs) return;
                lastRun = now;

                var target = getBestVisibleNode();
                if (!target || !target.id) return;

                if (window.__editorScrollSpySyncLastId === target.id) return;
                window.__editorScrollSpySyncLastId = target.id;

                postNavigation(target, 'editor', target.id);
            } catch (err) {
                if (typeof ErrorLogTrace === 'function') ErrorLogTrace('setupEditorScrollSpySync_sync', err.message);
            }
        }

        function onScroll() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(function() {
                ticking = false;
                syncActiveFromScroll(false);
            });
        }

        function addScrollListener(target, handler) {
            try {
                target.addEventListener('scroll', handler, {
                    passive: true
                });
            } catch (err) {
                target.addEventListener('scroll', handler, false);
            }
        }

        function removeScrollListener(target, handler) {
            try {
                target.removeEventListener('scroll', handler, {
                    passive: true
                });
            } catch (err) {
                target.removeEventListener('scroll', handler, false);
            }
        }

        addScrollListener(win, onScroll);
        addScrollListener(doc, onScroll);

        var primeTimer = setTimeout(function() {
            syncActiveFromScroll(true);
        }, 1200);

        window.__editorScrollSpySync = {
            trigger: function() {
                syncActiveFromScroll(true);
            },
            destroy: function() {
                clearTimeout(primeTimer);
                removeScrollListener(win, onScroll);
                removeScrollListener(doc, onScroll);
            }
        };
    } catch (err) {
        console.warn(err.message);
        if (typeof ErrorLogTrace === 'function') ErrorLogTrace('setupEditorScrollSpySync', err.message);
    }
}

document.addEventListener('DOMContentLoaded', function(event) {
    try {

        CKEDITOR.on('instanceReady', function(ev) {

            window._UnifiedSelectionUtils = new CKEditorSelectionUtils(ev.editor);

            // ── Wire Redux-style event store ─────────────────────────────────────
            if (window.CK_EDITOR_EVENTS_MODULE && typeof window.CK_EDITOR_EVENTS_MODULE.wireEditor === 'function') {
                window.CK_EDITOR_EVENTS_MODULE.wireEditor(ev.editor);
            }

            // ? https://stackoverflow.com/questions/29019398/disable-sorting-of-element-attributes
            ev.editor.dataProcessor.writer.sortAttributes = 0;
            ev.editor.dataProcessor.writer.selfClosingEnd = '/>';
            CKEDITOR.plugins.clipboard.preventDefaultDropOnElement(ev.editor.document);
            if (GlobalEditor.document && GlobalEditor.document.$.body) {
                GlobalEditor.document.$.body.setAttribute('data-gramm_editor', 'false');
                commonMethods.cleanTranslatorExtensions(ev.editor);
                if (IMPACT.USER_ENV_INFO.isFirefox) {
                    GlobalEditor.document.$.body.parentElement.style['scrollbar-width'] = 'thin';
                }
            }
            $('.cke_button.cke_button__strike').attr('title', 'Strikethrough (Ctrl+Shift+/)');
            $('.cke_button.cke_button__subscript').attr('title', 'Subscript (Ctrl+Shift++)');
            $('.cke_button.cke_button__superscript').attr('title', 'Superscript (Ctrl++)');
            $('.cke_button.cke_button__find').attr('title', 'Find and Replace');

            // ? Initially Save icon should be disabled - AN_02_DEC_22
            GlobalEditor.getCommand('saveimpact').setState(0);
            const IMS = IMPACT_SELECTION;
            setupEditorScrollSpySync(ev.editor);

            // Rebind when CKEditor recreates editable DOM (iframe/content reload).
            ev.editor.on('contentDom', function() {
                setupEditorScrollSpySync(ev.editor);
                setTimeout(function() {
                    if (window.__editorScrollSpySync && typeof window.__editorScrollSpySync.trigger === 'function') {
                        window.__editorScrollSpySync.trigger();
                    }
                }, 250);
            });

            // Refresh active TOC/float after content updates.
            ev.editor.on('afterSetData', function() {
                setTimeout(function() {
                    if (window.__editorScrollSpySync && typeof window.__editorScrollSpySync.trigger === 'function') {
                        window.__editorScrollSpySync.trigger();
                    }
                }, 350);
            });

            ev.editor.on('focus', function(e) {
                console.log("focus ready");
                // ? 27_DEC_22 - HANDLE - CURSOR RESTORE TEXT-AREA - SIVA_POINT#35
                CHECK_DIALOG_LAST_CURSOR_POSITION();
                if (IMPACT.USER_ENV_INFO.isFirefox) {
                    GlobalEditor.document.$.body.parentElement.style['scrollbar-width'] = 'thin';
                }
            });
            ev.editor.on('resize', function(e) {
                console.log(`REZISE ${e.name}`);
            });
            ev.editor.on('blur', function(e) {
                console.log(`lost the focus ${e.name}`);
            });
            ev.editor.on('doubleclick', function(evt) {
                // ? Disable image dialog for notes
                console.log('DBCLICK');
                if (window.paraLock && window.paraLock._isEnabled && window.paraLock._isElementLocked) {
                    const isLocked = window.paraLock._isElementLocked(evt.data.element, {
                        alertKey: "ErrorLockedParaEdit",
                        check_closest: true
                    });
                    if (isLocked) return;
                }

                const I = {
                    element: evt.data.element,
                    dom: evt.data.element.$,
                    domParent: evt.data.element.$.parentElement,
                    tag: evt.data.element.$.tagName,
                    IsInsert: evt.data.element.$.tagName == "INSERT",
                    data_name: evt.data.element.$.getAttribute('data-name'),
                    class_name: evt.data.element.$.getAttribute('class'),
                    dataname_Par: evt.data.element.$.parentElement.getAttribute('data-name'),
                    Is_Math: evt.data.element.$.closest("[math-type]") ? true : false
                };
                var IsTrue = false;
                // ? Edit Image
                if (I.tag === 'IMG') {
                    if (I.dom.closest(".fig")) {
                        // I.class_name && I.class_name != 'Wirisformula'
                        GlobalEditor.execCommand("REPLACE_FIG");
                        return false;
                    } else if (I.class_name == 'Wirisformula') {
                        var client = "";
                        try {
                            client = commonMethods.getClientCode({
                                format: "upper"
                            });
                        } catch (e) {}
                        client = client.toUpperCase();

                        if (/^(OHO|OSO|OXMEDO)$/.test(client)) {
                            return false;
                        }

                        GlobalEditor.execCommand('ckeditor_wiris_openFormulaEditor');
                        return false;
                    } else if (I.Is_Math) {}
                }
                var ClickElm = GetParentNde(I.element);
                if (ClickElm.hasAttribute('data-pi') && ClickElm.hasClass('delimt')) {
                    debug.warn("removeAllRanges_0");
                    GlobalEditor.getSelection().removeAllRanges();
                }
                if ($(ClickElm.$).hasClass('x')) {
                    // ? IMP_M21_0001
                    var range = GlobalEditor.createRange();
                    range.setEnd(ClickElm, 0);
                    GlobalEditor.getSelection().selectRanges([range]);
                }
                // Added link element class for full selection - RJ 18_Apr_25
                var findClass = ['kwd', 'given-names', 'surname', 'xref', 'NotMapped', 'title', 'term', 'def', 'email', 'link', 'uri', 'ext-link'];
                //  ? Including Abbr for Selection - 26/02/24 - RJ
                findClass.forEach((clx, ind) => {
                    if (!IsTrue) {
                        // ? after index get parent
                        IsTrue = hasDataName(ClickElm, clx, {
                            parentOnly: /term|def/gi.test(clx)
                        });
                    }
                });
                if (IsTrue) {
                    debug.warn("removeAllRanges_1");
                    GlobalEditor.getSelection().removeAllRanges();
                    GlobalEditor.getSelection().selectElement(I.element);
                }
                // if (typeof CITATION_POPUP != "undefined") CITATION_POPUP.GotoCaption(I);
                if (typeof IMPACT_SELECTION != "undefined") {
                    IMPACT_SELECTION.getInfo(ev.editor);
                }
                // ? double  click the keyword handle the toolbar
                // CKE_Handle.toolBar_SetState(ClickElm);
                // ? Safari double click highlight issue - 22.11.22
                if (IMPACT.USER_ENV_INFO.isSafari && typeof IMPACT_SELECTION != "undefined" && IMPACT_SELECTION.SEL_TEXT != '') {
                    GlobalEditor.document.getSelection().selectRanges([GlobalEditor.document.getSelection().getRanges()[0]]);
                }
            });
            ev.editor.on('dragstart', function(e) {
                ev.cancel();
                //e.dataTransfer.setData("Text", e.target.id);
            });
            ev.editor.on('dragend', function(e) {
                ev.cancel();
                //ev.dataTransfer.setData("Text", e.target.id);
            });
            ev.editor.on('drop', function(e) {
                ev.cancel();
            });

            ev.editor.on('lite:init', function(evt) {
                Trackchangeapi = evt.data.lite;
                lite_userId = evt.data.lite._config.userId;
                // console.log(['evt.data.lite  id==> ' + lite_userId, Trackchangeapi]);
            });
            if (lite_userId == undefined) {
                console.log('reassign lite_user_id all events');
                let temp_id = localStorage.getItem(`xmleditor:usercolor:${DOC_ID}`);
                lite_userId = temp_id ? temp_id : (Math.floor(1000 + Math.random() * 9000));
            } else {
                // lite_userId=null;
                console.log(Trackchangeapi);
            }
            ev.editor.on('beforePaste', function(evt) {});
            ev.editor.on('paste', function(evt) {
                var IMS = IMPACT_SELECTION;
                // ? COPY || PASTE from excel remove background color
                if (evt.data.type == 'html' && evt.data.dontFilter == true) {
                    //evt.data.dataValue=$(evt.data.dataValue).text();
                }
                // ? Handling the copy and paste
                if ((evt.data.dataValue.trim() == 'null') && (LAST_CLIPBOARD_EVENT == 'cut')) {
                    evt.data.dataValue = LAST_CUT_VALE;
                }
                if (IMS.RG_INFO.aLinkCount > 0 || IMS.RG_INFO.iLinkCount > 0 || IMS.RESTRICT_CLIENT_IS) {
                    if (IMS.RESTRICT_CLIENT_IS) {
                        TOASTER_ALERT('curOptRevertError', {
                            type: 'warning'
                        });
                    } else {
                        AlertNewDialog.fire('warning', "Warning", 'Ignore_KeyEvent_XREFS', 'OK', '', true, {
                            override: false
                        });
                    }
                    evt.stop();
                    evt.cancel();
                    return true;
                }
                let IsHTMLPaste = evt.data.dataTransfer._.data['text/html'],
                    data = iGetFragment(IsHTMLPaste ? IsHTMLPaste : evt.data.dataValue, {
                        tag: 'span'
                    }).innerHTML,
                    newValue = PasteFilter.fire(data, {
                        event_from: 'shortcut',
                        e: evt
                    });
                LAST_PASTE_VALE = newValue;
                if (IMS.IsRef && !EVENT_IN_REF_SECTION.FIRE_PASTE(evt, newValue, {})) {
                    evt.stop();
                    evt.cancel();
                    return true;
                }
                evt.data.dataValue = (newValue);
            });
            ev.editor.on('afterPaste', function(evt) {
                console.log('afterPaste');
                var parent = GlobalEditor.getSelection().getStartElement().$.parentNode;
                if (parent.parentNode.className == 'name' && parent.hasAttribute('data-track-changes-ignore')) {
                    parent.childNodes.forEach(element => {
                        if (element.nodeName == 'INSERT') {
                            element.outerHTML = element.innerHTML;
                        } else if (element.nodeName == 'DEL') {
                            element.remove();
                        }
                    });
                }
                // ! TODO Handle
                PasteFilter.after_paste_check_citation();
            });
            ev.editor.on('fileUploadRequest', function(evt) {
                var fileLoader = evt.data.fileLoader;
                var formData = new FormData();
                xhr = fileLoader.xhr;
                xhr.open('POST', fileLoader.uploadUrl, true);
                xhr.setRequestHeader("appkey", localStorage.getItem('xmleditor:appkey'));
                xhr.setRequestHeader("apikey", localStorage.getItem('xmleditor:apikey'));
                formData.append('tbl', 'files');
                formData.append('docid', DOC_ID);
                // formData.append('asoid', ASSOC_ID);
                formData.append('sopt', 'openstorage');
                formData.append('url', 'https://' + BACKEND_DOMAIN + '/IMPACT/');
                formData.append('file[]', fileLoader.file, fileLoader.fileName);
                fileLoader.xhr.send(formData);
                console.log(formData);
                evt.cancel();
            }, null, null, 4);

            GlobalEditor.on('afterSetData', function(e) {
                isSetDataAfter = true;
                var CK_BODY = GlobalEditor.document.$.body;
                if (CK_BODY) {
                    if (IMPACT.USER_ENV_INFO.isFirefox) {
                        CK_BODY.parentElement.style['scrollbar-width'] = 'thin';
                    }
                    // ? To disable grammar after restoring the html file - siva point - 01-SEP-23 - RJ
                    CK_BODY.setAttribute('data-gramm_editor', 'false');
                }

                if (window.queryModule && typeof window.queryModule.handleAfterSetData === "function") {
                    try {
                        window.queryModule.handleAfterSetData();
                    } catch (err) {
                        console.warn("afterSetData execution failed:", err);
                    }
                }
            });

            GlobalEditor.on("selectionChange", function(e) {
                try {
                    var IMS = IMPACT_SELECTION;
                    // ? Handle CK Toolbar Buttons
                    debug.log("selectionChange --> " + IMS.LAST_CURSOR.NODE_ID);
                    if (typeof OnClick_SelectionChange_Dialog_Event == "function") OnClick_SelectionChange_Dialog_Event(null, {
                        Pre_Check: true
                    }, e);

                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('selectionChange', err.message);
                }
            });

            GlobalEditor.addRemoveFormatFilter(function(element) {
                return !(element.is('span') && CKEDITOR.tools.isEmpty(element.getAttributes()));
            });
        });
        // ! RIGHT_CLICK_CONTEXT_MENU_HANDLE
        CKEDITOR.on('instanceReady', function(ev) {
            if (typeof GlobalEditor.removeMenuItem == 'function') {
                ['unlink', 'link', ACCEPT, REJECT].forEach((menu) => {
                    GlobalEditor.removeMenuItem(menu);
                });
            }
            if (GlobalEditor.contextMenu && (!isSetDataAfter)) {
                GlobalEditor.contextMenu.addListener(function(element, selection, elementPath) {

                    // ? GET CURSOR INFO
                    var CUR_SELECT = {
                        RG_INFO: {
                            divCount: 0
                        }
                    };
                    debug.log('GLOBAL_JS--000');
                    var [IMS, eCUR] = [IMPACT_SELECTION, EDITOR_CURSOR];
                    // ? 15_MAR_2024_YA
                    if (!IMS.ElementPath.lastElement.equals(elementPath.lastElement)) IMS.getInfo();
                    //Safari Selection issue - 30_DEC_22_AN
                    if ((IMPACT.USER_ENV_INFO.isSafari || CAN_SAFARI_CHECK_LOCAL) && IMS.NODE_CLAS != 'graphic' && IMP_SAFARI.SEL == '' && !IMS.IsMath) {
                        debug.log('_IsSafari-II-001');
                        if (GlobalEditor.getSelection().getSelectedText() == "" && !CAN_SAFARI_CHECK_LOCAL) return;
                        debug.log('_IsSafari-II-002');
                        let range = selection.getRanges()[0],
                            bksafari = selection.createBookmarks(true),
                            SelElm = null,
                            checkNode = function(el, sibiling, sibiling2) {
                                try {
                                    if (!el) return false;

                                    let e = null;

                                    let loop = function(elInner) {
                                        try {
                                            let result = null;
                                            if (typeof elInner && elInner[sibiling] === "function") {
                                                result = elInner[sibiling]();
                                            }
                                            if (!result && typeof elInner && elInner[sibiling2] === "function") {
                                                result = elInner[sibiling2]();
                                            }
                                            return result;
                                        } catch (err) {
                                            console.warn(err.message);
                                            ErrorLogTrace('loop', err.message);
                                            return null;
                                        }
                                    };

                                    // Element node
                                    if (el.type === 1) {
                                        let tag = typeof el.getName == "function" && el.getName();
                                        e = el;
                                        if (tag === "a") {
                                            return el;
                                        } else if (tag === "span" && /cke/.test(el.$ && el.$.id)) {
                                            e = loop(el);
                                            return checkNode(e, sibiling, sibiling2);
                                        } else {
                                            return false;
                                        }
                                    } else if (
                                        // Text node
                                        el.type === 3 &&
                                        /\[|\(|\]|\)/.test(typeof el.getText == "function" && el.getText()) &&
                                        el.getText().trim().length === 1
                                    ) {
                                        e = loop(el);
                                        if (e) return checkNode(e, sibiling, sibiling2);
                                        return false;
                                    }

                                    return false;

                                } catch (err) {
                                    console.warn(err.message);
                                    ErrorLogTrace('==checkNode===', err.message);
                                    return false;
                                }
                            };
                        ['getNextNode', 'getPreviousNode'].forEach((node, idx, arr) => {
                            // debugger;
                            if (SelElm) return;
                            let el = range[node]();
                            if (idx !== 0 && !el) el = range[arr[idx - 1]]();
                            if (el) SelElm = checkNode(el, node, node.replace("Node", ""));
                        });
                        // if (bksafari.endNode) debugger;
                        //bksafari.endNode.remove();
                        debug.warn("removeAllRanges_safari");
                        GlobalEditor.getSelection().removeAllRanges();
                        range.moveToBookmark(bksafari[0]);
                        range.collapse(true);
                        range.select();
                        GlobalEditor.focus();
                        // GlobalEditor.insertText('text');
                        if (SelElm) {
                            let range = GlobalEditor.createRange();
                            range.setStartAt(SelElm, CKEDITOR.POSITION_BEFORE_START);
                            range.setEndAt(SelElm, CKEDITOR.POSITION_AFTER_END);
                            GlobalEditor.getSelection().selectRanges([range]);
                            IMP_SAFARI.CITE_EL = SelElm;
                        } else IMP_SAFARI.CITE_EL = null;
                        IMS.getInfo(GlobalEditor);
                        //}
                    }
                    GlobalEditor.updateElement();
                    //if (IMPACT_SELECTION) CUR_SELECT = IMPACT_SELECTION.getInfo(GlobalEditor);                    
                    //? Handle Note Selection
                    if (element.getAttribute('data-high') != undefined) {
                        element = element.getParent();
                    }
                    var range = GlobalEditor.getSelection().getRanges()[0];
                    range.collapse(true);
                    range.setStartAt(GlobalEditor.editable(), CKEDITOR.POSITION_AFTER_START);
                    var myNext = range.getNextEditableNode(),
                        mynode = element.getAscendant({
                            'div': 1
                        }),
                        _getAscend_A_true = (element.getAscendant('a', true)),
                        ELEM_TAG = element.getName(),
                        ELEM_ClS = element.$.getAttribute('data-name'),
                        showNoteBool = ((CUR_SELECT.RG_INFO.divCount == 1 && (['title']).includes(IMS.NODE_CLAS)) || (CUR_SELECT.RG_INFO.divCount == 0)) ? true : false,
                        ELEM_WIRIS = element.hasClass('Wirisformula'),
                        ELEM_PART = element.getParent(),
                        ELEM_PART_TAG = ELEM_PART.getName(),
                        ELEM_PART_ClS = ELEM_PART.$.getAttribute('data-name');
                    var link_Class_Arr = ['uri', 'email', 'ext-link', 'pub-id'];
                    if (!ELEM_ClS && ELEM_TAG == 'span' && link_Class_Arr.includes(element.$.className)) ELEM_ClS = element.$.className;
                    let IS_LINK = (ELEM_PART_TAG == 'span' || ELEM_TAG == 'span') && link_Class_Arr.includes(ELEM_ClS || ELEM_PART_ClS),
                        Math_Ascendant = element.getAscendant(function(el) {
                            return el && typeof el.getAttribute == "function" && /formula/.test(el.getAttribute('class') || el.getAttribute('data-name'));
                        });
                    // ? YA_02_DEC_2023 MATH_UPDATE

                    if (elementPath.contains('a') != null) {
                        let myXref = elementPath.contains('a');
                        let mRole = myXref.$.getAttribute('data-role');
                        if (mRole != undefined && mRole == 'aff') showNoteBool = false;
                    }
                    let findlist = element.find('a');
                    if (!_getAscend_A_true && ELEM_TAG == 'insert' && (findlist || ELEM_PART_ClS == 'xref') && ELEM_PART_ClS != 'p') {
                        let listlast = findlist.$.length == 0 ? 0 : findlist.$.length - 1;
                        _getAscend_A_true = ELEM_PART_TAG != 'a' ? findlist.$[listlast] : '';
                    }
                    // ! HYDERLINK ENABLE
                    if (IsContextMenu('linkGroup') && IS_LINK && (!mynode.hasClass('corresp'))) {
                        return;
                    }
                    //? edit/delete for all type of Citations
                    if (_getAscend_A_true && IsContextMenu('citeGroup') && !eCUR.IS_FRONT) {
                        return {};
                    }
                    // ! FRONT MATTER
                    // ? Here FM =0 ||  BODY = 1 ||BM =2 || Float =3 || IsBook && FN-GROUP = 4 || SECTION TITLE = 5
                    if (!!eCUR.IS_FRONT) {
                        var FRONT_RETURN = {};
                        if (!IMS.DEL_NODE) {
                            FRONT_RETURN.ADD_NEW_CMD = showNoteBool ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
                        }

                        return FRONT_RETURN;
                    }
                    // ! BODY MATTER                    
                    if (!!eCUR.IS_BODY) {}
                    // ! BACK MATTER
                    // ? 05_MAY/SEP_2023 - YA
                    if (IMS.NODE_TAG != 'IMG' && (!/graphic/gi.test(IMS.NODE_CLAS)) && !IMS.DEL_NODE) {
                        return {
                            addNote: CKEDITOR.TRISTATE_OFF
                        };
                    }
                });
            }
            InitialLoadDialog.updateProgress(8);
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('IMPACT_EDITOR-DOMContentLoaded', err.message);
    }
});

var iFIND_REPLACE = {
    // ! 1996922: Find and Replace last search text - 19_APR_2024_YA
    IgnoreParentClass: [],
    IgnoreParentClassDefault: ['.ext-link', '.uri', '.email'],
    trackTagName: ['insert', 'ins', 'del'],
    findHighSyn: 'span[data-cke-highlight]',
    replaceRestrict: false,
    IsTrackRangeBool: false,
    FullyLoaded: false,
    ShowLoopBool: false,
    template: {},
    IBOX: {},
    FIND_LIST: [],
    REPLACE_LIST: [],
    LOCAL_FIND_KEY: 'xmleditor:find_items',
    LOCAL_REPLACE_KEY: 'xmleditor:replace_items',
    IsIgnoreArea: function(e, ths) {
        try {
            let clone_contents = e.startContainer ? e.cloneContents() : false;
            let IsDomRange = e.startContainer ? true : false;
            e = IsDomRange ? e.startContainer : (e.document ? e.document : GlobalEditor.document);
            let findRange = IsDomRange ? e.$ : e.find(this.findHighSyntax).$[0],
                re_turn = false,
                FindResult = Array.from([].concat(this.IgnoreParentClassDefault, this.IgnoreParentClass)).some((query, idx, arr) => {
                    return findRange && $(findRange).parents(query).length || clone_contents && $(clone_contents.$).children(query).length ? !0 : !1;
                });
            if (FindResult) {
                TOASTER_ALERT('FIND_REPLACE_IGNORE', {
                    type: 'warning'
                });
                re_turn = true;
            }
            return re_turn;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('IsIgnoreArea', err.message);
        }
    },
    IsTrackRange: function(domRange, ths) {
        try {
            // ? SIVA
            this.IsTrackRangeBool = false;
            let re_turn = false,
                DOM_PARENT = domRange.startContainer.$.parentNode,
                DOM_PARENT_TAG = DOM_PARENT.localName;
            if (this.trackTagName.includes(DOM_PARENT_TAG)) re_turn = true;
            this.IsTrackRangeBool = re_turn;
            return re_turn;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('IsTrackRange', err.message);
        }
    },
    AddToTrack: function(bookmarks, range) {
        try {
            // Add attr (data-replace-text) to ins & del for track change accept & reject single click
            let re_turn = true,
                SEL = GlobalEditor.getSelection();
            if (!!range.startContainer && ['insert', 'del'].includes(range.startContainer.getName()) || ['insert', 'del'].includes(SEL.getStartElement().getName())) {
                IMPACT_SELECTION._SNAPSHOT({
                    lock: true
                });
                let changeTime = ['insert', 'del'].includes(range.startContainer.getName()) ? range.startContainer.getAttribute("data-time") : SEL.getStartElement().getAttribute("data-time");
                $(GlobalEditor.document.find('[data-time="' + changeTime + '"]').$).each(function() {
                    $(this).attr({
                        'data-group-action': 'true',
                        'data-track-code': 'replace-text-01'
                    });
                });
                IMPACT_SELECTION._SNAPSHOT({
                    unlock: true
                });
            }
            return re_turn;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('AddToTrack', err.message);
        }
    },
    HANDLE_SCROLL: function(self) {
        self = iFIND_REPLACE;
        try {
            let {
                find_input_filed,
                find_div_filed,
                divList
            } = self.IBOX;
            if (!divList) return;
            let contentDiv = divList.querySelector(".dropdown-content");
            if (contentDiv) contentDiv.classList[contentDiv.childElementCount > 3 ? 'add' : 'remove']("expend");
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('HANDLE_SCROLL', err.message);
        }
    },
    payload: function() {
        try {
            return {
                "tbl": "UserPreference",
                "find": {
                    "recordtype": "findItems",
                    "username": USER_INFO.MAIL_ID,
                    "docid": DOC_ID
                }
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('payload', err.message);
        }
    },

    SET_LIST_RES: function(response, self) {
        self = iFIND_REPLACE;
        try {
            debug.log(JSON.stringify(response));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SET_LIST_RES', err.message);
        }
    },
    GET_LIST_RES: function(response, Options = {}, self) {
        self = iFIND_REPLACE;
        try {
            var json = self.payload();
            if (typeof Options.Init == 'boolean' && Options.Init == true) {
                commonfn.callajax(json, 'GET_LIST_RES', API_GET_ADMINDOCS, self);
                if (!self.FullyLoaded) {
                    self.Init();
                }
            } else if (response.data && response.data.length > 0) {
                [self.LOCAL_FIND_KEY, self.LOCAL_REPLACE_KEY].forEach(getKey => {
                    let recent = localStorage.getItem(getKey),
                        split_key = getKey.split(/:|_/)[1],
                        join_key = split_key.concat('_', 'LIST'),
                        arr_key = (join_key.toLocaleUpperCase()),
                        string = "";
                    self[arr_key] = response.data[0][(join_key.toLocaleLowerCase())] || [];
                    string = JSON.stringify(self[arr_key]);
                    if (string != recent) {
                        localStorage.setItem(getKey, string);
                    }
                });

                // let data = this.FIND_LIST = response.data[0].search_list,
                //     recent = localStorage.getItem(this.LOCAL_FIND_KEY),
                //     string = JSON.stringify(this.FIND_LIST)
                // if (string != recent) {
                //     localStorage.setItem(this.LOCAL_FIND_KEY, string);
                // }

            } else if (response.data.length == 0) {
                debug.log('no record found for search items');
                let defaultData = GET_JSON("default");
                json = Object.assign(json, {
                    "find_list": [],
                    "replace_list": [],
                    "recordtype": json.find.recordtype
                }, defaultData);
                delete json.find;
                commonfn.callajax(json, 'SET_LIST_RES', API_UPDATE_INSERT, self);
            }
        } catch (err) {
            debug.log(err.message);
            ErrorShareMail('GET_LIST_RES', err.message);
        }
    },
    GET_LIST: function(canDelete, findItem, replaceItem, Options = {}, self) {
        self = iFIND_REPLACE;
        try {
            if (findItem || replaceItem) {
                let current_item = findItem ? findItem : replaceItem,
                    current_list = self[findItem ? 'FIND_LIST' : 'REPLACE_LIST'],
                    txt = (typeof current_item != "string") ? (current_item.parentElement.querySelector('.item').textContent) : current_item,
                    updateDatabase = false;

                if (typeof txt === 'string') txt = txt.trim();
                if (!txt) return {
                    updateDatabase: false,
                    current_list: current_list
                };

                let index = current_list.indexOf(txt);

                if (index > -1 && canDelete) {
                    // ? remove from the list
                    current_list.splice(index, 1);
                    updateDatabase = !0;
                } else if (!canDelete) {
                    // ? push new items array
                    if (index == -1) {
                        current_list.push(txt);
                        updateDatabase = !0;
                    } else if (index > -1 && index < current_list.length - 1) {
                        // Only move and update if not already at the top (end of list)
                        current_list.push(current_list.splice(index, 1)[0]);
                        updateDatabase = !0;
                    }

                    // Limit history to 20 items
                    if (current_list.length > 20) {
                        current_list.shift();
                        updateDatabase = !0;
                    }
                }
                return {
                    updateDatabase: updateDatabase,
                    current_list: current_list
                };
            }
            return {
                updateDatabase: false,
                current_list: []
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_LIST', err.message);
        }
    },
    RECORD_HANDLE: function(method, findItem, replaceItem, Options = {}, self) {
        self = iFIND_REPLACE;
        try {
            var json = Object.assign({}, self.payload()),
                IsDelete = ("remove" == method);
            if (IsDelete) {
                findItem.closest("a").remove();
            } else {
                debug.log("adding new search entry");
            }
            self.HANDLE_SCROLL();

            var resFind = self.GET_LIST(IsDelete, findItem, null);
            var updateDatabase = resFind.updateDatabase;
            var find_list = resFind.current_list;

            var replace_list = null;
            if (replaceItem) {
                var resReplace = self.GET_LIST(IsDelete, null, replaceItem);
                replace_list = resReplace.current_list;
                updateDatabase = updateDatabase || resReplace.updateDatabase;
            }

            if (updateDatabase) {
                let objectOne = {
                    "find_list": find_list
                };
                localStorage.setItem(self.LOCAL_FIND_KEY, JSON.stringify(self.FIND_LIST));

                if (replace_list) {
                    objectOne["replace_list"] = replace_list;
                    localStorage.setItem(self.LOCAL_REPLACE_KEY, JSON.stringify(self.REPLACE_LIST));
                }

                json.update = Object.assign({}, objectOne);
                commonfn.callajax(json, 'SET_LIST_RES', API_FIND_UPDATE_INSERT, self);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('RECORD_HANDLE', err.message);
        }
    },
    GET_SET_FIELD: function(self) {
        self = iFIND_REPLACE;
        try {
            let startupPage = self.ck_dialog._.currentTabId,
                patternFieldId = (startupPage == 'find' ? 'txtFindFind' : 'txtFindReplace');
            return self.ck_dialog.getContentElement(startupPage, patternFieldId);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_FIELD', err.message);
        }
    },
    EVENT_INVOKE: function(divGroup, self) {
        self = iFIND_REPLACE;
        try {
            let {
                find_input_filed,
                find_div_filed,
                divList,
                contentList
            } = self.IBOX;
            divGroup = divGroup ? divGroup : divList;
            if (!divGroup) return;
            divGroup.querySelectorAll("a,i").forEach(node => {
                let isRemoveBtn = /times/gi.test(node.className);
                node.onclick = function(e) {
                    try {
                        if (isRemoveBtn) {
                            self.RECORD_HANDLE('remove', e.target);
                            return EVT_RETURN(e);
                        } else {
                            let drop_down = e.target.closest('.searchItems');
                            if (drop_down && drop_down.previousElementSibling) {
                                let field = drop_down.previousElementSibling.querySelector("input");
                                if (field) {
                                    field.value = e.target.textContent;
                                    self.EnableDisableBtns(self.ck_dialog, self.ck_dialog._.currentTabId);
                                }
                                divList.classList.remove("show");
                            }
                        }
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('event_onclick', err.message);
                    }
                };
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('EVENT_INVOKE', err.message);
        }
    },
    SHOW_HISTORY: function(dialog, tab, isEmpty, Options = {}, self) {
        self = iFIND_REPLACE;
        if (!self.ShowLoopBool) return;
        if (!tab) tab = dialog._.currentTabId;
        if (typeof isEmpty == "undefined" && tab == "find") isEmpty = (dialog.getValueOf(tab, 'txtFindFind') == "");
        try {
            if (!self.FullyLoaded) {
                self.Init();
            }
            let {
                find_input_filed,
                find_div_filed,
                divList,
                contentList
            } = self.IBOX;
            var inputObj = dialog.getContentElement(tab, tab == "find" ? 'txtFindFind' : 'txtFindReplace'),
                inputItem = (Options.target ? Options.target : document.querySelector(`[id = "${inputObj._.inputId}"]`)),
                inputParent = inputItem.parentElement,
                inputRoot = inputParent.parentElement,
                ItemsArray = [...self[Options.target ? 'REPLACE_LIST' : 'FIND_LIST']];
            if (ItemsArray.length == 0) return;
            if (inputItem.closest(".cke_dialog_contents")) {
                let exists = inputItem.closest(".cke_dialog_contents").querySelector('.searchItems');
                if (exists) exists.remove();
                if (!isEmpty) return;
            }
            if ((inputItem && inputItem.value == "")) {
                if (!inputParent.nextElementSibling) inputParent.after(iGetFragment(self.template['drop_down_root']));
                self.IBOX.divList = divList = inputRoot.querySelector('.searchItems');
                self.IBOX.contentList = contentList = inputRoot.querySelector('.dropdown-content');
                if (contentList) {
                    contentList.innerHTML = "";
                    ItemsArray.reverse().map((item, idx) => {
                        let frag = iGetFragment(`<a class= "dropdown-item"><span class="item" title="${item}">${item}</span><i class="times" title="remove"></i></a>`);
                        contentList.append(frag);
                        if (idx > 2) {
                            contentList.classList.add("expend");
                        }
                    });
                    divList.classList.add("show");
                }
                self.EVENT_INVOKE(contentList);
            } else if (!inputItem) {
                setTimeout(self.SHOW_HISTORY, 250);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SHOW_HISTORY', err.message);
        }
    },
    showLoop: function(dialog, tab, finder, self) {
        self = iFIND_REPLACE;
        self['ck_dialog'] = dialog;
        self['tab'] = tab;
        self['finder'] = finder;
        try {
            if (!self.FullyLoaded) {
                self.Init();
            }
            setTimeout(function() {
                self.IBOX['find_input_filed'] = document.querySelector(self.find_input_selector);
                self.IBOX['find_div_filed'] = document.querySelector(self.find_div_selector);
                self.ShowLoopBool = true;
                self.SHOW_HISTORY(self['ck_dialog'], self['tab']);
            }, 350);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('showLoop', err.message);
        }
    },
    Init: function(evt = {}, self) {
        self = this;
        try {
            if (!this.FullyLoaded) {
                self.find_div_selector = 'div.cke_dialog_ui_input_text';
                self.find_input_selector = 'input.cke_dialog_ui_input_text';
                self.template = {
                    'drop_down_root': `<div class="dropdown-menu show searchItems" aria-labelledby="searchItems" id="searchItems"><div class="dropdown-content"></div></div>`
                };
                // ?  06_MAY_2023 - YA  - MAIL ERROR
                let userKey = ROLE_IDS[USER_INFO.ROLE_ID].Restrict_Selector;
                let SELECTOR = (I_CONFIG ? (I_CONFIG.querySelector(userKey) ? I_CONFIG.querySelector(userKey).getAttribute('FindReplace') : []) : []);
                this.IgnoreParentClass = !!SELECTOR && SELECTOR.length > 0 ? SELECTOR.split(",") : [];
                this.FullyLoaded = true;
                debug.log("F_R_IgnoreParentClass" + this.IgnoreParentClass);
                //self.dialog = CKEDITOR.dialog._.currentTop.definition;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('iFIND_REPLACE_Init', err.message);
        }
    }
};