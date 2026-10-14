import { describe, expect, it } from 'vitest';
import {
  parsePageQueryParams,
  resolvePageQueryString,
} from '../../src/pages/editor/resolvePageQueryString.js';

describe('resolvePageQueryString', () => {
  it('reads docid from hash when search is empty', () => {
    const q = resolvePageQueryString('', '#/editor?docid=ABC');
    expect(parsePageQueryParams(q).docid).toBe('ABC');
  });

  it('prefers location.search over hash', () => {
    const q = resolvePageQueryString(
      '?docid=LEGACY',
      '#/editor?docid=HASH'
    );
    expect(parsePageQueryParams(q).docid).toBe('LEGACY');
  });
});
