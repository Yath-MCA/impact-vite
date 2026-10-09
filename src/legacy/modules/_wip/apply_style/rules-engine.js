/**
 * Rules engine for Apply Style module.
 * Evaluates style-rules.json against cursor context.
 */

export const APPLY_STYLE_CODES = ['H1', 'H2', 'H3', 'P', 'EXTRACT', 'SOURCE'];

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

export function applyStyleAllDisabledState() {
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
export function applyStyleEvaluateRules(rulesJson, curElement, options) {
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

export function applyStyleSyncPanelFromEvaluation(styleList, evaluation) {
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