import { BaseAction } from '../base-action.js';
import { createArrClient } from '../arr-api-client.js';
import { getServiceConfig } from '../utils/settings-manager.js';
import { formatCompactNumber } from '../utils/title-formatter.js';
import { getCommand } from '../service-registry.js';

export class SearchMissingAction extends BaseAction {
  constructor(context, settings, actionUuid) {
    super(context, settings, actionUuid);
    this._client = null;
    this._views = ['missing', 'cutoff'];
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

    const [missingRes, cutoffRes] = await Promise.all([
      client.getWantedMissing({ page: 1, pageSize: 1 }),
      this.settings.showCutoff !== false
        ? client.getWantedCutoff({ page: 1, pageSize: 1 })
        : Promise.resolve({ success: false }),
    ]);

    if (!missingRes.success) return missingRes;
    return {
      success: true,
      data: {
        missing: missingRes.data,
        cutoff: cutoffRes.success ? cutoffRes.data : null,
      },
    };
  }

  formatTitle(data) {
    if (!data) return 'No Data';
    const missingTotal = data.missing ? data.missing.totalRecords || 0 : 0;
    const cutoffTotal = data.cutoff ? data.cutoff.totalRecords || 0 : 0;

    const displayMissing = formatCompactNumber(missingTotal);
    const displayCutoff = formatCompactNumber(cutoffTotal);

    const view = this._viewIndex % this._views.length;
    if (view === 0) {
      if (missingTotal === 0) return 'Missing\nComplete!';
      return `Missing\n${displayMissing}`;
    }
    if (cutoffTotal === 0) return 'Cutoff\nOK';
    return `Cutoff\n${displayCutoff}`;
  }

  getState(data) {
    if (!data) return 1;
    const missing = data.missing ? data.missing.totalRecords || 0 : 0;
    return missing > 0 ? 1 : 0;
  }

  async onKeyDown(payload) {
    const client = this._getClient();
    if (!client) return;

    // If showing views, cycle first
    if (this._viewIndex % this._views.length < 1) {
      this._viewIndex++;
      this.updateDisplay();
      return;
    }

    // Trigger search on second press
    if (this.settings.confirmSearch !== false && !this._pendingSearch) {
      this.setTitle('Search all?\nTap again');
      this._pendingSearch = true;
      return;
    }

    const svcId = this.settings.serviceId;
    const cmdName = getCommand(svcId, 'searchMissing');
    if (!cmdName) {
      this.showAlert();
      return;
    }

    const result = await client.executeCommand(cmdName);
    if (result.success) {
      this.showOk();
      this.setTitle('Searching\nTriggered');
    } else {
      this.showAlert();
    }
    this._pendingSearch = false;
  }
}
