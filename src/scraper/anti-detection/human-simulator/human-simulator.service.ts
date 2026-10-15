import { Injectable } from '@nestjs/common';
import type { Page, ElementHandle } from 'playwright';
import { ConfigService } from '@nestjs/config';

interface Point {
  x: number;
  y: number;
}

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

  async simulateReading(_page: Page): Promise<void> {
    await this.randomDelay();
  }

  async humanScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalScrolled = 0;
        const target = document.body.scrollHeight * 0.8;

        const tick = () => {
          const step = Math.random() * 120 + 40;
          window.scrollBy(0, step);
          totalScrolled += step;

          if (totalScrolled >= target) {
            resolve();
            return;
          }

          // Occasionally pause mid-scroll to simulate reading
          const pauseChance = Math.random();
          const delay = pauseChance < 0.15
            ? Math.random() * 1200 + 600   // long reading pause
            : pauseChance < 0.35
              ? Math.random() * 400 + 100  // short glance pause
              : Math.random() * 180 + 80;  // normal scroll cadence

          setTimeout(tick, delay);
        };

        setTimeout(tick, Math.random() * 200 + 50);
      });
    });
  }

  /**
   * Moves mouse along a cubic Bézier curve between two points,
   * which produces more organic trajectories than linear stepping.
   */
  async moveMouse(page: Page, from: Point, to: Point, steps = 20): Promise<void> {
    const cp1: Point = {
      x: from.x + (to.x - from.x) * (0.25 + Math.random() * 0.25) + (Math.random() - 0.5) * 80,
      y: from.y + (to.y - from.y) * (0.1 + Math.random() * 0.2) + (Math.random() - 0.5) * 80,
    };
    const cp2: Point = {
      x: from.x + (to.x - from.x) * (0.6 + Math.random() * 0.25) + (Math.random() - 0.5) * 80,
      y: from.y + (to.y - from.y) * (0.7 + Math.random() * 0.2) + (Math.random() - 0.5) * 80,
    };

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const x = mt ** 3 * from.x + 3 * mt ** 2 * t * cp1.x + 3 * mt * t ** 2 * cp2.x + t ** 3 * to.x;
      const y = mt ** 3 * from.y + 3 * mt ** 2 * t * cp1.y + 3 * mt * t ** 2 * cp2.y + t ** 3 * to.y;

      // Add micro-jitter to each step
      await page.mouse.move(x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2);
      await new Promise((r) => setTimeout(r, Math.random() * 12 + 4));
    }
  }

  async humanHover(page: Page, element: ElementHandle): Promise<void> {
    const box = await element.boundingBox();
    if (!box) return;

    const currentPos = await page.evaluate((): Point => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
    const targetPos: Point = {
      x: box.x + box.width * (0.3 + Math.random() * 0.4),
      y: box.y + box.height * (0.3 + Math.random() * 0.4),
    };

    await this.moveMouse(page, currentPos, targetPos, Math.floor(Math.random() * 15 + 12));
    await this.randomDelay(80, 250);
  }

  async humanClick(page: Page, element: ElementHandle): Promise<void> {
    await this.humanHover(page, element);
    await this.randomDelay(100, 350);
    await element.click();
  }

  async humanType(page: Page, selector: string, text: string): Promise<void> {
    const el = await page.$(selector);
    if (el) await this.humanClick(page, el);
    for (const char of text) {
      await page.keyboard.type(char, { delay: Math.random() * 130 + 40 });
      // Occasional micro-pause simulating thinking between words
      if (char === ' ' && Math.random() < 0.2) {
        await this.randomDelay(200, 600);
      }
    }
  }

  /**
   * Wanders the mouse across the page in a few organic arcs,
   * simulating idle reading behavior before the main interaction.
   */
  async wanderMouse(page: Page, moves = 3): Promise<void> {
    const viewport = page.viewportSize() ?? { width: 1280, height: 800 };
    let current: Point = { x: viewport.width / 2, y: viewport.height / 3 };

    for (let i = 0; i < moves; i++) {
      const next: Point = {
        x: 100 + Math.random() * (viewport.width - 200),
        y: 100 + Math.random() * (viewport.height - 200),
      };
      await this.moveMouse(page, current, next, Math.floor(Math.random() * 10 + 8));
      await this.randomDelay(300, 900);
      current = next;
    }
  }
}
