var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseCategoryEntity, CourseCategorySchema, } from './schemas/course-category.schema.js';
import { CourseEntity, CourseSchema } from './schemas/course.schema.js';
import { PublicCourseSearchRepository } from './repositories/public-course-search.repository.js';
import { PublicCourseSearchService } from './services/public-course-search.service.js';
let PublicCourseSearchModule = class PublicCourseSearchModule {
};
PublicCourseSearchModule = __decorate([
    Module({
        imports: [
            MongooseModule.forFeature([
                { name: CourseEntity.name, schema: CourseSchema },
                { name: CourseCategoryEntity.name, schema: CourseCategorySchema },
            ]),
        ],
        providers: [PublicCourseSearchRepository, PublicCourseSearchService],
        exports: [PublicCourseSearchService],
    })
], PublicCourseSearchModule);
export { PublicCourseSearchModule };
//# sourceMappingURL=public-course-search.module.js.map