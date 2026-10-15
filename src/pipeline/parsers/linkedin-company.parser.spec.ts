import { readFileSync } from 'fs';
import { join } from 'path';
import { LinkedInCompanyParser, COMPANY_SELECTOR_VERSION } from './linkedin-company.parser';

const FIXTURE = join(__dirname, '__fixtures__/company.html');

describe('LinkedInCompanyParser', () => {
  let parser: LinkedInCompanyParser;
  let html: string;

  beforeAll(() => {
    parser = new LinkedInCompanyParser();
    html = readFileSync(FIXTURE, 'utf8');
  });

  it('parses company name', () => {
    const result = parser.parse(html, 'https://linkedin.com/company/google');
    expect(result.name).toBe('Google');
  });

  it('parses industry', () => {
    const result = parser.parse(html, 'https://linkedin.com/company/google');
    expect(result.industry).toBeTruthy();
  });

  it('parses headquarters from subline', () => {
    const result = parser.parse(html, 'https://linkedin.com/company/google');
    expect(result.headquarters).toBeTruthy();
  });

  it('parses followers from subline', () => {
    const result = parser.parse(html, 'https://linkedin.com/company/google');
    const followers = result.followers as string;
    expect(followers).toBeTruthy();
    expect(followers.replace(/,/g, '')).toMatch(/^\d+$/);
  });

  it('parses about text', () => {
    const result = parser.parse(html, 'https://linkedin.com/company/google');
    expect(result.about).toBeTruthy();
    expect((result.about as string).length).toBeGreaterThan(20);
  });

  it('includes metadata fields', () => {
    const url = 'https://linkedin.com/company/google';
    const result = parser.parse(html, url);
    expect(result.sourceUrl).toBe(url);
    expect(result.scrapedAt).toBeTruthy();
    expect(result.selectorVersion).toBe(COMPANY_SELECTOR_VERSION);
  });

  it('returns parseError gracefully on broken HTML — does not throw', () => {
    expect(() => {
      parser.parse('<html><body></body></html>', 'https://linkedin.com/company/test');
    }).not.toThrow();
  });
});
