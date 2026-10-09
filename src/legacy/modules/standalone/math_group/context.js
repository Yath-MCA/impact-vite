function replaceImageSrcOnLocalhost() {
    try {
        if (!GlobalEditor || !GlobalEditor.document || !GlobalEditor.document.$) return;

        const body = GlobalEditor.document.$.body;
        if (!body) return;

        body.querySelectorAll('img[src]').forEach(img => {
            try {
                const split = img.src.split("/IMPACT/");
                if (split.length > 1 && IS_LOCAL_HOST) {
                    const newSrc = BUCKET_URL + split[1];
                    img.setAttribute('src', newSrc);
                    debug.log(newSrc, img.src);
                }
            } catch (imgErr) {
                console.warn("IMG SRC replace error:", imgErr.message);
            }
        });

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('replaceImageSrcOnLocalhost', err.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    try {
        CKEDITOR.on('instanceReady', function() {

            if (!IS_LOCAL_HOST) return;

            let retry = 0;
            const maxRetry = 20;

            const interval = setInterval(function() {
                try {

                    if (
                        GlobalEditor &&
                        GlobalEditor.document &&
                        GlobalEditor.document.$ &&
                        GlobalEditor.document.$.body
                    ) {
                        replaceImageSrcOnLocalhost();
                        clearInterval(interval);
                        return;
                    }

                    retry++;
                    if (retry >= maxRetry) {
                        clearInterval(interval);
                        console.warn("Editor body not available after retries");
                    }

                } catch (err) {
                    console.warn(err.message);
                    clearInterval(interval);
                }

            }, 300);

        });

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('IMPACT_EDITOR-DOMContentLoaded', err.message);
    }
});


commonfn['mathrecordstore'] = function(response, opt) {
    try {
        //? only open case set db id.
        if (opt && response.id) {
            mathModule.db_id = response.id;
        } else {
            //? reset for after Edited
            mathModule.db_id = '';
            mathModule.IsEdited = false;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('mathrecordstore', err.message);
    }
};

const mathConfig = {
    commands: [{
            name: 'Insert_Math',
            action: 'MathOperation',
            label: "Insert Equation",
            icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
            order: 151,
            getItems: true,
            getItemsCallback: function() {
                let IMS = IMPACT_SELECTION;
                //To restrict numbered/unnumbered math in contextmenu caption|disp-quote|table-wrap-foot - 02_JAN_23_AN
                if (IMS.PARENTS_CLAS_LIST.toLocaleString().match(/caption|disp-quote|table-wrap-foot/) || !!IMS.NODE && IMS.NODE.getAttribute('content-type') == 'source') {
                    return {
                        Inline_Math: CKEDITOR.TRISTATE_OFF
                    };
                } else return {
                    Inline_Math: CKEDITOR.TRISTATE_OFF,
                    Number_Math: CKEDITOR.TRISTATE_OFF,
                    Un_Number_Math: CKEDITOR.TRISTATE_OFF
                };
            }
        },
        {
            name: 'Edit_Math',
            action: 'editMath',
            label: 'Edit Equation',
            icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
            order: 152
        },
        {
            name: 'Inline_Math',
            action: 'insert_inline',
            label: 'Inline',
            icon: '../assets/images/svg/ContextMenu/DeleteAffiliation.svg',
            order: 153
        },
        {
            name: 'Number_Math',
            action: 'insert_display_number',
            label: 'Numbered',
            icon: '../assets/images/svg/ContextMenu/SwapGivenSurName.svg',
            order: 154
        },
        {
            name: 'Un_Number_Math',
            action: 'insert_display_unnumber',
            label: 'Unnumbered',
            icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
            order: 155
        },
        {
            name: 'ChangeToUnNumber',
            action: 'convert_2_unnumber',
            label: 'Convert to Unnumber',
            icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
            order: 156
        },
        {
            name: 'ChangeToNumber',
            action: 'convert_2_number',
            label: 'Convert to Number',
            icon: '../assets/images/svg/ContextMenu/DeleteAffiliation.svg',
            order: 157
        }
    ],
    setup: {
        name: 'MathWorkFlow',
        moduleKey: 'mathModule',
        path: './math_group/index.js',
        type: 'onthefly',
        templatePath: '',
        dependencies: [],
        wrapping: true
    },
    executeCommand: async function(editor, item, moduleConfig, params) {
        debug.log("math-custom-executeCommand");

        window.mathModule.reset({
            resetCache: true
        });

        const {
            element,
            selection,
            elementPath
        } = params;

        // e.g., "insert_display_number" → ["insert", "display", "number"]
        const [actionName, type, thirdParams] = item.action.split("_");
        const isNumbered = thirdParams === "number";
        const isInline = type === "inline";
        mathModule.rightClick = true;
        // console.log("math-custom-executeCommand-item.action:", item.action, isInline, isNumbered);
        if (item.action === "editMath") {
            const mathEl = element.getAscendant(el =>
                el && typeof el.getAttribute === "function" &&
                /formula/.test(el.getAttribute('class') || el.getAttribute('data-name'))
            ) || element;

            mathModule.isEditMode = true;
            mathModule.show(editor, {
                type: /inline/.test(mathEl.getAttribute("class") || "") ? "inline" : "display",
                existingEl: mathEl,
                selection: selection,
                elementPath: elementPath
            });
            return;
        }

        if (/^convert_/i.test(item.action)) {
            mathModule.InterChangelabel(isNumbered ? "add" : "remove");
            return;
        }

        if (/^insert_/i.test(item.action)) {

            if (iKEY_EVENT_HANDLING.IS_DIALOG_OPEN()) return false;

            mathModule.type = isInline ? "inline" : "display";
            mathModule.rightClick = false;
            mathModule.seq = !isInline && isNumbered;

            if (IMPACT.USER_ENV_INFO.isSafari) {
                const range = GlobalEditor.createRange();
                range.moveToPosition(IMP_SAFARI.PREV_SEL, CKEDITOR.POSITION_AFTER_START);
                GlobalEditor.getSelection().selectRanges([range]);
                GlobalEditor.focus();
            }

            // GlobalEditor.getCommand("ckeditor_wiris_openFormulaEditor").exec();

            mathModule.show(editor, {
                type: type,
                thirdParams: thirdParams,
                existingEl: null,
                selection: selection,
                elementPath: elementPath,
                editor: editor
            });
            // mathModule.mathrecord({
            //     stage: "open",
            //     mathtype: "new"
            // });
        }
    },
    contextMenuHandler: function(element, selection, elementPath, editor) {
        const IMS = IMPACT_SELECTION;
        let MenuReturn = {};
        if (['ext-link', 'ice-del'].some(cls => IMS.PARENTS_CLAS_LIST.includes(cls)))
            return MenuReturn;

        var contextData = getSectionData(element, selection, elementPath, editor);
        var {
            target,
            ascentCite
        } = contextData;
        const CUR_LOC = EDITOR_CURSOR;

        debug.log("--math-group--");

        if (!CUR_LOC.IS_BODY || (!CUR_LOC.IS_PURE_PARA && !CUR_LOC.IS_FLOAT_PARA && !IMS.IsMath)) return MenuReturn;

        const IsTable = IsNodeContain(elementPath, SEARCH_KEY['tab'], false);
        const IsBookTable = IsTable && !IS_JOURNAL;
        const IsMath = IsNodeContain(elementPath, SEARCH_KEY['df'], false) || element.$.closest(SEARCH_KEY['if']);

        const range = GlobalEditor.getSelection().getRanges()[0];
        range.collapse(true);
        range.setStartAt(GlobalEditor.editable(), CKEDITOR.POSITION_AFTER_START);
        const myNext = range.getNextEditableNode();

        const ELEM_TAG = element.getName();
        const ELEM_WIRIS = element.hasClass('Wirisformula');
        const Math_Ascendant = element.getAscendant(el =>
            el && typeof el.getAttribute === "function" &&
            /formula/.test(el.getAttribute('class') || el.getAttribute('data-name'))
        );
        var dataName = target.getAttribute('data-name');
        const isParaOrFormula = ["p", "disp-formula", "inline-formula"].includes(dataName) || target.className === "p";
        const isCaptionParent = target.parentNode.className !== 'caption';
        const IsImg = ELEM_TAG === 'img';

        const handleMathOptions = () => {
            const LabNode = target.querySelector('.label');
            const IsDisplayMath = target.className === SEARCH_KEY['df'].substring(1);
            const Can_Edit = true;

            MenuReturn.Edit_Math = Can_Edit ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;

            // Future enhancements for numbered/un-numbered states

            if (IsDisplayMath) {

                const hasDataValue = LabNode && LabNode.hasAttribute('data-value');
                const state = Can_Edit ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;

                // MenuReturn[hasDataValue ? 'ChangeToUnNumber' : 'ChangeToNumber'] = state;
            }

            return MenuReturn;
        };

        if (!['a', 'img'].includes(ELEM_TAG) && myNext.$.nodeName !== 'A') {

            if (!IsBookTable && (isParaOrFormula || isCaptionParent)) {
                const selectedTextLen = selection.getSelectedText().length || 0;
                const canShow = selectedTextLen == 0 ? true : false;

                if (IsMath) {
                    return handleMathOptions();
                } else if (canShow && IS_ONLINE && !IMS.DEL_NODE) {
                    MenuReturn.Insert_Math = canShow ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
                }
            }
        } else if (IsImg && DOC_DTD === 'BITS' && ELEM_WIRIS && IsMath) {
            target = $(target).parents('.disp-formula')[0] || target;
            return handleMathOptions();
        } else if (IsImg && Math_Ascendant && IsMath) {
            target = $(target).parents('.disp-formula')[0] || target;
            return handleMathOptions();
        }

        return MenuReturn;
    }

};

const MATH_GROUP_MODULE_ID = 'mathModule';
const MATH_GROUP_MODULE_CONFIG = {
    name: 'MathWorkFlow',
    path: './math_group/index.js',
    type: 'lazy',
    templatePath: '',
    dependencies: [],
    wrapping: true,


    group_name: 'mathGroup',
    groupOrder: 150,
    commands: mathConfig.commands,
    executeCommand: mathConfig.executeCommand,
    contextMenuHandler: mathConfig.contextMenuHandler,
    onDoubleClick: function(evt, editor) {
        try {
            var el = evt.data.element.$;
            if (el.getAttribute('data-plugin') == 'mathlive') {
                if (window.mathModule && typeof window.mathModule.show === 'function') {
                    window.mathModule.show(editor, {
                        existingEl: el,
                        latex: $(el).find(".TEX").text()
                    });
                }
            }
        } catch (e) {
            debug.warn(e.message);
            ErrorLogTrace("onDoubleClick-Math", e.message);
        }

    }
};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(MATH_GROUP_MODULE_ID, MATH_GROUP_MODULE_CONFIG);
});