import { assessCompleteness } from './result-completeness';
import { ScraperTarget } from '../../api/jobs/dto/create-job.dto';

describe('assessCompleteness', () => {
  describe('linkedin_profile', () => {
    const t = ScraperTarget.LINKEDIN_PROFILE;
    it('is complete when the profile name was extracted', () => {
      expect(assessCompleteness(t, { name: 'Jane Doe', headline: null })).toBe('success');
    });
    it.each([
      [{ name: null, headline: null, experience: [] }],
      [{ name: '', headline: 'Engineer' }],
      [{ name: '   ' }],
      [{}],
    ])('is partial when the name is missing: %j', (data) => {
      expect(assessCompleteness(t, data)).toBe('partial');
    });
  });

  describe('linkedin_jobs', () => {
    const t = ScraperTarget.LINKEDIN_JOBS;
    it('is complete when at least one job was extracted', () => {
      expect(assessCompleteness(t, { jobs: [{ title: 'Dev' }] })).toBe('success');
    });
    it.each([[{ jobs: [] }], [{}], [{ jobs: 'nope' }]])('is partial with no jobs: %j', (data) => {
      expect(assessCompleteness(t, data)).toBe('partial');
    });
  });

  describe('linkedin_company', () => {
    const t = ScraperTarget.LINKEDIN_COMPANY;
    it('is complete when the company name was extracted', () => {
      expect(assessCompleteness(t, { name: 'Microsoft' })).toBe('success');
    });
    it('is partial without a company name', () => {
      expect(assessCompleteness(t, { name: null, industry: 'Software' })).toBe('partial');
    });
  });

  it('treats unknown targets as complete (no rule to judge them by)', () => {
    expect(assessCompleteness('something_else', {})).toBe('success');
  });
});
