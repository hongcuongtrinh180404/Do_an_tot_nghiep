var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { LearningStatusEnum } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { assertRevenueTotals } from '../../payment/utils/instructor-revenue.pipeline.js';
import { AdminUserCoursesRepository } from '../repositories/admin-user-courses.repository.js';
const averageRating = (score, count) => count ? Math.round(score / count * 10) / 10 : 0;
let AdminUserCoursesService = class AdminUserCoursesService {
    users;
    courses;
    learning;
    constructor(users, courses, learning) {
        this.users = users;
        this.courses = courses;
        this.learning = learning;
    }
    async getEnrolledCourses(userId) {
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
    async getTeaching(userId) {
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
};
AdminUserCoursesService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UserService,
        AdminUserCoursesRepository,
        LearningProgressService])
], AdminUserCoursesService);
export { AdminUserCoursesService };
//# sourceMappingURL=admin-user-courses.service.js.map