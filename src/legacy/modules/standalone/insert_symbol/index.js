/**
 * InsertSymbolModule — migrated from Insert_Symbol_Module.js
 */
class InsertSymbolModule extends BaseModule {

    constructor(name = 'InsertSymbolModule', errorTracker = null, options = {}) {
        super(name, errorTracker, options);
        this._id = 'SymbolsDialog';
        this.canUnmountComponentWhileClose = false;

        this._bindModuleMethods();

        // ? SHORTCUT_ASSIGN [18, 73, 83] = [ALT, I, S]
        this._state = {
            charColumns: '16',
            shortCut: 4456531,
            lastDbRecord: [],
            localKey: 'xmleditor:usedSymbol',
            showFirstTime: true,
            lastList: []
        };
        this.args = {};
        this.templateList = {
            item: `<span class="fav i_symbol" title="{{title}}" data-unicode="{{unicode}}">{{{char}}}</span>`
        };
    }

    _bindModuleMethods() {
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== 'constructor' && typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        });
    }

    cacheDomRefs() {
        this.args = Object.assign({}, this.args, {
            search: this.Panel.querySelector('#SymSearch'),
            clearBtn: this.Panel.querySelector('#Sym_Clear'),
            insertBtn: this.Panel.querySelector('#Sym_Insert'),
            ChooseGroup: this.Panel.querySelector('#ChooseSymbolGroup'),
            SymbolsGroup: this.Panel.querySelector('#localsymbol'),
            InsertBtn: this.Panel.querySelector('#Sym_Insert'),
            ShowCharBox: this.Panel.querySelector('#show_char_code'),
            SearchBox: this.Panel.querySelector('#SymSearch'),
            RecentRow: this.Panel.querySelector('#recentUsedsym')
        });
    }

    bindDomEventsOnce() {
        this.cacheDomRefs();

        if (this.args.search) {
            this.args.search.onkeyup = () => this.do_Search();
            this.args.search.onfocus = function () {
                this.value = this.value;
            };
        }
        if (this.args.clearBtn) {
            this.args.clearBtn.onclick = () => this.closeDialog();
        }
        if (this.args.insertBtn) {
            this.args.insertBtn.onclick = (e) => {
                this.FIRE_ONCE(e.currentTarget);
                return false;
            };
        }
        if (this.args.ChooseGroup) {
            this.args.ChooseGroup.onchange = () => {
                this.ChangeSelection(this.args.ChooseGroup);
            };
        }
    }

    _wireDomEvents() {
        this.bindDomEventsOnce();
    }

    initLoop(param1) {
        try {
            this.bindDomEventsOnce();
            // support_data.json loaded via supportingFiles → window.SUPPORT_CONFIG
            this.SYMBOL_JSON = window.SUPPORT_CONFIG || this.SYMBOL_JSON || null;
            this.symbolsLoaded = !!(this.SYMBOL_JSON && Object.keys(this.SYMBOL_JSON).length);
            this.FullyLoaded = true;
            this.AutoInitiated = true;
        } catch (err) {
            console.warn(err.message);
            // ErrorLogTrace('initLoop', err.message);
        }
    }

    initialLoad() {
        this.initialLoadInterval = setInterval(() => {
            if (!this.symbolsLoaded && window.SUPPORT_CONFIG) {
                this.SYMBOL_JSON = window.SUPPORT_CONFIG;
                this.symbolsLoaded = !!(this.SYMBOL_JSON && Object.keys(this.SYMBOL_JSON).length);
            }
            if (this.symbolsLoaded) {
                this.renderSymbols(this.getUniCode());
                clearInterval(this.initialLoadInterval);
            }
        });
    }

    showBefore(param1, param2, param3) {
        try {
            this.bindDomEventsOnce();

            if (this._state.showFirstTime) {
                const rangeEntry = [];
                const symbolRanges = CKEDITOR.config.symbolRanges;

                for (let index = 0; index < symbolRanges.length; index++) {
                    const keyVal = symbolRanges[index];
                    rangeEntry.push(`<option value ="${keyVal[1]}">${keyVal[0]}</option>`);
                }

                this.args.ChooseGroup.insertAdjacentHTML('beforeend', rangeEntry.join(''));
                debug.log('Symbol Loaded Successfully');
                this.initialLoad();
                this.GET_SET_SYM_DB({
                    GET: true,
                    init: true
                });
                this._state.showFirstTime = false;
            }

            return true;
        } catch (err) {
            console.warn(err.message);
            // ErrorLogTrace('this.showBefore', err.message);
        }
    }

    showLoop(param1, param2, param3) {
        try {
            this.bindDomEventsOnce();

            const {
                SearchBox,
                ShowCharBox,
                InsertBtn,
                ChooseGroup
            } = this.args;

            const searchVal = SearchBox.value;
            this.removeSelect();

            SearchBox.value = '';
            ShowCharBox.value = '';
            InsertBtn.classList.add('disabled');
            ChooseGroup.focus();

            if (this._state.lastList.length > 0 && searchVal === '') {
                this.renderSymbolGrid(this._state.lastList);
            } else {
                this.renderSymbols(this.getUniCode());
            }

            this.RecentRowUpdate();
        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('showLoop', err.message);
        }
    }

    removeSelect() {
        try {
            this.Panel.querySelectorAll('.active').forEach((ele) => {
                ele.classList.remove('active');
            });
        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('removeSelect', err.message);
        }
    }

    resolveSymbolRangeInput(input, search) {
        const isInitialLoad = (input && input.value === 'iniLoad') || input === 'iniLoad';
        if (isInitialLoad) {
            return this.getUniCode();
        }

        if (search) {
            return input;
        }

        return input && input.value ? input.value : input;
    }

    getSymbolCharacter(codePoint) {
        let hexValue = codePoint.toString(16).toUpperCase();
        return hexValue.length < 1 ? eval('"\\u0000"') :
            hexValue.length < 2 ? eval('"\\u000' + hexValue + '"') :
                hexValue.length < 3 ? eval('"\\u00' + hexValue + '"') :
                    hexValue.length < 4 ? eval('"\\u0' + hexValue + '"') :
                        eval('"\\u' + hexValue + '"');
    }

    buildSymbolMarkup(rangeString, columnCount) {
        const markupList = [''];
        const placeholder = '&nbsp;';

        if (rangeString == null) {
            return markupList;
        }

        let rowIndex = 0;
        const groups = String(rangeString).split(',');

        for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
            const splitRange = groups[groupIndex].split('-');
            let start = 0;
            let end = -1;
            let usePlaceholder = false;

            switch (splitRange.length) {
                case 0:
                    break;
                case 1:
                    if (splitRange[0].charAt(splitRange[0].length - 1) === '*') {
                        start = end = parseInt(splitRange[0].substring(0, splitRange[0].length - 1), 16);
                        usePlaceholder = true;
                    } else {
                        start = end = parseInt(splitRange[0], 16);
                    }
                    break;
                default:
                    if (splitRange[0].charAt(splitRange[0].length - 1) === '*') {
                        start = parseInt(splitRange[0].substring(0, splitRange[0].length - 1), 16);
                        usePlaceholder = true;
                    } else {
                        start = parseInt(splitRange[0], 16);
                    }

                    if (splitRange[1].charAt(splitRange[1].length - 1) === '*') {
                        end = parseInt(splitRange[1].substring(0, splitRange[1].length - 1), 16);
                        usePlaceholder = true;
                    } else {
                        end = parseInt(splitRange[1], 16);
                    }
                    break;
            }

            if (end < start) {
                continue;
            }

            for (; start <= end;) {
                for (let columnIndex = rowIndex; columnIndex < columnCount; columnIndex++, start++) {
                    if (start > end) {
                        rowIndex = columnIndex;
                        break;
                    }

                    const symbolChar = this.getSymbolCharacter(start);
                    const title = this.SYMBOL_JSON[start] || symbolChar;
                    const unicode = start.toString(16).toUpperCase();
                    const isSpecial = this.SYMBOL_JSON[start] ? '' : unicode;
                    const entry = '<span class="fav i_symbol" data-unicode="' + unicode + '" title="' +
                        (isSpecial.length > 2 ? unicode : title) + '"' + (usePlaceholder ? '>' + placeholder : '>') +
                        symbolChar + '</span>';

                    if (symbolChar !== '￱' && entry !== this.emtpyStringValue) {
                        markupList.push(entry);
                    }
                }
            }
        }

        return markupList;
    }

    renderSymbolGrid(markupList) {
        if (markupList.length > 0) {
            this._state.lastList = markupList;
        }

        $(this.args.SymbolsGroup).html('').append(markupList);
        this.EventTrigger(this.args.SymbolsGroup);
        console.log('Json Loaded');
    }

    renderSymbols(rangeString) {
        const normalizedRange = this.resolveSymbolRangeInput(rangeString);
        this._state.lastList = [];
        this.renderSymbolGrid(this.buildSymbolMarkup(normalizedRange, this._state.charColumns));
    }

    generateSym_Elm(a, c, y) {
        // unicode range 0020-007E ,8-bit or 16-bit integer
        try {
            this._state.lastList = [];
            this.renderSymbolGrid(this.buildSymbolMarkup(a, c));
        } catch (err) {
            console.log(err.message);
            // ErrorShareMail('generateSym_Elm', err.message);
        }
    }

    BindEvent(e) {
        try {
            this.removeSelect();
            const target = e.currentTarget || e.srcElement;
            if (e.type === 'click') {
                this.args.InsertBtn.classList.remove('disabled');
                this.ShowEntity(target);
                target.classList.add('active');
            } else {
                this.FIRE_ONCE(target);
            }

            e.stopPropagation();
            e.preventDefault();
            e.cancelBubble = true;
            return false;
        } catch (err) {
            console.log(err.message);
            // ErrorShareMail('BindEvent', err.message);
        }
    }

    EventTrigger(parent) {
        try {
            Array.from(parent.children).forEach((ele) => {
                ele.onclick = ele.ondblclick = this.BindEvent;
            });
        } catch (err) {
            console.log(err.message);
            // ErrorShareMail('EventTrigger', err.message);
        }
    }

    ShowEntity(selector) {
        const {
            ShowCharBox,
            InsertBtn
        } = this.args;
        try {
            const code = $(selector).text().charCodeAt(0);
            let codeHex = code.toString(16).toUpperCase();
            while (codeHex.length < 4) {
                codeHex = '0' + codeHex;
            }

            $(ShowCharBox).attr('value', codeHex).val(codeHex);
            $(InsertBtn).attr({
                'data-value': selector.innerHTML,
                'data-title': selector.getAttribute('title'),
                'data-unicode': selector.getAttribute('data-unicode')
            });
        } catch (err) {
            console.log(err.message);
            // ErrorShareMail('ShowEntity', err.message);
        }
    }

    ChangeSelection(el, search) {
        try {
            const showValue = this.resolveSymbolRangeInput(el, search);
            $(this.args.SymbolsGroup).html('');
            this.renderSymbols(showValue);
            console.log(el && el.value);
        } catch (err) {
            console.log(err.message);
        }
    }

    Check_Unicode_Compliance(value) {
        // ? http://www.unicode.org/charts/
        if (!value) return null;
        if (value.length === 3) {
            value = '0' + value.toLocaleString();
        }
        const fontReplaceList = {
            '4E00–4FFF': 'Simsun',
            '5000–5FFF': 'Simsun',
            '6000–6FFF': 'Simsun',
            '7000–7FFF': 'Simsun',
            '8000–8FFF': 'Simsun',
            '9000–9FFF': 'Simsun',
            '0600–06FF': 'Times New Roman MT Std',
            '0750–077F': 'Times New Roman MT Std',
            '0870–089F': 'Times New Roman MT Std',
            '08A0–08FF': 'Times New Roman MT Std',
            'FB50–FDFF': 'Times New Roman MT Std',
            'FE70–FEFF': 'Times New Roman MT Std',
            '0590–05FF': 'Times New Roman MT Std'
        };

        let reTurnFont = null;
        for (const range of Object.keys(fontReplaceList)) {
            const split = range.split('–');
            if (split[0] <= value && value <= split[1]) {
                debug.log(fontReplaceList[range]);
                reTurnFont = fontReplaceList[range];
            }
        }

        if (reTurnFont) {
            return `<span gid="true" class="font" data-name="font" pi-value="font=¨${reTurnFont}¨"></span>&#x${value};<span gid="true" class="font" data-name="font"></span>`;
        }
        return null;
    }

    canInsertIntoCurrentSelection(selectionInfo) {
        const isRestrict = commonMethods.Duplicate_Array(
            ['xref', 'graphic'],
            [selectionInfo.PARENT_CLAS, selectionInfo.NODE_CLAS],
            {
                find: true,
                bool: true
            }
        );

        const isInsideFootnote = selectionInfo.PARENTS_CLAS_LIST.toString().match(/table-wrap-foot/);
        if ((selectionInfo.RESTRICT_CLIENT_IS && !isInsideFootnote) || isRestrict || selectionInfo.NODE_TAG === 'IMG') {
            TOASTER_ALERT('Ignore_KeyEvent_FM', {
                type: 'warning'
            });
            return false;
        }

        if (window.paraLock && typeof window.paraLock._isElementLocked === 'function') {
            const isLocked = window.paraLock._isElementLocked(selectionInfo.NODE, {
                check_closest: true,
                alertKey: 'ErrorLockedParaEdit'
            });
            if (isLocked) {
                return false;
            }
        }

        return true;
    }

    getInsertPayload(elm) {
        return {
            char: elm.tagName === 'BUTTON' ? elm.dataset.value : elm.innerHTML,
            title: elm.tagName === 'BUTTON' ? elm.dataset.title : elm.getAttribute('title'),
            unicode: elm.getAttribute('data-unicode'),
            time_c: new Date().getTime()
        };
    }

    insertSymbolPayload(payload) {
        const withReplaceFont = this.Check_Unicode_Compliance(payload.unicode);

        if (withReplaceFont && !IS_JOURNAL) {
            GlobalEditor.insertHtml(withReplaceFont);
        } else {
            GlobalEditor.insertText(payload.char);
        }

        this.GET_SET_SYM_DB(Object.assign({
            SET: true
        }, payload));
        debug.log('Symbol Inserted');
        this.closeDialog();
    }

    FIRE_ONCE(elm) {
        try {
            if (!elm) return;

            const selectionInfo = IMPACT_SELECTION;
            selectionInfo.getInfo(GlobalEditor);

            if (!this.canInsertIntoCurrentSelection(selectionInfo)) {
                return false;
            }

            this.insertSymbolPayload(this.getInsertPayload(elm));
        } catch (err) {
            console.log(err.message);
            // ErrorShareMail('FIRE_ONCE', err.message);
        }
    }

    collectUnicodeEntries(predicate) {
        const myAr = [];
        const keys = this.SYMBOL_JSON ? Object.keys(this.SYMBOL_JSON) : [];

        keys.forEach((key) => {
            if (!predicate || predicate(key, this.SYMBOL_JSON[key])) {
                myAr.push(this.convertCharStr2UTF16(key));
            }
        });

        return myAr;
    }

    getUniCode() {
        try {
            return this.collectUnicodeEntries().sort().join(',');
        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('getUniCode', err.message);
            return [];
        }
    }

    getMatch_Search_Word(filter) {
        //? textbox key value
        try {
            const split = filter.split(' ');
            return this.collectUnicodeEntries((key, value) => {
                let isFullyMatch = false;
                Array.from(split).forEach((word, ind) => {
                    value = value.toLocaleUpperCase();
                    word = word.toLocaleUpperCase();
                    if (ind === 0 || (ind !== 0 && isFullyMatch)) {
                        isFullyMatch = value.includes(word) ? true : false;
                    }
                });
                return isFullyMatch;
            }).sort().join(',');
        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('find_symbol', err.message);
        }
    }

    do_Search() {
        const {
            SearchBox,
            ChooseGroup
        } = this.args;
        try {
            const filter = SearchBox.value.toUpperCase();
            let searchVale = null;

            if (filter !== '') {
                if (ChooseGroup.value !== 'iniLoad') ChooseGroup.value = 'iniLoad';
                searchVale = this.getMatch_Search_Word(filter);
            } else {
                searchVale = this.getUniCode();
            }

            this.renderSymbols(searchVale);
            console.log('Searching DONE');
        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('do_Search', err.message);
        }
    }

    convertCharStr2UTF16(str) {
        let highsurrogate = 0;
        let suppCP;
        let outputString = '';
        str = str.replace(/(\b[0-9]+\b)/g, (matchstr, parens) => {
            return this.dec2char(parens);
        });
        for (let i = 0; i < str.length; i++) {
            const cc = str.charCodeAt(i);
            if (cc < 0 || cc > 0xFFFF) outputString += '!Error in convertCharStr2UTF16: unexpected charCodeAt result, cc=' + cc + '!';
            if (highsurrogate !== 0) {
                if (0xDC00 <= cc && cc <= 0xDFFF) {
                    suppCP = 0x10000 + ((highsurrogate - 0xD800) << 10) + (cc - 0xDC00);
                    suppCP -= 0x10000;
                    outputString += this.dec2hex4(0xD800 | (suppCP >> 10)) + ' ' + this.dec2hex4(0xDC00 | (suppCP & 0x3FF)) + ' ';
                    highsurrogate = 0;
                    continue;
                }
                outputString += 'Error in convertCharStr2UTF16: low surrogate expected, cc=' + cc + '!';
                highsurrogate = 0;
            }
            if (0xD800 <= cc && cc <= 0xDBFF) {
                highsurrogate = cc;
            } else {
                let result = this.dec2hex(cc);
                while (result.length < 4) result = '0' + result;
                outputString += result + ' ';
            }
        }
        return outputString.substring(0, outputString.length - 1);
    }

    dec2hex(textString) {
        try {
            return (textString + 0).toString(16).toUpperCase();
        } catch (err) {
            console.warn(err.message);
            // ErrorLogTrace('this.dec2hex', err.message);
        }
    }

    dec2hex4(textString) {
        const hexequiv = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
        return hexequiv[(textString >> 12) & 0xF] + hexequiv[(textString >> 8) & 0xF] +
            hexequiv[(textString >> 4) & 0xF] + hexequiv[textString & 0xF];
    }

    dec2char(n) {
        try {
            let result = '';
            if (n <= 0xFFFF) {
                result += String.fromCharCode(n);
            } else if (n <= 0x10FFFF) {
                n -= 0x10000;
                result += String.fromCharCode(0xD800 | (n >> 10)) + String.fromCharCode(0xDC00 | (n & 0x3FF));
            } else {
                result += 'dec2char error: Code point out of range: ' + this.dec2hex(n);
            }
            return result;
        } catch (err) {
            console.warn(err.message);
            // ErrorLogTrace('dec2char', err.message);
        }
    }

    getRecentSymbolsFromLocal() {
        const local = localStorage.getItem(this._state.localKey);
        const parsed = JSON.parse(local ? local : '[]');
        return parsed && parsed.length > 0 ? parsed : [];
    }

    syncRecentSymbols(records) {
        this.RecentRowUpdate(records);
        localStorage.setItem(this._state.localKey, JSON.stringify(records));
    }

    RecentRowUpdate(Arr) {
        try {
            let recentRecords = Arr;
            if (!recentRecords) {
                recentRecords = this.getRecentSymbolsFromLocal();
                if (recentRecords.length < 1) return;
            }

            const stringArr = [];
            const tempArr = [...recentRecords];

            Array.from(tempArr).reverse().forEach((val, ind) => {
                if (!val || ind > 14 || !val.title) return;
                stringArr.push(this.GetTemplate('item', Object.assign({}, val)));
            });

            $(this.args.RecentRow).html('').append(stringArr.join(''));
            this.EventTrigger(this.args.RecentRow);
        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('RecentRowUpdate', err.message);
        }
    }

    GET_SET_SYM_DB(Options) {
        //? GET or SET from DB
        try {
            Options = Options ? Options : ({
                char: false,
                init: false,
                GET: true,
                SET: false
            });
            const json_s = {
                tbl: 'UserPreference',
                find: {
                    username: USER_INFO.MAIL_ID,
                    docid: DOC_ID,
                    recordtype: 'insert_symbol'
                }
            };

            if (Options.SET) {
                if (Options.char) {
                    let index = -1;
                    const arr = this._state.lastDbRecord || [];
                    for (let i = 0; i < arr.length; i++) {
                        if (arr[i].char === Options.char && arr[i].title === Options.title) {
                            index = i;
                        }
                    }
                    if (index > -1) this._state.lastDbRecord.splice(index, 1);
                    delete Options.SET;
                    this._state.lastDbRecord.push(Options);
                    json_s.update = Object.assign({
                        insert_symbol: this._state.lastDbRecord,
                        recordtype: 'insert_symbol'
                    }, GET_JSON('default'));
                    this.syncRecentSymbols(this._state.lastDbRecord);
                } else if (Options.EMPTY) {
                    delete json_s.find;
                    json_s.insert_symbol = [];
                    json_s.username = USER_INFO.MAIL_ID;
                    json_s.userid = USER_INFO.USER_ID;
                    json_s.docid = DOC_ID;
                }
            }
            commonfn.callajax(
                json_s,
                Options.GET ? 'Get_Sym_List' : 'Set_Sym_List',
                Options.GET ? API_GET_ADMINDOCS : (Options.EMPTY ? API_UPDATE_INSERT : API_FIND_UPDATE_INSERT),
                this
            );
        } catch (err) {
            console.warn(err.message);
            // ErrorLogTrace('GET_SET_SYM_DB', err.message);
        }
    }

    Set_Sym_List(response, opt) {
        debug.log(JSON.stringify(response));
    }

    Get_Sym_List(response) {
        try {
            if (response.data.length > 0) {
                const data = this._state.lastDbRecord = response.data[0].insert_symbol || [];
                const recent = localStorage.getItem(this._state.localKey);
                const string = JSON.stringify(this._state.lastDbRecord);
                if (string !== recent) {
                    this.syncRecentSymbols(data);
                }
            } else {
                debug.log('no record found for used symbols');
            }
        } catch (err) {
            debug.log(err.message);
            // ErrorShareMail('Get_Sym_List', err.message);
        }
    }
}

export default InsertSymbolModule;
