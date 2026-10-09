/**
 * ApplyStyleModule — migrated from ApplyStyle.js
 * Refactored with SRP: CkDom, LabelGenerator, StyleRuleValidator, DomManipulator, Strategy Pattern
 */

import StyleRulesEngine from './styleRules.js';
import WrapEngine from './WrapEngine.js';
import StyleMenuController from './StyleMenuController.js';
import BodyStyleModifier from './BodyStyleModifier.js';

// ============================================================
// Internal Helper Classes
// ============================================================

/**
 * CkDom - CKEditor native DOM facade
 * Wraps CKEDITOR.dom.element operations and handles offscreen DOM workflow
 */
class CkDom {
    constructor(module) {
        this.module = module;
        this.editor = null;
    }

    setEditor(editor) {
        this.editor = editor || window.GlobalEditor || window.CKEDITOR?.instances?.maineditor;
    }

    // Load offscreen DOM (Set_DOM_Data equivalent)
    loadOffscreen(node) {
        if (this.module.iDOM) {
            this.module.iDOM.innerHTML = '';
        }
        this.module.Set_DOM_Data(null, { DOM: true, node });
        return this.module.iDOM;
    }

    // Create CKEDITOR.dom.element from tag or wrap existing node
    create(tag) {
        const ed = this.editor || window.GlobalEditor;
        if (!ed?.document) return null;
        return ed.document.createElement(tag);
    }

    wrap(node) {
        if (!node) return null;
        if (node instanceof window.CKEDITOR.dom.element) return node;
        return new window.CKEDITOR.dom.element(node);
    }

    getById(id) {
        const ed = this.editor || window.GlobalEditor;
        if (!ed?.document) return null;
        return ed.document.getById(id);
    }

    // Native CK traversal helpers
    getParent(el) {
        const ckEl = this.wrap(el);
        return ckEl?.getParent?.() || el?.parentElement;
    }

    getNext(el) {
        const ckEl = this.wrap(el);
        return ckEl?.getNext?.()?.$ || el?.nextElementSibling;
    }

    getPrevious(el) {
        const ckEl = this.wrap(el);
        return ckEl?.getPrevious?.()?.$ || el?.previousElementSibling;
    }

    getChild(el, index) {
        const ckEl = this.wrap(el);
        return ckEl?.getChild?.(index)?.$ || el?.children?.item(index);
    }

    // Native CK append/prepend
    append(parent, child) {
        const ckParent = this.wrap(parent);
        const ckChild = this.wrap(child);
        if (ckParent?.append) {
            ckParent.append(ckChild);
        } else {
            parent?.appendChild?.(child);
        }
        return child;
    }

    appendTo(child, parent) {
        return this.append(parent, child);
    }

    prepend(parent, child) {
        const ckParent = this.wrap(parent);
        const ckChild = this.wrap(child);
        if (ckParent?.prepend) {
            ckParent.prepend(ckChild);
        } else {
            parent?.prepend?.(child);
        }
        return child;
    }

    // Native CK insert operations
    insertBefore(newEl, refEl) {
        const ckNew = this.wrap(newEl);
        const ckRef = this.wrap(refEl);
        if (ckNew?.insertBefore) {
            ckNew.insertBefore(ckRef);
        } else if (refEl?.parentNode) {
            refEl.parentNode.insertBefore(newEl, refEl);
        }
        return newEl;
    }

    insertAfter(newEl, refEl) {
        const ckNew = this.wrap(newEl);
        const ckRef = this.wrap(refEl);
        if (ckRef?.getParent) {
            const parent = ckRef.getParent();
            const next = ckRef.getNext();
            if (next) {
                this.insertBefore(newEl, next.$);
            } else {
                this.append(parent.$, newEl);
            }
        } else if (refEl?.parentNode) {
            refEl.parentNode.insertBefore(newEl, refEl.nextSibling);
        }
        return newEl;
    }

    // Native CK replace
    replace(oldEl, newEl) {
        const ckOld = this.wrap(oldEl);
        const ckNew = this.wrap(newEl);
        if (ckOld?.replace) {
            ckOld.replace(ckNew);
        } else if (oldEl?.parentNode) {
            oldEl.parentNode.replaceChild(newEl, oldEl);
        }
        return newEl;
    }

    // Replace outer (wrapper pattern)
    replaceOuter(oldEl, newEl) {
        const ckOld = this.wrap(oldEl);
        const ckNew = this.wrap(newEl);

        // Clone children to target
        const target = ckNew.getFirst?.()?.$ || newEl.firstElementChild || newEl;
        const ckTarget = this.wrap(target);

        // Move all children from old to new target
        const children = ckOld?.getChildren?.();
        if (children) {
            const count = children.count();
            for (let i = 0; i < count; i++) {
                const child = children.getItem(i);
                if (ckTarget?.append) {
                    ckTarget.append(child.clone(true));
                } else {
                    target?.appendChild?.(child.$.cloneNode(true));
                }
            }
        } else {
            Array.from(oldEl.childNodes).forEach(child => {
                target?.appendChild?.(child.cloneNode(true));
            });
        }

        this.replace(oldEl, newEl);
        return newEl;
    }

    // Native CK remove
    remove(el) {
        const ckEl = this.wrap(el);
        if (ckEl?.remove) {
            ckEl.remove();
        } else if (el?.parentNode) {
            el.parentNode.removeChild(el);
        }
        return el;
    }

    // Clone with CK native
    clone(el, deep = true) {
        const ckEl = this.wrap(el);
        if (ckEl?.clone) {
            return ckEl.clone(deep).$;
        }
        return el?.cloneNode?.(deep);
    }

    // Create bookmarks for cursor preservation
    createBookmarks() {
        const ed = this.editor || window.GlobalEditor;
        if (!ed?.getSelection) return null;
        try {
            return ed.getSelection().createBookmarks(true);
        } catch (e) {
            return null;
        }
    }

    restoreBookmarks(bookmarks) {
        const ed = this.editor || window.GlobalEditor;
        if (!ed?.getSelection || !bookmarks) return;
        try {
            ed.getSelection().selectBookmarks(bookmarks);
        } catch (e) {
            // ignore
        }
    }

    // Commit changes back to editor (final sync)
    commit(parElmId, curElementId, styleJSON, cursor_id, isHeading) {
        const ed = this.editor || window.GlobalEditor;
        if (!ed) return;

        const CK_DOM = ed.document?.getById?.(parElmId);

        if (isHeading && !CK_DOM) {
            // Heading case with full regenerate
            SET_DATA.setNewData(this.module.iDOM, {
                DOM_Empty: true,
                reGenerateAll: true,
                cleanHTML: false
            }, cursor_id);
            return;
        }

        if (CK_DOM) {
            try {
                const parElm = this.module.iDOM?.querySelector?.(`[id="${parElmId}"]`);
                const curElm = parElm?.querySelector?.(`[id="${curElementId}"]`);

                // Replace in CKEditor
                const replaceTarget = curElm ? CK_DOM.$ : CK_DOM.$.parentElement;
                const replaceWith = curElm ? parElm : parElm?.parentElement;

                if (replaceTarget && replaceWith) {
                    this.replace(replaceTarget, replaceWith);
                }

                // Snapshot and cursor
                IMPACT_SELECTION._SNAPSHOT({ save: true });
                IMPACT_SELECTION.setCursor(ed, {
                    set_id: curElementId || null,
                    find_attr: 'id',
                    save: true
                });

                SET_DATA.reGenerateAllInit(ed.getData(), { toclist: true });
            } catch (err) {
                if (window.IS_JOURNAL) {
                    SET_DATA.setNewData(this.module.iDOM, {
                        DOM_Empty: true,
                        reGenerateAll: true,
                        cleanHTML: false
                    }, cursor_id);
                }
                console.warn(err.message);
                ErrorLogTrace('Apply_style_DOM', err.message);
            }
        } else {
            ErrorLogTrace('APPEND_ISSUE', 'APPLY_STYLE');
        }
    }
}

/**
 * LabelGenerator - Pure logic for label generation and validation
 * No DOM operations, only data transformation
 */
class LabelGenerator {
    constructor(module) {
        this.module = module;
    }

    normalizePrefix(prefix) {
        return prefix && prefix.length > 0
            ? (prefix + (prefix.endsWith('.') ? '' : '.'))
            : prefix;
    }

    getHeadingConfig(level) {
        return this.module.M_CONFIG.HEADING?.["H" + level] || null;
    }

    buildLabel(Order, Level, prefix, cur_lab, { pattern }) {
        let suffix = '';
        const config = this.getHeadingConfig(Level);
        let labelValue = Order;
        let resolvedPrefix = prefix;

        if (config && window.IS_JOURNAL) {
            if (config.label_end_delim) suffix = config.label_end_delim;
            else if (cur_lab && cur_lab.endsWith('.')) suffix = '.';
            else suffix = '';

            if (!resolvedPrefix && config.label_prefix_default) {
                resolvedPrefix = config.label_prefix_default;
            }
            if (!config.label_prefix) {
                resolvedPrefix = '';
            }

            const NumStyle = config.label_format;
            if (NumStyle && NumStyle !== 'arabic') {
                const IsUpper = /upper/.test(NumStyle);
                if (/alphabet/.test(NumStyle)) {
                    labelValue = window.getAlphabateByIndex(Order, IsUpper);
                } else if (/roman/.test(NumStyle)) {
                    labelValue = window.romanize(Order + 1);
                    if (!IsUpper) labelValue = labelValue.toLowerCase();
                }
            } else if (NumStyle) {
                labelValue = Order + 1;
            } else if (cur_lab) {
                labelValue = Order + 1;
            } else if (!NumStyle) {
                labelValue = '';
            }

            const { label_between_delim } = this.module.M_CONFIG.HEADING;
            if (label_between_delim && resolvedPrefix.length > 0 && !resolvedPrefix.endsWith(label_between_delim)) {
                resolvedPrefix += label_between_delim;
            }
        } else {
            labelValue = Order + 1;
            if (window.commonMethods?.isRomanNumeral?.(cur_lab) || (cur_lab === '' && pattern === 'roman')) {
                labelValue = window.commonMethods?.toRomanNumeral?.(labelValue) || labelValue;
            }
        }

        return { label: resolvedPrefix + labelValue + suffix };
    }

    validate(Order, Level, prefix, cur_lab, Options = {}) {
        try {
            return this.buildLabel(Order, Level, prefix, cur_lab, Options);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Label_Validation', err.message);
        }
    }

    reStructure(items, prefix, _module) {
        const _ = _module || this.module;
        try {
            prefix = this.normalizePrefix(prefix);
            window.debug?.log?.("<===" + prefix + "===>");

            const titleOverAllResults = window.analyzeTitleLabels?.(items) || {
                mapped: [], allHaveLabels: false, isRoman: false,
                pattern: 'numeric', majorityLabeled: false
            };
            const { allHaveLabels, majorityLabeled, pattern } = titleOverAllResults;

            const _IsLabelled = allHaveLabels || majorityLabeled;

            Array.from(items).forEach((node, idx) => {
                const _headLevel = node.getAttribute('data-levels');
                const _titleEl = window.$(node).children('.title');
                let _labText = window.$(_titleEl).attr('data-label') || "";

                if (!_labText && _IsLabelled) {
                    window.$(_titleEl).attr('data-label', "");
                    _labText = "";
                }

                const { label } = this.validate(idx, _headLevel, prefix, _labText, {
                    el: node, pattern
                });

                if (_labText != label && _IsLabelled) {
                    const del_leb = window.$(_titleEl).attr("data-label-delete");
                    window.$(_titleEl).attr('data-label', label);
                    if (del_leb) {
                        window.$(_titleEl).attr('odata-label', del_leb).removeAttr('data-label-delete');
                    }
                } else if (!_IsLabelled) {
                    const lab = window.$(_titleEl).attr('data-label');
                    window.$(_titleEl).attr("data-label-delete", lab).removeAttr('data-label');
                }

                const sublevels = window.$(node).children('div.body div.sec:not([sec-type="Back_Matter"],[sec-type="supplementary-material"])');
                if (sublevels.length > 0) {
                    const nxt_lvl = (parseInt(_headLevel) + 1);
                    const config = _module.M_CONFIG.HEADING?.["H" + nxt_lvl];
                    if (nxt_lvl && config && config.label_format && config.label_format != "") {
                        this.reStructure(sublevels, label, _module);
                    } else {
                        window.$.each(sublevels, (Idx, Elm) => {
                            const lab = window.$(Elm).children('.title').attr('data-label');
                            if (window.IS_JOURNAL && config && config.label_format === "") {
                                window.$(Elm).children('.title').attr('data-label-delete', lab).removeAttr("data-label");
                            } else if (!window.IS_JOURNAL && lab) {
                                const prefixResult = window.getPrefixBooks?.(node, nxt_lvl);
                                const diff = prefixResult?.all_count - prefixResult?.lab_count;
                                const average = prefixResult?.all_count / 2;
                                if (prefixResult?.all_count > prefixResult?.lab_count && (diff > average)) {
                                    window.debug?.log?.(prefixResult);
                                    window.$(Elm).children('.title').attr('data-label-delete', lab).removeAttr("data-label");
                                } else if (diff < average) {
                                    this.reStructure(prefixResult?.sub_levels, label, _module);
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
}

/**
 * StyleRuleValidator - Handles all rule checking and UI state management
 * Toggles disabled/active classes on style buttons
 */
class StyleRuleValidator {
    constructor(module) {
        this.module = module;
    }

    checkRule() {
        const _ = this.module;
        try {
            const IS_SOURCE_PARA = (elm) => {
                try {
                    return elm && elm.getAttribute("content-type") == "source";
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('IS_SOURCE_PARA', err.message);
                    return false;
                }
            };

            _['IBOX'].LAST_STYLE?.classList?.add('disabled');

            _.M_SCOPE.prevElm = _.M_SCOPE.curElement?.previousElementSibling;
            _.M_SCOPE.prevElmClass = _.M_SCOPE.prevElm?.className || null;
            _.M_SCOPE.nextElm = _.M_SCOPE.curElement?.nextElementSibling;
            _.M_SCOPE.nextElmClass = _.M_SCOPE.nextElm?.className || null;

            _['IBOX'].STYLE_LIST?.forEach?.((element, index) => {
                if (_.M_SCOPE.IsPara || _.M_SCOPE.IsHead) {
                    if (_.M_SCOPE.IsPara) {
                        const formulaCheck = window.IMPACT_SELECTION?.PARENT_CLAS !== 'inline-formula';
                        const tableCheck = ![window.IMPACT_SELECTION?.G_PARENT_CLAS, window.IMPACT_SELECTION?.PARENT_CLAS].includes('table-wrap-foot');
                        const quoteCheck = _.M_SCOPE.prevElmClass === 'disp-quote' && index === 5;

                        if ((index !== 5 && formulaCheck || quoteCheck) && !_.M_SCOPE.LIST_ELM && tableCheck) {
                            element.classList.remove('disabled');
                        } else {
                            element.classList.add('disabled');
                        }

                        if (index < 3) {
                            this.headLevelValidation(element, index);
                        }
                    } else if (_.M_SCOPE.curElmClass === 'title') {
                        const curSec = _.M_SCOPE.curElement?.parentElement;
                        const curPar = curSec?.parentElement;
                        const curLevel = parseInt(curSec?.getAttribute("data-levels"));
                        const curInd = Array.prototype.indexOf.call(window.$(curPar).find('div.sec'), curSec);

                        let CanApplyHigher = false, CanApplyDown = false;
                        window.$(curSec).prevAll().each(function(index, el) {
                            if (['sec', 'p', 'disp-quote'].includes(el.className)) {
                                if (curInd !== 0 && _.M_CONFIG.HEAD_LIMIT >= curLevel) {
                                    if (curSec.querySelector('.p')) CanApplyDown = true;
                                }
                                CanApplyHigher = true;
                            }
                        });

                        if (element.classList.contains('active')) return;
                        if (index !== 5) element.classList.remove('disabled');

                        let iClass = "";
                        if (!_.M_CONFIG.SHOW_CONTEXT_GROUP || index > 2) {
                            iClass = 'disabled';
                        } else if (index < 3) {
                            if (index === 0 && (curLevel === 1 || !CanApplyHigher)) {
                                iClass = 'disabled';
                            } else if (index === 1 && ((curLevel === 1 && !CanApplyDown) || (curLevel !== 1 && !CanApplyHigher))) {
                                iClass = 'disabled';
                            } else if (index === 2 && (curLevel === 1 || !CanApplyDown)) {
                                iClass = 'disabled';
                            }
                        }
                        if (iClass) element.classList.add(iClass);
                    }
                } else if (_.M_SCOPE.IsExtractPara) {
                    const style = _.M_CONFIG?.STYLE_CONFIG?.[element.getAttribute('data-Style')];
                    if (['p', 'attrib'].includes(_.M_SCOPE.curElmClass)) {
                        let CanShow = ['p', 'attrib', 'disp-quote'].includes(style?.class);
                        if (style?.class === 'p' && IS_SOURCE_PARA(_.M_SCOPE.nextElm)) CanShow = false;
                        element.classList[CanShow ? 'remove' : 'add']('disabled');

                        if (index === 5 && _.M_SCOPE.curElmPar?.childElementCount === 1) {
                            if (IS_SOURCE_PARA(_.M_SCOPE.curElmPar?.firstElementChild)) {
                                element.classList.add('active');
                            } else {
                                element.classList.add('disabled');
                            }
                        }
                    }
                }
            });

            console.log('Check rule method done');
            return false;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CheckRule', err.message);
        }
    }

    headLevelValidation(item, index) {
        const _ = this.module;
        try {
            const noHeadPara = _.M_SCOPE.curElmParClass === 'body';
            const IsHeadPara = _.M_SCOPE.curElmParClass === 'sec';
            const curParElmChildCount = _.M_SCOPE.curElmPar?.querySelectorAll?.('.p')?.length || 0;
            const curHeadLevel = _.M_SCOPE.curElmPar?.getAttribute?.('data-levels') || null;

            const collectionChildren = Array.from(_.M_SCOPE.curElmPar?.querySelectorAll(".p") || [])
                .filter(node => node.parentNode === _.M_SCOPE.curElmPar);
            const firstPara = collectionChildren[0] || null;
            const lastPara = collectionChildren[collectionChildren.length - 1] || null;
            const IsLastPara = lastPara === _.M_SCOPE.curElement;
            const IsFirstPara = firstPara === _.M_SCOPE.curElement;
            const IsMidPara = !IsLastPara && !IsFirstPara;

            let ApplyStyle_Level = item.getAttribute('data-style');
            const IgnoreStyle = _.G_FUN?.Duplicate_Array?.(
                ['graphic', 'OL', 'UL'],
                [_.G_SCOPE?.IMS?.PARENT_CLAS, _.G_SCOPE?.IMS?.NODE_CLAS, _.G_SCOPE?.IMS?.PARENT_TAG],
                { find: true, bool: true }
            ) || false;

            ApplyStyle_Level = ApplyStyle_Level?.charAt?.(0) === 'H' ? ApplyStyle_Level.slice(1) : ApplyStyle_Level;

            if (!_.M_CONFIG.SHOW_CONTEXT_GROUP || IgnoreStyle) {
                item.classList.add('disabled');
            } else if ((index !== 0 && noHeadPara) || (IsHeadPara && IsLastPara)) {
                item.classList.add('disabled');
            } else if (IsHeadPara) {
                const diffCount = ApplyStyle_Level - curHeadLevel;
                const SinglePara = window.$(_.M_SCOPE.curElmPar).children(".p").length < 2;
                if (IsFirstPara && ((curHeadLevel == ApplyStyle_Level || diffCount != 1) || (diffCount == 1 && SinglePara))) {
                    item.classList.add('disabled');
                } else if (IsMidPara && ![-1, 0, 1].includes(diffCount)) {
                    item.classList.add('disabled');
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('headLevelValidation', err.message);
        }
    }

    autoGenerateList(a) {
        const _ = this.module;
        try {
            _['IBOX'].STYLE_LIST?.forEach?.((element, index) => {
                if (!element.getAttribute('data-style')?.includes('H')) return;

                let new_val;
                if (index === 1) {
                    new_val = (a === 1 || a === 0) ? 2 : a;
                } else if (index === 0) {
                    new_val = (a === 1 || a === 0) ? 1 : (a - 1);
                } else {
                    new_val = (a === 1 || a === 0) ? 3 : (a + 1);
                }

                if (!window.IS_JOURNAL && _.G_FUN?.setAttr) {
                    _.G_FUN.setAttr(element, {
                        "data-Style": "H" + new_val,
                        "data-content": "Heading " + new_val
                    });
                }

                const canEnable = _.M_CONFIG.SHOW_CONTEXT_GROUP
                    ? (_.M_CONFIG.HEAD_LIMIT >= new_val)
                    : false;
                element.classList[canEnable ? 'remove' : 'add']('disabled');
            });
            console.log('Auto_Generate_Styles_List method done');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Auto_Generate_Styles_List', err.message);
        }
    }

    getCursorPosition(Panel) {
        const _ = this.module;
        try {
            const validClasses = ['p', 'sec', 'title', 'extract', 'attrib'];
            const restrictedClasses = _.M_SCOPE.RESTRICT_CLASS || [];

            if (!validClasses.includes(_.M_SCOPE.curElmClass) ||
                restrictedClasses.includes(_.M_SCOPE.curElmParClass)) {
                _['IBOX'].STYLE_LIST?.forEach?.(el => el.classList.add('disabled'));
                return;
            }

            if (['attrib', 'p'].includes(_.M_SCOPE.curElmClass) && !['title'].includes(_.M_SCOPE.curElmParClass)) {
                if (_.M_SCOPE.curElmClass === 'p' && _.M_SCOPE.curElmParClass !== 'disp-quote' && !_.M_SCOPE.LIST_ELM) {
                    _.activeStyle = Panel?.querySelector('[data-style="P"]');
                    [_.M_SCOPE.IsHead, _.M_SCOPE.IsExtractPara, _.M_SCOPE.IsPara] = [false, false, true];
                } else if (['p', 'attrib'].includes(_.M_SCOPE.curElmClass) && _.M_SCOPE.curElmParClass === 'disp-quote') {
                    [_.M_SCOPE.IsHead, _.M_SCOPE.IsExtractPara, _.M_SCOPE.IsPara] = [false, true, false];
                    const find = (_.M_SCOPE.curElmClass === 'attrib' ||
                        (_.M_SCOPE.curElmClass === 'p' && _.M_SCOPE.curElement?.getAttribute('content-type') === "source"))
                        ? "SOURCE" : "EXTRACT";
                    _.activeStyle = Panel?.querySelector(`[data-style=${find}]`);
                }
                const head_lvl = _.M_SCOPE.curElmPar?.getAttribute('data-levels') ||
                    (_.M_SCOPE.curElmParClass !== 'body' ? 1 : 0);
                this.autoGenerateList(parseInt(head_lvl));
            } else if (_.M_SCOPE.curElmClass === 'title' && _.M_SCOPE.curElmParClass === 'sec') {
                const head_lvl = _.M_SCOPE.curElement?.getAttribute('data-levels');
                this.autoGenerateList(parseInt(head_lvl));
                _.activeStyle = Panel?.querySelector(`[data-style="H${head_lvl}"]`);
                [_.M_SCOPE.IsHead, _.M_SCOPE.IsExtractPara, _.M_SCOPE.IsPara] = [true, false, false];
            }

            if (_.M_SCOPE.curElement?.isEqualNode?.(_.M_SCOPE.LAST_SEL_ELM)) {
                _._styleMenu?.onCursorChange(_.M_SCOPE.curElement, Panel);
                return;
            }

            _['IBOX'].STYLE_LIST?.forEach?.((el) => {
                el.classList.remove('active', 'disabled');
            });
            _.M_SCOPE.LAST_SEL_ELM = _.M_SCOPE.curElement;
            _._styleMenu?.onCursorChange(_.M_SCOPE.curElement, Panel);
            console.log('Cursor position Method Done');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getCursorPosition', err.message);
        }
    }
}

// ============================================================
// Strategy Classes for DOM Manipulation
// ============================================================

/**
 * Base strategy interface
 */
class BaseStyleStrategy {
    apply(ctx) {
        throw new Error('Strategy must implement apply()');
    }
}

/**
 * Heading Style Strategy - handles 'sec' class operations
 */
class HeadingStyleStrategy extends BaseStyleStrategy {
    apply(ctx) {
        const { newNode, curElm, parElm, scope, ck, module, labels } = ctx;
        let count = 0;

        // Replace outer with node
        curElm = ck.replaceOuter(curElm, newNode);
        scope.curElementId = curElm.id;

        // Re-parent siblings
        let next_Sibling = ck.getNext(curElm);
        while (next_Sibling) {
            if (!next_Sibling.id) {
                next_Sibling.id = window.GENERATE_ID?.();
            }

            const nextLevel = curElm.getAttribute('data-levels');
            const siblingLevel = next_Sibling.getAttribute('data-levels');

            if (next_Sibling.className !== 'sec' ||
                (next_Sibling.className === 'sec' && nextLevel !== siblingLevel)) {

                const next_Sibling_Nest = ck.getNext(next_Sibling);

                if (count === 0 && next_Sibling.className === 'p') {
                    const contentType = module.M_CONFIG?.STYLE_CONFIG?.P?.['content-type'];
                    if (contentType) next_Sibling.setAttribute('content-type', contentType);
                }

                ck.append(curElm, next_Sibling);
                count++;
                next_Sibling = next_Sibling_Nest;
            } else {
                break;
            }
        }

        // Handle level up/down parent moves
        const CUR_LEVEL = parseInt(curElm.getAttribute('data-levels'));
        const PAR_LEVEL = parseInt(parElm?.getAttribute?.('data-levels'));

        if (CUR_LEVEL === PAR_LEVEL || PAR_LEVEL > CUR_LEVEL) {
            if (PAR_LEVEL > CUR_LEVEL) {
                // Move siblings from parent
                let parentNext = ck.getNext(ck.getParent(curElm));
                while (parentNext) {
                    ck.append(curElm, parentNext);
                    parentNext = ck.getNext(ck.getParent(curElm));
                }
            }

            // Reposition within parent hierarchy
            const parentEl = ck.getParent(curElm);
            if (parentEl?.nextElementSibling) {
                ck.insertBefore(curElm, parentEl.nextElementSibling);
            } else if (parentEl?.parentNode) {
                parentEl.parentNode.appendChild(curElm);
            }
        }

        // Label restructuring
        let divList = [];
        const currentChapInfo = window.IS_JOURNAL
            ? { prefix: '' }
            : window.getPrefixBooks?.(parElm, 1) || { prefix: '', sub_levels: [] };

        if (!window.IS_JOURNAL) {
            divList = currentChapInfo.sub_levels;
        } else {
            divList = module.iDOM?.querySelectorAll?.(
                'div.body div.sec[data-levels="1"]:not([sec-type="Back_Matter"],[sec-type="supplementary-material"])'
            ) || [];
        }

        if (module._IsNumberHeadBool || currentChapInfo.prefix || currentChapInfo.first_level_lab) {
            module._IsNumberHeadBool = true;

            let new_prefix = currentChapInfo.prefix || '';
            if (new_prefix.length > 0) {
                new_prefix += new_prefix.indexOf('.') > -1 ? '' : '.';
            }
            if (module.M_CONFIG?.HEADING?.label_suffix) {
                new_prefix += module.M_CONFIG.HEADING.label_suffix;
            }

            labels.reStructure(divList, new_prefix, module);
        }

        window._IsDirty = true;
        return curElm;
    }
}

/**
 * Quote Style Strategy - handles 'disp-quote' class operations
 */
class QuoteStyleStrategy extends BaseStyleStrategy {
    apply(ctx) {
        const { newNode, curElm, parElm, scope, ck, module, config } = ctx;

        if (!curElm.id) {
            curElm.id = scope.curElementId || window.GENERATE_ID?.();
        }
        scope.curElementId = curElm.id;

        // Remove attributes via G_FUN for compatibility
        module.G_FUN?.SET_REMOVE_ATTR?.(curElm, {}, ['content-type', 'data-role']);

        if (parElm?.className !== "disp-quote") {
            const nextSibling = ck.getNext(curElm);
            if (nextSibling) {
                const contentType = config?.STYLE_CONFIG?.P?.['content-type'];
                if (contentType) nextSibling.setAttribute('content-type', contentType);
            }

            const IsPrev_disp = scope.prevElmClass === 'disp-quote';
            const IsNxt_disp = scope.nextElmClass === 'disp-quote';

            if (IsPrev_disp || IsNxt_disp) {
                const target = IsPrev_disp ? scope.prevElm : scope.nextElm;
                if (IsPrev_disp) {
                    ck.append(target, curElm);
                } else {
                    ck.prepend(target, curElm);
                }
            } else {
                // Wrap in newNode
                ck.replaceOuter(curElm, newNode);
                ck.append(newNode, curElm);
            }
        } else if (parElm?.className === "disp-quote") {
            // Handle via ATTR_HANDLE
            module.ATTR_HANDLE?.(curElm, { process: "para" });
        }

        return curElm;
    }
}

/**
 * Attribute Style Strategy - handles 'attrib' and source paragraphs
 */
class AttributeStyleStrategy extends BaseStyleStrategy {
    apply(ctx) {
        const { newNode, curElm, parElm, scope, ck } = ctx;

        const InsideExtractPara = parElm?.className === 'disp-quote';

        if (InsideExtractPara || (scope.prevElmClass === 'disp-quote' && curElm?.className === "p")) {
            // Apply style via G_FUN for compatibility
            const styleMap = ctx.styleJSON;
            ctx.module.G_FUN?.SET_REMOVE_ATTR?.(curElm, styleMap);

            if (!curElm.id) {
                curElm.id = window.GENERATE_ID?.();
                scope.curElementId = curElm.id;
            }

            if (!InsideExtractPara && scope.prevElm) {
                ck.append(scope.prevElm, curElm);
            }
        } else {
            console.warn('MISSING_STYLE');
        }

        return curElm;
    }
}

/**
 * Paragraph Style Strategy - handles 'p' class operations
 */
class ParagraphStyleStrategy extends BaseStyleStrategy {
    apply(ctx) {
        const { newNode, curElm, parElm, scope, ck, module, config } = ctx;

        const parClass = parElm?.className;
        const gParent = parElm?.parentElement;
        const gParentClass = gParent?.getAttribute?.('data-name');

        if ([parClass, gParentClass].includes('disp-quote')) {
            // Handle via ATTR_HANDLE
            const remove = curElm?.getAttribute?.('content-type') === 'source' ? ['content-type'] : [];
            module.ATTR_HANDLE?.(curElm, { process: "para", remove });

            const dispOnePara = parElm?.childElementCount === 1;

            if (dispOnePara) {
                // Single para case - extract and insert after parent
                const insertTarget = gParentClass === 'p' ? gParent : parElm;
                module.G_FUN?.insertAfter?.(curElm, insertTarget);

                if (parElm?.childElementCount === 0) {
                    parElm.remove();
                }
                // Track modification
                module.ATTR_HANDLE?.(curElm, { process: "track" });
            } else {
                // Multi-para case - split logic
                const curIndex = Array.from(parElm?.children || []).indexOf(curElm);

                if (curIndex === 0) {
                    // First para - extract before parent
                    parElm.parentElement?.insertBefore?.(curElm, parElm);
                    module.ATTR_HANDLE?.(curElm, { process: "track" });
                } else if (curIndex === (parElm.childElementCount - 1)) {
                    // Last para - insert after
                    module.G_FUN?.insertAfter?.(curElm, parElm);
                } else {
                    // Middle para - split into 3 parts
                    const clone_Para1 = ck.clone(parElm, false);
                    const clone_Para2 = ck.clone(parElm, false);
                    const clone_dummy = ck.clone(parElm, false);

                    Array.from(parElm.children).forEach((el, ind) => {
                        if (curIndex > ind) {
                            ck.append(clone_Para1, el);
                        } else if (curIndex < ind) {
                            ck.append(clone_Para2, el);
                        } else {
                            ck.append(clone_dummy, el);
                        }
                    });

                    clone_Para2.id = window.GENERATE_ID?.();
                    const tempElm = module.ATTR_HANDLE?.(curElm, { process: "para" }) || curElm;

                    // Replace original with 3 parts
                    ck.replace(parElm, clone_Para1);
                    ck.insertAfter(tempElm, clone_Para1);
                    ck.insertAfter(clone_Para2, tempElm);
                }
            }
        } else if (ctx.module.M_SCOPE.curElmPar !== 'disp-quote') {
            ErrorLogTrace('APPLY_P_STYLE', parClass + '+APPLY_STYLE_P_TAG');
        }

        return curElm;
    }
}

/**
 * Style Strategy Registry
 */
const styleStrategies = {
    'sec': new HeadingStyleStrategy(),
    'disp-quote': new QuoteStyleStrategy(),
    'attrib': new AttributeStyleStrategy(),
    'p': new ParagraphStyleStrategy()
};

/**
 * Get the appropriate strategy for a style
 */
function getStrategyForStyle(styleJSON) {
    if (!styleJSON?.class) return null;

    // Handle source paragraph as attribute strategy
    if (styleJSON.class === 'p' && styleJSON['content-type'] === 'source') {
        return styleStrategies['attrib'];
    }

    return styleStrategies[styleJSON.class] || null;
}

/**
 * DomManipulator - Orchestrates DOM operations using strategies
 */
class DomManipulator {
    constructor(module) {
        this.module = module;
        this.ck = new CkDom(module);
        this.labels = new LabelGenerator(module);
    }

    run(newNode, cur_Elm, styleJSON, cursor_id) {
        const module = this.module;
        const ck = this.ck;

        window.GlobalEditor?.updateElement?.();

        try {
            // Clear offscreen DOM
            if (module.iDOM) module.iDOM.innerHTML = '';

            // Save original references
            const _ParElm = cur_Elm?.parentElement;
            const _ParElmId = _ParElm?.id;
            const getCurElmInd = Array.from(_ParElm?.children || []).indexOf(cur_Elm);

            // Load to offscreen
            ck.loadOffscreen(cur_Elm);

            // Resolve elements in offscreen DOM
            let par_Elm = module.iDOM?.querySelector?.(`[id="${_ParElmId}"]`) || null;
            let cur_Elm_local = par_Elm?.children?.item?.(getCurElmInd) || cur_Elm || null;

            if (!cur_Elm_local) {
                ErrorLogTrace('DomManipulator', 'Could not resolve current element');
                return;
            }

            // Set scope context
            module._setScopeContext(cur_Elm_local);

            // Execute strategy
            const strategy = getStrategyForStyle(styleJSON);
            if (!strategy) {
                console.warn('Unknown style class:', styleJSON?.class);
                return;
            }

            const ctx = {
                newNode,
                curElm: cur_Elm_local,
                parElm: par_Elm,
                scope: module.M_SCOPE,
                ck,
                module,
                labels: this.labels,
                styleJSON,
                config: module.M_CONFIG,
                cursor_id
            };

            const result = strategy.apply(ctx);

            // Ensure ID is set
            if (!result.id) {
                result.id = window.GENERATE_ID?.();
            }
            module.M_SCOPE.curElementId = result.id;
            window._IsDirty = true;

            // Commit changes back to editor
            const isHeading = styleJSON.class === 'sec';
            ck.commit(_ParElmId, module.M_SCOPE.curElementId, styleJSON, cursor_id, isHeading);

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('DomManipulator', err.message);
        }
    }
}

// ============================================================
// Main ApplyStyleModule
// ============================================================

class ApplyStyleModule extends BaseModule {
    constructor(name = 'ApplyStyleModule', errorTracker = null, options = {}) {
        super(name, errorTracker, options);
        this._id = 'ApplyStyleDialog';
        this.canUnmountComponentWhileClose = true;
        
        this._IsNumberHeadBool = false;

        // Initialize internal helpers
        this._ck = new CkDom(this);
        this._labels = new LabelGenerator(this);
        this._rules = new StyleRuleValidator(this);
        this._dom = new DomManipulator(this);
        this._rulesEngine = new StyleRulesEngine();
        this._wrapEngine = new WrapEngine();
        this._styleMenu = new StyleMenuController(this, this._rulesEngine);
        this._bodyModifier = new BodyStyleModifier({}, {
            rulesEngine: this._rulesEngine,
            wrapEngine: this._wrapEngine
        });

        this._bindModuleMethods();
    }

    _bindModuleMethods() {
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== 'constructor' && typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        });
    }

    // ============================================================
    // Public API (preserved for backward compatibility)
    // ============================================================

    _normalizePrefix(prefix) {
        return this._labels.normalizePrefix(prefix);
    }

    _getHeadingConfig(level) {
        return this._labels.getHeadingConfig(level);
    }

    _buildLabel(Order, Level, prefix, cur_lab, options) {
        return this._labels.buildLabel(Order, Level, prefix, cur_lab, options);
    }

    _replaceOuterWithNode(cur_Elm, newNode) {
        return this._ck.replaceOuter(cur_Elm, newNode);
    }

    _setScopeContext(cur_Elm) {
        this.M_SCOPE.prevElm = cur_Elm.previousElementSibling;
        this.M_SCOPE.prevElmClass = this.M_SCOPE.prevElm?.className || null;
        this.M_SCOPE.nextElm = cur_Elm.nextElementSibling;
        this.M_SCOPE.nextElmClass = this.M_SCOPE.nextElm?.className || null;
    }

    fetch_set_lab_config() {
        try {
            Array.from(this.iDOM?.querySelectorAll?.('div.body div.sec[data-levels]') || []).forEach(sec => {
                const lvl = sec.getAttribute("data-levels");
                if (!this.M_CONFIG.HEADING?.["H" + lvl]) {
                    this.M_CONFIG.HEADING["H" + lvl] = {
                        label_end_delim: "",
                        label_prefix: "",
                        label_format: "",
                        label_between_delim: ""
                    };
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('fetch_set_lab_config', err.message);
        }
    }

    Label_Validation(Order, Level, prefix, cur_lab, Options = {}) {
        return this._labels.validate(Order, Level, prefix, cur_lab, Options);
    }

    RE_STRUCTURE(items, prefix) {
        return this._labels.reStructure(items, prefix, this);
    }

    ATTR_HANDLE(elm, Options = {}) {
        try {
            const AttrObj = {
                para: {
                    set: { "data-name": "p", "class": "p" },
                    remove: []
                },
                track: {
                    set: { 'data-style': 'modified', 'data-track-code': 'style-01', "default": ["dt", "du", "drn"] },
                    remove: []
                }
            };

            const ObjValue = AttrObj[Options.process];
            if (!ObjValue) return elm;

            const setObj = ObjValue.set;
            const removeArr = Options.remove || ObjValue.remove;

            this.G_FUN?.SET_REMOVE_ATTR?.(elm, setObj, removeArr);
            return elm;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ATTR_HANDLE', err.message);
        }
    }

    DomManipulation(newNode, cur_Elm, styleJSON, cursor_id) {
        return this._dom.run(newNode, cur_Elm, styleJSON, cursor_id);
    }

    Auto_Generate_Styles_List(a) {
        return this._rules.autoGenerateList(a);
    }

    fireStyle(b) {
        try {
            if (b.classList?.contains('disabled')) return;

            const StyleCode = b.getAttribute('data-Style');
            const newElm = document.createElement('div');
            const titleElm = document.createElement('div');
            const StyleMap = this.M_CONFIG?.STYLE_CONFIG?.[StyleCode];

            if (!StyleMap) return;

            const newLevel = StyleMap['data-levels'];

            // Handle head level change via title
            if (StyleMap.class === 'sec' && this.M_SCOPE.curElement?.className === 'title') {
                const curLevel = this.Panel?.querySelector('.styleList span.active')?.getAttribute('data-style');
                const parsedCurLevel = parseInt(curLevel?.substring?.(1));
                window.headLvlMod?.((parsedCurLevel > newLevel) ? window.UP : window.DOWN);
                return false;
            }

            // Apply attributes to new element
            Object.entries(StyleMap).forEach(([key, value]) => {
                newElm.setAttribute(key, value);
                if (StyleMap.class === 'sec') {
                    titleElm.setAttribute(key, key === 'data-levels' ? value : 'title');
                }
            });

            if (!newElm.id) {
                newElm.id = window.GENERATE_ID?.(StyleMap.class === 'sec' ? newLevel : null);
            }

            if (['attrib', 'sec', 'disp-quote', 'p'].includes(StyleMap.class)) {
                if (StyleMap.class === 'sec') {
                    if (!titleElm.id) {
                        titleElm.id = this.M_SCOPE.curElementId || window.GENERATE_ID?.();
                    }
                    this.M_SCOPE.curElementId = titleElm.id;
                    newElm.append(titleElm);
                }

                this.ATTR_HANDLE(newElm, { process: "track" });
                this.M_SCOPE.newElem = newElm;
                this.M_SCOPE.StyleMap = StyleMap;

                window.GlobalEditor?.execCommand?.('APPLY_STYLE');
                console.log(this.M_SCOPE.curElementId);
            }

            this['IBOX'].STYLE_LIST?.forEach?.(el => {
                el.classList[el.dataset.style === StyleCode ? 'add' : 'remove']('active');
            });

            console.log('Style Applied');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('fireStyle', err.message);
        }
    }

    CheckRule() {
        if (this.M_SCOPE.curElement) {
            this._styleMenu.onCursorChange(this.M_SCOPE.curElement, this.Panel);
            return;
        }
        return this._rules.checkRule();
    }

    getStyleMenuState() {
        return this._styleMenu.lastEvaluation;
    }

    analyzeBody() {
        const root = this.iDOM?.querySelector?.('div.body[data-name="body"]')
            || this._bodyModifier.getBodyRoot();
        return this._bodyModifier.analyze(root);
    }

    editorListener(editor) {
        try {
            if (!editor) editor = window.GlobalEditor || window.CKEDITOR?.instances?.maineditor;
            if (!editor?.addCommand) return;

            const menuGroup = editor._.menuGroups;
            if (!menuGroup?.headgroup) {
                editor.addMenuGroup('headgroup', 110);
            }

            const mod = this;
            const styleCodes = ['H1', 'H2', 'H3', 'P', 'EXTRACT', 'SOURCE'];
            const labels = {
                H1: 'Heading 1', H2: 'Heading 2', H3: 'Heading 3',
                P: 'Paragraph', EXTRACT: 'Extract', SOURCE: 'Source Line'
            };

            styleCodes.forEach((code, idx) => {
                const cmd = `STYLE_APPLY_${code}`;
                if (!editor.getCommand(cmd)) {
                    editor.addCommand(cmd, {
                        exec() {
                            const span = mod.Panel?.querySelector(`[data-style="${code}"]`);
                            if (span && !span.classList.contains('disabled')) {
                                mod.fireStyle(span);
                            }
                        }
                    });
                    editor.addMenuItem(cmd, {
                        label: labels[code],
                        command: cmd,
                        group: 'headgroup',
                        order: 100 + idx
                    });
                }
            });

            if (editor.contextMenu && !editor._applyStyleMenuListener) {
                editor._applyStyleMenuListener = true;
                editor.contextMenu.addListener((element, selection, elementPath) => {
                    const block = elementPath?.block?.$ || elementPath?.blockLimit?.$;
                    if (!block || !mod.M_CONFIG?.SHOW_CONTEXT_GROUP) return {};
                    if (!window.$(block).parents('.body').length) return {};

                    mod.M_SCOPE.curElement = block;
                    mod._styleMenu.evaluate(block);
                    return mod._styleMenu.syncContextMenuStates();
                });
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ApplyStyleModule.editorListener', err.message);
        }
    }

    headLevelValidation(item, index) {
        return this._rules.headLevelValidation(item, index);
    }

    getCursorPosition(Panel) {
        return this._rules.getCursorPosition(Panel);
    }

    initLoop(param1) {
        try {
            this._IsNumberHeadBool = false;
            this.M_CONFIG.HEAD_LIMIT = parseInt(window.GET_TYPE_CONFIG_QUERY?.('heading', 'maximum'));

            this.M_CONFIG.HEADING = this.G_FUN?.GET_CONFIG_ITEM?.(`[short="${window.SHORT_II_TITLE}"] heading`, {
                CONVERT_JSON: true, attr: true, children: true, keyUpperCase: true
            });

            this.M_CONFIG.STYLE_CONFIG = this.G_FUN?.GET_CONFIG_ITEM?.("styles", {
                CONVERT_JSON: true, children: true, keyUpperCase: true
            });

            this.M_CONFIG.SHOW_CONTEXT_GROUP = window.IsContextMenu?.('headgroup');

            if (!this.M_CONFIG.SHOW_CONTEXT_GROUP && window.GET_TYPE_CONFIG_QUERY?.("heading", "notallowed") === "yes") {
                this.M_CONFIG.SHOW_CONTEXT_GROUP = true;
            }

            this.M_SCOPE.LAST_SEL_ELM = null;
            this.M_SCOPE.RESTRICT_CLASS = ['caption', 'boxed-text', 'fig', 'td', 'tr', 'disp-formula', 'inline-formula'];
            this.M_SCOPE.LABEL_SELECTOR = ['.title[data-label]', '.title>.label'].map(el => 'div.body div.sec ' + el).join(",");

            this['IBOX'].STYLE_LIST = this.Panel?.querySelectorAll?.('span.iStyle');
            this['IBOX'].LAST_STYLE = this.Panel?.querySelector?.('#li6');

            const mod = this;
            this['IBOX'].STYLE_LIST?.forEach?.(el => {
                el.onclick = function(e) {
                    try {
                        if (e.currentTarget.className?.match?.(/active|disabled/)) {
                            window.debug?.log?.('not allowed');
                        } else {
                            mod.fireStyle(e.currentTarget);
                        }
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('el.onclick', err.message);
                    }
                };
            });

            const btn = document.querySelector('#menuapplystyle a');
            if (btn) {
                btn.onclick = function(e) {
                    if (e?.preventDefault) e.preventDefault();
                    if (typeof window.openApplyStyleDialog === 'function') {
                        window.openApplyStyleDialog();
                    } else {
                        mod.show();
                    }
                };
            }

            

            if (!this._IsNumberHeadBool) {
                this._IsNumberHeadBool = this.M_CONFIG.HEADING?.numbered === "yes";
            }

            const validation = this._rulesEngine.validate();
            if (!validation.valid) {
                console.warn('style-rules validation:', validation.errors);
            }

            if (window.GlobalEditor) {
                this.editorListener(window.GlobalEditor);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('this_initLoop', err.message);
        }

        this.FullyLoaded = true;
        this.AutoInitiated = true;
    }

    showLoop(param1, param2, param3) {
        try {
            this.M_SCOPE.cursorGroup = window.GlobalEditor?.elementPath?.();
            let IsBodyElement = null;

            if (this.M_SCOPE.cursorGroup) {
                this.M_SCOPE.curElement = this.M_SCOPE.cursorGroup.block?.$ ||
                    this.M_SCOPE.cursorGroup.blockLimit?.$;
                this.M_SCOPE.curElmClass = this.M_SCOPE.curElement?.className;
                this.M_SCOPE.curElmPar = this.M_SCOPE.curElement?.parentElement;
                this.M_SCOPE.curElmParClass = this.M_SCOPE.curElmPar?.className;
                this.M_SCOPE.LIST_ELM = this.M_SCOPE.curElement?.tagName === 'LI';
                this.M_SCOPE.curElementId = this.M_SCOPE.curElement?.id || "";
                IsBodyElement = window.$(this.M_SCOPE.curElement).parents('.body').length > 0;
            }

            const IsCaption = this.G_FUN?.Duplicate_Array?.(
                this.M_SCOPE.RESTRICT_CLASS,
                [this.M_SCOPE.curElmParClass, this.M_SCOPE.curElmClass, this.G_SCOPE?.IMS?.PARENT_CLAS],
                { find: true, bool: true }
            ) || false;

            const IsValidBool = !!(this.M_SCOPE.cursorGroup && IsBodyElement);

            this['IBOX'].STYLE_LIST?.forEach?.(el => {
                el.classList.remove('active');
                el.classList[IsValidBool && !IsCaption ? 'remove' : 'add']('disabled');
            });

            if (IsValidBool) {
                this.getCursorPosition(this.Panel);
            } else if (!this.M_SCOPE.cursorGroup) {
                window.TOASTER_ALERT?.('InvalidCursor', { type: 'warning' });
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('this_SHOW_LOOP', err.message);
        }
    }
}

export {
    ApplyStyleModule,
    StyleRulesEngine,
    WrapEngine,
    StyleMenuController,
    BodyStyleModifier
};

export default ApplyStyleModule;
