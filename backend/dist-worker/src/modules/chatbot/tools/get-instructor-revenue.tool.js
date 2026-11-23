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
import { ChatbotInstructorBusinessService } from '../services/chatbot-instructor-business.service.js';
import { GET_INSTRUCTOR_REVENUE_DEFINITION } from './instructor-business.contract.js';
let GetInstructorRevenueTool = class GetInstructorRevenueTool {
    business;
    definition = GET_INSTRUCTOR_REVENUE_DEFINITION;
    constructor(business) {
        this.business = business;
    }
    execute(raw, userId, question, signal, context) {
        return this.business.execute('revenue', raw, userId, question, signal, context);
    }
};
GetInstructorRevenueTool = __decorate([
    Injectable(),
    __param(0, Inject(ChatbotInstructorBusinessService)),
    __metadata("design:paramtypes", [ChatbotInstructorBusinessService])
], GetInstructorRevenueTool);
export { GetInstructorRevenueTool };
//# sourceMappingURL=get-instructor-revenue.tool.js.map