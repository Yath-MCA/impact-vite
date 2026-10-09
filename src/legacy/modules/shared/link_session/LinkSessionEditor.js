/*jslint white:true, for:true */
/*global LinkSessionCore, window */

/**
 * Editor gulp entry — session service without webpack (LinkSessionService on hold).
 * Sets CHECK_REQUEST from LinkSessionCore when e6_main loads.
 */
class LinkSessionEditor extends LinkSessionCore {
    static getInstance() {
        return LinkSessionEditor._instance || null;
    }

    static ensureGlobals() {
        if (!LinkSessionEditor._instance) {
            LinkSessionEditor._instance = new LinkSessionEditor();
        }
        window.LinkSessionModule = LinkSessionEditor;
        window.LinkSessionService = LinkSessionEditor;
        LinkSessionCore.installSessionGlobals(LinkSessionEditor._instance);
        if (typeof window.CHECK_REQUEST === 'undefined' || !window.CHECK_REQUEST) {
            window.CHECK_REQUEST = LinkSessionEditor._instance.createEditorFacade();
        }
        window.RE_DIRECT_CUR_SESSION = function(response, options) {
            return LinkSessionEditor._instance.redirectCurrentSession(response, options);
        };
    }
}

LinkSessionEditor.ensureGlobals();