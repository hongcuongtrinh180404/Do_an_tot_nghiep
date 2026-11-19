import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../user/user.module.js';
import {
  InstructorApplicationEntity,
  InstructorApplicationModelSchema,
} from './schemas/instructor-application.schema.js';
import {
  InstructorTermEntity,
  InstructorTermModelSchema,
} from './schemas/instructor-term.schema.js';
import { InstructorApplicationRepository } from './repositories/instructor-application.repository.js';
import { InstructorTermRepository } from './repositories/instructor-term.repository.js';
import { InstructorApplicationService } from './services/instructor-application.service.js';
import {
  InstructorApplicationController,
  InstructorTermsController,
  InstructorApplicationUserController,
} from './instructor-application.controller.js';

@Module({
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
export class InstructorApplicationModule { }
