import { describe, expect, it } from 'vitest';
import { store } from '../../src/middleware/redux/store.js';
import { setPageMeta, clearPageMeta } from '../../src/middleware/redux/pageMetaSlice.js';

describe('pageMeta slice', () => {
  it('stores current page config', () => {
    const cfg = { id: 'home', title: 'IMPACT', logos: {} };
    store.dispatch(setPageMeta(cfg));
    expect(store.getState().pageMeta.current).toEqual(cfg);
    store.dispatch(clearPageMeta());
    expect(store.getState().pageMeta.current).toBeNull();
  });
});
