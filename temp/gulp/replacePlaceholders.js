// File: utils/replacePlaceholders.js
const fs = require('fs');
const path = require('path');

// Template map configuration for component snippets
const templateMap = {
    "browser": "snippet/component/browser.html",
    "browser_opera": "snippet/component/browser_opera.html",
    "doi_info": "snippet/component/doi_info.html",
    "doi_info_books": "snippet/component/doi_info_books.html",
    "form_button_group": "snippet/component/form_button_group.html",
    "disc_trans": "snippet/component/disc_trans_accept.html",
    "trans_only": "snippet/component/trans_accept.html",
    "reCaptcha_google": "snippet/component/reCaptcha_google.html",
    "analytics_clarity": "snippet/component/analytics_clarity.html",
    "browser_checker": "snippet/component/browser_checker.html",
    "page_script_landing": "snippet/component/page_script_landing.html",
    "page_script_live": "snippet/component/page_script_live.html",
    "page_script_uat": "snippet/component/page_script_uat.html",
};

function resolveTemplateKey(rawKey, envConfig) {
    const trimmedKey = String(rawKey || '').trim();
    const env = String((envConfig && envConfig.env) || '').toLowerCase();

    if (trimmedKey === 'page_script') {
        return env === 'live' || env === 'prod' ? 'page_script_live' : 'page_script_uat';
    }

    return trimmedKey;
}

function resolvePlaceholderValue(rawKey, envConfig, originalMatch, replaceFn) {
    const trimmedKey = String(rawKey || '').trim();
    const resolvedKey = resolveTemplateKey(trimmedKey, envConfig);
    const configuredTemplateKey = Object.prototype.hasOwnProperty.call(envConfig, trimmedKey)
        ? envConfig[trimmedKey]
        : undefined;

    const templateKey = (typeof configuredTemplateKey === 'string' && Object.prototype.hasOwnProperty.call(templateMap, configuredTemplateKey))
        ? configuredTemplateKey
        : resolvedKey;

    if (Object.prototype.hasOwnProperty.call(templateMap, templateKey)) {
        let templateContent = readTemplateFile(templateMap[templateKey]);
        templateContent = replaceFn(templateContent, envConfig);
        return templateContent;
    }

    if (Object.prototype.hasOwnProperty.call(envConfig, trimmedKey)) {
        return envConfig[trimmedKey];
    }

    if (Object.prototype.hasOwnProperty.call(envConfig, resolvedKey)) {
        return envConfig[resolvedKey];
    }

    const nestedProps = resolvedKey.split('.');
    let value = envConfig;
    for (const prop of nestedProps) {
        value = value && value[prop];
    }

    return value !== undefined ? value : originalMatch;
}

/**
 * Read the content of a template file
 * @param {string} filePath - Relative path to the template file
 * @returns {string} File contents or empty string if error
 */
function readTemplateFile(filePath) {
    try {
        // Resolve from project root (assumed to be 3 levels up from this file)
        const projectRoot = path.resolve(__dirname, '../../');
        return fs.readFileSync(path.resolve(projectRoot, filePath), 'utf8');
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return '';
    }
}

/**
 * Replace placeholders in content with environment config or template content
 * @param {string} content - Original content with placeholders
 * @param {Object} [customEnvConfig] - Optional custom environment configuration
 * @returns {string} Content with placeholders replaced
 */
function replacePlaceholders(content, customEnvConfig) {
    // Use custom config if provided, otherwise load from environment
    const envConfig = customEnvConfig || global.config;


    let processedContent = content.replace(/\$\{\{(.*?)\}\}\$/g, (match, key) =>
        resolvePlaceholderValue(key, envConfig, match, replacePlaceholders)
    );

    processedContent = processedContent.replace(/\{\{(.*?)\}\}/g, (match, key) =>
        resolvePlaceholderValue(key, envConfig, match, replacePlaceholders)
    );

    return processedContent;
}

module.exports = replacePlaceholders;
