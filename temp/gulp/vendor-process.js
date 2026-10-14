// File: utils/gulp/vendor-process.js
const {
    src,
    dest
} = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const noop = require("gulp-noop");
const replace = require('gulp-string-replace');
const jsonMinify = require('gulp-json-minify');


// Function to move files based on configuration
var VENDOR_HANDLING = function (done) {
    var version = global.PIPELINE.version;
    // console.log(version);
    try {
        const MOVEMENT = {
            FONT: {
                IN: [
                    "src/static/fonts/fontawesome/webfonts/*.*",
                    "src/static/fonts/*/*.*",
                    "src/static/lib/summernote/0.8.2/font/*.*",
                    "src/static/lib/mathlive/fonts/*.*"
                ],
                OUT: `dist/assets/${version}/webfonts/`,
                // No concatenation for fonts
                CONCAT: null,
                // No renaming for fonts
                RENAME: null,
                // added to handle binary files correctly
                BINARY: true,
            },
            BOOST: {
                IN: [
                    "src/static/lib/bootstrap/js/bootstrap.bundle.*",
                    "src/static/lib/bootstrap/js/popper.*",
                    "src/static/lib/bootstrap/js/bootstrap-dropdownhover.js",
                    "src/static/lib/bootstrap-tour/js/bootstrap-tour.min.js",
                    "src/static/lib/bootstrap-tour/css/bootstrap-tour.min.css",
                    "src/static/lib/bootstrap/css/bootstrap.min.css*",
                    "src/static/lib/jquery/core.*",
                    "src/static/lib/jquery/jquery.min.*",
                    "src/static/lib/jquery-ui/jquery-ui.min*",
                    "src/static/lib/jquery-knob/jquery.knob.min*",
                    "src/static/lib/ag-grid/ag-grid-enterprise.min.js",
                ],
                OUT: `dist/assets/${version}/vendor/`,
                // No concatenation for fonts
                CONCAT: null,
                // No renaming for fonts
                RENAME: null
            },
            vendor_jbt: {
                IN: [
                    "src/static/lib/popper/popper.min.js",
                    "src/static/lib/jquery/jquery.min.js",
                    "src/static/lib/jquery-ui/jquery-ui.min.js",
                    "src/static/lib/bootstrap/js/bootstrap.bundle.min.js",
                ],
                OUT: `dist/assets/${version}/vendor/`,
                CONCAT: "vendor_jbt.js",
                RENAME: "vendor_jbt.js",
                minify: false,
                sourcemap: false,

            },
            vendor_admin_config: {
                IN: [
                    "src/static/lib/codemirror/bootstrap.min.css",
                    "src/static/lib/codemirror/monokai.min.css",
                    "src/static/lib/codemirror/foldgutter.min.css",
                    "src/static/fonts/fontawesome/css/all.min.css"
                ],
                OUT: `dist/assets/${version}/vendor/`,
                CONCAT: "vendor_admin_config.css",
                RENAME: "vendor_admin_config.css",
                minify: false,
                sourcemap: false
            },
            vendor_jbt_css: {
                IN: [
                    "src/static/lib/bootstrap/css/bootstrap.min.css",
                    "src/static/fonts/fontawesome/css/all.min.css"
                ],
                OUT: `dist/assets/${version}/vendor/`,
                CONCAT: "vendor_jbt.css",
                RENAME: "vendor_jbt.css",
                minify: false,
                sourcemap: false,

            },
            vendor_smt: {
                IN: [
                    'src/static/lib/sweetalert2/sweetalert2.all.min.js',
                    'src/static/lib/common/moment.min.js',
                    'src/static/lib/common/mustache.min.js',
                    'src/static/lib/common/tippy.min.js',
                    'src/static/lib/axios/axios.min.js'
                ],
                OUT: `dist/assets/${version}/vendor/`,
                CONCAT: "vendor_smt.js",
                RENAME: "vendor_smt.js",
            },
            user_dash_vendor: {
                IN: ["src/static/lib/datatables/js/jquery.dataTables.js",
                    "src/static/lib/datatables/js/dataTables.bootstrap4.js",
                    "src/static/lib/common/datetime-moment.js",
                    "src/static/lib/common/dataTable_sort.js",
                    "src/static/lib/common/dropzone.js"
                ],
                OUT: `dist/assets/${version}/vendor/`,
                CONCAT: "vendor_user_dash.js",
                RENAME: "vendor_user_dash.js",

            },
            e6_vendor_js: {
                IN: [
                    "src/static/lib/bootstrap/js/bootstrap-dropdownhover.js",
                    "src/static/lib/bootstrap-tour/js/bootstrap-tour-standalone.js",
                    'src/static/lib/common/Sortable.min.js',
                    'src/static/lib/summernote/0.8.2/summernote.min.js'
                ],
                OUT: `dist/assets/${version}/vendor/`,
                CONCAT: "e6_vendor.js",
                RENAME: "e6_vendor.js"
            },
            mathlive_vendor: {
                IN: [
                    "src/static/lib/mathlive/mathlive.js"
                ],
                OUT: `dist/assets/${version}/vendor/`,
                CONCAT: "e6_mathlive.min.js",
                RENAME: "e6_mathlive.min.js",
                minify: false,
                sourcemap: false
            },
            e6_vendor_css: {
                IN: [
                    "src/static/lib/summernote/0.8.2/summernote.css",
                    "src/static/lib/bootstrap-tour/css/bootstrap-tour-standalone.css",
                    "src/static/lib/mathlive/mathlive-static.css"
                ],
                OUT: `dist/assets/${version}/vendor/`,
                CONCAT: "e6_vendor.css",
                RENAME: "e6_vendor.css",
                FONT_REPLACE: true
            },
            ui: {
                IN: ["src/static/images/**"],
                OUT: `dist/assets/images/`,
                // Gulp 5: keep PNG/ICO/GIF/etc. binary (UTF-8 corrupts signatures)
                BINARY: true,
            },
            releaseNotes: {
                IN: ["src/static/release-notes/*.json"],
                OUT: `dist/assets/${version}/meta/`,
                JSON_MINIFY: true
            },
            workflows: {
                IN: ["src/static/workflows/*.json"],
                OUT: `dist/assets/${version}/meta/`,
                JSON_MINIFY: true
            },
            configschema: {
                IN: ["src/clientconfig/template/*.json"],
                OUT: `dist/assets/${version}/meta/`,
                JSON_MINIFY: true
            }
        };
        // Process each category in MOVEMENT

        const tasks = Object.keys(MOVEMENT).map((key) => {
            const config = MOVEMENT[key];
            return new Promise((resolve, reject) => {
                console.log(`Processing files for ${key}...`);
                let stream = src(config.IN, config.BINARY ? {
                        encoding: false
                    } : undefined)
                    .on('error', (err) => {
                        console.error(`Error while processing ${key}:`, err.message);
                        reject(err);
                    });

                // Apply concatenation if specified
                if (config.CONCAT) {
                    stream = stream.pipe(concat(config.CONCAT));
                }

                // Apply renaming if specified
                if (config.RENAME) {
                    stream = stream.pipe(rename(config.RENAME));
                }
                // console.log(config.OUT)
                // Write the files to the destination folder
                stream = stream
                    .pipe(config.FONT_REPLACE ? replace(/(([font]+\/[summernote]+))/g, "../webfonts/summernote") : noop())
                    .pipe(config.FONT_REPLACE ? replace(/((\.\.\/\.\.\/UI\/fonts))/g, "../webfonts") : noop())
                    .pipe(
                        config.FONT_REPLACE ?
                            replace(/url\((fonts\/KaTeX)/g, "url(../webfonts/KaTeX") :
                            noop()
                    )
                    .pipe(config.JSON_MINIFY ? jsonMinify() : noop())
                    .pipe(dest(config.OUT))
                    .on('end', () => {
                        console.log(`✅ Successfully processed ${key} files.`);
                        resolve();
                    });
            });
        });

        // Execute all tasks
        return Promise.all(tasks)
            .then(() => {
                console.log("✅ All files have been processed successfully!");
                done();
            })
            .catch((err) => {
                console.error("❌ An error occurred during file processing:", err.message);
                // Pass error to Gulp's `done`
                done(err);

            });
    } catch (err) {
        console.warn("❌ Critical error:", err.message);
        // Pass error to Gulp's `done`
        done(err);
    }
};



module.exports = VENDOR_HANDLING;