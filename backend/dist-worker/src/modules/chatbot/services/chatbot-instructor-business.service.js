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
import { ChatbotAiError } from '../chatbot.errors.js';
import { InstructorRevenueReadRepository } from '../../payment/repositories/instructor-revenue-read.repository.js';
import { InstructorRevenueDataError } from '../../payment/utils/instructor-revenue.pipeline.js';
import { resolveBusinessArguments } from '../tools/instructor-business.contract.js';
import { previousBusinessPeriod, resolveBusinessPeriod } from '../tools/instructor-business.period.js';
import { BusinessFollowUpError, ChatbotBusinessError } from '../tools/instructor-business.types.js';
export const CHATBOT_REVENUE_BUDGET_MS = 8000;
let ChatbotInstructorBusinessService = class ChatbotInstructorBusinessService {
    reads;
    constructor(reads) {
        this.reads = reads;
    }
    async execute(tool, raw, userId, question, signal, context, now = new Date()) {
        if (!/^[a-f\d]{24}$/i.test(userId))
            throw new ChatbotAiError('CHATBOT_REQUEST_INVALID');
        let interrupted = false;
        let timer;
        let onAbort;
        const deadline = Date.now() + CHATBOT_REVENUE_BUDGET_MS;
        const check = () => {
            if (signal?.aborted)
                throw new ChatbotAiError('CHATBOT_CANCELLED');
            if (interrupted || Date.now() >= deadline)
                throw new ChatbotBusinessError('CHATBOT_REVENUE_UNAVAILABLE');
        };
        const operation = async () => {
            check();
            if (!await this.reads.canRead(userId))
                throw new ChatbotBusinessError('CHATBOT_INSTRUCTOR_FORBIDDEN');
            check();
            const args = resolveBusinessArguments(raw, tool, context);
            const query = args.query;
            const period = resolveBusinessPeriod(query.period, now);
            const base = { asOf: now.toISOString(), timeZone: 'Asia/Ho_Chi_Minh', currency: 'VND', period };
            const mode = tool === 'revenue' ? 'instructor_revenue' : 'instructor_sales_stats';
            const nextContext = { mode, business: { query } };
            let course = null;
            let courseId = query.courseId;
            if (args.courseId && !question.toLowerCase().includes(args.courseId))
                throw new BusinessFollowUpError('missing_business_course');
            if (args.position !== undefined || args.current) {
                const list = context?.list;
                const businessList = list?.kind === 'business_selection' || list?.kind === 'business_top' ? list : undefined;
                courseId = args.position !== undefined ? businessList?.ids[args.position - 1]
                    : context?.business?.selectedCourseId ?? (businessList?.ids.length === 1 ? businessList.ids[0] : undefined);
                if (!courseId)
                    throw new BusinessFollowUpError(args.position !== undefined ? 'invalid_business_position' : 'missing_business_course');
                query.courseId = courseId;
                delete query.courseName;
            }
            if (query.courseName || courseId) {
                check();
                const found = await this.reads.courses(userId, {
                    ...(courseId ? { courseId } : { keyword: query.courseName }),
                    page: courseId ? 1 : query.page, limit: courseId ? 1 : query.limit,
                });
                check();
                if (!found.total) {
                    if (!await this.reads.canRead(userId))
                        throw new ChatbotBusinessError('CHATBOT_INSTRUCTOR_FORBIDDEN');
                    check();
                    return { result: { ...base, course: null, scope: 'not_owned' }, nextContext };
                }
                if (!courseId && (found.total !== 1 || !found.items.length)) {
                    const hasMore = found.total > query.page * query.limit;
                    nextContext.list = { kind: 'business_selection', query: structuredClone(query), keyword: query.courseName, page: query.page,
                        limit: query.limit, ids: found.items.map((item) => item.id), hasMore };
                    if (!await this.reads.canRead(userId))
                        throw new ChatbotBusinessError('CHATBOT_INSTRUCTOR_FORBIDDEN');
                    check();
                    return { result: { ...base, course: null, scope: 'selection', ...found,
                            page: query.page, limit: query.limit, hasMore }, nextContext };
                }
                course = found.items[0];
                courseId = course.id;
                query.courseId = courseId;
                delete query.courseName;
                nextContext.business.selectedCourseId = courseId;
                if (args.preservesList && context?.list
                    && ['business_selection', 'business_top'].includes(context.list.kind)
                    && context.list.ids.includes(courseId))
                    nextContext.list = context.list;
            }
            const start = new Date(period.startAt);
            const end = new Date(period.endAtExclusive);
            let result;
            check();
            if (query.mode === 'top_courses') {
                const top = await this.reads.topCourses(userId, start, end, query.page, query.limit);
                result = { ...base, course: null, scope: 'top_courses', ...top,
                    page: query.page, limit: query.limit, hasMore: top.total > query.page * query.limit };
                nextContext.list = { kind: 'business_top', query: structuredClone(query), page: query.page, limit: query.limit,
                    ids: top.items.map((item) => item.id), hasMore: result.hasMore };
            }
            else if (query.mode === 'compare') {
                const previousPeriod = query.comparePeriod
                    ? resolveBusinessPeriod(query.comparePeriod, now) : previousBusinessPeriod(query.period, period, now);
                const [current, previous] = await this.reads.compare(userId, { start, endExclusive: end }, { start: new Date(previousPeriod.startAt), endExclusive: new Date(previousPeriod.endAtExclusive) }, courseId);
                const key = query.metric === 'successful_sales' ? 'successfulSales' : 'instructorEarnings';
                const absolute = current[key] - previous[key];
                const percent = previous[key] ? Math.round(absolute / previous[key] * 10000) / 100 : absolute === 0 ? 0 : null;
                result = { ...base, course, scope: 'compare', metric: query.metric, current, previous, previousPeriod,
                    change: { absolute, percent, direction: absolute === 0 ? 'unchanged' : previous[key] === 0 ? 'new' : absolute > 0 ? 'up' : 'down' } };
            }
            else {
                result = { ...base, course, scope: query.mode, totals: await this.reads.summary(userId, start, end, courseId) };
            }
            check();
            if (!await this.reads.canRead(userId))
                throw new ChatbotBusinessError('CHATBOT_INSTRUCTOR_FORBIDDEN');
            check();
            return { result, nextContext };
        };
        try {
            check();
            const abort = new Promise((_resolve, reject) => {
                onAbort = () => reject(new ChatbotAiError('CHATBOT_CANCELLED'));
                signal?.addEventListener('abort', onAbort, { once: true });
                timer = setTimeout(() => {
                    interrupted = true;
                    reject(new ChatbotBusinessError('CHATBOT_REVENUE_UNAVAILABLE'));
                }, CHATBOT_REVENUE_BUDGET_MS);
                timer.unref();
            });
            return await Promise.race([operation(), abort]);
        }
        catch (error) {
            if (signal?.aborted)
                throw new ChatbotAiError('CHATBOT_CANCELLED');
            if (error instanceof InstructorRevenueDataError)
                throw new ChatbotBusinessError('CHATBOT_REVENUE_DATA_INCOMPLETE');
            if (error instanceof ChatbotAiError || error instanceof ChatbotBusinessError || error instanceof BusinessFollowUpError)
                throw error;
            throw new ChatbotBusinessError('CHATBOT_REVENUE_UNAVAILABLE');
        }
        finally {
            if (timer)
                clearTimeout(timer);
            if (onAbort)
                signal?.removeEventListener('abort', onAbort);
        }
    }
};
ChatbotInstructorBusinessService = __decorate([
    Injectable(),
    __param(0, Inject(InstructorRevenueReadRepository)),
    __metadata("design:paramtypes", [InstructorRevenueReadRepository])
], ChatbotInstructorBusinessService);
export { ChatbotInstructorBusinessService };
//# sourceMappingURL=chatbot-instructor-business.service.js.map