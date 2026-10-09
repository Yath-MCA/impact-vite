/* 


*/

commonfn['updatedpdfres'] = function(response) {
    try {
        if (!response['message']) {
            if ([I_rGEN_PDF, I_rGEN_XML].includes(lastrun)) {
                if (response.r == 1) iDownloadMethod.click(lastrun, response);
                else if (response.r == 0) iDownloadMethod.checkSpinerStatus(null, {
                    error: true
                });
            } else if (lastrun == 'package') {
                console.log(JSON.stringify(response));
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('updatedpdfres', err.message);
    }
};

commonfn['regenerateStatus'] = function(response, opt) {
    const lastValue = response.data[0].pdf;
    const PDF_Trigger = document.getElementById('GenaratePDF');
    if (PDF_Trigger) PDF_Trigger.setAttribute('data-last-Genarate-Status', lastValue);
    if (opt) GeneratingPDF(PDF_Trigger);
};

commonfn['Postxmltopdfindd'] = function(response) {
    if (response.r == 0) {
        ErrorShareMail('ErrorSavingFile_Postxmltopdfindd');
        AlertNewDialog.fire('warning', 'Warning', 'Error while saving file', 'OK', '');
        return;
    }
    content_file_sn = response['file_sn'];
    const mygenid = guid();
    localStorage.setItem('userUniqueId', mygenid);
    myuserUniqueId = localStorage.getItem('userUniqueId');
    messageObjconc.username = myuserUniqueId;
    const jsondata = {
        docid: DOC_ID,
        ext: 'html',
        topic: MY_TOPIC,
        username: myuserUniqueId,
        platform: 'htmltopdf'
    };
    jsondata.files = [content_file_sn];
    jsondata.fileson = [content_file_sn];
    jsondata.client = SHARED_KEY.client;
    jsondata.type = SHARED_KEY.type;
    jsondata.dtd = SHARED_KEY.dtd;
    commonfn.callajax(jsondata, 'updatedpdfres', API_KAFKA_PROD);
};

async function GeneratingPDF(ths) {
    let IsPDF = true;
    if (ths && ths.hasAttribute('data-last-genarate-status')) {
        const status = ths.getAttribute('data-last-genarate-status');
        if (status == '0') {
            TOASTER_ALERT('GeneratePDF_Last_Error', {
                type: 'warning'
            });
            return false;
        } else if (status == 'null') {
            IsPDF = false;
            commonfn.callajax(GET_JSON('regeneratePDF'), 'regenerateStatus', API_GET_ADMINDOCS, true);
        }
    }
    if (IsPDF) {
        $('#GenaratePDF').html(SAVE_SPIN).attr({
            title: 'Regenerate Proof Pdf Initiated' + moment().calendar(),
            'data-time': moment()
        });
        const IsDemo = SHARED_KEY.division == 'Med' && !IS_JOURNAL;
        if (!IsDemo) TOASTER_ALERT('GenaratePDF');
        else TOASTER_ALERT('demo_GenaratePDF', {
            addText: ALERT_MESSAGE['demo_GenaratePDF']['hilti']
        });
        const jsondata = {
            subfolder: DOC_ID,
            filename: DOC_ID + '_updated',
            status: 'active',
            sopt: 'openstorage',
            ckeditor: encodeURIComponent(GlobalEditor.getData()),
            tbl: 'CKFulltext',
            keyname: 'ckeditor',
            platform: 'indd'
        };
        if (!IsDemo || IS_LOCAL_HOST) commonfn.callajax(jsondata, 'Postxmltopdfindd', API_FORM_TO_FILE_FIELD);
    }
}

window.GeneratingPDF = GeneratingPDF;

const PI_MODULE_ID = 'PI_MODULE';
const PI_MODULE_CONFIG = {
    name: 'PiModule',
    type: 'ondemand',
    path: './pi_module/index.js',
    templatePath: './pi_module/template.html',
    dependencies: [],
    wrapping: true,
    group_name: 'PI_MODULE',
    groupOrder: 140,
    commands: [{
        name: 'INSERT_PI_CMD',
        action: 'insert_pi',
        label: 'Insert PI',
        icon: '../assets/images/svg/ContextMenu/Add.svg',
        group: 'PI_Group',
        order: 141
    }],
    executeCommand: async function(editor, item, moduleConfig, params) {
        openPiModuleDialog();
    },
    contextMenuHandler: function(element, selection, elementPath, editor, subItems) {
        const IMS = IMPACT_SELECTION;
        var MenuReturn = {};

        if (IS_JOURNAL) return;

        if (window.paraLock && typeof window.paraLock._isElementLocked === 'function') {
            const isLocked = window.paraLock._isElementLocked(element, {
                check_closest: true,
                alertKey: 'ErrorLockedParaEdit'
            });
            if (isLocked) return {};
        }

        var showMenu = false;
        const piMod = window.PI_MODULE;

        if (piMod) {
            showMenu = piMod.SHOW_CONTEXT_GROUP;

            if (!piMod.FullyLoaded && typeof piMod.init === 'function') {
                piMod.init();
            }

        } else {
            showMenu = IsContextMenu('Insert_PI');
        }

        if (!showMenu) return;

        if (!['a', 'img', 'del'].includes(element.getName())) {
            return {
                INSERT_PI_CMD: CKEDITOR.TRISTATE_OFF
            };
        }
    }
};

const openPiModuleDialog = ContextHelpers.createDebouncedOpen(async () => {
    await ContextHelpers.openDialog(PI_MODULE_ID, PI_MODULE_CONFIG, 'PI_MODULE');
});

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(PI_MODULE_ID, PI_MODULE_CONFIG, {
        checkRole: true
    });
});