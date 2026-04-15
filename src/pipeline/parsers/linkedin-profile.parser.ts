import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

type CheerioRoot = ReturnType<typeof cheerio.load>;

export interface LinkedInProfile {
  name: string | null;
  headline: string | null;
  location: string | null;
  about: string | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  sourceUrl: string;
  scrapedAt: string;
}

interface ExperienceEntry {
  title: string | null;
  company: string | null;
  duration: string | null;
  description: string | null;
}

interface EducationEntry {
  school: string | null;
  degree: string | null;
  years: string | null;
}

@Injectable()
export class LinkedInProfileParser {
  private readonly logger = new Logger(LinkedInProfileParser.name);

  parse(html: string, url: string): Record<string, unknown> {
    try {
      const $ = cheerio.load(html);
      const profile: LinkedInProfile = {
        name: this.text($, 'h1'),
        headline: this.text($, '.text-body-medium'),
        location: this.text($, '.text-body-small.inline.t-black--light.break-words'),
        about: this.text($, '#about ~ div .full-width'),
        experience: this.parseExperience($),
        education: this.parseEducation($),
        skills: this.parseSkills($),
        sourceUrl: url,
        scrapedAt: new Date().toISOString(),
      };
      return profile as unknown as Record<string, unknown>;
    } catch (err) {
      this.logger.error('Failed to parse LinkedIn profile', err);
      return { parseError: true, sourceUrl: url };
    }
  }

  private text($: CheerioRoot, selector: string): string | null {
    return $(selector).first().text().trim() || null;
  }

  private parseExperience($: CheerioRoot): ExperienceEntry[] {
    const entries: ExperienceEntry[] = [];
    $('#experience ~ div .pvs-list__item--line-separated').each((_, el) => {
      const item = $(el);
      entries.push({
        title: item.find('.t-bold span[aria-hidden=true]').first().text().trim() || null,
        company: item.find('.t-14.t-normal span[aria-hidden=true]').first().text().trim() || null,
        duration: item.find('.t-14.t-normal.t-black--light span[aria-hidden=true]').first().text().trim() || null,
        description: item.find('.pvs-list__outer-container .t-14').text().trim() || null,
      });
    });
    return entries;
  }

  private parseEducation($: CheerioRoot): EducationEntry[] {
    const entries: EducationEntry[] = [];
    $('#education ~ div .pvs-list__item--line-separated').each((_, el) => {
      const item = $(el);
      entries.push({
        school: item.find('.t-bold span[aria-hidden=true]').first().text().trim() || null,
        degree: item.find('.t-14.t-normal span[aria-hidden=true]').first().text().trim() || null,
        years: item.find('.t-14.t-normal.t-black--light span[aria-hidden=true]').first().text().trim() || null,
      });
    });
    return entries;
  }

  private parseSkills($: CheerioRoot): string[] {
    const skills: string[] = [];
    $('#skills ~ div .pvs-list__item--line-separated').each((_, el) => {
      const skill = $(el).find('.t-bold span[aria-hidden=true]').first().text().trim();
      if (skill) skills.push(skill);
    });
    return skills;
  }
}
