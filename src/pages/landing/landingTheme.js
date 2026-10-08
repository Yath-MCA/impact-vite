/**
 * Landing chrome theme tokens. Keys match landing-meta.json `logo.<client>.theme`.
 */

export const THEME_COLOR_HEX = {
  oxford: '#002147',
  primary: '#ff8635',
  lww: '#4a0511',
  medknow: '#002f15',
  plos: '#04262d',
  nihr: '#00112e',
  brill: '#26050d',
  tnf: '#002646',
  acs: '#001829',
  oho: '#082d2a',
};

const LIGHT_NAV = {
  navClass: 'tw:bg-white tw:text-slate-700',
  linkClass:
    'tw:text-base tw:text-slate-700 tw:hover:text-primary tw:flex tw:items-center tw:gap-1',
};

const LWW_LIGHT_NAV = {
  navClass: 'tw:bg-white tw:text-slate-900',
  linkClass:
    'tw:text-base tw:text-slate-800 tw:hover:text-primary tw:flex tw:items-center tw:gap-1',
};

const DARK_NAV_LINK =
  'tw:text-base tw:text-white tw:hover:text-white/80 tw:flex tw:items-center tw:gap-1';

export const THEME_NAV_CLASS = {
  oxford: { navClass: 'tw:text-white', linkClass: DARK_NAV_LINK },
  lww: LWW_LIGHT_NAV,
  plos: { navClass: 'tw:text-white', linkClass: DARK_NAV_LINK },
  acs: { navClass: 'tw:text-white', linkClass: DARK_NAV_LINK },
  oho: { navClass: 'tw:text-white', linkClass: DARK_NAV_LINK },
  primary: LIGHT_NAV,
  medknow: LIGHT_NAV,
  nihr: LIGHT_NAV,
  brill: LIGHT_NAV,
  tnf: LIGHT_NAV,
};

export function getLandingNavTheme(theme) {
  const resolved = THEME_NAV_CLASS[theme] ? theme : 'primary';
  const chrome = THEME_NAV_CLASS[resolved];
  return {
    theme: resolved,
    isDarkNav: chrome.linkClass === DARK_NAV_LINK,
    navClass: chrome.navClass,
    linkClass: chrome.linkClass,
    themeColor: THEME_COLOR_HEX[resolved] || THEME_COLOR_HEX.primary,
  };
}
