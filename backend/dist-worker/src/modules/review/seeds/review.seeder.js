var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ReviewSeeder_1;
import { Injectable, Logger } from '@nestjs/common';
import { ReviewRepository } from '../repositories/review.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
let ReviewSeeder = ReviewSeeder_1 = class ReviewSeeder {
    reviewRepository;
    courseRepository;
    userRepository;
    enrollmentRepository;
    name = 'ReviewSeeder';
    logger = new Logger(ReviewSeeder_1.name);
    constructor(reviewRepository, courseRepository, userRepository, enrollmentRepository) {
        this.reviewRepository = reviewRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
    }
    async run(options) {
        const isRefresh = Boolean(options?.refresh);
        this.logger.log(`Starting Review Seeder (refresh: ${isRefresh})...`);
        const stats = await this.reviewRepository.getAdminStats();
        this.logger.log(`Current review stats: Total=${stats.total}, Visible=${stats.visibleCount}, Hidden=${stats.hiddenCount}, Reported=${stats.reportedCount}, Deleted=${stats.deletedCount}`);
        this.logger.log('Review Seeder completed.');
    }
};
ReviewSeeder = ReviewSeeder_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ReviewRepository,
        CourseRepository,
        UserRepository,
        EnrollmentRepository])
], ReviewSeeder);
export { ReviewSeeder };
//# sourceMappingURL=review.seeder.js.map