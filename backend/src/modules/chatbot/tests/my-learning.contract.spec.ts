import { describe, expect, it } from 'vitest';
import { LearningStatusEnum } from 'share-lib';
import { parseLearningProgressArguments, resolveMyCoursesArguments } from '../tools/my-learning.contract.js';
import type { ChatbotConversationContext } from '../tools/my-learning.types.js';

const context: ChatbotConversationContext = {
  mode: 'learning_progress',
  list: { kind: 'my_courses', filters: { keyword: 'Python', learningStatus: LearningStatusEnum.IN_PROGRESS, page: 2, limit: 2 },
    ids: ['0123456789abcdef01234567'], hasMore: true },
};

describe('Personal learning tool contracts', () => {
  it('inherits only explicitly changed filters, resets refinement page, and clears cancelled filters', () => {
    expect(resolveMyCoursesArguments('{"action":"refine","learningStatus":"NOT_STARTED"}', context))
      .toEqual({ keyword: 'Python', learningStatus: 'NOT_STARTED', page: 1, limit: 2 });
    expect(resolveMyCoursesArguments('{"action":"refine","clearFilters":["keyword"]}', context))
      .toEqual({ learningStatus: 'IN_PROGRESS', page: 1, limit: 2 });
    expect(resolveMyCoursesArguments('{"action":"new_list"}', context)).toEqual({ page: 1, limit: 5 });
    expect(resolveMyCoursesArguments('{"action":"next_page"}', context)).toEqual({
      keyword: 'Python', learningStatus: 'IN_PROGRESS', page: 3, limit: 2,
    });
  });

  it.each([
    '{"userId":"other"}', '{"keyword":{"$ne":null}}', '{"page":0}', '{"limit":11}', '{"page":"2"}',
    '{"action":"next_page","keyword":"React"}', '{"learningStatus":"passed"}', '{"__proto__":{}}',
    '{"action":"new_list","clearFilters":["keyword"]}', '{"action":"refine","clearFilters":["price"]}', '[]',
  ])('rejects unauthorized/malformed list arguments: %s', (raw) => {
    expect(() => resolveMyCoursesArguments(raw, context)).toThrow();
  });
  it('does not turn contextless/cross-mode pagination into a new list', () => {
    expect(() => resolveMyCoursesArguments('{"action":"next_page"}')).toThrow('missing_list');
    expect(() => resolveMyCoursesArguments('{"action":"refine"}', { mode: 'learning_progress' })).toThrow('missing_list');
    const exhausted = structuredClone(context);
    exhausted.list!.hasMore = false;
    expect(() => resolveMyCoursesArguments('{"action":"next_page"}', exhausted)).toThrow('no_more');
  });
  it.each([
    '{"scope":"course"}', '{"scope":"course","current":false}', '{"scope":"course","position":0}',
    '{"scope":"course","position":11}', '{"scope":"course","courseId":"other"}',
    '{"scope":"course","courseName":"Python","position":1}', '{"scope":"overview","courseName":"Python"}',
    '{"scope":"next_page","page":2}', '{"scope":"course","current":true,"page":1}', '{"scope":"overview","userId":"other"}',
  ])('requires exactly one course selector and no account override: %s', (raw) => {
    expect(() => parseLearningProgressArguments(raw)).toThrow();
  });
  it('accepts overview, bounded selection pages and explicit references', () => {
    expect(parseLearningProgressArguments('{"scope":"overview"}').scope).toBe('overview');
    expect(parseLearningProgressArguments('{"scope":"course","courseName":" Python ","page":2,"limit":3}'))
      .toMatchObject({ courseName: 'Python', page: 2, limit: 3 });
    expect(parseLearningProgressArguments('{"scope":"course","position":2}').position).toBe(2);
    expect(parseLearningProgressArguments('{"scope":"course","current":true}').current).toBe(true);
  });
});
