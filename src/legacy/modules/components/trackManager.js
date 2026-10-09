class trackManager {

    constructor(editor, options = {}) {
        this.editor = editor ? editor : GlobalEditor;
        this._initTrackerOnce();
    }
    _initTrackerOnce() {
        try {
            if (!this._tracker) {
                let liteInstance = null;

                // Check if Trackchangeapi is defined AND valid
                if (typeof Trackchangeapi !== 'undefined' && Trackchangeapi && Object.keys(Trackchangeapi).length > 0) {
                    liteInstance = Trackchangeapi;
                } else if (this.editor && this.editor.plugins && this.editor.plugins.lite && typeof this.editor.plugins.lite.findPlugin === 'function') {
                    // Fallback to plugin search
                    liteInstance = this.editor.plugins.lite.findPlugin(this.editor);
                }
                this.lite = liteInstance;
                this._tracker = liteInstance && liteInstance._tracker ? liteInstance._tracker : null;
            }

        } catch (err) {
            this.errorLog(err, "_initTrackerOnce");
        }
    }
    /**
     * Create a DOM fragment from HTML string (suffix/append content)
     * @param {string} htmlString - HTML content to append
     * @returns {DocumentFragment|null} Fragment or null if invalid
     */
    _createAppendFragment(htmlString) {
        if (!htmlString || typeof htmlString !== 'string') return null;
        try {
            return document.createRange().createContextualFragment(htmlString.trim());
        } catch (err) {
            this.errorLog(err, "_createAppendFragment");
            return null;
        }
    }

    /**
     * Create a DOM fragment from HTML string (prefix/prepend content)
     * @param {string} htmlString - HTML content to prepend
     * @returns {DocumentFragment|null} Fragment or null if invalid
     */
    _createPrependFragment(htmlString) {
        return this._createAppendFragment(htmlString);
    }

    /**
     * Apply fragment insertions to mark node (both prefix and suffix)
     * @param {Element} markNode - Target tracking node
     * @param {DocumentFragment} prependFragment - Content to prepend
     * @param {DocumentFragment} appendFragment - Content to append
     */
    _applyFragmentInsertions(markNode, prependFragment, appendFragment) {
        if (prependFragment) {
            markNode.prepend(prependFragment.cloneNode(true));
        }
        if (appendFragment) {
            markNode.append(appendFragment.cloneNode(true));
        }
    }

    /**
     * Handle text replacement in child nodes
     * @param {Element} node - Target node
     * @param {string} replaceText - Text to set
     */
    _replaceNodeText(node, replaceText) {
        if (!replaceText) return;
        node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                child.textContent = replaceText;
            }
        });
    }

    /**
     * Get tracking node with enhanced prefix/suffix insertion support
     * @param {string} type - Tracking type ('insertType' or 'deleteType')
     * @param {Element} node - Optional target node
     * @param {Object} option - Configuration options
     * @param {boolean} option.childOnly - Wrap node's children in mark
     * @param {boolean} option.nodeOnly - Wrap the node itself in mark
     * @param {boolean} option.appendOnly - Append mark to node
     * @param {boolean} option.beforeOnly - Insert mark before node
     * @param {Object} option.setAttrParams - Attributes to set on mark node
     * @param {boolean} option.returnAttrOnly - Return only attributes (no DOM)
     * @param {string} option.replaceText - Replace text in node
     * @param {string} option.appendInsfragString - HTML to append (suffix)
     * @param {string} option.prependInsfragString - HTML to prepend (prefix)
     * @returns {Element|Object|null} Mark node or attributes
     */
    /* 
 
           ? Example 1: returnAttrOnly: true
            Input:
            const attrs = trackManager.getTrackingNode('insertType', null, {
                returnAttrOnly: true
            });
            Output:

            {
                'class': 'ins cts-1',
                'data-changedata': '',
                'data-cid': '123',
                'data-time': '1751353200000',
                'data-userid': 'user123',
                'data-username': 'John Doe'
            }
            ? Example 2: childOnly: true
            Input:

            * HTML before: <p>Hello <b>world</b></p>
            const pElement = document.querySelector('p');
            const markNode = trackManager.getTrackingNode('insertType', pElement, {
                childOnly: true
            });
            Output HTML:

            <p>
            <insert class="ins cts-1" data-cid="123" data-userid="user123">
                Hello <b>world</b>
            </insert>
            </p>
            ? Example 3: nodeOnly: true with replaceText
            Input:

            * HTML before: <span>old text</span>
            const spanElement = document.querySelector('span');
            const markNode = trackManager.getTrackingNode('insertType', spanElement, {
                nodeOnly: true,
                replaceText: 'new text'
            });
            Output HTML:

            <span>new text</span>
            <<insert class="ins cts-1" data-cid="123" data-userid="user123">
            <span>new text</span>
            </insert>
            
            ? Example 4: appendOnly: true
            Input:
            * HTML before: <div>Content</div>
            const divElement = document.querySelector('div');
            const markNode = trackManager.getTrackingNode('insertType', divElement, {
                appendOnly: true
            });
            Output HTML:

            <div>
            Content
            <insert class="ins cts-1" data-cid="123" data-userid="user123"></insert>
            </div>
            ? Example 5: beforeOnly: true
            Input:

            * HTML before: <p>Paragraph</p>
            const pElement = document.querySelector('p');
            const markNode = trackManager.getTrackingNode('insertType', pElement, {
                beforeOnly: true
            });
            Output HTML:

            <<insert class="ins cts-1" data-cid="123" data-userid="user123"></insert>
            <p>Paragraph</p>
            
            ? Example 6: appendInsfragString + prependInsfragString
            Input:

            const markNode = trackManager.getTrackingNode('insertType', null, {
                prependInsfragString: '<span class="prefix">[</span>',
                appendInsfragString: '<span class="suffix">]</span>'
            });
            Output HTML:

            <<insert class="ins cts-1" data-cid="123" data-userid="user123">
            <span class="prefix">[</span>
            <span class="suffix">]</span>
            </insert>


            ? Example 7: setAttrParams (custom attributes)
            Input: const markNode = trackManager.getTrackingNode('insertType', null, {
                setAttrParams: {
                    'data-custom': 'value123',
                    'id': 'my-insert'
                }
            });
            Output HTML:
            <insert class="ins cts-1" data-cid="123" data-userid="user123" data-custom="value123" id="my-insert">
            </insert>
        
        
        */

    getTrackingNode(type, node, option = {}) {
        try {
            // Destructure configuration with new prependInsfragString support
            const {
                childOnly = false,
                    nodeOnly = false,
                    appendOnly = false,
                    prependOnly = false,
                    beforeOnly = false,
                    setAttrParams = {},
                    returnAttrOnly = false,
                    replaceText = null,
                    appendInsfragString = null,
                    prependInsfragString = null
            } = option;

            this._initTrackerOnce();

            // Create both prefix and suffix fragments
            const prependFragment = this._createPrependFragment(prependInsfragString);
            const appendFragment = this._createAppendFragment(appendInsfragString);

            // Create the tracking mark node
            const markNode = this._tracker._createIceNode(type, null);

            // Apply attributes if specified
            if (Object.keys(setAttrParams).length > 0) {
                // normalize trackCode into data-track-code
                if (setAttrParams.trackCode) {
                    setAttrParams['data-track-code'] = setAttrParams.trackCode;
                    delete setAttrParams.trackCode;
                }
                commonMethods.setAttr(markNode, setAttrParams);
            }

            // Early return if only attributes requested
            if (returnAttrOnly) {
                return commonMethods.GET_ATTR(markNode);
            }

            // If no target node, apply fragments and return mark
            if (!node) {
                this._applyFragmentInsertions(markNode, prependFragment, appendFragment);
                return markNode;
            }

            // Handle different insertion modes
            if (childOnly) {
                this._replaceNodeText(node, replaceText);
                markNode.append(...node.childNodes);
                this._applyFragmentInsertions(markNode, prependFragment, appendFragment);
                node.append(markNode);
            } else if (nodeOnly) {
                if (replaceText) node.textContent = replaceText;
                this._applyFragmentInsertions(markNode, prependFragment, appendFragment);
                node.after(markNode);
                markNode.append(node);
            } else if (appendOnly || prependOnly) {
                this._applyFragmentInsertions(markNode, prependFragment, appendFragment);
                node[prependOnly ? 'prepend' : 'append'](markNode);
            } else if (beforeOnly) {
                this._applyFragmentInsertions(markNode, prependFragment, appendFragment);
                node.before(markNode);
            }

            return markNode;
        } catch (err) {
            this.errorLog(err, "getTrackingNode");
            return null;
        }
    }

    updateAttributesOnly(element, addAttributes = {}, exclude = []) {
        try {
            // Base attributes
            const baseAttributes = this.getAttributesOnly();

            // Merge base + additional
            let finalAttributes = Object.assign({}, baseAttributes, addAttributes);

            // Remove excluded keys
            exclude.forEach(key => {
                if (finalAttributes.hasOwnProperty(key)) {
                    delete finalAttributes[key];
                }
            });

            // Normalize element reference
            element = element || element.$ || element[0] || element;

            // Apply attributes
            $(element).attr(finalAttributes);

            debug.log("Applied attributes:", finalAttributes);
        } catch (err) {
            console.error("updateAttributesOnly error:", err);
        }
    }


    getAttributesOnly(options = {}) {
        this._initTrackerOnce();
        const markNode = this._tracker._createIceNode('insertType', null);
        const attributes = commonMethods.GET_ATTR(markNode);

        const exclude = ['class', 'data-changedata', 'data-cid'];

        const filteredAttributes = Object.fromEntries(
            Object.entries(attributes).filter(([key]) =>
                key.startsWith('data-') && !exclude.includes(key)
            )
        );

        return filteredAttributes;
    }

    /**
     * Handle label item creation/update with change tracking
     * @param {Element|string} markNode - Tracking node or type ('insert'/'delete')
     * @param {Element} node - Node to wrap/modify with label
     * @param {string} newText - New text content for the item
     * @param {string} delText - Previous deleted text for tracking
     * @param {Object} options - Additional processing options
     * @param {boolean} options.reorder - Whether this is a reorder operation
     * @param {string} options.type - Operation type (e.g., 'reorder')
     * @returns {Element|string|null} Processed result node or text
     */
    handlingLabelItems(markNode, node, newText, delText, options = {}) {
        try {
            // Resolve tracking node if string type is provided
            if (typeof markNode == "string") {
                const methodName = markNode == "insert" ? "getInsNode" : "getDelNode";
                markNode = window._trackManager[methodName](null, {});
            }

            var tagName = node.tagName;
            var parent = node.parentElement;
            var parentTagName = parent.tagName;
            var returnItem;

            if (!/insert/gi.test(parentTagName)) {
                var tChild = $(node).children();

                if (tChild.length > 0) {
                    // Process child elements for Books Notes Renumbering
                    for (let i = 0; i < tChild.length; i++) {
                        let el = tChild[i];
                        const _IsCheck = ['SUP', 'SPAN'].includes(el.tagName);

                        if (_IsCheck) {
                            const Attr = el.parentElement.getAttribute(
                                (el.tagName == 'SUP') ? 'ref-type' : 'fn-type'
                            );

                            if (['endnote', 'footnote', 'table-fn', 'fn'].includes(Attr) && el.firstElementChild) {
                                el = el.firstElementChild;
                            }
                        }

                        const tag = el.tagName;

                        if (tag == 'INSERT') {
                            // Restore deleted text from data attribute if available
                            delText = el.hasAttribute('data-del-val') ?
                                el.getAttribute('data-del-val') :
                                delText;

                            if (delText != newText) {
                                returnItem = $(markNode).attr({
                                    'data-del-val': delText
                                }).text(newText);
                            } else {
                                returnItem = newText;
                            }
                        } else if (!IS_JOURNAL && _IsCheck || IS_JOURNAL) {
                            returnItem = $(markNode).attr({
                                'data-del-val': delText
                            }).text(newText);
                        }
                    }
                } else {
                    // No child elements - handle directly
                    returnItem = $(markNode).attr({
                        'data-del-val': delText
                    }).text(newText);

                    if (/insert/gi.test(parentTagName)) {
                        returnItem = markNode;
                    }

                    // Add tracking for auto-renumbering (SIVA - 14_APR_2023)
                    if (options.reorder || options.type) {
                        $(markNode).attr("data-auto-insert", options.type ? options.type : "reorder");
                    }
                }
            } else {
                returnItem = newText;
            }

            // Convert jQuery object to DOM element if needed
            if (returnItem instanceof jQuery) {
                return returnItem[0];
            }

            // Return DOM element or text as appropriate
            if (returnItem instanceof Element) {
                return returnItem;
            }

            return returnItem;
        } catch (err) {
            this.errorLog(err, "handlingLabelItems");
            return null;
        }
    }

    /**
     * Get deletion tracking node with optional prefix/suffix content
     * @param {Element} node - Target node to wrap or modify
     * @param {Object} option - Configuration with prependInsfragString and appendInsfragString support
     * @returns {Element} Deletion tracking node
     */
    getDelNode(node, option = {}) {
        try {
            return this.getTrackingNode("deleteType", node, option);
        } catch (err) {
            this.errorLog(err, "getDelNode");
            return null;
        }
    }

    /**
     * Get insertion tracking node with optional prefix/suffix content
     * @param {Element} node - Target node to wrap or modify
     * @param {Object} option - Configuration with prependInsfragString and appendInsfragString support
     * @returns {Element} Insertion tracking node
     */
    getInsNode(node, option = {}) {
        try {
            return this.getTrackingNode("insertType", node, option);
        } catch (err) {
            this.errorLog(err, "getInsNode");
            return null;
        }
    }

    errorLog(err, fun_name) {
        debug.log(fun_name, err);
        ErrorLogTrace(fun_name, err.message);
    }

}