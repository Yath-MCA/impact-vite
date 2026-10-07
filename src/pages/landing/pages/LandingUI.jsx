import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { FileText, Users, HelpCircle, BookOpen, Monitor, Loader2 } from 'lucide-react';
import metaConfig from '../../../config/landing-meta.json';
import useLandingSessionFlow from '../hooks/useLandingSessionFlow';
import { isPlosClient } from '../landingAccess.js';
import { sanitizeHtml } from '../../../shared/utils/sanitizeHtml';
import { resolveLandingConfigOverride } from '../../../services/landing/landingConfigService';
import { buildCoverImageUrl, getPublicationTitleLabel } from '../landingDocumentInfo.js';
import { getLandingNavTheme } from '../landingTheme.js';
import { getClientCopy } from '../landingCopy.js';
import {
  DEFAULT_IMPACT_LOGO_SRC,
  pickLogoSlot,
  resolveFaviconHref,
  resolveLogoSrc
} from '../landingLogos.js';
import {
  downloadClick,
  getDownloadRequest,
  initDownloadService
} from '../../../services/download/index.js';

const PlosAuthPanel = lazy(() => import('../plos/PlosAuthPanel.jsx'));

const THEME_BANNER_CLASS = {
  oxford: 'bg-gradient-to-r from-oxford-600 to-oxford-700',
  primary: 'bg-gradient-to-r from-primary-600 to-primary-700',
  lww: 'bg-gradient-to-r from-lww-600 to-lww-700',
  medknow: 'bg-gradient-to-r from-medknow-600 to-medknow-700',
  plos: 'bg-gradient-to-r from-plos-600 to-plos-700',
  nihr: 'bg-gradient-to-r from-nihr-600 to-nihr-700',
  brill: 'bg-gradient-to-r from-brill-600 to-brill-700',
  tnf: 'bg-gradient-to-r from-tnf-600 to-tnf-700',
  acs: 'bg-gradient-to-r from-acs-600 to-acs-700',
  oho: 'bg-gradient-to-r from-oho-600 to-oho-700'
};

// Get BUCKET_URL from window.ENV or fallback
const BUCKET_URL = window.ENV?.BUCKET_URL || window.BUCKET_URL || 'http://localhost/xmleditor/';

// Browser compatibility information (from src/snippets/component/browser.html)
const BROWSER_COMPATIBILITY = {
  windows: {
    os: 'Windows OS',
    version: '8.1 and above',
    browsers: ['Chrome 72+', 'Firefox 66+', 'Edge 80+']
  },
  mac: {
    os: 'MAC OS',
    version: '10.15 and above',
    browsers: ['Chrome 72+', 'Firefox 66+', 'Safari 14.1+']
  },
  linux: {
    os: 'Linux',
    version: 'Ubuntu 18.04 and above',
    browsers: ['Chrome 72+', 'Firefox 66+']
  }
};

const LANDING_BODY_TEXT_STYLE = {
  fontFamily: 'Inter UI, sans-serif',
  fontSize: '13px'
};


const LogoComponent = ({ config }) => (
  <img
    {...config}
    onError={(e) => {
      // Broken client logo -> fall back to the default IMPACT logo instead of
      // leaving the header blank. Guard against the fallback itself failing.
      if (e.target.src.endsWith(DEFAULT_IMPACT_LOGO_SRC)) {
        e.target.style.display = 'none';
        return;
      }
      e.target.src = DEFAULT_IMPACT_LOGO_SRC;
    }}
  />
);



// Extract instructions, disclaimers, and plugin data dynamically based on the client name
const getClientLandingConfig = (clientName, dtd) => {
  const copy = getClientCopy(clientName);
  const logoConfig = metaConfig.logo[clientName] || metaConfig.logo.default;
  const headerLogo = pickLogoSlot(logoConfig, 'header-logo', dtd) || logoConfig['header-logo'];
  const footerLogo = pickLogoSlot(logoConfig, 'footer-logo', dtd) || logoConfig['footer-logo'];

  const logos = {
    header: {
      src: resolveLogoSrc(headerLogo.name),
      alt: headerLogo.alt,
      width: headerLogo.width,
      height: headerLogo.height,
      className: 'object-contain',
      style: {
        maxHeight: `${headerLogo.height}px`
      }
    },
    footer: {
      src: resolveLogoSrc(footerLogo.name),
      alt: footerLogo.alt,
      height: footerLogo.height,
      className: 'object-contain'
    }
  };

  return {
    logo: logos,
    theme: logoConfig.theme || 'primary',
    title: copy.title,
    items: copy.instructions,
    notes: copy.notes,
    welcome: copy.welcome,
    subtitle: copy.subtitle,
    supportEmail: copy.supportEmail,
    disclaimer: copy.disclaimer,
    thirdPartyPlugins: copy.thirdPartyPlugins,
    faqUrl: logoConfig.faqUrl || metaConfig.help?.faqUrl || '/assets/help/IMPACT_FAQ.pdf',
    guideUrl: logoConfig.guideUrl || metaConfig.help?.guideUrl || '/assets/help/IMPACT_User_Guide.pdf'
  };
};

// Merge a DB/API-resolved landing config (see landingConfigService) over the
// landing-meta.json-derived defaults. Only overrides fields the source actually sent.
const applyLandingConfigOverride = (baseConfig, override) => {
  if (!override) return baseConfig;

  const overrideLogo = (baseLogo, logoOverride) => {
    if (!logoOverride) return baseLogo;
    const src = logoOverride.src || (logoOverride.name ? resolveLogoSrc(logoOverride.name) : baseLogo.src);
    return { ...baseLogo, ...logoOverride, src };
  };

  return {
    ...baseConfig,
    theme: override.theme || baseConfig.theme,
    faqUrl: override.faqUrl || baseConfig.faqUrl,
    guideUrl: override.guideUrl || baseConfig.guideUrl,
    logo: {
      header: overrideLogo(baseConfig.logo.header, override.logo?.header),
      footer: overrideLogo(baseConfig.logo.footer, override.logo?.footer)
    }
  };
};

export default function LandingUI({
  docData,
  showAcceptButton = true,
  showValidateEmailButton = false,
  retryButtonLabel = 'VALIDATE EMAIL',
  onValidateEmail,
  plosAuthStatus = 'idle',
  ui: sessionUi,
  isBusy: sessionIsBusy,
  startLogin: sessionStartLogin
}) {
  const [coverImageError, setCoverImageError] = useState(false);
  const [configOverride, setConfigOverride] = useState(null);
  const internalFlow = useLandingSessionFlow(docData);
  const ui = sessionUi ?? internalFlow.ui;
  const isBusy = sessionIsBusy ?? internalFlow.isBusy;
  const startLogin = sessionStartLogin ?? internalFlow.startLogin;

  const clientName = (docData?.client ?? 'default').toLowerCase();
  const branding = docData?.branding || {};

  useEffect(() => {
    let cancelled = false;
    setConfigOverride(null);

    resolveLandingConfigOverride(clientName, branding).then(({ config }) => {
      if (!cancelled) setConfigOverride(config);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName]);

  const dtd = docData?.dtd;
  const metaInfo = useMemo(
    () => applyLandingConfigOverride(getClientLandingConfig(clientName, dtd), configOverride),
    [clientName, dtd, configOverride]
  );
  const isPlos = isPlosClient(docData?.client);
  const coverImageUrl = buildCoverImageUrl(docData?.cover, clientName, BUCKET_URL);
  const publicationTitleLabel = getPublicationTitleLabel(docData);
  const bannerClass = THEME_BANNER_CLASS[metaInfo.theme] || THEME_BANNER_CLASS.primary;
  const navTheme = getLandingNavTheme(metaInfo.theme);

  // Extract branding from response (takes precedence over env file)
  const welcomeHtml = branding.WELCOME_TEXT || branding.welcome_text || branding.welcomeText || metaInfo.welcome;
  const safeWelcomeHtml = welcomeHtml ? sanitizeHtml(welcomeHtml) : '';
  const pageTitle = branding.PAGE_TITLE || branding.page_title || branding.pageTitle;
  const themeColor = navTheme.themeColor;

  useEffect(() => {
    const logoConfig = metaConfig.logo[clientName] || metaConfig.logo.default;
    const href = resolveFaviconHref(logoConfig, dtd);
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }, [clientName, dtd]);

  useEffect(() => {
    if (pageTitle) {
      document.title = pageTitle;
    }
  }, [pageTitle]);

  const handleContinue = async () => {
    await startLogin();
  };

  const handleValidateEmail = () => {
    if (onValidateEmail) {
      onValidateEmail();
      return;
    }
    window.location.reload();
  };

  const [faqHref, setFaqHref] = useState(metaInfo.faqUrl);
  const [guideHref, setGuideHref] = useState(metaInfo.guideUrl);

  useEffect(() => {
    setFaqHref(metaInfo.faqUrl);
    setGuideHref(metaInfo.guideUrl);
    let cancelled = false;

    (async () => {
      await initDownloadService();
      const [faqRequest, guideRequest] = await Promise.all([
        getDownloadRequest('Help_FAQ_pdf'),
        getDownloadRequest('Help_Guide_pdf')
      ]);
      if (cancelled) return;
      if (faqRequest?.url) setFaqHref(faqRequest.url);
      if (guideRequest?.url) setGuideHref(guideRequest.url);
    })();

    return () => {
      cancelled = true;
    };
  }, [metaInfo.faqUrl, metaInfo.guideUrl]);

  const onHelpDownload = (event, action) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    downloadClick(action, 'landing');
  };

  return (
    <div className="min-h-screen  flex flex-col"
      style={{ '--theme-color': themeColor }}
    >

      {/* Header */}
      <nav className={`${navTheme.navClass} sticky top-0 z-40 shadow-sm`}
        style={{ '--theme-color': themeColor }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              {LogoComponent({ config: metaInfo.logo.header })}
            </div>
            <div className="flex items-center space-x-6">
              <a
                href={faqHref}
                target="_blank"
                rel="noreferrer"
                className={`${navTheme.linkClass} group`}
                onClick={(e) => onHelpDownload(e, 'Help_FAQ_pdf')}
              >
                <HelpCircle className={navTheme.isDarkNav ? 'w-4 h-4' : 'w-4 h-4 group-hover:text-primary-700'} />
                FAQs
              </a>
              <a
                href={guideHref}
                target="_blank"
                rel="noreferrer"
                className={`${navTheme.linkClass} group`}
                onClick={(e) => onHelpDownload(e, 'Help_Guide_pdf')}
              >
                <FileText className={navTheme.isDarkNav ? 'w-4 h-4' : 'w-4 h-4 group-hover:text-primary-700'} />
                User Guide
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 container max-w-screen-2xl mx-auto px-4 py-8">

        {/* Welcome Banner */}
        <div className={`${bannerClass} text-white rounded-lg p-6 mb-6 shadow-lg`}>
          {safeWelcomeHtml ? (
            <div
              className="prose prose-invert max-w-none branding-welcome"
              dangerouslySetInnerHTML={{ __html: safeWelcomeHtml }}
            />
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">
                Welcome to <span className="font-black">IMPACT</span>
              </h1>
              <p className="text-primary-100">
                {metaInfo.subtitle || 'The online proofing tool for collaborating on journal content'}
                {docData?.projecttitle && ` — ${docData.projecttitle}`}
              </p>
            </>
          )}
        </div>

        <div
          className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
          style={LANDING_BODY_TEXT_STYLE}
        >

          {/* Left: Instructions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              {metaInfo.title}
            </h2>

            <ul className="space-y-2.5 mb-6">
              {metaInfo.items.map((item, idx) => (
                <li key={idx} className="text-gray-800 dark:text-gray-200 flex gap-2.5 leading-relaxed">
                  <span className="text-primary-600 font-bold mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {metaInfo.notes?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">
                  Notes
                </h3>
                <ul className="space-y-2.5">
                  {metaInfo.notes.map((item, idx) => (
                    <li key={idx} className="text-gray-800 dark:text-gray-200 flex gap-2.5 leading-relaxed">
                      <span className="text-primary-600 font-bold mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                If you need assistance with IMPACT, please review the{' '}
                <a
                  href={faqHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-700 hover:underline font-semibold"
                  onClick={(e) => onHelpDownload(e, 'Help_FAQ_pdf')}
                >FAQs</a>
                {' '}and{' '}
                <a
                  href={guideHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-700 hover:underline font-semibold"
                  onClick={(e) => onHelpDownload(e, 'Help_Guide_pdf')}
                >User Guide</a>
                {' '}or contact our support team at{' '}
                <a href={`mailto:${metaInfo.supportEmail}`} className="text-primary-700 hover:underline font-semibold">
                  {metaInfo.supportEmail}
                </a>
              </p>
            </div>

            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <h3 className="font-bold text-amber-950 dark:text-amber-100 mb-2">
                Disclaimer
              </h3>
              <p className="text-amber-950 dark:text-amber-100 leading-relaxed mb-4">
                {metaInfo.disclaimer}
              </p>

              {/* Third Party Plugins - Medknow Chinese translation */}
              {metaInfo.thirdPartyPlugins && (
                <div className="pt-3 border-t border-amber-200 dark:border-amber-700">
                  <h4 className="font-bold text-amber-950 dark:text-amber-100 mb-2">
                    {metaInfo.thirdPartyPlugins.title}
                  </h4>
                  <p className="text-amber-950 dark:text-amber-100 leading-relaxed mb-3">
                    {metaInfo.thirdPartyPlugins.text}
                  </p>
                  <div className="font-semibold text-primary-700 dark:text-primary-300 mb-1">
                    {metaInfo.thirdPartyPlugins.chineseLabel}
                  </div>
                  <p className="text-amber-950 dark:text-amber-100 leading-relaxed" lang="zh-CN">
                    {metaInfo.thirdPartyPlugins.chineseText}
                  </p>
                </div>
              )}
            </div>

            {/* PLOS: extra verification (OTP / reCAPTCHA) before accept */}
            {isPlos && (
              <Suspense fallback={null}>
                <PlosAuthPanel status={plosAuthStatus} />
              </Suspense>
            )}

            {showAcceptButton && !isBusy && (
              <button
                onClick={handleContinue}
                disabled={isBusy}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                {isBusy ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {ui.message || 'Processing…'}
                  </span>
                ) : (
                  'AGREE & CONTINUE'
                )}
              </button>
            )}

            {showAcceptButton && isBusy && (
              <button
                disabled
                className="w-full bg-primary-600 opacity-60 cursor-not-allowed text-white font-bold py-3.5 rounded-lg shadow-md"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {ui.message || 'Processing…'}
                </span>
              </button>
            )}

            {showValidateEmailButton && (
              <button
                type="button"
                onClick={handleValidateEmail}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                {retryButtonLabel}
              </button>
            )}
          </div>

          {/* Right: Document Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex gap-6 mb-6">

              {/* Cover Image */}
              <div className="flex-shrink-0 w-36">
                <div className="w-full h-48 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex flex-col items-center justify-center shadow-md overflow-hidden">
                  {coverImageUrl && !coverImageError ? (
                    <img
                      src={coverImageUrl}
                      alt={`Cover: ${docData?.cover}`}
                      className="w-full h-full object-cover"
                      onError={() => setCoverImageError(true)}
                    />
                  ) : (
                    <>
                      <BookOpen className="w-16 h-16 text-white mb-3 opacity-80" />
                      {docData?.cover && (
                        <div className="text-white text-center px-2">
                          <div className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-1">
                            Cover
                          </div>
                          <div className="text-lg font-bold break-all">
                            {docData.cover}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex-1 min-w-0 space-y-4">

                {/* Journal/Book Title */}
                {(docData?.journaltitle || docData?.booktitle) && (
                  <div>
                    <div className="font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider mb-1">
                      {publicationTitleLabel}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                      {docData.journaltitle || docData.booktitle}
                    </h3>
                  </div>
                )}

                {/* DOI */}
                {docData?.doi && (
                  <div className="font-mono text-gray-700 dark:text-gray-300 break-all">
                    {docData.doi}
                  </div>
                )}

                {/* Article Title */}
                {docData?.articletitle && (
                  <div>
                    <div className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Article Title
                    </div>
                    <p className="text-gray-900 dark:text-white leading-snug">
                      {docData.articletitle}
                    </p>
                  </div>
                )}

                {/* Authors */}
                {docData?.authorgroup && (
                  <div>
                    <div className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Users className="w-3.5 h-3.5" />
                      Authors
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                      {docData.authorgroup}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Bar */}
            {(docData?.figcount !== undefined || docData?.tablecount !== undefined || docData?.Query !== undefined) && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-3">
                  {docData?.figcount !== undefined && (
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary-600">
                        {docData.figcount}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                        Figures
                      </div>
                    </div>
                  )}
                  {docData?.tablecount !== undefined && (
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary-600">
                        {docData.tablecount}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                        Tables
                      </div>
                    </div>
                  )}
                  {docData?.Query !== undefined && (
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary-600">
                        {docData.Query}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                        Queries
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Footer - Browser Compatibility */}
      <footer className="bg-gray-800 dark:bg-gray-950 text-white py-8 mt-8 border-t border-gray-700">
        <div className="container mx-auto px-4">

          {/* Supported Browsers Title */}
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-gray-700">
            <Monitor className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-bold text-white">Supported Browsers</h3>
          </div>

          {/* Browser Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Windows */}
            <div>
              <h4 className="font-bold text-primary-300 mb-2">
                {BROWSER_COMPATIBILITY.windows.os} <span className="text-sm font-normal text-gray-400">({BROWSER_COMPATIBILITY.windows.version})</span>
              </h4>
              <ul className="space-y-1.5">
                {BROWSER_COMPATIBILITY.windows.browsers.map((browser, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full"></span>
                    {browser}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mac */}
            <div>
              <h4 className="font-bold text-primary-300 mb-2">
                {BROWSER_COMPATIBILITY.mac.os} <span className="text-sm font-normal text-gray-400">({BROWSER_COMPATIBILITY.mac.version})</span>
              </h4>
              <ul className="space-y-1.5">
                {BROWSER_COMPATIBILITY.mac.browsers.map((browser, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full"></span>
                    {browser}
                  </li>
                ))}
              </ul>
            </div>

            {/* Linux */}
            <div>
              <h4 className="font-bold text-primary-300 mb-2">
                {BROWSER_COMPATIBILITY.linux.os} <span className="text-sm font-normal text-gray-400">({BROWSER_COMPATIBILITY.linux.version})</span>
              </h4>
              <ul className="space-y-1.5">
                {BROWSER_COMPATIBILITY.linux.browsers.map((browser, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full"></span>
                    {browser}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center text-sm text-gray-400 pt-4 border-t border-gray-700">
            © {new Date().getFullYear()} IMPACT Online Proofing | Powered by Newgen KnowledgeWorks
          </div>
        </div>
      </footer>

    </div>
  );
}
