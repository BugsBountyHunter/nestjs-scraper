import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ApiModule } from './api/api.module';
import { ScraperModule } from './scraper/scraper.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { QueueModule } from './queue/queue.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ScrapeResult } from './pipeline/storage/scrape-result.entity';
import { CreateScrapeResults1760500000000 } from './pipeline/storage/migrations/1760500000000-CreateScrapeResults';

@Module({
  imports: [
    // Config — globally available
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_DATABASE', 'nestjs_scraper'),
        entities: [ScrapeResult],
        // Postgres 13+ has gen_random_uuid() built in — no uuid-ossp extension needed
        uuidExtension: 'pgcrypto',
        migrations: [CreateScrapeResults1760500000000],
        // Dev: auto-sync the schema. Production: apply migrations on boot instead.
        synchronize: config.get('NODE_ENV') !== 'production',
        migrationsRun: config.get('NODE_ENV') === 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // BullMQ global Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    QueueModule,
    ScraperModule,
    PipelineModule,
    ApiModule,
    MonitoringModule,
  ],
})
export class AppModule {}
