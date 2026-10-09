var ChangeBool = false,
    _newRefTxt = [],
    _newRefAttrArr = [];


function handleDelRefNode(ref, useChildOnly = false) {

    const trackManager = window._trackManager || window.Trackchangeapi;

    if (trackManager && typeof trackManager.getDelNode === "function") {
        const options = useChildOnly ? {
            childOnly: true,
            setAttrParams: {
                'data-track-code': 'ref-02'
            }
        } : {};
        trackManager.getDelNode(ref, options);

    } else {
        const rTemp = window.GetTrackTag(ref, 'delOnly');
        if (rTemp) $(ref).replaceWith(rTemp);
    }

    if (ref && ref.removeAttribute) {
        ref.removeAttribute('data-new');
    }
}

function restoreDelLabel(delLabel) {
    if (delLabel) {
        const track = delLabel.querySelector('[data-del-val]');
        if (track) {
            delLabel.textContent = track.getAttribute('data-del-val');
        }
    }
}

function DEL_REF_FIRE(Input, Options = {}) {
    AutoSaveBool = false;

    /* 
       ! THIS FUNCTION WILL DELETE REFERENCE FROM THE LIST
       @ Param1 - Input == Array || String || Element
       @ Some additional configurable option
       @ Param3 - _ Parent Object

   */

    try {
        Options = {
            FROM_TRACK: false,
            DOM: null,
            DIRECT_DEL: false,
            FROM_CITE: false,
            FROM_AFTER_CUT: false,
            ...Options
        };

        const CUR_DOM = GlobalEditor.document.$;
        let [CUR_REF, CUR_ID, CAN_REMOVE] = [null, null, false];
        const REF_SEC = CUR_DOM.querySelector('.ref-list');
        const LIST_OF_REF = Array.isArray(Input) ? Input : [Input];

        Array.from(LIST_OF_REF).forEach(item => {
            // Normalize item to element
            if (["string", "number"].includes(typeof item)) {
                const id = item.toString().getBibId();
                CUR_REF = CUR_DOM.querySelector(`div.ref#${id}`);
            } else {
                CUR_REF = item;
            }

            if (!CUR_REF) return;
            CUR_ID = CUR_REF.id;

            // Extract elements
            const MIX_GROUP = CUR_REF.querySelector('span.mixed-citation');
            const DEL_LAB = iREF_SCOPE.IS_NAME_DATE ? null : CUR_REF.querySelector('span.label');
            const IS_NEW = MIX_GROUP && MIX_GROUP.parentElement && MIX_GROUP.parentElement.nodeName === 'INSERT';
            const IS_EDIT = CUR_REF.hasAttribute('oid');
            const IS_SAME_USER = IS_NEW && MIX_GROUP && MIX_GROUP.parentElement && commonMethods.IS_SAME_USER_AND_ROLE(MIX_GROUP.parentElement);


            // Add deletion attributes
            commonMethods.SET_REMOVE_ATTR(CUR_REF, {
                'del_Id': IS_EDIT ? CUR_REF.getAttribute('oid') : CUR_ID,
                'data-remove': 's'
            }, ['oid', 'id']);

            // Optional: Take snapshot before deletion
            if (Options.DIRECT_DEL) {
                IMPACT_SELECTION._SNAPSHOT({
                    lock: true,
                    save: true
                });
            }
            // ? 08_MAY_2023 - YA - 10.1093/beheco/arad037

            // Restore label if needed
            if (!IS_NEW && !Options.FROM_TRACK) {
                if (DEL_LAB) restoreDelLabel(DEL_LAB);
            }

            // Call delete logic
            if (!IS_NEW && !Options.FROM_TRACK) {
                // childOnly: true
                handleDelRefNode(CUR_REF, true);
            } else {
                CAN_REMOVE = IS_SAME_USER;
                if (!IS_SAME_USER) {
                    // childOnly: true
                    handleDelRefNode(CUR_REF, true);
                }

            }
        });

        if (Options.DIRECT_DEL || Options.FROM_TRACK) {
            // ? corresponding citation has deletion
            var selectors = commonMethods.xrefSelectorBuilder(CUR_ID);
            CitationNewModule.M_FUN.Delete_Selection_Range_NEW([CUR_ID], {
                FROM_DEL_CITE: false,
                FROM_REF_DEL: true,
                COLLECTION: CUR_DOM.querySelectorAll(selectors),
                DEL_ID: CUR_ID,
            });

            if (CAN_REMOVE) $(CUR_REF).remove();

            if (!iREF_SCOPE.IS_NAME_DATE) {
                CHECK_ORDER.FIRE_ONCE(GlobalEditor, {
                    reNumber: true,
                    fromRefDel: true
                });
            }
        }

        if (Options.FROM_CITE) {
            CUR_ID = IMPACT_SELECTION.getLastCursor_Id();
        }

        if (Options.DIRECT_DEL) {
            IMPACT_SELECTION._SNAPSHOT({
                unlock: true
            });
        }

        _IsDirty = false;
        AutoSaveBool = true;
    } catch (err) {
        console.log(err.message);
        ErrorLogTrace('DEL_REF_FIRE', `${err.message} :: ${Input}`);
    }
}



function removeTextNodes_clearTextAndAttributes(element) {
    Array.from(element.childNodes)
        .forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                element.removeChild(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                node.textContent = "";
                node.removeAttribute('xlink:href');
                node.id = s4();

            }
        });
}
let check_is_Elm = function(el, key, self) {
    let parent = el.parentElement;
    if (parent.tagName == 'INSERT' && parent.dataset.update == key) {
        self.M_SCOPE.reEdit = true;
        self.IBOX.BODY.classList.add('edit');
        self.M_SCOPE.MISS_ELM_IDs.push(key);
    }
};

function text_compare(txt, delim) {
    try {
        var removeArr = [];
        for (var i = txt.length - 1; i >= 0; i--) {
            for (var j = delim.length - 1; j >= 0; j--) {
                if (delim[j] == txt[i]) {
                    removeArr.push(delim[j]);
                }
            }
        }
        let reverse = delim.split('').reverse().join('');
        removeArr.forEach((char, idx, arr) => {
            reverse = reverse.replace(char, '');
        });
        reverse = reverse.split('').reverse().join('');
        return [removeArr, reverse];
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('txt_compare', err.message);
    }
}


function _refElementSting(obj, value, eClass) {
    try {
        var _String;
        value = (value != null) ? (obj[value]) : (obj);
        if (IS_JOURNAL) {
            _String = "<span class=\"" + eClass + "\" data-name=\"" + eClass + "\">" + value + "</span>";
        } else {
            _String = "<span class=\"" + eClass + "\" data-name=\"" + eClass + "\">" + value + "</span>";
        }
        return _String;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('_refElementSting', err.message);
    }
}

function getFloatsEntryString(txtValue, id, role, clas, rlable, type, src) {
    try {
        // ? short the caption and ref text
        txtValue = getWordsCap(txtValue, 'CrossCitation');
        var html = `${(src != null) ? ('<div class="img-xref flex-grow-2 ml-2"><img src="' + src + '"></div>') : ('')}<div class="float-group ${(rlable.length != 0) ? ('pl-3') : ('ref')}" data-text="${txtValue}" data-div="${type}" data-role="${role}" data-xref="${rlable}" data-rid="${id}">
        ${(rlable.length != 0) ? ('<span class="' + clas + '">' + rlable + '</span>') : ('')}<span class="caption">${txtValue}</span></div>`;
        return html;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getFloatsEntryString', err.message);
    }
}

function getToolTipEntryString(txtValue, id, rlable, entry) {
    try {
        const {
            'data-interest-level': dataInterestLevelAlias
        } = iREF_SCOPE.Reference || {};

        // Interest level mapping
        const interestLevelMap = {
            "outstanding": "■■",
            "special": "■"
        };

        // Ensure entry exists before querying
        let interestLevel = "";
        if (dataInterestLevelAlias && entry) {
            let labelElem = entry.querySelector('.label');
            if (labelElem) {
                let level = labelElem.getAttribute('data-interest-level') || "";
                // Map level to symbol if available
                interestLevel = interestLevelMap[level] || "";
            }
        }

        // Shorten caption and ref text
        txtValue = getWordsCap(txtValue, 'ToolTip');
        txtValue = rlable.length > 0 ? `${rlable} ${interestLevel} ${txtValue}`.trim() : txtValue;

        return `<span class="hide" data-rid="${id}">${txtValue}</span>`;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getToolTipEntryString', err.message);
    }
}

const BIB_ID = (id) => {
    try {
        let sub = -Math.abs(id.toString().length);
        return 'CIT0000'.slice(0, sub) + id;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('BIB_ID', err.message);
    }
};

// ? cite_revert reject ref deleted YA
// *  get Only Number e.g CIT0001 ==> 1
// ? here validate for missing citation
// cite_order[check] = (IsDel)?9999:8888;
//ref.setAttribute("data-cite-missing", "ss");
// ? Multiple ranges checking values
// NewRefModule["M_SCOPE"].IsReOrdered = true;

function getCiteString(Arr, IdArr, role) {
    try {
        if (Arr.length === 0) return [];

        if (["fig", "pic", "map", "img", "aud", "vid", "clip", "exa", "exe", "video_clip"].includes(role)) {
            role = 'fig';
        }

        var html = "",
            fid = s4(),
            labelString = "",
            rid = [],
            iString = [];

        $.each(Arr.split(','), function(index, value) {
            $.each(value.split(/[-–—]|\bthrough\b/gi), function(i, id) {
                id = id.trim();
                rid.push(IdArr[id]);

                if (i === 1) {
                    labelString += '–';
                }

                if (!IS_JOURNAL && EDITOR_CURSOR && EDITOR_CURSOR.CUR_CHAPTER_NO && EDITOR_CURSOR.CUR_CHAPTER_NO.length) {
                    var splitIndex = EDITOR_CURSOR.CUR_CHAPTER_NO.length;

                    if (id.length > splitIndex) {
                        labelString += id.slice(0, splitIndex) + "." + id.slice(splitIndex);
                    } else {
                        labelString += id;
                    }
                } else {
                    labelString += id;
                }
            });

            var setId = rid.join(' ');
            html += '<a class="xref" data-name="xref" data-role="' + role + '" href="#' + setId + '" ref-type="' + role + '" rid="' + setId + '" fid="' + fid + '">' + labelString + '</a>';
            iString.push(html);

            if (typeof iString['type'] === 'undefined') {
                iString['type'] = role;
                iString['prefix'] = IdArr['prefix'];
                iString['authCount'] = (Object.keys(IdArr).length - 1);
            }

            // Reset values for next loop
            html = '';
            fid = s4();
            labelString = '';
            rid = [];
        });
        return iString;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getCiteString', err.message);
    }
}
String.prototype.getBibId = function(id) {
    /* 
        ! THIS FUNCTION WILL BE RETURN ID PATTERN AS PATTERN
    
    */
    try {
        /* (!IS_JOURNAL && this.toString().indexOf('CIT') == -1) || */
        if (this.toString().indexOf('CIT') > -1) {
            return this.toString();
        }
        let [prefix, _this, outId] = [(IS_JOURNAL) ? ('CIT000') : ('ref-'), "", ""];
        if (id != undefined) {
            // ? THIS GENERATE FOR NEXT ID SEQUENCE 
            _this = (parseInt(id.replace(/[^\d.]/g, '')) + 1).toString();
        } else {
            _this = this.toString();
        }
        if (!IS_JOURNAL) {
            if (_this.indexOf(prefix) == -1)
                outId = prefix + (_this.length > 0 ? _this : d4());
            else outId = _this;
        } else if (IS_JOURNAL) {
            var thSplit = _this.split(/[-–—]|\bthrough\b/gi),
                j = thSplit[1];
            // ? HANDLE ID HAVE SOME PRE-DEFINED PREFIX
            if (thSplit[1] == undefined) {
                j = thSplit[0];
            }
            for (var i = thSplit[0]; i <= j; i++) {
                outId += (i < 10) ? (prefix + i) : ((i < 100) ? (prefix.slice(0, -1) + i) : (prefix.slice(0, -2) + i));
                if (i < j) {
                    // ? GET RANGE / MULTIPLE ID INTO SAME INPUT 11-15
                    outId += ' ';
                }
            }
        }
        // if (!IS_JOURNAL) {
        //     _this = prefix + s4();
        // }
        return outId;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getBibId', err.message);
    }
};

function getCiteTextEle(elm, config) {
    try {
        IMPACT_SELECTION.getInfo(GlobalEditor);
        var gSelection = GlobalEditor.getSelection();
        let range = gSelection.getRanges()[0],
            el = GlobalEditor.document.createElement('div');
        if (!range) return false;
        el.append(range.cloneContents());
        var dom_elm = el.$;
        elm = dom_elm;
        var oldValues = [];
        // ? 12-Apr-2022  bug fix collective
        elm.querySelectorAll('a,[data-class="ckcommentsfull"],insert').forEach((el, idx, arr) => {
            let IsInsert = el.tagName == "INSERT";
            if (el.hasAttribute('data-class') || (IsInsert && el.childElementCount == 1 && el.querySelector('[data-class="ckcommentsfull"]'))) {
                // ? REMOVE COMMENDS AND QUERYING CLONE RANGE - 29_NOV_22 - YA
                if (el.parentElement.tagName == "INSERT") el.parentElement.remove();
                else el.remove();
                return;
            }
            let IsEdited = el.hasAttribute('data-del-val');
            let temp_txt = IsEdited ? el.getAttribute('data-del-val') : el.textContent;
            let CanCel = false;
            let SEL_OBJ = {
                Is_A: el.tagName == 'A',
                Is_INS: el.tagName == 'INSERT',
                Close_INS: el.closest('insert'),
                Query_INS: el.querySelector('insert'),
                Close_A: el.closest('a'),
                Query_A: el.querySelector('a'),
                IS_INS_DEL: el.dataset.delVal ? el.dataset.delVal : false
            };
            CanCel = SEL_OBJ.Is_A && (SEL_OBJ.Query_INS || SEL_OBJ.Close_INS) ? true : false;
            /*
            ? <a><insert data-del-val="4">7</insert></a> 
            ? <insert data-del-val="4"><a>7</a></insert> 
            */
            if (SEL_OBJ.Is_A && SEL_OBJ.Close_INS && SEL_OBJ.IS_INS_DEL) {
                CanCel = true;
                let idx = oldValues.indexOf(temp_txt);
                if (idx) oldValues.splice(idx, 1);
                // ? <insert data-del-val="4"><a>7</a> </insert>
            }
            if (!oldValues.includes(temp_txt) && !CanCel) oldValues.push(temp_txt);
        });
        if (!iREF_SCOPE.IS_NAME_DATE) {
            var formatter = new RangeFormatter(config);
            oldValues.sort(function(a, b) {
                return a - b;
            });
            return formatter.formatRanges(oldValues, config);
        } else {
            return oldValues.join('');
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getCiteTextEle', err.message);
    }
}

function selectDOMRange(xElement, pBool, nBool, root_config, Options = {}) {
    try {
        // ? handle superscript patterns
        var [IsSingleSup, HandleMethod] = [false, {
            "ExtractMethod": false
        }];
        commonMethods.iunWrap(xElement, {
            selector: '[data-high]'
        });
        let check_sup = function() {
            if (xElement.closest('sup') || xElement.querySelector('sup')) {
                // ? If this case only one xref citation
                if (xElement.querySelector('sup')) {
                    let find = xElement.querySelector('sup');
                    IsSingleSup = find.querySelectorAll('a').length == 1;
                    xElement = IsSingleSup ? find : find.querySelector('a');
                } else {
                    // ? 06_JAN_22_YA 
                    let sup = xElement.closest('sup');
                    IsSingleSup = sup.querySelectorAll("a").length == 1;
                    xElement = IsSingleSup ? sup : xElement;
                }
            }
        };
        check_sup();
        // ? Check xref node first either last node of element
        // ? Check select parent element <sup><insert><span xRefGroup><sup></sup></span><insert></sup>
        if (xElement.nodeName == 'INSERT' && xElement.closest('a')) xElement = xElement.closest('a');
        // ? 09_MAR_2023 - YA
        var IsEdit = xElement.parentElement.tagName == "INSERT" ? true : false,
            parent = IsEdit ? xElement.parentElement.parentElement : xElement.parentElement,
            IsFirst = parent.firstChild.isEqualNode(xElement),
            IsLast = parent.lastChild.isEqualNode(xElement),
            startOffset, endOffset, prevInd, nxtInd, prevNode, nxtNode, thisnxtSib, thisprevsSib, xOP, xCP, sep;
        ['previousSibling', 'nextSibling'].forEach((sibling, idx, arr) => {
            if (idx == 0 && IsFirst || idx == 1 && IsLast) {
                if (idx == 0 && IsFirst) thisprevsSib = xElement;
                else if (idx == 1 && IsLast) thisnxtSib = xElement;
            } else {
                let SIBILING = IsEdit ? xElement.parentElement[sibling] : xElement[sibling];
                // ? 24_DEC_22 - YA - TEXT_NODE_WITHOUT_CONTENT_GET_NEXT_NODE
                // ? https://ckeditor.com/docs/ckeditor4/latest/api/CKEDITOR_dom_selection.html#property-FILLING_CHAR_SEQUENCE
                if (SIBILING.nodeType == 3 && ["", CKEDITOR.dom.selection.FILLING_CHAR_SEQUENCE].includes(SIBILING.nodeValue)) {
                    SIBILING = SIBILING[sibling];
                }
                if ((SIBILING.nodeType == 1) && (['DEL', 'SPAN', 'INSERT'].includes(SIBILING.nodeName))) {
                    // ? EDIT/DELETE CITATION HANDLING IN CMD SELECTION - 1964501
                    if (SIBILING[sibling].nodeType == 3) {
                        if (idx == 0) {
                            thisprevsSib = SIBILING[sibling];
                            prevNode = thisprevsSib['nodeValue'];
                            pBool = true;
                        } else {
                            thisnxtSib = SIBILING[sibling];
                            nxtNode = thisnxtSib['nodeValue'];
                            nBool = true;
                        }
                    }
                } else if (SIBILING.nodeType == 3) {
                    if (idx == 0) {
                        thisprevsSib = SIBILING;
                        prevNode = SIBILING['nodeValue'];
                    } else {
                        thisnxtSib = SIBILING;
                        nxtNode = SIBILING['nodeValue'];
                    }
                }
            }
        });
        // ? 21_DEL_22 - YA -ADDED VARIABLE SEL_WITH_PARENTHESIS
        let SEL_WITH_PARENTHESIS = false;
        prevInd = Array.from(parent.childNodes).indexOf(thisprevsSib);
        nxtInd = Array.from(parent.childNodes).indexOf(thisnxtSib);
        if (IsSingleSup) startOffset = endOffset = 0;
        else {
            if (!root_config) {
                if (($(xElement).find('a').attr('data-role')) == 'bibr' || ($(xElement).attr('data-role') == 'bibr')) {
                    root_config = iREF_SCOPE.Reference;
                } else {
                    root_config = iREF_SCOPE.Figure;
                }
            }
            /* xOP = root_config.indircite.openwrap;xCP = root_config.indircite.closewrap;sep = root_config.indircite.double_sep; */
            xOP = root_config[root_config.indircite ? 'indircite' : 'citation']['openwrap'] || "";
            xCP = root_config[root_config.indircite ? 'indircite' : 'citation']['closewrap'] || "";
            sep = root_config[root_config.indircite ? 'indircite' : 'citation']['double_sep'] || "";
            if (prevNode && nxtNode) {
                startOffset = prevNode.length;
                endOffset = 0;
                // {[2]}
                if ((prevNode.substr(prevNode.length - 1, 1) == xOP) && (nxtNode.substr(0, 1) == xCP)) {
                    startOffset = prevNode.length - 1;
                    endOffset = 1;
                    SEL_WITH_PARENTHESIS = true;
                    //? 21_DEC_22 - YA - ADD_PREFIX_SPACE ALSO
                    if (prevNode.substr(prevNode.length - 2, 1) == " ") {
                        startOffset = prevNode.length - 2;
                    }
                    // {[2,}3]
                } else if ((prevNode.substr(prevNode.length - 1, 1) == xOP) && (nxtNode.substr(0, sep.length) == sep)) {
                    startOffset = prevNode.length;
                    endOffset = sep.length;
                    // [1{,2]}
                } else if ((prevNode.substr(prevNode.length - sep.length, sep.length) == sep) && (nxtNode.substr(0, 1) == xCP)) {
                    startOffset = prevNode.length - sep.length;
                    endOffset = 0;
                    // [1{,2,}4]
                } else if ((prevNode.substr(prevNode.length - sep.length, sep.length) == sep) && (nxtNode.substr(0, sep.length) == sep)) {
                    startOffset = prevNode.length - sep.length;
                    endOffset = 1;
                }
            } else {
                // ? refer
                //https://stackoverflow.com/questions/67634286/invalidstateerror-failed-to-execute-surroundcontents-on-range-the-range-ha
                if (prevNode && !nxtNode) {
                    // <sup>1,2</sup>
                    if ((prevNode.substr(prevNode.length - sep.length, sep.length) == sep)) {
                        startOffset = 0;
                        endOffset = 1;
                        prevInd = Array.from(parent.childNodes).indexOf(xElement.previousSibling);
                        nxtInd = Array.from(parent.childNodes).indexOf(xElement);
                        HandleMethod.ExtractMethod = true;
                        HandleMethod.InsertBefore = xElement.previousSibling;
                        HandleMethod.InsertBeforeNext = xElement;
                    }
                } else if (!prevNode && nxtNode) {
                    // ? <sup>1,2</sup> || <insert>1,2,</insert>
                    if (nxtNode.substr(0, sep.length) == sep) {
                        startOffset = 1;
                        endOffset = 0;
                        prevInd = Array.from(parent.childNodes).indexOf(xElement);
                        nxtInd = Array.from(parent.childNodes).indexOf(xElement.nextSibling);
                        HandleMethod.ExtractMethod = true;
                        HandleMethod.InsertBefore = xElement;
                        HandleMethod.InsertBeforeNext = xElement.nextSibling;
                    }
                } else if (!prevNode && !nxtNode) {

                }
            }
        }
        //https://javascript.info/selection-range
        var range = document.createRange();
        if (IsSingleSup) {
            range.selectNode(xElement);
        } else if (startOffset != undefined && endOffset != undefined) {
            range.setStart(parent.childNodes.item(prevInd), startOffset);
            range.setEnd(parent.childNodes.item(nxtInd), endOffset);
        }
        if (HandleMethod.ExtractMethod) {
            // Create a tracked deletion node (or insertion node, depending on intent)
            const delEl = window._trackManager.getDelNode(null, {});

            /* #Step-1
                https://developer.mozilla.org/en-US/docs/Web/API/Range/surroundContents
                tempDOM.appendChild(range.extractContents());
                range.insertNode(tempDOM); 
                #Step-2 
                https://plainjs.com/javascript/manipulation/wrap-an-html-structure-around-an-element-28/ 
                https://stackoverflow.com/questions/6838104/pure-javascript-method-to-wrap-content-in-a-div
            */
            xElement.parentNode.insertBefore(delEl, HandleMethod.InsertBefore);
            // ? 03_DEC_2023 - YA - MOCK_LIVE
            delEl.append(HandleMethod.InsertBefore, HandleMethod.InsertBeforeNext);
        }
        return {
            "range": range,
            "pBool": pBool,
            "nBool": nBool,
            "HandleMethod": HandleMethod,
            "IS_SEL_WITH_PAIR": SEL_WITH_PARENTHESIS
        };
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('selectDOMRange', err.message + '__' + xElement.outerHTML);
    }
}
String.prototype.PARSE_ID_2_INT = function(IsNumber = true) {
    try {
        if (this == null || (typeof this !== 'string' && typeof this !== 'object')) {
            ErrorLogTrace('PARSE_ID_2_INT', 'invalid receiver');
            return IsNumber ? 0 : '';
        }
        const raw = (typeof this === 'string') ? this : String(this);
        let value = raw.replace(/\D/g, '');
        return IsNumber ? Number(value) : value;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('PARSE_ID_2_INT', err.message);
        return IsNumber ? 0 : '';
    }
};
String.prototype.getCiteXrefLabel = function() {
    try {
        var total, arr = [];
        var _this = this.toLocaleString();
        total = _this.split(',').length;
        $.each(_this.split(','), function(ind, entry) {
            arr.push(entry.PARSE_ID_2_INT());
        });
        /* let pattern  = (entry.indexOf('CIT')!=-1)?'':(entry.indexOf('F')!=-1?'Figure':'Table');
            let prefix=(ind==0)?(pattern+((total>1)?('s '):(' '))):((ind==total-1)?(' and '):(', '));
                label += prefix+number; */

        return arr.join(',');
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getCiteXrefLabel', err.message);
    }
};
commonfn['senddoidb'] = function(response) {
    if (response.r == 0) {
        ErrorLogTrace('SEND_DB_RECORD_NOT_INSERT', response.m);
    }
    debug.log(JSON.stringify(response));
};
// ? Citation Module Start 
function getlab(newItem, id, fid) {
    try {
        var [_name, _year, tag_html] = [$(newItem).find('.surname, .anonymous, .collab'), $(newItem).find('.year'), '<a class="xref" data-name="xref" data-role="bibr" ref-type="bibr" href="#' + id + '" rid="' + id + '" fid="' + fid + '">'];
        let [year_String, new_text_digit, max_count] = [((_year.length == 0) ? ('XXXX') : (getTxt(_year[0]))), newItem.textContent.replace(/.*\D(?=\d)|\D+$/g, 2)];
        if (year_String == "XXXX" && new_text_digit.length > 3) {
            year_String = new_text_digit;
        } else debug.log(new_text_digit);
        if (iREF_SCOPE['Reference']['citation']['max-author']) {
            max_count = iREF_SCOPE['Reference']['citation']['max-author'];
        } else {}
        if (_name.length > max_count) {
            _name = (getTxt(_name[0]) + ' et al., ' /*  + _taghtml */ );
        } else if (_name.length > 1) {
            // ? config to requirement
            _name = (getTxt(_name[0]) + ' & ' + getTxt(_name[1]) + ', ' /*  + _taghtml */ );
        } else if (_name.length > 0) {
            _name = (getTxt(_name[0]) + ', ' /*  + _taghtml */ );
        } else {
            _name = ("NOLABEL, " /*  + _taghtml */ );
        }
        tag_html += _name + year_String + '</a>';
        // _string.push(tag_html);
        debug.log(tag_html);
        return tag_html;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getlab', err.message);
    }
}

function _getBibCitation(idArr, _id, fid) {
    var _string = [];
    if (!fid) fid = s4();
    try {
        if (Array.isArray(idArr) && idArr.length != 0) {
            idArr = idArr.sort();
            $.each(idArr, function(index, idx) {
                idx = (iREF_SCOPE.IS_NAME_DATE) ? ((!IS_JOURNAL && idx.indexOf('ref-') == -1) ? ('ref-' + idx) : (idx)) : (idx);
                let ref = GlobalEditor.document.getById(idx).$;
                _string.push(getlab(ref, idx, fid));
            });
        } else {
            // ? new Reference to be insert
            _string.push(getlab(idArr, _id, fid));
            _string = _string[0];
        }
        return _string;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('_getBibCitation', err.message);
    }
}
String.prototype.insertPrefixCitation = function(prefix, len, type) {
    // ? Siblings element count handle
    try {
        var [_this, html, node, node_string, LastCommaInd] = [this.toLocaleString(), "", null, null, null];
        LastCommaInd = $(_this).length - 2;
        if (type == undefined && _this.indexOf('bibr') != -1) {
            type = 'bibr';
            // ? check citation if ref citation
        }
        $.each($(_this), function(idx, elm) {
            node_string = $(elm).prop('outerHTML');
            node = elm.nodeValue;
            // ? insert Prefix
            if (idx == 0) {
                html += (prefix != null) ? ($(elm).prepend(prefix).prop('outerHTML')) : ((elm.nodeType == 3) ? (node) : (node_string));
                // ?  replace comma with and
            } else if (LastCommaInd == idx && elm.nodeValue == ',' && len == 1 && type != 'bibr') {
                html += ' and ';
            } else {
                html += (elm.nodeType == 3) ? (node) : (node_string);
            }
        });
        return html;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('insertPrefixCitation', err.message);
    }
};
String.prototype.getPrevRefId = function() {
    try {
        return (this.PARSE_ID_2_INT() - 1).toLocaleString().getBibId();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getPrevRefId', err.message);
    }
};
String.prototype.getNextRefId = function() {
    try {
        return (this.PARSE_ID_2_INT() + 1).toLocaleString().getBibId();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getNextRefId', err.message);
    }
};

var EVENT_IN_REF_SECTION = {
    INSTANCE: {},
    COUNT_INFO: {
        begin_end_count: 0,
        other_loc_count: 0,
    },
    TEST_REGEX: function(reference) {
        try {
            // Define the regex patterns
            const bookPattern = /^([A-Z][a-zA-Z\s]+)\s\((\d{4})\)\.\s[A-Z][a-zA-Z\s]+:\s[A-Z][a-zA-Z\s]+[.]$/;
            const journalPattern = /^([A-Z][a-zA-Z\s]+),\s[A-Z][.]\s[A-Z][.],\s\((\d{4})\)\.\s[A-Z][a-zA-Z\s]+,\s(\d+)\((\d+)\):\s\d+-\d+[.]$/;
            // Example strings
            const bookReference = "Sapolsky, R. M. (2017). Behave: The biology of humans at our best and worst. Penguin Books.";
            const journalReference = "Patchett, R. A., Kelly, A. F., Kroll, R. G. (1992). Effect of sodium chloride on the intracellular solute pools of Listeria monocytogenes. Applied and Environmental Microbiology, 58(12): 3959–3963.";
            if (bookPattern.test(reference)) {
                console.log("Valid book reference:", reference);
            } else if (journalPattern.test(reference)) {
                console.log("Valid journal reference:", reference);
            } else {
                console.log("Invalid reference:", reference);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('TEST_REGEX', err.message);
        }
    },
    INSTANCE_RESET: function() {
        try {
            let {
                begin_end_count,
                other_loc_count
            } = this.COUNT_INFO;
            this.INSTANCE = {
                "begin_end": null,
                "begin_end_count": begin_end_count,
                "other_loc_count": other_loc_count,
                "begin": null,
                "end": null,
                "type": ""
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('INSTANCE_RESET', err.message);
        }
    },
    POSITION_CURSOR: function(IMS) {
        IMS = IMPACT_SELECTION;
        this.INSTANCE_RESET();
        var source = {};
        try {
            let IsSurname = (/surname/gi.test(IMS.NODE_CLAS)),
                IsInsert = (/surname/gi.test(IMS.NODE_CLAS)),
                itBegin = false;
            if (IMS.ISstartOfBlock || IMS.ISEndOfBlock || IsSurname) {
                if (IsSurname && IMS.PARENT.equals(IMS.G_PARENT.getFirst())) {
                    itBegin = !0;
                } else if (/string-name|surname|person-group|mixed-citation/gi.test(IMS.NODE_CLAS)) {
                    debug.log("begging");
                    itBegin = !0;
                }
            }
            if (itBegin) {
                source = {
                    "begin": IMS.ISstartOfBlock,
                    "end": IMS.ISEndOfBlock,
                    "begin_end": itBegin
                };
                this.COUNT_INFO.begin_end_count++;
            } else {
                this.COUNT_INFO.other_loc_count++;
            }
            let mixed_group = IMS.NODE_ASCENT_CLONE.querySelector("[publication-type]");
            if (mixed_group) source["type"] = mixed_group.getAttribute("publication-type") || "";
            this.INSTANCE = Object.assign(this.INSTANCE, source);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('POSITION_CURSOR', err.message);
            this.INSTANCE_RESET();
        } finally {
            return this.INSTANCE;
        }
    },
    FIRE_PASTE: function(evt, Options = {}, IMS) {
        IMS = IMPACT_SELECTION;
        var RETURN_VAL = true;
        try {
            RETURN_VAL = this.FIRE_RETURN();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_PASTE', err.message);
        } finally {
            return RETURN_VAL;
        }
    },
    FIRE_KEYDOWN: function(evt, Options = {}, IMS) {
        IMS = IMPACT_SELECTION;
        var RETURN_VAL = true;
        try {
            RETURN_VAL = this.FIRE_RETURN();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_KEYDOWN', err.message);
        } finally {
            return RETURN_VAL;
        }
    },
    FIRE_RETURN: function(evt, Options = {}, IMS) {
        IMS = IMPACT_SELECTION;
        this.POSITION_CURSOR();
        var RETURN_VAL = true,
            showToast = false;
        try {
            let {
                type,
                begin_end,
            } = this.INSTANCE, {
                begin_end_count,
                other_loc_count
            } = this.COUNT_INFO;
            if (/journal|book/gi.test(type) && false) {
                if (begin_end) {
                    AlertNewDialog.fire('EDIT_OR_INS_REF').then((result) => {
                        if (result.isConfirmed || result.dismiss === Swal.DismissReason.timer) {
                            GlobalEditor.execCommand(result.button3 ? "EDIT_UPDATE_REF" : "INSERT_REF_CMD");
                            if (result.button3 && begin_end_count == 1) AlertNewDialog.fire('WARN_POST_TOASTER');
                        } else if (result.isDenied) {

                        }
                        if (result.isDenied || !result.button3) {
                            if (this.COUNT_INFO && this.COUNT_INFO.begin_end_count) {
                                this.COUNT_INFO.begin_end_count--;
                            }
                        }
                    });
                } else {
                    GlobalEditor.execCommand("EDIT_UPDATE_REF");
                    if (other_loc_count == 1) AlertNewDialog.fire('WARN_POST_TOASTER');
                }
                return RETURN_VAL;
            } else return RETURN_VAL;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_RETURN', err.message);
        } finally {
            return RETURN_VAL;
        }
    }
};