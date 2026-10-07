import { describe, expect, it } from 'vitest';
import home from '../../src/pages/home/page.config.js';
import login from '../../src/pages/login/page.config.js';
import editor from '../../src/pages/editor/page.config.js';
import dashboard from '../../src/pages/dashboard/page.config.js';

const required = ['id', 'title', 'favicon', 'appleTouchIcon', 'productName', 'logos'];

describe('page configs', () => {
  it.each([
    ['home', home],
    ['login', login],
    ['editor', editor],
    ['dashboard', dashboard],
  ])('%s has required keys and matching id', (id, cfg) => {
    for (const key of required) {
      expect(cfg).toHaveProperty(key);
    }
    expect(cfg.id).toBe(id);
  });
});
