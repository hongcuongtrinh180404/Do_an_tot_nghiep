import { Injectable } from '@nestjs/common';
import { RoleEnum, type IPublicProfileCourses, type IPublicProfileCourse } from 'share-lib';
import { UserService } from '../user/services/user.service.js';
import { LearningProgressService } from '../learning-progress/services/learning-progress.service.js';
import { PublicProfileRepository, PROFILE_PAGE_SIZE } from './public-profile.repository.js';
import { ProfileCoursesDto } from './dto/profile-courses.dto.js';
import { decodeProfileCursor, encodeProfileCursor } from './profile-cursor.util.js';

@Injectable()
export class PublicProfileService {
  constructor(
    private readonly users: UserService,
    private readonly profiles: PublicProfileRepository,
    private readonly progress: LearningProgressService,
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
    const progress = query.type === 'learning' && courseIds.length
      ? await this.progress.getProgressForCourses(user.id, courseIds)
      : [];
    const progressByCourse = new Map(progress.map((summary) => [summary.courseId, summary]));

    const items: IPublicProfileCourse[] = page.map((course) => {
      const summary = progressByCourse.get(course.id);
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
