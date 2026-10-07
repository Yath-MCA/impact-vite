import { getPage } from './pageRegistry.js';
import { extractBodyHtml } from '../shared/extractBody.js';
import { applyDocumentHead } from '../shared/documentHead.js';
import { applyPageBranding } from '../shared/pageBranding.js';
import { store } from '../middleware/redux/store.js';
import { setPageMeta } from '../middleware/redux/pageMetaSlice.js';

export async function loadPage(id) {
  const entry = getPage(id);
  const [{ default: config }, html] = await Promise.all([
    entry.loadConfig(),
    entry.loadHtml(),
  ]);

  const app = document.getElementById('app');
  if (!app) throw new Error('#app not found');

  app.innerHTML = extractBodyHtml(html);
  store.dispatch(setPageMeta(config));
  applyDocumentHead(config);
  applyPageBranding(app, config);

  app.dataset.pageId = id;
}
