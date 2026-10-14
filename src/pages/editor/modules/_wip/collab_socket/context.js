/**
 * socket.js
 * WebSocket utility for Collab (binary) + Intelligent Chat (JSON/text)
 * Compatible with older browsers — no optional chaining or modern syntax.
 */

function createSocket(endpoint, onMessage, onStatusChange) {
    var socket = null;
    var reconnectTimer = null;

    function isBinary(input) {
        var payload;
        if (input && typeof input === "object" && "data" in input) {
            payload = input.data;
        } else {
            payload = input;
        }

        return (
            payload instanceof Uint8Array ||
            payload instanceof ArrayBuffer ||
            (typeof Blob !== "undefined" && payload instanceof Blob)
        );
    }

    var protocol = window.location.protocol === "https:" ? "wss" : "ws";
    var hostname = window.location.hostname;
    var socketUrl = "";

    function connect() {
        if (hostname.indexOf("localhost") !== -1) {
            // Local development
            socketUrl = "ws://localhost:8025" + endpoint;
        } else {
            // Same host & port on server
            var port = window.location.port ? ":" + window.location.port : "";
            socketUrl = protocol + "://" + hostname + port + endpoint;
        }

        socket = new WebSocket(socketUrl);

        // Collaboration uses binary messages
        if (endpoint.indexOf("/collaboration") !== -1) {
            socket.binaryType = "arraybuffer";
        }

        socket.onopen = function () {
            console.log("✅ Connected to " + endpoint);
            if (typeof onStatusChange === "function") {
                onStatusChange("connected");
            }
        };

        socket.onclose = function () {
            console.warn("❌ Disconnected from " + endpoint);
            if (typeof onStatusChange === "function") {
                onStatusChange("disconnected");
            }
            reconnectTimer = setTimeout(connect, 2000); // auto-reconnect
        };

        socket.onerror = function (err) {
            console.error("⚠️ WebSocket error (" + endpoint + "):", err);
            if (typeof onStatusChange === "function") {
                onStatusChange("error");
            }
        };

        socket.onmessage = function (event) {
            try {
                // Binary message for collaboration
                if (endpoint.indexOf("collaboration") !== -1 && isBinary(event.data)) {
                    var bytes;
                    if (event.data instanceof ArrayBuffer) {
                        bytes = new Uint8Array(event.data);
                    } else if (event.data && event.data.buffer) {
                        bytes = new Uint8Array(event.data.buffer);
                    } else {
                        bytes = new Uint8Array(event.data);
                    }

                    if (typeof onMessage === "function") {
                        onMessage({ type: "binary", data: bytes });
                    }
                    return;
                }

                // Try JSON parse, fallback to text
                var parsed = JSON.parse(event.data);
                if (typeof onMessage === "function") {
                    onMessage(parsed);
                }
            } catch (e) {
                if (typeof onMessage === "function") {
                    onMessage({ type: "text", data: event.data });
                }
            }
        };
    }

    // TODO
    // connect();

    /**
     * Send a message
     * - Binary for collaboration
     * - JSON or string otherwise
     */
    function sendMessage(data) {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.warn("🚫 Cannot send: " + endpoint + " not open");
            return;
        }

        // Collaboration — send raw binary
        if (endpoint.indexOf("/collaboration") !== -1 && isBinary(data)) {
            var payload;
            if (data && typeof data === "object" && "data" in data) {
                payload = data.data;
            } else {
                payload = data;
            }
            socket.send(payload);
            return;
        }

        // Other — JSON or plain text
        if (typeof data === "object") {
            socket.send(JSON.stringify(data));
        } else {
            socket.send(String(data));
        }
    }

    function close() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close();
        }
    }

    return {
        sendMessage: sendMessage,
        close: close
    };
}

const COLLAB_SOCKET_MODULE_ID = 'editorSocketBridge';
const COLLAB_SOCKET_MODULE_CONFIG = {
    name: 'editorSocketBridge',
    path: './collab_socket/index.js',
    templatePath: '',
    type: 'lazy',
    group_name: "collaboration",
    commands: [],
    // executeCommand: async function (editor, callGroup, moduleConfig, params) {},
    // onContentDomUpdate: function (editor, editable) {},
    // contextMenuHandler: function (element, selection, elementPath, editor, subItems) {}
};

USER_INFO = window.USER_INFO || {};
const { MAIL_ID, USER_ID, ROLE_ID, ROLE_NAME, TRACK_ROLE_NAME } = USER_INFO;
document.addEventListener('DOMContentLoaded', () => {
    const intervalId = setInterval(async () => {
        var initiallyChecked = false;
        const collabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);
        return;
        // Now connect to socket using docId in URL
        var endpoint = "/collaboration/" + DOC_ID;
        if (collabEnabled && !initiallyChecked) {
            var chatSocket = createSocket(endpoint,
                function (msg) {
                    console.log("Message:", msg);
                    initiallyChecked = true;
                    // 🧠 Server should respond with actionType to detect conflicts
                    if (msg && msg.type === "text" && msg.data) {
                        try {
                            var response = typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;

                            if (response.action === "userConflict") {
                                // ⚠️ Another user is already working on the same doc
                                Swal.fire({
                                    icon: "warning",
                                    title: "Already Active",
                                    text: "Someone is already working on this document!",
                                    confirmButtonColor: "#f39c12"
                                });
                            }

                            if (response.action === "sameUserConflict") {
                                // ⚠️ Same user opened same doc in another tab
                                Swal.fire({
                                    icon: "info",
                                    title: "Already Open",
                                    text: "You already have this document open in another tab.",
                                    confirmButtonColor: "#3085d6"
                                });
                            }

                            if (response.action === "ok") {
                                Swal.fire({
                                    icon: "success",
                                    title: "Connected",
                                    text: "Collaboration started successfully.",
                                    timer: 1200,
                                    showConfirmButton: false
                                });
                            }
                        } catch (e) {
                            console.warn("⚠️ Invalid server response", e);
                        }
                    }
                },
                function (status) {
                    console.log("Status:", status);
                }
            );

            // 🧩 Send initial handshake
            var handshakePayload = {
                docId: typeof DOC_ID !== "undefined" ? DOC_ID : "",
                emailId: typeof MAIL_ID !== "undefined" ? MAIL_ID : "",
                userId: typeof USER_ID !== "undefined" ? USER_ID : "",
                roleId: typeof ROLE_ID !== "undefined" ? ROLE_ID : "",
                roleName: typeof ROLE_NAME !== "undefined" ? ROLE_NAME : "",
                action: "initial"
            };

            chatSocket.sendMessage(handshakePayload);

            console.log("Handshake sent:", handshakePayload);
        }


        if (typeof moduleSystem !== "undefined" && collabEnabled && typeof GlobalEditor !== null && GlobalEditor) {
            clearInterval(intervalId);
            
            ContextHelpers.registerOnReady(COLLAB_SOCKET_MODULE_ID, COLLAB_SOCKET_MODULE_CONFIG);

            window.socketBridge = await window.moduleSystem.getModule("editorSocketBridge");
            // window.bridge = socketBridge(GlobalEditor, function (e) {
            //     console.log("Event:", e);
            // });            
            window.socketBridge.bindEditorEvents(GlobalEditor);

        } else if (!collabEnabled) {
            clearInterval(intervalId);
        }
    }, 1500); // Check every 1500ms
});
