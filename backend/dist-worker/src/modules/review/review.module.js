var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseModule } from '../course/course.module.js';
import { EnrollmentModule } from '../enrollment/enrollment.module.js';
import { LearningProgressModule } from '../learning-progress/learning-progress.module.js';
import { UserModule } from '../user/user.module.js';
import { ReviewEntity, ReviewSchema } from './schemas/review.schema.js';
import { ReviewRepository } from './repositories/review.repository.js';
import { ReviewService } from './services/review.service.js';
import { ReviewController } from './review.controller.js';
let ReviewModule = class ReviewModule {
};
ReviewModule = __decorate([
    Module({
        imports: [
            MongooseModule.forFeature([
                { name: ReviewEntity.name, schema: ReviewSchema },
            ]),
            CourseModule,
            EnrollmentModule,
            LearningProgressModule,
            UserModule,
        ],
        controllers: [ReviewController],
        providers: [ReviewRepository, ReviewService],
        exports: [ReviewRepository, ReviewService],
    })
], ReviewModule);
export { ReviewModule };
//# sourceMappingURL=review.module.js.map