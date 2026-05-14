let _ws = null;

export function setWebSocket(ws) {
  _ws = ws;
}

export function getWebSocket() {
  return _ws;
}

export class BaseAction {
  constructor(context, settings, actionUuid, globalSettings) {
    this.context = context;
    this.settings = settings || {};
    this.actionUuid = actionUuid;
    this._globalSettings = globalSettings || {};
    this._pollTimer = null;
    this._pollInterval = 30000;
    this._viewIndex = 0;
    this._lastData = null;
    this._error = null;
    this._consecutiveFails = 0;
    this._backoffTimer = null;
    this._maxBackoffMs = 60000;
  }

  /**
   * Merge per-action settings with global settings.
   * Per-action values take precedence over global.
   */
  _effectiveSettings() {
    const gs = this._globalSettings || {};
    return {
      serviceId: this.settings.serviceId || gs.serviceId || '',
      baseUrl: this.settings.baseUrl || gs.baseUrl || '',
      apiKey: this.settings.apiKey || gs.apiKey || '',
      refreshInterval: this.settings.refreshInterval || gs.refreshInterval || 30,
      useGlobal: this.settings.useGlobal !== false,
      ...this.settings,
    };
  }

  onGlobalSettingsChanged(globalSettings) {
    this._globalSettings = globalSettings || {};
    this.fetchAndUpdate();
  }

  onWillAppear(payload) {
    const interval = this.settings.refreshInterval;
    if (interval && !isNaN(interval)) {
      this._pollInterval = Math.max(5000, parseInt(interval, 10) * 1000);
    }
    this.fetchAndUpdate();
    this.startPolling();
  }

  onWillDisappear() {
    this.stopPolling();
    this._cancelBackoff();
  }

  onKeyDown(payload) {
    this._viewIndex++;
    this.updateDisplay();
  }

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
    this._consecutiveFails = 0;
    this._cancelBackoff();
    this.fetchAndUpdate();
  }

  onMessageFromPI(payload) {
  }

  async fetchData() {
    throw new Error('fetchData() must be implemented by subclass');
  }

  formatTitle(data) {
    return this.actionUuid || 'Action';
  }

  getState(data) {
    return 0;
  }

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

  _cancelBackoff() {
    if (this._backoffTimer) {
      clearTimeout(this._backoffTimer);
      this._backoffTimer = null;
    }
  }

  async fetchAndUpdate() {
    if (this._backoffTimer) return;

    const result = await this.fetchData();
    if (result.success) {
      this._lastData = result.data;
      this._error = null;
      this._consecutiveFails = 0;
    } else {
      this._error = result.error;
      this._consecutiveFails++;
      this._scheduleBackoff();
    }
    this.updateDisplay();
  }

  _scheduleBackoff() {
    this._cancelBackoff();
    const delay = Math.min(
      1000 * Math.pow(2, this._consecutiveFails - 1),
      this._maxBackoffMs
    );
    if (delay > this._pollInterval) return;
    this._backoffTimer = setTimeout(() => {
      this._backoffTimer = null;
      this.fetchAndUpdate();
    }, delay);
  }

  updateDisplay() {
    if (this._error) {
      let msg = this._error.message || 'Error';
      if (this._consecutiveFails > 1) {
        const retrySec = Math.ceil(
          Math.min(1000 * Math.pow(2, this._consecutiveFails - 1), this._maxBackoffMs) / 1000
        );
        msg = `${msg} (${retrySec}s)`;
      }
      this.setTitle(msg);
      this.setState(1);
      return;
    }
    const title = this.formatTitle(this._lastData);
    this.setTitle(title);
    this.setState(this.getState(this._lastData));
  }

  setTitle(title) {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      event: 'setTitle',
      context: this.context,
      payload: { title: String(title).substring(0, 100), target: 0 },
    }));
  }

  setImage(image) {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      event: 'setImage',
      context: this.context,
      payload: { image, target: 0 },
    }));
  }

  setState(state) {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      event: 'setState',
      context: this.context,
      payload: { state },
    }));
  }

  showOk() {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({ event: 'showOk', context: this.context }));
  }

  showAlert() {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({ event: 'showAlert', context: this.context }));
  }

  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      event: 'setSettings',
      context: this.context,
      payload: this.settings,
    }));
  }

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
