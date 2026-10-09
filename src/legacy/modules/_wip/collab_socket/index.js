

/**
 * editorSocketBridge.js
 * Unified CKEditor + Automerge + WebSocket handler (no React, no modern syntax)
 * Compatible with older browsers.
 */

// import * as Automerge from "@automerge/automerge";

export default function editorSocketBridge(editorInstance, options = []) {


    // ---------------------------------------
    // Mock event list (to be updated in real app)
    // ---------------------------------------
    var events = [];

    // Render events dynamically
    function renderEvents(eventArray) {
        events.push(eventArray);
        if (events.length > 10) {
            events.shift(); // keep last 100 events
        }
        var listContainer = document.getElementById("eventList");
        if (!listContainer) {
            var root = document.getElementById("AuthDOM");
            $(root).after(`<div id="eventContainer"><h4>📡 Event Information</h4><div id="eventList"></div></div>`);
            listContainer = document.getElementById("eventList");
            if (listContainer) {
                IS_LOCAL_HOST || IS_UAT_DOMAIN || IS_DEV_DOMAIN ? listContainer.parentElement.className = "show" : listContainer.className = "";
            }
        }

        listContainer.innerHTML = "";

        for (var i = 0; i < events.length; i++) {
            var evt = events[i];
            var wrapper = document.createElement("div");
            wrapper.className = "event-item";

            // Type + Time
            var header = document.createElement("div");
            var strong = document.createElement("strong");
            strong.textContent = evt.type || "Unknown Event";
            var em = document.createElement("small");
            em.textContent = " — " + (evt.time || new Date().toLocaleTimeString());
            header.appendChild(strong);
            header.appendChild(em);

            // Details
            var details = document.createElement("div");
            details.className = "event-details";

            // Add version & user if available
            var userInfo = "";
            if (evt.details && typeof evt.details === "object") {
                if ("user" in evt.details) {
                    userInfo += "👤 User: " + evt.details.user + " ";
                }
                if ("version" in evt.details) {
                    userInfo += " | 🔢 Version: " + evt.details.version + " ";
                }
                if ("length" in evt.details) {
                    userInfo += " | 📝 Length: " + evt.details.length + " ";
                }
            }

            // Stringify if object
            var detailText;
            if (evt.details && typeof evt.details === "object") {
                detailText = JSON.stringify(evt.details);
            } else {
                detailText = String(evt.details || "");
            }

            details.textContent = userInfo + "\n" + detailText;

            wrapper.appendChild(header);
            wrapper.appendChild(details);
            listContainer.appendChild(wrapper);
        }
    }


    var doc = null;
    var head = null;
    var applyingRemote = false;
    var debounceTimer = null;

    // Debounce implementation
    function debounce(callback, delay) {
        if (typeof delay === "undefined") delay = 400;
        return function () {
            var args = arguments;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                callback.apply(null, args);
            }, delay);
        };
    }

    function assignUserInfo(d) {
        USER_INFO = window.USER_INFO || {};
        const { MAIL_ID, USER_ID, ROLE_ID, ROLE_NAME, TRACK_ROLE_NAME } = USER_INFO;
        d.lastUser = MAIL_ID;
        d.lastUserRoleId = ROLE_ID;
        d.lastUserRoleName = ROLE_NAME;
        d.updatedAt = new Date().toISOString();
    }

    // Initialize document
    function initializeDoc() {

        if (!doc) {
            doc = Automerge.init();
            doc = Automerge.change(doc, function (d) {
                d.html = "";
                // d.lastUser = MAIL_ID;
                // d.lastUserRoleId = ROLE_ID;
                // d.lastUserRoleName = ROLE_NAME;
                // d.updatedAt = new Date().toISOString();
                d.version = 0;
                assignUserInfo(d);
            });
        }
    }

    // Emit debug/info events
    function emitEvent(type, details) {
        if (!details) details = {};
        if (typeof renderEvents === "function") {
            renderEvents({
                type: type,
                details: details,
                time: new Date().toLocaleTimeString()
            });
        }
    }

    // WebSocket connection
    var socketBridge = createSocket(`${API_PATH}collab`, function (msg) {
        if (msg && msg.type === "binary" && msg.data) {
            try {
                applyingRemote = true;

                var remoteDoc = Automerge.load(msg.data);
                if (!doc) {
                    doc = remoteDoc;
                    head = Automerge.getHeads(doc);
                } else {
                    doc = Automerge.merge(doc, remoteDoc);
                    head = Automerge.getHeads(doc);
                }

                var docState = Automerge.toJS(doc);
                var newHTML = docState.html || "";

                console.log("📥 Remote merged:", {
                    newHTML: newHTML,
                    lastUser: docState.lastUser,
                    updatedAt: docState.updatedAt
                });

                var current = editorInstance.getData();
                if (newHTML && current && newHTML.replace(/\s+/g, "") !== current.replace(/\s+/g, "")) {
                    editorInstance.setData(newHTML, {
                        callback: function () {
                            applyingRemote = false;
                        }
                    });
                    emitEvent("remoteUpdate", {
                        length: newHTML.length,
                        user: docState.lastUser
                    });
                } else {
                    applyingRemote = false;
                }
            } catch (e) {
                console.error("⚠️ Merge failed:", e);
                applyingRemote = false;
            }
        }
    }, function (status) {
        emitEvent("socketStatus", { status: status });
    });

    // Handle editor changes
    var handleEditorChange = debounce(function () {
        if (!editorInstance || applyingRemote) return;

        var html = editorInstance.getData();
        try {
            var workingDoc = doc;
            if (Automerge.getHeads(workingDoc).length > 0) {
                workingDoc = Automerge.clone(workingDoc);
            }

            var nextDoc = Automerge.change(workingDoc, function (d) {
                d.html = html;
                // d.lastUser = userId;
                // d.updatedAt = new Date().toISOString();
                d.version = (d.version || 0) + 1;
                assignUserInfo(d);
            });

            doc = nextDoc;
            head = Automerge.getHeads(doc);

            var binary = Automerge.save(nextDoc);
            socketBridge.sendMessage(binary);

            emitEvent("localChange", {
                length: html.length,
                version: nextDoc.version || 1
            });
        } catch (err) {
            console.error("⚠️ Failed to save doc:", err);
        }
    }, 5000);

    // Handle editor click events
    function handleClick(evt) {
        var paragraphId = "unknown";
        try {
            var targetGetter = evt && evt.data && evt.data.getTarget && evt.data.getTarget();
            if (targetGetter && targetGetter.getAscendant) {
                var para = targetGetter.getAscendant("p", true);
                if (para && para.getId) {
                    paragraphId = para.getId();
                } else if (para && para.getUniqueId) {
                    paragraphId = para.getUniqueId();
                }
            }
        } catch (e) {
            paragraphId = "unknown";
        }

        emitEvent("click", { paragraphId: paragraphId });
    }

    // Bind editor instance
    function bindEditorEvents(instance) {
        if (!instance) return;
        editorInstance = instance;

        initializeDoc();
        var docState = Automerge.toJS(doc);
        if (docState && docState.html) {
            instance.setData(docState.html);
        }

        instance.on("change", handleEditorChange);
        instance.on("key", handleEditorChange);
        instance.on("paste", handleEditorChange);
        instance.on("click", handleClick);

        emitEvent("bind", { message: "Editor bound with CRDT merge strategy" });
    }

    // Cleanup connection
    function close() {
        socketBridge.close();
    }

    return {
        bindEditorEvents: bindEditorEvents,
        sendMessage: socketBridge.sendMessage,
        close: close
    };
}

/* ---------------------------
   ✅ Example usage
----------------------------- */

// ClassicEditor.create(document.querySelector("#editor")).then(function (editor) {
//   var bridge = createEditorSocketBridge(editor, "UserA", function (e) {
//     console.log("Event:", e);
//   });
//   bridge.bindEditorEvents(editor);
// });