import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('scrape_results')
export class ScrapeResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_scrape_results_job_id')
  @Column({ type: 'varchar', nullable: true })
  jobId: string | null;

  @Index('IDX_scrape_results_target')
  @Column()
  target: string;

  @Column()
  url: string;

  @Column({ type: 'jsonb' })
  data: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ default: 'success' })
  status: 'success' | 'partial' | 'failed';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
