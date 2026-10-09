/***********************
 * 
 * ref sorting  module
 * 
 * 
 */

const REF_SORT_MODULE_ID = 'RefSortingModule';
const REF_SORT_MODULE_CONFIG = {
    name: 'RefSortingModule',
    path: './ref_sort/index.js',
    templatePath: './ref_sort/template.html',
    type: 'ondemand',

    group_name: "ReferenceGroup",
    commands: [{
        name: 'RE_ORDER_ITEM_MENU',
        action: 'reorder',
        label: 'Reorder Reference',
        icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
        order: 205
    }],
    loadAdditionalValidation() {
        return !!iREF_SCOPE.IS_NAME_DATE;
    },
    // executeCommand: async function (editor, callGroup, moduleConfig, params) {},
    // onContentDomUpdate: function (editor, editable) {},
    contextMenuHandler: function(element, selection, elementPath, editor, subItems) {
        const IMS = IMPACT_SELECTION;
        var contextData = getSectionData(element, selection, elementPath, editor);
        var {
            mixedGroup,
            Count,
            isRefGroup,
            isDelete,
            isNotAllowed,
            sectionTxtLen
        } = contextData;

        var MenuReturn = {};
        var disableMenu = false;
        if (window.paraLock && window.paraLock._isEnabled && window.paraLock._isElementLocked) {
            var el = elementPath.blockLimit || elementPath.block;
            if (el.$.closest(".ref-list") && el.$.closest(".ref-list").querySelector(".para-locked")) {
                disableMenu = true;
            }
        }

        if ((isRefGroup || IMS.IsRefGroup) && mixedGroup && !isNotAllowed && iREF_SCOPE.IS_NAME_DATE) {
            if (Count > 0 && !isDelete && !disableMenu) {
                MenuReturn.RE_ORDER_ITEM_MENU = CKEDITOR.TRISTATE_OFF;
            }
        }
        return MenuReturn;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(REF_SORT_MODULE_ID, REF_SORT_MODULE_CONFIG);
});