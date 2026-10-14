(function(global) {
    "use strict";

    function normalizeValue(value) {
        return String(value == null ? "" : value).trim();
    }

    function ensureTrailingSlash(value) {
        const text = normalizeValue(value);
        if (!text) return "";
        return /\/$/.test(text) ? text : text + "/";
    }

    function isPlaceholderDomainRoot(value) {
        const text = normalizeValue(value);
        return !text || /\$\{\{/.test(text) || text === "${{ DOMAIN_ROOT }}$";
    }

    /**
     * Resolve http(s) app root with trailing slash.
     * e.g. http://localhost/impact_qa/dist/socket-bridge-lab.html → http://localhost/impact_qa/
     */
    function resolveDomainRoot(globalLike) {
        const g = globalLike || global;
        const configured = g && g.DOMAIN_ROOT;
        if (!isPlaceholderDomainRoot(configured)) {
            return ensureTrailingSlash(configured);
        }

        const loc = g && g.location;
        if (!loc || !loc.href) return "";

        try {
            const url = new URL(loc.href, loc.origin || undefined);
            let path = url.pathname || "/";
            // Strip /dist/... or trailing file under the webapp context
            path = path.replace(/\/dist(\/.*)?$/i, "/");
            path = path.replace(/\/[^/]+\.html?$/i, "/");
            if (!path || path === "") path = "/";
            if (path.charAt(path.length - 1) !== "/") path += "/";
            return url.origin + path;
        } catch (error) {
            const origin = loc.origin || (loc.protocol + "//" + loc.host);
            return ensureTrailingSlash(origin + "/");
        }
    }

    /**
     * Build ws(s) collaboration URL.
     * @param {object} options
     * @param {string} [options.domainRoot]
     * @param {string} [options.endpoint] - "collab" | "collaboration"
     * @param {string} options.docid
     * @param {string} [options.source]
     * @param {object} [options.globalLike]
     */
    function buildCollaborationSocketUrl(options) {
        const opts = options || {};
        const g = opts.globalLike || global;
        const docid = normalizeValue(opts.docid);
        if (!docid) return "";

        let domainRoot = normalizeValue(opts.domainRoot) || resolveDomainRoot(g);
        if (!domainRoot) return "";

        const endpoint = normalizeValue(opts.endpoint || opts.socketPath || "collaboration").replace(/^\/+/, "");
        if (!endpoint) return "";

        const loc = g && g.location;
        const useSecure = loc && loc.protocol === "https:";
        domainRoot = domainRoot.replace(/^https?:/i, useSecure ? "wss:" : "ws:");
        domainRoot = ensureTrailingSlash(domainRoot);

        const params = ["docid=" + encodeURIComponent(docid)];
        const source = normalizeValue(opts.source);
        if (source) params.push("source=" + encodeURIComponent(source));

        return domainRoot + endpoint + "?" + params.join("&");
    }

    const api = {
        resolveDomainRoot: resolveDomainRoot,
        buildCollaborationSocketUrl: buildCollaborationSocketUrl,
        isPlaceholderDomainRoot: isPlaceholderDomainRoot
    };

    global.SocketBridgeSocketUrl = api;
    global.buildCollaborationSocketUrl = buildCollaborationSocketUrl;
    global.resolveDomainRoot = resolveDomainRoot;

    if (global.SocketBridge) {
        global.SocketBridge.resolveDomainRoot = resolveDomainRoot;
        global.SocketBridge.buildCollaborationSocketUrl = buildCollaborationSocketUrl;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
