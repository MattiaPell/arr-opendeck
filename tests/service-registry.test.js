import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Import the module under test — need to handle the fact it's in the plugin dir
// We use a relative path that works from the project root when Node runs from tests/
const registryPath = '../com.arrdeck.sdPlugin/src/service-registry.js';

let reg;
before(async () => {
  reg = await import(registryPath);
});

describe('Service Registry', () => {
  it('returns all 6 services', () => {
    const ids = reg.getAllServiceIds();
    assert.equal(ids.length, 6);
    assert(ids.includes('sonarr'));
    assert(ids.includes('radarr'));
    assert(ids.includes('lidarr'));
    assert(ids.includes('readarr'));
    assert(ids.includes('prowlarr'));
    assert(ids.includes('bazarr'));
  });

  it('returns correct config for sonarr', () => {
    const svc = reg.getService('sonarr');
    assert.equal(svc.resourceName, 'series');
    assert.equal(svc.defaultPort, 8989);
    assert.equal(svc.apiVersion, 'v3');
    assert.equal(svc.name, 'Sonarr');
    assert.equal(svc.calendarSupported, true);
  });

  it('returns correct config for radarr', () => {
    const svc = reg.getService('radarr');
    assert.equal(svc.resourceName, 'movie');
    assert.equal(svc.defaultPort, 7878);
    assert.equal(svc.apiVersion, 'v3');
    assert.equal(svc.calendarSupported, true);
  });

  it('returns correct config for lidarr', () => {
    const svc = reg.getService('lidarr');
    assert.equal(svc.resourceName, 'artist');
    assert.equal(svc.defaultPort, 8686);
    assert.equal(svc.apiVersion, 'v1');
  });

  it('returns correct config for readarr', () => {
    const svc = reg.getService('readarr');
    assert.equal(svc.resourceName, 'book');
    assert.equal(svc.defaultPort, 8787);
    assert.equal(svc.apiVersion, 'v1');
    assert.equal(svc.calendarSupported, false);
  });

  it('returns correct config for prowlarr', () => {
    const svc = reg.getService('prowlarr');
    assert.equal(svc.resourceName, 'indexer');
    assert.equal(svc.defaultPort, 9696);
    assert.equal(svc.apiVersion, 'v1');
  });

  it('returns correct config for bazarr', () => {
    const svc = reg.getService('bazarr');
    assert.equal(svc.resourceName, 'subtitle');
    assert.equal(svc.defaultPort, 6767);
    assert.equal(svc.apiVersion, 'v1');
  });

  it('returns undefined for unknown service', () => {
    assert.equal(reg.getService('nonexistent'), undefined);
  });

  it('maps generic commands to service-specific commands', () => {
    assert.equal(reg.getCommand('sonarr', 'searchMissing'), 'MissingEpisodeSearch');
    assert.equal(reg.getCommand('radarr', 'searchMissing'), 'MoviesSearch');
    assert.equal(reg.getCommand('sonarr', 'rssSync'), 'RssSync');
  });

  it('returns undefined for unknown command', () => {
    assert.equal(reg.getCommand('sonarr', 'nonexistent'), undefined);
    assert.equal(reg.getCommand('nonexistent', 'searchMissing'), undefined);
  });

  it('builds correct API base URL for v3', () => {
    const url = reg.getApiBaseUrl('sonarr', 'http://localhost:8989');
    assert.equal(url, 'http://localhost:8989/api/v3');
  });

  it('builds correct API base URL for v1', () => {
    const url = reg.getApiBaseUrl('lidarr', 'http://localhost:8686');
    assert.equal(url, 'http://localhost:8686/api/v1');
  });

  it('strips trailing slashes from host', () => {
    const url = reg.getApiBaseUrl('sonarr', 'http://localhost:8989/');
    assert.equal(url, 'http://localhost:8989/api/v3');
  });

  it('returns all available commands for a service', () => {
    const cmds = reg.getAvailableCommands('sonarr');
    assert(Array.isArray(cmds));
    assert(cmds.length > 0);
    const searchMissing = cmds.find(c => c.generic === 'searchMissing');
    assert.equal(searchMissing.specific, 'MissingEpisodeSearch');
  });

  it('getAllServices returns array of service configs', () => {
    const all = reg.getAllServices();
    assert.equal(all.length, 6);
    assert(all.every(s => s.id && s.name && s.defaultPort && s.apiVersion));
  });
});
