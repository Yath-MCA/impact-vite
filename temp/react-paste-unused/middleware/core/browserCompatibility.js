export const BROWSER_REQUIREMENTS = {
  Chrome: { min: 72, max: Infinity, allowed: true },
  Firefox: { min: 66, max: Infinity, allowed: true },
  'Microsoft Edge': { min: 80, max: Infinity, allowed: true },
  'Internet Explorer': { min: 11, max: 11, allowed: false },
  Opera: { min: 98, max: Infinity, allowed: true },
  Brave: { min: 1, max: Infinity, allowed: false },
  Safari: { min: 14, max: Infinity, allowed: true }
};

function parseVersion(ua, regex) {
  const match = ua.match(regex);
  return match ? match[1] : '';
}

export function detectOS(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  const ua = userAgent;
  let os = '';
  let osVersion = '';

  const windowsMatch = ua.match(/Windows NT (\d+\.\d+)/);
  const macMatch = ua.match(/Mac OS X (\d+[._]\d+)/);
  const androidMatch = ua.match(/Android (\d+\.\d+)/);
  const iosMatch = ua.match(/OS (\d+[._]\d+)/);

  if (windowsMatch) {
    os = 'Windows';
    const windowsVersions = {
      '11.0': '11',
      '10.0': '10',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
      '6.0': 'Vista',
      '5.1': 'XP'
    };
    osVersion = windowsVersions[windowsMatch[1]] || windowsMatch[1];
  } else if (macMatch) {
    os = 'Mac';
    osVersion = macMatch[1].replace('_', '.');
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  } else if (androidMatch) {
    os = 'Android';
    osVersion = androidMatch[1];
  } else if (/iPhone|iPad|iPod/.test(ua) && iosMatch) {
    os = 'iOS';
    osVersion = iosMatch[1].replace('_', '.');
  }

  return { os, osVersion };
}

/**
 * Pure browser compatibility check (no alerts / DOM side effects).
 */
export function checkBrowserCompatibility(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  const ua = userAgent;
  const browserInfo = {
    isChrome: false,
    isFirefox: false,
    isSafari: false,
    isEdge: false,
    isEdgeChromium: false,
    isOpera: false,
    isBrave: false,
    isIE: false,
    browser: 'Unknown',
    version: '',
    majorVersion: 0,
    os: '',
    osVersion: '',
    isAllowed: false,
    isCompatible: false,
    screenSize:
      typeof screen !== 'undefined' ? `${screen.width} x ${screen.height}` : ''
  };

  const osInfo = detectOS(ua);
  browserInfo.os = osInfo.os;
  browserInfo.osVersion = osInfo.osVersion;

  if (typeof document !== 'undefined' && (/*@cc_on!@*/ false || document.documentMode)) {
    browserInfo.browser = 'Internet Explorer';
    browserInfo.version = document.documentMode
      ? String(document.documentMode)
      : parseVersion(ua, /MSIE ([0-9.]+)/);
  } else if (/Chrome\/(\d+)/.test(ua) && !/Edg|OPR|Brave|YaBrowser/.test(ua)) {
    browserInfo.isChrome = true;
    browserInfo.browser = 'Chrome';
    browserInfo.version = parseVersion(ua, /Chrome\/([0-9.]+)/);
  } else if (/Firefox\/(\d+)/.test(ua)) {
    browserInfo.isFirefox = true;
    browserInfo.browser = 'Firefox';
    browserInfo.version = parseVersion(ua, /(?:Firefox|FxiOS)\/([0-9.]+)/);
  } else if (/Edg\/(\d+)/.test(ua)) {
    browserInfo.isEdge = true;
    browserInfo.isEdgeChromium = true;
    browserInfo.browser = 'Microsoft Edge';
    browserInfo.version = parseVersion(ua, /Edg\/([0-9.]+)/);
  } else if (/OPR\/(\d+)/.test(ua)) {
    browserInfo.isOpera = true;
    browserInfo.browser = 'Opera';
    browserInfo.version =
      parseVersion(ua, /(?:OPR|Opera)\/([0-9.]+)/) ||
      parseVersion(ua, /Version\/([0-9.]+)/);
  }

  if (/Version\/(\d+\.\d+)/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua)) {
    browserInfo.isSafari = true;
    browserInfo.browser = 'Safari';
    browserInfo.version = parseVersion(ua, /Version\/([0-9.]+)/);
  }

  if (browserInfo.browser === 'Unknown') {
    return browserInfo;
  }

  browserInfo.majorVersion = parseInt(browserInfo.version, 10) || 0;
  const requirements = BROWSER_REQUIREMENTS[browserInfo.browser];
  if (requirements) {
    browserInfo.isAllowed = requirements.allowed;
    browserInfo.isCompatible =
      requirements.allowed &&
      browserInfo.majorVersion >= requirements.min &&
      browserInfo.majorVersion <= requirements.max;
  }

  return browserInfo;
}

export function isBrowserSupported(userAgent) {
  const info = checkBrowserCompatibility(userAgent);
  return Boolean(info.isAllowed && info.isCompatible && info.browser !== 'Unknown');
}
