import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

type CheerioRoot = ReturnType<typeof cheerio.load>;
type CheerioEl = cheerio.Cheerio<AnyNode>;

/** Bump when LinkedIn changes selectors so tests catch regressions. */
export const PROFILE_SELECTOR_VERSION = 'v1';

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
  selectorVersion: string;
}

export interface ExperienceEntry {
  title: string | null;
  company: string | null;
  duration: string | null;
  description: string | null;
}

export interface EducationEntry {
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
        about: this.parseAbout($),
        experience: this.parseSection($, 'experience', this.toExperience.bind(this)),
        education: this.parseSection($, 'education', this.toEducation.bind(this)),
        skills: this.parseSkills($),
        sourceUrl: url,
        scrapedAt: new Date().toISOString(),
        selectorVersion: PROFILE_SELECTOR_VERSION,
      };
      return profile as unknown as Record<string, unknown>;
    } catch (err) {
      this.logger.error('Failed to parse LinkedIn profile', err);
      return { parseError: true, sourceUrl: url, selectorVersion: PROFILE_SELECTOR_VERSION };
    }
  }

  private text($: CheerioRoot, selector: string): string | null {
    return $(selector).first().text().trim() || null;
  }

  private parseAbout($: CheerioRoot): string | null {
    return $('#about').next('div').find('.full-width').first().text().trim() || null;
  }

  private parseSection<T>(
    $: CheerioRoot,
    sectionId: string,
    mapper: ($item: CheerioEl) => T,
  ): T[] {
    const results: T[] = [];
    $(`#${sectionId}`)
      .next('div')
      .find('.pvs-list__item--line-separated')
      .each((_, el) => {
        results.push(mapper($(el)));
      });
    return results;
  }

  private toExperience($item: CheerioEl): ExperienceEntry {
    return {
      title: $item.find('.t-bold span[aria-hidden=true]').first().text().trim() || null,
      company: $item.find('.t-14.t-normal span[aria-hidden=true]').first().text().trim() || null,
      duration: $item.find('.t-14.t-normal.t-black--light span[aria-hidden=true]').first().text().trim() || null,
      description: $item.find('.pvs-list__outer-container .t-14').first().text().trim() || null,
    };
  }

  private toEducation($item: CheerioEl): EducationEntry {
    return {
      school: $item.find('.t-bold span[aria-hidden=true]').first().text().trim() || null,
      degree: $item.find('.t-14.t-normal span[aria-hidden=true]').first().text().trim() || null,
      years: $item.find('.t-14.t-normal.t-black--light span[aria-hidden=true]').first().text().trim() || null,
    };
  }

  private parseSkills($: CheerioRoot): string[] {
    const skills: string[] = [];
    $('#skills')
      .next('div')
      .find('.pvs-list__item--line-separated')
      .each((_, el) => {
        const skill = $(el).find('.t-bold span[aria-hidden=true]').first().text().trim();
        if (skill) skills.push(skill);
      });
    return skills;
  }
}
