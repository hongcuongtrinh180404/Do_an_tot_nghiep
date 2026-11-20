import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseLevelEnum } from 'share-lib';
import type { ChatbotAiClient } from '../chatbot-ai.client.js';
import { ChatbotAiError } from '../chatbot.errors.js';
import {
  ChatbotSearchService,
  COURSE_SEARCH_SYSTEM_PROMPT,
} from '../services/chatbot-search.service.js';
import { SearchCoursesTool } from '../tools/search-courses.tool.js';
import {
  SEARCH_COURSES_DEFINITION,
  SearchCoursesError,
} from '../tools/search-courses.contract.js';
import type { PublicCourseSearchService } from '../../course/services/public-course-search.service.js';
import type { PublicCourseSearchResult } from '../../course/interfaces/public-course-search.interface.js';

function completion(args = '{"keyword":"React"}', name = 'search_courses') {
  return {
    assistantMessage: {
      role: 'assistant',
      content: 'Fabricated Course Name / fake provider answer',
      reasoning_content: 'private-reasoning',
      tool_calls: [
        { id: 'call_1', type: 'function', function: { name, arguments: args } },
      ],
    },
    finishReason: 'tool_calls',
  };
}

const result: PublicCourseSearchResult = {
  filtersApplied: {
    keyword: 'React',
    maxPriceExclusive: false,
    page: 1,
    limit: 5,
  },
  items: [
    {
      id: '0123456789abcdef01234567',
      title: 'React thực hành',
      price: 299000,
      level: CourseLevelEnum.BEGINNER,
      categoryName: 'Lập trình',
      url: '/courses/0123456789abcdef01234567',
    },
  ],
  currency: 'VND',
  total: 1,
  page: 1,
  limit: 5,
  hasMore: false,
};

describe('ChatbotSearchService', () => {
  let complete: ReturnType<typeof vi.fn>;
  let execute: ReturnType<typeof vi.fn>;
  let service: ChatbotSearchService;

  beforeEach(() => {
    complete = vi.fn().mockResolvedValue(completion());
    execute = vi.fn().mockResolvedValue(structuredClone(result));
    service = new ChatbotSearchService(
      { complete } as unknown as ChatbotAiClient,
      {
        definition: SEARCH_COURSES_DEFINITION,
        execute,
      } as unknown as SearchCoursesTool,
    );
  });

  it('advertises only search_courses and formats exact database facts without another model request', async () => {
    const signal = new AbortController().signal;
    const reply = await service.search(' Có khóa học React không? ', {
      signal,
      requestId: 'server-id',
    });
    expect(complete).toHaveBeenCalledExactlyOnceWith({
      messages: [
        { role: 'system', content: expect.any(String) },
        { role: 'user', content: 'Có khóa học React không?' },
      ],
      tools: [SEARCH_COURSES_DEFINITION],
      toolChoice: 'auto',
      signal,
      requestId: 'server-id',
    });
    expect(execute).toHaveBeenCalledExactlyOnceWith(
      '{"keyword":"React"}',
      signal,
    );
    expect(reply).toMatchObject({ status: 'found', result });
    expect(reply.answer).toContain(
      '[React thực hành](/courses/0123456789abcdef01234567)',
    );
    expect(reply.answer).toContain('299.000 ₫');
    expect(reply.answer).not.toContain('Fabricated');
    expect(JSON.stringify(reply)).not.toContain('private-reasoning');
  });

  it.each([
    ['Có khóa học React không?', { keyword: 'React' }],
    ['Khóa học nào dưới 500k?', { maxPrice: 500000, maxPriceExclusive: true }],
    ['Tìm khóa Python cho người mới', { keyword: 'Python', level: 'beginner' }],
    ['Có khóa học miễn phí không?', { isFree: true }],
    [
      'Có khóa học lập trình dưới 20k không?',
      {
        keyword: 'lập trình',
        relatedKeywords: ['Python', 'JavaScript', 'React', 'NestJS'],
        maxPrice: 20000,
        maxPriceExclusive: true,
      },
    ],
    [
      'Tôi muốn học làm website, có khóa nào dưới 200k không?',
      {
        keyword: 'làm website',
        relatedKeywords: ['HTML', 'CSS', 'React', 'Next.js'],
        maxPrice: 200000,
        maxPriceExclusive: true,
      },
    ],
    [
      'Có khóa học backend dưới 200k không?',
      {
        keyword: 'backend',
        relatedKeywords: ['Node.js', 'NestJS', 'Express', 'REST API'],
        maxPrice: 200000,
        maxPriceExclusive: true,
      },
    ],
    [
      'Có khóa học thiết kế nào từ 200k đến 500k?',
      { keyword: 'thiết kế', minPrice: 200000, maxPrice: 500000 },
    ],
  ])(
    'passes extracted filters through the real validator/tool for "%s"',
    async (question, args) => {
      complete.mockResolvedValue(completion(JSON.stringify(args)));
      const search = vi.fn().mockImplementation((filters) =>
        Promise.resolve({
          ...result,
          filtersApplied: filters,
        }),
      );
      const actualService = new ChatbotSearchService(
        { complete } as unknown as ChatbotAiClient,
        new SearchCoursesTool({
          search,
        } as unknown as PublicCourseSearchService),
      );
      await actualService.search(question);
      expect(search).toHaveBeenCalledExactlyOnceWith({
        maxPriceExclusive: false,
        page: 1,
        limit: 5,
        ...args,
      });
    },
  );

  it('instructs AI to expand broad goals but preserve explicit technologies and every hard filter', () => {
    expect(COURSE_SEARCH_SYSTEM_PROMPT).toContain('relatedKeywords');
    expect(COURSE_SEARCH_SYSTEM_PROMPT).toContain(
      'Không đổi keyword gốc hoặc tự nới giá/trình độ',
    );
    expect(COURSE_SEARCH_SYSTEM_PROMPT).toContain(
      'Không mở rộng khi người dùng yêu cầu công nghệ cụ thể',
    );
    expect(COURSE_SEARCH_SYSTEM_PROMPT).toContain(
      'Một danh mục CNTT không chứng minh khóa học dạy backend',
    );
  });

  it('uses a fixed empty-result answer even when the model fabricated a course', async () => {
    execute.mockResolvedValue({ ...result, total: 0, items: [] });
    const reply = await service.search('Có khóa học React không?');
    expect(reply.status).toBe('empty');
    expect(reply.answer).toBe(
      'Hiện chưa tìm thấy khóa học công khai phù hợp với các điều kiện bạn yêu cầu.',
    );
    expect(reply.answer).not.toContain('React thực hành');
    expect(reply.answer).not.toContain('Fabricated');
  });

  it('distinguishes an empty page from no matching courses', async () => {
    execute.mockResolvedValue({ ...result, page: 3, total: 1, items: [] });
    expect(await service.search('React trang 3')).toMatchObject({
      status: 'page_empty',
    });
  });

  it('formats free courses and a next-page hint using result metadata', async () => {
    execute.mockResolvedValue({
      ...result,
      items: [{ ...result.items[0], price: 0 }],
      total: 7,
      hasMore: true,
    });
    const reply = await service.search('React miễn phí');
    expect(reply.answer).toContain('Miễn phí');
    expect(reply.answer).toContain('7 khóa học');
    expect(reply.answer).toContain('trang tiếp theo');
  });

  it('escapes untrusted database titles in Markdown without changing the structured title', async () => {
    const title = '[Bấm vào](https://evil.example)\n<script>alert(1)</script>';
    execute.mockResolvedValue({
      ...result,
      items: [{ ...result.items[0], title }],
    });
    const reply = await service.search('React');
    expect(reply.result?.items[0].title).toBe(title);
    expect(reply.answer).not.toContain('[Bấm vào](https://evil.example)');
    expect(reply.answer).not.toContain('<script>');
  });

  it.each([
    {
      assistantMessage: { content: 'Fabricated course without calling search' },
    },
    completion('{}', 'delete_course'),
    {
      ...completion(),
      assistantMessage: {
        ...completion().assistantMessage,
        tool_calls: [
          ...completion().assistantMessage.tool_calls,
          {
            id: 'call_2',
            function: { name: 'search_courses', arguments: '{}' },
          },
        ],
      },
    },
  ])(
    'rejects text-only, unknown or multiple calls without displaying provider content',
    async (payload) => {
      complete.mockResolvedValue(payload);
      const reply = await service.search('Tìm khóa học');
      expect(reply.status).toBe('needs_clarification');
      expect(reply.answer).not.toContain('Fabricated');
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['CHATBOT_TOOL_ARGUMENTS_INVALID', 'needs_clarification'],
    ['CHATBOT_SEARCH_UNAVAILABLE', 'unavailable'],
  ] as const)(
    'handles safe tool failure %s distinctly from no results',
    async (code, status) => {
      execute.mockRejectedValue(new SearchCoursesError(code));
      const reply = await service.search('React');
      expect(reply.status).toBe(status);
      expect(reply).not.toHaveProperty('result');
      expect(reply.answer).not.toContain('chưa tìm thấy');
    },
  );

  it('preserves sanitized AI failures instead of pretending the database returned no courses', async () => {
    complete.mockRejectedValue(new ChatbotAiError('CHATBOT_RATE_LIMITED'));
    await expect(service.search('React')).rejects.toMatchObject({
      code: 'CHATBOT_RATE_LIMITED',
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(['', '   ', 'q'.repeat(2001)])(
    'rejects an invalid question before requesting the model',
    async (question) => {
      await expect(service.search(question)).rejects.toMatchObject({
        code: 'CHATBOT_REQUEST_INVALID',
      });
      expect(complete).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it('does not execute tool calls after caller cancellation', async () => {
    const controller = new AbortController();
    complete.mockImplementation(() => {
      controller.abort();
      return Promise.resolve(completion());
    });
    await expect(
      service.search('React', { signal: controller.signal }),
    ).rejects.toMatchObject({ code: 'CHATBOT_CANCELLED' });
    expect(execute).not.toHaveBeenCalled();
  });
});
