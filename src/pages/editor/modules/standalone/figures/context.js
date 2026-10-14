function validateContext(element, selection, elementPath) {
    return {
        hasElement: !!element,
        hasSelection: !!selection,
        hasPath: !!elementPath,
        isValid: !!(element && selection && elementPath)
    };
}

function getSectionData(element, selection, elementPath, editor) {
    const paramsTransfer = {};

    try {
        if (!validateContext(element, selection, elementPath).isValid) {
            console.warn('Invalid context data provided to getSectionData');
            return paramsTransfer;
        }

        const target = paramsTransfer.target = (elementPath.block && elementPath.block.$) || (elementPath.blockLimit && elementPath.blockLimit.$);
        if (!target) return paramsTransfer;

        // Reference section detection
        paramsTransfer.isRef = target && SEARCH_KEY && SEARCH_KEY.ref && target.closest && target.closest(SEARCH_KEY.ref);
        paramsTransfer.sectionTxtLen = selection && selection.getSelectedText && selection.getSelectedText() && selection.getSelectedText().length || 0;
        paramsTransfer.ascentCite = element && element.getAscendant && element.getAscendant('a', true);

        if (paramsTransfer.isRef && typeof IMPACT_SELECTION !== 'undefined') {
            const IMS = IMPACT_SELECTION;

            paramsTransfer.Count = editor && editor.document && editor.document.find && editor.document.find('.ref') && editor.document.find('.ref').$.length || 0;
            paramsTransfer.isDelete = !!(target && target.hasAttribute && (target.hasAttribute('data-remove') || target.hasAttribute('data-delete'))) || false;
            paramsTransfer.mixedGroup = target && target.querySelector && target.querySelector('.mixed-citation');
            paramsTransfer.pubType = paramsTransfer.mixedGroup && paramsTransfer.mixedGroup.getAttribute && paramsTransfer.mixedGroup.getAttribute('publication-type');
            paramsTransfer.isPlaintext = target && target.getAttribute && target.getAttribute('data-ins-type') === 'plain_text';
            paramsTransfer.isNotAllowed = iREF_SCOPE && iREF_SCOPE.Reference && iREF_SCOPE.Reference.notallowed === 'yes';

            if (IMS && IMS.CUR_CHAPTER) {
                paramsTransfer.Count = IMS.CUR_CHAPTER.querySelectorAll('.ref').length;
            }

            paramsTransfer.editedBook = false;
            if (paramsTransfer.pubType && /book/gi.test(paramsTransfer.pubType)) {
                const requiredElements = paramsTransfer.mixedGroup && paramsTransfer.mixedGroup.querySelectorAll &&
                    paramsTransfer.mixedGroup.querySelectorAll('.article-title,.source,.person-group');
                paramsTransfer.editedBook = (requiredElements && requiredElements.length || 0) > 2;
            }
        }
    } catch (error) {
        console.error('Error in getSectionData:', error);
    }

    return paramsTransfer;
}

const FIGURES_MODULE_ID = 'floatsModule';
const FIGURES_MODULE_CONFIG = {
    name: 'floatsGroupModule',
    type: 'ondemand',
    path: './figures/index.js',
    templatePath: './figures/template.html',
    dependencies: [],
    wrapping: true,

    group_name: 'floatGroup',
    groupOrder: 120,
    commands: [{
            name: 'ADD_FIG',
            label: 'Insert Figure',
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            action: 'addFigure',
            order: 121
        },
        {
            name: 'REPLACE_FIG',
            label: 'Replace Figure',
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            action: 'repFigure',
            order: 122,
            ignore_menu: true
        },
        {
            name: 'ADD_TAB',
            label: 'Insert Table',
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            action: 'addTable',
            order: 123
        }
    ],

    beforeAlertShown: false,

    getParams: function(action, defaultParams) {
        var params = [];
        const {
            element,
            selection,
            elementPath
        } = defaultParams;
        try {
            const trimmed = action.slice(3);
            const evtId = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
            params.push(evtId);
            if (action == "repFigure") {
                params.push(element.getAscendant('div').$);
                // ? for replace method handle
            } else params.push(null);
            return params;
        } catch (error) {

        } finally {
            params.push(action);
            return params;
        }
    },
    contextMenuHandler: function(element, selection, elementPath, editor, subItems) {
        debug.log("--floatsModule--");
        const reTurnGroup = {};
        const IMS = IMPACT_SELECTION || {};
        const contextData = getSectionData(element, selection, elementPath, editor);
        const {
            sectionTxtLen
        } = contextData;

        if (!IMS.IsLinkNode && EDITOR_CURSOR.IS_PURE_PARA && sectionTxtLen == 0) {
            reTurnGroup.ADD_FIG = CKEDITOR.TRISTATE_OFF;
            reTurnGroup.ADD_TAB = CKEDITOR.TRISTATE_OFF;
        }

        let lockedInfo = {
            byOthers: []
        };
        if (window.paraLock && window.paraLock.getLockedElementsByOthers) {
            lockedInfo = window.paraLock.getLockedElementsByOthers();
            if (Array.isArray(lockedInfo.byOthers) && lockedInfo.byOthers.length > 0) {
                delete reTurnGroup.ADD_FIG;
                delete reTurnGroup.ADD_TAB;
            }
        }

        return reTurnGroup;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(FIGURES_MODULE_ID, FIGURES_MODULE_CONFIG);
});