import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_SONARR_STATUS, MOCK_SERIES_LIST } from '../mock-server.js';

let StatsDashboardAction, setWebSocket;
const mockWs = { readyState: WebSocket.OPEN, send: () => {} };

before(async () => {
  const base = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/base-action.js');
  setWebSocket = base.setWebSocket;
  setWebSocket(mockWs);
  const mod = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/actions/stats-dashboard.js');
  StatsDashboardAction = mod.StatsDashboardAction;
});

after(() => { setWebSocket(null); mock.restoreAll(); });

const SETTINGS = { serviceId: 'sonarr', baseUrl: 'http://localhost:8989', apiKey: 'test-key', includeActivity: true };

function mockStatsResponses(series, status) {
  mock.method(globalThis, 'fetch', (url) => {
    if (url.includes('/series')) return new Response(JSON.stringify(series), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url.includes('/system/status')) return new Response(JSON.stringify(status), { status: 200, headers: { 'Content-Type': 'application/json' } });
    return new Response(null, { status: 404 });
  });
}

describe('StatsDashboardAction', () => {
  it('shows configure message without settings', async () => {
    const a = new StatsDashboardAction('ctx', {}, '');
    const r = await a.fetchData();
    assert.equal(r.success, false);
    assert(r.error.message.includes('Configure'));
  });

  it('shows resource count on first view', async () => {
    mockStatsResponses(MOCK_SERIES_LIST, MOCK_SONARR_STATUS);
    const a = new StatsDashboardAction('ctx', SETTINGS, '');
    a._viewIndex = 0;
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('245'));
    assert(t.includes('Series'));
    mock.restoreAll();
  });

  it('shows version on system view', async () => {
    mockStatsResponses(MOCK_SERIES_LIST, MOCK_SONARR_STATUS);
    const a = new StatsDashboardAction('ctx', SETTINGS, '');
    a._viewIndex = 1;
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('Sonarr'));
    assert(t.includes('4.0.0'));
    mock.restoreAll();
  });

  it('shows today activity count', async () => {
    mockStatsResponses(MOCK_SERIES_LIST, MOCK_SONARR_STATUS);
    const a = new StatsDashboardAction('ctx', SETTINGS, '');
    a._viewIndex = 2;
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('Today'));
    mock.restoreAll();
  });

  it('cycles views on key press', () => {
    const a = new StatsDashboardAction('ctx', SETTINGS, '');
    const start = a._viewIndex;
    a.onKeyDown({});
    assert.equal(a._viewIndex, start + 1);
  });

  it('has correct resource label per service', () => {
    const sonarr = new StatsDashboardAction('ctx', { ...SETTINGS, serviceId: 'sonarr' }, '');
    assert.equal(sonarr._getResourceLabel(5), 'Series');
    const radarr = new StatsDashboardAction('ctx', { ...SETTINGS, serviceId: 'radarr' }, '');
    assert.equal(radarr._getResourceLabel(5), 'Movies');
    const lidarr = new StatsDashboardAction('ctx', { ...SETTINGS, serviceId: 'lidarr' }, '');
    assert.equal(lidarr._getResourceLabel(5), 'Artists');
  });
});
