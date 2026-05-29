/// <reference path="./anime-torrent-provider.d.ts" />

class Provider {
  prowlarrBaseUrl = '{{prowlarrBaseUrl}}';
  prowlarrApiKey = '{{prowlarrApiKey}}';
  indexerIds = '{{indexerIds}}';
  resultLimit = '{{resultLimit}}';

  getSettings(): AnimeProviderSettings {
    return {
      canSmartSearch: true,
      smartSearchFilters: ['batch', 'episodeNumber', 'resolution', 'query', 'bestReleases'],
      supportsAdult: true,
      type: 'special',
    };
  }

  async search(opts: AnimeSearchOptions): Promise<AnimeTorrent[]> {
    return this.searchByQuery(opts.query);
  }

  async smartSearch(opts: AnimeSmartSearchOptions): Promise<AnimeTorrent[]> {
    const titles = [opts.query, opts.media.englishTitle, opts.media.romajiTitle, ...opts.media.synonyms]
      .filter((title): title is string => Boolean(title?.trim()));

    const query = titles[0] || '';
    if (!query) return [];

    const parts = [query];
    if (opts.episodeNumber > 0) parts.push(String(opts.episodeNumber));
    if (opts.resolution) parts.push(opts.resolution);
    if (opts.batch) parts.push('batch');
    if (opts.bestReleases) parts.push('best');

    return this.searchByQuery(parts.join(' ').trim());
  }

  async getTorrentInfoHash(torrent: AnimeTorrent): Promise<string> {
    if (torrent.infoHash) return torrent.infoHash;
    return this.extractInfoHash(torrent.magnetLink || torrent.downloadUrl || '');
  }

  async getTorrentMagnetLink(torrent: AnimeTorrent): Promise<string> {
    if (torrent.magnetLink) return torrent.magnetLink;
    return torrent.downloadUrl?.startsWith('magnet:') ? torrent.downloadUrl : '';
  }

  async getLatest(): Promise<AnimeTorrent[]> {
    return [];
  }

  private async searchByQuery(query: string): Promise<AnimeTorrent[]> {
    if (!query?.trim() || !this.prowlarrBaseUrl || !this.prowlarrApiKey) {
      return [];
    }

    const url = new URL('/api/v1/search', this.normalizeBaseUrl(this.prowlarrBaseUrl));
    url.searchParams.set('query', query.trim());

    for (const id of this.parseIndexerIds(this.indexerIds)) {
      url.searchParams.append('indexerIds', String(id));
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': this.prowlarrApiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const items = (await response.json()) as ProwlarrSearchResult[];
    return items
      .map((item) => this.toAnimeTorrent(item))
      .filter((item): item is AnimeTorrent => Boolean(item))
      .slice(0, this.parseLimit(this.resultLimit));
  }

  private toAnimeTorrent(item: ProwlarrSearchResult): AnimeTorrent | null {
    if (!item.title) return null;

    const magnetLink = item.magnetUrl || (item.downloadUrl?.startsWith('magnet:') ? item.downloadUrl : undefined);
    const downloadUrl = item.downloadUrl || magnetLink || '';
    const infoHash = this.extractInfoHash(magnetLink || '');

    return {
      name: item.title,
      date: item.publishDate || new Date().toISOString(),
      size: Number(item.size) || 0,
      formattedSize: this.formatBytes(Number(item.size) || 0),
      seeders: Number(item.seeders) || 0,
      leechers: Number(item.leechers) || 0,
      downloadCount: Number(item.grabs) || 0,
      link: item.infoUrl || item.guid || downloadUrl,
      downloadUrl,
      magnetLink,
      infoHash: infoHash || undefined,
      resolution: this.extractResolution(item.title),
      isBatch: /\b(batch|complete|全集|s\d{1,2}\s*[-:]?\s*\d{1,3})\b/i.test(item.title),
      episodeNumber: -1,
      releaseGroup: this.extractReleaseGroup(item.title),
      isBestRelease: false,
      confirmed: false,
    };
  }

  private normalizeBaseUrl(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
  }

  private parseIndexerIds(raw: string): number[] {
    if (!raw) return [];

    return raw
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v > 0);
  }

  private parseLimit(raw: string): number {
    const value = Number(raw);
    if (Number.isInteger(value) && value > 0) {
      return Math.min(value, 200);
    }

    return 50;
  }

  private extractResolution(name: string): string | undefined {
    const match = name.match(/\b(2160p|1080p|720p|480p)\b/i);
    return match ? match[1].toLowerCase() : undefined;
  }

  private extractReleaseGroup(name: string): string | undefined {
    const match = name.match(/^\[(.*?)\]/);
    return match?.[1] || undefined;
  }

  private extractInfoHash(magnet: string): string {
    const match = magnet.match(/xt=urn:btih:([a-zA-Z0-9]{32,40})/i);
    return match?.[1] || '';
  }

  private formatBytes(size: number): string {
    if (!size || size <= 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = size;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }
}

interface ProwlarrSearchResult {
  title?: string;
  size?: number;
  seeders?: number;
  leechers?: number;
  grabs?: number;
  publishDate?: string;
  downloadUrl?: string;
  magnetUrl?: string;
  infoUrl?: string;
  guid?: string;
}

(globalThis as { Provider?: typeof Provider }).Provider = Provider;
