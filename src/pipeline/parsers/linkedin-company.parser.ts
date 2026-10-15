import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

type CheerioRoot = ReturnType<typeof cheerio.load>;

export const COMPANY_SELECTOR_VERSION = 'v1';

export interface LinkedInCompany {
  name: string | null;
  industry: string | null;
  headquarters: string | null;
  followers: string | null;
  about: string | null;
  website: string | null;
  companySize: string | null;
  sourceUrl: string;
  scrapedAt: string;
  selectorVersion: string;
}

@Injectable()
export class LinkedInCompanyParser {
  private readonly logger = new Logger(LinkedInCompanyParser.name);

  parse(html: string, url: string): Record<string, unknown> {
    try {
      const $ = cheerio.load(html);
      const subline = this.text($, '.top-card-layout__first-subline');
      const company: LinkedInCompany = {
        name: this.text($, '.top-card-layout__title') ?? this.text($, 'h1'),
        industry: this.text($, '.top-card-layout__headline'),
        headquarters: this.parseHeadquarters(subline),
        followers: this.parseFollowers(subline),
        about: this.text($, '.core-section-container__content p'),
        website: $('a[data-tracking-control-name="top_nav_website_url"]').attr('href') ?? null,
        companySize: this.parseCompanySize($),
        sourceUrl: url,
        scrapedAt: new Date().toISOString(),
        selectorVersion: COMPANY_SELECTOR_VERSION,
      };
      return company as unknown as Record<string, unknown>;
    } catch (err) {
      this.logger.error('Failed to parse LinkedIn company', err);
      return { parseError: true, sourceUrl: url, selectorVersion: COMPANY_SELECTOR_VERSION };
    }
  }

  private text($: CheerioRoot, selector: string): string | null {
    return $(selector).first().text().trim() || null;
  }

  private parseHeadquarters(subline: string | null): string | null {
    if (!subline) return null;
    // Format: "City, State  123,456 followers"
    const parts = subline.split(/\s{2,}/);
    return parts[0]?.trim() || null;
  }

  private parseFollowers(subline: string | null): string | null {
    if (!subline) return null;
    const match = subline.match(/([\d,]+)\s+followers/i);
    return match ? match[1] : null;
  }

  private parseCompanySize($: CheerioRoot): string | null {
    // Company size appears in definition lists or info sections
    let size: string | null = null;
    $('dt, .org-page-details__definition-term').each((_, el) => {
      const label = $(el).text().trim().toLowerCase();
      if (label.includes('company size') || label.includes('employees')) {
        size = $(el).next('dd, .org-page-details__definition-value').text().trim() || null;
      }
    });
    return size;
  }
}
