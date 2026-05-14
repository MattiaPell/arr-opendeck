import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_CALENDAR_UPCOMING, MOCK_CALENDAR_EMPTY } from '../mock-server.js';

let CalendarViewAction, setWebSocket;
const mockWs = { readyState: WebSocket.OPEN, send: () => {} };

before(async () => {
  const base = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/base-action.js');
  setWebSocket = base.setWebSocket;
  setWebSocket(mockWs);
  const mod = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/actions/calendar-view.js');
  CalendarViewAction = mod.CalendarViewAction;
});

after(() => { setWebSocket(null); mock.restoreAll(); });

const SETTINGS = { serviceId: 'sonarr', baseUrl: 'http://localhost:8989', apiKey: 'test-key', lookaheadDays: 7, monitoredOnly: true };

function mockCalendarResponse(items) {
  mock.method(globalThis, 'fetch', (url) => {
    if (url.includes('/calendar')) return new Response(JSON.stringify(items), { status: 200, headers: { 'Content-Type': 'application/json' } });
    return new Response(null, { status: 404 });
  });
}

describe('CalendarViewAction', () => {
  it('shows configure message without settings', async () => {
    const a = new CalendarViewAction('ctx', {}, '');
    const r = await a.fetchData();
    assert.equal(r.success, false);
    assert(r.error.message.includes('Configure'));
  });

  it('shows nothing scheduled for empty calendar', async () => {
    mockCalendarResponse(MOCK_CALENDAR_EMPTY);
    const a = new CalendarViewAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('Nothing'));
    mock.restoreAll();
  });

  it('shows first upcoming item when multiple items', async () => {
    mockCalendarResponse(MOCK_CALENDAR_UPCOMING);
    const a = new CalendarViewAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('Severance') || t.includes('S2E4'));
    mock.restoreAll();
  });

  it('shows single upcoming item directly', async () => {
    mockCalendarResponse([MOCK_CALENDAR_UPCOMING[0]]);
    const a = new CalendarViewAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('Severance'));
    mock.restoreAll();
  });

  it('cycles through items on key press', async () => {
    mockCalendarResponse(MOCK_CALENDAR_UPCOMING);
    const a = new CalendarViewAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    assert.equal(a._items.length, 4);
    a.onKeyDown({});
    assert.equal(a._viewIndex, 1);
    mock.restoreAll();
  });

  it('handles unsupported services', async () => {
    const rSettings = { serviceId: 'readarr', baseUrl: 'http://localhost:8787', apiKey: 'test-key' };
    const a = new CalendarViewAction('ctx', rSettings, '');
    const r = await a.fetchData();
    assert.equal(r.data.unsupported, true);
    const t = a.formatTitle(r.data);
    assert(t.includes('N/A'));
  });

  it('extracts title from different response shapes', () => {
    const a = new CalendarViewAction('ctx', SETTINGS, '');
    assert.equal(a._getItemTitle({ title: 'Movie Title' }), 'Movie Title');
    assert.equal(a._getItemTitle({ series: { title: 'TV Show' }, episodeNumber: 4, seasonNumber: 2 }), 'TV Show S2E4');
    assert.equal(a._getItemTitle({ movie: { title: 'Film' } }), 'Film');
    assert.equal(a._getItemTitle({ artist: { artistName: 'Band' } }), 'Band');
    assert.equal(a._getItemTitle({}), 'Unknown');
  });
});
