// File: utils\ckeditor-process.js
const gulp = require('gulp');
const terser = require('gulp-terser');
const rename = require('gulp-rename');
const clean = require('gulp-clean');
const strip = require('gulp-strip-comments');
const removeEmptyLines = require('gulp-remove-empty-lines');
const merge = require('merge-stream');

const CKEDITOR_HANDLING = function (done) {
    try {
        // CKEditor version from global pipeline or default
        const ckeditorVersion = global.PIPELINE.version;

        // Paths
        const paths = {
            src: {
                ckeditor: 'ckeditor/**/*',
                // ,'ckeditor/config1.js'
                configJs: ['ckeditor/config6.js'],
                paraLockPlugin: 'ckeditor/plugins/paraLockSync/plugin.js',
                impact: 'ckeditor/plugins/impact/plugin.js',
                keystroke: 'ckeditor/plugins/keystroke/plugin.js',
                lite: 'ckeditor/plugins/lite/plugin.js',
                mathlive_texzilla: 'ckeditor/plugins/mathlive_texzilla/plugin.js'
            },
            dist: {
                ckeditor: `dist/ckeditor-${ckeditorVersion}/`,
                paraLockPlugin: `dist/ckeditor-${ckeditorVersion}/plugins/paraLockSync/`,
                impact: `dist/ckeditor-${ckeditorVersion}/plugins/impact/`,
                keystroke: `dist/ckeditor-${ckeditorVersion}/plugins/keystroke/`,
                lite: `dist/ckeditor-${ckeditorVersion}/plugins/lite/`,
                mathlive_texzilla: `dist/ckeditor-${ckeditorVersion}/plugins/mathlive_texzilla/`
            },
        };

        // Helper: minify a JS file
        const minifyJs = (srcPath, destPath, renameSuffix = '.min') => {
            return gulp
                .src(srcPath)
                .pipe(strip({ trim: true }))
                .pipe(removeEmptyLines({ removeComments: true }))
                .pipe(gulp.dest(destPath))
                .pipe(terser())
                .pipe(rename({ suffix: renameSuffix }))
                .pipe(gulp.dest(destPath));
        };

        // Clean CKEditor folder
        return gulp
            .src(paths.dist.ckeditor, { allowEmpty: true, read: false })
            .pipe(clean())
            .on('end', () => {
                console.log('✅ Cleaned CKEditor folder.');

                // Copy CKEditor files (encoding: false required for Gulp 5 binary assets: png/gif/fonts)
                gulp.src(paths.src.ckeditor, { encoding: false })
                    .pipe(gulp.dest(paths.dist.ckeditor))
                    .on('end', () => {
                        console.log('✅ Copied CKEditor files.');

                        // Minify JS files in parallel
                        const tasks = merge(
                            minifyJs(paths.src.configJs, paths.dist.ckeditor),
                            minifyJs(paths.src.paraLockPlugin, paths.dist.paraLockPlugin),
                            minifyJs(paths.src.impact, paths.dist.impact),
                            minifyJs(paths.src.keystroke, paths.dist.keystroke)
                        );

                        tasks.on('end', () => {
                            console.log('✅ Minified ckeditor JS files. ✅');
                            done();
                        });
                    });
            })
            .on('error', (err) => {
                console.error('❌ Error during CKEditor handling:', err);
                // Pass error to Gulp
                done(err);
            });
    } catch (err) {
        console.warn('❌ Critical error:', err.message);
        // Pass error to Gulp's `done`
        done(err);
    }
};

module.exports = CKEDITOR_HANDLING;
