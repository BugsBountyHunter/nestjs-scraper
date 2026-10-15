import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export interface BrowserSession {
  id: string;
  cookies: Record<string, string>[];
  storageState?: string;
  createdAt: Date;
  lastUsedAt: Date;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const PURGE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class SessionManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionManagerService.name);
  private readonly sessions = new Map<string, BrowserSession>();
  private purgeTimer?: NodeJS.Timeout;

  onModuleInit(): void {
    this.purgeTimer = setInterval(() => this.purgeExpired(), PURGE_INTERVAL_MS);
    this.purgeTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  save(id: string, cookies: Record<string, string>[], storageState?: string): void {
    this.sessions.set(id, {
      id,
      cookies,
      storageState,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    });
    this.logger.debug(`Session saved: ${id}`);
  }

  get(id: string): BrowserSession | null {
    const session = this.sessions.get(id);
    if (!session) return null;

    const expired = Date.now() - session.lastUsedAt.getTime() > SESSION_TTL_MS;
    if (expired) {
      this.sessions.delete(id);
      this.logger.debug(`Session expired and removed: ${id}`);
      return null;
    }

    session.lastUsedAt = new Date();
    return session;
  }

  invalidate(id: string): void {
    this.sessions.delete(id);
    this.logger.debug(`Session invalidated: ${id}`);
  }

  purgeExpired(): number {
    const now = Date.now();
    const expiredIds = [...this.sessions.values()]
      .filter((session) => now - session.lastUsedAt.getTime() > SESSION_TTL_MS)
      .map((session) => session.id);

    expiredIds.forEach((id) => this.sessions.delete(id));
    if (expiredIds.length > 0) {
      this.logger.debug(`Purged ${expiredIds.length} expired session(s)`);
    }
    return expiredIds.length;
  }

  size(): number {
    return this.sessions.size;
  }
}
