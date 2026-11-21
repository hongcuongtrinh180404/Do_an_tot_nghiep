var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../user/user.module.js';
import { InstructorApplicationEntity, InstructorApplicationModelSchema, } from './schemas/instructor-application.schema.js';
import { InstructorTermEntity, InstructorTermModelSchema, } from './schemas/instructor-term.schema.js';
import { InstructorApplicationRepository } from './repositories/instructor-application.repository.js';
import { InstructorTermRepository } from './repositories/instructor-term.repository.js';
import { InstructorApplicationService } from './services/instructor-application.service.js';
import { InstructorApplicationController, InstructorTermsController, InstructorApplicationUserController, } from './instructor-application.controller.js';
let InstructorApplicationModule = class InstructorApplicationModule {
};
InstructorApplicationModule = __decorate([
    Module({
        imports: [
            MongooseModule.forFeature([
                {
                    name: InstructorApplicationEntity.name,
                    schema: InstructorApplicationModelSchema,
                },
                {
                    name: InstructorTermEntity.name,
                    schema: InstructorTermModelSchema,
                },
            ]),
            UserModule,
        ],
        controllers: [
            InstructorApplicationController,
            InstructorTermsController,
            InstructorApplicationUserController,
        ],
        providers: [
            InstructorApplicationRepository,
            InstructorTermRepository,
            InstructorApplicationService,
        ],
        exports: [
            InstructorApplicationService,
            InstructorApplicationRepository,
            InstructorTermRepository,
        ],
    })
], InstructorApplicationModule);
export { InstructorApplicationModule };
//# sourceMappingURL=instructor-application.module.js.map