// File: utils/file-processing-utility.js
const gulp = require('gulp');
const through2Module = require('through2');
const through2 = through2Module.default || through2Module.transform || through2Module;
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const cleanCSS = require('gulp-clean-css');
const htmlmin = require('gulp-htmlmin');
const rename = require('gulp-rename');
const path = require('path');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;
const fs = require('fs');
const sass = require('gulp-sass')(require('sass'));
const strip = require('gulp-strip-comments');
const stripCSSModule = require('gulp-strip-css-comments');
const stripCSS = stripCSSModule.default || stripCSSModule;
const terser = require('gulp-terser');
const removeEmptyLines = require('gulp-remove-empty-lines');
const noop = require('gulp-noop');
const jsonMinify = require('gulp-json-minify');
/**
 * Generic file processing utility
 * @param {Object} options - Processing configuration
 * @param {string[]} options.src - Source file paths
 * @param {string} options.dest - Destination directory
 * @param {Function} options.replacer - Function to replace content
 * @param {string} options.type - File type ('html', 'js', 'css')
 * @param {Object} [options.minifyOptions] - Minification options
 * @param {boolean} [options.sourcemap=true] - Enable sourcemap generation
 * @returns {NodeJS.ReadWriteStream} Gulp stream
 */

/**
 * Strip src/modules/ roots so module files emit as {moduleName}/...
 */
function stripModuleSourceRoot(relPath) {
    return String(relPath || '')
        .replace(/\\/g, '/')
        .replace(/^(?:\.\/)?src\/modules\/shared\//, '')
        .replace(/^(?:\.\/)?src\/(?:shared_)?modules\//, '')
        .replace(/^(?:standalone|shared|_wip)\//, '');
}

function renameStripModuleSourceRoot(filePath) {
    const dir = (filePath.dirname || '').replace(/\\/g, '/');
    const stripped = stripModuleSourceRoot(dir);
    if (stripped !== dir) {
        filePath.dirname = stripped;
    }
}

function replaceFileContents(replacer) {
    return through2.obj((file, _, cb) => {
        if (file.isBuffer()) {
            try {
                const content = file.contents.toString();
                file.contents = Buffer.from(replacer(content));
            } catch (err) {
                console.error(`❌ File processing error: ${file.path}`, err);
            }
        }
        cb(null, file);
    });
}

function passthrough() {
    return through2.obj();
}

// JS Task: Process JS files and flatten directory structure
function processSingleModuleJS({
    src,
    dest,
    replacer,
    type,
    bundleName
}, done) {


    if (!src || src.length === 0) {

        console.log("❌ No JS files configured for single_module.");
        return done();
    }

    // Preserve module folder structure under dest (e.g. qc_validation/*.js next to index.js).
    // Use repo root as base, then strip src/modules or src/modules/shared so both land as {name}/...
    // lang_js also uses this helper — only apply module-root normalize for single_module.
    const srcOptions = (bundleName === 'single_module') ? {
        base: '.'
    } : {};

    return gulp.src(src, srcOptions)
        .pipe(replaceFileContents(replacer))
        .pipe(bundleName === 'single_module' ? rename(renameStripModuleSourceRoot) : noop())
        .pipe(strip({
            trim: true
        }))
        .pipe(removeEmptyLines({
            removeComments: true
        }))
        // Destination without folder structure
        .pipe(gulp.dest(dest))
        .pipe(sourcemaps.init())
        .pipe(terser({
            format: {
                keep_quoted_props: true
            }
        }))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(sourcemaps.write('./', {
            includeContent: false
        }))
        .pipe(gulp.dest(dest, {
            mode: '0755',
            overwrite: true
        }))
        .pipe(through2.obj((file, _, cb) => {
            // console.log(`✅ JS Processed: ${path.basename(file.path)}`);
            cb(null, file);
        }))
        .on('end', () => {
            console.log("✅ JS Files processed successfully!");
            done();
        });
}

// CSS Task: Process CSS files and flatten directory structure
function processSingleModuleCSS({
    src,
    dest,
    replacer,
    type,
    bundleName
}, done) {

    if (!src || src.length === 0) {
        console.log("❌ No CSS files configured for single_module.");
        return done();
    }

    // Support flattening for src patterns that are objects with flatten: true
    let flatGlobs = [];
    src.forEach(pattern => {
        if (typeof pattern === 'string') {
            flatGlobs.push(pattern);
        } else if (pattern && pattern.pattern && pattern.flatten) {
            // Convert to flat glob (no folders in output)
            const glob = require('glob');
            const matches = glob.sync(pattern.pattern);
            matches.forEach(match => flatGlobs.push(match));
        }
    });

    return gulp.src(flatGlobs, {
            base: '.'
        })
        .pipe((sass.sync({
            silenceDeprecations: ['legacy-js-api', 'import']
        }).on('error', sass.logError)))
        .pipe(stripCSS())
        .pipe(cleanCSS({
            debug: true,
            rebase: false
        }))
        .pipe(rename(path => {
            // Flatten output: only file name, no folders
            path.dirname = '';
        }))
        .pipe(gulp.dest(dest))
        .on('end', () => {
            console.log("✅ CSS Files processed successfully!");
            done();
        });
}

function copyHtmlFiles({
    src,
    dest,
    items
}) {
    // Normalize paths
    const inputPath = path.resolve(src);
    const destPath = path.resolve(dest);
    console.log(inputPath, destPath);

    // Ensure destination directory exists
    if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, {
            recursive: true
        });
    }

    // Prepare file patterns
    const patterns = items.length > 0 ?
        items.map(item => path.join(inputPath, item)) : [path.join(inputPath, '**', '*.html')];

    // Copy and process files
    return patterns.map(pattern => {
        // Find matching files
        const matchedFiles = require('glob').sync(pattern);

        return matchedFiles.map(sourcePath => {
            const filename = path.basename(sourcePath);
            const destFilePath = path.join(destPath, filename);

            try {
                // Copy file
                fs.copyFileSync(sourcePath, destFilePath);

                // Log successful copy
                console.log(chalk.green('✅ HTML Copied:'));
                // console.log(chalk.blue('  Source:      ') + chalk.white(path.relative(process.cwd(), sourcePath)));
                // console.log(chalk.blue('  Destination: ') + chalk.white(path.relative(process.cwd(), destFilePath)));

                return destFilePath;
            } catch (err) {
                console.error(chalk.red('❌ Copy Failed:'), err);
                return null;
            }
        }).filter(Boolean);
    }).flat();
}

function copyJsonFiles({
    src,
    dest,
    items = [],
    excludeDir = false
}, done) {
    if ((!src && items.length === 0) || !dest) {
        if (typeof done === 'function') done();
        return null;
    }

    const patterns = items.length > 0 ? items.map(item => path.join(src, item)) : Array.isArray(src) ? src : [src];

    console.log(excludeDir ? dest : '...');
    // Use repo root as base so shared and standalone modules can both strip to {moduleName}/...
    const needsModuleStrip = patterns.some((p) => /src\/(?:shared_)?modules\//.test(String(p).replace(/\\/g, '/')));

    return gulp.src(patterns, {
            allowEmpty: true,
            base: needsModuleStrip && !excludeDir ? '.' : undefined
        })
        .pipe(jsonMinify())
        .pipe(excludeDir ? rename((filePath) => {
            filePath.dirname = '';
        }) : (needsModuleStrip ? rename(renameStripModuleSourceRoot) : passthrough()))
        .pipe(gulp.dest(dest))
        .on('end', () => {
            console.log('✅ JSON Files copied successfully!');
            if (typeof done === 'function') done();
        })
        .on('error', (err) => {
            console.error('❌ Error copying JSON files:', err);
            if (typeof done === 'function') done(err);
        });
}


function processFiles({
    src,
    dest,
    replacer,
    type = 'html',
    minifyOptions = {},
    sourcemap = true,
    bundleName = 'bundle'
}) {

    // Validate input   
    if (!src || !dest || !replacer) {
        const missing = [];
        if (!src) missing.push('src');
        if (!dest) missing.push('dest');
        if (!replacer) missing.push('replacer');

        console.error('❌ processFiles() called with missing parameters:', {
            src,
            dest,
            replacerExists: !!replacer,
            type,
            bundleName
        });

        throw new Error(`Missing required parameter(s): ${missing.join(', ')}`);
    }
    if (src.length == 0) return Promise.resolve();

    const srcList = Array.isArray(src) ? src : [src];
    const needsModuleStrip = type === 'html' && srcList.some((p) => /src\/(?:shared_)?modules\//.test(String(p).replace(/\\/g, '/')));

    // File processing stream
    const processingStream = gulp.src(src, needsModuleStrip ? {
            base: '.'
        } : {})
        .pipe(replaceFileContents(replacer));

    // Add sourcemaps initialization if enabled
    let sourcemapStream = sourcemap ?
        processingStream.pipe(sourcemaps.init()) :
        processingStream;

    if (needsModuleStrip) {
        sourcemapStream = sourcemapStream.pipe(rename(renameStripModuleSourceRoot));
    }


    // Type-specific processing
    switch (type) {
        case 'html':
            return sourcemapStream
                .pipe(htmlmin({
                    removeComments: true,
                    collapseWhitespace: true,
                    removeOptionalTags: false,
                    ...minifyOptions
                }))
                // .pipe(sourcemap ? sourcemaps.write('.') : through2.obj())
                .pipe(gulp.dest(dest, {}))
                .pipe(through2.obj((file, _, cb) => {
                    // console.log(`✅ HTML Processed: ${path.basename(file.path)}`);
                    cb(null, file);
                }));

            // Similar modifications for JS and CSS cases
        case 'js':

            return sourcemapStream
                .pipe(strip({
                    trim: true
                }))
                .pipe(removeEmptyLines({
                    removeComments: true
                }))
                .pipe(concat(`${bundleName}.js`))
                // .pipe(gulp.dest(dest))
                .pipe(gulp.dest(dest, {
                    mode: '0755',
                    overwrite: true
                }))
                .pipe(sourcemap ? sourcemaps.init() : noop())
                .pipe(terser({
                    format: {
                        keep_quoted_props: true
                    }
                }))
                .pipe(rename({
                    suffix: '.min'
                }))
                .pipe(sourcemap ? sourcemaps.write('./', {
                    includeContent: false
                }) : noop())
                .pipe(gulp.dest(dest, {
                    mode: '0755',
                    overwrite: true
                }))
                .pipe(through2.obj((file, _, cb) => {
                    // console.log(`✅ JS Processed: ${path.basename(file.path)}`);
                    cb(null, file);
                }))
                .on('end', () => {
                    // console.log("✅ JS Files processed successfully!");                    
                });

        case 'css':
            return sourcemapStream
                .pipe((sass.sync({
                    silenceDeprecations: ['legacy-js-api']
                }).on('error', sass.logError)))
                .pipe(stripCSS())
                .pipe(cleanCSS({
                    debug: true,
                    rebase: false,
                    level: {
                        1: {
                            specialComments: 0
                        }
                    },
                    ...minifyOptions
                }))
                .pipe(removeEmptyLines({
                    removeComments: true
                }))
                .pipe(sourcemap ? sourcemaps.init() : noop())
                .pipe(concat(`${bundleName}.css`))
                .pipe(gulp.dest(dest, {
                    mode: '0755',
                    overwrite: true
                    // Unminified version
                }))
                .pipe(rename({
                    suffix: '.min'
                }))
                .pipe(sourcemap ? sourcemaps.write(`./`) : noop())
                .pipe(gulp.dest(dest, {
                    mode: '0755',
                    overwrite: true
                }))
                .pipe(through2.obj((file, _, cb) => {
                    // console.log(`✅ CSS Processed: ${path.basename(file.path)}`);
                    cb(null, file);
                }))
                .on('end', () => {
                    // console.log(`✅ CSS Processed successfully`);
                });
    }
}

module.exports = {
    processFiles,
    copyHtmlFiles,
    copyJsonFiles,
    processSingleModuleCSS,
    processSingleModuleJS,
    stripModuleSourceRoot
};