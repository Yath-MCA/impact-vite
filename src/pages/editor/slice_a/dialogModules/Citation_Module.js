// debug.log("Citation_Module");

var CrossRefTemplate = `<div class="mDialog ds-none w-editor-access" id="CrossCitationModule">
    <div class="dialog-container lg">
        <div class="dialog-content">
            <!-- header -->
            <div class="dia_header_div">
                <div class="dia_header_text">Insert Cross Citation</div>
                <div class="ml-auto closeIcons" title="Close"><img class="n_Img" src="assets/images/svg/dialogClose.svg" alt="Close Icon"></div>
            </div>
            <!-- body -->
            <div class="d-flex flex-column crossref-body no-footer dialog-body" data-id="dialog-body">
                <!-- Top options -->
                <div class="d-flex justify-content-around x-ref-menu">
                    <div id="rDivbtn" data-list="rDiv" class="d-flex cross-Menu active" data-name="AddRef,true"data-role="bibr" title="References"><div class="cross-Menu-items"><img src="assets/images/svg/cite/xDialogRef_1.svg?${new Date().getTime()}" id="xRefimg" class="xRefDialogImg" alt="Reference Icon"></div></div>
                    <div id="fDivbtn" data-list="fDiv" class="d-flex cross-Menu" data-name="AddFigure,true"data-role="fig" title="Figures"><div class="cross-Menu-items"><img src="assets/images/svg/cite/xDialogFigure.svg?${new Date().getTime()}" id="xFigimg" class="xRefDialogImg"  alt="Figure Icon"></div></div>
                    <div id="tDivbtn" data-list="tDiv" class="d-flex cross-Menu" data-name="AddTable,true" data-role="table" title="Tables"><div class="cross-Menu-items"><img src="assets/images/svg/cite/xDialogTable.svg?${new Date().getTime()}" id="xTabimg" class="xRefDialogImg" alt="Table Icon"></div></div>
                    <div id="sDivbtn" data-list="sDiv" class="cross-Menu ds-none" data-name="AddSec" data-role="section" title="Sections"><div class="cross-Menu-items"><img src="assets/images/svg/cite/xDialogSection.svg?${new Date().getTime()}" id="xSecimg" class="xRefDialogImg" alt="Section Icon"></div></div>
                    <div id="fnDivbtn" data-list="fnDiv" class="cross-Menu ds-none" data-name="AddFn" data-role="fn" title="Footnotes"><div class="cross-Menu-items"><img src="assets/images/svg/cite/xDialogSection.svg?${new Date().getTime()}" id="xSecimg" class="xRefDialogImg" alt="Footnotes Icon"></div></div>
                </div>
                <!-- Option and button -->
                <div class="d-flex align-items-center" id="OptionButRow1">
                    <div class="flex-column w-100">
                        <div class="cross-chk d-flex">
                            <div class="d-flex col"><input type="text" autocomplete="off" class="form-control form-control-sm" id="cite_Show_Text" aria-label="Input Text" ></div>
                            <div class="d-flex"><button type="button" class="btn btn-sm primary-btn" id="insertCite" title="insert">Insert</button></div>
                        </div>
                        <div class="flex-column ds-none mt-2" id="secondary_row_opt">
                            <div class="d-flex row" id="bracket-group">
                                <div class="col-7 bracket-div" id="divbracket">
                                    <div class="row custom-control custom-switch">
                                        <span class="col-8">
                                            <input type="radio" aria-label="With Out Bracket" class="" id="withoutbracket" checked>
                                            <label class="" for="withoutbracket">Direct</label>
                                        </span>
                                        <span class="col-8">
                                            <input type="radio" aria-label="With Bracket" class="" id="withbracket">
                                            <label class="" for="withbracket">Indirect</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="col d-flex justify-content-center align-items-center" id="add_part_lab_div"><input type="checkbox" aria-label="Add part Label" class="" id="add_part_lab_chk"><span class="pl-1" id="">Add Part Label</span></div>
                            </div>
                        </div>
                        <div class="row d-flex mt-2 ds-none" id="row_example_show">
                            <div class="col-6">e.g <span class="">(</span>Figure 1<span class="">)</span></div>
                            <div class="col-6">e.g <span class="">(</span>Figure 1A and B<span class="">)</span></div>
                        </div>
                    </div>
                </div>
                <!-- search -->
                <div class="d-flex xref-search" id="OptionButRow2">
                    <div class="flex-column w-100">
                        <div class="d-flex">
                            <div class="d-flex col"><input type="text" autocomplete="off" class="form-control form-control-sm xsearch" id="CrossRef_Search" aria-label="Search" placeholder="Search"><i class="fas fa-search text-grey x-search" data-id="x-search" aria-hidden="true" title="Search"></i></div>
                            <div class="d-flex"><button id="addnewitem" type="button" class="btn primary-btn btn-sm" title="add new">Add New</button></div>
                        </div>
                    </div>
                </div>
                <!-- Listing the floats -->
                <div class="d-flex mt-2 float-item">
                    <div class="d-flex flex-fill float-div" id="float-div"><div class="flex-column flex-fill float-list-group" id="rDiv"></div><div class="flex-column flex-fill float-list-group d-none" id="fDiv"></div><div class="flex-column flex-fill float-list-group d-none" id="tDiv"></div><div class="flex-column flex-fill float-list-group d-none" id="eDiv"><i class="fa fa-refresh" aria-hidden="true"></i></div><div class="flex-column flex-fill float-list-group d-none" id="bDiv"><i class="fa fa-refresh" aria-hidden="true"></i></div><div class="flex-column flex-fill float-list-group d-none" id="sDiv"><i class="fa fa-refresh" aria-hidden="true"></i></div></div>
                </div>
            </div>
        </div>
    </div>
</div>`,
    Is_Float_Node = (elm) => ((elm.type == CKEDITOR.NODE_ELEMENT || elm.nodeType == CKEDITOR.NODE_ELEMENT) && /fig|tab/gi.test(elm.getAttribute("data-role")));
/* global CitationNewModule */
window.CitationNewModule = new dialogModule('CrossCitationModule', CrossRefTemplate);
// CitationNewModule.canUnmountComponentWhileClose = true;
document.addEventListener('DOMContentLoaded', function(event) {
    const intervalId = setInterval(async function() {
        if (typeof moduleRegistry !== "undefined" && typeof CitationforFloats !== "undefined") {
            try {
                const moduleDefinition = {
                    name: 'citeFloats',
                    // Direct class reference
                    moduleClass: CitationforFloats,
                    type: 'onthefly',
                    templatePath: '',
                    dependencies: [],
                    trackView: false
                };

                await moduleRegistry.registerDirectModule(moduleDefinition);
                window.citeFloats = await moduleRegistry.getModule("citeFloats");
                debug.log("✅ CitationforFloats initialized.");
                clearInterval(intervalId);
            } catch (err) {
                debug.log("❌ Error initializing CitationforFloats:", err);
            }
        }
        // check every 1.75 seconds
    }, 1750);

    CKEDITOR.on('instanceReady', function(ev) {
        if (ev.editor.contextMenu) {
            ev.editor.contextMenu.addListener(function(element, selection, elementPath) {

                // GlobalEditor.insertText('==CiteGroup==');
                if (window.paraLock && typeof window.paraLock._isElementLocked === "function") {
                    const isLocked = window.paraLock._isElementLocked(element, {
                        check_closest: true,
                        alertKey: 'ErrorLockedParaEdit'
                    });
                    if (isLocked) return {};
                }

                var [IMS, $this] = [IMPACT_SELECTION, CitationNewModule];
                if (!$this.M_CONFIG.SHOW_CONTEXT_GROUP) {
                    return false;
                } else if (!$this.FullyLoaded) {
                    $this.init();
                }

                var range = GlobalEditor.getSelection().getRanges()[0];
                var [_getAscend_A_true, myNext] = [(element.getAscendant('a', true)), range.getNextEditableNode()];
                if (IMPACT.USER_ENV_INFO.isSafari) {

                    if (IMP_SAFARI.CITE_EL) _getAscend_A_true = IMP_SAFARI.CITE_EL;
                }

                //? edit/delete for all type of Citations
                const RESTRICT_XREFS = ['aff', 'table-fn', 'endnote', 'footnote', 'chapter', 'boxed-text', 'equation', 'fn'];
                const ALLOWED_XREFS = ['bibr', 'table', 'fig'];

                const isRestrict = (curRole) => RESTRICT_XREFS.includes(curRole);
                const isAllowed = (curRole) => ALLOWED_XREFS.includes(curRole);

                var refTempDisable = false;

                if (iREF_SCOPE.Reference && iREF_SCOPE.Reference.notallowed && iREF_SCOPE.Reference.notallowed == "yes" && iREF_SCOPE.Reference.wip) {
                    refTempDisable = true;
                }

                if ($this.M_CONFIG.SHOW_CONTEXT_GROUP && !EDITOR_CURSOR.IS_FRONT) {
                    var [ADD_EDIT_DEL_RETURN, curSelElm] = [{}, ((elementPath.block != null) ? (elementPath.block.$) : (elementPath.blockLimit.$))];

                    if (_getAscend_A_true) {

                        var NextIsXref = myNext.$.nodeName == '#text' && myNext.$.className == 'xref' ? true : false,
                            curType = _getAscend_A_true.getAttribute('ref-type'),
                            IsDelete = _getAscend_A_true.getAttribute('data-remove'),
                            nextType = NextIsXref ? myNext.getAttribute('ref-type') : null;

                        var canDisableCiteMenu = curType == 'bibr' && refTempDisable;

                        if ((isAllowed(curType) || (nextType && isAllowed(nextType))) && !IsDelete && !canDisableCiteMenu) {
                            ADD_EDIT_DEL_RETURN.modCite = CKEDITOR.TRISTATE_OFF;
                            // ? 2438292: Deleting the figure citation
                            // if (!['fig', 'table'].includes(curType)) {
                            ADD_EDIT_DEL_RETURN.delCite = CKEDITOR.TRISTATE_OFF;
                            // }
                        }
                    } else if (!IMS.DEL_NODE && !IMS.IsLinkNode && EDITOR_CURSOR.IS_CITATION_ALLOWED) {
                        ADD_EDIT_DEL_RETURN.AddCite = CKEDITOR.TRISTATE_OFF;
                    }
                    return ADD_EDIT_DEL_RETURN;
                }
            });
        }
    });
});
CitationNewModule.editorListener = function(editor, _ = CitationNewModule) {
    try {
        debug.log("--CitationNewModule--");
        if (!editor) editor = (GlobalEditor ? GlobalEditor : CKEDITOR.instances.maineditor);
        var menuGroup = editor._.menuGroups;
        if (!menuGroup.citeGroup) {
            editor.addMenuGroup('citeGroup', 130);
        }
        ['ADD_CITATION', 'EDIT_CITATION', 'DEL_CITATION'].forEach(CMD => {
            GlobalEditor.addCommand(CMD, {
                exec: async function(editor) {
                    switch (CMD) {
                        case 'ADD_CITATION':
                            CitationNewModule.show();
                            break;
                        case 'EDIT_CITATION':
                            CitationNewModule.show({
                                FROM_EDIT_CITE: true
                            });
                            break;
                        case 'DEL_CITATION':
                            CitationNewModule.show({
                                FROM_DEL_CITE: true
                            });
                            break;
                        default:
                            break;
                    }
                }
            });
        });
        editor.addMenuItems({
            AddCite: {
                label: 'Insert Citation',
                icon: '../assets/images/svg/ContextMenu/Add.svg',
                command: 'ADD_CITATION',
                group: 'citeGroup',
                order: 131
            },
            modCite: {
                label: 'Edit Citation',
                icon: '../assets/images/svg/ContextMenu/Edit.svg',
                command: 'EDIT_CITATION',
                group: 'citeGroup',
                order: 132
            },
            delCite: {
                label: 'Delete Citation',
                icon: '../assets/images/svg/ContextMenu/Delete.svg',
                command: 'DEL_CITATION',
                group: 'citeGroup',
                order: 135
            }
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('CitationNewModule.editorListener', err.message);
    }
};
CitationNewModule.initLoop = function(data, _ = CitationNewModule) {
    try {
        _.IBOX.SearchOpt = _.Panel.querySelector('#CrossRef_Search');
        _.IBOX.bracketOpt = _.Panel.querySelector('#withbracket');
        _.IBOX.bracketOutOpt = _.Panel.querySelector('#withoutbracket');
        _.IBOX.PartLabDivOpt = _.Panel.querySelector('#add_part_lab_div');
        _.IBOX.PartLabOpt = _.Panel.querySelector('#add_part_lab_chk');
        _.IBOX.bracketDivOpt = _.Panel.querySelector('#divbracket');
        _.IBOX.SecondaryDivOpt = _.Panel.querySelector('#secondary_row_opt');
        _.IBOX.addNewBtn = _.Panel.querySelector('#addnewitem');
        _.IBOX.insertBtn = _.Panel.querySelector('#insertCite');
        _.IBOX.ShowText = _.Panel.querySelector('#cite_Show_Text');
        _.IBOX.FloatShowDiv = _.Panel.querySelector('#float-div');
        _.IBOX.ShowOptions = _.Panel.querySelector('#OptionButRow1');
        _.templateList = {
            "entryString": `<div class="flex-column row_entry" data-entry-id="{{id}}"><div class="first_row d-flex"><div class="d-flex mt-1 align-items-start"><input type="checkbox" aria-label="Check Box" class="cite_insert_chk"></div>{{{data}}}</div><div class="second_row row"><span class="col-2"></span><span class="col"><input type="text" placeholder = "Add part label" aria-label="PartLabel" class="part_label form-control"></span></div></div>`,
            "a": `<a class="xref" data-name="xref" data-role="{{role}}" href="#{{rid}}" ref-type="{{role}}" rid="{{rid}}" fid="{{fid}}">{{{txt}}}</a>`
        };
        _.M_SCOPE = {
            IS_SEL_WITH_PAIR: false,
            RE_ORDER_BY_REF_IDX: false,
            RE_ORDER_BY_CITE_IDX: true,
            CUR_INSTANCE: null,
            RESTRICT_CLASS: ["graphic", 'inline-graphic', "xref", "ext-link"],
            queryChecked: 'div.float-item input[type="checkbox"]:checked',
            queryPartLab: 'div.float-item .row_entry.checked input[type="checkbox"]:checked',
            queryFind: 'div[class="fig"][position="float"]:not([data-remove]), div[class="table-wrap"][position="float"]:not([data-remove]),div.ref:not([data-remove]),div.sec:not([data-remove]),div.fn:not([data-remove])',
            ImgIdArr: {
                "xRefimg": "xDialogRef",
                "xFigimg": "xDialogFigure",
                "xTabimg": "xDialogTable",
                "xSecimg": "xDialogSection"
            },
            MAP_JSON: {
                "entryString": `<div class="flex-column row_entry"><div class="first_row d-flex"><div class="d-flex mt-1 align-items-start"><input type="checkbox" aria-label="checkbox" class="cite_insert_chk"></div></div><div class="second_row row"><span class="col-2"></span><span class="col"><input type="text" class="part_label"></span></div></div>`,
                "fig": {
                    "labPatterns": {
                        "FIG": "Figures",
                        "PIC": "Pictures",
                        "MAP": "Maps",
                        "IMA": "Images",
                        "EXA": "Examples",
                        "AUD": "Audios",
                        "VID": "Videos",
                        "VIC": "Video Clibs",
                    },
                    "role": "fig",
                    "div": function(lab) {
                        try {
                            // Extract first three characters
                            const tempLab = lab.toUpperCase().slice(0, 3);

                            // Handle special cases where first 3 chars aren't unique
                            if (tempLab === "VID" && lab.toUpperCase().endsWith("CLIB")) {
                                // Return "Video Clips" if starts with "VIC"
                                return this.labPatterns["VIC"];
                            }

                            // Fallback to "Unknown" if not found
                            return this.labPatterns[tempLab] || "Figures";
                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace('CitationNewModule.MAP_JSON', err.message);
                        }
                    },
                    "divId": "#fDiv",
                    "class": "xlabel",
                    "classTwo": "xlabel two",
                    "text": function(a) {
                        try {
                            return getTxt($(a).find(GENERATE.getAttribute('figCap')));
                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace('CitationNewModule.MAP_JSON', err.message);
                        }
                    },
                    "figSrc": function(a) {
                        try {
                            return $(a).find('img').attr('src');
                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace('CitationNewModule.MAP_JSON', err.message);
                        }
                    }
                },
                "ref": {
                    "role": "bibr",
                    "div": "Reference",
                    "divId": "#rDiv",
                    "class": "xlabel",
                    "text": function(a) {
                        var elm = $(a).find(GENERATE.getAttribute('refCap'));
                        return stripHtmlText(getTxt(elm));
                    }
                },
                "sec": {
                    "role": "section",
                    "div": "Sections",
                    "divId": "#sDiv",
                    "class": "xlabel",
                    "text": function(a) {
                        var elm = $(a).find(GENERATE.getAttribute('secCap'));
                        return getTxt(elm);
                    }
                },
                "table-wrap": {
                    "role": "table",
                    "div": "Tables",
                    "divId": "#tDiv",
                    "class": "xlabel",
                    "text": function(a) {
                        return getTxt($(a).find(GENERATE.getAttribute('tabCap')));
                    }
                },
                "fn": {
                    "text": function(a) {
                        var elm = $(a).find('.p');
                        return stripHtmlText(getTxt(elm));
                    }
                }
            },
            EVENT_HANDLERS: {
                "initLoop": {
                    // ? static element
                    ".xRefDialogImg": {
                        "onmouseover": "hoverfn",
                        "onmouseout": "hoverfn"
                    },
                    ".cross-Menu": {
                        "onclick": "onChangeTab"
                    },
                    // "#withbracket": {
                    //     "onclick": "bracketHandle"
                    // },
                    "#insertCite": {
                        "onclick": "INSERT_CITE_FIRE"
                    },
                    "#withbracket": {
                        "onclick": "bracketHandle"
                    },
                    "#add_part_lab_chk": {
                        "onclick": "PartLabelOptHandle"
                    },
                    "#cite_Show_Text": {
                        "onkeyup": "Key_Press_Handle",
                        "onkeydown": "Key_Press_Handle"
                    },
                    "#CrossRef_Search": {
                        "onkeyup": "Search_Handle",
                        "onkeydown": "Search_Handle"
                    },
                    "#addnewitem": {
                        "onclick": "insertNewItem"
                    }
                },
                "showLoop": {
                    //? dynamic elements
                    ".cite_insert_chk": {
                        "onclick": "onChangeFireNew"
                    },
                    ".cite_chk_box": {
                        "onclick": "onChangeFireNew"
                    },
                    "#withbracket": {
                        "onclick": "onChangeType"
                    },
                    "#withoutbracket": {
                        "onclick": "onChangeType"
                    },
                    ".part_label": {
                        // "onkeydown": "OnKeyPress_PartLabel",
                        /*"paste":"Paste_Handler",  */
                        "oninput": "OnChange_PartLabel"
                    }
                }
            }
        };
        // _.Text_Cite_Type = _.Panel.querySelector('#cite_text_type');
        _.M_SCOPE.Tool_Tip_Arr = [];
        _.M_SCOPE.ReGen_Loop = 0;
        _.M_SCOPE.nCiteAttr = '';
        _.M_SCOPE.keyPressTimer = null;
        _.M_SCOPE.CiteModBool = _.M_SCOPE.keyPressCheck = _.M_SCOPE.IsInsert = _.M_SCOPE.IsEdit = _.M_SCOPE.IsDelete = _.M_SCOPE.IsReNumber = false;
        _.M_SCOPE.CiteOrder = _.M_SCOPE.CiteColl = _.M_SCOPE.EntryArrString = _.M_SCOPE.LastArrString = {};
        if (data != undefined) {
            _.M_FUN.CreateCiteList(data);
        }
        if (typeof APPLY_STYLE_MODULE !== "undefined" && APPLY_STYLE_MODULE._IsNumberHeadBool && !IS_JOURNAL) {
            commonMethods.SET_REMOVE_CLASS('sDivbtn', {
                remove: ["ds-none"],
                add: ["d-flex"]
            });
        }
        // ? getting info from config
        var config = I_CONFIG.querySelectorAll(`[name=floatGroup] functionality`);
        if (config) {
            config.forEach(entry => {
                let _find = entry.getAttribute('name'),
                    Show = entry.getAttribute('show');
                let elm = _.Panel.querySelector(`[data-name*="${_find}"]`);
                if (elm) elm.setAttribute('data-name', _find.concat(',', Show));
            });
        }
        //? Global Event Handle creation
        _.M_FUN.EventLoop('initLoop');
        _['M_CONFIG'].IsSupCite = _['G_CONFIG']['Reference']['text-format'] == "sup";
        _.M_SCOPE.DEL_ELM_OBJ = {
            NODE: "",
            PARENT: ""
        };
        _.M_CONFIG.SHOW_CONTEXT_GROUP = IsContextMenu('citeGroup');

        CitationNewModule.logError = function(functionName, error) {
            console.warn(`Error in ${functionName}: ${error.message}`);
            ErrorLogTrace(`CitationNewModule.${functionName}`, error.message);
        };
        _.formatter = new RangeFormatter({});
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('CitationNewModule_initLoop', err.message);
    }
};
CitationNewModule.TEST_LOOP = function(key, _ = CitationNewModule) {
    try {
        if (!_.FullyLoaded || IS_LOCAL_HOST || typeof _.M_SCOPE.DEL_ELM_OBJ == "undefined") return;
        let IS_FUN = typeof _.M_SCOPE.DEL_ELM_OBJ.NODE.getClientRect == "function";
        let REACT = IS_FUN ? _.M_SCOPE.DEL_ELM_OBJ.NODE.getClientRect() : null;
        debug.log([key, REACT]);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('TEST_LOOP', err.message);
    }
};
CitationNewModule.showBefore = async function(param1, param2, param3, self) {
    self = CitationNewModule;
    debug.log("-------showBefore----------");
    try {
        param1 = param1 || {
            FROM_EDIT_CITE: false,
            FROM_DEL_CITE: false
        };

        self.M_FUN.restoreDefaults();
        self.M_FUN.CheckCursorPosition(null, param1);

        const ridSplit = self.M_SCOPE.nCiteAttr.split(' ');

        if (param1.FROM_DEL_CITE) {
            if (ridSplit.length === 1) {
                self.M_FUN.Delete_Cite_Init();
                return false;
            }

            return await AlertNewDialog.fire('warning', "Warning", 'DEL_EDIT_DIALOG', 'Delete All', 'Modify', true, {
                    override: true,
                    text: IMPACT_SELECTION.SEL_TEXT
                })
                .then((result) => {
                    if (result.isConfirmed) {
                        debug.log("Delete action was confirmed");
                        self.M_FUN.Delete_Cite_Init();
                        return false;
                    }

                    if (result.isDenied) {
                        debug.log("Delete action was denied");
                        return true;
                    }
                });
        }

        return true;

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('showBefore', err.message);
    }
};

CitationNewModule.showLoop = function(param1, param2, param3, _ = CitationNewModule) {
    try {
        param1 = param1 ? param1 : ({
            FROM_EDIT_CITE: false,
            FROM_DEL_CITE: false
        });

        let OVER_ALL_COUNT = GlobalEditor.document.find("div.book-back div.ref-list").count();
        let BODY_COUNT = GlobalEditor.document.find("div.book-body div.ref-list").count();

        const editorData = IMPACT_SELECTION.CUR_CHAPTER && BODY_COUNT != 0 ? IMPACT_SELECTION.CUR_CHAPTER.outerHTML : GlobalEditor.getData();

        _.M_FUN.CreateCiteList(editorData);

        if (_.IBOX.bracketOpt) {
            _.IBOX.bracketOpt.checked = false;
            _.IBOX.bracketOpt.classList.remove("disabled");
        }
        if (_.IBOX.bracketOutOpt) {
            _.IBOX.bracketOutOpt.checked = true;
            _.IBOX.bracketOutOpt.classList.remove("disabled");
        }
        _.IBOX.bracketDivOpt.classList.remove('invisible');

        if (param1.FROM_EDIT_CITE || param1.FROM_DEL_CITE) {
            var Selection = GlobalEditor.getSelection();
            var sel_Text = Selection.getSelectedText();

            _.M_FUN.State_edit_items();
            _.IBOX.ShowText.value = sel_Text;

            $(_.IBOX.insertBtn).text('Modify').attr({
                ztxt: sel_Text,
                title: 'Modify'
            });

            _.M_FUN.EditMode();
            if (param1.FROM_DEL_CITE) {
                $(this.Panel).find(".dia_header_text").text('Cross Citation');
            }
        } else {
            _.M_FUN.AddNewMethod({
                ShowLoop: true
            });
        }
        _.Panel.querySelectorAll("#rDiv .cite_insert_chk").forEach(list => {
            list.className = "cite_chk_box";
        });
        _.M_FUN.EventLoop('showLoop');
        // ? 05_MAY_2023 - YA
        if (_.G_CONFIG.Reference.notallowed && _.G_CONFIG.Reference.notallowed == "yes") {
            _.iGetElmById(`rDivbtn`).classList.add("ds-none");
            _.M_FUN.onChangeTab(_.iGetElmById(`fDivbtn`), false);
        }
        _.SET_RANGE_CONFIG();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('CitationNewModule_showLoop', err.message);
    }
};
CitationNewModule.SET_RANGE_CONFIG = function(tab, direct, self) {
    self = CitationNewModule;
    try {
        tab = tab || self['M_FUN']['GET_SET_ACTIVE']();
        direct = direct || 'indircite';
        const configType = tab == 0 ? "Reference" : tab == 1 ? "Figure" : "Table";
        self.formatter = new RangeFormatter(self.G_CONFIG[configType][direct]);
    } catch (error) {
        this.logError('expandNumericRange', err);
    }
};
CitationNewModule['M_FUN'] = {
    GET_SET_ACTIVE: function(_ = CitationNewModule) {
        try {
            var Tab = _.Panel.querySelector('div.cross-Menu.active'),
                TabPar = Tab.parentElement,
                tabInd = Array.prototype.indexOf.call(TabPar.children, Tab);
            _.M_SCOPE.ACTIVE_TAB = tabInd;
            return tabInd;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_SET_ACTIVE', err.message);
        }
    },
    SET_ACT_TAB: function(_ = CitationNewModule) {
        try {
            var checkedLength = _.Panel.querySelectorAll(_.M_SCOPE.queryChecked).length;
            Array.from(_.M_SCOPE.ALL_TABS).forEach((el, ind, Arr) => {
                if (!el.classList.contains('active')) {
                    if (([0, 3].includes(_.M_SCOPE.ACTIVE_TAB)) || ([1, 2].includes(_.M_SCOPE.ACTIVE_TAB) && [0, 3].includes(ind))) {
                        el.classList.add('disabled');
                    }
                }
                if (checkedLength == 0) el.classList.remove('disabled');
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SET_ACT_TAB', err.message);
        }
    },

    NODE_VALIDATE: function(node, Option, _ = CitationNewModule) {
        try {
            if (node == null || node == undefined) {
                if (Option.alert) TOASTER_ALERT(Option.alert, {
                    type: Option.alerttype
                });
                return false;
            } else return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('NODE_VALIDATE', err.message);
        }
    },
    CheckCursorPosition: function(IsReturn_rid, Options = {}, _ = CitationNewModule, $this) {
        $this = this;
        const Obj = {
            IsNext: false,
            IsXrefElm: false,
            IsPrev: false,
            next: null,
            prev: null,
            nextNode: null,
            prevNode: null,
            GET_SIBILING: {
                0: 'getPrevious',
                1: 'getNext',
                prev: 'getPrevious',
                next: 'getNext'
            },
            GET_SOURCE_NODE: {
                0: 'getPreviousSourceNode',
                1: 'getNextSourceNode'
            },
            GET_ELM_SIBILING: {
                prev: 'previousElementSibling',
                next: 'nextElementSibling'
            },
            WHILE_COUNT: {
                prev: 0,
                next: 0
            }
        };

        const {
            FROM_DEL_CITE
        } = Options;
        try {
            const Selection = GlobalEditor.getSelection();

            if (!Selection || typeof Selection.getStartElement !== "function" || typeof Selection.getRanges !== "function") {
                return [Selection ? Selection.getSelectedText() : "", undefined, _.M_SCOPE.ACTIVE_TAB];
            }

            const selectedText = Selection && typeof Selection.getSelectedText === "function" && Selection.getSelectedText();

            if (selectedText && selectedText.trim().length > 0) {
                // ? raised bug on selection and open ciation dialog - 01_AUG_2026_YA
                return [selectedText, undefined, _.M_SCOPE.ACTIVE_TAB];
            }

            let curElm = Selection.getStartElement();

            if (!_.M_FUN.NODE_VALIDATE(curElm, {
                    alert: 'CiteWarningAlert',
                    alerttype: 'warning'
                })) return;

            const ranges = Selection.getRanges();
            const oRange = ranges && ranges[0] ? ranges[0] : null;
            if (!oRange) {
                return [Selection.getSelectedText(), undefined, _.M_SCOPE.ACTIVE_TAB];
            }
            oRange.collapse(true);
            oRange.setStartAt(GlobalEditor.editable(), CKEDITOR.POSITION_AFTER_START);

            Obj.next = oRange.getNextNode();
            Obj.prev = oRange.getPreviousNode() || Obj.next && Obj.next.getPreviousSourceNode();
            /*  ? 29_DEC_22-YA - CASE CLICK NODE MIDDLE/INSIDE - XREF _ IF WILL SPLIT
                <a> == curElm
                Tab ==  Obj.prev
                le 1 == Obj.next
                </a>
            */

            let Parent = curElm.$.parentElement;

            if (!Obj.nextNode || !Obj.prevNode) {
                const nativeSelection = Selection.getNative && Selection.getNative();
                if (nativeSelection) {
                    Obj.nextNode = Obj.nextNode || nativeSelection.anchorNode && nativeSelection.anchorNode.nextElementSibling;
                    Obj.prevNode = Obj.prevNode || nativeSelection.anchorNode && nativeSelection.anchorNode.previousElementSibling;
                }
            }

            if (["EM", "INSERT", "SPAN"].includes(curElm.$.tagName) && (Parent.tagName === 'A' || Parent.closest("a") || (curElm.find("a") && curElm.getAttribute("class") != "p"))) {
                if (Parent.tagName === 'A') {
                    curElm = curElm.getParent();
                } else {
                    const find = curElm.find("a");
                    if (find.count() > 0) {
                        curElm = find.getItem(find.count() - 1);
                        // ? 08_MAR_23 -YA - BUG FIX
                    } else {
                        curElm.getParents().forEach(el => {
                            if (el.getName() === "a") curElm = el;
                        });
                    }
                }
                if (curElm) Parent = curElm.$.parentElement;
            }

            if (curElm.$.tagName === 'A') {
                Obj.IsXrefElm = true;
                const _Parent = curElm.getParent();
                const _ParentTag = _Parent.$.tagName;

                [Obj.prev, Obj.next].forEach((node, idx) => {
                    const [_type_, _boolean_, _get_] = idx === 0 ? ['prev', 'IsPrev', 'getPrevious'] : ['next', 'IsNext', 'getNext'];
                    let Elm = Obj[_type_] = curElm[_get_]();

                    if (!Elm && ["INSERT", 'SUP'].includes(_ParentTag)) {
                        const parentFirst = _Parent.getFirst ? _Parent.getFirst() : null;
                        if (_ParentTag === "SUP" && parentFirst && typeof parentFirst.equals === "function" && parentFirst.equals(curElm)) {
                            Obj[_type_] = curElm;
                        } else {
                            const temp = _Parent[_get_]();
                            Obj[_type_] = temp || _Parent.getParent() && _Parent.getParent()[_get_]();
                        }
                    } else if (Parent.tagName === "SPAN" && Parent.hasAttribute("data-high")) {
                        // Do nothing (handled externally)
                        // ? EDIT/DELETE CITATION HANDLING IN CMD SELECTION - 1855574
                        //Obj[_type_] = _Parent[Obj.GET_SIBILING[idx]]();
                    } else if (Is_Float_Node(curElm) && Elm) {
                        if (Elm.type === CKEDITOR.NODE_TEXT && Elm[_get_]()) {
                            let sibling = Elm[_get_]();
                            if (sibling && sibling.type === CKEDITOR.NODE_TEXT && sibling.getText().length <= 3) {
                                sibling = sibling[_get_]();
                            }
                            if (sibling && sibling.type === CKEDITOR.NODE_ELEMENT && /a/gi.test(sibling.getName())) {
                                if (Is_Float_Node(sibling) && Elm.getText().length <= 3) {
                                    Obj[_type_] = sibling;
                                }
                            }
                        }
                    }
                });
            }

            [Obj.prev, Obj.next].forEach((node, idx) => {

                // ? 21_DEC_22 - YA - WHILE OPEN DIALOG VALIDATE THE CURSOR POSITION
                // ? https://ckeditor.com/docs/ckeditor4/latest/api/CKEDITOR_dom_selection.html#property-FILLING_CHAR_SEQUENCE

                if (!node) return;
                const IsElm_Node = node.type === CKEDITOR.NODE_ELEMENT;
                let txt = node.getText();

                if (!IsElm_Node && node.type === CKEDITOR.NODE_TEXT && CKEDITOR.dom.selection.FILLING_CHAR_SEQUENCE === txt) {
                    node = node[Obj.GET_SOURCE_NODE[idx]]();
                }

                const TAG = node.$ && node.$.tagName;
                const firstEl = node.$ && node.$.firstElementChild;
                if (node.type === CKEDITOR.NODE_ELEMENT && (TAG === 'A' || (["SUP", "INSERT"].includes(TAG) && firstEl && firstEl.tagName === 'A'))) {
                    Obj.IsXrefElm = true;
                    curElm = node;
                    if (Is_Float_Node(node) && node.getAscendant && node.getAscendant('insert', true)) {
                        node = node.getParent();
                    }
                    Obj.next = typeof node.getNext === "function" ? node.getNext() : node;
                    Obj.prev = typeof node.getPrevious === "function" ? node.getPrevious() : node;
                }
                // ? WHILE - EDIT CITATION - HANDLE DELI METER OF CITATION - 18_FEB_2023
                if (!IsElm_Node) {
                    // TODO FUTURE - HANDLE EDIT CITE ARE DIRECT EITHER IN_DIRECT
                }
            });

            if (_.M_SCOPE.ACTIVE_TAB === 0) _.IBOX.addNewBtn.classList[Obj.IsXrefElm ? 'add' : 'remove']('disabled');

            if (!Obj.IsXrefElm) {
                return [Selection.getSelectedText(), undefined, _.M_SCOPE.ACTIVE_TAB];
            }

            // ? select the xref node element
            let curPointNode = curElm.$.tagName === 'A' ? curElm : Obj.nextNode && Obj.nextNode.$.firstElementChild;

            if (!_.M_FUN.NODE_VALIDATE(curPointNode, {
                    alert: 'InvalidCursor',
                    alerttype: 'warning'
                })) return;

            if (curPointNode.$.tagName !== 'A') {
                const nextRanges = Selection.getRanges();
                const range = nextRanges && nextRanges[0] ? nextRanges[0] : null;
                if (!range) return;
                range.collapse(true);
                range.setStartAt(GlobalEditor.editable(), CKEDITOR.POSITION_AFTER_START);
                const nodeName = range.getNextEditableNode().$.nodeName;
                if (["A", "SUP"].includes(nodeName) || range.getNextEditableNode().$.className === 'xRefGroup') {
                    curPointNode = range.getNextEditableNode();
                }
            }

            if (!_.M_FUN.NODE_VALIDATE(curPointNode, {
                    alert: 'InvalidCursor',
                    alerttype: 'warning'
                })) return;

            const firstChild = curPointNode.$.firstElementChild;
            const curPointTag = curPointNode.$.tagName;
            const curPointParent = curPointNode.$.parentElement;

            const isSupWithAnchor = curPointTag === 'SUP' && firstChild && firstChild.tagName === 'A';

            if (!isSupWithAnchor) {
                const checkTextNode = (node, option) => {
                    try {
                        let textNode = node.$.textContent;
                        let checkSibling = false;

                        // Flag to traverse sibling if node is SUP, A, or INSERT
                        if (node.$.nodeType === CKEDITOR.NODE_ELEMENT && ["SUP", "A", "INSERT"].includes(node.$.tagName)) {
                            checkSibling = true;
                        }

                        // Move to sibling or parent’s sibling if needed
                        if (!textNode || checkSibling) {

                            node =
                                node[Obj.GET_SIBILING[option.type]]() ||
                                (
                                    node.getParent() &&
                                    node.getParent()[Obj.GET_SIBILING[option.type]]()
                                );

                            if (checkSibling) {
                                Obj[option.type] = node;
                            }

                            textNode =
                                node && node.$ ?
                                node.$.textContent || '' :
                                '';
                        }

                        // Get sibling DOM node (element sibling, not CKEDITOR node)
                        const SIBILING = node && node.$ && node.$[Obj.GET_ELM_SIBILING[option.type]];
                        const SIBILING_CHAR = option.type === 'prev' ? 'lastChar' : 'firstChar';
                        const IsAnchor = SIBILING && SIBILING.tagName === 'A';

                        const isSeparator = (
                            (
                                textNode &&
                                typeof textNode[SIBILING_CHAR] === "function" &&
                                /[;,]/.test(textNode[SIBILING_CHAR]())
                            ) ||
                            /^(and|,|;)$/i.test(textNode.trim())
                        );
                        const result = IsAnchor && textNode.length <= 5 && isSeparator;
                        // Conditions to identify label-like content
                        return result;

                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('checkTextNode', err.message);
                    }
                };


                [Obj.prev, Obj.next].forEach((node, idx) => {
                    if (!node) return;
                    const [_type_, _boolean_, _get_] = idx === 0 ? ['prev', 'IsPrev', 'getPrevious'] : ['next', 'IsNext', 'getNext'];
                    while (node && checkTextNode(node, {
                            type: _type_
                        })) {
                        Obj[_boolean_] = true;
                        node = Obj[_type_] = node[_get_]();
                        if (node && node.type === CKEDITOR.NODE_ELEMENT && node.$.tagName === 'A') {
                            const temp = node[_get_]();
                            Obj[_type_] = node = temp || node.getParent();
                            Obj[_boolean_] = checkTextNode(node, {
                                type: _type_
                            });
                        }
                        if (++Obj.WHILE_COUNT[_type_] === 40) break;
                    }
                });

                if (curPointTag === 'A' && curPointParent.tagName === "SUP") {
                    // ! FROM_DEL_CITE ? curPointNode :
                    const tempEl = curPointParent.childElementCount === 1 ? curPointNode : curPointNode.getParent();
                    Selection.selectElement(tempEl);
                } else if (Obj.prev && Obj.next) {
                    const ranges = Selection.getRanges()[0];
                    ranges.setStart(Obj.prev, Obj.IsPrev ? 0 : Obj.prev.$.textContent.length);
                    ranges.setEnd(Obj.next, Obj.IsNext ? 1 : 0);

                    if (/del|insert/gi.test(Obj.prev && Obj.prev.getName && Obj.prev.getName())) {
                        const next = Obj.prev.getNext();
                        ranges.setStart(next || Obj.prev, next ? 0 : 1);
                    }

                    Selection.selectRanges([ranges]);
                }
            } else {
                Selection.selectElement(curPointNode);
            }

            const nRange = Selection.getRanges()[0];
            const n = nRange.startContainer.getNext();

            _._SNAPSHOT({
                save: true,
                lock: true
            });

            if (n && n.type === 1 && n.getName() === "a") {
                n.find("span[data-high]").toArray().forEach(el => commonMethods.iunWrap(el.$));
            }
            _._SNAPSHOT({
                save: true,
                unlock: true
            });

            let temp_rid = [],
                temp_role = [];
            const sel_g = Selection;
            const sel_Text = sel_g.getSelectedText();

            if (!sel_Text) return console.log('selection is empty');

            const rang = sel_g.getRanges()[0];
            const el = GlobalEditor.document.createElement('div');
            el.append(rang.cloneContents());

            let find = $(el.$).find('a');
            if (!find.length && sel_g.getStartElement()) {
                let cur = sel_g.getStartElement();
                let cur_tag = cur.getName();
                let par = cur.getParent();
                let par_tag = par && par.getName();
                if (/^a/.test(par_tag)) {
                    find = [par];
                } else if (/^a|insert/.test(cur_tag) || /^a|insert/.test(par_tag)) {
                    if (cur_tag === "a" && par_tag === "insert") cur = par;
                    find = $(cur.$).find('a');
                }
            }

            $.each(find, function(x, y) {
                const rid = y.getAttribute('rid');
                const xRole = y.getAttribute('data-role');
                temp_rid.push(rid);
                temp_role.push(xRole);
                if (x === 0) _.M_SCOPE.CiteOrder = {};
                if (_.M_SCOPE.CiteOrder[xRole] === undefined) {
                    _.M_SCOPE.CiteOrder[xRole] = Object.keys(_.M_SCOPE.CiteOrder).length;
                }
            });

            _.M_SCOPE.nCiteAttr = temp_rid.join(' ');

            IMPACT_SELECTION.getInfo(GlobalEditor, {
                lock: false
            });



            // const uniqRole = [...new Set(temp_role)];
            // $this.State_edit_items(uniqRole, _.M_SCOPE.nCiteAttr);
            // _.IBOX.ShowText.value = sel_Text;
            // $(_.IBOX.insertBtn).text('Modify').attr({ ztxt: sel_Text, title: 'Modify' });

            // _.M_FUN.EditMode();

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CheckCursorPosition', err.message);
        }
    },
    State_edit_items: function(uniqRole, ItemsIdsArr, _, $this) {
        _ = CitationNewModule;
        $this = this;
        try {

            ItemsIdsArr = typeof _.M_SCOPE.nCiteAttr === "string" ? _.M_SCOPE.nCiteAttr : "";

            uniqRole = Object.keys(_.M_SCOPE.CiteOrder || {});

            _.M_SCOPE.CiteColl.old = [];

            ItemsIdsArr.split(" ").forEach((Id) => {
                if (!Id) return;
                let entry = _.Panel.querySelector(`[data-entry-id="${Id}"] input[type="checkbox"]`);
                if (entry) {
                    entry.checked = true;
                    _.M_SCOPE.CiteColl.old.push(Id);
                }
            });
            let final_role = uniqRole.length == 1 ? (/bibr/gi.test(uniqRole[0] || "") ? "ref" : (uniqRole[0] || "")) : (uniqRole[0] || "");
            const tabNode = final_role ? _.Panel.querySelector(`[id="${final_role.slice(0, 1)}Divbtn"]`) : null;
            if (tabNode) {
                $this.onChangeTab(tabNode, true);
            }
            let last_check = _.Panel.querySelector('input[type="checkbox"]:checked');
            if (last_check) last_check.scrollIntoView(true);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('State_edit_items', err.message);
        }
    },
    CreateListDOM: function(txtValue, id, rlable, role, clas, type, src, entry) {
        var _ = CitationNewModule;
        try {
            const {
                'data-interest-level': dataInterestLevelAlias
            } = iREF_SCOPE.Reference || {};
            // Shorten caption and reference text
            let shot_txtValue = getWordsCap(txtValue, 'CrossCitation');

            // Get `.label` element and check data-interest-level
            let labelElem = entry.querySelector('.label');
            let interestLevel = "";
            if (dataInterestLevelAlias && labelElem) {
                interestLevel = `data-interest-level="${labelElem.getAttribute('data-interest-level') || ""}"`;
            }

            return `
                ${src ? `<div class="img-xref flex-grow-2 ml-2"><img src="${src}"></div>` : ''}
                <div class="float-group ${rlable.length ? 'pl-3' : 'ref'}"
                     data-text="${txtValue}" 
                     data-div="${type}" 
                     data-role="${role}" 
                     data-xref="${rlable}" 
                     data-rid="${id}">
                    ${rlable.length ? `<span class="${clas}" ${interestLevel}>${rlable}</span>` : ''}
                    <span class="caption">${shot_txtValue}</span>
                </div>
            `;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CreateListDOM', err.message);
        }
    },
    get_label: function(node, _ = CitationNewModule) {
        try {
            var lab = '';
            lab = (node.length != 0) ? (node.hasAttribute('data-label')) ? (node.getAttribute('data-label')) : (node.hasAttribute('data-lable') ? (node.getAttribute('data-lable')) : (node.className == 'label' ? node.textContent : '')) : ('');
            lab = (lab.length != 0) ? ((node.className != 'ref') ? (lab) : ($(node).attr('data-value'))) : ('');
            // ? Remove last character of label
            if (lab.length > 1 && lab[lab.length - 1] === ".") {
                lab = lab.slice(0, -1);
            }
            return lab;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('get_label', err.message);
        }
    },
    /**
     * Helper: Finds the appropriate label node inside an entry
     */
    _findLabelNode(entry, elmClass) {
        if (["ref", "fn"].includes(entry.getAttribute("data-name"))) {
            return entry.querySelector("span.label");
        }
        return entry.querySelector(elmClass === "sec" ? ".title" : ".caption");
    },
    /* 
        * THIS FUNCTION DOING BELOW POINTS COLLECT ALL LIST OF CROSS REFERENCE ELEMENTS BASED ON RID
        ? #1: IT'S COMMON MODULE FOR TOOLTIP AND INSERT REFERENCE MODULE CROSS REFERENCE DETAILS SHOWN (REFERENCE, FIGURE, TABLE).
    */
    CreateCiteList: function(data, showTooltip, _ = CitationNewModule) {
        if (!_.initiated) _.init();
        if (!_.M_SCOPE.Error_idx_List) _.M_SCOPE.Error_idx_List = [];

        let lastItem = null;

        try {
            if (!_.FullyLoaded) _.init();

            const tDOM = _.newElm('div', {
                append: data
            });
            let loop = 0;

            _.M_SCOPE.Tool_Tip_Arr = [];

            const entries = Array.from(tDOM.querySelectorAll(_.M_SCOPE.queryFind));
            for (const [idx, entry] of entries.entries()) {
                lastItem = entry.id;
                const elmClass = entry.dataset.name;

                if (_.M_SCOPE.Error_idx_List.includes(lastItem) || (elmClass === "fn" && entry.closest('.article-meta'))) continue;


                const mapJson = _.M_SCOPE.MAP_JSON[elmClass];
                let fl = elmClass.charAt(0) + "Div";
                if (elmClass.includes("fn")) fl = "fnDiv";

                // Extract values
                let textValue = mapJson.text(entry);
                let id = entry.id;
                let labelNode = this._findLabelNode(entry, elmClass);
                let label = labelNode ? _.M_FUN.get_label(labelNode) : "";

                let data_div = mapJson.div;
                let data_class = mapJson.class;
                let fig_src = null;
                const isRef = elmClass === "ref";

                // Skip invalid cases
                if (DOC_DTD !== "BITS" && label === "" && ((isRef && !_.G_CONFIG.IS_NAME_DATE) || !isRef)) {
                    continue;
                }

                // Tooltip
                _.M_SCOPE.Tool_Tip_Arr.push(getToolTipEntryString(textValue, id, label, entry));

                // Handle element-specific logic
                if (elmClass === "fig") {
                    fig_src = mapJson.figSrc(entry);
                    data_div = mapJson.div(label);
                } else if (elmClass === "ref") {
                    if (label.length > 1) data_class = "xlabel two";
                }

                // Create entry string
                const listDOM = _.M_FUN.CreateListDOM(textValue, id, label, mapJson.role, data_class, data_div, fig_src, entry);

                if (loop === 0) _.M_SCOPE.EntryArrString = {};
                loop++;

                if (!_.M_SCOPE.EntryArrString[fl]) _.M_SCOPE.EntryArrString[fl] = [];

                const entryString = _.GetTemplate("entryString", {
                    alert_msg: false,
                    frag: false,
                    id,
                    data: listDOM
                });

                _.M_SCOPE.EntryArrString[fl].push(entryString);
            }

            if (showTooltip) {
                TOOLTIP_MODULE.append(_.M_SCOPE.Tool_Tip_Arr);
                _.M_SCOPE.Tool_Tip_Arr = [];
                return;
            }

            _.M_FUN.AppendString(_.M_SCOPE.EntryArrString);
            debug.log("-AppendString-");

        } catch (err) {
            if (lastItem) _.M_SCOPE.Error_idx_List.push(lastItem);

            console.warn(err.message);
            ErrorLogTrace("CreateCiteList", err.message);

            if (_.M_SCOPE.ReGen_Loop < 4) {
                setTimeout(() => {
                    CitationNewModule.M_FUN.CreateCiteList(data);
                }, 1500);
                _.M_SCOPE.ReGen_Loop++;
            } else {
                CitationNewModule.M_SCOPE.ReGen_Loop = 0;
            }
        }
    },


    AppendString: function(_Array, _ = CitationNewModule) {
        try {
            var isSame = Object.entries(_Array).toString() == Object.entries(_.M_SCOPE.LastArrString).toString();
            if (!isSame) {
                $('#tDiv, #fDiv, #rDiv, #sDiv, #fnDiv').html('');
                for (var [key, value] of Object.entries(_Array)) {
                    var newArr = [...new Set(value)];
                    var fragment = _.GetFragment(newArr.join(''));
                    if (_.iGetElmById(key))
                        _.iGetElmById(key).append(fragment);
                }
                _.M_SCOPE.LastArrString = _Array;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('AppendString', err.message);
        }
    },
    hoverfn: function(e, _ = CitationNewModule) {
        try {
            var target = e.currentTarget,
                src = $(target).attr('src'),
                IsActive = target.parentElement.parentElement.classList.contains('active'),
                imgName = _.M_SCOPE.ImgIdArr[target.id],
                hImgName = 'assets/images/svg/cite/' + imgName + '_2.svg',
                nImgName = 'assets/images/svg/cite/' + imgName + '.svg';
            $(target).attr('src', (!IsActive) ? ((e.type == 'mouseover') ? (hImgName) : (nImgName)) : (src));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('hoverfn', err.message);
        }
    },
    AddNewMethod: function(Option, EC, _ = CitationNewModule) {
        EC = EDITOR_CURSOR;
        Option = Option ? Option : ({
            ChangeSelect: false,
            ShowLoop: false
        });
        let {
            queryChecked,
            ACTIVE_TAB,
            IsEdit
        } = _.M_SCOPE, {
            addNewBtn
        } = _.IBOX;
        try {
            let checkedLength = _.Panel.querySelectorAll(queryChecked).length,
                IsNew = _.IBOX.insertBtn.getAttribute('ztxt') == null,
                CanDisable = !EC.IS_CITATION_ALLOWED ? true : false,
                ACT_TAB = _.Panel.querySelector('div.cross-Menu.active');
            if ( /* IS_JOURNAL &&  */ !CanDisable) {
                let value = ACT_TAB.getAttribute('data-name'),
                    split = value.split(',');
                if ((split.length > 1 && split[1] == "false") || ([1, 2].includes(ACTIVE_TAB) && EC.IS_CAPTION_PARA)) {
                    CanDisable = true;
                }
            }
            if (CanDisable && Option.ShowLoop) TOASTER_ALERT('CiteWarningAlert', {
                type: 'warning'
            });
            if ((Option.ChangeSelect || Option.ShowLoop) && !CanDisable) {
                CanDisable = (!EC.IS_CITATION_ALLOWED) ? true : false;
            }
            addNewBtn.classList[((CanDisable || IsEdit) ? 'add' : 'remove')]('disabled');
            if ((checkedLength != 0 && IsNew)) {
                // ? enable insert button based on cursor position
                // addNewBtn.classList[EC.IS_PURE_PARA ? 'remove' : 'add']('disabled');
                addNewBtn.classList.add('disabled');
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('AddNewMethod', err.message);
        }
    },
    onChangeTab: function(floatDiv, IsEdit, _ = CitationNewModule) {
        try {
            if (!floatDiv) return;
            var current_div = floatDiv.type == 'click' ? floatDiv.currentTarget : floatDiv;
            if (!current_div || typeof current_div.getAttribute !== "function") return;
            var nView = current_div,
                myFloatPanel = document.getElementById(`${current_div.getAttribute('data-list')}`),
                img = $(nView).find('img'),
                imgId = $(img).attr('id'),
                ImgName = 'assets/images/svg/cite/' + _.M_SCOPE.ImgIdArr[imgId] + '_1.svg';
            if (!$(nView).hasClass('active')) {
                $(nView).addClass('active');
                $(img).attr('src', ImgName);
                var siblingsOptions = $(nView).siblings().removeClass('active').find('img');
                $.each(siblingsOptions, function(ind, elm) {
                    $(elm).attr('src', 'assets/images/svg/cite/' + _.M_SCOPE.ImgIdArr[elm.id] + '.svg');
                });
            }
            // ? Set Active Edit Citation and Tab Disabled rest of the tab
            $(myFloatPanel).removeClass('d-none').siblings().addClass('d-none');
            let child_Arr = $(nView).parent().children();
            let TabActive = Array.from(child_Arr).indexOf(nView);
            if (!IsEdit) IsEdit = _.IBOX.insertBtn.hasAttribute('ztxt') ? true : false;
            if (IsEdit) {
                _.IBOX.bracketOpt.classList.add('disabled');
                $.each(child_Arr, function(index, DIV) {
                    DIV.classList[((TabActive == 0) ? (index == 0 ? ('remove') : ('add')) : (index == 0 ? ('add') : ('remove')))]('disabled');
                });
            } else {
                if (TabActive == 0) {
                    _.IBOX.SecondaryDivOpt.classList[iREF_SCOPE.IS_NAME_DATE ? 'remove' : 'add']('ds-none');
                    _.IBOX.PartLabDivOpt.classList[iREF_SCOPE.IS_NAME_DATE ? 'add' : 'remove']('ds-none');
                } else {
                    _.IBOX.SecondaryDivOpt.classList.remove('ds-none');
                    // ? PART LABEL FOR HIDE LABEL NUMBER EXCEPT ARABIC - 16_JULY_23_YA
                    let partHide = false;
                    if (TabActive == 2 && _.G_CONFIG.Table.caption) {
                        if (_.G_CONFIG.Table.caption.part_label == "false") {
                            partHide = true;
                        }
                    }
                    //  /OHO|OSO|OXMEDO/gi.test(commonMethods.getClientCode({format: "upper"}))
                    if (!IS_JOURNAL) {
                        partHide = true;
                    }
                    _.IBOX.PartLabDivOpt.classList[partHide ? 'add' : 'remove']('ds-none');
                }
                _.M_FUN.AddNewMethod();
            }
            _.M_FUN.GET_SET_ACTIVE();
            _.SET_RANGE_CONFIG();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('onChangeTab', err.message);
        }
    },
    splitCitation: function(txt, tab, _ = CitationNewModule) {
        try {
            var [pattern1, pattern2, pattern3, result] = [(/(\d{4}\w{1,})/), (/(\d{4})/), (/( and |,|\(|\)|\[|\])/), []];
            /* pattern2 = /(\d{4})/,pattern3 = /( and |,|\(|\)|\[|\])/;var result = []; */
            txt.split(';').forEach((item, index) => {
                let split = pattern1.test(item) ? (pattern1) : ((tab == 0) ? pattern2 : pattern3);
                item.split(split).filter(i => i).forEach((j, k) => {
                    if (k == 0 && index != 0) {
                        j = ';' + j;
                    }
                    result.push(j);
                });
                /* if (pattern1.test(item)) {
                    item.split(pattern1).filter(i => i).forEach((j, k) => {
                        if (k == 0 && index != 0) {
                            j = ';' + j;
                        }
                        result.push(j);
                    });
                } else {
                    let split = (tab == 0) ? pattern2 : pattern3;
                    item.split(split).filter(i => i).forEach((j, k) => {
                        if (k == 0 && index != 0) {
                            j = ';' + j;
                        }
                        result.push(j);
                    });
                } */
            });
            return result;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('splitCitation', err.message);
        }
    },
    Key_Press_Handle: function(e, _ = CitationNewModule) {
        try {
            let {
                MOVEMENT_CODES,
                ARROW_MOVEMENT_CODES
            } = window.EDITOR_CONFIG.keyConfig;
            if (![].concat(MOVEMENT_CODES, ARROW_MOVEMENT_CODES).includes(e.which)) {
                console.log('Key_Press_Handle return');
                e.preventDefault();
                return false;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Key_Press_Handle', err.message);
        }
    },

    bracketHandle: function(e, _ = CitationNewModule) {
        try {
            if (!this.classList.contains('disabled')) {
                var bCondition = _.IBOX.bracketOpt.checked,
                    inputValue = _.IBOX.ShowText.value,
                    mySting = _.IBOX.insertBtn.getAttribute('data-stng'),
                    IsRefTab = _.M_SCOPE.ACTIVE_TAB == 0;
                var pattern = (!IsRefTab || !IS_JOURNAL && IsRefTab) ? (['(', ')']) : (iREF_SCOPE.IS_NAME_DATE ? (['(', ')']) : (['[', ']']));
                if (inputValue != '') {
                    let _IsParenAvail = inputValue.includes(pattern[0], pattern[1]);
                    let _nTxt = (bCondition && !_IsParenAvail) ? (pattern[0] + inputValue + pattern[1]) : ((!bCondition && _IsParenAvail) ? (inputValue.substring(1, inputValue.length - 1)) : (''));
                    let newSting = (bCondition && !_IsParenAvail) ? (pattern[0] + mySting + pattern[1]) : ((!bCondition && _IsParenAvail) ? (mySting.substring(1, mySting.length - 1)) : (''));
                    _.IBOX.ShowText.value = _nTxt;
                    _.IBOX.insertBtn.setAttribute('data-stng', newSting);
                }
                //_.IBOX.bracketOpt.setAttribute('title',(`${bCondition?'In Direct':'Direct'}`));
                // _.Text_Cite_Type.textContent=(`${bCondition?'Indirect':'   Direct'}`);
            }
            _.M_SCOPE.remove_selection();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('bracketHandle', err.message);
        }
    },

    CheckInsertNode: function(node, newSting, _ = CitationNewModule) {
        try {
            let [prefix, suffix, nodeParent, Sting] = [node.previousSibling, node.nextSibling, node.parentElement, ""];
            // suffix = node.nextSibling, nodePar = node.parentElement, Sting = "";
            if (newSting != null) {
                newSting = (typeof newSting == "object" && newSting[0] ? newSting[0] : newSting);
            }
            if ((prefix && prefix.nodeType == 3 && prefix.wholeText.length != 0 && suffix == null) || (prefix == null && suffix && prefix.nodeType == 3 && suffix.wholeText.length != 0)) {
                $(nodeParent)[((prefix == null) ? ('before') : ('after'))](node);
                if (newSting != null) Sting += newSting.outerHTML;
            } else if (prefix && (prefix.nodeType == 3 && prefix.length != 0 || prefix.nodeType == 1) && suffix && (suffix.nodeType == 3 && suffix.length != 0 || suffix.nodeType == 1)) {
                if (newSting == null) newSting = node;
                Sting += '</insert>' + newSting.outerHTML + '<insert ';
                $.each(nodeParent.attributes, function() {
                    // ? 04_NOV_22
                    let VALUE = (this.name == "data-time") ? (parseInt(this.value) - 1) : this.value;
                    Sting += this.name + '="' + VALUE + '" ';
                });
                Sting += '>';
            }
            let sIndex = (nodeParent.outerHTML).indexOf(node.outerHTML);
            let eIndex = node.outerHTML.length + sIndex;
            let newOuter = (nodeParent.outerHTML).slice(0, sIndex) + Sting + (nodeParent.outerHTML).slice(eIndex);
            //? 14_NOV_22 - YA -CHR-107 - 
            $(nodeParent).replaceWith(newOuter);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CheckInsertNode', err.message);
        }
    },
    getConfig: function(TabIndex, _ = CitationNewModule) {
        try {
            var key = {
                0: 'Reference',
                1: "Figure",
                2: "Table"
            };
            TabIndex = TabIndex ? TabIndex : _.M_SCOPE.ACTIVE_TAB;
            return _['G_CONFIG'][key[TabIndex]];
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getConfig', err.message);
        }
    },
    replaceCitationSelection: function(insertObj, ACTIVE_TAB) {

        let self = CitationNewModule;
        let mFunScope = self.M_FUN;

        const selection = GlobalEditor.getSelection();
        const range = selection.getRanges()[0];

        // extract old citation
        const extractItems = range.extractContents();
        range.select();

        // get old values
        const oldDelVals = commonMethods.mapWithGetAttr(
            extractItems.$, 'a', 'data-del-val'
        );

        const oldTxtVals = commonMethods.mapWithGetAttr(
            extractItems.$, 'a', 'text'
        );

        const oldValues = oldDelVals.length ? oldDelVals : oldTxtVals;

        const cmdQry = extractItems.$.querySelectorAll(
            `insert>[data-class="ckcommentsfull"]`
        ) || [];

        // bookmark
        const bookmark = selection.createBookmarks(true)[0];
        const {
            startNode: startNodeId,
            endNode: endNodeId
        } = bookmark;
        const startNode = GlobalEditor.document.getById(startNodeId);
        const endNode = GlobalEditor.document.getById(endNodeId);

        const IsAscentInsert = startNode.hasAscendant('insert');
        const isA = startNode.hasAscendant('a');
        const isSup = startNode.hasAscendant('sup');

        const a_anchor = isA ? startNode.getAscendant({
            a: 1
        }, true) : null;
        const sup_anchor = isSup ? startNode.getAscendant({
            sup: 1
        }, true) : null;

        const anchorNode = isA ? a_anchor : sup_anchor ? sup_anchor : startNode;
        const CitationObj = new namedCitation([]);
        let newNode = insertObj[IsAscentInsert ? 'frag' : 'frag_append_insert'];

        const {
            _CP,
            _OP
        } = CitationObj;
        // preserve deleted refs
        if (oldValues.length > 0) {
            try {
                if (ACTIVE_TAB === 0) {
                    newNode = CitationObj.GET_FRAGMENT(newNode, {
                        delVal: oldValues.join(","),
                        hasSupAncestor: IsAscentInsert
                    });
                } else {
                    const ins = mFunScope.findInsertNode(newNode);
                    if (ins) {
                        ins.setAttribute("data-del-val", oldValues.join(","));
                    }
                }
            } catch (e) {
                console.warn("Failed to preserve del-val", e);
            }
        }
        const normalizeSupInsert = (node, openBracket, closeBracket) => {
            const $node = $(node);
            const $supSource = $node.find('sup').first();
            const $sup = $('<sup class="sup" data-name="sup"></sup>');

            $sup.append(openBracket || '');

            if ($supSource.length) {
                $sup.append($supSource.contents());
            } else {
                const $anchors = $node.find('a');
                if ($anchors.length) {
                    $sup.append($anchors);
                } else {
                    $sup.append($node.contents());
                }
            }

            $sup.append(closeBracket || '');

            const insNode = window._trackManager.getInsNode();
            $(insNode).append($sup);
            return insNode;
        };

        // ? For superscript citations, normalize output to <insert><sup>[ ... ]</sup></insert>
        if (isSup && IsAscentInsert) {
            const supInsertNode = normalizeSupInsert(newNode, _OP, _CP);
            const replaceTarget = IsAscentInsert ?
                startNode.getAscendant({
                    insert: 1
                }, true) :
                sup_anchor;

            if (replaceTarget && replaceTarget.$) {
                $(replaceTarget.$).after(supInsertNode, ...cmdQry);
                $(replaceTarget.$).remove();
            } else {
                $(anchorNode.$).after(supInsertNode, ...cmdQry);
            }
        } else if (isSup) {
            if (IS_LOCAL_HOST) debugger;
            var html = '';
            if (newNode) {
                if (newNode.firstElementChild && typeof newNode.firstElementChild.innerHTML !== 'undefined') {
                    html = newNode.firstElementChild.innerHTML;
                } else if (typeof newNode.innerHTML !== 'undefined') {
                    html = newNode.innerHTML;
                }
            }
            var targetSup = null;
            if (startNode && startNode.$) {
                targetSup = $(startNode.$);
            }
            if (!targetSup && sup_anchor && sup_anchor.$) {
                targetSup = $(sup_anchor.$);
            }
            if (!targetSup && startNode && startNode.$) {
                targetSup = $(startNode.$);
            }

            var $el = $(targetSup);
            $el.replaceWith(html);
            var _cmd = cmdQry || [];
            for (var idx = 0; idx < _cmd.length; idx++) {
                $el.append(_cmd[idx]);
            }
        } else {
            // replace DOM
            $(anchorNode.$).after(newNode, ...cmdQry);
        }
        // DEV REMARK (MANITS/JIRA): keep existing <sup> wrapper; remove bookmark markers only.
        // cleanup (remove bookmark markers only)
        $([startNode, endNode]).remove();
    },
    findInsertNode: function(node) {
        if (!node) return null;

        if (node.tagName && node.tagName.toLowerCase() === "insert") return node;

        if (typeof node.querySelector === "function") {
            return node.querySelector("insert");
        }

        return null;
    },

    INSERT_CITE_FIRE: async function(Options = {}, self, mFunScope) {

        self = CitationNewModule;
        mFunScope = CitationNewModule.M_FUN;

        self._SNAPSHOT({
            save: true,
            lock: true
        });

        const {
            ACTIVE_TAB,
            _FINAL,
            IsEdit,
            Edit_Remove
        } = self.M_SCOPE;

        const IMS = IMPACT_SELECTION;
        const insertObj = _FINAL || mFunScope.get_type_set_cite();

        let hasSelection = !!IMS.SEL_TEXT;
        const isNewInsert = !hasSelection || !IsEdit;

        try {


            /* ---------------------------------------------------
             * SCENARIO 1 : NEW INSERT
             * --------------------------------------------------- */

            function handleSpace() {
                IMS.CURSOR_AFTER_BEFORE_CHARACTER();

                let {
                    insert_prefix,
                    insert_suffix
                } = IMS.RG_INFO;

                // no space for superscript pattern
                if (
                    ACTIVE_TAB === 0 &&
                    iREF_SCOPE.Reference['text-format'] === "sup"
                ) {
                    insert_prefix = "";
                    insert_suffix = "";
                }

                return {
                    insert_prefix,
                    insert_suffix
                };
            }

            if (isNewInsert) {

                if (!hasSelection) {
                    // 1.1 → Cursor only (no selection)
                    const {
                        insert_prefix,
                        insert_suffix
                    } = handleSpace();
                    GlobalEditor.insertHtml(
                        insert_prefix + insertObj.string + insert_suffix
                    );

                } else {

                    // 1.2 → Selection exists but NOT edit mode
                    commonMethods.absorbWhitespace(GlobalEditor);

                    if (!hasSelection) {

                        const {
                            insert_prefix,
                            insert_suffix
                        } = handleSpace();

                        GlobalEditor.insertHtml(
                            insert_prefix + insertObj.string + insert_suffix
                        );

                        return;
                    }
                    GlobalEditor.insertHtml(insertObj.string);
                }

            }

            /* ---------------------------------------------------
             * SCENARIO 2 : EDIT EXISTING CITATION
             * --------------------------------------------------- */
            else {

                const canInsert = (Edit_Remove && Edit_Remove.length > 0) ? await IMPACT_ALERT('xrefsdel003', {
                    replace: Edit_Remove.join(",")
                }) : true;

                if (!canInsert) {
                    debug.log("Citation edit cancelled by user");
                    return;
                }

                mFunScope.replaceCitationSelection(insertObj, ACTIVE_TAB);
            }

            /* ---------------------------------------------------
             * JOURNAL ORDER CHECK
             * --------------------------------------------------- */
            if (IS_JOURNAL && ACTIVE_TAB === 0 && !iREF_SCOPE.IS_NAME_DATE) {

                CHECK_ORDER.FIRE_ONCE(GlobalEditor, {
                    reNumber: true,
                    ins_cite: true,
                    alert: true
                });

            }

        } catch (err) {
            console.warn(err);
            ErrorLogTrace('INSERT_CITE_FIRE', err.message);
        } finally {

            self._SNAPSHOT({
                unlock: true,
                save: true
            });

            self.M_SCOPE.CiteColl = {};
            self.M_SCOPE.CiteOrder = {};

            self.closeDialog();
            self.M_FUN.Alert();
        }
    },

    get_selection_rid: function(text, _ = CitationNewModule) {
        try {
            let [rang, el, RID] = [GlobalEditor.getSelection().getRanges()[0], GlobalEditor.document.createElement('div'), []];
            el.append(rang.cloneContents());
            $.each($(el.$).find('a'), function(x, y) {
                // let rid = y.getAttribute('rid');rid = y.hasAttribute('zrid') ? y.getAttribute('zrid') : rid
                RID.push(y.getAttribute(y.hasAttribute('zrid') ? 'zrid' : 'rid'));
            });
            return RID.join(' ');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('get_selection_rid', err.message);
        }
    },
    get_type_set_cite: function(insType, Options = {}, self, mFunScope) {
        self = CitationNewModule;
        mFunScope = self.M_FUN;
        try {
            let {
                addNewBtn,
                insertBtn,
                ShowText,
                bracketOpt,
            } = self.IBOX,
                objTemp = {
                    'indircite': 'indirect',
                    'dircite': 'direct'
                };
            const {
                SEL_TEXT,
                ISstartOfBlock
            } = IMPACT_SELECTION;

            const {
                CUR_INSTANCE,
                IsEdit
            } = self.M_SCOPE;

            let bCondition = bracketOpt.checked,
                IsNameDate = iREF_SCOPE.IS_NAME_DATE,
                IsNew = insertBtn.getAttribute('ztxt') == null,
                TabeOne = mFunScope.GET_SET_ACTIVE() == 0,
                IsNameDateTabOne = TabeOne && iREF_SCOPE.IS_NAME_DATE;

            if (IsNew && !IsNameDate && TabeOne) bCondition = true;
            if (!insType) insType = (bCondition) ? ('indirect') : ('direct');
            if (IsEdit) {
                if (IsNameDateTabOne && (SEL_TEXT.indexOf("(") == -1 || SEL_TEXT.indexOf(")") == -1)) {
                    insType = "indircite";
                }
                if (!IsNameDateTabOne) insType = "indircite";

                if (ISstartOfBlock || !TabeOne) {
                    insType = "dircite";
                }
            }

            if (objTemp[insType]) insType = objTemp[insType];

            var instance = CUR_INSTANCE;

            if (CUR_INSTANCE && CUR_INSTANCE.FINAL_OUT && CUR_INSTANCE.FINAL_OUT[0]) {
                instance = CUR_INSTANCE.FINAL_OUT[0];
            }

            if (!instance) return;

            // ? Show Text/String on Dialog Update
            ShowText.value = instance[insType]['text'];
            self.M_SCOPE._FINAL = instance[insType];
            return instance[insType];
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('get_insert_type', err.message);
        }
    },
    onChangeFireNew: function(e, self, $this) {
        console.log('Citation onChangeFireNew triggered');
        self = CitationNewModule;
        $this = self.M_FUN;

        try {
            const {
                addNewBtn,
                insertBtn,
                ShowText,
                bracketOpt
            } = self.IBOX;

            const checkedList = self.Panel.querySelectorAll(self.M_SCOPE.queryChecked);

            if (checkedList.length === 0) {
                ShowText.value = '';
                $(self.Panel).find('.row_entry').removeClass('checked');
                self.M_SCOPE.CiteColl.new = {};

                if (!self.M_SCOPE.CiteColl.old) {
                    self.M_SCOPE.CiteOrder = {};
                }

                $this.SET_ACT_TAB();
                $this.AddNewMethod();
                $(insertBtn).addClass('disabled').removeAttr('data-stng');
                return;
            }

            if (e && e.currentTarget && e.currentTarget.checked === false) {
                $(e.currentTarget).closest(".row_entry").removeClass("checked");
            }

            addNewBtn.classList.add('disabled');

            let INSTANCE;

            if (self.M_SCOPE.ACTIVE_TAB === 0) {
                // Name-Year citation type
                const _Ids = Array.from(checkedList)
                    .map(el => {
                        const row = el.closest('.row_entry');
                        return row ? row.getAttribute('data-entry-id') : null;
                    })
                    .filter(Boolean);

                INSTANCE = self.M_SCOPE.CUR_INSTANCE = new namedCitation(_Ids, {
                    edit: self.M_SCOPE.IsEdit,
                    ids: self.M_SCOPE.CiteColl.old
                });
                self.M_SCOPE.Edit_Remove = self.M_SCOPE.CUR_INSTANCE.Edit_Remove || [];
                INSTANCE = INSTANCE && INSTANCE.FINAL_OUT[0];

            } else {
                // Float citation type
                const result = {};

                Array.from(checkedList).forEach(el => {
                    const $entry = $(el).closest('.row_entry');
                    const rid = $entry.data('entry-id');
                    const floatGroup = $entry.find('.float-group');
                    const label = floatGroup.find('.xlabel').text().trim();
                    const role = floatGroup.data('role');
                    const partLabelVal = $entry.find('.part_label').val().trim();

                    $entry.addClass("checked");

                    if (IS_JOURNAL && role.match(/Example|Map|Image|Picture|Video|Audio/gi)) role = "Figure";
                    else if (!IS_JOURNAL) {
                        const text = label.toLowerCase().replace(/\s+/g, "_");
                        // Split at the last underscore
                        const parts = text.split(/_(?=[^_]*$)/);
                        const last = parts[0];
                        debug.log("books", parts);
                        if (CitationConfig['books'][last]) {
                            role = last;
                            // ? video clip purpose
                        }
                    }

                    result[rid] = {
                        rid: rid,
                        type: role,
                        order: 0,
                        label: label,
                        partlabels: partLabelVal
                    };
                });

                INSTANCE = self.M_SCOPE.CUR_INSTANCE = window.citeFloats.getCitation(result, {
                    edit: self.M_SCOPE.IsEdit,
                    ids: self.M_SCOPE.CiteColl.old
                });
                self.M_SCOPE.Edit_Remove = INSTANCE.Edit_Remove || [];
                if (self.M_SCOPE.IsEdit) {}
            }

            $this.get_type_set_cite();

            if (EDITOR_CURSOR.IS_CITATION_ALLOWED) {
                insertBtn.classList.remove('disabled');
            }

            $this.SET_ACT_TAB();

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('onChangeFire', err.message);
        }

    },
    onChangeType: function(e, _ = CitationNewModule) {
        console.log('Citation onChangeType triggered');
        try {
            var $this = _.M_FUN;
            if (e) {
                let _id = e.currentTarget.getAttribute('id');
                if (['withoutbracket', 'withbracket'].includes(_id)) {
                    e.currentTarget.checked = true;
                    _.IBOX[_id == "withoutbracket" ? 'bracketOpt' : 'bracketOutOpt'].checked = false;
                }
                $this.get_type_set_cite();
            }
        } catch (err) {
            console.warn('error on onChangeType ==> ' + err.message);
            ErrorLogTrace('onChangeType', err.message);
        }
    },
    isMissingId: function(oldList, newList, _ = CitationNewModule) {
        try {
            var Available = [];
            // ? validate against original selection with new selection
            _.M_SCOPE.CiteOrder.Missing = [];
            $.each(oldList, function(indexInArray, Key) {
                for (var m in newList) {
                    if (!(keyExistsOn(newList[m], Key))) {
                        if (!Available.includes(Key)) {
                            var selectors = commonMethods.xrefSelectorBuilder(Key);
                            if (GlobalEditor.document.find(selectors).$.length == 1) {
                                _.M_SCOPE.CiteOrder.Missing.push(Key);
                            }
                        }
                    } else Available.push(Key);
                }
            });
            //return (Missing.length>0)?(Missing.toLocaleString().getCiteXrefLabel().replace(/,(?=[^,]*$)/, ' and ')):('');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('isMissingId', err.message);
        }
    },
    insertNewItem: function(e, _ = CitationNewModule) {
        try {
            const {
                queryChecked,
                ACTIVE_TAB
            } = _.M_SCOPE;
            if (_.Panel.querySelectorAll(queryChecked).length) {
                _.IBOX.addNewBtn.classList.add('disabled');
                return false;
            }
            if (commonMethods.IsVisibleElm(_.Panel)) {
                // var Tab=_.getActiveTab();
                _.Panel.classList.add('ds-none');
                //  ? Open New Float Window
                if (ACTIVE_TAB == 0) {
                    const refStyle = (typeof SHARED_KEY !== 'undefined' && SHARED_KEY && SHARED_KEY.refstyle) || '';
                    const IsCMS18 = ['CMS18', 'CMS 18'].includes(refStyle);
                    GlobalEditor.execCommand(IsCMS18 ? "REFERENCE_FORM_OPEN" : "MULTI_REF_FORM_OPEN");
                } else {
                    // NewFloatModule.show(_.M_SCOPE.ACTIVE_TAB == 1 ? ('figure') : ('table'));
                    GlobalEditor.execCommand(ACTIVE_TAB == 1 ? "ADD_FIG" : "ADD_TAB");
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('insertNewItem', err.message);
        }
    },
    Search_Handle: function(e, Options = {}, _ = CitationNewModule) {
        try {
            var filter, li, a, i, txtValue;
            filter = _.IBOX.SearchOpt.value.toUpperCase();
            li = _.IBOX.FloatShowDiv.querySelectorAll(".row_entry");
            let IsEmpty = filter.length == 0;
            for (i = 0; i < li.length; i++) {
                a = li[i].querySelector(".float-group");
                txtValue = a.dataset.text || a.innerText.trim() || a.textContent.trim();
                let IsAvilable = txtValue.toUpperCase().indexOf(filter) > -1;
                li[i].style.display = (IsEmpty ? "" : (IsAvilable ? "" : "none"));
                /* if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    li[i].style.display = "";
                } else {
                    li[i].style.display = "none";
                } */
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Search_Handle', err.message);
        }
    },
    restoreDefaults: function(_ = CitationNewModule) {
        try {

            $("#CrossCitationModule .dia_header_text").text('Insert Cross Citation');
            $(_.IBOX.insertBtn).addClass('disabled').text('Insert').removeAttr('ztxt').removeAttr('data-stng').attr('title', 'Insert');
            _.M_SCOPE.ALL_TABS = _.Panel.querySelectorAll('div.cross-Menu');
            Array.from(_.M_SCOPE.ALL_TABS).forEach((el, ind, Arr) => {
                if (!el) return console.log([Arr, ind]);
                el.classList.remove('disabled');
            });
            _.M_FUN.GET_SET_ACTIVE();
            _.M_SCOPE.CiteColl = _.M_SCOPE.CiteOrder = {};
            _.M_SCOPE.IsInsert = _.M_SCOPE.IsDelete = _.M_SCOPE.IsReNumber = _.M_SCOPE.IsEdit = false;
            //? for add part label
            if (_.IBOX.FloatShowDiv) _.IBOX.FloatShowDiv.removeAttribute('show-part-label');
            // _.IBOX.SecondaryDivOpt.classList[_.M_SCOPE.ACTIVE_TAB == 0 ? 'add' : 'remove']('ds-none');
            if (_.M_SCOPE.ACTIVE_TAB == 0) {
                _.IBOX.SecondaryDivOpt.classList[iREF_SCOPE.IS_NAME_DATE ? 'remove' : 'add']('ds-none');
                _.IBOX.PartLabDivOpt.classList[iREF_SCOPE.IS_NAME_DATE ? 'add' : 'remove']('ds-none');
            } else {
                _.IBOX.SecondaryDivOpt.classList.remove('ds-none');
                // ? PART LABLE FOR HIDE LABLE NUMBER EXCEPET ARABIC
                let partHide = false,
                    {
                        caption
                    } = _.G_CONFIG.Table;
                if (_.M_SCOPE.ACTIVE_TAB == 2 && caption) {
                    if ((!caption.part_label) || (caption.part_label && caption.part_label == "false")) {
                        partHide = true;
                    }
                }
                _.IBOX.PartLabDivOpt.classList[partHide ? 'add' : 'remove']('ds-none');
            }
            _.Panel.querySelectorAll('.part_label, input').forEach((el) => {
                if (el.tagName == 'INPUT') {
                    if (el.type == 'checkbox') {
                        el.checked = false;
                        el.classList.remove('disabled');
                    } else el.value = '';
                } else el.value = '';
            });
            // ? reset once again - 23_FEB_23-YA
            $(_.Panel).find('.row_entry').removeAttr("style");
            _.M_SCOPE.Tool_Tip_Arr = [];
            _.M_SCOPE.CUR_INSTANCE = null;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('restoreDefaults', err.message);
        }
    },
    PartLabelOptHandle: function(e, _ = CitationNewModule) {
        try {
            _.M_SCOPE.Is_Part_Label_Check = e.currentTarget.checked;
            _.IBOX.FloatShowDiv[_.M_SCOPE.Is_Part_Label_Check ? 'setAttribute' : 'removeAttribute']('show-part-label', 's');
            // ? OUP_J_ CCI_097 - AFTER UPDATE PART-LABLES - UN_TICK PART-LABLE OTPIONS
            if (!e.currentTarget.checked) {
                _.Panel.querySelectorAll('.part_label').forEach((el) => {
                    el.value = '';
                });
            }
            CitationNewModule['M_FUN'].onChangeFireNew();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('PartLabelOptHandle', err.message);
        }
    },
    OnChange_PartLabel: Debounce_Event(function(e, _ = CitationNewModule) {
        try {
            const target = e.target;
            const value = target.value;
            const insertedChar = e.data;
            const default_limit = 30;

            console.log('part_label');

            // If character inserted (i.e., not a delete/backspace/etc.)
            if (insertedChar && typeof insertedChar === 'string') {
                // Block non A-Z characters
                if (!/^[a-zA-Z]$/.test(insertedChar)) {
                    TOASTER_ALERT('Part_Label_pattern_not_match', {
                        type: 'warning'
                    });
                    target.value = value.replace(insertedChar, "");
                    return;
                }

                // Enforce max length
                if (value.length > default_limit) {
                    TOASTER_ALERT('Part_Label_reach_overlimit', {
                        type: 'warning'
                    });
                    target.value = value.slice(0, default_limit);
                    return;
                }
            }

            // Allow formatting even if no `e.data` (e.g., paste, cut)
            if (value.length > default_limit) {
                target.value = value.slice(0, default_limit);
                TOASTER_ALERT('Part_Label_reach_overlimit', {
                    type: 'warning'
                });
            }

            // Remove digits and trim
            if (value.match(/\d+/)) {
                TOASTER_ALERT('Part_Label_pattern_not_match', {
                    type: 'warning'
                });
                target.value = value.split(/\d/g).join("").trim();
            }

            // Normalize and transform
            setTimeout((target, _) => {
                try {
                    const checked = _.IBOX.bracketOpt.checked;
                    const config = _.G_CONFIG.Figure[checked ? 'indircite' : 'dircite'];

                    const filter_txt = target.value
                        .replace(/\bthrough\b/gi, '–')
                        .replace(/and|\s+/g, '')
                        .replace(/\B(?=(.{1})+(?!.))/g, ',')
                        .split(/and|\s|,/)
                        // unique
                        .filter((c, idx, arr) => arr.indexOf(c) === idx)
                        .map(c => {
                            if (config.part_lab_case && config.part_lab_case.match(/upper|lower/)) {
                                return c[config.part_lab_case.match(/upper/) ? 'toLocaleUpperCase' : 'toLocaleLowerCase']();
                            }
                            return c;
                        })
                        .filter(Boolean);

                    const resultVal = rangeExtraction_Alphabets(filter_txt, config);
                    debug.log(`rangeExtraction_Alphabets => ${resultVal}`);
                    target.value = resultVal;

                    CitationNewModule.M_FUN.onChangeFireNew();


                } catch (innerErr) {
                    console.warn(innerErr.message);
                    ErrorLogTrace('setTimeout in OnKeyPress_PartLabel', innerErr.message);
                }
            }, 1000, target, _);

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('OnKeyPress_PartLabel', err.message);
        }
    }, 500),
    EventLoop: function(from, _ = CitationNewModule) {
        try {
            const DEBOUNCE_EVENTS = {
                OnKeyPress_PartLabel: 300,
                Search_Handle: 300,
                OnChange_PartLabel: 300,
                Key_Press_Handle: 150
            };
            for (const [findKey, ValueObj] of Object.entries(_.M_SCOPE.EVENT_HANDLERS[from])) {
                _.Panel.querySelectorAll(findKey).forEach(elm => {
                    for (const [event, ifunction] of Object.entries(ValueObj)) {
                        if (!ifunction) continue;

                        let handlerFunc = null;

                        if (typeof _[ifunction] === "function") {
                            handlerFunc = _[ifunction];
                        } else if (typeof _.M_FUN[ifunction] === "function") {
                            handlerFunc = _.M_FUN[ifunction];
                        }

                        if (handlerFunc) {
                            // Check if debounce is needed
                            const debounceDelay = DEBOUNCE_EVENTS[ifunction];
                            elm[event] = /* debounceDelay ? Debounce_Event(handlerFunc, debounceDelay) : */ handlerFunc;
                        }
                    }
                });
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CitationNewModule.EventLoop', err.message);
        }
    },
    CheckRefIsLast: function(Arr, _ = CitationNewModule) {
        try {
            var refDiv = GlobalEditor.document.findOne('div.ref-list').$,
                ref_list = refDiv.querySelectorAll('.ref:not([data-remove])'),
                Index = [];
            Array.from(Arr).forEach((rid) => {
                let ref = refDiv.querySelector('[id="' + rid + '"]');
                Index.push(Array.prototype.indexOf.call(ref_list, ref) + 1);
            });
            var differenceAry = Index.slice(1).map(function(n, i) {
                return n - Index[i];
            });
            var IsConsecutive = differenceAry.every(value => value == 1);
            if (Index.length == 1 && Index[0] == ref_list.length || IsConsecutive && Index[Index.length - 1] == ref_list.length) return true;
            else return false;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CheckRefIsLast', err.message);
        }
    },
    Delete_Cite_Init: function(force = false, _ = CitationNewModule) {
        try {
            console.log('Initial delete citation');


            var splitRids = _.M_SCOPE.nCiteAttr.split(' ');



            let IsNameDate = iREF_SCOPE.IS_NAME_DATE,
                del_ids_string = "",
                can_Delete = !1,
                IsRef = !1,
                single_id_Arr = [],
                temp_rid_Arr = [];

            $(splitRids).each(function(i, val) {
                // ? validate the xref availablity
                if (val == null || val == undefined || val == '') return;
                var selectors = commonMethods.xrefSelectorBuilder(val);
                var Arr = GlobalEditor.document.find(selectors).$;
                if (Arr.length == 1) {
                    // ? validate the xref availablity 
                    IsRef = Arr[0].getAttribute("ref-type") == "bibr" ? true : false;
                    single_id_Arr.push((IsRef) ? val.PARSE_ID_2_INT() : val);
                }
                // ? for get only rid number
                temp_rid_Arr.push(val);
            });
            single_id_Arr = [...single_id_Arr];
            temp_rid_Arr = [...temp_rid_Arr];
            can_Delete = single_id_Arr.length === 0;
            if (!can_Delete) {
                if (IsRef) {
                    if (iREF_SCOPE.IS_NAME_DATE) {
                        let NameEntry = _getBibCitation(temp_rid_Arr),
                            tempNode = document.createElement('span');
                        tempNode.innerHTML = NameEntry.join(', ');
                        del_ids_string = tempNode.textContent;
                    } else {
                        del_ids_string = temp_rid_Arr.map(function(rid) {
                            // ? remove leading zero
                            return rid.PARSE_ID_2_INT();
                        }).join(',');
                    }
                    if (del_ids_string) {
                        var IsLastRef = IsRef ? _.M_FUN.CheckRefIsLast(temp_rid_Arr) : null;

                        can_Delete = IMPACT_ALERT('xrefsdel003', {
                            replace: del_ids_string,
                            s_text: (IsLastRef || IsNameDate) ? 'text' : 're_num'
                        });

                        can_Delete.then(value => {
                            if (value) {
                                // ? IS_JOURNAL ? single_id_Arr :
                                DEL_REF_FIRE(temp_rid_Arr, {
                                    FROM_CITE: true
                                });
                                // IS_JOURNAL ? single_id_Arr :
                                _.M_FUN.Delete_Selection_Range_NEW(temp_rid_Arr, {
                                    FROM_DEL_CITE: true,
                                    CAN_DEL_REF: false,
                                    IS_FLOAT: !IsRef,
                                    IS_REF: IsRef
                                });
                            }
                        });
                    }
                } else {
                    /* ! SINGLE FLOAT CITE */
                    return AlertNewDialog.fire('warning', "Warning", 'SINGLE_FLOAT_CITE', 'OK', '', true, {
                        override: false
                    });
                }
            }
            if ((typeof can_Delete) == 'boolean' && can_Delete) {
                let params = {
                    FROM_DEL_CITE: true,
                    CAN_DEL_REF: false,
                    IS_FLOAT: !IsRef,
                    IS_REF: IsRef
                };
                // ? 21_DEC_22 - YA - HANDLED COMMMON ALERT FUNCTION
                _.M_FUN.Delete_Selection_Range_NEW([], params);
            }

            console.groupEnd();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Delete_Cite_Init', err.message);
            console.groupEnd();
        }
    },
    Delete_Selection_Range_NEW: function(Arr, Options, self, IMS, mFunScope) {
        self = CitationNewModule;
        IMS = IMPACT_SELECTION;
        mFunScope = CitationNewModule.M_FUN;
        let {
            FROM_DEL_CITE,
            DEL_ID,
            FROM_REF_DEL,
            IS_REF,
            IS_FLOAT,
            CAN_DEL_REF,
            COLLECTION
        } = (Options = Options ? Options : {
            FROM_DEL_CITE: false,
            CAN_DEL_REF: false,
            IS_FLOAT: false,
            IS_REF: false,
            DEL_ID: null
        });
        try {
            console.log('new range delete citation');
            [self.M_SCOPE.IsDelete, AutoSaveBool] = [true, false];

            var {
                sameParent,
                commonParent,
                isOnlyAnchorInParent,
                anchorElements

            } = this.rangedCitation(IMS.RG_INFO.RANGE);

            var CUR_NODE_COLL = FROM_REF_DEL ? COLLECTION : anchorElements;

            self.M_SCOPE.DEL_ELM_OBJ = {
                NODE: IMS.NODE,
                PARENT: IMS.NODE.getParent()
            };
            var delDirectly = isOnlyAnchorInParent && commonParent && iREF_SCOPE.Reference['text-format'] == "sup";
            var IsRanged = anchorElements.length > 1;
            var delAttr = window._trackManager.getDelNode(null, {
                returnAttrOnly: true
            });
            Array.from(CUR_NODE_COLL).forEach((el, idx, arr) => {
                if (delDirectly || IsRanged) {
                    this.retainOriginal(el.$);
                    if (arr.length == idx + 1) {
                        if (IsRanged) {
                            const selection = GlobalEditor.getSelection();
                            const range = selection.getRanges()[0];
                            if (range && !range.collapsed) {
                                // Extract the selected content
                                const frag = range.extractContents();
                                // Create <del> DOM wrapper (custom logic)
                                const delDom = new CKEDITOR.dom.element('del');
                                delDom.setAttributes(delAttr);
                                delDom.append(frag);
                                // Insert <del> at the same position
                                range.insertNode(delDom);

                                // Move cursor after the inserted <del> (optional)
                                range.moveToPosition(delDom, CKEDITOR.POSITION_AFTER_END);
                                selection.selectRanges([range]);
                            }
                        } else {
                            window._trackManager.getDelNode(commonParent.$, {
                                nodeOnly: true
                            });
                        }
                    }
                } else {
                    this.EACH_CITE_ENTRY((el.$ ? el.$ : el), idx, arr, Options);
                }
            });

            // ! AFTER DELETE CITATION
            if (IS_REF) {
                if (self.G_CONFIG.IS_NAME_DATE && self.M_SCOPE.RE_ORDER_BY_REF_IDX) {
                    // TODO - STILL NOT ENABLED
                    // mFunScope.CHANGE_XREF_ID_BY_REF_INDEX(TEMP_DOM);
                } else if (!self.G_CONFIG.IS_NAME_DATE) {
                    CHECK_ORDER.FIRE_ONCE(GlobalEditor, {
                        reNumber: !0,
                        ins_cite: !0,
                        alert: !0
                    });
                }
                if (FROM_REF_DEL) {
                    return;
                }
            } else if (IS_FLOAT) {
                debug.log("citations-float");
                // TODO: 
            }
            _IsDirty = false;
            self._SNAPSHOT({
                save: true,
                lock: true
            });
            // CitationNewModule.TEST_LOOP("02");
            self.M_SCOPE.CiteModBool = false;
            AutoSaveBool = true;
            mFunScope.Alert();
            return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Delete_Selection_Range', err.message);
            return false;
        }
    },
    rangedCitation(range, self, IMS, mFunScope) {
        self = CitationNewModule;
        IMS = IMPACT_SELECTION;
        mFunScope = CitationNewModule.M_FUN;
        try {
            var anchorElements = [];

            if (range) {
                var walker = new CKEDITOR.dom.walker(range);
                walker.evaluator = function(node) {
                    return node.type === CKEDITOR.NODE_ELEMENT && node.getName() === 'a';
                };

                var node;
                while ((node = walker.next())) {
                    anchorElements.push(node);
                }
            }

            var sameParent = false;
            var isOnlyAnchorInParent = false;
            var commonParent = null;

            if (anchorElements.length > 0) {
                commonParent = anchorElements[0].getParent();
                sameParent = anchorElements.every(function(el) {
                    const parent = el && typeof el.getParent === "function" ? el.getParent() : null;
                    return parent && typeof parent.equals === "function" ? parent.equals(commonParent) : false;
                });

                if (sameParent) {
                    var allChildren = commonParent.getChildren();
                    var anchorCount = 0;
                    var allAreAnchors = true;

                    for (var i = 0; i < allChildren.count(); i++) {
                        var child = allChildren.getItem(i);

                        // Only evaluate ELEMENT nodes
                        if (child.type === CKEDITOR.NODE_ELEMENT) {
                            if (child.getName() === 'a') {
                                anchorCount++;
                            } else {
                                // Found non-<a> element
                                allAreAnchors = false;
                                break;
                            }
                        }
                        // Ignore TEXT nodes, comments, etc.
                    }
                    if (allAreAnchors && anchorCount === anchorElements.length) {
                        isOnlyAnchorInParent = true;
                    }
                }
            }

            return {
                sameParent,
                commonParent,
                isOnlyAnchorInParent,
                anchorElements
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('rangedCitation', err.message);
        }
    },
    retainOriginal(el, Obj_set_remove = {
        set: {
            "data-remove": "s"
        },
        remove: ["href", "data-cke-saved-href"]
    }) {
        try {
            let firstEl = el.firstElementChild && el.firstElementChild.getAttribute('data-del-val');
            let temp_id = firstEl || el.getAttribute('data-del-val');
            const rid = el.getAttribute("rid");
            let txt;
            if (temp_id) {
                if (Is_Float_Node(el) && firstEl) {
                    // For float node: use first word + temp_id
                    let split = el.textContent.trim().split(" ");
                    txt = split[0] + " " + temp_id;
                    el.innerHTML = txt;
                } else {
                    // Regular case: just replace with temp_id
                    txt = temp_id;
                    el.innerHTML = txt;
                }

                let zrid = el.getAttribute("zrid");
                if (zrid) {
                    Obj_set_remove.set.rid = zrid;
                    Obj_set_remove.remove.push("zrid");
                }

                if (txt === el.getAttribute("ztxt")) {
                    Obj_set_remove.remove.push("ztxt");
                }
            } else {

                if (rid) Obj_set_remove.set['zrid'] = rid;

                Obj_set_remove.remove.push['rid'];
            }

            commonMethods.SET_REMOVE_ATTR(el, Obj_set_remove.set, Obj_set_remove.remove);

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('retainOriginal', err.message);
        }
    },
    EACH_CITE_ENTRY: function(el, idx, arr, Options = {}, self, IMS, mFunScope) {
        self = CitationNewModule;
        IMS = IMPACT_SELECTION;
        mFunScope = CitationNewModule.M_FUN;
        let {
            FROM_DEL_CITE,
            FROM_REF_DEL,
            IS_REF,
            IS_FLOAT,
            CAN_DEL_REF,
            COLLECTION,
            DEL_ID
        } = (Options = Options ? Options : {
            FROM_DEL_CITE: false,
            CAN_DEL_REF: false,
            IS_FLOAT: false,
            IS_REF: false,
            DEL_ID: null
        });
        try {
            debug.log(idx);
            let INSERT_DOM = (el.tagName == 'INSERT' ? el : (el.closest('insert') ? el.closest('insert') : (el.querySelector('insert')))),
                range = document.createRange(),
                TEMP_OBJ = {
                    DEL_DOM: window._trackManager.getDelNode(),
                    IsNewCite: false,
                    DEL_DOM_TIME: null
                };
            // Walks up from a node until it finds a valid element that can receive
            // child insertions (not Document, not DOCTYPE, not html/head — targets body
            // or the nearest block ancestor). Returns null if no safe anchor exists.
            const normalizeRangeAnchor = function(rangeObj) {
                const SAFE_PARENTS = ['BODY', 'DIV', 'P', 'SPAN', 'TD', 'LI', 'SECTION', 'ARTICLE', 'BLOCKQUOTE'];
                let node = rangeObj.startContainer;

                // Text nodes: start from their parent element
                if (node.nodeType === Node.TEXT_NODE) {
                    node = node.parentElement;
                }

                // Walk up until we find an element that can safely hold child nodes
                while (node) {
                    if (node.nodeType === Node.ELEMENT_NODE &&
                        node !== document.documentElement &&
                        node !== document.head) {
                        // Prefer a named safe parent, but accept any element above <html>
                        if (SAFE_PARENTS.includes(node.tagName) || node === document.body) {
                            return node;
                        }
                        // If no named ancestor found yet, keep climbing but remember this node
                        node = node.parentElement;
                        continue;
                    }
                    break;
                }

                // Last resort: body itself
                return document.body || null;
            };

            const safeWrapRange = function(rangeObj, wrapperNode, insertBeforeNode) {
                const isValidInsertTarget = function(node) {
                    return node && node.nodeType === Node.ELEMENT_NODE;
                };
                const isDocumentAnchored = function(r) {
                    return r.commonAncestorContainer.nodeType === Node.DOCUMENT_NODE ||
                        r.startContainer.nodeType === Node.DOCUMENT_NODE;
                };

                // Clamp a document-anchored range to the first child of <body> so
                // all subsequent paths operate on a valid element anchor.
                if (isDocumentAnchored(rangeObj)) {
                    const anchor = normalizeRangeAnchor(rangeObj);
                    if (!anchor) return false;
                    rangeObj.setStart(anchor, 0);
                    rangeObj.collapse(true);
                }

                try {
                    if (insertBeforeNode && isValidInsertTarget(insertBeforeNode.parentNode)) {
                        insertBeforeNode.parentNode.insertBefore(wrapperNode, insertBeforeNode);
                        wrapperNode.append(rangeObj.extractContents());
                        return true;
                    }

                    rangeObj.surroundContents(wrapperNode);
                    return true;
                } catch (wrapErr) {
                    try {
                        if (isDocumentAnchored(rangeObj)) {
                            return false;
                        }
                        const contents = rangeObj.extractContents();
                        wrapperNode.append(contents);
                        const insertTarget = rangeObj.startContainer.nodeType === Node.ELEMENT_NODE ?
                            rangeObj.startContainer :
                            rangeObj.startContainer.parentElement;
                        if (!isValidInsertTarget(insertTarget)) {
                            return false;
                        }
                        rangeObj.insertNode(wrapperNode);
                        return true;
                    } catch (fallbackErr) {
                        console.warn(fallbackErr.message);
                        ErrorLogTrace('safeWrapRange', fallbackErr.message);
                        return false;
                    }
                }
            };

            TEMP_OBJ.DEL_DOM_TIME = TEMP_OBJ.DEL_DOM.dataset.time;

            if (INSERT_DOM && INSERT_DOM.querySelector(`[data-class="ckcommentsfull"]`)) {
                INSERT_DOM = null;
            }

            el = el.querySelector("a") ? el.querySelector("a") : (el.closest("a") ? el.closest("a") : el);

            let EL_TAG = el.tagName,
                EL_PARENT = el.parentElement,
                EL_G_PARENT = (el.parentElement ? el.parentElement.parentElement : null),
                EL_PAR_TAG = EL_PARENT ? EL_PARENT.tagName : "",
                DOM_TEMP = null,
                IS_EDIT = INSERT_DOM ? (INSERT_DOM.hasAttribute('data-del-val') || el.hasAttribute('data-del-val') || el.querySelector('insert')) : false,
                rid = el.getAttribute("rid"),
                txt = el.textContent,
                nBool = false,
                pBool = false,
                split = rid.split(' '),
                Obj_set_remove = {
                    set: {
                        "data-remove": "s"
                    },
                    remove: ["href", "data-cke-saved-href"]
                };
            if (el.childElementCount > 0) {
                /*
                let temp_id = el.firstElementChild.getAttribute('data-del-val') || el.getAttribute('data-del-val');
                if (temp_id) {
                    if (Is_Float_Node(el) && el.firstElementChild.getAttribute('data-del-val')) {
                        let split = el.textContent.split(" ");
                        el.innerHTML = txt = split[0].concat(" ", temp_id);
                    } else {
                        el.innerHTML = txt = temp_id;
                    }
                    let o = el.getAttribute("zrid");
                    if (o) Obj_set_remove.set.rid = o, Obj_set_remove.remove.push("zrid");
                    if (txt == el.getAttribute("ztxt")) {
                        Obj_set_remove.remove.push("ztxt");
                    }
                }
                    */
                this.retainOriginal(el, Obj_set_remove);
            }
            DOM_TEMP = ((self['G_CONFIG']['Reference']['text-format'] == "sup") ? el.closest("sup") : el);
            if ((FROM_REF_DEL && split.length == 1) || FROM_DEL_CITE) {
                if (((EL_TAG == 'INSERT' && !el.closest('a')) || (EL_TAG == 'A' && INSERT_DOM)) && !IS_EDIT) {
                    // ? If not same user future
                    TEMP_OBJ.parent = INSERT_DOM.parentElement;
                    if (Is_Float_Node(el)) {} else {}
                    commonMethods.removeEl(INSERT_DOM);
                    debug.log('remove element method');
                    TEMP_OBJ.IsNewCite = true;
                    if (!FROM_REF_DEL) {
                        TEMP_OBJ.cursor_point = self.M_FUN.local_elm_id(TEMP_OBJ.parent);
                    }
                } else {
                    debug.log('retain element method');
                    // self['G_FUN'].SET_REMOVE_ATTR(el, Obj_set_remove.set, Obj_set_remove.remove);
                    DOM_TEMP = el;
                    let DOM_PAR = DOM_TEMP.parentNode,
                        DEL_DOM = window._trackManager.getDelNode(),
                        SEL_OBJ = {};
                    if (IMS.ISstartOfBlock && Is_Float_Node(el)) {
                        try {
                            range.setStart(el, 0);
                            range.setEnd(el.nextSibling, 1);
                        } catch (err) {
                            console.warn(err.message);
                            range.selectNode(el);
                        } finally {
                            safeWrapRange(range, DEL_DOM, el.nextSibling);
                        }
                    } else {
                        SEL_OBJ = selectDOMRange(DOM_TEMP, pBool, nBool);
                        self.M_SCOPE.IS_SEL_WITH_PAIR = SEL_OBJ.IS_SEL_WITH_PAIR;
                        range = SEL_OBJ.range;
                        TEMP_OBJ.HandleMethod = SEL_OBJ.HandleMethod;
                        if (!TEMP_OBJ.HandleMethod.ExtractMethod) {
                            if (idx > 0) {
                                TEMP_OBJ.DEL_DOM = DEL_DOM;
                                TEMP_OBJ.DEL_DOM_TIME = TEMP_OBJ.DEL_DOM.dataset.time;
                            }
                            safeWrapRange(range, TEMP_OBJ.DEL_DOM);
                        }
                    }
                    if (FROM_REF_DEL) {
                        // ? Handling already edited elements presented  next / prev
                        // TODO - DEBUG SSCENRIO
                        if (SEL_OBJ.pBool) {
                            if (el.previousSibling) {
                                $(el.previousSibling.firstElementChild).unwrap();
                                SEL_OBJ.pBool = false;
                            }
                        }
                        if (SEL_OBJ.nBool) {
                            if (el.nextSibling) {
                                $(el.nextSibling.firstElementChild).unwrap();
                                SEL_OBJ.nBool = false;
                            }
                        }
                    }
                    if (DOM_TEMP) {
                        let [IS_SUP, INS_EL] = [DOM_TEMP.querySelector('.sup'), DOM_TEMP.querySelector("insert")];
                        if (DOM_PAR.nodeName != 'INSERT' && !INS_EL) {
                            //  ? Pattern-1 - RENUMBER <a><insert>12</insert><a>
                            let TEMP_ARR = DOM_TEMP.tagName == "A" ? [DOM_TEMP] : DOM_TEMP.querySelectorAll('a');
                            Array.from(TEMP_ARR).forEach((elm, idx, arr) => {
                                elm.setAttribute('data-remove', 's');
                                let ins_dom = elm.querySelector('insert');
                                if (ins_dom) elm.removeChild(ins_dom);
                                let txt = elm.textContent;
                                let obj = {};
                                if (elm.hasAttribute('ztxt')) {
                                    txt = elm.getAttribute('ztxt');
                                    obj = {
                                        rid: elm.getAttribute('zrid')
                                    };
                                    commonMethods.SET_REMOVE_ATTR(elm, obj, ['ztxt', 'zrid']);
                                }
                                elm.textContent = txt;
                            });
                        } else if (DOM_PAR.nodeName == 'INSERT' || INS_EL) {
                            //  ? Pattern-2 - Edited <insert><a>12<a></insert>
                            // ? 06_JAN_22 Updated - YA - HANDLE RANGE
                            let temp_el = (INS_EL ? INS_EL : DOM_PAR),
                                type = "bibr";
                            if (DOM_TEMP.querySelector('a')) type = DOM_TEMP.querySelector('a').getAttribute('ref-type');
                            else if (DOM_TEMP.hasAttribute('ref-type')) type = DOM_TEMP.getAttribute('ref-type');
                            // ? 10_MAR_2023 - YA  for ranged
                            let StringXref = safeGetCiteEle(temp_el.dataset.delVal).getCiteEle(type);
                            let coll_a = DOM_PAR.querySelectorAll("a");
                            if (coll_a.length == 1) {
                                let temp_xref = $(StringXref).attr('data-remove', 's');
                                if (!IS_SUP) IS_SUP = DOM_TEMP.closest('.sup');
                                $(IS_SUP ? IS_SUP : DOM_TEMP).html('').append(temp_xref);
                                // ? removing the insert element
                                commonMethods.iunWrap(temp_el);
                            } else if (coll_a.length > 1) {
                                let parent = DOM_TEMP.parentElement;
                                // ? <insert del-val=1>1,2</insert>
                                if (temp_el.dataset.delVal == txt) {
                                    // ? delete text == del-val
                                    // TODO NEED DISCUSS FIX - WHICH ONE TO SHOW
                                } else {
                                    // ? delete text != del-val 
                                    // ? removing the insert element
                                    // commonMethods.iunWrap(temp_el);
                                    parent.removeAttribute("data-del-val");
                                    if (parent.dataset.username == USER_INFO.MAIL_ID && parent.dataset.rolename == USER_INFO.TRACK_ROLE_NAME) {
                                        parent.textContent = txt;
                                    }
                                }
                            }
                        }
                        // ? to remove  https://stackoverflow.com/questions/2409117/how-to-unwrap-text-using-jquery
                        // ? 29_NOV_22 Updated - YA - REMOVE SPAN.XREFGROUP PARENT ELEMENT
                        commonMethods.iunWrap(DOM_TEMP, {
                            selector: '.xRefGroup'
                        });
                        // ? DELETE - RANGED HANDLE SAME/DIFF USERS 28_DEC_22-YA_SRINI_MOM_26_DEC_22/06_JAN_22_YA
                        // ? https://stackblitz.com/edit/js-xbgzzh?file=index.js,package.json,index.html,style.css
                        let ROOT_FIND = (EL_PARENT && EL_PAR_TAG != "A" ? EL_PARENT : EL_G_PARENT);
                        let [DEL_DOM, USER_ID, DIFF_USER, MOVED] = [ROOT_FIND.querySelector(`del[data-time="${TEMP_OBJ.DEL_DOM_TIME}"]`), null, false, []];
                        if (!DEL_DOM) DEL_DOM = ROOT_FIND.closest(`del[data-time="${TEMP_OBJ.DEL_DOM_TIME}"]`);
                        if (DEL_DOM && DEL_DOM.querySelector("del")) {
                            USER_ID = DEL_DOM.getAttribute("data-username");
                            Array.from(DEL_DOM.childNodes).forEach((el, idx, arr) => {
                                let IS_DEL = el.nodeType == 1 && el.tagName == "DEL";
                                if (!DIFF_USER && IS_DEL && el.getAttribute("data-username") != USER_ID) {
                                    DIFF_USER = true;
                                }
                                if (DIFF_USER) {
                                    if (IS_DEL) {
                                        MOVED.push(el);
                                        el.remove();
                                    } else if (!IS_DEL) {
                                        let del = document.createElement("del");
                                        commonMethods.setAttr(del, DEL_DOM.attributes);
                                        del.innerHTML = el[el.nodeType == 1 ? 'outerHTML' : 'nodeValue'];
                                        MOVED.push(el);
                                        el.remove();
                                    }
                                } else {
                                    if (IS_DEL)
                                        commonMethods.iunWrap(el);
                                }
                            });
                        }
                    }
                }
            } else if (FROM_REF_DEL && split.length > 1) {
                let newRid = split.filter((rid) => {
                    return rid != DEL_ID;
                }).sort().filter(Boolean);
                let citeObj = new namedCitation(newRid, {
                    delVal: txt,
                    delRid: rid
                });
                el.after(citeObj.FINAL_OUT[0].direct.frag_append_insert);
                el.parentElement.removeChild(el);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('EACH_CITE_ENTRY', err.message);
        }
    },
    // ? Global Scope
    // var findXref = $(_.iDOM).find('a.xref:not([data-role="aff"]):not([data-remove]):not([data-modify])');
    // ? here fetching reference citation inside float objects fig/table/ like
    // ? collection xref [2] and [2,3]
    // ? collection of rids
    // CitationNewModule.TEST_LOOP("03");
    // CitationNewModule.TEST_LOOP("04");

    Alert: function(_ = CitationNewModule) {
        try {
            if (!AlertNewDialog.IsShown()) {
                let ALERT_KEY = '';
                if ((_.M_SCOPE.IsInsert || _.M_SCOPE.IsEdit) && _.M_SCOPE.IsReNumber) {
                    ALERT_KEY = _.M_SCOPE.IsDelete ? 'REF_CITE_DEL_ReNUM' : 'REF_CITE_INS_ReNUM';
                } else if (!_.M_SCOPE.IsReNumber) {
                    if (_.M_SCOPE.IsDelete) ALERT_KEY = 'REF_CITE_DEL';
                    else {
                        /* if (_.M_SCOPE.ACTIVE_TAB != 0)  */
                        if (_.M_SCOPE.IsInsert) {
                            ALERT_KEY = 'CITE_INSERT_COMMON';
                        }
                    }
                }
                let Options = {};
                if (iREF_SCOPE.IS_NAME_DATE && _.M_SCOPE.ACTIVE_TAB == 0) {
                    Options.addText = ALERT_MESSAGE['CITE_DEL_NOTE']['text'];
                    Options.position = "center";
                }
                if (!!ALERT_KEY)
                    TOASTER_ALERT(ALERT_KEY, Options);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Alert', err.message);
        }
    },
    Revert_Del_Cite: function(rid, _ = CitationNewModule) {
        try {
            /* 
            ? combined
            <a class="xref" rid="CIT0002 CIT0003 CIT0004" zrid="CIT0002 CIT0003 CIT0004 CIT0005" ztxt="2–5" href="#CIT0002 CIT0003 CIT0004"><insert class="ice-ins ice-cts" data-del-val="2–5" data-last-change-time="1646762189828" data-time="1646762189859" data-username="yasar.mohideen@newwgen.co">2–4</insert></a>
            ? single
            <del class="ice-del ice-cts"  data-last-change-time="1646762190458" data-time="1646762190525" data-username="yasar.mohideen@newwgen.co">[<a class="xref" rid="CIT0039" zrid="CIT0039" ztxt="39" data-remove="s">39</a>]</del>        
            <del class="ice-del ice-cts" data-changedata="" data-cid="11" data-last-change-time="1646763435706" data-time="1646763435780" data-userid="null" data-username="yasar.mohideen@newwgen.co"><a class="xref" data-name="xref" data-role="bibr" ref-type="bibr" rid="CIT0013" data-remove="s">13</a></del>
            */
            var del_ref = _.iDOM.querySelector(`[del_id="${rid}"]`);
            if (!del_ref) return;
            //if(del_ref.hasAttribute('data-remove')) del_ref.removeAttribute('data-remove');
            _['G_FUN'].SET_REMOVE_ATTR(del_ref, {
                id: rid,
                'data-revert': 's'
            }, ['del_id', 'data-remove']);


            var selectors = commonMethods.xrefSelectorBuilder(rid, ['zrid'], true);
            var XCiteList = _.iDOM.querySelectorAll(selectors);
            Array.from(XCiteList).forEach((elm, idx, arr) => {
                if (elm.hasAttribute('data-remove')) {
                    // ? single
                    elm.removeAttribute('data-remove');
                    _['G_FUN'].SET_REMOVE_ATTR(elm, {
                        href: '#' + rid,
                        'data-edit': 's'
                    }, ['zrid', 'ztxt', 'data-remove']); //
                    elm.parentElement.outerHTML = elm.parentElement.innerHTML;
                } else if (elm.querySelector('insert')) {
                    let old_rid = elm.getAttribute('zrid');
                    let old_text = elm.getAttribute('ztxt');
                    elm.textContent = old_text;
                    _['G_FUN'].SET_REMOVE_ATTR(elm, {
                        rid: old_rid,
                        href: '#' + old_rid,
                        'data-edit': 's'
                    }, ['zrid', 'ztxt']); //
                }
            });
            var tData = _.M_FUN.CHECK_REF_CITATION_SEQUENCE(_.iDOM, {
                del_id: rid,
                cite_revert: true,
                reorder: true
            });
            _.iDOM.innerHTML = tData;
            _.M_FUN.Clean_Temp_Value(_.iDOM);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Revert_Del_Cite', err.message);
        }
    },
    Clean_Temp_Value: function(dom, _ = CitationNewModule) {
        try {
            CitationNewModule.TEST_LOOP("CN_V-01");
            if (typeof dom == 'string') _.iDOM.innerHTML = dom;
            dom = !dom ? _.iDOM : dom;
            dom.querySelectorAll(`[data-revert], [data-modify], [data-edit]`).forEach(el => {
                commonMethods.removeAttr(el, ['data-revert', 'data-edit', 'data-modify']);
            });
            CitationNewModule.TEST_LOOP("CN_V-02");
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Clean_Temp_Value', err.message);
        }
    },
    local_elm_id: function(elm, _ = CitationNewModule) {
        try {
            var temp = elm;
            var temp_id = elm.id;
            var loop = {
                max: 7,
                count: 0
            };
            while (!temp_id) {
                temp = temp.parentNode;
                if (!temp || loop.count > loop.max) {
                    break;
                } else {
                    temp_id = elm.id;
                    loop.count++;
                }
            }
            return temp_id;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('local_elm_id', err.message);
        }
    },
    EditMode: function(_ = CitationNewModule) {
        try {
            const {
                addNewBtn,
                SecondaryDivOpt,
                bracketDivOpt,
                PartLabOpt
            } = _.IBOX || {};

            if (!addNewBtn || !SecondaryDivOpt || !bracketDivOpt || !PartLabOpt) {
                return;
            }

            addNewBtn.classList.add('disabled');

            let IsRefTab = this.GET_SET_ACTIVE() == 0;
            let CanInsertNew = _.Panel.querySelectorAll(_.M_SCOPE.queryChecked).length == 0;
            if (IsRefTab) {
                SecondaryDivOpt.classList.add('ds-none');
            } else {
                SecondaryDivOpt.classList.remove('ds-none');
                bracketDivOpt.classList.add('invisible');
                PartLabOpt.removeAttribute('disabled', 's');
                if (partLabelManager) partLabelManager.updatePartLabels();
                if (CanInsertNew) {} else {}
            }
            _.M_SCOPE.IsEdit = true;
            // ? {<sup>[1, 2]</sup>} ==> selection REGRESSION TEST
            if (!iREF_SCOPE.IS_NAME_DATE) {
                if (/^\[|\(/gi.test(IMPACT_SELECTION.NODE_TEXT) || /\]|\)$/gi.test(IMPACT_SELECTION.NODE_TEXT)) {
                    var sel = GlobalEditor.getSelection(),
                        first = sel.getStartElement().getFirst(),
                        last = sel.getStartElement().getLast(),
                        range;
                    if (first && first.type == 3) first = first.getNext();
                    if (last && last.type == 3) last = last.getPrevious();
                    if (!first || !last) {
                        return;
                    }
                    if (typeof first.equals === "function" && first.equals(last)) {
                        debug.log("Same elements staring and end");
                    } else {
                        debug.log("selection");
                        range = GlobalEditor.createRange();
                        range.setStartAt(first, CKEDITOR.POSITION_BEFORE_START);
                        range.setEndAt(last, CKEDITOR.POSITION_AFTER_END);
                        GlobalEditor.getSelection().selectRanges([range]);
                    }
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('EditMode', err.message);
        }
    },
    CheckSiblingXref: function(_Data, Options, _ = CitationNewModule) {
        /* 
            ? 20_OCT_22_YA_FF_105_BUG
            ! THIS FUNCTION AFTER INSERT ANY CITETATION - VALIDATE CITATION SEPARATE NEARBY/SIBLINGS/NEXT/PREV MERGE INTO SINGLE
                ? https://stackoverflow.com/questions/10844194/remove-parenthesis-from-string-in-javascript        
        */
        try {
            CitationNewModule.TEST_LOOP("CH-SB-00");
            Options = Options ? Options : ({
                checkSup: false
            });
            if (typeof _Data == "string") $(_.iDOM).html('').append(_Data);
            let selector = 'a.xref[data-role="bibr"]';
            var mList = $((Options.DOM ? Options.DOM : _.iDOM)).find('insert a.xref[data-role="bibr"], a[data-del-val]');
            var [regExp, isNewCite, oText, oNumberOnly, nText, oSting, XrefParent, XrefParTxt, xRefLen] = [(/[a-zA-Z]/g), false, "", "", "", "", null, "", null];
            var TEMP_CONFIG = _["G_CONFIG"]['Reference']['dircite'] || iREF_SCOPE.Reference.dircite;
            CitationNewModule.TEST_LOOP("CH-SB-01");
            const {
                'data-interest-level': dataInterestLevelAlias
            } = iREF_SCOPE.Reference || {};

            $.each(mList, function(idx, Elem) {

                // ? handle interest level item to be ignore

                if (!Elem || Elem.hasAttribute("data-interest-level")) return;

                if (Elem.parentElement != null) {

                    XrefParent = Elem.closest(`[data-username]`);

                    if (!XrefParent) return;

                    if (XrefParent && XrefParent.getAttribute("data-username") !== USER_INFO.MAIL_ID) return;

                    if (Options.remove_bk) _.G_FUN.REMOVE_CK_BK(XrefParent);

                    CitationNewModule.TEST_LOOP("CH-SB-02");
                    // ? Check only citation in this parent
                    xRefLen = $(XrefParent).find(selector).length;
                    XrefParTxt = XrefParent.textContent;
                    var Siblings = checkSiblingsBoolean(Elem),
                        arrRid = commonMethods.mapWithGetAttr(XrefParent, selector, 'rid'),
                        oldAttTxt = commonMethods.mapWithGetAttr(XrefParent, selector, 'data-del-val'),
                        oldTxt = commonMethods.mapWithGetAttr(XrefParent, selector, 'text');
                    if (['INSERT', 'SUP'].includes(XrefParent.tagName)) {
                        let [sibil_elm, IsInsert, IsSameUser_Sibil] = [null, false, false];
                        /*xRefLen > 1  && (indexInArray === 0)  &&*/
                        if (!regExp.test(XrefParTxt) || (Siblings.IsXref)) {
                            if (['[', ' ', '('].includes(XrefParTxt.charAt(0)) && [']', ')'].includes(XrefParTxt.charAt(XrefParTxt.length - 1))) {
                                var IsFirstCharSapce = XrefParTxt.charAt(0) == ' ';
                                oText = XrefParTxt.substring(IsFirstCharSapce ? 2 : 1, (XrefParTxt.length - 1));
                                isNewCite = true;
                                // ? if Edited Citation get Text
                            } else {
                                oText = XrefParTxt;
                            }
                            if (Siblings.IsXref) {
                                // ? YA-02_JAN_2022 - MOCK_BUG
                                // ? <insert><a>1</a></insert><insert><a>1,2</a></insert>
                                let temp = XrefParent.parentElement[Siblings.selector];
                                sibil_elm = temp && temp.nodeType == 1 ? temp : XrefParent[Siblings.selector];
                                if (sibil_elm) {
                                    [IsInsert, IsSameUser_Sibil] = [sibil_elm.tagName == "INSERT", sibil_elm.getAttribute("data-username") == USER_INFO.MAIL_ID];
                                    oText = oText.concat(",", sibil_elm.textContent.replace(/[\])}[{(]/g, ''));
                                }
                            }
                            // ? 31_DEC_22- YA - MOCK_LIVE <insert>[1][1,2]</insert> || <insert>[1] [1,2]</insert>
                            if (oText.indexOf(']') > -1 && oText.indexOf('[') > -1) oText = oText.replace(/\]\[/g, ',').replace(/(\])(.?\s+)(\[)/g, ',');
                            if (oText.indexOf(')') > -1 && oText.indexOf('(') > -1) oText = oText.replace(/\)\(/g, ',').replace(/(\))(.?\s+)(\()/g, ',');
                            if (iREF_SCOPE.IS_NAME_DATE) {

                            } else {
                                // ? 2743416: AJCPAT & LABMED - Reference citation range - Hyphen usage
                                let temp = "";
                                if (oText.isContainsDash()) {
                                    temp = oText.expandNumbers().toLocaleString();
                                } else temp = oText;
                                oNumberOnly = temp.split(',').map(Number).sort(function(a, b) {
                                    return a - b;
                                }).filter(function(item, pos, inputArray) {
                                    return inputArray.indexOf(item) == pos;
                                });
                                // ? handle ranged interest level symbol
                                if (dataInterestLevelAlias) {
                                    oText = removeInterestSymbol(oText);
                                }

                                // ? Compare to New Text
                                nText = _.formatter.formatRanges(oNumberOnly);
                                if (oText !== nText && nText != "") {
                                    CitationNewModule.TEST_LOOP("CH-SB-03");
                                    oSting = safeGetCiteEle(nText, "bibr");
                                    console.log(XrefParent.innerHTML);
                                    debug.log([oldAttTxt, oldTxt]);
                                    let oldDelVal = Elem.getAttribute("data-del-val") || "";
                                    if (!oldDelVal && oldAttTxt.length > 0) oldDelVal = oldAttTxt.join(",");
                                    $(XrefParent).html('').append((isNewCite) ? (TEMP_CONFIG.openwrap + oSting + TEMP_CONFIG.closewrap) : (oSting));
                                    if (oldDelVal && XrefParent.querySelector("a")) XrefParent.querySelector("a").setAttribute("data-del-val", oldDelVal);
                                    console.log(XrefParent.innerHTML);
                                    if (Siblings.IsXref) {
                                        if (IsInsert) {
                                            if (!IsSameUser_Sibil) {
                                                // ? DIFFER USER - SET CURRENT USER INFO
                                                var insEl = window._trackManager.getInsNode();
                                                commonMethods.setAttr(XrefParent, insEl.attributes);
                                            }
                                            //let OLD_VAL = sibil_elm.getAttribute("data-del-val") || sibil_elm.textContent;
                                            //XrefParent.setAttribute("data-del-val", OLD_VAL);
                                            debug.warn("sibil_elm.remove");
                                            sibil_elm.remove();
                                            CitationNewModule.TEST_LOOP("CH-SB-05");
                                            // ? YA-02_JAN_2022 - MOCK_BUG
                                        } else {
                                            /* 
                                            <insert data-del-val="16" data-last-change-time="1666267892101" data-time="1666267892110" ><a>16</a>, <a>17</a></insert> 
                                            */
                                        }
                                    }
                                }
                            }
                        }
                    }
                    isNewCite = false;
                }
            });
            CitationNewModule.TEST_LOOP("CH-SB-06");
            if (Options.checkSup) {
                // ? remove unwanted sup tags
                Array.from((Options.DOM ? Options.DOM : _.iDOM).querySelectorAll('sup.sup>sup.sup')).forEach(function(el, idx, ar) {
                    let haveParen = (/\[|\]/gi.test(el.textContent));
                    $(haveParen ? el.closest("sup") : el.firstChild).unwrap();
                });
            }
            CitationNewModule.TEST_LOOP("CH-SB-07");
            _.M_FUN.Clean_Temp_Value((Options.DOM ? Options.DOM : _.iDOM));
            CitationNewModule.TEST_LOOP("CH-SB-08");
            return (Options.DOM ? Options.DOM : _.iDOM).innerHTML;
        } catch (err) {
            console.log(err.message);
            ErrorLogTrace('CheckSiblingXref', err.message);
        } finally {}
    },
    CHANGE_XREF_ID_BY_REF_INDEX: function(DOM, Options = {}, _ = CitationNewModule) {
        try {
            DOM.querySelectorAll('div.ref:not([data-remove])').forEach((ref, idx, arr) => {
                let new_id = (idx + 1).toString().getBibId();
                if (new_id == ref.id) return;
                ref.id = new_id;
                var selectors = commonMethods.xrefSelectorBuilder(new_id);
                DOM.querySelectorAll(selectors).forEach(cite => {
                    commonMethods.SET_REMOVE_ATTR(cite, {
                        href: '#' + new_id,
                        rid: new_id
                    });
                });
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CHANGE_XREF_ID_BY_REF_INDEX', err.message);
        }
    }
};
// Helper function to escape special characters in regex
function escapeRegExp(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}


function get_float_collection(type, arrLen = 0, returnConsistent = false) {
    try {
        const group = {
            single: [],
            multi: []
        };

        GlobalEditor.document.find(`a[ref-type="${type}"]`).toArray().forEach((cite) => {
            const split = cite.getText().split(" ");
            const rid = cite.getAttribute("rid").split(" ");
            const isInserted = cite.getAscendant("insert");

            if (split.length > 1 && !isInserted) {
                (rid.length > 1 || split[0].match(/s\.|s$/) ? group.multi : group.single).push(split[0]);
            }
        });
        if (returnConsistent) {
            return commonMethods.getMaxPattern(arrLen > 1 ? group.multi : group.single);
        } else return {
            singleCites: group.single,
            multiCites: group.multi,
            singleGroup: commonMethods.groupBy(group.single),
            multiGroup: commonMethods.groupBy(group.multi),
            singleMaxPattern: commonMethods.getMaxPattern(group.single),
            multiMaxPattern: commonMethods.getMaxPattern(group.multi)
        };

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('get_float_collection', err.message);
    }
}



function REF_SORT_SEC(refSec, DOM, Options = {}, self) {
    // ? https://stackoverflow.com/questions/14131008/how-to-sort-out-elements-by-their-value-in-data-attribute-using-js
    // ? 17_NOV_22 - MULTIPLE CITATION HAS BEEN NOT CITED - HANDLE NEW LOGIC FOR SORTING AND ID, - YA
    self = CitationNewModule;
    try {
        DOM = DOM ? DOM : document.getElementById('aaa');
        let VALID_ID_IGNORE = function(id) {
            try {
                if (typeof id != "string") id = id.id;
                return ![" ", "", "null", "undefined", null, undefined].includes(id);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('VALID_ID_IGNORE', err.message);
            }
        };

        function get_id(e) {
            try {
                let rValue = VALID_ID_IGNORE(e.id) ? e.id : (e.hasAttribute('del_id') ? e.getAttribute('del_id') : ( /* e.hasAttribute('oid') ? e.getAttribute('oid') : */ ('')));
                // console.log(rValue);
                return rValue;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('get_id', err.message);
            }
        }

        function sorter(a, b) {
            try {
                let [a_val, b_val] = [get_id(a), get_id(b)];
                // console.log([a_val, b_val]);
                return a_val.localeCompare(b_val);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('sorter', err.message);
            }
        }

        function CiteMissReNumbering(ref, idx, delCount, allCount, checkSeqBefore) {
            try {
                if (ref.hasAttribute("data-cite-missing")) {
                    let r_Obj = GET_NEW_ID((idx - delCount), DOM, {
                        cur_id: ref.id,
                        overall: allCount + 5
                    });
                    if (checkSeqBefore && ((idx + 1) - delCount).toString().getBibId() == ref.id) {
                        return debug.log("correct_order");
                    }
                    if (ref.hasAttribute("data-remove")) {
                        let lab = ref.querySelector("span.label");
                        r_Obj.lab = lab.getAttribute(lab.hasAttribute("odata-value") ? "odata-value" : "data-value");
                        r_Obj.id = "";
                    }
                    if (allCount < r_Obj.lab) {
                        return debug.log("correct_order");
                    }
                    UPDATE_LABEL(ref, {
                        new_id: r_Obj.id,
                        new_lab: r_Obj.lab
                    });
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('CiteMissReNumbering', err.message);
            }
        }
        var categoryItems = refSec.querySelectorAll("div.ref");
        var categoryItemsArray = Array.from(categoryItems);
        var sorted = categoryItemsArray.sort(sorter);
        var [all_count, del_count] = [categoryItems.length, refSec.querySelectorAll("div.ref[data-remove]").length];
        var CiteMiss_ReNumber = false;
        sorted.forEach(function(e, idx, arr) {
            // ?  HANDLE UN_CITE_REF_ORDERING_HERE 26_SEP_22 -YA
            if (!VALID_ID_IGNORE(e.id) && !e.hasAttribute("data-remove")) {
                if (e.id) {
                    var selectors = commonMethods.xrefSelectorBuilder(e.id, [], true);
                    if (DOM.querySelectorAll(selectors).length == 0) {
                        // ? here validate for missing citation
                        e.setAttribute("data-cite-missing", "ss");
                    } else e.removeAttribute("data-cite-missing");
                }
            }
            CiteMissReNumbering(e, idx, del_count, all_count);
        });
        var final_sort = sorted.sort(sorter);
        final_sort.forEach(function(e, idx, arr) {
            if (!CiteMiss_ReNumber) CiteMissReNumbering(e, idx, del_count, all_count, true);
            refSec.appendChild(e);
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('REF_SORT_SEC', err.message);
    }
}

function UPDATE_LABEL(ref, Options, self) {
    /*  
        @Options
    */
    self = CitationNewModule;
    try {
        ref = ref[0] ? ref[0] : (ref.$ ? ref.$ : ref);
        if (!ref) return;
        var {
            new_id,
            new_lab
        } = Options;

        var [lab_elm, o_Id, IsNew] = [ref.querySelector('span.label'), (ref.id), (ref.hasAttribute('data-new'))];
        var [cur_lab, IsEdited] = [(lab_elm.dataset.value ? lab_elm.dataset.value : lab_elm.textContent), (lab_elm.hasAttribute('odata-value'))];

        // Update ID
        ref.id = new_id;

        // Set original ID if not present        
        if (!ref.hasAttribute('oid') && !IsNew) ref.setAttribute('oid', o_Id);

        // ? convert to string
        new_lab = new_lab + "";

        if (!new_lab.endsWith(".")) {
            // ? <RefNumber type="Number." style="‡ref_number" pattern="\b[0-9]{1,}" Addbefore="" Addafter="."/>
            let ref_num = iREF_SCOPE['DOC'] && iREF_SCOPE['DOC'].querySelector(`RefNumber,ref_number`);
            // ? 09_MAR_2023 - YA HANDLE - IF NOT GIVEN CEG-CONFIG 
            if (ref_num || cur_lab.endsWith(".")) {
                if (ref_num) {
                    let add_before = ref_num.getAttribute("Addbefore");
                    if (add_before && add_before.length > 0 && new_lab.indexOf(add_before) == -1) {
                        new_lab = add_before + new_lab;
                    }
                }
                let add_after = ref_num ? ref_num.getAttribute(ref_num.hasAttribute("delim") ? 'delim' : 'Addafter') : ".";
                if (add_after && add_after.length > 0 && new_lab.indexOf(add_after) == -1) {
                    new_lab += add_after;
                }
            }
        }
        let digit = (new_lab).length == 1 ? ('oDigit') : ((new_lab).length == 2 ? ('tDigit') : ('hDigit'));
        let org_lab = IsEdited ? lab_elm.getAttribute('odata-value') : cur_lab;
        let tValues = window.GetTrackTag(lab_elm, new_lab, org_lab);
        const removeAttr = [];
        const attributes = {
            'data-value': new_lab,
            'data-val-class': digit
        };
        if (!lab_elm.hasAttribute('odata-value') && !IsNew) {
            attributes['odata-value'] = org_lab;
        }

        if (org_lab == new_lab) {
            removeAttr.push("odata-value");
        }
        if (new_id === o_Id) {
            removeAttr.push("oid");
        }

        commonMethods.SET_REMOVE_ATTR(lab_elm, attributes, removeAttr);

        $(lab_elm).html('').append(IsNew ? new_lab : tValues);

        return {
            id: o_Id,
            lab: cur_lab
        };
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('UPDATE_LABEL', err.message + ref);
    }
}

function checkSiblingsBoolean(elm, Options = {}) {
    try {
        var [IsXref, return_selector] = [false, null];
        elm = elm.closest('insert') ? elm.closest('insert') : elm;
        ['nextSibling', 'previousSibling'].forEach(selector => {
            if (elm[selector] && elm[selector].nodeType == Node.ELEMENT_NODE) {
                IsXref = (elm[selector].tagName == 'A' ? (true) : (elm[selector].tagName == 'INSERT' ? (elm[selector].querySelector('a') ? true : false) : false));
                return_selector = selector;
            }
        });
        return {
            IsXref: IsXref,
            selector: return_selector
        };
    } catch (err) {
        logError('checkSiblingsBoolean', err);
    }
}
// Safe wrapper to avoid "undefined is not an object"
function safeGetCiteEle(str, role) {
    return (typeof str === "string" ? str : "").getCiteEle(role);
}

String.prototype.getCiteEle = function(role, config, collection, ObjConfig = {}) {
    try {
        var $this;
        var CiteModule = CitationNewModule;
        const sourceText = typeof this === "string" ? this : String(this != null ? this : "");
        if (typeof this == 'object') $this = this.toLocaleString();
        role = typeof role === "string" ? role : "";
        if (!config) config = ObjectFilter(iREF_SCOPE, 'ref-type', role);
        let IsRefCite = role == 'bibr' ? true : false;
        var GET_LABEL_NUMER = function(a) {
            try {
                if (!IsRefCite && config.caption && config.caption.label_format) {
                    let format = config.caption.label_format;
                    let IsUpper = (format.match(/upper/) ? true : false);
                    if (format.match(/roman/)) {
                        a = romanize(a);
                        if (!IsUpper) {
                            a = a.toLocaleLowerCase();
                        }
                    }
                    return ("" + a).toString();
                }
                return ("" + a).toString();
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('GET_LABEL_NUMER', err.message);
            }
        };
        const prefix = typeof ObjConfig.prefix === "string" ? ObjConfig.prefix : "";
        const rid = typeof ObjConfig.rid === "string" ? ObjConfig.rid : "";

        if (IS_JOURNAL) {
            // ? Moved By Durai
            const {
                separate,
                double_sep,
                last_sep
            } = (config && config.dircite) ? config.dircite: {};
            let separator = separate ? (separate) : (double_sep ? double_sep : ',');

            let additionalSeparators = [];
            if (separator) additionalSeparators.push(separator);
            if (last_sep) additionalSeparators.push(last_sep);

            // Create regex pattern for multiple separators
            let separatorRegex = new RegExp(additionalSeparators.map(s => escapeRegExp(s)).join('|'), 'g');

            // Perform the split
            var nid,
                prefixId = role ? role.slice(0, 1).toUpperCase() : "",
                prefix_2 = prefix ? prefix.slice(0, 1).toUpperCase() : "",
                split = sourceText.split(separatorRegex),
                mLen = split.length,
                html = '',
                fid = s4();

            // Debugging to check split result
            console.log(split);

            if (prefix_2 && prefix_2 != prefixId && rid && rid.slice(0, 1) == prefix_2) {
                // ? 27_JUN_2023_YA_NEW_PATTERN_MTSPEC_OUP_BATCH_19
                prefixId = prefix_2;
            }
            if ($this.isContainsDash(!0)) {
                $.each(split, function(x, y) {
                    let lab_number = GET_LABEL_NUMER(y);
                    nid = (IsRefCite) ? (y.getBibId()) : (prefixId + y);
                    html += `<a class="xref" data-name="xref" data-role="${role}" href="#${nid}" ref-type="${role}" rid="${nid}" fid="${fid}">${lab_number}</a>`;
                    if (mLen != (x + 1)) {
                        html += separator;
                    }
                });
            } else {
                if ($this.isContainsDash(!0, ",")) {
                    const hasOnlyThrough = $this.hasOnlyThrough();
                    let split = String($this || "").split(/[-–—]|\bthrough\b/gi),
                        fsplit = parseInt(split[0]),
                        lSplit = parseInt(split[1]),
                        newArr = [],
                        nid = [];
                    for (let i = fsplit; i <= lSplit; i++) {
                        newArr.push(i);
                    }
                    split = newArr.sort((a, b) => a - b).join().split(',');
                    split.forEach((id, ind, ar) => {
                        nid.push(IsRefCite ? id.getBibId() : prefixId + id);
                    });
                    // ? LWW - NEW PATTERN PART LABELES
                    let sep = '–';
                    if (config._Insert_Type && config[config._Insert_Type] && config[config._Insert_Type].range_sep != "–") {
                        sep = config[config._Insert_Type].range_sep;
                    }
                    let lab_number = GET_LABEL_NUMER(fsplit).concat(sep, GET_LABEL_NUMER(lSplit));
                    html += `<a class="xref" data-name="xref" data-role="${role}" href="#${nid.join(' ')}" ref-type="${role}" rid="${nid.join(' ')}" fid="${fid}">${lab_number}</a>`;
                    console.log(html);
                } else {
                    if ($this.indexOf(',') != -1) {
                        let split = $this.match(/(.*),(.*)/);
                        let aa = safeGetCiteEle(split[1] && split[1].trim(), role);
                        let bb = safeGetCiteEle(split[2] && split[2].trim(), role);
                        html = aa + separator + bb;
                    }
                }
            }
            // ? remove muliple space if added.
            return IsRefCite ? html : (config.dircite.last_sep == "false" ? (html.replace(/\s\s+/g, ' ')) : ((html.replace(/,(?=[^,]*$)/, ' and ')).replace(/\s\s+/g, ' ')));
        } else if (!IS_JOURNAL) {
            // Updated dynamic structure to include 'video clip' as a unique type
            const dynamicData = {
                fig: {
                    ids: [],
                    strings: [],
                    order: 0
                },
                pic: {
                    ids: [],
                    strings: [],
                    order: 0
                },
                map: {
                    ids: [],
                    strings: [],
                    order: 0
                },
                img: {
                    ids: [],
                    strings: [],
                    order: 0
                },
                table: {
                    ids: [],
                    strings: [],
                    order: 0
                },
                section: {
                    ids: [],
                    strings: [],
                    order: 0
                },
                audio: {
                    ids: [],
                    strings: [],
                    order: 0
                },
                video: {
                    ids: [],
                    strings: [],
                    order: 0
                },
                clip: {
                    ids: [],
                    strings: [],
                    order: 0
                },
                example: {
                    ids: [],
                    strings: [],
                    order: 0
                },
                exercise: {
                    ids: [],
                    strings: [],
                    order: 0
                },
                video_clip: {
                    ids: [],
                    strings: [],
                    order: 0
                    // Added video clip type
                }
            };

            // Updated mapping to include 'Video Clip'
            const typeMapping = {
                fig: "Figure",
                pic: "Picture",
                map: "Map",
                img: "Imgae",
                table: "Table",
                section: "Section",
                aud: "Audio",
                exa: "Example",
                exe: "Exercise",
                // Added prefix for video clip
                video_clip: "Video Clip"
            };

            // Process each entry in the config dynamically
            $.each(config, function(Key, Value) {
                $.each(Value, function(ind, entry) {
                    // Extract first three characters of the prefix
                    const prefixFirst3 = entry.prefix.toLowerCase().substring(0, 3);
                    const split = entry.label.split(/\s/);
                    const lastItem = split[split.length - 1];
                    const splitFirst3 = split[0].toLowerCase().substring(0, 3);

                    // Find matching key in dynamicData or fallback to typeMapping

                    let typeKey = Object.keys(dynamicData).find(key =>
                        ((key.startsWith(prefixFirst3) || typeMapping[prefixFirst3])) && (key.startsWith(splitFirst3))
                    );

                    // Fallback: Use typeMapping to derive the key if no match is found
                    if (!typeKey && typeMapping[prefixFirst3]) {
                        typeKey = Object.keys(typeMapping).find(key => key.startsWith(prefixFirst3));
                    }
                    // Skip if no valid typeKey is found
                    if (!typeKey) return;

                    if (typeKey == "video" && split.length > 2 && split[1].toLowerCase() == "CLIP".toLowerCase()) {
                        typeKey = "video_clip";
                    }
                    const data = dynamicData[typeKey];


                    const label = parseInt(lastItem.replace(/\./g, ''));
                    data.strings.push(label);

                    if (!data.ids[label]) {
                        data.ids[label] = entry.rid;
                        data.ids['prefix'] = entry.prefix;

                        if (entry.prefix != typeMapping[typeKey]) {
                            data.ids['prefix'] = typeMapping[typeKey];
                        }
                    }

                    data.order = entry.order;
                });
            });

            // Function to format and retrieve data for each type
            const getFormattedString = (key) => {
                const data = dynamicData[key];
                const formatted = CiteModule.formatter.formatRanges(data.strings);
                return getCiteString(formatted, data.ids, key);
            };

            const OverAll = [];
            $.each(dynamicData, function(key, data) {
                const value = getFormattedString(key);
                if (!value || value.length === 0) return;

                const consistentList = get_float_collection(value.type, value.length, true);
                const Node = $(value.join(', '));
                const isSingle = Node.length === 1 && Node[0].getAttribute('rid').split(' ').length === 1;
                const keyLast = key.toLowerCase().substring(0, 3);
                const fromConfig = typeMapping[keyLast] || typeMapping[key];
                const tempPrefix = (isSingle ? fromConfig : `${fromConfig}s`);
                var prefix = (consistentList.pattern || tempPrefix) + " ";
                if (!IS_JOURNAL && prefix.toLowerCase().substring(0, 3) != tempPrefix.toLowerCase().substring(0, 3)) {
                    prefix = tempPrefix;
                }
                let Sting = '';

                Node.each(function(ind, el) {

                    if (ind === 0) {
                        const processPrefix = (prefix, isSingle = false) =>
                            !isSingle && prefix.endsWith(' ') && !prefix.endsWith('s ') ?
                            prefix.slice(0, -1) + 's ' :
                            prefix + (!prefix.endsWith(' ') ? ' ' : '');

                        prefix = processPrefix(prefix, isSingle);
                        $(el).prepend(prefix);
                    }
                    // Remove last dot and dot before `</a>`
                    const content = el.outerHTML || el.textContent;
                    Sting += content.replace(/\.(?=<\/a>)/, '').replace(/\.$/, '');
                });
                OverAll.push(Sting);
            });

            // Reverse order if FigOrder is non-zero
            const FigOrder = dynamicData.fig.order;
            OverAll.sort((a, b) => (FigOrder === 0 ? 1 : -1));
            return OverAll.join(', ').replace(/, ([^,]*)$/, ' and $1');
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getCiteEle', err.message);
    }
};
commonMethods.groupBy = function(arr) {
    try {
        return arr.reduce((acc, item) => {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {});
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('commonMethods.groupBy', err.message);
    }
};
commonMethods.getMaxPattern = function(groupObj) {
    try {
        const counts = commonMethods.groupBy(groupObj);
        return Object.entries(counts).reduce((max, [key, value]) =>
            value > max.count ? {
                pattern: key,
                count: value
            } : max, {
                pattern: null,
                count: 0
            }
        );
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('commonMethods.groupBy', err.message);
    }
};