import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ISeeder, ISeederOptions } from '../../../database/seeds/seeder.interface.js';
import { UserRepository } from '../repositories/user.repository.js';
import { DEFAULT_SEED_PASSWORD, USER_SEED_DATA } from './user.seed.data.js';
import { generateUsername } from '../utils/username.util.js';

@Injectable()
export class UserSeeder implements ISeeder {
  readonly name = 'UserSeeder';
  private readonly logger = new Logger(UserSeeder.name);
  private readonly saltRounds = 10;

  constructor(private readonly userRepository: UserRepository) {}

  private generateUsername(email: string, excludeUserId?: string): Promise<string> {
    return generateUsername(email, async (candidate) => {
      const owner = await this.userRepository.findByUsername(candidate);
      return Boolean(owner && owner.id !== excludeUserId);
    });
  }

  async run(options?: ISeederOptions): Promise<void> {
    const isRefresh = Boolean(options?.refresh);
    this.logger.log(`Starting User Seeder (refresh: ${isRefresh})...`);

    let createdCount = 0;
    let refreshedCount = 0;
    let skippedCount = 0;

    for (const item of USER_SEED_DATA) {
      const existing = await this.userRepository.findByEmail(item.email, true);

      if (existing) {
        if (isRefresh) {
          if (existing.deletedAt) {
            await this.userRepository.restore(existing.id);
          }
          const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, this.saltRounds);
          await this.userRepository.update(existing.id, {
            fullName: item.fullName,
            ...(!existing.username
              ? { username: await this.generateUsername(item.email, existing.id) }
              : {}),
            role: item.role,
            status: item.status,
            isEmailVerified: true,
            bio: item.bio,
            avatarUrl: item.avatarUrl,
            passwordHash,
          });
          this.logger.log(`[REFRESH] Updated user: ${item.email} (${item.role})`);
          refreshedCount++;
        } else {
          this.logger.log(`[SKIP] User already exists: ${item.email} (${item.role})`);
          skippedCount++;
        }
      } else {
        const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, this.saltRounds);
        await this.userRepository.create({
          email: item.email,
          username: await this.generateUsername(item.email),
          fullName: item.fullName,
          role: item.role,
          status: item.status,
          isEmailVerified: true,
          bio: item.bio,
          avatarUrl: item.avatarUrl,
          passwordHash,
        });
        this.logger.log(`[CREATED] Seeded user: ${item.email} (${item.role})`);
        createdCount++;
      }
    }

    this.logger.log(
      `User Seeder completed: ${createdCount} created, ${refreshedCount} refreshed, ${skippedCount} skipped.`,
    );
  }
}
