import { readFileSync } from 'fs';
import { join } from 'path';
import { LinkedInJobsParser } from './linkedin-jobs.parser';

const FIXTURE = join(__dirname, '__fixtures__/jobs.html');

describe('LinkedInJobsParser', () => {
  let parser: LinkedInJobsParser;
  let html: string;

  beforeAll(() => {
    parser = new LinkedInJobsParser();
    html = readFileSync(FIXTURE, 'utf8');
  });

  it('parses job listings', () => {
    const result = parser.parse(html, 'https://linkedin.com/jobs/search');
    const jobs = result.jobs as Array<Record<string, unknown>>;
    expect(jobs.length).toBeGreaterThan(0);
  });

  it('each job has a title', () => {
    const result = parser.parse(html, 'https://linkedin.com/jobs/search');
    const jobs = result.jobs as Array<{ title: string }>;
    const withTitle = jobs.filter((j) => j.title);
    expect(withTitle.length).toBeGreaterThanOrEqual(jobs.length * 0.9);
  });

  it('each job has a company', () => {
    const result = parser.parse(html, 'https://linkedin.com/jobs/search');
    const jobs = result.jobs as Array<{ company: string }>;
    const withCompany = jobs.filter((j) => j.company);
    expect(withCompany.length).toBeGreaterThanOrEqual(jobs.length * 0.9);
  });

  it('each job has a location', () => {
    const result = parser.parse(html, 'https://linkedin.com/jobs/search');
    const jobs = result.jobs as Array<{ location: string }>;
    const withLocation = jobs.filter((j) => j.location);
    expect(withLocation.length).toBeGreaterThanOrEqual(jobs.length * 0.9);
  });

  it('each job has a URL', () => {
    const result = parser.parse(html, 'https://linkedin.com/jobs/search');
    const jobs = result.jobs as Array<{ jobUrl: string }>;
    const withUrl = jobs.filter((j) => j.jobUrl);
    expect(withUrl.length).toBeGreaterThanOrEqual(jobs.length * 0.9);
    expect(jobs[0].jobUrl).toContain('linkedin.com');
  });

  it('parses total results count', () => {
    const result = parser.parse(html, 'https://linkedin.com/jobs/search');
    expect(result.totalResults).toBeTruthy();
  });

  it('includes metadata fields', () => {
    const url = 'https://linkedin.com/jobs/search';
    const result = parser.parse(html, url);
    expect(result.sourceUrl).toBe(url);
    expect(result.scrapedAt).toBeTruthy();
  });

  it('returns empty jobs array on broken HTML', () => {
    const result = parser.parse('<html><body>no jobs</body></html>', 'https://linkedin.com/jobs/search');
    expect(result.jobs).toEqual([]);
    expect(result.totalResults).toBeNull();
  });
});
