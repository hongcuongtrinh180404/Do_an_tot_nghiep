import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LearningStatusEnum, LessonContentTypeEnum, type ILesson, type ILessonQuiz, type ILessonQuizAnswer, type ILessonCompletion, type ILessonCompletionSummary } from 'share-lib';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { SectionRepository } from '../../course/repositories/section.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { contentVersion, quizRevision, studentQuiz } from '../../course/utils/lesson-quiz-version.util.js';
import { LessonCompletionRepository } from '../repositories/lesson-completion.repository.js';
import { CompleteLessonVideoDto, SubmitLessonQuizAnswerDto } from '../dto/lesson-completion.dto.js';
import { isQuizTimestamp } from 'share-lib';
import type { CourseVideoStats } from '../../course/interfaces/course-video-stats.interface.js';

type CompletionLesson = Pick<ILesson, 'id' | 'content'>;

@Injectable()
export class LessonCompletionService {
  constructor(
    private readonly repository: LessonCompletionRepository,
    private readonly enrollments: EnrollmentRepository,
    private readonly courses: CourseRepository,
    private readonly sections: SectionRepository,
    private readonly lessons: LessonRepository,
    private readonly quizzes: LessonQuizRepository,
  ) {}

  private async requireEnrollment(userId: string, courseId: string): Promise<void> {
    const [course, enrollment] = await Promise.all([
      this.courses.findById(courseId), this.enrollments.findByUserAndCourse(userId, courseId),
    ]);
    if (!course || course.deletedAt) throw new NotFoundException('Không tìm thấy khóa học');
    if (!enrollment || enrollment.deletedAt) throw new ForbiddenException('Bạn cần đăng ký khóa học để ghi nhận hoàn thành bài học');
  }

  private async requireLesson(courseId: string, lessonId: string): Promise<ILesson> {
    const lesson = await this.lessons.findById(lessonId);
    const section = lesson ? await this.sections.findById(lesson.sectionId) : null;
    if (!lesson || lesson.deletedAt || !section || section.deletedAt || section.courseId !== courseId) {
      throw new NotFoundException('Bài học không thuộc khóa học này');
    }
    if (lesson.content?.type !== LessonContentTypeEnum.VIDEO || !lesson.content.url) {
      throw new BadRequestException('Chỉ ghi nhận hoàn thành cho bài học video');
    }
    return lesson;
  }

  private mediaVersion(lesson: CompletionLesson): string {
    return contentVersion({ url: lesson.content?.url, publicId: lesson.content?.publicId ?? null });
  }

  private async summarize(userId: string, courseId: string, lesson: ILesson): Promise<ILessonCompletion> {
    const mediaVersion = this.mediaVersion(lesson);
    const [quizzes, answers, videoEnded] = await Promise.all([
      this.quizzes.findByLessonId(lesson.id),
      this.repository.findAnswers(userId, lesson.id),
      this.repository.hasVideoEnded(userId, lesson.id, mediaVersion),
    ]);
    return this.buildState(courseId, lesson, quizzes, answers, videoEnded);
  }

  private buildState(courseId: string, lesson: CompletionLesson, quizzes: ILessonQuiz[], answers: ILessonQuizAnswer[], videoEnded: boolean): ILessonCompletion {
    quizzes = quizzes.filter((quiz) => isQuizTimestamp(quiz.timestamp, lesson.content?.duration));
    const mediaVersion = this.mediaVersion(lesson);
    const answerMap = new Map(answers.map((answer) => [`${answer.quizId}:${answer.quizRevision}`, answer]));
    const studentQuizzes = quizzes.map((quiz) => studentQuiz(quiz, answerMap.get(`${quiz.id}:${quizRevision(quiz)}`) ?? null));
    const completedQuestions = studentQuizzes.filter((quiz) => quiz.answer !== null).length;
    const complete = quizzes.length > 0 ? completedQuestions === quizzes.length : videoEnded;
    return {
      courseId, lessonId: lesson.id, mediaVersion, videoEnded,
      quizzesVersion: contentVersion(studentQuizzes.map((quiz) => [quiz.id, quiz.revision, quiz.timestamp, quiz.order])),
      completedQuestions, totalQuestions: quizzes.length,
      status: complete ? LearningStatusEnum.COMPLETED : answers.length > 0 || videoEnded ? LearningStatusEnum.IN_PROGRESS : LearningStatusEnum.NOT_STARTED,
      quizzes: studentQuizzes,
    };
  }

  async getLesson(userId: string, courseId: string, lessonId: string): Promise<ILessonCompletion> {
    await this.requireEnrollment(userId, courseId);
    return this.summarize(userId, courseId, await this.requireLesson(courseId, lessonId));
  }

  async getLessons(userId: string, courseId: string): Promise<ILessonCompletionSummary[]> {
    await this.requireEnrollment(userId, courseId);
    const stats = await this.lessons.getCourseVideoStats([courseId]);
    return (await this.getSummariesForCourses(userId, stats)).get(courseId) ?? [];
  }

  /** Internal batch read. Callers supply current video stats for already-authorized courses. */
  async getSummariesForCourses(userId: string, stats: CourseVideoStats[]): Promise<Map<string, ILessonCompletionSummary[]>> {
    const summaries = new Map<string, ILessonCompletionSummary[]>();
    const lessonIds = stats.flatMap((course) => course.videos.map((video) => video.lessonId));
    if (lessonIds.length === 0) return summaries;
    const courseIds = stats.map((course) => course.courseId);
    // One read per collection for the entire course list, never one query per lesson/course.
    const [quizzes, answers, videos] = await Promise.all([
      this.quizzes.findByLessonIds(lessonIds),
      this.repository.findAnswersForCourses(userId, courseIds),
      this.repository.findVideoCompletionsForCourses(userId, courseIds),
    ]);
    const quizzesByLesson = new Map<string, ILessonQuiz[]>();
    for (const quiz of quizzes) {
      const group = quizzesByLesson.get(quiz.lessonId) ?? [];
      group.push(quiz);
      quizzesByLesson.set(quiz.lessonId, group);
    }
    const answersByLesson = new Map<string, ILessonQuizAnswer[]>();
    for (const answer of answers) {
      const key = `${answer.courseId}:${answer.lessonId}`;
      const group = answersByLesson.get(key) ?? [];
      group.push(answer);
      answersByLesson.set(key, group);
    }
    const ended = new Set(videos.map((video) => `${video.courseId}:${video.lessonId}:${video.mediaVersion}`));
    for (const course of stats) {
      summaries.set(course.courseId, course.videos.map((video) => {
        // An unfinished upload still counts as a video lesson, but cannot be completed.
        if (!video.url) return {
          lessonId: video.lessonId, status: LearningStatusEnum.NOT_STARTED, totalQuestions: 0, completedQuestions: 0,
        };
        const lesson: CompletionLesson = {
          id: video.lessonId,
          content: { type: LessonContentTypeEnum.VIDEO, url: video.url,
            publicId: video.publicId ?? undefined, duration: video.durationSeconds ?? undefined },
        };
        const key = `${course.courseId}:${lesson.id}`;
        const state = this.buildState(course.courseId, lesson, quizzesByLesson.get(lesson.id) ?? [],
          answersByLesson.get(key) ?? [], ended.has(`${key}:${this.mediaVersion(lesson)}`));
        const { lessonId, status, totalQuestions, completedQuestions } = state;
        return { lessonId, status, totalQuestions, completedQuestions };
      }));
    }
    return summaries;
  }

  async submitAnswer(userId: string, courseId: string, lessonId: string, dto: SubmitLessonQuizAnswerDto): Promise<ILessonCompletion> {
    await this.requireEnrollment(userId, courseId);
    const lesson = await this.requireLesson(courseId, lessonId);
    const quiz = await this.quizzes.findById(dto.quizId);
    if (!quiz || quiz.lessonId !== lessonId) throw new NotFoundException('Không tìm thấy câu hỏi trong bài học');
    if (!isQuizTimestamp(quiz.timestamp, lesson.content?.duration)) {
      throw new ConflictException('Câu hỏi chưa có thời điểm xuất hiện hợp lệ. Vui lòng tải lại bài học.');
    }
    const revision = quizRevision(quiz);
    if (revision !== dto.quizRevision) throw new ConflictException('Câu hỏi đã được cập nhật. Vui lòng trả lời phiên bản mới.');
    const selected = dto.selectedOptionIds;
    if (!Array.isArray(selected) || selected.length === 0 || new Set(selected).size !== selected.length ||
      selected.some((id) => !quiz.options.some((option) => option.id === id)) ||
      (quiz.questionType === 'single' && selected.length !== 1)) {
      throw new BadRequestException('Phương án trả lời không hợp lệ');
    }
    const correctOptionIds = quiz.options.filter((option) => option.isCorrect).map((option) => option.id);
    await this.repository.saveAnswer(userId, courseId, lessonId, {
      quizId: quiz.id, quizRevision: revision, selectedOptionIds: selected,
      isCorrect: selected.length === correctOptionIds.length && selected.every((id) => correctOptionIds.includes(id)),
      correctOptionIds, submittedAt: new Date(),
    }, quiz);
    // Re-read current requirements: an author may have changed the quiz while this request was saving.
    return this.getLesson(userId, courseId, lessonId);
  }

  async videoEnded(userId: string, courseId: string, lessonId: string, dto: CompleteLessonVideoDto): Promise<ILessonCompletion> {
    await this.requireEnrollment(userId, courseId);
    const lesson = await this.requireLesson(courseId, lessonId);
    const mediaVersion = this.mediaVersion(lesson);
    if (dto.mediaVersion !== mediaVersion) throw new ConflictException('Video đã được thay đổi. Vui lòng tải lại bài học.');
    const duration = lesson.content?.duration;
    if (!duration || !Number.isFinite(duration) || !Number.isFinite(dto.positionSeconds) || Math.abs(dto.positionSeconds - duration) > 1) {
      throw new BadRequestException('Video chưa kết thúc hoặc chưa xác định được thời lượng');
    }
    await this.repository.saveVideoEnded(userId, courseId, lessonId, mediaVersion);
    return this.getLesson(userId, courseId, lessonId);
  }
}
