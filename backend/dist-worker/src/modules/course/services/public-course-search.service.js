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
import { Inject, Injectable } from '@nestjs/common';
import { PublicCourseSearchRepository } from '../repositories/public-course-search.repository.js';
let PublicCourseSearchService = class PublicCourseSearchService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async search(filters) {
        const { items, total } = await this.repository.search(filters);
        return {
            filtersApplied: { ...filters },
            items,
            currency: 'VND',
            total,
            page: filters.page,
            limit: filters.limit,
            hasMore: filters.page * filters.limit < total,
        };
    }
};
PublicCourseSearchService = __decorate([
    Injectable(),
    __param(0, Inject(PublicCourseSearchRepository)),
    __metadata("design:paramtypes", [PublicCourseSearchRepository])
], PublicCourseSearchService);
export { PublicCourseSearchService };
//# sourceMappingURL=public-course-search.service.js.map