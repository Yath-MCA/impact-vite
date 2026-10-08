import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/middleware/providers/apiService', () => ({
  apiService: { makeRequest: vi.fn() },
  API_ENDPOINTS: { GET_DOCS: '/mock/getdocs' },
}));

import { apiService } from '../../src/middleware/providers/apiService';
import {
  END_TIMER_MINUTES,
  fireMaintenanceAlert,
  initMaintenance,
  parseEpoch,
  resetMaintenanceState,
} from '../../src/pages/landing/maintenanceGuard.js';

describe('parseEpoch', () => {
  it('parses numeric strings and objects', () => {
    expect(parseEpoch('1700000000000')).toBe(1700000000000);
    expect(parseEpoch({ $numberLong: '1700000000000' })).toBe(1700000000000);
    expect(parseEpoch(null)).toBe(0);
  });
});

describe('initMaintenance schedule window', () => {
  beforeEach(() => {
    resetMaintenanceState();
    vi.mocked(apiService.makeRequest).mockReset();
  });

  it('sets ON and ALERT_START for a future window', async () => {
    const start = Date.now() + 60 * 60 * 1000; // +1h
    const state = await initMaintenance({
      init: false,
      start,
      end: start + END_TIMER_MINUTES * 60 * 1000,
    });
    expect(state.ON).toBe(true);
    expect(state.ALERT_START).toBeLessThan(state.START);
    expect(state.canShowAlert).toBe(true); // within default 48h before
    expect(state.messageHtml).toContain('scheduled maintenance');
  });

  it('clears ON when start is in the past', async () => {
    const start = Date.now() - 60 * 1000;
    const state = await initMaintenance({ init: false, start });
    expect(state.ON).toBe(false);
  });

  it('loads from GET_DOCS when init:true', async () => {
    const start = Date.now() + 2 * 60 * 60 * 1000;
    vi.mocked(apiService.makeRequest).mockResolvedValue({
      data: [{ starttime: start, endtime: start + 2 * 60 * 60 * 1000, status: 'active' }],
    });
    const state = await initMaintenance({ init: true });
    expect(apiService.makeRequest).toHaveBeenCalled();
    expect(state.ON).toBe(true);
  });
});

describe('fireMaintenanceAlert', () => {
  beforeEach(() => {
    resetMaintenanceState();
  });

  it('returns false when not ON', () => {
    expect(fireMaintenanceAlert()).toBe(false);
  });

  it('returns html when returnText and schedule active', async () => {
    const start = Date.now() + 30 * 60 * 1000;
    await initMaintenance({ init: false, start });
    const html = fireMaintenanceAlert({ returnText: true });
    expect(typeof html).toBe('string');
    expect(html).toContain('scheduled maintenance');
  });
});
