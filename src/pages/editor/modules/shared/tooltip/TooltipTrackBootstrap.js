/**
 * TooltipTrackBootstrap — Track View xref/link/orcid hover tips (no module_main).
 * Mirrors QC Track: ES import + light init; listeners match tooltip/context.js.
 */
import TooltipModule from './index.js';

const LINK_TYPES = ['email', 'link', 'uri', 'ext-link'];

/**
 * Same mouseover/out/mousedown rules as tooltip/context.js onContentDomUpdate.
 * @param {CKEDITOR.editor} editor
 * @param {TooltipModule} [tooltip]
 */
export function attachTooltipListeners(editor, tooltip) {
    const tip = tooltip || window.TOOLTIP_MODULE;
    if (!editor || !tip) return;

    const editable = editor.editable && editor.editable();
    if (!editable || editable._tooltipTrackListenersAttached) return;
    editable._tooltipTrackListenersAttached = true;

    ['mouseover', 'mouseout', 'mousedown'].forEach((eventName) => {
        editable.attachListener(editable, eventName, (evt) => {
            const eventType = evt.name;
            const element = evt.data.getTarget();
            const hideTip = () => {
                if (typeof tip.hide === 'function') tip.hide();
            };

            if (eventType === 'mouseout') {
                hideTip();
                return;
            }

            if (eventType === 'mousedown') {
                if (evt.data && evt.data.$ && evt.data.$.button === 2) {
                    hideTip();
                }
                return;
            }

            if (eventType !== 'mouseover') return;
            if (typeof commonMethods === 'undefined' || typeof commonMethods.getAscent !== 'function') return;

            const ancestor = commonMethods.getAscent(element, '[data-name]', LINK_TYPES);
            let target = ancestor ?
                ancestor :
                commonMethods.getAscent(element, '[data-name],[contrib-id]', ['xref', 'related-object', 'contrib']);

            // Books-only filter: related-object must be bibr (not a second discovery path)
            if (target && target.getAttribute('data-name') === 'related-object') {
                const isJournal = typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL;
                if (isJournal || target.getAttribute('data-role') !== 'bibr') {
                    target = null;
                }
            }

            if (!target) return;

            const targetName = target.getName();
            const elementName = element.getName();
            if (target.$) {
                const isDeleted = target.$.closest("del") || target.$.querySelector("del");
                if (isDeleted) return;
            }

            if (targetName !== elementName) {
                if (targetName !== 'a') return;
            }

            tip.IsPopUpTime(target, evt);
        });
    });
}

/**
 * Construct TooltipModule, expose window.TOOLTIP_MODULE, attach listeners when editor is ready.
 * @param {CKEDITOR.editor} [editor]
 * @returns {TooltipModule|null}
 */
export function bootstrapTooltipTrack(editor) {
    if (typeof IS_TRACK_VIEW === 'undefined' || !IS_TRACK_VIEW) {
        return null;
    }

    if (!window.TOOLTIP_MODULE) {
        const instance = new TooltipModule('TooltipModule', null, {});
        if (!instance.Panel) {
            instance.Panel = document.getElementById('xToolTip');
        }
        window.TOOLTIP_MODULE = instance;
    }

    const ed = editor || (typeof GlobalEditor !== 'undefined' ? GlobalEditor : null);
    if (ed) {
        attachTooltipListeners(ed, window.TOOLTIP_MODULE);
    }

    return window.TOOLTIP_MODULE;
}

export default bootstrapTooltipTrack;