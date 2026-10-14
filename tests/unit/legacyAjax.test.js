import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyLegacyAjax, installCallAjax } from '../../src/shared/legacyAjax.js';

describe('legacyAjax', () => {
  beforeEach(() => {
    window.commonfn = undefined;
    window.USER_INFO = {
      MAIL_ID: 'u@example.com',
      ROLE_ID: 'role-1',
      ROLE_NAME: 'Author',
    };
    window.DOC_ID = 'doc-1';
    window.isCollabEnabled = () => false;
  });

  it('applyLegacyAjax installs commonfn.callajax', () => {
    window.$ = { ajaxSetup: vi.fn(), ajax: vi.fn() };
    window.jQuery = window.$;
    applyLegacyAjax(window);
    expect(typeof window.commonfn.callajax).toBe('function');
    expect(window.$.ajaxSetup).toHaveBeenCalled();
  });

  it('skips non-local API URLs on localhost', () => {
    const ajax = vi.fn();
    window.$ = { ajaxSetup: vi.fn(), ajax };
    window.jQuery = window.$;
    installCallAjax(window);
    window.commonfn.callajax({ tbl: 'x' }, 'noop', '/xmleditor/getdocs');
    expect(ajax).not.toHaveBeenCalled();
  });

  it('callajax posts jsondata and dispatches commonfn callback', () => {
    const ajax = vi.fn((opts) => {
      opts.success({ ok: true });
    });
    window.$ = { ajaxSetup: vi.fn(), ajax };
    window.jQuery = window.$;
    installCallAjax(window);
    const cb = vi.fn();
    window.commonfn.myPost = cb;
    // Use a local URL so the localhost guard does not skip the call in happy-dom.
    window.commonfn.callajax(
      { tbl: 'Fileslist' },
      'myPost',
      'http://localhost:8080/local/getdocs'
    );
    expect(ajax).toHaveBeenCalled();
    const arg = ajax.mock.calls[0][0];
    expect(arg.url).toBe('http://localhost:8080/local/getdocs');
    const parsed = JSON.parse(arg.data.jsondata);
    expect(parsed.tbl).toBe('Fileslist');
    expect(parsed.username).toBe('u@example.com');
    expect(cb).toHaveBeenCalledWith({ ok: true }, '');
  });
});
