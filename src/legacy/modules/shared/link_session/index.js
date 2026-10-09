/**
 * LinkSessionService — editor session service (webpack entry; on hold — use LinkSessionEditor.js in gulp).
 * Dialog: link_session_request (webpack). Send UI: link_session_send (landing gulp).
 */
// Webpack on hold: core loaded via gulp e6_main (ports → LinkSessionCore → LinkSessionEditor → bootstrap).
// import LinkSessionCore from './LinkSessionCore.js';

class LinkSessionService extends LinkSessionCore {
    static getInstance() {
        return LinkSessionService._instance || null;
    }

    async postInitializeModule() {
        LinkSessionService._instance = this;
        window.LinkSessionModule = LinkSessionService;
        window.LinkSessionService = LinkSessionService;
        LinkSessionCore.installSessionGlobals(this);
        window.CHECK_REQUEST = this.createEditorFacade();
        window.RE_DIRECT_CUR_SESSION = (response, options) => this.redirectCurrentSession(response, options);
    }
}

export default LinkSessionService;
