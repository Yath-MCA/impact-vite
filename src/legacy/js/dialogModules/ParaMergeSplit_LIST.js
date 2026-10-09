var ParaGroup = {
    FLUSH_CONTENT_TYPES: ['flush-left', 'flush left'],
    ALL_CONTENT_TYPES: ['flush-left', 'flush left', 'indent'],
    RETAIN_CONTENT_TYPES: ['source'],
    NO_CONTENT_TYPES_ELM_CLS: ['disp-quote'],
    initiated: false,
    FullyLoaded: false,
    getFragMent: function(_String) {
        try {
            return document.createRange().createContextualFragment(_String);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getFragMent', err.message);
        }
    },
    Init: function(type) {
        try {
            // this.IMS = IMPACT_SELECTION;
            // if (!this.ePath) this.ePath = GlobalEditor.elementPath();
            // this.Merge_fire(type);
            // this.IMS._SNAPSHOT({
            //     save: true
            // });
            // GlobalEditor.focus();
            this.M_CONFIG = {};
            this.M_SCOPE = {};
            this.M_CONFIG.SHOW_CONTEXT_GROUP = IsContextMenu('ParaGroup');
            this.editorListener();
            this.FullyLoaded = this.initiated = true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ParaGroup-Init', err.message);
        }
    },
    FIRE_ONCE: function(type) {
        try {
            this.IMS = IMPACT_SELECTION;
            if (!this.ePath) this.ePath = GlobalEditor.elementPath();
            this.Merge_fire(type);
            this.IMS._SNAPSHOT({
                save: true
            });
            GlobalEditor.focus();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_ONCE', err.message);
        }
    },
    Merge_fire: function(type) {
        try {
            var [CUR_PARA, InnerEle, USER, IS_PREV_MERGE] = [null, null, null, (type == "prev" ? true : false)];
            CUR_PARA = (this.ePath != null) ? (this.ePath.block != null) ? (this.ePath.block.$) : (this.ePath.blockLimit.$) : null;
            var [PREV_PARA, NXT_PARA] = [CUR_PARA.previousElementSibling, CUR_PARA.nextElementSibling];
            // NXT_PARA = CUR_PARA.nextElementSibling;
            CUR_PARA.querySelectorAll('[data-name="attributepistart"], [data-pistartid]').forEach(Ele => {
                Ele.remove();
                console.log("PIs Removed");
            });
            var [ACTION_NODE, REVERSE_NODE, APPEND_NODE] = [(IS_PREV_MERGE ? PREV_PARA : NXT_PARA), (IS_PREV_MERGE ? PREV_PARA : CUR_PARA), (IS_PREV_MERGE ? CUR_PARA : NXT_PARA)];
            InnerEle = CUR_PARA.innerHTML;
            USER = APPEND_NODE.getAttribute("data-username");
            // ? VICE-VERSA CONDITION CHECKING - 13_OCT_YA
            if (REVERSE_NODE.hasAttribute("data-split-parent")) {
                if (APPEND_NODE.hasAttribute("data-split-child") && APPEND_NODE.getAttribute("data-parent-id") == REVERSE_NODE['id']) {
                    if (USER == USER_INFO.MAIL_ID) {
                        // ? SAME USER REJECT/MERGE
                        commonMethods.SET_REMOVE_ATTR(REVERSE_NODE, null, ["data-split-parent"]);
                        REVERSE_NODE.appendChild(APPEND_NODE);
                        $(APPEND_NODE).replaceWith(APPEND_NODE.childNodes);
                        return;
                    } else {
                        // ? BY ANOTHER USER

                    }
                }
            }
            //? Added of split and Reject retain the same id
            const paraId = CUR_PARA.getAttribute('data-para-id');
            const targetId = CUR_PARA.getAttribute('data-target-id');
            let optionalAttrs = (paraId ? ` data-para-id_old="${paraId}"` : '') + (targetId ? ` data-target-id_old="${targetId}"` : '');

            var SPACE_SPAN = this.getFragMent(`<span title="Para Merge" data-space-id="${CUR_PARA.id}">&#x00A0;</span>`);
            let newFrag = this.getFragMent(`<span data-old-id="${CUR_PARA.id}" data-content-type="${CUR_PARA.getAttribute('content-type')}" data-old-name="${CUR_PARA.getAttribute('data-name')}" data-old-class="${CUR_PARA.className}" data-para-merge="${type}" data-track-code="para-merge-01" merge-id="${GENERATE_ID()}" data-time="${(new Date()).getTime()}" data-username="${USER_INFO.MAIL_ID}" data-id="${ACTION_NODE.id}" data-rolename= "${USER_INFO.TRACK_ROLE_NAME}" ${optionalAttrs}>${InnerEle}</span>`);
            CUR_PARA.remove();
            newFrag.querySelector(`span[data-old-id="${CUR_PARA.id}"]`)[IS_PREV_MERGE ? 'prepend' : 'appendChild'](SPACE_SPAN);
            ACTION_NODE[IS_PREV_MERGE ? 'appendChild' : 'prepend'](newFrag);
            debug.log("Para Merged " + type);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Para_Merge', err.message);
        }
    },
    handleContentType: function(Elm, Option) {
        Option = (Option ? Option : ({
            IsSplit: false
        }));
        try {
            if (!Option.CheckIsFlush) {
                IMPACT_SELECTION._SNAPSHOT({
                    save: true
                });
            }
            //?T&F_B_PAR_003 Indent Issue Fixed by DR || Add condition in Journals also OUP_J_XML_262 by DR_20_12_22
            let Temp_Elm = (Elm.$ ? Elm.$ : (Elm[0] ? Elm[0] : Elm)),
                type = Temp_Elm.getAttribute('content-type'),
                IsFlush = this.FLUSH_CONTENT_TYPES.includes(type) ? true : (type == null || type == 'indent' || type == "") ? false : true;
            if (Option.IsSplit) {
                let prev = Option.prev.$.getAttribute('content-type'),
                    prev_parent = Option.prev.$.parentElement,
                    prev_parent_ct = prev_parent.getAttribute('data-name');
                if (this.RETAIN_CONTENT_TYPES.includes(prev)) {
                    Temp_Elm.setAttribute('content-type', prev);
                    return false;
                } else if (this.NO_CONTENT_TYPES_ELM_CLS.includes(prev_parent_ct)) {
                    Temp_Elm.removeAttribute('content-type');
                    return false;
                }
            } else if (Option.CheckIsFlush) {
                return IsFlush;
            } else {
                if (IsFlush) {
                    Temp_Elm[IS_JOURNAL ? 'setAttribute' : 'removeAttribute']('content-type', 'indent');
                } else {
                    Temp_Elm.setAttribute('content-type', IS_JOURNAL ? 'flush left' : 'flush-left');
                }
                var PI = Temp_Elm.querySelectorAll(".attributepistart");
                if (IS_JOURNAL && PI.length) {
                    PI[0].setAttribute('content-type', IsFlush ? 'indent' : 'flush left');
                }
                IMPACT_SELECTION._SNAPSHOT({
                    save: true
                });
                GlobalEditor.focus();
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('handleContentType', err.message);
        }
    },
    Split: function(f, h) {
        try {
            IMPACT_SELECTION._SNAPSHOT({
                lock: true
            });
            if (!!f && !!h) {
                if (f.hasAttribute("data-insert-para") && f.getAttribute("data-username") == USER_INFO.MAIL_ID) {

                } else {
                    f.setAttribute('data-split-parent', 'yes');
                    h.setAttributes({
                        "id": GENERATE_ID(),
                        'data-split-child': 'yes',
                        'data-track-code': 'para-split-01',
                        'data-parent-id': f.getAttribute('id'),
                        'data-time': (new Date()).getTime(),
                        'data-username': USER_INFO.MAIL_ID,
                        'data-rolename': (USER_INFO.TRACK_ROLE_NAME)
                    });
                    h.removeAttributes(['data-para-id', 'data-target-id']);
                }
                this.handleContentType(h, {
                    IsSplit: true,
                    prev: f
                });
                if (f.$.lastChild.tagName == "BR") {
                    // ? 10_OC_SIVA_SRINI_POINT -> SHOW SYMBOL END OF THE PARA
                    f.$.removeChild(f.$.lastChild);
                }
            }
            IMPACT_SELECTION._SNAPSHOT({
                unlock: true
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Para_Split', err.message);
        }
    },
    get_para_dom: function() {
        try {
            return this.getFragMent(`<div class="p" data-name="p" content-type="flush left" id="${GENERATE_ID()}" data-insert-para="yes" data-track-code="para-insert-01" data-time="${(new Date()).getTime()}" data-username="${USER_INFO.MAIL_ID}"><br></div>`);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('get_para_dom', err.message);
        }
    },
    insert_para: function(node, Options = {
        insert: "after"
    }) {
        try {
            if (!this.IMS) this.IMS = IMPACT_SELECTION;
            let para = this.get_para_dom();
            this.IMS._SNAPSHOT({
                save: true
            });
            node.$[Options.insert](para);
            this.IMS._SNAPSHOT({
                save: true
            });
            debug.log("para inserted");
            this.IMS.getInfo(GlobalEditor);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('insert_para', err.message);
        }
    }
};
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

                var [IMS, $this] = [IMPACT_SELECTION, ParaGroup];
                if (!$this.FullyLoaded) {
                    $this.Init();
                }
                if (!$this.M_CONFIG.SHOW_CONTEXT_GROUP) {
                    return false;
                }
                var curSelElm = (elementPath.block != null) ? (elementPath.block.$) : (elementPath.blockLimit.$);
                var range = selection.getRanges()[0];
                range.collapse(true);

                let clasItems = IMPACT_SELECTION.PARENTS_CLAS_LIST.toString();
                let IsRestricted = /xref|graphic|formula|ext-link|email/.test(clasItems);
                let nextNode = range.getNextEditableNode();
                var TextLen = selection.getSelectedText() ? selection.getSelectedText().length : 0;

                if (!IsRestricted && (nextNode && nextNode.$.nodeName != 'A')) {
                    var PARA_GROUP = {};
                    if (curSelElm.className == P && EDITOR_CURSOR.IS_PURE_PARA) {
                        showNoteBool = IMPACT_SELECTION.RG_INFO.divCount == 0 ? true : false;
                        var IsFlush = ParaGroup.handleContentType(curSelElm, {
                            CheckIsFlush: true
                        });

                        var suffix = (IsFlush) ? ('Add') : ('Remove');
                        var [prev, next] = [curSelElm.previousElementSibling, curSelElm.nextElementSibling];

                        var IsBeforePara = (!prev) ? (false) : (prev.className == P);
                        var IsAfterPara = (!next) ? (false) : (next.className == P);
                        var IsFirstPara = !IsBeforePara ? (!prev ? true : (prev.className == 'title' ? true : false)) : (prev && ['title', 'fig', 'table-wrap'].includes(prev.getAttribute('data-name')) ? true : false);

                        if (typeof ParaGroup != "undefined") {
                            ParaGroup.ePath = elementPath;
                        }

                        GlobalEditor.addMenuItems({
                            changecontentType: {
                                label: `${suffix} indent on first line`,
                                onClick: function() {
                                    ParaGroup.handleContentType(curSelElm);
                                },
                                group: 'ParaGroup',
                                icon: '../assets/images/svg/ContextMenu/Add.svg',
                                order: 101
                            }
                        });

                        if (!IMPACT_SELECTION.IsList /* && !IsTable && !IsExract && !IsFigure && Area === 1 */ ) {
                            if ($this.M_CONFIG.SHOW_CONTEXT_GROUP) {
                                PARA_GROUP.MergeBeforePara = (IsBeforePara && !!prev) ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
                                PARA_GROUP.MergeAfterPara = (IsAfterPara && !!next) ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
                            }
                            if (IsContextMenu('changecontentType')) {
                                PARA_GROUP.changecontentType = (IsFirstPara) ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF;
                            }
                        }
                    }
                }
                return PARA_GROUP;
            });
        }
    });
});
ParaGroup.editorListener = function(editor, _ = ParaGroup) {
    try {
        if (!editor) editor = (GlobalEditor ? GlobalEditor : CKEDITOR.instances.maineditor);
        var menuGroup = editor._.menuGroups;
        if (!menuGroup.ParaGroup) {
            editor.addMenuGroup('ParaGroup', 100);
        }
        ['PARAGROUP_PREV', 'PARAGROUP_NEXT'].forEach(CMD => {
            GlobalEditor.addCommand(CMD, {
                exec: async function(editor) {
                    let excute = CMD.split("_")[1];
                    ParaGroup.FIRE_ONCE(excute.toLocaleLowerCase());
                }
            });
        });
        editor.addMenuItems({
            MergeBeforePara: {
                label: 'Merge with Previous Para',
                icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
                command: 'PARAGROUP_PREV',
                group: 'ParaGroup',
                order: 102
            },
            MergeAfterPara: {
                label: 'Merge with Next Para',
                icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
                command: 'PARAGROUP_NEXT',
                group: 'ParaGroup',
                order: 103
            }
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('ParaGroup.editorListener', err.message);
    } finally {
        setTimeout(() => {
            ParaGroup.editorListener();
        }, 5000);
    }
};


var iLIST_MODULE = {
    ignore_list_type: {
        "BITS": ['simple'],
        "JATS": []
    },
    lab_config: {
        'lc_alpha': 'lower-alpha',
        'uc_alpha': 'upper-alpha',
        'lc_roman': 'lower-roman',
        'uc_roman': 'upper-roman',
        'numeric': 'decimal',
        'number': 'decimal',
        'bullet': '•',
        'circle': '○',
        'square': '■',
        'simple': '–',
        "○": "○"
    },
    lab_order: {
        "bullet": {
            "default": "bullet",
            "order": ['bullet', 'circle', 'square']
        },
        "number": {
            "default": "numeric",
            "order": ["numeric", "uc_alpha", "uc_roman", "lc_alpha", "lc_roman"],
            "ByIndex": {
                "numeric": {
                    "1": "1"
                },
                "uc_alpha": {
                    "1": "A"
                },
                "uc_roman": {
                    "1": "I"
                },
                "lc_alpha": {
                    "1": "a"
                },
                "lc_roman": {
                    "1": "i"
                },
            },
            "prefix": {
                "dot": ['', '.'],
                "parentheses": ['(', ')'],
                "rparentheses": ['', ')'],
                "bracket": ['[', ']'],
                "rbracket": ['', ']'],
                "default": ["", ""]
            }
        },
    },
    patternMatch: /dot|rparentheses|parentheses|bracket/,
    NL_prefix: 'NList_',
    checkSpanTags: function(el, _ = this) {
        el = el.$ ? el.$ : el;
        try {
            var listNodes = el.querySelectorAll('span span');
            var arrayNodes = Array.from(listNodes);
            arrayNodes.forEach((node, idx, arr) => {
                if (!node) return;
                if (node.childElementCount == 1 && node.nodeType == 1 && ['SPAN'].includes(node.tagName)) {
                    node.outerHTML == node.innerHTML;
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('checkSpanTags', err.message);
        }
    },
    get_root_type: function(value, list_type, _) {
        try {
            _ = this;
            if (typeof list_type == 'object') list_type = list_type.getAttribute(list_type.hasAttribute('list-type1') ? 'list-type1' : 'list-type');
            /* value */
            let IsDecimal = list_type.match(/numeric|decimal|number/) ? true : false;
            let IsThree = list_type.split("_").length > 2;
            let start = IsDecimal && !IsThree ? 0 : 1,
                end = IsDecimal && !IsThree ? 1 : 2;
            // if(value.match(/numeric|decimal/)){start=0;end=1;}else{start=1;end=2;}
            let oDelim = (list_type.match(this.patternMatch) != null) ? list_type.split('_').slice(start, end).join('') : '';
            let key_value = Object.keys(this.lab_config).find(key => this.lab_config[key] === value);
            var config_value = key_value ? key_value : (this.lab_config[value] ? value : null);
            let new_list_type = (IsDecimal) ? (oDelim + '_' + config_value) : ((oDelim && IS_JOURNAL) ? config_value.split('_').join('_' + oDelim + '_') : config_value);
            return {
                type: (((IS_JOURNAL ? _.NL_prefix : "") + new_list_type).replace('__', '_')),
                oDelim: oDelim,
                config_val: config_value
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('get_root_type', err.message);
        }
    },
    get_config_value: function(cur_list_type, split) {
        try {
            let temp_type = '';
            split = cur_list_type.split('_');
            if (cur_list_type.indexOf('numeric') != -1) {
                temp_type = split.pop();
            } else {
                temp_type = (cur_list_type.match(this.patternMatch) != null) ? (cur_list_type.slice(1, 2) + '_' + cur_list_type.slice(cur_list_type.length - 1)) : (cur_list_type);
            }
            if (temp_type.indexOf(this.NL_prefix) > -1) temp_type = temp_type.split(this.NL_prefix)[1];
            return temp_type;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('get_config_value', err.message);
        }
    },
    get_list_root: function(elm) {
        try {
            let parent = elm.parentElement;
            //?OUP_J_LIS_016 Bug Fixed TNF-DEMO DR_27_02_23
            return parent.closest('ol') ? parent.closest('ol') : (parent.closest('ul') ? parent.closest('ul') : null);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('get_list', err.message);
        }
    },
    getPrefix: function(elm) {
        try {
            var par_list_type = null;
            //?OUP_J_LIS_016 Bug Fixed TNF-DEMO DR_27_02_23
            var par_list = elm.tagName == "LI" ? this.get_list_root(elm) : elm;
            //var par_list = this.get_list_root(elm);
            var cur_list_type = null;
            let IsType1 = elm.hasAttribute('list-type1');
            cur_list_type = IsType1 ? elm.getAttribute('list-type1') : elm.getAttribute('list-type');
            par_list_type = par_list ? par_list.getAttribute(par_list.hasAttribute('list-type1') ? 'list-type1' : 'list-type') : null;
            if (!cur_list_type && par_list && par_list_type) /* elm.setAttribute(IsType1?'list-type1':'list-type', par_list_type), */ cur_list_type = par_list_type;
            // if(value.indexOf('numeric')!=-1){start=0;end=1;}else{start=1;end=2;}
            // if (cur_list_type.indexOf(this.NL_prefix)>-1) cur_list_type= cur_list_type.split(this.NL_prefix)[1];
            //let oDelim=(cur_list_type.match(this.patternMatch)!=null)?cur_list_type.split('_').slice(start,end).join(''):'';
            var split = cur_list_type.split('_');
            return (cur_list_type.match(this.patternMatch) != null) ? split[split.length - 2] : '';
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getPrefix', err.message);
        }
    },
    check_list_type: function(value, cur_list, parent_list) {
        try {
            let parent_values = this.get_root_type(value, parent_list);
            let cur_list_type = this.get_root_type(value, parent_values['type']);
            let IsType1 = cur_list.hasAttribute('list-type1' + cur_list_type);
            debug.log("change-list-0" + cur_list_type['type']);
            if (!cur_list.hasAttribute('old-list-type')) cur_list.setAttribute('old-list-type', cur_list_type['type']);
            //var cur_values = this.get_root_type(value,cur_list_type);
            // ? IS_JOURNAL ? 'list-type1' : 'list-content'
            cur_list.setAttribute(IsType1 ? (IS_JOURNAL ? 'list-type1' : 'list-content') : 'list-type', cur_list_type['type']);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('check_list_type', err.message);
        }
    },
    checkSub_Parent_Label: function(el, Option, _ = this) {
        el = el.$ ? el.$ : el;
        Option = Option ? Option : ({
            tabChange: false,
            cmd: ''
        });
        try {
            var IsNumber = el.tagName == 'OL';
            var type = IsNumber ? 'number' : 'bullet';
            var FindTag = IsNumber ? 'OL' : 'UL';
            var config = this.lab_config;
            var default_order = _.lab_order[type]['order'];
            var cur_order = [];
            var un_used_lab = [];
            var [newValue, newPrefix, tempCloneNode, ParentLoopMax, ParentLoop] = [null, null, el, 5, 0];
            /* var newPrefix = null;
            var tempCloneNode = el;
            var ParentLoopMax = 5
            var ParentLoop = 0; */
            var parent_root = tempCloneNode.closest(FindTag) && tempCloneNode.parentElement.closest(FindTag);
            while (parent_root) {
                let parent_lab = IsNumber ? this.NumberStyle(parent_root, null, {
                    show: true
                }) : parent_root.querySelector(`li[${this.label_attr}]`);
                let temp = commonMethods.getKeyByValue(config, (IsNumber ? parent_lab : parent_lab.getAttribute(this.label_attr)));
                if (parent_lab) cur_order.push(temp);
                console.log(temp);
                tempCloneNode = tempCloneNode.parentElement;
                parent_root = tempCloneNode.closest(FindTag) && tempCloneNode.parentElement.closest(FindTag);
                if (ParentLoopMax == ParentLoop) break;
                ParentLoop++;
            }
            cur_order = commonMethods.Duplicate_Array(cur_order);
            let child_root = el.querySelector(`li[${this.label_attr}]`);
            let child_lab = IsNumber ? this.NumberStyle(el, null, {
                show: true
            }) : child_root;
            if (child_lab) cur_order.push(commonMethods.getKeyByValue(config, (IsNumber ? child_lab : child_lab.getAttribute(this.label_attr))));
            var list_of_arr = el.querySelectorAll(FindTag);
            Array.from(list_of_arr).forEach((list, idx, arr) => {
                IsNumber = list.tagName == 'OL';
                if (idx != 0 && newValue && list.isEqualNode(el)) {
                    _[IsNumber ? "handleLabel" : "ApplyBulletStyle"](list, value, {
                        number: IsNumber,
                        prefix: newPrefix,
                        check_sub: false
                    });
                } else {
                    var item = list.querySelector('li');
                    var parent = list.parentElement.closest(FindTag);
                    if (parent && parent.isEqualNode(el)) {
                        let temp = commonMethods.getKeyByValue(config, (IsNumber ? (this.NumberStyle(list, null, {
                            show: true
                        })) : item.getAttribute(_.label_attr)));
                        let sub_lab = temp ? temp : null;
                        un_used_lab = commonMethods.Duplicate_Array(default_order, cur_order, {
                            remove: !0
                        });
                        newPrefix = _.getPrefix(el);
                        if (cur_order.includes(sub_lab)) {
                            let repeat = default_order.indexOf(sub_lab);
                            let value = newValue = un_used_lab.length > 0 ? un_used_lab[0] : (default_order[repeat + 1] ? default_order[repeat + 1] : default_order[0]);
                            // newPrefix = _.getPrefix(el);
                            _[IsNumber ? "handleLabel" : "ApplyBulletStyle"](list, value, {
                                number: IsNumber,
                                prefix: newPrefix,
                                check_sub: false
                            });
                        } else {
                            let value = newValue = sub_lab ? sub_lab : un_used_lab.length > 0 ? un_used_lab[0] : default_order[1];
                            // newPrefix = _.getPrefix(el);
                            _.check_list_type(value, list, el);
                            _[IsNumber ? "handleLabel" : "ApplyBulletStyle"](list, value, {
                                number: IsNumber,
                                prefix: newPrefix,
                                check_sub: false
                            });
                        }
                    } else if (parent) _.checkSub_Parent_Label(parent, {
                        tabChange: true
                    });
                    // ? recursive 
                }
            });
            if (Option.tabChange) this.checkSpanTags(el);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('handleLabel', err.message);
        }
    },
    handleLabel: function(el, value, Option, _ = this) {
        el = el.$ ? el.$ : el;
        Option = Option ? Option : ({
            number: el.tagName == 'OL'
        });
        try {
            var lab_Obj = this.lab_order['number'];
            if (Object.keys(lab_Obj['ByIndex']['numeric']).length == 1) this.Sequence_label();
            var IsNumber = Option.number || el.tagName == 'OL';
            if (IsNumber && [undefined, null].includes(Option.prefix)) Option.prefix = this.getPrefix(el, value);
            var order = lab_Obj['ByIndex'][value];
            var prefix = lab_Obj.prefix.default;
            if (Option.prefix && lab_Obj.prefix[Option.prefix]) {
                prefix = lab_Obj.prefix[Option.prefix];
            }
            var start = IsNumber ? (el.hasAttribute('start') ? Number(el.getAttribute('start')) : null) : null;
            //?OUP_J_LIS_016 Bug Fixed // TNF-DEMO DR_27_02_23
            el = el.tagName == "LI" ? this.get_list_root(el) : el;
            el.querySelectorAll(':scope > li').forEach((list, idx, arr) => {
                list[value.match(/roman/) != null ? "setAttribute" : "removeAttribute"]('data-list-roman', "");
                if (!list.parentElement.isEqualNode(el)) return;
                let update_value = IsNumber ? prefix.join(order[start ? (start - 1) : idx]) : _.lab_config[value] ? _.lab_config[value] : '';
                list.setAttribute('data-label-simple', update_value);
                if (start) start++;
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('handleLabel', err.message);
        }
    },
    Sequence_label: function(_) {
        try {
            var config_order = this.lab_order['number']['order'];
            var config_value = this.lab_order['number']['ByIndex'];
            var index_key = 999;
            for (var i = 0; i < index_key; i++) {
                for (var a = 0, l = config_order.length; a < l; ++a) {
                    let temp_key = config_order[a];
                    if ([1, 3].includes(a)) {
                        let alpha = getAlphabateByIndex(i);
                        config_value[temp_key][i] = (a == 1 ? alpha.toLocaleUpperCase() : alpha);
                    } else if ([2, 4].includes(a)) {
                        let roman = romanize(i + 1);
                        config_value[temp_key][i] = (a == 2 ? roman : roman.toLocaleLowerCase());
                    } else config_value[temp_key][i] = (i + 1);
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getType', err.message);
        }
    },
    NumberStyle: function(elm, value, Option) {
        try {
            // ******************
            // ? type => Existing list type || value ==> new Type of List
            //?OUP_J_LIS_016 Bug Fixed TNF-DEMO DR_27_02_23
            elm = elm.tagName == "LI" ? this.get_list_root(elm) : (elm);
            var IsType1 = elm.hasAttribute(IS_JOURNAL ? 'list-type1' : 'list-content');
            var cur_list_type = elm.getAttribute(IsType1 ? (IS_JOURNAL ? 'list-type1' : 'list-content') : 'list-type');
            if (!cur_list_type) return null;
            let temp_type = this.get_config_value(cur_list_type);
            if (!value) value = this.lab_config[temp_type];
            else if (value == "none") {
                // ? NEED TO HANDLE NUMBER TO DIRECT BULLET LIST
                // ? 03-06-22
                this.ApplyBulletStyle(elm, value, Option);
                return;
            }
            if (Option.change && value) {
                if (!elm.hasAttribute('old-list-type')) elm.setAttribute('old-list-type', cur_list_type);
                var cur_values = this.get_root_type(value, cur_list_type);
                debug.log("change-list-1" + cur_values['type']);
                elm.setAttribute(IsType1 ? 'list-type1' : 'list-type', cur_values['type']);
                this.handleLabel(elm, cur_values['config_val'], {
                    number: true,
                    prefix: cur_values['oDelim']
                });
                //return NL_prefix+new_list_type;
            } else if (Option.show) {
                if (Object.keys(this.lab_order['number']['ByIndex']['numeric']).length == 1) this.Sequence_label();
                return this.lab_config[temp_type];
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('NumberStyle', err.message);
        }
    },
    ApplyBulletStyle: function(element, value, Options = {
        check_sub: true
    }) {
        try {
            // ? Bullet style apply on context menu
            // ! bullet default for all type values only changing 28-Apr-22
            debug.log("change-list-2");
            if (!element.hasAttribute('old-list-type')) element.setAttribute('old-list-type', element.getAttribute('list-type'));
            // ? 27_DEC_22 - YA - CHANGED_FALSE - SIVA_POINT#14/23
            element.setAttribute('list-type', ['none', 'simple'].includes(value) ? 'simple' : value /* 'bullet' */ );
            element.removeAttribute('style');
            this.handleLabel(element, value);
            this.checkSub_Parent_Label(element);
            ['data-label-simple', 'style'].forEach((attr, idx, arr) => {
                if (element.hasAttribute(attr)) {
                    var css_value = element.getAttribute(attr);
                    if (idx == 0) {
                        element.setAttribute('data-label-simple-old', css_value);
                        element.removeAttribute(attr);
                    } else if (idx == 1) {
                        //css_value.indexOf('--')>-1
                        //if ( value ) element.setStyle( 'list-style-type', value );
                        //else element.removeAttribute(attr);
                    }
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ApplyBulletStyle', err.message);
        }
    },
    ul_list_type: ['simple', 'bullet', 'square', 'circle'],
    ol_list_type: ['numeric', 'number'],
    label_attr: 'data-label-simple',
    sel_obj: {
        classlist: null,
        tag: null,
        dom_node: null,
        dom_parent: null,
        dom_parent_tag: null
    },
    setUpLabel: function(element, value, config) {
        try {
            var list_type = element.getAttribute('list-type');
            if (this.ul_list_type.includes(list_type)) {
                let first_child = element.$.querySelector(`li[${this.label_attr}]`);
                if (first_child) {
                    let lab = first_child.getAttribute(this.label_attr);
                    let fetch = commonMethods.getKeyByValue(this.lab_config, lab);
                    if (fetch) return fetch;
                    else if (lab == '') return 'none';
                } else return 'simple';
            }
            /* else {
                           list_type = element.hasAttribute('list-type1')?element.getAttribute('list-type1'):element.getAttribute('list-type');
                           let temp = '';
                           let split = list_type.split('_');
                           if(list_type.indexOf('numeric')!=-1){
                               temp=list_type.split("_").pop();
                           } else {
                               temp =(list_type.match(/dot|rparentheses|parentheses|bracket/)!=null)?(split.slice(1,2)+'_'+split.slice(split.length-1)):(list_type);
                           }
                           return this.lab_config[temp];
                       } */
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('setUpShow', err.message);
        }
    },
    Update_Elm_Obj: function(curObj) {
        try {
            let check_entry = curObj.tag == 'li' ? curObj.dom_parent : curObj.dom_node;
            let IsList = check_entry.nextElementSibling && check_entry.nextElementSibling.tagName == 'OL';
            /* 
                 ? 15_MAR_2023  - YA - LIST REMOVE FIRST ITEM VIA MENU OPTIONS
                <div>
                    <p class="list-item">
                        <span class="p" data-name="p" id="IMP184"> </span>
                    </p>
                    <ol>
                    </ol>
                </div>
            */
            if (!IsList) {
                check_entry = curObj.dom_parent;
                IsList = check_entry.nextElementSibling && check_entry.nextElementSibling.tagName == 'OL';
            }
            if (!IsList) return false;
            else {
                let nex_elm = check_entry.nextElementSibling;
                this.sel_obj = {
                    classlist: nex_elm ? nex_elm.classList : null,
                    tag: nex_elm ? nex_elm.tagName : null,
                    dom_node: nex_elm ? nex_elm.querySelector('li') : null,
                    dom_parent: nex_elm ? nex_elm : null,
                    dom_parent_tag: nex_elm ? nex_elm.tagName : null
                };
                return true;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Update_Elm_Obj', err.message);
        }
    },
    Before_After_Event: function(event, Options = {}, self) {
        self = this;
        try {
            var IMS = IMPACT_SELECTION;
            var IsPrev = event.name == 'beforeCommandExec';

            if (!IsPrev) IMS.getInfo(GlobalEditor);
            var info = IMS.BEFORE_AFTER_EXE_CMD;

            if (IsPrev && Object.keys(this.lab_order['number']['ByIndex']['numeric']).length == 1) this.Sequence_label();
            var COMMAND_NAME = !!event.data && (!!event.data.name && event.data.name || !!event.name && event.name);
            // var OrderList = COMMAND_NAME == 'numberedlist';
            var IndentOpt = COMMAND_NAME == 'indent';
            var IsListPara = !!info.dom_parent && (['OL', 'OL'].includes(info.dom_parent_tag) || info.dom_parent.closest('ol,ul') || info.dom_node.closest('ol,ul'));
            if (!IsListPara && !IsPrev) {
                IsListPara = this.Update_Elm_Obj(info);
                if (Object.keys(this.sel_obj).length > 0) info = this.sel_obj;
            }

            if (!IsListPara) return console.warn("Not a list para");

            var IsNumbered = IsListPara ? info.dom_parent.closest('OL') ? true : (IsListPara.tagName == 'OL' ? true : false) : null;
            var OrderList = COMMAND_NAME == 'numberedlist' || IsNumbered;
            if (COMMAND_NAME == 'enter' && (!IsListPara || IsListPara && !IsNumbered)) return;
            var List_entry = IsListPara ? info.dom_node.tagName != 'li' ? info.dom_node.closest('li') : info.dom_node : null;
            var IsFirstChild = (IsListPara && IsListPara.parentElement) ? (List_entry.parentElement.firstElementChild.isEqualNode(List_entry) || ((Array.prototype.indexOf.call(List_entry.parentElement.childNodes, List_entry)) == 0)) : null;
            var FindTag = IsListPara ? IsNumbered ? 'OL' : 'UL' : null;
            // ? Let's write
            IMS._SNAPSHOT({
                lock: true
            });
            if (['outdent', 'indent'].includes(COMMAND_NAME)) {
                // ? exc before
                if (IsPrev) {
                    if (IndentOpt) {
                        // ? Tab 
                    } else if (!IndentOpt) {
                        // ? Shift + Tab 
                        let IsFirstList = List_entry.parentElement.closest('li') ? false : true;
                        // IsFirstChild&&
                        if (IsFirstList) {
                            event.stop();
                            event.cancel();
                            IMS._SNAPSHOT({
                                unlock: true
                            });
                            return true;
                        }
                    }
                } else {
                    // ? exc after
                    let parent = List_entry.parentElement;
                    IsFirstChild = IsListPara ? parent.firstElementChild.isEqualNode(List_entry) || ((Array.prototype.indexOf.call(parent.childNodes, List_entry)) == 0) : null;
                    var cur_list_item = info.dom_node.closest('li');
                    if (!cur_list_item) return;
                    var sibling = cur_list_item ? cur_list_item.nextSibling ? cur_list_item.nextSibling : cur_list_item.previousSibling : null;
                    var loop_parent = info.dom_parent.closest(FindTag);
                    var root_parent = loop_parent.parentElement.closest(FindTag);
                    let change_list = root_parent ? root_parent : loop_parent;
                    if (!IsFirstChild) {
                        if (!IsNumbered) {
                            if (sibling) cur_list_item.setAttribute('data-label-simple', sibling.getAttribute('data-label-simple'));
                            let child_list = cur_list_item.querySelector(FindTag);
                            if (child_list) this.checkSub_Parent_Label(cur_list_item, {
                                tabChange: true,
                                cmd: COMMAND_NAME
                            });
                        } else {
                            let type = change_list.getAttribute(change_list.hasAttribute('list-type1') ? 'list-type1' : 'list-type');
                            var value = this.get_config_value(type);
                            if (root_parent) this.checkSub_Parent_Label(change_list, {
                                tabChange: true,
                                cmd: COMMAND_NAME
                            });
                            if (value) this.handleLabel(change_list, value, {
                                number: IsNumbered,
                                prefix: '',
                                cmd: COMMAND_NAME
                            });
                        }
                    } else if (IsFirstChild) {
                        let type = change_list.getAttribute(change_list.hasAttribute('list-type1') ? 'list-type1' : 'list-type') || 'list-type';
                        var value = this.get_config_value(type);
                        this.checkSub_Parent_Label(change_list, {
                            tabChange: true,
                            cmd: COMMAND_NAME
                        });
                        this.handleLabel(change_list, value, {
                            number: OrderList
                        });
                    }
                }
            } else {
                if (IsPrev) {
                    this.LastParaAttr = info.dom_node.attributes;
                } else if (IsNumbered && ((!COMMAND_NAME && event.name == 'keyup') || event.name == 'key')) {
                    var elm = null;
                    if (Array.prototype.indexOf.call(info.dom_parent.childNodes, info.dom_node)) {
                        elm = info.dom_node.tagName != FindTag ? info.dom_node.closest(FindTag) : info.dom_node;
                        if (!elm) elm = info.dom_parent;
                    } else {
                        elm = info.dom_parent;
                    }
                    if (elm && elm.id == "") {
                        elm.id = GENERATE_ID();
                    } else if (!elm) {
                        return;
                    }
                    this.NumberStyle(elm, null, {
                        change: true
                    });
                    ["closest", "querySelectorAll"].forEach((selector, idx, arr) => {
                        var collection = null;
                        if (idx == 0) {
                            collection = [elm.parentElement[selector](FindTag)];
                        } else collection = elm[selector](FindTag);
                        Array.from(collection).forEach(sub_list => {
                            if (!sub_list) return;
                            self.checkSub_Parent_Label(sub_list, {
                                tabChange: true,
                                cmd: COMMAND_NAME
                            });
                            // ? OUP_J_LIS_043 - YA
                            if (idx == 0 && event.name == 'key' && IsNumbered) {
                                let [parent, loop_count] = [sub_list.closest("OL"), 0];
                                while (parent) {
                                    this.NumberStyle(parent, null, {
                                        change: true
                                    });
                                    parent = parent.parentElement.closest("OL");
                                    loop_count++;
                                    if (!parent || loop_count > 10) {
                                        break;
                                    }
                                }
                                this.NumberStyle(sub_list, null, {
                                    change: true
                                });
                            }
                        });
                    });

                } else {
                    var elm = null;
                    if (Array.prototype.indexOf.call(info.dom_parent.childNodes, info.dom_node)) {
                        elm = info.dom_node.tagName != FindTag ? info.dom_node.closest(FindTag) : info.dom_node;
                        if (!elm) elm = info.dom_parent;
                    } else {
                        elm = info.dom_parent;
                    }
                    if (elm.id == "") {
                        elm.id = GENERATE_ID();
                    }
                    //SelObj.dom_node.tagName=='LI'?SelObj.dom_node.parentElement:SelObj.dom_node;
                    if (COMMAND_NAME == 'enter') {
                        this.NumberStyle(elm, null, {
                            change: true
                        });
                    } else {
                        let value = this.lab_order[OrderList ? 'number' : 'bullet']['default'];
                        //?OUP_J_LIS_016 Bug Fixed TNFDEMO DR_27_02_23
                        elm = elm.tagName == "LI" ? this.get_list_root(elm) : elm;

                        commonMethods.setAttr(elm, {
                            "list-type": value,
                            "id": GENERATE_ID(),
                            'data-list-style': 'modified',
                            'data-track-code': 'list-style-01',
                            "default": ["dt", "du", "drn"]
                        });
                        this.handleLabel(elm, value, {
                            number: OrderList
                        });
                        // ! 14-May-2022 
                        let nxtObj = this.Update_Elm_Obj(info);
                        if (nxtObj) {
                            event.data.name = 'numberedlist';
                            this.Before_After_Event(event);
                        }
                    }
                }
            }
            IMS._SNAPSHOT({
                unlock: true
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Before_After_Event', err.message + event.name + event.data.name);
        }
    },
    HandleTrack: function() {
        try {

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('HandleTrack', err.message);
        }
    },

    /* {
                    type: 'select',
                    label: lang.type,
                    id: 'paren',
                    items: listParenOptions,
                    setup: function( element ) {
                        var impactType=element.getAttribute( 'list-content' );
                        var value = element.getStyle( 'list-style-type' ) || mapListStyle[ element.getAttribute( 'type' ) ] || element.getAttribute( 'type' ) || '';
                            value = (impactType!=null)?(getListType(impactType,SETUP)):(value);
                        this.setValue( value );
                    },
                    commit: function( element ) {
                        var impactType = element.getAttribute('list-content');
                        var value = this.getValue();
                        if(impactType!=null){
                            value = getListType(impactType,COMMIT,value);
                            element.setAttribute( 'list-content', value );
                        }else {
                            if ( value )
                            element.setStyle( 'list-style-type', value );
                            else
                            element.removeStyle( 'list-style-type' );
                            }
                        }
                }, */
};
