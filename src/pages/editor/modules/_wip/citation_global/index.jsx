class CursorPositionCheckerold {

    constructor(globalEditor, citationModule) {
        this.editor = globalEditor;
        this.citationModule = citationModule;
        this.state = {
            isNext: false,
            isXrefElm: false,
            isPrev: false,
            next: null,
            prev: null,
            nextNode: null,
            prevNode: null
        };

        this.constants = {
            SIBLING_METHODS: {
                0: 'getPrevious',
                1: 'getNext',
                'prev': 'getPrevious',
                'next': 'getNext'
            },
            SOURCE_NODE_METHODS: {
                0: 'getPreviousSourceNode',
                1: 'getNextSourceNode'
            },
            ELEMENT_SIBLINGS: {
                'prev': 'previousElementSibling',
                'next': 'nextElementSibling'
            },
            COUNTERS: {
                'prev': 0,
                'next': 0
            }
        };
    }

    getDirectionValues(index) {
        return index === 0 ? ['prev', 'isPrev', 'getPrevious'] : ['next', 'isNext', 'getNext'];
    }

    validateNode(node, options = {
        alert: 'CiteWarningAlert',
        alerttype: 'warning'
    }) {
        return this.citationModule.M_FUN.NODE_VALIDATE(node, options);
    }

    initializeSelection() {
        const selection = this.editor.getSelection();
        const curElement = selection.getStartElement();
        const selectionText = selection.getSelectedText();
        const nativeSelection = selection.getNative();
        const range = selection.getRanges()[0];

        if (!this.validateNode(curElement)) {
            return null;
        }

        range.collapse(true);
        range.setStartAt(this.editor.editable(), CKEDITOR.POSITION_AFTER_START);

        return {
            selection,
            curElement,
            selectionText,
            nativeSelection,
            range
        };
    }

    handleXrefElement(curElement, parent) {
        if (!['EM', 'INSERT', 'SPAN'].includes(curElement.$.tagName)) {
            return curElement;
        }

        if (parent.tagName === 'A') {
            return curElement.getParent();
        }

        const foundElements = curElement.find('a');
        if (foundElements.count() > 0) {
            return foundElements.getItem(foundElements.count() - 1);
        }

        // Handle nested structure
        let xrefElement = null;
        curElement.getParents().forEach(el => {
            if (el.getName() === 'a') {
                xrefElement = el;
            }
        });

        return xrefElement;
    }

    handleNonXrefElement(selectionText) {
        if (this.citationModule.M_SCOPE.ACTIVE_TAB === 0) {
            this.citationModule.IBOX.addNewBtn.classList.remove('disabled');
        }

        // Create a bookmark for the current selection
        const bookmark = this.editor.getSelection().createBookmarks(true);
        const findId = bookmark[0].startNode;

        return [
            selectionText,
            findId,
            this.citationModule.M_SCOPE.ACTIVE_TAB
        ];
    }

    handleSpecialParentCase(curElement, parent, getMethod) {
        if (parent.$.tagName === "SUP" && parent.getFirst().equals(curElement)) {
            return curElement;
        }

        let temp = parent[getMethod]();
        if (!temp) {
            temp = parent.getParent() ? parent.getParent()[getMethod]() : null;
        }
        return temp;
    }

    isFloatNode(node) {
        // Implementation of Is_Float_Node check
        // This should be implemented based on your specific requirements
        return typeof Is_Float_Node === 'function' ? Is_Float_Node(node) : false;
    }

    handleXrefSelection(curElement, options, isReturnRid) {
        const curPointNode = this.getCurPointNode(curElement);
        if (!this.validateNode(curPointNode, {
                alert: 'InvalidCursor',
                alerttype: 'warning'
            })) {
            return;
        }

        this.adjustSelectionRange(curPointNode);
        return this.processXrefContent(curPointNode, options, isReturnRid);
    }

    getCurPointNode(curElement) {
        if (curElement.$.tagName === 'A') {
            return curElement;
        }

        const nextNode = this.state.nextNode;
        return nextNode && nextNode.$ ? nextNode.$.firstElementChild : null;
    }

    adjustSelectionRange(curPointNode) {
        if (curPointNode.$.tagName === 'A' && curPointNode.$.parentElement.tagName === "SUP") {
            const parentHasSingleChild = curPointNode.$.parentElement.childElementCount === 1;
            this.editor.getSelection().selectElement(
                parentHasSingleChild ? curPointNode : curPointNode.getParent()
            );
        } else if (this.state.prev !== null && this.state.next !== null) {
            this.setRangeForPrevNext();
        }
    }

    setRangeForPrevNext() {
        const ranges = this.editor.getSelection().getRanges()[0];
        const prev = this.state.prev;
        const next = this.state.next;

        ranges.setStart(prev, this.state.isPrev ? 0 : prev.$.textContent.length - 0);
        ranges.setEnd(next, this.state.isNext ? 1 : 0);

        if (prev.type === 1 && prev.getName() === "del") {
            ranges.setStart(prev, 1);
        }

        this.editor.getSelection().selectRanges([ranges]);
    }

    processXrefContent(curPointNode, options, isReturnRid) {
        const selection = this.editor.getSelection();
        const range = selection.getRanges()[0];
        const [startContainer, endContainer] = [range.startContainer, range.endContainer];

        this.citationModule._SNAPSHOT({
            save: true,
            lock: true
        });

        // Handle comments and highlights
        this.handleCommentsAndHighlights(range);

        this.citationModule._SNAPSHOT({
            save: true,
            unlock: true
        });

        // Process selected text and references
        return this.processSelectedContent(selection, isReturnRid);
    }

    handleCommentsAndHighlights(range) {
        const nextNode = range.startContainer.getNext();
        if (nextNode && nextNode.type === 1 && nextNode.getName() === "a") {
            nextNode.find("span[data-high]").toArray().forEach(el => {
                commonMethods.iunWrap(el.$);
            });
        }
    }

    processSelectedContent(selection, isReturnRid) {
        const selectedText = selection.getSelectedText();
        if (selectedText === '') {
            console.log('selection is empty');
            return;
        }

        const references = this.extractReferences(selection);
        if (isReturnRid) {
            return this.citationModule.M_SCOPE.nCiteAttr;
        }

        this.updateUIState(references, selectedText);
        return null;
    }

    extractReferences(selection) {
        const range = selection.getRanges()[0];
        const container = this.editor.document.createElement('div');
        container.append(range.cloneContents());

        const temp_rid = [];
        const temp_role = [];

        let find = $(container.$).find('a');
        if (find.length === 0) {
            find = this.findAlternativeReferences(selection);
        }

        $.each(find, (index, element) => {
            const [rid, xRole] = [
                element.getAttribute('rid'),
                element.getAttribute('data-role')
            ];

            temp_rid.push(rid);
            temp_role.push(xRole);

            this.updateCiteOrder(index, xRole);
        });

        return {
            temp_rid,
            temp_role
        };
    }

    findAlternativeReferences(selection) {
        const startElement = selection.getStartElement();
        if (!startElement) return [];

        const current = startElement;
        const currentTag = current.getName();
        const parent = current.getParent();
        const parentTag = parent && parent.getName() || null;

        if (parentTag && /^a/.test(parentTag)) {
            return [parent];
        }

        if (/^a|insert/.test(currentTag) || (parent && /^a|insert/.test(parentTag))) {
            const element = (currentTag === "a" && parentTag === "insert") ? parent : current;
            return $(element.$).find('a');
        }

        return [];
    }

    updateCiteOrder(index, xRole) {
        if (index === 0) {
            this.citationModule.M_SCOPE.CiteOrder = {};
        }

        if (this.citationModule.M_SCOPE.CiteOrder[xRole] === undefined) {
            this.citationModule.M_SCOPE.CiteOrder[xRole] = Object.keys(
                this.citationModule.M_SCOPE.CiteOrder
            ).length;
        }
    }

    updateUIState(references, selectedText) {
        const {
            temp_rid,
            temp_role
        } = references;

        this.citationModule.M_SCOPE.nCiteAttr = [...temp_rid].join(' ');

        IMPACT_SELECTION.getInfo(this.editor, {
            lock: false
        });

        const uniqueRoles = [...new Set(temp_role)];
        this.State_edit_items(uniqueRoles, this.citationModule.M_SCOPE.nCiteAttr);

        this.citationModule.IBOX.ShowText.value = selectedText;
        $(this.citationModule.IBOX.insertBtn)
            .text('Modify')
            .attr({
                'ztxt': selectedText,
                'title': 'Modify'
            });

        this.citationModule.M_FUN.EditMode();
    }
    processSiblings(curElement, parent) {
        [this.state.prev, this.state.next].forEach((node, idx) => {
            const [type, booleanProp, getMethod] = this.getDirectionValues(idx);
            let element = this.state[type] = curElement[getMethod]();

            if (!element && ['INSERT', 'SUP'].includes(parent.$.tagName)) {
                element = this.handleSpecialParentCase(curElement, parent, getMethod);
            }

            this.handleFloatNode(curElement, element, type, getMethod);
        });
    }
    handleFloatNode(curElement, element, type, getMethod) {
        if (!this.isFloatNode(curElement) || !element) {
            return;
        }

        if (element.type === CKEDITOR.NODE_TEXT && element[getMethod]) {
            let sibling = element[getMethod]();
            if (sibling) {
                if (this.isShortTextNode(sibling)) {
                    sibling = sibling[getMethod]();
                }

                if (this.isValidXrefSibling(sibling) &&
                    this.isFloatNode(sibling) &&
                    element.getText().length <= 3) {
                    this.state[type] = sibling;
                }
            }
        }
    }

    isShortTextNode(node) {
        return node.type === CKEDITOR.NODE_TEXT && node.getText().length <= 3;
    }

    isValidXrefSibling(node) {
        return node &&
            node.type === CKEDITOR.NODE_ELEMENT &&
            /a/gi.test(node.getName());
    }

    checkCursorPosition(isReturnRid = false, options = {}) {
        try {
            const selectionData = this.initializeSelection();
            if (!selectionData) return;

            const {
                curElement,
                selectionText,
                nativeSelection,
                range
            } = selectionData;
            let processedElement = this.handleXrefElement(curElement, curElement.$.parentElement);

            if (!processedElement) {
                return [selectionText, null, this.citationModule.M_SCOPE.ACTIVE_TAB];
            }

            this.processSiblings(processedElement, processedElement.getParent());

            if (!this.state.isXrefElm) {
                return this.handleNonXrefElement(selectionText);
            }

            return this.handleXrefSelection(processedElement, options, isReturnRid);
        } catch (error) {
            console.warn(error.message);
            ErrorLogTrace('CheckCursorPosition', error.message);
        }
    }
}
class CursorPositionChecker {

    constructor(globalEditor, citationModule) {
        this.editor = globalEditor;
        this.citationModule = citationModule;
        this.state = {
            isNext: false,
            isXrefElm: false,
            isPrev: false,
            next: null,
            prev: null,
            nextNode: null,
            prevNode: null
        };

        this.constants = {
            SIBLING_METHODS: {
                0: 'getPrevious',
                1: 'getNext',
                'prev': 'getPrevious',
                'next': 'getNext'
            },
            SOURCE_NODE_METHODS: {
                0: 'getPreviousSourceNode',
                1: 'getNextSourceNode'
            },
            ELEMENT_SIBLINGS: {
                'prev': 'previousElementSibling',
                'next': 'nextElementSibling'
            },
            COUNTERS: {
                'prev': 0,
                'next': 0
            }
        };
    }

    getDirectionValues(index) {
        return index === 0 ? ['prev', 'isPrev', 'getPrevious'] : ['next', 'isNext', 'getNext'];
    }

    validateNode(node, options = {
        alert: 'CiteWarningAlert',
        alerttype: 'warning'
    }) {
        if (node == null || node == undefined) {
            if (options.alert) TOASTER_ALERT(options.alert, {
                type: options.alerttype
            });
            return false;
        } else return true;
    }

    initializeSelection() {
        const selection = this.editor.getSelection();
        const curElement = selection.getStartElement();
        const selectionText = selection.getSelectedText();
        const nativeSelection = selection.getNative();
        const range = selection.getRanges()[0];

        if (!this.validateNode(curElement)) {
            return null;
        }

        range.collapse(true);
        range.setStartAt(this.editor.editable(), CKEDITOR.POSITION_AFTER_START);

        return {
            selection,
            curElement,
            selectionText,
            nativeSelection,
            range
        };
    }

    handleXrefElement(curElement, parent) {
        if (!['EM', 'INSERT', 'SPAN'].includes(curElement.$.tagName)) {
            return curElement;
        }

        if (parent.tagName === 'A') {
            return curElement.getParent();
        }

        const foundElements = curElement.find('a');
        if (foundElements.count() > 0) {
            return foundElements.getItem(foundElements.count() - 1);
        }

        // Handle nested structure
        let xrefElement = null;
        curElement.getParents().forEach(el => {
            if (el.getName() === 'a') {
                xrefElement = el;
            }
        });

        return xrefElement;
    }

    handleNonXrefElement(selectionText) {
        if (this.citationModule.M_SCOPE.ACTIVE_TAB === 0) {
            this.citationModule.IBOX.addNewBtn.classList.remove('disabled');
        }

        // Create a bookmark for the current selection
        const bookmark = this.editor.getSelection().createBookmarks(true);
        const findId = bookmark[0].startNode;

        return [
            selectionText,
            findId,
            this.citationModule.M_SCOPE.ACTIVE_TAB
        ];
    }

    handleSpecialParentCase(curElement, parent, getMethod) {
        if (parent.$.tagName === "SUP" && parent.getFirst().equals(curElement)) {
            return curElement;
        }

        let temp = parent[getMethod]();
        if (!temp) {
            temp = parent.getParent() ? parent.getParent()[getMethod]() : null;
        }
        return temp;
    }

    isFloatNode(node) {
        // Implementation of Is_Float_Node check
        // This should be implemented based on your specific requirements
        return typeof Is_Float_Node === 'function' ? Is_Float_Node(node) : false;
    }

    handleXrefSelection(curElement, options, isReturnRid) {
        const curPointNode = this.getCurPointNode(curElement);
        if (!this.validateNode(curPointNode, {
                alert: 'InvalidCursor',
                alerttype: 'warning'
            })) {
            return;
        }

        this.adjustSelectionRange(curPointNode);
        return this.processXrefContent(curPointNode, options, isReturnRid);
    }

    getCurPointNode(curElement) {
        if (curElement.$.tagName === 'A') {
            return curElement;
        }

        const nextNode = this.state.nextNode;
        return nextNode && nextNode.$ ? nextNode.$.firstElementChild : null;
    }

    adjustSelectionRange(curPointNode) {
        if (curPointNode.$.tagName === 'A' && curPointNode.$.parentElement.tagName === "SUP") {
            const parentHasSingleChild = curPointNode.$.parentElement.childElementCount === 1;
            this.editor.getSelection().selectElement(
                parentHasSingleChild ? curPointNode : curPointNode.getParent()
            );
        } else if (this.state.prev !== null && this.state.next !== null) {
            this.setRangeForPrevNext();
        }
    }

    setRangeForPrevNext() {
        const ranges = this.editor.getSelection().getRanges()[0];
        const prev = this.state.prev;
        const next = this.state.next;

        ranges.setStart(prev, this.state.isPrev ? 0 : prev.$.textContent.length - 0);
        ranges.setEnd(next, this.state.isNext ? 1 : 0);

        if (prev.type === 1 && prev.getName() === "del") {
            ranges.setStart(prev, 1);
        }

        this.editor.getSelection().selectRanges([ranges]);
    }

    processXrefContent(curPointNode, options, isReturnRid) {
        const selection = this.editor.getSelection();
        const range = selection.getRanges()[0];
        const [startContainer, endContainer] = [range.startContainer, range.endContainer];

        this.citationModule._SNAPSHOT({
            save: true,
            lock: true
        });

        // Handle comments and highlights
        this.handleCommentsAndHighlights(range);

        this.citationModule._SNAPSHOT({
            save: true,
            unlock: true
        });

        // Process selected text and references
        return this.processSelectedContent(selection, isReturnRid);
    }

    handleCommentsAndHighlights(range) {
        const nextNode = range.startContainer.getNext();
        if (nextNode && nextNode.type === 1 && nextNode.getName() === "a") {
            nextNode.find("span[data-high]").toArray().forEach(el => {
                commonMethods.iunWrap(el.$);
            });
        }
    }

    processSelectedContent(selection, isReturnRid) {
        const selectedText = selection.getSelectedText();
        if (selectedText === '') {
            console.log('selection is empty');
            return;
        }

        const references = this.extractReferences(selection);
        if (isReturnRid) {
            return this.citationModule.M_SCOPE.nCiteAttr;
        }

        this.updateUIState(references, selectedText);
        return null;
    }

    extractReferences(selection) {
        const range = selection.getRanges()[0];
        const container = this.editor.document.createElement('div');
        container.append(range.cloneContents());

        const temp_rid = [];
        const temp_role = [];

        let find = $(container.$).find('a');
        if (find.length === 0) {
            find = this.findAlternativeReferences(selection);
        }

        $.each(find, (index, element) => {
            const [rid, xRole] = [
                element.getAttribute('rid'),
                element.getAttribute('data-role')
            ];

            temp_rid.push(rid);
            temp_role.push(xRole);

            this.updateCiteOrder(index, xRole);
        });

        return {
            temp_rid,
            temp_role
        };
    }

    findAlternativeReferences(selection) {
        const startElement = selection.getStartElement();
        if (!startElement) return [];

        const current = startElement;
        const currentTag = current.getName();
        const parent = current.getParent();
        const parentTag = parent && parent.getName() || null;

        if (parentTag && /^a/.test(parentTag)) {
            return [parent];
        }

        if (/^a|insert/.test(currentTag) || (parent && /^a|insert/.test(parentTag))) {
            const element = (currentTag === "a" && parentTag === "insert") ? parent : current;
            return $(element.$).find('a');
        }

        return [];
    }

    updateCiteOrder(index, xRole) {
        if (index === 0) {
            this.citationModule.M_SCOPE.CiteOrder = {};
        }

        if (this.citationModule.M_SCOPE.CiteOrder[xRole] === undefined) {
            this.citationModule.M_SCOPE.CiteOrder[xRole] = Object.keys(
                this.citationModule.M_SCOPE.CiteOrder
            ).length;
        }
    }

    updateUIState(references, selectedText) {
        const {
            temp_rid,
            temp_role
        } = references;

        this.citationModule.M_SCOPE.nCiteAttr = [...temp_rid].join(' ');

        IMPACT_SELECTION.getInfo(this.editor, {
            lock: false
        });

        const uniqueRoles = [...new Set(temp_role)];
        this.State_edit_items(uniqueRoles, this.citationModule.M_SCOPE.nCiteAttr);

        this.citationModule.IBOX.ShowText.value = selectedText;
        $(this.citationModule.IBOX.insertBtn)
            .text('Modify')
            .attr({
                'ztxt': selectedText,
                'title': 'Modify'
            });

        this.citationModule.M_FUN.EditMode();
    }
    processSiblings(curElement, parent) {
        // First check if it's an A tag and set isXrefElm
        if (curElement.$.tagName === 'A') {
            this.state.isXrefElm = true;
            const _Parent = curElement.getParent();
            const _ParentTag = _Parent.$.tagName;

            [this.state.prev, this.state.next].forEach((node, idx) => {
                const [_type_, _boolean_, _get_] = this.getDirectionValues(idx);
                let elm = this.state[_type_] = curElement[_get_]();

                if (elm === null && ["INSERT", 'SUP'].includes(_ParentTag)) {
                    if (_ParentTag === "SUP" && _Parent.getFirst().equals(curElement)) {
                        this.state[_type_] = curElement;
                    } else {
                        let temp = _Parent[_get_]();
                        this.state[_type_] = temp ? temp : _Parent.getParent() ? _Parent.getParent()[_get_]() : null;
                    }
                } else if (parent.tagName === "SPAN" && parent.hasAttribute("data-high")) {
                    // Handle citation in CMD selection
                } else if (this.isFloatNode(curElement) && elm !== null) {
                    this.handleFloatNode(curElement, elm, _type_, _get_);
                }
            });
        }

        // Then process general siblings
        [this.state.prev, this.state.next].forEach((node, idx) => {
            if (!node) return;

            const [_type_, _boolean_, _get_] = this.getDirectionValues(idx);
            let isElmNode = CKEDITOR.NODE_ELEMENT === node.type;
            let text = node.getText();
            let tag = null;

            // Handle filling char sequence
            if (!isElmNode && node.type === CKEDITOR.NODE_TEXT) {
                if (CKEDITOR.dom.selection.FILLING_CHAR_SEQUENCE === text) {
                    node = node[this.constants.SOURCE_NODE_METHODS[idx]]();
                    isElmNode = CKEDITOR.NODE_ELEMENT === node.type;
                }
            }

            tag = node.$ ? node.$.tagName : null;

            // Check for Xref elements
            if (isElmNode && (
                    (tag === 'A') ||
                    (['SUP', 'INSERT'].includes(tag) &&
                        node.$ &&
                        node.$.firstElementChild &&
                        node.$.firstElementChild.tagName === 'A')
                )) {
                this.state.isXrefElm = true;
                curElement = node;

                if (this.isFloatNode(node) && node.getParent() && node.getParent().getName() === "insert") {
                    node = node.getParent();
                }

                this.state.next = typeof node.getNext === "function" ? node.getNext() : node;
                this.state.prev = typeof node.getPrevious === "function" ? node.getPrevious() : node;
            }

            // Handle delimiter for citation
            if (!isElmNode) {
                // Future implementation for handling direct/indirect edit cite
            }
        });

        // Update UI based on isXrefElm state
        if (this.citationModule.M_SCOPE.ACTIVE_TAB === 0) {
            this.citationModule.IBOX.addNewBtn.classList[this.state.isXrefElm ? 'add' : 'remove']('disabled');
        }
    }

    checkTextNode(node, option) {
        try {
            let [textNode, checkSibling, orgNode] = [node.$.textContent, false, node];

            if (CKEDITOR.NODE_ELEMENT === node.$.nodeType) {
                if (['SUP', "A", "INSERT"].includes(node.$.tagName)) {
                    checkSibling = true;
                }
            }

            if (textNode === '' || checkSibling) {
                let temp = node[this.constants.SIBLING_METHODS[option.type]]();
                if (!temp) node = node.getParent();
                let temp1 = node[this.constants.SIBLING_METHODS[option.type]]();
                if (!temp1) node = node.getParent();
                node = node[this.constants.SIBLING_METHODS[option.type]]();
                if (checkSibling) this.state[option.type] = node;
            }

            textNode = node.$.textContent;
            let sibling = node.$[this.constants.ELEMENT_SIBLINGS[option.type]];
            let siblingChar = option.type === 'prev' ? 'lastChar' : 'firstChar';
            let isA = sibling ? (sibling.tagName === 'A' ? true : false) : false;

            return isA && textNode.length <= 5 && ((/, |, |; |;/gi.test(textNode[siblingChar]())) || ((/ and |and|, |,|; |;/gi.test(textNode))));

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('checkTextNode', err.message);
            return false;
        }
    }
    handleFloatNode(curElement, element, type, getMethod) {
        if (!this.isFloatNode(curElement) || !element) {
            return;
        }

        if (element.type === CKEDITOR.NODE_TEXT && element[getMethod]) {
            let sibling = element[getMethod]();
            if (sibling) {
                if (this.isShortTextNode(sibling)) {
                    sibling = sibling[getMethod]();
                }

                if (this.isValidXrefSibling(sibling) &&
                    this.isFloatNode(sibling) &&
                    element.getText().length <= 3) {
                    this.state[type] = sibling;
                }
            }
        }
    }

    isShortTextNode(node) {
        return node.type === CKEDITOR.NODE_TEXT && node.getText().length <= 3;
    }

    isValidXrefSibling(node) {
        return node &&
            node.type === CKEDITOR.NODE_ELEMENT &&
            /a/gi.test(node.getName());
    }

    checkCursorPosition(isReturnRid = false, options = {}) {
        try {
            const selectionData = this.initializeSelection();
            if (!selectionData) return;

            const {
                curElement,
                selectionText,
                nativeSelection,
                range
            } = selectionData;
            let processedElement = this.handleXrefElement(curElement, curElement.$.parentElement);

            if (!processedElement) {
                return [selectionText, null, this.citationModule.M_SCOPE.ACTIVE_TAB];
            }

            this.processSiblings(processedElement, processedElement.getParent());

            if (!this.state.isXrefElm) {
                return this.handleNonXrefElement(selectionText);
            }

            return this.handleXrefSelection(processedElement, options, isReturnRid);
        } catch (error) {
            console.warn(error.message);
            ErrorLogTrace('CheckCursorPosition', error.message);
        }
    }
}
class CursorPositionCheckerNew {
    constructor(editor, citationModule) {
        this.editor = editor;
        this.citation = citationModule;
        this.state = {
            isNext: false,
            isXrefElm: false,
            isPrev: false,
            next: null,
            prev: null,
            nextNode: null,
            prevNode: null
        };
    }

    /**
     * Checks cursor position and handles citation element selection
     * @param {boolean} isReturnRid - Whether to return the rid attribute
     * @param {Object} options - Additional options
     */
    checkCursorPosition(isReturnRid = false, options = {}) {
        try {
            const selectionData = this.initializeSelection();
            if (!selectionData) return null;

            const {
                curElement,
                parent,
                selection,
                range
            } = selectionData;
            const processedElement = this.processInitialElement(curElement, parent);

            if (!processedElement) return null;

            // Set range boundaries and get siblings
            this.setupRange(range);
            this.processSiblings(processedElement);

            // Handle non-Xref elements
            if (!this.state.isXrefElm) {
                return this.handleNonXrefCase(selection);
            }

            // Handle Xref elements
            return this.handleXrefCase(processedElement, options, isReturnRid);
        } catch (error) {
            console.error('CheckCursorPosition error:', error);
            ErrorLogTrace('CheckCursorPosition', error.message);
            return null;
        }
    }

    /**
     * Initialize selection and basic validation
     */
    initializeSelection() {
        const selection = this.editor.getSelection();
        const curElement = selection.getStartElement();
        const parent = curElement.$.parentElement;

        if (!this.validateNode(curElement)) return null;

        const range = selection.getRanges()[0];
        range.collapse(true);
        range.setStartAt(this.editor.editable(), CKEDITOR.POSITION_AFTER_START);

        return {
            curElement,
            parent,
            selection,
            range
        };
    }

    /**
     * Process initial element and determine its type
     */
    processInitialElement(curElement, parent) {
        if (['EM', 'INSERT', 'SPAN'].includes(curElement.$.tagName)) {
            return this.handleSpecialElement(curElement, parent);
        }
        return curElement;
    }

    /**
     * Handle special elements (EM, INSERT, SPAN)
     */
    handleSpecialElement(element, parent) {
        if (parent.tagName === 'A') {
            return element.getParent();
        }

        const anchorElements = element.find('a');
        if (anchorElements.count() > 0) {
            return anchorElements.getItem(anchorElements.count() - 1);
        }

        // Handle nested structure
        let finalElement = null;
        element.getParents().forEach(el => {
            if (el.getName() === 'a') {
                finalElement = el;
            }
        });

        return finalElement;
    }

    /**
     * Setup range and process siblings
     */
    setupRange(range) {
        this.state.next = range.getNextNode();
        this.state.prev = range.getPreviousNode() ||
            (this.state.next && this.state.next.getPreviousSourceNode());
    }

    /**
     * Process element siblings
     */
    processSiblings(element) {
        if (element.$.tagName === 'A') {
            this.processAnchorSiblings(element);
        }
        this.processNodeTypes(element);
    }

    /**
     * Process anchor element siblings
     */
    processAnchorSiblings(element) {
        this.state.isXrefElm = true;
        const parent = element.getParent();
        const parentTag = parent.$.tagName;

        ['prev', 'next'].forEach((type) => {
            let siblingElement = element[this.getSiblingMethod(type)]();

            if (!siblingElement && ['INSERT', 'SUP'].includes(parentTag)) {
                siblingElement = this.handleSpecialParentCase(element, parent, type);
            }

            if (this.isFloatNode(element) && siblingElement) {
                this.handleFloatNodeCase(siblingElement, type);
            }

            this.state[type] = siblingElement;
        });
    }

    /**
     * Handle non-Xref element case
     */
    handleNonXrefCase(selection) {
        if (this.citation.M_SCOPE.ACTIVE_TAB === 0) {
            this.citation.IBOX.addNewBtn.classList.remove('disabled');
        }

        const bookmark = selection.createBookmarks(true);
        return [
            selection.getSelectedText(),
            bookmark[0].startNode,
            this.citation.M_SCOPE.ACTIVE_TAB
        ];
    }

    /**
     * Handle Xref element case
     */
    handleXrefCase(element, options, isReturnRid) {
        const curPointNode = this.getCurPointNode(element);
        if (!this.validateNode(curPointNode)) return null;

        this.adjustSelection(curPointNode);

        if (options.FROM_DEL_CITE) {
            return this.handleDeleteCitation(curPointNode, isReturnRid);
        }

        return this.processXrefContent(curPointNode, isReturnRid);
    }

    /**
     * Process Xref content and update UI
     */
    processXrefContent(node, isReturnRid) {
        const selection = this.editor.getSelection();
        const selectedText = selection.getSelectedText();

        if (!selectedText) {
            console.log('Selection is empty');
            return null;
        }

        const references = this.extractReferences(selection);
        this.updateCitationState(references);

        if (isReturnRid) {
            return this.citation.M_SCOPE.nCiteAttr;
        }

        this.updateUIState(references, selectedText);
        return null;
    }

    /**
     * Extract references from selection
     */
    extractReferences(selection) {
        const container = this.editor.document.createElement('div');
        container.append(selection.getRanges()[0].cloneContents());

        const refs = {
            rids: [],
            roles: []
        };

        const anchors = container.find('a');
        anchors.count() && anchors.forEach(anchor => {
            refs.rids.push(anchor.getAttribute('rid'));
            refs.roles.push(anchor.getAttribute('data-role'));
        });

        return refs;
    }

    /**
     * Update citation state with extracted references
     */
    updateCitationState(references) {
        this.citation.M_SCOPE.nCiteAttr = references.rids.join(' ');
        this.citation.M_SCOPE.CiteOrder = {};

        references.roles.forEach((role, index) => {
            if (this.citation.M_SCOPE.CiteOrder[role] === undefined) {
                this.citation.M_SCOPE.CiteOrder[role] = Object.keys(
                    this.citation.M_SCOPE.CiteOrder
                ).length;
            }
        });
    }

    /**
     * Update UI state with processed references
     */
    updateUIState(references, selectedText) {
        IMPACT_SELECTION.getInfo(this.editor, {
            lock: false
        });

        const uniqueRoles = [...new Set(references.roles)];
        this.State_edit_items(uniqueRoles, this.citation.M_SCOPE.nCiteAttr);

        // Update citation box
        this.citation.IBOX.ShowText.value = selectedText;
        $(this.citation.IBOX.insertBtn)
            .text('Modify')
            .attr({
                'ztxt': selectedText,
                'title': 'Modify'
            });

        this.citation.M_FUN.EditMode();
    }

    /**
     * Utility method to get sibling method name
     */
    getSiblingMethod(type) {
        return type === 'prev' ? 'getPrevious' : 'getNext';
    }

    /**
     * Validate node
     */
    validateNode(node, options = {
        alert: 'CiteWarningAlert',
        alerttype: 'warning'
    }) {
        if (!node) {
            if (options.alert) {
                TOASTER_ALERT(options.alert, {
                    type: options.alerttype
                });
            }
            return false;
        }
        return true;
    }

    /**
     * Check if node is a float node
     */
    isFloatNode(node) {
        // Implementation based on your Is_Float_Node function
        return typeof Is_Float_Node === 'function' && Is_Float_Node(node);
    }
}

function fireEvent() {
    try {

    } catch (error) {
        console.error('check failed:', error);
        alert('Kindly use updated version.');
    }
}

if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function() {
        fireEvent();
    });
} else if (document.attachEvent) {
    // For IE8 and earlier versions 
    document.attachEvent('onreadystatechange', function() {
        if (document.readyState === 'complete') {
            fireEvent();
        }
    });
}

function CheckCursorPosition(IsReturn_rid, Options = {}, _ = CitationNewModule, $this) {
    $this = this;
    const Obj = {
        IsNext: false,
        IsXrefElm: false,
        IsPrev: false,
        next: null,
        prev: null,
        nextNode: null,
        prevNode: null,
        GET_SIBILING: {
            0: 'getPrevious',
            1: 'getNext',
            'prev': 'getPrevious',
            'next': 'getNext'
        },
        GET_SOURCE_NODE: {
            0: 'getPreviousSourceNode',
            1: 'getNextSourceNode',
        },
        GET_ELM_SIBILING: {
            'prev': 'previousElementSibling',
            'next': 'nextElementSibling'
        },
        WHILE_COUNT: {
            'prev': 0,
            'next': 0
        }
    };

    try {
        // Initialize selection and basic elements
        const selection = GlobalEditor.getSelection();
        let curElm = selection.getStartElement();
        let Parent = curElm.$.parentElement;
        const SelectionText = selection.getSelectedText();
        const nativeCollation = selection.getNative();
        const oRange = selection.getRanges()[0];

        // Validate current element
        if (!_.M_FUN.NODE_VALIDATE(curElm, {
                alert: 'CiteWarningAlert',
                alerttype: 'warning'
            })) return;

        // Setup initial range
        oRange.collapse(true);
        oRange.setStartAt(GlobalEditor.editable(), CKEDITOR.POSITION_AFTER_START);

        // Get initial next and prev nodes
        Obj.next = oRange.getNextNode();
        Obj.prev = oRange.getPreviousNode() || (Obj.next && Obj.next.getPreviousSourceNode());

        // Handle special cases for nodes within curElm
        if (Obj.next && Obj.next.getParent().equals(curElm)) {
            Obj.next = curElm.getNext();
            Obj.prev = curElm.getPrevious();
        }

        // Set sibling nodes from native selection
        Obj.nextNode = nativeCollation.anchorNode.nextElementSibling;
        Obj.prevNode = nativeCollation.anchorNode.previousElementSibling;

        // Process special elements (EM, INSERT, SPAN)
        if (['EM', 'INSERT', "SPAN"].includes(curElm.$.tagName)) {
            curElm = processSpecialElement(curElm, Parent);
            if (curElm) Parent = curElm.$.parentElement;
        }

        // Handle anchor elements
        if (curElm.$.tagName == 'A') {
            Obj.IsXrefElm = true;
            processAnchorElement(curElm, Parent, Obj);

            // Process siblings for anchor elements
            processSiblings(curElm, Obj);
        }

        // Update UI based on XRef status
        if (_.M_SCOPE.ACTIVE_TAB == 0) {
            _.IBOX.addNewBtn.classList[Obj.IsXrefElm ? 'add' : 'remove']('disabled');
        }

        // Handle non-XRef elements
        if (!Obj.IsXrefElm) {
            return [SelectionText, null, _.M_SCOPE.ACTIVE_TAB];
        }

        // Handle XRef elements
        return handleXrefElement(curElm, Obj, Options, IsReturn_rid, _, $this);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('CheckCursorPosition', err.message);
    }
}

// Helper functions
function processSpecialElement(element, parent) {
    if (parent.tagName == 'A') {
        return element.getParent();
    }

    let find = element.find("a");
    if (find.count() > 0) {
        return find.getItem(find.count() - 1);
    }

    // Handle nested structure
    let finalElement = element;
    element.getParents().forEach(el => {
        if (el.getName() == "a") {
            finalElement = el;
        }
    });
    return finalElement;
}

function processAnchorElement(curElm, Parent, Obj) {
    const _Parent = curElm.getParent();
    const _ParentTag = _Parent.$.tagName;

    [0, 1].forEach(idx => {
        const type = idx === 0 ? 'prev' : 'next';
        const getMethod = Obj.GET_SIBILING[idx];
        let elm = curElm[getMethod]();

        if (elm === null && ["INSERT", 'SUP'].includes(_ParentTag)) {
            if (_ParentTag == "SUP" && _Parent.getFirst().equals(curElm)) {
                Obj[type] = curElm;
            } else {
                let temp = _Parent[getMethod]();
                Obj[type] = temp || (_Parent.getParent() ? _Parent.getParent()[getMethod]() : null);
            }
        } else if (Parent.tagName == "SPAN" && Parent.hasAttribute("data-high")) {
            // Handle highlighting case
        } else if (Is_Float_Node(curElm) && elm !== null) {
            processFloatNode(elm, type, getMethod, Obj);
        }
    });
}

function processFloatNode(elm, type, getMethod, Obj) {
    if (elm.type == CKEDITOR.NODE_TEXT && elm[getMethod]) {
        let sibiling = elm[getMethod]();
        if (sibiling) {
            if (sibiling.type == CKEDITOR.NODE_TEXT && sibiling.getText().length <= 3) {
                sibiling = sibiling[getMethod]();
            }
            if (sibiling &&
                sibiling.type == CKEDITOR.NODE_ELEMENT &&
                /a/gi.test(sibiling.getName()) &&
                Is_Float_Node(sibiling) &&
                elm.getText().length <= 3) {
                Obj[type] = sibiling;
            }
        }
    }
}

function processSiblings(curElm, Obj) {
    [Obj.prev, Obj.next].forEach((node, idx) => {
        if (!node) return;

        let isElmNode = CKEDITOR.NODE_ELEMENT == node.type;
        let txt = node.getText();

        // Handle filling char sequence
        if (!isElmNode && node.type == CKEDITOR.NODE_TEXT) {
            if (CKEDITOR.dom.selection.FILLING_CHAR_SEQUENCE == txt) {
                node = node[Obj.GET_SOURCE_NODE[idx]]();
                isElmNode = CKEDITOR.NODE_ELEMENT == node.type;
            }
        }

        const tag = node.$ ? node.$.tagName : null;

        // Process element nodes
        if (isElmNode && isValidXrefElement(tag, node)) {
            handleXrefSibling(node, curElm, Obj);
        }
    });
}

function isValidXrefElement(tag, node) {
    return (tag == 'A') ||
        (['SUP', 'INSERT'].includes(tag) &&
            node.$ &&
            node.$.firstElementChild &&
            node.$.firstElementChild.tagName == 'A');
}

function handleXrefSibling(node, curElm, Obj) {
    Obj.IsXrefElm = true;
    curElm = node;

    if (Is_Float_Node(node) && node.getParent() && node.getParent().getName() == "insert") {
        node = node.getParent();
    }

    Obj.next = typeof node.getNext == "function" ? node.getNext() : node;
    Obj.prev = typeof node.getPrevious == "function" ? node.getPrevious() : node;
}

function handleXrefElement(curElm, Obj, Options, IsReturn_rid, _, $this) {
    const curPointNode = getCurPointNode(curElm, Obj);
    if (!validateNode(curPointNode, _, 'InvalidCursor')) return;

    adjustSelectionRange(curPointNode, Obj, GlobalEditor);
    return processXrefContent(curPointNode, Options, IsReturn_rid, _, $this);
}

function getCurPointNode(curElm, Obj) {
    return (curElm.$.tagName == 'A') ?
        curElm :
        (Obj.nextNode && Obj.nextNode.$ ? Obj.nextNode.$.firstElementChild : null);
}

function validateNode(node, _, alertType) {
    return _.M_FUN.NODE_VALIDATE(node, {
        alert: alertType,
        alerttype: 'warning'
    });
}