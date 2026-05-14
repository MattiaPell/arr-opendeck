import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';

let RecentlyAddedAction, setWebSocket;
const mockWs = { readyState: WebSocket.OPEN, send: () => {} };

before(async () => {
  const base = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/base-action.js');
  setWebSocket = base.setWebSocket;
  setWebSocket(mockWs);
  const mod = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/actions/recently-added.js');
  RecentlyAddedAction = mod.RecentlyAddedAction;
});

after(() => { setWebSocket(null); mock.restoreAll(); });

const SETTINGS = { serviceId: 'sonarr', baseUrl: 'http://localhost:8989', apiKey: 'test-key', lookbackDays: 7, maxItems: 10 };

function makeSeriesItems(count, daysAgo) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Series ${i + 1}`,
    added: new Date(Date.now() - daysAgo * 86400000 + i * 3600000).toISOString(),
  }));
}

describe('RecentlyAddedAction', () => {
  it('shows configure message without settings', async () => {
    const a = new RecentlyAddedAction('ctx', {}, '');
    const r = await a.fetchData();
    assert.equal(r.success, false);
    assert(r.error.message.includes('Configure'));
  });

  it('shows None when nothing recently added', async () => {
    mock.method(globalThis, 'fetch', () => {
      return new Response(JSON.stringify(makeSeriesItems(3, 30)), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const a = new RecentlyAddedAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('None'));
    mock.restoreAll();
  });

  it('shows most recent item title', async () => {
    const items = makeSeriesItems(3, 1);
    mock.method(globalThis, 'fetch', () => {
      return new Response(JSON.stringify(items), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const a = new RecentlyAddedAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('Series'));
    mock.restoreAll();
  });

  it('cycles through items on key press', async () => {
    const items = makeSeriesItems(5, 1);
    mock.method(globalThis, 'fetch', () => {
      return new Response(JSON.stringify(items), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const a = new RecentlyAddedAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    assert.equal(a._items.length, 5);
    a.onKeyDown({});
    assert.equal(a._viewIndex, 1);
    mock.restoreAll();
  });

  it('limits items to maxItems setting', async () => {
    const items = makeSeriesItems(20, 1);
    mock.method(globalThis, 'fetch', () => {
      return new Response(JSON.stringify(items), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const a = new RecentlyAddedAction('ctx', { ...SETTINGS, maxItems: 3 }, '');
    const r = await a.fetchData();
    assert.equal(r.data.items.length, 3);
    mock.restoreAll();
  });

  it('extracts name from different response shapes', () => {
    const a = new RecentlyAddedAction('ctx', SETTINGS, '');
    assert.equal(a._getItemName({ title: 'Show' }), 'Show');
    assert.equal(a._getItemName({ artistName: 'Artist' }), 'Artist');
    assert.equal(a._getItemName({ movie: { title: 'Film' } }), 'Film');
    assert.equal(a._getItemName({ series: { title: 'Series' } }), 'Series');
    assert.equal(a._getItemName({ authorName: 'Author' }), 'Author');
    assert.equal(a._getItemName({}), 'Unknown');
  });
});
