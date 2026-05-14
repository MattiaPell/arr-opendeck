import { BaseAction } from '../base-action.js';
import { createArrClient } from '../arr-api-client.js';
import { getServiceConfig } from '../utils/settings-manager.js';
import { getService, getAvailableCommands } from '../service-registry.js';

export class QuickCommandAction extends BaseAction {
  constructor(context, settings, actionUuid) {
    super(context, settings, actionUuid);
    this._client = null;
  }

  _getClient() {
    const cfg = getServiceConfig(this.settings);
    if (!cfg.serviceId || !cfg.baseUrl || !cfg.apiKey) return null;
    if (!this._client || this._client._serviceId !== cfg.serviceId) {
      this._client = createArrClient(cfg.serviceId, cfg.baseUrl, cfg.apiKey);
    }
    return this._client;
  }

  _getCommandName() {
    if (this.settings.commandType === 'generic' && this.settings.genericCommand) {
      const svc = getService(this.settings.serviceId);
      if (svc && svc.commands[this.settings.genericCommand]) {
        return svc.commands[this.settings.genericCommand];
      }
    }
    return this.settings.customCommand || '';
  }

  async fetchData() {
    const client = this._getClient();
    if (!client) return { success: false, error: { message: 'Configure in PI' } };
    const cmdName = this._getCommandName();
    if (!cmdName) return { success: true, data: { command: null, lastResult: null } };
    const commandsRes = await client.getCommands();
    const lastCommand = Array.isArray(commandsRes.data)
      ? commandsRes.data.filter(c => c.name === cmdName).slice(-1)[0]
      : null;
    return {
      success: true,
      data: { command: cmdName, lastResult: lastCommand },
    };
  }

  formatTitle(data) {
    if (!data) return 'No Data';
    const cmdName = this._getCommandName() || 'No Cmd';
    const shortCmd = cmdName.replace(/([A-Z])/g, ' $1').trim().split(' ').slice(0, 2).join(' ');
    if (data.lastResult) {
      const status = data.lastResult.status || 'unknown';
      return `${shortCmd}\n${status}`;
    }
    return `${shortCmd}\nReady`;
  }

  async onKeyDown(payload) {
    const confirm = this.settings.requireConfirmation !== false;
    if (confirm) {
      this.setTitle('Confirm?\nTap again');
      this._pendingConfirm = true;
      return;
    }
    await this._execute();
  }

  async _execute() {
    const client = this._getClient();
    const cmdName = this._getCommandName();
    if (!client || !cmdName) {
      this.showAlert();
      return;
    }
    this.setTitle('Executing...');
    this.setState(1);
    const result = await client.executeCommand(cmdName);
    if (result.success) {
      this.showOk();
      this._lastData = { command: cmdName, lastResult: result.data };
      this.updateDisplay();
    } else {
      this.showAlert();
      this.setTitle(`Failed\n${cmdName}`);
    }
  }

  updateDisplay() {
    if (this._pendingConfirm) return;
    super.updateDisplay();
  }

  onWillAppear(payload) {
    this._pendingConfirm = false;
    super.onWillAppear(payload);
  }
}
