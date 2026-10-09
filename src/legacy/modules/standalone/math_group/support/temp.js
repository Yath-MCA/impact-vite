/*jslint devel: true */

/**
 *
 * @event clickevent dom
 *  *MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
 * * http://jsfiddle.net/franciscop/9BCGx/4/ 
 * * https://demo.wiris.com/mathtype/en/developers.php
 * * https://www.cs.odu.edu/~zeil/cs390/latest/Public/texmath/demo.html
 * * https://saxarona.github.io/mathjax-viewer/
 * * https://mathjax.github.io/MathJax-demos-web/input-tex2mml.html
 * * https://mathjax.github.io/MathJax-demos-web/
 * * https://docs.wiris.com/mathtype/en/mathtype-integrations/mathtype-web-interface-features/full-mathml-mode---wirisplugins-js.html
 
 * * CONFIG FROM CKEDITOR 
 * * https://docs.wiris.com/mathtype/en/mathtype-integrations/technical-configurations/parameters.html
 
 */
console.log('Math');

function replaceImageSrcOnLocalhost() {
    // Run only on localhost
    GlobalEditor.document.$.body.querySelectorAll('img[src]').forEach(img => {
        const split = img.src.split("/IMPACT/");
        if (split.length > 1 && IS_LOCAL_HOST) {
            const newSrc = BUCKET_URL + split[1];
            img.setAttribute('src', newSrc);
            debug.log(newSrc, img.src);
        }
    });
};
document.addEventListener('DOMContentLoaded', function (event) {
    try {
        CKEDITOR.on('instanceReady', function (ev) {
            if (IS_LOCAL_HOST) {
                replaceImageSrcOnLocalhost();
            }
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('IMPACT_EDITOR-DOMContentLoaded', err.message);
    }
});


/**
@Module Math Handling all functionality
@param Element double click element
*/
const safeXmlCharacters = {
    id: "safeXmlCharacters",
    tagOpener: "«",
    tagCloser: "»",
    doubleQuote: "¨",
    ampersand: "§",
    quote: "`",
    realDoubleQuote: "¨"
};



window.Math_Module = {
    "cursor_position": function () {
        try {
            var selection = GlobalEditor.getSelection();
            var startElm = selection.getStartElement();
            let ascendant = startElm.getAscendant(function (el) {
                if (el && el.hasAttribute("math-type")) return el;
            });
            let math_root = startElm.$.closest('[math-type]');
            if (math_root && !math_root.id) math_root.id = s4();
            return {
                "startElm": startElm.$,
                "parentElm": math_root ? math_root : null,
                "range_Txt": selection.getSelectedText(),
                "Is_New_Elm": startElm.$.tagName == 'INSERT' || startElm.$.querySelector('insert') || startElm.$.closest('insert') ? true : false,
                "Is_empty_Elm": function () {
                    let count = startElm.getChildCount();
                    let close_parent = startElm.$.closest('div');
                    return (count == 0) ? true : false;
                },
                "ElementPath": GlobalEditor.elementPath(),
                "Math_Id": startElm.$.closest('[math-type]').id,
                "ck_elm": ascendant
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('cursor_position', err.message);
        }
    },
    "latex_open": function () {
        return String.fromCharCode(92) + '(';
    },
    "latex_close": function () {
        return String.fromCharCode(92) + ')';
    },
    "toolbarconfig": {
        "general": `<toolbar ref='general' removeLinks='true'>
            <removeTab ref='contextual' />
            <tab ref='general' rows='8'><removeItem ref='setColor'/></tab>
            <tab ref='general' rows='10'><removeItem ref='forceLigature'/><removeItem ref='setFontFamily'/><removeItem ref='setFontSize'/></tab>
            <tab ref='symbols' rows='5'><removeItem ref='&lt;'/><removeItem ref='&gt;'/></tab>
            <tab ref='arrows' rows='1'><removeItem ref='&#8612;'/><removeItem ref='&#10606;'/><removeItem ref='&#10607;'/><removeItem ref='&#8645;'/><removeItem ref='&#8693;'/><removeItem ref='&#8629;'/><removeItem ref='&#10562;'/><removeItem ref='&#10564;'/><removeItem ref='&#10529;'/><removeItem ref='&#10530;'/><removeItem ref='&#10602;'/><removeItem ref='&#10605;'/><removeItem ref='&#10606;'/><removeItem ref='&#10607;'/></tab>
            <tab ref='bracketsAndAccents' rows='5'><removeItem ref='upDiagonalStrike'/><removeItem ref='horizontalStrike'/><removeItem ref='downDiagonalStrike'/><removeItem ref='upAndDownDiagonalStrike'/></tab>
            <tab ref='bracketsAndAccents' extraRows='3'><removeItem ref='verticalStrike'/><removeItem ref='horizontalAndVerticalStrike'/><removeItem ref='encloseLongDivision'/></tab>
            <tab ref='scriptsAndLayout' rows='3'><removeItem ref='bigOpUnderover'/><removeItem ref='bigOpUnder'/><removeItem ref='bigOpSubsuperscript'/><removeItem ref='bigOpSubscript'/></tab>
            <tab ref='calculus' rows='5'><removeItem ref='&#8751;'/></tab>
            <tab ref='greek' extraRows='3'><removeItem ref='doubleStruckCapitalA'/><removeItem ref='doubleStruckCapitalB'/><removeItem ref='doubleStruckCapitalD'/><removeItem ref='doubleStruckCapitalE'/><removeItem ref='doubleStruckCapitalF'/><removeItem ref='doubleStruckCapitalG'/><removeItem ref='doubleStruckCapitalH'/><removeItem ref='imaginaries'/><removeItem ref='doubleStruckCapitalJ'/><removeItem ref='doubleStruckCapitalK'/><removeItem ref='doubleStruckCapitalL'/><removeItem ref='doubleStruckCapitalM'/><removeItem ref='naturals'/><removeItem ref='doubleStruckCapitalO'/><removeItem ref='primes'/><removeItem ref='rationals'/><removeItem ref='reals'/><removeItem ref='doubleStruckCapitalS'/><removeItem ref='doubleStruckCapitalT'/><removeItem ref='doubleStruckCapitalU'/><removeItem ref='doubleStruckCapitalV'/><removeItem ref='doubleStruckCapitalW'/><removeItem ref='doubleStruckCapitalX'/><removeItem ref='doubleStruckCapitalY'/><removeItem ref='integers'/><removeItem ref='doubleStruckA'/><removeItem ref='doubleStruckB'/><removeItem ref='doubleStruckC'/><removeItem ref='doubleStruckD'/><removeItem ref='doubleStruckE'/><removeItem ref='doubleStruckF'/><removeItem ref='doubleStruckG'/><removeItem ref='doubleStruckH'/><removeItem ref='doubleStruckI'/><removeItem ref='doubleStruckJ'/><removeItem ref='doubleStruckK'/><removeItem ref='doubleStruckL'/><removeItem ref='doubleStruckM'/><removeItem ref='doubleStruckN'/><removeItem ref='doubleStruckO'/><removeItem ref='doubleStruckP'/><removeItem ref='doubleStruckQ'/><removeItem ref='doubleStruckR'/><removeItem ref='doubleStruckS'/><removeItem ref='doubleStruckT'/><removeItem ref='doubleStruckU'/><removeItem ref='doubleStruckV'/><removeItem ref='doubleStruckW'/><removeItem ref='doubleStruckX'/><removeItem ref='doubleStruckY'/><removeItem ref='doubleStruckZ'/></tab>
        </toolbar>`
    },
    "inline": {
        "tag": "span",
        "className": "inline-formula",
        "graphic": "inline-graphic",
        "attr": {
            "id": "",//function () {return window.Math_Module.generateId();}
            "math-type": "",
            "data-math": "new",
            'data-mathtype': function () {
                try {
                    var { editMode } = GlobalEditor.config.wiriseditorparameters;
                    return editMode == "MathML" ? 'mml' : 'tex';
                } catch (error) {
                    return "";
                }
            }
        }
    },
    "display": {
        "tag": "div",
        "className": "disp-formula",
        "graphic": "graphic",
        "label": "label",
        "attr": {
            // id: () => window.Math_Module.generateId(),
            id: "",
            "math-type": "",
            "data-math": "new",
            'data-mathtype': function () {
                try {
                    var { editMode } = GlobalEditor.config.wiriseditorparameters;
                    return editMode == "MathML" ? 'mml' : 'tex';
                } catch (error) {
                    return "";
                }
            }
        }
    },
    "alternatives": {
        "tag": "span",
        "className": "alternatives",
        "attr": {}
    },
    "TEX": {
        "tag": "span",
        "className": "TEX",
        "attr": {
            contenteditable: "false",
            id: "",
        }
    },
    "label": {
        "tag": "span",
        "className": "label",
        "attr": {
            "contenteditable": "false"
            //,"data-value": () => this.getMathCount()
        }
    },
    "xlink": "http://www.w3.org/1999/xlink",
    "img_src": function (id) {
        return BUCKET_URL + '/' + DOC_ID + '/images/' + this.name(id) + '.png';
    },
    "name": function (id) {
        return SHARED_KEY.projectname + '_' + id + '.pdf';
    },
    "eqOrder": {},
    "eqFind": "div.disp-formula span.label",
    "eqFindnumer": 'div.disp-formula span.label:not([track-lab-type="remove"]', //?for number to unnumber
    "getMathCount": function (options) {
        debug.log('getMathCount');
        try {
            // ? Default true
            options = !options ? ({
                addparenthesis: true,
                increment: true
            }) : options;
            let tempCount = GlobalEditor.document.find(this.eqFind).count();
            tempCount = options.increment ? (tempCount + 1) : (tempCount);
            return options.addparenthesis ? ('(' + tempCount + ')') : (tempCount);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getMathCount', err.message);
        }
    },
    "classArr": ["disp-formula", "inline-formula"],
    "type": "",
    "math_type": function () {
        try {
            debug.log('math_type');
            var ST_ELEMENT = this.cursor_position();
            return ST_ELEMENT.startElm.classList.contains('Wirisformula');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('math_type', err.message);
        }
    },
    "selMathTex": false,
    "seq": false,
    "reset": function () {
        this.type = "";
        this.seq = false;
    },
    //? Command all Find and replace Details as per srini and siva instruction 10-04-2024
    Wiris_replaceObj_Save: {
        "&amp;": "&",
        ">": "\\gt",
        "<": "\\lt",
        "&gt;": "\\gt",
        "&lt;": "\\lt",
        "&lt;": "\\lt",
        //"\\sum": "{\\mathop \\sum }",
        //"\\sum": "\\mathop{\\sum }",
        // "\\phi" : "\\mathop{\\phi }",
        //"\\int": "\\mathop{\\int }",
        //"\\int": "\\mathop \\int",
        //"lim" : "\\mathop{lim}",
        //"\\max": "\\mathop{\\max }",
        //"\\wedge": "\\mathop{\\wedge }"
    },
    Wiris_replaceObj_Open: {
        "\\gt": ">",
        "\\lt": "<",
        "&gt;": ">",
        "&lt;": "<",
        // "{\\mathop \\sum }": "\\sum",
        // "\\mathop{\\sum }": "\\sum",
        //  "\\mathop{\\phi }": "\\phi",
        // "\\mathop{\\int }": "\\int",
        // "\\mathop \\int": "\\int",
        //"\\mathop{lim}": "lim",
        // "\\mathop{\\max }": "\\max",
        // "\\mathop{\\wedge }": "\\wedge"
    },
    Wiris_Convert_MML: {
        "<": "«",
        ">": "»",
        "\"": "¨",
        "&": "§",
        "'": "`",
    },
    showLoop(type, isSeq) {
        if (type == "") {
            this.type = "inline";
            this.seq = false;
        } else {
            this.type = type;
            this.seq = isSeq;
        }
        this.mathrecord({
            stage: "open",
            mathtype: "new"
        });
    },
    containsSafeXmlCharacter(str) {
        try {
            return Object.values(safeXmlCharacters).some(char => str.includes(char));
        } catch (error) {
            return false;
        }
    },
    InterChangelabel: function (format) {
        debug.log('InterChangelabel', format);

        const SELECTION = this.cursor_position();
        const doc = GlobalEditor.document.$;
        const parentId = SELECTION.parentElm.id;
        const parentClass = SELECTION.parentElm.className;
        const parentNode = doc.querySelector(`[id="${parentId}"]`) || doc.querySelector(`[data-math="${parentId}"]`);
        const labelNode = parentNode.querySelector('.label');

        if (this.classArr[0] !== parentClass) return;

        this.seq = true;

        if (labelNode) {
            const trackType = labelNode.getAttribute('track-lab-type') || null;
            const isNewLabel = trackType === 'new';

            if (format === 'remove' && (isNewLabel || SELECTION.Is_New_Elm)) {
                labelNode.remove();
            } else {
                const originalValue = labelNode.getAttribute('data-value');

                if (!SELECTION.Is_New_Elm && format === 'remove') {
                    const trackAttrs = {
                        'default': ["dt", "du", "drn"],
                        'data-ovalue': originalValue,
                        'track-lab-type': 'remove',
                        'data-track-value': originalValue
                    };
                    commonMethods.setAttr(labelNode, trackAttrs);
                    this.deleteCitation(SELECTION);
                } else if (!SELECTION.Is_New_Elm && format === 'add') {
                    if (trackType === 'remove') {
                        commonMethods.removeAttr(labelNode, [
                            'track-lab-type',
                            'data-time',
                            'data-username',
                            'data-user-name',
                            'data-rolename'
                        ]);
                    }
                }

                labelNode[format === 'add' ? 'setAttribute' : 'removeAttribute']('data-value', this.getMathCount());
            }

        } else {
            // Add new label span
            const labelFragment = this.stringToFrag(this.getLabelString());
            parentNode.append(labelFragment);

            if (!SELECTION.Is_New_Elm) {
                const newLabel = parentNode.querySelector('span.label');
                if (newLabel) newLabel.setAttribute('track-lab-type', 'new');
            }
        }

        // Fix for insert tag content mutation
        if ($(parentNode).find('insert').length > 0) {
            $(parentNode).find('insert').append('<span style="display:none;" class="Dumins">Next</span>');
        }

        if (this.seq) {
            this.ReOrderingEqLabel(doc);
        }

        this.reset();

        // Delay reset to fix num↔unnum display state issue
        setTimeout(() => {
            this.setCursor(SELECTION.Math_Id);

            const dumins = GlobalEditor.document.find('.Dumins');
            if (dumins.count()) {
                $(dumins.$).each(function () {
                    $(this).remove();
                });
            }
        }, 2000);
    },

    "deleteCitation": function (selectionInfo) {
        debug.log('deleteCitation');
        try {
            //code goes here
            var citeList = (GlobalEditor.document.$).querySelectorAll(`a[rid*=${selectionInfo.parentElm.id}]`);
            Array.from(citeList).forEach((xref, ind, arr) => {
                let RID = xref.getAttribute('rid').split(" ");
                if (RID.length == 1) {
                    xref.setAttribute('data-cite', "delete");
                    if (xref.hasAttribute('data-track'))
                        xref.removeAttribute('data-track');
                } else {

                }

            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('deleteCitation', err.message);
        }
    },
    "ReOrderingEqLabel": function () {
        debug.log('ReOrderingEqLabel');
        try {
            //code goes here
            if (this.seq != true) {
                // return;
            }
            var retRurn = false;

            (GlobalEditor.document.$).querySelectorAll(this.eqFindnumer).forEach((el, ind, arr) => {
                let parent = el.parentElement.tagName == "INSERT" ? el.parentElement.parentElement : el.parentElement;
                //? Incase old articles don't have an data-value attribute
                let lab = el.hasAttribute('data-value') ? el.getAttribute('data-value') : el.innerHTML;
                let labIsNew = el.getAttribute('track-lab-type') == "new";
                let olab = el.getAttribute('data-ovalue');
                let nIndex = '(' + (ind + 1) + ')';
                let trackLab = olab != null ? olab : lab;
                this.eqOrder[ind] = {
                    label: lab,
                    olabel: olab,
                    index: ind,
                    id: parent.id,
                    isNew: parent.hasAttribute('data-math') && parent.getAttribute('data-math') == "new"
                };
                if (nIndex != lab) {
                    retRurn = true;
                    this.eqOrder[ind].olabel = olab ? olab : lab;
                    this.eqOrder[ind].label = nIndex;
                    el.setAttribute('data-value', nIndex);
                    if (!this.eqOrder[ind].isNew && !labIsNew) {
                        //? Assign track view attributes
                        el[(nIndex != olab) ? 'setAttribute' : 'removeAttribute']('data-track-value', trackLab);
                        if (!olab) {
                            el.setAttribute('data-ovalue', lab);
                        }
                    }
                    //? remove the unwanted label value need to handle in conversion
                    el.innerHTML = '';
                    this.citationReOrder(this.eqOrder[ind]);
                }
            });
            if (retRurn) {
                console.log('MATH RENUMBER START');
                //this.citationReOrder();
            }
            this.reset();
            //? Command for unwanted line
            //this.setData((!0 ? GlobalEditor.document.$ : this.iDOM).innerHTML);
            console.log(this.eqOrder);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ReOrderingEqLabel', err.message);
        }
    },
    citationReOrder: function (json) {
        debug.log('citationReOrder');
        if (!json || !json.id) return;

        (GlobalEditor.document.$).querySelectorAll(`a[rid*="${json.id}"]`).forEach((el, ind, arr) => {
            //<a class="xref" data-name="xref" data-role="disp-formula" ref-type="disp-formula" rid="M1" href="#M1">Equation 1</a>
            var RID = el.getAttribute('rid').split(" ");
            let nLab = json.label.slice(1, -1);
            let tLab = json.olabel.slice(1, -1);
            if (RID.length == 1) {
                el.textContent = "Equation " + nLab;
            } else {

            }
            if (!json.isNew) {
                el.setAttribute('data-cite', "edit");
            }
            let IsSame = el.hasAttribute('data-track') ? (el.getAttribute('data-track') == nLab) : false;
            el[IsSame ? 'removeAttribute' : 'setAttribute']('data-track', tLab);
        });
        //console.log(json);
    },


    getWirisMathCode: function (eqText, Stage) {
        debug.log('getWirisMathCode');
        try {
            let newMath = eqText;
            //let conver = Stage == "open" ? this.Wiris_replaceObj_Open : this.Wiris_replaceObj_Save;
            for (const [key, value] of Object.entries(this.Wiris_Convert_MML)) {
                if (newMath.indexOf(key) > -1) {
                    newMath = (newMath).replaceAll(key, value);
                }
            }
            debug.log([eqText, newMath]);
            // return (newMath).replaceAllSplit('&amp;', '&');
            return newMath;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getWirisMathCode', err.message);
        }
    },
    RenderWirisFormula: function (e, Opstions = {}, $this, $Core) {
        $this = this;
        Math_Module.arrMATH = [];
        $Core = WirisPlugin.currentInstance.core;

        debug.log('RenderWirisFormula');
        try {
            //? Check the Math Attributes and Conditions
            var getValAttr = function (elm, key, IsBoolean, Options = {}) {
                try {
                    var tempVal = elm.hasAttribute(key) && elm.getAttribute(key) || null;
                    if (typeof IsBoolean == "boolean") return !!tempVal;
                    else return (typeof IsBoolean == "string") ? (tempVal == IsBoolean ? !0 : !1) : (tempVal);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('getValAttr', err.message);
                }
            };
            //? Check if Wiris Plugin Details Loaded or Not
            if (!!WirisPlugin && !!WirisPlugin.Latex) {
                e = e ? e : GlobalEditor;
                let callClear = false;
                Array.from(e.document.find(".TEX").toArray()).forEach((eqn, idx, arr) => {
                    let Parent_Equation = eqn.$ ? eqn.$.parentElement : eqn.parentElement;

                    //? Initialize the Config Details true or False
                    let Tag_name = "data-name",
                        name_space = 'xlink:href',
                        Edit_Insert = 'data-math',
                        New_Math = 'data-math',
                        New_Math_identifier = 'data-mathnew',
                        //ititle_img = 'Note: Low resolution image is used for optimum web page viewing.',
                        //? Old Edited
                        IS_EDITED = getValAttr(Parent_Equation, Edit_Insert, 'edit'),
                        //? Old Inserted
                        IS_NEW = getValAttr(Parent_Equation, New_Math, 'new');
                    //? New Uploaded
                    var IS_NEW_Uploaded = getValAttr(Parent_Equation, New_Math_identifier, 'new');
                    // ? fetch config values
                    var IS_WIRIS = ((IS_EDITED || IS_NEW) && !IS_NEW_Uploaded) ? true : false;

                    Parent_Equation.querySelectorAll(".TEX, .graphic, .inline-graphic").forEach(ele => {
                        if (ele) {
                            let data_name = getValAttr(ele, Tag_name),
                                data_href = null;
                            if ((/TEX/gi).test(data_name)) ele.classList[IS_WIRIS ? 'add' : 'remove']('wirisview');
                            else if (data_name && (/graphic/gi).test(data_name)) {
                                if (ele.querySelector("img")) {
                                    let src = ele.querySelector("img").src;
                                    if (src.indexOf(".pdf") > -1) {
                                        let parts = src.split("/"),
                                            filename = parts[parts.length - 1];
                                        filename = filename.replace(".pdf", ".png");
                                        ele.querySelector("img").src = parts.join("/");
                                    }
                                } else if (IS_WIRIS && !ele.querySelector("math")) {
                                    //? for Wiris Image format have math elements by DR                                 
                                    callClear = true;
                                    let eqTxt = eqn.getText();
                                    eqTxt = Math_Module.getParserMathCode(eqTxt, "open");
                                    let MathML_IMG = WirisPlugin.Latex.getMathMLFromLatex(eqTxt, "render");
                                    ele.append(MathML_IMG);
                                } else {
                                    //? if Img tag missing add 
                                    data_href = getValAttr(ele, name_space);
                                    if (!data_href) return;
                                    let tempFileName = data_href.replace(".pdf", ".png"),
                                        fragString = `<img role="graphic" src="${BUCKET_URL}${DOC_ID}/images/${tempFileName}"></img>`,
                                        imgFrag = document.createRange().createContextualFragment(fragString);
                                    ele.append(imgFrag);
                                }
                            }
                        } else {
                            console.log("===MATH undefined ===");
                        }
                    });
                    IS_WIRIS ? "" : Parent_Equation.setAttribute("data-mathnew", "new");
                });

            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('RenderWirisFormula', err.message);
        }
    },

    /* WORKING FUNCTION LIST */
    checkandUpdate_svgView: function (mathEl, Options = {}, WirisModule, IMS) {
        IMS = IMPACT_SELECTION;
        var self = Math_Module;
        debug.log('checkandUpdate_svgView');
        try {
            // Ensure configuration is loaded
            if (!this.ck_config) {
                this.getConfig();
            }

            // Destructure configuration and options
            const {
                IsMathMLWorkFlow = false
            } = this.ck_config || {};

            const {
                Math_Id,
                OLD_MATH_CODE
            } = Math_Module;

            const {
                latex = '',
                svg = null
            } = Options;


            // Prepare attributes and constants
            const attributes = {
                'data-math': 'edit',
                'data-mathtype': IsMathMLWorkFlow ? 'mml' : 'tex',
                'org-math-src': IsMathMLWorkFlow ? '' : OLD_MATH_CODE,
                'default': ["dt", "du", "drn"]
            };

            const LATEX_WRAPPER = '$$';
            const laTex = `${LATEX_WRAPPER}${self.getParserMathCode(latex, 'save')}${LATEX_WRAPPER}`;

            // Find the math root element
            const mathRoot = self._findMathRootElement(Math_Id, IMS);

            if (!mathRoot) {
                console.warn('Could not find math root element');
                return;
            }

            // Update tracking information
            self._updateMathElementAttributes(mathRoot, attributes, IsMathMLWorkFlow);

            // Update SVG and TeX content
            self._updateMathContent(mathRoot, laTex, svg, IsMathMLWorkFlow);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('checkandUpdate_svgView', err.message);
        }
    },
    getParserMathCode: function (eqText, Stage) {
        debug.log('getParserMathCode');
        try {
            //var math_decode = (new CKEDITOR.htmlParser.text(CKEDITOR.tools.htmlEncode($(GlobalEditor.document.find('#Marker1').$).text())).value).replaceAllSplit('&amp;','&');

            let newMath = new CKEDITOR.htmlParser.text(CKEDITOR.tools.htmlEncode(eqText)).value;
            let conver = Stage == "open" ? this.Wiris_replaceObj_Open : this.Wiris_replaceObj_Save;
            for (const [key, value] of Object.entries(conver)) {
                if (newMath.indexOf(key) > -1) {
                    newMath = (newMath).replaceAllSplit(key, value);
                }
            }
            debug.log([eqText, newMath]);
            // return (newMath).replaceAllSplit('&amp;', '&');
            return newMath;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getParserMathCode', err.message);
        }
    },
    insertMath: function (Node, contentManager) {
        try {
            debug.log('insertMath');
            IMPACT_SELECTION.getInfo(GlobalEditor);
            this['IMS'] = IMPACT_SELECTION;
            // ? Insert math after para - Books
            let Its_P = this['IMS'].NODE_CLAS.includes('p');

            if (contentManager.isNewElement) {
                $(Node).insertAfter(this.IMS[Its_P ? 'NODE' : 'PARENT'].$);
            }

            if (this.seq) {
                this.ReOrderingEqLabel();
            }

            // setTimeout((elm_id) => {
            //     Math_Module.setCursor(elm_id);
            // }, 1000, Node.id);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('insertMath', err.message);
        }
    },
    findClosestElement: function (element, options = {
        "assignId": false
    }) {
        debug.log('findClosestElement');
        var self = Math_Module,
            {
                assignId
            } = options;

        try {

            if (Node.ELEMENT_NODE !== element.nodeType) return "";
            // Define the selector string for the desired attributes and classes 
            const selector = '[data-mathnew], [data-math], [math-type], .inline-formula, .disp-formula';
            // Use the closest method to find the nearest matching ancestor 
            const el = element.closest(selector);
            if (assignId && el) {
                self.Math_id = el.id;
            } else return el;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('findClosestSpecifiedElement', err.message);
            return "";
        }
    },
    hasSpecifiedAttributesOrClasses: function (element) {
        var self = Math_Module;
        debug.log('hasSpecifiedAttributesOrClasses');
        try {
            // Check for attributes
            const hasAttributes = element.hasAttribute('data-mathnew') || element.hasAttribute('data-math') || element.hasAttribute('math-type');
            // Check for classes 
            const hasClasses = self._isFormulaElement(element);
            // Return true if any of the conditions are met 
            return hasAttributes || hasClasses;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('hasSpecifiedAttributesOrClasses', err.message);
            return true;
        }
    },
    UpdateTrackInfo: function (el, attrObj) {
        debug.log('UpdateTrackInfo');
        try {
            if (!el) return;

            const isMathMLContains = this.containsSafeXmlCharacter(attrObj['org-math-src']);
            const isMathEl = this.hasSpecifiedAttributesOrClasses(el);

            if (isMathMLContains || isMathEl) {
                delete attrObj['org-math-src'];
            }
            el = el.$ ? el.$ : el;
            commonMethods.setAttr(el, attrObj);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('trackInfoUpdate', err.message);
        }
    },
    // Helper method to find math root element
    _findMathRootElement(mathId, impactSelection) {
        var self = Math_Module;
        debug.log('_findMathRootElement');
        try {
            // If math ID is provided and element exists
            var mathEl = GlobalEditor.document.getById(mathId);
            if (mathId && mathEl !== null) {
                if (self._isFormulaElement(mathEl)) {
                    return mathEl.$;
                } else {
                    mathEl = mathEl.getAscendant(self._isFormulaElement);
                    if (mathEl && mathEl.$) return mathEl.$;
                }
            }
            // Fallback to parent element for graphic or Wiris formula
            const nodeClass = impactSelection.NODE_CLAS;
            const isGraphicOrWirisFormula = /graphic|Wirisformula/gi.test(nodeClass);

            if (isGraphicOrWirisFormula) {
                return impactSelection.PARENT.$;
            }

            return null;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_findMathRootElement', err.message);
        }
    },

    // Helper method to check if an element is a formula
    _isFormulaElement(element) {
        try {
            debug.log('_isFormulaElement');
            return element && typeof element.getAttribute === 'function' && /formula/.test(element.getAttribute('class') || element.getAttribute('data-name'));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_isFormulaElement', err.message);
        }
    },

    // Helper method to update math element attributes
    _updateMathElementAttributes(mathRoot, attributes, isMathMLWorkflow) {
        try {
            debug.log('_updateMathElementAttributes');
            if (mathRoot && (!isMathMLWorkflow || !mathRoot.hasAttribute('data-math'))) {
                this.UpdateTrackInfo(mathRoot, attributes);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_updateMathElementAttributes', err.message);
        }
    },

    // Helper method to update math content
    _updateMathContent(mathRoot, laTex, svg, isMathMLWorkflow) {
        debug.log('_updateMathContent');
        try {
            let spanView, img;

            if (isMathMLWorkflow) {
                img = mathRoot.querySelector('img');
                spanView = true;
            } else {
                spanView = mathRoot.querySelector('.graphic, .inline-graphic');
                img = spanView.querySelector('img');
            }
            // Update TeX content if exists
            const texElement = mathRoot.querySelector('.TEX');

            if (texElement) texElement.innerHTML = laTex;

            // Update SVG content
            if (spanView) {
                if (!img && svg) {
                    spanView.append(svg);
                } else if (img && svg) {
                    img.after(svg);
                    commonMethods.removeEl(img);
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_updateMathElementAttributes', err.message);
        }
    },

    openMath: function (texEl, action, self) {
        self = this;
        debug.log('openMath');

        const mathMLSelector = ".Wirisformula,[data-mathnewml],math,[data-mathml]";

        try {
            // if (DOC_INFO.get("CLIENT").toLocaleUpperCase() == "OHO") return false;
            if (!self.ck_config) this.getConfig();

            self.rightClick = (action == "edit" ? true : false);
            const clientLower = (SHARED_KEY?.client || '').toLowerCase();
            //? Get Parent Element
            let c = GlobalEditor.createRange();
            let _NODE = GlobalEditor.getSelection().getSelectedElement().getAscendant(function (el) {
                return el && typeof el.getAttribute == "function" && (/formula/.test(el.getAttribute('class') || el.getAttribute('data-name')));
            });

            let isTexFormat = _NODE.findOne(".TEX") ? true : false;
            let wirisEl = _NODE.findOne(".Wirisformula");
            let mathMLEl = _NODE.findOne(mathMLSelector);
            let current_item = _NODE.findOne(isTexFormat ? ".TEX" : mathMLSelector);
            self.Math_Id = _NODE.$.id;
            debug.log(isTexFormat ? ".TEX" : ".Wirisformula");

            if (isTexFormat) {
                self.OLD_MATH_CODE = current_item?.$?.innerText || "";
                GlobalEditor.getSelection().selectElement(current_item);
            } else {
                // Check if the element exists
                if (current_item) {
                    // Get the attribute value of 'data-mathnewml' or 'data-mathml'
                    self.OLD_MATH_CODE = current_item.getAttribute("data-mathnewml") || current_item.getAttribute("data-mathml") || "";
                    // console.log(attributeValue);
                } else {
                    console.log("Element not found");
                }
            }
            var showErrorDialog = false;

            if (IS_ONLINE) {
                if (isTexFormat) {
                    if (self.IS_Valid_TEX(current_item)) {
                        c.moveToPosition(current_item, CKEDITOR.POSITION_AFTER_START);
                        c.select();
                    } else {
                        showErrorDialog = true;
                    }
                }
                // ? else will come mathMl
            } else showErrorDialog = true;

            if (!showErrorDialog) {
                GlobalEditor.execCommand('ckeditor_wiris_openFormulaEditor', true);
            } else {
                c.moveToPosition(_NODE, CKEDITOR.POSITION_AFTER_END);
                c.select();
                IMPACT_SELECTION.getInfo();
                NewQueryModule.show('note');
                AlertNewDialog.fire('MathError');
            }

            return;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('openMath', err.message);
        }
    },
    mathrecord: function (option = {}, wiris_status = {}, input) {
        debug.log('mathrecord');
        try {
            //? Record Math history open and close session wise.
            const isOpen = /open/.test(option.stage);

            const json_data = {
                tbl: "mathreport",
                mathid: Math_Module.Math_Id
            };


            const currentTime = new Date().toISOString();

            if (isOpen) {
                Object.assign(json_data, {
                    opentime: currentTime,
                    recordtype: option.stage,
                    mathtype: option.mathtype,
                    wirisresponseopen: wiris_status,
                    org_input: input || "",
                    ...GET_JSON("default")
                });
            } else if (Math_Module.db_id) {
                // ? Edit/unedit json object
                // ? Optional: Set input if provided and wiris_status is not empty
                if (input && Object.keys(wiris_status).length > 0) {
                    wiris_status.input = input;
                }

                Object.assign(json_data, {
                    find: { _id: Math_Module.db_id },
                    update: {
                        recordtype: option.stage,
                        closetime: currentTime,
                        wirisresponseclose: wiris_status
                    }
                });
            }

            debug.log(JSON.stringify(json_data));

            // ? call API Insert, find and updated

            commonfn.callajax(json_data, 'mathrecordstore', isOpen ? API_UPDATE_INSERT : API_FIND_UPDATE_INSERT, isOpen);

        } catch (err) {
            ErrorLogTrace('mathrecord', err.message);
        }
    },
    Can_trigger_MathView_Bool: function (Elm, self) {
        self = Math_Module;
        debug.log('Can_trigger_MathView_Bool');
        try {


        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Can_trigger_MathView_Bool', err.message);
        }
    },
    IS_Valid_TEX: function (texEl, option = {}) {
        Math_Module.MathError = false;
        debug.log('IS_Valid_TEX');
        try {
            const { innerText, id } = texEl.$;

            let Math_TEX = Math_Module.getParserMathCode(innerText, "open");

            // Connect the Pugin and Validate the math get variables true or false
            WirisPlugin.Latex.getMathMLFromLatex(Math_TEX, id);
            if (Math_Module.MathError) {
                console.error("MATH ERROR");
                return false;
            } else {
                // ? for remove unwanted zero width space
                Math_TEX = Math_TEX.replace(/[\u200B-\u200D\uFEFF]/g, '');
                // ? set the text content of the texEl element
                texEl.$.textContent = Math_TEX;
                return true;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Math_check_conditon', err.message);
        }

    },
    getConfig: function () {
        debug.log('getConfig');
        try {
            if (GlobalEditor.config.wiriseditorparameters) {
                let {
                    wiriseditorparameters,
                    MathML_InitialRendering
                } = GlobalEditor.config;
                this.ck_config = Object.assign({}, wiriseditorparameters, {
                    "MathML_InitialRendering": MathML_InitialRendering,
                    IsMathMLWorkFlow: wiriseditorparameters.editMode == "MathML"
                });
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getConfig', err.message);
        }
    },
    getElementsfromConfig: function (tagConfig, clientLower = "", self) {
        self = Math_Module;
        debug.log('getElementsfromConfig');
        const { id, pdfId } = this.generateId();
        const isPlos = clientLower === "plos";
        try {

            // Ensure the tagConfig is an object and has the required properties
            const { className, attr, tag, graphic } = tagConfig;
            if (/formula/gi.test(className)) {
                // Handle formula-specific logic here
                attr.id = id;
            }

            const params = Object.assign({}, {
                "class": className,
                "data-name": className
            }, (attr || {}));
            // Ensure the tag is a valid string
            const newElement = commonMethods.setAttr(tag, params);
            if (graphic) {
                // Create a graphic element with the specified attributes
                const attributes = {
                    class: isPlos ? "graphic" : className,
                    "data-name": isPlos ? "graphic" : className,
                    ...(isPlos && {
                        id: `${id}g`,
                        position: "anchor",
                        mimetype: "image",
                        "xlink:type": "simple"
                    }),
                    "xlink:href": pdfId,
                    "xmlns:xlink": this.xlink,
                    "self-close": "true"
                };


                const graphicElement = commonMethods.setAttr('span', attributes);

                // Create an image element with the specified attributes
                // If the graphic config has a 'src' attribute, set it to an empty string
                /*                
                const src = `${BUCKET_URL}${DOC_ID}/images/${pdfId}`;
                // Set the 'role' attribute to the className    
                const imgElement = commonMethods.setAttr("image", {
                    "role": "graphic",
                    src: src,
                });
                // Set the width and height attributes if they exist in the graphic config
                graphicElement.append(imgElement);
                */

                // Append the graphic element to the new element
                newElement.append(graphicElement);

            }
            return newElement;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getNewElements', err.message);
        }
    },
    getNewItem: function (node, mathData = {}, self) {
        self = Math_Module;
        debug.log('getNewItem');
        self.trackManager = window._trackManager || self.trackManager || new trackManager(GlobalEditor);
        try {

            const clientLower = (SHARED_KEY?.client || '').toLowerCase();

            if (!this.ck_config) {
                this.getConfig();
            }

            // Destructure configuration and options
            const {
                IsMathMLWorkFlow = false
            } = this.ck_config || {};

            // ? get class module from Module_main.js Lazy initialize trackManager

            if (self.type == "") {
                self.type = "inline";
                self.seq = false;
            }

            // Get current type configuration
            const currentType = self[self.type];
            const alter = self.alternatives;


            // Create alternatives element
            // Create the main math container element            

            const mathElement = this.getElementsfromConfig(currentType, clientLower);
            const texElement = this.getElementsfromConfig(self.TEX);
            const graphicNode = mathElement.querySelector('.graphic');

            texElement.append(node);
            texElement.setAttribute('id', s4());

            // Client-specific rendering logic
            switch (clientLower) {
                case 'oup':
                case 'lww':
                    mathElement.append(texElement);
                    break;
                case 'plos':
                    const alterElement = this.getElementsfromConfig(alter);
                    alterElement.append(texElement);
                    mathElement.append(alterElement);
                    break;
                default:
                    mathElement.append(texElement);
                    break;
            }

            // ? here replace svg from Wiris Plugin
            if (mathData.svg) {
                const svgElement = mathData.svg;
                graphicNode.querySelector('img')?.remove(); // Remove the image if it exists    
                graphicNode.append(svgElement);
            }

            if (self.type == "inline") {

                return mathElement;
            } else {
                if (this.seq) {
                    const label = this.getElementsfromConfig(self.label);
                    if (clientLower === 'plos') {
                        mathElement.append(label);
                    } else {
                        if (graphicNode) graphicNode.append(label);
                    }
                }
                // get insert node from lite plugins method
                var insWithTrack = self.trackManager.getInsNode(mathElement, { childOnly: true });
                // Append alternatives to math element
                mathElement.append(insWithTrack);
                return mathElement;
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getNewMathML', err.message);
            return node;
        }
    },
    generateId: function (type = 'inline') {
        try {
            const clientUpper = SHARED_KEY.client?.toUpperCase();
            const { projectname, fileid, titleinfo, identifier } = SHARED_KEY;
            const doc = GlobalEditor.document.$;

            // Determine next sequence number from existing formula elements
            let maxNum = 0;
            doc.querySelectorAll('.inline-formula, .disp-formula').forEach(el => {
                const id = el.getAttribute('id');
                const match = id?.match(/(\d{3,4})$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            });
            const nextSeq = maxNum + 1;

            const padded4 = nextSeq.toString().padStart(4, '0');
            const padded3 = nextSeq.toString().padStart(3, '0');

            // --- Client-specific logic ---
            switch (clientUpper) {
                case 'OUP': {
                    const articleId = projectname ||
                        (fileid && titleinfo?.cover ? `${titleinfo.cover}_${fileid}` :
                            identifier?.substring(identifier.lastIndexOf('/') + 1) || 'OUP_ARTICLE');

                    const id = type === 'inline' ? `IN${padded4}` : `M${nextSeq}`;
                    const pdfId = `${articleId}_${id}.pdf`;
                    return { id, pdfId };
                }

                case 'PLOS': {
                    const match = identifier?.match(/journal\.(\w+\.\d{7})$/); // e.g., "pwat.0000299"
                    const baseId = projectname || fileid || (match ? match[1] : 'unknown.0000000');

                    const id = `${baseId}.e${padded3}`;
                    const pdfId = `${id}.pdf`;
                    return { id, pdfId };
                }

                case 'LWW': {
                    const articleId = projectname || fileid || identifier || 'LWW_ARTICLE';
                    const id = s4(); // random unique id
                    const pdfId = `${articleId}_M${padded4}.pdf`;
                    return { id, pdfId };
                }

                default: {
                    const id = s4();
                    const pdfId = `default_${id}.pdf`;
                    return { id, pdfId };
                }
            }

        } catch (error) {
            const fallbackId = s4();
            return { id: fallbackId, pdfId: `fallback_${fallbackId}.pdf` };
        }
    },

    CHECK_ONLINE: function (IsOnline, Submit) {
        debug.log('CHECK_ONLINE');
        try {
            IsOnline = IsOnline ? IsOnline : navigator.onLine;
            if (!Submit) {
                if (GlobalEditor && typeof GlobalEditor.getCommand == 'function') {
                    this.command = GlobalEditor.getCommand("ckeditor_wiris_openFormulaEditor");
                }
                if (this.command) {
                    this.command[IsOnline ? 'enable' : 'disable']();
                }
            } else {
                //? from dialog
                if (IsOnline) return false;
                else {
                    TOASTER_ALERT('iWSC_OffLineError', {
                        type: 'warning'
                    });
                    return true;
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CHECK_ONLINE', err.message);
        }
    },
    "Init": function (e) {
        debug.log('Init');
        try {
            if (!IS_ONLINE) {
                TOASTER_ALERT(!IS_ONLINE ? 'iWSC_OffLineError' : 'ErrorInsertMath', {
                    type: 'warning'
                });
                e.cancel();
                return false;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('MATH_Init', err.message);
        }
    },

};
commonfn['mathrecordstore'] = function (response, opt) {
    try {
        //? only open case set db id.
        if (opt && response.id) {
            Math_Module.db_id = response.id;
        } else {
            //? reset for after Edited
            Math_Module.db_id = '';
            Math_Module.IsEdited = false;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('mathrecordstore', err.message);
    }
};



/*
<a class="xref" data-name="xref" data-role="disp-formula" ref-type="disp-formula" rid="M2" data-cke-saved-href="#M2" href="#M2" data-cite="edit" data-track="2">Equation 3</a>
double

multiple

<div class="disp-formula" data-name="disp-formula" id="M2" math-type=""><span class="TEX" contenteditable="false" data-name="TEX">\({\sqrt[1]2}_2\left\{\begin{array}{lc}2&amp;2\\4&amp;44\end{array}\right.\begin{bmatrix}8\\16\end{bmatrix}\)</span><span class="label" contenteditable="false" data-name="label" data-value="(3)" data-track-value="(2)" data-ovalue="(2)"></span></div>

`a.xref[data-cite], span.label[data-track-value]`

*/