import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ProxyConfig {
  url: string;
  user: string;
  pass: string;
}

interface ProxyEntry {
  config: ProxyConfig;
  bannedUntil: number | null;
  failCount: number;
}

const BAN_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MAX_FAILURES = 3;

/**
 * Parses a proxy entry from PROXY_POOL.
 * Supported formats:
 *   socks5://host:port              (Tor, no credentials)
 *   http://host:port                (no credentials)
 *   user:pass@host:port             (HTTP with credentials)
 *   http://user:pass@host:port      (explicit HTTP with credentials)
 */
function parseProxyEntry(raw: string): ProxyConfig {
  // Already has a scheme (socks5://, http://, etc.)
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(raw)) {
    const url = new URL(raw);
    return {
      url: `${url.protocol}//${url.host}`,
      user: decodeURIComponent(url.username),
      pass: decodeURIComponent(url.password),
    };
  }

  // user:pass@host:port
  const atIdx = raw.lastIndexOf('@');
  if (atIdx !== -1) {
    const credentials = raw.slice(0, atIdx);
    const hostPort = raw.slice(atIdx + 1);
    const colonIdx = credentials.indexOf(':');
    return {
      url: `http://${hostPort}`,
      user: credentials.slice(0, colonIdx),
      pass: credentials.slice(colonIdx + 1),
    };
  }

  // bare host:port — assume HTTP, no auth
  return { url: `http://${raw}`, user: '', pass: '' };
}

@Injectable()
export class ProxyRotatorService implements OnModuleInit {
  private readonly logger = new Logger(ProxyRotatorService.name);
  private entries: ProxyEntry[] = [];
  private index = 0;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const pool = this.config.get<string>('PROXY_POOL', '');
    const host = this.config.get<string>('PROXY_HOST', '');
    const port = this.config.get<string>('PROXY_PORT', '');
    const user = this.config.get<string>('PROXY_USERNAME', '');
    const pass = this.config.get<string>('PROXY_PASSWORD', '');

    let proxies: ProxyConfig[] = [];

    if (pool) {
      proxies = pool.split(',').map((p) => parseProxyEntry(p.trim()));
    } else if (host && port) {
      proxies = [{ url: `http://${host}:${port}`, user, pass }];
    }

    this.entries = proxies.map((config) => ({ config, bannedUntil: null, failCount: 0 }));

    if (this.entries.length === 0) {
      this.logger.warn('No proxies configured — scraping without proxy rotation');
    } else {
      this.logger.log(`Loaded ${this.entries.length} proxy endpoint(s)`);
    }
  }

  getNext(): ProxyConfig | null {
    if (this.entries.length === 0) return null;

    const now = Date.now();
    const available = this.entries.filter((e) => !e.bannedUntil || e.bannedUntil <= now);

    if (available.length === 0) {
      this.logger.warn('All proxies are banned — lifting earliest ban and retrying');
      const earliest = this.entries.reduce((a, b) =>
        (a.bannedUntil ?? 0) < (b.bannedUntil ?? 0) ? a : b,
      );
      earliest.bannedUntil = null;
      earliest.failCount = 0;
      return earliest.config;
    }

    const entry = available[this.index % available.length];
    this.index = (this.index + 1) % available.length;
    return entry.config;
  }

  markBanned(proxy: ProxyConfig): void {
    const entry = this.entries.find((e) => e.config.url === proxy.url);
    if (!entry) return;

    entry.failCount++;
    if (entry.failCount >= MAX_FAILURES) {
      entry.bannedUntil = Date.now() + BAN_DURATION_MS;
      this.logger.warn(
        `Proxy ${proxy.url} banned for 30 min after ${entry.failCount} failures`,
      );
    } else {
      this.logger.warn(
        `Proxy ${proxy.url} failed (${entry.failCount}/${MAX_FAILURES})`,
      );
    }
  }

  markSuccess(proxy: ProxyConfig): void {
    const entry = this.entries.find((e) => e.config.url === proxy.url);
    if (!entry) return;
    entry.failCount = 0;
  }

  isConfigured(): boolean {
    return this.entries.length > 0;
  }

  getStats(): { total: number; available: number; banned: number } {
    const now = Date.now();
    const banned = this.entries.filter((e) => e.bannedUntil && e.bannedUntil > now).length;
    return { total: this.entries.length, available: this.entries.length - banned, banned };
  }
}
