import { Injectable, Logger } from '@nestjs/common';
import { ISeeder, ISeederOptions } from '../../../database/seeds/seeder.interface.js';
import { ReviewRepository } from '../repositories/review.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { ReviewStatusEnum } from 'share-lib';

@Injectable()
export class ReviewSeeder implements ISeeder {
  readonly name = 'ReviewSeeder';
  private readonly logger = new Logger(ReviewSeeder.name);

  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly courseRepository: CourseRepository,
    private readonly userRepository: UserRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
  ) {}

  async run(options?: ISeederOptions): Promise<void> {
    const isRefresh = Boolean(options?.refresh);
    this.logger.log(`Starting Review Seeder (refresh: ${isRefresh})...`);

    const stats = await this.reviewRepository.getAdminStats();
    this.logger.log(
      `Current review stats: Total=${stats.total}, Visible=${stats.visibleCount}, Hidden=${stats.hiddenCount}, Reported=${stats.reportedCount}, Deleted=${stats.deletedCount}`,
    );

    this.logger.log('Review Seeder completed.');
  }
}

