/**
 * Compare two CKEditor elements by normalizing to DOM and comparing outerHTML.
 * @param {Object} el1 - CKEditor element or DOM element
 * @param {Object} el2 - CKEditor element or DOM element
 * @returns {boolean} true if normalized outerHTML is equal, false otherwise
 */
commonMethods.compareElementsByOuterHTML = function(el1, el2) {
    try {
        // Normalize CKEditor elements to DOM nodes
        function toDomNode(el) {
            // CKEditor element
            if (el && el.$) return el.$;
            // Already DOM
            return el;
        }
        const node1 = toDomNode(el1);
        const node2 = toDomNode(el2);

        if (!node1 || !node2) return false;

        // Compare outerHTML
        return node1.outerHTML === node2.outerHTML;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('compareElementsByOuterHTML', err.message);
        return false;
    }
};

console.log('commonfn.js');
/*jshint sub:true*/

window.GET_DOC_ID = function() {
    // If DOC_ID is already defined globally, use it
    if (typeof DOC_ID !== 'undefined' && DOC_ID) {
        return DOC_ID;
    }

    // Otherwise, try to get it from URL params
    const params = new URLSearchParams(window.location.search);
    const docIdFromUrl = params.get('docid') || params.get('DOC_ID');

    return docIdFromUrl || '';
};

function getdbtime(plong, pformat) {
    return moment(plong.$numberLong).format(pformat);
}

function getdbid(id) {
    return ((typeof(id) == 'object') ? id : id);
}

function EVT_RETURN(e) {
    try {
        typeof e.stopPropagation === 'function' && e.stopPropagation();
        typeof e.preventDefault === 'function' && e.preventDefault(true);
        typeof e.cancel === 'function' && e.cancel();
        return false;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('E_RETURN', err.message);
    } finally {
        return false;
    }
};

function GetParentNde(element, ignore) {
    try {
        var formatTags = ['INSERT', 'DEL', 'STRONG', 'EM', 'U', 'SUB', 'SUP', 'S', 'SC'];
        if (ignore != undefined) {
            formatTags = formatTags.filter(val => !ignore.includes(val));
        }
        if (element == null) {
            return null;
        } else if (element.nodeType != null && element.nodeType != undefined) {
            var iTag = $(element).prop('tagName');
            while (formatTags.includes(iTag) || ($(element).attr('data-high') == 'note') || ($(element).attr('data-class') == 'ice-reformat')) {
                element = $(element).parent();
                iTag = $(element).prop('tagName');
            }
            element = (element[0] != undefined) ? (element[0]) : (element);
            return element;
        } else if (element.$.nodeType != null && element.$.nodeType != undefined) {
            var jTag = element.getName().toLocaleUpperCase();
            while (formatTags.includes(jTag) || (element.$.getAttribute('data-high') == 'note') || element.$.getAttribute('data-class') == 'ice-reformat') {
                element = element.getParent();
                jTag = element.getName().toLocaleUpperCase();
            }
            return element;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('GetParentNde', err.message);
    }
}



Array.prototype.unique = function() {
    try {
        return Array.from(new Set(this));
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Array.prototype.unique', err.message);
    }
};
Array.prototype.lastValue = function(Method) {
    try {
        var last = (this.length != 0) ? (this[this.length - 1]) : (0);
        if (Method != undefined) {
            var splitDot = null,
                regex = /\_(\d+)/g;
            if (Method == 'DIALOGIMG') {
                last = last.replace(regex, '');
            } else if (Method == 'FIGURE') {
                splitDot = last.split('.');
                if (splitDot.length > 2) {
                    last = splitDot.slice(0, -1).join('.');
                }
            } else if (Method == "trackDialog") {
                splitDot = last.split('.');
                last = splitDot.slice(0, -1).join('');
                last = last.split('_')[0];
            } else if (Method == ADD) {
                last = (last != undefined) ? ((parseInt(last) + 1)) : (s4());
            }
        }
        return last;
    } catch (errr) {
        ErrorLogTrace('lastValue', errr.message);
        console.warn(errr.message);
    }
};
String.prototype.lastChar = function() {
    try {
        return this.charAt(this.length - 1);
    } catch (err) {
        ErrorLogTrace('lastChar', err.message);
        console.warn(err.message);
    }
};
String.prototype.firstChar = function() {
    try {
        return this.charAt(0);
    } catch (err) {
        ErrorLogTrace('firstChar', err.message);
        console.warn(err.message);
    }
};


/**
 * 🧩 Dynamically update CKEditor command states.
 * 
 * Example:
 * commonfn.updateEditorCommandState({
 *   saveimpact: CKEDITOR.TRISTATE_DISABLED,
 *   add_comment: CKEDITOR.TRISTATE_OFF
 * });
 */
commonfn.updateEditorCommandState = function(config = {}) {
    let tries = 0;
    // up to 10 seconds total
    const maxTries = 10;

    const cmdInterval = setInterval(() => {
        if (typeof GlobalEditor === "undefined" || !GlobalEditor.getCommand) {
            if (++tries >= maxTries) clearInterval(cmdInterval);
            return;
        }

        Object.entries(config).forEach(([cmdName, state]) => {
            const cmd = GlobalEditor.getCommand(cmdName);

            if (!cmd) {
                console.warn(`⚠️ Command "${cmdName}" not found in editor.`);
                return;
            }

            try {
                if (state === "enable") {
                    cmd.enable();
                    console.log(`✅ Command "${cmdName}" enabled`);
                } else if (state === "disable") {
                    cmd.disable();
                    console.log(`🚫 Command "${cmdName}" disabled`);
                } else {
                    console.warn(`⚠️ Unknown state "${state}" for command "${cmdName}"`);
                }
            } catch (err) {
                console.error(`❗ Failed to update command "${cmdName}"`, err);
            }
        });

        // run only once after success
        clearInterval(cmdInterval);
    }, 1000);
};



commonfn['callmultipartajax'] = function(formData, postfun, url, opt = '') {
    $.ajax({
        enctype: 'multipart/form-data',
        url: url,
        dataType: 'json',
        data: formData,
        contentType: false,
        processData: false,
        mimeType: "multipart/form-data",
        cache: false,
        type: 'POST',
        method: 'POST',
        beforeSend: function(xhr) {
            xhr.setRequestHeader("appkey", localStorage.getItem('xmleditor:appkey'));
            xhr.setRequestHeader("apikey", localStorage.getItem('xmleditor:apikey'));
            console.log('before send callmultipartajax');
        },
        success: function(response) {
            commonfn[postfun](response, opt);
        }
    }).fail(function() {
        console.log("failed");
    }).done(function(response) {
        console.log("Process completed");
    });
};

const iOpenWindow = function(iURL, Options) {
    try {
        // Clean up accidental spaces / encodings
        // remove spaces
        iURL = iURL.trim().replace(/\s+/g, "");
        iURL = decodeURIComponent(iURL); //

        //? Define link or download any file here
        if (!Options) {
            Options = {
                type: "webPage",
                param1: 'impactOpenUrl',
                param2: 'popup',
                successAlert: 'webPageSucess',
                failAlert: 'webPageError'
            };
        }
        if (iURL.indexOf("://") == -1 && !iURL.includes('@')) {
            iURL = "http://" + iURL;
        }
        var downloadPopUp = Options ? window.open(iURL, Options) : window.open(iURL);
        var id = (new Date()).getTime();
        if (downloadPopUp == null || typeof(downloadPopUp) == 'undefined') {
            TOASTER_ALERT('PopupBlocker', {
                type: 'info'
            });
            if (USER_INFO.IS_ADMIN) {
                // var myWindow = window.open(window.location.href + '?printerFriendly=true',id,"toolbar=1,scrollbars=1,location=0,statusbar=0,menubar=1,resizable=1,width=800,height=600,left = 240,top = 212");
                // if(myWindow)
                //     myWindow.location.href=iURL;
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('iOpenWindow', err.message);
    }
};



// ? TOC and QUery Div Show / hide
function handler(event) {
    try {
        //code goes here
        var target = $(event.target),
            tarParId = target[0].parentElement.id;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('handler', err.message);
    }
}

function scrollIfNeeded(element, container) {
    if (element.offsetTop < container.scrollTop) {
        container.scrollTop = element.offsetTop;
    } else {
        const offsetBottom = element.offsetTop + element.offsetHeight;
        const scrollBottom = container.scrollTop + container.offsetHeight;
        if (offsetBottom > scrollBottom) {
            container.scrollTop = offsetBottom - container.offsetHeight;
        }
    }
}
commonMethods.safeGetAttr = function(el, attrs) {
    if (!el || typeof el.getAttribute !== "function") return null;

    // Allow comma-separated attributes OR an array
    const attrList = Array.isArray(attrs) ? attrs : attrs.split(",");

    for (let attr of attrList) {
        const val = el.getAttribute(attr.trim());
        if (val !== null && val !== undefined && val !== "") {
            return val;
        }
    }
    return null;
};

commonMethods.removeTranslatorWrappers = function(root) {
    try {
        if (!root || typeof root.querySelectorAll !== "function") return false;

        const selector = [
            "#immersive-translate-popup",
            "#immersive-translate-toast-root",
            ".immersive-translate-toast-shadow-root",
            ".immersive-translate-target-wrapper",
            ".immersive-translate-target-translation-block-wrapper",
            ".immersive-translate-target-translation-block-wrapper-theme-none",
            ".immersive-translate-target-inner",
            ".immersive-translate-container",
            ".notranslate",
            ".no-translate"
        ].join(",");

        let removed = false;

        root.querySelectorAll(selector).forEach((el) => {
            commonMethods.removeEl(el);
            removed = true;
        });
        /* 
        root.querySelectorAll('[translate="no"]').forEach((el) => {
            if (el.tagName && el.tagName.toLowerCase() !== "html") {
                commonMethods.removeEl(el);
                removed = true;
            }
        });
        */
        return removed;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('removeTranslatorWrappers', err.message);
        return false;
    }
};

commonMethods.cleanTranslatorExtensions = function(editorInstance) {
    try {
        if (!editorInstance && typeof GlobalEditor !== "undefined") {
            editorInstance = GlobalEditor;
        }

        let elementsRemoved = false;

        // ============================================
        // 1. GRAMMARLY - Attributes to strip
        // ============================================
        const grammarlyAttrs = [
            "data-new-gr-c-s-check-loaded",
            "data-new-gr-c-s-loaded",
            "data-gr-ext-installed",
            "data-grammarly-shadow-root"
        ];

        // Remove Grammarly elements
        document.querySelectorAll(
            "grammarly-desktop-integration," +
            "grammarly-popups," +
            "grammarly-extension," +
            "grammarly-timebar"
        ).forEach(el => {
            el.remove();
            elementsRemoved = true;
        });

        // Remove Grammarly attributes
        grammarlyAttrs.forEach(attr => {
            document.querySelectorAll("[" + attr + "]").forEach(el => {
                el.removeAttribute(attr);
                elementsRemoved = true;
            });
        });

        // Disable Grammarly on CKEditor (4 & 5 support)
        let attempts = 0;
        const maxAttempts = 25;
        const intervalId = setInterval(() => {
            try {
                // CKEditor 4 (iframe body)
                if (editorInstance.document && editorInstance.document.getBody) {
                    const body = editorInstance.document.getBody();
                    if (body) {
                        body.setAttribute("data-gramm", "false");
                        body.setAttribute("data-gramm_editor", "false");
                        elementsRemoved = true;
                        clearInterval(intervalId);
                        return;
                    }
                }
            } catch (e) {
                console.warn("Waiting for CKEditor editable area...", e);
            }
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                console.warn("Stopped trying to disable Grammarly (max attempts reached).");
            }
        }, 500);

        // ============================================
        // 2. IMMERSIVE TRANSLATE - Cleanup
        // ============================================
        elementsRemoved = commonMethods.removeTranslatorWrappers(document) || elementsRemoved;
        try {
            if (editorInstance && editorInstance.document && editorInstance.document.getBody) {
                const body = editorInstance.document.getBody();
                if (body && body.$) {
                    elementsRemoved = commonMethods.removeTranslatorWrappers(body.$) || elementsRemoved;
                }
            }
        } catch (e) {
            console.warn("Could not clean translator wrappers from CKEditor iframe:", e);
        }

        // ============================================
        // 3. YOUDAO - Cleanup (Updated)
        // ============================================
        const youdaoAttrs = [
            "data-youdao-trans",
            "data-yddict-id",
            "youdao-trans-id",
            "_youdao_",
            "youdao-dict",
            "dy-tran-visited",
            "yd-parent-id"
        ];

        const youdaoSelectors = [
            ".youdao-dict-popup," +
            "#youdao-dict-popup," +
            ".yddict-container," +
            "#yddict-container," +
            ".youdao-extension," +
            "youdao-popup," +
            ".youdao-translate-widget," +
            ".youdao-trans-container," +
            ".yd-translate-container," +
            ".yd-wrapper-block," +
            ".yd-highlight," +
            "font[dy-tran-visited]"
        ];

        // Remove Youdao elements from main document
        document.querySelectorAll(youdaoSelectors).forEach(el => {
            el.remove();
            elementsRemoved = true;
        });

        // Remove Youdao elements from CKEditor iframe body
        try {
            if (editorInstance && editorInstance.document && editorInstance.document.getBody) {
                const body = editorInstance.document.getBody();
                if (body && body.$) {
                    body.$.querySelectorAll(youdaoSelectors).forEach(el => {
                        el.remove();
                        elementsRemoved = true;
                    });
                }
            }
        } catch (e) {
            console.warn("Could not clean Youdao from CKEditor iframe:", e);
        }

        // Remove Youdao attributes from main document
        youdaoAttrs.forEach(attr => {
            document.querySelectorAll("[" + attr + "]").forEach(el => {
                el.removeAttribute(attr);
                elementsRemoved = true;
            });
        });

        // Remove Youdao attributes from CKEditor iframe body
        try {
            if (editorInstance && editorInstance.document && editorInstance.document.getBody) {
                const body = editorInstance.document.getBody();
                if (body && body.$) {
                    youdaoAttrs.forEach(attr => {
                        body.$.querySelectorAll("[" + attr + "]").forEach(el => {
                            el.removeAttribute(attr);
                            elementsRemoved = true;
                        });
                    });
                }
            }
        } catch (e) {
            console.warn("Could not remove Youdao attributes from CKEditor iframe:", e);
        }

        // Remove Youdao inline styles/marks from main document
        document.querySelectorAll('[style*="youdao"]').forEach(el => {
            el.removeAttribute("style");
            elementsRemoved = true;
        });

        // Remove Youdao inline styles from CKEditor iframe body
        try {
            if (editorInstance && editorInstance.document && editorInstance.document.getBody) {
                const body = editorInstance.document.getBody();
                if (body && body.$) {
                    body.$.querySelectorAll('[style*="youdao"]').forEach(el => {
                        el.removeAttribute("style");
                        elementsRemoved = true;
                    });
                }
            }
        } catch (e) {
            console.warn("Could not remove Youdao styles from CKEditor iframe:", e);
        }

        // ============================================
        // 4. GENERAL CLEANUP - Remove extension marks
        // ============================================
        const extensionSelectors = [
            ".translator-extension",
            "[data-extension-installed]",
            "[data-plugin-id]",
            ".extension-popup",
            ".translation-widget",
            ".dict-popup"
        ];

        extensionSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.remove();
                elementsRemoved = true;
            });
        });

        // Only regenerate if elements were removed
        if (elementsRemoved) {
            SET_DATA.reGenerateAllInit(editorInstance.getData(), {
                toclist: true,
                floatlist: true
            });
        }
    } catch (e) {
        console.error("Failed to clean translator extensions:", e);
    }
};

/**
 * OPTIONAL: Enhanced version with specific plugin detection
 * Use this if you need to know which plugins are active
 */
commonMethods.detectActiveTranslators = function() {
    const active = {
        grammarly: false,
        immersiveTranslate: false,
        youdao: false
    };

    // Check for Grammarly
    if (document.querySelector("grammarly-desktop-integration") ||
        document.querySelector("[data-grammarly-shadow-root]") ||
        document.querySelector("[data-new-gr-c-s-check-loaded]")) {
        active.grammarly = true;
    }

    // Check for Immersive Translate
    if (document.querySelector("#immersive-translate-popup") ||
        document.querySelector(".immersive-translate-toast-shadow-root") ||
        document.querySelector("[translate='no']")) {
        active.immersiveTranslate = true;
    }

    // Check for Youdao
    if (document.querySelector("#youdao-dict-popup") ||
        document.querySelector(".youdao-dict-popup") ||
        document.querySelector("[data-youdao-trans]") ||
        document.querySelector("[_youdao_]")) {
        active.youdao = true;
    }

    return active;
};


commonMethods.getModule = async function(name) {
    if (!window[name]) {
        window[name] = await moduleSystem.getModule(name);
    }
    return window[name];
};

commonMethods.missingItemSelector = function(selector, options = {}) {
    try {
        // ← extract correctly with default
        const {
            exists = false, missing = true
        } = options;

        const available = [];
        const noAvailable = [];

        // Find cites using selector
        const cites = GlobalEditor.document.find(selector).toArray();

        cites.forEach(cite => {
            const rid = cite.getAttribute("rid");

            if (cite.hasAttribute("data-delete") || cite.getAscendant("del")) {
                noAvailable.push({
                    id: rid,
                    cite
                });
            } else {
                available.push({
                    id: rid,
                    cite
                });
            }
        });

        // Remove items that appear in both arrays
        const finalCites = noAvailable.filter(na =>
            !available.some(av => av.id === na.id)
        );

        // If exists=true → return only available cites
        // If exists=false → return final filtered cites
        return exists ? available : finalCites;

    } catch (e) {
        console.warn("missingItemSelector error:", e.message);
        ErrorLogTrace("missingItemSelector", e.message);
    }
};



commonMethods.xrefSelectorBuilder = function(targetId, additionalAttributes = [], requiredRemovedItems = false) {
    try {
        const attrs = ["rid"].concat(additionalAttributes || []);
        const notRemoved = requiredRemovedItems ? "" : ":not([data-remove])";

        const selector = attrs
            .map(_key => [
                `a.xref[${_key}="${targetId}"]${notRemoved}`,
                `a.xref[${_key}^="${targetId} "]${notRemoved}`,
                `a.xref[${_key}$=" ${targetId}"]${notRemoved}`,
                `a.xref[${_key}*=" ${targetId} "]${notRemoved}`
            ])
            .flat()
            .join(", ");

        return selector;

    } catch (e) {
        console.warn("xrefSelectorBuilder error:", e.message);
        ErrorLogTrace("xrefSelectorBuilder", e.message);
    }
};


commonMethods.mergeAttributes = function(baseAttrs, extraAttrs) {
    var result = {};
    try {
        for (var key in baseAttrs) {
            if (baseAttrs.hasOwnProperty(key)) {
                result[key] = baseAttrs[key];
            }
        }
        if (extraAttrs && typeof extraAttrs === 'object') {
            for (var key2 in extraAttrs) {
                if (extraAttrs.hasOwnProperty(key2)) {
                    result[key2] = extraAttrs[key2];
                }
            }
        }
    } catch (e) {
        console.warn('mergeAttributes error:', e.message);
        ErrorLogTrace('mergeAttributes', e.message);
    }
    return result;
};


commonMethods.isRomanNumeral = function(num) {
    try {
        if (typeof num !== 'string' || num.trim() === '') return false;
        const romanRegex = /^(M{0,4})(CM|CD|D?C{0,3})?(XC|XL|L?X{0,3})?(IX|IV|V?I{0,3})?$/i;
        return romanRegex.test(num.trim());
    } catch (error) {
        return false;
    }
};

commonMethods.toRomanNumeral = function(num) {
    try {

        if (typeof num !== 'number' || num <= 0 || num >= 4000 || !Number.isInteger(num)) return '';

        const romanMap = [{
                value: 1000,
                numeral: 'M'
            },
            {
                value: 900,
                numeral: 'CM'
            },
            {
                value: 500,
                numeral: 'D'
            },
            {
                value: 400,
                numeral: 'CD'
            },
            {
                value: 100,
                numeral: 'C'
            },
            {
                value: 90,
                numeral: 'XC'
            },
            {
                value: 50,
                numeral: 'L'
            },
            {
                value: 40,
                numeral: 'XL'
            },
            {
                value: 10,
                numeral: 'X'
            },
            {
                value: 9,
                numeral: 'IX'
            },
            {
                value: 5,
                numeral: 'V'
            },
            {
                value: 4,
                numeral: 'IV'
            },
            {
                value: 1,
                numeral: 'I'
            }
        ];

        let result = '';
        for (let i = 0; i < romanMap.length; i++) {
            while (num >= romanMap[i].value) {
                result += romanMap[i].numeral;
                num -= romanMap[i].value;
            }
        }
        return result;
    } catch (error) {
        return '';
    }
};

commonMethods.isExtendedWordChar = function(ch) {
    // If whitespace, reject immediately
    if (/\s/.test(ch)) return false;
    return /[A-Za-z0-9~!@#$%\^&\*\(\)_\+<>?"\:}{\[\]';\/\.,\u00B0\u02B9\u2032\u2033\u2013\u2014\u2012\u002D\u00AD\u2212\u02D0\u2070\u02DA\u0374\uFE63\uFF0D\u2010\u2011\u207B\u208B\u00D7\u00F7\u003D\u221A\u2260\u2264\u2265\u2202\u03C0\u222B\u2211\u00B1\u00B7\+\-\*\/\^\.]/.test(ch);
};
/**  Common function to set collapsed selection */
commonMethods.setCollapsedSelection = function(editor) {

    let selection;

    try {

        selection = editor.getSelection();
        const ranges = selection.getRanges();

        if (!ranges.length) return false;

        IMPACT_SELECTION._SNAPSHOT({
            lock: true,
            SAVE: true
        });

        const bookmarks = selection.createBookmarks();
        const bookmark = bookmarks[0];

        const endMarker = bookmark.endNode || null;
        const startMarker = bookmark.startNode || null;
        const marker = endMarker || startMarker;

        if (!marker) {
            selection.removeAllRanges();
            return false;
        }

        const range = editor.createRange();
        const prev = marker.getPrevious();

        if (prev && prev.type === CKEDITOR.NODE_TEXT) {
            const offset = commonMethods.getValidOffset(prev, prev.getText().length);
            range.setStart(prev, offset);
        } else {
            range.moveToPosition(marker, CKEDITOR.POSITION_AFTER_END);
        }

        range.collapse(true);
        selection.selectRanges([range]);
        return true;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('setCollapsedSelection', err.message);
        if (selection) {
            selection.removeAllRanges();
        }
        return false;

    } finally {
        GlobalEditor.document
            .find("[data-cke-bookmark]")
            .toArray()
            .forEach(bk => bk.remove());

        IMPACT_SELECTION._SNAPSHOT({
            unlock: true,
            SAVE: true
        });
    }
};
commonMethods.getValidOffset = function(textNode, offset) {

    const text = textNode.getText();
    const maxOffset = text.length;

    let validOffset = Math.max(0, Math.min(offset, maxOffset));

    if (validOffset > 0 && text.charAt(validOffset - 1) === ' ') {
        validOffset--;
    }

    return validOffset;
};
commonMethods.absorbWhitespace = function(editor) {
    try {
        const selection = editor.getSelection();
        if (!selection) return false;

        const range = selection.getRanges()[0];
        if (!range || range.collapsed) return false;

        let changed = false;

        let {
            startContainer,
            startOffset,
            endContainer,
            endOffset
        } = range;

        // trim leading whitespace inside the selection
        if (startContainer && startContainer.type === CKEDITOR.NODE_TEXT && startOffset < startContainer.getText().length) {
            const text = startContainer.getText();
            let i = startOffset;
            while (i < text.length && /\s/.test(text.charAt(i))) i++;
            if (i !== startOffset) {
                range.setStart(startContainer, i);
                changed = true;
            }
        }

        // trim trailing whitespace inside the selection
        if (endContainer && endContainer.type === CKEDITOR.NODE_TEXT) {
            const text = endContainer.getText();
            let i = endOffset - 1;
            while (i >= 0 && /\s/.test(text.charAt(i))) i--;
            const newEnd = i + 1;
            if (newEnd !== endOffset) {
                range.setEnd(endContainer, newEnd);
                changed = true;
            }
        }

        if (changed) {
            selection.selectRanges([range]);
        }

        return changed;

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('absorbWhitespace', err.message);
        return false;
    }
};

commonMethods.normalizeSelectionToNearestWordBoundary = function(editor, options = {}) {
    try {
        const selection = editor.getSelection();
        const originalRanges = selection.getRanges()[0];
        const preferSelectionEnd = options.preferSelectionEnd !== false;

        let container = originalRanges.startContainer;
        let offset = originalRanges.startOffset;

        if (preferSelectionEnd && originalRanges && !originalRanges.collapsed) {
            container = originalRanges.endContainer;
            offset = originalRanges.endOffset;
        }

        const {
            ISEndOfBlock,
            ISstartOfBlock
        } = IMPACT_SELECTION;

        if (ISstartOfBlock || ISEndOfBlock) {
            commonMethods.setCollapsedSelection(editor, selection, container, {
                toStart: ISstartOfBlock,
                toEnd: ISEndOfBlock,
                offset: 0
            });
            return true;
        }


        // Resolve to text node if container is an element
        if (container.type === CKEDITOR.NODE_ELEMENT) {
            const child = container.getChild(offset) || container.getFirst(CKEDITOR.NODE_TEXT);
            if (child && child.type === CKEDITOR.NODE_TEXT) {
                container = child;
                offset = 0;
            } else return false;
        }

        if (container.type !== CKEDITOR.NODE_TEXT) return false;

        const text = container.getText();
        let start = offset;

        // Move left to find start of the word
        while (start > 0 && commonMethods.isExtendedWordChar(text.charAt(start - 1))) {
            start--;
        }

        const parent = container.getParent();
        const children = parent.getChildren();

        // Use walker to traverse previous nodes
        // Create a walker from the range
        const walker = new CKEDITOR.dom.walker(originalRanges);
        // Set a guard to stop traversal beyond a certain point
        walker.guard = function(node, isMovingOut) {
            // You can stop walking at some condition
            // Keep walking
            return true;
        };
        // Optional: set an evaluator to return only nodes you care about
        walker.evaluator = function(node) {
            return (
                node.type === CKEDITOR.NODE_TEXT || (node.type === CKEDITOR.NODE_ELEMENT && (node.hasAttribute('data-hid') /* || node.getName() === 'insert' */ ))
            );
        };
        // Optional: define optimize to skip unnecessary nodes
        walker.optimize = function(node) {
            return !(
                node.type === CKEDITOR.NODE_COMMENT || (node.type === CKEDITOR.NODE_TEXT && !node.getText().trim())
            );
        };

        if (start === 0) {
            let prev = parent.getPrevious();
            let firstParent = parent && parent.getParent && parent.getParent().getFirst ?
                parent.getParent().getFirst() :
                null;

            let isEqualFirst = firstParent && firstParent.equals && firstParent.equals(parent);


            while (prev && prev.type === CKEDITOR.NODE_TEXT && !prev.getText().trim()) {
                prev = prev.getPrevious();
            }

            let firstWord = null;

            if (parent && typeof parent.getFirst === 'function') {
                firstWord = parent.getFirst();
                if (firstWord && firstWord.type === CKEDITOR.NODE_ELEMENT && firstWord.hasAttribute('data-pi')) {
                    firstWord = firstWord.getNext();
                }
            }

            const isFirstWord = firstWord && typeof firstWord.equals === 'function' && firstWord.equals(container);

            if (isFirstWord) return commonMethods.setCollapsedSelection(editor, selection, container, {
                toStart: true
            });
            else if (!prev && isEqualFirst) {
                let matchedNodes = [];
                let node;
                while ((node = walker.previous())) {
                    matchedNodes.push(node);
                }
                console.log(matchedNodes);
            }

            if (prev && prev.type === CKEDITOR.NODE_ELEMENT && prev.hasAttribute('data-hid')) {
                return commonMethods.setCollapsedSelection(editor, selection, prev, {
                    toStart: true
                });
            }

            if (prev && prev.type === CKEDITOR.NODE_TEXT) {
                const prevText = prev.getText();
                const isWordJoin = !/\s$/.test(prevText);
                let wordStart = isFirstWord ? 0 : null;

                if (isWordJoin) {
                    wordStart = prevText.length;
                    while (wordStart > 0 && commonMethods.isExtendedWordChar(prevText.charAt(wordStart - 1))) {
                        wordStart--;
                    }
                }

                if (wordStart != null && (isWordJoin || isFirstWord)) {
                    return commonMethods.setCollapsedSelection(editor, selection, prev, {
                        toStart: false,
                        offset: wordStart
                    });
                }
            }

            return false;
        }

        // Default behavior: move to start of current word
        return commonMethods.setCollapsedSelection(editor, selection, container, {
            toStart: false,
            offset: start
        });

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('normalizeSelectionToNearestWordBoundary', err.message);
        return false;
    }
};


commonMethods.includesInOrder = function(flatList, sequence) {
    try {
        let index = 0;
        for (let i = 0; i < flatList.length; i++) {
            if (flatList[i] === sequence[index]) {
                index++;
                if (index === sequence.length) return true;
            }
        }
        return false;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('includesInOrder', err.message);
        return false;
    }
};
commonMethods.Get_CID = function() {
    try {
        let findQuery = 'del,insert';
        if (typeof trackDialog != "undefined" && trackDialog.M_SCOPE && trackDialog.M_SCOPE.TrackFindQuery) {
            findQuery = trackDialog.M_SCOPE.TrackFindQuery;
        }
        return GlobalEditor.document.find(findQuery).$.length + 1;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Get_CID', err.message);
        return Math.floor(Math.random() * 20) + 1;
    }
};
commonMethods.getClientCode = function(Options = {}) {
    try {
        const {
            format = "raw",
                fallback = ""
        } = Options;

        let client = "";

        if (typeof DOC_INFO !== "undefined" && DOC_INFO && typeof DOC_INFO.get === "function") {
            client = DOC_INFO.get("CLIENT") || "";
        }

        if (!client && typeof SHARED_KEY !== "undefined" && SHARED_KEY && SHARED_KEY.client) {
            client = SHARED_KEY.client;
        }

        if (!client) {
            client = fallback || "";
        }

        const value = String(client || "");
        if (format === "upper") return value.toUpperCase();
        if (format === "lower") return value.toLowerCase();
        return value;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getClientCode', err.message);
        return String((Options && Options.fallback) || "");
    }
};
commonMethods.Get_File_Extension = function(sFilename) {
    try {
        let file_split = sFilename.split('.');
        return file_split[file_split.length - 1];
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Get_File_Extension', err.message);
    }
};
commonMethods.insertAfter = function(newNode, referenceNode) {
    try {
        console.log('start');
        referenceNode = referenceNode[0] ? referenceNode : referenceNode;
        if (typeof newNode == 'string') newNode = document.createRange().createContextualFragment(newNode);
        else if (newNode[0]) newNode = newNode[0];
        if (referenceNode.nextSibling) {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
            console.log('insertBefore');
        } else {
            referenceNode.parentNode.appendChild(newNode);
            console.log('append');
        }
        console.log('end');
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('insertAfter', err.message + referenceNode.id + referenceNode.parentElement.id);
    }
};

function getWordsCap(str, area) {
    try {
        let intCount = 20,
            string = '',
            limit = getMaxTextLength[area];
        if (str && str.length > limit.max) {
            while (str.split(/\s+/).slice(0, intCount).join(" ").length > limit.min) {
                intCount--;
            }
            if (area == 'CrossCitation' || area == 'ToolTip') {
                string = [str.split(/\s+/).slice(0, intCount).join(" "), str.split(/\s+/).slice(-2).join(" ")].join(' ... ');
            }
        } else {
            string = str ? str : '';
        }
        return string;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getWordsCap', err.message);
    }
}

commonMethods.STRING_HTML = function(str) {
    try {
        let temp = document.createElement('template');
        temp.innerHTML = str;
        return temp.content.childNodes;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('STRING_HTML', err.message);
    }
};
commonMethods.SET_REMOVE_CLASS = function(elm, Option) {
    try {
        // ? {add:["d-flex"],remove:['ds-none']}
        // ? https://js-cumuzu.stackblitz.io
        elm = (typeof elm == 'string') ? iGetElmById(elm) : elm;
        Option = !Option ? ({
            add: null,
            remove: null
        }) : Option;
        // ? adding class
        if (Option.add) elm.classList.add(...Option.add);
        // ? remove class
        if (Option.remove) elm.classList.remove(...Option.remove);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('SET_REMOVE_CLASS', err.message);
    }
};
commonMethods.GET_ATTR = function(target) {
    try {
        return Object.assign({}, ...Array.from(target.attributes, ({
            name,
            value
        }) => ({
            [name]: value
        })));
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('GET_ATT', err.message);
    }
};
commonMethods.SET_REMOVE_ATTR = function(elm, setObj, removeArr, classHandler) {
    try {
        // ? if elm comes if string get element 
        elm = (typeof elm == 'string') ? iGetElmById(elm) : elm;
        // ? set attributes method
        if (setObj) this.setAttr(elm, setObj);
        // ? remove attributes method
        if (removeArr) this.removeAttr(elm, removeArr);
        // ? class name handle
        if (classHandler) this.SET_REMOVE_CLASS(elm, classHandler);
        return elm;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('setAttributes', err.message);
    }
};
commonMethods.Default = {
    getAttributes: (array = []) => {
        let result = {};
        try {
            const list = commonMethods.Default.AttributesList;
            if (array.length === 0) array = Object.keys(list);

            result = array.reduce((acc, key) => {
                const value = typeof list[key] === 'function' ? list[key]() : list[key];
                return commonMethods.mergeAttributes(acc, value);
            }, {});
        } catch (error) {
            console.warn('getAttributes error:', error.message);
            ErrorLogTrace('getAttributes', error.message);
        } finally {
            return result;
        }
    },
    AttributesList: {
        /* 
            "data-changedata": "",
            "data-cid": that['G_FUN'].Get_CID(),
            "data-last-change-time": time,
            "data-time": time,
            "data-userid": lite_userId,
            "data-username": USER_INFO.MAIL_ID,
            ["du", "dc","d-uid", "dt"]
            "data-action": Options.action,
                "data-action-time": DateTime,
                "data-action-user": CUR_USER
        */
        "dat": () => ({
            "data-action-time": new Date().getTime()
        }),
        "dau": () => ({
            "data-action-user": USER_INFO.MAIL_ID
        }),
        "dar": () => ({
            "data-action-role": USER_INFO.ROLE_NAME
        }),
        "drn": () => ({
            "data-rolename": USER_INFO.TRACK_ROLE_NAME
        }),
        du: () => ({
            "data-username": USER_INFO.MAIL_ID
        }),
        dc: () => ({
            "data-changedata": ""
        }),
        "d-uid": () => ({
            "data-userid": lite_userId
        }),
        "d-cid": () => ({
            "data-cid": commonMethods.Get_CID()
        }),
        dtc: () => ({
            "data-timec": (new Date()).getTime()
        }),
        dt: () => ({
            "data-time": (new Date()).getTime()
        }),
        dlct: () => ({
            "data-last-change-time": (new Date()).getTime()
        }),
        wsc_i_e: {
            "data-wsc-ignore": ""
        }
    }
};
commonMethods.addContent = function(element, content, position = 'append') {
    try {
        if (!content) return;

        const method = position === 'append' ? 'append' : 'prepend';

        if (typeof content === 'string') {
            const temp = document.createElement('span');
            temp.innerHTML = content;
            element[method](...temp.childNodes);
        } else {
            element[method](content);
        }
    } catch (error) {
        console.warn(`addContent error: ${error.message}`);
        ErrorLogTrace('addContent', error.message);
    }
};
commonMethods.setAttr = function(el, attr_json, option = {}) {
    let {
        append,
        prepend,
        text,
        mergeAttr
    } = option;

    try {
        let ObjAttr = commonMethods.Default.AttributesList;
        if (typeof el == 'string') el = document.createElement(el);

        // Convert NamedNodeMap to plain object if needed
        let processedAttrs = attr_json;
        if (attr_json && attr_json.constructor.name === 'NamedNodeMap') {
            processedAttrs = {};
            Array.from(attr_json).forEach(function(attr) {
                processedAttrs[attr.name] = attr.value;
            });
        }

        // Merge attributes if mergeAttr is provided
        if (mergeAttr) {
            processedAttrs = commonMethods.mergeAttributes(processedAttrs || {}, mergeAttr);
        }

        if (processedAttrs) {
            //? set attributes
            Object.keys(processedAttrs).forEach(function(key) {
                // ? 31_OCT_22- YA
                if (key == "default" && Array.isArray(processedAttrs[key])) {
                    Array.from(processedAttrs[key]).forEach(item => {
                        let value = "";
                        if (typeof ObjAttr[item] == "function") {
                            value = ObjAttr[item]();
                        } else value = ObjAttr[item];
                        if (value) commonMethods.setAttr(el, value);
                    });
                } else {
                    let value = ((typeof processedAttrs[key] == "function") ? (processedAttrs[key]()) : (processedAttrs[key]));
                    if (key == "value" && el.tagName == "INPUT") {
                        // ? UPDATE 08_NOV_22 - YA
                        el.value = value;
                    } else {
                        el.setAttribute(key, value);
                    }
                }
            });
        }

        // ? append/prepend element
        if (typeof append != "undefined") commonMethods.addContent(el, append, 'append');
        if (typeof prepend != "undefined") commonMethods.addContent(el, prepend, 'prepend');
        // ? text change
        if (typeof text != "undefined") el.textContent = text;

        return el;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('commonMethods.setAttr', err.message);
    }
};
commonMethods.removeAttr = function(el, attrArr) {
    try {
        //? remove attributes
        attrArr.forEach((attr, ind, ar) => {
            el.removeAttribute(attr);
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('removeAttr', err.message);
    }
};
// ? https://stackoverflow.com/questions/13697829/hexadecimal-to-string-in-javascript
commonMethods.hex2a = function(hex) {
    // ? hex to string
    // force conversion
    hex = hex.toString();
    var str = '';
    for (var i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    // console.log(str);
    return str;
};
commonMethods.String2Hex = function(str) {
    // ? string to hexa
    var result = '';
    for (var i = 0; i < str.length; i++) {
        result += str.charCodeAt(i).toString(16);
    }
    return result;
};
commonMethods.compareArray = function(array1, array2) {
    try {
        // ? compare two arrays return boolean
        return array1.length === array2.length && array1.every((value, index) => value === array2[index]);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('compareArrays', err.message);
    }
};
commonMethods.Get_Index = function(childrenList, node) {
    try {
        // ? return the index value of child node from parent
        var idx = -1;
        Array.from(childrenList).forEach((elm, ind, arr) => {
            if (elm.isEqualNode(node)) idx = ind;
        });
        return idx;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Get_Index', err.message);
    }
};
commonMethods.setCaret = function(el) {
    try {
        // ? set caret of the input elements
        el.focus();
        if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
            var range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            debug.warn("=setCaret=");
        } else if (typeof document.body.createTextRange != "undefined") {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(el);
            textRange.collapse(false);
            textRange.select();
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('commonMethods.setCaret ', err.message);
    }
};
String.prototype.lpad = function(padString, length) {
    var str = this;
    while (str.length < length)
        str = padString + str;
    return str;
};

function romanize(num) {
    try {
        // ? number roman numbers
        //? Ensure num is defined and handle cases where it might not be a number
        if (typeof num === 'undefined' || num === null || isNaN(num)) {
            return false;
        }
        var digits = String(+num).split(""),
            key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
                "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
                "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"
            ],
            roman = "",
            i = 3;
        while (i--)
            roman = (key[+digits.pop() + (i * 10)] || "") + roman;
        return Array(+digits.join("") + 1).join("M") + roman;

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('romanize', err.message);
    }
}

function deromanize_new(romanNumeral) {
    // Early return if input is falsy
    if (!romanNumeral) return false;

    const ROMAN_NUMERAL_MAP = {
        M: 1000,
        CM: 900,
        D: 500,
        CD: 400,
        C: 100,
        XC: 90,
        L: 50,
        XL: 40,
        X: 10,
        IX: 9,
        V: 5,
        IV: 4,
        I: 1
    };

    // Early return if input is falsy

    try {
        const normalizedInput = romanNumeral.toUpperCase();

        // Validate the Roman numeral format
        const VALIDATOR = /^M*(?:D?C{0,3}|C[MD])(?:L?X{0,3}|X[CL])(?:V?I{0,3}|I[XV])$/;
        if (!VALIDATOR.test(normalizedInput)) {
            return false;
        }

        // Match Roman numeral tokens
        const TOKEN_REGEX = /[MDLV]|C[MD]?|X[CL]?|I[XV]?/g;
        let sum = 0;
        let match;

        // Sum up the values of each Roman numeral token
        while ((match = TOKEN_REGEX.exec(normalizedInput)) !== null) {
            const value = ROMAN_NUMERAL_MAP[match[0]];

            // Check if the value exists and is a number
            if (value == null || typeof value !== 'number') {
                console.warn(`Invalid Roman numeral token found: ${match[0]}`);
                return false;
            }

            sum += value;
        }

        return sum;
    } catch (error) {
        console.warn(`Error in deromanize: ${error.message}`);
        ErrorLogTrace('deromanize', error.message);
        return false;
    }
}

function deromanize(str) {
    try {
        // ? convert ROMAN to number
        // str = str.toUpperCase();   
        const normalizedInput = str.toUpperCase();
        var VALIDATOR = /^M*(?:D?C{0,3}|C[MD])(?:L?X{0,3}|X[CL])(?:V?I{0,3}|I[XV])$/,
            TOKEN_REGEX = /[MDLV]|C[MD]?|X[CL]?|I[XV]?/g,
            /* beautify preserve:start */
        ROMAN_NUMERAL_MAP = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 },
            /* beautify preserve:end */
            num = 0;
        if (!(normalizedInput && VALIDATOR.test(normalizedInput)))
            return false;
        let sum = 0;
        let match;
        // Sum up the values of each Roman numeral token
        while ((match = TOKEN_REGEX.exec(normalizedInput)) !== null) {
            const value = ROMAN_NUMERAL_MAP[match[0]];

            // Check if the value exists and is a number
            if (value == null || typeof value !== 'number') {
                console.warn(`Invalid Roman numeral token found: ${match[0]}`);
                return false;
            }

            sum += value;
        }
        return sum;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('deromanize', err.message);
    }
}

function getAlphabateByIndex(n, IsUpperCase = false) {
    try {
        // ? get alphabets by Index based
        var ordA = 'a'.charCodeAt(0);
        var ordZ = 'z'.charCodeAt(0);
        var len = ordZ - ordA + 1;
        var s = "";
        while (n >= 0) {
            s = String.fromCharCode(n % len + ordA) + s;
            n = Math.floor(n / len) - 1;
        }
        return IsUpperCase ? s.toLocaleUpperCase() : s;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getAlphabateByIndex', err.message);
    }
}

function diffYMDHMS(date1) {
    try {
        // ? different between timestamps
        date1 = moment(date1);
        let now = moment();
        var showTime;
        let years = now.diff(date1, 'year');
        let months = now.diff(date1, 'months');
        let days = now.date() - date1.date();
        let hours = now.diff(date1, 'hours');
        let minutes = now.diff(date1, 'minutes');
        let seconds = now.diff(date1, 'seconds');
        var TimeDiff = {
            year: years,
            months: months,
            days: days,
            hours: hours,
            minutes: minutes,
            seconds: seconds,
        };
        if (years > 0) {
            showTime = moment().subtract(years, 'year').format('ll');
            TimeDiff.relative = showTime;
            return TimeDiff;
        }
        if (months > 0) {
            showTime = moment().subtract(months, 'month').format('ll');
            TimeDiff.relative = showTime;
            return TimeDiff;
        }
        if (date1.date() != now.date()) {
            if (days > 0) {
                showTime = moment().subtract(days, 'days').format(now.year() == date1.year() ? 'MMM Do' : 'll');
                TimeDiff.relative = showTime;
                return TimeDiff;
            }
        }
        if (hours > 0) {
            showTime = hours + (hours > 1) ? (' hours ago') : (' hours ago');
            TimeDiff.relative = showTime;
            return TimeDiff;
        }
        if (minutes > 0) {
            showTime = minutes + (minutes > 1) ? (' minutes ago') : (' minute ago');
            TimeDiff.relative = showTime;
            return TimeDiff;
        }
        if (seconds >= 0) {
            showTime = 'few seconds ago';
            TimeDiff.relative = showTime;
            return TimeDiff;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('diffYMDHMS', err.message);
    }
}
String.prototype.replaceBetween = function(start, end, what) {
    try {
        if (what != undefined) {
            return this.substring(0, start) + what + this.substring(end);
        } else {
            return this.substring(0, start) + this.substring(end);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('replaceBetween', err.message);
    }
};
String.prototype.firstLetterUpperCase = function() {
    try {
        return this.charAt(0).toUpperCase() + this.slice(1);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('firstLetterUpperCase', err.message);
    }
};
String.prototype.toTitleCase = function() {
    try {
        return this.replace(/\w\S*/g, function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('toTitleCase', err.message);
    }
};
String.prototype.splitLastComma = function() {
    try {
        var split = this.match(/(.*),(.*)/);
        return [split[1], split[2]];
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('splitLastComma', err.message);
    }
};
String.prototype.hasOnlyThrough = function() {
    const str = this.toString();
    const hasThrough = /\bthrough\b/i.test(str);
    const hasDash = /[-–—]/.test(str);
    return hasThrough && !hasDash;
};
String.prototype.isContainsDash = function(invert = false, sep = "", join = "") {
    try {
        const patterns = {
            ",": "[,]",
            "all": "[-–—,]|\\bthrough\\b",
            "default": "[-–—]|\\bthrough\\b"
        };

        const regex = new RegExp(patterns[sep] || patterns.default, "gi");
        const found = regex.test(this);

        if (join) return this.split(regex).join(join);
        if (sep === "dash" && this.includes(",") && found) return false;

        return invert ? !found : found;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("isContainsDash", err.message);
        return false;
    }
};
String.prototype.expandNumbers = function(self) {
    self = this.toLocaleString();
    try {
        //? expand n-dash number values, e.g => 1-3 = 1,2,3
        var commaSplit, arr = [];
        // ? no nDash | comma
        if (self.isContainsDash(!0, "all")) {
            arr.push(self);
            // ? Only nDash
        } else if (self.isContainsDash(null, "dash")) {
            var NewSplit = rangeExpand(self);
            $.each(NewSplit, function(indexInArray, txt) {
                arr.push(txt);
            });
            // ? combined
        } else if (self.isContainsDash(null, ",")) {
            commaSplit = self.split(',');
            $.each(commaSplit, function(index, txt) {
                if (txt.isContainsDash(!0)) {
                    arr.push(txt);
                } else {
                    var wSplit = rangeExpand(txt);
                    $.each(wSplit, function(ind, node) {
                        arr.push(node);
                    });
                }
            });
        }
        return arr.sort(function(a, b) {
            return a - b;
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('expandNumbers', err.message);
    }
};
String.prototype.replaceAllSplit = function(search, replacement) {
    try {
        var target = this;
        var loop = 0;
        while (target.indexOf(search)) {
            target = target.split(search).join(replacement);
            if (loop > 10) {
                break;
            } else loop++;
        }
        return target;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('replaceAllSplit', err.message);
    }
};
String.prototype.replaceAllregrex = function(search, replacement) {
    try {
        var target = this;
        var loop = 0;
        while (target.indexOf(search)) {
            target = target.replace(new RegExp(search, 'g'), replacement);
            if (loop > 10) {
                break;
            } else loop++;
        }
        return target;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('replaceAllregrex', err.message);
    }
};

function rangeExpand(_this) {
    let to_String = '';
    try {
        //? expand n-dash number values, e.g => 1-3 = 1,2,3
        to_String = _this.toString();
        var self = _this.split(/[-–—]|\bthrough\b|\bto\b/gi);
        var start = parseInt(self[0]);
        var end = parseInt(self[1]);
        return Array(end - start + 1).fill().map((_, idx) => start + idx);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('rangeExpand', err.message + '<br/>' + to_String);
    }
}


/********************
 * 
 * 
 * * https://claude.site/artifacts/8c9b3257-e2bc-4ffc-8af6-f59c3e5a8e33
 * *  
 * 
 // Example usage:
* const formatter = new RangeFormatter();
* console.log(formatter.formatRanges([1,2]));
* console.log(formatter.formatRanges([1,2,3]));
* console.log(formatter.formatRanges([7,15,16,17]));
* console.log(formatter.formatRanges(["a,b,c"]));

* const customFormatter = new RangeFormatter({ consecutiveThreshold: 2, last_sep: ' & ' });
* console.log(customFormatter.formatRanges([7,15,16,19]));
* console.log(customFormatter.formatRanges(["a-d", "f", "h-k"]));
* console.log(customFormatter.formatRanges([1, 2, 3, "5-8", 10, 11])
 */


class RangeFormatter {
    constructor(options) {
        var defaultOptions = {
            consecutiveThreshold: 3,
            double_sep: ',',
            range_sep: '–',
            last_sep: ','
        };
        this.options = Object.assign({}, defaultOptions, options || {});
    }

    logError(functionName, error) {
        console.warn(`Error in ${functionName}: ${error.message}`);
        ErrorLogTrace(`RangeFormatter ${functionName}`, error.message);
    }
    formatRanges(input) {
        try {
            const items = this.parseInput(input);
            return this.formatItems(items);
        } catch (err) {
            this.logError('formatRanges', err);
            return '';
        }
    }
    parseInput(input) {
        try {

            const sep = this.options.double_sep;

            // Case 1: Array input
            if (Array.isArray(input)) {
                return input
                    .map(item => {
                        if (typeof item === "string" && item.includes(sep)) {
                            return item.split(sep).map(v => v.trim());
                        }
                        return typeof item === "string" ? item.trim() : item;
                    })
                    .flat();
            }

            // Case 2: Non-array input → check if split is available
            if (typeof input === "string" && input.includes(sep)) {
                return input.split(sep).map(v => v.trim());
            }

            // Case 3: Not a string → return as-is
            return [input];
        } catch (err) {
            this.logError('parseInput', err);
        }
    }


    isAlphabetic(char) {
        try {
            return /^[a-zA-Z]$/.test(char);
        } catch (err) {
            this.logError('isAlphabetic', err);
        }
    }
    formatItems(items) {
        try {
            const isAlpha = items.some(item => this.isAlphabetic(item.toString()[0]));
            items = this.expandRanges(items, isAlpha);
            items = this.sortItems(items, isAlpha);
            const formattedRanges = this.groupConsecutiveItems(items, isAlpha);
            return this.joinFormattedRanges(formattedRanges);
        } catch (err) {
            this.logError('formatItems', err);
        }
    }
    expandRanges(items, isAlpha) {
        try {
            return items.flatMap(item => {
                if (typeof item === 'string' && item.includes(this.options.range_sep)) {
                    const [start, end] = item.split(this.options.range_sep);
                    return isAlpha ? this.expandAlphaRange(start, end) : this.expandNumericRange(Number(start), Number(end));
                }
                return item;
            });
        } catch (err) {
            this.logError('expandRanges', err);
        }
    }
    sortItems(items, isAlpha) {
        try {
            return isAlpha ? items.sort((a, b) => a.localeCompare(b)) : items.sort((a, b) => a - b);
        } catch (err) {
            this.logError('sortItems', err);
        }
    }
    groupConsecutiveItems(items, isAlpha) {
        try {
            let result = [];
            let currentGroup = [items[0]];
            for (let i = 1; i <= items.length; i++) {
                const current = items[i];
                const prev = items[i - 1];
                const isConsecutive = this.areConsecutive(prev, current, isAlpha);
                if (isConsecutive) {
                    currentGroup.push(current);
                } else {
                    result.push(this.formatGroup(currentGroup, isAlpha));
                    currentGroup = current ? [current] : [];
                }
            }
            return result;
        } catch (err) {
            this.logError('groupConsecutiveItems', err);
        }
    }
    areConsecutive(prev, current, isAlpha) {
        try {
            if (!current) return false;
            return isAlpha ?
                current.charCodeAt(0) === prev.charCodeAt(0) + 1 :
                current === prev + 1;
        } catch (err) {
            this.logError('areConsecutive', err);
        }
    }
    formatGroup(group, isAlpha) {
        try {
            if (group.length >= this.options.consecutiveThreshold) {
                return `${group[0]}${this.options.range_sep}${group[group.length - 1]}`;
            } else {
                return group.map(item => isAlpha ? String.fromCharCode(item.charCodeAt(0)) : String(item)).join(this.options.double_sep);
            }
        } catch (err) {
            this.logError('formatGroup', err);
        }
    }
    joinFormattedRanges(ranges) {
        try {
            if (ranges.length <= 1) {
                return ranges.join('');
            } else {
                const lastItem = ranges.pop();
                return ranges.join(this.options.double_sep) + this.options.last_sep + lastItem;
            }
        } catch (err) {
            this.logError('joinFormattedRanges', err);
        }
    }
    expandAlphaRange(start, end) {
        try {
            const startCode = start.charCodeAt(0);
            const endCode = end.charCodeAt(0);
            return Array.from({
                length: endCode - startCode + 1
            }, (_, i) => String.fromCharCode(startCode + i));
        } catch (err) {
            this.logError('expandAlphaRange', err);
        }
    }
    expandNumericRange(start, end) {
        try {
            return Array.from({
                length: end - start + 1
            }, (_, i) => start + i);
        } catch (err) {
            this.logError('expandNumericRange', err);
        }
    }
}
/****************
 * 
 * 
 * * END OF CLASS MODULE FOT RANGE
 * 
 * 
 * 
 * 
 **/


function rangeExtraction(list, config) {
    // ? https://rosettacode.org/wiki/Range_extraction#JavaScript
    // ? https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
    try {
        var count = 0,
            max = 7,
            len = list.length,
            out = [],
            i, j, default_sep = {
                double_sep: ',',
                range_sep: '–'
            };
        // ? 29_OCT_22 - YA - FF_105
        if (typeof list.split == "function") {
            list = list.split(",").map(function(x) {
                return parseInt(x, 10);
            });
        }
        var panel = (commonMethods.IsVisibleElm(CitationNewModule.Panel) ? (CitationNewModule['M_FUN'].getConfig(CitationNewModule['M_FUN'].GET_SET_ACTIVE())) : (null));
        config = config ? config.dircite : (panel ? panel.dircite : default_sep);
        for (i = 0; i < len; i = j + 1) {
            // beginning of range or single
            out.push(list[i]);
            // find end of range
            for (var j = i + 1; j < len && list[j] == list[j - 1] + 1; j++);
            j--;
            // ? single number
            if (i == j) {
                out.push(config.double_sep);
                // ? two numbers
            } else if (i + 1 == j) {
                out.push(config.double_sep, list[j], config.double_sep);
                // ? range
            } else {
                out.push(config.range_sep, list[j], config.double_sep);
            }
        }
        out.filter(Boolean);
        while ([",", ", ", undefined, null, "null", "undefined", "", " "].includes(out[out.length - 1])) {
            // ? remove trailing comma
            out.pop();
            if (max < count) break;
            else count++;
        }
        // debug.log(out.join(""));
        return out.join("");
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('rangeExtraction', err.message);
    }
}
var FromCharCode = function(char) {
    try {
        return String.fromCharCode(parseInt(char));
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('FromCharCode', err.message);
    }
};
Array.prototype.max = function() {
    return Math.max.apply(null, this);
};
Array.prototype.min = function() {
    return Math.min.apply(null, this);
};
Array.prototype.join2 = function(all, last) {
    //https://stackoverflow.com/questions/15069587/is-there-a-way-to-join-the-elements-in-an-js-array-but-let-the-last-separator-b
    try {
        last = last ? last : all;
        // ? make a copy so we don't mess with the original
        var arr = this.slice();
        // ? strip out the last element
        var lastItem = arr.splice(-1);
        // ? make an array with the non-last elements joined with our 'all' string, or make an empty array
        arr = arr.length ? [arr.join(all)] : [];
        // ? add last item back so we should have ["some string with first stuff split by 'all'", last item]; or we'll just have [lastItem] if there was only one item, or we'll have [] if there was nothing in the original array
        arr.push(lastItem);
        // ? from config 06_MAY_2023 - YA
        // return arr.join(this.length > 2 ? last : all); // ?now we join the array with 'last'
        return arr.join(this.length >= 2 ? last : all);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Array.prototype.join2', err.message);
    }
};
const rangeExtraction_Alphabets = (x, config = {}) => {
    try {
        // ? https://stackblitz.com/edit/js-azanzm?file=index.js
        let IsAlpha = false;
        x = [].concat(
            ...x.map((x) => {
                let char = x;
                IsAlpha = true;
                let text = x.toString().replace('-', '–');
                if (text.isContainsDash()) {
                    let split = text.split(/[-–—]|\bthrough\b/gi),
                        char_1 = split[0],
                        char_2 = split[1],
                        return_val = [isNaN(char_1) ? char_1.charCodeAt(0) : char_1, isNaN(char_1) ? char_2.charCodeAt(0) : char_2, ].join('–').expandNumbers();
                    return return_val;
                } else return isNaN(x) ? char.charCodeAt(0) : x;
            })
        );
        //console.log(x);
        const sorted = x.sort((a, b) => a - b);
        const grouped = sorted.map((x, i, a) => (i == a.findIndex((x2, i2) => i2 - x2 == i - x) && a.filter((x2, i2) => i2 - x2 == i - x)) || []);
        const ranged = grouped.map((x) => x.length > 2 ? x[0] + '-' + x.slice(-1)[0] : x);
        let final = ranged.flat();
        // ? from config 06_MAY_2023 - YA
        /*
            {
                "single_prefix": "Figure ", | "double_prefix": "Figures ", | "double_sep": ", ", |"last_sep": " and ",| "multi_prefix": "Figures ",| 
                "range_sep": " through ", | "openwrap": "", | "closewrap": "", | "part_lab_prefix_num": "yes", | "part_lab_case": "upper"
            }
        */
        const {
            part_lab_prefix_num,
            part_lab_case,
            range_sep,
            part_lab_double_sep,
            double_sep,
            last_sep,
            part_lab_range_sep
        } = config;

        let double = ((part_lab_double_sep && final.length == 2) ? part_lab_double_sep : (double_sep ? double_sep : ", "));
        let last = (last_sep ? last_sep : " and ");
        let rangedSep = (range_sep ? range_sep : "–");

        let getJoinSeparators = (len) => {
            let dbl = double;
            let lst = last;

            if (len > 2 && last.includes("|")) {
                const splitLast = last.split("|");
                if (splitLast.length > 1) {
                    dbl = splitLast[0];
                    lst = splitLast[1];
                }
            } else if (last.includes("|")) {
                lst = dbl;
            }

            return {
                dbl,
                lst
            };
        };

        if (IS_LOCAL_HOST) debugger;
        const convertAlpha = value => {
            let ch = FromCharCode(value);

            if (part_lab_case === "upper")
                ch = ch.toUpperCase();
            else if (part_lab_case === "lower")
                ch = ch.toLowerCase();

            return ch;
        };
        if (IsAlpha) {
            rangedSep = part_lab_range_sep || range_sep || "–";
            let temp_arr = final.map((x) => {
                if (x.toString().includes("-")) {
                    const [start, end] = x.split("-");
                    return convertAlpha(start) + rangedSep + convertAlpha(end);
                } else {
                    return isNaN(x) ? x : convertAlpha(x);
                }
            });

            const {
                dbl,
                lst
            } = getJoinSeparators(temp_arr.length);
            return temp_arr.join2(dbl, lst);
        } else {
            const {
                dbl,
                lst
            } = getJoinSeparators(final.length);
            return final.join2(dbl, lst);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('rangeExtraction_Alphabets', err.message);
    }
};
//? check available object
var keyExistsOn = (o, k) => k.split(".").reduce((a, c) => a.hasOwnProperty(c) ? a[c] || 1 : false, Object.assign({}, o)) === false ? false : true;

function diff_minutes(dt2, dt1) {
    try {
        // ? get diff time for diff dates
        var diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= 60;
        return Math.abs(Math.round(diff));
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('diff_minutes', err.message);
    }
}
commonMethods.GET_ARR_TEXT = function(arr, Options = {
    boolean: true,
    join: false
}) {
    try {
        let reTurn = Array.from(arr, ({
            textContent
        }) => textContent.trim());

        if (Options.boolean) reTurn = reTurn.filter(Boolean);
        if (Options.join) reTurn = reTurn.join(Options.join);
        return reTurn;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('GET_ARR_TEXT', err.message);
    }
};
commonMethods.getKeyByValue = function(object, value) {
    try {
        // ? get key by value on object
        let key = Object.keys(object).filter((key) => object[key] === value);
        return key ? key[0] : false;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getKeyByValue', err.message);
    }
};
commonMethods.checkRanges = function(el) {
    try {
        const range = document.createRange();
        range.selectNodeContents(el);
        const rangeRect = range.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        return rangeRect.right > elRect.right;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('checkRanges', err.message);
        return false;
    }
};
commonMethods.isEllipsisActive = function(el) {
    try {
        if (!el) return false;
        // Width-based check is fast and works in most cases
        if (el.scrollWidth > el.clientWidth) return true;
        // Fallback for text wrapping / custom font cases
        return this.checkRanges(el);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('isEllipsisActive', err.message);
    }
};
const ObjectFilter = (object, key, value) => {
    try {
        if (Array.isArray(object)) {
            for (const obj of object) {
                const result = ObjectFilter(obj, key, value);
                if (result) {
                    return obj;
                }
            }
        } else {
            if (object.hasOwnProperty(key) && object[key] === value) {
                return object;
            }
            for (const k of Object.keys(object)) {
                if (typeof object[k] === 'object' && !Array.isArray(object[k]) && Object.keys(object).length > 0 && object[k] instanceof XMLDocument == false) {
                    const o = ObjectFilter(object[k], key, value);
                    if (o !== null && typeof o !== 'undefined') return o;
                }
            }
            return null;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('ObjectFilter', err.message);
    }
};
commonMethods.Get_Unique_Array = function(_Array) {
    try {
        return _Array.filter(function(item, pos) {
            return _Array.indexOf(item) == pos;
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('GetUniqueArr', err.message);
    }
};
commonMethods.Duplicate_Array = function(_Array, _Array2, Option = {}, self) {
    self = commonMethods;
    try {
        if (!_Array) return [];
        else _Array = self.Get_Unique_Array(_Array);
        if (!_Array2) {
            return _Array;
        } else {
            if (_Array2) _Array2 = self.Get_Unique_Array(_Array2);
            Option = Option ? Option : ({
                // ? remove duplicate
                remove: true,
                // ? find duplicates retains
                find: false,
                // ? return have duplicate - boolean true/false
                bool: false
            });
            var commonArray = _Array.filter(function(item) {
                if (Option.remove) return _Array2.indexOf(item) == -1;
                else if (Option.find) return _Array2.indexOf(item) != -1;
            });
            return Option.bool ? commonArray.length > 0 : commonArray;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Duplicate_Array', err.message);
    }
};
commonMethods.IsVisibleElm = function(elem) {
    try {
        if (!elem) return false;

        // Resolve element if a string/selector was passed
        let finalEl = elem;
        if (typeof elem === "string") {
            finalEl = document.getElementById(elem) || document.querySelector(elem);
        }
        if (!finalEl) return false;

        // Visibility check
        return !!(
            finalEl.offsetWidth ||
            finalEl.offsetHeight ||
            finalEl.getClientRects().length
        );
    } catch (err) {
        console.warn(err.message);
        if (typeof ErrorLogTrace === 'function') {
            ErrorLogTrace('IsVisibleElm', err.message);
        }
        return false;
    }
};

/**
 * 100% NCR encode/decode for track text in attributes (deleted-content / data-content).
 * Keep letters, digits, space; every other code point is &#N;.
 * Always use setAttribute/getAttribute — never HTML string concat.
 * Keep in sync with tests/unit/show_tracking/trackAttrEscape.js (unit-tested).
 */
commonMethods._ncrFromCodePoint = function(n) {
    if (!isFinite(n) || n < 0 || n > 0x10FFFF) return '';
    if (typeof String.fromCodePoint === 'function') return String.fromCodePoint(n);
    if (n <= 0xFFFF) return String.fromCharCode(n);
    n -= 0x10000;
    return String.fromCharCode(0xD800 + (n >> 10), 0xDC00 + (n & 0x3FF));
};
commonMethods._encodeTrackAttrValueRaw = function(str) {
    return Array.from(String(str), function(ch) {
        var cp = ch.codePointAt(0);
        if ((cp >= 48 && cp <= 57) || (cp >= 65 && cp <= 90) ||
            (cp >= 97 && cp <= 122) || cp === 32) return ch;
        return '&#' + cp + ';';
    }).join('');
};
commonMethods.decodeTrackAttrValue = function(str) {
    if (str == null) return '';
    var s = String(str);
    s = s.replace(/&#x([0-9a-fA-F]+);/g, function(_, h) {
        return commonMethods._ncrFromCodePoint(parseInt(h, 16));
    });
    s = s.replace(/&#(\d+);/g, function(_, n) {
        return commonMethods._ncrFromCodePoint(Number(n));
    });
    return s
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
};
commonMethods.encodeTrackAttrValue = function(str) {
    if (str == null) return '';
    var raw = String(str);
    if (/&#(?:\d+|x[0-9a-fA-F]+);/i.test(raw)) {
        var round = commonMethods._encodeTrackAttrValueRaw(commonMethods.decodeTrackAttrValue(raw));
        if (round === raw) return raw;
    }
    return commonMethods._encodeTrackAttrValueRaw(raw);
};
/**
 * Reject-on-del: stamp action attrs, store NCR-encoded deleted-content (+ data-content backup),
 * clear shell, place restored text as next sibling, detach ice ownership (ice-del/cid).
 * Idempotent: never overwrite a non-empty stored attr with empty textContent (refresh / re-entry).
 */
commonMethods.applyRejectDelUnwrapContent = function(delEl, actionKeys) {
    if (!delEl || delEl.nodeType !== 1) return { del: delEl, textNode: null, raw: '' };
    if ((delEl.tagName || '').toLowerCase() !== 'del') {
        return { del: delEl, textNode: null, raw: '' };
    }
    actionKeys = actionKeys || {};
    Object.keys(actionKeys).forEach(function(name) {
        if (actionKeys[name] == null) return;
        delEl.setAttribute(name, String(actionKeys[name]));
    });

    var existingEnc = delEl.getAttribute('deleted-content') || delEl.getAttribute('data-content') || '';
    var existingRaw = existingEnc
        ? (commonMethods.decodeTrackAttrValue ? commonMethods.decodeTrackAttrValue(existingEnc) : existingEnc)
        : '';
    var raw = delEl.textContent == null ? '' : String(delEl.textContent).replace(/[\u200B\uFEFF]/g, '');
    if (!raw && existingRaw) raw = existingRaw;

    // Do not wipe a previously stored value when the shell is already empty.
    if (raw) {
        var encoded = commonMethods.encodeTrackAttrValue(raw);
        delEl.setAttribute('deleted-content', encoded);
        // data-content survives save/load paths that clear custom deleted-content.
        delEl.setAttribute('data-content', encoded);
    }

    // Detach from ice so reject/cleanup will not unwrap this shell.
    if (delEl.classList) {
        delEl.classList.remove('ice-del');
        Array.from(delEl.classList).forEach(function(cls) {
            if (/^ice-cts/.test(cls)) delEl.classList.remove(cls);
        });
    } else if (delEl.className) {
        delEl.className = String(delEl.className)
            .replace(/\bice-del\b/g, '')
            .replace(/\bice-cts[-\w]*\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    delEl.removeAttribute('data-cid');
    while (delEl.firstChild) delEl.removeChild(delEl.firstChild);

    var textNode = null;
    var next = delEl.nextSibling;
    var nextText = (next && next.nodeType === 3) ? String(next.nodeValue || '') : '';
    if (raw && delEl.parentNode && nextText !== raw) {
        var doc = delEl.ownerDocument || document;
        textNode = doc.createTextNode(raw);
        delEl.parentNode.insertBefore(textNode, delEl.nextSibling);
    } else if (next && next.nodeType === 3) {
        textNode = next;
    }
    return { del: delEl, textNode: textNode, raw: raw };
};

commonMethods.iunWrap = function(element, Option) {
    // ? to remove  https://stackoverflow.com/questions/2409117/how-to-unwrap-text-using-jquery
    /* 
        ? 29_NOV_22 - YA
        ! THIS FUNCTION FOR CUSTOM WRAP METHOD with jQuery Option (replaceWith())
         ? If option.selector present - find children elements and wrapping
        ? RETURN NONE
    */
    try {
        Option = Option ? Option : ({
            selector: false
        });
        let collection = (Option.selector) ? element.querySelectorAll(Option.selector) : [element];
        Array.from(collection).forEach(elm => {
            $(elm).replaceWith(elm.childNodes);
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('iunWrap', err.message);
    }
};
commonMethods.i_closest = function(elm, selector, options) {
    // ? 29_NOV_22 - YA - REMOVE HIGH _SPAN TAGS WITH X_REF_RANGE
    /* 
        ! THIS FUNCTION CUSTOM CLOSEST METHOD with JQuery Methods
        ? IT WILL RETURN TOP PARENT MATCH WITH SELECTOR
        ? If option.remove_child present - find children elements and removed
    */
    try {
        let collection = $(elm).parents(selector);
        while (collection.length > 0) {
            elm = collection[0];
            collection = $(elm).parents(selector);
        }
        if (options.remove_child) {
            elm.querySelectorAll(selector).forEach(el => {
                el.remove();
            });
        }
        return elm;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('i_closest', err.message);
    }
};
commonMethods.removeEl = function(node) {
    try {
        // console.log('COMMENT REMOVED==> ' + node.nodeValue);
        // debug.log(node);
        if (!node) return;
        if (node.parentElement && typeof node.parentElement.removeChild == "function") {
            node.parentElement.removeChild(node);
            // debug.warn("----node removed----");
        } else if (typeof node.remove == "function") {
            node.remove();
            // debug.warn("----node removed----");
        } else {
            $(node).remove();
            // debug.log("----node retain----");
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('removeEl', err.message);
    }
};
commonMethods.REMOVE_CK_BK = function(elm, options = {}) {
    try {
        elm = elm.parentElement ? elm.parentElement : elm;
        Array.from(elm.querySelectorAll('[id^="cke_bm"]')).forEach((el, ind, Arr) => {
            commonMethods.removeEl(el);
            // if (el.parentElement) el.parentElement.removeChild(el);
            // else $(el).remove();
        });
    } catch (err) {
        console.log(err.message);
        ErrorLogTrace('REMOVE_CK_BK', err.message);
    }
};
commonMethods.mapWithGetAttr = function(elm, selector, attrKey, Options = {}) {
    try {
        return Array.from(elm.querySelectorAll(selector)).map((el) => {
            if ((/textContent|text/gi).test(attrKey)) return el.textContent;
            else if (attrKey == "data-del-val" && el.querySelector('insert[data-del-val]'))
                el.querySelector('insert').getAttribute(attrKey);
            else return el.getAttribute(attrKey);
        }).filter(Boolean).unique();
    } catch (err) {
        console.log(err.message);
        ErrorLogTrace('mapWithGetAttr', err.message);
    }
};
// ? https://stackoverflow.com/questions/45069514/check-if-string-ends-with-any-of-multiple-characters
// ? https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
// ? https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
commonMethods.endsWithAny = function(string, Options = {}, suffixes) {
    try {
        // Default suffixes if not provided
        suffixes = suffixes ? (Array.isArray(suffixes) ? suffixes : [suffixes]) : [".", ":", "|", ")"];

        // Remove start prefix if Options.start_remove is true
        if (Options.start_remove) {
            // Add more prefixes if needed
            const prefixes = ["("];
            prefixes.forEach(prefix => {
                if (string.startsWith(prefix)) {
                    string = string.slice(prefix.length);
                }
            });
        }

        // Check if the string ends with any of the specified suffixes
        var reTurn = suffixes.some(function(suffix) {
            var regex_suffix = suffix.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            var regex = new RegExp((regex_suffix + "$"), 'gi');
            return (string.endsWith(suffix) || !!string.match(regex));
        });

        // Remove the suffix if Options.remove is true
        if (Options.remove) {
            return reTurn ? string.slice(0, -1) : string;
        } else {
            return reTurn;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('endsWithAny', err.message);
    }
};
commonMethods.HANDLE_SEPARATOR = function(String, Options) {
    // ? 31_DEC_22 - YA - HANDLE SEPARATOR ADD/REMOVE
    try {
        var nString = String;
        if (Options.separator && !commonMethods.endsWithAny(String, Options)) {
            //? For LWW NSNB in End sepertor by DR
            if (String.endsWith(Options.separator + " ") || String.endsWith(Options.separator + " ")) {
                console.warn("commonMethods.HANDLE_SEPARATOR");
            } else nString = String + Options.separator;
        } else if (!Options.separator) {
            nString = this.endsWithAny(String, {
                remove: true
            });
        }
        return nString;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('HANDLE_SEPARATOR', err.message);
    }
};
commonMethods.IsArray = (t, option) => {
    try {
        if (!option) {
            option = {
                IsEmpty: true
            };
        }
        if (!t || t && t.length == 0) return false;
        let tempArr = Array.isArray(t) ? t : (new Array(t));
        let lengthCheck = option.IsEmpty ? tempArr.length > 0 : true;
        return Array.isArray(tempArr) && lengthCheck;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('IsArray', err.message);
    }
};

function stripHtmlText(html) {
    try {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    } catch (err) {
        ErrorLogTrace('stripHtmlText', err.message);
        console.warn(err.message);
    }
}
commonMethods.Add_leading_zero = function(my) {
    try {
        if (typeof my == 'string') my = parseInt(my);
        if (my < 10) {
            my = "0" + my;
        }
        return my;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Add_leading_zero', err.message);
    }
};
commonMethods.isOverflown = function(element, axis) {
    try {
        element = element[0] ? element[0] : element;
        /* if (element[0] == undefined) {
            element = element;
        } else {
            element = element[0];
        } */
        if (axis == 'x') {
            return element.scrollWidth > element.clientWidth;
        } else if (axis == 'y') {
            return element.scrollHeight > element.clientHeight;
        } else {
            return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
        }
    } catch (err) {
        ErrorLogTrace('isOverflown', err.message);
        console.warn(err.message);
    }
};

commonMethods.getTextWithoutDel = function(node) {
    try {
        if (!node) return "";

        var targetNode = node.$ ? node.$ : node;
        var parent = targetNode.parentNode;

        // If parent is <del>, return empty string
        if (parent && parent.nodeType === 1 && parent.nodeName.toLowerCase() === "del") {
            return "";
        }

        // Otherwise, clone and strip <del> children
        var clone = targetNode.cloneNode(true);
        $(clone).find("del").remove();

        return $(clone).text();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("getTextWithoutDel", err.message);
        return "";
    }
};
commonMethods.hasAttrOrAncestor = function(node, attrs) {

    try {

        if (!node || !attrs || !attrs.length) return false;

        var el = node.$ ? node.$ : node;

        for (var i = 0; i < attrs.length; i++) {

            var attr = attrs[i];

            if (el.hasAttribute && el.hasAttribute(attr)) {
                return true;
            }

            if (el.closest && el.closest("[" + attr + "]")) {
                return true;
            }
        }

        return false;

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('hasAttrOrAncestor', err.message);
        return false;
    }
};

commonMethods.IS_LAST_CHARACTER = function(IMS) {

    try {

        IMS = IMS || IMPACT_SELECTION;

        if (!IMS || !IMS.NODE_CLONE) return false;

        const {
            NODE,
            PARENT
        } = IMS;

        const node = /^(DEL|INSERT)$/i.test(NODE.$.tagName) ?
            PARENT.$ :
            NODE.$;

        const text = commonMethods
            .getTextWithoutDel(node)
            .replace(CKEDITOR.dom.selection.FILLING_CHAR_SEQUENCE || "", "")
            .trim();

        debug.log("Filtered text:", text);

        return text.length <= 1;

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("IS_LAST_CHARACTER", err.message);
        return false;
    }

};

commonMethods.hasClassPartial = function(list, cls) {
    for (var i = 0; i < list.length; i++) {
        if (list[i].indexOf(cls) !== -1) return true;
    }
    return false;
};
commonMethods.htmlToFragment = function(string) {
    try {
        // Preferred modern way: Fast and preserves script execution context
        if (window.Range && Range.prototype.createContextualFragment) {
            return document.createRange().createContextualFragment(string);
        }

        // Robust fallback: <template> handles all HTML tags (even <tr>/<td>) correctly
        const temp = document.createElement('template');
        temp.innerHTML = string;
        return temp.content;

    } catch (err) {
        console.warn('htmlToFragment error:', err.message);
        if (typeof ErrorLogTrace === 'function') ErrorLogTrace('htmlToFragment', err.message);

        // jQuery fallback as a last resort
        return $('<template>').html(string).prop('content');
    }
};


commonMethods.getArrayExtremes = function(array, options = {}) {
    try {
        const {
            // Default to true if not provided
            excludeDeleted = true,
                exportDeleted = false,
                excludeDataName = [],
                findDataName = []
        } = options;

        const deleted = [];
        const filteredArr = Array.from(array).filter(el => {
            if (!el || typeof el.getAttribute !== 'function') return false;

            const isDeleted = el.hasAttribute('data-delete') || el.hasAttribute('data-remove');
            const dataName = el.getAttribute('data-name');

            // Collect deleted items if requested
            if (exportDeleted && isDeleted) deleted.push(el);

            // Filter logic
            if (excludeDeleted && isDeleted) return false;
            if (excludeDataName.length && excludeDataName.includes(dataName)) return false;
            if (findDataName.length && !findDataName.includes(dataName)) return false;

            return true;
        });

        const len = filteredArr.length;

        return {
            first: filteredArr[0] || null,
            last: filteredArr[len - 1] || null,
            lastBefore: len > 1 ? filteredArr[len - 2] : null,
            deleted
        };
    } catch (err) {
        ErrorLogTrace("getArrayExtremes", err.message);
        return {
            first: null,
            last: null,
            lastBefore: null,
            deleted: []
        };
    }
};

/**
 * Convert all <div> elements to <span> elements
 * while preserving attributes and inner content.
 */
commonMethods.convertDivsToSpans = function(node, option = {}) {
    try {
        const divs = Array.from(node.querySelectorAll("div")).reverse();

        divs.forEach(div => {
            const span = document.createElement("span");

            // Copy attributes
            [...div.attributes].forEach(attr => {
                span.setAttribute(attr.name, attr.value);
            });

            // Move inner content
            span.innerHTML = div.innerHTML;

            // Replace in DOM
            div.parentNode.replaceChild(span, div);
        });
    } catch (err) {
        ErrorLogTrace("convertDivsToSpans", err.message);
    }

};


// Helper Function
commonMethods.getAscent = function(element, selectors, dataNameList = []) {
    try {
        if (!element || !selectors) return null;

        // Convert selectors to an array if it's a string
        const selectorList = typeof selectors === 'string' ? selectors.split(',').map(s => s.trim()) : selectors;

        if (!Array.isArray(selectorList) || selectorList.length === 0) return null;

        // Helper to match a single selector
        const matchSelector = (el, selector) => {
            if (selector.startsWith('#')) {
                // Match ID
                return el.id === selector.slice(1);
            } else if (selector.startsWith('.')) {
                // Match class
                return el.classList.contains(selector.slice(1));
            } else if (selector.startsWith('[')) {
                // Match attribute and value
                const attrMatch = selector.match(/^\[(.+?)(?:=(.+))?\]$/);
                if (attrMatch) {
                    const [_, attr, value] = attrMatch;
                    return value ? el.getAttribute(attr) === value : dataNameList.includes(el.getAttribute(attr));
                }
            }
            return false;
        };

        if (dataNameList.includes(element.getAttribute('data-name'))) {
            return element;
        }

        // Convert dataNameList to attribute-based selectors
        if (Array.isArray(dataNameList) && ['insert', 'span', 'a'].includes(element.getName()) && !(/p|td|tr/gi.test(element.getAttribute("class")))) {
            try {
                var findSelector = dataNameList.map(dataName => `[data-name="${dataName}"]`);
                var result = element.findOne(findSelector.join(","));
                if (result) return result;
            } catch (err) {
                console.warn(err.message);
                // return null;
            }
        }

        // Use CKEditor’s built-in getAscendant if available
        if (typeof element.getAscendant === 'function') {
            try {
                return element.getAscendant((el) => {
                    if (typeof el.getAttribute != "function") return null;
                    var val = el.getAttribute('data-name');
                    // if (val == "contrib") debugger;
                    return dataNameList.includes(val);
                });
            } catch (err) {
                console.warn(err.message);
                return null;
            }

        } else {
            // Traverse DOM hierarchy manually
            let current = element;
            while (current) {
                for (const selector of selectorList) {
                    if (matchSelector(current, selector)) {
                        const dataName = current.getAttribute('data-name');
                        if (dataNameList.includes(dataName)) {
                            return {
                                element: current,
                                dataName
                                // Return matching element and its data-name
                            };
                        }
                    }
                }
                current = current.parentElement;
                if (['front', 'body', 'back'].includes(current.dataset.name)) break;
            }
        }

        return null;
    } catch (err) {
        console.warn(err.message);
        return null;
    }
};


var GET_CONFIG_ITEM = function(findSelector, options = {}) {
    /* 
        ! THIS FUNCTION FIND AND MANIPULATE  VALUES FROM CONFIGURATION FILES
            ? IF ONLY COMES #KEY- PARAMETER - IT WILL FIND/QUERY_SELECTOR AT CONFIG - RETURN VALUE BE STRING/NODE
            ? IF ANOTHER PARAMETER HAVE A TWO OPTIONS - RETURN VALUE BE JSON FORMAT
                ? OPTION 1# : @CONVERT_JSON | @attr - AFTER FETCHING NOTE FROM CONFIG - IT WILL CONVERT AS JSON WITH SAME NODE ATTRIBUTES KWY/VALUES
                ? OPTION 2# :  - @children IT WILL CONVERT ALL CHILD-NODES ATTRIBUTES SAME RETURN OBJECT 
    */
    try {
        let {
            journalBased,
            CONVERT_JSON
        } = options;

        const CONFIG = journalBased && journalBased ? J_CONFIG : I_CONFIG;

        const ATT_SET = function(el, attrOptions = {}, target = {}) {
            try {
                if (!el || !el.attributes) return target;

                Array.from(el.attributes).forEach(function(attr) {

                    const shouldConvert =
                        attrOptions.hex2string ||
                        (attrOptions[attr.name] && attrOptions[attr.name].hex2string);

                    target[attr.name] = shouldConvert ?
                        commonMethods.hex2a(attr.value) :
                        attr.value;
                });

                return target;

            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('ATT_SET', err.message);
            }
        };

        let VALUE = (typeof findSelector === "string") ? CONFIG.querySelector(findSelector) : findSelector;

        // Journal fallback
        var config = J_CONFIG ? J_CONFIG : I_CONFIG.querySelector(`[short="${SHORT_II_TITLE}"]`);
        if (!VALUE && config) {
            VALUE = config.querySelector(findSelector);
        }

        // Direct node return
        if (!CONVERT_JSON) {
            return VALUE;
        }

        let RETURN_OB = {};

        // Current node attributes
        if (options.attr && VALUE) {
            ATT_SET(VALUE, options, RETURN_OB);
        }

        // Children processing
        if (options.children && VALUE) {

            const elements = options.hierarchy ?
                Array.from(VALUE.children) :
                Array.from(VALUE.querySelectorAll("*"));

            const processHierarchy = function(nodes, parentStore = RETURN_OB) {

                nodes.forEach(function(el) {

                    let key = el.hasAttribute("dataKey") ? el.getAttribute("dataKey") : el.tagName;

                    if (options.keyUpperCase) {
                        key = key.toUpperCase();
                    }

                    const obj = ATT_SET(el, options, {});

                    parentStore[key] = obj;

                    if (options.hierarchy && el.children.length) {
                        processHierarchy(Array.from(el.children), parentStore[key]);
                    }
                });
            };

            processHierarchy(elements);
        }

        return RETURN_OB;

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('GET_CONFIG_ITEM', err.message);
    }
};


// ? OUP_J_QUR_029 - Wind 10_Safari 11.1 - YA 16_NOV_22
// ?Mantis_ID 1798594: File size increased by DR_Author survey comments 30 to 100

var VALIDATE_UPLOAD_FILE = function(file, Options, _) {
    /*
        ! COMMON VALIDATION FUNCTION FOR ANY FILE UPLOADS
        ? Validates:
            - File size against limit
            - File extension format
            - File extension against a list of restricted extensions
        ? Returns JSON with boolean values and metadata:
            {
                size: 25,
                name: "Sample.png",
                ValidSize: true,
                ValidFormat: true,
                ValidExt: true,
                VALID: true
            }
    */
    try {
        Options = Options || {
            // in MB
            limit: 100,
            show_alert: false
        };

        let RESTRICTED_EXT = commonMethods.invalidExtensions;
        let File_Size = Math.round(file.size / (1024 * 1024));
        let IsValidSize = File_Size <= Options.limit;
        let IsValidFormat = file.name.lastIndexOf('.') > -1;
        let IsValidExt = !RESTRICTED_EXT.exec(file.name);

        // Show alert if any validation fails
        if (Options.show_alert && !(IsValidFormat && IsValidSize && IsValidExt)) {
            let alert_key = '';
            let alertObj = {};

            if (!IsValidFormat || !IsValidExt) {
                alert_key = 'Upload_Invalid_Err';
            } else {
                alert_key = 'Single_Upload_Size_Err';
                let default_size = 100;
                if (File_Size !== default_size) {
                    alertObj.find = default_size;
                    alertObj.replace = Options.limit;
                    alertObj.force = true;
                }
            }

            AlertNewDialog.fire('warning', 'Warning', alert_key, 'OK', '', false, alertObj);
        }

        return {
            size: File_Size,
            name: file.name,
            ValidSize: IsValidSize,
            ValidFormat: IsValidFormat,
            ValidExt: IsValidExt,
            VALID: IsValidFormat && IsValidSize && IsValidExt
        };
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('VALIDATE_UPLOAD_FILE', err.message);

        // Return fallback object on error
        return {
            size: 0,
            name: file && file.name ? file.name : '',
            ValidSize: false,
            ValidFormat: false,
            ValidExt: false,
            VALID: false
        };
    }
};



// ! 13_JAN_2023 - YA - AFTER FILE UPLOAD - FILE NAME TRUNCATE BASED DISPLAY ELEMENT WIDTH
// ! https://js-spb7qb.stackblitz.io
var trimFileName = {
    Middle_Substring: function(file_name) {
        let file_len = file_name.length;
        let half_len = Math.round(file_len / 2);
        if (file_name.indexOf('...') > 0) {
            file_name = file_name.replace('...', '');
        }
        let [split, temp_split] = [file_name.split(''), file_name.split('')];
        split.splice(half_len, 1);
        temp_split.splice(half_len, 1, '...');
        return {
            temp_name: temp_split.join(''),
            file_name: split.join(''),
        };
    },
    updateFileName: function(fileInputEl, sFilename, Options = {
        query_panel: false
    }) {
        try {
            Array.from(Array.isArray(fileInputEl) ? fileInputEl : [fileInputEl]).forEach((el, idx, arr) => {
                try {
                    var node = el;
                    if (Options.query_panel) {
                        // sFilename = el.getAttribute("title");
                        // el.textContent = sFilename;
                        // node = el.parentElement;
                    }
                    if (!sFilename || !commonMethods.isEllipsisActive(node)) {
                        return;
                    }
                    if (sFilename.indexOf("\\")) {
                        var split = sFilename.split('\\');
                        sFilename = split[split.length - 1];
                    }
                    var [while_loop, final_name, file_split, temp_split] = [1, sFilename,
                        sFilename.split('.'),
                        sFilename.split('.')
                    ];
                    var [file_name, ext] = [
                        temp_split.slice(0, -1).join('.'),
                        file_split[file_split.length - 1]
                    ];
                    el.textContent = final_name;
                    while (commonMethods.isEllipsisActive(node) && file_name.length > 1) {
                        while_loop++;
                        var temp_name = file_name;
                        if (false) {
                            // ! method 2
                            // ? ellipse will add middle file name (without extension) of the string
                            let method_2 = this.Middle_Substring(file_name);
                            file_name = method_2.file_name;
                            temp_name = method_2.temp_name;
                        } else {
                            // ! method 1 
                            // ? ellipse will add end file name (without extension) of the string
                            file_name = file_name.substring(0, file_name.length - 1);
                            temp_name = file_name + '...';
                        }
                        // debug.log([temp_name, idx, while_loop])
                        el.textContent = temp_name + '.' + ext;
                        if (while_loop > 150) {
                            console.log('break');
                            break;
                        }
                    }
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('forEachTrim', err.message + el.textContent + '_' + el.id);
                }
            });
        } catch (err) {
            console.log(err.message);
            ErrorLogTrace('trimFileName', err.message + '_' + sFilename);
        } finally {}
    }
};