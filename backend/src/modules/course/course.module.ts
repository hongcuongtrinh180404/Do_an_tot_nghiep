import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseEntity, CourseSchema } from './schemas/course.schema.js';
import { CourseController } from './course.controller.js';
import { CourseRepository } from './repositories/course.repository.js';
import { CourseService } from './services/course.service.js';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseEntity.name, schema: CourseSchema },
    ]),
    UserModule,
  ],
  controllers: [CourseController],
  providers: [CourseRepository, CourseService],
  exports: [CourseRepository, CourseService],
})
export class CourseModule {}
