import { describe, expect, it } from 'vitest';
import { getLandingMessage, LandingMessageKey } from '../../src/pages/landing/messages/index.js';

describe('SCHEDULED_MAINTENANCE message', () => {
  it('interpolates start/end local parts', () => {
    const entry = getLandingMessage(LandingMessageKey.SCHEDULED_MAINTENANCE, {
      T1: '08-Oct-2026 10:00',
      T1A: 'AM',
      T2: '08-Oct-2026 12:00',
      T2A: 'PM',
    });
    expect(entry).toBeTruthy();
    expect(entry.text).toContain('08-Oct-2026 10:00');
    expect(entry.text).toContain('AM');
    expect(entry.text).toContain('08-Oct-2026 12:00');
    expect(entry.text).toContain('PM');
    expect(entry.text).not.toMatch(/\{\{T\d/);
  });

  it('keeps INVALID catalog entry for fail path', () => {
    const entry = getLandingMessage(LandingMessageKey.INVALID);
    expect(entry.title).toMatch(/invalid/i);
    expect(entry.type).toBe('error');
  });
});
