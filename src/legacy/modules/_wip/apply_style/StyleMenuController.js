/**
 * StyleMenuController — unified panel + context menu state from StyleRulesEngine.
 */

import StyleRulesEngine from './styleRules.js';

class StyleMenuController {
    constructor(module, rulesEngine = null) {
        this.module = module;
        this.rulesEngine = rulesEngine || new StyleRulesEngine();
        this.lastEvaluation = null;
    }

    evaluate(curElement) {
        if (!curElement) {
            this.lastEvaluation = null;
            return null;
        }
        this.lastEvaluation = this.rulesEngine.evaluate(curElement, this.module);
        return this.lastEvaluation;
    }

    syncPanel(panelEl) {
        const styleList = this.module?.['IBOX']?.STYLE_LIST
            || panelEl?.querySelectorAll?.('span.iStyle')
            || [];

        const evaluation = this.lastEvaluation;
        if (!evaluation) {
            styleList.forEach?.((el) => {
                el.classList.remove('active');
                el.classList.add('disabled');
            });
            return;
        }

        styleList.forEach?.((el) => {
            const code = el.getAttribute('data-Style');
            const state = evaluation.styles?.[code];
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

        this.module?.['IBOX']?.LAST_STYLE?.classList?.add('disabled');
    }

    syncContextMenuStates() {
        const evaluation = this.lastEvaluation;
        if (!evaluation || typeof CKEDITOR === 'undefined') return {};

        const result = {};
        Object.entries(evaluation.styles || {}).forEach(([code, state]) => {
            const key = `STYLE_APPLY_${code}`;
            if (state.active) {
                result[key] = CKEDITOR.TRISTATE_DISABLED;
            } else if (state.enabled) {
                result[key] = CKEDITOR.TRISTATE_OFF;
            } else {
                result[key] = CKEDITOR.TRISTATE_DISABLED;
            }
        });
        return result;
    }

    onCursorChange(curElement, panelEl) {
        const _ = this.module;
        if (!curElement || !_?.['IBOX']?.STYLE_LIST) return;

        _.M_SCOPE.prevElm = curElement.previousElementSibling;
        _.M_SCOPE.prevElmClass = _.M_SCOPE.prevElm?.className || null;
        _.M_SCOPE.nextElm = curElement.nextElementSibling;
        _.M_SCOPE.nextElmClass = _.M_SCOPE.nextElm?.className || null;

        this.evaluate(curElement);
        this.syncPanel(panelEl || _.Panel);

        const activeCode = Object.entries(this.lastEvaluation?.styles || {})
            .find(([, s]) => s.active)?.[0];
        if (activeCode) {
            _.activeStyle = panelEl?.querySelector?.(`[data-style="${activeCode}"]`)
                || _.Panel?.querySelector?.(`[data-style="${activeCode}"]`);
        }
    }

    getWrapPreview(curElement, styleCode) {
        const styleDef = this.rulesEngine.rules?.styles?.find((s) => s.code === styleCode);
        if (!styleDef?.wrap || !curElement) return null;

        if (styleDef.targetClass === 'sec' && curElement.className === 'p') {
            const boundary = this.module?._wrapEngine?.getWrapBoundary?.(
                curElement,
                styleDef.dataLevels
            );
            return boundary ? { type: 'sec', level: styleDef.dataLevels, ...boundary } : null;
        }
        return null;
    }
}

export default StyleMenuController;
