const gulp = require('gulp');
const through2 = require('through2');
const path = require('path');
const glob = require('glob');

const DEFAULT_TEMPLATE_SRC = ['src/modules/**/template.html', 'src/modules/shared/**/template.html'];
const DEFAULT_CONTEXT_SRC = ['src/modules/**/context.js', 'src/modules/shared/**/context.js'];

function normalizeGlobPath(filePath) {
    return String(filePath).replace(/\\/g, '/');
}

/**
 * Normalize path: src/modules/standalone/figures/template.html -> ./figures/template.html
 * Also strips src/modules/shared/ and src/modules/_wip/ the same way.
 */
function normalizeTemplatePath(filePath) {
    return './' + String(filePath)
        .replace(/\\/g, '/')
        .replace(/^.*?src\/(?:shared_)?modules\//, '')
        .replace(/^(?:standalone|shared|_wip)\//, '')
        .replace(/^\.\//, '');
}

function resolveGlobList(patterns) {
    const list = [].concat(patterns || []).filter(Boolean);
    if (list.length === 0) return [];

    const includeFiles = [];
    const excludeFiles = new Set();

    list.forEach((pattern) => {
        if (typeof pattern !== 'string') return;

        if (pattern.startsWith('!')) {
            glob.sync(pattern.slice(1)).forEach((file) => {
                excludeFiles.add(normalizeGlobPath(file));
            });
            return;
        }

        glob.sync(pattern).forEach((file) => {
            includeFiles.push(file);
        });
    });

    const seen = new Set();
    return includeFiles.filter((file) => {
        const normalized = normalizeGlobPath(file);
        if (excludeFiles.has(normalized) || seen.has(normalized)) {
            return false;
        }
        seen.add(normalized);
        return true;
    });
}

/**
 * Bundle all module templates into a single HTML file
 * Each template wrapped in <template data-template-path="..."> for runtime lookup
 */
function bundleTemplates(srcPattern, destDir, destFile = 'templates.html') {
    return new Promise((resolve, reject) => {
        const templateMap = new Map();

        // Find all template files (supports string or array of globs)
        const files = resolveGlobList(srcPattern);

        if (files.length === 0) {
            console.warn(`⚠️ No template files found for pattern: ${srcPattern}`);
            // Create empty bundle
            const emptyBundle = `<!-- Template Bundle: Empty -->\n`;
            require('fs').writeFileSync(path.join(destDir, destFile), emptyBundle);
            return resolve({
                count: 0,
                files: []
            });
        }

        files.forEach(filePath => {
            const content = require('fs').readFileSync(filePath, 'utf-8');
            const normalizedPath = normalizeTemplatePath(filePath);
            templateMap.set(normalizedPath, content);
        });

        // Build bundle HTML
        let bundleHTML = `<!-- Module Template Bundle - Auto-generated -->\n`;
        bundleHTML += `<!-- Generated: ${new Date().toISOString()} -->\n`;
        bundleHTML += `<!-- Templates: ${templateMap.size} -->\n\n`;

        templateMap.forEach((content, templatePath) => {
            bundleHTML += `<template data-template-path="${templatePath}">\n`;
            bundleHTML += content;
            bundleHTML += `\n</template>\n\n`;
        });

        // Write bundle
        if (!require('fs').existsSync(destDir)) {
            require('fs').mkdirSync(destDir, {
                recursive: true
            });
        }

        require('fs').writeFileSync(path.join(destDir, destFile), bundleHTML);

        console.log(`✅ Template bundle created: ${destFile} (${templateMap.size} templates)`);
        resolve({
            count: templateMap.size,
            files: Array.from(templateMap.keys())
        });
    });
}

/**
 * Validate that all registered template paths have corresponding source templates
 */
async function validateTemplates(contextFilesPattern, templateFilesPattern) {
    const contextFiles = resolveGlobList(contextFilesPattern);
    const templateFiles = resolveGlobList(templateFilesPattern);

    // Extract template paths from context.js files
    const registeredPaths = new Set();
    contextFiles.forEach(file => {
        const content = require('fs').readFileSync(file, 'utf-8');
        // Match templatePath: './xxx/template.html' or templatePath: "./xxx/template.html"
        const matches = content.match(/templatePath:\s*['"]([^'"]+)['"]/g);
        if (matches) {
            matches.forEach(match => {
                const path = match.replace(/templatePath:\s*['"]/, '').replace(/['"]$/, '');
                if (path && path !== '') {
                    // Normalize ./ prefix
                    registeredPaths.add(path.replace(/^\.\//, ''));
                }
            });
        }
    });

    // Extract available template paths
    const availablePaths = new Set();
    templateFiles.forEach(file => {
        const normalized = normalizeTemplatePath(file).replace(/^\.\//, '');
        availablePaths.add(normalized);
    });

    // Check for mismatches
    const missingTemplates = [];
    registeredPaths.forEach(path => {
        if (!availablePaths.has(path)) {
            missingTemplates.push(path);
        }
    });

    const unregisteredTemplates = [];
    availablePaths.forEach(path => {
        if (!registeredPaths.has(path)) {
            unregisteredTemplates.push(path);
        }
    });

    if (missingTemplates.length > 0) {
        console.error('❌ ERROR: Registered templatePaths missing source files:');
        missingTemplates.forEach(p => console.error(`   - ${p}`));
    }

    if (unregisteredTemplates.length > 0) {
        console.warn('⚠️ WARNING: Template files not registered in any context.js:');
        unregisteredTemplates.forEach(p => console.warn(`   - ${p}`));
    }

    console.log(`✅ Template validation: ${registeredPaths.size} registered, ${availablePaths.size} available`);

    return {
        registered: Array.from(registeredPaths),
        available: Array.from(availablePaths),
        missing: missingTemplates,
        unregistered: unregisteredTemplates,
        valid: missingTemplates.length === 0
    };
}

function getTemplateBundleConfig() {
    const page = global.PIPELINE && global.PIPELINE.PAGES && global.PIPELINE.PAGES.single_module;
    const bundle = page && page.TEMPLATE_BUNDLE;
    return {
        src: (bundle && bundle.SRC) || DEFAULT_TEMPLATE_SRC,
        validateContext: (bundle && bundle.VALIDATE_CONTEXT) || DEFAULT_CONTEXT_SRC,
    };
}

/**
 * Build the module template bundle for a specific version
 * @param {string} version - The version string for the dist path
 * @returns {Promise<{count: number, files: string[]}>}
 */
async function buildModuleTemplateBundle(version) {
    const destDir = path.join('dist', 'assets', version, 'modules');
    const {
        src,
        validateContext
    } = getTemplateBundleConfig();

    const validation = await validateTemplates(validateContext, src);

    if (!validation.valid) {
        throw new Error('Template validation failed: some registered templatePaths are missing source files');
    }

    return bundleTemplates(src, destDir, 'templates.html');
}

module.exports = {
    bundleTemplates,
    validateTemplates,
    buildModuleTemplateBundle,
    normalizeTemplatePath,
    resolveGlobList
};