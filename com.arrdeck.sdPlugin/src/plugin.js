/**
 * *Arr Deck — Plugin Entry Point
 *
 * WebSocket connection manager, event router, and action instance lifecycle.
 */

import { setWebSocket } from './base-action.js';
import { SystemStatusAction } from './actions/system-status.js';
import { QueueMonitorAction } from './actions/queue-monitor.js';
import { QuickCommandAction } from './actions/quick-command.js';
import { SearchMissingAction } from './actions/search-missing.js';
import { StatsDashboardAction } from './actions/stats-dashboard.js';
import { CalendarViewAction } from './actions/calendar-view.js';
import { RecentlyAddedAction } from './actions/recently-added.js';

/** Map from action UUID → constructor */
const ACTION_MAP = {
  'com.arrdeck.system-status': SystemStatusAction,
  'com.arrdeck.queue-monitor': QueueMonitorAction,
  'com.arrdeck.quick-command': QuickCommandAction,
  'com.arrdeck.search-missing': SearchMissingAction,
  'com.arrdeck.stats-dashboard': StatsDashboardAction,
  'com.arrdeck.calendar-view': CalendarViewAction,
  'com.arrdeck.recently-added': RecentlyAddedAction,
};

/** @type {Object<string, import('./base-action.js').BaseAction>} */
const instances = {};
let ws = null;
let pluginUUID = '';

/**
 * Parse CLI arguments from the OpenAction server launch command.
 * @returns {{port: number, pluginUUID: string, registerEvent: string, info: object}}
 */
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

/**
 * Connect to the OpenAction server.
 * Stream Deck SDK expects this function to be globally available.
 * @param {number} port
 * @param {string} uuid
 * @param {string} registerEvent
 * @param {object|string} info
 */
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

/**
 * Main event router — dispatches incoming events to the correct action instance.
 * @param {object} msg - parsed WebSocket message
 */
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

    case 'keyUp':
      if (instances[context]) {
        // Key up handler if needed
      }
      break;

    case 'didReceiveSettings':
      ensureAction(context, action, payload);
      if (instances[context]) {
        instances[context].onSettingsUpdated(payload ? payload.settings : {});
      }
      break;

    case 'sendToPlugin':
      if (instances[context]) {
        instances[context].onMessageFromPI(payload);
      }
      break;

    case 'deviceDidConnect':
      console.log('[Plugin] Device connected:', device);
      break;

    case 'deviceDidDisconnect':
      console.log('[Plugin] Device disconnected:', device);
      break;

    case 'didReceiveGlobalSettings':
      break;

    default:
      console.log('[Plugin] Unhandled event:', event);
  }
}

/**
 * Create or retrieve an action instance for a given context.
 * @param {string} context
 * @param {string} actionUuid
 * @param {object} [payload]
 */
function ensureAction(context, actionUuid, payload) {
  if (instances[context]) return;
  if (!actionUuid) return;

  const ActionClass = ACTION_MAP[actionUuid];
  if (!ActionClass) {
    console.warn('[Plugin] Unknown action UUID:', actionUuid);
    return;
  }

  const settings = (payload && payload.settings) || {};
  instances[context] = new ActionClass(context, settings, actionUuid);
}

// --- Auto-init for HTML plugin mode ---
// The plugin can receive args via the URL query string or window.args
(function init() {
  if (typeof window !== 'undefined') {
    if (window.args && Array.isArray(window.args)) {
      const a = parseArgs();
      if (a.port) {
        connectOpenActionSocket(a.port, a.pluginUUID || pluginUUID, a.registerEvent || '', a.info || {});
      }
    }

    // Support URL-based args: ?port=...&pluginUUID=...&registerEvent=...
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

// Export for Stream Deck SDK compatibility
window.connectOpenActionSocket = connectOpenActionSocket;
