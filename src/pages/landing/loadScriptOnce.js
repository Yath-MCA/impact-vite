const loadedScripts = new Set();

export function loadScriptOnce(src) {
  if (loadedScripts.has(src) || document.querySelector(`script[data-landing-src="${src}"]`)) {
    loadedScripts.add(src);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.dataset.landingSrc = src;
    el.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    el.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(el);
  });
}
