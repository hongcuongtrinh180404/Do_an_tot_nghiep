import { Module } from '@nestjs/common';
import { InstructorRevenueReadModule } from '../payment/instructor-revenue-read.module.js';
import { ChatbotInstructorBusinessService } from './services/chatbot-instructor-business.service.js';
import { GetInstructorRevenueTool } from './tools/get-instructor-revenue.tool.js';
import { GetInstructorSalesStatsTool } from './tools/get-instructor-sales-stats.tool.js';

@Module({
  imports: [InstructorRevenueReadModule],
  providers: [ChatbotInstructorBusinessService, GetInstructorRevenueTool, GetInstructorSalesStatsTool],
  exports: [GetInstructorRevenueTool, GetInstructorSalesStatsTool],
})
export class ChatbotInstructorModule {}
