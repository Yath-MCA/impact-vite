document.addEventListener('DOMContentLoaded', function() {
    let registerFailureCount = 0;
    const maxRegisterFailures = 20;
    const intervalId = setInterval(async function() {
        if (typeof moduleRegistry !== "undefined" && typeof BaseModule !== "undefined") {
            try {

                const moduleDefinition = {
                    name: 'querySystem',
                    moduleClass: QueryBaseModule,
                    type: 'onthefly',
                    templatePath: '',
                    dependencies: [],
                    trackView: false,
                };

                await moduleRegistry.registerDirectModule(moduleDefinition);
                window.queryModule = await moduleRegistry.getModule('querySystem');
                clearInterval(intervalId);

            } catch (err) {
                registerFailureCount++;
                debug.log("❌ Error initializing querySystem:", err);
                if (registerFailureCount >= maxRegisterFailures) {
                    clearInterval(intervalId);
                    console.warn("querySystem registration stopped after repeated failures:", err && err.message);
                }
                // window.location.reload();
            }
        } else if (IS_TRACK_VIEW) {
            // Assuming QueryBaseModule is already initialized
            if (!window.queryModule) window.queryModule = new QueryBaseModule('querySystem');
            clearInterval(intervalId);

            // Get template body by ID (returns HTML string)
            // const bodyHtml = queryCommentTracking.getTemplateById('  TlAk');
            // console.log(bodyHtml);

            // Use the HTML
            // document.querySelector('.display-container').innerHTML = bodyHtml;

            // Get multiple templates
            // const multipleHtml = tracking.getTemplatesByIds(['query_1', 'query_2', 'query_3']);
            // document.querySelector('.multi-display').innerHTML = multipleHtml;
            // callbackQueryTracking();
        }
    }, 250);




});