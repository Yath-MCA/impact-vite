import { describe, expect, it } from 'vitest';
import {
  applyLegacyRoleIds,
  hasCollabClient,
  ROLE_IDS,
} from '../../src/pages/editor/initial_helpers/legacyRoleIds.js';

describe('legacyRoleIds', () => {
  it('ROLE_IDS includes AU and ED shortname targets', () => {
    expect(ROLE_IDS['5b53536b4c4a803e9a5abf70'].shortname).toBe('AU');
    expect(ROLE_IDS['5b534e334c4a803e9a5abf4c'].shortname).toBe('ED');
  });

  it('hasCollabClient recognizes oso', () => {
    const g = { COLLAB_CLIENTS: ['oso', 'oxmedo'] };
    expect(hasCollabClient('oso', g)).toBe(true);
    expect(hasCollabClient('other', g)).toBe(false);
  });

  it('applyLegacyRoleIds sets ROLE_IDS shortname aliases', () => {
    const g = {};
    applyLegacyRoleIds(g);
    expect(g.ROLE_IDS.AU).toBe('5b53536b4c4a803e9a5abf70');
    expect(g.ROLE_IDS.ED).toBe('5b534e334c4a803e9a5abf4c');
    expect(g.hasCollabClient('oso')).toBe(true);
  });
});
