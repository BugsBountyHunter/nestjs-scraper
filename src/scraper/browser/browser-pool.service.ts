import * as fs from 'fs';
import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import type { BrowserContext } from 'playwright';
import { BrowserFactoryService } from './browser-factory.service';
import { ProxyRotatorService } from '../proxy/proxy-rotator.service';

interface PoolEntry {
  context: BrowserContext;
  userDataDir: string;
  inUse: boolean;
  createdAt: Date;
}

const MAX_CONTEXT_AGE_MS = 15 * 60 * 1000; // recycle after 15 min

@Injectable()
export class BrowserPoolService implements OnApplicationShutdown {
  private readonly logger = new Logger(BrowserPoolService.name);
  private readonly pool: PoolEntry[] = [];

  constructor(
    private readonly factory: BrowserFactoryService,
    private readonly proxyRotator: ProxyRotatorService,
  ) {}

  async acquire(): Promise<BrowserContext> {
    // Reuse an idle, fresh context
    const available = this.pool.find(
      (e) => !e.inUse && Date.now() - e.createdAt.getTime() < MAX_CONTEXT_AGE_MS,
    );

    if (available) {
      available.inUse = true;
      return available.context;
    }

    // Create a new context
    const proxy = this.proxyRotator.getNext();
    const { context, userDataDir } = await this.factory.createContext(proxy);
    this.pool.push({ context, userDataDir, inUse: true, createdAt: new Date() });
    this.logger.debug(`New browser context created (pool size: ${this.pool.length})`);
    return context;
  }

  release(context: BrowserContext): void {
    const entry = this.pool.find((e) => e.context === context);
    if (entry) {
      entry.inUse = false;
    }
  }

  async destroy(context: BrowserContext): Promise<void> {
    const idx = this.pool.findIndex((e) => e.context === context);
    let userDataDir: string | undefined;
    if (idx !== -1) {
      userDataDir = this.pool[idx].userDataDir;
      this.pool.splice(idx, 1);
    }
    await context.close().catch(() => undefined);
    this.removeUserDataDir(userDataDir);
    this.logger.debug(`Browser context destroyed (pool size: ${this.pool.length})`);
  }

  poolSize(): number {
    return this.pool.length;
  }

  async destroyAll(): Promise<void> {
    const entries = [...this.pool];
    await Promise.all(entries.map((e) => e.context.close().catch(() => undefined)));
    entries.forEach((e) => this.removeUserDataDir(e.userDataDir));
    this.pool.length = 0;
  }

  private removeUserDataDir(dir: string | undefined): void {
    if (!dir) return;
    fs.rm(dir, { recursive: true, force: true }, (err) => {
      if (err) this.logger.warn(`Failed to remove user data dir ${dir}: ${err.message}`);
    });
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Shutting down — closing all browser contexts');
    await this.destroyAll();
  }
}
