import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMPACT_LOGO_SRC,
  pickLogoSlot,
  resolveLogoSrc,
} from '../../src/pages/landing/landingLogos.js';

describe('landingLogos', () => {
  it('resolves bare filename under clients folder', () => {
    expect(resolveLogoSrc('PLOS_WHITE.svg')).toBe('/assets/logo/clients/PLOS_WHITE.svg');
    expect(resolveLogoSrc(null)).toBe(DEFAULT_IMPACT_LOGO_SRC);
  });

  it('prefers journal slot for jats dtd', () => {
    const cfg = {
      'header-logo': { name: 'TNF.svg' },
      'journal-header-logo': { name: 'TNF_JORUNAL.svg' },
    };
    expect(pickLogoSlot(cfg, 'header-logo', 'jats').name).toBe('TNF_JORUNAL.svg');
    expect(pickLogoSlot(cfg, 'header-logo', 'book').name).toBe('TNF.svg');
  });
});
