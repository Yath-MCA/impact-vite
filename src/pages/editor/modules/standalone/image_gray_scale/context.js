/*

window.ContextMenuHandler
    .registerModule('gray_scale', {
        group_name: "GrayscaleDialog",
        groupOrder: 1111,
        commands: [
            {
                name: 'SHOW_GRAY_SCALE',
                action: 'gray_show',
                label: "Show Gray Scale Viewer",
                icon: '../assets/images/svg/ContextMenu/Add.svg',
                order: 1111,
                ignore_menu: true
            }
        ],
        moduleSetup: {
            name: 'GrayscaleModule',
            moduleKey: 'grayscaleDialog',
            type: 'ondemand',
            path: './image_gray_scale/index.js',
            templatePath: 'image_gray_scale/template.html',
            dependencies: [],
            wrapping: true,
            trackView: false
        },

        onContentDomUpdate: function (editor, editable) {

            // 'doubleclick', 'dblclick', 'mouseover', 'mouseout'
            const moduleId = 'grayscaleDialog';
            ['click'].forEach((eventName) => {
                editable.attachListener(editable, eventName, (evt) => {
                    debug.log(`Event: ${eventName} triggered in ${moduleId} module`);
                    var el = evt.data.getTarget().$;
                    if (el.getAttribute('greyscale') == 'true') {
                        if (window.grayscaleDialog && window.grayscaleDialog.show == "function") {
                            window.grayscaleDialog.show(el);
                        } else editor.execCommand('SHOW_GRAY_SCALE');
                    }
                });
            });

        },

        contextMenuHandler: function (element, selection, elementPath, editor) {
            if (!element || !selection) return {};
        }
    });
    */
const IMAGE_GRAY_SCALE_MODULE_ID = 'grayscaleDialog';
const IMAGE_GRAY_SCALE_MODULE_CONFIG = {
    name: 'GrayscaleModule',
    type: 'ondemand',
    path: './image_gray_scale/index.js',
    templatePath: './image_gray_scale/template.html',
    dependencies: [],
    wrapping: true,

    group_name: 'GrayscaleDialog',
    groupOrder: 1111,
    commands: [{
        name: 'SHOW_GRAY_SCALE',
        action: 'gray_show',
        label: "Show Gray Scale Viewer",
        icon: '../assets/images/svg/ContextMenu/Add.svg',
        order: 1111,
        ignore_menu: true
    }],
    onContentDomUpdate: function(editor, editable) {
        // 'doubleclick', 'dblclick', 'mouseover', 'mouseout'
        const moduleId = 'grayscaleDialog';
        editable.attachListener(editable, 'click', (evt) => {
            var el = evt.data.getTarget().$;
            if (el.getAttribute('greyscale') == 'true') {
                debug.log(`Event: click triggered in ${moduleId} module ${Date.now()}`);
                if (window.grayscaleDialog && window.grayscaleDialog.show == "function") {
                    window.grayscaleDialog.show(el);
                } else editor.execCommand('SHOW_GRAY_SCALE');
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(IMAGE_GRAY_SCALE_MODULE_ID, IMAGE_GRAY_SCALE_MODULE_CONFIG);
});