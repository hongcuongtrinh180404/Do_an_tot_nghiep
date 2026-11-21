var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CourseEntity } from '../schemas/course.schema.js';
import { CourseCategoryEntity } from '../schemas/course-category.schema.js';
import { publicCourseSearchPipeline } from '../utils/public-course-search.pipeline.js';
export const PUBLIC_COURSE_SEARCH_TIMEOUT_MS = 3000;
let PublicCourseSearchRepository = class PublicCourseSearchRepository {
    courses;
    categories;
    constructor(courses, categories) {
        this.courses = courses;
        this.categories = categories;
    }
    async search(filters) {
        const [result] = await this.courses
            .aggregate(publicCourseSearchPipeline(filters, this.categories.collection.name))
            .option({
            maxTimeMS: PUBLIC_COURSE_SEARCH_TIMEOUT_MS,
            allowDiskUse: false,
        })
            .exec();
        return {
            total: result?.metadata[0]?.total ?? 0,
            items: (result?.items ?? []).map((doc) => ({
                id: doc._id.toString(),
                title: doc.title,
                price: doc.price,
                level: doc.level,
                categoryName: doc.categoryName ?? null,
                url: `/courses/${encodeURIComponent(doc._id.toString())}`,
            })),
        };
    }
};
PublicCourseSearchRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(CourseEntity.name)),
    __param(1, InjectModel(CourseCategoryEntity.name)),
    __metadata("design:paramtypes", [Model,
        Model])
], PublicCourseSearchRepository);
export { PublicCourseSearchRepository };
//# sourceMappingURL=public-course-search.repository.js.map