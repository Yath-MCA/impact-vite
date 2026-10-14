const fs = require('fs');
const path = require('path');

const DEFAULT_CLIENT_KEYS = [
    'default',
    'acs',
    'brill',
    'intellect',
    'lse',
    'lww',
    'medknow',
    'nihr',
    'oho',
    'oso',
    'oup',
    'oxmedo',
    'plos',
    'tnf',
    'tnfjournals'
];

const DEFAULT_CONFIG_DIR = path.resolve(__dirname, '../../src/clientconfig/landing-pages');
const DEFAULT_FAVICON_PATHS = {
    Newgen: 'assets/images/logo/Newgen.svg'
};

const DEFAULT_NAVBAR_THEMES = {
    white: {
        class: 'bt-border-color',
        icon_variant: 'dark',
        icon_size: '18',
        image_class: 'menu-icon mr-2',
        text_class: 'fw-600',
        faq_title: 'Frequently Asked Questions',
        guide_title: 'User Guide'
    },
    'dark-blue': {
        class: 'navbar-dark bg-blue',
        icon_variant: 'white',
        icon_size: '24',
        image_class: 'menu-icon mr-1',
        text_class: 'fw-600 text-light',
        faq_title: 'Click to download the FAQs',
        guide_title: 'Click to download the User Guide'
    },
    'crimson-red': {
        class: 'bg-crimson-red',
        icon_variant: 'white',
        icon_size: '18',
        image_class: 'menu-icon mr-1',
        guide_image_class: 'menu-icon icon-ug',
        text_class: 'text-light',
        faq_title: 'Click to download the FAQs',
        guide_title: 'Click to download the User Guide'
    }
};

const DEFAULT_CONFIG = {
    pageTitle: 'IMPACT - Landing Page',
    htmlTranslate: true,
    brand: {
        favicon: 'assets/images/logo/Newgen.svg',
        logo: {
            src: 'assets/images/svg/logo/IMPACT_5_4.svg',
            alt: 'IMPACT Logo',
            height: '30',
            width: '150'
        },
        homeHref: '',
        homeAttrs: {}
    },
    navbar: {
        className: 'bt-border-color',
        linksVariant: 'dark'
    },
    layout: {
        contentContainerClass: '',
        cardColClass: 'col-sm-12 col-md-6 col-lg-6',
        doiColClass: 'col-sm-12 col-md-6 col-lg-6'
    },
    welcome: '<span class="impact-title">IMPACT</span> an Online Proofing System',
    doiComponent: 'doi_info',
    footer: {
        rowClass: 'text-light bg-blue',
        containerClass: 'container',
        logoHtml: '<a class="navbar-brand" href="" target="_blank">\n                            <!-- <img src="assets/images/svg/landing/nihr-logo-white.svg" height="50" /> -->\n                        </a>',
        browserComponent: 'browser'
    },
    extraHead: '',
    extraHeadScript: '',
    instructionsHtml: '<ul class="list-group mb-4"></ul>',
    disclaimerHtml: '<p class="card-text"></p>',
    extraContentHtml: ''
};

function outputFileNameFor(clientKey) {
    return clientKey === 'default' ? 'validateurl.html' : `validateurl${clientKey}.html`;
}

function readJsonFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        throw new Error(`Unable to read landing page config ${filePath}: ${error.message}`);
    }
}

function loadLandingPageConfig(baseDir) {
    const configDir = baseDir || DEFAULT_CONFIG_DIR;

    return {
        common: readJsonFile(path.join(configDir, 'common.json')),
        sections: readJsonFile(path.join(configDir, 'sections.json')),
        clients: readJsonFile(path.join(configDir, 'clients.json'))
    };
}

function getClientEntries(rawConfig) {
    if (rawConfig && rawConfig.clients && typeof rawConfig.clients === 'object') {
        return rawConfig.clients;
    }

    return rawConfig || {};
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function attrsToString(attrs) {
    return Object.keys(attrs || {}).map((key) => {
        const value = attrs[key];
        if (value === true || value === '') {
            return ` ${escapeHtml(key)}`;
        }
        return ` ${escapeHtml(key)}="${escapeHtml(value)}"`;
    }).join('');
}

function fileExists(relativePath) {
    return fs.existsSync(path.resolve(__dirname, '../..', relativePath));
}

function resolveFaviconPath(value) {
    const favicon = String(value || '').trim();

    if (!favicon) {
        return '';
    }
    if (favicon.indexOf('/') !== -1 || favicon.indexOf('\\') !== -1) {
        return favicon;
    }
    if (Object.prototype.hasOwnProperty.call(DEFAULT_FAVICON_PATHS, favicon)) {
        return DEFAULT_FAVICON_PATHS[favicon];
    }
    if (/\.(ico|png|svg)$/i.test(favicon)) {
        return `assets/images/client_logo/${favicon}`;
    }

    const candidates = [
        `assets/images/client_logo/${favicon}_FAVICON.ico`,
        `assets/images/client_logo/${favicon}_FAVICON.svg`,
        `assets/images/client_logo/${favicon}_FAVICON.png`,
        `assets/images/logo/${favicon}_FAVICON.ico`,
        `assets/images/logo/${favicon}_FAVICON.svg`,
        `assets/images/logo/${favicon}.svg`
    ];

    return candidates.find(fileExists) || candidates[0];
}

function resolveAssetPath(value) {
    const assetPath = String(value || '').trim();

    if (!assetPath) {
        return '';
    }
    if (assetPath.indexOf('/') !== -1 || assetPath.indexOf('\\') !== -1) {
        return assetPath;
    }
    return `assets/images/client_logo/${assetPath}`;
}

function resolveNamedValue(value, preferredKey) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return value;
    }

    if (preferredKey && Object.prototype.hasOwnProperty.call(value, preferredKey)) {
        return value[preferredKey];
    }
    if (Object.prototype.hasOwnProperty.call(value, 'default')) {
        return value.default;
    }
    if (Object.prototype.hasOwnProperty.call(value, 'defualt')) {
        return value.defualt;
    }

    return '';
}

function mergeConfig(base, override) {
    const result = Object.assign({}, base, override);
    result.brand = Object.assign({}, base.brand, override.brand);
    result.brand.logo = Object.assign({}, base.brand.logo, override.brand && override.brand.logo);
    result.brand.homeAttrs = Object.assign({}, base.brand.homeAttrs, override.brand && override.brand.homeAttrs);
    result.navbar = Object.assign({}, base.navbar, override.navbar);
    result.layout = Object.assign({}, base.layout, override.layout);
    result.footer = Object.assign({}, base.footer, override.footer);
    return result;
}

function requireSection(clientKey, configSet, fieldName, sectionKey) {
    const section = configSet.sections && configSet.sections[sectionKey];
    if (!section) {
        throw new Error(`landing-pages[${clientKey}].${fieldName} unknown section: ${sectionKey}`);
    }
    return section;
}

function getNavbarThemes(configSet) {
    return Object.assign({}, DEFAULT_NAVBAR_THEMES, configSet.sections && configSet.sections.navbar_themes);
}

function themeKeyFromClass(className) {
    const classValue = String(className || '');

    if (classValue.indexOf('bg-crimson-red') !== -1) {
        return 'crimson-red';
    }
    if (classValue.indexOf('bg-blue') !== -1 || classValue.indexOf('navbar-dark') !== -1) {
        return 'dark-blue';
    }
    return 'white';
}

function resolveNavbarTheme(clientKey, configSet, themeKey) {
    const themes = getNavbarThemes(configSet);
    const resolvedKey = themeKey || 'white';
    const theme = themes[resolvedKey];

    if (!theme) {
        throw new Error(`landing-pages[${clientKey}].navbar.theme unknown theme: ${resolvedKey}`);
    }

    return theme;
}

function applyNavbarDownloadTokens(tokens, theme) {
    const iconVariant = theme.icon_variant === 'white' ? 'white' : 'dark';
    const iconSuffix = iconVariant === 'white' ? '_white' : '_dark';
    const iconSize = theme.icon_size || (iconVariant === 'white' ? '24' : '18');

    tokens.textStyle = String(theme.text_class || '').trim();
    tokens.faq_src = `assets/images/svg/landing/FAQ${iconSuffix}.svg`;
    tokens.faq_height = theme.faq_height || iconSize;
    tokens.faq_width = theme.faq_width || iconSize;
    tokens.user_guide_src = `assets/images/svg/landing/UserGuide${iconSuffix}.svg`;
    tokens.user_guide_height = theme.user_guide_height || iconSize;
    tokens.user_guide_width = theme.user_guide_width || iconSize;
}

function applyNavbarObject(clientKey, configSet, tokens) {
    const navbar = tokens.navbar || tokens.header_navbar;
    const isClientNavbarObject = Boolean(tokens.navbar);

    if (!navbar || typeof navbar !== 'object' || Array.isArray(navbar)) {
        return;
    }

    const theme = resolveNavbarTheme(clientKey, configSet, navbar.theme || themeKeyFromClass(tokens.navbar_class || navbar.class));
    applyNavbarDownloadTokens(tokens, theme);
    tokens.navbar_class = isClientNavbarObject ? (navbar.class || theme.class || tokens.navbar_class) : (tokens.navbar_class || navbar.class || theme.class);
    tokens.navbar_href = isClientNavbarObject ? (navbar.href || tokens.navbar_href || '') : (tokens.navbar_href || navbar.href || '');
    tokens.navbar_href_attrs = attrsToString(navbar.href_attrs || {});
    tokens.navbar_logo_src = resolveAssetPath(isClientNavbarObject ? (navbar.logo_src || navbar.logo || tokens.navbar_logo_src) : (tokens.navbar_logo_src || navbar.logo_src || navbar.logo));
    tokens.navbar_logo_alt = isClientNavbarObject ? (navbar.logo_alt || tokens.navbar_logo_alt || '') : (tokens.navbar_logo_alt || navbar.logo_alt || '');
    tokens.navbar_logo_height = isClientNavbarObject ? (navbar.logo_height || tokens.navbar_logo_height || '') : (tokens.navbar_logo_height || navbar.logo_height || '');
    tokens.navbar_logo_width = isClientNavbarObject ? (navbar.logo_width || tokens.navbar_logo_width || '') : (tokens.navbar_logo_width || navbar.logo_width || '');

    if (navbar.section) {
        tokens.navbar_section = navbar.section;
    } else if (navbar.links) {
        tokens.navbar_links = navbar.links;
    } else {
        tokens.navbar_links = renderNavbarLinks(Object.assign({ type: 'navbar' }, theme));
    }
}

function applyFooterObject(clientKey, configSet, tokens) {
    const footer = tokens.footer;

    if (!footer || typeof footer !== 'object' || Array.isArray(footer)) {
        return;
    }

    tokens.footer_row_class = footer.row_class || footer.rowClass || tokens.footer_row_class;
    tokens.footer_container_class = footer.container_class || footer.class || footer.containerClass || tokens.footer_container_class;
    tokens.browser = footer.browser || tokens.browser;

    if (footer.logo_section) {
        tokens.footer_logo_section = footer.logo_section;
        return;
    }

    if (footer.logo) {
        tokens.footer_logo = footer.logo;
        return;
    }

    if (footer.logo_src) {
        const href = footer.href || '';
        const attrs = attrsToString(footer.href_attrs || { rel: 'noopener', target: '_blank' });
        const width = footer.logo_width ? ` width="${escapeHtml(footer.logo_width)}"` : '';
        const height = footer.logo_height ? ` height="${escapeHtml(footer.logo_height)}"` : '';
        tokens.footer_logo = `<a class="navbar-brand" href="${escapeHtml(href)}"${attrs}><img alt="${escapeHtml(footer.logo_alt || '')}" src="${escapeHtml(resolveAssetPath(footer.logo_src))}"${height}${width} /></a>`;
    }
}

function renderNavbarLinks(sectionOrConfig) {
    const section = sectionOrConfig.type === 'navbar' ? sectionOrConfig : null;
    const navbar = sectionOrConfig.navbar || {};
    const iconVariant = section ? section.icon_variant : navbar.linksVariant;
    const iconSuffix = iconVariant === 'white' ? '_white' : '_dark';
    const textClass = String(section ? (section.text_class || '') : (iconVariant === 'white' ? 'text-light' : '')).trim();
    const navLinkClass = ['nav-link', textClass].filter(Boolean).join(' ');
    const iconSize = section && section.icon_size ? section.icon_size : (iconVariant === 'white' ? '24' : '18');
    const faqTitle = section && section.faq_title ? section.faq_title : 'Frequently Asked Questions';
    const guideTitle = section && section.guide_title ? section.guide_title : 'User Guide';
    const faqImgClass = section && section.image_class ? section.image_class : 'menu-icon mr-2';
    const guideImgClass = section && section.guide_image_class ? section.guide_image_class : faqImgClass;

    return `<ul class="navbar-nav mb-2 mb-lg-0">
                    <li class="nav-item mr-4" id="FAQ_UI" title="${escapeHtml(faqTitle)}">
                        <a class="${escapeHtml(navLinkClass)}" href="javascript:iDownloadMethod.click('Help_FAQ_pdf', 'landing')"><img class="${escapeHtml(faqImgClass)}" src="assets/images/svg/landing/FAQ${iconSuffix}.svg" height="${escapeHtml(iconSize)}" width="${escapeHtml(iconSize)}" alt="FAQs">FAQs</a>
                    </li>
                    <li class="nav-item" title="${escapeHtml(guideTitle)}" id="User_Guide_UI">
                        <a class="${escapeHtml(navLinkClass)}" aria-current="page" href="javascript:iDownloadMethod.click('Help_Guide_pdf', 'landing')"><img class="${escapeHtml(guideImgClass)}" src="assets/images/svg/landing/UserGuide${iconSuffix}.svg" height="${escapeHtml(iconSize)}" width="${escapeHtml(iconSize)}" alt="User Guide" style="margin-top: -5px;">User Guide</a>
                    </li>
                </ul>`;
}

function renderInline(item) {
    if (typeof item === 'string') {
        return escapeHtml(item);
    }
    if (Object.prototype.hasOwnProperty.call(item, 'html')) {
        return item.html;
    }
    return escapeHtml(item.text || '');
}

function renderListBlock(block) {
    const tagName = block.ordered ? 'ol' : 'ul';
    const className = block.class_name || 'list-group mb-4';
    const items = (block.items || []).map((item) =>
        `<li class="list-item">${renderInline(item)}</li>`
    ).join('');

    return `<${tagName} class="${escapeHtml(className)}">${items}</${tagName}>`;
}

function renderContentSection(section) {
    if (section.html) {
        return section.html;
    }

    return (section.blocks || []).map((block) => {
        if (block.type === 'list') {
            return renderListBlock(block);
        }
        if (block.type === 'heading') {
            const level = block.level || 4;
            return `<h${level} class="${escapeHtml(block.class_name || 'blue-text font-18px fw-600')}">${renderInline(block)}</h${level}>`;
        }
        if (block.type === 'html') {
            return block.html || '';
        }
        throw new Error(`unknown content block type: ${block.type}`);
    }).join('\n');
}

function renderDisclaimer(section) {
    if (section.html) {
        return section.html;
    }

    return (section.paragraphs || []).map((paragraph) =>
        `<p class="card-text">${renderInline(paragraph)}</p>`
    ).join('\n');
}

function renderExtraSection(section) {
    if (section.type === 'html') {
        return section.html || '';
    }
    if (section.type === 'component') {
        return '${{' + section.component + '}}$';
    }
    if (section.type === 'content') {
        return renderContentSection(section);
    }
    throw new Error(`unknown extra section type: ${section.type}`);
}

function normalizeCommon(common) {
    if (common && Object.prototype.hasOwnProperty.call(common, 'page_title')) {
        return common;
    }

    return {
        page_title: DEFAULT_CONFIG.pageTitle,
        html_translate_attr: DEFAULT_CONFIG.htmlTranslate ? 'translate="no"' : '',
        client_favicon: DEFAULT_CONFIG.brand.favicon,
        extra_head: DEFAULT_CONFIG.extraHead,
        extra_head_script: DEFAULT_CONFIG.extraHeadScript,
        navbar_class: DEFAULT_CONFIG.navbar.className,
        navbar_href: DEFAULT_CONFIG.brand.homeHref,
        navbar_href_attrs: attrsToString(DEFAULT_CONFIG.brand.homeAttrs),
        navbar_logo_src: DEFAULT_CONFIG.brand.logo.src,
        navbar_logo_alt: DEFAULT_CONFIG.brand.logo.alt,
        navbar_logo_height: DEFAULT_CONFIG.brand.logo.height,
        navbar_logo_width: DEFAULT_CONFIG.brand.logo.width || '',
        content_container_class: DEFAULT_CONFIG.layout.contentContainerClass,
        welcome_heading: DEFAULT_CONFIG.welcome,
        card_col_class: DEFAULT_CONFIG.layout.cardColClass,
        doi_col_class: DEFAULT_CONFIG.layout.doiColClass,
        instructions_body: DEFAULT_CONFIG.instructionsHtml,
        disclaimer_body: DEFAULT_CONFIG.disclaimerHtml,
        extra_content: DEFAULT_CONFIG.extraContentHtml,
        doi_component: DEFAULT_CONFIG.doiComponent,
        footer_row_class: DEFAULT_CONFIG.footer.rowClass,
        footer_container_class: DEFAULT_CONFIG.footer.containerClass,
        footer_logo: DEFAULT_CONFIG.footer.logoHtml,
        browser: DEFAULT_CONFIG.footer.browserComponent
    };
}

function renderLandingPageConfig(clientKey, rawConfig, envConfig) {
    const configSet = rawConfig && rawConfig.common && rawConfig.sections && rawConfig.clients ? rawConfig : {
        common: {},
        sections: {},
        clients: getClientEntries(rawConfig)
    };
    const clients = configSet.clients || {};
    const clientOverride = clients[clientKey] || {};

    const commonTokens = normalizeCommon(configSet.common);
    const tokens = Object.assign({}, commonTokens, clientOverride);

    if (commonTokens.navbar || clientOverride.navbar) {
        tokens.navbar = Object.assign({}, commonTokens.navbar, clientOverride.navbar);
        if (clientOverride.navbar && clientOverride.navbar.logo_src) {
            if (!Object.prototype.hasOwnProperty.call(clientOverride.navbar, 'logo_height')) {
                tokens.navbar.logo_height = '';
            }
            if (!Object.prototype.hasOwnProperty.call(clientOverride.navbar, 'logo_width')) {
                tokens.navbar.logo_width = '';
            }
        }
    }
    if (commonTokens.footer || clientOverride.footer) {
        tokens.footer = Object.assign({}, commonTokens.footer, clientOverride.footer);
    }

    const layoutKey = tokens.doi_component === 'doi_info_books' ? 'books' : 'default';

    applyNavbarObject(clientKey, configSet, tokens);
    applyFooterObject(clientKey, configSet, tokens);

    tokens.client_favicon = resolveFaviconPath(tokens.client_favicon);
    tokens.authenticator_script = tokens.authenticator_script || '';
    tokens.disclaimer_second_para = tokens.disclaimer_second_para || '';
    tokens.welcome_heading = resolveNamedValue(tokens.welcome_heading, clientKey);
    tokens.left_side_col_class = resolveNamedValue(tokens.left_side_col_class, layoutKey);
    tokens.right_side_col_class = resolveNamedValue(tokens.right_side_col_class, layoutKey);
    tokens.card_col_class = tokens.card_col_class || tokens.left_side_col_class;
    tokens.doi_col_class = tokens.doi_col_class || tokens.right_side_col_class;

    if (tokens.navbar_section) {
        tokens.navbar_links = renderNavbarLinks(requireSection(clientKey, configSet, 'navbar_section', tokens.navbar_section));
    } else if (!tokens.navbar_links) {
        tokens.navbar_links = renderNavbarLinks(DEFAULT_CONFIG);
    }

    if (tokens.instructions_section) {
        tokens.instructions_body = renderContentSection(requireSection(clientKey, configSet, 'instructions_section', tokens.instructions_section));
    }

    if (tokens.disclaimer_section) {
        tokens.disclaimer_body = renderDisclaimer(requireSection(clientKey, configSet, 'disclaimer_section', tokens.disclaimer_section));
    }

    if (tokens.footer_logo_section) {
        const section = requireSection(clientKey, configSet, 'footer_logo_section', tokens.footer_logo_section);
        tokens.footer_logo = section.html || '';
    }

    if (tokens.extra_sections) {
        tokens.extra_content = tokens.extra_sections.map((sectionKey) =>
            renderExtraSection(requireSection(clientKey, configSet, 'extra_sections', sectionKey))
        ).join('\n');
    }

    return Object.assign({}, envConfig || {}, tokens);
}

function assertNoUnresolvedPlaceholders(clientKey, html) {
    const match = String(html || '').match(/\$\{\{[^}]+\}\}\$|\{\{[^}]+\}\}/);
    if (match) {
        throw new Error(`landing-pages[${clientKey}] unresolved placeholder: ${match[0]}`);
    }
}

function validateRenderedTokens(clientKey, tokens) {
    const required = [
        'page_title',
        'client_favicon',
        'navbar_logo_src',
        'navbar_logo_alt',
        'navbar_links',
        'welcome_heading',
        'instructions_body',
        'disclaimer_body',
        'doi_component'
    ];

    required.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(tokens, key)) {
            throw new Error(`landing-pages[${clientKey}].${key} is required`);
        }
    });
}

module.exports = {
    DEFAULT_CLIENT_KEYS,
    outputFileNameFor,
    loadLandingPageConfig,
    getClientEntries,
    renderLandingPageConfig,
    assertNoUnresolvedPlaceholders,
    validateRenderedTokens
};
