import { sessionConfig } from './sessionConfig.js';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'focus', 'scroll', 'touchstart'];

/**
 * Client-side inactivity watchdog. Calls onIdle once after timeoutMs of no
 * tracked activity; any tracked activity resets the timer. Returns a stop()
 * function that clears the timer and removes all listeners.
 */
export function startIdleTimeoutWatcher({ timeoutMs = sessionConfig.idleTimeoutMs, onIdle } = {}) {
  if (typeof window === 'undefined' || typeof onIdle !== 'function') {
    return () => {};
  }

  let timer = null;

  function reset() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onIdle, timeoutMs);
  }

  ACTIVITY_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, reset, { passive: true });
  });

  reset();

  return function stopIdleTimeoutWatcher() {
    if (timer) clearTimeout(timer);
    timer = null;
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, reset);
    });
  };
}
