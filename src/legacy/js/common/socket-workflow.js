document.addEventListener('DOMContentLoaded', function(event) {
    (function() {
        const input = document.getElementById("inputMsg");

        // Trigger sendMsg when Enter is pressed
        input.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault(); // Prevent form submission if inside a form
                window.sendMsg();
            }
        });

        let ws = null;
        const receivedSet = new Set();
        const endpointStorageKey = "socketTester:selectedEndpoint";
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const endpointSelect = document.getElementById("endpointSelect");
        const savedEndpoint = localStorage.getItem(endpointStorageKey) || "collaboration";
        const testDocId = new URL(window.location.href).searchParams.get("docid") || "socket-test-doc";
        let socketUrl = "";

        if (endpointSelect) {
            endpointSelect.value = savedEndpoint;
            endpointSelect.addEventListener("change", function() {
                localStorage.setItem(endpointStorageKey, endpointSelect.value);
                connect(endpointSelect.value);
            });
        }

        function getSelectedEndpoint() {
            return endpointSelect && endpointSelect.value ? endpointSelect.value : "collaboration";
        }

        function closeConnections() {
            if (ws) {
                ws.onclose = null;
                ws.onerror = null;
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
                ws = null;
            }
        }

        function connect(endpoint) {
            closeConnections();
            localStorage.setItem(endpointStorageKey, endpoint);
            if (endpointSelect) endpointSelect.value = endpoint;

            // Prefer shared helper (SocketBridge socketUrl.js) when loaded; else legacy DOMAIN_ROOT join.
            if (typeof window.buildCollaborationSocketUrl === "function") {
                socketUrl = window.buildCollaborationSocketUrl({
                    domainRoot: typeof DOMAIN_ROOT !== "undefined" ? DOMAIN_ROOT : "",
                    endpoint: endpoint,
                    docid: testDocId
                });
            } else {
                const endpointWithDoc = `${endpoint}?docid=${encodeURIComponent(testDocId)}`;
                const domainRoot = DOMAIN_ROOT.replace(/^https?:/, window.location.protocol === "https:" ? "wss:" : "ws:");
                socketUrl = `${domainRoot}${endpointWithDoc}`;
            }

            const titleSpan = document.querySelector(".path");
            if (titleSpan) titleSpan.textContent = socketUrl;

            console.log("🌐 Connecting to WebSocket server:", socketUrl);
            displayMessage("Connecting to " + socketUrl);

            ws = new WebSocket(socketUrl);

            ws.onopen = () => {
                console.log("✅ WebSocket connected");
                displayMessage("Connected: " + socketUrl);
            };

            ws.onmessage = (event) => {
                const msg = event.data;
                if (receivedSet.has(msg)) return;
                receivedSet.add(msg);
                console.log("📩 Message from WebSocket:", msg);
                displayMessage("📩 " + msg);
            };

            ws.onclose = () => {
                console.warn("❌ WebSocket closed");
                displayMessage("Disconnected: " + socketUrl);
            };

            ws.onerror = (err) => {
                console.error("⚠️ WebSocket error:", err);
                displayMessage("Connection error: " + socketUrl);
            };
        }

        window.connectSelectedEndpoint = function() {
            connect(getSelectedEndpoint());
        };

        // ================================
        // Message display helper
        // ================================
        function displayMessage(message) {
            const messagesDiv = document.getElementById("messages");
            if (!messagesDiv) return;
            const newMessage = document.createElement("div");
            newMessage.textContent = message;
            messagesDiv.appendChild(newMessage);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // ================================
        // Send button handler
        // ================================
        window.sendMsg = function() {
            const input = document.getElementById("inputMsg");
            const msg = input.value.trim();
            if (!msg) return;

            // Try both
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(msg);
                displayMessage("📤 (WS) Sent: " + msg);
            } else {
                alert("No active socket connection.");
            }

            input.value = "";
        };

        connect(getSelectedEndpoint());
    })();
});