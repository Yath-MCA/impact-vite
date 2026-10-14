/**
 * Enhanced DocumentManager Class
 * Handles document element management with chapter awareness and global ID registry
 */
class DocumentManager {
    // Singleton constructor
    constructor() {
        if (DocumentManager.instance) {
            return DocumentManager.instance;
        }
        this.initializeProperties();
        this.initializeConfigurations();
        DocumentManager.instance = this;
    }

    /**
     * Initialize all properties
     * @private
     */
    initializeProperties() {
        // Core tracking
        this.processedElements = new WeakSet();
        this.elements = new Map();

        // Enhanced global registry
        this.globalRegistry = {
            // All IDs across document
            ids: new Set(),
            // IDs by chapter
            chapterIds: new Map(),
            // Elements by chapter
            elementsByChapter: new Map(),
            // Base IDs by chapter
            chapterBaseIds: new Map(),
            // Counters by chapter
            countersByChapter: new Map(),
            // Highest numbers used globally
            highestNumbers: {
                chapter: 0,
                para: 0,
                fig: 0,
                'table-wrap': 0,
                box: 0,
                note: 0,
                target: 0
            }
        };

        // Document references
        this.editor = null;
        this.globalDocument = null;
        this.globalDocBody = null;

        // Section tracking
        this.documentSections = {
            front: null,
            body: null,
            back: null,
            back_refList: null
        };

        // Counter states and buffers
        this.bufferStates = {
            // Progressive buffer amounts
            amounts: [25, 50, 100],
            // Track buffer applications
            applications: new Map(),
            // Last buffer amount applied
            lastApplied: new Map()
        };

        // Debug settings
        this.debug = IS_LOCAL_HOST;
        this.debugMode = {
            logIdGeneration: true,
            logBufferAddition: true,
            logChapterOperations: true
        };

        // Base IDs
        this.baseId = '';
        this.baseTargetId = '';
        this.isOHO = commonMethods.getClientCode({ format: "upper" }) == "OHO";
        this.isOSO = commonMethods.getClientCode({ format: "upper" }) == "OSO";
        this.isTNF = commonMethods.getClientCode({ format: "upper" }) == "TNF";
        this.isOXMEDO = commonMethods.getClientCode({ format: "upper" }) == "OXMEDO";
    }

    // initializeConfigurations() - remains same
    // static getInstance() - remains same
    // initialize() - remains same

    /**
     * Initialize configuration settings
     * @private
     */
    initializeConfigurations() {
        // Elements to skip during processing
        this.skippedElements = new Set([
            'abstract',
            'related-object',
            'kwd-group',
            'contrib-group',
            'title-group',
            'fn-group',
            'ref-list'
        ]);

        // Element type prefix mappings
        this.elementTypes = {
            'chapter': 'C',
            'appendix': 'A',
            'para': 'P',
            'fig': 'F',
            'table-wrap': 'T',
            'box': 'B',
            'note': 'N',
            'section': 'S'
        };

        // ID patterns for validation
        this.idPatterns = {
            chapter: /^C(\d+)/,
            para: /^(?:C\d+)?P(\d+)$/,
            fig: /^C(\d+)F(\d+)$/,
            'table-wrap': /^C(\d+)T(\d+)$/,
            box: /^C(\d+)B(\d+)$/,
            note: /^C(\d+)N(\d+)$/,
            target: /^.*-target-(\d+)$/
        };

        // Base configuration
        // this.baseTargetId = 'DOC';
        this.validSections = ['front', 'body', 'back'];


        // Processing configurations
        this.processingConfig = {
            // Number of elements to process in each batch
            batchSize: 50,
            // Maximum retries for failed operations
            maxRetries: 3,
            // Delay between retries in milliseconds
            retryDelay: 1000,
            // Whether to auto-save after processing
            autoSave: true,
            // Whether to validate IDs during processing
            validateIds: true
        };

        // Error handling configurations
        this.errorConfig = {
            // Whether to suppress warning messages
            suppressWarnings: false,
            // Whether to log errors to console
            logErrors: true,
            // Whether to throw errors or handle silently
            throwOnError: false,
            // Custom error handling callback
            errorCallback: null
        };
    }


    setUpEditorInstance() {
        // Set up editor reference
        this.editor = window.GlobalEditor || window.CKEDITOR.instances.maineditor;
        if (!this.editor) {
            throw new Error('Editor instance not found');
        }

        // Set up document references
        this.globalDocument = this.editor.document;
        this.globalDocBody = this.globalDocument.getBody().$;
    }

    /**
     * Creates and shows a progress modal for document processing
     * @param {string} title - Title for the progress modal
     * @param {number} totalElements - Total number of elements to process
     * @param {boolean} [showCancelButton=true] - Whether to show a cancel button
     * @param {string} [modalId='document-manager-progress'] - ID for the modal element
     * @returns {Object} Modal control object with methods and properties
     */
    createProgressModal(title, totalElements, showCancelButton = true, modalId = 'document-manager-progress') {
        // Check if modal already exists and remove it
        let existingModal = document.getElementById(modalId);
        if (existingModal && existingModal.parentNode) {
            existingModal.parentNode.removeChild(existingModal);
        }

        // Create new progress modal
        let progressModal = document.createElement('div');
        progressModal.id = modalId;
        progressModal.style.position = 'fixed';
        progressModal.style.top = '50%';
        progressModal.style.left = '50%';
        progressModal.style.transform = 'translate(-50%, -50%)';
        progressModal.style.background = 'white';
        progressModal.style.padding = '20px';
        progressModal.style.borderRadius = '5px';
        progressModal.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
        progressModal.style.zIndex = '-999999';
        // hide modal initially
        progressModal.style.visibility = 'hidden';


        // Build modal HTML
        let modalHTML = `
        <h3>${title}</h3>
        <div id="${modalId}-bar" style="width: 300px; height: 20px; background: #eee; border-radius: 10px; overflow: hidden;">
            <div id="${modalId}-fill" style="height: 100%; width: 0%; background: #4CAF50; transition: width 0.3s;"></div>
        </div>
        <div id="${modalId}-text" style="text-align: center; margin-top: 10px;">Processing elements (0/${totalElements})</div>
    `;

        // Add cancel button if requested
        if (showCancelButton) {
            modalHTML += `<button id="${modalId}-cancel-btn" style="margin-top: 10px; padding: 5px 10px;">Cancel</button>`;
        }

        progressModal.innerHTML = modalHTML;
        document.body.appendChild(progressModal);

        // Set up cancel button functionality if it exists
        const cancelButton = document.getElementById(`${modalId}-cancel-btn`);
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.processingCancelled = true;
                document.getElementById(`${modalId}-text`).textContent = 'Cancelling...';
            });
        }

        // Reset cancel flag
        this.processingCancelled = false;

        // Return object with methods to control the modal
        return {
            /**
             * Updates the progress display
             * @param {number} processedCount - Number of processed elements
             */
            updateProgress: (processedCount) => {
                const progressPercent = Math.min(100, Math.round((processedCount / totalElements) * 100));
                document.getElementById(`${modalId}-fill`).style.width = `${progressPercent}%`;
                document.getElementById(`${modalId}-text`).textContent =
                    `Processing elements (${processedCount}/${totalElements})`;
            },

            /**
             * Closes and removes the modal
             */
            close: () => {
                const modal = document.getElementById(modalId);
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            },

            /**
             * Sets custom message text
             * @param {string} message - Message to display
             */
            setMessage: (message) => {
                document.getElementById(`${modalId}-text`).textContent = message;
            },

            /**
             * Reference to the modal DOM element
             */
            element: progressModal,

            /**
             * Gets the current cancel status
             * @returns {boolean} Whether processing has been cancelled
             */
            isCancelled: () => this.processingCancelled
        };
    }


    /**
     * Determine base IDs from existing elements (legacy method, now enhanced)
     * @private
     */
    determineBaseIds(root) {
        // First discover chapter-specific base IDs
        this.discoverChapterBaseIds();

        // Legacy processing for backward compatibility
        const baseIdCounts = new Map();
        const elements = root ? root : this.globalDocBody.querySelectorAll('[data-target-id]');

        // Collect unique IDs
        let processedIds = new Set(
            Array.from(elements).map(el => el.getAttribute('data-target-id'))
        );

        // Fallback to secondary source if no IDs are found
        if (processedIds.size === 0 && this.globalRegistry) {
            processedIds = this.globalRegistry.ids;
        }

        // Find most common base ID pattern from target IDs
        processedIds.forEach(id => {
            const baseMatch = id.match(/^(workid-[A-Z0-9]+-book-part-\d+)(-target-\d+)$|^(book-part-\d+)$/);
            if (baseMatch) {
                const baseId = baseMatch[1] || baseMatch[3];
                baseIdCounts.set(baseId, (baseIdCounts.get(baseId) || 0) + 1);
            }
        });

        // Update global base IDs if legacy processing found different ones
        let maxCount = 0;
        baseIdCounts.forEach((count, baseId) => {
            if (count > maxCount) {
                maxCount = count;
                // Only update if we don't have chapter-specific base IDs
                if (this.globalRegistry.chapterBaseIds.size === 0) {
                    this.baseId = baseId;
                    this.baseTargetId = baseId;
                }
            }
        });

        this.log(`Base IDs determined: 
            Global baseId: ${this.baseId}
            Global baseTargetId: ${this.baseTargetId}
            Chapter-specific base IDs: ${this.globalRegistry.chapterBaseIds.size} chapters`, 'general');
    }


    /**
     * Initialize or get chapter counters
     * @private
     * @param {number} chapterNumber - Chapter number
     * @returns {Object} Chapter counters
     */
    getChapterCounters(chapterNumber) {
        if (!this.globalRegistry.countersByChapter.has(chapterNumber)) {
            this.globalRegistry.countersByChapter.set(chapterNumber, {
                para: 0,
                fig: 0,
                'table-wrap': 0,
                box: 0,
                note: 0,
                target: 0,
                bufferApplications: new Map()
            });
        }
        return this.globalRegistry.countersByChapter.get(chapterNumber);
    }

    /**
     * Add progressive buffer with chapter awareness
     * @private
     * @param {string} type - Element type
     * @param {number} chapterNumber - Chapter number
     * @param {number} currentValue - Current counter value
     * @returns {number} New value with buffer if needed
     */
    addProgressiveBuffer(type, chapterNumber, currentValue) {
        const chapterCounters = this.getChapterCounters(chapterNumber);
        const bufferApps = chapterCounters.bufferApplications;

        if (!bufferApps.has(type)) {
            bufferApps.set(type, 0);
        }

        const applicationCount = bufferApps.get(type);
        const bufferAmount = this.bufferStates.amounts[
            Math.min(applicationCount, this.bufferStates.amounts.length - 1)
        ];

        // Increment application count and apply buffer
        bufferApps.set(type, applicationCount + 1);
        this.bufferStates.lastApplied.set(`${chapterNumber}-${type}`, bufferAmount);

        const newValue = currentValue + bufferAmount;

        this.log(`Applied buffer ${bufferAmount} to ${type} in chapter ${chapterNumber} (application #${applicationCount + 1})`, 'buffer');

        return newValue;
    }


    /**
     * Discover and map chapter base IDs from chapter root elements
     * @private
     */
    builderSelector(types) {
        if (typeof types === "string") {
            // Single type
            return `div.book-part[data-name="book-part"][book-part-type="${types}"]`;
        } else if (Array.isArray(types)) {
            // Multiple types → join into one selector string
            return types
                .map(type => `div.book-part[data-name="book-part"][book-part-type="${type}"]`)
                .join(", ");
        }
        throw new Error("Invalid input: must be string or array");
    }
    discoverChapterBaseIds() {
        // Find all chapter root elements
        var selectorMake = this.builderSelector(["chapter", "introduction"]);
        const chapterRoots = this.globalDocBody.querySelectorAll(selectorMake);

        this.log(`Found ${chapterRoots.length} chapter root elements`, 'chapter');

        chapterRoots.forEach((chapterRoot, index) => {
            const chapterId = chapterRoot.id;

            if (chapterId) {
                // Extract chapter number from the chapter root ID
                // Expected format: workid-UKMOMB0OBC7Z-book-part-1
                const chapterMatch = chapterId.match(/^(.*-book-part-)(\d+)$/);

                if (chapterMatch) {
                    // e.g., "workid-UKMOMB0OBC7Z-book-part-"
                    const baseIdPrefix = chapterMatch[1];
                    // e.g., 1
                    const chapterNumber = parseInt(chapterMatch[2]);
                    // Full ID: workid-UKMOMB0OBC7Z-book-part-1
                    const chapterBaseId = chapterId;
                    // Same as base ID for target prefix
                    const chapterBaseTargetId = chapterId;

                    var xrefNote = chapterRoots[index].querySelector('[ref-type="end-note"]');
                    var endNotes_baseId = "";
                    if (xrefNote) {
                        endNotes_baseId = xrefNote.getAttribute("rid").split("-").slice(0, -2).join("-");
                    }

                    // Store base IDs for this chapter
                    this.globalRegistry.chapterBaseIds.set(chapterNumber, {
                        baseId: chapterBaseId,
                        baseTargetId: chapterBaseTargetId,
                        rootElement: chapterRoot,
                        prefix: baseIdPrefix,
                        endNotes_baseId
                    });


                    this.log(`Mapped chapter ${chapterNumber}: baseId=${chapterBaseId}`, 'chapter');
                } else {
                    this.log(`Warning: Chapter root ID format not recognized: ${chapterId}`, 'chapter');

                    // Fallback: use index-based chapter numbering
                    const fallbackChapterNumber = index + 1;
                    const fallbackBaseId = chapterId || `book-part-${fallbackChapterNumber}`;

                    this.globalRegistry.chapterBaseIds.set(fallbackChapterNumber, {
                        baseId: fallbackBaseId,
                        baseTargetId: fallbackBaseId,
                        rootElement: chapterRoot,
                        prefix: fallbackBaseId.replace(/\d+$/, '')
                    });

                    this.log(`Fallback mapping for chapter ${fallbackChapterNumber}: baseId=${fallbackBaseId}`, 'chapter');
                }
            } else {
                // Handle chapters without IDs
                const fallbackChapterNumber = index + 1;
                const fallbackBaseId = `book-part-${fallbackChapterNumber}`;

                this.globalRegistry.chapterBaseIds.set(fallbackChapterNumber, {
                    baseId: fallbackBaseId,
                    baseTargetId: fallbackBaseId,
                    rootElement: chapterRoot,
                    prefix: 'book-part-'
                });

                this.log(`No ID found for chapter root, using fallback: chapter ${fallbackChapterNumber}`, 'chapter');
            }
        });

        // Set global defaults if no chapters found
        if (this.globalRegistry.chapterBaseIds.size === 0) {
            this.log('No chapter roots found, using global defaults', 'chapter');
            this.globalRegistry.chapterBaseIds.set(1, {
                baseId: 'workid-DEFAULT-book-part-1',
                baseTargetId: 'workid-DEFAULT-book-part-1',
                rootElement: null,
                prefix: 'workid-DEFAULT-book-part-'
            });
        }

        // Set primary base IDs from first chapter for backward compatibility
        const firstChapterData = this.globalRegistry.chapterBaseIds.get(1) ||
            this.globalRegistry.chapterBaseIds.values().next().value;

        if (firstChapterData) {
            this.baseId = firstChapterData.baseId;
            this.baseTargetId = firstChapterData.baseTargetId;
        }
    }

    /**
    * Get base IDs for a specific chapter with enhanced fallback logic
    * @public
    * @param {number} chapterNumber - Chapter number
    * @param {string} [chapterBaseId] - Optional specific chapter base ID to match
    * @returns {Object} Object containing base IDs for the chapter
    */
    getChapterBaseIds(chapterNumber, chapterBaseId = null) {
        // First try direct match with chapterNumber
        let chapterData = this.globalRegistry.chapterBaseIds.get(chapterNumber);

        // If chapterBaseId is provided, validate it matches
        if (chapterData && chapterBaseId) {
            if (chapterData.baseId === chapterBaseId || chapterData.baseTargetId === chapterBaseId) {
                this.log(`Direct match found for chapter ${chapterNumber} with baseId: ${chapterBaseId}`, 'chapter');
                return this.formatChapterBaseIds(chapterData, chapterNumber);
            } else {
                this.log(`Chapter ${chapterNumber} exists but baseId doesn't match. Expected: ${chapterBaseId}, Found: ${chapterData.baseId}`, 'chapter');
                // Reset to trigger fallback logic
                chapterData = null;
            }
        }

        // If no direct match or chapterBaseId mismatch, try fallback strategies
        if (!chapterData || (chapterBaseId && chapterData.baseId !== chapterBaseId)) {
            chapterData = this.findChapterWithFallback(chapterNumber, chapterBaseId);
        }

        // If still no match found, use defaults
        if (!chapterData) {
            this.log(`No chapter data found for chapter ${chapterNumber}${chapterBaseId ? ` with baseId ${chapterBaseId}` : ''}, using defaults`, 'chapter');
            return this.getDefaultChapterBaseIds(chapterNumber, chapterBaseId);
        }

        return this.formatChapterBaseIds(chapterData, chapterNumber);
    }
    /**
    * Enhanced generate unique ID with chapterBaseId parameter
    * @private
    * @param {string} type - Element type
    * @param {number} chapterNumber - Chapter number
    * @param {number} value - Current value
    * @param {string} [chapterBaseId] - Optional specific chapter base ID
    * @returns {Object} Object containing generated IDs and final value
    */
    generateUniqueId(type, chapterNumber, value, chapterBaseId = null) {
        const prefix = this.elementTypes[type] || 'P';
        const chapterPrefix = type !== 'chapter' ? `C${chapterNumber}` : '';
        const chapterBaseIds = this.getChapterBaseIds(chapterNumber, chapterBaseId);

        let id = type === 'target' ?
            `${chapterBaseIds.baseTargetId}-target-${value}` :
            `${chapterPrefix}${prefix}${value}`;

        let floatId = '';
        let floatVal = value;

        // Special handling for figures, tables, and box text
        const specialTypes = /fig|table-wrap|box-text/gi;
        const isSpecialType = specialTypes.test(type);

        if (isSpecialType) {
            floatId = `${chapterBaseIds.baseTargetId}-${type.toLowerCase()}-${floatVal}`;
        }

        // Keep generating until both IDs are unique
        let isUnique = false;
        while (!isUnique) {
            isUnique = true;

            // Check main ID
            if (this.isIdExistsGlobally(id, chapterNumber)) {
                isUnique = false;
                value = this.addProgressiveBuffer(type, chapterNumber, value);
                id = type === 'target' ?
                    `${chapterBaseIds.baseTargetId}-target-${value}` :
                    `${chapterPrefix}${prefix}${value}`;
            }

            // For special types, check float ID
            if (isSpecialType) {
                if (this.isIdExistsGlobally(floatId, chapterNumber)) {
                    isUnique = false;
                    floatVal = this.addProgressiveBuffer(type, chapterNumber, floatVal);
                    floatId = `${chapterBaseIds.baseTargetId}-${type.toLowerCase()}-${floatVal}`;
                }
            }
        }

        if (this.debug) {
            this.log(`Generated IDs for ${type} in chapter ${chapterNumber}:
            Main ID: ${id}
            ${floatId ? `Float ID: ${floatId}` : ''}
            Final Value: ${value}
            Chapter Base ID: ${chapterBaseIds.baseId}
            Strategy: ${chapterBaseIds.foundViaStrategy}
            ${chapterBaseIds.originalChapterNumber !== chapterNumber ?
                    `Original Chapter: ${chapterBaseIds.originalChapterNumber}` : ''}`, 'registry');
        }

        return {
            id,
            finalValue: value,
            floatId: isSpecialType ? floatId : '',
            chapterBaseIds: chapterBaseIds,
            usedFallback: chapterBaseIds.foundViaStrategy !== 'direct_match'
        };
    }

    /**
    * Find chapter using fallback strategies (prev/next chapter lookup)
    * @private
    * @param {number} chapterNumber - Original chapter number
    * @param {string} [chapterBaseId] - Optional specific chapter base ID to match
    * @returns {Object|null} Chapter data or null if not found
    */
    findChapterWithFallback(chapterNumber, chapterBaseId = null) {
        const strategies = [
            // Strategy 1: Check if chapterBaseId matches any chapter
            () => this.findChapterByBaseId(chapterBaseId),

            // Strategy 2: Check previous chapter (chapterNumber - 1)
            () => this.checkAdjacentChapter(chapterNumber - 1, chapterBaseId, 'previous'),

            // Strategy 3: Check next chapter (chapterNumber + 1)  
            () => this.checkAdjacentChapter(chapterNumber + 1, chapterBaseId, 'next'),

            // Strategy 4: Check chapters within range (�2)
            () => this.findChapterInRange(chapterNumber, 2, chapterBaseId),

            // Strategy 5: Find first available chapter
            () => this.findFirstAvailableChapter(chapterBaseId)
        ];

        for (const strategy of strategies) {
            const result = strategy();
            if (result) {
                return result;
            }
        }

        return null;
    }
    /**
  * Find chapter by matching baseId across all chapters
  * @private
  * @param {string} chapterBaseId - Base ID to find
  * @returns {Object|null} Chapter data or null
  */
    findChapterByBaseId(chapterBaseId) {
        if (!chapterBaseId) return null;

        for (const [chapterNum, chapterData] of this.globalRegistry.chapterBaseIds) {
            if (chapterData.baseId === chapterBaseId ||
                chapterData.baseTargetId === chapterBaseId ||
                chapterData.baseId.includes(chapterBaseId) ||
                chapterBaseId.includes(chapterData.baseId)) {

                this.log(`Found matching chapter ${chapterNum} for baseId: ${chapterBaseId}`, 'chapter');
                return {
                    ...chapterData,
                    foundViaStrategy: 'baseId_match',
                    originalChapterNumber: chapterNum
                };
            }
        }

        return null;
    }

    /**
    * Check adjacent chapter (previous or next)
    * @private
    * @param {number} adjacentChapterNumber - Adjacent chapter number to check
    * @param {string} [chapterBaseId] - Optional base ID to match
    * @param {string} direction - Direction ('previous' or 'next')
    * @returns {Object|null} Chapter data or null
    */
    checkAdjacentChapter(adjacentChapterNumber, chapterBaseId = null, direction = 'adjacent') {
        const adjacentData = this.globalRegistry.chapterBaseIds.get(adjacentChapterNumber);

        if (!adjacentData) {
            this.log(`No ${direction} chapter found at number ${adjacentChapterNumber}`, 'chapter');
            return null;
        }

        // If chapterBaseId is specified, check if it matches
        if (chapterBaseId) {
            const matches = adjacentData.baseId === chapterBaseId ||
                adjacentData.baseTargetId === chapterBaseId ||
                this.isBaseIdSimilar(adjacentData.baseId, chapterBaseId);

            if (matches) {
                this.log(`Found matching ${direction} chapter ${adjacentChapterNumber} for baseId: ${chapterBaseId}`, 'chapter');
                return {
                    ...adjacentData,
                    foundViaStrategy: `${direction}_chapter`,
                    originalChapterNumber: adjacentChapterNumber
                };
            } else {
                this.log(`${direction} chapter ${adjacentChapterNumber} exists but baseId doesn't match`, 'chapter');
                return null;
            }
        }

        // If no baseId specified, return the adjacent chapter
        this.log(`Using ${direction} chapter ${adjacentChapterNumber}`, 'chapter');
        return {
            ...adjacentData,
            foundViaStrategy: `${direction}_chapter`,
            originalChapterNumber: adjacentChapterNumber
        };
    }
    /**
     * Find chapter within a range around the target chapter
     * @private
     * @param {number} chapterNumber - Center chapter number
     * @param {number} range - Range to search (�range)
     * @param {string} [chapterBaseId] - Optional base ID to match
     * @returns {Object|null} Chapter data or null
     */
    findChapterInRange(chapterNumber, range = 2, chapterBaseId = null) {
        // Try chapters in expanding range
        for (let offset = 1; offset <= range; offset++) {
            // Check lower range first (chapterNumber - offset)
            const lowerChapter = chapterNumber - offset;
            const lowerResult = this.checkAdjacentChapter(lowerChapter, chapterBaseId, `range_lower_${offset}`);
            if (lowerResult) return lowerResult;

            // Check upper range (chapterNumber + offset)
            const upperChapter = chapterNumber + offset;
            const upperResult = this.checkAdjacentChapter(upperChapter, chapterBaseId, `range_upper_${offset}`);
            if (upperResult) return upperResult;
        }

        this.log(`No chapter found within range �${range} of chapter ${chapterNumber}`, 'chapter');
        return null;
    }

    /**
     * Find first available chapter (last resort)
     * @private
     * @param {string} [chapterBaseId] - Optional base ID to match
     * @returns {Object|null} Chapter data or null
     */
    findFirstAvailableChapter(chapterBaseId = null) {
        const availableChapters = Array.from(this.globalRegistry.chapterBaseIds.entries())
            // Sort by chapter number
            .sort(([a], [b]) => a - b);

        if (chapterBaseId) {
            // Try to find any chapter with matching baseId
            for (const [chapterNum, chapterData] of availableChapters) {
                if (this.isBaseIdSimilar(chapterData.baseId, chapterBaseId)) {
                    this.log(`Found similar baseId match in chapter ${chapterNum}`, 'chapter');
                    return {
                        ...chapterData,
                        foundViaStrategy: 'first_similar',
                        originalChapterNumber: chapterNum
                    };
                }
            }
        }

        // Return first available chapter
        if (availableChapters.length > 0) {
            const [firstChapterNum, firstChapterData] = availableChapters[0];
            this.log(`Using first available chapter ${firstChapterNum}`, 'chapter');
            return {
                ...firstChapterData,
                foundViaStrategy: 'first_available',
                originalChapterNumber: firstChapterNum
            };
        }

        return null;
    }


    /**
     * Check if two base IDs are similar (for fuzzy matching)
     * @private
     * @param {string} baseId1 - First base ID
     * @param {string} baseId2 - Second base ID
     * @returns {boolean} Whether base IDs are similar
     */
    isBaseIdSimilar(baseId1, baseId2) {
        if (!baseId1 || !baseId2) return false;

        // Extract base parts without chapter numbers
        const extractBase = (id) => id.replace(/-\d+$/, '').replace(/\d+$/, '');

        const base1 = extractBase(baseId1);
        const base2 = extractBase(baseId2);

        // Check if base parts match
        return base1 === base2 ||
            baseId1.includes(base2) ||
            baseId2.includes(base1);
    }

    /**
     * Get default chapter base IDs when no chapter data is found
     * @private
     * @param {number} chapterNumber - Chapter number
     * @param {string} [chapterBaseId] - Optional specific base ID
     * @returns {Object} Default chapter base IDs
     */
    getDefaultChapterBaseIds(chapterNumber, chapterBaseId = null) {
        // Use provided chapterBaseId if available, otherwise construct default
        const defaultBaseId = chapterBaseId || this.baseId || `workid-DEFAULT-book-part-${chapterNumber}`;

        const defaultBaseTargetId = chapterBaseId || this.baseTargetId || defaultBaseId;

        return {
            baseId: defaultBaseId,
            baseTargetId: defaultBaseTargetId,
            isMultiChapter: this.globalRegistry.chapterBaseIds.size > 1,
            chapterNumber: chapterNumber,
            rootElement: null,
            prefix: defaultBaseId.replace(/\d+$/, ''),
            foundViaStrategy: 'default_fallback',
            isDefault: true
        };
    }
    /**
       * Format chapter base IDs into consistent return object
       * @private
       * @param {Object} chapterData - Chapter data
       * @param {number} chapterNumber - Chapter number
       * @returns {Object} Formatted chapter base IDs
       */
    formatChapterBaseIds(chapterData, chapterNumber) {
        return {
            baseId: chapterData.baseId,
            baseTargetId: chapterData.baseTargetId,
            isMultiChapter: this.globalRegistry.chapterBaseIds.size > 1,
            chapterNumber: chapterNumber,
            rootElement: chapterData.rootElement,
            prefix: chapterData.prefix,
            foundViaStrategy: chapterData.foundViaStrategy || 'direct_match',
            originalChapterNumber: chapterData.originalChapterNumber || chapterNumber,
            isDefault: chapterData.isDefault || false
        };
    }
    /**
     * Process new elements with chunked batching and progress indicator
     * @public
     * @returns {Promise<void>}
     */
    async processNewElements() {
        this.setUpEditorInstance();
        const newElements = Array.from(
            this.globalDocBody.querySelectorAll('[data-split-child], [data-insert-para]')
        ).filter(el => !el.hasAttribute('data-para-id'));

        if (newElements.length === 0) return;

        // Create progress modal for new elements
        const progressModal = this.createProgressModal(
            'Processing New Elements',
            newElements.length,
            true,
            'document-manager-new-progress'
        );

        // Process elements in chunks
        // Process 10 new elements at a time
        const chunkSize = 10;

        for (let i = 0; i < newElements.length; i += chunkSize) {
            // Check if processing has been cancelled
            if (progressModal.isCancelled()) {
                this.log('Processing cancelled by user', 'general');
                break;
            }

            const chunk = newElements.slice(i, i + chunkSize);
            await this.processElements(chunk, true, {
                // Skip inner progress UI since we're showing our own
                skipProgressUI: true,
                onProgress: (current, total) => {
                    const overallProgress = i + current;
                    progressModal.updateProgress(overallProgress);
                }
            });

            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Close progress modal
        progressModal.close();
    }

    focusElm(elm) {
        var current_elm;
        if (elm.id) {
            current_elm = this.globalDocument.getById(elm.id);
        } else if (elm.hasAttribute("data-time")) {
            current_elm = this.globalDocument.findOne(`${elm.getName()}[data-time='${elm.getAttribute("data-time")}']`);
        }
        if (current_elm) {
            current_elm.scrollIntoView(true);
            GlobalEditor.getSelection().selectElement(current_elm);
        }

    }
    /**
    * Enhanced generateIdProcess with chapterBaseId parameter
    * @public
    * @param {Element} element - Element to process
    * @param {Object} options - Options object
    * @param {string} [options.type] - Element type override
    * @param {string} [options.chapterBaseId] - Specific chapter base ID to use
    * @returns {Object} Generated ID result
    */
    generateIdProcess(element, options = {}) {
        const elementType = options.type ? options.type : this.resolveElementType(element);

        // Skip if resolved type is 'fn' (footnote-nested paragraph)
        if (elementType === 'fn') {
            return { skipped: true, reason: 'footnote-nested-paragraph' };
        }

        const chapterNumber = this.getCurrentChapterNumber(element);
        const counters = this.getChapterCounters(chapterNumber);

        // Generate initial IDs
        counters[elementType.toLowerCase()]++;
        counters.target++;

        const paraIdResult = this.generateUniqueId(
            elementType,
            chapterNumber,
            counters[elementType.toLowerCase()],
            // Pass the chapterBaseId parameter
            options.chapterBaseId
        );

        if (options.type) {
            counters[elementType.toLowerCase()]--;
            counters.target--;
            Object.assign(paraIdResult, {
                baseId: this.baseId,
                baseTargetId: this.baseTargetId
            });
        }

        return paraIdResult;
    }
    getNewElements() {
        this.setUpEditorInstance();

        const selector = `
        [data-split-child],
        [data-insert-para],
        div[data-figure="new"],
        div[data-table="new"]
        `;

        const candidates = Array.from(this.globalDocBody.querySelectorAll(selector)) || [];

        return candidates.filter(el => {
            const isAlreadyProcessed = el.hasAttribute('data-para-id');
            const isCaption = el.classList.contains('caption') || el.closest('.caption');
            const hasCaptionWithId = el.querySelector('.caption')?.hasAttribute('data-para-id');
            const isFnNested = this.isFnNestedParagraph(el);
            return !(isAlreadyProcessed || isCaption || hasCaptionWithId || isFnNested);
        });
    }

    openFinalizeDialog() {

        if (window.qualityCheckerDialog && window.qualityCheckerDialog.state && window.qualityCheckerDialog.state == 1) {
            if (typeof window.qualityCheckerDialog.closeDialog == "function") {
                window.qualityCheckerDialog.closeDialog();
            }
        }

        if (!IS_EDITOR_PAGE) return;

        setTimeout(() => {
            if (typeof window.openFinalizeDialog === 'function') {
                window.openFinalizeDialog();
            } else if (window.FinalizeDialog && typeof window.FinalizeDialog.show === 'function') {
                window.FinalizeDialog.show();
            }
        }, 444);
    }

    async processNewElementsWithAlert(newElements = null, options = {}) {

        const {
            finalize = false,
            type = null,
            // <-- the ONLY controlling variable
            directApply = true
        } = options;

        if (!Array.isArray(newElements)) {
            newElements = this.getNewElements(this.globalDocBody);
        }

        if (newElements.length === 0) {
            if (finalize) this.openFinalizeDialog();
            return [];
        }

        IMPACT_SELECTION._SNAPSHOT({ lock: true, save: true });

        const processed = [];

        for (let i = 0; i < newElements.length; i++) {
            const element = newElements[i];
            try {

                const chapterNumber = this.getCurrentChapterNumber(element);
                const counters = this.getChapterCounters(chapterNumber);
                const elementType = type || this.resolveElementType(element);

                // Skip footnote-nested paragraphs
                if (elementType === 'fn') {
                    continue;
                }

                const paraIdResult = this.generateIdProcess(element, options);

                // Skip if generateIdProcess indicates this is a footnote-nested paragraph
                if (paraIdResult.skipped) {
                    continue;
                }

                const targetIdResult = this.generateUniqueId("target", chapterNumber, counters.target);

                let ids = {
                    paraId: paraIdResult.id,
                    targetId: targetIdResult.id,
                    floatId: paraIdResult.floatId || ""
                };

                // ------------------------------------------------------------
                // DIRECT APPLY MODE ? apply IDs immediately (no popup)
                // ------------------------------------------------------------
                if (directApply === true) {
                    const applied = this.applyIdsToElement(element, ids, chapterNumber, elementType);
                    if (applied) processed.push(element);
                    continue;
                }

                // ------------------------------------------------------------
                // CONFIRMATION MODE ? show Swal dialog
                // ------------------------------------------------------------
                this.focusElm(element);
                const result = await this.promptForIds(
                    i + 1,
                    newElements.length,
                    elementType,
                    chapterNumber,
                    ids
                );

                if (!result.isConfirmed) continue;

                ids = result.value;

                const applied = this.applyIdsToElement(element, ids, chapterNumber, elementType);
                if (applied) processed.push(element);

            } catch (err) {
                console.error("Error processing element:", err);
                if (this.errorConfig.throwOnError) throw err;
            }
        }

        if (finalize) this.openFinalizeDialog();

        IMPACT_SELECTION._SNAPSHOT({ unlock: true, save: true });

        return processed;
    }


    async promptForIds(current, total, elementType, chapterNumber, ids) {
        return Swal.fire({
            title: "Confirm Element IDs",
            html: `
            <div class="row">
                <div class="col-md-12 mb-3">
                    <div class="progress-info">Element ${current} of ${total}</div>
                </div>
                <div class="col-md-12 mb-3">
                    <div class="element-info">Type: ${elementType}<br>Chapter: ${chapterNumber}</div>
                </div>
                <div class="col-md-12"><label>Para ID:</label>
                    <input type="text" id="paraId" class="form-control" value="${ids.paraId}">
                </div>
                <div class="col-md-12"><label>Target ID:</label>
                    <input type="text" id="targetId" class="form-control" value="${ids.targetId}">
                </div>
                ${ids.floatId ? `
                <div class="col-md-12"><label>Float ID:</label>
                    <input type="text" id="floatId" class="form-control" value="${ids.floatId}">
                </div>` : ""}
            </div>
        `,
            showCancelButton: true,
            confirmButtonText: "Confirm",
            cancelButtonText: "Skip",
            preConfirm: () => ({
                paraId: document.getElementById("paraId").value,
                targetId: document.getElementById("targetId").value,
                floatId: document.getElementById("floatId")?.value
            })
        });
    }

    applyIdsToElement(element, ids, chapterNumber, elementType) {
        const { paraId, targetId, floatId } = ids;

        // Validate duplication
        if (
            this.isIdExistsGlobally(paraId, chapterNumber) ||
            this.isIdExistsGlobally(targetId, chapterNumber) ||
            this.isIdExistsGlobally(floatId, chapterNumber)
        ) {
            Swal.fire({
                icon: "error",
                title: "Invalid IDs",
                text: "The provided IDs already exist. Please try different IDs."
            });
            return false;
        }

        const isFloats = /fig|table/gi.test(element.getAttribute("data-name"));
        const finalEl = isFloats ? element.querySelector(".caption") : element;

        // Apply paragraph + target IDs
        finalEl.setAttribute("data-para-id", paraId);
        finalEl.setAttribute("data-target-id", targetId);

        // Float logic
        if (isFloats && floatId) {
            const match = element.id && element.id.match(/[a-zA-Z0-9]{4}$/);
            if (match) {
                const oldId = element.id;
                const xrefs = this.globalDocBody.querySelectorAll(`a[rid="${oldId}"]`);

                if (xrefs.length > 0) {
                    element.id = floatId;
                    xrefs.forEach(x => x.setAttribute("rid", floatId));
                }
            }
        }

        // Register new unique IDs internally
        this.registerIds(paraId, targetId, chapterNumber, element);

        // Track processed element
        this.processedElements.add(element);

        if (elementType) {
            if (!this.elements.has(elementType)) this.elements.set(elementType, new Set());
            this.elements.get(elementType).add(element);
        }

        return true;
    }


    /**
     * Register IDs in global registry
     * @private
     * @param {string} paraId - Paragraph ID
     * @param {string} targetId - Target ID
     * @param {number} chapterNumber - Chapter number
     * @param {Element} element - Associated element
     */
    registerIds(paraId, targetId, chapterNumber, element) {
        // Register in global registry
        if (paraId) this.globalRegistry.ids.add(paraId);
        if (targetId) this.globalRegistry.ids.add(targetId);

        // If element has id attribute, register it too
        if (element.id) {
            this.globalRegistry.ids.add(element.id);
        }

        // Register in chapter registry
        if (!this.globalRegistry.chapterIds.has(chapterNumber)) {
            this.globalRegistry.chapterIds.set(chapterNumber, new Set());
        }

        const chapterRegistry = this.globalRegistry.chapterIds.get(chapterNumber);
        if (paraId) chapterRegistry.add(paraId);
        if (targetId) chapterRegistry.add(targetId);
        if (element.id) {
            chapterRegistry.add(element.id);
        }

        // Track element
        if (!this.globalRegistry.elementsByChapter.has(chapterNumber)) {
            this.globalRegistry.elementsByChapter.set(chapterNumber, new Set());
        }
        this.globalRegistry.elementsByChapter.get(chapterNumber).add(element);

        this.log(`Registered IDs for chapter ${chapterNumber}: ${paraId}, ${targetId}`, 'registry');
    }

    /**
     * Initialize document manager
     * @public
     * @param {Object} options - Configuration object
     * @returns {Promise<void>}
     */
    async initialize(options = {}) {
        try {
            this.setUpEditorInstance();

            // Apply custom configurations
            if (options.processingConfig) {
                this.processingConfig = {
                    ...this.processingConfig,
                    ...options.processingConfig
                };
            }

            if (options.errorConfig) {
                this.errorConfig = {
                    ...this.errorConfig,
                    ...options.errorConfig
                };
            }

            // Initialize document sections
            this.documentSections.front = this.globalDocBody.querySelector('[data-name="book-part-meta"]');
            this.documentSections.body = this.globalDocBody.querySelector('[data-name="book-body"]');
            this.documentSections.back = this.globalDocBody.querySelector('[data-name="book-back"]');
            this.documentSections.back_refList = this.documentSections && this.documentSections.back && this.documentSections.back.querySelector(".ref-list") || null;

            // Validate required sections
            if (!this.documentSections.body) {
                throw new Error('Required body section not found in document');
            }

            // Initialize existing elements with chunked processing
            const existingElements = Array.from(this.globalDocBody.querySelectorAll('div.book-body div:not(.caption)'));

            // Create progress modal
            const totalElements = existingElements.length;
            const progressModal = this.createProgressModal('Processing Document Elements', totalElements);
            let processedCount = 0;

            // Discover chapter base IDs first
            this.determineBaseIds();

            // Process elements in chunks to prevent UI freezing
            // Process 20 elements at a time
            const chunkSize = 20;

            for (let i = 0; i < existingElements.length; i += chunkSize) {
                if (progressModal.isCancelled()) {
                    this.log('Processing cancelled by user', 'general');
                    break;
                }

                const chunk = existingElements.slice(i, i + chunkSize);
                await this.processElements(chunk);

                // Update progress
                processedCount += chunk.length;
                progressModal.updateProgress(processedCount);

                // Allow UI to update by yielding execution
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            // Close progress modal
            progressModal.close();

            this.log('DocumentManager initialized successfully', 'general');

        } catch (error) {
            console.error('Failed to initialize DocumentManager:', error);

            // Close progress modal on error
            const progressModal = document.getElementById('document-manager-progress');
            if (progressModal && progressModal.parentNode) {
                progressModal.parentNode.removeChild(progressModal);
            }

            if (this.errorConfig.throwOnError) {
                throw error;
            }
        }
    }

    /**
     * Process elements with chunked processing and progress updates
     * @public
     * @param {Element|Element[]} elements - Elements to process
     * @param {boolean} isNewElement - Whether elements are new
     * @param {Object} options - Processing options
     * @returns {Promise<void>}
     */
    async processElements(elements, isNewElement = false, options = {}) {
        try {
            this.floatsSelector = `div[data-name="fig"],div[data-name="table"]`;
            const elementsToProcess = Array.isArray(elements) ? elements : [elements];
            const unprocessedElements = elementsToProcess.filter(element => !this.shouldSkip(element));

            // Get initial counts by type and chapter before processing
            const initialCounts = new Map();
            unprocessedElements.forEach(element => {
                const elementType = this.resolveElementType(element);
                // Skip footnote-nested paragraphs for counting
                if (elementType === 'fn') return;
                const chapterNumber = this.getCurrentChapterNumber(element);
                const key = `${chapterNumber}-${elementType}`;
                initialCounts.set(key, (initialCounts.get(key) || 0) + 1);
            });

            // Apply initial buffers based on count
            initialCounts.forEach((count, key) => {
                const [chapterNumber, elementType] = key.split('-');
                const counters = this.getChapterCounters(Number(chapterNumber));

                // Determine appropriate buffer based on count
                let bufferAmount = 0;
                for (const amount of this.bufferStates.amounts) {
                    if (count >= amount) {
                        bufferAmount = amount;
                    } else {
                        break;
                    }
                }

                if (bufferAmount > 0) {
                    this.bufferStates.lastApplied.set(key, bufferAmount);
                    counters[elementType.toLowerCase()] += bufferAmount;

                    this.log(`Applied initial buffer ${bufferAmount} for ${elementType} in chapter ${chapterNumber}`, 'buffer');
                }
            });

            // Create progress modal if processing a batch outside of larger operation
            let progressModal = null;
            if (!options.skipProgressUI && unprocessedElements.length > 10) {
                progressModal = this.createProgressModal(
                    isNewElement ? 'Processing New Elements' : 'Processing Elements',
                    unprocessedElements.length,
                    false,
                    'process-elements-progress'
                );
            }

            // Process elements with yield points to prevent UI freezing
            for (let i = 0; i < unprocessedElements.length; i++) {
                // Check if processing has been cancelled via parent process
                if (this.processingCancelled) {
                    this.log('Processing cancelled during element processing', 'general');
                    break;
                }

                const element = unprocessedElements[i];

                try {
                    const elementType = this.resolveElementType(element);

                    // Skip footnote-nested paragraphs
                    if (elementType === 'fn') {
                        this.processedElements.add(element);
                        continue;
                    }

                    const chapterNumber = this.getCurrentChapterNumber(element);
                    const counters = this.getChapterCounters(chapterNumber);
                    const bufferKey = `${chapterNumber}-${elementType}`;
                    const isFloatNode = /fig|table/gi.test(elementType);
                    const captionNode = element.querySelector(".caption");

                    let paraId, targetId;

                    if (isNewElement && !element.hasAttribute('data-para-id')) {
                        IMPACT_SELECTION._SNAPSHOT({
                            lock: true,
                            save: true
                        });
                        // Check if we need to apply or increase buffer
                        const currentCount = counters[elementType.toLowerCase()] || 0;
                        const lastBuffer = this.bufferStates.lastApplied.get(bufferKey) || 0;

                        // Check if we need to increase buffer based on current count
                        let newBuffer = 0;
                        for (const amount of this.bufferStates.amounts) {
                            if (currentCount >= amount && amount > lastBuffer) {
                                newBuffer = amount - lastBuffer;
                                this.bufferStates.lastApplied.set(bufferKey, amount);
                                break;
                            }
                        }

                        // Apply new buffer if needed
                        if (newBuffer > 0) {
                            counters[elementType.toLowerCase()] += newBuffer;
                            this.log(`Increased buffer by ${newBuffer} for ${elementType} in chapter ${chapterNumber}`, 'buffer');
                        }

                        // Generate IDs with updated counters
                        counters[elementType.toLowerCase()]++;
                        counters.target++;

                        const paraIdResult = this.generateUniqueId(
                            elementType,
                            chapterNumber,
                            counters[elementType.toLowerCase()]
                        );
                        paraId = paraIdResult.id;

                        const targetIdResult = this.generateUniqueId(
                            'target',
                            chapterNumber,
                            counters.target
                        );
                        targetId = targetIdResult.id;

                        element.setAttribute('data-para-id', paraId);
                        element.setAttribute('data-target-id', targetId);

                        this.log(`Generated new IDs: ${elementType}, paraId: ${paraId}, targetId: ${targetId}`, 'general');
                    } else {
                        // Handle existing elements
                        paraId = isFloatNode && captionNode ? captionNode.getAttribute('data-para-id') : element.getAttribute('data-para-id');
                        targetId = isFloatNode && captionNode ? captionNode.getAttribute('data-target-id') : element.getAttribute('data-target-id');

                        if (paraId) {
                            const paraNumMatch = paraId.match(/\d+$/);
                            if (paraNumMatch) {
                                const paraNum = parseInt(paraNumMatch[0]);
                                counters[elementType.toLowerCase()] = Math.max(
                                    counters[elementType.toLowerCase()] || 0,
                                    paraNum
                                );
                            }
                        }

                        if (targetId) {
                            const targetNumMatch = targetId.match(/\d+$/);
                            if (targetNumMatch) {
                                const targetNum = parseInt(targetNumMatch[0]);
                                counters.target = Math.max(
                                    counters.target || 0,
                                    targetNum
                                );
                            }
                        }
                    }

                    // Register IDs for both new and existing elements
                    this.registerIds(paraId, targetId, chapterNumber, element);

                    // Update tracking
                    this.processedElements.add(element);
                    if (elementType) {
                        if (!this.elements.has(elementType)) {
                            this.elements.set(elementType, new Set());
                        }
                        this.elements.get(elementType).add(element);
                    }

                    if (paraId) {
                        // Update highest numbers
                        const numericId = parseInt(paraId.match(/\d+$/));
                        if (numericId && !isNaN(numericId)) {
                            const typeKey = elementType.toLowerCase();
                            this.globalRegistry.highestNumbers[typeKey] = Math.max(
                                this.globalRegistry.highestNumbers[typeKey] || 0,
                                numericId
                            );
                        }
                    }
                } catch (error) {
                    console.error('Error processing individual element:', error);
                    if (this.errorConfig.throwOnError) throw error;
                } finally {
                    if (isNewElement) {
                        IMPACT_SELECTION._SNAPSHOT({
                            unlock: true,
                            save: true
                        });
                    }
                }

                // Every 10 elements or at the end, yield to prevent UI freezing
                if (i % 10 === 9 || i === unprocessedElements.length - 1) {
                    // Allow UI to update
                    await new Promise(resolve => setTimeout(resolve, 0));

                    // Update progress if modal exists
                    if (progressModal) {
                        progressModal.updateProgress(i + 1);
                    }

                    // Update progress if callback provided
                    if (options.onProgress) {
                        options.onProgress(i + 1, unprocessedElements.length);
                    }
                }
            }

            // Close progress modal if we created one
            if (progressModal) {
                progressModal.close();
            }

            if (this.processingConfig.onBatchComplete) {
                await this.processingConfig.onBatchComplete(unprocessedElements);
            }

        } catch (error) {
            console.error('Error in batch element processing:', error);

            // Clean up progress modal on error
            const progressModal = document.getElementById('process-elements-progress');
            if (progressModal && progressModal.parentNode) {
                progressModal.parentNode.removeChild(progressModal);
            }

            if (this.errorConfig.throwOnError) throw error;
        }
    }


    _referenceSelectors() {
        return {
            bookBack: '[data-name="book-back"], .book-back',
            refGroup: '[data-name="ref-group"], .ref-group',
            refList: '[data-name="ref-list"], .ref-list',
            bookPart: '[data-name="book-part"], .book-part',
            back: '[data-name="back"], .back'
        };
    }

    _isAttachedUnder(node, root) {
        if (!node || !root) return false;
        if (node.isConnected === false) return false;
        if (typeof root.contains === 'function' && !root.contains(node)) return false;
        return true;
    }

    _findDocumentRefList(documentRoot) {
        const sel = this._referenceSelectors();
        if (!documentRoot || !documentRoot.querySelector) return null;
        const bookBack = documentRoot.querySelector(sel.bookBack);
        if (!bookBack) return null;
        const group = bookBack.querySelector(sel.refGroup);
        return (group && group.querySelector(sel.refList)) ||
            bookBack.querySelector(sel.refList) ||
            null;
    }

    _findChapterRefList(chapter) {
        const sel = this._referenceSelectors();
        if (!chapter || !chapter.querySelector) return null;
        const backs = Array.from(chapter.querySelectorAll(sel.back)).filter((node) => {
            if (!node) return false;
            if (node.classList && node.classList.contains('book-back')) return false;
            if (node.getAttribute && node.getAttribute('data-name') === 'book-back') return false;
            return true;
        });
        for (let i = 0; i < backs.length; i += 1) {
            const back = backs[i];
            const group = back.querySelector(sel.refGroup);
            const list = (group && group.querySelector(sel.refList)) || back.querySelector(sel.refList);
            if (list) return list;
        }
        return null;
    }

    _resolveChapterElement(contextElement) {
        const sel = this._referenceSelectors();
        if (contextElement && typeof contextElement.closest === 'function') {
            const fromCtx = contextElement.closest(sel.bookPart);
            if (fromCtx) return fromCtx;
        }
        const cursor = (typeof globalThis !== 'undefined' && globalThis.EDITOR_CURSOR) ||
            (typeof EDITOR_CURSOR !== 'undefined' ? EDITOR_CURSOR : null);
        if (cursor && cursor.CUR_CHAPTER && cursor.CUR_CHAPTER.querySelector) {
            return cursor.CUR_CHAPTER;
        }
        return null;
    }

    _extractWorkPrefix(raw) {
        const match = String(raw || '').match(/^(workid-[A-Z0-9]+)/i);
        return match ? match[1] : '';
    }

    _resolveDocumentWorkPrefix(documentRoot) {
        const sel = this._referenceSelectors();
        const bookBack = documentRoot && documentRoot.querySelector &&
            documentRoot.querySelector(sel.bookBack);
        if (bookBack) {
            const fromBack = this._extractWorkPrefix(bookBack.id) ||
                this._extractWorkPrefix(bookBack.getAttribute && bookBack.getAttribute('data-id'));
            if (fromBack) return fromBack;
            const existing = bookBack.querySelector(sel.refList);
            const fromList = this._extractWorkPrefix(existing && existing.id);
            if (fromList) return fromList;
            const firstRef = existing && existing.querySelector && existing.querySelector('.ref[id], [data-name="ref"][id]');
            const fromRef = this._extractWorkPrefix(firstRef && firstRef.id);
            if (fromRef) return fromRef;
        }
        const bookRoot = documentRoot && documentRoot.querySelector &&
            (documentRoot.querySelector('.book, [data-name="book"]') || documentRoot.documentElement);
        const fromRoot = this._extractWorkPrefix(bookRoot && bookRoot.id);
        if (fromRoot) return fromRoot;
        return this._extractWorkPrefix(this.baseId);
    }

    getFeatureIdScope(feature, options = {}) {
        if (feature !== 'reference') {
            return { baseId: '', refListId: '', firstRefId: '' };
        }
        const scope = options.scope === 'chapter' ? 'chapter' : 'document';
        let baseId = '';
        if (scope === 'chapter') {
            const chapter = this._resolveChapterElement(options.contextElement) ||
                options.contextElement;
            baseId = (chapter && chapter.id) || '';
            if (!baseId && this.baseId && /book-part-\d+/.test(this.baseId)) {
                baseId = this.baseId;
            }
            if (!baseId) {
                baseId = this._extractWorkPrefix(this.baseId);
            }
        } else {
            baseId = this._resolveDocumentWorkPrefix(options.documentRoot);
        }
        return {
            baseId,
            refListId: baseId ? `${baseId}-ref-list-1` : 'ref-list-1',
            firstRefId: baseId ? `${baseId}-ref-1` : 'ref-1'
        };
    }

    _ensureReferenceTitle(refList, createdFlags) {
        if (!refList || refList.querySelector('div.title, [data-name="title"]')) return;
        const doc = refList.ownerDocument || document;
        const title = doc.createElement('div');
        title.className = 'title';
        title.setAttribute('data-name', 'title');
        title.setAttribute('data-enter-af-fi', 'yes');
        title.textContent = 'Reference';
        refList.insertBefore(title, refList.firstChild);
        if (createdFlags) createdFlags.title = true;
    }

    _createChapterReferenceHierarchy(chapter, idScope) {
        const doc = chapter.ownerDocument || document;
        const created = { back: false, group: false, refList: false, title: false };
        const sel = this._referenceSelectors();

        let back = Array.from(chapter.querySelectorAll(sel.back)).find((node) =>
            node.getAttribute('data-name') !== 'book-back' &&
            !(node.classList && node.classList.contains('book-back'))
        ) || null;
        if (!back) {
            back = doc.createElement('div');
            back.className = 'back';
            back.setAttribute('data-name', 'back');
            back.setAttribute('data-enter-af-fi', 'yes');
            chapter.appendChild(back);
            created.back = true;
        }

        let group = back.querySelector(sel.refGroup);
        if (!group) {
            group = doc.createElement('div');
            group.className = 'ref-group';
            group.setAttribute('data-name', 'ref-group');
            back.appendChild(group);
            created.group = true;
        }

        let refList = group.querySelector(sel.refList);
        if (!refList) {
            refList = doc.createElement('div');
            refList.className = 'ref-list';
            refList.setAttribute('data-name', 'ref-list');
            refList.setAttribute('data-enter-af-fi', 'yes');
            if (idScope && idScope.refListId) refList.id = idScope.refListId;
            group.appendChild(refList);
            created.refList = true;
        }

        this._ensureReferenceTitle(refList, created);
        return { back, group, refList, created };
    }

    resolveDocumentTarget(feature, options = {}) {
        try {
            if (feature !== 'reference') return null;
            const documentRoot = options.documentRoot;
            const create = options.create !== false;
            const created = { back: false, group: false, refList: false, title: false };
            if (!documentRoot || !documentRoot.querySelector) return null;

            const sel = this._referenceSelectors();
            const cache = this.documentSections && this.documentSections.back_refList;
            const cacheUsable = !!(cache && this._isAttachedUnder(cache, documentRoot) &&
                typeof cache.closest === 'function' && cache.closest(sel.bookBack));

            let refList = cacheUsable ? cache : null;
            let back = null;
            let group = null;
            let scope = null;
            let root = documentRoot;

            if (!refList) {
                refList = this._findDocumentRefList(documentRoot);
            }

            if (refList) {
                scope = 'document';
                group = (typeof refList.closest === 'function' && refList.closest(sel.refGroup)) ||
                    refList.parentElement;
                back = (typeof refList.closest === 'function' && refList.closest(sel.bookBack)) ||
                    (group && typeof group.closest === 'function' && group.closest(sel.bookBack));
                root = back || documentRoot;
                this.documentSections.back_refList = refList;
                if (back) this.documentSections.back = back;
            } else {
                const chapter = this._resolveChapterElement(options.contextElement);
                if (!chapter) return null;
                root = chapter;
                refList = this._findChapterRefList(chapter);
                if (refList) {
                    scope = 'chapter';
                    group = (typeof refList.closest === 'function' && refList.closest(sel.refGroup)) ||
                        refList.parentElement;
                    back = (typeof refList.closest === 'function' && refList.closest(sel.back)) ||
                        (group && typeof group.closest === 'function' && group.closest(sel.back));
                } else if (create) {
                    const idScopePreview = this.getFeatureIdScope('reference', {
                        scope: 'chapter',
                        contextElement: chapter,
                        documentRoot
                    });
                    const built = this._createChapterReferenceHierarchy(chapter, idScopePreview);
                    back = built.back;
                    group = built.group;
                    refList = built.refList;
                    Object.assign(created, built.created);
                    scope = 'chapter';
                } else {
                    return null;
                }
            }

            this._ensureReferenceTitle(refList, created);
            const idScope = this.getFeatureIdScope('reference', {
                scope,
                contextElement: scope === 'chapter' ? root : options.contextElement,
                documentRoot
            });
            if (refList && refList.id) {
                idScope.refListId = refList.id;
            } else if (created.refList && idScope.refListId) {
                refList.id = idScope.refListId;
            }

            return {
                feature: 'reference',
                scope,
                root,
                back,
                group,
                refList,
                created,
                idScope
            };
        } catch (err) {
            const message = err && err.message ? err.message : String(err);
            if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace('DocumentManager.resolveDocumentTarget', message);
            } else if (typeof globalThis !== 'undefined' && typeof globalThis.ErrorLogTrace === 'function') {
                globalThis.ErrorLogTrace('DocumentManager.resolveDocumentTarget', message);
            }
            return null;
        }
    }

    getGenerateElementId(name = "", options = {}) {
        
        var isBookEndRef = this.documentSections.back_refList;





    }


    /**
     * Log debug information by category
     * @private
     * @param {string} message - Message to log
     * @param {string} category - Log category
     */
    log(message, category = 'general') {
        if (!this.debug) return;

        const shouldLog = {
            buffer: this.debugMode.logBufferAddition,
            registry: this.debugMode.logIdGeneration,
            chapter: this.debugMode.logChapterOperations,
            general: true
        }[category];

        if (shouldLog) {
            // console.log(`[DocumentManager:${category}] ${message}`);
        }
    }

    getAttributeFromHierarchy(element, attributeName = "data-para-id") {
        if (!element || !attributeName) return null;

        // Check if the current element has the attribute
        if (element.hasAttribute(attributeName)) {
            return element.getAttribute(attributeName);
        }

        const parent = element.parentElement;

        // Check if the parent has the attribute
        if (parent && parent.hasAttribute(attributeName)) {
            return parent.getAttribute(attributeName);
        }

        // Check if the parent's sibling has the attribute
        const parentSibling = parent.nextElementSibling || parent.previousElementSibling;
        if (parentSibling && parentSibling.hasAttribute(attributeName)) {
            return parentSibling.getAttribute(attributeName);
        }

        // If none of them have the attribute, return null
        return 1;
    }

    /**
     * Get current chapter number from element position
     * @private
     * @param {Element} element - Element to check
     * @returns {number} Chapter number
     */
    getCurrentChapterNumber(element) {
        // 1. Try closest matching chapter root via DOM
        const chapterRoot = element.closest('div.book-part[data-name="book-part"][book-part-type="chapter"]');
        if (chapterRoot?.id) {
            const match = chapterRoot.id.match(/book-part-(\d+)$/);
            if (match) {
                const chapterNum = parseInt(match[1], 10);
                // this.log(`Found chapter ${chapterNum} via closest()`, 'chapter');
                return chapterNum;
            }
        }

        // 2. Fallback via data-para-id parsing
        const dataParaId = this.getAttributeFromHierarchy(element);
        if (dataParaId && dataParaId !== 1) {
            const result = { chapter: 1 };
            Object.keys(this.idPatterns).forEach(key => {
                const match = this.idPatterns[key].exec(dataParaId);
                result[key] = match ? parseInt(match.slice(1).join(''), 10) : null;
            });

            if (result.chapter !== null) {
                this.log(`Found chapter ${result.chapter} via data-para-id parsing`, 'chapter');
                return result.chapter;
            }
        }

        // 3. Fallback via global chapter root registry
        for (const [chapterNumber, chapterData] of this.globalRegistry.chapterBaseIds) {
            if (chapterData.rootElement?.contains(element)) {
                this.log(`Found chapter ${chapterNumber} via chapter base ID mapping`, 'chapter');
                return chapterNumber;
            }
        }

        // 4. Default to chapter 1
        this.log(`Could not determine chapter number, defaulting to chapter 1`, 'chapter');
        return 1;
    }


    /**
     * Enhanced method to handle documents starting with introduction or other special chapters
     * @public
     * @param {string} documentType - Type of document ('standard', 'introduction', 'preface', etc.)
     * @returns {Object} Document structure information
     */
    analyzeDocumentStructure(documentType = 'auto') {
        const chapterRoots = this.globalDocBody.querySelectorAll('div.book-part[data-name="book-part"]');
        const structure = {
            documentType: documentType,
            totalChapters: chapterRoots.length,
            chapters: [],
            hasIntroduction: false,
            hasPreface: false,
            startingChapterNumber: 1
        };

        chapterRoots.forEach((chapterRoot, index) => {
            const chapterId = chapterRoot.id;
            const chapterTitle = chapterRoot.querySelector('.title')?.textContent?.toLowerCase() || '';
            const chapterType = chapterRoot.getAttribute('book-part-type') || 'chapter';

            // Check for special chapter types
            const isIntroduction = chapterTitle.includes('introduction') || chapterId.includes('introduction');
            const isPreface = chapterTitle.includes('preface') || chapterId.includes('preface');

            if (isIntroduction) structure.hasIntroduction = true;
            if (isPreface) structure.hasPreface = true;

            const chapterInfo = {
                index: index,
                id: chapterId,
                title: chapterTitle,
                type: chapterType,
                isIntroduction: isIntroduction,
                isPreface: isPreface,
                rootElement: chapterRoot
            };

            structure.chapters.push(chapterInfo);
        });

        // Determine starting chapter number based on structure
        if (structure.hasIntroduction || structure.hasPreface) {
            // If document starts with introduction/preface, first numbered chapter might be chapter 0 or 1
            const firstNumberedChapter = structure.chapters.find(ch =>
                !ch.isIntroduction && !ch.isPreface && ch.type === 'chapter'
            );

            if (firstNumberedChapter) {
                const match = firstNumberedChapter.id.match(/book-part-(\d+)$/);
                structure.startingChapterNumber = match ? parseInt(match[1]) : 1;
            }
        }

        this.log(`Document structure analysis:
            Type: ${structure.documentType}
            Total chapters: ${structure.totalChapters}
            Has introduction: ${structure.hasIntroduction}
            Has preface: ${structure.hasPreface}
            Starting chapter number: ${structure.startingChapterNumber}`, 'chapter');

        return structure;
    }

    /**
     * Check if ID exists globally or in chapter
     * @private
     * @param {string} id - ID to check
     * @param {number} chapterNumber - Chapter number
     * @returns {boolean} Whether ID exists
     */
    isIdExistsGlobally(id, chapterNumber) {
        // Check global registry first
        if (this.globalRegistry.ids.has(id)) {
            return true;
        }

        // Check chapter-specific registry
        const chapterIds = this.globalRegistry.chapterIds.get(chapterNumber);
        return chapterIds ? chapterIds.has(id) : false;
    }

    /**
     * Check if element is the innermost .p in a .p > .fn > .p structure
     * @private
     * @param {Element} element - Element to check
     * @returns {boolean} Whether element is a footnote-nested paragraph
     */
    isFnNestedParagraph(element) {
        // Check if element is a paragraph
        const dataName = element.getAttribute('data-name');
        if (dataName !== 'p') return false;

        // Check if parent is .fn
        const parent = element.parentElement;
        if (!parent) return false;
        const parentDataName = parent.getAttribute('data-name');
        if (parentDataName !== 'fn') return false;

        // Check if grandparent is .p
        const grandparent = parent.parentElement;
        if (!grandparent) return false;
        const grandparentDataName = grandparent.getAttribute('data-name');
        return grandparentDataName === 'p';
    }

    /**
     * Resolve element type, mapping inner .p in .p > .fn > .p to 'fn'
     * @private
     * @param {Element} element - Element to resolve
     * @returns {string} Resolved element type
     */
    resolveElementType(element) {
        const dataName = element.getAttribute('data-name');
        if (dataName === 'p' && this.isFnNestedParagraph(element)) {
            return 'fn';
        }
        return dataName;
    }

    /**
     * Check if element should be skipped
     * @private
     * @param {Element} element - Element to check
     * @returns {boolean} Whether to skip element
     */
    shouldSkip(element) {
        // Skip footnote-nested paragraphs (inner .p in .p > .fn > .p)
        if (this.isFnNestedParagraph(element)) {
            return true;
        }

        let current = element;
        while (current && current.getAttribute) {
            const name = current.getAttribute('data-name');
            if (name && this.skippedElements.has(name)) {
                return true;
            }
            current = current.parentElement;
        }
        return false;
    }

    /**
     * Get current section type for element
     * @private
     * @param {Element} element - Element to check
     * @returns {string} Section type ('front', 'body', 'back')
     */
    getCurrentSection(element) {
        // Check each section container
        for (const [type, container] of Object.entries(this.documentSections)) {
            if (container && container.contains(element)) {
                return type;
            }
        }
        // Default to body if no section found
        return 'body';
    }

    /**
     * Reset document manager state
     * @public
     */
    reset() {
        this.initializeProperties();
        this.initializeConfigurations();
        this.log('DocumentManager state reset', 'general');
    }

    /**
     * Get elements by type
     * @public
     * @param {string} type - Element type
     * @returns {Set<Element>} Set of elements
     */
    getElementsByType(type) {
        return this.elements.get(type) || new Set();
    }

    /**
     * Get document statistics
     * @public
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const stats = {
            totalElements: 0,
            elementsByType: {},
            elementsByChapter: {},
            totalChapters: 0,
            totalIds: this.globalRegistry.ids.size
        };

        // Count elements by type
        for (const [type, elements] of this.elements) {
            stats.elementsByType[type] = elements.size;
            stats.totalElements += elements.size;
        }

        // Only count chapters, not parts
        for (const [chapter, elements] of this.globalRegistry.elementsByChapter) {
            // Only include if chapterBaseIds has this chapter as a number key (chapters only)
            if (this.globalRegistry.chapterBaseIds.has(Number(chapter))) {
                stats.elementsByChapter[chapter] = elements.size;
                stats.totalChapters++;
            }
        }

        return stats;
    }

    /**
     * Export paragraph IDs for external use
     * @public
     * @returns {Object} Object containing all paragraph IDs by chapter
     */
    exportParaIds() {
        const exportData = {};

        for (const [chapter, ids] of this.globalRegistry.chapterIds) {
            exportData[chapter] = Array.from(ids).filter(id =>
                !id.includes('target')
            );
        }

        return exportData;
    }
    /**
     * Get singleton instance
     * @public
     * @returns {DocumentManager} Singleton instance
     */
    static getInstance() {
        if (!DocumentManager.instance) {
            DocumentManager.instance = new DocumentManager();
        }
        return DocumentManager.instance;
    }
}

export default DocumentManager;