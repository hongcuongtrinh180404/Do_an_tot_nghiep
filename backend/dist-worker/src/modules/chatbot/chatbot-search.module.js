var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { PublicCourseSearchModule } from '../course/public-course-search.module.js';
import { ChatbotModule } from './chatbot.module.js';
import { ChatbotSearchService } from './services/chatbot-search.service.js';
import { SearchCoursesTool } from './tools/search-courses.tool.js';
let ChatbotSearchModule = class ChatbotSearchModule {
};
ChatbotSearchModule = __decorate([
    Module({
        imports: [ChatbotModule, PublicCourseSearchModule],
        providers: [SearchCoursesTool, ChatbotSearchService],
        exports: [ChatbotModule, SearchCoursesTool, ChatbotSearchService],
    })
], ChatbotSearchModule);
export { ChatbotSearchModule };
//# sourceMappingURL=chatbot-search.module.js.map