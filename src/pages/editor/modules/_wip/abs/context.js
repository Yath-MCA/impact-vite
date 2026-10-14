/* var absGroup80_Global = {
    loaded: false,
    SHOW_CONTEXT_GROUP: null,
    group_name: "AbstractGroup",
    config_name: "Abstruct",
    DE_STR_FIND: 'data-de-str',
    menuItems: {},
    commands: [{
            name: "ABS_UN_STR_ITEM",
            label: "Unstructure Abstract",
            command: 'ABS_DESRT',
            group: 'AbstractGroup',
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            order: 81
        },
        {
            name: "ABS_STR_ITEM",
            label: "Re-structure Abstract",
            command: 'ABS_RESRT',
            group: 'AbstractGroup',
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            order: 82
        }
    ],
    text_qa: `If your article includes a visual overview (graphic abstract) or supplemental material, the files are not available with the proof. These items are not edited and will be the same as the file(s) you submitted to the Editorial Office.`,
    text_non_qa: `If your article includes supplemental material, the files are not available with the proof. Supplemental material is not edited and will be the same as the file(s) you submitted to the Editorial Office.`,
    pre_alert: function() {
        try {
            var self = this;
            var timerAbs = setInterval(() => {
                if (typeof I_CONFIG != "undefined" && (typeof J_CONFIG != "undefined" || typeof SHORT_II_TITLE != "undefined" && SHORT_II_TITLE)) {

                    let j_config_temp = J_CONFIG ? J_CONFIG : I_CONFIG.querySelector(`[short="${SHORT_II_TITLE}"]`);

                    let isAHA = j_config_temp.hasAttribute("sub-journal") && j_config_temp.getAttribute("sub-journal") == "AHA"

                    let type_qa = ["ATV", "HAE", "HCI", "HCV", "HYP", "RES", "STR"].includes(SHORT_II_TITLE);
                    
                    let type_non_qa = ["HCG", "HCQ", "CIR", "HHF"].includes(SHORT_II_TITLE);

                    if ((type_qa || type_non_qa) && isAHA) {

                        let _key_ = self[type_qa ? "text_qa" : "text_non_qa"];

                        AlertNewDialog.fire('info', "PLEASE NOTE", _key_, 'OK', '', true, {
                            override: false
                        });

                        clearInterval(timerAbs);
                    } else {
                        clearInterval(timerAbs);
                    }
                }
            }, 500);

        } catch (error) {

        }
    }
};

const setupEditorCommands_80 = async (editor, commands, groupName) => {
    try {
        commands.forEach(item => {
            editor.addCommand(item.name, {
                exec: async function(editor) {
                    debug.log(JSON.stringify(item));
                    if (!absGroup80_Global.loaded) {
                        window.absModule = await moduleRegistry.getModule("AbstractGroupModule");
                        absGroup80_Global.loaded = true;
                    }
                    if (window.absModule)
                        window.absModule.contextMenuClick(editor, item.action);
                }
            });
            if (item.ignore_menu) return;
            absGroup80_Global.menuItems[item.name] = {
                label: typeof item.label === 'function' ? item.label() : item.label,
                icon: item.icon,
                command: item.name,
                group: groupName,
                order: item.order
            };
        });
        editor.addMenuItems(absGroup80_Global.menuItems);
    } catch (err) {
        ErrorLogTrace("absGroup80_Global", err.message);
    }
};

var editorListener_80 = function(editor) {
    try {
        let {
            group_name,
            commands
        } = absGroup80_Global;

        if (!editor) editor = (GlobalEditor ? GlobalEditor : CKEDITOR.instances.maineditor);
        var menuGroup = editor._.menuGroups;
        if (!menuGroup[group_name]) {
            editor.addMenuGroup(group_name, 650);
            setupEditorCommands_80(editor, commands, group_name);
        }
    } catch (err) {        
        ErrorLogTrace("AbstractGroup.editorListener_80", err.message);
    }
};

document.addEventListener('DOMContentLoaded', function(event) {
    CKEDITOR.on('instanceReady', function(ev) {
        console.log("------------abs-------");
        if (ev.editor.contextMenu) {
            ev.editor.contextMenu.addListener(function(element, selection, elementPath) {
                let IS_ABS = IsNodeContain(elementPath, SEARCH_KEY['abs'], false),
                    [IMS, MODULE, FRONT_RETURN] = [IMPACT_SELECTION, null, {}];
                if (!IS_ABS) {
                    return false;
                } else {
                    let {
                        group_name,
                        config_name,
                        SHOW_CONTEXT_GROUP
                    } = absGroup80_Global, tempResult = null;
                    if (SHOW_CONTEXT_GROUP == null) {
                        tempResult = IsContextMenu(group_name) || IsContextMenu(config_name);
                        absGroup80_Global.SHOW_CONTEXT_GROUP = tempResult;
                        if (tempResult) editorListener_80(ev.editor);
                        else return debug.log("abs-group disabled");
                    }
                    debug.log("abs-group");

                    let KEY = SEARCH_KEY['abs'];
                    let elmCheck = hasDataName(element, KEY);

                    element = elmCheck ? element : GlobalEditor.document.findOne(KEY);

                    let childLen = element.$.querySelectorAll('.sec').length;

                    let redoStu = element.$.getAttribute(absGroup80_Global.DE_STR_FIND);

                    if (childLen > 0 && (!redoStu)) {
                        FRONT_RETURN.unstrabs = CKEDITOR.TRISTATE_OFF;
                    } else if (redoStu) {
                        // redo un structure abtruct
                        FRONT_RETURN.strabs = CKEDITOR.TRISTATE_OFF;
                        //? OUP_J_XML_014 elementPath.block is Null Fixed Temp 
                        // Need to discuss IsNodeContain method common Fix DR_30_01_23
                    }
                    return FRONT_RETURN;
                }
            });
        }

        // absGroup80_Global.pre_alert();

    });
}); */