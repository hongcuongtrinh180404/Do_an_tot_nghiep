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
import { ChatbotLearningReadService } from '../services/chatbot-learning-read.service.js';
import { GET_MY_COURSES_DEFINITION, resolveMyCoursesArguments } from './my-learning.contract.js';
let GetMyCoursesTool = class GetMyCoursesTool {
    learning;
    definition = GET_MY_COURSES_DEFINITION;
    constructor(learning) {
        this.learning = learning;
    }
    execute(raw, userId, signal, context) {
        return this.learning.list(userId, resolveMyCoursesArguments(raw, context), signal);
    }
};
GetMyCoursesTool = __decorate([
    Injectable(),
    __param(0, Inject(ChatbotLearningReadService)),
    __metadata("design:paramtypes", [ChatbotLearningReadService])
], GetMyCoursesTool);
export { GetMyCoursesTool };
//# sourceMappingURL=get-my-courses.tool.js.map