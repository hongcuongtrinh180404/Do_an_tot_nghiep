import type { BusinessResult, BusinessPeriod } from '../tools/instructor-business.types.js';
import type { ChatbotConversationReply } from '../tools/my-learning.types.js';
import { escapeMarkdownTitle } from './chatbot-search.service.js';

const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
const dates = (value: string) => value.split('-').reverse().join('/');
export const businessPeriodLabel = (period: BusinessPeriod) => `${dates(period.startDate)}–${dates(period.endDate)}${period.isPartial ? ' (đến thời điểm tra cứu)' : ''}`;
export function businessAnswer(result: BusinessResult): Pick<ChatbotConversationReply, 'status' | 'answer'> {
  const period = businessPeriodLabel(result.period);
  const scope = result.course ? `Khóa ${escapeMarkdownTitle(result.course.title)}` : 'Tất cả khóa giảng dạy của bạn';
  switch (result.scope) {
    case 'not_owned': return { status: 'empty', answer: 'Không tìm thấy khóa học này trong phạm vi doanh thu giảng dạy của bạn.' };
    case 'selection': return {
      status: result.items.length ? 'needs_clarification' : 'page_empty',
      answer: `Có ${result.total} khóa phù hợp. Bạn muốn xem số liệu khóa nào trong ${period}?\n${
        result.items.map((course, index) => `${index + 1}. ${escapeMarkdownTitle(course.title)}`).join('\n')
      }${result.hasMore ? '\nBạn có thể hỏi “xem thêm”.' : ''}`,
    };
    case 'revenue': return {
      status: result.totals.successfulSales ? 'found' : 'empty',
      answer: `${scope}, ${period}: thu nhập sau hoa hồng ${money(result.totals.instructorEarnings)} từ ${result.totals.successfulSales} lượt mua thành công. Tổng tiền bán hàng ${money(result.totals.totalRevenue)}, hoa hồng nền tảng ${money(result.totals.platformCommission)}. Đây là thu nhập ghi nhận, không phải xác nhận đã chi trả vào ngân hàng.${
        result.totals.reconstructedOrders ? ` Có ${result.totals.reconstructedOrders} đơn cũ được backend tính từ tỷ lệ hoa hồng lưu trên đơn.` : ''
      }`,
    };
    case 'sales_count': return {
      status: result.totals.successfulSales ? 'found' : 'empty',
      answer: `${scope} có ${result.totals.successfulSales} lượt mua thành công trong ${period}. Không bao gồm đăng ký miễn phí.`,
    };
    case 'top_courses': return {
      status: result.total ? result.items.length ? 'found' : 'page_empty' : 'empty',
      answer: result.total
        ? `Khóa bán chạy theo lượt mua trong ${period}${result.topTiedCount > 1 ? ` (${result.topTiedCount} khóa đồng hạng cao nhất)` : ''}:\n${result.items.map((course, index) =>
          `${index + 1}. ${escapeMarkdownTitle(course.title)} — hạng ${course.rank}, ${course.successfulSales} lượt mua, thu nhập sau hoa hồng ${money(course.instructorEarnings)}`).join('\n')}${
          result.hasMore ? '\nCòn kết quả, kể cả khóa có thể đồng hạng; bạn có thể hỏi “xem thêm”.' : ''}`
        : `Chưa có lượt mua thành công trong ${period}.`,
    };
    case 'compare': {
      const isMoney = result.metric === 'instructor_earnings';
      const format = (value: number) => isMoney ? money(value) : `${value.toLocaleString('vi-VN')} lượt mua`;
      const key = isMoney ? 'instructorEarnings' : 'successfulSales';
      const change = result.change;
      return {
        status: result.current.successfulSales || result.previous.successfulSales ? 'found' : 'empty',
        answer: `${scope}: ${isMoney ? 'thu nhập sau hoa hồng' : 'lượt mua thành công'} kỳ ${period} là ${format(result.current[key])}; kỳ ${businessPeriodLabel(result.previousPeriod)} là ${format(result.previous[key])}. ${
          change.direction === 'unchanged' ? 'Không thay đổi.'
            : change.direction === 'new' ? `Phát sinh ${format(change.absolute)} từ mức 0; không tính tỷ lệ phần trăm.`
              : `${change.direction === 'up' ? 'Tăng' : 'Giảm'} ${format(Math.abs(change.absolute))} (${Math.abs(change.percent!).toLocaleString('vi-VN')}%).`
        }`,
      };
    }
  }
}
