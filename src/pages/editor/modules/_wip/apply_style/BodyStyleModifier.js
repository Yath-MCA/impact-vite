/**
 * BodyStyleModifier — class-based style analysis and apply orchestration.
 */

import StyleRulesEngine from './styleRules.js';
import WrapEngine from './WrapEngine.js';

class BodyStyleModifier {
    constructor(styleConfig = {}, options = {}) {
        this.styleConfig = styleConfig;
        this.rootSelector = options.rootSelector || "div.body[data-name='body']";
        this.rulesEngine = options.rulesEngine || new StyleRulesEngine();
        this.wrapEngine = options.wrapEngine || new WrapEngine();
    }

    getBodyRoot(doc = document) {
        return doc.querySelector(this.rootSelector);
    }

    analyze(rootEl) {
        const target = rootEl || this.getBodyRoot();
        return this.rulesEngine.analyzeBody(target);
    }

    canApply(curElement, styleCode, module = null) {
        const result = this.rulesEngine.evaluate(curElement, module);
        return !!result.styles?.[styleCode]?.enabled;
    }

    getCursorState(curElement, module = null) {
        return this.rulesEngine.evaluate(curElement, module);
    }

    applyLocal(curElement, styleCode, styleMap) {
        if (!curElement || !styleMap) return curElement;

        const targetClass = styleMap.class;

        if (targetClass === 'disp-quote' && curElement.className === 'p') {
            return this.wrapEngine.wrapToQuote(curElement);
        }

        if (targetClass === 'p' && curElement.parentElement?.className === 'disp-quote') {
            return this.wrapEngine.unwrapQuote(curElement);
        }

        if (targetClass === 'sec' && curElement.className === 'p') {
            const level = parseInt(styleMap['data-levels'] || '1', 10);
            return this.wrapEngine.wrapToSec(curElement, level, { titleId: curElement.id });
        }

        Object.entries(styleMap).forEach(([key, value]) => {
            if (key === 'class') {
                curElement.className = value;
            } else {
                curElement.setAttribute(key, value);
            }
        });

        return curElement;
    }
}

export default BodyStyleModifier;
