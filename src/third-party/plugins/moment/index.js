/**
 * Moment.js Date Utility Wrapper
 * Centralized date handling with timezone support
 */

import moment from 'moment';

// Default formats
const DEFAULT_FORMATS = {
  date: 'YYYY-MM-DD',
  datetime: 'YYYY-MM-DD HH:mm:ss',
  time: 'HH:mm:ss',
  display: 'MMM DD, YYYY',
  displayWithTime: 'MMM DD, YYYY HH:mm',
  iso: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
};

/**
 * Format a date using moment
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format string or preset
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'display') {
  try {
    if (!date) return '';
    
    const formatString = DEFAULT_FORMATS[format] || format;
    return moment(date).format(formatString);
  } catch (error) {
    console.error('[Moment] Format error:', error);
    return '';
  }
}

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {Date|string|number} date - Date to compare
 * @returns {string} Relative time string
 */
export function fromNow(date) {
  try {
    if (!date) return '';
    return moment(date).fromNow();
  } catch (error) {
    console.error('[Moment] FromNow error:', error);
    return '';
  }
}

/**
 * Parse date string to moment object
 * @param {string} dateString - Date string to parse
 * @param {string} format - Expected format (optional)
 * @returns {moment.Moment|null} Moment object or null
 */
export function parseDate(dateString, format = null) {
  try {
    if (!dateString) return null;
    
    const parsed = format 
      ? moment(dateString, format)
      : moment(dateString);
    
    return parsed.isValid() ? parsed : null;
  } catch (error) {
    console.error('[Moment] Parse error:', error);
    return null;
  }
}

/**
 * Check if date is valid
 * @param {Date|string|number} date - Date to validate
 * @returns {boolean} True if valid
 */
export function isValidDate(date) {
  return moment(date).isValid();
}

/**
 * Add time to date
 * @param {Date|string|number} date - Base date
 * @param {number} amount - Amount to add
 * @param {string} unit - Unit (days, hours, minutes, etc.)
 * @returns {Date} New date
 */
export function addTime(date, amount, unit) {
  try {
    return moment(date).add(amount, unit).toDate();
  } catch (error) {
    console.error('[Moment] Add time error:', error);
    return null;
  }
}

/**
 * Get difference between two dates
 * @param {Date|string|number} dateA - First date
 * @param {Date|string|number} dateB - Second date
 * @param {string} unit - Unit for difference (default: milliseconds)
 * @returns {number} Difference
 */
export function diff(dateA, dateB, unit = 'milliseconds') {
  try {
    return moment(dateA).diff(moment(dateB), unit);
  } catch (error) {
    console.error('[Moment] Diff error:', error);
    return 0;
  }
}

/**
 * Start of time unit
 * @param {Date|string|number} date - Date
 * @param {string} unit - Unit (day, week, month, year)
 * @returns {Date} Start of unit
 */
export function startOf(date, unit) {
  try {
    return moment(date).startOf(unit).toDate();
  } catch (error) {
    console.error('[Moment] StartOf error:', error);
    return null;
  }
}

/**
 * End of time unit
 * @param {Date|string|number} date - Date
 * @param {string} unit - Unit (day, week, month, year)
 * @returns {Date} End of unit
 */
export function endOf(date, unit) {
  try {
    return moment(date).endOf(unit).toDate();
  } catch (error) {
    console.error('[Moment] EndOf error:', error);
    return null;
  }
}

/**
 * Format for datetime-local input
 * @param {Date|string|number} date - Date
 * @returns {string} Formatted for input
 */
export function toDateTimeLocal(date) {
  try {
    return moment(date).format('YYYY-MM-DDTHH:mm');
  } catch (error) {
    console.error('[Moment] toDateTimeLocal error:', error);
    return '';
  }
}

export { moment };

export default {
  formatDate,
  fromNow,
  parseDate,
  isValidDate,
  addTime,
  diff,
  startOf,
  endOf,
  toDateTimeLocal,
  moment
};
