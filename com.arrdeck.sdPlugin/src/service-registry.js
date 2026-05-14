/**
 * *Arr Deck — Service Registry
 *
 * Defines configuration for all 6 *arr services.
 * Maps generic operations to service-specific endpoints, resource names, and commands.
 */

/** @typedef {'sonarr'|'radarr'|'lidarr'|'readarr'|'prowlarr'|'bazarr'} ServiceId */

/** @type {Object<ServiceId, {id: string, name: string, defaultPort: number, apiVersion: string, resourceName: string, commands: Object<string, string>, calendarSupported: boolean}>} */
const SERVICES = {
  sonarr: {
    id: 'sonarr',
    name: 'Sonarr',
    defaultPort: 8989,
    apiVersion: 'v3',
    resourceName: 'series',
    calendarSupported: true,
    commands: {
      searchMissing: 'MissingEpisodeSearch',
      refresh: 'RefreshSeries',
      rssSync: 'RssSync',
      backup: 'Backup',
      episodeSearch: 'EpisodeSearch',
      downloadedScan: 'DownloadedEpisodesScan',
    },
  },
  radarr: {
    id: 'radarr',
    name: 'Radarr',
    defaultPort: 7878,
    apiVersion: 'v3',
    resourceName: 'movie',
    calendarSupported: true,
    commands: {
      searchMissing: 'MoviesSearch',
      refresh: 'RefreshMovie',
      rssSync: 'RssSync',
      backup: 'Backup',
      movieSearch: 'MoviesSearch',
    },
  },
  lidarr: {
    id: 'lidarr',
    name: 'Lidarr',
    defaultPort: 8686,
    apiVersion: 'v1',
    resourceName: 'artist',
    calendarSupported: true,
    commands: {
      searchMissing: 'ArtistSearch',
      refresh: 'RefreshArtist',
      rssSync: 'RssSync',
      backup: 'Backup',
      albumSearch: 'AlbumSearch',
    },
  },
  readarr: {
    id: 'readarr',
    name: 'Readarr',
    defaultPort: 8787,
    apiVersion: 'v1',
    resourceName: 'book',
    calendarSupported: false,
    commands: {
      searchMissing: 'BookSearch',
      refresh: 'RefreshAuthor',
      rssSync: 'RssSync',
      backup: 'Backup',
      bookSearch: 'BookSearch',
    },
  },
  prowlarr: {
    id: 'prowlarr',
    name: 'Prowlarr',
    defaultPort: 9696,
    apiVersion: 'v1',
    resourceName: 'indexer',
    calendarSupported: false,
    commands: {
      searchMissing: 'ApplicationSearch',
      refresh: 'RefreshIndexer',
      rssSync: 'RssSync',
      backup: 'Backup',
    },
  },
  bazarr: {
    id: 'bazarr',
    name: 'Bazarr',
    defaultPort: 6767,
    apiVersion: 'v1',
    resourceName: 'subtitle',
    calendarSupported: false,
    commands: {
      searchMissing: 'WantedSubtitlesSync',
      refresh: 'ScanDisk',
      rssSync: 'SyncAll',
      backup: 'Backup',
    },
  },
};

/**
 * Get configuration for a specific service.
 * @param {ServiceId} id
 * @returns {object|undefined}
 */
export function getService(id) {
  return SERVICES[id] ? { ...SERVICES[id] } : undefined;
}

/**
 * Get all available service IDs.
 * @returns {ServiceId[]}
 */
export function getAllServiceIds() {
  return Object.keys(SERVICES);
}

/**
 * Get all available services with their configs.
 * @returns {object[]}
 */
export function getAllServices() {
  return Object.values(SERVICES).map(s => ({ ...s }));
}

/**
 * Map a generic command name to a service-specific command name.
 * @param {ServiceId} serviceId
 * @param {string} genericCommand
 * @returns {string|undefined}
 */
export function getCommand(serviceId, genericCommand) {
  const svc = SERVICES[serviceId];
  if (!svc) return undefined;
  return svc.commands[genericCommand];
}

/**
 * Get all available generic commands for a service (for property inspector dropdowns).
 * @param {ServiceId} serviceId
 * @returns {Array<{generic: string, specific: string}>}
 */
export function getAvailableCommands(serviceId) {
  const svc = SERVICES[serviceId];
  if (!svc) return [];
  return Object.entries(svc.commands).map(([generic, specific]) => ({
    generic,
    specific,
  }));
}

/**
 * Build the base API URL for a service.
 * @param {ServiceId} serviceId
 * @param {string} host - e.g., "http://localhost:8989"
 * @returns {string} e.g., "http://localhost:8989/api/v3"
 */
export function getApiBaseUrl(serviceId, host) {
  const svc = SERVICES[serviceId];
  if (!svc) return host;
  const base = host.replace(/\/+$/, '');
  return `${base}/api/${svc.apiVersion}`;
}

export default SERVICES;
