import { type ICourse, type ICourseApprovalChecklist, type ICourseApprovalRequirement, type ILesson, type ILessonQuiz, type ISection } from 'share-lib';
export declare function buildQuizTimingRequirement(sections: readonly ISection[], lessons: readonly ILesson[], quizzes: readonly ILessonQuiz[]): ICourseApprovalRequirement;
export declare function buildCourseApprovalChecklist(course: ICourse, categoryIsActive: boolean, sections: readonly ISection[], lessons: readonly ILesson[], quizzes?: readonly ILessonQuiz[]): ICourseApprovalChecklist;
