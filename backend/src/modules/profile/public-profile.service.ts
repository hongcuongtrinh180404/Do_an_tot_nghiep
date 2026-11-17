import { Injectable } from '@nestjs/common';
import { RoleEnum, type IPublicProfileCourses, type IPublicProfileCourse } from 'share-lib';
import { UserService } from '../user/services/user.service.js';
import { LearningProgressRepository } from '../learning-progress/repositories/learning-progress.repository.js';
import { LessonRepository } from '../course/repositories/lesson.repository.js';
import { summarizeProgress } from '../learning-progress/utils/learning-progress.util.js';
import { PublicProfileRepository, PROFILE_PAGE_SIZE } from './public-profile.repository.js';
import { ProfileCoursesDto } from './dto/profile-courses.dto.js';
import { decodeProfileCursor, encodeProfileCursor } from './profile-cursor.util.js';

@Injectable()
export class PublicProfileService {
  constructor(
    private readonly users: UserService,
    private readonly profiles: PublicProfileRepository,
    private readonly progress: LearningProgressRepository,
    private readonly lessons: LessonRepository,
  ) {}

  async getCourses(username: string, query: ProfileCoursesDto): Promise<IPublicProfileCourses> {
    const user = await this.users.findPublicUserByUsername(username);
    const cursor = decodeProfileCursor(query.cursor, query.type);
    const instructor = user.role === RoleEnum.INSTRUCTOR;
    const [rows, learning, teaching] = await Promise.all([
      query.type === 'learning'
        ? this.profiles.findLearning(user.id, cursor)
        : instructor ? this.profiles.findTeaching(user.id, cursor) : [],
      this.profiles.countLearning(user.id),
      instructor ? this.profiles.countTeaching(user.id) : 0,
    ]);
    const page = rows.slice(0, PROFILE_PAGE_SIZE);
    const courseIds = page.map((course) => course.id);
    const [states, stats] = query.type === 'learning' && courseIds.length
      ? await Promise.all([
        this.progress.findForCourses(user.id, courseIds),
        this.lessons.getCourseVideoStats(courseIds),
      ])
      : [[], []];
    const statesByCourse = new Map(states.map((state) => [state.courseId, state]));
    const statsByCourse = new Map(stats.map((stat) => [stat.courseId, stat]));

    const items: IPublicProfileCourse[] = page.map((course) => {
      const summary = query.type === 'learning'
        ? summarizeProgress(course.id, statesByCourse.get(course.id) ?? null, statsByCourse.get(course.id))
        : null;
      // Do not spread a course/enrollment/progress document into this public response.
      return {
        id: course.id, title: course.title, slug: course.slug,
        thumbnailUrl: course.thumbnailUrl,
        instructorName: course.instructorName,
        instructorUsername: course.instructorUsername,
        progress: summary ? { percent: summary.progressPercent, status: summary.status } : null,
      };
    });
    const last = page.at(-1);
    return {
      items,
      nextCursor: rows.length > PROFILE_PAGE_SIZE && last
        ? encodeProfileCursor({ at: last.sortDate, id: last.sortId }, query.type)
        : null,
      counts: { learning, teaching },
    };
  }
}
