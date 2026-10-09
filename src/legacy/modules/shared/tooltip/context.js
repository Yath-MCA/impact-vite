const TOOLTIP_MODULE_ID = 'TOOLTIP_MODULE';
const TOOLTIP_MODULE_CONFIG = {
    name: 'TooltipModule',
    type: 'onthefly',
    path: './tooltip/index.js',
    templatePath: '',
    dependencies: [],
    wrapping: true,
    trackView: true,

    group_name: 'xToolTip',
    groupOrder: 120,
    commands: [],
    onContentDomUpdate: async function (editor, editable) {

        console.log('Content updated for TooltipModule module');
        if (!window[TOOLTIP_MODULE_ID]) {
            window[TOOLTIP_MODULE_ID] = await moduleSystem.getModule(TOOLTIP_MODULE_ID);
        }

        ['mouseover', 'mouseout', 'mousedown'].forEach((eventName) => {
            editable.attachListener(editable, eventName, (evt) => {
                // debug.log(`Event: ${eventName} triggered in hyperLinkDialog module`);
                const eventType = evt.name;
                const element = evt.data.getTarget();
                const linkTypes = ['email', 'link', 'uri', 'ext-link'];
                const hideTip = () => {
                    if (typeof TOOLTIP_MODULE !== 'undefined' && typeof TOOLTIP_MODULE.hide === 'function') {
                        TOOLTIP_MODULE.hide();
                    }
                };

                // Find the ancestor for applicable events
                if (eventType === 'mouseout') {
                    hideTip();
                } else {
                    if (['mousedown'].includes(eventType)) {
                        if (evt.data && evt.data.$ && evt.data.$.button && evt.data.$.button == 2) {
                            // ? If TOOL-TIP SHOWED - HIDE WHILE RIGHT CLICK  - 24_NOV_22
                            hideTip();
                        }
                    } else if (eventType === 'mouseover') {
                        const ancestor = commonMethods.getAscent(element, '[data-name]', linkTypes);
                        let target = ancestor ? ancestor : commonMethods.getAscent(element, '[data-name],[contrib-id]', ["xref", "related-object", "contrib"]);
                        // Books-only filter: related-object must be bibr (not a second discovery path)
                        const relatedTargetName = target ? target.getAttribute('data-name') : null;
                        const relatedTargetRole = target ? target.getAttribute('data-role') : null;
                        if (target && relatedTargetName === 'related-object') {
                            if (IS_JOURNAL || !TOOLTIP_MODULE.isValidXrefType(relatedTargetRole)) {
                                target = null;
                            }
                        }

                        if (target && typeof TOOLTIP_MODULE !== 'undefined') {
                            const targetName = target.getName();
                            const elementName = element.getName();
                            if (targetName !== elementName) {
                                if (targetName == "a") {
                                    debug.log("we can allow this");
                                } else {
                                    debug.log('Mouseover ancestor:', targetName, 'Mouseover element:', elementName);
                                    return;
                                }
                            }
                            TOOLTIP_MODULE.IsPopUpTime(target, evt);
                        }

                    }
                }

            });

        });
    }
    // contextMenuHandler: function (element, selection, elementPath, editor, subItems) {}
};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(TOOLTIP_MODULE_ID, TOOLTIP_MODULE_CONFIG);
});
