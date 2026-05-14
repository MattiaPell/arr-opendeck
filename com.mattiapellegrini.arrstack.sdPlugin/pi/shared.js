let _ws = null;
let _piUUID = null;
let _currentContext = null;
let _currentAction = null;
let _settingsCallback = null;

function connectOpenActionSocket(port, propertyInspectorUUID, registerEvent, info) {
  _piUUID = propertyInspectorUUID;
  _ws = new WebSocket('ws://localhost:' + port);

  _ws.onopen = () => {
    _ws.send(JSON.stringify({ event: registerEvent, uuid: _piUUID }));
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

      case 'didReceiveGlobalSettings': {
        const gs = payload ? payload.settings : {};
        populateGlobalFields(gs);
        break;
      }

      case 'sendToPropertyInspector':
        if (_settingsCallback) _settingsCallback(payload);
        break;

      case 'propertyInspectorDidAppear':
        requestSettings();
        requestGlobalSettings();
        break;
    }
  };

  _ws.onerror = (err) => {
    console.error('[PI] WS error:', err);
  };
  _ws.onclose = () => {};
}

function requestSettings() {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
  _ws.send(JSON.stringify({ event: 'getSettings', context: _piUUID }));
}

function sendSettings(settings) {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
  _ws.send(JSON.stringify({ event: 'setSettings', context: _piUUID, payload: settings }));
}

function requestGlobalSettings() {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
  _ws.send(JSON.stringify({ event: 'getGlobalSettings', context: _piUUID }));
}

function sendGlobalSettings(settings) {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
  _ws.send(JSON.stringify({ event: 'setGlobalSettings', context: _piUUID, payload: settings }));
}

function sendToPlugin(payload) {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
  _ws.send(JSON.stringify({
    event: 'sendToPlugin',
    action: _currentAction,
    context: _currentContext || _piUUID,
    payload,
  }));
}

function onSettingsReceived(callback) {
  _settingsCallback = callback;
}

function showMessage(msg, type) {
  const el = document.getElementById('message');
  if (!el) return;
  el.textContent = msg;
  el.className = type || 'info';
  el.style.display = 'block';
}

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
  toggleConnectionFields();
}

function populateGlobalFields(settings) {
  if (!settings) return;
  const el = document.getElementById('_globalIndicator');
  if (el) {
    const hasGlobals = settings.serviceId || settings.baseUrl;
    el.textContent = hasGlobals ? 'Global: configured' : 'Global: not set';
    el.className = hasGlobals ? 'status-dot green' : 'status-dot gray';
  }
}

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

function toggleConnectionFields() {
  const useGlobal = document.getElementById('useGlobal');
  if (!useGlobal) return;
  const isGlobal = useGlobal.checked;
  ['serviceId', 'baseUrl', 'apiKey'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = isGlobal;
  });
}

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
      const settings = collectSettings();
      sendSettings(settings);
      if (document.activeElement && document.activeElement.id === 'useGlobal') {
        toggleConnectionFields();
      }
    }, 300);
  });
}

window.connectOpenActionSocket = connectOpenActionSocket;
window.requestSettings = requestSettings;
window.sendSettings = sendSettings;
window.requestGlobalSettings = requestGlobalSettings;
window.sendGlobalSettings = sendGlobalSettings;
window.sendToPlugin = sendToPlugin;
window.onSettingsReceived = onSettingsReceived;
window.showMessage = showMessage;
window.collectSettings = collectSettings;
window.setupAutoSave = setupAutoSave;
window.toggleConnectionFields = toggleConnectionFields;
