function upsertMeta(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content ?? '');
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href ?? '');
}

export function applyDocumentHead(config) {
  if (!config) return;
  document.title = config.title ?? '';
  upsertMeta('description', config.description ?? '');
  upsertMeta('keywords', config.keywords ?? '');
  if (config.favicon) upsertLink('icon', config.favicon);
  if (config.appleTouchIcon) upsertLink('apple-touch-icon', config.appleTouchIcon);
}
