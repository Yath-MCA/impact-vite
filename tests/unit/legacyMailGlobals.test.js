import { describe, expect, it } from 'vitest';
import { applyLegacyGlobals } from '../../src/pages/editor/initial_helpers/legacyGlobals.js';
import { GET_SENDER_RECEIVER_ID } from '../../src/shared/legacyMailGlobals.js';

describe('legacyMailGlobals via applyLegacyGlobals', () => {
  it('exposes ADMIN_USER_IDs and GET_SENDER_RECEIVER_ID', () => {
    applyLegacyGlobals();
    expect(Array.isArray(window.ADMIN_USER_IDs)).toBe(true);
    expect(window.ADMIN_USER_IDs.length).toBeGreaterThanOrEqual(1);
    expect(typeof window.GET_SENDER_RECEIVER_ID).toBe('function');
    expect(window.GET_SENDER_RECEIVER_ID).toBe(GET_SENDER_RECEIVER_ID);
  });

  it('GET_SENDER_RECEIVER_ID HELP_DESK returns decoded DEFAULT mail', () => {
    applyLegacyGlobals();
    const help = window.GET_SENDER_RECEIVER_ID('HELP_DESK');
    expect(help).toEqual({
      TEXT: 'impact.helpdesk@newgen.co',
      MAIL: 'impact.notification@newgen.co',
    });
  });
});
