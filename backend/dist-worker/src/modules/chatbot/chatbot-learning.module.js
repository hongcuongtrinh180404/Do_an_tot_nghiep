var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrollmentEntity, EnrollmentSchema } from '../enrollment/schemas/enrollment.schema.js';
import { LessonEntity, LessonSchema } from '../course/schemas/lesson.schema.js';
import { LearningProgressModule } from '../learning-progress/learning-progress.module.js';
import { ChatbotMyCoursesRepository } from './repositories/chatbot-my-courses.repository.js';
import { ChatbotLearningReadService } from './services/chatbot-learning-read.service.js';
import { GetMyCoursesTool } from './tools/get-my-courses.tool.js';
import { GetMyLearningProgressTool } from './tools/get-my-learning-progress.tool.js';
let ChatbotLearningModule = class ChatbotLearningModule {
};
ChatbotLearningModule = __decorate([
    Module({
        imports: [
            LearningProgressModule,
            MongooseModule.forFeature([
                { name: EnrollmentEntity.name, schema: EnrollmentSchema },
                { name: LessonEntity.name, schema: LessonSchema },
            ]),
        ],
        providers: [ChatbotMyCoursesRepository, ChatbotLearningReadService, GetMyCoursesTool, GetMyLearningProgressTool],
        exports: [GetMyCoursesTool, GetMyLearningProgressTool],
    })
], ChatbotLearningModule);
export { ChatbotLearningModule };
//# sourceMappingURL=chatbot-learning.module.js.map