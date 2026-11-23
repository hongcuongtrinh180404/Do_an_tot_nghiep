import { BusinessFollowUpError, ChatbotBusinessError } from './instructor-business.types.js';
const DAY = 86400000;
const OFFSET = 7 * 3600000;
export function vietnamDate(now) {
    return new Date(now.getTime() + OFFSET).toISOString().slice(0, 10);
}
function midnight(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    const stamp = Date.parse(`${value}T00:00:00+07:00`);
    if (!Number.isFinite(stamp) || vietnamDate(new Date(stamp)) !== value || Number(value.slice(0, 4)) < 2000) {
        throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    }
    return stamp;
}
export function resolveBusinessPeriod(input, now = new Date()) {
    const today = vietnamDate(now);
    const day = midnight(today);
    const local = new Date(day + OFFSET);
    const year = local.getUTCFullYear();
    const month = local.getUTCMonth();
    const monthStart = (y, m) => Date.UTC(y, m, 1) - OFFSET;
    let start;
    let end;
    switch (input.timeRange) {
        case 'custom':
            start = midnight(input.startDate ?? '');
            end = midnight(input.endDate ?? '') + DAY;
            break;
        case 'today':
            start = day;
            end = day + DAY;
            break;
        case 'yesterday':
            start = day - DAY;
            end = day;
            break;
        case 'this_week':
            start = day - ((local.getUTCDay() + 6) % 7) * DAY;
            end = start + 7 * DAY;
            break;
        case 'last_week':
            end = day - ((local.getUTCDay() + 6) % 7) * DAY;
            start = end - 7 * DAY;
            break;
        case '7days':
            start = day - 6 * DAY;
            end = day + DAY;
            break;
        case '30days':
            start = day - 29 * DAY;
            end = day + DAY;
            break;
        case 'this_month':
            start = monthStart(year, month);
            end = monthStart(year, month + 1);
            break;
        case 'last_month':
            start = monthStart(year, month - 1);
            end = monthStart(year, month);
            break;
        case 'this_year':
            start = monthStart(year, 0);
            end = monthStart(year + 1, 0);
            break;
        default: throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    }
    if (end <= start || start > now.getTime() || end - start > 366 * DAY) {
        throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    }
    const effectiveEnd = Math.min(end, now.getTime());
    return {
        startDate: vietnamDate(new Date(start)),
        endDate: vietnamDate(new Date(effectiveEnd === end ? end - 1 : effectiveEnd)),
        startAt: new Date(start).toISOString(), endAtExclusive: new Date(effectiveEnd).toISOString(),
        isPartial: effectiveEnd < end,
    };
}
export function previousBusinessPeriod(input, current, now) {
    if (input.timeRange === 'this_month')
        return resolveBusinessPeriod({ timeRange: 'last_month' }, now);
    if (input.timeRange === 'this_week')
        return resolveBusinessPeriod({ timeRange: 'last_week' }, now);
    const start = midnight(current.startDate);
    if (input.timeRange === 'last_month' || input.timeRange === 'this_year') {
        const vn = new Date(start + OFFSET);
        const previousStart = input.timeRange === 'last_month'
            ? Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth() - 1, 1) - OFFSET
            : Date.UTC(vn.getUTCFullYear() - 1, 0, 1) - OFFSET;
        return resolveBusinessPeriod({ timeRange: 'custom',
            startDate: vietnamDate(new Date(previousStart)), endDate: vietnamDate(new Date(start - DAY)) }, now);
    }
    const days = (midnight(current.endDate) - start) / DAY + 1;
    if (days < 1)
        throw new BusinessFollowUpError('missing_business_context');
    return resolveBusinessPeriod({
        timeRange: 'custom',
        startDate: vietnamDate(new Date(start - days * DAY)),
        endDate: vietnamDate(new Date(start - DAY)),
    }, now);
}
//# sourceMappingURL=instructor-business.period.js.map