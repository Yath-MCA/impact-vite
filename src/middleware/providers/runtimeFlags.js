const runtimeWindow = typeof window !== 'undefined' ? window : { location: { href: '' } };

function isLocalHostname(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') {
    return true;
  }
  return host.endsWith('.localhost');
}

/** True when current page URL is local development (localhost, 127.0.0.1, etc.). */
export function isLocalHost(href = runtimeWindow.location?.href) {
  const urlString = String(href || '');
  if (!urlString) return false;

  try {
    return isLocalHostname(new URL(urlString).hostname);
  } catch {
    return isLocalHostname(urlString.split(':')[0].split('/')[0]);
  }
}
