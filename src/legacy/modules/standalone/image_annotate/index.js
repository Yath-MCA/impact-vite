/***
 **  div class="mDialog ds-none w-editor-access" id="GrayscaleDialog" 
 
            
*/
/**
 * Enhanced AnnotationModule Class
 * Refactored for better maintainability, error handling, and modern JavaScript practices
 * 
 * @class AnnotationModule
 * @extends BaseModule
 * @version 2.0.0
 */

class AnnotationModule extends BaseModule {

    constructor(name, errorTracker, options = {}) {
        super(name, errorTracker, options);

        // Initialize all properties and state
        this.initializeProperties();
        this.initializeState();
        this.bindMethods();
        this.setupConstants();

        this.initiated = true;
        this.name = name;
        debug.log('AnnotationModule initialized successfully');
    }

    // ===== INITIALIZATION METHODS =====

    /**
     * Initialize basic module properties
     * @private
     */
    initializeProperties() {
        // Core properties
        this.templateList = {};
        this.canUnmountComponentWhileClose = true;
        this.TOASTER_MESSAGE = {};

        // Current state tracking
        this.currentFigure = null;
        this.currentElement = null;
        this.currentArray = null;
        this.annotationHandler = null;

        // Validation flags
        this.isModuleReady = false;
        this.isFrameLoaded = false;
    }

    /**
     * Initialize module state and templates
     * @private
     */
    initializeState() {
        this._state = {
            templateList: {
                spinner: `<span id="spinner_dv" class="spinner-border iSpin_border" role="status">
                    <span class="sr-only">Loading...</span>
                </span>`
            },
            dimensions: {
                minWidth: 300,
                minHeight: 200,
                maxProcessableHeight: 700,
                defaultPadding: 150,
                resizePercentage: 20
            },
            selectors: {
                figureClass: '.fig',
                graphicImage: '.graphic img',
                commentSpan: 'span[data-class="ckcommentsfull"]',
                annotateAttr: 'data-annotate',
                commentBoxAttr: 'data-user-comment-box',
                userNameAttr: 'data-user-name'
            }
        };
    }

    /**
     * Setup UI element selectors and constants
     * @private
     */
    setupConstants() {
        this.UI_SELECTORS = {
            PANEL_BODY: ".dialog-body",
            // PANEL_FOOTER: ".dialog-footer",
            // PANEL_HEADER: ".dialog-header",
            PANEL_HEADER_TXT: ".dia_header_text",
            PANEL_CONTENT: ".dialog-content"
        };

        this.IFRAME_ID = 'frameImage';
        this.IMAGE_ID = 'imgID';
    }

    /**
     * Bind all methods to preserve context
     * @private
     */
    bindMethods() {
        const methodsToBind = [
            'initLoop', 'showLoop', 'fireRestore', 'assignVariablesEventLoop',
            'getImageSource', 'setupDimensions', 'loadPluginScript',
            'bindAnnotationEvents', 'reset', 'closeModule', 'handleError'
        ];

        methodsToBind.forEach(method => {
            if (this[method]) {
                this[method] = this[method].bind(this);
            }
        });
    }

    // ===== PUBLIC INTERFACE METHODS =====

    /**
     * Initialize the annotation loop
     * @public
     */
    initLoop() {
        try {
            this.AutoInitiated = true;
            this.FullyLoaded = true;
            this.isModuleReady = true;
            debug.log('Annotation loop initialized');
        } catch (error) {
            this.handleError('initLoop', error);
        }
    }

    /**
     * Main method to show the annotation interface
     * @param {Object} options - Configuration options
     * @public
     */
    async showLoop(options = {}) {
        try {
            debug.log('Starting annotation show loop');

            // Validate prerequisites
            if (!this.validatePrerequisites()) {
                throw new Error('Prerequisites not met for showing annotation module');
            }

            // Cache editor references
            this.cacheEditorReferences();

            // Setup UI elements
            this.assignVariablesEventLoop();

            // Get and validate image source
            const imageData = this.getImageSource();
            if (!imageData) {
                throw new Error('No valid image source found');
            }

            // Load the annotation interface
            await this.loadAnnotationInterface();

            // Calculate and apply dimensions
            const dimensions = this.calculateOptimalDimensions(imageData);
            this.applyFrameDimensions(dimensions);

            // Update image sources in editor if needed
            this.updateEditorImageSources(imageData);

            debug.log('Annotation interface loaded successfully');

        } catch (error) {
            this.handleError('showLoop', error);
        }
    }

    /**
     * Restore annotation state
     * @public
     */
    fireRestore() {
        try {
            debug.log('Restoring annotation state');
            // Implementation for restoration logic
            if (this.annotationHandler) {
                this.annotationHandler.restore();
            }
        } catch (error) {
            this.handleError('fireRestore', error);
        }
    }

    /**
     * Reset the module to initial state
     * @public
     */
    reset() {
        debug.log('Resetting annotation module');

        // Clear iframe
        if (this.elements && this.elements.iFRAME) {
            this.elements.iFRAME.src = "";
            this.elements.iFRAME.style = "";
        }

        // Clear references
        this.currentElement = null;
        this.currentFigure = null;
        this.currentArray = null;
        this.isFrameLoaded = false;

        // Reset annotation handler
        if (this.annotationHandler) {
            this.annotationHandler.reset();
            this.annotationHandler = null;
        }

        debug.log('Module reset completed');


    }

    async Before_closeModule() {
        // Remove style attributes from body
        const rootBody = document.querySelector("body#Body");
        if (rootBody) rootBody.removeAttribute("style");

        const {
            contentDocument: iframeDoc
        } = this.elements.iFRAME || {};
        // No iframe — safe to close
        if (!iframeDoc) return true;

        const FrameContentDocument = iframeDoc;

        // Always fetch fresh references
        const frameEditor = FrameContentDocument.querySelector('.annotorious-editor');
        // No editor → safe to close
        if (!frameEditor) return true;

        const frameTextArea = frameEditor.querySelector("textarea");
        // No textarea → safe to close
        if (!frameTextArea) return true;

        // Check visibility (inline style only)
        const isVisible = frameEditor.style.display !== 'none';
        const hasContent = frameTextArea.value.trim().length > 0;

        if (isVisible && hasContent) {
            const result = await AlertNewDialog.fire(
                'warning',
                'Are you sure?',
                'close_without_reply',
                'Yes',
                'Cancel'
            );
            return result.isConfirmed;
        }

        return true;
    }

    /**
     * Close the annotation module
     * @public
     */
    closeModule() {
        debug.log('Closing annotation module');

        if (typeof this.closeDialog === "function") {
            this.closeDialog();
        } else if (this.Panel) {
            this.Panel.classList.add("ds-none");
        }



        // Cleanup resources
        this.cleanup();

    }

    // ===== PRIVATE HELPER METHODS =====

    /**
     * Validate that all prerequisites are met
     * @returns {boolean}
     * @private
     */
    validatePrerequisites() {
        const checks = [{
            condition: !!GlobalEditor,
            message: 'GlobalEditor not available'
        },
        {
            condition: !!GlobalEditor.document,
            message: 'GlobalEditor document not available'
        },
        {
            condition: this.isModuleReady,
            message: 'Module not properly initialized'
        }
        ];

        for (const check of checks) {
            if (!check.condition) {
                this.warn(`Prerequisites check failed: ${check.message}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Cache editor references for performance
     * @private
     */
    cacheEditorReferences() {
        this._editorRefs = {
            impactSelection: IMPACT_SELECTION || {},
            editorCursor: EDITOR_CURSOR || {},
            globalEditor: GlobalEditor
        };
    }

    /**
     * Setup UI element references
     * @private
     */
    assignVariablesEventLoop() {
        // Map UI selectors to elements
        Object.entries(this.UI_SELECTORS).forEach(([key, selector]) => {
            const element = this.Panel && this.Panel.querySelector(selector);
            if (element) {
                this.elements[key] = element;
            } else {
                this.warn(`UI element not found: ${selector}`);
            }
        });

        // Get iframe element
        const iframe = document.getElementById(this.IFRAME_ID);
        if (iframe) {
            this.elements.iFRAME = iframe;
        } else {
            throw new Error(`Iframe element '${this.IFRAME_ID}' not found`);
        }

        debug.log('UI elements assigned successfully');
    }

    /**
     * Get image source and metadata
     * @returns {Array|null} Image data array [src, width, height]
     * @private
     */
    getImageSource() {

        const editor = this._editorRefs.globalEditor;
        let selection = editor.getSelection();

        // For localhost debugging
        if (IS_LOCAL_HOST) {
            // const debugElement = editor.document.getById('F1');
            // if (debugElement) {
            //     selection.selectElement(debugElement);
            // }
        }

        const startElement = selection.getStartElement();
        const imageElement = this.findImageElement(startElement);

        if (!imageElement) {
            this.warn('No image element found in selection');
            return null;
        }

        const $imageEl = $(imageElement);
        const imageData = [
            [$imageEl.attr('src')],
            [$imageEl.width()],
            [$imageEl.height()]
        ];

        // Cache references
        this.currentElement = $imageEl;
        this.currentFigure = $imageEl.parents(this._state.selectors.figureClass);
        this.currentArray = imageData;

        debug.log('Image source data extracted:', imageData);
        return imageData;


    }

    /**
     * Find the image element from selection
     * @param {Object} startElement - CKEditor start element
     * @returns {jQuery|null} Image element
     * @private
     */
    findImageElement(startElement) {
        // If span element, look for image inside
        if (startElement.getName() === 'span') {
            const imageInSpan = startElement.find(this._state.selectors.graphicImage).getItem(0);
            if (imageInSpan) {
                return imageInSpan.$;
            }
        }

        // If already an image element
        if (startElement.getName() === 'img') {
            return startElement.$;
        }

        // Look in parent figure
        const $element = $(startElement.$);
        const $figure = $element.parents(this._state.selectors.figureClass);
        if ($figure.length > 0) {
            const $image = $figure.find(this._state.selectors.graphicImage);
            if ($image.length > 0) {
                return $image.get(0);
            }
        }

        return null;
    }

    /**
     * Calculate optimal dimensions for the annotation frame
     * @param {Array} imageData - Image data [src, width, height]
     * @returns {Object} Calculated dimensions
     * @private
     */
    calculateOptimalDimensions(imageData) {
        try {
            const [, [realWidth],
                [realHeight]
            ] = imageData;
            const {
                minWidth,
                minHeight,
                maxProcessableHeight,
                defaultPadding
            } = this._state.dimensions;

            let frameWidth = realWidth < minWidth ? realWidth + 250 :
                realWidth > 400 ? realWidth + 25 : realWidth + defaultPadding;

            let frameHeight = realHeight > maxProcessableHeight ?
                realHeight - 200 : realHeight + defaultPadding;

            // Ensure minimum dimensions
            frameWidth = Math.max(frameWidth, minWidth);
            frameHeight = Math.max(frameHeight, minHeight);

            const dimensions = {
                width: parseInt(frameWidth),
                height: parseInt(frameHeight),
                originalWidth: realWidth,
                originalHeight: realHeight
            };

            debug.log('Calculated dimensions:', dimensions);
            return dimensions;

        } catch (error) {
            this.handleError('calculateOptimalDimensions', error);
            // Return safe defaults
            return {
                width: 500,
                height: 400,
                originalWidth: 300,
                originalHeight: 200
            };
        }
    }

    /**
     * Apply calculated dimensions to the iframe
     * @param {Object} dimensions - Calculated dimensions
     * @private
     */
    applyFrameDimensions(dimensions) {
        try {
            if (!this.elements.iFRAME) {
                throw new Error('Iframe element not available');
            }

            const style = `border:none; overflow:hidden; background-color:white; width:${dimensions.width}px; height:${dimensions.height}px;`;

            this.elements.iFRAME.setAttribute('style', style);
            debug.log('Frame dimensions applied successfully');

        } catch (error) {
            this.handleError('applyFrameDimensions', error);
        }
    }

    /**
     * Load the annotation interface
     * @returns {Promise<void>}
     * @private
     */
    async loadAnnotationInterface() {
        try {
            const url = this.generateAnnotationUrl();
            this.elements.iFRAME.setAttribute('src', url);

            // Wait for frame to load
            await this.waitForFrameLoad();
            this.isFrameLoaded = true;

            debug.log('Annotation interface loaded from:', url);

        } catch (error) {
            this.handleError('loadAnnotationInterface', error);
            throw error;
        }
    }

    /**
     * Generate the annotation interface URL
     * @returns {string} Annotation URL
     * @private
     */
    generateAnnotationUrl() {
        try {
            const basePath = CKEDITOR.plugins.getPath('ImageAnotation_old');
            const timestamp = new Date().getTime();
            return `${basePath}ImgAnnot.html?_=${timestamp}`;
        } catch (error) {
            this.handleError('generateAnnotationUrl', error);
            // Fallback URL
            return 'ImgAnnot.html';
        }
    }

    /**
     * Wait for iframe to load
     * @returns {Promise<void>}
     * @private
     */
    waitForFrameLoad() {
        return new Promise((resolve, reject) => {
            const iframe = this.elements.iFRAME;
            const timeout = setTimeout(() => {
                reject(new Error('Iframe load timeout'));
            }, 10000);

            const onLoad = () => {
                clearTimeout(timeout);
                iframe.removeEventListener('load', onLoad);
                resolve();
            };

            iframe.addEventListener('load', onLoad);
        });
    }

    /**
     * Update image sources in the editor
     * @param {Array} imageData - Image data
     * @private
     */
    updateEditorImageSources(imageData) {
        try {
            const editor = this._editorRefs.globalEditor;

            const [imageSrc] = imageData[0];
            const $images = $(editor.document.find(this._state.selectors.graphicImage).$);

            $images.each(function () {
                const $img = $(this);
                if ($img.attr('src') === imageSrc) {
                    // Trigger refresh by reassigning src
                    $img.attr('src', $img.attr('src'));
                }
            });

            debug.log('Editor image sources updated');

        } catch (error) {
            this.handleError('updateEditorImageSources', error);
        }
    }

    /**
     * Setup width and height for annotation image
     * Enhanced version of the original setUpWidthHeight method
     * @public
     */
    setupDimensions() {
        try {
            if (!this.currentArray) {
                throw new Error('No current image data available');
            }

            const imageElement = $(this._annotationimgEl);
            if (imageElement.length === 0) {
                throw new Error(`Image element not found`);
            }

            const [imageSrc, [realWidth],
                [realHeight]
            ] = this.currentArray;

            // Set image source
            imageElement.attr("src", imageSrc);

            // Calculate responsive dimensions
            const responsiveDimensions = this.calculateResponsiveDimensions(realWidth, realHeight);

            // Apply dimensions to image
            this.applyImageDimensions(imageElement, responsiveDimensions);

            // Apply body dimensions
            this.applyBodyDimensions(responsiveDimensions);

            debug.log('Dimensions setup completed');

        } catch (error) {
            this.handleError('setupDimensions', error);
        }
    }

    /**
     * Calculate responsive dimensions based on viewport
     * @param {number} realWidth - Original width
     * @param {number} realHeight - Original height
     * @returns {Object} Responsive dimensions
     * @private
     */
    calculateResponsiveDimensions(realWidth, realHeight) {
        const {
            minWidth,
            minHeight
        } = this._state.dimensions;
        const viewportWidth = $(window.top).width();
        const viewportHeight = $(window.top).height();

        let bodyWidth = Math.max(realWidth, minWidth);
        let bodyHeight = Math.max(realHeight, minHeight);

        // Adjust for viewport constraints
        if (viewportWidth < bodyWidth) {
            const reduction = Math.floor((bodyWidth * 30) / 100);
            bodyWidth = viewportWidth - reduction;
        }

        if (viewportHeight < bodyHeight) {
            const reduction = Math.floor((bodyHeight * 30) / 100);
            bodyHeight = viewportHeight - reduction;
        }

        // Apply size-based adjustments
        if (bodyWidth > 700) {
            const adjustment = Math.floor((bodyWidth * 20) / 100);
            bodyWidth -= adjustment;
        } else {
            const adjustment = Math.floor((bodyWidth * 20) / 100);
            bodyWidth += adjustment;
        }

        if (bodyHeight > 400) {
            const adjustment = Math.floor((bodyHeight * 20) / 100);
            bodyHeight -= adjustment;
        } else {
            const adjustment = Math.floor((bodyHeight * 20) / 100);
            bodyHeight += adjustment;
        }

        return {
            bodyWidth,
            bodyHeight,
            imageWidth: bodyWidth + 95,
            imageHeight: realHeight > 700 ? bodyHeight - 220 : bodyHeight + 40
        };
    }

    /**
     * Apply calculated dimensions to image element
     * @param {jQuery} imageElement - Image element
     * @param {Object} dimensions - Calculated dimensions
     * @private
     */
    applyImageDimensions(imageElement, dimensions) {
        const style = `width:${dimensions.imageWidth}px; height:${dimensions.imageHeight}px; top:10px; position:relative; left:0px; z-index:0;`;
        imageElement.attr('style', style);
    }

    /**
     * Apply body dimensions if needed
     * @param {Object} dimensions - Calculated dimensions
     * @private
     */
    applyBodyDimensions(dimensions) {
        const $body = $('body');

        if (dimensions.bodyWidth > 700) {
            $body.width(`${dimensions.bodyWidth}px`);
        }

        if (dimensions.bodyHeight > 400) {
            $body.height(`${dimensions.bodyHeight}px`);
        }
    }

    /**
     * Load and setup annotation plugin script
     * Enhanced version of the original pluginLoadScript method
     * @param {Object} annotationLib - Annotation library instance
     * @public
     */
    loadPluginScript(annotationLib, annotationimgEl, pluginDocument) {
        try {
            debug.log('Loading annotation plugin script');

            // if (IS_LOCAL_HOST)  debugger;            

            this._annotationimgEl = annotationimgEl;
            this._pluginDocument = pluginDocument;
            // Load existing annotations
            const existingAnnotations = this.extractExistingAnnotations();

            // Setup dimensions
            this.setupDimensions();

            // Apply existing annotations when ready
            if (existingAnnotations.length > 0) {
                this.applyExistingAnnotations(annotationLib, existingAnnotations);
            }

            this.bindAnnotationEvents(annotationLib);
            debug.log('Plugin script loaded successfully');

        } catch (error) {
            this.handleError('loadPluginScript', error);
        }
    }

    /**
     * Extract existing annotations from the document
     * @returns {Array} Array of existing annotations
     * @private
     */
    extractExistingAnnotations() {
        const annotations = [];

        try {

            if (IS_LOCAL_HOST) debugger;

            if (!this.currentElement) {
                return annotations;
            }

            /* 
            <span data-class="ckcommentsfull" data-label="C4" data-status="comment" id="full_7Mip" data-comment="new" data-deleted="true" data-deleted-by="sivakumars@newgen.co" data-deleted-role="Author" data-deleted-time="1761669732030"> <span data-name="comment" data-comment="new" data-annotate="0.10488505747126436,0.13219616204690832,0.3635057471264368,0.3816631130063966,http://localhost/xmleditor/N9f5f3e23-822a-45a4-9eb1-cb9faff11211/images/MD-D-25-03502_F0002.png" data-user-comment-box="adding new" data-time="1761668796625" data-username="sivakumars@newgen.co" data-rolename="Author">&nbsp;</span> </span>
            
            */

            const $figure = this.currentElement.parents(this._state.selectors.figureClass);
            const $commentSpans = $figure.find(this._state.selectors.commentSpan);

            $commentSpans.each((index, span) => {
                const $span = $(span);

                // ✅ Ignore spans that have data-deleted (any truthy value)
                if ($span.is('[data-deleted]')) {
                    // skip this iteration
                    return;
                }

                const annotation = this.parseAnnotationData($span);
                if (annotation) {
                    annotations.push(annotation);
                }
            });

            debug.log(`Extracted ${annotations.length} existing annotations`);
            return annotations;

        } catch (error) {
            this.handleError('extractExistingAnnotations', error);
            return annotations;
        }
    }

    /**
     * Parse annotation data from span element
     * @param {jQuery} $span - Span element containing annotation
     * @returns {Object|null} Parsed annotation data
     * @private
     */
    parseAnnotationData($span) {
        try {
            const $innerSpan = $span.find('span');
            const annotateData = $innerSpan.attr(this._state.selectors.annotateAttr);
            const commentText = $innerSpan.attr(this._state.selectors.commentBoxAttr);

            if (!annotateData || !commentText || commentText.trim() === "") {
                return null;
            }

            const dataParts = annotateData.split(',');
            if (dataParts.length < 5) {
                this.warn('Invalid annotation data format:', annotateData);
                return null;
            }

            return {
                src: dataParts[4],
                text: commentText,
                shapes: [{
                    type: 'rect',
                    geometry: {
                        x: parseFloat(dataParts[0]),
                        y: parseFloat(dataParts[1]),
                        width: parseFloat(dataParts[2]),
                        height: parseFloat(dataParts[3])
                    }
                }]
            };

        } catch (error) {
            this.handleError('parseAnnotationData', error);
            return null;
        }
    }

    /**
     * Apply existing annotations to the annotation library
     * @param {Object} annotationLibrary - Annotation library instance
     * @param {Array} annotations - Array of annotations to apply
     * @private
     */
    applyExistingAnnotations(annotationLibrary, annotations) {
        var initiated = false;

        function yourInitFunction() {
            annotations.forEach((annotation, index) => {
                annotationLibrary.addAnnotation(annotation);
                debug.log(`Applied annotation ${index + 1}/${annotations.length}`);
                initiated = true;
            });

        }
        if (this._pluginDocument) {
            if (this._pluginDocument.readyState === 'complete') {
                yourInitFunction();
            } else {
                this._pluginDocument.addEventListener('load', yourInitFunction);
            }
        }
        if (!initiated && typeof annotationLibrary.addAnnotation == "function") {
            yourInitFunction();
        }
    }

    /**
     * Bind annotation events to the annotation library
     * Enhanced version of the original annotationEvtBind method
     * @param {Object} annotationLibrary - Annotation library instance
     * @public
     */
    bindAnnotationEvents(annotationLibrary) {
        try {
            debug.log('Binding annotation events');
            this.annotationHandler = annotationLibrary;

            // Bind creation event
            annotationLibrary.addHandler('onAnnotationCreated', (annotation) => {
                this.handleAnnotationCreated(annotation);
            });

            // Bind update event
            annotationLibrary.addHandler('onAnnotationUpdated', (annotation) => {
                this.handleAnnotationUpdated(annotation);
            });

            // Bind removal events
            annotationLibrary.addHandler('onAnnotationRemoved', (annotation) => {
                this.handleAnnotationRemoved(annotation);
            });

            annotationLibrary.addHandler('beforeAnnotationRemoved', (annotation) => {
                this.handleAnnotationUpdated(annotation, true);
            });
            // Bind mouse events
            annotationLibrary.addHandler('onMouseOverAnnotation', (annotation) => {
                // this.handleMouseOverAnnotation(annotation);
            });

            /* 
            
            annotationLibrary.addHandler('beforePopupShow', (annotation) => {
                debug.log('-------------beforePopupShow----------');
                // this.handleMouseOverAnnotation(annotation);
                const canEditDelete = this.checkUserPermissions();
                const { edit, delete: deleteOpt, hide } = canEditDelete;
                return edit;
            });

            */

            annotationLibrary.addHandler('onPopupShown', (annotation) => {
                debug.log('-------------onPopupShown----------');
            });
            annotationLibrary.addHandler('beforePopupHide', (annotation) => {
                debug.log('-------------beforePopupHide----------');
            });


            debug.log('Annotation events bound successfully');

        } catch (error) {
            this.handleError('bindAnnotationEvents', error);
        }
    }

    /**
     * Handle annotation creation
     * @param {Object} annotation - Created annotation
     * @private
     */
    handleAnnotationCreated(annotation) {
        try {
            debug.log('Handling annotation creation');

            const annotationText = annotation.text && annotation.text.trim();
            if (!annotationText) {
                this.warn('Empty annotation text, skipping creation');
                return;
            }

            const annotationData = this.buildAnnotationDataString(annotation);

            const results = this.createAnnotationCommand(null, annotationText, annotationData);
            const {
                query
            } = results;
            // if (IS_LOCAL_HOST) debugger;

            /*
            this.insertAnnotationIntoDocument(commandString);
            this.renumberAnnotationsAndRefreshPanel();
            */
            setTimeout(() => {
                this.closeModule();
            }, 750);
            debug.log('Annotation created successfully');

        } catch (error) {
            this.handleError('handleAnnotationCreated', error);
        }
    }

    /**
     * Handle annotation update
     * @param {Object} annotation - Updated annotation
     * @private
     */
    async handleAnnotationUpdated(annotation, isDelete = false) {
        try {
            debug.log('Handling annotation update');

            const annotationText = isDelete ? "" : annotation.text && annotation.text.trim();
            const annotationData = this.buildAnnotationDataString(annotation);

            if (!this.currentFigure) {
                this.warn('Cannot update annotation: missing figure or text');
                return;
            }
            var results = {};
            var ckcommentsfull = this.getCurrentCommentNode(annotation);
            if (ckcommentsfull && ckcommentsfull) {
                var cmdId = ckcommentsfull.getId();
                if (cmdId) {
                    results = await this.createAnnotationCommand(cmdId, annotationText, annotationData);
                }
            }

            /* if (annotation.text == "") {
                this.handleBeforeAnnotationRemoved(annotation);
            } else {
                const selector = `[${this._state.selectors.commentBoxAttr}][${this._state.selectors.annotateAttr}]`;
                this.currentFigure.find(selector).attr(this._state.selectors.commentBoxAttr, annotationText);
            } */

            // this.renumberAnnotationsAndRefreshPanel();
            this.closeModule();
            debug.log('Annotation updated successfully');

        } catch (error) {
            this.handleError('handleAnnotationUpdated', error);
        }
    }

    /**
     * Handle annotation removal
     * @param {Object} annotation - Removed annotation
     * @private
     */
    handleAnnotationRemoved(annotation) {
        debug.log('Annotation removed');
        // Additional cleanup logic if needed
    }

    getCurrentCommentNode(annotation) {

        debug.log('get Current Comment Node');

        try {
            const editor = this._editorRefs.globalEditor;

            const annotationData = this.buildAnnotationDataString(annotation);
            const element = editor.document.findOne(`[${this._state.selectors.annotateAttr}="${annotationData}"]`);

            if (element && element.getParent) {
                const ckcommentsfull = element.hasAttribute("data-class") ?
                    element :
                    element.getParent() || element.getAscendant(el =>
                        typeof el.getAttribute === "function" && el.getAttribute("data-class") === "ckcommentsfull"
                    );

                return ckcommentsfull;
            }
            return null;
        } catch (err) {
            return null;
        }
    }

    /**
     * Handle before annotation removal
     * @param {Object} annotation - Annotation about to be removed
     * @private
     */
    handleBeforeAnnotationRemoved(annotation) {
        try {

            debug.log('Handling before annotation removal');

            var ckcommentsfull = this.getCurrentCommentNode(annotation);
            if (ckcommentsfull) {
                const parent = ckcommentsfull && ckcommentsfull.getParent();
                if (parent?.getName?.().toLowerCase() === "insert") {
                    $(parent.$).remove();
                } else {
                    $(element.$).remove();
                }
            }

            this.renumberAnnotationsAndRefreshPanel();
            this.closeModule();

            debug.log('Annotation removal handled successfully');

        } catch (error) {
            this.handleError('handleBeforeAnnotationRemoved', error);
        }
    }

    /**
     * Handle mouse over annotation
     * @param {Object} annotation - Annotation being hovered
     * @private
     */
    handleMouseOverAnnotation(annotation) {
        try {

            debug.log('Handling mouse over annotation');

            // Hide edit/delete buttons based on user permissions
            const canEditDelete = this.checkUserPermissions();
            const {
                editOpt,
                deleteOpt,
                hide
            } = canEditDelete;

            const {
                contentDocument: iframeDoc
            } = this.elements.iFRAME;
            if (iframeDoc) {
                this.elements.FrameContentDocument = iframeDoc;
                this.elements.Frame_ButtonGroup = iframeDoc.querySelector('.annotorious-popup-buttons');
            }

            const {
                iFRAME,
                Frame_ButtonGroup,
                FrameContentDocument
            } = this.elements;

            if (FrameContentDocument) {
                // ms
                const fadeDuration = 500;
                // ms before applying opacity change
                const delay = 200;
                if (!this.elements.Frame_ButtonGroup) this.elements.Frame_ButtonGroup = FrameContentDocument.querySelector('.annotorious-popup-buttons');

                Frame_ButtonGroup.style.transition = `opacity ${fadeDuration}ms ease`;

                setTimeout(() => {
                    if (hide) {
                        Frame_ButtonGroup.style.opacity = '0';
                    } else if (editOpt || deleteOpt) {
                        Frame_ButtonGroup.style.opacity = '1';
                    }
                }, delay);
            }

            return editOpt;

        } catch (error) {
            this.handleError('handleMouseOverAnnotation', error);
        }
    }

    /**
     * Check if current user has edit permissions
     * @returns {boolean} Whether user can edit
     * @private
     */
    checkUserPermissions(annotation) {
        var defaultR = {
            editOpt: false,
            deleteOpt: false,
            hide: false
        };
        try {
            var $ckcommentsfull = this.getCurrentCommentNode(annotation);
            const {
                annotateAttr
            } = this._state.selectors;

            if ($ckcommentsfull && $ckcommentsfull.$) {
                var spanAnnotate = $ckcommentsfull.$.querySelector(`[${annotateAttr}]`);
                var canEditDelete = commonMethods.IS_SAME_USER_AND_ROLE(spanAnnotate);
                return {
                    editOpt: canEditDelete,
                    deleteOpt: canEditDelete,
                    hide: !canEditDelete
                };
            }

            return defaultR;

        } catch (error) {
            this.handleError('checkUserPermissions', error);
            return defaultR;
        }
    }

    /**
     * Build annotation data string from annotation object
     * @param {Object} annotation - Annotation object
     * @returns {string} Formatted annotation data
     * @private
     */
    buildAnnotationDataString(annotation) {
        try {
            const geometry = annotation.shapes[0].geometry;
            return `${geometry.x},${geometry.y},${geometry.width},${geometry.height},${annotation.src}`;
        } catch (error) {
            this.handleError('buildAnnotationDataString', error);
            return '';
        }
    }

    /**
     * Create annotation command string
     * @param {string} text - Annotation text
     * @param {string} annotationData - Annotation data string
     * @returns {jQuery} Command string element
     * @private
     */
    async createAnnotationCommand(queryId = null, text, annotationData) {
        try {

            var self = this;
            var paramsEl = this.currentFigure;
            const caption = this.currentFigure.find('.caption');
            if (caption.length > 0) paramsEl = caption[0];
            const additionalAttr = `${this._state.selectors.annotateAttr}="${annotationData}"`;
            const preSaveResults = {
                hasContent: text.length > 0,
                htmlData: text,
                textData: text,
                htmlLength: text.length,
                textLength: text.length,
                unchanged: false,
                canSave: true,
                canClose: false,
                domEl: null
            };

            return await window.queryModule.operationInsertOrUpdate({
                name: self.name
            }, queryId, preSaveResults, {
                from: "image_annotate",
                process: "comment",
                appendEl: paramsEl,
                addAttr: additionalAttr
            }, {
                domEl: null,
                addAttr: additionalAttr
            });

        } catch (error) {
            this.handleError('createAnnotationCommand', error);
            throw error;
        }
    }

    /**
     * Insert annotation into document
     * @param {jQuery} commandString - Command string to insert
     * @private
     */
    insertAnnotationIntoDocument(commandString) {
        try {
            if (!this.currentFigure) {
                throw new Error('No current figure available for insertion');
            }

            const caption = this.currentFigure.find('.caption');

            if (caption.length > 0) {
                caption.last().append(commandString);
            } else {
                this.currentFigure.find('.graphic').before(commandString);
            }

            debug.log('Annotation inserted into document');

        } catch (error) {
            this.handleError('insertAnnotationIntoDocument', error);
            throw error;
        }
    }

    /**
     * Renumber all annotations in the document
     * @private
     */
    renumberAnnotationsAndRefreshPanel() {
        try {
            const editor = this._editorRefs.globalEditor;
            if (window.panelModule.refresh) {
                window.panelModule.refresh(true);
            }
            this.refreshPanelDefault();
        } catch (error) {
            this.handleError('renumberAnnotations', error);
        }
    }

    /**
     * Cleanup resources when closing
     * @private
     */
    cleanup() {
        try {
            // Clear event listeners
            if (this.annotationHandler && this.annotationHandler.destroy) {
                this.annotationHandler.destroy();
            }

            // Clear cached data
            this._editorRefs = null;
            this.isFrameLoaded = false;

            debug.log('Cleanup completed');

        } catch (error) {
            this.handleError('cleanup', error);
        }
    }

    // ===== UTILITY METHODS =====


    /**
     * Simple error handler using common error handling
     * @param {string} method - Method where error occurred
     * @param {Error} error - Error object
     * @private
     */
    handleError(method, error) {
        const errorMessage = `AnnotationModule.${method}: ${error.message}`;
        console.error(errorMessage, error);

        // Use common error handling if available
        if (typeof ErrorLogTrace === 'function') {
            // ErrorLogTrace(`ANNOTATION_${method.toUpperCase()}`, error.message);
        }
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {*} data - Optional data to log
     * @private
     */
    warn(message, data = null) {
        console.warn(`[AnnotationModule] ${message}`, data);
    }

    // ===== LEGACY COMPATIBILITY METHODS =====

    /**
     * Legacy method name support - maps to assignVariablesEventLoop
     * @deprecated Use assignVariablesEventLoop instead
     * @public
     */
    AssignVar_EventLoop() {
        // this.warn('AssignVar_EventLoop is deprecated, use assignVariablesEventLoop instead');
        return this.assignVariablesEventLoop();
    }

}



export default AnnotationModule;
