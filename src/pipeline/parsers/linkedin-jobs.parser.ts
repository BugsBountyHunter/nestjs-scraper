import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface LinkedInJob {
  title: string | null;
  company: string | null;
  location: string | null;
  postedAt: string | null;
  jobUrl: string | null;
}

export interface LinkedInJobsPage {
  jobs: LinkedInJob[];
  totalResults: string | null;
  sourceUrl: string;
  scrapedAt: string;
}

@Injectable()
export class LinkedInJobsParser {
  private readonly logger = new Logger(LinkedInJobsParser.name);

  parse(html: string, url: string): Record<string, unknown> {
    try {
      const $ = cheerio.load(html);
      const jobs: LinkedInJob[] = [];

      $('ul.jobs-search__results-list li').each((_, el) => {
        const item = $(el);
        jobs.push({
          title: item.find('.base-search-card__title').text().trim() || null,
          company: item.find('.base-search-card__subtitle a').text().trim() || null,
          location: item.find('.job-search-card__location').text().trim() || null,
          postedAt: item.find('time').attr('datetime') ?? null,
          jobUrl: item.find('a.base-card__full-link').attr('href') ?? null,
        });
      });

      const result: LinkedInJobsPage = {
        jobs,
        totalResults: $('.results-context-header__job-count').text().trim() || null,
        sourceUrl: url,
        scrapedAt: new Date().toISOString(),
      };

      return result as unknown as Record<string, unknown>;
    } catch (err) {
      this.logger.error('Failed to parse LinkedIn jobs page', err);
      return { parseError: true, sourceUrl: url };
    }
  }
}
