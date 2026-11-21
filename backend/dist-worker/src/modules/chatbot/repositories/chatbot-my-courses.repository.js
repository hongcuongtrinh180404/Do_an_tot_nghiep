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
import { EnrollmentEntity } from '../../enrollment/schemas/enrollment.schema.js';
import { LessonEntity } from '../../course/schemas/lesson.schema.js';
export const CHATBOT_LEARNING_BATCH_SIZE = 50;
export const CHATBOT_LEARNING_QUERY_MS = 1500;
let ChatbotMyCoursesRepository = class ChatbotMyCoursesRepository {
    enrollments;
    lessons;
    constructor(enrollments, lessons) {
        this.enrollments = enrollments;
        this.lessons = lessons;
    }
    async batch(userId, options = {}) {
        const { after, keyword, courseId } = options;
        const pipeline = [
            { $match: {
                    userId: new Types.ObjectId(userId), deletedAt: null,
                    ...(courseId ? { courseId: new Types.ObjectId(courseId) } : {}),
                    ...(after ? { $or: [
                            { enrolledAt: { $lt: after.enrolledAt } },
                            { enrolledAt: after.enrolledAt, _id: { $lt: new Types.ObjectId(after.enrollmentId) } },
                        ] } : {}),
                } },
            { $sort: { enrolledAt: -1, _id: -1 } },
            { $lookup: {
                    from: 'courses', localField: 'courseId', foreignField: '_id',
                    pipeline: [
                        { $match: { deletedAt: null, ...(keyword ? {
                                    title: { $regex: keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
                                } : {}) } },
                        { $project: { title: 1, status: 1 } },
                    ],
                    as: 'course',
                } },
            { $unwind: '$course' },
            { $limit: CHATBOT_LEARNING_BATCH_SIZE },
            { $project: {
                    _id: 0, enrollmentId: { $toString: '$_id' }, id: { $toString: '$course._id' },
                    title: '$course.title', enrolledAt: 1,
                    publicDetail: { $eq: ['$course.status', CourseStatusEnum.PUBLISHED] },
                } },
        ];
        return this.enrollments.aggregate(pipeline)
            .option({ maxTimeMS: CHATBOT_LEARNING_QUERY_MS }).exec();
    }
    async resumeTitle(courseId, lessonId) {
        const [lesson] = await this.lessons.aggregate([
            { $match: { _id: new Types.ObjectId(lessonId), deletedAt: null } },
            { $lookup: { from: 'sections', localField: 'sectionId', foreignField: '_id', as: 'section' } },
            { $unwind: '$section' },
            { $match: { 'section.courseId': new Types.ObjectId(courseId), 'section.deletedAt': null } },
            { $project: { _id: 0, title: 1 } },
        ]).option({ maxTimeMS: CHATBOT_LEARNING_QUERY_MS }).exec();
        return lesson?.title ?? null;
    }
};
ChatbotMyCoursesRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(EnrollmentEntity.name)),
    __param(1, InjectModel(LessonEntity.name)),
    __metadata("design:paramtypes", [Model,
        Model])
], ChatbotMyCoursesRepository);
export { ChatbotMyCoursesRepository };
//# sourceMappingURL=chatbot-my-courses.repository.js.map