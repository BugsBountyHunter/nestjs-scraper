import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CaptchaResult {
  solved: boolean;
  token?: string;
}

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly apiKey: string;
  private readonly provider: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get('CAPTCHA_API_KEY', '');
    this.provider = config.get('CAPTCHA_PROVIDER', '2captcha');
  }

  async solveRecaptchaV2(siteKey: string, pageUrl: string): Promise<CaptchaResult> {
    if (!this.apiKey) {
      this.logger.warn('No CAPTCHA_API_KEY configured — skipping solve');
      return { solved: false };
    }

    try {
      if (this.provider === '2captcha') {
        return await this.solve2Captcha(siteKey, pageUrl);
      }
      this.logger.warn(`Unknown CAPTCHA provider: ${this.provider}`);
      return { solved: false };
    } catch (err) {
      this.logger.error('CAPTCHA solve failed', err);
      return { solved: false };
    }
  }

  private async solve2Captcha(siteKey: string, pageUrl: string): Promise<CaptchaResult> {
    // Submit captcha task
    const { data: submitData } = await axios.post('https://2captcha.com/in.php', null, {
      params: {
        key: this.apiKey,
        method: 'userrecaptcha',
        googlekey: siteKey,
        pageurl: pageUrl,
        json: 1,
      },
    });

    if (submitData.status !== 1) {
      throw new Error(`2captcha submit error: ${submitData.error_text}`);
    }

    const taskId = submitData.request;
    this.logger.log(`2captcha task submitted: ${taskId}`);

    // Poll for result
    for (let attempt = 0; attempt < 24; attempt++) {
      await new Promise((r) => setTimeout(r, 5000));
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
  }
}
