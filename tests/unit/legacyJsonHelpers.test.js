import { beforeEach, describe, expect, it } from 'vitest';
import {
  ADD_DEFAULT_KEYS,
  applyLegacyJsonHelpers,
  GET_JSON,
} from '../../src/pages/editor/initial_helpers/legacyJsonHelpers.js';

describe('legacyJsonHelpers', () => {
  beforeEach(() => {
    window.DOC_ID = 'doc-1';
    window.USER_INFO = {
      MAIL_ID: 'u@example.com',
      ROLE_ID: 'role-1',
      TRACK_ROLE_NAME: 'Author',
    };
    window.SHARED_KEY = {
      client: 'oso',
      docid: 'doc-1',
      dtd: 'book',
      type: 'xml',
      identifier: '10.1/x',
      projecttitle: 'T',
      linkinfo: '',
      vendor: 'v',
    };
    window.IS_JOURNAL = false;
    sessionStorage.setItem('xmleditor:sessionid:doc-1', 'sess-abc');
  });

  it('ADD_DEFAULT_KEYS fills default shape', () => {
    const out = ADD_DEFAULT_KEYS('default');
    expect(out.client).toBe('oso');
    expect(out.docid).toBe('doc-1');
    expect(out.username).toBe('u@example.com');
    expect(out.session_id).toBe('sess-abc');
  });

  it('GET_JSON openhtml builds Fileslist find', () => {
    const out = GET_JSON('openhtml');
    expect(out.tbl).toBe('Fileslist');
    expect(out.find).toEqual({ recent: 1, docid: 'doc-1' });
    expect(out.length).toBe(1);
  });

  it('GET_JSON Shareandinvite status checks signoff find', () => {
    window.SHARED_KEY._id = 'share-id-1';
    const out = GET_JSON('Shareandinvite', { status: true }, 'signoff');
    expect(out.tbl).toBe('Shareandinvite');
    expect(out.find.id).toBe('share-id-1');
    expect(out.find.status).toBe('signoff');
    expect(out.client).toBe('oso');
  });

  it('GET_JSON unknown params returns empty object', () => {
    const out = GET_JSON('not_a_real_case');
    expect(out).toEqual({});
  });

  it('applyLegacyJsonHelpers exposes GET_JSON', () => {
    const g = {};
    applyLegacyJsonHelpers(g);
    expect(typeof g.GET_JSON).toBe('function');
    expect(typeof g.ADD_DEFAULT_KEYS).toBe('function');
  });
});
