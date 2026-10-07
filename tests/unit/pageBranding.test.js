import { beforeEach, describe, expect, it } from 'vitest';
import { applyPageBranding } from '../../src/shared/pageBranding.js';

describe('applyPageBranding', () => {
  let root;

  beforeEach(() => {
    root = document.createElement('div');
    root.innerHTML = `
      <img data-brand="header-logo" src="" alt="" />
      <img data-brand="login-logo" src="" alt="" />
    `;
  });

  it('sets logo src and alt from config', () => {
    applyPageBranding(root, {
      productName: 'IMPACT',
      logos: {
        header: '/img/header.png',
        login: '/img/login.svg',
      },
    });

    expect(root.querySelector('[data-brand="header-logo"]').getAttribute('src')).toBe('/img/header.png');
    expect(root.querySelector('[data-brand="header-logo"]').getAttribute('alt')).toBe('IMPACT');
    expect(root.querySelector('[data-brand="login-logo"]').getAttribute('src')).toBe('/img/login.svg');
  });

  it('skips missing brand nodes and missing logo keys', () => {
    root.innerHTML = `<img data-brand="header-logo" src="old" alt="x" />`;
    applyPageBranding(root, { productName: 'IMPACT', logos: { login: '/img/login.svg' } });
    expect(root.querySelector('[data-brand="header-logo"]').getAttribute('src')).toBe('old');
  });
});
