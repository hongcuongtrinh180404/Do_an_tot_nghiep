import { Module } from '@nestjs/common';
import { PublicCourseSearchModule } from '../course/public-course-search.module.js';
import { ChatbotModule } from './chatbot.module.js';
import { ChatbotSearchService } from './services/chatbot-search.service.js';
import { SearchCoursesTool } from './tools/search-courses.tool.js';

/** Business tools are opt-in; the base ChatbotModule remains database-independent. */
@Module({
  imports: [ChatbotModule, PublicCourseSearchModule],
  providers: [SearchCoursesTool, ChatbotSearchService],
  exports: [ChatbotModule, SearchCoursesTool, ChatbotSearchService],
})
export class ChatbotSearchModule {}
