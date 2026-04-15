import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ProxyConfig {
  url: string;
  user: string;
  pass: string;
}

@Injectable()
export class ProxyRotatorService implements OnModuleInit {
  private readonly logger = new Logger(ProxyRotatorService.name);
  private proxies: ProxyConfig[] = [];
  private index = 0;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const pool = this.config.get<string>('PROXY_POOL', '');
    const host = this.config.get<string>('PROXY_HOST', '');
    const port = this.config.get<string>('PROXY_PORT', '');
    const user = this.config.get<string>('PROXY_USERNAME', '');
    const pass = this.config.get<string>('PROXY_PASSWORD', '');

    if (pool) {
      this.proxies = pool.split(',').map((p) => {
        const [proxyUser, rest] = p.trim().split('@');
        const [u, pw] = proxyUser.split(':');
        return { url: `http://${rest}`, user: u, pass: pw };
      });
    } else if (host && port) {
      this.proxies = [{ url: `http://${host}:${port}`, user, pass }];
    }

    if (this.proxies.length === 0) {
      this.logger.warn('No proxies configured — scraping without proxy rotation');
    } else {
      this.logger.log(`Loaded ${this.proxies.length} proxy endpoint(s)`);
    }
  }

  getNext(): ProxyConfig | null {
    if (this.proxies.length === 0) return null;
    const proxy = this.proxies[this.index % this.proxies.length];
    this.index++;
    return proxy;
  }

  isConfigured(): boolean {
    return this.proxies.length > 0;
  }
}
