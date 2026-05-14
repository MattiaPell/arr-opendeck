/**
 * *Arr Deck — Base Action Class
 *
 * Base class that all 7 action implementations extend.
 * Provides shared lifecycle methods, timer management, and WebSocket communication.
 */

/** @type {WebSocket|null} */
let _ws = null;

/**
 * Set the active WebSocket connection (called from plugin.js on connect).
 * @param {WebSocket} ws
 */
export function setWebSocket(ws) {
  _ws = ws;
}

/**
 * Get the current WebSocket connection.
 * @returns {WebSocket|null}
 */
export function getWebSocket() {
  return _ws;
}

export class BaseAction {
  /**
   * @param {string} context - Stream Deck action context
   * @param {object} settings - User-configured settings
   * @param {string} actionUuid - The action UUID from the manifest
   */
  constructor(context, settings, actionUuid) {
    this.context = context;
    this.settings = settings || {};
    this.actionUuid = actionUuid;
    this._pollTimer = null;
    this._pollInterval = 30000; // default 30s
    this._viewIndex = 0;
    this._lastData = null;
    this._error = null;
  }

  // --- Lifecycle (override in subclasses) ---

  /** Called when the action appears on the Stream Deck. Subclass should call super(). */
  onWillAppear(payload) {
    const interval = this.settings.refreshInterval;
    if (interval && !isNaN(interval)) {
      this._pollInterval = Math.max(5000, parseInt(interval, 10) * 1000);
    }
    this.fetchAndUpdate();
    this.startPolling();
  }

  /** Called when the action is removed from the Stream Deck. */
  onWillDisappear() {
    this.stopPolling();
  }

  /** Called when the key is pressed. Override for action-specific behavior. */
  onKeyDown(payload) {
    // Default: cycle view index
    this._viewIndex++;
    this.updateDisplay();
  }

  /** Called when settings are updated from the Property Inspector. */
  onSettingsUpdated(settings) {
    this.settings = settings || {};
    const interval = this.settings.refreshInterval;
    if (interval && !isNaN(interval)) {
      this._pollInterval = Math.max(5000, parseInt(interval, 10) * 1000);
      if (this._pollTimer) {
        this.stopPolling();
        this.startPolling();
      }
    }
    this.fetchAndUpdate();
  }

  /** Called when a message is received from the Property Inspector. */
  onMessageFromPI(payload) {
    // Override in subclass for PI-plugin communication
  }

  // --- Data fetching (override in subclasses) ---

  /**
   * Fetch data from the *arr service. Must be overridden.
   * @returns {Promise<{success: boolean, data?: any, error?: object}>}
   */
  async fetchData() {
    throw new Error('fetchData() must be implemented by subclass');
  }

  /**
   * Format fetched data into a button title string. Must be overridden.
   * @param {any} data
   * @returns {string}
   */
  formatTitle(data) {
    return this.actionUuid || 'Action';
  }

  /**
   * Determine visual state from data (0 = normal, 1 = alert/alternate). Override as needed.
   * @param {any} data
   * @returns {number}
   */
  getState(data) {
    return 0;
  }

  // --- Polling ---

  startPolling(intervalMs) {
    this.stopPolling();
    if (intervalMs) this._pollInterval = intervalMs;
    this._pollTimer = setInterval(() => {
      this.fetchAndUpdate();
    }, this._pollInterval);
  }

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  // --- Display ---

  async fetchAndUpdate() {
    const result = await this.fetchData();
    if (result.success) {
      this._lastData = result.data;
      this._error = null;
    } else {
      this._error = result.error;
    }
    this.updateDisplay();
  }

  updateDisplay() {
    if (this._error) {
      this.setTitle(this._error.message || 'Error');
      this.setState(1);
      return;
    }

    const title = this.formatTitle(this._lastData);
    this.setTitle(title);
    this.setState(this.getState(this._lastData));
  }

  // --- WebSocket helpers ---

  /**
   * Send a setTitle event to the Stream Deck.
   * @param {string} title
   */
  setTitle(title) {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      event: 'setTitle',
      context: this.context,
      payload: {
        title: String(title).substring(0, 100),
        target: 0,
      },
    }));
  }

  /**
   * Send setImage event.
   * @param {string} image - base64 encoded image or path
   */
  setImage(image) {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      event: 'setImage',
      context: this.context,
      payload: {
        image,
        target: 0,
      },
    }));
  }

  /**
   * Switch to a specific state (0 = normal, 1 = alert).
   * @param {number} state
   */
  setState(state) {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      event: 'setState',
      context: this.context,
      payload: { state },
    }));
  }

  /** Show green checkmark briefly. */
  showOk() {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      event: 'showOk',
      context: this.context,
    }));
  }

  /** Show red alert briefly. */
  showAlert() {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      event: 'showAlert',
      context: this.context,
    }));
  }

  /**
   * Save settings for this action.
   * @param {object} settings
   */
  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      event: 'setSettings',
      context: this.context,
      payload: this.settings,
    }));
  }

  /**
   * Send a message to the Property Inspector.
   * @param {object} payload
   */
  sendToPI(payload) {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      event: 'sendToPropertyInspector',
      action: this.actionUuid,
      context: this.context,
      payload,
    }));
  }
}
