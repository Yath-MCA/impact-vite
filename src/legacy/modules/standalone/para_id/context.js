// src\modules\para_id\context.js

let paraInitStarted = false;

async function Initialize_Para_Id() {

    if (typeof window.paraManager === "object") {
        debug.log("ParaManager already initialized, skipping re-initialization.");
        return;
    }

    if (paraInitStarted) {
        debug.log("ParaManager initialization already in progress.");
        return;
    }

    paraInitStarted = true;

    try {

        await registerAndMonitorModules(
            window.moduleRegistry,
            [{
                    name: "DocumentManager",
                    path: "./para_id/index.js",
                    type: "ondemand",
                    templatePath: "",
                    dependencies: [],
                    wrapping: true
                },
                {
                    name: "BooksReports",
                    path: "./para_bits/index.js",
                    type: "ondemand",
                    templatePath: "",
                    dependencies: [],
                    wrapping: true
                }
            ]
        );

        window.paraManager = await window.moduleRegistry.getModule("DocumentManager");

        window.booksReports = await window.moduleRegistry.getModule("BooksReports");

        debug.log("ParaManager initialized successfully.");

    } catch (err) {

        paraInitStarted = false;

        debug.error("Failed to initialize ParaManager", err);
    }
}

document.addEventListener("DOMContentLoaded", function() {

    let waitCount = 0;
    // 120 * 500 = 60 seconds
    const maxWait = 120;

    CKEDITOR.on("instanceReady", function() {

        if (window.IS_JOURNAL) return;
        const intervalId = setInterval(function() {

            waitCount++;

            const dialogReady = typeof window.InitialLoadDialog !== "undefined" && window.InitialLoadDialog && window.InitialLoadDialog.FullyLoaded;

            const registryReady = typeof window.moduleRegistry !== "undefined";

            if (dialogReady && registryReady) {

                clearInterval(intervalId);

                Initialize_Para_Id();

                return;
            }

            if (waitCount >= maxWait) {

                clearInterval(intervalId);

                debug.warn(
                    "Timeout waiting for CKEditor/dialog/module registry readiness."
                );

                return;
            }

            debug.log(
                "Waiting for CKEditor, dialog, module registry, and non-journal context to be ready... => DocumentManager"
            );

        }, 1000);

    });

});