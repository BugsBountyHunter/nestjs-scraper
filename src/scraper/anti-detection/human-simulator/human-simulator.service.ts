import { Injectable } from '@nestjs/common';
import type { Page, ElementHandle } from 'playwright';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HumanSimulatorService {
  private readonly minDelay: number;
  private readonly maxDelay: number;

  constructor(private readonly config: ConfigService) {
    this.minDelay = config.get<number>('SCRAPER_MIN_DELAY_MS', 2000);
    this.maxDelay = config.get<number>('SCRAPER_MAX_DELAY_MS', 8000);
  }

  async randomDelay(minMs = this.minDelay, maxMs = this.maxDelay): Promise<void> {
    const ms = Math.random() * (maxMs - minMs) + minMs;
    await new Promise((r) => setTimeout(r, ms));
  }

  async simulateReading(page: Page): Promise<void> {
    await this.randomDelay();
  }

  async humanScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalScrolled = 0;
        const interval = setInterval(() => {
          const step = Math.random() * 100 + 50;
          window.scrollBy(0, step);
          totalScrolled += step;
          if (totalScrolled >= document.body.scrollHeight * 0.8) {
            clearInterval(interval);
            resolve();
          }
        }, Math.random() * 200 + 100);
      });
    });
  }

  async humanClick(page: Page, element: ElementHandle): Promise<void> {
    const box = await element.boundingBox();
    if (!box) return;

    // Move to element with bezier-like stepping
    await page.mouse.move(
      box.x + box.width / 2 + (Math.random() * 6 - 3),
      box.y + box.height / 2 + (Math.random() * 6 - 3),
      { steps: Math.floor(Math.random() * 15 + 5) },
    );

    await this.randomDelay(100, 400);
    await element.click();
  }

  async humanType(page: Page, selector: string, text: string): Promise<void> {
    await page.click(selector);
    for (const char of text) {
      await page.keyboard.type(char, { delay: Math.random() * 120 + 40 });
    }
  }
}
