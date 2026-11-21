var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrollmentEntity, EnrollmentSchema } from './schemas/enrollment.schema.js';
import { OrderEntity, OrderSchema } from './schemas/order.schema.js';
import { EnrollmentRepository } from './repositories/enrollment.repository.js';
import { OrderRepository } from './repositories/order.repository.js';
import { EnrollmentService } from './services/enrollment.service.js';
import { EnrollmentController } from './enrollment.controller.js';
import { UserModule } from '../user/user.module.js';
import { CourseModule } from '../course/course.module.js';
let EnrollmentModule = class EnrollmentModule {
};
EnrollmentModule = __decorate([
    Module({
        imports: [
            MongooseModule.forFeature([
                { name: EnrollmentEntity.name, schema: EnrollmentSchema },
                { name: OrderEntity.name, schema: OrderSchema },
            ]),
            UserModule,
            forwardRef(() => CourseModule),
        ],
        controllers: [EnrollmentController],
        providers: [
            EnrollmentRepository,
            OrderRepository,
            EnrollmentService,
        ],
        exports: [
            EnrollmentRepository,
            OrderRepository,
            EnrollmentService,
        ],
    })
], EnrollmentModule);
export { EnrollmentModule };
//# sourceMappingURL=enrollment.module.js.map