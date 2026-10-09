/**
 * WrapEngine — DOM wrap/unwrap for heading and extract style changes.
 */

const WRAP_STOP_CLASSES = ['table-wrap', 'fig', 'boxed-text'];

function collectWrapSiblings(startEl, targetLevel) {
    const collected = [startEl];
    let next = startEl.nextElementSibling;

    while (next) {
        if (WRAP_STOP_CLASSES.includes(next.className)) break;
        if (next.className === 'sec') {
            const sibLevel = parseInt(next.getAttribute('data-levels') || '0', 10);
            if (sibLevel <= targetLevel) break;
        }
        collected.push(next);
        next = next.nextElementSibling;
    }

    return collected;
}

function createSecShell(level, titleId) {
    const sec = document.createElement('div');
    sec.className = 'sec';
    sec.setAttribute('data-name', 'sec');
    sec.setAttribute('data-levels', String(level));
    sec.id = window.GENERATE_ID?.(level) || `sec-${Date.now()}`;

    const title = document.createElement('div');
    title.className = 'title';
    title.setAttribute('data-name', 'title');
    title.setAttribute('data-levels', String(level));
    title.id = titleId || window.GENERATE_ID?.() || `title-${Date.now()}`;
    sec.appendChild(title);

    return { sec, title };
}

function moveParagraphContentToTitle(pEl, titleEl) {
    while (pEl.firstChild) {
        titleEl.appendChild(pEl.firstChild);
    }
}

function normalizeParagraphContentType(pEl, isFirst) {
    if (!pEl || pEl.className !== 'p') return;
    pEl.setAttribute('content-type', isFirst ? 'flush-left' : 'indent');
}

function wrapToSec(pEl, level, options = {}) {
    const parent = pEl.parentElement;
    if (!parent) return null;

    const siblings = collectWrapSiblings(pEl, level);
    const { sec, title } = createSecShell(level, options.titleId);

    if (options.promoteParagraphToTitle !== false) {
        moveParagraphContentToTitle(pEl, title);
        pEl.remove();
    } else {
        title.textContent = options.titleText || '';
    }

    const insertBefore = siblings[0];
    parent.insertBefore(sec, insertBefore);

    siblings.forEach((node, idx) => {
        if (node === pEl && options.promoteParagraphToTitle !== false) return;
        sec.appendChild(node);
        if (node.className === 'p') {
            normalizeParagraphContentType(node, idx === 0);
        }
    });

    return sec;
}

function wrapToQuote(pEl) {
    const parent = pEl.parentElement;
    if (!parent) return null;

    const prev = pEl.previousElementSibling;
    if (prev?.className === 'disp-quote') {
        prev.appendChild(pEl);
        pEl.removeAttribute('content-type');
        return prev;
    }

    const next = pEl.nextElementSibling;
    if (next?.className === 'disp-quote') {
        next.insertBefore(pEl, next.firstChild);
        pEl.removeAttribute('content-type');
        return next;
    }

    const quote = document.createElement('div');
    quote.className = 'disp-quote';
    quote.setAttribute('data-name', 'disp-quote');
    quote.id = window.GENERATE_ID?.() || `quote-${Date.now()}`;
    parent.insertBefore(quote, pEl);
    quote.appendChild(pEl);
    pEl.removeAttribute('content-type');
    return quote;
}

function unwrapQuote(pEl) {
    const quote = pEl?.parentElement;
    if (quote?.className !== 'disp-quote') return pEl;

    const paras = Array.from(quote.children).filter((c) => c.className === 'p');
    const idx = paras.indexOf(pEl);

    if (paras.length <= 1) {
        quote.parentElement?.insertBefore(pEl, quote.nextSibling);
        if (!quote.children.length) quote.remove();
        normalizeParagraphContentType(pEl, true);
        return pEl;
    }

    if (idx === 0) {
        quote.parentElement?.insertBefore(pEl, quote);
        normalizeParagraphContentType(pEl, true);
        return pEl;
    }

    if (idx === paras.length - 1) {
        quote.parentElement?.insertBefore(pEl, quote.nextSibling);
        normalizeParagraphContentType(pEl, false);
        return pEl;
    }

    const quote2 = quote.cloneNode(false);
    quote2.id = window.GENERATE_ID?.() || `quote-${Date.now()}`;
    paras.slice(idx + 1).forEach((node) => quote2.appendChild(node));
    quote.parentElement?.insertBefore(pEl, quote.nextSibling);
    quote.parentElement?.insertBefore(quote2, quote.nextSibling);
    normalizeParagraphContentType(pEl, false);
    return pEl;
}

function getWrapBoundary(startEl, targetLevel) {
    const siblings = collectWrapSiblings(startEl, targetLevel);
    return {
        count: siblings.length,
        nodes: siblings,
        stopBefore: siblings[siblings.length - 1]?.nextElementSibling || null
    };
}

class WrapEngine {
    collectWrapSiblings(startEl, targetLevel) {
        return collectWrapSiblings(startEl, targetLevel);
    }

    wrapToSec(pEl, level, options) {
        return wrapToSec(pEl, level, options);
    }

    wrapToQuote(pEl) {
        return wrapToQuote(pEl);
    }

    unwrapQuote(pEl) {
        return unwrapQuote(pEl);
    }

    getWrapBoundary(startEl, targetLevel) {
        return getWrapBoundary(startEl, targetLevel);
    }
}

export {
    WrapEngine,
    collectWrapSiblings,
    wrapToSec,
    wrapToQuote,
    unwrapQuote,
    getWrapBoundary
};

export default WrapEngine;
