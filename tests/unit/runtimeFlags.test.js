import { describe, expect, it } from 'vitest';
import { isLocalHost } from '../../src/middleware/session/runtimeFlags.js';

describe('isLocalHost', () => {
  it('detects localhost urls', () => {
    expect(isLocalHost('http://localhost:5173/#/login')).toBe(true);
    expect(isLocalHost('https://impact.example.com/')).toBe(false);
  });
});
