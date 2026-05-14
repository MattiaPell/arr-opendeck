import { BaseAction } from '../base-action.js';
import { createArrClient } from '../arr-api-client.js';
import { getServiceConfig } from '../utils/settings-manager.js';
import { getHealthIndicator } from '../utils/icon-manager.js';

export class SystemStatusAction extends BaseAction {
  constructor(context, settings, actionUuid) {
    super(context, settings, actionUuid);
    this._client = null;
    this._views = ['status', 'health'];
  }

  _getClient() {
    const cfg = getServiceConfig(this.settings);
    if (!cfg.serviceId || !cfg.baseUrl || !cfg.apiKey) return null;
    if (!this._client || this._client._serviceId !== cfg.serviceId) {
      this._client = createArrClient(cfg.serviceId, cfg.baseUrl, cfg.apiKey);
    }
    return this._client;
  }

  async fetchData() {
    const client = this._getClient();
    if (!client) return { success: false, error: { message: 'Configure in PI' } };
    const [statusRes, healthRes] = await Promise.all([
      client.systemStatus(),
      client.getHealth(),
    ]);
    if (!statusRes.success) return statusRes;
    return {
      success: true,
      data: {
        status: statusRes.data,
        health: healthRes.success ? healthRes.data : [],
      },
    };
  }

  formatTitle(data) {
    if (!data || !data.status) return 'No Data';
    const svc = this.settings.serviceId || '?';
    const displayName = svc.charAt(0).toUpperCase() + svc.slice(1);
    const version = data.status.version || '?';
    const indicator = getHealthIndicator(data.health);

    const view = this._viewIndex % this._views.length;
    if (view === 0) {
      return `${displayName}\nv${version}`;
    }
    const online = data.status.appName ? `${data.status.appName}` : displayName;
    const healthCount = Array.isArray(data.health) ? data.health.length : 0;
    const issues = Array.isArray(data.health)
      ? data.health.filter(h => h.type !== 'Ok').length
      : 0;
    if (issues > 0) {
      return `${online}\n${issues} issue${issues > 1 ? 's' : ''}`;
    }
    return `${online}\n${healthCount} checks OK`;
  }

  getState(data) {
    if (!data) return 1;
    const health = Array.isArray(data.health) ? data.health : [];
    const hasError = health.some(h => h.type === 'Error');
    return hasError ? 1 : 0;
  }

  onKeyDown(payload) {
    this._viewIndex++;
    this.updateDisplay();
  }
}
