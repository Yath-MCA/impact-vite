
/**
 * === DEV REMARKS ===
 * 23-March-2024 - YA
 * P1 Bug Fix: 3470157 (PLOS) - Space required after inserting inline equation
 * (See code for inline equation insertion logic)
 * 
 * 
 */





/*jslint devel: true */

/**
 * MathWorkFlow Module
 * Logic for managing, inserting, and updating mathematical formulas in CKEditor.
 * Supports MathML (Wiris) and LaTeX (MathLive) workflows.
 *
 * DESIGN PRINCIPLES:
 * - ES5 Compatibility (Legacy system)
 * - DRY (Don't Repeat Yourself)
 * - Separation of Concerns
 *
 *  @event clickevent dom
 * * MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
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


/**
 * @constructor MathWorkFlow
 * Sets up initial mapping and configuration tokens.
 */
function MathWorkFlow() {
    // Toolbar configuration for the Wiris editor
    this.toolbarconfig = {
        "general": "<toolbar ref='general' removeLinks='true'>" +
            "<removeTab ref='contextual' />" +
            "<tab ref='general' rows='8'><removeItem ref='setColor'/></tab>" +
            "<tab ref='general' rows='10'><removeItem ref='forceLigature'/><removeItem ref='setFontFamily'/><removeItem ref='setFontSize'/></tab>" +
            "<tab ref='symbols' rows='5'><removeItem ref='&lt;'/><removeItem ref='&gt;'/></tab>" +
            "<tab ref='arrows' rows='1'><removeItem ref='&#8612;'/><removeItem ref='&#10606;'/><removeItem ref='&#10607;'/><removeItem ref='&#8645;'/><removeItem ref='&#8693;'/><removeItem ref='&#8629;'/><removeItem ref='&#10562;'/><removeItem ref='&#10564;'/><removeItem ref='&#10529;'/><removeItem ref='&#10530;'/><removeItem ref='&#10602;'/><removeItem ref='&#10605;'/><removeItem ref='&#10606;'/><removeItem ref='&#10607;'/></tab>" +
            "<tab ref='bracketsAndAccents' rows='5'><removeItem ref='upDiagonalStrike'/><removeItem ref='horizontalStrike'/><removeItem ref='downDiagonalStrike'/><removeItem ref='upAndDownDiagonalStrike'/></tab>" +
            "<tab ref='bracketsAndAccents' extraRows='3'><removeItem ref='verticalStrike'/><removeItem ref='horizontalAndVerticalStrike'/><removeItem ref='encloseLongDivision'/></tab>" +
            "<tab ref='scriptsAndLayout' rows='3'><removeItem ref='bigOpUnderover'/><removeItem ref='bigOpUnder'/><removeItem ref='bigOpSubsuperscript'/><removeItem ref='bigOpSubscript'/></tab>" +
            "<tab ref='calculus' rows='5'><removeItem ref='&#8751;'/></tab>" +
            "<tab ref='greek' extraRows='3'><removeItem ref='doubleStruckCapitalA'/><removeItem ref='doubleStruckCapitalB'/><removeItem ref='doubleStruckCapitalD'/><removeItem ref='doubleStruckCapitalE'/><removeItem ref='doubleStruckCapitalF'/><removeItem ref='doubleStruckCapitalG'/><removeItem ref='doubleStruckCapitalH'/><removeItem ref='imaginaries'/><removeItem ref='doubleStruckCapitalJ'/><removeItem ref='doubleStruckCapitalK'/><removeItem ref='doubleStruckCapitalL'/><removeItem ref='doubleStruckCapitalM'/><removeItem ref='naturals'/><removeItem ref='doubleStruckCapitalO'/><removeItem ref='primes'/><removeItem ref='rationals'/><removeItem ref='reals'/><removeItem ref='doubleStruckCapitalS'/><removeItem ref='doubleStruckCapitalT'/><removeItem ref='doubleStruckCapitalU'/><removeItem ref='doubleStruckCapitalV'/><removeItem ref='doubleStruckCapitalW'/><removeItem ref='doubleStruckCapitalX'/><removeItem ref='doubleStruckCapitalY'/><removeItem ref='integers'/><removeItem ref='doubleStruckA'/><removeItem ref='doubleStruckB'/><removeItem ref='doubleStruckC'/><removeItem ref='doubleStruckD'/><removeItem ref='doubleStruckE'/><removeItem ref='doubleStruckF'/><removeItem ref='doubleStruckG'/><removeItem ref='doubleStruckH'/><removeItem ref='doubleStruckI'/><removeItem ref='doubleStruckJ'/><removeItem ref='doubleStruckK'/><removeItem ref='doubleStruckL'/><removeItem ref='doubleStruckM'/><removeItem ref='doubleStruckN'/><removeItem ref='doubleStruckO'/><removeItem ref='doubleStruckP'/><removeItem ref='doubleStruckQ'/><removeItem ref='doubleStruckR'/><removeItem ref='doubleStruckS'/><removeItem ref='doubleStruckT'/><removeItem ref='doubleStruckU'/><removeItem ref='doubleStruckV'/><removeItem ref='doubleStruckW'/><removeItem ref='doubleStruckX'/><removeItem ref='doubleStruckY'/><removeItem ref='doubleStruckZ'/></tab>" +
            "</toolbar>"
    };

    this.xlink = "http://www.w3.org/1999/xlink";
    this.eqOrder = {};
    this.eqFind = "div.disp-formula span.label";
    this.eqFindnumer = 'div.disp-formula span.label:not([track-lab-type="remove"]';

    this.classArr = ["disp-formula", "inline-formula"];

    // ═════════════════════════════════════════════════════════════════════════════
    // XML CHARACTER HANDLING FOR LATEX EQUATIONS
    // ═════════════════════════════════════════════════════════════════════════════
    // 
    // This section manages the transformation of XML special characters in LaTeX equations.
    // XML special characters (<, >, &, ", ') need special handling when:
    // 1. Saving LaTeX to XML documents (encode to LaTeX-safe equivalents)
    // 2. Opening/Editing LaTeX from XML (decode back to original characters)
    // 3. Converting to MathML (use safe placeholder characters)
    //
    // USAGE EXAMPLES:
    // - LaTeX Input:  "x > 5 & y < 10"
    // - Saved as:     "x \\gt 5 & y \\lt 10"  (using Wiris_replaceObj_Save)
    // - Opened as:    "x > 5 & y < 10"        (using Wiris_replaceObj_Open)
    // - MathML Safe:  "x » 5 § y « 10"        (using Wiris_Convert_MML)
    //
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * LaTeX-to-XML Encoding Map (for saving)
     * Converts XML special characters to LaTeX-safe equivalents when saving equations
     * @type {Object.<string, string>}
     */
    this.Wiris_replaceObj_Save = {
        // HTML entity to ampersand
        "&amp;": "&",
        // Greater than to LaTeX command
        ">": "\\gt",
        // Less than to LaTeX command
        "<": "\\lt",
        // HTML entity to LaTeX command
        "&gt;": "\\gt",
        // HTML entity to LaTeX command
        "&lt;": "\\lt"
    };

    /**
     * XML-to-LaTeX Decoding Map (for opening/editing)
     * Converts LaTeX-safe equivalents back to original characters when opening equations
     * @type {Object.<string, string>}
     */
    this.Wiris_replaceObj_Open = {
        // HTML entity to ampersand
        "&amp;": "&",
        // LaTeX command to greater than
        "\\gt": ">",
        // LaTeX command to less than
        "\\lt": "<",
        // HTML entity to greater than
        "&gt;": ">",
        // HTML entity to less than
        "&lt;": "<"
    };

    /**
     * MathML Safe Character Conversion Map
     * Converts XML special characters to safe placeholder characters for MathML processing
     * These placeholders prevent XML parsing conflicts during MathML generation
     * @type {Object.<string, string>}
     */
    this.Wiris_Convert_MML = {
        // Left angle bracket to left guillemet
        "<": "«",
        // Right angle bracket to right guillemet
        ">": "»",
        // Double quote to diaeresis
        '"': "¨",
        // Ampersand to section sign
        "&": "§",
        // Single quote to grave accent
        "'": "`"
    };

    /**
     * Safe XML Character Markers
     * Defines the safe placeholder characters used in MathML conversion
     * Used for validation and reverse conversion
     * @type {Object.<string, string>}
     */
    this.safeXmlCharacters = {
        // Placeholder for <
        tagOpener: "«",
        // Placeholder for >
        tagCloser: "»",
        // Placeholder for "
        doubleQuote: "¨",
        // Placeholder for &
        ampersand: "§",
        // Placeholder for '
        quote: "`",
        // Alternative placeholder for "
        realDoubleQuote: "¨"
    };

    // ═════════════════════════════════════════════════════════════════════════════
    // END: XML CHARACTER HANDLING
    // ═════════════════════════════════════════════════════════════════════════════

    this.TOASTER_MESSAGE = {
        "eq_empty": {
            text: "Equation input is empty. Please enter a valid mathematical expression."
        },
        "latex_2_wiris": {
            "title": "Math Switch Alert",
            "type": "warning",
            "text": `You have unsaved changes in the LaTeX window. Switching to the MathType window may affect these changes.<br><br>Do you want to continue?`,
            "button1": "Yes",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },
        "wiris_2_latex": {
            "title": "Math Switch Alert",
            "type": "warning",
            "text": `You have unsaved changes in the MathType window. Switching to the LaTeX window may affect these changes.<br><br>Do you want to continue?`,
            "button1": "Yes",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },
    };

    var self = this;
    this.getMathType = function () {
        try {
            var mode = GlobalEditor.config.equationWorkflow.editMode;

            if ((mode || self.isMathMLWorkFlow) && !IS_JOURNAL && /tnf/i.test(client)) {
                return "mml";
            }

            return "tex";
        } catch (e) {
            return "";
        }
    };

    this.elementsMapping = {
        inline: {
            tag: "span",
            className: "inline-formula",
            graphic: "inline-graphic",
            attr: {
                id: "",
                "math-type": "",
                "data-math": "new",
                "data-mathtype": this.getMathType
            }
        },
        display: {
            tag: "div",
            className: "disp-formula",
            graphic: "graphic",
            label: "label",
            attr: {
                id: "",
                "math-type": "",
                "data-math": "new",
                "data-mathtype": this.getMathType
            }
        },
        alternatives: {
            tag: "span",
            className: "alternatives"
        },
        TEX: {
            tag: "span",
            className: "TEX",
            attr: {
                contenteditable: "false",
                id: ""
            }
        },
        label: {
            tag: "span",
            className: "label",
            attr: {
                contenteditable: "false"
            }
        }
    };

    this.ck_config = {
        editMode: "MathML"
    };
    this.isMathMLWorkFlow = true;
    this.isEditMode = false;
    this.rightClick = false;
    this.MathError = false;

    this.isCkConfigFetched = false;

    // Dialog type constants
    this.DIALOG_WIRIS = 'wiris_dialog';
    this.DIALOG_MATHLIVE = 'mathlive_latex_dialog';
    this.DEFAULT_DIALOG = this.DIALOG_WIRIS;
    this.lastDbUpdatedPreference = null;

    this.Init();
}

// Store equation details in-memory for the current session
MathWorkFlow.InformEqs = MathWorkFlow.InformEqs || {
    items: [],
    byId: {}
};

/**
 * Shallow merge utility for ES5.
 * @private
 */
MathWorkFlow.prototype._merge = function (target, source) {
    try {
        if (!source) return target;
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
        return target;
    } catch (err) {
        ErrorLogTrace("_merge", err.message);
        return target;
    }
};

/**
 * Resolves attributes that might be functions.
 * @private
 */
MathWorkFlow.prototype._resolveAttributes = function (attrObj) {
    try {
        var resolved = {};
        if (!attrObj) return resolved;
        for (var key in attrObj) {
            if (attrObj.hasOwnProperty(key)) {
                resolved[key] = (typeof attrObj[key] === 'function') ? attrObj[key]() : attrObj[key];
            }
        }
        return resolved;
    } catch (err) {
        ErrorLogTrace("_resolveAttributes", err.message);
        return {};
    }
};

/**
 * Gets number of display equations in document.
 */
MathWorkFlow.prototype.getMathCount = function (options) {
    try {
        var opt = options || {
            addparenthesis: true,
            increment: true
        };
        var count = GlobalEditor.document.find(this.eqFind).count();
        if (opt.increment) count++;
        return opt.addparenthesis ? "(" + count + ")" : count;
    } catch (err) {
        ErrorLogTrace("getMathCount", err.message);
    }
};



/**
 * Helper for starting a new math session (legacy compatible).
 */
MathWorkFlow.prototype.showLoop = function (type, seq) {
    try {
        if (type === "") {
            this.type = "inline";
            this.seq = false;
        } else {
            this.type = type;
            this.seq = seq;
        }
        this.mathrecord({
            stage: "open",
            mathtype: "new"
        });
    } catch (err) {
        ErrorLogTrace("showLoop", err.message);
    }
};

/**
 * Resolves the math element and its content from selection or target.
 * @private
 */
MathWorkFlow.prototype._getMathContext = function (targetEl) {
    try {
        var sel = GlobalEditor.getSelection();
        var selectedEl = sel ? sel.getSelectedElement() : null;
        var el = targetEl || (selectedEl ? selectedEl.getAscendant(this._isFormulaElement) : null);
        if (!el) return null;

        var isTex = !!el.findOne(".TEX");
        var node = el.findOne(isTex ? ".TEX" : ".Wirisformula");
        var content = "";

        if (node) {
            content = isTex ? (node.getText ? node.getText() : node.$.textContent) : (node.getAttribute("data-mathml") || "");
        } else if (el.$ && el.$.getAttribute) {
            content = el.$.getAttribute("data-latex") || el.$.getAttribute("data-mathml") || "";
        }
        return {
            element: el,
            node: node,
            content: content,
            isTex: isTex,
            id: el.$.id
        };
    } catch (e) {
        return null;
    }
};

/**
 * Main method for showing/opening the math dialog.
 */
MathWorkFlow.prototype.show = function (editor, params) {
    try {
        var self = this;
        editor = editor || GlobalEditor;
        params = params || {};

        // ─────────────────────────────────────────────────────────────────────────────
        // STATE MANAGEMENT: Check if dialog is already open
        // ─────────────────────────────────────────────────────────────────────────────
        if (this._isDialogAlreadyOpen()) {
            console.warn('Math dialog is already open. Please close the existing dialog first.');
            return;
        }

        this.type = params.type || this.type || "inline";
        this.seq = params.seq || this.seq || false;

        var ctx = this._getMathContext(params.existingEl || this.currentElement);
        var existing = ctx ? ctx.element : null;
        var latex = params.latex || (ctx ? ctx.content : "");

        this.isEditMode = !!existing;
        this.currentElement = existing;

        // Get and normalize preference with optional override
        var preference = this._getAndNormalizePreference(params.reopen);
        var canOpenMathLive = params.reopen === this.DIALOG_MATHLIVE;

        // Open appropriate dialog
        if (preference === this.DIALOG_WIRIS && !canOpenMathLive) {
            if (params.fallback_wiris) return true;
            if (this.IS_Valid_TEX(latex)) {
                // ...existing code...
            }
            GlobalEditor.getCommand("ckeditor_wiris_openFormulaEditor").exec();
            // Add minimal test hooks to dialog buttons
            setTimeout(function () {
                var overlay = document.getElementById('math-dialog-overlay');
                if (overlay) {
                    var saveBtn = overlay.querySelector('button.save-math');
                    if (saveBtn) saveBtn.setAttribute('data-test', 'save-math');
                    var cancelBtn = overlay.querySelector('button.cancel-math');
                    if (cancelBtn) cancelBtn.setAttribute('data-test', 'cancel-math');
                    var switchBtn = overlay.querySelector('button.switch-mathlive');
                    if (switchBtn) switchBtn.setAttribute('data-test', 'switch-mathlive');
                    var switchWirisBtn = overlay.querySelector('button.switch-wiris');
                    if (switchWirisBtn) switchWirisBtn.setAttribute('data-test', 'switch-wiris');
                }
            }, 300);
        } else if (window.MathLiveTeXZillaPlugin && (canOpenMathLive || preference === this.DIALOG_MATHLIVE)) {
            window.MathLiveTeXZillaPlugin.openDialogforMath(editor, latex, existing);
            if (params.fallback_wiris) return false;
            // Add minimal test hooks to MathLive dialog
            setTimeout(function () {
                var overlay = document.getElementById('math-dialog-overlay');
                if (overlay) {
                    var saveBtn = overlay.querySelector('button.save-math');
                    if (saveBtn) saveBtn.setAttribute('data-test', 'save-math');
                    var cancelBtn = overlay.querySelector('button.cancel-math');
                    if (cancelBtn) cancelBtn.setAttribute('data-test', 'cancel-math');
                    var switchBtn = overlay.querySelector('button.switch-wiris');
                    if (switchBtn) switchBtn.setAttribute('data-test', 'switch-wiris');
                    var switchMathLiveBtn = overlay.querySelector('button.switch-mathlive');
                    if (switchMathLiveBtn) switchMathLiveBtn.setAttribute('data-test', 'switch-mathlive');
                }
            }, 300);
        }

        // Persist preference if requested
        if (params.setPref && params.reopen) this.setPreference(params.reopen);

        this.mathrecord({
            stage: "open",
            mathtype: existing ? "edit" : "new",
            dialog: this._getDialogType(preference)
        });
    } catch (err) {
        ErrorLogTrace("show", err.message);
    }
};
MathWorkFlow.prototype._getPreferenceKey = function () {
    try {
        return "xmleditor:math_editor_preference:" + (typeof DOC_ID !== "undefined" ? DOC_ID : "global");
    } catch (err) {
        return "xmleditor:math_editor_preference:global";
    }
};

MathWorkFlow.prototype.getPreference = function () {
    try {
        var localKey = this._getPreferenceKey();
        var storedPreference = localStorage.getItem(localKey);

        var finalPreference = storedPreference || this.DEFAULT_DIALOG;

        // If no preference found and SHARED_KEY.mathwflow is "LaTeX", default to MathLive
        if (!storedPreference && typeof SHARED_KEY !== 'undefined' && SHARED_KEY && SHARED_KEY.mathwflow === "LaTeX") {
            finalPreference = this.DIALOG_MATHLIVE;
        }
        return finalPreference;


    } catch (e) {
        return this.DEFAULT_DIALOG;
    }
};

/**
 * Checks if a math dialog is already open.
 * @private
 * @returns {boolean} True if dialog overlay exists
 */
MathWorkFlow.prototype._isDialogAlreadyOpen = function () {
    try {
        return !!document.getElementById('math-dialog-overlay');
    } catch (err) {
        ErrorLogTrace("_isDialogAlreadyOpen", err.message);
        return false;
    }
};

/**
 * Gets and normalizes preference with optional parameter override.
 * @private
 * @param {string} paramReopen - Optional preference override from params
 * @returns {string} Normalized preference (either DIALOG_WIRIS or DIALOG_MATHLIVE)
 */
MathWorkFlow.prototype._getAndNormalizePreference = function (paramReopen) {
    try {
        var preference = this.getPreference();
        preference = String(preference || '').trim();

        // Override with param if provided and valid
        if (paramReopen && (paramReopen === this.DIALOG_WIRIS || paramReopen === this.DIALOG_MATHLIVE)) {
            preference = paramReopen;
        }

        // Normalize to valid values
        if (preference !== this.DIALOG_WIRIS && preference !== this.DIALOG_MATHLIVE) {
            preference = this.DIALOG_WIRIS;
        }

        return preference;
    } catch (err) {
        ErrorLogTrace("_getAndNormalizePreference", err.message);
        return this.DIALOG_WIRIS;
    }
};

/**
 * Determines dialog type from preference string.
 * @private
 * @param {string} preference - The preference string
 * @returns {string} Either 'wiris' or 'mathlive'
 */
MathWorkFlow.prototype._getDialogType = function (preference) {
    try {
        return /wiris_dialog/.test(preference) ? "wiris" : "mathlive";
    } catch (err) {
        return "wiris";
    }
};

/**
 * Fetches user preference from the server.
 * Updates local cache on success.
 */
MathWorkFlow.prototype.fetchPreference = function (callback) {
    try {
        var self = this;
        if (typeof USER_INFO === "undefined" || typeof DOC_ID === "undefined") return;

        var payload = {
            "tbl": "UserPreference",
            "find": {
                "recordtype": "math_editor_preference",
                "username": USER_INFO.MAIL_ID,
                "docid": DOC_ID
            }
        };

        if (typeof commonfn !== "undefined" && typeof commonfn.callajax === "function") {
            commonfn.callajax(payload, "fetchMathPreference", API_GET_DOCS, function (res) {
                try {
                    var data = (typeof res === "string") ? JSON.parse(res) : res;
                    var pref = (data && data.length > 0) ? data[0].preference : (data && data.preference ? data.preference : null);

                    if (pref) {
                        self.lastDbUpdatedPreference = pref;
                        localStorage.setItem(self._getPreferenceKey(), pref);
                        if (typeof callback === "function") callback(pref);
                    }
                } catch (e) {
                    console.warn("Error parsing preference response", e);
                }
            }, true);
        }
    } catch (err) {
        ErrorLogTrace("fetchPreference", err.message);
    }
};

MathWorkFlow.prototype.setPreference = function (value) {
    try {
        localStorage.setItem(this._getPreferenceKey(), value);

        if (this.lastDbUpdatedPreference === value) {
            return;
        }

        // Sync to server
        if (typeof USER_INFO !== "undefined" && typeof DOC_ID !== "undefined" && typeof commonfn !== "undefined") {
            var self = this;

            var defaultData = typeof GET_JSON === 'function' ? GET_JSON("default") : {};

            delete defaultData['_r'];
            delete defaultData['_w'];

            var finalJson = Object.assign({}, defaultData, {
                "tbl": "UserPreference",
                "find": {
                    "username": USER_INFO.MAIL_ID,
                    "docid": DOC_ID,
                    "recordtype": "math_editor_preference"
                },
                "update": { "preference": value }

            });

            commonfn.updateMathPreference = function (response, updateValue) {
                debug.log(response);
                self.lastDbUpdatedPreference = updateValue;
            };

            commonfn.callajax(finalJson, "updateMathPreference", API_UPDATE_INSERT, value);
        }
    } catch (e) {
        ErrorLogTrace("setPreference", e.message);
    }
};


MathWorkFlow.prototype.openWirisDialog = function (texEl, action, params) {
    try {
        var self = this;

        params = params || {
            reopen: ""
        };

        // ─────────────────────────────────────────────────────────────────────────────
        // STATE MANAGEMENT: Check if dialog is already open (but allow reopening if specified)
        // ─────────────────────────────────────────────────────────────────────────────
        if (this._isDialogAlreadyOpen() && params.reopen !== this.DIALOG_WIRIS && params.reopen !== this.DIALOG_MATHLIVE) {
            console.warn('Math dialog is already open. Please close the existing dialog first.');
            return;
        }

        var ctx = this._getMathContext(texEl);
        if (!ctx) return;

        this.isEditMode = true;
        this.currentElement = ctx.element;
        this.Math_Id = ctx.element.$.id;
        this.OLD_MATH_CODE = ctx.content;

        // Normalize LaTeX delimiters if needed
        if (ctx.isTex) {
            var upd = this.convertSingleToDoubleDelimitersCompatible(this.OLD_MATH_CODE);
            if (this.OLD_MATH_CODE !== upd) {
                if (ctx.node) ctx.node.setText(upd);
                this.OLD_MATH_CODE = upd;
            }
            if (ctx.node) GlobalEditor.getSelection().selectElement(ctx.node);
        }



        var preference = this._getAndNormalizePreference(params.reopen);
        var canOpenMathLive = preference === this.DIALOG_MATHLIVE;

        // Reopen target takes precedence; otherwise use saved preference
        if (window.MathLiveTeXZillaPlugin && canOpenMathLive) {
            window.MathLiveTeXZillaPlugin.openDialogforMath(GlobalEditor, this.OLD_MATH_CODE, ctx.node || ctx.element);
            return;
        }

        var canOpen = IS_ONLINE && ctx.isTex && isValid;
        var isValid = this.IS_Valid_TEX(ctx.node || ctx.element);
        if (!isValid) {
            AlertNewDialog.fire("MathError").then((result) => {
                window.queryDialog.open(this.Math_Id, 'comment', {
                    forceOpen: true
                });
            });
            return;
        }
        if (canOpen && !canOpenMathLive) {
            setTimeout(function () {
                self.setPreference(self.DIALOG_WIRIS);
                var range = GlobalEditor.createRange();
                range.moveToPosition(ctx.node || ctx.element, CKEDITOR.POSITION_AFTER_START);
                range.select();
                GlobalEditor.execCommand("ckeditor_wiris_openFormulaEditor", true);
            }, 250);
        }
    } catch (err) {
        ErrorLogTrace("openWirisDialog", err.message);
    }
};

/**
 * Validates content for special system markers.
 */
MathWorkFlow.prototype.containsSafeXmlCharacter = function (str) {
    try {
        if (typeof str !== 'string') return false;
        var markers = this.safeXmlCharacters;
        for (var key in markers) {
            if (markers.hasOwnProperty(key) && str.indexOf(markers[key]) > -1) return true;
        }
        return false;
    } catch (err) {
        ErrorLogTrace("containsSafeXmlCharacter", err.message);
        return false;
    }
};

/**
 * Reorders labels for all display formulas.
 */
MathWorkFlow.prototype.ReOrderingEqLabel = function () {
    var self = this;
    try {
        var changed = false;
        var nodes = GlobalEditor.document.$.querySelectorAll(this.eqFindnumer);

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var parent = (node.parentElement.tagName === "INSERT") ? node.parentElement.parentElement : node.parentElement;
            var val = node.getAttribute("data-value") || node.innerHTML;
            var oldVal = node.getAttribute("data-ovalue");
            var newIdx = "(" + (i + 1) + ")";

            self.eqOrder[i] = {
                label: val,
                olabel: oldVal,
                id: parent.id,
                isNew: parent.getAttribute("data-math") === "new"
            };

            if (newIdx !== val) {
                changed = true;
                self.eqOrder[i].label = newIdx;
                self.eqOrder[i].olabel = oldVal || val;
                node.setAttribute("data-value", newIdx);

                if (!self.eqOrder[i].isNew && node.getAttribute("track-lab-type") !== "new") {
                    if (newIdx !== oldVal) node.setAttribute("data-track-value", oldVal || val);
                    else node.removeAttribute("data-track-value");
                    if (!oldVal) node.setAttribute("data-ovalue", val);
                }
                node.innerHTML = "";
                self.citationReOrder(self.eqOrder[i]);
            }
        }
        if (changed) debug.log("Renumbering complete");
        this.reset();
    } catch (err) {
        ErrorLogTrace("ReOrderingEqLabel", err.message);
    }
};

/**
 * Updates hyperlinked citations when labels change.
 */
MathWorkFlow.prototype.citationReOrder = function (obj) {
    try {
        if (!obj || !obj.id) return;
        var links = GlobalEditor.document.$.querySelectorAll('a[rid*="' + obj.id + '"]');
        var label = obj.label.slice(1, -1);
        var oLabel = obj.olabel ? obj.olabel.slice(1, -1) : label;

        for (var i = 0; i < links.length; i++) {
            var el = links[i];
            if (el.getAttribute("rid").split(" ").length === 1) {
                el.textContent = "Equation " + label;
            }
            if (!obj.isNew) el.setAttribute("data-cite", "edit");
            if (el.getAttribute("data-track") === label) el.removeAttribute("data-track");
            else el.setAttribute("data-track", oLabel);
        }
    } catch (err) {
        ErrorLogTrace("citationReOrder", err.message);
    }
};

MathWorkFlow.prototype._prepareMathImagePayload = function (el, options = {}) {
    try {

        let { latex = null, svg = null, from = null, editMode = null } = options;
        if (from == "insertElementOnSelection" && !this.isEditMode && this.type === "inline") {
            var insNode = el.querySelector('insert');
            if (insNode && this.IMS.RG_INFO) {
                if (this.IMS.RG_INFO.insert_prefix === " ") insNode.insertBefore(document.createTextNode(" "), insNode.firstChild);
                else if (this.IMS.RG_INFO.insert_suffix === " ") insNode.appendChild(document.createTextNode(" "));
            }
        }

        latex = latex ? latex : el.querySelector(".TEX") && el.querySelector(".TEX").textContent;
        svg = svg ? svg : el.querySelector(".Wirisformula") && el.querySelector(".Wirisformula").src;
        let graphic = el.querySelector(".graphic, .inline-graphic");
        if (graphic) {
            let fileid = graphic.getAttribute("xlink:href");
            this._sendMathImageToServer(latex, svg, fileid);
        }
    } catch (err) {
        ErrorLogTrace("_prepareMathImagePayload", err.message);
    }
};

/**
 * Synchronizes SVG preview with math source code.
 */
MathWorkFlow.prototype.checkandUpdate_svgView = function (e = {}, options = {}, callback) {
    try {
        if (!this.isCkConfigFetched) this.getConfig();
        var isMML = this.isMathMLWorkFlow && !IS_JOURNAL && /tnf/i.test(client);
        var latex = options.latex || "";
        var svg = options.svg || null;
        var mathId = options.id || this.Math_Id;

        var el = this.currentElement || this._findMathRootElement(mathId, IMPACT_SELECTION);
        if (el && el.$) el = el.$;
        if (!el) return;
        var output = this.getMathType();
        var isMML = output === "mml";
        var attrs = {
            "data-math": "edit",
            "data-mathtype": (latex == "" || latex == "$$$$") ? "mml" : output,
            "org-math-src": isMML ? "" : this.OLD_MATH_CODE,
            default: ["dt", "du", "drn"]
        };
        this._updateMathElementAttributes(el, attrs, isMML);
        this._updateMathContent(el, "$$" + this.getParserMathCode(latex, "save") + "$$", svg, isMML);
        // ? callback to create image in server
        if (typeof callback == "function") {
            this._prepareMathImagePayload(el, { from: "checkandUpdate_svgView", latex: latex, svg: svg });
        }
    } catch (err) {
        ErrorLogTrace("checkandUpdate_svgView", err.message);
    }
};

/**
 * Encodes/Decodes LaTeX based on context.
 */
MathWorkFlow.prototype.getParserMathCode = function (txt, stage) {
    try {
        var out = new CKEDITOR.htmlParser.text(CKEDITOR.tools.htmlEncode(txt)).value;
        var map = (stage === "open") ? this.Wiris_replaceObj_Open : this.Wiris_replaceObj_Save;
        for (var key in map) {
            if (map.hasOwnProperty(key) && out.indexOf(key) > -1) {
                out = out.replaceAllSplit(key, map[key]);
            }
        }
        return out;
    } catch (err) {
        ErrorLogTrace("getParserMathCode", err.message);
    }
};

/**
 * Core insertion logic for the document.
 * Dispatches to either Wiris or MathLive workflow based on input type.
 */
MathWorkFlow.prototype.fire_insertOrUpdate = function (content, manager, callback) {
    manager = manager || {};
    callback = callback || {
        reopen: ""
    };
    try {
        IMPACT_SELECTION.getInfo(GlobalEditor);
        this.IMS = IMPACT_SELECTION;

        var isWirisWorkflow = (content !== null && typeof content === "object");
        var isMathLiveWorkflow = (typeof content === "string");

        if (isWirisWorkflow) {
            this._handleWirisInsertion(content, manager);
        } else if (isMathLiveWorkflow) {
            this._handleMathLiveInsertion(content, callback);
        }

        // Renumber display formulas if sequence is enabled
        if (this.seq) {
            this.ReOrderingEqLabel();
        }

        // Update user preference if a valid insertion occurred
        if (isWirisWorkflow || isMathLiveWorkflow) {
            var currentPref = this.getPreference();
            var newPref = ((callback.reopen === this.DIALOG_WIRIS) || isWirisWorkflow) ? this.DIALOG_WIRIS : this.DIALOG_MATHLIVE;
            if (newPref && currentPref !== newPref) {
                this.setPreference(newPref);
            }
        }

    } catch (err) {
        console.warn("MathWorkFlow.fire_insertOrUpdate failed", err);
        ErrorLogTrace("fire_insertOrUpdate", err.message);
    }
};

/**
 * Handles insertion/update of MathML content (Wiris workflow).
 * @private
 */
MathWorkFlow.prototype._handleWirisInsertion = function (mathEl, manager) {
    try {
        var isDisplay = this.type === "display";
        var isPara = this.IMS.NODE_CLAS.indexOf("p") > -1;

        $(mathEl).attr({
            'data-math': 'new',
            'data-plugin': 'wiris'
        });

        if (isDisplay) {
            if (manager.isNewElement) {
                $(mathEl).insertAfter(this.IMS[isPara ? "NODE" : "PARENT"].$);
            }
        } else {
            this.inlineInsertion(mathEl);
        }

        this._prepareMathImagePayload(mathEl);
        this._recordEquation(mathEl, null, "wiris");
    } catch (err) {
        ErrorLogTrace("_handleWirisInsertion", err.message);
    }
};

/**
 * Handles insertion/update of LaTeX content (MathLive workflow).
 * @private
 */
MathWorkFlow.prototype._handleMathLiveInsertion = function (content, callback) {
    try {
        var self = this;
        var raw = (content || "").trim();
        var isDisplay = this.type === "display";
        var isPara = this.IMS.NODE_CLAS.indexOf("p") > -1;
        let fileid = null;
        // ? Convert LaTeX to MathML (MathLive) and generate Preview (Wiris)
        if (!window.MathLive) {
            throw new Error("MathLive is not available");
        }

        let isValid = this.IS_Valid_TEX(raw);
        if (!isValid) {
            throw new Error("Invalid LaTeX");
        }

        var mathmlBody = window.MathLive.convertLatexToMathMl(raw);
        var mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML">\n' + mathmlBody + '\n</math>';
        const doc = new DOMParser().parseFromString(mathml, "application/xml");
        if (doc.documentElement.nodeName === "parsererror") {
            throw new Error("Invalid MathML:\n" + doc.documentElement.textContent);
        }
        const mml = doc.documentElement;

        var mathEl = this.isEditMode ? (this.currentElement.$ || this.currentElement) : this.getNewItem(raw, {});
        var wirisImg = WirisPlugin.Latex.getMathMLFromLatex(this.getParserMathCode(raw, "open"), "render");


        var graphic = mathEl.querySelector(".graphic, .inline-graphic");
        if (graphic && !this.isEditMode) {
            graphic.innerHTML = "";
            $(graphic).append(typeof wirisImg == "object" ? wirisImg : mml);
            fileid = graphic.getAttribute("xlink:href");
        }

        $(mathEl).attr({
            'data-math': this.isEditMode ? 'edit' : 'new',
            'data-plugin': 'mathlive'
        });

        if (this.isEditMode && this.currentElement) {
            this.checkandUpdate_svgView({}, {
                latex: raw,
                svg: wirisImg,
                el: mathEl
            });
        } else {
            if (isDisplay) {
                $(mathEl).insertAfter(this.IMS[isPara ? "NODE" : "PARENT"].$);
            } else {
                this.inlineInsertion(mathEl);
            }
        }

        this._sendMathImageToServer(raw, wirisImg, fileid);
        this._recordEquation(mathEl, raw, "mathlive");

        // Handle reopening dialogs if requested (e.g. switching from Latex to Visual editor)
        if (callback.reopen === this.DIALOG_WIRIS || this.DIALOG_WIRIS == callback.reopen) {
            this.setPreference(this.DIALOG_WIRIS);
            var el = GlobalEditor.document.getById(mathEl.id);
            setTimeout(function () {
                if (el) {
                    self.openWirisDialog(el, "open", callback);
                }
            }, 222);
        }
    } catch (err) {
        console.warn("MathLive insertion failed", err.message);
        ErrorLogTrace("_handleMathLiveInsertion", err.message);
    }
};

MathWorkFlow.prototype._sendMathImageToServer = function (latex, wirisImg, fileid) {
    try {
        if (!wirisImg) return;
        var imgSrc = null;
        if (typeof wirisImg === "string") {
            imgSrc = wirisImg;
        } else if (typeof wirisImg === "object") {
            if (wirisImg.src) imgSrc = wirisImg.src;
            else if (typeof wirisImg.querySelector === "function") {
                var imgEl = wirisImg.querySelector("img");
                if (imgEl && imgEl.src) imgSrc = imgEl.src;
            }
        }
        if (!imgSrc) return;

        var paramsJSON = typeof GET_JSON === 'function' ? GET_JSON("default") : {};
        delete paramsJSON._w;
        delete paramsJSON._r;

        var extension = "png";
        if (imgSrc.indexOf("image/svg+xml") > -1) extension = "svg";
        else if (imgSrc.indexOf("image/png") > -1) extension = "png";

        paramsJSON.latex = latex || "";
        paramsJSON.tbl = "mathreport";
        paramsJSON.ext = extension;
        paramsJSON.keyname = "content";
        paramsJSON.subfolder = "images";
        paramsJSON.docid = window.DOC_ID;
        paramsJSON.filename = fileid || null;
        paramsJSON.content = encodeURIComponent(imgSrc);


        /**
         * Callback for math save server response
         */
        window.onMathSaveResponse = function (response) {
            if (response.r == 1) {
                console.log("Math content successfully saved to server: " + response.path);
            } else {
                console.error("Failed to save math content: " + (response.m || "Unknown error"));
            }
        };

        if (window.commonfn && window.commonfn.callajax) {
            console.log("Saving math image to server . . . ");
            window.commonfn.callajax(paramsJSON, "onMathSaveResponse", window.API_SAVE_SVG_PNG || (window.API_PATH + "fromsvgtopng"));
        }

    } catch (err) {
        ErrorLogTrace("_sendMathImageToServer", err.message);
    }
};

MathWorkFlow.prototype._recordEquation = function (mathEl, latex, source) {
    try {
        if (!mathEl) return;
        var rawEl = mathEl.$ || mathEl;
        var id = rawEl.getAttribute("id") || "";
        var graphic = rawEl.querySelector(".graphic, .inline-graphic");
        var href = graphic ? graphic.getAttribute("xlink:href") : "";
        var client = (typeof SHARED_KEY !== 'undefined' ? SHARED_KEY.client : "") || "";
        var isInline = /inline-formula/.test(rawEl.className || "");
        var hasLabel = !!rawEl.querySelector(".label");
        var type = isInline ? "inline" : (hasLabel ? "display-number" : "display-unnumber");

        var entry = {
            id: id || null,
            href: href || null,
            client: client || null,
            type: type,
            latex: latex || null,
            source: source || null,
            timestamp: new Date().toISOString()
        };

        var store = MathWorkFlow.InformEqs || (MathWorkFlow.InformEqs = {
            items: [],
            byId: {}
        });
        if (id && store.byId[id]) {
            store.byId[id] = this._merge(store.byId[id], entry);
        } else {
            store.items.push(entry);
            if (id) store.byId[id] = entry;
        }
    } catch (err) {
        ErrorLogTrace("_recordEquation", err.message);
    }
};



MathWorkFlow.prototype.inlineInsertion = function (mathEl) {
    try {
        var insNode = mathEl.querySelector('insert');
        if (insNode && this.IMS.RG_INFO) {
            if (this.IMS.RG_INFO.insert_prefix === " ") insNode.insertBefore(document.createTextNode(" "), insNode.firstChild);
            else if (this.IMS.RG_INFO.insert_suffix === " ") insNode.appendChild(document.createTextNode(" "));
        }

        var sel = GlobalEditor.getSelection();
        var bms = sel.createBookmarks(true);
        var start = GlobalEditor.document.getById(bms[0].startNode);
        if (start) {
            start.$.after(mathEl);
            start.remove();
            var end = GlobalEditor.document.getById(bms[0].endNode);
            if (end) end.remove();
        } else {
            GlobalEditor.insertHtml(mathEl.outerHTML);
        }
    } catch (err) {
        ErrorLogTrace("inlineInsertion", err.message);
    }
};

MathWorkFlow.prototype.findClosestElement = function (el, opt) {
    try {
        opt = opt || {};
        if (el.nodeType !== 1) return "";
        var c = el.closest("[data-mathnew], [data-math], [math-type], .inline-formula, .disp-formula");
        if (opt.assignId && c) this.Math_Id = c.id;
        return c;
    } catch (err) {
        ErrorLogTrace("findClosestElement", err.message);
        return "";
    }
};

MathWorkFlow.prototype.hasSpecifiedAttributesOrClasses = function (el) {
    try {
        var raw = el.$ || el;
        return raw.hasAttribute("data-mathnew") || raw.hasAttribute("data-math") || raw.hasAttribute("math-type") || this._isFormulaElement(el);
    } catch (err) {
        return false;
    }
};

MathWorkFlow.prototype.UpdateTrackInfo = function (el, attrs) {
    try {
        if (!el) return;
        var raw = el.$ || el;
        if (this.containsSafeXmlCharacter(attrs["org-math-src"]) || this.hasSpecifiedAttributesOrClasses(el)) {
            delete attrs["org-math-src"];
        }
        commonMethods.setAttr(raw, attrs);
    } catch (err) {
        ErrorLogTrace("UpdateTrackInfo", err.message);
    }
};

MathWorkFlow.prototype._findMathRootElement = function (id, IMS) {
    try {
        var el = GlobalEditor.document.getById(id);
        if (id && el) {
            if (this._isFormulaElement(el)) return el.$;
            var asc = el.getAscendant(function (e) {
                var r = e.$ || e;
                return r && typeof r.getAttribute === "function" && /formula/.test(r.getAttribute("class") || r.getAttribute("data-name"));
            });
            if (asc && asc.$) return asc.$;
        }
        if (/graphic|Wirisformula/gi.test(IMS.NODE_CLAS)) return IMS.PARENT.$;
        return null;
    } catch (err) {
        ErrorLogTrace("_findMathRootElement", err.message);
        return null;
    }
};

/**
 * Placeholders for legacy compatibility
 */
MathWorkFlow.prototype.Init = function (e) {
    try {
        console.log("==MATH-INIT==");
        var self = this;
        this.IMS = IMPACT_SELECTION;
        self.getConfig();
        var setAlertCOnfig = setInterval(function () {
            if (self.TOASTER_MESSAGE && Object.keys(self.TOASTER_MESSAGE).length > 0) {
                Object.assign(ALERT_MESSAGE, self.TOASTER_MESSAGE);
                clearInterval(setAlertCOnfig);
            }
        }, 500);

        if (typeof IS_ONLINE !== "undefined" && !IS_ONLINE) {
            TOASTER_ALERT(IS_ONLINE ? "ErrorInsertMath" : "iWSC_OffLineError", {
                type: "warning"
            });
            if (e && e.cancel) e.cancel();
            return false;
        }
    } catch (err) {
        ErrorLogTrace("MATH_Init", err.message);
    }
};

MathWorkFlow.prototype.Can_trigger_MathView_Bool = function (e, t) {
    try {
        debug.log("Can_trigger_MathView_Bool invoked");
    } catch (err) { }
};

MathWorkFlow.prototype._isFormulaElement = function (el) {
    try {
        var raw = el.$ || el;
        if (!raw || !raw.getAttribute) return false;
        return /formula/.test(raw.getAttribute("class") || raw.getAttribute("data-name"));
    } catch (err) {
        return false;
    }
};

MathWorkFlow.prototype._updateMathElementAttributes = function (root, attrs, isMML) {
    try {
        if (!root || (isMML && root.hasAttribute("data-math"))) return;
        this.UpdateTrackInfo(root, attrs);
    } catch (err) {
        ErrorLogTrace("_updateMathElementAttributes", err.message);
    }
};

MathWorkFlow.prototype._updateMathContent = function (root, latex, svg, isMML) {
    try {
        var view, img, texEl = root.querySelector(".TEX");
        if (isMML) {
            img = root.querySelector("img");
            view = root;
        } else {
            view = root.querySelector(".graphic, .inline-graphic");
            img = view ? view.querySelector("img") : null;
        }
        if (texEl) texEl.innerHTML = latex;
        if (latex == "") {
            root.setAttribute("data-mathtype", "mml");
        }

        if (view && svg) {
            if (!img) view.appendChild(svg);
            else {
                $(svg).insertAfter(img);
                $(img).remove();
            }
        }
    } catch (err) {
        ErrorLogTrace("_updateMathContent", err.message);
    }
};

MathWorkFlow.prototype.convertSingleToDoubleDelimitersCompatible = function (t) {
    try {
        var ss = CKEDITOR.dom.selection.FILLING_CHAR_SEQUENCE;
        var c = t.split(ss).join("");
        if (c.indexOf('$') === 0 && c.lastIndexOf('$') === (c.length - 1) && c.indexOf('$$') !== 0) return '$$' + c.slice(1, -1) + '$$';
        return c;
    } catch (err) {
        return t;
    }
};



MathWorkFlow.prototype.mathrecord = function (opt, status, input) {
    try {
        var isOpen = /open/.test(opt.stage);
        var jData = {
            tbl: "mathreport",
            mathid: this.Math_Id
        };
        var time = new Date().toISOString();
        if (isOpen) {
            this._merge(jData, {
                opentime: time,
                recordtype: opt.stage,
                mathtype: opt.mathtype,
                wirisresponseopen: status || {},
                org_input: input || ""
            });
            this._merge(jData, typeof GET_JSON === 'function' ? GET_JSON("default") : {});
        } else if (this.db_id) {
            this._merge(jData, {
                find: {
                    _id: this.db_id
                },
                update: {
                    recordtype: opt.stage,
                    closetime: time,
                    wirisresponseclose: status || {}
                }
            });
        }
        commonfn.callajax(jData, "mathrecordstore", isOpen ? API_UPDATE_INSERT : API_FIND_UPDATE_INSERT, isOpen);
    } catch (e) { }
};

MathWorkFlow.prototype.IS_Valid_TEX = function (el) {
    this.MathError = false;
    try {
        var latex = typeof el === "string" ? el : (el.$.innerText || "");
        var p = this.getParserMathCode(latex, "open");
        var Id = el.$ && el.$.id || "";

        WirisPlugin.Latex.getMathMLFromLatex(p, Id);

        if (this.MathError) return false;

        if (el.$) {
            el.$.textContent = p.replace(/[\u200B-\u200D\uFEFF]/g, "");
        }
        return true;
    } catch (e) {
        return false;
    }
};

MathWorkFlow.prototype.getConfig = function () {
    try {
        var self = this;
        var itv = setInterval(function () {
            try {
                if (typeof GlobalEditor !== 'undefined' && GlobalEditor && GlobalEditor.config && GlobalEditor.config.equationWorkflow) {
                    var c = GlobalEditor.config.equationWorkflow;
                    self.isMathMLWorkFlow = c.editMode === "MathML";
                    self.isLatexWorkflow = !self.isMathMLWorkFlow;
                    self.ck_config = self._merge({
                        IsMathMLWorkFlow: self.isMathMLWorkFlow
                    }, c);
                    self.isCkConfigFetched = true;
                    // Initialize preference from server on startup
                    self.fetchPreference();

                    clearInterval(itv);
                }
            } catch (innerErr) {
                clearInterval(itv);
                ErrorLogTrace("getConfig:Interval", innerErr.message);
            }
        }, 500);
    } catch (err) {
        ErrorLogTrace("getConfig", err.message);
    }
};

MathWorkFlow.prototype.getElementsfromConfig = function (cfg, client) {
    try {
        var ids = this.generateId();
        var isPlos = client === "plos";
        var attrs = this._resolveAttributes(cfg.attr);
        if (/formula/gi.test(cfg.className)) attrs.id = ids.id;

        var el = commonMethods.setAttr(cfg.tag, this._merge({
            class: cfg.className,
            "data-name": cfg.className
        }, attrs));
        if (cfg.graphic) {
            var m = {
                class: isPlos ? "graphic" : cfg.graphic,
                "data-name": isPlos ? "graphic" : cfg.graphic,
                "xlink:href": ids.pdfId,
                "xmlns:xlink": this.xlink,
                "self-close": "true"
            };
            if (isPlos) this._merge(m, {
                id: ids.id + "g",
                position: "anchor",
                mimetype: "image",
                "xlink:type": "simple"
            });
            el.appendChild(commonMethods.setAttr("span", m));
        }
        return el;
    } catch (err) {
        ErrorLogTrace("getElementsfromConfig", err.message);
        return document.createElement("span");
    }
};

MathWorkFlow.prototype.getNewItem = function (latex, data) {
    try {
        this.trackManager = window._trackManager || this.trackManager || new trackManager(GlobalEditor);
        var client = (typeof SHARED_KEY !== 'undefined' ? SHARED_KEY.client : "") || "";
        var clientL = client.toLowerCase();

        var math = this.getElementsfromConfig(this.elementsMapping[this.type || "inline"], clientL);
        var tex = this.getElementsfromConfig(this.elementsMapping.TEX, clientL);
        var graph = math.querySelector(".graphic, .inline-graphic");

        tex.appendChild(document.createTextNode(latex.nodeValue ? latex.nodeValue : latex));

        if (typeof s4 === 'function') tex.setAttribute("id", s4());

        if (clientL === "plos") {
            var alt = this.getElementsfromConfig(this.elementsMapping.alternatives, clientL);
            alt.appendChild(tex);
            alt.appendChild(graph);
            math.appendChild(alt);
        } else {
            math.appendChild(tex);
        }

        if (data && data.svg && graph) {
            var old = graph.querySelector("img");
            if (old) graph.removeChild(old);
            graph.appendChild(data.svg);
        }

        if (this.seq) {
            var lbl = this.getElementsfromConfig(this.elementsMapping.label, clientL);
            // if (clientL === "plos") math.appendChild(lbl);
            // else if (graph) graph.appendChild(lbl);
            math.appendChild(lbl);
        }

        math.appendChild(this.trackManager.getInsNode(math, {
            childOnly: true
        }));
        return math;
    } catch (err) {
        ErrorLogTrace("getNewItem", err.message);
        return document.createElement("span");
    }
};

MathWorkFlow.prototype._pad = function (num, length) {
    var str = String(num);
    while (str.length < length) {
        str = "0" + str;
    }
    return str;
};

MathWorkFlow.prototype._isValidOupId = function (id) {
    return /^(IN|UN|N)\d{4}$/i.test(id);
};

MathWorkFlow.prototype._extractOupNumber = function (id) {
    var match = id && id.match(/^(IN|UN|N)(\d{4})$/i);
    return match ? parseInt(match[2], 10) : null;
};

MathWorkFlow.prototype._isValidPlosId = function (id) {
    return /^[a-z0-9\.\-]+\.e\d{3}$/i.test(id);
};

MathWorkFlow.prototype._extractPlosNumber = function (id) {
    var match = id && id.match(/\.e(\d{3})$/i);
    return match ? parseInt(match[1], 10) : null;
};

MathWorkFlow.prototype._buildPlosBase = function (proj, fid) {
    if (proj && proj.length > 0) return proj;
    if (fid && fid.length > 0) return fid;
    return "unknown.0";
};

MathWorkFlow.prototype.generateId = function () {
    try {
        this.listOfEquations = [];

        var shared = (typeof SHARED_KEY !== "undefined" && SHARED_KEY) ? SHARED_KEY : {};
        var clientUpper = (shared.client || "").toUpperCase();
        var proj = shared.projectname || "";
        var fid = shared.fileid || "";
        var rootDoc = (typeof GlobalEditor !== "undefined" && GlobalEditor && GlobalEditor.document && GlobalEditor.document.$) ?
            GlobalEditor.document.$ :
            null;
        var items = rootDoc ? rootDoc.querySelectorAll(".inline-formula, .disp-formula") : [];

        var max = 0;
        var oupMax = {
            inline: 0,
            displayUn: 0,
            displayNum: 0
        };
        var plosMax = 0;
        var used = {};
        var i, c;

        for (i = 0; i < items.length; i++) {
            var id = items[i].getAttribute("id");
            var g = items[i].querySelector('[xlink\\:href]');
            var href = g ? g.getAttribute("xlink:href") : null;
            var s = (clientUpper === "LWW" ? href : null) || id;
            var lab = items[i].querySelector(".label");
            var isLine = items[i].className.indexOf("inline-formula") > -1;
            var eqType = isLine ? "inline" : (lab ? "display-number" : "display-unnumber");
            var n = null;

            if (id) used[id] = true;
            if (href) used[href] = true;

            // Generic number scan used by non-client-specific flows.
            var maxCandidates = [s, href, id];
            for (c = 0; c < maxCandidates.length; c++) {
                var candidate = maxCandidates[c];
                var m = candidate && candidate.match(/(\d{3,4})(?=(\.(png|pdf))?$)/i);
                if (m) {
                    n = parseInt(m[1], 10);
                    if (n > max) max = n;
                    break;
                }
            }

            // OUP: use actual ID values (INxxxx / UNxxxx / Nxxxx), not DOM counts.
            if (id && this._isValidOupId(id)) {
                var val = this._extractOupNumber(id);
                if (val !== null) {
                    if (/^IN/i.test(id)) {
                        if (val > oupMax.inline) oupMax.inline = val;
                    } else if (/^UN/i.test(id)) {
                        if (val > oupMax.displayUn) oupMax.displayUn = val;
                    } else {
                        if (val > oupMax.displayNum) oupMax.displayNum = val;
                    }
                }
            }

            // PLOS: scan from id/href for ".eNNN" sequence.
            for (c = 0; c < maxCandidates.length; c++) {
                var pmTarget = maxCandidates[c];
                var pmId = pmTarget ? pmTarget.replace(/\.(png|pdf)$/i, "") : "";
                if (pmId && this._isValidPlosId(pmId)) {
                    var pnum = this._extractPlosNumber(pmId);
                    if (pnum !== null && pnum > plosMax) plosMax = pnum;
                    break;
                }
            }

            this.listOfEquations.push({
                id: id || null,
                href: s,
                seq: n,
                number: lab ? lab.textContent : null,
                type: eqType
            });
        }

        var nxt = max + 1;
        var p4 = this._pad(nxt, 4);
        var p3 = this._pad(nxt, 3);

        switch (clientUpper) {
            case "OUP":
                var oupPrefix = this.type === "inline" ? "IN" : (this.seq ? "N" : "UN");
                var oupNext = this.type === "inline" ?
                    (oupMax.inline + 1) :
                    (this.seq ? (oupMax.displayNum + 1) : (oupMax.displayUn + 1));
                var oupId = oupPrefix + this._pad(oupNext, 4);
                while (used[oupId]) {
                    oupNext += 1;
                    oupId = oupPrefix + this._pad(oupNext, 4);
                }
                return {
                    id: oupId,
                    pdfId: (proj || fid || "OUP") + "_M" + this._pad(oupNext, 4) + ".pdf"
                };
            case "PLOS":
                var base = this._buildPlosBase(proj, fid);
                var pNum = plosMax + 1;
                var pId = base + ".e" + this._pad(pNum, 3);
                while (used[pId]) {
                    pNum += 1;
                    pId = base + ".e" + this._pad(pNum, 3);
                }
                return {
                    id: pId,
                    pdfId: pId + ".pdf"
                };
            case "LWW":
                return {
                    id: (typeof s4 === "function") ? s4() : "LWW" + p4,
                    pdfId: (proj || fid || "LWW") + "_M" + p4 + ".pdf"
                };
            default:
                var d = (typeof s4 === "function") ? s4() : "M" + p4;
                return {
                    id: d,
                    pdfId: "default_" + d + ".pdf"
                };
        }
    } catch (err) {
        if (typeof ErrorLogTrace === "function") ErrorLogTrace("generateId", err.message);
        var sharedCatch = (typeof SHARED_KEY !== "undefined" && SHARED_KEY) ? SHARED_KEY : {};
        var clientCatch = (sharedCatch.client || "").toUpperCase();
        var projCatch = sharedCatch.projectname || "";
        var fidCatch = sharedCatch.fileid || "";
        if (clientCatch === "OUP") {
            var pref = this.type === "inline" ? "IN" : (this.seq ? "N" : "UN");
            return {
                id: pref + "0001",
                pdfId: (projCatch || fidCatch || "OUP") + "_M0001.pdf"
            };
        }
        if (clientCatch === "PLOS") {
            var baseCatch = this._buildPlosBase(projCatch, fidCatch);
            return {
                id: baseCatch + ".e001",
                pdfId: baseCatch + ".e001.pdf"
            };
        }
        if (clientCatch === "LWW") {
            return {
                id: (typeof s4 === "function") ? s4() : "LWW0001",
                pdfId: (projCatch || fidCatch || "LWW") + "_M0001.pdf"
            };
        }
        return {
            id: "M0001",
            pdfId: "default_M0001.pdf"
        };
    }
};

MathWorkFlow.prototype.renderWirisFormula = function (ed) {
    try {
        var self = this,
            editor = ed || GlobalEditor;
        if (!WirisPlugin || !WirisPlugin.Latex) return;
        var nodes = editor.document.find(".TEX").toArray();
        for (var i = 0; i < nodes.length; i++) {
            var eqn = nodes[i];
            // CKEditor DOM → native DOM
            var el = eqn.$ || eqn;
            var eqEl = el.closest('[math-type]');

            var isW = (eqEl.getAttribute('data-math') === 'edit' || eqEl.getAttribute('data-math') === 'new') && eqEl.getAttribute('data-mathnew') !== 'new';
            var parts = eqEl.querySelectorAll(".TEX, .graphic, .inline-graphic");
            for (var j = 0; j < parts.length; j++) {
                var el = parts[j],
                    name = el.getAttribute("data-name") || "";
                if (/TEX/gi.test(name)) {
                    if (isW) el.classList.add('wirisview');
                    else el.classList.remove('wirisview');
                } else if (/graphic/gi.test(name)) {
                    var img = el.querySelector("img");
                    if (img) {
                        if (img.src.indexOf(".pdf") > -1) img.src = img.src.replace(".pdf", ".png");
                    } else if (isW) el.appendChild(WirisPlugin.Latex.getMathMLFromLatex(self.getParserMathCode(eqn.getText(), "open"), "render"));
                    else {
                        var h = el.getAttribute('xlink:href');
                        if (h) {
                            var ni = document.createElement("img");
                            ni.src = BUCKET_URL + DOC_ID + "/images/" + h.replace(".pdf", ".png");
                            el.appendChild(ni);
                        }
                    }
                }
            }
            if (!isW) {
                eqEl.setAttribute("data-mathnew", "new");
                debug.log("Rendered Wiris formula with id: " + eqEl.id);
            }
        }
    } catch (a) {
        console.warn(a.message);
        ErrorLogTrace("renderWirisFormula", a.message);
    }
};

/**
 * Network status checker
 */
MathWorkFlow.prototype.CHECK_ONLINE = function (IsOnline, Submit) {
    debug.log("CHECK_ONLINE");
    try {
        IsOnline = IsOnline || navigator.onLine;
        if (Submit) {
            if (IsOnline) return false;
            TOASTER_ALERT("iWSC_OffLineError", {
                type: "warning"
            });
            return true;
        }
        if (GlobalEditor && "function" == typeof GlobalEditor.getCommand) {
            this.command = GlobalEditor.getCommand("ckeditor_wiris_openFormulaEditor");
        }
        if (this.command) {
            this.command[IsOnline ? "enable" : "disable"]();
        }
    } catch (a) {
        console.warn(a.message);
        ErrorLogTrace("CHECK_ONLINE", a.message);
    }
};

MathWorkFlow.prototype.updateCacheEq = function (latex, fromDialog) {
    console.log("updateCacheEq");
    try {
        var self = this;
        this._cache = this._cache || {};

        this.isEditMode = this.isEditMode || false;
        var currentEl = this.currentElement && (this.currentElement.$ || this.currentElement);
        var dataId = this.isEditMode && currentEl && currentEl.getAttribute ? currentEl.getAttribute("id") : "";
        this._cache = {
            raw_latex: latex,
            id: dataId,
            mode: this.isEditMode ? "edit" : "new",
            from: fromDialog
        };
        setTimeout(function () {
            self._cache = {};
        }, 999);

    } catch (a) {
        console.warn(a.message);
        ErrorLogTrace("updateCacheEq", a.message);
    }
};
MathWorkFlow.prototype.checkCacheEqutionToUpdate = function (contentManager, editionProp, getMathfromLatex, safeXmlDecode) {

    console.log("checkCacheEqutionToUpdate");

    try {
        const {
            raw_latex,
            id,
            mode,
            from
        } = this._cache || {};
        if (from == this.DIALOG_MATHLIVE && raw_latex) {
            var currentRootId = "";
            var currentEl = this.currentElement && (this.currentElement.$ || this.currentElement);
            if (currentEl && currentEl.getAttribute) {
                currentRootId = currentEl.getAttribute("id") || "";
            }
            if (!currentRootId && editionProp && editionProp.temporalImage && typeof editionProp.temporalImage.closest === "function") {
                var root = editionProp.temporalImage.closest("[data-math],[data-mathnew],.disp-formula,.inline-formula");
                currentRootId = root && root.getAttribute ? (root.getAttribute("id") || "") : "";
            }
            if ((id || currentRootId) && id !== currentRootId) {
                this._cache = {};
                return;
            }
            setTimeout(function () {
                if (contentManager.editorListener) {
                    contentManager.editorListener.isContentChanged = true;
                    contentManager.editorListener.setIsContentChanged(!0);
                }
            }, 999);
            contentManager.mathML = getMathfromLatex(safeXmlDecode(raw_latex));
            editionProp.isNewElement = mode === "new";
        } else if (from == this.DIALOG_WIRIS) {

        }
    } catch (a) {
        console.warn(a.message);
        ErrorLogTrace("checkCacheEqutionToUpdate", a.message);
    }
};

/**
 * Resets state.
 */
MathWorkFlow.prototype.reset = function (options) {
    try {
        options = options || {};
        var resetCache = options.resetCache || false;

        this.type = "";
        this.seq = false;

        this.isEditMode = false;
        this.rightClick = false;
        this.currentElement = null;


        this.Math_Id = "";
        this.OLD_MATH_CODE = "";
        this.IsEdited = false;

        if (this.isCkConfigFetched == false) this.getConfig();

        if (resetCache) {
            this._cache = {};
        }
    } catch (err) {
        ErrorLogTrace("reset", err.message);
    }
};


export default MathWorkFlow;