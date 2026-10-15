import { readFileSync } from 'fs';
import { join } from 'path';
import { LinkedInProfileParser, PROFILE_SELECTOR_VERSION } from './linkedin-profile.parser';

const FIXTURE = join(__dirname, '__fixtures__/profile-synthetic.html');

describe('LinkedInProfileParser', () => {
  let parser: LinkedInProfileParser;
  let html: string;

  beforeAll(() => {
    parser = new LinkedInProfileParser();
    html = readFileSync(FIXTURE, 'utf8');
  });

  it('parses name', () => {
    const result = parser.parse(html, 'https://linkedin.com/in/ahmed-saber-1b549ab4');
    expect(result.name).toBe('Ahmed Saber');
  });

  it('parses headline', () => {
    const result = parser.parse(html, 'https://linkedin.com/in/test');
    expect(result.headline).toBe('Senior Software Engineer at Acme Corp');
  });

  it('parses location', () => {
    const result = parser.parse(html, 'https://linkedin.com/in/test');
    expect(result.location).toBe('Cairo, Egypt');
  });

  it('parses about section', () => {
    const result = parser.parse(html, 'https://linkedin.com/in/test');
    expect(result.about).toBeTruthy();
    expect((result.about as string)).toContain('software engineer');
  });

  it('parses experience entries', () => {
    const result = parser.parse(html, 'https://linkedin.com/in/test');
    const exp = result.experience as Array<{ title: string; company: string; duration: string }>;
    expect(exp.length).toBe(2);
    expect(exp[0].title).toBe('Senior Software Engineer');
    expect(exp[0].company).toBe('Acme Corp');
    expect(exp[0].duration).toContain('Jan 2022');
    expect(exp[1].title).toBe('Software Engineer');
    expect(exp[1].company).toBe('Beta Ltd');
  });

  it('parses education entries', () => {
    const result = parser.parse(html, 'https://linkedin.com/in/test');
    const edu = result.education as Array<{ school: string; degree: string; years: string }>;
    expect(edu.length).toBe(1);
    expect(edu[0].school).toBe('Cairo University');
    expect(edu[0].degree).toContain('Computer Science');
    expect(edu[0].years).toBe('2014 - 2018');
  });

  it('parses skills', () => {
    const result = parser.parse(html, 'https://linkedin.com/in/test');
    const skills = result.skills as string[];
    expect(skills).toContain('TypeScript');
    expect(skills).toContain('Node.js');
    expect(skills).toContain('PostgreSQL');
    expect(skills.length).toBe(3);
  });

  it('includes metadata fields', () => {
    const url = 'https://linkedin.com/in/test';
    const result = parser.parse(html, url);
    expect(result.sourceUrl).toBe(url);
    expect(result.scrapedAt).toBeTruthy();
    expect(result.selectorVersion).toBe(PROFILE_SELECTOR_VERSION);
  });

  it('returns parseError on broken HTML', () => {
    const result = parser.parse('<html><body>no data</body></html>', 'https://linkedin.com/in/test');
    expect(result.name).toBeNull();
    expect(result.experience).toEqual([]);
    expect(result.skills).toEqual([]);
  });
});
