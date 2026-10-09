import { describe, expect, it } from 'vitest';
import {
  buildEditorRedirectHash,
  buildLandingAcceptContext,
} from '../../src/pages/landing/landingSessionBridge.js';

describe('buildEditorRedirectHash', () => {
  it('appends docid like legacy editor6.html?docid=', () => {
    expect(buildEditorRedirectHash('Ncc0d3efc-e28e-4ba5-9878-d6f0fc42b32b')).toBe(
      '#/editor?docid=Ncc0d3efc-e28e-4ba5-9878-d6f0fc42b32b'
    );
  });

  it('falls back without docid', () => {
    expect(buildEditorRedirectHash('')).toBe('#/editor');
  });
});

describe('buildLandingAcceptContext', () => {
  it('maps docData fields into ctx with docid redirect', () => {
    const ctx = buildLandingAcceptContext(
      { docid: 'D1', apikey: 'k', emailto: 'a@b.c', rolename: 'Author' },
      { onError: () => {} }
    );
    expect(ctx.docId).toBe('D1');
    expect(ctx.resData.docid).toBe('D1');
    expect(ctx.redirectUrl).toBe('#/editor?docid=D1');
    expect(typeof ctx.onRedirect).toBe('function');
    expect(typeof ctx.onCommitStorage).toBe('function');
  });
});
