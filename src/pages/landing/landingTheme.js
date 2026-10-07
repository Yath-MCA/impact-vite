/**
 * Landing chrome theme tokens. Keys match landing-meta.json `logo.<client>.theme`.
 * White-logo clients use a dark navbar so *_WHITE.svg marks stay visible.
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
  oho: '#082d2a'
};

const LIGHT_NAV = {
  navClass: 'bg-white text-gray-700',
  linkClass: 'text-base text-gray-700 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-400 flex items-center gap-1'
};

const LWW_LIGHT_NAV = {
  navClass: 'bg-white text-gray-900',
  linkClass: 'text-base text-gray-800 dark:text-gray-300 hover:text-primary-700 dark:hover:text-white flex items-center gap-1'
};

const DARK_NAV_LINK =
  'text-base text-white hover:text-white/80 flex items-center gap-1';

export const THEME_NAV_CLASS = {
  oxford: { navClass: 'bg-oxford-900 text-white', linkClass: DARK_NAV_LINK },
  lww: LWW_LIGHT_NAV,
  plos: { navClass: 'bg-plos-900 text-white', linkClass: DARK_NAV_LINK },
  acs: { navClass: 'bg-acs-900 text-white', linkClass: DARK_NAV_LINK },
  oho: { navClass: 'bg-oho-900 text-white', linkClass: DARK_NAV_LINK },
  primary: LIGHT_NAV,
  medknow: LIGHT_NAV,
  nihr: LIGHT_NAV,
  brill: LIGHT_NAV,
  tnf: LIGHT_NAV
};

export function getLandingNavTheme(theme) {
  const resolved = THEME_NAV_CLASS[theme] ? theme : 'primary';
  const chrome = THEME_NAV_CLASS[resolved];
  return {
    theme: resolved,
    isDarkNav: chrome.linkClass === DARK_NAV_LINK,
    navClass: chrome.navClass,
    linkClass: chrome.linkClass,
    themeColor: THEME_COLOR_HEX[resolved] || THEME_COLOR_HEX.primary
  };
}
