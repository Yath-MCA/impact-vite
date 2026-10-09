const SUPPORT_MAIL_MODULE_ID = 'SupportMailDialog';
const SUPPORT_MAIL_MODULE_CONFIG = {
    name: 'SupportMailModule',
    type: 'lazy',
    path: './support_mail/index.js',
    templatePath: './support_mail/template.html',
    dependencies: [],
    wrapping: true,

    group_name: 'sendMailDialogModule',
    groupOrder: 1112,
    commands: []
};

$(document).on("click", "#contact_support", (e) => {
    SupportMailDialog.show({ show_warn: true });
    console.log("Contact Support button clicked.");
});

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(SUPPORT_MAIL_MODULE_ID, SUPPORT_MAIL_MODULE_CONFIG);
});
