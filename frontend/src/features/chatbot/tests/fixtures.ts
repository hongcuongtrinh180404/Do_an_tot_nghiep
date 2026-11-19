import { CourseLevelEnum } from 'share-lib';
import type { ChatbotReply } from '../chatbot.contract';

export function foundReply(): ChatbotReply {
  return {
    requestId: '65ac3483-7075-48e3-8bbe-4c3a6eb9cced',
    status: 'found',
    answer: 'Tìm thấy 1 khóa học công khai phù hợp.',
    result: {
      filtersApplied: { keyword: 'Python', maxPriceExclusive: false, page: 1, limit: 5 },
      items: [{
        id: '0123456789abcdef01234567',
        title: 'Python nhập môn',
        price: 299000,
        level: CourseLevelEnum.BEGINNER,
        categoryName: 'Lập trình',
        url: '/courses/0123456789abcdef01234567',
      }],
      currency: 'VND', total: 1, page: 1, limit: 5, hasMore: false,
    },
  };
}
