/*global window */

var DOWNLOAD_FILES = function(DownloadToLocal) {
    var CE_PDF = (SHARED_KEY.projectname ? SHARED_KEY.projectname : (SHARED_KEY.titleinfo.projectname ? SHARED_KEY.titleinfo.projectname : ''));
    CE_PDF = (CE_PDF ? (CE_PDF + '.pdf') : '');
    var LOCAL = DownloadToLocal ? (',' + DOC_ID + '_updated.html,' + DOC_ID + '.html,pagemap.json') : '';
    return `${DOC_ID}_updated_Tracking.xml,${DOC_ID}_updated_parsingerror.xml,${DOC_ID}_updated.xml,${DOC_ID}_updated_correction.pdf,${CE_PDF + LOCAL}`;
};

var DOWNLOAD_PDF_ACTIONS = {
    Help_Guide_pdf: {
        kind: 'help',
        preload: true,
        menu_id: null,
        file_suffix: '',
        roleBased: true,
        clienBased: true,
        alert: {
            error: 'fileDownloadFail',
            pass: 'fileDownloadSuccess'
        },
        default: 'IMPACT_Help_Guide.pdf',
        'impact-ops-dev.newgen.co:8081': 'IMPACT_Help_Guide_UAT.pdf'
    },
    Help_FAQ_pdf: {
        kind: 'help',
        preload: true,
        menu_id: null,
        file_suffix: '',
        roleBased: false,
        clienBased: true,
        alert: {
            error: 'fileDownloadFail',
            pass: 'fileDownloadSuccess'
        },
        default: 'IMPACT_FAQ.pdf',
        'impact-ops-dev.newgen.co:8081': 'IMPACT_FAQ_UAT.pdf'
    },
    Equation_Help_pdf: {
        kind: 'help',
        preload: true,
        menu_id: null,
        file_suffix: '',
        roleBased: false,
        clienBased: false,
        alert: {
            error: 'fileDownloadFail',
            pass: 'fileDownloadSuccess'
        },
        default: 'IMPACT_Equation_Help_Guide.pdf',
        'impact-ops-dev.newgen.co:8081': 'IMPACT_Equation_Help_Guide_UAT.pdf'
    },
    Help_Guide_Cleanup_pdf: {
        kind: 'help',
        ignore: true,
        preload: true,
        menu_id: null,
        file_suffix: '',
        roleBased: false,
        clienBased: false,
        alert: {
            error: 'fileDownloadFail',
            pass: 'fileDownloadSuccess'
        },
        default: 'IMPACT_Help_Guide_Cleanup.pdf',
        'impact-ops-dev.newgen.co:8081': 'IMPACT_Help_Guide_Cleanup_UAT.pdf'
    },
    tips_tricks_pdf: {
        kind: 'help',
        preload: true,
        menu_id: null,
        file_suffix: '',
        roleBased: false,
        // single
        clienBased: ["LWW"],
        alert: {
            error: 'fileDownloadFail',
            pass: 'fileDownloadSuccess',
            type: 'TOASTER'
        },
        default: 'IMPACT_Tips_and_Tricks.pdf',
        'impact-ops-dev.newgen.co:8081': 'IMPACT_Tips_and_Tricks_UAT.pdf'
    },
    i_track_pdf: {
        kind: 'workflow',
        preload: false,
        menu_id: 'i_track_pdf',
        file_suffix: '_updated_correction.pdf',
        alert: {
            error: 'GeneratePDF_Error',
            pass: 'fileDownloadSuccess',
            pre_warn: 'track_pdf_pre_warn'
        }
    },
    track_pdf: {
        kind: 'workflow',
        preload: true,
        menu_id: 'track_pdf',
        file_suffix: '_updated_correction.pdf',
        alert: {
            error: 'GeneratePDF_Error',
            pass: 'fileDownloadSuccess'
        }
    },
    proof_pdf: {
        kind: 'workflow',
        preload: true,
        menu_id: 'proof_pdf',
        file_suffix: '',
        alert: {
            error: 'fileDownloadFail',
            pass: 'fileDownloadSuccess',
            type: 'TOASTER',
            pass_2: 'DownloadSuccess_proof_pdf',
            pass_2_type: 'warning',
            type_2: 'module'
        }
    },
    ce_track_pdf: {
        kind: 'workflow',
        preload: true,
        menu_id: 'ce_track_pdf',
        file_suffix: '',
        alert: {
            error: 'fileDownloadFail',
            pass: 'fileDownloadSuccess',
            type: 'TOASTER'
        }
    },
    xml: {
        kind: 'workflow',
        preload: false,
        menu_id: 'Generate_XML',
        file_suffix: '_updated.xml',
        alert: {
            error: 'GenerateXML_Error',
            pass: 'fileDownloadSuccess',
            type: 'TOASTER'
        }
    },
    Generate_XML: {
        kind: 'workflow',
        preload: false,
        menu_id: 'Generate_XML',
        file_suffix: '_updated.xml',
        alert: {
            error: 'GenerateXML_Error',
            pass: 'fileDownloadSuccess',
            type: 'TOASTER'
        }
    },
    package: {
        kind: 'workflow',
        preload: false,
        menu_id: '',
        file_suffix: '.zip',
        alert: {
            error: 'fileDownloadFail',
            pass: 'fileDownloadSuccess',
            type: 'TOASTER'
        }
    }
};

class WorkflowDownloadModule {
    constructor() {
        this.OptClk = null;
        this.Info = this._buildInfoMap();
        this.lastURL = null;
        this.errorString = '_parsingerror.';
        this.history = Object.create(null);
        this.requestCache = Object.create(null);
        this.requestMeta = Object.create(null);
        this.Help_Guide_key = ['Help_Guide_pdf', 'Help_FAQ_pdf', 'Equation_Help_pdf', 'Help_Guide_Cleanup_pdf'];
        this.popUpModule = true;
        this.Ignore_Toaster = null;
        this.StartTimer = null;
        this.percentComplete = null;
        this.cacheNamespace = 'workflow-download';
        this.initialized = false;
        this.initPromise = null;
        this.preloadedActions = Object.keys(DOWNLOAD_PDF_ACTIONS);

        // Early fetch project name if not available
        this.projectNamePromise = this.fetchProjectName();
    }

    _buildInfoMap() {
        var info = {};
        var self = this;
        Object.keys(DOWNLOAD_PDF_ACTIONS).forEach(function(action) {
            var config = DOWNLOAD_PDF_ACTIONS[action] || {};
            if (config.ignore || config.clienBased && Array.isArray(config.clienBased) && !config.clienBased.includes(self._getSupportClientCode())) {

                return debug.log("return ignored by client or role");
            }
            info[action] = {
                menu_id: config.menu_id || '',
                file_suffix: config.file_suffix || '',
                alert: config.alert || null
            };
        });
        return info;
    }

    _isHelpFile(action) {
        return DOWNLOAD_PDF_ACTIONS[action] && DOWNLOAD_PDF_ACTIONS[action].kind === 'help';
    }

    _getSupportClientCode() {
        var client = '';
        try {
            if (SHARED_KEY && SHARED_KEY.client) {
                client = SHARED_KEY.client.toUpperCase();
            } else {
                var path = decodeURIComponent(window.location.pathname);
                var result_page = path.match(/validateurl(\w+)\.html/i);
                if (result_page && result_page[1]) {
                    client = result_page[1].toUpperCase() || '';
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getSupportClientCode', err.message);
        }
        return client;
    }

    _safeProjectName() {

        if (typeof SHARED_KEY === 'object' && SHARED_KEY !== null) {


            if (SHARED_KEY.projectname) {
                return SHARED_KEY.projectname;
            }
            if (SHARED_KEY.titleinfo && SHARED_KEY.titleinfo.projectname) {
                return SHARED_KEY.titleinfo.projectname;
            }


            // Fallbacks when projectname is not available
            if (SHARED_KEY.manuscriptno) return SHARED_KEY.manuscriptno;
            if (SHARED_KEY.fileid) return SHARED_KEY.fileid;
            if (SHARED_KEY.identifier) {
                // Extract last segment from identifier path (e.g., "folder/name" -> "name")
                var parts = SHARED_KEY.identifier.split('/');
                return parts[parts.length - 1] || SHARED_KEY.identifier;
            }
        }
        return '';
    }

    _normalizeOptions(Options = {}) {
        return {
            list: Options && Options.list ? Options.list : '',
            name: Options && Options.name ? Options.name : '',
            dirlist: Options && Options.dirlist ? Options.dirlist : '',
            org_name_list: Options && Options.org_name_list ? Options.org_name_list : ''
        };
    }

    _slugifyRoleName(roleName) {
        return String(roleName || '')
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^A-Za-z0-9_.-]/g, '_');
    }

    _getRoleDetails() {
        var roleName = !IS_EDITOR_PAGE && SHARED_KEY && SHARED_KEY.rolename ? SHARED_KEY.rolename : (USER_INFO && USER_INFO.ROLE_NAME ? USER_INFO.ROLE_NAME : '');
        var roleId = !IS_EDITOR_PAGE && SHARED_KEY && SHARED_KEY.role ? SHARED_KEY.role : (USER_INFO && USER_INFO.ROLE_ID ? USER_INFO.ROLE_ID : '');
        return {
            roleName: this._slugifyRoleName(roleName),
            roleId: this._slugifyRoleName(roleId)
        };
    }

    _joinUrl(base, filePath) {
        return `${base.replace(/\/+$/, '')}/${String(filePath).replace(/^\/+/, '')}`;
    }

    async _urlExists(url) {
        try {
            if (typeof fetch !== 'function') return false;
            var response = await fetch(url, {
                method: 'HEAD',
                cache: 'no-store',
                credentials: 'same-origin'
            });
            return response && response.ok;
        } catch (err) {
            console.warn(err.message);
            return false;
        }
    }

    _getCacheKey(action, result, Options = {}) {
        try {
            var identifier = typeof SHARED_KEY === 'object' && SHARED_KEY !== null && SHARED_KEY.identifier ? SHARED_KEY.identifier : '';
            return JSON.stringify({
                namespace: this.cacheNamespace,
                action: action,
                result: result,
                docId: DOC_ID || '',
                projectName: this._safeProjectName(),
                identifier: identifier || "",
                roleId: USER_INFO && USER_INFO.ROLE_ID ? USER_INFO.ROLE_ID : '',
                roleName: USER_INFO && USER_INFO.ROLE_NAME ? USER_INFO.ROLE_NAME : '',
                selectorBackupFolder: USER_INFO && USER_INFO.SELECTOR_BKUP_FOLDER ? USER_INFO.SELECTOR_BKUP_FOLDER : '',
                host: window.location && window.location.host ? window.location.host : '',
                options: this._normalizeOptions(Options)
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getDownloadCacheKey', err.message);
            return [action, DOC_ID || '', this._safeProjectName()].join('|');
        }
    }

    async _buildHelpFileRequest(action) {
        var client = this._getSupportClientCode() || 'COMMON';
        var actionConfig = DOWNLOAD_PDF_ACTIONS[action] || {};
        var baseFileName = actionConfig[window.location.host] || actionConfig.default;
        var actionParts = action.split('_');
        var displayName = actionParts.map(function(item) {
            return item.charAt(0).toUpperCase() + item.slice(1);
        });
        var fileExtension = actionParts[actionParts.length - 1].toLowerCase();
        var reNameFile = `IMPACT_${displayName.slice(0, -1).join('_')}.${fileExtension}`;
        var folderId = `_SUPPORT_FILES/${action === 'Equation_Help_pdf' ? 'COMMON' : client}`;
        var folderUrl = this._joinUrl(BUCKET_URL, folderId);

        if (!actionConfig.roleBased) {
            var fileUrl = this._joinUrl(folderUrl, baseFileName);
            return {
                action: action,
                filePath: fileUrl,
                url: `${API_PATH}filedownload?appkey=xmleditor&file_sn=${baseFileName}&docid=${folderId}&file_on=${reNameFile}`,
                key: `${DOC_ID}_support_${action}`,
                tempfile: baseFileName,
                reNameFile: reNameFile,
                folder_Id: folderId
            };
        }

        var roleDetails = this._getRoleDetails();
        var roleName = roleDetails.roleName;
        var roleId = roleDetails.roleId;
        var candidates = [];
        var split = reNameFile.split(".");
        var baseStem = split[0];
        var ext = split[1];

        if (roleName) candidates.push(`${baseStem}_${roleName}.${ext}`);
        if (roleId) candidates.push(`${baseStem}_${roleId}.${ext}`);

        candidates.push(baseFileName);

        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            var candidateUrl = this._joinUrl(folderUrl, candidate);
            if (candidate === baseFileName || await this._urlExists(candidateUrl)) {
                return {
                    action: action,
                    filePath: candidateUrl,
                    url: `${API_PATH}filedownload?appkey=xmleditor&file_sn=${candidate}&docid=${folderId}&file_on=${reNameFile}`,
                    key: `${DOC_ID}_support_${action}`,
                    tempfile: candidate,
                    reNameFile: reNameFile,
                    folder_Id: folderId
                };
            }
        }

        var fallbackUrl = this._joinUrl(folderUrl, baseFileName);
        return {
            action: action,
            filePath: fallbackUrl,
            url: `${API_PATH}filedownload?appkey=xmleditor&file_sn=${baseFileName}&docid=${folderId}&file_on=${reNameFile}`,
            key: `${DOC_ID}_support_${action}`,
            tempfile: baseFileName,
            reNameFile: reNameFile,
            folder_Id: folderId
        };
    }

    _buildWorkflowRequest(action, result, Options = {}) {
        var projectName = this._safeProjectName();
        if (!projectName) {
            return null;
        }

        var tempfile = `${projectName}.pdf`;
        var reNameFile = `${projectName}.pdf`;
        var folder_Id = DOC_ID;
        var key = `${DOC_ID}_`;

        if (action === 'ce_track_pdf') {
            tempfile = `CE_${tempfile}`;
            reNameFile = `CE_${reNameFile}`;
            key += 'CEPDF';
        } else if ((typeof I_rGEN_PDF !== 'undefined' && I_rGEN_PDF && I_rGEN_PDF.match(action)) || action === 'package') {
            tempfile = `backup/${USER_INFO.SELECTOR_BKUP_FOLDER}/${DOC_ID}_updated_correction.pdf`;
            reNameFile = `${projectName}_updated_correction.pdf`;
            key += 'trackPDF';
        } else if (typeof I_rGEN_XML !== 'undefined' && action === I_rGEN_XML) {
            var IsParserErr = !!(result && result.xmlparsing);
            tempfile = `${DOC_ID}_updated${IsParserErr ? '_parsingerror.' : '.'}xml`;
            reNameFile = `${projectName}.xml`;
            key += IsParserErr ? 'parseXML' : 'updatedXML';
        } else if (action === 'proof_pdf') {
            key += 'proofPDF';
        }

        var iURL = `${API_PATH}filedownload?appkey=xmleditor&file_sn=${tempfile}&docid=${folder_Id}&file_on=${reNameFile}`;
        return {
            action: action,
            filePath: `${BUCKET_URL}${folder_Id}/${tempfile}`,
            url: iURL,
            key: key,
            tempfile: tempfile,
            reNameFile: reNameFile,
            folder_Id: folder_Id
        };
    }

    async buildDownloadRequest(action, result, Options = {}) {
        try {
            return this._isHelpFile(action) ? await this._buildHelpFileRequest(action) : this._buildWorkflowRequest(action, result, Options);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('buildDownloadRequest', err.message);
            return null;
        }
    }

    async preloadDownloadRequests() {
        try {
            // Only preload actions that don't have preload: false
            var actions = this.preloadedActions.filter(function(action) {
                var config = DOWNLOAD_PDF_ACTIONS[action];
                return config && config.preload !== false;
            });
            for (var idx = 0; idx < actions.length; idx++) {
                var action = actions[idx];
                var request = await this.buildDownloadRequest(action, null, {});
                if (request) {
                    this.requestCache[action] = request;
                    this.requestMeta[action] = {
                        filePath: request.filePath,
                        url: request.url
                    };
                }
            }
            this.initialized = true;
            return this.requestCache;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('preloadDownloadRequests', err.message);
            this.initialized = true;
            return this.requestCache;
        }
    }

    async fetchProjectName() {
        try {
            var self = this;
            var projectName = this._safeProjectName();
            if (projectName) {
                return projectName;
            }
            if (this.projectNamePromise) {
                return this.projectNamePromise;
            }

            this.projectNamePromise = new Promise((resolve, reject) => {
                var completed = false;
                var timeoutId = setTimeout(function() {
                    if (completed) return;
                    completed = true;
                    console.warn('fetchProjectName: Timeout waiting for project name');
                    self.projectNamePromise = null;
                    resolve(self._safeProjectName());
                }, 30000);

                var originalSetter = commonfn.Set_ProjectName;
                commonfn.Set_ProjectName = function(responce, a) {
                    try {
                        if (typeof originalSetter === 'function') {
                            originalSetter(responce, a);
                        } else {
                            var RESULT = responce && responce.data && responce.data[0] ? responce.data[0] : null;
                            if (RESULT && RESULT.projectname) {
                                DOC_INFO.set('PROJECTNAME', RESULT.projectname);
                                SHARED_KEY.projectname = RESULT.projectname;
                            }
                        }
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('fetchProjectName', err.message);
                    } finally {
                        if (!completed) {
                            completed = true;
                            clearTimeout(timeoutId);
                            self.projectNamePromise = null;
                            resolve(self._safeProjectName());
                        }
                        commonfn.Set_ProjectName = originalSetter;
                    }
                };

                var json_data = GET_JSON('getProjectInfo');
                commonfn.callajax(json_data, 'Set_ProjectName', API_GET_DOCS, null);
            });

            return this.projectNamePromise;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('fetchProjectName', err.message);
            this.projectNamePromise = null;
            return '';
        }
    }

    _waitForProjectName() {
        var projectName = this._safeProjectName();
        if (projectName) {
            return Promise.resolve(projectName);
        }
        // Reuse the existing promise if available to avoid duplicate API calls
        if (this.projectNamePromise) {
            return this.projectNamePromise;
        }
        return this.fetchProjectName();
    }

    async Init() {
        try {
            if (!SHARED_KEY || Object.keys(SHARED_KEY).length === 0) {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(this.Init());
                    }, 500);
                });
            }
            if (this.initPromise) return this.initPromise;
            this.initPromise = (async () => {
                var workflowActions = this.preloadedActions.filter(function(action) {
                    return DOWNLOAD_PDF_ACTIONS[action] && DOWNLOAD_PDF_ACTIONS[action].kind === 'workflow';
                });
                // Ensure project name is available before building workflow requests
                if (workflowActions.length && this.projectNamePromise) {
                    await this.projectNamePromise;
                }
                return this.preloadDownloadRequests();
            })();
            return this.initPromise;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Init', err.message);
            this.initialized = true;
            return Promise.resolve(this.requestCache);
        }
    }

    async ensureInitialized() {
        if (!this.initPromise) {
            this.Init();
        }
        return this.initPromise;
    }

    async getDownloadRequest(action, result, Options = {}) {
        try {
            await this.ensureInitialized();
            if (this.requestCache[action]) {
                return this.requestCache[action];
            }
            // Build on cache miss for actions not preloaded (e.g., xml with preload: false)
            var request = await this.buildDownloadRequest(action, result, Options);
            if (request) {
                this.requestCache[action] = request;
            }
            return request;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getDownloadRequest', err.message);
            return null;
        }
    }

    changeSpinnerState(elm, IsShow = false, response = {}) {
        try {
            if (typeof elm === 'string') {
                var info = this.Info[elm];
                elm = info && info.menu_id ? document.getElementById(info.menu_id) : null;
            }
            if (typeof elm === 'undefined') elm = document.querySelector('.spinner-show');
            if (!elm) return;
            elm.classList[IsShow ? 'add' : 'remove']('spinner-show');
            elm.classList[IsShow ? 'remove' : 'add']('spinner-hide');
            elm[IsShow ? 'setAttribute' : 'removeAttribute']('timeStamp', new Date().getTime());
            if (!IsShow) return;
            if (Object.prototype.hasOwnProperty.call(this.Info, elm.id)) {
                this.watcherForGeneration(elm);
            }
            if (IsShow && typeof response.r == 'undefined' && I_rGEN_PDF && I_rGEN_PDF.match(elm.id) && /OHO|OSO|OXMEDO/gi.test(commonMethods.getClientCode({
                    format: "upper"
                }))) {
                AlertNewDialog.fire('info', 'Information', 'track_pdf_pre_warn', 'OK', '', true, {
                    override: true
                });
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('changeSpinnerState', err.message);
        }
    }

    checkSpinerStatus(elm, Option, _ = this) {
        try {
            Option = Option ? Option : ({
                error: false
            });
            var spinner = elm ? [elm] : document.querySelectorAll('.spinner-show');
            Array.from(spinner).forEach(function(spin) {
                var startTimer = spin ? spin.getAttribute('timeStamp') : null;
                if (!startTimer) return;
                var IsExceed = moment().diff(parseInt(startTimer, 10), 'second') > 64;
                if (!IsExceed && !Option.error) return;
                var info = _.Info[spin.id];
                var alert_msg_key = info && info.alert ? info.alert.error : null;
                if (alert_msg_key) {
                    if (IS_JOURNAL) TOASTER_ALERT(alert_msg_key);
                    else {
                        AlertNewDialog.fire('warning', '', alert_msg_key, 'OK', '', true, {
                            override: true
                        });
                    }
                    _.changeSpinnerState(spin, false);
                    ErrorLogTrace(alert_msg_key, 'Generate_TimeOut');
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('checkSpinerStatus', err.message);
        }
    }

    watcherForGeneration(elm, _ = this) {
        try {
            var timer = 300000;
            setTimeout(function(targetElm) {
                _.checkSpinerStatus(targetElm);
            }, timer, elm);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('watcherForGeneration', err.message);
        }
    }

    generate_files_list(type) {
        try {
            var CE_PDF = SHARED_KEY.projectname ? SHARED_KEY.projectname : (SHARED_KEY.titleinfo.projectname ? SHARED_KEY.titleinfo.projectname : '');
            var LOCAL = type === 'local' ? (',' + DOC_ID + '_updated.html,' + DOC_ID + '.html,pagemap.json') : '';
            CE_PDF = CE_PDF ? (CE_PDF + '.pdf') : '';
            return `${DOC_ID}_updated_Tracking.xml,${DOC_ID}_updated_parsingerror.xml,${DOC_ID}_updated.xml,${DOC_ID}_updated_correction.pdf${CE_PDF + LOCAL}`;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('generate_files_list', err.message);
            return '';
        }
    }

    zip_download_post(response, Opt) {
        try {
            console.info('DOWNLOADOING ....' + JSON.stringify(response));
            if (response.r == 1) {
                var zip_file_name = response.zippath.split('/').lastValue();
                var split = zip_file_name.split('.zip');
                var reName = split[0] + moment().format('D_MMM_YY_hh:m:s_a') + '.zip';
                var iURL = `${API_PATH}filedownload?appkey=xmleditor&file_sn=${zip_file_name}&docid=${DOC_ID}&file_on=${reName}`;
                this.httpRequest(`${BUCKET_URL}${DOC_ID}/${zip_file_name}`, iURL, true);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('zip_download_post', err.message);
        }
    }

    zip_download(type, Option) {
        try {
            var defaultFiles = this.generate_files_list(type);
            var packageName = SHARED_KEY.identifier.split('/').lastValue();
            var PROJECT_NAME = SHARED_KEY.projectname ? SHARED_KEY.projectname : (SHARED_KEY.titleinfo.projectname ? SHARED_KEY.titleinfo.projectname : packageName);
            var files_list = Option && Option.list ? Option.list : defaultFiles;
            var name = Option && Option.name ? Option.name : PROJECT_NAME;
            var json_data = {
                tbl: 'Fileslist',
                renamefile: '',
                name: name,
                projectname: PROJECT_NAME,
                docid: DOC_ID,
                fileslist: files_list
            };
            if (['package', 'local'].includes(type)) {
                json_data.dirlist = 'images,supporting,attachments';
                if (type == 'package') sessionStorage.removeItem('xmleditor:' + DOC_ID + ':downloadpackage');
            } else if (Option && Option.org_name_list) {
                json_data.tbl = 'Usernotes';
                json_data.dirlist = 'attachments';
                json_data.orgnamelist = Option.org_name_list;
            }
            if (Option && Option.dirlist) {
                json_data.dirlist = Option.dirlist;
            } else if (!json_data.dirlist) {
                json_data.dirlist = '';
            }
            commonfn.callajax(json_data, 'zip_download_post', API_ZIP_DOWNLOAD, this);
        } catch (err) {
            console.warn(err.message);
            if (type == 'package') FinalizeDialog.reDirectReadOnly();
            ErrorLogTrace('zip_download', err.message);
        }
    }

    xhr_handleEvent(e) {
        try {
            debug.log(`${e.type}: ${e.loaded} bytes transferred`);
            if (e.lengthComputable) {
                debug.log(e.loaded / e.total);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('xhr_handleEvent', err.message);
        }
    }

    xhr_addListeners(xhr, $this = this) {
        xhr.addEventListener('loadstart', $this.xhr_handleEvent.bind($this));
        xhr.addEventListener('loadend', $this.xhr_handleEvent.bind($this));
        xhr.addEventListener('progress', $this.xhr_handleEvent.bind($this));
        xhr.addEventListener('error', $this.xhr_handleEvent.bind($this));
        xhr.addEventListener('abort', $this.xhr_handleEvent.bind($this));
    }

    download_window_open(iURL, Options, $this = this) {
        try {
            if (iURL && iURL.indexOf('://') == -1 && !iURL.includes('@')) iURL = 'http://' + iURL;
            var windowName = typeof Options === 'string' && Options ? Options : '_blank';
            var downloadPopUp = window.open(iURL, windowName, 'noopener');
            if (downloadPopUp == null || downloadPopUp.closed || typeof downloadPopUp == 'undefined') {
                $this.Ignore_Toaster = true;
                AlertNewDialog.fire('warning', 'Warning', 'PopupBlocker_New', 'OK', '', true, {
                    override: true,
                    url: iURL
                });
            } else {
                $this.Ignore_Toaster = null;
                downloadPopUp.focus();
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('download_window_open', err.message);
        }
    }

    download_window_after_opened(result, clickElm, Options = {}, $this = this) {
        try {
            var alert_msg_key = result ? 'fileDownloadSuccess' : 'fileDownloadFail';
            var TYPE = result ? 'success' : 'error';
            var alertObject = null;

            if (typeof clickElm !== 'boolean' && $this.Info && $this.Info[clickElm]) {
                $this.changeSpinnerState(clickElm, false);
                alertObject = $this.Info[clickElm].alert;

                if (alertObject) {
                    alert_msg_key = alertObject[result ? 'pass' : 'error'];
                    if (alertObject.pass_2_type && typeof AlertNewDialog !== 'undefined') {
                        var altMsg = alertObject[result ? 'pass_2' : 'error'];
                        AlertNewDialog.fire('warning', 'Warning', altMsg, 'OK', '', true, {
                            override: true
                        });
                    }
                }
            }

            if (typeof TOASTER_ALERT !== 'undefined' && !$this.Ignore_Toaster) {
                TOASTER_ALERT(alert_msg_key, {
                    type: TYPE
                });
            }

            if ($this && typeof $this.Record_db === 'function') {
                $this.Record_db(clickElm, result);
            }
        } catch (err) {
            console.warn(err.message);
            if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace('after_download_window_open', err.message);
            }
        }
    }

    httpRequest(filePath, iURL, clickElm, Options) {
        try {
            Options = Options ? Options : ({
                IsFileAvilable: false
            });
            var $this = this;
            var xhttp = new XMLHttpRequest();
            this.history[filePath] = iURL;
            this.lastURL = iURL;
            $this.percentComplete = null;
            $this.xhr_addListeners(xhttp);
            xhttp.onload = function() {
                try {
                    if (this.readyState == 4) {
                        var seconds = moment().diff($this.StartTimer, 'second') > 1500 ? 750 : 1500;
                        var IsPass = this.status == 200;
                        var decodedURL = this.responseURL.replace(/%20/g, ' ');
                        if (Options.IsFileAvilable) {
                            if (IsPass) console.log('PASS');
                            else ErrorLogTrace('TRACK_PDF_LINK_PUBKIT', 'PDF_NOT_AVAILABLE');
                        }
                        var newMethod = $this.history[this.responseURL] || $this.history[decodedURL] || iURL;
                        var a = document.createElement('a');
                        a.href = newMethod;
                        a.target = '_blank';
                        document.body.appendChild(a);
                        if (IsPass) {
                            if ($this.popUpModule) {
                                $this.download_window_open(newMethod);
                            } else {
                                a.click();
                            }
                        }
                        commonMethods.removeEl(a);
                        if (clickElm) {
                            setTimeout(function(result, clickId) {
                                $this.download_window_after_opened(result, clickId, Options);
                            }, seconds, IsPass, clickElm);
                        }
                    }
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('xhttp.onload', err.message);
                }
            };
            xhttp.open('GET', filePath, true);
            xhttp.responseType = 'blob';
            xhttp.setRequestHeader('Content-type', 'application/json; charset=utf-8');
            xhttp.send();
        } catch (err) {
            this.changeSpinnerState(clickElm, false);
            console.warn(err.message);
            ErrorLogTrace('httpRequest', err.message);
        }
    }

    getSetProjectName(a) {
        try {
            var _ = this;
            commonfn.Set_ProjectName = function(responce, arg) {
                var RESULT = responce.data[0];
                if (RESULT && RESULT.projectname) {
                    DOC_INFO.set('PROJECTNAME', RESULT.projectname);
                    SHARED_KEY.projectname = RESULT.projectname;
                }
                if (arg && typeof _.click != 'undefined') _.click(arg);
            };
            if (SHARED_KEY.titleinfo.projectname && SHARED_KEY.titleinfo.projectname.length > 3) {
                SHARED_KEY.projectname = SHARED_KEY.titleinfo.projectname;
            }
            if (!SHARED_KEY.projectname) {
                commonfn.callajax(GET_JSON('getProjectInfo'), 'Set_ProjectName', API_GET_DOCS, a);
                return false;
            }
            return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getURLwithAPI', err.message);
            return false;
        }
    }

    async click(a, result, Options) {
        try {
            debug.log("clicked " + a);
            Options = Options ? Options : ({
                IsFileAvilable: false
            });
            if (!navigator.onLine) {
                if (typeof TOASTER_ALERT != 'undefined') {
                    TOASTER_ALERT('OffLine_Error_show', {
                        type: 'warning'
                    });
                }
                return false;
            }
            // Fetch project name if not available for workflow downloads
            if (!this._isHelpFile(a) && !this._safeProjectName()) {
                await this._waitForProjectName();
            }
            this.StartTimer = moment();
            this.OptClk = this.Info[a] && this.Info[a].menu_id ? iGetElmById(this.Info[a].menu_id) : null;
            if (this.OptClk) this.changeSpinnerState(this.OptClk, true, result);

            var request = await this.getDownloadRequest(a, result, Options);
            if (!request) {
                if (this.OptClk) this.changeSpinnerState(this.OptClk, false);
                return false;
            }

            if (result == 'landing') {
                var popout = window.open(request.url, '_blank', 'download');
                window.setTimeout(function() {
                    if (popout && !popout.closed) popout.close();
                }, 7500);
            } else {
                this.httpRequest(request.filePath, request.url, a, Options);
            }
            return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('click', err.message);
            return false;
        }
    }

    Record_db(clikElm, result) {
        try {
            var json_data = GET_JSON('default');
            Object.assign(json_data, {
                tbl: 'UserPreference',
                downloadstatus: result,
                pdftype: clikElm,
                page: IS_TRACK_VIEW ? 'trackview' : 'editor',
                recordtype: 'pdf_download'
            });
            commonfn.callajax(json_data, 'Download_PDF_record', API_UPDATE_INSERT);
            commonfn.Download_PDF_record = function(response) {
                try {
                    console.log(JSON.stringify(response));
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('Download_PDF_record', err.message);
                }
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Record_db', err.message);
        }
    }

}
commonfn.click_record = function(response) {
    try {
        console.log(JSON.stringify(response));
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('click_record', err.message);
    }
};


document.addEventListener('DOMContentLoaded', function(event) {
    try {

        window.WorkflowDownloadModule = WorkflowDownloadModule;
        var iDownloadMethod = new WorkflowDownloadModule();
        window.iDownloadMethod = iDownloadMethod;



        function user_click_record(type) {
            if (/guide/gi.test(type)) {
                if (!IS_EDITOR_PAGE) {
                    type = type + '_image';
                } else if (IS_EDITOR_PAGE) {
                    return;
                }
            }
            var json_data = GET_JSON('default');
            Object.assign(json_data, {
                tbl: 'UserPreference',
                action: 'Open',
                remark: type.split('_').map(function(string) {
                    return string.charAt(0).toUpperCase() + string.slice(1);
                }).join(' '),
                info: `${IS_EDITOR_PAGE ? 'Editor' : 'Landing'} Page`,
                recordtype: type
            });
            commonfn.callajax(json_data, 'click_record', API_UPDATE_INSERT);
        }

        var bootstrapped = false;
        var attempts = 0;
        var maxAttempts = 40;
        var waitMs = 250;
        var sharedKeyWaitMs = 1500;
        var currentUrl = window.location && window.location.href ? window.location.href : '';
        var isValidateUrl = currentUrl.indexOf('validateurl') > -1;

        var bootstrapDownloadModule = function() {
            if (bootstrapped) return true;
            bootstrapped = true;

            if (typeof iDownloadMethod !== 'undefined' && iDownloadMethod && typeof iDownloadMethod.Init === 'function') {
                iDownloadMethod.Init();
            }

            console.log('Ready function');
            document.querySelectorAll('[title="Guided Tour"],[title="Video Tutorial"],[id="support_mail_id"]').forEach(function(elm) {
                elm.onclick = function(e) {
                    var target = e.currentTarget,
                        param = '';
                    if (target) {
                        if (/support/gi.test(target.id)) {
                            param = 'support_mail';
                        } else if (target.getAttribute('title')) {
                            param = /guide/gi.test(target.getAttribute('title')) ? 'guided_tour' : 'video_tour';
                        }
                        user_click_record(param);
                    }
                };
            });

            return true;
        };

        var waitForInitialLoad = function() {
            if (isValidateUrl) {
                waitForSharedKey();
                return;
            }

            if (typeof window.InitialLoadDialog === 'undefined' || window.InitialLoadDialog.FullyLoaded === true) {
                bootstrapDownloadModule();
                return;
            }

            attempts += 1;
            if (attempts >= maxAttempts) {
                console.warn('InitialLoadDialog did not finish in time; bootstrapping download module anyway.');
                bootstrapDownloadModule();
                return;
            }
            window.setTimeout(waitForInitialLoad, waitMs);
        };

        var waitForSharedKey = function() {
            var hasSharedKeyValue = typeof SHARED_KEY !== 'undefined' && SHARED_KEY && (
                SHARED_KEY.projectname ||
                (SHARED_KEY.titleinfo && SHARED_KEY.titleinfo.projectname)
            );

            if (hasSharedKeyValue) {
                bootstrapDownloadModule();
                return;
            }

            attempts += 1;
            if (attempts >= maxAttempts) {
                console.warn('SHARED_KEY did not become available in time; bootstrapping download module anyway.');
                bootstrapDownloadModule();
                return;
            }
            window.setTimeout(waitForSharedKey, sharedKeyWaitMs);
        };

        waitForInitialLoad();

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('WorkflowDownloadModule-DOMContentLoaded', err.message);
    }
});