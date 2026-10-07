import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SeedModule } from './seed.module.js';
import { UserSeeder } from '../../modules/user/seeds/user.seeder.js';
import { ISeeder } from './seeder.interface.js';

async function bootstrap() {
  const logger = new Logger('SeederCLI');
  logger.log('🌱 Starting THC E-Learning Database Seeder...');

  const args = process.argv.slice(2);
  const refresh = args.includes('--refresh') || args.includes('--reset');

  if (refresh) {
    logger.warn('⚠️  FLAG DETECTED: Running in REFRESH mode (overriding/updating existing seed accounts)');
  }

  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const seeders: ISeeder[] = [app.get(UserSeeder)];

    for (const seeder of seeders) {
      logger.log(`Executing ${seeder.name}...`);
      await seeder.run({ refresh });
    }

    logger.log('🎉 Seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Seeding failed with error:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
    logger.log('Closed database connections gracefully.');
  }
}

bootstrap();
