// File: utils/gulp/generate-landing-pages.js
// Generates dist/validateurl*.html landing pages for every client from a
// single shared template (snippet/validateurl.html) plus per-client token
// values (src/clientconfig/landing-pages.json).
const fs = require('fs');
const path = require('path');
const htmlmin = require('html-minifier');
const replacePlaceholders = require('./replacePlaceholders');
const { getConfig } = require('../../environments/base.env');
const {
    assertNoUnresolvedPlaceholders,
    loadLandingPageConfig,
    outputFileNameFor,
    renderLandingPageConfig,
    validateRenderedTokens
} = require('./landing-page-config');

const TEMPLATE_PATH = path.resolve(__dirname, '../../snippet/validateurl.html');
const OUTPUT_DIR = path.resolve(__dirname, '../../dist');

const HTMLMIN_OPTIONS = {
    removeComments: true,
    collapseWhitespace: true,
    removeOptionalTags: false,
    removeRedundantAttributes: true
};

function getBuildConfig() {
    if (global.config) {
        return global.config;
    }

    return Object.assign({}, getConfig('local'), { env: 'local' });
}

function generateLandingPages(done) {
    try {
        const baseTemplateContent = fs.readFileSync(TEMPLATE_PATH, 'utf8');
        const configSet = loadLandingPageConfig();
        const clientConfigs = configSet.clients;
        const buildConfig = getBuildConfig();

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });

        Object.keys(clientConfigs).forEach((clientKey) => {
            const mergedConfig = renderLandingPageConfig(clientKey, configSet, buildConfig);
            validateRenderedTokens(clientKey, mergedConfig);

            let outputContent = replacePlaceholders(baseTemplateContent, mergedConfig);
            assertNoUnresolvedPlaceholders(clientKey, outputContent);
            outputContent = htmlmin.minify(outputContent, HTMLMIN_OPTIONS);

            const outPath = path.join(OUTPUT_DIR, outputFileNameFor(clientKey));
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, outputContent, 'utf8');
            console.log(`✅ Landing page generated: ${path.relative(process.cwd(), outPath)}`);
        });

        done();
    } catch (error) {
        console.error('❌ Error generating landing pages:', error);
        done(error);
    }
}

module.exports = generateLandingPages;
