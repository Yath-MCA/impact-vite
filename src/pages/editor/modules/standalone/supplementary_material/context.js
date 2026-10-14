const SUPP_MODULE_ID = 'SuppMaterialModule';

/**
 * True only when the click is on the italic filename (::after from xlink:href).
 * Clicks on caption/title/description children must return false so editing is undisturbed.
 */
function isSuppFilenameClick(target, nativeEvent) {
    try {
        if (!target || !nativeEvent) return false;

        let suppFileEl = target.closest('.supplementary-material');
        let iceParent = null;
        if (!suppFileEl) {
            const tag = (target.tagName || '').toLowerCase();
            if (['insert', 'delete', 'modify'].indexOf(tag) !== -1) {
                const child = target.querySelector(':scope > .supplementary-material');
                if (child) {
                    suppFileEl = child;
                    iceParent = target;
                }
            }
        }
        const secEl = target.closest('[sec-type="supplementary-material"]') ||
            (suppFileEl && suppFileEl.closest('[sec-type="supplementary-material"]'));
        if (!suppFileEl || !secEl || !secEl.contains(suppFileEl)) return false;

        // Editing text: click landed on a child — never open
        // ICE wrap as target is the add-tracking parent of the file, not a child
        if (target !== suppFileEl && target !== iceParent) return false;

        // Host click but still over a child box — treat as content, not filename
        const {
            clientX,
            clientY
        } = nativeEvent;
        for (const kid of suppFileEl.children) {
            const r = kid.getBoundingClientRect();
            if (clientX >= r.left && clientX <= r.right &&
                clientY >= r.top && clientY <= r.bottom) {
                return false;
            }
        }
        // Outside all children → italic ::after filename region
        return true;
    } catch (err) {
        console.warn(err.message);
        return false;
    }
}

const SUPP_MODULE_CONFIG = {
    name: 'SupplementaryMaterial',
    path: './supplementary_material/index.js',
    templatePath: './supplementary_material/template.html',
    type: 'lazy',

    group_name: "SupplimentaryDialog",
    commands: [{
        name: 'SHOW_SUPP',
        action: 'showDialog',
        label: "Show Dialog",
        icon: '../assets/images/svg/ContextMenu/Add.svg',
        order: 1111,
        ignore_menu: true
    }],
    // editor, item, moduleConfig
    // executeCommand: async function (editor, callGroup, moduleConfig, params) {},
    onContentDomUpdate: function(editor, editable) {

        // , 'keyup', 'mouseup', 'keydown'
        const events = ['click'];
        const moduleId = 'SuppMaterialModule';
        debug.log(`Content for ${moduleId} module`);
        events.forEach((eventName) => {
            editable.attachListener(editable, eventName, async (e) => {

                if (!window[moduleId]) {
                    window[moduleId] = await moduleSystem.getModule(moduleId);
                }

                if (window[moduleId]) {
                    // debug.log(`Event: ${eventName} triggered in ${moduleId} module ${Date.now()}`);
                    var target = e.data.getTarget().$;
                    var titleEl = target.closest('.title');
                    var secEl = target.closest('[sec-type="supplementary-material"]');
                    var isSuppHeader = titleEl && secEl;
                    if (IS_JOURNAL) {

                        // Filename ::after click only — does not affect text editing
                        if (isSuppFilenameClick(target, e.data.$)) {
                            SuppMaterialModule.show();
                            return;
                        }

                        if (isSuppHeader) {
                            var nativeEvent = e.data.$;
                            const {
                                layerX,
                                layerY,
                                offsetX,
                                offsetY,
                                pageX,
                                pageY,
                                screenX,
                                screenY
                            } = nativeEvent;
                            const {
                                CUR_SEL,
                                ISEndOfBlock
                            } = IMPACT_SELECTION;
                            const {
                                endOffset,
                                startOffset
                            } = IMPACT_SELECTION.RG_INFO.RANGE;

                            // 🔽 New logic to differentiate title and supp-trigger
                            if (target.classList.contains('supp-trigger')) {
                                console.log('CKEditor: Clicked on Supp Files List button');
                                // Optionally call a function: SuppMaterialModule.openSuppList(target);
                            } else {
                                console.log('CKEditor: Clicked on title text');
                                // Optionally call: SuppMaterialModule.titleClicked(target);
                            }

                            var rect = target.getBoundingClientRect();
                            var Diff_offsetX = nativeEvent.clientX - rect.left;
                            var Diff_offsetY = nativeEvent.clientY - rect.top;

                            debug.log('native Offset → offsetX:', offsetX, '| offsetY:', offsetY);
                            debug.log('Calculated Offset → offsetX:', Diff_offsetX, '| offsetY:', Diff_offsetY);
                            debug.log('range startOffset:', startOffset, '| endOffset:', endOffset);


                            var mouseX = pageX;
                            var mouseY = pageY;

                            var sel = window.getSelection();
                            var cursorX = 0,
                                cursorY = 0;
                            if (sel.rangeCount > 0) {
                                var range = sel.getRangeAt(0).cloneRange();
                                var rects = range.getClientRects();
                                if (rects.length > 0) {
                                    var rect = rects[0];
                                    cursorX = rect.left + window.scrollX;
                                    cursorY = rect.top + window.scrollY;
                                }
                            }

                            var tolerance = 5;
                            var isSamePosition = Math.abs(mouseX - cursorX) <= tolerance && Math.abs(mouseY - cursorY) <= tolerance;

                            debug.log('Mouse:', mouseX, mouseY, '| Cursor:', cursorX, cursorY);
                            debug.log('Is Same Position:', isSamePosition);

                            // var seletion = ev.editor.getSelection(), bookmark = seletion.createBookmarks(true);
                            // debug.log('bookmark:', bookmark[0]);

                            if (ISEndOfBlock) SuppMaterialModule.show();

                        }
                    }
                }
            });
        });


    },
    // contextMenuHandler: function (element, selection, elementPath, editor, subItems) {}
};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(SUPP_MODULE_ID, SUPP_MODULE_CONFIG);
});