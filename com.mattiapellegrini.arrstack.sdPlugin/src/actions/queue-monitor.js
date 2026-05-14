import { BaseAction } from '../base-action.js';
import { createArrClient } from '../arr-api-client.js';
import { getServiceConfig } from '../utils/settings-manager.js';

export class QueueMonitorAction extends BaseAction {
  constructor(context, settings, actionUuid) {
    super(context, settings, actionUuid);
    this._client = null;
    this._views = ['summary', 'details'];
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
    const [queueRes, statusRes] = await Promise.all([
      client.getQueue({ page: 1, pageSize: 50 }),
      client.getQueueStatus().catch(() => ({ success: false })),
    ]);
    if (!queueRes.success) return queueRes;
    return {
      success: true,
      data: {
        queue: queueRes.data,
        queueStatus: statusRes.success ? statusRes.data : null,
      },
    };
  }

  formatTitle(data) {
    if (!data || !data.queue) return 'No Data';
    const qs = data.queueStatus;
    const queueRecords = data.queue.records || [];
    const total = qs ? qs.totalCount || 0 : queueRecords.length;
    const downloading = queueRecords.filter(r => r.status === 'downloading').length;
    const pending = queueRecords.filter(r => r.status === 'queued' || r.status === 'pending').length;
    const failed = qs ? qs.errors || 0 : this._countFailed(queueRecords);

    const view = this._viewIndex % this._views.length;
    if (view === 0) {
      if (total === 0) return 'Queue\nIdle';
      if (downloading > 0) return `${total} queue\n${downloading} DL`;
      return `${total} queue\n${pending} pend`;
    }
    if (failed > 0) return `${total} total\n${failed} failed`;
    return `${total} total\n${downloading} active`;
  }

  getState(data) {
    if (!data) return 1;
    const qs = data.queueStatus;
    if (qs && qs.errors && qs.errors > 0) return 1;
    const records = (data.queue && data.queue.records) || [];
    const downloading = records.filter(r => r.status === 'downloading').length;
    return downloading > 0 ? 1 : 0;
  }

  onKeyDown(payload) {
    this._viewIndex++;
    this.updateDisplay();
  }

  _countFailed(records) {
    return records.filter(r => r.status === 'error' || r.status === 'failed').length;
  }
}
