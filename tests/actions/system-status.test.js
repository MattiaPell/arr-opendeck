import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOCK_SONARR_STATUS,
  MOCK_HEALTH_OK,
  MOCK_HEALTH_ERROR,
  MOCK_HEALTH_WARNING,
} from '../mock-server.js';

// We need to set up fetch mocking BEFORE importing the module
// because the module-level import of createArrClient happens on instantiation
let SystemStatusAction;
let setWebSocket;

const mockWs = {
  readyState: WebSocket.OPEN,
  send: () => {},
};

before(async () => {
  const baseMod = await import('../../com.arrdeck.sdPlugin/src/base-action.js');
  setWebSocket = baseMod.setWebSocket;
  setWebSocket(mockWs);

  const mod = await import('../../com.arrdeck.sdPlugin/src/actions/system-status.js');
  SystemStatusAction = mod.SystemStatusAction;
});

after(() => {
  setWebSocket(null);
  mock.restoreAll();
});

describe('SystemStatusAction', () => {
  it('shows error text when not configured', () => {
    const action = new SystemStatusAction('ctx-1', {}, 'com.arrdeck.system-status');
    // No serviceId, baseUrl, or apiKey set — should return configure message
    return action.fetchData().then(result => {
      assert.equal(result.success, false);
      assert(result.error.message.includes('Configure'));
    });
  });

  it('returns healthy status and formats title', async () => {
    mock.method(globalThis, 'fetch', (url) => {
      if (url.includes('/system/status')) {
        return new Response(JSON.stringify(MOCK_SONARR_STATUS), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/health')) {
        return new Response(JSON.stringify(MOCK_HEALTH_OK), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    const action = new SystemStatusAction('ctx-2', {
      serviceId: 'sonarr', baseUrl: 'http://localhost:8989', apiKey: 'test-key',
    }, 'com.arrdeck.system-status');

    const result = await action.fetchData();
    assert.equal(result.success, true);
    assert.equal(result.data.status.version, '4.0.0');

    const title = action.formatTitle(result.data);
    assert(title.includes('Sonarr'), `Title should contain Sonarr, got: ${title}`);

    const state = action.getState(result.data);
    assert.equal(state, 0, 'Healthy state should be 0');

    mock.restoreAll();
  });

  it('detects error health state', async () => {
    mock.method(globalThis, 'fetch', (url) => {
      if (url.includes('/system/status')) {
        return new Response(JSON.stringify(MOCK_SONARR_STATUS), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/health')) {
        return new Response(JSON.stringify(MOCK_HEALTH_ERROR), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    const action = new SystemStatusAction('ctx-3', {
      serviceId: 'sonarr', baseUrl: 'http://localhost:8989', apiKey: 'test-key',
    }, 'com.arrdeck.system-status');

    const result = await action.fetchData();
    const state = action.getState(result.data);
    assert.equal(state, 1, 'Error health state should be 1');

    mock.restoreAll();
  });
});
