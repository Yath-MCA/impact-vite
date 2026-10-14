/* 

Spell Check approach for Book level content:
 
OSO Books (400+ pages)
- Input may or may not have Track changes
- Attribute insertion as SPELLCHECK DISABLED to skip all paragraphs, titles, list, quotes, references, etc...
- Open the editor
- When making changes (with TC) within the editor, change the attribute to SPELLCHECK ENABLED
- Spell Check is ON
    - Any change that is an spell error to be shown as underline
    - Clicking the bottom right should open the popup with the list of errors
- Spell Check is OFF
    - Any change that is made will not be shown until the Spell check is ON
    - Clicking the bottom right should open the popup with the list of errors
- Update -  ignore elements classnames added - 2_AUG_2025_YA
    ['contrib', 'name', 'given-names', 'pistart', 'surname', 'person-group', 'string-name', 'disp-quote']

*/
document.addEventListener('DOMContentLoaded', function(event) {
    try {
        CKEDITOR.on('instanceReady', function(ev) {
            ev.editor.on('change', function(e) {
                if (!IS_JOURNAL && iWSC.instance && iWSC.instance.isDisabled && iWSC.instance.isDisabled() == false) {
                    var para = IMPACT_SELECTION.NODE.$.closest("span,p,.p,div");

                    // List of class names to ignore
                    var ignoreClasses = ['contrib', 'name', 'given-names', 'pistart', 'surname', 'person-group', 'string-name', 'disp-quote'];

                    if (
                        para &&
                        para.hasAttribute &&
                        para.hasAttribute("data-wsc-ignore")
                    ) {
                        var classList = para.classList ? Array.from(para.classList) : [];

                        // Check if any class in the list is in ignoreClasses
                        var shouldIgnore = classList.some(cls => ignoreClasses.includes(cls));

                        if (!shouldIgnore) {
                            para.removeAttribute("data-wsc-ignore");
                        }
                    }
                }
            });

            setTimeout(() => {
                if (IS_JOURNAL && USER_INFO.ROLE_ID === ROLE_IDS.CO && IS_LIVE_DOMAIN) {
                    iWSC.SpellCheckOnOff({});
                }
            }, 7500);

        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('WSC-EDITOR-DOMContentLoaded', err.message);
    }
});

commonfn.getWordArr = function(response, opt) {
    try {
        iWSC.Get_Set_WordsinServer(opt, response);
    } catch (err) {
        console.warn(err.message);
        ErrorShareMail('getAddWordArr', err.message);
    }

};
commonfn.wsc_addWord_post = function(response, opt) {
    console.log(JSON.stringify(response));
    console.log((opt == "init") ? ('User Details Added in word collection') : ('New word inserted'));
};
// Web Spell Check Object creation
/* Here Start */
window.iWSC = {
    instance: null,
    addwrd: [],
    ignoreAllWrd: [],
    IsInit: false,
    ErrorPos: 1,
    addRemoveWord: ['addWordToUserDictionary', 'deleteWordFromUserDictionary'],
    addWordfnName: 'addWordToUserDictionary',
    delWordfnName: 'deleteWordFromUserDictionary',
    ignoreAllfnName: 'ignoreAllProblems',
    addIgnreAllWord: ['addWordToUserDictionary', 'ignoreAllProblems'],
    findQry_Spelling: '.wsc-element span.wsc-spelling-problem',
    findQry_SecondAct: '.wsc-dialog__proofreaddialog div.wsc-action-items__second-action',
    findQry_numBox: '.wsc-dialog__proofreaddialog .wsc-navigation-section__number-box',
    findQry_wrdcount: '.wsc-proofreaddialog__problem-container .wsc-wrdcount',
    findQry_probItem_desc: '.wsc-dialog__proofreaddialog .wsc-problem-item__description',
    findQry_probTxt_active: 'wsc-problem-text__dialog--active',
    uniqueNameArray: [],
    TimeVal: null,
    OpenFlag: true,
    DevDebugLocal: false,
    reTryLoaderIncreament: 1,
    UserDictionaryReady: false,
    UserDictionaryPending: null,
    LocalUserDictionaryKey: "impact_wsc_user_dictionary",
    M_SCOPE: {
        IS_CONFIG_FETCHED: false,
        SCRIPT_FILES: [
            "https://####:8443/wscservice/wscbundle/local/en/local.js",
            "https://####:8443/wscservice/wscbundle/wscbundle.js"
        ],
        CSS_FILES: [
            "https://####:8443/wscservice/wscbundle/theme/all.css"
        ]
    },
    spinner: document.createRange().createContextualFragment(`<div class="spinner-border iSpin_border-sm ml-1" role="status"></div>`),
    HandleSpinner: function(remove) {
        try {
            if (!this.triggerBtn) this.triggerBtn = iGetElmById('showSpellDiv');
            if (remove) {
                var spin = this.triggerBtn.querySelector('.spinner-border');
                if (spin && typeof spin.remove == "function") spin.remove();
            } else {
                if (this.triggerBtn) this.triggerBtn.append(this.spinner);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('HandleSpinner', err.message);
        }
    },
    getDocumentUserDictionaryName: function() {
        try {
            var docId = (typeof DOC_ID !== "undefined" && DOC_ID) ? DOC_ID : new URLSearchParams(window.location.search).get("docid");
            docId = String(docId || "").trim();
            if (!docId) return "";
            return docId;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getDocumentUserDictionaryName', err.message);
            return "";
        }
    },
    applyDocumentUserDictionaryConfig: function() {
        try {
            var dictionaryName = this.getDocumentUserDictionaryName();
            if (!dictionaryName) return "";

            window.WEBSPELLCHECKER_CONFIG.userDictionaryName = dictionaryName;
            window.WEBSPELLCHECKER_CONFIG.userDictionaryKey = dictionaryName + "_wsc_words";
            window.WEBSPELLCHECKER_CONFIG.userDictionaryNameKey = dictionaryName + "_wsc_name";
            return dictionaryName;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('applyDocumentUserDictionaryConfig', err.message);
            return "";
        }
    },
    ensureDocumentUserDictionary: function() {
        try {
            if (IS_JOURNAL) {
                return Promise.resolve(false);
            }

            var dictionaryName = this.applyDocumentUserDictionaryConfig();
            var instance = this.instance || (window.WEBSPELLCHECKER && WEBSPELLCHECKER.getInstances && WEBSPELLCHECKER.getInstances()[0]);

            if (!dictionaryName || !instance) {
                return Promise.resolve(false);
            }

            if (typeof instance.setUserDictionaryName === "function") {
                instance.setUserDictionaryName(dictionaryName);
            }

            if (this.UserDictionaryReady) {
                return Promise.resolve(true);
            }

            if (this.UserDictionaryPending) {
                return this.UserDictionaryPending;
            }

            try {
                var wscWordKey = (typeof instance.getOption === "function" && instance.getOption("userDictionaryKey")) || window.WEBSPELLCHECKER_CONFIG.userDictionaryKey;
                if (wscWordKey) window.localStorage.setItem(wscWordKey, "array<$>");
            } catch (storageErr) {
                console.warn(storageErr.message);
            }

            var self = this;
            var sandbox = instance._sandbox || instance.sandbox;

            this.UserDictionaryPending = new Promise((resolve) => {
                if (!sandbox || typeof sandbox.publish !== "function") {
                    self.UserDictionaryReady = true;
                    self.UserDictionaryPending = null;
                    resolve(true);
                    return;
                }

                // Check if dictionary already exists
                sandbox.publish("getUserDictionary", {
                    name: dictionaryName,
                    onSuccess: function(response) {
                        console.log("Dictionary already exists:", response);
                        self.UserDictionaryReady = true;
                        self.UserDictionaryPending = null;
                        resolve(true);
                    },
                    onFailure: function(error) {
                        console.log("Dictionary not found. Creating...");
                        // Dictionary doesn't exist, create it
                        sandbox.publish("createUserDictionary", {
                            name: dictionaryName,
                            onSuccess: function(response) {
                                console.log("Dictionary created:", response);
                                self.UserDictionaryReady = true;
                                self.UserDictionaryPending = null;
                                resolve(true);
                            },
                            onFailure: function(err) {
                                console.error("Create failed:", err);
                                self.UserDictionaryReady = true;
                                self.UserDictionaryPending = null;
                                resolve(true);
                            }
                        });
                    }
                });
            });

            return this.UserDictionaryPending;

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ensureDocumentUserDictionary', err.message);
            return Promise.resolve(false);
        }
    },
    getSpellingPrblm: function(selector, returnCount = true) {
        try {

            var findings = $(GlobalEditor.document.find(selector ? selector : this.findQry_Spelling).$);
            return returnCount ? findings.length : findings;

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getSpellingPrblm', err.message);
        }
    },
    getWordsJSON: function(a) {
        try {
            //delWordfnName addWordfnName
            let db_coll = this.addRemoveWord.includes(a._type) ? 'wsc_addWord' : 'wsc_ignoreAllWord';
            let temp_obj = {
                "tbl": db_coll,
                "find": {
                    "username": USER_INFO.MAIL_ID
                }
            };
            if (a._type == this.ignoreAllfnName)
                temp_obj.find.docid = DOC_ID;
            if (a.init)
                temp_obj.length = 5000,
                temp_obj.sort = {},
                temp_obj.filter = ['wrd_data'];
            return temp_obj;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getWordsJSON', err.message);
        }
    },
    setWordJSON: function(a, arr) {
        try {
            let tempJSON = this.getWordsJSON(a);
            // ! 25_MAR_2023 - HANDLE COMMON KEYS GLOBAL METHOD
            tempJSON.update = Object.assign({
                "wrd_data": arr,
                "username": USER_INFO.MAIL_ID,
                "recordtype": a._type,
                "word": a.word,
                "problemType": a.problemType
            }, GET_JSON("default"));
            return tempJSON;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('setWordJSON', err.message);
        }
    },
    ignoreWord: function() {
        try {
            return JSON.parse(localStorage.getItem("wsc_IGNWRD_" + DOC_ID));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ignoreWord', err.message);
        }
    },
    wordCheck: function(word) {
        try {
            const ignored = this.ignoreWord() || [];
            const added = this.addwrd || [];

            // Return false if word matches any ignored or added word
            if (ignored.includes(word) || added.includes(word)) {
                console.log("Matched exact:", word);
                return false;
            }
            debug.log("ignored-added-inculde");
            return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("wordCheck", err.message);
            // safer fallback
            return false;
        }
    },
    getlocalStoageFormat: function(arr) {
        try {
            return 'array<$>'.concat(arr.join(','));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getlocalStoageFormat', err.message);
        }
    },
    Get_Set_WordsinServer: function(a, response) {
        try {
            /*  
            ? a = object response
            node: span.wsc-spelling-problem
            problemType: "spelling"
            word: "ardiogenic"
            ? _type: "addWordToUserDictionary"
            ? _type: "ignoreAllProblems"
            */
            if (!response) {
                // ? get list of addword from db
                commonfn.callajax(this.getWordsJSON(a), 'getWordArr', API_GET_ADMINDOCS, a);
            } else if (response) {
                // ? setMethod
                let IsAdd = this.addIgnreAllWord.includes(a._type);
                let IsRemove = a._type == this.delWordfnName;
                var tempListArray = [];
                if (response.data.length) {
                    tempListArray = response.data[0].wrd_data;
                    let Index = tempListArray.indexOf(a.word);
                    if (a.word && IsAdd) {
                        // ? store db ignore all and Add Word
                        tempListArray.push(a.word);
                    } else if (IsRemove && Index != -1) {
                        // ? remove from db
                        tempListArray.splice(Index, 1);
                    }
                } else if (a.word && IsAdd) {
                    tempListArray.push(a.word);
                }
                // ? set add/ignore word db with
                if (a.word)
                    commonfn.callajax(this.setWordJSON(a, tempListArray), 'wsc_addWord_post', API_FIND_UPDATE_INSERT);
                if (localStorage.getItem("wsc_IGNWRD_" + DOC_ID) == null) {
                    localStorage.setItem("wsc_IGNWRD_" + DOC_ID, '[]');
                }
                // ? adding local object
                let _IGNWRD_ = JSON.parse(localStorage.getItem("wsc_IGNWRD_" + DOC_ID) || []);
                if (this.addRemoveWord.includes(a._type)) {
                    this.addwrd = tempListArray;
                    window.localStorage.setItem(this.LocalUserDictionaryKey, ('array<$>'.concat(tempListArray.join(',')) + ',' + _IGNWRD_.join(',')));
                } else {
                    this.ignoreAllWrd = tempListArray;
                    window.localStorage.setItem("wsc_IGNWRD_" + DOC_ID, JSON.stringify(tempListArray));
                    window.localStorage.setItem(this.LocalUserDictionaryKey, (localStorage.getItem(this.LocalUserDictionaryKey) + ',' + _IGNWRD_.join(',')));
                    var temparrnew = iWSC.uniqueNameArray.concat(_IGNWRD_);
                    window.localStorage.setItem("wsc_IGNWRD_" + DOC_ID, JSON.stringify(temparrnew));
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Get_Set_WordsinServer', err.message);
        }
    },
    addLocal: function(a, c, ths) {
        try {
            var localIgnore = this.ignoreWord();
            var tempArray = localIgnore == null ? jQuery.makeArray(a.word) : localIgnore.push(a.word);
            window.localStorage.setItem("wsc_IGNWRD_" + DOC_ID, JSON.stringify(tempArray));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('addLocal', err.message);
        }
    },
    showContent: function(a, e) {
        try {
            // $(GlobalEditor.document.find(this.findQry_Spelling).$).length- $(GlobalEditor.document.find(".wsc-ignored-problem").$).length
            var errCount = this.getSpellingPrblm() - this.getSpellingPrblm(".wsc-ignored-problem");
            if (typeof a == "number" || a.name == "problem-item") {
                // ? set suggestion count
                if (typeof a == "number") this.ErrorPos = a;
                $(this.findQry_numBox).text(parseInt(this.ErrorPos) + ' of ' + errCount);
            } else if (a.type == 'spelling') {
                // ? OUP_J_ SP_009 Next and Previous Count update
                this.WSC_Editor_UI_Update(errCount);
                // ? next click
                if (e == 'next') {
                    if (this.ErrorPos != errCount) this.ErrorPos++;
                    else this.ErrorPos = 1;
                    // ? prev click
                } else {
                    if (this.ErrorPos == 1) this.ErrorPos = errCount;
                    else this.ErrorPos--;
                }
                return;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('showContent', err.message);
        }
    },
    WSC_Editor_UI_Update: function(a) {
        try {
            let WSC_Count = document.getElementsByClassName('wsc-button wsc-button--clear wsc--focusable wsc-badge__label-button wsc-badge__button');
            if (WSC_Count) {
                let first = WSC_Count[0].querySelector(".wsc-button__text");
                if (first && first.innerHTML && first.innerHTML.toString() != a.toString()) {
                    first.innerHTML = a;
                    if (typeof WSC_Count.setAttribute == "function") {
                        WSC_Count.setAttribute("aria-label", "Suggestions found: " + a);
                        WSC_Count.setAttribute("title", "Suggestions found: " + a);
                    }
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('WSC_Editor_UI_Update', err.message);
        }
    },
    wordCountUpdate: function(a) {
        try {
            var totalarr = [];
            var counts = {};
            var dom_Find_Spell = this.getSpellingPrblm(null, false);
            $(dom_Find_Spell).each(function(ind, val) {
                totalarr.push($(this).attr('data-spelling-word').toLowerCase());
            });
            totalarr.forEach(function(x) {
                counts[x] = (counts[x] || 0) + 1;
            });
            // ? here handling UI changes from SRINI
            $(this.findQry_wrdcount).text(counts[a._templateData.text.toLowerCase()]);
            $(this.findQry_SecondAct)[counts[a._templateData.text.toLowerCase()] > 1 ? 'show' : 'hide']();
            $(this.findQry_probItem_desc).text('Possible spelling');
            if ($(dom_Find_Spell).hasClass(this.findQry_probTxt_active))
                this.showContent(a);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('wordCount', err.message);
        }
    },
    /**
     * Called from WSC DOMChangesListener after periodicalChecking.
     * Refreshes badge + dialog "N of M" counter (safe no-op if dialog not open).
     */
    dialogCustomUpdates: function() {
        try {
            var errCount = this.getSpellingPrblm() - this.getSpellingPrblm(".wsc-ignored-problem");
            this.WSC_Editor_UI_Update(errCount);
            if (document.querySelector(this.findQry_numBox) && typeof this.ErrorPos === "number") {
                this.showContent(this.ErrorPos);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('dialogCustomUpdates', err.message);
        }
    },
    ChangeDialogState: function(option) {
        try {
            option = option ? option : ({
                close: true,
                IsHidden: false,
                timer: false
            });
            if (!!document.getElementsByClassName('wsc-dialog').length) {
                var div = document.getElementsByClassName('wsc-dialog')[0];
                if (option.IsHidden) {
                    return div.classList.contains('wsc--hidden');
                } else if (option.close || option.timer) {
                    if (option.timer && this.TimeVal) {
                        clearTimeout(this.TimeVal);
                    }
                    div.classList.add('wsc--hidden');
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('WSC_ChangeDialogState', err.message);
        }
    },
    ScriptLoader: function(async = true) {
        try {
            debug.log("stage-4-1-spell-check");
            this.applyDocumentUserDictionaryConfig();
            let scriptEle = document.createElement("script");
            let src_line = `https://${{ SPELLCHECK_HOST }}$:8443/wscservice/wscbundle/wscbundle.js`;
            scriptEle.setAttribute("src", src_line);
            scriptEle.setAttribute("type", "text/javascript");
            scriptEle.setAttribute("async", async);
            if (document.querySelectorAll("[src='" + src_line + "']").length == 0) {
                document.head.appendChild(scriptEle);
            }
            // ? success event
            scriptEle.addEventListener("load", () => {
                try {
                    console.log("Web Spell Check JS loaded . . .");
                    this.toggleSwitchOnOff({
                        force: true
                    });
                    debug.log("stage-4-3-spell-check");
                } catch (error) {}
            });
            // ? error event
            scriptEle.addEventListener("error", (ev) => {
                console.log("Error on loading file", ev);
                debug.log("stage-4-4-spell-check");
                if (iWSC.reTryLoaderIncreament > 10)
                    return;
                setTimeout(() => {
                    iWSC.reTryLoaderIncreament++;
                    iWSC.ScriptLoader();
                }, 2500);
            });
            debug.log("stage-2-spell check");
            this.Init();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ScriptLoader', err.message);
        }
    },
    getNameFromDocument: function(editor) {
        try {
            debug.log("stage-4-spell-check");
            this.FETCH_CONFIG();

            var self = this;
            if (!this["M_SCOPE"].IS_CONFIG_FETCHED) {
                setTimeout(function() {
                    self.getNameFromDocument(GlobalEditor);
                }, 1500);
                return;
            }
            this.ScriptLoader();

            var selectors = '.surname, .given-names';
            var results = [];

            if (GlobalEditor && GlobalEditor.document && typeof GlobalEditor.document.find === 'function') {
                var found = GlobalEditor.document.find(selectors);
                if (found && found.$) {
                    results = found.$;
                } else if (found) {
                    results = found;
                }
            } else {
                results = document.querySelectorAll(selectors);
            }

            if (!iWSC.uniqueNameArray) {
                iWSC.uniqueNameArray = [];
            }

            $(results).each(function() {
                iWSC.uniqueNameArray.push($(this).text());
            });
            iWSC.uniqueNameArray = commonMethods.Duplicate_Array(iWSC.uniqueNameArray);
            window.localStorage.setItem("wsc_IGNWRD_" + DOC_ID, JSON.stringify(iWSC.uniqueNameArray));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getNameFromDocument', err.message);
        }
    },
    toggleSwitchOnOff: async function(Options = {}) {
        try {
            Options.force = Options.force || false;
            debug.log("stage-5-spell-check");

            if (Options.reset == true) {
                this.resetandStore();
                return;
            }
            if (typeof WEBSPELLCHECKER === 'undefined') {
                setTimeout(() => {
                    this.toggleSwitchOnOff(Options);
                }, 1500);
                return;
            } else {
                if (typeof WEBSPELLCHECKER.getInstances == "function") {
                    let temp = WEBSPELLCHECKER.getInstances();
                    if (temp[0])
                        this.instance = temp[0];
                    if (!this.instance) {
                        setTimeout(() => {
                            this.toggleSwitchOnOff(Options);
                        }, 500);
                        return;
                    }
                }
            }
            if (typeof this.instance.isDisabled == 'function' && this.instance.isDisabled()) {

                if (typeof this.instance.enable == 'function') {

                    this.instance.enable();

                } else return;
                if (!this.IsInit) {
                    this.Init();
                } else {
                    // if (!IS_JOURNAL) this.updataeBooksContent();
                }
                // ? auto open after on
                this.TimeVal = true;
                this.TimeVal = setTimeout(() => {
                    this.TimeVal = false;
                    iWSC.instance.openDialog();
                    this.OpenFlag = false;
                    $('.wsc-problem-checking').show();
                    $('.wsc-problems-count .wsc-badge--checking').show();
                    $('.wsc-problems-count .wsc-text-box').hide();
                }, 10000);
                this.HandleSpinner(!0);
                this.butStateChange();
            } else {
                // for disable state
                if (Options.force) {
                    setTimeout(() => {
                        this.toggleSwitchOnOff(Options);
                    }, 500);
                    return;
                }
                if (typeof this.instance.disable == 'function')
                    this.instance.disable();
                else {}
                this.ChangeDialogState({
                    timer: true
                });

            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('toggleSwitchOnOff', err.message);
        }
    },
    butStateChange: function(IsOff) {
        try {
            if (IsOff == undefined) {
                if (typeof this.instance.isDisabled == 'function') {
                    IsOff = this.instance.isDisabled();
                }
            }
            const IMG = this.triggerBtn.querySelector('img');
            this.triggerBtn.classList[IsOff ? ('add') : ('remove')]('hide');
            IMG.src = `assets/images/svg/mainPage/MenuTrack${IsOff ? 'OFF' : 'ON'}.svg`;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('butStateChange', err.message);
        }
    },
    SpellCheckOnOff: function(event = {}, Option) {
        try {
            Option = Option ? Option : ({
                init: false
            });
            debug.log("stage-1-spell-check");
            this.HandleSpinner();
            var CanShow = false;
            if (!IS_ONLINE) {
                if (this.instance && typeof this.instance.isDisabled == 'function' && !this.instance.isDisabled()) {
                    this.instance.disable();
                    CanShow = true;
                    this.butStateChange(false);
                }
                if (CanShow || !event)
                    TOASTER_ALERT('iWSC_OffLineError', {
                        type: 'warning'
                    });
                return;
            }
            if (!this.instance && !Option.init) {
                // Re-initiate spell check if not enabled. - 29_DEC_22_AN
                this.getNameFromDocument(GlobalEditor);
                GlobalEditor.focus();
                return;
            } else if (Option.init) {
                this.Init();
                return;
            }

            this.toggleSwitchOnOff();
            this.butStateChange();
        } catch (err) {
            ErrorLogTrace('SpellCheckOnOff', err.message);
            console.log(err.message);
        }
    },
    iIgnoreAllWrd: function(a, c, ths) {
        try {
            /* if(a.problemType=='spelling'){
                    ignoreTxt=Add_IgnoreDB.addLocal(this,a);
                    var jsondata = { "tbl": "ingWord", "find": { "docid": DOC_ID}};
                    Add_IgnoreDB.ingDB(ignoreTxt,jsondata);
                    }
            } */
            var ignoreTxt = a.word;
            var ignwrd = this.ignoreWord();
            if (a.problemType == 'spelling') {
                this.addLocal(a, c, ths);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('iIgnoreAll', err.message);
        }
    },
    FETCH_CONFIG: function() {
        /*
            ? 05_OCT_2022 - GET VALUES FROM CONFIG
        */
        try {
            let OBJ = GET_CONFIG_ITEM(`item[name="Math_WSC"]`, {
                CONVERT_JSON: true,
                children: true,
                attr: true,
                hex2string: false,
                keyUpperCase: false
            });
            Object.assign(this["M_SCOPE"], OBJ);
            window.WEBSPELLCHECKER_CONFIG['ignoreClasses'] = this["M_SCOPE"]["ignore"].split(",");
            this["M_SCOPE"].IS_CONFIG_FETCHED = true;
            debug.log("stage-4-0-spell-check");
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FETCH_CONFIG', err.message);
        }
    },
    Init: function() {
        try {
            debug.log("stage-4-5-spell-check");
            let temp1 = this.getWordsJSON({
                _type: 'addWordToUserDictionary',
                init: true
            });
            let temp2 = this.getWordsJSON({
                _type: 'ignoreAllProblems',
                init: true
            });
            commonfn.callajax(temp1, 'getWordArr', API_GET_DOCS, {
                _type: 'addWordToUserDictionary',
                init: true
            });
            commonfn.callajax(temp2, 'getWordArr', API_GET_DOCS, {
                _type: 'ignoreAllProblems',
                init: true
            });
            window.localStorage.setItem("wsc_lang", "string<$>en_US");
            this.applyDocumentUserDictionaryConfig();

            // if (IS_LOCAL_HOST) this.showSpellCheckDialog();
            // if (!IS_JOURNAL) this.updataeBooksContent();
            this.IsInit = true;
            debug.log("stage-3-spell-check");
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Init', err.message);
        }
    },
    IsFullyLoad: function() {
        try {
            //this.ChangeDialogState();
            /* if(!!document.getElementsByClassName('wsc-dialog').length)document.getElementsByClassName('wsc-dialog')[0].classList.add('wsc--hidden')
              (!!document.getElementsByClassName('wsc-dialog').length&&!!document.getElementsByClassName('wsc-dialog')[0].classList.contains('wsc--hidden') )
            */
            if ((iWSC.instance._sandbox.getOption("isProofreadInDialogActive") == false || this.ChangeDialogState({
                    IsHidden: true
                })) && this.OpenFlag) {
                this.OpenFlag = false;
                this.instance.openDialog();
            }
            $('.wsc-problems-count .wsc-badge--checking, .wsc-problem-checking').hide();
            $('.wsc-problems-count .wsc-text-box').show();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('IsFullyLoad', err.message);
        }
    },

    // Function to show the spell check dialog
    async showSpellCheckDialog() {
        // if (!window.spellCheckDialog) {
        //     await registerAndMonitorModules(window.moduleRegistry, [{
        //         name: 'WebSpellPopupDialog',
        //         path: './spell_check/index.js',
        //         type: 'ondemand',
        //         templatePath: '',
        //         dependencies: [],
        //         trackView: false
        //     }]);
        //     window.spellCheckDialog = await moduleRegistry.getModule("WebSpellPopupDialog");
        // }

        // $(window.spellCheckDialog.panel).css('opacity', '1').show();
    },
    updataeBooksContent: function() {
        /* 
            Adding ignore attribute to all the content under xmlcontentroot and then removing it for the changes made by copyeditor (TC) so that spell check will work only for the changes made by copyeditor and not for the existing content.
        
        */

        const rootDoc = GlobalEditor.document.$;
        const prefix = "[id='xmlcontentroot']";
        const $all = $(rootDoc).find(`${prefix} *`);
        let $corrections = $(rootDoc).find(`${prefix} del, ${prefix} insert`);

        $corrections = $corrections.filter(function() {
            return $(this).attr("data-username") !== "copyeditor";
        });

        // Ignore everything under xmlcontentroot

        $all.attr("data-wsc-ignore", "1");

        if ($corrections.length > 0) {
            // Step 1: Remove from <insert>, <delete>, and their children

            $corrections.removeAttr("data-wsc-ignore");
            $corrections.find("[data-wsc-ignore='1']").removeAttr("data-wsc-ignore");

            // Step 2: Remove from closest parent with data-wsc-ignore
            $corrections.each(function() {
                const $node = $(this);
                const first = $node.parents('[data-wsc-ignore]').first();
                const classAttr = (first.attr("class") || "");

                if (/\b(p|caption|title)\b/i.test(classAttr)) {
                    first.removeAttr("data-wsc-ignore");
                }
            });
        }

    },
    resetandStore: function() {
        try {
            this.editor = window.GlobalEditor || window.CKEDITOR.instances.maineditor;

            // this.IsInit = false;

            this.butStateChange(true);

            $('.wsc-header-close .wsc-button').click();

            if (window.iWSC.instance.disable) window.iWSC.instance.disable();
            if (window.iWSC.instance.destroy) window.iWSC.instance.destroy();

            this.editor.document.find(`[data-wsc-ignore="0"],[data-wsc-ignore="1"]`).toArray().forEach((el, index, array) => {
                el.removeAttributes(['data-wsc-ignore']);
            });

            window.WEBSPELLCHECKER_CONFIG.container = document.querySelector(".cke_wysiwyg_frame");
            this.applyDocumentUserDictionaryConfig();
            window.iWSC.instance = WEBSPELLCHECKER.init(window.WEBSPELLCHECKER_CONFIG);

            setTimeout(() => {
                this.toggleSwitchOnOff();
            }, 2500);

        } catch (error) {

        }
    },
    postReplace: function() {
        try {
            var sel = this.editor.getSelection();
            var range = sel.getRanges()[0];
            var node = range.startContainer;
            var startEl = sel.getStartElement();
            if (startEl && typeof startEl.getAttribute === "function") {
                var dataTime = startEl.getAttribute("data-time");
                var prev = startEl.getPrevious();
                if (prev && prev.getAttribute("data-time") == dataTime) {
                    startEl.setAttribute('data-group-action', 'wsc');
                    startEl.setAttribute('data-track-code', 'replace-text-wsc');
                    prev.setAttribute('data-group-action', 'wsc');
                    prev.setAttribute('data-track-code', 'replace-text-wsc');
                }
            }
        } catch (err) {

        }
    },
};
window.WEBSPELLCHECKER_CONFIG = {
    // "userDictionaryName": DOC_ID,
    // "customDictionaryIds": '101076',
    "autoSearch": true,
    //"serviceId": 'It2pI6CcPZ03dB5',
    "autoDestroy": false,
    "autocorrect": false,
    "serviceProtocol": "https",
    "servicePort": "8443",
    "serviceHost": `{{SPELLCHECK_HOST}}`,
    "servicePath": "wscservice/api",
    "enableAutoSearchIn": ['.cke_wysiwyg_frame'],
    "removeBranding": true,
    "enableGrammar": false,
    "lang": "en_US",
    "theme": "default",
    "localization": "en",
    "enableBadgeButton": true,
    "ignoreAllCapsWords": true,
    "ignoreDomainNames": true,
    "disableDictionariesPreferences": true,
    "ignoreClasses": [],
    "ignoreAttributes": ["data-user-comment-box", "data-wsc-ignore", "abstract-type"],
    "enableLanguagesInBadgeButton": false,
    // "settings",
    "actionItems": ["ignore", "ignoreAll", "addWord", "proofreadDialog"],
    onLoad: async function(instance) {
        iWSC.instance = instance;
        if (IS_JOURNAL) {
            if (USER_INFO.ROLE_ID === ROLE_IDS.CO) {
                iWSC.SpellCheckOnOff({});
            } else {
                instance.disable();
            }
        } else {
            await iWSC.ensureDocumentUserDictionary();
            instance.disable();
        }
    }
};