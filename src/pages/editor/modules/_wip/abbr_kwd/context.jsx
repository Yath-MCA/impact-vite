document.addEventListener('DOMContentLoaded', () => {

    const intervalId = setInterval(async () => {

        if (typeof moduleSystem !== "undefined" && IS_EDITOR_PAGE) {

            clearInterval(intervalId);

            await moduleSystem.registerModule('placeHolderModule', {
                name: 'placeHolderModule',
                type: 'ondemand',
                path: './abbr_kwd/index.js',
                templatePath: '',
                dependencies: [],
                wrapping: true,

                group_name: 'Keyword',
                groupOrder: 120,
                commands: [{
                        name: 'ADD_KWD',
                        label: 'Add Keyword',
                        icon: '../assets/images/svg/ContextMenu/Add.svg',
                        action: 'addKeyword',
                        order: 91
                    },
                    {
                        name: "MOVE_LEFT",
                        label: 'Move Left',
                        icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
                        action: 'moveLeftKeyword',
                        order: 92
                    },
                    {
                        name: "MOVE_RIGHT",
                        label: 'Move Right',
                        icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
                        action: 'moveRightKeyword',
                        order: 93
                    },
                    {
                        name: 'DEL_KWD',
                        label: 'Delete Keyword',
                        icon: '../assets/images/svg/ContextMenu/Delete.svg',
                        action: 'delKeyword',
                        order: 94
                    }
                ],
                getIndexedElementInfo: function() {
                    const IMS = IMPACT_SELECTION || {};


                },
                getParams: function(action, defaultParams) {
                    var params = [];
                    const {
                        element,
                        selection,
                        elementPath
                    } = defaultParams;
                    try {} catch (error) {} finally {
                        return params;
                    }
                },
                contextMenuHandler: function(element, selection, elementPath, editor, subItems) {
                    debug.log("--kwd-abbr--");
                    const reTurnGroup = {};
                    const IMS = IMPACT_SELECTION || {};
                    const contextData = getSectionData(element, selection, elementPath, editor);
                    const {
                        sectionTxtLen,
                        isDelete
                    } = contextData;

                    if (!IMS.IsLinkNode && (EDITOR_CURSOR.IS_KWD || EDITOR_CURSOR.IS_ABR)) {

                        reTurnGroup.ADD_KWD = CKEDITOR.TRISTATE_OFF;

                        if (isDelete) {

                        } else {
                            reTurnGroup.MOVE_LEFT = CKEDITOR.TRISTATE_OFF;
                            reTurnGroup.MOVE_RIGHT = CKEDITOR.TRISTATE_OFF;
                            reTurnGroup.DEL_KWD = CKEDITOR.TRISTATE_OFF;
                        }
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
            });
        }
    }, 500); // Check every 500ms
});