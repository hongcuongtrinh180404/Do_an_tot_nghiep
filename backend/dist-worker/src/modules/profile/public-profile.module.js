var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../user/user.module.js';
import { CourseModule } from '../course/course.module.js';
import { LearningProgressModule } from '../learning-progress/learning-progress.module.js';
import { CourseEntity, CourseSchema } from '../course/schemas/course.schema.js';
import { EnrollmentEntity, EnrollmentSchema } from '../enrollment/schemas/enrollment.schema.js';
import { PublicProfileController } from './public-profile.controller.js';
import { PublicProfileService } from './public-profile.service.js';
import { PublicProfileRepository } from './public-profile.repository.js';
let PublicProfileModule = class PublicProfileModule {
};
PublicProfileModule = __decorate([
    Module({
        imports: [
            UserModule, CourseModule, LearningProgressModule,
            MongooseModule.forFeature([
                { name: CourseEntity.name, schema: CourseSchema },
                { name: EnrollmentEntity.name, schema: EnrollmentSchema },
            ]),
        ],
        controllers: [PublicProfileController],
        providers: [PublicProfileRepository, PublicProfileService],
    })
], PublicProfileModule);
export { PublicProfileModule };
//# sourceMappingURL=public-profile.module.js.map