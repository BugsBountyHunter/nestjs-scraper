import { Injectable, Logger } from '@nestjs/common';

export interface BrowserSession {
  id: string;
  cookies: Record<string, string>[];
  storageState?: string;
  createdAt: Date;
  lastUsedAt: Date;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);
  private readonly sessions = new Map<string, BrowserSession>();

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

  purgeExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastUsedAt.getTime() > SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }
}
