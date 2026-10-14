/**
 * DOM and label helpers for Apply Style module.
 */

/** Direct child .title, falling back to any descendant .title. */
export function findDirectTitle(el) {
    if (!el || !el.querySelector) return null;
    return el.querySelector(':scope > .title') || el.querySelector('.title') || null;
}

/** Active CKEditor instance (GlobalEditor, else maineditor). */
export function getMainEditor() {
    if (typeof GlobalEditor !== 'undefined' && GlobalEditor) return GlobalEditor;
    if (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances && CKEDITOR.instances.maineditor) {
        return CKEDITOR.instances.maineditor;
    }
    return null;
}

/** Collect nextElementSibling chain starting after el. */
export function nextElementSiblings(el) {
    const list = [];
    let sib = el && el.nextElementSibling;
    while (sib) {
        list.push(sib);
        sib = sib.nextElementSibling;
    }
    return list;
}

/** Apply a map of attribute name → value via setAttribute. */
export function setAttrs(el, map) {
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
export function applyStyleAnalyzeTitleLabels(sections) {
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

export function applyStyleGetLabText(root, Options) {
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
