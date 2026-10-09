import $ from 'jquery';
window.$ = $;
window.jQuery = $;
jQuery = $;

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import './styles/app.css';

import { loadPage } from './routing/loadPage.js';
import { mountReactApp, unmountReactApp } from './app/mountReactApp.jsx';
import { applyDocumentHead } from './shared/documentHead.js';
import loginConfig from './pages/login/page.config.js';
import dashboardConfig from './pages/dashboard/page.config.js';
import landingConfig from './pages/landing/page.config.js';
import editorConfig from './pages/editor/page.config.js';

const PAGE_IDS = ['home', 'login', 'editor', 'dashboard', 'landing'];
const REACT_HASH_IDS = new Set(['login', 'dashboard', 'validateurl']);

function appEl() {
  return document.getElementById('app');
}

function reactDocumentConfig(id) {
  if (id === 'login') return loginConfig;
  if (id === 'dashboard') return dashboardConfig;
  if (id === 'validateurl') return landingConfig;
  return loginConfig;
}

async function routeFromHash() {
  const raw = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
  const id = raw.split('/')[0] || 'home';

  if (REACT_HASH_IDS.has(id)) {
    unmountReactApp();
    const el = appEl();
    if (el) el.innerHTML = '';
    applyDocumentHead(reactDocumentConfig(id));
    mountReactApp(el);
    return;
  }

  if (id === 'editor') {
    unmountReactApp();
    const el = appEl();
    if (el) el.innerHTML = '';
    applyDocumentHead(editorConfig);
    const { mountEditor } = await import('./pages/editor/index.js');
    await mountEditor(el);
    return;
  }

  unmountReactApp();
  const pageId = PAGE_IDS.includes(id) && id !== 'editor' ? id : 'home';
  await loadPage(pageId);
}

window.addEventListener('hashchange', () => {
  routeFromHash().catch(console.error);
});

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-nav]');
  if (!a) return;
  e.preventDefault();
  location.hash = `#/${a.dataset.nav}`;
});

routeFromHash().catch(console.error);
