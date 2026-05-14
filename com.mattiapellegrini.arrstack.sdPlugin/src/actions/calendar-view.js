import { BaseAction } from '../base-action.js';
import { createArrClient } from '../arr-api-client.js';
import { getServiceConfig } from '../utils/settings-manager.js';
import { formatRelativeTime, truncate } from '../utils/title-formatter.js';
import { getService } from '../service-registry.js';

export class CalendarViewAction extends BaseAction {
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

    const svc = getService(this.settings.serviceId);
    if (svc && svc.calendarSupported === false) {
      return { success: true, data: { unsupported: true } };
    }

    const now = new Date();
    const start = now.toISOString().split('T')[0];
    const lookahead = parseInt(this.settings.lookaheadDays, 10) || 7;
    const end = new Date(now.getTime() + lookahead * 86400000).toISOString().split('T')[0];
    const monitored = this.settings.monitoredOnly !== false;

    const result = await client.getCalendar(start, end, !monitored);
    if (!result.success) return result;

    const items = Array.isArray(result.data) ? result.data : [];
    this._items = items;
    return {
      success: true,
      data: { items },
    };
  }

  formatTitle(data) {
    if (!data) return 'No Data';
    if (data.unsupported) return 'Calendar\nN/A';

    const items = data.items || [];
    if (items.length === 0) return 'Calendar\nNothing';
    if (items.length === 1) return `1 upcoming\n${this._getItemTitle(items[0])}`;

    const itemIndex = this._viewIndex % items.length;
    const current = items[itemIndex];
    const title = truncate(this._getItemTitle(current), 14);
    const date = this._getItemDate(current);
    return `${title}\n${date}`;
  }

  _getItemTitle(item) {
    if (item.title) return item.title;
    if (item.series && item.series.title) {
      const ep = item.episodeNumber ? `S${item.seasonNumber || '?'}E${item.episodeNumber}` : '';
      return ep ? `${item.series.title} ${ep}` : item.series.title;
    }
    if (item.movie && item.movie.title) return item.movie.title;
    if (item.artist && item.artist.artistName) return item.artist.artistName;
    return 'Unknown';
  }

  _getItemDate(item) {
    const d = item.airDate || item.airDateUtc || item.releaseDate || item.inCinemas;
    if (!d) return '?';
    return formatRelativeTime(d);
  }

  getState() {
    return 0;
  }

  onKeyDown(payload) {
    if (this._items.length > 0) {
      this._viewIndex++;
      this.updateDisplay();
    }
  }
}
