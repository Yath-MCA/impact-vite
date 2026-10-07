import { describe, expect, it } from 'vitest';
import { store } from '../../src/middleware/redux/store.js';

describe('merged store', () => {
  it('exposes pageMeta modules and capabilityCatalog', () => {
    const state = store.getState();
    expect(state).toHaveProperty('pageMeta');
    expect(state).toHaveProperty('modules');
    expect(state).toHaveProperty('capabilityCatalog');
    expect(state).toHaveProperty('panel');
  });
});
