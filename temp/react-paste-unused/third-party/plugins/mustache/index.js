/**
 * Mustache Template Engine Wrapper
 * Safe template rendering with input escaping
 */

import Mustache from 'mustache';

/**
 * Escape HTML entities to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render a Mustache template with data
 * @param {string} template - Mustache template string
 * @param {object} data - Data object to render
 * @param {boolean} escapeInput - Whether to escape user input (default: true)
 * @returns {string} Rendered HTML string
 */
export function renderTemplate(template, data = {}, escapeInput = true) {
  try {
    if (!template || typeof template !== 'string') {
      throw new Error('Template must be a non-empty string');
    }

    // Escape data if required
    let safeData = data;
    if (escapeInput) {
      safeData = Object.keys(data).reduce((acc, key) => {
        const value = data[key];
        if (typeof value === 'string') {
          acc[key] = escapeHtml(value);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {});
    }

    return Mustache.render(template, safeData);
  } catch (error) {
    console.error('[Mustache] Template rendering error:', error);
    throw error;
  }
}

/**
 * Render template to DOM element
 * @param {string} template - Mustache template
 * @param {object} data - Template data
 * @param {HTMLElement} element - Target DOM element
 * @param {boolean} escapeInput - Escape input flag
 */
export function renderToElement(template, data, element, escapeInput = true) {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('Target element must be a valid DOM element');
  }

  const rendered = renderTemplate(template, data, escapeInput);
  element.innerHTML = rendered;
}

/**
 * Compile template for repeated use
 * @param {string} template - Mustache template
 * @returns {function} Compiled render function
 */
export function compileTemplate(template) {
  if (!template || typeof template !== 'string') {
    throw new Error('Template must be a non-empty string');
  }

  return (data = {}) => Mustache.render(template, data);
}

/**
 * Check if template is valid
 * @param {string} template - Template to validate
 * @returns {boolean} True if valid
 */
export function validateTemplate(template) {
  try {
    Mustache.parse(template);
    return true;
  } catch {
    return false;
  }
}

export default {
  renderTemplate,
  renderToElement,
  compileTemplate,
  validateTemplate
};
