$(document).ready(function() {
    $('#insertRefmenu').on('click', async function(event) {
        event.preventDefault();
        if (!IS_JOURNAL && SHARED_KEY.refstyle && ['CMS18', 'CMS 18'].includes(SHARED_KEY.refstyle)) {

        } else {
            GlobalEditor.execCommand("MULTI_REF_FORM_OPEN");
        }

    });
});



function dynamicLabel() {
    try {
        return `Insert Reference ${iREF_SCOPE.IS_NAME_DATE ? "After" : ""}`;
    } catch (error) {
        console.error("Error generating dynamic label:", error);
        // Fallback in case of error
        return "Insert Reference";
    }
}


const handleDeleteRef = async (editor, TARGET) => {
    const ID = TARGET.getId();
    const cur_seq = CHECK_ORDER.FIRE_ONCE(editor, {});
    const citeMissingBool = cur_seq.unlinkedRef.length > 0;
    const label = parseInt(ID.replace(/[^\d.]/g, "")).toString();
    const citeMissString = citeMissingBool ? cur_seq.unlinkedRef.filter(item => item !== label).join(",") : "";
    const IsLast = CitationNewModule['M_FUN'].CheckRefIsLast([ID]);

    const myConfirm = await IMPACT_ALERT('refdel001', {
        s_text: (IsLast || iREF_SCOPE.IS_NAME_DATE) ? 'text' : (citeMissingBool ? 'cite_miss' : 're_num'),
        miss_cite: citeMissString
    });

    if (myConfirm) {
        DEL_REF_FIRE(ID, {
            DIRECT_DEL: true
        });
    }
};

const REF_FORM_MODULE_ID = 'MultiRefModule';
const REF_FORM_MODULE_CONFIG = {
    name: 'MultiRefModule',
    type: 'onthefly',
    path: '',
    templatePath: './ref_form/template.html',
    dependencies: [],
    wrapping: true,

    moduleSetup: {
        Script2DOM: true,
        name: 'MultiRefModule',
        path: './ref_form/index.js',
    },


    group_name: 'ReferenceGroup',
    groupOrder: 200,
    commands: [{
            name: 'MULTI_REF_FORM_QRY',
            ignore_menu: true,
            action: 'query',
            label: 'Reference',
            icon: '../assets/images/svg/ContextMenu/Search.svg',
            order: 200
        },
        {
            name: 'GOTO_CITE_MENU',
            action: 'gotoCite',
            label: 'Goto Citation',
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            order: 201
        },
        {
            name: 'MULTI_REF_FORM_OPEN',
            action: 'open',
            label: dynamicLabel = () => `Insert Reference ${iREF_SCOPE.IS_NAME_DATE ? "After" : ""}`,
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            order: 202
        },
        {
            name: 'MULTI_REF_FORM_EDIT',
            action: 'edit',
            label: 'Edit Reference',
            icon: '../assets/images/svg/ContextMenu/Edit.svg',
            order: 203
        },
        {
            name: 'DEL_R_ITEM_MENU',
            action: 'deleteRef',
            label: 'Delete Reference',
            icon: '../assets/images/svg/ContextMenu/Delete.svg',
            order: 204
        }
    ],
    executeCommand: function(editor, item, moduleConfig, params) {
        const IMS = IMPACT_SELECTION;
        const TARGET = getTarget(editor, IMS);
        debug.log(JSON.stringify(item));
        switch (item.action) {
            case 'query':
            case 'edit':
            case 'open':
                const updatedNode = CommonUtils.handleSelectionAndNode(editor);
                const id = CommonUtils.getNodeId(updatedNode);
                const params = CommonUtils.createParams(item.action, id);
                window.MultiRefModule.show(id, params);
                break;
            case 'gotoCite':
                if (TARGET && CITATION_POPUP) {
                    window.CITATION_POPUP.GotoCite(TARGET);
                }
                break;
            case 'deleteRef':
                if (TARGET) {
                    handleDeleteRef(editor, TARGET);
                }
                break;
        }
    },
    contextMenuHandler: function(element, selection, elementPath, editor) {
        debug.log("--MultiRefDialog--");

        let MenuReturn = {};
        var IMS = IMPACT_SELECTION;

        var contextData = getSectionData(element, selection, elementPath, editor);
        var {
            mixedGroup,
            Count,
            editedBook,
            pubType,
            isPlaintext,
            isRefGroup,
            isDelete,
            isNotAllowed,
            target
        } = contextData;


        // ---------------------------------------------------------
        // ✔ Function: Find duplicate <span> classes (ignore comment)
        // ---------------------------------------------------------
        function findDuplicateSpanClasses(rootElem) {
            if (!rootElem || !rootElem.querySelectorAll) return [];

            const selectors = [
                ".mixed-citation",
                ".person-group[person-group-type='author']",
                ".person-group[person-group-type='editor']",
                ".source",
                ".volume",
                ".publisher-loc",
                ".publisher-name",
                ".year",
                ".collab",
                ".article-title",
                ".fpage",
                ".lpage",
                ".issue",
                ".chapter-title",
                ".ext-link",
                ".edition",
                ".etal"
            ];

            const duplicates = [];

            selectors.forEach(sel => {
                const count = rootElem.querySelectorAll(sel).length;
                if (count > 1) {
                    duplicates.push(sel);
                }
            });

            return duplicates;
        }

        // ---------------------------------------------------------
        // ✔ Detect duplicate classes under target
        // ---------------------------------------------------------
        const haveDuplicateElemnts = findDuplicateSpanClasses(target);

        const canIgnoreEdit = haveDuplicateElemnts.length > 0 && MultiRefModule && MultiRefModule.isOSO;

        console.log("Duplicate Elements Detected:", haveDuplicateElemnts);
        // ---------------------------------------------------------
        // ✔ Original logic starts here
        // ---------------------------------------------------------

        var allowedTypes = ["journal"];
        const isBooksAllowedtoEdit = IS_JOURNAL && SHARED_KEY.refstyle && ['CMS18', 'CMS 18'].includes(SHARED_KEY.refstyle);

        if (MultiRefModule && MultiRefModule.initiated == false) {
            MultiRefModule.init();
        }

        if ((isRefGroup || IMS.IsRefGroup) && !isNotAllowed) {

            if (MultiRefModule && MultiRefModule.M_CONFIG && MultiRefModule.M_CONFIG.ALLOWED_TYPE) {
                allowedTypes = MultiRefModule.M_CONFIG.ALLOWED_TYPE;
            }

            // Avoid Edit for mixed refs
            if (mixedGroup) {

                MenuReturn.MULTI_REF_FORM_OPEN = CKEDITOR.TRISTATE_OFF;
                if (!isDelete) MenuReturn.GOTO_CITE_MENU = CKEDITOR.TRISTATE_OFF;

                var canAllow = !isDelete && !isPlaintext && !canIgnoreEdit;

                if (canAllow && Count > 0) {
                    MenuReturn.DEL_R_ITEM_MENU = CKEDITOR.TRISTATE_OFF;

                    // Apply duplicate-class restriction here
                    if ((allowedTypes.indexOf(pubType) !== -1) && (isBooksAllowedtoEdit || IS_JOURNAL)) {
                        MenuReturn.MULTI_REF_FORM_EDIT = CKEDITOR.TRISTATE_OFF;
                    } else if (/other/gi.test(pubType)) {
                        // do nothing
                    }

                }
                if (isDelete) {
                    MenuReturn.ADD_NEW_CMD = CKEDITOR.TRISTATE_OFF;
                }

                // Collaboration lock rules
                const collabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);

                let lockedInfo = {
                    byOthers: [],
                    total: 0
                };

                if (collabEnabled && window.paraLock && window.paraLock.getLockedElementsByOthers) {
                    lockedInfo = window.paraLock.getLockedElementsByOthers();

                    if (lockedInfo.byOthers.length > 0) {

                        if (iREF_SCOPE.IS_NAME_DATE) {
                            ["DEL_R_ITEM_MENU", "MULTI_REF_FORM_OPEN"].forEach(key => {
                                if (MenuReturn[key]) delete MenuReturn[key];
                            });
                        }
                    }
                }

                return MenuReturn;
            }
        }

        return MenuReturn;
    }
};

document.addEventListener('DOMContentLoaded', () => {

    if (IS_LOCAL_HOST) debugger;

    ContextHelpers.registerOnReady(REF_FORM_MODULE_ID, REF_FORM_MODULE_CONFIG, {
        excludeCms18: true
    });

    if ((IS_UAT_DOMAIN || IS_LOCAL_HOST) && USER_INFO.IS_ADMIN) {

        var updateVal = setInterval(function() {

            if (
                GlobalEditor &&
                GlobalEditor.document &&
                GlobalEditor.document.$ &&
                GlobalEditor.document.$.body
            ) {
                var body = GlobalEditor.document.$.body;

                // Select all mixed-citation under .ref
                var collection = body.querySelectorAll(".ref .mixed-citation");

                if (collection && collection.length > 0) {
                    $(collection).attr("data-show-type", "true");
                    clearInterval(updateVal);
                }
            }

        }, 2500);
    }

});