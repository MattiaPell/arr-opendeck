import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_QUEUE_ACTIVE, MOCK_QUEUE_EMPTY, MOCK_QUEUE_STATUS_ACTIVE, MOCK_QUEUE_STATUS_ERROR } from '../mock-server.js';

let QueueMonitorAction, setWebSocket;
const mockWs = { readyState: WebSocket.OPEN, send: () => {} };

before(async () => {
  const base = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/base-action.js');
  setWebSocket = base.setWebSocket;
  setWebSocket(mockWs);
  const mod = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/actions/queue-monitor.js');
  QueueMonitorAction = mod.QueueMonitorAction;
});

after(() => { setWebSocket(null); mock.restoreAll(); });

const SETTINGS = { serviceId: 'sonarr', baseUrl: 'http://localhost:8989', apiKey: 'test-key' };

function mockFetchResponses(queue, queueStatus) {
  mock.method(globalThis, 'fetch', (url) => {
    if (url.includes('/queue/status')) return new Response(JSON.stringify(queueStatus), { status: 200, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify(queue), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
}

describe('QueueMonitorAction', () => {
  it('shows configure message without settings', async () => {
    const a = new QueueMonitorAction('ctx', {}, '');
    const r = await a.fetchData();
    assert.equal(r.success, false);
    assert(r.error.message.includes('Configure'));
  });

  it('shows idle for empty queue', async () => {
    mockFetchResponses(MOCK_QUEUE_EMPTY, { totalCount: 0, count: 0, errors: 0, warnings: 0 });
    const a = new QueueMonitorAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    assert.equal(r.success, true);
    const t = a.formatTitle(r.data);
    assert(t.includes('Idle'));
    mock.restoreAll();
  });

  it('shows count for active queue', async () => {
    mockFetchResponses(MOCK_QUEUE_ACTIVE, MOCK_QUEUE_STATUS_ACTIVE);
    const a = new QueueMonitorAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('3'));
    assert(t.includes('2'));
    mock.restoreAll();
  });

  it('returns alert state when downloading', async () => {
    mockFetchResponses(MOCK_QUEUE_ACTIVE, MOCK_QUEUE_STATUS_ACTIVE);
    const a = new QueueMonitorAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    assert.equal(a.getState(r.data), 1);
    mock.restoreAll();
  });

  it('returns alert state when errors present', async () => {
    mockFetchResponses(MOCK_QUEUE_EMPTY, MOCK_QUEUE_STATUS_ERROR);
    const a = new QueueMonitorAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    assert.equal(a.getState(r.data), 1);
    mock.restoreAll();
  });

  it('cycles views on key press', () => {
    const a = new QueueMonitorAction('ctx', SETTINGS, '');
    assert.equal(a._viewIndex, 0);
    a.onKeyDown({});
    assert.equal(a._viewIndex, 1);
  });
});
