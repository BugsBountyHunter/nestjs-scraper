import { Injectable } from '@nestjs/common';

export interface BrowserProfile {
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezone: string;
  platform: string;
  hardwareConcurrency: number;
  colorDepth: number;
}

// Match the installed Playwright Chromium major version exactly.
// Canvas/V8 fingerprints are tied to the real engine version — claiming an older
// Chrome version creates a canvas-hash mismatch that fingerprint scanners flag.
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
];

const LOCALES = ['en-US', 'en-GB', 'en-CA', 'de-DE', 'fr-FR'];

const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'];

@Injectable()
export class FingerprintService {
  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  generateProfile(): BrowserProfile {
    return {
      userAgent: this.pick(USER_AGENTS),
      viewport: this.pick(VIEWPORTS),
      locale: this.pick(LOCALES),
      timezone: this.pick(TIMEZONES),
      platform: this.pick(PLATFORMS),
      hardwareConcurrency: this.pick([2, 4, 8, 12, 16]),
      colorDepth: 24,
    };
  }

  buildSecChUa(userAgent: string): string {
    const match = userAgent.match(/Chrome\/(\d+)\./);
    if (match) {
      const v = match[1];
      return `"Google Chrome";v="${v}", "Chromium";v="${v}", "Not/A)Brand";v="99"`;
    }
    return '"Google Chrome";v="136", "Chromium";v="136", "Not/A)Brand";v="99"';
  }

  /** Extract the major Chrome version from a user-agent string, or return 136. */
  extractChromeMajor(userAgent: string): number {
    const match = userAgent.match(/Chrome\/(\d+)\./);
    return match ? parseInt(match[1], 10) : 136;
  }
}
