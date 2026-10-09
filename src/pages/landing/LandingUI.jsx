/**
 * Phase 1 visual LandingUI — branding + maintenance; Accept/session/PLOS/download stubbed.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  FiBookOpen,
  FiFileText,
  FiHelpCircle,
  FiMonitor,
  FiUsers,
} from 'react-icons/fi';
import metaConfig from './config/landing-meta.json';
import { isPlosClient } from './landingAccess.js';
import { sanitizeHtml } from '../../shared/utils/sanitizeHtml.js';
import { resolveLandingConfigOverride } from './landingConfigService.js';
import { buildCoverImageUrl, getPublicationTitleLabel } from './landingDocumentInfo.js';
import { getLandingNavTheme } from './landingTheme.js';
import { getClientCopy } from './landingCopy.js';
import {
  DEFAULT_IMPACT_LOGO_SRC,
  pickLogoSlot,
  resolveFaviconHref,
  resolveLogoSrc,
} from './landingLogos.js';
import { fireMaintenanceAlert, initMaintenance } from '../../shared/maintenanceGuard.js';

const BUCKET_URL =
  (typeof window !== 'undefined' && (window.ENV?.BUCKET_URL || window.BUCKET_URL)) ||
  'http://localhost/xmleditor/';

const BROWSER_COMPATIBILITY = {
  windows: {
    os: 'Windows OS',
    version: '8.1 and above',
    browsers: ['Chrome 72+', 'Firefox 66+', 'Edge 80+'],
  },
  mac: {
    os: 'MAC OS',
    version: '10.15 and above',
    browsers: ['Chrome 72+', 'Firefox 66+', 'Safari 14.1+'],
  },
  linux: {
    os: 'Linux',
    version: 'Ubuntu 18.04 and above',
    browsers: ['Chrome 72+', 'Firefox 66+'],
  },
};

const LANDING_BODY_TEXT_STYLE = {
  fontFamily: 'Inter UI, sans-serif',
  fontSize: '13px',
};

function LogoComponent({ config }) {
  return (
    <img
      {...config}
      onError={(e) => {
        if (e.target.src.endsWith(DEFAULT_IMPACT_LOGO_SRC)) {
          e.target.style.display = 'none';
          return;
        }
        e.target.src = DEFAULT_IMPACT_LOGO_SRC;
      }}
    />
  );
}

function getClientLandingConfig(clientName, dtd) {
  const copy = getClientCopy(clientName);
  const logoConfig = metaConfig.logo[clientName] || metaConfig.logo.default;
  const headerLogo = pickLogoSlot(logoConfig, 'header-logo', dtd) || logoConfig['header-logo'];
  const footerLogo = pickLogoSlot(logoConfig, 'footer-logo', dtd) || logoConfig['footer-logo'];

  return {
    logo: {
      header: {
        src: resolveLogoSrc(headerLogo.name),
        alt: headerLogo.alt,
        width: headerLogo.width,
        height: headerLogo.height,
        className: 'tw:object-contain',
        style: { maxHeight: `${headerLogo.height}px` },
      },
      footer: {
        src: resolveLogoSrc(footerLogo.name),
        alt: footerLogo.alt,
        height: footerLogo.height,
        className: 'tw:object-contain',
      },
    },
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
    guideUrl: logoConfig.guideUrl || metaConfig.help?.guideUrl || '/assets/help/IMPACT_User_Guide.pdf',
  };
}

function applyLandingConfigOverride(baseConfig, override) {
  if (!override) return baseConfig;

  const overrideLogo = (baseLogo, logoOverride) => {
    if (!logoOverride) return baseLogo;
    const src =
      logoOverride.src ||
      (logoOverride.name ? resolveLogoSrc(logoOverride.name) : baseLogo.src);
    return { ...baseLogo, ...logoOverride, src };
  };

  return {
    ...baseConfig,
    theme: override.theme || baseConfig.theme,
    faqUrl: override.faqUrl || baseConfig.faqUrl,
    guideUrl: override.guideUrl || baseConfig.guideUrl,
    logo: {
      header: overrideLogo(baseConfig.logo.header, override.logo?.header),
      footer: overrideLogo(baseConfig.logo.footer, override.logo?.footer),
    },
  };
}

export default function LandingUI({ docData }) {
  const [coverImageError, setCoverImageError] = useState(false);
  const [configOverride, setConfigOverride] = useState(null);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  async function onAgreeContinue() {
    setAcceptError('');
    setAcceptBusy(true);
    try {
      const { startLandingAccept } = await import('./landingSessionBridge.js');
      await startLandingAccept(docData, {
        onError: (err) => setAcceptError(String(err?.message || err || 'Session failed')),
        onTryAgain: () => setAcceptError('Could not open session. Try again.'),
        onDenied: (msg) => setAcceptError(msg || 'Access denied'),
        onVerifyFailed: () => setAcceptError('Session verify failed. Try again.'),
        onBlocked: async () => {
          setAcceptError(
            'Another user holds this session. Send Request UI comes in a follow-up.'
          );
        },
      });
    } catch (err) {
      setAcceptError(String(err?.message || err));
    } finally {
      setAcceptBusy(false);
    }
  }

  const clientName = (docData?.client ?? 'default').toLowerCase();
  const branding = docData?.branding || {};

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initMaintenance({ init: true });
        if (!cancelled) fireMaintenanceAlert();
      } catch {
        /* never block landing */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setConfigOverride(null);
    resolveLandingConfigOverride(clientName, branding).then(({ config }) => {
      if (!cancelled) setConfigOverride(config);
    });
    return () => {
      cancelled = true;
    };
  }, [clientName]);

  const dtd = docData?.dtd;
  const metaInfo = useMemo(
    () => applyLandingConfigOverride(getClientLandingConfig(clientName, dtd), configOverride),
    [clientName, dtd, configOverride]
  );
  const isPlos = isPlosClient(docData?.client);
  const coverImageUrl = buildCoverImageUrl(docData?.cover, clientName, BUCKET_URL);
  const publicationTitleLabel = getPublicationTitleLabel(docData);
  const navTheme = getLandingNavTheme(metaInfo.theme);
  const themeColor = navTheme.themeColor;

  const welcomeHtml =
    branding.WELCOME_TEXT || branding.welcome_text || branding.welcomeText || metaInfo.welcome;
  const safeWelcomeHtml = welcomeHtml ? sanitizeHtml(welcomeHtml) : '';
  const pageTitle = branding.PAGE_TITLE || branding.page_title || branding.pageTitle;

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

  const faqHref = metaInfo.faqUrl;
  const guideHref = metaInfo.guideUrl;

  return (
    <div
      className="tw:min-h-screen tw:flex tw:flex-col tw:bg-slate-50"
      style={{ '--theme-color': themeColor }}
      data-testid="landing-shell"
    >
      <nav
        className={`${navTheme.navClass} tw:sticky tw:top-0 tw:z-40 tw:shadow-sm`}
        style={
          navTheme.isDarkNav
            ? { backgroundColor: themeColor, '--theme-color': themeColor }
            : { '--theme-color': themeColor }
        }
      >
        <div className="tw:container tw:mx-auto tw:px-4">
          <div className="tw:flex tw:items-center tw:justify-between tw:h-16">
            <div className="tw:flex tw:items-center tw:gap-3">
              <LogoComponent config={metaInfo.logo.header} />
            </div>
            <div className="tw:flex tw:items-center tw:gap-6">
              <a
                href={faqHref}
                target="_blank"
                rel="noreferrer"
                className={`${navTheme.linkClass} tw:no-underline`}
              >
                <FiHelpCircle className="tw:w-4 tw:h-4" />
                FAQs
              </a>
              <a
                href={guideHref}
                target="_blank"
                rel="noreferrer"
                className={`${navTheme.linkClass} tw:no-underline`}
              >
                <FiFileText className="tw:w-4 tw:h-4" />
                User Guide
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="tw:flex-1 tw:container tw:max-w-screen-2xl tw:mx-auto tw:px-4 tw:py-8">
        <div
          className="tw:text-white tw:rounded-lg tw:p-6 tw:mb-6 tw:shadow-lg"
          style={{
            background: `linear-gradient(90deg, ${themeColor}, ${themeColor}dd)`,
          }}
        >
          {safeWelcomeHtml ? (
            <div
              className="tw:max-w-none branding-welcome"
              dangerouslySetInnerHTML={{ __html: safeWelcomeHtml }}
            />
          ) : (
            <>
              <h1 className="tw:text-2xl tw:font-bold tw:mb-2">
                Welcome to <span className="tw:font-black">IMPACT</span>
              </h1>
              <p className="tw:opacity-90">
                {metaInfo.subtitle ||
                  'The online proofing tool for collaborating on journal content'}
                {docData?.projecttitle && ` — ${docData.projecttitle}`}
              </p>
            </>
          )}
        </div>

        <div
          className="tw:grid tw:gap-6 tw:lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
          style={LANDING_BODY_TEXT_STYLE}
        >
          <div className="tw:bg-white tw:rounded-lg tw:shadow-md tw:p-6 tw:border tw:border-slate-200">
            <h2 className="tw:text-xl tw:font-bold tw:text-slate-900 tw:mb-4 tw:flex tw:items-center tw:gap-2">
              <FiFileText className="tw:w-5 tw:h-5 tw:text-primary" />
              {metaInfo.title}
            </h2>

            {docData?.title ? (
              <p className="tw:mb-4 tw:text-slate-700">
                Document: <strong>{docData.title}</strong>
              </p>
            ) : null}

            <ul className="tw:space-y-2.5 tw:mb-6 tw:list-none tw:p-0 tw:m-0">
              {(metaInfo.items || []).map((item, idx) => (
                <li key={idx} className="tw:text-slate-800 tw:flex tw:gap-2.5 tw:leading-relaxed">
                  <span className="tw:text-primary tw:font-bold tw:mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {metaInfo.notes?.length > 0 && (
              <div className="tw:mb-6">
                <h3 className="tw:text-base tw:font-bold tw:text-slate-900 tw:mb-3">Notes</h3>
                <ul className="tw:space-y-2.5 tw:list-none tw:p-0 tw:m-0">
                  {metaInfo.notes.map((item, idx) => (
                    <li
                      key={idx}
                      className="tw:text-slate-800 tw:flex tw:gap-2.5 tw:leading-relaxed"
                    >
                      <span className="tw:text-primary tw:font-bold tw:mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="tw:mb-6 tw:p-3 tw:bg-slate-50 tw:rounded-lg tw:border tw:border-slate-200">
              <p className="tw:text-slate-700 tw:leading-relaxed tw:m-0">
                If you need assistance with IMPACT, please review the{' '}
                <a
                  href={faqHref}
                  target="_blank"
                  rel="noreferrer"
                  className="tw:text-primary tw:hover:underline tw:font-semibold"
                >
                  FAQs
                </a>{' '}
                and{' '}
                <a
                  href={guideHref}
                  target="_blank"
                  rel="noreferrer"
                  className="tw:text-primary tw:hover:underline tw:font-semibold"
                >
                  User Guide
                </a>{' '}
                or contact our support team at{' '}
                <a
                  href={`mailto:${metaInfo.supportEmail}`}
                  className="tw:text-primary tw:hover:underline tw:font-semibold"
                >
                  {metaInfo.supportEmail}
                </a>
              </p>
            </div>

            <div className="tw:mb-6 tw:p-4 tw:bg-amber-50 tw:rounded-lg tw:border tw:border-amber-200">
              <h3 className="tw:font-bold tw:text-amber-950 tw:mb-2">Disclaimer</h3>
              <p className="tw:text-amber-950 tw:leading-relaxed tw:m-0">{metaInfo.disclaimer}</p>
            </div>

            {isPlos ? (
              <p className="tw:mb-4 tw:text-sm tw:text-slate-500">
                Extra PLOS verification will appear in a later phase.
              </p>
            ) : null}

            {acceptError ? (
              <p className="tw:mb-3 tw:text-sm tw:text-red-700" role="alert">
                {acceptError}
              </p>
            ) : null}
            <button
              type="button"
              disabled={acceptBusy || !docData}
              onClick={onAgreeContinue}
              className="tw:w-full tw:bg-primary tw:text-white tw:font-bold tw:py-3.5 tw:rounded-lg tw:shadow-md tw:border-0 tw:disabled:opacity-60 tw:disabled:cursor-not-allowed"
            >
              {acceptBusy ? 'Opening…' : 'AGREE & CONTINUE'}
            </button>
          </div>

          <div className="tw:bg-white tw:rounded-lg tw:shadow-md tw:p-6 tw:border tw:border-slate-200">
            <div className="tw:flex tw:gap-6 tw:mb-6">
              <div className="tw:flex-shrink-0 tw:w-36">
                <div
                  className="tw:w-full tw:h-48 tw:rounded-lg tw:flex tw:flex-col tw:items-center tw:justify-center tw:shadow-md tw:overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)`,
                  }}
                >
                  {coverImageUrl && !coverImageError ? (
                    <img
                      src={coverImageUrl}
                      alt={`Cover: ${docData?.cover}`}
                      className="tw:w-full tw:h-full tw:object-cover"
                      onError={() => setCoverImageError(true)}
                    />
                  ) : (
                    <>
                      <FiBookOpen className="tw:w-16 tw:h-16 tw:text-white tw:mb-3 tw:opacity-80" />
                      {docData?.cover ? (
                        <div className="tw:text-white tw:text-center tw:px-2">
                          <div className="tw:text-xs tw:font-semibold tw:uppercase tw:tracking-wider tw:opacity-75 tw:mb-1">
                            Cover
                          </div>
                          <div className="tw:text-lg tw:font-bold tw:break-all">{docData.cover}</div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              <div className="tw:flex-1 tw:min-w-0 tw:space-y-4">
                {(docData?.journaltitle || docData?.booktitle) && (
                  <div>
                    <div className="tw:font-bold tw:text-primary tw:uppercase tw:tracking-wider tw:mb-1">
                      {publicationTitleLabel}
                    </div>
                    <h3 className="tw:text-base tw:font-bold tw:text-slate-900 tw:leading-tight tw:m-0">
                      {docData.journaltitle || docData.booktitle}
                    </h3>
                  </div>
                )}

                {docData?.doi ? (
                  <div className="tw:font-mono tw:text-slate-700 tw:break-all">{docData.doi}</div>
                ) : null}

                {docData?.articletitle ? (
                  <div>
                    <div className="tw:font-bold tw:text-slate-700 tw:uppercase tw:tracking-wider tw:mb-1">
                      Article Title
                    </div>
                    <p className="tw:text-slate-900 tw:leading-snug tw:m-0">{docData.articletitle}</p>
                  </div>
                ) : null}

                {docData?.authorgroup ? (
                  <div>
                    <div className="tw:font-bold tw:text-slate-700 tw:uppercase tw:tracking-wider tw:flex tw:items-center tw:gap-1 tw:mb-1">
                      <FiUsers className="tw:w-3.5 tw:h-3.5" />
                      Authors
                    </div>
                    <p className="tw:text-slate-800 tw:leading-relaxed tw:m-0">{docData.authorgroup}</p>
                  </div>
                ) : null}

                {!docData?.journaltitle &&
                !docData?.booktitle &&
                !docData?.articletitle &&
                docData?.title ? (
                  <div>
                    <div className="tw:font-bold tw:text-slate-700 tw:uppercase tw:tracking-wider tw:mb-1">
                      Title
                    </div>
                    <p className="tw:text-slate-900 tw:leading-snug tw:m-0">{docData.title}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="tw:bg-slate-800 tw:text-white tw:py-8 tw:mt-8 tw:border-t tw:border-slate-700">
        <div className="tw:container tw:mx-auto tw:px-4">
          <div className="tw:flex tw:items-center tw:gap-2 tw:mb-6 tw:pb-3 tw:border-b tw:border-slate-700">
            <FiMonitor className="tw:w-5 tw:h-5 tw:text-primary" />
            <h3 className="tw:text-lg tw:font-bold tw:text-white tw:m-0">Supported Browsers</h3>
          </div>

          <div className="tw:grid tw:md:grid-cols-3 tw:gap-6 tw:mb-6">
            {Object.values(BROWSER_COMPATIBILITY).map((block) => (
              <div key={block.os}>
                <h4 className="tw:font-bold tw:text-orange-300 tw:mb-2">
                  {block.os}{' '}
                  <span className="tw:text-sm tw:font-normal tw:text-slate-400">
                    ({block.version})
                  </span>
                </h4>
                <ul className="tw:space-y-1.5 tw:list-none tw:p-0 tw:m-0">
                  {block.browsers.map((browser) => (
                    <li
                      key={browser}
                      className="tw:text-sm tw:text-slate-300 tw:flex tw:items-center tw:gap-2"
                    >
                      <span className="tw:w-1.5 tw:h-1.5 tw:bg-primary tw:rounded-full" />
                      {browser}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="tw:text-center tw:text-sm tw:text-slate-400 tw:pt-4 tw:border-t tw:border-slate-700">
            © {new Date().getFullYear()} IMPACT Online Proofing | Powered by Newgen KnowledgeWorks
          </div>
        </div>
      </footer>
    </div>
  );
}
