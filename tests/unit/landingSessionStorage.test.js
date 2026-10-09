import { describe, expect, it, beforeEach } from 'vitest';
import {
  getSessionIdKey,
  writeSessionDualGuardKeys,
  saveLegacyShareLocalStorage,
} from '../../src/pages/landing/landingSessionStorage.js';

describe('landingSessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('writes docid, session id, redirect, and sessionbackup', () => {
    writeSessionDualGuardKeys({
      docId: 'D1',
      sessionId: 'S1',
      redirectUrl: 'http://localhost/#/editor',
    });
    expect(sessionStorage.getItem('docid')).toBe('D1');
    expect(sessionStorage.getItem(getSessionIdKey('D1'))).toBe('S1');
    expect(sessionStorage.getItem('redirect')).toContain('#/editor');
    const backup = JSON.parse(localStorage.getItem('xmleditor:sessionbackup:D1'));
    expect(backup[getSessionIdKey('D1')]).toBe('S1');
  });

  it('writes legacy share localStorage when apikey present', () => {
    saveLegacyShareLocalStorage({
      docid: 'D1',
      apikey: 'k',
      emailto: 'a@b.c',
      role: '1',
    });
    expect(localStorage.getItem('xmleditor:apikey')).toBe('k');
    expect(localStorage.getItem('xmleditor:shared:D1')).toBeTruthy();
  });
});
