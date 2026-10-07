export function applyPageBranding(root, config) {
  if (!root || !config) return;
  const logos = config.logos || {};
  const alt = config.productName || '';

  const header = root.querySelector('[data-brand="header-logo"]');
  if (header && logos.header) {
    header.setAttribute('src', logos.header);
    header.setAttribute('alt', alt);
  }

  const login = root.querySelector('[data-brand="login-logo"]');
  if (login && logos.login) {
    login.setAttribute('src', logos.login);
    login.setAttribute('alt', alt);
  }
}
