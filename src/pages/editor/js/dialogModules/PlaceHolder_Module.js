function HandleBookskwdGroupDelimeter(editor) {
    if (editor) {
        editor.document.find('.kwd-group .delimt').toArray().forEach((delim) => {
            if (typeof delim.remove == "function") {
                delim.remove();
            }
        });
    }
}
const abstractConfig = {
    commands: [{
            name: 'ABS_UNSTRUCTURE',
            label: "Unstructure Abstract",
            command: 'ABS_UNSTRUCTURE',
            group: 'AbstractGroup',
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            order: 81
        },
        {
            name: 'ABS_RESTRUCTURE',
            label: "Re-structure Abstract",
            command: 'ABS_RESTRUCTURE',
            group: 'AbstractGroup',
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            order: 82
        },
        {
            name: 'SHOW_ABS_COUNT',
            label: "Show Abstract Count",
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            command: 'SHOW_ABS_COUNT',
            group: 'AbstractGroup',
            order: 83
        },
        {
            name: 'PREV_MERGE_PARA',
            label: "Merge with Previous Abstract Paragraph",
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            command: 'PREV_MERGE_PARA',
            group: 'AbstractGroup',
            order: 84
        }
    ],
    executeCommand: function(editor, item, moduleConfig, params) {

        try {

            var action = item.command;
            var elementPath = params.elementPath;
            var moduleId = moduleConfig.id || moduleConfig.name;
            var instance = window[moduleId];

            IMPACT_SELECTION._SNAPSHOT({
                lock: true,
                save: true
            });

            if (action == "ABS_UNSTRUCTURE" || action == "ABS_RESTRUCTURE") {

                instance.structureManipulation(action, elementPath);

            } else if (action == "SHOW_ABS_COUNT") {

                AbstractWordCounter && AbstractWordCounter.showLoop();

            } else if (action == "PREV_MERGE_PARA") {

                instance.mergeWithPreviousParagraph(elementPath);

            }

            IMPACT_SELECTION._SNAPSHOT({
                unlock: true,
                save: true
            });

        } catch (err) {

            console.warn(err.message);

            if (typeof ErrorLogTrace === "function") {
                ErrorLogTrace('executeCommand', err.message);
            }
        }
    },
    contextMenuHandler: function(element, selection, elementPath, editor) {

        var MenuReturn = {};
        var IMS = IMPACT_SELECTION;
        var IKEY = iKEY_EVENT_HANDLING;

        try {

            // if (IS_LOCAL_HOST) debugger;

            var instance = window.AbstractModule;

            if (instance && !instance.initiated) {
                instance.Init();
                debug.warn("AbstractModule not fully loaded in contextMenuHandler");
            }

            if (!instance || !instance.initiated) {
                return MenuReturn;
            }

            var {
                absRoot,
                sections,
                paraIndex,
                mergeTitle,
                forceMerge,
                isAbsSection
            } = instance.getRootElement(elementPath);


            if (!absRoot || !isAbsSection) return MenuReturn;

            var showUnStructure = sections && sections.length > 0;

            /* if (absRoot.hasAttribute("data-de-str")) {
                MenuReturn.ABS_RESTRUCTURE = CKEDITOR.TRISTATE_OFF;
            } else if (showUnStructure) {
                MenuReturn.ABS_UNSTRUCTURE = CKEDITOR.TRISTATE_OFF;
            } */

            if (instance.showCountDialog) {
                MenuReturn.SHOW_ABS_COUNT = CKEDITOR.TRISTATE_OFF;
            }

            // Enable merge with previous paragraph
            if (paraIndex > 0 || (mergeTitle && forceMerge)) {
                MenuReturn.PREV_MERGE_PARA = CKEDITOR.TRISTATE_OFF;
            }

            debug.log("abs-contextMenuHandler-return", MenuReturn);
            return MenuReturn;

        } catch (err) {

            console.warn(err.message);

            if (typeof ErrorLogTrace === "function") {
                ErrorLogTrace("contextMenuHandler", err.message);
            }

            return MenuReturn;
        }
    }
};
const kwdConfig = {
    commands: [{
            name: 'KEYWORDS_ADD',
            label: "Add Keyword",
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            command: 'KEYWORDS_ADD',
            group: 'KeywordsGroup',
            order: 91
        },
        {
            name: 'KEYWORDS_LEFT_MOVE',
            label: "Move Left",
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            command: 'KEYWORDS_LEFT_MOVE',
            group: 'KeywordsGroup',
            order: 92
        },
        {
            name: 'KEYWORDS_RIGHT_MOVE',
            label: "Move Right",
            icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
            command: 'KEYWORDS_RIGHT_MOVE',
            group: 'KeywordsGroup',
            order: 93
        },
        {
            name: 'KEYWORDS_DELETE',
            label: "Delete Keyword",
            icon: '../assets/images/svg/ContextMenu/Delete.svg',
            command: 'KEYWORDS_DELETE',
            group: 'KeywordsGroup',
            order: 94
        }
    ],
    // Common utility for keyword group operations
    _kwdGroupUtils: function(elementPath, options) {
        if (!options) options = {};

        var elements = elementPath.elements || [];

        var target = null;
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            if (el.hasAttribute &&
                el.getAttribute('data-name') === 'kwd' &&
                !el.hasAttribute('data-remove') &&
                !el.hasAttribute('data-delete')) {
                target = el;
                break;
            }
        }

        var actionNodeGroup = null;
        for (var j = 0; j < elements.length; j++) {
            var groupEl = elements[j];
            if (groupEl.hasAttribute && groupEl.getAttribute('data-name') === 'kwd-group') {
                actionNodeGroup = groupEl;
                break;
            }
        }

        if (!actionNodeGroup) return {};

        var divGroupClone = actionNodeGroup.$.cloneNode(true);

        var delimts = divGroupClone.querySelectorAll('.delimt');
        for (var k = 0; k < delimts.length; k++) {
            delimts[k].parentNode.removeChild(delimts[k]);
        }

        var listOfItems = divGroupClone.querySelectorAll('[data-name="kwd"]');
        var extremes = commonMethods.getArrayExtremes(listOfItems, options);

        var first = extremes.first;
        var last = extremes.last;

        var isFirst = commonMethods.compareElementsByOuterHTML(target, first);
        var isLast = commonMethods.compareElementsByOuterHTML(target, last);
        var IsNewItem = target && target.hasAttribute('data-new');

        var actionClone = null;
        var nodeId = null;

        if (target) {
            var targetNode = target.$ || target;
            var targetDataId = targetNode.getAttribute && targetNode.getAttribute('data-id');
            var targetId = targetNode.id || target.id || (target.$ && target.$.id);
            nodeId = IsNewItem ? (targetDataId || targetId) : (targetId || targetDataId);
        }

        if (nodeId) {
            // Note: CSS.escape requires a polyfill in older IE versions
            actionClone = divGroupClone.querySelector('[id="' + nodeId + '"], [data-id="' + nodeId + '"]');
        } else if (target) {
            var clonedKwds = Array.prototype.slice.call(divGroupClone.querySelectorAll('[data-name="kwd"]'));
            var targetHTML = target.outerHTML || (target.$ && target.$.outerHTML);

            for (var m = 0; m < clonedKwds.length; m++) {
                var itemHTML = clonedKwds[m].outerHTML || (clonedKwds[m].$ && clonedKwds[m].$.outerHTML);
                if (itemHTML === targetHTML) {
                    actionClone = clonedKwds[m];
                    break;
                }
            }
        }

        return {
            actionNode: target,
            actionNodeGroup: actionNodeGroup,
            divGroupClone: divGroupClone,
            listOfItems: listOfItems,
            last: last,
            first: first,
            isFirst: isFirst,
            isLast: isLast,
            IsNewItem: IsNewItem,
            actionClone: actionClone
        };
    },
    executeCommand: function(editor, item, moduleConfig, params) {
        try {
            var action = item.command;
            var elementPath = params.elementPath;
            var moduleId = moduleConfig.id || moduleConfig.name;
            var instance = window[moduleId];

            IMPACT_SELECTION._SNAPSHOT({
                lock: true,
                save: true
            });

            var utils = kwdConfig._kwdGroupUtils(elementPath);
            var {
                actionNodeGroup,
                divGroupClone,
                actionClone,
                IsNewItem,
                actionNode
            } = utils;

            if (!actionNodeGroup || !actionClone) return;

            $(divGroupClone).find('.active').removeClass('active');

            var targetId = actionClone.getAttribute('data-id');
            if (!targetId) {
                // Generate a unique ID: prefix + random number
                targetId = "kwd_" + Math.floor(Math.random() * 10000);
                // Assign it back to the clone (handle both native and CKEditor wrapper cases)
                if (!actionClone.hasAttribute('data-id')) {
                    actionClone.setAttribute('data-id', targetId);
                }
            }


            if (action === "KEYWORDS_ADD") {
                var newItem = instance.newItem();
                divGroupClone.appendChild(newItem);
                var allItems = Array.prototype.slice.call(divGroupClone.querySelectorAll(instance.selector.ROOT));
                var newElem = allItems.pop();
                targetId = newElem.getAttribute('data-id');
            } else if (action === "KEYWORDS_LEFT_MOVE" || action === "KEYWORDS_RIGHT_MOVE") {
                var sibling = (action === "KEYWORDS_LEFT_MOVE") ? actionClone.previousElementSibling : actionClone.nextElementSibling;
                if (sibling) {
                    if (action === "KEYWORDS_LEFT_MOVE") {
                        actionClone.parentNode.insertBefore(actionClone, sibling);
                    } else {
                        actionClone.parentNode.insertBefore(actionClone, sibling.nextElementSibling);
                    }
                }
            } else if (action === "KEYWORDS_DELETE") {
                if (IsNewItem) {
                    actionClone.parentNode.removeChild(actionClone);
                } else {
                    actionClone.setAttribute('data-delete', 'true');
                    window._trackManager.getDelNode(actionClone, {
                        childOnly: true
                    });
                    if (actionClone.querySelector("del > del")) {
                        const innerDel = actionClone.querySelector("del > del");
                        // unwrap: move all children of innerDel before it
                        while (innerDel.firstChild) {
                            innerDel.parentNode.insertBefore(innerDel.firstChild, innerDel);
                        }
                        // remove the now-empty inner <del>
                        innerDel.remove();
                    }
                }
            }
            if (IS_JOURNAL) {
                instance.revertInsertDelimiters(divGroupClone);
            } else {
                // will be display through css
            }

            instance.TC_MSG(action, actionClone, actionNodeGroup, divGroupClone);


            var realGroupNode = actionNodeGroup.$ || actionNodeGroup;
            IMPACT_SELECTION._SNAPSHOT({
                unlock: true,
                save: true
            });

            // DOM Replacement happens here
            $(realGroupNode).replaceWith(divGroupClone);

            IMPACT_SELECTION._SNAPSHOT({
                lock: true,
                save: true
            });

            // SELECTION LOGIC
            if (action === "KEYWORDS_ADD" || action === "KEYWORDS_DELETE") {
                var sel = editor.getSelection();
                var rng = editor.createRange();
                var liveNode = null;

                if (targetId) {
                    // Re-fetch the node from the live DOM using the ID saved before replacement
                    liveNode = editor.document.findOne(`[data-id="${targetId}"]`);
                }

                if (liveNode) {
                    var innerActive = liveNode.findOne ? liveNode.findOne(".active") : null;
                    var finalTarget = innerActive || liveNode;

                    // ES5 uses CKEDITOR constants directly
                    var pos = (action === "KEYWORDS_ADD") ? CKEDITOR.POSITION_BEFORE_START : CKEDITOR.POSITION_BEFORE_END;

                    rng.setStartAt(finalTarget, pos);
                    rng.setEndAt(finalTarget, CKEDITOR.POSITION_BEFORE_END);
                    // rng.collapse(true);
                    sel.selectRanges([rng]);

                    if (finalTarget.scrollIntoView) {
                        finalTarget.scrollIntoView(true);
                    }
                    editor.focus();
                }
            }

            IMPACT_SELECTION._SNAPSHOT({
                unlock: true,
                save: true
            });
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace === "function") ErrorLogTrace('executeCommand', err.message);
        }
    },
    contextMenuHandler: function(element, selection, elementPath, editor) {
        let MenuReturn = {};
        const IMS = IMPACT_SELECTION;
        const IKEY = iKEY_EVENT_HANDLING;

        try {
            // if (IS_LOCAL_HOST) debugger;

            var MODULE = window.KeywordModule;
            if (MODULE && !MODULE.initiated) {
                MODULE.Init();
                debug.warn("KeywordModule not fully loaded in contextMenuHandler");
            } else if (MODULE && MODULE.initiated && !MODULE.capturedDelimiterState) {
                MODULE.checkAndMigrateLegacyKwdData();
            }

            if (MODULE && MODULE.initiated && MODULE.SHOW_CONTEXT_GROUP) {
                let isKwd = IKEY.hasAnyClass(IMS.PARENTS_CLAS_LIST, ['kwd']);
                // Use common utility
                var {
                    actionNode,
                    isFirst,
                    isLast
                } = kwdConfig._kwdGroupUtils(elementPath, {
                    excludeDeleted: true,
                    excludeDataName: ['delimt']
                });
                if (isKwd && actionNode && !actionNode.hasAttribute('data-remove') && !actionNode.hasAttribute('data-delete')) {
                    MenuReturn.KEYWORDS_ADD = CKEDITOR.TRISTATE_OFF;
                    MenuReturn.KEYWORDS_LEFT_MOVE = isFirst ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF;
                    MenuReturn.KEYWORDS_RIGHT_MOVE = isLast ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF;
                    MenuReturn.KEYWORDS_DELETE = CKEDITOR.TRISTATE_OFF;
                }
            }
            debug.log("kwd-contextMenuHandler-return", MenuReturn);
            return MenuReturn;
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace === "function") ErrorLogTrace('contextMenuHandler', err.message);
            return MenuReturn;
        } finally {}
    }
};
class PlaceHolderFactoryModule {
    constructor(options) {
        this.options = options || {};
        this.originalCache = null;
        this.templateDelimiterState = null;
        this._editorEventsBound = false;
        this.errorTracker = new EnhancedErrorTracker();
        this.moduleName = this.constructor.name || 'PlaceHolderModule';
        this.initializeValues(this.options);
        this.bindEditorEvents();
    }

    initializeValues(options) {
        options = options || {};
        this.initiated = false;
        this.defaultRegex = /Insert|Here/gi;
        this.alertOneRegex = /keyword|SurName|GivenName|Term|Definition/gi;
        this.RESTRICT_CLASS = ['kwd', 'term', 'def', 'definition'];
        this.templateAliases = ['GivenName SurName', 'SurName GivenName', 'Degree', 'keyword', 'alt-text', 'Term', 'Definition'];
        this.templates = Object.assign({
            'kwd': 'keyword',
            'surname': 'SurName',
            'given-names': 'GivenName',
            'alt-text': 'To aid accessibility, please provide an alt-text description of your figure here.',
            'term': 'Term',
            'def': 'Definition',
            'corresp': "Type_Here",
            "fund": 'Insert funding details here'
        }, options.templates || {});
        this.rules = Object.assign({
            kwd: {
                label: 'keywords',
                cmd: 'KEYWORDS_DELETE'
            },
            def: {
                label: 'Abbreviations',
                cmd: 'ABBREVIATIONS_DELETE'
            },
            term: {
                label: 'Abbreviations',
                cmd: 'ABBREVIATIONS_DELETE'
            }
        }, options.rules || {});
        this.selector = Object.assign({
            tc: '.TrackChangesList',
            prefix: ' : ',
            text_find: '',
            pl_find: "",
            pl_class: "",
            delim_class: '',
            delim_find: '',
            root_class: "",
            root_find: "",

            first_item_class: "",
            second_item_class: "",

            TC_OLD_CLASS: '',
            TC_ROOT_ID: "",
            TC_INNER_ID: "",
            TC_UL_ID: ""
        }, options.selector || {});

        this.isKwd = !!options.isKwd;
        this.isAbbr = !!options.isAbbr;
        this.isAbs = !!options.isAbs;

        this.config = Object.assign({
            xmlEndPeriod: "",
            xmlSeparator: "",
            xmlLastBefore: "",
            inBetweenDelimiter: ""
        }, options.config || {});

        this.capturedDelimiterState = false;
        this.hasInbetweenDelimiters = false;

        this.Template_List = [];
        this.global_group_selector = options.group_selector || ".contrib-group, .kwd-group, .author-notes, .fig, .name, .def-item, .def-list";
        this.global_node_selector = options.node_selector || ".kwd, .corresp, .fn, .given-names, .surname, .degrees, .alt-text, .term, .def, .p";

        this.htmlTemplates = Object.assign({
            li: `<li data-id="{{id}}" data-action="{{action}}" data-view="0" data-time="{{time}}" data-username="{{user}}" data-area="{{area}}"></li>`,
            time: `<span class="time" data-time="{{m_time}}">{{r_time}}</span>`,
            tc: `<div id='{{TC_ROOT_ID}}' class='TrackChangesList'{{#currentKwdGroupId}} data-kwd-group-id='{{currentKwdGroupId}}'{{/currentKwdGroupId}}{{#currentKwdGroupDataId}} data-kwd-group-data-id='{{currentKwdGroupDataId}}'{{/currentKwdGroupDataId}}><span class='tc'>[TC]</span><div id='{{TC_INNER_ID}}' class='pop_up'><div id='{{TC_OLD_CLASS}}' class='oldStructure'></div><ul id='{{TC_UL_ID}}'></ul></div></div>`
        }, options.htmlTemplates || {});

        this.waitForInitialLoadDialog(() => {
            this.Init();
        }, this);

        this.html_TC = this.buildHtmlTC();
    }

    normalizeDomNode(node) {
        return node && node.$ ? node.$ : (node && node[0] ? node[0] : node);
    }

    getNodeIdentity(node) {
        node = this.normalizeDomNode(node);
        if (!node || !node.getAttribute) return {};
        return {
            id: node.id || node.getAttribute('id') || '',
            dataId: node.getAttribute('data-id') || ''
        };
    }

    resolveKeywordGroupForContext(context) {
        context = context || {};
        var nodeGroup = this.normalizeDomNode(context.nodeGroup);
        var currentChapter = this.normalizeDomNode(
            context.currentChapter ||
            (typeof EDITOR_CURSOR !== 'undefined' && EDITOR_CURSOR && EDITOR_CURSOR.CUR_CHAPTER)
        );
        if (!this.isKwd || typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL) return nodeGroup;
        if (!nodeGroup || !nodeGroup.matches || !nodeGroup.matches(this.selector.ROOT_GROUP)) return nodeGroup;
        if (!currentChapter || !currentChapter.querySelector) return nodeGroup;
        if (currentChapter.contains && currentChapter.contains(nodeGroup)) return nodeGroup;
        var identity = this.getNodeIdentity(nodeGroup);
        var selectorParts = [];
        if (identity.id) selectorParts.push('[id="' + identity.id + '"]');
        if (identity.dataId) selectorParts.push('[data-id="' + identity.dataId + '"]');
        if (selectorParts.length) {
            var matchedGroup = currentChapter.querySelector(selectorParts.join(','));
            if (matchedGroup && matchedGroup.matches && matchedGroup.matches(this.selector.ROOT_GROUP)) {
                return matchedGroup;
            }
        }
        return nodeGroup;
    }
    buildHtmlTCContext(context) {
        var renderData = Object.assign({}, this.selector);
        var kwdGroup = this.resolveKeywordGroupForContext(context);
        var identity = this.getNodeIdentity(kwdGroup);
        var shouldStampKwdContext = this.isKwd && !(typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL);
        if (shouldStampKwdContext && identity.id) renderData.currentKwdGroupId = identity.id;
        if (shouldStampKwdContext && identity.dataId) renderData.currentKwdGroupDataId = identity.dataId;
        return {
            renderData: renderData,
            kwdGroup: kwdGroup
        };
    }
    buildHtmlTC(context) {
        const s = this.selector;
        if (s.TC_ROOT_ID && s.TC_INNER_ID && s.TC_OLD_CLASS && s.TC_UL_ID) {
            var renderData = this.buildHtmlTCContext(context).renderData;
            return Mustache.render(this.htmlTemplates.tc, renderData);
        }
        return $('<div class="TrackChangesList"></div>');
    }
    buildHtmlAction() {
        const time = moment().format();
        return Mustache.render(this.htmlTemplates.time, {
            m_time: time,
            r_time: time
        });
    }
    buildTCList(options) {
        return commonMethods.htmlToFragment(Mustache.render(this.htmlTemplates.li, options));
    }

    bindEditorEvents() {
        if (this._editorEventsBound) return;
        this._editorEventsBound = true;
    }

    Init() {
        try {
            this.Template_List = Array.from(new Set(
                (this.templateAliases || []).concat(Object.values(this.templates).filter(Boolean))
            ));
            this.initiated = true;
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'Init', err.message);
        }
    }

    getNewSpanWithAttributes(tag, type, piText) {
        try {
            var span = commonMethods.setAttr(tag, {
                "class": type,
                "data-name": type,
                "contenteditable": "false",
                "data-pi": "PI",
                "data-pistart": piText
            });
            return span;
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'getNewSpanWithAttributes', err.message);
        }
    }

    insertVisualDelimiter(item, piText, type = 'delimt') {
        try {
            piText = piText ? piText : (this.config.xmlSeparator || this.config.separator || "");

            var newSpan = this.getNewSpanWithAttributes("span", type, piText);
            if (type == "delimt") {
                // Remove existing delimt if any before inserting new one
                const existing = item.nextElementSibling;
                if (existing && existing.classList.contains('delimt')) {
                    existing.remove();
                }
                item.insertAdjacentElement('afterend', newSpan);
            } else if (type == "pistart") {
                // If it's a pistart inside, we might need to handle it differently
                // but usually it's appended or updated.
                const existing = item.querySelector('.pistart');
                if (existing) {
                    existing.setAttribute('data-pistart', piText);
                } else {
                    item.appendChild(newSpan);
                }
            }
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'InsertVisualDelimiter', err.message);
        }
    }




    captureInitialTemplateDelimiterState() {
        debug.log("--captureInitialTemplateDelimiterState--")
        try {
            let retry = 0;
            const maxRetry = 20;
            var self = this;
            const interval = setInterval(() => {
                if (window.queryRestore && queryRestore.contexts && queryRestore.contexts.original && queryRestore.contexts.original.domCache) {
                    const orgDom = queryRestore.contexts.original.domCache;
                    const group = orgDom.querySelector(this.selector.ROOT_GROUP);
                    if (!group) {
                        debug.warn("No group found in original DOM cache for delimiter state capture.");
                        clearInterval(interval);
                        return;
                    }
                    const listItems = group.querySelectorAll(this.selector.ROOT);
                    if (!listItems || listItems.length === 0) {
                        debug.warn("No template nodes found in original DOM cache for delimiter state capture.");
                        clearInterval(interval);
                        return;
                    }


                    const {
                        last,
                        first,
                        lastBefore
                    } = commonMethods.getArrayExtremes(listItems, {
                        findDataName: this.selector.ROOT
                    });
                    // Helper to safely grab the attribute in ES2017
                    const getPiStart = (el, hasInbetweenDelimiters = false) => {
                        if (!el) return "";

                        const nodes = el.querySelectorAll('[data-pistart]');
                        if (nodes.length === 0) return "";

                        const index = hasInbetweenDelimiters ? nodes.length - 1 : 0;
                        const target = nodes[index];

                        return target && target.getAttribute('data-pistart') || "";
                    };
                    // Application
                    this.config.xmlSeparator = getPiStart(first, self.hasInbetweenDelimiters);
                    this.config.xmlEndPeriod = getPiStart(last, self.hasInbetweenDelimiters);
                    this.config.xmlLastBefore = getPiStart(lastBefore, self.hasInbetweenDelimiters);
                    if (self.hasInbetweenDelimiters) this.config.xmlInBetweenDelimiter = getPiStart(first);
                    if (self.isKwd && !(typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL) && !this.config.xmlSeparator) {
                        this.config.xmlSeparator = ", ";
                    }


                    var cloneGroup = group.cloneNode(true);
                    var groupId = group.getAttribute('id') || (group.$ && group.$.id);
                    var innter = setInterval(() => {
                        if (GlobalEditor.document && GlobalEditor.document.getById) {
                            var realGroupNode = GlobalEditor.document.getById(groupId);
                            if (realGroupNode) {
                                var delimts = realGroupNode.$.querySelectorAll(this.selector.delim_find);
                                if (IS_JOURNAL && delimts.length == 0) {
                                    this.revertInsertDelimiters(realGroupNode.$ ? realGroupNode.$ : realGroupNode, self);
                                    clearInterval(innter);
                                } else if (!IS_JOURNAL || delimts.length > 0) {
                                    clearInterval(innter);
                                }
                                if (!IS_JOURNAL) HandleBookskwdGroupDelimeter();
                            }
                        }
                    }, 500);

                    this.capturedDelimiterState = true;
                    clearInterval(interval);


                } else if (++retry >= maxRetry) {
                    clearInterval(interval);
                    debug.warn("captureInitialTemplateDelimiterState: max retries reached");
                }
            }, 1500);
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'captureInitialTemplateDelimiterState', err.message);
            return null;
        }
    }

    revertInsertDelimiters(divGroupClone, self) {
        self = this;
        try {

            const {
                first_item_class,
                second_item_class,
                delim_find,
                ROOT
            } = self.selector;
            $(divGroupClone).find(delim_find).remove();

            const listCollection = divGroupClone.querySelectorAll(ROOT);
            const {
                first,
                last,
                deleted
            } = commonMethods.getArrayExtremes(listCollection, {
                exportDeleted: true
            });

            var {
                xmlEndPeriod,
                xmlSeparator,
                xmlInBetweenDelimiter,
                xmlLastBefore,
                endPeriod,
                separator,
                inBetweenDelimiter
            } = self.config;


            var delimText = (xmlSeparator || separator || "");
            var inBetweenDelimText = (xmlInBetweenDelimiter || inBetweenDelimiter || "");

            var firstItemClass = first_item_class || "";
            var secondItemClass = second_item_class || "";


            listCollection.forEach(el => {
                var isLast = commonMethods.compareElementsByOuterHTML(el, last);

                if (isLast) {
                    if (xmlEndPeriod === false || xmlEndPeriod === "") {
                        return;
                    } else {
                        delimText = xmlEndPeriod ? (xmlEndPeriod || endPeriod) : null;
                    }
                }
                if (delimText) {
                    let targetEl = secondItemClass ? el.querySelector(secondItemClass) : el;
                    self.insertVisualDelimiter(targetEl, delimText, 'delimt');
                }

                if (inBetweenDelimText) {
                    let targetEl = firstItemClass ? el.querySelector(firstItemClass) : el;
                    self.insertVisualDelimiter(targetEl, inBetweenDelimText, 'delimt');
                }
            });

            Array.from(deleted).forEach(delNode => {
                $(delNode).find(".pistart").remove();
            });
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'revertInsertDelimiters', err.message);
        }
    }

    REMOVE_DEL(count = 0, self) {
        self = this;
        try {
            this.runPlaceholderRemoveDel(self, count);
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'REMOVE_DEL', err.message);
        }
    }

    FIRE_CLICK(clickElm, ev, self, IMS) {
        IMS = IMPACT_SELECTION, self = this;
        if (!self.initiated) self.Init();
        try {
            this.runPlaceholderClick(clickElm, self, IMS);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_CLICK', err.message);
        }
    }

    FIRE_KEYUP(CharCode, evt, Options = {}, self, IMS) {
        IMS = IMPACT_SELECTION, self = this;
        if (!self.initiated) self.Init();
        try {
            return this.runPlaceholderKeyup(evt, Options, self, self.FIRE_CLICK.bind(self), self.REMOVE_DEL.bind(self));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_KEYUP', err.message);
            evt.cancel();
            return false;
        }
    }

    TC_MSG(action, node, nodeGroup, nodeGroupClone) {
        debug.log("===TC_MSG===");

        var selector = this.selector;

        try {

            // 1. Normalize node
            var targetNode = node.$ ? node.$ : (node[0] ? node[0] : node);

            // 2. Determine action logic
            var isMove = /MOVE/i.test(action);
            var actionParts = action.split('_');

            var actionKey = actionParts[actionParts.length - (isMove ? 2 : 1)].toLowerCase();
            var isAddAction = (actionKey === "add");

            // 3. Resolve text content
            var textNode = isAddAction ? this.templates[selector.msg_key] : commonMethods.getTextWithoutDel(targetNode, action);
            if (action == "KEYWORDS_DELETE") {
                textNode = $(targetNode).text();
            }

            // 4. Resolve template
            var actionTypeKey = isMove ? 'move' : actionKey;
            var template_msg = ALERT_MESSAGE['tc_new_msg'][actionTypeKey][selector.msg_key];
            var isPlaceholderTemplate = isAddAction || this.templateAliases.some(alias => alias.toLowerCase() === textNode.toLowerCase());


            if (typeof template_msg !== 'string') {
                template_msg = template_msg[isPlaceholderTemplate ? 'pl_hold' : 'text'];
            }

            var time_string = this.buildHtmlAction(targetNode, {});

            var mus_msg = Mustache.render(template_msg, {
                action: actionKey,
                name: textNode,
                timestamp: time_string
            });

            var dataId = targetNode.getAttribute("data-id") || targetNode.getAttribute("id");
            if (!dataId) {
                dataId = s4();
                targetNode.setAttribute("data-id", dataId);
            }
            // 5. Build TC list item
            var li = this.buildTCList({
                id: dataId,
                action: actionKey,
                area: selector.msg_key
            });

            var fragment = commonMethods.htmlToFragment(mus_msg);
            $(li.firstChild).append(fragment);

            // 6. Ensure Track Change container exists
            var $clone = $(nodeGroupClone);

            // Cache selectors
            var $tc = $clone.find(selector.tc);
            var tcContext = this.buildHtmlTCContext({
                nodeGroup: nodeGroup,
                currentChapter: typeof EDITOR_CURSOR !== 'undefined' && EDITOR_CURSOR ? EDITOR_CURSOR.CUR_CHAPTER : null
            });
            var tcSelector = tcContext.renderData || selector;
            var oldSelector = '[id="' + tcSelector.TC_OLD_CLASS + '"]';
            var ulSelector = '[id="' + tcSelector.TC_UL_ID + '"]';

            var oldStructure = this.buildPlaceholderOldStructure(nodeGroup, selector);

            // Ensure TC container
            if ($tc.length === 0) {

                var htmlTC = Mustache.render(this.htmlTemplates.tc, tcSelector) || this.html_TC;
                $(nodeGroupClone).children().last().after(htmlTC);

                // re-fetch TC container
                $tc = $clone.find(selector.tc);

                if (oldStructure) {
                    $tc.find(oldSelector)
                        .empty()
                        .append(oldStructure);
                }

            } else if ($tc.length > 0) {
                $clone.append($tc);
            }

            // Append message
            $tc.find(ulSelector).append(li);

        } catch (err) {

            console.warn(err.message);

            if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace('TC_MSG', err.message);
            }
        }
    }
    FIRE_CMD(cmd, node, self) {
        self = this;
        try {
            if (cmd && node) {
                const command = self.rules[cmd] ? self.rules[cmd].cmd : null;
                if (command) {
                    GlobalEditor.execCommand(command, {
                        node
                    });
                }
            }
        } catch (err) {}
    }

    waitForInitialLoadDialog(callback, self) {
        self = this;
        let retry = 0;
        const maxRetry = 20;

        const interval = setInterval(function() {
            try {
                if (
                    window.InitialLoadDialog &&
                    typeof window.InitialLoadDialog.FullyLoaded === "boolean" &&
                    window.InitialLoadDialog.FullyLoaded === true
                ) {
                    clearInterval(interval);
                    callback();
                    return;
                }

                retry++;
                if (retry >= maxRetry) {
                    clearInterval(interval);
                    console.warn("InitialLoadDialog not ready after retries");
                }
            } catch (err) {
                console.warn(err.message);
                clearInterval(interval);
            }
        }, 600);
    }

    // ─── Formerly Static Methods ──────────────────────────────────────────────

    clearPlaceholderActiveState() {
        Array.from(GlobalEditor.document.find('.active, .highlightAff').$).forEach(el => {
            el.classList.remove('active', 'highlightAff');
        });
    }

    shouldOpenPlaceholderPopup(clickElm) {
        return clickElm && clickElm.$ &&
            (clickElm.$.closest('.contrib-group') || clickElm.$.closest('.TrackChangesList'));
    }

    getLastPiClickTarget(clickElm) {
        const nextSource = clickElm && typeof clickElm.getNextSourceNode === 'function' ? clickElm.getNextSourceNode() : null;
        const firstLevel = nextSource && typeof nextSource.getFirst === 'function' ? nextSource.getFirst() : null;
        return firstLevel && typeof firstLevel.getFirst === 'function' ? firstLevel.getFirst() : null;
    }

    resolvePlaceholderClickElement(clickElm, context, ims) {
        if (!clickElm || !clickElm.$) return null;
        if (clickElm.$.closest(context.global_node_selector) == null && /impactdeltag/gi.test(ims.NODE_CLAS)) {
            clickElm = ims.NODE;
        }
        if (!clickElm || !clickElm.$ || !clickElm.$.closest(context.global_node_selector)) return clickElm;
        clickElm.$.normalize();
        const next = typeof clickElm.getNext === 'function' ? clickElm.getNext() : null;
        const isPiElement = /delimt|pistart/gi.test(clickElm.$.className);
        if (typeof clickElm.hasAttribute === 'function' && clickElm.hasAttribute("lastpi")) {
            const tempElm = this.getLastPiClickTarget(clickElm);
            if (tempElm && typeof tempElm.hasClass === 'function' && tempElm.hasClass("given-names")) {
                return tempElm;
            }
            return clickElm;
        }
        if (isPiElement && next) {
            if (typeof next.hasClass === 'function' && next.hasClass('kwd')) {
                return next;
            }
            if (next.$ && /TrackChangesList/gi.test(next.$.className) && typeof clickElm.getPreviousSourceNode === 'function') {
                return clickElm.getPreviousSourceNode();
            }
        }
        return clickElm;
    }

    selectPlaceholderTemplateText(clickElm, context, ims) {
        if (!clickElm || !clickElm.$) return;
        const parentNode = clickElm.$.closest(context.global_node_selector);
        if (!parentNode) return;
        if (ims.PARENT && typeof ims.PARENT.find === 'function') {
            $(ims.PARENT.find("[data-cke-bookmark]").$).remove();
        }
        Array.from(parentNode.childNodes).forEach((node) => {
            const isNewElm = context.Template_List.includes(node.nodeValue) || context.Template_List.includes(clickElm.getText());
            if ((node.nodeType == Node.TEXT_NODE) && node.parentElement.tagName != 'INSERT' && isNewElm) {
                const sel = GlobalEditor.getSelection();
                const rng = GlobalEditor.createRange();
                const first = clickElm.getFirst();
                if (first) {
                    rng.setStart(clickElm, 0);
                    rng.setEnd(first, first.getLength());
                    sel.selectRanges([rng]);
                    debug.log("selected");
                }
            }
        });
    }

    resolvePlaceholderActiveElement(clickElm, context) {
        if (!clickElm || !clickElm.$) return null;
        const tempGroup = clickElm.$.closest(context.global_group_selector);
        let tempElm = clickElm.$.closest(context.global_node_selector);
        if (!tempElm) return null;
        if (/delimt/gi.test(tempElm.className) && tempElm.nextElementSibling && tempElm.nextElementSibling.hasAttribute('data-name')) {
            tempElm = tempElm.nextElementSibling;
        }
        if (tempGroup && /fig/gi.test(tempGroup.className) && /p/gi.test(tempElm.className)) {
            return null;
        }
        return tempElm;
    }

    runPlaceholderClick(clickElm, context, ims) {
        this.clearPlaceholderActiveState();
        if (this.shouldOpenPlaceholderPopup(clickElm)) {
            AuthorGroupNewModule.AuthorGroupClick(GlobalEditor);
            debug.log("==TC-Clicked===");
        }
        if (!clickElm || !clickElm.$ || !clickElm.$.closest(context.global_group_selector)) return;
        const resolvedClickElm = this.resolvePlaceholderClickElement(clickElm, context, ims);
        if (resolvedClickElm && resolvedClickElm.$ && resolvedClickElm.$.closest(context.global_node_selector)) {
            this.selectPlaceholderTemplateText(resolvedClickElm, context, ims);
        }
        const activeElm = this.resolvePlaceholderActiveElement(resolvedClickElm, context);
        if (activeElm) activeElm.classList.add('active');
    }

    isPlaceholderEnterEvent(evt) {
        return !!(evt && evt.data && ((evt.data.$ && evt.data.$.keyCode == 13) || evt.data.keyCode == 13));
    }

    runPlaceholderKeyup(evt, options, context, fireClickFn, removeDelFn) {
        const ims = IMPACT_SELECTION;
        const altGroupClosest = ims.NODE.$.closest(context.global_group_selector);
        const altNodeClosest = ims.NODE.$.closest(context.global_node_selector);
        if (!altNodeClosest) return;
        if (this.isPlaceholderEnterEvent(evt)) {
            if (ims.ISEndOfBlock && altGroupClosest && /def|def-item/gi.test(altGroupClosest.dataset.name)) {
                if (window.Abbreviation_Module && typeof window.Abbreviation_Module.FIRE === 'function') {
                    window.Abbreviation_Module.FIRE("ADD");
                } else if (typeof ErrorLogTrace === 'function') {
                    ErrorLogTrace('Abbreviation_Module.FIRE', 'unavailable');
                }
                debug.log('evt return');
            }
            if (altGroupClosest) {
                debug.log('evt return');
                evt.cancel();
                return false;
            }
        }
        if (options.IsArrowMovement || options.IsKeyMovement) {
            fireClickFn(ims.NODE, evt);
            removeDelFn();
        }
    }

    runPlaceholderRemoveDel(context, count = 0) {
        let checkDelNode = GlobalEditor.document.find('.impactdeltag').$;
        if (checkDelNode.length != 0) {
            $(checkDelNode).find('del').remove();
        }
        if (count > 3) return;
        const loopCount = count + 1;
        setTimeout(() => {
            context.REMOVE_DEL(loopCount);
        }, 150);
    }

    buildPlaceholderOldStructure(nodeGroup, selector) {
        var self = this;
        var targetGrpup = nodeGroup.$ ? nodeGroup.$ : nodeGroup;
        var lastKeywordNeedsDelimiter = false;
        return Array.from(targetGrpup.querySelectorAll(selector.text_find)).reduce(function(accumulator, node) {
            var isBookKwd = self.isKwd && !(typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL);
            var isDelimiterNode = /pistart|delimt/gi.test(node.className);
            var isKeywordNode = /kwd/gi.test(node.className);
            let txt = isDelimiterNode ? node.getAttribute('data-pistart') : node.innerText;
            if (isBookKwd && isKeywordNode && lastKeywordNeedsDelimiter) {
                txt = "," + txt;
            }
            if (isBookKwd && isDelimiterNode && !txt) {
                txt = ",";
            }
            if (!node.querySelector(".pistart") && /term|def/gi.test(node.className)) {
                txt = txt + (/term/gi.test(node.className) ? ": " : "; ");
            }
            lastKeywordNeedsDelimiter = isBookKwd && isKeywordNode;
            if (isBookKwd && isDelimiterNode && txt) {
                lastKeywordNeedsDelimiter = false;
            }
            debug.log(accumulator + txt);
            return accumulator + txt;
        }, selector.prefix);
    }
}
const abbrConfig = {
    commands: [{
            name: 'ABBR_ADD',
            label: "Add Abbreviation",
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            command: 'ABBR_ADD',
            group: 'AbbreviationsGroup',
            order: 85
        },
        {
            name: 'ABBR_MOVE_LEFT',
            label: "Move Up",
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            command: 'ABBR_MOVE_LEFT',
            group: 'AbbreviationsGroup',
            order: 86
        },
        {
            name: 'ABBR_MOVE_RIGHT',
            label: "Move Down",
            icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
            command: 'ABBR_MOVE_RIGHT',
            group: 'AbbreviationsGroup',
            order: 87
        },
        {
            name: 'ABBR_DELETE',
            label: "Delete Abbreviation",
            icon: '../assets/images/svg/ContextMenu/Delete.svg',
            command: 'ABBR_DELETE',
            group: 'AbbreviationsGroup',
            order: 88
        }
    ],
    _abbrGroupUtils: function(elementPath, options) {
        try {


            if (!options) options = {};

            var emptyResult = {
                actionNode: null,
                actionNodeGroup: null,
                divGroupClone: null,
                listOfItems: [],
                last: null,
                first: null,
                isFirst: false,
                isLast: false,
                IsNewItem: false,
                actionClone: null
            };

            var elements = elementPath && elementPath.elements ? elementPath.elements : [];

            var target = null;
            for (var i = 0; i < elements.length; i++) {
                var el = elements[i];
                if (el.hasAttribute && el.getAttribute('data-name') === 'def-item') {
                    target = el;
                    break;
                }
            }

            var actionNodeGroup = null;
            for (var j = 0; j < elements.length; j++) {
                var groupEl = elements[j];
                if (groupEl.hasAttribute && groupEl.getAttribute('data-name') === 'def-list') {
                    actionNodeGroup = groupEl;
                    break;
                }
            }

            if (!actionNodeGroup || !target) return emptyResult;

            var actionNodeGroupDom = actionNodeGroup.$ || actionNodeGroup;
            var targetDom = target.$ || target;

            if (!actionNodeGroupDom || typeof actionNodeGroupDom.cloneNode !== "function") return emptyResult;
            if (!targetDom || typeof targetDom.cloneNode !== "function") return emptyResult;

            var divGroupClone = actionNodeGroupDom.cloneNode(true);

            var delimts = divGroupClone.querySelectorAll('.delimt');
            for (var k = 0; k < delimts.length; k++) {
                delimts[k].parentNode.removeChild(delimts[k]);
            }

            var listOfItems = divGroupClone.querySelectorAll('[data-name="def-item"]');
            var extremes = commonMethods.getArrayExtremes(listOfItems, options);

            var first = extremes.first;
            var last = extremes.last;

            var targetClone = targetDom.cloneNode(true);
            $(targetClone).find(".delimt").remove();


            var isFirst = commonMethods.compareElementsByOuterHTML(targetClone, first);
            var isLast = commonMethods.compareElementsByOuterHTML(targetClone, last);
            var IsNewItem = target && target.hasAttribute('data-new');

            var actionClone = null;
            var nodeId = null;

            if (target) {
                var targetNode = target.$ || target;
                var targetDataId = targetNode.getAttribute && targetNode.getAttribute('data-id');
                var targetId = targetNode.id || target.id || (target.$ && target.$.id);
                nodeId = IsNewItem ? (targetDataId || targetId) : (targetId || targetDataId);
            }

            if (nodeId) {
                // Note: CSS.escape requires a polyfill in older IE versions
                actionClone = divGroupClone.querySelector('[id="' + nodeId + '"], [data-id="' + nodeId + '"]');
            } else if (target) {
                var clonedAbbrs = Array.prototype.slice.call(divGroupClone.querySelectorAll('[data-name="def-item"]'));
                var targetHTML = target.outerHTML || (target.$ && target.$.outerHTML);

                for (var m = 0; m < clonedAbbrs.length; m++) {
                    var itemHTML = clonedAbbrs[m].outerHTML || (clonedAbbrs[m].$ && clonedAbbrs[m].$.outerHTML);
                    if (itemHTML === targetHTML) {
                        actionClone = clonedAbbrs[m];
                        break;
                    }
                }
            }

            return {
                actionNode: target,
                actionNodeGroup: actionNodeGroup,
                divGroupClone: divGroupClone,
                listOfItems: listOfItems,
                last: last,
                first: first,
                isFirst: isFirst,
                isLast: isLast,
                IsNewItem: IsNewItem,
                actionClone: actionClone
            };
        } catch (error) {
            console.warn(error.message);
            ErrorLogTrace('abbrGroupUtils', error.message);
            return {
                actionNode: null,
                actionNodeGroup: null,
                divGroupClone: null,
                listOfItems: [],
                last: null,
                first: null,
                isFirst: false,
                isLast: false,
                IsNewItem: false,
                actionClone: null
            };
        }
    },

    executeCommand: function(editor, item, moduleConfig, params) {
        try {
            var action = item.command;
            var elementPath = params.elementPath;
            var moduleId = moduleConfig.id || moduleConfig.name;
            var instance = window[moduleId];

            IMPACT_SELECTION._SNAPSHOT({
                lock: true,
                save: true
            });

            var utils = abbrConfig._abbrGroupUtils(elementPath);
            var {
                actionNodeGroup,
                divGroupClone,
                actionClone,
                IsNewItem,
                actionNode
            } = utils;

            if (!actionNodeGroup || !actionClone) return;

            $(divGroupClone).find('.active').removeClass('active');

            var targetId = actionClone.getAttribute('data-id');
            if (!targetId) {
                // Generate a unique ID: prefix + random number
                targetId = "abbr_" + Math.floor(Math.random() * 10000);
                // Assign it back to the clone (handle both native and CKEditor wrapper cases)
                if (!actionClone.hasAttribute('data-id')) {
                    actionClone.setAttribute('data-id', targetId);
                }
            }


            if (action === "ABBR_ADD") {
                var newItem = instance.newItem();
                divGroupClone.appendChild(newItem);
                var allItems = Array.prototype.slice.call(divGroupClone.querySelectorAll(instance.selector.ROOT));
                var newElem = allItems.pop();
                targetId = newElem.getAttribute('data-id');
            } else if (action.includes("MOVE")) {
                var sibling = (action.includes("LEFT")) ? actionClone.previousElementSibling : actionClone.nextElementSibling;
                if (sibling) {
                    if (action.includes("LEFT")) {
                        actionClone.parentNode.insertBefore(actionClone, sibling);
                    } else {
                        actionClone.parentNode.insertBefore(actionClone, sibling.nextElementSibling);
                    }
                }
            } else if (action === "ABBR_DELETE") {
                if (IsNewItem) {
                    actionClone.parentNode.removeChild(actionClone);
                } else {
                    actionClone.setAttribute('data-delete', 'true');
                    actionClone.setAttribute('data-both-action', 'false');
                    window._trackManager.getDelNode(actionClone, {
                        childOnly: true
                    });
                    commonMethods.convertDivsToSpans(actionClone);

                }
            }
            if (IS_JOURNAL) {
                instance.revertInsertDelimiters(divGroupClone);
            }
            var realGroupNode = actionNodeGroup.$ || actionNodeGroup;
            IMPACT_SELECTION._SNAPSHOT({
                unlock: true,
                save: true
            });

            // DOM Replacement happens here
            $(realGroupNode).replaceWith(divGroupClone);
            if (action === "ABBR_ADD") {
                actionNode = editor.document.findOne(`[data-id="${targetId}"]`);
            }

            instance.TC_MSG(action, actionNode, actionNodeGroup, divGroupClone);

            IMPACT_SELECTION._SNAPSHOT({
                lock: true,
                save: true
            });

            // SELECTION LOGIC
            if (action === "ABBR_ADD" || action === "ABBR_DELETE") {
                var sel = editor.getSelection();
                var rng = editor.createRange();
                var liveNode = null;

                if (targetId) {
                    // Re-fetch the node from the live DOM using the ID saved before replacement
                    liveNode = editor.document.findOne(`[data-id="${targetId}"]`);
                }

                if (liveNode) {
                    var innerActive = liveNode.findOne ? liveNode.findOne(".active") : null;
                    var finalTarget = innerActive || liveNode;

                    // ES5 uses CKEDITOR constants directly
                    var pos = (action === "ABBR_ADD") ? CKEDITOR.POSITION_BEFORE_START : CKEDITOR.POSITION_BEFORE_END;

                    rng.setStartAt(finalTarget, pos);
                    rng.setEndAt(finalTarget, CKEDITOR.POSITION_BEFORE_END);
                    // rng.collapse(true);
                    sel.selectRanges([rng]);

                    if (finalTarget.scrollIntoView) {
                        finalTarget.scrollIntoView(true);
                    }
                    editor.focus();
                }
            }

            IMPACT_SELECTION._SNAPSHOT({
                unlock: true,
                save: true
            });
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace === "function") ErrorLogTrace('executeCommand', err.message);
        }
    },
    contextMenuHandler: function(element, selection, elementPath, editor) {
        let MenuReturn = {};
        const IMS = IMPACT_SELECTION;
        const IKEY = iKEY_EVENT_HANDLING;

        try {
            // if (IS_LOCAL_HOST) debugger;

            var MODULE = window.AbbreviationModule;
            if (MODULE && !MODULE.initiated) {
                MODULE.Init();
                debug.warn("AbbreviationModule not fully loaded in contextMenuHandler");
            } else if (MODULE && MODULE.initiated && !MODULE.captruredDelimiterState) {

            }

            if (MODULE && MODULE.initiated && MODULE.SHOW_CONTEXT_GROUP) {
                let isAbbr = IKEY.hasAnyClass(IMS.PARENTS_CLAS_LIST, ['def-list']);

                var utils = abbrConfig._abbrGroupUtils(elementPath, {
                    excludeDeleted: true,
                    excludeDataName: ['delimt']
                }) || {};
                var {
                    actionNode,
                    isFirst,
                    isLast,
                    listOfItems
                } = utils;
                if (isAbbr && actionNode) {
                    if (actionNode.hasAttribute("data-remove") || actionNode.hasAttribute("data-delete")) {
                        return {
                            ADD_NEW_CMD: CKEDITOR.TRISTATE_OFF
                        };
                    }
                    MenuReturn.ABBR_ADD = CKEDITOR.TRISTATE_OFF;
                    MenuReturn.ABBR_MOVE_LEFT = isFirst ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF;
                    MenuReturn.ABBR_MOVE_RIGHT = isLast ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF;
                    MenuReturn.ABBR_DELETE = (isFirst && isLast) ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF;

                } else {}
            }
            debug.log("abbr-contextMenuHandler-return", MenuReturn);
            return MenuReturn;
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace === "function") ErrorLogTrace('contextMenuHandler', err.message);
            return MenuReturn;
        }
    }
};
class keywordWithHolderModule extends PlaceHolderFactoryModule {

    constructor(options = {}) {
        super(Object.assign({
            isKwd: true,
            selector: {
                tc: '.TrackChangesList',
                prefix: 'Keywords : ',
                text_find: '.kwd, .delimt',
                pl_find: '.pistart',
                pl_class: 'pistart',
                delim_class: 'delimt',
                delim_find: '.delimt',
                ROOT: ".kwd",
                ROOT_GROUP: ".kwd-group",
                TC_OLD_CLASS: 'oldStructurekw',
                TC_ROOT_ID: "TrackChangesKW",
                TC_INNER_ID: "KWChanges",
                TC_UL_ID: "TrackChangesListKW",
                msg_key: "kwd"
            },
            contextmenu: "Keyword"
        }));

        this.html_TC = this.buildHtmlTC();
        this.SHOW_CONTEXT_GROUP = false;

        this.waitForInitialLoadDialog(() => {
            this.checkAndMigrateLegacyKwdData();
        }, this);
    }

    checkAndMigrateLegacyKwdData() {
        try {
            this.SHOW_CONTEXT_GROUP = IsContextMenu('Keyword');
            let temp_endPeriod = GET_TYPE_CONFIG_QUERY('keywords', 'endperiod', {
                journalBased: true
            }) || "false";
            (temp_endPeriod == "false" || temp_endPeriod === "") && (temp_endPeriod = false);
            this.config.separator = GET_TYPE_CONFIG_QUERY('keywords', 'seperator', {
                journalBased: true
            }) || ', ';
            this.config.endPeriod = temp_endPeriod;
            this.captureInitialTemplateDelimiterState();
            // this.migratePi2Attributes(GlobalEditor);
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'checkAndMigrateLegacyKwdData', err.message);
        }
    }

    newItem() {
        try {
            return commonMethods.htmlToFragment(`<span data-id=k${s4()} class="kwd impactdeltag" aria-label="KW" data-name="kwd" data-template="kwd" data-new>keyword</span>`);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('newItem-KWD', err.message);
        }
    }
}
class abbreviationWithHolderModule extends PlaceHolderFactoryModule {
    constructor(options = {}) {
        super(Object.assign({
            isAbbr: true,
            selector: {
                tc: '.TrackChangesList',
                prefix: 'Abbreviations : ',
                text_find: '.term, .pistart, .def',
                pl_find: '.pistart',
                pl_class: 'pistart',
                delim_class: 'delimt',
                delim_find: '.delimt',
                ROOT: ".def-item",
                ROOT_GROUP: ".def-list",

                first_item_class: ".term",
                second_item_class: ".def",

                TC_OLD_CLASS: 'oldStructureabr',
                TC_ROOT_ID: "TrackChangesABR",
                TC_INNER_ID: "ABRChanges",
                TC_UL_ID: "TrackChangesListABR",
                msg_key: "abbr"
            },
            contextmenu: "Abbreviations"
        }));
        this.SHOW_CONTEXT_GROUP = false;
        this.hasInbetweenDelimiters = true;
        this.waitForInitialLoadDialog(() => {
            this.SHOW_CONTEXT_GROUP = IsContextMenu('Abbreviations');
            this.captureInitialTemplateDelimiterState();
        }, this);
        this.html_TC = this.buildHtmlTC();
        this.newItem = function() {
            try {
                return commonMethods.htmlToFragment(
                    '<div class="def-item impactdeltag" data-name="def-item" data-id="k' + s4() + '" data-new data-template="abr">' +
                    '<span class="term active" data-name="term" data-new>Term</span>' +
                    '<div class="def" data-name="def" data-new>' +
                    '<div class="p" data-name="p">Definition</div>' +
                    '</div>' +
                    '</div>'
                );
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('newItem-ABR', err.message);
            }
        };
    }
}
class abstractWithHolderModule extends PlaceHolderFactoryModule {
    constructor(options = {}) {
        super(Object.assign({
            isAbs: true,
            selector: {
                tc: '.TrackChangesList',
                prefix: 'Abstract : ',
                text_find: '[abstract-type="abstract"] .p, [abstract-type="abstract"] .pistart',
                ROOT: '[abstract-type="abstract"]',

                TC_OLD_CLASS: 'oldStructureabr',
                TC_ROOT_ID: "TrackChangesABR",
                TC_INNER_ID: "ABRChanges",
                TC_UL_ID: "TrackChangesListABR",
                piSelector: '.pistart',
                piTitle: '.sec[data-title]',
            }
        }));

        this.SHOW_CONTEXT_GROUP = false;
        this.configUpdated = false;

        this.config = {
            xmlEntry: null,
            wordRestrict: false,
            allowed: false,
            minWords: null,
            maxWords: null,

        };
        this.waitForInitialLoadDialog(() => {
            this.updateConfiguration();
            this.SHOW_CONTEXT_GROUP = IsContextMenu('Abstruct');
            this.migrateToTitle();
        }, this);
        this.intervalMethods();

        this.htmlTemplates = Object.assign({
            merge: `<span title="Para Merge" data-space-id="{{id}}">&#x00A0;</span>`
        }, options.htmlTemplates || {});
    }
    intervalMethods() {
        var self = this;
        var intervalCheck = setInterval(() => {
            if (!self.configUpdated) {
                self.updateConfiguration();
                self.SHOW_CONTEXT_GROUP = IsContextMenu('Abstruct');
                clearInterval(intervalCheck);
            }
        }, 1500);
    }

    getRootElement(elementPath) {
        var elements = (elementPath && elementPath.elements) ? elementPath.elements : [];
        var target = null;
        var paraNode = null;
        var isAbsSection = false;
        var getNode = function(el) {
            return el && el.$ ? el.$ : el;
        };

        // 1. Identify Target and Current Paragraph
        for (var i = 0; i < elements.length; i++) {
            var node = getNode(elements[i]);
            if (!node) continue;

            if (!target && typeof node.getAttribute === 'function' && node.getAttribute("data-name") === "abstract") {
                target = node;

            }
            if (!paraNode && node.classList && node.classList.contains("p")) {
                paraNode = node;
            }
            if (target && paraNode) {
                isAbsSection = true;
                break;
            }
        }

        // 2. Fallback
        if (!target && typeof GlobalEditor !== 'undefined' && GlobalEditor.document) {
            target = GlobalEditor.document.$.querySelector('[data-name="abstract"]');
        }

        if (!target) {
            return {
                absRoot: null,
                sections: [],
                paras: [],
                paraIndex: -1,
                forceMerge: false,
                mergeTitle: null
            };
        }

        // 3. Structure Mapping
        var sections = Array.prototype.slice.call(target.querySelectorAll(".sec"));
        var paras = Array.prototype.slice.call(target.querySelectorAll(".p"));
        var currentSection = paraNode ? paraNode.closest('.sec') : null;
        var sectionParas = currentSection ? Array.prototype.slice.call(currentSection.querySelectorAll(".p")) : [];

        var paraIndex = paraNode ? sectionParas.indexOf(paraNode) : -1;
        var forceMerge = false;
        // Holds the title node if it should be merged
        var mergeTitle = null;
        var previousSection = null;
        // 4. Force Merge & Title Logic
        if (paraNode) {
            // Case A: Para is outside a section
            if (paraIndex === -1) {
                paraIndex = paras.indexOf(paraNode);
                forceMerge = true;
            }
            // Case B: Check if section title is effectively empty (only <del> or whitespace)
            else if (currentSection) {
                var title = currentSection.querySelector(".title");
                var titleText = title ? commonMethods.getTextWithoutDel(title) : "valid";

                // Only allow forceMerge if currentSection is not the first one
                var sectionIndex = sections.indexOf(currentSection);
                previousSection = sections[sectionIndex - 1];
                if (sectionIndex > 0 && titleText.trim().length === 0) {
                    forceMerge = true;
                    // Pass the title node back for the merge action
                    mergeTitle = title;
                }
            }
        }

        return {
            isAbsSection,
            absRoot: target,
            sections: sections,
            paras: paras,
            paraIndex: paraIndex,
            forceMerge: forceMerge,
            // New parameter
            mergeTitle: mergeTitle,
            currentSection: currentSection,
            sectionParas: sectionParas,
            previousSection
        };
    }



    migrateToTitle() {
        const {
            absRoot,
            sections
        } = this.getRootElement();
        if (absRoot && sections) {
            Array.from(sections).forEach(sec => {
                if (!sec.hasAttribute('data-title')) return;
                const title = sec.getAttribute('data-title');
                const pageId = sec.getAttribute('pageid');
                const titleSpan = commonMethods.setAttr("span", {
                    'pageid': pageId,
                    'class': "title",
                    'data-name': "title",
                    'data-wsc-ignore': "ignored",
                    'data-id': "abs_title_" + s4(),
                }, {
                    text: title
                });
                if (titleSpan) {
                    sec.insertBefore(titleSpan, sec.firstChild);
                    sec.removeAttribute('data-title');
                }
            });
        }
    }
    getAbstractRule(root, docType) {

        const node = [...root.querySelectorAll("subarticle")]
            .find(el => {
                const types = (el.getAttribute("article-type") || "")
                    .split(",")
                    .map(t => t.trim().toLowerCase());

                return types.includes(docType.toLowerCase());
            });

        if (!node) return null;


        return {
            allowed: node.getAttribute("notallowed") !== "yes",
            minWords: node.getAttribute("minwords") || "",
            maxWords: node.getAttribute("maxwords") || ""
        };

    }
    updateConfiguration() {
        // ? Checking client Journal and Sub-article level abstract wordcount validation - RJ
        if (typeof J_CONFIG != 'undefined' && typeof J_CONFIG == 'object') {
            let entry = this.config.xmlEntry = J_CONFIG.querySelector('abstract');
            if (entry && entry.hasAttribute('wordrestrict')) {
                this.config.wordRestrict = entry.getAttribute('wordrestrict') == "true";
                const results = this.getAbstractRule(entry, SHARED_KEY.doctype);
                if (results != null) {
                    this.config.allowed = results.allowed;
                    this.config.minWords = results.minWords;
                    this.config.maxWords = results.maxWords;
                    // ? Checking sub-article is not NA and matching doctype value init ABS MODULE - RJ
                    let retry = 0;
                    const maxRetry = 20;
                    const intervalCheck = setInterval(() => {
                        if (window.AbstractWordCounter) {
                            AbstractWordCounter.init();
                            this.showCountDialog = true;
                            clearInterval(intervalCheck);
                        } else if (++retry >= maxRetry) {
                            clearInterval(intervalCheck);
                            console.warn("AbstractWordCounter not ready after retries");
                        }
                        if (window.AbstractWordCounter) {
                            AbstractWordCounter.openCountCheckAlert();
                        }
                    }, 1500);
                }
            }
            this.configUpdated = true;
        }
    }
    structureManipulation(action, elementPath, options = {}) {

        const {
            absRoot
        } = this.getRootElement(elementPath);

        if (!absRoot) {
            debug.warn("Abstract root element not found for structure manipulation.");
            return;
        }

        const isUnStructure = action === "ABS_UNSTRUCTURE";

        const fromTag = isUnStructure ? "section" : "span";
        const toTag = isUnStructure ? "span" : "section";

        absRoot.querySelectorAll(fromTag).forEach(node => {

            const target = node.$ || node;
            if (!target.parentNode) return;

            const newEl = target.ownerDocument.createElement(toTag);

            // copy attributes
            for (const {
                    name,
                    value
                } of target.attributes) {
                newEl.setAttribute(name, value);
            }

            // move children
            while (target.firstChild) {
                newEl.appendChild(target.firstChild);
            }

            target.parentNode.replaceChild(newEl, target);
        });

        absRoot.toggleAttribute("data-de-str", isUnStructure);
    }


    mergeWithPreviousParagraph(elementPath) {
        var data = this.getRootElement(elementPath);
        var {
            paraIndex,
            forceMerge,
            mergeTitle,
            sections,
            currentSection,
            previousSection
        } = data;

        if (paraIndex <= 0 && !forceMerge) return;

        var current = data.paras[paraIndex];
        var previous = data.paras[paraIndex - 1] || previousSection;

        // Check if previous exists
        if (!current || !previous) return;

        // Ensure previous belongs to a valid section and that section index > 0
        var prevSec = previous.closest('.sec') || previousSection;
        var prevIndex = prevSec ? sections.indexOf(prevSec) : -1;

        if (!prevSec || prevIndex == -1) {
            // Skip merge if no valid section or if it's the first section
            return;
        }

        // At this point, you know previous is valid and not in the first section
        var doc = previous.ownerDocument;
        var trackAttrs = window._trackManager ? window._trackManager.getAttributesOnly({}) : {};
        var paraWrapper = doc.createElement("span");


        var sourceNode = (mergeTitle || forceMerge) ? currentSection : current;

        $(paraWrapper).attr(Object.assign({}, trackAttrs, {
            "data-para-merge": "prev",
            "data-track-code": "para-merge-01",
            "data-old-class": sourceNode.className,
            "data-old-id": sourceNode.id
        }));

        while (sourceNode && sourceNode.firstChild) {
            paraWrapper.appendChild(sourceNode.firstChild);
        }

        var mergeHtml = Mustache.render(this.htmlTemplates.merge, {
            id: current.id,
            action: "merge",
            area: "abs"
        });
        $(previous).append(commonMethods.htmlToFragment(mergeHtml), paraWrapper);

        if (sourceNode && !sourceNode.firstChild && sourceNode.parentNode) {
            sourceNode.parentNode.removeChild(sourceNode);
        }

        // var currSec = current.closest('.sec');
        // if (current.parentNode) current.parentNode.removeChild(current);
        // if (currSec && !currSec.querySelector('.p')) {
        //     currSec.parentNode.removeChild(currSec);
        // }
    }


}


document.addEventListener('DOMContentLoaded', () => {
    window.placeHolderModule = new PlaceHolderFactoryModule();

    const allConfigs = {
        'KeywordModule': {
            name: 'KeywordModule',
            moduleClass: keywordWithHolderModule,
            path: '',
            type: 'lazy',
            templatePath: '',
            dependencies: [],
            wrapping: true,
            contextMenu: true,

            group_name: 'Keyword',
            groupOrder: 75,
            commands: kwdConfig.commands,
            executeCommand: kwdConfig.executeCommand,
            contextMenuHandler: kwdConfig.contextMenuHandler

        },
        'AbbreviationModule': {
            name: 'AbbreviationModule',
            moduleClass: abbreviationWithHolderModule,
            path: '',
            type: 'lazy',
            templatePath: '',
            dependencies: [],
            wrapping: true,
            contextMenu: true,

            group_name: 'Abbreviations',
            groupOrder: 85,
            commands: abbrConfig.commands,
            executeCommand: abbrConfig.executeCommand,
            contextMenuHandler: abbrConfig.contextMenuHandler

        },
        'AbstractModule': {
            name: 'AbstractModule',
            moduleClass: abstractWithHolderModule,
            path: '',
            type: 'lazy',
            templatePath: '',
            dependencies: [],
            wrapping: true,
            contextMenu: true,

            group_name: 'Abstruct',
            groupOrder: 80,
            commands: abstractConfig.commands,
            executeCommand: abstractConfig.executeCommand,
            contextMenuHandler: abstractConfig.contextMenuHandler
        }
    };
    Object.keys(allConfigs).forEach(moduleId => {
        const config = allConfigs[moduleId];
        ContextHelpers.registerOnReady(moduleId, config, {
            isJournalOnly: moduleId !== 'KeywordModule'
        }).then(() => {
            if (moduleId === 'AbbreviationModule' && window.AbbreviationModule) {
                window.Abbreviation_Module = window.AbbreviationModule;
            }
        });
    });
});