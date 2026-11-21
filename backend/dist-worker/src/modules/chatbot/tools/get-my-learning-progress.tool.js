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
import { GET_MY_LEARNING_PROGRESS_DEFINITION, parseLearningProgressArguments } from './my-learning.contract.js';
import { ChatbotLearningError, LearningFollowUpError, } from './my-learning.types.js';
let GetMyLearningProgressTool = class GetMyLearningProgressTool {
    learning;
    definition = GET_MY_LEARNING_PROGRESS_DEFINITION;
    constructor(learning) {
        this.learning = learning;
    }
    async execute(raw, userId, question, signal, context) {
        const args = parseLearningProgressArguments(raw);
        if (args.scope === 'overview') {
            return { result: await this.learning.overview(userId, signal), nextContext: { mode: 'learning_progress' } };
        }
        let id = args.courseId;
        if (id && !question.toLowerCase().includes(id)) {
            throw new ChatbotLearningError('CHATBOT_TOOL_ARGUMENTS_INVALID');
        }
        if (args.position !== undefined) {
            if (!context?.list)
                throw new LearningFollowUpError('missing_list');
            id = context.list.ids[args.position - 1];
            if (!id)
                throw new LearningFollowUpError('invalid_position');
        }
        if (args.current) {
            id = context?.selectedCourseId
                ?? (context?.list?.ids.length === 1 ? context.list.ids[0] : undefined);
            if (!id)
                throw new LearningFollowUpError('missing_course');
        }
        let keyword = args.courseName;
        let page = args.page;
        let limit = args.limit;
        if (args.scope === 'next_page') {
            if (context?.list?.kind !== 'selection')
                throw new LearningFollowUpError('missing_list');
            if (!context.list.hasMore)
                throw new LearningFollowUpError('no_more');
            keyword = context.list.keyword;
            page = context.list.page + 1;
            limit = context.list.limit;
            if (page > 1000)
                throw new ChatbotLearningError('CHATBOT_TOOL_ARGUMENTS_INVALID');
        }
        if (keyword) {
            const candidates = await this.learning.candidates(userId, keyword, page, limit, signal);
            if (candidates.total === 1 && page === 1) {
                id = candidates.items[0].id;
            }
            else {
                return {
                    result: candidates.total === 0 ? { scope: 'not_owned' } : candidates,
                    nextContext: {
                        mode: 'learning_progress',
                        list: { kind: 'selection', keyword, page, limit, hasMore: candidates.hasMore,
                            ids: candidates.items.map((course) => course.id) },
                    },
                };
            }
        }
        if (!id)
            throw new LearningFollowUpError('missing_course');
        const result = await this.learning.detail(userId, id, signal);
        const continuesList = args.position !== undefined || args.current || context?.list?.ids.includes(id);
        return {
            result,
            nextContext: {
                mode: 'learning_progress',
                ...(continuesList && context?.list ? { list: context.list } : {}),
                ...(result.scope === 'course' ? { selectedCourseId: result.course.id } : {}),
            },
        };
    }
};
GetMyLearningProgressTool = __decorate([
    Injectable(),
    __param(0, Inject(ChatbotLearningReadService)),
    __metadata("design:paramtypes", [ChatbotLearningReadService])
], GetMyLearningProgressTool);
export { GetMyLearningProgressTool };
//# sourceMappingURL=get-my-learning-progress.tool.js.map