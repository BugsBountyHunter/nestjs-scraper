import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for ScrapeResult. Idempotent (IF NOT EXISTS) so it is safe
 * on databases previously created by `synchronize` in development.
 * Index names match the explicit names on the entity.
 */
export class CreateScrapeResults1760500000000 implements MigrationInterface {
  name = 'CreateScrapeResults1760500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scrape_results" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "jobId" character varying,
        "target" character varying NOT NULL,
        "url" character varying NOT NULL,
        "data" jsonb NOT NULL,
        "metadata" jsonb,
        "status" character varying NOT NULL DEFAULT 'success',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scrape_results_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_scrape_results_job_id" ON "scrape_results" ("jobId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_scrape_results_target" ON "scrape_results" ("target")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "scrape_results"`);
  }
}
