/**
 * *Arr Deck — Shared Property Inspector JavaScript
 *
 * Provides WebSocket connection management and settings helpers
 * that all property inspectors use.
 */

/** @type {WebSocket|null} */
let _ws = null;
let _piUUID = null;
let _currentContext = null;
let _currentAction = null;
/** @type {Function|null} */
let _settingsCallback = null;

/**
 * Connect to the OpenAction server as a property inspector.
 * Stream Deck SDK compatible signature.
 * @param {number} port
 * @param {string} propertyInspectorUUID
 * @param {string} registerEvent
 * @param {object|string} info
 */
function connectOpenActionSocket(port, propertyInspectorUUID, registerEvent, info) {
  _piUUID = propertyInspectorUUID;
  _ws = new WebSocket('ws://localhost:' + port);

  _ws.onopen = () => {
    _ws.send(JSON.stringify({
      event: registerEvent,
      uuid: _piUUID,
    }));
  };

  _ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const evt = msg.event;
    const context = msg.context;
    const action = msg.action;
    const payload = msg.payload;

    switch (evt) {
      case 'didReceiveSettings':
        _currentContext = context;
        _currentAction = action;
        if (payload && payload.settings) {
          populateSettings(payload.settings);
        }
        if (_settingsCallback) {
          _settingsCallback(payload ? payload.settings : {});
        }
        break;

      case 'sendToPropertyInspector':
        if (_settingsCallback) {
          _settingsCallback(payload);
        }
        break;

      case 'propertyInspectorDidAppear':
        requestSettings();
        break;
    }
  };

  _ws.onerror = (err) => {
    console.error('[PI] WebSocket error:', err);
  };

  _ws.onclose = () => {
    console.log('[PI] Connection closed');
  };
}

/**
 * Request current settings from the plugin.
 */
function requestSettings() {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
  _ws.send(JSON.stringify({
    event: 'getSettings',
    context: _piUUID,
  }));
}

/**
 * Send updated settings to the plugin.
 * @param {object} settings
 */
function sendSettings(settings) {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
  _ws.send(JSON.stringify({
    event: 'setSettings',
    context: _piUUID,
    payload: settings,
  }));
}

/**
 * Send a message to the plugin.
 * @param {object} payload
 */
function sendToPlugin(payload) {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
  _ws.send(JSON.stringify({
    event: 'sendToPlugin',
    action: _currentAction,
    context: _currentContext || _piUUID,
    payload,
  }));
}

/**
 * Register a callback for settings updates.
 * @param {function(object): void} callback
 */
function onSettingsReceived(callback) {
  _settingsCallback = callback;
}

/**
 * Display a status message in the PI.
 * @param {string} msg - Message text
 * @param {'info'|'success'|'error'} type
 */
function showMessage(msg, type) {
  const el = document.getElementById('message');
  if (!el) return;
  el.textContent = msg;
  el.className = type || 'info';
  el.style.display = 'block';
}

/**
 * Populate form fields from settings object.
 * Matches field IDs to setting keys.
 * @param {object} settings
 */
function populateSettings(settings) {
  if (!settings) return;
  for (const [key, value] of Object.entries(settings)) {
    const el = document.getElementById(key);
    if (!el) continue;
    if (el.type === 'checkbox') {
      el.checked = !!value;
    } else {
      el.value = value;
    }
  }
}

/**
 * Collect all form field values into a settings object.
 * @returns {object}
 */
function collectSettings() {
  const settings = {};
  const fields = document.querySelectorAll('[id]');
  fields.forEach(el => {
    if (el.type === 'checkbox') {
      settings[el.id] = el.checked;
    } else {
      settings[el.id] = el.value;
    }
  });
  return settings;
}

/**
 * Auto-save settings when any form field changes.
 * Debounces rapid changes.
 */
function setupAutoSave() {
  let debounceTimer = null;
  const form = document.querySelector('form') || document.body;
  form.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      sendSettings(collectSettings());
    }, 300);
  });
  form.addEventListener('change', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      sendSettings(collectSettings());
    }, 300);
  });
}

// Make functions globally available (Stream Deck PI runs in isolated WebView)
window.connectOpenActionSocket = connectOpenActionSocket;
window.requestSettings = requestSettings;
window.sendSettings = sendSettings;
window.sendToPlugin = sendToPlugin;
window.onSettingsReceived = onSettingsReceived;
window.showMessage = showMessage;
window.collectSettings = collectSettings;
window.setupAutoSave = setupAutoSave;
