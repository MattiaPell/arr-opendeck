import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_WANTED_MISSING, MOCK_WANTED_NONE } from '../mock-server.js';

let SearchMissingAction, setWebSocket;
const mockWs = { readyState: WebSocket.OPEN, send: () => {} };

before(async () => {
  const base = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/base-action.js');
  setWebSocket = base.setWebSocket;
  setWebSocket(mockWs);
  const mod = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/actions/search-missing.js');
  SearchMissingAction = mod.SearchMissingAction;
});

after(() => { setWebSocket(null); mock.restoreAll(); });

const SETTINGS = { serviceId: 'sonarr', baseUrl: 'http://localhost:8989', apiKey: 'test-key', showCutoff: true };

function mockMissingResponses(missing, cutoff) {
  mock.method(globalThis, 'fetch', (url) => {
    if (url.includes('wanted/missing')) return new Response(JSON.stringify(missing), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url.includes('wanted/cutoff')) return new Response(JSON.stringify(cutoff), { status: 200, headers: { 'Content-Type': 'application/json' } });
    return new Response(null, { status: 404 });
  });
}

describe('SearchMissingAction', () => {
  it('shows configure message without settings', async () => {
    const a = new SearchMissingAction('ctx', {}, '');
    const r = await a.fetchData();
    assert.equal(r.success, false);
    assert(r.error.message.includes('Configure'));
  });

  it('shows Complete when nothing missing', async () => {
    mockMissingResponses(MOCK_WANTED_NONE, MOCK_WANTED_NONE);
    const a = new SearchMissingAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('Complete'));
    assert.equal(a.getState(r.data), 0);
    mock.restoreAll();
  });

  it('shows count when items missing', async () => {
    mockMissingResponses(MOCK_WANTED_MISSING, MOCK_WANTED_NONE);
    const a = new SearchMissingAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('5'));
    assert.equal(a.getState(r.data), 1);
    mock.restoreAll();
  });

  it('skips cutoff when disabled in settings', async () => {
    mockMissingResponses(MOCK_WANTED_MISSING, { page: 1, totalRecords: 0, records: [] });
    const a = new SearchMissingAction('ctx', { ...SETTINGS, showCutoff: false }, '');
    const r = await a.fetchData();
    assert.equal(r.data.cutoff, null);
    mock.restoreAll();
  });
});
