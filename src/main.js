import $ from 'jquery';
window.$ = $;
window.jQuery = $;
jQuery = $;

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

import { loadPage } from './routing/loadPage.js';
import { mountReactApp, unmountReactApp } from './app/mountReactApp.jsx';
import { applyDocumentHead } from './shared/documentHead.js';
import loginConfig from './pages/login/page.config.js';
import dashboardConfig from './pages/dashboard/page.config.js';

const PAGE_IDS = ['home', 'login', 'editor', 'dashboard'];

function appEl() {
  return document.getElementById('app');
}

async function routeFromHash() {
  const raw = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
  const id = raw.split('/')[0] || 'home';

  if (id === 'login' || id === 'dashboard') {
    unmountReactApp();
    const el = appEl();
    if (el) el.innerHTML = '';
    applyDocumentHead(id === 'login' ? loginConfig : dashboardConfig);
    mountReactApp(el);
    return;
  }

  unmountReactApp();
  const pageId = PAGE_IDS.includes(id) && id !== 'login' && id !== 'dashboard' ? id : 'home';
  await loadPage(pageId === 'editor' ? 'home' : pageId);
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
