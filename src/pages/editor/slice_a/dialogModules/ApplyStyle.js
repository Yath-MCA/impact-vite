var StylePanelTemplate = `<div class="mDialog ds-none w-editor-access" id="ApplyStyleDialog">
        <div class="dialog-container md-5">
            <div class="dialog-content">
                <div class="dia_header_div"><div class="dia_header_text">Apply Style</div><div class="ml-auto closeIcons" title="Close"><img alt="Close" class="n_Img" src="assets/images/svg/dialogClose.svg"></div></div>                
                <div class="d-flex flex-column no-footer dialog-body" data-id="dialog-body">
                    <div class="styleList" id="StyleListDiv">
                        <span id="li1" class="iStyle" data-Style="H1" data-content="Heading 1"><i class="fas fa-heading"></i></span>
                        <span id="li2" class="iStyle" data-Style="H2" data-content="Heading 2"><i class="fas fa-heading"></i></span>
                        <span id="li3" class="iStyle" data-Style="H3" data-content="Heading 3"><i class="fas fa-heading"></i></span>
                        <span id="li4" class="iStyle" data-Style="P" data-content="Para"><i class="fa fa-paragraph" aria-hidden="true"></i></span>
                        <span id="li5" class="iStyle" data-Style="EXTRACT" data-content="Extract"><i class="fas fa-quote-right" aria-hidden="true"></i></span>
                        <span id="li6" class="iStyle disabled" data-Style="SOURCE" data-content="Source Line"><i class="fas fa-align-right"></i></span>
                    </div>
                </div>
                <div class="default ds-none dialog-footer" data-id="dialog-footer"></div>
            </div>
        </div>
</div>`;

function analyzeTitleLabels(heasdsList) {
    try {
        const mapped = Array.from(heasdsList).map((node) => {
            try {
                const titleNode = $(node).children('.title')[0];
                const label = $(titleNode).attr('data-label');
                const hasUsername = $(titleNode).is('[data-username]') || $(node).is('[data-username]');
                const skip = !label && hasUsername;

                const isRoman = commonMethods.isRomanNumeral(label);
                const isAlpha = /^[a-zA-Z]+$/.test(label || '');
                const isNumeric = /^\d+$/.test(label || '');
                // Determine pattern type
                let pattern = "numeric";
                if (isRoman) {
                    pattern = "roman";
                } else if (isAlpha) {
                    pattern = "alphabetical";
                }

                return {
                    node: titleNode,
                    label,
                    skip,
                    isRoman,
                    isAlpha,
                    isNumeric,
                    pattern
                };
            } catch (innerErr) {
                console.warn('Error mapping node:', innerErr.message);
                return {
                    node: null,
                    label: null,
                    skip: true,
                    isRoman: false,
                    isAlpha: false,
                    isNumeric: false,
                    pattern: "numeric"

                };
            }
        });

        const allHaveLabels = mapped.every(item => item.skip || !!item.label);

        const labeledCount = mapped.filter(item => item.skip || !!item.label).length;
        const majorityLabeled = labeledCount > mapped.length / 2;


        const allAreRoman = mapped.every(item => item.skip || item.isRoman);
        const allAreAlpha = mapped.every(item => item.skip || item.isAlpha);


        const patternCount = mapped.reduce((acc, item) => {
            if (!item.skip && item.label) {
                acc[item.pattern] = (acc[item.pattern] || 0) + 1;
            }
            return acc;
        }, {});

        let majorPattern = "numeric";
        let maxCount = 0;
        for (const [pat, count] of Object.entries(patternCount)) {
            if (count > maxCount) {
                maxCount = count;
                majorPattern = pat;
            }
        }

        return {
            mapped,
            allHaveLabels,
            isRoman: allAreRoman,
            isAlpha: allAreAlpha,
            majorityLabeled,
            pattern: majorPattern
        };
    } catch (err) {
        console.warn('analyzeTitleLabels failed:', err.message);
        ErrorLogTrace('analyzeTitleLabels', err.message);
        return {
            mapped: [],
            allHaveLabels: false,
            majorityLabeled: false,
            isRoman: false,
            isAlpha: false,
            pattern: "numeric"
        };
    }
}
var APPLY_STYLE_MODULE = new dialogModule('ApplyStyleDialog', StylePanelTemplate, {
    DOM_ID: "APPLY_STYLE_DOM"
});
document.addEventListener('DOMContentLoaded', function(event) {
    CKEDITOR.on('instanceReady', function(ev) {
        if (ev.editor.contextMenu) {
            ev.editor.contextMenu.addListener(function(element, selection, elementPath, editor) {
                if (window.paraLock && typeof window.paraLock._isElementLocked === "function") {
                    const isLocked = window.paraLock._isElementLocked(element, {
                        check_closest: true,
                        alertKey: 'ErrorLockedParaEdit'
                    });
                    if (isLocked) return {};
                }

                editor = selection.root.editor;
                var CUR_ELM = (elementPath.block != null) ? (elementPath.block.$) : (elementPath.blockLimit.$);
                var [IMS, $this, HEAD_GROUP_R] = [IMPACT_SELECTION, APPLY_STYLE_MODULE, {}];
                if (!$this.M_CONFIG.SHOW_CONTEXT_GROUP) {
                    $this.M_CONFIG.SHOW_CONTEXT_GROUP = IsContextMenu('headgroup');
                }
                if ($this.M_CONFIG.SHOW_CONTEXT_GROUP && EDITOR_CURSOR.IS_HEAD_TITLE) {
                    var CUR_SEC = element.$.closest('div.sec');
                    if (!CUR_SEC) return;
                    var [CURSOR_LVL, CUR_IDX, CAN_UP, CAN_DOWN, CUR_PAR] = [null, null, false, false, CUR_SEC.parentNode];
                    var CUR_CHILD = $(CUR_SEC).children();
                    if ((CUR_SEC.hasAttribute("data-levels"))) {
                        CURSOR_LVL = parseInt(CUR_SEC.getAttribute("data-levels"));
                        if ($(CUR_SEC).parent().hasClass('abstract') == false) {
                            // ? Up||Down method
                            CUR_IDX = Array.prototype.indexOf.call($(CUR_PAR).find('div.sec'), CUR_SEC);
                            $(CUR_SEC).prevAll().each(function(index, value) {
                                if (['sec', 'p', 'disp-quote'].includes(value.className)) {
                                    // &&(mChildLen !== 0)
                                    if ((CUR_IDX != 0)) {
                                        $.each(CUR_CHILD, function(ind, node) {
                                            if (this.className == P) {
                                                CAN_DOWN = true;
                                            }
                                        });
                                        // ? Hide function up
                                    }
                                    CAN_UP = true;
                                }
                            });
                            var [_ChangeLevlUp, _ChangeLevlDw] = [(CURSOR_LVL - 1), CURSOR_LVL + 1];
                            editor.addMenuItems({
                                ADD_LVL: {
                                    label: 'Add Section',
                                    command: 'STYLE_FIRE_ADD',
                                    group: 'headgroup',
                                    icon: '../assets/images/svg/ContextMenu/Add.svg',
                                    order: 111
                                },
                                HIGH_LVL: {
                                    label: 'Head ' + _ChangeLevlUp,
                                    command: 'STYLE_FIRE_UP',
                                    group: 'headgroup',
                                    icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
                                    order: 112
                                },
                                "CUR_LVL": {
                                    label: 'Head ' + CURSOR_LVL,
                                    command: 'STYLE_FIRE_CUR_LVL',
                                    group: 'headgroup',
                                    icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
                                    order: 113
                                },
                                LOW_LVL: {
                                    label: 'Head ' + _ChangeLevlDw,
                                    command: 'STYLE_FIRE_DOWN',
                                    group: 'headgroup',
                                    icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
                                    order: 114
                                },
                                DEL_LVL: {
                                    label: 'Delete Section',
                                    command: 'STYLE_FIRE_DELETE',
                                    group: 'headgroup',
                                    icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
                                    order: 115
                                }
                            });
                            HEAD_GROUP_R.CUR_LVL = CKEDITOR.TRISTATE_DISABLED;
                            if (CURSOR_LVL != 1) {
                                HEAD_GROUP_R.HIGH_LVL = (CAN_UP) ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
                            }
                            if (CURSOR_LVL < $this.M_CONFIG.HEAD_LIMIT) {
                                HEAD_GROUP_R.LOW_LVL = (CAN_DOWN) ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
                            }
                            if (IsContextMenu('PI_Group') && !IS_JOURNAL) {
                                HEAD_GROUP_R.Insert_PI = CKEDITOR.TRISTATE_OFF;
                            }
                            if (USER_INFO.IS_ADMIN && IS_LOCAL_HOST) {
                                HEAD_GROUP_R.dummyMenu = CKEDITOR.TRISTATE_OFF;
                            }
                        }
                    }
                }
                return HEAD_GROUP_R;
            });
        }
    });
});
APPLY_STYLE_MODULE.editorListener = function(editor, _ = APPLY_STYLE_MODULE) {
    try {
        debug.log("style-apply");
        if (!editor) editor = (GlobalEditor ? GlobalEditor : CKEDITOR.instances.maineditor);
        var menuGroup = editor._.menuGroups;
        if (!menuGroup.headgroup) {
            editor.addMenuGroup('headgroup', 110);
        }
        // if (IS_LOCAL_HOST) debugger;
        ['APPLY_STYLE', 'CUR_LVL', 'ADD', 'UP', 'DOWN', 'DELETE'].forEach((CMD, IDX, ARR) => {
            let IS_FIRST = IDX == 0;
            let NEW_CMD = IS_FIRST ? CMD : 'STYLE_FIRE_' + CMD;
            editor.addCommand(NEW_CMD, {
                exec: async function(editor) {
                    if (IDX == 0) {
                        var _ = APPLY_STYLE_MODULE['M_SCOPE'];
                        APPLY_STYLE_MODULE.DomManipulation(_.newElem, _.curElement, _.StyleMap, _.curElementId);
                    } else {
                        if (IDX == 1) {
                            debug.log("-STYLE_FIRE-");
                        } else {
                            headLvlMod(CMD.toLocaleLowerCase(), editor);
                        }
                    }
                }
            });
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('APPLY_STYLE_MODULE.editorListener', err.message);
    }
};
APPLY_STYLE_MODULE.fetch_set_lab_config = function($this = APPLY_STYLE_MODULE) {
    try {
        Array.from($this.iDOM.querySelectorAll('div.body div.sec[data-levels]')).forEach(sec => {
            let lvl = sec.getAttribute("data-levels");
            if (!this.M_CONFIG.HEADING["H" + lvl]) {
                this.M_CONFIG.HEADING["H" + lvl] = {
                    label_end_delim: "",
                    label_prefix: "",
                    label_format: "",
                    label_between_delim: ""
                };
            }
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('fetch_set_lab_config', err.message);
    }

};

APPLY_STYLE_MODULE.Label_Validation = function(Order, Level, prefix, cur_lab, Options = {}, _ = APPLY_STYLE_MODULE) {
    /* GET_SET LABELS AS PER CONFIG */
    try {
        const {
            el,
            pattern
        } = Options;
        let [suffix, oOrder, config] = ["", Order, _.M_CONFIG.HEADING["H" + Level]];
        if (config && IS_JOURNAL) {
            if (config.label_end_delim) suffix = config.label_end_delim;
            else if (cur_lab && cur_lab.endsWith(".")) suffix = ".";
            else suffix = "";

            if (!prefix && config.label_prefix_default) {
                prefix = config.label_prefix_default;
            }
            if (!config.label_prefix) {
                prefix = "";
            }
            // ? romanize || deromanize || getAlphabateByIndex
            let NumStyle = config.label_format;
            if (NumStyle && NumStyle != "arabic") {
                let IsUpper = (NumStyle.match(/upper/) ? true : false);
                if (NumStyle.match(/alphabet/))
                    Order = getAlphabateByIndex(Order, IsUpper);
                else if (NumStyle.match(/roman/)) {
                    Order = romanize(Order + 1);
                    if (!IsUpper) Order = Order.toString().toLowerCase();
                }
            } else if (NumStyle) {
                Order = Order + 1;
            } else if (cur_lab) {
                Order = Order + 1;
            } else if (!NumStyle) {
                Order = "";
            }
            let {
                label_between_delim
            } = _.M_CONFIG.HEADING;

            if (label_between_delim && prefix.length > 0 && !prefix.endsWith(label_between_delim)) {
                prefix = prefix + label_between_delim;
            }

        } else {
            Order = Order + 1;
            if (commonMethods.isRomanNumeral(cur_lab) || cur_lab == "" && pattern == "roman") {
                Order = commonMethods.toRomanNumeral(Order);
            }
        }
        return {
            label: prefix + Order + suffix
        };
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Label_Validation', err.message);
    }
};
APPLY_STYLE_MODULE.RE_STRUCTURE = function(items, prefix, _ = APPLY_STYLE_MODULE) {
    /* 
        ! THIS FUNCTION - HANDLE HEAD-LEVELS ID RE-GENERATE/CREATING
        ? HeadLevelLabel == GLOBAL SCOPE --> STORE THE BOOLEAN VALUES FOR NUMBER/UNNUMBERED 
    */
    try {
        prefix = (prefix && prefix.length > 0 ? (prefix + (prefix.endsWith(".") ? '' : '.')) : prefix);
        debug.log("<===" + prefix + "===>");

        var titleOverAllResults = analyzeTitleLabels(items);
        const {
            mapped,
            allHaveLabels,
            isRoman,
            pattern,
            majorityLabeled
        } = titleOverAllResults;

        var _IsLabelled = allHaveLabels || majorityLabeled;
        Array.from(items).forEach((node, idx, arr) => {

            let _headLevel = node.getAttribute('data-levels');
            let _titleEl = $(node).children('.title');
            let _labText = $(_titleEl).attr('data-label') || "";

            if (!_labText && _IsLabelled) {
                // ? if label followed append span tag
                $(_titleEl).attr('data-label', "");
                _labText = "";
            }

            var {
                label
            } = _.Label_Validation(idx, _headLevel, prefix, _labText, {
                el: node,
                pattern: pattern
            });


            if (_labText != label && _IsLabelled) {
                //?Check Pre vs New label 
                let del_leb = $(_titleEl).attr("data-label-delete");
                $(_titleEl).attr('data-label', label);
                if (del_leb) $(_titleEl).attr('odata-label', del_leb).removeAttr('data-label-delete');
            } else if (!_IsLabelled) {
                let lab = $(_titleEl).attr('data-label');
                $(_titleEl).attr("data-label-delete", lab).removeAttr('data-label');
            }
            // ? ID= Pattern = sec1-001
            var sublevels = $(node).children('div.body div.sec:not([sec-type="Back_Matter"],[sec-type="supplementary-material"])');
            if (sublevels.length > 0) {
                let nxt_lvl = (parseInt(_headLevel) + 1),
                    config = _.M_CONFIG.HEADING["H" + nxt_lvl];
                if (nxt_lvl && config && config.label_format && config.label_format != "") {
                    _.RE_STRUCTURE(sublevels, label);
                } else {
                    $.each(sublevels, function(Idx, Elm) {
                        let lab = $(Elm).children('.title').attr('data-label');
                        if (IS_JOURNAL && config && config.label_format && config.label_format == "") {
                            $(Elm).children('.title').attr('data-label-delete', lab).removeAttr("data-label");
                        } else if (!IS_JOURNAL && lab) {
                            // ? BOOKS
                            let prefixResult = getPrefixBooks(node, nxt_lvl),
                                history = prefixResult[nxt_lvl],
                                diff = prefixResult.all_count - prefixResult.lab_count,
                                avaerge = prefixResult.all_count / 2;
                            if (prefixResult.all_count > prefixResult.lab_count && (diff > avaerge)) {
                                debug.log(prefixResult);
                                $(Elm).children('.title').attr('data-label-delete', lab).removeAttr("data-label");
                            } else if (diff < avaerge) {
                                sublevels = prefixResult.sub_levels;
                                _.RE_STRUCTURE(sublevels, label);
                            }
                        }
                    });
                }
            }
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('RE_STRUCTURE', err.message);
    }
};
APPLY_STYLE_MODULE.ATTR_HANDLE = function(elm, Options = {}, _ = APPLY_STYLE_MODULE) {
    try {
        let AttrObj = {
                para: {
                    set: {
                        "data-name": "p",
                        "class": "p"
                    },
                    remove: []
                },
                track: {
                    set: {
                        'data-style': 'modified',
                        'data-track-code': 'style-01',
                        "default": ["dt", "du", "drn"],
                        // 'data-time': (new Date()).getTime(),
                        // 'data-username': USER_INFO.MAIL_ID,
                        // 'data-rolename': USER_INFO.TRACK_ROLE_NAME
                    },
                    remove: []
                }
            },
            setObj = {},
            removeArr = [];
        let ObjValue = AttrObj[Options.process];
        if (ObjValue) {
            setObj = ObjValue.set;
            removeArr = Options.remove ? Options.remove : ObjValue.remove;
        }
        _['G_FUN'].SET_REMOVE_ATTR(elm, setObj, removeArr);
        return elm;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('ATTR_HANDLE', err.message);
    }
};
APPLY_STYLE_MODULE.DomManipulation = function(newNode, cur_Elm, styleJSON, cursor_id, $this = APPLY_STYLE_MODULE) {
    /* 
         ? a new element outer html || b == curElement
         
    */
    GlobalEditor.updateElement();
    try {
        if ($this.iDOM) $this.iDOM.innerHTML = '';

        var _ParElm = cur_Elm.parentElement;
        let _ParElmId = _ParElm.id;

        let getCurElmInd = Array.from(_ParElm.children).indexOf(cur_Elm);
        let tempWrapper = document.createElement('div');

        let next_Sibling_Nest = null;

        $this.Set_DOM_Data(null, {
            DOM: true,
            node: cur_Elm
        });

        let par_Elm = $this.iDOM.querySelector(`[id="${_ParElmId}"]`) || null;
        cur_Elm = par_Elm.children.item(getCurElmInd) || cur_Elm || null;
        let next_Sibling = cur_Elm.nextElementSibling || null;


        $this['M_SCOPE'].prevElm = cur_Elm.previousElementSibling;
        $this['M_SCOPE'].prevElmClass = ($this['M_SCOPE'].prevElm != null) ? ($this['M_SCOPE'].prevElm.className) : (null);
        $this['M_SCOPE'].nextElm = cur_Elm.nextElementSibling;
        $this['M_SCOPE'].nextElmClass = ($this['M_SCOPE'].nextElm != null) ? ($this['M_SCOPE'].nextElm.className) : (null);

        if (styleJSON.class == 'sec') {
            var count = 0;
            tempWrapper.innerHTML = cur_Elm.innerHTML;
            newNode.firstElementChild.innerHTML = tempWrapper.innerHTML;
            // ? Creating Title Div
            cur_Elm.outerHTML = newNode.outerHTML;
            cur_Elm = par_Elm.children.item(getCurElmInd);
            $this['M_SCOPE'].curElementId = cur_Elm.id;
            next_Sibling = cur_Elm.nextElementSibling;
            while (next_Sibling) {
                if (!next_Sibling.id) {
                    next_Sibling.id = GENERATE_ID();
                }
                if (next_Sibling.className != 'sec' || next_Sibling.className == 'sec' && newNode.getAttribute('data-levels') != next_Sibling.getAttribute('data-levels')) {
                    next_Sibling_Nest = next_Sibling.nextElementSibling;
                    if (count == 0 && next_Sibling.className == 'p') {
                        next_Sibling.setAttribute('content-type', $this['M_CONFIG'].STYLE_CONFIG.P['content-type']);
                    }
                    cur_Elm.append(next_Sibling);
                    count++;
                } else break;
                next_Sibling = next_Sibling_Nest;
            }
            let [CUR_LEVEL, PAR_LEVEL] = [parseInt(cur_Elm.getAttribute('data-levels')), parseInt(par_Elm.getAttribute('data-levels'))];
            if (CUR_LEVEL == PAR_LEVEL || PAR_LEVEL > CUR_LEVEL) {
                if (PAR_LEVEL > CUR_LEVEL) {
                    // ? this case change style inside head 2 into heading 1
                    while (cur_Elm.parentElement.nextElementSibling) {
                        cur_Elm.appendChild(cur_Elm.parentElement.nextElementSibling);
                    }
                    // ?  SECOND LEVEL NEW /OLD PARA TO HEAD 1 OUP_J_ APS_022 - YA 22_MAR_23
                    par_Elm = par_Elm.parentElement;
                }
                //  ? Append current heading level into next siblings before
                if (par_Elm.parentNode) {
                    if (par_Elm.nextElementSibling) {
                        // ? 28_OCT_22 - YA FF_105 OUP_J_ APS_047
                        par_Elm.parentNode.insertBefore(cur_Elm, par_Elm.nextElementSibling);
                    } else {
                        par_Elm.parentNode.appendChild(cur_Elm);
                    }
                }
            }
            // ? DOM Manipulation
            var divList = [];
            const currentChapInfo = IS_JOURNAL ? {
                prefix: ''
            } : getPrefixBooks(par_Elm, 1);
            if (!IS_JOURNAL) {
                divList = currentChapInfo.sub_levels;
            } else {
                divList = $this.iDOM.querySelectorAll(
                    'div.body div.sec[data-levels="1"]:not([sec-type="Back_Matter"],[sec-type="supplementary-material"])'
                );
            }


            if ($this._IsNumberHeadBool || (currentChapInfo.prefix || currentChapInfo.first_level_lab)) {
                $this._IsNumberHeadBool = true;

                let new_prefix = currentChapInfo.prefix || '';
                if (new_prefix.length > 0) {
                    new_prefix += new_prefix.indexOf('.') > -1 ? '' : '.';
                }

                if ($this.M_CONFIG.HEADING.label_suffix) {
                    new_prefix += $this.M_CONFIG.HEADING.label_suffix;
                }

                $this.RE_STRUCTURE(divList, new_prefix);
            }
            _IsDirty = true;
        } else if (styleJSON.class == 'disp-quote') {
            if (!cur_Elm.id) cur_Elm.id = ($this['M_SCOPE'].curElementId == "" ? GENERATE_ID() : $this['M_SCOPE'].curElementId);
            $this.G_FUN.SET_REMOVE_ATTR(cur_Elm, {}, ['content-type', 'data-role']);
            //cur_Elm.removeAttribute('content-type');
            if (par_Elm.className != "disp-quote") {
                if (cur_Elm.nextElementSibling) {
                    cur_Elm.nextElementSibling.setAttribute('content-type', $this['M_CONFIG'].STYLE_CONFIG.P['content-type']);
                }
                var IsPrev_disp = ($this['M_SCOPE'].prevElmClass && $this['M_SCOPE'].prevElmClass == "disp-quote") ? (true) : (false),
                    IsNxt_disp = ($this['M_SCOPE'].nextElmClass && $this['M_SCOPE'].nextElmClass == "disp-quote") ? (true) : (false);
                if (IsPrev_disp || IsNxt_disp) {
                    // (IsPrev_disp?prevElm['appendChild'](curElmDom):nextElm['prepend'](curElmDom));
                    let targetElm = IsPrev_disp ? $this['M_SCOPE'].prevElm : $this['M_SCOPE'].nextElm;
                    if (targetElm) {
                        targetElm[IsPrev_disp ? 'appendChild' : 'prepend'](cur_Elm);
                    }
                } else {
                    // ? set the wrapper as child (instead of the element)
                    par_Elm.replaceChild(newNode, cur_Elm);
                    // ? set element as child of wrapper
                    newNode.appendChild(cur_Elm);
                }
            } else if (par_Elm.className == "disp-quote") {
                cur_Elm = $this.ATTR_HANDLE(cur_Elm, {
                    process: "para"
                });
                // _['G_FUN'].SET_REMOVE_ATTR(cur_Elm, {"data-name": "p","class": "p"})
                //_.removeSetAttribute(curElmDom,{"data-name":"p","class":"p"});
            }
            // ! Dot it later for ranged text apply style.
            /* const elementpath = GlobalEditor.elementPath();
            const selection = GlobalEditor.getSelection();
            const bookMark = selection.createBookmarks(true);
            const startelement = selection.getRanges()[0].startContainer;    
            const endelement = selection.getRanges()[0].endContainer;
            console.log(startelement, endelement);  */
        } else if (styleJSON.class == 'attrib' || styleJSON.class == 'p' && styleJSON['content-type'] == 'source') {
            let InsideExtractPara = par_Elm.className == 'disp-quote';
            if (InsideExtractPara || ($this['M_SCOPE'].prevElmClass == 'disp-quote' && cur_Elm.className == "p")) {
                $this['G_FUN'].SET_REMOVE_ATTR(cur_Elm, styleJSON);
                //_.removeSetAttribute(curElmDom,ApplyStyleJSON);
                if (!cur_Elm.id) {
                    $this['M_SCOPE'].curElementId = cur_Elm.id = GENERATE_ID();
                }
                // ? after para of extract 
                if (!InsideExtractPara && $this['M_SCOPE'].prevElm) {
                    $this['M_SCOPE'].prevElm.appendChild(cur_Elm);
                }
            } else {
                console.warn('MISSING_STYLE');
            }
        } else if (styleJSON.class == 'p') {
            // ? FF_105 - YA - OUP_J_ APS_047
            if ([par_Elm.className, par_Elm.parentElement.className].includes('disp-quote')) {
                cur_Elm = $this.ATTR_HANDLE(cur_Elm, {
                    process: "para",
                    remove: cur_Elm.getAttribute('content-type') == 'source' ? ['content-type'] : []
                });
                let [clone_Para1, clone_Para2, clone_dummy, gParent] = [par_Elm.cloneNode(), par_Elm.cloneNode(), par_Elm.cloneNode(), par_Elm.parentElement];
                let [gParentClass, dispOnePara, setTrack] = [gParent.getAttribute('data-name'), (par_Elm.childElementCount == 1 ? (true) : (false)), false];
                clone_Para2.id = "";
                if (dispOnePara) {

                    $this['G_FUN'].insertAfter(cur_Elm, gParentClass == 'p' ? gParent : par_Elm);
                    par_Elm.childElementCount == 0 && par_Elm.remove(), par_Elm = gParent;
                    setTrack = true;
                } else {
                    // ? In between style applied for different
                    var current_index = Array.from(par_Elm.children).indexOf(cur_Elm);
                    var isLastIndex = current_index == (par_Elm.childElementCount - 1);
                    // ? for first index
                    if (current_index == 0) {
                        setTrack = true;
                        if (par_Elm.parentElement) {
                            par_Elm.parentElement.insertBefore(cur_Elm, par_Elm);
                        }
                    } else if (isLastIndex) {
                        // ? for last index
                        $this['G_FUN'].insertAfter(cur_Elm, par_Elm);
                        // ? In between style applied for different
                    } else
                        var current_index = Array.from(par_Elm.children).indexOf(cur_Elm);
                    var isLastIndex = current_index == (par_Elm.childElementCount - 1);

                    // ? for first index
                    if (current_index == 0) {

                        setTrack = true;

                        if (par_Elm.parentElement) {
                            par_Elm.parentElement.insertBefore(cur_Elm, par_Elm);
                        }

                    } else if (isLastIndex) {

                        // ? for last index
                        $this['G_FUN'].insertAfter(cur_Elm, par_Elm);

                    } else {
                        setTrack = true;
                        // ? middle paragraph of disp-quote
                        let TempElm = cur_Elm;

                        // Create shallow clones
                        let clone_Para1 = par_Elm.cloneNode(false);
                        let clone_Para2 = par_Elm.cloneNode(false);

                        // Prevent duplicate ids
                        clone_Para1.removeAttribute('id');
                        clone_Para2.removeAttribute('id');

                        // Snapshot children before moving nodes
                        const children = Array.from(par_Elm.children);

                        children.forEach((el, ind) => {
                            if (ind < current_index) {
                                clone_Para1.appendChild(el);
                            } else if (ind > current_index) {
                                clone_Para2.appendChild(el);
                            }
                        });

                        TempElm = $this.ATTR_HANDLE(TempElm, {
                            process: "para"
                        });

                        const replaceNodes = [];

                        if (clone_Para1.childElementCount > 0) {
                            replaceNodes.push(clone_Para1);
                        }

                        replaceNodes.push(TempElm);

                        if (clone_Para2.childElementCount > 0) {
                            clone_Para2.id = GENERATE_ID();
                            replaceNodes.push(clone_Para2);
                        }

                        par_Elm.replaceWith(...replaceNodes);
                    }
                }
                if (setTrack) {
                    cur_Elm = $this.ATTR_HANDLE(cur_Elm, {
                        process: "track"
                    });
                }
                if (par_Elm.childElementCount == 1) {
                    // ! do title later

                    // ? more one element
                } else {

                }
            } else if ($this['M_SCOPE'].curElmPar != 'disp-quote') {
                // APPLY STYLE _ DR_02_SEp_2026_COMPARE UPDATE
                ParaGroup.handleContentType(par_Elm);
            }
        }

        _IsDirty = true;

        SET_DATA.setNewData($this.iDOM, {
            DOM_Empty: true,
            reGenerateAll: true,
            cleanHTML: false
        }, cursor_id);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('DomManipulation', err.message);
    }
};
APPLY_STYLE_MODULE.Auto_Generate_Styles_List = function(a, _) {
    try {
        _.Panel.querySelectorAll('span[data-style*="H"]').forEach((element, index) => {
            var new_val = (index == 1) ? ((a == 1 || a == 0) ? (2) : (a)) : ((index == 0) ? ((a == 1 || a == 0) ? (1) : (a - 1)) : ((a == 1 || a == 0) ? (3) : (a + 1)));
            // ? For journals set head-level limit
            if (!IS_JOURNAL)
                _['G_FUN'].setAttr(element, ({
                    "data-Style": "H" + new_val,
                    "data-content": "Heading " + new_val
                }));
            // ? get head-level limit from configuration and disable/hide the option in list
            let canEnable = _['M_CONFIG'].SHOW_CONTEXT_GROUP ? ((_.M_CONFIG.HEAD_LIMIT < new_val) ? false : true) : false;
            element.classList[(canEnable ? 'remove' : 'add')]('disabled');
        });
        console.log('Auto_Generate_Styles_List method done');
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Auto_Generate_Styles_List', err.message);
    }
};
APPLY_STYLE_MODULE.fireStyle = function(b, _ = APPLY_STYLE_MODULE) {
    try {
        if (b.classList.contains('disabled')) return;
        var [StyleCode, newElm, titleElm] = [b.getAttribute('data-Style'), document.createElement('div'), document.createElement('div')];
        let StyleMap = _['M_CONFIG']['STYLE_CONFIG'][StyleCode];
        var newLevel = StyleMap['data-levels'];
        // let nElm = document.createElement('div');
        // let titleElm = document.createElement('div');
        if (StyleMap.class == 'sec' && _['M_SCOPE'].curElement.className == 'title') {
            var curLevel = _.Panel.querySelector('.styleList span.active').getAttribute('data-style');
            curLevel = parseInt(curLevel.substring(1));
            headLvlMod((curLevel > newLevel) ? UP : DOWN);
            return false;
        }
        Object.entries(StyleMap).forEach((entry) => {
            var [key, value] = entry;
            newElm.setAttribute(key, value);
            if (StyleMap.class == 'sec') {
                titleElm.setAttribute(key, (key == 'data-levels') ? (value) : ('title'));
            }
        });
        if (!newElm.id) newElm.id = GENERATE_ID(StyleMap.class == 'sec' ? newLevel : null);
        if (['attrib', 'sec', 'disp-quote', 'p'].includes(StyleMap.class)) {
            // ? If apply heading level
            if (StyleMap.class == 'sec') {
                if (!titleElm.id) titleElm.id = (_['M_SCOPE'].curElementId == "" ? GENERATE_ID() : _['M_SCOPE'].curElementId);
                _['M_SCOPE'].curElementId = titleElm.id;
                newElm.append(titleElm);
            }
            newElm = _.ATTR_HANDLE(newElm, {
                process: "track"
            });
            //_['G_FUN'].setAttr(newElm, {'data-style': 'modified','data-time': (new Date()).getTime(),'data-username': USER_INFO.MAIL_ID});
            _['M_SCOPE'].newElem = newElm;
            _['M_SCOPE'].StyleMap = StyleMap;
            GlobalEditor.execCommand('APPLY_STYLE');
            console.log(_['M_SCOPE'].curElementId);
            //_.setCursor(curElementId); // ? Reset Cursor position
        }
        _['IBOX'].STYLE_LIST.forEach((el, index) => {
            el.classList[el.dataset.style == StyleCode ? 'add' : 'remove']('active');
        });
        console.log('Style Applied');
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('fireStyle', err.message);
    }
};
APPLY_STYLE_MODULE.CheckRule = function(_) {
    try {
        // ? SOURCE_LINE ADD CLASS
        const IS_SOURCE_PARA = function(elm) {
            // ? 28_OCT_22 - YA FF_105 OUP_J_ APS_054
            try {
                return elm && elm.getAttribute("content-type") == "source" ? true : false;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('IS_SOURCE_PARA', err.message);
            }
        };
        _['IBOX'].LAST_STYLE.classList.add('disabled');
        _['M_SCOPE'].prevElm = _['M_SCOPE'].curElement.previousElementSibling;
        _['M_SCOPE'].prevElmClass = (_['M_SCOPE'].prevElm != null) ? (_['M_SCOPE'].prevElm.className) : (null);
        _['M_SCOPE'].nextElm = _['M_SCOPE'].curElement.nextElementSibling;
        _['M_SCOPE'].nextElmClass = (_['M_SCOPE'].nextElm != null) ? (_['M_SCOPE'].nextElm.className) : (null);
        _['IBOX'].STYLE_LIST.forEach((element, index, arrElm) => {
            if (_['M_SCOPE'].IsPara || _['M_SCOPE'].IsHead) {
                if (_['M_SCOPE'].IsPara) {
                    if ((index != 5 && IMPACT_SELECTION.PARENT_CLAS != 'inline-formula' || (_['M_SCOPE'].prevElmClass == 'disp-quote' && index == 5)) && !_['M_SCOPE'].LIST_ELM && ![IMPACT_SELECTION.G_PARENT_CLAS, IMPACT_SELECTION.PARENT_CLAS].includes('table-wrap-foot')) {
                        element.classList.remove('disabled');
                    } else {
                        element.classList.add('disabled');
                    }
                    if (index < 3) {
                        _.headLevelValidation(element, index, _);
                    }
                } else if (_['M_SCOPE'].curElmClass == 'title') {
                    var curSec = _['M_SCOPE'].curElement.parentElement,
                        curPar = curSec.parentElement;
                    var curLevel = parseInt(curSec.getAttribute("data-levels"));
                    // ? Up||Down enable based on index;
                    var curInd = Array.prototype.indexOf.call($(curPar).find('div.sec'), curSec);
                    var CanApplyHigher = CanApplyDown = false;
                    $(curSec).prevAll().each(function(index, el) {
                        if (['sec', 'p', 'disp-quote'].includes(el.className)) {
                            if ((curInd != 0) && _.M_CONFIG.HEAD_LIMIT >= curLevel) {
                                if (curSec.querySelector('.p')) CanApplyDown = true;
                                /* $.each(mChild, function (ind, node) {
                                    if (this.className == 'p') {
                                        CanApplyDown = true;
                                    }
                                }); */
                                // ? Hide function up
                            }
                            CanApplyHigher = true;
                        }
                    });
                    if (element.classList.contains('active')) return;
                    if (index != 5) element.classList.remove('disabled');
                    // ? here enable the option based on the head level
                    var iClass = "";
                    if (!_['M_CONFIG'].SHOW_CONTEXT_GROUP || (index > 2)) {
                        iClass = 'disabled';
                    } else if (index < 3) {
                        if (index == 0 && (curLevel == 1 || !CanApplyHigher)) {
                            iClass = 'disabled';
                        } else if (index == 1 && ((curLevel == 1 && !CanApplyDown) || (curLevel != 1 && !CanApplyHigher))) {
                            // ? YA - 22_MAR_23 - OUP_J_ APS_024 - KT_QA_AK_LWW_Demo_Regression testing
                            iClass = 'disabled';
                        } else if ((index == 2 && (curLevel == 1 || !CanApplyDown))) {
                            iClass = 'disabled';
                        }
                    }
                    if (iClass) element.classList.add(iClass);
                    // ? DISABLED HEAD-LEVEL BASED ON CONFIG
                }
            } else if (_['M_SCOPE'].IsExtractPara) {
                var style = _['M_CONFIG']['STYLE_CONFIG'][element.getAttribute('data-Style')];
                if (['p', 'attrib'].includes(_['M_SCOPE'].curElmClass)) {
                    var CanShow = ['p', 'attrib', 'disp-quote'].includes(style.class);
                    // ? 28_OCT_22 - YA FF_105 OUP_J_ APS_054
                    if (style.class == 'p' && IS_SOURCE_PARA(_['M_SCOPE'].nextElm)) CanShow = false;
                    element.classList[CanShow ? 'remove' : 'add']('disabled');
                    //  ? Handle getCursorPosition
                    if ((index == 5) && ((_['M_SCOPE'].curElmPar.childElementCount == 1))) {
                        // ? 29-Apr-22 YA
                        // let IsSource = _['M_SCOPE'].curElmPar.firstElementChild.hasAttribute("content-type");
                        if (IS_SOURCE_PARA(_['M_SCOPE'].curElmPar.firstElementChild)) {
                            element.classList.add('active');
                        } else element.classList.add('disabled');
                    }
                }
            }
        });
        console.log('Check rule method done');
        return false;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('CheckRule', err.message);
    }
};
APPLY_STYLE_MODULE.headLevelValidation = function(item, index, _) {
    try {
        var noHeadPara = _['M_SCOPE'].curElmParClass == 'body' ? (true) : (false),
            curParElmChildCount = _['M_SCOPE'].curElmPar.querySelectorAll('.p').length,
            IsHeadPara = _['M_SCOPE'].curElmParClass == 'sec' ? true : false;
        var curHeadLevel = _['M_SCOPE'].curElmPar.hasAttribute('data-levels') ? _['M_SCOPE'].curElmPar.getAttribute('data-levels') : null;
        var collectionChildren = Array.from(_['M_SCOPE'].curElmPar.querySelectorAll(".p")).filter(node => node.parentNode === _['M_SCOPE'].curElmPar);
        var firstPara = collectionChildren.length > 0 ? collectionChildren[0] : null;
        var lastPara = collectionChildren.length > 0 ? collectionChildren[collectionChildren.length - 1] : null;
        var IsLastPara = lastPara == _['M_SCOPE'].curElement;
        var IsFirstPara = firstPara == _['M_SCOPE'].curElement;
        var IsMidPara = !IsLastPara && !IsFirstPara;
        var ApplyStyle_Level = item.getAttribute('data-style');
        let IgnoreStyle = _['G_FUN'].Duplicate_Array(['graphic', 'OL', 'UL'], [_['G_SCOPE']['IMS'].PARENT_CLAS, _['G_SCOPE']['IMS'].NODE_CLAS, _['G_SCOPE']['IMS'].PARENT_TAG], {
            find: true,
            bool: true
        }) ? true : false;
        // ? end of assigning
        ApplyStyle_Level = ApplyStyle_Level.charAt(0) === 'H' && ApplyStyle_Level.slice(1);
        if (!_['M_CONFIG'].SHOW_CONTEXT_GROUP || IgnoreStyle) {
            item.classList.add('disabled');
        } else if ((index != 0 && noHeadPara) || (IsHeadPara && IsLastPara)) {
            // ? Body first para without head and last para of section, Author HEAD-LEVEL hide
            item.classList.add('disabled');
        } else if (IsHeadPara) {
            let diffCount = ApplyStyle_Level - curHeadLevel;
            curParElmChildCount = $(_['M_SCOPE'].curElmPar).children(".p").length;
            let SinglePara = curParElmChildCount < 2;
            if (IsFirstPara && ((curHeadLevel == ApplyStyle_Level || diffCount != 1) || (diffCount == 1 && SinglePara))) {
                // ? Same head and Single para group disabled
                item.classList.add('disabled');

            } else if (IsMidPara && ![-1, 0, 1].includes(diffCount)) {
                // ? In between para
                item.classList.add('disabled');
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('headLevelValidation', err.message);
    }
};
APPLY_STYLE_MODULE.getCursorPosition = function(Panel, _) {
    try {
        if (['p', 'sec', 'title', 'extract', 'attrib'].includes(_['M_SCOPE'].curElmClass) && !_['M_SCOPE'].RESTRICT_CLASS.includes(_['M_SCOPE'].curElmParClass || !!_['M_SCOPE'].curElmPar.nodeName && _['M_SCOPE'].curElmPar.nodeName.toLowerCase())) {
            if (['attrib', 'p'].includes(_['M_SCOPE'].curElmClass) && !['title'].includes(_['M_SCOPE'].curElmParClass)) {
                if (_['M_SCOPE'].curElmClass == 'p' && _['M_SCOPE'].curElmParClass != 'disp-quote' && !_['M_SCOPE'].LIST_ELM) {
                    _.activeStyle = Panel.querySelector('[data-style="P"]');
                    [_['M_SCOPE'].IsHead, _['M_SCOPE'].IsExtractPara, _['M_SCOPE'].IsPara] = [false, false, true];
                    // _['M_SCOPE'].IsPara = true;_['M_SCOPE'].IsExtractPara = false;
                } else if (['p', 'attrib'].includes(_['M_SCOPE'].curElmClass) && _['M_SCOPE'].curElmParClass == 'disp-quote') {
                    [_['M_SCOPE'].IsHead, _['M_SCOPE'].IsExtractPara, _['M_SCOPE'].IsPara] = [false, true, false];
                    // _['M_SCOPE'].IsHead = false;_['M_SCOPE'].IsPara = false;_['M_SCOPE'].IsExtractPara = true;
                    let find = _['M_SCOPE'].curElmClass == 'attrib' || (_['M_SCOPE'].curElmClass == 'p' && _['M_SCOPE'].curElement.getAttribute('content-type') == "source") ? ("SOURCE") : ("EXTRACT");
                    _.activeStyle = Panel.querySelector(`[data-style=${find}]`);
                }
                var head_lvl = _['M_SCOPE'].curElmPar.getAttribute('data-levels') || ((_['M_SCOPE'].curElmParClass != 'body') ? 1 : (0));
                _.Auto_Generate_Styles_List(parseInt(head_lvl), _);
            } else if (_['M_SCOPE'].curElmClass == 'title' && _['M_SCOPE'].curElmParClass == 'sec') {
                var head_lvl = _['M_SCOPE'].curElement.getAttribute('data-levels');
                _.Auto_Generate_Styles_List(parseInt(head_lvl), _);
                _.activeStyle = Panel.querySelector(`[data-style="H${head_lvl}"]`);
                // _['M_SCOPE'].IsHead = true;_['M_SCOPE'].IsPara = false;_['M_SCOPE'].IsExtractPara = false;
                [_['M_SCOPE'].IsHead, _['M_SCOPE'].IsExtractPara, _['M_SCOPE'].IsPara] = [true, false, false];
            }
            if ((_['M_SCOPE'].curElement).isEqualNode(_['M_SCOPE'].LAST_SEL_ELM)) {
                if (_.activeStyle) _.activeStyle.classList.add('active');
                _.CheckRule(_);
                return;
            } else {
                _['IBOX'].STYLE_LIST.forEach((el, ind) => {
                    if (_.activeStyle) {
                        ind == 0 && _.activeStyle.classList.add('active');
                        if (el.classList.contains('active') && _.activeStyle.parentElement.id != el.parentElement.id) {
                            el.classList.remove('active');
                        }
                        (ind != 5) && (el.classList.remove('disabled'));
                    } else {
                        el.classList.add('disabled');
                    }
                });
                _['M_SCOPE'].LAST_SEL_ELM = _['M_SCOPE'].curElement;
                _.CheckRule(_);
            }
        } else {
            _['IBOX'].STYLE_LIST.forEach((el, ind) => {
                el.classList.add('disabled');
            });
        }
        console.log('Cursor position Method Done');
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getCursorPosition', err.message);
    }
};
APPLY_STYLE_MODULE.initLoop = function(param1, _) {
    try {
        this._IsNumberHeadBool = false;
        this.M_CONFIG.HEAD_LIMIT = parseInt(GET_TYPE_CONFIG_QUERY('heading', 'maximum', {
            journalBased: true
        }));
        this['M_CONFIG'].HEADING = this['G_FUN'].GET_CONFIG_ITEM(`heading`, {
            CONVERT_JSON: true,
            attr: true,
            children: true,
            keyUpperCase: true,
            journalBased: true
        });
        this['M_CONFIG'].STYLE_CONFIG = this['G_FUN'].GET_CONFIG_ITEM("styles", {
            CONVERT_JSON: true,
            children: true,
            keyUpperCase: true
        });
        this['M_CONFIG'].SHOW_CONTEXT_GROUP = IsContextMenu('headgroup');
        // ? role based enable | disable - YA/DR 16_MAY-2023
        if (!this['M_CONFIG'].SHOW_CONTEXT_GROUP && (GET_TYPE_CONFIG_QUERY("heading", "notallowed") == "yes")) {
            this['M_CONFIG'].SHOW_CONTEXT_GROUP = true;
        }
        this['M_SCOPE'].LAST_SEL_ELM = null;
        this['M_SCOPE'].RESTRICT_CLASS = ['caption', 'boxed-text', 'fig', 'td', 'tr', 'disp-formula', 'inline-formula'];
        this['M_SCOPE'].LABEL_SELECTOR = ['.title[data-label]', '.title>.label'].map(el => 'div.body div.sec ' + el).join(",");
        this['IBOX'].STYLE_LIST = this.Panel.querySelectorAll('span.iStyle');
        this['IBOX'].LAST_STYLE = this.Panel.querySelector('#li6');
        this['IBOX'].STYLE_LIST.forEach(el => {
            el.onclick = function(e) {
                try {
                    if (e.currentTarget.className.match(/active|disabled/)) {
                        debug.log('not allowed');
                    } else APPLY_STYLE_MODULE.fireStyle(e.currentTarget);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('el.onclick', err.message);
                }
            };
        });
        let btn = document.querySelector('#menuapplystyle a');
        if (btn) btn.setAttribute('onclick', "APPLY_STYLE_MODULE.show();");
        this.DOM_ID = "APPLY_STYLE_DOM";
        // ? 26_APR_2023 - YA
        if (!this._IsNumberHeadBool) {
            this._IsNumberHeadBool = this.M_CONFIG.HEADING.numbered == "yes";
        }
        if (!IS_JOURNAL) {

        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('APPLY_STYLE_MODULE_initLoop', err.message);
    }
};
APPLY_STYLE_MODULE.showLoop = function(param1, param2, param3, _) {
    _ = APPLY_STYLE_MODULE;
    try {
        this['M_SCOPE'].cursorGroup = GlobalEditor.elementPath();
        var IsBodyElement = null;
        var isFmApplyStyleAllowed = false;
        if (!this['M_SCOPE'].cursorGroup) {
            /* this.STYLE_LIST.forEach((el) => {
                el.classList.add('disabled');
                el.classList.remove('active');
            });            
            TOASTER_ALERT('InvalidCursor',{type:'warning'});
            return false; */
        } else {
            this['M_SCOPE'].curElement = (this['M_SCOPE'].cursorGroup.block != null) ? (this['M_SCOPE'].cursorGroup.block.$) : (this['M_SCOPE'].cursorGroup.blockLimit.$);
            this['M_SCOPE'].curElmClass = this['M_SCOPE'].curElement.className;
            this['M_SCOPE'].curElmPar = this['M_SCOPE'].curElement.parentElement;
            this['M_SCOPE'].curElmParClass = this['M_SCOPE'].curElement.parentElement.className;
            this['M_SCOPE'].LIST_ELM = this['M_SCOPE'].curElement.tagName == 'LI';
            this['M_SCOPE'].curElementId = this['M_SCOPE'].curElement ? this['M_SCOPE'].curElement.id : "";
            IsBodyElement = ($(this['M_SCOPE'].curElement).parents('.body').length > 0) ? (true) : (false);
            var isFmApplyStyleAllowed = !IS_JOURNAL && EDITOR_CURSOR.IS_FRONT_PARA &&
                this['M_SCOPE'].curElmClass === 'p' &&
                GET_TYPE_CONFIG_QUERY('p', 'notallowed', {
                    journalBased: true
                }) !== 'yes' &&
                IsContextMenu('ApplyStyleDialog');
        }
        // ? ADD THE DISABLED STATE FOR CAPTION, Figure, List
        let IsCaption = this['G_FUN'].Duplicate_Array(this['M_SCOPE'].RESTRICT_CLASS, [this['M_SCOPE'].curElmParClass, this['M_SCOPE'].curElmClass, this['G_SCOPE']['IMS'].PARENT_CLAS], {
            find: true,
            bool: true
        }) ? true : false;
        var IsValidBool = (this['M_SCOPE'].cursorGroup && (IsBodyElement || isFmApplyStyleAllowed)) ? true : false;
        this['IBOX'].STYLE_LIST.forEach((el) => {
            el.classList.remove('active');
            el.classList[IsValidBool && !IsCaption ? 'remove' : 'add']('disabled');
        });
        if (IsValidBool) this.getCursorPosition(this.Panel, this);
        else {
            if (!this['M_SCOPE'].cursorGroup) TOASTER_ALERT('InvalidCursor', {
                type: 'warning'
            });
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('APPLY_STYLE_MODULE_SHOW_LOOP', err.message);
    }
};
var get_lab_text = function(root, Options = {}) {
    try {
        if (Options.title) return getTxt(root.querySelector(".title")) || "";
        return getTxt(root.querySelector('.label')) || $(root).children('.title').attr('data-label') || "";
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('get_lab_text', err.message);
    }
};
var getPrefixBooks = function(SEC, CUR_LEVEL) {
    var returnObject = {
        first_level_lab: "",
        chapter_lab: "",
        prefix: "",
        lab_count: 0,
        all_count: 0
    };
    try {
        let chap_root = SEC.closest('.book-part'),
            titleGroup = chap_root.querySelector('.book-part-meta .title-group'),
            chap_label = get_lab_text(titleGroup),
            first_lvl_arr = CUR_LEVEL == 1 ? chap_root.querySelectorAll(`div.body div.sec[data-levels="${CUR_LEVEL}"]`) : SEC.querySelectorAll(`div.sec[data-levels="${CUR_LEVEL}"]`),
            sibling_lvl_arr = CUR_LEVEL == 1 ? [] : SEC.parentElement.querySelectorAll(`div.sec[data-levels="${CUR_LEVEL}"]`),
            first_lvl_div = first_lvl_arr[0],
            first_lvl_lab = get_lab_text(first_lvl_div),
            prefix = "";
        if (chap_label && first_lvl_lab) {
            if (chap_label != first_lvl_lab) {
                let chap_split = "";
                let head_lab_split = first_lvl_lab.split(".");
                let isPrefixThere = head_lab_split.length > 1;
                if (/[a-zA-Z]/gi.test(chap_label)) {
                    if (/\s/.test(chap_label)) chap_split = chap_label.split(" ");
                    if (chap_split[chap_split.length - 1] == head_lab_split[0]) {
                        // ? Chapter lable = Part 1, head label = 1.1
                        prefix = head_lab_split[0];
                    }
                } else prefix = isPrefixThere ? head_lab_split[0] : "";
            }
        }
        // ? finally assigning
        returnObject.root = chap_root;
        returnObject.sub_levels = first_lvl_arr;
        returnObject.first_level_lab = first_lvl_lab;
        returnObject.chapter_lab = chap_label;
        returnObject.prefix = prefix;
        returnObject.all_count = first_lvl_arr.length;
        returnObject.lab_count = Array.from(first_lvl_arr).reduce((accumulator, sec) => {
            if (!returnObject[CUR_LEVEL]) returnObject[CUR_LEVEL] = {};
            let lab = get_lab_text(sec);
            returnObject[CUR_LEVEL][sec.id] = {
                lab: lab,
                label: lab,
                title: get_lab_text(sec, {
                    title: !0
                })
            };
            return accumulator + (lab ? 1 : 0);
        }, 0);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getPrefixBooks', err.message);
    } finally {
        return returnObject;
    }
};
async function headLvlMod(type, editor, $this = APPLY_STYLE_MODULE) {

    if (window.paraLock && window.paraLock.getLockedElementsByOthers) {
        const lockedInfo = window.paraLock.getLockedElementsByOthers();
        if (lockedInfo.byOthers.length > 0) {
            TOASTER_ALERT('ErrorReStoreForCollab', {
                type: 'warning'
            });
            return;
        }
    }

    // ? Apply Style/ Head level Change Start 
    var headlvlAppend = function(node, nodeList, level) {
        // ? node = Curr Node || nodeList = Appending Collation || level = Head-level
        if (!node || !nodeList) {
            console.warn('headlvlAppend: Invalid node or nodeList');
            return;
        }
        Array.from(nodeList).forEach(elm => {
            if (/sec/gi.test(elm.className) && level == (elm.getAttribute('data-levels'))) {
                // ? here append subheads in same div
                if (node) $(node).append(elm);
            }
        });
    };
    var ChangeLvlSubhead = function(node) {
        if (!node) {
            console.warn('ChangeLvlSubhead: Invalid node');
            return;
        }
        Array.from(node).forEach((elm, idx, arr) => {
            if (elm.className != undefined && elm.className == 'sec') {
                var [oLvl, childCollection, _childHeadLvl] = [$(elm).attr('data-levels'), $(elm).children(), $(elm).find('div.sec')];
                var nlvl = parseInt(oLvl) - 1;
                $(elm).attr({
                    'old-lvl': oLvl,
                    'data-levels': nlvl
                }).find('div.title').attr({
                    'old-lvl': oLvl,
                    'data-levels': nlvl
                });
                if (childCollection.length > 0 && _childHeadLvl.length > 0) {
                    ChangeLvlSubhead(childCollection);
                }
            }
        });
    };
    // ? Start Here
    if (!editor) editor = GlobalEditor;
    AutoSaveBool = false;
    var _curSel = editor.getSelection().getStartElement(),
        hSec = _curSel.$.closest('div.sec'),
        hWhile = 0;
    while ((hSec.className != 'sec')) {
        // ? Get Ascent div element here until title
        hSec = hSec.closest('div');
        if (hWhile == 10) {
            break;
        } else {
            hWhile++;
        }
    }
    // if (IS_LOCAL_HOST) debugger;
    var [hSecId, gData, REPLACE_DIV, REPLACE_DIV_ID] = [hSec.getAttribute('id'), editor.getData(), false, false];
    if (EDITOR_CURSOR.CUR_CHAPTER) {
        gData = EDITOR_CURSOR.CUR_CHAPTER_DATA;
        REPLACE_DIV = true;
        REPLACE_DIV_ID = EDITOR_CURSOR.CUR_CHAPTER.id;
    }
    $($this.iDOM).html('').append(gData);
    var _curElm = $this.iDOM.querySelector('[id="' + hSecId + '"]'),
        _curElmLvl = parseInt(_curElm.getAttribute('data-levels')),
        _parElm = _curElm.parentNode,
        _parElmLvl = parseInt(_parElm.getAttribute('data-levels')),
        _nxtElm = $(_curElm).nextAll(),
        _prvElm = $(_curElm).prev(),
        _childElm = $(_curElm).children(),
        _childHeadElm = $(_curElm).find('div.sec'),
        _nElm = document.createElement('div'),
        _nLvl;
    // ? TODO  _childHeadElm update later for DOC_DTD wise
    // ? Here move the elements as per request    
    if (type == UP || type == DOWN) {
        if (type == UP) {
            if (_nxtElm.length > 0) {
                // ? node = Curr Node || nodeList = Appending Collation || level = Head level t cross-check
                headlvlAppend(_curElm, _nxtElm, _curElmLvl);
            }
            if (_childElm.length > 0) {
                // ? Changing the sub head level attribute
                ChangeLvlSubhead(_childElm);
            }
            _nLvl = _parElmLvl;
        } else {
            _nLvl = _curElmLvl + 1;
            // ? node = Curr Node || nodeList = Appending Collation || level = Head level to cross-check
            if (_childElm.length > 0 && _childHeadElm.length > 0) {
                headlvlAppend(_nElm, _childElm, _nLvl);
            }
        }
        // ? bug fixed at 22-mar-2022
        $(_curElm).attr({
            'old-lvl': _curElmLvl,
            'data-levels': _nLvl,
            'data-head-level': 'changed',
            'data-track-code': 'head-style-01',
            'data-username': USER_INFO.MAIL_ID,
            'data-rolename': ((USER_INFO.IS_CO_ROLE ? 'Co-' : '') + USER_INFO.ROLE_NAME),
            'data-time': (new Date()).getTime()
        }).children('div.title').attr({
            'old-lvl': _curElmLvl,
            'data-levels': _nLvl
        });
        if (type == UP) {
            if (_curElm) $(_curElm).insertAfter(_parElm);
        } else {
            if (_nElm) $(_nElm).prepend(_curElm);
            if (_prvElm) $(_prvElm).append(_nElm.innerHTML);
        }
    } else if (type == ADD || type == DELETE) {
        let _confirm = (await IMPACT_ALERT((type == ADD) ? 'headleveladd001' : 'headleveldel002'));
        if (_confirm) {
            if (type == ADD) {
                let first_Child_Id = $(_parElm).find('div.sec:eq(0)').attr('id');
                let Is_first_Child = (first_Child_Id == hSecId) ? (true) : (false);
                let _mySting = CreateStringHead(_curElmLvl, Is_first_Child);
                if (_mySting && _curElm) {
                    $(_mySting).insertBefore($(_curElm));
                }
            } else if (type == DELETE) {

            }
        }
    }
    var divList = [],
        prefix = "",
        suffix = "";
    if (!$this._IsNumberHeadBool) $this._IsNumberHeadBool = $this.iDOM.querySelectorAll($this.M_SCOPE.LABEL_SELECTOR).length > 0 ? true : false;
    if (!IS_JOURNAL) {
        let rObj = getPrefixBooks(_parElm, 1);
        prefix = rObj.prefix;
        divList = rObj.sub_levels;
        $this._IsNumberHeadBool = prefix ? !0 : !1;
    }
    if ($this._IsNumberHeadBool) {
        // ? YA 22_MAR_-23 -NUMBER HEADING LABEL HANDLE
        if (IS_JOURNAL) divList = $this.iDOM.querySelectorAll('div.body div.sec[data-levels="1"]:not([sec-type="Back_Matter"],[sec-type="supplementary-material"])');
        prefix = (prefix.length > 0 ? prefix + (prefix.indexOf(".") > -1 ? '' : '.') : prefix);
        $this.RE_STRUCTURE(divList, prefix /* , suffix */ );
    }
    _IsDirty = false;
    SET_DATA.setNewData($this.iDOM, {
        DOM_Empty: true,
        reGenerateAll: true,
        replace_div: REPLACE_DIV,
        replace_div_id: REPLACE_DIV_ID
    }, hSecId);
    AutoSaveBool = true;
    editor.focus();
}