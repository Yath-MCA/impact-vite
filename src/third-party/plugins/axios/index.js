/**
 * Axios HTTP Client Configuration
 * Centralized API client with interceptors
 */

import axios from 'axios';
import { getEnv } from '../../utils/env';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: getEnv('BACKEND_DOMAIN', 'http://localhost:8080'),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Log in debug mode
    if (getEnv('DEBUG', false)) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config);
    }

    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add API key from environment
    const apiKey = getEnv('API_KEY');
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }

    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log in debug mode
    if (getEnv('DEBUG', false)) {
      console.log(`[API] Response:`, response);
    }

    return response;
  },
  (error) => {
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      console.error('[API] Response error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });

      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // Request made but no response
      console.error('[API] Network error:', error.request);
    } else {
      // Something else happened
      console.error('[API] Error:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * GET request wrapper
 * @param {string} url - API endpoint
 * @param {object} config - Axios config
 * @returns {Promise} Response promise
 */
export function get(url, config = {}) {
  return apiClient.get(url, config);
}

/**
 * POST request wrapper
 * @param {string} url - API endpoint
 * @param {object} data - Request body
 * @param {object} config - Axios config
 * @returns {Promise} Response promise
 */
export function post(url, data = {}, config = {}) {
  return apiClient.post(url, data, config);
}

/**
 * PUT request wrapper
 * @param {string} url - API endpoint
 * @param {object} data - Request body
 * @param {object} config - Axios config
 * @returns {Promise} Response promise
 */
export function put(url, data = {}, config = {}) {
  return apiClient.put(url, data, config);
}

/**
 * PATCH request wrapper
 * @param {string} url - API endpoint
 * @param {object} data - Request body
 * @param {object} config - Axios config
 * @returns {Promise} Response promise
 */
export function patch(url, data = {}, config = {}) {
  return apiClient.patch(url, data, config);
}

/**
 * DELETE request wrapper
 * @param {string} url - API endpoint
 * @param {object} config - Axios config
 * @returns {Promise} Response promise
 */
export function del(url, config = {}) {
  return apiClient.delete(url, config);
}

/**
 * Set auth token for all requests
 * @param {string} token - JWT token
 */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token);
    apiClient.defaults.headers.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('auth_token');
    delete apiClient.defaults.headers.Authorization;
  }
}

/**
 * Clear auth token
 */
export function clearAuthToken() {
  setAuthToken(null);
}

export { apiClient };

export default {
  get,
  post,
  put,
  patch,
  delete: del,
  setAuthToken,
  clearAuthToken,
  client: apiClient
};
