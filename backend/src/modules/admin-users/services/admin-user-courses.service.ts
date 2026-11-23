import { Injectable } from '@nestjs/common';
import { LearningStatusEnum, type IAdminUserEnrolledCourse, type IAdminUserTeaching } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { assertRevenueTotals } from '../../payment/utils/instructor-revenue.pipeline.js';
import { AdminUserCoursesRepository } from '../repositories/admin-user-courses.repository.js';

const averageRating = (score: number, count: number) => count ? Math.round(score / count * 10) / 10 : 0;

@Injectable()
export class AdminUserCoursesService {
  constructor(
    private readonly users: UserService,
    private readonly courses: AdminUserCoursesRepository,
    private readonly learning: LearningProgressService,
  ) {}

  async getEnrolledCourses(userId: string): Promise<IAdminUserEnrolledCourse[]> {
    // Admins can inspect students, instructors, admins and blocked accounts alike.
    await this.users.getUserDetail(userId);
    const rows = await this.courses.findEnrolledCourses(userId);
    const progress = await this.learning.getProgressForCourses(userId, rows.map((row) => row.courseId));
    const byCourse = new Map(progress.map((item) => [item.courseId, item]));
    return rows.map((row) => {
      const summary = byCourse.get(row.courseId);
      return {
        ...row,
        totalLessons: summary?.totalLessons ?? 0,
        completedLessons: summary?.completedLessons ?? 0,
        progressPercent: summary?.progressPercent ?? null,
        status: summary?.status ?? LearningStatusEnum.NOT_STARTED,
      };
    });
  }

  async getTeaching(userId: string): Promise<IAdminUserTeaching> {
    await this.users.getUserDetail(userId);
    const [rows, revenue] = await Promise.all([
      this.courses.findTeachingCourses(userId),
      this.courses.getTeachingRevenue(userId),
    ]);
    const courseIds = rows.map((row) => row.id);
    const [students, reviews] = await Promise.all([
      this.courses.getStudentCounts(courseIds),
      this.courses.getReviewStats(courseIds),
    ]);
    const revenueByCourse = new Map(revenue.map((row) => [row._id.toHexString(), row]));
    const reviewsByCourse = new Map(reviews.map((row) => [row.courseId, row]));
    const totals = revenue.reduce((sum, row) => ({
      totalRevenue: sum.totalRevenue + row.totalRevenue,
      instructorEarnings: sum.instructorEarnings + row.instructorEarnings,
      platformCommission: sum.platformCommission + row.platformCommission,
      successfulSales: sum.successfulSales + row.successfulSales,
      reconstructedOrders: sum.reconstructedOrders + row.reconstructedOrders,
    }), { totalRevenue: 0, instructorEarnings: 0, platformCommission: 0, successfulSales: 0, reconstructedOrders: 0 });
    assertRevenueTotals(totals);
    const totalReviews = reviews.reduce((sum, row) => sum + row.totalReviews, 0);
    const totalScore = reviews.reduce((sum, row) => sum + row.totalScore, 0);
    return {
      stats: {
        totalCourses: rows.length,
        totalStudents: students.total,
        totalRevenue: totals.totalRevenue,
        netRevenue: totals.instructorEarnings,
        averageRating: averageRating(totalScore, totalReviews),
        totalReviews,
      },
      courses: rows.map((row) => {
        const review = reviewsByCourse.get(row.id);
        return {
          ...row,
          studentCount: students.byCourse.get(row.id) ?? 0,
          revenue: revenueByCourse.get(row.id)?.totalRevenue ?? 0,
          rating: averageRating(review?.totalScore ?? 0, review?.totalReviews ?? 0),
          reviewCount: review?.totalReviews ?? 0,
        };
      }),
    };
  }
}
