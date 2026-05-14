/**
 * *Arr Deck — API Client
 *
 * fetch-based HTTP client for *arr API communication.
 * Works in browser WebView environment (no Node.js specific APIs).
 */

import { getService, getApiBaseUrl } from './service-registry.js';

/**
 * Create an *arr API client for a specific service.
 * @param {string} serviceId
 * @param {string} baseUrl - Full URL to the *arr service (e.g., "http://localhost:8989")
 * @param {string} apiKey - X-Api-Key value
 * @param {number} [timeoutMs=5000] - Request timeout in ms
 * @returns {object} API client with convenience methods
 */
export function createArrClient(serviceId, baseUrl, apiKey, timeoutMs = 5000) {
  const svc = getService(serviceId);
  if (!svc) {
    throw new Error(`Unknown service: ${serviceId}`);
  }
  const apiBase = getApiBaseUrl(serviceId, baseUrl);

  /**
   * Fetch wrapper with timeout, error handling, and auth.
   * @param {string} path - URL path relative to API base (e.g., "system/status")
   * @param {object} [options]
   * @param {object} [options.body] - POST body (will be JSON.stringify'd)
   * @param {string} [options.method] - HTTP method (default: GET for no body, POST with body)
   * @returns {Promise<{success: boolean, data?: any, error?: {message: string, status: number}}>}
   */
  async function request(path, options = {}) {
    const method = options.method || (options.body ? 'POST' : 'GET');
    const url = `${apiBase}/${path.replace(/^\//, '')}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fetchOptions = {
        method,
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      };

      if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorBody = await response.json();
          if (errorBody.message) errorMessage = errorBody.message;
        } catch {
          try {
            errorMessage = await response.text();
          } catch {}
        }
        return {
          success: false,
          error: { message: errorMessage, status: response.status },
        };
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { success: true, data: null };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return { success: false, error: { message: 'Request timed out', status: 0 } };
      }
      return {
        success: false,
        error: { message: err.message || 'Network error', status: 0 },
      };
    }
  }

  // --- Convenience methods ---

  /** GET /system/status */
  async function systemStatus() {
    return request('system/status');
  }

  /** GET /health */
  async function getHealth() {
    return request('health');
  }

  /** GET /queue */
  async function getQueue(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.pageSize) query.set('pageSize', params.pageSize);
    if (params.sortKey) query.set('sortKey', params.sortKey);
    if (params.sortDir) query.set('sortDir', params.sortDir);
    const qs = query.toString();
    return request(`queue${qs ? '?' + qs : ''}`);
  }

  /** GET /queue/status */
  async function getQueueStatus() {
    return request('queue/status');
  }

  /** POST /command */
  async function executeCommand(name, args = {}) {
    return request('command', {
      method: 'POST',
      body: { name, ...args },
    });
  }

  /** GET /command */
  async function getCommands() {
    return request('command');
  }

  /** GET /command/{id} */
  async function getCommand(id) {
    return request(`command/${id}`);
  }

  /** GET /calendar */
  async function getCalendar(start, end, unmonitored = false) {
    const query = new URLSearchParams({ start, end });
    if (unmonitored) query.set('unmonitored', 'true');
    return request(`calendar?${query.toString()}`);
  }

  /** GET /wanted/missing */
  async function getWantedMissing(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.pageSize) query.set('pageSize', params.pageSize);
    if (params.sortKey) query.set('sortKey', params.sortKey);
    if (params.sortDir) query.set('sortDir', params.sortDir);
    const qs = query.toString();
    return request(`wanted/missing${qs ? '?' + qs : ''}`);
  }

  /** GET /wanted/cutoff */
  async function getWantedCutoff(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.pageSize) query.set('pageSize', params.pageSize);
    const qs = query.toString();
    return request(`wanted/cutoff${qs ? '?' + qs : ''}`);
  }

  /** GET /{resource} — list all resources (series, movie, artist, book, indexer) */
  async function listResources() {
    return request(svc.resourceName);
  }

  /** GET /{resource}/{id} */
  async function getResource(id) {
    return request(`${svc.resourceName}/${id}`);
  }

  /** Generic GET request */
  async function get(path) {
    return request(path);
  }

  /** Generic POST request */
  async function post(path, body) {
    return request(path, { method: 'POST', body });
  }

  /** Generic DELETE request */
  async function del(path) {
    return request(path, { method: 'DELETE' });
  }

  return {
    get,
    post,
    delete: del,
    systemStatus,
    getHealth,
    getQueue,
    getQueueStatus,
    executeCommand,
    getCommands,
    getCommand,
    getCalendar,
    getWantedMissing,
    getWantedCutoff,
    listResources,
    getResource,
    _serviceId: serviceId,
    _apiBase: apiBase,
  };
}
