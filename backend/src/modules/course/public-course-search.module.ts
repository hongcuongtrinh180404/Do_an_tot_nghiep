import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CourseCategoryEntity,
  CourseCategorySchema,
} from './schemas/course-category.schema.js';
import { CourseEntity, CourseSchema } from './schemas/course.schema.js';
import { PublicCourseSearchRepository } from './repositories/public-course-search.repository.js';
import { PublicCourseSearchService } from './services/public-course-search.service.js';

/** Does not load CourseModule's enrollment, media or payment dependency graph. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseEntity.name, schema: CourseSchema },
      { name: CourseCategoryEntity.name, schema: CourseCategorySchema },
    ]),
  ],
  providers: [PublicCourseSearchRepository, PublicCourseSearchService],
  exports: [PublicCourseSearchService],
})
export class PublicCourseSearchModule {}
