import * as fs from 'fs';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BrowserContext, Cookie } from 'playwright';

@Injectable()
export class LinkedInSessionService implements OnModuleInit {
  private readonly logger = new Logger(LinkedInSessionService.name);
  private cookies: Cookie[] = [];

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const filePath = this.config.get<string>('LINKEDIN_COOKIES_FILE', '');
    if (!filePath) {
      this.logger.warn('LINKEDIN_COOKIES_FILE not set — scraping guest-only (may be blocked)');
      return;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Cookie[];
      // Normalise: ensure domain is set for LinkedIn cookies
      this.cookies = parsed.map((c) => ({
        ...c,
        domain: c.domain ?? '.linkedin.com',
        path: c.path ?? '/',
      }));
      this.logger.log(`Loaded ${this.cookies.length} LinkedIn cookies from ${filePath}`);
    } catch (err) {
      this.logger.error(`Failed to load LinkedIn cookies from ${filePath}: ${(err as Error).message}`);
    }
  }

  hasCookies(): boolean {
    return this.cookies.length > 0;
  }

  async inject(context: BrowserContext): Promise<void> {
    if (!this.hasCookies()) return;
    await context.addCookies(this.cookies);
  }
}
