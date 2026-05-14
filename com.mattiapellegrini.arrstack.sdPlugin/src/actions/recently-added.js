import { BaseAction } from '../base-action.js';
import { createArrClient } from '../arr-api-client.js';
import { getServiceConfig } from '../utils/settings-manager.js';
import { formatRelativeTime, truncate } from '../utils/title-formatter.js';

export class RecentlyAddedAction extends BaseAction {
  constructor(context, settings, actionUuid) {
    super(context, settings, actionUuid);
    this._client = null;
    this._items = [];
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

    const result = await client.listResources();
    if (!result.success) return result;

    const items = Array.isArray(result.data) ? result.data : [];
    const lookbackDays = parseInt(this.settings.lookbackDays, 10) || 7;
    const maxItems = parseInt(this.settings.maxItems, 10) || 10;
    const cutoff = new Date(Date.now() - lookbackDays * 86400000);

    const filtered = items
      .filter(item => {
        const added = item.added || item.releaseDate;
        if (!added) return false;
        return new Date(added) >= cutoff;
      })
      .sort((a, b) => {
        const da = new Date(a.added || a.releaseDate || 0);
        const db = new Date(b.added || b.releaseDate || 0);
        return db - da;
      })
      .slice(0, maxItems);

    this._items = filtered;
    return {
      success: true,
      data: { items: filtered, totalCount: filtered.length },
    };
  }

  formatTitle(data) {
    if (!data || !data.items) return 'No Data';
    const items = data.items;
    if (items.length === 0) return 'Recent\nNone';

    const itemIndex = this._viewIndex % items.length;
    const current = items[itemIndex];
    const title = truncate(this._getItemName(current), 14);
    const added = formatRelativeTime(current.added || current.releaseDate);
    return `${title}\n${added}`;
  }

  _getItemName(item) {
    if (item.title) return item.title;
    if (item.artistName) return item.artistName;
    if (item.movie && item.movie.title) return item.movie.title;
    if (item.series && item.series.title) return item.series.title;
    if (item.authorName) return item.authorName;
    return 'Unknown';
  }

  onKeyDown(payload) {
    if (this._items.length > 0) {
      this._viewIndex++;
      this.updateDisplay();
    }
  }
}
