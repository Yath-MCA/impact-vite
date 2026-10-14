// place this line in the dialog show function - to only add the listener when the dialog is shown

// ? uncomment and place this in the dialog close/hide function to remove the listener when dialog is closed/hidden
// ? window.removeEventListener('keydown', handleKey);
/**
 *
 * @keyevent FACTORY
 */
console.log("dialog");



// ? 27_DEC_22 - HANDLE - CURSOR RESTORE TEXT-AREA - SIVA_POINT#35
function BIND_DYNAMIC_DIALOG_EVENTS(_, Obj, Option = {}) {
    try {
        if (!Option.Area || !Option.from) return debug.warn("return " + Option.Area);
        for (const [findKey, ValueObj] of Object.entries(Obj[Option.from])) {
            Option.Area.querySelectorAll(findKey).forEach(elm => {
                for (const [event, ifunction] of Object.entries(ValueObj)) {
                    if (ifunction == '') return;
                    if (typeof _[ifunction] == "function") {
                        elm[event] = _[ifunction].bind(_);
                    } else if (typeof _.M_FUN[ifunction] == "function") {
                        elm[event] = _.M_FUN[ifunction].bind(_);
                    } else if (typeof _.G_FUN[ifunction] == "function") {
                        elm[event] = _.G_FUN[ifunction].bind(_);
                    } else if (typeof ifunction == "function") {
                        elm[event] = ifunction.bind(_);
                    }
                }
            });
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('BIND_DYNAMIC_DIALOG_EVENTS', err.message);
    }
}

function CHECK_DIALOG_LAST_CURSOR_POSITION(evtTarget, Options = {}) {
    try {
        // debug.log("==CHECK_DIALOG_LAST_CURSOR_POSITION==")
        for (const key in MODULE_LIST) {
            let DIALOG = MODULE_LIST[key];
            if ("state" in DIALOG && DIALOG["state"] == 1) {
                if (commonMethods.IsVisibleElm(DIALOG['Panel']) && (DIALOG.M_SCOPE.LAST_FOCUS.IS_INPUT || evtTarget)) {
                    let target = DIALOG.M_SCOPE.LAST_FOCUS.ELM || evtTarget || null;
                    if (target) {
                        debug.log("==LAST_CURSOR_POSITION==TARGET===");
                        setTimeout((input) => {
                            commonMethods.setCaret(input);
                        }, 500, target);
                    }
                }
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('CHECK_DIALOG_LAST_CURSOR_POSITION', err.message);
    }
}

/**
 * The `dialogModule` function is a constructor function that creates a dialog module. It provides methods for initializing, showing, and closing the dialog, as well as handling events and manipulating the dialog's DOM elements.
 *
 * @param {string} _id - The ID of the dialog module.
 * @param {string} _template - The HTML template for the dialog module.
 * @param {object} [Options={}] - Additional options for the dialog module.
 * @returns {object} - An instance of the dialog module.
 *
 * @example
 * var myDialog = new dialogModule('myDialog', '<div>Dialog content</div>');
 * myDialog.init();
 * myDialog.show();
 * myDialog.closeDialog();
 */
function dialogModule(_id, _template, Options = {}) {
    this.initiated = this.FullyLoaded = false;
    this.state = 0;
    this._Id = _id;
    this._ = {
        componentString: _template
    };


    //MODULE_LIST[_id] = this;
    this.Model_DOM = document.getElementById('ModelDialogAppend');
    this.iDOM = document.getElementById(Options.DOM_ID ? Options.DOM_ID : 'aaa');
    this.DUMMY = document.getElementById('dummy-impact');
    // ? 26_APR_2023 - YA - DOM
    if (!this.iDOM && Options.DOM_ID) {
        this.iDOM = document.createElement("div");
        this.iDOM.setAttribute("id", Options.DOM_ID);
    }
    if (this.iDOM && Options.DOM_ID && this.DUMMY) {
        this.DUMMY.append(this.iDOM);
    }
    this.GetFragment = function(_String) {
        try {
            return document.createRange().createContextualFragment(_String);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('iFragment', err.message + '_' + this._Id);
        }
    };
    this.newElm = function(tag, Option) {
        try {
            let new_DOM = document.createElement(tag);
            if (Option) {
                if (Option.text) {
                    new_DOM.textContent = Option.text;
                }
                if (Option.innerHTML) {
                    new_DOM.innerHTML = Option.innerHTML;
                }
                if (Option.append) {
                    let temp = (typeof Option.append === "string") ? this.GetFragment(Option.append) : Option.append;
                    new_DOM.append(temp);
                }
                if (Option.addclass) new_DOM.classList.add(Option.addclass);
                if (Option.setAtt) this['G_FUN'].setAttr(new_DOM, Option.setAtt);
            }
            return new_DOM;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('newElm', err.message + '_' + this._Id);
        }
    };
    this.iGetElmById = function(_id, options) {
        try {
            const Elm = document.getElementById(_id);
            if (!Elm) return null;
            if (options && options.addClass) Elm.classList.add(options.addClass);
            return Elm;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('iGetElmById', err.message + '_' + this._Id);
        }
    };
    // ? 24-SEP-22 || G_ Stand GLOBAL  || M_ stand Module
    [this.IBOX, this.M_CONFIG, this.G_CONFIG, this.G_SCOPE, this.M_SCOPE, this.G_FUN, this.M_FUN] = [{}, {}, {}, {}, {}, {}, {}];
    this.MountwithUnmountComponent = function(Options = {
        unMount: false
    }) {
        try {
            let [tryComponent] = [document.getElementById(this._Id)];
            if (tryComponent && Options.unMount) {
                if (tryComponent.parentElement) {
                    // tryComponent.parentElement.removeChild(tryComponent);
                    commonMethods.removeEl(tryComponent);
                } else {
                    tryComponent.remove();
                }
                tryComponent = document.getElementById(this._Id);
                debug.log(`Component: ${tryComponent ? '' : 'removed'}  ==>` + this._Id);
            }
            if (this.Model_DOM && !tryComponent) {
                let component = this.GetFragment(_template ? _template : this._.componentString);
                if (component) {
                    this.Model_DOM.append(component);
                }
            }
            this.Panel = tryComponent = document.getElementById(_id);
            if (IS_TRACK_VIEW && /Note|track/gi.test(_id)) {
                this.Panel.querySelector(".dialog-container").remove();
            }
            debug.log(`Component: ${tryComponent ? '' : 'removed'}  ==>` + this._Id);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('MountwithUnmountComponent', err.message + '_' + this._Id);
        }
    };
    this.MountwithUnmountComponent();
    if (!this.Panel) {
        console.warn("not_load" + this._Id);
        ErrorLogTrace('NOT_LOAD', this._Id);
        return;
    }
    this.init = function(param1) {
        try {
            if (this.CAN_INIT_DEFAULT) {
                console.log(_id + " default dialog module Initiated");
            } else if (typeof IsContextMenu == "function" && !IsContextMenu(_id)) {
                return false, console.log(_id + " ** Not ** Dialog Module Initiated");
            } else console.log(_id + " Dialog Module Initiated");
            // ? 24-SEP-22 || G_ Stand GLOBAL  || M_ stand Module
            if (typeof iREF_SCOPE != "undefined") this.G_CONFIG = Object.assign(this.G_CONFIG, iREF_SCOPE);
            // ? 19-SEP-22 UPDATE
            this.Panel.querySelectorAll("input").forEach(el => {
                let form = el.closest("form");
                if (form && form.hasAttribute("spellcheck")) {
                    form.setAttribute("spellcheck", "false");
                } else {
                    el.setAttribute("spellcheck", "false");
                }
            });
            if (true) {
                // ? NOW WE ARE ADDING - WHILE INIT - NEED FIX THIS WITH CONFIG BASED
                this.G_SCOPE.DOI_Pattern_1 = /^10.\d{4,9}\/[-._;()/:A-Z0-9]+$/igm;
                this.G_SCOPE.DOI_Pattern_2 = /^10[.][0-9]{4,}[^\s"/<>]*\/[^\s"<>]+$$/igm;
                this.G_SCOPE.ORCID_REGEX = /[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]{1}/;
                this.G_SCOPE.Mail_ID_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,3}))$/;
                this.G_SCOPE.URL_REGEX = /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
                this.G_SCOPE.Multi_Mail_ID_REGEX = /(([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)(\s*(;|,)\s*|\s*$))*/;
                this.G_CONFIG.SUMMER_CONFIG = {
                    // ? https://summernote.org/deep-dive/#callbacks
                    toolbar: [
                        ['style', ['bold', 'italic', 'subscript', 'superscript']]
                    ],
                    callbacks: {
                        onInit: function(e) {
                            try {
                                console.log('Summernote is launched');
                                let dialog = this.closest(".mDialog");
                                if (dialog && MODULE_LIST[dialog.id] && MODULE_LIST[dialog.id]["M_CONFIG"]) {
                                    if (typeof MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'] == "function") {
                                        MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'](e);
                                    } else if (MODULE_LIST[dialog.id]["M_FUN"]) {
                                        if (typeof MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'] == "function")
                                            MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'](e, this);
                                    }
                                }
                            } catch (err) {
                                console.warn(err.message);
                                ErrorLogTrace('onInit', err.message);
                            }
                        },
                        onBlur: function(e) {
                            try {
                                let dialog = this.closest(".mDialog");
                                if (dialog && MODULE_LIST[dialog.id] && MODULE_LIST[dialog.id]["M_CONFIG"]) {
                                    if (typeof MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'] == "function") {
                                        MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'](e);
                                    } else if (MODULE_LIST[dialog.id]["M_FUN"]) {
                                        if (typeof MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'] == "function")
                                            MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'](e, this);
                                    }
                                }
                                var p = e.target.parentNode.parentNode;
                                if (!(e.relatedTarget && $.contains(p, e.relatedTarget))) {
                                    //$(this).parent().children('.note-editor').children('.note-toolbar').css("display", "none");
                                }
                            } catch (err) {
                                console.warn(err.message);
                                ErrorLogTrace('onBlur', err.message);
                            }
                        },
                        onFocus: function(e) {
                            try {
                                //$(this).parent().children('.note-editor').children('.note-toolbar').css("display", "block");
                                let dialog = this.closest(".mDialog");
                                if (dialog && MODULE_LIST[dialog.id] && MODULE_LIST[dialog.id]["M_CONFIG"]) {
                                    if (typeof MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'] == "function") {
                                        MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'](e);
                                    } else if (MODULE_LIST[dialog.id]["M_FUN"]) {
                                        if (typeof MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'] == "function")
                                            MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'](e, this);
                                    }
                                }
                            } catch (err) {
                                console.warn(err.message);
                                ErrorLogTrace('onFocus', err.message);
                            }
                        },
                        onEnter: function(e) {
                            try {
                                // debug.log("CANCEL FROM" + e.type);
                                // e.preventDefault();
                                // return false;
                                let dialog = this.closest(".mDialog");
                                if (dialog && MODULE_LIST[dialog.id] && MODULE_LIST[dialog.id]["M_CONFIG"]) {
                                    if (typeof MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'] == "function") {
                                        MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'](e);
                                    } else if (MODULE_LIST[dialog.id]["M_FUN"]) {
                                        if (typeof MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'] == "function")
                                            MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'](e, this);
                                    }
                                }
                            } catch (err) {
                                console.warn(err.message);
                                ErrorLogTrace('onEnter', err.message);
                            }
                        },
                        onPaste: function(e) {
                            try {
                                let dialog = this.closest(".mDialog");
                                if (dialog && MODULE_LIST[dialog.id] && MODULE_LIST[dialog.id]["M_CONFIG"]) {
                                    if (typeof MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'] == "function") {
                                        MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'](e);
                                    } else if (MODULE_LIST[dialog.id]["M_FUN"]) {
                                        if (typeof MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'] == "function")
                                            MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'](e, this);
                                    }
                                }
                            } catch (err) {
                                console.warn(err.message);
                                ErrorLogTrace('onKeyup', err.message);
                            }
                        },
                        onKeyup: function(e) {
                            try {
                                if (e.keyCode == 13) {
                                    // debug.log("CANCEL FROM" + e.type);
                                    // e.preventDefault();
                                    // return false;
                                }
                                let dialog = this.closest(".mDialog");
                                if (dialog && MODULE_LIST[dialog.id] && MODULE_LIST[dialog.id]["M_CONFIG"]) {
                                    if (typeof MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'] == "function") {
                                        MODULE_LIST[dialog.id]['SUMMER_NOTE_EVENTS_HANDLE'](e);
                                    } else if (MODULE_LIST[dialog.id]["M_FUN"]) {
                                        if (typeof MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'] == "function")
                                            MODULE_LIST[dialog.id]["M_FUN"]['SUMMER_NOTE_EVENTS_HANDLE'](e, this);
                                    }
                                }
                            } catch (err) {
                                console.warn(err.message);
                                ErrorLogTrace('onKeyup', err.message);
                            }
                        }
                    }
                };
                this.G_SCOPE.AuthDOM = document.getElementById('AuthDOM');
                // ? OUP_J_QUR_029 - Wind 10_Safari 11.1 - YA 16_NOV_22
                this.G_SCOPE.invalidExtensions = commonMethods.invalidExtensions;
                this.G_SCOPE.removeHiddenItems = commonMethods.removeHiddenItems;
            }
            if (typeof IMPACT_SELECTION != "undefined") {
                this.G_SCOPE['IMS'] = IMPACT_SELECTION;
                this.G_FUN = commonMethods;
                if (typeof IMPACT_SELECTION._SNAPSHOT == "function") {
                    this.G_FUN['_SNAPSHOT'] = this._SNAPSHOT = IMPACT_SELECTION._SNAPSHOT;
                }
                // ? ASSIGN_SHORT_CUT_DETAILS_ON KEY EVENT_MODULE
                if (this.SHORT_CUT && typeof iKEY_EVENT_HANDLING != "undefined") {
                    iKEY_EVENT_HANDLING.SHORT_CUT_KEYS_COLLECTION[this.SHORT_CUT] = this;
                }
            }
            this.G_FUN['GET_CONFIG_ITEM'] = GET_CONFIG_ITEM;
            this.G_FUN['VALIDATE_UPLOAD_FILE'] = VALIDATE_UPLOAD_FILE;
            this.G_FUN['SCROLL_FOCUS'] = function(elm) {
                try {
                    if (elm) {
                        elm.classList.remove("ds-none");
                        elm.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                        elm.focus({
                            preventScroll: true
                        });
                    }
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('init', err.message + '_' + this._Id);
                }
            };

            if (this.TOASTER_MESSAGE && Object.keys(this.TOASTER_MESSAGE).length > 0) {
                // ? 14_APR_2023 - YA - ALERT/TOASTER MESSAGE
                Object.assign(ALERT_MESSAGE, this.TOASTER_MESSAGE);
            }
            this.initiated = true;
            if (this.initLoop) this.initLoop(param1, this);
            // ! 30_MAR_2023 - NEW METHOD INVOKE CONTEXT MENU
            if (typeof this.editorListener == "function") {
                this.editorListener(GlobalEditor);
            }
            // ? 27_DEC_2022 - DYNAMIC CALL
            this.Initial_Fire_Event = function() {
                if (typeof this['AssignVar_EventLoop'] == "function") {
                    this['AssignVar_EventLoop']();
                } else if (typeof this.M_FUN['AssignVar_EventLoop'] == "function") {
                    this.M_FUN['AssignVar_EventLoop']();
                }
                BIND_DYNAMIC_DIALOG_EVENTS(this, {
                    "initLoop": {
                        // ? static element
                        ".dia_header_div .closeIcons": {
                            "onclick": 'closeDialog'
                        },
                        ".dialog-footer .cancel_btn": {
                            "onclick": 'closeDialog'
                        },
                        ".dialog-content": {
                            "onclick": "DYNAMIC_EVENT_FIRE"
                        }
                    },
                    "showLoop": {}
                }, {
                    from: 'initLoop',
                    Area: this.Panel
                });
                // ? 26_NOV_22 - YA - LABELS_FROM_CONFIG(LANG)
                this.SET_ALL_LABELS(Options, this);
                // ? 08_JUNE_2023 - DEFAULT KEYS
                this['IBOX'].headerGroup = this.Panel.querySelector('.dia_header_div');
                this['IBOX'].headerTitle = this.Panel.querySelector('.dia_header_text');
                this['IBOX'].contentGroup = this.Panel.querySelector('.dialog-content');
                this.initiated = this.FullyLoaded = true;
            };
            // ? 1798053: Usage Log - Author Activity Tracking
            var TIMER_DB = setInterval(() => {
                if (IS_EDITOR_PAGE && typeof RECORD_USER_ACTION != "undefined") {
                    RECORD_USER_ACTION.invoke(this, 'open_close_dialog', {
                        Init: !0
                    });
                    clearInterval(TIMER_DB);
                }
            }, 250);
            this.Initial_Fire_Event();
            return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('init', err.message + '_' + this._Id);
        }
    };
    this.SET_ALL_LABELS = function(Options = {}, _) {
        /*                  
            ! This Function - Set the label text value against the configuration file for all module elements with the "data-lang-lab" attribute.
                ? This will be fired upon initiating the module.
                ? Some fields will be updated while the module is showing.
               * Options.selector: This parameter searches for specific elements to set values for.
        */
        try {
            /* if (typeof _['AssignVar_EventLoop'] == "function") {
                _['AssignVar_EventLoop']();
            } else if (typeof _.M_FUN['AssignVar_EventLoop'] == "function") {
                _.M_FUN['AssignVar_EventLoop']();
            } */
            let selector = Options.selector ? Options.selector : `[data-lang-lab]`;
            // ? 26_DEC_22 - YA - SIVA_POINT#36/37 - LOADING ISSUE
            let [COLLECTION, CK_LANG, DEFAULT_LANG, CONFIG] = [_.Panel.querySelectorAll(selector), CKEDITOR.lang.detect(), 'en', null];
            if (!IMPACT.lang) return;
            CONFIG = IMPACT.lang[DEFAULT_LANG];
            if (!CONFIG) return debug.error(DEFAULT_LANG);
            Array.from(COLLECTION).forEach((el, idx, arr) => {
                let key = el.getAttribute("data-lang-lab");
                // ? If empty return
                if (!key || !CONFIG[_._Id]) return;
                let [val_1, val_2] = [CONFIG.common[key], CONFIG[_._Id][key]];
                if (val_1 || val_2) {
                    // ? common || module/dialog based labels
                    let set_val = val_1 ? val_1 : val_2;
                    if (typeof set_val != "string") {
                        // ? json format will be handle on module-based function
                        set_val = _['M_FUN'].SET_ALL_LABELS(el, {
                            "key": key,
                            "val": set_val
                        }, _);
                    }
                    if (set_val) el.innerText = set_val;
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SET_ALL_LABELS', err.message);
        }
    };
    this.DialogPosition = function(_Id) {
        try {
            Array.from(document.querySelectorAll('.mDialog:not(.ds-none), .pop_up, .ipopUp')).forEach((dialog, index, arr) => {
                if (dialog.offsetParent != null || dialog.id == _Id) {
                    _Id = (!_Id) ? (dialog.id) : (_Id);
                    let CKE = iGetElmById('cke_1_contents');
                    let IsMaxiMize = false;
                    if (CKE) IsMaxiMize = CKE.classList.contains('maxiview');
                    iGetElmById(_id).classList[IsMaxiMize ? 'add' : 'remove']('maxiview');
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('DialogPosition', err.message + '_' + this._Id);
        }
    };
    this.remove_selection = function() {
        try {
            // ?https://stackoverflow.com/questions/3169786/clear-text-selection-with-javascript
            // ? OUTSIDE EDITOR SELECTION REMOVE
            if (window.getSelection) {
                // Chrome
                if (window.getSelection().empty) {
                    window.getSelection().empty();
                    // Firefox
                } else if (window.getSelection().removeAllRanges) {
                    window.getSelection().removeAllRanges();
                }
                // IE?
            } else if (document.selection) {
                document.selection.empty();
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('remove_selection', err.message);
        }
    };
    this.show = async function(param1, param2, param3, Option = {}, self) {
        self = this;
        try {
            let canProceed = true;
            if (param1 && typeof param1 == "object" && param1.type && param1.target) {
                let _Id = param1.target.getAttribute('data-module');
                let Panel = param1.target.closest('.mDialog');
                self = MODULE_LIST[_Id ? _Id : Panel.id];
            }
            if (!self.FullyLoaded) self.init();
            if (!self.FullyLoaded) return console.warn("---MODULE_RETURN----");
            if (self.showBefore) {
                canProceed = await self.showBefore(param1, param2, param3);
                if (!canProceed) return false;
            }
            if (window.paraLock && window.paraLock._isEnabled && window.paraLock._isElementLocked) {
                const isLocked = window.paraLock._isElementLocked(IMPACT_SELECTION.NODE, {
                    alertKey: "ErrorLockedParaEdit",
                    check_closest: true
                });
                canProceed = isLocked ? false : true;
            }

            if (!navigator.onLine && self.IsDisable_OffLine) {
                TOASTER_ALERT('OffLine_Error_show', {
                    type: 'warning'
                });
                canProceed = false;
                return false;
            }
            self.OpenDialog = false;
            if (typeof iKEY_EVENT_HANDLING != "undefined") {
                self.OpenDialog = iKEY_EVENT_HANDLING.IS_DIALOG_OPEN({
                    get: true
                }, self._Id);
            }

            let REQ_DIALOG = ["LinkShareDialog", "LinkSessionRequestDialog", 'xToolTip'].includes(self._Id);
            let IsDockedDialog = self.OpenDialog && self.OpenDialog.hasAttribute("data-el-docked");

            if (self.OpenDialog && !REQ_DIALOG && !IsDockedDialog) {
                // ? Same Dialog if already - open don't need alert
                var ignoreAlertCase1 = ["SupplementaryMaterialDialog"].includes(self.OpenDialog.id) && self._Id == "NoteDialogModule";
                if (self.OpenDialog.id != self._Id && !ignoreAlertCase1) {
                    TOASTER_ALERT('Dialog_Opened', {
                        type: 'warning'
                    });
                }
                canProceed = false;
                return false;
            }
            if (!canProceed) return false;
            if (!self.Panel || !document.body.contains(self.Panel)) {
                // If `self.Panel` does not exist or is not in the DOM, reassign it
                self.Panel = document.getElementById(self._Id);
            }
            if (self.Panel) {
                // If `self.Panel` is available, remove the 'ds-none' class
                self.Panel.classList.remove('ds-none');
            } else {
                console.warn(`Element with ID ${self_Id} not found in the DOM.`);
            }
            if (self.Panel.hasAttribute('style')) {
                self.Panel.removeAttribute('style');
            }
            if ($(self.Panel).hasClass('editor-layout-docked')) {
                debug.log("editor-layout-docked");
            } else {
                $(self.Panel).draggable({
                    handle: ".dia_header_div",
                    drag: function(event, ui) {
                        var Client_React = $(ui.helper[0]).find('.dialog-content')[0].getBoundingClientRect();
                        var bottomPos = parseInt(Client_React.height) + parseInt(Client_React.top);
                        debug.log([parseInt(Client_React.x) < 0 || parseInt(Client_React.y) < 0 || window.screen.width < parseInt(Client_React.right) || document.documentElement.clientHeight < bottomPos]);
                        if (parseInt(Client_React.x) < 0 || parseInt(Client_React.y) < 0 || window.screen.width < parseInt(Client_React.right) || document.documentElement.clientHeight < bottomPos) {
                            event.stopPropagation();
                            event.preventDefault();
                            $(this).draggable('option', 'revert', true).trigger('mouseup');
                        } else {
                            $(this).draggable('option', 'revert', false);
                        }
                    }
                });
            }
            self.DialogPosition(self._Id);
            self.Panel.querySelectorAll('input').forEach((elm, idx, arr) => {
                elm.classList.remove('is-invalid', 'is-valid');
            });
            // ? 09-Jun-22
            self.remove_selection();
            if (self.showLoop) {
                if (self.canUnmountComponentWhileClose) {
                    self.Initial_Fire_Event();
                    /* if (typeof _.AssignVar_EventLoop == "function") {
                        _.AssignVar_EventLoop();
                    } */
                }
                self.showLoop(param1, param2, param3, self);
            }
            // ? 30_NOV_22 - YA - SET_LABELS FIRE
            if (self['M_CONFIG'] && self['M_CONFIG']['SET_LABEL'] && self['M_CONFIG']['SET_LABEL']['showLoop']) {
                let KEYS = self['M_CONFIG']['SET_LABEL']['showLoop'],
                    selector = '';
                if (KEYS.length == 0) return;
                Array.from(KEYS).forEach((key, idx, arr) => {
                    selector += `[data-lang-lab="${key}"]${(arr.length == (idx + 1)) ? "" : ","}`;
                });
                debug.log(selector);
                self.SET_ALL_LABELS({
                    "selector": selector,
                    Initial: true
                }, self);
            }

            // ? 15-Jun-22
            self.state = 1;
            self.Panel.focus();

            var header = self.Panel.querySelector('.dia_header_div');
            if (header) header.click();

            // YA - 04_FEB_23 - OUP_J_INF_009
            window.focus();
            // ? 1798053: Usage Log - Author Activity Tracking
            var DB_TIMER = setInterval((self) => {
                if (typeof this.RECORD_USER_ACTION != "undefined") {
                    if (typeof RECORD_USER_ACTION.Append_Only == "function") {
                        self.RECORD_USER_ACTION.Append_Only(0, {
                            remark: self._Id,
                            action: "open"
                        });
                        clearInterval(DB_TIMER);
                    }
                } else {

                }
            }, 250, this);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('dialogModule', err.message + '_' + self._Id);
        }
    };
    this.templateList = {};
    this.templateDefault = {
        'default': function(tag, Options = {}) {
            var time_stamp = (new Date()).getTime();
            var cid = commonMethods.Get_CID();
            var ACT_ORDER = 0;
            if (Options.order) {
                ACT_ORDER = Options.order;
            } else ACT_ORDER = ACTION_RECORD.GET_COUNT();
            return `<${tag} class="ice-${tag.slice(0, 3)} ice-cts-${lite_userId}" data-changedata="" data-cid="${cid}" data-last-change-time="${time_stamp}" data-time="${time_stamp}" data-userid="${lite_userId}" data-username="${USER_INFO.MAIL_ID}" data-rolename="${USER_INFO.TRACK_ROLE_NAME}" data-insert-order="${ACT_ORDER}" {{{attr}}}>{{{data}}}</${tag}>`;
        }
    };
    this.GetTemplate = function(name, parameters, _) {
        _ = this;
        try {
            parameters.ignore = (!parameters.ignore ? false : true);
            parameters.frag = (!parameters.frag ? false : true);
            parameters.alert_msg = (!parameters.alert_msg ? false : true);
            var string =
                (parameters.alert_msg ?
                    name : ('default' != name ?
                        (parameters.dtd ?
                            (this.templateList[name]['default'] ? this.templateList[name]['default'] : this.templateList[name][DOC_DTD]) :
                            (parameters.sub ? this.templateList[parameters.sub][name] : this.templateList[name])
                        ) :
                        (this.templateDefault.default(parameters.tag, parameters))
                    )
                );
            var output = Mustache.render(string, parameters);
            if (parameters.frag) {
                var frag = this.GetFragment(output);
                output = (parameters.dom ? frag.firstElementChild : frag);
            }
            if (parameters.WITH_IN_INS_DOM || parameters.FIRST_INS_DOM) {
                // ? 04_OCT_22 - UPDATED - FOR WITH IN INSERT DOM
                var INS = Mustache.render(this.templateDefault.default("insert"), parameters);
                var INS_Frag = this.GetFragment(INS);
                if (typeof output == "string") output = this.GetFragment(output) /* .firstElementChild */ ;
                /* else if (output.nodeType == 11) output = output.firstElementChild */
                // if (parameters.WITH_IN_INS_DOM || parameters.FIRST_INS_DOM) {
                Array.from(output.childNodes).forEach(el => {
                    INS_Frag.firstElementChild.append(el);
                });
                if (parameters.WITH_IN_INS_DOM) {
                    output = INS_Frag.firstElementChild;
                } else {
                    output.append(INS_Frag.firstElementChild);
                }
                // }
                if (output.nodeType == 11) output = output.firstElementChild;
            }
            return output;
        } catch (err) {
            console.warn(err.message + name);
            ErrorLogTrace('GetTemplate', err.message);
        }
    };
    this.closeDialog = function(e) {
        try {

            let canClose = true;
            let IsDirectClose = e && e.target ? true : false;
            const class_List = this.Panel.classList;

            if (typeof this.Before_closeDialog == 'function') canClose = this.Before_closeDialog();
            if (!canClose || this.Panel.classList.contains("ds-none")) return false;
            this.Panel.classList.add('ds-none');
            if (this.ReCheck_Cursor_Pos) {
                setTimeout(() => {
                    IMPACT_SELECTION.setCursor(GlobalEditor);
                }, 500);
            }
            // ? 26_APR_2023 - YA - DOM
            if (this.iDOM && this.DOM_ID) {
                this.iDOM.innerHTML = "";
            }
            // if (IS_JOURNAL) setTimeout(Math_Module.Can_trigger_MathView_Bool, 650, GlobalEditor.document.$);
            GlobalEditor.focus();
            // ? 27_DEC_22 - HANDLE - CURSOR RESTORE TEXT-AREA - SIVA_POINT#35
            this.state = 0;
            this.M_SCOPE.LAST_FOCUS = {
                IS_INPUT: false,
                INPUT_ID: null
            };
            // ? 19_JULY_2023_YA
            if (this.canUnmountComponentWhileClose) {
                this.MountwithUnmountComponent({
                    unMount: true
                });
            }
            if (typeof this.RECORD_USER_ACTION != "undefined") {
                this.RECORD_USER_ACTION.Append_Only(0, {
                    remark: this._Id,
                    action: "close",
                    info: IsDirectClose ? 'without any update' : "",
                });
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('closeDialog', err.message + '_' + this._Id);
        }
    };
    this.GET_G_DATA = function(Options) {
        try {
            let tempData = GlobalEditor.getData();
            if (Options) {
                if (Options.setStringinDOM) $(this.iDOM).html("").append(tempData);
            }
            return tempData;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_G_DATA', err.message + '_' + this._Id);
        }
    };
    this.Set_DOM_Data = function(data, Options = {}) {
        try {
            var {
                DOM,
                node
            } = Options;
            if (DOM) {
                data = data ? data : this.GET_G_DATA();
                // ? BOOKS_TNF
                if (!IS_JOURNAL && node) {
                    // if (IS_LOCAL_HOST) debugger;
                    // let IS_FRONT_MATTER = node.closest('.front-matter') ? true : false;
                    // let root = node.closest(IS_FRONT_MATTER ? ".named-book-part-body" : ".book-part");
                    // if (root) {
                    //     data = root.outerHTML;
                    // }
                }
                this.iDOM.innerHTML = '';
                this.iDOM.innerHTML = data;
            } else if (!data) {
                //GlobalEditor.setData(data);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Set_Data', err.message + '_' + this._Id);
        }
    };
    // ? 27_DEC_22 - HANDLE - CURSOR RESTORE TEXT-AREA - SIVA_POINT#35
    this.DYNAMIC_EVENT_FIRE = function(e, self) {
        try {
            self = (this && this.M_SCOPE) ? this : null;
            if (!self) {
                var dialog = e && e.target && e.target.closest ? e.target.closest('.mDialog') : null;
                self = dialog && MODULE_LIST ? MODULE_LIST[dialog.id] : null;
            }
            if (!self) return;
            self.M_SCOPE = self.M_SCOPE || {};

            let [TARGET, CONDITION] = [{
                tag: e.target.tagName,
                class: e.target.className,
                class_List: e.target.classList,
                id: e.target.id,
                type: e.target.getAttribute("type")
            }, false];
            if (e.target.closest('.closeIcons')) return;
            var textAreaIds = self.M_SCOPE.TEXT_AREA_IDs || [];
            CONDITION = (TARGET.tag == "INPUT" && TARGET.type == "text") || textAreaIds.includes(TARGET.id);
            self.M_SCOPE.LAST_FOCUS = {
                IS_INPUT: CONDITION ? true : false,
                INPUT_ID: TARGET.id,
                ELM: e.target
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('DYNAMIC_EVENT_FIRE', err.message + '_' + (this && this._Id ? this._Id : ''));
        }
    };
}

async function OnClick_SelectionChange_Dialog_Event(curElement, Options = {}, e = {}) {
    try {
        if (Options.Pre_Check) {

            let LET_CHECK_DIALOG = document.querySelectorAll(`.mDialog.w-editor-access:not(.ds-none)`);
            let [ANY_OPEN_DIALOG, DIALOG] = [LET_CHECK_DIALOG.length > 0, LET_CHECK_DIALOG[0]];

            if (ANY_OPEN_DIALOG && typeof IMPACT_SELECTION != "undefined") {
                // IMPACT_SELECTION.getInfo(GlobalEditor);
                if (MODULE_LIST[DIALOG.id] && MODULE_LIST[DIALOG.id].CLICK_EVT_SET_DELAY) {
                    setTimeout(OnClick_SelectionChange_Dialog_Event, 150);
                    return;
                }
            }
        }
        const StylePanelDOM = document.getElementById('ApplyStyleDialog'),
            CrossRefPanelDOM = document.getElementById('CrossCitationModule');
        // ? onclick editor open Dialogs vases on conditions
        if (curElement != "undefined" && e.name == "click") {
            if (curElement.getAttribute('data-class') == 'ckcommentsfull') {
                // TODO - OPEN QUERY DIALOG

            } else if ((curElement.getAttribute('data-class')) == 'pi_info') {
                var PI_JSON = {};
                Array.from(curElement.children).forEach((el) => {
                    if (el.hasAttribute('pi_id')) {
                        var pi_id = el.getAttribute('pi_id'),
                            pi_val = el.getAttribute('data-user-pi-box').split(' ').pop();
                        if (PI_JSON[pi_id] == undefined) {
                            PI_JSON[pi_id] = pi_val;
                        }
                    }
                });
                if (typeof PI_MODULE != 'undefined') {
                    PI_MODULE.show(PI_JSON, curElement);
                }
            }
        }

        // ? if Dialogs Open State

        if (curElement && typeof trackDialog != "undefined" && commonMethods.IsVisibleElm(trackDialog.Panel)) {
            trackDialog["M_FUN"].cursor_sync_with_dialog_entry(curElement, {
                ignore_editor_focus: true,
                session: true
            });
        } else if (StylePanelDOM != null && commonMethods.IsVisibleElm(StylePanelDOM)) {
            if (typeof APPLY_STYLE_MODULE != "undefined") {
                APPLY_STYLE_MODULE.showLoop();
            }
        } else if (typeof CitationNewModule != "undefined" && CrossRefPanelDOM != null && commonMethods.IsVisibleElm(CrossRefPanelDOM)) {
            CitationNewModule['M_FUN'].AddNewMethod({
                ChangeSelect: true,
                ShowLoop: false
            });
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("OnClick_SelectionChange_Dialog_Event", err.message);
    }
}
if (!Element.prototype.scrollIntoViewIfNeeded) {
    try {
        Element.prototype.scrollIntoViewIfNeeded = function(centerIfNeeded) {
            centerIfNeeded = arguments.length === 0 ? true : !!centerIfNeeded;
            var parent = this.parentNode,
                parentComputedStyle = window.getComputedStyle(parent, null),
                parentBorderTopWidth = parseInt(parentComputedStyle.getPropertyValue('border-top-width')),
                parentBorderLeftWidth = parseInt(parentComputedStyle.getPropertyValue('border-left-width')),
                overTop = this.offsetTop - parent.offsetTop < parent.scrollTop,
                overBottom = (this.offsetTop - parent.offsetTop + this.clientHeight - parentBorderTopWidth) > (parent.scrollTop + parent.clientHeight),
                overLeft = this.offsetLeft - parent.offsetLeft < parent.scrollLeft,
                overRight = (this.offsetLeft - parent.offsetLeft + this.clientWidth - parentBorderLeftWidth) > (parent.scrollLeft + parent.clientWidth),
                alignWithTop = overTop && !overBottom;

            if ((overTop || overBottom) && centerIfNeeded) {
                parent.scrollTop = this.offsetTop - parent.offsetTop - parent.clientHeight / 2 - parentBorderTopWidth + this.clientHeight / 2;
            }

            if ((overLeft || overRight) && centerIfNeeded) {
                parent.scrollLeft = this.offsetLeft - parent.offsetLeft - parent.clientWidth / 2 - parentBorderLeftWidth + this.clientWidth / 2;
            }

            if ((overTop || overBottom || overLeft || overRight) && !centerIfNeeded) {
                this.scrollIntoView(alignWithTop);
            }
        };
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('scrollIntoViewIfNeeded', err.message);
    }
}
const DIALOG_POSITION = {
    check: function() {
        try {
            //code goes here
            Array.from(document.querySelectorAll('.mDialog:not(.ds-none), .pop_up, .ipopUp')).forEach((dialog, index, arr) => {
                if (['xToolTip'].includes(dialog.id)) {
                    return;
                }
                if (dialog.offsetParent != null || !dialog.classList.contains('ds-none')) {
                    if (dialog.id); {
                        this.setView(dialog.id);
                    }
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('check', err.message);
        }
    },
    setView: function(id) {
        try {
            //code goes here
            var CKE = iGetElmById('cke_1_contents');
            var IsMaxi = CKE && CKE.classList.contains('maxiview') ? true : false;
            iGetElmById(id).classList[IsMaxi ? 'add' : 'remove']('maxiview');
            /* if(CKE&&CKE.classList.contains('maxiview')){// ? Check Maximize
                iGetElmById(id).classList.add('maxiview');
            } else {
                iGetElmById(id).classList.remove('maxiview');
            } */
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('setView', err.message);
        }
    }
};

function checkDialogPosition(id) {
    try {
        Array.from(document.querySelectorAll('.mDialog:not(.ds-none), .pop_up, .ipopUp')).forEach((dialog, index, arr) => {
            if (['xToolTip'].includes(dialog.id)) {
                return;
            }
            if (dialog.offsetParent != null || dialog.id == id || !dialog.classList.contains('ds-none')) {
                id = (id == undefined) ? (dialog.id) : (id);
                var CKE = iGetElmById('cke_1_contents');
                var IsMaxi = CKE && CKE.classList.contains('maxiview') ? true : false;
                iGetElmById(id).classList[IsMaxi ? 'add' : 'remove']('maxiview');
                /* if(document.getElementById('cke_1_contents').classList.contains('maxiview')){// ? Check Maximize
                    document.getElementById(id).classList.add('maxiview');
                } else {
                    document.getElementById(id).classList.remove('maxiview');
                } */
            }
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('checkDialogPosition', err.message);
    }
}