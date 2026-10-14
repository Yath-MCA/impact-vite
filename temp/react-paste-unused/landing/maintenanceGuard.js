/**
 * Port of legacy window.MAINTENANCE: DB-driven upcoming window, 48h alert,
 * informational toast. Never blocks urlvalidity.
 */
import Swal from 'sweetalert2';
import { apiService, API_ENDPOINTS } from '../api/apiService.js';
import { getLandingMessage, LandingMessageKey } from '../../features/landing/messages/index.js';

/** Minutes. Legacy END_TIMER = 2 * 60 (used with moment.add(..., "minutes")). */
export const END_TIMER_MINUTES = 2 * 60;
/** Minutes. Legacy BEFORE_TIMER = 48 * 60. */
export const BEFORE_TIMER_MINUTES = 48 * 60;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let ON = false;
let START = 0;
let END = 0;
let ALERT_START = 0;
let T1 = '';
let T1A = '';
let T2 = '';
let T2A = '';
let messageHtml = '';

export function resetMaintenanceState() {
  ON = false;
  START = 0;
  END = 0;
  ALERT_START = 0;
  T1 = '';
  T1A = '';
  T2 = '';
  T2A = '';
  messageHtml = '';
  syncWindow();
}

export function parseEpoch(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'object') {
    return parseEpoch(value.$numberLong ?? value.numberLong ?? value.$date ?? value.valueOf?.());
  }
  const n = typeof value === 'string' ? Number(value) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatLocalParts(ms) {
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return {
    dateTime: `${day}-${month}-${year} ${hours}:${minutes}`,
    meridiem
  };
}

function interpolateMessage() {
  const entry = getLandingMessage(LandingMessageKey.SCHEDULED_MAINTENANCE, {
    T1,
    T1A,
    T2,
    T2A
  });
  messageHtml = entry?.text || '';
  return messageHtml;
}

function applySchedule({ start, end, showBefore } = {}) {
  const now = Date.now();
  START = parseEpoch(start);
  const parsedEnd = parseEpoch(end);
  END = parsedEnd || (START ? START + END_TIMER_MINUTES * 60 * 1000 : 0);

  if (START > now && END > now) {
    ON = true;
    const beforeMin =
      showBefore != null && showBefore !== ''
        ? Number(showBefore)
        : BEFORE_TIMER_MINUTES;
    const beforeMs = (Number.isFinite(beforeMin) ? beforeMin : BEFORE_TIMER_MINUTES) * 60 * 1000;
    ALERT_START = START - beforeMs;
    const startParts = formatLocalParts(START);
    const endParts = formatLocalParts(END);
    T1 = startParts.dateTime;
    T1A = startParts.meridiem;
    T2 = endParts.dateTime;
    T2A = endParts.meridiem;
    interpolateMessage();
  } else {
    ON = false;
    ALERT_START = 0;
    T1 = '';
    T1A = '';
    T2 = '';
    T2A = '';
    messageHtml = '';
  }
  syncWindow();
}

function extractFirstRow(response) {
  if (!response) return null;
  if (Array.isArray(response) && response.length) return response[0];
  const lists = [response.data, response.body, response.docs, response.result];
  for (const list of lists) {
    if (Array.isArray(list) && list.length) return list[0];
  }
  if (response.starttime || response.starttime) return response;
  return null;
}

function syncWindow() {
  if (typeof window === 'undefined') return;
  const previous = window.MAINTENANCE && typeof window.MAINTENANCE === 'object' ? window.MAINTENANCE : {};
  window.MAINTENANCE = {
    ...previous,
    ON,
    START,
    END,
    ALERT_START,
    T1,
    T1A,
    T2,
    T2A,
    Init: initMaintenance,
    fire: fireMaintenanceAlert
  };
}

export function getMaintenanceState() {
  return {
    ON,
    active: ON,
    START,
    start: START ? String(START) : '',
    END,
    ALERT_START,
    T1,
    T1A,
    T2,
    T2A,
    canShowAlert: Boolean(ON && Date.now() >= ALERT_START),
    messageHtml
  };
}

export async function checkMaintenanceDb() {
  try {
    const response = await apiService.makeRequest(API_ENDPOINTS.GET_DOCS, {
      tbl: 'ServerMaintenance',
      tbl: 'ServerMaintenance',
      find: { status: 'active', starttime: { $gt: Date.now() } },
      length: 1,
      sort: { starttime: 1 }
    });
    const row = extractFirstRow(response);
    if (row) {
      applySchedule({
        start: row.starttime ?? row.starttime,
        end: row.endtime ?? row.endtime
      });
    } else {
      applySchedule({});
    }
  } catch {
    applySchedule({});
  }
  return getMaintenanceState();
}

/**
 * @param {{ init?: boolean, start?: *, end?: *, showBefore?: number }} options
 */
export async function initMaintenance(options = {}) {
  const { init = false, start, end, showBefore } = options;
  if (init) {
    await checkMaintenanceDb();
    return getMaintenanceState();
  }
  if (start != null && start !== '') {
    applySchedule({ start, end, showBefore });
  }
  syncWindow();
  return getMaintenanceState();
}

/**
 * Informational toast only. Never throws into the landing error path.
 * @param {{ returnText?: boolean, debug?: boolean }} options
 */
export function fireMaintenanceAlert(options = {}) {
  const { returnText = false, debug = false } = options;
  try {
    if (!ON) return false;
    const forceAlert = Boolean(debug && import.meta.env && import.meta.env.DEV);
    const canShow = forceAlert || Date.now() >= ALERT_START;
    if (!canShow) return false;

    const html = messageHtml || interpolateMessage();
    if (returnText) return html;

    const Toast = Swal.mixin({
      toast: true,
      position: 'top',
      showConfirmButton: false
    });
    Toast.fire({ html, icon: 'info' });
    return true;
  } catch {
    return false;
  }
}
