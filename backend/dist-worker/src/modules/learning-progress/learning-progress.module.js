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
import { LearningProgressEntity, LearningProgressSchema } from './schemas/learning-progress.schema.js';
import { LearningProgressRepository } from './repositories/learning-progress.repository.js';
import { LearningProgressService } from './services/learning-progress.service.js';
import { LearningProgressController } from './learning-progress.controller.js';
import { LessonCompletionController } from './lesson-completion.controller.js';
import { LessonCompletionService } from './services/lesson-completion.service.js';
import { LessonCompletionRepository } from './repositories/lesson-completion.repository.js';
import { LessonQuizAnswerEntity, LessonQuizAnswerSchema, LessonVideoCompletionEntity, LessonVideoCompletionSchema } from './schemas/lesson-completion.schema.js';
let LearningProgressModule = class LearningProgressModule {
};
LearningProgressModule = __decorate([
    Module({
        imports: [
            CourseModule,
            EnrollmentModule,
            MongooseModule.forFeature([
                { name: LearningProgressEntity.name, schema: LearningProgressSchema },
                { name: LessonQuizAnswerEntity.name, schema: LessonQuizAnswerSchema },
                { name: LessonVideoCompletionEntity.name, schema: LessonVideoCompletionSchema },
            ]),
        ],
        controllers: [LearningProgressController, LessonCompletionController],
        providers: [LearningProgressRepository, LearningProgressService, LessonCompletionRepository, LessonCompletionService],
        exports: [LearningProgressRepository, LearningProgressService],
    })
], LearningProgressModule);
export { LearningProgressModule };
//# sourceMappingURL=learning-progress.module.js.map