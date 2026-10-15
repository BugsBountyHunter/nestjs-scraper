import type { QueryRunner } from 'typeorm';
import { CreateScrapeResults1760500000000 } from './1760500000000-CreateScrapeResults';

describe('CreateScrapeResults1760500000000', () => {
  const run = async (direction: 'up' | 'down'): Promise<string[]> => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new CreateScrapeResults1760500000000()[direction]({ query } as unknown as QueryRunner);
    return query.mock.calls.map(([sql]: [string]) => sql.replace(/\s+/g, ' '));
  };

  it('creates the table and both indexes idempotently', async () => {
    const sql = await run('up');

    expect(sql[0]).toContain('CREATE TABLE IF NOT EXISTS "scrape_results"');
    expect(sql[0]).toContain('"id" uuid NOT NULL DEFAULT gen_random_uuid()');
    expect(sql[0]).toContain('"jobId" character varying,');
    expect(sql[0]).toContain('"data" jsonb NOT NULL');
    expect(sql).toEqual(
      expect.arrayContaining([
        expect.stringContaining('CREATE INDEX IF NOT EXISTS "IDX_scrape_results_job_id"'),
        expect.stringContaining('CREATE INDEX IF NOT EXISTS "IDX_scrape_results_target"'),
      ]),
    );
  });

  it('drops the table on down', async () => {
    expect(await run('down')).toEqual(['DROP TABLE IF EXISTS "scrape_results"']);
  });
});
