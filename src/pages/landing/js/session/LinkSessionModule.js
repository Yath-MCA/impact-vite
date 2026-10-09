/*jslint white:true, for:true */
/*global LinkSessionCore, LinkSessionModule */

/**
 * Landing bundle entry — session service without BaseModule dialog.
 */
class LinkSessionModule extends LinkSessionCore {
    static getInstance() {
        if (!LinkSessionModule._instance) {
            LinkSessionModule._instance = new LinkSessionModule();
        }
        return LinkSessionModule._instance;
    }
}

window.LinkSessionModule = LinkSessionModule;
window.LinkSessionService = LinkSessionModule;
LinkSessionCore.installSessionGlobals(LinkSessionModule.getInstance());

document.addEventListener('DOMContentLoaded', () => {
    LinkSessionModule._instance = null;
    const instance = LinkSessionModule.getInstance();
    LinkSessionCore.installSessionGlobals(instance);
    window.RE_DIRECT_CUR_SESSION = function(response, options) {
        return instance.redirectCurrentSession(response, options);
    };
});