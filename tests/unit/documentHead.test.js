import { beforeEach, describe, expect, it } from 'vitest';
import { applyDocumentHead } from '../../src/shared/documentHead.js';

describe('applyDocumentHead', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  it('sets title and upserts meta and favicon links', () => {
    applyDocumentHead({
      id: 'home',
      title: 'IMPACT',
      description: 'Online proofing',
      keywords: 'impact,proofing',
      favicon: '/favicon.svg',
      appleTouchIcon: '/favicon.svg',
      productName: 'IMPACT',
      logos: {},
    });

    expect(document.title).toBe('IMPACT');
    expect(document.querySelector('meta[name="description"]')?.content).toBe('Online proofing');
    expect(document.querySelector('meta[name="keywords"]')?.content).toBe('impact,proofing');
    expect(document.querySelector('link[rel="icon"]')?.href).toContain('/favicon.svg');
    expect(document.querySelector('link[rel="apple-touch-icon"]')?.href).toContain('/favicon.svg');
  });

  it('updates existing tags on second call', () => {
    applyDocumentHead({
      id: 'home',
      title: 'IMPACT',
      description: 'A',
      keywords: 'a',
      favicon: '/favicon.svg',
      appleTouchIcon: '/favicon.svg',
      productName: 'IMPACT',
      logos: {},
    });
    applyDocumentHead({
      id: 'login',
      title: 'IMPACT | Log In',
      description: 'B',
      keywords: 'b',
      favicon: '/favicon.svg',
      appleTouchIcon: '/favicon.svg',
      productName: 'IMPACT',
      logos: {},
    });

    expect(document.title).toBe('IMPACT | Log In');
    expect(document.querySelectorAll('link[rel="icon"]').length).toBe(1);
    expect(document.querySelector('meta[name="description"]')?.content).toBe('B');
  });
});
