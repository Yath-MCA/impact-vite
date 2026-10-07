import { describe, expect, it } from 'vitest';
import { resolveAuthRedirect } from '../../src/core/router/resolveAuthRedirect.js';

describe('resolveAuthRedirect', () => {
  it('redirects unauthenticated users to login', () => {
    expect(
      resolveAuthRedirect({
        loading: false,
        isAuthenticated: false,
        requireAdmin: false,
        isAdmin: false,
      }),
    ).toBe('/login');
  });

  it('allows authenticated users through', () => {
    expect(
      resolveAuthRedirect({
        loading: false,
        isAuthenticated: true,
        requireAdmin: false,
        isAdmin: false,
      }),
    ).toBeNull();
  });
});
