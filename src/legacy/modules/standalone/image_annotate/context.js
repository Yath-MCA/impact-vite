const IMAGE_ANNOTATE_MODULE_ID = 'AnntationDialog';
const IMAGE_ANNOTATE_MODULE_CONFIG = {
    name: 'AnntationModule',
    type: 'ondemand',
    path: './image_annotate/index.js',
    templatePath: './image_annotate/template.html',
    dependencies: [],
    wrapping: true,

    group_name: 'ImageAnnotateDialogModule',
    groupOrder: 1111,
    commands: [],

};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(IMAGE_ANNOTATE_MODULE_ID, IMAGE_ANNOTATE_MODULE_CONFIG);
});
