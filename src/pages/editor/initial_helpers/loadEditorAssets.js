const loadedScripts = new Set();
const loadedStyles = new Set();

export function loadScriptOnce(src) {
  if (loadedScripts.has(src) || document.querySelector(`script[data-editor-src="${src}"]`)) {
    loadedScripts.add(src);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.dataset.editorSrc = src;
    el.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    el.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(el);
  });
}

export function loadStylesheetOnce(href) {
  if (loadedStyles.has(href) || document.querySelector(`link[data-editor-href="${href}"]`)) {
    loadedStyles.add(href);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = href;
    el.dataset.editorHref = href;
    el.onload = () => {
      loadedStyles.add(href);
      resolve();
    };
    el.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
    document.head.appendChild(el);
  });
}

export async function loadCkeditorOnce() {
  await loadStylesheetOnce('/ckeditor4/skins/moono-lisa/editor.css');
  await loadScriptOnce('/ckeditor4/ckeditor.js');
  if (typeof window.CKEDITOR === 'undefined') {
    throw new Error('CKEDITOR global missing after script load');
  }
}
