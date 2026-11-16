import type { CourseStatusEnum } from '../enums/course-status.enum.js';

export type CourseApprovalField =
  | 'title'
  | 'description'
  | 'category'
  | 'level'
  | 'thumbnail'
  | 'trailer'
  | 'curriculum'
  | 'quiz-timestamps';

export interface ICourseApprovalTarget {
  field: CourseApprovalField;
  sectionId?: string;
  lessonId?: string;
  quizId?: string;
}

export interface ICourseApprovalIssue {
  message: string;
  target: ICourseApprovalTarget;
}

export interface ICourseApprovalRequirement {
  id: 'title' | 'description' | 'category-level' | 'thumbnail' | 'trailer' | 'curriculum' | 'quiz-timestamps';
  label: string;
  complete: boolean;
  issues: ICourseApprovalIssue[];
}

export interface ICourseApprovalChecklist {
  courseId: string;
  status: CourseStatusEnum;
  items: ICourseApprovalRequirement[];
  canSubmit: boolean;
}
