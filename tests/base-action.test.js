import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';

const basePath = '../com.arrdeck.sdPlugin/src/base-action.js';
let BaseAction, setWebSocket, getWebSocket;

before(async () => {
  const mod = await import(basePath);
  BaseAction = mod.BaseAction;
  setWebSocket = mod.setWebSocket;
  getWebSocket = mod.getWebSocket;
});

describe('BaseAction', () => {
  let wsMessages;
  let mockWs;

  before(() => {
    wsMessages = [];
    mockWs = {
      readyState: WebSocket.OPEN,
      send: (msg) => wsMessages.push(JSON.parse(msg)),
    };
    setWebSocket(mockWs);
  });

  after(() => {
    setWebSocket(null);
  });

  it('can be instantiated with context and settings', () => {
    const action = new BaseAction('ctx-1', { refreshInterval: 30 }, 'com.arrdeck.test');
    assert.equal(action.context, 'ctx-1');
    assert.equal(action.settings.refreshInterval, 30);
    assert.equal(action.actionUuid, 'com.arrdeck.test');
  });

  it('setTitle sends correctly formatted WebSocket message', () => {
    wsMessages = [];
    const action = new BaseAction('ctx-2', {}, 'com.arrdeck.test');
    action.setTitle('Hello');
    assert.equal(wsMessages.length, 1);
    assert.equal(wsMessages[0].event, 'setTitle');
    assert.equal(wsMessages[0].context, 'ctx-2');
    assert.equal(wsMessages[0].payload.title, 'Hello');
  });

  it('showOk sends showOk event', () => {
    wsMessages = [];
    const action = new BaseAction('ctx-3', {}, 'com.arrdeck.test');
    action.showOk();
    assert.equal(wsMessages.length, 1);
    assert.equal(wsMessages[0].event, 'showOk');
  });

  it('showAlert sends showAlert event', () => {
    wsMessages = [];
    const action = new BaseAction('ctx-4', {}, 'com.arrdeck.test');
    action.showAlert();
    assert.equal(wsMessages.length, 1);
    assert.equal(wsMessages[0].event, 'showAlert');
  });

  it('fetchData throws by default', async () => {
    const action = new BaseAction('ctx-5', {}, 'com.arrdeck.test');
    await assert.rejects(() => action.fetchData(), /must be implemented/);
  });

  it('startPolling calls fetchData periodically', async () => {
    const action = new BaseAction('ctx-6', {}, 'com.arrdeck.test');
    let callCount = 0;
    action.fetchData = async () => {
      callCount++;
      return { success: true, data: {} };
    };
    action.formatTitle = () => 'test';
    action.updateDisplay = () => {};

    action.startPolling(50);
    await new Promise(r => setTimeout(r, 120));
    action.stopPolling();

    assert(callCount >= 1, `Expected at least 1 fetchData call, got ${callCount}`);
  });

  it('stopPolling clears the timer', async () => {
    const action = new BaseAction('ctx-7', {}, 'com.arrdeck.test');
    let callCount = 0;
    action.fetchData = async () => {
      callCount++;
      return { success: true, data: {} };
    };
    action.formatTitle = () => 'test';
    action.updateDisplay = () => {};

    action.startPolling(50);
    action.stopPolling();
    const countAfterStop = callCount;
    await new Promise(r => setTimeout(r, 100));
    assert.equal(callCount, countAfterStop);
  });

  it('onWillDisappear calls stopPolling', () => {
    const action = new BaseAction('ctx-8', {}, 'com.arrdeck.test');
    let pollingStopped = false;
    action.stopPolling = () => { pollingStopped = true; };
    action.onWillDisappear();
    assert.equal(pollingStopped, true);
  });

  it('setState sends setState event', () => {
    wsMessages = [];
    const action = new BaseAction('ctx-9', {}, 'com.arrdeck.test');
    action.setState(1);
    assert.equal(wsMessages.length, 1);
    assert.equal(wsMessages[0].event, 'setState');
    assert.equal(wsMessages[0].payload.state, 1);
  });

  it('saveSettings merges and sends settings', () => {
    wsMessages = [];
    const action = new BaseAction('ctx-10', { existing: true }, 'com.arrdeck.test');
    action.saveSettings({ newKey: 'value' });
    assert.equal(action.settings.existing, true);
    assert.equal(action.settings.newKey, 'value');
    assert.equal(wsMessages.length, 1);
    assert.equal(wsMessages[0].event, 'setSettings');
  });

  it('default onKeyDown increments viewIndex', () => {
    const action = new BaseAction('ctx-11', {}, 'com.arrdeck.test');
    assert.equal(action._viewIndex, 0);
    action.onKeyDown({});
    assert.equal(action._viewIndex, 1);
  });

  it('setImage sends setImage event', () => {
    wsMessages = [];
    const action = new BaseAction('ctx-12', {}, 'com.arrdeck.test');
    action.setImage('data:image/png;base64,abc');
    assert.equal(wsMessages.length, 1);
    assert.equal(wsMessages[0].event, 'setImage');
  });

  it('sendToPI sends sendToPropertyInspector event', () => {
    wsMessages = [];
    const action = new BaseAction('ctx-13', {}, 'com.arrdeck.test');
    action.sendToPI({ view: 'details' });
    assert.equal(wsMessages.length, 1);
    assert.equal(wsMessages[0].event, 'sendToPropertyInspector');
    assert.equal(wsMessages[0].payload.view, 'details');
  });
});

describe('setWebSocket / getWebSocket', () => {
  it('stores and retrieves WebSocket reference', () => {
    const ws = { readyState: WebSocket.OPEN, send: () => {} };
    setWebSocket(ws);
    assert.equal(getWebSocket(), ws);
    setWebSocket(null);
  });
});
