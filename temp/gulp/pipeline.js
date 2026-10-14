// File: utils\gulp\pipeline.js
const path = require('path');
const packageJson = require('../../package.json');

const {
    getLastGeneratedVersion
} = require('../../environments/base.env');

const SESSION_LANDING_JS = [
    "src/modules/shared/link_session/ports.js",
    "src/modules/shared/link_session/LinkSessionCore.js",
    "src/modules/shared/link_session/localHostSession.js",
    "src/modules/shared/link_session/LinkSessionModule.js",
    "src/modules/shared/link_session/bootstrap.js",
    "src/modules/shared/link_session_send/index.js"
];

const SESSION_EDITOR_JS = [
    "src/modules/shared/link_session/ports.js",
    "src/modules/shared/link_session/LinkSessionCore.js",
    "src/modules/shared/link_session/localHostSession.js",
    "src/modules/shared/link_session/LinkSessionEditor.js",
    "src/modules/shared/link_session/bootstrap.js",
    // "src/modules/shared/link_session_request/index.js",
];

/** Query/comment system — ordered concat for e6_main and e6_Track */
const QUERY_COMMENT_SYSTEM_JS = [
    "src/modules/shared/query-comment-system/bootstrap.js",
    "src/modules/shared/query-comment-system/QueryBaseModule.js",
    "src/modules/shared/query-comment-system/AttachmentModule.js",
    "src/modules/shared/query-comment-system/QueryPanelModule.js",
    "src/modules/shared/query-comment-system/QueryRestoreModule.js",
    "src/modules/shared/query-comment-system/QueryTemplates.js",
    "src/modules/shared/query-comment-system/QueryUtils.js",
    "src/modules/shared/query-comment-system/QueryDialogModule.js",
    "src/modules/shared/query-comment-system/register.js"
];

// Main function to generate pipeline config
var generatePipelineConfig = function(env, version) {
    // console.log(process.env.NODE_ENV);
    if (env === "local") {
        version = getLastGeneratedVersion();
    }
    console.log("---------------");
    // Return the updated PIPELINE_CONFIG
    return {
        version: version,
        COMMON_DEST: {
            JS: `dist/assets/${version}/js/`,
            CSS: `dist/assets/${version}/css/`
        },
        main_html: {
            input: "snippet/*.html",
            output: "./dist/",
            final_dest: "./",
            items: [],
            minify: true,
            sourcemap: false,
            commonReplace: true
        },
        PAGES: {
            index: {
                JS_FILES: ["src/js/index.js"],
                CSS_FILES: ["src/static/css/index.css"],
            },
            login: {
                JS_FILES: [
                    "src/js/index.js",
                    "src/js/common/login.js"
                ],
                CSS_FILES: ["src/static/css/login.css"]
            },
            dashboard: {
                JS_FILES: [
                    "src/js/index.js",
                    "src/static/lib/ag-grid/CustomTooltip.js",
                    "src/js/common/dashboard_grid.js",
                ],
                CSS_FILES: [
                    "src/static/lib/ag-grid/styles/custom-tooltip.css",
                    "src/static/css/dashboard_grid.scss"
                ]
            },
            adminconfig: {
                JS_FILES: [
                    "src/js/index.js",
                    "src/js/common/admin-config-helpers.js",
                    "src/js/common/admin-config.js",
                ],
                CSS_FILES: [
                    "src/static/css/common_dash.css",
                    "src/static/css/admin-config.css"
                ],
            },
            admindashboard: {
                JS_FILES: [
                    "src/js/index.js",
                    "src/static/lib/ag-grid/CustomTooltip.js",
                    "src/js/common/filtergrid.js",
                    "src/js/common/compare_report.js",
                    "src/js/common/history_doi.js",
                    "src/js/common/user_activity.js",
                    "src/js/common/deactive.js",
                    "src/js/common/update_user_email.js",
                    "src/js/common/ftpfail_report.js",
                    "src/js/common/admin_access.js",
                    "src/js/common/crud_maintenance.js",
                    "src/js/common/show_config.js",
                    "src/js/common/search_by_date.js",
                    "src/js/common/search_query.js",
                    "src/js/common/usermodifiyed_report.js",
                    "src/static/lib/common/dropzone.js",
                    "src/js/common/upload.js",
                    "src/js/common/admindashboard.js"
                ],
                CSS_FILES: [
                    "src/static/lib/ag-grid/styles/custom-tooltip.css",
                    "src/static/css/common_dash.css",
                    "src/static/css/admin_dash.css"
                ],
            },
            userdashboard: {
                JS_FILES: [

                    "src/js/index.js",
                    "src/js/common/userdashboard.js"
                ],
                CSS_FILES: ["src/static/lib/datatables/css/dataTables.bootstrap4.css"]
            },
            videotour: {
                JS_FILES: [
                    "src/js/index.js",
                    "src/js/common/VideoTour.js",
                    "src/js/dialogModules/Database.js"
                ],
                CSS_FILES: ["src/static/css/main.css", "src/static/css/media_query.css", "src/static/css/video_tour.scss"]
            },
            releasenote: {
                JS_FILES: [
                    "src/js/index.js",
                    "src/js/common/releasenote.js"
                ],
                CSS_FILES: ["src/static/css/media_query.css", "src/static/css/releasenote.css"]
            },
            socket: {
                JS_FILES: [
                    "src/js/index.js",
                    "src/js/common/socket-workflow.js"
                ],
                CSS_FILES: []
            },
            workflows: {
                JS_FILES: [
                    "src/js/index.js",
                    "src/js/common/workflows.js"
                ],
                CSS_FILES: ["src/static/css/media_query.css", "src/static/css/workflows.css"]
            },
            landing: {
                JS_FILES: [
                    "src/js/index.js",
                    "src/js/dialogModules/AlertNew.js",
                    "src/js/dialogModules/LandingPage.js",
                    "src/js/dialogModules/Download_Module.js",
                    "src/js/dialogModules/ErrorMail_Module.js"
                ],
                CSS_FILES: [
                    "src/static/css/LandingPage.css",
                    "src/static/css/alertnewscss.scss"
                ],
            },
            session_landing: {
                JS_FILES: SESSION_LANDING_JS
            },
            session_editor: {
                JS_FILES: SESSION_EDITOR_JS
            },
            browser_compatible: {
                JS_FILES: [
                    "src/modules/shared/browser-compatible/index.js"
                ],
                JS_OUT: `dist/assets/${version}/modules/browser-compatible`,
                JS_RENAME: "index",
                CSS_FILES: [],
                CSS_OUT: `dist/assets/${version}/modules/browser-compatible`
            },
            socket_bridge: {
                JS_FILES: [
                    "src/modules/_wip/socket_bridge/socketUrl.js",
                    "src/modules/_wip/socket_bridge/index.js",
                    "src/modules/_wip/socket_bridge/purposes.js"
                ],
                JS_OUT: `dist/assets/${version}/modules/socket_bridge`,
                CSS_FILES: [],
                CSS_OUT: `dist/assets/${version}/modules/socket_bridge`
            },
            e6_common: {
                JS_FILES: [
                    "src/js/index.js",
                    "src/js/_initialGlobalVaribale.js",

                    "src/js/_editorLayout.js",
                    "src/js/_initialAlertmessageLoader.js",
                    "src/js/_initalLoadingDialog.js",

                    "src/js/_initialPageLoader.js",
                    "src/js/_initialScriptLoader.js",
                    "src/js/initializer.js",
                    "src/js/editor_open.js",
                    "src/js/commonfn.js",
                    "src/js/demo.js",
                    "src/js/dialogModules/dialogsHandle.js",
                    "src/js/dialogModules/ErrorMail_Module.js",
                    "src/js/dialogModules/Download_Module.js",
                    "src/js/dialogModules/AlertNew.js",
                ]
            },
            e6_main: {
                JS_FILES: [
                    "src/js/editor_sync_scrollspy.js",
                    "src/js/editor_page_events_fn.js",
                    "src/js/commonEvtHandler.js",
                    ...QUERY_COMMENT_SYSTEM_JS,
                    "src/js/demo.js",
                    "src/js/editorBootInit.js",
                ],
                CSS_FILES: ["src/static/css/main.css", "src/static/css/media_query.css", "src/static/css/editorLayout.css"]
            },
            cke_custom_all: {
                CSS_FILES: ['src/editor_css/**.css', 'src/editor_css/**.scss']
            },
            cke_custom_author: {
                CSS_FILES: ['src/editor_css/**.css', 'src/editor_css/**.scss', '!src/editor_css/editor_ref_color.css']
            },
            e6_Track: {
                JS_FILES: [
                    "src/js/editor_readonly.js",
                    ...QUERY_COMMENT_SYSTEM_JS,
                    "src/js/demo.js",
                    "src/js/dialogModules/ShowTracking_Module.js"
                ],
                CSS_FILES: [
                    "src/static/css/main.css",
                    "src/static/css/media_query.css",
                    "src/static/css/Dialogs/TrackModule.css",
                    "src/static/css/Dialogs/QueryCommentModule.scss",
                    "src/static/css/Dialogs/LoadingDialog.scss",
                    "src/static/css/Dialogs/CommonDialog.scss",
                    'src/static/css/alertnewscss.scss',
                    'src/modules/shared/**/styles.scss',
                ]
            },
            dialog_module: {
                JS_FILES: [
                    "src/js/dialogModules/authorGroupSupport.js",
                    "src/js/dialogModules/*.js",
                    "!src/js/dialogModules/dialogsHandle.js",
                    "!src/js/dialogModules/ErrorMail_Module.js",
                    "!src/js/dialogModules/LandingPage.js",
                    "!src/js/dialogModules/*.min.js",
                    "!src/js/dialogModules/Download_Module.js",
                    "!src/js/dialogModules/AlertNew.js",
                ],
                CSS_FILES: [
                    'src/static/css/shared/_ref-element-colors.scss',

                    'src/static/css/Dialogs/**.css',
                    'src/static/css/Dialogs/**.scss',
                    'src/static/css/alertnewscss.scss',


                    'src/modules/standalone/**/styles.scss',
                    'src/modules/standalone/**/styles.css',
                    'src/modules/standalone/**/styles.css',

                    'src/modules/shared/qc_validation/styles.scss',
                    'src/modules/shared/tooltip/styles.scss',
                    'src/modules/shared/link_session_request/styles.scss',

                    
                ]
            },
            global_context_common: {
                JS_FILES: [
                    // Must load before context.js files
                    "src/modules/context/store/module-runtime-store.js",
                    "src/modules/context/store/template-store.js",
                    "src/modules/context/initial_helpers/context-helpers.js",
                    "src/modules/shared/**/context.js",
                ],
                JS_OUT: `dist/assets/${version}/modules`,
                CSS_FILES: [],
                CSS_OUT: `dist/assets/${version}/modules`
            },
            global_context_editor: {
                JS_FILES: [
                    "src/modules/standalone/**/context.js",
                ],
                JS_OUT: `dist/assets/${version}/modules`,
                CSS_FILES: [],
                CSS_OUT: `dist/assets/${version}/modules`
            },
            module_main: {
                JS_FILES: [
                    "src/modules/components/Error_Report_Table_Builder.js",
                    "src/modules/components/UserActionRecord_Handler.js",
                    "src/modules/components/ModuleStore.js",
                    "src/modules/components/IdGenerator.js",
                    "src/modules/components/BitsIdGenerator.js",
                    "src/modules/components/JatsIdGenerator.js",
                    "src/modules/components/DocBookIdGenerator.js",
                    "src/modules/components/Renumber_Handler.js",
                    "src/modules/components/trackManager.js",
                    "src/modules/components/FileUploadModule.js",
                    "src/modules/components/SummernoteManager.js",
                    "src/modules/components/emailInputHelper.js",


                    "src/modules/_runtime/BaseModule.js",
                    "src/modules/_runtime/UnifiedModuleSystem.js",
                    "src/modules/module_main.js",
                ],
                JS_OUT: `dist/assets/${version}/modules`,

                CSS_FILES: [],
                CSS_OUT: `dist/assets/${version}/modules`,


            },
            lang_js: {
                JS_FILES: [
                    'src/js/lang/*.js'
                ],
                JS_OUT: `dist/assets/${version}/config/lang/`,

                JSON_FILES: ['src/js/**/*.json', 'src/js/dialogModules/*.json'],
                JSON_OUT: `dist/assets/${version}/meta/`,
                JSON_EXCLUDE_DIR: true
            },
            single_module: {
                JS_FILES: [
                    "src/modules/standalone/**/index.js",

                    "src/modules/standalone/**/*.js",
                    "src/modules/shared/**/*.js",

                    // "src/modules/shared/tooltip/TooltipTrackBootstrap.js",

                    "!src/modules/shared/**/context.js",
                    "!src/modules/shared/browser-compatible/**",
                    "!src/modules/shared/query-comment-system/**",
                    "!src/modules/shared/link_session/ports.js",
                    "!src/modules/shared/link_session/LinkSessionCore.js",
                    "!src/modules/shared/link_session/localHostSession.js",
                    "!src/modules/shared/link_session/LinkSessionEditor.js",
                    "!src/modules/shared/link_session/LinkSessionModule.js",
                    "!src/modules/shared/link_session/bootstrap.js",
                    "!src/modules/shared/link_session_send/index.js"
                ],
                JS_OUT: `dist/assets/${version}/modules`,
                CSS_FILES: [
                    'src/editor_css/JATS/**.css',
                    // Flatten output: only CSS files, not folders
                    {
                        pattern: 'src/editor_css/journals/**/*.css',
                        flatten: true
                    },
                    'src/editor_css/BITS/**.css',
                    'src/editor_css/JATS/**.scss',
                    'src/editor_css/BITS/**.scss'
                ],
                CSS_OUT: `dist/assets/${version}/css/specific/`,
                HTML_FILES: [

                    "src/modules/standalone/**/template.html",
                    "src/modules/shared/**/template.html",
                ],
                HTML_OUT: `dist/assets/${version}/modules`,
                TEMPLATE_BUNDLE: {
                    SRC: [

                        'src/modules/standalone/**/template.html',
                        'src/modules/shared/**/template.html'
                    ],
                    DEST: `dist/assets/${version}/modules/templates.html`,
                    VALIDATE_CONTEXT: [

                        'src/modules/**/context.js',
                        'src/modules/shared/**/context.js',
                        '!src/modules/_wip/**'
                    ],
                },

                JSON_FILES: [

                    'src/modules/standalone/**/*.json',
                    'src/modules/shared/**/*.json'
                ],
                JSON_OUT: `dist/assets/${version}/modules/`
            },
            client_config: {
                XML_FILES: [
                    'src/clientconfig/**/*.xml',
                    'src/clientconfig/**/*.*.xml',
                    'src/clientconfig/**/**/*.*.xml',
                    'src/clientconfig/**/**/*.xml',
                    '!src/clientconfig/temp/**',
                    '!src/clientconfig/**/**/extra/**'
                ],
                XML_OUT: `dist/assets/${version}/config/`
            },

        }
    };
};

generatePipelineConfig.SESSION_LANDING_JS = SESSION_LANDING_JS;
generatePipelineConfig.SESSION_EDITOR_JS = SESSION_EDITOR_JS;

module.exports = generatePipelineConfig;
