/**
 * LinkSessionService — editor session service (ESM island).
 * Dialog: link_session_request. Send UI: link_session_send (landing).
 * Core lives under landing; import + window bridge for classic callers.
 */
import LinkSessionCore from '../../../../landing/js/session/LinkSessionCore.js';

if (typeof window !== 'undefined') {
    window.LinkSessionCore = LinkSessionCore;
}

class LinkSessionService extends LinkSessionCore {
    static getInstance() {
        return LinkSessionService._instance || null;
    }

    async postInitializeModule() {
        LinkSessionService._instance = this;
        window.LinkSessionModule = LinkSessionService;
        window.LinkSessionService = LinkSessionService;
        window.LinkSessionCore = LinkSessionCore;
        LinkSessionCore.installSessionGlobals(this);
        window.CHECK_REQUEST = this.createEditorFacade();
        window.RE_DIRECT_CUR_SESSION = (response, options) => this.redirectCurrentSession(response, options);
    }
}

export default LinkSessionService;
