import $ from 'jquery';
window.$ = $;
window.jQuery = $;
jQuery = $;

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

import { loadPage } from './routing/loadPage.js';

const PAGE_IDS = ['home', 'login', 'editor', 'dashboard'];

async function routeFromHash() {
  const id = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
  const pageId = PAGE_IDS.includes(id) ? id : 'home';
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
