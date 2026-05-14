/**
 * *Arr Deck — Settings Manager
 *
 * Helpers for reading/writing per-action and global settings.
 */

/**
 * Extract service configuration from settings object.
 * @param {object} settings
 * @returns {{ serviceId: string|null, baseUrl: string, apiKey: string, refreshInterval: number, [key: string]: any }}
 */
export function getServiceConfig(settings) {
  return {
    serviceId: settings.serviceId || null,
    baseUrl: settings.baseUrl || '',
    apiKey: settings.apiKey || '',
    refreshInterval: parseInt(settings.refreshInterval, 10) || 30,
    // Include any extra action-specific settings
    ...settings,
  };
}

/**
 * Validate that the required connection settings are present.
 * @param {object} settings
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSettings(settings) {
  const errors = [];

  if (!settings.serviceId) {
    errors.push('Service type is required');
  }

  if (!settings.baseUrl) {
    errors.push('Server URL is required');
  } else if (!settings.baseUrl.startsWith('http://') && !settings.baseUrl.startsWith('https://')) {
    errors.push('Server URL must start with http:// or https://');
  }

  if (!settings.apiKey) {
    errors.push('API key is required');
  } else if (settings.apiKey.length < 10) {
    errors.push('API key looks too short');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default settings for a new action instance.
 * @param {string} serviceId
 * @returns {object}
 */
export function getDefaultSettings(serviceId) {
  const defaults = {
    serviceId: serviceId || '',
    baseUrl: '',
    apiKey: '',
    refreshInterval: 30,
  };
  return defaults;
}

/**
 * Serialize settings for storage (strip empty values).
 * @param {object} settings
 * @returns {object}
 */
export function serializeSettings(settings) {
  const clean = {};
  for (const [key, value] of Object.entries(settings)) {
    if (value !== '' && value !== null && value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}
