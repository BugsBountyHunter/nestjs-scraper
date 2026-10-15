import { DataNormalizerService } from './data-normalizer.service';
import { ScraperTarget } from '../../api/jobs/dto/create-job.dto';

describe('DataNormalizerService', () => {
  const normalizer = new DataNormalizerService();

  it('collapses whitespace in profile fields and tags the target', () => {
    const out = normalizer.normalize(ScraperTarget.LINKEDIN_PROFILE, {
      name: '  Jane \n Doe ',
      headline: 'Engineer\t at  X',
      location: '',
    });
    expect(out).toMatchObject({ name: 'Jane Doe', headline: 'Engineer at X', location: null, _target: 'linkedin_profile' });
    expect(typeof out._normalizedAt).toBe('string');
  });

  it('normalizes every job in a jobs result', () => {
    const out = normalizer.normalize(ScraperTarget.LINKEDIN_JOBS, {
      jobs: [{ title: ' Dev ', company: 'Acme  Inc', location: null, jobUrl: 'u' }],
    });
    expect(out.jobs).toEqual([{ title: 'Dev', company: 'Acme Inc', location: null, jobUrl: 'u' }]);
  });

  it('handles a jobs result with no jobs array', () => {
    expect(normalizer.normalize(ScraperTarget.LINKEDIN_JOBS, {}).jobs).toEqual([]);
  });

  it('normalizes company fields', () => {
    const out = normalizer.normalize(ScraperTarget.LINKEDIN_COMPANY, { name: ' Acme ', industry: 'Software \n Dev' });
    expect(out).toMatchObject({ name: 'Acme', industry: 'Software Dev' });
  });

  it('does not mutate the input', () => {
    const input = { name: ' Jane ' };
    normalizer.normalize(ScraperTarget.LINKEDIN_PROFILE, input);
    expect(input).toEqual({ name: ' Jane ' });
  });
});
