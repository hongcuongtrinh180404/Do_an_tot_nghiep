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
import { CourseStatusEnum } from 'share-lib';
import { CourseEntity } from '../course/schemas/course.schema.js';
import { EnrollmentEntity } from '../enrollment/schemas/enrollment.schema.js';
import { profileCursorStages } from './profile-cursor.util.js';
export const PROFILE_PAGE_SIZE = 5;
let PublicProfileRepository = class PublicProfileRepository {
    courses;
    enrollments;
    constructor(courses, enrollments) {
        this.courses = courses;
        this.enrollments = enrollments;
    }
    learningStages(userId) {
        return [
            { $match: { userId: new Types.ObjectId(userId), deletedAt: null } },
            { $lookup: { from: this.courses.collection.name, localField: 'courseId', foreignField: '_id', as: 'course' } },
            { $unwind: '$course' },
            { $match: { 'course.deletedAt': null, 'course.status': CourseStatusEnum.PUBLISHED } },
        ];
    }
    authorStages(path) {
        return [
            {
                $lookup: {
                    from: 'users',
                    let: { instructorId: `$${path}instructorId` },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$instructorId'] }, deletedAt: null } },
                        { $project: { _id: 0, fullName: 1, username: 1 } },
                    ],
                    as: 'author',
                },
            },
        ];
    }
    projectCourse(path, dateField, sortId = '$_id') {
        return {
            $project: {
                _id: 0,
                id: { $toString: path ? `$${path}_id` : '$_id' },
                title: `$${path}title`,
                slug: `$${path}slug`,
                thumbnailUrl: { $ifNull: [`$${path}thumbnailUrl`, null] },
                instructorName: { $ifNull: [{ $arrayElemAt: ['$author.fullName', 0] }, 'Giảng viên'] },
                instructorUsername: { $ifNull: [{ $arrayElemAt: ['$author.username', 0] }, null] },
                sortId,
                sortDate: `$${dateField}`,
            },
        };
    }
    async findLearning(userId, cursor) {
        return this.enrollments.aggregate([
            ...this.learningStages(userId),
            ...profileCursorStages(cursor, 'enrolledAt', 'courseId'),
            { $sort: { enrolledAt: -1, courseId: -1 } },
            { $limit: PROFILE_PAGE_SIZE + 1 },
            ...this.authorStages('course.'),
            this.projectCourse('course.', 'enrolledAt', '$courseId'),
        ]).exec();
    }
    async findTeaching(userId, cursor) {
        return this.courses.aggregate([
            { $match: { instructorId: new Types.ObjectId(userId), status: CourseStatusEnum.PUBLISHED, deletedAt: null } },
            ...profileCursorStages(cursor, 'createdAt'),
            { $sort: { createdAt: -1, _id: -1 } },
            { $limit: PROFILE_PAGE_SIZE + 1 },
            ...this.authorStages(''),
            this.projectCourse('', 'createdAt'),
        ]).exec();
    }
    async countLearning(userId) {
        const [result] = await this.enrollments.aggregate([
            ...this.learningStages(userId), { $count: 'total' },
        ]).exec();
        return result?.total ?? 0;
    }
    async countTeaching(userId) {
        return this.courses.countDocuments({
            instructorId: userId, status: CourseStatusEnum.PUBLISHED, deletedAt: null,
        }).exec();
    }
};
PublicProfileRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(CourseEntity.name)),
    __param(1, InjectModel(EnrollmentEntity.name)),
    __metadata("design:paramtypes", [Model,
        Model])
], PublicProfileRepository);
export { PublicProfileRepository };
//# sourceMappingURL=public-profile.repository.js.map