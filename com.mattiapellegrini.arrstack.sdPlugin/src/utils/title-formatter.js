/**
 * *Arr Deck — Title Formatter Utility
 *
 * Format various data types for display on Stream Deck button surfaces (72x72px).
 */

/**
 * Format a number with abbreviations: 1234 → "1.2K", 1234567 → "1.2M"
 * @param {number} num
 * @returns {string}
 */
export function formatCompactNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  if (Math.abs(num) < 1000) return String(num);
  if (Math.abs(num) < 1000000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (Math.abs(num) < 1000000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
}

/**
 * Format bytes into human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return size.toFixed(1).replace(/\.0$/, '') + ' ' + units[i];
}

/**
 * Format a date as relative time string ("2h ago", "3d ago").
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid date';
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
  return `${Math.floor(diffDay / 365)}y ago`;
}

/**
 * Format a duration in seconds to a short display string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 && parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}

/**
 * Truncate a string to fit on a button, adding "…" if needed.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 18) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '…';
}

/**
 * Format title for a two-line button display.
 * @param {string} line1
 * @param {string} line2
 * @returns {string}
 */
export function formatLines(line1, line2) {
  const l1 = truncate(line1, 20);
  const l2 = truncate(line2, 20);
  if (!l2) return l1;
  return `${l1}\n${l2}`;
}
