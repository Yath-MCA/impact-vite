import { describe, expect, it } from 'vitest';
import { buildLandingAcceptContext } from '../../src/pages/landing/landingSessionBridge.js';

describe('buildLandingAcceptContext', () => {
  it('maps docData fields into ctx', () => {
    const ctx = buildLandingAcceptContext(
      { docid: 'D1', apikey: 'k', emailto: 'a@b.c', rolename: 'Author' },
      { onError: () => {} }
    );
    expect(ctx.docId).toBe('D1');
    expect(ctx.resData.docid).toBe('D1');
    expect(typeof ctx.onRedirect).toBe('function');
    expect(typeof ctx.onCommitStorage).toBe('function');
  });
});
