import { extractBodyHtml } from '../../shared/extractBody.js';
import skeletonHtml from './index.html?raw';
import { bootEditor } from './boot.js';

let booting = null;

export async function mountEditor(appEl) {
  if (!appEl) throw new Error('#app not found');
  if (booting) return booting;

  booting = (async () => {
    try {
      // Preserve <body id="Body" class="wrapper-i"> attrs — extractBodyHtml drops the tag.
      appEl.innerHTML = `<div class="wrapper-i" data-class="ignore-events" id="Body">${extractBodyHtml(skeletonHtml)}</div>`;
      appEl.dataset.pageId = 'editor';
      await bootEditor();
    } catch (err) {
      console.error('[editor] boot failed', err);
      appEl.innerHTML = `<div class="tw:p-6 tw:text-red-700" role="alert">
        <h1 class="tw:text-xl tw:font-bold">Editor failed to load</h1>
        <p>${String(err?.message || err)}</p>
      </div>`;
      throw err;
    } finally {
      booting = null;
    }
  })();

  return booting;
}

export default mountEditor;
