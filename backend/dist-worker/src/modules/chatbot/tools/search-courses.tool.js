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
import { PublicCourseSearchService } from '../../course/services/public-course-search.service.js';
import { ChatbotAiError } from '../chatbot.errors.js';
import { SEARCH_COURSES_DEFINITION, SearchCoursesError, } from './search-courses.contract.js';
import { resolveSearchCoursesArguments, } from './search-courses.context.js';
let SearchCoursesTool = class SearchCoursesTool {
    searchService;
    definition = SEARCH_COURSES_DEFINITION;
    constructor(searchService) {
        this.searchService = searchService;
    }
    async execute(rawArguments, signal, context) {
        const filters = resolveSearchCoursesArguments(rawArguments, context);
        if (signal?.aborted)
            throw new ChatbotAiError('CHATBOT_CANCELLED');
        try {
            const result = await this.searchService.search(filters);
            if (signal?.aborted)
                throw new ChatbotAiError('CHATBOT_CANCELLED');
            return result;
        }
        catch {
            if (signal?.aborted)
                throw new ChatbotAiError('CHATBOT_CANCELLED');
            throw new SearchCoursesError('CHATBOT_SEARCH_UNAVAILABLE');
        }
    }
};
SearchCoursesTool = __decorate([
    Injectable(),
    __param(0, Inject(PublicCourseSearchService)),
    __metadata("design:paramtypes", [PublicCourseSearchService])
], SearchCoursesTool);
export { SearchCoursesTool };
//# sourceMappingURL=search-courses.tool.js.map