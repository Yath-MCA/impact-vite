const LINK_SESSION_REQUEST_MODULE_ID = 'LinkSessionRequestDialog';
const LINK_SESSION_REQUEST_MODULE_CONFIG = {
    name: 'LinkSessionRequestModule',
    type: 'onthefly',
    path: './link_session_request/index.js',
    templatePath: '',
    dependencies: [],
    wrapping: true,
    group_name: 'ParaGroup',
    groupOrder: 1120,
    commands: []
};

const openLinkSessionRequestDialog = ContextHelpers.createDebouncedOpen(async () => {
    await ContextHelpers.openDialog(LINK_SESSION_REQUEST_MODULE_ID, LINK_SESSION_REQUEST_MODULE_CONFIG, 'LinkSessionRequestModule');
});

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(LINK_SESSION_REQUEST_MODULE_ID, LINK_SESSION_REQUEST_MODULE_CONFIG);
});
