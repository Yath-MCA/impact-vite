/**
 * authorCombined.js
 * Combines:
 *   - AuthorRegenPiBridge  (RegenPi rules -> AuthorGroup HTML pistart spans)
 *   - AuthorEditModeConfig (edit-mode resolution for author group)
 *
 * Browser globals (unchanged from the separate files):
 *   window.AuthorRegenPiBridge
 *   window.AuthorEditModeConfig
 *
 * CommonJS: module.exports is a flat merge of both APIs, plus the namespaced
 * objects, so both of these work:
 *   require("./authorCombined.js").applyToContrib(...)
 *   require("./authorCombined.js").resolveAuthorEditModeConfig(...)
 *   require("./authorCombined.js").AuthorRegenPiBridge.applyToContrib(...)
 */
(function(root, factory) {
    var apis = factory();
    var bridge = apis.AuthorRegenPiBridge;
    var editMode = apis.AuthorEditModeConfig;

    if (typeof module === "object" && module.exports) {
        var merged = {};
        var k;
        for (k in bridge) {
            if (Object.prototype.hasOwnProperty.call(bridge, k)) merged[k] = bridge[k];
        }
        for (k in editMode) {
            if (Object.prototype.hasOwnProperty.call(editMode, k)) merged[k] = editMode[k];
        }
        merged.AuthorRegenPiBridge = bridge;
        merged.AuthorEditModeConfig = editMode;
        module.exports = merged;
    } else {
        root.AuthorRegenPiBridge = bridge;
        root.AuthorEditModeConfig = editMode;
    }
})(typeof self !== "undefined" ? self : this, function() {
    "use strict";

    /* ====================================================================
     * AuthorRegenPiBridge
     * Bridge RegenPi rules into AuthorGroup HTML pistart (span.pistart).
     * Precedence: explicit pi-config (Option B / legacy XML) when passed via
     * options.regenPi, else M_SCOPE (old format).
     * ==================================================================== */
    var AuthorRegenPiBridge = (function() {
        function getLib() {
            if (typeof RegenPiLib !== "undefined" && RegenPiLib) return RegenPiLib;
            try {
                return require("./regenPiLib.js");
            } catch (e) {
                return null;
            }
        }

        function makeHtmlPistart(doc, value) {
            var owner = doc || (typeof document !== "undefined" ? document : null);
            if (!owner || !owner.createElement) {
                throw new Error("AuthorRegenPiBridge: Document required to create pistart");
            }
            var span = owner.createElement("span");
            span.className = "pistart";
            span.setAttribute("data-name", "pistart");
            span.setAttribute("data-pi", "PI");
            span.setAttribute("data-pistart", value == null ? "" : String(value));
            span.setAttribute("contenteditable", "false");
            return span;
        }

        function scopeVal(authorModule, key) {
            var s = authorModule && authorModule.M_SCOPE;
            if (!s) return "";
            var v = s[key];
            return v == null ? "" : String(v);
        }

        /**
         * Build RegenPiConfig from journal M_SCOPE separators (legacy / old format).
         * @param {object} authorModule AuthorGroupNewModule-like object
         * @returns {object} RegenPiConfig
         */
        function buildConfigFromAuthorScope(authorModule) {
            var lib = getLib();
            if (!lib) throw new Error("AuthorRegenPiBridge: RegenPiLib missing");
            var Rule = lib.RegenPiRule;
            var rules = [
                Rule.fromFlat({
                    classname: "given-names",
                    value: scopeVal(authorModule, "givenname_sep"),
                    pos: "inner"
                }),
                Rule.fromFlat({
                    classname: "between-xrefs",
                    value: scopeVal(authorModule, "cross_link_sep"),
                    pos: "after"
                }),
                Rule.fromFlat({
                    classname: "between-contribs",
                    value: scopeVal(authorModule, "contrib_sep"),
                    pos: "after",
                    contribs: "3+"
                }),
                Rule.fromFlat({
                    classname: "between-contribs",
                    value: scopeVal(authorModule, "last_sep"),
                    pos: "after",
                    contribs: "3+",
                    when: "last-before"
                }),
                Rule.fromFlat({
                    classname: "between-contribs",
                    value: scopeVal(authorModule, "last_sep"),
                    pos: "after",
                    contribs: "2",
                    when: "last-before"
                }),
                Rule.fromFlat({
                    classname: "between-contribs",
                    value: "",
                    pos: "after",
                    when: "last"
                })
            ];
            return new lib.RegenPiConfig({
                client: (typeof SHARED_KEY !== "undefined" && SHARED_KEY && SHARED_KEY.client) || "",
                shortcode: (typeof SHARED_KEY !== "undefined" && SHARED_KEY && SHARED_KEY.titleinfo && SHARED_KEY.titleinfo.cover) || "",
                rules: rules
            });
        }

        /**
         * Only use an explicit pi-config source (xmlDoc / xmlText / clientConfig).
         * Do not opportunistically read LOADING_CONFIG — that can silently override M_SCOPE.
         */
        function tryEngineFromPiConfig(opts) {
            var lib = getLib();
            if (!lib || !opts) return null;
            if (opts.xmlDoc) {
                try {
                    return lib.RegenPi.fromXmlDoc(opts.xmlDoc);
                } catch (e) {
                    /* fall through */
                }
            }
            if (opts.xmlText) {
                try {
                    return lib.RegenPi.fromXml(opts.xmlText);
                } catch (e) {
                    /* fall through */
                }
            }
            if (opts.clientConfig) {
                try {
                    return lib.RegenPi.fromClientConfig(opts.clientConfig, opts);
                } catch (e) {
                    /* fall through */
                }
            }
            return null;
        }

        /**
         * New format (explicit pi-config) wins when present; else M_SCOPE.
         * @param {object} authorModule
         * @param {object} [opts]
         * @returns {object|null} RegenPi engine
         */
        function resolveEngine(authorModule, opts) {
            var fromPi = tryEngineFromPiConfig(opts);
            if (fromPi) return fromPi;
            var lib = getLib();
            if (!lib) return null;
            return lib.RegenPi.fromConfig(buildConfigFromAuthorScope(authorModule));
        }

        function shouldUse(authorModule) {
            if (!getLib()) return false;
            if (!authorModule || !authorModule.M_SCOPE) return false;
            return true;
        }

        function applyGivenNames(contribEl, rule) {
            if (!rule) return;
            var doc = contribEl.ownerDocument || document;
            var nodes = contribEl.querySelectorAll(
                '.given-names, [data-name="given-names"]'
            );
            Array.prototype.forEach.call(nodes, function(node) {
                node.appendChild(makeHtmlPistart(doc, rule.value));
            });
        }

        function isEmptyCorrespXref(xrefElement) {
            var nextSibling = xrefElement && xrefElement.nextElementSibling;
            return (
                nextSibling !== null &&
                nextSibling.getAttribute &&
                nextSibling.getAttribute("ref-type") === "corresp" &&
                nextSibling.innerText === ""
            );
        }

        function isPLOSClient() {
            return (
                typeof SHARED_KEY !== "undefined" &&
                SHARED_KEY !== null &&
                SHARED_KEY.client === "PLOS"
            );
        }

        /**
         * PLOS: only place between-xrefs between aff→aff pairs (parity with
         * AuthorGroupNewModule.shouldAllowCrossLinkSeparator).
         */
        function shouldAllowCrossLinkSeparator(xrefs, index) {
            if (!isPLOSClient()) return true;
            var currentXref = xrefs[index];
            var nextXref = xrefs[index + 1];
            return (
                currentXref &&
                nextXref &&
                currentXref.getAttribute("data-role") === "aff" &&
                nextXref.getAttribute("data-role") === "aff"
            );
        }

        function reappendXrefsForAuthorModule(contribEl, options) {
            if (!options || !options.AuthorModule) return;
            var xrefs = contribEl.querySelectorAll("a.xref");
            Array.prototype.forEach.call(xrefs, function(xref) {
                contribEl.append(xref);
            });
        }

        function applyBetweenXrefs(contribEl, rule) {
            if (!rule) return;
            var doc = contribEl.ownerDocument || document;
            var xrefs = contribEl.querySelectorAll("a.xref");
            if (xrefs.length < 2) return;
            for (var i = 0; i < xrefs.length - 1; i++) {
                if (isEmptyCorrespXref(xrefs[i])) continue;
                if (!shouldAllowCrossLinkSeparator(xrefs, i)) continue;
                xrefs[i].after(makeHtmlPistart(doc, rule.value));
            }
        }

        /**
         * Prefer contributorInfo.isLastBefore / isLastAuthor (collab-aware) over
         * raw roleOf(index, n), which treats trailing collab as a normal contrib.
         * Skip empty last PI (legacy inserts nothing for last author).
         */
        function pickBetweenContribsHtml(rules, contributorInfo, index, contribCount) {
            var lib = getLib();
            if (!lib) return null;
            var n = contribCount != null ? contribCount : 1;
            var i = index != null ? index : 0;
            if (contributorInfo && typeof contributorInfo.isLastAuthor === "boolean") {
                if (contributorInfo.isLastAuthor) return null;
                if (contributorInfo.isLastBefore) {
                    return lib.pickBetweenContribsRule(rules, Math.max(0, n - 2), n);
                }
                // Force non-last-before / non-last role so collab n-2 does not get "and"
                return lib.pickBetweenContribsRule(rules, 0, n);
            }
            return lib.pickBetweenContribsRule(rules, i, n);
        }

        function applyBetweenContribs(
            contribEl,
            rules,
            contributorInfo,
            index,
            contribCount
        ) {
            var rule = pickBetweenContribsHtml(
                rules,
                contributorInfo,
                index,
                contribCount
            );
            if (!rule) return;
            // Match legacy: do not append an empty pistart for last / blank values
            // unless the rule explicitly carries a non-empty when=last-before etc.
            if (rule.value === "" && (!rule.when || rule.when === "last")) {
                return;
            }
            var doc = contribEl.ownerDocument || document;
            var span = makeHtmlPistart(doc, rule.value);
            if (
                contributorInfo &&
                (contributorInfo.isLastBefore ||
                    (contributorInfo.xrefCount > 0 && !contributorInfo.isLastAuthor))
            ) {
                span.setAttribute("lastpi", "");
            }
            contribEl.appendChild(span);
        }

        /**
         * Apply given-names / between-xrefs / between-contribs pistart spans.
         * Caller must already have stripped existing pistart spans.
         * @returns {boolean} true when rules were applied
         */
        function applyToContrib(
            element,
            contributorInfo,
            authorModule,
            options,
            index,
            contribCount
        ) {
            try {
                if (!element) return false;
                var engine = resolveEngine(authorModule, options && options.regenPi);
                if (!engine) return false;

                var gn = engine.select("given-names")[0];
                applyGivenNames(element, gn);

                reappendXrefsForAuthorModule(element, options);

                var xrefCount =
                    contributorInfo && contributorInfo.xrefCount != null ?
                    contributorInfo.xrefCount :
                    element.querySelectorAll("a.xref").length;
                var xr = engine.select("between-xrefs")[0];
                if (xrefCount >= 2) {
                    applyBetweenXrefs(element, xr);
                }

                var bc = engine.select("between-contribs");
                applyBetweenContribs(
                    element,
                    bc,
                    contributorInfo || {},
                    index,
                    contribCount
                );
                return true;
            } catch (err) {
                if (typeof console !== "undefined" && console.warn) {
                    console.warn(err && err.message ? err.message : err);
                }
                if (typeof ErrorLogTrace === "function") {
                    ErrorLogTrace(
                        "AuthorRegenPiBridge.applyToContrib",
                        err && err.message
                    );
                }
                return false;
            }
        }

        return {
            shouldUse: shouldUse,
            buildConfigFromAuthorScope: buildConfigFromAuthorScope,
            resolveEngine: resolveEngine,
            makeHtmlPistart: makeHtmlPistart,
            applyToContrib: applyToContrib
        };
    })();

    /* ====================================================================
     * AuthorEditModeConfig
     * Resolves the author edit-mode flags from the raw edit-mode value and
     * the "notallowed" flag.
     * ==================================================================== */
    var AuthorEditModeConfig = (function() {
        function resolveAuthorEditModeConfig(editModeRaw, notallowed) {
            var raw = (editModeRaw == null ? "" : String(editModeRaw)).trim().toLowerCase();
            var notAllowedYes = String(notallowed || "").toLowerCase() === "yes";

            if (raw === "dialog") {
                return {
                    EDIT_MODE: "dialog",
                    SHOW_CONTEXT_GROUP_AUTHOR: true,
                    XTAG_VALIDATION: true,
                    LINK_RENUMBER: false
                };
            }
            if (raw === "full" || raw === "false") {
                return {
                    EDIT_MODE: "full",
                    SHOW_CONTEXT_GROUP_AUTHOR: true,
                    XTAG_VALIDATION: true,
                    LINK_RENUMBER: true
                };
            }
            if (raw === "off") {
                return {
                    EDIT_MODE: "off",
                    SHOW_CONTEXT_GROUP_AUTHOR: false,
                    XTAG_VALIDATION: false,
                    LINK_RENUMBER: false
                };
            }
            if (raw !== "") {
                if (typeof console !== "undefined" && console.warn) {
                    console.warn("AuthorEditModeConfig: invalid edit-mode \"" + editModeRaw + "\", treating as off");
                }
                return {
                    EDIT_MODE: "off",
                    SHOW_CONTEXT_GROUP_AUTHOR: false,
                    XTAG_VALIDATION: false,
                    LINK_RENUMBER: false
                };
            }
            if (notAllowedYes) {
                return {
                    EDIT_MODE: "off",
                    SHOW_CONTEXT_GROUP_AUTHOR: false,
                    XTAG_VALIDATION: false,
                    LINK_RENUMBER: false
                };
            }
            return {
                EDIT_MODE: "full",
                SHOW_CONTEXT_GROUP_AUTHOR: true,
                XTAG_VALIDATION: true,
                LINK_RENUMBER: true
            };
        }

        return {
            resolveAuthorEditModeConfig: resolveAuthorEditModeConfig
        };
    })();

    return {
        AuthorRegenPiBridge: AuthorRegenPiBridge,
        AuthorEditModeConfig: AuthorEditModeConfig
    };
});