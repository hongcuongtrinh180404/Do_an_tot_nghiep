var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderStatusEnum, ReviewStatusEnum } from 'share-lib';
import { CourseEntity } from '../../course/schemas/course.schema.js';
import { EnrollmentEntity } from '../../enrollment/schemas/enrollment.schema.js';
import { OrderEntity } from '../../enrollment/schemas/order.schema.js';
import { assertRevenueTotals, instructorMoneyStages, instructorOrderOwnershipStages, instructorPaidDateStages, instructorRevenueGroup, storedMoneyIsValid, } from '../../payment/utils/instructor-revenue.pipeline.js';
const QUERY_TIMEOUT_MS = 5000;
let AdminUserCoursesRepository = class AdminUserCoursesRepository {
    courses;
    enrollments;
    orders;
    constructor(courses, enrollments, orders) {
        this.courses = courses;
        this.enrollments = enrollments;
        this.orders = orders;
    }
    async findEnrolledCourses(userId) {
        return this.enrollments.aggregate([
            { $match: { userId: new Types.ObjectId(userId), deletedAt: null } },
            { $sort: { enrolledAt: -1, _id: -1 } },
            { $lookup: { from: this.courses.collection.name, localField: 'courseId', foreignField: '_id', as: 'course' } },
            { $unwind: '$course' },
            { $match: { 'course.deletedAt': null } },
            {
                $lookup: {
                    from: this.orders.collection.name,
                    let: { orderId: '$orderId', userId: '$userId', courseId: '$courseId' },
                    pipeline: [
                        { $match: { deletedAt: null, $expr: { $and: [
                                        { $eq: ['$_id', '$$orderId'] },
                                        { $eq: ['$userId', '$$userId'] },
                                        { $eq: ['$courseId', '$$courseId'] },
                                    ] } } },
                        ...instructorPaidDateStages(),
                        { $project: {
                                _id: 0, status: 1,
                                amount: { $cond: [storedMoneyIsValid('$amount'), '$amount', null] },
                                paidAt: { $cond: [{ $eq: ['$status', OrderStatusEnum.PAID] }, '$_revenuePaidAt', null] },
                            } },
                    ],
                    as: 'purchase',
                },
            },
            { $set: { purchase: { $arrayElemAt: ['$purchase', 0] } } },
            { $project: {
                    _id: 0,
                    id: { $toString: '$_id' },
                    courseId: { $toString: '$courseId' },
                    title: '$course.title',
                    thumbnailUrl: { $ifNull: ['$course.thumbnailUrl', null] },
                    enrolledAt: { $ifNull: ['$enrolledAt', '$createdAt'] },
                    paidAt: { $ifNull: ['$purchase.paidAt', null] },
                    price: { $cond: [
                            { $eq: [{ $type: '$orderId' }, 'null'] }, 0,
                            { $ifNull: ['$purchase.amount', null] },
                        ] },
                    isFree: { $or: [
                            { $eq: [{ $type: '$orderId' }, 'null'] },
                            { $eq: ['$purchase.amount', 0] },
                        ] },
                    paymentStatus: { $ifNull: ['$purchase.status', null] },
                } },
        ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }).exec();
    }
    async findTeachingCourses(userId) {
        return this.courses.aggregate([
            { $match: { instructorId: new Types.ObjectId(userId), deletedAt: null } },
            { $sort: { updatedAt: -1, _id: -1 } },
            { $project: {
                    _id: 0, id: { $toString: '$_id' }, title: 1, price: 1, level: 1, status: 1,
                    thumbnailUrl: { $ifNull: ['$thumbnailUrl', null] },
                    updatedAt: 1,
                } },
        ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }).exec();
    }
    async getTeachingRevenue(userId) {
        const rows = await this.orders.aggregate([
            ...instructorOrderOwnershipStages(userId),
            ...instructorMoneyStages(),
            { $group: { ...instructorRevenueGroup, _id: '$courseId' } },
        ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }).exec();
        for (const row of rows)
            assertRevenueTotals(row);
        return rows;
    }
    async getStudentCounts(courseIds) {
        if (!courseIds.length)
            return { total: 0, byCourse: new Map() };
        const [result] = await this.enrollments.aggregate([
            { $match: { courseId: { $in: courseIds.map((id) => new Types.ObjectId(id)) }, deletedAt: null } },
            { $facet: {
                    total: [{ $group: { _id: '$userId' } }, { $count: 'count' }],
                    courses: [
                        { $group: { _id: { courseId: '$courseId', userId: '$userId' } } },
                        { $group: { _id: '$_id.courseId', count: { $sum: 1 } } },
                    ],
                } },
        ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }).exec();
        return {
            total: result?.total[0]?.count ?? 0,
            byCourse: new Map((result?.courses ?? []).map((row) => [row._id.toHexString(), row.count])),
        };
    }
    async getReviewStats(courseIds) {
        if (!courseIds.length)
            return [];
        return this.courses.db.collection('reviews').aggregate([
            { $match: {
                    courseId: { $in: courseIds.map((id) => new Types.ObjectId(id)) },
                    deletedAt: null, status: ReviewStatusEnum.VISIBLE,
                } },
            { $group: { _id: '$courseId', totalScore: { $sum: '$rating' }, totalReviews: { $sum: 1 } } },
            { $project: { _id: 0, courseId: { $toString: '$_id' }, totalScore: 1, totalReviews: 1 } },
        ], { maxTimeMS: QUERY_TIMEOUT_MS }).toArray();
    }
};
AdminUserCoursesRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(CourseEntity.name)),
    __param(1, InjectModel(EnrollmentEntity.name)),
    __param(2, InjectModel(OrderEntity.name)),
    __metadata("design:paramtypes", [Model,
        Model,
        Model])
], AdminUserCoursesRepository);
export { AdminUserCoursesRepository };
//# sourceMappingURL=admin-user-courses.repository.js.map