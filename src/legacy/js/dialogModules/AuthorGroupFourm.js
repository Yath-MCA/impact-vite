var AUTHOR_GROUP_TEMPLATE = `<div class="mDialog ds-none wo-editor-access" id="AuthorEditDialog">
        <div class="dialog-container xl">
            <div class="dialog-content">
                <!-- header -->
                <div class="dia_header_div"><div class="dia_header_text">Edit Author / Affiliation link</div><div class="ml-auto closeIcons" title="Close"><img alt="Close" class="n_Img" src="assets/images/svg/dialogClose.svg"></div></div>
                <!--?  body -->
                <div class="d-flex flex-column dialog-body" data-id="dialog-body">
                    <form class="" onsubmit="return false;" spellcheck="false">
                        <div class="form-group">
                            <div class="row" id="row_1">
                                <div class="col-6 row" id="">
                                    <div class="col-6" id=""><label for="author_edit_given-names">Given Name</label><input type="text" class="form-control form-control-sm" id="author_edit_given-names" placeholder="" autocomplete="off"></div>
                                    <div class="col-6" id=""><label for="author_edit_surname">Surname</label><input type="text" class="form-control form-control-sm" id="author_edit_surname" placeholder="" autocomplete="off"></div>                                    
                                </div>
                                <div class="col-6 row" id="optional_row">
                                    <div class="col" id=""><label for="author_edit_prefix">Prefix</label><input type="text" class="form-control form-control-sm" id="author_edit_prefix" placeholder="" autocomplete="off"></div>
                                    <div class="col" id=""><label for="author_edit_suffix">Suffix</label><input type="text" class="form-control form-control-sm" id="author_edit_suffix" placeholder="" autocomplete="off"></div>
                                    <div class="col-6" id=""><label for="author_edit_degrees">Degrees</label><input type="text" class="form-control form-control-sm" id="author_edit_degrees" placeholder="" autocomplete="off"></div>
                                </div>
                            </div>
                            <div class="row mt-2" id="row_2">
                                <!--<div class="col" id=""><label for="author_edit_alter-name">Alternative Name</label><input type="text" class="form-control form-control-sm" id="author_edit_alter-name" placeholder="" autocomplete="off"></div>    
                                <div class="col"><label for="author_edit_author-comment">Author Comment</label><input type="text" class="form-control form-control-sm" id="author_edit_author-comment" placeholder="" autocomplete="off"></div>-->
                                <div class="col-5">
                                    <fieldset>
                                    <legend></legend>
                                    <span class="form-check-label labelText" aria-labelledby="author_edit_correspond">Corresponding Author</span>
                                    <div class="form-check d-flex mt-0"> 
                                        <div class="col">
                                            <input type="radio" class="form-check-input" id="author_edit_correspond" name="author_edit_correspond_radio" autocomplete="off" value="yes">
                                            <label class="form-check-label" for="author_edit_correspond">Yes</label>
                                        </div>
                                        <div class="col">
                                            <input type="radio" checked="checked" class="form-check-input" id="author_edit_correspond_no" name="author_edit_correspond_radio" autocomplete="off" value="no">
                                            <label class="form-check-label" for="author_edit_correspond_no">No</label>
                                        </div>
                                    </div>
                                    </fieldset>
                                </div>
                            </div>
                            <div class="row mt-2" id="row_3">
                                <div class="col-4"><label for="author_edit_xref">Xrefs</label><input type="text" class="form-control form-control-sm" id="author_edit_xref" placeholder="" autocomplete="off"></div>
                                <div class="col">
                                    <label for="author_edit_orcid">ORCID</label>
                                    <div class="row">
                                        <div class="col-4"><input name="orchid_label" type="text" aria-label="orchid" class="form-control form-control-sm" placeholder="https://orcid.org/" autocomplete="off" disabled value="https://orcid.org/"></div>
                                        <div class="col"><input type="text" aria-label="orchid" class="form-control form-control-sm" id="author_edit_orcid" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-2 ds-none" id="row_4">
                                <div class="col-4">
                                    <!--<div class="row d-flex"><div class="col" id="author_edit_xref_labels"></div></div>-->
                                    <div class="" id="author_edit_xref_labels_new"><div id="author_edit_xref_inner_div"></div></div>
                                </div>
                            </div>
                        </div>
                  </form>
                  <div class="d-flex flex-column show" id="author_edit_warning_show">
                    <span class="" >Warning</span><div class="" id="author_warning"><div class="warning"></div></div>
                  </div>
                  <div class="d-flex flex-column" id="author_edit_preview_group"><span class="labelText">Preview</span><div class="" id="author_edit_preview"></div></div>
                </div>
                <!-- ? body end -->
                <!-- ? Footer section start -->
                <div class="default dialog-footer" data-id="dialog-footer">
                    <button type="submit" title="Click to Cancel" id="author_edit_cancel" class="btn secondary-btn btn-sm">Cancel</button>
                    <button type="submit" title="Click to Update" id="author_edit_update" class="btn primary-btn btn-sm disabled">Update</button>
                </div>
            </div>
        </div>
    </div>`;
var AuthorEditDialog = new dialogModule('AuthorEditDialog', AUTHOR_GROUP_TEMPLATE);
AuthorEditDialog.resetModeState = function(_ = AuthorEditDialog) {
    _.mode = 'edit';
    _._INSERT_ANCHOR_ID = null;
    _._INSERT_ANCHOR = null;
    if (_.M_SCOPE) {
        _.M_SCOPE['_TC_ORDER'] = {};
        _.M_SCOPE.SHOW_WARN = [];
    }
    if (_.Panel) {
        const title = _.Panel.querySelector('.dia_header_text');
        const updateButton = _.Panel.querySelector('#author_edit_update');
        if (title) title.textContent = 'Edit Author / Affiliation link';
        if (updateButton) {
            updateButton.textContent = 'Update';
            updateButton.title = 'Click to Update';
        }
    }
};
AuthorEditDialog.Before_closeDialog = function() {
    AuthorEditDialog.resetModeState();
    return true;
};
AuthorEditDialog.initLoop = function(_ = AuthorEditDialog) {
    try {
        _.M_SCOPE._Arr_Multiple_ELm = ['_Input_xref'];
        _.M_SCOPE['_Arr_Mandatory_ELm'] = ['_Input__orcid', '_Input_given_names', '_Input_surname', '_Input_xref'];
        _.M_SCOPE._Arr_Optional_ELm = ['_Input_name_alter', '_Input__orcid' /*, '_Input_author_comment'*/ , '_Input_prefix', '_Input_suffix', '_Input_degrees'];
        _.M_SCOPE._Obj_Id_Declare = {
            _BtnOpt_Update: '#author_edit_update',
            _BtnOpt_Cancel: '#author_edit_cancel',
            _WarnShow_Div: '#author_warning',
            _WarnShow_Parent_Div: '#author_edit_warning_show',
            _Preview_Div: '#author_edit_preview',
            // ? attribute based inputs
            _Input__orcid: '#author_edit_orcid',
            _Input__Correspond: '#author_edit_correspond',
            // ? default elements 
            _Input_surname: '#author_edit_surname',
            _Input_given_names: '#author_edit_given-names',
            _Input_xref: '#author_edit_xref',
            // ? Optional inputs
            _Input_name_alter: '#author_edit_alter-name',
            // _Input_author_comment: '#author_edit_author-comment',
            _Input_prefix: '#author_edit_prefix',
            _Input_suffix: '#author_edit_suffix',
            _Input_degrees: '#author_edit_degrees'
        };
        for (const [name, input_elm] of Object.entries(this.M_SCOPE._Obj_Id_Declare)) {
            this.IBOX[name] = this.Panel.querySelector(input_elm);
            this.M_FUN.showHide_Inputs(name, input_elm);
        }
        // ? 10_JAN_23 - YA
        _.IBOX._Labels_Div = this.Panel.querySelector("#author_edit_xref_inner_div");
        this.IBOX._BtnOpt_Update.onclick = this.M_FUN.Update_fire;
        this.IBOX._BtnOpt_Cancel.onclick = this.closeDialog.bind(this);
        // this.AuthDOM = document.getElementById('AuthDOM');
        this.Panel.querySelectorAll("input").forEach(input => {
            if (input.id.match(/degrees|suffix|prefix/)) {
                //input.setAttribute({data-toggle="tooltip" data-placement="top" title="Tooltip on top"})
                var Tooltip = {
                    // ! 2374057: IMPACT - Edit Author option - Error in Examples - 20_MAR_2024_YA
                    "author_edit_prefix": "(e.g., Prof., Dr., Mr., Mrs etc.)",
                    "author_edit_suffix": "(e.g., Jr., Sr., III, IV, CJ, SCJ, LJ)",
                    "author_edit_degrees": "(e.g., MD, PhD, JD, RN etc.)",
                };
                _["G_FUN"].setAttr(input, {
                    "data-toggle": "tooltip",
                    "data-placement": "bottom",
                    "title": Tooltip[input.id],
                    // "placeholder": Tooltip[input.id]
                });
                $('input[data-toggle="tooltip"]').tooltip({
                    boundary: 'scrollParent',
                    fallbackPlacement: 'flip'
                });
            }
            ["onfocus", "onfocusout", "onclick", "onkeydown", "onpaste", "onpropertychange"].forEach((evt, idx, arr) => {
                if (idx < 2 && !input.id.match(/degrees|suffix|prefix/)) {
                    // ? on-focus event ignore for other than optional
                    // return debug.log(input.id + `-->> ${evt} Ignored`);
                }
                input[evt] = function(e) {
                    try {
                        let timer = 250;
                        setTimeout(() => {
                            AuthorEditDialog.M_FUN.Event_Trigger(e);
                        }, timer);
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('input.onclick', err.message);
                    }
                };
            });
        });
        //this.COPY_FN_Template();
        this.M_SCOPE['_MULTIPLE_KEY_VAL'] = {
            "author_edit_orcid": {
                "TC_MSG": "ORCID",
                "TC_MSG_ACT": {
                    "EMPTY": "removed"
                },
                "TC_ID": "author_edit_orcid",
                "findKey": "contrib-id",
                "findFun": "getAttribute",
                "setFun": "setAttribute",
                "template": null,
                "warn_code": "A_O_001,A_O_002",
                "prefix": "https://orcid.org/",
                "split": "orcid.org/"
            },
            "author_edit_correspond": {
                "TC_MSG": "Corresponding",
                "TC_MSG_ACT": {
                    "EMPTY": "unlinked"
                },
                "TC_ID": "author_edit_correspond",
                "findKey": "corresp",
                "findFun": "getAttribute",
                "setFun": "setAttribute",
                "template": "xref_sup",
                "role": "corresp",
                "append_Selector": ".contrib",
                "append_method": "append"
            },
            "author_edit_surname": {
                "TC_MSG": "Surname",
                "TC_ID": "author_edit_surname",
                "findKey": ".surname",
                "findFun": "querySelector",
                "template": "author",
                "append_Selector": ".given-names",
                "append_method": "after",
                "warn_code": "A_N_002"
            },
            "author_edit_given-names": {
                "TC_MSG": "Given name",
                "TC_ID": "author_edit_given-names",
                "findKey": ".given-names",
                "findFun": "querySelector",
                "template": "author",
                "append_Selector": ".name",
                "append_method": "prepend",
                "warn_code": "A_N_001"
            },
            "author_edit_alter-name": {
                "TC_MSG": "Name Alternatives",
                "TC_ID": "author_edit_alter-name",
                "findKey": ".name",
                "findFun": "querySelector",
                "template": "name",
                "append_Selector": ".name",
                "append_method": "after",
                "warn_code": "A_N_001"
            },
            "author_edit_xref": {
                "TC_MSG": "Cross link",
                "TC_ID": "author_edit_xref",
                "findKey": ".xref",
                "findFun": "querySelectorAll",
                "template": "xref_sup",
                "role": "aff",
                "append_Selector": ".name",
                "append_method": "after",
                "warn_code": "A_X_001,A_X_002"
            },
            "author_edit_prefix": {
                "TC_MSG": "Prefix",
                "TC_ID": "author_edit_prefix",
                "TC_MSG_ACT": {
                    "EMPTY": "removed"
                },
                "findKey": ".prefix",
                "findFun": "querySelector",
                "template": "prefix",
                "append_Selector": ".surname",
                "append_method": "after",
                "warn_code": "A_DT_001"
            },
            "author_edit_suffix": {
                "TC_MSG": "Suffix",
                "TC_ID": "author_edit_suffix",
                "TC_MSG_ACT": {
                    "EMPTY": "removed"
                },
                "findKey": ".suffix",
                "findFun": "querySelector",
                "template": "suffix",
                "append_Selector": ".name",
                "append_method": "append",
                "warn_code": "A_DT_001"
            },
            "author_edit_degrees": {
                "TC_MSG": "Degrees",
                "TC_ID": "author_edit_degrees",
                "TC_MSG_ACT": {
                    "EMPTY": "removed"
                },
                "findKey": ".degrees",
                "findFun": "querySelector",
                "template": "degrees",
                "append_Selector": ".name",
                "append_method": "after",
                "warn_code": "A_DT_001"
            }
        };
        this.M_SCOPE['_FOCUS_IN_OUT'] = {
            "focus": {
                "target": {
                    "add": "col-6",
                    "remove": "col",
                },
                "sibiling": {
                    "add": "col",
                    "remove": "col-6",
                }
            },
            "focusout": {
                "target": {
                    "add": "col",
                    "remove": "col-6",
                },
                "sibiling": {
                    "add": "col",
                    "remove": "col-6",
                }
            }
        };
        // ? duplicate for radio Options
        this.M_SCOPE['_MULTIPLE_KEY_VAL']["author_edit_correspond_no"] = this.M_SCOPE['_MULTIPLE_KEY_VAL']["author_edit_correspond"];
        this['M_CONFIG'].SINGLE_AFF = GET_TYPE_CONFIG_QUERY('affiliation', 'single-aff', {
            journalBased: true
        }) == 'true';
        this.M_SCOPE.WARN_COLLECTION = {
            "WARN_ALERT": "Please fill out the mandatory fields.",
            "A_N_001": "Please fill out the mandatory fields.",
            "A_N_002": "Please fill out the mandatory fields.",
            "A_X_001": "Please fill out the mandatory fields.",
            "A_X_002": ALERT_MESSAGE["AG_AFF_GROUP"]["UNKNOWN_LAB"],
            "A_O_001": "ORCID ID doesn't match the standard format.",
            //"A_O_002": "ORCID Identifier allowed 16-digit identifier is preceded by `https://orcid.org/`. (A hyphen is inserted every 4 digits of the identifier to aid readability)",
            "A_O_002": "Must contain a 16-digit identifier.",
            "A_DT_001": "The highlighted fields are not allowed as per journal style guide"
        };
        this.M_SCOPE.IS_DOM_MANIPULATE = false;
        _["M_FUN"].get_xref_text = function(arr) {
            try {
                return _["G_FUN"].GET_ARR_TEXT(arr, {
                    boolean: true,
                    join: ","
                });
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('get_xref_text', err.message);
            }
        };
        // 04_NOV_2023_RR == 06_NOV_2023_YA
        if (SHARED_KEY.client) this.Panel.classList.add(SHARED_KEY.client);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('AuthorEditDialog.initLoop', err.message);
    }
};
AuthorEditDialog.IsEditor = function(el, contribGroup) {
    try {
        if (!el) return false;

        contribGroup = contribGroup ? contribGroup : el.closest && el.closest('.contrib-group');

        // ? 1. Direct checks using closest() or getAttribute
        const isClosestEditor = el.closest && el.closest('[contrib-type="editor"]');
        const isDirectEditor = el.getAttribute && el.getAttribute('contrib-type') === 'editor';

        if (isClosestEditor || isDirectEditor) {
            return true;
        }

        // ? 2. Check nested element's contrib-type value

        const contribValueEl = contribGroup && contribGroup.querySelector('[contrib-type]');
        const contribGroupType = contribValueEl ? contribValueEl.getAttribute('contrib-type') : "";

        const nestedContrib = el.querySelector && el.querySelector('[contrib-type]');
        const typeValue = nestedContrib ? nestedContrib.getAttribute("contrib-type") : "";

        if (contribGroupType === "author") return false;
        if (typeValue === "editor") return true;
        if (typeValue === "author") return false;

        // ? 3. Check data-piinfo attribute for content-type="editor"
        const piInfo = el.getAttribute && el.getAttribute("data-piinfo");
        if (piInfo && /content-type\s*=\s*"?editor"?/i.test(piInfo)) {
            return true;
        }

        // ? 4. Fallback: check for contrib-type presence
        const hasContribType = el.closest('[contrib-type]') || el.getAttribute('contrib-type');
        return !hasContribType;
    } catch (error) {
        return false;
    }
};

AuthorEditDialog.showLoop = function(elm, Options = {}, param3, self) {
    self = AuthorEditDialog;
    try {

        function extractAuthorContext(author, contextElement) {
            const contribGroup = contextElement.closest('.contrib-group');
            const metaGroup = contextElement.closest('.article-meta');

            return {
                _AUTHOR: author.cloneNode(true),
                _AU_CLONE: author.cloneNode(true),
                _AU_ContribGroup: contribGroup ? contribGroup : null,
                _AU_ContribGroup_Clone: contribGroup ? contribGroup.cloneNode(true) : null,
                _AU_MetaGroup: metaGroup ? metaGroup.cloneNode(true) : null,
                AU_AFF_LABELS: {
                    RID: [],
                    SPAN: []
                }
            };
        }


        self.resetModeState();
        this.M_FUN.COPY_FN_Template();
        if (typeof elm == "string") elm = GlobalEditor.document.getById(elm);
        if (!elm) {
            self.closeDialog();
            IS_LOCAL_HOST ? alert("Choose Proper Element") : console.warn("Choose Proper Element");
        } else elm = elm.$ ? elm.$ : elm;

        const isInsert = Options.mode === 'insert';
        const anchor = elm;
        self.mode = isInsert ? 'insert' : 'edit';
        if (isInsert) {
            const contributors = anchor.parentElement.querySelectorAll('.contrib');
            const isLastAuthor = contributors[contributors.length - 1] === anchor;
            elm = self._AG_.Get_Template('author', {
                IsLastName: isLastAuthor,
                frag: true,
                dom: true
            });
            if (!elm) {
                self.closeDialog();
                return;
            }
            self._INSERT_ANCHOR_ID = anchor.id;
            self._INSERT_ANCHOR = anchor;
        }

        const title = self.Panel.querySelector('.dia_header_text');
        if (title) title.textContent = isInsert ? 'Add Author' : 'Edit Author / Affiliation link';
        if (self.IBOX._BtnOpt_Update) {
            self.IBOX._BtnOpt_Update.textContent = isInsert ? 'Add' : 'Update';
            self.IBOX._BtnOpt_Update.title = isInsert ? 'Click to Add' : 'Click to Update';
        }

        const authorContext = extractAuthorContext(elm, anchor);
        // assign each property into self
        Object.assign(self, authorContext);

        const {
            _Obj_Id_Declare,
            _MULTIPLE_KEY_VAL,
            _Arr_Multiple_ELm
        } = self.M_SCOPE;
        const {
            SINGLE_AFF
        } = self.M_CONFIG;

        for (const [name, input_elm] of Object.entries(_Obj_Id_Declare)) {
            let ELM = self.IBOX[name];
            if (name.indexOf("_Input_") >= 0 && ELM) {
                let find_Key = (_MULTIPLE_KEY_VAL[input_elm.substring(1)]["findKey"]);
                if (name.indexOf("__") >= 0) {
                    // ? attribute based fields
                    if (!!name.match(/corresp/gi)) {
                        // ? radio option for corresponding
                        ELM['checked'] = ((elm.getAttribute(find_Key) == "yes") ? true : (false));
                        if (!ELM['checked']) self.Panel.querySelector(`${input_elm}_no`).checked = true;
                    } else {
                        // ? orcid id update
                        let orcid = elm.getAttribute(find_Key);
                        ELM['value'] = (orcid ? self.M_FUN.SPLIT_TXT_ORCID(orcid) : '');
                    }
                } else {
                    // ? node based fields
                    let text = [];
                    ELM['value'] = "";
                    self._AU_CLONE.querySelectorAll(find_Key).forEach(node => {
                        let show_text = getTxt(node);
                        // ? if place holder - not allowed to show - MOM_20_OCT_22
                        if (!self._AG_.place_holder['all'].includes(show_text)) {
                            text.push(show_text);
                            if (name == "_Input_xref") {
                                self.AU_AFF_LABELS.RID.push(node.getAttribute("rid"));
                            }
                        }
                    });
                    ELM['value'] = text.join(_Arr_Multiple_ELm.includes(name) ? "," : "");
                    self.M_FUN.showHide_Inputs(name, input_elm);
                }
            }
        }
        $(self.IBOX._Preview_Div).html('').append(self._AUTHOR);
        self.M_FUN.runPreviewXTagValidation(self);
        $(self.IBOX._WarnShow_Div).html('');
        //  ? AFF_LABELS_HANDLE - YA - 10_JAN_23

        var NSNB = `&#x00A0;`;
        self._AU_MetaGroup.querySelectorAll(".aff,.fn,.corresp").forEach((el, idx, arr) => {
            // ? 24_MAR_23/16_JUNE_2023 YA/DR - INPUT MIS-MATCH - COMMEND - el.querySelector("sup") ? el.querySelector("sup").textContent :

            var _IsCorresp_ = el.classList.contains("corresp");
            var contribGroup = el.closest && el.closest('.contrib-group');

            var isEditor = contribGroup && AuthorEditDialog.IsEditor && AuthorEditDialog.IsEditor(el);

            if (isEditor && contribGroup) {

                return debug.log("this editor contrib", el);

            } else {
                // if (IS_LOCAL_HOST && _IsCorresp_) debugger;

                let linked = self.AU_AFF_LABELS.RID.includes(el.id);
                let lab = (el.dataset.label ? el.dataset.label : NSNB);

                if (lab === NSNB) {
                    const supEl = el.querySelector("sup");

                    if (supEl && el.firstElementChild && el.firstElementChild.tagName === "SUP") {
                        lab = supEl.textContent;
                    } else {
                        // ? 3385046: PLOS - IMPACT Bugs
                        const text = el.textContent.trim();
                        if (text.charAt(0) === '☯') {
                            lab = '☯';
                        }
                    }
                }

                let lClass = ("label" + (linked ? " active" : "") + (SINGLE_AFF ? " disabled" : ""));
                if (!el.classList.contains("aff") && !linked && (!lab || lab == NSNB)) {
                    return;
                }
                self.AU_AFF_LABELS.SPAN.push(`<span class="${lClass}" rid="${el.id}">${lab}</span>`);
            }
        });
        $(self.IBOX._Labels_Div).html('').append(self.AU_AFF_LABELS.SPAN.join(""));
        self.M_FUN.AFF_LAB_BTN_CLICK_HANDLE();

        self.IBOX._BtnOpt_Update.classList.add("disabled");
        // ? 12_JAN_23 - YA - Update configuration
        self._AG_.Update_Configuration();
        self.M_FUN.Validate_Inputs();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('AuthorEditDialog.showLoop', err.message);
    }
};
AuthorEditDialog.M_FUN.AFF_LAB_BTN_CLICK_HANDLE = function(_) {
    _ = AuthorEditDialog;
    /* 
        ! THIS FUN = NEW REQUIREMENT FOR AFF/CORRES/FN - LABELS SHOW AS CLICKABLE ELEMENT AS ROW.
        
        @Param_1 ==> Parent Object
        
        
    */
    try {
        _.IBOX._Labels_Div.querySelectorAll("span.label").forEach(elm => {
            elm.onclick = function(e) {
                if (this.classList.contains('disabled') || this.hasAttribute("disabled")) return false;
                this.classList.toggle("active");
                _.M_SCOPE.NEW_XREF_ARR = _.M_FUN.get_xref_text(_.IBOX._Labels_Div.querySelectorAll("span.label.active"));
                // debug.log(_.M_SCOPE.NEW_XREF_ARR);
                _.IBOX['_Input_xref'].value = _.M_SCOPE.NEW_XREF_ARR;
                _.M_FUN.Event_Trigger(e);
            };
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('AFF_LAB_BTN_CLICK_HANDLE', err.message);
    }
};
AuthorEditDialog.M_FUN.showHide_Inputs = function(nameKey, Elm_Id, Elm, _) {
    _ = AuthorEditDialog;
    try {
        Elm = _.IBOX[nameKey] ? _.IBOX[nameKey] : _[nameKey];
        let idx = _.M_SCOPE._Arr_Optional_ELm.indexOf(nameKey);
        const trimKey = Elm_Id.split("_").pop();
        const configVal = GET_TYPE_CONFIG_QUERY('author', trimKey, {
            journalBased: true
        });
        const isAllowed = configVal != 'no' || null;
        if (nameKey.indexOf("_Input_") >= 0) {
            if (idx >= 0) {
                let CanShow = (Elm.value != "" || isAllowed) ? true : false;
                Elm[CanShow ? "removeAttribute" : "setAttribute"]("readonly", "");
            } else if ("_Input_xref" == nameKey /* && _._AG_ && _._AG_.M_SCOPE */ ) {
                // ? 03_JAN_23 -YA -MOCK_LIVE_UPDATE
                // Elm[_['M_CONFIG'].SINGLE_AFF ? "setAttribute" : "removeAttribute"]("readonly", "");
                // ? 12_JAN_22 - ADDED - YA
                Elm.setAttribute("readonly", "");
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('showHide_Inputs', err.message);
    }
};
AuthorEditDialog.M_FUN.Event_Trigger_New = function(e, _ = AuthorEditDialog) {
    // ! THIS FN WILL BE EVENTS TRIGGER ALL ELEMENTS WHILE THIS KEY/SELECT/CLICK - IN DIALOG
    //     ? 1) ALL EVENT INFO RELATED INFORMATION STORED AT JSON FORMAT
    //     ? 2) If EVENT FIRE => GET / SET with ORG/NEW Values from all input fields
    //     ? 3) IF FILED HAS READONLY MODE - WE SHOW WARN INFO BOTTOM OF THE DIALOG
    //     ? 4) AFTER KEY EVT FIRE => NEW CONTENT GENERATE WITH TEMPLATE AND PLACE PREVIEW AREA


    try {
        const metaGroup = _._AU_MetaGroup;
        const XREF_INPUT_ID = "author_edit_xref";
        const TARGET_ID = e.target.id || (e.target.tagName === "SPAN" ? XREF_INPUT_ID : "");
        const TARGET_KEY = _.G_FUN.getKeyByValue(_.M_SCOPE._Obj_Id_Declare, "#" + TARGET_ID);
        const TARGET = _.IBOX[TARGET_KEY] || e.target;
        const IS_XREF = /xref/.test(TARGET_ID);
        const IS_ORCID = /orcid/.test(TARGET_ID);
        const DEL_BK_SP = iKEY_EVENT_HANDLING.BKSP_SPACE_DEL_CODE.includes(e.keyCode);
        const find_Obj = JSON.parse(JSON.stringify(_.M_SCOPE['_MULTIPLE_KEY_VAL'][TARGET_ID]));
        const {
            findFun,
            setFun,
            findKey,
            TC_ID,
            role,
            template,
            append_Selector,
            append_method,
            prefix,
            warn_code
        } = find_Obj || {};
        const single_aff = _['M_CONFIG'].SINGLE_AFF = metaGroup.querySelectorAll("div.aff").length <= 1;

        if (["focus", "focusout", "click"].includes(e.type) && TARGET_ID) {
            const row_4 = _.Panel.querySelector("#row_4");

            if (TARGET.hasAttribute("readonly") && TARGET_ID !== XREF_INPUT_ID) {
                _.M_SCOPE.SHOW_WARN.push('A_DT_001');
            }

            if (!TARGET.closest('#row_4') && TARGET_ID !== XREF_INPUT_ID) {
                row_4.classList.add("ds-none");
            }

            if (["focus", "click"].includes(e.type) && TARGET_ID === XREF_INPUT_ID && _._AG_.M_CONFIG.SHOW_CONTEXT_GROUP_AUTHOR && !single_aff) {
                if (!TARGET.closest('#row_4')) {
                    row_4.classList.remove("ds-none");
                    setTimeout(() => row_4.classList.add("ds-none"), 20000);
                }
                return debug.log("--return-00--");
            }

            const DynamicField = _.M_SCOPE['_FOCUS_IN_OUT'][e.type];
            if (DynamicField && TARGET.closest('#row_1') && (!TARGET.hasAttribute("readonly") || e.type === "focusout")) {
                $(TARGET.parentElement).addClass(DynamicField.target.add).removeClass(DynamicField.target.remove);
                $(TARGET.parentElement).siblings().addClass(DynamicField.sibiling.add).removeClass(DynamicField.sibiling.remove);
                return debug.log("--return-02--");
            }

            return debug.log("--return-03--");
        }

        if (e.type === "click" && TARGET.type !== "radio" && !e.target.id && !e.target.classList.contains("label")) {
            return debug.log("--return-04--");
        }

        const getVal = typeof findFun === "string" && /querySelector/.test(findFun) ?
            (findFun.includes("All") ? _["M_FUN"].get_xref_text : "textContent") :
            typeof findFun === "function" ? findFun : "textContent";

        const old_elm = _._AU_CLONE[findFun](findKey);
        const cur_elm = _._AUTHOR[findFun](findKey);

        const old_value = old_elm ? (typeof getVal === "function" ? getVal(old_elm) : old_elm[getVal]) : "";
        const cur_value = cur_elm ? (typeof getVal === "function" ? getVal(cur_elm) : cur_elm[getVal]) : "";
        let new_value = TARGET.value;

        if (IS_ORCID) {
            TARGET.value = _.M_FUN.SPLIT_TXT_ORCID(new_value);
            if (TARGET.value) new_value = prefix + TARGET.value;
            if (TARGET.value.length > 19) {
                if (warn_code) {
                    var firstWarn = warn_code.split(',')[0];
                    _.M_SCOPE.SHOW_WARN.push(firstWarn);
                }
                _.M_FUN.SHOW_WARNING(_);
                return debug.log("--return-05--");
            }
        }

        let Dirty = false,
            _Add_El = false,
            _Remove_El = false,
            frag = null,
            corr_lab_add = false;

        const needsUpdate = (new_value && (old_value !== new_value || cur_value !== new_value)) || (single_aff && IS_XREF && new_value === "");
        if (needsUpdate) {
            if (setFun === "setAttribute") _._AUTHOR[setFun](findKey, new_value);

            if (IS_XREF) {
                const XREF_TARGET = e.target;

                // Update as new element
                if ((DEL_BK_SP || !XREF_TARGET.classList.contains("active")) && !single_aff) {
                    _._AUTHOR.querySelectorAll(findKey).forEach(node => {
                        const isAvailable = _.M_SCOPE.NEW_XREF_ARR.includes(node.textContent);
                        if (!isAvailable) {
                            // If deleted from input box
                            commonMethods.removeEl(node);
                        }
                    });
                } else {
                    const xref_value = XREF_TARGET.textContent;
                    const rid = XREF_TARGET.getAttribute("rid") || "";
                    const link = metaGroup.querySelector(`div[data-label="${xref_value}"]`) || metaGroup.querySelector(`[id="${rid}"]`);

                    let IS_AVAIL = false,
                        rep_Txt = "";

                    if (!link && !single_aff) {
                        _.M_SCOPE.SHOW_WARN.push("A_X_002");
                        XREF_TARGET.classList.toggle("active");
                    } else {
                        // Handle SINGLE_AFF case
                        if (single_aff) {
                            const singleLink = metaGroup.querySelector(`div.aff`);
                            IS_AVAIL = _._AUTHOR.querySelector(`[rid="${singleLink.id}"]`) ? true : false;
                            if (IS_AVAIL) {
                                return console.log("return-already-available");
                            }
                            link = singleLink;
                        }

                        [rep_Txt, Dirty, _Add_El] = [xref_value, true, true];
                        const link_type = link.getAttribute("data-name");

                        if (link_type === "corresp") {
                            corr_lab_add = true;
                            // Change value of the corresponding inputs
                            _.IBOX._Input__Correspond.checked = true;
                            if (find_Obj.role !== "corresp") {
                                find_Obj = _.M_SCOPE['_MULTIPLE_KEY_VAL']["author_edit_correspond"];
                            }
                        } else if (link_type === "fn") {
                            find_Obj.role = "fn";
                        }

                        frag = _.Get_Template(find_Obj.template, {
                            frag: true,
                            label: xref_value,
                            role: find_Obj.role,
                            type: find_Obj.role,
                            rid: link.id
                        });
                    }

                    if (frag) {
                        if (find_Obj.append_Selector === '.contrib') {
                            _._AUTHOR[find_Obj.append_method](frag);
                        } else {
                            _._AUTHOR.querySelector(find_Obj.append_Selector)[find_Obj.append_method](frag);
                        }
                    }
                }

                // Update the value from sorting OrderLinks
                const returnValue = _._AG_.OrderNewLink(_._AUTHOR, {
                    AuthorModule: true
                });
                TARGET.value = returnValue || TARGET.value;
                Dirty = true;
            } else if (/degrees|suffix|prefix|name|given-names|surname/.test(TARGET_ID)) {
                Dirty = true;
                frag = _.Get_Template(template, {
                    frag: true,
                    data: new_value
                });
                let targetElem = _._AUTHOR.querySelector(findKey);
                if (old_value === "") _Add_El = true;
                if (targetElem) targetElem.textContent = new_value;
                else _._AUTHOR.querySelector(append_Selector)[append_method](frag);
            } else if (/correspond/.test(TARGET_ID) || corr_lab_add) {
                // Handle corresponding author logic
                const tempSelector = `a[data-role="${findKey}"]`;
                const correspond = metaGroup.querySelector(`div[class*="${findKey}"]`);

                if (correspond) {
                    // Add corresponding xref on current author group
                    let label = correspond.getAttribute("data-label") || "";
                    if (correspond.querySelector("sup")) {
                        label = correspond.querySelector("sup").textContent;
                    }

                    const existingLabel = metaGroup.querySelector(tempSelector);
                    if (label === "" && existingLabel) {
                        // Handle case where label is missing
                        label = existingLabel.textContent;
                    }

                    const xref_val = _.IBOX._Input_xref.value;
                    const rep_val = "," + label;

                    if (new_value === "yes") {
                        if (_._AUTHOR.querySelector(tempSelector)) {
                            debug.log("already add");
                        } else {
                            frag = _.Get_Template(find_Obj.template, {
                                frag: true,
                                label: label,
                                role: find_Obj.role,
                                type: find_Obj.role,
                                rid: correspond.id
                            });

                            // If label presented in [affiliation/notes/correspond] - show label or append empty to author name
                            if (!label) {
                                frag.querySelector("sup").remove();
                                frag.firstElementChild.setAttribute("self-close", "yes");
                            } else {
                                // Push label to xref area
                                _.IBOX._Input_xref.value = xref_val + rep_val;
                            }

                            _._AUTHOR.lastChild.before(frag.firstElementChild);
                            debug.log(findKey + "__ADDED__Updated__");
                            _Add_El = true;
                        }
                    } else {
                        _Remove_El = true;
                        _._AUTHOR.querySelectorAll(`a[data-role="${findKey}"]`).forEach(elm => {
                            elm.remove();
                            debug.log(findKey + "__REMOVED__Updated__");
                        });

                        // Update xref area
                        if (label) {
                            _.IBOX._Input_xref.value = xref_val.replace(rep_val, "");
                        }

                        // Remove highlight class
                        correspond.classList.remove("highlightAff");
                    }
                }

                Dirty = true;
            }
        } else {
            const elm = _._AUTHOR[findFun](findKey);
            if (new_value === "") {
                Dirty = old_value !== new_value;
                _Remove_El = true;
                if (_Remove_El && elm) {
                    if (["given-names", "surname"].some(id => TARGET_ID.includes(id))) {
                        elm.textContent = "";
                    } else if (typeof elm.remove === "function") {
                        elm.remove();
                    }
                }
            }
        }

        const IS_INCLUDE = _.M_SCOPE['_TC_ORDER'].hasOwnProperty(TC_ID);
        if (!IS_INCLUDE && old_value !== new_value) {
            Dirty = true;
        } else if (IS_INCLUDE && old_value === new_value && old_value !== cur_value) {
            Dirty = false;
        }

    } catch (error) {
        console.error("Event Trigger Error:", error);
    }
};


AuthorEditDialog.M_FUN.Event_Trigger = function(e, _ = AuthorEditDialog) {
    // ! THIS FN WILL BE EVENTS TRIGGER ALL ELEMENTS WHILE THIS KEY/SELECT/CLICK - IN DIALOG
    //     ? 1) ALL EVENT INFO RELATED INFORMATION STORED AT JSON FORMAT
    //     ? 2) If EVENT FIRE => GET / SET with ORG/NEW Values from all input fields
    //     ? 3) IF FILED HAS READONLY MODE - WE SHOW WARN INFO BOTTOM OF THE DIALOG
    //     ? 4) AFTER KEY EVT FIRE => NEW CONTENT GENERATE WITH TEMPLATE AND PLACE PREVIEW AREA


    try {
        const metaGroup = _._AU_MetaGroup;
        let [old_value, new_value, cur_value, Dirty, XREF_INPUT_ID] = [null, null, null, null, "author_edit_xref"];
        let TARGET_ID = e.target.id == "" && e.target.tagName == "SPAN" ? XREF_INPUT_ID : e.target.id;
        let TARGET_KEY = _.G_FUN.getKeyByValue(_.M_SCOPE._Obj_Id_Declare, ("#" + TARGET_ID));
        // ? DYNAMICALLY GET FROM JSON - TARGET
        let TARGET = _.IBOX[TARGET_KEY] ? _.IBOX[TARGET_KEY] : e.target || e.target;
        let IS_XREF = !!TARGET_ID.match(/xref/g) ? true : false;
        let [find_Obj, DEL_BK_SP] = [_.M_SCOPE['_MULTIPLE_KEY_VAL'][TARGET_ID], iKEY_EVENT_HANDLING.BKSP_SPACE_DEL_CODE.includes(e.keyCode)];
        let [FindFun, SetFun, FindQuery, TC_ID] = [find_Obj["findFun"], find_Obj["setFun"], find_Obj["findKey"], find_Obj["TC_ID"]];
        let single_aff = _['M_CONFIG'].SINGLE_AFF = metaGroup.querySelectorAll(`div.aff`).length <= 1;


        if (["focus", "focusout", "click"].includes(e.type) && (e.target.id != "")) {
            // ? onfocus|| onblur
            let DynamicField = _.M_SCOPE['_FOCUS_IN_OUT'][e.type];
            let row_4 = _.Panel.querySelector("#row_4");
            if (TARGET.hasAttribute("readonly") && TARGET_ID != XREF_INPUT_ID) {
                _.M_SCOPE.SHOW_WARN.push('A_DT_001');
            }
            if (!TARGET.closest('#row_4') && TARGET_ID != XREF_INPUT_ID) {
                row_4.classList.add("ds-none");
            }
            if (e.type.match(/focus|click/gi) && TARGET_ID == XREF_INPUT_ID && _._AG_.M_CONFIG.SHOW_CONTEXT_GROUP_AUTHOR && (!_['M_CONFIG'].SINGLE_AFF)) {
                if (!TARGET.closest('#row_4')) {
                    row_4.classList.remove("ds-none");
                    setTimeout((row_4) => {
                        row_4.classList.add("ds-none");
                    }, 20000, row_4);
                }
                return debug.log("--return-00--");
            } else if (DynamicField && TARGET.closest('#row_1') && (!TARGET.hasAttribute("readonly") || TARGET.hasAttribute("readonly") && e.type == "focusout")) {
                $(TARGET.parentElement).addClass(DynamicField['target']["add"]).removeClass(DynamicField['target']["remove"]);
                $(TARGET.parentElement).siblings().addClass(DynamicField['sibiling']["add"]).removeClass(DynamicField['sibiling']["remove"]);
                return debug.log("--return-02--");
            } else return debug.log("--return-03--");
        }
        if (e.type && e.type == "click" && TARGET.type && TARGET.type != "radio" && (e.target.id == "") && !e.target.classList.contains("label")) return debug.log("--return-04--");
        // ? get also original value
        let [fetch_Value, old_elm, cur_elm] = [FindFun.match(/querySelectorAll|querySelector/) ? (FindFun.match(/querySelectorAll/) ? (_["M_FUN"].get_xref_text) : "textContent") : FindFun, _._AU_CLONE[FindFun](FindQuery), _._AUTHOR[FindFun](FindQuery)];
        old_value = old_elm ? (fetch_Value && (typeof fetch_Value == "string") ? (fetch_Value == "textContent" ? old_elm[fetch_Value] : old_elm) : (typeof fetch_Value == "function" ? fetch_Value(old_elm) : old_elm)) : "" || "";
        // ? get also last/current value
        cur_value = cur_elm ? (fetch_Value && (typeof fetch_Value == "string") ? (fetch_Value == "textContent" ? cur_elm[fetch_Value] : cur_elm) : (typeof fetch_Value == "function" ? fetch_Value(cur_elm) : cur_elm)) : "" || "";
        // ? get also new value
        new_value = TARGET.value;
        // ? attribute based item handled here
        console.log(e.key);
        let [_Add_El, _Remove_El, frag, corr_lab_add, IS_ORCID] = [false, false, null, null, !!TARGET_ID.match(/orcid/g)];
        if (IS_ORCID) {
            TARGET.value = _.M_FUN.SPLIT_TXT_ORCID(TARGET.value);
            if (TARGET.value != "") new_value = find_Obj["prefix"].concat("", TARGET.value);
            if (TARGET.value.length > 19) {
                let code = find_Obj["warn_code"];
                if (code) code = code.split(',')[0];
                _.M_SCOPE.SHOW_WARN.push(code);
                _.M_FUN.SHOW_WARNING(_);
                return debug.log("--return-05--");
            }
        }
        // ? validate against values
        if (((new_value != "") && (old_value != new_value || cur_value != new_value)) || (single_aff && IS_XREF && new_value == "")) {
            // ? original vs current vs new values
            if (SetFun == "setAttribute") _._AUTHOR[SetFun](FindQuery, new_value);
            if (!IS_ORCID) {
                // ? handling update elements
                if (!!TARGET_ID.match(/xref/g)) {
                    let XREF_TARGET = e.target;
                    // ? Update as new element
                    if ((DEL_BK_SP || !XREF_TARGET.classList.contains("active")) && !single_aff) {
                        _._AUTHOR.querySelectorAll(FindQuery).forEach(node => {
                            let IsAvailable = _.M_SCOPE.NEW_XREF_ARR.includes(node.textContent);
                            if (IsAvailable) {

                            } else if (!IsAvailable) {
                                // ? If delete the the lab on input box
                                // node.parentElement.removeChild(node);
                                commonMethods.removeEl(node);
                            }
                        });
                    } else {
                        let xref_value = XREF_TARGET.textContent;
                        let rid = XREF_TARGET.getAttribute("rid") || "";
                        let link = metaGroup.querySelector(`div[data-label="${xref_value}"]`) || metaGroup.querySelector(`[id="${rid}"]`);

                        var IS_AVAIL = false,
                            rep_Txt = "";

                        // || (new_value.length - 1 != new_value.indexOf(xref_value))
                        if (!link && !single_aff) {
                            _.M_SCOPE.SHOW_WARN.push("A_X_002");
                            XREF_TARGET.classList.toggle("active");
                        } else {
                            let link_type = link.getAttribute("data-name");


                            if (single_aff) {
                                //? SINGLE _AFF
                                link = _._AU_MetaGroup.querySelector(`div.aff`);
                                IS_AVAIL = _._AUTHOR.querySelector(`[rid="${link.id}"]`) ? true : false;
                            }
                            [rep_Txt, Dirty, _Add_El] = [xref_value, true, true];

                            if (link_type == "corresp") {
                                corr_lab_add = true;
                                // ? Change value of the corresponding inputs
                                _.IBOX._Input__Correspond.checked = true;
                                if (find_Obj.role != "corresp") {
                                    find_Obj = _.M_SCOPE['_MULTIPLE_KEY_VAL']["author_edit_correspond"];
                                }
                            } else if (link_type != find_Obj['role']) {
                                find_Obj['role'] = link_type;
                            }

                            frag = _.Get_Template(find_Obj['template'], {
                                frag: true,
                                label: xref_value,
                                role: find_Obj['role'],
                                type: find_Obj['role'],
                                rid: link.id
                            });
                            if (link.getAttribute("data-name") == "corresp") {
                                corr_lab_add = true;
                                // ? Change value of the corresponding inputs
                                _.IBOX._Input__Correspond.checked = true;
                            }
                        }
                        if (IS_AVAIL && single_aff) {
                            return console.log("return-already-available");
                        }
                        if (frag) {
                            if (find_Obj['append_Selector'] == '.contrib') {
                                _._AUTHOR[find_Obj['append_method']](frag);
                            } else {
                                _._AUTHOR.querySelector(find_Obj['append_Selector'])[find_Obj['append_method']](frag);
                            }
                        }
                    }
                    // ? Update the value from sorting OrderLinks
                    let returnValue = _._AG_.OrderNewLink(_._AUTHOR, {
                        AuthorModule: true
                    });
                    // .replace(e.key, rep_Txt)
                    TARGET.value = returnValue ? returnValue : TARGET.value;
                }
                // ?|author-comment
                if (!!TARGET_ID.match(/degrees|suffix|prefix|name|given-names|surname/g)) {
                    Dirty = true;
                    let find = _._AUTHOR.querySelector(FindQuery);
                    frag = _.Get_Template(find_Obj['template'], {
                        frag: true,
                        data: new_value
                    });
                    if (old_value == "") {
                        _Add_El = true;
                    }
                    //? add content type for author notes only - based in input
                    if (find) find.textContent = new_value;
                    else _._AUTHOR.querySelector(find_Obj['append_Selector'])[find_Obj['append_method']](frag);
                    find = _._AUTHOR.querySelector(FindQuery);
                    // ? input specific related attribute change
                    // if (find && !!TARGET_ID.match(/author-comment/g)) {
                    //     find.setAttribute("content-type", (!!new_value.match(/decease/gi) ? "deceased" : "other"));
                    // }
                } else if (!!TARGET_ID.match(/correspond/g) || corr_lab_add) {
                    // ? YA-BUG-FIREFOX_105_19_OCT_22 || OUP_J_AUG_023/OUP_J_AUG_026
                    let tempSelector = `a[data-role="${FindQuery}"]`;
                    let correspond = _._AU_MetaGroup.querySelector(`div[class*="${FindQuery}"]`);
                    if (correspond) {
                        // ?  add corresponding xref on cur author group
                        let Lab = correspond.getAttribute("data-label") || "";
                        if (correspond.querySelector("sup")) {
                            Lab = correspond.querySelector("sup").textContent;
                        }
                        let existLab = _._AU_MetaGroup.querySelector(tempSelector);
                        if (Lab == "" && existLab) {
                            // ? 08_MAY_23  - YA - IF LABEL MISSING
                            Lab = existLab.textContent;
                        }
                        let [xref_val, rep_val] = [_.IBOX._Input_xref.value, "," + Lab];
                        if (new_value == "yes") {
                            if (_._AUTHOR.querySelector(tempSelector)) {
                                debug.log("already add");
                            } else {
                                frag = _.Get_Template(find_Obj['template'], {
                                    frag: true,
                                    label: Lab,
                                    role: find_Obj['role'],
                                    type: find_Obj['role'],
                                    rid: correspond.id
                                });
                                // ? If label presented in [affiliation/notes/correspond] - label will show either append empty the author name 
                                if (!Lab) {
                                    frag.querySelector("sup").remove();
                                    frag.firstElementChild.setAttribute("self-close", "yes");
                                } else {
                                    // ? push label at xref areas
                                    _.IBOX._Input_xref.value = xref_val + rep_val;
                                }
                                _._AUTHOR.lastChild.before(frag.firstElementChild);
                                debug.log(FindQuery + "__ADDED__Updated__");
                                _Add_El = true;
                            }
                        } else {
                            _Remove_El = true;
                            _._AUTHOR.querySelectorAll(`a[data-role="${FindQuery}"]`).forEach(elm => {
                                elm.remove();
                                debug.log(FindQuery + "__REMOVED__Updated__");
                            });
                            // ? push label at xref areas
                            if (Lab) _.IBOX._Input_xref.value = xref_val.replace(rep_val, "");
                            // ? YA-BUG_FIX_105_FIRE-FOX_19_OCT_22 || OUP_J_AUG_023
                            correspond.classList.remove("highlightAff");
                        }
                    }
                }
            } else if (IS_ORCID) {
                console.log(new_value);
            }
            // ? old_value != new_value || cur_value != new_value
            let IS_INCLUDE = _.M_SCOPE['_TC_ORDER'].hasOwnProperty(TC_ID);
            if (!IS_INCLUDE && old_value != new_value) {
                // _.M_SCOPE['_TC_ORDER'].push(TC_ID);
                Dirty = true;
            } else if ((old_value == cur_value || cur_value != new_value) && (IS_INCLUDE && old_value == new_value)) {
                Dirty = false;
            }
        } else {
            // ? re-edit Update
            let elm = _._AUTHOR[FindFun](FindQuery);
            if (new_value == "") {
                if (new_value != old_value) {
                    Dirty = true;
                    _Remove_El = true;
                } else if (new_value == old_value) {
                    Dirty = false;
                    _Remove_El = true;
                }
                if (_Remove_El && elm && (typeof elm.remove == "function" || typeof elm == "object")) {
                    let arr = (typeof elm.remove == "function") ? [elm] : elm;
                    Array.from(arr).forEach(el => {
                        if (!!TARGET_ID.match(/given-names|surname/g)) {
                            // ? default/mandatory elements retain the node
                            el.textContent = "";
                        } else {
                            el.remove();
                        }
                    });
                } else if (SetFun == "setAttribute") {
                    // ? YA-BUG_FIX_105_FIRE-FOX_19_OCT_22 || OUP_J_AUG_042
                    _._AUTHOR["removeAttribute"](FindQuery);
                }
            } else {
                // Dirty = false;
            }
        }
        debug.log(TARGET.value);
        if (Dirty) {
            _.M_SCOPE['_TC_ORDER'][TC_ID] = {
                old_value: old_value,
                new_value: TARGET.value,
                FindFun: FindFun,
                FindQuery: FindQuery,
                TC_MSG: find_Obj["TC_MSG"],
                TC_MSG_ACT: find_Obj["TC_MSG_ACT"]
            };
        } else if (Dirty == false) {

            // let idx = _.M_SCOPE['_TC_ORDER'].indexOf(TC_ID);
            // if (idx >= 0) _.M_SCOPE['_TC_ORDER'].splice(idx, 1); 

            delete _.M_SCOPE['_TC_ORDER'][TC_ID];
        }
        // ? PASS CUR ELM FOR VALIDATE PI INFORMATION TO AUTHOR_MODULE
        _.M_FUN.runPreviewXTagValidation(_);
        _.M_FUN.Validate_Inputs();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Event_Trigger', err.message);
    }
};

AuthorEditDialog.M_FUN.runPreviewXTagValidation = function(_ = AuthorEditDialog) {
    try {
        if (!_._AG_ || !_._AG_.M_CONFIG || !_._AG_.M_CONFIG.XTAG_VALIDATION) return;
        if (!_._AUTHOR || !_._AU_ContribGroup) return;
        var resolve = (typeof ResolvePreviewXTagContext !== 'undefined' &&
            ResolvePreviewXTagContext.resolvePreviewXTagContext)
            ? ResolvePreviewXTagContext.resolvePreviewXTagContext
            : null;
        if (!resolve) return;
        var ctx = resolve({
            authorEl: _._AUTHOR,
            contribGroup: _._AU_ContribGroup,
            mode: _.mode === 'insert' ? 'insert' : 'edit',
            insertAnchor: _._INSERT_ANCHOR || null
        });
        if (!ctx) return;
        _._AG_.xTagValidation(_._AU_ContribGroup, ctx);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('AuthorEditDialog.runPreviewXTagValidation', err.message);
    }
};

AuthorEditDialog.M_FUN.Validate_Inputs = function(self) {
    self = AuthorEditDialog;
    /* 
        
        */
    try {

        const allowInsertOnlyAuthor = function() {
            const dialog = getConfig('author', 'add-edit') == "dialog";
            const notallowedAuthor = getConfig('author', 'notallowed') == "yes";
            return notallowedAuthor && dialog;
        }

        let [CanInsert, highligh] = [null, function(elm, removeHighlight) {
            try {
                elm[(removeHighlight /* || elm.readOnly */ ? 'removeAttribute' : 'setAttribute')]("warn", "");
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('highligh', err.message);
            }
        }];
        let single_aff = (self._AU_MetaGroup.querySelectorAll(`div.aff`).length <= 1);
        const byPassValidation = allowInsertOnlyAuthor();
        self.M_SCOPE['_Arr_Mandatory_ELm'].forEach((key, idx, arr) => {
            let [el, IsValid, IS_XREF, IS_XREF_EMPTY] = [self.IBOX[key], false, key == "_Input_xref", false];
            let code = self.M_SCOPE['_MULTIPLE_KEY_VAL'][el.id]['warn_code'];
            if (code) code = code.split(',')[0];
            if (idx == 0) {
                // ? ORCID VALIDATE
                IsValid = el.value == "" ? true : (self.G_SCOPE.ORCID_REGEX.test(el.value) ? true : false);
            } else {
                IsValid = el.value == "" /* && !el.readOnly */ ? (false) : (true);
                // ? 08_JUL_2023 ?? Allow SINGLE AFF
                if (IS_XREF && (self['M_CONFIG'].SINGLE_AFF || single_aff || byPassValidation)) {
                    CanInsert = IsValid = true;
                } else IS_XREF_EMPTY = true;
            }
            if ((CanInsert || CanInsert == null) && IsValid) CanInsert = true;
            else CanInsert = false;
            highligh(el, IsValid);
            if (!CanInsert && (!IsValid && code)) {
                self.M_SCOPE.SHOW_WARN.push(code);
            }
            if (IsValid) {
                self.M_SCOPE.SHOW_WARN = self.M_SCOPE.SHOW_WARN.filter(item => item !== code);
            }
            // ? 03_DEC_2022 - YA - HANDLE READ-ONLY INPUT REMOVE VALIDATION
            let code_idx = self.M_SCOPE.SHOW_WARN.indexOf(code);
            if (el.readOnly && code_idx > -1) {
                if (IS_XREF && IS_XREF_EMPTY) {
                    debug.log("WARNING MANDATORY FILED");
                } else {
                    self.M_SCOPE.SHOW_WARN.splice(code_idx, 1);
                }
            }
        });
        self.IBOX._BtnOpt_Update.classList[CanInsert && Object.keys(self.M_SCOPE['_TC_ORDER']).length > 0 ? "remove" : "add"]("disabled");
        self.M_FUN.SHOW_WARNING(self);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('AuthorEditDialog.Validate_Inputs', err.message);
    }
};
AuthorEditDialog.M_FUN.TC_ORDER_Handle = function(contrib, self) {
    self = AuthorEditDialog;
    try {


        let oldStructure = self._AG_.getAuthorGroupView(self._AU_ContribGroup_Clone);
        let action = [];
        let tc_obj = {
            area: 'auth_dialog_update',
            action: "OpenDialog",
            sub_item: []
        };


        for (const [key, Obj] of Object.entries(self.M_SCOPE['_TC_ORDER'])) {
            debug.log([key, Obj]);
            let [act, temp] = [(Obj.old_value == "" && Obj.old_value != "no") ? "newly added" : "modified", []];
            if (typeof Obj.old_value == "object" && key == "author_edit_xref") {
                Array.from(Obj.old_value).forEach(el => {
                    if (el.querySelector("sup")) {
                        temp.push(el.querySelector("sup").textContent);
                    }
                });
                Obj.old_value = temp.filter(Boolean).join(",");
            } else {
                // ? YA-BUG_FIX_105_FIRE-FOX_19_OCT_22 || OUP_J_AUG_042
                act = ((["", "no"].includes(Obj.new_value)) ? Obj.TC_MSG_ACT["EMPTY"] : act);
            }
            action.push(`<li class="sub_list" data-old="${Obj.old_value}" data-author-id="${self._AUTHOR.id}">The ${Obj.TC_MSG} has been ${act} for this author.</li>`);
        }
        tc_obj.sub_item = action.join("");
        self._AG_.AG_N_TC(contrib, self._AU_ContribGroup, oldStructure, tc_obj);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('TC_ORDER_Handle', err.message);
    }
};
AuthorEditDialog.M_FUN.SHOW_WARNING = function(_ = AuthorEditDialog) {
    let {
        SHOW_WARN,
        WARN_COLLECTION
    } = _.M_SCOPE, {
        _WarnShow_Div,
        _WarnShow_Parent_Div
    } = _.IBOX;
    try {
        SHOW_WARN = _['G_FUN'].Duplicate_Array(SHOW_WARN);
        _WarnShow_Div.querySelectorAll(`[data_id]`).forEach(el => {
            el.remove();
        });
        let tempCollection = [];
        SHOW_WARN.forEach(code => {
            let txt = WARN_COLLECTION[code],
                IsFound = _WarnShow_Div.querySelector(`[data_id="${code}"]`);
            if (!IsFound && tempCollection.indexOf(txt) == -1) {
                tempCollection.push(txt);
                _.IBOX._WarnShow_Div.append(_.newElm("div", {
                    addclass: "warn",
                    text: txt,
                    setAtt: {
                        data_id: code
                    }
                }));
            }
        });
        // ? YA 27_APR_23 - MOM
        _WarnShow_Parent_Div.classList[_WarnShow_Div.childElementCount == 0 ? "add" : "remove"]("ds-none");
        _.M_SCOPE.SHOW_WARN = [];
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('AuthorEditDialog.SHOW_WARNING', err.message);
    }
};
AuthorEditDialog.M_FUN.Update_fire = async function(e, _) {
    _ = AuthorEditDialog;
    try {
        commonMethods.cleanTranslatorExtensions();
        if (_.IBOX._WarnShow_Div.childElementCount != 0) {
            let txt = _.M_SCOPE.WARN_COLLECTION.WARN_ALERT;
            return AlertNewDialog.fire('warning', "Warning", txt, 'OK', '', true, {
                override: false
            });
        }
        let ReNumberDOM = _.M_SCOPE.IS_DOM_MANIPULATE ? _['G_SCOPE'].AuthDOM : GlobalEditor.document.$;
        const isInsert = _.mode === 'insert';
        let contrib = isInsert ? ReNumberDOM.querySelector(`#${_._INSERT_ANCHOR_ID}`) :
            ReNumberDOM.querySelector(`#${_._AUTHOR.id}`);
        let [IsTrue, iEditorDoc] = [true, GlobalEditor.document];
        if (contrib) {
            try {
                if (_['M_CONFIG'].SINGLE_AFF) {
                    const hasXref = !!_._AUTHOR.querySelector('.xref');
                    if (!hasXref) {
                        const sourceXref = _._AU_ContribGroup.querySelector('.contrib > .xref');
                        if (sourceXref) {
                            const clone = sourceXref.cloneNode(true);
                            const lastPi = _._AUTHOR.querySelector('.pistart');
                            if (lastPi) {
                                lastPi.setAttribute('lastpi', '');
                                lastPi.parentNode.insertBefore(clone, lastPi);
                            } else {
                                _._AUTHOR.appendChild(clone);
                            }
                        }
                    }
                }

                $(_._AUTHOR).children('.pistart').last().attr('lastpi', '');


            } catch (err) {
                console.warn('SINGLE_AFF xref handling error:', err && err.message);
            }

            if (isInsert) {
                $(_._AUTHOR).attr({
                    'data-track-code': 'author_dialog_01',
                    'data-time': Date.now(),
                    'data-username': USER_INFO.MAIL_ID,
                    'data-rolename': USER_INFO.TRACK_ROLE_NAME
                });
                contrib.insertAdjacentElement('afterend', _._AUTHOR);
                _._AG_.last_cursor_id = _._AUTHOR.id;
            } else {
                $(_._AUTHOR).attr({
                    'data-update': 'author_dialog',
                    'data-track-code': 'author_dialog_01'
                });
                $(contrib).replaceWith(_._AUTHOR);
            }

        }
        if (!contrib) return false;
        if (isInsert) {
            const oldStructure = _._AG_.getAuthorGroupView(_._AU_ContribGroup_Clone);
            _._AG_.AG_N_TC(_._AUTHOR, _._AU_ContribGroup, oldStructure, {
                action: ADD,
                area: 'auth',
                area_sub: ''
            });
        } else {
            _.M_FUN.TC_ORDER_Handle(contrib);
        }
        if (IS_JOURNAL) {
            if (_._AG_.Auto_ReNumber_AG_AFF) {
                IsTrue = await _._AG_.LinkRenumbering(ReNumberDOM, isInsert ? ADD : 'OpenDialog');
            }
            if (IsTrue && _._AG_.M_CONFIG && _._AG_.M_CONFIG.XTAG_VALIDATION) {
                _._AG_.xTagValidation(_._AU_ContribGroup);
            }
        }


        if (_.M_SCOPE.IS_DOM_MANIPULATE) {
            $(iEditorDoc.findOne('.article-meta').$).replaceWith(ReNumberDOM.innerHTML);
            ReNumberDOM.innerHTML = '';
        }
        if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION._SNAPSHOT) {
            IMPACT_SELECTION._SNAPSHOT({
                save: true,
                unlock: true
            });
        }
        _._AG_.setCursor(iEditorDoc);
        _.closeDialog();
        AutoSaveBool = true;
        _._AG_.DOM_Auth(false);
    } catch (err) {
        _._AG_.DOM_Auth(false);
        console.warn(err.message);
        ErrorLogTrace('AuthorEditDialog.Update_fire', err.message);
    }
};
AuthorEditDialog.M_FUN.SPLIT_TXT_ORCID = function(txt, options, _) {
    try {
        /*         
            ! THIS FUNCTION - 
                ? 1) RETURN ONLY ORCID NUMBER FROM INPUT txt PARAMETER WITH SPLIT METHOD
                ? 2) ADD PREFIX `HTTPS` FOR WITH txt PARAMETER CONCAT METHOD
                ? e.g. https://orcid.org/0000-0002-1825-0097
        */
        _ = AuthorEditDialog;
        let config = _.M_SCOPE["_MULTIPLE_KEY_VAL"]["author_edit_orcid"];
        // e.g., "orcid.org/"
        var splitKey = config["split"];
        var rawPart = txt.includes(splitKey) ? txt.split(splitKey).pop() : txt;
        var digitsOnly = rawPart.split("-").join("");

        if (digitsOnly.length > 0) {
            return digitsOnly.match(/.{1,4}/g).join("-").slice(0, 19);
        } else {
            return txt;
        }

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('SPLIT_TXT_ORCID', err.message);
    }
};
AuthorEditDialog.M_FUN.COPY_FN_Template = function(_) {
    try {
        _ = AuthorEditDialog;
        if (AuthorGroupNewModule) {
            let _AG_ = AuthorGroupNewModule;
            if (!_._AG_) _._AG_ = AuthorGroupNewModule;
            if (!_.tempName) _.tempName = _AG_.tempName;
            if (!_.Get_Template) _.Get_Template = _AG_.Get_Template;
            if (!_.template || Object.keys(_.template).length == 0) _.template = Object.assign(_AG_.template, _.template);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('COPY_FN_Template', err.message);
    }
};