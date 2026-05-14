import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';

let QuickCommandAction, setWebSocket;
const mockWs = { readyState: WebSocket.OPEN, send: () => {} };

before(async () => {
  const base = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/base-action.js');
  setWebSocket = base.setWebSocket;
  setWebSocket(mockWs);
  const mod = await import('../../com.mattiapellegrini.arrstack.sdPlugin/src/actions/quick-command.js');
  QuickCommandAction = mod.QuickCommandAction;
});

after(() => { setWebSocket(null); mock.restoreAll(); });

const SETTINGS = { serviceId: 'sonarr', baseUrl: 'http://localhost:8989', apiKey: 'test-key', commandType: 'generic', genericCommand: 'rssSync' };

function mockCommandsResponse(commands) {
  mock.method(globalThis, 'fetch', (url) => {
    if (url.includes('/command') && url.method !== 'POST') {
      return new Response(JSON.stringify(commands), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ id: 1, name: 'RssSync', status: 'completed' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
}

describe('QuickCommandAction', () => {
  it('shows configure message without settings', async () => {
    const a = new QuickCommandAction('ctx', {}, '');
    const r = await a.fetchData();
    assert.equal(r.success, false);
    assert(r.error.message.includes('Configure'));
  });

  it('shows Ready when command configured', async () => {
    mockCommandsResponse([]);
    const a = new QuickCommandAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    assert.equal(r.success, true);
    const t = a.formatTitle(r.data);
    assert(t.includes('Rss'));
    assert(t.includes('Ready') || t.includes('unknown'));
    mock.restoreAll();
  });

  it('shows last command status', async () => {
    mockCommandsResponse([{ id: 1, name: 'RssSync', status: 'completed' }]);
    const a = new QuickCommandAction('ctx', SETTINGS, '');
    const r = await a.fetchData();
    const t = a.formatTitle(r.data);
    assert(t.includes('completed') || t.includes('Ready'));
    mock.restoreAll();
  });

  it('maps generic command to service-specific', () => {
    const a = new QuickCommandAction('ctx', { ...SETTINGS, genericCommand: 'rssSync' }, '');
    const cmd = a._getCommandName();
    assert.equal(cmd, 'RssSync');
  });

  it('uses custom command name when specified', () => {
    const a = new QuickCommandAction('ctx', { ...SETTINGS, commandType: 'custom', customCommand: 'Backup' }, '');
    const cmd = a._getCommandName();
    assert.equal(cmd, 'Backup');
  });
});
