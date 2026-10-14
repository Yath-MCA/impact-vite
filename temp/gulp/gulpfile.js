/** 

# Change the version in get from Package.json
    "version": "v5.00.25"

# FIRST TIME
    npx gulp install-all-plugins

# Build with default local environment
    npx gulp

    npx gulp --env uat
    npx gulp --env local

    # Build for specific environment
    npx gulp --env dev
    npx gulp --env prod

    # Generate configuration and build
    npx gulp config --env staging

# Build package & MoveServer
    # it will create zip file and automatically moved into SFTP server
    npm run package 

*/

const gulp = require('gulp');
const del = require('del');
const path = require('path');
const fs = require('fs');
const rename = require('gulp-rename');
const prettyData = require('gulp-pretty-data');
const jshint = require('gulp-jshint');
const through2Module = require('through2');
const through2 = through2Module.default || through2Module.transform || through2Module;
const jsonMinify = require('gulp-json-minify');



// Import configurations and utilities
const {
    generateFrontendConfig,
    getConfig
} = require('./environments/base.env');
const {
    processFiles,
    copyHtmlFiles,
    copyJsonFiles,
    processSingleModuleJS,
    processSingleModuleCSS
} = require('./utils/gulp/file-processing-utility');
const replacePlaceholders = require('./utils/gulp/replacePlaceholders');
const generateLandingPages = require('./utils/gulp/generate-landing-pages');
const VENDOR_HANDLING = require('./utils/gulp/vendor-process');
const generatePipelineConfig = require("./utils/gulp/pipeline");
const {
    ensurePluginsAndRun
} = require("./utils/gulp/ensurePluginsAndRun")

const CKEDITOR_HANDLING = require('./utils/gulp/ckeditor-process')


// Import template bundler
const {
    bundleTemplates,
    validateTemplates,
    buildModuleTemplateBundle
} = require('./utils/gulp/template-bundle');


const {
    convertTsvToJson,
    makeShorthand
} = require('./utils/gulp/journals-abbrviation.js');

function getCurrentEnvironment() {
    const envIndex = process.argv.indexOf('--env');
    return envIndex !== -1 ? process.argv[envIndex + 1] : 'local';
}

const DeploymentTasks = require('./utils/gulp/deploy-tasks');


// Clean tasks
function cleanHtmlFiles() {
    return del(['./*.html', './*.html.map']).then(function() {
        console.log({
            message: 'Clean Done!'
        });
    }).catch(function() {
        console.log({
            message: 'Clean Failed!'
        });
    });
}

function cleanAssets() {
    return del(['assets/**', 'dist/**']).then(function() {
        console.log({
            message: 'Clean Done!'
        });
    }).catch(function() {
        console.log({
            message: 'Clean Failed!'
        });
    });
}

// As a standalone task
function copyHtmlProcess(done) {
    copyHtmlFiles({
        src: './dist/snippet/',
        dest: './',
        items: ["*.html"]
    });
    done();
}

// HTML Template Processing
function processHTMLTemplates(done, config) {
    let {
        input,
        output,
        items
    } = config ? config : global.PIPELINE.main_html
    console.log("processHTMLTemplates");
    return processFiles({
            // src: items.map(file => path.join(input, file)),
            src: input,
            dest: output,
            replacer: replacePlaceholders,
            type: 'html',
            minifyOptions: {
                removeOptionalTags: false,
                removeRedundantAttributes: true
            }
        }).on('end', () => {
            console.log('✅ HTML Templates processed successfully!');
            // Signal task completion
            done();
        })
        .on('error', (err) => {
            console.error('❌ Error processing HTML Templates:', err);
            // Pass error to Gulp
            done(err);
        });
}

// Environment Configuration Task (run only once)
function generateEnvironmentConfig(done) {
    const env = getCurrentEnvironment();
    try {
        generateFrontendConfig(env);
        global.config = getConfig(env);
        global.config.env = env;
        global.PIPELINE = generatePipelineConfig(env, global.config.VERSION);

        // ✅ Write dist/version.txt from pipeline version
        const version = global.PIPELINE.version;

        console.log(`🌍 Environment: ${env}`);
        console.log('📡 API Base URL:', version);
        console.log('🐛 Debug Mode:', global.config.DEBUG);
        done();
    } catch (error) {
        console.error('❌ Error generating environment configuration:', error);
        done(error);
    }
}
// Helper function to validate task parameters
function validateTaskParams(taskName, params, done) {
    const missingParams = [];
    for (const [key, value] of Object.entries(params)) {
        if (!value && value !== false) missingParams.push(key);
    }

    if (missingParams.length > 0) {
        // console.log(params);
        // console.error(`❌ ${taskName} failed: Missing parameters - ${missingParams.join(', ')}`);
        // Mark the task as finished to prevent Gulp from hanging
        done();
        return false;
    }
    return true;
}

gulp.task('deploy', async (done) => {
    const deployer = new DeploymentTasks({
        distPath: 'dist',
        environment: 'UAT',
        zipName: `deploy-latest.zip`,
        version: 'v2.04.08',
    });

    try {
        const result = await deployer.deploy();

        if (result.success) {
            console.log('Deployment Summary:');
            console.log('------------------');
            console.log(`Status: ${result.success ? 'Success' : 'Failed'}`);
            console.log(`Zip File: ${result.zipPath}`);
            console.log(`Duration: ${result.duration}ms`);
            console.log('\nUploaded Files:');
            result.uploadedFiles.forEach(file => {
                if (typeof file === 'object') {
                    console.log(`${file.local} -> ${file.remote}`);
                } else {
                    console.log(file);
                }
            });
        } else {
            console.error('Deployment failed:', result.error);
        }

        done();
        return result;
    } catch (error) {
        console.error('Deployment error:', error);
        done(error);
        throw error;
    }
});
// Dynamic page build tasks (run once for each page)
// Register a static Gulp task for processing pages
gulp.task('process-pages', (done) => {
    const pageTasks = Object.keys(PIPELINE.PAGES).map((pageName) => {
        console.log(`Processing page: ${pageName}`);
        const pageConfig = PIPELINE.PAGES[pageName];
        const {
            COMMON_DEST
        } = PIPELINE;

        if ("lang_js" == pageName) {
            console.log(JSON.stringify(pageConfig));
            console.log(JSON.stringify(pageConfig.JSON_FILES));
        }

        // JS Task with validation
        const jsTask = (done) => {
            const params = {
                src: pageConfig.JS_FILES,
                dest: COMMON_DEST.JS,
                replacer: replacePlaceholders,
                type: 'js',
                bundleName: pageName
            };

            if (!validateTaskParams('jsTask-' + pageName, params, done)) return;

            if (pageConfig.JS_OUT) params.dest = pageConfig.JS_OUT;
            if (pageConfig.JS_RENAME) params.bundleName = pageConfig.JS_RENAME;

            if (/single_module|lang_js/gi.test(pageName)) {
                return processSingleModuleJS(params, done);
            } else return processFiles(params, done);
        };

        // CSS Task with validation
        const cssTask = (done) => {
            const params = {
                src: pageConfig.CSS_FILES,
                dest: COMMON_DEST.CSS,
                replacer: (content) => content,
                type: 'css',
                bundleName: pageName
            };

            if (!validateTaskParams('cssTask-' + pageName, params, done)) return;

            if (/single_module/gi.test(pageName)) {
                params.dest = pageConfig.CSS_OUT;
                return processSingleModuleCSS(params, done);
            } else return processFiles(params, done);
        };

        // XML Task with validation
        const xmlTask = (done) => {

            if ((!pageConfig.XML_FILES || !pageConfig.XML_OUT)) {
                if (/client_config/gi.test(pageName)) {
                    console.log(`❌ Skipping XML task for page: ${pageName} - Missing XML_FILES or XML_OUT configuration.`);
                }
                // console.log("-----" + pageName + "-----");
                return done();
            }

            const params = {
                src: pageConfig.XML_FILES,
                dest: pageConfig.XML_OUT,
                replacer: (content) => content
            };

            console.log(`Processing XML files for page: ${pageName}`);

            return gulp.src(params.src)
                .pipe(prettyData({
                    type: 'minify',
                    preserveComments: false
                }))
                .pipe(gulp.dest(params.dest))
                .on('end', () => {
                    console.log(`✅ XML files processed for page: ${pageName}`);
                    done();
                });
        };
        // XML Task with validation
        const htmlTask = (done) => {
            if ((!pageConfig.HTML_FILES || !pageConfig.HTML_OUT)) {
                return done();
            }
            return processHTMLTemplates(done, {
                input: pageConfig.HTML_FILES,
                output: pageConfig.HTML_OUT
            });
        };

        const jsonTask = (done) => {

            if (!pageConfig.JSON_FILES || pageConfig.JSON_FILES.length === 0 || !pageConfig.JSON_OUT || pageConfig.JSON_OUT.length === 0) {
                return done();
            }
            console.log(`Processing JSON files for page: ${pageName}`);
            return copyJsonFiles({
                src: pageConfig.JSON_FILES,
                dest: pageConfig.JSON_OUT,
                excludeDir: pageConfig.JSON_EXCLUDE_DIR ? true : false
            }, done);
        };

        // Bundle templates task - only runs for single_module page
        const bundleTemplatesTask = (done) => {
            if (pageName !== 'single_module') return done();
            buildModuleTemplateBundle(global.PIPELINE.version)
                .then(() => done())
                .catch(done);
        };

        // Run JS and CSS tasks in parallel for the current page
        return gulp.parallel(jsTask, cssTask, xmlTask, htmlTask, jsonTask, bundleTemplatesTask);
    });


    // gulp.parallel(...pageTasks.flat())(done);
    try {
        gulp.parallel(...pageTasks.flat())(done);
    } catch (error) {
        console.error("❌ Error in process-pages:", error);
        done(error);
    }
});

gulp.task('install-all-plugins', ensurePluginsAndRun);

// Main Tasks
function writeJshintReport() {
    const logFilePath = path.resolve(__dirname, 'logs/jshint-report.log');
    const lines = [
        `JSHint Report - ${new Date().toISOString()}`,
        ''
    ];
    let issueCount = 0;
    let fileCount = 0;

    return through2.obj(function(file, enc, cb) {
        fileCount++;

        if (file.jshint && file.jshint.results && file.jshint.results.length > 0) {
            lines.push(file.relative || file.path);

            file.jshint.results.forEach((result) => {
                const error = result.error || {};
                issueCount++;
                lines.push(`  line ${error.line || 0}, char ${error.character || 0}: ${error.reason || 'Unknown JSHint issue'}${error.code ? ` (${error.code})` : ''}`);
                if (error.evidence) {
                    lines.push(`    ${error.evidence.trim()}`);
                }
            });

            lines.push('');
        }

        cb(null, file);
    }, function(cb) {
        if (issueCount === 0) {
            lines.push(`No JSHint issues found in ${fileCount} file(s).`);
        } else {
            lines.push(`Found ${issueCount} JSHint issue(s) in ${fileCount} checked file(s).`);
        }

        fs.mkdirSync(path.dirname(logFilePath), {
            recursive: true
        });
        fs.writeFileSync(logFilePath, `${lines.join('\n')}\n`, 'utf8');
        console.log(`JSHint report written to ${path.relative(__dirname, logFilePath)} (${issueCount} issue(s)).`);
        cb();
    });
}

gulp.task('lint', () => {
    return gulp.src([
            'gulpfile.js',
            'environments/**/*.js',
            'utils/gulp/**/*.js',
            'src/**/*.js',
            '!node_modules/**',
            '!dist/**',
            '!assets/**',
            '!build/**',
            '!temp/**',
            '!src/static/lib/**'
        ], {
            allowEmpty: true
        })
        .pipe(jshint('.jshintrc'))
        .pipe(writeJshintReport());
});

gulp.task('clean', gulp.series(cleanHtmlFiles, cleanAssets));
gulp.task('replace-html-templates', processHTMLTemplates);
gulp.task('generate-landing-pages', generateLandingPages);
gulp.task('copy-html', copyHtmlProcess);
gulp.task('vendor-process', VENDOR_HANDLING);
gulp.task('copy-ckeditor', CKEDITOR_HANDLING);
gulp.task('version-txt', (done) => {
    try {
        // console.log(global.PIPELINE.version);
        var version = global.PIPELINE.version;

        const versionFilePath = path.resolve(__dirname, 'dist/version.txt');
        fs.mkdirSync(path.dirname(versionFilePath), {
            recursive: true
        });
        fs.writeFileSync(versionFilePath, `${version}`, 'utf8');
        console.log(`✅ dist/version.txt created with version: "${version}"`);
        done();
    } catch (error) {
        console.error('❌ Failed to create dist/version.txt:', error);
        done(error);
    }
});
gulp.task('journals:tsv2json', function() {
    var version = global.PIPELINE.version;
    return gulp.src('src/clientconfig/journals/abbr.json')
        .pipe(through2.obj(function(file, enc, cb) {
            if (file.isNull()) return cb(null, file);

            const contents = file.contents.toString('utf8');
            const json = convertTsvToJson(contents);

            file.contents = Buffer.from(JSON.stringify(json, null, 4), 'utf8');
            file.path = path.join(file.base, path.basename(file.path, path.extname(file.path)) + '.json');

            cb(null, file);
        }))
        .pipe(jsonMinify())
        .pipe(gulp.dest(`dist/assets/${version}/meta/`));
});

// Template bundle task
async function bundleModuleTemplates(done) {
    const version = require('./package.json').version;
    const destDir = path.join('dist', 'assets', version, 'modules');
    const page = global.PIPELINE && global.PIPELINE.PAGES && global.PIPELINE.PAGES.single_module;
    const bundleCfg = (page && page.TEMPLATE_BUNDLE) || {};
    const templateSrc = bundleCfg.SRC || ['src/modules/**/template.html', 'src/shared_modules/**/template.html'];
    const contextSrc = bundleCfg.VALIDATE_CONTEXT || ['src/modules/**/context.js', 'src/shared_modules/**/context.js'];

    // First validate
    const validation = await validateTemplates(contextSrc, templateSrc);

    if (!validation.valid) {
        console.error('❌ Template validation failed. Fix missing templates before building.');
        return done(new Error('Template validation failed'));
    }

    // Then bundle
    await bundleTemplates(templateSrc, destDir, 'templates.html');

    done();
}

gulp.task('bundle-templates', bundleModuleTemplates);

gulp.task('build', gulp.series(
    'lint',
    'clean',
    // 'create_journal_splits',
    'version-txt',
    'replace-html-templates',
    'journals:tsv2json',
    // 'generate-landing-pages',
    'copy-ckeditor',
    'vendor-process',
    'process-pages'
));

// Environment-specific build tasks (run the config task only once before the build)
// Local environment task
gulp.task('local', gulp.series(
    (done) => {
        console.log("Setting environment: local");
        process.env.NODE_ENV = 'local';
        done();
    },
    // Your task to generate environment config
    generateEnvironmentConfig,
    // The build task for local environment
    'build'
));

// Live environment task
gulp.task('live', gulp.series(
    (done) => {
        console.log("Setting environment: live");
        process.env.NODE_ENV = 'live';
        done();
    },
    // Your task to generate environment config
    generateEnvironmentConfig,
    // The build task for live environment
    'build'
));

// UAT (User Acceptance Testing) environment task
gulp.task('uat', gulp.series(
    (done) => {
        console.log("Setting environment: uat");
        process.env.NODE_ENV = 'uat';
        done();
    },
    // Your task to generate environment config
    generateEnvironmentConfig,
    // The build task for uat environment
    'build'
));


// Set default task
gulp.task('default', gulp.series('uat'));

module.exports = gulp;