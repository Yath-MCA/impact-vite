const NOTES_GROUP_MODULE_ID = 'noteModule';
const NOTES_GROUP_MODULE_CONFIG = {
    name: 'NotesGroupModule',
    path: './notes_group/index.js',
    templatePath: './notes_group/template.html',
    type: 'lazy',

    group_name: "notesGroup",
    groupOrder: 650,
    commands: [{
            name: 'GOTO_CITE_NOTE_MENU',
            action: 'gotoCite',
            label: "Goto Note Citation",
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            order: 650
        },
        {
            name: 'ADD_NOTE',
            action: 'open',
            label: 'Insert FootNote / EndNote',
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            order: 651
        },
        {
            name: 'DEL_NOTE',
            action: 'del_note',
            label: 'Delete Note with citation',
            icon: '../assets/images/svg/ContextMenu/Delete.svg',
            order: 652
        },
        {
            name: 'DEL_FN_CITE',
            action: 'del_fn_cite',
            label: 'Delete Footnote',
            icon: '../assets/images/svg/ContextMenu/Delete.svg',
            order: 653
        },
        {
            name: 'DEL_EN_CITE',
            action: 'del_en_cite',
            label: 'Delete Endnote',
            icon: '../assets/images/svg/ContextMenu/Delete.svg',
            order: 654
        }
    ],
    executeCommand: async function(editor, item, moduleConfig, params) {
        try {
            debug.log("NOTES_GROUP-executeCommand");
            const IMS = IMPACT_SELECTION;
            let TARGET = getTarget(editor, IMS);
            const collabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);

            debug.log(JSON.stringify(item));

            switch (item.action) {
                case 'gotoCite':
                    if (TARGET && CITATION_POPUP) {
                        if (!TARGET.hasClass("fn")) {
                            TARGET = TARGET.getAscendant("div");
                        }
                        if (TARGET) {
                            window.CITATION_POPUP.GotoCite(TARGET);
                        }
                    }
                    break;

                case 'open':
                    window.noteModule.show();
                    break;

                case 'del_note': {
                    const send_params = {
                        isCiteDelete: false,
                        isNoteDelete: true
                    };
                    window.noteModule.FIRE_DELETE(send_params);
                    break;
                }

                case 'del_fn_cite':
                case 'del_en_cite': {
                    const send_params = {
                        isCiteDelete: true,
                        isNoteDelete: false
                    };
                    window.noteModule.FIRE_DELETE(send_params);
                    break;
                }

                default:
                    debug.log("Unknown action: " + item.action);
                    break;
            }
        } catch (err) {
            console.warn('[NOTES_GROUP_MODULE_CONFIG] executeCommand:', err && err.message);
            if (typeof ErrorLogTrace !== 'undefined') ErrorLogTrace('NOTES_GROUP_MODULE_CONFIG', err && err.message);
        }

    },
    // onContentDomUpdate: function (editor, editable) {},
    contextMenuHandler: function(element, selection, elementPath, editor, subItems) {
        const IMS = IMPACT_SELECTION;
        var MenuReturn = {};
        const collabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);
        // ["graphic", 'inline-graphic', "xref", "ext-link", "ice-del"]
        if (["graphic", "ext-link", "ice-del"].some(cls => IMS.PARENTS_CLAS_LIST.some(c => c.includes(cls))))
            return MenuReturn;


        var contextData = getSectionData(element, selection, elementPath, editor) || {};
        var target = contextData.target;
        var ascentCite = contextData.ascentCite;

        // 1 Handle citation targets
        if (ascentCite && !ascentCite.hasAttribute("data-delete") && !ascentCite.hasAttribute("data-remove")) {
            var x_type = ascentCite.getAttribute("ref-type") || "";
            if (!/table/i.test(x_type)) {
                if (/fn|footnote/i.test(x_type)) {
                    MenuReturn.DEL_FN_CITE = CKEDITOR.TRISTATE_OFF;
                } else if (/endnote|end-note/i.test(x_type)) {
                    MenuReturn.DEL_EN_CITE = CKEDITOR.TRISTATE_OFF;
                }
            }
        }
        // 2 Handle notes
        else if (!IMS.IsLinkNode) {
            var isBookEndNote = false;
            if (!IS_JOURNAL && GlobalEditor && GlobalEditor.document && typeof GlobalEditor.document.findOne === "function") {
                isBookEndNote = GlobalEditor.document.findOne('.book-back .book-part[book-part-type="endNotes"]');
            }

            const {
                IS_FN_EN_NOTE,
                IS_PURE_PARA,
                IS_EXT_PARA
            } = EDITOR_CURSOR;

            if (IS_PURE_PARA || !!IS_EXT_PARA) {
                MenuReturn.ADD_NOTE = CKEDITOR.TRISTATE_OFF;
            } else if (target) {
                var noteTarget = null;
                if (/fn/i.test(target.className)) {
                    noteTarget = target;
                } else if (typeof target.closest === "function") {
                    noteTarget = target.closest(".fn");
                }

                var isDeleted = noteTarget && (noteTarget.hasAttribute("data-remove") || noteTarget.hasAttribute("data-delete"));

                if (noteTarget && !isDeleted && (IS_FN_EN_NOTE || isBookEndNote)) {
                    MenuReturn.GOTO_CITE_NOTE_MENU = CKEDITOR.TRISTATE_OFF;
                    MenuReturn.DEL_NOTE = CKEDITOR.TRISTATE_OFF;
                }
            }
        }

        // 3 Lock handling
        var lockedInfo = {
            byOthers: []
        };
        if (window.paraLock && typeof window.paraLock.getLockedElementsByOthers === "function") {
            lockedInfo = window.paraLock.getLockedElementsByOthers();
        }

        if (Array.isArray(lockedInfo.byOthers) && lockedInfo.byOthers.length > 0) {
            ["DEL_NOTE", "ADD_NOTE", "DEL_FN_CITE", "DEL_EN_CITE"].forEach(k => delete MenuReturn[k]);
        }


        return MenuReturn;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(NOTES_GROUP_MODULE_ID, NOTES_GROUP_MODULE_CONFIG);
});