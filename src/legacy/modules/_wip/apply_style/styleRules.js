/**
 * StyleRulesEngine — JSON-driven rule evaluation for apply-style panel + context menu.
 */

import defaultRules from './style-rules.json';

const STYLE_CODES = ['H1', 'H2', 'H3', 'P', 'EXTRACT', 'SOURCE'];

function getSiblingIndex(el) {
    if (!el?.parentElement) return -1;
    return Array.prototype.indexOf.call(el.parentElement.children, el);
}

function getQuoteParas(quoteEl) {
    if (!quoteEl) return [];
    return Array.from(quoteEl.children).filter((c) => c.className === 'p');
}

function getQuoteParaIndex(pEl) {
    const quote = pEl?.parentElement;
    if (quote?.className !== 'disp-quote') return -1;
    return getQuoteParas(quote).indexOf(pEl);
}

function compareOp(actual, op, expected) {
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

function evaluateWhen(conditions, ctx) {
    if (!conditions?.length) return true;
    return conditions.every((c) => compareOp(ctx[c.field], c.op, c.value));
}

function isInsideBody(el, rootSelector = "div.body[data-name='body']") {
    return !!(el?.closest?.(rootSelector));
}

function hasRestrictedAncestor(el, restrictedClasses) {
    let node = el?.parentElement;
    while (node) {
        if (restrictedClasses.includes(node.className)) return true;
        if (node.className === 'body' && node.getAttribute('data-name') === 'body') break;
        node = node.parentElement;
    }
    return false;
}

function buildCursorContext(curElement, options = {}) {
    const restricted = options.restrictedParentClasses || defaultRules.scope.restrictedParentClasses;
    const parent = curElement?.parentElement;
    const parentClass = parent?.className || '';
    const quoteParas = parentClass === 'disp-quote' ? getQuoteParas(parent) : [];

    return {
        element: curElement,
        elementClass: curElement?.className || '',
        tagName: curElement?.tagName || '',
        parentClass,
        insideBody: isInsideBody(curElement, options.rootSelector || defaultRules.scope.rootSelector),
        inRestrictedParent: hasRestrictedAncestor(curElement, restricted),
        isListItem: curElement?.tagName === 'LI',
        inFormula: window.IMPACT_SELECTION?.PARENT_CLAS === 'inline-formula',
        inTableFoot: ['table-wrap-foot'].includes(window.IMPACT_SELECTION?.PARENT_CLAS)
            || ['table-wrap-foot'].includes(window.IMPACT_SELECTION?.G_PARENT_CLAS),
        siblingIndex: getSiblingIndex(curElement),
        quoteParaIndex: getQuoteParaIndex(curElement),
        quoteParaCount: quoteParas.length,
        prevElmClass: curElement?.previousElementSibling?.className || null,
        headLevel: parseInt(parent?.getAttribute?.('data-levels') || curElement?.getAttribute?.('data-levels') || '0', 10),
        showContextGroup: options.showContextGroup !== false,
        headLimit: options.headLimit || 6
    };
}

function matchContext(ctx, matchDef) {
    if (!matchDef) return false;
    if (matchDef.insideBody === true && !ctx.insideBody) return false;
    if (matchDef.insideBody === false && ctx.insideBody) return false;
    if (matchDef.inRestrictedParent === true && !ctx.inRestrictedParent) return false;
    if (matchDef.elementClass && ctx.elementClass !== matchDef.elementClass) return false;
    if (matchDef.parentClass && ctx.parentClass !== matchDef.parentClass) return false;
    if (matchDef.tagName && ctx.tagName !== matchDef.tagName) return false;
    return true;
}

function resolveActive(activeDef, ctx) {
    if (!activeDef) return null;
    if (Array.isArray(activeDef)) {
        if (activeDef.includes('P') && ctx.elementClass === 'p' && ctx.parentClass !== 'disp-quote') return 'P';
        if (activeDef.includes('EXTRACT') && ctx.parentClass === 'disp-quote' && ctx.elementClass === 'p') return 'EXTRACT';
        if (activeDef.includes('SOURCE') && ctx.elementClass === 'attrib') return 'SOURCE';
        return activeDef[0] || null;
    }
    if (activeDef.rule === 'dynamicHeadingLevel' && ctx.elementClass === 'title') {
        const lvl = ctx.headLevel || parseInt(ctx.element?.getAttribute?.('data-levels') || '1', 10);
        return `H${lvl}`;
    }
    return null;
}

function headLevelValidationEnabled(ctx, targetLevel, module) {
    if (!ctx.showContextGroup) return false;
    if (ctx.parentClass !== 'sec') return false;

    const curHeadLevel = parseInt(ctx.element?.parentElement?.getAttribute?.('data-levels') || '0', 10);
    const paras = Array.from(ctx.element.parentElement?.children || []).filter((n) => n.className === 'p');
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
    return [-1, 0, 1].includes(diffCount);
}

function headingLevelChangeEnabled(ctx, direction, module) {
    if (!ctx.showContextGroup || ctx.elementClass !== 'title') return false;
    const curSec = ctx.element?.parentElement;
    if (!curSec || curSec.className !== 'sec') return false;

    const curLevel = parseInt(curSec.getAttribute('data-levels') || '1', 10);
    const curPar = curSec.parentElement;
    const secs = curPar ? Array.from(curPar.querySelectorAll(':scope > div.sec')) : [];
    const curInd = secs.indexOf(curSec);

    let canUp = false;
    let canDown = false;

    let sib = curSec.previousElementSibling;
    while (sib) {
        if (['sec', 'p', 'disp-quote'].includes(sib.className)) {
            canUp = true;
            if (curInd !== 0 && curSec.querySelector('.p')) canDown = true;
            break;
        }
        sib = sib.previousElementSibling;
    }

    if (direction === 'up') return curLevel !== 1 && canUp;
    if (direction === 'down') return curLevel < (module?.M_CONFIG?.HEAD_LIMIT || ctx.headLimit) && canDown;
    if (direction === 'current') return true;
    return false;
}

function resolveEnabledValue(def, styleCode, ctx, module) {
    if (def === true) return true;
    if (def === false) return false;
    if (def?.when) return evaluateWhen(def.when, ctx);
    if (def?.rule === 'headLevelValidation') {
        return headLevelValidationEnabled(ctx, def.params?.targetLevel, module);
    }
    if (def?.rule === 'headingLevelChange') {
        const idx = { H1: 'up', H2: 'current', H3: 'down' };
        return headingLevelChangeEnabled(ctx, def.params?.direction || idx[styleCode], module);
    }
    return false;
}

function allDisabledState() {
    return STYLE_CODES.reduce((acc, code) => {
        acc[code] = { enabled: false, active: false };
        return acc;
    }, {});
}

class StyleRulesEngine {
    constructor(rulesJson = defaultRules) {
        this.rules = rulesJson;
    }

    setRules(rulesJson) {
        this.rules = rulesJson;
    }

    validate() {
        const errors = [];
        if (!this.rules?.version) errors.push('missing version');
        if (!this.rules?.contexts?.length) errors.push('missing contexts');
        if (!this.rules?.validation?.contextOrder?.length) errors.push('missing contextOrder');
        this.rules?.contexts?.forEach((c) => {
            if (!c.id) errors.push('context missing id');
        });
        return { valid: errors.length === 0, errors };
    }

    buildContext(curElement, options = {}) {
        return buildCursorContext(curElement, {
            ...options,
            restrictedParentClasses: this.rules.scope?.restrictedParentClasses,
            rootSelector: this.rules.scope?.rootSelector
        });
    }

    evaluate(curElement, module = null, options = {}) {
        const ctx = this.buildContext(curElement, {
            showContextGroup: module?.M_CONFIG?.SHOW_CONTEXT_GROUP,
            headLimit: module?.M_CONFIG?.HEAD_LIMIT,
            ...options
        });

        const order = this.rules.validation?.contextOrder || [];
        const contexts = this.rules.contexts || [];

        for (const ctxId of order) {
            const def = contexts.find((c) => c.id === ctxId);
            if (!def || !matchContext(ctx, def.match)) continue;

            const activeCode = resolveActive(def.active, ctx);
            const state = allDisabledState();

            STYLE_CODES.forEach((code) => {
                const enabledDef = def.enabled?.[code];
                state[code] = {
                    enabled: resolveEnabledValue(enabledDef, code, ctx, module),
                    active: activeCode === code
                };
            });

            return { contextId: def.id, ctx, styles: state };
        }

        return { contextId: null, ctx, styles: allDisabledState() };
    }

    analyzeBody(rootEl) {
        const classes = {};
        const contentTypes = {};

        if (!rootEl) return { classes, contentTypes, inline: 0, uniqueClasses: 0 };

        rootEl.querySelectorAll('[class]').forEach((el) => {
            el.className.split(/\s+/).filter(Boolean).forEach((c) => {
                classes[c] = (classes[c] || 0) + 1;
            });
        });
        rootEl.querySelectorAll('[content-type]').forEach((el) => {
            const ct = el.getAttribute('content-type');
            contentTypes[ct] = (contentTypes[ct] || 0) + 1;
        });

        return {
            classes,
            contentTypes,
            inline: rootEl.querySelectorAll('[style]').length,
            uniqueClasses: Object.keys(classes).length
        };
    }
}

export {
    StyleRulesEngine,
    buildCursorContext,
    getSiblingIndex,
    getQuoteParaIndex,
    getQuoteParas,
    evaluateWhen,
    defaultRules
};

export default StyleRulesEngine;
