let globalManager = null;

class ElementManager {
    constructor() {
        if (globalManager) {
            return globalManager;
        }

        this.processedClasses = new Set();
        this.processedIds = new Set();
        this.baseId = null;
        this.elements = new Map();
        this.targets = new Map();
        this.counters = new Map();
        // Default base ID
        this.baseId = 'IMP2-';
        // Track new elements
        this.newlyGeneratedElements = new Set();
        this.globalDocument = null;

        globalManager = this;
        return this;
    }

    static initialize(document) {
        /**
         * Initialize the manager by scanning document
         * @param {Document} document - The document to scan
         * @return {ElementManager} - The global manager instance
         */
        const manager = new ElementManager();
        manager.scanDocument(document);
        return manager;
    }

    static getInstance() {
        if (!globalManager) {
            throw new Error('ElementManager not initialized. Call initialize() first.');
        }
        return globalManager;
    }
    parseTargetFromElement(element) {
        /**
         * Parse target information from element with data-target-id
         * @param {jQuery} element - jQuery element
         * @return {object} - Parsed target information
         */
        const targetId = element.attr('data-target-id');
        return {
            id: targetId,
            targetType: 'para-id',
            specificUse: element.attr('data-name') || 'default',
            value: element.attr('data-para-id') || '',
            retain: element.attr('retain') === 'true',
            baseId: (() => {
                const match = targetId.match(/^(workid-[A-Z0-9]+-[a-z]+-[a-z]+-\d+)/);
                return match ? match[1] : undefined;
            })()
        };

    }
    scanDocument(document) {
        try {
            if (!this.globalDocument) {
                this.globalDocument = document;
            }

            const elements = document.find("div").toArray();
            const baseIds = new Map();
            let hasMatchingPattern = false;

            const result = elements.map(element => {
                const el = $(element.$);
                const id = el.attr("id");
                const className = el.attr("class");

                if (!id || !className) return null;

                if (!this.processedIds.has(id)) {
                    // ? !this.processedClasses.has(className) &&
                    this.processedClasses.add(className);
                    this.processedIds.add(id);

                    // Try to extract base ID pattern
                    // Updated regex to capture groups up to the 5th element
                    const baseIdMatch = id.match(/^(workid-[A-Z0-9]+-[a-z]+-[a-z]+-\d+)/);

                    if (baseIdMatch) {
                        hasMatchingPattern = true;
                        // The base ID up to the 5th group
                        const baseId = baseIdMatch[1];
                        baseIds.set(baseId, (baseIds.get(baseId) || 0) + 1);
                    }

                    const element = {
                        tag: el.prop("tagName").toLowerCase(),
                        id,
                        className,
                        element: el
                    };
                    if (!this.elements.has(className)) {
                        this.elements.set(className, []);
                    }
                    this.elements.get(className).push(element);

                    return element;
                }
                return null;
            }).filter(Boolean);

            // Set the most common base ID if pattern found, otherwise keep default
            if (hasMatchingPattern) {
                let maxCount = 0;
                baseIds.forEach((count, id) => {
                    if (count > maxCount) {
                        maxCount = count;
                        this.baseId = id;
                    }
                });
            } else {
                console.log("No matching base ID pattern found, using default 'IMP2-'");
            }

            // New: Scan for targets
            const targets = document.find("[data-target-id]").toArray();
            targets.forEach(element => {
                const el = $(element.$);
                const targetInfo = this.parseTargetFromElement(el);
                if (targetInfo) {
                    this.addTarget(targetInfo);
                }
            });

            this.initializeCounters();
            return result;
        } catch (error) {
            console.error("Error scanning document:", error);
            throw error;
        }
    }

    initializeCounters() {
        /**
         * Initialize counters based on existing elements
         */
        this.elements.forEach((elements, className) => {
            const numbers = elements
                .map(el => {
                    const match = el.id.match(/-(\d+)$/);
                    return match ? parseInt(match[1], 10) : 0;
                })
                .filter(Boolean);

            this.counters.set(className, Math.max(0, ...numbers));
        });
    }

    generateId(className) {
        /**
         * Generate a new unique ID and create element with synchronized label index
         * @param {string} className - Class name
         * @return {object} - Element object with tag, id, className and DOM element
         */

        /**
         * Generate a new unique ID based on type
         * @param {string} type - Type of ID to generate ('target' or other)
         * @param {object} options - Additional options
         * @return {object} - Generated element or target info
         */

        if (!this.globalDocument) {
            this.globalDocument = GlobalEditor.document;
        }

        if (className === 'target') {
            const {
                specificUse = 'default',
                    targetType = 'para-id',
                    retain = false
            } = options;

            // Get current highest target number
            const currentHighest = Math.max(
                ...Array.from(this.processedTargets)
                .map(id => {
                    const match = id.match(/-target-(\d+)$/);
                    return match ? parseInt(match[1], 10) : 0;
                })
            );


            const newNumber = currentHighest + 1;
            const newId = `${this.baseId}-target-${newNumber}`;

            const targetInfo = {
                id: newId,
                targetType,
                specificUse,
                value: '',
                retain,
                baseId: this.baseId,
                isNew: true
            };

            // Add to tracking
            this.processedTargets.add(newId);
            if (!this.targets.has(specificUse)) {
                this.targets.set(specificUse, []);
            }
            this.targets.get(specificUse).push(targetInfo);

            return targetInfo;


            /* 
            const manager = ElementManager.getInstance();

            // Generate a new target
            const newTarget = manager.generateId('target', {
                specificUse: 'chapter-title',
                retain: true
            });

            // Create a title span
            const titleSpan = $('<span>', {
                'class': 'title',
                'data-name': 'title',
                'data-label': 'Chapter 1',
                'idata-enter-af': 'yes',
                'iPageID': '1',
                'data-para-id': 'C1',
                'data-target-id': newTarget.id,
                'retain': 'true',
                text: 'Good Reasons?'
            });
            
            */
        }


        // Get current highest count from document
        let currentCount = Math.max(
            this.findCurrentCountInDocument(this.globalDocument, className),
            this.counters.get(className) || 0
        );

        let newId;
        let exists = true;

        // Keep incrementing until we find an unused ID
        while (exists) {
            currentCount++;
            newId = `${this.baseId}-${className}-${currentCount}`;

            // Check if ID exists in document
            const existingElement = this.globalDocument.find(`#${newId}`);
            exists = existingElement && existingElement.length > 0;

            // Also check our tracking collections
            if (!exists && this.processedIds.has(newId)) {
                exists = true;
            }
        }

        // Get attributes and structure from existing elements in collection
        let attributesToCopy = {};
        let labelIndex = currentCount;
        const existingElements = this.elements.get(className) || [];

        if (existingElements.length > 0) {
            // Use the last element as template
            const lastItem = existingElements[existingElements.length - 1];
            const lastElement = lastItem.element[0];
            // Copy attributes from template element
            if (lastElement.attributes) {
                Object.values(lastElement.attributes).forEach((attr) => {
                    // Match exact attribute names (case-insensitive)
                    if (!/^(class|data-name|id)$/i.test(attr.name)) {
                        attributesToCopy[attr.name] = attr.value;
                    }
                });
            }
            if (lastElement.className == "fn") {
                // Get the last label index from template element structure
                const labelSpan = $(lastElement).find('.label');
                if (labelSpan.length) {
                    const lastIndex = parseInt(labelSpan.text(), 10);
                    if (!isNaN(lastIndex)) {
                        labelIndex = lastIndex + 1;
                    }
                }
            }
        }
        /*
        // Create new element structure with copied attributes
        const newElement = $('<div/>', {
            ...attributesToCopy,
            'class': className,
            'data-name': className,
            id: newId,
            'data-new': 's'
        });
        
        // Create paragraph div
        const pDiv = $('<div/>', {
            'class': 'p',
            'data-role': '',
            'data-name': 'p',
            id: `${this.baseId}-${currentCount}`
        });

        newElement.append(pDiv);
        // Assemble the structure
        newElement.append(labelSpan);
        // Create label span
        const labelSpan = $('<span/>', {
            'class': 'label',
            'data-name': 'label',
            'contenteditable': 'false'
        }).text(labelIndex);
        */

        // Create element object
        const element = {
            id: newId,
            isNew: true,
            labelIndex,
            attributes: attributesToCopy,
            // element: newElement,
            structure: {
                /* label: [{
                    type: 'label',
                    attributes: {
                        'class': 'label',
                        'data-name': 'label',
                        'contenteditable': 'false'
                    },
                    text: labelIndex.toString()
                }],
                p: [{
                    type: 'p',
                    attributes: {
                        'class': 'p',
                        'data-role': '',
                        'data-name': 'p',
                        id: `${this.baseId}-${currentCount}`
                    }
                }] */
            }
        };

        return element;
    }

    findCurrentCountInDocument(document, className) {
        /**
         * Find the current highest count for a class in the document
         * @param {Document} document - The document to search
         * @param {string} className - The class to search for
         * @return {number} - The highest count found
         */
        let highestCount = 0;
        try {
            const elements = document.find(`.${className}`).toArray();
            elements.forEach(element => {
                const el = $(element.$);
                const id = el.attr("id");
                if (id) {
                    const countMatch = id.match(/-(\d+)$/);
                    if (countMatch) {
                        const count = parseInt(countMatch[1], 10);
                        highestCount = Math.max(highestCount, count);
                    }
                }
            });
        } catch (error) {
            console.error("Error finding current count:", error);
        }
        return highestCount;
    }
    getNewlyGeneratedElements() {
        /**
         * Get all newly generated elements
         * @return {Array} - Array of newly generated elements
         */
        return Array.from(this.newlyGeneratedElements);
    }
    find(className) {
        /**
         * Find all elements with given className
         * @param {string} className - Class name to search for
         * @return {Array} - Array of matching elements
         */
        return this.elements.get(className) || [];
    }

    get(id) {
        /**
         * Get element by ID
         * @param {string} id - Element ID to find
         * @return {object|null} - Matching element or null
         */
        for (const elements of this.elements.values()) {
            const element = elements.find(el => el.id === id);
            if (element) return element;
        }
        return null;
    }

    getBaseId() {
        /**
         * Get current base ID
         * @return {string|null} - Current base ID
         */
        return this.baseId;
    }

    getProcessedElements() {
        /**
         * Get all processed elements
         * @return {Array} - Array of all processed elements
         */
        return Array.from(this.elements.values()).flat();
    }
    getTargetsByRetain(retain = true) {
        /**
         * Get all targets with specific retain value
         * @param {boolean} retain - Retain value to filter by
         * @return {Array} - Array of matching targets
         */
        const result = [];
        this.targets.forEach(targetGroup => {
            targetGroup.forEach(target => {
                if (target.retain === retain) {
                    result.push(target);
                }
            });
        });
        return result;
    }
    reset() {
        /**
         * Reset all tracking sets and maps
         */
        this.processedClasses.clear();
        this.processedIds.clear();
        this.elements.clear();
        this.counters.clear();
        this.targets.clear();
        this.baseId = null;
    }
}

const waitForInitialLoad = () => {
    return new Promise((resolve, reject) => {
        // 30 seconds timeout
        const timeoutDuration = 30000;

        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            reject(new Error("Waiting for InitialLoadDialog timed out"));
        }, timeoutDuration);

        const intervalId = setInterval(() => {
            if (window.InitialLoadDialog && window.InitialLoadDialog.FullyLoaded) {
                console.log("InitialLoadDialog is fully loaded!");
                clearInterval(intervalId);
                clearTimeout(timeoutId);
                resolve();
            }
            // Check every 100ms
        }, 100);
    });
};

const initializeManager = (document) => {
    try {
        const manager = ElementManager.initialize(document);
        console.log("Detected base ID:", manager.getBaseId());
        console.log("Processed elements:", manager.getProcessedElements());
        return manager;
    } catch (error) {
        console.error("Failed to initialize manager:", error);
        throw error;
    }
};

const initializeAndUse = async (document) => {
    try {
        await waitForInitialLoad();
        const manager = initializeManager(document);

        if (manager) {
            // Example usage with document parameter
            const newElement = manager.generateId("book-part");
            console.log("Generated element:", newElement);

            // Get newly generated elements
            const newElements = manager.getNewlyGeneratedElements();
            console.log("Newly generated elements:", newElements);

            return manager;
        }
    } catch (error) {
        console.error("Error during initialization and usage:", error);
        throw error;
    }
};

// Setup the initialization
const setupElementManager = () => {
    const intervalId = setInterval(() => {
        if (window.InitialLoadDialog && window.InitialLoadDialog.FullyLoaded) {
            clearInterval(intervalId);
            initializeAndUse(GlobalEditor.document)
                .then(manager => {
                    console.log("ElementManager setup complete");
                    // Expose the manager globally if needed
                    window.elementManager = manager;
                })
                .catch(error => {
                    console.error("ElementManager setup failed:", error);
                });
        }
    }, 2500);
};


// Start the setup process
// setupElementManager();