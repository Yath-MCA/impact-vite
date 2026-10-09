class CitationPopupDialog {
    constructor(name, options = {}) {
        this._id = 'citePopupDialog';
        this.template = `
            <div class="citePopup" id="citePopupDialog">
                <div id="closeIconDiv" class="" title="Close">
                    <img alt="close" class="n_Img" src="assets/images/svg/dialogClose.svg">
                </div>
                <button id="gotoBtn" class="btn btn-primary primary-btn btn-sm" title="Click Back to Citation button to navigate back (Shortcut: Alt + Left arrow)">
                    Back to Citation
                </button>
            </div>
        `;
        this.panel = null;
        this.closeIcons = null;
        this.gotoCiteBtn = null;
        this.citePopInterval = null;
        this.IntervalRetryCount = 0;
        this.nextElemPos = null;
        this.prevElemPos = null;
        this.template = this.template.trim();

        this.init(options);
    }

    init(options = {}) {
        try {
            const dom = document.getElementById('ModelDialogAppend');
            if (!document.getElementById(this._id)) {
                dom.append(this.getFragment(this.template));
            }

            this.panel = document.getElementById(this._id);
            this.closeIcons = this.panel.querySelector('#closeIconDiv');
            this.gotoCiteBtn = this.panel.querySelector('#gotoBtn');

            // Bind methods to maintain correct context
            this.closeIcons.onclick = this.citePopClose.bind(this);
            this.gotoCiteBtn.onclick = this.fireCkExecCommand.bind(this);


        } catch (err) {
            console.warn(err.message);
            this.trackError('init', err.message);
        }
    }

    // Utility method to create fragment (assuming similar to original iGetFragment)
    getFragment(template) {
        const temp = document.createElement('template');
        temp.innerHTML = template.trim();
        return temp.content;
    }

    citePopClose() {
        try {
            clearInterval(this.citePopInterval);
            $(this.panel).hide();
        } catch (err) {
            console.warn(err.message);
            this.trackError('CitePopClose', err.message);
        }
    }

    citePopTimer() {
        try {
            const opacity = parseFloat($(this.panel).css('opacity'));
            if (opacity === 0.1) {
                clearInterval(this.citePopInterval);
                $(this.panel).hide();
            } else {
                $(this.panel).css('opacity', opacity - 0.05);
            }
        } catch (err) {
            console.warn(err.message);
            this.trackError('CitePopTimer', err);
        }
    }

    fireCkExecCommand() {
        try {
            // Assuming GlobalEditor is a global object
            if (window.GlobalEditor) {
                window.GlobalEditor.execCommand('PrevSelction');
            }
        } catch (err) {
            console.warn(err.message);
            this.trackError('fire_CK_execCommand', err.message);
        }
    }

    GotoCaption(element) {
        try {
            this.nextElemPos = (element.tag === 'A' && element.class_name === 'xref') ?
                element.element :
                element.element.getAscendant({
                    a: 1
                }, true);

            if (this.nextElemPos &&
                this.nextElemPos.getAttribute('rid') != null &&
                !this.nextElemPos.hasAttribute('data-remove') &&
                !this.nextElemPos.hasAttribute('data-delete')) {

                const nextId = this.nextElemPos.getAttribute('rid').split(' ')[0];
                const targetElement = window.GlobalEditor.document.find(`[id='${nextId}']`).getItem(0);

                targetElement.scrollIntoView(true);
                this.prevElemPos = this.nextElemPos;
                this.nextElemPos = null;

                clearInterval(this.citePopInterval);
                $(this.panel).css('opacity', '1').show();
                this.citePopInterval = setInterval(this.citePopTimer.bind(this), 2000);
            }
        } catch (err) {
            console.warn(err.message);
            this.trackError('GotoCaption', err.message);
        }
    }

    GotoCite(ref) {
        try {
            let [id, isDelete] = [null, null];
            if (ref) {
                isDelete = ref.hasAttribute('data-remove');
                ref = ref.$ ? ref.$ : (ref[0] ? ref[0] : ref);
                id = isDelete ? ref.getAttribute("del_id") : ref.id;
            }

            if ((!this.prevElemPos && id) ||
                (this.prevElemPos && this.prevElemPos.getAttribute('rid').indexOf(id) === -1)) {
                var selectors = commonMethods.xrefSelectorBuilder(id, [], isDelete);

                const elm = window.GlobalEditor.document.findOne(selectors);

                if (elm) elm.scrollIntoView(true);
                else {
                    AlertNewDialog.fire('warning', "Warning", 'MISS_GOTO_CITE', 'OK', '', true, {
                        override: false
                    });
                }
            } else if (this.prevElemPos) {
                window.CKEDITOR.instances.maineditor.execCommand('PrevSelction');
            }

            this.prevElemPos = null;
        } catch (err) {
            console.warn(err.message);
            this.trackError('GotoCite', err.message);
        }
    }

    // Placeholder for error logging - replace with actual implementation
    errorLogTrace(method, message) {
        console.error(`Error in ${method}: ${message}`);
    }

    static commonFunction(funcname, args) {
        try {
            this[funcname](...args);
        } catch (err) {
            console.warn(err.message);
            this.trackError('GotoCaption', err.message);
        }

    }
}

// Export or use as needed
export default CitationPopupDialog;