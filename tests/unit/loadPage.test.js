import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/routing/pageRegistry.js', () => ({
  getPage: () => ({
    loadConfig: async () => ({
      default: {
        id: 'home',
        title: 'IMPACT',
        description: 'd',
        keywords: 'k',
        favicon: '/favicon.svg',
        appleTouchIcon: '/favicon.svg',
        productName: 'IMPACT',
        logos: { header: '/h.png' },
      },
    }),
    loadHtml: async () => '<img data-brand="header-logo" src="" alt="" />',
  }),
}));

import { loadPage } from '../../src/routing/loadPage.js';
import { store } from '../../src/middleware/redux/store.js';

describe('loadPage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    document.head.innerHTML = '';
    document.title = '';
  });

  it('injects html, sets redux meta, and applies head/branding', async () => {
    await loadPage('home');
    expect(document.getElementById('app').innerHTML).toContain('data-brand="header-logo"');
    expect(store.getState().pageMeta.current.title).toBe('IMPACT');
    expect(document.title).toBe('IMPACT');
    expect(document.querySelector('[data-brand="header-logo"]').getAttribute('src')).toBe('/h.png');
  });
});
