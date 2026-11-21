function publicSearchResult(result) {
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
function ownedCourse(course) {
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
function learningResult(result) {
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
export function projectChatbotReply(reply) {
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
    }
}
//# sourceMappingURL=chatbot-response.projection.js.map