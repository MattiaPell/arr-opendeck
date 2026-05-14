/**
 * *Arr Deck — Icon Manager
 *
 * Manage visual icon states for Stream Deck buttons.
 */

/**
 * Determine status indicator emoji/symbol based on health checks.
 * @param {Array} health - health check results from *arr API
 * @returns {{symbol: string, color: string}}
 */
export function getHealthIndicator(health) {
  if (!health || !Array.isArray(health) || health.length === 0) {
    return { symbol: '?', color: '#808080' };
  }

  const hasError = health.some(h => h.type === 'Error');
  const hasWarning = health.some(h => h.type === 'Warning');

  if (hasError) return { symbol: '✕', color: '#ef4444' };
  if (hasWarning) return { symbol: '△', color: '#eab308' };
  return { symbol: '✓', color: '#22c55e' };
}

/**
 * Get a color hex for a given state name.
 * @param {string} state - 'healthy' | 'warning' | 'error' | 'idle' | 'active'
 * @returns {string}
 */
export function getStateColor(state) {
  const colors = {
    healthy: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    idle: '#808080',
    active: '#3b82f6',
    success: '#22c55e',
    info: '#3b82f6',
  };
  return colors[state] || '#ffffff';
}

/**
 * Get a short label for queue status.
 * @param {object} queueStatus
 * @returns {{label: string, color: string}}
 */
export function getQueueIndicator(queueStatus) {
  if (!queueStatus) return { label: '—', color: '#808080' };

  const total = queueStatus.totalCount || 0;
  const errors = queueStatus.errors || 0;
  const warnings = queueStatus.warnings || 0;

  if (errors > 0) return { label: `${errors} err`, color: '#ef4444' };
  if (warnings > 0) return { label: `${warnings} warn`, color: '#eab308' };
  if (total > 0) return { label: `${total} queued`, color: '#3b82f6' };
  return { label: 'idle', color: '#22c55e' };
}
