import { BaseAction } from '../base-action.js';
import { createArrClient } from '../arr-api-client.js';
import { getServiceConfig } from '../utils/settings-manager.js';
import { formatCompactNumber, formatBytes } from '../utils/title-formatter.js';

export class StatsDashboardAction extends BaseAction {
  constructor(context, settings, actionUuid) {
    super(context, settings, actionUuid);
    this._client = null;
    this._views = ['resources', 'system'];
    if (settings.includeActivity !== false) this._views.push('activity');
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

    const [resourcesRes, statusRes] = await Promise.all([
      client.listResources(),
      client.systemStatus(),
    ]);

    if (!resourcesRes.success && !statusRes.success) {
      return resourcesRes.success ? statusRes : resourcesRes;
    }

    return {
      success: true,
      data: {
        resources: resourcesRes.success ? resourcesRes.data : null,
        status: statusRes.success ? statusRes.data : null,
      },
    };
  }

  formatTitle(data) {
    if (!data) return 'No Data';
    const svc = this.settings.serviceId || '?';
    const displayName = svc.charAt(0).toUpperCase() + svc.slice(1);
    const view = this._viewIndex % this._views.length;

    if (view === 0) {
      const count = Array.isArray(data.resources) ? data.resources.length : 0;
      const resourceLabel = this._getResourceLabel(count);
      return `${formatCompactNumber(count)}\n${resourceLabel}`;
    }

    if (view === 1) {
      if (data.status) {
        const version = data.status.version || '?';
        return `${displayName}\nv${version}`;
      }
      return `${displayName}\n—`;
    }

    if (view === 2) {
      if (!Array.isArray(data.resources)) return 'Activity\n—';
      const now = new Date();
      const recent = data.resources.filter(r => {
        const added = r.added || r.releaseDate;
        if (!added) return false;
        const d = new Date(added);
        return (now - d) < 86400000;
      });
      return `Today\n+${recent.length}`;
    }

    return 'Stats';
  }

  _getResourceLabel(count) {
    const svc = this.settings.serviceId;
    const labels = {
      sonarr: count === 1 ? 'Series' : 'Series',
      radarr: count === 1 ? 'Movie' : 'Movies',
      lidarr: count === 1 ? 'Artist' : 'Artists',
      readarr: count === 1 ? 'Book' : 'Books',
      prowlarr: count === 1 ? 'Indexer' : 'Indexers',
      bazarr: count === 1 ? 'Lang' : 'Langs',
    };
    return labels[svc] || 'Items';
  }

  onKeyDown(payload) {
    this._viewIndex++;
    this.updateDisplay();
  }
}
