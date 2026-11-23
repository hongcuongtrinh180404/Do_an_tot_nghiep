import type { PublicCourseSearchResult } from '../../course/interfaces/public-course-search.interface.js';
import type {
  ChatbotConversationReply, ChatbotOwnedCourse, LearningResult,
} from '../tools/my-learning.types.js';
import type { BusinessPeriod, BusinessResult } from '../tools/instructor-business.types.js';
import type { InstructorRevenueTotals } from '../../payment/repositories/instructor-revenue-read.repository.js';

type WithoutContext<T> = T extends unknown ? Omit<T, 'nextContext'> : never;
export type ChatbotPublicReply = WithoutContext<ChatbotConversationReply>;
export type ChatbotMessageResponse = ChatbotPublicReply & { requestId: string; context?: string };

function publicSearchResult(result: PublicCourseSearchResult): PublicCourseSearchResult {
  const filters = result.filtersApplied;
  return {
    filtersApplied: {
      ...(filters.keyword !== undefined ? { keyword: filters.keyword } : {}),
      ...(filters.relatedKeywords !== undefined ? { relatedKeywords: [...filters.relatedKeywords] } : {}),
      ...(filters.minPrice !== undefined ? { minPrice: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { maxPrice: filters.maxPrice } : {}),
      ...(filters.isFree !== undefined ? { isFree: filters.isFree } : {}),
      ...(filters.level !== undefined ? { level: filters.level } : {}),
      maxPriceExclusive: filters.maxPriceExclusive, page: filters.page, limit: filters.limit,
    },
    items: result.items.map((item) => ({
      id: item.id, title: item.title, price: item.price, level: item.level,
      categoryName: item.categoryName, url: `/courses/${item.id}`,
    })),
    currency: result.currency, total: result.total, page: result.page, limit: result.limit, hasMore: result.hasMore,
  };
}

function ownedCourse(course: ChatbotOwnedCourse): ChatbotOwnedCourse {
  const p = course.progress;
  return {
    id: course.id, title: course.title, enrolledAt: course.enrolledAt,
    url: course.url === '/my-courses' ? '/my-courses' : `/courses/${course.id}`,
    resumeUrl: p.lastLessonId && course.resumeUrl ? `/courses/${course.id}/lessons/${p.lastLessonId}` : null,
    progress: {
      status: p.status, progressPercent: p.progressPercent,
      completedLessons: p.completedLessons, totalLessons: p.totalLessons,
      watchedMs: p.watchedMs, lastLessonId: p.lastLessonId, lastPositionSeconds: p.lastPositionSeconds,
    },
  };
}

function learningResult(result: LearningResult): LearningResult {
  switch (result.scope) {
    case 'not_owned': return { scope: 'not_owned' };
    case 'overview': return {
      scope: 'overview', totalCourses: result.totalCourses, notStarted: result.notStarted,
      inProgress: result.inProgress, completed: result.completed,
    };
    case 'course': return {
      scope: 'course', course: ownedCourse(result.course), remainingLessons: result.remainingLessons,
      lastLessonTitle: result.lastLessonTitle,
    };
    case 'selection': return {
      scope: 'selection', keyword: result.keyword,
      items: result.items.map((item) => ({ id: item.id, title: item.title })),
      total: result.total, page: result.page, limit: result.limit, hasMore: result.hasMore,
    };
  }
}

function businessPeriod(p: BusinessPeriod): BusinessPeriod {
  return { startDate: p.startDate, endDate: p.endDate, startAt: p.startAt,
    endAtExclusive: p.endAtExclusive, isPartial: p.isPartial };
}
function businessTotals(t: InstructorRevenueTotals): InstructorRevenueTotals {
  return { totalRevenue: t.totalRevenue, platformCommission: t.platformCommission,
    instructorEarnings: t.instructorEarnings, successfulSales: t.successfulSales, reconstructedOrders: t.reconstructedOrders };
}
function businessResult(r: BusinessResult): BusinessResult {
  const base = { asOf: r.asOf, timeZone: 'Asia/Ho_Chi_Minh' as const, currency: 'VND' as const,
    period: businessPeriod(r.period), course: r.course ? { id: r.course.id, title: r.course.title } : null };
  switch (r.scope) {
    case 'not_owned': return { ...base, course: null, scope: r.scope };
    case 'selection': return { ...base, course: null, scope: r.scope,
      items: r.items.map((c) => ({ id: c.id, title: c.title })),
      total: r.total, page: r.page, limit: r.limit, hasMore: r.hasMore };
    case 'revenue':
    case 'sales_count': return { ...base, scope: r.scope, totals: businessTotals(r.totals) };
    case 'top_courses': return { ...base, course: null, scope: r.scope,
      totals: businessTotals(r.totals),
      items: r.items.map((c) => ({ id: c.id, title: c.title, rank: c.rank, ...businessTotals(c) })),
      total: r.total, page: r.page, limit: r.limit, hasMore: r.hasMore, topTiedCount: r.topTiedCount };
    case 'compare': return { ...base, scope: r.scope, metric: r.metric, current: businessTotals(r.current),
      previous: businessTotals(r.previous), previousPeriod: businessPeriod(r.previousPeriod),
      change: { absolute: r.change.absolute, percent: r.change.percent, direction: r.change.direction } };
  }
}

/** Explicit allowlists at the HTTP boundary, including nested personal data. */
export function projectChatbotReply(reply: ChatbotConversationReply): ChatbotPublicReply {
  switch (reply.kind) {
    case 'clarification': return { kind: reply.kind, status: reply.status, answer: reply.answer };
    case 'course_search': return { kind: reply.kind, status: reply.status, answer: reply.answer, result: publicSearchResult(reply.result) };
    case 'my_courses': {
      const r = reply.result;
      return {
        kind: reply.kind, status: reply.status, answer: reply.answer, result: {
          filtersApplied: {
            ...(r.filtersApplied.keyword !== undefined ? { keyword: r.filtersApplied.keyword } : {}),
            ...(r.filtersApplied.learningStatus !== undefined ? { learningStatus: r.filtersApplied.learningStatus } : {}),
            page: r.filtersApplied.page, limit: r.filtersApplied.limit,
          },
          items: r.items.map(ownedCourse), total: r.total, page: r.page, limit: r.limit, hasMore: r.hasMore,
        },
      };
    }
    case 'learning_progress': return {
      kind: reply.kind, status: reply.status, answer: reply.answer, result: learningResult(reply.result),
    };
    case 'instructor_revenue':
    case 'instructor_sales_stats': return {
      kind: reply.kind, status: reply.status, answer: reply.answer, result: businessResult(reply.result),
    };
  }
}
