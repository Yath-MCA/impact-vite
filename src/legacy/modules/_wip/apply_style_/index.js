/**
 * ApplyStyleModule — migrated from ApplyStyle.js (C2 hybrid)
 * Phase 2: panel enable/disable driven by style-rules.json (engine inlined; no JS imports).
 * Phase 3: scoped offscreen DOM via resolveApplyStyleScopeRoot (books avoid full get/set).
 */

/**
 * Resolve offscreen HTML + write-back mode for Apply Style.
 * Books must not default to full-document get/set.
 * @param {{
 *   isJournal: boolean,
 *   cursorNode: Element|null,
 *   editorGetData: function(): string,
 *   curChapter: {id: string}|null,
 *   curChapterData: string|null
 * }} options
 * @returns {{ mode: string, html?: string, replaceDiv?: boolean, replaceDivId?: string|null, rootNode?: *, reason?: string }}
 */
function resolveApplyStyleScopeRoot(options) {
    const isJournal = options.isJournal;
    const cursorNode = options.cursorNode;
    const editorGetData = options.editorGetData;
    const curChapter = options.curChapter;
    const curChapterData = options.curChapterData;

    if (isJournal) {
        return {
            mode: 'full',
            html: typeof editorGetData === 'function' ? editorGetData() : '',
            replaceDiv: false,
            replaceDivId: null,
            rootNode: null
        };
    }

    if (curChapter && curChapter.id && curChapterData) {
        return {
            mode: 'chapter',
            html: curChapterData,
            replaceDiv: true,
            replaceDivId: curChapter.id,
            rootNode: curChapter
        };
    }

    let root = null;
    if (cursorNode && typeof cursorNode.closest === 'function') {
        root = cursorNode.closest('.book-part') || cursorNode.closest('.named-book-part-body');
    }
    if (root && root.id) {
        return {
            mode: 'part',
            html: root.outerHTML,
            replaceDiv: true,
            replaceDivId: root.id,
            rootNode: root
        };
    }

    return { mode: 'refuse', reason: 'missing-book-scope' };
}

/** Direct child .title, falling back to any descendant .title. */
function findDirectTitle(el) {
    if (!el || !el.querySelector) return null;
    return el.querySelector(':scope > .title') || el.querySelector('.title') || null;
}

/** Active CKEditor instance (GlobalEditor, else maineditor). */
function getMainEditor() {
    if (typeof GlobalEditor !== 'undefined' && GlobalEditor) return GlobalEditor;
    if (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances && CKEDITOR.instances.maineditor) {
        return CKEDITOR.instances.maineditor;
    }
    return null;
}

/** Collect nextElementSibling chain starting after el. */
function nextElementSiblings(el) {
    const list = [];
    let sib = el && el.nextElementSibling;
    while (sib) {
        list.push(sib);
        sib = sib.nextElementSibling;
    }
    return list;
}

/** Apply a map of attribute name → value via setAttribute. */
function setAttrs(el, map) {
    if (!el || !map) return el;
    Object.keys(map).forEach((key) => {
        const value = map[key];
        if (value !== undefined && value !== null) {
            el.setAttribute(key, String(value));
        }
    });
    return el;
}

/**
 * Label pattern analysis for numbered headings (used by RE_STRUCTURE).
 */
function applyStyleAnalyzeTitleLabels(sections) {
    try {
        const mapped = Array.from(sections || []).map((node) => {
            try {
                const titleNode = findDirectTitle(node);
                const label = titleNode
                    ? (titleNode.getAttribute('data-label') || '')
                    : '';
                const hasUsername = !!(
                    (titleNode && titleNode.hasAttribute('data-username')) ||
                    (node && node.hasAttribute && node.hasAttribute('data-username'))
                );
                const skip = !label && hasUsername;
                const isRoman = typeof commonMethods !== 'undefined' &&
                    commonMethods.isRomanNumeral && commonMethods.isRomanNumeral(label);
                const isAlpha = /^[a-zA-Z]+$/.test(label || '');
                let pattern = 'numeric';
                if (isRoman) pattern = 'roman';
                else if (isAlpha) pattern = 'alphabetical';
                return {
                    node: titleNode,
                    label: label,
                    skip: skip,
                    isRoman: !!isRoman,
                    isAlpha: isAlpha,
                    pattern: pattern
                };
            } catch (innerErr) {
                console.warn('Error mapping node:', innerErr.message);
                return {
                    node: null,
                    label: null,
                    skip: true,
                    isRoman: false,
                    isAlpha: false,
                    pattern: 'numeric'
                };
            }
        });

        const allHaveLabels = mapped.every((item) => item.skip || !!item.label);
        const labeledCount = mapped.filter((item) => item.skip || !!item.label).length;
        const majorityLabeled = labeledCount > mapped.length / 2;
        const allAreRoman = mapped.every((item) => item.skip || item.isRoman);
        const allAreAlpha = mapped.every((item) => item.skip || item.isAlpha);
        const patternCount = mapped.reduce((acc, item) => {
            if (!item.skip && item.label) {
                acc[item.pattern] = (acc[item.pattern] || 0) + 1;
            }
            return acc;
        }, {});
        let majorPattern = 'numeric';
        let maxCount = 0;
        Object.keys(patternCount).forEach((pat) => {
            if (patternCount[pat] > maxCount) {
                maxCount = patternCount[pat];
                majorPattern = pat;
            }
        });
        return {
            mapped: mapped,
            allHaveLabels: allHaveLabels,
            isRoman: allAreRoman,
            isAlpha: allAreAlpha,
            majorityLabeled: majorityLabeled,
            pattern: majorPattern
        };
    } catch (err) {
        console.warn('analyzeTitleLabels failed:', err.message);
        ErrorLogTrace('applyStyleAnalyzeTitleLabels', err.message);
        return {
            mapped: [],
            allHaveLabels: false,
            majorityLabeled: false,
            isRoman: false,
            isAlpha: false,
            pattern: 'numeric'
        };
    }
}

function applyStyleGetLabText(root, Options) {
    try {
        Options = Options || {};
        if (!root) return '';
        if (Options.title) {
            const t = root.querySelector && root.querySelector('.title');
            return (typeof getTxt === 'function' && t) ? (getTxt(t) || '') : '';
        }
        const lab = root.querySelector && root.querySelector('.label');
        if (typeof getTxt === 'function' && lab) {
            const txt = getTxt(lab);
            if (txt) return txt;
        }
        const title = findDirectTitle(root);
        return (title && title.getAttribute('data-label')) || '';
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('applyStyleGetLabText', err.message);
        return '';
    }
}

const APPLY_STYLE_CODES = ['H1', 'H2', 'H3', 'P', 'EXTRACT', 'SOURCE'];

function applyStyleGetSiblingIndex(el) {
    if (!el || !el.parentElement) return -1;
    return Array.prototype.indexOf.call(el.parentElement.children, el);
}

function applyStyleGetQuoteParas(quoteEl) {
    if (!quoteEl) return [];
    return Array.from(quoteEl.children).filter((c) => c.className === 'p');
}

function applyStyleGetQuoteParaIndex(pEl) {
    const quote = pEl && pEl.parentElement;
    if (!quote || quote.className !== 'disp-quote') return -1;
    return applyStyleGetQuoteParas(quote).indexOf(pEl);
}

function applyStyleCompareOp(actual, op, expected) {
    switch (op) {
        case 'eq': return actual === expected;
        case 'neq': return actual !== expected;
        case 'gt': return actual > expected;
        case 'gte': return actual >= expected;
        case 'lt': return actual < expected;
        case 'lte': return actual <= expected;
        case 'in': return Array.isArray(expected) && expected.includes(actual);
        case 'notIn': return Array.isArray(expected) && !expected.includes(actual);
        default: return false;
    }
}

function applyStyleEvaluateWhen(conditions, ctx) {
    if (!conditions || !conditions.length) return true;
    return conditions.every((c) => applyStyleCompareOp(ctx[c.field], c.op, c.value));
}

function applyStyleIsInsideBody(el, rootSelector) {
    return !!(el && el.closest && el.closest(rootSelector || "div.body[data-name='body']"));
}

function applyStyleHasRestrictedAncestor(el, restrictedClasses) {
    let node = el && el.parentElement;
    while (node) {
        if (restrictedClasses.indexOf(node.className) !== -1) return true;
        if (node.className === 'body' && node.getAttribute('data-name') === 'body') break;
        node = node.parentElement;
    }
    return false;
}

function applyStyleBuildCursorContext(curElement, options) {
    options = options || {};
    const restricted = options.restrictedParentClasses || [];
    const parent = curElement && curElement.parentElement;
    const parentClass = (parent && parent.className) || '';
    const quoteParas = parentClass === 'disp-quote' ? applyStyleGetQuoteParas(parent) : [];
    const ims = typeof IMPACT_SELECTION !== 'undefined' ? IMPACT_SELECTION : null;

    return {
        element: curElement,
        elementClass: (curElement && curElement.className) || '',
        tagName: (curElement && curElement.tagName) || '',
        parentClass: parentClass,
        insideBody: applyStyleIsInsideBody(curElement, options.rootSelector),
        inRestrictedParent: applyStyleHasRestrictedAncestor(curElement, restricted),
        isListItem: curElement && curElement.tagName === 'LI',
        inFormula: !!(ims && ims.PARENT_CLAS === 'inline-formula'),
        inTableFoot: !!(ims && (
            ims.PARENT_CLAS === 'table-wrap-foot' ||
            ims.G_PARENT_CLAS === 'table-wrap-foot'
        )),
        siblingIndex: applyStyleGetSiblingIndex(curElement),
        quoteParaIndex: applyStyleGetQuoteParaIndex(curElement),
        quoteParaCount: quoteParas.length,
        prevElmClass: (curElement && curElement.previousElementSibling && curElement.previousElementSibling.className) || null,
        headLevel: parseInt(
            (parent && parent.getAttribute && parent.getAttribute('data-levels')) ||
            (curElement && curElement.getAttribute && curElement.getAttribute('data-levels')) ||
            '0',
            10
        ),
        showContextGroup: options.showContextGroup !== false,
        headLimit: options.headLimit || 6
    };
}

function applyStyleMatchContext(ctx, matchDef) {
    if (!matchDef) return false;
    if (matchDef.insideBody === true && !ctx.insideBody) return false;
    if (matchDef.insideBody === false && ctx.insideBody) return false;
    if (matchDef.inRestrictedParent === true && !ctx.inRestrictedParent) return false;
    if (matchDef.elementClass && ctx.elementClass !== matchDef.elementClass) return false;
    if (matchDef.parentClass && ctx.parentClass !== matchDef.parentClass) return false;
    if (matchDef.tagName && ctx.tagName !== matchDef.tagName) return false;
    return true;
}

function applyStyleResolveActive(activeDef, ctx) {
    if (!activeDef) return null;
    if (Array.isArray(activeDef)) {
        if (activeDef.indexOf('P') !== -1 && ctx.elementClass === 'p' && ctx.parentClass !== 'disp-quote') return 'P';
        if (activeDef.indexOf('EXTRACT') !== -1 && ctx.parentClass === 'disp-quote' && ctx.elementClass === 'p') return 'EXTRACT';
        if (activeDef.indexOf('SOURCE') !== -1 && ctx.elementClass === 'attrib') return 'SOURCE';
        return activeDef[0] || null;
    }
    if (activeDef.rule === 'dynamicHeadingLevel' && ctx.elementClass === 'title') {
        const lvl = ctx.headLevel || parseInt(
            (ctx.element && ctx.element.getAttribute && ctx.element.getAttribute('data-levels')) || '1',
            10
        );
        return 'H' + lvl;
    }
    return null;
}

function applyStyleHeadLevelValidationEnabled(ctx, targetLevel) {
    if (!ctx.showContextGroup) return false;
    if (ctx.parentClass !== 'sec') return false;

    const curHeadLevel = parseInt(
        (ctx.element && ctx.element.parentElement && ctx.element.parentElement.getAttribute('data-levels')) || '0',
        10
    );
    const paras = Array.from((ctx.element && ctx.element.parentElement && ctx.element.parentElement.children) || [])
        .filter((n) => n.className === 'p');
    const firstPara = paras[0];
    const lastPara = paras[paras.length - 1];
    const isFirst = firstPara === ctx.element;
    const isLast = lastPara === ctx.element;
    const diffCount = targetLevel - curHeadLevel;
    const singlePara = paras.length < 2;

    if (isLast) return false;
    if (isFirst) {
        if (curHeadLevel === targetLevel || diffCount !== 1) return false;
        if (diffCount === 1 && singlePara) return false;
        return true;
    }
    return [-1, 0, 1].indexOf(diffCount) !== -1;
}

function applyStyleHeadingLevelChangeEnabled(ctx, direction, headLimit) {
    if (!ctx.showContextGroup || ctx.elementClass !== 'title') return false;
    const curSec = ctx.element && ctx.element.parentElement;
    if (!curSec || curSec.className !== 'sec') return false;

    const curLevel = parseInt(curSec.getAttribute('data-levels') || '1', 10);
    const curPar = curSec.parentElement;
    const secs = curPar ? Array.from(curPar.querySelectorAll(':scope > div.sec')) : [];
    const curInd = secs.indexOf(curSec);

    let canUp = false;
    let canDown = false;
    let sib = curSec.previousElementSibling;
    while (sib) {
        if (['sec', 'p', 'disp-quote'].indexOf(sib.className) !== -1) {
            canUp = true;
            if (curInd !== 0 && curSec.querySelector('.p')) canDown = true;
            break;
        }
        sib = sib.previousElementSibling;
    }

    if (direction === 'up') return curLevel !== 1 && canUp;
    if (direction === 'down') return curLevel < (headLimit || ctx.headLimit || 6) && canDown;
    if (direction === 'current') return true;
    return false;
}

function applyStyleResolveEnabledValue(def, styleCode, ctx, headLimit) {
    if (def === true) return true;
    if (def === false) return false;
    if (def && def.when) return applyStyleEvaluateWhen(def.when, ctx);
    if (def && def.rule === 'headLevelValidation') {
        return applyStyleHeadLevelValidationEnabled(ctx, def.params && def.params.targetLevel);
    }
    if (def && def.rule === 'headingLevelChange') {
        const fallbackDir = { H1: 'up', H2: 'current', H3: 'down' };
        return applyStyleHeadingLevelChangeEnabled(
            ctx,
            (def.params && def.params.direction) || fallbackDir[styleCode],
            headLimit
        );
    }
    return false;
}

function applyStyleAllDisabledState() {
    return APPLY_STYLE_CODES.reduce((acc, code) => {
        acc[code] = { enabled: false, active: false };
        return acc;
    }, {});
}

/**
 * Evaluate style-rules.json against cursor element. Pure; no module import.
 * @param {object} rulesJson
 * @param {Element|null} curElement
 * @param {{ showContextGroup?: boolean, headLimit?: number }} options
 */
function applyStyleEvaluateRules(rulesJson, curElement, options) {
    options = options || {};
    if (!rulesJson || !curElement) {
        return { contextId: null, ctx: null, styles: applyStyleAllDisabledState() };
    }

    const ctx = applyStyleBuildCursorContext(curElement, {
        restrictedParentClasses: (rulesJson.scope && rulesJson.scope.restrictedParentClasses) || [],
        rootSelector: rulesJson.scope && rulesJson.scope.rootSelector,
        showContextGroup: options.showContextGroup,
        headLimit: options.headLimit
    });

    const order = (rulesJson.validation && rulesJson.validation.contextOrder) || [];
    const contexts = rulesJson.contexts || [];

    for (let i = 0; i < order.length; i += 1) {
        const ctxId = order[i];
        let def = null;
        for (let j = 0; j < contexts.length; j += 1) {
            if (contexts[j].id === ctxId) {
                def = contexts[j];
                break;
            }
        }
        if (!def || !applyStyleMatchContext(ctx, def.match)) continue;

        const activeCode = applyStyleResolveActive(def.active, ctx);
        const state = applyStyleAllDisabledState();
        APPLY_STYLE_CODES.forEach((code) => {
            const enabledDef = def.enabled && def.enabled[code];
            state[code] = {
                enabled: applyStyleResolveEnabledValue(enabledDef, code, ctx, options.headLimit),
                active: activeCode === code
            };
        });
        return { contextId: def.id, ctx: ctx, styles: state };
    }

    return { contextId: null, ctx: ctx, styles: applyStyleAllDisabledState() };
}

function applyStyleSyncPanelFromEvaluation(styleList, evaluation) {
    const list = styleList || [];
    if (!list.forEach) return;

    if (!evaluation) {
        list.forEach((el) => {
            el.classList.remove('active');
            el.classList.add('disabled');
        });
        return;
    }

    list.forEach((el) => {
        const code = el.getAttribute('data-Style');
        const state = evaluation.styles && evaluation.styles[code];
        el.classList.remove('active', 'disabled');
        if (!state) {
            el.classList.add('disabled');
            return;
        }
        if (state.active) {
            el.classList.add('active');
        } else if (!state.enabled) {
            el.classList.add('disabled');
        }
    });
}

class ApplyStyleModule extends BaseModule {
    constructor(name = 'ApplyStyleModule', errorTracker = null, options = {}) {
        super(name, errorTracker, {
            DOM_ID: 'APPLY_STYLE_DOM',
            ...options
        });
        this._id = 'ApplyStyleDialog';
        this.numberedHeadings = false;
        this.IBOX = this.IBOX || {};
        this._styleRules = null;
        this._lastStyleEvaluation = null;
        this._bindModuleMethods();
    }

    _bindModuleMethods() {
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== 'constructor' && typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        });
    }

    /**
     * Initialize rules from supportingFiles (window.APPLY_STYLE_RULES). Call from initLoop only.
     */
    _initStyleRulesEngine() {
        const rules = (typeof window !== 'undefined' && window.APPLY_STYLE_RULES)
            ? window.APPLY_STYLE_RULES
            : null;
        if (!rules || !rules.contexts) {
            console.warn('APPLY_STYLE_RULES missing or invalid');
            ErrorLogTrace('_initStyleRulesEngine', 'APPLY_STYLE_RULES missing');
            this._styleRules = null;
            return false;
        }
        this._styleRules = rules;
        if (rules.scope && Array.isArray(rules.scope.restrictedParentClasses)) {
            this.M_SCOPE.RESTRICT_CLASS = rules.scope.restrictedParentClasses.slice();
        }
        return true;
    }

    _evaluateCursorStyles(curElement) {
        if (!this._styleRules || !curElement) {
            this._lastStyleEvaluation = {
                contextId: null,
                ctx: null,
                styles: applyStyleAllDisabledState()
            };
            return this._lastStyleEvaluation;
        }
        this._lastStyleEvaluation = applyStyleEvaluateRules(this._styleRules, curElement, {
            showContextGroup: !!(this.M_CONFIG && this.M_CONFIG.SHOW_CONTEXT_GROUP),
            headLimit: (this.M_CONFIG && this.M_CONFIG.HEAD_LIMIT) || 6
        });
        return this._lastStyleEvaluation;
    }

    _syncStylePanel() {
        applyStyleSyncPanelFromEvaluation(
            this.IBOX && this.IBOX.STYLE_LIST,
            this._lastStyleEvaluation
        );
    }

    initLoop() {
        try {
            window.APPLY_STYLE_MODULE = this;
            this.IBOX = this.IBOX || {};
            this.numberedHeadings = false;
            this.M_CONFIG.HEAD_LIMIT = parseInt(GET_TYPE_CONFIG_QUERY('heading', 'maximum', {
                journalBased: true
            }), 10);
            this.M_CONFIG.HEADING = this.G_FUN.GET_CONFIG_ITEM('heading', {
                CONVERT_JSON: true,
                attr: true,
                children: true,
                keyUpperCase: true,
                journalBased: true
            });
            this.M_CONFIG.STYLE_CONFIG = this.G_FUN.GET_CONFIG_ITEM('styles', {
                CONVERT_JSON: true,
                children: true,
                keyUpperCase: true
            });
            this.M_CONFIG.SHOW_CONTEXT_GROUP = IsContextMenu('headgroup');
            if (!this.M_CONFIG.SHOW_CONTEXT_GROUP && GET_TYPE_CONFIG_QUERY('heading', 'notallowed') === 'yes') {
                this.M_CONFIG.SHOW_CONTEXT_GROUP = true;
            }
            this.M_SCOPE.LAST_SEL_ELM = null;
            this.M_SCOPE.RESTRICT_CLASS = ['caption', 'boxed-text', 'fig', 'td', 'tr', 'disp-formula', 'inline-formula'];
            this.M_SCOPE.LABEL_SELECTOR = ['.title[data-label]', '.title>.label']
                .map((el) => 'div.body div.sec ' + el)
                .join(',');

            this._initStyleRulesEngine();

            this.IBOX.STYLE_LIST = this.Panel ? this.Panel.querySelectorAll('span.iStyle') : [];
            this.IBOX.LAST_STYLE = this.Panel ? this.Panel.querySelector('#li6') : null;
            if (this.IBOX.STYLE_LIST && this.IBOX.STYLE_LIST.forEach) {
                this.IBOX.STYLE_LIST.forEach((el) => {
                    el.classList.add('disabled');
                    el.onclick = (e) => {
                        if (e.currentTarget.className.match(/active|disabled/)) return;
                        if (typeof this.fireStyle === 'function') this.fireStyle(e.currentTarget);
                    };
                });
            }

            const btn = document.querySelector('#menuapplystyle a');
            if (btn) {
                btn.onclick = (e) => {
                    if (e && e.preventDefault) e.preventDefault();
                    if (typeof window.openApplyStyleDialog === 'function') {
                        window.openApplyStyleDialog();
                    } else {
                        this.show();
                    }
                };
            }

            if (!this.numberedHeadings && this.M_CONFIG.HEADING) {
                this.numberedHeadings = this.M_CONFIG.HEADING.numbered === 'yes';
            }

            const editor = getMainEditor();
            if (editor) this.editorListener(editor);

            this.FullyLoaded = true;
            this.AutoInitiated = true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ApplyStyleModule.initLoop', err.message);
        }
    }

    /**
     * Register headgroup menu group + STYLE_FIRE_* / APPLY_STYLE commands on the editor.
     * Invoked from context.js after ensureApplyStyleModule (peer wiring pattern).
     */
    editorListener(editor) {
        try {
            if (!editor) editor = getMainEditor();
            if (!editor) return;

            if (editor._ && editor._.menuGroups && !editor._.menuGroups.headgroup) {
                editor.addMenuGroup('headgroup', 110);
            }

            const mod = this;
            ['APPLY_STYLE', 'CUR_LVL', 'ADD', 'UP', 'DOWN', 'DELETE'].forEach((CMD, IDX) => {
                const NEW_CMD = IDX === 0 ? CMD : 'STYLE_FIRE_' + CMD;
                editor.addCommand(NEW_CMD, {
                    exec: async function(ed) {
                        if (IDX === 0) {
                            if (typeof mod.DomManipulation === 'function' && mod.M_SCOPE) {
                                mod.DomManipulation(
                                    mod.M_SCOPE.newElem,
                                    mod.M_SCOPE.curElement,
                                    mod.M_SCOPE.StyleMap,
                                    mod.M_SCOPE.curElementId
                                );
                            }
                            return;
                        }
                        if (IDX === 1) {
                            if (typeof debug !== 'undefined' && debug.log) debug.log('-STYLE_FIRE_CUR_LVL-');
                            return;
                        }
                        const type = CMD.toLowerCase();
                        if (typeof mod.headLevelOp === 'function') {
                            await mod.headLevelOp(type, ed);
                        } else {
                            console.warn('headLevelOp not ready (phase 3): ' + type);
                        }
                    }
                });
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ApplyStyleModule.editorListener', err.message);
        }
    }

    /**
     * Resolve .title node used by CTX_TITLE_SEC in style-rules.json.
     */
    _resolveHeadTitleElement(cursorNode) {
        if (!cursorNode) return null;
        if (cursorNode.className === 'title' && cursorNode.parentElement &&
            cursorNode.parentElement.className === 'sec') {
            return cursorNode;
        }
        const sec = cursorNode.closest ? cursorNode.closest('div.sec') : null;
        if (!sec) return null;
        return findDirectTitle(sec);
    }

    /**
     * Build CKEditor menu item defs for headgroup (labels from current level).
     * @returns {{ items: object, states: object }|null}
     */
    buildHeadgroupMenuItems(cursorNode) {
        try {
            const sec = cursorNode && cursorNode.closest ? cursorNode.closest('div.sec') : null;
            if (!sec || !sec.hasAttribute('data-levels')) return null;
            if (sec.parentNode && sec.parentNode.classList &&
                sec.parentNode.classList.contains('abstract')) {
                return null;
            }

            const cursorLvl = parseInt(sec.getAttribute('data-levels'), 10);
            const items = {
                ADD_LVL: {
                    label: 'Add Section',
                    command: 'STYLE_FIRE_ADD',
                    group: 'headgroup',
                    icon: '../assets/images/svg/ContextMenu/Add.svg',
                    order: 111
                },
                HIGH_LVL: {
                    label: 'Head ' + (cursorLvl - 1),
                    command: 'STYLE_FIRE_UP',
                    group: 'headgroup',
                    icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
                    order: 112
                },
                CUR_LVL: {
                    label: 'Head ' + cursorLvl,
                    command: 'STYLE_FIRE_CUR_LVL',
                    group: 'headgroup',
                    icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
                    order: 113
                },
                LOW_LVL: {
                    label: 'Head ' + (cursorLvl + 1),
                    command: 'STYLE_FIRE_DOWN',
                    group: 'headgroup',
                    icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
                    order: 114
                },
                DEL_LVL: {
                    label: 'Delete Section',
                    command: 'STYLE_FIRE_DELETE',
                    group: 'headgroup',
                    icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
                    order: 115
                }
            };

            return {
                items: items,
                states: this.getHeadgroupMenuState(cursorNode)
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ApplyStyleModule.buildHeadgroupMenuItems', err.message);
            return null;
        }
    }

    /**
     * Headgroup TRISTATE from style-rules.json (CTX_TITLE_SEC):
     * H1 → HIGH_LVL (up), H2 → CUR_LVL (current/label), H3 → LOW_LVL (down).
     */
    getHeadgroupMenuState(cursorNode) {
        const DIS = (typeof CKEDITOR !== 'undefined') ? CKEDITOR.TRISTATE_DISABLED : 0;
        const OFF = (typeof CKEDITOR !== 'undefined') ? CKEDITOR.TRISTATE_OFF : 1;
        const states = { CUR_LVL: DIS };

        try {
            if (!this._styleRules) {
                this._initStyleRulesEngine();
            }

            const titleEl = this._resolveHeadTitleElement(cursorNode);
            if (!titleEl) return states;

            const evaluation = this._evaluateCursorStyles(titleEl);
            const styles = (evaluation && evaluation.styles) || {};

            // Current level is display-only (legacy always disabled)
            states.CUR_LVL = DIS;

            if (styles.H1 && styles.H1.enabled) {
                states.HIGH_LVL = OFF;
            } else {
                const sec = titleEl.parentElement;
                const lvl = sec ? parseInt(sec.getAttribute('data-levels') || '1', 10) : 1;
                if (lvl !== 1) states.HIGH_LVL = DIS;
            }

            if (styles.H3 && styles.H3.enabled) {
                states.LOW_LVL = OFF;
            } else {
                const headLimit = (this.M_CONFIG && this.M_CONFIG.HEAD_LIMIT) || 6;
                const sec = titleEl.parentElement;
                const lvl = sec ? parseInt(sec.getAttribute('data-levels') || '1', 10) : 1;
                if (lvl < headLimit) states.LOW_LVL = DIS;
            }

            if (typeof IsContextMenu === 'function' && IsContextMenu('PI_Group') &&
                typeof IS_JOURNAL !== 'undefined' && !IS_JOURNAL) {
                states.Insert_PI = OFF;
            }
            if (typeof USER_INFO !== 'undefined' && USER_INFO.IS_ADMIN &&
                typeof IS_LOCAL_HOST !== 'undefined' && IS_LOCAL_HOST) {
                states.dummyMenu = OFF;
            }

            this._lastStyleEvaluation = evaluation;
            return states;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ApplyStyleModule.getHeadgroupMenuState', err.message);
            return states;
        }
    }

    /**
     * Head level UP/DOWN/ADD/DELETE with scoped DOM + numbered RE_STRUCTURE.
     */
    async headLevelOp(type, editor) {
        try {
            if (window.paraLock && window.paraLock.getLockedElementsByOthers) {
                const lockedInfo = window.paraLock.getLockedElementsByOthers();
                if (lockedInfo.byOthers && lockedInfo.byOthers.length > 0) {
                    if (typeof TOASTER_ALERT === 'function') {
                        TOASTER_ALERT('ErrorReStoreForCollab', { type: 'warning' });
                    }
                    return;
                }
            }

            let op = String(type || '').toLowerCase();
            if (typeof UP !== 'undefined' && type === UP) op = 'up';
            if (typeof DOWN !== 'undefined' && type === DOWN) op = 'down';
            if (typeof ADD !== 'undefined' && type === ADD) op = 'add';
            if (typeof DELETE !== 'undefined' && type === DELETE) op = 'delete';

            const appendHeadsAtLevel = function(node, nodeList, level) {
                if (!node || !nodeList) return;
                Array.from(nodeList).forEach((elm) => {
                    if (/sec/gi.test(elm.className) &&
                        String(level) === String(elm.getAttribute('data-levels'))) {
                        node.appendChild(elm);
                    }
                });
            };
            const demoteChildSections = function(nodeList) {
                if (!nodeList) return;
                Array.from(nodeList).forEach((elm) => {
                    if (elm.className === 'sec') {
                        const oldLevel = elm.getAttribute('data-levels');
                        const newLevel = parseInt(oldLevel, 10) - 1;
                        setAttrs(elm, { 'old-lvl': oldLevel, 'data-levels': String(newLevel) });
                        const title = findDirectTitle(elm);
                        if (title) {
                            setAttrs(title, { 'old-lvl': oldLevel, 'data-levels': String(newLevel) });
                        }
                        const childSecs = elm.querySelectorAll(':scope > div.sec');
                        if (childSecs.length > 0) demoteChildSections(childSecs);
                    }
                });
            };

            if (!editor) editor = getMainEditor();
            if (!editor || !editor.getSelection) return;

            if (typeof AutoSaveBool !== 'undefined') AutoSaveBool = false;

            const startEl = editor.getSelection().getStartElement();
            if (!startEl || !startEl.$) return;
            let liveSection = startEl.$.closest('div.sec');
            let walkGuard = 0;
            while (liveSection && liveSection.className !== 'sec') {
                liveSection = liveSection.closest('div');
                walkGuard += 1;
                if (walkGuard === 10) break;
            }
            if (!liveSection || liveSection.className !== 'sec') return;

            const sectionId = liveSection.getAttribute('id');
            const scope = this.loadScopedOffscreen(liveSection);
            if (!scope) {
                if (typeof AutoSaveBool !== 'undefined') AutoSaveBool = true;
                return;
            }

            const section = this.iDOM.querySelector('[id="' + sectionId + '"]');
            if (!section) {
                ErrorLogTrace('headLevelOp', 'section missing in scoped DOM');
                if (typeof AutoSaveBool !== 'undefined') AutoSaveBool = true;
                return;
            }

            const sectionLevel = parseInt(section.getAttribute('data-levels'), 10);
            const parentSection = section.parentNode;
            const parentLevel = parseInt(
                parentSection && parentSection.getAttribute
                    ? parentSection.getAttribute('data-levels')
                    : '0',
                10
            );
            const nextSiblings = nextElementSiblings(section);
            const previousSibling = section.previousElementSibling;
            const children = Array.from(section.children || []);
            const childSections = Array.from(section.querySelectorAll(':scope > div.sec'));
            const nestWrapper = document.createElement('div');
            let newLevel;
            let needsRenumber = false;

            if (op === 'up' || op === 'down') {
                if (op === 'up') {
                    if (nextSiblings.length > 0) appendHeadsAtLevel(section, nextSiblings, sectionLevel);
                    if (children.length > 0) demoteChildSections(children);
                    newLevel = parentLevel;
                } else {
                    newLevel = sectionLevel + 1;
                    if (children.length > 0 && childSections.length > 0) {
                        appendHeadsAtLevel(nestWrapper, children, newLevel);
                    }
                }
                const trackUser = (typeof USER_INFO !== 'undefined') ? USER_INFO : {};
                setAttrs(section, {
                    'old-lvl': String(sectionLevel),
                    'data-levels': String(newLevel),
                    'data-head-level': 'changed',
                    'data-track-code': 'head-style-01',
                    'data-time': String((new Date()).getTime())
                });
                if (trackUser.MAIL_ID) section.setAttribute('data-username', trackUser.MAIL_ID);
                if (trackUser.ROLE_NAME) {
                    section.setAttribute(
                        'data-rolename',
                        ((trackUser.IS_CO_ROLE ? 'Co-' : '') + trackUser.ROLE_NAME)
                    );
                }
                const titleEl = findDirectTitle(section);
                if (titleEl) {
                    setAttrs(titleEl, {
                        'old-lvl': String(sectionLevel),
                        'data-levels': String(newLevel)
                    });
                }
                if (op === 'up') {
                    if (section && parentSection && parentSection.parentNode) {
                        this._insertAfter(section, parentSection);
                    }
                } else {
                    nestWrapper.insertBefore(section, nestWrapper.firstChild);
                    if (previousSibling) {
                        while (nestWrapper.firstChild) previousSibling.appendChild(nestWrapper.firstChild);
                    }
                }
            } else if (op === 'add' || op === 'delete') {
                const alertKey = op === 'add' ? 'headleveladd001' : 'headleveldel002';
                let confirmed = true;
                if (typeof IMPACT_ALERT === 'function') {
                    confirmed = await IMPACT_ALERT(alertKey);
                }
                if (confirmed && op === 'add') {
                    const firstSec = parentSection && parentSection.querySelector
                        ? parentSection.querySelector(':scope > div.sec')
                        : null;
                    const isFirstChild = !!(firstSec && firstSec.id === sectionId);
                    if (typeof CreateStringHead === 'function') {
                        const headHtml = CreateStringHead(sectionLevel, isFirstChild);
                        if (headHtml && section.parentNode) {
                            const wrap = document.createElement('div');
                            wrap.innerHTML = headHtml;
                            const newNode = wrap.firstElementChild;
                            if (newNode) section.parentNode.insertBefore(newNode, section);
                        }
                    } else {
                        console.warn('CreateStringHead missing');
                    }
                }
            }

            let divList = [];
            let prefix = '';
            if (!this.numberedHeadings && this.M_SCOPE.LABEL_SELECTOR) {
                this.numberedHeadings =
                    this.iDOM.querySelectorAll(this.M_SCOPE.LABEL_SELECTOR).length > 0;
            }
            if (typeof IS_JOURNAL !== 'undefined' && !IS_JOURNAL) {
                const rObj = this.getPrefixBooks(parentSection, 1) || {};
                prefix = rObj.prefix || '';
                divList = rObj.sub_levels || [];
                this.numberedHeadings = prefix ? true : false;
            }
            if (this.numberedHeadings) {
                if (typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL) {
                    divList = this.iDOM.querySelectorAll(
                        'div.body div.sec[data-levels="1"]:not([sec-type="Back_Matter"],[sec-type="supplementary-material"])'
                    );
                }
                prefix = prefix.length > 0
                    ? prefix + (prefix.indexOf('.') > -1 ? '' : '.')
                    : prefix;
                this.RE_STRUCTURE(divList, prefix);
                needsRenumber = true;
            }

            if (typeof _IsDirty !== 'undefined') _IsDirty = false;
            this.writeScopedOffscreen(sectionId, { needsRenumber: needsRenumber });
            if (typeof AutoSaveBool !== 'undefined') AutoSaveBool = true;
            if (editor.focus) editor.focus();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ApplyStyleModule.headLevelOp', err.message);
            if (typeof AutoSaveBool !== 'undefined') AutoSaveBool = true;
        }
    }

    getPrefixBooks(SEC, CUR_LEVEL) {
        const returnObject = {
            first_level_lab: '',
            chapter_lab: '',
            prefix: '',
            lab_count: 0,
            all_count: 0,
            sub_levels: []
        };
        try {
            if (!SEC || !SEC.closest) return returnObject;
            const chapRoot = SEC.closest('.book-part');
            if (!chapRoot) return returnObject;
            const titleGroup = chapRoot.querySelector('.book-part-meta .title-group');
            const chapLabel = applyStyleGetLabText(titleGroup);
            const firstLvlArr = CUR_LEVEL === 1
                ? chapRoot.querySelectorAll('div.body div.sec[data-levels="' + CUR_LEVEL + '"]')
                : SEC.querySelectorAll('div.sec[data-levels="' + CUR_LEVEL + '"]');
            const firstLvlDiv = firstLvlArr[0];
            const firstLvlLab = applyStyleGetLabText(firstLvlDiv);
            let prefix = '';
            if (chapLabel && firstLvlLab) {
                if (chapLabel !== firstLvlLab) {
                    let chapSplit = '';
                    const headLabSplit = firstLvlLab.split('.');
                    const isPrefixThere = headLabSplit.length > 1;
                    if (/[a-zA-Z]/gi.test(chapLabel)) {
                        if (/\s/.test(chapLabel)) chapSplit = chapLabel.split(' ');
                        if (chapSplit[chapSplit.length - 1] === headLabSplit[0]) {
                            prefix = headLabSplit[0];
                        }
                    } else {
                        prefix = isPrefixThere ? headLabSplit[0] : '';
                    }
                }
            }
            returnObject.root = chapRoot;
            returnObject.sub_levels = firstLvlArr;
            returnObject.first_level_lab = firstLvlLab;
            returnObject.chapter_lab = chapLabel;
            returnObject.prefix = prefix;
            returnObject.all_count = firstLvlArr.length;
            returnObject.lab_count = Array.from(firstLvlArr).reduce((accumulator, sec) => {
                if (!returnObject[CUR_LEVEL]) returnObject[CUR_LEVEL] = {};
                const lab = applyStyleGetLabText(sec);
                returnObject[CUR_LEVEL][sec.id] = {
                    lab: lab,
                    label: lab,
                    title: applyStyleGetLabText(sec, { title: true })
                };
                return accumulator + (lab ? 1 : 0);
            }, 0);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getPrefixBooks', err.message);
        }
        return returnObject;
    }

    Label_Validation(Order, Level, prefix, cur_lab, Options) {
        try {
            Options = Options || {};
            const pattern = Options.pattern;
            let suffix = '';
            let config = this.M_CONFIG.HEADING && this.M_CONFIG.HEADING['H' + Level];
            if (config && typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL) {
                if (config.label_end_delim) suffix = config.label_end_delim;
                else if (cur_lab && String(cur_lab).endsWith('.')) suffix = '.';
                else suffix = '';

                if (!prefix && config.label_prefix_default) prefix = config.label_prefix_default;
                if (!config.label_prefix) prefix = '';

                const NumStyle = config.label_format;
                if (NumStyle && NumStyle !== 'arabic') {
                    const IsUpper = !!String(NumStyle).match(/upper/);
                    if (String(NumStyle).match(/alphabet/) && typeof getAlphabateByIndex === 'function') {
                        Order = getAlphabateByIndex(Order, IsUpper);
                    } else if (String(NumStyle).match(/roman/) && typeof romanize === 'function') {
                        Order = romanize(Order + 1);
                        if (!IsUpper) Order = String(Order).toLowerCase();
                    }
                } else if (NumStyle) {
                    Order = Order + 1;
                } else if (cur_lab) {
                    Order = Order + 1;
                } else if (!NumStyle) {
                    Order = '';
                }
                const labelBetweenDelim = this.M_CONFIG.HEADING &&
                    this.M_CONFIG.HEADING.label_between_delim;
                if (labelBetweenDelim && prefix && prefix.length > 0 &&
                    !String(prefix).endsWith(labelBetweenDelim)) {
                    prefix = prefix + labelBetweenDelim;
                }
            } else {
                Order = Order + 1;
                if (typeof commonMethods !== 'undefined') {
                    if ((commonMethods.isRomanNumeral && commonMethods.isRomanNumeral(cur_lab)) ||
                        (cur_lab === '' && pattern === 'roman')) {
                        if (commonMethods.toRomanNumeral) {
                            Order = commonMethods.toRomanNumeral(Order);
                        }
                    }
                }
            }
            return { label: String(prefix || '') + Order + suffix };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Label_Validation', err.message);
            return { label: '' };
        }
    }

    RE_STRUCTURE(items, prefix) {
        try {
            prefix = (prefix && prefix.length > 0)
                ? (prefix + (String(prefix).endsWith('.') ? '' : '.'))
                : prefix;
            if (typeof debug !== 'undefined' && debug.log) {
                debug.log('<===' + prefix + '===>');
            }

            const titleOverAllResults = applyStyleAnalyzeTitleLabels(items);
            const allHaveLabels = titleOverAllResults.allHaveLabels;
            const majorityLabeled = titleOverAllResults.majorityLabeled;
            const pattern = titleOverAllResults.pattern;
            const isLabeled = allHaveLabels || majorityLabeled;

            Array.from(items || []).forEach((node, idx) => {
                const headLevel = node.getAttribute('data-levels');
                const titleEl = findDirectTitle(node);
                let labText = (titleEl && titleEl.getAttribute('data-label')) || '';

                if (!labText && isLabeled && titleEl) {
                    titleEl.setAttribute('data-label', '');
                    labText = '';
                }

                const validated = this.Label_Validation(idx, headLevel, prefix, labText, {
                    el: node,
                    pattern: pattern
                }) || { label: '' };
                const label = validated.label;

                if (titleEl && labText !== label && isLabeled) {
                    const deletedLabel = titleEl.getAttribute('data-label-delete');
                    titleEl.setAttribute('data-label', label);
                    if (deletedLabel) {
                        titleEl.setAttribute('odata-label', deletedLabel);
                        titleEl.removeAttribute('data-label-delete');
                    }
                } else if (titleEl && !isLabeled) {
                    const lab = titleEl.getAttribute('data-label');
                    if (lab) {
                        titleEl.setAttribute('data-label-delete', lab);
                        titleEl.removeAttribute('data-label');
                    }
                }

                let sublevels = node.querySelectorAll(
                    ':scope > div.sec:not([sec-type="Back_Matter"]):not([sec-type="supplementary-material"])'
                );
                if (!sublevels.length) {
                    sublevels = node.querySelectorAll(
                        'div.sec:not([sec-type="Back_Matter"]):not([sec-type="supplementary-material"])'
                    );
                }
                if (sublevels.length > 0) {
                    const nextLevel = parseInt(headLevel, 10) + 1;
                    const config = this.M_CONFIG.HEADING && this.M_CONFIG.HEADING['H' + nextLevel];
                    if (nextLevel && config && config.label_format && config.label_format !== '') {
                        this.RE_STRUCTURE(sublevels, label);
                    } else {
                        Array.from(sublevels).forEach((childSec) => {
                            const title = findDirectTitle(childSec);
                            const lab = title && title.getAttribute('data-label');
                            if (typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL &&
                                config && config.label_format === '') {
                                if (title && lab) {
                                    title.setAttribute('data-label-delete', lab);
                                    title.removeAttribute('data-label');
                                }
                            } else if (typeof IS_JOURNAL !== 'undefined' && !IS_JOURNAL && lab) {
                                const prefixResult = this.getPrefixBooks(node, nextLevel);
                                const diff = prefixResult.all_count - prefixResult.lab_count;
                                const average = prefixResult.all_count / 2;
                                if (prefixResult.all_count > prefixResult.lab_count &&
                                    (diff > average)) {
                                    if (title) {
                                        title.setAttribute('data-label-delete', lab);
                                        title.removeAttribute('data-label');
                                    }
                                } else if (diff < average) {
                                    this.RE_STRUCTURE(prefixResult.sub_levels, label);
                                }
                            }
                        });
                    }
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('RE_STRUCTURE', err.message);
        }
    }

    _setRemoveAttr(elm, setObj, removeArr) {
        if (this.G_FUN && typeof this.G_FUN.SET_REMOVE_ATTR === 'function') {
            return this.G_FUN.SET_REMOVE_ATTR(elm, setObj, removeArr);
        }
        if (typeof commonMethods !== 'undefined' && typeof commonMethods.SET_REMOVE_ATTR === 'function') {
            return commonMethods.SET_REMOVE_ATTR(elm, setObj, removeArr);
        }
        return elm;
    }

    _insertAfter(newNode, refNode) {
        if (this.G_FUN && typeof this.G_FUN.insertAfter === 'function') {
            return this.G_FUN.insertAfter(newNode, refNode);
        }
        if (refNode && refNode.parentNode) {
            if (refNode.nextSibling) {
                refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
            } else {
                refNode.parentNode.appendChild(newNode);
            }
        }
        return newNode;
    }

    /**
     * Load scoped HTML into iDOM (books: chapter/part; journal: full).
     * @returns {object|null} scope from resolveApplyStyleScopeRoot
     */
    loadScopedOffscreen(cursorNode) {
        try {
            if (this.iDOM) this.iDOM.innerHTML = '';
            const isJournal = typeof IS_JOURNAL !== 'undefined' ? !!IS_JOURNAL : true;
            const curChapter = (typeof EDITOR_CURSOR !== 'undefined' && EDITOR_CURSOR.CUR_CHAPTER) || null;
            const curChapterData = (typeof EDITOR_CURSOR !== 'undefined' && EDITOR_CURSOR.CUR_CHAPTER_DATA) || null;
            const scope = resolveApplyStyleScopeRoot({
                isJournal: isJournal,
                cursorNode: cursorNode || null,
                editorGetData: function() {
                    return (typeof GlobalEditor !== 'undefined' && GlobalEditor.getData)
                        ? GlobalEditor.getData()
                        : '';
                },
                curChapter: curChapter,
                curChapterData: curChapterData
            });
            this.M_SCOPE._lastScope = scope;
            if (scope.mode === 'refuse') {
                console.warn('ApplyStyle loadScopedOffscreen refuse:', scope.reason);
                ErrorLogTrace('loadScopedOffscreen', scope.reason || 'refuse');
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('ErrorImpact', { type: 'warning' });
                }
                return null;
            }
            this.iDOM.innerHTML = scope.html || '';
            return scope;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('loadScopedOffscreen', err.message);
            return null;
        }
    }

    /**
     * Write iDOM back via SET_DATA; books use replace_div when scope says so.
     */
    writeScopedOffscreen(cursorId, opts) {
        try {
            opts = opts || {};
            const scope = this.M_SCOPE._lastScope;
            if (!scope || scope.mode === 'refuse') {
                ErrorLogTrace('writeScopedOffscreen', 'no valid scope');
                return;
            }
            if (typeof SET_DATA === 'undefined' || typeof SET_DATA.setNewData !== 'function') {
                ErrorLogTrace('writeScopedOffscreen', 'SET_DATA missing');
                return;
            }
            SET_DATA.setNewData(this.iDOM, {
                DOM_Empty: true,
                reGenerateAll: !!opts.needsRenumber,
                cleanHTML: false,
                replace_div: !!scope.replaceDiv,
                replace_div_id: scope.replaceDivId || null
            }, cursorId);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('writeScopedOffscreen', err.message);
        }
    }

    ATTR_HANDLE(elm, Options) {
        try {
            Options = Options || {};
            const AttrObj = {
                para: {
                    set: { 'data-name': 'p', class: 'p' },
                    remove: []
                },
                track: {
                    set: {
                        'data-style': 'modified',
                        'data-track-code': 'style-01',
                        default: ['dt', 'du', 'drn']
                    },
                    remove: []
                }
            };
            const ObjValue = AttrObj[Options.process];
            if (!ObjValue) return elm;
            const setObj = ObjValue.set;
            const removeArr = Options.remove ? Options.remove : ObjValue.remove;
            this._setRemoveAttr(elm, setObj, removeArr);
            return elm;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ATTR_HANDLE', err.message);
            return elm;
        }
    }

    fireStyle(b) {
        try {
            if (!b || (b.classList && b.classList.contains('disabled'))) return;
            const StyleCode = b.getAttribute('data-Style');
            const StyleMap = this.M_CONFIG && this.M_CONFIG.STYLE_CONFIG
                ? this.M_CONFIG.STYLE_CONFIG[StyleCode]
                : null;
            if (!StyleMap) return;

            const newElm = document.createElement('div');
            const titleElm = document.createElement('div');
            const newLevel = StyleMap['data-levels'];

            if (StyleMap.class === 'sec' && this.M_SCOPE.curElement && this.M_SCOPE.curElement.className === 'title') {
                const active = this.Panel && this.Panel.querySelector('.styleList span.active');
                const curLevelAttr = active && active.getAttribute('data-style');
                const curLevel = curLevelAttr ? parseInt(String(curLevelAttr).substring(1), 10) : NaN;
                const up = (typeof UP !== 'undefined') ? UP : 'up';
                const down = (typeof DOWN !== 'undefined') ? DOWN : 'down';
                this.headLevelOp(curLevel > newLevel ? up : down);
                return false;
            }

            Object.keys(StyleMap).forEach((key) => {
                const value = StyleMap[key];
                newElm.setAttribute(key, value);
                if (StyleMap.class === 'sec') {
                    titleElm.setAttribute(key, key === 'data-levels' ? value : 'title');
                }
            });

            if (!newElm.id && typeof GENERATE_ID === 'function') {
                newElm.id = GENERATE_ID(StyleMap.class === 'sec' ? newLevel : null);
            }

            if (['attrib', 'sec', 'disp-quote', 'p'].indexOf(StyleMap.class) !== -1) {
                if (StyleMap.class === 'sec') {
                    if (!titleElm.id) {
                        titleElm.id = this.M_SCOPE.curElementId ||
                            (typeof GENERATE_ID === 'function' ? GENERATE_ID() : '');
                    }
                    this.M_SCOPE.curElementId = titleElm.id;
                    newElm.append(titleElm);
                }
                this.ATTR_HANDLE(newElm, { process: 'track' });
                this.M_SCOPE.newElem = newElm;
                this.M_SCOPE.StyleMap = StyleMap;
                if (typeof GlobalEditor !== 'undefined' && GlobalEditor.execCommand) {
                    GlobalEditor.execCommand('APPLY_STYLE');
                }
            }

            if (this.IBOX && this.IBOX.STYLE_LIST && this.IBOX.STYLE_LIST.forEach) {
                this.IBOX.STYLE_LIST.forEach((el) => {
                    const code = el.getAttribute('data-Style') || el.dataset.style;
                    el.classList[code === StyleCode ? 'add' : 'remove']('active');
                });
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('fireStyle', err.message);
        }
    }

    DomManipulation(newNode, curElm, styleJSON, cursorId) {
        if (typeof GlobalEditor !== 'undefined' && GlobalEditor.updateElement) {
            GlobalEditor.updateElement();
        }
        let needsRenumber = false;
        try {
            if (!curElm || !styleJSON) return;
            const parentLive = curElm.parentElement;
            if (!parentLive) return;
            const parentId = parentLive.id;
            const cursorIndex = Array.from(parentLive.children).indexOf(curElm);
            const tempWrapper = document.createElement('div');

            const scope = this.loadScopedOffscreen(curElm);
            if (!scope) return;

            let parentElm = parentId
                ? (this.iDOM.querySelector('[id="' + parentId + '"]') || null)
                : null;
            curElm = (parentElm && parentElm.children.item(cursorIndex)) || curElm || null;
            if (!curElm || !parentElm) {
                ErrorLogTrace('DomManipulation', 'could not resolve offscreen nodes');
                return;
            }

            this.M_SCOPE.prevElm = curElm.previousElementSibling;
            this.M_SCOPE.prevElmClass = this.M_SCOPE.prevElm ? this.M_SCOPE.prevElm.className : null;
            this.M_SCOPE.nextElm = curElm.nextElementSibling;
            this.M_SCOPE.nextElmClass = this.M_SCOPE.nextElm ? this.M_SCOPE.nextElm.className : null;

            if (styleJSON.class === 'sec') {
                let count = 0;
                let nextSiblingNest = null;
                tempWrapper.innerHTML = curElm.innerHTML;
                if (newNode.firstElementChild) {
                    newNode.firstElementChild.innerHTML = tempWrapper.innerHTML;
                }
                curElm.outerHTML = newNode.outerHTML;
                curElm = parentElm.children.item(cursorIndex);
                this.M_SCOPE.curElementId = curElm && curElm.id;
                let nextSibling = curElm && curElm.nextElementSibling;
                while (nextSibling) {
                    if (!nextSibling.id && typeof GENERATE_ID === 'function') {
                        nextSibling.id = GENERATE_ID();
                    }
                    const sameSecLevel = nextSibling.className === 'sec' &&
                        newNode.getAttribute('data-levels') === nextSibling.getAttribute('data-levels');
                    if (nextSibling.className !== 'sec' || !sameSecLevel) {
                        nextSiblingNest = nextSibling.nextElementSibling;
                        if (count === 0 && nextSibling.className === 'p' &&
                            this.M_CONFIG.STYLE_CONFIG && this.M_CONFIG.STYLE_CONFIG.P) {
                            nextSibling.setAttribute(
                                'content-type',
                                this.M_CONFIG.STYLE_CONFIG.P['content-type']
                            );
                        }
                        curElm.append(nextSibling);
                        count += 1;
                    } else break;
                    nextSibling = nextSiblingNest;
                }
                const curLevel = parseInt(curElm.getAttribute('data-levels'), 10);
                const parLevel = parseInt(parentElm.getAttribute('data-levels'), 10);
                if (curLevel === parLevel || parLevel > curLevel) {
                    if (parLevel > curLevel) {
                        while (curElm.parentElement && curElm.parentElement.nextElementSibling) {
                            curElm.appendChild(curElm.parentElement.nextElementSibling);
                        }
                        parentElm = parentElm.parentElement;
                    }
                    // Prefer nextElementSibling (not nextSibling) to match legacy DOM writes.
                    if (parentElm && parentElm.parentNode) {
                        if (parentElm.nextElementSibling) {
                            parentElm.parentNode.insertBefore(curElm, parentElm.nextElementSibling);
                        } else {
                            parentElm.parentNode.appendChild(curElm);
                        }
                    }
                }

                let divList = [];
                let currentChapInfo = { prefix: '' };
                if (typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL) {
                    divList = this.iDOM.querySelectorAll(
                        'div.body div.sec[data-levels="1"]:not([sec-type="Back_Matter"],[sec-type="supplementary-material"])'
                    );
                } else if (typeof this.getPrefixBooks === 'function') {
                    currentChapInfo = this.getPrefixBooks(parentElm, 1) || currentChapInfo;
                    divList = currentChapInfo.sub_levels || [];
                }

                if (this.numberedHeadings || currentChapInfo.prefix || currentChapInfo.first_level_lab) {
                    this.numberedHeadings = true;
                    let newPrefix = currentChapInfo.prefix || '';
                    if (newPrefix.length > 0) {
                        newPrefix += newPrefix.indexOf('.') > -1 ? '' : '.';
                    }
                    if (this.M_CONFIG.HEADING && this.M_CONFIG.HEADING.label_suffix) {
                        newPrefix += this.M_CONFIG.HEADING.label_suffix;
                    }
                    if (typeof this.RE_STRUCTURE === 'function') {
                        this.RE_STRUCTURE(divList, newPrefix);
                        needsRenumber = true;
                    }
                }
                if (typeof _IsDirty !== 'undefined') _IsDirty = true;
            } else if (styleJSON.class === 'disp-quote') {
                if (!curElm.id) {
                    curElm.id = this.M_SCOPE.curElementId ||
                        (typeof GENERATE_ID === 'function' ? GENERATE_ID() : '');
                }
                this._setRemoveAttr(curElm, {}, ['content-type', 'data-role']);
                if (parentElm.className !== 'disp-quote') {
                    if (curElm.nextElementSibling && this.M_CONFIG.STYLE_CONFIG && this.M_CONFIG.STYLE_CONFIG.P) {
                        curElm.nextElementSibling.setAttribute(
                            'content-type',
                            this.M_CONFIG.STYLE_CONFIG.P['content-type']
                        );
                    }
                    const prevIsQuote = this.M_SCOPE.prevElmClass === 'disp-quote';
                    const nextIsQuote = this.M_SCOPE.nextElmClass === 'disp-quote';
                    if (prevIsQuote || nextIsQuote) {
                        const targetElm = prevIsQuote ? this.M_SCOPE.prevElm : this.M_SCOPE.nextElm;
                        if (targetElm) {
                            targetElm[prevIsQuote ? 'appendChild' : 'prepend'](curElm);
                        }
                    } else {
                        parentElm.replaceChild(newNode, curElm);
                        newNode.appendChild(curElm);
                    }
                } else {
                    curElm = this.ATTR_HANDLE(curElm, { process: 'para' });
                }
            } else if (styleJSON.class === 'attrib' ||
                (styleJSON.class === 'p' && styleJSON['content-type'] === 'source')) {
                const insideExtract = parentElm.className === 'disp-quote';
                if (insideExtract ||
                    (this.M_SCOPE.prevElmClass === 'disp-quote' && curElm.className === 'p')) {
                    this._setRemoveAttr(curElm, styleJSON, []);
                    if (!curElm.id && typeof GENERATE_ID === 'function') {
                        this.M_SCOPE.curElementId = curElm.id = GENERATE_ID();
                    }
                    if (!insideExtract && this.M_SCOPE.prevElm) {
                        this.M_SCOPE.prevElm.appendChild(curElm);
                    }
                } else {
                    console.warn('MISSING_STYLE');
                }
            } else if (styleJSON.class === 'p') {
                const grandParent = parentElm.parentElement;
                if ([parentElm.className, grandParent && grandParent.className].indexOf('disp-quote') !== -1) {
                    curElm = this.ATTR_HANDLE(curElm, {
                        process: 'para',
                        remove: curElm.getAttribute('content-type') === 'source' ? ['content-type'] : []
                    });
                    const gParent = parentElm.parentElement;
                    const gParentClass = gParent && gParent.getAttribute('data-name');
                    const dispOnePara = parentElm.childElementCount === 1;
                    let setTrack = false;
                    if (dispOnePara) {
                        this._insertAfter(curElm, gParentClass === 'p' ? gParent : parentElm);
                        if (parentElm.childElementCount === 0) {
                            parentElm.remove();
                            parentElm = gParent;
                        }
                        setTrack = true;
                    } else {
                        const currentIndex = Array.from(parentElm.children).indexOf(curElm);
                        const isFirst = currentIndex === 0;
                        const isLast = currentIndex === (parentElm.childElementCount - 1);
                        if (isFirst || isLast) {
                            if (isFirst) {
                                if (parentElm.parentElement) {
                                    parentElm.parentElement.insertBefore(curElm, parentElm);
                                }
                            } else {
                                this._insertAfter(curElm, parentElm);
                            }
                            // First-child unwrap tracks; last-child unwrap does not (legacy).
                            setTrack = isFirst;
                        } else {
                            setTrack = true;
                            let tempElm = curElm;
                            const cloneBefore = parentElm.cloneNode(false);
                            const cloneAfter = parentElm.cloneNode(false);
                            cloneBefore.removeAttribute('id');
                            cloneAfter.removeAttribute('id');
                            const children = Array.from(parentElm.children);
                            children.forEach((el, ind) => {
                                if (ind < currentIndex) cloneBefore.appendChild(el);
                                else if (ind > currentIndex) cloneAfter.appendChild(el);
                            });
                            tempElm = this.ATTR_HANDLE(tempElm, { process: 'para' });
                            const replaceNodes = [];
                            if (cloneBefore.childElementCount > 0) replaceNodes.push(cloneBefore);
                            replaceNodes.push(tempElm);
                            if (cloneAfter.childElementCount > 0) {
                                if (typeof GENERATE_ID === 'function') cloneAfter.id = GENERATE_ID();
                                replaceNodes.push(cloneAfter);
                            }
                            parentElm.replaceWith.apply(parentElm, replaceNodes);
                        }
                    }
                    if (setTrack) {
                        curElm = this.ATTR_HANDLE(curElm, { process: 'track' });
                    }
                } else if (this.M_SCOPE.curElmPar !== 'disp-quote') {
                    if (typeof ParaGroup !== 'undefined' && ParaGroup.handleContentType) {
                        ParaGroup.handleContentType(parentElm);
                    }
                }
            }

            if (typeof _IsDirty !== 'undefined') _IsDirty = true;
            this.writeScopedOffscreen(cursorId, { needsRenumber: needsRenumber });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('DomManipulation', err.message);
        }
    }

    showLoop() {
        try {
            if (!this._styleRules) {
                this._initStyleRulesEngine();
            }

            this.M_SCOPE.cursorGroup = (typeof GlobalEditor !== 'undefined' && GlobalEditor.elementPath)
                ? GlobalEditor.elementPath()
                : null;

            if (!this.M_SCOPE.cursorGroup) {
                this._lastStyleEvaluation = null;
                this._syncStylePanel();
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('InvalidCursor', { type: 'warning' });
                }
                return;
            }

            this.M_SCOPE.curElement = this.M_SCOPE.cursorGroup.block
                ? this.M_SCOPE.cursorGroup.block.$
                : (this.M_SCOPE.cursorGroup.blockLimit && this.M_SCOPE.cursorGroup.blockLimit.$);
            this.M_SCOPE.curElmClass = this.M_SCOPE.curElement && this.M_SCOPE.curElement.className;
            this.M_SCOPE.curElmPar = this.M_SCOPE.curElement && this.M_SCOPE.curElement.parentElement;
            this.M_SCOPE.curElmParClass = this.M_SCOPE.curElmPar && this.M_SCOPE.curElmPar.className;
            this.M_SCOPE.LIST_ELM = this.M_SCOPE.curElement && this.M_SCOPE.curElement.tagName === 'LI';
            this.M_SCOPE.curElementId = (this.M_SCOPE.curElement && this.M_SCOPE.curElement.id) || '';

            this.M_SCOPE.prevElm = this.M_SCOPE.curElement && this.M_SCOPE.curElement.previousElementSibling;
            this.M_SCOPE.prevElmClass = (this.M_SCOPE.prevElm && this.M_SCOPE.prevElm.className) || null;
            this.M_SCOPE.nextElm = this.M_SCOPE.curElement && this.M_SCOPE.curElement.nextElementSibling;
            this.M_SCOPE.nextElmClass = (this.M_SCOPE.nextElm && this.M_SCOPE.nextElm.className) || null;

            this._evaluateCursorStyles(this.M_SCOPE.curElement);
            this._syncStylePanel();

            const activeCode = Object.keys((this._lastStyleEvaluation && this._lastStyleEvaluation.styles) || {})
                .find((code) => this._lastStyleEvaluation.styles[code].active);
            if (activeCode && this.Panel) {
                this.activeStyle = this.Panel.querySelector('[data-Style="' + activeCode + '"]')
                    || this.Panel.querySelector('[data-style="' + activeCode + '"]');
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ApplyStyleModule.showLoop', err.message);
        }
    }
}

export default ApplyStyleModule;
