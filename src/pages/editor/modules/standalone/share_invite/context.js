$(document).on('click', '#shareFileBtn', function (evt) {
    if (evt && typeof evt.preventDefault === 'function') {
        evt.preventDefault();
    }

    // Prevent re-opening if dialog is already visible - just focus it
    if (window.ShareInviteDialog && window.ShareInviteDialog.Panel && !window.ShareInviteDialog.Panel.classList.contains('ds-none')) {
        const panel = window.ShareInviteDialog.Panel;
        panel.focus();
        const headerDiv = panel.querySelector('.dia_header_div');
        if (headerDiv) headerDiv.click();
        window.focus();

        return;
    }

    openShareInviteDialog();

});



async function getShareInviteDialog() {

    if (window.ShareInviteDialog) {
        return window.ShareInviteDialog;
    }

    if (typeof moduleSystem === 'undefined') {
        throw new Error('moduleSystem not ready for share invite');
    }

    const mod = await moduleSystem.getModule('shareInviteDialog');
    window.ShareInviteDialog = mod;

    return mod;
}

async function openShareInviteDialog() {
    try {
        const dialog = await getShareInviteDialog();

        if (dialog && dialog.show) {
            dialog.show();
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('openShareInviteDialog', err.message);
    }
}

const SHARE_INVITE_MODULE_ID = 'shareInviteDialog';
const SHARE_INVITE_MODULE_CONFIG = {
    name: 'ShareInviteModule',
    type: 'ondemand',
    path: './share_invite/index.js',
    templatePath: './share_invite/template.html',
    dependencies: [],
    wrapping: true,
    group_name: 'shareInviteDialogModule',
    groupOrder: 1110,
    commands: []
};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(SHARE_INVITE_MODULE_ID, SHARE_INVITE_MODULE_CONFIG);
});
