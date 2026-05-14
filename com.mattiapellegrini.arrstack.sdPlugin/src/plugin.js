import { setWebSocket } from './base-action.js';
import { SystemStatusAction } from './actions/system-status.js';
import { QueueMonitorAction } from './actions/queue-monitor.js';
import { QuickCommandAction } from './actions/quick-command.js';
import { SearchMissingAction } from './actions/search-missing.js';
import { StatsDashboardAction } from './actions/stats-dashboard.js';
import { CalendarViewAction } from './actions/calendar-view.js';
import { RecentlyAddedAction } from './actions/recently-added.js';

const ACTION_MAP = {
  'com.mattiapellegrini.arrstack.system-status': SystemStatusAction,
  'com.mattiapellegrini.arrstack.queue-monitor': QueueMonitorAction,
  'com.mattiapellegrini.arrstack.quick-command': QuickCommandAction,
  'com.mattiapellegrini.arrstack.search-missing': SearchMissingAction,
  'com.mattiapellegrini.arrstack.stats-dashboard': StatsDashboardAction,
  'com.mattiapellegrini.arrstack.calendar-view': CalendarViewAction,
  'com.mattiapellegrini.arrstack.recently-added': RecentlyAddedAction,
};

const instances = {};
let ws = null;
let pluginUUID = '';
/** Global settings shared across all actions */
let _globalSettings = {};

export function getGlobalSettings() {
  return _globalSettings;
}

export function setGlobalSettingsStore(settings) {
  _globalSettings = settings || {};
}

function parseArgs() {
  const args = {};
  for (let i = 0; i < window.args.length; i += 2) {
    const key = window.args[i].replace(/^-+/, '');
    let val = window.args[i + 1];
    if (key === 'info') {
      try { val = JSON.parse(val); } catch {}
    }
    args[key] = val;
  }
  return args;
}

function connectOpenActionSocket(port, uuid, registerEvent, info) {
  pluginUUID = uuid;
  ws = new WebSocket('ws://localhost:' + port);
  setWebSocket(ws);

  ws.onopen = () => {
    ws.send(JSON.stringify({ event: registerEvent, uuid }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleEvent(msg);
  };

  ws.onerror = (err) => {
    console.error('[Plugin] WS error:', err);
  };

  ws.onclose = () => {
    console.log('[Plugin] Connection closed');
  };
}

function handleEvent(msg) {
  const { event, action, context, device, payload } = msg;

  switch (event) {
    case 'willAppear':
      ensureAction(context, action, payload);
      if (instances[context]) {
        instances[context].onWillAppear(payload);
      }
      break;

    case 'willDisappear':
      if (instances[context]) {
        instances[context].onWillDisappear();
        delete instances[context];
      }
      break;

    case 'keyDown':
      if (instances[context]) {
        instances[context].onKeyDown(payload);
      }
      break;

    case 'didReceiveSettings':
      ensureAction(context, action, payload);
      if (instances[context]) {
        instances[context].onSettingsUpdated(payload ? payload.settings : {});
      }
      break;

    case 'didReceiveGlobalSettings':
      setGlobalSettingsStore(payload ? payload.settings : {});
      Object.values(instances).forEach(inst => {
        if (inst.onGlobalSettingsChanged) {
          inst.onGlobalSettingsChanged(_globalSettings);
        }
      });
      break;

    case 'sendToPlugin':
      if (instances[context]) {
        instances[context].onMessageFromPI(payload);
      }
      break;

    case 'deviceDidConnect':
      break;
    case 'deviceDidDisconnect':
      break;
    default:
      console.log('[Plugin] Unhandled event:', event);
  }
}

function ensureAction(context, actionUuid, payload) {
  if (instances[context]) return;
  if (!actionUuid) return;

  const ActionClass = ACTION_MAP[actionUuid];
  if (!ActionClass) {
    console.warn('[Plugin] Unknown action UUID:', actionUuid);
    return;
  }

  const settings = (payload && payload.settings) || {};
  instances[context] = new ActionClass(context, settings, actionUuid, _globalSettings);
}

(function init() {
  if (typeof window !== 'undefined') {
    if (window.args && Array.isArray(window.args)) {
      const a = parseArgs();
      if (a.port) {
        connectOpenActionSocket(a.port, a.pluginUUID || pluginUUID, a.registerEvent || '', a.info || {});
      }
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('port')) {
      connectOpenActionSocket(
        parseInt(params.get('port'), 10),
        params.get('pluginUUID') || '',
        params.get('registerEvent') || '',
        params.get('info') || ''
      );
    }
  }
})();

window.connectOpenActionSocket = connectOpenActionSocket;
