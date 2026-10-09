

/***
 **  div class="mDialog ds-none w-editor-access" id="GrayscaleDialog" 
 
            
*/
class GrayscaleModule extends BaseModule {

    constructor(name, errorTracker, options = {}) {
        super(name, errorTracker, options);
        this.initializeProperties();
        this.bindMethods();
        this.initiated = true;
    }

    initializeProperties() {
        this.templateList = {};
        this.canUnmountComponentWhileClose = true;
        this.TOASTER_MESSAGE = {};
        this._state = {
            text_limit: { min: 25, max: 75 },
            templateList: {
                spin: `<span id="spinner_dv" class="spinner-border iSpin_border" role="status"><span class="sr-only"></span></span>`
            }
        };
    }

    bindMethods() {
        const methodsToBind = [
            'AssignVar_EventLoop', 'initLoop', 'showLoop', 'fireRestore', 'closeModule'
        ];
        methodsToBind.forEach(method => {
            if (this[method]) this[method] = this[method].bind(this);
        });
    }

    initLoop() {
        this.AutoInitiated = true;
        this.FullyLoaded = true;
    }

    showLoop(params, Options = {}) {

        if (IS_LOCAL_HOST) debugger;

        this._IMS = IMPACT_SELECTION || {};
        this._EC = EDITOR_CURSOR || {};
        this.AssignVar_EventLoop();
        const { VIEWER_IMG, PANEL_HEADER_TXT } = this.elements;
        VIEWER_IMG.src = "";

        // Normalize param: handle if it's a direct element or object
        const element = (params && typeof params.getName === "function") ? params : params?.element?.$;

        if (!element) return this.closeModule();

        const imgElement = element.querySelector?.("img");
        if (imgElement) {
            const srcValue = imgElement.src || "";

            const captionEl = element.previousElementSibling;
            const captionLabel = (captionEl?.className === "caption")
                ? ` - ${captionEl.getAttribute("data-label")}`
                : "";

            const dataLabel = `Black and White version${captionLabel}`;
            const grayscaleSrc = srcValue.replace("/images", "/images/greyscale");

            VIEWER_IMG.src = grayscaleSrc;
            PANEL_HEADER_TXT.innerHTML = dataLabel;
        }
    }

    AssignVar_EventLoop() {
        const KEY_WITH_ID = {
            PANEL_BODY: ".dialog-body",
            PANEL_FOOTER: ".dialog-footer",
            PANEL_HEADER: ".dialog-header",
            PANEL_HEADER_TXT: ".dia_header_text",
            PANEL_CONTENT: ".dialog-content",
            VIEWER_IMG: "#gray_scale_viewer",

        };


        Object.entries(KEY_WITH_ID).forEach(([key, value]) => {
            this.elements[key] = this.Panel.querySelector(value);
        });

    }

    closeModule() {
        if (typeof this.closeDialog == "function") this.closeDialog();
        else this.Panel.classList.add("ds-none");
    }
}

export default GrayscaleModule;