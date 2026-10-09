(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
        module.exports.resolvePreviewXTagContext = api.resolvePreviewXTagContext;
    } else {
        root.ResolvePreviewXTagContext = api;
    }
})(typeof self !== "undefined" ? self : this, function () {
    function liveContribs(contribGroup) {
        if (!contribGroup || !contribGroup.children) return [];
        return Array.prototype.filter.call(contribGroup.children, function (el) {
            return el && el.classList && el.classList.contains("contrib");
        });
    }

    function resolvePreviewXTagContext(input) {
        input = input || {};
        var authorEl = input.authorEl;
        var contribGroup = input.contribGroup;
        var mode = input.mode === "insert" ? "insert" : "edit";
        if (!authorEl || !contribGroup) return null;

        var list = liveContribs(contribGroup);
        var liveCount = list.length;

        if (mode === "insert") {
            var anchor = input.insertAnchor;
            if (!anchor) return null;
            var anchorIndex = -1;
            for (var i = 0; i < list.length; i++) {
                if (list[i] === anchor || (anchor.id && list[i].id === anchor.id)) {
                    anchorIndex = i;
                    break;
                }
            }
            if (anchorIndex < 0) return null;
            return {
                AuthorModule: true,
                Author_El: authorEl,
                previewIndex: anchorIndex + 1,
                contribCount: liveCount + 1
            };
        }

        var editIndex = -1;
        for (var j = 0; j < list.length; j++) {
            if (list[j].id && authorEl.id && list[j].id === authorEl.id) {
                editIndex = j;
                break;
            }
        }
        if (editIndex < 0) return null;
        return {
            AuthorModule: true,
            Author_El: authorEl,
            previewIndex: editIndex,
            contribCount: liveCount
        };
    }

    return {
        resolvePreviewXTagContext: resolvePreviewXTagContext
    };
});
