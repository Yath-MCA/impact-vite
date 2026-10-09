/**
 * Interest Level Management Module
 * Manages interest level indicators for citations and references
 */



// Constants
const INTEREST_LEVELS = {
    NONE: 'none',
    SPECIAL: 'special',
    OUTSTANDING: 'outstanding'
};

const interestMap = {
    '■■': INTEREST_LEVELS.OUTSTANDING,
    '■': INTEREST_LEVELS.SPECIAL,
    '▪▪': INTEREST_LEVELS.OUTSTANDING,
    '▪': INTEREST_LEVELS.SPECIAL
};

// Reverse lookup: value to key
function getSymbolFromLevel(level) {
    return Object.keys(interestMap).find(symbol => interestMap[symbol] === level) || '';
}

function processElement(element, textSource = element) {
    const text = textSource.textContent || '';
    const dataValue = element.getAttribute('data-value') || '';

    for (const [symbol, level] of Object.entries(interestMap)) {
        if (text.includes(symbol)) {

            // if (IS_LOCAL_HOST) debugger;

            element.setAttribute('data-interest-level', level);
            textSource.textContent = text.replace(symbol, '');
            if (element.hasAttribute('data-value')) {
                element.setAttribute('data-value', dataValue.replace(symbol, ''));
            }
            return;
        }
    }
}

function convertTextModeToAttributeMode() {

    debug.log("-----convertTextModeToAttributeMode-");

    try {
        GlobalEditor.document.$.querySelectorAll('.ref .label').forEach(label =>
            processElement(label)
        );

        GlobalEditor.document.$.querySelectorAll('a.xref[data-role="bibr"]:not([data-remove])').forEach(citation => {
            const sup = citation.querySelector('sup.sup');
            processElement(citation, sup || citation);
            if (sup) sup.remove();
        });
    } catch (err) {
        interest_logError("convertTextModeToAttributeMode", err);
    }
}

// Command definitions for interest level changes
const commands_InterestLevel = [{
        name: 'INTEREST_LEVEL_NONE',
        action: 'interest_level_none',
        label: 'None',
        icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
        order: 210
    },
    {
        name: 'INTEREST_LEVEL_SPECIAL',
        action: 'interest_level_special',
        label: 'Special',
        icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
        order: 211
    },
    {
        name: 'INTEREST_LEVEL_OUTSTANDING',
        action: 'interest_level_outstanding',
        label: 'Outstanding',
        icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
        order: 212
    }
];

// Store for menu items
const menuItems_InterestLevel = {};



/**
 * Common method to handle interest level changes
 * @param {Object} options - Configuration options
 * @param {string} options.evt - Event type
 * @param {HTMLElement|string} options.target - Target element or selector
 * @param {Object} options.self - Module context (default: MultiRefModule)
 * @param {function} options.findTargets - Method to find related targets
 * @param {boolean} fromContext - Whether the change is triggered from context menu
 * @returns {Array} - Modified target elements
 */
function handleInterestLevelCommon(options, fromContext = true, self = MultiRefModule) {
    var {
        evt,
        target,
        findTargets
    } = options;

    if (!evt) evt = getAnnotationType();

    try {
        const {
            EDIT_MODE,
            INSERT_MODE
        } = self.M_SCOPE;
        const attributeName = 'data-interest-level';
        const oldAttributeName = 'data-interest-level-old';
        const attributes = {
            'data-level': 'new',
            'default': ["dt", "du", "drn"]
        };
        // Find target elements using provided function
        const targets = findTargets ? findTargets(target) : [target instanceof jQuery ? target[0] : target];

        targets.forEach(elem => {
            // Skip if not in edit or insert mode and not from context
            if (!(EDIT_MODE || INSERT_MODE) && !fromContext) return;

            // Preserve original attribute if not already set
            if (elem.hasAttribute && !elem.hasAttribute(oldAttributeName)) {
                elem.setAttribute(oldAttributeName, elem.getAttribute(attributeName) || '');
            }

            // Set attribute based on event type
            if (evt.includes("none")) {
                elem.removeAttribute(attributeName);
            } else {
                const newValue = evt.includes("special") ? INTEREST_LEVELS.SPECIAL : INTEREST_LEVELS.OUTSTANDING;
                elem.setAttribute(attributeName, newValue);
            }

            if (EDIT_MODE || (!EDIT_MODE && fromContext)) {

                attributes['data-level'] = "edit";

                const ref = elem.dataset.name == "ref" ? elem : elem.closest(".ref");
                if (ref) {
                    if (ref.hasAttribute("data-username") || !ref.hasAttribute("data-new")) {
                        commonMethods.setAttr(elem, attributes);
                    }
                }
            }
        });

        return targets;
    } catch (err) {
        interest_logError('handleInterestLevelCommon', err);
        return [];
    }
}

/**
 * Handles interest level changes in reference list
 * @param {string} evt - Event type
 * @param {HTMLElement} target - Target reference list item
 * @param {boolean} fromContext - Whether the change is triggered from context menu
 * @param {Object} self - Module context
 */
function handleInterestLevelChange_RefList(evt, target, fromContext = true, self = MultiRefModule) {
    try {
        // Find the label within the target
        const label = target.querySelector(".label");
        const refId = target.id;

        if (!label) return;


        // Handle label modification
        handleInterestLevelCommon({
            evt,
            target: label,
            findTargets: () => [label]
        }, fromContext);

        // Propagate changes to citations
        handleInterestLevelChange_Citations(evt, refId, self);
    } catch (err) {
        interest_logError("handleInterestLevelChange_RefList", err);
    }
}

/**
 * Handles interest level changes in citations
 * @param {string} evt - Event type
 * @param {string} rid - Reference ID
 * @param {Object} self - Module context
 */
function handleInterestLevelChange_Citations(evt, rid, self = MultiRefModule) {
    try {


        // Convert text mode to attribute mode for references and citations
        convertTextModeToAttributeMode();

        // Find all citations with the given reference ID
        const citations = GlobalEditor.document.$.querySelectorAll(`a[rid*='${rid}']:not([data-remove])`);

        // Process individual citations
        citations.forEach(citation => {
            // Apply interest level to the individual citation
            applyInterestLevelToCitation(citation, evt);
        });

        // Find and process citation groups (ranges)
        processCitationGroups();
    } catch (err) {
        interest_logError("handleInterestLevelChange_Citations", err);
    }
}




/**
 * Applies interest level to a citation element
 * @param {HTMLElement} citation - Citation element
 * @param {string} evt - Event type indicating interest level
 */
function applyInterestLevelToCitation(citation, evt) {
    try {
        const {
            EDIT_MODE,
            INSERT_MODE
        } = MultiRefModule.M_SCOPE;
        const attributes = {
            'data-level': EDIT_MODE ? 'edit' : 'new',
            'default': ["dt", "du", "drn"]
        };
        const interestLevel = evt.includes("special") ? INTEREST_LEVELS.SPECIAL : evt.includes("outstanding") ? INTEREST_LEVELS.OUTSTANDING : null;
        var canTrack = false;

        if (interestLevel) {
            attributes['data-interest-level'] = interestLevel;
            canTrack = true;
        } else {
            if (citation.hasAttribute('data-interest-level')) {
                canTrack = true;
            }
            citation.removeAttribute('data-interest-level');
        }
        if (canTrack) commonMethods.setAttr(citation, attributes);

    } catch (err) {
        interest_logError("applyInterestLevelToCitation", err);
    }

}

function selectAndDeleteConsecutiveRange(elements, {
    highlight = false,
    autoClear = 2000,
    deleteRange = false
} = {}) {
    if (!elements || elements.length === 0) return "";

    const doc = GlobalEditor.document.$;
    const win = GlobalEditor.window;
    const range = doc.createRange();
    const selection = win.$.getSelection();

    range.setStartBefore(elements[0]);
    range.setEndAfter(elements[elements.length - 1]);

    if (highlight) {
        selection.removeAllRanges();
        selection.addRange(range);

        if (autoClear) {
            setTimeout(() => selection.removeAllRanges(), autoClear);
        }
    }

    const selectedText = range.toString();

    if (deleteRange) {
        let currentNode = elements[0];
        const endNode = elements[elements.length - 1];

        while (currentNode) {
            const next = currentNode.nextSibling;
            currentNode.remove();
            if (currentNode === endNode) break;
            currentNode = next;
        }
    }

    return selectedText;
}


function isSiblingConsecutiveItem(currentEl, _unusedIdx, allGroups) {
    const parent = currentEl.parentElement;
    if (!parent) return false;

    const nodes = Array.from(parent.childNodes);
    const startIndex = nodes.indexOf(currentEl);
    if (startIndex === -1) return false;

    const ATTR_NAME = "data-interest-level";

    const getRidValues = (el) => {
        if (!el || !el.getAttribute) return [];
        const ridAttr = el.getAttribute("rid") || "";
        return ridAttr
            .split(" ")
            .filter(Boolean)
            .map(rid => ({
                original: rid,
                numeric: parseInt(rid.replace("CIT", ""), 10)
            }))
            .filter(obj => !isNaN(obj.numeric));
    };

    const baseInterestLevel = currentEl.getAttribute(ATTR_NAME);
    if (!baseInterestLevel) return false;

    let fullRidList = [];
    let matchedEls = [currentEl];

    let sequence = getRidValues(currentEl);
    if (sequence.length === 0) return false;

    fullRidList.push(...sequence.map(obj => obj.original));
    let lastValue = sequence[sequence.length - 1].numeric;

    let totalCount = sequence.length;

    let i = startIndex + 1;
    for (; i < nodes.length; i++) {
        const node = nodes[i];

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            // Skip commas or empty
            if (text === "," || text === "") continue;
            // Other text, stop
            break;
        }

        if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.matches('a[rid][data-role="bibr"]') &&
            allGroups.includes(node)
        ) {
            const thisLevel = node.getAttribute(ATTR_NAME);
            // Different level, stop
            if (thisLevel !== baseInterestLevel) break;

            const currentRids = getRidValues(node);
            if (currentRids.length === 0) break;

            for (let j = 0; j < currentRids.length; j++) {
                const expected = lastValue + 1;
                if (currentRids[j].numeric === expected) {
                    fullRidList.push(currentRids[j].original);
                    lastValue = currentRids[j].numeric;
                    totalCount++;
                } else {
                    // Non-consecutive, stop
                    return false;
                }
            }

            matchedEls.push(node);
        } else {
            // Not a citation node
            break;
        }
    }

    // Before returning, ensure no more same-level xrefs exist after matchedEls
    for (; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text === "," || text === "") continue;
            break;
        }

        if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.matches('a[rid][data-role="bibr"]') &&
            allGroups.includes(node)
        ) {
            const thisLevel = node.getAttribute(ATTR_NAME);
            if (thisLevel === baseInterestLevel) {
                // Another same-level xref found, not allowed
                return false;
            } else {
                // Different level, it's okay to ignore
                break;
            }
        } else {
            break;
        }
    }

    if (totalCount >= 3) {
        return {
            level: baseInterestLevel,
            rids: fullRidList,
            elements: matchedEls
        };
    }

    return false;
}




/**
 * Process citation groups to format ranges according to interest level rules
 */

function processCitationGroups() {
    if (IS_LOCAL_HOST) debugger;
    debug.log("-----processCitationGroups-");

    if (!MultiRefModule.trackManager) MultiRefModule.trackManager = window._trackManager;

    try {
        const ATTR_NAME = "data-interest-level";
        const refScope = iREF_SCOPE.Reference || {};
        const dataInterestLevelAlias = refScope["data-interest-level"];

        if (!dataInterestLevelAlias) return;

        // Find all citation groups (elements with multiple rid values)
        const citationGroups = GlobalEditor.document.$.querySelectorAll(`a[rid*=' '][data-role="bibr"], a[rid][data-role="bibr"]`);
        const interestlevelRef = {};

        // Populate interestlevelRef with reference IDs and their interest levels
        GlobalEditor.document.$.querySelectorAll(".ref").forEach(function(ref) {
            const label = ref.querySelector(".label");
            if (ref.id && label) {
                interestlevelRef[ref.id] = label.getAttribute(ATTR_NAME) || null;
            }
        });

        citationGroups.forEach(function(group, idx, arr) {

            if (IS_LOCAL_HOST && group.scrollIntoView) group.scrollIntoView();

            const ridAttr = group.getAttribute("rid");
            // Skip if rid is missing
            if (!ridAttr) return;

            const ridList = ridAttr.split(" ");
            // Skip if no valid ridList
            if (ridList.length === 0) return;

            // Handle single citation case
            if (ridList.length === 1 && ridList[0]) {

                var first = ridList[0];
                var newLvl = interestlevelRef[first];

                if (newLvl) {
                    group.setAttribute(ATTR_NAME, newLvl);
                } else {
                    group.removeAttribute(ATTR_NAME);
                }

                const result = isSiblingConsecutiveItem(group, idx, Array.from(arr));
                if (result) {
                    const {
                        elements,
                        rids,
                        level
                    } = result;
                    const newCitation = createCitationElement(rids, level);
                    console.log("Consecutive citation group found:", rids);

                    const newInsDom = window._trackManager.getInsNode(newCitation, {
                        childOnly: true
                    });

                    // newInsDom.append(...Array.from(newCitation.childNodes));
                    // $(newCitation).html('').append(newInsDom);
                    elements[0].before(newInsDom);

                    // No highlight, just delete silently and get text
                    const selText = selectAndDeleteConsecutiveRange(elements, {
                        deleteRange: true,
                        highlight: false
                    });
                    newCitation.setAttribute("data-del-val", selText);
                }
                return;
            }

            // Get interest levels for each reference in the group
            const interestLevels = ridList.map(function(rid) {
                return interestlevelRef[rid] ? interestlevelRef[rid] : null;
            });

            // Check if all values are null
            const allNull = interestLevels.every(level => level === null);

            if (!allNull) {
                // Restructure the citation group if needed
                restructureCitationGroup(group, ridList, interestLevels);
            }

        });
    } catch (err) {
        interest_logError("processCitationGroups", err);
    }
}


/**
 * Restructure a citation group based on interest levels
 * @param {HTMLElement} group - Citation group element
 * @param {Array<string>} ridList - List of reference IDs
 * @param {Array<string | null>} interestLevels - Interest levels for each reference
 */

function restructureCitationGroup(group, ridList, interestLevels) {
    if (IS_LOCAL_HOST) debugger;
    debug.log("-----restructureCitationGroup----");

    if (!MultiRefModule.trackManager) MultiRefModule.trackManager = window._trackManager;

    try {
        // Check if a middle item has a value (excluding first & last)
        const middleHasValue = interestLevels.slice(1, -1).some(level => level !== null);
        /*
        if (!middleHasValue) {
            // No middle interest level? Keep as a single group
            // First interest level
            const firstLevel = interestLevels[0];
            // Last interest level
            const lastLevel = interestLevels[interestLevels.length - 1];
            const firstRef = parseInt(ridList[0].replace('CIT', ''), 10);
            const lastRef = parseInt(ridList[ridList.length - 1].replace('CIT', ''), 10);
            const InsRoot = group.querySelector("insert");
            // Handle different cases based on first and last levels
            if (firstLevel || lastLevel) {
                // Both first and last have levels
                const symbol = firstLevel ? getSymbolFromLevel(firstLevel) : "";
                const firstSpan = firstLevel ? `<span data-show-interest-level="${firstLevel}">${symbol}</span>` : "";
                const lastSpan = `<span data-show-interest-level="${lastLevel}">${lastLevel}</span>`;
                const innerUpdateItem = `${firstRef}${firstSpan}–${lastRef}`;
                InsRoot ? InsRoot.innerHTML = innerUpdateItem : group.innerHTML = innerUpdateItem;
                group.setAttribute('data-interest-level', lastLevel);
            } else {
                // Neither has level
                // group.textContent = `${firstRef}–${lastRef}`;
                group.removeAttribute('data-interest-level');
                group.removeAttribute('data-concurrent-levels');
            }
            return;
        }
        */
        // Otherwise, split the group
        let newNodes = [];
        let currentLevel = null;
        let rangeStart = 0;


        for (let i = 0; i <= interestLevels.length; i++) {
            if (i === interestLevels.length || interestLevels[i] !== currentLevel) {
                if (i > rangeStart) {


                    const newInsDom = MultiRefModule.trackManager.getInsNode();

                    const sliceRids = ridList.slice(rangeStart, i);
                    const newCitation = createCitationElement(sliceRids, currentLevel);

                    // Clone and append the <insert> if present
                    newInsDom.append(...Array.from(newCitation.childNodes));
                    newCitation.appendChild(newInsDom);

                    newNodes.push(newCitation);

                    // Add comma if not the last element
                    if (i < interestLevels.length) {
                        newNodes.push(document.createTextNode(','));
                    }
                }
                rangeStart = i;
                currentLevel = i < interestLevels.length ? interestLevels[i] : null;
            }
        }
        $(group).replaceWith(newNodes);
    } catch (err) {
        interest_logError("restructureCitationGroup", err);
    }
}


function createCitationElement(subRidList, level) {
    if (IS_LOCAL_HOST) debugger;
    debug.log("-----createCitationElement----");

    /* 
    New Example Outputs:
    subRidList (Input)	textContent (Output)
    ["CIT1"]	1
    ["CIT1", "CIT3"]	1, 3
    ["CIT1", "CIT2", "CIT3"]	1–3
    ["CIT1", "CIT2", "CIT4", "CIT5"]	1, 2, 4, 5
    ["CIT1", "CIT2", "CIT3", "CIT5", "CIT6", "CIT7"]	1–3, 5–7
    For Your Example:
    javascript
    Copy
    Edit
    createCitationElement(["CIT1", "CIT2", "CIT5", "CIT4"])
    ➡️ Output:
    
    Copy
    Edit
    1, 2, 4, 5
    This ensures that only 3+ consecutive numbers are grouped with while others stay comma-separated. 🚀
    
    */

    try {
        const newCitation = commonMethods.setAttr("a", {
            'class': 'xref',
            'data-name': 'xref',
            'data-role': 'bibr',
            'ref-type': 'bibr',
            'rid': subRidList.join(' '),
        });

        // Convert 'CIT' prefixed IDs to numbers and sort them
        const refNums = subRidList.map(rid => parseInt(rid.replace('CIT', ''), 10)).sort((a, b) => a - b);

        // Only generate the span once for the entire citation
        const symbol = level ? getSymbolFromLevel(level) : "";
        const interestSpan = level ? `<span data-show-interest-level="${level}">${symbol}</span>` : "";


        let citationText = "";
        let tempGroup = [];

        for (let i = 0; i < refNums.length; i++) {
            // Push current number into tempGroup
            tempGroup.push(refNums[i]);

            // Check if next number is NOT consecutive or if it's the last element
            if (i === refNums.length - 1 || refNums[i + 1] !== refNums[i] + 1) {
                if (tempGroup.length >= 3) {
                    // Format as range for 3 or more consecutive numbers
                    citationText += (citationText ? "," : "") + `${tempGroup[0]}${interestSpan}–${tempGroup[tempGroup.length - 1]}`;
                } else {
                    // Format as individual numbers
                    citationText += (citationText ? "," : "") + tempGroup.join(",");
                }
                // Reset for next group
                tempGroup = [];
            }
        }

        newCitation.innerHTML = citationText;

        if (level) newCitation.setAttribute('data-interest-level', level);

        return newCitation;
    } catch (err) {
        interest_logError("createCitationElement", err);
    }
}
/**
 * 
 * 
 */


/**
 * Handles annotation preview
 * @param {string} interestLevel - Interest level type
 * @param {string} annotationText - Annotation text
 * @param {Object} self - Module context
 */
function handleAnnotationPreview(interestLevel, annotationText, self = MultiRefModule) {
    try {
        // Early validation checks
        if (!isValidContext(self)) return;

        const {
            M_SCOPE,
            ELEMENTS
        } = self;
        const {
            previewDiv
        } = ELEMENTS;

        // Initialize last annotation if needed
        if (!M_SCOPE.LAST_ANNOTATION) M_SCOPE.LAST_ANNOTATION = {};

        const {
            EDIT_MODE,
            INSERT_MODE,
            CUR_REF,
            LAST_ANNOTATION
        } = M_SCOPE;

        // Check if we're in a valid editing state
        if (!previewDiv || !(EDIT_MODE || INSERT_MODE)) return;

        // Get UI elements
        const currentLabel = previewDiv.querySelector(".label");
        const currentMixed = previewDiv.querySelector(".mixed-citation");
        const isRemoved = interestLevel === "none" && EDIT_MODE && !!annotationText;

        // Update interest level
        self.M_SCOPE.LAST_ANNOTATION.type = interestLevel;
        if (currentLabel) currentLabel.setAttribute("data-interest-level", interestLevel);

        // If there's annotation text to process
        if (annotationText || annotationText == "" && EDIT_MODE) {
            const notePara = createNoteElement(annotationText, INSERT_MODE ? 'new' : 'edit');
            self.M_SCOPE.LAST_ANNOTATION.NOTE = notePara;

            if (INSERT_MODE) {
                handleInsertMode(previewDiv, notePara, currentMixed);
            } else if (EDIT_MODE && CUR_REF) {
                handleEditMode(notePara, annotationText, isRemoved, self);
            }
        }


    } catch (err) {
        interest_logError("handleAnnotationPreview", err);
    }
}

// Helper functions
function isValidContext(self) {
    return self && self.M_SCOPE && self.ELEMENTS;
}

function createNoteElement(annotationText, annotationType) {
    return `<div class="note" data-name="note" id="${GENERATE_ID()}"><div class="p" data-name="p"  id="${GENERATE_ID()}" data-annotation="${annotationType}">${annotationText}</div></div>`;
}

function handleInsertMode(previewDiv, notePara, currentMixed) {
    $(previewDiv).find(".note, .p[data-annotation]").remove();
    const target = currentMixed ? $(currentMixed) : $(previewDiv);
    target[currentMixed ? "after" : "append"](notePara);
}

function handleEditMode(notePara, annotationText, isRemoved, self = MultiRefModule) {
    try {

        const {
            M_SCOPE,
            ELEMENTS,
            trackManager
        } = self;
        const {
            INSERT_MODE,
            EDIT_MODE,
            CLONE_REF,
            CUR_REF,
            REF_ID
        } = M_SCOPE;
        const {
            previewDiv
        } = ELEMENTS;
        const ckRef = GlobalEditor.document.getById(REF_ID).$;
        const finalCloneNode = ckRef != CLONE_REF ? ckRef.cloneNode(true) : CLONE_REF;

        const currentMixed = previewDiv.querySelector(".mixed-citation");
        const isNewItem = CUR_REF.hasAttribute("data-new");
        const insertItem = CUR_REF.firstElementChild;
        const isSameUser = isNewItem && insertItem && commonMethods.IS_SAME_USER_AND_ROLE(insertItem);

        const clonedMixed = finalCloneNode.querySelector(".mixed-citation");

        let cloneAnnotation = clonedMixed && clonedMixed.nextElementSibling || null;
        let annotationPara = currentMixed && currentMixed.nextElementSibling || null;

        if (!annotationPara && cloneAnnotation) {
            annotationPara = cloneAnnotation.cloneNode(true);
            currentMixed.after(annotationPara);
        }

        if (!self.trackManager) {
            self.trackManager = window._trackManager;
        }

        if (isSameUser && !EDIT_MODE) {
            return;
        }


        const insNode = window._trackManager.getInsNode();
        const delNode = window._trackManager.getDelNode();

        if (!cloneAnnotation && (!annotationPara || /INSERT|DIV/gi.test(annotationPara.tagName))) {
            handleNewAnnotation(annotationPara, previewDiv, currentMixed, notePara, isNewItem, insNode, isSameUser);
        } else if (cloneAnnotation && annotationPara) {
            updateExistingAnnotation(annotationPara, cloneAnnotation, annotationText, isRemoved, insNode, delNode);
        }
    } catch (err) {
        interest_logError("handleEditMode", err);
    }
}

function handleNewAnnotation(annotationPara, previewDiv, currentMixed, notePara, isNewItem, insNode, isSameUser) {
    try {
        if (annotationPara && (annotationPara.tagName === "INSERT" || isSameUser)) {
            $(annotationPara).remove();
        }

        $(previewDiv).find(isSameUser ? ".note .p[data-annotation],.p[data-annotation]" : "insert .note .p[data-annotation],insert .p[data-annotation]").remove();

        const target = currentMixed ? $(currentMixed) : $(previewDiv);
        const insertLogic = currentMixed ? "after" : "append";

        isNewItem ? target[insertLogic](notePara) : target[insertLogic]($(insNode).append(notePara));
    } catch (err) {
        interest_logError("handleNewAnnotation", err);
    }
}


function updateExistingAnnotation(annotationPara, cloneAnnotation, annotationText, isRemoved, insNode, delNode) {
    try {

        const existingData = cloneAnnotation.textContent.trim();
        const trimData = annotationText.trim();

        // Get the existing insert element and collect all deletion elements
        const insEl = annotationPara.querySelector("insert");
        const delElements = Array.from(annotationPara.querySelectorAll("del"));
        const delList = delElements.map(el => el && el.cloneNode(true));
        const textContentList = delList.map(el => el.textContent);

        const firstNode = annotationPara.firstElementChild;
        const isDelNode = firstNode.tagName == "DEL";

        // Remove same user insert elements
        if (commonMethods.IS_SAME_USER_AND_ROLE(insEl)) {
            $(insEl).remove();
        }

        // Case 1: Content matches and is being removed
        if (existingData === trimData && isRemoved) {
            $(delNode).append(cloneAnnotation);
            $(annotationPara).html("").append(delNode);
        }
        // Case 2: Content differs and needs updating
        else if (existingData !== trimData) {
            $(insNode).append(annotationText);
            $(delNode).append(existingData);
            $(annotationPara).html("").append(delNode, insNode);
        }
        // Case 3: Once changed none then revert to any other level
        else if (firstNode && (isDelNode || trimData == textContentList) && !isRemoved) {
            const para = firstNode.querySelector(".p");
            para ? firstNode.after(para) : firstNode.after(...firstNode.childNodes);
            commonMethods.removeEl(firstNode);
        }
    } catch (err) {
        interest_logError("updateExistingAnnotation", err);
    }
}


function getAnnotationOption(labValue, getElm = true) {
    let val;
    if (labValue === "none" || /none/i.test(labValue)) {
        val = "annotationOptionNone";
    } else if (labValue === "special" || /special/i.test(labValue)) {
        val = "annotationOptionSingle";
    } else if (labValue === "outstanding" || /outstanding/i.test(labValue)) {
        val = "annotationOptionDouble";
    }
    return getElm ? document.getElementById(val) : val;
}


function handle_showLoop_Edit(evt = '', options = {}, refModule) {
    refModule = MultiRefModule;
    try {
        const {
            isExistingInterest,
            interestAction,
            isNoneAction,
            isSpecialAction,
            removeOfInterest,
            addOfInterest
        } = options;

        var formElement = refModule.Panel.querySelector("form");
        var previewElement = refModule.ELEMENTS.previewDiv;
        var inputGroup = document.getElementById("annotations-form-group");
        var inputField = document.getElementById("annotations-input");
        var chooseField = document.getElementById("annotationOptionNone");
        var isShow = evt == "show";
        var {
            INSERT_MODE,
            EDIT_MODE,
            CUR_REF
        } = refModule.M_SCOPE;
        var {
            timestamp = 0, type, target, action, pubType, isPlainText
        } = GlobalEditor.contextMenu.interest_level_last || {};

        // ? default - hidden
        inputGroup.classList.add("ds-none");
        chooseField.checked = true;

        if (INSERT_MODE) refModule.M_SCOPE.LAST_ANNOTATION = {};

        var clickOptions = setInterval(function() {
            if (refModule && refModule.ELEMENTS && refModule.ELEMENTS.AnnateGroup) {
                if (commonMethods.IsVisibleElm(refModule.ELEMENTS.AnnateGroup)) {

                    if (refModule.Panel) {

                        if (EDIT_MODE) {
                            if (pubType != "journal" || isPlainText) {
                                TOASTER_ALERT("module_wip_interest_lvl", {
                                    type: "warning"
                                });
                                return;
                            }

                            if (inputGroup && inputField) {
                                var mixed = CUR_REF.querySelector(".mixed-citation");
                                var lab = CUR_REF.querySelector(".label");
                                var next = mixed ? mixed.nextElementSibling : null;
                                var labValue = lab ? lab.getAttribute("data-interest-level") : null;
                                var target = labValue ? getAnnotationOption(labValue) : null;

                                if (next && /note|p|ice-ins/gi.test(next.className) && lab && target) {
                                    inputGroup.classList.remove("ds-none");
                                    inputField.value = next.textContent;
                                    target.checked = true;
                                    if (previewElement) previewElement.append(next.cloneNode(true));
                                }

                                inputGroup.classList.remove("ds-none");

                                if (typeof inputField.scrollIntoView === "function") {
                                    inputField.scrollIntoView({
                                        behavior: "smooth",
                                        block: "end"
                                    });
                                } else {
                                    window.scrollTo(0, inputField.offsetTop);
                                }

                                var params1 = type ? type : action ? action : null;
                                var targetType = getAnnotationOption(params1, !0);
                                if (targetType && typeof targetType.click == "function") {
                                    targetType.click();
                                }
                                inputField.focus();
                            }
                        }
                        annotation_handle_key_event("edit");
                    }
                    clearInterval(clickOptions);
                }
            }
        }, 250);
        convertTextModeToAttributeMode();
        GlobalEditor.contextMenu.interest_level_last = {};
    } catch (err) {
        interest_logError("handle_showLoop_Edit", err);
    }
}

/**
 * Setup editor commands and menu items for Interest Level
 * @param {CKEDITOR.editor} editor - CKEditor instance
 * @param {Array} commands - Array of command configurations
 */
function setupEditorCommands_InterestLevel(editor, commands) {
    try {
        commands.forEach(item => {
            // Add command with execution logic
            editor.addCommand(item.name, {
                exec: async function(editor) {
                    try {

                        convertTextModeToAttributeMode();

                        // Check and initiate multi-reference module
                        await MultiRefModule.checkInitiating();

                        // Get target from editor context or selection
                        const context = editor.contextMenu.interest_level_last || {};
                        const {
                            pubType,
                            isPlainText
                        } = context;

                        if ((pubType && pubType != "journal") || isPlainText) {

                            TOASTER_ALERT("module_wip_interest_lvl", {
                                type: "warning"
                            });
                            return null;
                        }

                        // if (context && context.timestamp) {}
                        Object.assign(editor.contextMenu.interest_level_last, {
                            action: item.action,
                            type: item.action,
                            timestamp: new Date().getTime()
                        });

                        const IMS = IMPACT_SELECTION;
                        const TARGET = getTarget(editor, IMS);

                        if (!TARGET || !TARGET.$) {
                            console.warn("No valid target found for interest level change");
                            return;
                        }
                        const TARGET_ID = TARGET.getAttribute("id");
                        const lab = TARGET.$.querySelector(".label");
                        const AttrVal = lab && lab.getAttribute("data-interest-level");

                        // Handle interest level change
                        var isExistingInterest = /special|outstanding/gi.test(AttrVal);
                        var interestAction = /special|outstanding/gi.test(item.action);
                        var isNoneAction = /none/gi.test(item.action);
                        var isSpecialAction = /special/gi.test(item.action);

                        var swapOfIntertest = interestAction && isExistingInterest;
                        var removeOfInterest = isNoneAction && isExistingInterest;
                        var addOfInterest = !AttrVal && interestAction;

                        if (swapOfIntertest) {
                            handleInterestLevelChange_RefList(item.action, TARGET.$, true);
                        } else if (addOfInterest || removeOfInterest) {
                            if (typeof MultiRefModule !== "undefined") {
                                const params = CommonUtils.createParams("edit", TARGET_ID);
                                MultiRefModule.show(TARGET_ID, params);
                            }
                        } else if (item.action && item.action == "none") {

                        }
                    } catch (err) {
                        interest_logError(`${item.name}.exec`, err);
                    }
                }
            });

            // Skip menu item creation if ignored
            if (item.ignore_menu) return;

            // Create menu item configuration
            menuItems_InterestLevel[item.name] = {
                label: item.label,
                icon: item.icon,
                command: item.name,
                group: 'InterestLevelGroup',
                order: item.order
            };
        });

        // Add menu items to the editor
        editor.addMenuItems(menuItems_InterestLevel);

    } catch (err) {
        interest_logError("setupEditorCommands_InterestLevel", err);
    }
}

/**
 * Initialize context menu for interest level changes
 * @param {CKEDITOR.editor} editor - CKEditor instance
 */
function initializeContextMenu(editor) {
    try {
        if (!editor.contextMenu) return;

        editor.contextMenu.addListener((element, selection, elementPath) => {
            // Get reference node
            let refNode = (elementPath && (elementPath.block || elementPath.blockLimit));

            if (!refNode) return null;
            else refNode = refNode.$;

            const IMS = IMPACT_SELECTION;
            const {
                notallowed,
                'data-interest-level': dataInterestLevelAlias
            } = iREF_SCOPE.Reference || {};


            // Check conditions for showing context menu
            const isRefGroup = Boolean(refNode.closest(SEARCH_KEY.ref));
            const isInRefGroup = isRefGroup || IMS.IsRefGroup;
            const isDeleted = refNode.hasAttribute('data-remove');
            const isNotAllowed = notallowed === "yes";


            if (!isInRefGroup || isNotAllowed || !dataInterestLevelAlias || isDeleted) {
                return null;
            }
            const isLocked = window.paraLock && window.paraLock._isEnabled ? window.paraLock.isLockedByOther(element) : false;
            if (isLocked) null;

            convertTextModeToAttributeMode();

            const MIXED_GROUP = refNode.querySelector('.mixed-citation');
            const pubType = MIXED_GROUP.getAttribute('publication-type');
            const isPlainText = (refNode.hasAttribute("data-ins-type") && refNode.getAttribute("data-ins-type") == "plain_text");

            // Find label within reference node
            const bulletLabel = refNode.querySelector(".label");
            if (!bulletLabel) return null;

            // Store context for command execution
            const currentType = bulletLabel.getAttribute("data-interest-level");
            editor.contextMenu.interest_level_last = {
                type: currentType,
                action: currentType,
                target: refNode,
                timestamp: (new Date()).getTime(),
                pubType,
                isPlainText
            };

            // Set menu item states based on current type
            return {
                changeInterestLevel: {
                    tristate: CKEDITOR.TRISTATE_OFF,
                    menuItems: {
                        'INTEREST_LEVEL_NONE': currentType === INTEREST_LEVELS.NONE ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF,
                        'INTEREST_LEVEL_SPECIAL': currentType === INTEREST_LEVELS.SPECIAL ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF,
                        'INTEREST_LEVEL_OUTSTANDING': currentType === INTEREST_LEVELS.OUTSTANDING ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF
                    }
                }
            };
        });

    } catch (err) {
        interest_logError("initializeContextMenu", err);
    }
}

/**
 * Editor listener to setup context menu and commands for Interest Level
 * @param {CKEDITOR.editor} editor - Editor instance
 */
function editorListener_InterestLevel(editor) {
    try {
        // Use global editor or main editor instance if not provided
        if (!editor) {
            editor = (GlobalEditor ? GlobalEditor : CKEDITOR.instances.maineditor);
        }

        // Add menu group if not exists
        const menuGroup = editor._.menuGroups;
        if (!menuGroup.InterestLevelGroup) {
            editor.addMenuGroup('InterestLevelGroup', 210);
        }

        // Register the context menu item
        editor.addMenuItem('changeInterestLevel', {
            label: 'Change Interest Level',
            group: 'InterestLevelGroup',
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            getItems: function() {
                return {
                    'INTEREST_LEVEL_NONE': {
                        label: 'None',
                        command: 'INTEREST_LEVEL_NONE'
                    },
                    'INTEREST_LEVEL_SPECIAL': {
                        label: 'Special',
                        command: 'INTEREST_LEVEL_SPECIAL'
                    },
                    'INTEREST_LEVEL_OUTSTANDING': {
                        label: 'Outstanding',
                        command: 'INTEREST_LEVEL_OUTSTANDING'
                    }
                };
            }
        });

        // Setup commands and menu items
        setupEditorCommands_InterestLevel(editor, commands_InterestLevel);

        // Initialize context menu
        initializeContextMenu(editor);
    } catch (err) {
        console.warn(err.message);
        interest_logError('editorListener_InterestLevel', err);
    }
}

function getAnnotationType(canReturnNotealso) {
    var current_type = $('#annotationOptionSingle').is(':checked') ? 'special' : $('#annotationOptionDouble').is(':checked') ? 'outstanding' : "none";
    var current_note = $('#annotations-input').val();
    return canReturnNotealso ? {
        INTEREST_TYPE: current_type,
        NOTE_TXT: current_note
    } : current_type;
}

function annotation_handle_key_event(evt = "show") {
    try {
        setTimeout(() => {}, 500);
        let $annotations = $('#annotations-input');
        if (evt == "show") $annotations.focus();

        // Determine selected option
        let annotationType = getAnnotationType();
        $annotations.off('input change paste').on('input change paste',
            Debounce_Event((e) => {
                handleAnnotationPreview(annotationType, e.target.value);
                // Attach event handlers with debounce
                // if (e.target.value.trim() !== "") { }
                // Check if value is not empty                
            })
        );
    } catch (err) {
        console.warn(err.message);
        interest_logError('editorListener_InterestLevel', err);
    }
}

function Handle_InsertOperation(anchorEl, newRef, notePara, CURRENT_MODEL, INSERT_MODE, options = {}) {
    var captureUpdate = {
        anchorEl: anchorEl,
        newRef: newRef,
        alert: false
    };
    try {
        const isPlainText = CURRENT_MODEL === "plain_text";
        const isPlainForm = CURRENT_MODEL === "open_form";
        const isDOIForm = CURRENT_MODEL === "doi_form";

        const ref_lab = newRef.querySelector(".label");


        var {
            INTEREST_TYPE,
            NOTE_TXT
        } = getAnnotationType(true);


        const err_key = "annatation_txt_content";
        if (INTEREST_TYPE != "none") {
            if (INSERT_MODE) {
                if (!NOTE_TXT || (NOTE_TXT && $("<span>").append(NOTE_TXT).text().trim().length < 10)) {
                    captureUpdate.alert = err_key;

                    TOASTER_ALERT(err_key, {
                        type: "warning"
                    });

                    return captureUpdate;
                }
                // Wrap anchorEl inside a <span> to modify its attributes
                // Clone to prevent modifying original reference
                var tempContainer = $("<span>").append(anchorEl);

                // Update the `data-interest-level` attribute
                tempContainer.find("a").attr("data-interest-level", INTEREST_TYPE);

                // Store the updated element instead of string
                captureUpdate.anchorEl = tempContainer.prop("innerHTML");

                const mixed = newRef.querySelector(".mixed-citation");
                const inside_mixed_note = mixed.querySelector("[data-annotation]");

                if (isDOIForm || isPlainForm) {
                    if (inside_mixed_note) {
                        $(mixed).after(inside_mixed_note);
                    } else $(mixed).after(notePara);
                } else if (isPlainText) {
                    if (inside_mixed_note) $(mixed).after(inside_mixed_note);
                    else $(mixed).parent().append(notePara);
                }

                if (ref_lab) {
                    ref_lab.setAttribute("data-interest-level", INTEREST_TYPE);
                }
            } else {
                if (ref_lab) {
                    ref_lab.setAttribute("data-interest-level", INTEREST_TYPE);
                }
            }
        }

    } catch (err) {
        interest_logError('Handle_InsertOperation', err);
    } finally {
        return captureUpdate;
    }
}

function Hande_Other_Input_Evt_bubbles(INTEREST_LEVEL) {

    try {
        const {
            'data-interest-level': dataInterestLevelAlias
        } = iREF_SCOPE.Reference || {};

        if (INTEREST_LEVEL || dataInterestLevelAlias) {
            const annotations = document.getElementById('annotations-input');

            setTimeout(() => {
                // Fire an input event
                annotations.dispatchEvent(new Event('input', {
                    bubbles: false
                }));
                // 500ms delay
            }, 1500);
        }
    } catch (err) {
        interest_logError('Hande_Other_Input_Evt_bubbles', err);
    }
}


const interest_logError = (functionName, error) => {
    console.warn(`Error in ${functionName}: ${error.message}`);
    ErrorLogTrace(`MultiRefModule ${functionName}`, error.message);
};

// Initialize when editor is ready
document.addEventListener('DOMContentLoaded', function() {

    CKEDITOR.on('instanceReady', function(ev) {
        // Initialize editor event listeners
        editorListener_InterestLevel(ev.editor);

        const ATTR_NAME = "data-interest-level";
        const refScope = iREF_SCOPE.Reference || {};
        const dataInterestLevelAlias = refScope[ATTR_NAME];

        if (dataInterestLevelAlias) {
            convertTextModeToAttributeMode();
        }
    });

    var CUSTOM_TOASTER_MESSAGE = {
        'module_wip_interest_lvl': {
            'text': "This features (Plain text / Non Journal Reference) is currently unavailable for this journal specification."
        },
    };

    Object.assign(ALERT_MESSAGE, CUSTOM_TOASTER_MESSAGE);
});


function removeInterestSymbol(str, symbols = '■,▪') {
    try {
        const symbolArray = symbols.includes(',') ? symbols.split(',') : [symbols];
        let result = str;

        for (const symbol of symbolArray) {
            const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedSymbol, 'g');
            result = result.replace(regex, '');
        }

        return result;
    } catch (err) {
        return str;
    }
}

// Optional export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleInterestLevelCommon,
        handleInterestLevelChange_RefList,
        handleInterestLevelChange_Citations,
        handleAnnotationPreview,
        INTEREST_LEVELS
    };
}