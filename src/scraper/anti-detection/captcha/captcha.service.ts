import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Page } from 'playwright';

export interface CaptchaResult {
  solved: boolean;
  token?: string;
}

export type CaptchaType = 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha';

interface DetectedCaptcha {
  type: CaptchaType;
  siteKey: string;
}

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 24;

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly apiKey: string;
  private readonly provider: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get('CAPTCHA_API_KEY', '');
    this.provider = config.get('CAPTCHA_PROVIDER', '2captcha');
  }

  /** Detect which CAPTCHA (if any) is present on the page. */
  async detect(page: Page): Promise<DetectedCaptcha | null> {
    return page.evaluate((): DetectedCaptcha | null => {
      // hCaptcha
      const hcEl = document.querySelector<HTMLElement>('[data-hcaptcha-widget-id], .h-captcha[data-sitekey]');
      if (hcEl) {
        const siteKey = hcEl.getAttribute('data-sitekey') ?? '';
        if (siteKey) return { type: 'hcaptcha', siteKey };
      }

      // reCAPTCHA v3 (no iframe rendered, just a script tag + grecaptcha.execute)
      const rcV3Script = document.querySelector<HTMLScriptElement>('script[src*="recaptcha/api.js?render="]');
      if (rcV3Script) {
        const match = rcV3Script.src.match(/render=([^&]+)/);
        if (match) return { type: 'recaptcha_v3', siteKey: match[1] };
      }

      // reCAPTCHA v2
      const rcEl = document.querySelector<HTMLElement>('.g-recaptcha[data-sitekey], [data-recaptcha-site-key]');
      if (rcEl) {
        const siteKey =
          rcEl.getAttribute('data-sitekey') ??
          rcEl.getAttribute('data-recaptcha-site-key') ??
          '';
        if (siteKey) return { type: 'recaptcha_v2', siteKey };
      }

      return null;
    });
  }

  /** Auto-detect and solve whatever CAPTCHA is on the page. */
  async solveOnPage(page: Page): Promise<CaptchaResult> {
    const detected = await this.detect(page);
    if (!detected) return { solved: false };

    const pageUrl = page.url();
    this.logger.log(`Detected ${detected.type} CAPTCHA on ${pageUrl}`);

    switch (detected.type) {
      case 'hcaptcha':
        return this.solveHCaptcha(detected.siteKey, pageUrl);
      case 'recaptcha_v3':
        return this.solveRecaptchaV3(detected.siteKey, pageUrl);
      case 'recaptcha_v2':
      default:
        return this.solveRecaptchaV2(detected.siteKey, pageUrl);
    }
  }

  async solveRecaptchaV2(siteKey: string, pageUrl: string): Promise<CaptchaResult> {
    return this.solve2Captcha({ method: 'userrecaptcha', googlekey: siteKey, pageurl: pageUrl });
  }

  async solveRecaptchaV3(siteKey: string, pageUrl: string, action = 'verify'): Promise<CaptchaResult> {
    return this.solve2Captcha({ method: 'userrecaptcha', googlekey: siteKey, pageurl: pageUrl, version: 'v3', action, min_score: '0.3' });
  }

  async solveHCaptcha(siteKey: string, pageUrl: string): Promise<CaptchaResult> {
    return this.solve2Captcha({ method: 'hcaptcha', sitekey: siteKey, pageurl: pageUrl });
  }

  private async solve2Captcha(params: Record<string, string>): Promise<CaptchaResult> {
    if (!this.apiKey) {
      this.logger.warn('No CAPTCHA_API_KEY configured — skipping solve');
      return { solved: false };
    }

    if (this.provider !== '2captcha') {
      this.logger.warn(`Unknown CAPTCHA provider: ${this.provider}`);
      return { solved: false };
    }

    try {
      const { data: submitData } = await axios.post('https://2captcha.com/in.php', null, {
        params: { key: this.apiKey, json: 1, ...params },
      });

      if (submitData.status !== 1) {
        throw new Error(`2captcha submit error: ${submitData.error_text}`);
      }

      const taskId: string = submitData.request;
      this.logger.log(`2captcha task submitted: ${taskId}`);

      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const { data: resultData } = await axios.get('https://2captcha.com/res.php', {
          params: { key: this.apiKey, action: 'get', id: taskId, json: 1 },
        });

        if (resultData.status === 1) {
          this.logger.log('CAPTCHA solved successfully');
          return { solved: true, token: resultData.request };
        }
        if (resultData.request !== 'CAPCHA_NOT_READY') {
          throw new Error(`2captcha error: ${resultData.request}`);
        }
      }

      throw new Error('CAPTCHA solve timeout');
    } catch (err) {
      this.logger.error('CAPTCHA solve failed', err);
      return { solved: false };
    }
  }
}
