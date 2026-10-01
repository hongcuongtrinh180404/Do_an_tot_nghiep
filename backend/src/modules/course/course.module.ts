import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseEntity, CourseSchema } from './schemas/course.schema.js';
import { SectionEntity, SectionSchema } from './schemas/section.schema.js';
import { LessonEntity, LessonSchema } from './schemas/lesson.schema.js';
import { CourseController } from './course.controller.js';
import { LessonController } from './lesson.controller.js';
import { LessonsController } from './lessons.controller.js';
import { LessonContentController } from './lesson-content.controller.js';
import { CourseRepository } from './repositories/course.repository.js';
import { SectionRepository } from './repositories/section.repository.js';
import { LessonRepository } from './repositories/lesson.repository.js';
import { CourseService } from './services/course.service.js';
import { LessonService } from './services/lesson.service.js';
import { UserModule } from '../user/user.module.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseEntity.name, schema: CourseSchema },
      { name: SectionEntity.name, schema: SectionSchema },
      { name: LessonEntity.name, schema: LessonSchema },
    ]),
    UserModule,
    CloudinaryModule,
  ],
  controllers: [CourseController, LessonController, LessonsController, LessonContentController],
  providers: [CourseRepository, SectionRepository, LessonRepository, CourseService, LessonService],
  exports: [CourseRepository, SectionRepository, LessonRepository, CourseService, LessonService],
})
export class CourseModule {}
