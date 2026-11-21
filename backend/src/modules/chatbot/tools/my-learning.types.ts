import type { ICourseLearningProgress, LearningStatusEnum } from 'share-lib';
import type { PublicCourseSearchResult } from '../../course/interfaces/public-course-search.interface.js';
import type { ChatbotSearchContext } from './search-courses.context.js';

export interface MyCoursesFilters {
  keyword?: string;
  learningStatus?: LearningStatusEnum;
  page: number;
  limit: number;
}

export type ChatbotCourseProgress = Pick<ICourseLearningProgress,
  'status' | 'progressPercent' | 'completedLessons' | 'totalLessons' |
  'watchedMs' | 'lastLessonId' | 'lastPositionSeconds'>;

export interface ChatbotOwnedCourse {
  id: string;
  title: string;
  enrolledAt: string;
  url: string;
  progress: ChatbotCourseProgress;
  resumeUrl: string | null;
}

export interface MyCoursesResult {
  filtersApplied: MyCoursesFilters;
  items: ChatbotOwnedCourse[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface LearningOverview {
  scope: 'overview';
  totalCourses: number;
  notStarted: number;
  inProgress: number;
  completed: number;
}

export interface CourseSelection {
  scope: 'selection';
  keyword: string;
  items: Array<{ id: string; title: string }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type LearningResult = LearningOverview | CourseSelection | {
  scope: 'course';
  course: ChatbotOwnedCourse;
  remainingLessons: number;
  lastLessonTitle: string | null;
} | { scope: 'not_owned' };

export type ConversationList = (
  | ({ kind: 'catalog' } & ChatbotSearchContext)
  | { kind: 'my_courses'; filters: MyCoursesFilters; hasMore: boolean }
  | { kind: 'selection'; keyword: string; page: number; limit: number; hasMore: boolean }
) & { ids: string[] };

/** Navigation hints only. Authorization and progress are always re-read. */
export interface ChatbotConversationContext {
  mode: 'catalog' | 'my_courses' | 'learning_progress';
  list?: ConversationList;
  selectedCourseId?: string;
}

type ReplyBase = {
  answer: string;
  nextContext?: ChatbotConversationContext;
};
export type ChatbotConversationReply = ReplyBase & (
  | { kind: 'course_search'; status: 'found' | 'empty' | 'page_empty'; result: PublicCourseSearchResult }
  | { kind: 'my_courses'; status: 'found' | 'empty' | 'page_empty'; result: MyCoursesResult }
  | { kind: 'learning_progress'; status: 'found' | 'empty' | 'page_empty' | 'needs_clarification'; result: LearningResult }
  | { kind: 'clarification'; status: 'needs_clarification' }
);

export class ChatbotLearningError extends Error {
  constructor(readonly code: 'CHATBOT_TOOL_ARGUMENTS_INVALID' | 'CHATBOT_LEARNING_UNAVAILABLE') {
    super(code);
  }
}

export class LearningFollowUpError extends Error {
  constructor(readonly reason: 'missing_list' | 'no_more' | 'missing_course' | 'invalid_position') {
    super(reason);
  }
}
