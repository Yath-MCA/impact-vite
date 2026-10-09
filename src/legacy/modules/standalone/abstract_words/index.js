// AbstractWordCounter.js

class AbstractWordCounter extends BaseModule {
    constructor(name, subFolder, options = {}) {
        super(name, subFolder, options);
        this.elements = {
            minCountElm: null,
            maxCountElm: null,
            absCountElm: null
        };
        this.dialogElm = {
            minWords: null,
            maxWords: null,
            absWords: null
        };
        this.ABS_WORD_RESTRICT_CLIENT = {
            LWW: true,
            OUP: false,
            NIHR: false,
            TNF: false,
            PLOS: false,
            Intellect: false,
            BRILL: false
        };
        this.editorFooter = document.getElementById("abstractCounts");
        this.footerTemplate = null;
        this.footerElm = {
            absWords: null,
            minWords: null,
            maxWords: null
        };
        this.isJournalAbsWord = false;
        this.regex_Space_Split = /\s+/gi;
        this.regex_Space_Add = /\.([A-z]+\s)/g;
    }

    initialize() {
        this.initLoop();
    }

    shouldEnableAbsWordRestrict() {
        try {
            if (!this.ABS_WORD_RESTRICT_CLIENT[SHARED_KEY.client]) {
                return false;
            }
            return GET_TYPE_CONFIG_QUERY('abstract', 'wordrestrict', {
                journalBased: true
            }) == 'true';
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('shouldEnableAbsWordRestrict', err.message);
            return false;
        }
    }

    initLoop() {
        if (!this.shouldEnableAbsWordRestrict()) {
            this.isJournalAbsWord = false;
            return;
        }
        this.initializeElm();
        this.updateCountsFromConfig();
        this.getCurrentAbsWordCount();
        this.appendEditorMenu();
    }

    showLoop() {
        try {
            if (!this.shouldEnableAbsWordRestrict()) {
                this.isJournalAbsWord = false;
                return;
            }
            this.updateCountsFromConfig();
            this.getCurrentAbsWordCount();
            this.openClosedDialog();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Abstract_Show_Loop', err.message);
        }
    }

    GET_ABS_ARTICLE_INFO(Area, docType) {
        try {
            if (J_CONFIG.querySelector(Area)) {
                var root = J_CONFIG.querySelector(Area);
                let articleType = root.querySelector(`[article-type*="${docType}"]`);
                return articleType;
            }
        } catch (err) {
            console.warn(err.message + Area);
            ErrorLogTrace('GET_TYPE_CONFIG_QUERY', err.message);
        }
    };

    openClosedDialog() {
        try {
            let OpenDialog = false;
            let dialgElm = this.Panel;
            if (typeof iKEY_EVENT_HANDLING !== "undefined") {
                OpenDialog = iKEY_EVENT_HANDLING.IS_DIALOG_OPEN({
                    get: true
                }, this.Panel.id);
            }
            let isLinkShareDialog = ["LinkShareDialog", "LinkSessionRequestDialog"].includes(this.Panel.id);
            if (OpenDialog && !isLinkShareDialog) {
                if (OpenDialog.id != this.Panel.id) {
                    TOASTER_ALERT("Dialog_Opened", {
                        type: "warning"
                    });
                }
                return false;
            }
            if (this.Panel) {
                this.Panel.classList.remove("ds-none");
            } else {
                console.warn(`Element with ID ${this.Panel.id} not found in the DOM.`);
            }

            if (!this.Panel.classList.contains("ds-none")) {
                setTimeout(() => {
                    this.closeDialog();
                }, 15000);
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('openClosedDialog', err.message);
        }
    }

    appendEditorMenu() {
        try {
            let absConfig = I_CONFIG.querySelector(`[name="Abstruct"]`);
            if (absConfig.hasAttribute('showStatistics') && absConfig.getAttribute('showStatistics') && this.isJournalAbsWord) {

                let statisticsMenu = document.getElementById('StatisticsMenu');
                statisticsMenu.classList.contains('ds-none') ? statisticsMenu.classList.remove('ds-none') : null;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('appendEditorMenu', err.message);
        }
    }

    closeDialog() {
        try {
            if (this.Panel.classList.contains("ds-none")) {
                return;
            }
            this.Panel.classList.add("ds-none");
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('closeDialog', err.message);
        }
    }

    updateCountsFromConfig() {
        try {
            if (this.ABS_WORD_RESTRICT_CLIENT[SHARED_KEY.client]) {
                let isWordRestrict = GET_TYPE_CONFIG_QUERY('abstract', 'wordrestrict', {
                    journalBased: true
                }) == 'true';
                this.isJournalAbsWord = isWordRestrict;
                let articleSubElm = isWordRestrict ? this.GET_ABS_ARTICLE_INFO('abstract', SHARED_KEY.doctype) : null;
                // ? Checking SubArticleElm exist and isWord restrict allowed
                if (articleSubElm != null && articleSubElm.getAttribute('notallowed') == 'no') {
                    this.elements.minCountElm = articleSubElm.hasAttribute('minwords') ? articleSubElm.getAttribute('minwords') : null;
                    let articleType = articleSubElm.hasAttribute('article-type') ? articleSubElm.getAttribute('article-type') : null;
                    let maxWords = articleSubElm.hasAttribute('maxwords') ? articleSubElm.getAttribute('maxwords') : null;
                    let articleTypeArray, maxWordsArray;
                    if (maxWords != null && articleType != null) {
                        articleTypeArray = articleType.split(',').map(item => item.trim());
                        maxWordsArray = maxWords.split(',').map(item => parseInt(item.trim(), 10));
                        let index = articleTypeArray.findIndex(item => item === SHARED_KEY.doctype);
                        this.elements.maxCountElm = index !== -1 ? maxWordsArray[index] : 0;
                    }
                    this.dialogElm.maxWords.textContent = this.elements.maxCountElm;
                    this.dialogElm.minWords.textContent = this.elements.minCountElm;
                    if (parseInt(this.elements.minCountElm) > 0) {
                        this.dialogElm.minWords.parentElement.classList.remove('ds-none');
                    }
                } else {
                    this.isJournalAbsWord = false;
                    return false;
                }
            } else {
                return false;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('updateCountsFromConfig', err.message);
        }
    }

    getCurrentAbsWordCount() {
        try {
            // ? REMOVE META-DATA INSIDE ELEMENTS
            var bodyString = $(GlobalEditor.document.getBody().$).clone(true).find('del, [style="display: none;"], .article-meta .journal-meta, .article-meta .article-id, .article-meta .pub-date, .article-meta .history, .article-meta .permissions, .article-meta .volume, .article-meta .issue, .article-meta .fpage, .article-meta .lpage').remove().end().html();
            if (!bodyString) {
                this.initializeElm();
            } else {
                // ? append editor text
                $(this.iDOM).html('').append(bodyString);
                var DOM_TEXT = $(this.iDOM).text();
                // ? Just one new line
                DOM_TEXT = DOM_TEXT.replace(/[\r\n]+/g, '\n');
                // ? remove empty para
                Array.from(this.iDOM.querySelectorAll('.p')).forEach(elm => {
                    if (elm.textContent.length == 0) {
                        $(elm).remove();
                    }
                });
                this.elements.absCountElm = $(this.iDOM.querySelectorAll('.abstract[abstract-type="abstract"] .p')).text().trim().replace(this.regex_Space_Split, ' ').replace(this.regex_Space_Add, '. $1').split(' ').length.toLocaleString('en-IN');
                this.dialogElm.absWords.textContent = this.elements.absCountElm;
                return parseInt(this.elements.absCountElm);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getCurrentAbsWordCount', err.message);
        }
    }

    openCountCheckAlert() {
        try {
            if (SHARED_KEY.division.match(/US/)) return;
            if (this.isJournalAbsWord) {
                let absWordsInfo = this.checkWordLimitReached();
                if (absWordsInfo.isMaxed) {
                    console.log('Maximum Abstract Words Limit Reached.');
                    AlertNewDialog.fire('error', "Error", absWordsInfo.alertType, 'OK', '', true, {
                        override: false,
                    });
                } else if (absWordsInfo.isNearedNinety) {
                    console.log("Words counts reached almost 90%");
                    AlertNewDialog.fire('warning', "Warning", absWordsInfo.alertType, 'OK', '', true, {
                        override: false,
                    });
                } else if (absWordsInfo.isMin) {
                    console.log("Words counts reached below minimum limit");
                    AlertNewDialog.fire('error', "Error", absWordsInfo.alertType, 'OK', '', true, {
                        override: false,
                    });
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('beforeCheckFinalize', err.message);
        }
    }

    beforeCheckFinalize() {
        try {
            if (this.ABS_WORD_RESTRICT_CLIENT[SHARED_KEY.client] && this.isJournalAbsWord) {
                let ABS_INFO = this.checkWordLimitReached();
                if (ABS_INFO.isMaxed) {
                    FinalizeDialog.closeDialog();
                    AlertNewDialog.fire('error', "Error", "Abs_Finalize_Alert", 'OK', '', true, {
                        override: false,
                    });
                    return false;
                } else if (ABS_INFO.isMin) {
                    FinalizeDialog.closeDialog();
                    AlertNewDialog.fire('error', "Error", "Abs_Min_Reached", 'OK', '', true, {
                        override: false,
                    });
                    return false;
                } else {
                    return true;
                }
            } else {
                return true;
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('beforeCheckFinalize', err.message);
        }
    }

    checkWordLimitReached() {
        try {
            var absCountResult = {
                isMaxed: false,
                isNearedNinety: false,
                isMin: false,
                alertType: "",
                maxWords: 0,
                reaminingWords: 0,
                exceededWords: 0
            };
            let curWordsCounts = this.getCurrentAbsWordCount();
            let maxWords = parseInt(this.elements.maxCountElm);
            let minWords = parseInt(this.elements.minCountElm);
            console.log("WORDS COUNT ABS MODULE: ", curWordsCounts);
            let ninetyPercentWords = maxWords * 0.9;
            absCountResult.maxWords = maxWords;
            //put conditioin for min count also if journal has . 

            // if inserted_words = max words , need to allow 
            if (curWordsCounts > maxWords) {
                absCountResult.isMaxed = true;
                absCountResult.exceededWords = curWordsCounts - maxWords;
                absCountResult.alertType = "Abs_Max_Reached";
                return absCountResult;
            } else if (curWordsCounts > ninetyPercentWords) {
                absCountResult.reaminingWords = maxWords - curWordsCounts;
                absCountResult.isNearedNinety = true;
                absCountResult.alertType = "Abs_Max_Neared";
                return absCountResult;
            } else if (curWordsCounts < minWords && minWords > 0) {
                absCountResult.isMin = true;
                absCountResult.alertType = "Abs_Min_Reached";
                return absCountResult;
            } else {
                return absCountResult;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('checkWordLimitReached', err.message);
        }
    }


    loadFooterTemplate() {
        if (this.editorFooter.childElementCount == 0) {
            this.footerTemplate = this.Panel.querySelector('#dialog-body').cloneNode(true);
            this.footerTemplate.classList.add('d-flex');
            console.log("EDITOR CONTENT", this.editorFooter.id);
            this.editorFooter.appendChild(this.footerTemplate);
            console.log("Abstract footer template loaded successfully");
        }
        if (this.editorFooter.childElementCount > 0) {
            this.footerElm.absWords = this.footerTemplate.querySelector('#absWordCount');
            this.footerElm.minWords = this.footerTemplate.querySelector('#minWords');
            this.footerElm.maxWords = this.footerTemplate.querySelector('#maxWords');
            this.footerElm.absWords.textContent = this.getCurrentAbsWordCount();
        }

    }

    removeFooterTemplate() {
        if (this.editorFooter.childElementCount > 0) {
            this.editorFooter.removeChild(this.footerTemplate);
        }
    }

    countWords(text) {
        // Remove extra whitespace and split into words
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    initializeElm() {
        this.elements.minCountElm = 0;
        this.elements.maxCountElm = 0;
        this.elements.absCountElm = 0;

        this.dialogElm.absWords = this.Panel.querySelector('#absWordCount');
        this.dialogElm.maxWords = this.Panel.querySelector('#maxWords');
        this.dialogElm.minWords = this.Panel.querySelector('#minWords');
    }


}

export default AbstractWordCounter;