/* 

https://claude.site/artifacts/166af5ce-8612-4c7f-85a6-bccd56b07143

https://claude.ai/chat/0347d25d-965e-4a8e-b648-1a10a4605e45


*/

class AbstractModule extends BaseModule {

    constructor(name, errorTracker, options = {}) {

        super(name, errorTracker, options);

        this.config = {};

        this.initiated = false;
        this.FullyLoaded = false;

        this.initializeProperties();

    }

    initializeProperties() {

        this.findQuery = '.abstract[abstract-type="abstract"]';
        this.DE_STR_FIND = 'data-de-str';
        this.REPLACE_TAGS = {
            "DESRT": { // De Structure
                FROM: "DIV",
                TO: "SPAN"
            },
            "RESRT": { // Re Structure
                FROM: "SPAN",
                TO: "DIV"
            }
        };
        this.config.SHOW_CONTEXT_GROUP = IsContextMenu('Abstruct');
    }

    handleOldPatterns(absDom) {
        try {
            absDom.querySelectorAll('.title').forEach((elm) => {
                const parent = elm.parentElement;
                const pi = elm.querySelector('.pistart');
                const piText = pi ? (pi.hasAttribute('data-pistart') ? pi.getAttribute('data-pistart') : '') : '';
                const titleText = elm.textContent + piText;
                parent.setAttribute('data-title', titleText);
                parent.setAttribute('data-pi', piText);
                commonMethods.removeEl(elm);
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('handleOldPatterns', err.message);
        }
    }

    structure(method) {
        try {
            AutoSaveBool = false;
            const absDom = GlobalEditor.document.find(this.findQuery).getItem(0).$;
            const absDomClone = absDom.cloneNode(true);
            const {
                FROM,
                TO
            } = this.REPLACE_TAGS[method];

            const isReStr = method === 'RESRT';

            if (!isReStr) this.handleOldPatterns(absDomClone);

            absDomClone.querySelectorAll(FROM).forEach((elm) => {
                if (!elm.classList.contains('sec') && isReStr) return;
                const newDom = commonMethods.setAttr(TO, elm.attributes);
                newDom.innerHTML = elm.innerHTML;
                elm.replaceWith(newDom);
            });

            absDomClone[isReStr ? 'removeAttribute' : 'setAttribute'](this.DE_STR_FIND, '1');
            absDom.replaceWith(absDomClone);
            AutoSaveBool = true;
            IMPACT_SELECTION._SNAPSHOT({
                save: true
            });
            GlobalEditor.focus();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('structure', err.message);
        }
    }

    applyHead() {
        try {

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('applyHead', err.message);
        }
    }

    test2() {
        try {

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('test2', err.message);
        }
    }

    initLoop() {
        try {
            editorListener({
                name: "AbstractGroup",
                order: 80,
                cmd: ["ABS_UNSTR", "ABS_STR"],
                menu_items: {
                    "ABS_UN_STR_ITEM": {
                        label: "Unstructure Abstract",
                        command: 'ABS_DESRT',
                        group: 'AbstractGroup',
                        icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
                        order: 81
                    },
                    "ABS_STR_ITEM": {
                        label: "Re-structure Abstract",
                        command: 'ABS_RESRT',
                        group: 'AbstractGroup',
                        icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
                        order: 82
                    }
                }
            });
            this.FullyLoaded = this.initiated = true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('init', err.message);
        }
    }
}

window.Abstract_Module = new AbstractModule();