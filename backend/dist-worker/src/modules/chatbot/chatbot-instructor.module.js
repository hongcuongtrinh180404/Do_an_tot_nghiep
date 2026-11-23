var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { InstructorRevenueReadModule } from '../payment/instructor-revenue-read.module.js';
import { ChatbotInstructorBusinessService } from './services/chatbot-instructor-business.service.js';
import { GetInstructorRevenueTool } from './tools/get-instructor-revenue.tool.js';
import { GetInstructorSalesStatsTool } from './tools/get-instructor-sales-stats.tool.js';
let ChatbotInstructorModule = class ChatbotInstructorModule {
};
ChatbotInstructorModule = __decorate([
    Module({
        imports: [InstructorRevenueReadModule],
        providers: [ChatbotInstructorBusinessService, GetInstructorRevenueTool, GetInstructorSalesStatsTool],
        exports: [GetInstructorRevenueTool, GetInstructorSalesStatsTool],
    })
], ChatbotInstructorModule);
export { ChatbotInstructorModule };
//# sourceMappingURL=chatbot-instructor.module.js.map