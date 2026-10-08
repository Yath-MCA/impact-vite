import { describe, expect, it } from 'vitest';
import {
  checkBrowserCompatibility,
  isBrowserSupported,
} from '../../src/middleware/browserCompatibility.js';

const CHROME_120 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CHROME_70 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.0.0 Safari/537.36';

describe('checkBrowserCompatibility', () => {
  it('allows modern Chrome', () => {
    const info = checkBrowserCompatibility(CHROME_120);
    expect(info.browser).toBe('Chrome');
    expect(info.isAllowed).toBe(true);
    expect(info.isCompatible).toBe(true);
    expect(isBrowserSupported(CHROME_120)).toBe(true);
  });

  it('marks unknown UA as unsupported', () => {
    expect(isBrowserSupported('TotallyUnknownBrowser/1.0')).toBe(false);
  });

  it('marks old Chrome below min as incompatible', () => {
    const info = checkBrowserCompatibility(CHROME_70);
    expect(info.browser).toBe('Chrome');
    expect(info.isAllowed).toBe(true);
    expect(info.isCompatible).toBe(false);
    expect(isBrowserSupported(CHROME_70)).toBe(false);
  });
});
