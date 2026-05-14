import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_SONARR_STATUS, MOCK_HEALTH_OK, MOCK_QUEUE_EMPTY } from './mock-server.js';

const clientPath = '../com.arrdeck.sdPlugin/src/arr-api-client.js';
let createArrClient;

const MOCK_BASE_URL = 'http://sonarr:8989';
const MOCK_API_KEY = 'test-api-key-12345';

before(async () => {
  const mod = await import(clientPath);
  createArrClient = mod.createArrClient;
});

describe('API Client', () => {
  it('creates client with all methods', () => {
    const client = createArrClient('sonarr', MOCK_BASE_URL, MOCK_API_KEY);
    assert.equal(typeof client.get, 'function');
    assert.equal(typeof client.post, 'function');
    assert.equal(typeof client.systemStatus, 'function');
    assert.equal(typeof client.getQueue, 'function');
    assert.equal(typeof client.executeCommand, 'function');
    assert.equal(typeof client.getCalendar, 'function');
    assert.equal(typeof client.getWantedMissing, 'function');
    assert.equal(typeof client.listResources, 'function');
  });

  it('fails for unknown service', () => {
    assert.throws(() => createArrClient('unknown', MOCK_BASE_URL, MOCK_API_KEY), /Unknown service/);
  });

  it('systemStatus calls correct URL and returns data', async () => {
    const client = createArrClient('sonarr', MOCK_BASE_URL, MOCK_API_KEY);

    mock.method(globalThis, 'fetch', async (url, opts) => {
      assert.match(url, /\/api\/v3\/system\/status$/);
      assert.equal(opts.headers['X-Api-Key'], MOCK_API_KEY);
      return new Response(JSON.stringify(MOCK_SONARR_STATUS), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await client.systemStatus();
    assert.equal(result.success, true);
    assert.equal(result.data.appName, 'Sonarr');
    assert.equal(result.data.version, '4.0.0');

    mock.restoreAll();
  });

  it('getQueue calls correct URL', async () => {
    const client = createArrClient('sonarr', MOCK_BASE_URL, MOCK_API_KEY);

    mock.method(globalThis, 'fetch', async (url) => {
      assert.match(url, /\/api\/v3\/queue/);
      return new Response(JSON.stringify(MOCK_QUEUE_EMPTY), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await client.getQueue({ page: 1, pageSize: 10 });
    assert.equal(result.success, true);
    assert.equal(result.data.totalRecords, 0);

    mock.restoreAll();
  });

  it('executeCommand sends POST with command name', async () => {
    const client = createArrClient('sonarr', MOCK_BASE_URL, MOCK_API_KEY);
    let capturedBody = null;

    mock.method(globalThis, 'fetch', async (url, opts) => {
      assert.match(url, /\/api\/v3\/command$/);
      assert.equal(opts.method, 'POST');
      capturedBody = JSON.parse(opts.body);
      return new Response(JSON.stringify({ id: 1, name: 'RssSync', status: 'queued' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await client.executeCommand('RssSync');
    assert.equal(result.success, true);
    assert.equal(capturedBody.name, 'RssSync');

    mock.restoreAll();
  });

  it('handles non-2xx responses gracefully', async () => {
    const client = createArrClient('sonarr', MOCK_BASE_URL, MOCK_API_KEY);

    mock.method(globalThis, 'fetch', async () => {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await client.systemStatus();
    assert.equal(result.success, false);
    assert.equal(result.error.status, 401);

    mock.restoreAll();
  });

  it('handles network errors gracefully', async () => {
    const client = createArrClient('sonarr', MOCK_BASE_URL, MOCK_API_KEY);

    mock.method(globalThis, 'fetch', async () => {
      throw new Error('ECONNREFUSED');
    });

    const result = await client.systemStatus();
    assert.equal(result.success, false);
    assert(result.error.message.includes('ECONNREFUSED'));

    mock.restoreAll();
  });

  it('executeCommand returns mapped commands from registry', async () => {
    const client = createArrClient('sonarr', MOCK_BASE_URL, MOCK_API_KEY);

    mock.method(globalThis, 'fetch', async (url, opts) => {
      const body = JSON.parse(opts.body);
      return new Response(JSON.stringify({ id: 2, name: body.name, status: 'started' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await client.executeCommand('MissingEpisodeSearch');
    assert.equal(result.data.name, 'MissingEpisodeSearch');

    mock.restoreAll();
  });

  it('handles 204 No Content responses', async () => {
    const client = createArrClient('sonarr', MOCK_BASE_URL, MOCK_API_KEY);

    mock.method(globalThis, 'fetch', async () => {
      return new Response(null, { status: 204 });
    });

    const result = await client.executeCommand('RssSync');
    assert.equal(result.success, true);
    assert.equal(result.data, null);

    mock.restoreAll();
  });
});
