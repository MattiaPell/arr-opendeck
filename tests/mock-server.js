/**
 * Mock *arr API responses for unit testing.
 */

export const MOCK_SONARR_STATUS = {
  appName: 'Sonarr',
  version: '4.0.0',
  startTime: '2026-01-01T00:00:00Z',
  branch: 'develop',
  urlBase: '',
};

export const MOCK_RADARR_STATUS = {
  appName: 'Radarr',
  version: '5.0.0',
  startTime: '2026-01-01T00:00:00Z',
  branch: 'main',
};

export const MOCK_HEALTH_OK = [
  { source: 'Test', type: 'Ok', message: 'All good', wikiUrl: '' },
];

export const MOCK_HEALTH_ERROR = [
  { source: 'Test', type: 'Ok', message: 'OK' },
  { source: 'DB', type: 'Error', message: 'Migration failed' },
];

export const MOCK_HEALTH_WARNING = [
  { source: 'Test', type: 'Ok', message: 'OK' },
  { source: 'Storage', type: 'Warning', message: 'Disk space low' },
];

export const MOCK_QUEUE_EMPTY = {
  page: 1,
  pageSize: 10,
  totalRecords: 0,
  records: [],
};

export const MOCK_QUEUE_ACTIVE = {
  page: 1,
  pageSize: 50,
  totalRecords: 3,
  records: [
    { id: 1, status: 'downloading', title: 'Test Movie', timeleft: '00:05:00' },
    { id: 2, status: 'downloading', title: 'Another', timeleft: '00:10:00' },
    { id: 3, status: 'queued', title: 'Waiting', timeleft: null },
  ],
};

export const MOCK_QUEUE_STATUS_ACTIVE = {
  totalCount: 3,
  count: 2,
  errors: 0,
  warnings: 0,
  unknownCount: 0,
};

export const MOCK_QUEUE_STATUS_ERROR = {
  totalCount: 5,
  count: 2,
  errors: 2,
  warnings: 1,
  unknownCount: 0,
};

export const MOCK_WANTED_MISSING = {
  page: 1,
  pageSize: 1,
  totalRecords: 5,
  records: [{ id: 1, title: 'Missing Episode' }],
};

export const MOCK_WANTED_NONE = {
  page: 1,
  pageSize: 1,
  totalRecords: 0,
  records: [],
};

export const MOCK_SERIES_LIST = Array.from({ length: 245 }, (_, i) => ({
  id: i + 1,
  title: `Series ${i + 1}`,
  monitored: Math.random() > 0.2,
  added: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
}));

export const MOCK_CALENDAR_UPCOMING = [
  { title: 'Severance S2E4', airDate: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
  { title: 'The Bear S3E2', airDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0] },
  { title: 'Andor S1E8', airDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0] },
  { title: 'Stranger Things S5E1', airDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0] },
];

export const MOCK_CALENDAR_EMPTY = [];

/**
 * Apply mock fetch responses for testing.
 * Call before importing modules that use fetch.
 * @param {object} routes - Map of URL pattern → response
 */
export function mockFetch(routes) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const urlStr = typeof url === 'string' ? url : url.url;
    const method = options.method || 'GET';

    for (const [pattern, response] of Object.entries(routes)) {
      if (urlStr.includes(pattern) && response.method === method) {
        return new Response(JSON.stringify(response.body), {
          status: response.status || 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback: 404
    return new Response(JSON.stringify({ message: 'Not mocked' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  return originalFetch;
}

/**
 * Restore original fetch.
 */
export function restoreFetch(original) {
  globalThis.fetch = original;
}
