import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateJobDto } from './create-job.dto';

async function errorsFor(input: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateJobDto, input));
  return errors.map((e) => e.property);
}

describe('CreateJobDto', () => {
  const valid = { target: 'linkedin_profile', url: 'https://www.linkedin.com/in/someone/' };

  it('accepts a valid LinkedIn job', async () => {
    expect(await errorsFor(valid)).toEqual([]);
    expect(await errorsFor({ ...valid, url: 'https://linkedin.com/company/acme', priority: 'high' })).toEqual([]);
  });

  it.each([
    'http://www.linkedin.com/in/x',
    'https://evil.com/in/x',
    'https://linkedin.com.evil.com/in/x',
    'https://169.254.169.254/latest/meta-data',
    'https://localhost:3000/health',
    'www.linkedin.com/in/x',
  ])('rejects non-LinkedIn or non-https URL %s', async (url) => {
    expect(await errorsFor({ ...valid, url })).toContain('url');
  });

  it('rejects unknown targets and priorities', async () => {
    expect(await errorsFor({ ...valid, target: 'twitter' })).toContain('target');
    expect(await errorsFor({ ...valid, priority: 'urgent' })).toContain('priority');
  });

  it('rejects non-object metadata', async () => {
    expect(await errorsFor({ ...valid, metadata: 'x' })).toContain('metadata');
  });
});
