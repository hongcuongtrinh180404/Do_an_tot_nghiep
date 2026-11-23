var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseEntity, CourseSchema } from '../course/schemas/course.schema.js';
import { EnrollmentEntity, EnrollmentSchema } from '../enrollment/schemas/enrollment.schema.js';
import { OrderEntity, OrderSchema } from '../enrollment/schemas/order.schema.js';
import { LearningProgressModule } from '../learning-progress/learning-progress.module.js';
import { UserModule } from '../user/user.module.js';
import { AdminUserCoursesController } from './admin-user-courses.controller.js';
import { AdminUserCoursesRepository } from './repositories/admin-user-courses.repository.js';
import { AdminUserCoursesService } from './services/admin-user-courses.service.js';
let AdminUsersModule = class AdminUsersModule {
};
AdminUsersModule = __decorate([
    Module({
        imports: [
            UserModule,
            LearningProgressModule,
            MongooseModule.forFeature([
                { name: CourseEntity.name, schema: CourseSchema },
                { name: EnrollmentEntity.name, schema: EnrollmentSchema },
                { name: OrderEntity.name, schema: OrderSchema },
            ]),
        ],
        controllers: [AdminUserCoursesController],
        providers: [AdminUserCoursesRepository, AdminUserCoursesService],
    })
], AdminUsersModule);
export { AdminUsersModule };
//# sourceMappingURL=admin-users.module.js.map