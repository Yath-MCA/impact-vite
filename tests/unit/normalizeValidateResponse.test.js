import { describe, expect, it } from 'vitest';
import {
  assertValidateAccess,
  normalizeValidateResponse,
} from '../../src/shared/utils/normalizeValidateResponse.js';

describe('assertValidateAccess', () => {
  it('passes a successful payload', () => {
    const res = { success: true, data: { docid: 'd1', title: 'Doc' } };
    expect(assertValidateAccess(res)).toBe(res);
  });

  it('throws expired', () => {
    expect(() => assertValidateAccess({ code: 'expired', message: 'gone' })).toThrow(/gone/);
    try {
      assertValidateAccess({ code: 'expired', message: 'gone' });
    } catch (e) {
      expect(e.code).toBe('expired');
    }
  });

  it('throws file_deleted', () => {
    try {
      assertValidateAccess({ code: 'file_deleted', message: 'missing' });
    } catch (e) {
      expect(e.code).toBe('file_deleted');
    }
  });

  it('throws invalid on success:false', () => {
    try {
      assertValidateAccess({ success: false, message: 'bad link' });
    } catch (e) {
      expect(e.code).toBe('invalid');
    }
  });
});

describe('normalizeValidateResponse', () => {
  it('flattens nested data', () => {
    const flat = normalizeValidateResponse({
      data: { docid: '42', title: 'Proof', rolename: 'Author', client: 'acme' },
    });
    expect(flat).toMatchObject({
      docid: '42',
      title: 'Proof',
      rolename: 'Author',
      client: 'acme',
    });
  });
});
